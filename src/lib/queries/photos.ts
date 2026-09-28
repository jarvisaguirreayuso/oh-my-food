"use server";

import { createClient } from "@/lib/supabase/server";
import type { PhotoExplorerFilters, PhotoPage } from "@/components/designs/types";

const PAGE_SIZE = 24;

// Personal review photos, newest first, respecting whatever `dish_reviews`
// RLS already lets the current user see (it inherits the visit's audience).
// Optional filters narrow to one place or one author. Cursor-paginated on
// `created_at` for infinite scroll instead of loading everything at once.
export async function getDishReviewPhotos(
  filters: PhotoExplorerFilters,
  cursor?: string | null
): Promise<PhotoPage> {
  const supabase = await createClient();

  let query = supabase
    .from("dish_reviews")
    .select(
      "id, photo_url, created_at, dish_id, dishes!inner(name, place_id, places!inner(id, name)), visits!inner(visited_on, user_id, profiles!inner(username, display_name))"
    )
    .not("photo_url", "is", null)
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE);

  if (filters.placeId) query = query.eq("dishes.place_id", filters.placeId);
  if (filters.userId) query = query.eq("visits.user_id", filters.userId);
  if (cursor) query = query.lt("created_at", cursor);

  const { data } = await query;
  const rows = data ?? [];

  return {
    items: rows.map((r) => ({
      reviewId: r.id,
      photoUrl: r.photo_url as string,
      dishId: r.dish_id,
      dishName: r.dishes?.name ?? null,
      placeId: r.dishes?.places?.id ?? "",
      placeName: r.dishes?.places?.name ?? null,
      visitedOn: r.visits?.visited_on ?? "",
      authorUsername: r.visits?.profiles?.username ?? null,
      authorDisplayName: r.visits?.profiles?.display_name ?? null,
    })),
    nextCursor: rows.length === PAGE_SIZE ? rows[rows.length - 1].created_at : null,
  };
}
