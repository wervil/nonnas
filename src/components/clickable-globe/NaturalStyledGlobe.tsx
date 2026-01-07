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
const HIGHLIGHT_COLOR = "rgba(245, 158, 11, 0.6)"; // Warm amber highlight
const BORDER_COLOR = "rgba(71, 85, 105, 0.4)"; // Subtle gray border

// Bright, friendly region colors (pastel tones)
const REGION_COLORS: Record<string, string> = {
  // Africa
  Africa: "rgba(134, 239, 172, 0.4)", // Light green
  // Asia sub-regions
  "Middle East": "rgba(253, 224, 171, 0.4)", // Warm sand
  "South Asia": "rgba(254, 215, 170, 0.4)", // Peach
  "East Asia": "rgba(254, 249, 195, 0.4)", // Light yellow
  "Southeast Asia": "rgba(167, 243, 208, 0.4)", // Mint
  "Central Asia": "rgba(254, 240, 138, 0.4)", // Pale gold
  // Europe
  Europe: "rgba(191, 219, 254, 0.4)", // Light blue
  // Americas
  "North America": "rgba(254, 202, 202, 0.4)", // Light coral
  "South America": "rgba(221, 214, 254, 0.4)", // Light purple
  // Oceania & Pacific
  Oceania: "rgba(251, 207, 232, 0.4)", // Light pink
  "Pacific Islands": "rgba(165, 243, 252, 0.4)", // Light cyan
  // Antarctica
  Antarctica: "rgba(226, 232, 240, 0.4)", // Light slate
};

// Region labels with their center coordinates
// Breaking down large continents into clickable sub-regions
const REGION_LABELS: Array<{ 
  region: string; 
  lat: number; 
  lng: number; 
  name: string;
  scale: number;
}> = [
  // Africa
  { region: "Africa", lat: 2, lng: 20, name: "AFRICA", scale: 1.0 },
  
  // Asia broken into sub-regions
  { region: "Middle East", lat: 28, lng: 45, name: "MIDDLE EAST", scale: 0.65 },
  { region: "South Asia", lat: 22, lng: 78, name: "SOUTH ASIA", scale: 0.65 },
  { region: "East Asia", lat: 38, lng: 115, name: "EAST ASIA", scale: 0.7 },
  { region: "Southeast Asia", lat: 8, lng: 115, name: "SE ASIA", scale: 0.6 },
  { region: "Central Asia", lat: 45, lng: 68, name: "CENTRAL ASIA", scale: 0.55 },
  
  // Europe
  { region: "Europe", lat: 52, lng: 10, name: "EUROPE", scale: 0.7 },
  
  // Americas
  { region: "North America", lat: 48, lng: -105, name: "N. AMERICA", scale: 0.85 },
  { region: "South America", lat: -15, lng: -58, name: "S. AMERICA", scale: 0.85 },
  
  // Oceania & Pacific
  { region: "Oceania", lat: -25, lng: 135, name: "OCEANIA", scale: 0.7 },
  { region: "Pacific Islands", lat: 5, lng: 160, name: "PACIFIC", scale: 0.5 },
  
  // Antarctica (optional, might not have nonnas)
  { region: "Antarctica", lat: -82, lng: 0, name: "ANTARCTICA", scale: 0.5 },
];

// Map country to sub-region for Asia breakdown
const COUNTRY_TO_REGION: Record<string, string> = {
  // Middle East
  "Saudi Arabia": "Middle East", "United Arab Emirates": "Middle East", "Iran": "Middle East",
  "Iraq": "Middle East", "Israel": "Middle East", "Jordan": "Middle East", "Lebanon": "Middle East",
  "Syria": "Middle East", "Yemen": "Middle East", "Oman": "Middle East", "Qatar": "Middle East",
  "Bahrain": "Middle East", "Kuwait": "Middle East", "Turkey": "Middle East",
  
  // South Asia
  "India": "South Asia", "Pakistan": "South Asia", "Bangladesh": "South Asia",
  "Sri Lanka": "South Asia", "Nepal": "South Asia", "Bhutan": "South Asia",
  "Maldives": "South Asia", "Afghanistan": "South Asia",
  
  // East Asia
  "China": "East Asia", "Japan": "East Asia", "South Korea": "East Asia",
  "North Korea": "East Asia", "Mongolia": "East Asia", "Taiwan": "East Asia",
  
  // Southeast Asia
  "Thailand": "Southeast Asia", "Vietnam": "Southeast Asia", "Indonesia": "Southeast Asia",
  "Philippines": "Southeast Asia", "Malaysia": "Southeast Asia", "Singapore": "Southeast Asia",
  "Myanmar": "Southeast Asia", "Cambodia": "Southeast Asia", "Laos": "Southeast Asia",
  "Brunei": "Southeast Asia", "Timor-Leste": "Southeast Asia",
  
  // Central Asia
  "Kazakhstan": "Central Asia", "Uzbekistan": "Central Asia", "Turkmenistan": "Central Asia",
  "Kyrgyzstan": "Central Asia", "Tajikistan": "Central Asia",
  
  // Pacific Islands
  "Fiji": "Pacific Islands", "Papua New Guinea": "Pacific Islands", "Samoa": "Pacific Islands",
  "Tonga": "Pacific Islands", "Vanuatu": "Pacific Islands", "Solomon Islands": "Pacific Islands",
};

// Legacy mapping for backward compatibility
const CONTINENT_COLORS = REGION_COLORS;
const CONTINENT_LABELS = REGION_LABELS.map(r => ({
  continent: r.region,
  lat: r.lat,
  lng: r.lng,
  name: r.name,
  scale: r.scale,
}));

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

// Create text texture for sprite (corporate, friendly style)
function createTextTexture(text: string, fontSize: number = 72): THREE.Texture {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d")!;
  
  // Set canvas size based on text (higher resolution)
  context.font = `700 ${fontSize}px "Segoe UI", system-ui, sans-serif`;
  const metrics = context.measureText(text);
  const textWidth = metrics.width;
  const textHeight = fontSize * 1.4;
  
  canvas.width = Math.ceil(textWidth + 50);
  canvas.height = Math.ceil(textHeight + 30);
  
  // Clear canvas
  context.clearRect(0, 0, canvas.width, canvas.height);
  
  // Text styling - darker, more corporate look for light background
  context.font = `700 ${fontSize}px "Segoe UI", system-ui, sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  
  // Draw subtle shadow for depth
  context.shadowColor = "rgba(0, 0, 0, 0.3)";
  context.shadowBlur = 4;
  context.shadowOffsetX = 1;
  context.shadowOffsetY = 2;
  
  // Draw white background pill for better readability
  const pillWidth = textWidth + 30;
  const pillHeight = fontSize + 10;
  const pillX = (canvas.width - pillWidth) / 2;
  const pillY = (canvas.height - pillHeight) / 2;
  
  context.fillStyle = "rgba(255, 255, 255, 0.85)";
  context.beginPath();
  context.roundRect(pillX, pillY, pillWidth, pillHeight, pillHeight / 2);
  context.fill();
  
  // Reset shadow
  context.shadowColor = "transparent";
  context.shadowBlur = 0;
  context.shadowOffsetX = 0;
  context.shadowOffsetY = 0;
  
  // Draw main text - dark slate color for corporate look
  context.fillStyle = "#1e293b"; // slate-800
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

  // Helper to find region from lat/lng (with Asia sub-regions)
  const findContinentAtLatLng = useCallback((lat: number, lng: number): string | null => {
    const geo = geoRef.current;
    if (!geo) return null;

    for (const f of geo.features) {
      const cont = f.properties?.CONTINENT as string | undefined;
      if (!cont) continue;
      
      if (pointInFeature({ lat, lng }, f)) {
        // If it's Asia, determine the sub-region
        if (cont === "Asia") {
          const countryName = f.properties?.NAME as string | undefined;
          return getAsiaSubRegion(countryName, lat, lng);
        }
        
        // Check for Pacific Islands (part of Oceania but separate clickable region)
        if (cont === "Oceania") {
          const countryName = f.properties?.NAME as string | undefined;
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

  // Get region for a feature (handles Asia sub-regions)
  const getFeatureRegion = useCallback((f: GeoFeature): string | null => {
    const cont = f.properties?.CONTINENT as string | undefined;
    if (!cont) return null;
    
    if (cont === "Asia") {
      const countryName = f.properties?.NAME as string | undefined;
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
      const countryName = f.properties?.NAME as string | undefined;
      if (countryName && COUNTRY_TO_REGION[countryName] === "Pacific Islands") {
        return "Pacific Islands";
      }
    }
    
    return cont;
  }, [getAsiaSubRegion]);

  // Update polygon colors
  const updatePolygonColors = useCallback((highlightedRegion: string | null) => {
    const globe = globeRef.current;
    if (!globe) return;

    globe.polygonCapColor((obj: object) => {
      const f = obj as unknown as GeoFeature;
      const region = getFeatureRegion(f);
      if (!region) return "rgba(0,0,0,0)";
      
      if (highlightedRegion === region) {
        return HIGHLIGHT_COLOR;
      }
      return REGION_COLORS[region] || CONTINENT_COLORS[region] || "rgba(134, 239, 172, 0.3)";
    });
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

        // Create a stylized, light globe texture (corporate, friendly look)
        const globeCanvas = document.createElement("canvas");
        globeCanvas.width = 2048;
        globeCanvas.height = 1024;
        const ctx = globeCanvas.getContext("2d")!;
        
        // Light ocean gradient (friendly blue-green)
        const oceanGradient = ctx.createLinearGradient(0, 0, 0, globeCanvas.height);
        oceanGradient.addColorStop(0, "#e0f2fe"); // Very light blue at top
        oceanGradient.addColorStop(0.3, "#7dd3fc"); // Light sky blue
        oceanGradient.addColorStop(0.5, "#38bdf8"); // Bright cyan
        oceanGradient.addColorStop(0.7, "#7dd3fc"); // Light sky blue
        oceanGradient.addColorStop(1, "#e0f2fe"); // Very light blue at bottom
        ctx.fillStyle = oceanGradient;
        ctx.fillRect(0, 0, globeCanvas.width, globeCanvas.height);
        
        // Add subtle wave pattern for texture
        ctx.globalAlpha = 0.1;
        for (let y = 0; y < globeCanvas.height; y += 30) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          for (let x = 0; x < globeCanvas.width; x += 10) {
            ctx.lineTo(x, y + Math.sin(x * 0.02) * 5);
          }
          ctx.strokeStyle = "#0ea5e9";
          ctx.lineWidth = 1;
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        
        const globeTexture = new THREE.CanvasTexture(globeCanvas);
        globeTexture.needsUpdate = true;

        // Globe with stylized light appearance
        const globe = new ThreeGlobe()
          .globeImageUrl(globeCanvas.toDataURL())
          .showAtmosphere(true)
          .atmosphereColor("#bae6fd") // Light sky blue atmosphere
          .atmosphereAltitude(0.12);

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

          // Update label visibility - only show label for hovered region
          const cameraDirection = new THREE.Vector3(0, 0, 1); // Camera looks at -Z
          const hoveredRegion = currentHoverRef.current;
          
          for (const sprite of labelSprites) {
            const spriteRegion = sprite.userData.continent as string;
            
            // Only show label if this region is being hovered
            if (spriteRegion !== hoveredRegion) {
              sprite.visible = false;
              continue;
            }
            
            // Get sprite world position
            const worldPos = new THREE.Vector3();
            sprite.getWorldPosition(worldPos);
            
            // Check if sprite is facing camera (dot product with camera direction)
            const dirToCamera = worldPos.clone().normalize();
            const dotProduct = dirToCamera.dot(cameraDirection);
            
            // Show only if on the front side of the globe AND hovered
            if (dotProduct > -0.15) {
              sprite.visible = true;
              // Full opacity when hovered
              (sprite.material as THREE.SpriteMaterial).opacity = 1;
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
