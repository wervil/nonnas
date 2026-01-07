"use client";

import { useEffect, useRef } from "react";
import { MarkerClusterer } from "@googlemaps/markerclusterer";

export type ClusterPoint = {
  id: string;
  lat: number;
  lng: number;
  weight?: number;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
function round6(n: number) {
  return Math.round(n * 1e6) / 1e6;
}

// Default "show USA" view when map becomes active (during transition)
const USA_VIEW = {
  center: { lat: 39.8283, lng: -98.5795 }, // continental US centroid-ish
  zoom: 4,
};

export default function GoogleMapClusterLayer({
  points,
  center,
  zoom,
  onCenterChange,
  onZoomChange,
  active,
  className,
}: {
  points: ClusterPoint[];
  center: { lat: number; lng: number };
  zoom: number;
  onCenterChange?: (c: { lat: number; lng: number }) => void;
  onZoomChange?: (z: number) => void;
  active: boolean;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const clustererRef = useRef<MarkerClusterer | null>(null);

  /* ───────── refs to avoid re-binding listeners ───────── */
  const activeRef = useRef(active);
  const onCenterRef = useRef(onCenterChange);
  const onZoomRef = useRef(onZoomChange);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);
  useEffect(() => {
    onCenterRef.current = onCenterChange;
  }, [onCenterChange]);
  useEffect(() => {
    onZoomRef.current = onZoomChange;
  }, [onZoomChange]);

  /* ───────── loop protection ───────── */
  const syncingRef = useRef(false);
  const lastCenterRef = useRef<{ lat: number; lng: number } | null>(null);
  const lastZoomRef = useRef<number | null>(null);

  // ✅ block external center/zoom sync briefly after activation (prevents snap-back)
  const lockUntilRef = useRef<number>(0);

  /* ───────── 1️⃣ CREATE MAP ONCE ───────── */
  useEffect(() => {
    if (!containerRef.current) return;

    const wait = setInterval(() => {
      if (!window.google?.maps) return;
      if (mapRef.current) return;

      const rect = containerRef.current!.getBoundingClientRect();
      if (rect.width < 10 || rect.height < 10) return;

      clearInterval(wait);

      const WORLD_BOUNDS = {
        north: 85,
        south: -85,
        west: -180,
        east: 180,
      };

      const map = new google.maps.Map(containerRef.current!, {
        center,
        zoom,
        minZoom: 2,
        maxZoom: 20,

        // ✅ IMPORTANT: allow free panning
        restriction: {
          latLngBounds: WORLD_BOUNDS,
          strictBounds: false,
        },

        disableDefaultUI: true,
        gestureHandling: "greedy",
        draggable: true,
        scrollwheel: true,
        keyboardShortcuts: false,
        clickableIcons: false,
        backgroundColor: "#0b1020",
      });

      mapRef.current = map;

      // prime refs
      const c0 = map.getCenter();
      if (c0)
        lastCenterRef.current = {
          lat: round6(c0.lat()),
          lng: round6(c0.lng()),
        };
      const z0 = map.getZoom();
      if (typeof z0 === "number") lastZoomRef.current = z0;

      /* ── user drag → React state ── */
      map.addListener("center_changed", () => {
        if (!activeRef.current) return;
        if (syncingRef.current) return;

        const c = map.getCenter();
        if (!c) return;

        const next = { lat: round6(c.lat()), lng: round6(c.lng()) };
        const prev = lastCenterRef.current;

        if (prev && prev.lat === next.lat && prev.lng === next.lng) return;

        lastCenterRef.current = next;
        onCenterRef.current?.(next);
      });

      /* ── user zoom → React state ── */
      map.addListener("zoom_changed", () => {
        if (!activeRef.current) return;
        if (syncingRef.current) return;

        const z = map.getZoom();
        if (typeof z !== "number") return;

        if (lastZoomRef.current === z) return;
        lastZoomRef.current = z;

        onZoomRef.current?.(z);
      });
    }, 50);

    return () => clearInterval(wait);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally init once with initial props
  }, []);

  /* ───────── 2️⃣ UPDATE MARKERS ───────── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    clustererRef.current?.clearMarkers();

    const markers = points.map((p) => {
      return new google.maps.Marker({
        position: { lat: p.lat, lng: p.lng },
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: clamp(2 + (p.weight ?? 1) * 0.6, 2, 7),
          fillColor: "#ffffff",
          fillOpacity: 0.85,
          strokeOpacity: 0,
        },
      });
    });

    clustererRef.current = new MarkerClusterer({ map, markers });
  }, [points]);

  /* ───────── 3️⃣ ACTIVATE MAP (3D → 2D + force USA view) ───────── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !active) return;

    // ✅ REQUIRED when map was hidden
    google.maps.event.trigger(map, "resize");

    // ✅ lock external sync briefly to prevent snap-back from parent state
    lockUntilRef.current = Date.now() + 700; // tweak 400–1200ms if needed

    syncingRef.current = true;
    map.setCenter(USA_VIEW.center);
    map.setZoom(clamp(USA_VIEW.zoom, 2, 20));
    syncingRef.current = false;

    const c = map.getCenter();
    if (c) lastCenterRef.current = { lat: round6(c.lat()), lng: round6(c.lng()) };
    const z = map.getZoom();
    if (typeof z === "number") lastZoomRef.current = z;
  }, [active]);

  /* ───────── 4️⃣ EXTERNAL STATE → MAP (NO SNAP-BACK) ───────── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !active) return;

    // ✅ ignore external props briefly after activation
    if (Date.now() < lockUntilRef.current) return;

    const curCenter = map.getCenter();
    const cur = curCenter
      ? { lat: round6(curCenter.lat()), lng: round6(curCenter.lng()) }
      : null;

    const next = { lat: round6(center.lat), lng: round6(center.lng) };

    const curZoom = map.getZoom();
    const nextZoom = clamp(zoom, 2, 20);

    const needsCenter = !cur || cur.lat !== next.lat || cur.lng !== next.lng;
    const needsZoom = typeof curZoom === "number" ? curZoom !== nextZoom : true;

    if (!needsCenter && !needsZoom) return;

    syncingRef.current = true;
    if (needsCenter) map.setCenter(center);
    if (needsZoom) map.setZoom(nextZoom);
    syncingRef.current = false;

    lastCenterRef.current = next;
    lastZoomRef.current = nextZoom;
  }, [center, zoom, active]);

  return (
    <div
      className={className ?? "absolute inset-0"}
      style={{
        opacity: active ? 1 : 0,
        pointerEvents: active ? "auto" : "none",
        transition: "opacity 250ms ease",
      }}
    >
      <div ref={containerRef} className="absolute inset-0" />
    </div>
  );
}
