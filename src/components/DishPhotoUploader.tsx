"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { useDishPhotoUpload } from "@/lib/hooks/useDishPhotoUpload";

// `initialPhotoUrl` lets server-rendered pages that already fetched the dish
// (e.g. the dish detail page) skip the extra client-side lookup. Leave it
// undefined to have this component fetch it itself (e.g. inside a form where
// the dish was only just picked via autocomplete).
export function DishPhotoUploader({
  dishId,
  initialPhotoUrl,
  size = "md",
}: {
  dishId: string;
  initialPhotoUrl?: string | null;
  size?: "sm" | "md" | "lg";
}) {
  const [photoUrl, setPhotoUrl] = useState<string | null | undefined>(initialPhotoUrl);
  const { upload, uploading } = useDishPhotoUpload();

  useEffect(() => {
    if (initialPhotoUrl !== undefined) return;
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
  }, [dishId, initialPhotoUrl]);

  async function handleUpload(file: File) {
    const publicUrl = await upload(file, dishId);
    const supabase = createClient();
    await supabase.rpc("set_dish_photo", { p_dish_id: dishId, p_photo_url: publicUrl });
    setPhotoUrl(publicUrl);
  }

  if (photoUrl === undefined) return null;

  const dims = size === "sm" ? "h-12 w-12" : size === "lg" ? "aspect-[4/3] w-full" : "h-16 w-16";

  if (photoUrl) {
    return (
      <div className={`relative ${dims} overflow-hidden rounded-xl`}>
        <Image
          src={photoUrl}
          alt=""
          fill
          sizes={size === "lg" ? "(min-width: 640px) 640px, 100vw" : "64px"}
          className="object-cover"
        />
      </div>
    );
  }

  if (size === "lg") {
    return (
      <label
        className={`flex ${dims} cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-stone-300 bg-stone-50 text-sm text-stone-500`}
      >
        <span className="text-2xl">📷</span>
        {uploading ? "Subiendo…" : "Añadir foto del plato"}
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
