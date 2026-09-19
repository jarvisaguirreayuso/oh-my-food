"use client";

import { useActionState } from "react";
import { AudiencePicker } from "@/components/AudiencePicker";
import type { Audience } from "@/lib/validation";
import { updateProfile, type ProfileState } from "../actions";

const initialState: ProfileState = { status: "idle" };

export function ProfileForm({
  username,
  displayName,
  bio,
  defaultAudience,
  defaultPoolsPublicly,
}: {
  username: string;
  displayName: string;
  bio: string;
  defaultAudience: Audience;
  defaultPoolsPublicly: boolean;
}) {
  const [state, formAction, pending] = useActionState(updateProfile, initialState);
  const input =
    "w-full rounded-lg border border-neutral-300 px-4 py-3 text-base outline-none focus:border-neutral-900";

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <label className="flex flex-col gap-1 text-sm font-medium">
        Nombre de usuario
        <div className="flex items-center rounded-lg border border-neutral-300 focus-within:border-neutral-900">
          <span className="pl-4 text-neutral-400">@</span>
          <input
            name="username"
            defaultValue={username}
            required
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            maxLength={20}
            placeholder="tu_nombre"
            className="w-full rounded-lg px-2 py-3 text-base outline-none"
          />
        </div>
        <span className="text-xs font-normal text-neutral-400">
          3-20 caracteres: letras minúsculas, números o _. Aparece en tu perfil y en tus reseñas.
        </span>
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium">
        Nombre (opcional)
        <input name="displayName" defaultValue={displayName} maxLength={60} className={input} />
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium">
        Sobre ti (opcional)
        <textarea name="bio" defaultValue={bio} rows={3} maxLength={280} className={input} />
      </label>

      <div>
        <p className="mb-2 text-sm font-medium">Quién ve tus reseñas nuevas por defecto</p>
        <AudiencePicker
          initial={{ audience: defaultAudience, poolsPublicly: defaultPoolsPublicly }}
          audienceName="defaultAudience"
          poolsName="defaultPoolsPublicly"
        />
        <p className="mt-2 text-xs text-neutral-400">
          Puedes cambiarlo en cada reseña. Sin cuenta, nadie ve reseñas sueltas: solo las medias generales.
        </p>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-neutral-900 px-4 py-3 font-medium text-white disabled:opacity-50"
      >
        {pending ? "Guardando…" : "Guardar"}
      </button>

      {state.status === "error" && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">{state.message}</p>
      )}
    </form>
  );
}
