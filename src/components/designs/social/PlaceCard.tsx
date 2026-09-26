import Link from "next/link";
import { MapPin, ShoppingBasket, Star, Store, Truck, UtensilsCrossed } from "lucide-react";
import { TYPE_LABELS } from "@/lib/places";
import type { PlaceCardProps } from "@/components/designs/types";

// No cover photo exists for places in this data model, so the "photo-first"
// treatment here is a bold graphic block (icon badge) instead of a fabricated
// image -- still high-contrast and image-scaled, just not a real photo.
const TYPE_ICONS: Record<string, typeof MapPin> = {
  restaurant: UtensilsCrossed,
  food_stall: Store,
  food_truck: Truck,
  market_stall: ShoppingBasket,
  other: MapPin,
};

export function PlaceCard({ place, score }: PlaceCardProps) {
  const Icon = TYPE_ICONS[place.type] ?? MapPin;
  return (
    <Link
      href={`/places/${place.id}`}
      className="group flex items-center gap-4 rounded-2xl bg-stone-900 p-4 text-white transition active:scale-[0.98]"
    >
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-accent">
        <Icon className="h-7 w-7 text-white" strokeWidth={2.25} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-lg font-bold leading-tight">{place.name}</div>
        <div className="truncate text-sm text-stone-300">
          {TYPE_LABELS[place.type] ?? place.type}
          {place.address ? ` · ${place.address}` : ""}
        </div>
      </div>
      {score?.avg != null && (
        <div className="flex shrink-0 flex-col items-center gap-0.5 rounded-full bg-accent px-3 py-1.5">
          <span className="flex items-center gap-1 text-sm font-extrabold leading-none">
            <Star className="h-3.5 w-3.5" fill="currentColor" strokeWidth={0} />
            {score.avg.toFixed(1)}
          </span>
          <span className="text-[10px] font-medium leading-none text-accent-soft">
            {score.n} {score.n === 1 ? "nota" : "notas"}
          </span>
        </div>
      )}
    </Link>
  );
}
