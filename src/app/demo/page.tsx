"use client";

// /demo — a full, self-contained walkthrough of the platform.
// No login, no Stripe, nothing is saved. Every screen is a pixel-faithful
// replica of the real app (same Tailwind classes) rendered with sample data.
//
// A chapter stepper at the bottom walks through the whole client + admin
// journey end to end. Reachable by URL; linked from the homepage and the
// global Help panel.

import { useState } from "react";
import Link from "next/link";
import { BRAND, PLANS, formatPrice } from "@/lib/config";
import {
  DISCLOSURE_TITLE,
  DISCLOSURE_POINTS,
  CONTRACT_TITLE,
  CONTRACT_POINTS,
} from "@/lib/compliance";

// ── Sample data ──────────────────────────────────────────────────────
const CLIENT = {
  name: "Marcus Johnson",
  first: "Marcus",
  email: "marcus.j@email.com",
  phone: "(404) 555-0148",
  joined: "Jun 3, 2026",
};
const REPORT = { file: "Marcus-Johnson-3Bureau-Report.pdf", date: "Jun 8, 2026" };

// Sample AI-drafted letters (one per bureau). Realistic FCRA dispute text —
// this is exactly the kind of output the live AI produces from a real report.
const SAMPLE_LETTER_BODY = `To Whom It May Concern:

I am writing to formally dispute the following items on my credit report, which I believe to be inaccurate or unverifiable. Under Section 611 of the Fair Credit Reporting Act (15 U.S.C. §1681i), I request that you conduct a reasonable reinvestigation of each item below.

1. Collection account — "Midland Funding LLC" (Account #[ACCOUNT #])
   I have no record of this debt and dispute its accuracy. Please verify the original creditor, amount, and date.

2. Late payment — "Capital One" reported 30 days late, March 2024
   This payment was made on time. Please reinvestigate and correct the payment history.

3. Hard inquiry — dated Feb 2024
   I did not authorize this inquiry. Please remove it if it cannot be verified.

If any item cannot be fully verified, I request that it be corrected or deleted from my file. Please send me an updated copy of my credit report once the reinvestigation is complete.

Sincerely,
[YOUR NAME]
[YOUR ADDRESS]
[CITY, STATE ZIP]`;

const SAMPLE_LETTERS = [
  { bureau: "Equifax", subject: "Formal dispute — 3 items", body: SAMPLE_LETTER_BODY },
  { bureau: "Experian", subject: "Formal dispute — 3 items", body: SAMPLE_LETTER_BODY },
  { bureau: "TransUnion", subject: "Formal dispute — 2 items", body: SAMPLE_LETTER_BODY },
];

// Sample identity-verification documents — what the client uploads and the
// team reviews. Mirrors the three required categories.
const VERIFY_DOCS = [
  {
    category: "Photo ID",
    docType: "Driver's License",
    file: "marcus-license-front.jpg",
    status: "approved" as const,
  },
  {
    category: "Proof of Address",
    docType: "Utility Bill",
    file: "georgia-power-may.pdf",
    status: "approved" as const,
  },
  {
    category: "Proof of SSN",
    docType: "Social Security Card",
    file: "ssn-card.jpg",
    status: "pending" as const,
  },
];

// Sample score history — what the client logs after each pull.
const SCORE_POINTS = [612, 638, 671, 705];

// Sample dispute items — what the client sees under "Your dispute progress".
const DISPUTE_ITEMS = [
  {
    creditor: "Midland Funding LLC",
    mask: "••1042",
    type: "Collection",
    bureau: "Equifax",
    label: "Deleted",
    tone: "green" as const,
    reason: "No record of this debt — requested verification.",
    note: "Bureau deleted the account.",
  },
  {
    creditor: "Capital One",
    mask: "••8830",
    type: "Late payment",
    bureau: "Experian",
    label: "Corrected",
    tone: "green" as const,
    reason: "Payment was made on time; history was wrong.",
    note: "Late mark removed.",
  },
  {
    creditor: "Unverified inquiry",
    mask: null as string | null,
    type: "Hard inquiry",
    bureau: "TransUnion",
    label: "Sent — awaiting bureau",
    tone: "blue" as const,
    reason: "Inquiry was not authorized.",
    clock: "12 days left to respond",
  },
];

type Screen =
  | "landing"
  | "agreement"
  | "dashboard"
  | "admin"
  | "adminDetail"
  | "letterPrint";
type DashState = "empty" | "report" | "letter";
type AdminStage = "ready" | "drafts" | "approved";

type Chapter = {
  title: string;
  caption: string;
  screen: Screen;
  dash?: DashState;
  stage?: AdminStage;
};

const CHAPTERS: Chapter[] = [
  {
    title: "The homepage",
    caption:
      "This is the public page new clients land on. It explains the offer, shows pricing, and starts signup. Everything below is what they see AFTER they create an account.",
    screen: "landing",
  },
  {
    title: "Sign the agreement (required by law)",
    caption:
      "Before anyone can be charged, federal law (the Credit Repair Organizations Act) requires they read their credit-repair rights and sign a service agreement — with a 3-business-day right to cancel free of charge. The platform enforces this automatically: no signature, no checkout. (The wording shown is a draft placeholder until your attorney approves the final text.)",
    screen: "agreement",
  },
  {
    title: "A brand-new dashboard",
    caption:
      "Right after signing and choosing a plan, this is the client's home base. They get a visible right-to-cancel notice during the 3-day window, a place to track their score, and the steps to pull and upload their 3-bureau report.",
    screen: "dashboard",
    dash: "empty",
  },
  {
    title: "Report uploaded",
    caption:
      "The client pulled their report and uploaded the PDF. It's stored securely in your private vault — only the client and your team can ever open it. It now shows under Step 2.",
    screen: "dashboard",
    dash: "report",
  },
  {
    title: "Verify your identity",
    caption:
      "Before disputing anything in the client's name, they upload three things — a photo ID, a proof of address, and a proof of their SSN. Each one shows its own status. Here the ID and address are approved (green); the SSN card is still awaiting your team's review.",
    screen: "dashboard",
    dash: "report",
  },
  {
    title: "Your admin panel",
    caption:
      "Your team's view. Every client at a glance — their plan, order status, files, what they've paid, whether they've signed the agreement, and how many items you've removed against the refund-policy window.",
    screen: "admin",
  },
  {
    title: "Open a client — ready to draft",
    caption:
      "Click 'Manage' to open a client. You can download the exact report they uploaded, and right here is the AI button: one click drafts a dispute letter for each bureau from their report.",
    screen: "adminDetail",
    stage: "ready",
  },
  {
    title: "The AI drafts the letters",
    caption:
      "In a few seconds the AI reads the report and writes a separate FCRA dispute letter for Equifax, Experian and TransUnion — citing the specific accounts it found. They land as DRAFTS. Nothing is sent yet. You can open, edit, and reword every line.",
    screen: "adminDetail",
    stage: "drafts",
  },
  {
    title: "You review and approve",
    caption:
      "You — a human — read each letter and click 'Approve & release'. ONLY then does it become visible to the client. This review gate is deliberate: it keeps you in control and keeps the letters accurate and compliant. The AI never sends anything on its own.",
    screen: "adminDetail",
    stage: "approved",
  },
  {
    title: "The client gets their letters — and tracks progress",
    caption:
      "The instant you approve, the client is emailed and texted automatically, and the letters appear under Step 3. They can also watch each disputed item move through the bureaus' 35-day clock, and see their score climb on the progress chart. The loop is closed.",
    screen: "dashboard",
    dash: "letter",
  },
  {
    title: "The finished letter",
    caption:
      "This is what the client opens and prints. Clean, on-letterhead, with bracketed blanks for their address and account numbers. DIY clients mail it themselves; Done-For-You clients have your team certified-mail it.",
    screen: "letterPrint",
  },
];

export default function DemoPage() {
  const [i, setI] = useState(0);
  const ch = CHAPTERS[i];

  return (
    <div className="min-h-screen bg-bg pb-32">
      {/* Demo-mode banner */}
      <div className="sticky top-0 z-40 flex items-center justify-between bg-ink px-4 py-2 text-[13px] text-white">
        <span className="flex items-center gap-2">
          <span className="rounded bg-white/15 px-2 py-0.5 text-[11px] font-bold tracking-wide">
            DEMO MODE
          </span>
          <span className="hidden text-white/85 sm:inline">
            Sample data · no login · nothing is saved
          </span>
        </span>
        <Link
          href="/"
          className="rounded-md bg-white/15 px-3 py-1 text-xs font-semibold transition hover:bg-white/25"
        >
          Exit demo
        </Link>
      </div>

      {/* Current screen */}
      <div className="px-3 py-5">
        <div className="mx-auto max-w-6xl overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_30px_80px_-40px_rgba(10,31,68,0.35)]">
          {/* Faux browser chrome for that "real app" feel */}
          <div className="flex items-center gap-2 border-b border-line bg-bg px-4 py-2.5">
            <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
            <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
            <span className="h-3 w-3 rounded-full bg-[#28c840]" />
            <span className="ml-3 flex-1 truncate rounded-md bg-surface px-3 py-1 text-center text-xs text-muted">
              app.revenuecreditai.com
              {ch.screen === "dashboard"
                ? "/dashboard"
                : ch.screen.startsWith("admin")
                  ? "/admin"
                  : ch.screen === "letterPrint"
                    ? "/dashboard/letters"
                    : ch.screen === "agreement"
                      ? "/agreement"
                      : ""}
            </span>
          </div>

          <div className="max-h-[70vh] overflow-y-auto">
            {ch.screen === "landing" && <DemoLanding />}
            {ch.screen === "agreement" && <DemoAgreement />}
            {ch.screen === "dashboard" && (
              <DemoDashboard state={ch.dash ?? "empty"} />
            )}
            {ch.screen === "admin" && <DemoAdmin />}
            {ch.screen === "adminDetail" && (
              <DemoAdminDetail stage={ch.stage ?? "ready"} />
            )}
            {ch.screen === "letterPrint" && <DemoLetterPrint />}
          </div>
        </div>
      </div>

      {/* Chapter stepper */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto max-w-4xl px-4 py-3 pr-24">
          <div className="flex items-start gap-4">
            <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-brand text-sm font-bold text-white">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-ink">{ch.title}</h3>
                <span className="text-xs text-muted">
                  Chapter {i + 1} of {CHAPTERS.length}
                </span>
              </div>
              <p className="mt-0.5 text-xs leading-relaxed text-muted">
                {ch.caption}
              </p>
            </div>
            <div className="flex flex-none items-center gap-2">
              <button
                onClick={() => setI(Math.max(0, i - 1))}
                disabled={i === 0}
                className="rounded-rc border border-line px-3 py-2 text-sm font-medium text-ink-2 transition disabled:opacity-40 hover:bg-line-soft"
              >
                ← Back
              </button>
              {i < CHAPTERS.length - 1 ? (
                <button
                  onClick={() => setI(i + 1)}
                  className="rounded-rc bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-2"
                >
                  Next →
                </button>
              ) : (
                <Link
                  href="/signup"
                  className="rounded-rc bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-2"
                >
                  Start for real →
                </Link>
              )}
            </div>
          </div>
          {/* progress dots */}
          <div className="mt-2 flex gap-1.5 pl-13">
            {CHAPTERS.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setI(idx)}
                aria-label={`Go to chapter ${idx + 1}`}
                className={`h-1.5 flex-1 rounded-full transition ${
                  idx <= i ? "bg-brand" : "bg-line"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Screen: Landing (faithful replica of the public homepage) ────────
function DemoLanding() {
  return (
    <main className="text-ink">
      <div className="bg-ink px-4 py-2 text-center text-[13px] text-white/90">
        🔒 <b className="font-semibold">Bank-level encryption</b> · Your data is
        never sold · SOC-2 ready infrastructure
      </div>
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <span className="text-lg font-bold tracking-tight">{BRAND.name}</span>
        <div className="hidden items-center gap-7 text-sm text-muted md:flex">
          <span>How it works</span>
          <span>Pricing</span>
          <span>Success stories</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-ink">Sign in</span>
          <span className="rounded-[10px] bg-brand px-4 py-2 text-sm font-semibold text-white">
            Free score check
          </span>
        </div>
      </nav>

      <header className="mx-auto grid max-w-6xl items-center gap-12 px-6 pb-12 pt-6 md:grid-cols-2">
        <div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-muted">
            <span className="h-2 w-2 rounded-full bg-success" />
            Trusted by 14,200+ clients across 47 states
          </div>
          <h1 className="text-4xl font-extrabold leading-[1.1] tracking-tight md:text-5xl">
            Raise your credit score{" "}
            <span className="text-brand">82 points on average</span> — in 90
            days.
          </h1>
          <p className="mt-5 max-w-lg text-lg text-muted">
            Upload your three-bureau report. Our AI drafts professional dispute
            letters in seconds — pick DIY to mail them yourself, or
            Done-For-You and we&apos;ll certified-mail every round.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <span className="rounded-[12px] bg-ink px-6 py-3 font-semibold text-white">
              Pull free credit report →
            </span>
            <span className="rounded-[12px] border border-line bg-surface px-6 py-3 font-medium text-ink">
              See how it works
            </span>
          </div>
        </div>

        <aside className="rounded-2xl border border-line bg-surface p-6 shadow-[0_20px_50px_-20px_rgba(10,31,68,0.25)]">
          <div className="mb-4 flex items-center justify-between">
            <h4 className="text-sm font-semibold">
              Your projected score · 90 days
            </h4>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-success">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
              LIVE PREVIEW
            </span>
          </div>
          <div className="relative flex flex-col items-center py-2">
            <svg viewBox="0 0 240 130" className="w-full max-w-[260px]">
              <defs>
                <linearGradient id="demoScoreGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#ef4444" />
                  <stop offset="50%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#10b981" />
                </linearGradient>
              </defs>
              <path
                d="M 20 120 A 100 100 0 0 1 220 120"
                fill="none"
                stroke="#eef1f6"
                strokeWidth="16"
                strokeLinecap="round"
              />
              <path
                d="M 20 120 A 100 100 0 0 1 220 120"
                fill="none"
                stroke="url(#demoScoreGrad)"
                strokeWidth="16"
                strokeLinecap="round"
                strokeDasharray="314"
                strokeDashoffset="70"
              />
            </svg>
            <div className="-mt-10 text-center">
              <div className="text-4xl font-extrabold">742</div>
              <div className="text-xs text-muted">Projected</div>
            </div>
          </div>
          <div className="mt-2 rounded-lg bg-line-soft px-3 py-2 text-center text-sm font-semibold text-success">
            ↑ +82 pts vs. today (660)
          </div>
        </aside>
      </header>

      {/* Pricing */}
      <section className="mx-auto max-w-5xl px-6 py-12">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold tracking-tight">
            Simple, fair pricing.
          </h2>
          <p className="mt-2 text-muted">No subscriptions. No surprise fees.</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {Object.values(PLANS).map((plan) => {
            const price = formatPrice(plan);
            return (
              <article
                key={plan.id}
                className={`relative rounded-2xl border bg-surface p-8 ${
                  plan.featured
                    ? "border-brand shadow-[0_20px_50px_-20px_rgba(29,78,216,0.4)]"
                    : "border-line"
                }`}
              >
                {plan.featured && (
                  <span className="absolute -top-3 left-8 rounded-full bg-brand px-3 py-1 text-[11px] font-bold tracking-wide text-white">
                    MOST POPULAR
                  </span>
                )}
                <h3 className="text-xl font-bold">{plan.name}</h3>
                <p className="mt-1 text-sm text-muted">{plan.tagline}</p>
                <div className="mt-5 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold">{price.amount}</span>
                  <span className="text-sm text-muted">{price.unit}</span>
                </div>
                <ul className="mt-6 space-y-2.5 text-sm">
                  {plan.features.map((f) => (
                    <li key={f} className="flex gap-2">
                      <span className="text-success">✓</span>
                      <span className="text-ink-2">{f}</span>
                    </li>
                  ))}
                </ul>
                <span
                  className={`mt-7 block rounded-[12px] px-6 py-3 text-center font-semibold ${
                    plan.featured
                      ? "bg-brand text-white"
                      : "border border-line text-ink"
                  }`}
                >
                  {plan.featured ? "Get Done-For-You" : "Start with DIY"}
                </span>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}

// ── Screen: Dashboard (faithful replica, 3 states) ───────────────────
function DemoDashboard({ state }: { state: DashState }) {
  const hasReport = state === "report" || state === "letter";
  const hasLetter = state === "letter";
  return (
    <div className="bg-bg">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          <span className="font-mono text-sm font-semibold text-brand">
            {BRAND.name}
          </span>
          <div className="flex items-center gap-4 text-sm">
            <span className="hidden text-muted sm:inline">{CLIENT.email}</span>
            <span className="font-semibold text-ink-2">Sign out</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-8">
        <h1 className="text-2xl font-bold text-ink">
          Welcome, {CLIENT.first}
        </h1>
        <p className="mt-1 text-muted">Your Done-For-You plan is active.</p>

        {/* Right-to-cancel notice — visible during the 3-business-day window */}
        {state === "empty" && (
          <div className="mt-6 rounded-2xl border border-[var(--rc-amber)]/40 bg-[var(--rc-amber)]/10 p-5">
            <p className="text-sm font-semibold text-ink">
              You have the right to cancel — free of charge
            </p>
            <p className="mt-1 text-sm text-ink-2">
              You may cancel your service agreement until{" "}
              <strong>Jun 8, 2026, 11:59 PM</strong> (3 days left). If you cancel
              within this window you will not be charged.
            </p>
            <span className="mt-3 inline-block rounded-rc border border-line bg-surface px-4 py-2 text-sm font-semibold text-ink">
              Cancel agreement
            </span>
          </div>
        )}

        {/* Score progress — chart + self-report */}
        <DemoSection title="Your score progress">
          <DemoScoreChart points={SCORE_POINTS} />
        </DemoSection>

        <DemoSection title="Step 1 — Pull your credit report">
          <p className="mb-4 text-sm text-muted">
            Use our partner link to pull all three bureaus in minutes, then
            upload the report below.
          </p>
          <span className="inline-block rounded-rc bg-brand px-5 py-3 font-semibold text-white">
            Pull my report ↗
          </span>
        </DemoSection>

        <DemoSection title="Step 2 — Upload your credit report">
          <div className="rounded-rc border-2 border-dashed border-line bg-bg px-5 py-8 text-center text-sm text-muted">
            Drag &amp; drop your report PDF here, or click to browse.
          </div>
          {hasReport && (
            <ul className="mt-5 divide-y divide-line border-t border-line">
              <li className="flex items-center justify-between py-3 text-sm">
                <span className="truncate text-ink-2">
                  {REPORT.file}
                  <span className="ml-2 text-muted">{REPORT.date}</span>
                </span>
                <span className="text-sm font-semibold text-brand">
                  Download
                </span>
              </li>
            </ul>
          )}
        </DemoSection>

        <DemoSection title="Verify your identity">
          <DemoVerification verified={hasLetter} />
        </DemoSection>

        <DemoSection title="Your mailing address">
          <p className="mb-3 text-sm text-muted">
            This is printed at the top of every dispute letter, so the bureaus
            know who to respond to.
          </p>
          <div className="rounded-rc border border-line bg-bg px-4 py-3 text-sm text-ink-2">
            Marcus Johnson
            <br />
            218 Peachtree St NE, Apt 12
            <br />
            Atlanta, GA 30303
          </div>
        </DemoSection>

        <DemoSection title="Your dispute progress">
          {hasLetter ? (
            <DemoDisputeJourney />
          ) : (
            <p className="text-sm text-muted">
              Your disputes will appear here once your letters are prepared. Each
              item we challenge is tracked through the bureaus&apos; 35-day
              response window so you always know where things stand.
            </p>
          )}
        </DemoSection>

        <DemoSection title="Step 3 — Your dispute letters">
          {hasLetter ? (
            <ul className="divide-y divide-line">
              {SAMPLE_LETTERS.map((l) => (
                <li
                  key={l.bureau}
                  className="flex items-center justify-between gap-3 py-3 text-sm"
                >
                  <span className="min-w-0 text-ink-2">
                    <span className="font-semibold">Round 1</span> · {l.bureau}{" "}
                    dispute letter
                    <span className="block truncate text-xs text-muted">
                      {l.subject}
                    </span>
                  </span>
                  <span className="flex-none rounded-rc border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-brand">
                    View &amp; print
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">
              No letters yet. Once your report is reviewed and your dispute
              letters are ready, they&apos;ll appear here to view and print.
            </p>
          )}
        </DemoSection>
      </main>
    </div>
  );
}

// ── Screen: Admin client list (faithful replica) ─────────────────────
const DEMO_ROWS = [
  {
    name: CLIENT.name,
    email: CLIENT.email,
    plan: "Done-For-You",
    status: "Active",
    reports: 1,
    letters: 1,
    paid: 9900,
    agreement: "Signed" as const,
    agreementSub: null,
    disputed: 5,
    wins: 3,
    window: "Day 62 of 180 · 118 left",
    winsTone: "green" as const,
    verification: "in_review" as const,
  },
  {
    name: "Priya Rao",
    email: "priya.r@email.com",
    plan: "DIY Credit Repair",
    status: "Active",
    reports: 1,
    letters: 0,
    paid: 3900,
    agreement: "In cancel window" as const,
    agreementSub: "2 days left to cancel for a full refund",
    disputed: 0,
    wins: 0,
    window: null,
    winsTone: "neutral" as const,
    verification: "complete" as const,
  },
  {
    name: "Danielle Kim",
    email: "danielle.k@email.com",
    plan: "Done-For-You",
    status: "Pending",
    reports: 0,
    letters: 0,
    paid: 0,
    agreement: "Not signed" as const,
    agreementSub: null,
    disputed: 0,
    wins: 0,
    window: null,
    winsTone: "neutral" as const,
    verification: "not_started" as const,
  },
];

function DemoVerifyBadge({
  state,
}: {
  state: "complete" | "in_review" | "not_started";
}) {
  if (state === "not_started") return null;
  const cls =
    state === "complete"
      ? "bg-[var(--rc-green)]/10 text-[var(--rc-green)]"
      : "bg-[var(--rc-amber)]/10 text-[var(--rc-amber)]";
  const label = state === "complete" ? "ID verified" : "Docs to review";
  return (
    <span
      className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${cls}`}
    >
      {label}
    </span>
  );
}

function DemoAdmin() {
  const revenue = DEMO_ROWS.reduce((s, r) => s + r.paid, 0);
  return (
    <div className="bg-bg">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <span className="font-mono text-sm font-semibold text-brand">
            {BRAND.name} · Admin
          </span>
          <div className="flex items-center gap-4 text-sm">
            <span className="font-semibold text-ink-2">My dashboard</span>
            <span className="font-semibold text-ink-2">Sign out</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-8">
        <h1 className="text-2xl font-bold text-ink">Clients</h1>
        <div className="mt-4 grid gap-4 sm:grid-cols-4">
          <DemoStat label="Clients" value={String(DEMO_ROWS.length)} />
          <DemoStat label="Docs to review" value="1" />
          <DemoStat label="Reports uploaded" value="2" />
          <DemoStat
            label="Revenue (paid)"
            value={`$${(revenue / 100).toLocaleString()}`}
          />
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-bg/50 text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-5 py-3">Client</th>
                <th className="px-5 py-3">Plan</th>
                <th className="px-5 py-3">Order</th>
                <th className="px-5 py-3">Agreement</th>
                <th className="px-5 py-3">Results</th>
                <th className="px-5 py-3">Paid</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {DEMO_ROWS.map((r) => (
                <tr key={r.email} className="hover:bg-bg/40">
                  <td className="px-5 py-3">
                    <div className="font-semibold text-ink">{r.name}</div>
                    <div className="text-xs text-muted">{r.email}</div>
                    <div className="text-xs text-muted">
                      {r.reports} report{r.reports === 1 ? "" : "s"} ·{" "}
                      {r.letters} letter{r.letters === 1 ? "" : "s"}
                    </div>
                    <DemoVerifyBadge state={r.verification} />
                  </td>
                  <td className="px-5 py-3 text-ink-2">{r.plan}</td>
                  <td className="px-5 py-3">
                    <DemoBadge status={r.status} />
                  </td>
                  <td className="px-5 py-3">
                    <DemoAgreementBadge
                      label={r.agreement}
                      sub={r.agreementSub}
                    />
                  </td>
                  <td className="px-5 py-3">
                    {r.disputed === 0 && !r.window ? (
                      <span className="text-xs text-muted">—</span>
                    ) : (
                      <div>
                        <div
                          className={`text-sm font-semibold ${
                            r.winsTone === "green"
                              ? "text-[var(--rc-green)]"
                              : "text-ink"
                          }`}
                        >
                          {r.wins} removed
                          <span className="font-normal text-muted">
                            {" "}
                            / {r.disputed} disputed
                          </span>
                        </div>
                        {r.window && (
                          <div className="text-xs text-muted">{r.window}</div>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-3 text-ink-2">
                    ${(r.paid / 100).toLocaleString()}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <span className="font-semibold text-brand">Manage →</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

// ── Screen: Admin client detail (faithful replica) ───────────────────
function DemoAdminDetail({ stage }: { stage: AdminStage }) {
  return (
    <div className="bg-bg">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto max-w-4xl px-5 py-4">
          <span className="text-sm font-semibold text-brand">
            ← All clients
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 py-8">
        <h1 className="text-2xl font-bold text-ink">{CLIENT.name}</h1>
        <p className="mt-1 text-sm text-muted">
          {CLIENT.email} · {CLIENT.phone} · joined {CLIENT.joined}
        </p>

        <DemoSection title="Compliance & service window">
          <dl className="grid gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted">
                Agreement
              </dt>
              <dd className="mt-1 text-sm font-semibold text-ink">
                Signed Jun 12, 2026
              </dd>
              <dd className="mt-1 text-xs text-muted">
                Cancel window passed — cleared to perform paid work.
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted">
                Service window
              </dt>
              <dd className="mt-1 text-sm font-semibold text-ink">
                Day 62 of 180
              </dd>
              <dd className="mt-1 text-xs text-muted">
                Started Apr 11, 2026 · 118 days left
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted">
                Results vs. refund floor
              </dt>
              <dd className="mt-1 text-sm font-semibold text-[var(--rc-green)]">
                3 of 3 removed/corrected
              </dd>
              <dd className="mt-1 text-xs text-muted">
                Meets the 3-item floor — no refund owed on that basis.
              </dd>
            </div>
          </dl>
        </DemoSection>

        <DemoSection title="Uploaded credit reports">
          <ul className="divide-y divide-line">
            <li className="flex items-center justify-between py-3 text-sm">
              <span className="truncate text-ink-2">
                {REPORT.file}
                <span className="ml-2 text-muted">{REPORT.date}</span>
              </span>
              <span className="text-sm font-semibold text-brand">Download</span>
            </li>
          </ul>
        </DemoSection>

        <DemoSection title="Identity verification">
          <DemoVerificationReview />
        </DemoSection>

        <DemoSection title="AI dispute letters">
          <DemoAiPanel stage={stage} />
        </DemoSection>
      </main>
    </div>
  );
}

// ── The AI review panel (mirrors the real ai-letters.tsx) ────────────
function DemoAiPanel({ stage }: { stage: AdminStage }) {
  return (
    <div>
      <p className="mb-4 text-sm text-muted">
        Generate dispute letters from the client&apos;s uploaded report with AI,
        then review and approve each one.{" "}
        <strong>
          Nothing is sent to the client until you approve it.
        </strong>
      </p>

      <span className="inline-block rounded-rc bg-brand px-4 py-2.5 text-sm font-semibold text-white">
        ✨ Generate AI dispute letters
      </span>
      <p className="mt-2 text-xs text-muted">Drafts from: {REPORT.file}</p>

      {stage !== "ready" && (
        <div className="mt-6">
          <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted">
            Round 1
          </h3>
          <div className="space-y-3">
            {SAMPLE_LETTERS.map((l, idx) => {
              const approved = stage === "approved";
              return (
                <div
                  key={l.bureau}
                  className="rounded-xl border border-line bg-bg p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <span className="font-semibold text-ink">
                        {l.bureau}
                      </span>
                      <span className="ml-2 truncate text-sm text-muted">
                        {l.subject}
                      </span>
                    </div>
                    <span
                      className={`flex-none rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        approved
                          ? "bg-[var(--rc-green)]/10 text-[var(--rc-green)]"
                          : "bg-[var(--rc-amber)]/10 text-[var(--rc-amber)]"
                      }`}
                    >
                      {approved ? "approved" : "draft"}
                    </span>
                  </div>

                  {/* First card opened to show the real letter text */}
                  {idx === 0 && (
                    <div className="mt-3 space-y-3">
                      <div className="w-full rounded-lg border border-line bg-surface px-3 py-2 font-mono text-[11px] leading-relaxed text-ink-2">
                        <pre className="max-h-40 overflow-hidden whitespace-pre-wrap font-mono">
                          {l.body}
                        </pre>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-lg border border-line bg-surface px-3 py-1.5 text-sm font-semibold text-ink">
                          Save edits
                        </span>
                        {!approved && (
                          <span className="rounded-lg bg-[var(--rc-green)] px-3 py-1.5 text-sm font-semibold text-white">
                            Approve &amp; release
                          </span>
                        )}
                        {!approved && (
                          <span className="rounded-lg border border-line bg-surface px-3 py-1.5 text-sm font-semibold text-muted">
                            Reject
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  {idx !== 0 && (
                    <span className="mt-2 inline-block text-sm font-semibold text-brand">
                      {approved ? "View letter" : "Review & edit letter"}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Screen: the printable letter the client opens (faithful replica) ──
function DemoLetterPrint() {
  const l = SAMPLE_LETTERS[0];
  return (
    <div className="bg-bg">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4">
          <span className="text-sm font-semibold text-brand">
            ← Back to dashboard
          </span>
          <span className="rounded-rc bg-brand px-5 py-2.5 text-sm font-semibold text-white">
            🖨 Print / Save as PDF
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-8">
        <div className="mb-4 rounded-lg bg-[var(--rc-amber)]/10 px-4 py-3 text-xs text-ink-2">
          Before mailing: fill in any bracketed placeholders (your address,
          account numbers) and sign at the bottom. Send to the bureau by
          certified mail and keep a copy.
        </div>
        <article className="rounded-2xl border border-line bg-white p-8 shadow-sm">
          <div className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted">
            Round 1 · {l.bureau}
          </div>
          <h1 className="mb-4 text-lg font-bold text-ink">{l.subject}</h1>
          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-ink-2">
            {l.body}
          </pre>
        </article>
      </main>
    </div>
  );
}

// ── Screen: the CROA agreement / disclosure gate (faithful replica) ──
function DemoAgreement() {
  return (
    <div className="bg-bg">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto max-w-3xl px-5 py-4">
          <span className="font-mono text-sm font-semibold text-brand">
            {BRAND.name}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-8">
        <h1 className="text-2xl font-bold text-ink">
          Your rights &amp; service agreement
        </h1>
        <p className="mt-1 text-sm text-muted">
          Federal law requires you to review and sign these before any paid
          service begins.
        </p>

        {/* Draft-pending-legal banner (matches the real page) */}
        <div className="mt-5 rounded-rc border border-[var(--rc-amber)]/40 bg-[var(--rc-amber)]/10 px-4 py-3 text-xs text-ink-2">
          <strong className="text-ink">Draft pending legal review.</strong> The
          wording below is placeholder text to demonstrate the flow. Final,
          attorney-approved language will replace it before launch.
        </div>

        <section className="mt-6 rounded-2xl border border-line bg-surface p-6 shadow-sm">
          <h2 className="text-lg font-bold text-ink">{DISCLOSURE_TITLE}</h2>
          <ul className="mt-3 space-y-2 text-sm text-ink-2">
            {DISCLOSURE_POINTS.map((p) => (
              <li key={p} className="flex gap-2">
                <span className="text-brand">•</span>
                {p}
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-6 rounded-2xl border border-line bg-surface p-6 shadow-sm">
          <h2 className="text-lg font-bold text-ink">{CONTRACT_TITLE}</h2>
          <dl className="mt-3 space-y-3 text-sm">
            {CONTRACT_POINTS.map((c) => (
              <div key={c.heading}>
                <dt className="font-semibold text-ink">{c.heading}</dt>
                <dd className="mt-0.5 text-ink-2">{c.body}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Signature form (visual only in the demo) */}
        <section className="mt-6 rounded-2xl border border-line bg-surface p-6 shadow-sm">
          <div className="space-y-4">
            <label className="flex items-start gap-3 text-sm text-ink-2">
              <span className="mt-1 h-4 w-4 flex-none rounded border border-brand bg-brand text-center text-[10px] leading-4 text-white">
                ✓
              </span>
              <span>
                I have read and received a copy of the{" "}
                <strong>Consumer Credit File Rights</strong> disclosure above.
              </span>
            </label>
            <label className="flex items-start gap-3 text-sm text-ink-2">
              <span className="mt-1 h-4 w-4 flex-none rounded border border-brand bg-brand text-center text-[10px] leading-4 text-white">
                ✓
              </span>
              <span>
                I have read and agree to the{" "}
                <strong>Credit Repair Services Agreement</strong>, and I
                understand I may cancel free of charge within three business
                days.
              </span>
            </label>
            <div className="flex flex-col gap-1 text-xs font-semibold text-ink-2">
              Type your full legal name to sign
              <div className="max-w-sm rounded-rc border border-line bg-bg px-3 py-2 text-sm text-ink">
                Marcus A. Johnson
              </div>
            </div>
            <span className="inline-block rounded-rc bg-brand px-6 py-3 text-sm font-semibold text-white">
              Sign &amp; continue
            </span>
          </div>
        </section>
      </main>
    </div>
  );
}

// ── A pure-SVG score trend (mirrors the real ScoreChart) ─────────────
function DemoScoreChart({ points }: { points: number[] }) {
  const W = 520;
  const H = 180;
  const PAD = { top: 16, right: 16, bottom: 24, left: 32 };
  const lo = Math.max(300, Math.min(...points) - 20);
  const hi = Math.min(850, Math.max(...points) + 20);
  const span = Math.max(1, hi - lo);
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (i / (points.length - 1)) * innerW;
  const y = (s: number) => PAD.top + innerH - ((s - lo) / span) * innerH;
  const line = points.map((p, i) => `${x(i)},${y(p)}`).join(" ");
  const area = `${PAD.left},${PAD.top + innerH} ${line} ${PAD.left + innerW},${PAD.top + innerH}`;
  const latest = points[points.length - 1];
  const delta = latest - points[0];

  return (
    <div>
      <div className="flex items-baseline gap-3">
        <span className="text-3xl font-bold text-ink">{latest}</span>
        <span className="text-sm font-semibold text-[var(--rc-green)]">
          ▲ {delta} pts since you started
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 w-full">
        <defs>
          <linearGradient id="demoScoreFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--rc-green)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--rc-green)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[lo, Math.round((lo + hi) / 2), hi].map((v) => (
          <g key={v}>
            <line
              x1={PAD.left}
              x2={PAD.left + innerW}
              y1={y(v)}
              y2={y(v)}
              stroke="var(--color-line, #e5e7eb)"
              strokeWidth="1"
            />
            <text
              x={PAD.left - 6}
              y={y(v) + 3}
              textAnchor="end"
              className="fill-[var(--color-muted,#9ca3af)] text-[9px]"
            >
              {v}
            </text>
          </g>
        ))}
        <polygon points={area} fill="url(#demoScoreFill)" />
        <polyline
          points={line}
          fill="none"
          stroke="var(--rc-green)"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {points.map((p, i) => (
          <circle
            key={i}
            cx={x(i)}
            cy={y(p)}
            r="3.5"
            fill="var(--color-surface, #fff)"
            stroke="var(--rc-green)"
            strokeWidth="2"
          />
        ))}
      </svg>
    </div>
  );
}

// ── The dispute journey (mirrors the real DisputeJourney) ────────────
function DemoDisputeJourney() {
  const wins = DISPUTE_ITEMS.filter((i) => i.tone === "green").length;
  const sent = DISPUTE_ITEMS.filter((i) => i.tone === "blue").length;
  const toneClass: Record<string, string> = {
    blue: "border-brand/40 text-brand",
    green: "border-[var(--rc-green)]/40 text-[var(--rc-green)]",
  };
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-3 gap-3">
        <DemoJourneyStat label="Items disputed" value={DISPUTE_ITEMS.length} />
        <DemoJourneyStat label="Awaiting bureau" value={sent} />
        <DemoJourneyStat label="Removed / corrected" value={wins} green />
      </div>
      <div>
        <h3 className="mb-2 text-sm font-semibold text-ink">Round 1</h3>
        <ul className="flex flex-col gap-2">
          {DISPUTE_ITEMS.map((it) => (
            <li
              key={it.creditor}
              className="rounded-rc border border-line bg-bg px-4 py-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">
                    {it.creditor}
                    {it.mask && (
                      <span className="ml-2 font-mono text-xs text-muted">
                        {it.mask}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted">
                    {it.type} · {it.bureau}
                  </p>
                </div>
                <span
                  className={`flex-none rounded-full border px-2.5 py-0.5 text-xs font-semibold ${toneClass[it.tone]}`}
                >
                  {it.label}
                </span>
              </div>
              {it.reason && (
                <p className="mt-1.5 text-xs text-ink-2">{it.reason}</p>
              )}
              {"clock" in it && it.clock && (
                <p className="mt-1.5 text-xs font-semibold text-brand">
                  {it.clock}
                </p>
              )}
              {"note" in it && it.note && (
                <p className="mt-1.5 text-xs text-muted">{it.note}</p>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function DemoJourneyStat({
  label,
  value,
  green,
}: {
  label: string;
  value: number;
  green?: boolean;
}) {
  return (
    <div className="rounded-rc border border-line bg-bg px-3 py-3 text-center">
      <div
        className={`text-2xl font-bold ${green ? "text-[var(--rc-green)]" : "text-ink"}`}
      >
        {value}
      </div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  );
}

// ── Identity verification — client view (mirrors VerificationPanel) ──
function DemoVerification({ verified }: { verified: boolean }) {
  const total = VERIFY_DOCS.length;
  const approved = verified
    ? total
    : VERIFY_DOCS.filter((d) => d.status === "approved").length;
  return (
    <div>
      <p className="mb-4 text-sm text-muted">
        Upload these three documents so we can confirm your identity before
        disputing anything in your name. A real person reviews each one.
      </p>

      {verified ? (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-[var(--rc-green)]/30 bg-[var(--rc-green)]/10 px-4 py-3 text-sm font-semibold text-[var(--rc-green)]">
          <span aria-hidden>✓</span>
          Identity verified — thank you. Nothing else to do here.
        </div>
      ) : (
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs font-semibold text-muted">
            <span>Verification progress</span>
            <span>
              {approved} of {total} approved
            </span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-line">
            <div
              className="h-full rounded-full bg-[var(--rc-green)] transition-all"
              style={{ width: `${(approved / total) * 100}%` }}
            />
          </div>
        </div>
      )}

      <div className="space-y-3">
        {VERIFY_DOCS.map((d) => {
          // Once the journey reaches "letters", everything is approved.
          const status = verified ? "approved" : d.status;
          const badge =
            status === "approved"
              ? { label: "Approved", cls: "bg-[var(--rc-green)]/10 text-[var(--rc-green)]" }
              : { label: "Awaiting review", cls: "bg-[var(--rc-amber)]/10 text-[var(--rc-amber)]" };
          return (
            <div
              key={d.category}
              className="rounded-rc border border-line bg-bg p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">{d.category}</p>
                  <p className="truncate text-xs text-muted">
                    {d.docType} · {d.file}
                  </p>
                </div>
                <span
                  className={`flex-none rounded-full px-2.5 py-0.5 text-xs font-semibold ${badge.cls}`}
                >
                  {badge.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Identity verification — admin review view (mirrors the real panel) ─
function DemoVerificationReview() {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-muted">
          Review each document, then approve or reject it. Rejecting emails the
          client to upload a clearer copy.
        </p>
        <span className="flex-none rounded-full bg-[var(--rc-amber)]/10 px-2.5 py-0.5 text-xs font-semibold text-[var(--rc-amber)]">
          Documents to review
        </span>
      </div>
      <div className="space-y-3">
        {VERIFY_DOCS.map((d) => {
          const approved = d.status === "approved";
          return (
            <div
              key={d.category}
              className="rounded-xl border border-line bg-bg p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">{d.docType}</p>
                  <p className="truncate text-xs text-muted">
                    {d.category} · {d.file}
                  </p>
                </div>
                <span className="flex flex-none items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      approved
                        ? "bg-[var(--rc-green)]/10 text-[var(--rc-green)]"
                        : "bg-[var(--rc-amber)]/10 text-[var(--rc-amber)]"
                    }`}
                  >
                    {approved ? "Approved" : "Awaiting review"}
                  </span>
                  <span className="rounded-rc border border-line bg-surface px-3 py-1 text-xs font-semibold text-brand">
                    View
                  </span>
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold text-white ${
                    approved ? "bg-[var(--rc-green)]/50" : "bg-[var(--rc-green)]"
                  }`}
                >
                  {approved ? "Approved" : "Approve"}
                </span>
                <span className="rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink">
                  Reject
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Shared demo presentational helpers (mirror the real Section/Stat) ─
function DemoSection({
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

function DemoStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
      <div className="text-xs uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-1 text-2xl font-bold text-ink">{value}</div>
    </div>
  );
}

function DemoBadge({ status }: { status: string }) {
  const cls =
    status === "Active"
      ? "bg-[var(--rc-green)]/10 text-[var(--rc-green)]"
      : status === "Pending"
        ? "bg-[var(--rc-amber)]/10 text-[var(--rc-amber)]"
        : "bg-line-soft text-muted";
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}
    >
      {status}
    </span>
  );
}

function DemoAgreementBadge({
  label,
  sub,
}: {
  label: string;
  sub: string | null;
}) {
  const cls =
    label === "Signed"
      ? "bg-[var(--rc-green)]/10 text-[var(--rc-green)]"
      : label === "In cancel window"
        ? "bg-[var(--rc-amber)]/10 text-[var(--rc-amber)]"
        : "bg-line-soft text-muted";
  return (
    <div>
      <span
        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}
      >
        {label}
      </span>
      {sub && <div className="mt-1 text-xs text-muted">{sub}</div>}
    </div>
  );
}
