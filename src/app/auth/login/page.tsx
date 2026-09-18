"use client";

import { useActionState } from "react";
import { sendMagicLink, type LoginState } from "./actions";

const initialState: LoginState = { status: "idle" };

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(sendMagicLink, initialState);

  return (
    <main className="mx-auto flex min-h-[80vh] max-w-sm flex-col justify-center gap-6 px-4">
      <div>
        <h1 className="text-2xl font-semibold">Entrar</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Te enviamos un enlace mágico a tu email, sin contraseña.
        </p>
      </div>

      <form action={formAction} className="flex flex-col gap-3">
        <input
          type="email"
          name="email"
          required
          placeholder="tu@email.com"
          className="rounded-lg border border-neutral-300 px-4 py-3 text-base outline-none focus:border-neutral-900"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-neutral-900 px-4 py-3 font-medium text-white disabled:opacity-50"
        >
          {pending ? "Enviando…" : "Enviar enlace mágico"}
        </button>
      </form>

      {state.status === "sent" && (
        <p className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800">{state.message}</p>
      )}
      {state.status === "error" && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">{state.message}</p>
      )}
    </main>
  );
}
