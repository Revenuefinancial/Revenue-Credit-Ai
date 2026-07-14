"use client";

// A labeled launcher for the guided spotlight tour. The tour engine lives in
// the global HelpButton (rendered once in the root layout); this button just
// fires the `rc:start-tour` event it listens for. Decoupled on purpose so the
// tour can be triggered from anywhere without prop-drilling.

export function ViewTutorialButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent("rc:start-tour"))}
      className={
        className ??
        "rounded-[12px] border border-brand bg-surface px-6 py-3 font-semibold text-brand transition hover:bg-brand hover:text-white"
      }
    >
      ▶ View tutorial
    </button>
  );
}
