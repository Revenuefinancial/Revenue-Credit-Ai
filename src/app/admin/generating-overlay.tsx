"use client";

import { useEffect, useState } from "react";

// Stepped status messages shown while the AI drafts the letters. The real
// server action is a single ~40s call, so we narrate the work on a timer to
// reassure the user it's actually running. Each step shows for ~1.9s; the
// final step holds (shimmering) until generation actually completes.
const STEPS = [
  "Securely opening the credit report",
  "Scanning Equifax, Experian & TransUnion",
  "Identifying disputable accounts & inquiries",
  "Cross-checking against FCRA §611 criteria",
  "Drafting the Equifax dispute letter",
  "Drafting the Experian dispute letter",
  "Drafting the TransUnion dispute letter",
  "Formatting & final review",
];

const STEP_MS = 1900;

export function GeneratingOverlay() {
  const [step, setStep] = useState(0);
  const [pct, setPct] = useState(4);

  useEffect(() => {
    const stepTimer = setInterval(() => {
      setStep((s) => (s < STEPS.length - 1 ? s + 1 : s));
    }, STEP_MS);
    // Ease the progress bar toward ~94% and hold (real completion unmounts us)
    const barTimer = setInterval(() => {
      setPct((p) => (p < 94 ? p + (94 - p) * 0.08 : p));
    }, 400);
    return () => {
      clearInterval(stepTimer);
      clearInterval(barTimer);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm">
      <div className="rc-beam-border w-full max-w-md overflow-hidden rounded-2xl bg-surface p-7 shadow-[0_30px_80px_-30px_rgba(10,31,68,0.5)]">
        {/* Header */}
        <div className="flex items-center gap-3">
          <span className="relative flex h-10 w-10 flex-none items-center justify-center rounded-full bg-brand/10">
            <span className="absolute h-10 w-10 animate-spin rounded-full border-2 border-brand/30 border-t-brand" />
            <span className="text-lg">✨</span>
          </span>
          <div>
            <h3 className="text-base font-bold text-ink">
              Drafting dispute letters
            </h3>
            <p className="text-xs text-muted">
              Reading the report — this takes up to a minute.
            </p>
          </div>
        </div>

        {/* Active step (shimmering) */}
        <p
          key={step}
          className="rc-fade-up mt-5 text-sm font-semibold"
        >
          <span className="rc-shimmer">{STEPS[step]}…</span>
        </p>

        {/* Progress bar */}
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-line">
          <div
            className="h-full rounded-full bg-linear-to-r from-cyan to-brand transition-[width] duration-500 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Checklist */}
        <ul className="mt-5 space-y-2">
          {STEPS.map((label, i) => {
            const done = i < step;
            const active = i === step;
            return (
              <li
                key={label}
                className={`flex items-center gap-2.5 text-sm transition-colors ${
                  done
                    ? "text-ink-2"
                    : active
                      ? "text-ink"
                      : "text-muted/50"
                }`}
              >
                <span
                  className={`flex h-4 w-4 flex-none items-center justify-center rounded-full text-[10px] font-bold ${
                    done
                      ? "bg-success text-white"
                      : active
                        ? "bg-brand text-white"
                        : "bg-line text-transparent"
                  }`}
                >
                  {done ? "✓" : active ? "" : "•"}
                </span>
                <span className="truncate">{label}</span>
              </li>
            );
          })}
        </ul>

        <p className="mt-6 rounded-lg bg-line-soft px-3 py-2 text-center text-xs text-muted">
          Nothing is sent to the client — every letter arrives as a draft for
          you to review and approve.
        </p>
      </div>
    </div>
  );
}
