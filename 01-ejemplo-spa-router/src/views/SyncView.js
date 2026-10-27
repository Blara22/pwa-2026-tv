import { queueMessage } from "../pwa/backgroundSync.js";
import { getOutbox } from "../services/dbService.js";
import { retryNow, supportsBackgroundSync, getSentLog } from "../pwa/backgroundSync.js";

function showStatus(message) {
  const output = document.getElementById("sync-status");
  if (output) output.textContent = message;
}

const esc = (value) =>
  String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function renderOutbox(items) {
  if (items.length === 0) {
    return `<p class="storage-meta">Cola vacía: no hay nada pendiente de enviar.</p>`;
  }

  return `<div class="notes-grid">${items
    .map(
      (item) => `
      <div class="note-card">
        <span class="note-category">pendiente</span>
        <p><strong>${esc(item.payload.title)}</strong><br>${esc(item.payload.body)}</p>
        <small>${new Date(item.createdAt).toLocaleTimeString("es-MX")}</small>
      </div>
    `
    )
    .join("")}</div>`;
}

function renderSupport() {
  return supportsBackgroundSync()
    ? `<span class="sw-ok">✔ Este navegador soporta Background Sync.</span> El Service Worker enviará la cola cuando regrese la conexión, incluso con la pestaña cerrada.`
    : `<span class="sw-no">✘ Background Sync no está disponible aquí</span> (Safari/iOS, Firefox o modo <code>?sin-sync</code>). Plan B: la página reintenta al volver la conexión y con el botón.`;
}

function renderSent() {
  const log = getSentLog();
  if (log.length === 0) {
    return `<p class="storage-meta">Todavía no se ha confirmado ningún envío.</p>`;
  }

  const rows = log
    .map(
      ({ time, title, via, serverId }) =>
        `<tr><td>${time}</td><td>${esc(title)}</td><td><small>${via}</small></td><td>${serverId}</td></tr>`
    )
    .join("");

  return `
    <table class="storage-table">
      <thead><tr><th>Hora</th><th>Mensaje</th><th>Enviado por</th><th>Id</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

async function updatePanels() {
  const outboxBox = document.getElementById("sync-outbox");
  const sentBox = document.getElementById("sync-sent");
  if (!outboxBox || !sentBox) return; // el usuario ya navegó a otra vista

  outboxBox.innerHTML = renderOutbox(await getOutbox());
  sentBox.innerHTML = renderSent();
}

window.addEventListener("outbox-changed", updatePanels);

document.addEventListener("submit", async (event) => {
  const form = event.target.closest("#sync-form");
  if (!form) return;

  event.preventDefault();

  const title = document.getElementById("sync-title").value.trim();
  const body = document.getElementById("sync-body").value.trim();

  if (!title || !body) return;

  showStatus("Enviando...");

  try {
    const mode = await queueMessage({ title, body, userId: 1 });
    form.reset();
    showStatus(
      mode === "background-sync"
        ? "Guardado en la cola. El navegador lo enviará en cuanto haya conexión."
        : "Guardado en la cola. Plan B activo: se reintenta ahora, al volver la conexión o con el botón."
    );
  } catch (error) {
    console.error("No se pudo guardar el mensaje en la cola:", error);
    showStatus("No se pudo guardar el mensaje en la cola.");
  }
});

document.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-sync-action]");
  if (!button) return;

  if (button.dataset.syncAction === "retry") {
    showStatus("Reintentando el envío...");
    const { sent, remaining } = await retryNow();
    showStatus(`Reintento terminado: ${sent} enviado(s), ${remaining} pendiente(s).`);
  }
});

export default async function SyncView() {

  const pending = await getOutbox();

  return `
    <div class="card">
      <h2>Background Sync</h2>
      <p>Escribe un mensaje y envíalo. Si no hay conexión, se guarda en una cola
      (IndexedDB) y se envía cuando regrese internet.</p>
      <p id="sync-support">${renderSupport()}</p>
    </div>

    <div class="card">
      <h3>Nuevo mensaje</h3>
      <form id="sync-form">
        <input type="text" id="sync-title" placeholder="Asunto" />
        <textarea id="sync-body" rows="3" placeholder="Mensaje"></textarea>
        <div class="storage-actions">
          <button type="submit">Enviar</button>
        </div>
      </form>
      <p id="sync-status" class="sw-result"></p>
    </div>

    <div class="card">
      <h3>Cola de salida (IndexedDB)</h3>
      <div id="sync-outbox">${renderOutbox(pending)}</div>
      <div class="storage-actions sync-actions">
        <button type="button" data-sync-action="retry" class="btn-secundario">Reintentar ahora</button>
      </div>
    </div>

    <div class="card">
      <h3>Envíos confirmados</h3>
      <div id="sync-sent">${renderSent()}</div>
    </div>
  `;
  }
