"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { Palette } from "lucide-react";
import { DESIGNS, type Design } from "@/lib/design-constants";
import { setDesignCookie } from "@/lib/design-actions";

const LABELS: Record<Design, string> = {
  actual: "Actual",
  grid: "Grid",
  editorial: "Editorial",
  social: "Social",
};

// Temporary comparison tool -- delete this component (and the cookie/registry
// it drives) once a design is picked. Visible on every screen on purpose.
export function DesignSwitcher({ current }: { current: Design }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function pick(design: Design) {
    setOpen(false);
    startTransition(async () => {
      await setDesignCookie(design);
      router.refresh();
    });
  }

  return (
    <div className="fixed bottom-24 right-4 z-30 flex flex-col items-end gap-2">
      {open && (
        <div className="flex flex-col gap-1 rounded-xl border border-stone-200 bg-white p-2 shadow-lg">
          {DESIGNS.map((d) => (
            <button
              key={d}
              type="button"
              disabled={pending}
              onClick={() => pick(d)}
              className={clsx(
                "rounded-lg px-3 py-2 text-left text-sm font-medium",
                d === current ? "bg-accent text-white" : "text-stone-700 hover:bg-stone-100"
              )}
            >
              {LABELS[d]}
            </button>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Cambiar diseño"
        className="flex h-11 w-11 items-center justify-center rounded-full bg-stone-900 text-white shadow-lg"
      >
        <Palette size={20} />
      </button>
    </div>
  );
}
