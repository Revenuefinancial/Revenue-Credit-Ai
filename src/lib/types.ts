import type { PlanId } from "@/lib/config";

export type Role = "client" | "admin";
export type OrderStatus = "pending" | "active" | "completed" | "canceled";
export type Interval = "one_time" | "per_round";

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
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
