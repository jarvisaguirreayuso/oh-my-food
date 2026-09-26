import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { SEED_PLACES, SEED_USERS, SUPABASE_ANON_KEY, SUPABASE_URL } from "./env";

// Per-review photos (migration 20260926100000): the photo travels with the
// review through save_visit and is readable under exactly the same audience
// rule as the review itself -- no separate policy exists for it.

function client(): SupabaseClient<Database> {
  return createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
}

async function signIn(user: { email: string; password: string }) {
  const supabase = client();
  const { error } = await supabase.auth.signInWithPassword(user);
  if (error) throw error;
  return supabase;
}

const PLACE = SEED_PLACES.filler;
const PUBLIC_PHOTO = "http://127.0.0.1:54321/storage/v1/object/public/dish-photos/test-public.jpg";
const PRIVATE_PHOTO = "http://127.0.0.1:54321/storage/v1/object/public/dish-photos/test-private.jpg";

// Same query shape as src/lib/queries/photos.ts (inner-joined embeds + filters).
async function photosVisibleTo(reader: SupabaseClient<Database>, userId: string) {
  const { data, error } = await reader
    .from("dish_reviews")
    .select("id, photo_url, dishes!inner(place_id), visits!inner(user_id, visited_on)")
    .not("photo_url", "is", null)
    .eq("dishes.place_id", PLACE)
    .eq("visits.user_id", userId)
    .in("visits.visited_on", ["2019-02-01", "2019-02-02"]);
  expect(error).toBeNull();
  return new Set(data?.map((r) => r.photo_url));
}

describe("dish review photos", () => {
  let ana: SupabaseClient<Database>;
  let david: SupabaseClient<Database>;
  let dishId: string;
  const visitIds: string[] = [];

  beforeAll(async () => {
    [ana, david] = await Promise.all([signIn(SEED_USERS.ana), signIn(SEED_USERS.david)]);
    const { data: dish, error } = await client().from("dishes").select("id").eq("place_id", PLACE).limit(1).single();
    if (error || !dish) throw error ?? new Error("seed dish missing");
    dishId = dish.id;

    for (const [visitedOn, audience, photo] of [
      ["2019-02-01", "public", PUBLIC_PHOTO],
      ["2019-02-02", "private", PRIVATE_PHOTO],
    ] as const) {
      const { data: visitId, error: saveErr } = await ana.rpc("save_visit", {
        p_place_id: PLACE,
        p_visited_on: visitedOn,
        p_place_rating: 4,
        p_place_comment: "photo fixture",
        p_audience: audience,
        p_dishes: [{ dish_id: dishId, idea: 4, execution: 4, would_repeat: true, comment: null, photo_url: photo }],
      });
      if (saveErr || !visitId) throw saveErr ?? new Error("save_visit failed");
      visitIds.push(visitId);
    }
  });

  afterAll(async () => {
    await ana.from("visits").delete().in("id", visitIds);
  });

  it("save_visit stores photo_url on the review", async () => {
    const { data } = await ana.from("dish_reviews").select("photo_url").eq("visit_id", visitIds[0]).single();
    expect(data?.photo_url).toBe(PUBLIC_PHOTO);
  });

  it("the author sees both photos", async () => {
    expect(await photosVisibleTo(ana, SEED_USERS.ana.id)).toEqual(new Set([PUBLIC_PHOTO, PRIVATE_PHOTO]));
  });

  it("another user sees only the public review's photo, never the private one", async () => {
    const seen = await photosVisibleTo(david, SEED_USERS.ana.id);
    expect(seen.has(PUBLIC_PHOTO)).toBe(true);
    expect(seen.has(PRIVATE_PHOTO)).toBe(false);
  });

  it("anon sees no review photos at all", async () => {
    const { error } = await client().from("dish_reviews").select("photo_url").limit(1);
    expect(error).not.toBeNull();
  });

  it("re-saving the visit without a photo clears it (unlike the dish's set-once photo)", async () => {
    const { error } = await ana.rpc("save_visit", {
      p_place_id: PLACE,
      p_visited_on: "2019-02-01",
      p_place_rating: 4,
      p_place_comment: "photo fixture",
      p_audience: "public",
      p_dishes: [{ dish_id: dishId, idea: 4, execution: 4, would_repeat: true, comment: null, photo_url: null }],
    });
    expect(error).toBeNull();
    const { data } = await ana.from("dish_reviews").select("photo_url").eq("visit_id", visitIds[0]).single();
    expect(data?.photo_url).toBeNull();
  });
});
