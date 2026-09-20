"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { TimeseriesChart } from "./TimeseriesChart";

export function PlaceEvolution({
  placeId,
  initialData,
}: {
  placeId: string;
  initialData: Array<Record<string, unknown>>;
}) {
  const [open, setOpen] = useState(false);
  const [granularity, setGranularity] = useState<"month" | "quarter">("month");
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);

  async function changeGranularity(g: "month" | "quarter") {
    if (g === granularity) return;
    setGranularity(g);
    setLoading(true);
    const supabase = createClient();
    const today = new Date();
    const from = new Date(today);
    from.setMonth(from.getMonth() - 24);
    const { data: rows } = await supabase.rpc("place_timeseries", {
      p_place_id: placeId,
      p_granularity: g,
      p_from: from.toISOString().slice(0, 10),
      p_to: today.toISOString().slice(0, 10),
    });
    setData(rows ?? []);
    setLoading(false);
  }

  return (
    <div className="mt-6">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between text-sm font-semibold"
      >
        <span>Evolución de la valoración del sitio</span>
        <span className="text-xs font-normal text-accent">{open ? "Ocultar" : "Ver"}</span>
      </button>
      {open && (
        <div className="mt-2">
          <div className="mb-2 flex justify-end gap-1 text-xs">
            <button
              type="button"
              onClick={() => changeGranularity("month")}
              className={`rounded-full px-2 py-1 ${granularity === "month" ? "bg-accent text-white" : "bg-stone-100"}`}
            >
              Mensual
            </button>
            <button
              type="button"
              onClick={() => changeGranularity("quarter")}
              className={`rounded-full px-2 py-1 ${granularity === "quarter" ? "bg-accent text-white" : "bg-stone-100"}`}
            >
              Trimestral
            </button>
          </div>
          {loading ? (
            <p className="text-sm text-stone-400">Cargando…</p>
          ) : data.length > 0 ? (
            <TimeseriesChart
              data={data}
              series={[{ key: "avg_rating", movingAvgKey: "moving_avg_3", label: "Nota", color: "#c2410c" }]}
              yDomain={[1, 5]}
            />
          ) : (
            <p className="text-sm text-stone-400">Todavía no hay suficientes visitas valoradas.</p>
          )}
        </div>
      )}
    </div>
  );
}
