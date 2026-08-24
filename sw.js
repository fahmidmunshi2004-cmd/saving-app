const CACHE_NAME = "vaultbudget-v13";
const ASSETS = [
  "./",
  "./index.html",
  "./css/style.css",
  "./css/dark-mode.css",
  "./js/core/state.js",
  "./js/core/common.js",
  "./js/dark-mode.js",
  "./js/app.js",
  "./assets/i18n/en.json",
  "./assets/i18n/bn.json",
  "./assets/i18n/ar.json",
  "./assets/i18n/hi.json",
  "./assets/i18n/ur.json",
  "./assets/i18n/es.json",
  "./assets/i18n/fr.json",
  "./assets/i18n/de.json",
  "./assets/i18n/tr.json",
  "./assets/i18n/ru.json",
  "./manifest.webmanifest",
  "./assets/icons/icon-192.svg",
  "./assets/icons/icon-512.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
          return null;
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const req = event.request;
  const url = new URL(req.url);
  const isSameOrigin = url.origin === self.location.origin;
  const isAppShellFile = isSameOrigin && (
    url.pathname.endsWith(".html")
    || url.pathname.endsWith(".css")
    || url.pathname.endsWith(".js")
  );

  // For app shell files prefer fresh network, fallback to cache.
  if (isAppShellFile) {
    event.respondWith(
      fetch(req)
        .then((response) => {
          const clone = response.clone();
          if (response.ok && response.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone)).catch(() => { });
          }
          return response;
        })
        .catch(() => caches.match(req).then((cached) => cached || caches.match("./index.html")))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((response) => {
          const clone = response.clone();
          if (response.ok && response.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone)).catch(() => { });
          }
          return response;
        })
        .catch(() => caches.match("./index.html"));
    })
  );
});
