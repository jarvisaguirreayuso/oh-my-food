import Link from "next/link";
import { TYPE_LABELS } from "@/lib/places";
import { Stars } from "@/components/ui/Stars";
import type { PlaceCardProps } from "@/components/designs/types";

export function PlaceCard({ place, score }: PlaceCardProps) {
  return (
    <Link
      href={`/places/${place.id}`}
      className="flex items-center justify-between gap-3 rounded-lg border border-stone-200 px-4 py-3 hover:border-stone-400"
    >
      <div className="min-w-0">
        <div className="truncate font-medium">{place.name}</div>
        <div className="truncate text-sm text-stone-500">
          {TYPE_LABELS[place.type] ?? place.type}
          {place.address ? ` · ${place.address}` : ""}
        </div>
      </div>
      {score?.avg != null && (
        <div className="shrink-0 text-right">
          <Stars value={score.avg} />
          <div className="text-xs text-stone-400">
            {score.n} {score.n === 1 ? "nota" : "notas"}
          </div>
        </div>
      )}
    </Link>
  );
}
