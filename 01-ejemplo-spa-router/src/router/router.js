import renderActiveLink from "../components/NavBar.js";
import { BASE_PATH } from "../config.js";
import { observeLazyComponents } from "../components/lazyComponents.js";

export default class Router {
  constructor(routes, rootElement) {
    this.routes = routes;
    this.root = rootElement;
    this.renderId = 0;

    window.addEventListener("popstate", () => this.render());

    document.addEventListener("click", (event) => {
      const link = event.target.closest("[data-link]");
      if (!link) return;
      event.preventDefault();
      this.navigate(link.getAttribute("href"));
    });

    const prefetch = (event) => {
      const link = event.target.closest?.("[data-link]");
      if (!link) return;

      const path = new URL(link.getAttribute("href"), window.location.origin)
        .pathname.replace(BASE_PATH, "") || "/";

      this.matchRoute(path)?.load?.().catch(() => { });
    };
    document.addEventListener("pointerover", prefetch, { passive: true });
    document.addEventListener("focusin", prefetch);
  }

  navigate(path) {
    window.history.pushState({}, "", path);
    this.render();
  }

  matchRoute(path) {
    return this.routes.find((route) => route.path === path);
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
    const renderId = ++this.renderId;
    const fullPath = window.location.pathname;
    const path = fullPath.replace(BASE_PATH, "") || "/";

    // 1. Inyectamos de inmediato el Skeleton en el Shell antes de resolver la vista
    this.root.innerHTML = this.getSkeletonHTML();

    // 2. Actualizamos la pestaña/enlace activo del menú
    renderActiveLink(path);

    const match = this.matchRoute(path);

    if (!match) {
      const { default: NotFoundView } = await import(
        "../views/NotFoundView.js"
      );
      this.root.innerHTML = NotFoundView();
      return;
    }

    // 3. Resolvemos la vista (soporta imports dinámicos y peticiones fetch)
    let html;
    try {
      const view = match.view ?? (await match.load()).default;
      html = await view();
    } catch (error) {
      console.error("[Router] No se pudo cargar la vista: ", error);
      html = this.getLoadErrorHTML();
    }

    if (renderId !== this.renderId) return;
    
    // 4. Reemplazamos el Skeleton con el contenido real de la vista
    this.root.innerHTML = html;
    observeLazyComponents(this.root);

    document.title = `Demo SPA — ${path === "/" ? "Inicio" : path.slice(1)}`;
  }

  getLoadErrorHTML() {
    return `
    <div class="card">
      <h2>No se pudo cargar esta sección</h2>
      <p>Revisa tu conexión e inténtalo de nuevo. Las secciones que ya visitaste
      siguen disponibles sin conexión.</p>
    </div>
  `;
  }

  init() {
    this.render();
  }
}