/** Geocoder statuses that should resolve to an empty result set, not throw. */
const BENIGN_GEOCODER_STATUSES = new Set([
  "ZERO_RESULTS",
  "ERROR",
  "OVER_QUERY_LIMIT",
]);

function isBenignGeocoderFailure(err: unknown): boolean {
  const e = err as { code?: string; status?: string; message?: string };
  const status = e?.code || e?.status;
  if (status && BENIGN_GEOCODER_STATUSES.has(status)) return true;
  const msg = String(e?.message ?? err);
  return /ZERO_RESULTS|GEOCODER_GEOCODE:\s*ERROR|OVER_QUERY_LIMIT/i.test(msg);
}

/**
 * Wraps the Google Geocoder so expected failures (no results, transient server
 * errors, rate limits) return `{ results: [] }` instead of rejecting. Every
 * call site reads `response?.results?.[0]`, so this keeps zoom/highlight logic
 * running without noisy console errors on slow or flaky networks.
 */
export function createResilientGeocoder(
  GeocoderClass: new () => google.maps.Geocoder,
): google.maps.Geocoder {
  const geocoder = new GeocoderClass();
  const rawGeocode = geocoder.geocode.bind(geocoder);

  geocoder.geocode = (async (
    ...args: Parameters<google.maps.Geocoder["geocode"]>
  ) => {
    try {
      return await rawGeocode(...args);
    } catch (err) {
      if (isBenignGeocoderFailure(err)) {
        return { results: [] };
      }
      throw err;
    }
  }) as typeof geocoder.geocode;

  return geocoder;
}
