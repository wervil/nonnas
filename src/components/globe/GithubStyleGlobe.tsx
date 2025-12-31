"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import * as dat from "dat.gui";

const colors = {
  skyblue: "#0054ad",
  green: "#038510",
  blue: "#09d9c4",
  yellow: "#fff700",
  parrotcolor: "#9cff00",
  red: "#ff0000",
  white: "#ffffff",
  black: "#000000",
  pink: "#a10078",
};

type CountriesGeo = { type: "FeatureCollection"; features: any[] };
type MapJson = { maps: Array<{ city: string; lat: number; lng: number }> };
type LinesJson = {
  pulls: Array<{
    startLat: number;
    startLng: number;
    endLat: number;
    endLng: number;
    order: number;
    status?: boolean;
  }>;
};

async function loadJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`);
  return (await res.json()) as T;
}

/**
 * ✅ Updated:
 * - Added `active?: boolean` (default true)
 * - Keeps scene/render loop mounted, but:
 *   - disables OrbitControls + GUI when inactive
 *   - pauses distance emits when inactive
 *   - stops auto-rotation when inactive
 */
export default function GithubStyleGlobe({
  onDistanceChange,
  active = true,
}: {
  onDistanceChange?: (dist: number) => void;
  active?: boolean;
}) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const guiRef = useRef<dat.GUI | null>(null);

  const activeRef = useRef<boolean>(active);
  const onDistRef = useRef<typeof onDistanceChange>(onDistanceChange);

  useEffect(() => {
    activeRef.current = active;
    // Hide GUI when not active (optional UX)
    const guiDom = guiRef.current?.domElement;
    if (guiDom) guiDom.style.display = active ? "block" : "none";
  }, [active]);

  useEffect(() => {
    onDistRef.current = onDistanceChange;
  }, [onDistanceChange]);

  useEffect(() => {
    let renderer: THREE.WebGLRenderer | null = null;
    let scene: THREE.Scene | null = null;
    let camera: THREE.PerspectiveCamera | null = null;
    let controls: OrbitControls | null = null;
    let globe: any = null;
    let raf = 0;

    const mount = mountRef.current;
    if (!mount) return;

    mount.innerHTML = "";

    const init = async () => {
      const ThreeGlobeMod = await import("three-globe");
      const ThreeGlobe = ThreeGlobeMod.default;

      const [countries, map, lines] = await Promise.all([
        loadJson<CountriesGeo>("/globe/custom.geo.json"),
        loadJson<MapJson>("/globe/map.json"),
        loadJson<LinesJson>("/globe/lines.json"),
      ]);

      scene = new THREE.Scene();

      const w = mount.clientWidth;
      const h = mount.clientHeight;

      camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 2000);

      // ✅ start beyond minDistance (minDistance=200)
      camera.position.set(0, 0, 350);
      scene.add(camera);

      const dlight = new THREE.DirectionalLight(0xffffff, 10);
      dlight.position.set(-200, 10, 400);
      camera.add(dlight);

      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(w, h);
      mount.appendChild(renderer.domElement);

      globe = new ThreeGlobe({
        waitForGlobeReady: true,
        animateIn: true,
      })
        .hexPolygonsData(countries.features)
        .hexPolygonResolution(3)
        .hexPolygonMargin(0.6)
        .showAtmosphere(true)
        .atmosphereColor(colors.blue)
        .atmosphereAltitude(0.1)
        .onGlobeReady(() => {
          globe
            .labelsData(map.maps)
            .labelColor(() => colors.yellow)
            .labelDotRadius(0.5)
            .labelSize(1)
            .labelText("city")
            .labelResolution(6)
            .labelAltitude(0.01)
            .pointsData(map.maps)
            .pointsMerge(true)
            .pointColor(() => colors.yellow)
            .pointAltitude(0.09)
            .pointRadius(0.09)
            .arcsData(lines.pulls)
            .arcColor((e: any) => (e.status ? colors.green : colors.red))
            .arcAltitudeAutoScale(true)
            .arcAltitude(0.2)
            .arcStroke(() => 0.7)
            .arcDashLength(0.5)
            .arcDashGap(4)
            .arcDashAnimateTime(1000)
            .arcsTransitionDuration(500)
            .arcDashInitialGap((e: any) => e.order * 1);
        });

      const globematerial: any = globe.globeMaterial();
      globematerial.color = new THREE.Color(0x002330);
      globematerial.emissive = new THREE.Color(0x000d12);
      globematerial.emissiveIntensity = 1;
      globematerial.shininess = 0.5;

      scene.add(globe);

      controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.enableZoom = true;
      controls.enablePan = false;

      controls.maxDistance = 500;
      controls.minDistance = 200;

      // ✅ start enabled/disabled based on active
      controls.enabled = activeRef.current;

      const emitDistance = () => {
        if (!controls) return;
        if (!activeRef.current) return; // ✅ do not emit when inactive
        onDistRef.current?.(controls.getDistance());
      };

      const onCtrlChange = () => emitDistance();
      controls.addEventListener("change", onCtrlChange);

      const onResize = () => {
        if (!renderer || !camera) return;
        const w2 = mount.clientWidth;
        const h2 = mount.clientHeight;
        renderer.setSize(w2, h2);
        camera.aspect = w2 / h2;
        camera.updateProjectionMatrix();
      };
      window.addEventListener("resize", onResize);

      // ✅ GUI (optional) — hidden when inactive via effect above
      guiRef.current?.destroy();
      const gui = new dat.GUI();
      guiRef.current = gui;

      const light = gui.addFolder("light");
      light.add(dlight, "intensity", 0, 10).name("Light intensity");

      // Hide GUI if inactive at boot
      if (gui.domElement) gui.domElement.style.display = activeRef.current ? "block" : "none";

      // Emit initial distance (only if active)
      emitDistance();

      const loop = () => {
        raf = requestAnimationFrame(loop);

        // ✅ toggle controls live (no remount)
        if (controls) controls.enabled = activeRef.current;

        // ✅ only animate + update controls when active
        if (activeRef.current) {
          globe.rotation.x = 0;
          globe.rotation.y += 0.0005;
          controls?.update();
          emitDistance();
        }

        renderer!.render(scene!, camera!);
      };
      loop();

      return () => {
        window.removeEventListener("resize", onResize);
        controls?.removeEventListener("change", onCtrlChange);
      };
    };

    let cleanupResize: null | (() => void) = null;

    init()
      .then((cleanup) => {
        cleanupResize = cleanup;
      })
      .catch(console.error);

    return () => {
      cancelAnimationFrame(raf);
      cleanupResize?.();

      guiRef.current?.destroy();
      guiRef.current = null;

      controls?.dispose();
      controls = null;

      if (renderer) {
        renderer.dispose();
        if (renderer.domElement.parentNode) {
          renderer.domElement.parentNode.removeChild(renderer.domElement);
        }
      }

      scene = null;
      camera = null;
      globe = null;
      renderer = null;

      if (mount) mount.innerHTML = "";
    };
  }, []);

  // ✅ Make it fill parent; shell can control opacity/pointerEvents
  return <div ref={mountRef} className="w-full h-full" />;
}
