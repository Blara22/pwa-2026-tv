const badge = () => document.getElementById("connection-status");

function paint() {
  const el = badge();
  if (!el) return;

  const online = navigator.onLine;
  el.textContent = online ? "En línea" : "Sin conexión";
  el.classList.toggle("is-offline", !online);
}

export function initConnectionStatus() {
  paint();
  window.addEventListener("online", paint);
  window.addEventListener("offline", paint);
}
