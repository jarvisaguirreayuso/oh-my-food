import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DeleteButton } from "./DeleteButton";
import { AUDIENCE_LABELS } from "@/lib/audience";

export default async function MyVisitsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: visits } = await supabase
    .from("visits")
    .select(
      "id, visited_on, place_rating, place_comment, audience, pools_publicly, places(id, name), dish_reviews(id, idea, execution, would_repeat, dishes(name))"
    )
    .eq("user_id", user.id)
    .order("visited_on", { ascending: false });

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="font-display mb-4 text-xl font-semibold">Mis visitas</h1>
      <ul className="flex flex-col gap-3">
        {visits?.map((v) => (
          <li key={v.id} className="rounded-xl border border-stone-200 p-4">
            <div className="flex items-start justify-between">
              <div>
                <Link href={`/places/${v.places?.id}`} className="font-medium text-accent">
                  {v.places?.name}
                </Link>
                <div className="text-xs text-stone-500">
                  {v.visited_on} · {AUDIENCE_LABELS[v.audience]}
                  {v.pools_publicly ? " · cuenta en la media" : ""}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Link href={`/visits/${v.id}/edit`} className="text-xs text-stone-500">
                  editar
                </Link>
                <DeleteButton visitId={v.id} />
              </div>
            </div>
            {v.place_rating && <div className="mt-1 text-sm">{"★".repeat(v.place_rating)}</div>}
            {v.place_comment && <p className="mt-1 text-sm text-stone-700">{v.place_comment}</p>}
            {v.dish_reviews.length > 0 && (
              <ul className="mt-2 flex flex-col gap-1 border-t pt-2 text-sm">
                {v.dish_reviews.map((dr) => (
                  <li key={dr.id} className="text-stone-600">
                    {dr.dishes?.name}: idea {dr.idea}, ejecución {dr.execution}
                    {dr.would_repeat ? " · repetiría" : " · no repetiría"}
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
        {(!visits || visits.length === 0) && (
          <p className="py-8 text-center text-sm text-stone-400">
            Todavía no has registrado ninguna visita.{" "}
            <Link href="/visits/new" className="text-accent">
              Registra la primera
            </Link>
            .
          </p>
        )}
      </ul>
    </div>
  );
}
