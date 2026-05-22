/**
 * Server-side geocoding via Google Geocoding REST API.
 * May fail if the API key is HTTP-referrer restricted — prefer browser geocoding in forms.
 */

export type GeocodeLocation = {
  lat: number;
  lng: number;
};

export function formatCoordinates({ lat, lng }: GeocodeLocation): string {
  return `${lat},${lng}`;
}

export function buildCityGeocodeQuery(
  city: string,
  region?: string | null,
  country?: string | null,
): string {
  return [city, region, country]
    .filter((part) => part != null && String(part).trim() !== "")
    .join(", ");
}

/** Basic "lat,lng" validation — rejects empty or malformed strings. */
export function isValidCoordinatesString(value: string | null | undefined): boolean {
  if (!value?.trim()) return false;
  const parts = value.split(",").map((p) => p.trim());
  if (parts.length !== 2) return false;
  const lat = Number(parts[0]);
  const lng = Number(parts[1]);
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
}

function getGoogleMapsApiKey(): string | undefined {
  return (
    process.env.GOOGLE_MAPS_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  );
}

export async function geocodeAddress(
  address: string,
  countryIso?: string,
): Promise<GeocodeLocation | null> {
  const apiKey = getGoogleMapsApiKey();
  if (!apiKey) {
    console.error("[geocode] Missing GOOGLE_MAPS_API_KEY");
    return null;
  }

  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("address", address);
  url.searchParams.set("key", apiKey);
  if (countryIso) {
    url.searchParams.set("components", `country:${countryIso}`);
  }

  try {
    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) return null;

    const data = (await res.json()) as {
      status: string;
      error_message?: string;
      results?: Array<{
        geometry?: { location?: { lat: number; lng: number } };
      }>;
    };

    if (data.status !== "OK" || !data.results?.[0]?.geometry?.location) {
      console.warn(
        "[geocode]",
        data.status,
        data.error_message ?? "",
        "for:",
        address,
      );
      return null;
    }

    const { lat, lng } = data.results[0].geometry.location;
    return { lat, lng };
  } catch (err) {
    console.error("[geocode] request failed:", err);
    return null;
  }
}

export async function geocodeCityToCoordinates(
  city: string,
  region?: string | null,
  country?: string | null,
  countryIso?: string,
): Promise<string | null> {
  const query = buildCityGeocodeQuery(city, region, country);
  if (!query) return null;

  const location = await geocodeAddress(query, countryIso);
  if (!location) return null;

  return formatCoordinates(location);
}

/**
 * Resolve coordinates for DB storage.
 * Never uses country-state-city data — only Google (server) or validated client coords.
 */
export async function resolveRecipeCoordinates(input: {
  city?: string | null;
  region?: string | null;
  country?: string | null;
  countryIso?: string | null;
  coordinates?: string | null;
}): Promise<string | null> {
  const city = input.city?.trim();
  const country = input.country?.trim();

  if (city && country) {
    const geocoded = await geocodeCityToCoordinates(
      city,
      input.region,
      country,
      input.countryIso ?? undefined,
    );
    if (geocoded) return geocoded;

    // Server REST may be blocked; accept coordinates set by browser Geocoder in the form
    const clientCoords = input.coordinates?.trim();
    if (isValidCoordinatesString(clientCoords)) {
      return clientCoords!;
    }

    return null;
  }

  const coords = input.coordinates?.trim();
  return isValidCoordinatesString(coords) ? coords! : null;
}
