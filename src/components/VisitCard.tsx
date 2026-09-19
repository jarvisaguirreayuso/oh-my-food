import Link from "next/link";
import { AUDIENCE_LABELS } from "@/lib/audience";
import type { Audience } from "@/lib/validation";

export type VisitCardData = {
  id: string;
  visited_on: string;
  place_rating: number | null;
  place_comment: string | null;
  audience?: Audience;
  places: { id: string; name: string } | null;
  profiles?: { username: string; display_name: string | null } | null;
  dish_reviews: Array<{
    id: string;
    idea: number;
    execution: number;
    flavor: number;
    would_repeat: boolean;
    dishes: { name: string } | null;
  }>;
};

export function VisitCard({
  visit,
  showAuthor = false,
  showAudience = false,
}: {
  visit: VisitCardData;
  showAuthor?: boolean;
  showAudience?: boolean;
}) {
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
        {showAudience && visit.audience && (
          <span className="rounded-full bg-stone-100 px-2 py-0.5">{AUDIENCE_LABELS[visit.audience]}</span>
        )}
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
      {visit.dish_reviews.length > 0 && (
        <ul className="mt-2 flex flex-col gap-1 border-t pt-2 text-sm">
          {visit.dish_reviews.map((dr) => (
            <li key={dr.id} className="text-stone-600">
              {dr.dishes?.name}: idea {dr.idea}, ejecución {dr.execution}, sabor {dr.flavor}
              {dr.would_repeat ? " · repetiría" : " · no repetiría"}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
