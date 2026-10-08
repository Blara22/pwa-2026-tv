console.log("[SW] Script en ejecución");

console.log("[SW] Contexto global: ", self.constructor.name);

//No tiene acceso
console.log("[SW] typeof window => ", typeof window);
console.log("[SW] typeof document => ", typeof document);
console.log("[SW] typeof localStorage => ", typeof localStorage);

//Sí tiene acceso
console.log("[SW] typeof indexedDB => ", typeof indexedDB);
console.log("[SW] typeof caches => ", typeof caches);

//Scope del service worker
console.log("[SW] Scope => ", self.registration.scope);

const CACHE_VERSION = "app-shell-v3";

const API_ORIGIN = "https://jsonplaceholder.typicode.com";
const CDN_ORIGIN = "https://cdn.jsdelivr.net";
const ALLOWED_ORIGINS = [self.location.origin, API_ORIGIN, CDN_ORIGIN];

const APP_SHELL = [
  "./",
  "./index.html",
  "./404.html",
  "./styles/shell.css",
  "./styles/main.css",
  "./src/main.js",
  "./src/config.js",
  "./src/router/router.js",
  "./src/components/NavBar.js",
  "./src/pwa/registerSW.js",
  "./src/pwa/connectionStatus.js",
  "./src/views/HomeView.js",
  "./src/views/AboutView.js",
  "./src/views/ContactView.js",
  "./src/views/StorageView.js",
  "./src/views/IndexedDBView.js",
  "./src/views/ServiceWorkerView.js",
  "./src/views/FetchLabView.js",
  "./src/views/NotFoundView.js",
  "./src/services/apiService.js",
  "./src/services/cookieService.js",
  "./src/services/dbService.js",
  "./src/utils/index.js",
  "./src/utils/formatDate.js",
  "./data/productos.json",
  "./data/novedades.json",
  `${CDN_ORIGIN}/npm/idb@8/+esm`,
];

self.addEventListener("install", (event) => {
  console.log("[SW] install => precacheando", CACHE_VERSION);

  event.waitUntil(caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL)));

}); 

self.addEventListener("activate", (event) => {
  console.log("[SW] activate => versión activa", CACHE_VERSION);

  event.waitUntil(
    caches.keys().then((cacheNames) => Promise.all(
      cacheNames.filter((name) => name !== CACHE_VERSION)
      .map((name) => {
        console.log("[SW] Borrando caché vieja", name);
        return caches.delete(name);
      })
    )).then(() => self.clients.claim())
  );
})

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") {
    console.log("[SW] Mensaje SKIP_WAITING recibido, forzando activación");
    self.skipWaiting();
  }
});

function shouldHandle(request) {
  if(request.method !== "GET")
    return false;

  if (!ALLOWED_ORIGINS.includes(new URL(request.url).origin))
    return false;

  if(request.cache === "only-if-cached" && request.mode !== "same-origin")
    return false;

  return true;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if(!shouldHandle(request)){
    reportFetch(request, "ignored");
    return;
  }

  event.respondWith(handleRequest(event));
})

async function handleRequest(event) {
  const { request } = event;
  const cache = await caches.open(CACHE_VERSION);
  const key = request.mode === "navigate" ? "./index.html" : request;

  const strategy = pickStrategy(request);
  return strategy(event, cache, key);

}

function pickStrategy(request) {

  const url = new URL(request.url);

  if (url.origin === API_ORIGIN) return networkFirst;
  if (url.pathname.endsWith("/data/productos.json")) return networkFirst;
  if (url.pathname.endsWith("/data/novedades.json")) return staleWhileRevalidate;

  return cacheFirst;
}

async function cacheFirst(event, cache, key) {
  const { request } = event;

  const cached = await cache.match(key);
  if (cached) {
    console.log("[SW] Cache First · HIT => ", request.url);
    reportFetch(request, "cache", "cache-first");
    return cached;
  }

  console.log("[SW] Cache First · MISS => ", request.url);
  try {
    const response = await fromNetwork(request);

    if (response.ok) {
      event.waitUntil(cache.put(key, response.clone()));
    }

    reportFetch(request, "network", "cache-first");
    return response;
  } catch (error) {
    reportFetch(request, "fallback", "cache-first");
    return offlineFallback();
  }
}

async function networkFirst(event, cache, key) {
  const { request } = event;

  try {
    const response = await fromNetwork(request);

    if (response.ok) {
      event.waitUntil(cache.put(key, response.clone()));
    }

    console.log("[SW] Network First · red => ", request.url);
    reportFetch(request, "network", "network-first");
    return response;
  } catch (error) {
    const cached = await cache.match(key);

    if (cached) {
      console.log("[SW] Network First · red caída, uso caché => ", request.url);
      reportFetch(request, "cache", "network-first");
      return cached;
    }

    reportFetch(request, "fallback", "network-first");
    return offlineFallback();
  }
}

async function staleWhileRevalidate(event, cache, key) {
  const { request } = event;

  const cached = await cache.match(key);

  const revalidation = fromNetwork(request)
    .then(async (response) => {
      if (response.ok) {
        await cache.put(key, response.clone());
        reportFetch(request, "updated", "stale-while-revalidate");
      }
      return response;
    })
    .catch(() => null);

  if (cached) {
    event.waitUntil(revalidation);
    console.log("[SW] SWR · entrego caché y actualizo en segundo plano => ", request.url);
    reportFetch(request, "cache", "stale-while-revalidate");
    return cached;
  }

  const response = await revalidation;
  if (response) {
    reportFetch(request, "network", "stale-while-revalidate");
    return response;
  }

  reportFetch(request, "fallback", "stale-while-revalidate");
  return offlineFallback();
}

function fromNetwork(request) {
  return fetch(request, { cache: "no-store" });
}

function offlineFallback() {
  return new Response(
    JSON.stringify({ offline: true, message: "Sin conexión y sin copia en caché" }),
    {
      status: 503,
      statusText: "Service Unavailable",
      headers: { "Content-Type": "application/json; charset=utf-8" },
    }
  );
}

function reportFetch(request, source, strategy) {
  self.clients.matchAll({ type: "window" }).then((clients) => {
    const path = request.url.replace(self.location.origin, "");
    clients.forEach((client) =>
      client.postMessage({ type: "FETCH_LOG", method: request.method, path, strategy, source })
    );
  });
}
