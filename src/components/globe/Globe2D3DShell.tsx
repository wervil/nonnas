"use client";

import { useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import GoogleMapClusterLayer, { type ClusterPoint } from "./GoogleClusterMap";

const NaturalStyleGlobe = dynamic(
  () => import("@/components/globe/NaturalStyledGlobe"),
  { ssr: false }
);

export default function Globe2D3DShell() {
  const points = useMemo<ClusterPoint[]>(
    () => [
      { id: "1", lat: 33.6844, lng: 73.0479 },
      { id: "2", lat: 33.6849, lng: 73.0485 },
      { id: "3", lat: 31.5204, lng: 74.3587 },
      { id: "4", lat: 24.8607, lng: 67.0011 },
      { id: "5", lat: 40.7128, lng: -74.006 },
    ],
    []
  );

  const [center, setCenter] = useState({ lat: 33.6844, lng: 73.0479 });
  const [zoom, setZoom] = useState(6);
  const [mode, setMode] = useState<"3d" | "2d">("3d");

  // ✅ hysteresis
  const TO_2D_AT = 235;          // enter 2D when distance <= 235
  const TO_3D_AT_ZOOM = 3;       // enter 3D when zoom <= 3

  // ✅ cooldown to prevent oscillation
  const lastSwitchRef = useRef(0);
  const SWITCH_COOLDOWN_MS = 500;

  const canSwitch = () => {
    const now = Date.now();
    if (now - lastSwitchRef.current < SWITCH_COOLDOWN_MS) return false;
    lastSwitchRef.current = now;
    return true;
  };

  const onDistanceChange = (dist: number) => {
    if (mode !== "3d") return;
    if (dist <= TO_2D_AT && canSwitch()) {
      setMode("2d");
    }
  };

  const handleMapZoomChange = (z: number) => {
    setZoom(z);

    // only switch 2D -> 3D from inside 2D mode
    if (mode !== "2d") return;

    if (z <= TO_3D_AT_ZOOM && canSwitch()) {
      setMode("3d");
    }
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-white">
      {/* 3D */}
      <div
        className="absolute inset-0"
        style={{
          opacity: mode === "3d" ? 1 : 0,
          pointerEvents: mode === "3d" ? "auto" : "none",
          transition: "opacity 250ms ease",
        }}
      >
        <NaturalStyleGlobe active={mode === "3d"} onDistanceChange={onDistanceChange} />
      </div>

      {/* 2D */}
      <GoogleMapClusterLayer
        points={points}
        center={center}
        zoom={zoom}
        onCenterChange={setCenter}
        onZoomChange={handleMapZoomChange}
        active={mode === "2d"}
      />
    </div>
  );
}
