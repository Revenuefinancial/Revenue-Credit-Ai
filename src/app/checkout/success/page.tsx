import Link from "next/link";

export default function CheckoutSuccessPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-8 text-center shadow-sm">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--rc-green)]/10 text-3xl text-[var(--rc-green)]">
          ✓
        </div>
        <h1 className="mb-2 text-2xl font-bold text-ink">Payment successful</h1>
        <p className="mb-6 text-sm text-muted">
          Your plan is now active. Head to your dashboard to upload your credit
          report and track your dispute progress.
        </p>
        <Link
          href="/dashboard"
          className="inline-block rounded-rc bg-brand px-6 py-3 font-semibold text-white transition hover:bg-brand-2"
        >
          Go to dashboard
        </Link>
      </div>
    </main>
  );
}
