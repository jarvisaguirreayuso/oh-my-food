import { TYPE_LABELS } from "@/lib/places";
import type { PlaceHeaderProps } from "@/components/designs/types";

// A masthead: large serif name, a subdued byline, and any actions tucked
// away as quiet text links rather than buttons competing for attention.
export function PlaceHeader({ place, actionsSlot }: PlaceHeaderProps) {
  return (
    <div className="mb-6 border-b border-stone-200 pb-5">
      <div className="flex items-start justify-between gap-4">
        <h1 className="font-display text-3xl leading-tight text-stone-900 sm:text-4xl">{place.name}</h1>
        {actionsSlot && (
          <div className="mt-1 flex shrink-0 items-center gap-3 text-sm text-stone-500 [&_button]:font-normal [&_a]:font-normal">
            {actionsSlot}
          </div>
        )}
      </div>
      <p className="mt-2 text-sm uppercase tracking-wide text-stone-400">
        {TYPE_LABELS[place.type] ?? place.type}
        {place.address ? ` — ${place.address}` : ""}
      </p>
    </div>
  );
}
