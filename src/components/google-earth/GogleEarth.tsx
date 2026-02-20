"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    google?: any;
  }
}

function loadGoogleMaps(apiKey: string) {
  // If already loaded, reuse
  if (window.google?.maps?.importLibrary) return Promise.resolve();

  return new Promise<void>((resolve, reject) => {
    const scriptId = "google-maps-js";

    if (document.getElementById(scriptId)) {
      // Wait until google.maps.importLibrary exists
      const t = setInterval(() => {
        if (window.google?.maps?.importLibrary) {
          clearInterval(t);
          resolve();
        }
      }, 50);
      return;
    }

    // Official loader pattern is usually recommended; for Next.js,
    // a simple script load works fine as long as you don't load twice.
    const s = document.createElement("script");
    s.id = scriptId;
    s.async = true;
    s.defer = true;
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly`;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Google Maps JS"));
    document.head.appendChild(s);
  });
}

export default function Earth3DPage() {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let mounted = true;

    async function init() {
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      if (!apiKey) throw new Error("Missing NEXT_PUBLIC_GOOGLE_MAPS_API_KEY");

      await loadGoogleMaps(apiKey);
      if (!mounted || !containerRef.current) return;

      const { Map3DElement, Marker3DElement } = await window.google.maps.importLibrary("maps3d");

      const map3d = new Map3DElement({
        center: { lat: 43.6425, lng: -79.3871, altitude: 400 }, // example
        range: 1000,
        tilt: 60,
        mode: "HYBRID",
      });

      const marker = new Marker3DElement({
        position: { lat: 43.6425, lng: -79.3871, altitude: 20 },
        title: "3D Marker",
      });

      map3d.append(marker);

      // Clear container and append (avoids duplicates on hot reload)
      containerRef.current.innerHTML = "";
      containerRef.current.appendChild(map3d);
    }

    init().catch(console.error);

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div style={{ height: "100vh", width: "100%" }} ref={containerRef} />
  );
}
