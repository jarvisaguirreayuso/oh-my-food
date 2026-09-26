"use client";

import { useActionState, useState } from "react";
import { StarInput } from "@/components/StarInput";
import { DishEntry, type DishEntryValue } from "@/components/DishEntry";
import { AudiencePicker, type AudienceValue } from "@/components/AudiencePicker";
import type { Audience } from "@/lib/validation";
import { updateVisit, type SaveVisitState } from "./actions";

const initialState: SaveVisitState = { status: "idle" };

function todayISO() {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" });
}

type VisitData = {
  id: string;
  visited_on: string;
  place_rating: number | null;
  place_comment: string | null;
  place_id: string;
  audience: Audience;
  places: { id: string; name: string } | null;
  dish_reviews: Array<{
    id: string;
    idea: number;
    execution: number;
    would_repeat: boolean;
    comment: string | null;
    photo_url: string | null;
    dish_id: string;
    dishes: { name: string } | null;
  }>;
};

export function EditVisitForm({ visit }: { visit: VisitData }) {
  const [state, formAction, pending] = useActionState(updateVisit, initialState);
  const [visitedOn, setVisitedOn] = useState(visit.visited_on);
  const [placeRating, setPlaceRating] = useState<number | null>(visit.place_rating);
  const [placeComment, setPlaceComment] = useState(visit.place_comment ?? "");
  const [privacy, setPrivacy] = useState<AudienceValue>({
    audience: visit.audience,
  });
  const [dishes, setDishes] = useState<DishEntryValue[]>(
    visit.dish_reviews.map((dr) => ({
      dishId: dr.dish_id,
      dishName: dr.dishes?.name ?? "",
      idea: dr.idea,
      execution: dr.execution,
      wouldRepeat: dr.would_repeat,
      comment: dr.comment ?? "",
      price: null,
      photoUrl: dr.photo_url,
    }))
  );

  const originalDishIds = visit.dish_reviews.map((dr) => dr.dish_id);

  const payload = JSON.stringify({
    placeId: visit.place_id,
    visitedOn,
    placeRating,
    placeComment: placeComment || null,
    dishes: dishes.filter((d) => d.dishId || (d.dishName && d.dishName.trim().length >= 2)),
    audience: privacy.audience,
  });

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="visitId" value={visit.id} />
      <input type="hidden" name="payload" value={payload} />
      <input type="hidden" name="originalDishIds" value={JSON.stringify(originalDishIds)} />

      <div className="rounded-lg bg-stone-50 px-4 py-3">
        <div className="text-sm text-stone-500">Sitio</div>
        <div className="font-medium">{visit.places?.name}</div>
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
            onClick={() =>
              setDishes((d) => [
                ...d,
                {
                  dishId: null,
                  dishName: null,
                  idea: 4,
                  execution: 4,
                  wouldRepeat: true,
                  comment: "",
                  price: null,
                  photoUrl: null,
                },
              ])
            }
          >
            + Añadir plato
          </button>
        </div>
        <div className="flex flex-col gap-3">
          {dishes.map((d, i) => (
            <DishEntry
              key={i}
              placeId={visit.place_id}
              value={d}
              onChange={(v) => setDishes((arr) => arr.map((x, idx) => (idx === i ? v : x)))}
              onRemove={() => setDishes((arr) => arr.filter((_, idx) => idx !== i))}
            />
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium">¿Quién puede ver esta reseña?</p>
        <AudiencePicker initial={privacy} onChange={setPrivacy} />
        <p className="mt-2 text-xs text-stone-400">
          Ampliar la audiencia es seguro. Al restringirla, quien ya la vio puede recordarla.
        </p>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-accent px-4 py-3 font-medium text-white disabled:opacity-50"
      >
        {pending ? "Guardando…" : "Guardar cambios"}
      </button>

      {state.status === "error" && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">{state.message}</p>
      )}
    </form>
  );
}
