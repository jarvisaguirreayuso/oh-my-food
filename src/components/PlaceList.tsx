import Link from "next/link";
import { TYPE_LABELS, type GeneralScore } from "@/lib/places";
import { Stars } from "@/components/ui/Stars";

type PlaceItem = { id: string; name: string; type: string; address: string | null };

export function PlaceList({
  places,
  scores,
  emptyMessage,
}: {
  places: PlaceItem[] | null;
  scores: Map<string, GeneralScore>;
  emptyMessage: string;
}) {
  return (
    <ul className="flex flex-col gap-2">
      {places?.map((p) => {
        const score = scores.get(p.id);
        return (
          <li key={p.id}>
            <Link
              href={`/places/${p.id}`}
              className="flex items-center justify-between gap-3 rounded-lg border border-stone-200 px-4 py-3 hover:border-stone-400"
            >
              <div className="min-w-0">
                <div className="truncate font-medium">{p.name}</div>
                <div className="truncate text-sm text-stone-500">
                  {TYPE_LABELS[p.type] ?? p.type}
                  {p.address ? ` · ${p.address}` : ""}
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
          </li>
        );
      })}
      {places?.length === 0 && <p className="py-8 text-center text-sm text-stone-400">{emptyMessage}</p>}
    </ul>
  );
}
