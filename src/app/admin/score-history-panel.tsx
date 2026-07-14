"use client";

import { useState, useTransition } from "react";
import { adminDeleteScore } from "./actions";
import type { ScoreEntry } from "@/lib/types";

export function ScoreHistoryPanel({ scores }: { scores: ScoreEntry[] }) {
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<{ kind: "ok" | "err"; text: string } | null>(
    null,
  );

  function remove(id: string) {
    if (!window.confirm("Delete this score entry? This can't be undone.")) return;
    setNotice(null);
    startTransition(async () => {
      const res = await adminDeleteScore(id);
      if (res.error) setNotice({ kind: "err", text: res.error });
      else if (res.message) setNotice({ kind: "ok", text: res.message });
    });
  }

  if (scores.length === 0) {
    return (
      <p className="text-sm text-muted">
        No scores logged yet. Log one below, or the client can self-report from
        their dashboard.
      </p>
    );
  }

  return (
    <div>
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
      <ul className="divide-y divide-line">
        {scores.map((s) => (
          <li
            key={s.id}
            className="flex items-center justify-between py-3 text-sm"
          >
            <span className="text-ink-2">
              <span className="font-semibold text-ink">{s.score}</span> ·{" "}
              {s.bureau} ·{" "}
              <span className="text-muted">
                {new Date(s.recorded_at).toLocaleDateString()}
              </span>
              {s.source !== "manual" && (
                <span className="ml-2 text-xs text-muted">({s.source})</span>
              )}
              {s.note && (
                <span className="block text-xs text-muted">{s.note}</span>
              )}
            </span>
            <button
              type="button"
              disabled={pending}
              onClick={() => remove(s.id)}
              className="text-xs font-semibold text-muted transition hover:text-[var(--rc-red)] disabled:opacity-50"
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
