import Link from "next/link";
import { UtensilsCrossed, Store, Truck, ShoppingBasket } from "lucide-react";
import { TYPE_LABELS } from "@/lib/places";
import type { PlaceCardProps } from "@/components/designs/types";

const TYPE_ICONS: Record<string, typeof UtensilsCrossed> = {
  restaurant: UtensilsCrossed,
  food_stall: Store,
  food_truck: Truck,
  market_stall: ShoppingBasket,
  other: Store,
};

// Places have no cover photo in this data model, so the "photo" here is a
// generated graphic tile (initial + type icon) rather than a fabricated URL --
// still image-forward and grid-friendly without pretending a photo exists.
export function PlaceCard({ place, score }: PlaceCardProps) {
  const Icon = TYPE_ICONS[place.type] ?? Store;
  return (
    <Link
      href={`/places/${place.id}`}
      className="group flex items-stretch overflow-hidden rounded-2xl border border-stone-200 bg-white transition hover:border-stone-300 hover:shadow-sm"
    >
      <div className="relative aspect-square w-28 shrink-0 overflow-hidden bg-gradient-to-br from-accent-soft to-stone-100">
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-display text-4xl font-semibold text-accent/70">
            {place.name.charAt(0).toUpperCase()}
          </span>
        </div>
        <Icon className="absolute bottom-2 left-2 h-4 w-4 text-accent/60" strokeWidth={1.75} />
        {score?.avg != null && (
          <div className="absolute right-2 top-2 flex items-center gap-0.5 rounded-full bg-white/95 px-1.5 py-0.5 text-xs font-semibold text-accent shadow-sm">
            ★ {score.avg.toFixed(1)}
          </div>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 px-4 py-3">
        <div className="truncate font-medium text-stone-900">{place.name}</div>
        <div className="truncate text-sm text-stone-500">
          {TYPE_LABELS[place.type] ?? place.type}
          {place.address ? ` · ${place.address}` : ""}
        </div>
        {score?.avg != null && (
          <div className="text-xs text-stone-400">
            {score.n} {score.n === 1 ? "nota" : "notas"}
          </div>
        )}
      </div>
    </Link>
  );
}
