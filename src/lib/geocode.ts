/**
 * Server-side geocoding using Google Maps Geocoding API.
 * Used to resolve coordinates from country/region/city text fields.
 */

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

interface GeocodeResult {
  lat: number;
  lng: number;
}

/**
 * Geocode an address string to lat/lng using Google Maps Geocoding API.
 * Returns null if geocoding fails or no results found.
 */
export async function geocodeAddress(
  address: string,
): Promise<GeocodeResult | null> {
  if (!GOOGLE_MAPS_API_KEY) {
    console.warn("[geocode] No Google Maps API key configured");
    return null;
  }

  try {
    const params = new URLSearchParams({
      address,
      key: GOOGLE_MAPS_API_KEY,
    });

    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?${params}`,
    );

    if (!res.ok) {
      console.warn("[geocode] API returned status:", res.status);
      return null;
    }

    const data = await res.json();

    if (data.status !== "OK" || !data.results?.length) {
      console.warn("[geocode] No results for:", address, "status:", data.status);
      return null;
    }

    const location = data.results[0].geometry.location;
    return { lat: location.lat, lng: location.lng };
  } catch (err) {
    console.error("[geocode] Error geocoding:", address, err);
    return null;
  }
}

/**
 * Build an address string from recipe fields for geocoding.
 * More specific = better results. Tries city+region+country first.
 */
export function buildAddressFromRecipe(fields: {
  city?: string | null;
  region?: string | null;
  country?: string | null;
}): string | null {
  const parts: string[] = [];
  if (fields.city) parts.push(fields.city);
  if (fields.region) parts.push(fields.region);
  if (fields.country) parts.push(fields.country);

  if (parts.length === 0) return null;
  return parts.join(", ");
}

/**
 * Geocode a recipe's location from its country/region/city fields.
 * Returns "lat,lng" string format matching the DB schema, or null.
 */
export async function geocodeRecipeLocation(fields: {
  city?: string | null;
  region?: string | null;
  country?: string | null;
}): Promise<string | null> {
  const address = buildAddressFromRecipe(fields);
  if (!address) return null;

  const result = await geocodeAddress(address);
  if (!result) return null;

  return `${result.lat},${result.lng}`;
}
