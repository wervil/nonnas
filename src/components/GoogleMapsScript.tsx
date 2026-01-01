"use client";

import Script from "next/script";

declare global {
  interface Window {
    __gmaps_loading__?: boolean;
  }
}

export default function GoogleMapsScript() {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  // Prevent double-inject if the component mounts twice in dev/strict mode
  if (typeof window !== "undefined") {
    if (window.__gmaps_loading__) return null;
    window.__gmaps_loading__ = true;
  }

  if (!key) {
    console.error("Missing NEXT_PUBLIC_GOOGLE_MAPS_API_KEY");
    return null;
  }

  return (
    <Script
      id="google-maps"
      strategy="afterInteractive"
      src={`https://maps.googleapis.com/maps/api/js?key=${key}&v=weekly&libraries=marker`}
      onLoad={() => console.log("✅ Google Maps JS loaded")}
      onError={(e) => console.error("❌ Google Maps JS failed to load", e)}
    />
  );
}
