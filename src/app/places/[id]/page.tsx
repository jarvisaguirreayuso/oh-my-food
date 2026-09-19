import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TrendBadge } from "@/components/TrendBadge";
import { TimeseriesChart } from "@/components/TimeseriesChart";

const TYPE_LABELS: Record<string, string> = {
  restaurant: "Restaurante",
  food_stall: "Puesto",
  food_truck: "Food truck",
  market_stall: "Puesto de mercado",
  other: "Otro",
};

// Anonymous visitors can't read visits.user_id, so they can't embed the author
// either: the author is only requested for signed-in users.
async function loadReviews(
  supabase: Awaited<ReturnType<typeof createClient>>,
  placeId: string,
  withAuthor: boolean
) {
  if (withAuthor) {
    const { data } = await supabase
      .from("visits")
      .select("id, visited_on, place_rating, place_comment, profiles(username)")
      .eq("place_id", placeId)
      .not("place_rating", "is", null)
      .order("visited_on", { ascending: false })
      .limit(20);
    return { data: data?.map((r) => ({ ...r, author: r.profiles?.username ?? null })) ?? null };
  }
  const { data } = await supabase
    .from("visits")
    .select("id, visited_on, place_rating, place_comment")
    .eq("place_id", placeId)
    .not("place_rating", "is", null)
    .order("visited_on", { ascending: false })
    .limit(20);
  return { data: data?.map((r) => ({ ...r, author: null as string | null })) ?? null };
}

export default async function PlaceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ granularity?: string; order?: string }>;
}) {
  const { id } = await params;
  const { granularity: rawGranularity, order: rawOrder } = await searchParams;
  const granularity = rawGranularity === "quarter" ? "quarter" : "month";
  const order = rawOrder ?? "repeat";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: place } = await supabase.from("places").select("*").eq("id", id).single();
  if (!place) notFound();

  const today = new Date();
  const from = new Date(today);
  from.setMonth(from.getMonth() - 24);
  const fromStr = from.toISOString().slice(0, 10);
  const toStr = today.toISOString().slice(0, 10);

  const [{ data: stats }, { data: trend }, { data: timeseries }, { data: rankings }, { data: reviews }] =
    await Promise.all([
      supabase.rpc("place_stats", { p_place_id: id }).single(),
      supabase.rpc("place_trend", { p_place_id: id }).single(),
      supabase.rpc("place_timeseries", {
        p_place_id: id,
        p_granularity: granularity,
        p_from: fromStr,
        p_to: toStr,
      }),
      supabase.rpc("dish_rankings_for_place", { p_place_id: id, p_order_by: order }),
      loadReviews(supabase, id, Boolean(user)),
    ]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-2 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{place.name}</h1>
          <p className="text-sm text-neutral-500">
            {TYPE_LABELS[place.type] ?? place.type}
            {place.address ? ` · ${place.address}` : ""}
          </p>
        </div>
        <Link
          href={`/visits/new?place=${place.id}`}
          className="shrink-0 rounded-lg bg-neutral-900 px-3 py-2 text-xs font-medium text-white"
        >
          Registrar visita
        </Link>
      </div>

      <div className="mt-4 flex items-end gap-4 rounded-xl border border-neutral-200 p-4">
        <div>
          <div className="text-4xl font-bold">{stats?.recent_avg ?? "—"}</div>
          <div className="text-xs text-neutral-500">reciente (12 meses) · n={stats?.recent_n ?? 0}</div>
        </div>
        <div>
          <div className="text-lg font-medium text-neutral-500">{stats?.historical_avg ?? "—"}</div>
          <div className="text-xs text-neutral-400">histórica · n={stats?.historical_n ?? 0}</div>
        </div>
        {trend && <TrendBadge status={trend.status as never} delta={trend.delta} />}
      </div>

      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Evolución de la valoración del sitio</h2>
          <div className="flex gap-1 text-xs">
            <Link
              href={`?granularity=month&order=${order}`}
              className={`rounded-full px-2 py-1 ${granularity === "month" ? "bg-neutral-900 text-white" : "bg-neutral-100"}`}
            >
              Mensual
            </Link>
            <Link
              href={`?granularity=quarter&order=${order}`}
              className={`rounded-full px-2 py-1 ${granularity === "quarter" ? "bg-neutral-900 text-white" : "bg-neutral-100"}`}
            >
              Trimestral
            </Link>
          </div>
        </div>
        {timeseries && timeseries.length > 0 ? (
          <TimeseriesChart
            data={timeseries}
            series={[{ key: "avg_rating", movingAvgKey: "moving_avg_3", label: "Nota", color: "#171717" }]}
            yDomain={[1, 5]}
          />
        ) : (
          <p className="text-sm text-neutral-400">Todavía no hay suficientes visitas valoradas.</p>
        )}
      </div>

      <div className="mt-8">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Platos</h2>
          <div className="flex gap-1 text-xs">
            {["repeat", "flavor", "trend"].map((o) => (
              <Link
                key={o}
                href={`?granularity=${granularity}&order=${o}`}
                className={`rounded-full px-2 py-1 ${order === o ? "bg-neutral-900 text-white" : "bg-neutral-100"}`}
              >
                {o === "repeat" ? "% repetiría" : o === "flavor" ? "Sabor" : "Tendencia"}
              </Link>
            ))}
          </div>
        </div>
        <ul className="flex flex-col gap-2">
          {rankings?.map((d) => (
            <li key={d.dish_id}>
              <Link
                href={`/dishes/${d.dish_id}`}
                className="flex items-center justify-between rounded-lg border border-neutral-200 px-4 py-3 hover:border-neutral-400"
              >
                <div>
                  <div className="font-medium">{d.dish_name}</div>
                  <div className="text-xs text-neutral-500">
                    Sabor {d.recent_flavor ?? "—"} · {d.recent_repeat_pct ?? "—"}% repetiría · n={d.recent_n ?? 0}
                  </div>
                </div>
                <TrendBadge status={(d.trend_status as never) ?? "insufficient_data"} delta={d.trend_delta} />
              </Link>
            </li>
          ))}
          {(!rankings || rankings.length === 0) && (
            <p className="text-sm text-neutral-400">Todavía no hay platos registrados en este sitio.</p>
          )}
        </ul>
      </div>

      <div className="mt-8">
        <h2 className="mb-2 text-sm font-semibold">Reseñas</h2>
        <ul className="flex flex-col gap-3">
          {reviews?.map((r) => (
            <li key={r.id} className="rounded-lg border border-neutral-200 px-4 py-3">
              <div className="flex items-center justify-between text-xs text-neutral-500">
                <span>{r.author ?? "Usuario"}</span>
                <span>{r.visited_on}</span>
              </div>
              <div className="mt-1 font-medium">{"★".repeat(r.place_rating ?? 0)}</div>
              {r.place_comment && <p className="mt-1 text-sm">{r.place_comment}</p>}
            </li>
          ))}
          {(!reviews || reviews.length === 0) && (
            <p className="text-sm text-neutral-400">Todavía no hay reseñas del sitio.</p>
          )}
        </ul>
      </div>
    </div>
  );
}
