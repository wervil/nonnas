// src/components/globe/Globe2D3DShell.tsx
"use client";

import { useMemo, useRef, useState } from "react";
// import dynamic from "next/dynamic";
import GoogleMapClusterLayer, { type ClusterPoint } from "./GoogleClusterMap";
import NaturalStyleGlobe from "./NaturalStyledGlobe";

// const GithubStyleGlobe = dynamic(
//   () => import("@/components/globe/GithubStyleGlobe"),
//   { ssr: false }
// );

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

  // ✅ hysteresis thresholds (spaced apart)
  const TO_2D_AT_DISTANCE = 230; // 3D -> 2D when <= this distance
  const TO_3D_AT_ZOOM = 2; // 2D -> 3D when zoomed out enough

  // ✅ cooldown lock to prevent thrash
  const lockUntilRef = useRef(0);
  const LOCK_MS = 450;

  const canSwitch = () => Date.now() >= lockUntilRef.current;
  const lock = () => {
    lockUntilRef.current = Date.now() + LOCK_MS;
  };

  const switchTo2D = () => {
    if (mode === "2d") return;
    if (!canSwitch()) return;
    lock();
    setMode("2d");
  };

  const switchTo3D = () => {
    if (mode === "3d") return;
    if (!canSwitch()) return;
    lock();
    setMode("3d");
  };

  const onDistanceChange = (dist: number) => {
    // only evaluate in 3D mode
    if (mode !== "3d") return;
    if (dist <= TO_2D_AT_DISTANCE) switchTo2D();
  };

  const handleMapZoomChange = (z: number) => {
    const zz = Math.max(2, Math.min(20, z));
    setZoom(zz);

    // only evaluate in 2D mode
    if (mode !== "2d") return;
    if (zz <= TO_3D_AT_ZOOM) switchTo3D();
  };

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      {/* 3D (stays mounted) */}
      <div
        className="absolute inset-0"
        style={{
          opacity: mode === "3d" ? 1 : 0,
          pointerEvents: mode === "3d" ? "auto" : "none",
          transition: "opacity 250ms ease",
        }}
      >
        {/* <GithubStyleGlobe
          active={mode === "3d"}
          onDistanceChange={onDistanceChange}
        /> */}
        <NaturalStyleGlobe 
          active={mode === "3d"}
          onDistanceChange={onDistanceChange}
        />
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
