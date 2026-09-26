"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Resizes/compresses the photo client-side before upload so each photo stays
// well under the storage bucket's size cap. Shared by the dish's own canonical
// photo (DishPhotoUploader) and a review's personal photo (DishEntry).
async function compressImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const maxSide = 800;
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

// Uploads to the shared public `dish-photos` bucket under a caller-provided
// path prefix (e.g. a dish id or `review-<placeId>`) and returns the public URL.
// Callers decide what to do with that URL (set_dish_photo RPC, or just stash it
// in form state to send along with the rest of a review).
export function useDishPhotoUpload() {
  const [uploading, setUploading] = useState(false);

  async function upload(file: File, pathPrefix: string): Promise<string> {
    setUploading(true);
    try {
      const supabase = createClient();
      const blob = await compressImage(file);
      const path = `${pathPrefix}-${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("dish-photos")
        .upload(path, blob, { contentType: "image/jpeg" });
      if (uploadError) throw uploadError;
      const {
        data: { publicUrl },
      } = supabase.storage.from("dish-photos").getPublicUrl(path);
      return publicUrl;
    } finally {
      setUploading(false);
    }
  }

  return { upload, uploading };
}
