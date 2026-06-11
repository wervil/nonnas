"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { fetchClusterMarkers } from "../api/globe-api";
import { globeKeys } from "../query-keys";
import type { ClusterParams } from "../types";

export function useClusterMarkers(
  params: ClusterParams,
  enabled = true,
) {
  return useQuery({
    queryKey: globeKeys.clusters(params),
    queryFn: () => fetchClusterMarkers(params),
    enabled,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}
