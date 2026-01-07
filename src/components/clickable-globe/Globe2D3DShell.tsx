"use client";

import dynamic from "next/dynamic";
import type { ClusterPoint } from "./sharedTypes";
import GoogleContinentCountryMap from "./GoogleContinentCountryMap";
import { useMemo, useState, useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";

const NaturalStyledGlobe = dynamic(() => import("./NaturalStyledGlobe"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-gray-500 text-sm">Loading globe...</span>
      </div>
    </div>
  ),
});

type Mode = "globe" | "map";

export default function Globe2D3DShell({ points }: { points: ClusterPoint[] }) {
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<Mode>("globe");
  const [selectedContinent, setSelectedContinent] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Check URL for continent parameter (for testing)
  useEffect(() => {
    const continent = searchParams.get("continent");
    if (continent) {
      setSelectedContinent(continent);
      setMode("map");
    }
  }, [searchParams]);

  const memoPoints = useMemo(() => points, [points]);

  const handleContinentClick = useCallback((continent: string) => {
    setIsTransitioning(true);
    setSelectedContinent(continent);
    
    // Smooth transition delay
    setTimeout(() => {
      setMode("map");
      setIsTransitioning(false);
    }, 300);
  }, []);

  const handleBackToGlobe = useCallback(() => {
    setIsTransitioning(true);
    
    setTimeout(() => {
      setMode("globe");
      setSelectedContinent(null);
      setIsTransitioning(false);
    }, 300);
  }, []);

  return (
    <div className="w-full h-full relative overflow-hidden bg-white">
      {/* Transition overlay */}
      <div
        className={`absolute inset-0 z-50 bg-white pointer-events-none transition-opacity duration-300 ${
          isTransitioning ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* 3D Globe View */}
      <div
        className={`absolute inset-0 transition-all duration-500 ${
          mode === "globe"
            ? "opacity-100 scale-100"
            : "opacity-0 scale-95 pointer-events-none"
        }`}
      >
        {mode === "globe" && (
          <NaturalStyledGlobe
            active={mode === "globe" && !isTransitioning}
            onContinentClick={handleContinentClick}
          />
        )}
      </div>

      {/* 2D Map View */}
      <div
        className={`absolute inset-0 transition-all duration-500 ${
          mode === "map"
            ? "opacity-100 scale-100"
            : "opacity-0 scale-105 pointer-events-none"
        }`}
      >
        {mode === "map" && selectedContinent && (
          <GoogleContinentCountryMap
            active={mode === "map" && !isTransitioning}
            selectedContinent={selectedContinent}
            points={memoPoints}
            onBackToGlobe={handleBackToGlobe}
          />
        )}
      </div>
    </div>
  );
}
