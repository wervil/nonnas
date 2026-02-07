"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";

// ---------- Global guard (optional) ----------
let activeGlobeInstances = 0;
const MAX_ALLOWED_INSTANCES = 1;

// ---------- Types ----------
type LatLng = { lat: number; lng: number };

type GeoFeature = {
  type: "Feature";
  properties: { CONTINENT?: string;[k: string]: unknown };
  geometry: {
    type: "Polygon" | "MultiPolygon";
    coordinates: number[][][] | number[][][][];
  };
};
type GeoFC = { type: "FeatureCollection"; features: GeoFeature[] };

type ThreeGlobeInstance = THREE.Object3D & {
  globeImageUrl: (url: string) => ThreeGlobeInstance;
  showAtmosphere: (v: boolean) => ThreeGlobeInstance;
  atmosphereColor: (c: string) => ThreeGlobeInstance;
  atmosphereAltitude: (a: number) => ThreeGlobeInstance;
  polygonsData: (data: object[]) => ThreeGlobeInstance;
  polygonAltitude: (alt: number | ((d: object) => number)) => ThreeGlobeInstance;
  polygonStrokeColor: (fn: (d: object) => string) => ThreeGlobeInstance;
  polygonSideColor: (fn: (d: object) => string) => ThreeGlobeInstance;
  polygonCapColor: (fn: (d: object) => string) => ThreeGlobeInstance;
  polygonsTransitionDuration: (ms: number) => ThreeGlobeInstance;
};

// ---------- Constants ----------
const GLOBE_RADIUS = 40;
const CAMERA_DISTANCE = 290;
const ROTATION_SENSITIVITY = 0.004;
const MAX_TILT = 1.2;

const HIGHLIGHT_COLOR = "rgba(255, 255, 255, 0.35)";
const BORDER_COLOR = "rgba(255, 255, 255, 0.15)";
const DARK_BG_COLOR = 0x0a0a0a;
const TRANSPARENT = "rgba(0, 0, 0, 0)";

// Map country/admin names to region/sub-region labels
const COUNTRY_TO_REGION: Record<string, string> = {
  Russia: "Russia",
  "Russian Federation": "Russia",

  "Saudi Arabia": "Middle East",
  "United Arab Emirates": "Middle East",
  Iran: "Middle East",
  Iraq: "Middle East",
  Israel: "Middle East",
  Jordan: "Middle East",
  Lebanon: "Middle East",
  Syria: "Middle East",
  Yemen: "Middle East",
  Oman: "Middle East",
  Qatar: "Middle East",
  Bahrain: "Middle East",
  Kuwait: "Middle East",
  Turkey: "Middle East",
  Cyprus: "Middle East",

  Egypt: "Africa",

  India: "South Asia",
  Pakistan: "South Asia",
  Bangladesh: "South Asia",
  "Sri Lanka": "South Asia",
  Nepal: "South Asia",
  Bhutan: "South Asia",
  Maldives: "South Asia",
  Afghanistan: "South Asia",

  China: "East Asia",
  Japan: "East Asia",
  "South Korea": "East Asia",
  "North Korea": "East Asia",
  Mongolia: "East Asia",
  Taiwan: "East Asia",
  "Republic of Korea": "East Asia",
  "Dem. Rep. Korea": "East Asia",

  Thailand: "Southeast Asia",
  Vietnam: "Southeast Asia",
  Indonesia: "Southeast Asia",
  Philippines: "Southeast Asia",
  Malaysia: "Southeast Asia",
  Singapore: "Southeast Asia",
  Myanmar: "Southeast Asia",
  Cambodia: "Southeast Asia",
  Laos: "Southeast Asia",
  Brunei: "Southeast Asia",
  "Timor-Leste": "Southeast Asia",
  "East Timor": "Southeast Asia",

  Kazakhstan: "Central Asia",
  Uzbekistan: "Central Asia",
  Turkmenistan: "Central Asia",
  Kyrgyzstan: "Central Asia",
  Tajikistan: "Central Asia",

  Fiji: "Pacific Islands",
  "Papua New Guinea": "Pacific Islands",
  Samoa: "Pacific Islands",
  Tonga: "Pacific Islands",
  Vanuatu: "Pacific Islands",
  "Solomon Islands": "Pacific Islands",
  "New Zealand": "Pacific Islands",
  Micronesia: "Pacific Islands",

  Georgia: "Middle East",
  Armenia: "Middle East",
  Azerbaijan: "Middle East",
};

// Approximate center points for continents (lat, lng) to auto-rotate
const CONTINENT_CENTERS: Record<string, { lat: number; lng: number }> = {
  "Africa": { lat: 0, lng: 20 },
  "Asia": { lat: 35, lng: 90 },
  "Europe": { lat: 48, lng: 15 },
  "North America": { lat: 45, lng: -100 },
  "South America": { lat: -15, lng: -60 },
  "Oceania": { lat: -25, lng: 135 },
  "Pacific Islands": { lat: -10, lng: 160 },
  "Antarctica": { lat: -65, lng: 0 },
  "Middle East": { lat: 25, lng: 45 },
  "Southeast Asia": { lat: 0, lng: 115 },
  "East Asia": { lat: 35, lng: 110 },
  "South Asia": { lat: 22, lng: 78 },
  "Central Asia": { lat: 45, lng: 65 },
  "Russia": { lat: 60, lng: 90 },
};

// ---------- Helpers ----------
function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function normalizeLng(lng: number) {
  return ((((lng % 360) + 540) % 360) - 180);
}

function createRingTextTexture(text: string, fontSize = 64): THREE.Texture {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get 2D context");

  ctx.font = `bold ${fontSize}px "Aharoni", sans-serif`;
  const metrics = ctx.measureText(text);
  const textWidth = metrics.width;
  const textHeight = fontSize * 1.3;

  canvas.width = Math.ceil(textWidth + 30);
  canvas.height = Math.ceil(textHeight + 20);

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = `bold ${fontSize}px "Aharoni", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#e8d5b7";
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;

  return texture;
}

// GeoJSON point-in-polygon helpers (lon=x, lat=y)
function pointInRing(p: LatLng, ring: number[][]) {
  let inside = false;
  const x = p.lng;
  const y = p.lat;

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];

    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function pointInPolygon(p: LatLng, coords: number[][][]) {
  if (coords.length === 0) return false;
  if (!pointInRing(p, coords[0])) return false;
  for (let i = 1; i < coords.length; i++) {
    if (pointInRing(p, coords[i])) return false;
  }
  return true;
}

function pointInFeature(p: LatLng, f: GeoFeature) {
  if (f.geometry.type === "Polygon") {
    return pointInPolygon(p, f.geometry.coordinates as number[][][]);
  }
  const mp = f.geometry.coordinates as number[][][][];
  for (const poly of mp) if (pointInPolygon(p, poly)) return true;
  return false;
}

function disposeMaterial(mat: THREE.Material) {
  const rec = mat as unknown as Record<string, unknown>;
  for (const v of Object.values(rec)) {
    if (v instanceof THREE.Texture) v.dispose();
  }
  mat.dispose();
}

function deepDisposeScene(scene: THREE.Scene) {
  scene.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      if (obj.geometry) obj.geometry.dispose();
      const mat = obj.material;
      if (Array.isArray(mat)) mat.forEach(disposeMaterial);
      else if (mat) disposeMaterial(mat);
    }
    if (obj instanceof THREE.Sprite) {
      const mat = obj.material;
      if (mat.map) mat.map.dispose();
      mat.dispose();
    }
  });
  scene.clear();
}

// ---------- Component ----------
export default function NaturalStyledGlobe({
  active = true,
  onContinentClick,
  initialFocusedContinent,
}: {
  active?: boolean;
  onContinentClick: (continent: string) => void;
  initialFocusedContinent?: string | null;
}) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  const activeRef = useRef(active);
  const onClickRef = useRef(onContinentClick);

  const [geoStatus, setGeoStatus] = useState<"loading" | "ok" | "fail">("loading");
  const [hoveredContinent, setHoveredContinent] = useState<string | null>(null);
  const [webglError, setWebglError] = useState<string | null>(null);
  const [canvasOpacity, setCanvasOpacity] = useState(0);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const globeRef = useRef<ThreeGlobeInstance | null>(null);
  const geoRef = useRef<GeoFC | null>(null);

  const ringGroupRef = useRef<THREE.Group | null>(null);

  const isDraggingRef = useRef(false);
  const hasDraggedRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });

  const rotationRef = useRef({ x: 0.66, y: 1.7 });
  const targetRotationRef = useRef({ x: 0.66, y: 1.7 });
  const currentHoverRef = useRef<string | null>(null);

  const rafRef = useRef<number>(0);

  // Keep a cleanup registry for listeners (prevents “ghosting”)
  const cleanupFnsRef = useRef<Array<() => void>>([]);

  // A token to ignore stale async init (StrictMode / rapid remount)
  const initTokenRef = useRef(0);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    onClickRef.current = onContinentClick;
  }, [onContinentClick]);

  // Handle initial rotation if a continent was previously viewed
  useEffect(() => {
    if (!initialFocusedContinent) return;

    // Resolve center
    let center = CONTINENT_CENTERS[initialFocusedContinent];
    if (!center && COUNTRY_TO_REGION[initialFocusedContinent]) {
      center = CONTINENT_CENTERS[COUNTRY_TO_REGION[initialFocusedContinent]];
    }

    if (center) {
      // Convert lat/lng to rotation angles
      // Y rotation moves longitude: -lng * (PI/180) - PI/2
      // X rotation moves latitude: lat * (PI/180)

      const latRad = center.lat * (Math.PI / 180);
      const lngRad = center.lng * (Math.PI / 180);

      const targetX = latRad;
      const targetY = -lngRad;

      // Snap instantly to this rotation
      rotationRef.current = { x: targetX, y: targetY };
      targetRotationRef.current = { x: targetX, y: targetY };
    }
  }, [initialFocusedContinent]);

  // Load GeoJSON once
  useEffect(() => {
    let cancelled = false;

    fetch("/geo/ne_admin0_countries.geojson")
      .then((r) => {
        if (!r.ok) throw new Error(`GeoJSON not found: ${r.status}`);
        return r.json() as Promise<GeoFC>;
      })
      .then((d) => {
        if (cancelled) return;
        geoRef.current = d;
        setGeoStatus("ok");
      })
      .catch((e) => {
        console.error(e);
        if (cancelled) return;
        setGeoStatus("fail");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const getAsiaSubRegion = useCallback(
    (countryName: string | undefined, lat: number, lng: number): string => {
      if (countryName && COUNTRY_TO_REGION[countryName]) return COUNTRY_TO_REGION[countryName];

      if (lat >= 12 && lat <= 45 && lng >= 25 && lng <= 65) return "Middle East";
      if (lat >= 5 && lat <= 38 && lng >= 65 && lng <= 95) return "South Asia";
      if (lat >= -12 && lat <= 25 && lng >= 95 && lng <= 145) return "Southeast Asia";
      if (lat >= 35 && lat <= 55 && lng >= 45 && lng <= 90) return "Central Asia";
      if (lat >= 18 && lat <= 55 && lng >= 100 && lng <= 150) return "East Asia";

      return "East Asia";
    },
    []
  );

  const findContinentAtLatLng = useCallback(
    (lat: number, lng: number): string | null => {
      const geo = geoRef.current;
      if (!geo) return null;

      for (const f of geo.features) {
        const cont = f.properties?.CONTINENT as string | undefined;
        if (!cont) continue;

        if (pointInFeature({ lat, lng }, f)) {
          const countryName = f.properties?.NAME as string | undefined;
          const adminName = f.properties?.ADMIN as string | undefined;

          if (countryName && COUNTRY_TO_REGION[countryName]) return COUNTRY_TO_REGION[countryName];
          if (adminName && COUNTRY_TO_REGION[adminName]) return COUNTRY_TO_REGION[adminName];

          if (cont === "Asia") return getAsiaSubRegion(countryName, lat, lng);

          if (cont === "Oceania") {
            if (countryName && COUNTRY_TO_REGION[countryName] === "Pacific Islands") return "Pacific Islands";
            if (lng > 150 || lng < -150) return "Pacific Islands";
          }

          return cont;
        }
      }
      return null;
    },
    [getAsiaSubRegion]
  );

  const worldToLatLng = useCallback((point: THREE.Vector3): LatLng => {
    const r = point.length();
    if (r === 0) return { lat: 0, lng: 0 };

    const lat = (Math.asin(clamp(point.y / r, -1, 1)) * 180) / Math.PI;
    const lng = normalizeLng((Math.atan2(-point.z, point.x) * 180) / Math.PI);
    return { lat, lng };
  }, []);

  // ✅ FIXED: no TS "never" issue, and worldToLocal is safe
  const raycastContinent = useCallback(
    (clientX: number, clientY: number): { continent: string | null; point: THREE.Vector3 | null } => {
      const renderer = rendererRef.current;
      const camera = cameraRef.current;
      const globe = globeRef.current;

      if (!renderer || !camera || !globe) return { continent: null, point: null };

      const rect = renderer.domElement.getBoundingClientRect();
      const mouseNdc = new THREE.Vector2(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -(((clientY - rect.top) / rect.height) * 2 - 1)
      );

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouseNdc, camera);

      // Find the largest sphere mesh inside ThreeGlobe
      let best: THREE.Mesh<THREE.SphereGeometry, THREE.Material | THREE.Material[]> | null = null;

      globe.traverse((obj) => {
        if (obj instanceof THREE.Mesh && obj.geometry instanceof THREE.SphereGeometry) {
          const mesh = obj as THREE.Mesh<THREE.SphereGeometry, THREE.Material | THREE.Material[]>;
          if (!best || mesh.geometry.parameters.radius > best.geometry.parameters.radius) {
            best = mesh;
          }
        }
      });

      if (!best) return { continent: null, point: null };

      const intersects = raycaster.intersectObject(best, false);
      if (intersects.length === 0) return { continent: null, point: null };

      const hit = intersects[0];

      // Convert to local space for lat/lng calc
      const localPoint = hit.point.clone();
      (best as THREE.Mesh).worldToLocal(localPoint);

      const { lat, lng } = worldToLatLng(localPoint);
      const continent = findContinentAtLatLng(lat, lng);

      return { continent, point: hit.point };
    },
    [findContinentAtLatLng, worldToLatLng]
  );

  const getFeatureRegion = useCallback(
    (f: GeoFeature): string | null => {
      const cont = f.properties?.CONTINENT as string | undefined;
      if (!cont) return null;

      const countryName = f.properties?.NAME as string | undefined;
      const adminName = f.properties?.ADMIN as string | undefined;

      if (countryName && COUNTRY_TO_REGION[countryName]) return COUNTRY_TO_REGION[countryName];
      if (adminName && COUNTRY_TO_REGION[adminName]) return COUNTRY_TO_REGION[adminName];

      if (cont === "Asia") {
        const coords = (f.geometry.type === "Polygon"
          ? (f.geometry.coordinates as number[][][])[0]
          : (f.geometry.coordinates as number[][][][])[0]?.[0]) as number[][] | undefined;

        if (coords && coords.length > 0) {
          const avgLng = coords.reduce((sum, c) => sum + c[0], 0) / coords.length;
          const avgLat = coords.reduce((sum, c) => sum + c[1], 0) / coords.length;
          return getAsiaSubRegion(countryName, avgLat, avgLng);
        }
      }

      if (cont === "Oceania") {
        if (countryName && COUNTRY_TO_REGION[countryName] === "Pacific Islands") return "Pacific Islands";
      }

      return cont;
    },
    [getAsiaSubRegion]
  );

  const highlightedRegionRef = useRef<string | null>(null);

  const updatePolygonColors = useCallback(
    (highlightedRegion: string | null) => {
      const globe = globeRef.current;
      const geo = geoRef.current;
      if (!globe || !geo) return;

      highlightedRegionRef.current = highlightedRegion;

      globe.polygonCapColor((obj: object) => {
        const currentHighlight = highlightedRegionRef.current;
        if (!currentHighlight) return TRANSPARENT;

        const f = obj as GeoFeature;
        const region = getFeatureRegion(f);
        return region === currentHighlight ? HIGHLIGHT_COLOR : TRANSPARENT;
      });

      globe.polygonsData(geo.features as object[]);
    },
    [getFeatureRegion]
  );

  // ---------- Single cleanup function to prevent “ghosting” ----------
  const fullCleanup = useCallback(() => {
    // stop RAF
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }

    // remove listeners
    cleanupFnsRef.current.forEach((fn) => {
      try {
        fn();
      } catch { }
    });
    cleanupFnsRef.current = [];

    // dispose scene
    if (sceneRef.current) {
      deepDisposeScene(sceneRef.current);
      sceneRef.current = null;
    }

    // dispose renderer + force lose context
    if (rendererRef.current) {
      try {
        const gl = rendererRef.current.getContext();
        const lose = gl?.getExtension("WEBGL_lose_context");
        lose?.loseContext();
      } catch { }

      try {
        rendererRef.current.dispose();
        rendererRef.current.forceContextLoss();
      } catch { }

      rendererRef.current = null;
    }

    cameraRef.current = null;
    globeRef.current = null;
    ringGroupRef.current = null;
    currentHoverRef.current = null;

    // clear hover UI
    setHoveredContinent(null);

    // clear DOM
    if (mountRef.current) mountRef.current.innerHTML = "";
  }, []);

  // ---------- Main init effect ----------
  useEffect(() => {
    if (!active) {
      fullCleanup();
      return;
    }

    const mount = mountRef.current;
    if (!mount) return;

    const token = ++initTokenRef.current;
    let cancelled = false;

    // Guard: global instance limit
    if (activeGlobeInstances >= MAX_ALLOWED_INSTANCES) {
      setWebglError("Another globe instance is active. Close other globe tabs and refresh.");
      return;
    }

    activeGlobeInstances++;
    setWebglError(null);

    const addCleanup = (fn: () => void) => {
      cleanupFnsRef.current.push(fn);
    };

    const init = async () => {
      try {
        if (!("WebGLRenderingContext" in window)) {
          setWebglError("Your browser does not support WebGL.");
          return;
        }

        if (cancelled || token !== initTokenRef.current) return;

        const mod = await import("three-globe");
        const ThreeGlobe = mod.default as unknown as new () => ThreeGlobeInstance;

        if (cancelled || token !== initTokenRef.current) return;

        mount.innerHTML = "";

        // Scene
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(DARK_BG_COLOR);
        sceneRef.current = scene;

        // Camera
        const camera = new THREE.PerspectiveCamera(54, mount.clientWidth / mount.clientHeight, 1, 2000);
        camera.position.set(0, 0, CAMERA_DISTANCE);
        camera.lookAt(0, 0, 0);
        cameraRef.current = camera;

        // Lights
        scene.add(new THREE.AmbientLight(0xffffff, 0.8));

        const directional = new THREE.DirectionalLight(0xffffff, 1.5);
        directional.position.set(-200, 150, 400);
        scene.add(directional);

        const fill = new THREE.DirectionalLight(0xffffff, 0.4);
        fill.position.set(200, -100, -200);
        scene.add(fill);

        const back = new THREE.DirectionalLight(0xffffff, 0.3);
        back.position.set(0, -200, -300);
        scene.add(back);

        // Renderer
        const renderer = new THREE.WebGLRenderer({
          antialias: true,
          alpha: false,
          powerPreference: "high-performance",
          failIfMajorPerformanceCaveat: false,
        });

        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(mount.clientWidth, mount.clientHeight);
        renderer.outputColorSpace = THREE.SRGBColorSpace;

        mount.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        // WebGL context lost handler => FULL CLEANUP to prevent ghosting
        const canvas = renderer.domElement;

        const handleContextLost = (event: Event) => {
          event.preventDefault();
          console.warn("WebGL context lost - full cleanup");
          fullCleanup();
          setWebglError("Graphics context lost. Refresh the page.");
        };

        canvas.addEventListener("webglcontextlost", handleContextLost, false);
        addCleanup(() => canvas.removeEventListener("webglcontextlost", handleContextLost));

        // Globe
        const globe = new ThreeGlobe()
          .globeImageUrl("/textures/earth_day_clouds.jpg")
          .showAtmosphere(true)
          .atmosphereColor("#4a9eff")
          .atmosphereAltitude(0.15);

        scene.add(globe);
        globeRef.current = globe;

        // Ring
        const ringGroup = new THREE.Group();
        const ringRadius = GLOBE_RADIUS + 80;
        const ringText = "NONNAS OF THE WORLD ";
        const totalChars = ringText.length;

        for (let i = 0; i < totalChars; i++) {
          const char = ringText[i];
          if (char === " ") continue;

          const angle = (i / totalChars) * Math.PI * 2;
          const texture = createRingTextTexture(char, 80);

          const geometry = new THREE.PlaneGeometry(24, 32);
          const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            side: THREE.DoubleSide,
            depthTest: true,
            depthWrite: false,
          });

          const letterMesh = new THREE.Mesh(geometry, material);
          letterMesh.position.x = ringRadius * Math.sin(angle);
          letterMesh.position.y = ringRadius * Math.cos(angle);
          letterMesh.position.z = 5;
          letterMesh.rotation.z = -angle;

          ringGroup.add(letterMesh);
        }

        scene.add(ringGroup);
        ringGroupRef.current = ringGroup;

        globe.rotation.x = rotationRef.current.x;
        globe.rotation.y = rotationRef.current.y;

        // Fade in canvas after a short delay to ensure initial frame is ready
        setTimeout(() => {
          if (!cancelled && token === initTokenRef.current) {
            setCanvasOpacity(1);
          }
        }, 150);

        // Apply polygons when geo is ready
        const applyGeo = () => {
          if (cancelled || token !== initTokenRef.current) return;
          const geo = geoRef.current;
          if (!geo) {
            setTimeout(applyGeo, 100);
            return;
          }

          globe
            .polygonsData(geo.features as object[])
            .polygonAltitude(0.008)
            .polygonStrokeColor(() => BORDER_COLOR)
            .polygonSideColor(() => "rgba(0,0,0,0)")
            .polygonsTransitionDuration(200);

          updatePolygonColors(null);
        };
        applyGeo();

        // Animation
        const animate = () => {
          if (cancelled || token !== initTokenRef.current) return;
          rafRef.current = requestAnimationFrame(animate);

          if (!isDraggingRef.current && activeRef.current) {
            targetRotationRef.current.y += 0.001;
          }

          const lerp = 0.08;
          rotationRef.current.x += (targetRotationRef.current.x - rotationRef.current.x) * lerp;
          rotationRef.current.y += (targetRotationRef.current.y - rotationRef.current.y) * lerp;

          globe.rotation.x = rotationRef.current.x;
          globe.rotation.y = rotationRef.current.y;

          if (ringGroupRef.current) ringGroupRef.current.rotation.z += 0.001;

          renderer.render(scene, camera);
        };
        animate();

        // Events
        const onPointerDown = (e: PointerEvent) => {
          if (!activeRef.current) return;
          isDraggingRef.current = true;
          hasDraggedRef.current = false;
          lastMouseRef.current = { x: e.clientX, y: e.clientY };
          try {
            renderer.domElement.setPointerCapture(e.pointerId);
          } catch { }
        };

        const onPointerMove = (e: PointerEvent) => {
          if (!activeRef.current) return;

          if (isDraggingRef.current) {
            const dx = e.clientX - lastMouseRef.current.x;
            const dy = e.clientY - lastMouseRef.current.y;

            if (Math.abs(dx) > 2 || Math.abs(dy) > 2) hasDraggedRef.current = true;

            targetRotationRef.current.y += dx * ROTATION_SENSITIVITY;
            targetRotationRef.current.x += dy * ROTATION_SENSITIVITY;
            targetRotationRef.current.x = clamp(targetRotationRef.current.x, -MAX_TILT, MAX_TILT);

            lastMouseRef.current = { x: e.clientX, y: e.clientY };

            currentHoverRef.current = null;
            setHoveredContinent(null);
          } else {
            const { continent } = raycastContinent(e.clientX, e.clientY);
            if (continent !== currentHoverRef.current) {
              currentHoverRef.current = continent;
              setHoveredContinent(continent);
              updatePolygonColors(continent);
            }
          }
        };

        const onPointerUp = (e: PointerEvent) => {
          if (!isDraggingRef.current) return;
          isDraggingRef.current = false;

          try {
            renderer.domElement.releasePointerCapture(e.pointerId);
          } catch { }

          if (!hasDraggedRef.current && activeRef.current) {
            const { continent } = raycastContinent(e.clientX, e.clientY);
            if (continent) onClickRef.current(continent);
          }
        };

        const onPointerLeave = () => {
          currentHoverRef.current = null;
          setHoveredContinent(null);
          updatePolygonColors(null);
        };

        const onWheel = (e: WheelEvent) => {
          if (!activeRef.current) return;
          e.preventDefault();
          e.stopPropagation();
          targetRotationRef.current.y += e.deltaY * 0.002;
        };

        const onResize = () => {
          if (!cameraRef.current || !rendererRef.current || !mountRef.current) return;
          const w = mountRef.current.clientWidth;
          const h = mountRef.current.clientHeight;
          cameraRef.current.aspect = w / h;
          cameraRef.current.updateProjectionMatrix();
          rendererRef.current.setSize(w, h);
        };

        renderer.domElement.addEventListener("pointerdown", onPointerDown);
        renderer.domElement.addEventListener("pointermove", onPointerMove);
        renderer.domElement.addEventListener("pointerup", onPointerUp);
        renderer.domElement.addEventListener("pointerleave", onPointerLeave);
        renderer.domElement.addEventListener("wheel", onWheel, { passive: false });
        window.addEventListener("resize", onResize);

        addCleanup(() => renderer.domElement.removeEventListener("pointerdown", onPointerDown));
        addCleanup(() => renderer.domElement.removeEventListener("pointermove", onPointerMove));
        addCleanup(() => renderer.domElement.removeEventListener("pointerup", onPointerUp));
        addCleanup(() => renderer.domElement.removeEventListener("pointerleave", onPointerLeave));
        addCleanup(() => renderer.domElement.removeEventListener("wheel", onWheel));
        addCleanup(() => window.removeEventListener("resize", onResize));
      } catch (err) {
        console.error("Globe init error:", err);
        setWebglError("Failed to initialize globe. Refresh the page.");
      }
    };

    void init();

    return () => {
      cancelled = true;

      if (activeGlobeInstances > 0) activeGlobeInstances--;

      fullCleanup();
    };
  }, [active, fullCleanup, raycastContinent, updatePolygonColors]);

  if (webglError) {
    return (
      <div className="w-full h-full relative flex items-center justify-center" style={{ background: "#0a0a0a" }}>
        <div className="text-center p-8 bg-black/80 backdrop-blur-sm rounded-lg border border-red-500/30 max-w-lg">
          <div className="text-red-400 text-xl font-bold mb-4">⚠️ Graphics Error</div>
          <p className="text-gray-300 mb-6">{webglError}</p>

          <div className="text-left text-sm text-gray-400 mb-6 bg-black/40 p-4 rounded">
            <p className="font-semibold mb-3 text-amber-400">Try these steps:</p>
            <ol className="list-decimal list-inside space-y-2">
              <li>
                <span className="font-medium">Enable Hardware Acceleration:</span>
                <br />
                <code className="text-xs bg-gray-800 px-2 py-1 rounded mt-1 inline-block">
                  chrome://settings/system
                </code>
                <br />
                <span className="text-xs">Turn ON &quot;Use hardware acceleration when available&quot;</span>
              </li>
              <li>
                <span className="font-medium">Force Enable WebGL:</span>
                <br />
                <code className="text-xs bg-gray-800 px-2 py-1 rounded mt-1 inline-block">
                  chrome://flags/#ignore-gpu-blocklist
                </code>
                <br />
                <span className="text-xs">Set to &quot;Enabled&quot; and restart Chrome</span>
              </li>
              <li>
                <span className="font-medium">Update Chrome</span> to the latest version
              </li>
              <li>
                <span className="font-medium">Try Safari</span> - this feature works there!
              </li>
            </ol>
          </div>

          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors font-medium"
          >
            Refresh Page or try reopening the browser
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative" style={{ background: "#0a0a0a" }}>
      {geoStatus !== "ok" && (
        <div className="absolute bottom-4 left-4 z-10 bg-black/80 backdrop-blur-sm rounded-lg px-3 py-2 shadow-md border border-gray-700">
          <div className="text-xs text-gray-400">
            Data:{" "}
            <span className={geoStatus === "fail" ? "text-red-400" : "text-amber-400"}>
              {geoStatus}
            </span>
          </div>
        </div>
      )}

      {hoveredContinent && (
        <div className="absolute top-[-15px] left-0 right-0 flex justify-center z-10 pointer-events-none">
          <h2
            className="text-2xl md:text-3xl font-bold tracking-wide text-amber-400"
            style={{
              fontFamily: "'Bell', serif",
              textShadow: "0 0 20px rgba(0,0,0,0.8), 0 0 40px rgba(0,0,0,0.6)",
            }}
          >
            Click to explore {hoveredContinent}
          </h2>
        </div>
      )}

      <div
        ref={mountRef}
        className="w-full h-full mt-8 transition-opacity duration-1000 ease-in-out"
        style={{
          cursor: hoveredContinent ? "pointer" : "grab",
          opacity: canvasOpacity
        }}
      />
    </div>
  );
}
