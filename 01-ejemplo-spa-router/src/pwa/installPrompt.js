let deferredPrompt = null;
const installLog = [];

function notify(type, detail = "") {
  installLog.unshift({ time: new Date().toLocaleTimeString("es-MX"), type, detail });
  console.log(`[PWA] ${type} => ${detail}`);
  window.dispatchEvent(new CustomEvent("install-state-changed"));
}

export function initInstallPrompt() {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event;
    notify("beforeinstallprompt", "Evento capturado: la app es instalable");
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    notify("appinstalled", "El usuario completó la instalación");
  });
}

export function canPromptInstall() {
  return deferredPrompt !== null;
}

export async function promptInstall() {
  if (!deferredPrompt) return null;

  const promptEvent = deferredPrompt;
  deferredPrompt = null;

  promptEvent.prompt();
  const { outcome } = await promptEvent.userChoice;
  notify("userChoice", outcome === "accepted" ? "El usuario aceptó instalar" : "El usuario descartó el diálogo");
  return outcome;
}

const INSTALLED_DISPLAY_MODES = ["standalone", "fullscreen", "minimal-ui", "window-controls-overlay"];

export function isStandalone() {
  if (window.navigator.standalone === true) return true;
  return INSTALLED_DISPLAY_MODES.some(
    (mode) => window.matchMedia(`(display-mode: ${mode})`).matches
  );
}

export function isIOS() {
  const ua = navigator.userAgent;
  return /iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
}

export function getInstallHelp() {
  if (isStandalone()) return "La app ya se está ejecutando como aplicación instalada.";
  if (canPromptInstall()) return "Tu navegador permite instalar con un clic: usa el botón «Instalar app».";
  if (isIOS()) return "En iPhone/iPad: botón Compartir → «Agregar a pantalla de inicio».";
  return "No hay evento de instalación disponible. Puede que la app ya esté instalada, que el navegador no lo soporte (Firefox de escritorio; en Safari de macOS: Archivo → Agregar al Dock) o que falte algún criterio: revisa DevTools → Application → Manifest.";
}

export function getInstallLog() {
  return installLog;
}