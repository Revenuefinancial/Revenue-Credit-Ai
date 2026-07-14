"use client";

import { useActionState, useRef } from "react";
import {
  uploadVerificationDocument,
  type UploadState,
} from "./actions";
import { DownloadButton } from "./download-button";
import {
  VERIFICATION_CATEGORIES,
  REQUIRED_CATEGORIES,
  verificationSummary,
  type CategoryMeta,
} from "@/lib/verification";
import type { VerificationDocument, VerificationStatus } from "@/lib/types";

const initial: UploadState = {};

const STATUS_BADGE: Record<VerificationStatus, { label: string; cls: string }> = {
  approved: {
    label: "Approved",
    cls: "bg-[var(--rc-green)]/10 text-[var(--rc-green)]",
  },
  pending: {
    label: "In review",
    cls: "bg-[var(--rc-amber)]/10 text-[var(--rc-amber)]",
  },
  rejected: {
    label: "Needs another upload",
    cls: "bg-[var(--rc-red)]/10 text-[var(--rc-red)]",
  },
};

export function VerificationPanel({ docs }: { docs: VerificationDocument[] }) {
  const summary = verificationSummary(docs);
  const total = REQUIRED_CATEGORIES.length;
  const done = summary.state === "complete";

  return (
    <div>
      <p className="mb-4 text-sm text-muted">
        To verify your identity we need three documents. This protects your
        account and helps us get better results on your behalf. Your files are
        stored privately and encrypted — only you and our team can see them.
      </p>

      {/* At-a-glance progress so the client knows where they stand without
          scanning all three cards. */}
      {done ? (
        <div className="mb-5 flex items-center gap-2 rounded-xl border border-[var(--rc-green)]/30 bg-[var(--rc-green)]/10 px-4 py-3 text-sm font-semibold text-[var(--rc-green)]">
          <span aria-hidden>✓</span>
          Identity verified — thank you. Nothing else to do here.
        </div>
      ) : (
        <div className="mb-5">
          <div className="flex items-center justify-between text-xs font-semibold text-muted">
            <span>Verification progress</span>
            <span>
              {summary.approvedCount} of {total} approved
            </span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-line">
            <div
              className="h-full rounded-full bg-[var(--rc-green)] transition-all"
              style={{ width: `${(summary.approvedCount / total) * 100}%` }}
            />
          </div>
        </div>
      )}

      <div className="space-y-4">
        {VERIFICATION_CATEGORIES.map((cat) => (
          <CategoryCard
            key={cat.id}
            meta={cat}
            docs={docs
              .filter((d) => d.category === cat.id)
              .sort((a, b) => b.uploaded_at.localeCompare(a.uploaded_at))}
          />
        ))}
      </div>
    </div>
  );
}

function CategoryCard({
  meta,
  docs,
}: {
  meta: CategoryMeta;
  docs: VerificationDocument[];
}) {
  const [state, formAction, pending] = useActionState(
    uploadVerificationDocument,
    initial,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const latest = docs[0] ?? null;
  const approved = latest?.status === "approved";

  return (
    <div className="rounded-xl border border-line bg-bg p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-ink">{meta.title}</h3>
          <p className="mt-0.5 text-xs text-muted">{meta.hint}</p>
        </div>
        {latest && (
          <span
            className={`flex-none rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_BADGE[latest.status].cls}`}
          >
            {STATUS_BADGE[latest.status].label}
          </span>
        )}
      </div>

      {/* If the latest was rejected, surface the reason so the client knows
          what to fix before re-uploading. */}
      {latest?.status === "rejected" && (
        <p className="mt-3 rounded-lg bg-[var(--rc-red)]/10 px-3 py-2 text-xs text-[var(--rc-red)]">
          {latest.review_note
            ? `Our team asked for a new copy: ${latest.review_note}`
            : "Our team asked for a clearer copy. Please upload it again."}
        </p>
      )}

      {/* Previously uploaded files for this category. */}
      {docs.length > 0 && (
        <ul className="mt-3 divide-y divide-line border-y border-line">
          {docs.map((d) => (
            <li
              key={d.id}
              className="flex items-center justify-between gap-3 py-2 text-xs"
            >
              <span className="min-w-0 truncate text-ink-2">
                {d.doc_type ? `${d.doc_type} · ` : ""}
                {d.file_name}
                <span className="ml-2 text-muted">
                  {new Date(d.uploaded_at).toLocaleDateString()}
                </span>
              </span>
              <span className="flex flex-none items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 font-semibold ${STATUS_BADGE[d.status].cls}`}
                >
                  {STATUS_BADGE[d.status].label}
                </span>
                <DownloadButton
                  bucket="verification-documents"
                  path={d.file_path}
                  label="View"
                />
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* Upload form. Hidden once approved, but the client can still replace
          it via a small link if they need to. */}
      {approved ? (
        <details className="mt-3">
          <summary className="cursor-pointer text-xs font-semibold text-muted hover:text-brand">
            Replace this document
          </summary>
          <UploadFields
            meta={meta}
            formRef={formRef}
            formAction={formAction}
            state={state}
            pending={pending}
          />
        </details>
      ) : (
        <UploadFields
          meta={meta}
          formRef={formRef}
          formAction={formAction}
          state={state}
          pending={pending}
        />
      )}
    </div>
  );
}

function UploadFields({
  meta,
  formRef,
  formAction,
  state,
  pending,
}: {
  meta: CategoryMeta;
  formRef: React.RefObject<HTMLFormElement | null>;
  formAction: (formData: FormData) => void;
  state: UploadState;
  pending: boolean;
}) {
  return (
    <form ref={formRef} action={formAction} className="mt-3 flex flex-col gap-3">
      <input type="hidden" name="category" value={meta.id} />

      <label className="block">
        <span className="mb-1 block text-xs font-semibold text-muted">
          Which document is this?
        </span>
        <select
          name="doc_type"
          required
          defaultValue=""
          className="w-full rounded-lg border border-line bg-surface px-2.5 py-2 text-sm text-ink"
        >
          <option value="" disabled>
            Choose a document type…
          </option>
          {meta.docTypes.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </label>

      <input
        name="file"
        type="file"
        accept=".pdf,.png,.jpg,.jpeg"
        required
        className="block w-full text-sm text-ink-2 file:mr-4 file:rounded-rc file:border-0 file:bg-brand file:px-4 file:py-2 file:font-semibold file:text-white hover:file:bg-brand-2"
      />
      <p className="text-xs text-muted">PDF, PNG, or JPG · up to 10 MB</p>

      {state.error && (
        <p className="text-sm text-[var(--rc-red)]">{state.error}</p>
      )}
      {state.message && (
        <p className="text-sm text-[var(--rc-green)]">{state.message}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-rc bg-ink px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Uploading…" : "Upload document"}
      </button>
    </form>
  );
}
