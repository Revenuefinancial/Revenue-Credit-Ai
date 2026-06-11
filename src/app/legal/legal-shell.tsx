import Link from "next/link";
import { BRAND } from "@/lib/config";

// Shared layout for the static legal pages. NOTE for client: this is standard
// boilerplate to ship the build — have your attorney review the final copy,
// especially the credit-repair disclaimer (CROA compliance).
export function LegalShell({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto max-w-3xl px-5 py-4">
          <Link href="/" className="font-mono text-sm font-semibold text-brand">
            {BRAND.name}
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-5 py-10">
        <h1 className="text-3xl font-bold text-ink">{title}</h1>
        <p className="mt-2 text-sm text-muted">Last updated: {updated}</p>
        <div className="legal-prose mt-8 space-y-4 text-[15px] leading-relaxed text-ink-2">
          {children}
        </div>
        <div className="mt-12 flex gap-5 border-t border-line pt-6 text-sm text-muted">
          <Link href="/terms" className="hover:text-brand">
            Terms
          </Link>
          <Link href="/privacy" className="hover:text-brand">
            Privacy
          </Link>
          <Link href="/disclaimer" className="hover:text-brand">
            Disclaimer
          </Link>
        </div>
      </main>
    </div>
  );
}

export function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="pt-4 text-xl font-bold text-ink">{children}</h2>;
}
