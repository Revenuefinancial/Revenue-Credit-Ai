"use client";

import { useActionState, useRef } from "react";
import { uploadReport, type UploadState } from "./actions";

const initial: UploadState = {};

export function UploadForm() {
  const [state, formAction, pending] = useActionState(uploadReport, initial);
  const ref = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={ref}
      action={formAction}
      className="flex flex-col gap-3"
    >
      <input
        name="file"
        type="file"
        accept=".pdf,.png,.jpg,.jpeg"
        required
        className="block w-full text-sm text-ink-2 file:mr-4 file:rounded-rc file:border-0 file:bg-brand file:px-4 file:py-2 file:font-semibold file:text-white hover:file:bg-brand-2"
      />
      <p className="text-xs text-muted">PDF, PNG, or JPG · up to 10 MB</p>

      {state.error && (
        <p className="text-sm text-[var(--rc-red)]">{state.error}</p>
      )}
      {state.message && (
        <p className="text-sm text-[var(--rc-green)]">{state.message}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-rc bg-ink px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Uploading…" : "Upload report"}
      </button>
    </form>
  );
}
