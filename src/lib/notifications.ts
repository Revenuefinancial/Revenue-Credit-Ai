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
const appUrl = () => process.env.NEXT_PUBLIC_APP_URL ?? "https://score-logic-pro.vercel.app";

// Branded email shell — mirrors app/emails/render.mjs and globals.css tokens.
// Table layout + inline styles for email-client compatibility.
function shell(title: string, body: string): string {
  const FONT =
    "-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Roboto,Helvetica,Arial,sans-serif";
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="x-apple-disable-message-reformatting"><title>${title}</title></head>
<body style="margin:0;padding:0;background:#f7f8fb;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f7f8fb;">
    <tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="width:560px;max-width:100%;">
        <tr><td style="height:4px;border-radius:14px 14px 0 0;background:#1d4ed8;background-image:linear-gradient(90deg,#1d4ed8 0%,#00bfd8 100%);"></td></tr>
        <tr><td style="background:#ffffff;border:1px solid #e5e9f2;border-top:none;border-radius:0 0 14px 14px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr><td style="padding:28px 40px 8px;"><span style="font-family:${FONT};font-size:19px;font-weight:800;letter-spacing:-.02em;color:#0a1f44;">Score Logic <span style="color:#1d4ed8;">Pro</span></span></td></tr>
            <tr><td style="padding:6px 40px 0;"><h1 style="margin:0;font-family:${FONT};font-size:23px;line-height:1.25;font-weight:800;color:#0a1f44;">${title}</h1></td></tr>
            <tr><td style="padding:14px 40px 8px;font-family:${FONT};font-size:15px;line-height:1.6;color:#1f2937;">${body}</td></tr>
            <tr><td style="padding:8px 40px 0;"><hr style="border:none;border-top:1px solid #eef1f6;margin:20px 0 0;"></td></tr>
            <tr><td style="padding:16px 40px 30px;font-family:${FONT};font-size:12px;line-height:1.6;color:#64748b;"><strong style="color:#0a1f44;">Score Logic Pro</strong> · A ${BRAND.parent} company<br><span style="color:#94a3b8;">🔒 Bank-level encryption · Your data is never sold</span></td></tr>
          </table>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
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
