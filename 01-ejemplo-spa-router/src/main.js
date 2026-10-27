import Router from "./router/router.js";
import HomeView from "./views/HomeView.js";
import AboutView from "./views/AboutView.js";
import ContactView from "./views/ContactView.js";
import StorageView from "./views/StorageView.js";
import IndexedDBView from "./views/IndexedDBView.js";
import ServiceWorkerView from "./views/ServiceWorkerView.js";
import FetchLabView from "./views/FetchLabView.js";
import ManifestView from "./views/ManifestView.js";
import InstallView from "./views/InstallView.js";
import SyncView from "./views/SyncView.js";
import UbicacionView from "./views/LocationView.js";
import { registerServiceWorker } from "./pwa/registerSW.js";
import { initConnectionStatus } from "./pwa/connectionStatus.js";
import { initInstallPrompt } from "./pwa/installPrompt.js";
import { initInstallButton } from "./pwa/installButton.js";


// Definimos el "mapa de rutas" de la aplicación. Por ahora las tres vistas
// se importan de forma ESTÁTICA (se descargan siempre, al inicio).
const routes = [
  { path: "/", view: HomeView },
  { path: "/acerca", view: AboutView },
  { path: "/contacto", view: ContactView },
  { path: "/almacenamiento", view: StorageView },
  { path: "/notas", view: IndexedDBView },
  { path: "/service-worker", view: ServiceWorkerView },
  { path: "/fetch-cache", view: FetchLabView },
  { path: "/manifest", view: ManifestView },
  { path: "/instalacion", view: InstallView},
  { path: "/sincronizacion", view: SyncView },
  { path: "/ubicacion", view: UbicacionView }
];


// El shell (header, nav, footer) ya está en el HTML y no vuelve a tocarse.
// El router SOLO controla lo que ocurre dentro de #app-root: eso es el contenido.
const app = document.getElementById("app");
const router = new Router(routes, app);

initInstallPrompt();
router.init();
initConnectionStatus();
initInstallButton();

window.addEventListener("load", () => registerServiceWorker());
