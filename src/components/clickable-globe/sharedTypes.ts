// sharedTypes.ts
export type Nonna = {
    id: string;
    name: string;
    age?: number;
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
  