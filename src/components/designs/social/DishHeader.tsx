import Image from "next/image";
import { DishPhotoUploader } from "@/components/DishPhotoUploader";
import type { DishHeaderProps } from "@/components/designs/types";

export function DishHeader({ dish, canEdit }: DishHeaderProps) {
  if (canEdit) {
    return (
      <div className="mb-4">
        <DishPhotoUploader dishId={dish.id} initialPhotoUrl={dish.photoUrl} size="lg" />
        <div className="mt-3">
          <h1 className="text-2xl font-extrabold text-stone-900">{dish.name}</h1>
          {dish.price != null && <p className="text-sm font-semibold text-stone-500">{dish.price.toFixed(2)} €</p>}
        </div>
      </div>
    );
  }

  // Full-bleed feed-post treatment: bleeds past the page's own px-4 gutter
  // (the pages that render DishHeader all use a plain `max-w-2xl px-4` shell)
  // with name/price overlaid at the bottom, like an Instagram post caption.
  return (
    <div className="mb-4">
      {dish.photoUrl ? (
        <div className="relative -mx-4 aspect-[4/5] w-[calc(100%+2rem)] bg-stone-100 sm:mx-0 sm:w-full sm:overflow-hidden sm:rounded-2xl">
          <Image
            src={dish.photoUrl}
            alt=""
            fill
            sizes="(min-width: 640px) 640px, 100vw"
            className="object-cover"
            priority
          />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent px-4 pb-4 pt-16">
            <h1 className="text-2xl font-extrabold text-white">{dish.name}</h1>
            {dish.price != null && <p className="text-sm font-semibold text-accent-soft">{dish.price.toFixed(2)} €</p>}
          </div>
        </div>
      ) : (
        <div className="flex aspect-[4/5] w-full flex-col items-center justify-center rounded-2xl bg-stone-900 px-4 text-center">
          <h1 className="text-2xl font-extrabold text-white">{dish.name}</h1>
          {dish.price != null && <p className="mt-1 text-sm font-semibold text-accent-soft">{dish.price.toFixed(2)} €</p>}
        </div>
      )}
    </div>
  );
}
