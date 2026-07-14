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
import { type Step, tourFor } from "@/lib/tours";

export function HelpButton() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false); // help panel
  const [step, setStep] = useState<number | null>(null); // active tour step
  const [rect, setRect] = useState<DOMRect | null>(null);

  const tour = tourFor(pathname);
  const onDemo = pathname.startsWith("/demo");

  // Reset on navigation, OR auto-launch the tour when the admin Tutorials hub
  // sends us here with `?tour=start`. We read the query off window rather than
  // useSearchParams to avoid the Suspense requirement that hook carries here.
  // Intentional reset-on-navigation: we sync UI state to an external event
  // (the route), so the setState here is deliberate, not a derived-state smell.
  useEffect(() => {
    const wantsTour =
      new URLSearchParams(window.location.search).get("tour") === "start";
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: sync tour state to the route / ?tour=start
    setOpen(false);
    setStep(wantsTour && tourFor(window.location.pathname) ? 0 : null);
  }, [pathname]);

  // Let any "View tutorial" button on the page launch the tour. If the current
  // page has a tour, start it; otherwise open the help panel so the user still
  // gets the guides.
  useEffect(() => {
    const handler = () => {
      if (tourFor(window.location.pathname)) {
        setOpen(false);
        setStep(0);
      } else {
        setOpen(true);
      }
    };
    window.addEventListener("rc:start-tour", handler);
    return () => window.removeEventListener("rc:start-tour", handler);
  }, []);

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
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clears measurement when no step is active
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
              {/* Narrated walkthrough video */}
              <div className="mb-6">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                  Watch the walkthrough
                </p>
                <video
                  src="/tutorial.mp4"
                  controls
                  playsInline
                  preload="metadata"
                  className="w-full rounded-2xl border border-line shadow-sm"
                />
              </div>

              {tour ? (
                <>
                  <h3 className="text-base font-bold text-ink">{tour.label}</h3>
                  <p className="mt-1 text-sm text-muted">{tour.blurb}</p>
                  <button
                    onClick={startTour}
                    className="mt-4 w-full rounded-rc bg-brand px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-2"
                  >
                    ▶ View tutorial
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
