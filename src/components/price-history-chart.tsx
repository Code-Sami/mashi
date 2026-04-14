"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type PricePoint = {
  id: string;
  yesPrice: number;
  noPrice: number;
  createdAt: string | null;
};

type RangeKey = "day" | "week" | "month" | "all";

const RANGE_MS: Record<Exclude<RangeKey, "all">, number> = {
  day: 24 * 60 * 60 * 1000,
  week: 7 * 24 * 60 * 60 * 1000,
  month: 30 * 24 * 60 * 60 * 1000,
};

const YES_COLOR = "#265cff";
const NO_COLOR = "#aa00ff";

const HOUR = 3600_000;
const DAY = 86400_000;

const PAD = { top: 16, right: 16, bottom: 28, left: 0 };
const Y_TICKS = [0, 25, 50, 75, 100];

function formatXLabel(ts: number, spanMs: number) {
  const d = new Date(ts);
  if (spanMs < HOUR * 2) {
    return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  }
  if (spanMs < DAY) {
    return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  }
  if (spanMs < DAY * 7) {
    return d.toLocaleDateString(undefined, { weekday: "short", hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function PriceHistoryChart({ points }: { points: PricePoint[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [range, setRange] = useState<RangeKey>("all");
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [now] = useState(() => Date.now());
  const [width, setWidth] = useState(600);
  const height = 240;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(([entry]) => {
      setWidth(Math.round(entry.contentRect.width));
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const plotW = width - PAD.left - PAD.right;
  const plotH = height - PAD.top - PAD.bottom;

  const filtered = useMemo(() => {
    const normalized = points
      .filter((p) => p.createdAt)
      .map((p) => ({ ...p, ts: new Date(p.createdAt as string).getTime() }))
      .filter((p) => Number.isFinite(p.ts))
      .sort((a, b) => a.ts - b.ts);

    if (range === "all" || normalized.length === 0) return normalized;
    const cutoff = now - RANGE_MS[range];
    const scoped = normalized.filter((p) => p.ts >= cutoff);
    return scoped.length > 1 ? scoped : normalized;
  }, [points, range, now]);

  const spanMs = filtered.length >= 2
    ? filtered[filtered.length - 1].ts - filtered[0].ts
    : 0;

  function toX(i: number) {
    return PAD.left + (i / Math.max(1, filtered.length - 1)) * plotW;
  }
  function toY(price: number) {
    return PAD.top + plotH - price * plotH;
  }

  const yesLine = useMemo(
    () => filtered.map((p, i) => `${toX(i)},${toY(p.yesPrice)}`).join(" "),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filtered, width]
  );
  const noLine = useMemo(
    () => filtered.map((p, i) => `${toX(i)},${toY(p.noPrice)}`).join(" "),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filtered, width]
  );

  function areaPath(accessor: (p: (typeof filtered)[0]) => number) {
    if (filtered.length === 0) return "";
    const bottom = PAD.top + plotH;
    const pts = filtered.map((p, i) => `${toX(i)},${toY(accessor(p))}`).join(" L");
    return `M${toX(0)},${bottom} L${pts} L${toX(filtered.length - 1)},${bottom} Z`;
  }

  const xLabels = useMemo(() => {
    if (filtered.length < 2) return [];
    const maxLabels = Math.max(2, Math.floor(plotW / 90));
    const step = Math.max(1, Math.floor((filtered.length - 1) / (maxLabels - 1)));
    const indices: number[] = [];
    for (let i = 0; i < filtered.length; i += step) indices.push(i);
    if (indices[indices.length - 1] !== filtered.length - 1) {
      indices.push(filtered.length - 1);
    }
    return indices.map((i) => ({
      x: toX(i),
      label: formatXLabel(filtered[i].ts, spanMs),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, width, spanMs]);

  const hovered = hoverIndex !== null ? filtered[hoverIndex] : null;

  if (points.length < 2) {
    return <p className="mt-3 text-sm text-foreground-tertiary">No history yet.</p>;
  }

  return (
    <div className="mt-3">
      {/* Controls */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-5 text-xs font-medium">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: YES_COLOR }} />
            <span className="text-foreground-secondary">Yes</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: NO_COLOR }} />
            <span className="text-foreground-secondary">No</span>
          </span>
          {hovered ? (
            <span className="ml-2 text-foreground-tertiary">
              {new Date(hovered.ts).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
            </span>
          ) : null}
        </div>
        <div className="inline-flex rounded-xl border border-border p-0.5 text-xs font-medium">
          {(["day", "week", "month", "all"] as RangeKey[]).map((key) => (
            <button
              key={key}
              onClick={() => setRange(key)}
              className={`rounded-lg px-3 py-1.5 transition ${range === key ? "bg-brand-dark text-white shadow-sm" : "text-foreground-secondary hover:text-foreground"}`}
              type="button"
            >
              {key === "day" ? "1D" : key === "week" ? "1W" : key === "month" ? "1M" : "All"}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div ref={containerRef} className="relative">
        <svg
          width={width}
          height={height}
          className="w-full overflow-visible"
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const dataX = (mouseX - PAD.left) / plotW;
            const idx = Math.round(dataX * Math.max(0, filtered.length - 1));
            setHoverIndex(Math.min(filtered.length - 1, Math.max(0, idx)));
          }}
          onMouseLeave={() => setHoverIndex(null)}
        >
          <defs>
            <linearGradient id="yesGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={YES_COLOR} stopOpacity="0.12" />
              <stop offset="100%" stopColor={YES_COLOR} stopOpacity="0.01" />
            </linearGradient>
            <linearGradient id="noGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={NO_COLOR} stopOpacity="0.08" />
              <stop offset="100%" stopColor={NO_COLOR} stopOpacity="0.01" />
            </linearGradient>
          </defs>

          {/* Y-axis grid + labels */}
          {Y_TICKS.map((tick) => {
            const y = toY(tick / 100);
            return (
              <g key={tick}>
                <line x1={PAD.left} y1={y} x2={PAD.left + plotW} y2={y} stroke="#e5e7eb" strokeWidth="1" />
                <text x={PAD.left + plotW + 4} y={y} textAnchor="start" fontSize="10" fill="#9ca3af" dominantBaseline="middle">
                  {tick}%
                </text>
              </g>
            );
          })}

          {/* X-axis labels */}
          {xLabels.map((label, i) => (
            <text key={i} x={label.x} y={height - 4} textAnchor="middle" fontSize="10" fill="#9ca3af">
              {label.label}
            </text>
          ))}

          {/* Area fills */}
          <path d={areaPath((p) => p.yesPrice)} fill="url(#yesGrad)" />
          <path d={areaPath((p) => p.noPrice)} fill="url(#noGrad)" />

          {/* Lines */}
          <polyline fill="none" stroke={YES_COLOR} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={yesLine} />
          <polyline fill="none" stroke={NO_COLOR} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" points={noLine} strokeDasharray="6 4" />

          {/* Hover crosshair + dots */}
          {hovered && hoverIndex !== null ? (
            <>
              <line
                x1={toX(hoverIndex)}
                y1={PAD.top}
                x2={toX(hoverIndex)}
                y2={PAD.top + plotH}
                stroke="#003221"
                strokeWidth="1"
                strokeDasharray="4 4"
                strokeOpacity="0.2"
              />
              <circle cx={toX(hoverIndex)} cy={toY(hovered.yesPrice)} r="5" fill="white" stroke={YES_COLOR} strokeWidth="2" />
              <circle cx={toX(hoverIndex)} cy={toY(hovered.noPrice)} r="5" fill="white" stroke={NO_COLOR} strokeWidth="2" />
            </>
          ) : null}
        </svg>

        {/* Hover tooltip */}
        {hovered ? (
          <div className="absolute right-3 top-3 rounded-xl border border-border bg-white/95 px-4 py-3 text-xs shadow-md backdrop-blur-sm">
            <div className="flex items-center gap-4">
              <div>
                <p className="font-medium text-foreground-tertiary">Yes</p>
                <p className="text-lg font-bold" style={{ color: YES_COLOR }}>{(hovered.yesPrice * 100).toFixed(1)}%</p>
              </div>
              <div className="h-8 w-px bg-border" />
              <div>
                <p className="font-medium text-foreground-tertiary">No</p>
                <p className="text-lg font-bold" style={{ color: NO_COLOR }}>{(hovered.noPrice * 100).toFixed(1)}%</p>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
