"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { notifyAdminAgreementSigned } from "@/lib/notifications";
import {
  AGREEMENT_VERSION,
  REQUIRED_KINDS,
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
// every current-version acceptance row. RLS lets a user update their own rows.
export async function cancelAgreement(): Promise<AgreementState> {
  const user = await requireUser();
  const supabase = await createClient();

  const { error } = await supabase
    .from("agreements")
    .update({ canceled_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .eq("version", AGREEMENT_VERSION)
    .is("canceled_at", null);
  if (error) return { error: `Could not cancel: ${error.message}` };

  revalidatePath("/agreement");
  revalidatePath("/dashboard");
  return { message: "Your agreement has been canceled. You have not been charged." };
}
