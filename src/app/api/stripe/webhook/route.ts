import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { PLANS, type PlanId } from "@/lib/config";
import { notifyPaymentSuccess, notifyAdminPayment } from "@/lib/notifications";

export const runtime = "nodejs";

// Stripe needs the raw, unparsed body to verify the signature, so we read
// req.text() and never req.json() here.
export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 },
    );
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const body = await req.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const admin = createAdminClient();

    const planId = session.metadata?.plan_id as PlanId | undefined;
    const planName = planId ? PLANS[planId]?.name : "your plan";

    await admin
      .from("orders")
      .update({
        status: "active",
        stripe_customer_id:
          typeof session.customer === "string" ? session.customer : null,
        stripe_payment_intent_id:
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : null,
        updated_at: new Date().toISOString(),
      })
      .eq("stripe_checkout_session_id", session.id);

    const email = session.customer_details?.email ?? session.customer_email;
    await notifyPaymentSuccess(email ?? null, planName ?? "your plan");
    await notifyAdminPayment(email ?? null, planName ?? "your plan");
  }

  return NextResponse.json({ received: true });
}
