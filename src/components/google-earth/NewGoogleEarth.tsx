"use client";
import { useCallback, useEffect, useRef, useState } from "react";
const ZOOM_RANGES = {
  EARTH: 30000000,
  CONTINENT: 10000000,
  COUNTRY: 3000000,
  STATE: 800000,
  CITY: 150000,
  NONNA: 30000,
};
type ZoomLevel = "EARTH" | "CONTINENT" | "COUNTRY" | "STATE" | "CITY" | "NONNA";
const ZOOM_LEVEL_META: Record<
  ZoomLevel,
  { label: string; icon: string; description: string }
> = {
  EARTH: { label: "World", icon: "🌍", description: "See all Nonnas globally" },
  CONTINENT: {
    label: "Region",
    icon: "🗺️",
    description: "Browse by continent",
  },
  COUNTRY: { label: "Country", icon: "📍", description: "Explore by country" },
  STATE: { label: "State", icon: "🏙️", description: "Dive into regions" },
  CITY: { label: "City", icon: "🏘️", description: "Find local Nonnas" },
  NONNA: { label: "Nonna", icon: "👵", description: "Meet a Nonna" },
};
// Teal brand palette
const TEAL = {
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
function useEarthNavigation() {
  const [currentLevel, setCurrentLevel] = useState<ZoomLevel>("EARTH");
  return { currentLevel, setLevel: setCurrentLevel };
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
        if (!window.google?.maps?.importLibrary) reject(new Error("timeout"));
      }, 10000);
      return;
    }
    const s = document.createElement("script");
    s.id = scriptId;
    s.async = true;
    s.defer = true;
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=alpha&loading=async`;
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
  let country: string | null = null,
    state: string | null = null;
  let countryCode: string | null = null,
    stateCode: string | null = null;
  for (const c of result?.address_components ?? []) {
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
// Avatar generation
function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++)
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
const PALETTES = [
  ["#0d9488", "#0891b2", "#059669"],
  ["#14b8a6", "#06b6d4", "#10b981"],
  ["#0f766e", "#0e7490", "#065f46"],
  ["#5eead4", "#67e8f9", "#6ee7b7"],
  ["#0d9488", "#7c3aed", "#0891b2"],
  ["#059669", "#0d9488", "#0891b2"],
  ["#0e7490", "#0f766e", "#047857"],
  ["#14b8a6", "#0d9488", "#0891b2"],
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
    ...code
      .toUpperCase()
      .split("")
      .map((c) => 0x1f1e6 + c.charCodeAt(0) - 65),
  );
}
function buildMarkerTemplate(opts: {
  name: string;
  photoUrl: string | null;
  avatarUri: string;
  countryCode: string;
  countryName: string;
  nonnaCount: number;
  expanded?: boolean;
  mode: "avatar" | "bubble-small" | "bubble-large";
}): HTMLTemplateElement {
  const {
    name,
    avatarUri,
    countryCode,
    countryName,
    nonnaCount,
    expanded,
    mode,
  } = opts;
  const flag = countryFlag(countryCode);
  const displayName = (name || `Nonna from ${countryName}`)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
  const countLabel = nonnaCount === 1 ? "1 Nonna" : `${nonnaCount} Nonnas`;
  const badge = `${flag} ${countryName}  ·  ${countLabel}`;
  const uid =
    countryCode.toLowerCase().replace(/[^a-z]/g, "") +
    (expanded ? "e" : "c") +
    mode;
  const isLarge = mode === "bubble-large";
  const aR = isLarge ? 100 : 34;
  const cardW = Math.max(180, displayName.length * 9 + badge.length * 6.5 + 40);
  const cardH = 56;
  const gap = 8;
  const pad = isLarge ? 24 : 12;
  const svgW = Math.max((aR + pad) * 2, cardW + 8);
  const svgH = aR + pad + aR + gap + cardH + pad;
  const cx = svgW / 2;
  const cy = aR + pad;
  const imgHref = opts.photoUrl || avatarUri;
  let markerContent = "";
  if (mode === "bubble-large" || mode === "bubble-small") {
    const baseR = isLarge ? 85 : 28;
    const bubbleRadius = Math.min(baseR + nonnaCount.toString().length * 2, aR);
    const fontSize = isLarge ? 56 : 22;
    const yOffset = isLarge ? 18 : 8;
    const strokeW = isLarge ? 8 : 4;
    markerContent = `
      <circle cx="${cx}" cy="${cy}" r="${bubbleRadius}" fill="${TEAL.primary}" stroke="white" stroke-width="${strokeW}" filter="url(#ash${uid})"/>
      <text x="${cx}" y="${cy + yOffset}" text-anchor="middle" font-family="Arial,sans-serif" font-size="${fontSize}" font-weight="900" fill="white">${nonnaCount}</text>
    `;
  } else {
    markerContent = `
      <ellipse cx="${cx}" cy="${cy + 5}" rx="${aR + 22}" ry="${aR + 16}" fill="url(#bloom${uid})"/>
      <circle cx="${cx}" cy="${cy}" r="${aR}" fill="none" stroke="rgba(94,234,212,0.82)" stroke-width="2.5">
        <animate attributeName="r" values="${aR};${aR + 24};${aR}" dur="2.4s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0.85;0;0.85" dur="2.4s" repeatCount="indefinite"/>
      </circle>
      <circle cx="${cx}" cy="${cy}" r="${aR}" fill="none" stroke="rgba(94,234,212,0.42)" stroke-width="2">
        <animate attributeName="r" values="${aR};${aR + 42};${aR}" dur="2.4s" begin="0.8s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0.6;0;0.6" dur="2.4s" begin="0.8s" repeatCount="indefinite"/>
      </circle>
      <circle cx="${cx}" cy="${cy}" r="${aR + 3}" fill="white" filter="url(#ash${uid})"/>
      <image href="${imgHref}" x="${cx - aR}" y="${cy - aR}" width="${aR * 2}" height="${aR * 2}"
        clip-path="url(#av${uid})" preserveAspectRatio="xMidYMid slice"/>
      <circle cx="${cx}" cy="${cy}" r="${aR}" fill="none" stroke="${TEAL.light}" stroke-width="3.5"/>
    `;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
  width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}" overflow="visible">
  <defs>
    <style>
      @keyframes floatBob { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-5px); } }
      .bob-anim { animation: floatBob 3.2s cubic-bezier(0.45, 0, 0.55, 1) infinite; transform-origin: center center; }
      @keyframes cardPop {
        0%   { opacity: 0; transform: translateY(-12px) scale(0.92); }
        100% { opacity: 1; transform: translateY(0px) scale(1); }
      }
      .card-anim { animation: cardPop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both; animation-delay: 0.02s; transform-origin: ${cx}px ${cy + aR + gap}px; }
    </style>
    <clipPath id="av${uid}"><circle cx="${cx}" cy="${cy}" r="${aR}"/></clipPath>
    <filter id="ash${uid}" x="-40%" y="-40%" width="180%" height="180%">
      <feDropShadow dx="0" dy="5" stdDeviation="6" flood-color="rgba(0,0,0,0.30)"/>
    </filter>
    <filter id="csh${uid}" x="-8%" y="-20%" width="116%" height="160%">
      <feDropShadow dx="0" dy="4" stdDeviation="10" flood-color="rgba(0,0,0,0.10)"/>
    </filter>
    <radialGradient id="bloom${uid}" cx="50%" cy="58%" r="50%">
      <stop offset="0%"   stop-color="rgba(94,234,212,0.5)"/>
      <stop offset="100%" stop-color="rgba(94,234,212,0)"/>
    </radialGradient>
  </defs>
  <g class="">
    ${markerContent}
    ${expanded && mode === "avatar"
      ? `
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
    `
      : ""
    }
  </g >
</svg > `;
  const tpl = document.createElement("template");
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
//  LEVEL INDICATOR COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
function LevelIndicator({ currentLevel }: { currentLevel: ZoomLevel }) {
  const levels: ZoomLevel[] = [
    "EARTH",
    "CONTINENT",
    "COUNTRY",
    "STATE",
    "CITY",
    "NONNA",
  ];
  const currentIdx = levels.indexOf(currentLevel);
  const meta = ZOOM_LEVEL_META[currentLevel];
  return (
    <div
      style={{
        position: "absolute",
        bottom: "32px",
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "10px",
        zIndex: 50,
        pointerEvents: "none",
      }}
    >
      {/* Current level badge */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          padding: "12px 28px",
          borderRadius: "999px",
          background: "rgba(13,148,136,0.85)",
          border: "1.5px solid rgba(94,234,212,0.6)",
          backdropFilter: "blur(12px)",
          boxShadow: "0 4px 24px rgba(13,148,136,0.3)",
        }}
      >
        <span style={{ fontSize: "22px" }}>{meta.icon}</span>
        <span
          style={{
            color: "#ccfbf1",
            fontSize: "15px",
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            fontFamily: "ui-sans-serif, system-ui, sans-serif",
          }}
        >
          {meta.label}
        </span>
        <span
          style={{
            color: "rgba(204,251,241,0.6)",
            fontSize: "13px",
            fontWeight: 400,
          }}
        >
          — {meta.description}
        </span>
      </div>
      {/* Progress dots */}
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        {levels.map((lvl, i) => (
          <div
            key={lvl}
            style={{
              width: i === currentIdx ? "32px" : "10px",
              height: "10px",
              borderRadius: "999px",
              background:
                i === currentIdx
                  ? TEAL.light
                  : i < currentIdx
                    ? "rgba(94,234,212,0.5)"
                    : "rgba(255,255,255,0.2)",
              transition: "all 0.4s cubic-bezier(0.34,1.56,0.64,1)",
              boxShadow: i === currentIdx ? `0 0 8px ${TEAL.lighter} ` : "none",
            }}
          />
        ))}
      </div>
    </div>
  );
}
// ─────────────────────────────────────────────────────────────────────────────
//  ZOOM CONTROL — large, friendly buttons for older users
// ─────────────────────────────────────────────────────────────────────────────
function ZoomControl({
  onZoomIn,
  onZoomOut,
  currentLevel,
}: {
  onZoomIn: () => void;
  onZoomOut: () => void;
  currentLevel: ZoomLevel;
}) {
  const levels: ZoomLevel[] = [
    "EARTH",
    "CONTINENT",
    "COUNTRY",
    "STATE",
    "CITY",
    "NONNA",
  ];
  const canZoomIn = levels.indexOf(currentLevel) < levels.length - 1;
  const canZoomOut = levels.indexOf(currentLevel) > 0;
  const btnStyle = (enabled: boolean): React.CSSProperties => ({
    width: "64px",
    height: "64px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: enabled ? "rgba(13,148,136,0.85)" : "rgba(30,30,30,0.4)",
    border: `2px solid ${enabled ? "rgba(94,234,212,0.6)" : "rgba(255,255,255,0.1)"} `,
    backdropFilter: "blur(12px)",
    boxShadow: enabled ? "0 4px 20px rgba(13,148,136,0.4)" : "none",
    cursor: enabled ? "pointer" : "not-allowed",
    opacity: enabled ? 1 : 0.4,
    transition: "all 0.2s ease",
    color: "white",
    fontSize: "32px",
    fontWeight: 300,
    lineHeight: 1,
    userSelect: "none",
  });
  return (
    <div
      style={{
        position: "absolute",
        right: "24px",
        top: "50%",
        transform: "translateY(-50%)",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        zIndex: 50,
      }}
    >
      {/* Zoom in = go deeper */}
      <button
        onClick={onZoomIn}
        disabled={!canZoomIn}
        title="Zoom In"
        style={btnStyle(canZoomIn)}
        onMouseEnter={(e) => {
          if (canZoomIn)
            (e.currentTarget as HTMLElement).style.transform = "scale(1.1)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.transform = "scale(1)";
        }}
      >
        +
      </button>
      {/* Zoom out = go broader */}
      <button
        onClick={onZoomOut}
        disabled={!canZoomOut}
        title="Zoom Out"
        style={btnStyle(canZoomOut)}
        onMouseEnter={(e) => {
          if (canZoomOut)
            (e.currentTarget as HTMLElement).style.transform = "scale(1.1)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.transform = "scale(1)";
        }}
      >
        −
      </button>
    </div>
  );
}
// ─────────────────────────────────────────────────────────────────────────────
//  MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function Earth3DPage() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const map3dRef = useRef<any>(null);
  const [activePlaceName, setActivePlaceName] = useState<string | null>(null);
  const [activeCountry, setActiveCountry] = useState<string | null>(null);
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
  const allClustersRef = useRef<{
    continents: GlobeNonna[];
    countries: GlobeNonna[];
    states: GlobeNonna[];
  } | null>(null);
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
  const applyClusterLevel = (
    level: ZoomLevel,
    data: typeof allClustersRef.current,
  ) => {
    if (!data) return;
    if (level === "EARTH" || level === "CONTINENT")
      setNonnaData(data.continents);
    else if (level === "COUNTRY" || level === "STATE")
      setNonnaData(data.states);
    else if (level === "CITY" || level === "NONNA")
      setNonnaData(data.countries);
  };
  useEffect(() => {
    if (!mapReady) return;
    let mounted = true;
    const fetchAll = async () => {
      try {
        const res = await fetch("/api/nonnas/clustering?level=ALL");
        if (!res.ok) throw new Error("Failed to fetch all clusters");
        const data = await res.json();

        if (mounted) {
          allClustersRef.current = {
            continents: data.continents ?? [],
            countries: data.countries ?? [],
            states: data.states ?? [],
          };
          applyClusterLevel(currentLevelRef.current, allClustersRef.current);
        }
      } catch (err) {
        console.error("[Earth3D] cluster fetch error:", err);
      }
    };
    fetchAll();
    const poll = setInterval(fetchAll, 5 * 60 * 1000);
    return () => {
      mounted = false;
      clearInterval(poll);
    };
  }, [mapReady]);
  useEffect(() => {
    if (!allClustersRef.current) return;
    applyClusterLevel(currentLevel, allClustersRef.current);
  }, [currentLevel]);
  // 3D tilt on deep zoom
  useEffect(() => {
    if (!mapReady || !map3dRef.current || flightStateRef.current.active) return;
    const map3d = map3dRef.current;

    if (currentLevel === "NONNA") {
      setIs3DMode(true);
      if (map3d.tilt < 10) {

      }
    } else {
      setIs3DMode(false);
      if (map3d.tilt > 10) {

      }
    }
  }, [currentLevel, mapReady]);
  // Conditional labels for country names
  useEffect(() => {
    if (!mapReady || !map3dRef.current) return;
    const map3d = map3dRef.current;
    const deepLevels = ["COUNTRY", "STATE", "CITY", "NONNA"];
    const enableLabels = deepLevels.includes(currentLevel);
    if (enableLabels) {
      map3d.mode = "HYBRID";
    } else {
      map3d.mode = "SATELLITE";
    }
  }, [currentLevel, mapReady]);
  // Place nonna markers
  useEffect(() => {
    if (!nonnaData.length || !mapReady || !map3dRef.current) return;
    const map3d = map3dRef.current;
    const placedMarkers: any[] = [];
    const timers: ReturnType<typeof setTimeout>[] = [];
    (async () => {
      try {
        const { Marker3DInteractiveElement } =
          await window.google.maps.importLibrary("maps3d");
        for (const nonna of nonnaData) {

          const avatarUri = generateAvatarSvgUri(
            nonna.representativeName || nonna.countryName,
            nonna.countryCode,
          );
          const showExpanded =
            currentLevelRef.current === "CITY" ||
            currentLevelRef.current === "NONNA";
          const isHighZ =
            currentLevelRef.current === "EARTH" ||
            currentLevelRef.current === "CONTINENT";
          const markerMode = showExpanded
            ? "avatar"
            : isHighZ
              ? "bubble-large"
              : "bubble-small";
          const tplCompact = buildMarkerTemplate({
            name: nonna.representativeName,
            photoUrl: nonna.representativePhoto,
            avatarUri,
            countryCode: nonna.countryCode,
            countryName: nonna.countryName,
            nonnaCount: nonna.nonnaCount,
            expanded: showExpanded,
            mode: markerMode,
          });
          const tplExpanded = buildMarkerTemplate({
            name: nonna.representativeName,
            photoUrl: nonna.representativePhoto,
            avatarUri,
            countryCode: nonna.countryCode,
            countryName: nonna.countryName,
            nonnaCount: nonna.nonnaCount,
            expanded: true,
            mode: markerMode,
          });
          const marker = new Marker3DInteractiveElement({
            position: { lat: nonna.lat, lng: nonna.lng, altitude: 50 },
            altitudeMode: "RELATIVE_TO_GROUND",
          } as any);
          marker.append(tplCompact.cloneNode(true));
          map3d.append(marker);
          placedMarkers.push(marker);
          let localTimer: ReturnType<typeof setTimeout> | null = null;
          marker.addEventListener("gmp-click", (e: Event) => {
            e.stopPropagation();
            marker.replaceChildren(tplExpanded.cloneNode(true));
            if (localTimer) clearTimeout(localTimer);
            localTimer = setTimeout(() => {
              marker.replaceChildren(tplCompact.cloneNode(true));
            }, 5000);
            timers.push(localTimer!);
          });
        }
      } catch (err) {
        console.warn("[Earth3D] Marker3DInteractiveElement failed:", err);
      }
    })();
    return () => {
      for (const t of timers) clearTimeout(t);
      for (const m of placedMarkers) {
        try {
          m.remove();
        } catch {
          /**/
        }
      }
    };
  }, [nonnaData, mapReady]);
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
        tilt: next === "NONNA" ? 65 : 0,
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
  // Main map init
  useEffect(() => {
    let mounted = true;
    let animationFrameId = 0;
    const listeners: Array<() => void> = [];
    let isProgrammaticFlight = false;
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
      const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID;
      const map3d = new Map3DElement({
        center: { lat: 20, lng: 0, altitude: 0 },
        range: 30000000,
        tilt: 0,
        heading: 0,
        mode: "HYBRID",
        ...(mapId ? { mapId } : {}),
      });
      // Suppress noisy map labels
      map3d.setAttribute("default-labels-disabled", "");
      map3d.setAttribute("road-labels-mode", "none");
      map3d.setAttribute("transit-labels-mode", "none");
      map3d.setAttribute("poi-labels-mode", "none");
      // Suppress noisy map labels
      map3d.setAttribute("default-labels-disabled", "");
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
      const polygonOverlays: any[] = []; // eslint-disable-line @typescript-eslint/no-explicit-any
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
      const fetchAndDrawBoundary = async (
        name: string,
        featureType: "country" | "state" | "city",
        countryCode?: string | null,
      ) => {
        console.log("[Earth3D] Fetching boundary for", name, featureType, countryCode);
        try {
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
            if (countryCode)
              params.set("countrycodes", countryCode.toLowerCase());
          } else {
            params.set("featuretype", "city");
            params.set("city", name);
            if (countryCode)
              params.set("countrycodes", countryCode.toLowerCase());
          }
          const res = await fetch(
            `https://nominatim.openstreetmap.org/search?${params.toString()}`,
            { headers: { "User-Agent": "NonnasMaps/1.0" } },
          );
          if (!res.ok) {
            console.error("[Earth3D] Nominatim fetch failed:", res.status, res.statusText);
            throw new Error(`Nominatim HTTP ${res.status}`);
          }
          const data = await res.json();
          console.log("[Earth3D] Nominatim response data:", data);
          const geojson = data?.[0]?.geojson;
          if (!geojson) {
            console.warn("[Earth3D] No geojson found for", name, featureType);
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
          const MAX_RING_POINTS = 400;
          const simplifyRing = (ring: number[][]): number[][] => {
            if (ring.length <= MAX_RING_POINTS) return ring;
            const step = Math.ceil(ring.length / MAX_RING_POINTS);
            const out = ring.filter((_, i) => i % step === 0);
            const first = out[0],
              last = out[out.length - 1];
            if (first[0] !== last[0] || first[1] !== last[1]) out.push(first);
            return out;
          };
          rings = rings.map(simplifyRing).filter((r) => r.length >= 4);
          if (!rings.length) {
            console.warn("[Earth3D] No valid rings after simplification for", name);
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
              strokeColor: TEAL.stroke,
              strokeWidth: 2.5,
              altitudeMode: "CLAMP_TO_GROUND",
            });
            map3d.append(poly);
            polygonOverlays.push(poly);
          }
          console.log("[Earth3D] Successfully drew boundary for", name);
        } catch (err) {
          console.error("[Earth3D] Boundary fetch/draw error for", name, ":", err);
        }
      };
      let hoverPolygonOverlays: any[] = []; // eslint-disable-line @typescript-eslint/no-explicit-any
      const handleMouseMove = async (e: any) => {
        const latLng = extractLatLng(e.position || e.latLng);
        if (!latLng) return;
        if (hoverTimer) clearTimeout(hoverTimer);
        hoverTimer = setTimeout(async () => {
          try {
            const level = currentLevelRef.current;
            const currentRange = map3dRef.current ? Number(map3dRef.current.range ?? ZOOM_RANGES.EARTH) : ZOOM_RANGES.EARTH;
            // Only show hover highlights at country-level and deeper
            if (level === "EARTH" || currentRange > ZOOM_RANGES.COUNTRY * 2) {
              return;
            }
            const response = await geocoder.geocode({ location: latLng });
            const first = response?.results?.[0];
            if (!first || !mounted) return;
            const info = parseAdminLevelsFromGeocodeResult(first);
            let hoverName: string | null = null;
            let featureType: "country" | "state" | "city" = "country";
            if (level === "CONTINENT" || level === "COUNTRY") {
              hoverName = info.country;
              featureType = "country";
            } else if (level === "STATE") {
              hoverName = info.state || info.country;
              featureType = info.state ? "state" : "country";
            } else {
              hoverName = info.state || info.country;
              featureType = info.state ? "state" : "country";
            }
            if (
              hoverName &&
              hoverName !== lastHoverName &&
              hoverName !== activeHighlightName
            ) {
              lastHoverName = hoverName;
              if (mounted) setHoveredLabel(hoverName);

              // Draw hover highlight polygon
              if (hoverName && hoverName !== activeHighlightName) {
                // Clear previous hover polygons
                for (const p of hoverPolygonOverlays) {
                  try { p.remove(); } catch { /**/ }
                }
                hoverPolygonOverlays = [];

                // Draw new hover polygon with lighter styling
                try {
                  const params = new URLSearchParams({
                    polygon_geojson: "1",
                    format: "json",
                    limit: "1",
                  });
                  if (featureType === "country") {
                    params.set("q", hoverName);
                    params.set("featuretype", "country");
                  } else if (featureType === "state") {
                    params.set("featuretype", "state");
                    params.set("state", hoverName);
                    if (info.countryCode)
                      params.set("countrycodes", info.countryCode.toLowerCase());
                  }

                  const res = await fetch(
                    `https://nominatim.openstreetmap.org/search?${params.toString()}`,
                    { headers: { "User-Agent": "NonnasMaps/1.0" } },
                  );
                  if (res.ok) {
                    const data = await res.json();
                    const geojson = data?.[0]?.geojson;
                    if (geojson) {
                      let rings: number[][][] = [];
                      if (geojson.type === "Polygon") rings = [geojson.coordinates[0]];
                      else if (geojson.type === "MultiPolygon")
                        rings = (geojson.coordinates as number[][][][]).map((p) => p[0]);

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

                      for (const ring of rings) {
                        const outerCoordinates = ring.map(([lng, lat]: number[]) => ({
                          lat,
                          lng,
                          altitude: 0,
                        }));
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
                } catch (err) {
                  console.warn("[Earth3D] hover polygon fetch failed:", err);
                }
              }
            } else if (!hoverName) {
              // Clear hover polygons when not hovering over anything
              for (const p of hoverPolygonOverlays) {
                try { p.remove(); } catch { /**/ }
              }
              hoverPolygonOverlays = [];
            }
          } catch {
            /**/
          }
        }, 120);
      };
      map3d.addEventListener("gmp-mousemove" as any, handleMouseMove);
      listeners.push(() =>
        map3d.removeEventListener("gmp-mousemove" as any, handleMouseMove),
      );
      // ── Click → center + highlight boundary ──
      const handleMapClick = async (e: any) => {
        try {
          console.log("[Earth3D] Click event:", e);
          e.preventDefault?.();
          let latLng = extractLatLng(e.position || e.latLng);
          if (!latLng && e.placeId) {
            console.log("[Earth3D] No latlng but have placeId:", e.placeId);
            // Geocode using placeId
            const response = await geocoder.geocode({ placeId: e.placeId });
            const first = response?.results?.[0];
            if (first && first.geometry && first.geometry.location) {
              latLng = extractLatLng(first.geometry.location);
              console.log("[Earth3D] Got latlng from placeId:", latLng);
            }
          }
          if (!latLng || isProgrammaticFlight) {
            console.log("[Earth3D] No latlng or programmatic flight, returning");
            return;
          }
          console.log("[Earth3D] Click at latlng:", latLng);
          const level = currentLevelRef.current;
          const response = await geocoder.geocode({ location: latLng });
          const first = response?.results?.[0];
          console.log("[Earth3D] Geocode first result:", first);
          if (!first || !mounted) return;
          const info = parseAdminLevelsFromGeocodeResult(first);
          console.log("[Earth3D] Parsed info:", info);
          // Determine target name and feature type for boundary highlighting
          const targetName = info.state || info.country;
          const featureType = info.state ? "state" : "country";
          console.log("[Earth3D] Target name:", targetName, "featureType:", featureType);
          // Fly to clicked location without changing zoom level
          isProgrammaticFlight = true;
          map3d.flyCameraTo({
            endCamera: {
              center: { lat: latLng.lat, lng: latLng.lng, altitude: 0 },
              range: map3d.range, // Keep current range
              tilt: map3d.tilt,   // Keep current tilt
              heading: 0,
            },
            durationMillis: 1500,
          });
          setTimeout(() => {
            isProgrammaticFlight = false;
          }, 1700);
          if (targetName) {
            if (targetName === activeHighlightName) {
              clearPolygonOverlays();
              activeHighlightName = null;
              if (mounted) {
                setClickedLabel(null);
                setHoveredLabel(null);
              }
            } else {
              activeHighlightName = targetName;
              if (mounted) {
                setClickedLabel(targetName);
                setHoveredLabel(null);
              }
              fetchAndDrawBoundary(targetName, featureType, info.countryCode);
            }
          }
          if (mounted && info.country) setActiveCountry(info.country);
          setActivePlaceName(targetName);
        } catch (err) {
          console.error("[Earth3D] click error:", err);
        }
      };
      map3d.addEventListener("gmp-click", handleMapClick);
      listeners.push(() =>
        map3d.removeEventListener("gmp-click", handleMapClick),
      );
      // ── Double-click to zoom in ──
      const handleDoubleClick = () => {
        if (!isProgrammaticFlight) {
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
          const isCloseToTarget = flight.targetRange && Math.abs(currentRange - flight.targetRange) < 10000;
          const isStable = flight.lastRanges.length >= 3 &&
            flight.lastRanges.every(r => Math.abs(r - currentRange) < 1000);

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

        // Zoom level detection - more gradual thresholds with overlaps for smooth scroll zoom
        let newLevel: ZoomLevel = "EARTH";
        if (currentRange <= ZOOM_RANGES.NONNA * 3) newLevel = "NONNA"; // 90000
        else if (currentRange <= ZOOM_RANGES.CITY * 3) newLevel = "CITY"; // 450000
        else if (currentRange <= ZOOM_RANGES.STATE * 2) newLevel = "STATE"; // 1600000
        else if (currentRange <= ZOOM_RANGES.COUNTRY * 2) newLevel = "COUNTRY"; // 6000000
        else if (currentRange <= ZOOM_RANGES.CONTINENT * 1.5)
          newLevel = "CONTINENT";

        // Only change level if it's different and not during a programmatic flight
        if (newLevel !== currentLevelRef.current && !flightStateRef.current.active) {
          setLevel(newLevel);
          if (newLevel === "EARTH" || newLevel === "CONTINENT") {
            clearPolygonOverlays();
            activeHighlightName = null;
            setClickedLabel(null);
            setHoveredLabel(null);
          }
        } else if (newLevel !== currentLevelRef.current && flightStateRef.current.active) {
        }

        // Continue checking every 100ms
        if (mounted) {
          setTimeout(unifiedZoomCheck, 100);
        }
      };

      // Start unified zoom detection
      unifiedZoomCheck();

      // ── Animated globe ring overlay ──
      let currentSize = 0,
        currentOpacity = 0;
      const LERP_SPEED = 0.1;
      const EARTH_RADIUS = 6371000,
        FOV_FACTOR = 1.6;
      const checkZoom = () => {
        if (!mounted || !overlayRef.current) return;
        const currentRange = Number(map3d.range ?? ZOOM_RANGES.EARTH);

        const distance = EARTH_RADIUS + currentRange;
        const d = Math.max(distance, EARTH_RADIUS + 10);
        const alpha = Math.asin(EARTH_RADIUS / d);
        const rPx = Math.tan(alpha) * window.innerHeight * FOV_FACTOR;
        const targetSize = (rPx + 60) * 2.5;
        // Clamp targetSize to reasonable bounds to prevent overflow
        const clampedTargetSize = Math.min(targetSize, 2000);
        let targetOpacity = 1;
        if (currentRange < 8000000) targetOpacity = 0;
        else if (currentRange < 12000000)
          targetOpacity = (currentRange - 8000000) / 4000000;

        // If target opacity is 0, hide the overlay but continue animation for level detection
        if (targetOpacity === 0) {
          const el = overlayRef.current;
          el.style.width = "0px";
          el.style.height = "0px";
          el.style.opacity = "0";
          // Continue animation for level detection, but don't set size/opacity
          if (mounted && overlayRef.current) {
            animationFrameId = requestAnimationFrame(checkZoom);
          }
          return;
        }
        if (currentSize === 0) {
          currentSize = clampedTargetSize;
          currentOpacity = targetOpacity;
        } else {
          currentSize += (clampedTargetSize - currentSize) * LERP_SPEED;
          currentOpacity += (targetOpacity - currentOpacity) * LERP_SPEED;
        }
        // Prevent floating point underflow
        const safeOpacity = Math.max(0, Math.min(1, currentOpacity));
        const safeSize = Math.max(0, Math.min(2000, currentSize));
        const el = overlayRef.current;
        el.style.width = `${safeSize}px`;
        el.style.height = `${safeSize}px`;
        el.style.opacity = `${safeOpacity}`;
        animationFrameId = requestAnimationFrame(checkZoom);
      };
      checkZoom();
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
  }, [setLevel]);
  const displayLabel = clickedLabel || hoveredLabel || null;
  // Show country name labels only at COUNTRY level and deeper (but not at EARTH or CONTINENT levels)
  // Also check current range directly to be more reliable
  const currentRange = map3dRef.current ? Number(map3dRef.current.range ?? ZOOM_RANGES.EARTH) : ZOOM_RANGES.EARTH;
  const isAtEarthOrContinentLevel = currentLevel === "EARTH" || currentLevel === "CONTINENT" || currentRange > ZOOM_RANGES.COUNTRY * 2;
  const showNameLabel = displayLabel && !isAtEarthOrContinentLevel;
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <div ref={containerRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
      {/* Location label — only at deeper zoom levels */}
      {showNameLabel && (
        <div
          className="pointer-events-none absolute left-1/2 z-20"
          style={{
            top: "18%",
            transform: "translateX(-50%)",
            animation: "fadeInLabel 0.25s ease-out both",
          }}
        >




        </div>
      )}

      {/* Globe ring overlay */}
      {/* <div
        ref={overlayRef}
        className="pointer-events-none absolute top-1/2 left-1/2 z-10"
        style={{
          transform: "translate(-50%, -50%)",
          opacity: 0,
          willChange: "width, height, opacity",
        }}
      >
        <svg
          viewBox="0 0 400 400"
          className="w-full h-full"
          style={{
            animation: "spin-reverse 150s linear infinite",
            overflow: "visible"
          }}
        >
          <style>{`
            @keyframes spin-reverse { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }
            @keyframes fadeInLabel { from { opacity: 0; transform: translateX(-50%) translateY(-6px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
          `}</style>
          <defs>
            <path
              id="globePath"
              d="M 40, 200 a 160,160 0 1,1 320,0 a 160,160 0 1,1 -320,0"
            />
          </defs>
          <text
            className="font-bold fill-[#FFF7ED]"
            style={{
              fontSize: "26px",
              fontFamily: "ui-sans-serif, system-ui, sans-serif",
              textShadow: "0px 4px 15px rgba(0,0,0,0.8)",
            }}
          >
            <textPath
              href="#globePath"
              startOffset="50%"
              textAnchor="middle"
              textLength="920"
              lengthAdjust="spacing"
            >
              NONNAS OF THE WORLD
            </textPath>
          </text>
        </svg>
      </div> */}
      {/* Zoom controls — right side, large and friendly */}
      {mapReady && (
        <ZoomControl
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          currentLevel={currentLevel}
        />
      )}
      {/* Left-side level navigation — simplified labels */}
      {mapReady && (
        <div
          style={{
            position: "absolute",
            left: "24px",
            top: "50%",
            transform: "translateY(-50%)",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            zIndex: 50,
          }}
        >
          {(["EARTH", "CONTINENT", "COUNTRY", "STATE", "CITY"] as const).map(
            (lvl) => {
              const isActive = currentLevel === lvl;
              const meta = ZOOM_LEVEL_META[lvl];
              return (
                <button
                  key={lvl}
                  onClick={() => {
                    if (!map3dRef.current) return;


                    // Set flight state to pause scroll-based detection during animation
                    flightStateRef.current = {
                      active: true,
                      targetRange: ZOOM_RANGES[lvl],
                      targetLevel: lvl,
                      startTime: Date.now(),
                      lastRanges: [],
                    };

                    setLevel(lvl); // Explicitly set the level for active state
                    const targetTilt = 0; // No tilt for navigation buttons (NONNA is handled separately)

                    map3dRef.current.flyCameraTo({
                      endCamera: {
                        center: map3dRef.current.center,
                        range: ZOOM_RANGES[lvl],
                        heading: map3dRef.current.heading,
                        tilt: targetTilt,
                      },
                      durationMillis: 1500,
                    });
                  }}
                  title={meta.description}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "10px 16px",
                    borderRadius: "999px",
                    background: isActive
                      ? "rgba(13,148,136,0.85)"
                      : "rgba(0,0,0,0.5)",
                    border: `1.5px solid ${isActive ? "rgba(94,234,212,0.6)" : "rgba(255,255,255,0.12)"}`,
                    backdropFilter: "blur(10px)",
                    boxShadow: isActive ? `0 4px 20px ${TEAL.glow}` : "none",
                    cursor: "pointer",
                    transform: isActive ? "scale(1.06)" : "scale(1)",
                    transition: "all 0.25s cubic-bezier(0.34,1.56,0.64,1)",
                    color: isActive ? "white" : "rgba(220,220,220,0.8)",
                    fontSize: "13px",
                    fontWeight: 600,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    fontFamily: "ui-sans-serif, system-ui, sans-serif",
                    userSelect: "none",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive)
                      (e.currentTarget as HTMLElement).style.background =
                        "rgba(13,148,136,0.4)";
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive)
                      (e.currentTarget as HTMLElement).style.background =
                        "rgba(0,0,0,0.5)";
                  }}
                >
                  <span style={{ fontSize: "16px", lineHeight: 1 }}>
                    {meta.icon}
                  </span>
                  <span>{meta.label}</span>
                  {isActive && (
                    <span
                      style={{
                        width: "6px",
                        height: "6px",
                        borderRadius: "50%",
                        background: TEAL.lighter,
                        boxShadow: `0 0 6px ${TEAL.lighter}`,
                        marginLeft: "2px",
                      }}
                    />
                  )}
                </button>
              );
            },
          )}
        </div>
      )}
      {/* Bottom level indicator with progress dots */}
      {mapReady && <LevelIndicator currentLevel={currentLevel} />}
    </div>
  );
}
