import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getPlaceGeneralScores } from "@/lib/places";
import { PlaceList } from "@/components/PlaceList";
import { Chip } from "@/components/ui/Chip";
import { MapLoader, type MapPlace } from "@/components/map/MapLoader";

type State = "all" | "visited" | "saved";

export default async function MapPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string; list?: string; view?: string }>;
}) {
  const sp = await searchParams;
  const state: State = sp.state === "visited" || sp.state === "saved" ? sp.state : "all";
  const view = sp.view === "list" ? "list" : "map";
  const listId = z.guid().safeParse(sp.list).data ?? null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Places and their general scores are public. Everything personal (what I visited or
  // saved, my lists) is only read for a signed-in user and is private to them by RLS.
  const [{ data: places }, mine] = await Promise.all([
    supabase.from("places").select("id, name, type, address, lat, lng").order("name").limit(1000),
    user
      ? Promise.all([
          supabase.from("visits").select("place_id").eq("user_id", user.id),
          supabase.from("saved_places").select("place_id"),
          supabase.from("place_lists").select("id, name").order("name"),
          listId ? supabase.from("place_list_items").select("place_id").eq("list_id", listId) : null,
        ])
      : null,
  ]);

  const visited = new Set(mine?.[0].data?.map((v) => v.place_id));
  const saved = new Set(mine?.[1].data?.map((s) => s.place_id));
  const lists = mine?.[2].data ?? [];
  const inList = mine?.[3]?.data ? new Set(mine[3].data.map((i) => i.place_id)) : null;

  const scores = await getPlaceGeneralScores(supabase, places?.map((p) => p.id) ?? []);

  const filtered = (places ?? []).filter((p) => {
    if (state === "visited" && !visited.has(p.id)) return false;
    if (state === "saved" && !saved.has(p.id)) return false;
    if (inList && !inList.has(p.id)) return false;
    return true;
  });
  const mapPlaces: MapPlace[] = filtered.flatMap((p) =>
    p.lat != null && p.lng != null
      ? [
          {
            id: p.id,
            name: p.name,
            type: p.type,
            address: p.address,
            lat: p.lat,
            lng: p.lng,
            avg: scores.get(p.id)?.avg ?? null,
            n: scores.get(p.id)?.n ?? 0,
            visited: visited.has(p.id),
            saved: saved.has(p.id),
          },
        ]
      : []
  );

  const href = (next: Partial<Record<"state" | "list" | "view", string | null>>) => {
    const params = new URLSearchParams();
    const merged = { state: state === "all" ? null : state, list: listId, view: view === "map" ? null : view, ...next };
    for (const [k, v] of Object.entries(merged)) if (v) params.set(k, v);
    const qs = params.toString();
    return qs ? `/map?${qs}` : "/map";
  };
  const activeList = lists.find((l) => l.id === listId);

  return (
    <div className="mx-auto max-w-2xl px-4 py-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h1 className="font-display text-lg font-semibold">Mapa</h1>
        <div className="flex gap-1">
          <Chip href={href({ view: null })} active={view === "map"}>
            Mapa
          </Chip>
          <Chip href={href({ view: "list" })} active={view === "list"}>
            Lista
          </Chip>
        </div>
      </div>

      {user && (
        <div className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1">
          <Chip href={href({ state: null })} active={state === "all"}>
            Todos
          </Chip>
          <Chip href={href({ state: "visited" })} active={state === "visited"}>
            ✓ Visitados
          </Chip>
          <Chip href={href({ state: "saved" })} active={state === "saved"}>
            🔖 Quiero ir
          </Chip>
          {lists.map((l) => (
            <Chip key={l.id} href={href({ list: l.id === listId ? null : l.id })} active={l.id === listId}>
              {l.name}
            </Chip>
          ))}
        </div>
      )}

      {view === "map" ? (
        <>
          <MapLoader places={mapPlaces} />
          <p className="mt-2 text-xs text-stone-500">
            {mapPlaces.length} {mapPlaces.length === 1 ? "sitio" : "sitios"} en el mapa
            {filtered.length > mapPlaces.length && ` · ${filtered.length - mapPlaces.length} sin ubicación (míralos en Lista)`}
            {activeList && ` · lista «${activeList.name}»`}
          </p>
          {user && (
            <p className="mt-1 text-xs text-stone-400">
              <span style={{ color: "#c2410c" }}>●</span> visitado · <span style={{ color: "#0f766e" }}>●</span> quiero ir ·{" "}
              <span style={{ color: "#78716c" }}>●</span> otros
            </p>
          )}
        </>
      ) : (
        <PlaceList places={filtered} scores={scores} emptyMessage="No hay sitios con estos filtros." />
      )}
    </div>
  );
}
