import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { signOut } from "@/app/auth/actions";
import { TutorialsHub } from "@/app/admin/tutorials-hub";
import { BRAND, PLANS } from "@/lib/config";
import type {
  Order,
  Profile,
  CreditReport,
  DisputeLetter,
  LetterDraft,
  DisputeItem,
  Agreement,
  VerificationDocument,
} from "@/lib/types";
import { daysUntil, isWin } from "@/lib/dispute";
import {
  verificationSummary,
  type VerificationState,
} from "@/lib/verification";
import {
  agreementStatus,
  refundWindow,
  REFUND_MIN_ITEMS,
  REFUND_WINDOW_DAYS,
  type AgreementStatus,
  type RefundWindow,
} from "@/lib/compliance";

export default async function AdminPage() {
  const admin = await requireAdmin();
  const db = createAdminClient();

  const [
    { data: profiles },
    { data: orders },
    { data: reports },
    { data: letters },
    { data: drafts },
    { data: items },
    { data: agreements },
    { data: verifications },
  ] = await Promise.all([
    db.from("profiles").select("*").order("created_at", { ascending: false }),
    db.from("orders").select("*"),
    db.from("credit_reports").select("*"),
    db.from("dispute_letters").select("*"),
    db.from("letter_drafts").select("*"),
    db.from("dispute_items").select("*"),
    db.from("agreements").select("*"),
    db.from("verification_documents").select("*"),
  ]);

  const clients = (profiles as Profile[] | null) ?? [];
  const allOrders = (orders as Order[] | null) ?? [];
  const allReports = (reports as CreditReport[] | null) ?? [];
  const allLetters = (letters as DisputeLetter[] | null) ?? [];
  const allDrafts = (drafts as LetterDraft[] | null) ?? [];
  const allItems = (items as DisputeItem[] | null) ?? [];
  const allAgreements = (agreements as Agreement[] | null) ?? [];
  const allVerifications =
    (verifications as VerificationDocument[] | null) ?? [];

  const nameOf = (uid: string) => {
    const c = clients.find((p) => p.id === uid);
    return c?.full_name ?? c?.email ?? "Unknown client";
  };

  // Who shows up as a manageable client: anyone with role "client", PLUS any
  // account that has real client activity (an order, report, dispute item, or
  // agreement) even if their role is "admin". This is what lets the owner test
  // by paying through their own admin account and still see/manage that work —
  // while empty staff/admin accounts stay out of the list.
  const activityIds = new Set<string>([
    ...allOrders.map((o) => o.user_id),
    ...allReports.map((r) => r.user_id),
    ...allItems.map((i) => i.user_id),
    ...allAgreements.map((a) => a.user_id),
  ]);
  const manageable = clients.filter(
    (c) => c.role === "client" || activityIds.has(c.id),
  );

  // ── Worklist buckets ──────────────────────────────────────────────
  // 1) Reports uploaded but no AI drafts generated yet.
  const draftedUserIds = new Set(allDrafts.map((d) => d.user_id));
  const needsDraft = manageable.filter(
    (c) =>
      allReports.some((r) => r.user_id === c.id) && !draftedUserIds.has(c.id),
  );

  // 2) Drafts awaiting admin approval.
  const awaitingApproval = allDrafts.filter((d) => d.status === "draft");
  const awaitingApprovalUsers = [
    ...new Set(awaitingApproval.map((d) => d.user_id)),
  ];

  // 3) Sent items whose 35-day clock has run out — bureau response is due.
  const overdue = allItems.filter(
    (i) => i.status === "sent" && (daysUntil(i.response_due_at) ?? 1) < 0,
  );
  const overdueUsers = [...new Set(overdue.map((i) => i.user_id))];

  // 4) Sent items still inside the window.
  const awaitingBureau = allItems.filter(
    (i) => i.status === "sent" && (daysUntil(i.response_due_at) ?? 1) >= 0,
  );

  // 5) Clients with verification documents waiting on a manual approve/reject.
  const docsToReview = manageable.filter((c) => {
    const s = verificationSummary(
      allVerifications.filter((v) => v.user_id === c.id),
    );
    return s.state === "in_review";
  });

  const rows = manageable
    .map((c) => {
      const co = allOrders.filter((o) => o.user_id === c.id);
      const activeOrders = co.filter(
        (o) => o.status === "active" || o.status === "completed",
      );
      const active = activeOrders[0];
      const paid = activeOrders.reduce((sum, o) => sum + (o.amount_cents ?? 0), 0);

      // Compliance: where this client stands on the signed agreement.
      const compliance = agreementStatus(
        allAgreements.filter((a) => a.user_id === c.id),
      );

      // Results + refund window: service starts at the earliest paid order.
      const myItems = allItems.filter((i) => i.user_id === c.id);
      const wins = myItems.filter((i) => isWin(i.status)).length;
      const serviceStart = activeOrders
        .map((o) => o.created_at)
        .sort()[0] ?? null;
      const refund = refundWindow(serviceStart);

      const verification = verificationSummary(
        allVerifications.filter((v) => v.user_id === c.id),
      );

      return {
        client: c,
        isSelf: c.id === admin.id,
        plan: active ? PLANS[active.plan_id].name : "—",
        status: active ? "Active" : co.length ? "Pending" : "No order",
        reports: allReports.filter((r) => r.user_id === c.id).length,
        letters: allLetters.filter((l) => l.user_id === c.id).length,
        paid,
        compliance,
        disputed: myItems.length,
        wins,
        refund,
        verification: verification.state,
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
        <h1 className="text-2xl font-bold text-ink">Worklist</h1>
        <p className="mt-1 text-sm text-muted">
          What needs your attention right now, in order.
        </p>

        <div
          data-tour="worklist"
          className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5"
        >
          <WorkCard
            tone="amber"
            count={docsToReview.length}
            title="Docs to review"
            sub="ID verification awaiting approval"
            users={docsToReview.map((c) => ({ id: c.id, name: nameOf(c.id) }))}
          />
          <WorkCard
            tone="amber"
            count={needsDraft.length}
            title="Reports to draft"
            sub="Uploaded, no AI letters yet"
            users={needsDraft.map((c) => ({ id: c.id, name: nameOf(c.id) }))}
          />
          <WorkCard
            tone="amber"
            count={awaitingApproval.length}
            title="Drafts to approve"
            sub="Awaiting your review"
            users={awaitingApprovalUsers.map((u) => ({ id: u, name: nameOf(u) }))}
          />
          <WorkCard
            tone="red"
            count={overdue.length}
            title="Responses overdue"
            sub="35-day clock elapsed"
            users={overdueUsers.map((u) => ({ id: u, name: nameOf(u) }))}
          />
          <WorkCard
            tone="blue"
            count={awaitingBureau.length}
            title="Awaiting bureau"
            sub="Inside the 35-day window"
            users={[]}
          />
        </div>

        <h2 className="mt-10 text-2xl font-bold text-ink">Clients</h2>

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
                <th className="px-5 py-3">Order</th>
                <th className="px-5 py-3">Agreement</th>
                <th className="px-5 py-3">Results</th>
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
              {rows.map((r) => (
                <tr key={r.client.id} className="hover:bg-bg/40">
                  <td className="px-5 py-3">
                    <div className="font-semibold text-ink">
                      {r.client.full_name ?? "—"}
                      {r.isSelf && (
                        <span className="ml-2 rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand">
                          You
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted">{r.client.email}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
                      <span>
                        {r.reports} report{r.reports === 1 ? "" : "s"} ·{" "}
                        {r.letters} letter{r.letters === 1 ? "" : "s"}
                      </span>
                      <VerificationBadge state={r.verification} />
                    </div>
                  </td>
                  <td className="px-5 py-3 text-ink-2">{r.plan}</td>
                  <td className="px-5 py-3">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="px-5 py-3">
                    <AgreementCell compliance={r.compliance} />
                  </td>
                  <td className="px-5 py-3">
                    <ResultsCell
                      disputed={r.disputed}
                      wins={r.wins}
                      refund={r.refund}
                    />
                  </td>
                  <td className="px-5 py-3 text-ink-2">
                    ${(r.paid / 100).toLocaleString()}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Link
                      href={`/admin/${r.client.id}`}
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

        <TutorialsHub />
      </main>
    </div>
  );
}

function WorkCard({
  tone,
  count,
  title,
  sub,
  users,
}: {
  tone: "amber" | "red" | "blue";
  count: number;
  title: string;
  sub: string;
  users: { id: string; name: string }[];
}) {
  const accent =
    count === 0
      ? "text-muted"
      : tone === "red"
        ? "text-[var(--rc-red)]"
        : tone === "amber"
          ? "text-[var(--rc-amber)]"
          : "text-brand";
  // De-dupe names while preserving order.
  const seen = new Set<string>();
  const unique = users.filter((u) =>
    seen.has(u.id) ? false : (seen.add(u.id), true),
  );
  return (
    <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
      <div className={`text-3xl font-bold ${accent}`}>{count}</div>
      <div className="mt-1 text-sm font-semibold text-ink">{title}</div>
      <div className="text-xs text-muted">{sub}</div>
      {unique.length > 0 && (
        <ul className="mt-3 space-y-1">
          {unique.slice(0, 4).map((u) => (
            <li key={u.id}>
              <Link
                href={`/admin/${u.id}`}
                className="text-xs font-semibold text-brand hover:underline"
              >
                {u.name} →
              </Link>
            </li>
          ))}
          {unique.length > 4 && (
            <li className="text-xs text-muted">+{unique.length - 4} more</li>
          )}
        </ul>
      )}
    </div>
  );
}

function AgreementCell({ compliance }: { compliance: AgreementStatus }) {
  let label: string;
  let cls: string;
  let sub: string | null = null;

  if (compliance.canceled) {
    label = "Canceled";
    cls = "bg-[var(--rc-red)]/10 text-[var(--rc-red)]";
  } else if (compliance.accepted && compliance.cancelable) {
    label = "In cancel window";
    cls = "bg-[var(--rc-amber)]/10 text-[var(--rc-amber)]";
    sub = compliance.deadline
      ? `Hold billing until ${new Date(compliance.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })} — don't bill yet`
      : "don't bill yet";
  } else if (compliance.accepted) {
    label = "Signed";
    cls = "bg-[var(--rc-green)]/10 text-[var(--rc-green)]";
  } else {
    label = "Not signed";
    cls = "bg-line-soft text-muted";
  }

  return (
    <div>
      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>
        {label}
      </span>
      {sub && <div className="mt-1 text-xs text-muted">{sub}</div>}
    </div>
  );
}

function ResultsCell({
  disputed,
  wins,
  refund,
}: {
  disputed: number;
  wins: number;
  refund: RefundWindow;
}) {
  if (disputed === 0 && !refund.started) {
    return <span className="text-xs text-muted">—</span>;
  }

  // Wins toward the refund floor drive the color: hitting the 3-item minimum
  // before the window closes is the goal.
  const tone =
    wins >= REFUND_MIN_ITEMS
      ? "text-[var(--rc-green)]"
      : refund.elapsed
        ? "text-[var(--rc-red)]"
        : "text-ink";

  return (
    <div>
      <div className={`text-sm font-semibold ${tone}`}>
        {wins} removed
        <span className="font-normal text-muted"> / {disputed} disputed</span>
      </div>
      {refund.started && (
        <div className="text-xs text-muted">
          {refund.elapsed
            ? `180-day window closed`
            : `Day ${refund.daysIn} of ${REFUND_WINDOW_DAYS} · ${refund.daysLeft} left`}
        </div>
      )}
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

function VerificationBadge({ state }: { state: VerificationState }) {
  if (state === "not_started") return null;
  const meta =
    state === "complete"
      ? { label: "ID verified", cls: "bg-[var(--rc-green)]/10 text-[var(--rc-green)]" }
      : state === "action_needed"
        ? { label: "ID re-upload", cls: "bg-[var(--rc-red)]/10 text-[var(--rc-red)]" }
        : { label: "ID to review", cls: "bg-[var(--rc-amber)]/10 text-[var(--rc-amber)]" };
  return (
    <span className={`rounded-full px-2 py-0.5 font-semibold ${meta.cls}`}>
      {meta.label}
    </span>
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
