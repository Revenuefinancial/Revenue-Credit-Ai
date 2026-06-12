"use client";

import { useActionState } from "react";
import { saveMailingAddress, type AddressState } from "./actions";

const initial: AddressState = {};

export function AddressForm({ current }: { current: string | null }) {
  const [state, formAction, pending] = useActionState(
    saveMailingAddress,
    initial,
  );

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <p className="text-sm text-muted">
        This appears at the top of every dispute letter so the bureaus can
        respond to you. Use your full current mailing address.
      </p>
      <textarea
        name="mailing_address"
        rows={4}
        defaultValue={current ?? ""}
        placeholder={"Jane Doe\n123 Main St\nApt 4\nAtlanta, GA 30301"}
        className="w-full rounded-rc border border-line bg-surface px-4 py-3 text-sm text-ink outline-none transition focus:border-brand"
      />
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-rc bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-2 disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save address"}
        </button>
        {state.error && (
          <span className="text-sm text-[var(--rc-red)]">{state.error}</span>
        )}
        {state.message && (
          <span className="text-sm text-[var(--rc-green)]">{state.message}</span>
        )}
      </div>
    </form>
  );
}
