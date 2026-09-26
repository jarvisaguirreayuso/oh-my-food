import { TYPE_LABELS } from "@/lib/places";
import type { PlaceHeaderProps } from "@/components/designs/types";

export function PlaceHeader({ place, actionsSlot }: PlaceHeaderProps) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl bg-stone-900 px-4 py-4 text-white">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent-soft">
          {TYPE_LABELS[place.type] ?? place.type}
        </p>
        <h1 className="truncate text-2xl font-extrabold leading-tight">{place.name}</h1>
        {place.address && <p className="truncate text-sm text-stone-300">{place.address}</p>}
      </div>
      {actionsSlot && <div className="flex shrink-0 items-center gap-2">{actionsSlot}</div>}
    </div>
  );
}
