import {
  supportsPush,
  getPermission,
  getSubscription,
  enableNotifications,
  unsubscribeFromPush,
  syncSubscription,
} from "./notifications.js";

const button = () => document.getElementById("notify-btn");

async function paint() {
  const el = button();
  if (!el) return;

  if (!supportsPush()) {
    el.hidden = true;
    return;
  }

  const permission = getPermission();
  const subscribed = permission === "granted" && Boolean(await getSubscription());

  el.hidden = false;
  el.disabled = permission === "denied";
  el.title = permission === "denied" ? "Bloqueadas: cámbialo en la configuración del sitio" : "";
  el.textContent =
    permission === "denied"
      ? "Notificaciones bloqueadas"
      : subscribed
        ? "Desactivar notificaciones"
        : "Activar notificaciones";
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

  syncSubscription().catch((error) => console.warn("[PWA] No se pudo sincronizar la suscripción: ", error));

  button()?.addEventListener("click", async () => {
    const el = button();
    el.disabled = true;

    try {
      if (getPermission() === "granted" && (await getSubscription())) {
        await unsubscribeFromPush();
      } else {
        await enableNotifications();
      }
    } catch (error) {
      console.error("[PWA] No se pudo cambiar el estado de las notificaciones: ", error);
    }

    await paint();
  });
}