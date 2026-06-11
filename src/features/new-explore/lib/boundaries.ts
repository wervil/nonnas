import {
  getCountryInfoByCode,
  getCountryInfoWithFallback,
} from "@/lib/countryData";

export type GeoJsonPolygon = {
  type: "Polygon";
  coordinates: number[][][];
};

export function resolveCountryDisplayName(
  countryName?: string | null,
  countryCode?: string | null,
): string {
  if (countryName) {
    const info = getCountryInfoWithFallback(countryName);
    if (info.code !== "XX") return info.name;
    return countryName;
  }
  if (countryCode) {
    const byCode = getCountryInfoByCode(countryCode);
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
  const raw = item?.geojson;
  if (raw?.type === "Polygon" && Array.isArray(raw.coordinates)) {
    return raw as GeoJsonPolygon;
  }
  if (raw?.type === "MultiPolygon" && Array.isArray(raw.coordinates)) {
    const first = (raw.coordinates as number[][][][])[0]?.[0];
    if (first?.length) return { type: "Polygon", coordinates: [first] };
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
