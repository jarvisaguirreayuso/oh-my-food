import { UtensilsCrossed, Store, Truck, ShoppingBasket, MapPin } from "lucide-react";
import { TYPE_LABELS } from "@/lib/places";
import type { PlaceHeaderProps } from "@/components/designs/types";

const TYPE_ICONS: Record<string, typeof UtensilsCrossed> = {
  restaurant: UtensilsCrossed,
  food_stall: Store,
  food_truck: Truck,
  market_stall: ShoppingBasket,
  other: Store,
};

// No place photo to lean on, so the "hero" is a bold graphic/typographic
// treatment instead -- a big tinted panel with a background icon watermark.
export function PlaceHeader({ place, actionsSlot }: PlaceHeaderProps) {
  const Icon = TYPE_ICONS[place.type] ?? Store;
  return (
    <div className="relative mb-5 overflow-hidden rounded-3xl bg-gradient-to-br from-accent-soft via-accent-soft to-stone-50 px-5 pb-5 pt-8">
      <Icon className="pointer-events-none absolute -right-6 -top-6 h-36 w-36 text-accent/10" strokeWidth={1} />
      <div className="relative flex items-end justify-between gap-3">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1 rounded-full bg-white/70 px-2 py-0.5 text-xs font-medium text-accent">
            <Icon className="h-3 w-3" strokeWidth={2} />
            {TYPE_LABELS[place.type] ?? place.type}
          </span>
          <h1 className="mt-2 truncate font-display text-3xl font-bold text-stone-900">{place.name}</h1>
          {place.address && (
            <p className="mt-1 flex items-center gap-1 truncate text-sm text-stone-600">
              <MapPin className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
              {place.address}
            </p>
          )}
        </div>
        {actionsSlot && <div className="shrink-0">{actionsSlot}</div>}
      </div>
    </div>
  );
}
