"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import GoogleMapClusterLayer, { type ClusterPoint } from "./GoogleClusterMap";

const GithubStyleGlobe = dynamic(
  () => import("@/components/globe/GithubStyleGlobe"),
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

  const TO_2D_AT = 230;          // keep near minDistance (200)
  const MAP_TO_3D_AT_ZOOM = 3;

  const onDistanceChange = (dist: number) => {
    if ( dist <= TO_2D_AT) setMode("2d");
  };

  const handleMapZoomChange = (z: number) => {
    setZoom(z);
    if ( z <= MAP_TO_3D_AT_ZOOM) setMode("3d");
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
        <GithubStyleGlobe
          active={mode === "3d"}
          onDistanceChange={onDistanceChange}
        />
      </div>

      {/* 2D (already supports active) */}
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
