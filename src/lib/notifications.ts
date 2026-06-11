// Notification layer (M3). Email via Resend, SMS via Twilio — both over their
// REST APIs (no SDK deps). Every send is a graceful no-op when its credentials
// are absent, so the app builds and runs before the client provides keys.
//
// When Joseph opts for GoHighLevel instead, only these two transport functions
// (sendEmail / sendSMS) need to change — the event helpers below stay the same.

import { BRAND } from "@/lib/config";

interface EmailArgs {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: EmailArgs): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM ?? `${BRAND.name} <noreply@example.com>`;
  if (!apiKey) {
    console.info(`[notify] email skipped (no RESEND_API_KEY): "${subject}" -> ${to}`);
    return;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to, subject, html }),
    });
    if (!res.ok) {
      console.error(`[notify] resend failed (${res.status}): ${await res.text()}`);
    }
  } catch (err) {
    console.error("[notify] resend error", err);
  }
}

interface SMSArgs {
  to: string;
  body: string;
}

export async function sendSMS({ to, body }: SMSArgs): Promise<void> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM;
  if (!sid || !token || !from) {
    console.info(`[notify] sms skipped (no Twilio creds) -> ${to}`);
    return;
  }
  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ To: to, From: from, Body: body }).toString(),
      },
    );
    if (!res.ok) {
      console.error(`[notify] twilio failed (${res.status}): ${await res.text()}`);
    }
  } catch (err) {
    console.error("[notify] twilio error", err);
  }
}

// ── Event helpers (called from server actions / webhook) ────────────────
const appUrl = () => process.env.NEXT_PUBLIC_APP_URL ?? "https://rca-flame.vercel.app";

function shell(title: string, body: string): string {
  return `<div style="font-family:Inter,system-ui,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#0a1f44">
    <h2 style="color:#0a1f44;margin:0 0 12px">${title}</h2>
    <div style="font-size:15px;line-height:1.6;color:#1f2937">${body}</div>
    <p style="margin-top:24px;font-size:13px;color:#64748b">${BRAND.name} · ${BRAND.parent}</p>
  </div>`;
}

export async function notifyReportReceived(to: string | null) {
  if (!to) return;
  await sendEmail({
    to,
    subject: `We received your credit report`,
    html: shell(
      "Credit report received",
      `Thanks for uploading your credit report. Our team is reviewing it now and will prepare your dispute letters. You can track progress anytime in your <a href="${appUrl()}/dashboard">dashboard</a>.`,
    ),
  });
}

export async function notifyPaymentSuccess(to: string | null, planName: string) {
  if (!to) return;
  await sendEmail({
    to,
    subject: `Payment confirmed — ${planName}`,
    html: shell(
      "Payment confirmed",
      `Your ${planName} plan is active. Next step: upload your credit report (if you haven't yet) from your <a href="${appUrl()}/dashboard">dashboard</a> so we can get started.`,
    ),
  });
}

export async function notifyLetterReady(to: string | null, phone: string | null) {
  if (to) {
    await sendEmail({
      to,
      subject: `Your dispute letter is ready`,
      html: shell(
        "Your dispute letter is ready",
        `A new dispute letter has been added to your account. Sign in to your <a href="${appUrl()}/dashboard">dashboard</a> to view and download it.`,
      ),
    });
  }
  if (phone) {
    await sendSMS({
      to: phone,
      body: `${BRAND.name}: your dispute letter is ready. View it in your dashboard: ${appUrl()}/dashboard`,
    });
  }
}
