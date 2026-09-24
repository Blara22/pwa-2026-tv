import { BASE_PATH } from "../config.js";
import { SW_URL, SW_SCOPE } from "../pwa/registerSW.js";

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
  if(!"serviceWorker" in navigator) {
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
    controlled: Boolean(navigator.serviceWorker.controller)
  };
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
  if (!statusBox || !scopeBox) return;

  const status = await getStatus();
  statusBox.innerHTML = renderStatus(status);
  scopeBox.innerHTML = renderScopeTable(status.scope);
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

document.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-sw-action]");
  if (!button || !("serviceWorker" in navigator)) return;

  const action = button.dataset.swAction; // "refresh" | "wide-scope" | "unregister"

  if (action === "refresh") await updatePanels();
  else if (action === "wide-scope") await tryWideScope();
  else if (action === "unregister") await unregisterServiceWorker();
});

export default async function ServiceWorkerView() {
  const status = await getStatus();

  return `
    <div class="card">
      <h2>Service Worker</h2>
      <p>Panel de diagnóstico. Compáralo con DevTools →
      <strong>Application → Service Workers</strong>.</p>
      <div id="sw-status">${renderStatus(status)}</div>
      <div class="storage-actions">
        <button type="button" data-sw-action="refresh">Actualizar estado</button>
        <button type="button" data-sw-action="unregister" class="btn-secundario">Dar de baja el SW</button>
      </div>
    </div>

    <div class="card">
      <h3>Verificador de scope</h3>
      <p>Una página queda bajo el control del SW solo si su URL
      <strong>empieza</strong> con el scope.</p>
      <div id="sw-scope-table">${renderScopeTable(status.scope)}</div>
    </div>

    <div class="card">
      <h3>Demo: scope inválido</h3>
      <p>Intentamos registrar el mismo <code>sw.js</code> pidiendo como scope
      <code>${PARENT_SCOPE}</code>, una carpeta por encima de donde vive el archivo.</p>
      <div class="storage-actions">
        <button type="button" data-sw-action="wide-scope">Probar scope más amplio</button>
      </div>
      <p id="sw-result" class="sw-result"></p>
    </div>
  `;
}