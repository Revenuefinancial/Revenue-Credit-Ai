import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

// Returns the signed-in auth user, or null. Uses getUser() (not getSession())
// so the token is verified against Supabase, not just read from the cookie.
export async function getSessionUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

// Server-side guard for client pages/actions. Redirects to /signin if absent.
export async function requireUser() {
  const user = await getSessionUser();
  if (!user) redirect("/signin");
  return user;
}

export async function getProfile(): Promise<Profile | null> {
  const user = await getSessionUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  return data as Profile | null;
}

// Server-side guard for admin pages/actions. Verifies the DB role, never
// trusts the client. Non-admins are bounced to their own dashboard.
export async function requireAdmin() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!data || data.role !== "admin") redirect("/dashboard");
  return user;
}
