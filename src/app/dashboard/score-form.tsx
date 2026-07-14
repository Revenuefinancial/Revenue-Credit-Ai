"use client";

import { useActionState } from "react";
import { logScore, type ScoreState } from "./actions";

const initial: ScoreState = {};

export function ScoreForm() {
  const [state, formAction, pending] = useActionState(logScore, initial);

  return (
    <form
      action={formAction}
      className="mt-4 flex flex-wrap items-end gap-3 border-t border-line pt-4"
    >
      <label className="flex flex-col gap-1 text-xs font-semibold text-ink-2">
        Score
        <input
          name="score"
          type="number"
          min={300}
          max={850}
          required
          placeholder="e.g. 642"
          className="w-28 rounded-rc border border-line bg-surface px-3 py-2 text-sm text-ink outline-none transition focus:border-brand"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs font-semibold text-ink-2">
        Bureau
        <select
          name="bureau"
          defaultValue="Merged"
          className="rounded-rc border border-line bg-surface px-3 py-2 text-sm text-ink outline-none transition focus:border-brand"
        >
          <option value="Merged">Merged / average</option>
          <option value="Equifax">Equifax</option>
          <option value="Experian">Experian</option>
          <option value="TransUnion">TransUnion</option>
        </select>
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-rc bg-brand px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-2 disabled:opacity-60"
      >
        {pending ? "Saving…" : "Log score"}
      </button>
      {state.error && (
        <span className="text-sm text-[var(--rc-red)]">{state.error}</span>
      )}
      {state.message && (
        <span className="text-sm text-[var(--rc-green)]">{state.message}</span>
      )}
    </form>
  );
}
