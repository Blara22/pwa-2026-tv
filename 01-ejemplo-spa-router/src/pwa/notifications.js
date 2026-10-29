import { BASE_PATH } from "../config.js";

const ICON = `${BASE_PATH}/icons/manifest-icon-192.maskable.png`;

export function supportsNotifications() {
  return "Notification" in window && "serviceWorker" in navigator;
}

export function getPermission() {
  return supportsNotifications() ? Notification.permission : "unsupported";
}

export async function requestPermission() {
  return Notification.requestPermission();
}

export async function showLocalNotification(title, options = {}) {
  const registration = await navigator.serviceWorker.ready;

  return registration.showNotification(title, {
    icon: ICON,
    data: { url: "./" },
    ...options,
  });
}

export async function enableNotifications() {
  const permission = await requestPermission();

  if (permission === "granted") {
    await showLocalNotification("Notificaciones activadas", {
      body: "Esta notificación es local: la creó la propia app.",
      tag: "welcome",
    });
    console.log("Se mostró notificación de que se aceptaron las notificaciones");
  }

  return permission;
}