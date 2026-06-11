"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signIn, signUp, type AuthState } from "./actions";

const initial: AuthState = {};

export function AuthForm({
  mode,
  next,
}: {
  mode: "signin" | "signup";
  next: string;
}) {
  const action = mode === "signin" ? signIn : signUp;
  const [state, formAction, pending] = useActionState(action, initial);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />

      {mode === "signup" && (
        <>
          <Field label="Full name">
            <input
              name="full_name"
              type="text"
              autoComplete="name"
              className={inputCls}
              placeholder="Jane Doe"
            />
          </Field>
          <Field label="Phone (for SMS updates)">
            <input
              name="phone"
              type="tel"
              autoComplete="tel"
              className={inputCls}
              placeholder="+1 555 000 0000"
            />
          </Field>
        </>
      )}

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

      <Field label="Password">
        <input
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
          className={inputCls}
          placeholder="••••••••"
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
        {pending
          ? "Please wait…"
          : mode === "signin"
            ? "Sign in"
            : "Create account"}
      </button>

      <p className="text-center text-sm text-muted">
        {mode === "signin" ? (
          <>
            New here?{" "}
            <Link href="/signup" className="font-semibold text-brand">
              Create an account
            </Link>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <Link href="/signin" className="font-semibold text-brand">
              Sign in
            </Link>
          </>
        )}
      </p>
    </form>
  );
}

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
