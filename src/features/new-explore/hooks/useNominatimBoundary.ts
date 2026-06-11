"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchNominatimBoundary } from "../api/globe-api";
import { globeKeys } from "../query-keys";

export function useNominatimBoundary(query: string | null, enabled = false) {
  return useQuery({
    queryKey: globeKeys.nominatim(query ?? ""),
    queryFn: () => fetchNominatimBoundary(query!),
    enabled: enabled && !!query,
    staleTime: 5 * 60_000,
  });
}
