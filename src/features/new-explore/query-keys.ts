import type {
  ClosestParams,
  ClusterParams,
  GeoAsset,
  RecipeFilters,
} from "./types";

export const globeKeys = {
  all: ["globe"] as const,
  clusters: (params: ClusterParams) =>
    [...globeKeys.all, "clusters", params] as const,
  allClusters: () => [...globeKeys.all, "clusters", "ALL"] as const,
  closest: (params: ClosestParams) =>
    [...globeKeys.all, "closest", params] as const,
  recipes: (filters: RecipeFilters) =>
    [...globeKeys.all, "recipes", filters] as const,
  recipe: (id: string | number) => [...globeKeys.all, "recipe", id] as const,
  geojson: (asset: GeoAsset) => [...globeKeys.all, "geojson", asset] as const,
  nominatim: (query: string) => [...globeKeys.all, "nominatim", query] as const,
};
