// sharedTypes.ts
export type Nonna = {
  id: string | number;
  name: string;
  firstName?: string;
  lastName?: string;
  grandmotherTitle?: string;
  recipeTitle?: string;
  photo?: string[] | null;
  recipeImage?: string[] | null;
  dishImage?: string[] | null;
  history?: string;
  traditions?: string | null;
  origin?: string;
  tagline?: string;
};

export type ClusterPoint = {
  id: string;
  lat: number;
  lng: number;

  // required for aggregation + drilldown:
  continent?: string;        // optional (globe uses geojson; map uses selectedContinent)
  countryCode: string;       // e.g. "PK"
  countryName: string;       // e.g. "Pakistan"
  stateName?: string;        // e.g. "Punjab"

  // your payload:
  nonnas: Nonna[];
};

// API response types
export type GlobeApiResponse = {
  success: boolean;
  data?: {
    countries: {
      id: string;
      lat: number;
      lng: number;
      continent: string;
      region?: string; // Sub-region for Asia breakdown (Middle East, South Asia, etc.)
      countryCode: string;
      countryName: string;
      nonnaCount: number;
    }[];
    continentSummary: Record<string, number>;
    regionSummary?: Record<string, number>; // Summary by sub-region
    totalNonnas: number;
  };
  error?: string;
};

export type CountryApiResponse = {
  success: boolean;
  data?: {
    countryCode: string;
    countryName: string;
    continent: string;
    states: {
      stateName: string;
      lat: number;
      lng: number;
      nonnaCount: number;
      nonnas: Nonna[];
    }[];
    totalNonnas: number;
  };
  error?: string;
};

export type StateApiResponse = {
  success: boolean;
  data?: {
    country: string;
    countryCode: string;
    state: string;
    nonnas: Nonna[];
    count: number;
  };
  error?: string;
};
