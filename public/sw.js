const CACHE_NAME = "reiki-online-pwa-v7";

const STATIC_ASSETS = [
  "/manifest.json",
  "/brand/Reiki_Online_Lavanda_Unificado.png",
  "/brand/Reiki_Icono_Lavanda_Unificado.png",
  "/brand/icon-192x192.png",
  "/brand/icon-512x512.png",
  "/brand/apple-touch-icon.png",
  "/images/hero-espacio.png",
  "/images/quienes-somos-lavanda.png",
  "/images/espacio-profesionales.png",
  "/images/cat-energia-armonizacion.png",
  "/images/cat-meditacion-bienestar.png",
  "/images/cat-espiritualidad-orientacion.png",
  "/images/cat-autoconocimiento.png",
  "/images/cat-terapias-holisticas.png",
  "/images/cat-armonizacion-espacios.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {});
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              return caches.delete(key);
            }
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  if (event.request.method !== "GET" || url.pathname.startsWith("/api/")) {
    return;
  }

  const acceptHeader = event.request.headers.get("accept") || "";
  const isHtmlOrRSC =
    event.request.mode === "navigate" ||
    acceptHeader.includes("text/html") ||
    event.request.headers.get("rsc") === "1" ||
    url.searchParams.has("_rsc");

  if (isHtmlOrRSC) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => {
          return caches.match(event.request).then((cached) => cached || caches.match("/"));
        })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return networkResponse;
        })
        .catch(() => null);

      return cachedResponse || fetchPromise;
    })
  );
});
