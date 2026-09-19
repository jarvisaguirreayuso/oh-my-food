"use client";

import { useActionState } from "react";
import { createList, type ListState } from "./actions";

const initialState: ListState = { status: "idle" };

export function CreateListForm() {
  const [state, formAction, pending] = useActionState(createList, initialState);
  return (
    <form action={formAction} className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          name="name"
          required
          maxLength={60}
          placeholder="Nueva lista (p. ej. Pasta)"
          className="flex-1 rounded-lg border border-stone-300 px-4 py-2.5 text-base outline-none focus:border-accent"
        />
        <button
          disabled={pending}
          className="rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
        >
          Crear
        </button>
      </div>
      {state.status === "error" && <p className="text-sm text-red-700">{state.message}</p>}
    </form>
  );
}
