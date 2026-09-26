"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { Bookmark, Heart } from "lucide-react";
import clsx from "clsx";
import { getDishReviewPhotos } from "@/lib/queries/photos";
import type { PhotoExplorerItem, PhotoExplorerProps } from "@/components/designs/types";

// Continuous vertical feed (Instagram/TikTok-style) instead of a grid: each
// photo gets the full width, a caption strip, and the same presentational
// like/save affordance as VisitCard -- local state only, nothing persisted.
export function PhotoExplorer({ initial, filters }: PhotoExplorerProps) {
  const [items, setItems] = useState<PhotoExplorerItem[]>(initial.items);
  const [cursor, setCursor] = useState(initial.nextCursor);
  const [pending, startTransition] = useTransition();
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const loadMore = useCallback(() => {
    if (!cursor || pending) return;
    startTransition(async () => {
      const page = await getDishReviewPhotos(filters, cursor);
      setItems((prev) => [...prev, ...page.items]);
      setCursor(page.nextCursor);
    });
  }, [cursor, pending, filters]);

  // Auto-load as the user nears the bottom, like a real feed. The manual
  // button below is kept as a reliable fallback (e.g. if IntersectionObserver
  // never fires because the sentinel stays permanently in view).
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !cursor) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "600px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [cursor, loadMore]);

  function toggle(set: React.Dispatch<React.SetStateAction<Set<string>>>, id: string) {
    set((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (items.length === 0) {
    return <p className="py-8 text-center text-sm text-stone-400">Todavía no hay fotos de platos.</p>;
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4">
      {items.map((item) => {
        const isLiked = liked.has(item.reviewId);
        const isSaved = saved.has(item.reviewId);
        return (
          <div key={item.reviewId} className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
            <Link href={`/dishes/${item.dishId}`} className="relative block aspect-square w-full bg-stone-100">
              <Image
                src={item.photoUrl}
                alt={item.dishName ?? ""}
                fill
                sizes="(min-width: 448px) 448px, 100vw"
                className="object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-3 pb-2 pt-10">
                <p className="truncate text-sm font-bold text-white">{item.dishName ?? "Plato"}</p>
                <p className="truncate text-xs text-stone-200">
                  {item.placeName}
                  {item.authorDisplayName || item.authorUsername
                    ? ` · ${item.authorDisplayName || `@${item.authorUsername}`}`
                    : ""}
                </p>
              </div>
            </Link>
            <div className="flex items-center gap-1 px-2 py-1.5">
              <button
                type="button"
                onClick={() => toggle(setLiked, item.reviewId)}
                aria-label="Me gusta"
                className={clsx(
                  "rounded-full p-2 transition active:scale-90",
                  isLiked ? "text-accent" : "text-stone-400 hover:text-stone-600"
                )}
              >
                <Heart className="h-6 w-6" fill={isLiked ? "currentColor" : "none"} strokeWidth={2} />
              </button>
              <div className="flex-1" />
              <button
                type="button"
                onClick={() => toggle(setSaved, item.reviewId)}
                aria-label="Guardar"
                className={clsx(
                  "rounded-full p-2 transition active:scale-90",
                  isSaved ? "text-accent" : "text-stone-400 hover:text-stone-600"
                )}
              >
                <Bookmark className="h-6 w-6" fill={isSaved ? "currentColor" : "none"} strokeWidth={2} />
              </button>
            </div>
          </div>
        );
      })}
      <div ref={sentinelRef} className="h-1 w-full" aria-hidden />
      {cursor && (
        <button
          type="button"
          onClick={loadMore}
          disabled={pending}
          className="mb-2 w-full rounded-lg border border-stone-300 py-2 text-sm font-medium text-stone-700 disabled:opacity-50"
        >
          {pending ? "Cargando…" : "Cargar más"}
        </button>
      )}
    </div>
  );
}
