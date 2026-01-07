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

type Admin0FC = GeoJSON.FeatureCollection<GeoJSON.Geometry, Admin0FeatureProps>;

type Drill = "continent" | "country";

// Region theme colors (includes Asia sub-regions)
const REGION_THEMES: Record<string, { primary: string; secondary: string; highlight: string }> = {
  // Africa
  Africa: { primary: "#22c55e", secondary: "#dcfce7", highlight: "#4ade80" },
  
  // Asia sub-regions
  "Middle East": { primary: "#f59e0b", secondary: "#fef3c7", highlight: "#fbbf24" },
  "South Asia": { primary: "#f97316", secondary: "#ffedd5", highlight: "#fb923c" },
  "East Asia": { primary: "#eab308", secondary: "#fef9c3", highlight: "#facc15" },
  "Southeast Asia": { primary: "#10b981", secondary: "#d1fae5", highlight: "#34d399" },
  "Central Asia": { primary: "#ca8a04", secondary: "#fef9c3", highlight: "#eab308" },
  Asia: { primary: "#eab308", secondary: "#fef9c3", highlight: "#facc15" }, // Fallback
  
  // Europe
  Europe: { primary: "#3b82f6", secondary: "#dbeafe", highlight: "#60a5fa" },
  
  // Americas
  "North America": { primary: "#ef4444", secondary: "#fee2e2", highlight: "#f87171" },
  "South America": { primary: "#a855f7", secondary: "#f3e8ff", highlight: "#c084fc" },
  
  // Oceania & Pacific
  Oceania: { primary: "#ec4899", secondary: "#fce7f3", highlight: "#f472b6" },
  "Pacific Islands": { primary: "#06b6d4", secondary: "#cffafe", highlight: "#22d3ee" },
  
  // Antarctica
  Antarctica: { primary: "#64748b", secondary: "#f1f5f9", highlight: "#94a3b8" },
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
    "Bahrain", "Cyprus", "Palestine",
  ],
  "South Asia": [
    "India", "Pakistan", "Bangladesh", "Sri Lanka", "Nepal", "Bhutan",
    "Maldives", "Afghanistan",
  ],
  "East Asia": [
    "China", "Japan", "South Korea", "North Korea", "Taiwan", "Mongolia",
  ],
  "Southeast Asia": [
    "Thailand", "Vietnam", "Indonesia", "Philippines", "Malaysia", "Singapore",
    "Myanmar", "Cambodia", "Laos", "Brunei", "Timor-Leste",
  ],
  "Central Asia": [
    "Kazakhstan", "Uzbekistan", "Turkmenistan", "Kyrgyzstan", "Tajikistan",
  ],
  "Pacific Islands": [
    "Fiji", "Papua New Guinea", "Solomon Islands", "Vanuatu", "New Caledonia",
    "Samoa", "Tonga", "Micronesia", "Marshall Islands", "Palau", "Kiribati",
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

  // Create country markers from API data
  const createCountryMarkers = useCallback((map: google.maps.Map, themeColors: typeof theme) => {
    clearMarkers();

    for (const country of countryData) {
      if (country.nonnaCount === 0) continue;

      const size = Math.min(50, Math.max(32, 24 + country.nonnaCount * 2));
      
      const marker = new google.maps.Marker({
        map,
        position: { lat: country.lat, lng: country.lng },
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: size / 2,
          fillColor: themeColors.primary,
          fillOpacity: 0.95,
          strokeColor: "#ffffff",
          strokeOpacity: 1,
          strokeWeight: 3,
        },
        label: {
          text: String(country.nonnaCount),
          color: "#ffffff",
          fontSize: country.nonnaCount > 99 ? "11px" : "14px",
          fontWeight: "700",
        },
        title: `${country.countryName}: ${country.nonnaCount} nonna(s) - Click country to see regions`,
        zIndex: country.nonnaCount,
      });

      markersRef.current.push(marker);
    }
  }, [countryData, clearMarkers]);

  // Create state markers from API data
  const createStateMarkers = useCallback((map: google.maps.Map, country: { code: string; name: string }, themeColors: typeof theme) => {
    clearMarkers();

    for (const state of stateData) {
      if (state.nonnaCount === 0) continue;

      const stateName = state.stateName;
      const count = state.nonnaCount;
      const textWidth = Math.max(80, stateName.length * 8 + 30);
      const iconHeight = 50;
      
      // Create marker SVG with name and count badge
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="${textWidth}" height="${iconHeight}" viewBox="0 0 ${textWidth} ${iconHeight}">
          <defs>
            <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="1" dy="2" stdDeviation="2" flood-opacity="0.3"/>
            </filter>
          </defs>
          <!-- Background pill -->
          <rect x="2" y="8" width="${textWidth - 4}" height="34" rx="17" ry="17" 
                fill="${themeColors.primary}" filter="url(#shadow)"/>
          <!-- State name -->
          <text x="${textWidth / 2}" y="30" 
                font-family="Arial, sans-serif" font-size="12" font-weight="bold" 
                fill="white" text-anchor="middle">${stateName}</text>
          <!-- Count badge -->
          <circle cx="${textWidth - 14}" cy="12" r="12" fill="#ffffff" stroke="${themeColors.primary}" stroke-width="2"/>
          <text x="${textWidth - 14}" y="16" 
                font-family="Arial, sans-serif" font-size="${count > 99 ? '8' : '10'}" font-weight="bold" 
                fill="${themeColors.primary}" text-anchor="middle">${count}</text>
        </svg>
      `;
      
      const encodedSvg = encodeURIComponent(svg);
      
      const marker = new google.maps.Marker({
        map,
        position: { lat: state.lat, lng: state.lng },
        icon: {
          url: `data:image/svg+xml,${encodedSvg}`,
          scaledSize: new google.maps.Size(textWidth, iconHeight),
          anchor: new google.maps.Point(textWidth / 2, iconHeight / 2),
        },
        title: `${state.stateName}: ${state.nonnaCount} nonna(s)`,
        zIndex: state.nonnaCount + 100,
      });

      marker.addListener("click", () => {
        setModal({
          open: true,
          title: `${country.name} • ${state.stateName} • ${state.nonnaCount} Nonna(s)`,
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
          tilt: 0,
          heading: 0,
          streetViewControl: false,
          fullscreenControl: false,
          mapTypeControl: false,
          zoomControl: false,
          scrollwheel: false,
          disableDoubleClickZoom: true,
          clickableIcons: false,
          gestureHandling: "none",
          keyboardShortcuts: false,
          draggable: false,
        });

        mapRef.current = map;

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

        // Style countries - hide non-region countries
        dataLayer.setStyle((feature) => {
          const isInRegion = isFeatureInRegion(feature);

          if (!isInRegion) {
            return { visible: false };
          }

          return {
            visible: true,
            fillColor: theme.secondary,
            fillOpacity: 0.5,
            strokeColor: theme.primary,
            strokeOpacity: 1,
            strokeWeight: 1.5,
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
      createCountryMarkers(map, theme);
    } else if (drill === "country" && selectedCountry && stateData.length > 0) {
      createStateMarkers(map, selectedCountry, theme);
    }
  }, [drill, selectedCountry, mapReady, countryData, stateData, createCountryMarkers, createStateMarkers, theme]);

  // Update data layer style when selection changes
  useEffect(() => {
    const dataLayer = dataLayerRef.current;
    if (!dataLayer || !mapReady) return;

    dataLayer.setStyle((feature) => {
      const cont = (feature.getProperty("CONTINENT") as string | undefined) ?? "";
      const countryName = (feature.getProperty("ADMIN") as string | undefined) ??
        (feature.getProperty("NAME") as string | undefined) ?? "";
      const iso2 = (feature.getProperty("ISO_A2") as string | undefined) ?? "";

      // Check if feature belongs to this region
      let isInRegion = false;
      if (regionCountries) {
        isInRegion = cont === parentContinent && regionCountries.includes(countryName);
      } else {
        isInRegion = cont === selectedContinent;
      }
      
      const isSelected = drill === "country" && selectedCountry?.code === iso2;

      if (!isInRegion) {
        return { visible: false };
      }

      return {
        visible: true,
        fillColor: isSelected ? theme.highlight : theme.secondary,
        fillOpacity: isSelected ? 0.7 : 0.5,
        strokeColor: theme.primary,
        strokeOpacity: 1,
        strokeWeight: isSelected ? 2.5 : 1.5,
        clickable: true,
        cursor: "pointer",
      };
    });
  }, [drill, selectedCountry, selectedContinent, parentContinent, regionCountries, theme, mapReady]);

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
        createCountryMarkers(map, theme);
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
    <div className="relative w-full h-full">
      {/* Top bar */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-3">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium shadow-lg transition-all hover:scale-105"
          style={{ backgroundColor: theme.primary }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          {drill === "country" ? "Back to Countries" : "Back to Globe"}
        </button>

        <div className="bg-white rounded-lg px-4 py-2 shadow-lg">
          <div className="text-xs text-gray-500 uppercase tracking-wide">Viewing</div>
          <div className="font-semibold text-gray-800">{viewLabel}</div>
        </div>
      </div>

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-20 bg-white/80 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div 
              className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: `${theme.primary} transparent transparent transparent` }}
            />
            <span className="text-gray-600">Loading map...</span>
          </div>
        </div>
      )}

      {/* Map container */}
      <div ref={mapDivRef} className="w-full h-full" />

      {/* Legend */}
      <div className="absolute bottom-4 right-4 z-10 bg-white rounded-lg p-3 shadow-lg">
        <div className="text-xs font-semibold text-gray-600 mb-2">LEGEND</div>
        <div className="flex items-center gap-2 mb-1">
          <div 
            className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
            style={{ backgroundColor: theme.primary }}
          >
            N
          </div>
          <span className="text-sm text-gray-700">Click cluster to view Nonnas</span>
        </div>
        <div className="flex items-center gap-2">
          <div 
            className="w-6 h-6 rounded border-2"
            style={{ borderColor: theme.primary, backgroundColor: theme.secondary }}
          />
          <span className="text-sm text-gray-700">Click country to drill down</span>
        </div>
      </div>

      {/* Modal */}
      <NonnaModal
        open={modal.open}
        title={modal.title}
        nonnas={modal.nonnas}
        onClose={() => setModal({ open: false, title: "", nonnas: [] })}
        themeColor={theme.primary}
      />
    </div>
  );
}
