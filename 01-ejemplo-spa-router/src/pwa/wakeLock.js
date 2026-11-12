let sentinel = null;
let wanted = false;

export function supportsWakeLock() {
  return "wakeLock" in navigator;
}

export function isWakeLockActive() {
  return sentinel !== null && !sentinel.released;
}

function notifyChange() {
  window.dispatchEvent(
    new CustomEvent("wakelock-changed", { detail: { active: isWakeLockActive() } })
  );
}

async function acquire() {
  if (isWakeLockActive()) return true;

  try {
    const lock = await navigator.wakeLock.request("screen");
    sentinel = lock;

    lock.addEventListener("release", () => {
      if (sentinel === lock) sentinel = null;
      notifyChange();
    });

    notifyChange();
    return true;
  } catch (error) {
    console.warn(`[PWA] No se pudo activar el Wake Lock (${error.name}): `, error.message);
    return false;
  }
}

export async function requestWakeLock() {
  if (!supportsWakeLock()) return false;
  wanted = true;
  return acquire();
}

export async function releaseWakeLock() {
  wanted = false;
  if (sentinel) await sentinel.release();
}

document.addEventListener("visibilitychange", () => {
  if (wanted && document.visibilityState === "visible") acquire();
});