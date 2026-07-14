import Link from "next/link";
import { TOUR_CATALOG } from "@/lib/tours";

// Private Tutorials hub for the admin. Lists every guided walkthrough in the
// app and links to each page with `?tour=start`, which the global HelpButton
// picks up to auto-launch that page's spotlight tour. This is how the operator
// previews exactly what a client (or they themselves) is walked through — no
// video required. Pure server component: it only reads the static catalog.

export function TutorialsHub() {
  return (
    <section className="mt-10">
      <h2 className="text-2xl font-bold text-ink">Tutorials</h2>
      <p className="mt-1 text-sm text-muted">
        Every guided walkthrough in the app. Open any one to step through that
        page live, exactly as your clients see it — no video needed.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {TOUR_CATALOG.map((t) => (
          <div
            key={t.path}
            className="flex flex-col rounded-2xl border border-line bg-surface p-5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-semibold text-ink">{t.label}</h3>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                  t.audience === "admin"
                    ? "bg-ink/10 text-ink"
                    : "bg-brand/10 text-brand"
                }`}
              >
                {t.audience === "admin" ? "For you" : "For clients"}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted">{t.blurb}</p>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-muted">
                {t.count} stop{t.count === 1 ? "" : "s"}
              </span>
              <Link
                href={`${t.path}?tour=start`}
                className="text-sm font-semibold text-brand hover:underline"
              >
                Walk me through it →
              </Link>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
