console.log("[SW] Script en ejecución");
console.log("[SW] Contexto global");
console.log("[SW] typeof Window => ", typeof window);
console.log("[SW] typeof document => ", typeof document);
console.log("[SW] typeof localStorage => ", typeof localStorage);

console.log("[SW] typeof IndexedDB => ", typeof indexedDB);
console.log("[SW] typeof caches => ", typeof caches);

console.log("[SW] Scope => ", self.registration.scope);

const CACHE_VERSION = "app-shell-v4";

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
];

self.addEventListener("install", (event) => {
  console.log("[SW] install -> precacheando app shell ", CACHE_VERSION);

  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL))
  );

});

self.addEventListener("activate", (event) => {
  console.log("[SW] activate -> versión activa: ", CACHE_VERSION);

  event.waitUntil(caches.keys()
    .then((cacheNames) => {
      Promise.all(cacheNames.filter((name) => name !== CACHE_VERSION)
        .map((name) => {
          console.log("[SW] Borrando caché vieja: ", name)
          return caches.delete(name);
        }
      ))
    }).then(() => self.clients.claim())
  )
})
 
self.addEventListener("message", (event) => {
  if(event.data === "SKIP_WAITING") {
    console.log("[SW] Mensaje SKIP_WAITING recibido, forzando activación");
    self.skipWaiting();
  }
})