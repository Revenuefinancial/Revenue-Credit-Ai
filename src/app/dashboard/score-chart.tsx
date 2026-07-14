// Pure-SVG score trend chart — no chart library, consistent with the project's
// no-extra-deps pattern. Plots the client's self-reported / admin-logged scores
// over time. Renders a friendly empty state until there are at least two points.

import type { ScoreEntry } from "@/lib/types";

const W = 520;
const H = 180;
const PAD = { top: 16, right: 16, bottom: 24, left: 32 };

export function ScoreChart({ entries }: { entries: ScoreEntry[] }) {
  // Oldest → newest for left-to-right plotting.
  const points = [...entries].sort(
    (a, b) =>
      new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime(),
  );

  if (points.length === 0) {
    return (
      <p className="text-sm text-muted">
        No scores logged yet. Add your current score below to start tracking your
        progress — log a new one each time you pull a fresh report.
      </p>
    );
  }

  const latest = points[points.length - 1];
  const first = points[0];
  const delta = latest.score - first.score;

  if (points.length === 1) {
    return (
      <div>
        <BigScore score={latest.score} delta={null} />
        <p className="mt-2 text-sm text-muted">
          One score logged. Add another after your next pull to see the trend
          line.
        </p>
      </div>
    );
  }

  // Y scale: pad the observed range a little, clamp to FCRA score bounds.
  const scores = points.map((p) => p.score);
  const lo = Math.max(300, Math.min(...scores) - 20);
  const hi = Math.min(850, Math.max(...scores) + 20);
  const span = Math.max(1, hi - lo);

  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const x = (i: number) =>
    PAD.left + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
  const y = (s: number) => PAD.top + innerH - ((s - lo) / span) * innerH;

  const line = points.map((p, i) => `${x(i)},${y(p.score)}`).join(" ");
  const area = `${PAD.left},${PAD.top + innerH} ${line} ${PAD.left + innerW},${PAD.top + innerH}`;

  return (
    <div>
      <BigScore score={latest.score} delta={delta} />
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mt-3 w-full"
        role="img"
        aria-label="Credit score trend over time"
      >
        <defs>
          <linearGradient id="scoreFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--rc-green)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--rc-green)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* horizontal guide lines + labels at lo / mid / hi */}
        {[lo, Math.round((lo + hi) / 2), hi].map((v) => (
          <g key={v}>
            <line
              x1={PAD.left}
              x2={PAD.left + innerW}
              y1={y(v)}
              y2={y(v)}
              stroke="var(--color-line, #e5e7eb)"
              strokeWidth="1"
            />
            <text
              x={PAD.left - 6}
              y={y(v) + 3}
              textAnchor="end"
              className="fill-[var(--color-muted,#9ca3af)] text-[9px]"
            >
              {v}
            </text>
          </g>
        ))}

        <polygon points={area} fill="url(#scoreFill)" />
        <polyline
          points={line}
          fill="none"
          stroke="var(--rc-green)"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {points.map((p, i) => (
          <circle
            key={p.id}
            cx={x(i)}
            cy={y(p.score)}
            r="3.5"
            fill="var(--color-surface, #fff)"
            stroke="var(--rc-green)"
            strokeWidth="2"
          />
        ))}
      </svg>
    </div>
  );
}

function BigScore({ score, delta }: { score: number; delta: number | null }) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="text-3xl font-bold text-ink">{score}</span>
      {delta !== null && delta !== 0 && (
        <span
          className={`text-sm font-semibold ${
            delta > 0 ? "text-[var(--rc-green)]" : "text-[var(--rc-red)]"
          }`}
        >
          {delta > 0 ? "▲" : "▼"} {Math.abs(delta)} pts since you started
        </span>
      )}
    </div>
  );
}
