import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPlaceGeneralScores } from "@/lib/places";
import { getDesignComponents } from "@/lib/design-components";
import { PlaceEvolution } from "@/components/PlaceEvolution";
import { DishRankings } from "@/components/DishRankings";
import { PlaceHeaderActions } from "@/components/PlaceHeaderActions";
import { PlaceStatSquares } from "@/components/PlaceStatSquares";

export default async function PlaceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: place } = await supabase.from("places").select("*").eq("id", id).single();
  if (!place) notFound();

  const general = (await getPlaceGeneralScores(supabase, [id])).get(id) ?? null;

  // "Quiero ir", the user's lists, and who they follow are all private to them,
  // so RLS returns only their own rows here.
  const [saved, lists, memberships, follows] = user
    ? await Promise.all([
        supabase.from("saved_places").select("place_id").eq("user_id", user.id).eq("place_id", id).maybeSingle(),
        supabase.from("place_lists").select("id, name").order("name"),
        supabase.from("place_list_items").select("list_id").eq("place_id", id),
        supabase.from("follows").select("followee_id").eq("follower_id", user.id),
      ])
    : [null, null, null, null];

  // RLS on `visits` already restricts this to rows each followee lets us see
  // (public/followers/mutuals as applicable), so a followee who marks a
  // review private or otherwise hides it from us is silently excluded here.
  const followeeIds = follows?.data?.map((f) => f.followee_id) ?? [];
  type FriendVisit = {
    id: string;
    visited_on: string;
    place_rating: number | null;
    place_comment: string | null;
    profiles: { username: string; display_name: string | null } | null;
  };
  let friends: { avg: number; n: number; visits: FriendVisit[] } | null = null;
  if (followeeIds.length > 0) {
    const { data } = await supabase
      .from("visits")
      .select("id, visited_on, place_rating, place_comment, profiles(username, display_name)")
      .eq("place_id", id)
      .in("user_id", followeeIds)
      .not("place_rating", "is", null)
      .order("visited_on", { ascending: false });
    const followeeVisits: FriendVisit[] = data ?? [];
    if (followeeVisits.length > 0) {
      const ratings = followeeVisits.map((v) => v.place_rating as number);
      friends = { avg: ratings.reduce((a, b) => a + b, 0) / ratings.length, n: ratings.length, visits: followeeVisits };
    }
  }

  const { PlaceHeader } = await getDesignComponents();

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <PlaceHeader
        place={place}
        actionsSlot={
          user ? (
            <PlaceHeaderActions
              placeId={id}
              saved={Boolean(saved?.data)}
              lists={lists?.data ?? []}
              memberOf={memberships?.data?.map((m) => m.list_id) ?? []}
            />
          ) : undefined
        }
      />

      <PlaceStatSquares general={general} friends={friends} signedIn={Boolean(user)} />

      {user ? (
        <Suspense fallback={<PlaceSignedInSkeleton />}>
          <SignedInSections placeId={id} />
        </Suspense>
      ) : (
        <SignedOutSections placeId={id} />
      )}
    </div>
  );
}

// Shown while SignedInSections' evolution/rankings/reviews queries resolve, so
// the header and stat squares above paint immediately.
function PlaceSignedInSkeleton() {
  return (
    <div className="mt-6 animate-pulse">
      <div className="h-40 rounded-xl bg-stone-50" />
      <div className="mt-6 flex flex-col gap-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-10 rounded-lg border border-stone-100 bg-stone-50" />
        ))}
      </div>
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

async function SignedInSections({ placeId }: { placeId: string }) {
  const supabase = await createClient();

  const today = new Date();
  const from = new Date(today);
  from.setMonth(from.getMonth() - 24);
  const fromStr = from.toISOString().slice(0, 10);
  const toStr = today.toISOString().slice(0, 10);

  // Everything below is computed by RLS over the visits this user is allowed to
  // read (their own, public ones, and those of people who let them see them).
  const [{ data: timeseries }, { data: rankings }, { data: reviews }] = await Promise.all([
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
  ]);

  return (
    <>
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
