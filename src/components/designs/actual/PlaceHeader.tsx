import { TYPE_LABELS } from "@/lib/places";
import type { PlaceHeaderProps } from "@/components/designs/types";

export function PlaceHeader({ place, actionsSlot }: PlaceHeaderProps) {
  return (
    <div className="mb-2 flex items-start justify-between gap-3">
      <div>
        <h1 className="font-display text-2xl font-bold">{place.name}</h1>
        <p className="text-sm text-stone-500">
          {TYPE_LABELS[place.type] ?? place.type}
          {place.address ? ` · ${place.address}` : ""}
        </p>
      </div>
      {actionsSlot}
    </div>
  );
}
