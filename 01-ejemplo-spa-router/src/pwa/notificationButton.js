import { supportsNotifications, getPermission, enableNotifications } from "./notifications.js";

const button = () => document.getElementById("notify-btn");

function paint() {
  const el = button();
  if (!el) return;

  if (!supportsNotifications()) {
    el.hidden = true;
    return;
  }

  const permission = getPermission();
  const labels = {
    default: "Activar notificaciones",
    granted: "Notificaciones activas",
    denied: "Notificaciones bloqueadas",
  };

  el.hidden = false;
  el.disabled = permission !== "default";
  el.textContent = labels[permission];
}

async function watchPermission() {
  try {
    const status = await navigator.permissions.query({ name: "notifications" });
    status.onchange = paint;
  } catch (error) {
    console.warn("[PWA] No se pudo observar el permiso de notificaciones: ", error);
  }
}

export function initNotificationButton() {
  paint();
  watchPermission();

  button()?.addEventListener("click", async () => {
    await enableNotifications();
    paint();
  });
}