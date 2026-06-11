"use client";

import type { ZoomLevel } from "../types";

export default function ZoomControls({
  onZoomIn,
  onZoomOut,
  currentLevel,
  isMobile = false,
}: {
  onZoomIn: () => void;
  onZoomOut: () => void;
  currentLevel: ZoomLevel;
  isMobile?: boolean;
}) {
  const levels: ZoomLevel[] = [
    "EARTH",
    "CONTINENT",
    "COUNTRY",
    "STATE",
    "CITY",
    "NONNA",
  ];
  const canZoomIn = levels.indexOf(currentLevel) < levels.length - 1;
  const canZoomOut = levels.indexOf(currentLevel) > 0;
  const btnStyle = (enabled: boolean): React.CSSProperties => ({
    width: isMobile ? "56px" : "64px",
    height: isMobile ? "56px" : "64px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: enabled ? "rgba(13,148,136,0.85)" : "rgba(30,30,30,0.4)",
    border: `2px solid ${enabled ? "rgba(94,234,212,0.6)" : "rgba(255,255,255,0.1)"} `,
    backdropFilter: "blur(12px)",
    boxShadow: enabled ? "0 4px 20px rgba(13,148,136,0.4)" : "none",
    cursor: enabled ? "pointer" : "not-allowed",
    opacity: enabled ? 1 : 0.4,
    transition: "all 0.2s ease",
    color: "white",
    fontSize: isMobile ? "28px" : "32px",
    fontWeight: 300,
    lineHeight: 1,
    userSelect: "none",
    WebkitTapHighlightColor: "transparent",
  });

  return (
    <div
      style={{
        position: "absolute",
        right: isMobile ? "8px" : "24px",
        top: "50%",
        transform: "translateY(-50%)",
        display: "flex",
        flexDirection: "column",
        gap: isMobile ? "8px" : "12px",
        zIndex: 50,
      }}
    >
      <button
        onClick={onZoomIn}
        disabled={!canZoomIn}
        title="Zoom In"
        style={btnStyle(canZoomIn)}
        onTouchStart={(e) => {
          if (canZoomIn)
            (e.currentTarget as HTMLElement).style.transform = "scale(0.95)";
        }}
        onTouchEnd={(e) => {
          if (canZoomIn)
            (e.currentTarget as HTMLElement).style.transform = "scale(1)";
        }}
        onMouseEnter={(e) => {
          if (!isMobile && canZoomIn)
            (e.currentTarget as HTMLElement).style.transform = "scale(1.1)";
        }}
        onMouseLeave={(e) => {
          if (!isMobile)
            (e.currentTarget as HTMLElement).style.transform = "scale(1)";
        }}
      >
        +
      </button>
      <button
        onClick={onZoomOut}
        disabled={!canZoomOut}
        title="Zoom Out"
        style={btnStyle(canZoomOut)}
        onTouchStart={(e) => {
          if (canZoomOut)
            (e.currentTarget as HTMLElement).style.transform = "scale(0.95)";
        }}
        onTouchEnd={(e) => {
          if (canZoomOut)
            (e.currentTarget as HTMLElement).style.transform = "scale(1)";
        }}
        onMouseEnter={(e) => {
          if (!isMobile && canZoomOut)
            (e.currentTarget as HTMLElement).style.transform = "scale(1.1)";
        }}
        onMouseLeave={(e) => {
          if (!isMobile && canZoomOut)
            (e.currentTarget as HTMLElement).style.transform = "scale(1)";
        }}
      >
        −
      </button>
    </div>
  );
}
