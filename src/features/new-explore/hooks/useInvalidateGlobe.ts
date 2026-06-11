"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { globeKeys } from "../query-keys";

export function useInvalidateGlobe() {
  const queryClient = useQueryClient();

  const invalidateAll = useCallback(() => {
    return queryClient.invalidateQueries({ queryKey: globeKeys.all });
  }, [queryClient]);

  const invalidateRecipes = useCallback(() => {
    return queryClient.invalidateQueries({
      queryKey: [...globeKeys.all, "recipes"],
    });
  }, [queryClient]);

  const invalidateClusters = useCallback(() => {
    return queryClient.invalidateQueries({
      queryKey: [...globeKeys.all, "clusters"],
    });
  }, [queryClient]);

  return { invalidateAll, invalidateRecipes, invalidateClusters };
}
