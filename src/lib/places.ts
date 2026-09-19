import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

export const TYPE_LABELS: Record<string, string> = {
  restaurant: "Restaurante",
  food_stall: "Puesto",
  food_truck: "Food truck",
  market_stall: "Puesto de mercado",
  other: "Otro",
};

export type GeneralScore = { avg: number | null; n: number };

// General averages are the only review-derived numbers an anonymous visitor
// can see. They come from a security definer function that returns aggregates
// only (see the invariants in the social_core migration).
export async function getPlaceGeneralScores(
  supabase: SupabaseClient<Database>,
  placeIds: string[]
): Promise<Map<string, GeneralScore>> {
  const scores = new Map<string, GeneralScore>();
  if (placeIds.length === 0) return scores;
  const { data } = await supabase.rpc("place_general_scores", { p_place_ids: placeIds });
  for (const row of data ?? []) scores.set(row.place_id, { avg: row.avg_rating, n: row.n });
  return scores;
}
