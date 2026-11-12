export function supportsBadge() {
  return "setAppBadge" in navigator && "clearAppBadge" in navigator;
}

export async function setBadge(count) {
  if (!supportsBadge()) return false;

  try {
    if (count > 0) await navigator.setAppBadge(count);
    else await navigator.clearAppBadge();
    return true;
  } catch (error) {
    console.warn("[PWA] No se pudo actualizar la insignia: ", error);
    return false;
  }
}