import { getCountryInfoWithFallback } from "@/lib/countryData";
import { cityLabelsMatch } from "@/lib/locationData";
import type { GlobeNonna } from "../types";

export type ClusterLayers = {
  continents: GlobeNonna[];
  countries: GlobeNonna[];
  states: GlobeNonna[];
  cities: GlobeNonna[];
} | null;

export function normAdminLabel(value: string | undefined | null): string {
  return (value || "").toLowerCase().trim();
}

export function markerMatchesViewportCountry(
  marker: GlobeNonna,
  viewportCountry: string,
  viewportCountryCode?: string | null,
): boolean {
  const norm = normAdminLabel(viewportCountry);
  const markerCountry = normAdminLabel(marker.countryName);
  if (markerCountry === norm) return true;
  const vpCode = (viewportCountryCode || "").toUpperCase();
  const markerCode = (marker.countryCode || "").toUpperCase();
  if (vpCode && markerCode && vpCode === markerCode) return true;
  const vpInfo = getCountryInfoWithFallback(viewportCountry);
  const markerInfo = getCountryInfoWithFallback(marker.countryName);
  return (
    vpInfo.code !== "XX" &&
    markerInfo.code !== "XX" &&
    markerInfo.code === vpInfo.code
  );
}

export function findCityClusterFromLabel(
  data: ClusterLayers,
  geocodedCity: string,
  country?: string | null,
  countryCode?: string | null,
): GlobeNonna | null {
  if (!data?.cities?.length || !geocodedCity.trim()) return null;

  const matches = data.cities.filter((c) => {
    if (!cityLabelsMatch(c.city, geocodedCity)) return false;
    if (country && !markerMatchesViewportCountry(c, country, countryCode)) {
      return false;
    }
    return true;
  });

  if (matches.length === 0) return null;
  return matches.sort((a, b) => b.nonnaCount - a.nonnaCount)[0];
}
