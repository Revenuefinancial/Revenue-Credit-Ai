"use client";

import { useState, useTransition } from "react";
import { reviewVerificationDocument } from "./actions";
import { AdminDownloadButton } from "./admin-download-button";
import {
  VERIFICATION_CATEGORIES,
  verificationSummary,
} from "@/lib/verification";
import type { VerificationDocument, VerificationStatus } from "@/lib/types";

const STATUS_BADGE: Record<VerificationStatus, { label: string; cls: string }> = {
  approved: {
    label: "Approved",
    cls: "bg-[var(--rc-green)]/10 text-[var(--rc-green)]",
  },
  pending: {
    label: "Awaiting review",
    cls: "bg-[var(--rc-amber)]/10 text-[var(--rc-amber)]",
  },
  rejected: {
    label: "Rejected",
    cls: "bg-[var(--rc-red)]/10 text-[var(--rc-red)]",
  },
};

export function VerificationReviewPanel({
  docs,
}: {
  docs: VerificationDocument[];
}) {
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<{ kind: "ok" | "err"; text: string } | null>(
    null,
  );
  const summary = verificationSummary(docs);

  function run(fn: () => Promise<{ error?: string; message?: string }>) {
    setNotice(null);
    startTransition(async () => {
      const res = await fn();
      if (res.error) setNotice({ kind: "err", text: res.error });
      else if (res.message) setNotice({ kind: "ok", text: res.message });
    });
  }

  const overall =
    summary.state === "complete"
      ? { label: "Verified", cls: "bg-[var(--rc-green)]/10 text-[var(--rc-green)]" }
      : summary.state === "action_needed"
        ? { label: "Re-upload requested", cls: "bg-[var(--rc-red)]/10 text-[var(--rc-red)]" }
        : summary.state === "in_review"
          ? { label: "Documents to review", cls: "bg-[var(--rc-amber)]/10 text-[var(--rc-amber)]" }
          : { label: "Not started", cls: "bg-line-soft text-muted" };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-muted">
          Review each document, then approve or reject it. Rejecting emails the
          client to upload a clearer copy.
        </p>
        <span
          className={`flex-none rounded-full px-2.5 py-0.5 text-xs font-semibold ${overall.cls}`}
        >
          {overall.label}
        </span>
      </div>

      {notice && (
        <p
          className={`mb-3 rounded-lg px-3 py-2 text-sm ${
            notice.kind === "ok"
              ? "bg-[var(--rc-green)]/10 text-[var(--rc-green)]"
              : "bg-[var(--rc-red)]/10 text-[var(--rc-red)]"
          }`}
        >
          {notice.text}
        </p>
      )}

      <div className="space-y-5">
        {VERIFICATION_CATEGORIES.map((cat) => {
          const catDocs = docs
            .filter((d) => d.category === cat.id)
            .sort((a, b) => b.uploaded_at.localeCompare(a.uploaded_at));
          return (
            <div key={cat.id}>
              <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted">
                {cat.title}
              </h3>
              {catDocs.length === 0 ? (
                <p className="text-sm text-muted">Not uploaded yet.</p>
              ) : (
                <div className="space-y-2">
                  {catDocs.map((d) => (
                    <DocRow
                      key={d.id}
                      doc={d}
                      pending={pending}
                      onReview={(decision, note) =>
                        run(() =>
                          reviewVerificationDocument(d.id, decision, note),
                        )
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DocRow({
  doc,
  pending,
  onReview,
}: {
  doc: VerificationDocument;
  pending: boolean;
  onReview: (decision: "approved" | "rejected", note: string) => void;
  }) {
  const [note, setNote] = useState(doc.review_note ?? "");
  const [rejecting, setRejecting] = useState(false);

  return (
    <div className="rounded-xl border border-line bg-bg p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink">
            {doc.doc_type ?? "Document"}
          </p>
          <p className="truncate text-xs text-muted">
            {doc.file_name}
            <span className="ml-2">
              {new Date(doc.uploaded_at).toLocaleDateString()}
            </span>
          </p>
        </div>
        <span className="flex flex-none items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_BADGE[doc.status].cls}`}
          >
            {STATUS_BADGE[doc.status].label}
          </span>
          <AdminDownloadButton
            bucket="verification-documents"
            path={doc.file_path}
            label="View"
          />
        </span>
      </div>

      {doc.status === "rejected" && doc.review_note && (
        <p className="mt-2 text-xs text-muted">Reason given: {doc.review_note}</p>
      )}

      {rejecting ? (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Reason (e.g. blurry, cut off, expired)"
            className="min-w-48 flex-1 rounded-lg border border-line bg-surface px-2 py-1.5 text-xs text-ink"
          />
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              onReview("rejected", note);
              setRejecting(false);
            }}
            className="rounded-lg bg-[var(--rc-red)] px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            Confirm reject
          </button>
          <button
            type="button"
            onClick={() => setRejecting(false)}
            className="rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink transition hover:bg-line-soft"
          >
            Cancel
          </button>
        </div>
      ) : (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={pending || doc.status === "approved"}
            onClick={() => onReview("approved", "")}
            className="rounded-lg bg-[var(--rc-green)] px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
          >
            {doc.status === "approved" ? "Approved" : "Approve"}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => setRejecting(true)}
            className="rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink transition hover:bg-line-soft disabled:opacity-50"
          >
            Reject
          </button>
        </div>
      )}
    </div>
  );
}
