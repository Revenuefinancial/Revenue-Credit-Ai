// Client-facing dispute journey: groups the client's disputed items by round and
// shows each tradeline's lifecycle state plus the live 35-day bureau clock. Pure
// read-only server component — the admin drives the state changes.

import type { DisputeItem } from "@/lib/types";
import {
  STATUS_META,
  itemTypeLabel,
  clockLabel,
  isWin,
} from "@/lib/dispute";

const TONE_CLASS: Record<string, string> = {
  neutral: "border-line text-ink-2",
  blue: "border-brand/40 text-brand",
  green: "border-[var(--rc-green)]/40 text-[var(--rc-green)]",
  amber: "border-[var(--rc-amber)]/40 text-[var(--rc-amber)]",
  red: "border-[var(--rc-red)]/40 text-[var(--rc-red)]",
};

export function DisputeJourney({ items }: { items: DisputeItem[] }) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted">
        Your disputes will appear here once your letters are prepared. Each item
        we challenge is tracked through the bureaus&apos; 35-day response window
        so you always know where things stand.
      </p>
    );
  }

  const wins = items.filter((i) => isWin(i.status)).length;
  const sent = items.filter((i) => i.status === "sent").length;

  // Group by round, newest round first.
  const byRound = new Map<number, DisputeItem[]>();
  for (const it of items) {
    const arr = byRound.get(it.round) ?? [];
    arr.push(it);
    byRound.set(it.round, arr);
  }
  const rounds = [...byRound.entries()].sort((a, b) => b[0] - a[0]);

  return (
    <div className="flex flex-col gap-6">
      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Items disputed" value={items.length} />
        <Stat label="Awaiting bureau" value={sent} />
        <Stat label="Removed / corrected" value={wins} tone="green" />
      </div>

      {rounds.map(([round, roundItems]) => (
        <div key={round}>
          <h3 className="mb-2 text-sm font-semibold text-ink">Round {round}</h3>
          <ul className="flex flex-col gap-2">
            {roundItems.map((it) => {
              const meta = STATUS_META[it.status] ?? STATUS_META.pending;
              const clock = clockLabel(it);
              return (
                <li
                  key={it.id}
                  className="rounded-rc border border-line bg-bg px-4 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink">
                        {it.creditor}
                        {it.account_mask && (
                          <span className="ml-2 font-mono text-xs text-muted">
                            {it.account_mask}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted">
                        {itemTypeLabel(it.item_type)} · {it.bureau}
                      </p>
                    </div>
                    <span
                      className={`flex-none rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                        TONE_CLASS[meta.tone] ?? TONE_CLASS.neutral
                      }`}
                    >
                      {meta.label}
                    </span>
                  </div>
                  {it.reason && (
                    <p className="mt-1.5 text-xs text-ink-2">{it.reason}</p>
                  )}
                  {clock && (
                    <p
                      className={`mt-1.5 text-xs font-semibold ${
                        clock.overdue
                          ? "text-[var(--rc-red)]"
                          : "text-brand"
                      }`}
                    >
                      {clock.text}
                    </p>
                  )}
                  {it.outcome_note && (
                    <p className="mt-1.5 text-xs text-muted">{it.outcome_note}</p>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "green";
}) {
  return (
    <div className="rounded-rc border border-line bg-bg px-3 py-3 text-center">
      <div
        className={`text-2xl font-bold ${
          tone === "green" ? "text-[var(--rc-green)]" : "text-ink"
        }`}
      >
        {value}
      </div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  );
}
