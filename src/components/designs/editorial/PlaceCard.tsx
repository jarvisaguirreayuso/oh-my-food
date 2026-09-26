import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { TYPE_LABELS } from "@/lib/places";
import type { PlaceCardProps } from "@/components/designs/types";

// Editorial take: no cover photo exists in this data model, so the entry
// leans entirely on typography -- the name reads like an article headline,
// the type/address like a byline underneath it.
export function PlaceCard({ place, score }: PlaceCardProps) {
  return (
    <Link
      href={`/places/${place.id}`}
      className="group flex items-start justify-between gap-4 border-b border-stone-200 py-5 first:pt-0"
    >
      <div className="min-w-0">
        <h3 className="truncate font-display text-xl leading-snug text-stone-900 group-hover:text-accent">
          {place.name}
        </h3>
        <p className="mt-1 truncate text-sm uppercase tracking-wide text-stone-400">
          {TYPE_LABELS[place.type] ?? place.type}
          {place.address ? ` — ${place.address}` : ""}
        </p>
      </div>
      <div className="flex shrink-0 items-start gap-2 text-right">
        {score?.avg != null ? (
          <div>
            <div className="font-display text-lg text-accent">{score.avg.toFixed(1)}</div>
            <div className="text-xs text-stone-400">
              {score.n} {score.n === 1 ? "nota" : "notas"}
            </div>
          </div>
        ) : null}
        <ArrowUpRight className="mt-1 h-4 w-4 text-stone-300 transition group-hover:text-accent" />
      </div>
    </Link>
  );
}
