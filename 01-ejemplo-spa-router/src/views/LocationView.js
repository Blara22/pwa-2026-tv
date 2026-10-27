import {
  supportsGeolocation,
  getCurrentPosition,
  getLastPosition,
  describeError,
  buildMapUrl,
  getPermissionState,
  onPermissionChange,
  startWatch,
  stopWatch
} from '../pwa/geolocation.js';
import { supportsShare, shareContent } from "../pwa/share.js";
import { BASE_PATH } from "../config.js";

const esc = (value) =>
  String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function setHtml(id, html) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
}

function renderPosition(position) {
  if (!position) {
    return `<p class="storage-meta">Todavía no hay ninguna lectura.</p>`;
  }

  const rows = [
    ["Latitud", position.latitude.toFixed(5)],
    ["Longitud", position.longitude.toFixed(5)],
    ["Precisión", `± ${Math.round(position.accuracy)} m`],
    ["Hora de la lectura", new Date(position.timestamp).toLocaleTimeString("es-MX")],
  ];

  return `
    <table class="storage-table">
      <tbody>${rows.map(([label, value]) => `<tr><td>${label}</td><td>${value}</td></tr>`).join("")}</tbody>
    </table>
    <p><a href="${esc(buildMapUrl(position))}" target="_blank" rel="noopener">Ver en el mapa</a></p>
  `;
}

async function locate() {
  if (!supportsGeolocation()) {
    setText("geo-status", "Este navegador no soporta la Geolocation API.");
    return;
  }

  setText("geo-status", "Solicitando ubicación... si el navegador pregunta, acepta el permiso.");

  try {
    const position = await getCurrentPosition();
    setHtml("geo-result", renderPosition(position));
    setText("geo-status", "Ubicación obtenida.");
  } catch (error) {
    console.warn("[PWA] No se pudo obtener la ubicación: ", error);
    setText("geo-status", describeError(error));
  }
}

//Mostrar si se tiene permiso en la vista
const PERMISSION_LABELS = {
  granted: `<span class="sw-ok">Concedido</span>`,
  denied: `<span class="sw-no">Denegado</span>`,
  prompt: "Pendiente: el navegador preguntará al pedir la ubicación",
  unknown: "No se puede consultar en este navegador",
};

function renderPermission(state) {
  return PERMISSION_LABELS[state] ?? PERMISSION_LABELS.unknown;
}

//Tracking: Seguimiento continuo
let updates = 0;

function startTracking() {
  if (!supportsGeolocation()) {
    setText("geo-status", "Este navegador no soporta la Geolocation API.");
    return;
  }

  updates = 0;
  setText("geo-watch-status", "Seguimiento activo: esperando la primera lectura...");

  startWatch(
    (position) => {
      // Si el usuario ya salió de esta vista, detenemos el watch para no gastar batería.
      if (!document.getElementById("geo-watch-status")) {
        stopWatch();
        return;
      }

      updates++;
      setText("geo-status", "");
      setHtml("geo-result", renderPosition(position));
      setText("geo-watch-status", `Seguimiento activo: ${updates} actualización(es).`);
    },
    (error) => {
      setText("geo-status", describeError(error));

      // Los errores 2 y 3 pueden ser pasajeros (túnel, sin señal): el watch sigue
      // activo y se recupera solo. Con permiso denegado (1) ya no tiene caso seguir.
      if (error.code === 1) stopTracking();
    }
  );
}

function stopTracking() {
  stopWatch();
  setText("geo-watch-status", "Seguimiento detenido.");
}

document.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-geo-action]");
  if (!button) return;

  const action = button.dataset.geoAction;
  if (action === "locate") await locate();
  if (action === "watch-start") startTracking();
  if (action === "watch-stop") stopTracking();
});


//Web Share
const SHARE_MESSAGES = {
  shared: "Contenido compartido.",
  cancelled: "Cerraste el menú de compartir.",
  copied: "Este navegador no tiene menú de compartir: el contenido se copió al portapapeles.",
};

function renderShareSupport() {
  return supportsShare()
    ? `<span class="sw-ok">✔ Este navegador abre el menú de compartir del sistema.</span>`
    : `<span class="sw-no">✘ <code>navigator.share</code> no está disponible aquí.</span> Plan B: copiar al portapapeles.`;
}

document.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-share-action]");
  if (!button) return;

  // Armamos los datos de forma SÍNCRONA: así navigator.share() se llama
  // dentro del mismo gesto del usuario, sin awaits lentos de por medio.
  let data;

  if (button.dataset.shareAction === "app") {
    data = {
      title: "Demo SPA",
      text: "Mira esta PWA de ejemplo",
      url: `${window.location.origin}${BASE_PATH}/`,
    };
  } else {
    const position = getLastPosition();
    if (!position) {
      setText("share-status", "Primero obtén tu ubicación en la tarjeta de arriba.");
      return;
    }

    data = {
      title: "Mi ubicación",
      text: `Estoy aquí (precisión ± ${Math.round(position.accuracy)} m)`,
      url: buildMapUrl(position),
    };
  }

  try {
    const result = await shareContent(data);
    setText("share-status", SHARE_MESSAGES[result]);
  } catch (error) {
    console.error("[PWA] No se pudo compartir: ", error);
    setText("share-status", `No se pudo compartir (${error.name}).`);
  }
});

export default async function UbicacionView() {
  const permission = await getPermissionState();
  onPermissionChange((state) => setHtml("geo-permission", renderPermission(state)));
  
  return `
    <div class="card">
      <h2>Ubicación y compartir</h2>
      <p>Dos capacidades del dispositivo que el navegador solo entrega con un
      gesto o un permiso explícito del usuario.</p>
    </div>

    <div class="card">
      <h3>Geolocation API</h3>
      <p>Permiso de ubicación: <span id="geo-permission">${renderPermission(permission)}</span></p>
      <div class="storage-actions geo-actions">
        <button type="button" data-geo-action="locate">Obtener mi ubicación</button>
        <button type="button" data-geo-action="watch-start" class="btn-secundario">Iniciar seguimiento</button>
        <button type="button" data-geo-action="watch-stop" class="btn-secundario">Detener seguimiento</button>
      </div>
      <p id="geo-status" class="sw-result"></p>
      <p id="geo-watch-status" class="sw-result"></p>
      <div id="geo-result">${renderPosition(getLastPosition())}</div>
    </div>

    <div class="card">
      <h3>Web Share API</h3>
      <p id="share-support">${renderShareSupport()}</p>
      <div class="storage-actions share-actions">
        <button type="button" data-share-action="app">Compartir esta app</button>
        <button type="button" data-share-action="location" class="btn-secundario">Compartir mi ubicación</button>
      </div>
      <p id="share-status" class="sw-result"></p>
    </div>
  `;
}
