import Link from "next/link";
import { AuthForm } from "@/app/auth/auth-form";
import { getSessionUser } from "@/lib/auth";
import { BRAND } from "@/lib/config";
import { redirect } from "next/navigation";

export default async function SignUpPage({
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
          <h1 className="mb-1 text-2xl font-bold text-ink">Create your account</h1>
          <p className="mb-6 text-sm text-muted">
            Start your credit repair journey in minutes.
          </p>
          <AuthForm mode="signup" next={next} />
        </div>
      </div>
    </main>
  );
}
