import Link from "next/link";
import type { Metadata } from "next";
import { BRAND, PLANS, formatPrice } from "@/lib/config";

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
    h: "Download your dispute letters",
    p: "When your letters are ready they appear under Step 3. We email and text you the moment a new round is posted.",
  },
];

const ADMIN_STEPS = [
  {
    n: 1,
    h: "See every client",
    p: "The admin panel lists all clients with their plan, status, files, and what they've paid — plus total revenue at a glance.",
  },
  {
    n: 2,
    h: "Open a client",
    p: "Click 'Manage' to see their payments, download the report they uploaded, and review past letters.",
  },
  {
    n: 3,
    h: "Send a finished letter",
    p: "Upload the completed dispute letter PDF. The client is notified automatically by email and SMS, and it appears in their dashboard instantly.",
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
