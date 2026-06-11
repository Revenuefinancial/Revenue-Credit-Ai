import Link from "next/link";

export default function CheckoutCancelPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-8 text-center shadow-sm">
        <h1 className="mb-2 text-2xl font-bold text-ink">Checkout canceled</h1>
        <p className="mb-6 text-sm text-muted">
          No charge was made. You can pick a plan again whenever you&apos;re
          ready.
        </p>
        <Link
          href="/dashboard"
          className="inline-block rounded-rc bg-brand px-6 py-3 font-semibold text-white transition hover:bg-brand-2"
        >
          Back to dashboard
        </Link>
      </div>
    </main>
  );
}
