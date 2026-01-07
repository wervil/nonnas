"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import type { ClusterPoint, Nonna } from "./sharedTypes";
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

// Continent theme colors
const CONTINENT_THEMES: Record<string, { primary: string; secondary: string; highlight: string }> = {
  Africa: { primary: "#22c55e", secondary: "#dcfce7", highlight: "#4ade80" },
  Asia: { primary: "#eab308", secondary: "#fef9c3", highlight: "#facc15" },
  Europe: { primary: "#3b82f6", secondary: "#dbeafe", highlight: "#60a5fa" },
  "North America": { primary: "#ef4444", secondary: "#fee2e2", highlight: "#f87171" },
  "South America": { primary: "#a855f7", secondary: "#f3e8ff", highlight: "#c084fc" },
  Oceania: { primary: "#ec4899", secondary: "#fce7f3", highlight: "#f472b6" },
  Antarctica: { primary: "#64748b", secondary: "#f1f5f9", highlight: "#94a3b8" },
};

// Calculate centroid from array of points
function centroidLatLng(points: Array<{ lat: number; lng: number }>) {
  const n = points.length;
  if (n === 0) return { lat: 0, lng: 0 };
  let lat = 0;
  let lng = 0;
  for (const p of points) {
    lat += p.lat;
    lng += p.lng;
  }
  return { lat: lat / n, lng: lng / n };
}

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

export default function GoogleContinentCountryMap({
  active,
  selectedContinent,
  points,
  onBackToGlobe,
}: {
  active: boolean;
  selectedContinent: string;
  points: ClusterPoint[];
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

  const theme = CONTINENT_THEMES[selectedContinent] || CONTINENT_THEMES.Europe;

  // Check URL for country parameter (for testing)
  useEffect(() => {
    if (initialCountrySetRef.current) return;
    const countryCode = searchParams.get("country");
    const countryName = searchParams.get("countryName");
    if (countryCode && countryName) {
      initialCountrySetRef.current = true;
      setSelectedCountry({ code: countryCode, name: countryName });
      setDrill("country");
    }
  }, [searchParams]);

  const continentPoints = useMemo(() => {
    const hasContinent = points.some((p) => typeof p.continent === "string" && p.continent.length > 0);
    if (hasContinent) return points.filter((p) => p.continent === selectedContinent);
    return points;
  }, [points, selectedContinent]);

  const clearMarkers = useCallback(() => {
    for (const m of markersRef.current) {
      m.setMap(null);
    }
    markersRef.current = [];
  }, []);

  const createCountryMarkers = useCallback((map: google.maps.Map, themeColors: typeof theme) => {
    clearMarkers();

    const byCountry = new Map<string, { code: string; name: string; pts: ClusterPoint[]; nonnas: Nonna[] }>();

    for (const p of continentPoints) {
      const key = `${p.countryCode}||${p.countryName}`;
      const existing = byCountry.get(key);
      if (existing) {
        existing.pts.push(p);
        existing.nonnas.push(...p.nonnas);
      } else {
        byCountry.set(key, { code: p.countryCode, name: p.countryName, pts: [p], nonnas: [...p.nonnas] });
      }
    }

    for (const entry of byCountry.values()) {
      if (entry.nonnas.length === 0) continue;

      const center = centroidLatLng(entry.pts);
      const count = entry.nonnas.length;
      
      // Create simple circle marker with count
      const size = Math.min(50, Math.max(32, 24 + count * 2));
      
      const marker = new google.maps.Marker({
        map,
        position: center,
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
          text: String(count),
          color: "#ffffff",
          fontSize: count > 99 ? "11px" : "14px",
          fontWeight: "700",
        },
        title: `${entry.name}: ${count} nonna(s) - Click country to see regions`,
        zIndex: count,
      });

      // Country markers don't open modal - clicking the country polygon does drill-down
      // This marker is just visual indicator of nonna count

      markersRef.current.push(marker);
    }
  }, [continentPoints, clearMarkers]);

  const createStateMarkers = useCallback((map: google.maps.Map, country: { code: string; name: string }, themeColors: typeof theme) => {
    clearMarkers();

    const countryPts = continentPoints.filter((p) => p.countryCode === country.code);

    const byState = new Map<string, { state: string; pts: ClusterPoint[]; nonnas: Nonna[] }>();
    
    for (const p of countryPts) {
      const state = p.stateName?.trim() || "Unknown Region";
      const existing = byState.get(state);
      if (existing) {
        existing.pts.push(p);
        existing.nonnas.push(...p.nonnas);
      } else {
        byState.set(state, { state, pts: [p], nonnas: [...p.nonnas] });
      }
    }

    for (const entry of byState.values()) {
      if (entry.nonnas.length === 0) continue;

      const center = centroidLatLng(entry.pts);
      
      // Create SVG icon with state name and count
      const stateName = entry.state;
      const count = entry.nonnas.length;
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
        position: center,
        icon: {
          url: `data:image/svg+xml,${encodedSvg}`,
          scaledSize: new google.maps.Size(textWidth, iconHeight),
          anchor: new google.maps.Point(textWidth / 2, iconHeight / 2),
        },
        title: `${entry.state}: ${entry.nonnas.length} nonna(s)`,
        zIndex: entry.nonnas.length + 100,
      });

      marker.addListener("click", () => {
        setModal({
          open: true,
          title: `${country.name} • ${entry.state} • ${entry.nonnas.length} Nonna(s)`,
          nonnas: entry.nonnas,
        });
      });

      markersRef.current.push(marker);
    }
  }, [continentPoints, clearMarkers]);

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

        // Calculate bounds from actual continent features
        const continentBounds = new google.maps.LatLngBounds();
        let hasFeatures = false;

        dataLayer.forEach((feature) => {
          const cont = (feature.getProperty("CONTINENT") as string | undefined) ?? "";
          if (cont === selectedContinent) {
            hasFeatures = true;
            feature.getGeometry()?.forEachLatLng((latLng) => {
              continentBounds.extend(latLng);
            });
          }
        });

        continentBoundsRef.current = continentBounds;

        // Style countries - hide non-continent countries
        dataLayer.setStyle((feature) => {
          const cont = (feature.getProperty("CONTINENT") as string | undefined) ?? "";
          const isInContinent = cont === selectedContinent;

          if (!isInContinent) {
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
        dataLayer.addListener("click", (e: google.maps.Data.MouseEvent) => {
          const cont = (e.feature.getProperty("CONTINENT") as string | undefined) ?? "";
          if (cont !== selectedContinent) return;

          const iso2 = (e.feature.getProperty("ISO_A2") as string | undefined) ?? "";
          const countryName = (e.feature.getProperty("ADMIN") as string | undefined) ??
            (e.feature.getProperty("NAME") as string | undefined) ?? "";

          if (!iso2 || !countryName) return;

          setSelectedCountry({ code: iso2, name: countryName });
          setDrill("country");

          // Fit bounds to country with padding
          const countryBounds = new google.maps.LatLngBounds();
          e.feature.getGeometry()?.forEachLatLng((latLng) => countryBounds.extend(latLng));
          
          // Use setTimeout to ensure the bounds are applied after state updates
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
          const cont = (e.feature.getProperty("CONTINENT") as string | undefined) ?? "";
          if (cont !== selectedContinent) return;
          
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

          // Create state markers for the initial country
          createStateMarkers(map, { code: urlCountryCode, name: urlCountryName }, theme);
        } else {
          // Fit to continent bounds with padding
          if (hasFeatures) {
            // Small delay to ensure map is fully initialized
            setTimeout(() => {
              map.fitBounds(continentBounds, {
                top: 100,
                bottom: 80,
                left: 40,
                right: 40,
              });
            }, 100);
          }

          createCountryMarkers(map, theme);
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
  }, [active, selectedContinent, theme, createCountryMarkers, createStateMarkers, clearMarkers, searchParams]);

  // Update markers when drill level changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    if (drill === "continent") {
      createCountryMarkers(map, theme);
    } else if (drill === "country" && selectedCountry) {
      createStateMarkers(map, selectedCountry, theme);
    }
  }, [drill, selectedCountry, mapReady, createCountryMarkers, createStateMarkers, theme]);

  // Update data layer style when selection changes
  useEffect(() => {
    const dataLayer = dataLayerRef.current;
    if (!dataLayer || !mapReady) return;

    dataLayer.setStyle((feature) => {
      const cont = (feature.getProperty("CONTINENT") as string | undefined) ?? "";
      const iso2 = (feature.getProperty("ISO_A2") as string | undefined) ?? "";

      const isInContinent = cont === selectedContinent;
      const isSelected = drill === "country" && selectedCountry?.code === iso2;

      if (!isInContinent) {
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
  }, [drill, selectedCountry, selectedContinent, theme, mapReady]);

  // Back button handler
  const handleBack = useCallback(() => {
    if (drill === "country") {
      setDrill("continent");
      setSelectedCountry(null);

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

      if (map) {
        createCountryMarkers(map, theme);
      }
      return;
    }

    clearMarkers();
    mapRef.current = null;
    dataLayerRef.current = null;
    continentBoundsRef.current = null;
    setMapReady(false);
    onBackToGlobe();
  }, [drill, onBackToGlobe, clearMarkers, createCountryMarkers, theme]);

  return (
    <div className="w-full h-full relative bg-sky-100">
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-white/90 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <div
              className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: `${theme.primary} transparent ${theme.primary} ${theme.primary}` }}
            />
            <span className="text-gray-600 text-sm">Loading map...</span>
          </div>
        </div>
      )}

      {/* Navigation header */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-3">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
          style={{ backgroundColor: theme.primary }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          {drill === "country" ? "Back to Countries" : "Back to Globe"}
        </button>

        <div className="bg-white/95 backdrop-blur-sm rounded-xl px-4 py-2.5 shadow-lg border border-gray-200">
          <div className="text-xs text-gray-500 uppercase tracking-wide">Viewing</div>
          <div className="text-sm font-semibold text-gray-900">
            {drill === "continent" ? (
              <span>{selectedContinent} • Countries</span>
            ) : (
              <span>{selectedCountry?.name} • Regions</span>
            )}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 right-4 z-20 bg-white/95 backdrop-blur-sm rounded-xl px-4 py-3 shadow-lg border border-gray-200">
        <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Legend</div>
        <div className="flex items-center gap-2 text-sm">
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
            style={{ backgroundColor: theme.primary }}
          >
            N
          </div>
          <span className="text-gray-700">Click cluster to view Nonnas</span>
        </div>
        <div className="flex items-center gap-2 text-sm mt-1.5">
          <div
            className="w-6 h-6 rounded border-2"
            style={{ backgroundColor: theme.secondary, borderColor: theme.primary }}
          />
          <span className="text-gray-700">Click country to drill down</span>
        </div>
      </div>

      {/* Map container */}
      <div ref={mapDivRef} className="w-full h-full" />

      {/* Modal for Nonna details */}
      <NonnaModal
        open={modal.open}
        title={modal.title}
        nonnas={modal.nonnas}
        onClose={() => setModal((m) => ({ ...m, open: false }))}
      />
    </div>
  );
}
