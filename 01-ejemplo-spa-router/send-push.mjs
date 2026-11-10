const ENDPOINT = "http://localhost:5501/pwa-2026-tv/01-ejemplo-spa-router/api/push/send";

const [title = "Demo SPA", body = "Notificación enviada desde el servidor", url = "./"] = process.argv.slice(2);

try {
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, body, url }),
  });

  console.log(`HTTP ${response.status}`, await response.json());
} catch (error) {
  console.error("No se pudo contactar al servidor. ¿Está corriendo «npm start»?", error.message);
  process.exit(1);
}