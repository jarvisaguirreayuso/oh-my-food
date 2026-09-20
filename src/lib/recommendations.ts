import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

export type Recommendation = {
  place: { id: string; name: string; type: string; address: string | null };
  avg: number;
  people: number;
  source: "follows" | "popular";
};

const MIN_AVG = 4;

// Fallback used whenever there's nothing personalized to show (no follows,
// or follows haven't rated anything well yet): globally popular places using
// the same security-definer aggregate the place page uses, so it never
// leaks anything beyond what RLS already allows into the average.
async function getPopularPlaces(
  supabase: SupabaseClient<Database>,
  excludeIds: Set<string>
): Promise<Recommendation[]> {
  const { data: places } = await supabase
    .from("places")
    .select("id, name, type, address")
    .order("created_at", { ascending: false })
    .limit(200);
  const candidates = (places ?? []).filter((p) => !excludeIds.has(p.id));
  if (candidates.length === 0) return [];

  const { data: scores } = await supabase.rpc("place_general_scores", {
    p_place_ids: candidates.map((p) => p.id),
  });
  const byId = new Map(candidates.map((p) => [p.id, p]));

  return (scores ?? [])
    .filter((s) => s.avg_rating != null && byId.has(s.place_id))
    .map((s) => ({
      place: byId.get(s.place_id)!,
      avg: Number(s.avg_rating),
      people: s.n,
      source: "popular" as const,
    }))
    .sort((a, b) => b.avg - a.avg || b.people - a.people)
    .slice(0, 20);
}

// "Popular among the people you follow" (docs/plan-fase-2-social.md, B.9 #6 a):
// places well rated by the people you follow that you haven't visited or saved.
// It only aggregates visits RLS already lets you read, so it can't show you
// anything you couldn't see one by one. Falls back to globally popular places
// once there's nothing personalized to suggest, so "Para ti" is never empty.
export async function getRecommendations(
  supabase: SupabaseClient<Database>,
  userId: string,
  followeeIds: string[]
): Promise<Recommendation[]> {
  if (followeeIds.length === 0) {
    const { data: mine } = await supabase.from("visits").select("place_id").eq("user_id", userId);
    const { data: saved } = await supabase.from("saved_places").select("place_id");
    const seen = new Set([...(mine ?? []).map((v) => v.place_id), ...(saved ?? []).map((s) => s.place_id)]);
    return getPopularPlaces(supabase, seen);
  }

  const [{ data: theirs }, { data: mine }, { data: saved }] = await Promise.all([
    supabase
      .from("visits")
      .select("user_id, place_rating, places(id, name, type, address)")
      .in("user_id", followeeIds)
      .not("place_rating", "is", null)
      .limit(1000),
    supabase.from("visits").select("place_id").eq("user_id", userId),
    supabase.from("saved_places").select("place_id"),
  ]);

  const seen = new Set([...(mine ?? []).map((v) => v.place_id), ...(saved ?? []).map((s) => s.place_id)]);
  const byPlace = new Map<string, { place: Recommendation["place"]; ratings: number[]; people: Set<string> }>();

  for (const v of theirs ?? []) {
    if (!v.places || v.place_rating == null || seen.has(v.places.id)) continue;
    const entry = byPlace.get(v.places.id) ?? { place: v.places, ratings: [], people: new Set<string>() };
    entry.ratings.push(v.place_rating);
    entry.people.add(v.user_id);
    byPlace.set(v.places.id, entry);
  }

  const fromFollows = [...byPlace.values()]
    .map((e) => ({
      place: e.place,
      avg: e.ratings.reduce((a, b) => a + b, 0) / e.ratings.length,
      people: e.people.size,
      source: "follows" as const,
    }))
    .filter((r) => r.avg >= MIN_AVG)
    .sort((a, b) => b.people - a.people || b.avg - a.avg)
    .slice(0, 20);

  if (fromFollows.length > 0) return fromFollows;
  return getPopularPlaces(supabase, seen);
}
