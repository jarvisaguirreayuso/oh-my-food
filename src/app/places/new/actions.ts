"use server";

import { redirect } from "next/navigation";
import { newPlaceSchema } from "@/lib/validation";
import { geocodeAddress } from "@/lib/nominatim";
import { createClient } from "@/lib/supabase/server";

export type CreatePlaceState = { status: "idle" | "error"; message?: string };

export async function createPlace(
  _prev: CreatePlaceState,
  formData: FormData
): Promise<CreatePlaceState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const parsed = newPlaceSchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
    address: formData.get("address") || null,
  });

  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  let lat: number | null = null;
  let lng: number | null = null;

  if (parsed.data.address) {
    try {
      const geo = await geocodeAddress(parsed.data.address);
      if (geo) {
        lat = geo.lat;
        lng = geo.lng;
      }
    } catch {
      // Geocoding is best-effort; the place can still be created without coordinates.
    }
  }

  const { data: place, error } = await supabase
    .from("places")
    .insert({
      name: parsed.data.name,
      type: parsed.data.type,
      address: parsed.data.address,
      lat,
      lng,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !place) {
    return { status: "error", message: error?.message ?? "No se pudo crear el sitio" };
  }

  redirect(`/places/${place.id}`);
}
