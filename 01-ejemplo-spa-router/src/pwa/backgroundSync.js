import { BASE_URL } from "../services/apiService.js";
import { addToOutbox, getOutbox, removeFromOutbox } from "../services/dbService.js";

export const SYNC_TAG = "sync-outbox";
const ENDPOINT = `${BASE_URL}/posts`;

const FORCE_FALLBACK = new URLSearchParams(window.location.search).has("sin-sync");

const sentLog = [];
let retrying = false;

export function supportsBackgroundSync() {
  return !FORCE_FALLBACK && "serviceWorker" in navigator && "SyncManager" in window;
}

export function getSentLog() {
  return sentLog;
}

function logSent(title, via, serverId) {
  sentLog.unshift({
    time: new Date().toLocaleTimeString("es-MX"),
    title,
    via,
    serverId,
  });
  sentLog.splice(10);
  notifyChange();
}

function notifyChange() {
  window.dispatchEvent(new CustomEvent("outbox-changed"));
}

export async function queueMessage(payload) {
  await addToOutbox({ payload, createdAt: new Date().toISOString() });
  notifyChange();
  return requestSync();
}

async function requestSync() {
  if (supportsBackgroundSync()) {
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.sync.register(SYNC_TAG);
      return "background-sync";
    } catch (error) {
      console.warn("[PWA] No se pudo registrar el sync, uso el plan B: ", error);
    }
  }

  await retryNow();
  return "fallback";
}

export async function retryNow() {
  if (retrying) return { sent: 0, remaining: (await getOutbox()).length };
  retrying = true;

  let sent = 0;
  try {
    for (const item of await getOutbox()) {
      const response = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item.payload),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      await removeFromOutbox(item.id);
      logSent(item.payload.title, "Reintento manual (página)", data.id);
      sent++;
    }
  } catch (error) {
    console.warn("[PWA] Reintento fallido, la cola se conserva: ", error);
  } finally {
    retrying = false;
  }

  return { sent, remaining: (await getOutbox()).length };
}

export function initBackgroundSync() {

  navigator.serviceWorker?.addEventListener("message", (event) => {
    const { type, title, serverId } = event.data ?? {};
    if (type === "OUTBOX_SENT") {
      logSent(title, "Background Sync (Service Worker)", serverId);
    }
  });

  if (!supportsBackgroundSync()) {
    window.addEventListener("online", retryNow);
    retryNow();
  }

}