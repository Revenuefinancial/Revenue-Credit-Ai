import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";
import { signOut } from "@/app/auth/actions";
import { BRAND, PLANS, SMARTCREDIT_URL } from "@/lib/config";
import type {
  Order,
  Profile,
  CreditReport,
  DisputeLetter,
  LetterDraft,
} from "@/lib/types";
import { UploadForm } from "./upload-form";
import { PlanPicker } from "./plan-picker";
import { DownloadButton } from "./download-button";
import { AddressForm } from "./address-form";

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
  ]);
  const aiLetters = (drafts as LetterDraft[] | null) ?? [];

  const prof = profile as Profile | null;
  const activeOrder = (orders as Order[] | null)?.find(
    (o) => o.status === "active" || o.status === "completed",
  );

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

        {/* Plan selection (only until a plan is active) */}
        {!activeOrder && (
          <Section title="Choose your plan" tourId="plan">
            <PlanPicker />
          </Section>
        )}

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

        {/* Mailing address — printed on every dispute letter */}
        <Section title="Your mailing address" tourId="address">
          <AddressForm current={prof?.mailing_address ?? null} />
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
                  <Link
                    href={`/dashboard/letters/${l.id}`}
                    className="flex-none rounded-rc border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-brand transition hover:bg-line-soft"
                  >
                    View &amp; print
                  </Link>
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
                  <DownloadButton
                    bucket="dispute-letters"
                    path={l.file_path}
                    label="Download letter"
                  />
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
