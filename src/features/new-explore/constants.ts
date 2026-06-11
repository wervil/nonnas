import type { ZoomLevel } from "./types";

export const ZOOM_RANGES: Record<ZoomLevel, number> = {
  EARTH: 30000000,
  CONTINENT: 10000000,
  COUNTRY: 3000000,
  STATE: 700000,
  CITY: 8000,
  NONNA: 3000,
};

export const MARKER_SCALE_BY_LEVEL: Record<ZoomLevel, number> = {
  EARTH: 1.55,
  CONTINENT: 1.2,
  COUNTRY: 0.72,
  STATE: 0.58,
  CITY: 1.15,
  NONNA: 1.05,
};

export const ZOOM_LEVEL_META: Record<
  ZoomLevel,
  { label: string; description: string }
> = {
  EARTH: { label: "World", description: "See all Nonnas globally" },
  CONTINENT: { label: "Continent", description: "Browse by continent" },
  COUNTRY: { label: "Country", description: "Explore by country" },
  STATE: { label: "Region", description: "Dive into regions" },
  CITY: { label: "City", description: "Meet a Nonna" },
  NONNA: { label: "Nonna", description: "Close-up view" },
};

export const TEAL = {
  primary: "#0d9488",
  light: "#14b8a6",
  lighter: "#5eead4",
  dark: "#0f766e",
  glow: "rgba(13,148,136,0.35)",
  fill: "rgba(13,148,136,0.18)",
  stroke: "#0d9488",
  badge: "rgba(13,148,136,0.85)",
  badgeBorder: "#14b8a6",
};

export const STREET_VIEW_RETURN_STORAGE_KEY = "nonnas.streetViewReturnState";

export const CLUSTER_POLL_INTERVAL_MS = 5 * 60 * 1000;
