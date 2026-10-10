// Offline support. Pages are network-first so a new version shows on the next load; other assets are served
// from the cache immediately and refreshed from the network in the background.
// Bump CACHE_NAME when the asset list or caching strategy changes so old caches are cleaned up.
const CACHE_NAME = 'spirojs-v2';

const ASSETS = [
  './',
  './index.html',
  './logo.png',
  './FAVICON.PNG',
  './icon-192.png',
  './icon-512.png',
  './manifest.webmanifest',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/js/bootstrap.bundle.min.js',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/css/bootstrap.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/js/all.min.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || !request.url.startsWith('http')) return;

  // Pages are opened with settings in the query string; cache them under the bare page URL
  const url = new URL(request.url);
  const cacheKey = request.mode === 'navigate' ? url.origin + url.pathname : request;

  if (request.mode === 'navigate') {
    event.respondWith(caches.open(CACHE_NAME).then(cache =>
      fetch(request)
        .then((response) => {
          if (response.ok) cache.put(cacheKey, response.clone());
          return response;
        })
        .catch(async () => (await cache.match(cacheKey)) || Response.error())
    ));
    return;
  }

  event.respondWith(caches.open(CACHE_NAME).then(async (cache) => {
    const cached = await cache.match(cacheKey);
    const network = fetch(request)
      .then((response) => {
        if (response.ok) cache.put(cacheKey, response.clone());
        return response;
      })
      .catch(() => cached);

    if (cached) {
      event.waitUntil(network);
      return cached;
    }
    return network;
  }));
});
