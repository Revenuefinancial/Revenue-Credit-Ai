// Single source of truth for the app's public base URL.
//
// History: a hardcoded fallback to an old Vercel deployment domain
// (score-logic-pro.vercel.app) was left in checkout/notifications/auth. When
// NEXT_PUBLIC_APP_URL was pointed at that now-deleted deployment, every Stripe
// redirect, email link, and password-reset link resolved to Vercel's
// 404 DEPLOYMENT_NOT_FOUND page. This helper removes the dead fallback: it only
// ever resolves to a domain that is actually live.

// Normalize a host/URL into a clean absolute origin (no trailing slash).
function normalize(input: string): string {
  const trimmed = input.trim().replace(/\/+$/, "");
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

// Request-less contexts (emails sent from webhooks/server actions, password
// resets). Priority:
//   1. NEXT_PUBLIC_APP_URL          — explicit override (set to the live domain)
//   2. VERCEL_PROJECT_PRODUCTION_URL — Vercel-injected canonical prod domain
//   3. localhost                     — dev only
// Never falls back to a hardcoded (possibly deleted) deployment domain.
export function baseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) return normalize(explicit);
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercel) return normalize(vercel);
  return "http://localhost:3000";
}

// Request-bound handlers (e.g. the Stripe checkout redirect). Prefer the origin
// the request actually arrived on so we always return the user to the exact
// live domain they are browsing, then fall back to baseUrl().
export function baseUrlFromRequest(req: Request): string {
  const host =
    req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (host) {
    const proto = req.headers.get("x-forwarded-proto") ?? "https";
    return `${proto}://${host}`.replace(/\/+$/, "");
  }
  return baseUrl();
}
