"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyLetterReady } from "@/lib/notifications";
import { generateLetterDrafts, isAiConfigured } from "@/lib/ai/generate-letters";
import type { CreditReport, LetterDraft, Profile } from "@/lib/types";

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

  const { data: profile } = await db
    .from("profiles")
    .select("full_name")
    .eq("id", userId)
    .single();
  const clientName = (profile as { full_name: string | null } | null)?.full_name;

  let result;
  try {
    result = await generateLetterDrafts({
      reportBytes,
      fileName: rep.file_name,
      contentType,
      clientName,
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

  const { error: insertError } = await db.from("letter_drafts").insert(rows);
  if (insertError) {
    return { error: `Could not save drafts: ${insertError.message}` };
  }

  revalidatePath(`/admin/${userId}`);
  return {
    message: `Drafted ${rows.length} letter${rows.length === 1 ? "" : "s"} (round ${round}). Review and approve below.`,
  };
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

// Admin signed-URL helper — uses the service-role client so admins can read
// files stored under any client's folder.
export async function getAdminDownloadUrl(
  bucket: "credit-reports" | "dispute-letters",
  path: string,
): Promise<{ url?: string; error?: string }> {
  await requireAdmin();
  const db = createAdminClient();
  const { data, error } = await db.storage.from(bucket).createSignedUrl(path, 60);
  if (error || !data) return { error: error?.message ?? "Could not create link." };
  return { url: data.signedUrl };
}
