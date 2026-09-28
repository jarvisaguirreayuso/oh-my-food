"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { getDishReviewPhotos } from "@/lib/queries/photos";
import type { PhotoExplorerItem, PhotoExplorerProps } from "@/components/designs/types";

export function PhotoExplorer({ initial, filters }: PhotoExplorerProps) {
  const [items, setItems] = useState<PhotoExplorerItem[]>(initial.items);
  const [cursor, setCursor] = useState(initial.nextCursor);
  const [pending, startTransition] = useTransition();

  function loadMore() {
    startTransition(async () => {
      const page = await getDishReviewPhotos(filters, cursor);
      setItems((prev) => [...prev, ...page.items]);
      setCursor(page.nextCursor);
    });
  }

  if (items.length === 0) {
    return <p className="py-8 text-center text-sm text-stone-400">Todavía no hay fotos de platos.</p>;
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-1">
        {items.map((item) => (
          <Link
            key={item.reviewId}
            href={`/dishes/${item.dishId}`}
            className="relative aspect-square overflow-hidden rounded-md bg-stone-100"
          >
            <Image src={item.photoUrl} alt={item.dishName ?? ""} fill sizes="33vw" className="object-cover" />
          </Link>
        ))}
      </div>
      {cursor && (
        <button
          type="button"
          onClick={loadMore}
          disabled={pending}
          className="mt-4 w-full rounded-lg border border-stone-300 py-2 text-sm font-medium text-stone-700 disabled:opacity-50"
        >
          {pending ? "Cargando…" : "Cargar más"}
        </button>
      )}
    </div>
  );
}
