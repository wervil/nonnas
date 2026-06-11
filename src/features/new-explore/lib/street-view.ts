import { STREET_VIEW_RETURN_STORAGE_KEY } from "../constants";
import type { StreetViewReturnPayload } from "../types";

export function parseStreetViewReturnPayload(
  raw: string | null,
): StreetViewReturnPayload | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<StreetViewReturnPayload>;
    const lat = Number(parsed.lat);
    const lng = Number(parsed.lng);
    const heading = Number(parsed.heading);
    const pitch = Number(parsed.pitch);
    const zoom = Number(parsed.zoom);
    const recipeId =
      parsed.recipeId !== undefined ? Number(parsed.recipeId) : undefined;
    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      !Number.isFinite(heading) ||
      !Number.isFinite(pitch) ||
      !Number.isFinite(zoom)
    ) {
      return null;
    }
    return {
      lat,
      lng,
      heading,
      pitch,
      zoom,
      ...(Number.isFinite(recipeId) ? { recipeId } : {}),
      ...(typeof parsed.nonnaName === "string"
        ? { nonnaName: parsed.nonnaName }
        : {}),
      ...(typeof parsed.nonnaTitle === "string"
        ? { nonnaTitle: parsed.nonnaTitle }
        : {}),
      ...(typeof parsed.nonnaPhoto === "string" || parsed.nonnaPhoto === null
        ? { nonnaPhoto: parsed.nonnaPhoto }
        : {}),
      ...(typeof parsed.countryName === "string"
        ? { countryName: parsed.countryName }
        : {}),
      ...(typeof parsed.countryCode === "string"
        ? { countryCode: parsed.countryCode }
        : {}),
    };
  } catch {
    return null;
  }
}

export function consumeStreetViewRestoreParam(): StreetViewReturnPayload | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const shouldRestore = params.get("restoreStreetView") === "1";
  if (!shouldRestore) return null;

  params.delete("restoreStreetView");
  const nextQuery = params.toString();
  window.history.replaceState(
    {},
    "",
    `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}`,
  );

  const pending = parseStreetViewReturnPayload(
    window.sessionStorage?.getItem(STREET_VIEW_RETURN_STORAGE_KEY),
  );
  window.sessionStorage?.removeItem(STREET_VIEW_RETURN_STORAGE_KEY);
  return pending;
}

export function extractLatLng(rawPos: unknown): { lat: number; lng: number } | null {
  if (!rawPos || typeof rawPos !== "object") return null;
  const obj = rawPos as Record<string, unknown>;
  const rawLat = obj["lat"];
  const rawLng = obj["lng"];
  const lat =
    typeof rawLat === "function"
      ? Number((rawLat as () => unknown)())
      : Number(rawLat);
  const lng =
    typeof rawLng === "function"
      ? Number((rawLng as () => unknown)())
      : Number(rawLng);
  if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  return null;
}
