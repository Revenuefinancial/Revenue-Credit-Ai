"use client";

import { useState, useTransition } from "react";
import { cancelAgreement } from "./actions";

export function CancelAgreementButton() {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  function onCancel() {
    if (!confirm("Cancel your agreement? Anything you've paid will be refunded in full.")) return;
    setMsg(null);
    setErr(null);
    startTransition(async () => {
      const res = await cancelAgreement();
      if (res.error) setErr(res.error);
      else setMsg(res.message ?? "Canceled.");
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        onClick={onCancel}
        disabled={pending || !!msg}
        className="rounded-rc border border-line bg-surface px-4 py-2 text-sm font-semibold text-ink-2 transition hover:bg-line-soft disabled:opacity-60"
      >
        {pending ? "Canceling…" : "Cancel agreement (free)"}
      </button>
      {err && <span className="text-sm text-[var(--rc-red)]">{err}</span>}
      {msg && <span className="text-sm text-[var(--rc-green)]">{msg}</span>}
    </div>
  );
}
