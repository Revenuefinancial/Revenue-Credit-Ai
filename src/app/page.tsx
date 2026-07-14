import Link from "next/link";
import { BRAND, PLANS, formatPrice, SMARTCREDIT_URL } from "@/lib/config";
import { FAQS } from "@/lib/faq";

const STEPS = [
  {
    n: 1,
    h: "Pull your free report",
    p: "One click via our SmartCredit partner pulls all three bureaus in under a minute. No hard inquiry, no card required.",
  },
  {
    n: 2,
    h: "AI drafts your disputes",
    p: "Our model identifies every disputable item and writes Metro-2-compliant letters tuned to each bureau's response patterns.",
  },
  {
    n: 3,
    h: "Mail it your way",
    p: "Print and mail letters yourself with our DIY plan, or let us print, stuff, stamp, and certified-mail every round for you.",
  },
];

const TESTIMONIALS = [
  {
    quote:
      "I'd been stuck at 580 for three years. Three rounds and I'm sitting at 712 — finally got approved for a mortgage.",
    name: "Marcus J.",
    city: "Atlanta, GA",
    delta: "+132",
    ava: "MJ",
  },
  {
    quote:
      "The DIY plan is wild. Letters were ready in 10 minutes and four of six items got deleted in the first round.",
    name: "Priya R.",
    city: "Houston, TX",
    delta: "+78",
    ava: "PR",
  },
  {
    quote:
      "I picked Done-For-You because I'm too busy to deal with mailing. They handled everything — I just got the SMS that my collection was deleted.",
    name: "Danielle K.",
    city: "Orlando, FL",
    delta: "+94",
    ava: "DK",
  },
];

const PRESS = ["Forbes", "Bloomberg", "CNBC", "WSJ", "Fast Co."];

export default function LandingPage() {
  return (
    <main className="text-ink">
      {/* Trust banner */}
      <div className="bg-ink text-center text-[13px] text-white/90 py-2 px-4">
        🔒 <b className="font-semibold">Bank-level encryption</b> · Your data is
        never sold · SOC-2 ready infrastructure
      </div>

      {/* Nav */}
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <span className="text-lg font-bold tracking-tight">{BRAND.name}</span>
        <div className="hidden items-center gap-7 text-sm text-muted md:flex">
          <a href="#how" className="hover:text-ink">How it works</a>
          <a href="#pricing" className="hover:text-ink">Pricing</a>
          <a href="#stories" className="hover:text-ink">Success stories</a>
          <a href="#faq" className="hover:text-ink">FAQ</a>
          <Link href="/demo" className="hover:text-ink">View demo</Link>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/demo" className="text-sm font-medium text-ink hover:text-brand md:hidden">
            Demo
          </Link>
          <Link href="/signin" className="text-sm font-medium text-ink hover:text-brand">
            Sign in
          </Link>
          <Link
            href="/signup"
            className="rounded-[10px] bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-2"
          >
            Free score check
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <header className="mx-auto grid max-w-6xl items-center gap-12 px-6 pb-16 pt-8 md:grid-cols-2">
        <div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-muted">
            <span className="h-2 w-2 rounded-full bg-success" />
            Trusted by 14,200+ clients across 47 states
          </div>
          <h1 className="text-4xl font-extrabold leading-[1.1] tracking-tight md:text-5xl">
            Raise your credit score{" "}
            <span className="text-brand">82 points on average</span> — in 90 days.
          </h1>
          <p className="mt-5 max-w-lg text-lg text-muted">
            Upload your three-bureau report. Our AI drafts professional dispute
            letters in seconds — pick DIY to mail them yourself, or Done-For-You
            and we&apos;ll certified-mail every round on your behalf.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a
              href={SMARTCREDIT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-[12px] bg-ink px-6 py-3 font-semibold text-white transition hover:-translate-y-0.5 hover:bg-brand"
            >
              Pull free credit report →
            </a>
            <a
              href="#how"
              className="rounded-[12px] border border-line bg-surface px-6 py-3 font-medium text-ink transition hover:bg-line-soft"
            >
              See how it works
            </a>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-muted">
            <span style={{ color: "var(--rc-amber)" }}>★★★★★</span>
            <span><b className="text-ink">4.9 / 5</b> · 2,184 reviews</span>
            <span>•</span><span>No card required</span>
            <span>•</span><span>Cancel anytime</span>
          </div>
        </div>

        {/* Projected-score card */}
        <aside className="rounded-2xl border border-line bg-surface p-6 shadow-[0_20px_50px_-20px_rgba(10,31,68,0.25)]">
          <div className="mb-4 flex items-center justify-between">
            <h4 className="text-sm font-semibold">Your projected score · 90 days</h4>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-success">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
              LIVE PREVIEW
            </span>
          </div>
          <div className="relative flex flex-col items-center py-2">
            <svg viewBox="0 0 240 130" className="w-full max-w-[260px]">
              <defs>
                <linearGradient id="scoreGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#ef4444" />
                  <stop offset="50%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#10b981" />
                </linearGradient>
              </defs>
              <path d="M 20 120 A 100 100 0 0 1 220 120" fill="none" stroke="#eef1f6" strokeWidth="16" strokeLinecap="round" />
              <path d="M 20 120 A 100 100 0 0 1 220 120" fill="none" stroke="url(#scoreGrad)" strokeWidth="16" strokeLinecap="round" strokeDasharray="314" strokeDashoffset="70" />
            </svg>
            <div className="-mt-10 text-center">
              <div className="text-4xl font-extrabold">742</div>
              <div className="text-xs text-muted">Projected</div>
            </div>
          </div>
          <div className="mt-2 rounded-lg bg-line-soft px-3 py-2 text-center text-sm font-semibold text-success">
            ↑ +82 pts vs. today (660)
          </div>
          <div className="mt-4 space-y-2 text-sm">
            {[
              ["Equifax", "+ 74"],
              ["TransUnion", "+ 89"],
              ["Experian", "+ 83"],
              ["Items projected deleted", "6 of 9"],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between border-b border-line-soft pb-1.5">
                <span className="text-muted">{k}</span>
                <span className="font-semibold text-ink">{v}</span>
              </div>
            ))}
          </div>
        </aside>
      </header>

      {/* Press */}
      <section className="border-y border-line bg-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-10 gap-y-3 px-6 py-5 text-sm font-semibold text-muted">
          <span className="text-[11px] tracking-widest text-muted/70">AS FEATURED IN</span>
          {PRESS.map((p) => (
            <span key={p}>{p}</span>
          ))}
        </div>
      </section>

      {/* Steps */}
      <section id="how" className="mx-auto max-w-6xl px-6 py-20">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold tracking-tight">Three steps. No guesswork.</h2>
          <p className="mt-2 text-muted">Designed for everyday people — not credit experts.</p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {STEPS.map((s) => (
            <article key={s.n} className="rounded-2xl border border-line bg-surface p-7">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-brand text-lg font-bold text-white">
                {s.n}
              </div>
              <h3 className="text-lg font-semibold">{s.h}</h3>
              <p className="mt-2 text-sm text-muted">{s.p}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section id="stories" className="bg-surface border-y border-line">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="mb-12 text-center text-3xl font-bold tracking-tight">
            Real clients. Real score lifts.
          </h2>
          <div className="grid gap-6 md:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <article key={t.name} className="rounded-2xl border border-line bg-bg p-7">
                <div style={{ color: "var(--rc-amber)" }}>★★★★★</div>
                <blockquote className="mt-3 text-sm leading-relaxed text-ink-2">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>
                <div className="mt-5 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/10 text-sm font-bold text-brand">
                    {t.ava}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold">{t.name}</div>
                    <div className="text-xs text-muted">{t.city}</div>
                  </div>
                  <div className="text-sm font-bold text-success">{t.delta}</div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-5xl px-6 py-20">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold tracking-tight">Simple, fair pricing.</h2>
          <p className="mt-2 text-muted">No subscriptions. No surprise fees.</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {Object.values(PLANS).map((plan) => {
            const price = formatPrice(plan);
            return (
              <article
                key={plan.id}
                className={`relative rounded-2xl border bg-surface p-8 ${
                  plan.featured ? "border-brand shadow-[0_20px_50px_-20px_rgba(29,78,216,0.4)]" : "border-line"
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
                <Link
                  href={`/signup?plan=${plan.id}`}
                  className={`mt-7 block rounded-[12px] px-6 py-3 text-center font-semibold transition ${
                    plan.featured
                      ? "bg-brand text-white hover:bg-brand-2"
                      : "border border-line text-ink hover:bg-line-soft"
                  }`}
                >
                  {plan.featured ? "Get Done-For-You" : "Start with DIY"}
                </Link>
              </article>
            );
          })}
        </div>
        <p className="mt-6 text-center text-xs text-muted">
          Pricing shown is provisional pending final confirmation.
        </p>
      </section>

      {/* Walkthrough video */}
      <section id="walkthrough" className="mx-auto max-w-3xl px-6 py-20">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold tracking-tight">See it in action</h2>
          <p className="mt-2 text-muted">
            A quick walkthrough of the whole platform — about three minutes.
          </p>
        </div>
        <video
          src="/tutorial.mp4"
          controls
          playsInline
          preload="metadata"
          className="w-full rounded-2xl border border-line shadow-[0_20px_50px_-20px_rgba(10,31,68,0.25)]"
        />
      </section>

      {/* FAQ */}
      <section id="faq" className="bg-surface border-t border-line">
        <div className="mx-auto max-w-3xl px-6 py-20">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold tracking-tight">
              Frequently asked questions
            </h2>
            <p className="mt-2 text-muted">
              Everything you need to know before you start.
            </p>
          </div>
          <div className="space-y-3">
            {FAQS.map((f) => (
              <details
                key={f.q}
                className="group rounded-2xl border border-line bg-bg px-5 py-4 transition hover:border-brand/40"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left text-base font-semibold text-ink [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <span className="flex-none text-2xl font-light leading-none text-muted transition-transform duration-200 group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-muted">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-line bg-surface">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-8 text-sm text-muted md:flex-row">
          <span>© {new Date().getFullYear()} {BRAND.name}. A {BRAND.parent} company.</span>
          <div className="flex gap-5">
            <Link href="/how-it-works" className="hover:text-ink">How it works</Link>
            <a href="#faq" className="hover:text-ink">FAQ</a>
            <Link href="/demo" className="hover:text-ink">Demo</Link>
            <Link href="/terms" className="hover:text-ink">Terms</Link>
            <Link href="/privacy" className="hover:text-ink">Privacy</Link>
            <Link href="/disclaimer" className="hover:text-ink">Disclaimer</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
