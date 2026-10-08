import { BASE_PATH } from "../config.js";
import { SW_URL, SW_SCOPE, activateWaitingSW } from "../pwa/registerSW.js";

const PARENT_SCOPE = BASE_PATH.slice(0, BASE_PATH.lastIndexOf("/") + 1);

const SCOPE_TEST_PATHS = [
  { label: "Raíz de la app", path: `${BASE_PATH}/` },
  { label: "Ruta del router", path: `${BASE_PATH}/acerca` },
  { label: "Archivo de la app", path: `${BASE_PATH}/src/main.js` },
  { label: "Raíz SIN diagonal final", path: BASE_PATH },
  { label: "Otro proyecto del mismo dominio", path: `${PARENT_SCOPE}otro-proyecto/` },
  { label: "Raíz del dominio", path: "/" },
];

async function getStatus() {
  if (!("serviceWorker" in navigator)) {
    return { supported: false };
  }

  const registration = await navigator.serviceWorker.getRegistration(SW_SCOPE);

  const worker =
    registration?.active ?? registration?.waiting ?? registration?.installing ?? null;

  return {
    supported: true,
    secure: window.isSecureContext,
    registered: Boolean(registration),
    scope: registration?.scope ?? null,
    scriptURL: worker?.scriptURL ?? null,
    state: worker?.state ?? null,
    controlled: Boolean(navigator.serviceWorker.controller),
    installing: Boolean(registration?.installing),
    waiting: Boolean(registration?.waiting),
    active: Boolean(registration?.active),
    registration,
  };
}

async function getCacheInfo() {
  if (!("caches" in window)) return [];

  const names = await caches.keys();
  return Promise.all(
    names.map(async (name) => {
      const cache = await caches.open(name);
      const keys = await cache.keys();
      return { name, count: keys.length, urls: keys.map((req) => req.url) };
    })
  );
}

function renderLifecycle(status) {
  const slot = (label, present) => `
    <div class="sw-slot ${present ? "sw-slot-on" : ""}">
      <strong>${label}</strong>
      <span>${present ? yes("presente") : "—"}</span>
    </div>
  `;

  return `
    <div class="sw-lifecycle">
      ${slot("installing", status.installing)}
      ${slot("waiting", status.waiting)}
      ${slot("active", status.active)}
    </div>
  `;
}

function renderCacheTable(caches) {
  if (caches.length === 0) {
    return `<p>No hay ninguna caché todavía.</p>`;
  }

  const rows = caches
    .map(
      ({ name, count, urls }) => `
        <tr>
          <td><code>${name}</code></td>
          <td>${count}</td>
          <td><small>${urls.map((u) => u.replace(window.location.origin, "")).join("<br>")}</small></td>
        </tr>
      `
    )
    .join("");

  return `
    <table class="storage-table">
      <thead>
        <tr><th>Caché</th><th># recursos</th><th>Contenido</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

const yes = (text) => `<span class="sw-ok">${text}</span>`;
const no = (text) => `<span class="sw-no">${text}</span>`;

function renderStatus(status) {
  if (!status.supported) {
    return `<p>${no("Este navegador no soporta Service Workers.")}</p>`;
  }

  const rows = [
    ["¿Contexto seguro (HTTPS o localhost)?", status.secure ? yes("Sí") : no("No")],
    ["¿SW registrado?", status.registered ? yes("Sí") : no("No")],
    ["Scope", status.scope ? `<code>${status.scope}</code>` : "—"],
    ["Script", status.scriptURL ? `<code>${status.scriptURL}</code>` : "—"],
    ["Estado del worker", status.state ?? "—"],
    [
      "¿Controla ESTA página?",
      status.controlled ? yes("Sí") : no("No (recarga con F5)"),
    ],
  ];

  return `
    <table class="storage-table">
      <tbody>
        ${rows.map(([label, value]) => `<tr><td>${label}</td><td>${value}</td></tr>`).join("")}
      </tbody>
    </table>
  `;
}

function renderScopeTable(scope) {
  const effectiveScope = scope ?? new URL(SW_SCOPE, window.location.origin).href;

  const rows = SCOPE_TEST_PATHS.map(({ label, path }) => {
    const url = new URL(path, window.location.origin).href;
    const inside = url.startsWith(effectiveScope);

    return `
      <tr>
        <td>${label}</td>
        <td><code>${path}</code></td>
        <td>${inside ? yes("Dentro") : no("Fuera")}</td>
      </tr>
    `;
  }).join("");

  return `
    <table class="storage-table">
      <thead>
        <tr><th>Caso</th><th>Ruta</th><th>¿Dentro del scope?</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

async function updatePanels() {
  const statusBox = document.getElementById("sw-status");
  const scopeBox = document.getElementById("sw-scope-table");
  const lifecycleBox = document.getElementById("sw-lifecycle-box");
  const cacheBox = document.getElementById("sw-cache-table");
  if (!statusBox || !scopeBox) return;

  const status = await getStatus();
  statusBox.innerHTML = renderStatus(status);
  scopeBox.innerHTML = renderScopeTable(status.scope);
  if (lifecycleBox) lifecycleBox.innerHTML = renderLifecycle(status);
  if (cacheBox) cacheBox.innerHTML = renderCacheTable(await getCacheInfo());
}

function showResult(message) {
  const output = document.getElementById("sw-result");
  if (output) output.textContent = message;
}

async function tryWideScope() {
  showResult(`Registrando ${SW_URL} con scope ${PARENT_SCOPE} ...`);

  try {
    await navigator.serviceWorker.register(SW_URL, { scope: PARENT_SCOPE });
    showResult("El navegador aceptó el registro (revisa Application → Service Workers).");
  } catch (error) {
    showResult(`${error.name}: ${error.message}`);
  }
}

async function unregisterServiceWorker() {
  const registration = await navigator.serviceWorker.getRegistration(SW_SCOPE);

  if (!registration) {
    showResult("No hay ningún SW registrado en este scope.");
    return;
  }

  const removed = await registration.unregister();
  showResult(
    removed
      ? "SW dado de baja. Esta pestaña sigue controlada hasta que la recargues (F5); al recargar se registrará de nuevo."
      : "No se pudo dar de baja el SW."
  );
  await updatePanels();
}

async function checkForUpdate() {
  const registration = await navigator.serviceWorker.getRegistration(SW_SCOPE);

  if (!registration) {
    showResult("No hay ningún SW registrado en este scope.");
    return;
  }

  await registration.update();
  showResult("Búsqueda terminada. Si sw.js cambió, aparecerá el aviso de nueva versión.");
  await updatePanels();
}

document.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-sw-action]");
  if (!button || !("serviceWorker" in navigator)) return;

  const action = button.dataset.swAction; // "refresh" | "wide-scope" | "unregister"

  if (action === "refresh") await updatePanels();
  else if (action === "wide-scope") await tryWideScope();
  else if (action === "unregister") await unregisterServiceWorker();
  else if (action === "check-update") await checkForUpdate();
  else if (action === "activate-update") {
    activateWaitingSW(pendingRegistration);
    document.getElementById("sw-update-banner")?.setAttribute("hidden", "");
  }
});

let pendingRegistration = null;

function showUpdateBanner(registration) {
  pendingRegistration = registration;
  const banner = document.getElementById("sw-update-banner");
  if (banner) banner.hidden = false;
}

window.addEventListener("sw-update-available", (event) => {
  showUpdateBanner(event.detail.registration);
});

export default async function ServiceWorkerView() {
  const status = await getStatus();

  const cacheInfo = await getCacheInfo();

  if (status.waiting && status.registration) {
    pendingRegistration = status.registration;
  }

  const isPending = Boolean(status.waiting || pendingRegistration);

  return `
    <div id="sw-update-banner" class="sw-update-banner" ${isPending ? "" : "hidden"}>
      <span>Hay una nueva versión de la app instalada y en espera.</span>
      <button type="button" data-sw-action="activate-update">Actualizar ahora</button>
    </div>

    <div class="card">
      <h2>Service Worker</h2>
      <p>Panel de diagnóstico. Compáralo con DevTools → <strong>Application → Service Workers</strong>.</p>
      <div id="sw-status">${renderStatus(status)}</div>
      <div class="storage-actions">
        <button type="button" data-sw-action="refresh">Actualizar estado</button>
        <button type="button" data-sw-action="check-update" class="btn-secundario">Buscar actualización</button>
        <button type="button" data-sw-action="unregister" class="btn-secundario">Dar de baja el SW</button>
      </div>
      <p id="sw-result" class="sw-result"></p>
    </div>

    <div class="card">
      <h3>Ciclo de vida</h3>
      <div id="sw-lifecycle-box">${renderLifecycle(status)}</div>
    </div>

    <div class="card">
      <h3>Cache Storage</h3>
      <div id="sw-cache-table">${renderCacheTable(cacheInfo)}</div>
    </div>

    <div class="card">
      <h3>Verificador de scope</h3>
      <div id="sw-scope-table">${renderScopeTable(status.scope)}</div>
    </div>
  `;
}