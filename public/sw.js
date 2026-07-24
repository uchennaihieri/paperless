const CACHE_NAME = 'fincalite-cache-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // We only intercept the NextAuth session endpoint to prevent random logouts when offline
  if (url.pathname === '/api/auth/session') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // If network succeeds, cache the fresh session response
          const clonedResponse = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clonedResponse);
          });
          return response;
        })
        .catch(() => {
          // If network fails (offline), return the last cached session
          return caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Fallback empty session if absolutely no cache exists
            return new Response(JSON.stringify({}), {
              headers: { 'Content-Type': 'application/json' }
            });
          });
        })
    );
  }
});
