import type {
  AllClustersResponse,
  ClosestParams,
  ClusterParams,
  GlobeNonna,
  RecipeFilters,
} from "../types";

export async function fetchAllClusters(): Promise<AllClustersResponse> {
  const res = await fetch("/api/nonnas/clustering?level=ALL", {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch clusters");
  const data = await res.json();
  return {
    continents: data.continents ?? [],
    countries: data.countries ?? [],
    states: data.states ?? [],
    cities: data.cities ?? [],
  };
}

export async function fetchClusterMarkers(
  params: ClusterParams,
): Promise<GlobeNonna[]> {
  const query = new URLSearchParams();
  query.set("level", params.level);
  if (params.continent) query.set("continent", params.continent);
  if (params.country) query.set("country", params.country);
  if (params.countryCode) query.set("countryCode", params.countryCode);
  if (params.region) query.set("region", params.region);
  if (params.city) query.set("city", params.city);
  if (params.lat !== undefined) query.set("lat", String(params.lat));
  if (params.lng !== undefined) query.set("lng", String(params.lng));

  const res = await fetch(`/api/nonnas/clustering?${query}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch cluster markers");
  const data = await res.json();
  return Array.isArray(data) ? data : (data.markers ?? data.nonnas ?? []);
}

export async function fetchClosestCluster(
  params: ClosestParams,
): Promise<GlobeNonna | null> {
  const query = new URLSearchParams();
  query.set("lat", String(params.lat));
  query.set("lng", String(params.lng));
  query.set("level", params.level);
  if (params.continent) query.set("continent", params.continent);
  if (params.country) query.set("country", params.country);
  if (params.countryCode) query.set("countryCode", params.countryCode);
  if (params.region) query.set("region", params.region);
  if (params.city) query.set("city", params.city);

  const res = await fetch(`/api/nonnas/closest?${query}`);
  if (!res.ok) throw new Error("Failed to fetch closest cluster");
  const data = await res.json();
  return data ?? null;
}

export async function fetchExploreRecipes(
  filters: RecipeFilters,
): Promise<unknown[]> {
  const query = new URLSearchParams({ published: "true" });
  if (filters.continent) query.set("continent", filters.continent);
  if (filters.country) query.set("country", filters.country);
  if (filters.region) query.set("region", filters.region);
  if (filters.city) query.set("city", filters.city);

  const res = await fetch(`/api/recipes?${query}`);
  if (!res.ok) throw new Error("Failed to fetch recipes");
  const data = await res.json();
  return Array.isArray(data) ? data : (data.recipes ?? []);
}

export async function fetchRecipeById(
  id: string | number,
): Promise<unknown | null> {
  const res = await fetch(`/api/recipes?published=true&id=${id}`);
  if (!res.ok) throw new Error("Failed to fetch recipe");
  const data = await res.json();
  if (Array.isArray(data)) return data[0] ?? null;
  return data ?? null;
}

export async function fetchNominatimBoundary(
  query: string,
): Promise<unknown> {
  const res = await fetch(
    `/api/nominatim-proxy?q=${encodeURIComponent(query)}`,
  );
  if (!res.ok) throw new Error("Nominatim proxy failed");
  return res.json();
}
