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
    await subscribeToPush();

    await showLocalNotification("Notificaciones activadas", {
      body: "Esta notificación es local: la creó la propia app.",
      tag: "welcome",
    });
    console.log("Se mostró notificación de que se aceptaron las notificaciones");
  }

  return permission;
}

// Rutas de nuestro servidor de aplicación (las define server.mjs)
const API = `${BASE_PATH}/api/push`;

// Pide al servidor la llave pública VAPID (la privada nunca sale de allá)
async function getPublicKey() {
  const response = await fetch(`${API}/public-key`);
  if (!response.ok) throw new Error(`No se pudo obtener la llave pública (HTTP ${response.status})`);

  const { publicKey } = await response.json();
  return publicKey;
}

// Convierte la llave de base64url (texto) a bytes, que es lo que pide subscribe()
function urlBase64ToUint8Array(base64Url) {
  const padding = "=".repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
}

// Compara la llave con la que se creó una suscripción contra la llave actual del servidor
function sameKey(buffer, bytes) {
  const current = new Uint8Array(buffer ?? []);
  return current.length === bytes.length && current.every((byte, i) => byte === bytes[i]);
}

// Envía al servidor una suscripción ("subscribe") o una baja ("unsubscribe")
async function postToServer(action, subscription) {
  const response = await fetch(`${API}/${action}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(subscription),
  });

  if (!response.ok) throw new Error(`El servidor rechazó "${action}" (HTTP ${response.status})`);
}

// Indica si el navegador soporta notificaciones y la Push API
export function supportsPush() {
  return supportsNotifications() && "PushManager" in window;
}

// Devuelve la suscripción push actual de este navegador, o null si no existe
export async function getSubscription() {
  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

// Suscribe al usuario al push y registra la suscripción en el servidor
export async function subscribeToPush() {
  const registration = await navigator.serviceWorker.ready;
  const key = urlBase64ToUint8Array(await getPublicKey());

  let subscription = await registration.pushManager.getSubscription();

  // Si el servidor cambió de llaves VAPID, la suscripción vieja ya no sirve: se descarta
  if (subscription && !sameKey(subscription.options.applicationServerKey, key)) {
    await subscription.unsubscribe();
    subscription = null;
  }

  // Si no hay suscripción, se crea una; userVisibleOnly: true = cada push mostrará una notificación
  subscription ??= await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: key,
  });

  await postToServer("subscribe", subscription);
  return subscription;
}

// Da de baja la suscripción: primero avisa al servidor y luego la cancela en el navegador
export async function unsubscribeFromPush() {
  const subscription = await getSubscription();
  if (!subscription) return false;

  // Si el servidor falla, igual se cancela en el navegador
  await postToServer("unsubscribe", subscription).catch((error) =>
    console.warn("[PWA] El servidor no pudo borrar la suscripción: ", error)
  );

  return subscription.unsubscribe();
}

// Al abrir la app, reenvía la suscripción existente al servidor para mantenerla al día
// (por ejemplo, si el servidor se reinició y perdió las suscripciones guardadas en memoria)
export async function syncSubscription() {
  if (!supportsPush() || getPermission() !== "granted") return;

  const subscription = await getSubscription();
  if (subscription) await postToServer("subscribe", subscription);
}