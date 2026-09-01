export default async function ContactView() {

  const {default: ApiService } = await import("../services/apiService.js");
  const api = new ApiService();

  let posts = [];
  let error = null;

  try {
    posts = await api.getPosts();
  } catch(e) {
    console.log(e);
    error = e.message;
  }

  const listado = error
    ? `<p style=color:#b91c1c">${error}</p>`
    : `<ul>${posts.map((p) => `<li>${p.title}</li>`).join("")}</ul>`;

  return `
    <div class="card">
      <h2>Contacto</h2>
      <p>Puedes escribirnos a contacto@demo-spa.com</p>
      ${listado}
    </div>
  `;
}
