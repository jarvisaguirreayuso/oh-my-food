import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TrendBadge } from "@/components/TrendBadge";
import { TimeseriesChart } from "@/components/TimeseriesChart";

export default async function DishDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ granularity?: string }>;
}) {
  const { id } = await params;
  const { granularity: rawGranularity } = await searchParams;
  const granularity = rawGranularity === "quarter" ? "quarter" : "month";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: dish } = await supabase
    .from("dishes")
    .select("*, places(id, name)")
    .eq("id", id)
    .single();
  if (!dish) notFound();

  const today = new Date();
  const from = new Date(today);
  from.setMonth(from.getMonth() - 24);
  const fromStr = from.toISOString().slice(0, 10);
  const toStr = today.toISOString().slice(0, 10);

  const [{ data: stats }, { data: trend }, { data: timeseries }, { data: reviews }] = await Promise.all([
    supabase.rpc("dish_stats", { p_dish_id: id }).single(),
    supabase.rpc("dish_trend", { p_dish_id: id }).single(),
    supabase.rpc("dish_timeseries", {
      p_dish_id: id,
      p_granularity: granularity,
      p_from: fromStr,
      p_to: toStr,
    }),
    supabase
      .from("dish_reviews")
      // Anonymous visitors can't read visits.user_id, so they can't embed the author either.
      .select(
        user
          ? "id, idea, execution, flavor, would_repeat, comment, visits(visited_on, profiles(username))"
          : "id, idea, execution, flavor, would_repeat, comment, visits(visited_on)"
      )
      .eq("dish_id", id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <p className="text-sm text-neutral-500">
        <Link href={`/places/${dish.places?.id}`} className="text-blue-600">
          {dish.places?.name}
        </Link>
      </p>
      <div className="mb-4 flex items-start justify-between">
        <h1 className="text-2xl font-bold">{dish.name}</h1>
        {trend && <TrendBadge status={trend.status as never} delta={trend.delta} />}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Idea", recent: stats?.recent_idea, hist: stats?.historical_idea },
          { label: "Ejecución", recent: stats?.recent_execution, hist: stats?.historical_execution },
          { label: "Sabor", recent: stats?.recent_flavor, hist: stats?.historical_flavor },
          { label: "% Repetiría", recent: stats?.recent_repeat_pct, hist: stats?.historical_repeat_pct },
        ].map((m) => (
          <div key={m.label} className="rounded-xl border border-neutral-200 p-3 text-center">
            <div className="text-xl font-bold">{m.recent ?? "—"}</div>
            <div className="text-[11px] text-neutral-500">{m.label} (reciente)</div>
            <div className="mt-1 text-xs text-neutral-400">hist. {m.hist ?? "—"}</div>
          </div>
        ))}
      </div>
      <p className="mt-1 text-xs text-neutral-400">n reciente: {stats?.recent_n ?? 0} · n histórico: {stats?.historical_n ?? 0}</p>

      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Evolución</h2>
          <div className="flex gap-1 text-xs">
            <Link
              href={`?granularity=month`}
              className={`rounded-full px-2 py-1 ${granularity === "month" ? "bg-neutral-900 text-white" : "bg-neutral-100"}`}
            >
              Mensual
            </Link>
            <Link
              href={`?granularity=quarter`}
              className={`rounded-full px-2 py-1 ${granularity === "quarter" ? "bg-neutral-900 text-white" : "bg-neutral-100"}`}
            >
              Trimestral
            </Link>
          </div>
        </div>
        {timeseries && timeseries.length > 0 ? (
          <div className="flex flex-col gap-6">
            {/* Two charts: ratings are 1-5 and "% Repetiría" is 0-100, so they can't share a Y axis. */}
            <TimeseriesChart
              data={timeseries}
              series={[
                { key: "avg_idea", movingAvgKey: "moving_avg_idea", label: "Idea", color: "#2563eb" },
                { key: "avg_execution", movingAvgKey: "moving_avg_execution", label: "Ejecución", color: "#16a34a" },
                { key: "avg_flavor", movingAvgKey: "moving_avg_flavor", label: "Sabor", color: "#dc2626" },
              ]}
              yDomain={[1, 5]}
            />
            <div>
              <h3 className="mb-2 text-xs font-medium text-neutral-500">% Repetiría</h3>
              <TimeseriesChart
                data={timeseries}
                series={[
                  { key: "repeat_pct", movingAvgKey: "moving_avg_repeat_pct", label: "% Repetiría", color: "#9333ea" },
                ]}
                yDomain={[0, 100]}
              />
            </div>
          </div>
        ) : (
          <p className="text-sm text-neutral-400">Todavía no hay suficientes reseñas de este plato.</p>
        )}
      </div>

      <div className="mt-8">
        <h2 className="mb-2 text-sm font-semibold">Historial de reseñas</h2>
        <ul className="flex flex-col gap-3">
          {reviews?.map((r) => (
            <li key={r.id} className="rounded-lg border border-neutral-200 px-4 py-3">
              <div className="flex items-center justify-between text-xs text-neutral-500">
                <span>{(r.visits && "profiles" in r.visits && r.visits.profiles?.username) || "Usuario"}</span>
                <span>{r.visits?.visited_on}</span>
              </div>
              <div className="mt-1 text-sm">
                Idea {r.idea} · Ejecución {r.execution} · Sabor {r.flavor} ·{" "}
                {r.would_repeat ? "repetiría" : "no repetiría"}
              </div>
              {r.comment && <p className="mt-1 text-sm text-neutral-700">{r.comment}</p>}
            </li>
          ))}
          {(!reviews || reviews.length === 0) && (
            <p className="text-sm text-neutral-400">Todavía no hay reseñas de este plato.</p>
          )}
        </ul>
      </div>
    </div>
  );
}
