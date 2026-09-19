"use client";

import { useActionState } from "react";
import { createPlace, type CreatePlaceState } from "./actions";

const initialState: CreatePlaceState = { status: "idle" };

const TYPES = [
  { value: "restaurant", label: "Restaurante" },
  { value: "food_stall", label: "Puesto" },
  { value: "food_truck", label: "Food truck" },
  { value: "market_stall", label: "Puesto de mercado" },
  { value: "other", label: "Otro" },
];

export default function NewPlacePage() {
  const [state, formAction, pending] = useActionState(createPlace, initialState);

  return (
    <div className="mx-auto max-w-md px-4 py-6">
      <h1 className="font-display mb-4 text-xl font-semibold">Nuevo sitio</h1>
      <form action={formAction} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Nombre
          <input
            name="name"
            required
            className="rounded-lg border border-stone-300 px-4 py-3 text-base outline-none focus:border-accent"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium">
          Tipo
          <select
            name="type"
            defaultValue="restaurant"
            className="rounded-lg border border-stone-300 px-4 py-3 text-base outline-none focus:border-accent"
          >
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium">
          Dirección
          <input
            name="address"
            placeholder="Calle, ciudad…"
            className="rounded-lg border border-stone-300 px-4 py-3 text-base outline-none focus:border-accent"
          />
          <span className="text-xs font-normal text-stone-400">
            La usamos para geolocalizar el sitio automáticamente (OpenStreetMap).
          </span>
        </label>

        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-accent px-4 py-3 font-medium text-white disabled:opacity-50"
        >
          {pending ? "Creando…" : "Crear sitio"}
        </button>

        {state.status === "error" && (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">{state.message}</p>
        )}
      </form>
    </div>
  );
}
