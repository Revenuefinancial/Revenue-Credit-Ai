"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  requestPasswordReset,
  updatePassword,
  type AuthState,
} from "./actions";

const initial: AuthState = {};

const inputCls =
  "w-full rounded-rc border border-line bg-surface px-4 py-3 text-ink outline-none transition focus:border-brand";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-2">
      {label}
      {children}
    </label>
  );
}

export function ForgotForm() {
  const [state, formAction, pending] = useActionState(
    requestPasswordReset,
    initial,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Field label="Email">
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className={inputCls}
          placeholder="you@email.com"
        />
      </Field>

      {state.error && (
        <p className="text-sm text-[var(--rc-red)]" aria-live="polite">
          {state.error}
        </p>
      )}
      {state.message && (
        <p className="text-sm text-[var(--rc-green)]" aria-live="polite">
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-1 rounded-rc bg-brand px-4 py-3 font-semibold text-white transition hover:bg-brand-2 disabled:opacity-60"
      >
        {pending ? "Sending…" : "Send reset link"}
      </button>

      <p className="text-center text-sm text-muted">
        Remembered it?{" "}
        <Link href="/signin" className="font-semibold text-brand">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}

export function ResetForm() {
  const [state, formAction, pending] = useActionState(updatePassword, initial);
  const done = Boolean(state.message);

  if (done) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-[var(--rc-green)]">{state.message}</p>
        <Link
          href="/signin"
          className="rounded-rc bg-brand px-4 py-3 text-center font-semibold text-white transition hover:bg-brand-2"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Field label="New password">
        <input
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={inputCls}
          placeholder="••••••••"
        />
      </Field>
      <Field label="Confirm new password">
        <input
          name="confirm"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={inputCls}
          placeholder="••••••••"
        />
      </Field>

      {state.error && (
        <p className="text-sm text-[var(--rc-red)]" aria-live="polite">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-1 rounded-rc bg-brand px-4 py-3 font-semibold text-white transition hover:bg-brand-2 disabled:opacity-60"
      >
        {pending ? "Saving…" : "Update password"}
      </button>
    </form>
  );
}
