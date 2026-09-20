import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TYPE_LABELS, getPlaceGeneralScores } from "@/lib/places";
import { TrendBadge } from "@/components/TrendBadge";
import { PlaceEvolution } from "@/components/PlaceEvolution";
import { DishRankings } from "@/components/DishRankings";
import { PlaceActions } from "@/components/PlaceActions";

export default async function PlaceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: place } = await supabase.from("places").select("*").eq("id", id).single();
  if (!place) notFound();

  const general = (await getPlaceGeneralScores(supabase, [id])).get(id);

  // "Quiero ir" and the user's lists (all private to them, so RLS returns only their own).
  const [saved, lists, memberships] = user
    ? await Promise.all([
        supabase.from("saved_places").select("place_id").eq("user_id", user.id).eq("place_id", id).maybeSingle(),
        supabase.from("place_lists").select("id, name").order("name"),
        supabase.from("place_list_items").select("list_id").eq("place_id", id),
      ])
    : [null, null, null];

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">{place.name}</h1>
          <p className="text-sm text-stone-500">
            {TYPE_LABELS[place.type] ?? place.type}
            {place.address ? ` · ${place.address}` : ""}
          </p>
        </div>
        {user && (
          <Link
            href={`/visits/new?place=${place.id}`}
            className="shrink-0 rounded-lg bg-accent px-3 py-2 text-xs font-medium text-white"
          >
            Registrar visita
          </Link>
        )}
      </div>

      <div className="mt-4 rounded-xl border border-stone-200 p-4">
        <div className="flex items-end gap-3">
          <div className="text-4xl font-bold">{general?.avg != null ? general.avg.toFixed(1) : "—"}</div>
          <div className="pb-1 text-sm text-stone-500">
            <div className="font-medium text-stone-700">Media general</div>
            {general ? `${general.n} ${general.n === 1 ? "nota" : "notas"}` : "Todavía sin notas"}
          </div>
        </div>
        <p className="mt-2 text-xs text-stone-400">
          Suma las notas que la gente ha querido contar, sin nombres.
        </p>
      </div>

      {user && (
        <PlaceActions
          placeId={id}
          saved={Boolean(saved?.data)}
          lists={lists?.data ?? []}
          memberOf={memberships?.data?.map((m) => m.list_id) ?? []}
        />
      )}

      {user ? <SignedInSections placeId={id} userId={user.id} /> : <SignedOutSections placeId={id} />}
    </div>
  );
}

async function SignedOutSections({ placeId }: { placeId: string }) {
  const supabase = await createClient();
  const { data: dishes } = await supabase.from("dishes").select("id, name").eq("place_id", placeId).order("name");

  return (
    <>
      <div className="mt-6 rounded-xl bg-stone-50 px-4 py-4">
        <p className="font-medium">Mira la evolución y lo que opina tu gente</p>
        <p className="mt-1 text-sm text-stone-500">
          Con una cuenta ves la tendencia del sitio, sus platos y las reseñas de quien sigues.
        </p>
        <Link
          href="/auth/login"
          className="mt-3 inline-block rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white"
        >
          Entrar
        </Link>
      </div>

      {dishes && dishes.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-2 text-sm font-semibold">Platos</h2>
          <ul className="flex flex-col gap-2">
            {dishes.map((d) => (
              <li key={d.id}>
                <Link
                  href={`/dishes/${d.id}`}
                  className="block rounded-lg border border-stone-200 px-4 py-3 font-medium hover:border-stone-400"
                >
                  {d.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

async function SignedInSections({ placeId, userId }: { placeId: string; userId: string }) {
  const supabase = await createClient();

  const today = new Date();
  const from = new Date(today);
  from.setMonth(from.getMonth() - 24);
  const fromStr = from.toISOString().slice(0, 10);
  const toStr = today.toISOString().slice(0, 10);

  // Everything below is computed by RLS over the visits this user is allowed to
  // read (their own, public ones, and those of people who let them see them).
  const [{ data: stats }, { data: trend }, { data: timeseries }, { data: rankings }, { data: reviews }, { data: follows }] =
    await Promise.all([
      supabase.rpc("place_stats", { p_place_id: placeId }).single(),
      supabase.rpc("place_trend", { p_place_id: placeId }).single(),
      supabase.rpc("place_timeseries", {
        p_place_id: placeId,
        p_granularity: "month",
        p_from: fromStr,
        p_to: toStr,
      }),
      supabase.rpc("dish_rankings_for_place", { p_place_id: placeId, p_order_by: "repeat" }),
      supabase
        .from("visits")
        .select("id, visited_on, place_rating, place_comment, profiles(username, display_name)")
        .eq("place_id", placeId)
        .not("place_rating", "is", null)
        .order("visited_on", { ascending: false })
        .limit(20),
      supabase.from("follows").select("followee_id").eq("follower_id", userId),
    ]);

  // RLS on `visits` already restricts this to rows each followee lets us see
  // (public/followers/mutuals as applicable), so a followee who marks a
  // review private or otherwise hides it from us is silently excluded here.
  const followeeIds = follows?.map((f) => f.followee_id) ?? [];
  let followeeAvg: { avg: number; n: number } | null = null;
  if (followeeIds.length > 0) {
    const { data: followeeVisits } = await supabase
      .from("visits")
      .select("place_rating")
      .eq("place_id", placeId)
      .in("user_id", followeeIds)
      .not("place_rating", "is", null);
    if (followeeVisits && followeeVisits.length > 0) {
      const ratings = followeeVisits.map((v) => v.place_rating as number);
      followeeAvg = {
        avg: ratings.reduce((a, b) => a + b, 0) / ratings.length,
        n: ratings.length,
      };
    }
  }

  return (
    <>
      <div className="mt-4 flex items-end gap-4 rounded-xl border border-stone-200 p-4">
        <div>
          <div className="text-4xl font-bold">{stats?.recent_avg ?? "—"}</div>
          <div className="text-xs text-stone-500">lo que ves tú · reciente (12 meses) · n={stats?.recent_n ?? 0}</div>
        </div>
        <div>
          <div className="text-lg font-medium text-stone-500">{stats?.historical_avg ?? "—"}</div>
          <div className="text-xs text-stone-400">histórica · n={stats?.historical_n ?? 0}</div>
        </div>
        {trend && <TrendBadge status={trend.status as never} delta={trend.delta} />}
      </div>

      {followeeAvg && (
        <div className="mt-4 rounded-xl border border-stone-200 p-4">
          <div className="text-lg font-medium">{followeeAvg.avg.toFixed(1)} · gente que sigues</div>
          <div className="text-xs text-stone-500">
            {followeeAvg.n} {followeeAvg.n === 1 ? "nota" : "notas"} de quien sigues y comparte su reseña contigo
          </div>
        </div>
      )}

      <PlaceEvolution placeId={placeId} initialData={timeseries ?? []} />

      <DishRankings placeId={placeId} initial={rankings ?? []} />

      <div className="mt-8">
        <h2 className="mb-2 text-sm font-semibold">Reseñas que puedes ver</h2>
        <ul className="flex flex-col gap-3">
          {reviews?.map((r) => (
            <li key={r.id} className="rounded-lg border border-stone-200 px-4 py-3">
              <div className="flex items-center justify-between text-xs text-stone-500">
                {r.profiles ? (
                  <Link href={`/u/${r.profiles.username}`} className="font-medium text-stone-800">
                    {r.profiles.display_name || `@${r.profiles.username}`}
                  </Link>
                ) : (
                  <span>Usuario</span>
                )}
                <span>{r.visited_on}</span>
              </div>
              <div className="mt-1 font-medium">{"★".repeat(r.place_rating ?? 0)}</div>
              {r.place_comment && <p className="mt-1 text-sm">{r.place_comment}</p>}
            </li>
          ))}
          {(!reviews || reviews.length === 0) && (
            <p className="text-sm text-stone-400">
              Todavía no hay reseñas que puedas ver. Sigue a más gente o registra la tuya.
            </p>
          )}
        </ul>
      </div>
    </>
  );
}
