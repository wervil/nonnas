import type { GlobeNonna } from "../types";

export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

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

export function generateAvatarSvgUri(name: string, countryCode: string): string {
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

export function spreadOverlappingMarkers(
  markers: GlobeNonna[],
  thresholdMeters = 120,
): GlobeNonna[] {
  if (markers.length < 2) return markers;

  const groups: GlobeNonna[][] = [];
  for (const marker of markers) {
    let placed = false;
    for (const group of groups) {
      const anchor = group[0];
      if (
        calculateDistance(marker.lat, marker.lng, anchor.lat, anchor.lng) <=
        thresholdMeters
      ) {
        group.push(marker);
        placed = true;
        break;
      }
    }
    if (!placed) groups.push([marker]);
  }

  const result: GlobeNonna[] = [];
  for (const group of groups) {
    if (group.length === 1) {
      result.push(group[0]);
      continue;
    }
    const anchor = group[0];
    const latRad = (anchor.lat * Math.PI) / 180;
    const metersToLat = (m: number) => (m / 6371000) * (180 / Math.PI);
    const metersToLng = (m: number) => metersToLat(m) / Math.cos(latRad || 1e-6);
    const ringMeters = Math.min(thresholdMeters * 0.85, 90);

    group.forEach((marker, index) => {
      if (index === 0) {
        result.push(marker);
        return;
      }
      const angle = (2 * Math.PI * index) / group.length;
      result.push({
        ...marker,
        lat: anchor.lat + metersToLat(ringMeters * Math.cos(angle)),
        lng: anchor.lng + metersToLng(ringMeters * Math.sin(angle)),
      });
    });
  }
  return result;
}
