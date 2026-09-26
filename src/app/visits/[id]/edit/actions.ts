"use server";

import { redirect } from "next/navigation";
import { visitSchema } from "@/lib/validation";
import { createClient } from "@/lib/supabase/server";

export type SaveVisitState = { status: "idle" | "error"; message?: string };

export async function updateVisit(
  _prev: SaveVisitState,
  formData: FormData
): Promise<SaveVisitState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const visitId = formData.get("visitId");
  const raw = formData.get("payload");
  const rawOriginalDishIds = formData.get("originalDishIds");
  if (typeof visitId !== "string" || typeof raw !== "string") {
    return { status: "error", message: "Faltan datos de la visita" };
  }
  let originalDishIds: string[] = [];
  if (typeof rawOriginalDishIds === "string") {
    try {
      originalDishIds = JSON.parse(rawOriginalDishIds);
    } catch {
      originalDishIds = [];
    }
  }

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return { status: "error", message: "Datos de la visita corruptos" };
  }

  const parsed = visitSchema.safeParse(payload);
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const { placeId, visitedOn, placeRating, placeComment, dishes, audience } = parsed.data;

  const { data: newVisitId, error } = await supabase.rpc("save_visit", {
    p_place_id: placeId,
    p_visited_on: visitedOn,
    // save_visit's SQL params have no NOT NULL constraint, so passing null is
    // valid at runtime even though the generated Supabase types (which don't
    // encode per-argument nullability) type these as non-null.
    p_place_rating: placeRating as number,
    p_place_comment: placeComment as string,
    p_audience: audience,
    p_dishes: dishes.map((d) => ({
      dish_id: d.dishId,
      dish_name: d.dishName,
      idea: d.idea,
      execution: d.execution,
      would_repeat: d.wouldRepeat,
      comment: d.comment ?? null,
      price: d.price ?? null,
      photo_url: d.photoUrl ?? null,
    })),
  });

  if (error || !newVisitId) {
    return { status: "error", message: error?.message ?? "No se pudo actualizar la visita" };
  }

  // Remove dish_reviews for dishes that were present before the edit and are
  // no longer submitted (the user removed that dish entry). Newly created
  // dishes (submitted with dishId=null) are never candidates for removal.
  const submittedDishIds = new Set(dishes.map((d) => d.dishId).filter((id): id is string => !!id));
  const removedDishIds = originalDishIds.filter((id) => !submittedDishIds.has(id));
  if (removedDishIds.length > 0) {
    await supabase
      .from("dish_reviews")
      .delete()
      .eq("visit_id", newVisitId)
      .in("dish_id", removedDishIds);
  }

  redirect(`/visits/mine`);
}
