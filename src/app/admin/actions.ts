"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  notifyLetterReady,
  notifyVerificationApproved,
  notifyVerificationRejected,
} from "@/lib/notifications";
import { generateLetterDrafts, isAiConfigured } from "@/lib/ai/generate-letters";
import { categoryTitle } from "@/lib/verification";
import type {
  CreditReport,
  LetterDraft,
  Profile,
  VerificationDocument,
} from "@/lib/types";

export interface LetterState {
  error?: string;
  message?: string;
}

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = new Set(["application/pdf", "image/png", "image/jpeg", "image/jpg"]);

function sanitize(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
}

export async function uploadLetter(
  _prev: LetterState,
  formData: FormData,
): Promise<LetterState> {
  const admin = await requireAdmin();

  const userId = formData.get("user_id") as string | null;
  const round = Number(formData.get("round") ?? 1) || 1;
  const notes = (formData.get("notes") as string | null)?.trim() || null;
  const orderId = (formData.get("order_id") as string | null) || null;
  const file = formData.get("file");

  if (!userId) return { error: "Missing client." };
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Please choose a letter file to upload." };
  }
  if (file.size > MAX_BYTES) return { error: "File is too large (max 10 MB)." };
  if (!ALLOWED.has(file.type)) {
    return { error: "Only PDF, PNG, or JPG files are accepted." };
  }

  const db = createAdminClient();
  const path = `${userId}/${Date.now()}-${sanitize(file.name)}`;

  const { error: uploadError } = await db.storage
    .from("dispute-letters")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) return { error: `Upload failed: ${uploadError.message}` };

  const { error: insertError } = await db.from("dispute_letters").insert({
    user_id: userId,
    order_id: orderId,
    file_path: path,
    file_name: file.name,
    round,
    notes,
    created_by: admin.id,
  });
  if (insertError) return { error: `Could not save record: ${insertError.message}` };

  const { data: profile } = await db
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  const prof = profile as Profile | null;
  await notifyLetterReady(prof?.email ?? null, prof?.phone ?? null);

  revalidatePath(`/admin/${userId}`);
  revalidatePath("/admin");
  return { message: `Round ${round} letter uploaded and the client was notified.` };
}

// ── AI dispute-letter drafting (admin only) ──────────────────────────────
// Reads the client's uploaded report, asks the AI to draft one letter per
// bureau, and stores them as 'draft' rows. NOTHING is sent — the admin must
// review and approve each draft before the client can see it.
export interface DraftActionState {
  error?: string;
  message?: string;
}

export async function generateDrafts(
  userId: string,
  reportId: string,
): Promise<DraftActionState> {
  await requireAdmin();

  if (!isAiConfigured()) {
    return {
      error:
        "AI generation isn't configured yet. Add OPENAI_API_KEY in the environment to enable it.",
    };
  }

  const db = createAdminClient();

  const { data: report } = await db
    .from("credit_reports")
    .select("*")
    .eq("id", reportId)
    .eq("user_id", userId)
    .single();
  const rep = report as CreditReport | null;
  if (!rep) return { error: "Report not found for this client." };

  // Pull the file bytes from storage (service role bypasses RLS).
  const { data: blob, error: dlError } = await db.storage
    .from("credit-reports")
    .download(rep.file_path);
  if (dlError || !blob) {
    return { error: `Could not read the report file: ${dlError?.message ?? "missing"}.` };
  }
  const reportBytes = Buffer.from(await blob.arrayBuffer());
  const contentType = blob.type || "application/pdf";

  // Next round = highest existing round for this client + 1.
  const { data: existing } = await db
    .from("letter_drafts")
    .select("round")
    .eq("user_id", userId)
    .order("round", { ascending: false })
    .limit(1);
  const round =
    ((existing as { round: number }[] | null)?.[0]?.round ?? 0) + 1;

  // select("*") is intentional: it won't error if the mailing_address column
  // hasn't been migrated yet — it just comes back undefined → blank address.
  const { data: profile } = await db
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  const prof = profile as Partial<Profile> | null;

  let result;
  try {
    result = await generateLetterDrafts({
      reportBytes,
      fileName: rep.file_name,
      contentType,
      clientName: prof?.full_name ?? null,
      clientAddress: prof?.mailing_address ?? null,
      clientPhone: prof?.phone ?? null,
      clientEmail: prof?.email ?? null,
      round,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Generation failed.";
    return { error: msg };
  }

  const admin = await requireAdmin();
  const rows = result.letters.map((l) => ({
    user_id: userId,
    report_id: reportId,
    bureau: l.bureau,
    subject: l.subject,
    body: l.body,
    round,
    model: result.model,
    status: "draft" as const,
    created_by: admin.id,
  }));

  const { data: inserted, error: insertError } = await db
    .from("letter_drafts")
    .insert(rows)
    .select("id, bureau");
  if (insertError) {
    return { error: `Could not save drafts: ${insertError.message}` };
  }

  // Persist the structured dispute items, linked to their draft by bureau, so
  // each tradeline can be tracked through its lifecycle. This is additive: if
  // the dispute_items table hasn't been migrated yet, the insert errors are
  // swallowed and the drafts above are still saved.
  const draftByBureau = new Map(
    ((inserted as { id: string; bureau: string }[] | null) ?? []).map((d) => [
      d.bureau,
      d.id,
    ]),
  );
  const itemRows = result.letters.flatMap((l) =>
    (l.items ?? []).map((it) => ({
      user_id: userId,
      report_id: reportId,
      draft_id: draftByBureau.get(l.bureau) ?? null,
      bureau: l.bureau,
      creditor: it.creditor,
      account_mask: it.account_mask,
      item_type: it.item_type,
      reason: it.reason,
      round,
      status: "pending" as const,
      created_by: admin.id,
    })),
  );
  if (itemRows.length > 0) {
    await db.from("dispute_items").insert(itemRows);
  }

  revalidatePath(`/admin/${userId}`);
  return {
    message: `Drafted ${rows.length} letter${rows.length === 1 ? "" : "s"} (round ${round}). Review and approve below.`,
  };
}

// Admin saves/edits a client's mailing address (used on generated letters).
export async function saveClientAddress(
  userId: string,
  address: string,
): Promise<DraftActionState> {
  await requireAdmin();
  const db = createAdminClient();

  const { error } = await db
    .from("profiles")
    .update({ mailing_address: address.trim() || null })
    .eq("id", userId);
  if (error) return { error: `Could not save address: ${error.message}` };

  revalidatePath(`/admin/${userId}`);
  return { message: "Mailing address saved." };
}

// Save admin edits to a draft's body/subject.
export async function saveDraft(
  draftId: string,
  subject: string,
  body: string,
): Promise<DraftActionState> {
  await requireAdmin();
  const db = createAdminClient();

  const { data: draft } = await db
    .from("letter_drafts")
    .select("user_id")
    .eq("id", draftId)
    .single();
  const userId = (draft as { user_id: string } | null)?.user_id;
  if (!userId) return { error: "Draft not found." };

  const { error } = await db
    .from("letter_drafts")
    .update({ subject: subject.trim() || null, body: body.trim() })
    .eq("id", draftId);
  if (error) return { error: `Could not save: ${error.message}` };

  revalidatePath(`/admin/${userId}`);
  return { message: "Saved." };
}

// Approve a draft → it becomes visible to the client, who is then notified.
export async function approveDraft(draftId: string): Promise<DraftActionState> {
  const admin = await requireAdmin();
  const db = createAdminClient();

  const { data: draft } = await db
    .from("letter_drafts")
    .select("*")
    .eq("id", draftId)
    .single();
  const d = draft as LetterDraft | null;
  if (!d) return { error: "Draft not found." };

  const { error } = await db
    .from("letter_drafts")
    .update({
      status: "approved",
      approved_by: admin.id,
      approved_at: new Date().toISOString(),
    })
    .eq("id", draftId);
  if (error) return { error: `Could not approve: ${error.message}` };

  const { data: profile } = await db
    .from("profiles")
    .select("email, phone")
    .eq("id", d.user_id)
    .single();
  const prof = profile as Pick<Profile, "email" | "phone"> | null;
  await notifyLetterReady(prof?.email ?? null, prof?.phone ?? null);

  revalidatePath(`/admin/${d.user_id}`);
  return { message: `${d.bureau} letter approved and released to the client.` };
}

export async function rejectDraft(draftId: string): Promise<DraftActionState> {
  await requireAdmin();
  const db = createAdminClient();

  const { data: draft } = await db
    .from("letter_drafts")
    .select("user_id")
    .eq("id", draftId)
    .single();
  const userId = (draft as { user_id: string } | null)?.user_id;
  if (!userId) return { error: "Draft not found." };

  const { error } = await db
    .from("letter_drafts")
    .update({ status: "rejected" })
    .eq("id", draftId);
  if (error) return { error: `Could not reject: ${error.message}` };

  revalidatePath(`/admin/${userId}`);
  return { message: "Draft rejected." };
}

// ── Dispute-item lifecycle (admin only) ──────────────────────────────────
// The admin drives each tradeline through its lifecycle as bureaus respond.
// Round/journey state is DERIVED from these rows, so there is no separate
// rounds table to keep in sync.

const DAY_MS = 24 * 60 * 60 * 1000;

// Mark every still-pending item in a round as mailed: starts the FCRA §611
// 35-day clock (response_due_at = now + 35 days — a 5-day mail-transit buffer
// on top of the bureaus' 30-day legal window). Idempotent — only touches
// rows still in 'pending'.
export async function markRoundSent(
  userId: string,
  round: number,
): Promise<DraftActionState> {
  await requireAdmin();
  const db = createAdminClient();

  const now = new Date();
  const due = new Date(now.getTime() + 35 * DAY_MS);

  const { data, error } = await db
    .from("dispute_items")
    .update({
      status: "sent",
      sent_at: now.toISOString(),
      response_due_at: due.toISOString(),
    })
    .eq("user_id", userId)
    .eq("round", round)
    .eq("status", "pending")
    .select("id");
  if (error) return { error: `Could not update: ${error.message}` };

  const n = (data as { id: string }[] | null)?.length ?? 0;
  revalidatePath(`/admin/${userId}`);
  revalidatePath("/admin");
  return {
    message: n
      ? `Marked ${n} item${n === 1 ? "" : "s"} sent — the 35-day clock is running.`
      : "No pending items to mark sent.",
  };
}

const OUTCOMES = new Set([
  "deleted",
  "verified",
  "updated",
  "needs_followup",
  "sent",
  "pending",
]);

// Record a bureau's response on one item. Terminal outcomes stamp resolved_at;
// re-opening (sent/pending) clears it.
export async function setItemOutcome(
  itemId: string,
  status: string,
  note: string,
): Promise<DraftActionState> {
  await requireAdmin();
  if (!OUTCOMES.has(status)) return { error: "Unknown outcome." };
  const db = createAdminClient();

  const { data: row } = await db
    .from("dispute_items")
    .select("user_id")
    .eq("id", itemId)
    .single();
  const userId = (row as { user_id: string } | null)?.user_id;
  if (!userId) return { error: "Item not found." };

  const resolved =
    status === "deleted" || status === "verified" || status === "updated";

  const { error } = await db
    .from("dispute_items")
    .update({
      status,
      outcome_note: note.trim() || null,
      resolved_at: resolved ? new Date().toISOString() : null,
    })
    .eq("id", itemId);
  if (error) return { error: `Could not save: ${error.message}` };

  revalidatePath(`/admin/${userId}`);
  revalidatePath("/admin");
  return { message: "Outcome saved." };
}

// Manually add a dispute item (the non-AI path). When the admin writes their
// own letters and uploads them, there are no AI-created items to track — this
// lets them log a tradeline so the client's 35-day clock + outcome tracking
// works the same way it does for AI-drafted rounds.
const ITEM_TYPES = new Set([
  "collection",
  "charge_off",
  "late_payment",
  "inquiry",
  "balance",
  "duplicate",
  "other",
]);
const BUREAUS = new Set(["Equifax", "Experian", "TransUnion"]);

export async function addDisputeItem(
  userId: string,
  input: {
    bureau: string;
    creditor: string;
    account_mask?: string;
    item_type?: string;
    reason?: string;
    round?: number;
  },
): Promise<DraftActionState> {
  const admin = await requireAdmin();

  const creditor = input.creditor?.trim();
  if (!creditor) return { error: "Enter the creditor or furnisher name." };
  if (!BUREAUS.has(input.bureau)) return { error: "Choose a bureau." };

  const item_type =
    input.item_type && ITEM_TYPES.has(input.item_type) ? input.item_type : null;
  const round =
    Number.isInteger(input.round) && (input.round as number) >= 1
      ? (input.round as number)
      : 1;

  const db = createAdminClient();
  const { error } = await db.from("dispute_items").insert({
    user_id: userId,
    bureau: input.bureau,
    creditor,
    account_mask: input.account_mask?.trim() || null,
    item_type,
    reason: input.reason?.trim() || null,
    round,
    status: "pending",
    created_by: admin.id,
  });
  if (error) return { error: `Could not add item: ${error.message}` };

  revalidatePath(`/admin/${userId}`);
  revalidatePath("/admin");
  return { message: `Added ${creditor} (${input.bureau}) to round ${round}.` };
}

// Admin logs a score on a client's behalf (source 'manual').
export async function adminLogScore(
  userId: string,
  score: number,
  bureau: string,
): Promise<DraftActionState> {
  const admin = await requireAdmin();
  const validBureau = ["Merged", "Equifax", "Experian", "TransUnion"].includes(
    bureau,
  )
    ? bureau
    : "Merged";
  if (!Number.isInteger(score) || score < 300 || score > 850) {
    return { error: "Enter a score between 300 and 850." };
  }
  const db = createAdminClient();
  const { error } = await db.from("score_history").insert({
    user_id: userId,
    bureau: validBureau,
    score,
    source: "manual",
    created_by: admin.id,
  });
  if (error) return { error: `Could not save: ${error.message}` };

  revalidatePath(`/admin/${userId}`);
  return { message: `Logged ${validBureau} score ${score}.` };
}

// Edit a dispute item's descriptive fields (fix a typo'd creditor, wrong
// bureau, etc.). Status/clock are managed separately via setItemOutcome.
export async function updateDisputeItem(
  itemId: string,
  input: {
    bureau?: string;
    creditor?: string;
    account_mask?: string;
    item_type?: string;
    reason?: string;
    round?: number;
  },
): Promise<DraftActionState> {
  await requireAdmin();
  const db = createAdminClient();

  const { data: row } = await db
    .from("dispute_items")
    .select("user_id")
    .eq("id", itemId)
    .single();
  const userId = (row as { user_id: string } | null)?.user_id;
  if (!userId) return { error: "Item not found." };

  const patch: Record<string, unknown> = {};
  if (input.creditor !== undefined) {
    const creditor = input.creditor.trim();
    if (!creditor) return { error: "Enter the creditor or furnisher name." };
    patch.creditor = creditor;
  }
  if (input.bureau !== undefined) {
    if (!BUREAUS.has(input.bureau)) return { error: "Choose a bureau." };
    patch.bureau = input.bureau;
  }
  if (input.item_type !== undefined) {
    patch.item_type = ITEM_TYPES.has(input.item_type) ? input.item_type : null;
  }
  if (input.account_mask !== undefined) {
    patch.account_mask = input.account_mask.trim() || null;
  }
  if (input.reason !== undefined) patch.reason = input.reason.trim() || null;
  if (input.round !== undefined && Number.isInteger(input.round) && input.round >= 1) {
    patch.round = input.round;
  }
  if (Object.keys(patch).length === 0) return { message: "Nothing to update." };

  const { error } = await db.from("dispute_items").update(patch).eq("id", itemId);
  if (error) return { error: `Could not update item: ${error.message}` };

  revalidatePath(`/admin/${userId}`);
  revalidatePath("/admin");
  return { message: "Item updated." };
}

// Delete a dispute item added by mistake. Hard delete — the row is gone.
export async function deleteDisputeItem(
  itemId: string,
): Promise<DraftActionState> {
  await requireAdmin();
  const db = createAdminClient();

  const { data: row } = await db
    .from("dispute_items")
    .select("user_id")
    .eq("id", itemId)
    .single();
  const userId = (row as { user_id: string } | null)?.user_id;
  if (!userId) return { error: "Item not found." };

  const { error } = await db.from("dispute_items").delete().eq("id", itemId);
  if (error) return { error: `Could not delete item: ${error.message}` };

  revalidatePath(`/admin/${userId}`);
  revalidatePath("/admin");
  return { message: "Item deleted." };
}

// Delete a score entry the admin logged in error.
export async function adminDeleteScore(
  scoreId: string,
): Promise<DraftActionState> {
  await requireAdmin();
  const db = createAdminClient();

  const { data: row } = await db
    .from("score_history")
    .select("user_id")
    .eq("id", scoreId)
    .single();
  const userId = (row as { user_id: string } | null)?.user_id;
  if (!userId) return { error: "Score not found." };

  const { error } = await db.from("score_history").delete().eq("id", scoreId);
  if (error) return { error: `Could not delete score: ${error.message}` };

  revalidatePath(`/admin/${userId}`);
  return { message: "Score entry deleted." };
}

// ── Identity verification document review (admin only) ───────────────────
// A human admin approves or rejects each uploaded document. Rejecting prompts
// the client (by email) to re-upload, optionally with the admin's reason.
export async function reviewVerificationDocument(
  docId: string,
  decision: "approved" | "rejected",
  note: string,
): Promise<DraftActionState> {
  const admin = await requireAdmin();
  if (decision !== "approved" && decision !== "rejected") {
    return { error: "Unknown decision." };
  }
  const db = createAdminClient();

  const { data: doc } = await db
    .from("verification_documents")
    .select("*")
    .eq("id", docId)
    .single();
  const d = doc as VerificationDocument | null;
  if (!d) return { error: "Document not found." };

  const trimmedNote = note.trim() || null;
  const { error } = await db
    .from("verification_documents")
    .update({
      status: decision,
      review_note: decision === "rejected" ? trimmedNote : null,
      reviewed_by: admin.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", docId);
  if (error) return { error: `Could not save: ${error.message}` };

  const { data: profile } = await db
    .from("profiles")
    .select("email")
    .eq("id", d.user_id)
    .single();
  const email = (profile as Pick<Profile, "email"> | null)?.email ?? null;
  const label = categoryTitle(d.category);
  if (decision === "approved") {
    await notifyVerificationApproved(email, label);
  } else {
    await notifyVerificationRejected(email, label, trimmedNote);
  }

  revalidatePath(`/admin/${d.user_id}`);
  revalidatePath("/admin");
  return {
    message:
      decision === "approved"
        ? `${label} approved.`
        : `${label} rejected — the client was asked to re-upload.`,
  };
}

// Admin signed-URL helper — uses the service-role client so admins can read
// files stored under any client's folder.
export async function getAdminDownloadUrl(
  bucket: "credit-reports" | "dispute-letters" | "verification-documents",
  path: string,
): Promise<{ url?: string; error?: string }> {
  await requireAdmin();
  const db = createAdminClient();
  const { data, error } = await db.storage.from(bucket).createSignedUrl(path, 60);
  if (error || !data) return { error: error?.message ?? "Could not create link." };
  return { url: data.signedUrl };
}
