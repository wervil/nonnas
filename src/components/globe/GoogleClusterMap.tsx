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

      // ✅ emit zoom immediately (fixes getting stuck in 2D)
      map.addListener("zoom_changed", () => {
        if (!active) return;
        const z = map.getZoom();
        if (typeof z === "number") onZoomChange?.(z);
      });

      // ✅ emit center immediately
      map.addListener("center_changed", () => {
        if (!active) return;
        const c = map.getCenter();
        if (c) onCenterChange?.({ lat: c.lat(), lng: c.lng() });
      });
    }, 50);

    return () => clearInterval(wait);
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

    clustererRef.current = new MarkerClusterer({
      map,
      markers,
    });
  }, [points]);

  /* 3️⃣ SYNC PROPS → MAP (ONLY WHEN ACTIVE) */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !active) return;

    map.setCenter(center);
    map.setZoom(clamp(zoom, 2, 20));
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
