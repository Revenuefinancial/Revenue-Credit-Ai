"use client";

import { useState, useTransition } from "react";
import {
  markRoundSent,
  setItemOutcome,
  adminLogScore,
  addDisputeItem,
  updateDisputeItem,
  deleteDisputeItem,
} from "./actions";
import { STATUS_META, itemTypeLabel, clockLabel } from "@/lib/dispute";
import type { DisputeItem } from "@/lib/types";

const ITEM_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "collection", label: "Collection" },
  { value: "charge_off", label: "Charge-off" },
  { value: "late_payment", label: "Late payment" },
  { value: "inquiry", label: "Hard inquiry" },
  { value: "balance", label: "Inaccurate balance" },
  { value: "duplicate", label: "Duplicate tradeline" },
  { value: "other", label: "Other" },
];
const BUREAU_OPTIONS = ["Equifax", "Experian", "TransUnion"];

const BADGE_CLASS: Record<string, string> = {
  neutral: "bg-line-soft text-muted",
  blue: "bg-brand/10 text-brand",
  green: "bg-[var(--rc-green)]/10 text-[var(--rc-green)]",
  amber: "bg-[var(--rc-amber)]/10 text-[var(--rc-amber)]",
  red: "bg-[var(--rc-red)]/10 text-[var(--rc-red)]",
};

const OUTCOME_OPTIONS: { value: string; label: string }[] = [
  { value: "deleted", label: "Deleted (removed)" },
  { value: "updated", label: "Corrected" },
  { value: "verified", label: "Verified (stays)" },
  { value: "needs_followup", label: "Roll to next round" },
  { value: "sent", label: "Re-open (awaiting)" },
];

export function DisputeItemsPanel({
  userId,
  items,
}: {
  userId: string;
  items: DisputeItem[];
}) {
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<{ kind: "ok" | "err"; text: string } | null>(
    null,
  );

  function run(
    fn: () => Promise<{ error?: string; message?: string }>,
    onSuccess?: () => void,
  ) {
    setNotice(null);
    startTransition(async () => {
      const res = await fn();
      if (res.error) setNotice({ kind: "err", text: res.error });
      else {
        if (res.message) setNotice({ kind: "ok", text: res.message });
        onSuccess?.();
      }
    });
  }

  const rounds = [...new Set(items.map((i) => i.round))].sort((a, b) => b - a);
  const currentRound = rounds[0] ?? 1;

  return (
    <div>
      <p className="mb-4 text-sm text-muted">
        Every disputed item is tracked here — whether the AI drafted it or you{" "}
        <strong>add it by hand</strong> below (use this when you write and upload
        your own letters). Mark a round <strong>sent</strong> once you mail the
        letters — that starts the 35-day bureau clock the client sees. Record
        each bureau response as it arrives.
      </p>

      {notice && (
        <p
          className={`mb-3 rounded-lg px-3 py-2 text-sm ${
            notice.kind === "ok"
              ? "bg-[var(--rc-green)]/10 text-[var(--rc-green)]"
              : "bg-[var(--rc-red)]/10 text-[var(--rc-red)]"
          }`}
        >
          {notice.text}
        </p>
      )}

      <AddItemForm
        pending={pending}
        defaultRound={currentRound}
        onAdd={(input, reset) =>
          run(() => addDisputeItem(userId, input), reset)
        }
      />

      {items.length === 0 ? (
        <p className="text-sm text-muted">
          No tracked items yet. Generate AI dispute letters above, or add an item
          by hand using the form above, and it will appear here for tracking.
        </p>
      ) : (
        rounds.map((round) => {
          const roundItems = items.filter((i) => i.round === round);
          const hasPending = roundItems.some((i) => i.status === "pending");
          return (
            <div key={round} className="mt-5">
              <div className="mb-2 flex items-center justify-between gap-3">
                <h3 className="text-sm font-bold uppercase tracking-wide text-muted">
                  Round {round}
                </h3>
                {hasPending && (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => run(() => markRoundSent(userId, round))}
                    className="rounded-rc bg-brand px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-2 disabled:opacity-60"
                  >
                    Mark round {round} sent
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {roundItems.map((it) => (
                  <ItemRow
                    key={it.id}
                    item={it}
                    pending={pending}
                    onOutcome={(status, note) =>
                      run(() => setItemOutcome(it.id, status, note))
                    }
                    onEdit={(input, done) =>
                      run(() => updateDisputeItem(it.id, input), done)
                    }
                    onDelete={() => run(() => deleteDisputeItem(it.id))}
                  />
                ))}
              </div>
            </div>
          );
        })
      )}

      <AdminScoreForm
        userId={userId}
        pending={pending}
        onLog={(score, bureau) => run(() => adminLogScore(userId, score, bureau))}
      />
    </div>
  );
}

function ItemRow({
  item,
  pending,
  onOutcome,
  onEdit,
  onDelete,
}: {
  item: DisputeItem;
  pending: boolean;
  onOutcome: (status: string, note: string) => void;
  onEdit: (input: Partial<AddItemInput>, done: () => void) => void;
  onDelete: () => void;
}) {
  const [status, setStatus] = useState("deleted");
  const [note, setNote] = useState(item.outcome_note ?? "");
  const [editing, setEditing] = useState(false);
  const meta = STATUS_META[item.status] ?? STATUS_META.pending;
  const clock = clockLabel(item);
  const editable = item.status === "sent" || item.status === "pending";

  if (editing) {
    return (
      <EditItemForm
        item={item}
        pending={pending}
        onCancel={() => setEditing(false)}
        onSave={(input) => onEdit(input, () => setEditing(false))}
      />
    );
  }

  return (
    <div className="rounded-xl border border-line bg-bg p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink">
            {item.creditor}
            {item.account_mask && (
              <span className="ml-2 font-mono text-xs text-muted">
                {item.account_mask}
              </span>
            )}
          </p>
          <p className="text-xs text-muted">
            {itemTypeLabel(item.item_type)} · {item.bureau}
          </p>
          {item.reason && (
            <p className="mt-1 text-xs text-ink-2">{item.reason}</p>
          )}
        </div>
        <div className="flex flex-none items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              BADGE_CLASS[meta.tone] ?? BADGE_CLASS.neutral
            }`}
          >
            {meta.label}
          </span>
          <button
            type="button"
            disabled={pending}
            onClick={() => setEditing(true)}
            className="text-xs font-semibold text-muted transition hover:text-brand disabled:opacity-50"
          >
            Edit
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (
                window.confirm(
                  `Delete the ${item.creditor} item? This can't be undone.`,
                )
              )
                onDelete();
            }}
            className="text-xs font-semibold text-muted transition hover:text-[var(--rc-red)] disabled:opacity-50"
          >
            Delete
          </button>
        </div>
      </div>

      {clock && (
        <p
          className={`mt-1 text-xs font-semibold ${
            clock.overdue ? "text-[var(--rc-red)]" : "text-brand"
          }`}
        >
          {clock.text}
        </p>
      )}

      {editable && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-lg border border-line bg-surface px-2 py-1.5 text-xs text-ink"
          >
            {OUTCOME_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Outcome note (optional)"
            className="min-w-40 flex-1 rounded-lg border border-line bg-surface px-2 py-1.5 text-xs text-ink"
          />
          <button
            type="button"
            disabled={pending}
            onClick={() => onOutcome(status, note)}
            className="rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink transition hover:bg-line-soft disabled:opacity-50"
          >
            Record
          </button>
        </div>
      )}
      {!editable && item.outcome_note && (
        <p className="mt-1 text-xs text-muted">{item.outcome_note}</p>
      )}
    </div>
  );
}

type AddItemInput = {
  bureau: string;
  creditor: string;
  account_mask: string;
  item_type: string;
  reason: string;
  round: number;
};

function AddItemForm({
  pending,
  defaultRound,
  onAdd,
}: {
  pending: boolean;
  defaultRound: number;
  onAdd: (input: AddItemInput, reset: () => void) => void;
}) {
  const [open, setOpen] = useState(false);
  const [creditor, setCreditor] = useState("");
  const [bureau, setBureau] = useState(BUREAU_OPTIONS[0]);
  const [itemType, setItemType] = useState(ITEM_TYPE_OPTIONS[0].value);
  const [accountMask, setAccountMask] = useState("");
  const [round, setRound] = useState(String(defaultRound));
  const [reason, setReason] = useState("");

  function submit() {
    onAdd(
      {
        bureau,
        creditor,
        account_mask: accountMask,
        item_type: itemType,
        reason,
        round: Number(round) || 1,
      },
      // On success, clear the per-item fields but keep bureau/type/round so the
      // admin can quickly log several tradelines in the same round.
      () => {
        setCreditor("");
        setAccountMask("");
        setReason("");
      },
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mb-4 rounded-rc border border-dashed border-line px-3 py-2 text-sm font-semibold text-brand transition hover:bg-brand/5"
      >
        + Add an item manually
      </button>
    );
  }

  return (
    <div className="mb-5 rounded-xl border border-line bg-bg p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold text-ink">Add a dispute item</h3>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs font-semibold text-muted hover:text-ink"
        >
          Close
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-muted">
            Creditor / furnisher
          </span>
          <input
            value={creditor}
            onChange={(e) => setCreditor(e.target.value)}
            placeholder="e.g. Midland Funding"
            className="w-full rounded-lg border border-line bg-surface px-2.5 py-1.5 text-sm text-ink"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-muted">
            Account # (optional)
          </span>
          <input
            value={accountMask}
            onChange={(e) => setAccountMask(e.target.value)}
            placeholder="****1234"
            className="w-full rounded-lg border border-line bg-surface px-2.5 py-1.5 text-sm text-ink"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-muted">
            Bureau
          </span>
          <select
            value={bureau}
            onChange={(e) => setBureau(e.target.value)}
            className="w-full rounded-lg border border-line bg-surface px-2.5 py-1.5 text-sm text-ink"
          >
            {BUREAU_OPTIONS.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-muted">
            Item type
          </span>
          <select
            value={itemType}
            onChange={(e) => setItemType(e.target.value)}
            className="w-full rounded-lg border border-line bg-surface px-2.5 py-1.5 text-sm text-ink"
          >
            {ITEM_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-muted">
            Round
          </span>
          <input
            type="number"
            min={1}
            value={round}
            onChange={(e) => setRound(e.target.value)}
            className="w-full rounded-lg border border-line bg-surface px-2.5 py-1.5 text-sm text-ink"
          />
        </label>

        <label className="block sm:col-span-2">
          <span className="mb-1 block text-xs font-semibold text-muted">
            Reason (optional)
          </span>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Not mine / never opened this account"
            className="w-full rounded-lg border border-line bg-surface px-2.5 py-1.5 text-sm text-ink"
          />
        </label>
      </div>

      <div className="mt-3 flex justify-end">
        <button
          type="button"
          disabled={pending || !creditor.trim()}
          onClick={submit}
          className="rounded-rc bg-brand px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-brand-2 disabled:opacity-60"
        >
          Add item
        </button>
      </div>
    </div>
  );
}

function EditItemForm({
  item,
  pending,
  onCancel,
  onSave,
}: {
  item: DisputeItem;
  pending: boolean;
  onCancel: () => void;
  onSave: (input: Partial<AddItemInput>) => void;
}) {
  const [creditor, setCreditor] = useState(item.creditor ?? "");
  const [bureau, setBureau] = useState(item.bureau ?? BUREAU_OPTIONS[0]);
  const [itemType, setItemType] = useState(
    item.item_type ?? ITEM_TYPE_OPTIONS[0].value,
  );
  const [accountMask, setAccountMask] = useState(item.account_mask ?? "");
  const [round, setRound] = useState(String(item.round ?? 1));
  const [reason, setReason] = useState(item.reason ?? "");

  return (
    <div className="rounded-xl border border-brand/40 bg-bg p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold text-ink">Edit dispute item</h3>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs font-semibold text-muted hover:text-ink"
        >
          Cancel
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-muted">
            Creditor / furnisher
          </span>
          <input
            value={creditor}
            onChange={(e) => setCreditor(e.target.value)}
            className="w-full rounded-lg border border-line bg-surface px-2.5 py-1.5 text-sm text-ink"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-muted">
            Account # (optional)
          </span>
          <input
            value={accountMask}
            onChange={(e) => setAccountMask(e.target.value)}
            placeholder="****1234"
            className="w-full rounded-lg border border-line bg-surface px-2.5 py-1.5 text-sm text-ink"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-muted">
            Bureau
          </span>
          <select
            value={bureau}
            onChange={(e) => setBureau(e.target.value)}
            className="w-full rounded-lg border border-line bg-surface px-2.5 py-1.5 text-sm text-ink"
          >
            {BUREAU_OPTIONS.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-muted">
            Item type
          </span>
          <select
            value={itemType}
            onChange={(e) => setItemType(e.target.value)}
            className="w-full rounded-lg border border-line bg-surface px-2.5 py-1.5 text-sm text-ink"
          >
            {ITEM_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-muted">
            Round
          </span>
          <input
            type="number"
            min={1}
            value={round}
            onChange={(e) => setRound(e.target.value)}
            className="w-full rounded-lg border border-line bg-surface px-2.5 py-1.5 text-sm text-ink"
          />
        </label>

        <label className="block sm:col-span-2">
          <span className="mb-1 block text-xs font-semibold text-muted">
            Reason (optional)
          </span>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full rounded-lg border border-line bg-surface px-2.5 py-1.5 text-sm text-ink"
          />
        </label>
      </div>

      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-rc border border-line bg-surface px-4 py-1.5 text-sm font-semibold text-ink transition hover:bg-line-soft"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={pending || !creditor.trim()}
          onClick={() =>
            onSave({
              bureau,
              creditor,
              account_mask: accountMask,
              item_type: itemType,
              reason,
              round: Number(round) || 1,
            })
          }
          className="rounded-rc bg-brand px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-brand-2 disabled:opacity-60"
        >
          Save changes
        </button>
      </div>
    </div>
  );
}

function AdminScoreForm({
  pending,
  onLog,
}: {
  userId: string;
  pending: boolean;
  onLog: (score: number, bureau: string) => void;
}) {
  const [score, setScore] = useState("");
  const [bureau, setBureau] = useState("Merged");

  return (
    <div className="mt-6 border-t border-line pt-4">
      <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted">
        Log a score for this client
      </h3>
      <div className="flex flex-wrap items-end gap-2">
        <input
          type="number"
          min={300}
          max={850}
          value={score}
          onChange={(e) => setScore(e.target.value)}
          placeholder="Score"
          className="w-24 rounded-lg border border-line bg-surface px-2 py-1.5 text-sm text-ink"
        />
        <select
          value={bureau}
          onChange={(e) => setBureau(e.target.value)}
          className="rounded-lg border border-line bg-surface px-2 py-1.5 text-sm text-ink"
        >
          <option value="Merged">Merged</option>
          <option value="Equifax">Equifax</option>
          <option value="Experian">Experian</option>
          <option value="TransUnion">TransUnion</option>
        </select>
        <button
          type="button"
          disabled={pending || !score}
          onClick={() => onLog(Number(score), bureau)}
          className="rounded-lg border border-line bg-surface px-3 py-1.5 text-sm font-semibold text-ink transition hover:bg-line-soft disabled:opacity-50"
        >
          Log score
        </button>
      </div>
    </div>
  );
}
