"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { RatingSelect } from "./RatingSelect";

export type DishEntryValue = {
  dishId: string | null;
  dishName: string | null;
  idea: number;
  execution: number;
  wouldRepeat: boolean;
  comment: string;
  price: number | null;
};

type DishOption = { id: string; name: string; similarity: number };

// Resizes/compresses the photo client-side before upload so each dish photo
// stays well under the storage bucket's size cap.
async function compressImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const maxSide = 480;
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas unsupported");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("compression failed"))),
      "image/jpeg",
      0.6
    );
  });
}

function DishPhoto({ dishId }: { dishId: string }) {
  const [photoUrl, setPhotoUrl] = useState<string | null | undefined>(undefined);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    supabase
      .from("dishes")
      .select("photo_url")
      .eq("id", dishId)
      .single()
      .then(({ data }) => {
        if (!cancelled) setPhotoUrl(data?.photo_url ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [dishId]);

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const supabase = createClient();
      const blob = await compressImage(file);
      const path = `${dishId}-${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("dish-photos")
        .upload(path, blob, { contentType: "image/jpeg" });
      if (uploadError) throw uploadError;
      const {
        data: { publicUrl },
      } = supabase.storage.from("dish-photos").getPublicUrl(path);
      await supabase.rpc("set_dish_photo", { p_dish_id: dishId, p_photo_url: publicUrl });
      setPhotoUrl(publicUrl);
    } finally {
      setUploading(false);
    }
  }

  if (photoUrl === undefined) return null;

  if (photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={photoUrl} alt="" className="h-12 w-12 rounded-lg object-cover" />
    );
  }

  return (
    <label className="text-xs text-accent underline">
      {uploading ? "Subiendo…" : "Añadir foto"}
      <input
        type="file"
        accept="image/*"
        className="hidden"
        disabled={uploading}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleUpload(file);
        }}
      />
    </label>
  );
}

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
          <div className="flex flex-1 items-center gap-3">
            <DishPhoto dishId={value.dishId} />
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
