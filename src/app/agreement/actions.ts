"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";
import type { Agreement, Order } from "@/lib/types";
import { requireUser } from "@/lib/auth";
import { notifyAdminAgreementSigned } from "@/lib/notifications";
import {
  AGREEMENT_VERSION,
  REQUIRED_KINDS,
  agreementStatus,
  cancellationDeadline,
} from "@/lib/compliance";

export interface AgreementState {
  error?: string;
  message?: string;
}

// Best-effort client IP for the audit trail. Vercel sets x-forwarded-for.
async function clientIp(): Promise<string | null> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return h.get("x-real-ip");
}

// Records the consumer's acceptance of BOTH required artifacts (the CROA
// disclosure + the service agreement) in one signing event, with a typed
// signature and the 3-business-day cancellation deadline stamped on each row.
// This must happen BEFORE any paid service — checkout is gated on it.
export async function acceptAgreement(
  _prev: AgreementState,
  formData: FormData,
): Promise<AgreementState> {
  const user = await requireUser();

  const fullName = (formData.get("full_name") as string | null)?.trim() || "";
  const ackDisclosure = formData.get("ack_disclosure") === "on";
  const ackContract = formData.get("ack_contract") === "on";

  if (fullName.length < 2) {
    return { error: "Type your full legal name to sign." };
  }
  if (!ackDisclosure || !ackContract) {
    return {
      error: "Please confirm you have read both the disclosure and the agreement.",
    };
  }

  const now = new Date();
  const deadline = cancellationDeadline(now);
  const ip = await clientIp();

  const rows = REQUIRED_KINDS.map((kind) => ({
    user_id: user.id,
    kind,
    version: AGREEMENT_VERSION,
    full_name: fullName,
    accepted_at: now.toISOString(),
    cancellation_deadline: deadline.toISOString(),
    ip,
  }));

  const supabase = await createClient();
  const { error } = await supabase.from("agreements").insert(rows);
  if (error) return { error: `Could not record acceptance: ${error.message}` };

  await notifyAdminAgreementSigned(user.email ?? null, fullName);

  revalidatePath("/agreement");
  revalidatePath("/dashboard");
  return {
    message:
      "Agreement signed. You can cancel free of charge until the deadline shown on your dashboard.",
  };
}

// Honors the consumer's 3-business-day right to cancel. Stamps canceled_at on
// every current-version acceptance row (RLS lets a user update their own rows),
// then fully refunds anything they've paid. Cards are charged at checkout, so
// a cancellation inside the window must hand the money back automatically.
export async function cancelAgreement(): Promise<AgreementState> {
  const user = await requireUser();
  const supabase = await createClient();

  // Only inside the window — the server action is callable directly, and it
  // now issues refunds, so the UI hiding the button isn't enough.
  const { data: rows } = await supabase
    .from("agreements")
    .select("*")
    .eq("user_id", user.id);
  if (!agreementStatus((rows as Agreement[] | null) ?? null).cancelable) {
    return {
      error:
        "Your 3-business-day cancellation window has passed. Please contact us to cancel your plan.",
    };
  }

  const { error } = await supabase
    .from("agreements")
    .update({ canceled_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .eq("version", AGREEMENT_VERSION)
    .is("canceled_at", null);
  if (error) return { error: `Could not cancel: ${error.message}` };

  const refund = await refundPaidOrders(user.id);

  revalidatePath("/agreement");
  revalidatePath("/dashboard");
  revalidatePath("/admin");
  if (refund.failed > 0) {
    return {
      message:
        "Your agreement has been canceled. We couldn't process your refund automatically — our team has been alerted and will refund you in full.",
    };
  }
  return {
    message:
      refund.refunded > 0
        ? "Your agreement has been canceled and your payment has been refunded in full. Refunds usually reach your card in 5–10 business days."
        : "Your agreement has been canceled. You have not been charged.",
  };
}

// Full refund of every paid order for this client, marking each canceled.
// The idempotency key makes a double-click or retry safe: Stripe returns the
// original refund instead of issuing a second one.
async function refundPaidOrders(
  userId: string,
): Promise<{ refunded: number; failed: number }> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("orders")
    .select("*")
    .eq("user_id", userId)
    .in("status", ["active", "completed"]);
  const paid = (data as Order[] | null) ?? [];

  let refunded = 0;
  let failed = 0;
  for (const order of paid) {
    if (!order.stripe_payment_intent_id) {
      failed += 1;
      console.error("[cancel] paid order has no payment intent", order.id);
      continue;
    }
    try {
      await getStripe().refunds.create(
        { payment_intent: order.stripe_payment_intent_id },
        { idempotencyKey: `cancel-refund-${order.stripe_payment_intent_id}` },
      );
      await admin
        .from("orders")
        .update({ status: "canceled", updated_at: new Date().toISOString() })
        .eq("id", order.id);
      refunded += 1;
    } catch (err) {
      failed += 1;
      console.error("[cancel] refund failed", order.id, err);
    }
  }
  return { refunded, failed };
}
