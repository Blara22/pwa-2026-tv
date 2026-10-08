import { BASE_PATH } from "../config.js";

export const SW_URL = `${BASE_PATH}/sw.js`;
export const SW_SCOPE = `${BASE_PATH}/`;

export async function registerServiceWorker() {
  if(!("serviceWorker" in navigator)) {
    console.warn("Este navegador/scope no soporta Service Workers");
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register(SW_URL, {
      scope: SW_SCOPE
    })

    if(registration.waiting) {
      notifyUpdateAvailable(registration);
    }

    registration.addEventListener("updatefound", () => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      newWorker.addEventListener("statechange", () => {
        if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
          notifyUpdateAvailable(registration);
        }
      });
    });

    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });

    console.log("[PWA] SW registrado. Scope: ", registration.scope);
    return registration;
  }catch(error) {
    console.error("[PWA] Falló el registro del SW: ", error);
    return null;
  }
}

function notifyUpdateAvailable(registration) {
  window.dispatchEvent(
    new CustomEvent("sw-update-available", { detail: { registration } })
  );
}

export function activateWaitingSW(registration) {
  registration?.waiting?.postMessage("SKIP_WAITING");
}