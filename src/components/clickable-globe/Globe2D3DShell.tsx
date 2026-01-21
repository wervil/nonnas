"use client";

import dynamic from "next/dynamic";
import GoogleContinentCountryMap from "./GoogleContinentCountryMap";
import { useState, useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";

const NaturalStyledGlobe = dynamic(() => import("./NaturalStyledGlobe"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-[#0a0a0a]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-gray-400 text-sm">Loading globe...</span>
      </div>
    </div>
  ),
});

type Mode = "globe" | "map";

export default function Globe2D3DShell() {
  const searchParams = useSearchParams();

  const [mode, setMode] = useState<Mode>("globe");
  const [selectedContinent, setSelectedContinent] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Support testing via URL: /explore?continent=North%20America
  useEffect(() => {
    const continent = searchParams.get("continent");
    if (continent) {
      setSelectedContinent(continent);
      setMode("map");
    }
  }, [searchParams]);

  const handleContinentClick = useCallback((continent: string) => {
    setIsTransitioning(true);
    setSelectedContinent(continent);

    // Smooth fade to map
    window.setTimeout(() => {
      setMode("map");
      setIsTransitioning(false);
    }, 300);
  }, []);

  const handleBackToGlobe = useCallback(() => {
    setIsTransitioning(true);

    window.setTimeout(() => {
      setMode("globe");
      setSelectedContinent(null);
      setIsTransitioning(false);
    }, 200);
  }, []);

  return (
    <div className="w-full h-full relative overflow-hidden bg-[#0a0a0a]">
      {/* Transition overlay */}
      <div
        className={`absolute inset-0 z-50 bg-[#0a0a0a] pointer-events-none transition-opacity duration-200 ${
          isTransitioning ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* ✅ 3D Globe View (MOUNT ONLY WHEN IN GLOBE MODE) */}
      <div
        className={`absolute inset-0 transition-opacity duration-300 ${
          mode === "globe" ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
        }`}
      >
        {mode === "globe" && (
          <NaturalStyledGlobe
            active={!isTransitioning} // globe stops interaction during transitions
            onContinentClick={handleContinentClick}
          />
        )}
      </div>

      {/* 2D Map View */}
      <div
        className={`absolute inset-0 transition-opacity duration-300 ${
          mode === "map" ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
        }`}
      >
        {mode === "map" && selectedContinent && (
          <GoogleContinentCountryMap
            active={!isTransitioning}
            selectedContinent={selectedContinent}
            onBackToGlobe={handleBackToGlobe}
          />
        )}
      </div>
    </div>
  );
}
