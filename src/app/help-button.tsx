"use client";

// Global help launcher + guided spotlight tour.
// Rendered once in the root layout, appears on every page.
// - Floating "?" launcher (bottom-right, clear of every page's top nav).
// - Slide-over panel: per-page "what's on this page" + quick links
//   (Take a tour, View demo, How it works, Email support).
// - Spotlight tour engine: dims the page and highlights real elements
//   one step at a time. Steps target existing CSS selectors; if a target
//   isn't on the page, the step shows as a centered card instead.
//
// Dependency-free: inline styles + Tailwind classes, no tour library.

import { useEffect, useLayoutEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type Step = {
  // CSS selector for the element to spotlight. Optional — when missing or
  // not found, the step renders as a centered card.
  sel?: string;
  title: string;
  body: string;
};

type Tour = {
  label: string; // shown on the "Take a tour" button + panel heading
  blurb: string; // one-line description of the page
  steps: Step[];
};

// Per-page tours. Keyed by pathname; `/admin/...` falls back to `/admin`.
const TOURS: Record<string, Tour> = {
  "/": {
    label: "Tour the homepage",
    blurb: "The public landing page new clients see first.",
    steps: [
      {
        sel: "nav",
        title: "Top navigation",
        body: "Jump to How it works, Pricing, or Success stories. ‘Sign in’ is for returning clients; ‘Free score check’ starts a new account.",
      },
      {
        sel: "header h1",
        title: "The promise",
        body: "The headline sets the expectation: upload a report, get AI-drafted dispute letters, choose DIY or Done-For-You.",
      },
      {
        sel: "header aside",
        title: "Projected-score preview",
        body: "An illustrative score projection. It is a marketing preview — real projections appear inside a client’s dashboard after they upload.",
      },
      {
        sel: "#how",
        title: "How it works",
        body: "The three-step explainer: pull your report, AI drafts disputes, mail it your way.",
      },
      {
        sel: "#pricing",
        title: "Pricing",
        body: "Two plans — DIY (one-time) and Done-For-You (per round). Clicking a plan sends them into signup with that plan pre-selected.",
      },
    ],
  },
  "/dashboard": {
    label: "Tour the dashboard",
    blurb: "Where a logged-in client manages their credit repair.",
    steps: [
      {
        sel: '[data-tour="plan"]',
        title: "Choose a plan",
        body: "Until a plan is active, the client picks DIY or Done-For-You here. Once paid, this section disappears.",
      },
      {
        sel: '[data-tour="step1"]',
        title: "Step 1 — Pull the report",
        body: "‘Pull my report’ opens our SmartCredit partner link in a new tab so the client can pull all three bureaus.",
      },
      {
        sel: '[data-tour="step2"]',
        title: "Step 2 — Upload the report",
        body: "The client uploads the PDF they just pulled. Uploaded reports list here with a download link.",
      },
      {
        sel: '[data-tour="step3"]',
        title: "Step 3 — Dispute letters",
        body: "Once the team approves a client’s AI-drafted letters, they appear here to view and print, round by round.",
      },
    ],
  },
  "/admin": {
    label: "Tour the admin panel",
    blurb: "Your team’s view of every client and their files.",
    steps: [
      {
        sel: '[data-tour="stats"]',
        title: "At-a-glance stats",
        body: "Total clients, reports uploaded, and paid revenue across the whole platform.",
      },
      {
        sel: '[data-tour="clients"]',
        title: "Client table",
        body: "Every client with their plan, status, report/letter counts, and what they’ve paid. Click ‘Manage →’ to open one client.",
      },
    ],
  },
  "/how-it-works": {
    label: "Tour this guide",
    blurb: "A plain-English walkthrough of the whole platform.",
    steps: [
      {
        sel: '[data-tour="hiw-client"]',
        title: "The client journey",
        body: "Everything a client does, in order: sign up, pick a plan, pull and upload their report, then download finished letters.",
      },
      {
        sel: '[data-tour="hiw-admin"]',
        title: "Your journey",
        body: "What you do behind the scenes: open a client, let the AI draft their letters, review and approve each one — clients are notified automatically.",
      },
    ],
  },
};

function tourFor(pathname: string): Tour | null {
  if (TOURS[pathname]) return TOURS[pathname];
  if (pathname.startsWith("/admin")) return TOURS["/admin"];
  return null;
}

export function HelpButton() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false); // help panel
  const [step, setStep] = useState<number | null>(null); // active tour step
  const [rect, setRect] = useState<DOMRect | null>(null);

  const tour = tourFor(pathname);
  const onDemo = pathname.startsWith("/demo");

  // Close everything when the route changes.
  useEffect(() => {
    setOpen(false);
    setStep(null);
  }, [pathname]);

  // Lock body scroll while a tour overlay is up.
  useEffect(() => {
    if (step === null) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [step]);

  // Measure the current step's target element.
  useLayoutEffect(() => {
    if (step === null || !tour) {
      setRect(null);
      return;
    }
    const sel = tour.steps[step]?.sel;
    const measure = () => {
      if (!sel) {
        setRect(null);
        return;
      }
      const el = document.querySelector(sel) as HTMLElement | null;
      if (!el) {
        setRect(null);
        return;
      }
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      // Re-measure after the scroll settles.
      requestAnimationFrame(() =>
        setRect(el.getBoundingClientRect()),
      );
      setRect(el.getBoundingClientRect());
    };
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [step, tour]);

  function startTour() {
    setOpen(false);
    setStep(0);
  }
  function next() {
    if (!tour || step === null) return;
    if (step >= tour.steps.length - 1) setStep(null);
    else setStep(step + 1);
  }
  function prev() {
    if (step === null) return;
    setStep(step > 0 ? step - 1 : 0);
  }

  // ── Spotlight tour overlay ──────────────────────────────────────────
  const overlay =
    step !== null && tour ? (
      <TourOverlay
        rect={rect}
        step={tour.steps[step]}
        index={step}
        total={tour.steps.length}
        onNext={next}
        onPrev={prev}
        onClose={() => setStep(null)}
      />
    ) : null;

  return (
    <>
      {/* Floating launcher */}
      <button
        type="button"
        aria-label="Help and platform tour"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-50 flex h-12 items-center gap-2 rounded-full bg-brand pl-3 pr-4 text-white shadow-[0_10px_30px_-8px_rgba(29,78,216,0.6)] transition hover:bg-brand-2"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-lg font-bold">
          ?
        </span>
        <span className="text-sm font-semibold">Help</span>
      </button>

      {/* Slide-over help panel */}
      {open && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
          <div
            className="absolute inset-0 bg-ink/40"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute right-0 top-0 flex h-full w-full max-w-sm flex-col bg-surface shadow-2xl">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <span className="font-mono text-sm font-semibold text-brand">
                Help &amp; Tour
              </span>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close help"
                className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-line-soft hover:text-ink"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5">
              {tour ? (
                <>
                  <h3 className="text-base font-bold text-ink">{tour.label}</h3>
                  <p className="mt-1 text-sm text-muted">{tour.blurb}</p>
                  <button
                    onClick={startTour}
                    className="mt-4 w-full rounded-rc bg-brand px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-2"
                  >
                    ▶ Start the tour
                  </button>
                  <ol className="mt-5 space-y-2">
                    {tour.steps.map((s, i) => (
                      <li
                        key={i}
                        className="flex gap-3 rounded-xl border border-line bg-bg px-3 py-2.5 text-sm"
                      >
                        <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-brand/10 text-xs font-bold text-brand">
                          {i + 1}
                        </span>
                        <span>
                          <span className="font-semibold text-ink">
                            {s.title}
                          </span>
                          <span className="mt-0.5 block text-xs text-muted">
                            {s.body}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ol>
                </>
              ) : (
                <>
                  <h3 className="text-base font-bold text-ink">
                    {onDemo ? "You're in the demo" : "Need a hand?"}
                  </h3>
                  <p className="mt-1 text-sm text-muted">
                    {onDemo
                      ? "This is a no-login demo with sample data. Use the buttons below to explore or jump to the real app."
                      : "Use the guides below to explore everything the platform does."}
                  </p>
                </>
              )}

              <div className="mt-6 border-t border-line pt-5">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                  Explore
                </p>
                <div className="space-y-2">
                  <PanelLink href="/demo" emoji="🖥️">
                    View the interactive demo
                  </PanelLink>
                  <PanelLink href="/how-it-works" emoji="📘">
                    How it works (full guide)
                  </PanelLink>
                  <PanelLink
                    href="mailto:support@revenuecreditai.com"
                    emoji="✉️"
                    external
                  >
                    Email support
                  </PanelLink>
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}

      {overlay}
    </>
  );
}

function PanelLink({
  href,
  emoji,
  external,
  children,
}: {
  href: string;
  emoji: string;
  external?: boolean;
  children: React.ReactNode;
}) {
  const cls =
    "flex items-center gap-3 rounded-xl border border-line px-3 py-3 text-sm font-medium text-ink transition hover:border-brand hover:bg-line-soft";
  if (external) {
    return (
      <a href={href} className={cls}>
        <span>{emoji}</span>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={cls}>
      <span>{emoji}</span>
      {children}
    </Link>
  );
}

// ── Spotlight overlay ────────────────────────────────────────────────
function TourOverlay({
  rect,
  step,
  index,
  total,
  onNext,
  onPrev,
  onClose,
}: {
  rect: DOMRect | null;
  step: Step;
  index: number;
  total: number;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
}) {
  const pad = 8;
  const hasSpot = !!rect;

  // Spotlight box: a transparent ring with a giant box-shadow that dims
  // everything around it.
  const spot = rect
    ? {
        top: rect.top - pad,
        left: rect.left - pad,
        width: rect.width + pad * 2,
        height: rect.height + pad * 2,
      }
    : null;

  // Place the tooltip below the target when there's room, else above.
  let cardStyle: React.CSSProperties;
  if (spot) {
    const below = spot.top + spot.height + 14;
    const placeBelow = below + 180 < window.innerHeight;
    cardStyle = {
      position: "fixed",
      top: placeBelow ? below : undefined,
      bottom: placeBelow
        ? undefined
        : window.innerHeight - spot.top + 14,
      left: Math.min(
        Math.max(spot.left, 16),
        window.innerWidth - 360,
      ),
      width: 340,
    };
  } else {
    cardStyle = {
      position: "fixed",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      width: 360,
    };
  }

  return (
    <div className="fixed inset-0 z-[60]">
      {/* Dimmer — either a full sheet (no target) or the spotlight ring. */}
      {hasSpot ? (
        <div
          onClick={onClose}
          style={{
            position: "fixed",
            top: spot!.top,
            left: spot!.left,
            width: spot!.width,
            height: spot!.height,
            borderRadius: 12,
            boxShadow:
              "0 0 0 9999px rgba(10,31,68,0.62), 0 0 0 2px rgba(255,255,255,0.9)",
            pointerEvents: "none",
            transition: "all .25s ease",
          }}
        />
      ) : (
        <div
          onClick={onClose}
          className="absolute inset-0 bg-ink/60"
        />
      )}

      {/* Tooltip card */}
      <div
        style={cardStyle}
        className="rounded-2xl border border-line bg-surface p-5 shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-brand">
            Step {index + 1} of {total}
          </span>
          <button
            onClick={onClose}
            aria-label="End tour"
            className="text-muted hover:text-ink"
          >
            ✕
          </button>
        </div>
        <h4 className="mt-2 text-base font-bold text-ink">{step.title}</h4>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-2">
          {step.body}
        </p>
        <div className="mt-4 flex items-center justify-between">
          <button
            onClick={onPrev}
            disabled={index === 0}
            className="text-sm font-medium text-muted disabled:opacity-40 hover:text-ink"
          >
            ← Back
          </button>
          <div className="flex gap-1.5">
            {Array.from({ length: total }).map((_, i) => (
              <span
                key={i}
                className={`h-1.5 w-1.5 rounded-full ${
                  i === index ? "bg-brand" : "bg-line"
                }`}
              />
            ))}
          </div>
          <button
            onClick={onNext}
            className="rounded-rc bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-2"
          >
            {index >= total - 1 ? "Done" : "Next →"}
          </button>
        </div>
      </div>
    </div>
  );
}
