import Link from "next/link";
import Image from "next/image";
import { AUDIENCE_LABELS } from "@/lib/audience";
import type { VisitCardProps } from "@/components/designs/types";

export function VisitCard({ visit, showAuthor = false, showAudience = false, showEdit = false }: VisitCardProps) {
  const author = visit.profiles;
  return (
    <li className="rounded-xl border border-stone-200 p-4">
      <div className="flex items-start justify-between gap-3 text-xs text-stone-500">
        <span>
          {showAuthor && author ? (
            <Link href={`/u/${author.username}`} className="font-medium text-stone-800">
              {author.display_name || `@${author.username}`}
            </Link>
          ) : null}
          {showAuthor && author ? " · " : ""}
          {visit.visited_on}
        </span>
        <span className="flex items-center gap-2">
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
      <div className="mt-1 flex items-baseline justify-between gap-3">
        {visit.places && (
          <Link href={`/places/${visit.places.id}`} className="font-medium text-accent">
            {visit.places.name}
          </Link>
        )}
        {visit.place_rating ? <span className="text-sm">{"★".repeat(visit.place_rating)}</span> : null}
      </div>
      {visit.place_comment && <p className="mt-1 text-sm text-stone-700">{visit.place_comment}</p>}
      {visit.dish_reviews.some((dr) => dr.photo_url) && (
        <div className="mt-2 flex gap-2 overflow-x-auto">
          {visit.dish_reviews
            .filter((dr) => dr.photo_url)
            .map((dr) => (
              <div key={dr.id} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg">
                <Image src={dr.photo_url!} alt={dr.dishes?.name ?? ""} fill sizes="80px" className="object-cover" />
              </div>
            ))}
        </div>
      )}
      {visit.dish_reviews.length > 0 && (
        <ul className="mt-2 flex flex-col gap-1 border-t pt-2 text-sm">
          {visit.dish_reviews.map((dr) => (
            <li key={dr.id} className="text-stone-600">
              {dr.dishes?.name}: idea {dr.idea}, ejecución {dr.execution}
              {dr.would_repeat ? " · repetiría" : " · no repetiría"}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
