const CACHE_NAME = 'iftar-fund-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Install SW and cache static assets (App Shell)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Activate SW and clean up old caches
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch Strategy
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Don't intercept cross-origin API calls (let browser handle them directly)
  if (url.origin !== self.location.origin) {
    return;
  }

  // Strategy: Network Only for Data/API calls
  // (Ensures we never serve stale data from cache)
  if (url.pathname.includes('/api/') || url.href.includes('google')) {
    event.respondWith(
      fetch(event.request)
        .catch((error) => {
          console.error('Service Worker fetch failed:', error);
          // Optional: Return a specific offline JSON response for data
          return new Response(JSON.stringify({ error: 'Network error' }), {
            headers: { 'Content-Type': 'application/json' }
          });
        })
    );
    return;
  }

  // Strategy: Stale-While-Revalidate for static assets (Scripts, CSS, Images)
  // This makes the app load fast but updates in the background
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Fetch latest version from network
        const fetchPromise = fetch(event.request).then(
          (networkResponse) => {
            // Update cache with new version
            if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseToCache);
              });
            }
            return networkResponse;
          }
        );
        // Return cached response immediately if available, otherwise wait for network
        return response || fetchPromise;
      })
  );
});