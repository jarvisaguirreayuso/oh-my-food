"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { getDishReviewPhotos } from "@/lib/queries/photos";
import type { PhotoExplorerItem, PhotoExplorerProps } from "@/components/designs/types";

// Varied aspect ratios per tile fake a masonry rhythm -- we don't have real
// photo dimensions to lay out a true masonry grid, only URLs.
const ASPECTS = ["aspect-square", "aspect-[3/4]", "aspect-[4/5]"];

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
    return <p className="py-10 text-center text-sm text-stone-400">Todavía no hay fotos de platos.</p>;
  }

  return (
    <div>
      <div className="columns-2 gap-2 sm:columns-3">
        {items.map((item, i) => (
          <Link
            key={item.reviewId}
            href={`/dishes/${item.dishId}`}
            className={`group relative mb-2 block w-full overflow-hidden rounded-lg bg-stone-100 break-inside-avoid ${ASPECTS[i % ASPECTS.length]}`}
          >
            <Image
              src={item.photoUrl}
              alt={item.dishName ?? ""}
              fill
              sizes="(min-width: 640px) 33vw, 50vw"
              className="object-cover transition duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 transition group-hover:opacity-100">
              <p className="truncate text-xs font-medium text-white">{item.dishName}</p>
              <p className="truncate text-[11px] text-white/80">{item.placeName}</p>
            </div>
          </Link>
        ))}
      </div>
      {cursor && (
        <button
          type="button"
          onClick={loadMore}
          disabled={pending}
          className="mt-4 w-full rounded-full border border-stone-300 py-2.5 text-sm font-medium text-stone-700 transition hover:border-stone-400 disabled:opacity-50"
        >
          {pending ? "Cargando…" : "Cargar más"}
        </button>
      )}
    </div>
  );
}
