export function loadGoogleMaps(apiKey: string): Promise<void> {
  if (window.google?.maps?.importLibrary) return Promise.resolve();

  return new Promise<void>((resolve, reject) => {
    const scriptId = "google-maps-js";
    const existingScript = document.getElementById(
      scriptId,
    ) as HTMLScriptElement;
    if (existingScript) {
      if (window.google?.maps?.importLibrary) {
        resolve();
        return;
      }
      existingScript.remove();
    }

    const callbackName = `googleMapsCallback_${Date.now()}`;

    (window as unknown as Record<string, () => void>)[callbackName] = () => {
      clearTimeout(timeoutId);
      delete (window as unknown as Record<string, unknown>)[callbackName];
      setTimeout(() => {
        if (window.google?.maps?.importLibrary) {
          resolve();
        } else {
          const t = setInterval(() => {
            if (window.google?.maps?.importLibrary) {
              clearInterval(t);
              resolve();
            }
          }, 50);
          setTimeout(() => {
            clearInterval(t);
            if (!window.google?.maps?.importLibrary) {
              reject(new Error("Google Maps initialization timeout"));
            }
          }, 5000);
        }
      }, 100);
    };

    const script = document.createElement("script");
    script.id = scriptId;
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=beta&loading=async&callback=${callbackName}`;

    script.onerror = () => {
      clearTimeout(timeoutId);
      delete (window as unknown as Record<string, unknown>)[callbackName];
      reject(new Error("Failed to load Google Maps JS"));
    };

    const timeoutId = setTimeout(() => {
      delete (window as unknown as Record<string, unknown>)[callbackName];
      if (!window.google?.maps?.importLibrary) {
        reject(new Error("Google Maps loading timeout"));
      }
    }, 15000);

    document.head.appendChild(script);
  });
}
