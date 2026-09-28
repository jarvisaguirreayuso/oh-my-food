"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Bookmark, Heart, MessageCircle, UtensilsCrossed } from "lucide-react";
import clsx from "clsx";
import { AUDIENCE_LABELS } from "@/lib/audience";
import type { VisitCardProps } from "@/components/designs/types";

// Feed-post styling: the dish photo(s) are the post image, everything else
// (author, place, rating, comment) is metadata around it. The heart/bookmark
// row is purely presentational -- local state only, no "likes" table exists
// yet, so nothing here is persisted or sent anywhere.
export function VisitCard({ visit, showAuthor = false, showAudience = false, showEdit = false }: VisitCardProps) {
  const author = visit.profiles;
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const photos = visit.dish_reviews.filter((dr) => dr.photo_url);

  return (
    <li className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
      <div className="flex items-center justify-between gap-2 px-3 pt-3">
        <div className="flex min-w-0 items-center gap-2">
          {showAuthor && author && (
            <Link
              href={`/u/${author.username}`}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-bold text-accent"
            >
              {(author.display_name || author.username).slice(0, 1).toUpperCase()}
            </Link>
          )}
          <div className="min-w-0 text-sm">
            {showAuthor && author && (
              <Link href={`/u/${author.username}`} className="block truncate font-semibold text-stone-900">
                {author.display_name || `@${author.username}`}
              </Link>
            )}
            {visit.places && (
              <Link href={`/places/${visit.places.id}`} className="block truncate text-xs text-stone-500">
                {visit.places.name} · {visit.visited_on}
              </Link>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {showAudience && visit.audience && (
            <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-500">
              {AUDIENCE_LABELS[visit.audience]}
            </span>
          )}
          {showEdit && (
            <Link href={`/visits/${visit.id}/edit`} className="text-xs font-medium text-accent">
              editar
            </Link>
          )}
        </div>
      </div>

      {photos.length > 0 ? (
        <div className="mt-3 flex snap-x snap-mandatory gap-0.5 overflow-x-auto">
          {photos.map((dr) => (
            <div key={dr.id} className="relative aspect-square w-full shrink-0 snap-center bg-stone-100">
              <Image
                src={dr.photo_url!}
                alt={dr.dishes?.name ?? ""}
                fill
                sizes="(min-width: 640px) 600px, 100vw"
                className="object-cover"
              />
              {dr.dishes?.name && (
                <span className="absolute bottom-2 left-2 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
                  {dr.dishes.name}
                </span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-3 flex aspect-[4/3] w-full items-center justify-center bg-stone-100 text-stone-300">
          <UtensilsCrossed className="h-10 w-10" />
        </div>
      )}

      <div className="flex items-center gap-1 px-2 pt-2">
        <button
          type="button"
          onClick={() => setLiked((v) => !v)}
          aria-label="Me gusta"
          className={clsx(
            "rounded-full p-2 transition active:scale-90",
            liked ? "text-accent" : "text-stone-400 hover:text-stone-600"
          )}
        >
          <Heart className="h-6 w-6" fill={liked ? "currentColor" : "none"} strokeWidth={2} />
        </button>
        <button type="button" aria-label="Comentar" className="rounded-full p-2 text-stone-400 hover:text-stone-600">
          <MessageCircle className="h-6 w-6" strokeWidth={2} />
        </button>
        <div className="flex-1" />
        {visit.place_rating ? (
          <span className="text-sm font-bold text-stone-800">{"★".repeat(visit.place_rating)}</span>
        ) : null}
        <button
          type="button"
          onClick={() => setSaved((v) => !v)}
          aria-label="Guardar"
          className={clsx(
            "rounded-full p-2 transition active:scale-90",
            saved ? "text-accent" : "text-stone-400 hover:text-stone-600"
          )}
        >
          <Bookmark className="h-6 w-6" fill={saved ? "currentColor" : "none"} strokeWidth={2} />
        </button>
      </div>

      <div className="px-3 pb-3">
        {visit.place_comment && <p className="text-sm text-stone-700">{visit.place_comment}</p>}
        {visit.dish_reviews.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {visit.dish_reviews.map((dr) => (
              <li key={dr.id} className="rounded-full bg-stone-100 px-2.5 py-1 text-[11px] font-medium text-stone-600">
                {dr.dishes?.name}: idea {dr.idea}, ejecución {dr.execution}
                {dr.would_repeat ? " · repetiría" : " · no repetiría"}
              </li>
            ))}
          </ul>
        )}
      </div>
    </li>
  );
}
