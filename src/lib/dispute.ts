// Shared presentation + lifecycle helpers for dispute items. Used by the client
// dashboard journey view and the admin worklist so the two never drift on what a
// status means or how the 35-day FCRA §611 clock is displayed.

import type { DisputeItem, DisputeItemStatus } from "@/lib/types";

export const STATUS_META: Record<
  DisputeItemStatus,
  { label: string; tone: "neutral" | "blue" | "green" | "amber" | "red" }
> = {
  pending: { label: "Drafted", tone: "neutral" },
  sent: { label: "Sent — awaiting bureau", tone: "blue" },
  deleted: { label: "Deleted", tone: "green" },
  updated: { label: "Corrected", tone: "green" },
  verified: { label: "Verified (stays)", tone: "amber" },
  needs_followup: { label: "Rolled to next round", tone: "amber" },
};

const ITEM_TYPE_LABEL: Record<string, string> = {
  collection: "Collection",
  charge_off: "Charge-off",
  late_payment: "Late payment",
  inquiry: "Hard inquiry",
  balance: "Inaccurate balance",
  duplicate: "Duplicate tradeline",
  other: "Disputed item",
};

export function itemTypeLabel(t: string | null): string {
  if (!t) return "Disputed item";
  return ITEM_TYPE_LABEL[t] ?? "Disputed item";
}

const DAY = 24 * 60 * 60 * 1000;

// Whole days from now until the response is due. Negative when overdue.
export function daysUntil(dueISO: string | null): number | null {
  if (!dueISO) return null;
  const due = new Date(dueISO).getTime();
  if (Number.isNaN(due)) return null;
  return Math.ceil((due - Date.now()) / DAY);
}

// Short human label for the 35-day clock on a sent item.
export function clockLabel(item: Pick<DisputeItem, "status" | "response_due_at">):
  | { text: string; overdue: boolean }
  | null {
  if (item.status !== "sent") return null;
  const days = daysUntil(item.response_due_at);
  if (days === null) return null;
  if (days < 0) {
    return { text: `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} overdue`, overdue: true };
  }
  if (days === 0) return { text: "Response due today", overdue: false };
  return { text: `${days} day${days === 1 ? "" : "s"} left to respond`, overdue: false };
}

// A win is an item the bureau removed or corrected.
export function isWin(status: DisputeItemStatus): boolean {
  return status === "deleted" || status === "updated";
}
