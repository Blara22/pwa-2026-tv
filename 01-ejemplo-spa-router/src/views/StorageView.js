import { setCookie, getCookie, deleteCookie } from "../services/cookieService.js";

const COOKIE_KEY = "demo_cookie";
const SESSION_KEY = "demo_session";
const LOCAL_KEY = "demo_local";

function readCurrentStatus() {
  return {
    cookie: getCookie(COOKIE_KEY),
    session: sessionStorage.getItem(SESSION_KEY),
    local: localStorage.getItem(LOCAL_KEY)
  }
}

function updateScreenValues() {
  const status = readCurrentStatus();

  document.getElementById("cookie-value").textContent = status.cookie ?? "(vacío)";
  document.getElementById("session-value").textContent = status.session ?? "(vacío)";
  document.getElementById("local-value").textContent = status.local ?? "(vacío)";
}

document.addEventListener("click", (event) =>  {
  const boton = event.target.closest("[data-storage-action");
  console.log(boton);
  if(!boton) return;

  const action = boton.dataset.storageAction; // "save" | "delete"
  const type = boton.dataset.storageType; //"cookie"  | "session" | "local"

  if(action === 'save') {
    saveInStorage(type);
  } else {
    deleteFromStorage(type);
  }
})

function deleteFromStorage(type) {
  if(type === 'cookie') deleteCookie(COOKIE_KEY)
  else if (type === 'session') sessionStorage.removeItem(SESSION_KEY)
  else if(type === 'local') localStorage.removeItem(LOCAL_KEY)

  updateScreenValues();
}  

function saveInStorage(type) {
  const input = document.getElementById(`input-${type}`);
  const value = input.value.trim();
  if(!value) return;

  if(type === 'cookie') {
    setCookie(COOKIE_KEY, value, 7);

    if(getCookie(COOKIE_KEY) !== value) {
      alert("El navegador tiene las cookies bloqueadas para este sitio. Este valor no se guardó.");
      return;
    }
  } else {
    const storage = type === 'session' ? sessionStorage : localStorage;
    const key = type === 'session' ? SESSION_KEY : LOCAL_KEY;

    try {
      storage.setItem(key, value);
    }catch(error) {
      console.error(`No se pudo guardar en ${type}Storage:`, error);
      alert(storageErrorMessage(error));
      return;
    }
  }

  input.value = "";
  updateScreenValues();

}

function storageErrorMessage(error) {
  const isQuotaExceeded = error instanceof DOMException && (error.name === "QuotaExceededError");

  if(isQuotaExceeded) {
    return "Se llenó el espacio disponible para guardar datos en este sitio";
  }

  if(error.name === "SecurityError") {
    return "El navegador tiene bloqueado el almacenamiento.";
  }

  return "No se pudo guardar el dato en el almacenamiento del navegador.";
}

export default function StorageView() {
  const status = readCurrentStatus();
  return `
    <div class="card">
      <h2>Almacenamiento en el navegador</h2>
      <p>Guarda un valor en cada mecanismo, recarga la página (F5) o abre esta
      misma URL en una pestaña nueva, y observa qué sobrevive y qué no. Abre
      las DevTools → pestaña <strong>Application</strong> para ver los datos
      "por dentro", y la pestaña <strong>Network</strong> para confirmar que
      solo la cookie viaja en las peticiones HTTP.</p>
    </div>

    <div class="storage-grid">

      <div class="card storage-card">
        <h3>Cookie</h3>
        <p class="storage-meta">Expira en 7 días · viaja al servidor en cada request</p>
        <p>Valor actual: <strong id="cookie-value">${status.cookie ?? "(vacío)"}</strong></p>
        <input type="text" id="input-cookie" placeholder="Escribe un valor..." />
        <div class="storage-actions">
          <button data-storage-action="save" data-storage-type="cookie">Guardar</button>
          <button data-storage-action="delete" data-storage-type="cookie" class="btn-secundario">Eliminar</button>
        </div>
      </div>

      <div class="card storage-card">
        <h3>sessionStorage</h3>
        <p class="storage-meta">Se borra al cerrar la pestaña · alcance: solo esta pestaña</p>
        <p>Valor actual: <strong id="session-value">${status.session ?? "(vacío)"}</strong></p>
        <input type="text" id="input-session" placeholder="Escribe un valor..." />
        <div class="storage-actions">
          <button data-storage-action="save" data-storage-type="session">Guardar</button>
          <button data-storage-action="delete" data-storage-type="session" class="btn-secundario">Eliminar</button>
        </div>
      </div>

      <div class="card storage-card">
        <h3>localStorage</h3>
        <p class="storage-meta">No expira · alcance: todas las pestañas del origen</p>
        <p>Valor actual: <strong id="local-value">${status.local ?? "(vacío)"}</strong></p>
        <input type="text" id="input-local" placeholder="Escribe un valor..." />
        <div class="storage-actions">
          <button data-storage-action="save" data-storage-type="local">Guardar</button>
          <button data-storage-action="delete" data-storage-type="local" class="btn-secundario">Eliminar</button>
        </div>
      </div>

    </div>

    <div class="card">
      <h3>Comparación rápida</h3>
      <table class="storage-table">
        <thead>
          <tr>
            <th>Criterio</th>
            <th>Cookie</th>
            <th>sessionStorage</th>
            <th>localStorage</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Persistencia</td>
            <td>Configurable (aquí: 7 días)</td>
            <td>Hasta cerrar la pestaña</td>
            <td>Indefinida</td>
          </tr>
          <tr>
            <td>Tamaño máximo</td>
            <td>~4 KB</td>
            <td>~5-10 MB</td>
            <td>~5-10 MB</td>
          </tr>
          <tr>
            <td>Alcance</td>
            <td>Dominio + path</td>
            <td>Solo esta pestaña</td>
            <td>Todas las pestañas del origen</td>
          </tr>
          <tr>
            <td>¿Viaja al servidor?</td>
            <td>Sí, en cada petición</td>
            <td>No</td>
            <td>No</td>
          </tr>
        </tbody>
      </table>
    </div>
  `;
}
