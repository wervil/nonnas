"use client";
import { useUser } from "@stackframe/stack";
import { X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import CommentSection from "../Comments/CommentSection";
import DiscussionPanel from "../Map/DiscussionPanel";

// Search result type
type SearchResult = {
  place_id: string;
  description: string;
  main_text?: string;
  secondary_text?: string;
};
const ZOOM_RANGES = {
  EARTH: 30000000,
  CONTINENT: 10000000,
  COUNTRY: 3000000,
  STATE: 700000,
  CITY: 8000,
  NONNA: 1000,
};
type ZoomLevel = "EARTH" | "CONTINENT" | "COUNTRY" | "STATE" | "CITY" | "NONNA";
const ZOOM_LEVEL_META: Record<
  ZoomLevel,
  { label: string; description: string }
> = {
  EARTH: { label: "World", description: "See all Nonnas globally" },
  CONTINENT: {
    label: "Continent",
    description: "Browse by continent",
  },
  COUNTRY: { label: "Country", description: "Explore by country" },
  STATE: { label: "Region", description: "Dive into regions" },
  CITY: { label: "City", description: "Meet a Nonna" },
  NONNA: { label: "Nonna", description: "Close-up view" },
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
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=beta&loading=async`;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Google Maps JS"));
    document.head.appendChild(s);
  });
}
type LatLngLiteral = { lat: number; lng: number };
type RemovableOverlay = { remove: () => void };
function extractLatLng(rawPos: unknown): LatLngLiteral | null {
  if (!rawPos || typeof rawPos !== "object") return null;
  const obj = rawPos as Record<string, unknown>;
  const rawLat = obj["lat"];
  const rawLng = obj["lng"];
  const lat =
    typeof rawLat === "function" ? Number((rawLat as () => unknown)()) : Number(rawLat);
  const lng =
    typeof rawLng === "function" ? Number((rawLng as () => unknown)()) : Number(rawLng);
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

function getContinentFromLatLng(lat: number, lng: number): string | null {
  // Simple continent detection based on coordinates
  // These are rough boundaries for major continents
  if (lat > 10 && lat < 85 && lng > -170 && lng < -50) return "North America";
  if (lat > -60 && lat < 15 && lng > -85 && lng < -35) return "South America";
  if (lat > 35 && lat < 70 && lng > -10 && lng < 40) return "Europe";
  if (lat > -35 && lat < 37 && lng > -20 && lng < 55) return "Africa";
  if (lat > -10 && lat < 70 && lng > 5 && lng < 180) return "Asia";
  // Oceania region - covers Australia, New Zealand, and Pacific islands
  if (lat > -50 && lat < 0 && lng > 110 && lng < 180) return "Oceania";
  if (lat > -90 && lat < -60 && lng > -180 && lng < 180) return "Antarctica";
  return null;
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
  recipeId: string;
  history?: string;
  origin?: string;
};

// ─────────────────────────────────────────────────────────────────────────────
//  ZOOM CONTROL — large, friendly buttons for older users
// ─────────────────────────────────────────────────────────────────────────────
function ZoomControl({
  onZoomIn,
  onZoomOut,
  currentLevel,
  isMobile = false,
}: {
  onZoomIn: () => void;
  onZoomOut: () => void;
  currentLevel: ZoomLevel;
  isMobile?: boolean;
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
    width: isMobile ? "56px" : "64px",
    height: isMobile ? "56px" : "64px",
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
    fontSize: isMobile ? "28px" : "32px",
    fontWeight: 300,
    lineHeight: 1,
    userSelect: "none",
    WebkitTapHighlightColor: "transparent",
  });
  return (
    <div
      style={{
        position: "absolute",
        right: isMobile ? "8px" : "24px",
        top: "50%",
        transform: "translateY(-50%)",
        display: "flex",
        flexDirection: "column",
        gap: isMobile ? "8px" : "12px",
        zIndex: 50,
      }}
    >
      {/* Zoom in = go deeper */}
      <button
        onClick={onZoomIn}
        disabled={!canZoomIn}
        title="Zoom In"
        style={btnStyle(canZoomIn)}
        onTouchStart={(e) => {
          if (canZoomIn) (e.currentTarget as HTMLElement).style.transform = "scale(0.95)";
        }}
        onTouchEnd={(e) => {
          if (canZoomIn) (e.currentTarget as HTMLElement).style.transform = "scale(1)";
        }}
        onMouseEnter={(e) => {
          if (!isMobile && canZoomIn)
            (e.currentTarget as HTMLElement).style.transform = "scale(1.1)";
        }}
        onMouseLeave={(e) => {
          if (!isMobile) (e.currentTarget as HTMLElement).style.transform = "scale(1)";
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
        onTouchStart={(e) => {
          if (canZoomOut) (e.currentTarget as HTMLElement).style.transform = "scale(0.95)";
        }}
        onTouchEnd={(e) => {
          if (canZoomOut) (e.currentTarget as HTMLElement).style.transform = "scale(1)";
        }}
        onMouseEnter={(e) => {
          if (!isMobile && canZoomOut)
            (e.currentTarget as HTMLElement).style.transform = "scale(1.1)";
        }}
        onMouseLeave={(e) => {
          if (!isMobile && canZoomOut)
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
  const user = useUser();
  const [activePlaceName, setActivePlaceName] = useState<string | null>(null);
  const [activeCountry, setActiveCountry] = useState<string | null>(null);
  const [hoveredLabel, setHoveredLabel] = useState<string | null>(null);
  const [clickedLabel, setClickedLabel] = useState<string | null>(null);
  const [nonnaData, setNonnaData] = useState<GlobeNonna[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const [is3DMode, setIs3DMode] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Hide focus outlines for better UI
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const style = document.createElement('style');
      style.textContent = `
        /* Hide all focus outlines */
        *:focus {
          outline: none !important;
          box-shadow: none !important;
        }
        
        /* Hide focus rings specifically */
        *::-moz-focus-inner {
          border: 0 !important;
        }
        
        /* Hide focus for buttons and interactive elements */
        button:focus,
        input:focus,
        select:focus,
        textarea:focus,
        [tabindex]:focus {
          outline: none !important;
          box-shadow: none !important;
        }
        
        /* Target Google Maps elements specifically */
        *:focus-visible,
        *:focus,
        gmp-map:focus,
        gmp-map *:focus,
        [data-google-map]:focus,
        [data-google-map] *:focus {
          outline: none !important;
          box-shadow: none !important;
          border: none !important;
        }
        
        /* Penetrate Shadow DOM */
        :host:focus,
        :host *:focus,
        ::slotted(:focus) {
          outline: none !important;
          box-shadow: none !important;
        }
        
        /* Remove all possible focus indicators */
        * {
          -webkit-tap-highlight-color: transparent !important;
          -webkit-focus-ring-color: transparent !important;
        }

      `;
      document.head.appendChild(style);

      // Also try to inject into any Shadow DOMs
      const injectIntoShadowDOMs = () => {
        const allElements = document.querySelectorAll('*');
        allElements.forEach(el => {
          if (el.shadowRoot) {
            const shadowStyle = document.createElement('style');
            shadowStyle.textContent = `
              *:focus { outline: none !important; box-shadow: none !important; }
              * { -webkit-tap-highlight-color: transparent !important; }
            `;
            el.shadowRoot.appendChild(shadowStyle);
          }
        });
      };

      injectIntoShadowDOMs();
      // Re-check periodically for dynamically created Shadow DOMs
      const interval = setInterval(injectIntoShadowDOMs, 1000);

      return () => clearInterval(interval);
    }
  }, []);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const geocoderRef = useRef<any>(null);
  const viewportCountryRef = useRef<string | null>(null);
  const viewportContinentRef = useRef<string | null>(null);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Force map3d to fill its container on every resize — prevents black gaps
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const parent = container.parentElement;
    if (!parent) return;
    const observer = new ResizeObserver(() => {
      const { offsetWidth: w, offsetHeight: h } = parent;
      if (!w || !h) return;
      container.style.width = `${w}px`;
      container.style.height = `${h}px`;
      const map3d = map3dRef.current;
      if (map3d) {
        map3d.style.width = `${w}px`;
        map3d.style.height = `${h}px`;
      }
    });
    observer.observe(parent);
    return () => observer.disconnect();
  }, []);

  // Discussion Panel state
  const [panel, setPanel] = useState<{
    open: boolean;
    region: string;
    regionDisplayName: string;
    scope: "country" | "state" | "city";
    country?: string;
    state?: string;
    city?: string;
    nonnas: Array<{
      id: string | number;
      name: string;
      recipeTitle?: string;
      history?: string;
      photo?: string[] | null;
      origin?: string;
    }>;
    initialTab: "discussion" | "nonnas";
  }>({
    open: false,
    region: "",
    regionDisplayName: "",
    scope: "country",
    nonnas: [],
    initialTab: "discussion", // Default to Community tab
  });

  // Comment Section state for nonna-specific discussions
  const [commentSection, setCommentSection] = useState<{
    open: boolean;
    recipeId: number;
    nonnaName: string;
    titleName: string;
  }>({
    open: false,
    recipeId: 0,
    nonnaName: "",
    titleName: "",
  });
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
  const applyClusterLevel = useCallback((
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
  }, []);
  useEffect(() => {
    if (!mapReady) return;
    let mounted = true;
    const fetchAll = async () => {
      try {
        const res = await fetch("/api/nonnas/clustering?level=ALL");
        if (!res.ok) throw new Error("Failed to fetch all clusters");
        const data = await res.json();
        console.log("data", data);
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
    if (level === "EARTH" || level === "CONTINENT") {
      viewportCountryRef.current = null;
      viewportContinentRef.current = null;
      return;
    }

    viewportContinentRef.current = getContinentFromLatLng(lat, lng);

    try {
      const response = await geocoder.geocode({ location: { lat, lng } });
      const first = response?.results?.[0];
      if (first) {
        const info = parseAdminLevelsFromGeocodeResult(first);
        if (info.country) {
          viewportCountryRef.current = info.country;
        }
      }
    } catch {
      /* geocode failed, keep existing viewport context */
    }

    if (allClustersRef.current) {
      applyClusterLevel(level, allClustersRef.current);
    }
  }, [applyClusterLevel]);

  useEffect(() => {
    if (!allClustersRef.current) return;
    applyClusterLevel(currentLevel, allClustersRef.current);
  }, [currentLevel]);
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

    // Set up interval to monitor tilt changes
    const interval = setInterval(checkTilt, 500);

    return () => clearInterval(interval);
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
  // Place nonna markers
  // Place nonna markers
  useEffect(() => {
    if (!nonnaData.length || !mapReady || !map3dRef.current) return;
    const map3d = map3dRef.current;
    const placedMarkers: any[] = [];
    let mounted = true;
    (async () => {
      try {
        const { Marker3DInteractiveElement } =
          await window.google.maps.importLibrary("maps3d");
        for (const nonna of nonnaData) {
          console.log(nonna);

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
          const marker = new Marker3DInteractiveElement({
            position: { lat: nonna.lat, lng: nonna.lng, altitude: 50 },
            altitudeMode: "RELATIVE_TO_GROUND",
          } as any);
          marker.setAttribute('data-marker', 'nonna');
          marker.setAttribute('data-nonna-name', nonna.representativeName);
          marker.append(tplCompact.cloneNode(true));
          map3d.append(marker);
          placedMarkers.push(marker);

          // Remove tooltip on mouseover
          marker.addEventListener("mouseover", (e: Event) => {
            const target = e.target as Element;
            if (target) {
              target.removeAttribute('title');
              // Also check parent element for Edge compatibility
              if (target.parentElement) {
                target.parentElement.removeAttribute('title');
              }
            }
          });

          marker.addEventListener("gmp-click", (e: Event) => {
            // Get the actual click position within the SVG
            const svgElement = marker.querySelector('svg');
            if (!svgElement) {
              console.log("[Earth3D] No SVG element found, allowing click");
              // Fallback to normal behavior if we can't find SVG
            } else {
              const clickEvent = e as any;
              const rect = svgElement.getBoundingClientRect();

              // If we have client coordinates, check if click is within the circle
              if (clickEvent.clientX && clickEvent.clientY) {
                const svgX = clickEvent.clientX - rect.left;
                const svgY = clickEvent.clientY - rect.top;

                // Get SVG viewBox to calculate actual coordinates
                const viewBox = svgElement.getAttribute('viewBox')?.split(' ').map(Number);
                if (viewBox) {
                  const [vbX, vbY, vbW, vbH] = viewBox;
                  const actualX = (svgX / rect.width) * vbW + vbX;
                  const actualY = (svgY / rect.height) * vbH + vbY;

                  // Calculate center of marker (cx from SVG)
                  const cx = vbW / 2;
                  const aR = markerMode === "bubble-large" ? 100 : 34;
                  const pad = markerMode === "bubble-large" ? 24 : 12;
                  const cy = aR + pad;

                  // Calculate distance from click to center
                  const distance = Math.sqrt(Math.pow(actualX - cx, 2) + Math.pow(actualY - cy, 2));

                  // Check if click is within the marker radius (with small buffer)
                  const markerRadius = markerMode === "avatar" ? aR : (markerMode === "bubble-large" ? 85 : 28);
                  const effectiveRadius = markerRadius + 10; // 10px buffer

                  if (distance > effectiveRadius) {
                    console.log("[Earth3D] Click outside marker radius:", distance, "vs", effectiveRadius, "- ignoring");
                    return; // Click was outside the visible marker
                  }
                }
              }
            }

            console.log("[Earth3D] MARKER CLICKED! Event:", e);
            console.log("[Earth3D] Event target:", e.target);
            console.log("[Earth3D] Event currentTarget:", e.currentTarget);
            console.log("[Earth3D] Nonna data:", nonna.representativeName);
            console.log("[Earth3D] Nonna count:", nonna.nonnaCount);

            // Check current level - only handle marker clicks at CITY level
            const isCityLevel = currentLevelRef.current === "CITY";

            if (isCityLevel && nonna.nonnaCount === 1 && nonna.recipeId) {
              // At CITY level, handle the marker click normally
              console.log("[Earth3D] Handling marker click at CITY level for individual nonna:", nonna.representativeName);

              e.stopPropagation();
              e.preventDefault();

              if (mounted) {
                // Check if comment section is already open for this same nonna
                if (commentSection.open && commentSection.recipeId === parseInt(nonna.recipeId, 10)) {
                  // Close the comment section if clicking the same nonna
                  setCommentSection({ ...commentSection, open: false });
                } else {
                  // Close discussion panel if open, then open comment section
                  setPanel(prev => ({ ...prev, open: false }));
                  setCommentSection({
                    open: true,
                    recipeId: parseInt(nonna.recipeId, 10),
                    nonnaName: nonna.representativeName,
                    titleName: nonna.representativeTitle,
                  });

                  // Zoom to NONNA level (street view) after opening comment section
                  const map3d = map3dRef.current;
                  if (map3d) {
                    const nextLevel = "NONNA";

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
                        center: { lat: nonna.lat, lng: nonna.lng, altitude: 0 },
                        range: ZOOM_RANGES[nextLevel],
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
              }
            } else {
              // At all other levels, ignore marker click and treat as map click
              console.log("[Earth3D] Ignoring marker click at level:", currentLevelRef.current, "- treating as map click");

              // Don't stop propagation or prevent default - let the map handle it
              // This will trigger the map click handler instead
              return;
            }
          });
        }
      } catch (err) {
        console.warn("[Earth3D] Marker3DInteractiveElement failed:", err);
      }
    })();
    return () => {
      mounted = false;
      for (const m of placedMarkers) {
        try {
          m.remove();
        } catch {
          /**/
        }
      }
    };
  }, [nonnaData, mapReady, commentSection, panel, setPanel, setCommentSection, setLevel]);
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
        tilt: (next === "CITY" || next === "NONNA") ? 65 : 0,
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

      // Boundary data cache to reduce API calls
      const boundaryCache = new Map<string, { data: unknown; timestamp: number }>();
      const CACHE_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes

      const getCacheKey = (name: string, featureType: string, countryCode?: string | null) => {
        return `${featureType}:${name}:${countryCode || ''}`;
      };

      const getCachedBoundary = (name: string, featureType: string, countryCode?: string | null) => {
        const key = getCacheKey(name, featureType, countryCode);
        const cached = boundaryCache.get(key);
        if (cached && Date.now() - cached.timestamp < CACHE_EXPIRY_MS) {
          return cached.data;
        }
        return null;
      };

      const setCachedBoundary = (name: string, featureType: string, data: unknown, countryCode?: string | null) => {
        const key = getCacheKey(name, featureType, countryCode);
        boundaryCache.set(key, {
          data,
          timestamp: Date.now()
        });
      };
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
        featureType: "continent" | "country" | "state" | "city",
        countryCode?: string | null,
      ) => {
        console.log("[Earth3D] Fetching boundary for", name, featureType, countryCode);

        // Check cache first
        const cachedData = getCachedBoundary(name, featureType, countryCode);
        if (cachedData && typeof cachedData === 'object' && 'rings' in cachedData) {
          console.log("[Earth3D] Using cached boundary for", name);
          try {
            const { rings } = cachedData as { rings: number[][][] };
            console.log("[Earth3D] Drawing", rings.length, "cached polygons for", name);
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
            console.log("[Earth3D] Successfully drew cached boundary for", name);
            return;
          } catch (err) {
            console.warn("[Earth3D] Failed to draw cached boundary, fetching fresh:", err);
          }
        }

        try {
          const params = new URLSearchParams({
            polygon_geojson: "1",
            format: "json",
            limit: "1",
          });
          if (featureType === "continent") {
            // Nominatim doesn't have a reliable continent featuretype, but a plain q search
            // often returns a polygon for well-known continents.
            params.set("q", name);
          } else if (featureType === "country") {
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

          console.log("[Earth3D] Nominatim fetch params:", params.toString());
          // Use proxy to avoid CORS issues
          const proxyUrl = `/api/nominatim-proxy?${params.toString()}`;
          console.log("[Earth3D] Using proxy URL:", proxyUrl);

          const res = await fetch(proxyUrl);
          console.log("[Earth3D] Proxy fetch response:", res);
          if (!res.ok) {
            console.error("[Earth3D] Proxy fetch failed:", res.status, res.statusText);
            throw new Error(`Proxy HTTP ${res.status}`);
          }
          const data = await res.json();
          console.log("[Earth3D] Nominatim response data:", data);
          const geojson = data?.[0]?.geojson;
          if (!geojson) {
            console.warn("[Earth3D] No geojson found for", name, featureType);
            return;
          }
          // Skip boundary drawing for features that only return Points instead of Polygons
          if (geojson.type === "Point") {
            console.log("[Earth3D] Skipping boundary drawing for", featureType, name, "- Nominatim only returns Point, not Polygon");
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
          rings = rings.map(simplifyRing).filter((r) => r.length >= 4);
          if (!rings.length) {
            console.warn("[Earth3D] No valid rings after simplification for", name);
            return;
          }

          // Cache the processed boundary data
          setCachedBoundary(name, featureType, { rings }, countryCode);

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
      let hoverPolygonOverlays: RemovableOverlay[] = [];
      let lastHoverNoLatLngLogAt = 0;
      let hoverRequestController: AbortController | null = null;
      let lastHoverRequestKey: string | null = null;

      const handleMouseMove = async (e: unknown) => {
        const ev = e && typeof e === "object" ? (e as Record<string, unknown>) : null;
        const latLng = extractLatLng(ev?.position ?? ev?.latLng);
        if (!latLng) {
          const now = Date.now();
          if (now - lastHoverNoLatLngLogAt > 1200) {
            lastHoverNoLatLngLogAt = now;
            console.log("[Earth3D] hover event missing latLng", {
              keys: ev ? Object.keys(ev) : null,
              position: ev?.position,
              latLng: ev?.latLng,
              screenX: ev?.clientX,
              screenY: ev?.clientY,
            });
          }
          return;
        }

        if (hoverTimer) clearTimeout(hoverTimer);
        hoverTimer = setTimeout(async () => {
          try {
            const level = currentLevelRef.current;

            const response = await geocoder.geocode({ location: latLng });
            const first = response?.results?.[0];
            if (!first || !mounted) return;
            const info = parseAdminLevelsFromGeocodeResult(first);

            let hoverName: string | null = null;
            let featureType: "continent" | "country" | "state" | "city" = "continent";

            // The logic: show the boundary of what you're ABOUT TO SELECT (the next level down)

            // EARTH/WORLD VIEW → Next level is CONTINENT, so show continent boundaries
            if (level === "EARTH") {
              hoverName = getContinentFromLatLng(latLng.lat, latLng.lng);
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
              const cityComponent = first.address_components?.find((c: any) =>
                c.types?.includes("locality") || c.types?.includes("administrative_area_level_2")
              );
              hoverName = cityComponent?.long_name || null;
              featureType = "city";
            }
            // CITY/NONNA VIEW → At deepest level, show city boundary
            else {
              const cityComponent = first.address_components?.find((c: any) =>
                c.types?.includes("locality") || c.types?.includes("administrative_area_level_2")
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

              // Draw hover highlight polygon for the NEXT LEVEL DOWN (skip CITY since it's 3D)
              if (hoverName && hoverName !== activeHighlightName && featureType !== "city") {
                // Cancel previous hover request
                if (hoverRequestController) {
                  hoverRequestController.abort();
                }

                // Create new request controller
                hoverRequestController = new AbortController();
                const requestKey = `${hoverName}:${featureType}:${info.countryCode || ''}`;
                lastHoverRequestKey = requestKey;

                // Clear previous hover polygons
                for (const p of hoverPolygonOverlays) {
                  try { p.remove(); } catch { /**/ }
                }
                hoverPolygonOverlays = [];

                // Check cache first for hover
                const cachedHoverData = getCachedBoundary(hoverName, featureType, info.countryCode);
                if (cachedHoverData && typeof cachedHoverData === 'object' && 'rings' in cachedHoverData) {
                  console.log("[Earth3D] Using cached hover boundary for", hoverName);
                  try {
                    const { rings } = cachedHoverData as { rings: number[][][] };
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
                    return;
                  } catch (err) {
                    console.warn("[Earth3D] Failed to draw cached hover boundary, fetching fresh:", err);
                  }
                }

                // Draw new hover polygon with lighter styling
                try {
                  const params = new URLSearchParams({
                    polygon_geojson: "1",
                    format: "json",
                    limit: "1",
                  });
                  if (featureType === "continent") {
                    // For continents, use a simplified approach since Nominatim doesn't support continent boundaries well
                    // We'll skip continent boundary drawing for now and just show the label
                    console.log("[Earth3D] Continent hover detected:", hoverName);
                    return;
                  } else if (featureType === "country") {
                    params.set("featuretype", "country");
                    params.set("q", hoverName);
                  } else if (featureType === "state") {
                    params.set("featuretype", "state");
                    params.set("state", hoverName);
                    if (info.countryCode)
                      params.set("countrycodes", info.countryCode.toLowerCase());
                  } else if (featureType === "city") {
                    params.set("featuretype", "city");
                    params.set("city", hoverName);
                    if (info.countryCode)
                      params.set("countrycodes", info.countryCode.toLowerCase());
                  }

                  const res = await fetch(
                    `https://nominatim.openstreetmap.org/search?${params.toString()}`,
                    { signal: hoverRequestController.signal }
                  );

                  // Check if this request is still the latest
                  if (lastHoverRequestKey !== requestKey) {
                    console.log("[Earth3D] Hover request outdated, ignoring response");
                    return;
                  }

                  if (res.ok) {
                    const data = await res.json();
                    const geojson = data?.[0]?.geojson;
                    if (geojson) {
                      let rings: number[][][] = [];
                      if (geojson.type === "Polygon") rings = [geojson.coordinates[0]];
                      else if (geojson.type === "MultiPolygon")
                        rings = (geojson.coordinates as number[][][][]).map((p) => p[0]);

                      const MAX_RING_POINTS = 300; // Reduced for hover performance
                      const simplifyRing = (ring: number[][]): number[][] => {
                        if (ring.length <= MAX_RING_POINTS) return ring;
                        const step = Math.ceil(ring.length / MAX_RING_POINTS);
                        const out = ring.filter((_, i) => i % step === 0);
                        const first = out[0], last = out[out.length - 1];
                        if (first[0] !== last[0] || first[1] !== last[1]) out.push(first);
                        return out;
                      };
                      rings = rings.map(simplifyRing).filter((r) => r.length >= 4);

                      // Cache hover data as well
                      setCachedBoundary(hoverName, featureType, { rings }, info.countryCode);

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
                } catch (err: unknown) {
                  if (err instanceof Error && err.name === 'AbortError') {
                    console.log("[Earth3D] Hover request aborted");
                  } else {
                    console.warn("[Earth3D] hover polygon fetch failed:", err);
                  }
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
        }, 200); // Increased debounce delay for better performance
      };
      map3d.addEventListener("gmp-mousemove" as any, handleMouseMove);
      map3d.addEventListener("gmp-pointermove" as any, handleMouseMove);

      const handleDomPointerMove = (ev: PointerEvent | MouseEvent) => {
        handleMouseMove({ clientX: ev.clientX, clientY: ev.clientY } as unknown);
      };
      map3d.addEventListener("pointermove", handleDomPointerMove);
      map3d.addEventListener("mousemove", handleDomPointerMove);
      listeners.push(() =>
        map3d.removeEventListener("gmp-mousemove" as any, handleMouseMove),
      );
      listeners.push(() =>
        map3d.removeEventListener("gmp-pointermove" as any, handleMouseMove),
      );
      listeners.push(() => map3d.removeEventListener("pointermove", handleDomPointerMove));
      listeners.push(() => map3d.removeEventListener("mousemove", handleDomPointerMove));
      // ── Click → center + highlight boundary + OPEN PANEL ──
      const handleMapClick = async (e: any) => {
        console.log("[Earth3D] MAP CLICK HANDLER STARTED");
        console.log("[Earth3D] Click event target:", e.target);
        console.log("[Earth3D] Click event currentTarget:", e.currentTarget);

        // Check if click originated from a marker
        const isMarkerClick = e.target && (
          e.target.closest('[data-marker="nonna"]') ||
          e.target.getAttribute('data-marker') === 'nonna' ||
          e.currentTarget?.getAttribute('data-marker') === 'nonna'
        );

        // Only ignore marker clicks at NONNA level (they're handled by the marker click handler)
        // At all other levels, treat marker clicks as map clicks
        if (isMarkerClick && currentLevelRef.current === "NONNA") {
          console.log("[Earth3D] Click originated from marker at NONNA level, ignoring map click");
          return;
        }

        // If at NONNA level and clicking on non-marker area, do nothing
        if (currentLevelRef.current === "NONNA") {
          console.log("[Earth3D] At NONNA level - ignoring click");
          return; // Don't proceed with the rest of the click handler
        }

        console.log("[Earth3D] Processing map click (not from marker)");
        try {
          console.log("[Earth3D] Click event:", e);
          e.preventDefault?.();
          let latLng = extractLatLng(e.position || e.latLng);
          if (!latLng && e.placeId) {
            console.log("[Earth3D] No latlng but have placeId:", e.placeId);
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
          let first = response?.results?.[0];
          console.log("[Earth3D] Geocode first result:", first);

          const hasCountryInfo = first && first.address_components &&
            first.address_components.some((c: any) => c.types?.includes("country"));

          console.log("[Earth3D] Country check:", { hasCountryInfo, firstTypes: first?.types });

          if (!hasCountryInfo) {
            console.log("[Earth3D] No country info, trying broader search...");
            try {
              const broaderResponse = await geocoder.geocode({
                location: latLng,
                types: ['country']
              });
              const broaderResult = broaderResponse?.results?.[0];
              if (broaderResult) {
                console.log("[Earth3D] Broader search result:", broaderResult);
                first = broaderResult;
              }
            } catch (broaderError) {
              console.warn("[Earth3D] Broader search failed, using fallback:", broaderError);
              // If broader search fails, try without any parameters
              try {
                const fallbackResponse = await geocoder.geocode({ location: latLng });
                const fallbackResult = fallbackResponse?.results?.find((r: any) =>
                  r.address_components?.some((c: any) => c.types?.includes("country"))
                );
                if (fallbackResult) {
                  console.log("[Earth3D] Fallback search result:", fallbackResult);
                  first = fallbackResult;
                }
              } catch (fallbackError) {
                console.error("[Earth3D] All geocoding attempts failed:", fallbackError);
                return; // Exit gracefully if all attempts fail
              }
            }
          }

          if (!first || !mounted) return;
          const info = parseAdminLevelsFromGeocodeResult(first);
          console.log("[Earth3D] Parsed info:", info);

          // Determine what to show based on zoom level - match the hover logic
          let targetName: string | null = null;
          let featureType: "country" | "state" | "city" | "continent" = "country";
          let nextLevel: ZoomLevel | null = null;

          if (level === "EARTH") {
            // At EARTH level, implement two-step interaction:
            // 1. First click: center on continent, stay at EARTH level
            // 2. Second click (same continent): zoom to CONTINENT level
            const continent = getContinentFromLatLng(latLng.lat, latLng.lng);
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
            // At CONTINENT level, implement two-step interaction:
            // 1. First click: center on country, stay at CONTINENT level
            // 2. Second click (same country): zoom to COUNTRY level
            const isSameCountry = info.country === activeHighlightName;

            if (isSameCountry) {
              // Second click on same country - zoom to COUNTRY level
              targetName = info.country;
              featureType = "country";
              nextLevel = "COUNTRY";
            } else {
              // First click on country - center and highlight, but stay at CONTINENT level
              targetName = info.country;
              featureType = "country";
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
            // At STATE level, implement two-step interaction:
            // 1. First click: center on city, stay at STATE level
            // 2. Second click (same city): zoom to CITY level
            const cityComponent = first.address_components?.find((c: any) =>
              c.types?.includes("locality") || c.types?.includes("administrative_area_level_2")
            );
            const cityName = cityComponent?.long_name || null;
            const isSameCity = cityName === activeHighlightName;

            if (isSameCity) {
              // Second click on same city - zoom to CITY level in COUNTRY VIEW
              targetName = cityName;
              featureType = "city";
              nextLevel = "CITY";
            } else {
              // First click on city - center and highlight, but stay at STATE level
              targetName = cityName;
              featureType = "city";
              nextLevel = "STATE"; // Stay at same level
            }
          } else if (level === "CITY") {
            // At CITY level, implement two-step interaction:
            // 1. First click: center on city area, stay at CITY level
            // 2. Second click (same city): zoom to NONNA level
            const cityComponent = first.address_components?.find((c: any) =>
              c.types?.includes("locality") || c.types?.includes("administrative_area_level_2")
            );
            const cityName = cityComponent?.long_name || null;
            const isSameCity = cityName === activeHighlightName;

            if (isSameCity) {
              // Second click on same city - zoom to NONNA level
              targetName = cityName;
              featureType = "city";
              nextLevel = "NONNA";
            } else {
              // First click on city - center and highlight, but stay at CITY level
              targetName = cityName;
              featureType = "city";
              nextLevel = "CITY"; // Stay at same level
            }
          } else {
            // At NONNA level, clicking stays at current level
            const cityComponent = first.address_components?.find((c: any) =>
              c.types?.includes("locality") || c.types?.includes("administrative_area_level_2")
            );
            targetName = cityComponent?.long_name || null;
            featureType = "city";
            nextLevel = level; // Stay at current level
          }

          console.log("[Earth3D] Target name:", targetName, "featureType:", featureType, "level:", level, "nextLevel:", nextLevel);

          // Fly to clicked location AND zoom to the next level
          isProgrammaticFlight = true;

          // If we have a next level, zoom to it
          if (nextLevel && targetName) {
            // Update the level first
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
                center: { lat: latLng.lat, lng: latLng.lng, altitude: 0 },
                range: ZOOM_RANGES[nextLevel],
                tilt: (nextLevel === "CITY" || nextLevel === "NONNA") ? 65 : 0,
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

          setTimeout(() => {
            isProgrammaticFlight = false;
          }, 1700);

          // Handle boundary highlighting and panel
          if (targetName) {
            // If clicking on the same region, close panel and clear boundary
            if (targetName === activeHighlightName) {
              console.log("[Earth3D] Clicking same region - closing panel");
              clearPolygonOverlays();
              activeHighlightName = null;
              if (mounted) {
                setClickedLabel(null);
                setHoveredLabel(null);
                setPanel(prev => ({ ...prev, open: false }));
              }
            } else {
              // Clicking on a new region - update panel data and draw boundary
              console.log("[Earth3D] Clicking new region - updating panel data for:", targetName);
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
                  regionDisplayName = `${info.country || 'Unknown Country'} • ${targetName}`;
                }

                // Fetch nonnas based on feature type
                const fetchNonnas = async () => {
                  try {
                    let url = '/api/recipes?published=true';

                    if (featureType === "continent") {
                      // Get continent from country using countryData
                      const { getCountryInfoWithFallback } = await import("@/lib/countryData");
                      const continent = getCountryInfoWithFallback(info.country || '').continent;
                      url += `&continent=${encodeURIComponent(continent)}`;
                    } else if (featureType === "country") {
                      url += `&country=${encodeURIComponent(info.country || '')}`;
                    } else if (featureType === "state") {
                      url += `&country=${encodeURIComponent(info.country || '')}`;
                      url += `&region=${encodeURIComponent(targetName)}`;
                    } else if (featureType === "city") {
                      url += `&country=${encodeURIComponent(info.country || '')}`;
                      if (info.state) {
                        url += `&region=${encodeURIComponent(info.state)}`;
                      }
                      url += `&city=${encodeURIComponent(targetName)}`;
                    }

                    const response = await fetch(url);
                    const data = await response.json();
                    return data.recipes || [];
                  } catch (error) {
                    console.error("[Earth3D] Error fetching nonnas:", error);
                    return [];
                  }
                };

                const nonnas = await fetchNonnas();

                // Update discussion panel data (do not auto-open)
                setPanel(prev => ({
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

                // Draw boundary for the clicked location (skip CITY level since it's 3D)
                if (featureType !== "city") {
                  fetchAndDrawBoundary(targetName, featureType, info.countryCode);
                }
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
        let rawLevel: ZoomLevel = "EARTH";
        if (currentRange <= ZOOM_RANGES.NONNA * 2) rawLevel = "NONNA"; // 60000 - lower threshold for easier transition
        else if (currentRange <= ZOOM_RANGES.CITY * 2.5) rawLevel = "CITY"; // 375000
        else if (currentRange <= ZOOM_RANGES.STATE * 2) rawLevel = "STATE"; // 1600000
        else if (currentRange <= ZOOM_RANGES.COUNTRY * 2) rawLevel = "COUNTRY"; // 6000000
        else if (currentRange <= ZOOM_RANGES.CONTINENT * 1.5)
          rawLevel = "CONTINENT";

        // Enforce strict drill-down: when zooming in (advancing forward), only allow one level at a time.
        // Going back (zooming out) is always allowed freely.
        const LEVEL_ORDER_SCROLL: ZoomLevel[] = ["EARTH", "CONTINENT", "COUNTRY", "STATE", "CITY", "NONNA"];
        const rawIndex = LEVEL_ORDER_SCROLL.indexOf(rawLevel);
        const curIndex = LEVEL_ORDER_SCROLL.indexOf(currentLevelRef.current);
        // Clamp forward advancement to at most one step ahead
        const clampedIndex = rawIndex > curIndex ? Math.min(rawIndex, curIndex + 1) : rawIndex;
        const newLevel = LEVEL_ORDER_SCROLL[clampedIndex];

        // Only change level if it's different and not during a programmatic flight
        if (newLevel !== currentLevelRef.current && !flightStateRef.current.active) {
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

      // ── Debounced center-change detection for viewport filtering ──
      let lastViewportLat = 0;
      let lastViewportLng = 0;
      let viewportUpdateTimer: ReturnType<typeof setTimeout> | null = null;
      const CENTER_CHANGE_THRESHOLD = 2;
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
        const dist = Math.abs(lat - lastViewportLat) + Math.abs(lng - lastViewportLng);
        if (dist > CENTER_CHANGE_THRESHOLD) {
          lastViewportLat = lat;
          lastViewportLng = lng;
          if (viewportUpdateTimer) clearTimeout(viewportUpdateTimer);
          viewportUpdateTimer = setTimeout(() => {
            if (mounted) updateViewportContext();
          }, 600);
        }
        if (mounted) setTimeout(checkCenterChange, 500);
      };
      checkCenterChange();

      // ── Remove tooltips from all map elements ──
      const removeTooltips = (e: MouseEvent) => {
        const target = e.target as Element;
        if (target) {
          target.removeAttribute('title');
          // Also check parent element for Edge compatibility
          if (target.parentElement) {
            target.parentElement.removeAttribute('title');
          }
          // Check for map labels and other elements that might have titles
          const mapElement = target.closest('[title]') as Element;
          if (mapElement) {
            mapElement.removeAttribute('title');
          }
        }
      };

      // Add global mouseover listener to the map container
      map3d.addEventListener('mouseover', removeTooltips);
      listeners.push(() => map3d.removeEventListener('mouseover', removeTooltips));

      // ── Aggressive tooltip removal with MutationObserver ──
      const removeAllTitles = () => {
        const allElements = map3d.querySelectorAll('*');
        allElements.forEach((el: Element) => {
          el.removeAttribute('title');
          if (el.parentElement) {
            el.parentElement.removeAttribute('title');
          }
        });
      };

      // Set up MutationObserver to catch dynamically added elements
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'childList') {
            mutation.addedNodes.forEach((node) => {
              if (node.nodeType === Node.ELEMENT_NODE) {
                const element = node as Element;
                element.removeAttribute('title');
                // Also check all children
                const allChildren = element.querySelectorAll('*');
                allChildren.forEach(el => el.removeAttribute('title'));
              }
            });
          }
        });
      });

      // Start observing the map for changes
      observer.observe(map3d, {
        childList: true,
        subtree: true
      });

      // Initial cleanup and periodic cleanup
      removeAllTitles();
      const cleanupInterval = setInterval(removeAllTitles, 1000);

      listeners.push(() => {
        observer.disconnect();
        clearInterval(cleanupInterval);
      });

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
  }, [setLevel, handleZoomIn,]);

  // Search functionality
  const performSearch = useCallback(async (query: string) => {
    if (!query.trim() || !geocoderRef.current) return;

    setIsSearching(true);
    try {
      // Use Google Places API for autocomplete suggestions
      const service = new (window.google as any).maps.places.AutocompleteService();
      const predictions = await new Promise<any[]>((resolve, reject) => {
        service.getPlacePredictions(
          {
            input: query,
            // Remove types to get all results, or use single type if needed
            // types: ['geocode'], // This would give all geographical places
          },
          (predictions: any[], status: string) => {
            if (status === 'OK' && predictions) {
              resolve(predictions);
            } else {
              reject(new Error(`Places API status: ${status}`));
            }
          }
        );
      });

      const results: SearchResult[] = predictions.map(pred => ({
        place_id: pred.place_id,
        description: pred.description,
        main_text: pred.structured_formatting?.main_text,
        secondary_text: pred.structured_formatting?.secondary_text,
      }));

      setSearchResults(results);
      setShowSearchResults(true);
    } catch (error) {
      console.error('[Earth3D] Search error:', error);
      // Fallback to geocoder if Places API fails
      try {
        const response = await geocoderRef.current.geocode({ address: query });
        const results: SearchResult[] = response.results.map((result: any) => ({
          place_id: result.place_id,
          description: result.formatted_address,
          main_text: result.address_components?.[0]?.long_name,
          secondary_text: result.address_components?.slice(1).map((c: any) => c.long_name).join(', '),
        }));
        setSearchResults(results);
        setShowSearchResults(true);
      } catch (fallbackError) {
        console.error('[Earth3D] Fallback search error:', fallbackError);
        setSearchResults([]);
      }
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleSearchInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
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
  }, [performSearch]);

  const handleSearchResultClick = useCallback(async (result: SearchResult) => {
    if (!map3dRef.current || !geocoderRef.current) return;

    setShowSearchResults(false);
    setSearchQuery(result.description);

    try {
      // Get place details
      const service = new (window.google as any).maps.places.PlacesService(map3dRef.current);
      const place = await new Promise<any>((resolve, reject) => {
        service.getDetails(
          { placeId: result.place_id },
          (place: any, status: string) => {
            if (status === 'OK' && place) {
              resolve(place);
            } else {
              reject(new Error(`Places details status: ${status}`));
            }
          }
        );
      });

      if (place.geometry?.location) {
        const latLng = extractLatLng(place.geometry.location);
        if (latLng) {
          console.log('[Earth3D] Flying to coordinates:', latLng);
          console.log('[Earth3D] Place types:', place.types);
          console.log('[Earth3D] Place name:', result.main_text || result.description);

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
            console.log('[Earth3D] Calculated viewport size:', approxSize, 'meters');

            if (approxSize < 10000) targetRange = ZOOM_RANGES.NONNA; // Very small area (< 10km)
            else if (approxSize < 50000) targetRange = ZOOM_RANGES.CITY; // City size (< 50km)
            else if (approxSize < 500000) targetRange = ZOOM_RANGES.STATE; // Region size (< 500km)
            else targetRange = ZOOM_RANGES.COUNTRY; // Large area (> 500km)
          } else if (place.types?.includes('airport')) {
            targetRange = ZOOM_RANGES.NONNA; // Very close zoom for airports
          } else if (place.types?.includes('establishment')) {
            targetRange = ZOOM_RANGES.NONNA; // Close zoom for specific places
          }

          console.log('[Earth3D] Using target range:', targetRange, 'meters');

          // Fly to the location
          map3dRef.current.flyCameraTo({
            endCamera: {
              center: { lat: latLng.lat, lng: latLng.lng, altitude: 0 },
              range: targetRange,
              heading: 0,
              tilt: 0,
            },
            durationMillis: 2000,
          });

          // Update active place info
          setActivePlaceName(result.main_text || result.description);
          if (place.address_components) {
            const info = parseAdminLevelsFromGeocodeResult(place);
            if (info.country) setActiveCountry(info.country);
          }
        }
      }
    } catch (error) {
      console.error('[Earth3D] Place details error:', error);
      // Fallback to geocoding
      try {
        const response = await geocoderRef.current.geocode({ placeId: result.place_id });
        const place = response.results[0];
        if (place.geometry?.location) {
          const latLng = extractLatLng(place.geometry.location);
          if (latLng) {
            // Calculate appropriate range based on place type and viewport
            let targetRange = ZOOM_RANGES.CITY; // Default fallback

            // For geocoding fallback, use place types if available
            if (place.types?.includes('airport')) {
              targetRange = ZOOM_RANGES.NONNA; // Very close zoom for airports
            } else if (place.types?.includes('establishment')) {
              targetRange = ZOOM_RANGES.NONNA; // Close zoom for specific places
            } else if (place.types?.includes('locality')) {
              targetRange = ZOOM_RANGES.CITY; // City level
            } else if (place.types?.includes('administrative_area_level_1')) {
              targetRange = ZOOM_RANGES.STATE; // State/region level
            } else if (place.types?.includes('country')) {
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
        console.error('[Earth3D] Fallback geocoding error:', fallbackError);
      }
    }
  }, []);

  // Close search results when clicking outside (supports touch)
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (searchInputRef.current && !searchInputRef.current.contains(e.target as Node)) {
        setShowSearchResults(false);
      }
    };

    // Add both mouse and touch event listeners for mobile compatibility
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);


  // Mobile-responsive styles
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

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <div ref={containerRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "hidden" }} />

      {/* Search Bar - Mobile responsive */}
      <div style={mobileStyles.searchContainer}>
        <div
          ref={searchInputRef}
          style={{
            position: "relative",
            background: "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(12px)",
            borderRadius: "16px",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.12)",
            border: "1px solid rgba(13, 148, 136, 0.2)",
          }}
        >
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchInputChange}
            placeholder="Search for a city, country, or region..."
            style={mobileStyles.searchInput}
          />
          {/* Search icon */}
          <div
            style={{
              position: "absolute",
              right: "16px",
              top: "50%",
              transform: "translateY(-50%)",
              color: isSearching ? TEAL.primary : "#9ca3af",
              fontSize: isMobile ? "16px" : "18px",
              pointerEvents: "none",
            }}
          >
            {isSearching ? "⌛" : "🔍"}
          </div>

          {/* Search results dropdown - Mobile optimized */}
          {showSearchResults && searchResults.length > 0 && (
            <div
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                right: 0,
                background: "rgba(255, 255, 255, 0.98)",
                backdropFilter: "blur(16px)",
                borderRadius: "12px",
                boxShadow: "0 12px 40px rgba(0, 0, 0, 0.15)",
                border: "1px solid rgba(13, 148, 136, 0.15)",
                marginTop: "8px",
                maxHeight: isMobile ? "40vh" : "320px",
                overflowY: "auto",
              }}
            >
              {searchResults.map((result, index) => (
                <div
                  key={result.place_id}
                  onClick={() => handleSearchResultClick(result)}
                  style={{
                    padding: isMobile ? "12px 16px" : "14px 20px",
                    borderBottom: index < searchResults.length - 1 ? "1px solid rgba(0, 0, 0, 0.06)" : "none",
                    cursor: "pointer",
                    transition: "background-color 0.15s ease",
                    WebkitTapHighlightColor: "transparent",
                  }}
                  onTouchStart={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(13, 148, 136, 0.08)";
                  }}
                  onTouchEnd={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                  }}
                  onMouseEnter={(e) => {
                    if (!isMobile) (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(13, 148, 136, 0.08)";
                  }}
                  onMouseLeave={(e) => {
                    if (!isMobile) (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                  }}
                >
                  <div
                    style={{
                      fontSize: isMobile ? "13px" : "14px",
                      fontWeight: 600,
                      color: "#1f2937",
                      marginBottom: "2px",
                      fontFamily: "ui-sans-serif, system-ui, sans-serif",
                    }}
                  >
                    {result.main_text || result.description.split(',')[0]}
                  </div>
                  {result.secondary_text && (
                    <div
                      style={{
                        fontSize: isMobile ? "11px" : "12px",
                        color: "#6b7280",
                        fontFamily: "ui-sans-serif, system-ui, sans-serif",
                      }}
                    >
                      {result.secondary_text}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Globe ring overlay */}
      <div
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
      </div>
      {/* 2D/3D Toggle - Mobile responsive */}
      {mapReady && (currentLevel === "CITY" || currentLevel === "NONNA") && (
        <div
          style={{
            position: "absolute",
            right: isMobile ? "8px" : "24px",
            top: isMobile ? "calc(50% + 70px)" : "calc(50% + 90px)",
            zIndex: 50,
          }}
        >
          <button
            onClick={() => {
              if (!map3dRef.current) return;
              const map3d = map3dRef.current;
              const newTilt = map3d.tilt > 10 ? 0 : 65;
              map3d.flyCameraTo({
                endCamera: {
                  center: map3d.center,
                  range: map3d.range,
                  heading: map3d.heading,
                  tilt: newTilt,
                },
                durationMillis: 1000,
              });
              setIs3DMode(newTilt > 10);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: isMobile ? "6px" : "8px",
              padding: isMobile ? "10px 16px" : "12px 20px",
              borderRadius: "999px",
              background: is3DMode
                ? "rgba(13,148,136,0.85)"
                : "rgba(0,0,0,0.5)",
              border: `1.5px solid ${is3DMode ? "rgba(94,234,212,0.6)" : "rgba(255,255,255,0.12)"}`,
              backdropFilter: "blur(10px)",
              boxShadow: is3DMode ? `0 4px 20px ${TEAL.glow}` : "none",
              cursor: "pointer",
              transition: "all 0.25s cubic-bezier(0.34,1.56,0.64,1)",
              color: is3DMode ? "white" : "rgba(220,220,220,0.8)",
              fontSize: isMobile ? "12px" : "14px",
              fontWeight: 600,
              fontFamily: "ui-sans-serif, system-ui, sans-serif",
              userSelect: "none",
              WebkitTapHighlightColor: "transparent",
            }}
            onTouchStart={(e) => {
              (e.currentTarget as HTMLElement).style.transform = "scale(0.95)";
            }}
            onTouchEnd={(e) => {
              (e.currentTarget as HTMLElement).style.transform = "scale(1)";
            }}
            onMouseEnter={(e) => {
              if (!isMobile) (e.currentTarget as HTMLElement).style.transform = "scale(1.05)";
            }}
            onMouseLeave={(e) => {
              if (!isMobile) (e.currentTarget as HTMLElement).style.transform = "scale(1)";
            }}
          >
            <span style={{ fontSize: isMobile ? "16px" : "18px" }}>
              {is3DMode ? "🌐" : "🗺️"}
            </span>
            <span>{is3DMode ? "3D" : "2D"}</span>
          </button>
        </div>
      )}
      {/* Left-side level navigation — Mobile responsive */}
      {mapReady && (
        <div style={mobileStyles.levelNavContainer}>
          {/* Navigation hint — hover to expand */}
          <div
            style={{ position: "relative", marginBottom: isMobile ? "4px" : "6px" }}
            onMouseEnter={(e) => {
              const panel = e.currentTarget.querySelector(".nav-hint-panel") as HTMLElement;
              if (panel) panel.style.display = "block";
            }}
            onMouseLeave={(e) => {
              const panel = e.currentTarget.querySelector(".nav-hint-panel") as HTMLElement;
              if (panel) panel.style.display = "none";
            }}
          >
            {/* Trigger label */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                background: "rgba(0,0,0,0.45)",
                backdropFilter: "blur(8px)",
                border: "1px solid rgba(94,234,212,0.15)",
                borderRadius: "8px",
                padding: "5px 10px",
                cursor: "default",
                userSelect: "none",
              }}
            >
              <span style={{ fontSize: "11px", color: TEAL.lighter, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "ui-sans-serif, system-ui, sans-serif" }}>How to?</span>
            </div>

            {/* Hover panel */}
            <div
              className="nav-hint-panel"
              style={{
                display: "none",
                position: "absolute",
                top: "100%",
                left: 0,
                marginTop: "6px",
                background: "rgba(10,10,10,0.82)",
                backdropFilter: "blur(12px)",
                border: "1px solid rgba(94,234,212,0.18)",
                borderRadius: "10px",
                padding: "16px 18px",
                width: "300px",
                zIndex: 70,
                fontFamily: "ui-sans-serif, system-ui, sans-serif",
              }}
            >
              {([
                { icon: "📍", text: "Click a level or scroll to zoom." },
                { icon: "📍", text: "Once a region is centred on screen, double clicking it again descends one level." },
              ] as { icon: string; text: string }[]).map(({ icon, text }, i) => (
                <div key={i} style={{ display: "flex", gap: "9px", alignItems: "flex-start", marginBottom: i < 2 ? "9px" : 0 }}>
                  <span style={{ fontSize: "13px", flexShrink: 0, marginTop: "1px" }}>{icon}</span>
                  <span style={{ fontSize: "14px", color: "rgba(220,220,220,0.8)", lineHeight: 1.5 }}>{text}</span>
                </div>
              ))}
            </div>
          </div>
          {(["EARTH", "CONTINENT", "COUNTRY", "STATE", "CITY"] as const).map(
            (lvl) => {
              const LEVEL_ORDER: ZoomLevel[] = ["EARTH", "CONTINENT", "COUNTRY", "STATE", "CITY", "NONNA"];
              const lvlIndex = LEVEL_ORDER.indexOf(lvl);
              const currentIndex = LEVEL_ORDER.indexOf(currentLevel);
              const isActive = currentLevel === lvl;
              // Allow going back to any previous level, or advancing exactly one level forward
              const isDisabled = lvlIndex > currentIndex + 1;
              const meta = ZOOM_LEVEL_META[lvl];
              return (
                <button
                  key={lvl}
                  disabled={isDisabled}
                  onClick={() => {
                    if (!map3dRef.current || isDisabled) return;

                    // Set flight state to pause scroll-based detection during animation
                    flightStateRef.current = {
                      active: true,
                      targetRange: ZOOM_RANGES[lvl],
                      targetLevel: lvl,
                      startTime: Date.now(),
                      lastRanges: [],
                    };

                    setLevel(lvl); // Explicitly set the level for active state
                    let targetTilt = 0; // No tilt for navigation buttons (NONNA is handled separately)
                    if (lvl === "CITY") {
                      targetTilt = 65; // 3D tilt for CITY level

                    }

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
                  title={isDisabled ? `Drill down through ${LEVEL_ORDER[currentIndex + 1] ? ZOOM_LEVEL_META[LEVEL_ORDER[currentIndex + 1]].label : ""} first` : meta.description}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: isMobile ? "6px" : "10px",
                    padding: isMobile ? "8px 12px" : "10px 16px",
                    borderRadius: "999px",
                    background: isActive
                      ? "rgba(13,148,136,0.85)"
                      : isDisabled
                        ? "rgba(0,0,0,0.2)"
                        : "rgba(0,0,0,0.5)",
                    border: `1.5px solid ${isActive ? "rgba(94,234,212,0.6)" : isDisabled ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.12)"}`,
                    backdropFilter: "blur(10px)",
                    boxShadow: isActive ? `0 4px 20px ${TEAL.glow}` : "none",
                    cursor: isDisabled ? "not-allowed" : "pointer",
                    transform: isActive ? "scale(1.06)" : "scale(1)",
                    transition: "all 0.25s cubic-bezier(0.34,1.56,0.64,1)",
                    color: isActive ? "white" : isDisabled ? "rgba(220,220,220,0.3)" : "rgba(220,220,220,0.8)",
                    fontSize: isMobile ? "11px" : "13px",
                    fontWeight: 600,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    fontFamily: "ui-sans-serif, system-ui, sans-serif",
                    userSelect: "none",
                    WebkitTapHighlightColor: "transparent",
                    opacity: isDisabled ? 0.4 : 1,
                  }}
                  onTouchStart={(e) => {
                    if (!isActive && !isDisabled) (e.currentTarget as HTMLElement).style.background = "rgba(13,148,136,0.4)";
                  }}
                  onTouchEnd={(e) => {
                    if (!isActive && !isDisabled) (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.5)";
                  }}
                  onMouseEnter={(e) => {
                    if (!isMobile && !isActive && !isDisabled)
                      (e.currentTarget as HTMLElement).style.background =
                        "rgba(13,148,136,0.4)";
                  }}
                  onMouseLeave={(e) => {
                    if (!isMobile && !isActive && !isDisabled)
                      (e.currentTarget as HTMLElement).style.background =
                        "rgba(0,0,0,0.5)";
                  }}
                >

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
          {/* NONNA tile — only enabled when at CITY level (one step before) or already at NONNA */}
          {(() => {
            const isNonnaActive = currentLevel === "NONNA";
            const isNonnaDisabled = currentLevel !== "CITY" && currentLevel !== "NONNA";
            return (
              <button
                disabled={isNonnaDisabled}
                onClick={() => {
                  if (!map3dRef.current || isNonnaDisabled) return;

                  // Set flight state to pause scroll-based detection during animation
                  flightStateRef.current = {
                    active: true,
                    targetRange: ZOOM_RANGES.NONNA,
                    targetLevel: "NONNA",
                    startTime: Date.now(),
                    lastRanges: [],
                  };

                  setLevel("NONNA"); // Explicitly set the level for active state
                  const targetTilt = 65; // 3D tilt for NONNA level

                  map3dRef.current.flyCameraTo({
                    endCamera: {
                      center: map3dRef.current.center,
                      range: ZOOM_RANGES.NONNA,
                      heading: map3dRef.current.heading,
                      tilt: targetTilt,
                    },
                    durationMillis: 1500,
                  });
                }}
                title={isNonnaDisabled ? "Drill down to City level first" : "See individual Nonnas in 3D view"}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "left",
                  padding: isMobile ? "8px 12px" : "10px 16px",
                  borderRadius: "999px",
                  background: isNonnaActive
                    ? "rgba(13,148,136,0.85)"
                    : isNonnaDisabled
                      ? "rgba(0,0,0,0.2)"
                      : "rgba(0,0,0,0.5)",
                  border: `1.5px solid ${isNonnaActive ? "rgba(94,234,212,0.6)" : isNonnaDisabled ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.12)"}`,
                  backdropFilter: "blur(10px)",
                  boxShadow: isNonnaActive ? `0 4px 20px ${TEAL.glow}` : "none",
                  cursor: isNonnaDisabled ? "not-allowed" : "pointer",
                  transform: isNonnaActive ? "scale(1.06)" : "scale(1)",
                  transition: "all 0.25s cubic-bezier(0.34,1.56,0.64,1)",
                  color: isNonnaActive ? "white" : isNonnaDisabled ? "rgba(220,220,220,0.3)" : "rgba(220,220,220,0.8)",
                  fontSize: isMobile ? "11px" : "13px",
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  fontFamily: "ui-sans-serif, system-ui, sans-serif",
                  userSelect: "none",
                  WebkitTapHighlightColor: "transparent",
                  opacity: isNonnaDisabled ? 0.4 : 1,
                }}
                onTouchStart={(e) => {
                  if (!isNonnaActive && !isNonnaDisabled) (e.currentTarget as HTMLElement).style.background = "rgba(13,148,136,0.4)";
                }}
                onTouchEnd={(e) => {
                  if (!isNonnaActive && !isNonnaDisabled) (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.5)";
                }}
                onMouseEnter={(e) => {
                  if (!isMobile && !isNonnaActive && !isNonnaDisabled)
                    (e.currentTarget as HTMLElement).style.background =
                      "rgba(13,148,136,0.4)";
                }}
                onMouseLeave={(e) => {
                  if (!isMobile && !isNonnaActive && !isNonnaDisabled)
                    (e.currentTarget as HTMLElement).style.background =
                      "rgba(0,0,0,0.5)";
                }}
              >
                <span>Nonna</span>
                {isNonnaActive && (
                  <span
                    style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      background: TEAL.lighter,
                      boxShadow: `0 0 6px ${TEAL.lighter}`,
                      marginLeft: "8px",
                    }}
                  />
                )}
              </button>
            );
          })()}
        </div>
      )}


      {/* Discussion Panel toggle button — always visible */}
      <button
        onClick={() => setPanel(prev => ({ ...prev, open: !prev.open }))}
        title={panel.open ? "Close discussion panel" : (panel.region ? `Open discussion: ${panel.regionDisplayName || panel.region}` : "Discussion panel")}
        style={{
          position: "fixed",
          right: panel.open && !isMobile ? "calc(500px + 16px)" : "24px",
          top: "50%",
          transform: "translateY(-50%)",
          width: isMobile ? "44px" : "52px",
          height: isMobile ? "44px" : "52px",
          borderRadius: "50%",
          background: panel.open ? "#0f766e" : "#2DD4BF",
          border: "2.5px solid rgba(255,255,255,0.35)",
          boxShadow: "0 0 0 3px rgba(45,212,191,0.35), 0 4px 16px rgba(0,0,0,0.35)",
          cursor: "pointer",
          display: isMobile && panel.open ? "none" : "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 100000,
          transition: "right 0.3s ease, transform 0.15s, box-shadow 0.15s, background 0.15s",
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.transform = "translateY(-50%) scale(1.08)";
          (e.currentTarget as HTMLElement).style.boxShadow = "0 0 0 4px rgba(45,212,191,0.5), 0 6px 20px rgba(0,0,0,0.4)";
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.transform = "translateY(-50%) scale(1)";
          (e.currentTarget as HTMLElement).style.boxShadow = "0 0 0 3px rgba(45,212,191,0.35), 0 4px 16px rgba(0,0,0,0.35)";
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </button>

      {/* Discussion Panel */}
      <DiscussionPanel
        isOpen={panel.open}
        onClose={() => setPanel({ ...panel, open: false })}
        region={panel.region}
        regionDisplayName={panel.regionDisplayName}
        scope={panel.scope}
        country={panel.country}
        state={panel.state}
        city={panel.city}
        nonnas={panel.nonnas}
        initialTab={panel.initialTab}
      />

      {/* Comment Section for nonna-specific discussions */}
      {commentSection.open && (
        <div className="fixed top-0 right-0 h-screen w-full md:w-140 bg-white/98 backdrop-blur-2xl shadow-2xl z-[9999] border-l border-amber-100/60 animate-in slide-in-from-right duration-400 ease-out flex flex-col pt-[63px] sm:pt-[80px]">
          {/* Enhanced Header with gradient */}
          <div className="relative overflow-hidden">


            <div className="relative px-6 py-6 border-b border-[#9BC9C3]/50">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-3">
                    <div className="relative w-12 h-12 rounded-2xl bg-linear-to-br from-[#9BC9C3] via-[#7FB5B0] to-[#6BA8A3] flex items-center justify-center shadow-lg shadow-[#9BC9C3]/30 border border-[#9BC9C3]/20">
                      <span className="text-2xl filter drop-shadow-sm">💬</span>
                      {/* Glow effect */}
                      <div className="absolute inset-0 rounded-2xl bg-linear-to-br from-[#9BC9C3]/30 to-[#7FB5B0]/30 blur-sm animate-pulse" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 leading-tight">
                        Discussion with {commentSection.nonnaName}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Share memories and stories about this Nonna&apos;s recipes
                      </p>
                      <button
                        onClick={() => window.location.href = `/profile/${commentSection.recipeId}`}
                      >
                        <p className="font-['Inter'] font-semibold text-lg mt-2 text-[#4A7C7A]">
                          View Nonna →
                        </p>
                      </button>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setCommentSection({ ...commentSection, open: false })}
                  className="shrink-0 w-5 h-5 rounded-xl "
                  aria-label="Close discussion"
                >
                  <X className="w-5 items-center h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Content area with subtle background */}
          <div className="flex-1 overflow-y-auto relative bg-linear-to-b from-white via-white to-[#9BC9C3]/20">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMTgiIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIi8+PC9zdmc+')] opacity-[0.03]" />
            <div className="relative px-2 p-3">
              <CommentSection
                recipeId={commentSection.recipeId}
                userId={user?.id}
                recipeName={commentSection.titleName}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}