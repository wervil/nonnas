"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";

type LatLng = { lat: number; lng: number };

type GeoFeature = {
  type: "Feature";
  properties: { CONTINENT?: string; [k: string]: unknown };
  geometry: {
    type: "Polygon" | "MultiPolygon";
    coordinates: number[][][] | number[][][][];
  };
};
type GeoFC = { type: "FeatureCollection"; features: GeoFeature[] };

// Constants for consistent behavior
const GLOBE_RADIUS = 100;
const CAMERA_DISTANCE = 320;
const ROTATION_SENSITIVITY = 0.004;
const MAX_TILT = 1.2;
const HIGHLIGHT_COLOR = "rgba(59, 130, 246, 0.5)";
const BORDER_COLOR = "rgba(30, 64, 175, 0.6)";

// Continent colors for visual distinction
const CONTINENT_COLORS: Record<string, string> = {
  Africa: "rgba(34, 197, 94, 0.15)",
  Asia: "rgba(234, 179, 8, 0.15)",
  Europe: "rgba(59, 130, 246, 0.15)",
  "North America": "rgba(239, 68, 68, 0.15)",
  "South America": "rgba(168, 85, 247, 0.15)",
  Oceania: "rgba(236, 72, 153, 0.15)",
  Antarctica: "rgba(148, 163, 184, 0.15)",
};

// Continent center coordinates for labels (adjusted for three-globe coordinate system)
const CONTINENT_LABELS: Array<{ 
  continent: string; 
  lat: number; 
  lng: number; 
  name: string;
  scale: number;
}> = [
  { continent: "Africa", lat: 2, lng: 18, name: "AFRICA", scale: 1.0 },
  { continent: "Asia", lat: 42, lng: 85, name: "ASIA", scale: 1.2 },
  { continent: "Europe", lat: 52, lng: 12, name: "EUROPE", scale: 0.7 },
  { continent: "North America", lat: 45, lng: -105, name: "N. AMERICA", scale: 0.9 },
  { continent: "South America", lat: -12, lng: -55, name: "S. AMERICA", scale: 0.85 },
  { continent: "Oceania", lat: -24, lng: 134, name: "OCEANIA", scale: 0.7 },
  { continent: "Antarctica", lat: -78, lng: 0, name: "ANTARCTICA", scale: 0.6 },
];

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function normalizeLng(lng: number) {
  return ((((lng % 360) + 540) % 360) - 180);
}

// Convert lat/lng to 3D position on sphere (matching three-globe coordinate system)
function latLngToVector3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);   // colatitude (from north pole)
  const theta = (90 - lng) * (Math.PI / 180); // longitude adjusted for three-globe
  
  const x = radius * Math.sin(phi) * Math.cos(theta);
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);
  
  return new THREE.Vector3(x, y, z);
}

// Create text texture for sprite
function createTextTexture(text: string, fontSize: number = 72): THREE.Texture {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d")!;
  
  // Set canvas size based on text (higher resolution)
  context.font = `bold ${fontSize}px Arial, sans-serif`;
  const metrics = context.measureText(text);
  const textWidth = metrics.width;
  const textHeight = fontSize * 1.4;
  
  canvas.width = Math.ceil(textWidth + 40);
  canvas.height = Math.ceil(textHeight + 20);
  
  // Clear canvas
  context.clearRect(0, 0, canvas.width, canvas.height);
  
  // Text styling
  context.font = `bold ${fontSize}px Arial, sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  
  // Draw strong shadow/outline for visibility
  context.shadowColor = "rgba(0, 0, 0, 0.8)";
  context.shadowBlur = 8;
  context.shadowOffsetX = 2;
  context.shadowOffsetY = 2;
  
  // Draw outline
  context.strokeStyle = "rgba(0, 0, 0, 0.9)";
  context.lineWidth = 6;
  context.strokeText(text, canvas.width / 2, canvas.height / 2);
  
  // Reset shadow for main text
  context.shadowColor = "transparent";
  context.shadowBlur = 0;
  context.shadowOffsetX = 0;
  context.shadowOffsetY = 0;
  
  // Draw main text - solid white
  context.fillStyle = "#FFFFFF";
  context.fillText(text, canvas.width / 2, canvas.height / 2);
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  
  return texture;
}

// Point-in-polygon for continent detection
function pointInRing(p: LatLng, ring: number[][]) {
  let inside = false;
  const x = p.lng;
  const y = p.lat;

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];

    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

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

// Proper cleanup
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
      obj.geometry?.dispose?.();
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

  // Refs for stable callbacks
  const activeRef = useRef(active);
  const onClickRef = useRef(onContinentClick);

  // State
  const [geoStatus, setGeoStatus] = useState<"loading" | "ok" | "fail">("loading");
  const [hoveredContinent, setHoveredContinent] = useState<string | null>(null);

  // Three.js refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const globeRef = useRef<ThreeGlobeInstance | null>(null);
  const geoRef = useRef<GeoFC | null>(null);
  const labelSpritesRef = useRef<THREE.Sprite[]>([]);
  
  // Control state refs
  const isDraggingRef = useRef(false);
  const hasDraggedRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const rotationRef = useRef({ x: 0.1, y: 0 });
  const targetRotationRef = useRef({ x: 0.1, y: 0 });
  const currentHoverRef = useRef<string | null>(null);
  
  // Animation frame refs
  const rafRef = useRef<number>(0);
  const isInitializedRef = useRef(false);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    onClickRef.current = onContinentClick;
  }, [onContinentClick]);

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
    return () => { cancelled = true; };
  }, []);

  // Helper to find continent from lat/lng
  const findContinentAtLatLng = useCallback((lat: number, lng: number): string | null => {
    const geo = geoRef.current;
    if (!geo) return null;

    for (const f of geo.features) {
      const cont = f.properties?.CONTINENT as string | undefined;
      if (!cont) continue;
      if (pointInFeature({ lat, lng }, f)) return cont;
    }
    return null;
  }, []);

  // Convert 3D point to lat/lng
  const worldToLatLng = useCallback((point: THREE.Vector3): LatLng => {
    const r = point.length();
    if (r === 0) return { lat: 0, lng: 0 };
    
    const lat = (Math.asin(clamp(point.y / r, -1, 1)) * 180) / Math.PI;
    const lng = normalizeLng((Math.atan2(-point.z, point.x) * 180) / Math.PI);
    return { lat, lng };
  }, []);

  // Raycast to find continent
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

    // Find globe sphere
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

  // Update polygon colors
  const updatePolygonColors = useCallback((highlightedContinent: string | null) => {
    const globe = globeRef.current;
    if (!globe) return;

    globe.polygonCapColor((obj: object) => {
      const f = obj as unknown as GeoFeature;
      const cont = f.properties?.CONTINENT as string | undefined;
      if (!cont) return "rgba(0,0,0,0)";
      
      if (highlightedContinent === cont) {
        return HIGHLIGHT_COLOR;
      }
      return CONTINENT_COLORS[cont] || "rgba(0,0,0,0)";
    });
  }, []);

  // Main initialization
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || isInitializedRef.current) return;

    let cancelled = false;

    const init = async () => {
      try {
        const mod = await import("three-globe");
        const ThreeGlobe = mod.default as unknown as new () => ThreeGlobeInstance;

        if (cancelled) return;

        // Clear any existing content
        mount.innerHTML = "";

        // Scene setup
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xffffff);
        sceneRef.current = scene;

        // Camera - fixed distance, no zoom
        const camera = new THREE.PerspectiveCamera(
          50,
          mount.clientWidth / mount.clientHeight,
          1,
          2000
        );
        camera.position.set(0, 0, CAMERA_DISTANCE);
        camera.lookAt(0, 0, 0);
        cameraRef.current = camera;

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
        directionalLight.position.set(-200, 150, 400);
        scene.add(directionalLight);

        const fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
        fillLight.position.set(200, -100, -200);
        scene.add(fillLight);

        // Renderer
        const renderer = new THREE.WebGLRenderer({
          antialias: true,
          alpha: false,
          powerPreference: "high-performance",
        });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(mount.clientWidth, mount.clientHeight);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        mount.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        // Globe
        const globe = new ThreeGlobe()
          .globeImageUrl("/textures/earth_day.jpg")
          .showAtmosphere(true)
          .atmosphereColor("#87CEEB")
          .atmosphereAltitude(0.15);

        scene.add(globe);
        globeRef.current = globe;

        // Create continent label sprites
        const labelSprites: THREE.Sprite[] = [];
        
        for (const label of CONTINENT_LABELS) {
          const texture = createTextTexture(label.name, 64);
          const spriteMaterial = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            depthTest: false,  // Disable depth test so labels always show on top
            depthWrite: false,
            sizeAttenuation: true,
          });
          
          const sprite = new THREE.Sprite(spriteMaterial);
          
          // Position on globe surface (raised above surface)
          const position = latLngToVector3(label.lat, label.lng, GLOBE_RADIUS + 8);
          sprite.position.copy(position);
          
          // Scale the sprite
          const baseScale = 22 * label.scale;
          sprite.scale.set(baseScale * 2.2, baseScale, 1);
          
          // Store continent name for click detection
          sprite.userData.continent = label.continent;
          sprite.userData.basePosition = position.clone();
          
          globe.add(sprite);
          labelSprites.push(sprite);
        }
        
        labelSpritesRef.current = labelSprites;

        // Apply initial rotation
        globe.rotation.x = rotationRef.current.x;
        globe.rotation.y = rotationRef.current.y;

        // Wait for geo data and apply polygons
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

        // Animation loop with smooth interpolation
        const animate = () => {
          if (cancelled) return;
          rafRef.current = requestAnimationFrame(animate);

          // Smooth rotation interpolation
          const lerp = 0.08;
          rotationRef.current.x += (targetRotationRef.current.x - rotationRef.current.x) * lerp;
          rotationRef.current.y += (targetRotationRef.current.y - rotationRef.current.y) * lerp;

          globe.rotation.x = rotationRef.current.x;
          globe.rotation.y = rotationRef.current.y;

          // Update label visibility based on which side of globe they're on
          const cameraDirection = new THREE.Vector3(0, 0, 1); // Camera looks at -Z
          
          for (const sprite of labelSprites) {
            // Get sprite world position
            const worldPos = new THREE.Vector3();
            sprite.getWorldPosition(worldPos);
            
            // Check if sprite is facing camera (dot product with camera direction)
            const dirToCamera = worldPos.clone().normalize();
            const dotProduct = dirToCamera.dot(cameraDirection);
            
            // Show only if on the front side of the globe
            if (dotProduct > -0.15) {
              sprite.visible = true;
              // Fade based on angle (smoother transition)
              const opacity = Math.min(1, (dotProduct + 0.15) * 2);
              (sprite.material as THREE.SpriteMaterial).opacity = opacity;
            } else {
              sprite.visible = false;
            }
          }

          renderer.render(scene, camera);
        };
        animate();

        // Event handlers
        const onPointerDown = (e: PointerEvent) => {
          if (!activeRef.current) return;
          isDraggingRef.current = true;
          hasDraggedRef.current = false;
          lastMouseRef.current = { x: e.clientX, y: e.clientY };
          renderer.domElement.setPointerCapture(e.pointerId);
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
            // Hover detection
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
          } catch {}

          // Handle click (no drag)
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

        // Wheel for rotation only (no zoom)
        const onWheel = (e: WheelEvent) => {
          if (!activeRef.current) return;
          e.preventDefault();
          e.stopPropagation();

          targetRotationRef.current.y += e.deltaX * 0.002;
          targetRotationRef.current.x += e.deltaY * 0.002;
          targetRotationRef.current.x = clamp(targetRotationRef.current.x, -MAX_TILT, MAX_TILT);
        };

        const onResize = () => {
          if (!camera || !renderer) return;
          const w = mount.clientWidth;
          const h = mount.clientHeight;
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
        };

        // Attach events
        renderer.domElement.addEventListener("pointerdown", onPointerDown);
        renderer.domElement.addEventListener("pointermove", onPointerMove);
        renderer.domElement.addEventListener("pointerup", onPointerUp);
        renderer.domElement.addEventListener("pointerleave", onPointerLeave);
        renderer.domElement.addEventListener("wheel", onWheel, { passive: false });
        window.addEventListener("resize", onResize);

        isInitializedRef.current = true;

        // Cleanup function
        return () => {
          cancelled = true;
          isInitializedRef.current = false;

          cancelAnimationFrame(rafRef.current);

          renderer.domElement.removeEventListener("pointerdown", onPointerDown);
          renderer.domElement.removeEventListener("pointermove", onPointerMove);
          renderer.domElement.removeEventListener("pointerup", onPointerUp);
          renderer.domElement.removeEventListener("pointerleave", onPointerLeave);
          renderer.domElement.removeEventListener("wheel", onWheel);
          window.removeEventListener("resize", onResize);

          deepDisposeScene(scene);
          renderer.dispose();
          renderer.forceContextLoss();

          if (mount) mount.innerHTML = "";

          sceneRef.current = null;
          cameraRef.current = null;
          rendererRef.current = null;
          globeRef.current = null;
          labelSpritesRef.current = [];
        };
      } catch (err) {
        console.error("Globe init error:", err);
      }
    };

    init();

    // Capture ref value for cleanup
    const mountNode = mountRef.current;

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (mountNode) mountNode.innerHTML = "";
      isInitializedRef.current = false;
    };
  }, [raycastContinent, updatePolygonColors]);

  return (
    <div className="w-full h-full relative" style={{ background: "#fff" }}>
      {/* Status overlay - only show if not ok */}
      {geoStatus !== "ok" && (
        <div className="absolute bottom-4 left-4 z-10 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-md border border-gray-200">
          <div className="text-xs text-gray-500">
            Data: <span className={geoStatus === "fail" ? "text-red-600" : "text-amber-600"}>{geoStatus}</span>
          </div>
        </div>
      )}

      {/* Hover indicator */}
      {hoveredContinent && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg font-semibold">
          Click to explore {hoveredContinent}
        </div>
      )}

      {/* Globe container */}
      <div
        ref={mountRef}
        className="w-full h-full"
        style={{ cursor: hoveredContinent ? "pointer" : "grab" }}
      />
    </div>
  );
}
