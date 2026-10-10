const CACHE_NAME = "jomao-v63";
const ASSETS = [
  "./",
  "./index.html",
  "./css/style.css",
  "./css/modal.css",
  "./css/dark-mode.css",
  "./js/core/state.js",
  "./js/core/common.js",
  "./js/dark-mode.js",
  "./js/games.js",
  "./js/app.js",
  "./js/group-join-config.js",
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
  "./assets/i18n/game-corner/en.json",
  "./assets/i18n/game-corner/bn.json",
  "./assets/i18n/game-corner/ar.json",
  "./assets/i18n/game-corner/hi.json",
  "./assets/i18n/game-corner/ur.json",
  "./assets/i18n/game-corner/es.json",
  "./assets/i18n/game-corner/fr.json",
  "./assets/i18n/game-corner/de.json",
  "./assets/i18n/game-corner/tr.json",
  "./assets/i18n/game-corner/ru.json",
  "./manifest.webmanifest",
  "./assets/icons/main-logo.png",
  "./assets/icons/login-wallet.svg",
  "./assets/icons/favicon-16.png",
  "./assets/icons/favicon-32.png",
  "./assets/icons/favicon-48.png",
  "./assets/icons/app-icon-192.png",
  "./assets/icons/app-icon-180.png",
  "./assets/icons/app-icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.map((key) => key === CACHE_NAME ? null : caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) {
    event.respondWith(fetch(req));
    return;
  }

  const isNavigation = req.mode === "navigate";
  const isAppShellFile = isNavigation
    || url.pathname.endsWith(".html")
    || url.pathname.endsWith(".css")
    || url.pathname.endsWith(".js");

  if (isAppShellFile) {
    event.respondWith(
      fetch(req).then((response) => {
        if (response.ok && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone)).catch(() => {});
        }
        return response;
      }).catch(async () => {
        const cached = await caches.match(req, { ignoreSearch: true });
        if (cached) return cached;
        if (isNavigation) {
          const appShell = await caches.match("./index.html");
          if (appShell) return appShell;
        }
        return new Response("Offline resource unavailable", {
          status: 503,
          headers: { "Content-Type": "text/plain; charset=utf-8" }
        });
      })
    );
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(req, { ignoreSearch: true });
    if (cached) return cached;
    try {
      const response = await fetch(req);
      if (response.ok && response.status === 200) {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, clone)).catch(() => {});
      }
      return response;
    } catch (_) {
      return new Response("Offline resource unavailable", {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8" }
      });
    }
  })());
});
