"use client";

import { useState, useTransition } from "react";
import {
  generateDrafts,
  saveDraft,
  approveDraft,
  rejectDraft,
} from "./actions";
import { GeneratingOverlay } from "./generating-overlay";
import type { CreditReport, LetterDraft } from "@/lib/types";

export function AiLetters({
  userId,
  reports,
  drafts,
}: {
  userId: string;
  reports: CreditReport[];
  drafts: LetterDraft[];
}) {
  const [pending, startTransition] = useTransition();
  const [generating, setGenerating] = useState(false);
  const [notice, setNotice] = useState<{ kind: "ok" | "err"; text: string } | null>(
    null,
  );

  const latestReport = reports[0];

  function run(fn: () => Promise<{ error?: string; message?: string }>) {
    setNotice(null);
    startTransition(async () => {
      const res = await fn();
      if (res.error) setNotice({ kind: "err", text: res.error });
      else if (res.message) setNotice({ kind: "ok", text: res.message });
    });
  }

  function handleGenerate() {
    if (!latestReport) return;
    setNotice(null);
    setGenerating(true);
    startTransition(async () => {
      const res = await generateDrafts(userId, latestReport.id);
      setGenerating(false);
      if (res.error) setNotice({ kind: "err", text: res.error });
      else if (res.message) setNotice({ kind: "ok", text: res.message });
    });
  }

  // Group drafts by round, newest first.
  const rounds = [...new Set(drafts.map((d) => d.round))].sort((a, b) => b - a);

  return (
    <div>
      {generating && <GeneratingOverlay />}
      <p className="mb-4 text-sm text-muted">
        Generate dispute letters from the client&apos;s uploaded report with AI,
        then review and approve each one. <strong>Nothing is sent to the client
        until you approve it.</strong>
      </p>

      {latestReport ? (
        <button
          type="button"
          disabled={pending}
          onClick={handleGenerate}
          className="rounded-rc bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-2 disabled:opacity-60"
        >
          {pending ? "Working…" : "✨ Generate AI dispute letters"}
        </button>
      ) : (
        <p className="text-sm text-muted">
          The client hasn&apos;t uploaded a report yet — nothing to draft from.
        </p>
      )}

      {latestReport && (
        <p className="mt-2 text-xs text-muted">
          Drafts from: {latestReport.file_name}
        </p>
      )}

      {notice && (
        <p
          className={`mt-3 rounded-lg px-3 py-2 text-sm ${
            notice.kind === "ok"
              ? "bg-[var(--rc-green)]/10 text-[var(--rc-green)]"
              : "bg-[var(--rc-red)]/10 text-[var(--rc-red)]"
          }`}
        >
          {notice.text}
        </p>
      )}

      {rounds.map((round) => (
        <div key={round} className="mt-6">
          <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted">
            Round {round}
          </h3>
          <div className="space-y-3">
            {drafts
              .filter((d) => d.round === round)
              .map((d) => (
                <DraftCard
                  key={d.id}
                  draft={d}
                  pending={pending}
                  onSave={(subject, body) =>
                    run(() => saveDraft(d.id, subject, body))
                  }
                  onApprove={() => run(() => approveDraft(d.id))}
                  onReject={() => run(() => rejectDraft(d.id))}
                />
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function DraftCard({
  draft,
  pending,
  onSave,
  onApprove,
  onReject,
}: {
  draft: LetterDraft;
  pending: boolean;
  onSave: (subject: string, body: string) => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState(draft.subject ?? "");
  const [body, setBody] = useState(draft.body);
  const dirty = subject !== (draft.subject ?? "") || body !== draft.body;

  const badge =
    draft.status === "approved"
      ? "bg-[var(--rc-green)]/10 text-[var(--rc-green)]"
      : draft.status === "rejected"
        ? "bg-line-soft text-muted"
        : "bg-[var(--rc-amber)]/10 text-[var(--rc-amber)]";

  return (
    <div className="rounded-xl border border-line bg-bg p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <span className="font-semibold text-ink">{draft.bureau}</span>
          {draft.subject && (
            <span className="ml-2 truncate text-sm text-muted">
              {draft.subject}
            </span>
          )}
        </div>
        <span
          className={`flex-none rounded-full px-2.5 py-0.5 text-xs font-semibold ${badge}`}
        >
          {draft.status}
        </span>
      </div>

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="mt-2 text-sm font-semibold text-brand"
      >
        {open ? "Hide letter" : "Review & edit letter"}
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject line"
            className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={16}
            className="w-full rounded-lg border border-line bg-surface px-3 py-2 font-mono text-xs leading-relaxed text-ink"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending || !dirty}
              onClick={() => onSave(subject, body)}
              className="rounded-lg border border-line bg-surface px-3 py-1.5 text-sm font-semibold text-ink transition hover:bg-line-soft disabled:opacity-50"
            >
              Save edits
            </button>
            {draft.status !== "approved" && (
              <button
                type="button"
                disabled={pending || dirty}
                title={dirty ? "Save your edits first" : ""}
                onClick={onApprove}
                className="rounded-lg bg-[var(--rc-green)] px-3 py-1.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
              >
                Approve &amp; release
              </button>
            )}
            {draft.status !== "rejected" && (
              <button
                type="button"
                disabled={pending}
                onClick={onReject}
                className="rounded-lg border border-line bg-surface px-3 py-1.5 text-sm font-semibold text-muted transition hover:bg-line-soft disabled:opacity-50"
              >
                Reject
              </button>
            )}
            {draft.status === "approved" && (
              <a
                href={`/api/letters/draft/${draft.id}/pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-brand-2"
              >
                Download packet (PDF)
              </a>
            )}
          </div>
          {dirty && (
            <p className="text-xs text-[var(--rc-amber)]">
              You have unsaved edits — save before approving.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
