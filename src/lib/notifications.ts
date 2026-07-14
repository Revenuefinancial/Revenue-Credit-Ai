// Notification layer (M3). Email via Resend, SMS via Twilio — both over their
// REST APIs (no SDK deps). Every send is a graceful no-op when its credentials
// are absent, so the app builds and runs before the client provides keys.
//
// When Joseph opts for GoHighLevel instead, only these two transport functions
// (sendEmail / sendSMS) need to change — the event helpers below stay the same.

import { BRAND, BOOKING_URL } from "@/lib/config";
import { baseUrl } from "@/lib/url";

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
const appUrl = () => baseUrl();

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
            <tr><td style="padding:28px 40px 8px;"><span style="font-family:${FONT};font-size:19px;font-weight:800;letter-spacing:-.02em;color:#0a1f44;">Revenue Credit <span style="color:#1d4ed8;">AI</span></span></td></tr>
            <tr><td style="padding:6px 40px 0;"><h1 style="margin:0;font-family:${FONT};font-size:23px;line-height:1.25;font-weight:800;color:#0a1f44;">${title}</h1></td></tr>
            <tr><td style="padding:14px 40px 8px;font-family:${FONT};font-size:15px;line-height:1.6;color:#1f2937;">${body}</td></tr>
            <tr><td style="padding:8px 40px 0;"><hr style="border:none;border-top:1px solid #eef1f6;margin:20px 0 0;"></td></tr>
            <tr><td style="padding:16px 40px 30px;font-family:${FONT};font-size:12px;line-height:1.6;color:#64748b;"><strong style="color:#0a1f44;">Revenue Credit AI</strong> · A ${BRAND.parent} company<br><span style="color:#94a3b8;">🔒 Bank-level encryption · Your data is never sold</span></td></tr>
          </table>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

// Welcome email — sent right after signup so a new client isn't met with
// silence. If a booking link is configured, we invite them to book onboarding.
export async function notifyWelcome(to: string | null, fullName?: string | null) {
  if (!to) return;
  const first = fullName?.trim()?.split(" ")[0];
  const bookingCta = BOOKING_URL
    ? `<p style="margin:16px 0 0;"><a href="${BOOKING_URL}" style="display:inline-block;background:#1d4ed8;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:10px;">Book your free onboarding call →</a></p>`
    : "";
  await sendEmail({
    to,
    subject: `Welcome to ${BRAND.name}`,
    html: shell(
      `Welcome${first ? `, ${first}` : ""}`,
      `Your account is ready. Here's how to get started:</p>
       <ol style="margin:8px 0 0;padding-left:20px;color:#1f2937;font-size:15px;line-height:1.7;">
         <li>Review &amp; sign your service agreement (required before any work begins).</li>
         <li>Pull your 3-bureau credit report and upload it.</li>
         <li>We prepare your dispute letters — you track everything from your dashboard.</li>
       </ol>
       <p style="margin:16px 0 0;">Jump in from your <a href="${appUrl()}/dashboard">dashboard</a>.${bookingCta}`,
    ),
  });
}

// ── Admin (operator) alerts ─────────────────────────────────────────────
// Keeps Joseph in the loop without having to keep refreshing the admin panel.
// Sent to ADMIN_NOTIFY_EMAIL; a no-op (logged) if that isn't set.
async function notifyAdmin(subject: string, bodyHtml: string) {
  const to = process.env.ADMIN_NOTIFY_EMAIL;
  if (!to) {
    console.info(`[notify] admin alert skipped (no ADMIN_NOTIFY_EMAIL): "${subject}"`);
    return;
  }
  await sendEmail({ to, subject: `[${BRAND.name}] ${subject}`, html: shell(subject, bodyHtml) });
}

export async function notifyAdminNewSignup(email: string | null, fullName: string | null) {
  await notifyAdmin(
    "New client signed up",
    `<strong>${fullName ?? "A new client"}</strong> (${email ?? "no email"}) just created an account. They'll appear in your <a href="${appUrl()}/admin">admin panel</a> once they sign the agreement or take an action.`,
  );
}

export async function notifyAdminPayment(email: string | null, planName: string) {
  await notifyAdmin(
    "Payment received",
    `${email ?? "A client"} just paid for <strong>${planName}</strong>. Open the <a href="${appUrl()}/admin">admin panel</a> to manage their file.`,
  );
}

export async function notifyAdminReportUploaded(email: string | null) {
  await notifyAdmin(
    "Credit report uploaded",
    `${email ?? "A client"} uploaded a credit report and is ready for dispute letters. Review it in the <a href="${appUrl()}/admin">admin panel</a>.`,
  );
}

export async function notifyAdminAgreementSigned(email: string | null, fullName: string | null) {
  await notifyAdmin(
    "Service agreement signed",
    `<strong>${fullName ?? "A client"}</strong> (${email ?? "no email"}) signed the service agreement. Note the 3-business-day cancel window before billing or starting paid work.`,
  );
}

export async function notifyAdminVerificationUploaded(
  email: string | null,
  categoryLabel: string,
) {
  await notifyAdmin(
    "Verification document uploaded",
    `${email ?? "A client"} uploaded a <strong>${categoryLabel}</strong> for identity verification. Review and approve it in the <a href="${appUrl()}/admin">admin panel</a>.`,
  );
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

// Client-facing review outcomes for an uploaded verification document.
export async function notifyVerificationApproved(
  to: string | null,
  categoryLabel: string,
) {
  if (!to) return;
  await sendEmail({
    to,
    subject: `Your ${categoryLabel} was approved`,
    html: shell(
      "Document approved",
      `Thanks — your <strong>${categoryLabel}</strong> has been verified. You can see the status of all your verification documents anytime in your <a href="${appUrl()}/dashboard">dashboard</a>.`,
    ),
  });
}

export async function notifyVerificationRejected(
  to: string | null,
  categoryLabel: string,
  reason: string | null,
) {
  if (!to) return;
  const why = reason
    ? `<p style="margin:12px 0 0;"><strong>Reason:</strong> ${reason}</p>`
    : "";
  await sendEmail({
    to,
    subject: `Action needed: re-upload your ${categoryLabel}`,
    html: shell(
      "We need a new copy of your document",
      `We couldn't verify your <strong>${categoryLabel}</strong>.${why}
       <p style="margin:12px 0 0;">Please upload a new copy from your <a href="${appUrl()}/dashboard">dashboard</a> — make sure the image is clear, in focus, and shows the whole document.</p>`,
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
