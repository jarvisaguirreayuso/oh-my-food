import Image from "next/image";
import { DishPhotoUploader } from "@/components/DishPhotoUploader";
import type { DishHeaderProps } from "@/components/designs/types";

export function DishHeader({ dish, canEdit }: DishHeaderProps) {
  return (
    <div className="mb-4">
      {canEdit ? (
        <DishPhotoUploader dishId={dish.id} initialPhotoUrl={dish.photoUrl} size="lg" />
      ) : (
        dish.photoUrl && (
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl">
            <Image
              src={dish.photoUrl}
              alt=""
              fill
              sizes="(min-width: 640px) 640px, 100vw"
              className="object-cover"
            />
          </div>
        )
      )}
      <div className="mt-3">
        <h1 className="font-display text-2xl font-bold">{dish.name}</h1>
        {dish.price != null && <p className="text-sm text-stone-500">{dish.price.toFixed(2)} €</p>}
      </div>
    </div>
  );
}
