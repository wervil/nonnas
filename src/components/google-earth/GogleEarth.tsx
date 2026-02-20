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
  const overlayRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let mounted = true;
    let animationFrameId: number;

    async function init() {
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      if (!apiKey) throw new Error("Missing NEXT_PUBLIC_GOOGLE_MAPS_API_KEY");

      await loadGoogleMaps(apiKey);
      if (!mounted || !containerRef.current) return;

      const { Map3DElement, Marker3DElement } = await window.google.maps.importLibrary("maps3d");

      const map3d = new Map3DElement({
        center: { lat: 20, lng: 0, altitude: 0 }, // Good view of earth layout
        range: 20000000, // Earth-level default zoom
        tilt: 0,
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

      let currentSize = 0;
      let currentOpacity = 0;
      const LERP_SPEED = 0.1;
      const EARTH_RADIUS = 6371000;
      const FOV_FACTOR = 1.6; // Higher FOV prevents the spherical bulge from clipping

      const checkZoom = () => {
        if (!mounted || !overlayRef.current) return;

        const currentRange = map3d.range;
        const distance = EARTH_RADIUS + currentRange;
        // safeguard domain for asin
        const d = Math.max(distance, EARTH_RADIUS + 10);
        const alpha = Math.asin(EARTH_RADIUS / d);

        // Approximate screen radius of the globe
        const rPx = Math.tan(alpha) * window.innerHeight * FOV_FACTOR;

        // The text needs to stay generously clear of the "visual bulge" in Map3D projection.
        // SVG viewBox is 1000. Path radius is 400.
        // Container size Z means path pixel radius = Z * 0.4.
        const targetSize = (rPx + 60) * 2.5;

        // Fade out smoothly when zooming IN to continents/countries
        let targetOpacity = 1;
        if (currentRange < 8000000) {
          targetOpacity = 0;
        } else if (currentRange < 12000000) {
          // Soft fade from 12M down to 8M (when zooming in)
          targetOpacity = (currentRange - 8000000) / 4000000;
        }

        // Init instantaneously
        if (currentSize === 0) {
          currentSize = targetSize;
          currentOpacity = targetOpacity;
        } else {
          // Lerp for smooth interpolation
          currentSize += (targetSize - currentSize) * LERP_SPEED;
          currentOpacity += (targetOpacity - currentOpacity) * LERP_SPEED;
        }

        const el = overlayRef.current;
        el.style.width = `${currentSize}px`;
        el.style.height = `${currentSize}px`;
        el.style.opacity = `${currentOpacity}`;

        animationFrameId = requestAnimationFrame(checkZoom);
      };

      checkZoom();
    }

    init().catch(console.error);

    return () => {
      mounted = false;
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="relative" style={{ height: "100vh", width: "100%" }}>
      <div
        ref={containerRef}
        style={{ height: "100%", width: "100%" }}
      />

      <div
        ref={overlayRef}
        className="pointer-events-none absolute top-1/2 left-1/2 z-10"
        style={{
          transform: "translate(-50%, -50%)",
          opacity: 0, // Init zero, will be set on first frame
          willChange: "width, height, opacity"
        }}
      >
        <svg
          viewBox="0 0 1000 1000"
          className="w-full h-full overflow-visible"
          style={{ animation: "spin-reverse 150s linear infinite" }}
        >
          <style>
            {`
              @keyframes spin-reverse {
                from { transform: rotate(0deg); }
                to { transform: rotate(-360deg); }
              }
            `}
          </style>
          <defs>
            <path
              id="globePath"
              d="M 100, 500
                 a 400,400 0 1,1 800,0
                 a 400,400 0 1,1 -800,0"
            />
          </defs>
          <text
            className="font-bold fill-[#FFF7ED]"
            // Using uppercase and standard sans-serif
            style={{
              fontSize: "65px",
              fontFamily: 'ui-sans-serif, system-ui, sans-serif',
              textShadow: "0px 4px 15px rgba(0,0,0,0.8)"
            }}
          >
            <textPath
              href="#globePath"
              startOffset="50%"
              textAnchor="middle"
              textLength="2300"
              lengthAdjust="spacing"
            >
              NONNAS OF THE WORLD
            </textPath>
          </text>
        </svg>
      </div>
    </div>
  );
}
