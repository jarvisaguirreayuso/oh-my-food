"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteVisit } from "./actions";

export function DeleteButton({ visitId }: { visitId: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm("¿Borrar esta visita y sus valoraciones de platos?")) return;
        startTransition(async () => {
          await deleteVisit(visitId);
          router.refresh();
        });
      }}
      className="text-xs text-red-600 disabled:opacity-50"
    >
      {pending ? "borrando…" : "borrar"}
    </button>
  );
}
