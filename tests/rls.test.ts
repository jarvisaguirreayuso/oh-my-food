import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { SEED_PLACES, SEED_USERS, SUPABASE_ANON_KEY, SUPABASE_URL } from "./env";

// Exercises RLS policies from supabase/migrations/20260918100004_rls.sql
// against the local stack, using two real seed users (ana/bruno) signed in
// via password auth. All assertions rely on RLS filtering affected rows to
// zero, not on Postgrest throwing — Postgres RLS silently excludes rows the
// role can't touch, so `update`/`delete` succeed with an empty `data` array
// rather than erroring.

function client(): SupabaseClient<Database> {
  return createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
}

async function signIn(user: { email: string; password: string }) {
  const supabase = client();
  const { error } = await supabase.auth.signInWithPassword(user);
  if (error) throw error;
  return supabase;
}

describe("row level security", () => {
  let anaClient: SupabaseClient;
  let brunoClient: SupabaseClient;
  let ownVisitId: string;
  let ownDishReviewId: string;
  let stableDishId: string;

  beforeAll(async () => {
    anaClient = await signIn(SEED_USERS.ana);
    brunoClient = await signIn(SEED_USERS.bruno);

    const { data: dish, error: dishErr } = await client()
      .from("dishes")
      .select("id")
      .eq("place_id", SEED_PLACES.stable)
      .limit(1)
      .single();
    if (dishErr || !dish) throw dishErr ?? new Error("seed dish missing");
    stableDishId = dish.id;

    // Fresh, ana-owned fixture rows (dates far outside the seed's ~18-month
    // window, so they can't collide with the visits unique constraint).
    const { data: visit, error: visitErr } = await anaClient
      .from("visits")
      .insert({
        user_id: SEED_USERS.ana.id,
        place_id: SEED_PLACES.stable,
        visited_on: "2020-01-15",
        place_rating: 5,
        place_comment: "rls fixture",
      })
      .select("id")
      .single();
    if (visitErr || !visit) throw visitErr ?? new Error("failed to insert fixture visit");
    ownVisitId = visit.id;

    const { data: review, error: reviewErr } = await anaClient
      .from("dish_reviews")
      .insert({
        visit_id: ownVisitId,
        dish_id: stableDishId,
        idea: 4,
        execution: 4,
        flavor: 4,
        would_repeat: true,
      })
      .select("id")
      .single();
    if (reviewErr || !review) throw reviewErr ?? new Error("failed to insert fixture review");
    ownDishReviewId = review.id;
  });

  afterAll(async () => {
    // dish_reviews cascades from visits, but clean up explicitly either way.
    await anaClient.from("dish_reviews").delete().eq("id", ownDishReviewId);
    await anaClient.from("visits").delete().eq("id", ownVisitId);
  });

  // Privilege lock-down (20260919100000_lock_down_grants.sql). Postgres rejects
  // a missing privilege with 42501 (insufficient_privilege), unlike RLS which
  // silently filters rows.
  const INSUFFICIENT_PRIVILEGE = "42501";

  it("lets anon read visits and dish_reviews, but never who wrote a visit", async () => {
    const { data, error } = await client()
      .from("visits")
      .select("id, place_id, visited_on, place_rating, place_comment")
      .eq("id", ownVisitId);
    expect(error).toBeNull();
    expect(data).toHaveLength(1);

    const { data: reviews, error: reviewsErr } = await client()
      .from("dish_reviews")
      .select("id, dish_id, flavor")
      .eq("id", ownDishReviewId);
    expect(reviewsErr).toBeNull();
    expect(reviews).toHaveLength(1);
  });

  it("hides visits.user_id from anon (select, filter, star and embed)", async () => {
    const selectUserId = await client().from("visits").select("user_id").eq("id", ownVisitId);
    expect(selectUserId.error?.code).toBe(INSUFFICIENT_PRIVILEGE);

    // Filtering by the column would be an oracle even without selecting it.
    const filterByUser = await client().from("visits").select("id").eq("user_id", SEED_USERS.ana.id);
    expect(filterByUser.error?.code).toBe(INSUFFICIENT_PRIVILEGE);

    const selectStar = await client().from("visits").select("*").eq("id", ownVisitId);
    expect(selectStar.error?.code).toBe(INSUFFICIENT_PRIVILEGE);

    const embedAuthor = await client().from("visits").select("id, profiles(username)").eq("id", ownVisitId);
    expect(embedAuthor.error?.code).toBe(INSUFFICIENT_PRIVILEGE);
  });

  it("still lets signed-in users read visits.user_id", async () => {
    const { data, error } = await brunoClient.from("visits").select("user_id").eq("id", ownVisitId);
    expect(error).toBeNull();
    expect(data?.[0]?.user_id).toBe(SEED_USERS.ana.id);
  });

  it("gives anon no write privileges on any table", async () => {
    const insert = await client().from("places").insert({ name: "anon place", type: "restaurant" });
    expect(insert.error?.code).toBe(INSUFFICIENT_PRIVILEGE);

    const update = await client().from("visits").update({ place_comment: "anon" }).eq("id", ownVisitId);
    expect(update.error?.code).toBe(INSUFFICIENT_PRIVILEGE);

    const del = await client().from("visits").delete().eq("id", ownVisitId);
    expect(del.error?.code).toBe(INSUFFICIENT_PRIVILEGE);

    const delReview = await client().from("dish_reviews").delete().eq("id", ownDishReviewId);
    expect(delReview.error?.code).toBe(INSUFFICIENT_PRIVILEGE);
  });

  it("does not let signed-in users delete places, dishes or profiles", async () => {
    const place = await brunoClient.from("places").delete().eq("id", SEED_PLACES.stable);
    expect(place.error?.code).toBe(INSUFFICIENT_PRIVILEGE);

    const dish = await brunoClient.from("dishes").delete().eq("id", stableDishId);
    expect(dish.error?.code).toBe(INSUFFICIENT_PRIVILEGE);

    const profile = await brunoClient.from("profiles").delete().eq("id", SEED_USERS.bruno.id);
    expect(profile.error?.code).toBe(INSUFFICIENT_PRIVILEGE);
  });

  it("does not let anon call save_visit", async () => {
    const { error } = await client().rpc("save_visit", {
      p_place_id: SEED_PLACES.stable,
      p_visited_on: "2020-03-01",
      p_place_rating: 5,
      p_place_comment: "anon",
      p_dishes: [],
    });
    expect(error?.code).toBe(INSUFFICIENT_PRIVILEGE);
  });

  it("blocks another user from updating a visit they don't own", async () => {
    const { data, error } = await brunoClient
      .from("visits")
      .update({ place_comment: "hijacked" })
      .eq("id", ownVisitId)
      .select();
    expect(error).toBeNull();
    expect(data).toHaveLength(0); // RLS filtered the row out, nothing updated

    const { data: check } = await client().from("visits").select("place_comment").eq("id", ownVisitId).single();
    expect(check?.place_comment).toBe("rls fixture");
  });

  it("blocks another user from deleting a visit they don't own", async () => {
    const { data, error } = await brunoClient.from("visits").delete().eq("id", ownVisitId).select();
    expect(error).toBeNull();
    expect(data).toHaveLength(0);

    const { data: check } = await client().from("visits").select("id").eq("id", ownVisitId);
    expect(check).toHaveLength(1);
  });

  it("blocks another user from updating/deleting a dish_review via someone else's visit", async () => {
    const { data: updateData, error: updateErr } = await brunoClient
      .from("dish_reviews")
      .update({ comment: "hijacked" })
      .eq("id", ownDishReviewId)
      .select();
    expect(updateErr).toBeNull();
    expect(updateData).toHaveLength(0);

    const { data: deleteData, error: deleteErr } = await brunoClient
      .from("dish_reviews")
      .delete()
      .eq("id", ownDishReviewId)
      .select();
    expect(deleteErr).toBeNull();
    expect(deleteData).toHaveLength(0);
  });

  it("blocks another user from updating a place they didn't create", async () => {
    // Casa Manolo was created_by ana in the seed.
    const { data, error } = await brunoClient
      .from("places")
      .update({ name: "hijacked" })
      .eq("id", SEED_PLACES.improving)
      .select();
    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  it("lets the owner update their own visit and dish_review", async () => {
    const { data: visitUpdate, error: visitErr } = await anaClient
      .from("visits")
      .update({ place_comment: "updated by owner" })
      .eq("id", ownVisitId)
      .select();
    expect(visitErr).toBeNull();
    expect(visitUpdate).toHaveLength(1);
    expect(visitUpdate?.[0].place_comment).toBe("updated by owner");

    const { data: reviewUpdate, error: reviewErr } = await anaClient
      .from("dish_reviews")
      .update({ comment: "updated by owner" })
      .eq("id", ownDishReviewId)
      .select();
    expect(reviewErr).toBeNull();
    expect(reviewUpdate).toHaveLength(1);
  });

  it("rejects inserting a visit for another user (impersonation)", async () => {
    const { error } = await brunoClient.from("visits").insert({
      user_id: SEED_USERS.ana.id, // trying to write as ana while authenticated as bruno
      place_id: SEED_PLACES.stable,
      visited_on: "2020-02-20",
    });
    expect(error).not.toBeNull(); // violates the insert WITH CHECK (user_id = auth.uid())
  });
});
