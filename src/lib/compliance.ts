// CROA compliance layer.
//
// The Credit Repair Organizations Act (15 U.S.C. §1679 et seq.) requires that,
// BEFORE any service is performed for a fee, the consumer receives a written
// statement of their rights and signs a written service contract — and that the
// contract gives them the right to cancel, without charge, within three business
// days. We model that here: the gate (have they accepted?), the 3-business-day
// cancellation window, and the human-readable text shown on the agreement page.
//
// Status (2026-06-12): the DISCLOSURE below is now the verbatim federal
// "Consumer Credit File Rights Under State and Federal Law" statement supplied
// by the client, and the refund policy is the client's own wording. The
// remaining service-agreement clauses are operational drafting consistent with
// CROA — they should still get a final pass from the client's attorney before
// scaling. Bump AGREEMENT_VERSION when wording materially changes so prior
// acceptances are re-collected against the new version.

import type { Agreement, AgreementKind } from "@/lib/types";

// Re-collect acceptance whenever the legal text materially changes.
// 2026-11-1: billing changed to charge at checkout, with a full refund for
// cancellations inside the 3-business-day window (client's instruction).
export const AGREEMENT_VERSION = "2026-11-1";

// The two artifacts a CROA-compliant signup must capture.
export const REQUIRED_KINDS: AgreementKind[] = [
  "croa_disclosure",
  "service_agreement",
];

const DAY = 24 * 60 * 60 * 1000;

// Add N business days (Mon–Fri) to a date, landing at end-of-day to be
// consumer-favorable on the cancellation deadline. Federal holidays are NOT
// excluded here — counsel should confirm whether the final policy must also
// skip holidays; if so, extend this with a holiday calendar.
export function addBusinessDays(from: Date, n: number): Date {
  const d = new Date(from.getTime());
  let added = 0;
  while (added < n) {
    d.setDate(d.getDate() + 1);
    const day = d.getDay(); // 0 = Sun, 6 = Sat
    if (day !== 0 && day !== 6) added += 1;
  }
  d.setHours(23, 59, 59, 999);
  return d;
}

// The cancellation deadline for an acceptance made now.
export function cancellationDeadline(acceptedAt: Date = new Date()): Date {
  return addBusinessDays(acceptedAt, 3);
}

export interface AgreementStatus {
  accepted: boolean; // both required kinds accepted at current version, not canceled
  canceled: boolean; // a current-version acceptance was canceled
  cancelable: boolean; // accepted AND still inside the 3-business-day window
  acceptedAt: string | null;
  deadline: string | null; // ISO of the cancellation deadline
  daysLeft: number | null; // whole days remaining to cancel (>= 0), null if N/A
}

// Derive the user's compliance state from their agreement rows. We only consider
// rows matching the CURRENT version so a text update forces re-acceptance.
export function agreementStatus(rows: Agreement[] | null): AgreementStatus {
  const empty: AgreementStatus = {
    accepted: false,
    canceled: false,
    cancelable: false,
    acceptedAt: null,
    deadline: null,
    daysLeft: null,
  };
  if (!rows || rows.length === 0) return empty;

  const current = rows.filter((r) => r.version === AGREEMENT_VERSION);
  if (current.length === 0) return empty;

  const canceled = current.some((r) => r.canceled_at);
  const acceptedKinds = new Set(
    current.filter((r) => !r.canceled_at).map((r) => r.kind),
  );
  const accepted =
    !canceled && REQUIRED_KINDS.every((k) => acceptedKinds.has(k));

  // Use the service_agreement row (it carries the signature + deadline) for the
  // window math; fall back to the earliest current row.
  const signRow =
    current.find((r) => r.kind === "service_agreement" && !r.canceled_at) ??
    current.find((r) => !r.canceled_at) ??
    current[0];

  const deadline = signRow?.cancellation_deadline ?? null;
  let daysLeft: number | null = null;
  let cancelable = false;
  if (accepted && deadline) {
    const ms = new Date(deadline).getTime() - Date.now();
    cancelable = ms > 0;
    daysLeft = ms > 0 ? Math.ceil(ms / DAY) : 0;
  }

  return {
    accepted,
    canceled,
    cancelable,
    acceptedAt: signRow?.accepted_at ?? null,
    deadline,
    daysLeft,
  };
}

// ── Refund policy window ──────────────────────────────────────────────────────
// Joseph's refund policy hinges on a 180-day service window and a 3-item floor:
// a 50% refund if fewer than 3 negative items are removed/corrected within 180
// days, and a 100% refund if zero qualifying items are removed in that window.
// The admin needs to see, per client, how far into the window they are and how
// many wins they have so far — these constants keep that math in one place.
export const REFUND_WINDOW_DAYS = 180;
export const REFUND_MIN_ITEMS = 3;

export interface RefundWindow {
  started: boolean; // service has begun (a paid order is active)
  startedAt: string | null; // ISO date service began
  daysIn: number | null; // whole days since service began
  daysLeft: number | null; // whole days left in the 180-day window (>= 0)
  elapsed: boolean; // the 180-day window has fully passed
}

// Derive the refund-window state from when paid service began. Pass the ISO date
// of the earliest active/completed order (null if the client has never paid).
export function refundWindow(serviceStartISO: string | null): RefundWindow {
  if (!serviceStartISO) {
    return { started: false, startedAt: null, daysIn: null, daysLeft: null, elapsed: false };
  }
  const start = new Date(serviceStartISO).getTime();
  if (Number.isNaN(start)) {
    return { started: false, startedAt: null, daysIn: null, daysLeft: null, elapsed: false };
  }
  const daysIn = Math.floor((Date.now() - start) / DAY);
  const daysLeft = Math.max(0, REFUND_WINDOW_DAYS - daysIn);
  return {
    started: true,
    startedAt: serviceStartISO,
    daysIn,
    daysLeft,
    elapsed: daysIn > REFUND_WINDOW_DAYS,
  };
}

// ── Agreement copy ───────────────────────────────────────────────────────────
// Shown verbatim on /agreement. The disclosure is the federally-mandated text
// (Consumer Credit Protection Act / CROA §405) supplied by the client.

export const DISCLOSURE_TITLE =
  "Consumer Credit File Rights Under State and Federal Law";

// Verbatim federal disclosure furnished under the Consumer Credit Protection
// Act, as supplied by the client.
export const DISCLOSURE_POINTS: string[] = [
  'You have a right to dispute inaccurate information in your credit report by contacting the credit bureau directly. However, neither you nor any "credit repair" company or credit repair organization has the right to have accurate, current, and verifiable information removed from your credit report.',
  "The credit bureau must remove accurate, negative information from your report only if it is over 7 years old. Bankruptcy information can be reported for 10 years.",
  "You have a right to obtain a copy of your credit report from a credit bureau. You may be charged a reasonable fee. There is no fee, however, if you have been turned down for credit, employment, insurance, or a rental dwelling because of information in your credit report within the preceding 60 days. The credit bureau must provide someone to help you interpret the information in your credit file.",
  "You are entitled to receive a free copy of your credit report if you are unemployed and intend to apply for employment in the next 60 days, if you are a recipient of public welfare assistance, or if you have reason to believe that there is inaccurate information in your credit report due to fraud.",
  "You have a right to sue a credit repair organization that violates the Credit Repair Organization Act. This law prohibits deceptive practices by credit repair organizations.",
  "You have the right to cancel your contract with any credit repair organization for any reason within 3 business days from the date you signed it.",
  "Credit bureaus are required to follow reasonable procedures to ensure that the information they report is accurate. However, mistakes may occur.",
  "You may, on your own, notify a credit bureau in writing that you dispute the accuracy of information in your credit file. The credit bureau must then reinvestigate and modify or remove inaccurate or incomplete information. The credit bureau may not charge any fee for this service. Any pertinent information and copies of all documents you have concerning an error should be given to the credit bureau.",
  "If the credit bureau's reinvestigation does not resolve the dispute to your satisfaction, you may send a brief statement to the credit bureau, to be kept in your file, explaining why you think the record is inaccurate.",
  "The credit bureau must include a summary of your statement about disputed information with any report it issues about you.",
  "The Federal Trade Commission regulates credit bureaus and credit repair organizations. For more information, contact: The Public Reference Branch, Federal Trade Commission, Washington, D.C. 20580.",
];

export const CONTRACT_TITLE = "Credit Repair Services Agreement";

// Service-agreement terms. The refund policy and no-guarantee language are the
// client's own wording; the remaining operational clauses track CROA and should
// get a final attorney pass before scaling.
export const CONTRACT_POINTS: { heading: string; body: string }[] = [
  {
    heading: "Services we provide",
    body: "We review the credit report you upload, identify items that appear inaccurate, incomplete, or unverifiable, and prepare dispute letters addressed to the credit bureaus and/or your creditors. On the Done-For-You plan we also mail those letters and track the responses on your behalf.",
  },
  {
    heading: "What we charge",
    body: "Fees are shown on your dashboard before you pay. You can only purchase a plan after signing this agreement, and your card is charged in full at checkout. If you cancel within three (3) business days of signing, that payment is refunded in full (see \"Your right to cancel\" below).",
  },
  {
    heading: "Expected timeline",
    body: "Credit bureaus generally have 30 days to investigate a dispute. A full dispute cycle therefore typically takes 30–60 days per round, and results vary based on your individual circumstances.",
  },
  {
    heading: "No guarantee of results",
    body: "Revenue Credit AI cannot guarantee specific credit score increases, loan approvals, or funding results, as all decisions are made by creditors and credit reporting agencies. We do not guarantee the removal of any specific item.",
  },
  {
    heading: "Refund policy",
    body: "If we do not successfully remove or correct at least three (3) inaccurate, incomplete, or unverifiable negative items from your credit reports within 180 days, you may be eligible for a 50% refund, provided you have remained an active client, made all payments on time, and cooperated throughout the process. If we are unable to remove or correct any qualifying negative items within 180 days, you may request a 100% refund by submitting a written request within 30 days after the 180-day service period.",
  },
  {
    heading: "Your right to cancel",
    body: "You may cancel this agreement for any reason within three (3) business days of signing, at no cost to you, from your dashboard or by emailing us. If you cancel within this period, any payment you have made is refunded in full to your original payment method. Refunds typically reach your card within 5–10 business days.",
  },
  {
    heading: "Honest disputes only",
    body: "You agree to dispute only information you believe in good faith to be inaccurate, incomplete, or unverifiable. Knowingly disputing accurate information may be unlawful.",
  },
];
