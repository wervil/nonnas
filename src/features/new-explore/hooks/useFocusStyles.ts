"use client";

import { useEffect } from "react";

/** Hide focus outlines on map/globe interactive elements. */
export function useFocusStyles() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const style = document.createElement("style");
    style.textContent = `
      *:focus { outline: none !important; box-shadow: none !important; }
      *::-moz-focus-inner { border: 0 !important; }
      button:focus, input:focus, select:focus, textarea:focus, [tabindex]:focus {
        outline: none !important; box-shadow: none !important;
      }
      *:focus-visible, *:focus, gmp-map:focus, gmp-map *:focus {
        outline: none !important; box-shadow: none !important; border: none !important;
      }
      * { -webkit-tap-highlight-color: transparent !important; }
    `;
    document.head.appendChild(style);

    const injectIntoShadowDOMs = () => {
      document.querySelectorAll("*").forEach((el) => {
        if (el.shadowRoot) {
          const shadowStyle = document.createElement("style");
          shadowStyle.textContent = `
            *:focus { outline: none !important; box-shadow: none !important; }
            * { -webkit-tap-highlight-color: transparent !important; }
          `;
          el.shadowRoot.appendChild(shadowStyle);
        }
      });
    };

    injectIntoShadowDOMs();
    const interval = setInterval(injectIntoShadowDOMs, 1000);
    return () => clearInterval(interval);
  }, []);
}
