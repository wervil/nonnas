"use client";

import { useEarthMap3DController } from "../hooks/useEarthMap3DController";
import EarthMap3DOverlays from "./EarthMap3DOverlays";

export default function EarthMap3D() {
  const controller = useEarthMap3DController();
  return <EarthMap3DOverlays {...controller} />;
}
