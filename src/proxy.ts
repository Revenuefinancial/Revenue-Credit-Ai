import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy-session";

// Next 16 renamed `middleware` -> `proxy`. Refreshes the Supabase session
// and guards /dashboard and /admin. NOTE: server actions must still verify
// auth themselves — proxy coverage is not a substitute (see Next data-security docs).
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
