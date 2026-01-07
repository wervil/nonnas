// src/app/map/page.tsx
import { Suspense } from "react";
import Globe2D3DShell from "@/components/clickable-globe/Globe2D3DShell";

function MapContent() {
  return <Globe2D3DShell />;
}

export default function MapPage() {
  return (
    <div className="w-screen h-screen bg-white">
      <Suspense fallback={
        <div className="w-full h-full flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-gray-500 text-sm">Loading map...</span>
          </div>
        </div>
      }>
        <MapContent />
      </Suspense>
    </div>
  );
}
