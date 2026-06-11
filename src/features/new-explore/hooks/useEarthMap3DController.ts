"use client";

import { useEarthNavigation } from "@/contexts/EarthNavigationContext";
import { useAllClusters } from "@/features/new-explore/hooks/useAllClusters";
import { useGeoJsonBoundaries } from "@/features/new-explore/hooks/useGeoJsonBoundaries";
import { mapRecipesToPanelNonnas } from "@/features/new-explore/lib/recipes";
import { loadGoogleMaps } from "@/features/new-explore/lib/maps-loader";
import {
  consumeStreetViewRestoreParam,
  extractLatLng,
  parseStreetViewReturnPayload,
} from "@/features/new-explore/lib/street-view";
import { parseAdminLevelsFromGeocodeResult } from "@/features/new-explore/lib/geocode";
import { buildMarkerTemplate } from "@/features/new-explore/lib/marker-templates";
import {
  findCityClusterFromLabel,
  markerMatchesViewportCountry,
  normAdminLabel,
  type ClusterLayers,
} from "@/features/new-explore/lib/cluster-helpers";
import {
  calculateDistance,
  generateAvatarSvgUri,
  spreadOverlappingMarkers,
} from "@/features/new-explore/lib/markers";
import {
  circlePolygonGeoJson,
  geometryFromNominatimResult,
  resolveCountryDisplayName,
  type BoundaryDrawOptions,
  type GeoJsonPolygon,
} from "@/features/new-explore/lib/boundaries";
import {
  MARKER_SCALE_BY_LEVEL,
  STREET_VIEW_RETURN_STORAGE_KEY,
  TEAL,
  ZOOM_LEVEL_META,
  ZOOM_RANGES,
} from "@/features/new-explore/constants";
import type {
  GlobeNonna,
  LatLngLiteral,
  PanelNonna,
  SearchResult,
  StreetViewReturnPayload,
  ZoomLevel,
} from "@/features/new-explore/types";
import {
  getCountryCodesByContinent,
  getCountryInfoByCode,
  getCountryInfoWithFallback,
} from "@/lib/countryData";
import { cityLabelsMatch, regionLabelsMatch } from "@/lib/locationData";
import { useUser } from "@stackframe/stack";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusStyles } from "./useFocusStyles";
import { useMobileDetect } from "./useMobileDetect";

type RemovableOverlay = { remove: () => void };

declare global {
  interface Window {
    google?: any;
  }
}

export function useEarthMap3DController() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [mapContainerMounted, setMapContainerMounted] = useState(false);
  const setContainerRef = useCallback((node: HTMLDivElement | null) => {
    containerRef.current = node;
    setMapContainerMounted(node !== null);
  }, []);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const map3dRef = useRef<any>(null);
  const streetViewContainerRef = useRef<HTMLDivElement | null>(null);
  const streetViewPanoramaRef = useRef<any>(null);
  // Tracks the nonna currently focused at NONNA level so the Street View
  // button can re-enter Street View facing her with her marker preloaded.
  const currentNonnaRef = useRef<{
    lat: number;
    lng: number;
    recipeId: number;
    name: string;
    title: string;
    photo: string | null;
    countryName: string;
    countryCode: string;
  } | null>(null);
  const geoJsonCacheRef = useRef<any>(null);
  // Pre-cut Natural Earth continent polygons (one feature per continent, already
  // antimeridian-safe). Replaces the runtime country-stitching that produced the
  // global "ring" artifact for Oceania/Asia.
  const continentGeoJsonCacheRef = useRef<any>(null);
  // Slimmed Natural Earth admin-1 (states/regions). Same role as the country
  // file: local-first lookup, Nominatim only as a fallback.
  const stateGeoJsonCacheRef = useRef<any>(null);
  const currentMarkersRef = useRef<any[]>([]);

  // Function to clear all current markers immediately
  const clearCurrentMarkers = useCallback(() => {
    for (const marker of currentMarkersRef.current) {
      try {
        marker.remove();
      } catch (error) {
        console.warn("[Earth3D] Failed to remove marker:", error);
      }
    }
    currentMarkersRef.current = [];
  }, []);

  useEffect(() => {
    return () => clearCurrentMarkers();
  }, [clearCurrentMarkers]);

  const [streetViewActive, setStreetViewActive] = useState(false);
  const [streetViewPickMode, setStreetViewPickMode] = useState(false);
  const user = useUser();
  const l = useTranslations("labels");
  const [activePlaceName, setActivePlaceName] = useState<string | null>(null);
  const [activeCountry, setActiveCountry] = useState<string | null>(null);
  const [hoveredLabel, setHoveredLabel] = useState<string | null>(null);
  const [clickedLabel, setClickedLabel] = useState<string | null>(null);
  const [nonnaData, setNonnaData] = useState<GlobeNonna[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const [is3DMode, setIs3DMode] = useState(false);
  const isMobile = useMobileDetect();
  useFocusStyles();

  // Continent highlighting state
  const [highlightedContinent, setHighlightedContinent] = useState<
    string | null
  >(null);

  // Zoom-out highlighting state
  const [previousLevel, setPreviousLevel] = useState<ZoomLevel | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const geocoderRef = useRef<any>(null);
  const viewportCountryRef = useRef<string | null>(null);
  const viewportCountryCodeRef = useRef<string | null>(null);
  const viewportContinentRef = useRef<string | null>(null);

  // Force map3d to fill its container on resize — rAF-throttled to avoid layout thrash
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const parent = container.parentElement;
    if (!parent) return;
    let resizeRaf = 0;
    const applySize = () => {
      resizeRaf = 0;
      const { offsetWidth: w, offsetHeight: h } = parent;
      if (!w || !h) return;
      container.style.width = `${w}px`;
      container.style.height = `${h}px`;
      const map3d = map3dRef.current;
      if (map3d) {
        map3d.style.width = `${w}px`;
        map3d.style.height = `${h}px`;
      }
    };
    const observer = new ResizeObserver(() => {
      if (resizeRaf) return;
      resizeRaf = requestAnimationFrame(applySize);
    });
    observer.observe(parent);
    return () => {
      observer.disconnect();
      if (resizeRaf) cancelAnimationFrame(resizeRaf);
    };
  }, [mapContainerMounted]);

  // Discussion Panel state
  const [panel, setPanel] = useState<{
    open: boolean;
    region: string;
    regionDisplayName: string;
    scope: "continent" | "country" | "state" | "city";
    country?: string;
    state?: string;
    city?: string;
    nonnas: Array<PanelNonna>;
    initialTab: "discussion" | "nonnas";
    isLoading: boolean;
  }>({
    open: false,
    region: "",
    regionDisplayName: "",
    scope: "country",
    nonnas: [],
    initialTab: "discussion", // Default to Community tab
    isLoading: false,
  });

  // Comment Section state for nonna-specific discussions
  const [commentSection, setCommentSection] = useState<{
    open: boolean;
    recipeId: number;
    nonnaDisplayName: string;
    titleName: string;
    photo: string | null;
    countryCode: string;
  }>({
    open: false,
    recipeId: 0,
    nonnaDisplayName: "",
    titleName: "",
    photo: null,
    countryCode: "",
  });

  // Mutual exclusion: only one of the two right-side panels can be open at a time.
  useEffect(() => {
    if (commentSection.open) {
      setPanel((prev) => (prev.open ? { ...prev, open: false } : prev));
    }
  }, [commentSection.open]);
  useEffect(() => {
    if (panel.open) {
      setCommentSection((prev) =>
        prev.open ? { ...prev, open: false, recipeId: 0 } : prev,
      );
    }
  }, [panel.open]);

  // In-Street-View popup card shown when clicking a nonna marker inside Street View.
  // This intentionally lives OUTSIDE the discussion tab, per Brendan's feedback.
  const [streetViewNonnaPopup, setStreetViewNonnaPopup] = useState<{
    open: boolean;
    recipeId: number;
    name: string;
    title: string;
    photo: string | null;
    countryName: string;
    countryCode: string;
  }>({
    open: false,
    recipeId: 0,
    name: "",
    title: "",
    photo: null,
    countryName: "",
    countryCode: "",
  });
  const { currentLevel, setLevel } = useEarthNavigation();
  const { data: allClustersData } = useAllClusters(true);
  const { data: continentsGeo } = useGeoJsonBoundaries("continents", mapReady);
  const needsCountryBoundaries = mapReady && currentLevel !== "EARTH";
  const needsStateBoundaries =
    mapReady &&
    (currentLevel === "COUNTRY" ||
      currentLevel === "STATE" ||
      currentLevel === "CITY" ||
      currentLevel === "NONNA");
  const { data: countriesGeo } = useGeoJsonBoundaries(
    "countries",
    needsCountryBoundaries,
  );
  const { data: statesGeo } = useGeoJsonBoundaries(
    "states",
    needsStateBoundaries,
  );
  const currentLevelRef = useRef<ZoomLevel>(currentLevel);
  useEffect(() => {
    currentLevelRef.current = currentLevel;

    // Leaving NONNA level — destroy Street View and close any popup
    if (currentLevel !== "NONNA" && streetViewActive) {
      if (streetViewPanoramaRef.current) {
        streetViewPanoramaRef.current = null;
      }
      setStreetViewActive(false);
      setStreetViewNonnaPopup((prev) =>
        prev.open ? { ...prev, open: false } : prev,
      );
    }
    if (currentLevel !== "NONNA") {
      currentNonnaRef.current = null;
    }

    // Hide comment section when moving away from CITY level
    if (currentLevel !== "CITY") {
      setCommentSection((prev) => ({ ...prev, open: false, recipeId: 0 }));
    }
  }, [currentLevel, streetViewActive]);

  // (Panel data is updated by the scroll/click handlers directly — no extra sync needed)

  const [streetViewToast, setStreetViewToast] = useState<string | null>(null);
  const streetViewPickModeRef = useRef(false);
  const pendingStreetViewRestoreRef = useRef<StreetViewReturnPayload | null>(
    null,
  );
  const hasAppliedStreetViewRestoreRef = useRef(false);

  useEffect(() => {
    const pending = consumeStreetViewRestoreParam();
    if (!pending) return;
    pendingStreetViewRestoreRef.current = pending;
  }, []);

  // Street View button: at NONNA level we already know which nonna is in focus,
  // so re-enter Street View facing her with her marker preloaded. At CITY level,
  // activate pick-a-spot mode. At COUNTRY/STATE levels, zoom in to CITY first.
  const handleStreetViewButtonClick = useCallback(() => {
    if (currentNonnaRef.current) {
      const n = currentNonnaRef.current;
      setStreetViewPickMode(false);
      streetViewPickModeRef.current = false;
      activateStreetViewAtRef.current(n.lat, n.lng, n);
      return;
    }

    // At COUNTRY or STATE level, use pick mode (same as city level)
    if (currentLevel === "COUNTRY" || currentLevel === "STATE") {
      setStreetViewPickMode((prev) => {
        const next = !prev;
        streetViewPickModeRef.current = next;
        return next;
      });
      return;
    }

    // At CITY level or below, just activate pick mode
    setStreetViewPickMode((prev) => {
      const next = !prev;
      streetViewPickModeRef.current = next;
      return next;
    });
  }, [currentLevel]);

  // Activate Street View at a specific lat/lng — flies camera down then opens panorama.
  // If `targetNonna` is provided, the panorama heading is aimed toward her and the
  // in-Street-View popup card is opened immediately so the user sees her info right away.
  const activateStreetViewAt = useCallback(
    async (
      lat: number,
      lng: number,
      targetNonna?: {
        lat: number;
        lng: number;
        recipeId: number;
        name: string;
        title: string;
        photo: string | null;
        countryName: string;
        countryCode: string;
      } | null,
      fallback?: () => void,
    ) => {
      const map3d = map3dRef.current;
      const container = streetViewContainerRef.current;
      if (!map3d || !container || !window.google?.maps) return;

      // Exit pick mode immediately
      setStreetViewPickMode(false);
      streetViewPickModeRef.current = false;

      // First check if Street View is available before flying
      try {
        await window.google.maps.importLibrary("streetView");
        const sv = new window.google.maps.StreetViewService();
        const result = await sv.getPanorama({
          location: { lat, lng },
          radius: 5000,
          source: window.google.maps.StreetViewSource.OUTDOOR,
        });

        if (!result?.data?.location?.latLng) {
          setStreetViewToast("No Street View data is available here.");
          setTimeout(() => setStreetViewToast(null), 3000);

          // Open comment section when street view is not available
          if (targetNonna) {
            setCommentSection({
              open: true,
              recipeId: targetNonna.recipeId,
              nonnaDisplayName: targetNonna.name,
              titleName: targetNonna.title,
              photo: targetNonna.photo,
              countryCode: targetNonna.countryCode,
            });
          }

          if (fallback) {
            fallback();
          }
          return;
        }

        // Street View exists — fly camera down to the location
        flightStateRef.current = {
          active: true,
          targetRange: ZOOM_RANGES.NONNA,
          targetLevel: "NONNA",
          startTime: Date.now(),
          lastRanges: [],
        };

        setLevel("NONNA");
        currentLevelRef.current = "NONNA";

        const FLIGHT_MS = 1600;
        map3d.flyCameraTo({
          endCamera: {
            center: { lat, lng, altitude: 0 },
            range: 50,
            tilt: 75,
            heading: map3d.heading,
          },
          durationMillis: FLIGHT_MS,
        });

        // Hand off to Street View on the actual flight completion event, with a
        // setTimeout fallback so we never guess timings or dip under the terrain.
        let handoffDone = false;
        const handoff = () => {
          if (handoffDone) return;
          handoffDone = true;
          map3d.removeEventListener?.("gmp-animationend", handoff);
          flightStateRef.current.active = false;

          // If we have a target nonna, aim the camera toward her so she's in view.
          const panoLatLng = result.data.location.latLng;
          const panoLat =
            typeof panoLatLng.lat === "function"
              ? panoLatLng.lat()
              : panoLatLng.lat;
          const panoLng =
            typeof panoLatLng.lng === "function"
              ? panoLatLng.lng()
              : panoLatLng.lng;
          let initialHeading = 0;
          if (targetNonna) {
            const toRad = (d: number) => (d * Math.PI) / 180;
            const toDeg = (r: number) => (r * 180) / Math.PI;
            const φ1 = toRad(panoLat);
            const φ2 = toRad(targetNonna.lat);
            const Δλ = toRad(targetNonna.lng - panoLng);
            const y = Math.sin(Δλ) * Math.cos(φ2);
            const x =
              Math.cos(φ1) * Math.sin(φ2) -
              Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
            initialHeading = (toDeg(Math.atan2(y, x)) + 360) % 360;
          }

          const panorama = new window.google.maps.StreetViewPanorama(
            container,
            {
              position: panoLatLng,
              pov: { heading: initialHeading, pitch: 0 },
              zoom: 1,
              motionTracking: false,
              motionTrackingControl: false,
              addressControl: true,
              fullscreenControl: false,
              linksControl: true,
              enableCloseButton: true,
            },
          );
          streetViewPanoramaRef.current = panorama;
          setStreetViewActive(true);

          // Close comment section when entering street view
          setCommentSection((prev) => ({ ...prev, open: false }));

          // Pre-open the in-Street-View nonna popup so the user sees her info immediately.
          if (targetNonna) {
            setStreetViewNonnaPopup({
              open: true,
              recipeId: targetNonna.recipeId,
              name: targetNonna.name,
              title: targetNonna.title,
              photo: targetNonna.photo,
              countryName: targetNonna.countryName,
              countryCode: targetNonna.countryCode,
            });

            // Track position changes to hide comment panel when moving 10m away from nonna
            const checkDistance = () => {
              const currentPos = panorama.getPosition?.();
              if (!currentPos) return;

              const currentLat =
                typeof currentPos.lat === "function"
                  ? currentPos.lat()
                  : currentPos.lat;
              const currentLng =
                typeof currentPos.lng === "function"
                  ? currentPos.lng()
                  : currentPos.lng;

              const distance = calculateDistance(
                currentLat,
                currentLng,
                targetNonna.lat,
                targetNonna.lng,
              );

              // Hide comment panel if more than 10 meters away
              if (distance > 10) {
                setCommentSection((prev) => ({ ...prev, open: false }));
              }
            };

            panorama.addListener("position_changed", checkDistance);
            panorama.addListener("pov_changed", checkDistance);
          }

          panorama.addListener("closeclick", () => {
            streetViewPanoramaRef.current = null;
            setStreetViewActive(false);
            setStreetViewNonnaPopup((prev) =>
              prev.open ? { ...prev, open: false } : prev,
            );

            // Clear comment section state completely when exiting Street View
            setCommentSection((prev) => ({
              ...prev,
              open: false,
              recipeId: 0,
            }));

            setLevel("CITY");
            currentLevelRef.current = "CITY";
          });
        };
        map3d.addEventListener?.("gmp-animationend", handoff, { once: true });
        setTimeout(handoff, FLIGHT_MS + 50);
      } catch {
        setStreetViewToast("No Street View data is available here.");
        setTimeout(() => setStreetViewToast(null), 3000);
        if (fallback) {
          fallback();
        }
      }
    },
    [setLevel],
  );

  const activateStreetViewAtRef = useRef(activateStreetViewAt);
  activateStreetViewAtRef.current = activateStreetViewAt;

  useEffect(() => {
    if (!mapReady || hasAppliedStreetViewRestoreRef.current) return;
    const pending = pendingStreetViewRestoreRef.current;
    if (!pending) return;

    const matchingNonna = pending.recipeId
      ? nonnaData.find(
          (n) =>
            n.recipeId != null &&
            Number.parseInt(n.recipeId.toString(), 10) === pending.recipeId,
        )
      : undefined;
    // If we came from a specific nonna story, wait until nonna data is loaded
    // so we can restore the popup card with "Read Her Story".
    if (pending.recipeId && !matchingNonna) return;

    hasAppliedStreetViewRestoreRef.current = true;
    pendingStreetViewRestoreRef.current = null;

    const targetNonna = matchingNonna
      ? {
          lat: matchingNonna.lat,
          lng: matchingNonna.lng,
          recipeId: Number.parseInt(matchingNonna.recipeId!.toString(), 10),
          name: pending.nonnaName ?? matchingNonna.representativeName,
          title: pending.nonnaTitle ?? matchingNonna.representativeTitle,
          photo: pending.nonnaPhoto ?? matchingNonna.representativePhoto,
          countryName: pending.countryName ?? matchingNonna.countryName,
          countryCode: pending.countryCode ?? matchingNonna.countryCode,
        }
      : null;

    activateStreetViewAtRef.current(pending.lat, pending.lng, targetNonna);

    let attempts = 0;
    const applySavedPovTimer = window.setInterval(() => {
      const panorama = streetViewPanoramaRef.current;
      attempts += 1;
      if (!panorama) {
        if (attempts > 30) {
          window.clearInterval(applySavedPovTimer);
        }
        return;
      }
      panorama.setPov({ heading: pending.heading, pitch: pending.pitch });
      panorama.setZoom(pending.zoom);
      window.clearInterval(applySavedPovTimer);
    }, 120);

    return () => {
      window.clearInterval(applySavedPovTimer);
    };
  }, [mapReady, nonnaData]);

  // World view + no map selection: load all published nonnas for the Nonnas tab
  useEffect(() => {
    if (!panel.open || currentLevel !== "EARTH" || panel.region.trim() !== "") {
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/recipes?published=true");
        if (!res.ok) throw new Error("Failed to fetch recipes");
        const data = await res.json();
        const list = mapRecipesToPanelNonnas(data.recipes || []);
        if (cancelled) return;
        setPanel((prev) => {
          if (
            !prev.open ||
            currentLevelRef.current !== "EARTH" ||
            prev.region.trim() !== ""
          ) {
            return prev;
          }
          return { ...prev, nonnas: list };
        });
      } catch (e) {
        console.error("[Earth3D] World-level nonnas fetch:", e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [panel.open, panel.region, currentLevel]);

  // Refetch nonnas when region changes (continent, country, state, city)
  useEffect(() => {
    if (!panel.region || panel.region.trim() === "") {
      return;
    }

    const fetchNonnasForRegion = async () => {
      setPanel((prev) => ({ ...prev, isLoading: true }));

      try {
        let url = "/api/recipes?published=true";

        if (panel.scope === "continent") {
          const { getCountryInfoWithFallback } =
            await import("@/lib/countryData");
          const continent = getCountryInfoWithFallback(
            panel.country || "",
          ).continent;
          url += `&continent=${encodeURIComponent(continent)}`;
        } else if (panel.scope === "country") {
          url += `&country=${encodeURIComponent(panel.country || "")}`;
        } else if (panel.scope === "state") {
          url += `&country=${encodeURIComponent(panel.country || "")}`;
          url += `&region=${encodeURIComponent(panel.region)}`;
        } else if (panel.scope === "city") {
          url += `&country=${encodeURIComponent(panel.country || "")}`;
          if (panel.state) {
            url += `&region=${encodeURIComponent(panel.state)}`;
          }
          url += `&city=${encodeURIComponent(panel.city || "")}`;
        }

        const response = await fetch(url);
        const data = await response.json();
        const nonnas = mapRecipesToPanelNonnas(data.recipes || []);

        setPanel((prev) => ({
          ...prev,
          nonnas,
          isLoading: false,
        }));
      } catch (error) {
        console.error(
          "[Earth3D] Error refetching nonnas for region change:",
          error,
        );
        setPanel((prev) => ({ ...prev, isLoading: false }));
      }
    };

    fetchNonnasForRegion();
  }, [panel.region, panel.scope, panel.country, panel.state, panel.city]);

  // Refresh panel data when exiting street view to ensure updated content
  useEffect(() => {
    if (
      !streetViewActive &&
      panel.region &&
      panel.region.trim() !== "" &&
      panel.open
    ) {
      // When exiting street view, refresh the panel data to ensure it's up-to-date
      const fetchNonnasForRegion = async () => {
        setPanel((prev) => ({ ...prev, isLoading: true }));

        try {
          let url = "/api/recipes?published=true";

          if (panel.scope === "continent") {
            const { getCountryInfoWithFallback } =
              await import("@/lib/countryData");
            const continent = getCountryInfoWithFallback(
              panel.country || "",
            ).continent;
            url += `&continent=${encodeURIComponent(continent)}`;
          } else if (panel.scope === "country") {
            url += `&country=${encodeURIComponent(panel.country || "")}`;
          } else if (panel.scope === "state") {
            url += `&country=${encodeURIComponent(panel.country || "")}`;
            url += `&region=${encodeURIComponent(panel.region)}`;
          } else if (panel.scope === "city") {
            url += `&country=${encodeURIComponent(panel.country || "")}`;
            if (panel.state) {
              url += `&region=${encodeURIComponent(panel.state)}`;
            }
            url += `&city=${encodeURIComponent(panel.city || "")}`;
          }

          const response = await fetch(url);
          const data = await response.json();
          const nonnas = mapRecipesToPanelNonnas(data.recipes || []);

          setPanel((prev) => ({
            ...prev,
            nonnas,
            isLoading: false,
          }));
        } catch (error) {
          console.error(
            "[Earth3D] Error refreshing nonnas after street view exit:",
            error,
          );
          setPanel((prev) => ({ ...prev, isLoading: false }));
        }
      };

      fetchNonnasForRegion();
    }
  }, [
    streetViewActive,
    panel.region,
    panel.scope,
    panel.country,
    panel.state,
    panel.city,
    panel.open,
  ]);

  // Flight state for programmatic zooms (buttons/clicks) to temporarily pause scroll-based detection during animations
  const flightStateRef = useRef<{
    active: boolean;
    targetRange: number | null;
    targetLevel: ZoomLevel | null;
    startTime: number;
    lastRanges: number[]; // Track last few ranges to detect stabilization
  }>({
    active: false,
    targetRange: null,
    targetLevel: null,
    startTime: 0,
    lastRanges: [],
  });
  const allClustersRef = useRef<{
    continents: GlobeNonna[];
    countries: GlobeNonna[];
    states: GlobeNonna[];
    cities: GlobeNonna[];
  } | null>(null);

  const viewportCityRef = useRef<string | null>(null);
  const viewportRegionRef = useRef<string | null>(null);
  /** Set when user clicked a region/city cluster — avoids geocoder name mismatches. */
  const regionFilterFromClickRef = useRef(false);
  const cityFilterFromClickRef = useRef(false);
  const individualFetchSeqRef = useRef(0);
  const filterMarkersNearCenter = useCallback(
    (markers: GlobeNonna[], maxKm: number) => {
      const map3d = map3dRef.current;
      if (!map3d?.center) return markers;
      const cLat = Number(map3d.center.lat);
      const cLng = Number(map3d.center.lng);
      if (!Number.isFinite(cLat) || !Number.isFinite(cLng)) return markers;
      return markers.filter(
        (m) =>
          Number.isFinite(m.lat) &&
          Number.isFinite(m.lng) &&
          calculateDistance(cLat, cLng, m.lat, m.lng) <= maxKm,
      );
    },
    [],
  );

  const filterByViewportCountry = useCallback((markers: GlobeNonna[]) => {
    const country = viewportCountryRef.current;
    if (!country) return markers;
    const code = viewportCountryCodeRef.current;
    return markers.filter((m) =>
      markerMatchesViewportCountry(m, country, code),
    );
  }, []);

  const filterByViewportContinent = useCallback((markers: GlobeNonna[]) => {
    const continent = viewportContinentRef.current;
    if (!continent) return markers;
    return markers.filter(
      (m) => getCountryInfoWithFallback(m.countryName).continent === continent,
    );
  }, []);

  const applyClusterLevel = useCallback(
    (level: ZoomLevel, data: NonNullable<typeof allClustersRef.current>) => {
      // Drawing cluster badges supersedes any in-flight individual-nonna fetch.
      // Bumping the seq makes a late-resolving CITY/STATE fetch abort instead of
      // clobbering these clusters with deeper-level markers (the "ghost" badge).
      individualFetchSeqRef.current += 1;

      const viewport = {
        country: viewportCountryRef.current,
        countryCode: viewportCountryCodeRef.current,
        continent: viewportContinentRef.current,
        region: viewportRegionRef.current,
        city: viewportCityRef.current,
      };

      let result: GlobeNonna[] = [];

      if (level === "EARTH") {
        result = data.continents;
      } else if (level === "CONTINENT") {
        const raw = data.continents;
        result = viewport.continent
          ? raw.filter((m) => m.countryName === viewport.continent)
          : raw;
      } else if (level === "COUNTRY") {
        const raw = data.countries;
        if (viewport.country) result = filterByViewportCountry(raw);
        else if (viewport.continent) result = filterByViewportContinent(raw);
        else result = raw;
      } else if (level === "STATE") {
        let markers = viewport.country
          ? filterByViewportCountry(data.states)
          : data.states;
        if (regionFilterFromClickRef.current && viewport.region) {
          const countryCode =
            viewport.countryCode ||
            getCountryInfoWithFallback(viewport.country || "").code;
          markers = markers.filter((m) =>
            regionLabelsMatch(m.region, viewport.region, countryCode),
          );
        }
        result = markers;
      } else if (level === "CITY") {
        let markers = data.cities;
        if (viewport.country) {
          markers = filterByViewportCountry(markers);
        }
        if (regionFilterFromClickRef.current && viewport.region) {
          const countryCode =
            viewport.countryCode ||
            getCountryInfoWithFallback(viewport.country || "").code;
          markers = markers.filter((m) =>
            regionLabelsMatch(m.region, viewport.region, countryCode),
          );
        }
        result = markers;
      }

      setNonnaData(result);
    },
    [filterByViewportContinent, filterByViewportCountry],
  );

  const fetchIndividualNonnas = useCallback(
    async (opts?: { city?: string; region?: string }) => {
      const fetchSeq = ++individualFetchSeqRef.current;
      try {
        const country = viewportCountryRef.current;
        const countryCode = viewportCountryCodeRef.current;
        const city =
          opts?.city ??
          (cityFilterFromClickRef.current ? viewportCityRef.current : null);
        const region =
          opts?.region ??
          (regionFilterFromClickRef.current ? viewportRegionRef.current : null);

        const loadMarkers = async (query: URLSearchParams) => {
          const res = await fetch(`/api/nonnas/clustering?${query}`, {
            cache: "no-store",
          });
          if (!res.ok) throw new Error("Failed to fetch individual nonnas");
          const data = await res.json();
          return (data.clusters || []) as GlobeNonna[];
        };

        let markers: GlobeNonna[] = [];

        // City drill: prefer city+country only — geocoder region names often
        // don't match recipe.region (e.g. Albertslund / Denmark).
        if (city && country) {
          const cityOnlyParams = new URLSearchParams({ level: "NONNA" });
          cityOnlyParams.set("country", country);
          cityOnlyParams.set("city", city);
          markers = await loadMarkers(cityOnlyParams);
        }

        if (markers.length === 0 && city && region && country) {
          const withRegion = new URLSearchParams({ level: "NONNA" });
          withRegion.set("country", country);
          withRegion.set("city", city);
          withRegion.set("region", region);
          markers = await loadMarkers(withRegion);
        }

        if (markers.length === 0 && city && country) {
          const broadParams = new URLSearchParams({ level: "NONNA" });
          broadParams.set("country", country);
          const broad = await loadMarkers(broadParams);
          const matched = broad.filter((m) => cityLabelsMatch(m.city, city));
          if (matched.length > 0) markers = matched;
        }

        if (markers.length === 0 && !city) {
          const params = new URLSearchParams({ level: "NONNA" });
          if (country) params.set("country", country);
          if (region) params.set("region", region);
          markers = await loadMarkers(params);
          if (!country) {
            const nearbyMarkers = filterMarkersNearCenter(markers, 500);
            if (nearbyMarkers.length > 0) markers = nearbyMarkers;
          }
        }

        if (city) {
          const matched = markers.filter((m) => cityLabelsMatch(m.city, city));
          if (matched.length > 0) markers = matched;
        }

        if (fetchSeq !== individualFetchSeqRef.current) return;
        const lvl = currentLevelRef.current;
        const wantsIndividuals =
          lvl === "NONNA" ||
          (lvl === "CITY" && cityFilterFromClickRef.current);
        if (!wantsIndividuals) return;

        if (markers.length === 0 && city && cityFilterFromClickRef.current) {
          const cluster = findCityClusterFromLabel(
            allClustersRef.current,
            city,
            country,
            countryCode,
          );
          if (cluster) {
            setNonnaData([cluster]);
            return;
          }
          cityFilterFromClickRef.current = false;
          if (allClustersRef.current) {
            applyClusterLevel("CITY", allClustersRef.current);
          }
          return;
        }

        if (markers.length === 0) return;

        if (cityFilterFromClickRef.current && markers.length > 1) {
          markers = spreadOverlappingMarkers(markers);
        }
        setNonnaData(markers);
      } catch (err) {
        if (fetchSeq !== individualFetchSeqRef.current) return;
        console.error("[Earth3D] individual nonnas fetch error:", err);
      }
    },
    [applyClusterLevel, filterMarkersNearCenter],
  );

  const beginCityDrill = useCallback(
    (
      geocodedCity: string,
      options?: {
        region?: string | null;
        country?: string | null;
        countryCode?: string | null;
        lat?: number;
        lng?: number;
        zoomFactor?: number;
      },
    ) => {
      const country =
        options?.country ?? viewportCountryRef.current ?? undefined;
      const countryCode =
        options?.countryCode ?? viewportCountryCodeRef.current ?? undefined;
      const cluster = findCityClusterFromLabel(
        allClustersRef.current,
        geocodedCity,
        country ?? null,
        countryCode,
      );
      const dbCity = cluster?.city || geocodedCity;
      const dbRegion = cluster?.region ?? options?.region ?? null;

      viewportCityRef.current = dbCity;
      cityFilterFromClickRef.current = true;
      if (dbRegion) {
        viewportRegionRef.current = dbRegion;
        regionFilterFromClickRef.current = true;
      } else {
        regionFilterFromClickRef.current = false;
      }

      void fetchIndividualNonnas({
        city: dbCity,
        region: dbRegion || undefined,
      });

      const map3d = map3dRef.current;
      const flyLat = options?.lat ?? cluster?.lat;
      const flyLng = options?.lng ?? cluster?.lng;
      if (map3d && Number.isFinite(flyLat) && Number.isFinite(flyLng)) {
        const factor = options?.zoomFactor ?? 0.55;
        flightStateRef.current = {
          active: true,
          targetRange: ZOOM_RANGES.CITY * factor,
          targetLevel: "CITY",
          startTime: Date.now(),
          lastRanges: [],
        };
        map3d.flyCameraTo({
          endCamera: {
            center: { lat: flyLat!, lng: flyLng!, altitude: 0 },
            range: ZOOM_RANGES.CITY * factor,
            tilt: 65,
            heading: map3d.heading,
          },
          durationMillis: 1500,
        });
        setTimeout(() => {
          flightStateRef.current.active = false;
        }, 1700);
      }

      void fetchAndDrawBoundaryRef.current?.(
        dbCity,
        "city",
        countryCode,
        {
          countryName: country,
          centerLat: Number.isFinite(flyLat) ? flyLat : cluster?.lat,
          centerLng: Number.isFinite(flyLng) ? flyLng : cluster?.lng,
        },
      );
    },
    [fetchIndividualNonnas],
  );

  const getIndividualMarkerFilters = useCallback(
    () => ({
      city:
        cityFilterFromClickRef.current && viewportCityRef.current
          ? viewportCityRef.current
          : undefined,
      region:
        regionFilterFromClickRef.current && viewportRegionRef.current
          ? viewportRegionRef.current
          : undefined,
    }),
    [],
  );

  // Ref to store fetchAndDrawBoundary function for zoom-out highlighting
  const fetchAndDrawBoundaryRef = useRef<
    | ((
        name: string,
        featureType: "continent" | "country" | "state" | "city",
        countryCode?: string | null,
        drawOptions?: BoundaryDrawOptions,
      ) => Promise<void>)
    | null
  >(null);

  // When the user picks a search result we already know exactly what to
  // highlight. Suppress the level-change auto-highlight for one cycle so it
  // doesn't reverse-geocode the still-flying camera and overwrite the
  // user's actual selection with whatever happens to be under the lens.
  const suppressNextLevelHighlightRef = useRef(false);

  const drawContinentHighlight = useCallback((continentName: string) => {
    if (!continentName) return;
    viewportContinentRef.current = continentName;
    setClickedLabel(continentName);
    setActivePlaceName(continentName);
    void fetchAndDrawBoundaryRef.current?.(continentName, "continent");
  }, []);

  // Ref to track and cancel ongoing highlighting requests
  const highlightingRef = useRef<{
    controller: AbortController | null;
    timeoutId: NodeJS.Timeout | null;
    lastRequestTime: number;
  }>({
    controller: null,
    timeoutId: null,
    lastRequestTime: 0,
  });
  // Exposed by the map init effect so level-change handlers can trigger the
  // same pan-follow refresh that runs on drag.
  const followCenterHighlightRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!mapReady || !allClustersData) return;

    allClustersRef.current = {
      continents: allClustersData.continents ?? [],
      countries: allClustersData.countries ?? [],
      states: allClustersData.states ?? [],
      cities: allClustersData.cities ?? [],
    };

    const level = currentLevelRef.current;
    if (level === "NONNA") {
      void fetchIndividualNonnas(getIndividualMarkerFilters());
    } else if (level === "CITY") {
      if (cityFilterFromClickRef.current) {
        void fetchIndividualNonnas(getIndividualMarkerFilters());
      } else {
        applyClusterLevel("CITY", allClustersRef.current);
      }
    } else {
      applyClusterLevel(level, allClustersRef.current);
    }
  }, [
    mapReady,
    allClustersData,
    applyClusterLevel,
    fetchIndividualNonnas,
    getIndividualMarkerFilters,
  ]);

  useEffect(() => {
    if (continentsGeo) continentGeoJsonCacheRef.current = continentsGeo;
    if (countriesGeo) geoJsonCacheRef.current = countriesGeo;
    if (statesGeo) stateGeoJsonCacheRef.current = statesGeo;
  }, [continentsGeo, countriesGeo, statesGeo]);

  const refreshMarkersForLevel = useCallback(() => {
    const level = currentLevelRef.current;
    if (level === "NONNA") {
      void fetchIndividualNonnas(getIndividualMarkerFilters());
      return;
    }
    if (level === "CITY") {
      if (cityFilterFromClickRef.current) {
        void fetchIndividualNonnas(getIndividualMarkerFilters());
      } else if (allClustersRef.current) {
        applyClusterLevel("CITY", allClustersRef.current);
      }
      return;
    }
    if (allClustersRef.current) {
      applyClusterLevel(level, allClustersRef.current);
    }
  }, [applyClusterLevel, fetchIndividualNonnas, getIndividualMarkerFilters]);

  const updateViewportContext = useCallback(async () => {
    const map3d = map3dRef.current;
    const geocoder = geocoderRef.current;
    if (!map3d || !geocoder) return;

    const center = map3d.center;
    if (!center) return;
    const lat = Number(center.lat);
    const lng = Number(center.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    const level = currentLevelRef.current;
    if (level === "EARTH") {
      viewportCountryRef.current = null;
      viewportCountryCodeRef.current = null;
      viewportContinentRef.current = null;
      viewportRegionRef.current = null;
      viewportCityRef.current = null;
      refreshMarkersForLevel();
      return;
    }

    // At continent zoom the camera spans many countries — only track continent
    // here. Pinning country from map center (e.g. Poland) breaks COUNTRY-level
    // filters when the user zooms into France/Italy/UK.
    if (level === "CONTINENT") {
      viewportCountryRef.current = null;
      viewportCountryCodeRef.current = null;
      viewportRegionRef.current = null;
      viewportCityRef.current = null;

      try {
        const response = await geocoder.geocode({ location: { lat, lng } });
        const first = response?.results?.[0];
        if (first) {
          const info = parseAdminLevelsFromGeocodeResult(first);
          if (info.country) {
            const derived =
              getCountryInfoWithFallback(info.country).continent || null;
            if (derived) {
              viewportContinentRef.current = derived;
              drawContinentHighlight(derived);
            }
          }
        }
      } catch {
        // Geocode failed; keep previous viewport
      }

      refreshMarkersForLevel();
      return;
    }

    try {
      const response = await geocoder.geocode({ location: { lat, lng } });
      const first = response?.results?.[0];
      if (first) {
        const info = parseAdminLevelsFromGeocodeResult(first);
        const shouldPinCountry =
          level === "STATE" || level === "CITY" || level === "NONNA";
        if (info.country && shouldPinCountry) {
          // Keep country chosen from a cluster click while the camera is flying
          if (!flightStateRef.current.active || !viewportCountryRef.current) {
            viewportCountryRef.current = info.country;
            viewportCountryCodeRef.current = info.countryCode || null;
          }
          viewportContinentRef.current =
            getCountryInfoWithFallback(
              viewportCountryRef.current || info.country,
            ).continent || null;
        }
        // Do not set region/city from geocoder — names rarely match recipe.region/city.
        // Those refs are set from cluster clicks only (see regionFilterFromClickRef).
      }
    } catch {
      // Geocode failed; keep previous viewport
    }

    refreshMarkersForLevel();
  }, [drawContinentHighlight, refreshMarkersForLevel]);

  useEffect(() => {
    const level = currentLevel;
    const prev = previousLevel;
    if (level === "STATE" && prev !== "STATE") {
      if (!regionFilterFromClickRef.current) {
        viewportRegionRef.current = null;
      }
      cityFilterFromClickRef.current = false;
      viewportCityRef.current = null;
    }
    if (level === "CITY" && prev !== "CITY") {
      if (!cityFilterFromClickRef.current) {
        viewportCityRef.current = null;
      }
    }
    if (level === "COUNTRY" && prev !== "COUNTRY") {
      regionFilterFromClickRef.current = false;
      cityFilterFromClickRef.current = false;
      viewportRegionRef.current = null;
      viewportCityRef.current = null;
    }
    if (
      level === "STATE" ||
      level === "CITY" ||
      level === "NONNA"
    ) {
      void updateViewportContext();
      return;
    }
    refreshMarkersForLevel();
  }, [
    currentLevel,
    previousLevel,
    refreshMarkersForLevel,
    updateViewportContext,
  ]);

  useEffect(() => {
    if (!mapReady) return;
    const level = currentLevelRef.current;
    if (
      level !== "STATE" &&
      level !== "CITY" &&
      level !== "NONNA"
    ) {
      return;
    }
    const map3d = map3dRef.current;
    if (!map3d) return;

    let debounce: ReturnType<typeof setTimeout> | null = null;
    const onCenterChange = () => {
      if (flightStateRef.current.active) return;
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(() => {
        void updateViewportContext();
      }, 400);
    };

    map3d.addEventListener?.("gmp-centerchange", onCenterChange);
    return () => {
      if (debounce) clearTimeout(debounce);
      map3d.removeEventListener?.("gmp-centerchange", onCenterChange);
    };
  }, [currentLevel, mapReady, updateViewportContext]);

  // Handle cluster clicks - zoom to next level and open comment panel for single nonnas
  const handleClusterClick = useCallback(
    async (nonna: GlobeNonna, currentLevel: ZoomLevel) => {
      console.log(
        `[Earth3D] handleClusterClick called for ${currentLevel}:`,
        nonna.representativeName,
        nonna.nonnaCount,
      );

      try {
        // Determine the cluster level for API
        let clusterLevel: "continent" | "country" | "state" | "city";
        let clusterName: string;
        let countryCode: string | undefined;
        let closestCountry: string | undefined;
        let closestRegion: string | undefined;

        const clickedClusterLevel = nonna.clusterLevel;

        if (currentLevel === "EARTH") {
          clusterLevel =
            clickedClusterLevel === "continent" ? "continent" : "country";
          clusterName = nonna.countryName;
          countryCode =
            clickedClusterLevel === "continent" ? undefined : nonna.countryCode;
          closestCountry =
            clickedClusterLevel === "continent" ? undefined : nonna.countryName;
        } else if (currentLevel === "CONTINENT") {
          clusterLevel = "continent";
          clusterName = nonna.countryName;
        } else if (currentLevel === "COUNTRY") {
          clusterLevel =
            clickedClusterLevel === "country" ? "country" : "state";
          clusterName =
            clickedClusterLevel === "country"
              ? nonna.countryName
              : nonna.region || nonna.countryName;
          countryCode = nonna.countryCode;
          closestCountry = nonna.countryName;
        } else if (currentLevel === "STATE") {
          clusterLevel = "city";
          clusterName = nonna.city || nonna.region || nonna.countryName;
          countryCode = nonna.countryCode;
          closestCountry = nonna.countryName;
          closestRegion = nonna.region;
        } else if (currentLevel === "CITY") {
          clusterLevel = "city";
          clusterName = nonna.city || nonna.representativeName;
          countryCode = nonna.countryCode;
          closestCountry = nonna.countryName;
          closestRegion = nonna.region;
        } else {
          console.error(
            "[Earth3D] Invalid cluster level for click handling:",
            currentLevel,
          );
          return;
        }

        const closestQuery = new URLSearchParams({
          level: clusterLevel,
          name: clusterName,
        });
        if (countryCode) closestQuery.set("countryCode", countryCode);
        if (closestCountry) closestQuery.set("country", closestCountry);
        if (closestRegion) closestQuery.set("region", closestRegion);

        if (nonna.nonnaCount === 1 && nonna.recipeId) {
          const response = await fetch(
            `/api/nonnas/closest?${closestQuery.toString()}`,
          );

          if (!response.ok) {
            console.error("[Earth3D] Failed to fetch single nonna data");
            return;
          }

          const data = await response.json();
          const actualNonna = data.closestNonna;

          if (!actualNonna) {
            console.log("[Earth3D] No nonna data found");
            return;
          }

          // Check if Street View is available at this location
          const streetViewService = new window.google.maps.StreetViewService();
          streetViewService.getPanorama(
            {
              location: { lat: actualNonna.lat, lng: actualNonna.lng },
              radius: 50,
            },
            (data: any, status: any) => {
              if (status === window.google.maps.StreetViewStatus.OK) {
                // Street View is available - don't open comment panel, let Street View handle it
                console.log(
                  "[Earth3D] Street View available, not opening comment panel",
                );
              } else {
                // Street View not available - open comment panel as exception
                console.log(
                  "[Earth3D] Street View not available, opening comment panel as exception",
                );
                setCommentSection({
                  open: true,
                  recipeId: actualNonna.recipeId,
                  nonnaDisplayName: actualNonna.representativeName,
                  titleName: actualNonna.representativeTitle,
                  photo: actualNonna.representativePhoto || null,
                  countryCode: actualNonna.countryCode || "",
                });
              }
            },
          );

          // Zoom to CITY level using actual coordinates (so a tile is selected)
          const map3d = map3dRef.current;
          if (map3d) {
            const nextLevel = "CITY";

            // Update level immediately
            setLevel(nextLevel);
            currentLevelRef.current = nextLevel;

            // Set flight state
            flightStateRef.current = {
              active: true,
              targetRange: ZOOM_RANGES[nextLevel],
              targetLevel: nextLevel,
              startTime: Date.now(),
              lastRanges: [],
            };

            map3d.flyCameraTo({
              endCamera: {
                center: {
                  lat: actualNonna.lat,
                  lng: actualNonna.lng,
                  altitude: 0,
                },
                range: ZOOM_RANGES[nextLevel],
                tilt: 65,
                heading: map3d.heading,
              },
              durationMillis: 1500,
            });

            // Remember this nonna so the Street View button can re-enter facing her.
            currentNonnaRef.current = {
              lat: actualNonna.lat,
              lng: actualNonna.lng,
              recipeId: parseInt(actualNonna.recipeId.toString(), 10),
              name: actualNonna.representativeName,
              title: actualNonna.representativeTitle,
              photo: actualNonna.representativePhoto || null,
              countryName: actualNonna.countryName || "",
              countryCode: actualNonna.countryCode || "",
            };

            setTimeout(() => {
              flightStateRef.current.active = false;
            }, 1700);
          }
        } else {
          // City cluster drill: stay at CITY and show individual pins for that city.
          if (
            currentLevel === "CITY" &&
            nonna.nonnaCount > 1 &&
            (nonna.clusterLevel === "city" || nonna.city || clusterName)
          ) {
            beginCityDrill(nonna.city || clusterName, {
              region: nonna.region,
              country: nonna.countryName,
              countryCode: nonna.countryCode,
              lat: nonna.lat,
              lng: nonna.lng,
            });
            return;
          }

          // Multiple nonnas - get the closest one and zoom to next level
          console.log(
            "[Earth3D] Multiple nonnas in cluster - finding closest and zooming to next level",
          );

          const response = await fetch(
            `/api/nonnas/closest?${closestQuery.toString()}`,
          );

          if (!response.ok) {
            console.error("[Earth3D] Failed to fetch closest nonna");
            return;
          }

          const data = await response.json();
          const closestNonna = data.closestNonna;

          if (!closestNonna) {
            console.log("[Earth3D] No closest nonna found");
            return;
          }

          let nextLevel: ZoomLevel;
          if (currentLevel === "EARTH") {
            nextLevel = "CONTINENT";
            viewportContinentRef.current =
              nonna.clusterLevel === "continent"
                ? nonna.countryName
                : getCountryInfoWithFallback(nonna.countryName).continent;
            viewportCountryRef.current = null;
            viewportCountryCodeRef.current = null;
            viewportRegionRef.current = null;
            viewportCityRef.current = null;
            regionFilterFromClickRef.current = false;
            cityFilterFromClickRef.current = false;
          } else if (currentLevel === "CONTINENT") {
            nextLevel = "COUNTRY";
            viewportContinentRef.current = nonna.countryName;
            viewportCountryRef.current = null;
            viewportCountryCodeRef.current = null;
            viewportRegionRef.current = null;
            viewportCityRef.current = null;
            regionFilterFromClickRef.current = false;
            cityFilterFromClickRef.current = false;
          } else if (currentLevel === "COUNTRY") {
            nextLevel = "STATE";
            if (nonna.clusterLevel === "country") {
              viewportCountryRef.current = nonna.countryName;
              viewportCountryCodeRef.current = nonna.countryCode || null;
              viewportContinentRef.current = getCountryInfoWithFallback(
                nonna.countryName,
              ).continent;
              viewportRegionRef.current = null;
              regionFilterFromClickRef.current = false;
            } else {
              viewportRegionRef.current = nonna.region || clusterName;
              regionFilterFromClickRef.current = true;
            }
            viewportCityRef.current = null;
            cityFilterFromClickRef.current = false;
          } else if (currentLevel === "STATE") {
            nextLevel = "CITY";
            viewportRegionRef.current = nonna.region || clusterName;
            regionFilterFromClickRef.current = true;
            viewportCityRef.current = null;
            cityFilterFromClickRef.current = false;
          } else {
            nextLevel = "CITY";
          }

          setLevel(nextLevel);
          currentLevelRef.current = nextLevel;

          if (nextLevel === "CITY") {
            if (cityFilterFromClickRef.current) {
              void fetchIndividualNonnas(getIndividualMarkerFilters());
            } else if (allClustersRef.current) {
              applyClusterLevel("CITY", allClustersRef.current);
            }
          } else if (allClustersRef.current) {
            applyClusterLevel(nextLevel, allClustersRef.current);
          }

          // Set flight state
          flightStateRef.current = {
            active: true,
            targetRange: ZOOM_RANGES[nextLevel],
            targetLevel: nextLevel,
            startTime: Date.now(),
            lastRanges: [],
          };

          // Zoom to the cluster marker position (same coords as city pins)
          const map3d = map3dRef.current;
          if (map3d) {
            map3d.flyCameraTo({
              endCamera: {
                center: {
                  lat: nonna.lat,
                  lng: nonna.lng,
                  altitude: 0,
                },
                range: ZOOM_RANGES[nextLevel],
                tilt: nextLevel === "CITY" ? 65 : 0,
                heading: map3d.heading,
              },
              durationMillis: 1500,
            });

            setTimeout(() => {
              flightStateRef.current.active = false;
              if (nextLevel === "CONTINENT" && viewportContinentRef.current) {
                drawContinentHighlight(viewportContinentRef.current);
              }
            }, 1700);
          }

          console.log(
            "[Earth3D] Zoomed to next level without opening comment panel",
          );
        }
      } catch (error) {
        console.error("[Earth3D] Error handling cluster click:", error);
      }
    },
    [
      setLevel,
      setPanel,
      setCommentSection,
      fetchIndividualNonnas,
      beginCityDrill,
      getIndividualMarkerFilters,
      applyClusterLevel,
      drawContinentHighlight,
    ],
  );

  // 3D tilt on deep zoom
  useEffect(() => {
    if (!mapReady || !map3dRef.current || flightStateRef.current.active) return;
    const map3d = map3dRef.current;
    if (currentLevel === "CITY" || currentLevel === "NONNA") {
      setIs3DMode(true);
      if (map3d.tilt < 10) {
        map3d.flyCameraTo({
          endCamera: {
            center: map3d.center,
            range: map3d.range,
            heading: map3d.heading,
            tilt: 65,
          },
          durationMillis: 800,
        });
      }
    } else {
      setIs3DMode(false);
      if (map3d.tilt > 10) {
        map3d.flyCameraTo({
          endCamera: {
            center: map3d.center,
            range: map3d.range,
            heading: map3d.heading,
            tilt: 0,
          },
          durationMillis: 800,
        });
      }
    }
  }, [currentLevel, mapReady]);

  // Sync 2D/3D toggle with actual map tilt
  useEffect(() => {
    if (!mapReady || !map3dRef.current) return;

    const checkTilt = () => {
      const map3d = map3dRef.current;
      if (map3d) {
        const currentTilt = Number(map3d.tilt) || 0;
        setIs3DMode(currentTilt > 10);
      }
    };

    // Check immediately
    checkTilt();

    const map3d = map3dRef.current;
    map3d.addEventListener?.("gmp-centerchange", checkTilt);
    const interval = setInterval(checkTilt, 2000);

    return () => {
      map3d.removeEventListener?.("gmp-centerchange", checkTilt);
      clearInterval(interval);
    };
  }, [mapReady]);
  // Conditional labels for country names
  useEffect(() => {
    if (!mapReady || !map3dRef.current) return;
    const map3d = map3dRef.current;
    const deepLevels = ["CONTINENT", "COUNTRY", "STATE", "CITY", "NONNA"];
    const enableLabels = deepLevels.includes(currentLevel);

    if (enableLabels) {
      map3d.mode = "HYBRID"; // Use satellite base with labels

      // Disable all road labels
      map3d.setAttribute("road-labels-mode", "none");
      map3d.setAttribute("transit-labels-mode", "none");
      map3d.setAttribute("highway-labels-mode", "none");
      map3d.setAttribute("arterial-labels-mode", "none");
      map3d.setAttribute("local-road-labels-mode", "none");
      // DISABLE city/POI markers but KEEP text labels
      map3d.setAttribute("poi-labels-mode", "none"); // Removes POI markers
      map3d.setAttribute("city-labels-mode", "text-only"); // Show city text labels only, no markers
      map3d.setAttribute("country-labels-mode", "text-only"); // Show country text labels only, no markers
    } else {
      map3d.mode = "SATELLITE";
      // Ensure all labels are disabled at high zoom levels
      map3d.setAttribute("default-labels-disabled", "");
      map3d.setAttribute("road-labels-mode", "none");
      map3d.setAttribute("transit-labels-mode", "none");
      map3d.setAttribute("poi-labels-mode", "none");
      map3d.setAttribute("city-labels-mode", "none");
      map3d.setAttribute("country-labels-mode", "none");
    }
  }, [currentLevel, mapReady]);

  // Zoom-out highlighting: Detect level changes and highlight boundaries when zooming out
  // Level change highlighting: Detect level changes and highlight boundaries for both zoom-in and zoom-out
  useEffect(() => {
    if (!mapReady || !map3dRef.current || !geocoderRef.current) return;

    const levels: ZoomLevel[] = [
      "EARTH",
      "CONTINENT",
      "COUNTRY",
      "STATE",
      "CITY",
      "NONNA",
    ];
    const currentIdx = levels.indexOf(currentLevel);
    const prevIdx = previousLevel ? levels.indexOf(previousLevel) : -1;

    // Function to handle highlighting for any level change (zoom in or out)
    const highlightBoundaryForLevelChange = async (
      direction: "zoom-in" | "zoom-out",
    ) => {
      // Cancel any previous highlighting request
      if (highlightingRef.current.controller) {
        highlightingRef.current.controller.abort();
      }
      if (highlightingRef.current.timeoutId) {
        clearTimeout(highlightingRef.current.timeoutId);
      }

      // Create new abort controller for this request
      const controller = new AbortController();
      highlightingRef.current.controller = controller;

      // Debounce the highlighting request
      const now = Date.now();
      const timeSinceLastRequest =
        now - highlightingRef.current.lastRequestTime;
      const DEBOUNCE_DELAY = 300; // 300ms debounce

      // Get current map center location with better accuracy
      const map3d = map3dRef.current;
      if (!map3d) return;

      // Wait for programmatic flights (cluster clicks, level pills) to finish
      const flightWaitStart = Date.now();
      while (
        flightStateRef.current.active &&
        Date.now() - flightWaitStart < 2500
      ) {
        if (controller.signal.aborted) return;
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      // Wait a brief moment for map to settle after zoom change
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Check if this request was cancelled
      if (controller.signal.aborted) return;

      const center = map3d.center;
      if (!center) return;

      const lat = Number(center.lat);
      const lng = Number(center.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

      setCurrentLocation({ lat, lng });
      highlightingRef.current.lastRequestTime = Date.now();

      try {
        const response = await geocoderRef.current.geocode({
          location: { lat, lng },
        });

        // Check if this request was cancelled during geocoding
        if (controller.signal.aborted) return;

        const first = response?.results?.[0];

        if (!first) return;

        const info = parseAdminLevelsFromGeocodeResult(first);
        let targetName: string | null = null;
        let featureType: "continent" | "country" | "state" | "city" | null =
          null;

        if (direction === "zoom-out") {
          // Zoom-out logic: highlight the current level's boundary (regardless of how many levels were skipped)
          console.log(
            `[Earth3D] ${direction} - Highlighting for current level:`,
            currentLevel,
          );

          // Always highlight the current level's boundary when zooming out
          if (currentLevel === "STATE") {
            targetName = info.state;
            featureType = "state";
          } else if (currentLevel === "COUNTRY") {
            targetName = info.country;
            featureType = "country";
          } else if (currentLevel === "CONTINENT") {
            targetName =
              viewportContinentRef.current ||
              (info.country
                ? getCountryInfoWithFallback(info.country).continent || null
                : null);
            featureType = "continent";
          }
          // Don't highlight for CITY or EARTH levels when zooming out
        } else {
          // Zoom-in logic: highlight the current level's boundary (regardless of how many levels were skipped)
          console.log(
            `[Earth3D] ${direction} - Highlighting for current level:`,
            currentLevel,
          );

          // Always highlight the current level's boundary when zooming in
          if (currentLevel === "CONTINENT") {
            targetName =
              viewportContinentRef.current ||
              (info.country
                ? getCountryInfoWithFallback(info.country).continent || null
                : null);
            featureType = "continent";
          } else if (currentLevel === "COUNTRY") {
            targetName = info.country;
            featureType = "country";
          } else if (currentLevel === "STATE") {
            targetName = info.state;
            featureType = "state";
          } else if (currentLevel === "CITY") {
            const cityComponent = first.address_components?.find(
              (c: any) =>
                c.types?.includes("locality") ||
                c.types?.includes("administrative_area_level_2"),
            );
            targetName = cityComponent?.long_name || null;
            featureType = "city";

            // Fallback: if no city found, try to use the most specific administrative level
            if (!targetName && first.address_components) {
              const adminLevels = [
                "administrative_area_level_3",
                "administrative_area_level_2",
                "administrative_area_level_1",
              ];
              for (const level of adminLevels) {
                const component = first.address_components.find((c: any) =>
                  c.types?.includes(level),
                );
                if (component?.long_name) {
                  targetName = component.long_name;
                  console.log(
                    `[Earth3D] CITY level - Fallback to ${level}:`,
                    targetName,
                  );
                  break;
                }
              }
            }

            // Final fallback: If geocoder only returned plus_code or no address, use reverse geocoding with broader search
            if (
              !targetName &&
              (!first.address_components ||
                first.address_components.length === 1)
            ) {
              console.log(
                `[Earth3D] CITY level - Geocoder returned insufficient data, trying reverse geocoding fallback`,
              );

              try {
                // Try reverse geocoding with administrative area focus
                const fallbackResponse = await geocoderRef.current.geocode({
                  location: { lat, lng },
                  types: [
                    "administrative_area_level_2",
                    "administrative_area_level_3",
                    "locality",
                  ],
                });

                if (fallbackResponse?.results?.[0]) {
                  const fallbackResult = fallbackResponse.results[0];
                  const fallbackCityComponent =
                    fallbackResult.address_components?.find(
                      (c: any) =>
                        c.types?.includes("locality") ||
                        c.types?.includes("administrative_area_level_2") ||
                        c.types?.includes("administrative_area_level_3"),
                    );

                  if (fallbackCityComponent?.long_name) {
                    targetName = fallbackCityComponent.long_name;
                    console.log(
                      `[Earth3D] CITY level - Fallback geocoding found:`,
                      targetName,
                    );
                  } else {
                    // Last resort: use the formatted address or place name
                    targetName =
                      fallbackResult.formatted_address?.split(",")[0] ||
                      fallbackResult.name ||
                      null;
                    console.log(
                      `[Earth3D] CITY level - Last resort fallback:`,
                      targetName,
                    );
                  }
                }
              } catch (fallbackError) {
                console.warn(
                  `[Earth3D] CITY level - Fallback geocoding failed:`,
                  fallbackError,
                );
              }
            }
          }
          // Don't highlight for EARTH or NONNA levels when zooming in
        }

        // Final check before making the API call
        if (controller.signal.aborted) return;

        if (targetName && featureType && fetchAndDrawBoundaryRef.current) {
          console.log(
            `[Earth3D] ${direction} highlighting:`,
            targetName,
            featureType,
          );
          fetchAndDrawBoundaryRef.current(
            targetName,
            featureType,
            featureType === "state" || featureType === "city"
              ? info.countryCode
              : undefined,
          );

          // Also open discussion panel with latest data for zoom highlighting
          const fetchAndOpenDiscussionPanel = async () => {
            try {
              let regionDisplayName = targetName;

              if (featureType === "city") {
                // For cities, show: City, State, Country or City, Country
                if (info.state && info.country) {
                  regionDisplayName = `${info.country} • ${info.state} • ${targetName}`;
                } else if (info.country) {
                  regionDisplayName = `${info.country} • ${targetName}`;
                }
              } else if (featureType === "state") {
                regionDisplayName = `${info.country || "Unknown Country"} • ${targetName}`;
              } else if (featureType === "country") {
                regionDisplayName = targetName;
              } else if (featureType === "continent") {
                regionDisplayName = targetName;
              }

              // Fetch nonnas based on feature type
              let url = "/api/recipes?published=true";

              if (featureType === "continent") {
                // Get continent from country using countryData
                const { getCountryInfoWithFallback } =
                  await import("@/lib/countryData");
                const continent = getCountryInfoWithFallback(
                  info.country || "",
                ).continent;
                url += `&continent=${encodeURIComponent(continent)}`;
              } else if (featureType === "country") {
                url += `&country=${encodeURIComponent(info.country || "")}`;
              } else if (featureType === "state") {
                url += `&country=${encodeURIComponent(info.country || "")}`;
                url += `&region=${encodeURIComponent(targetName)}`;
              } else if (featureType === "city") {
                url += `&country=${encodeURIComponent(info.country || "")}`;
                if (info.state) {
                  url += `&region=${encodeURIComponent(info.state)}`;
                }
                url += `&city=${encodeURIComponent(targetName)}`;
              }

              const response = await fetch(url);
              const data = await response.json();
              const nonnas = mapRecipesToPanelNonnas(data.recipes || []);

              console.log(
                `[Earth3D] ${direction} - Opening discussion panel for:`,
                targetName,
                "with",
                nonnas.length,
                "nonnas",
              );

              // Update discussion panel data, keep it open if already open
              setPanel((prev) => ({
                ...prev,
                region: targetName,
                regionDisplayName,
                scope: featureType as any,
                country: info.country || undefined,
                state: info.state || undefined,
                city: featureType === "city" ? targetName : undefined,
                nonnas,
                initialTab: "discussion",
              }));

              // Update active place info
              setActivePlaceName(targetName);
              setActiveCountry(info.country || null);
              setClickedLabel(targetName);
            } catch (error) {
              console.error(
                `[Earth3D] ${direction} - Error fetching discussion data:`,
                error,
              );
            }
          };

          // Fetch discussion data in parallel with boundary drawing
          fetchAndOpenDiscussionPanel();
        }
      } catch (err) {
        // Don't log errors for aborted requests
        if (err instanceof Error && err.name === "AbortError") {
          console.log(`[Earth3D] ${direction} highlighting request cancelled`);
        } else {
          console.error(`[Earth3D] ${direction} highlighting error:`, err);
        }
      } finally {
        // Clean up the controller reference
        if (highlightingRef.current.controller === controller) {
          highlightingRef.current.controller = null;
        }
      }
    };

    // If a search just drove this level change, the search handler has already
    // applied the correct highlight. Skip the auto reverse-geocode entirely so
    // it can't overwrite the user's actual selection with whatever the still-
    // flying camera happens to be over.
    if (suppressNextLevelHighlightRef.current) {
      suppressNextLevelHighlightRef.current = false;
      setPreviousLevel(currentLevel);
      return;
    }

    // Check if we're zooming out (moving to a higher level index)
    if (prevIdx !== -1 && currentIdx < prevIdx) {
      console.log(
        "[Earth3D] Zoom out detected:",
        previousLevel,
        "→",
        currentLevel,
      );
      highlightBoundaryForLevelChange("zoom-out");
    }
    // Check if we're zooming in (moving to a deeper level index)
    else if (prevIdx !== -1 && currentIdx > prevIdx) {
      console.log(
        "[Earth3D] Zoom in detected:",
        previousLevel,
        "→",
        currentLevel,
      );
      highlightBoundaryForLevelChange("zoom-in");
    }
    // Also handle direct level changes (when prevIdx is -1 or levels jump significantly)
    else if (prevIdx === -1 || Math.abs(currentIdx - prevIdx) > 1) {
      console.log(
        "[Earth3D] Level change detected:",
        previousLevel,
        "→",
        currentLevel,
      );
      // Determine direction based on level indices
      if (prevIdx === -1) {
        // First time setting level, don't trigger highlighting
        console.log("[Earth3D] Initial level set, no highlighting");
      } else if (currentIdx < prevIdx) {
        highlightBoundaryForLevelChange("zoom-out");
      } else if (currentIdx > prevIdx) {
        highlightBoundaryForLevelChange("zoom-in");
      }
    }

    // After any level change, refocus the highlight + discussion pill on
    // whatever is actually centered now (uses the same path as drag-pan).
    // Small debounce so a flurry of scroll-wheel ticks resolves to one fetch.
    if (prevIdx !== -1 && prevIdx !== currentIdx) {
      const highlightDelay =
        currentLevel === "CONTINENT" ? 1800 : 250;
      const t = setTimeout(() => {
        followCenterHighlightRef.current?.();
      }, highlightDelay);
      // Update previous level for next change detection
      setPreviousLevel(currentLevel);
      return () => clearTimeout(t);
    }

    // Update previous level for next change detection
    setPreviousLevel(currentLevel);
  }, [currentLevel, mapReady, previousLevel]);

  // Place nonna markers
  useEffect(() => {
    if (!nonnaData.length || !mapReady || !map3dRef.current) {
      return;
    }

    const map3d = map3dRef.current;
    let cancelled = false;
    (async () => {
      try {
        const { Marker3DInteractiveElement } =
          await window.google.maps.importLibrary("maps3d");
        const nextMarkers: any[] = [];
        for (const nonna of nonnaData) {
          if (cancelled) return;
          try {
            if (!Number.isFinite(nonna.lat) || !Number.isFinite(nonna.lng)) {
              continue;
            }
            const avatarUri = generateAvatarSvgUri(
              nonna.representativeName || nonna.countryName,
              nonna.countryCode,
            );
            const level = currentLevelRef.current;
            const isCityZoom = level === "CITY" || level === "NONNA";
            const showAvatar =
              level === "NONNA" ||
              (isCityZoom &&
                (cityFilterFromClickRef.current ||
                  nonna.clusterLevel === "nonna") &&
                nonna.nonnaCount === 1);
            const markerMode = showAvatar
              ? ("avatar" as const)
              : ("bubble" as const);
            const pinLabel =
              level === "COUNTRY" || level === "STATE" || level === "CITY"
                ? nonna.city || nonna.region || nonna.countryName
                : nonna.countryName;
            let photoUrl = nonna.representativePhoto;
            if (!photoUrl && showAvatar && nonna.recipeId) {
              try {
                const res = await fetch(
                  `/api/recipes?published=true&id=${nonna.recipeId}`,
                );
                const data = await res.json();
                const recipe = data?.recipes?.[0] || data?.[0];
                photoUrl =
                  recipe?.avatar_image ||
                  (Array.isArray(recipe?.photo) ? recipe.photo[0] : null) ||
                  null;
              } catch {
                // Keep initials fallback
              }
            }
            const tplCompact = await buildMarkerTemplate({
              name: nonna.representativeName,
              photoUrl,
              avatarUri,
              countryCode: nonna.countryCode,
              countryName: pinLabel,
              nonnaCount: nonna.nonnaCount,
              expanded: showAvatar,
              mode: markerMode,
              zoomLevel: level,
            });
            if (cancelled) return;
            const marker = new Marker3DInteractiveElement({
              position: { lat: nonna.lat, lng: nonna.lng, altitude: 0 },
              altitudeMode: "RELATIVE_TO_GROUND",
            } as any);
            marker.setAttribute("data-marker", "nonna");
            marker.setAttribute("data-nonna-name", nonna.representativeName);
            marker.append(tplCompact.cloneNode(true));
            nextMarkers.push(marker);

            // Remove tooltip on mouseover
            marker.addEventListener("mouseover", (e: Event) => {
              const target = e.target as Element;
              if (target) {
                target.removeAttribute("title");
                // Also check parent element for Edge compatibility
                if (target.parentElement) {
                  target.parentElement.removeAttribute("title");
                }
              }
            });

            marker.addEventListener("gmp-click", (e: Event) => {
              // Avatar mode: distinguish circle vs name card. Bubble mode: skip the
              // strict circle test — scaled bubble radii vary by zoom; the test
              // used fixed radii that don't match buildMarkerTemplate's dynamic
              // bubbleRadius and mis-maps under 3D, so clicks on the bubble were
              // ignored and the map handled the click instead (breaking single-nonna
              // zoom-to-city).
              const svgElement = marker.querySelector("svg");
              if (svgElement && markerMode === "avatar") {
                const clickEvent = e as any;
                const rect = svgElement.getBoundingClientRect();

                if (clickEvent.clientX && clickEvent.clientY) {
                  const svgX = clickEvent.clientX - rect.left;
                  const svgY = clickEvent.clientY - rect.top;

                  const viewBox = svgElement
                    .getAttribute("viewBox")
                    ?.split(" ")
                    .map(Number);
                  if (viewBox) {
                    const [vbX, vbY, vbW, vbH] = viewBox;
                    const actualX = (svgX / rect.width) * vbW + vbX;
                    const actualY = (svgY / rect.height) * vbH + vbY;

                    const cx = vbW / 2;
                    const cy = vbH / 2;
                    const aR = Math.min(vbW, vbH) / 2 - 12;

                    const distance = Math.sqrt(
                      Math.pow(actualX - cx, 2) + Math.pow(actualY - cy, 2),
                    );

                    const markerRadius = aR;
                    const effectiveRadius = markerRadius + 10;

                    if (distance > effectiveRadius) {
                      console.log(
                        "[Earth3D] Click outside marker radius:",
                        distance,
                        "vs",
                        effectiveRadius,
                        "- ignoring",
                      );
                      return;
                    }
                  }
                }
              }

              if (nonna.nonnaCount > 1) {
                e.stopPropagation();
                e.preventDefault();
                if (!cancelled) {
                  void handleClusterClick(nonna, currentLevelRef.current);
                }
                return;
              }

              if (nonna.nonnaCount === 1 && nonna.recipeId) {
                const recipeId = nonna.recipeId.toString();
                e.stopPropagation();
                e.preventDefault();

                if (!cancelled) {
                  // Check if comment section is already open for this same nonna
                  if (
                    commentSection.open &&
                    commentSection.recipeId === parseInt(recipeId, 10)
                  ) {
                    // Close the comment section if clicking the same nonna
                    setCommentSection({
                      ...commentSection,
                      open: false,
                      recipeId: 0,
                    });
                    return; // Prevent street view activation from reopening it
                  } else {
                    if (
                      currentLevelRef.current === "CITY" ||
                      currentLevelRef.current === "COUNTRY" ||
                      currentLevelRef.current === "STATE" ||
                      currentLevelRef.current === "CONTINENT" ||
                      currentLevelRef.current === "EARTH"
                    ) {
                      console.log(
                        `[Earth3D] Single nonna clicked at ${currentLevelRef.current} - activating Street View`,
                      );

                      // Fetch real nonna coordinates and activate Street View
                      (async () => {
                        let targetLat = nonna.lat;
                        let targetLng = nonna.lng;
                        let resolvedPhoto: string | null =
                          nonna.representativePhoto || null;

                        try {
                          const res = await fetch(
                            `/api/recipes?published=true&id=${recipeId}`,
                          );
                          const data = await res.json();
                          const recipe = data?.recipes?.[0] || data?.[0];
                          if (recipe?.coordinates) {
                            const parts =
                              typeof recipe.coordinates === "string"
                                ? recipe.coordinates.split(",").map(Number)
                                : null;
                            if (
                              parts &&
                              parts.length === 2 &&
                              isFinite(parts[0]) &&
                              isFinite(parts[1])
                            ) {
                              targetLat = parts[0];
                              targetLng = parts[1];
                            }
                          }
                          if (recipe) {
                            resolvedPhoto =
                              recipe.avatar_image ||
                              (Array.isArray(recipe.photo)
                                ? recipe.photo[0]
                                : null) ||
                              resolvedPhoto;
                          }
                        } catch (err) {
                          console.warn(
                            "[Earth3D] Failed to fetch nonna coords, using cluster coords",
                            err,
                          );
                        }

                        // Remember this nonna so the Street View button can re-enter facing her.
                        currentNonnaRef.current = {
                          lat: targetLat,
                          lng: targetLng,
                          recipeId: parseInt(recipeId, 10),
                          name: nonna.representativeName,
                          title: nonna.representativeTitle,
                          photo: resolvedPhoto,
                          countryName: nonna.countryName || "",
                          countryCode: nonna.countryCode || "",
                        };

                        // Activate Street View at the nonna's location with fallback
                        activateStreetViewAtRef.current(
                          targetLat,
                          targetLng,
                          currentNonnaRef.current,
                          () => {
                            // Fallback: Street View not available - open comment panel as exception
                            const currentLevel = currentLevelRef.current;
                            console.log(
                              "[Earth3D] Street View fallback triggered at level:",
                              currentLevel,
                              "- opening comment panel as exception",
                            );

                            // Open comment section regardless of current level (exception when Street View is not available)
                            setPanel((prev) => ({ ...prev, open: false }));

                            // Open comment section with nonna's data
                            setCommentSection({
                              open: true,
                              recipeId: currentNonnaRef.current?.recipeId || 0,
                              nonnaDisplayName:
                                currentNonnaRef.current?.name || "",
                              titleName: currentNonnaRef.current?.title || "",
                              photo: currentNonnaRef.current?.photo || null,
                              countryCode:
                                currentNonnaRef.current?.countryCode || "",
                            });

                            // Also zoom to CITY level if not already there for better context
                            if (currentLevel !== "CITY") {
                              const map3d = map3dRef.current;
                              if (map3d) {
                                setLevel("CITY");
                                currentLevelRef.current = "CITY";

                                flightStateRef.current = {
                                  active: true,
                                  targetRange: ZOOM_RANGES.CITY,
                                  targetLevel: "CITY",
                                  startTime: Date.now(),
                                  lastRanges: [],
                                };

                                map3d.flyCameraTo({
                                  endCamera: {
                                    center: {
                                      lat: targetLat,
                                      lng: targetLng,
                                      altitude: 0,
                                    },
                                    range: ZOOM_RANGES.CITY,
                                    tilt: 65,
                                    heading: map3d.heading,
                                  },
                                  durationMillis: 1500,
                                });

                                setTimeout(() => {
                                  flightStateRef.current.active = false;
                                }, 1700);
                              }
                            }
                          },
                        );
                      })();
                    } else {
                      // At other levels, close discussion panel if open, then open comment section
                      setPanel((prev) => ({ ...prev, open: false }));

                      // Zoom to CITY level after opening comment section (so a tile is selected)
                      const map3d = map3dRef.current;
                      if (map3d) {
                        const nextLevel = "CITY";

                        // Fetch real nonna coordinates (cluster coords may be region/country center)
                        (async () => {
                          let targetLat = nonna.lat;
                          let targetLng = nonna.lng;
                          // The clustering API computes repPhoto via coalesce(avatar_image, photo[2]),
                          // which is null for nonnas that only have a single photo. Pull the real
                          // photo from the recipe payload below so the marker + popup always show her.
                          let resolvedPhoto: string | null =
                            nonna.representativePhoto || null;

                          try {
                            const res = await fetch(
                              `/api/recipes?published=true&id=${recipeId}`,
                            );
                            const data = await res.json();
                            const recipe = data?.recipes?.[0] || data?.[0];
                            if (recipe?.coordinates) {
                              const parts =
                                typeof recipe.coordinates === "string"
                                  ? recipe.coordinates.split(",").map(Number)
                                  : null;
                              if (
                                parts &&
                                parts.length === 2 &&
                                isFinite(parts[0]) &&
                                isFinite(parts[1])
                              ) {
                                targetLat = parts[0];
                                targetLng = parts[1];
                              }
                            }
                            if (recipe) {
                              resolvedPhoto =
                                recipe.avatar_image ||
                                (Array.isArray(recipe.photo)
                                  ? recipe.photo[0]
                                  : null) ||
                                resolvedPhoto;
                            }
                          } catch (err) {
                            console.warn(
                              "[Earth3D] Failed to fetch nonna coords, using cluster coords",
                              err,
                            );
                          }

                          // Update level immediately
                          setLevel(nextLevel);
                          currentLevelRef.current = nextLevel;

                          // Set flight state
                          flightStateRef.current = {
                            active: true,
                            targetRange: ZOOM_RANGES[nextLevel],
                            targetLevel: nextLevel,
                            startTime: Date.now(),
                            lastRanges: [],
                          };

                          map3d.flyCameraTo({
                            endCamera: {
                              center: {
                                lat: targetLat,
                                lng: targetLng,
                                altitude: 0,
                              },
                              range: ZOOM_RANGES[nextLevel],
                              tilt: 65,
                              heading: map3d.heading,
                            },
                            durationMillis: 1500,
                          });

                          // Remember this nonna so the Street View button can re-enter facing her.
                          currentNonnaRef.current = {
                            lat: targetLat,
                            lng: targetLng,
                            recipeId: parseInt(recipeId, 10),
                            name: nonna.representativeName,
                            title: nonna.representativeTitle,
                            photo: resolvedPhoto,
                            countryName: nonna.countryName || "",
                            countryCode: nonna.countryCode || "",
                          };

                          setTimeout(() => {
                            flightStateRef.current.active = false;
                          }, 1700);
                        })();
                      }
                    }
                  }
                }
              }
            });
          } catch (markerErr) {
            console.warn(
              "[Earth3D] Failed to place marker:",
              nonna.id,
              markerErr,
            );
          }
        }
        if (cancelled) return;
        if (nextMarkers.length === 0) return;
        clearCurrentMarkers();
        for (const marker of nextMarkers) {
          map3d.append(marker);
        }
        currentMarkersRef.current = nextMarkers;
      } catch (err) {
        console.warn("[Earth3D] Marker3DInteractiveElement failed:", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [nonnaData, mapReady, currentLevel, clearCurrentMarkers]);
  // Zoom button handlers
  const handleZoomIn = useCallback(() => {
    if (!map3dRef.current) return;
    const map3d = map3dRef.current;
    const levels: ZoomLevel[] = [
      "EARTH",
      "CONTINENT",
      "COUNTRY",
      "STATE",
      "CITY",
      "NONNA",
    ];
    const idx = levels.indexOf(currentLevelRef.current);
    if (idx >= levels.length - 1) return;
    const next = levels[idx + 1];

    // Update level immediately to prevent flicker
    setLevel(next);
    currentLevelRef.current = next;

    // Set flight state to pause scroll-based detection during animation
    flightStateRef.current = {
      active: true,
      targetRange: ZOOM_RANGES[next],
      targetLevel: next,
      startTime: Date.now(),
      lastRanges: [],
    };

    map3d.flyCameraTo({
      endCamera: {
        center: map3d.center,
        range: ZOOM_RANGES[next],
        heading: map3d.heading,
        tilt: next === "CITY" || next === "NONNA" ? 65 : 0,
      },
      durationMillis: 1400,
    });
  }, [setLevel]);
  const handleZoomOut = useCallback(() => {
    if (!map3dRef.current) return;
    const map3d = map3dRef.current;
    const levels: ZoomLevel[] = [
      "EARTH",
      "CONTINENT",
      "COUNTRY",
      "STATE",
      "CITY",
      "NONNA",
    ];
    const idx = levels.indexOf(currentLevelRef.current);
    if (idx <= 0) return;
    const prev = levels[idx - 1];

    // Update level immediately to prevent flicker
    setLevel(prev);
    currentLevelRef.current = prev;

    // Set flight state to pause scroll-based detection during animation
    flightStateRef.current = {
      active: true,
      targetRange: ZOOM_RANGES[prev],
      targetLevel: prev,
      startTime: Date.now(),
      lastRanges: [],
    };

    map3d.flyCameraTo({
      endCamera: {
        center: map3d.center,
        range: ZOOM_RANGES[prev],
        heading: map3d.heading,
        tilt: 0,
      },
      durationMillis: 1400,
    });
  }, [setLevel]);
  // Main map init — waits for map container DOM (Overlays chunk) before mounting Map3D
  useEffect(() => {
    if (!mapContainerMounted) return;

    let mounted = true;
    let animationFrameId = 0;
    const listeners: Array<() => void> = [];
    // flightStateRef.current.active removed — use flightStateRef.current.active instead
    async function init() {
      const apiKey =
        process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "YOUR_API_KEY_HERE";
      if (!apiKey || apiKey === "YOUR_API_KEY_HERE") {
        console.error("Missing NEXT_PUBLIC_GOOGLE_MAPS_API_KEY");
        return;
      }
      await loadGoogleMaps(apiKey);
      if (!mounted || !containerRef.current) return;
      const { Map3DElement, Marker3DElement, Polygon3DElement } =
        await window.google.maps.importLibrary("maps3d");
      const { Geocoder } = await window.google.maps.importLibrary("geocoding");
      const geocoder = new Geocoder();
      geocoderRef.current = geocoder;
      const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID;
      const map3d = new Map3DElement({
        center: { lat: 20, lng: 0, altitude: 0 },
        range: 30000000,
        tilt: 0,
        heading: 0,
        mode: "HYBRID",
        ...(mapId ? { mapId } : {}),
      });

      // Enable single-finger gestures for mobile
      map3d.setAttribute("gesture-handling", "auto");

      // Suppress noisy map labels and default UI elements
      map3d.setAttribute("default-labels-disabled", "");
      map3d.setAttribute("default-ui-disabled", "");
      map3d.setAttribute("road-labels-mode", "none");
      map3d.setAttribute("transit-labels-mode", "none");
      map3d.setAttribute("poi-labels-mode", "none");
      map3d.setAttribute("highway-labels-mode", "none");
      map3d.setAttribute("arterial-labels-mode", "none");
      map3d.setAttribute("local-road-labels-mode", "none");
      containerRef.current.innerHTML = "";
      containerRef.current.appendChild(map3d);
      map3d.style.display = "block";
      map3d.style.width = "100%";
      map3d.style.height = "100%";
      // Force map resize after appending to ensure proper sizing
      setTimeout(() => {
        if (window.google && window.google.maps && window.google.maps.event) {
          window.google.maps.event.trigger(map3d, "resize");
        }
      }, 100);
      // Wait for map ready
      await new Promise<void>((resolve) => {
        const check = () => {
          if (map3d.center) resolve();
          else setTimeout(check, 100);
        };
        check();
      });
      map3dRef.current = map3d;
      setMapReady(true);

      // Boundary polygon helpers (teal)
      const polygonOverlays: RemovableOverlay[] = [];
      let activeHighlightName: string | null = null;
      let lastHoverName: string | null = null;
      let hoverTimer: NodeJS.Timeout | null = null;

      const clearPolygonOverlays = () => {
        for (const p of polygonOverlays) {
          try {
            p.remove();
          } catch {
            /**/
          }
        }
        polygonOverlays.length = 0;
        // Also clear hover polygons when clearing main overlays
        for (const p of hoverPolygonOverlays) {
          try {
            p.remove();
          } catch {
            /**/
          }
        }
        hoverPolygonOverlays.length = 0;
      };

      /**
       * Match Natural Earth admin-0 features by ISO code or any common label field.
       * Selection used to only check ADMIN/NAME/ISO_A2, so names like "United States"
       * missed while "United States of America" was in ADMIN — Nominatim fallback
       * then drew OSM outlines with longitude jumps → Polygon3D "ring around the globe".
       */
      const matchNeCountryFeature = (
        f: any,
        name: string,
        countryCode?: string | null,
      ): boolean => {
        const p = f.properties || {};
        const lName = name.toLowerCase().trim();
        const lCode = (countryCode || "").toLowerCase().trim();
        if (lCode) {
          if (p.ISO_A2?.toLowerCase() === lCode) return true;
          if (p.ISO_A3?.toLowerCase() === lCode) return true;
        }
        const nameFields = [
          p.ADMIN,
          p.NAME,
          p.NAME_LONG,
          p.SUBUNIT,
          p.BRK_NAME,
          p.NAME_SORT,
          p.NAME_EN,
        ];
        for (const field of nameFields) {
          if (typeof field === "string" && field.toLowerCase() === lName)
            return true;
        }
        return false;
      };

      const loadCountryGeoJson = async () => {
        if (!geoJsonCacheRef.current) {
          const res = await fetch("/geo/ne_admin0_countries.geojson");
          geoJsonCacheRef.current = await res.json();
        }
        return geoJsonCacheRef.current;
      };

      const geometryToMultiPolygonCoordinates = (
        geometry: any,
      ): number[][][][] => {
        if (!geometry) return [];
        if (geometry.type === "Polygon") return [geometry.coordinates];
        if (geometry.type === "MultiPolygon") return geometry.coordinates;
        return [];
      };

      const getContinentGeometryWithSupplements = async (
        continentName: string,
        baseGeometry: any,
      ) => {
        const coordinates = [
          ...geometryToMultiPolygonCoordinates(baseGeometry),
        ];

        // The pre-cut Europe continent file excludes the British Isles, so add
        // those country geometries from the same local Natural Earth source.
        const supplementalCodesByContinent: Record<string, string[]> = {
          Europe: ["GB", "IE"],
        };
        const supplementalCodes = supplementalCodesByContinent[continentName];
        if (!supplementalCodes?.length) {
          return baseGeometry;
        }

        const continentCodes = new Set(
          getCountryCodesByContinent(continentName),
        );
        const codes = new Set(
          supplementalCodes.filter((code) => continentCodes.has(code)),
        );
        if (!codes.size) return baseGeometry;

        try {
          const fc = await loadCountryGeoJson();
          fc.features.forEach((feature: any) => {
            const code = feature.properties?.ISO_A2;
            if (!code || !codes.has(code)) return;
            coordinates.push(
              ...geometryToMultiPolygonCoordinates(feature.geometry),
            );
          });
        } catch (err) {
          console.warn(
            "[Earth3D] Continent supplement GeoJSON load failed:",
            err,
          );
        }

        return {
          type: "MultiPolygon",
          coordinates,
        };
      };

      const fetchAndDrawBoundary = async (
        name: string,
        featureType: "continent" | "country" | "state" | "city",
        countryCode?: string | null,
        drawOptions?: BoundaryDrawOptions,
      ) => {
        console.log(
          "[Earth3D] Fetching boundary for",
          name,
          featureType,
          countryCode,
        );

        try {
          // Continents have a known, pre-cut local source — never round-trip
          // through Nominatim (which returns either nothing useful or a giant
          // Point that triggers the bad fallback path).
          let geojson: any = null;
          const fallbackLat = drawOptions?.centerLat;
          const fallbackLng = drawOptions?.centerLng;
          if (featureType === "continent") {
            try {
              if (!continentGeoJsonCacheRef.current) {
                const cRes = await fetch("/geo/ne_continents.geojson");
                continentGeoJsonCacheRef.current = await cRes.json();
              }
              const cFc = continentGeoJsonCacheRef.current;
              const target = name.toLowerCase();
              const cFeature = cFc.features.find(
                (f: any) =>
                  (f.properties?.CONTINENT || "").toLowerCase() === target,
              );
              if (cFeature?.geometry) {
                geojson = await getContinentGeometryWithSupplements(
                  name,
                  cFeature.geometry,
                );
                console.log(
                  "[Earth3D] Loaded continent boundary from ne_continents:",
                  name,
                );
              } else {
                console.warn(
                  "[Earth3D] Continent not found in ne_continents:",
                  name,
                );
                return;
              }
            } catch (geoErr) {
              console.warn("[Earth3D] Continent GeoJSON load failed:", geoErr);
              return;
            }
          }

          // Countries / states: prefer the local Natural Earth files first
          // (already antimeridian-safe and complete), only fall through to
          // Nominatim if the lookup misses. This kills the USA / Russia "ring
          // across the globe" problem and the rate-limited / fuzzy state
          // matching at the data-source layer.
          let geojsonFromTrustedLocal = false;
          if (featureType === "country") {
            try {
              if (!geoJsonCacheRef.current) {
                const geoRes = await fetch("/geo/ne_admin0_countries.geojson");
                geoJsonCacheRef.current = await geoRes.json();
              }
              const fc = geoJsonCacheRef.current;
              const feature = fc.features.find((f: any) =>
                matchNeCountryFeature(f, name, countryCode),
              );
              if (feature?.geometry) {
                geojson = feature.geometry;
                geojsonFromTrustedLocal = true;
                console.log("[Earth3D] Country from local GeoJSON:", name);
              }
            } catch (geoErr) {
              console.warn(
                "[Earth3D] Local country GeoJSON load failed:",
                geoErr,
              );
            }
          } else if (featureType === "state") {
            try {
              if (!stateGeoJsonCacheRef.current) {
                const sRes = await fetch("/geo/ne_states_slim.geojson");
                stateGeoJsonCacheRef.current = await sRes.json();
              }
              const sFc = stateGeoJsonCacheRef.current;
              const target = name.toLowerCase();
              const cc = (countryCode || "").toLowerCase();
              // Match by name (or English alias) AND, when known, by country
              // code — that disambiguates duplicates like "Georgia" (US/Country).
              const feature = sFc.features.find((f: any) => {
                const p = f.properties || {};
                const nameMatches =
                  (p.name || "").toLowerCase() === target ||
                  (p.name_en || "").toLowerCase() === target;
                if (!nameMatches) return false;
                if (cc && p.iso_a2) return p.iso_a2.toLowerCase() === cc;
                return true;
              });
              if (feature?.geometry) {
                geojson = feature.geometry;
                geojsonFromTrustedLocal = true;
                console.log("[Earth3D] State from local GeoJSON:", name);
              }
            } catch (geoErr) {
              console.warn(
                "[Earth3D] Local state GeoJSON load failed:",
                geoErr,
              );
            }
          }

          // For state/city — and country if the local file missed — query Nominatim.
          if (!geojson && featureType !== "continent") {
            const countryLabel = resolveCountryDisplayName(
              drawOptions?.countryName ?? viewportCountryRef.current,
              countryCode,
            );

            const fetchNominatim = async (query: URLSearchParams) => {
              const proxyUrl = `/api/nominatim-proxy?${query.toString()}`;
              const res = await fetch(proxyUrl);
              if (!res.ok) {
                throw new Error(`Proxy HTTP ${res.status}`);
              }
              const data = await res.json();
              if (data?.error) return null;
              return data?.[0] as
                | {
                    geojson?: { type: string; coordinates?: unknown };
                    boundingbox?: string[];
                    lat?: string;
                    lon?: string;
                  }
                | undefined;
            };

            if (featureType === "city") {
              const queries: URLSearchParams[] = [];
              const base = new URLSearchParams({
                polygon_geojson: "1",
                format: "json",
                limit: "1",
              });
              if (countryLabel) {
                const q1 = new URLSearchParams(base);
                q1.set("q", `${name}, ${countryLabel}`);
                if (countryCode) {
                  q1.set("countrycodes", countryCode.toLowerCase());
                }
                queries.push(q1);
              }
              const q2 = new URLSearchParams(base);
              q2.set("city", name);
              if (countryCode) {
                q2.set("countrycodes", countryCode.toLowerCase());
              }
              queries.push(q2);

              for (const params of queries) {
                console.log(
                  "[Earth3D] Nominatim city fetch:",
                  params.toString(),
                );
                try {
                  const item = await fetchNominatim(params);
                  const resolved = geometryFromNominatimResult(
                    item ?? undefined,
                    fallbackLat,
                    fallbackLng,
                  );
                  if (resolved) {
                    geojson = resolved;
                    break;
                  }
                } catch (nomErr) {
                  console.warn("[Earth3D] Nominatim city attempt failed:", nomErr);
                }
              }

              if (
                !geojson &&
                Number.isFinite(fallbackLat) &&
                Number.isFinite(fallbackLng)
              ) {
                geojson = circlePolygonGeoJson(fallbackLat!, fallbackLng!, 10);
                console.log(
                  "[Earth3D] City highlight fallback circle at",
                  name,
                );
              }
            } else {
              const params = new URLSearchParams({
                polygon_geojson: "1",
                format: "json",
                limit: "1",
              });
              if (featureType === "country") {
                params.set("q", name);
                params.set("featuretype", "country");
              } else if (featureType === "state") {
                params.set("featuretype", "state");
                params.set("state", name);
                if (countryCode) {
                  params.set("countrycodes", countryCode.toLowerCase());
                }
              }
              console.log(
                "[Earth3D] Nominatim fetch params:",
                params.toString(),
              );
              const item = await fetchNominatim(params);
              if (featureType === "country" || featureType === "state") {
                geojson = item?.geojson;
                if (geojson?.type === "Point") geojson = null;
              }
            }
          }

          if (!geojson) {
            console.warn(
              "[Earth3D] No polygon boundary available for",
              name,
              featureType,
            );
            return;
          }
          console.log("[Earth3D] Got geojson type:", geojson.type);
          let rings: number[][][] = [];
          if (geojson.type === "Polygon") rings = [geojson.coordinates[0]];
          else if (geojson.type === "MultiPolygon")
            rings = (geojson.coordinates as number[][][][]).map((p) => p[0]);
          else {
            console.warn("[Earth3D] Unsupported geojson type:", geojson.type);
            return;
          }
          const MAX_RING_POINTS = 300;
          const simplifyRing = (ring: number[][]): number[][] => {
            if (ring.length <= MAX_RING_POINTS) return ring;
            const step = Math.ceil(ring.length / MAX_RING_POINTS);
            const out = ring.filter((_, i) => i % step === 0);
            const first = out[0],
              last = out[out.length - 1];
            if (first[0] !== last[0] || first[1] !== last[1]) out.push(first);
            return out;
          };

          // Antimeridian safety: when a ring has consecutive points jumping
          // more than 30° in longitude, Polygon3DElement renders an edge
          // straight across the globe. Split such rings into east/west halves.
          const ringSpansAntimeridian = (ring: number[][]): boolean => {
            for (let i = 1; i < ring.length; i++) {
              if (Math.abs(ring[i][0] - ring[i - 1][0]) > 30) return true;
            }
            return false;
          };
          const splitAtAntimeridian = (ring: number[][]): number[][][] => {
            if (!ringSpansAntimeridian(ring)) return [ring];
            const east: number[][] = [];
            const west: number[][] = [];
            for (const [lng, lat] of ring) {
              (lng >= 0 ? east : west).push([lng, lat]);
            }
            return [east, west].filter((r) => r.length >= 4);
          };

          // Drop rings that span more than 150° of longitude OR sit entirely
          // above ±70° latitude — these always render as polar/global artifacts
          // on the 3D globe (Russia's arctic coast, Antarctica).
          const isPolarOrGlobalRing = (ring: number[][]): boolean => {
            let minLng = Infinity,
              maxLng = -Infinity;
            let minLat = Infinity,
              maxLat = -Infinity;
            for (const [lng, lat] of ring) {
              if (lng < minLng) minLng = lng;
              if (lng > maxLng) maxLng = lng;
              if (lat < minLat) minLat = lat;
              if (lat > maxLat) maxLat = lat;
            }
            if (maxLng - minLng > 150) return true;
            if (minLat > 70 || maxLat < -70) return true;
            return false;
          };

          const isContinent = featureType === "continent";

          // Geometry from a trusted, pre-cut local source (continents file or
          // ne_admin0_countries) is already antimeridian-safe and may legitimately
          // contain very wide landmasses (Asia 154°, USA mainland+Alaska, Russia).
          // Skip the antimeridian splitter and the polar/global filter for those —
          // both were heuristic guards against bad Nominatim/stitched data and
          // would otherwise erase the main polygon.
          const trustedSource = isContinent || geojsonFromTrustedLocal;
          rings = trustedSource
            ? rings.map(simplifyRing).filter((r) => r.length >= 4)
            : rings
                .map(simplifyRing)
                .filter((r) => r.length >= 4)
                .flatMap(splitAtAntimeridian)
                .filter((r) => !isPolarOrGlobalRing(r));
          if (!rings.length) {
            console.warn(
              "[Earth3D] No valid rings after simplification for",
              name,
            );
            return;
          }

          console.log("[Earth3D] Drawing", rings.length, "polygons for", name);
          clearPolygonOverlays();
          for (const ring of rings) {
            const outerCoordinates = ring.map(([lng, lat]: number[]) => ({
              lat,
              lng,
              altitude: 0,
            }));
            const poly = new Polygon3DElement({
              outerCoordinates,
              fillColor: TEAL.fill,
              strokeColor: isContinent ? "rgba(0,0,0,0)" : TEAL.stroke,
              strokeWidth: isContinent ? 0 : 2.5,
              altitudeMode: "CLAMP_TO_GROUND",
            });
            map3d.append(poly);
            polygonOverlays.push(poly);
          }
          console.log("[Earth3D] Successfully drew boundary for", name);
        } catch (err) {
          console.error(
            "[Earth3D] Boundary fetch/draw error for",
            name,
            ":",
            err,
          );
        }
      };
      // Store fetchAndDrawBoundary in ref for zoom-out highlighting
      fetchAndDrawBoundaryRef.current = fetchAndDrawBoundary;

      let hoverPolygonOverlays: RemovableOverlay[] = [];
      let lastHoverNoLatLngLogAt = 0;
      let hoverRequestController: AbortController | null = null;
      let lastHoverRequestKey: string | null = null;
      let lastGeocodeLat: number | null = null;
      let lastGeocodeLng: number | null = null;
      const MIN_GEOCODE_MOVE_DEG = 0.08;

      const handleMouseMove = async (e: unknown) => {
        const ev =
          e && typeof e === "object" ? (e as Record<string, unknown>) : null;
        const latLng = extractLatLng(ev?.position ?? ev?.latLng);
        if (!latLng) {
          const now = Date.now();
          if (now - lastHoverNoLatLngLogAt > 1200) {
            lastHoverNoLatLngLogAt = now;
          }
          return;
        }

        if (lastGeocodeLat !== null && lastGeocodeLng !== null) {
          const dLat = Math.abs(latLng.lat - lastGeocodeLat);
          const dLng = Math.abs(latLng.lng - lastGeocodeLng);
          if (dLat < MIN_GEOCODE_MOVE_DEG && dLng < MIN_GEOCODE_MOVE_DEG) {
            return;
          }
        }

        if (hoverTimer) clearTimeout(hoverTimer);
        hoverTimer = setTimeout(async () => {
          lastGeocodeLat = latLng.lat;
          lastGeocodeLng = latLng.lng;
          try {
            const level = currentLevelRef.current;

            const response = await geocoder.geocode({ location: latLng });
            const first = response?.results?.[0];
            if (!first || !mounted) return;
            const info = parseAdminLevelsFromGeocodeResult(first);

            let hoverName: string | null = null;
            let featureType: "continent" | "country" | "state" | "city" =
              "continent";

            // The logic: show the boundary of what you're ABOUT TO SELECT (the next level down)

            // EARTH/WORLD VIEW → Next level is CONTINENT, so show continent boundaries
            if (level === "EARTH") {
              hoverName = info.country
                ? getCountryInfoWithFallback(info.country).continent || null
                : null;
              featureType = "continent";
            }
            // CONTINENT VIEW → Next level is COUNTRY, so highlight the COUNTRY boundary
            else if (level === "CONTINENT") {
              hoverName = info.country;
              featureType = "country";
            }
            // COUNTRY VIEW → Next level is STATE, so highlight the STATE/REGION boundary
            else if (level === "COUNTRY") {
              hoverName = info.state;
              featureType = "state";
            }
            // STATE VIEW → Next level is CITY, so highlight the CITY boundary
            else if (level === "STATE") {
              // Try to get city from geocode result
              const cityComponent = first.address_components?.find(
                (c: any) =>
                  c.types?.includes("locality") ||
                  c.types?.includes("administrative_area_level_2"),
              );
              hoverName = cityComponent?.long_name || null;
              featureType = "city";
            }
            // CITY/NONNA VIEW → At deepest level, show city boundary
            else {
              const cityComponent = first.address_components?.find(
                (c: any) =>
                  c.types?.includes("locality") ||
                  c.types?.includes("administrative_area_level_2"),
              );
              hoverName = cityComponent?.long_name || null;
              featureType = "city";
            }

            if (
              hoverName &&
              hoverName !== lastHoverName &&
              hoverName !== activeHighlightName
            ) {
              lastHoverName = hoverName;
              if (mounted) setHoveredLabel(hoverName);

              // Draw hover highlight polygon for the NEXT LEVEL DOWN
              if (hoverName && hoverName !== activeHighlightName) {
                // Cancel previous hover request
                if (hoverRequestController) {
                  hoverRequestController.abort();
                }

                // Create new request controller
                hoverRequestController = new AbortController();
                const requestKey = `${hoverName}:${featureType}:${info.countryCode || ""}`;
                lastHoverRequestKey = requestKey;

                // Clear previous hover polygons
                for (const p of hoverPolygonOverlays) {
                  try {
                    p.remove();
                  } catch {
                    /**/
                  }
                }
                hoverPolygonOverlays = [];

                try {
                  const params = new URLSearchParams({
                    polygon_geojson: "1",
                    format: "json",
                    limit: "1",
                  });
                  if (featureType === "continent") {
                    // Draw continent hover from the pre-cut Natural Earth file —
                    // one feature per continent, antimeridian-safe, no per-country
                    // strokes (which produced the scattered "rings" artifact).
                    if (!continentGeoJsonCacheRef.current) {
                      const cRes = await fetch("/geo/ne_continents.geojson");
                      continentGeoJsonCacheRef.current = await cRes.json();
                    }
                    const cFc = continentGeoJsonCacheRef.current;
                    const target = hoverName.toLowerCase();
                    const cFeature = cFc.features.find(
                      (f: any) =>
                        (f.properties?.CONTINENT || "").toLowerCase() ===
                        target,
                    );
                    if (!cFeature?.geometry) return;
                    const geom = await getContinentGeometryWithSupplements(
                      hoverName,
                      cFeature.geometry,
                    );
                    let rings: number[][][] = [];
                    if (geom.type === "Polygon") rings = [geom.coordinates[0]];
                    else if (geom.type === "MultiPolygon")
                      rings = (geom.coordinates as number[][][][]).map(
                        (p) => p[0],
                      );
                    const MAX_RING_POINTS = 200;
                    rings = rings
                      .map((ring: number[][]) => {
                        if (ring.length <= MAX_RING_POINTS) return ring;
                        const step = Math.ceil(ring.length / MAX_RING_POINTS);
                        const out = ring.filter(
                          (_: number[], i: number) => i % step === 0,
                        );
                        if (out[0]?.[0] !== out[out.length - 1]?.[0])
                          out.push(out[0]);
                        return out;
                      })
                      .filter((r: number[][]) => r.length >= 4);
                    for (const ring of rings) {
                      const outerCoordinates = ring.map(
                        ([lng, lat]: number[]) => ({ lat, lng, altitude: 100 }),
                      );
                      const poly =
                        new window.google.maps.maps3d.Polygon3DElement();
                      poly.outerCoordinates = outerCoordinates as any;
                      // Match the selected look: fill only, no per-feature stroke.
                      poly.strokeColor = "rgba(0,0,0,0)";
                      poly.strokeWidth = 0;
                      poly.fillColor = TEAL.fill;
                      poly.altitudeMode = "RELATIVE_TO_GROUND";
                      map3d.append(poly);
                      hoverPolygonOverlays.push(poly as any);
                    }
                    return;
                  } else if (featureType === "country") {
                    // Country hover: prefer the local Natural Earth file too.
                    try {
                      const fc = await loadCountryGeoJson();
                      const feature = fc.features.find((f: any) =>
                        matchNeCountryFeature(f, hoverName, info.countryCode),
                      );
                      if (feature?.geometry) {
                        const geom = feature.geometry;
                        let rings: number[][][] = [];
                        if (geom.type === "Polygon")
                          rings = [geom.coordinates[0]];
                        else if (geom.type === "MultiPolygon")
                          rings = (geom.coordinates as number[][][][]).map(
                            (p) => p[0],
                          );
                        const MAX_RING_POINTS = 200;
                        rings = rings
                          .map((ring: number[][]) => {
                            if (ring.length <= MAX_RING_POINTS) return ring;
                            const step = Math.ceil(
                              ring.length / MAX_RING_POINTS,
                            );
                            const out = ring.filter(
                              (_: number[], i: number) => i % step === 0,
                            );
                            if (out[0]?.[0] !== out[out.length - 1]?.[0])
                              out.push(out[0]);
                            return out;
                          })
                          .filter((r: number[][]) => r.length >= 4);
                        for (const ring of rings) {
                          const outerCoordinates = ring.map(
                            ([lng, lat]: number[]) => ({
                              lat,
                              lng,
                              altitude: 100,
                            }),
                          );
                          const poly =
                            new window.google.maps.maps3d.Polygon3DElement();
                          poly.outerCoordinates = outerCoordinates as any;
                          poly.strokeColor = "rgba(94,234,212,0.6)";
                          poly.strokeWidth = 2;
                          poly.fillColor = "rgba(94,234,212,0.25)";
                          poly.altitudeMode = "RELATIVE_TO_GROUND";
                          map3d.append(poly);
                          hoverPolygonOverlays.push(poly as any);
                        }
                        return;
                      }
                    } catch (e) {
                      console.warn(
                        "[Earth3D] hover country local lookup failed:",
                        e,
                      );
                    }
                    // Fall through to Nominatim if local missed.
                    params.set("featuretype", "country");
                    params.set("q", hoverName);
                  } else if (featureType === "state") {
                    // State hover: prefer the local Natural Earth states file.
                    try {
                      if (!stateGeoJsonCacheRef.current) {
                        const sRes = await fetch("/geo/ne_states_slim.geojson");
                        stateGeoJsonCacheRef.current = await sRes.json();
                      }
                      const sFc = stateGeoJsonCacheRef.current;
                      const target = hoverName.toLowerCase();
                      const cc = (info.countryCode || "").toLowerCase();
                      const feature = sFc.features.find((f: any) => {
                        const p = f.properties || {};
                        const nameMatches =
                          (p.name || "").toLowerCase() === target ||
                          (p.name_en || "").toLowerCase() === target;
                        if (!nameMatches) return false;
                        if (cc && p.iso_a2)
                          return p.iso_a2.toLowerCase() === cc;
                        return true;
                      });
                      if (feature?.geometry) {
                        const geom = feature.geometry;
                        let rings: number[][][] = [];
                        if (geom.type === "Polygon")
                          rings = [geom.coordinates[0]];
                        else if (geom.type === "MultiPolygon")
                          rings = (geom.coordinates as number[][][][]).map(
                            (p) => p[0],
                          );
                        const MAX_RING_POINTS = 200;
                        rings = rings
                          .map((ring: number[][]) => {
                            if (ring.length <= MAX_RING_POINTS) return ring;
                            const step = Math.ceil(
                              ring.length / MAX_RING_POINTS,
                            );
                            const out = ring.filter(
                              (_: number[], i: number) => i % step === 0,
                            );
                            if (out[0]?.[0] !== out[out.length - 1]?.[0])
                              out.push(out[0]);
                            return out;
                          })
                          .filter((r: number[][]) => r.length >= 4);
                        for (const ring of rings) {
                          const outerCoordinates = ring.map(
                            ([lng, lat]: number[]) => ({
                              lat,
                              lng,
                              altitude: 100,
                            }),
                          );
                          const poly =
                            new window.google.maps.maps3d.Polygon3DElement();
                          poly.outerCoordinates = outerCoordinates as any;
                          poly.strokeColor = "rgba(94,234,212,0.6)";
                          poly.strokeWidth = 2;
                          poly.fillColor = "rgba(94,234,212,0.25)";
                          poly.altitudeMode = "RELATIVE_TO_GROUND";
                          map3d.append(poly);
                          hoverPolygonOverlays.push(poly as any);
                        }
                        return;
                      }
                    } catch (e) {
                      console.warn(
                        "[Earth3D] hover state local lookup failed:",
                        e,
                      );
                    }
                    // Fall through to Nominatim if local missed.
                    params.set("featuretype", "state");
                    params.set("state", hoverName);
                    if (info.countryCode)
                      params.set(
                        "countrycodes",
                        info.countryCode.toLowerCase(),
                      );
                  } else if (featureType === "city") {
                    params.set("featuretype", "city");
                    params.set("city", hoverName);
                    if (info.countryCode)
                      params.set(
                        "countrycodes",
                        info.countryCode.toLowerCase(),
                      );
                  }

                  const res = await fetch(
                    `https://nominatim.openstreetmap.org/search?${params.toString()}`,
                    { signal: hoverRequestController.signal },
                  );

                  // Check if this request is still the latest
                  if (lastHoverRequestKey !== requestKey) {
                    console.log(
                      "[Earth3D] Hover request outdated, ignoring response",
                    );
                    return;
                  }

                  if (res.ok) {
                    const data = await res.json();
                    const geojson = data?.[0]?.geojson;
                    if (geojson) {
                      let rings: number[][][] = [];
                      if (geojson.type === "Polygon")
                        rings = [geojson.coordinates[0]];
                      else if (geojson.type === "MultiPolygon")
                        rings = (geojson.coordinates as number[][][][]).map(
                          (p) => p[0],
                        );

                      const MAX_RING_POINTS = 300; // Reduced for hover performance
                      const simplifyRing = (ring: number[][]): number[][] => {
                        if (ring.length <= MAX_RING_POINTS) return ring;
                        const step = Math.ceil(ring.length / MAX_RING_POINTS);
                        const out = ring.filter((_, i) => i % step === 0);
                        const first = out[0],
                          last = out[out.length - 1];
                        if (first[0] !== last[0] || first[1] !== last[1])
                          out.push(first);
                        return out;
                      };
                      rings = rings
                        .map(simplifyRing)
                        .filter((r) => r.length >= 4);

                      for (const ring of rings) {
                        const outerCoordinates = ring.map(
                          ([lng, lat]: number[]) => ({
                            lat,
                            lng,
                            altitude: 0,
                          }),
                        );
                        const poly = new Polygon3DElement({
                          outerCoordinates,
                          fillColor: "rgba(94,234,212,0.25)", // Lighter fill for hover
                          strokeColor: "rgba(94,234,212,0.6)", // Lighter stroke for hover
                          strokeWidth: 2,
                          altitudeMode: "CLAMP_TO_GROUND",
                        });
                        map3d.append(poly);
                        hoverPolygonOverlays.push(poly);
                      }
                    }
                  }
                } catch (err: unknown) {
                  if (err instanceof Error && err.name === "AbortError") {
                    console.log("[Earth3D] Hover request aborted");
                  } else {
                    console.warn("[Earth3D] hover polygon fetch failed:", err);
                  }
                }
              }
            } else if (!hoverName) {
              // Clear hover polygons when not hovering over anything
              for (const p of hoverPolygonOverlays) {
                try {
                  p.remove();
                } catch {
                  /**/
                }
              }
              hoverPolygonOverlays = [];
            }
          } catch {
            /**/
          }
        }, 350);
      };
      map3d.addEventListener("gmp-pointermove" as any, handleMouseMove);
      map3d.addEventListener("gmp-mousemove" as any, handleMouseMove);
      listeners.push(() =>
        map3d.removeEventListener("gmp-pointermove" as any, handleMouseMove),
      );
      listeners.push(() =>
        map3d.removeEventListener("gmp-mousemove" as any, handleMouseMove),
      );
      // ── Click → center + highlight boundary + OPEN PANEL ──
      const handleMapClick = async (e: any) => {
        console.log("[Earth3D] MAP CLICK HANDLER STARTED");
        console.log("[Earth3D] Click event target:", e.target);
        console.log("[Earth3D] Click event currentTarget:", e.currentTarget);

        // Clear continent highlight when clicking on empty space at EARTH level
        if (currentLevelRef.current === "EARTH" && highlightedContinent) {
          // Check if this is not a continent polygon click by looking for continent data
          const isContinentClick =
            e.target &&
            (e.target.closest("[data-continent]") ||
              e.target.getAttribute("data-continent"));

          if (!isContinentClick) {
            setHighlightedContinent(null);
          }
        }

        // Check if click originated from a marker
        const isMarkerClick =
          e.target &&
          (e.target.closest('[data-marker="nonna"]') ||
            e.target.getAttribute("data-marker") === "nonna" ||
            e.currentTarget?.getAttribute("data-marker") === "nonna");

        // At all other levels, treat marker clicks as map clicks
        if (isMarkerClick && currentLevelRef.current === "NONNA") {
          console.log(
            "[Earth3D] Click originated from marker at NONNA level, ignoring map click",
          );
          return;
        }

        console.log("[Earth3D] Processing map click (not from marker)");
        try {
          console.log("[Earth3D] Click event:", e);
          e.preventDefault?.();
          let latLng = extractLatLng(e.position || e.latLng);

          // Street View pick mode — intercept click to activate Street View
          if (streetViewPickModeRef.current && latLng) {
            console.log(
              "[Earth3D] Street View pick mode — activating at",
              latLng,
            );
            activateStreetViewAtRef.current(latLng.lat, latLng.lng);
            return;
          }

          if (!latLng && e.placeId) {
            console.log("[Earth3D] No latlng but have placeId:", e.placeId);
            const response = await geocoder.geocode({ placeId: e.placeId });
            const first = response?.results?.[0];
            if (first && first.geometry && first.geometry.location) {
              latLng = extractLatLng(first.geometry.location);
              console.log("[Earth3D] Got latlng from placeId:", latLng);
            }
          }
          if (!latLng || flightStateRef.current.active) {
            console.log(
              "[Earth3D] No latlng or programmatic flight, returning",
            );
            return;
          }
          console.log("[Earth3D] Click at latlng:", latLng);
          const level = currentLevelRef.current;
          const response = await geocoder.geocode({ location: latLng });
          let first = response?.results?.[0];
          console.log("[Earth3D] Geocode first result:", first);

          const hasCountryInfo =
            first &&
            first.address_components &&
            first.address_components.some((c: any) =>
              c.types?.includes("country"),
            );

          console.log("[Earth3D] Country check:", {
            hasCountryInfo,
            firstTypes: first?.types,
          });

          if (!hasCountryInfo) {
            console.log("[Earth3D] No country info, trying broader search...");
            try {
              const broaderResponse = await geocoder.geocode({
                location: latLng,
                types: ["country"],
              });
              const broaderResult = broaderResponse?.results?.[0];
              if (broaderResult) {
                console.log("[Earth3D] Broader search result:", broaderResult);
                first = broaderResult;
              }
            } catch (broaderError) {
              console.warn(
                "[Earth3D] Broader search failed, using fallback:",
                broaderError,
              );
              // If broader search fails, try without any parameters
              try {
                const fallbackResponse = await geocoder.geocode({
                  location: latLng,
                });
                const fallbackResult = fallbackResponse?.results?.find(
                  (r: any) =>
                    r.address_components?.some((c: any) =>
                      c.types?.includes("country"),
                    ),
                );
                if (fallbackResult) {
                  console.log(
                    "[Earth3D] Fallback search result:",
                    fallbackResult,
                  );
                  first = fallbackResult;
                }
              } catch (fallbackError) {
                console.error(
                  "[Earth3D] All geocoding attempts failed:",
                  fallbackError,
                );
                return; // Exit gracefully if all attempts fail
              }
            }
          }

          if (!first || !mounted) return;
          const info = parseAdminLevelsFromGeocodeResult(first);
          console.log("[Earth3D] Parsed info:", info);

          // Determine what to show based on zoom level - match the hover logic
          let targetName: string | null = null;
          let featureType: "country" | "state" | "city" | "continent" =
            "country";
          let nextLevel: ZoomLevel | null = null;

          if (level === "EARTH") {
            // At EARTH level, implement two-step interaction:
            // 1. First click: center on continent, stay at EARTH level
            // 2. Second click (same continent): zoom to CONTINENT level
            const continent = info.country
              ? getCountryInfoWithFallback(info.country).continent || null
              : null;
            const isSameContinent = continent === activeHighlightName;

            if (isSameContinent) {
              // Second click on same continent - zoom to CONTINENT level
              targetName = continent;
              featureType = "continent";
              nextLevel = "CONTINENT";
            } else {
              // First click on continent - center and highlight, but stay at EARTH level
              targetName = continent;
              featureType = "continent";
              nextLevel = "EARTH"; // Stay at same level
            }
          } else if (level === "CONTINENT") {
            // At CONTINENT level, implement two-step interaction (same as EARTH level):
            // 1. First click: center on continent, stay at CONTINENT level
            // 2. Second click (same continent): zoom to COUNTRY level
            const continent = info.country
              ? getCountryInfoWithFallback(info.country).continent || null
              : null;
            const isSameContinent = continent === activeHighlightName;

            if (isSameContinent) {
              // Second click on same continent - zoom to COUNTRY level
              targetName = info.country;
              featureType = "country";
              nextLevel = "COUNTRY";
            } else {
              // First click on continent - center and highlight, but stay at CONTINENT level
              targetName = continent;
              featureType = "continent";
              nextLevel = "CONTINENT"; // Stay at same level
            }
          } else if (level === "COUNTRY") {
            // At COUNTRY level, implement two-step interaction:
            // 1. First click: center on country, stay at COUNTRY level
            // 2. Second click (same country): zoom to STATE level
            const isSameCountry = info.country === activeHighlightName;

            if (isSameCountry) {
              // Second click on same country - zoom to STATE level
              targetName = info.state;
              featureType = "state";
              nextLevel = "STATE";
            } else {
              // First click on country - center and highlight, but stay at COUNTRY level
              targetName = info.country;
              featureType = "country";
              nextLevel = "COUNTRY"; // Stay at same level
            }
          } else if (level === "STATE") {
            // Get state name
            const stateComponent = first.address_components?.find((c: any) =>
              c.types?.includes("administrative_area_level_1"),
            );

            const stateName = stateComponent?.long_name || null;

            const isSameState = stateName === activeHighlightName;

            if (isSameState) {
              // Second click → go to CITY
              const cityComponent = first.address_components?.find(
                (c: any) =>
                  c.types?.includes("locality") ||
                  c.types?.includes("administrative_area_level_2"),
              );

              const cityName = cityComponent?.long_name || null;

              targetName = cityName;
              featureType = "city";
              nextLevel = "CITY";
            } else {
              // First click → stay on STATE
              targetName = stateName;
              featureType = "state";
              nextLevel = "STATE";
            }
          } else if (level === "CITY") {
            // At CITY level, stay at CITY — no auto-zoom to NONNA
            const cityComponent = first.address_components?.find(
              (c: any) =>
                c.types?.includes("locality") ||
                c.types?.includes("administrative_area_level_2"),
            );
            const cityName = cityComponent?.long_name || null;
            targetName = cityName;
            featureType = "city";
            nextLevel = "CITY";
          } else {
            // At NONNA level, clicking stays at current level
            const cityComponent = first.address_components?.find(
              (c: any) =>
                c.types?.includes("locality") ||
                c.types?.includes("administrative_area_level_2"),
            );
            targetName = cityComponent?.long_name || null;
            featureType = "city";
            nextLevel = level; // Stay at current level
          }

          console.log(
            "[Earth3D] Target name:",
            targetName,
            "featureType:",
            featureType,
            "level:",
            level,
            "nextLevel:",
            nextLevel,
          );

          // Fly to clicked location AND zoom to the next level
          flightStateRef.current.active = true;

          // If we have a next level, zoom to it
          if (nextLevel && targetName) {
            // Update the level first
            setLevel(nextLevel);
            currentLevelRef.current = nextLevel;

            if (nextLevel === "CITY") {
              viewportCountryRef.current =
                info.country || viewportCountryRef.current;
              viewportCountryCodeRef.current =
                info.countryCode || viewportCountryCodeRef.current;

              if (featureType === "city" && targetName) {
                const cluster = findCityClusterFromLabel(
                  allClustersRef.current,
                  targetName,
                  info.country,
                  info.countryCode,
                );
                const enteringFromState = level === "STATE";
                const alreadyAtCity = level === "CITY";

                if (alreadyAtCity || (cluster && cluster.nonnaCount === 1)) {
                  beginCityDrill(targetName, {
                    region: cluster?.region,
                    country: info.country,
                    countryCode: info.countryCode,
                    lat: latLng.lat,
                    lng: latLng.lng,
                  });
                } else if (enteringFromState && cluster && cluster.nonnaCount > 1) {
                  viewportRegionRef.current = cluster.region || null;
                  regionFilterFromClickRef.current = !!cluster.region;
                  cityFilterFromClickRef.current = false;
                  viewportCityRef.current = null;
                  if (allClustersRef.current) {
                    applyClusterLevel("CITY", allClustersRef.current);
                  }
                } else {
                  beginCityDrill(targetName, {
                    region: cluster?.region,
                    country: info.country,
                    countryCode: info.countryCode,
                    lat: latLng.lat,
                    lng: latLng.lng,
                  });
                }
              } else if (featureType === "state") {
                viewportRegionRef.current = targetName;
                regionFilterFromClickRef.current = true;
                cityFilterFromClickRef.current = false;
                viewportCityRef.current = null;
                if (allClustersRef.current) {
                  applyClusterLevel("CITY", allClustersRef.current);
                }
              }
            }

            // Set flight state
            flightStateRef.current = {
              active: true,
              targetRange: ZOOM_RANGES[nextLevel],
              targetLevel: nextLevel,
              startTime: Date.now(),
              lastRanges: [],
            };

            map3d.flyCameraTo({
              endCamera: {
                center: { lat: latLng.lat, lng: latLng.lng, altitude: 0 },
                range: ZOOM_RANGES[nextLevel],
                tilt: nextLevel === "CITY" || nextLevel === "NONNA" ? 65 : 0,
                heading: 0,
              },
              durationMillis: 1500,
            });
          } else {
            // No next level, just recenter at current zoom
            map3d.flyCameraTo({
              endCamera: {
                center: { lat: latLng.lat, lng: latLng.lng, altitude: 0 },
                range: map3d.range,
                tilt: map3d.tilt,
                heading: 0,
              },
              durationMillis: 1500,
            });
          }

          // flightStateRef.active is reset by unifiedZoomCheck when flight stabilizes

          // Handle boundary highlighting and panel
          if (targetName) {
            // If clicking the same region AND staying at the same level, toggle panel off
            const isDrillDown =
              nextLevel !== level ||
              (level === "CITY" && featureType === "city");
            if (targetName === activeHighlightName && !isDrillDown) {
              console.log(
                "[Earth3D] Clicking same region at same level - closing panel",
              );
              clearPolygonOverlays();
              activeHighlightName = null;
              if (mounted) {
                setClickedLabel(null);
                setHoveredLabel(null);
                setPanel((prev) => ({ ...prev, open: false }));
              }
            } else {
              // Clicking on a new region - update panel data and draw boundary
              console.log(
                "[Earth3D] Clicking new region - updating panel data for:",
                targetName,
              );
              activeHighlightName = targetName;

              if (mounted) {
                setClickedLabel(targetName);
                setHoveredLabel(null);
                setActiveCountry(info.country || null);
                setActivePlaceName(targetName);

                // Open the discussion panel with appropriate display name
                let regionDisplayName = targetName;

                if (featureType === "city") {
                  // For cities, show: City, State, Country or City, Country
                  if (info.state && info.country) {
                    regionDisplayName = `${info.country} • ${info.state} • ${targetName}`;
                  } else if (info.country) {
                    regionDisplayName = `${info.country} • ${targetName}`;
                  }
                } else if (featureType === "state") {
                  regionDisplayName = `${info.country || "Unknown Country"} • ${targetName}`;
                }

                // Fetch nonnas based on feature type
                const fetchNonnas = async () => {
                  try {
                    let url = "/api/recipes?published=true";

                    if (featureType === "continent") {
                      // Get continent from country using countryData
                      const { getCountryInfoWithFallback } =
                        await import("@/lib/countryData");
                      const continent = getCountryInfoWithFallback(
                        info.country || "",
                      ).continent;
                      url += `&continent=${encodeURIComponent(continent)}`;
                    } else if (featureType === "country") {
                      url += `&country=${encodeURIComponent(info.country || "")}`;
                    } else if (featureType === "state") {
                      url += `&country=${encodeURIComponent(info.country || "")}`;
                      url += `&region=${encodeURIComponent(targetName)}`;
                    } else if (featureType === "city") {
                      const cityCluster = findCityClusterFromLabel(
                        allClustersRef.current,
                        targetName,
                        info.country,
                        info.countryCode,
                      );
                      const dbCity = cityCluster?.city || targetName;
                      const dbRegion = cityCluster?.region;
                      url += `&country=${encodeURIComponent(info.country || "")}`;
                      if (dbRegion) {
                        url += `&region=${encodeURIComponent(dbRegion)}`;
                      }
                      url += `&city=${encodeURIComponent(dbCity)}`;
                    }

                    const response = await fetch(url);
                    const data = await response.json();
                    return mapRecipesToPanelNonnas(data.recipes || []);
                  } catch (error) {
                    console.error("[Earth3D] Error fetching nonnas:", error);
                    return [];
                  }
                };

                const nonnas = await fetchNonnas();

                // Update discussion panel data (do not auto-open)
                setPanel((prev) => ({
                  ...prev,
                  region: targetName,
                  regionDisplayName,
                  scope: featureType as any,
                  country: info.country || undefined,
                  state: info.state || undefined,
                  city: featureType === "city" ? targetName : undefined,
                  nonnas,
                  initialTab: "discussion",
                }));

                // Draw boundary for the clicked location
                let boundaryName = targetName;
                if (featureType === "city" && targetName) {
                  const cityCluster = findCityClusterFromLabel(
                    allClustersRef.current,
                    targetName,
                    info.country,
                    info.countryCode,
                  );
                  if (cityCluster?.city) boundaryName = cityCluster.city;
                }
                fetchAndDrawBoundary(
                  boundaryName,
                  featureType,
                  info.countryCode,
                  featureType === "city"
                    ? {
                        countryName: info.country,
                        centerLat: latLng.lat,
                        centerLng: latLng.lng,
                      }
                    : undefined,
                );
              }
            }
          }
        } catch (err) {
          console.error("[Earth3D] Click handler error:", err);
        }
      };

      map3d.addEventListener("gmp-click", handleMapClick);
      listeners.push(() =>
        map3d.removeEventListener("gmp-click", handleMapClick),
      );

      // ── Double-click to zoom in ──
      const handleDoubleClick = () => {
        if (!flightStateRef.current.active) {
          handleZoomIn();
        }
      };
      map3d.addEventListener("dblclick", handleDoubleClick);
      listeners.push(() =>
        map3d.removeEventListener("dblclick", handleDoubleClick),
      );

      // ── Single unified zoom level detection ──
      const unifiedZoomCheck = () => {
        if (!mounted || !map3d) return;
        const currentRange = Number(map3d.range ?? ZOOM_RANGES.EARTH);

        // Track range for stabilization detection
        flightStateRef.current.lastRanges.push(currentRange);
        if (flightStateRef.current.lastRanges.length > 5) {
          flightStateRef.current.lastRanges.shift();
        }

        // Check if programmatic flight has completed
        if (flightStateRef.current.active) {
          const flight = flightStateRef.current;
          const timeElapsed = Date.now() - flight.startTime;
          const isCloseToTarget =
            flight.targetRange &&
            Math.abs(currentRange - flight.targetRange) < 10000;
          const isStable =
            flight.lastRanges.length >= 3 &&
            flight.lastRanges.every((r) => Math.abs(r - currentRange) < 1000);

          if (isCloseToTarget && isStable && timeElapsed > 1000) {
            // Flight completed - clear state
            flightStateRef.current = {
              active: false,
              targetRange: null,
              targetLevel: null,
              startTime: 0,
              lastRanges: [],
            };
          } else if (timeElapsed > 3000) {
            // Timeout fallback - clear flight state after 3 seconds
            flightStateRef.current = {
              active: false,
              targetRange: null,
              targetLevel: null,
              startTime: 0,
              lastRanges: [],
            };
          }
        }

        // Zoom level detection - more gradual thresholds with overlaps for smooth scroll zoom.
        // CITY is the deepest user-facing level: zooming further (down to street view)
        // keeps the left-side level pill on CITY instead of falling off into nothing.
        // NONNA is no longer a selectable level — Street View is opened explicitly
        // via the bottom-left button, not by passive zoom.
        let rawLevel: ZoomLevel = "EARTH";
        if (currentRange <= ZOOM_RANGES.CITY * 2.5) rawLevel = "CITY";
        else if (currentRange <= ZOOM_RANGES.STATE * 2) rawLevel = "STATE";
        else if (currentRange <= ZOOM_RANGES.COUNTRY * 2) rawLevel = "COUNTRY";
        else if (currentRange <= ZOOM_RANGES.CONTINENT * 1.5)
          rawLevel = "CONTINENT";

        // Enforce strict drill-down: when zooming in (advancing forward), only allow one level at a time.
        // Going back (zooming out) is always allowed freely.
        const LEVEL_ORDER_SCROLL: ZoomLevel[] = [
          "EARTH",
          "CONTINENT",
          "COUNTRY",
          "STATE",
          "CITY",
          "NONNA",
        ];
        const rawIndex = LEVEL_ORDER_SCROLL.indexOf(rawLevel);
        const curIndex = LEVEL_ORDER_SCROLL.indexOf(currentLevelRef.current);
        // Clamp forward advancement to at most one step ahead
        const clampedIndex =
          rawIndex > curIndex ? Math.min(rawIndex, curIndex + 1) : rawIndex;
        const newLevel = LEVEL_ORDER_SCROLL[clampedIndex];

        // Only change level if it's different and not during a programmatic flight
        // Also prevent changing away from NONNA level (internal Street View level)
        if (
          newLevel !== currentLevelRef.current &&
          !flightStateRef.current.active &&
          currentLevelRef.current !== "NONNA"
        ) {
          const prevIndex = LEVEL_ORDER_SCROLL.indexOf(currentLevelRef.current);
          setLevel(newLevel);
          // Clear highlight whenever zooming out (moving to a higher/broader level)
          if (clampedIndex < prevIndex) {
            clearPolygonOverlays();
            activeHighlightName = null;
            setClickedLabel(null);
            setHoveredLabel(null);
          }
        }

        // Continue checking every 100ms
        if (mounted) {
          setTimeout(unifiedZoomCheck, 100);
        }
      };

      // Start unified zoom detection
      unifiedZoomCheck();

      // ── Debounced center-change detection for viewport filtering + pan-follow highlighting ──
      let lastViewportLat = 0;
      let lastViewportLng = 0;
      let viewportUpdateTimer: ReturnType<typeof setTimeout> | null = null;
      let panHighlightTimer: ReturnType<typeof setTimeout> | null = null;
      const CENTER_CHANGE_THRESHOLD = 2;

      // When the user drags / spins the globe, focus the highlight + discussion
      // panel on whatever is centered in front of them at the current level.
      // Reverse-geocode the new center, derive the feature for the level, and
      // re-run the highlight pipeline. Debounced so we don't spam the geocoder.
      const followCenterHighlight = async () => {
        if (!mounted || !map3dRef.current || !geocoderRef.current) return;
        if (flightStateRef.current.active) return; // skip during programmatic flights
        const level = currentLevelRef.current;
        if (level === "EARTH") return;

        const c = map3dRef.current.center;
        if (!c) return;
        const cLat = Number(c.lat);
        const cLng = Number(c.lng);
        if (!Number.isFinite(cLat) || !Number.isFinite(cLng)) return;

        try {
          const response = await geocoderRef.current.geocode({
            location: { lat: cLat, lng: cLng },
          });
          const first = response?.results?.[0];
          if (!first || !mounted) return;
          const info = parseAdminLevelsFromGeocodeResult(first);

          let targetName: string | null = null;
          let featureType: "continent" | "country" | "state" | "city" | null =
            null;

          if (level === "CONTINENT") {
            targetName =
              viewportContinentRef.current ||
              (info.country
                ? getCountryInfoWithFallback(info.country).continent || null
                : null);
            featureType = "continent";
          } else if (level === "COUNTRY") {
            targetName = info.country;
            featureType = "country";
          } else if (level === "STATE") {
            targetName = info.state;
            featureType = "state";
          } else if (level === "CITY" || level === "NONNA") {
            const cityComponent = first.address_components?.find(
              (cc: any) =>
                cc.types?.includes("locality") ||
                cc.types?.includes("administrative_area_level_2"),
            );
            targetName = cityComponent?.long_name || null;
            featureType = "city";
          }

          if (!targetName || !featureType) return;
          if (targetName === activeHighlightName) return; // already focused

          if (featureType === "continent") {
            viewportContinentRef.current = targetName;
          }
          activeHighlightName = targetName;
          setClickedLabel(targetName);
          setActivePlaceName(targetName);
          setActiveCountry(info.country || null);

          // Sync the discussion pill to whatever the camera is now over.
          let regionDisplayName = targetName;
          if (featureType === "city") {
            if (info.state && info.country) {
              regionDisplayName = `${info.country} • ${info.state} • ${targetName}`;
            } else if (info.country) {
              regionDisplayName = `${info.country} • ${targetName}`;
            }
          } else if (featureType === "state") {
            regionDisplayName = `${info.country || ""} • ${targetName}`.replace(
              /^ • /,
              "",
            );
          }
          setPanel((prev) => ({
            ...prev,
            region: targetName!,
            regionDisplayName,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            scope: featureType as any,
            country: info.country || undefined,
            state: info.state || undefined,
            city: featureType === "city" ? targetName! : undefined,
          }));

          if (fetchAndDrawBoundaryRef.current) {
            fetchAndDrawBoundaryRef.current(
              targetName,
              featureType,
              info.countryCode,
            );
          }
        } catch (e) {
          console.warn("[Earth3D] follow-center highlight failed:", e);
        }
      };

      followCenterHighlightRef.current = followCenterHighlight;

      const checkCenterChange = () => {
        if (!mounted || !map3d) return;
        const level = currentLevelRef.current;
        if (level === "EARTH") {
          setTimeout(checkCenterChange, 500);
          return;
        }
        const center = map3d.center;
        if (!center) {
          setTimeout(checkCenterChange, 500);
          return;
        }
        const lat = Number(center.lat);
        const lng = Number(center.lng);
        const dist =
          Math.abs(lat - lastViewportLat) + Math.abs(lng - lastViewportLng);
        if (dist > CENTER_CHANGE_THRESHOLD) {
          lastViewportLat = lat;
          lastViewportLng = lng;
          if (viewportUpdateTimer) clearTimeout(viewportUpdateTimer);
          viewportUpdateTimer = setTimeout(() => {
            if (mounted) updateViewportContext();
          }, 600);
          // Also re-focus the highlight + discussion panel on the new center.
          if (panHighlightTimer) clearTimeout(panHighlightTimer);
          panHighlightTimer = setTimeout(() => {
            if (mounted) followCenterHighlight();
          }, 450);
        }
        if (mounted) setTimeout(checkCenterChange, 500);
      };
      checkCenterChange();

      // ── Remove tooltips from all map elements ──
      const removeTooltips = (e: MouseEvent) => {
        const target = e.target as Element;
        if (target) {
          target.removeAttribute("title");
          // Also check parent element for Edge compatibility
          if (target.parentElement) {
            target.parentElement.removeAttribute("title");
          }
          // Check for map labels and other elements that might have titles
          const mapElement = target.closest("[title]") as Element;
          if (mapElement) {
            mapElement.removeAttribute("title");
          }
        }
      };

      // Add global mouseover listener to the map container
      map3d.addEventListener("mouseover", removeTooltips);
      listeners.push(() =>
        map3d.removeEventListener("mouseover", removeTooltips),
      );

      // Strip map tooltips without scanning the full DOM every second
      const stripTitle = (el: Element) => {
        if (el.hasAttribute("title")) el.removeAttribute("title");
      };

      const titleObserver = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          if (
            mutation.type === "attributes" &&
            mutation.attributeName === "title"
          ) {
            stripTitle(mutation.target as Element);
          } else if (mutation.type === "childList") {
            mutation.addedNodes.forEach((node) => {
              if (node.nodeType !== Node.ELEMENT_NODE) return;
              const element = node as Element;
              stripTitle(element);
              element.querySelectorAll("[title]").forEach(stripTitle);
            });
          }
        }
      });

      titleObserver.observe(map3d, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["title"],
      });
      map3d.querySelectorAll("[title]").forEach(stripTitle);

      listeners.push(() => titleObserver.disconnect());

      // ── Animated globe ring overlay (event-driven; rAF only while animating) ──
      let currentSize = 0;
      let currentOpacity = 0;
      let ringHidden = true;
      const LERP_SPEED = 0.1;
      const EARTH_RADIUS = 6371000;
      const FOV_FACTOR = 1.6;

      const scheduleRingUpdate = () => {
        if (!animationFrameId) {
          animationFrameId = requestAnimationFrame(checkZoom);
        }
      };

      const checkZoom = () => {
        animationFrameId = 0;
        if (!mounted || !overlayRef.current) return;

        const rawRange = Number(map3d.range);
        const currentRange = Number.isFinite(rawRange)
          ? rawRange
          : (ZOOM_RANGES[currentLevelRef.current] ?? ZOOM_RANGES.EARTH);

        const distance = EARTH_RADIUS + currentRange;
        const d = Math.max(distance, EARTH_RADIUS + 10);
        const alpha = Math.asin(EARTH_RADIUS / d);
        const rPx = Math.tan(alpha) * window.innerHeight * FOV_FACTOR;
        const targetSize = (rPx + 60) * 2.5;
        const clampedTargetSize = Math.min(targetSize, 2000);
        let targetOpacity = 1;
        if (currentRange < 8000000) targetOpacity = 0;
        else if (currentRange < 12000000)
          targetOpacity = (currentRange - 8000000) / 4000000;

        const el = overlayRef.current;

        if (targetOpacity === 0) {
          if (!ringHidden) {
            el.style.width = "0px";
            el.style.height = "0px";
            el.style.opacity = "0";
            ringHidden = true;
            currentSize = 0;
            currentOpacity = 0;
          }
          return;
        }

        ringHidden = false;
        if (currentSize === 0) {
          currentSize = clampedTargetSize;
          currentOpacity = targetOpacity;
        } else {
          currentSize += (clampedTargetSize - currentSize) * LERP_SPEED;
          currentOpacity += (targetOpacity - currentOpacity) * LERP_SPEED;
        }

        const safeOpacity = Math.max(0, Math.min(1, currentOpacity));
        const safeSize = Math.max(0, Math.min(2000, currentSize));
        el.style.width = `${safeSize}px`;
        el.style.height = `${safeSize}px`;
        el.style.opacity = `${safeOpacity}`;

        const settling =
          Math.abs(currentSize - clampedTargetSize) > 0.5 ||
          Math.abs(currentOpacity - targetOpacity) > 0.01;
        if (settling) {
          animationFrameId = requestAnimationFrame(checkZoom);
        }
      };

      map3d.addEventListener("gmp-centerchange" as any, scheduleRingUpdate);
      map3d.addEventListener("gmp-rangechange" as any, scheduleRingUpdate);
      listeners.push(() => {
        map3d.removeEventListener("gmp-centerchange" as any, scheduleRingUpdate);
        map3d.removeEventListener("gmp-rangechange" as any, scheduleRingUpdate);
      });
      scheduleRingUpdate();
    }
    init().catch((err) => console.error("[Earth3D] init failed:", err));
    return () => {
      mounted = false;
      map3dRef.current = null;
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      for (const off of listeners) {
        try {
          off();
        } catch {
          /**/
        }
      }
    };
  }, [
    mapContainerMounted,
    setLevel,
    handleZoomIn,
    updateViewportContext,
    fetchIndividualNonnas,
    getIndividualMarkerFilters,
  ]);
  const mobileStyles = {
    searchContainer: {
      position: "absolute" as const,
      left: isMobile ? "12px" : "24px",
      top: isMobile ? "12px" : "24px",
      right: isMobile ? "12px" : "auto",
      zIndex: 100,
      width: isMobile ? "auto" : "320px",
      maxWidth: isMobile ? "calc(100vw - 24px)" : "320px",
    },
    searchInput: {
      width: "100%",
      padding: isMobile ? "14px 48px 14px 16px" : "16px 52px 16px 20px",
      border: "none",
      outline: "none",
      background: "transparent",
      fontSize: isMobile ? "16px" : "15px", // 16px prevents zoom on iOS
      fontFamily: "ui-sans-serif, system-ui, sans-serif",
      color: "#1f2937",
      borderRadius: "16px",
      WebkitTapHighlightColor: "transparent", // Remove tap highlight on iOS
    },
    levelNavContainer: {
      position: "absolute" as const,
      left: isMobile ? "8px" : "24px",
      top: "50%",
      transform: "translateY(-50%)",
      display: "flex",
      flexDirection: "column" as const,
      gap: isMobile ? "6px" : "10px",
      zIndex: 50,
    },
    zoomContainer: {
      position: "absolute" as const,
      right: isMobile ? "8px" : "24px",
      top: "50%",
      transform: "translateY(-50%)",
      display: "flex",
      flexDirection: "column" as const,
      gap: isMobile ? "8px" : "12px",
      zIndex: 50,
    },
  };
  // Search functionality
  const performSearch = useCallback(async (query: string) => {
    if (!query.trim() || !geocoderRef.current) return;

    setIsSearching(true);
    try {
      // Use Google Places API for autocomplete suggestions
      const service = new (
        window.google as any
      ).maps.places.AutocompleteService();
      const predictions = await new Promise<any[]>((resolve, reject) => {
        service.getPlacePredictions(
          {
            input: query,
            // Remove types to get all results, or use single type if needed
            // types: ['geocode'], // This would give all geographical places
          },
          (predictions: any[], status: string) => {
            if (status === "OK" && predictions) {
              resolve(predictions);
            } else {
              reject(new Error(`Places API status: ${status}`));
            }
          },
        );
      });

      const results: SearchResult[] = predictions.map((pred) => ({
        place_id: pred.place_id,
        description: pred.description,
        main_text: pred.structured_formatting?.main_text,
        secondary_text: pred.structured_formatting?.secondary_text,
      }));

      setSearchResults(results);
      setShowSearchResults(true);
    } catch (error) {
      console.error("[Earth3D] Search error:", error);
      // Fallback to geocoder if Places API fails
      try {
        const response = await geocoderRef.current.geocode({ address: query });
        const results: SearchResult[] = response.results.map((result: any) => ({
          place_id: result.place_id,
          description: result.formatted_address,
          main_text: result.address_components?.[0]?.long_name,
          secondary_text: result.address_components
            ?.slice(1)
            .map((c: any) => c.long_name)
            .join(", "),
        }));
        setSearchResults(results);
        setShowSearchResults(true);
      } catch (fallbackError) {
        console.error("[Earth3D] Fallback search error:", fallbackError);
        setSearchResults([]);
      }
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleSearchInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const query = e.target.value;
      setSearchQuery(query);

      // Clear existing timeout
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      if (query.trim()) {
        // Debounce search
        searchTimeoutRef.current = setTimeout(() => {
          performSearch(query);
        }, 300);
      } else {
        setSearchResults([]);
        setShowSearchResults(false);
      }
    },
    [performSearch],
  );

  const handleSearchResultClick = useCallback(
    async (result: SearchResult) => {
      if (!map3dRef.current || !geocoderRef.current) return;

      setShowSearchResults(false);
      setSearchQuery(result.description);

      try {
        // Get place details
        const service = new (window.google as any).maps.places.PlacesService(
          map3dRef.current,
        );
        const place = await new Promise<any>((resolve, reject) => {
          service.getDetails(
            { placeId: result.place_id },
            (place: any, status: string) => {
              if (status === "OK" && place) {
                resolve(place);
              } else {
                reject(new Error(`Places details status: ${status}`));
              }
            },
          );
        });

        if (place.geometry?.location) {
          const latLng = extractLatLng(place.geometry.location);
          if (latLng) {
            console.log("[Earth3D] Flying to coordinates:", latLng);
            console.log("[Earth3D] Place types:", place.types);
            console.log(
              "[Earth3D] Place name:",
              result.main_text || result.description,
            );

            // Calculate appropriate range based on place type and viewport
            let targetRange = ZOOM_RANGES.CITY; // Default fallback

            // Use viewport if available for more accurate zoom
            if (place.geometry.viewport) {
              const viewport = place.geometry.viewport;
              const ne = viewport.getNorthEast();
              const sw = viewport.getSouthWest();
              const latDiff = ne.lat() - sw.lat();
              const lngDiff = ne.lng() - sw.lng();

              // Calculate range based on viewport size
              const approxSize = Math.max(latDiff, lngDiff) * 111000; // Convert to meters
              console.log(
                "[Earth3D] Calculated viewport size:",
                approxSize,
                "meters",
              );

              // Use place types to override viewport-based range for large areas
              const types: string[] = place.types || [];
              if (types.includes("continent")) {
                targetRange = ZOOM_RANGES.CONTINENT;
              } else if (types.includes("country")) {
                targetRange = ZOOM_RANGES.COUNTRY;
              } else if (types.includes("administrative_area_level_1")) {
                targetRange = ZOOM_RANGES.STATE;
              } else if (
                types.includes("locality") ||
                types.includes("administrative_area_level_2")
              ) {
                targetRange = ZOOM_RANGES.CITY;
              } else if (
                types.includes("airport") ||
                types.includes("establishment")
              ) {
                targetRange = ZOOM_RANGES.NONNA;
              } else {
                // Fall back to viewport size
                if (approxSize < 10000) targetRange = ZOOM_RANGES.NONNA;
                else if (approxSize < 50000) targetRange = ZOOM_RANGES.CITY;
                else if (approxSize < 500000) targetRange = ZOOM_RANGES.STATE;
                else if (approxSize < 5000000)
                  targetRange = ZOOM_RANGES.COUNTRY;
                else targetRange = ZOOM_RANGES.CONTINENT;
              }
            } else if (place.types?.includes("airport")) {
              targetRange = ZOOM_RANGES.NONNA;
            } else if (place.types?.includes("establishment")) {
              targetRange = ZOOM_RANGES.NONNA;
            }

            console.log("[Earth3D] Using target range:", targetRange, "meters");

            // Determine zoom level from range
            let targetLevel: ZoomLevel = "CITY";
            if (targetRange >= ZOOM_RANGES.EARTH) targetLevel = "EARTH";
            else if (targetRange >= ZOOM_RANGES.CONTINENT)
              targetLevel = "CONTINENT";
            else if (targetRange >= ZOOM_RANGES.COUNTRY)
              targetLevel = "COUNTRY";
            else if (targetRange >= ZOOM_RANGES.STATE) targetLevel = "STATE";
            else if (targetRange >= ZOOM_RANGES.CITY) targetLevel = "CITY";
            else targetLevel = "NONNA";

            flightStateRef.current = {
              active: true,
              targetRange,
              targetLevel,
              startTime: Date.now(),
              lastRanges: [],
            };
            // Tell the level-change effect to skip its own reverse-geocode for this
            // transition — we already know the exact place the user picked.
            suppressNextLevelHighlightRef.current = true;
            setLevel(targetLevel);
            currentLevelRef.current = targetLevel;

            // Fly to the location
            map3dRef.current.flyCameraTo({
              endCamera: {
                center: { lat: latLng.lat, lng: latLng.lng, altitude: 0 },
                range: targetRange,
                heading: 0,
                tilt:
                  targetLevel === "CITY" || targetLevel === "NONNA" ? 65 : 0,
              },
              durationMillis: 2000,
            });

            // Update active place info and highlight boundary
            const searchName = result.main_text || result.description;
            setActivePlaceName(searchName);
            const info = parseAdminLevelsFromGeocodeResult(place);
            if (info.country) setActiveCountry(info.country);

            // Determine the right scope/region for the panel based on target level
            let featureType: "continent" | "country" | "state" | "city" =
              "country";
            let highlightName = searchName;
            const countryCode: string | null = info.countryCode || null;

            if (targetLevel === "CONTINENT" || targetLevel === "EARTH") {
              // The user explicitly selected this place — trust its name directly
              // (e.g. "Asia"). Never re-derive the continent from lat/lng boxes,
              // which mis-classifies border regions like Iran as Africa.
              featureType = "continent";
              highlightName =
                result.main_text || result.description || searchName;
            } else if (targetLevel === "COUNTRY") {
              featureType = "country";
              highlightName = info.country || searchName;
            } else if (targetLevel === "STATE") {
              featureType = "state";
              highlightName = info.state || searchName;
            } else {
              featureType = "city";
            }

            // Build a human-readable display name for the discussion pill
            let regionDisplayName = highlightName;
            if (featureType === "city") {
              if (info.state && info.country) {
                regionDisplayName = `${info.country} • ${info.state} • ${highlightName}`;
              } else if (info.country) {
                regionDisplayName = `${info.country} • ${highlightName}`;
              }
            } else if (featureType === "state") {
              regionDisplayName =
                `${info.country || ""} • ${highlightName}`.replace(/^ • /, "");
            }

            // Sync the panel state so the right-side pill updates correctly.
            // Continents now go through the same path as click — the pill shows
            // the continent name instead of falling back to a generic "Discussions".
            setPanel((prev) => ({
              ...prev,
              region: highlightName,
              regionDisplayName,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              scope: featureType as any,
              country: info.country || undefined,
              state: info.state || undefined,
              city: featureType === "city" ? highlightName : undefined,
            }));

            // Highlight the searched region with a boundary polygon
            if (fetchAndDrawBoundaryRef.current) {
              fetchAndDrawBoundaryRef.current(
                highlightName,
                featureType,
                countryCode,
              );
            }
          }
        }
      } catch (error) {
        console.error("[Earth3D] Place details error:", error);
        // Fallback to geocoding
        try {
          const response = await geocoderRef.current.geocode({
            placeId: result.place_id,
          });
          const place = response.results[0];
          if (place.geometry?.location) {
            const latLng = extractLatLng(place.geometry.location);
            if (latLng) {
              // Calculate appropriate range based on place type and viewport
              let targetRange = ZOOM_RANGES.CITY; // Default fallback

              // For geocoding fallback, use place types if available
              if (place.types?.includes("airport")) {
                targetRange = ZOOM_RANGES.NONNA; // Very close zoom for airports
              } else if (place.types?.includes("establishment")) {
                targetRange = ZOOM_RANGES.NONNA; // Close zoom for specific places
              } else if (place.types?.includes("locality")) {
                targetRange = ZOOM_RANGES.CITY; // City level
              } else if (place.types?.includes("administrative_area_level_1")) {
                targetRange = ZOOM_RANGES.STATE; // State/region level
              } else if (place.types?.includes("country")) {
                targetRange = ZOOM_RANGES.COUNTRY; // Country level
              }

              map3dRef.current.flyCameraTo({
                endCamera: {
                  center: { lat: latLng.lat, lng: latLng.lng, altitude: 0 },
                  range: targetRange,
                  heading: 0,
                  tilt: 0,
                },
                durationMillis: 2000,
              });

              setActivePlaceName(result.main_text || result.description);
              const info = parseAdminLevelsFromGeocodeResult(place);
              if (info.country) setActiveCountry(info.country);
            }
          }
        } catch (fallbackError) {
          console.error("[Earth3D] Fallback geocoding error:", fallbackError);
        }
      }
    },
    [setLevel],
  );

  // Close search results when clicking outside (supports touch)
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (
        searchInputRef.current &&
        !searchInputRef.current.contains(e.target as Node)
      ) {
        setShowSearchResults(false);
      }
    };

    // Add both mouse and touch event listeners for mobile compatibility
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  return {
    containerRef,
    setContainerRef,
    overlayRef,
    map3dRef,
    streetViewContainerRef,
    streetViewPanoramaRef,
    currentNonnaRef,
    geoJsonCacheRef,
    continentGeoJsonCacheRef,
    stateGeoJsonCacheRef,
    currentMarkersRef,
    clearCurrentMarkers,
    user,
    l,
    searchTimeoutRef,
    searchInputRef,
    geocoderRef,
    viewportCountryRef,
    viewportCountryCodeRef,
    viewportContinentRef,
    currentLevelRef,
    streetViewPickModeRef,
    pendingStreetViewRestoreRef,
    hasAppliedStreetViewRestoreRef,
    handleStreetViewButtonClick,
    activateStreetViewAt,
    activateStreetViewAtRef,
    flightStateRef,
    allClustersRef,
    viewportCityRef,
    viewportRegionRef,
    regionFilterFromClickRef,
    cityFilterFromClickRef,
    individualFetchSeqRef,
    filterMarkersNearCenter,
    filterByViewportCountry,
    filterByViewportContinent,
    applyClusterLevel,
    fetchIndividualNonnas,
    beginCityDrill,
    getIndividualMarkerFilters,
    fetchAndDrawBoundaryRef,
    suppressNextLevelHighlightRef,
    drawContinentHighlight,
    highlightingRef,
    followCenterHighlightRef,
    refreshMarkersForLevel,
    updateViewportContext,
    handleClusterClick,
    handleZoomIn,
    handleZoomOut,
    mobileStyles,
    performSearch,
    handleSearchInputChange,
    handleSearchResultClick,
    streetViewActive,
    streetViewPickMode,
    activePlaceName,
    activeCountry,
    hoveredLabel,
    clickedLabel,
    nonnaData,
    mapReady,
    is3DMode,
    isMobile,
    highlightedContinent,
    previousLevel,
    currentLocation,
    searchQuery,
    searchResults,
    isSearching,
    showSearchResults,
    panel,
    commentSection,
    streetViewNonnaPopup,
    streetViewToast,
    currentLevel,
    setLevel,
    setStreetViewActive,
    setStreetViewPickMode,
    setStreetViewNonnaPopup,
    setCommentSection,
    setPanel,
    setIs3DMode,
    setStreetViewToast,
  };
}

export type EarthMap3DController = ReturnType<typeof useEarthMap3DController>;
