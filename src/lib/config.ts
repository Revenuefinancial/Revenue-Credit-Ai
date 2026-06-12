// Central config. Pricing lives here (NOT hardcoded in components) because
// the final numbers are unconfirmed with the client. Joseph's mockup showed
// DIY $49 one-time / Done-For-You $149 per round, but he later asked about
// "$99 or $129 per round" — so treat these as placeholders until confirmed.
// Update `amountCents` + `interval` in one place when the real prices land.

export const BRAND = {
  // Brand consolidated to "Revenue Credit AI" (contract title was "Score Logic Pro").
  // Kept in one place so the name stays a one-line change.
  name: "Revenue Credit AI",
  parent: "Revenue Financial Services",
  supportEmail: "support@revenuecreditai.com",
} as const;

export type PlanId = "diy" | "dfy";

export interface Plan {
  id: PlanId;
  name: string;
  tagline: string;
  amountCents: number; // PLACEHOLDER — confirm with client
  interval: "one_time" | "per_round";
  featured?: boolean;
  features: string[];
}

export const PLANS: Record<PlanId, Plan> = {
  diy: {
    id: "diy",
    name: "DIY Credit Repair",
    tagline: "Generate. Print. Mail yourself.",
    amountCents: 4900, // $49 placeholder
    interval: "one_time",
    features: [
      "AI-drafted dispute letters · all 3 bureaus",
      "Unlimited revisions for 30 days",
      "Mailing instructions + envelope templates",
      "Live dashboard tracking",
      "Email support",
    ],
  },
  dfy: {
    id: "dfy",
    name: "Done-For-You",
    tagline: "We mail certified. You watch the score climb.",
    amountCents: 14900, // $149 placeholder
    interval: "per_round",
    featured: true,
    features: [
      "Everything in DIY",
      "Certified mail with USPS tracking",
      "Automatic follow-up rounds",
      "Direct bureau response uploads",
      "SMS + email progress alerts",
      "Priority chat support",
    ],
  },
} as const;

export function formatPrice(plan: Plan): { amount: string; unit: string } {
  return {
    amount: `$${(plan.amountCents / 100).toFixed(0)}`,
    unit: plan.interval === "one_time" ? "one-time" : "per round",
  };
}

export const SMARTCREDIT_URL =
  process.env.NEXT_PUBLIC_SMARTCREDIT_URL ??
  "https://www.smartcredit.com/?PID=98507";
