import { getDesign } from "@/lib/design";
import type { Design } from "@/lib/design-constants";

import { PlaceCard as ActualPlaceCard } from "@/components/designs/actual/PlaceCard";
import { VisitCard as ActualVisitCard } from "@/components/designs/actual/VisitCard";
import { PlaceHeader as ActualPlaceHeader } from "@/components/designs/actual/PlaceHeader";
import { DishHeader as ActualDishHeader } from "@/components/designs/actual/DishHeader";
import { PhotoExplorer as ActualPhotoExplorer } from "@/components/designs/actual/PhotoExplorer";

import { PlaceCard as GridPlaceCard } from "@/components/designs/grid/PlaceCard";
import { VisitCard as GridVisitCard } from "@/components/designs/grid/VisitCard";
import { PlaceHeader as GridPlaceHeader } from "@/components/designs/grid/PlaceHeader";
import { DishHeader as GridDishHeader } from "@/components/designs/grid/DishHeader";
import { PhotoExplorer as GridPhotoExplorer } from "@/components/designs/grid/PhotoExplorer";

import { PlaceCard as EditorialPlaceCard } from "@/components/designs/editorial/PlaceCard";
import { VisitCard as EditorialVisitCard } from "@/components/designs/editorial/VisitCard";
import { PlaceHeader as EditorialPlaceHeader } from "@/components/designs/editorial/PlaceHeader";
import { DishHeader as EditorialDishHeader } from "@/components/designs/editorial/DishHeader";
import { PhotoExplorer as EditorialPhotoExplorer } from "@/components/designs/editorial/PhotoExplorer";

import { PlaceCard as SocialPlaceCard } from "@/components/designs/social/PlaceCard";
import { VisitCard as SocialVisitCard } from "@/components/designs/social/VisitCard";
import { PlaceHeader as SocialPlaceHeader } from "@/components/designs/social/PlaceHeader";
import { DishHeader as SocialDishHeader } from "@/components/designs/social/DishHeader";
import { PhotoExplorer as SocialPhotoExplorer } from "@/components/designs/social/PhotoExplorer";

// One registry, one place that knows about all 4 skins -- pages never import
// a skin's folder directly, they call getDesignComponents() once and use the
// bundle. This is also why the 4 skin folders can be built/edited in parallel
// with zero file overlap: nothing outside this file references them by path.
const REGISTRY = {
  actual: {
    PlaceCard: ActualPlaceCard,
    VisitCard: ActualVisitCard,
    PlaceHeader: ActualPlaceHeader,
    DishHeader: ActualDishHeader,
    PhotoExplorer: ActualPhotoExplorer,
  },
  grid: {
    PlaceCard: GridPlaceCard,
    VisitCard: GridVisitCard,
    PlaceHeader: GridPlaceHeader,
    DishHeader: GridDishHeader,
    PhotoExplorer: GridPhotoExplorer,
  },
  editorial: {
    PlaceCard: EditorialPlaceCard,
    VisitCard: EditorialVisitCard,
    PlaceHeader: EditorialPlaceHeader,
    DishHeader: EditorialDishHeader,
    PhotoExplorer: EditorialPhotoExplorer,
  },
  social: {
    PlaceCard: SocialPlaceCard,
    VisitCard: SocialVisitCard,
    PlaceHeader: SocialPlaceHeader,
    DishHeader: SocialDishHeader,
    PhotoExplorer: SocialPhotoExplorer,
  },
} satisfies Record<Design, unknown>;

export async function getDesignComponents() {
  const design = await getDesign();
  return REGISTRY[design];
}
