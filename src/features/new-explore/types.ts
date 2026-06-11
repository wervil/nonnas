export type ZoomLevel =
  | "EARTH"
  | "CONTINENT"
  | "COUNTRY"
  | "STATE"
  | "CITY"
  | "NONNA";

export type GlobeNonna = {
  id: string;
  lat: number;
  lng: number;
  countryCode: string;
  countryName: string;
  nonnaCount: number;
  representativeName: string;
  representativeTitle: string;
  representativePhoto: string | null;
  recipeId?: string | number;
  history?: string;
  origin?: string;
  region?: string;
  city?: string;
  clusterLevel?: "continent" | "country" | "state" | "city" | "nonna";
};

export type PanelNonna = {
  id: string | number;
  name: string;
  recipeTitle?: string;
  history?: string;
  photo?: string[] | null;
  origin?: string;
};

export type SearchResult = {
  place_id: string;
  description: string;
  main_text?: string;
  secondary_text?: string;
};

export type LatLngLiteral = { lat: number; lng: number };

export type StreetViewReturnPayload = {
  lat: number;
  lng: number;
  heading: number;
  pitch: number;
  zoom: number;
  recipeId?: number;
  nonnaName?: string;
  nonnaTitle?: string;
  nonnaPhoto?: string | null;
  countryName?: string;
  countryCode?: string;
};

export type ClusterParams = {
  level: string;
  continent?: string;
  country?: string;
  countryCode?: string;
  region?: string;
  city?: string;
  lat?: number;
  lng?: number;
};

export type ClosestParams = {
  lat: number;
  lng: number;
  level: ZoomLevel;
  continent?: string;
  country?: string;
  countryCode?: string;
  region?: string;
  city?: string;
};

export type RecipeFilters = {
  continent?: string;
  country?: string;
  region?: string;
  city?: string;
};

export type GeoAsset = "continents" | "countries" | "states";

export type AllClustersResponse = {
  continents: GlobeNonna[];
  countries: GlobeNonna[];
  states: GlobeNonna[];
  cities: GlobeNonna[];
};

export type PanelState = {
  open: boolean;
  region: string;
  regionDisplayName: string;
  scope: "continent" | "country" | "state" | "city";
  country?: string;
  state?: string;
  city?: string;
  nonnas: PanelNonna[];
  initialTab: "discussion" | "nonnas";
  isLoading: boolean;
};

export type CommentSectionState = {
  open: boolean;
  recipeId: number;
  nonnaDisplayName: string;
  titleName: string;
  photo: string | null;
  countryCode: string;
};
