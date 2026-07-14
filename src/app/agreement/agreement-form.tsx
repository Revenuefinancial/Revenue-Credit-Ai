"use client";

import { useActionState } from "react";
import { acceptAgreement, type AgreementState } from "./actions";

const initial: AgreementState = {};

export function AgreementForm() {
  const [state, formAction, pending] = useActionState(acceptAgreement, initial);

  return (
    <form action={formAction} className="space-y-4">
      <label className="flex items-start gap-3 text-sm text-ink-2">
        <input
          type="checkbox"
          name="ack_disclosure"
          className="mt-1 h-4 w-4 flex-none accent-[var(--brand)]"
        />
        <span>
          I have read and received a copy of the{" "}
          <strong>Consumer Credit File Rights</strong> disclosure above.
        </span>
      </label>

      <label className="flex items-start gap-3 text-sm text-ink-2">
        <input
          type="checkbox"
          name="ack_contract"
          className="mt-1 h-4 w-4 flex-none accent-[var(--brand)]"
        />
        <span>
          I have read and agree to the <strong>Credit Repair Services Agreement</strong>,
          and I understand I may cancel free of charge within three business days.
        </span>
      </label>

      <label className="flex flex-col gap-1 text-xs font-semibold text-ink-2">
        Type your full legal name to sign
        <input
          name="full_name"
          type="text"
          required
          autoComplete="name"
          placeholder="e.g. Jane A. Smith"
          className="max-w-sm rounded-rc border border-line bg-surface px-3 py-2 text-sm text-ink outline-none transition focus:border-brand"
        />
      </label>

      <div className="flex flex-wrap items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={pending}
          className="rounded-rc bg-brand px-6 py-3 font-semibold text-white transition hover:bg-brand-2 disabled:opacity-60"
        >
          {pending ? "Signing…" : "Sign & continue"}
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
