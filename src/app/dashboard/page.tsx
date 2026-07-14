import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";
import { signOut } from "@/app/auth/actions";
import { BRAND, PLANS, SMARTCREDIT_URL, BOOKING_URL } from "@/lib/config";
import { FAQS } from "@/lib/faq";
import type {
  Order,
  Profile,
  CreditReport,
  DisputeLetter,
  LetterDraft,
  DisputeItem,
  ScoreEntry,
  Agreement,
  VerificationDocument,
} from "@/lib/types";
import { agreementStatus } from "@/lib/compliance";
import { UploadForm } from "./upload-form";
import { VerificationPanel } from "./verification-panel";
import { PlanPicker } from "./plan-picker";
import { BuyRoundButton } from "./buy-round-button";
import { DownloadButton } from "./download-button";
import { AddressForm } from "./address-form";
import { DisputeJourney } from "./dispute-journey";
import { ScoreChart } from "./score-chart";
import { ScoreForm } from "./score-form";
import { CancelAgreementButton } from "@/app/agreement/cancel-button";

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/signin?next=/dashboard");

  const supabase = await createClient();
  const [
    { data: profile },
    { data: orders },
    { data: reports },
    { data: letters },
    { data: drafts },
    { data: items },
    { data: scores },
    { data: agreements },
    { data: verifications },
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase
      .from("orders")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("credit_reports")
      .select("*")
      .eq("user_id", user.id)
      .order("uploaded_at", { ascending: false }),
    supabase
      .from("dispute_letters")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    // RLS only returns 'approved' drafts to the client.
    supabase
      .from("letter_drafts")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    // dispute_items / score_history may not be migrated yet — `?? []` keeps the
    // dashboard rendering cleanly until they are.
    supabase
      .from("dispute_items")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("score_history")
      .select("*")
      .eq("user_id", user.id)
      .order("recorded_at", { ascending: true }),
    // agreements may not be migrated yet — `?? null` keeps the dashboard rendering.
    supabase.from("agreements").select("*").eq("user_id", user.id),
    // verification_documents may not be migrated yet — `?? []` keeps it rendering.
    supabase
      .from("verification_documents")
      .select("*")
      .eq("user_id", user.id)
      .order("uploaded_at", { ascending: false }),
  ]);
  const aiLetters = (drafts as LetterDraft[] | null) ?? [];
  const disputeItems = (items as DisputeItem[] | null) ?? [];
  const scoreEntries = (scores as ScoreEntry[] | null) ?? [];
  const agreement = agreementStatus((agreements as Agreement[] | null) ?? null);
  const verificationDocs =
    (verifications as VerificationDocument[] | null) ?? [];

  const prof = profile as Profile | null;
  const activeOrder = (orders as Order[] | null)?.find(
    (o) => o.status === "active" || o.status === "completed",
  );
  const fmtDeadline = (iso: string | null) =>
    iso
      ? new Date(iso).toLocaleString(undefined, {
          dateStyle: "medium",
          timeStyle: "short",
        })
      : "";

  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          <span className="font-mono text-sm font-semibold text-brand">
            {BRAND.name}
          </span>
          <div className="flex items-center gap-4 text-sm">
            {prof?.role === "admin" && (
              <Link href="/admin" className="font-semibold text-brand">
                Admin
              </Link>
            )}
            <span className="hidden text-muted sm:inline">
              {prof?.full_name ?? prof?.email}
            </span>
            <form action={signOut}>
              <button className="font-semibold text-ink-2 hover:text-ink">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-8">
        <h1 className="text-2xl font-bold text-ink">
          Welcome{prof?.full_name ? `, ${prof.full_name.split(" ")[0]}` : ""}
        </h1>
        <p className="mt-1 text-muted">
          {activeOrder
            ? `Your ${PLANS[activeOrder.plan_id].name} plan is active.`
            : "Choose a plan to get started with your credit repair."}
        </p>

        {/* Right-to-cancel notice — visible during the 3-business-day window */}
        {agreement.cancelable && (
          <div className="mt-6 rounded-2xl border border-[var(--rc-amber)]/40 bg-[var(--rc-amber)]/10 p-5">
            <p className="text-sm font-semibold text-ink">
              You have the right to cancel — free of charge
            </p>
            <p className="mt-1 text-sm text-ink-2">
              You may cancel your service agreement until{" "}
              <strong>{fmtDeadline(agreement.deadline)}</strong>
              {agreement.daysLeft !== null &&
                ` (${agreement.daysLeft} day${agreement.daysLeft === 1 ? "" : "s"} left)`}
              . If you cancel within this window you will not be charged.
            </p>
            <div className="mt-3">
              <CancelAgreementButton />
            </div>
          </div>
        )}

        {/* Book an onboarding call — only shown when a calendar link is set */}
        {BOOKING_URL && (
          <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-brand/30 bg-brand/5 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-ink">
                New here? Book your free onboarding call
              </p>
              <p className="mt-1 text-sm text-ink-2">
                We&apos;ll walk you through getting started and answer any
                questions — it only takes 15 minutes.
              </p>
            </div>
            <a
              href={BOOKING_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-none rounded-rc bg-brand px-5 py-3 text-center font-semibold text-white transition hover:bg-brand-2"
            >
              Book a call ↗
            </a>
          </div>
        )}

        {/* Plan selection (only until a plan is active) */}
        {!activeOrder &&
          (agreement.accepted ? (
            <Section title="Choose your plan" tourId="plan">
              <PlanPicker />
            </Section>
          ) : (
            <Section title="Choose your plan" tourId="plan">
              <p className="text-sm text-ink-2">
                Before you can purchase a plan, federal law requires you to review
                your credit-repair rights and sign our service agreement. It only
                takes a minute, and you can cancel free of charge within three
                business days.
              </p>
              <Link
                href="/agreement"
                className="mt-4 inline-block rounded-rc bg-brand px-5 py-3 font-semibold text-white transition hover:bg-brand-2"
              >
                Review &amp; sign the agreement →
              </Link>
            </Section>
          ))}

        {/* Next-round repurchase — only for an active Done-For-You client */}
        {activeOrder?.plan_id === "dfy" && (
          <Section title="Continue your disputes" tourId="next-round">
            <BuyRoundButton />
          </Section>
        )}

        {/* Score progress — chart + self-report */}
        <Section title="Your score progress" tourId="score">
          <ScoreChart entries={scoreEntries} />
          <ScoreForm />
        </Section>

        {/* Step 1: pull report via SmartCredit referral */}
        <Section title="Step 1 — Pull your credit report" tourId="step1">
          <p className="mb-4 text-sm text-muted">
            Use our partner link to pull all three bureaus in minutes, then
            upload the report below.
          </p>
          <a
            href={SMARTCREDIT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block rounded-rc bg-brand px-5 py-3 font-semibold text-white transition hover:bg-brand-2"
          >
            Pull my report ↗
          </a>
        </Section>

        {/* Step 2: upload */}
        <Section title="Step 2 — Upload your credit report" tourId="step2">
          <UploadForm />
          {reports && reports.length > 0 && (
            <ul className="mt-5 divide-y divide-line border-t border-line">
              {(reports as CreditReport[]).map((r) => (
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
                  <DownloadButton bucket="credit-reports" path={r.file_path} />
                </li>
              ))}
            </ul>
          )}
        </Section>

        {/* Identity verification — photo ID, proof of address, proof of SSN */}
        <Section title="Verify your identity" tourId="verify">
          <VerificationPanel docs={verificationDocs} />
        </Section>

        {/* Mailing address — printed on every dispute letter */}
        <Section title="Your mailing address" tourId="address">
          <AddressForm current={prof?.mailing_address ?? null} />
        </Section>

        {/* Dispute journey — item-level lifecycle + 35-day clocks */}
        <Section title="Your dispute progress" tourId="journey">
          <DisputeJourney items={disputeItems} />
        </Section>

        {/* Step 3: dispute letters back from admin */}
        <Section title="Step 3 — Your dispute letters" tourId="step3">
          {aiLetters.length > 0 && (
            <ul className="divide-y divide-line">
              {aiLetters.map((l) => (
                <li
                  key={l.id}
                  className="flex items-center justify-between gap-3 py-3 text-sm"
                >
                  <span className="min-w-0 text-ink-2">
                    <span className="font-semibold">Round {l.round}</span> ·{" "}
                    {l.bureau} dispute letter
                    {l.subject && (
                      <span className="block truncate text-xs text-muted">
                        {l.subject}
                      </span>
                    )}
                  </span>
                  <div className="flex flex-none items-center gap-2">
                    <Link
                      href={`/dashboard/letters/${l.id}`}
                      className="rounded-rc border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-brand transition hover:bg-line-soft"
                    >
                      View &amp; print
                    </Link>
                    <a
                      href={`/api/letters/draft/${l.id}/pdf`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-rc bg-brand px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-2"
                    >
                      Download + ID (PDF)
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {letters && letters.length > 0 && (
            <ul className="divide-y divide-line border-t border-line">
              {(letters as DisputeLetter[]).map((l) => (
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
                  <a
                    href={`/api/letters/file/${l.id}/pdf`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-none rounded-rc bg-brand px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-2"
                  >
                    Download letter + ID (PDF)
                  </a>
                </li>
              ))}
            </ul>
          )}

          {aiLetters.length === 0 && (!letters || letters.length === 0) && (
            <p className="text-sm text-muted">
              No letters yet. Once your report is reviewed and your dispute
              letters are ready, they&apos;ll appear here to view and print.
            </p>
          )}
        </Section>

        {/* Narrated walkthrough video */}
        <Section title="Watch the walkthrough" tourId="walkthrough">
          <video
            src="/tutorial.mp4"
            controls
            playsInline
            preload="metadata"
            className="w-full rounded-2xl border border-line shadow-sm"
          />
        </Section>

        {/* Frequently asked questions — collapsed by default, expand each on click */}
        <Section title="Frequently asked questions" tourId="faq">
          <div className="space-y-3">
            {FAQS.map((f) => (
              <details
                key={f.q}
                className="group rounded-2xl border border-line bg-bg px-5 py-4 transition hover:border-brand/40"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left text-sm font-semibold text-ink [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <span className="flex-none text-2xl font-light leading-none text-muted transition-transform duration-200 group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-muted">{f.a}</p>
              </details>
            ))}
          </div>
        </Section>
      </main>
    </div>
  );
}

function Section({
  title,
  children,
  tourId,
}: {
  title: string;
  children: React.ReactNode;
  tourId?: string;
}) {
  return (
    <section
      data-tour={tourId}
      className="mt-6 rounded-2xl border border-line bg-surface p-6 shadow-sm"
    >
      <h2 className="mb-4 text-lg font-bold text-ink">{title}</h2>
      {children}
    </section>
  );
}
