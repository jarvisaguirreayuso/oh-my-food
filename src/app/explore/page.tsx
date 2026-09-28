import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getPlaceGeneralScores } from "@/lib/places";
import { getDesignComponents } from "@/lib/design-components";
import { getDishReviewPhotos } from "@/lib/queries/photos";
import { PlaceList } from "@/components/PlaceList";
import { Chip } from "@/components/ui/Chip";

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tab?: string; place?: string; user?: string }>;
}) {
  const { q, tab: rawTab, place: placeId, user: userId } = await searchParams;
  const tab = rawTab === "fotos" ? "fotos" : "sitios";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const tabsRow = (
    <div className="mb-4 flex gap-2">
      <Chip href={q ? `/explore?q=${encodeURIComponent(q)}` : "/explore"} active={tab === "sitios"}>
        Sitios
      </Chip>
      <Chip href="/explore?tab=fotos" active={tab === "fotos"}>
        Fotos
      </Chip>
    </div>
  );

  if (tab === "fotos") {
    const { PhotoExplorer } = await getDesignComponents();
    const filters = { placeId, userId };
    const initial = await getDishReviewPhotos(filters);
    return (
      <div className="mx-auto max-w-2xl px-4 py-6">
        {tabsRow}
        <PhotoExplorer initial={initial} filters={filters} />
      </div>
    );
  }

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
          className="flex-1 rounded-lg border border-stone-300 px-4 py-3 text-base outline-none focus:border-accent"
        />
        <button className="rounded-lg bg-accent px-4 py-3 text-sm font-medium text-white">Buscar</button>
      </form>

      {tabsRow}

      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-lg font-semibold">{q ? `Resultados para “${q}”` : "Últimos sitios"}</h1>
        {user && (
          <Link href="/places/new" className="text-sm font-medium text-accent">
            + Nuevo sitio
          </Link>
        )}
      </div>

      <PlaceList places={places} scores={scores} emptyMessage="No hay sitios todavía. ¡Crea el primero!" />
    </div>
  );
}
