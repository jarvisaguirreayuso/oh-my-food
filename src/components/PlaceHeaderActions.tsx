"use client";

import { useState } from "react";
import Link from "next/link";
import { addToList, removeFromList, toggleSaved } from "@/app/lists/actions";

// Two icon buttons instead of a text button + a confusing inline select: a fork
// & knife to log a visit, and a notepad that opens a bottom sheet where "Quiero
// ir" and each of the user's lists are just one tap away.
export function PlaceHeaderActions({
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
  const [open, setOpen] = useState(false);
  const isSaved = saved || memberOf.length > 0;

  return (
    <div className="flex shrink-0 items-center gap-2">
      <Link
        href={`/visits/new?place=${placeId}`}
        aria-label="Registrar visita"
        className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-lg text-white"
      >
        🍴
      </Link>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Guardar sitio"
        className={`flex h-10 w-10 items-center justify-center rounded-full border text-lg ${
          isSaved ? "border-accent bg-accent/10" : "border-stone-300"
        }`}
      >
        📝
      </button>

      {open && (
        <div className="fixed inset-0 z-30 flex items-end justify-center">
          <button
            type="button"
            aria-label="Cerrar"
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Guardar sitio"
            className="relative w-full max-w-2xl rounded-t-2xl bg-white px-4 pb-6 pt-4 shadow-xl"
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Guardar sitio</h2>
              <button type="button" onClick={() => setOpen(false)} className="text-sm text-stone-500">
                Cerrar
              </button>
            </div>

            <form action={toggleSaved}>
              <input type="hidden" name="placeId" value={placeId} />
              <input type="hidden" name="saved" value={String(saved)} />
              <button
                className={`flex w-full items-center gap-2 rounded-lg border px-4 py-3 text-left text-sm font-medium ${
                  saved ? "border-accent bg-accent/10 text-accent" : "border-stone-300"
                }`}
              >
                🔖 {saved ? "En Quiero ir" : "Guardar para ir"}
              </button>
            </form>

            <p className="mb-2 mt-4 text-xs font-medium text-stone-500">Tus listas</p>
            {lists.length === 0 ? (
              <p className="text-sm text-stone-400">
                Aún no tienes listas.{" "}
                <Link href="/lists" className="underline">
                  Crea una
                </Link>
                .
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {lists.map((l) => {
                  const inList = memberOf.includes(l.id);
                  return (
                    <form key={l.id} action={inList ? removeFromList : addToList}>
                      <input type="hidden" name="placeId" value={placeId} />
                      <input type="hidden" name="listId" value={l.id} />
                      <button
                        className={`flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left text-sm ${
                          inList ? "border-accent bg-accent/10 text-accent" : "border-stone-300"
                        }`}
                      >
                        <span>{l.name}</span>
                        <span>{inList ? "✓" : "+"}</span>
                      </button>
                    </form>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
