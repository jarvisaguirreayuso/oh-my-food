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
  dishId: z.string().uuid().nullable(),
  dishName: z.string().trim().min(2).max(120).nullable(),
  idea: z.number().int().min(1).max(5),
  execution: z.number().int().min(1).max(5),
  flavor: z.number().int().min(1).max(5),
  wouldRepeat: z.boolean(),
  comment: z.string().trim().max(2000).optional().nullable(),
}).refine((d) => d.dishId !== null || (d.dishName !== null && d.dishName.length >= 2), {
  message: "Selecciona un plato existente o escribe un nombre para uno nuevo",
  path: ["dishName"],
});
export type DishRatingInput = z.infer<typeof dishRatingSchema>;

export const visitSchema = z.object({
  placeId: z.string().uuid(),
  visitedOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida")
    .refine((d) => d <= new Date().toISOString().slice(0, 10), "La fecha no puede ser futura"),
  placeRating: z.number().int().min(1).max(5).optional().nullable(),
  placeComment: z.string().trim().max(2000).optional().nullable(),
  dishes: z.array(dishRatingSchema).default([]),
});
export type VisitInput = z.infer<typeof visitSchema>;

export const granularitySchema = z.enum(["month", "quarter"]);
export type Granularity = z.infer<typeof granularitySchema>;
