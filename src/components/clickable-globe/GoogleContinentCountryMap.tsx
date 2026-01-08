"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import type { Nonna, GlobeApiResponse, CountryApiResponse } from "./sharedTypes";
import NonnaModal from "./NonnaModal";

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

type Drill = "continent" | "country";

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
  const markersRef = useRef<google.maps.Marker[]>([]);
  const continentBoundsRef = useRef<google.maps.LatLngBounds | null>(null);
  const initialCountrySetRef = useRef(false);
  const cleanupRef = useRef<(() => void) | null>(null);

  const [drill, setDrill] = useState<Drill>("continent");
  const [selectedCountry, setSelectedCountry] = useState<{ code: string; name: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [modal, setModal] = useState<{ open: boolean; title: string; nonnas: Nonna[] }>({
    open: false,
    title: "",
    nonnas: [],
  });

  // API data state
  const [countryData, setCountryData] = useState<CountryData[]>([]);
  const [stateData, setStateData] = useState<StateData[]>([]);

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
      }
    } catch (error) {
      console.error("Error fetching state data:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Check URL for country parameter (for testing)
  useEffect(() => {
    if (initialCountrySetRef.current) return;
    const countryCode = searchParams.get("country");
    const countryName = searchParams.get("countryName");
    if (countryCode && countryName) {
      initialCountrySetRef.current = true;
      setSelectedCountry({ code: countryCode, name: countryName });
      setDrill("country");
      fetchStateData(countryCode, countryName);
    }
  }, [searchParams, fetchStateData]);

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

  // Create country markers from API data - with click handlers to drill down
  const createCountryMarkers = useCallback((map: google.maps.Map) => {
    clearMarkers();

    for (const country of countryData) {
      if (country.nonnaCount === 0) continue;

      const size = Math.min(50, Math.max(32, 24 + country.nonnaCount * 2));
      
      // Create SVG marker with consistent amber color
      const svgMarker = `
        <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
          <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 2}" 
                  fill="${MARKER_COLOR}" stroke="#ffffff" stroke-width="3"/>
          <text x="${size/2}" y="${size/2 + 5}" 
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
        zIndex: 10000, // Very high z-index to ensure it's on top
        clickable: true,
        optimized: false, // Force DOM rendering for reliable click handling
      });

      // Add click handler to drill down to country
      marker.addListener("click", async () => {
        setSelectedCountry({ code: country.countryCode, name: country.countryName });
        setDrill("country");
        
        // Fetch state data for the country
        await fetchStateData(country.countryCode, country.countryName);

        // Find the country bounds from the data layer and zoom to it
        const dataLayer = dataLayerRef.current;
        if (dataLayer) {
          const countryBounds = new google.maps.LatLngBounds();
          let found = false;
          
          dataLayer.forEach((feature) => {
            const iso2 = (feature.getProperty("ISO_A2") as string | undefined) ?? "";
            if (iso2 === country.countryCode) {
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
            }, 50);
          } else {
            // Fallback: zoom to marker position
            map.setCenter({ lat: country.lat, lng: country.lng });
            map.setZoom(6);
          }
        }
      });

      markersRef.current.push(marker);
    }
  }, [countryData, clearMarkers, fetchStateData]);

  // Create state markers from API data - consistent amber color
  const createStateMarkers = useCallback((map: google.maps.Map, country: { code: string; name: string }) => {
    clearMarkers();

    for (const state of stateData) {
      if (state.nonnaCount === 0) continue;

      const stateName = state.stateName;
      const count = state.nonnaCount;
      
      // Consistent amber marker
      const size = Math.min(48, Math.max(36, 28 + count * 3));
      
      const marker = new google.maps.Marker({
        map,
        position: { lat: state.lat, lng: state.lng },
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: size / 2,
          fillColor: "#fbbf24", // Light amber for state markers
          fillOpacity: 0.95,
          strokeColor: MARKER_COLOR, // Dark amber border
          strokeOpacity: 1,
          strokeWeight: 3,
        },
        label: {
          text: String(count),
          color: "#000000",
          fontSize: count > 99 ? "10px" : "13px",
          fontWeight: "800",
        },
        title: `${stateName}: ${count} nonna(s) - Click to view`,
        zIndex: count + 1000,
        clickable: true,
      });

      // Info window that shows on hover for state name
      const infoWindow = new google.maps.InfoWindow({
        content: `<div style="padding: 8px; font-family: Arial, sans-serif;">
          <strong style="font-size: 14px; color: ${MARKER_COLOR};">${stateName}</strong>
          <div style="font-size: 12px; color: #666; margin-top: 4px;">${count} Nonna${count > 1 ? "s" : ""}</div>
        </div>`,
        disableAutoPan: true,
      });

      marker.addListener("mouseover", () => {
        infoWindow.open(map, marker);
      });

      marker.addListener("mouseout", () => {
        infoWindow.close();
      });

      marker.addListener("click", () => {
        infoWindow.close();
        setModal({
          open: true,
          title: `${country.name} • ${stateName} • ${count} Nonna(s)`,
          nonnas: state.nonnas,
        });
      });

      markersRef.current.push(marker);
    }
  }, [stateData, clearMarkers]);

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

        const map = new google.maps.Map(mapDivRef.current, {
          mapId: mapId || undefined,
          center: { lat: 0, lng: 0 },
          zoom: 2,
          minZoom: 2, // Minimum zoom level before returning to globe
          tilt: 0,
          heading: 0,
          streetViewControl: false,
          fullscreenControl: false,
          mapTypeControl: false,
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
          
          // Otherwise, just check the continent
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
          setDrill("country");

          // Fetch state data for the country
          await fetchStateData(iso2, countryName);

          // Fit bounds to country with padding
          const countryBounds = new google.maps.LatLngBounds();
          e.feature.getGeometry()?.forEachLatLng((latLng) => countryBounds.extend(latLng));
          
          setTimeout(() => {
            map.fitBounds(countryBounds, {
              top: 100,
              bottom: 80,
              left: 40,
              right: 40,
            });
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
        const hasInitialCountry = urlCountryCode && urlCountryName;

        if (hasInitialCountry) {
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
            }, 100);
          }
        } else {
          // Fit to continent bounds with padding
          if (hasFeatures) {
            setTimeout(() => {
              map.fitBounds(continentBounds, {
                top: 100,
                bottom: 80,
                left: 40,
                right: 40,
              });
            }, 100);
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
    };
  }, [active, selectedContinent, parentContinent, regionCountries, theme, clearMarkers, searchParams, fetchStateData]);

  // Update markers when drill level or data changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    if (drill === "continent" && countryData.length > 0) {
      createCountryMarkers(map);
    } else if (drill === "country" && selectedCountry && stateData.length > 0) {
      createStateMarkers(map, selectedCountry);
    }
  }, [drill, selectedCountry, mapReady, countryData, stateData, createCountryMarkers, createStateMarkers, theme]);

  // Update data layer style and map labels when selection changes
  useEffect(() => {
    const dataLayer = dataLayerRef.current;
    const map = mapRef.current;
    if (!dataLayer || !map || !mapReady) return;

    // Update map styles to hide country labels when a country is selected
    if (drill === "country" && selectedCountry) {
      // Hide country labels but keep state/city/locality labels visible
      map.setOptions({
        styles: [
          {
            featureType: "administrative.country",
            elementType: "labels",
            stylers: [{ visibility: "off" }],
          },
          {
            featureType: "administrative.province", // States/provinces
            elementType: "labels",
            stylers: [{ visibility: "on" }],
          },
          {
            featureType: "administrative.locality", // Cities
            elementType: "labels",
            stylers: [{ visibility: "on" }],
          },
        ],
      });
    } else {
      // Show all labels when viewing continent/region level
      map.setOptions({
        styles: [],
      });
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
  const handleBack = useCallback(() => {
    if (drill === "country") {
      setDrill("continent");
      setSelectedCountry(null);
      setStateData([]);

      const map = mapRef.current;
      const bounds = continentBoundsRef.current;
      
      if (map && bounds) {
        setTimeout(() => {
          map.fitBounds(bounds, {
            top: 100,
            bottom: 80,
            left: 40,
            right: 40,
          });
        }, 50);
      }

      if (map && countryData.length > 0) {
        createCountryMarkers(map);
      }
      return;
    }

    clearMarkers();
    mapRef.current = null;
    dataLayerRef.current = null;
    continentBoundsRef.current = null;
    setDrill("continent");
    setSelectedCountry(null);
    setStateData([]);
    onBackToGlobe();
  }, [drill, clearMarkers, onBackToGlobe, countryData, createCountryMarkers, theme]);

  const viewLabel = drill === "continent"
    ? `${selectedContinent} • Countries`
    : `${selectedCountry?.name || ""} • Regions`;

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
          {drill === "country" ? "Back to Countries" : "Back to Globe"}
        </button>

        <div className="bg-black/70 backdrop-blur-sm rounded-lg px-4 py-2 shadow-lg border border-white/10">
          <div className="text-xs text-gray-400 uppercase tracking-wide">Viewing</div>
          <div className="font-semibold text-white">{viewLabel}</div>
        </div>
      </div>

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-20 bg-black/80 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div 
              className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: `${MARKER_COLOR} transparent transparent transparent` }}
            />
            <span className="text-gray-300">Loading map...</span>
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
        <div className="flex items-center gap-2">
          <div 
            className="w-6 h-6 rounded border-2 bg-transparent"
            style={{ borderColor: "#444444" }}
          />
          <span className="text-sm text-gray-300">Click country to drill down</span>
        </div>
      </div>

      {/* Modal */}
      <NonnaModal
        open={modal.open}
        title={modal.title}
        nonnas={modal.nonnas}
        onClose={() => setModal({ open: false, title: "", nonnas: [] })}
        themeColor={MARKER_COLOR}
      />
    </div>
  );
}
