// Identity verification documents — the three categories a client must
// provide during onboarding, the acceptable document types for each, and a
// helper that derives a client's overall verification status from their rows.
//
// Approval is manual: a human admin reviews each upload (see admin actions).
// A client is "verified" once every required category has an approved doc.

import type { VerificationDocument, VerificationCategory } from "@/lib/types";

export interface CategoryMeta {
  id: VerificationCategory;
  title: string;
  // Short instruction shown under the heading.
  hint: string;
  // Acceptable document types — the client picks which one they're uploading.
  docTypes: string[];
}

export const VERIFICATION_CATEGORIES: CategoryMeta[] = [
  {
    id: "photo_id",
    title: "Photo ID",
    hint: "A clear picture of the front of one government-issued photo ID. Front only — the back isn't needed.",
    docTypes: ["Driver's License", "State ID", "Passport", "Military ID"],
  },
  {
    id: "proof_of_address",
    title: "Proof of address",
    hint: "One document showing your name and current home address, dated within the last 60 days where applicable.",
    docTypes: [
      "Utility bill (power, water, gas, internet)",
      "Bank statement",
      "Credit card statement",
      "Lease agreement",
      "Mortgage statement",
      "Vehicle registration",
      "Voter registration card",
    ],
  },
  {
    id: "proof_of_ssn",
    title: "Proof of Social Security number",
    hint: "One document that shows your full Social Security number.",
    docTypes: [
      "Social Security card",
      "W-2 form",
      "Pay stub showing full SSN",
      "Tax return",
    ],
  },
];

export const REQUIRED_CATEGORIES: VerificationCategory[] = [
  "photo_id",
  "proof_of_address",
  "proof_of_ssn",
];

export function categoryTitle(category: string): string {
  return (
    VERIFICATION_CATEGORIES.find((c) => c.id === category)?.title ?? category
  );
}

export type VerificationState = "complete" | "in_review" | "action_needed" | "not_started";

export interface VerificationSummary {
  state: VerificationState;
  // Per required category: the most recent document (if any) and whether the
  // category is satisfied by an approved doc.
  approvedCount: number; // required categories with an approved doc
  rejectedCount: number; // categories whose latest doc was rejected
  pendingCount: number; // categories whose latest doc is awaiting review
}

// Latest document per category wins (a client can re-upload after a rejection).
function latestPerCategory(
  docs: VerificationDocument[],
): Map<string, VerificationDocument> {
  const byCat = new Map<string, VerificationDocument>();
  for (const d of docs) {
    const prev = byCat.get(d.category);
    if (!prev || d.uploaded_at > prev.uploaded_at) byCat.set(d.category, d);
  }
  return byCat;
}

export function verificationSummary(
  docs: VerificationDocument[],
): VerificationSummary {
  const latest = latestPerCategory(docs);
  let approved = 0;
  let rejected = 0;
  let pending = 0;

  for (const cat of REQUIRED_CATEGORIES) {
    const doc = latest.get(cat);
    if (!doc) continue;
    if (doc.status === "approved") approved += 1;
    else if (doc.status === "rejected") rejected += 1;
    else pending += 1;
  }

  let state: VerificationState;
  if (approved === REQUIRED_CATEGORIES.length) state = "complete";
  else if (rejected > 0) state = "action_needed";
  else if (pending > 0) state = "in_review";
  else state = "not_started";

  return {
    state,
    approvedCount: approved,
    rejectedCount: rejected,
    pendingCount: pending,
  };
}
