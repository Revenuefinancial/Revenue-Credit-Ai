"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyLetterReady } from "@/lib/notifications";
import type { Profile } from "@/lib/types";

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
