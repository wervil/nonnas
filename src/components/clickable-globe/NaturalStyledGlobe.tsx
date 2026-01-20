"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";

// Global WebGL context tracker to prevent exceeding browser limits
let activeGlobeInstances = 0;
const MAX_ALLOWED_INSTANCES = 1; // Only allow 1 globe instance at a time

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

// Constants for consistent behavior
const GLOBE_RADIUS = 40;
const CAMERA_DISTANCE = 320;
const ROTATION_SENSITIVITY = 0.004;
const MAX_TILT = 1.2;
const HIGHLIGHT_COLOR = "rgba(255, 255, 255, 0.35)";
const BORDER_COLOR = "rgba(255, 255, 255, 0.15)";
const DARK_BG_COLOR = 0x0a0a0a;
const TRANSPARENT = "rgba(0, 0, 0, 0)";

// Map country to sub-region for Asia breakdown and GeoJSON corrections
const COUNTRY_TO_REGION: Record<string, string> = {
  "Russia": "Russia",
  "Russian Federation": "Russia",
  "Saudi Arabia": "Middle East", "United Arab Emirates": "Middle East", "Iran": "Middle East",
  "Iraq": "Middle East", "Israel": "Middle East", "Jordan": "Middle East", "Lebanon": "Middle East",
  "Syria": "Middle East", "Yemen": "Middle East", "Oman": "Middle East", "Qatar": "Middle East",
  "Bahrain": "Middle East", "Kuwait": "Middle East", "Turkey": "Middle East", "Cyprus": "Middle East",
  "Egypt": "Africa",
  "India": "South Asia", "Pakistan": "South Asia", "Bangladesh": "South Asia",
  "Sri Lanka": "South Asia", "Nepal": "South Asia", "Bhutan": "South Asia",
  "Maldives": "South Asia", "Afghanistan": "South Asia",
  "China": "East Asia", "Japan": "East Asia", "South Korea": "East Asia",
  "North Korea": "East Asia", "Mongolia": "East Asia", "Taiwan": "East Asia",
  "Republic of Korea": "East Asia", "Dem. Rep. Korea": "East Asia",
  "Thailand": "Southeast Asia", "Vietnam": "Southeast Asia", "Indonesia": "Southeast Asia",
  "Philippines": "Southeast Asia", "Malaysia": "Southeast Asia", "Singapore": "Southeast Asia",
  "Myanmar": "Southeast Asia", "Cambodia": "Southeast Asia", "Laos": "Southeast Asia",
  "Brunei": "Southeast Asia", "Timor-Leste": "Southeast Asia", "East Timor": "Southeast Asia",
  "Kazakhstan": "Central Asia", "Uzbekistan": "Central Asia", "Turkmenistan": "Central Asia",
  "Kyrgyzstan": "Central Asia", "Tajikistan": "Central Asia",
  "Fiji": "Pacific Islands", "Papua New Guinea": "Pacific Islands", "Samoa": "Pacific Islands",
  "Tonga": "Pacific Islands", "Vanuatu": "Pacific Islands", "Solomon Islands": "Pacific Islands",
  "New Zealand": "Pacific Islands", "Micronesia": "Pacific Islands",
  "Georgia": "Middle East", "Armenia": "Middle East", "Azerbaijan": "Middle East",
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function normalizeLng(lng: number) {
  return ((((lng % 360) + 540) % 360) - 180);
}

function createRingTextTexture(text: string, fontSize: number = 64): THREE.Texture {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not get 2D context");

  context.font = `bold ${fontSize}px "Aharoni", "Arial Black", sans-serif`;
  const metrics = context.measureText(text);
  const textWidth = metrics.width;
  const textHeight = fontSize * 1.3;

  canvas.width = Math.ceil(textWidth + 30);
  canvas.height = Math.ceil(textHeight + 20);

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.font = `bold ${fontSize}px "Aharoni", "Arial Black", sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = "#e8d5b7";
  context.fillText(text, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;

  return texture;
}

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
    if (obj instanceof THREE.Group) {
      [...obj.children].forEach(child => {
        if (child instanceof THREE.Mesh || child instanceof THREE.Sprite) {
          obj.remove(child);
        }
      });
    }
  });
  scene.clear();
}

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

export default function NaturalStyledGlobe({
  active = true,
  onContinentClick,
}: {
  active?: boolean;
  onContinentClick: (continent: string) => void;
}) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const activeRef = useRef(active);
  const onClickRef = useRef(onContinentClick);

  const [geoStatus, setGeoStatus] = useState<"loading" | "ok" | "fail">("loading");
  const [hoveredContinent, setHoveredContinent] = useState<string | null>(null);
  const [webglError, setWebglError] = useState<string | null>(null);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const globeRef = useRef<ThreeGlobeInstance | null>(null);
  const geoRef = useRef<GeoFC | null>(null);
  const labelSpritesRef = useRef<THREE.Sprite[]>([]);
  const ringGroupRef = useRef<THREE.Group | null>(null);

  const isDraggingRef = useRef(false);
  const hasDraggedRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const rotationRef = useRef({ x: 0.1, y: 0 });
  const targetRotationRef = useRef({ x: 0.1, y: 0 });
  const currentHoverRef = useRef<string | null>(null);

  const rafRef = useRef<number>(0);
  const isInitializedRef = useRef(false);
  const cleanupFunctionsRef = useRef<Array<() => void>>([]);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    onClickRef.current = onContinentClick;
  }, [onContinentClick]);

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
    return () => { cancelled = true; };
  }, []);

  const getAsiaSubRegion = useCallback((countryName: string | undefined, lat: number, lng: number): string => {
    if (countryName && COUNTRY_TO_REGION[countryName]) {
      return COUNTRY_TO_REGION[countryName];
    }

    if (lat >= 12 && lat <= 45 && lng >= 25 && lng <= 65) return "Middle East";
    if (lat >= 5 && lat <= 38 && lng >= 65 && lng <= 95) return "South Asia";
    if (lat >= -12 && lat <= 25 && lng >= 95 && lng <= 145) return "Southeast Asia";
    if (lat >= 35 && lat <= 55 && lng >= 45 && lng <= 90) return "Central Asia";
    if (lat >= 18 && lat <= 55 && lng >= 100 && lng <= 150) return "East Asia";

    return "East Asia";
  }, []);

  const findContinentAtLatLng = useCallback((lat: number, lng: number): string | null => {
    const geo = geoRef.current;
    if (!geo) return null;

    for (const f of geo.features) {
      const cont = f.properties?.CONTINENT as string | undefined;
      if (!cont) continue;

      if (pointInFeature({ lat, lng }, f)) {
        const countryName = f.properties?.NAME as string | undefined;
        const adminName = f.properties?.ADMIN as string | undefined;

        if (countryName && COUNTRY_TO_REGION[countryName]) {
          return COUNTRY_TO_REGION[countryName];
        }
        if (adminName && COUNTRY_TO_REGION[adminName]) {
          return COUNTRY_TO_REGION[adminName];
        }

        if (cont === "Asia") {
          return getAsiaSubRegion(countryName, lat, lng);
        }

        if (cont === "Oceania") {
          if (countryName && COUNTRY_TO_REGION[countryName] === "Pacific Islands") {
            return "Pacific Islands";
          }
          if (lng > 150 || lng < -150) {
            return "Pacific Islands";
          }
        }

        return cont;
      }
    }
    return null;
  }, [getAsiaSubRegion]);

  const worldToLatLng = useCallback((point: THREE.Vector3): LatLng => {
    const r = point.length();
    if (r === 0) return { lat: 0, lng: 0 };

    const lat = (Math.asin(clamp(point.y / r, -1, 1)) * 180) / Math.PI;
    const lng = normalizeLng((Math.atan2(-point.z, point.x) * 180) / Math.PI);
    return { lat, lng };
  }, []);

  const raycastContinent = useCallback((clientX: number, clientY: number): { continent: string | null; point: THREE.Vector3 | null } => {
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

    let globeSphere: THREE.Mesh | null = null;
    globe.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj.geometry instanceof THREE.SphereGeometry) {
        if (!globeSphere || obj.geometry.parameters.radius > (globeSphere.geometry as THREE.SphereGeometry).parameters.radius) {
          globeSphere = obj;
        }
      }
    });

    if (!globeSphere) return { continent: null, point: null };

    const sphere = globeSphere as THREE.Mesh;
    const intersects = raycaster.intersectObject(sphere, false);
    if (intersects.length === 0) return { continent: null, point: null };

    const hit = intersects[0];
    const localPoint = hit.point.clone();
    sphere.worldToLocal(localPoint);

    const { lat, lng } = worldToLatLng(localPoint);
    const continent = findContinentAtLatLng(lat, lng);

    return { continent, point: hit.point };
  }, [worldToLatLng, findContinentAtLatLng]);

  const getFeatureRegion = useCallback((f: GeoFeature): string | null => {
    const cont = f.properties?.CONTINENT as string | undefined;
    if (!cont) return null;

    const countryName = f.properties?.NAME as string | undefined;
    const adminName = f.properties?.ADMIN as string | undefined;

    if (countryName && COUNTRY_TO_REGION[countryName]) {
      return COUNTRY_TO_REGION[countryName];
    }
    if (adminName && COUNTRY_TO_REGION[adminName]) {
      return COUNTRY_TO_REGION[adminName];
    }

    if (cont === "Asia") {
      const coords = (f.geometry.type === "Polygon"
        ? f.geometry.coordinates[0]
        : f.geometry.coordinates[0]?.[0]) as number[][] | undefined;
      if (coords && coords.length > 0) {
        const avgLng = coords.reduce((sum, c) => sum + (c[0] as number), 0) / coords.length;
        const avgLat = coords.reduce((sum, c) => sum + (c[1] as number), 0) / coords.length;
        return getAsiaSubRegion(countryName, avgLat, avgLng);
      }
    }

    if (cont === "Oceania") {
      if (countryName && COUNTRY_TO_REGION[countryName] === "Pacific Islands") {
        return "Pacific Islands";
      }
    }

    return cont;
  }, [getAsiaSubRegion]);

  const highlightedRegionRef = useRef<string | null>(null);

  const updatePolygonColors = useCallback((highlightedRegion: string | null) => {
    const globe = globeRef.current;
    const geo = geoRef.current;
    if (!globe || !geo) return;

    highlightedRegionRef.current = highlightedRegion;

    globe.polygonCapColor((obj: object) => {
      const currentHighlight = highlightedRegionRef.current;
      if (!currentHighlight) return TRANSPARENT;

      const f = obj as GeoFeature;
      const region = getFeatureRegion(f);

      if (region === currentHighlight) {
        return HIGHLIGHT_COLOR;
      }

      return TRANSPARENT;
    });

    globe.polygonsData(geo.features as object[]);
  }, [getFeatureRegion]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // CRITICAL: Force cleanup of any existing instances BEFORE checking initialization flag
    if (isInitializedRef.current) {
      console.log('⚠️ Component remounting detected');

      // FORCE CLEANUP OF OLD INSTANCE
      console.log('🧹 Forcing cleanup of old WebGL instance...');

      // Cancel any running animation
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }

      // Run all cleanup functions
      cleanupFunctionsRef.current.forEach(fn => {
        try {
          fn();
        } catch (err) {
          console.error('Cleanup error:', err);
        }
      });
      cleanupFunctionsRef.current = [];

      // Dispose scene
      if (sceneRef.current) {
        deepDisposeScene(sceneRef.current);
        sceneRef.current = null;
      }

      // Force lose WebGL context
      if (rendererRef.current) {
        try {
          const gl = rendererRef.current.getContext();
          if (gl) {
            const loseContext = gl.getExtension('WEBGL_lose_context');
            if (loseContext) {
              loseContext.loseContext();
              console.log('✓ Forced WebGL context loss');
            }
          }
          rendererRef.current.dispose();
          rendererRef.current.forceContextLoss();
        } catch (err) {
          console.error('Renderer disposal error:', err);
        }
        rendererRef.current = null;
      }

      // Clear all refs
      cameraRef.current = null;
      globeRef.current = null;
      ringGroupRef.current = null;
      labelSpritesRef.current = [];

      // Clear mount container
      mount.innerHTML = "";

      // Reset initialization flag to allow re-initialization
      isInitializedRef.current = false;

      console.log('✓ Old instance cleaned up, allowing re-initialization');

      // Give browser time to release WebGL context (crucial!)
      const timeoutId = setTimeout(() => {
        // Trigger re-render after cleanup
        setWebglError(null);
      }, 150);

      return () => clearTimeout(timeoutId);
    }

    let cancelled = false;
    const localCleanupFunctions: Array<() => void> = [];

    const addCleanup = (fn: () => void) => {
      localCleanupFunctions.push(fn);
      cleanupFunctionsRef.current.push(fn);
    };

    const init = async () => {
      // Check global instance limit BEFORE creating
      if (activeGlobeInstances >= MAX_ALLOWED_INSTANCES) {
        console.error(`❌ Cannot create globe: ${activeGlobeInstances} instances already active (max: ${MAX_ALLOWED_INSTANCES})`);
        setWebglError('Another globe instance is active. Please close other tabs or windows with the globe.');
        isInitializedRef.current = false;
        return;
      }

      isInitializedRef.current = true;
      activeGlobeInstances++;
      console.log(`📈 Active globe instances: ${activeGlobeInstances}/${MAX_ALLOWED_INSTANCES}`);

      try {
        // Simple WebGL check WITHOUT creating contexts (just check if API exists)
        const isWebGLSupported = 'WebGLRenderingContext' in window;

        if (!isWebGLSupported) {
          const errorMsg = 'Your browser does not support WebGL. Please update Chrome or try a different browser.';
          console.error('WebGL Initialization Failed:', {
            webglSupported: false,
            userAgent: navigator.userAgent,
          });

          setWebglError(errorMsg);
          isInitializedRef.current = false;
          activeGlobeInstances--;
          return;
        }

        console.log('✓ WebGL API available, proceeding with initialization');

        const mod = await import("three-globe");
        const ThreeGlobe = mod.default as unknown as new () => ThreeGlobeInstance;

        if (cancelled) return;

        mount.innerHTML = "";

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(DARK_BG_COLOR);
        sceneRef.current = scene;

        const camera = new THREE.PerspectiveCamera(
          50,
          mount.clientWidth / mount.clientHeight,
          1,
          2000
        );
        camera.position.set(0, 0, CAMERA_DISTANCE);
        camera.lookAt(0, 0, 0);
        cameraRef.current = camera;

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
        directionalLight.position.set(-200, 150, 400);
        scene.add(directionalLight);

        const fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
        fillLight.position.set(200, -100, -200);
        scene.add(fillLight);

        const backLight = new THREE.DirectionalLight(0xffffff, 0.3);
        backLight.position.set(0, -200, -300);
        scene.add(backLight);

        // CRITICAL: Small delay to ensure previous WebGL context is fully released
        // This prevents "BindToCurrentSequence failed" errors in Chrome
        await new Promise(resolve => setTimeout(resolve, 50));
        console.log('⏱️ Waited for WebGL context cleanup...');

        let renderer: THREE.WebGLRenderer;
        try {
          renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: false,
            powerPreference: "high-performance",
            failIfMajorPerformanceCaveat: false,
          });

          // Log successful WebGL context creation
          const gl = renderer.getContext();
          console.log('✓ WebGL renderer created successfully', {
            version: gl.getParameter(gl.VERSION),
            vendor: gl.getParameter(gl.VENDOR),
            renderer: gl.getParameter(gl.RENDERER),
          });
        } catch (error) {
          console.error('WebGL renderer creation failed:', error);
          setWebglError('Failed to create WebGL context. Too many WebGL contexts active. Please close other tabs with 3D graphics and refresh.');
          isInitializedRef.current = false;
          activeGlobeInstances--;
          return;
        }

        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(mount.clientWidth, mount.clientHeight);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        mount.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        const rendererCanvas = renderer.domElement;

        const handleContextLost = (event: Event) => {
          event.preventDefault();
          console.warn('WebGL context lost - pausing animation');
          if (rafRef.current) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = 0;
          }
          setWebglError('Graphics context lost. The page will attempt to restore it...');
        };

        const handleContextRestored = () => {
          console.log('WebGL context restored - resuming animation');
          setWebglError(null);
          if (!cancelled && rendererRef.current && sceneRef.current && cameraRef.current) {
            animate();
          }
        };

        rendererCanvas.addEventListener('webglcontextlost', handleContextLost, false);
        rendererCanvas.addEventListener('webglcontextrestored', handleContextRestored, false);

        addCleanup(() => {
          rendererCanvas.removeEventListener('webglcontextlost', handleContextLost);
          rendererCanvas.removeEventListener('webglcontextrestored', handleContextRestored);
        });

        const globe = new ThreeGlobe()
          .globeImageUrl("/textures/earth_day_clouds.jpg")
          .showAtmosphere(true)
          .atmosphereColor("#4a9eff")
          .atmosphereAltitude(0.15);

        scene.add(globe);
        globeRef.current = globe;

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
        labelSpritesRef.current = [];

        globe.rotation.x = rotationRef.current.x;
        globe.rotation.y = rotationRef.current.y;

        const waitForGeo = () => {
          if (geoRef.current) {
            globe
              .polygonsData(geoRef.current.features as object[])
              .polygonAltitude(0.008)
              .polygonStrokeColor(() => BORDER_COLOR)
              .polygonSideColor(() => "rgba(0,0,0,0)")
              .polygonsTransitionDuration(200);
            updatePolygonColors(null);
          } else {
            setTimeout(waitForGeo, 100);
          }
        };
        waitForGeo();

        const animate = () => {
          if (cancelled) return;
          rafRef.current = requestAnimationFrame(animate);

          if (!isDraggingRef.current && activeRef.current) {
            targetRotationRef.current.y += 0.001;
          }

          const lerp = 0.08;
          rotationRef.current.x += (targetRotationRef.current.x - rotationRef.current.x) * lerp;
          rotationRef.current.y += (targetRotationRef.current.y - rotationRef.current.y) * lerp;

          globe.rotation.x = rotationRef.current.x;
          globe.rotation.y = rotationRef.current.y;

          if (ringGroupRef.current) {
            ringGroupRef.current.rotation.z += 0.001;
          }

          renderer.render(scene, camera);
        };
        animate();

        const onPointerDown = (e: PointerEvent) => {
          if (!activeRef.current) return;
          isDraggingRef.current = true;
          hasDraggedRef.current = false;
          lastMouseRef.current = { x: e.clientX, y: e.clientY };
          try {
            renderer.domElement.setPointerCapture(e.pointerId);
          } catch {
            // Ignore pointer capture errors
          }
        };

        const onPointerMove = (e: PointerEvent) => {
          if (!activeRef.current) return;

          if (isDraggingRef.current) {
            const dx = e.clientX - lastMouseRef.current.x;
            const dy = e.clientY - lastMouseRef.current.y;

            if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
              hasDraggedRef.current = true;
            }

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
          } catch {
            // Ignore pointer capture errors
          }

          if (!hasDraggedRef.current && activeRef.current) {
            const { continent } = raycastContinent(e.clientX, e.clientY);
            if (continent) {
              onClickRef.current(continent);
            }
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
          if (!camera || !renderer) return;
          const w = mount.clientWidth;
          const h = mount.clientHeight;
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
        };

        renderer.domElement.addEventListener("pointerdown", onPointerDown);
        renderer.domElement.addEventListener("pointermove", onPointerMove);
        renderer.domElement.addEventListener("pointerup", onPointerUp);
        renderer.domElement.addEventListener("pointerleave", onPointerLeave);
        renderer.domElement.addEventListener("wheel", onWheel, { passive: false });
        window.addEventListener("resize", onResize);

        addCleanup(() => {
          renderer.domElement.removeEventListener("pointerdown", onPointerDown);
          renderer.domElement.removeEventListener("pointermove", onPointerMove);
          renderer.domElement.removeEventListener("pointerup", onPointerUp);
          renderer.domElement.removeEventListener("pointerleave", onPointerLeave);
          renderer.domElement.removeEventListener("wheel", onWheel);
          window.removeEventListener("resize", onResize);
        });

      } catch (err) {
        console.error("Globe init error:", err);
        setWebglError('Failed to initialize globe. Please refresh the page.');
        isInitializedRef.current = false;

        // Decrement counter on error
        if (activeGlobeInstances > 0) {
          activeGlobeInstances--;
          console.log(`📉 Active globe instances after error: ${activeGlobeInstances}/${MAX_ALLOWED_INSTANCES}`);
        }
      }
    };

    void init();

    return () => {
      cancelled = true;
      isInitializedRef.current = false;

      // Decrement global instance counter
      if (activeGlobeInstances > 0) {
        activeGlobeInstances--;
        console.log(`📉 Active globe instances after cleanup: ${activeGlobeInstances}/${MAX_ALLOWED_INSTANCES}`);
      }

      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }

      localCleanupFunctions.forEach(fn => {
        try {
          fn();
        } catch (err) {
          console.error('Cleanup function error:', err);
        }
      });

      if (sceneRef.current) {
        deepDisposeScene(sceneRef.current);
        sceneRef.current = null;
      }

      if (rendererRef.current) {
        try {
          // CRITICAL: Force lose context using extension
          const gl = rendererRef.current.getContext();
          if (gl) {
            const loseContextExt = gl.getExtension('WEBGL_lose_context');
            if (loseContextExt) {
              loseContextExt.loseContext();
              console.log('✓ Forced WebGL context loss via extension');
            }
          }

          rendererRef.current.dispose();
          rendererRef.current.forceContextLoss();
          console.log('✓ Renderer disposed and context loss forced');
        } catch (err) {
          console.error('Renderer disposal error:', err);
        }
        rendererRef.current = null;
      }

      cameraRef.current = null;
      globeRef.current = null;
      ringGroupRef.current = null;
      labelSpritesRef.current = [];
      cleanupFunctionsRef.current = [];

      if (mount) {
        mount.innerHTML = "";
      }
    };
  }, [raycastContinent, updatePolygonColors]);

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
            Refresh Page
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
            Data: <span className={geoStatus === "fail" ? "text-red-400" : "text-amber-400"}>{geoStatus}</span>
          </div>
        </div>
      )}

      {hoveredContinent && (
        <div className="absolute top-[-15px] left-0 right-0 flex justify-center z-10 pointer-events-none">
          <h2
            className="text-2xl md:text-3xl font-bold tracking-wide text-amber-400"
            style={{
              fontFamily: '"Bell MT", "Georgia", serif',
              textShadow: '0 0 20px rgba(0,0,0,0.8), 0 0 40px rgba(0,0,0,0.6)'
            }}
          >
            Click to explore {hoveredContinent}
          </h2>
        </div>
      )}

      <div
        ref={mountRef}
        className="w-full h-full mt-8"
        style={{ cursor: hoveredContinent ? "pointer" : "grab" }}
      />
    </div>
  );
}