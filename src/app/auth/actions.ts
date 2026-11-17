"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { notifyWelcome, notifyAdminNewSignup } from "@/lib/notifications";
import { baseUrl } from "@/lib/url";

const appUrl = () => baseUrl();

export interface AuthState {
  error?: string;
  message?: string;
}

const credentials = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

// supabase-js surfaces Node's raw "fetch failed" when the server can't reach
// Supabase at all (paused project, wrong NEXT_PUBLIC_SUPABASE_URL, DNS).
// Log the real cause for the server logs and show users a friendly message.
function authErrorMessage(error: { message: string; name?: string; cause?: unknown }): string {
  const unreachable =
    error.name === "AuthRetryableFetchError" || /fetch failed/i.test(error.message);
  if (!unreachable) return error.message;
  console.error("[auth] Supabase unreachable", {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "(NEXT_PUBLIC_SUPABASE_URL not set)",
    message: error.message,
    cause: error.cause,
  });
  return "We couldn't reach our sign-in service. Please try again in a few minutes.";
}

function safeNext(next: FormDataEntryValue | null): string {
  const value = typeof next === "string" ? next : "";
  // Only allow internal paths — never an absolute URL (open-redirect guard).
  return value.startsWith("/") && !value.startsWith("//") ? value : "/dashboard";
}

export async function signIn(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = credentials.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: authErrorMessage(error) };

  redirect(safeNext(formData.get("next")));
}

export async function signUp(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = credentials.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const fullName = (formData.get("full_name") as string | null)?.trim() || null;
  const phone = (formData.get("phone") as string | null)?.trim() || null;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { data: { full_name: fullName, phone } },
  });
  if (error) return { error: authErrorMessage(error) };

  // Welcome the new client + ping the admin. Both are best-effort no-ops when
  // their transport keys aren't set, so they never block signup.
  await notifyWelcome(parsed.data.email, fullName);
  await notifyAdminNewSignup(parsed.data.email, fullName);

  // If email confirmation is enabled, there's no session yet.
  if (!data.session) {
    return {
      message: "Account created. Check your email to confirm, then sign in.",
    };
  }

  redirect(safeNext(formData.get("next")));
}

const emailOnly = z.object({
  email: z.string().email("Enter a valid email address."),
});

// Step 1 of password reset: email the user a recovery link. We always return
// the same success message (even for unknown emails) to avoid leaking which
// addresses have accounts.
export async function requestPasswordReset(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = emailOnly.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid email." };
  }

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${appUrl()}/auth/callback?next=/reset`,
  });

  return {
    message:
      "If an account exists for that email, we've sent a password reset link. Check your inbox.",
  };
}

// Step 2 of password reset: set the new password. The recovery link puts the
// user into an authenticated session (via /auth/callback), so updateUser works.
export async function updatePassword(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }
  if (password !== confirm) {
    return { error: "Passwords do not match." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      error:
        "Your reset link has expired or is invalid. Request a new one from the forgot-password page.",
    };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: authErrorMessage(error) };

  return { message: "Password updated. You can now use it to sign in." };
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
