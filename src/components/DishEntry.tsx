"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { useDishPhotoUpload } from "@/lib/hooks/useDishPhotoUpload";
import { RatingSelect } from "./RatingSelect";
import { DishPhotoUploader } from "./DishPhotoUploader";

export type DishEntryValue = {
  dishId: string | null;
  dishName: string | null;
  idea: number;
  execution: number;
  wouldRepeat: boolean;
  comment: string;
  price: number | null;
  // The reviewer's own photo of what they ate this visit -- separate from the
  // dish's single shared photo_url (edited via DishPhotoUploader below).
  photoUrl: string | null;
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
  const { upload, uploading: uploadingPhoto } = useDishPhotoUpload();

  async function handlePhotoSelect(file: File) {
    const url = await upload(file, `review-${placeId}`);
    onChange({ ...value, photoUrl: url });
  }

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
          <div className="flex flex-1 items-center gap-3">
            <DishPhotoUploader dishId={value.dishId} size="sm" />
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
            <input
              type="number"
              min={0}
              step="0.01"
              value={value.price ?? ""}
              onChange={(e) =>
                onChange({ ...value, price: e.target.value === "" ? null : Number(e.target.value) })
              }
              placeholder="Precio € (opcional)"
              className="mt-2 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>
        )}
        <button type="button" onClick={onRemove} className="text-sm text-stone-400">
          quitar
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <RatingSelect label="Idea" value={value.idea} onChange={(idea) => onChange({ ...value, idea })} />
        <RatingSelect
          label="Ejecución"
          value={value.execution}
          onChange={(execution) => onChange({ ...value, execution })}
        />
      </div>

      <div className="mt-3 flex items-center gap-3">
        {value.photoUrl ? (
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg">
            <Image src={value.photoUrl} alt="" fill sizes="64px" className="object-cover" />
          </div>
        ) : (
          <label
            className={`flex h-16 w-16 shrink-0 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-lg border-2 border-dashed border-stone-300 bg-stone-50 text-center text-[10px] text-stone-500 ${
              uploadingPhoto ? "opacity-50" : ""
            }`}
          >
            <span className="text-lg">📷</span>
            {uploadingPhoto ? "Subiendo…" : "Tu foto"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploadingPhoto}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handlePhotoSelect(file);
              }}
            />
          </label>
        )}
        {value.photoUrl && (
          <button
            type="button"
            className="text-xs text-stone-400"
            onClick={() => onChange({ ...value, photoUrl: null })}
          >
            quitar foto
          </button>
        )}
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
