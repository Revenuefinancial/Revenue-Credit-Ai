import { NextResponse, type NextRequest } from "next/server";
import { getStripe } from "@/lib/stripe";
import { getSessionUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { PLANS, type PlanId } from "@/lib/config";

export const runtime = "nodejs";

const appUrl = () =>
  process.env.NEXT_PUBLIC_APP_URL ?? "https://score-logic-pro.vercel.app";

// Creates a Stripe Checkout Session for the chosen plan and returns its URL.
// Each checkout is a one-time payment (one package / one dispute round). DFY's
// "per round" billing = a fresh checkout per round, so the client is never
// auto-charged for a round that didn't happen. Switch to `mode: "subscription"`
// with a recurring price if Joseph later wants automatic monthly billing.
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let planId: PlanId;
  try {
    const body = await req.json();
    planId = body.planId;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const plan = PLANS[planId];
  if (!plan) {
    return NextResponse.json({ error: "Unknown plan" }, { status: 400 });
  }

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: user.email ?? undefined,
    client_reference_id: user.id,
    metadata: { user_id: user.id, plan_id: plan.id },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: plan.amountCents,
          product_data: { name: plan.name, description: plan.tagline },
        },
      },
    ],
    success_url: `${appUrl()}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl()}/checkout/cancel`,
  });

  // Record a pending order so abandoned checkouts are also visible to admin.
  // Service-role client: orders are written server-side only.
  const admin = createAdminClient();
  await admin.from("orders").insert({
    user_id: user.id,
    plan_id: plan.id,
    status: "pending",
    amount_cents: plan.amountCents,
    interval: plan.interval,
    stripe_checkout_session_id: session.id,
  });

  return NextResponse.json({ url: session.url });
}
