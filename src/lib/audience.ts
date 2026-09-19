import type { Audience } from "@/lib/validation";

// Copy shared by the visit forms, profile settings and visit cards.
// Note "public" means any signed-in user: without an account nobody sees
// individual reviews, only general averages.
export const AUDIENCE_OPTIONS: Array<{ value: Audience; label: string; hint: string }> = [
  { value: "public", label: "Público", hint: "Cualquier usuario registrado la ve con tu nombre." },
  { value: "followers", label: "Mis seguidores", hint: "Quien te sigue la ve con tu nombre." },
  { value: "mutuals", label: "Amigos", hint: "Solo quien te sigue y a quien sigues tú." },
  { value: "private", label: "Solo yo", hint: "Diario privado. No cuenta en la media general." },
];

export const AUDIENCE_LABELS: Record<Audience, string> = {
  public: "Público",
  followers: "Seguidores",
  mutuals: "Amigos",
  private: "Solo yo",
};

export const POOLS_LABEL = "Sumar mi nota a la media general del sitio (sin tu nombre)";
