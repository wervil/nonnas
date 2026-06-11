import type { GeoAsset } from "../types";

const GEO_PATHS: Record<GeoAsset, string> = {
  continents: "/geo/ne_continents.geojson",
  countries: "/geo/ne_admin0_countries.geojson",
  states: "/geo/ne_states_slim.geojson",
};

export async function fetchGeoJsonAsset(asset: GeoAsset): Promise<unknown> {
  const path = GEO_PATHS[asset];
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}`);
  return res.json();
}
