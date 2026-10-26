const CACHE_NAME = "omkar-marketing-static-v1";
const OFFLINE_PAGE = "/offline.html";
const STATIC_ASSETS = [
  OFFLINE_PAGE,
  "/pwa-icon-192.png",
  "/pwa-icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((cacheName) => cacheName.startsWith("omkar-marketing-") && cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName)),
      ),
    ),
  );
  self.clients.claim();
});

// Clerk round-trips sign-in through cross-origin redirects carrying __clerk_*
// query parameters. The service worker must stay out of that handshake so the
// browser follows those redirects natively.
function isAuthNavigation(url) {
  for (const name of url.searchParams.keys()) {
    if (name.startsWith("__clerk")) return true;
  }
  return false;
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || request.mode !== "navigate") return;
  if (isAuthNavigation(new URL(request.url))) return;

  event.respondWith(
    fetch(request).catch(async () => {
      const cachedOfflinePage = await caches.match(OFFLINE_PAGE);
      if (cachedOfflinePage) return cachedOfflinePage;
      return new Response("You are offline. Reconnect to access the application.", {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }),
  );
});
