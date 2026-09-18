// Nominatim geocoding — used ONLY when a user creates a new place.
// Usage policy: https://operations.osmfoundation.org/policies/nominatim/
// Max 1 req/s, custom User-Agent required, no client-side autocomplete spam.
const USER_AGENT = "oh-my-food-app (jarvis.aguirre.ayuso@gmail.com)";

export type GeocodeResult = {
  lat: number;
  lng: number;
  displayName: string;
};

export async function geocodeAddress(query: string): Promise<GeocodeResult | null> {
  const trimmed = query.trim();
  if (!trimmed) return null;

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", trimmed);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");

  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, "Accept-Language": "es" },
  });

  if (!res.ok) return null;

  const results = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>;
  const first = results[0];
  if (!first) return null;

  return {
    lat: parseFloat(first.lat),
    lng: parseFloat(first.lon),
    displayName: first.display_name,
  };
}
