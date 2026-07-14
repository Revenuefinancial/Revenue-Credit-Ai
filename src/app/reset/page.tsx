import Link from "next/link";
import { ResetForm } from "@/app/auth/reset-forms";
import { BRAND } from "@/lib/config";

export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-4 py-12">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="mb-8 block text-center font-mono text-sm font-semibold tracking-tight text-brand"
        >
          {BRAND.name}
        </Link>
        <div className="rounded-2xl border border-line bg-surface p-8 shadow-sm">
          <h1 className="mb-1 text-2xl font-bold text-ink">
            Choose a new password
          </h1>
          <p className="mb-6 text-sm text-muted">
            Pick a strong password you haven&apos;t used before.
          </p>
          <ResetForm />
        </div>
      </div>
    </main>
  );
}
