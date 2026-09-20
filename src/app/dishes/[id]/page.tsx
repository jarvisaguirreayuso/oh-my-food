import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TrendBadge } from "@/components/TrendBadge";
import { TimeseriesChart } from "@/components/TimeseriesChart";
import { DishPhotoUploader } from "@/components/DishPhotoUploader";

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

  const { data: generalRows } = await supabase.rpc("dish_general_scores", { p_dish_ids: [id] });
  const general = generalRows?.[0];

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <p className="text-sm text-stone-500">
        <Link href={`/places/${dish.places?.id}`} className="text-accent">
          {dish.places?.name}
        </Link>
      </p>
      <div className="mb-4 flex items-center gap-3">
        {user ? (
          <DishPhotoUploader dishId={dish.id} initialPhotoUrl={dish.photo_url} />
        ) : (
          dish.photo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={dish.photo_url} alt="" className="h-16 w-16 rounded-lg object-cover" />
          )
        )}
        <div>
          <h1 className="font-display text-2xl font-bold">{dish.name}</h1>
          {dish.price != null && <p className="text-sm text-stone-500">{dish.price.toFixed(2)} €</p>}
        </div>
      </div>

      <div className="rounded-xl border border-stone-200 p-4">
        <div className="mb-2 text-sm font-medium text-stone-700">
          Media general{general ? ` · ${general.n} ${general.n === 1 ? "reseña" : "reseñas"}` : ""}
        </div>
        {general ? (
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { label: "Idea", value: general.avg_idea },
              { label: "Ejecución", value: general.avg_execution },
              { label: "% Repetiría", value: general.repeat_pct },
            ].map((m) => (
              <div key={m.label}>
                <div className="text-xl font-bold">{m.value ?? "—"}</div>
                <div className="text-[11px] text-stone-500">{m.label}</div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-stone-400">Todavía sin reseñas de este plato.</p>
        )}
        <p className="mt-2 text-xs text-stone-400">Suma las reseñas que la gente ha querido contar, sin nombres.</p>
      </div>

      {user ? (
        <SignedInSections dishId={id} granularity={granularity} />
      ) : (
        <div className="mt-6 rounded-xl bg-stone-50 px-4 py-4">
          <p className="font-medium">Mira la evolución y lo que opina tu gente</p>
          <p className="mt-1 text-sm text-stone-500">
            Con una cuenta ves cómo cambia este plato con el tiempo y las reseñas de quien sigues.
          </p>
          <Link
            href="/auth/login"
            className="mt-3 inline-block rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white"
          >
            Entrar
          </Link>
        </div>
      )}
    </div>
  );
}

async function SignedInSections({ dishId, granularity }: { dishId: string; granularity: "month" | "quarter" }) {
  const supabase = await createClient();

  const today = new Date();
  const from = new Date(today);
  from.setMonth(from.getMonth() - 24);
  const fromStr = from.toISOString().slice(0, 10);
  const toStr = today.toISOString().slice(0, 10);

  // Computed over the reviews this user is allowed to read (RLS).
  const [{ data: stats }, { data: trend }, { data: timeseries }, { data: reviews }] = await Promise.all([
    supabase.rpc("dish_stats", { p_dish_id: dishId }).single(),
    supabase.rpc("dish_trend", { p_dish_id: dishId }).single(),
    supabase.rpc("dish_timeseries", {
      p_dish_id: dishId,
      p_granularity: granularity,
      p_from: fromStr,
      p_to: toStr,
    }),
    supabase
      .from("dish_reviews")
      .select(
        "id, idea, execution, would_repeat, comment, visits(visited_on, profiles(username, display_name))"
      )
      .eq("dish_id", dishId)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  return (
    <>
      <div className="mb-2 mt-6 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Lo que ves tú</h2>
        {trend && <TrendBadge status={trend.status as never} delta={trend.delta} />}
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Idea", recent: stats?.recent_idea, hist: stats?.historical_idea },
          { label: "Ejecución", recent: stats?.recent_execution, hist: stats?.historical_execution },
          { label: "% Repetiría", recent: stats?.recent_repeat_pct, hist: stats?.historical_repeat_pct },
        ].map((m) => (
          <div key={m.label} className="rounded-xl border border-stone-200 p-3 text-center">
            <div className="text-xl font-bold">{m.recent ?? "—"}</div>
            <div className="text-[11px] text-stone-500">{m.label} (reciente)</div>
            <div className="mt-1 text-xs text-stone-400">hist. {m.hist ?? "—"}</div>
          </div>
        ))}
      </div>
      <p className="mt-1 text-xs text-stone-400">
        n reciente: {stats?.recent_n ?? 0} · n histórico: {stats?.historical_n ?? 0}
      </p>

      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Evolución</h2>
          <div className="flex gap-1 text-xs">
            <Link
              href={`?granularity=month`}
              className={`rounded-full px-2 py-1 ${granularity === "month" ? "bg-accent text-white" : "bg-stone-100"}`}
            >
              Mensual
            </Link>
            <Link
              href={`?granularity=quarter`}
              className={`rounded-full px-2 py-1 ${granularity === "quarter" ? "bg-accent text-white" : "bg-stone-100"}`}
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
                { key: "avg_idea", movingAvgKey: "moving_avg_idea", label: "Idea", color: "#0369a1" },
                { key: "avg_execution", movingAvgKey: "moving_avg_execution", label: "Ejecución", color: "#b45309" },
              ]}
              yDomain={[1, 5]}
            />
            <div>
              <h3 className="mb-2 text-xs font-medium text-stone-500">% Repetiría</h3>
              <TimeseriesChart
                data={timeseries}
                series={[
                  { key: "repeat_pct", movingAvgKey: "moving_avg_repeat_pct", label: "% Repetiría", color: "#6d28d9" },
                ]}
                yDomain={[0, 100]}
              />
            </div>
          </div>
        ) : (
          <p className="text-sm text-stone-400">Todavía no hay suficientes reseñas que puedas ver de este plato.</p>
        )}
      </div>

      <div className="mt-8">
        <h2 className="mb-2 text-sm font-semibold">Reseñas que puedes ver</h2>
        <ul className="flex flex-col gap-3">
          {reviews?.map((r) => {
            const author = r.visits?.profiles;
            return (
              <li key={r.id} className="rounded-lg border border-stone-200 px-4 py-3">
                <div className="flex items-center justify-between text-xs text-stone-500">
                  {author ? (
                    <Link href={`/u/${author.username}`} className="font-medium text-stone-800">
                      {author.display_name || `@${author.username}`}
                    </Link>
                  ) : (
                    <span>Usuario</span>
                  )}
                  <span>{r.visits?.visited_on}</span>
                </div>
                <div className="mt-1 text-sm">
                  Idea {r.idea} · Ejecución {r.execution} ·{" "}
                  {r.would_repeat ? "repetiría" : "no repetiría"}
                </div>
                {r.comment && <p className="mt-1 text-sm text-stone-700">{r.comment}</p>}
              </li>
            );
          })}
          {(!reviews || reviews.length === 0) && (
            <p className="text-sm text-stone-400">Todavía no hay reseñas que puedas ver de este plato.</p>
          )}
        </ul>
      </div>
    </>
  );
}
