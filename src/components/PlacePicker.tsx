"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type PlaceOption = { id: string; name: string; address: string | null };

export function PlacePicker({
  onSelect,
}: {
  onSelect: (place: { id: string; name: string }) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlaceOption[]>([]);
  const [loading, setLoading] = useState(false);
  const searchActive = query.trim().length >= 2;

  useEffect(() => {
    if (!searchActive) return;
    const supabase = createClient();
    const handle = setTimeout(async () => {
      setLoading(true);
      const { data } = await supabase.rpc("search_places", { p_query: query }).limit(8);
      setResults((data as PlaceOption[]) ?? []);
      setLoading(false);
    }, 300);
    return () => clearTimeout(handle);
  }, [query, searchActive]);

  const visibleResults = searchActive ? results : [];

  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Busca el sitio (nombre)…"
        className="w-full rounded-lg border border-stone-300 px-4 py-3 text-base outline-none focus:border-accent"
      />
      {searchActive && loading && <p className="mt-2 text-xs text-stone-400">Buscando…</p>}
      {visibleResults.length > 0 && (
        <ul className="mt-2 divide-y rounded-lg border border-stone-200">
          {visibleResults.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => onSelect({ id: p.id, name: p.name })}
                className="block w-full px-4 py-3 text-left hover:bg-stone-50"
              >
                <div className="font-medium">{p.name}</div>
                {p.address && <div className="text-xs text-stone-500">{p.address}</div>}
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-sm text-stone-500">
        ¿No está en la lista?{" "}
        <Link href="/places/new" className="font-medium text-accent">
          Crea el sitio
        </Link>{" "}
        y vuelve aquí para registrar la visita.
      </p>
    </div>
  );
}
