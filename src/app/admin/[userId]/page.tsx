import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { PLANS } from "@/lib/config";
import type {
  Order,
  Profile,
  CreditReport,
  DisputeLetter,
  LetterDraft,
} from "@/lib/types";
import { UploadLetterForm } from "../upload-letter-form";
import { AdminDownloadButton } from "../admin-download-button";
import { AiLetters } from "../ai-letters";
import { ClientAddressForm } from "../client-address-form";

// AI generation can take up to a minute on large reports.
export const maxDuration = 60;

export default async function AdminClientPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  await requireAdmin();
  const { userId } = await params;
  const db = createAdminClient();

  const { data: profile } = await db
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  if (!profile) notFound();
  const prof = profile as Profile;

  const [{ data: orders }, { data: reports }, { data: letters }, { data: drafts }] =
    await Promise.all([
      db
        .from("orders")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      db
        .from("credit_reports")
        .select("*")
        .eq("user_id", userId)
        .order("uploaded_at", { ascending: false }),
      db
        .from("dispute_letters")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      db
        .from("letter_drafts")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
    ]);

  const allOrders = (orders as Order[] | null) ?? [];
  const allReports = (reports as CreditReport[] | null) ?? [];
  const allLetters = (letters as DisputeLetter[] | null) ?? [];
  const allDrafts = (drafts as LetterDraft[] | null) ?? [];

  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto max-w-4xl px-5 py-4">
          <Link href="/admin" className="text-sm font-semibold text-brand">
            ← All clients
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 py-8">
        <h1 className="text-2xl font-bold text-ink">
          {prof.full_name ?? prof.email}
        </h1>
        <p className="mt-1 text-sm text-muted">
          {prof.email}
          {prof.phone ? ` · ${prof.phone}` : ""} · joined{" "}
          {new Date(prof.created_at).toLocaleDateString()}
        </p>

        {/* Payments / orders */}
        <Section title="Payments & service selection">
          {allOrders.length ? (
            <ul className="divide-y divide-line">
              {allOrders.map((o) => (
                <li
                  key={o.id}
                  className="flex items-center justify-between py-3 text-sm"
                >
                  <span className="text-ink-2">
                    <span className="font-semibold">{PLANS[o.plan_id].name}</span>{" "}
                    · {o.interval === "per_round" ? "per round" : "one-time"} ·{" "}
                    {new Date(o.created_at).toLocaleDateString()}
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="text-ink-2">
                      ${((o.amount_cents ?? 0) / 100).toLocaleString()}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        o.status === "active" || o.status === "completed"
                          ? "bg-[var(--rc-green)]/10 text-[var(--rc-green)]"
                          : o.status === "pending"
                            ? "bg-[var(--rc-amber)]/10 text-[var(--rc-amber)]"
                            : "bg-line-soft text-muted"
                      }`}
                    >
                      {o.status}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">No orders yet.</p>
          )}
        </Section>

        {/* Uploaded credit reports */}
        <Section title="Uploaded credit reports">
          {allReports.length ? (
            <ul className="divide-y divide-line">
              {allReports.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between py-3 text-sm"
                >
                  <span className="truncate text-ink-2">
                    {r.file_name}
                    <span className="ml-2 text-muted">
                      {new Date(r.uploaded_at).toLocaleDateString()}
                    </span>
                  </span>
                  <AdminDownloadButton
                    bucket="credit-reports"
                    path={r.file_path}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">No reports uploaded yet.</p>
          )}
        </Section>

        {/* Client mailing address (printed on generated letters) */}
        <Section title="Client mailing address">
          <ClientAddressForm
            userId={prof.id}
            current={prof.mailing_address ?? null}
          />
        </Section>

        {/* AI dispute-letter drafting + review */}
        <Section title="AI dispute letters">
          <AiLetters
            userId={prof.id}
            reports={allReports}
            drafts={allDrafts}
          />
        </Section>

        {/* Upload a dispute letter back */}
        <Section title="Upload completed dispute letter">
          <UploadLetterForm userId={prof.id} />
        </Section>

        {/* Existing letters */}
        <Section title="Dispute letters sent">
          {allLetters.length ? (
            <ul className="divide-y divide-line">
              {allLetters.map((l) => (
                <li
                  key={l.id}
                  className="flex items-center justify-between py-3 text-sm"
                >
                  <span className="text-ink-2">
                    <span className="font-semibold">Round {l.round}</span> ·{" "}
                    {l.file_name}
                    {l.notes && (
                      <span className="block text-xs text-muted">{l.notes}</span>
                    )}
                  </span>
                  <AdminDownloadButton
                    bucket="dispute-letters"
                    path={l.file_path}
                    label="Download"
                  />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">No letters sent yet.</p>
          )}
        </Section>
      </main>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-6 rounded-2xl border border-line bg-surface p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-bold text-ink">{title}</h2>
      {children}
    </section>
  );
}
