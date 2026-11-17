import Link from "next/link";
import type { Metadata } from "next";
import { BRAND, PLANS, formatPrice } from "@/lib/config";
import { ViewTutorialButton } from "@/app/view-tutorial-button";

export const metadata: Metadata = {
  title: `How it works — ${BRAND.name}`,
  description:
    "A plain-English walkthrough of how Revenue Credit AI works, for clients and for our team.",
};

const CLIENT_STEPS = [
  {
    n: 1,
    h: "Create your account",
    p: "Sign up with an email and password. You'll confirm your email with one click, then land on your private dashboard.",
  },
  {
    n: 2,
    h: "Choose a plan",
    p: "Pick DIY (you print and mail the letters) or Done-For-You (we certified-mail every round for you). You can decide later — the dashboard guides you.",
  },
  {
    n: 3,
    h: "Pull your credit report",
    p: "One button opens our SmartCredit partner link, where you pull all three bureaus in a couple of minutes. No hard inquiry.",
  },
  {
    n: 4,
    h: "Upload the report",
    p: "Drop the PDF into Step 2 of your dashboard. It's stored securely — only you and our team can see it.",
  },
  {
    n: 5,
    h: "Verify your identity",
    p: "Upload three documents — a photo ID (front only), a proof of address, and a proof of your Social Security number. This protects your account and helps us get better results. Our team reviews each one and lets you know if anything needs a clearer copy.",
  },
  {
    n: 6,
    h: "View and print your dispute letters",
    p: "When your letters are approved they appear under Step 3. Open any one to read it, then print it or save it as a PDF. We email and text you the moment a new round is posted.",
  },
];

const ADMIN_STEPS = [
  {
    n: 1,
    h: "See every client at a glance",
    p: "The admin panel lists all clients with their plan, order status, files, and what they've paid — plus, for each one, whether they've signed the agreement and how many items you've removed so far. Total revenue shows at the top.",
  },
  {
    n: 2,
    h: "Open a client and read their report",
    p: "Click 'Manage' to see their payments and download the exact report they uploaded — stored privately, visible only to you and the client.",
  },
  {
    n: 3,
    h: "Verify their identity documents",
    p: "Each client uploads a photo ID, proof of address, and proof of SSN. You review each one and click Approve, or Reject with a quick reason — which emails the client to send a clearer copy. The 'Docs to review' card on your worklist shows who's waiting.",
  },
  {
    n: 4,
    h: "Let the AI draft the letters",
    p: "One click reads the report and writes a separate FCRA dispute letter for each bureau, citing the specific accounts it found. They arrive as editable drafts — nothing is sent.",
  },
  {
    n: 5,
    h: "Review, approve, release",
    p: "You read each letter, edit anything you like, then click 'Approve & release'. Only then can the client see it — and they're notified automatically by email and SMS.",
  },
  {
    n: 6,
    h: "Track every outcome",
    p: "Log each disputed item — whether the AI drafted it or you add it by hand — and mark it Sent, Deleted, Corrected, or Verified. Each sent item starts a 35-day bureau clock the client watches on their own dashboard.",
  },
  {
    n: 7,
    h: "Stay compliant and on top of refunds",
    p: "Every client shows their signed-agreement status and 3-business-day cancel window, plus a 180-day service clock and how many items you've removed against the refund-policy floor — so you always know who can still cancel for a full refund and who's at refund risk.",
  },
];

const FAQS = [
  {
    q: "Where does my credit report go after I upload it?",
    a: "Into a private, encrypted storage vault tied to your account. It is never public and never sold. Only you and the Revenue Credit AI team can open it — other clients can't, and search engines can't.",
  },
  {
    q: "How are the dispute letters actually written?",
    a: "When your team opens your file, they run the AI on your uploaded report. It reads the report, finds the accounts and items worth disputing, and drafts a separate FCRA dispute letter for each bureau — in seconds.",
  },
  {
    q: "Does the AI send anything automatically?",
    a: "No. Every AI letter starts as a draft that a real person on the team reads, edits, and approves first. Nothing reaches you — or any bureau — until a human has signed off. That review step is intentional, to keep the letters accurate and compliant.",
  },
  {
    q: "What do I do with a letter once it's ready?",
    a: "Open it from Step 3 on your dashboard. Fill in the few bracketed blanks (your address, account numbers), then print it or save it as a PDF. On DIY you mail it yourself; on Done-For-You the team certified-mails every round for you.",
  },
  {
    q: "Why do I have to upload my ID and other documents?",
    a: "The bureaus and your team need to confirm you are who you say you are before disputing anything in your name — it protects your account and gets better results. You upload three things: a photo ID, a proof of address, and a proof of your Social Security number. A real person reviews each one and lets you know if a clearer copy is needed.",
  },
  {
    q: "Is my information secure?",
    a: "Yes. Files are stored with bank-level encryption, access is locked to your account, and your data is never sold. Sign-in is required to view anything in your dashboard.",
  },
];

export default function HowItWorksPage() {
  return (
    <main className="text-ink">
      {/* Nav */}
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <Link href="/" className="text-lg font-bold tracking-tight">
          {BRAND.name}
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/demo"
            className="text-sm font-medium text-ink hover:text-brand"
          >
            View demo
          </Link>
          <Link
            href="/signup"
            className="rounded-[10px] bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-2"
          >
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <header className="mx-auto max-w-3xl px-6 pb-6 pt-8 text-center">
        <span className="text-xs font-bold uppercase tracking-widest text-brand">
          How it works
        </span>
        <h1 className="mt-3 text-4xl font-extrabold tracking-tight">
          The whole platform, in plain English.
        </h1>
        <p className="mt-4 text-lg text-muted">
          {BRAND.name} has two sides: what your <strong>clients</strong> do, and
          what <strong>your team</strong> does behind the scenes. Here&apos;s
          both, start to finish.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <ViewTutorialButton />
          <Link
            href="/demo"
            className="rounded-[12px] bg-brand px-6 py-3 font-semibold text-white transition hover:bg-brand-2"
          >
            🖥️ Try the interactive demo
          </Link>
          <Link
            href="/"
            className="rounded-[12px] border border-line bg-surface px-6 py-3 font-medium text-ink transition hover:bg-line-soft"
          >
            Back to homepage
          </Link>
        </div>
      </header>

      {/* Client journey */}
      <section
        data-tour="hiw-client"
        className="mx-auto max-w-3xl px-6 py-12"
      >
        <div className="mb-8">
          <h2 className="text-2xl font-bold tracking-tight">
            The client journey
          </h2>
          <p className="mt-1 text-muted">
            What someone signing up sees and does.
          </p>
        </div>
        <ol className="space-y-4">
          {CLIENT_STEPS.map((s) => (
            <li
              key={s.n}
              className="flex gap-4 rounded-2xl border border-line bg-surface p-5 shadow-sm"
            >
              <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-brand text-sm font-bold text-white">
                {s.n}
              </span>
              <div>
                <h3 className="font-semibold text-ink">{s.h}</h3>
                <p className="mt-1 text-sm text-muted">{s.p}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Admin journey */}
      <section className="bg-surface border-y border-line">
        <div
          data-tour="hiw-admin"
          className="mx-auto max-w-3xl px-6 py-12"
        >
          <div className="mb-8">
            <h2 className="text-2xl font-bold tracking-tight">
              Your team&apos;s journey
            </h2>
            <p className="mt-1 text-muted">
              What you do in the admin panel — clients never see this.
            </p>
          </div>
          <ol className="space-y-4">
            {ADMIN_STEPS.map((s) => (
              <li
                key={s.n}
                className="flex gap-4 rounded-2xl border border-line bg-bg p-5"
              >
                <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-ink text-sm font-bold text-white">
                  {s.n}
                </span>
                <div>
                  <h3 className="font-semibold text-ink">{s.h}</h3>
                  <p className="mt-1 text-sm text-muted">{s.p}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Plans recap */}
      <section className="mx-auto max-w-3xl px-6 py-12">
        <h2 className="mb-6 text-2xl font-bold tracking-tight">
          The two plans
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {Object.values(PLANS).map((plan) => {
            const price = formatPrice(plan);
            return (
              <div
                key={plan.id}
                className="rounded-2xl border border-line bg-surface p-6 shadow-sm"
              >
                <h3 className="font-bold">{plan.name}</h3>
                <p className="mt-1 text-sm text-muted">{plan.tagline}</p>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-2xl font-extrabold">
                    {price.amount}
                  </span>
                  <span className="text-sm text-muted">{price.unit}</span>
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-4 text-center text-xs text-muted">
          Pricing shown is provisional pending final confirmation.
        </p>
      </section>

      {/* FAQ — answers the questions clients ask most */}
      <section className="bg-surface border-y border-line">
        <div className="mx-auto max-w-3xl px-6 py-12">
          <h2 className="mb-6 text-2xl font-bold tracking-tight">
            Common questions
          </h2>
          <div className="space-y-4">
            {FAQS.map((f) => (
              <div
                key={f.q}
                className="rounded-2xl border border-line bg-bg p-5"
              >
                <h3 className="font-semibold text-ink">{f.q}</h3>
                <p className="mt-1 text-sm text-muted">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-line bg-surface">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 px-6 py-8 text-sm text-muted md:flex-row">
          <span>
            © {new Date().getFullYear()} {BRAND.name}. A {BRAND.parent} company.
          </span>
          <div className="flex gap-5">
            <Link href="/demo" className="hover:text-ink">
              Demo
            </Link>
            <Link href="/terms" className="hover:text-ink">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-ink">
              Privacy
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
