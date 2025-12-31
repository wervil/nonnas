declare module "three/examples/jsm/controls/OrbitControls" {
    import { Camera, EventDispatcher } from "three";
  
    export class OrbitControls extends EventDispatcher {
      constructor(object: Camera, domElement?: HTMLElement);
  
      enabled: boolean;
      target: import("three").Vector3;
  
      minDistance: number;
      maxDistance: number;
  
      enableDamping: boolean;
      dampingFactor: number;
  
      enableZoom: boolean;
      enableRotate: boolean;
      enablePan: boolean;
  
      rotateSpeed: number;
      zoomSpeed: number;
  
      update(): void;
      dispose(): void;
    }
  }
  