import {
  getCountryInfoByCode,
  getCountryInfoWithFallback,
} from "@/lib/countryData";

export type GeoJsonPolygon = {
  type: "Polygon";
  coordinates: number[][][];
};

export type GeoJsonGeometry = {
  type: string;
  coordinates?: unknown;
  geometries?: unknown[];
};

export function safeCountryCode(code: unknown): string | null {
  if (typeof code !== "string") return null;
  const trimmed = code.trim();
  return trimmed.length >= 2 ? trimmed : null;
}

function isValidRing(ring: unknown): ring is number[][] {
  if (!Array.isArray(ring) || ring.length < 4) return false;
  for (const pt of ring) {
    if (!Array.isArray(pt) || pt.length < 2) return false;
    const lng = Number(pt[0]);
    const lat = Number(pt[1]);
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) return false;
  }
  return true;
}

/** Unwrap Feature / JSON-string geojson from Nominatim into a plain geometry object. */
export function normalizeGeoJsonGeometry(
  input: unknown,
): GeoJsonGeometry | null {
  if (!input) return null;
  if (typeof input === "string") {
    try {
      return normalizeGeoJsonGeometry(JSON.parse(input));
    } catch {
      return null;
    }
  }
  if (typeof input !== "object") return null;
  const obj = input as Record<string, unknown>;
  if (obj.type === "Feature" && obj.geometry) {
    return normalizeGeoJsonGeometry(obj.geometry);
  }
  if (typeof obj.type === "string") {
    return {
      type: obj.type,
      coordinates: obj.coordinates,
      geometries: Array.isArray(obj.geometries)
        ? (obj.geometries as unknown[])
        : undefined,
    };
  }
  return null;
}

/** Extract outer rings from Polygon / MultiPolygon / GeometryCollection. */
export function extractOuterRingsFromGeometry(
  geometry: GeoJsonGeometry | null | undefined,
): number[][][] {
  if (!geometry) return [];
  const rings: number[][][] = [];

  if (geometry.type === "Polygon" && Array.isArray(geometry.coordinates)) {
    const outer = geometry.coordinates[0];
    if (isValidRing(outer)) rings.push(outer);
  } else if (
    geometry.type === "MultiPolygon" &&
    Array.isArray(geometry.coordinates)
  ) {
    for (const polygon of geometry.coordinates) {
      if (!Array.isArray(polygon)) continue;
      const outer = polygon[0];
      if (isValidRing(outer)) rings.push(outer);
    }
  } else if (
    geometry.type === "GeometryCollection" &&
    Array.isArray(geometry.geometries)
  ) {
    for (const part of geometry.geometries) {
      rings.push(...extractOuterRingsFromGeometry(normalizeGeoJsonGeometry(part)));
    }
  }

  return rings;
}

export function resolveCountryDisplayName(
  countryName?: string | null,
  countryCode?: string | null,
): string {
  if (countryName) {
    const info = getCountryInfoWithFallback(countryName);
    if (info.code !== "XX") return info.name;
    return countryName;
  }
  const cc = safeCountryCode(countryCode);
  if (cc) {
    const byCode = getCountryInfoByCode(cc);
    if (byCode) return byCode.name;
  }
  return "";
}

export function circlePolygonGeoJson(
  lat: number,
  lng: number,
  radiusKm: number,
  segments = 32,
): GeoJsonPolygon {
  const coords: number[][] = [];
  const latRad = (lat * Math.PI) / 180;
  const metersToLat = (m: number) => (m / 6371000) * (180 / Math.PI);
  const metersToLng = (m: number) => metersToLat(m) / Math.cos(latRad || 1e-6);
  for (let i = 0; i <= segments; i++) {
    const angle = (2 * Math.PI * i) / segments;
    coords.push([
      lng + metersToLng(radiusKm * 1000 * Math.sin(angle)),
      lat + metersToLat(radiusKm * 1000 * Math.cos(angle)),
    ]);
  }
  return { type: "Polygon", coordinates: [coords] };
}

export function bboxToPolygonGeoJson(bbox: string[] | number[]): GeoJsonPolygon {
  const [south, north, west, east] = bbox.map(Number);
  const ring: number[][] = [
    [west, south],
    [east, south],
    [east, north],
    [west, north],
    [west, south],
  ];
  return { type: "Polygon", coordinates: [ring] };
}

export function geometryFromNominatimResult(
  item:
    | {
        geojson?: { type: string; coordinates?: unknown };
        boundingbox?: string[];
        lat?: string;
        lon?: string;
      }
    | undefined,
  fallbackLat?: number,
  fallbackLng?: number,
): GeoJsonPolygon | null {
  const raw = normalizeGeoJsonGeometry(item?.geojson);
  if (raw?.type === "Polygon" && Array.isArray(raw.coordinates)) {
    const outer = raw.coordinates[0];
    if (isValidRing(outer)) return { type: "Polygon", coordinates: [outer] };
  }
  if (raw?.type === "MultiPolygon" && Array.isArray(raw.coordinates)) {
    const first = (raw.coordinates as number[][][][])[0]?.[0];
    if (isValidRing(first)) return { type: "Polygon", coordinates: [first] };
  }
  if (item?.boundingbox?.length === 4) {
    return bboxToPolygonGeoJson(item.boundingbox);
  }
  const lat = Number(item?.lat);
  const lng = Number(item?.lon);
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return circlePolygonGeoJson(lat, lng, 10);
  }
  if (Number.isFinite(fallbackLat) && Number.isFinite(fallbackLng)) {
    return circlePolygonGeoJson(fallbackLat!, fallbackLng!, 10);
  }
  return null;
}
