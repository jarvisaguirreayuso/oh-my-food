import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { NewVisitForm } from "./NewVisitForm";

export default async function NewVisitPage({
  searchParams,
}: {
  searchParams: Promise<{ place?: string }>;
}) {
  const { place: rawPlaceId } = await searchParams;
  const supabase = await createClient();

  // `?place=<id>` preselects the place (used by "Registrar visita" on a place's page).
  // An invalid or unknown id just falls back to the regular place picker.
  // z.guid(), not z.uuid(): Postgres accepts any 8-4-4-4-12 hex uuid, zod's uuid() also demands a valid RFC version/variant.
  let initialPlace: { id: string; name: string } | null = null;
  const placeId = z.guid().safeParse(rawPlaceId);
  if (placeId.success) {
    const { data } = await supabase.from("places").select("id, name").eq("id", placeId.data).maybeSingle();
    initialPlace = data;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: settings } = user
    ? await supabase
        .from("profile_settings")
        .select("default_audience, default_pools_publicly")
        .eq("user_id", user.id)
        .maybeSingle()
    : { data: null };

  return (
    <NewVisitForm
      initialPlace={initialPlace}
      defaults={{
        audience: settings?.default_audience ?? "followers",
        poolsPublicly: settings?.default_pools_publicly ?? true,
      }}
    />
  );
}
