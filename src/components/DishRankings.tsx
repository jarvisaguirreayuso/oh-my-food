"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { TrendBadge } from "./TrendBadge";

type Ranking = {
  dish_id: string;
  dish_name: string;
  recent_repeat_pct: number | null;
  recent_score: number | null;
  recent_n: number | null;
  trend_status: string | null;
  trend_delta: number | null;
};

const ORDER_OPTIONS = [
  { key: "repeat", label: "% repetiría" },
  { key: "score", label: "Barriguitas" },
  { key: "trend", label: "Tendencia" },
] as const;

export function DishRankings({ placeId, initial }: { placeId: string; initial: Ranking[] }) {
  const [order, setOrder] = useState<string>("repeat");
  const [rankings, setRankings] = useState<Ranking[]>(initial);
  const [loading, setLoading] = useState(false);

  async function changeOrder(o: string) {
    if (o === order) return;
    setOrder(o);
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase.rpc("dish_rankings_for_place", {
      p_place_id: placeId,
      p_order_by: o,
    });
    setRankings((data as Ranking[]) ?? []);
    setLoading(false);
  }

  return (
    <div className="mt-8">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Platos</h2>
        <div className="flex gap-1 text-xs">
          {ORDER_OPTIONS.map((o) => (
            <button
              key={o.key}
              type="button"
              onClick={() => changeOrder(o.key)}
              className={`rounded-full px-2 py-1 ${order === o.key ? "bg-accent text-white" : "bg-stone-100"}`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
      <ul className={`flex flex-col gap-2 ${loading ? "opacity-50" : ""}`}>
        {rankings.map((d) => (
          <li key={d.dish_id}>
            <Link
              href={`/dishes/${d.dish_id}`}
              className="flex items-center justify-between rounded-lg border border-stone-200 px-4 py-3 hover:border-stone-400"
            >
              <div>
                <div className="font-medium">{d.dish_name}</div>
                <div className="text-xs text-stone-500">
                  Barriguitas {d.recent_score ?? "—"} · Repetiría {d.recent_repeat_pct ?? "—"}% ({d.recent_n ?? 0})
                </div>
              </div>
              <TrendBadge status={(d.trend_status as never) ?? "insufficient_data"} delta={d.trend_delta} />
            </Link>
          </li>
        ))}
        {rankings.length === 0 && (
          <p className="text-sm text-stone-400">Todavía no hay platos registrados en este sitio.</p>
        )}
      </ul>
    </div>
  );
}
