// Single source of truth for every Score Logic Pro email.
// Pure string templating (no deps) so it can be used by:
//   - generate.mjs  -> writes paste-ready Supabase templates + standalone previews
//   - send-test.mjs -> emails every design to a test inbox via Resend
//   - the app (notifications.ts mirrors this shell for transactional sends)
//
// Email HTML rules honored here: table layout, inline styles, web-safe
// fallbacks, a bulletproof-ish button. Brand tokens mirror app/src/app/globals.css.

export const BRAND = {
  name: "Score Logic Pro",
  parent: "Revenue Financial Services",
  // Sending + contact address on the verified domain (revenuecreditai.com).
  supportEmail: "revenue@revenuecreditai.com",
  // Production app URL — used for links in preview/test renders.
  appUrl: "https://score-logic-pro.vercel.app",
};

const C = {
  bg: "#f7f8fb",
  surface: "#ffffff",
  ink: "#0a1f44",
  ink2: "#1f2937",
  muted: "#64748b",
  line: "#e5e9f2",
  lineSoft: "#eef1f6",
  blue: "#1d4ed8",
  blue2: "#2563eb",
  cyan: "#00bfd8",
  green: "#10b981",
  amber: "#f59e0b",
};

const FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Roboto,Helvetica,Arial,sans-serif";

// ── Bulletproof CTA button ────────────────────────────────────────────
function button(label, href) {
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 4px">
    <tr>
      <td align="center" bgcolor="${C.blue}" style="border-radius:10px;">
        <a href="${href}"
           style="display:inline-block;padding:14px 28px;font-family:${FONT};font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px;background:${C.blue};">
          ${label}
        </a>
      </td>
    </tr>
  </table>`;
}

// ── Outer shell ───────────────────────────────────────────────────────
// opts.preheader   - hidden inbox preview text
// opts.eyebrow     - small label above the title (e.g. "Security", "Payment")
// opts.eyebrowColor- accent color for the eyebrow dot
export function shell({ title, body, preheader = "", eyebrow = "", eyebrowColor = C.blue }) {
  const eyebrowHtml = eyebrow
    ? `<tr><td style="padding:0 40px;">
         <span style="display:inline-block;font-family:${FONT};font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:${C.muted};">
           <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${eyebrowColor};vertical-align:middle;margin-right:7px;"></span>${eyebrow}
         </span>
       </td></tr>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<title>${title}</title>
</head>
<body style="margin:0;padding:0;background:${C.bg};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;font-size:1px;line-height:1px;color:${C.bg};">${preheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.bg};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="width:560px;max-width:100%;">

          <!-- Brand bar -->
          <tr><td style="height:4px;background:${C.blue};border-radius:14px 14px 0 0;background-image:linear-gradient(90deg,${C.blue} 0%,${C.cyan} 100%);"></td></tr>

          <!-- Card -->
          <tr>
            <td style="background:${C.surface};border:1px solid ${C.line};border-top:none;border-radius:0 0 14px 14px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">

                <!-- Logo / wordmark -->
                <tr>
                  <td style="padding:28px 40px 8px;">
                    <span style="font-family:${FONT};font-size:19px;font-weight:800;letter-spacing:-.02em;color:${C.ink};">
                      Score Logic <span style="color:${C.blue};">Pro</span>
                    </span>
                  </td>
                </tr>

                ${eyebrowHtml}

                <!-- Title -->
                <tr>
                  <td style="padding:6px 40px 0;">
                    <h1 style="margin:0;font-family:${FONT};font-size:23px;line-height:1.25;font-weight:800;color:${C.ink};">${title}</h1>
                  </td>
                </tr>

                <!-- Body -->
                <tr>
                  <td style="padding:14px 40px 8px;font-family:${FONT};font-size:15px;line-height:1.6;color:${C.ink2};">
                    ${body}
                  </td>
                </tr>

                <!-- Footer -->
                <tr><td style="padding:8px 40px 0;"><hr style="border:none;border-top:1px solid ${C.lineSoft};margin:20px 0 0;"></td></tr>
                <tr>
                  <td style="padding:16px 40px 30px;font-family:${FONT};font-size:12px;line-height:1.6;color:${C.muted};">
                    <strong style="color:${C.ink};">${BRAND.name}</strong> · A ${BRAND.parent} company<br>
                    Need help? <a href="mailto:${BRAND.supportEmail}" style="color:${C.blue2};text-decoration:none;">${BRAND.supportEmail}</a><br>
                    <span style="color:#94a3b8;">🔒 Bank-level encryption · Your data is never sold</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:16px 8px 0;font-family:${FONT};font-size:11px;line-height:1.5;color:#94a3b8;text-align:center;">
              You're receiving this because you have an account with ${BRAND.name}.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

const p = (s) => `<p style="margin:0 0 14px;">${s}</p>`;
const muted = (s) =>
  `<p style="margin:14px 0 0;font-size:13px;color:${C.muted};">${s}</p>`;

// ── AUTH EMAILS ───────────────────────────────────────────────────────
// `link` is either a real URL (previews/tests) or a Supabase variable
// like {{ .ConfirmationURL }} when generating dashboard templates.

export function confirmSignup(link) {
  return shell({
    title: "Confirm your email address",
    preheader: "One click confirms your Score Logic Pro account.",
    eyebrow: "Welcome",
    eyebrowColor: C.green,
    body:
      p("Thanks for creating your Score Logic Pro account. Confirm your email address to activate it and start repairing your credit.") +
      button("Confirm my email", link) +
      muted("This link expires in 24 hours. If you didn't create an account, you can safely ignore this email."),
  });
}

export function resetPassword(link) {
  return shell({
    title: "Reset your password",
    preheader: "Reset your Score Logic Pro password.",
    eyebrow: "Security",
    eyebrowColor: C.amber,
    body:
      p("We received a request to reset the password for your Score Logic Pro account. Click below to choose a new one.") +
      button("Reset password", link) +
      muted("This link expires in 1 hour. If you didn't request a reset, ignore this email — your password won't change."),
  });
}

export function magicLink(link) {
  return shell({
    title: "Your sign-in link",
    preheader: "Sign in to Score Logic Pro.",
    eyebrow: "Security",
    eyebrowColor: C.blue,
    body:
      p("Click below to sign in to your Score Logic Pro account. No password needed.") +
      button("Sign in", link) +
      muted("This link expires in 1 hour and can only be used once. If you didn't request it, ignore this email."),
  });
}

export function changeEmail(link) {
  return shell({
    title: "Confirm your new email address",
    preheader: "Confirm the email change on your account.",
    eyebrow: "Security",
    eyebrowColor: C.amber,
    body:
      p("You requested to change the email address on your Score Logic Pro account. Confirm this new address to finish the change.") +
      button("Confirm new email", link) +
      muted("If you didn't request this, contact us immediately at " + BRAND.supportEmail + "."),
  });
}

export function reauthentication(token) {
  return shell({
    title: "Your verification code",
    preheader: "Your Score Logic Pro verification code.",
    eyebrow: "Security",
    eyebrowColor: C.blue,
    body:
      p("Enter this code to confirm it's you:") +
      `<div style="margin:6px 0 6px;font-family:${FONT};font-size:32px;font-weight:800;letter-spacing:.18em;color:${C.ink};">${token}</div>` +
      muted("This code expires shortly. If you didn't request it, ignore this email."),
  });
}

// ── TRANSACTIONAL EMAILS (Resend, mirrors notifications.ts) ───────────

export function welcome(dashboardUrl) {
  return shell({
    title: "Welcome to Score Logic Pro",
    preheader: "Your account is ready — here's your first step.",
    eyebrow: "Welcome",
    eyebrowColor: C.green,
    body:
      p("Your account is confirmed and ready. Here's how to get started:") +
      `<ol style="margin:0 0 14px;padding-left:20px;color:${C.ink2};">
         <li style="margin-bottom:6px;">Pull your free 3-bureau credit report.</li>
         <li style="margin-bottom:6px;">Upload it to your dashboard.</li>
         <li>We'll prepare your AI-drafted dispute letters.</li>
       </ol>` +
      button("Go to my dashboard", dashboardUrl),
  });
}

export function reportReceived(dashboardUrl) {
  return shell({
    title: "We received your credit report",
    preheader: "Our team is reviewing your report now.",
    eyebrow: "Update",
    eyebrowColor: C.blue,
    body:
      p("Thanks for uploading your credit report. Our team is reviewing it now and will prepare your dispute letters.") +
      button("Track progress", dashboardUrl) +
      muted("You can check your status anytime from your dashboard."),
  });
}

export function paymentConfirmed(planName, dashboardUrl) {
  return shell({
    title: "Payment confirmed",
    preheader: `Your ${planName} plan is active.`,
    eyebrow: "Payment",
    eyebrowColor: C.green,
    body:
      p(`Your <strong>${planName}</strong> plan is active. Next step: upload your credit report (if you haven't yet) so we can get started.`) +
      button("Upload my report", dashboardUrl),
  });
}

export function letterReady(dashboardUrl) {
  return shell({
    title: "Your dispute letter is ready",
    preheader: "A new dispute letter is in your account.",
    eyebrow: "Update",
    eyebrowColor: C.green,
    body:
      p("A new dispute letter has been added to your account. Sign in to view and download it.") +
      button("View my letter", dashboardUrl),
  });
}

// Registry used by generate.mjs and send-test.mjs.
// `supabaseVar` drives the dashboard template; `previewLink` drives test sends.
const D = BRAND.appUrl + "/dashboard";
export const EMAILS = [
  { key: "confirm-signup", subject: "Confirm your email address", supabaseVar: "{{ .ConfirmationURL }}", render: confirmSignup, kind: "auth" },
  { key: "reset-password", subject: "Reset your password", supabaseVar: "{{ .ConfirmationURL }}", render: resetPassword, kind: "auth" },
  { key: "magic-link", subject: "Your sign-in link", supabaseVar: "{{ .ConfirmationURL }}", render: magicLink, kind: "auth" },
  { key: "change-email", subject: "Confirm your new email address", supabaseVar: "{{ .ConfirmationURL }}", render: changeEmail, kind: "auth" },
  { key: "reauthentication", subject: "Your verification code", supabaseVar: "{{ .Token }}", render: reauthentication, kind: "auth" },
  { key: "welcome", subject: "Welcome to Score Logic Pro", previewLink: D, render: welcome, kind: "transactional" },
  { key: "report-received", subject: "We received your credit report", previewLink: D, render: reportReceived, kind: "transactional" },
  { key: "payment-confirmed", subject: "Payment confirmed — DIY Credit Repair", previewLink: D, render: (l) => paymentConfirmed("DIY Credit Repair", l), kind: "transactional" },
  { key: "letter-ready", subject: "Your dispute letter is ready", previewLink: D, render: letterReady, kind: "transactional" },
];

// A realistic but obviously-fake link for auth previews/tests.
export const PREVIEW_AUTH_LINK = BRAND.appUrl + "/auth/confirm?token=preview-token-123";
