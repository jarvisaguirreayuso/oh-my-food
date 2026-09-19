import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getPlaceGeneralScores } from "@/lib/places";
import { PlaceList } from "@/components/PlaceList";

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: places } = q
    ? await supabase.rpc("search_places", { p_query: q }).limit(30)
    : await supabase
        .from("places")
        .select("id, name, type, address")
        .order("created_at", { ascending: false })
        .limit(30);
  const scores = await getPlaceGeneralScores(supabase, places?.map((p) => p.id) ?? []);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <form className="mb-6 flex gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Buscar sitios…"
          className="flex-1 rounded-lg border border-neutral-300 px-4 py-3 text-base outline-none focus:border-neutral-900"
        />
        <button className="rounded-lg bg-neutral-900 px-4 py-3 text-sm font-medium text-white">Buscar</button>
      </form>

      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold">{q ? `Resultados para “${q}”` : "Últimos sitios"}</h1>
        {user && (
          <Link href="/places/new" className="text-sm font-medium text-blue-600">
            + Nuevo sitio
          </Link>
        )}
      </div>

      <PlaceList places={places} scores={scores} emptyMessage="No hay sitios todavía. ¡Crea el primero!" />
    </div>
  );
}
