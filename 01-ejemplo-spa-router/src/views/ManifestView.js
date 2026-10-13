import { SW_SCOPE } from "../pwa/registerSW.js";

// Escapa texto para meterlo en un template string de HTML sin romper el marcado.
const esc = (value) =>
  String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// URL absoluta del manifest, tal como la resolvió el navegador.
function getManifestUrl() {
  return document.querySelector('link[rel="manifest"]')?.href ?? null;
}

// ¿Cómo se está mostrando la app ahora mismo? (display-mode es una media query)
function getDisplayMode() {
  if (window.navigator.standalone) return "standalone (iOS)";
  const modes = ["fullscreen", "standalone", "minimal-ui", "browser"];
  return modes.find((mode) => window.matchMedia(`(display-mode: ${mode})`).matches) ?? "desconocido";
}

function renderSwatch(color) {
  return color
    ? `<span class="swatch" style="background:${esc(color)}"></span> <code>${esc(color)}</code>`
    : "—";
}

function renderFields(manifest, manifestUrl) {
  // start_url y scope son relativos al manifest: los resolvemos para verlos completos
  const abs = (value) => (value ? new URL(value, manifestUrl).pathname : "—");
  const rows = [
    ["name", esc(manifest.name ?? "—")],
    ["short_name", esc(manifest.short_name ?? "—")],
    ["id", esc(manifest.id ?? "—")],
    ["start_url", `<code>${esc(manifest.start_url ?? "—")}</code> → ${esc(abs(manifest.start_url))}`],
    ["scope", `<code>${esc(manifest.scope ?? "—")}</code> → ${esc(abs(manifest.scope))}`],
    ["display", esc(manifest.display ?? "browser (valor por omisión)")],
    ["theme_color", renderSwatch(manifest.theme_color)],
    ["background_color", renderSwatch(manifest.background_color)],
  ];
  return `
    <table class="storage-table">
      <thead><tr><th>Miembro</th><th>Valor</th></tr></thead>
      <tbody>${rows.map(([k, v]) => `<tr><td><code>${k}</code></td><td>${v}</td></tr>`).join("")}</tbody>
    </table>
  `;
}

function renderIcons(manifest, manifestUrl) {
  const icons = manifest.icons ?? [];
  if (!icons.length) return "<p>El manifest no declara íconos.</p>";

  return `<div class="icons-grid">${icons
    .map((icon) => {
      const src = new URL(icon.src, manifestUrl).href;
      const purpose = icon.purpose ?? "any";
      // Los maskable se muestran recortados en círculo para simular el recorte de Android
      const mask = purpose.includes("maskable") ? " icon-mask" : "";
      return `
        <figure class="icon-card">
          <img class="icon-preview${mask}" src="${esc(src)}" alt="Ícono ${esc(icon.sizes)}" />
          <figcaption>
            <strong>${esc(icon.sizes)}</strong><br />
            <small>purpose: ${esc(purpose)}</small>
          </figcaption>
        </figure>
      `;
    })
    .join("")}</div>`;
}

export default async function ManifestView() {
  const manifestUrl = getManifestUrl();

  if (!manifestUrl) {
    return `
      <div class="card">
        <h2>Manifest</h2>
        <p style="color:#b91c1c">No se encontró ningún <code>&lt;link rel="manifest"&gt;</code> en el documento.</p>
      </div>
    `;
  }

  let manifest;
  try {
    const response = await fetch(manifestUrl);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    manifest = await response.json();
  } catch (error) {
    console.error("[PWA] No se pudo leer el manifest: ", error);
    return `
      <div class="card">
        <h2>Manifest</h2>
        <p style="color:#b91c1c">No se pudo leer <code>${esc(manifestUrl)}</code>. Revisa la ruta y que el JSON sea válido.</p>
      </div>
    `;
  }

  return `
    <div class="card">
      <h2>Manifest</h2>
      <p>Archivo leído: <code>${esc(manifestUrl)}</code></p>
      ${renderFields(manifest, manifestUrl)}
    </div>
    <div class="card">
      <h3>Íconos declarados</h3>
      ${renderIcons(manifest, manifestUrl)}
    </div>
    <div class="card">
      <h3>Modo de visualización actual</h3>
      <p><code>display-mode: ${esc(getDisplayMode())}</code></p>
      <p><small>En una pestaña normal verás <em>browser</em>. Si abres la app desde su icono, verás el valor declarado en <code>display</code>. Scope del SW: <code>${esc(SW_SCOPE)}</code></small></p>
    </div>
  `;
}
