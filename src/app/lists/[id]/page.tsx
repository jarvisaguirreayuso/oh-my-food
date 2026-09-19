import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPlaceGeneralScores } from "@/lib/places";
import { deleteList, removeFromList } from "../actions";

export default async function ListDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // RLS: someone else's list (or a made-up id) simply doesn't come back.
  const { data: list } = await supabase
    .from("place_lists")
    .select("id, name, place_list_items(added_at, places(id, name, address))")
    .eq("id", id)
    .maybeSingle();
  if (!list) notFound();

  const items = [...list.place_list_items].sort((a, b) => b.added_at.localeCompare(a.added_at));
  const scores = await getPlaceGeneralScores(supabase, items.flatMap((i) => (i.places ? [i.places.id] : [])));

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <p className="text-sm">
        <Link href="/lists" className="text-accent">
          ← Listas
        </Link>
      </p>
      <div className="mb-4 mt-1 flex items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold">{list.name}</h1>
        <Link href={`/map?list=${list.id}`} className="rounded-full border border-stone-300 px-3 py-1.5 text-sm">
          Ver en el mapa
        </Link>
      </div>

      <ul className="flex flex-col gap-2">
        {items.map(({ places: p }) =>
          p ? (
            <li key={p.id} className="flex items-center justify-between gap-3 rounded-lg border border-stone-200 px-4 py-3">
              <Link href={`/places/${p.id}`} className="min-w-0">
                <div className="truncate font-medium">{p.name}</div>
                <div className="truncate text-sm text-stone-500">
                  {scores.get(p.id)?.avg != null ? `★ ${scores.get(p.id)!.avg!.toFixed(1)} · ` : ""}
                  {p.address ?? ""}
                </div>
              </Link>
              <form action={removeFromList}>
                <input type="hidden" name="listId" value={list.id} />
                <input type="hidden" name="placeId" value={p.id} />
                <button className="text-xs text-stone-500 underline">quitar</button>
              </form>
            </li>
          ) : null
        )}
        {items.length === 0 && (
          <p className="rounded-xl border border-dashed border-stone-300 px-4 py-6 text-center text-sm text-stone-500">
            Lista vacía. Añade sitios desde su ficha.
          </p>
        )}
      </ul>

      <form action={deleteList} className="mt-8">
        <input type="hidden" name="listId" value={list.id} />
        <button className="text-sm text-red-700 underline">Borrar esta lista</button>
      </form>
    </div>
  );
}
