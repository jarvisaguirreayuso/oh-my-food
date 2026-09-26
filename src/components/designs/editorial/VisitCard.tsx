import Link from "next/link";
import Image from "next/image";
import { Star, UtensilsCrossed } from "lucide-react";
import clsx from "clsx";
import { AUDIENCE_LABELS } from "@/lib/audience";
import type { VisitCardProps } from "@/components/designs/types";

// A short magazine entry: the dish photo leads, everything else -- place
// name, rating, comment -- reads as the caption block underneath it.
export function VisitCard({ visit, showAuthor = false, showAudience = false, showEdit = false }: VisitCardProps) {
  const author = visit.profiles;
  const withPhotos = visit.dish_reviews.filter((dr) => dr.photo_url);
  const [hero, ...rest] = withPhotos;

  return (
    <li className="border-b border-stone-200 pb-8 pt-6 first:pt-0">
      <div className="mb-3 flex items-center justify-between gap-3 text-xs uppercase tracking-wide text-stone-400">
        <span>
          {showAuthor && author ? (
            <Link href={`/u/${author.username}`} className="font-medium text-stone-600">
              {author.display_name || `@${author.username}`}
            </Link>
          ) : null}
          {showAuthor && author ? " — " : ""}
          {visit.visited_on}
        </span>
        <span className="flex items-center gap-2 normal-case">
          {showAudience && visit.audience && (
            <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs uppercase tracking-wide text-stone-500">
              {AUDIENCE_LABELS[visit.audience]}
            </span>
          )}
          {showEdit && (
            <Link href={`/visits/${visit.id}/edit`} className="text-accent">
              editar
            </Link>
          )}
        </span>
      </div>

      {hero ? (
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-sm bg-stone-100">
          <Image
            src={hero.photo_url!}
            alt={hero.dishes?.name ?? ""}
            fill
            sizes="(min-width: 640px) 640px, 100vw"
            className="object-cover"
          />
        </div>
      ) : (
        <div className="flex aspect-[16/9] w-full items-center justify-center rounded-sm border border-dashed border-stone-200 bg-stone-50 text-stone-300">
          <UtensilsCrossed className="h-6 w-6" strokeWidth={1.25} />
        </div>
      )}

      {rest.length > 0 && (
        <div className="mt-2 flex gap-2">
          {rest.map((dr) => (
            <div key={dr.id} className="relative h-16 w-16 shrink-0 overflow-hidden rounded-sm bg-stone-100">
              <Image src={dr.photo_url!} alt={dr.dishes?.name ?? ""} fill sizes="64px" className="object-cover" />
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 flex items-start justify-between gap-3">
        {visit.places && (
          <Link href={`/places/${visit.places.id}`} className="font-display text-xl text-stone-900 hover:text-accent">
            {visit.places.name}
          </Link>
        )}
        {visit.place_rating ? (
          <div className="mt-1 flex shrink-0 gap-0.5">
            {Array.from({ length: 5 }, (_, i) => (
              <Star
                key={i}
                className={clsx("h-3.5 w-3.5", i < visit.place_rating! ? "fill-accent text-accent" : "text-stone-200")}
              />
            ))}
          </div>
        ) : null}
      </div>

      {visit.place_comment && (
        <blockquote className="mt-2 border-l-2 border-accent-soft pl-3 font-display text-base italic leading-snug text-stone-600">
          “{visit.place_comment}”
        </blockquote>
      )}

      {visit.dish_reviews.length > 0 && (
        <ul className="mt-4 flex flex-col gap-1 text-sm text-stone-500">
          {visit.dish_reviews.map((dr) => (
            <li key={dr.id}>
              <span className="font-medium text-stone-700">{dr.dishes?.name}</span> — idea {dr.idea}, ejecución{" "}
              {dr.execution}
              {dr.would_repeat ? " · repetiría" : " · no repetiría"}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
