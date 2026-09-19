import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { SEED_PLACES, SEED_USERS, SUPABASE_ANON_KEY, SUPABASE_URL } from "./env";

// Saved places and lists are private to their owner
// (supabase/migrations/20260921100000_saved_places_and_lists.sql).

function client(): SupabaseClient<Database> {
  return createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
}

async function signIn(user: { email: string; password: string }) {
  const supabase = client();
  const { error } = await supabase.auth.signInWithPassword(user);
  if (error) throw error;
  return supabase;
}

const NO_PRIVILEGE = "42501";

describe("saved places", () => {
  let ana: SupabaseClient<Database>;
  let bruno: SupabaseClient<Database>;

  beforeAll(async () => {
    [ana, bruno] = await Promise.all([signIn(SEED_USERS.ana), signIn(SEED_USERS.bruno)]);
  });

  afterAll(async () => {
    await ana.from("saved_places").delete().eq("user_id", SEED_USERS.ana.id);
  });

  it("lets a user save, read and unsave a place", async () => {
    const ins = await ana.from("saved_places").insert({ user_id: SEED_USERS.ana.id, place_id: SEED_PLACES.stable, note: "probar" });
    expect(ins.error).toBeNull();

    const read = await ana.from("saved_places").select("place_id, note").eq("place_id", SEED_PLACES.stable);
    expect(read.data).toEqual([{ place_id: SEED_PLACES.stable, note: "probar" }]);

    const dup = await ana.from("saved_places").insert({ user_id: SEED_USERS.ana.id, place_id: SEED_PLACES.stable });
    expect(dup.error?.code).toBe("23505");

    const del = await ana.from("saved_places").delete().eq("place_id", SEED_PLACES.stable).select();
    expect(del.data).toHaveLength(1);
  });

  it("keeps saved places private: others read nothing, can't delete, can't save as someone else", async () => {
    await ana.from("saved_places").insert({ user_id: SEED_USERS.ana.id, place_id: SEED_PLACES.improving });

    expect((await bruno.from("saved_places").select("place_id").eq("user_id", SEED_USERS.ana.id)).data).toHaveLength(0);
    expect((await bruno.from("saved_places").delete().eq("user_id", SEED_USERS.ana.id).select()).data).toHaveLength(0);
    expect((await bruno.from("saved_places").update({ note: "hijacked" }).eq("user_id", SEED_USERS.ana.id).select()).data).toHaveLength(0);

    const impersonate = await bruno.from("saved_places").insert({ user_id: SEED_USERS.ana.id, place_id: SEED_PLACES.declining });
    expect(impersonate.error).not.toBeNull();

    expect((await ana.from("saved_places").select("place_id").eq("place_id", SEED_PLACES.improving)).data).toHaveLength(1);
  });

  it("gives anon no access", async () => {
    for (const table of ["saved_places", "place_lists", "place_list_items"] as const) {
      const { error } = await client().from(table).select("*").limit(1);
      expect(error?.code, table).toBe(NO_PRIVILEGE);
    }
  });
});

describe("place lists", () => {
  let ana: SupabaseClient<Database>;
  let bruno: SupabaseClient<Database>;
  let listId: string;

  beforeAll(async () => {
    [ana, bruno] = await Promise.all([signIn(SEED_USERS.ana), signIn(SEED_USERS.bruno)]);
    const { data, error } = await ana
      .from("place_lists")
      .insert({ owner_id: SEED_USERS.ana.id, name: "lists test" })
      .select("id")
      .single();
    if (error || !data) throw error ?? new Error("list not created");
    listId = data.id;
  });

  afterAll(async () => {
    await ana.from("place_lists").delete().eq("id", listId); // items cascade
  });

  it("lets the owner add, list and remove places", async () => {
    const add = await ana.from("place_list_items").insert({ list_id: listId, place_id: SEED_PLACES.stable });
    expect(add.error).toBeNull();

    const dup = await ana.from("place_list_items").insert({ list_id: listId, place_id: SEED_PLACES.stable });
    expect(dup.error?.code).toBe("23505");

    const { data } = await ana.from("place_lists").select("id, name, place_list_items(place_id)").eq("id", listId).single();
    expect(data?.place_list_items).toEqual([{ place_id: SEED_PLACES.stable }]);

    const rm = await ana.from("place_list_items").delete().eq("list_id", listId).eq("place_id", SEED_PLACES.stable).select();
    expect(rm.data).toHaveLength(1);
  });

  it("hides lists and their items from everybody else", async () => {
    await ana.from("place_list_items").insert({ list_id: listId, place_id: SEED_PLACES.improving });

    expect((await bruno.from("place_lists").select("id").eq("id", listId)).data).toHaveLength(0);
    expect((await bruno.from("place_list_items").select("place_id").eq("list_id", listId)).data).toHaveLength(0);
    // Embeds go through the same policies.
    const { data } = await bruno.from("places").select("id, place_list_items(list_id)").eq("id", SEED_PLACES.improving).single();
    expect(data?.place_list_items).toHaveLength(0);
  });

  it("does not let others add to, remove from, rename or delete a list they don't own", async () => {
    const add = await bruno.from("place_list_items").insert({ list_id: listId, place_id: SEED_PLACES.declining });
    expect(add.error).not.toBeNull();

    const rm = await bruno.from("place_list_items").delete().eq("list_id", listId).select();
    expect(rm.data).toHaveLength(0);

    const rename = await bruno.from("place_lists").update({ name: "hijacked" }).eq("id", listId).select();
    expect(rename.data).toHaveLength(0);

    const del = await bruno.from("place_lists").delete().eq("id", listId).select();
    expect(del.data).toHaveLength(0);

    const { data } = await ana.from("place_lists").select("name").eq("id", listId).single();
    expect(data?.name).toBe("lists test");
  });

  it("does not let a user create a list for somebody else", async () => {
    const { error } = await bruno.from("place_lists").insert({ owner_id: SEED_USERS.ana.id, name: "spoofed" });
    expect(error).not.toBeNull();
  });

  it("enforces name rules and unique names per owner, and only allows renaming", async () => {
    expect((await ana.from("place_lists").insert({ owner_id: SEED_USERS.ana.id, name: "lists test" })).error?.code).toBe("23505");
    expect((await ana.from("place_lists").insert({ owner_id: SEED_USERS.ana.id, name: "   " })).error?.code).toBe("23514");
    // A different owner can reuse the same name.
    const other = await bruno.from("place_lists").insert({ owner_id: SEED_USERS.bruno.id, name: "lists test" }).select("id").single();
    expect(other.error).toBeNull();
    await bruno.from("place_lists").delete().eq("id", other.data!.id);

    const move = await ana.from("place_lists").update({ owner_id: SEED_USERS.bruno.id } as never).eq("id", listId);
    expect(move.error?.code).toBe(NO_PRIVILEGE);
  });

  it("removes a list's items when the list is deleted", async () => {
    const { data: tmp } = await ana.from("place_lists").insert({ owner_id: SEED_USERS.ana.id, name: "temp cascade" }).select("id").single();
    await ana.from("place_list_items").insert({ list_id: tmp!.id, place_id: SEED_PLACES.filler });
    await ana.from("place_lists").delete().eq("id", tmp!.id);
    expect((await ana.from("place_list_items").select("place_id").eq("list_id", tmp!.id)).data).toHaveLength(0);
  });
});
