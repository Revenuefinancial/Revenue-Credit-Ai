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
  DisputeItem,
  Agreement,
  ScoreEntry,
  VerificationDocument,
} from "@/lib/types";
import { isWin } from "@/lib/dispute";
import {
  agreementStatus,
  refundWindow,
  REFUND_MIN_ITEMS,
  REFUND_WINDOW_DAYS,
} from "@/lib/compliance";
import { UploadLetterForm } from "../upload-letter-form";
import { AdminDownloadButton } from "../admin-download-button";
import { AiLetters } from "../ai-letters";
import { ClientAddressForm } from "../client-address-form";
import { DisputeItemsPanel } from "../dispute-items-panel";
import { ScoreHistoryPanel } from "../score-history-panel";
import { VerificationReviewPanel } from "../verification-panel";

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

  const [
    { data: orders },
    { data: reports },
    { data: letters },
    { data: drafts },
    { data: items },
    { data: agreements },
    { data: scores },
    { data: verifications },
  ] = await Promise.all([
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
    db
      .from("dispute_items")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    db
      .from("agreements")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    db
      .from("score_history")
      .select("*")
      .eq("user_id", userId)
      .order("recorded_at", { ascending: false }),
    db
      .from("verification_documents")
      .select("*")
      .eq("user_id", userId)
      .order("uploaded_at", { ascending: false }),
  ]);

  const allOrders = (orders as Order[] | null) ?? [];
  const allReports = (reports as CreditReport[] | null) ?? [];
  const allLetters = (letters as DisputeLetter[] | null) ?? [];
  const allDrafts = (drafts as LetterDraft[] | null) ?? [];
  const allItems = (items as DisputeItem[] | null) ?? [];
  const allAgreements = (agreements as Agreement[] | null) ?? [];
  const allScores = (scores as ScoreEntry[] | null) ?? [];
  const allVerifications =
    (verifications as VerificationDocument[] | null) ?? [];

  // Compliance + refund-window summary for this client.
  const compliance = agreementStatus(allAgreements);
  const activeOrders = allOrders.filter(
    (o) => o.status === "active" || o.status === "completed",
  );
  const serviceStart = activeOrders.map((o) => o.created_at).sort()[0] ?? null;
  const refund = refundWindow(serviceStart);
  const wins = allItems.filter((i) => isWin(i.status)).length;
  const fmtDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString() : "—";

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

        {/* Compliance + refund window — what you must know before billing / refunds */}
        <Section title="Compliance & service window">
          <dl className="grid gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted">
                Agreement
              </dt>
              <dd className="mt-1 text-sm font-semibold text-ink">
                {compliance.canceled
                  ? "Canceled"
                  : compliance.accepted
                    ? `Signed ${fmtDate(compliance.acceptedAt)}`
                    : "Not signed"}
              </dd>
              {compliance.accepted && compliance.cancelable && (
                <dd className="mt-1 text-xs font-semibold text-[var(--rc-amber)]">
                  In 3-business-day cancel window until{" "}
                  {fmtDate(compliance.deadline)} — don&apos;t bill or start work
                  yet.
                </dd>
              )}
              {compliance.accepted && !compliance.cancelable && (
                <dd className="mt-1 text-xs text-muted">
                  Cancel window passed — cleared to perform paid work.
                </dd>
              )}
              {!compliance.accepted && !compliance.canceled && (
                <dd className="mt-1 text-xs text-muted">
                  Client must sign the disclosure + agreement before any paid
                  service.
                </dd>
              )}
            </div>

            <div>
              <dt className="text-xs uppercase tracking-wide text-muted">
                Service window
              </dt>
              <dd className="mt-1 text-sm font-semibold text-ink">
                {refund.started
                  ? refund.elapsed
                    ? "180-day window closed"
                    : `Day ${refund.daysIn} of ${REFUND_WINDOW_DAYS}`
                  : "Not started"}
              </dd>
              {refund.started && (
                <dd className="mt-1 text-xs text-muted">
                  Started {fmtDate(refund.startedAt)}
                  {!refund.elapsed && ` · ${refund.daysLeft} days left`}
                </dd>
              )}
            </div>

            <div>
              <dt className="text-xs uppercase tracking-wide text-muted">
                Results vs. refund floor
              </dt>
              <dd
                className={`mt-1 text-sm font-semibold ${
                  wins >= REFUND_MIN_ITEMS
                    ? "text-[var(--rc-green)]"
                    : refund.elapsed
                      ? "text-[var(--rc-red)]"
                      : "text-ink"
                }`}
              >
                {wins} of {REFUND_MIN_ITEMS} removed/corrected
              </dd>
              <dd className="mt-1 text-xs text-muted">
                {wins >= REFUND_MIN_ITEMS
                  ? "Meets the 3-item floor — no refund owed on that basis."
                  : wins === 0
                    ? "Zero so far — 100% refund risk if none by day 180."
                    : "Below the 3-item floor — 50% refund risk if not met by day 180."}
              </dd>
            </div>
          </dl>
        </Section>

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

        {/* Identity verification documents — manual approve / reject */}
        <Section title="Identity verification">
          <VerificationReviewPanel docs={allVerifications} />
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

        {/* Dispute-item lifecycle tracking */}
        <Section title="Dispute tracking & outcomes">
          <DisputeItemsPanel userId={prof.id} items={allItems} />
        </Section>

        {/* Score history (logged by admin or self-reported by client) */}
        <Section title="Score history">
          <ScoreHistoryPanel scores={allScores} />
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
                  <div className="flex flex-none items-center gap-2">
                    <AdminDownloadButton
                      bucket="dispute-letters"
                      path={l.file_path}
                      label="Download"
                    />
                    <a
                      href={`/api/letters/file/${l.id}/pdf`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-rc bg-brand px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-brand-2"
                    >
                      + ID docs (PDF)
                    </a>
                  </div>
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
