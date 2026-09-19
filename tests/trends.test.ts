import { beforeAll, describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { SEED_PLACES, SEED_USERS, SUPABASE_ANON_KEY, SUPABASE_URL } from "./env";

// Validates the temporal RPCs (supabase/migrations/20260918100006 and
// ...100007) against supabase/seed.sql's known, deliberately-shaped data:
// Casa Manolo (improving 3.3 -> 4.7), Bocatería El Rápido (declining
// 4.7 -> 3.1), Taco Volador (stable ~4.0), Mercado de la Paella (sparse,
// ~1 visit/quarter -> should read as insufficient_data).

const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);

// The temporal RPCs run as SECURITY INVOKER, so they aggregate what the caller
// is allowed to read. Anonymous callers read no visits at all; the seed's visits
// are public, so any signed-in user sees all of them.
beforeAll(async () => {
  const { error } = await supabase.auth.signInWithPassword(SEED_USERS.ana);
  if (error) throw error;
});

// Wide enough to cover the seed's ~18 months of synthetic history relative
// to "today", without generating an excessive number of empty periods.
const FROM = "2024-01-01";
const TO = "2027-06-01";

describe("place_trend", () => {
  it("detects an improving place as up", async () => {
    const { data, error } = await supabase.rpc("place_trend", { p_place_id: SEED_PLACES.improving }).single();
    expect(error).toBeNull();
    expect(data?.status).toBe("up");
    expect(data?.delta).toBeGreaterThan(0);
  });

  it("detects a declining place as down", async () => {
    const { data, error } = await supabase.rpc("place_trend", { p_place_id: SEED_PLACES.declining }).single();
    expect(error).toBeNull();
    expect(data?.status).toBe("down");
    expect(data?.delta).toBeLessThan(0);
  });

  it("detects a flat place as stable", async () => {
    const { data, error } = await supabase.rpc("place_trend", { p_place_id: SEED_PLACES.stable }).single();
    expect(error).toBeNull();
    expect(data?.status).toBe("stable");
  });

  it("reports insufficient_data for a sparsely-visited place", async () => {
    const { data, error } = await supabase.rpc("place_trend", { p_place_id: SEED_PLACES.filler }).single();
    expect(error).toBeNull();
    expect(data?.status).toBe("insufficient_data");
  });
});

describe("place_timeseries", () => {
  it("returns one row per month with n and a 3-period moving average, leaving true gaps as null", async () => {
    const { data, error } = await supabase.rpc("place_timeseries", {
      p_place_id: SEED_PLACES.filler,
      p_granularity: "month",
      p_from: FROM,
      p_to: TO,
    });
    expect(error).toBeNull();
    expect(data).toBeTruthy();
    if (!data) return;

    // Mercado de la Paella only gets a visit every 3rd seed month, so most
    // months in the generated series must have n = 0 / avg_rating = null —
    // proving gaps aren't zero-filled — while at least some months do have
    // data.
    const withData = data.filter((row: { n: number }) => row.n > 0);
    const withoutData = data.filter((row: { n: number }) => row.n === 0);
    expect(withData.length).toBeGreaterThan(0);
    expect(withoutData.length).toBeGreaterThan(0);
    for (const row of withoutData) {
      expect(row.avg_rating).toBeNull();
    }
  });

  it("computes a moving average only over periods that have data", async () => {
    const { data, error } = await supabase.rpc("place_timeseries", {
      p_place_id: SEED_PLACES.improving,
      p_granularity: "month",
      p_from: FROM,
      p_to: TO,
    });
    expect(error).toBeNull();
    expect(data).toBeTruthy();
    if (!data) return;

    const withData = data.filter((row: { n: number }) => row.n > 0);
    expect(withData.length).toBeGreaterThan(0);
    for (const row of withData) {
      expect(row.moving_avg_3).not.toBeNull();
    }
  });
});

describe("place_stats", () => {
  it("returns recent (12mo) and all-time figures with sample sizes", async () => {
    const { data, error } = await supabase.rpc("place_stats", { p_place_id: SEED_PLACES.stable }).single();
    expect(error).toBeNull();
    expect(data).toBeTruthy();
    expect(data?.recent_n).toBeGreaterThan(0);
    expect(data?.historical_n).toBeGreaterThanOrEqual(data?.recent_n ?? 0);
  });
});
