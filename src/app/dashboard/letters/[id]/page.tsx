import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";
import type { LetterDraft } from "@/lib/types";
import { PrintButton } from "./print-button";

export default async function LetterPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/signin?next=/dashboard");
  const { id } = await params;

  const supabase = await createClient();
  // RLS only returns this row if it belongs to the user AND is approved.
  const { data } = await supabase
    .from("letter_drafts")
    .select("*")
    .eq("id", id)
    .single();
  const letter = data as LetterDraft | null;
  if (!letter) notFound();

  return (
    <div className="min-h-screen bg-bg print:bg-white">
      {/* Toolbar — hidden when printing */}
      <header className="border-b border-line bg-surface print:hidden">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4">
          <Link href="/dashboard" className="text-sm font-semibold text-brand">
            ← Back to dashboard
          </Link>
          <PrintButton />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-8 print:px-0 print:py-0">
        <div className="mb-4 rounded-lg bg-[var(--rc-amber)]/10 px-4 py-3 text-xs text-ink-2 print:hidden">
          Before mailing: fill in any bracketed placeholders (your address,
          account numbers) and sign at the bottom. Send to the bureau by
          certified mail and keep a copy.
        </div>

        <article className="rounded-2xl border border-line bg-white p-8 shadow-sm print:rounded-none print:border-0 print:p-0 print:shadow-none">
          <div className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted print:hidden">
            Round {letter.round} · {letter.bureau}
          </div>
          {letter.subject && (
            <h1 className="mb-4 text-lg font-bold text-ink">{letter.subject}</h1>
          )}
          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-ink-2">
            {letter.body}
          </pre>
        </article>
      </main>
    </div>
  );
}
