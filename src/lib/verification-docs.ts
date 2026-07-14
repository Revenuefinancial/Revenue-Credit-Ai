// Loads a client's APPROVED identity-verification documents as PDF enclosures,
// ready to append to a dispute letter. One document per required category
// (latest approved wins), in the order bureaus expect: photo ID, proof of
// address, proof of SSN.
//
// Only 'approved' docs are used — a pending or rejected upload never ships with
// a letter. Works with either an RLS-scoped client (the client reading their
// own docs) or the service-role client (an admin building it for a client).

import type { SupabaseClient } from "@supabase/supabase-js";
import { REQUIRED_CATEGORIES, categoryTitle } from "@/lib/verification";
import type { Enclosure } from "@/lib/letter-pdf";
import type { VerificationDocument } from "@/lib/types";

const BUCKET = "verification-documents";

export async function loadApprovedEnclosures(
  db: SupabaseClient,
  userId: string,
): Promise<Enclosure[]> {
  const { data } = await db
    .from("verification_documents")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "approved")
    .order("uploaded_at", { ascending: false });

  const docs = (data as VerificationDocument[] | null) ?? [];

  // Latest approved doc per category (rows are already newest-first).
  const latestByCategory = new Map<string, VerificationDocument>();
  for (const d of docs) {
    if (!latestByCategory.has(d.category)) latestByCategory.set(d.category, d);
  }

  const enclosures: Enclosure[] = [];
  for (const category of REQUIRED_CATEGORIES) {
    const doc = latestByCategory.get(category);
    if (!doc) continue;

    const { data: blob, error } = await db.storage.from(BUCKET).download(doc.file_path);
    if (error || !blob) continue;

    const bytes = new Uint8Array(await blob.arrayBuffer());
    const label = doc.doc_type
      ? `${categoryTitle(category)} (${doc.doc_type})`
      : categoryTitle(category);

    enclosures.push({ bytes, contentType: blob.type || null, label });
  }

  return enclosures;
}
