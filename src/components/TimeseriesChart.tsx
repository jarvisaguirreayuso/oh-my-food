"use client";

import { useState } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type SeriesConfig = {
  key: string; // raw value field, e.g. "avg_rating"
  movingAvgKey: string; // moving average field, e.g. "moving_avg_3"
  label: string;
  color: string;
};

export function TimeseriesChart({
  data,
  series,
  nKey = "n",
  yDomain,
}: {
  data: Array<Record<string, unknown>>;
  series: SeriesConfig[];
  nKey?: string;
  yDomain?: [number, number];
}) {
  const [visible, setVisible] = useState<Record<string, boolean>>(
    Object.fromEntries(series.map((s) => [s.key, true]))
  );

  const chartData = data.map((d) => {
    const n = Number(d[nKey] ?? 0);
    return { ...d, __opacity: n < 3 ? 0.35 : 1 };
  });

  return (
    <div>
      {series.length > 1 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {series.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setVisible((v) => ({ ...v, [s.key]: !v[s.key] }))}
              className="flex items-center gap-1 rounded-full border px-2 py-1 text-xs"
              style={{
                borderColor: s.color,
                opacity: visible[s.key] ? 1 : 0.4,
              }}
            >
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
              {s.label}
            </button>
          ))}
        </div>
      )}

      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
          <XAxis dataKey="period_start" tick={{ fontSize: 11 }} />
          <YAxis domain={yDomain ?? ["auto", "auto"]} tick={{ fontSize: 11 }} />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const n = payload[0]?.payload?.[nKey];
              return (
                <div className="rounded-md border bg-white px-3 py-2 text-xs shadow">
                  <div className="font-medium">{label}</div>
                  <div className="text-stone-500">n = {n ?? 0}</div>
                  {payload.map((p) => (
                    <div key={p.dataKey as string} style={{ color: p.color }}>
                      {p.name}: {typeof p.value === "number" ? p.value.toFixed(2) : p.value ?? "—"}
                    </div>
                  ))}
                </div>
              );
            }}
          />
          {series.map(
            (s) =>
              visible[s.key] && (
                <Bar
                  key={`bar-${s.key}`}
                  dataKey={s.key}
                  name={`${s.label} (periodo)`}
                  fill={s.color}
                  fillOpacity={0.25}
                  barSize={14}
                />
              )
          )}
          {series.map(
            (s) =>
              visible[s.key] && (
                <Line
                  key={`line-${s.key}`}
                  type="monotone"
                  dataKey={s.movingAvgKey}
                  name={`${s.label} (media móvil 3p)`}
                  stroke={s.color}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  connectNulls
                />
              )
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
