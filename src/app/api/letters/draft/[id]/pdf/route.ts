// GET /api/letters/draft/[id]/pdf
// Streams an AI-generated dispute letter as a PDF with the client's approved
// identity documents appended as the final pages.
//
// Access: the client can only reach their OWN approved draft (RLS). An admin
// (service role) can build the packet for any client's draft.

import { getSessionUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildLetterPacket } from "@/lib/letter-pdf";
import { loadApprovedEnclosures } from "@/lib/verification-docs";
import type { LetterDraft } from "@/lib/types";

export const runtime = "nodejs";

function fileName(round: number, bureau: string): string {
  const safe = bureau.replace(/[^a-zA-Z0-9]+/g, "-");
  return `Round-${round}-${safe}-dispute-letter.pdf`;
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

  const { data } = await db.from("letter_drafts").select("*").eq("id", id).single();
  const letter = data as LetterDraft | null;
  // Non-admins only ever get their own approved draft back (RLS); double-check.
  if (!letter || (!isAdmin && letter.status !== "approved")) {
    return new Response("Not found", { status: 404 });
  }

  const enclosures = await loadApprovedEnclosures(db, letter.user_id);

  const pdf = await buildLetterPacket(
    { kind: "text", subject: letter.subject, body: letter.body },
    enclosures,
  );

  const body = pdf.buffer.slice(
    pdf.byteOffset,
    pdf.byteOffset + pdf.byteLength,
  ) as ArrayBuffer;
  return new Response(body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${fileName(letter.round, letter.bureau)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
