"use client";

import { useEffect, useRef, useState } from "react";
import {
  useEarthNavigation,
  ZOOM_RANGES,
  ZoomLevel,
} from "@/contexts/EarthNavigationContext";

declare global {
  interface Window {
    google?: any;
  }
}

function loadGoogleMaps(apiKey: string) {
  // If already loaded, reuse
  if (window.google?.maps?.importLibrary) return Promise.resolve();

  return new Promise<void>((resolve, reject) => {
    const scriptId = "google-maps-js";

    if (document.getElementById(scriptId)) {
      // Wait until google.maps.importLibrary exists
      const t = setInterval(() => {
        if (window.google?.maps?.importLibrary) {
          clearInterval(t);
          resolve();
        }
      }, 50);

      // Optional timeout guard
      setTimeout(() => {
        clearInterval(t);
        if (!window.google?.maps?.importLibrary) {
          reject(new Error("Google Maps JS loader timed out"));
        }
      }, 10000);

      return;
    }

    const s = document.createElement("script");
    s.id = scriptId;
    s.async = true;
    s.defer = true;
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      apiKey
    )}&v=alpha`;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Google Maps JS"));
    document.head.appendChild(s);
  });
}

type LatLngLiteral = { lat: number; lng: number };

function extractLatLng(rawPos: any): LatLngLiteral | null {
  if (!rawPos) return null;

  const lat =
    typeof rawPos.lat === "function" ? rawPos.lat() : Number(rawPos.lat);
  const lng =
    typeof rawPos.lng === "function" ? rawPos.lng() : Number(rawPos.lng);

  if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  return null;
}

function parseAdminLevelsFromGeocodeResult(result: any) {
  // Extract country + admin_area_level_1 from address_components
  let country: string | null = null;
  let state: string | null = null;
  let countryCode: string | null = null;
  let stateCode: string | null = null;

  const components = result?.address_components ?? [];
  for (const c of components) {
    const types: string[] = c.types || [];

    if (types.includes("country")) {
      country = c.long_name || null;
      countryCode = c.short_name || null;
    }

    if (types.includes("administrative_area_level_1")) {
      state = c.long_name || null;
      stateCode = c.short_name || null;
    }
  }

  return { country, countryCode, state, stateCode };
}

export default function Earth3DPage() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const [activePlaceName, setActivePlaceName] = useState<string | null>(null);
  const [hoveredLabel, setHoveredLabel] = useState<string | null>(null);
  const [clickedLabel, setClickedLabel] = useState<string | null>(null);

  const { currentLevel, setLevel } = useEarthNavigation();
  const currentLevelRef = useRef<ZoomLevel>(currentLevel);

  // Sync ref with context
  useEffect(() => {
    currentLevelRef.current = currentLevel;
  }, [currentLevel]);

  useEffect(() => {
    let mounted = true;
    let animationFrameId = 0;
    let idleTimeout: ReturnType<typeof setTimeout> | null = null;

    // For cleanup
    const listeners: Array<() => void> = [];

    // Prevent duplicate reverse-geocode calls while fly animation is active
    let isProgrammaticFlight = false;
    let lastClickedLatLng: LatLngLiteral | null = null;

    async function init() {
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      if (!apiKey) throw new Error("Missing NEXT_PUBLIC_GOOGLE_MAPS_API_KEY");

      await loadGoogleMaps(apiKey);
      if (!mounted || !containerRef.current) return;

      const { Map3DElement, Marker3DElement, Polygon3DElement } =
        await window.google.maps.importLibrary("maps3d");

      // Geocoder is from the standard maps library
      const { Geocoder } = await window.google.maps.importLibrary("geocoding");

      const geocoder = new Geocoder();
      const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID;

      const map3d = new Map3DElement({
        center: { lat: 20, lng: 0, altitude: 0 },
        range: 20000000, // Earth-level default zoom
        tilt: 0,
        heading: 0,
        mode: "HYBRID",
        ...(mapId ? { mapId } : {}), // mapId optional for 3D visuals, not used for getFeatureLayer
      });

      const marker = new Marker3DElement({
        position: { lat: 43.6425, lng: -79.3871, altitude: 20 },
        title: "3D Marker",
      });

      map3d.append(marker);

      // Clear container and append (avoids duplicates on hot reload)
      containerRef.current.innerHTML = "";
      containerRef.current.appendChild(map3d);

      // ---- Boundary polygons drawn with Polygon3DElement + Nominatim GeoJSON ----
      // (FeatureLayer3DElement is NOT available on Map3DElement — confirmed by importLibrary keys)
      const polygonOverlays: any[] = [];
      let activeHighlightName: string | null = null;

      const clearPolygonOverlays = () => {
        for (const p of polygonOverlays) {
          try { p.remove(); } catch { /* ignore */ }
        }
        polygonOverlays.length = 0;
      };

      /**
       * Fetch real border GeoJSON from Nominatim (free, no key needed)
       * and draw it as Polygon3DElement(s) clamped to the globe surface.
       */
      const fetchAndDrawBoundary = async (
        name: string,
        featureType: 'country' | 'state' | 'city',
        countryCode?: string | null,
      ) => {
        try {
          const params = new URLSearchParams({
            polygon_geojson: '1',
            format: 'json',
            limit: '1',
          });

          if (featureType === 'country') {
            params.set('featuretype', 'country');
            params.set('country', name);
          } else if (featureType === 'state') {
            params.set('featuretype', 'state');
            params.set('state', name);
            if (countryCode) params.set('countrycodes', countryCode.toLowerCase());
          } else {
            params.set('featuretype', 'city');
            params.set('city', name);
            if (countryCode) params.set('countrycodes', countryCode.toLowerCase());
          }

          const url = `https://nominatim.openstreetmap.org/search?${params.toString()}`;
          const res = await fetch(url, { headers: { 'User-Agent': 'NonnasMaps/1.0' } });
          if (!res.ok) throw new Error(`Nominatim HTTP ${res.status}`);

          const data = await res.json();
          const geojson = data?.[0]?.geojson;
          if (!geojson) {
            console.warn('[Earth3D] No GeoJSON boundary for', name);
            return;
          }

          let rings: number[][][] = [];
          if (geojson.type === 'Polygon') {
            rings = [geojson.coordinates[0]];
          } else if (geojson.type === 'MultiPolygon') {
            rings = (geojson.coordinates as number[][][][]).map(poly => poly[0]);
          } else {
            console.warn('[Earth3D] Unhandled GeoJSON type:', geojson.type);
            return;
          }

          // Simplify rings to avoid WASM "memory access out of bounds" crash.
          // Nominatim borders can have 50k+ points; Polygon3DElement crashes above ~1000.
          const MAX_RING_POINTS = 400;
          const simplifyRing = (ring: number[][]): number[][] => {
            if (ring.length <= MAX_RING_POINTS) return ring;
            const step = Math.ceil(ring.length / MAX_RING_POINTS);
            const out = ring.filter((_, i) => i % step === 0);
            // Re-close the ring if the last point was skipped
            const first = out[0];
            const last = out[out.length - 1];
            if (first[0] !== last[0] || first[1] !== last[1]) out.push(first);
            return out;
          };

          // Simplify and drop tiny fragments (< 4 pts)
          rings = rings.map(simplifyRing).filter(r => r.length >= 4);

          if (rings.length === 0) {
            console.warn('[Earth3D] No usable rings after simplification for', name);
            return;
          }

          clearPolygonOverlays();

          for (const ring of rings) {
            // GeoJSON = [lng, lat]; Google Maps = { lat, lng }
            const outerCoordinates = ring.map(([lng, lat]: number[]) => ({ lat, lng, altitude: 0 }));

            const poly = new Polygon3DElement({
              outerCoordinates,
              fillColor: 'rgba(180, 83, 9, 0.28)',
              strokeColor: '#b45309',
              strokeWidth: 2.5,
              altitudeMode: 'CLAMP_TO_GROUND',
            } as any);

            map3d.append(poly);
            polygonOverlays.push(poly);
          }

          console.log(`[Earth3D] Drew ${polygonOverlays.length} polygon(s) for "${name}"`);
        } catch (err) {
          console.warn('[Earth3D] fetchAndDrawBoundary failed:', err);
        }
      };

      async function reverseGeocode(latLng: LatLngLiteral) {
        try {
          const response = await geocoder.geocode({ location: latLng });
          const first = response?.results?.[0];

          if (!first) {
            console.warn("[Earth3D] No geocode result for click", latLng);
            return null;
          }

          const parsed = parseAdminLevelsFromGeocodeResult(first);
          return {
            latLng,
            formattedAddress: first.formatted_address ?? null,
            ...parsed,
            rawResults: response.results,
            raw: first,
          };
        } catch (err) {
          console.error("[Earth3D] Geocoder reverse geocode failed:", err);
          return null;
        }
      }

      function flyTo(latLng: LatLngLiteral, range: number, durationMillis = 1500) {
        isProgrammaticFlight = true;

        map3d.flyCameraTo({
          endCamera: {
            center: { lat: latLng.lat, lng: latLng.lng, altitude: 0 },
            range,
            tilt: 0,
            heading: 0,
          },
          durationMillis,
        });

        // Release the flag after animation completes (plus a small buffer)
        window.setTimeout(() => {
          isProgrammaticFlight = false;
        }, durationMillis + 100);
      }

      // Track clicks in 3D map
      const handleMapClick = async (e: any) => {
        try {
          e.preventDefault?.();

          const rawPos = e.position || e.latLng;
          const latLng = extractLatLng(rawPos);

          if (!latLng) {
            console.warn("[Earth3D] Click event had no position:", e);
            return;
          }

          lastClickedLatLng = latLng;
          console.log("[Earth3D] gmp-click", latLng, "level:", currentLevelRef.current);

          // Avoid re-triggering while we're already animating programmatically
          if (isProgrammaticFlight) return;

          // Reverse geocode clicked point
          const placeInfo = await reverseGeocode(latLng);
          if (!mounted || !placeInfo) return;

          console.log("[Earth3D] Reverse geocode:", {
            country: placeInfo.country,
            countryCode: placeInfo.countryCode,
            state: placeInfo.state,
            stateCode: placeInfo.stateCode,
            formattedAddress: placeInfo.formattedAddress,
          });

          const level = currentLevelRef.current;
          let targetPlaceId: string | null = null;
          let targetPlaceName: string | null = null;
          let markerPosition: LatLngLiteral = latLng;

          // Navigation logic:
          // EARTH / CONTINENT -> zoom to COUNTRY
          // COUNTRY -> zoom to STATE
          // STATE -> zoom to CITY
          // CITY -> zoom to NONNA (example)
          if (level === "EARTH" || level === "CONTINENT") {
            const countryResult = placeInfo.rawResults.find((r: any) => r.types.includes('country'));
            if (countryResult) {
              targetPlaceId = countryResult.place_id;
              targetPlaceName = countryResult.address_components[0]?.long_name;
              markerPosition = extractLatLng(countryResult.geometry?.location) || latLng;
            }
            flyTo(latLng, ZOOM_RANGES.COUNTRY, 1500);
          } else if (level === "COUNTRY") {
            const stateResult = placeInfo.rawResults.find((r: any) => r.types.includes('administrative_area_level_1'));
            if (stateResult) {
              targetPlaceId = stateResult.place_id;
              targetPlaceName = stateResult.address_components[0]?.long_name;
              markerPosition = extractLatLng(stateResult.geometry?.location) || latLng;
            }
            flyTo(latLng, ZOOM_RANGES.STATE, 1500);
          } else if (level === "STATE") {
            const cityResult = placeInfo.rawResults.find((r: any) => r.types.includes('locality'));
            if (cityResult) {
              targetPlaceId = cityResult.place_id;
              targetPlaceName = cityResult.address_components[0]?.long_name;
              markerPosition = extractLatLng(cityResult.geometry?.location) || latLng;
            }
            flyTo(latLng, ZOOM_RANGES.CITY, 1200);
          } else if (level === "CITY") {
            flyTo(latLng, ZOOM_RANGES.NONNA, 1000);
          } else {
            // NONNA level (or fallback): no-op or small refinement
            // flyTo(latLng, ZOOM_RANGES.NONNA, 800);
          }

          // ---- Draw Polygon3DElement boundary via Nominatim ----
          const resolvedName = targetPlaceName || placeInfo.country || placeInfo.state || null;

          if (resolvedName) {
            if (resolvedName === activeHighlightName) {
              // Toggle off — same region clicked again
              clearPolygonOverlays();
              activeHighlightName = null;
              if (mounted) { setClickedLabel(null); setHoveredLabel(null); }
            } else {
              activeHighlightName = resolvedName;
              if (mounted) { setClickedLabel(resolvedName); setHoveredLabel(null); }

              const featureType =
                level === 'EARTH' || level === 'CONTINENT' ? 'country'
                  : level === 'COUNTRY' ? 'state'
                    : 'city';

              fetchAndDrawBoundary(resolvedName, featureType, placeInfo.countryCode);
            }
          } else {
            clearPolygonOverlays();
            activeHighlightName = null;
            if (mounted) { setClickedLabel(null); setHoveredLabel(null); }
          }

          setActivePlaceName(resolvedName);
        } catch (err) {
          console.error("[Earth3D] gmp-click handler error:", err);
        }
      };

      map3d.addEventListener("gmp-click", handleMapClick);
      listeners.push(() => map3d.removeEventListener("gmp-click", handleMapClick));

      // ---- Overlay + Zoom level sync ----
      let currentSize = 0;
      let currentOpacity = 0;
      const LERP_SPEED = 0.1;
      const EARTH_RADIUS = 6371000;
      const FOV_FACTOR = 1.6; // Higher FOV prevents the spherical bulge from clipping

      const checkZoom = () => {
        if (!mounted || !overlayRef.current) return;

        const currentRange = Number(map3d.range ?? ZOOM_RANGES.EARTH);
        const distance = EARTH_RADIUS + currentRange;
        const d = Math.max(distance, EARTH_RADIUS + 10);
        const alpha = Math.asin(EARTH_RADIUS / d);

        // Approximate screen radius of the globe
        const rPx = Math.tan(alpha) * window.innerHeight * FOV_FACTOR;

        // SVG path radius is ~400 in viewBox 1000, so size scales around that
        const targetSize = (rPx + 60) * 2.5;

        // Fade out smoothly when zooming IN to continents/countries
        let targetOpacity = 1;
        if (currentRange < 8000000) {
          targetOpacity = 0;
        } else if (currentRange < 12000000) {
          targetOpacity = (currentRange - 8000000) / 4000000;
        }

        // Determine navigation context level
        let newLevel: ZoomLevel = "EARTH";
        if (currentRange <= ZOOM_RANGES.NONNA * 2) {
          newLevel = "NONNA";
        } else if (currentRange <= ZOOM_RANGES.CITY * 2) {
          newLevel = "CITY";
        } else if (currentRange <= ZOOM_RANGES.STATE * 2) {
          newLevel = "STATE";
        } else if (currentRange <= ZOOM_RANGES.COUNTRY * 2) {
          newLevel = "COUNTRY";
        } else if (currentRange <= ZOOM_RANGES.CONTINENT * 1.5) {
          newLevel = "CONTINENT";
        }

        if (newLevel !== currentLevelRef.current) {
          setLevel(newLevel);

          // Clear boundary polygon when zooming back out to Earth/Continent view
          if (newLevel === 'EARTH' || newLevel === 'CONTINENT') {
            clearPolygonOverlays();
            activeHighlightName = null;
            setClickedLabel(null);
            setHoveredLabel(null);
          }
        }

        // Initialize instantly, then lerp
        if (currentSize === 0) {
          currentSize = targetSize;
          currentOpacity = targetOpacity;
        } else {
          currentSize += (targetSize - currentSize) * LERP_SPEED;
          currentOpacity += (targetOpacity - currentOpacity) * LERP_SPEED;
        }

        const el = overlayRef.current;
        el.style.width = `${currentSize}px`;
        el.style.height = `${currentSize}px`;
        el.style.opacity = `${currentOpacity}`;

        animationFrameId = requestAnimationFrame(checkZoom);
      };

      checkZoom();

      // ---- Snap to discrete zoom levels after idle ----
      const handleCameraIdle = () => {
        if (!mounted) return;
        if (isProgrammaticFlight) return;

        const currentLvl = currentLevelRef.current;
        const targetRange = ZOOM_RANGES[currentLvl];
        const currentRange = Number(map3d.range);

        // 10% tolerance to avoid micro-adjustments
        const tolerance = targetRange * 0.1;
        if (Math.abs(currentRange - targetRange) > tolerance) {
          map3d.flyCameraTo({
            endCamera: {
              center: map3d.center,
              range: targetRange,
              tilt: map3d.tilt,
              heading: map3d.heading,
            },
            durationMillis: 800,
          });
        }
      };

      const debounceIdle = () => {
        if (idleTimeout) clearTimeout(idleTimeout);
        idleTimeout = setTimeout(handleCameraIdle, 1000);
      };

      const onCenterChange = () => debounceIdle();
      const onRangeChange = () => debounceIdle();

      map3d.addEventListener("gmp-centerchange", onCenterChange);
      map3d.addEventListener("gmp-rangechange", onRangeChange);

      listeners.push(() =>
        map3d.removeEventListener("gmp-centerchange", onCenterChange)
      );
      listeners.push(() =>
        map3d.removeEventListener("gmp-rangechange", onRangeChange)
      );
    }

    init().catch((err) => {
      console.error("[Earth3D] init failed:", err);
    });

    return () => {
      mounted = false;

      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (idleTimeout) clearTimeout(idleTimeout);

      for (const off of listeners) {
        try {
          off();
        } catch {
          // no-op
        }
      }
    };
  }, [setLevel]);

  // Determine the label to show: clicked takes priority over hovered
  const displayLabel = clickedLabel || hoveredLabel || null;
  const isClickedLabel = !!clickedLabel;

  return (
    <div className="relative" style={{ height: "100%", width: "100%" }}>
      <div ref={containerRef} style={{ height: "100%", width: "100%" }} />

      {/* Boundary highlight label — shown on hover or click */}
      {displayLabel && (
        <div
          className="pointer-events-none absolute left-1/2 z-20"
          style={{
            top: "18%",
            transform: "translateX(-50%)",
            animation: "fadeInLabel 0.25s ease-out both",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: isClickedLabel ? "8px 20px" : "5px 16px",
              borderRadius: "999px",
              background: isClickedLabel
                ? "rgba(180, 83, 9, 0.85)"
                : "rgba(30, 20, 5, 0.55)",
              border: isClickedLabel
                ? "1.5px solid #d97706"
                : "1px solid rgba(217, 119, 6, 0.5)",
              backdropFilter: "blur(8px)",
              boxShadow: isClickedLabel
                ? "0 4px 24px rgba(180, 83, 9, 0.4)"
                : "0 2px 12px rgba(0,0,0,0.3)",
              transition: "all 0.2s ease",
            }}
          >
            {isClickedLabel && (
              <span
                style={{
                  width: "7px",
                  height: "7px",
                  borderRadius: "50%",
                  background: "#fbbf24",
                  boxShadow: "0 0 6px #fbbf24",
                  flexShrink: 0,
                }}
              />
            )}
            <span
              style={{
                color: isClickedLabel ? "#fef3c7" : "#fde68a",
                fontSize: isClickedLabel ? "15px" : "13px",
                fontWeight: 700,
                letterSpacing: "0.12em",
                fontFamily: "ui-sans-serif, system-ui, sans-serif",
                textTransform: "uppercase",
                textShadow: "0 1px 4px rgba(0,0,0,0.6)",
                whiteSpace: "nowrap",
              }}
            >
              {displayLabel}
            </span>
          </div>
        </div>
      )}

      {/* Globe title ring */}
      <div
        ref={overlayRef}
        className="pointer-events-none absolute top-1/2 left-1/2 z-10"
        style={{
          transform: "translate(-50%, -50%)",
          opacity: 0, // init zero, set on first frame
          willChange: "width, height, opacity",
        }}
      >
        <svg
          viewBox="0 0 1000 1000"
          className="w-full h-full overflow-visible"
          style={{ animation: "spin-reverse 150s linear infinite" }}
        >
          <style>
            {`
              @keyframes spin-reverse {
                from { transform: rotate(0deg); }
                to { transform: rotate(-360deg); }
              }
              @keyframes fadeInLabel {
                from { opacity: 0; transform: translateX(-50%) translateY(-6px); }
                to   { opacity: 1; transform: translateX(-50%) translateY(0); }
              }
            `}
          </style>

          <defs>
            <path
              id="globePath"
              d="M 100, 500
                 a 400,400 0 1,1 800,0
                 a 400,400 0 1,1 -800,0"
            />
          </defs>

          <text
            className="font-bold fill-[#FFF7ED]"
            style={{
              fontSize: "65px",
              fontFamily: "ui-sans-serif, system-ui, sans-serif",
              textShadow: "0px 4px 15px rgba(0,0,0,0.8)",
            }}
          >
            <textPath
              href="#globePath"
              startOffset="50%"
              textAnchor="middle"
              textLength="2300"
              lengthAdjust="spacing"
            >
              NONNAS OF THE WORLD
            </textPath>
          </text>
        </svg>
      </div>
    </div>
  );
}