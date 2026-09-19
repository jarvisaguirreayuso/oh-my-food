"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { RatingSelect } from "./RatingSelect";

export type DishEntryValue = {
  dishId: string | null;
  dishName: string | null;
  idea: number;
  execution: number;
  flavor: number;
  wouldRepeat: boolean;
  comment: string;
};

type DishOption = { id: string; name: string; similarity: number };

export function DishEntry({
  placeId,
  value,
  onChange,
  onRemove,
}: {
  placeId: string;
  value: DishEntryValue;
  onChange: (v: DishEntryValue) => void;
  onRemove: () => void;
}) {
  const [query, setQuery] = useState(value.dishName ?? "");
  const [suggestions, setSuggestions] = useState<DishOption[]>([]);
  const searchActive = !value.dishId && query.trim().length >= 2;

  useEffect(() => {
    if (!searchActive) return;
    const supabase = createClient();
    const handle = setTimeout(async () => {
      const { data } = await supabase.rpc("search_similar_dishes", {
        p_place_id: placeId,
        p_query: query,
      });
      setSuggestions((data as DishOption[]) ?? []);
    }, 300);
    return () => clearTimeout(handle);
  }, [query, searchActive, placeId]);

  const visibleSuggestions = searchActive ? suggestions : [];

  return (
    <div className="rounded-xl border border-stone-200 p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        {value.dishId ? (
          <div className="flex-1">
            <div className="font-medium">{value.dishName}</div>
            <button
              type="button"
              className="text-xs text-accent"
              onClick={() => onChange({ ...value, dishId: null, dishName: null })}
            >
              cambiar plato
            </button>
          </div>
        ) : (
          <div className="flex-1">
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                onChange({ ...value, dishName: e.target.value });
              }}
              placeholder="Nombre del plato…"
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-accent"
            />
            {visibleSuggestions.length > 0 && (
              <div className="mt-1 rounded-lg border border-amber-200 bg-amber-50 p-2">
                <p className="mb-1 text-xs text-amber-700">¿Te refieres a…?</p>
                <ul className="flex flex-col gap-1">
                  {visibleSuggestions.map((s) => (
                    <li key={s.id}>
                      <button
                        type="button"
                        className="text-sm font-medium text-amber-900 underline"
                        onClick={() => {
                          onChange({ ...value, dishId: s.id, dishName: s.name });
                          setSuggestions([]);
                        }}
                      >
                        {s.name}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
        <button type="button" onClick={onRemove} className="text-sm text-stone-400">
          quitar
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <RatingSelect label="Idea" value={value.idea} onChange={(idea) => onChange({ ...value, idea })} />
        <RatingSelect
          label="Ejecución"
          value={value.execution}
          onChange={(execution) => onChange({ ...value, execution })}
        />
        <RatingSelect
          label="Sabor"
          value={value.flavor}
          onChange={(flavor) => onChange({ ...value, flavor })}
        />
      </div>

      <div className="mt-3 flex items-center gap-2">
        <span className="text-xs font-medium text-stone-600">¿Lo repetirías?</span>
        <button
          type="button"
          onClick={() => onChange({ ...value, wouldRepeat: true })}
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            value.wouldRepeat ? "bg-green-600 text-white" : "bg-stone-100 text-stone-500"
          }`}
        >
          Sí
        </button>
        <button
          type="button"
          onClick={() => onChange({ ...value, wouldRepeat: false })}
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            !value.wouldRepeat ? "bg-red-600 text-white" : "bg-stone-100 text-stone-500"
          }`}
        >
          No
        </button>
      </div>

      <textarea
        value={value.comment}
        onChange={(e) => onChange({ ...value, comment: e.target.value })}
        placeholder="Comentario (opcional)"
        rows={2}
        className="mt-3 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-accent"
      />
    </div>
  );
}
