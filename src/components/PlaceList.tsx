import type { GeneralScore } from "@/lib/places";
import { getDesignComponents } from "@/lib/design-components";

type PlaceItem = { id: string; name: string; type: string; address: string | null };

export async function PlaceList({
  places,
  scores,
  emptyMessage,
}: {
  places: PlaceItem[] | null;
  scores: Map<string, GeneralScore>;
  emptyMessage: string;
}) {
  const { PlaceCard } = await getDesignComponents();
  return (
    <ul className="flex flex-col gap-2">
      {places?.map((p) => (
        <li key={p.id}>
          <PlaceCard place={p} score={scores.get(p.id)} />
        </li>
      ))}
      {places?.length === 0 && <p className="py-8 text-center text-sm text-stone-400">{emptyMessage}</p>}
    </ul>
  );
}
