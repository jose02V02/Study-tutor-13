// inteligent STUDY — Service Worker
// Strategy:
//  - Precache the app shell on install
//  - Network-first for API calls (so lessons/chat are always fresh)
//  - Cache-first for static assets (icons, fonts, chunks) with runtime cache
//  - Never cache SSE streaming endpoints

const CACHE_VERSION = "istudy-v1";
const APP_SHELL_CACHE = `${CACHE_VERSION}-shell`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

const APP_SHELL = [
  "/",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(APP_SHELL_CACHE).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => !k.startsWith(CACHE_VERSION)).map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Never intercept SSE streams / API calls to backend — always network
  const isSSE = req.headers.get("accept")?.includes("text/event-stream");
  const isApi = url.pathname.startsWith("/api/") || url.hostname.includes("emergentagent.com") && url.pathname.startsWith("/api");
  if (isSSE || isApi) return;

  // For navigations: network-first, fall back to cached shell
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() => caches.match("/") .then((r) => r || Response.error()))
    );
    return;
  }

  // Same-origin static assets: cache-first
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((resp) => {
          if (resp && resp.ok && resp.type === "basic") {
            const clone = resp.clone();
            caches.open(RUNTIME_CACHE).then((c) => c.put(req, clone));
          }
          return resp;
        }).catch(() => cached);
      })
    );
    return;
  }

  // Cross-origin (fonts, unsplash): stale-while-revalidate
  event.respondWith(
    caches.match(req).then((cached) => {
      const fetcher = fetch(req).then((resp) => {
        if (resp && resp.ok) {
          const clone = resp.clone();
          caches.open(RUNTIME_CACHE).then((c) => c.put(req, clone));
        }
        return resp;
      }).catch(() => cached);
      return cached || fetcher;
    })
  );
});
