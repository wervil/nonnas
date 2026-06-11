"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchRecipeById } from "../api/globe-api";
import { globeKeys } from "../query-keys";

export function useRecipeById(id: string | number | null, enabled = true) {
  return useQuery({
    queryKey: globeKeys.recipe(id ?? "none"),
    queryFn: () => fetchRecipeById(id!),
    enabled: enabled && id != null,
    staleTime: 60_000,
  });
}
