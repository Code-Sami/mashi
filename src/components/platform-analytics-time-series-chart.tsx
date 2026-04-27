"use client";

import { useCallback, useState } from "react";
import type { PlatformTimeSeriesPoint } from "@/lib/platform-analytics";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { LegendPayload } from "recharts/types/component/DefaultLegendContent";

type Props = {
  points: PlatformTimeSeriesPoint[];
};

const SERIES = [
  { key: "users" as const, name: "New users", stroke: "#28cc95" },
  { key: "groups" as const, name: "New groups", stroke: "#265cff" },
  { key: "markets" as const, name: "New markets", stroke: "#003221" },
  { key: "bets" as const, name: "Bets placed", stroke: "#f97316" },
  { key: "memberships" as const, name: "Memberships", stroke: "#8b5cf6" },
  { key: "memberJoins" as const, name: "Tracked joins", stroke: "#ec4899" },
];

function formatTick(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return dateStr;
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function PlatformAnalyticsTimeSeriesChart({ points }: Props) {
  const [hiddenKeys, setHiddenKeys] = useState(() => new Set<string>());

  const toggleSeries = useCallback((dataKey: string | number | undefined) => {
    if (dataKey == null) return;
    const key = String(dataKey);
    setHiddenKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const legendFormatter = useCallback(
    (value: string, entry: LegendPayload) => {
      const dimmed = hiddenKeys.has(String(entry.dataKey));
      return <span style={{ opacity: dimmed ? 0.38 : 1 }}>{value}</span>;
    },
    [hiddenKeys]
  );

  if (points.length === 0) {
    return (
      <p className="rounded-xl border border-border bg-background-secondary px-4 py-8 text-center text-sm text-foreground-secondary">
        No data in this range yet.
      </p>
    );
  }

  return (
    <div className="h-[min(420px,70vh)] w-full min-h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
          <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "rgba(0,0,0,0.45)" }}
            tickFormatter={formatTick}
            minTickGap={28}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 11, fill: "rgba(0,0,0,0.45)" }}
            allowDecimals={false}
            width={40}
          />
          <Tooltip
            contentStyle={{
              borderRadius: "12px",
              border: "1px solid #e5e7eb",
              fontSize: "12px",
            }}
            labelFormatter={(label) => {
              const [y, m, d] = String(label).split("-").map(Number);
              if (!y || !m || !d) return String(label);
              return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(undefined, {
                weekday: "short",
                year: "numeric",
                month: "short",
                day: "numeric",
              });
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: "12px", cursor: "pointer", userSelect: "none" }}
            formatter={legendFormatter}
            onClick={(e) => {
              const dk = e.dataKey;
              if (typeof dk !== "string" && typeof dk !== "number") return;
              toggleSeries(dk);
            }}
          />
          {SERIES.map((s) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.name}
              stroke={s.stroke}
              strokeWidth={2}
              dot={false}
              hide={hiddenKeys.has(s.key)}
              isAnimationActive={points.length < 120}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
