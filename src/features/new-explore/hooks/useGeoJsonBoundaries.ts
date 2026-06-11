"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchGeoJsonAsset } from "../api/geojson-api";
import { globeKeys } from "../query-keys";
import type { GeoAsset } from "../types";

export function useGeoJsonBoundaries(asset: GeoAsset, enabled = true) {
  return useQuery({
    queryKey: globeKeys.geojson(asset),
    queryFn: () => fetchGeoJsonAsset(asset),
    enabled,
    staleTime: Infinity,
    gcTime: 24 * 60 * 60 * 1000,
  });
}
