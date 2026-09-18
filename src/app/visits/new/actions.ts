"use server";

import { redirect } from "next/navigation";
import { visitSchema } from "@/lib/validation";
import { createClient } from "@/lib/supabase/server";

export type SaveVisitState = { status: "idle" | "error"; message?: string };

export async function submitVisit(
  _prev: SaveVisitState,
  formData: FormData
): Promise<SaveVisitState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const raw = formData.get("payload");
  if (typeof raw !== "string") {
    return { status: "error", message: "Faltan datos de la visita" };
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

  const { placeId, visitedOn, placeRating, placeComment, dishes } = parsed.data;

  const { data: visitId, error } = await supabase.rpc("save_visit", {
    p_place_id: placeId,
    p_visited_on: visitedOn,
    // save_visit's SQL params have no NOT NULL constraint, so passing null is
    // valid at runtime even though the generated Supabase types (which don't
    // encode per-argument nullability) type these as non-null.
    p_place_rating: placeRating as number,
    p_place_comment: placeComment as string,
    p_dishes: dishes.map((d) => ({
      dish_id: d.dishId,
      dish_name: d.dishName,
      idea: d.idea,
      execution: d.execution,
      flavor: d.flavor,
      would_repeat: d.wouldRepeat,
      comment: d.comment ?? null,
    })),
  });

  if (error || !visitId) {
    return { status: "error", message: error?.message ?? "No se pudo guardar la visita" };
  }

  redirect(`/places/${placeId}`);
}
