import renderActiveLink from "../components/NavBar.js";
import { BASE_PATH } from "../config.js";

/** Función auxiliar para simular tiempo de espera / latencia de red */
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default class Router {
  constructor(routes, rootElement) {
    this.routes = routes;
    this.root = rootElement;

    window.addEventListener("popstate", () => this.render());

    document.addEventListener("click", (event) => {
      const link = event.target.closest("[data-link]");
      if (!link) return;
      event.preventDefault();
      this.navigate(link.getAttribute("href"));
    });
  }

  navigate(path) {
    window.history.pushState({}, "", path);
    this.render();
  }

  /** Devuelve el marcado del Skeleton UI para mostrar mientras carga la vista */
  getSkeletonHTML() {
    return `
      <div class="skeleton-card">
        <div class="skeleton skeleton-title"></div>
        <div class="skeleton skeleton-line"></div>
        <div class="skeleton skeleton-line"></div>
        <div class="skeleton skeleton-line short"></div>
      </div>
    `;
  }

  async render() {
    const fullPath = window.location.pathname;
    const path = fullPath.replace(BASE_PATH, "") || "/";

    // 1. Inyectamos de inmediato el Skeleton en el Shell antes de resolver la vista
    this.root.innerHTML = this.getSkeletonHTML();

    // 2. Actualizamos la pestaña/enlace activo del menú
    renderActiveLink(path);

    await delay(800);

    const match = this.routes.find((route) => route.path === path);

    if (!match) {
      const { default: NotFoundView } = await import(
        "../views/NotFoundView.js"
      );
      this.root.innerHTML = NotFoundView();
      return;
    }

    // 3. Resolvemos la vista (soporta imports dinámicos y peticiones fetch)
    const html = await match.view();
    
    // 4. Reemplazamos el Skeleton con el contenido real de la vista
    this.root.innerHTML = html;

    document.title = `Demo SPA — ${path === "/" ? "Inicio" : path.slice(1)}`;
  }

  init() {
    this.render();
  }
}