import { BASE_PATH } from "../config.js";

export const SW_URL = `${BASE_PATH}/sw.js`;

export const SW_SCOPE = `${BASE_PATH}/`;

export async function registerServiceWorker() {

  if(!"serviceWorker" in navigator) {
    console.warn("[PWA] Este navegador no tiene soporte para service workers.")
    return;
  }

  try {
    const registration = await navigator.serviceWorker.register(SW_URL, {
      scope: SW_SCOPE
    });
    return registration;
  } catch (error) {
    console.log("[PWA] Falló el registro del SW", error);
    return null;
  }

}