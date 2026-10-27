import { SW_SCOPE } from "../pwa/registerSW.js";
import {
  canPromptInstall,
  promptInstall,
  isStandalone,
  getInstallHelp,
  getInstallLog,
} from "../pwa/installPrompt.js";

const yes = (text) => `<span class="sw-ok">${text}</span>`;
const no = (text) => `<span class="sw-no">${text}</span>`;

// Valores de "display" con los que Chromium considera la app instalable.
const INSTALLABLE_DISPLAYS = ["standalone", "fullscreen", "minimal-ui", "window-controls-overlay"];

async function readManifest() {
  const href = document.querySelector('link[rel="manifest"]')?.href;
  if (!href) return null;

  try {
    const response = await fetch(href);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error("[PWA] No se pudo leer el manifest: ", error);
    return null;
  }
}

// Chromium exige un ícono de 192×192 y otro de 512×512 declarados en "sizes".
function hasIcon(manifest, size) {
  return (manifest?.icons ?? []).some((icon) =>
    (icon.sizes ?? "").split(" ").includes(`${size}x${size}`)
  );
}

// Cada criterio es un par [descripción, ¿se cumple?]
async function evaluateCriteria() {
  const manifest = await readManifest();
  const registration = "serviceWorker" in navigator
    ? await navigator.serviceWorker.getRegistration(SW_SCOPE)
    : null;

  return [
    ["HTTPS o localhost (contexto seguro)", window.isSecureContext],
    ["&lt;link rel=\"manifest\"&gt; presente y JSON legible", Boolean(manifest)],
    ["<code>name</code> o <code>short_name</code>", Boolean(manifest?.name || manifest?.short_name)],
    ["<code>start_url</code>", Boolean(manifest?.start_url)],
    ["<code>display</code>: standalone, fullscreen, minimal-ui o window-controls-overlay", INSTALLABLE_DISPLAYS.includes(manifest?.display)],
    ["Ícono de 192×192", hasIcon(manifest, 192)],
    ["Ícono de 512×512", hasIcon(manifest, 512)],
    ["<code>prefer_related_applications</code> no es <code>true</code>", Boolean(manifest) && manifest.prefer_related_applications !== true],
    ["Service Worker registrado y activo", Boolean(registration?.active)],
    ["El Service Worker controla esta página", Boolean(navigator.serviceWorker?.controller)],
  ];
}

function renderCriteria(criteria) {
  const rows = criteria
    .map(([label, ok]) => `<tr><td>${label}</td><td>${ok ? yes("✔ Cumple") : no("✘ Falta")}</td></tr>`)
    .join("");

  return `
    <table class="storage-table">
      <thead><tr><th>Criterio</th><th>Estado</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

// Estado dinámico: lo que NO se puede saber leyendo el manifest
function renderStatus() {
  const ready = canPromptInstall();
  const rows = [
    ["¿Se ejecuta como app instalada?", isStandalone() ? yes("Sí") : no("No (pestaña del navegador)")],
    ["Evento <code>beforeinstallprompt</code> guardado", ready ? yes("Sí, listo para instalar") : no("No")],
    ["Qué hacer en este dispositivo", getInstallHelp()],
  ];

  return `
    <table class="storage-table">
      <tbody>${rows.map(([label, value]) => `<tr><td>${label}</td><td>${value}</td></tr>`).join("")}</tbody>
    </table>
    <div class="storage-actions install-actions">
      <button type="button" data-install-action="install" ${ready ? "" : "disabled"}>Instalar app</button>
      <button type="button" data-install-action="refresh" class="btn-secundario">Volver a evaluar</button>
    </div>
  `;
}

function renderLog() {
  const log = getInstallLog();
  if (log.length === 0) {
    return `<p>Aún no se ha recibido ningún evento de instalación.</p>`;
  }

  const rows = log
    .map(({ time, type, detail }) => `<tr><td>${time}</td><td><code>${type}</code></td><td>${detail}</td></tr>`)
    .join("");

  return `
    <table class="storage-table">
      <thead><tr><th>Hora</th><th>Evento</th><th>Detalle</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

// Refrescar los paneles sin volver a renderizar toda la vista
async function updatePanels() {
  const criteriaBox = document.getElementById("install-criteria");
  const statusBox = document.getElementById("install-status");
  const logBox = document.getElementById("install-log");
  if (!criteriaBox || !statusBox || !logBox) return;

  criteriaBox.innerHTML = renderCriteria(await evaluateCriteria());
  statusBox.innerHTML = renderStatus();
  logBox.innerHTML = renderLog();
}

// Cuando installPrompt.js avisa de un cambio, repintamos (si la vista está abierta)
window.addEventListener("install-state-changed", updatePanels);

document.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-install-action]");
  if (!button) return;

  if (button.dataset.installAction === "install") await promptInstall();
  else await updatePanels();
});

export default async function InstallView() {
  const criteria = await evaluateCriteria();

  return `
    <div class="card">
      <h2>Instalación (A2HS)</h2>
      <p>Diagnóstico de los criterios de instalación. Compáralo con DevTools → <strong>Application → Manifest</strong> (sección <em>Installability</em>).</p>
      <div id="install-criteria">${renderCriteria(criteria)}</div>
    </div>

    <div class="card">
      <h3>Estado de la instalación</h3>
      <div id="install-status">${renderStatus()}</div>
    </div>

    <div class="card">
      <h3>Bitácora de eventos</h3>
      <div id="install-log">${renderLog()}</div>
    </div>
  `;
}
