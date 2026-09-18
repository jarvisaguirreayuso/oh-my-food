import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SEED_PLACES, SEED_USERS, SUPABASE_ANON_KEY, SUPABASE_URL } from "./env";

// Exercises RLS policies from supabase/migrations/20260918100004_rls.sql
// against the local stack, using two real seed users (ana/bruno) signed in
// via password auth. All assertions rely on RLS filtering affected rows to
// zero, not on Postgrest throwing — Postgres RLS silently excludes rows the
// role can't touch, so `update`/`delete` succeed with an empty `data` array
// rather than erroring.

function client(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
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

  it("lets anyone (even unauthenticated) read visits and dish_reviews", async () => {
    const { data, error } = await client().from("visits").select("id").eq("id", ownVisitId);
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
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
