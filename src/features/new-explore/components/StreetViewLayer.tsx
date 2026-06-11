"use client";

import { useEffect, useState } from "react";
import {
  calculateDistance,
  generateAvatarSvgUri,
} from "../lib/markers";
import type { GlobeNonna } from "../types";

export default function StreetViewLayer({
  streetViewPanorama,
  containerRef,
  nonnaData,
  currentNonnaPhoto,
  currentNonnaRecipeId,
  onAvatarClick,
}: {
  streetViewPanorama: any;
  containerRef: React.RefObject<HTMLDivElement | null>;
  nonnaData: GlobeNonna[];
  currentNonnaPhoto: string | null;
  currentNonnaRecipeId: number | null;
  onAvatarClick: (nonna: GlobeNonna) => void;
}) {
  const [placements, setPlacements] = useState<
    Array<{
      nonna: GlobeNonna;
      x: number;
      y: number;
      size: number;
      photo: string | null;
    }>
  >([]);

  useEffect(() => {
    if (!streetViewPanorama || !containerRef.current || !window.google?.maps)
      return;

    const bearing = (
      lat1: number,
      lng1: number,
      lat2: number,
      lng2: number,
    ) => {
      const toRad = (d: number) => (d * Math.PI) / 180;
      const toDeg = (r: number) => (r * 180) / Math.PI;
      const φ1 = toRad(lat1);
      const φ2 = toRad(lat2);
      const Δλ = toRad(lng2 - lng1);
      const y = Math.sin(Δλ) * Math.cos(φ2);
      const x =
        Math.cos(φ1) * Math.sin(φ2) -
        Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
      return (toDeg(Math.atan2(y, x)) + 360) % 360;
    };

    const update = () => {
      const pano = streetViewPanorama;
      const container = containerRef.current;
      if (!container) return;

      const pos = pano.getPosition?.();
      const pov = pano.getPov?.();
      if (!pos || !pov) return;

      const panoLat = typeof pos.lat === "function" ? pos.lat() : pos.lat;
      const panoLng = typeof pos.lng === "function" ? pos.lng() : pos.lng;
      const heading = pov.heading || 0;
      const pitch = pov.pitch || 0;
      const zoom = pano.getZoom?.() ?? 1;

      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;

      const fovH = 180 / Math.pow(2, zoom);
      const fovV = fovH * (h / w);
      const tanFovH = Math.tan(((fovH / 2) * Math.PI) / 180);
      const tanFovV = Math.tan(((fovV / 2) * Math.PI) / 180);

      const next: typeof placements = [];

      nonnaData.forEach((nonna) => {
        if (nonna.nonnaCount !== 1) return;
        const distance = calculateDistance(
          panoLat,
          panoLng,
          nonna.lat,
          nonna.lng,
        );
        if (distance > 500) return;

        const b = bearing(panoLat, panoLng, nonna.lat, nonna.lng);
        const relH = ((b - heading + 540) % 360) - 180;
        if (Math.abs(relH) > 89) return;

        const tanH = Math.tan((relH * Math.PI) / 180);
        const x = w / 2 + (tanH / tanFovH) * (w / 2);
        const tanV = Math.tan((-pitch * Math.PI) / 180);
        const y = h / 2 - (tanV / tanFovV) * (h / 2);
        const size = Math.max(
          70,
          Math.min(180, (140 * 8) / Math.max(distance, 4)),
        );

        const recipeId = nonna.recipeId
          ? parseInt(nonna.recipeId.toString(), 10)
          : null;
        const photo =
          recipeId && recipeId === currentNonnaRecipeId
            ? currentNonnaPhoto
            : nonna.representativePhoto || null;

        next.push({ nonna, x, y, size, photo });
      });

      setPlacements(next);
    };

    update();

    const listeners = [
      streetViewPanorama.addListener("pov_changed", update),
      streetViewPanorama.addListener("position_changed", update),
      streetViewPanorama.addListener("zoom_changed", update),
    ];
    const onResize = () => update();
    window.addEventListener("resize", onResize);

    return () => {
      listeners.forEach((l: { remove?: () => void }) => l?.remove?.());
      window.removeEventListener("resize", onResize);
    };
  }, [
    streetViewPanorama,
    containerRef,
    nonnaData,
    currentNonnaPhoto,
    currentNonnaRecipeId,
  ]);

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
@keyframes nonna-wave {
  0%, 100% { transform: rotate(-7deg) translateY(0); }
  50%      { transform: rotate(7deg)  translateY(-6px); }
}
@keyframes nonna-bob {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-3px); }
}
.nonna-sv-avatar {
  animation: nonna-bob 3.2s ease-in-out infinite;
  transform-origin: center bottom;
}
.nonna-sv-avatar-inner {
  animation: nonna-wave 2.2s ease-in-out infinite;
  transform-origin: center bottom;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  overflow: hidden;
  border: 4px solid #14b8a6;
  background: #fff;
  box-shadow: 0 10px 28px rgba(0,0,0,0.45);
}
.nonna-sv-avatar-inner img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
`,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          zIndex: 6,
          overflow: "hidden",
        }}
      >
        {placements.map((p, i) => {
          const imgSrc = p.photo
            ? `/api/proxy-image?url=${encodeURIComponent(p.photo)}`
            : generateAvatarSvgUri(
                p.nonna.representativeName,
                p.nonna.countryCode,
              );
          return (
            <button
              key={`${p.nonna.id}-${i}`}
              onClick={() => onAvatarClick(p.nonna)}
              className="nonna-sv-avatar"
              style={{
                position: "absolute",
                left: p.x - p.size / 2,
                top: p.y - p.size / 2,
                width: p.size,
                height: p.size,
                padding: 0,
                border: "none",
                background: "transparent",
                cursor: "pointer",
                pointerEvents: "auto",
              }}
              aria-label={p.nonna.representativeName}
            >
              <div className="nonna-sv-avatar-inner">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imgSrc} alt={p.nonna.representativeName} />
              </div>
            </button>
          );
        })}
      </div>
    </>
  );
}
