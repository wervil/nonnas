"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchClosestCluster } from "../api/globe-api";
import { globeKeys } from "../query-keys";
import type { ClosestParams } from "../types";

export function useClosestCluster(
  params: ClosestParams | null,
  enabled = false,
) {
  return useQuery({
    queryKey: params ? globeKeys.closest(params) : globeKeys.all,
    queryFn: () => {
      if (!params) throw new Error("No closest params");
      return fetchClosestCluster(params);
    },
    enabled: enabled && !!params,
    staleTime: 0,
  });
}
