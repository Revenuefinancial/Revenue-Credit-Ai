import type { PlanId } from "@/lib/config";

export type Role = "client" | "admin";
export type OrderStatus = "pending" | "active" | "completed" | "canceled";
export type Interval = "one_time" | "per_round";

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  mailing_address: string | null;
  role: Role;
  created_at: string;
}

export interface Order {
  id: string;
  user_id: string;
  plan_id: PlanId;
  status: OrderStatus;
  amount_cents: number | null;
  interval: Interval | null;
  stripe_checkout_session_id: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_payment_intent_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreditReport {
  id: string;
  user_id: string;
  file_path: string;
  file_name: string;
  file_size: number | null;
  status: "uploaded" | "reviewed";
  uploaded_at: string;
}

export interface DisputeLetter {
  id: string;
  user_id: string;
  order_id: string | null;
  file_path: string;
  file_name: string;
  round: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export type Bureau = "Equifax" | "Experian" | "TransUnion";
export type ScoreBureau = Bureau | "Merged";

export type DisputeItemStatus =
  | "pending"
  | "sent"
  | "deleted"
  | "verified"
  | "updated"
  | "needs_followup";

export interface DisputeItem {
  id: string;
  user_id: string;
  report_id: string | null;
  draft_id: string | null;
  bureau: string;
  creditor: string;
  account_mask: string | null;
  item_type: string | null;
  reason: string | null;
  round: number;
  status: DisputeItemStatus;
  sent_at: string | null;
  response_due_at: string | null;
  resolved_at: string | null;
  outcome_note: string | null;
  created_by: string | null;
  created_at: string;
}

export interface ScoreEntry {
  id: string;
  user_id: string;
  bureau: ScoreBureau;
  score: number;
  source: "manual" | "smartcredit" | "import";
  recorded_at: string;
  note: string | null;
  created_by: string | null;
  created_at: string;
}

export type AgreementKind = "service_agreement" | "croa_disclosure";

export interface Agreement {
  id: string;
  user_id: string;
  kind: AgreementKind;
  version: string;
  full_name: string | null;
  accepted_at: string;
  cancellation_deadline: string | null;
  canceled_at: string | null;
  ip: string | null;
  created_at: string;
}

export type VerificationCategory =
  | "photo_id"
  | "proof_of_address"
  | "proof_of_ssn";

export type VerificationStatus = "pending" | "approved" | "rejected";

export interface VerificationDocument {
  id: string;
  user_id: string;
  category: VerificationCategory;
  doc_type: string | null;
  file_path: string;
  file_name: string;
  file_size: number | null;
  status: VerificationStatus;
  review_note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  uploaded_at: string;
}

export type LetterDraftStatus = "draft" | "approved" | "rejected";

export interface LetterDraft {
  id: string;
  user_id: string;
  report_id: string | null;
  bureau: string;
  subject: string | null;
  body: string;
  round: number;
  model: string | null;
  status: LetterDraftStatus;
  created_by: string | null;
  approved_by: string | null;
  created_at: string;
  approved_at: string | null;
}
