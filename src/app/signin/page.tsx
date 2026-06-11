import Link from "next/link";
import { AuthForm } from "@/app/auth/auth-form";
import { getSessionUser } from "@/lib/auth";
import { BRAND } from "@/lib/config";
import { redirect } from "next/navigation";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  if (await getSessionUser()) redirect("/dashboard");
  const { next = "/dashboard" } = await searchParams;

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
          <h1 className="mb-1 text-2xl font-bold text-ink">Welcome back</h1>
          <p className="mb-6 text-sm text-muted">
            Sign in to track your credit repair progress.
          </p>
          <AuthForm mode="signin" next={next} />
        </div>
      </div>
    </main>
  );
}
