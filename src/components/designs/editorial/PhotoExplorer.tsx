"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { getDishReviewPhotos } from "@/lib/queries/photos";
import type { PhotoExplorerItem, PhotoExplorerProps } from "@/components/designs/types";

// A photo essay: one large image at a time with a short caption underneath,
// scrolling top to bottom, rather than a dense thumbnail grid.
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
    return <p className="py-12 text-center font-display text-lg italic text-stone-400">Todavía no hay fotos de platos.</p>;
  }

  return (
    <div className="mx-auto max-w-xl">
      <div className="flex flex-col gap-10 sm:gap-14">
        {items.map((item) => (
          <figure key={item.reviewId}>
            <Link href={`/dishes/${item.dishId}`} className="relative block aspect-[4/3] w-full overflow-hidden rounded-sm bg-stone-100">
              <Image
                src={item.photoUrl}
                alt={item.dishName ?? ""}
                fill
                sizes="(min-width: 640px) 576px, 100vw"
                className="object-cover transition duration-300 hover:scale-[1.02]"
              />
            </Link>
            <figcaption className="mt-3">
              <div className="font-display text-lg text-stone-900">{item.dishName ?? "Plato"}</div>
              <div className="mt-0.5 text-sm text-stone-400">
                {item.placeName ? (
                  <Link href={`/places/${item.placeId}`} className="hover:text-accent">
                    {item.placeName}
                  </Link>
                ) : null}
                {item.authorDisplayName || item.authorUsername ? (
                  <>
                    {item.placeName ? " — " : ""}
                    {item.authorDisplayName || `@${item.authorUsername}`}
                  </>
                ) : null}
              </div>
            </figcaption>
          </figure>
        ))}
      </div>
      {cursor && (
        <button
          type="button"
          onClick={loadMore}
          disabled={pending}
          className="mt-10 w-full border border-stone-300 py-2.5 text-sm uppercase tracking-wide text-stone-600 transition hover:border-accent hover:text-accent disabled:opacity-50"
        >
          {pending ? "Cargando…" : "Cargar más"}
        </button>
      )}
    </div>
  );
}
