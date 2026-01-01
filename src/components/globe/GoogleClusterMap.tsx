// src/components/globe/GoogleClusterMap.tsx
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

function almostEqual(a: number, b: number, eps = 1e-7) {
  return Math.abs(a - b) <= eps;
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

  // ✅ refs to avoid stale closures in listeners
  const activeRef = useRef(active);
  const onZoomRef = useRef(onZoomChange);
  const onCenterRef = useRef(onCenterChange);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    onZoomRef.current = onZoomChange;
  }, [onZoomChange]);

  useEffect(() => {
    onCenterRef.current = onCenterChange;
  }, [onCenterChange]);

  // ✅ prevent feedback loop between props->map and listeners->props
  const muteRef = useRef(false);

  // track last emitted values to avoid duplicate setState
  const lastCenterRef = useRef<{ lat: number; lng: number } | null>(null);
  const lastZoomRef = useRef<number | null>(null);

  /* 1️⃣ CREATE MAP — ONCE */
  useEffect(() => {
    if (!containerRef.current) return;

    const wait = setInterval(() => {
      if (!window.google?.maps) return;
      if (mapRef.current) return;

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
        restriction: {
          latLngBounds: WORLD_BOUNDS,
          strictBounds: true,
        },
        disableDefaultUI: true,
        gestureHandling: "greedy",
        clickableIcons: false,
        backgroundColor: "#0b1020",
      });

      mapRef.current = map;

      // initialize last known values
      lastCenterRef.current = center;
      lastZoomRef.current = zoom;

      map.addListener("zoom_changed", () => {
        if (!activeRef.current) return;
        if (muteRef.current) return;

        const z = map.getZoom();
        if (typeof z !== "number") return;

        const zClamped = clamp(z, 2, 20);
        if (lastZoomRef.current === zClamped) return;

        lastZoomRef.current = zClamped;
        onZoomRef.current?.(zClamped);
      });

      map.addListener("center_changed", () => {
        if (!activeRef.current) return;
        if (muteRef.current) return;

        const c = map.getCenter();
        if (!c) return;

        const next = { lat: c.lat(), lng: c.lng() };
        const prev = lastCenterRef.current;

        if (
          prev &&
          almostEqual(prev.lat, next.lat) &&
          almostEqual(prev.lng, next.lng)
        ) {
          return;
        }

        lastCenterRef.current = next;
        onCenterRef.current?.(next);
      });
    }, 50);

    return () => clearInterval(wait);
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

  /* 3️⃣ SYNC PROPS → MAP (ONLY WHEN ACTIVE) */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !active) return;

    const nextZoom = clamp(zoom, 2, 20);
    const nextCenter = center;

    // If already at same values, don't touch map (avoids extra events)
    const cur = map.getCenter();
    const curCenter = cur ? { lat: cur.lat(), lng: cur.lng() } : null;
    const curZoom = map.getZoom();

    const centerSame =
      curCenter &&
      almostEqual(curCenter.lat, nextCenter.lat) &&
      almostEqual(curCenter.lng, nextCenter.lng);

    const zoomSame = typeof curZoom === "number" && curZoom === nextZoom;

    if (centerSame && zoomSame) return;

    // ✅ mute while applying programmatic updates
    muteRef.current = true;

    if (!centerSame) map.setCenter(nextCenter);
    if (!zoomSame) map.setZoom(nextZoom);

    // keep last refs in sync (so we don't re-emit immediately)
    lastCenterRef.current = nextCenter;
    lastZoomRef.current = nextZoom;

    // unmute next microtask (after map processes updates)
    queueMicrotask(() => {
      muteRef.current = false;
    });
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
