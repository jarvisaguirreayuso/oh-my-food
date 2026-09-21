"use client";

import { useState } from "react";
import { Chip } from "@/components/ui/Chip";

type State = "all" | "visited" | "saved";

// Bottom sheet instead of always-visible chip rows: with state + list + type all
// competing for space the chips became a cluttered wall on small screens. Every
// option here is still a plain <Link>, so filtering stays URL-driven and the
// server component in page.tsx doesn't need to change.
export function MapFiltersSheet({
  state,
  listId,
  view,
  type,
  lists,
  typesPresent,
  typeLabels,
  showStateList,
}: {
  state: State;
  listId: string | null;
  view: "map" | "list";
  type: string | null;
  lists: { id: string; name: string }[];
  typesPresent: string[];
  typeLabels: Record<string, string>;
  showStateList: boolean;
}) {
  const [open, setOpen] = useState(false);

  const href = (next: Partial<Record<"state" | "list" | "view" | "type", string | null>>) => {
    const params = new URLSearchParams();
    const merged = {
      state: state === "all" ? null : state,
      list: listId,
      view: view === "map" ? null : view,
      type,
      ...next,
    };
    for (const [k, v] of Object.entries(merged)) if (v) params.set(k, v);
    const qs = params.toString();
    return qs ? `/map?${qs}` : "/map";
  };

  const activeCount = (showStateList && state !== "all" ? 1 : 0) + (showStateList && listId ? 1 : 0) + (type ? 1 : 0);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-full border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-700"
      >
        Filtros
        {activeCount > 0 && (
          <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-white">
            {activeCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-30 flex items-end justify-center">
          <button
            type="button"
            aria-label="Cerrar filtros"
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Filtros del mapa"
            className="relative w-full max-w-2xl rounded-t-2xl bg-white px-4 pb-6 pt-4 shadow-xl"
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Filtros</h2>
              <div className="flex items-center gap-3 text-sm">
                {activeCount > 0 && (
                  <a href={href({ state: null, list: null, type: null })} className="text-accent">
                    Limpiar
                  </a>
                )}
                <button type="button" onClick={() => setOpen(false)} className="text-stone-500" aria-label="Cerrar">
                  Cerrar
                </button>
              </div>
            </div>

            <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto">
              {showStateList && (
                <div>
                  <p className="mb-2 text-xs font-medium text-stone-500">Estado</p>
                  <div className="flex flex-wrap gap-2">
                    <Chip href={href({ state: null })} active={state === "all"}>
                      Todos
                    </Chip>
                    <Chip href={href({ state: "visited" })} active={state === "visited"}>
                      ✓ Visitados
                    </Chip>
                    <Chip href={href({ state: "saved" })} active={state === "saved"}>
                      🔖 Quiero ir
                    </Chip>
                  </div>
                </div>
              )}

              {showStateList && lists.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-medium text-stone-500">Lista</p>
                  <div className="flex flex-wrap gap-2">
                    {lists.map((l) => (
                      <Chip key={l.id} href={href({ list: l.id === listId ? null : l.id })} active={l.id === listId}>
                        {l.name}
                      </Chip>
                    ))}
                  </div>
                </div>
              )}

              {typesPresent.length > 1 && (
                <div>
                  <p className="mb-2 text-xs font-medium text-stone-500">Tipo</p>
                  <div className="flex flex-wrap gap-2">
                    <Chip href={href({ type: null })} active={!type}>
                      Todos los tipos
                    </Chip>
                    {typesPresent.map((t) => (
                      <Chip key={t} href={href({ type: t === type ? null : t })} active={t === type}>
                        {typeLabels[t]}
                      </Chip>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
