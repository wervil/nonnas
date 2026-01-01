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

  // latest props/callbacks without re-binding listeners
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

  // prevent feedback loops
  const syncingRef = useRef(false);

  // throttle emits
  const rafCenterRef = useRef<number | null>(null);
  const rafZoomRef = useRef<number | null>(null);

  const lastEmittedCenterRef = useRef<{ lat: number; lng: number } | null>(null);
  const lastEmittedZoomRef = useRef<number | null>(null);

  /* 1️⃣ CREATE MAP — ONCE (wait for window.google) */
  useEffect(() => {
    if (!containerRef.current) return;

    const wait = setInterval(() => {
      if (!window.google?.maps) return;
      if (mapRef.current) return;

      // container must have size
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
        restriction: { latLngBounds: WORLD_BOUNDS, strictBounds: true },
        disableDefaultUI: true,
        gestureHandling: "greedy",
        clickableIcons: false,
        backgroundColor: "#0b1020",
      });

      mapRef.current = map;

      // prime refs
      const c0 = map.getCenter();
      if (c0) {
        lastEmittedCenterRef.current = { lat: round6(c0.lat()), lng: round6(c0.lng()) };
      }
      const z0 = map.getZoom();
      if (typeof z0 === "number") lastEmittedZoomRef.current = z0;

      // center_changed → emit (throttled, no loop)
      map.addListener("center_changed", () => {
        if (!activeRef.current) return;
        if (syncingRef.current) return;

        if (rafCenterRef.current) cancelAnimationFrame(rafCenterRef.current);
        rafCenterRef.current = requestAnimationFrame(() => {
          const c = map.getCenter();
          if (!c) return;

          const next = { lat: round6(c.lat()), lng: round6(c.lng()) };
          const prev = lastEmittedCenterRef.current;
          if (prev && prev.lat === next.lat && prev.lng === next.lng) return;

          lastEmittedCenterRef.current = next;
          onCenterRef.current?.(next);
        });
      });

      // zoom_changed → emit (throttled, no loop)
      map.addListener("zoom_changed", () => {
        if (!activeRef.current) return;
        if (syncingRef.current) return;

        if (rafZoomRef.current) cancelAnimationFrame(rafZoomRef.current);
        rafZoomRef.current = requestAnimationFrame(() => {
          const z = map.getZoom();
          if (typeof z !== "number") return;

          if (lastEmittedZoomRef.current === z) return;
          lastEmittedZoomRef.current = z;

          onZoomRef.current?.(z);
        });
      });
    }, 50);

    return () => {
      clearInterval(wait);
      if (rafCenterRef.current) cancelAnimationFrame(rafCenterRef.current);
      if (rafZoomRef.current) cancelAnimationFrame(rafZoomRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* 2️⃣ UPDATE MARKERS WHEN POINTS CHANGE */
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

  /* 3️⃣ WHEN ACTIVE: FORCE RESIZE + APPLY VIEW (fix blank on transition) */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !active) return;

    google.maps.event.trigger(map, "resize");

    syncingRef.current = true;
    map.setCenter(center);
    map.setZoom(clamp(zoom, 2, 20));
    syncingRef.current = false;

    // prime refs after sync
    const c = map.getCenter();
    if (c) lastEmittedCenterRef.current = { lat: round6(c.lat()), lng: round6(c.lng()) };
    const z = map.getZoom();
    if (typeof z === "number") lastEmittedZoomRef.current = z;
  }, [active]); // only on activation

  /* 4️⃣ SYNC PROPS → MAP (ONLY WHEN ACTIVE, ONLY IF DIFFERENT) */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !active) return;

    const nextZ = clamp(zoom, 2, 20);
    const curZ = map.getZoom();

    const curCenter = map.getCenter();
    const cur =
      curCenter ? { lat: round6(curCenter.lat()), lng: round6(curCenter.lng()) } : null;
    const nextC = { lat: round6(center.lat), lng: round6(center.lng) };

    const needsC = !cur || cur.lat !== nextC.lat || cur.lng !== nextC.lng;
    const needsZ = typeof curZ === "number" ? curZ !== nextZ : true;

    if (!needsC && !needsZ) return;

    syncingRef.current = true;
    if (needsC) map.setCenter(center);
    if (needsZ) map.setZoom(nextZ);
    syncingRef.current = false;

    lastEmittedCenterRef.current = nextC;
    lastEmittedZoomRef.current = nextZ;
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
