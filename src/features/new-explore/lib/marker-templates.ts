import { MARKER_SCALE_BY_LEVEL, TEAL } from "../constants";
import type { ZoomLevel } from "../types";
import { countryFlag } from "./markers";

const markerPhotoDataUrlCache = new Map<string, string>();

/** Map3D avatar pins only paint photos when inlined as a compact data URL in SVG <image>. */
async function rasterizePhotoForMarker(
  fetchUrl: string,
  maxPx = 128,
  timeoutMs = 5000,
): Promise<string> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  const response = await fetch(fetchUrl, { signal: controller.signal }).finally(
    () => window.clearTimeout(timeout),
  );
  if (!response.ok) throw new Error(`Image fetch failed: ${response.status}`);
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  try {
    return await new Promise<string>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const w = img.naturalWidth || maxPx;
        const h = img.naturalHeight || maxPx;
        const scale = Math.min(1, maxPx / Math.max(w, h, 1));
        const cw = Math.max(1, Math.round(w * scale));
        const ch = Math.max(1, Math.round(h * scale));
        const canvas = document.createElement("canvas");
        canvas.width = cw;
        canvas.height = ch;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas unavailable"));
          return;
        }
        ctx.drawImage(img, 0, 0, cw, ch);
        resolve(canvas.toDataURL("image/jpeg", 0.88));
      };
      img.onerror = () => reject(new Error("Image decode failed"));
      img.src = objectUrl;
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/** Photo URL for SVG <image> — only used in avatar mode (city drill / NONNA). */
async function resolveMarkerPhotoHref(
  photoUrl: string | null | undefined,
  avatarUri: string,
): Promise<string> {
  const raw = photoUrl?.trim();
  if (!raw) return avatarUri;
  if (raw.startsWith("data:")) return raw;

  const cached = markerPhotoDataUrlCache.get(raw);
  if (cached) return cached;

  const fetchUrl = raw.startsWith("/")
    ? `${window.location.origin}${raw}`
    : `/api/proxy-image?url=${encodeURIComponent(raw)}`;

  try {
    const dataUrl = await rasterizePhotoForMarker(fetchUrl);
    markerPhotoDataUrlCache.set(raw, dataUrl);
    return dataUrl;
  } catch {
    return avatarUri;
  }
}

function escapeSvgAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

export async function buildMarkerTemplate(opts: {
  name: string;
  photoUrl: string | null;
  avatarUri: string;
  countryCode: string;
  countryName: string;
  nonnaCount: number;
  expanded?: boolean;
  mode: "avatar" | "bubble";
  zoomLevel: ZoomLevel;
}): Promise<HTMLTemplateElement> {
  const {
    name,
    avatarUri,
    countryCode,
    countryName,
    nonnaCount,
    expanded,
    mode,
    zoomLevel,
  } = opts;
  const scale = MARKER_SCALE_BY_LEVEL[zoomLevel];
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
    zoomLevel +
    mode;
  const isCityView = zoomLevel === "CITY" || zoomLevel === "NONNA";
  const aR = Math.max(
    isCityView ? 38 : 8,
    Math.round(26 * scale * (isCityView ? 1.4 : 1)),
  );
  const pad = Math.max(isCityView ? 12 : 3, Math.round(8 * scale));
  const svgSize = (aR + pad) * 2;
  const svgW = svgSize;
  const svgH = svgSize;
  const cx = svgW / 2;
  const cy = svgH / 2;

  // Compact square SVG so the map anchor (center) sits on the saved lat/lng.
  // The old bubble layout used a tall viewBox with empty label space below the
  // circle, which shifted pins away from the real city when zoomed out.
  if (mode === "bubble") {
    const isWorldView = zoomLevel === "EARTH" || zoomLevel === "CONTINENT";
    const isCityBubble = zoomLevel === "CITY" || zoomLevel === "NONNA";
    const baseR = Math.max(
      isWorldView ? 44 : isCityBubble ? 36 : 10,
      Math.round(58 * scale),
    );
    const maxR = isWorldView
      ? Math.max(baseR, Math.round(140 * scale))
      : isCityBubble
        ? Math.max(baseR, Math.round(95 * scale))
        : Math.max(baseR, Math.round(68 * scale));
    const bubbleRadius = Math.min(
      baseR + nonnaCount.toString().length * Math.max(1, Math.round(2 * scale)),
      maxR,
    );
    const fontSize = Math.max(
      isWorldView ? 18 : isCityBubble ? 16 : 8,
      Math.round(42 * scale),
    );
    const yOffset = Math.max(3, Math.round(12 * scale));
    const strokeW = Math.max(isWorldView ? 3 : 1.5, Math.round(5 * scale));
    const pad = strokeW + 4;
    const size = (bubbleRadius + pad) * 2;
    const bcx = size / 2;
    const bcy = size / 2;
    const bubbleSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" overflow="visible">
      <defs>
        <filter id="ash${uid}" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="4" stdDeviation="5" flood-color="rgba(0,0,0,0.28)"/>
        </filter>
      </defs>
      <circle cx="${bcx}" cy="${bcy}" r="${bubbleRadius}" fill="${TEAL.primary}" stroke="white" stroke-width="${strokeW}" filter="url(#ash${uid})"/>
      <text x="${bcx}" y="${bcy + yOffset}" text-anchor="middle" font-family="Arial,sans-serif" font-size="${fontSize}" font-weight="900" fill="white">${nonnaCount}</text>
    </svg>`;
    const tpl = document.createElement("template");
    tpl.innerHTML = bubbleSvg.trim();
    return tpl;
  }

  const imgHref = await resolveMarkerPhotoHref(opts.photoUrl, avatarUri);
  const imgHrefSafe = escapeSvgAttr(imgHref);
  const imgX = cx - aR;
  const imgY = cy - aR;
  const imgSize = aR * 2;

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
         width="${svgW}"
         height="${svgH}"
         viewBox="0 0 ${svgW} ${svgH}"
         overflow="visible">
  
      <defs>
        <style>
          @keyframes floatBob {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-5px); }
          }
  
          .bob-anim {
            animation: floatBob 3.2s cubic-bezier(0.45, 0, 0.55, 1) infinite;
            transform-origin: center center;
          }
        </style>
  
        <filter id="ash${uid}" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="5" stdDeviation="6" flood-color="rgba(0,0,0,0.30)"/>
        </filter>
  
        <radialGradient id="bloom${uid}" cx="50%" cy="58%" r="50%">
          <stop offset="0%" stop-color="rgba(94,234,212,0.5)"/>
          <stop offset="100%" stop-color="rgba(94,234,212,0)"/>
        </radialGradient>
        
        <clipPath id="clip${uid}">
          <circle cx="${cx}" cy="${cy}" r="${aR}"/>
        </clipPath>
      </defs>
  
      <g>
  
        <!-- animated rings -->
        <circle cx="${cx}" cy="${cy}" r="${aR}" fill="none" stroke="rgba(94,234,212,0.82)" stroke-width="2.5">
          <animate attributeName="r" values="${aR};${aR + 24};${aR}" dur="2.4s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0.85;0;0.85" dur="2.4s" repeatCount="indefinite"/>
        </circle>
  
        <circle cx="${cx}" cy="${cy}" r="${aR}" fill="none" stroke="rgba(94,234,212,0.42)" stroke-width="2">
          <animate attributeName="r" values="${aR};${aR + 42};${aR}" dur="2.4s" begin="0.8s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0.6;0;0.6" dur="2.4s" begin="0.8s" repeatCount="indefinite"/>
        </circle>
  
        <!-- white background circle -->
        <circle cx="${cx}" cy="${cy}" r="${aR}" fill="white" filter="url(#ash${uid})"/>
  
        <!-- native SVG image (foreignObject does not paint in Map3D markers) -->
        <image
          x="${imgX}"
          y="${imgY}"
          width="${imgSize}"
          height="${imgSize}"
          href="${imgHrefSafe}"
          xlink:href="${imgHrefSafe}"
          clip-path="url(#clip${uid})"
          preserveAspectRatio="xMidYMid slice"
        />
          
        <!-- border -->
        <circle cx="${cx}" cy="${cy}" r="${aR}" fill="none" stroke="${TEAL.light}" stroke-width="3.5"/>
      </g>
  
    </svg>
    `;

  const tpl = document.createElement("template");
  tpl.innerHTML = svg.trim();
  return tpl;
}
