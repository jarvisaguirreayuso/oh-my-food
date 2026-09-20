import { z } from "zod";

export const placeTypeSchema = z.enum([
  "restaurant",
  "food_stall",
  "food_truck",
  "market_stall",
  "other",
]);
export type PlaceType = z.infer<typeof placeTypeSchema>;

export const newPlaceSchema = z.object({
  name: z.string().trim().min(2, "El nombre es demasiado corto").max(120),
  type: placeTypeSchema,
  address: z.string().trim().max(240).optional().nullable(),
  lat: z.number().min(-90).max(90).optional().nullable(),
  lng: z.number().min(-180).max(180).optional().nullable(),
});
export type NewPlaceInput = z.infer<typeof newPlaceSchema>;

export const dishRatingSchema = z.object({
  dishId: z.guid().nullable(),
  dishName: z.string().trim().min(2).max(120).nullable(),
  idea: z.number().int().min(1).max(5),
  execution: z.number().int().min(1).max(5),
  wouldRepeat: z.boolean(),
  comment: z.string().trim().max(2000).optional().nullable(),
  // Only used the first time a dish is created; ignored for existing dishes.
  price: z.number().positive().max(9999).optional().nullable(),
}).refine((d) => d.dishId !== null || (d.dishName !== null && d.dishName.length >= 2), {
  message: "Selecciona un plato existente o escribe un nombre para uno nuevo",
  path: ["dishName"],
});
export type DishRatingInput = z.infer<typeof dishRatingSchema>;

export const audienceSchema = z.enum(["public", "followers", "mutuals", "private"]);
export type Audience = z.infer<typeof audienceSchema>;

export const visitSchema = z.object({
  placeId: z.guid(),
  visitedOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida")
    .refine((d) => d <= new Date().toISOString().slice(0, 10), "La fecha no puede ser futura"),
  placeRating: z.number().int().min(1).max(5).optional().nullable(),
  placeComment: z.string().trim().max(2000).optional().nullable(),
  dishes: z.array(dishRatingSchema).default([]),
  // Omitted = use the user's defaults on insert / keep the current value on update.
  audience: audienceSchema.optional(),
});
export type VisitInput = z.infer<typeof visitSchema>;

export const granularitySchema = z.enum(["month", "quarter"]);
export type Granularity = z.infer<typeof granularitySchema>;

// Usernames appear in URLs (/u/<username>), so keep them lowercase and URL-safe.
// Must match the profiles_username_format check in the database.
const RESERVED_USERNAMES = ["admin", "root", "system", "support", "soporte", "ohmyfood", "oh_my_food", "api", "me"];

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9_]{3,20}$/, "De 3 a 20 caracteres: letras minúsculas, números o _")
  .refine((u) => !RESERVED_USERNAMES.includes(u), "Ese nombre de usuario no está disponible");

// Accounts start with a generated `user_<12 hex>` username until the person picks one.
export const isProvisionalUsername = (username: string) => /^user_[0-9a-f]{12}$/.test(username);

export const profileSchema = z
  .object({
    username: usernameSchema,
    displayName: z.string().trim().max(60, "Máximo 60 caracteres").nullable(),
    bio: z.string().trim().max(280, "Máximo 280 caracteres").nullable(),
    defaultAudience: audienceSchema,
  })
  .transform((p) => ({
    ...p,
    displayName: p.displayName || null,
    bio: p.bio || null,
  }));
export type ProfileInput = z.infer<typeof profileSchema>;
