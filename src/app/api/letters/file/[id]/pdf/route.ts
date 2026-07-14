// GET /api/letters/file/[id]/pdf
// Streams an admin-uploaded dispute letter (a stored PDF/image) with the
// client's approved identity documents appended as the final pages.
//
// Access: the client can only reach their OWN letter (RLS). An admin (service
// role) can build the packet for any client's letter.

import { getSessionUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildLetterPacket } from "@/lib/letter-pdf";
import { loadApprovedEnclosures } from "@/lib/verification-docs";
import type { DisputeLetter } from "@/lib/types";

export const runtime = "nodejs";

const BUCKET = "dispute-letters";

function outName(round: number, original: string): string {
  const base = original.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9]+/g, "-");
  return `Round-${round}-${base || "dispute-letter"}.pdf`;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const { id } = await params;

  const server = await createClient();
  const { data: profile } = await server
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const isAdmin = (profile as { role?: string } | null)?.role === "admin";
  const db = isAdmin ? createAdminClient() : server;

  const { data } = await db.from("dispute_letters").select("*").eq("id", id).single();
  const letter = data as DisputeLetter | null;
  if (!letter) return new Response("Not found", { status: 404 });

  const { data: blob, error } = await db.storage.from(BUCKET).download(letter.file_path);
  if (error || !blob) return new Response("Letter file missing", { status: 404 });
  const letterBytes = new Uint8Array(await blob.arrayBuffer());

  const enclosures = await loadApprovedEnclosures(db, letter.user_id);

  const pdf = await buildLetterPacket(
    { kind: "file", bytes: letterBytes, contentType: blob.type || null },
    enclosures,
  );

  const body = pdf.buffer.slice(
    pdf.byteOffset,
    pdf.byteOffset + pdf.byteLength,
  ) as ArrayBuffer;
  return new Response(body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${outName(letter.round, letter.file_name)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
