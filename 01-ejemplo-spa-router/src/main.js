import Router from "./router/router.js";
import HomeView from "./views/HomeView.js";
import AboutView from "./views/AboutView.js";
import ContactView from "./views/ContactView.js";
import StorageView from "./views/StorageView.js";
import IndexedDBView from "./views/IndexedDBView.js";
import { registerServiceWorker } from "./pwa/registerSW.js";
import ServiceWorkerView from "./views/ServiceWorkerView.js";
import FetchLabView from "./views/FetchLabView.js";

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

];


// El shell (header, nav, footer) ya está en el HTML y no vuelve a tocarse.
// El router SOLO controla lo que ocurre dentro de #app-root: eso es el contenido.
const app = document.getElementById("app");
const router = new Router(routes, app);

router.init();

window.addEventListener("load", () => registerServiceWorker());
