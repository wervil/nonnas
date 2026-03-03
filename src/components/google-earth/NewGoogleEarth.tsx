"use client";

import { useEffect, useRef, useState } from "react";

// Mock context since we don't have the actual import
const ZOOM_RANGES = {
  EARTH: 30000000,
  CONTINENT: 10000000,
  COUNTRY: 3000000,
  STATE: 800000,
  CITY: 150000,
  NONNA: 30000,
};

type ZoomLevel = "EARTH" | "CONTINENT" | "COUNTRY" | "STATE" | "CITY" | "NONNA";

function useEarthNavigation() {
  const [currentLevel, setCurrentLevel] = useState<ZoomLevel>("EARTH");
  return {
    currentLevel,
    setLevel: setCurrentLevel,
  };
}

declare global {
  interface Window {
    google?: any;
  }
}

function loadGoogleMaps(apiKey: string) {
  if (window.google?.maps?.importLibrary) return Promise.resolve();

  return new Promise<void>((resolve, reject) => {
    const scriptId = "google-maps-js";

    if (document.getElementById(scriptId)) {
      const t = setInterval(() => {
        if (window.google?.maps?.importLibrary) {
          clearInterval(t);
          resolve();
        }
      }, 50);
      setTimeout(() => {
        clearInterval(t);
        if (!window.google?.maps?.importLibrary)
          reject(new Error("Google Maps JS loader timed out"));
      }, 10000);
      return;
    }

    const s = document.createElement("script");
    s.id = scriptId;
    s.async = true;
    s.defer = true;
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      apiKey
    )}&v=alpha&loading=async`;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Google Maps JS"));
    document.head.appendChild(s);
  });
}

type LatLngLiteral = { lat: number; lng: number };

function extractLatLng(rawPos: any): LatLngLiteral | null {
  if (!rawPos) return null;
  const lat = typeof rawPos.lat === "function" ? rawPos.lat() : Number(rawPos.lat);
  const lng = typeof rawPos.lng === "function" ? rawPos.lng() : Number(rawPos.lng);
  if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  return null;
}

function parseAdminLevelsFromGeocodeResult(result: any) {
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

// ─────────────────────────────────────────────────────────────────────────────
//  DETERMINISTIC AI-STYLE AVATAR
// ─────────────────────────────────────────────────────────────────────────────

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const PALETTES = [
  ["#f59e0b", "#ef4444", "#ec4899"],
  ["#d97706", "#b45309", "#92400e"],
  ["#f97316", "#ea580c", "#dc2626"],
  ["#a16207", "#ca8a04", "#eab308"],
  ["#7c3aed", "#c026d3", "#e11d48"],
  ["#059669", "#0d9488", "#0891b2"],
  ["#b45309", "#d97706", "#f59e0b"],
  ["#9f1239", "#be123c", "#e11d48"],
];

function generateAvatarSvgUri(name: string, countryCode: string): string {
  const seed = hashStr(name + countryCode);
  const [c0, c1, c2] = PALETTES[seed % PALETTES.length];
  const parts = name.trim().split(/\s+/);
  const initials =
    parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : (parts[0]?.[0] ?? "N").toUpperCase();
  const rot = (seed % 60) - 30;
  const id = seed % 9999;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <radialGradient id="g${id}" cx="40%" cy="35%" r="65%">
      <stop offset="0%" stop-color="${c1}" stop-opacity="0.9"/>
      <stop offset="60%" stop-color="${c0}" stop-opacity="0.95"/>
      <stop offset="100%" stop-color="${c2}"/>
    </radialGradient>
  </defs>
  <circle cx="50" cy="50" r="50" fill="url(#g${id})"/>
  <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="1.5" stroke-dasharray="8 4" transform="rotate(${rot},50,50)"/>
  <circle cx="50" cy="50" r="33" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="1" stroke-dasharray="5 6" transform="rotate(${-rot * 1.4},50,50)"/>
  <ellipse cx="38" cy="30" rx="16" ry="10" fill="rgba(255,255,255,0.18)"/>
  <text x="50" y="58" text-anchor="middle" font-family="Georgia,serif" font-size="30" font-weight="700" fill="rgba(255,255,255,0.95)">${initials}</text>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function countryFlag(code: string): string {
  if (!code || code.length !== 2) return "🌍";
  return String.fromCodePoint(
    ...code.toUpperCase().split("").map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  MARKER TEMPLATE — light, airy Pokémon Go aesthetic
// ─────────────────────────────────────────────────────────────────────────────

function buildMarkerTemplate(opts: {
  name: string;
  photoUrl: string | null;
  avatarUri: string;
  countryCode: string;
  countryName: string;
  nonnaCount: number;
  expanded?: boolean;
}): HTMLTemplateElement {
  const { name, avatarUri, countryCode, countryName, nonnaCount, expanded } = opts;
  const flag = countryFlag(countryCode);
  const displayName = (name || `Nonna from ${countryName}`)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const countLabel = nonnaCount === 1 ? '1 Nonna' : `${nonnaCount} Nonnas`;
  const badge = `${flag} ${countryName}  ·  ${countLabel}`;
  const uid = countryCode.toLowerCase().replace(/[^a-z]/g, '') + (expanded ? 'e' : 'c');

  const aR = 34;
  const cardW = Math.max(180, displayName.length * 9 + badge.length * 6.5 + 40);
  const cardH = 56;
  const gap = 8;
  const pad = 12;

  const svgW = Math.max((aR + pad) * 2, cardW + 8);
  const svgH = (aR + pad) + aR + gap + cardH + pad;

  const cx = svgW / 2;
  const cy = aR + pad;

  const imgHref = opts.photoUrl || avatarUri;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
  width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}" overflow="visible">
  <defs>
    <style>
      @keyframes floatBob {
        0%, 100% { transform: translateY(0px); }
        50%      { transform: translateY(-5px); }
      }
      .bob-anim {
        animation: floatBob 3.2s cubic-bezier(0.45, 0, 0.55, 1) infinite;
        transform-origin: center center;
      }
      @keyframes cardPop {
        0%   { opacity: 0; transform: translateY(-12px) scale(0.92); }
        100% { opacity: 1; transform: translateY(0px) scale(1); }
      }
      .card-anim {
        animation: cardPop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both;
        animation-delay: 0.02s;
        transform-origin: ${cx}px ${cy + aR + gap}px;
      }
    </style>
    <clipPath id="av${uid}">
      <circle cx="${cx}" cy="${cy}" r="${aR}"/>
    </clipPath>
    <filter id="ash${uid}" x="-40%" y="-40%" width="180%" height="180%">
      <feDropShadow dx="0" dy="5" stdDeviation="9" flood-color="rgba(0,0,0,0.20)"/>
    </filter>
    <filter id="csh${uid}" x="-8%" y="-20%" width="116%" height="160%">
      <feDropShadow dx="0" dy="4" stdDeviation="10" flood-color="rgba(0,0,0,0.10)"/>
    </filter>
    <radialGradient id="bloom${uid}" cx="50%" cy="58%" r="50%">
      <stop offset="0%"   stop-color="rgba(255,255,255,0.6)"/>
      <stop offset="100%" stop-color="rgba(255,255,255,0)"/>
    </radialGradient>
  </defs>

  <g class="">
    <ellipse cx="${cx}" cy="${cy + 5}" rx="${aR + 22}" ry="${aR + 16}" fill="url(#bloom${uid})"/>
    <circle cx="${cx}" cy="${cy}" r="${aR}" fill="none" stroke="rgba(255,255,255,0.82)" stroke-width="2.5">
      <animate attributeName="r" values="${aR};${aR + 24};${aR}" dur="2.4s" repeatCount="indefinite"/>
      <animate attributeName="opacity" values="0.85;0;0.85" dur="2.4s" repeatCount="indefinite"/>
    </circle>
    <circle cx="${cx}" cy="${cy}" r="${aR}" fill="none" stroke="rgba(255,255,255,0.42)" stroke-width="2">
      <animate attributeName="r" values="${aR};${aR + 42};${aR}" dur="2.4s" begin="0.8s" repeatCount="indefinite"/>
      <animate attributeName="opacity" values="0.6;0;0.6" dur="2.4s" begin="0.8s" repeatCount="indefinite"/>
    </circle>
    <circle cx="${cx}" cy="${cy}" r="${aR + 3}" fill="white" filter="url(#ash${uid})"/>
    <image href="${imgHref}" x="${cx - aR}" y="${cy - aR}" width="${aR * 2}" height="${aR * 2}"
      clip-path="url(#av${uid})" preserveAspectRatio="xMidYMid slice"/>
    <circle cx="${cx}" cy="${cy}" r="${aR}" fill="none" stroke="white" stroke-width="3.5"/>
    ${expanded ? `
    <g class="card-anim">
      <g filter="url(#csh${uid})">
        <rect x="${Math.round((svgW - cardW) / 2)}" y="${cy + aR + gap}"
          width="${cardW}" height="${cardH}" rx="${cardH / 2}" fill="rgba(255,255,255,0.97)"/>
      </g>
      <text x="${cx}" y="${cy + aR + gap + 22}" text-anchor="middle"
        font-family="-apple-system,'SF Pro Text','Helvetica Neue',Arial,sans-serif"
        font-size="14" font-weight="700" fill="#111827">${displayName}</text>
      <text x="${cx}" y="${cy + aR + gap + 40}" text-anchor="middle"
        font-family="-apple-system,'SF Pro Text','Helvetica Neue',Arial,sans-serif"
        font-size="11.5" font-weight="500" fill="#9ca3af">${badge}</text>
    </g>
    ` : ''}
  </g>
</svg>`;

  const tpl = document.createElement('template');
  tpl.innerHTML = svg.trim();
  return tpl;
}

type GlobeNonna = {
  id: string;
  lat: number;
  lng: number;
  countryCode: string;
  countryName: string;
  nonnaCount: number;
  representativeName: string;
  representativeTitle: string;
  representativePhoto: string | null;
};

// ─────────────────────────────────────────────────────────────────────────────
//  MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function Earth3DPage() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const map3dRef = useRef<any>(null);

  const [activePlaceName, setActivePlaceName] = useState<string | null>(null);
  const [hoveredLabel, setHoveredLabel] = useState<string | null>(null);
  const [clickedLabel, setClickedLabel] = useState<string | null>(null);
  const [nonnaData, setNonnaData] = useState<GlobeNonna[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const [is3DMode, setIs3DMode] = useState(false);

  const { currentLevel, setLevel } = useEarthNavigation();
  const currentLevelRef = useRef<ZoomLevel>(currentLevel);

  useEffect(() => {
    currentLevelRef.current = currentLevel;
  }, [currentLevel]);

  // Mock data for demo
  useEffect(() => {
    const mockData: GlobeNonna[] = [
      {
        id: "1",
        lat: 41.9028,
        lng: 12.4964,
        countryCode: "IT",
        countryName: "Italy",
        nonnaCount: 5,
        representativeName: "Maria Rossi",
        representativeTitle: "Traditional Cook",
        representativePhoto: null,
      },
      {
        id: "2",
        lat: 40.7128,
        lng: -74.0060,
        countryCode: "US",
        countryName: "United States",
        nonnaCount: 3,
        representativeName: "Anna Smith",
        representativeTitle: "Home Chef",
        representativePhoto: null,
      },
      {
        id: "3",
        lat: 48.8566,
        lng: 2.3522,
        countryCode: "FR",
        countryName: "France",
        nonnaCount: 2,
        representativeName: "Marie Dubois",
        representativeTitle: "Baker",
        representativePhoto: null,
      },
    ];
    setNonnaData(mockData);
  }, []);

  // Place nonna markers
  useEffect(() => {
    if (!nonnaData.length || !mapReady || !map3dRef.current) return;

    const map3d = map3dRef.current;
    const placedMarkers: any[] = [];
    const timers: ReturnType<typeof setTimeout>[] = [];

    (async () => {
      try {
        const { Marker3DInteractiveElement } = await window.google.maps.importLibrary("maps3d");

        for (const nonna of nonnaData) {
          const avatarUri = generateAvatarSvgUri(
            nonna.representativeName || nonna.countryName,
            nonna.countryCode
          );

          const tplCompact = buildMarkerTemplate({
            name: nonna.representativeName,
            photoUrl: nonna.representativePhoto,
            avatarUri,
            countryCode: nonna.countryCode,
            countryName: nonna.countryName,
            nonnaCount: nonna.nonnaCount,
            expanded: false
          });

          const tplExpanded = buildMarkerTemplate({
            name: nonna.representativeName,
            photoUrl: nonna.representativePhoto,
            avatarUri,
            countryCode: nonna.countryCode,
            countryName: nonna.countryName,
            nonnaCount: nonna.nonnaCount,
            expanded: true
          });

          const marker = new Marker3DInteractiveElement({
            position: { lat: nonna.lat, lng: nonna.lng, altitude: 50 },
            altitudeMode: "RELATIVE_TO_GROUND",
          } as any);

          marker.append(tplCompact.cloneNode(true));
          map3d.append(marker);
          placedMarkers.push(marker);

          let localTimer: ReturnType<typeof setTimeout> | null = null;
          let isExpanded = false;

          marker.addEventListener('gmp-click', (e: Event) => {
            e.stopPropagation();
            isExpanded = true;
            marker.replaceChildren(tplExpanded.cloneNode(true));

            if (localTimer) clearTimeout(localTimer);
            localTimer = setTimeout(() => {
              isExpanded = false;
              marker.replaceChildren(tplCompact.cloneNode(true));
            }, 5000);
            timers.push(localTimer);
          });
        }

        console.log(`[Earth3D] Placed ${placedMarkers.length} nonna markers`);
      } catch (err) {
        console.warn("[Earth3D] Marker3DInteractiveElement failed:", err);
      }
    })();

    return () => {
      for (const t of timers) clearTimeout(t);
      for (const m of placedMarkers) {
        try { m.remove(); } catch { /* ignore */ }
      }
    };
  }, [nonnaData, mapReady]);

  // Main map init
  useEffect(() => {
    let mounted = true;
    let animationFrameId = 0;
    let idleTimeout: ReturnType<typeof setTimeout> | null = null;
    const listeners: Array<() => void> = [];
    let isProgrammaticFlight = false;
    let lastClickedLatLng: LatLngLiteral | null = null;

    async function init() {
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "YOUR_API_KEY_HERE";
      if (!apiKey || apiKey === "YOUR_API_KEY_HERE") {
        console.error("Missing NEXT_PUBLIC_GOOGLE_MAPS_API_KEY");
        return;
      }

      await loadGoogleMaps(apiKey);
      if (!mounted || !containerRef.current) return;

      console.log("[Earth3D] Loading map libraries...");

      const { Map3DElement, Marker3DElement, Polygon3DElement } =
        await window.google.maps.importLibrary("maps3d");

      const { Geocoder } = await window.google.maps.importLibrary("geocoding");
      const geocoder = new Geocoder();

      console.log("[Earth3D] Creating Map3DElement...");

      const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID;

      // Use the proper Map3DElement constructor
      const map3d = new Map3DElement({
        center: { lat: 20, lng: 0, altitude: 0 },
        range: 30000000,
        tilt: 0,
        heading: 0,
        mode: "HYBRID",
        ...(mapId ? { mapId } : {}),
      });

      // Set default labels disabled as an attribute (required for 3D tiles)
      map3d.setAttribute('default-labels-disabled', '');

      containerRef.current.innerHTML = "";
      containerRef.current.appendChild(map3d);

      // Ensure the map element has proper dimensions
      map3d.style.display = "block";
      map3d.style.width = "100%";
      map3d.style.height = "100%";

      console.log("[Earth3D] Map element appended, waiting for initialization...");
      console.log("[Earth3D] Container dimensions:", containerRef.current?.offsetWidth, containerRef.current?.offsetHeight);

      // Wait for map to be ready before exposing it
      await new Promise<void>((resolve) => {
        const checkReady = () => {
          if (map3d.center) {
            console.log("[Earth3D] Map is ready!");
            resolve();
          } else {
            setTimeout(checkReady, 100);
          }
        };
        checkReady();
      });

      // Expose map3d so the nonna marker effect can use it
      map3dRef.current = map3d;
      setMapReady(true);

      // Check after 2 seconds
      setTimeout(() => {
        console.log('[Earth3D] Map center after 2s:', map3d.center);
        console.log('[Earth3D] Map range after 2s:', map3d.range);
      }, 2000);

      // Boundary polygons
      const polygonOverlays: any[] = [];
      let activeHighlightName: string | null = null;

      const clearPolygonOverlays = () => {
        for (const p of polygonOverlays) {
          try { p.remove(); } catch { /* ignore */ }
        }
        polygonOverlays.length = 0;
      };

      const fetchAndDrawBoundary = async (
        name: string,
        featureType: "country" | "state" | "city",
        countryCode?: string | null
      ) => {
        try {
          const params = new URLSearchParams({ polygon_geojson: "1", format: "json", limit: "1" });
          if (featureType === "country") {
            params.set("featuretype", "country");
            params.set("country", name);
          } else if (featureType === "state") {
            params.set("featuretype", "state");
            params.set("state", name);
            if (countryCode) params.set("countrycodes", countryCode.toLowerCase());
          } else {
            params.set("featuretype", "city");
            params.set("city", name);
            if (countryCode) params.set("countrycodes", countryCode.toLowerCase());
          }

          const url = `https://nominatim.openstreetmap.org/search?${params.toString()}`;
          const res = await fetch(url, { headers: { "User-Agent": "NonnasMaps/1.0" } });
          if (!res.ok) throw new Error(`Nominatim HTTP ${res.status}`);
          const data = await res.json();
          const geojson = data?.[0]?.geojson;
          if (!geojson) { console.warn("[Earth3D] No GeoJSON for", name); return; }

          let rings: number[][][] = [];
          if (geojson.type === "Polygon") rings = [geojson.coordinates[0]];
          else if (geojson.type === "MultiPolygon")
            rings = (geojson.coordinates as number[][][][]).map((poly) => poly[0]);
          else return;

          const MAX_RING_POINTS = 400;
          const simplifyRing = (ring: number[][]): number[][] => {
            if (ring.length <= MAX_RING_POINTS) return ring;
            const step = Math.ceil(ring.length / MAX_RING_POINTS);
            const out = ring.filter((_, i) => i % step === 0);
            const first = out[0], last = out[out.length - 1];
            if (first[0] !== last[0] || first[1] !== last[1]) out.push(first);
            return out;
          };
          rings = rings.map(simplifyRing).filter((r) => r.length >= 4);
          if (!rings.length) return;

          clearPolygonOverlays();
          for (const ring of rings) {
            const outerCoordinates = ring.map(([lng, lat]: number[]) => ({ lat, lng, altitude: 0 }));
            const poly = new Polygon3DElement({
              outerCoordinates,
              fillColor: "rgba(180, 83, 9, 0.28)",
              strokeColor: "#b45309",
              strokeWidth: 2.5,
              altitudeMode: "CLAMP_TO_GROUND",
            });
            map3d.append(poly);
            polygonOverlays.push(poly);
          }
        } catch (err) {
          console.warn("[Earth3D] fetchAndDrawBoundary failed:", err);
        }
      };

      async function reverseGeocode(latLng: LatLngLiteral) {
        try {
          const response = await geocoder.geocode({ location: latLng });
          const first = response?.results?.[0];
          if (!first) return null;
          return {
            latLng,
            formattedAddress: first.formatted_address ?? null,
            ...parseAdminLevelsFromGeocodeResult(first),
            rawResults: response.results,
            raw: first,
          };
        } catch { return null; }
      }

      function flyTo(latLng: LatLngLiteral, range: number, durationMillis = 1500, tilt = 0) {
        isProgrammaticFlight = true;
        map3d.flyCameraTo({
          endCamera: { center: { lat: latLng.lat, lng: latLng.lng, altitude: 0 }, range, tilt, heading: 0 },
          durationMillis,
        });
        window.setTimeout(() => { isProgrammaticFlight = false; }, durationMillis + 100);
      }

      const handleMapClick = async (e: any) => {
        try {
          e.preventDefault?.();
          const latLng = extractLatLng(e.position || e.latLng);
          if (!latLng) return;
          lastClickedLatLng = latLng;
          if (isProgrammaticFlight) return;

          const placeInfo = await reverseGeocode(latLng);
          if (!mounted || !placeInfo) return;

          const level = currentLevelRef.current;
          let targetPlaceName: string | null = null;

          if (level === "EARTH" || level === "CONTINENT") {
            const r = placeInfo.rawResults.find((r: any) => r.types.includes("country"));
            if (r) targetPlaceName = r.address_components[0]?.long_name;
            flyTo(latLng, ZOOM_RANGES.COUNTRY, 1500);
          } else if (level === "COUNTRY") {
            const r = placeInfo.rawResults.find((r: any) => r.types.includes("administrative_area_level_1"));
            if (r) targetPlaceName = r.address_components[0]?.long_name;
            flyTo(latLng, ZOOM_RANGES.STATE, 1500);
          } else if (level === "STATE") {
            const r = placeInfo.rawResults.find((r: any) => r.types.includes("locality"));
            if (r) targetPlaceName = r.address_components[0]?.long_name;
            flyTo(latLng, ZOOM_RANGES.CITY, 1200, 55);
          } else if (level === "CITY") {
            flyTo(latLng, ZOOM_RANGES.NONNA, 1000, 65);
          }

          const resolvedName = targetPlaceName || placeInfo.country || placeInfo.state || null;
          if (resolvedName) {
            if (resolvedName === activeHighlightName) {
              clearPolygonOverlays();
              activeHighlightName = null;
              if (mounted) { setClickedLabel(null); setHoveredLabel(null); }
            } else {
              activeHighlightName = resolvedName;
              if (mounted) { setClickedLabel(resolvedName); setHoveredLabel(null); }
              const featureType =
                level === "EARTH" || level === "CONTINENT" ? "country"
                  : level === "COUNTRY" ? "state" : "city";
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

      // Zoom / animation loop
      let currentSize = 0;
      let currentOpacity = 0;
      const LERP_SPEED = 0.1;
      const EARTH_RADIUS = 6371000;
      const FOV_FACTOR = 1.6;

      const checkZoom = () => {
        if (!mounted || !overlayRef.current) return;

        const currentRange = Number(map3d.range ?? ZOOM_RANGES.EARTH);
        const distance = EARTH_RADIUS + currentRange;
        const d = Math.max(distance, EARTH_RADIUS + 10);
        const alpha = Math.asin(EARTH_RADIUS / d);
        const rPx = Math.tan(alpha) * window.innerHeight * FOV_FACTOR;
        const targetSize = (rPx + 60) * 2.5;

        let targetOpacity = 1;
        if (currentRange < 8000000) targetOpacity = 0;
        else if (currentRange < 12000000) targetOpacity = (currentRange - 8000000) / 4000000;

        let newLevel: ZoomLevel = "EARTH";
        if (currentRange <= ZOOM_RANGES.NONNA * 2) newLevel = "NONNA";
        else if (currentRange <= ZOOM_RANGES.CITY * 2) newLevel = "CITY";
        else if (currentRange <= ZOOM_RANGES.STATE * 2) newLevel = "STATE";
        else if (currentRange <= ZOOM_RANGES.COUNTRY * 2) newLevel = "COUNTRY";
        else if (currentRange <= ZOOM_RANGES.CONTINENT * 1.5) newLevel = "CONTINENT";

        if (newLevel !== currentLevelRef.current) {
          setLevel(newLevel);
          if (newLevel === "EARTH" || newLevel === "CONTINENT") {
            clearPolygonOverlays();
            activeHighlightName = null;
            setClickedLabel(null);
            setHoveredLabel(null);
          }
        }

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

      const handleCameraIdle = () => {
        if (!mounted || isProgrammaticFlight) return;
        const currentLvl = currentLevelRef.current;
        const targetRange = ZOOM_RANGES[currentLvl];
        const currentRange = Number(map3d.range);
        const tolerance = targetRange * 0.1;
        if (Math.abs(currentRange - targetRange) > tolerance) {
          map3d.flyCameraTo({
            endCamera: { center: map3d.center, range: targetRange, tilt: map3d.tilt, heading: map3d.heading },
            durationMillis: 800,
          });
        }
      };

      const debounceIdle = () => {
        if (idleTimeout) clearTimeout(idleTimeout);
        idleTimeout = setTimeout(handleCameraIdle, 1000);
      };

      map3d.addEventListener("gmp-centerchange", debounceIdle);
      map3d.addEventListener("gmp-rangechange", debounceIdle);
      listeners.push(() => map3d.removeEventListener("gmp-centerchange", debounceIdle));
      listeners.push(() => map3d.removeEventListener("gmp-rangechange", debounceIdle));
    }

    init().catch((err) => console.error("[Earth3D] init failed:", err));

    return () => {
      mounted = false;
      map3dRef.current = null;
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (idleTimeout) clearTimeout(idleTimeout);
      for (const off of listeners) { try { off(); } catch { /* no-op */ } }
    };
  }, [setLevel]);

  const displayLabel = clickedLabel || hoveredLabel || null;
  const isClickedLabel = !!clickedLabel;

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />

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
              background: isClickedLabel ? "rgba(180, 83, 9, 0.85)" : "rgba(30, 20, 5, 0.55)",
              border: isClickedLabel ? "1.5px solid #d97706" : "1px solid rgba(217, 119, 6, 0.5)",
              backdropFilter: "blur(8px)",
              boxShadow: isClickedLabel ? "0 4px 24px rgba(180, 83, 9, 0.4)" : "0 2px 12px rgba(0,0,0,0.3)",
              transition: "all 0.2s ease",
            }}
          >
            {isClickedLabel && (
              <span
                style={{
                  width: "7px", height: "7px", borderRadius: "50%",
                  background: "#fbbf24", boxShadow: "0 0 6px #fbbf24", flexShrink: 0,
                }}
              />
            )}
            <span
              style={{
                color: isClickedLabel ? "#fef3c7" : "#fde68a",
                fontSize: isClickedLabel ? "15px" : "13px",
                fontWeight: 700, letterSpacing: "0.12em",
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

      <div
        ref={overlayRef}
        className="pointer-events-none absolute top-1/2 left-1/2 z-10"
        style={{ transform: "translate(-50%, -50%)", opacity: 0, willChange: "width, height, opacity" }}
      >
        <svg
          viewBox="0 0 1000 1000"
          className="w-full h-full overflow-visible"
          style={{ animation: "spin-reverse 150s linear infinite" }}
        >
          <style>{`
            @keyframes spin-reverse {
              from { transform: rotate(0deg); }
              to   { transform: rotate(-360deg); }
            }
            @keyframes fadeInLabel {
              from { opacity: 0; transform: translateX(-50%) translateY(-6px); }
              to   { opacity: 1; transform: translateX(-50%) translateY(0); }
            }
          `}</style>
          <defs>
            <path id="globePath" d="M 100, 500 a 400,400 0 1,1 800,0 a 400,400 0 1,1 -800,0" />
          </defs>
          <text
            className="font-bold fill-[#FFF7ED]"
            style={{ fontSize: "65px", fontFamily: "ui-sans-serif, system-ui, sans-serif", textShadow: "0px 4px 15px rgba(0,0,0,0.8)" }}
          >
            <textPath href="#globePath" startOffset="50%" textAnchor="middle" textLength="2300" lengthAdjust="spacing">
              NONNAS OF THE WORLD
            </textPath>
          </text>
        </svg>
      </div>

      {mapReady && (
        <button
          onClick={() => {
            if (!map3dRef.current) return;
            const map3d = map3dRef.current;
            const newMode = !is3DMode;
            setIs3DMode(newMode);

            map3d.flyCameraTo({
              endCamera: {
                center: map3d.center,
                range: map3d.range,
                heading: map3d.heading,
                tilt: newMode ? 65 : 0
              },
              durationMillis: 1000
            });
          }}
          className={`absolute bottom-8 right-8 z-50 px-6 py-3 rounded-full font-bold shadow-lg backdrop-blur-md transition-all duration-300 border ${is3DMode
            ? 'bg-blue-600/90 text-white border-blue-400 hover:bg-blue-500 shadow-blue-500/50'
            : 'bg-white/90 text-gray-800 border-gray-200 hover:bg-white hover:scale-105'
            }`}
        >
          {is3DMode ? "2D" : "3D"}
        </button>
      )}
    </div>
  );
}