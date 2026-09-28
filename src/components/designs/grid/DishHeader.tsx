import Image from "next/image";
import { DishPhotoUploader } from "@/components/DishPhotoUploader";
import type { DishHeaderProps } from "@/components/designs/types";

// The photo bleeds edge-to-edge (negative margin cancels the page's px-4) so
// it reads as the dominant element, with the title sitting below it instead
// of sharing space with a small thumbnail.
export function DishHeader({ dish, canEdit }: DishHeaderProps) {
  return (
    <div className="mb-5 -mx-4">
      {canEdit ? (
        <DishPhotoUploader dishId={dish.id} initialPhotoUrl={dish.photoUrl} size="lg" />
      ) : dish.photoUrl ? (
        <div className="relative aspect-[4/3] w-full sm:aspect-[16/9]">
          <Image src={dish.photoUrl} alt="" fill sizes="(min-width: 640px) 640px, 100vw" className="object-cover" />
        </div>
      ) : (
        <div className="flex aspect-[4/3] w-full items-center justify-center bg-stone-100 text-sm text-stone-400 sm:aspect-[16/9]">
          Todavía no hay foto de este plato.
        </div>
      )}
      <div className="px-4 pt-3">
        <h1 className="font-display text-3xl font-bold">{dish.name}</h1>
        {dish.price != null && <p className="mt-1 text-sm text-stone-500">{dish.price.toFixed(2)} €</p>}
      </div>
    </div>
  );
}
