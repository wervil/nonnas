"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchExploreRecipes } from "../api/globe-api";
import { globeKeys } from "../query-keys";
import { mapRecipesToPanelNonnas } from "../lib/recipes";
import type { RecipeFilters } from "../types";

export function useExploreRecipes(filters: RecipeFilters, enabled = true) {
  return useQuery({
    queryKey: globeKeys.recipes(filters),
    queryFn: () => fetchExploreRecipes(filters),
    enabled,
    staleTime: 30_000,
    select: mapRecipesToPanelNonnas,
  });
}
