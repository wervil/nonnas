"use client";

import dynamic from "next/dynamic";
import GoogleContinentCountryMap from "./GoogleContinentCountryMap";
import { useState, useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";

import { getRegionForCountry } from "./regionData"; // Import helper

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

type ExploreState = {
  mode: Mode;
  selectedContinent?: string | null;
};

export default function Globe2D3DShell({
  setExploreState,
}: {
  setExploreState: React.Dispatch<React.SetStateAction<ExploreState>>;
}) {
  const searchParams = useSearchParams();

  const [mode, setMode] = useState<Mode>("globe");
  const [selectedContinent, setSelectedContinent] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Support testing via URL: /explore?continent=North%20America
  // OR redirect from country search: /explore?country=AL&countryName=Albania
  useEffect(() => {
    const continent = searchParams?.get("continent");
    const countryName = searchParams?.get("countryName");

    let targetContinent = continent;

    // If no explicit continent, try to find it from the country name
    if (!targetContinent && countryName) {
      targetContinent = getRegionForCountry(countryName);
      if (targetContinent) {
        console.log(`🌍 Auto-detected continent for ${countryName}: ${targetContinent}`);
      } else {
        console.warn(`⚠️ Could not auto-detect continent for ${countryName}`);
      }
    }

    if (targetContinent) {
      setSelectedContinent(targetContinent);
      setMode("map");

      // ✅ Sync only (no zoom logic touched)
      setExploreState({ mode: "map", selectedContinent: targetContinent });
    }
  }, [searchParams, setExploreState]);

  const handleContinentClick = useCallback(
    (continent: string) => {
      setIsTransitioning(true);
      setSelectedContinent(continent);

      // Smooth fade to map
      window.setTimeout(() => {
        setMode("map");
        setIsTransitioning(false);

        // ✅ Sync at the exact same moment you switch to map
        setExploreState({ mode: "map", selectedContinent: continent });
      }, 300);
    },
    [setExploreState]
  );

  const handleBackToGlobe = useCallback(
    () => {
      setIsTransitioning(true);

      window.setTimeout(() => {
        setMode("globe");
        setSelectedContinent(null);
        setIsTransitioning(false);

        // ✅ Sync at the exact same moment you switch to globe
        setExploreState({ mode: "globe", selectedContinent: null });
      }, 200);
    },
    [setExploreState]
  );

  return (
    <div className="w-full h-full relative overflow-hidden bg-[#0a0a0a]">
      {/* Transition overlay */}
      <div
        className={`absolute inset-0 z-50 bg-[#0a0a0a] pointer-events-none transition-opacity duration-200 ${isTransitioning ? "opacity-100" : "opacity-0"
          }`}
      />

      {/* ✅ 3D Globe View (MOUNT ONLY WHEN IN GLOBE MODE) */}
      <div
        className={`absolute inset-0 transition-opacity duration-300 ${mode === "globe" ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
          }`}
      >
        {mode === "globe" && (
          <NaturalStyledGlobe
            active={!isTransitioning}
            onContinentClick={handleContinentClick}
          />
        )}
      </div>

      {/* 2D Map View */}
      <div
        className={`absolute inset-0 transition-opacity duration-300 ${mode === "map" ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
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
