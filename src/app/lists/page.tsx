import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { toggleSaved } from "./actions";
import { CreateListForm } from "./CreateListForm";

export default async function ListsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const [{ data: saved }, { data: lists }, { data: visits }] = await Promise.all([
    supabase
      .from("saved_places")
      .select("place_id, saved_at, places(id, name, address)")
      .order("saved_at", { ascending: false }),
    supabase.from("place_lists").select("id, name, place_list_items(count)").order("created_at", { ascending: false }),
    supabase.from("visits").select("place_id").eq("user_id", user.id),
  ]);
  const visited = new Set(visits?.map((v) => v.place_id));

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="font-display mb-3 text-lg font-semibold">Quiero ir</h1>
      <ul className="flex flex-col gap-2">
        {saved?.map((s) => (
          <li key={s.place_id} className="flex items-center justify-between gap-3 rounded-lg border border-stone-200 px-4 py-3">
            <Link href={`/places/${s.place_id}`} className="min-w-0">
              <div className="truncate font-medium">{s.places?.name}</div>
              <div className="truncate text-sm text-stone-500">
                {visited.has(s.place_id) ? "✓ Ya lo has visitado" : (s.places?.address ?? "Pendiente")}
              </div>
            </Link>
            <form action={toggleSaved}>
              <input type="hidden" name="placeId" value={s.place_id} />
              <input type="hidden" name="saved" value="true" />
              <button className="text-xs text-stone-500 underline">quitar</button>
            </form>
          </li>
        ))}
        {(!saved || saved.length === 0) && (
          <p className="rounded-xl border border-dashed border-stone-300 px-4 py-6 text-center text-sm text-stone-500">
            Guarda sitios que quieras probar desde su ficha o desde el mapa.
          </p>
        )}
      </ul>

      <h2 className="mb-3 mt-8 text-lg font-semibold">Mis listas</h2>
      <div className="mb-3">
        <CreateListForm />
      </div>
      <ul className="flex flex-col gap-2">
        {lists?.map((l) => {
          const count = l.place_list_items[0]?.count ?? 0;
          return (
            <li key={l.id}>
              <Link
                href={`/lists/${l.id}`}
                className="flex items-center justify-between rounded-lg border border-stone-200 px-4 py-3 hover:border-stone-400"
              >
                <span className="font-medium">{l.name}</span>
                <span className="text-sm text-stone-500">
                  {count} {count === 1 ? "sitio" : "sitios"}
                </span>
              </Link>
            </li>
          );
        })}
        {(!lists || lists.length === 0) && (
          <p className="text-sm text-stone-400">Todavía no tienes listas.</p>
        )}
      </ul>
      <p className="mt-2 text-xs text-stone-400">Tus listas son privadas: solo las ves tú.</p>
    </div>
  );
}
