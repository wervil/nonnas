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
const GLOBE_RADIUS = 40;
const CAMERA_DISTANCE = 320;
const ROTATION_SENSITIVITY = 0.004;
const MAX_TILT = 1.2;
const HIGHLIGHT_COLOR = "rgba(255, 255, 255, 0.35)"; // Light white highlight on hover
const BORDER_COLOR = "rgba(255, 255, 255, 0.15)"; // Very subtle border for country outlines
const DARK_BG_COLOR = 0x0a0a0a; // Very dark background

// Region colors - all transparent to show natural earth texture (no color overlay)
const TRANSPARENT = "rgba(0, 0, 0, 0)";

// Map country to sub-region for Asia breakdown and GeoJSON corrections
const COUNTRY_TO_REGION: Record<string, string> = {
  // Russia - transcontinental country spanning Europe and Asia
  // Treat as its own separate clickable region
  "Russia": "Russia",
  "Russian Federation": "Russia",
  
  // Middle East
  "Saudi Arabia": "Middle East", "United Arab Emirates": "Middle East", "Iran": "Middle East",
  "Iraq": "Middle East", "Israel": "Middle East", "Jordan": "Middle East", "Lebanon": "Middle East",
  "Syria": "Middle East", "Yemen": "Middle East", "Oman": "Middle East", "Qatar": "Middle East",
  "Bahrain": "Middle East", "Kuwait": "Middle East", "Turkey": "Middle East",
  "Egypt": "Middle East", // Often grouped with Middle East
  "Cyprus": "Middle East",
  
  // South Asia
  "India": "South Asia", "Pakistan": "South Asia", "Bangladesh": "South Asia",
  "Sri Lanka": "South Asia", "Nepal": "South Asia", "Bhutan": "South Asia",
  "Maldives": "South Asia", "Afghanistan": "South Asia",
  
  // East Asia
  "China": "East Asia", "Japan": "East Asia", "South Korea": "East Asia",
  "North Korea": "East Asia", "Mongolia": "East Asia", "Taiwan": "East Asia",
  "Republic of Korea": "East Asia", "Dem. Rep. Korea": "East Asia",
  
  // Southeast Asia
  "Thailand": "Southeast Asia", "Vietnam": "Southeast Asia", "Indonesia": "Southeast Asia",
  "Philippines": "Southeast Asia", "Malaysia": "Southeast Asia", "Singapore": "Southeast Asia",
  "Myanmar": "Southeast Asia", "Cambodia": "Southeast Asia", "Laos": "Southeast Asia",
  "Brunei": "Southeast Asia", "Timor-Leste": "Southeast Asia", "East Timor": "Southeast Asia",
  
  // Central Asia
  "Kazakhstan": "Central Asia", "Uzbekistan": "Central Asia", "Turkmenistan": "Central Asia",
  "Kyrgyzstan": "Central Asia", "Tajikistan": "Central Asia",
  
  // Pacific Islands
  "Fiji": "Pacific Islands", "Papua New Guinea": "Pacific Islands", "Samoa": "Pacific Islands",
  "Tonga": "Pacific Islands", "Vanuatu": "Pacific Islands", "Solomon Islands": "Pacific Islands",
  "New Zealand": "Pacific Islands", "Micronesia": "Pacific Islands",
  
  // Caucasus - treat as part of Middle East or Europe
  "Georgia": "Middle East", "Armenia": "Middle East", "Azerbaijan": "Middle East",
};

// Legacy constant (no longer used - all regions transparent)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const CONTINENT_COLORS: Record<string, string> = {};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function normalizeLng(lng: number) {
  return ((((lng % 360) + 540) % 360) - 180);
}

// Create text texture for rotating ring text (matching logo style)
function createRingTextTexture(text: string, fontSize: number = 64): THREE.Texture {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d")!;
  
  // Set canvas size for ring text - bold, impactful letters
  context.font = `900 ${fontSize}px "Arial Black", "Helvetica Neue", sans-serif`;
  const metrics = context.measureText(text);
  const textWidth = metrics.width;
  const textHeight = fontSize * 1.3;
  
  canvas.width = Math.ceil(textWidth + 30);
  canvas.height = Math.ceil(textHeight + 20);
  
  // Clear canvas (transparent background)
  context.clearRect(0, 0, canvas.width, canvas.height);
  
  // Text styling - dark brown/maroon like the logo
  context.font = `900 ${fontSize}px "Arial Black", "Helvetica Neue", sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  
  // Dark brown color matching logo (#3d2314)
  // But for dark background, use a lighter cream/gold for visibility
  context.fillStyle = "#e8d5b7"; // Cream/beige - visible on dark background
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

  // Helper to determine Asia sub-region from country or coordinates
  const getAsiaSubRegion = useCallback((countryName: string | undefined, lat: number, lng: number): string => {
    // Check if we have a country-to-region mapping
    if (countryName && COUNTRY_TO_REGION[countryName]) {
      return COUNTRY_TO_REGION[countryName];
    }
    
    // Fallback to coordinate-based detection
    // Middle East: roughly 25-45°N, 25-65°E
    if (lat >= 12 && lat <= 45 && lng >= 25 && lng <= 65) {
      return "Middle East";
    }
    // South Asia: roughly 5-35°N, 65-95°E
    if (lat >= 5 && lat <= 38 && lng >= 65 && lng <= 95) {
      return "South Asia";
    }
    // Southeast Asia: roughly -10-25°N, 95-145°E
    if (lat >= -12 && lat <= 25 && lng >= 95 && lng <= 145) {
      return "Southeast Asia";
    }
    // Central Asia: roughly 35-55°N, 45-90°E
    if (lat >= 35 && lat <= 55 && lng >= 45 && lng <= 90) {
      return "Central Asia";
    }
    // East Asia: roughly 20-55°N, 100-150°E
    if (lat >= 18 && lat <= 55 && lng >= 100 && lng <= 150) {
      return "East Asia";
    }
    
    return "East Asia"; // Default for unmatched Asia regions
  }, []);

  // Helper to find region from lat/lng (with Asia sub-regions and country overrides)
  const findContinentAtLatLng = useCallback((lat: number, lng: number): string | null => {
    const geo = geoRef.current;
    if (!geo) return null;

    for (const f of geo.features) {
      const cont = f.properties?.CONTINENT as string | undefined;
      if (!cont) continue;
      
      if (pointInFeature({ lat, lng }, f)) {
        const countryName = f.properties?.NAME as string | undefined;
        const adminName = f.properties?.ADMIN as string | undefined;
        
        // Check for country overrides first (e.g., Russia is its own region)
        if (countryName && COUNTRY_TO_REGION[countryName]) {
          return COUNTRY_TO_REGION[countryName];
        }
        if (adminName && COUNTRY_TO_REGION[adminName]) {
          return COUNTRY_TO_REGION[adminName];
        }
        
        // If it's Asia, determine the sub-region
        if (cont === "Asia") {
          return getAsiaSubRegion(countryName, lat, lng);
        }
        
        // Check for Pacific Islands (part of Oceania but separate clickable region)
        if (cont === "Oceania") {
          if (countryName && COUNTRY_TO_REGION[countryName] === "Pacific Islands") {
            return "Pacific Islands";
          }
          // Pacific islands are generally east of 150°E
          if (lng > 150 || lng < -150) {
            return "Pacific Islands";
          }
        }
        
        return cont;
      }
    }
    return null;
  }, [getAsiaSubRegion]);

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

  // Get region for a feature (handles Asia sub-regions and country overrides)
  const getFeatureRegion = useCallback((f: GeoFeature): string | null => {
    const cont = f.properties?.CONTINENT as string | undefined;
    if (!cont) return null;
    
    const countryName = f.properties?.NAME as string | undefined;
    const adminName = f.properties?.ADMIN as string | undefined;
    
    // Check for country overrides first (e.g., Russia should be East Asia, not Europe)
    if (countryName && COUNTRY_TO_REGION[countryName]) {
      return COUNTRY_TO_REGION[countryName];
    }
    if (adminName && COUNTRY_TO_REGION[adminName]) {
      return COUNTRY_TO_REGION[adminName];
    }
    
    if (cont === "Asia") {
      // Get centroid approximation for coordinate-based detection
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

  // Store current highlighted region for color function
  const highlightedRegionRef = useRef<string | null>(null);

  // Update polygon colors - transparent by default, light highlight on hover
  const updatePolygonColors = useCallback((highlightedRegion: string | null) => {
    const globe = globeRef.current;
    const geo = geoRef.current;
    if (!globe || !geo) return;

    highlightedRegionRef.current = highlightedRegion;

    // Set the color function
    globe.polygonCapColor((obj: object) => {
      const currentHighlight = highlightedRegionRef.current;
      
      // If no region is hovered, all transparent
      if (!currentHighlight) return TRANSPARENT;
      
      const f = obj as unknown as GeoFeature;
      const region = getFeatureRegion(f);
      
      // Highlight the hovered region with light color
      if (region === currentHighlight) {
        return HIGHLIGHT_COLOR;
      }
      
      // Everything else stays transparent
      return TRANSPARENT;
    });
    
    // Force refresh by re-setting the data (triggers re-evaluation of colors)
    globe.polygonsData(geo.features as object[]);
  }, [getFeatureRegion]);

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

        // Scene setup - Dark background to match brand
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(DARK_BG_COLOR);
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

        // Lighting - enhanced for photorealistic appearance
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8); // Brighter ambient light
        scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5); // Main sunlight
        directionalLight.position.set(-200, 150, 400);
        scene.add(directionalLight);

        const fillLight = new THREE.DirectionalLight(0xffffff, 0.4); // Softer fill light
        fillLight.position.set(200, -100, -200);
        scene.add(fillLight);

        const backLight = new THREE.DirectionalLight(0xffffff, 0.3); // Back rim light
        backLight.position.set(0, -200, -300);
        scene.add(backLight);

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

        // Globe with realistic Earth texture
        const globe = new ThreeGlobe()
          .globeImageUrl("/textures/earth_day_clouds.jpg") // Main texture with clouds
          .showAtmosphere(true)
          .atmosphereColor("#4a9eff") // Blue glow atmosphere
          .atmosphereAltitude(0.15); // Slightly thinner atmosphere for better visibility

        scene.add(globe);
        globeRef.current = globe;

        // Create "NONNAS OF THE WORLD" circular text ring (like the logo)
        const ringGroup = new THREE.Group();
        const ringRadius = GLOBE_RADIUS + 80; // Ring radius - positioned away from globe
        const ringText = "NONNAS OF THE WORLD • ";
        const totalChars = ringText.length;
        
        // Create each letter as a plane mesh positioned around the circle
        for (let i = 0; i < totalChars; i++) {
          const char = ringText[i];
          if (char === " ") continue; // Skip spaces but keep their position
          
          // Calculate angle for this character (distribute evenly around circle)
          // Start from top (12 o'clock position) and go clockwise
          const angle = (i / totalChars) * Math.PI * 2;
          
          // Create texture for this character
          const texture = createRingTextTexture(char, 80);
          
          // Create a plane geometry for the letter
          const geometry = new THREE.PlaneGeometry(24, 32);
          const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            side: THREE.DoubleSide,
            depthTest: true,
            depthWrite: false,
          });
          
          const letterMesh = new THREE.Mesh(geometry, material);
          
          // Position on the circle (in XY plane - vertical ring facing camera)
          letterMesh.position.x = ringRadius * Math.sin(angle);
          letterMesh.position.y = ringRadius * Math.cos(angle);
          letterMesh.position.z = 5; // Slightly in front
          
          // Rotate each letter to be tangent to the circle
          // The letter should be rotated so its "up" points toward the center
          letterMesh.rotation.z = -angle;
          
          ringGroup.add(letterMesh);
        }
        
        scene.add(ringGroup);
        
        // Store ring group for animation (rotates independently of globe)
        const ringGroupRef = ringGroup;
        
        // No more label sprites on globe - using HTML overlay instead
        labelSpritesRef.current = [];

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

          // Rotate the "Nonnas of the World" ring slowly around Z axis (spinning the text)
          ringGroupRef.rotation.z += 0.001;

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
    <div className="w-full h-full relative" style={{ background: "#0a0a0a" }}>
      {/* Status overlay - only show if not ok */}
      {geoStatus !== "ok" && (
        <div className="absolute bottom-4 left-4 z-10 bg-black/80 backdrop-blur-sm rounded-lg px-3 py-2 shadow-md border border-gray-700">
          <div className="text-xs text-gray-400">
            Data: <span className={geoStatus === "fail" ? "text-red-400" : "text-amber-400"}>{geoStatus}</span>
          </div>
        </div>
      )}

      {/* Region name floating above the globe on hover - single line */}
      {hoveredContinent && (
        <div className="absolute top-2 left-0 right-0 flex justify-center z-10 pointer-events-none">
          <h2 
            className="text-2xl md:text-3xl font-medium tracking-wide text-amber-400"
            style={{ 
              fontFamily: '"Georgia", "Times New Roman", serif',
              textShadow: '0 0 20px rgba(0,0,0,0.8), 0 0 40px rgba(0,0,0,0.6)'
            }}
          >
            Click to explore {hoveredContinent}
          </h2>
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
