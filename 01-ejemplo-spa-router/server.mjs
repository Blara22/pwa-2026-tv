import http from "node:http";
import { readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as webpush from "web-push";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const BASE = "/pwa-2026-tv/01-ejemplo-spa-router"; // igual que BASE_PATH en config.js
const PORT = 5501;

const VAPID_FILE = path.join(ROOT, "vapid-keys.json");
const VAPID_SUBJECT = "mailto:docente@example.com"; // usa un correo o URL real

// Lee las llaves VAPID del archivo; si no existe, genera un par nuevo y lo guarda
async function loadVapidKeys() {
  try {
    return JSON.parse(await readFile(VAPID_FILE, "utf8"));
  } catch (error) {
    // Cualquier error distinto a "archivo no existe" (por ejemplo, JSON dañado) se propaga
    if (error.code !== "ENOENT") throw error;

    const keys = webpush.generateVAPIDKeys();
    await writeFile(VAPID_FILE, JSON.stringify(keys, null, 2));
    console.log("[push] Llaves VAPID nuevas guardadas en vapid-keys.json");
    return keys;
  }
}

const vapid = await loadVapidKeys();
// Registra la identidad del servidor: con ella web-push firma cada envío
webpush.setVapidDetails(VAPID_SUBJECT, vapid.publicKey, vapid.privateKey);
console.log("[push] Llave pública VAPID:", vapid.publicKey);

const subscriptions = new Map(); // endpoint -> suscripción (en memoria)

// Lee el cuerpo de una petición y lo convierte en objeto; rechaza cuerpos mayores a ~100 KB
async function readJson(req) {
  const chunks = [];
  let size = 0;

  for await (const chunk of req) {
    size += chunk.length;
    if (size > 100_000) throw new Error("Cuerpo demasiado grande");
    chunks.push(chunk);
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

// Responde con JSON y el código de estado indicado, sin guardar la respuesta en caché
function sendJson(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(data));
}

// Envía el mismo mensaje a todas las suscripciones guardadas y devuelve un resumen del resultado
async function broadcast({ title = "Demo SPA", body = "", url = "./", tag } = {}) {
  const payload = JSON.stringify({ title, body, url, tag });
  const result = { sent: 0, removed: 0, failed: 0 };

  await Promise.all(
    [...subscriptions.values()].map(async (subscription) => {
      try {
        // TTL: segundos que el servicio push conserva el mensaje si el dispositivo no está disponible
        await webpush.sendNotification(subscription, payload, { TTL: 3600 });
        result.sent++;
      } catch (error) {
        // 404 / 410: la suscripción ya no existe, se borra de la lista
        if (error.statusCode === 404 || error.statusCode === 410) {
          subscriptions.delete(subscription.endpoint);
          result.removed++;
        } else {
          result.failed++;
          console.error(`[push] Falló el envío (${error.statusCode ?? error.code}):`, error.body ?? error.message);
        }
      }
    })
  );

  console.log("[push] Envío =>", result);
  return result;
}

// Atiende las rutas de la API de push: llave pública, suscribir, dar de baja y enviar
async function handlePushApi(req, res, route) {
  try {
    // Entrega la llave pública VAPID al navegador (la privada nunca sale del servidor)
    if (req.method === "GET" && route === "/public-key") {
      return sendJson(res, 200, { publicKey: vapid.publicKey });
    }

    // Guarda la suscripción del navegador (si ya existía el endpoint, la reemplaza)
    if (req.method === "POST" && route === "/subscribe") {
      const subscription = await readJson(req);
      if (!subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
        return sendJson(res, 400, { error: "Suscripción inválida" });
      }

      subscriptions.set(subscription.endpoint, subscription);
      console.log(`[push] Suscripción guardada (${subscriptions.size} en total)`);
      return sendJson(res, 201, { total: subscriptions.size });
    }

    // Elimina la suscripción identificada por su endpoint
    if (req.method === "POST" && route === "/unsubscribe") {
      const { endpoint } = await readJson(req);
      subscriptions.delete(endpoint);
      console.log(`[push] Suscripción eliminada (${subscriptions.size} en total)`);
      return sendJson(res, 200, { total: subscriptions.size });
    }

    // Dispara un envío a todas las suscripciones (solo para la demo: en producción requeriría autenticación)
    if (req.method === "POST" && route === "/send") {
      return sendJson(res, 200, await broadcast(await readJson(req)));
    }

    return sendJson(res, 404, { error: "Ruta de la API no encontrada" });
  } catch (error) {
    console.error("[push] Petición inválida:", error.message);
    return sendJson(res, 400, { error: "Petición inválida" });
  }
}

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
};

http
  .createServer(async (req, res) => {
    const { pathname } = new URL(req.url, `http://${req.headers.host}`);

    if (pathname === BASE) {
      res.writeHead(301, { Location: `${BASE}/` });
      return res.end();
    }
    if (!pathname.startsWith(`${BASE}/`)) {
      res.writeHead(404);
      return res.end("Not found");
    }

    const apiPrefix = `${BASE}/api/push`;
    if (pathname.startsWith(`${apiPrefix}/`)) {
      return handlePushApi(req, res, pathname.slice(apiPrefix.length));
    }

    const rel = decodeURIComponent(pathname.slice(BASE.length));
    if (path.basename(rel) === "vapid-keys.json") {
      res.writeHead(403);
      return res.end("Forbidden");
    }

    let target = path.join(ROOT, path.normalize(rel));
    if (!target.startsWith(ROOT)) {
      res.writeHead(403);
      return res.end("Forbidden");
    }

    try {
      const info = await stat(target).catch(() => null);
      if (info?.isDirectory()) {
        target = path.join(target, "index.html");
      } else if (!info) {
        // Con extensión = archivo que no existe → 404 real.
        // Sin extensión = ruta del router → se sirve el shell.
        if (path.extname(rel)) throw new Error("404");
        target = path.join(ROOT, "index.html");
      }

      const data = await readFile(target);
      res.writeHead(200, {
        "Content-Type": TYPES[path.extname(target)] ?? "application/octet-stream",
        "Cache-Control": "no-cache",
      });
      res.end(data);
    } catch {
      res.writeHead(404);
      res.end("Not found");
    }
  })
  .listen(PORT, () => console.log(`http://localhost:${PORT}${BASE}/`));