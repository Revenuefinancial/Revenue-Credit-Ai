"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser, getProfile } from "@/lib/auth";
import { notifyReportReceived } from "@/lib/notifications";

export interface UploadState {
  error?: string;
  message?: string;
}

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
]);

const CREDIT_BUCKET = "credit-reports";

function sanitize(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
}

export async function uploadReport(
  _prev: UploadState,
  formData: FormData,
): Promise<UploadState> {
  const user = await requireUser();
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return { error: "Please choose a file to upload." };
  }
  if (file.size > MAX_BYTES) {
    return { error: "File is too large (max 10 MB)." };
  }
  if (!ALLOWED.has(file.type)) {
    return { error: "Only PDF, PNG, or JPG files are accepted." };
  }

  const supabase = await createClient();
  const path = `${user.id}/${Date.now()}-${sanitize(file.name)}`;

  const { error: uploadError } = await supabase.storage
    .from(CREDIT_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) {
    return { error: `Upload failed: ${uploadError.message}` };
  }

  const { error: insertError } = await supabase.from("credit_reports").insert({
    user_id: user.id,
    file_path: path,
    file_name: file.name,
    file_size: file.size,
  });
  if (insertError) {
    return { error: `Could not save record: ${insertError.message}` };
  }

  const profile = await getProfile();
  await notifyReportReceived(profile?.email ?? user.email ?? null);

  revalidatePath("/dashboard");
  return { message: "Credit report uploaded. Our team will review it shortly." };
}

// Returns a short-lived signed URL for a private file the caller owns.
// RLS on storage.objects enforces ownership; we also re-check the path prefix.
export async function getDownloadUrl(
  bucket: "credit-reports" | "dispute-letters",
  path: string,
): Promise<{ url?: string; error?: string }> {
  const user = await requireUser();
  if (!path.startsWith(`${user.id}/`)) {
    return { error: "Not authorized for this file." };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 60);
  if (error || !data) return { error: error?.message ?? "Could not create link." };
  return { url: data.signedUrl };
}
