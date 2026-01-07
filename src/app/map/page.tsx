// src/app/map/page.tsx
import { Suspense } from "react";
import Globe2D3DShell from "@/components/clickable-globe/Globe2D3DShell";

// Preload critical resources for faster globe rendering
export const metadata = {
  title: "Nonnas of the World - Interactive Globe",
};

function MapContent() {
  return <Globe2D3DShell />;
}

export default function MapPage() {
  return (
    <>
      {/* Preload critical assets for faster globe rendering */}
      <link rel="preload" href="/textures/earth_day_clouds.jpg" as="image" />
      <link rel="preload" href="/geo/ne_admin0_countries.geojson" as="fetch" crossOrigin="anonymous" />
      
      <div className="w-screen h-screen bg-[#0a0a0a]">
        <Suspense fallback={
          <div className="w-full h-full flex items-center justify-center bg-[#0a0a0a]">
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-gray-400 text-sm">Loading globe...</span>
            </div>
          </div>
        }>
          <MapContent />
        </Suspense>
      </div>
    </>
  );
}
