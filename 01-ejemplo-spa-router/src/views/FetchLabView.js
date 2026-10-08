import { BASE_PATH } from "../config.js";

const DATA_URL = `${BASE_PATH}/data/productos.json`;
const NEWS_URL = `${BASE_PATH}/data/novedades.json`;
const API_GET_URL = "https://jsonplaceholder.typicode.com/posts/1";
const API_POST_URL = "https://jsonplaceholder.typicode.com/posts";
const MAX_LOG = 25;

const SOURCE_LABELS = {
  cache: `<span class="sw-ok">Caché (HIT)</span>`,
  network: `Red (MISS)`,
  updated: `<span class="sw-ok">Caché actualizada en segundo plano</span>`,
  fallback: `<span class="sw-no">Respuesta de emergencia (503)</span>`,
  ignored: `<small>Ignorada (el SW no responde)</small>`,
};

const fetchLog = [];

function buildLogHTML() {
  if (fetchLog.length === 0) {
    return `<p>Sin eventos todavía. Pulsa un botón o navega por la app.</p>`;
  }

  const rows = fetchLog
    .map(
      ({ time, method, path, strategy, source }) => `
        <tr>
          <td>${time}</td>
          <td>${method}</td>
          <td><small><code>${path}</code></small></td>
          <td><small>${strategy ?? "—"}</small></td>
          <td>${SOURCE_LABELS[source] ?? source}</td>
        </tr>
      `
    )
    .join("");

  return `
    <table class="storage-table">
      <thead>
        <tr><th>Hora</th><th>Método</th><th>Recurso</th><th>Estrategia</th><th>Resultado</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function renderLog() {
  const box = document.getElementById("lab-log");
  if (box) box.innerHTML = buildLogHTML();
}

navigator.serviceWorker?.addEventListener("message", (event) => {
  if (event.data?.type !== "FETCH_LOG") return;

  fetchLog.unshift({
    ...event.data,
    time: new Date().toLocaleTimeString("es-MX"),
  });
  fetchLog.splice(MAX_LOG);
  renderLog();
});

async function getCacheEntries() {
  if (!("caches" in window)) return [];

  const names = await caches.keys();
  const groups = await Promise.all(
    names.map(async (name) => {
      const cache = await caches.open(name);
      const requests = await cache.keys();
      return requests.map((request) => ({ cacheName: name, url: request.url }));
    })
  );
  return groups.flat();
}

function buildCacheHTML(entries) {
  if (entries.length === 0) {
    return `<p>No hay ninguna caché todavía.</p>`;
  }

  const rows = entries
    .map(
      ({ cacheName, url }) => `
        <tr>
          <td><code>${cacheName}</code></td>
          <td><small>${url.replace(window.location.origin, "")}</small></td>
          <td>
            <button type="button" class="btn-secundario"
              data-lab-action="delete-entry"
              data-cache="${cacheName}"
              data-url="${url}">Borrar</button>
          </td>
        </tr>
      `
    )
    .join("");

  return `
    <table class="storage-table">
      <thead>
        <tr><th>Caché</th><th>Recurso</th><th>Acción</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

async function renderCacheContent() {
  const box = document.getElementById("lab-cache");
  if (box) box.innerHTML = buildCacheHTML(await getCacheEntries());
}

function showResult(message) {
  const output = document.getElementById("lab-result");
  if (output) output.textContent = message;
}

async function timedFetch(label, url, options) {
  showResult(`${label}: pidiendo...`);
  const start = performance.now();

  try {
    const response = await fetch(url, options);
    const text = await response.text();
    const ms = Math.round(performance.now() - start);
    showResult(`${label} → ${response.status} en ${ms} ms\n${text.slice(0, 240)}`);
  } catch (error) {
    showResult(`${label} → ${error.name}: ${error.message}`);
  }
  await renderCacheContent();
}

async function deleteFromCache(cacheName, url) {
  const cache = await caches.open(cacheName);
  const deleted = await cache.delete(url);

  showResult(
    deleted
      ? `cache.delete() → true. Se eliminó ${url.replace(window.location.origin, "")} de ${cacheName}.`
      : "cache.delete() → false. Esa entrada no existía."
  );
  await renderCacheContent();
}

document.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-lab-action]");
  if (!button) return;

  const action = button.dataset.labAction;

  if (action === "get-local") {
    await timedFetch("GET productos.json", DATA_URL);
  } else if (action === "get-news") {
    await timedFetch("GET novedades.json", NEWS_URL);
  } else if (action === "get-api") {
    await timedFetch("GET API externa", API_GET_URL);
  } else if (action === "post-api") {
    await timedFetch("POST API externa", API_POST_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "demo", body: "hola", userId: 1 }),
    });
  } else if (action === "refresh-cache") {
    await renderCacheContent();
  } else if (action === "delete-entry") {
    await deleteFromCache(button.dataset.cache, button.dataset.url);
  } else if (action === "clear-log") {
    fetchLog.length = 0;
    renderLog();
  }
});

export default async function FetchLabView() {
  const entries = await getCacheEntries();

  return `
    <div class="card">
      <h2>Fetch y Cache API</h2>
      <p>Cada botón hace una petición distinta. Observa qué hace el SW con cada una.</p>
      <div class="storage-actions">
        <button type="button" data-lab-action="get-local">GET productos.json</button>
        <button type="button" data-lab-action="get-news" class="btn-secundario">GET novedades.json</button>
        <button type="button" data-lab-action="get-api" class="btn-secundario">GET API externa</button>
        <button type="button" data-lab-action="post-api" class="btn-secundario">POST API externa</button>
      </div>
      <pre id="lab-result" class="sw-result"></pre>
    </div>

    <div class="card">
      <h3>Registro de peticiones vistas por el SW</h3>
      <div id="lab-log">${buildLogHTML()}</div>
      <div class="storage-actions">
        <button type="button" data-lab-action="clear-log" class="btn-secundario">Limpiar registro</button>
      </div>
    </div>

    <div class="card">
      <h3>Contenido de Cache Storage</h3>
      <div id="lab-cache">${buildCacheHTML(entries)}</div>
      <div class="storage-actions">
        <button type="button" data-lab-action="refresh-cache" class="btn-secundario">Actualizar lista</button>
      </div>
    </div>
  `;
}
