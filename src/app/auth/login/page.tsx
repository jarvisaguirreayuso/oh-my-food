"use client";

import { useActionState } from "react";
import { sendMagicLink, signInWithPassword, type LoginState } from "./actions";

const initialState: LoginState = { status: "idle" };

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(sendMagicLink, initialState);
  const [passwordState, passwordAction, passwordPending] = useActionState(signInWithPassword, initialState);

  return (
    <main className="mx-auto flex min-h-[80vh] max-w-sm flex-col justify-center gap-6 px-4">
      <div>
        <h1 className="font-display text-2xl font-semibold">Entrar</h1>
        <p className="mt-1 text-sm text-stone-500">
          Te enviamos un enlace mágico a tu email, o entra con contraseña.
        </p>
      </div>

      <form action={formAction} className="flex flex-col gap-3">
        <input
          type="email"
          name="email"
          required
          placeholder="tu@email.com"
          className="rounded-lg border border-stone-300 px-4 py-3 text-base outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-accent px-4 py-3 font-medium text-white disabled:opacity-50"
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

      <div className="flex items-center gap-3 text-xs text-stone-400">
        <span className="h-px flex-1 bg-stone-200" />
        o con contraseña
        <span className="h-px flex-1 bg-stone-200" />
      </div>

      <form action={passwordAction} className="flex flex-col gap-3">
        <input
          type="email"
          name="email"
          required
          autoComplete="username"
          placeholder="tu@email.com"
          className="rounded-lg border border-stone-300 px-4 py-3 text-base outline-none focus:border-accent"
        />
        <input
          type="password"
          name="password"
          required
          autoComplete="current-password"
          placeholder="Contraseña"
          className="rounded-lg border border-stone-300 px-4 py-3 text-base outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={passwordPending}
          className="rounded-lg border border-accent px-4 py-3 font-medium text-stone-900 disabled:opacity-50"
        >
          {passwordPending ? "Entrando…" : "Entrar con contraseña"}
        </button>
      </form>

      {passwordState.status === "error" && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">{passwordState.message}</p>
      )}
    </main>
  );
}
