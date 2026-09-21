import Link from "next/link";
import { addToList, toggleSaved } from "@/app/lists/actions";

// "Quiero ir" + add-to-list controls for a place. Server component: plain forms.
export function PlaceActions({
  placeId,
  saved,
  lists,
  memberOf,
}: {
  placeId: string;
  saved: boolean;
  lists: Array<{ id: string; name: string }>;
  memberOf: string[];
}) {
  const available = lists.filter((l) => !memberOf.includes(l.id));
  const inLists = lists.filter((l) => memberOf.includes(l.id));

  return (
    <div className="mt-4 flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <form action={toggleSaved}>
          <input type="hidden" name="placeId" value={placeId} />
          <input type="hidden" name="saved" value={String(saved)} />
          <button
            className={`rounded-full border px-4 py-1.5 text-sm font-medium ${
              saved ? "border-accent bg-accent text-white" : "border-stone-300"
            }`}
          >
            {saved ? "🔖 Quiero ir" : "🔖 Guardar para ir"}
          </button>
        </form>

        {available.length > 0 && (
          <form action={addToList} className="flex items-center gap-1">
            <input type="hidden" name="placeId" value={placeId} />
            <select
              name="listId"
              required
              defaultValue=""
              aria-label="Añadir a una lista"
              className="rounded-full border border-stone-300 bg-white px-3 py-1.5 text-sm text-stone-500"
            >
              <option value="" disabled>
                Añadir a una lista…
              </option>
              {available.map((l) => (
                <option key={l.id} value={l.id} className="text-stone-900">
                  {l.name}
                </option>
              ))}
            </select>
            <button className="rounded-full border border-stone-300 px-3 py-1.5 text-sm">Añadir</button>
          </form>
        )}
      </div>

      {(inLists.length > 0 || lists.length === 0) && (
        <p className="text-xs text-stone-500">
          {inLists.length > 0 && (
            <>
              En:{" "}
              {inLists.map((l, i) => (
                <span key={l.id}>
                  {i > 0 && ", "}
                  <Link href={`/lists/${l.id}`} className="underline">
                    {l.name}
                  </Link>
                </span>
              ))}
              .{" "}
            </>
          )}
          {lists.length === 0 && (
            <>
              Aún no tienes listas.{" "}
              <Link href="/lists" className="underline">
                Crea una
              </Link>
              .
            </>
          )}
        </p>
      )}
    </div>
  );
}
