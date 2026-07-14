// Central config. Pricing lives here (NOT hardcoded in components) so the
// numbers are a one-line change. Set 2026-06-12 to Joseph's requested drop:
// DIY $39 one-time / Done-For-You $99 per round (he floated "$99 or $129 per
// round" for DFY; took the lower). Update `amountCents` + `interval` here.

export const BRAND = {
  // Brand is "Revenue Credit AI". Kept in one place so the name stays a one-line change.
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
    amountCents: 3900, // $39
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
    amountCents: 9900, // $99 per round
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

// Onboarding-call booking link (Calendly / GoHighLevel / etc). Set this to the
// client's existing calendar URL and a "Book your onboarding call" card appears
// on the client dashboard. Leave empty to hide the card entirely.
export const BOOKING_URL = process.env.NEXT_PUBLIC_BOOKING_URL ?? "";
