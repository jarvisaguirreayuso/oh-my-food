import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { SEED_PLACES, SEED_USERS, SUPABASE_ANON_KEY, SUPABASE_URL } from "./env";

// Leak battery for the social/privacy model (supabase/migrations/20260920100000).
//
// Seed graph (supabase/seed.sql):
//   ana <-> bruno   mutual follow
//   carla  -> ana   follows ana, ana does not follow back
//   ana    -> david david does not follow ana
//
// The rule under test: a review is readable if and only if its author allowed
// the reader to see their identity. `private` matches nobody else.
//
// Who can read each of ana's fixture visits:
//                  public  followers  mutuals  private
//   ana (author)     yes      yes       yes      yes
//   bruno (mutual)   yes      yes       yes      no
//   carla (follower) yes      yes       no       no
//   david (other)    yes      no        no       no
//   anon             no       no        no       no

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
type Audience = "public" | "followers" | "mutuals" | "private";
const AUDIENCES: Audience[] = ["public", "followers", "mutuals", "private"];

describe("visit audiences (single reading rule)", () => {
  let ana: SupabaseClient<Database>;
  let bruno: SupabaseClient<Database>;
  let carla: SupabaseClient<Database>;
  let david: SupabaseClient<Database>;
  let dishId: string;
  const visitIds = {} as Record<Audience, string>;
  const reviewIds = {} as Record<Audience, string>;
  let allIds: string[];

  beforeAll(async () => {
    [ana, bruno, carla, david] = await Promise.all([
      signIn(SEED_USERS.ana),
      signIn(SEED_USERS.bruno),
      signIn(SEED_USERS.carla),
      signIn(SEED_USERS.david),
    ]);

    const { data: dish, error: dishErr } = await client().from("dishes").select("id").eq("place_id", PLACE).limit(1).single();
    if (dishErr || !dish) throw dishErr ?? new Error("seed dish missing");
    dishId = dish.id;

    // Far outside the seed's history so the unique (user, place, date) can't collide.
    for (const [i, audience] of AUDIENCES.entries()) {
      const { data: visit, error } = await ana
        .from("visits")
        .insert({
          user_id: SEED_USERS.ana.id,
          place_id: PLACE,
          visited_on: `2019-01-0${i + 1}`,
          place_rating: 5,
          place_comment: `social fixture ${audience}`,
          audience,
        })
        .select("id")
        .single();
      if (error || !visit) throw error ?? new Error(`fixture ${audience} failed`);
      visitIds[audience] = visit.id;

      const { data: review, error: reviewErr } = await ana
        .from("dish_reviews")
        .insert({ visit_id: visit.id, dish_id: dishId, idea: 5, execution: 5, would_repeat: true })
        .select("id")
        .single();
      if (reviewErr || !review) throw reviewErr ?? new Error(`review ${audience} failed`);
      reviewIds[audience] = review.id;
    }
    allIds = Object.values(visitIds);
  });

  afterAll(async () => {
    // dish_reviews cascade from visits.
    await ana.from("visits").delete().in("id", allIds);
  });

  const expectedVisible: Array<[string, () => SupabaseClient<Database>, Audience[]]> = [
    ["ana (author)", () => ana, ["public", "followers", "mutuals", "private"]],
    ["bruno (mutual)", () => bruno, ["public", "followers", "mutuals"]],
    ["carla (follows ana)", () => carla, ["public", "followers"]],
    ["david (ana follows him, no reverse)", () => david, ["public"]],
  ];

  for (const [who, getClient, visible] of expectedVisible) {
    it(`${who} reads exactly ${JSON.stringify(visible)} of ana's visits`, async () => {
      const { data, error } = await getClient().from("visits").select("id").in("id", allIds);
      expect(error).toBeNull();
      const seen = new Set(data?.map((r) => r.id));
      for (const audience of AUDIENCES) {
        expect(seen.has(visitIds[audience]), `${who} / ${audience}`).toBe(visible.includes(audience));
      }
    });

    it(`${who} reads dish_reviews only for the visits they can read`, async () => {
      const { data, error } = await getClient().from("dish_reviews").select("id").in("visit_id", allIds);
      expect(error).toBeNull();
      const seen = new Set(data?.map((r) => r.id));
      for (const audience of AUDIENCES) {
        expect(seen.has(reviewIds[audience]), `${who} / ${audience}`).toBe(visible.includes(audience));
      }
    });
  }

  it("does not leak hidden visits through PostgREST embeds", async () => {
    // From the place side: the visits embed is filtered by the same policy.
    const { data, error } = await david.from("places").select("id, visits(id)").eq("id", PLACE).single();
    expect(error).toBeNull();
    const embedded = new Set((data?.visits as Array<{ id: string }>).map((v) => v.id));
    expect(embedded.has(visitIds.public)).toBe(true);
    for (const audience of ["followers", "mutuals", "private"] as const) {
      expect(embedded.has(visitIds[audience]), audience).toBe(false);
    }

    // From the dish side: a dish embeds only reviews whose visit the reader can see.
    const { data: dish } = await david.from("dishes").select("id, dish_reviews(id)").eq("id", dishId).single();
    const seenReviews = new Set((dish?.dish_reviews as Array<{ id: string }>).map((r) => r.id));
    expect(seenReviews.has(reviewIds.public)).toBe(true);
    expect(seenReviews.has(reviewIds.private)).toBe(false);
  });

  it("lets anon read none of it", async () => {
    for (const table of ["visits", "dish_reviews"] as const) {
      const { error } = await client().from(table).select("id").limit(1);
      expect(error?.code, table).toBe("42501");
    }
  });

  it("aggregates over what you can read never exceed what you can read (RPCs are security invoker)", async () => {
    const seenBy = async (c: SupabaseClient<Database>) => {
      const { data } = await c.rpc("place_stats", { p_place_id: PLACE }).single();
      return data?.historical_n ?? 0;
    };
    // david can't read followers/mutuals/private fixtures, ana can read all four.
    expect((await seenBy(ana)) - (await seenBy(david))).toBeGreaterThanOrEqual(3);
    expect((await seenBy(anonymous())) ?? 0).toBe(0);
  });

  function anonymous() {
    return client();
  }
});

describe("follows", () => {
  let ana: SupabaseClient<Database>;
  let bruno: SupabaseClient<Database>;
  let carla: SupabaseClient<Database>;
  let david: SupabaseClient<Database>;

  beforeAll(async () => {
    [ana, bruno, carla, david] = await Promise.all([
      signIn(SEED_USERS.ana),
      signIn(SEED_USERS.bruno),
      signIn(SEED_USERS.carla),
      signIn(SEED_USERS.david),
    ]);
  });

  it("keeps the follow graph private: you only see rows you take part in", async () => {
    for (const [name, c, id] of [
      ["carla", carla, SEED_USERS.carla.id],
      ["david", david, SEED_USERS.david.id],
    ] as const) {
      const { data, error } = await c.from("follows").select("follower_id, followee_id");
      expect(error).toBeNull();
      expect(data?.length, name).toBeGreaterThan(0);
      for (const row of data ?? []) {
        expect(row.follower_id === id || row.followee_id === id, `${name} saw ${JSON.stringify(row)}`).toBe(true);
      }
    }
    // carla must not see the ana<->bruno mutual follow.
    const { data } = await carla.from("follows").select("follower_id").eq("follower_id", SEED_USERS.bruno.id);
    expect(data).toHaveLength(0);
  });

  it("does not let anon read the graph", async () => {
    const { error } = await client().from("follows").select("follower_id").limit(1);
    expect(error?.code).toBe("42501");
  });

  it("rejects following on behalf of somebody else and self-follows", async () => {
    const impersonate = await bruno.from("follows").insert({ follower_id: SEED_USERS.ana.id, followee_id: SEED_USERS.carla.id });
    expect(impersonate.error).not.toBeNull();

    const self = await bruno.from("follows").insert({ follower_id: SEED_USERS.bruno.id, followee_id: SEED_USERS.bruno.id });
    expect(self.error).not.toBeNull();
  });

  it("lets a user follow and unfollow, and unfollowing revokes access immediately", async () => {
    const before = await david.from("visits").select("id").eq("user_id", SEED_USERS.carla.id).eq("audience", "followers");
    expect(before.data).toHaveLength(0);

    // A followers-only visit by carla that david can't read until he follows her.
    const { data: visit, error } = await carla
      .from("visits")
      .insert({
        user_id: SEED_USERS.carla.id,
        place_id: PLACE,
        visited_on: "2019-02-01",
        place_rating: 4,
        audience: "followers",
      })
      .select("id")
      .single();
    expect(error).toBeNull();
    const id = visit!.id;

    try {
      expect((await david.from("visits").select("id").eq("id", id)).data).toHaveLength(0);

      const follow = await david.from("follows").insert({ follower_id: SEED_USERS.david.id, followee_id: SEED_USERS.carla.id });
      expect(follow.error).toBeNull();
      expect((await david.from("visits").select("id").eq("id", id)).data).toHaveLength(1);

      const unfollow = await david.from("follows").delete().eq("follower_id", SEED_USERS.david.id).eq("followee_id", SEED_USERS.carla.id);
      expect(unfollow.error).toBeNull();
      expect((await david.from("visits").select("id").eq("id", id)).data).toHaveLength(0);
    } finally {
      await david.from("follows").delete().eq("follower_id", SEED_USERS.david.id).eq("followee_id", SEED_USERS.carla.id);
      await carla.from("visits").delete().eq("id", id);
    }
  });

  it("does not let anyone delete a follow they aren't part of", async () => {
    const { data } = await david
      .from("follows")
      .delete()
      .eq("follower_id", SEED_USERS.ana.id)
      .eq("followee_id", SEED_USERS.bruno.id)
      .select();
    expect(data).toHaveLength(0);
    const { data: still } = await ana.from("follows").select("followee_id").eq("followee_id", SEED_USERS.bruno.id);
    expect(still).toHaveLength(1);
  });
});

describe("general scores (the only security definer surface)", () => {
  let ana: SupabaseClient<Database>;
  let dishId: string;
  const created: string[] = [];

  const general = async (c: SupabaseClient<Database>) => {
    const { data, error } = await c.rpc("place_general_scores", { p_place_ids: [PLACE] });
    expect(error).toBeNull();
    return data?.[0];
  };

  beforeAll(async () => {
    ana = await signIn(SEED_USERS.ana);
    const { data } = await client().from("dishes").select("id").eq("place_id", PLACE).limit(1).single();
    dishId = data!.id;
  });

  afterAll(async () => {
    if (created.length) await ana.from("visits").delete().in("id", created);
  });

  const addVisit = async (day: string, audience: Audience) => {
    const { data, error } = await ana
      .from("visits")
      .insert({
        user_id: SEED_USERS.ana.id,
        place_id: PLACE,
        visited_on: day,
        place_rating: 5,
        audience,
      })
      .select("id")
      .single();
    expect(error).toBeNull();
    created.push(data!.id);
    await ana
      .from("dish_reviews")
      .insert({ visit_id: data!.id, dish_id: dishId, idea: 5, execution: 5, would_repeat: true });
    return data!.id;
  };

  it("is callable by anon and returns aggregates only, with no identifying columns", async () => {
    const row = await general(client());
    expect(row).toBeTruthy();
    expect(Object.keys(row!).sort()).toEqual(["avg_rating", "n", "place_id"]);
  });

  it("counts every non-private visit, and never private ones", async () => {
    const base = (await general(client()))!.n;
    await addVisit("2018-03-01", "followers");
    await addVisit("2018-03-02", "mutuals");
    await addVisit("2018-03-03", "public");
    await addVisit("2018-03-04", "private");
    // Only the three non-private ones are added, and anon sees the same number as ana.
    expect((await general(client()))!.n).toBe(base + 3);
    expect((await general(ana))!.n).toBe(base + 3);
  });

  it("exposes dish general scores with aggregates only", async () => {
    const { data, error } = await client().rpc("dish_general_scores", { p_dish_ids: [dishId] });
    expect(error).toBeNull();
    expect(Object.keys(data![0]).sort()).toEqual(["avg_execution", "avg_idea", "dish_id", "n", "repeat_pct"]);
  });

  it("refuses oversized id lists instead of becoming a bulk scanner", async () => {
    const ids = Array.from({ length: 201 }, (_, i) => `00000000-0000-0000-0000-${String(i).padStart(12, "0")}`);
    ids[0] = PLACE;
    const { data, error } = await client().rpc("place_general_scores", { p_place_ids: ids });
    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  it("takes no caller-supplied filters (user, date, rating)", async () => {
    // Extra named arguments must not resolve to any function: PostgREST 404s.
    const { error } = await client().rpc("place_general_scores", { p_place_ids: [PLACE], p_user_id: SEED_USERS.ana.id } as never);
    expect(error).not.toBeNull();
  });
});

describe("visit audience rules and save_visit", () => {
  let ana: SupabaseClient<Database>;
  const created: string[] = [];

  beforeAll(async () => {
    ana = await signIn(SEED_USERS.ana);
  });

  afterAll(async () => {
    if (created.length) await ana.from("visits").delete().in("id", created);
  });

  const save = async (day: string, args: { audience?: Audience }) => {
    const { data, error } = await ana.rpc("save_visit", {
      p_place_id: PLACE,
      p_visited_on: day,
      p_place_rating: 4,
      p_place_comment: "save_visit test",
      p_dishes: [],
      ...(args.audience ? { p_audience: args.audience } : {}),
    });
    expect(error).toBeNull();
    created.push(data as string);
    const { data: row } = await ana.from("visits").select("audience, pools_publicly").eq("id", data as string).single();
    return row!;
  };

  it("uses the user's defaults (followers, pooled) when nothing is given", async () => {
    expect(await save("2017-01-01", {})).toEqual({ audience: "followers", pools_publicly: true });
  });

  it("stores an explicit audience; pooling is derived automatically", async () => {
    expect(await save("2017-01-02", { audience: "public" })).toEqual({ audience: "public", pools_publicly: true });
  });

  it("forces private visits out of the general average", async () => {
    expect(await save("2017-01-03", { audience: "private" })).toEqual({ audience: "private", pools_publicly: false });
  });

  it("keeps the audience unchanged when an update doesn't specify one", async () => {
    await save("2017-01-04", { audience: "mutuals" });
    expect(await save("2017-01-04", {})).toEqual({ audience: "mutuals", pools_publicly: true });
  });

  it("rejects any attempt to set pools_publicly directly (it's derived from audience)", async () => {
    const { error } = await ana.from("visits").insert({
      user_id: SEED_USERS.ana.id,
      place_id: PLACE,
      visited_on: "2017-01-05",
      place_rating: 3,
      audience: "private",
      pools_publicly: true,
    } as never);
    expect(error).not.toBeNull();
  });
});

describe("profiles", () => {
  let ana: SupabaseClient<Database>;
  let bruno: SupabaseClient<Database>;

  beforeAll(async () => {
    ana = await signIn(SEED_USERS.ana);
    bruno = await signIn(SEED_USERS.bruno);
  });

  it("lets signed-in users read profiles but never anyone's privacy defaults", async () => {
    const { data, error } = await bruno.from("profiles").select("id, username, display_name, bio");
    expect(error).toBeNull();
    expect(data?.length).toBeGreaterThanOrEqual(4);

    const { data: settings } = await bruno.from("profile_settings").select("user_id");
    expect(settings?.map((s) => s.user_id)).toEqual([SEED_USERS.bruno.id]);
  });

  it("lets a user edit their own profile only", async () => {
    const own = await ana.from("profiles").update({ display_name: "Ana Test", bio: "hola" }).eq("id", SEED_USERS.ana.id).select();
    expect(own.error).toBeNull();
    expect(own.data).toHaveLength(1);

    const other = await ana.from("profiles").update({ bio: "hijacked" }).eq("id", SEED_USERS.bruno.id).select();
    expect(other.data).toHaveLength(0);

    await ana.from("profiles").update({ display_name: null, bio: null }).eq("id", SEED_USERS.ana.id);
  });

  it("enforces the username format and uniqueness", async () => {
    const badFormat = await ana.from("profiles").update({ username: "Ana Test!" }).eq("id", SEED_USERS.ana.id);
    expect(badFormat.error?.code).toBe("23514");

    const tooShort = await ana.from("profiles").update({ username: "ab" }).eq("id", SEED_USERS.ana.id);
    expect(tooShort.error?.code).toBe("23514");

    const taken = await ana.from("profiles").update({ username: "bruno" }).eq("id", SEED_USERS.ana.id);
    expect(taken.error?.code).toBe("23505");
  });

  it("does not let a user change their profile id or created_at", async () => {
    const { error } = await ana.from("profiles").update({ created_at: "2000-01-01" } as never).eq("id", SEED_USERS.ana.id);
    expect(error?.code).toBe("42501");
  });

  it("lets a user read and edit only their own settings", async () => {
    const own = await ana
      .from("profile_settings")
      .update({ default_audience: "public" })
      .eq("user_id", SEED_USERS.ana.id)
      .select();
    expect(own.data).toHaveLength(1);
    await ana.from("profile_settings").update({ default_audience: "followers" }).eq("user_id", SEED_USERS.ana.id);

    const other = await ana.from("profile_settings").update({ default_audience: "public" }).eq("user_id", SEED_USERS.bruno.id).select();
    expect(other.data).toHaveLength(0);
  });
});
