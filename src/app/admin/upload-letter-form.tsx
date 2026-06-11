"use client";

import { useActionState } from "react";
import { uploadLetter, type LetterState } from "./actions";

const initial: LetterState = {};

export function UploadLetterForm({ userId }: { userId: string }) {
  const [state, formAction, pending] = useActionState(uploadLetter, initial);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="user_id" value={userId} />

      <div className="flex gap-3">
        <label className="flex flex-col gap-1 text-sm font-medium text-ink-2">
          Round
          <input
            name="round"
            type="number"
            min={1}
            defaultValue={1}
            className="w-24 rounded-rc border border-line bg-surface px-3 py-2 text-ink outline-none focus:border-brand"
          />
        </label>
        <label className="flex flex-1 flex-col gap-1 text-sm font-medium text-ink-2">
          Note (optional)
          <input
            name="notes"
            type="text"
            placeholder="e.g. Round 1 — Experian + Equifax"
            className="w-full rounded-rc border border-line bg-surface px-3 py-2 text-ink outline-none focus:border-brand"
          />
        </label>
      </div>

      <input
        name="file"
        type="file"
        accept=".pdf,.png,.jpg,.jpeg"
        required
        className="block w-full text-sm text-ink-2 file:mr-4 file:rounded-rc file:border-0 file:bg-brand file:px-4 file:py-2 file:font-semibold file:text-white hover:file:bg-brand-2"
      />

      {state.error && <p className="text-sm text-[var(--rc-red)]">{state.error}</p>}
      {state.message && (
        <p className="text-sm text-[var(--rc-green)]">{state.message}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-rc bg-ink px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Uploading…" : "Upload dispute letter"}
      </button>
    </form>
  );
}
