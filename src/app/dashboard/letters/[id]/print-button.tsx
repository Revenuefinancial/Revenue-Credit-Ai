"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-rc bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-2 print:hidden"
    >
      🖨 Print / Save as PDF
    </button>
  );
}
