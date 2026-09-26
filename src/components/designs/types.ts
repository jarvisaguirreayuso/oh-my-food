// Shared prop/data contracts for the swappable "design" components. All 4
// skins (actual/grid/editorial/social) implement the same shapes so pages
// don't change when the resolved design changes -- only which component gets
// rendered does. See src/lib/design-components.ts for the dispatcher.

import type { ReactNode } from "react";
import type { Audience } from "@/lib/validation";
import type { GeneralScore } from "@/lib/places";

export type PlaceCardData = { id: string; name: string; type: string; address: string | null };
export type PlaceCardProps = { place: PlaceCardData; score?: GeneralScore };

export type VisitCardData = {
  id: string;
  visited_on: string;
  place_rating: number | null;
  place_comment: string | null;
  audience?: Audience;
  places: { id: string; name: string } | null;
  profiles?: { username: string; display_name: string | null } | null;
  dish_reviews: Array<{
    id: string;
    idea: number;
    execution: number;
    would_repeat: boolean;
    photo_url?: string | null;
    dishes: { name: string } | null;
  }>;
};
export type VisitCardProps = {
  visit: VisitCardData;
  showAuthor?: boolean;
  showAudience?: boolean;
  showEdit?: boolean;
};

export type PlaceHeaderData = { id: string; name: string; type: string; address: string | null };
export type PlaceHeaderProps = { place: PlaceHeaderData; actionsSlot?: ReactNode };

export type DishHeaderData = { id: string; name: string; price: number | null; photoUrl: string | null };
export type DishHeaderProps = { dish: DishHeaderData; canEdit: boolean };

export type PhotoExplorerItem = {
  reviewId: string;
  photoUrl: string;
  dishId: string;
  dishName: string | null;
  placeId: string;
  placeName: string | null;
  visitedOn: string;
  authorUsername: string | null;
  authorDisplayName: string | null;
};
export type PhotoPage = { items: PhotoExplorerItem[]; nextCursor: string | null };
export type PhotoExplorerFilters = { placeId?: string; userId?: string };
export type PhotoExplorerProps = {
  initial: PhotoPage;
  filters: PhotoExplorerFilters;
};
