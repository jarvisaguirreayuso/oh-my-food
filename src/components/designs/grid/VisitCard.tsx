import Link from "next/link";
import Image from "next/image";
import { Repeat } from "lucide-react";
import { AUDIENCE_LABELS } from "@/lib/audience";
import type { VisitCardProps } from "@/components/designs/types";

// Dish photos are the headline here: they lead the card in a small grid and
// carry the rating/author as overlaid badges instead of a text row above them.
export function VisitCard({ visit, showAuthor = false, showAudience = false, showEdit = false }: VisitCardProps) {
  const author = visit.profiles;
  const photos = visit.dish_reviews.filter((dr) => dr.photo_url);
  const shown = photos.slice(0, 4);

  return (
    <li className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
      {photos.length > 0 && (
        <div className="relative">
          <div className={photos.length === 1 ? "relative aspect-[4/3] w-full" : "grid grid-cols-2 gap-0.5"}>
            {shown.map((dr, i) => (
              <div
                key={dr.id}
                className={photos.length === 1 ? "absolute inset-0" : "relative aspect-square overflow-hidden"}
              >
                <Image
                  src={dr.photo_url!}
                  alt={dr.dishes?.name ?? ""}
                  fill
                  sizes={photos.length === 1 ? "(min-width: 640px) 640px, 100vw" : "50vw"}
                  className="object-cover"
                />
                {photos.length > 4 && i === shown.length - 1 && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-lg font-semibold text-white">
                    +{photos.length - 4}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-gradient-to-t from-black/70 via-black/10 to-transparent p-2.5 pt-8">
            <span className="truncate text-xs font-medium text-white">
              {showAuthor && author ? (
                <Link href={`/u/${author.username}`} className="hover:underline">
                  {author.display_name || `@${author.username}`}
                </Link>
              ) : (
                visit.places?.name
              )}
            </span>
            {visit.place_rating != null && (
              <span className="shrink-0 rounded-full bg-white/95 px-2 py-0.5 text-xs font-semibold text-accent">
                ★ {visit.place_rating}
              </span>
            )}
          </div>
        </div>
      )}

      <div className="p-3">
        <div className="flex items-center justify-between gap-2 text-xs text-stone-500">
          <span className="min-w-0 truncate">
            {visit.places && (
              <Link href={`/places/${visit.places.id}`} className="font-medium text-accent">
                {visit.places.name}
              </Link>
            )}
            {" · "}
            {visit.visited_on}
          </span>
          <span className="flex shrink-0 items-center gap-2">
            {showAudience && visit.audience && (
              <span className="rounded-full bg-stone-100 px-2 py-0.5">{AUDIENCE_LABELS[visit.audience]}</span>
            )}
            {showEdit && (
              <Link href={`/visits/${visit.id}/edit`} className="text-accent">
                editar
              </Link>
            )}
          </span>
        </div>

        {photos.length === 0 && visit.place_rating != null && (
          <span className="mt-1 inline-block rounded-full bg-stone-100 px-2 py-0.5 text-xs font-semibold text-accent">
            ★ {visit.place_rating}
          </span>
        )}

        {visit.place_comment && <p className="mt-1.5 text-sm text-stone-700">{visit.place_comment}</p>}

        {visit.dish_reviews.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {visit.dish_reviews.map((dr) => (
              <li
                key={dr.id}
                className="flex items-center gap-1 rounded-full bg-stone-100 px-2.5 py-1 text-xs text-stone-600"
              >
                {dr.dishes?.name} · {dr.idea}/{dr.execution}
                {dr.would_repeat && <Repeat className="h-3 w-3 text-accent" strokeWidth={2} />}
              </li>
            ))}
          </ul>
        )}
      </div>
    </li>
  );
}
