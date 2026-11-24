import { BASE_PATH } from "../config.js";

const NEWS_URL = `${BASE_PATH}/data/novedades.json`;

export default async function NovedadesList() {
  try {
    const response = await fetch(NEWS_URL);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const { novedades } = await response.json();

    return `
      <h3>Novedades</h3>
      <ul>${novedades.map((item) => `<li>${item.titulo}</li>`).join("")}</ul>
    `;
  } catch (error) {
    console.error("No se pudieron cargar las novedades: ", error);
    return `
      <h3>Novedades</h3>
      <p style="color:#b91c1c">No pudimos cargar las novedades en este momento.</p>
    `;
  }
}
