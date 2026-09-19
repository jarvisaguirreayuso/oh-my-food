"use client";

import { useActionState, useState } from "react";
import { PlacePicker } from "@/components/PlacePicker";
import { StarInput } from "@/components/StarInput";
import { DishEntry, type DishEntryValue } from "@/components/DishEntry";
import { AudiencePicker, type AudienceValue } from "@/components/AudiencePicker";
import { submitVisit, type SaveVisitState } from "./actions";

const initialState: SaveVisitState = { status: "idle" };

function todayISO() {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" });
}

function emptyDish(): DishEntryValue {
  return {
    dishId: null,
    dishName: null,
    idea: 4,
    execution: 4,
    flavor: 4,
    wouldRepeat: true,
    comment: "",
  };
}

export function NewVisitForm({
  initialPlace,
  defaults,
}: {
  initialPlace: { id: string; name: string } | null;
  defaults: AudienceValue;
}) {
  const [state, formAction, pending] = useActionState(submitVisit, initialState);
  const [place, setPlace] = useState<{ id: string; name: string } | null>(initialPlace);
  const [visitedOn, setVisitedOn] = useState(todayISO());
  const [placeRating, setPlaceRating] = useState<number | null>(null);
  const [placeComment, setPlaceComment] = useState("");
  const [dishes, setDishes] = useState<DishEntryValue[]>([]);
  const [privacy, setPrivacy] = useState<AudienceValue>(defaults);

  const payload = place
    ? JSON.stringify({
        placeId: place.id,
        visitedOn,
        placeRating,
        placeComment: placeComment || null,
        dishes: dishes.filter((d) => d.dishId || (d.dishName && d.dishName.trim().length >= 2)),
        audience: privacy.audience,
        poolsPublicly: privacy.poolsPublicly,
      })
    : "";

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="font-display mb-4 text-xl font-semibold">Registrar visita</h1>

      {!place ? (
        <div>
          <p className="mb-2 text-sm font-medium">1. ¿Dónde has comido?</p>
          <PlacePicker onSelect={setPlace} />
        </div>
      ) : (
        <form action={formAction} className="flex flex-col gap-6">
          <input type="hidden" name="payload" value={payload} />

          <div className="rounded-lg bg-stone-50 px-4 py-3">
            <div className="text-sm text-stone-500">Sitio</div>
            <div className="flex items-center justify-between">
              <div className="font-medium">{place.name}</div>
              <button type="button" className="text-xs text-accent" onClick={() => setPlace(null)}>
                cambiar
              </button>
            </div>
          </div>

          <label className="flex flex-col gap-1 text-sm font-medium">
            Fecha de la visita
            <input
              type="date"
              value={visitedOn}
              max={todayISO()}
              onChange={(e) => setVisitedOn(e.target.value)}
              className="rounded-lg border border-stone-300 px-4 py-3 text-base outline-none focus:border-accent"
            />
          </label>

          <div>
            <p className="mb-1 text-sm font-medium">Valoración general del sitio (opcional)</p>
            <StarInput value={placeRating} onChange={setPlaceRating} optional />
            <textarea
              value={placeComment}
              onChange={(e) => setPlaceComment(e.target.value)}
              placeholder="Comentario sobre el sitio (opcional)"
              rows={2}
              className="mt-2 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium">Platos</p>
              <button
                type="button"
                className="text-sm font-medium text-accent"
                onClick={() => setDishes((d) => [...d, emptyDish()])}
              >
                + Añadir plato
              </button>
            </div>
            <div className="flex flex-col gap-3">
              {dishes.map((d, i) => (
                <DishEntry
                  key={i}
                  placeId={place.id}
                  value={d}
                  onChange={(v) => setDishes((arr) => arr.map((x, idx) => (idx === i ? v : x)))}
                  onRemove={() => setDishes((arr) => arr.filter((_, idx) => idx !== i))}
                />
              ))}
              {dishes.length === 0 && (
                <p className="text-sm text-stone-400">
                  Puedes guardar la visita solo con la valoración del sitio, o añadir platos.
                </p>
              )}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">¿Quién puede ver esta reseña?</p>
            <AudiencePicker initial={privacy} onChange={setPrivacy} />
            <p className="mt-2 text-xs text-stone-400">
              Puedes cambiar tus valores por defecto en tu perfil.
            </p>
          </div>

          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-accent px-4 py-3 font-medium text-white disabled:opacity-50"
          >
            {pending ? "Guardando…" : "Guardar visita"}
          </button>

          {state.status === "error" && (
            <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">{state.message}</p>
          )}
        </form>
      )}
    </div>
  );
}
