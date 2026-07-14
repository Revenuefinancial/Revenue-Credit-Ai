"use client";

import { useState } from "react";
import { PLANS, formatPrice } from "@/lib/config";

// Lets an active Done-For-You client pay for the next dispute round. DFY is
// billed per round (a fresh one-time checkout each time), so this reuses the
// same /api/stripe/checkout endpoint with the "dfy" plan.
export function BuyRoundButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const price = formatPrice(PLANS.dfy);

  async function buy() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: "dfy" }),
      });
      const data = await res.json();
      if (data.needsAgreement) {
        window.location.assign("/agreement");
        return;
      }
      if (!res.ok || !data.url) {
        throw new Error(data.error ?? "Could not start checkout.");
      }
      window.location.assign(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-semibold text-ink">
          Ready for your next dispute round?
        </p>
        <p className="mt-1 text-sm text-ink-2">
          Each round is {price.amount} — we draft and certified-mail a fresh set
          of letters, then track the new 35-day bureau clock for you.
        </p>
      </div>
      <button
        onClick={buy}
        disabled={loading}
        className="flex-none rounded-rc bg-brand px-5 py-3 font-semibold text-white transition hover:bg-brand-2 disabled:opacity-60"
      >
        {loading ? "Redirecting…" : `Buy next round · ${price.amount}`}
      </button>
      {error && <p className="text-sm text-[var(--rc-red)]">{error}</p>}
    </div>
  );
}
