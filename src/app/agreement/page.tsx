import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { BRAND } from "@/lib/config";
import type { Agreement } from "@/lib/types";
import {
  agreementStatus,
  DISCLOSURE_TITLE,
  DISCLOSURE_POINTS,
  CONTRACT_TITLE,
  CONTRACT_POINTS,
} from "@/lib/compliance";
import { AgreementForm } from "./agreement-form";
import { CancelAgreementButton } from "./cancel-button";

export const metadata = { title: `Service Agreement — ${BRAND.name}` };

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default async function AgreementPage() {
  const user = await getSessionUser();
  if (!user) redirect("/signin?next=/agreement");

  const supabase = await createClient();
  const { data } = await supabase
    .from("agreements")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  const status = agreementStatus((data as Agreement[] | null) ?? null);

  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4">
          <span className="font-mono text-sm font-semibold text-brand">
            {BRAND.name}
          </span>
          <Link href="/dashboard" className="text-sm font-semibold text-ink-2 hover:text-ink">
            Dashboard
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-8">
        <h1 className="text-2xl font-bold text-ink">
          Before we begin — your rights &amp; our agreement
        </h1>
        <p className="mt-1 text-muted">
          Federal law requires that you receive this information and sign this
          agreement before we perform any paid credit-repair service for you.
        </p>

        {/* The disclosure is now the official federal text; the service-agreement
            clauses still warrant a final attorney pass before scaling. */}
        <div className="mt-4 rounded-rc border border-[var(--rc-amber)]/40 bg-[var(--rc-amber)]/10 p-4 text-sm text-ink-2">
          <strong>Please read carefully.</strong> The disclosure below is the
          federally-required statement of your rights. We recommend you keep a
          copy for your records.
        </div>

        {/* Acceptance status banner */}
        {status.accepted && (
          <div className="mt-4 rounded-rc border border-[var(--rc-green)]/40 bg-[var(--rc-green)]/10 p-4 text-sm text-ink-2">
            <strong>Signed.</strong> You accepted this agreement on{" "}
            {fmtDate(status.acceptedAt)}.
            {status.cancelable ? (
              <>
                {" "}
                You may cancel free of charge until{" "}
                <strong>{fmtDate(status.deadline)}</strong>
                {status.daysLeft !== null &&
                  ` (${status.daysLeft} day${status.daysLeft === 1 ? "" : "s"} left)`}
                .
              </>
            ) : (
              " Your 3-business-day cancellation window has passed."
            )}
          </div>
        )}
        {status.canceled && (
          <div className="mt-4 rounded-rc border border-[var(--rc-red)]/40 bg-[var(--rc-red)]/10 p-4 text-sm text-ink-2">
            <strong>Canceled.</strong> You canceled this agreement and have not
            been charged. Sign again below if you&apos;d like to proceed.
          </div>
        )}

        {/* Disclosure */}
        <section className="mt-6 rounded-2xl border border-line bg-surface p-6 shadow-sm">
          <h2 className="text-lg font-bold text-ink">{DISCLOSURE_TITLE}</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-ink-2">
            {DISCLOSURE_POINTS.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </section>

        {/* Contract */}
        <section className="mt-6 rounded-2xl border border-line bg-surface p-6 shadow-sm">
          <h2 className="text-lg font-bold text-ink">{CONTRACT_TITLE}</h2>
          <dl className="mt-3 space-y-3 text-sm">
            {CONTRACT_POINTS.map((c) => (
              <div key={c.heading}>
                <dt className="font-semibold text-ink">{c.heading}</dt>
                <dd className="text-ink-2">{c.body}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Sign / cancel */}
        <section className="mt-6 rounded-2xl border border-line bg-surface p-6 shadow-sm">
          {status.accepted ? (
            <div className="space-y-4">
              <p className="text-sm text-ink-2">
                You&apos;re all set. Continue to your dashboard to choose a plan
                and upload your report.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href="/dashboard"
                  className="rounded-rc bg-brand px-6 py-3 font-semibold text-white transition hover:bg-brand-2"
                >
                  Go to dashboard
                </Link>
                {status.cancelable && <CancelAgreementButton />}
              </div>
            </div>
          ) : (
            <>
              <h2 className="mb-4 text-lg font-bold text-ink">
                Sign to continue
              </h2>
              <AgreementForm />
            </>
          )}
        </section>
      </main>
    </div>
  );
}
