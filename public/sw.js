// Increment this version string whenever you deploy UI changes.
// The SW will activate immediately (skipWaiting) and all clients reload.
const CACHE_VERSION = 'iftar-fund-v4';
const SHELL_URLS = ['/', '/index.html', '/manifest.json'];

// ── Install: pre-cache the app shell, then skip waiting ──────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(SHELL_URLS))
  );
  // Don't wait for existing tabs to close — activate this SW immediately.
  self.skipWaiting();
});

// ── Activate: delete old caches, claim all clients immediately ───────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      // Take control of every open tab without a page reload.
      self.clients.claim(),
      // Purge caches from previous versions.
      caches.keys().then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
      ),
    ])
  );
});

// ── Fetch: network-first for same-origin assets, skip everything else ────────
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. Let cross-origin requests (API server, Google Fonts, …) pass through untouched.
  if (url.origin !== self.location.origin) return;

  // 2. Never cache API calls — always go to the network.
  if (url.pathname.startsWith('/api/')) return;

  // 3. Only cache GET requests.
  if (event.request.method !== 'GET') return;

  // 4. Network-first strategy for all same-origin GET requests (HTML / JS / CSS / images).
  //    • Online  → fetch fresh copy, update cache, return fresh response.
  //    • Offline → return cached copy so the app still loads.
  //    • SPA fallback: if no cache match for a navigation, serve /index.html.
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Only cache valid responses (status 200, same-origin).
        if (networkResponse.ok && networkResponse.type === 'basic') {
          const clone = networkResponse.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, clone));
        }
        return networkResponse;
      })
      .catch(() =>
        caches.match(event.request).then((cached) => {
          if (cached) return cached;
          // SPA fallback: serve index.html for in-app navigation routes.
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
        })
      )
  );
});