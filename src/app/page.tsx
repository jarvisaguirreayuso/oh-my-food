import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const TYPE_LABELS: Record<string, string> = {
  restaurant: "Restaurante",
  food_stall: "Puesto",
  food_truck: "Food truck",
  market_stall: "Puesto de mercado",
  other: "Otro",
};

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const supabase = await createClient();

  const { data: places } = q
    ? await supabase.rpc("search_places", { p_query: q }).limit(30)
    : await supabase
        .from("places")
        .select("id, name, type, address")
        .order("created_at", { ascending: false })
        .limit(30);

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
        <button className="rounded-lg bg-neutral-900 px-4 py-3 text-sm font-medium text-white">
          Buscar
        </button>
      </form>

      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold">{q ? `Resultados para “${q}”` : "Últimos sitios"}</h1>
        <Link href="/places/new" className="text-sm font-medium text-blue-600">
          + Nuevo sitio
        </Link>
      </div>

      <ul className="flex flex-col gap-2">
        {places?.map((p) => (
          <li key={p.id}>
            <Link
              href={`/places/${p.id}`}
              className="block rounded-lg border border-neutral-200 px-4 py-3 hover:border-neutral-400"
            >
              <div className="font-medium">{p.name}</div>
              <div className="text-sm text-neutral-500">
                {TYPE_LABELS[p.type] ?? p.type}
                {p.address ? ` · ${p.address}` : ""}
              </div>
            </Link>
          </li>
        ))}
        {places?.length === 0 && (
          <p className="py-8 text-center text-sm text-neutral-400">
            No hay sitios todavía. ¡Crea el primero!
          </p>
        )}
      </ul>
    </div>
  );
}
