"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import ThreeGlobe from "three-globe";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

type RegionNonna = {
  id: string;
  name: string;
  age: number;
  origin: string;
  tagline: string;
};

type RegionPoint = {
  id: string;
  country: string;
  title: string;
  lat: number;
  lng: number;
  count: number;
  nonnas: RegionNonna[];
};

type DisplayMarker = {
  id: string;
  country: string;
  title: string;
  lat: number;
  lng: number;
  count: number;
  nonnas: RegionNonna[];
};

type MarkerUserData = {
  kind: "marker";
  id: string;
  marker: DisplayMarker;
  scaleMul: number;
  targetScaleMul: number;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}
function smoothstep(edge0: number, edge1: number, x: number) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

/**
 * ✅ Correct Y-up Earth mapping (matches typical ThreeGlobe orientation)
 * If you ever observe left/right mirroring, flip longitude by using -lng.
 */
function latLngToVec3(lat: number, lng: number, radius: number) {
  const phi = (lat * Math.PI) / 180;
  const theta = (lng * Math.PI) / 180;

  const x = radius * Math.cos(phi) * Math.sin(theta);
  const y = radius * Math.sin(phi);
  const z = radius * Math.cos(phi) * Math.cos(theta);

  return new THREE.Vector3(x, y, z);
}

function isMarkerSprite(obj: THREE.Object3D): obj is THREE.Sprite {
  return obj instanceof THREE.Sprite;
}

export default function NaturalStyleGlobe({
  onDistanceChange,
  active = true,
}: {
  onDistanceChange?: (dist: number) => void;
  active?: boolean;
}) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  const activeRef = useRef(active);
  const onDistRef = useRef(onDistanceChange);

  const [selectedRegion, setSelectedRegion] = useState<DisplayMarker | null>(
    null
  );

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    onDistRef.current = onDistanceChange;
  }, [onDistanceChange]);

  const regionPoints = useMemo<RegionPoint[]>(
    () => [
      {
        id: "us-ca",
        country: "USA",
        title: "California",
        lat: 36.7783,
        lng: -119.4179,
        count: 5,
        nonnas: Array.from({ length: 5 }).map((_, i) => ({
          id: `ca-${i + 1}`,
          name: `Nonna California ${i + 1}`,
          age: 64 + (i % 18),
          origin: "USA • California",
          tagline: "Local comfort food + family stories.",
        })),
      },
      {
        id: "us-ny",
        country: "USA",
        title: "New York",
        lat: 43.0,
        lng: -75.0,
        count: 8,
        nonnas: Array.from({ length: 8 }).map((_, i) => ({
          id: `ny-${i + 1}`,
          name: `Nonna New York ${i + 1}`,
          age: 62 + (i % 20),
          origin: "USA • New York",
          tagline: "Sunday dinners and city traditions.",
        })),
      },
      {
        id: "co-bog",
        country: "Colombia",
        title: "Colombia",
        lat: 4.5709,
        lng: -74.2973,
        count: 7,
        nonnas: Array.from({ length: 7 }).map((_, i) => ({
          id: `co-${i + 1}`,
          name: `Nonna Emilia ${i + 1}`,
          age: 65 + (i % 20),
          origin: "Colombia",
          tagline: "Arepas, stews, and family traditions.",
        })),
      },
      {
        id: "it-laz",
        country: "Italy",
        title: "Lazio",
        lat: 41.8719,
        lng: 12.5674,
        count: 12,
        nonnas: Array.from({ length: 12 }).map((_, i) => ({
          id: `it-${i + 1}`,
          name: `Nonna ${["Domenica", "Giulia", "Rosa", "Maria", "Lucia"][
            i % 5
          ]} ${i + 1}`,
          age: 68 + (i % 18),
          origin: "Italy",
          tagline: "Handmade pasta & Sunday sauce specialist.",
        })),
      },
      {
        id: "it-lom",
        country: "Italy",
        title: "Lombardy",
        lat: 45.4668,
        lng: 9.19,
        count: 6,
        nonnas: Array.from({ length: 6 }).map((_, i) => ({
          id: `it2-${i + 1}`,
          name: `Nonna Milano ${i + 1}`,
          age: 66 + (i % 16),
          origin: "Italy • Lombardy",
          tagline: "Risotto, polenta, and winter favorites.",
        })),
      },
    ],
    []
  );

  useEffect(() => {
    let renderer: THREE.WebGLRenderer | null = null;
    let scene: THREE.Scene | null = null;
    let camera: THREE.PerspectiveCamera | null = null;
    let controls: OrbitControls | null = null;
    let globe: ThreeGlobe | null = null;
    let cloudsMesh: THREE.Mesh | null = null;
    let raf = 0;

    let markerGroup: THREE.Group | null = null;
    let markerSprites: THREE.Sprite[] = [];
    let raycaster: THREE.Raycaster | null = null;
    const pointer = new THREE.Vector2();
    let lastMode: "country" | "region" | null = null;

    const mount = mountRef.current;
    if (!mount) return;
    mount.innerHTML = "";

    const THEME = {
      parchmentA: "#f4ead2",
      parchmentB: "#e9ddbf",
      ink: "#2b1d12",
      inkSoft: "rgba(43,29,18,0.72)",
      goldSoft: "rgba(201,162,74,0.55)",
      shadow: "rgba(0,0,0,0.22)",
    };

    const getOrbitDistance = () => {
      if (!camera || !controls) return 0;
      return camera.position.distanceTo(controls.target);
    };

    const setCursor = (cursor: string) => {
      if (!renderer) return;
      renderer.domElement.style.cursor = cursor;
    };

    const makeMarkerTexture = (title: string, count: number) => {
      const canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;

      const W = canvas.width;
      const H = canvas.height;
      const cx = W / 2;
      const cy = H / 2;

      ctx.clearRect(0, 0, W, H);

      // shadow
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx + 10, cy + 14, 190, 0, Math.PI * 2);
      ctx.fillStyle = THEME.shadow;
      ctx.fill();
      ctx.restore();

      // parchment fill
      const grad = ctx.createRadialGradient(cx, cy - 30, 30, cx, cy, 220);
      grad.addColorStop(0, THEME.parchmentA);
      grad.addColorStop(1, THEME.parchmentB);

      ctx.beginPath();
      ctx.arc(cx, cy, 190, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      // vignette
      ctx.save();
      const vig = ctx.createRadialGradient(cx, cy, 140, cx, cy, 220);
      vig.addColorStop(0, "rgba(0,0,0,0)");
      vig.addColorStop(1, "rgba(0,0,0,0.12)");
      ctx.beginPath();
      ctx.arc(cx, cy, 190, 0, Math.PI * 2);
      ctx.fillStyle = vig;
      ctx.fill();
      ctx.restore();

      // grain
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, 190, 0, Math.PI * 2);
      ctx.clip();
      ctx.globalAlpha = 0.12;
      for (let i = 0; i < 1600; i++) {
        const x = Math.random() * W;
        const y = Math.random() * H;
        const r = Math.random() * 1.2;
        ctx.fillStyle =
          i % 2 === 0
            ? "rgba(80,60,30,0.22)"
            : "rgba(255,255,255,0.18)";
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // rings
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, 190, 0, Math.PI * 2);
      ctx.lineWidth = 10;
      ctx.strokeStyle = "rgba(91,90,30,0.55)";
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, 175, 0, Math.PI * 2);
      ctx.lineWidth = 6;
      ctx.strokeStyle = THEME.goldSoft;
      ctx.stroke();
      ctx.restore();

      // corner accents
      ctx.save();
      ctx.strokeStyle = "rgba(201,162,74,0.45)";
      ctx.lineWidth = 3;
      const rr = 152;
      const arcLen = Math.PI / 9;
      const corners = [
        -Math.PI / 2 + 0.3,
        0 + 0.3,
        Math.PI / 2 + 0.3,
        Math.PI + 0.3,
      ];
      for (const a of corners) {
        ctx.beginPath();
        ctx.arc(cx, cy, rr, a, a + arcLen);
        ctx.stroke();
      }
      ctx.restore();

      // text
      const safeTitle = title.length > 14 ? `${title.slice(0, 13)}…` : title;

      ctx.fillStyle = THEME.ink;
      ctx.textAlign = "center";

      ctx.font = "700 46px Georgia, 'Times New Roman', serif";
      ctx.fillText(safeTitle, cx, cy - 18);

      ctx.font = "800 86px Georgia, 'Times New Roman', serif";
      ctx.fillText(String(count), cx, cy + 86);

      ctx.fillStyle = THEME.inkSoft;
      ctx.font = "600 26px Georgia, 'Times New Roman', serif";
      ctx.fillText("Nonnas", cx, cy + 126);

      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.needsUpdate = true;
      return tex;
    };

    const computeDisplayMarkers = (mode: "country" | "region") => {
      if (mode === "region") {
        return regionPoints.map<DisplayMarker>((p) => ({
          id: p.id,
          country: p.country,
          title: p.title,
          lat: p.lat,
          lng: p.lng,
          count: p.count,
          nonnas: p.nonnas,
        }));
      }

      const byCountry = new Map<
        string,
        { sumLat: number; sumLng: number; total: number; nonnas: RegionNonna[] }
      >();

      for (const p of regionPoints) {
        const cur = byCountry.get(p.country);
        if (!cur) {
          byCountry.set(p.country, {
            sumLat: p.lat * p.count,
            sumLng: p.lng * p.count,
            total: p.count,
            nonnas: [...p.nonnas],
          });
        } else {
          cur.sumLat += p.lat * p.count;
          cur.sumLng += p.lng * p.count;
          cur.total += p.count;
          cur.nonnas.push(...p.nonnas);
        }
      }

      return Array.from(byCountry.entries()).map<DisplayMarker>(
        ([country, v]) => ({
          id: `country-${country}`,
          country,
          title: country,
          lat: v.total ? v.sumLat / v.total : 0,
          lng: v.total ? v.sumLng / v.total : 0,
          count: v.total,
          nonnas: v.nonnas,
        })
      );
    };

    const clearMarkers = () => {
      if (!globe || !markerGroup) return;

      globe.remove(markerGroup);
      markerGroup.traverse((obj) => {
        if (isMarkerSprite(obj)) {
          const m = obj.material as THREE.SpriteMaterial;
          if (m.map) m.map.dispose();
          m.dispose();
        }
      });
      markerGroup = null;
      markerSprites = [];
    };

    const buildMarkers = (markers: DisplayMarker[]) => {
      if (!globe) return;

      clearMarkers();

      markerGroup = new THREE.Group();
      markerGroup.name = "region-markers";
      globe.add(markerGroup);

      raycaster = new THREE.Raycaster();

      const R =
  typeof globe.getGlobeRadius === "function"
    ? globe.getGlobeRadius()
    : 100;


      markerSprites = markers.map((m) => {
        const tex = makeMarkerTexture(m.title, m.count);

        const material = new THREE.SpriteMaterial({
          map: tex ?? undefined,
          transparent: true,
          depthTest: false,
          depthWrite: false,
          opacity: 1,
        });

        const sprite = new THREE.Sprite(material);

        const altitude = 4.8;
        const pos = latLngToVec3(m.lat, m.lng, R + altitude);
        sprite.position.copy(pos);

        sprite.scale.set(22, 22, 1);
        sprite.renderOrder = 999;

        const ud: MarkerUserData = {
          kind: "marker",
          id: m.id,
          marker: m,
          scaleMul: 1,
          targetScaleMul: 1,
        };
        sprite.userData = ud;

        markerGroup!.add(sprite);
        return sprite;
      });
    };

    const onPointerMove = (ev: PointerEvent) => {
      if (!renderer || !camera || !raycaster) return;

      if (!activeRef.current) {
        setCursor("default");
        return;
      }

      const rect = renderer.domElement.getBoundingClientRect();
      const x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((ev.clientY - rect.top) / rect.height) * 2 - 1);
      pointer.set(x, y);

      raycaster.setFromCamera(pointer, camera);

      const hits = raycaster.intersectObjects(markerSprites, false);
      const hitObj = hits[0]?.object;

      for (const s of markerSprites) {
        const ud = s.userData as MarkerUserData;
        ud.targetScaleMul = 1;
      }

      if (hitObj && isMarkerSprite(hitObj)) {
        const ud = hitObj.userData as MarkerUserData;
        if (ud.kind === "marker") {
          setCursor("pointer");
          ud.targetScaleMul = 1.22;
          return;
        }
      }

      setCursor("default");
    };

    const onClick = (ev: MouseEvent) => {
      if (!renderer || !camera || !raycaster) return;
      if (!activeRef.current) return;

      const rect = renderer.domElement.getBoundingClientRect();
      const x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((ev.clientY - rect.top) / rect.height) * 2 - 1);
      pointer.set(x, y);

      raycaster.setFromCamera(pointer, camera);

      const hits = raycaster.intersectObjects(markerSprites, false);
      const hitObj = hits[0]?.object;

      if (hitObj && isMarkerSprite(hitObj)) {
        const ud = hitObj.userData as MarkerUserData;
        if (ud.kind === "marker") {
          setSelectedRegion(ud.marker);
        }
      }
    };

    const init = async () => {
      scene = new THREE.Scene();

      const w = mount.clientWidth;
      const h = mount.clientHeight;

      camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 3000);
      camera.position.set(0, 0, 420);
      scene.background = new THREE.Color(0xffffff);

      const ambient = new THREE.AmbientLight(0xffffff, 0.8);
      scene.add(ambient);

      const sun = new THREE.DirectionalLight(0xffffff, 2.2);
      sun.position.set(-300, 200, 500);
      scene.add(sun);

      const fill = new THREE.DirectionalLight(0xffffff, 0.8);
      fill.position.set(300, -100, 200);
      scene.add(fill);

      const rim = new THREE.DirectionalLight(0xffffff, 1.6);
      rim.position.set(0, 0, -500);
      scene.add(rim);

      renderer = new THREE.WebGLRenderer({ alpha: false, antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(w, h);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;
      renderer.setClearColor(0xffffff, 1);

      mount.appendChild(renderer.domElement);

      globe = new ThreeGlobe()
        .globeImageUrl("/textures/earth_day.jpg")
        .bumpImageUrl("/textures/earth_bump.jpg")
        .showAtmosphere(true)
        .atmosphereColor("#7dd3fc")
        .atmosphereAltitude(0.08);

      scene.add(globe);

      // ✅ Make globe radius deterministic for our marker math:
      // ThreeGlobe uses ~100 by default. We set it explicitly.
      // globe.getglobeRadius(100);

      // specular
      const textureLoader = new THREE.TextureLoader();
      const specularMap = textureLoader.load("/textures/earth_specular.jpg");
      specularMap.colorSpace = THREE.NoColorSpace;

      const globeMat = globe.globeMaterial() as THREE.MeshPhongMaterial;
      globeMat.specularMap = specularMap;
      globeMat.specular = new THREE.Color(0x666666);
      globeMat.shininess = 18;
      globeMat.bumpScale = 10;

      // clouds
      const cloudsTex = textureLoader.load("/textures/earth_clouds.png");
      cloudsTex.colorSpace = THREE.SRGBColorSpace;

      const cloudsMat = new THREE.MeshPhongMaterial({
        map: cloudsTex,
        transparent: true,
        opacity: 0.25,
        depthWrite: false,
      });

      const cloudsGeo = new THREE.SphereGeometry(100.6, 64, 64);
      cloudsMesh = new THREE.Mesh(cloudsGeo, cloudsMat);
      scene.add(cloudsMesh);

      // controls
      controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.enableZoom = true;
      controls.enablePan = false;
      controls.minDistance = 220;
      controls.maxDistance = 800;
      controls.enabled = activeRef.current;

      const onResize = () => {
        if (!renderer || !camera) return;
        renderer.setSize(mount.clientWidth, mount.clientHeight);
        camera.aspect = mount.clientWidth / mount.clientHeight;
        camera.updateProjectionMatrix();
      };
      window.addEventListener("resize", onResize);

      renderer.domElement.addEventListener("pointermove", onPointerMove, {
        passive: true,
      });
      renderer.domElement.addEventListener("click", onClick);

      // initial mode
      const initialDist = getOrbitDistance();
      const initialMode: "country" | "region" =
        initialDist > 520 ? "country" : "region";
      lastMode = initialMode;
      buildMarkers(computeDisplayMarkers(initialMode));

      const EARTH_ROT = 0.00025;
      const CLOUD_ROT = 0.00035;

      let lastEmitted = getOrbitDistance();
      if (activeRef.current) onDistRef.current?.(lastEmitted);

      const worldPos = new THREE.Vector3();
      const cameraPos = new THREE.Vector3();
      const toCamera = new THREE.Vector3();
      const normal = new THREE.Vector3();

      const loop = () => {
        raf = requestAnimationFrame(loop);

        if (!renderer || !scene || !camera || !globe) return;

        controls!.enabled = activeRef.current;

        const dist = getOrbitDistance();
        const mode: "country" | "region" = dist > 520 ? "country" : "region";

        if (mode !== lastMode) {
          lastMode = mode;
          setCursor("default");
          buildMarkers(computeDisplayMarkers(mode));
        }

        if (activeRef.current) {
          globe.rotation.y += EARTH_ROT;
          if (cloudsMesh) cloudsMesh.rotation.y += CLOUD_ROT;

          controls?.update();

          if (Math.abs(dist - lastEmitted) >= 1) {
            lastEmitted = dist;
            onDistRef.current?.(dist);
          }
        }

        // marker behavior: zoom scale + hover + back fade
        camera.getWorldPosition(cameraPos);
        const zoomScale = clamp(420 / dist, 0.65, 1.6);
        const baseSize = 26;

        for (const s of markerSprites) {
          const ud = s.userData as MarkerUserData;
          ud.scaleMul = lerp(ud.scaleMul, ud.targetScaleMul, 0.18);

          const finalScale = baseSize * zoomScale * ud.scaleMul;
          s.scale.set(finalScale, finalScale, 1);

          s.getWorldPosition(worldPos);
          normal.copy(worldPos).normalize();
          toCamera.copy(cameraPos).sub(worldPos).normalize();
          const dot = normal.dot(toCamera);

          const t = smoothstep(-0.15, 0.35, dot);
          const opacity = lerp(0.28, 1.0, t);

          const mat = s.material as THREE.SpriteMaterial;
          mat.opacity = opacity;
        }

        renderer.render(scene, camera);
      };

      loop();

      return () => {
        window.removeEventListener("resize", onResize);
        renderer?.domElement.removeEventListener("pointermove", onPointerMove);
        renderer?.domElement.removeEventListener("click", onClick);
      };
    };

    let cleanup: (() => void) | null = null;

    init()
      .then((c) => {
        cleanup = c;
      })
      .catch(console.error);

    return () => {
      cancelAnimationFrame(raf);
      cleanup?.();

      if (globe) clearMarkers();

      if (cloudsMesh) {
        cloudsMesh.geometry.dispose();
        (cloudsMesh.material as THREE.Material).dispose();
        cloudsMesh = null;
      }

      controls?.dispose();
      controls = null;

      if (renderer) {
        renderer.dispose();
        if (renderer.domElement.parentNode) {
          renderer.domElement.parentNode.removeChild(renderer.domElement);
        }
      }

      globe = null;
      scene = null;
      camera = null;
      renderer = null;

      if (mount) mount.innerHTML = "";
    };
  }, [regionPoints]);

  return (
    <div className="relative w-full h-full">
      <div ref={mountRef} className="w-full h-full" />

      {selectedRegion && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
          <div
            className="w-full max-w-3xl rounded-2xl shadow-2xl border"
            style={{
              background:
                "linear-gradient(180deg, rgba(244,234,210,0.98), rgba(233,221,191,0.98))",
              borderColor: "rgba(91,90,30,0.35)",
            }}
          >
            <div
              className="flex items-start justify-between gap-3 px-6 py-5 border-b"
              style={{
                borderColor: "rgba(91,90,30,0.25)",
              }}
            >
              <div>
                <div
                  className="text-2xl font-semibold"
                  style={{
                    fontFamily: "Georgia, 'Times New Roman', serif",
                    color: "#2b1d12",
                  }}
                >
                  {selectedRegion.title}
                </div>
                <div
                  className="text-sm mt-1"
                  style={{ color: "rgba(43,29,18,0.72)" }}
                >
                  {selectedRegion.count} Nonnas • Dummy Preview
                </div>
              </div>

              <button
                onClick={() => setSelectedRegion(null)}
                className="rounded-xl px-4 py-2 text-sm font-medium border hover:opacity-90"
                style={{
                  background: "rgba(255,255,255,0.55)",
                  borderColor: "rgba(201,162,74,0.55)",
                  color: "#2b1d12",
                  fontFamily: "Georgia, 'Times New Roman', serif",
                }}
              >
                Close
              </button>
            </div>

            <div className="px-6 py-5">
              <div
                className="text-sm font-semibold mb-3"
                style={{
                  color: "#2b1d12",
                  fontFamily: "Georgia, 'Times New Roman', serif",
                }}
              >
                Nonnas in this region
              </div>

              <div
                className="max-h-[55vh] overflow-auto pr-2 space-y-3"
                style={{ scrollbarWidth: "thin" }}
              >
                {selectedRegion.nonnas.map((n) => (
                  <div
                    key={n.id}
                    className="rounded-2xl border p-4 flex items-start justify-between gap-4"
                    style={{
                      background: "rgba(255,255,255,0.55)",
                      borderColor: "rgba(91,90,30,0.25)",
                      boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
                    }}
                  >
                    <div className="min-w-0">
                      <div
                        className="text-base font-semibold"
                        style={{
                          fontFamily: "Georgia, 'Times New Roman', serif",
                          color: "#2b1d12",
                        }}
                      >
                        {n.name}{" "}
                        <span style={{ color: "rgba(43,29,18,0.65)" }}>
                          • {n.age}
                        </span>
                      </div>

                      <div
                        className="text-sm mt-1"
                        style={{ color: "rgba(43,29,18,0.72)" }}
                      >
                        {n.origin}
                      </div>

                      <div
                        className="text-sm mt-2 leading-relaxed"
                        style={{ color: "rgba(43,29,18,0.85)" }}
                      >
                        {n.tagline}
                      </div>
                    </div>

                    <button
                      className="shrink-0 rounded-xl px-4 py-2 text-sm font-semibold border hover:opacity-90"
                      style={{
                        background:
                          "linear-gradient(180deg, rgba(91,90,30,0.95), rgba(60,60,18,0.95))",
                        borderColor: "rgba(201,162,74,0.7)",
                        color: "rgba(244,234,210,0.98)",
                        fontFamily: "Georgia, 'Times New Roman', serif",
                        boxShadow: "0 8px 20px rgba(0,0,0,0.18)",
                      }}
                    >
                      View
                    </button>
                  </div>
                ))}
              </div>

              {/* <div
                className="mt-4 text-xs"
                style={{ color: "rgba(43,29,18,0.65)" }}
              >
                Tip: Zoom out for country clusters • Zoom in for region/state
                markers.
              </div> */}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
