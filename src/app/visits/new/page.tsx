import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { NewVisitForm } from "./NewVisitForm";

export default async function NewVisitPage({
  searchParams,
}: {
  searchParams: Promise<{ place?: string }>;
}) {
  const { place: rawPlaceId } = await searchParams;

  // `?place=<id>` preselects the place (used by "Registrar visita" on a place's page).
  // An invalid or unknown id just falls back to the regular place picker.
  // z.guid(), not z.uuid(): Postgres accepts any 8-4-4-4-12 hex uuid, zod's uuid() also demands a valid RFC version/variant.
  let initialPlace: { id: string; name: string } | null = null;
  const placeId = z.guid().safeParse(rawPlaceId);
  if (placeId.success) {
    const supabase = await createClient();
    const { data } = await supabase.from("places").select("id, name").eq("id", placeId.data).maybeSingle();
    initialPlace = data;
  }

  return <NewVisitForm initialPlace={initialPlace} />;
}
