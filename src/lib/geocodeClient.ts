/**
 * Geocode using the Google Maps JS API (browser).
 * Works with referrer-restricted keys; server REST geocoding often does not.
 */

export type GeocodeClientResult = {
  lat: number;
  lng: number;
};

function waitForGoogleMaps(timeoutMs = 15000): Promise<typeof google.maps> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("Geocoding is only available in the browser"));
      return;
    }

    const start = Date.now();
    const check = () => {
      if (window.google?.maps) {
        resolve(window.google.maps);
        return;
      }
      if (Date.now() - start > timeoutMs) {
        reject(new Error("Google Maps failed to load"));
        return;
      }
      window.setTimeout(check, 100);
    };
    check();
  });
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

export function formatCoordinates({ lat, lng }: GeocodeClientResult): string {
  return `${lat},${lng}`;
}

/**
 * Geocode a city using google.maps.Geocoder.
 * @param countryIso - ISO 3166-1 alpha-2 (e.g. "IT") to bias results
 */
export async function geocodeCityInBrowser(
  city: string,
  region: string | null | undefined,
  countryName: string,
  countryIso?: string,
): Promise<string | null> {
  const maps = await waitForGoogleMaps();
  const address = buildCityGeocodeQuery(city, region, countryName);
  if (!address) return null;

  const geocoder = new maps.Geocoder();
  const request: google.maps.GeocoderRequest = { address };

  if (countryIso) {
    request.componentRestrictions = { country: countryIso };
  }

  return new Promise((resolve) => {
    geocoder.geocode(request, (results, status) => {
      if (status !== "OK" || !results?.[0]?.geometry?.location) {
        console.warn("[geocodeClient]", status, "for:", address);
        resolve(null);
        return;
      }
      const loc = results[0].geometry.location;
      resolve(formatCoordinates({ lat: loc.lat(), lng: loc.lng() }));
    });
  });
}
