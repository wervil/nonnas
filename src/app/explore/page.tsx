// src/app/map/page.tsx
import { Suspense } from "react";
import ExploreContent from "./ExploreContent";


// Preload critical resources for faster globe rendering
export const metadata = {
  title: "Nonnas of the World - Interactive Globe",
};



export default function MapPage() {
  return (
    <>
      {/* Preload critical assets for faster globe rendering */}
      <link rel="preload" href="/textures/earth_day_clouds.jpg" as="image" />
      <link rel="preload" href="/geo/ne_admin0_countries.geojson" as="fetch" crossOrigin="anonymous" />

      <ExploreContent />
    </>
  );
}
