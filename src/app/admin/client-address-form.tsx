"use client";

import { useState, useTransition } from "react";
import { saveClientAddress } from "./actions";

export function ClientAddressForm({
  userId,
  current,
}: {
  userId: string;
  current: string | null;
}) {
  const [value, setValue] = useState(current ?? "");
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<string | null>(null);

  function save() {
    setNotice(null);
    startTransition(async () => {
      const res = await saveClientAddress(userId, value);
      setNotice(res.error ?? res.message ?? null);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted">
        Printed at the top of every generated letter. If the client hasn&apos;t
        provided it, you can enter it here so letters come out fully filled in.
      </p>
      <textarea
        rows={4}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={"Full name\nStreet address\nCity, State ZIP"}
        className="w-full rounded-rc border border-line bg-surface px-4 py-3 text-sm text-ink outline-none transition focus:border-brand"
      />
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="rounded-rc border border-line bg-surface px-4 py-2 text-sm font-semibold text-ink transition hover:bg-line-soft disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save address"}
        </button>
        {notice && <span className="text-sm text-muted">{notice}</span>}
      </div>
    </div>
  );
}
