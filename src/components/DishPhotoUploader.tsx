"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

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
  size?: "sm" | "md";
}) {
  const [photoUrl, setPhotoUrl] = useState<string | null | undefined>(initialPhotoUrl);
  const [uploading, setUploading] = useState(false);

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

  const dims = size === "sm" ? "h-12 w-12" : "h-16 w-16";

  if (photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={photoUrl} alt="" className={`${dims} rounded-lg object-cover`} />
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
