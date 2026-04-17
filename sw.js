/* =============================================
   EARTHLENS AI — SERVICE WORKER
   Enables offline access and PWA install
   ============================================= */

const CACHE_NAME = 'earthlens-v1';

// Static assets to pre-cache on install
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/css/animations.css',
  '/js/app.js',
  '/js/gemini.js',
  '/js/globe.js',
  '/js/ecovision.js',
  '/js/ecochat.js',
  '/js/carbon.js',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

/* ---- Install: pre-cache all static assets ---- */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Add assets one by one so a single failure doesn't block install
      return Promise.allSettled(
        PRECACHE_ASSETS.map(url => cache.add(url).catch(() => {}))
      );
    })
  );
  self.skipWaiting(); // Activate immediately
});

/* ---- Activate: clean up old caches ---- */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim(); // Take control of all open tabs
});

/* ---- Fetch: cache-first for static, network-only for API ---- */
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // ── Never cache API calls ──
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // ── Never cache cross-origin requests (fonts, unsplash, etc.) ──
  if (url.origin !== self.location.origin) {
    event.respondWith(fetch(event.request).catch(() => new Response('', { status: 408 })));
    return;
  }

  // ── Cache-first for all local static assets ──
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      // Not in cache → fetch and cache
      return fetch(event.request)
        .then((response) => {
          if (response.ok && event.request.method === 'GET') {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => {
          // Offline fallback for navigation requests
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
          return new Response('Offline', { status: 503 });
        });
    })
  );
});
