"use client";

import dynamic from "next/dynamic";
import GoogleContinentCountryMap from "./GoogleContinentCountryMap";
import { useState, useCallback, useEffect, useRef } from "react";
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

  // Track if globe has been loaded at least once (keep it mounted after first load)
  const globeLoadedRef = useRef(false);
  const [globeLoaded, setGlobeLoaded] = useState(false);

  // Check URL for continent parameter (for testing)
  useEffect(() => {
    const continent = searchParams.get("continent");
    if (continent) {
      setSelectedContinent(continent);
      setMode("map");
    }
  }, [searchParams]);

  // Mark globe as loaded once it's been rendered
  useEffect(() => {
    if (mode === "globe" && !globeLoadedRef.current) {
      globeLoadedRef.current = true;
      setGlobeLoaded(true);
    }
  }, [mode]);

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
    }, 200); // Faster transition back since globe is already loaded
  }, []);

  // Determine if globe should be rendered (keep mounted once loaded for instant return)
  const shouldRenderGlobe = mode === "globe" || globeLoaded;

  return (
    <div className="w-full h-full relative overflow-hidden bg-[#0a0a0a]">
      {/* Transition overlay */}
      <div
        className={`absolute inset-0 z-50 bg-[#0a0a0a] pointer-events-none transition-opacity duration-200 ${isTransitioning ? "opacity-100" : "opacity-0"
          }`}
      />

      {/* 3D Globe View - stays mounted after first load for instant return */}
      <div
        className={`absolute inset-0 transition-opacity duration-300 ${mode === "globe"
          ? "opacity-100 z-10"
          : "opacity-0 z-0 pointer-events-none"
          }`}
        style={{ visibility: mode === "globe" ? "visible" : "hidden" }}
      >
        {shouldRenderGlobe && (
          <NaturalStyledGlobe
            active={mode === "globe" && !isTransitioning}
            onContinentClick={handleContinentClick}
          />
        )}
      </div>

      {/* 2D Map View */}
      <div
        className={`absolute inset-0 transition-opacity duration-300 ${mode === "map"
          ? "opacity-100 z-10"
          : "opacity-0 z-0 pointer-events-none"
          }`}
      >
        {mode === "map" && selectedContinent && (
          <GoogleContinentCountryMap
            active={mode === "map" && !isTransitioning}
            selectedContinent={selectedContinent}
            onBackToGlobe={handleBackToGlobe}
          />
        )}
      </div>
    </div>
  );
}
