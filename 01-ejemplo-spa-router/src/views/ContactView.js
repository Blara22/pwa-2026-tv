export default async function ContactView() {

  const { default: ApiService, BASE_URL } = await import("../services/apiService.js");
  const api = new ApiService();

  let posts = [];
  let error = null;

  try {
    posts = await api.getPosts();
  }catch(e) {
    console.error("Error al obtener los posts: ", e);
    error = "No pudimos cargar la información en este momento. Intenta de nuevo más tarde.";
  }

  const listado = error
    ? `<p style="color:#b91c1c">${error}</p>`
    : `<ul>${posts.map((p) => `<li>${p.title}</li>`).join("")}</ul>`;

  window.probarPostDemo = async function () {
    const status = document.getElementById("post-demo-status");
    status.textContent = "Enviando POST... revisa la pestaña Network (verás OPTIONS y luego POST).";
    try {
      const response = await fetch("https://api.github.com/user", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Header-Inventado": "algo",
      },
      body: JSON.stringify({ mensaje: "hola" }),
    });
      const data = await response.json();
      status.textContent = `POST exitoso. El servidor simulado respondió con id: ${data.id}`;
    } catch (e) {
      status.textContent = "El POST falló. Revisa la consola.";
      console.error(e);
    }
  };

  return `
    <div class="card">
      <h2>Contacto</h2>
      <p>Puedes escribirnos a contacto@demo-spa.com</p>
      ${listado}
    </div>
    <div class="card">
      <h3>Demo: preflight con POST</h3>
      <p>Este botón hace un <code>POST</code> con <code>Content-Type: application/json</code>,
      lo que obliga al navegador a mandar primero una petición <code>OPTIONS</code> (preflight).</p>
      <button onclick="probarPostDemo()">Probar POST</button>
      <p id="post-demo-status"></p>
    </div>
  `;
}
