import Image from "next/image";
import { UtensilsCrossed } from "lucide-react";
import { DishPhotoUploader } from "@/components/DishPhotoUploader";
import type { DishHeaderProps } from "@/components/designs/types";

// Full-bleed opening spread: the photo (or a tasteful placeholder) leads,
// the dish name sits below in large serif type like a magazine feature title.
export function DishHeader({ dish, canEdit }: DishHeaderProps) {
  return (
    <div className="mb-6">
      {canEdit ? (
        <DishPhotoUploader dishId={dish.id} initialPhotoUrl={dish.photoUrl} size="lg" />
      ) : dish.photoUrl ? (
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-sm">
          <Image
            src={dish.photoUrl}
            alt=""
            fill
            sizes="(min-width: 640px) 640px, 100vw"
            className="object-cover"
            priority
          />
        </div>
      ) : (
        <div className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 rounded-sm border border-dashed border-stone-300 bg-stone-50 text-stone-300">
          <UtensilsCrossed className="h-8 w-8" strokeWidth={1.25} />
          <span className="text-xs uppercase tracking-wide text-stone-400">Sin foto todavía</span>
        </div>
      )}
      <div className="mt-4">
        <h1 className="font-display text-3xl leading-tight text-stone-900 sm:text-4xl">{dish.name}</h1>
        {dish.price != null && (
          <p className="mt-1 text-sm uppercase tracking-wide text-stone-400">{dish.price.toFixed(2)} €</p>
        )}
      </div>
    </div>
  );
}
