"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import type { Nonna, GlobeApiResponse, CountryApiResponse } from "./sharedTypes";
import DiscussionPanel from "../Map/DiscussionPanel";

type Admin0FeatureProps = {
  CONTINENT?: string;
  ISO_A2?: string;
  ADM0_A3?: string;
  NAME?: string;
  ADMIN?: string;
};

// Single consistent color for all nonna markers and UI elements
const MARKER_COLOR = "#d97706"; // Amber/gold color matching the brand

type Admin0FC = GeoJSON.FeatureCollection<GeoJSON.Geometry, Admin0FeatureProps>;

type Drill = "continent" | "country" | "state";

// Type for GeoJSON feature with geometry
interface GeoJSONFeatureWithGeometry {
  type: string;
  properties: Record<string, unknown>;
  geometry: {
    type: string;
    coordinates: number[][] | number[][][] | number[][][][];
  };
}

// Type for cached GeoJSON data
interface CachedGeoJSON {
  type: string;
  features: GeoJSONFeatureWithGeometry[];
  [key: string]: unknown;
}

// Region theme colors for dark theme (includes Asia sub-regions)
const REGION_THEMES: Record<string, { primary: string; secondary: string; highlight: string; bg: string }> = {
  // Africa
  Africa: { primary: "#22c55e", secondary: "#14532d", highlight: "#4ade80", bg: "#052e16" },

  // Asia sub-regions
  "Middle East": { primary: "#f59e0b", secondary: "#451a03", highlight: "#fbbf24", bg: "#1c0a00" },
  "South Asia": { primary: "#f97316", secondary: "#431407", highlight: "#fb923c", bg: "#1a0800" },
  "East Asia": { primary: "#eab308", secondary: "#422006", highlight: "#facc15", bg: "#1a0f00" },
  "Southeast Asia": { primary: "#10b981", secondary: "#064e3b", highlight: "#34d399", bg: "#022c22" },
  "Central Asia": { primary: "#ca8a04", secondary: "#422006", highlight: "#eab308", bg: "#1a0f00" },
  Asia: { primary: "#eab308", secondary: "#422006", highlight: "#facc15", bg: "#1a0f00" }, // Fallback

  // Europe
  Europe: { primary: "#3b82f6", secondary: "#1e3a8a", highlight: "#60a5fa", bg: "#0c1929" },

  // Americas
  "North America": { primary: "#ef4444", secondary: "#450a0a", highlight: "#f87171", bg: "#1a0505" },
  "South America": { primary: "#a855f7", secondary: "#3b0764", highlight: "#c084fc", bg: "#1a0533" },

  // Oceania & Pacific
  Oceania: { primary: "#ec4899", secondary: "#500724", highlight: "#f472b6", bg: "#1a0511" },
  "Pacific Islands": { primary: "#06b6d4", secondary: "#083344", highlight: "#22d3ee", bg: "#051b24" },

  // Antarctica
  Antarctica: { primary: "#64748b", secondary: "#1e293b", highlight: "#94a3b8", bg: "#0f172a" },
};

// Backward compatibility (used by external references)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const CONTINENT_THEMES = REGION_THEMES;

// Map sub-regions to their parent continents for GeoJSON filtering
const REGION_TO_CONTINENT: Record<string, string> = {
  "Middle East": "Asia",
  "South Asia": "Asia",
  "East Asia": "Asia",
  "Southeast Asia": "Asia",
  "Central Asia": "Asia",
  "Pacific Islands": "Oceania",
};

// Countries in each sub-region (for filtering)
const REGION_COUNTRIES: Record<string, string[]> = {
  "Middle East": [
    "Turkey", "Iran", "Iraq", "Saudi Arabia", "Yemen", "Syria", "Jordan",
    "United Arab Emirates", "Israel", "Lebanon", "Oman", "Kuwait", "Qatar",
    "Bahrain", "Cyprus", "Palestine", "Georgia", "Armenia", "Azerbaijan",
  ],
  "South Asia": [
    "India", "Pakistan", "Bangladesh", "Sri Lanka", "Nepal", "Bhutan",
    "Maldives", "Afghanistan",
  ],
  "East Asia": [
    "China", "Japan", "South Korea", "North Korea", "Taiwan", "Mongolia",
    "Russia", "Russian Federation", // Russia grouped with East Asia
  ],
  "Southeast Asia": [
    "Thailand", "Vietnam", "Indonesia", "Philippines", "Malaysia", "Singapore",
    "Myanmar", "Cambodia", "Laos", "Brunei", "Timor-Leste", "East Timor",
  ],
  "Central Asia": [
    "Kazakhstan", "Uzbekistan", "Turkmenistan", "Kyrgyzstan", "Tajikistan",
  ],
  "Pacific Islands": [
    "Fiji", "Papua New Guinea", "Solomon Islands", "Vanuatu", "New Caledonia",
    "Samoa", "Tonga", "Micronesia", "Marshall Islands", "Palau", "Kiribati",
    "New Zealand",
  ],
};

// Load Google Maps API dynamically
let googleMapsPromise: Promise<void> | null = null;

function loadGoogleMapsAPI(apiKey: string): Promise<void> {
  if (googleMapsPromise) return googleMapsPromise;

  if (typeof google !== "undefined" && google.maps) {
    return Promise.resolve();
  }

  googleMapsPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      if (typeof google !== "undefined" && google.maps) {
        resolve();
      } else {
        existingScript.addEventListener("load", () => resolve());
      }
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async&v=weekly`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Maps API"));
    document.head.appendChild(script);
  });

  return googleMapsPromise;
}

type CountryData = {
  id: string;
  lat: number;
  lng: number;
  countryCode: string;
  countryName: string;
  nonnaCount: number;
};

type StateData = {
  stateName: string;
  lat: number;
  lng: number;
  nonnaCount: number;
  nonnas: Nonna[];
  placeId?: string; // Google Place ID for accurate boundary matching
};

export default function GoogleContinentCountryMap({
  active,
  selectedContinent,
  onBackToGlobe,
}: {
  active: boolean;
  selectedContinent: string;
  onBackToGlobe: () => void;
}) {
  const searchParams = useSearchParams();
  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const dataLayerRef = useRef<google.maps.Data | null>(null);
  const stateLayerRef = useRef<google.maps.Data | null>(null); // For state boundaries GeoJSON
  // Using regular Marker (works without Map ID)
  const markersRef = useRef<google.maps.Marker[]>([]);
  const stateLabelsRef = useRef<google.maps.Marker[]>([]); // For state name labels
  const continentBoundsRef = useRef<google.maps.LatLngBounds | null>(null);
  const initialCountrySetRef = useRef(false);
  const cleanupRef = useRef<(() => void) | null>(null);
  const mapInitializedRef = useRef(false); // Track if map has finished initial setup
  const ignoreZoomChangeRef = useRef(false); // Track if we should ignore zoom changes (e.g. during programmatic moves)
  const pendingZoomTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Track pending zoom timeouts to cancel them

  const [drill, setDrill] = useState<Drill>("continent");
  const [selectedCountry, setSelectedCountry] = useState<{ code: string; name: string } | null>(null);
  const [selectedState, setSelectedState] = useState<string | null>(null); // Track selected state name
  const [isLoading, setIsLoading] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [panel, setPanel] = useState<{
    open: boolean;
    region: string;
    regionDisplayName: string;
    scope: 'country' | 'state';
    nonnas: Nonna[];
  }>({
    open: false,
    region: "",
    regionDisplayName: "",
    scope: "country",
    nonnas: [],
  });

  // API data state
  const [countryData, setCountryData] = useState<CountryData[]>([]);
  const [stateData, setStateData] = useState<StateData[]>([]);
  const [geojsonLoaded, setGeojsonLoaded] = useState<string | null>(null); // Track which country's GeoJSON is loaded

  // Ref to always have access to latest stateData in closures
  const stateDataRef = useRef<StateData[]>([]);
  useEffect(() => {
    stateDataRef.current = stateData;
  }, [stateData]);

  const theme = REGION_THEMES[selectedContinent] || REGION_THEMES.Europe;

  // Get the parent continent for GeoJSON filtering
  const parentContinent = REGION_TO_CONTINENT[selectedContinent] || selectedContinent;

  // Get the list of countries for this region (if it's a sub-region)
  const regionCountries = REGION_COUNTRIES[selectedContinent];

  // Fetch countries data for the continent/region
  const fetchCountryData = useCallback(async () => {
    try {
      // Use the region parameter for sub-regions, continent for main continents
      const queryParam = regionCountries
        ? `region=${encodeURIComponent(selectedContinent)}`
        : `continent=${encodeURIComponent(selectedContinent)}`;
      const response = await fetch(`/api/nonnas/globe?${queryParam}`);
      const data: GlobeApiResponse = await response.json();

      if (data.success && data.data) {
        setCountryData(data.data.countries);
      }
    } catch (error) {
      console.error("Error fetching country data:", error);
    }
  }, [selectedContinent, regionCountries]);

  // Fetch state data for a country
  const fetchStateData = useCallback(async (countryCode: string, countryName: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `/api/nonnas/country/${countryCode}?name=${encodeURIComponent(countryName)}`
      );
      const data: CountryApiResponse = await response.json();

      if (data.success && data.data) {
        setStateData(data.data.states);
        return data.data; // Return the data so it can be used
      }
      return null;
    } catch (error) {
      console.error("Error fetching state data:", error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);


  // IMPROVED: Helper function to normalize state names for matching
  const normalizeStateName = useCallback((name: string): string => {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]/g, ''); // Remove all non-alphanumeric characters
  }, []);

  // Check URL for country parameter (for testing)
  useEffect(() => {
    if (initialCountrySetRef.current) return;
    const countryCode = searchParams.get("country");
    const countryName = searchParams.get("countryName");
    const stateName = searchParams.get("state"); // NEW: Support direct state navigation

    if (countryCode && countryName) {
      initialCountrySetRef.current = true;
      setSelectedCountry({ code: countryCode, name: countryName });

      // Check if we're navigating directly to a state
      if (stateName) {
        console.log(`🎯 Direct navigation to state: ${stateName}`);
        setDrill("state");
        setSelectedState(stateName);

        const loadStateView = async () => {
          const data = await fetchStateData(countryCode, countryName);
          const allNonnas = data?.states.flatMap(s => s.nonnas) || [];

          // Find the specific state
          const matchedState = data?.states.find(s =>
            normalizeStateName(s.stateName) === normalizeStateName(stateName)
          );

          setPanel({
            open: true,
            region: stateName,
            regionDisplayName: `${countryName} • ${stateName}`,
            scope: 'state',
            nonnas: matchedState?.nonnas || [],
          });
        };

        loadStateView();
      } else {
        // Just country view
        setDrill("country");

        const loadData = async () => {
          const data = await fetchStateData(countryCode, countryName);
          const allNonnas = data?.states.flatMap(s => s.nonnas) || [];

          setPanel({
            open: true,
            region: countryCode,
            regionDisplayName: countryName,
            scope: 'country',
            nonnas: allNonnas,
          });
        };

        loadData();
      }
    }
  }, [searchParams, fetchStateData, normalizeStateName]);

  // Fetch country data on mount
  useEffect(() => {
    if (active) {
      fetchCountryData();
    }
  }, [active, fetchCountryData]);

  const clearMarkers = useCallback(() => {
    for (const m of markersRef.current) {
      m.setMap(null);
    }
    markersRef.current = [];
  }, []);

  // Clear state name labels
  const clearStateLabels = useCallback(() => {
    for (const label of stateLabelsRef.current) {
      label.setMap(null);
    }
    stateLabelsRef.current = [];
  }, []);

  // Clear state boundaries layer
  const clearStateLayer = useCallback(() => {
    if (stateLayerRef.current) {
      stateLayerRef.current.setMap(null);
      stateLayerRef.current = null;
    }
    // Also clear state labels when clearing state layer
    clearStateLabels();
  }, [clearStateLabels]);

  // Cache for GeoJSON data to avoid re-fetching
  const geojsonCacheRef = useRef<Record<string, CachedGeoJSON>>({});

  // Helper function to calculate centroid from GeoJSON geometry
  const calculateCentroid = useCallback((feature: GeoJSONFeatureWithGeometry): { lat: number; lng: number } | null => {
    try {
      const geometry = feature.geometry;
      if (!geometry) return null;

      let totalLat = 0;
      let totalLng = 0;
      let count = 0;

      const processCoords = (coords: number[]) => {
        totalLng += coords[0];
        totalLat += coords[1];
        count++;
      };

      const processRing = (ring: number[][]) => {
        ring.forEach(processCoords);
      };

      if (geometry.type === 'Polygon') {
        (geometry.coordinates as number[][][]).forEach(processRing);
      } else if (geometry.type === 'MultiPolygon') {
        (geometry.coordinates as number[][][][]).forEach((polygon: number[][][]) => {
          polygon.forEach(processRing);
        });
      }

      if (count === 0) return null;
      return { lat: totalLat / count, lng: totalLng / count };
    } catch (e) {
      console.error('Error calculating centroid:', e);
      return null;
    }
  }, []);


  // IMPROVED: Helper function to find matching state feature by name
  const findStateFeature = useCallback((
    stateLayer: google.maps.Data,
    targetStateName: string
  ): google.maps.Data.Feature | null => {
    const normalizedTarget = normalizeStateName(targetStateName);
    let matchedFeature: google.maps.Data.Feature | null = null;

    stateLayer.forEach((feature) => {
      // Try multiple possible property names
      const possibleNames = [
        feature.getProperty('name'),
        feature.getProperty('NAME'),
        feature.getProperty('NAME_1'),
        feature.getProperty('admin_name'),
        feature.getProperty('ADMIN_NAME'),
      ].filter(Boolean);

      for (const name of possibleNames) {
        const normalized = normalizeStateName(String(name || ''));
        if (normalized === normalizedTarget) {
          matchedFeature = feature;
          return; // Break forEach
        }
      }
    });

    return matchedFeature;
  }, [normalizeStateName]);

  // IMPROVED: Helper function to highlight a state by name
  const highlightState = useCallback((
    stateLayer: google.maps.Data,
    stateName: string,
    shouldHighlight: boolean
  ) => {
    const feature = findStateFeature(stateLayer, stateName);

    if (feature) {
      if (shouldHighlight) {
        stateLayer.overrideStyle(feature, {
          fillColor: MARKER_COLOR,
          fillOpacity: 0.4,
          strokeColor: MARKER_COLOR,
          strokeWeight: 5,
          strokeOpacity: 1.0,
        });
        console.log(`✓ Highlighted state: ${stateName}`);
      } else {
        stateLayer.revertStyle(feature);
        console.log(`✓ Unhighlighted state: ${stateName}`);
      }
    } else {
      console.warn(`⚠ Could not find state feature for: ${stateName}`);
    }
  }, [findStateFeature]);

  // IMPROVED: Helper function to zoom to a state by name
  const zoomToState = useCallback((
    map: google.maps.Map,
    stateLayer: google.maps.Data,
    stateName: string,
    stateCoords?: { lat: number; lng: number }
  ) => {
    console.log(`🔍 zoomToState called for: ${stateName}`);

    const feature = findStateFeature(stateLayer, stateName);

    if (feature) {
      console.log(`✓ Found feature for ${stateName}`);
      const bounds = new google.maps.LatLngBounds();
      let pointCount = 0;

      feature.getGeometry()?.forEachLatLng((latLng: google.maps.LatLng) => {
        bounds.extend(latLng);
        pointCount++;
      });

      console.log(`Bounds point count: ${pointCount}`);

      if (pointCount > 0 && !bounds.isEmpty()) {
        console.log(`✓ Zooming to state bounds: ${stateName}`, bounds.toJSON());
        map.fitBounds(bounds, {
          top: 100,
          bottom: 80,
          left: 40,
          right: 400, // Space for panel
        });
        console.log(`✓ fitBounds called successfully`);
        return true;
      } else {
        console.warn(`⚠️ Bounds are empty for ${stateName}`);
      }
    } else {
      console.warn(`⚠️ Feature not found for ${stateName}`);
    }

    // Fallback: use provided coordinates
    if (stateCoords) {
      console.log(`⚠ Using fallback coordinates for: ${stateName}`, stateCoords);
      map.setCenter(stateCoords);
      map.setZoom(9);
      console.log(`✓ Fallback zoom completed`);
      return true;
    }

    console.error(`❌ Could not zoom to state: ${stateName} (no feature, no coords)`);
    return false;
  }, [findStateFeature]);

  // Load and display state boundaries from GeoJSON
  const loadStateBoundaries = useCallback(async (
    map: google.maps.Map,
    countryCode: string,
    countryName: string,
    targetStateName?: string // Optional: if provided, will zoom to this state after loading
  ): Promise<boolean> => {
    console.log(`📍 Loading state boundaries for ${countryCode}...`);
    if (targetStateName) {
      console.log(`🎯 Target state: ${targetStateName}`);
    }

    // Clear existing state layer
    clearStateLayer();

    try {
      // Check cache first
      let geojson = geojsonCacheRef.current[countryCode];

      if (!geojson) {
        // Fetch GeoJSON from our API
        console.log(`⬇️ Fetching GeoJSON for ${countryCode}...`);
        const response = await fetch(`/api/geojson/${countryCode}`);
        geojson = await response.json() as CachedGeoJSON;
        // Cache it
        geojsonCacheRef.current[countryCode] = geojson;
        console.log(`✓ Fetched and cached GeoJSON`);
      } else {
        console.log(`📦 Using cached GeoJSON for ${countryCode}`);
      }

      console.log(`GeoJSON response for ${countryCode}:`, geojson);

      if (!geojson.features || geojson.features.length === 0) {
        console.warn(`No GeoJSON boundaries found for ${countryCode}, will show state markers only`);
        return false;
      }

      console.log(`✓ Loaded ${geojson.features.length} state boundaries for ${countryCode}`);

      // Create a new Data layer for state boundaries
      const stateLayer = new google.maps.Data();
      stateLayerRef.current = stateLayer;

      // Add the GeoJSON features
      stateLayer.addGeoJson(geojson);

      // Style the state boundaries - BLACK borders for visibility
      stateLayer.setStyle(() => {
        return {
          fillColor: MARKER_COLOR,
          fillOpacity: 0.05, // Very light fill
          strokeColor: '#4d4c4c', // Black borders
          strokeWeight: 2,
          strokeOpacity: 0.8,
          clickable: true,
          cursor: 'pointer',
        };
      });

      // Track selected state name for persistent highlighting
      let currentSelectedState: string | null = null;

      // Add hover effects - but don't override if it's the selected state
      stateLayer.addListener('mouseover', (event: google.maps.Data.MouseEvent) => {
        const hoveredName = String(
          event.feature.getProperty('name') ||
          event.feature.getProperty('NAME') ||
          event.feature.getProperty('NAME_1') ||
          ''
        );

        // Don't change style if this is the selected state (it's already highlighted)
        if (normalizeStateName(hoveredName) === normalizeStateName(currentSelectedState || '')) return;

        stateLayer.overrideStyle(event.feature, {
          fillColor: MARKER_COLOR,
          fillOpacity: 0.3,
          strokeColor: MARKER_COLOR,
          strokeWeight: 4,
        });
      });

      stateLayer.addListener('mouseout', (event: google.maps.Data.MouseEvent) => {
        const hoveredName = String(
          event.feature.getProperty('name') ||
          event.feature.getProperty('NAME') ||
          event.feature.getProperty('NAME_1') ||
          ''
        );

        // Don't revert style if this is the selected state (keep it highlighted)
        if (normalizeStateName(hoveredName) === normalizeStateName(currentSelectedState || '')) return;

        stateLayer.revertStyle(event.feature);
      });

      // IMPROVED: Add click handler with better state matching
      stateLayer.addListener('click', async (event: google.maps.Data.MouseEvent) => {
        const stateName = String(
          event.feature.getProperty('name') ||
          event.feature.getProperty('NAME') ||
          event.feature.getProperty('NAME_1') ||
          'Unknown State'
        );

        console.log(`🖱️ Clicked state: ${stateName}`);

        // IMPORTANT: Cancel any pending country zoom timeout
        if (pendingZoomTimeoutRef.current) {
          console.log(`❌ Cancelling pending zoom timeout`);
          clearTimeout(pendingZoomTimeoutRef.current);
          pendingZoomTimeoutRef.current = null;
        }

        // Unhighlight previously selected state
        if (currentSelectedState && currentSelectedState !== stateName) {
          highlightState(stateLayer, currentSelectedState, false);
        }

        // Set new selected state and highlight it
        currentSelectedState = stateName;
        setSelectedState(stateName);

        // Highlight immediately
        highlightState(stateLayer, stateName, true);

        // Find matching state data
        const currentStateData = stateDataRef.current;
        const normalizedStateName = normalizeStateName(stateName);

        const matchedState = currentStateData.find(s => {
          const normalizedApiName = normalizeStateName(s.stateName);
          return normalizedApiName === normalizedStateName ||
            normalizedApiName.includes(normalizedStateName) ||
            normalizedStateName.includes(normalizedApiName);
        });

        console.log(`Matched state data:`, matchedState);

        setIsTransitioning(true);
        setDrill("state");

        // Prevent zoom listener from interfering
        ignoreZoomChangeRef.current = true;

        // IMPROVED: Zoom to the clicked state - wait a tiny bit for state updates
        await new Promise(resolve => setTimeout(resolve, 50));

        const zoomSuccess = zoomToState(
          map,
          stateLayer,
          stateName,
          matchedState ? { lat: matchedState.lat, lng: matchedState.lng } : undefined
        );

        if (!zoomSuccess) {
          console.warn(`Failed to zoom to state: ${stateName}`);
        }

        // Re-enable zoom listener and end transition after zoom completes
        setTimeout(() => {
          ignoreZoomChangeRef.current = false;
          setIsTransitioning(false);
        }, 1000);

        // Open panel for this state
        setPanel({
          open: true,
          region: stateName,
          regionDisplayName: `${countryName} • ${stateName}`,
          scope: 'state',
          nonnas: matchedState?.nonnas || [],
        });
      });

      // Add the layer to the map
      stateLayer.setMap(map);
      console.log('✓ State boundaries layer added to map');

      // Create state name labels at centroids
      clearStateLabels();
      for (const feature of geojson.features) {
        const stateName = feature.properties?.name || feature.properties?.NAME || feature.properties?.NAME_1 || '';
        if (!stateName) continue;

        const centroid = calculateCentroid(feature);
        if (!centroid) continue;

        // Create a label marker (text only, no icon)
        const labelMarker = new google.maps.Marker({
          map,
          position: centroid,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 0, // Invisible icon
          },
          label: {
            text: String(stateName),
            color: '#1a1a1a',
            fontSize: '10px',
            fontWeight: '500',
            fontFamily: 'Arial, sans-serif',
          },
          clickable: false,
          zIndex: 1, // Below other markers
        });

        stateLabelsRef.current.push(labelMarker);
      }
      console.log(`✓ Created ${stateLabelsRef.current.length} state labels`);

      // Signal that GeoJSON is loaded for this country
      setGeojsonLoaded(countryCode);

      // If a target state was specified, zoom to it now
      if (targetStateName) {
        console.log(`🎯 Zooming to target state: ${targetStateName}`);

        // Wait a tiny bit for the layer to fully render
        await new Promise(resolve => setTimeout(resolve, 100));

        // Find state data for coordinates
        const currentStateData = stateDataRef.current;
        const normalizedTarget = normalizeStateName(targetStateName);
        const matchedState = currentStateData.find(s => {
          const normalized = normalizeStateName(s.stateName);
          return normalized === normalizedTarget ||
            normalized.includes(normalizedTarget) ||
            normalizedTarget.includes(normalized);
        });

        const zoomSuccess = zoomToState(
          map,
          stateLayer,
          targetStateName,
          matchedState ? { lat: matchedState.lat, lng: matchedState.lng } : undefined
        );

        if (zoomSuccess) {
          console.log(`✓ Successfully zoomed to ${targetStateName}`);
          highlightState(stateLayer, targetStateName, true);
          return true;
        } else {
          console.warn(`⚠️ Failed to zoom to ${targetStateName}`);
          return false;
        }
      }

      return true;

    } catch (error) {
      console.error(`Failed to load state boundaries for ${countryCode}:`, error);
      return false;
    }
  }, [clearStateLayer, clearStateLabels, calculateCentroid, highlightState, zoomToState, normalizeStateName]);

  // Create country markers from API data - with click handlers to drill down
  const createCountryMarkers = useCallback((map: google.maps.Map) => {
    clearMarkers();

    for (const country of countryData) {
      if (country.nonnaCount === 0) continue;

      const size = Math.min(50, Math.max(32, 24 + country.nonnaCount * 2));

      // Use regular Marker (works without Map ID)
      const svgMarker = `
        <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
          <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 2}" 
                  fill="${MARKER_COLOR}" stroke="#ffffff" stroke-width="3"/>
          <text x="${size / 2}" y="${size / 2 + 5}" 
                font-family="Arial, sans-serif" font-size="${country.nonnaCount > 99 ? '10' : '14'}" 
                font-weight="700" fill="#ffffff" text-anchor="middle">${country.nonnaCount}</text>
        </svg>
      `;

      const marker = new google.maps.Marker({
        map,
        position: { lat: country.lat, lng: country.lng },
        icon: {
          url: `data:image/svg+xml,${encodeURIComponent(svgMarker)}`,
          scaledSize: new google.maps.Size(size, size),
          anchor: new google.maps.Point(size / 2, size / 2),
        },
        title: `${country.countryName}: ${country.nonnaCount} nonna(s) - Click to see regions`,
        zIndex: 10000,
        clickable: true,
        optimized: false,
      });

      marker.addListener("click", async () => {
        await handleCountryClick(country, map);
      });

      markersRef.current.push(marker);
    }

    // Extracted click handler function
    async function handleCountryClick(country: typeof countryData[0], map: google.maps.Map) {
      const countryCode = country.countryCode;
      const countryName = country.countryName;
      setSelectedCountry({ code: countryCode, name: countryName });
      setIsTransitioning(true);
      setDrill("country");

      // Load state boundaries GeoJSON
      loadStateBoundaries(map, countryCode, countryName);

      // Fetch state data for the country
      try {
        const data = await fetchStateData(countryCode, countryName);

        // Aggregate all nonnas for the country level view
        const allNonnas = data?.states.flatMap(s => s.nonnas) || [];

        setPanel({
          open: true,
          region: countryCode,
          regionDisplayName: countryName,
          scope: 'country',
          nonnas: allNonnas,
        });
      } catch (error) {
        console.error('Failed to fetch state data for', countryName, error);

        // Still open panel even if state data fails
        setPanel({
          open: true,
          region: countryCode,
          regionDisplayName: countryName,
          scope: 'country',
          nonnas: [],
        });
      }

      // Find the country bounds from the data layer and zoom to it
      const dataLayer = dataLayerRef.current;
      if (dataLayer) {
        const countryBounds = new google.maps.LatLngBounds();
        let found = false;

        dataLayer.forEach((feature) => {
          const iso2 = (feature.getProperty("ISO_A2") as string | undefined) ?? "";
          if (iso2 === countryCode) {
            found = true;
            feature.getGeometry()?.forEachLatLng((latLng) => countryBounds.extend(latLng));
          }
        });

        if (found) {
          // Ignore zoom changes during this transition
          ignoreZoomChangeRef.current = true;

          // Clear any pending zoom timeout
          if (pendingZoomTimeoutRef.current) {
            clearTimeout(pendingZoomTimeoutRef.current);
          }

          pendingZoomTimeoutRef.current = setTimeout(() => {
            // Check if we're still in country view (user might have clicked state already)
            if (drill !== "country") {
              console.log('Skipping country fitBounds - drill changed to', drill);
              return;
            }

            map.fitBounds(countryBounds, {
              top: 100,
              bottom: 80,
              left: 40,
              right: 500, // Add padding for discussion panel on the right
            });

            // Re-enable zoom listener and end transition after completes
            setTimeout(() => {
              ignoreZoomChangeRef.current = false;
              setIsTransitioning(false);
            }, 1000);
          }, 50);
        } else {
          // Fallback: zoom to marker position
          map.setCenter({ lat: country.lat, lng: country.lng });
          map.setZoom(6);

          // End transition after a short delay
          setTimeout(() => {
            setIsTransitioning(false);
          }, 500);
        }
      } else {
        // No data layer, end transition immediately
        setTimeout(() => {
          setIsTransitioning(false);
        }, 500);
      }
    }
  }, [countryData, clearMarkers, fetchStateData, loadStateBoundaries, drill]);

  // IMPROVED: State marker click handler - extracted for reuse
  const handleStateMarkerClick = useCallback(async (
    state: { stateName: string; lat: number; lng: number; nonnaCount: number; nonnas: Nonna[] },
    stateName: string,
    country: { code: string; name: string },
    map: google.maps.Map,
    infoWindow: google.maps.InfoWindow
  ) => {
    infoWindow.close();

    console.log(`🖱️ Clicked state marker: ${stateName}`);

    try {
      // IMPORTANT: Cancel any pending country zoom timeout
      if (pendingZoomTimeoutRef.current) {
        console.log(`❌ Cancelling pending zoom timeout`);
        clearTimeout(pendingZoomTimeoutRef.current);
        pendingZoomTimeoutRef.current = null;
      }

      // Set selected state for persistent highlighting
      setSelectedState(stateName);

      setIsTransitioning(true);
      setDrill("state");

      // Prevent zoom listener from interfering
      ignoreZoomChangeRef.current = true;

      // IMPROVED: Use the stateLayer to highlight and zoom if available
      const stateLayer = stateLayerRef.current;
      if (stateLayer) {
        console.log(`Using state layer for highlight and zoom`);
        highlightState(stateLayer, stateName, true);

        // Small delay to ensure highlight renders
        await new Promise(resolve => setTimeout(resolve, 50));

        const zoomSuccess = zoomToState(map, stateLayer, stateName, { lat: state.lat, lng: state.lng });

        if (!zoomSuccess) {
          console.warn(`Zoom via layer failed, using fallback coordinates`);
          map.setCenter({ lat: state.lat, lng: state.lng });
          map.setZoom(9);
        }
      } else {
        // Fallback if no state layer
        console.log(`No state layer, using fallback zoom`);
        map.setCenter({ lat: state.lat, lng: state.lng });
        map.setZoom(9);
      }

      // Re-enable zoom listener and end transition after zoom completes
      setTimeout(() => {
        ignoreZoomChangeRef.current = false;
        setIsTransitioning(false);
      }, 1000);

      setPanel({
        open: true,
        region: stateName,
        regionDisplayName: `${country.name} • ${stateName}`,
        scope: 'state',
        nonnas: state.nonnas || [],
      });
    } catch (error) {
      console.error('Failed to navigate to state:', stateName, error);

      setPanel({
        open: true,
        region: stateName,
        regionDisplayName: `${country.name} • ${stateName}`,
        scope: 'state',
        nonnas: [],
      });

      setIsTransitioning(false);
    }
  }, [highlightState, zoomToState]);

  // Fallback: Create state markers from API data
  const createStateMarkersFromAPI = useCallback((map: google.maps.Map, country: { code: string; name: string }) => {
    clearMarkers();

    for (const state of stateData) {
      const stateName = state.stateName;
      const count = state.nonnaCount;

      // Skip states with 0 Nonnas - don't show empty markers
      if (count === 0) {
        continue;
      }

      const size = Math.min(56, Math.max(40, 32 + count * 4));

      const infoWindow = new google.maps.InfoWindow({
        content: `<div style="padding: 8px; font-family: Arial, sans-serif;">
          <strong style="font-size: 14px; color: ${MARKER_COLOR};">${stateName}</strong>
          <div style="font-size: 12px; color: #666; margin-top: 4px;">${count} Nonna${count !== 1 ? "s" : ""}</div>
          <div style="font-size: 11px; color: #999; margin-top: 2px;">Click to view discussions</div>
        </div>`,
        disableAutoPan: true,
      });

      const marker = new google.maps.Marker({
        map,
        position: { lat: state.lat, lng: state.lng },
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: size / 2,
          fillColor: MARKER_COLOR,
          fillOpacity: 0.6,
          strokeColor: '#ffffff',
          strokeOpacity: 0.9,
          strokeWeight: 2,
        },
        label: {
          text: count.toString(),
          color: "white",
          fontSize: "12px",
          fontWeight: "bold",
        },
        title: `${stateName}: ${count} nonna(s) - Click to view discussions`,
        zIndex: 100,
        clickable: true,
        optimized: false,
      });

      marker.addListener("mouseover", () => {
        infoWindow.open(map, marker);
        marker.setIcon({
          path: google.maps.SymbolPath.CIRCLE,
          scale: (size / 2) * 1.3,
          fillColor: MARKER_COLOR,
          fillOpacity: 0.8,
          strokeColor: "#ffffff",
          strokeOpacity: 1.0,
          strokeWeight: 3,
        });
        // Highlight the state boundary on the GeoJSON layer
        const stateLayer = stateLayerRef.current;
        if (stateLayer) {
          highlightState(stateLayer, stateName, true);
        }
      });

      marker.addListener("mouseout", () => {
        infoWindow.close();
        marker.setIcon({
          path: google.maps.SymbolPath.CIRCLE,
          scale: size / 2,
          fillColor: MARKER_COLOR,
          fillOpacity: 0.6,
          strokeColor: '#ffffff',
          strokeOpacity: 0.9,
          strokeWeight: 2,
        });
        // Reset state boundary style ONLY if this state is not currently selected
        const stateLayer = stateLayerRef.current;
        const isSelected = normalizeStateName(selectedState || '') === normalizeStateName(stateName);
        if (stateLayer && !isSelected) {
          highlightState(stateLayer, stateName, false);
        }
      });

      marker.addListener("click", () => {
        handleStateMarkerClick(state, stateName, country, map, infoWindow);
      });

      markersRef.current.push(marker);
    }
  }, [stateData, clearMarkers, handleStateMarkerClick, selectedState, highlightState, normalizeStateName]);

  // Create state markers from GeoJSON centroids (most accurate positioning)
  const createStateMarkersFromGeoJSON = useCallback((map: google.maps.Map, country: { code: string; name: string }) => {
    clearMarkers();

    const geojson = geojsonCacheRef.current[country.code];
    if (!geojson?.features) {
      console.warn('No GeoJSON available for markers, falling back to API data');
      // Fallback to API-based markers
      createStateMarkersFromAPI(map, country);
      return;
    }

    const currentStateData = stateDataRef.current;
    console.log(`Creating markers from ${geojson.features.length} GeoJSON features`);

    for (const feature of geojson.features) {
      const stateName = feature.properties?.name || feature.properties?.NAME || feature.properties?.NAME_1 || 'Unknown';

      // Calculate centroid from geometry
      const centroid = calculateCentroid(feature);
      if (!centroid) {
        console.warn(`Could not calculate centroid for ${stateName}`);
        continue;
      }

      // IMPROVED: Find matching state data using normalized names
      const normalizedStateName = normalizeStateName(String(stateName));
      const matchedState = currentStateData.find(s => {
        const normalizedApiName = normalizeStateName(s.stateName);
        return normalizedApiName === normalizedStateName ||
          normalizedApiName.includes(normalizedStateName) ||
          normalizedStateName.includes(normalizedApiName);
      });

      const count = matchedState?.nonnaCount || 0;

      // Skip states with 0 Nonnas - don't show empty markers
      if (count === 0) {
        continue;
      }

      // Determine size based on count
      const size = Math.min(56, Math.max(40, 32 + count * 4));

      // Info window for tooltips
      const infoWindow = new google.maps.InfoWindow({
        content: `<div style="padding: 8px; font-family: Arial, sans-serif;">
          <strong style="font-size: 14px; color: ${MARKER_COLOR};">${stateName}</strong>
          <div style="font-size: 12px; color: #666; margin-top: 4px;">${count} Nonna${count !== 1 ? "s" : ""}</div>
          <div style="font-size: 11px; color: #999; margin-top: 2px;">Click to view discussions</div>
        </div>`,
        disableAutoPan: true,
      });

      // Use regular Marker at GeoJSON centroid (most accurate!)
      const marker = new google.maps.Marker({
        map,
        position: centroid,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: size / 2,
          fillColor: MARKER_COLOR,
          fillOpacity: 0.6,
          strokeColor: '#ffffff',
          strokeOpacity: 0.9,
          strokeWeight: 2,
        },
        label: {
          text: count.toString(),
          color: "white",
          fontSize: "12px",
          fontWeight: "bold",
        },
        title: `${stateName}: ${count} nonna(s) - Click to view discussions`,
        zIndex: 100,
        clickable: true,
        optimized: false,
      });

      marker.addListener("mouseover", () => {
        infoWindow.open(map, marker);
        // Highlight the marker
        marker.setIcon({
          path: google.maps.SymbolPath.CIRCLE,
          scale: (size / 2) * 1.3,
          fillColor: MARKER_COLOR,
          fillOpacity: 0.8,
          strokeColor: "#ffffff",
          strokeOpacity: 1.0,
          strokeWeight: 3,
        });
        // Highlight the state boundary on the GeoJSON layer
        const stateLayer = stateLayerRef.current;
        if (stateLayer) {
          highlightState(stateLayer, String(stateName), true);
        }
      });

      marker.addListener("mouseout", () => {
        infoWindow.close();
        // Reset marker style
        marker.setIcon({
          path: google.maps.SymbolPath.CIRCLE,
          scale: size / 2,
          fillColor: MARKER_COLOR,
          fillOpacity: 0.6,
          strokeColor: '#ffffff',
          strokeOpacity: 0.9,
          strokeWeight: 2,
        });
        // Reset state boundary style ONLY if this state is not currently selected
        const stateLayer = stateLayerRef.current;
        const isSelected = normalizeStateName(selectedState || '') === normalizeStateName(String(stateName));
        if (stateLayer && !isSelected) {
          highlightState(stateLayer, String(stateName), false);
        }
      });

      // Create a state object for click handler
      const stateForClick = matchedState || {
        stateName: String(stateName),
        lat: centroid.lat,
        lng: centroid.lng,
        nonnaCount: 0,
        nonnas: []
      };

      marker.addListener("click", () => {
        handleStateMarkerClick(stateForClick, String(stateName), country, map, infoWindow);
      });

      markersRef.current.push(marker);
    }

    console.log(`✓ Created ${markersRef.current.length} state markers from GeoJSON centroids`);
  }, [clearMarkers, calculateCentroid, handleStateMarkerClick, createStateMarkersFromAPI, selectedState, highlightState, normalizeStateName]);

  // Main function to create state markers - uses GeoJSON centroids if available
  const createStateMarkers = useCallback((map: google.maps.Map, country: { code: string; name: string }) => {
    // Try GeoJSON-based markers first (most accurate)
    if (geojsonCacheRef.current[country.code]?.features?.length > 0) {
      createStateMarkersFromGeoJSON(map, country);
    } else {
      // Fallback to API-based markers
      createStateMarkersFromAPI(map, country);
    }
  }, [createStateMarkersFromGeoJSON, createStateMarkersFromAPI]);

  // Initialize map
  useEffect(() => {
    if (!active || !mapDivRef.current) return;

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.error("Missing NEXT_PUBLIC_GOOGLE_MAPS_API_KEY");
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const initMap = async () => {
      try {
        await loadGoogleMapsAPI(apiKey);

        if (cancelled || !mapDivRef.current) return;

        const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID;

        if (mapId) {
          console.log(`✓ Initializing map with Map ID: ${mapId}`);
        } else {
          console.warn('⚠ No Map ID found - Feature Layer will not work');
        }

        const map = new google.maps.Map(mapDivRef.current, {
          mapId: mapId || undefined,
          mapTypeId: 'roadmap', // Use roadmap to ensure boundaries are visible
          center: { lat: 0, lng: 0 },
          zoom: 2,
          minZoom: 2, // Minimum zoom level before returning to globe
          tilt: 0,
          heading: 0,
          streetViewControl: false,
          fullscreenControl: false,
          mapTypeControl: true, // Enable so user can switch if needed
          zoomControl: true, // Enable zoom controls
          scrollwheel: true, // Enable scroll wheel zoom
          disableDoubleClickZoom: false, // Enable double-click zoom
          clickableIcons: false,
          gestureHandling: "greedy", // Allow all gestures (pan, pinch zoom)
          keyboardShortcuts: true,
          draggable: true, // Enable drag/pan
          // Show natural map with all labels by default
        });

        mapRef.current = map;

        // Handle visibility change to fix rendering when tab becomes active
        const handleVisibilityChange = () => {
          if (document.visibilityState === "visible" && mapRef.current) {
            // Refresh the map when tab becomes visible
            google.maps.event.trigger(mapRef.current, "resize");
            // Re-center to fix any rendering artifacts
            const center = mapRef.current.getCenter();
            if (center) {
              mapRef.current.panTo(center);
            }
          }
        };
        document.addEventListener("visibilitychange", handleVisibilityChange);

        // Handle idle state to ensure proper rendering
        let idleTimeout: ReturnType<typeof setTimeout> | null = null;
        map.addListener("idle", () => {
          // Clear any pending timeout
          if (idleTimeout) clearTimeout(idleTimeout);
          // Debounce the resize trigger
          idleTimeout = setTimeout(() => {
            if (mapRef.current) {
              google.maps.event.trigger(mapRef.current, "resize");
            }
          }, 100);
        });

        // Store cleanup function
        cleanupRef.current = () => {
          document.removeEventListener("visibilitychange", handleVisibilityChange);
          if (idleTimeout) clearTimeout(idleTimeout);
        };

        // Zoom out listener - return to globe when zoomed out far enough
        map.addListener("zoom_changed", () => {
          // Only allow back-to-globe after initial map setup is complete
          // And ensure we're not programmatically moving the map
          if (!mapInitializedRef.current || ignoreZoomChangeRef.current) return;

          const currentZoom = map.getZoom();
          if (currentZoom !== undefined && currentZoom <= 2) {
            // User zoomed out completely - return to globe
            cleanupRef.current?.();
            clearMarkers();
            mapRef.current = null;
            dataLayerRef.current = null;
            continentBoundsRef.current = null;
            setDrill("continent");
            setSelectedCountry(null);
            setStateData([]);
            onBackToGlobe();
          }
        });

        const dataLayer = new google.maps.Data({ map });
        dataLayerRef.current = dataLayer;

        const response = await fetch("/geo/ne_admin0_countries.geojson");
        const fc = await response.json() as Admin0FC;

        if (cancelled) return;

        dataLayer.addGeoJson(fc as unknown as GeoJSON.FeatureCollection);

        // Helper to check if a feature belongs to this region/continent
        const isFeatureInRegion = (feature: google.maps.Data.Feature): boolean => {
          const cont = (feature.getProperty("CONTINENT") as string | undefined) ?? "";
          const countryName = (feature.getProperty("ADMIN") as string | undefined) ??
            (feature.getProperty("NAME") as string | undefined) ?? "";

          // Russia is transcontinental - always exclude from other regions
          const isRussia = countryName === "Russia" || countryName === "Russian Federation";

          // Special case: Russia is its own transcontinental region
          if (selectedContinent === "Russia") {
            return isRussia;
          }

          // Exclude Russia from all other regions (Europe, Asia, etc.)
          if (isRussia) {
            return false;
          }

          // If it's a sub-region, check if the country is in that region
          if (regionCountries) {
            return cont === parentContinent && regionCountries.includes(countryName);
          }

          // Otherwise, just check the continent (this handles French Guiana automatically)
          return cont === selectedContinent;
        };

        // Calculate bounds from actual region features
        const continentBounds = new google.maps.LatLngBounds();
        let hasFeatures = false;

        dataLayer.forEach((feature) => {
          if (isFeatureInRegion(feature)) {
            hasFeatures = true;
            feature.getGeometry()?.forEachLatLng((latLng) => {
              continentBounds.extend(latLng);
            });
          }
        });

        continentBoundsRef.current = continentBounds;

        // Style countries - dim non-region, show natural colors for selected
        dataLayer.setStyle((feature) => {
          const isInRegion = isFeatureInRegion(feature);

          if (!isInRegion) {
            // Dim out-of-region countries with gray overlay
            return {
              visible: true,
              fillColor: "#808080",
              fillOpacity: 0.6,
              strokeColor: "#999999",
              strokeOpacity: 0.3,
              strokeWeight: 0.5,
              clickable: false,
              cursor: "default",
            };
          }

          // In-region countries - completely transparent to show natural map colors
          return {
            visible: true,
            fillColor: "transparent",
            fillOpacity: 0,
            strokeColor: "#555555", // Subtle gray border
            strokeOpacity: 0.5,
            strokeWeight: 1,
            clickable: true,
            cursor: "pointer",
          };
        });

        // Country click handler
        dataLayer.addListener("click", async (e: google.maps.Data.MouseEvent) => {
          if (!isFeatureInRegion(e.feature)) return;

          const iso2 = (e.feature.getProperty("ISO_A2") as string | undefined) ?? "";
          const countryName = (e.feature.getProperty("ADMIN") as string | undefined) ??
            (e.feature.getProperty("NAME") as string | undefined) ?? "";

          if (!iso2 || !countryName) return;

          setSelectedCountry({ code: iso2, name: countryName });
          setIsTransitioning(true);
          setDrill("country");

          // Load state boundaries GeoJSON
          loadStateBoundaries(map, iso2, countryName);

          // Fetch state data for the country
          try {
            const data = await fetchStateData(iso2, countryName);

            // Aggregate all nonnas for the country level view
            const allNonnas = data?.states.flatMap(s => s.nonnas) || [];

            // Open panel for country level discussion immediately
            setPanel({
              open: true,
              region: iso2, // Use country code or name as region identifier for threads
              regionDisplayName: countryName,
              scope: 'country',
              nonnas: allNonnas,
            });
          } catch (error) {
            console.error('Failed to fetch state data for', countryName, error);

            // Still open panel even if state data fails - show country-level discussion
            setPanel({
              open: true,
              region: iso2,
              regionDisplayName: countryName,
              scope: 'country',
              nonnas: [], // Empty nonnas array if data fetch fails
            });
          }

          // Fit bounds to country with padding
          const countryBounds = new google.maps.LatLngBounds();
          e.feature.getGeometry()?.forEachLatLng((latLng) => countryBounds.extend(latLng));

          // Ignore zoom changes during this transition
          ignoreZoomChangeRef.current = true;

          // Clear any pending zoom timeout
          if (pendingZoomTimeoutRef.current) {
            clearTimeout(pendingZoomTimeoutRef.current);
          }

          pendingZoomTimeoutRef.current = setTimeout(() => {
            map.fitBounds(countryBounds, {
              top: 100,
              bottom: 80,
              left: 40,
              right: 500, // Add padding for discussion panel
            });

            // Re-enable zoom listener after transition completes
            setTimeout(() => {
              ignoreZoomChangeRef.current = false;
              setIsTransitioning(false);
            }, 1000);
          }, 50);
        });

        // Hover effects
        dataLayer.addListener("mouseover", (e: google.maps.Data.MouseEvent) => {
          if (!isFeatureInRegion(e.feature)) return;

          dataLayer.overrideStyle(e.feature, {
            fillOpacity: 0.7,
            strokeWeight: 2.5,
          });
        });

        dataLayer.addListener("mouseout", (e: google.maps.Data.MouseEvent) => {
          dataLayer.revertStyle(e.feature);
        });

        // Check if we have initial country from URL params
        const urlCountryCode = searchParams.get("country");
        const urlCountryName = searchParams.get("countryName");
        const urlStateName = searchParams.get("state");
        const hasInitialCountry = urlCountryCode && urlCountryName;
        const hasInitialState = hasInitialCountry && urlStateName;

        if (hasInitialState) {
          console.log(`🎯 Initializing with state view: ${urlStateName}`);

          // Load state boundaries and zoom to the specific state
          const success = await loadStateBoundaries(
            map,
            urlCountryCode,
            urlCountryName,
            urlStateName // Pass target state name
          );

          if (success) {
            console.log(`✓ Successfully loaded and zoomed to ${urlStateName}`);
          } else {
            console.warn(`⚠️ Failed to zoom to ${urlStateName}, using fallback`);
            // Fallback: just zoom to country
            let countryBounds: google.maps.LatLngBounds | null = null;
            dataLayer.forEach((feature) => {
              const iso2 = (feature.getProperty("ISO_A2") as string | undefined) ?? "";
              if (iso2 === urlCountryCode) {
                countryBounds = new google.maps.LatLngBounds();
                feature.getGeometry()?.forEachLatLng((latLng) => countryBounds!.extend(latLng));
              }
            });

            if (countryBounds) {
              map.fitBounds(countryBounds, {
                top: 100,
                bottom: 80,
                left: 40,
                right: 500, // Add padding for discussion panel
              });
            }
          }

          // Mark map as initialized after initial zoom
          setTimeout(() => {
            mapInitializedRef.current = true;
          }, 500);

        } else if (hasInitialCountry) {
          console.log(`🗺️ Initializing with country view: ${urlCountryName}`);

          // Find country bounds and zoom to it
          let countryBounds: google.maps.LatLngBounds | null = null;
          dataLayer.forEach((feature) => {
            const iso2 = (feature.getProperty("ISO_A2") as string | undefined) ?? "";
            if (iso2 === urlCountryCode) {
              countryBounds = new google.maps.LatLngBounds();
              feature.getGeometry()?.forEachLatLng((latLng) => countryBounds!.extend(latLng));
            }
          });

          if (countryBounds) {
            setTimeout(() => {
              map.fitBounds(countryBounds!, {
                top: 100,
                bottom: 80,
                left: 40,
                right: 40,
              });

              // Mark map as initialized after bounds are fitted (allow zoom listener to work)
              setTimeout(() => {
                mapInitializedRef.current = true;
              }, 500);
            }, 100);
          } else {
            // Country bounds not found, still mark as initialized
            setTimeout(() => {
              mapInitializedRef.current = true;
            }, 500);
          }
        } else {
          // Fit to continent bounds with padding
          if (hasFeatures) {
            setTimeout(() => {
              map.fitBounds(continentBounds, {
                top: 100,
                bottom: 80,
                left: 40,
                right: 500, // Add padding for discussion panel
              });

              // Mark map as initialized after bounds are fitted (allow zoom listener to work)
              setTimeout(() => {
                mapInitializedRef.current = true;
              }, 500);
            }, 100);
          } else {
            // No features found, but still mark as initialized
            setTimeout(() => {
              mapInitializedRef.current = true;
            }, 500);
          }
        }

        setMapReady(true);
        setIsLoading(false);
      } catch (err) {
        console.error("Failed to initialize map:", err);
        setIsLoading(false);
      }
    };

    initMap();

    return () => {
      cancelled = true;
      cleanupRef.current?.();
      clearMarkers();
      mapRef.current = null;
      dataLayerRef.current = null;
      continentBoundsRef.current = null;
      mapInitializedRef.current = false; // Reset for next map load
    };
  }, [active, selectedContinent, parentContinent, regionCountries, theme, clearMarkers, searchParams, fetchStateData, loadStateBoundaries, onBackToGlobe]);

  // State boundaries are now handled by the GeoJSON layer (loadStateBoundaries function)
  // No Feature Layer needed - it requires special Google Cloud Console configuration

  // Update markers when drill level or data changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    if (drill === "continent" && countryData.length > 0) {
      createCountryMarkers(map);
    } else if (drill === "country" && selectedCountry && (stateData.length > 0 || geojsonLoaded === selectedCountry.code)) {
      // Create markers when either stateData is available OR GeoJSON is loaded
      createStateMarkers(map, selectedCountry);
    }
  }, [drill, selectedCountry, mapReady, countryData, stateData, geojsonLoaded, createCountryMarkers, createStateMarkers, theme]);

  // Update data layer style and map labels when selection changes
  useEffect(() => {
    const dataLayer = dataLayerRef.current;
    const map = mapRef.current;
    if (!dataLayer || !map || !mapReady) return;

    // Update map styles based on drill level
    // Note: State boundaries are handled by GeoJSON layer (loadStateBoundaries)
    if (drill === "country" && selectedCountry) {
      // Clean map style for country view - GeoJSON layer handles boundaries
      map.setOptions({
        styles: [
          {
            featureType: "administrative.country",
            elementType: "labels",
            stylers: [{ visibility: "off" }],
          },
        ],
      });
    } else if (drill === "continent") {
      // Reset to default when going back to continent
      map.setOptions({ styles: [] });
    } else if (drill === "state") {
      // Enhanced boundaries for state view
      map.setOptions({
        styles: [
          {
            featureType: "administrative.country",
            elementType: "labels",
            stylers: [{ visibility: "off" }],
          },
          {
            featureType: "administrative.province", // States/provinces
            elementType: "geometry.stroke",
            stylers: [
              { visibility: "on" },
              { color: MARKER_COLOR },
              { weight: 4 }, // Thicker for selected state
              { gamma: 1.2 }
            ],
          },
          {
            featureType: "administrative.locality", // Cities
            elementType: "geometry.stroke",
            stylers: [
              { visibility: "on" },
              { color: "#666666" },
              { weight: 1 }
            ],
          },
        ],
      });
    } else {
      // Reset to default styles for continent view
      map.setOptions({ styles: [] });
    }

    // Force map refresh to prevent ghost overlays
    setTimeout(() => {
      google.maps.event.trigger(map, "resize");
      const bounds = continentBoundsRef.current;
      if (bounds && !bounds.isEmpty()) {
        map.fitBounds(bounds);
      }
    }, 50);

    dataLayer.setStyle((feature) => {
      const cont = (feature.getProperty("CONTINENT") as string | undefined) ?? "";
      const countryName = (feature.getProperty("ADMIN") as string | undefined) ??
        (feature.getProperty("NAME") as string | undefined) ?? "";
      const iso2 = (feature.getProperty("ISO_A2") as string | undefined) ?? "";

      // Check if feature belongs to this region
      let isInRegion = false;

      // Russia is transcontinental - always exclude from other regions
      const isRussia = countryName === "Russia" || countryName === "Russian Federation";

      // Special case: Russia is its own transcontinental region
      if (selectedContinent === "Russia") {
        isInRegion = isRussia;
      } else if (isRussia) {
        // Exclude Russia from all other regions
        isInRegion = false;
      } else if (regionCountries) {
        isInRegion = cont === parentContinent && regionCountries.includes(countryName);
      } else {
        isInRegion = cont === selectedContinent;
      }

      const isSelected = drill === "country" && selectedCountry?.code === iso2;

      if (!isInRegion) {
        // Dim out-of-region countries with gray overlay
        return {
          visible: true,
          fillColor: "#808080",
          fillOpacity: 0.6,
          strokeColor: "#999999",
          strokeOpacity: 0.3,
          strokeWeight: 0.5,
          clickable: false,
          cursor: "default",
        };
      }

      // In-region: transparent to show natural map colors, subtle border
      return {
        visible: true,
        fillColor: "transparent",
        fillOpacity: 0,
        strokeColor: "#555555",
        strokeOpacity: isSelected ? 0.7 : 0.5,
        strokeWeight: isSelected ? 1.5 : 1,
        clickable: !isSelected,
        cursor: isSelected ? "default" : "pointer",
      };
    });
  }, [drill, selectedCountry, selectedContinent, parentContinent, regionCountries, mapReady]);

  // Back button handler
  const handleBack = () => {
    if (drill === "state") {
      setIsTransitioning(true);

      // Clear current markers before switching to country view
      clearMarkers();

      // IMPROVED: Clear selected state and unhighlight
      if (selectedState) {
        const stateLayer = stateLayerRef.current;
        if (stateLayer) {
          highlightState(stateLayer, selectedState, false);
        }
      }
      setSelectedState(null);

      setDrill("country");

      // Zoom back to country
      const map = mapRef.current;
      const dataLayer = dataLayerRef.current;

      if (map && dataLayer && selectedCountry) {
        const countryBounds = new google.maps.LatLngBounds();
        let found = false;

        dataLayer.forEach((feature) => {
          const iso2 = (feature.getProperty("ISO_A2") as string | undefined) ?? "";
          if (iso2 === selectedCountry.code) {
            found = true;
            feature.getGeometry()?.forEachLatLng((latLng) => countryBounds.extend(latLng));
          }
        });

        if (found) {
          setTimeout(() => {
            map.fitBounds(countryBounds, {
              top: 100,
              bottom: 80,
              left: 40,
              right: 40,
            });

            // End transition after bounds are fitted
            setTimeout(() => {
              setIsTransitioning(false);
            }, 800);
          }, 50);
        } else {
          // Fallback
          map.setZoom(5);
        }

        // Recreate state markers after clearing
        setTimeout(() => {
          if (stateData.length > 0) {
            createStateMarkers(map, selectedCountry);
          }
        }, 100);

        // Ensure panel is open for country
        const allNonnas = stateData.flatMap(s => s.nonnas);
        setPanel({
          open: true,
          region: selectedCountry.code,
          regionDisplayName: selectedCountry.name,
          scope: 'country',
          nonnas: allNonnas,
        });
      }
      return;
    }

    if (drill === "country") {
      setIsTransitioning(true);

      // Clear all state markers and state boundary layer
      clearMarkers();
      clearStateLayer();

      setDrill("continent");
      setSelectedCountry(null);
      setStateData([]);
      setSelectedState(null);

      // Close panel when returning to continent view
      setPanel({
        open: false,
        region: "",
        regionDisplayName: "",
        scope: "country",
        nonnas: [],
      });

      const map = mapRef.current;
      const bounds = continentBoundsRef.current;

      if (map && bounds) {
        // Ignore zoom changes during this transition to prevent accidental back-to-globe
        ignoreZoomChangeRef.current = true;

        setTimeout(() => {
          map.fitBounds(bounds, {
            top: 100,
            bottom: 80,
            left: 40,
            right: 40,
          });

          // Re-enable zoom listener after transition completes
          setTimeout(() => {
            ignoreZoomChangeRef.current = false;
            setIsTransitioning(false);
          }, 1000);
        }, 50);
      }

      // Recreate country markers after clearing state markers
      if (map && countryData.length > 0) {
        setTimeout(() => {
          createCountryMarkers(map);
        }, 100); // Small delay to ensure state is updated
      }
      return;
    }

    // Fallback: continent → globe
    clearMarkers();
    mapRef.current = null;
    dataLayerRef.current = null;
    continentBoundsRef.current = null;
    setDrill("continent");
    setSelectedCountry(null);
    setStateData([]);
    setSelectedState(null);
    onBackToGlobe();
  };

  const viewLabel = (() => {
    if (drill === "continent") return `${selectedContinent} • Countries`;
    if (drill === "country") return `${selectedCountry?.name || ""} • Regions`;
    if (drill === "state") return `${panel.regionDisplayName}`;
    return "";
  })();

  const backButtonLabel = (() => {
    if (drill === "state") return "Back to Country";
    if (drill === "country") return `Back to ${selectedContinent}`;
    return "Back to Globe";
  })();

  return (
    <div className="relative w-full h-full" style={{ backgroundColor: '#f5f5f5' }}>
      {/* Top bar - amber theme matching markers */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-3">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium shadow-lg transition-all hover:scale-105 border border-white/20"
          style={{ backgroundColor: MARKER_COLOR }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          {backButtonLabel}
        </button>

        <div className="bg-black/70 backdrop-blur-sm rounded-lg px-4 py-2 shadow-lg border border-white/10">
          <div className="text-xs text-gray-400 uppercase tracking-wide">Viewing</div>
          <div className="font-semibold text-white">{viewLabel}</div>
        </div>
      </div>

      {/* Loading overlay */}
      {(isLoading || isTransitioning) && (
        <div className="absolute inset-0 z-20 bg-black/80 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div
              className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: `${MARKER_COLOR} transparent transparent transparent` }}
            />
            <span className="text-gray-300">
              {isLoading ? "Loading map..." :
                drill === "state" ? "Loading state view..." :
                  drill === "country" ? "Loading country view..." :
                    "Loading continent view..."}
            </span>
          </div>
        </div>
      )}

      {/* Map container */}
      <div ref={mapDivRef} className="w-full h-full" />

      {/* Legend - amber theme matching markers */}
      <div className="absolute bottom-4 right-4 z-10 bg-black/70 backdrop-blur-sm rounded-lg p-3 shadow-lg border border-white/10">
        <div className="text-xs font-semibold text-gray-400 mb-2">LEGEND</div>
        <div className="flex items-center gap-2 mb-1">
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
            style={{ backgroundColor: MARKER_COLOR }}
          >
            N
          </div>
          <span className="text-sm text-gray-300">Click cluster to view Nonnas</span>
        </div>
        <div className="flex items-center gap-2 mb-1">
          <div
            className="w-6 h-6 rounded border-2 bg-transparent"
            style={{ borderColor: "#444444" }}
          />
          <span className="text-sm text-gray-300">
            {drill === "continent" ? "Click country to drill down" :
              drill === "country" ? "Click state/region to drill down" :
                "Click to view discussions"}
          </span>
        </div>
        {drill !== "continent" && (
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded border-2"
              style={{ borderColor: MARKER_COLOR, backgroundColor: `${MARKER_COLOR}20` }}
            />
            <span className="text-sm text-gray-300">
              {drill === "country" ? "State/region boundaries" : "Selected region"}
            </span>
          </div>
        )}
      </div>

      {/* Discussion Panel */}
      <DiscussionPanel
        isOpen={panel.open}
        onClose={() => setPanel({ ...panel, open: false })}
        region={panel.region}
        regionDisplayName={panel.regionDisplayName}
        scope={panel.scope}
        nonnas={panel.nonnas}
      />
    </div>
  );
}