"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchAllClusters } from "../api/globe-api";
import { CLUSTER_POLL_INTERVAL_MS } from "../constants";
import { globeKeys } from "../query-keys";

export function useAllClusters(enabled = true) {
  return useQuery({
    queryKey: globeKeys.allClusters(),
    queryFn: fetchAllClusters,
    enabled,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    refetchInterval: CLUSTER_POLL_INTERVAL_MS,
  });
}
