export type Nonna = {
    id: string;
    name: string;
    age: number;
    origin: string;
    tagline: string;
  };
  
  export type ClusterPoint = {
    id: string;
    lat: number;
    lng: number;
  
    // REQUIRED for your flow:
    countryCode: string; // e.g. "PK", "US"
    countryName: string; // e.g. "Pakistan"
    stateName: string; // e.g. "Punjab"
    continent: string; // e.g. "Asia"
  
    nonnas: Nonna[]; // for modal display
  };
  
  export type Mode2D =
    | { kind: "continent"; continent: string }
    | { kind: "country"; continent: string; countryCode: string };
  