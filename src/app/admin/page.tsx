import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { signOut } from "@/app/auth/actions";
import { BRAND, PLANS } from "@/lib/config";
import type { Order, Profile, CreditReport, DisputeLetter } from "@/lib/types";

export default async function AdminPage() {
  await requireAdmin();
  const db = createAdminClient();

  const [{ data: profiles }, { data: orders }, { data: reports }, { data: letters }] =
    await Promise.all([
      db.from("profiles").select("*").order("created_at", { ascending: false }),
      db.from("orders").select("*"),
      db.from("credit_reports").select("*"),
      db.from("dispute_letters").select("*"),
    ]);

  const clients = (profiles as Profile[] | null) ?? [];
  const allOrders = (orders as Order[] | null) ?? [];
  const allReports = (reports as CreditReport[] | null) ?? [];
  const allLetters = (letters as DisputeLetter[] | null) ?? [];

  const rows = clients
    .filter((c) => c.role === "client")
    .map((c) => {
      const co = allOrders.filter((o) => o.user_id === c.id);
      const active = co.find((o) => o.status === "active" || o.status === "completed");
      const paid = co
        .filter((o) => o.status === "active" || o.status === "completed")
        .reduce((sum, o) => sum + (o.amount_cents ?? 0), 0);
      return {
        client: c,
        plan: active ? PLANS[active.plan_id].name : "—",
        status: active ? "Active" : co.length ? "Pending" : "No order",
        reports: allReports.filter((r) => r.user_id === c.id).length,
        letters: allLetters.filter((l) => l.user_id === c.id).length,
        paid,
      };
    });

  const totalRevenue = allOrders
    .filter((o) => o.status === "active" || o.status === "completed")
    .reduce((s, o) => s + (o.amount_cents ?? 0), 0);

  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <span className="font-mono text-sm font-semibold text-brand">
            {BRAND.name} · Admin
          </span>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/dashboard" className="font-semibold text-ink-2">
              My dashboard
            </Link>
            <form action={signOut}>
              <button className="font-semibold text-ink-2 hover:text-ink">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-8">
        <h1 className="text-2xl font-bold text-ink">Clients</h1>

        <div data-tour="stats" className="mt-4 grid gap-4 sm:grid-cols-3">
          <Stat label="Clients" value={String(rows.length)} />
          <Stat
            label="Reports uploaded"
            value={String(allReports.length)}
          />
          <Stat
            label="Revenue (paid)"
            value={`$${(totalRevenue / 100).toLocaleString()}`}
          />
        </div>

        <div
          data-tour="clients"
          className="mt-6 overflow-hidden rounded-2xl border border-line bg-surface shadow-sm"
        >
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-bg/50 text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-5 py-3">Client</th>
                <th className="px-5 py-3">Plan</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Reports</th>
                <th className="px-5 py-3">Letters</th>
                <th className="px-5 py-3">Paid</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-muted">
                    No clients yet.
                  </td>
                </tr>
              )}
              {rows.map(({ client, plan, status, reports, letters, paid }) => (
                <tr key={client.id} className="hover:bg-bg/40">
                  <td className="px-5 py-3">
                    <div className="font-semibold text-ink">
                      {client.full_name ?? "—"}
                    </div>
                    <div className="text-xs text-muted">{client.email}</div>
                  </td>
                  <td className="px-5 py-3 text-ink-2">{plan}</td>
                  <td className="px-5 py-3">
                    <StatusBadge status={status} />
                  </td>
                  <td className="px-5 py-3 text-ink-2">{reports}</td>
                  <td className="px-5 py-3 text-ink-2">{letters}</td>
                  <td className="px-5 py-3 text-ink-2">
                    ${(paid / 100).toLocaleString()}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Link
                      href={`/admin/${client.id}`}
                      className="font-semibold text-brand"
                    >
                      Manage →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
      <div className="text-xs uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-1 text-2xl font-bold text-ink">{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "Active"
      ? "bg-[var(--rc-green)]/10 text-[var(--rc-green)]"
      : status === "Pending"
        ? "bg-[var(--rc-amber)]/10 text-[var(--rc-amber)]"
        : "bg-line-soft text-muted";
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>
      {status}
    </span>
  );
}
