const CACHE_NAME = 'dhanaseed-pwa-v3';
const BASE_PATH = '/dhanaseed/';

const APP_SHELL = [
  BASE_PATH,
  BASE_PATH + 'index.html',
  BASE_PATH + 'manifest.webmanifest',
  BASE_PATH + 'icon-192.png',
  BASE_PATH + 'icon-512.png'
];

// Install the service worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

// Activate and remove older caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(cacheNames =>
        Promise.all(
          cacheNames
            .filter(name => name !== CACHE_NAME)
            .map(name => caches.delete(name))
        )
      )
      .then(() => self.clients.claim())
  );
});

// Handle network requests
self.addEventListener('fetch', event => {
  const request = event.request;

  // Only handle GET requests
  if (request.method !== 'GET') return;

  // Only handle requests belonging to this DhanaSeed site
  const url = new URL(request.url);

  if (url.origin !== self.location.origin) return;

  // Network-first strategy
  event.respondWith(
    fetch(request)
      .then(response => {
        // Save a successful response for future offline use
        if (response && response.status === 200) {
          const responseClone = response.clone();

          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(request, responseClone);
            });
        }

        return response;
      })
      .catch(() => {
        // If offline, use cached version
        return caches.match(request)
          .then(cachedResponse => {
            if (cachedResponse) {
              return cachedResponse;
            }

            // If navigation request has no cached page,
            // fall back to the cached homepage.
            if (request.mode === 'navigate') {
              return caches.match(BASE_PATH + 'index.html');
            }

            return new Response(
              'DhanaSeed is currently offline.',
              {
                status: 503,
                statusText: 'Service Unavailable',
                headers: {
                  'Content-Type': 'text/plain; charset=utf-8'
                }
              }
            );
          });
      })
  );
});