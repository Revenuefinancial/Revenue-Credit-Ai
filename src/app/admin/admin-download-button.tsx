"use client";

import { useState } from "react";
import { getAdminDownloadUrl } from "./actions";

export function AdminDownloadButton({
  bucket,
  path,
  label = "Download",
}: {
  bucket: "credit-reports" | "dispute-letters" | "verification-documents";
  path: string;
  label?: string;
}) {
  const [loading, setLoading] = useState(false);

  async function open() {
    setLoading(true);
    const { url, error } = await getAdminDownloadUrl(bucket, path);
    setLoading(false);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
    else if (error) alert(error);
  }

  return (
    <button
      onClick={open}
      disabled={loading}
      className="rounded-rc border border-line bg-surface px-3 py-1.5 text-sm font-semibold text-brand transition hover:border-brand disabled:opacity-60"
    >
      {loading ? "Opening…" : label}
    </button>
  );
}
