import { APP_VERSION } from "../utils/index.js";
import { BASE_PATH } from "../config.js";

const FOTOS = [
  "Café de olla",
  "Pan dulce",
  "Agua de jamaica",
  "Concha",
  "Tamales",
  "Champurrado",
  "Buñuelos",
  "Atole",
  "Rosca de reyes",
  "Pozole",
  "Churros",
  "Chocolate caliente",
  "Empanadas",
  "Elote",
  "Flan",
  "Arroz con leche",
];

const fotoUrl = (numero) =>
  `${BASE_PATH}/assets/galeria/foto-${String(numero).padStart(2, "0")}.jpg`;

// Cada vista exporta por defecto una función que devuelve el HTML de esa
// "página". El router se encarga de inyectarlo en el contenedor #app.
export default function HomeView() {

  const galeria = FOTOS.map(
    (titulo, indice) => `
      <figure class="gallery-item">
        <img src="${fotoUrl(indice + 1)}" alt="${titulo}"
          loading="lazy" decoding="async" width="1200" height="800">
        <figcaption>${titulo}</figcaption>
      </figure>
    `
  ).join("");

  return `
    <div class="card">
      <h2>Inicio</h2>
      <img class="hero" src="${BASE_PATH}/assets/hero.jpg" alt="Imagen de portada de la demo"
        fetchpriority="high" decoding="async" width="1600" height="640">
      <p>Esta es una simulación de SPA construida con módulos ES6 puros
      y la History API del navegador (sin frameworks).</p>
      <p><small>Versión de la app: ${APP_VERSION}</small></p>
    </div>

    <div class="card">
      <h3>Galería</h3>
      <div class="gallery-grid">${galeria}</div>
    </div>

    <div class="card lazy-slot" data-lazy-component="novedades">
      <div class="skeleton skeleton-title"></div>
      <div class="skeleton skeleton-line"></div>
      <div class="skeleton skeleton-line short"></div>
    </div>
  `;
}
