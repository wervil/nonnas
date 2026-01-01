"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import ThreeGlobe from "three-globe";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

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

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    onDistRef.current = onDistanceChange;
  }, [onDistanceChange]);

  useEffect(() => {
    let renderer: THREE.WebGLRenderer | null = null;
    let scene: THREE.Scene | null = null;
    let camera: THREE.PerspectiveCamera | null = null;
    let controls: OrbitControls | null = null;
    let globe: ThreeGlobe | null = null;
    let cloudsMesh: THREE.Mesh | null = null;
    let raf = 0;

    const mount = mountRef.current;
    if (!mount) return;
    mount.innerHTML = "";

    const getOrbitDistance = () => {
      if (!camera || !controls) return 0;
      return camera.position.distanceTo(controls.target);
    };

    const init = async () => {
      // You can keep this dynamic import (fine for Next)
      const ThreeGlobeMod = await import("three-globe");
      const ThreeGlobeCtor =
        ThreeGlobeMod.default as unknown as typeof ThreeGlobe;

      scene = new THREE.Scene();

      const w = mount.clientWidth;
      const h = mount.clientHeight;

      camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 3000);
      camera.position.set(0, 0, 420);

      // ✅ White background (scene + renderer)
      scene.background = new THREE.Color(0xffffff);

      // 🌤 Enhanced realistic lighting
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

      // ✅ better highlight response
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;

      // ✅ white background
      renderer.setClearColor(0xffffff, 1);
      mount.appendChild(renderer.domElement);

      // 🌍 Globe
      globe = new ThreeGlobeCtor()
        .globeImageUrl("/textures/earth_day.jpg")
        .bumpImageUrl("/textures/earth_bump.jpg")
        .showAtmosphere(true)
        .atmosphereColor("#7dd3fc")
        .atmosphereAltitude(0.08);

      scene.add(globe);

      // ✅ Apply specular map manually
      const textureLoader = new THREE.TextureLoader();

      const specularMap = textureLoader.load("/textures/earth_specular.jpg");
      specularMap.colorSpace = THREE.NoColorSpace;

      const mat = globe.globeMaterial() as THREE.MeshPhongMaterial;
      mat.specularMap = specularMap;

      // ✅ stronger ocean highlight + terrain
      mat.specular = new THREE.Color(0x666666);
      mat.shininess = 18;
      mat.bumpScale = 10;

      // ☁️ Clouds
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

      // 🎮 Controls
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

      // 🔄 Animation
      const EARTH_ROT = 0.00025;
      const CLOUD_ROT = 0.00035;

      // 📏 Distance emit (no spam) — via RAF polling
      let lastEmitted = getOrbitDistance();
      if (activeRef.current) onDistRef.current?.(lastEmitted);

      const loop = () => {
        raf = requestAnimationFrame(loop);

        if (controls) controls.enabled = activeRef.current;

        if (activeRef.current) {
          // rotate
          globe!.rotation.y += EARTH_ROT;
          if (cloudsMesh) cloudsMesh.rotation.y += CLOUD_ROT;

          // controls update
          controls?.update();

          // emit distance only if it changed meaningfully
          const d = getOrbitDistance();
          if (Math.abs(d - lastEmitted) >= 1) {
            lastEmitted = d;
            onDistRef.current?.(d);
          }
        }

        renderer!.render(scene!, camera!);
      };
      loop();

      return () => {
        window.removeEventListener("resize", onResize);
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
  }, []);

  return <div ref={mountRef} className="w-full h-full" />;
}
