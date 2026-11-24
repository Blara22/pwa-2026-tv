const registry = {
  novedades: () => import("./NovedadesList.js"),
};

async function hydrate(slot) {
  const load = registry[slot.dataset.lazyComponent];
  if (!load) return;

  try {
    const { default: render } = await load();
    const html = await render();
    if (slot.isConnected) slot.innerHTML = html;
  } catch (error) {
    console.error("[LazyComponent] No se pudo cargar: ", error);
    if (slot.isConnected) {
      slot.innerHTML = `<p style="color:#b91c1c">No pudimos cargar esta sección en este momento.</p>`;
    }
  }
}

export function observeLazyComponents(root) {
  const slots = root.querySelectorAll("[data-lazy-component]");
  if (slots.length === 0) return;

  if (!("IntersectionObserver" in window)) {
    slots.forEach(hydrate);
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);
        hydrate(entry.target);
      });
    },
    { rootMargin: "200px 0px" }
  );

  slots.forEach((slot) => observer.observe(slot));
}