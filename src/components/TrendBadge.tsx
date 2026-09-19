export function TrendBadge({
  status,
  delta,
}: {
  status: "up" | "down" | "stable" | "insufficient_data";
  delta?: number | null;
}) {
  if (status === "insufficient_data") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-500">
        datos insuficientes
      </span>
    );
  }

  const map = {
    up: { arrow: "▲", cls: "bg-green-50 text-green-700" },
    down: { arrow: "▼", cls: "bg-red-50 text-red-700" },
    stable: { arrow: "●", cls: "bg-stone-100 text-stone-600" },
  } as const;

  const { arrow, cls } = map[status];

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {arrow} {delta !== undefined && delta !== null ? `${delta > 0 ? "+" : ""}${delta.toFixed(2)}` : null}
    </span>
  );
}
