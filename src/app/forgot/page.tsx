import Link from "next/link";
import { ForgotForm } from "@/app/auth/reset-forms";
import { BRAND } from "@/lib/config";

export default function ForgotPasswordPage() {
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
            Reset your password
          </h1>
          <p className="mb-6 text-sm text-muted">
            Enter the email you signed up with and we&apos;ll send you a link to
            choose a new password.
          </p>
          <ForgotForm />
        </div>
      </div>
    </main>
  );
}
