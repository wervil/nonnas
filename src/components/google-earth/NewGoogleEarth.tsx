"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    google?: any;
  }
  namespace JSX {
    interface IntrinsicElements {
      "gmp-map-3d": any;
    }
  }
}

type SelectedFeature = {
  placeId: string;
  label?: string;
};

export default function GoogleEarth3D() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const selectedPlaceIdRef = useRef<string | null>(null);

  const [selected, setSelected] = useState<SelectedFeature | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadGoogleMaps3D(apiKey: string) {
    if (window.google?.maps?.importLibrary) return;

    const existing = document.getElementById("google-maps-js");
    if (existing) {
      await waitFor(() => !!window.google?.maps?.importLibrary, 20000, 50, "Maps JS loader timed out");
      return;
    }

    await new Promise<void>((resolve, reject) => {
      const s = document.createElement("script");
      s.id = "google-maps-js";
      s.async = true;
      s.defer = true;
      s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
        apiKey
      )}&v=beta&libraries=maps3d`;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("Failed to load Google Maps JS"));
      document.head.appendChild(s);
    });

    await waitFor(() => !!window.google?.maps?.importLibrary, 20000, 50, "google.maps.importLibrary not available");
  }

  function waitFor(
    predicate: () => boolean,
    timeoutMs: number,
    intervalMs: number,
    timeoutMsg: string
  ) {
    return new Promise<void>((resolve, reject) => {
      const start = Date.now();
      const t = setInterval(() => {
        if (predicate()) {
          clearInterval(t);
          resolve();
        } else if (Date.now() - start > timeoutMs) {
          clearInterval(t);
          reject(new Error(timeoutMsg));
        }
      }, intervalMs);
    });
  }

  async function waitForMap3DReady(map3dEl: any) {
    // 1) If feature layer API already present, we’re good
    if (typeof map3dEl.getFeatureLayer === "function") return;

    // 2) Try to wait for a readiness event (varies by release)
    await new Promise<void>((resolve) => {
      let done = false;

      const finish = () => {
        if (done) return;
        done = true;
        resolve();
      };

      // Some builds emit "gmp-ready"
      const onReady = () => finish();

      // Some builds might fire standard "load"
      const onLoad = () => finish();

      map3dEl.addEventListener?.("gmp-ready", onReady, { once: true });
      map3dEl.addEventListener?.("load", onLoad, { once: true });

      // Fallback: polling requestAnimationFrame for the API to appear
      const start = Date.now();
      const raf = () => {
        if (typeof map3dEl.getFeatureLayer === "function") return finish();
        if (Date.now() - start > 20000) return finish(); // don’t reject here; we’ll handle after
        requestAnimationFrame(raf);
      };
      raf();
    });
  }

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        setError(null);

        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
        const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID;

        if (!apiKey) throw new Error("Missing NEXT_PUBLIC_GOOGLE_MAPS_API_KEY");
        if (!mapId) throw new Error("Missing NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID");
        if (!hostRef.current) return;

        await loadGoogleMaps3D(apiKey);

        const maps3d = await window.google.maps.importLibrary("maps3d");
        const Map3DElement = (maps3d as any).Map3DElement;

        if (!Map3DElement) {
          throw new Error(
            "Maps 3D library not available. Ensure v=beta & libraries=maps3d, and Maps 3D is enabled on the project."
          );
        }

        const map3d = new Map3DElement({
          mapId,
          center: { lat: 20, lng: 0, altitude: 2000000 },
          range: 9000000,
          tilt: 0,
          heading: 0,
        });

        map3d.style.width = "100%";
        map3d.style.height = "80vh";
        map3d.style.borderRadius = "12px";
        map3d.style.overflow = "hidden";

        hostRef.current.innerHTML = "";
        hostRef.current.appendChild(map3d);

        await waitForMap3DReady(map3d);

        // After readiness wait, check if the API exists
        // if (typeof map3d.getFeatureLayer !== "function") {
        //   throw new Error(
        //     "Maps 3D loaded, but feature layer API is not available in this build / project. Check Map ID 3D + boundaries configuration."
        //   );
        // }

        // Try layer keys (varies by release)
        const tryKeys = ["COUNTRY", "ADMINISTRATIVE_AREA_LEVEL_0"];
        let featureLayer: any = null;

        for (const key of tryKeys) {
          try {
            featureLayer = map3d.getFeatureLayer(key);
            if (featureLayer) break;
          } catch {
            // try next
          }
        }

        if (!featureLayer) {
          throw new Error(
            "Feature layers are not enabled for this Map ID (COUNTRY/ADMIN layers missing). Enable Boundaries/Feature Layers for the Map ID in Map Management."
          );
        }

        // Styling function
        const styleFn = (params: any) => {
          const isSelected = params?.feature?.placeId === selectedPlaceIdRef.current;
          return {
            strokeColor: isSelected ? "#00A3FF" : "#FF3B30",
            strokeOpacity: isSelected ? 1.0 : 0.85,
            strokeWidth: isSelected ? 3.0 : 1.5,
            fillColor: isSelected ? "#00A3FF" : "#000000",
            fillOpacity: isSelected ? 0.25 : 0.05,
          };
        };

        featureLayer.style = styleFn;

        featureLayer.addListener("click", (e: any) => {
          const feature = e?.features?.[0];
          const placeId = feature?.placeId;
          if (!placeId) return;

          selectedPlaceIdRef.current = placeId;
          featureLayer.style = styleFn;

          if (!mounted) return;
          setSelected({
            placeId,
            label: feature?.displayName || feature?.name,
          });
        });
      } catch (err: any) {
        if (!mounted) return;
        setError(err?.message ?? "Failed to initialize Google Earth 3D");
      }
    }

    init();

    return () => {
      mounted = false;
      selectedPlaceIdRef.current = null;
      if (hostRef.current) hostRef.current.innerHTML = "";
    };
  }, []);

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <div ref={hostRef} />

      <div
        style={{
          position: "absolute",
          top: 16,
          right: 16,
          width: 360,
          maxWidth: "calc(100% - 32px)",
          background: "rgba(15, 15, 15, 0.92)",
          color: "white",
          borderRadius: 12,
          padding: 14,
          border: "1px solid rgba(255,255,255,0.12)",
          backdropFilter: "blur(10px)",
        }}
      >
        <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 8 }}>
          {error ? "Error" : "Selected Area"}
        </div>

        {error ? (
          <div style={{ fontSize: 13, lineHeight: 1.4, color: "#ffb4b4" }}>
            {error}
            <div style={{ marginTop: 10, fontSize: 12, opacity: 0.85 }}>
              Most common fix:
              <ul style={{ margin: "8px 0 0 18px" }}>
                <li>Map Management → Map ID → enable Boundaries/Feature Layers</li>
                <li>Map ID must be Vector + 3D enabled</li>
                <li>Billing ON + project has Photorealistic 3D access</li>
              </ul>
            </div>
          </div>
        ) : selected ? (
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ fontSize: 18, fontWeight: 700 }}>
              {selected.label ?? "Boundary"}
            </div>
            <div style={{ fontSize: 12, opacity: 0.85, wordBreak: "break-all" }}>
              <div style={{ marginBottom: 4, opacity: 0.75 }}>placeId</div>
              {selected.placeId}
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 13, opacity: 0.85 }}>
            Click a country boundary to highlight it.
          </div>
        )}
      </div>
    </div>
  );
}