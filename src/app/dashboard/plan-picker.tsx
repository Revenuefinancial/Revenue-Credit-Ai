"use client";

import { useState } from "react";
import { PLANS, formatPrice, type PlanId } from "@/lib/config";

export function PlanPicker() {
  const [loading, setLoading] = useState<PlanId | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function choose(planId: PlanId) {
    setLoading(planId);
    setError(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error ?? "Could not start checkout.");
      }
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setLoading(null);
    }
  }

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2">
        {(Object.values(PLANS) as (typeof PLANS)[PlanId][]).map((plan) => {
          const price = formatPrice(plan);
          return (
            <div
              key={plan.id}
              className={`rounded-2xl border p-5 ${
                plan.featured
                  ? "border-brand bg-brand/[0.03]"
                  : "border-line bg-surface"
              }`}
            >
              <div className="flex items-baseline justify-between">
                <h3 className="font-bold text-ink">{plan.name}</h3>
                {plan.featured && (
                  <span className="rounded-full bg-brand px-2 py-0.5 text-[11px] font-semibold text-white">
                    Popular
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-muted">{plan.tagline}</p>
              <p className="mt-3">
                <span className="text-3xl font-bold text-ink">
                  {price.amount}
                </span>
                <span className="ml-1 text-sm text-muted">{price.unit}</span>
              </p>
              <ul className="mt-4 space-y-1.5 text-sm text-ink-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <span className="text-[var(--rc-green)]">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => choose(plan.id)}
                disabled={loading !== null}
                className={`mt-5 w-full rounded-rc px-4 py-3 font-semibold transition disabled:opacity-60 ${
                  plan.featured
                    ? "bg-brand text-white hover:bg-brand-2"
                    : "bg-ink text-white hover:opacity-90"
                }`}
              >
                {loading === plan.id ? "Redirecting…" : `Choose ${plan.name}`}
              </button>
            </div>
          );
        })}
      </div>
      {error && <p className="mt-3 text-sm text-[var(--rc-red)]">{error}</p>}
    </div>
  );
}
