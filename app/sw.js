/* ============================================
   AccesiRuta — Service Worker
   Cache-first for app assets, network-first for APIs
   ============================================ */

var CACHE_VERSION = 'accesiruta-v1';
var APP_SHELL_FILES = [
  './',
  './index.html',
  './css/styles.css',
  './js/app.js',
  './js/map.js',
  './js/reports.js',
  './js/sos.js',
  './js/profile.js',
  './manifest.json',
  './img/icon-192.png',
  './img/icon-512.png',
];

/* --- Install: cache app shell --- */
self.addEventListener('install', function (event) {
  console.log('[SW] Instalando versión:', CACHE_VERSION);
  event.waitUntil(
    caches.open(CACHE_VERSION).then(function (cache) {
      return cache.addAll(APP_SHELL_FILES);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

/* --- Activate: clean old caches --- */
self.addEventListener('activate', function (event) {
  console.log('[SW] Activando versión:', CACHE_VERSION);
  event.waitUntil(
    caches.keys().then(function (cacheNames) {
      return Promise.all(
        cacheNames
          .filter(function (name) {
            return name !== CACHE_VERSION;
          })
          .map(function (name) {
            console.log('[SW] Eliminando cache antigua:', name);
            return caches.delete(name);
          })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

/* --- Fetch: strategy based on request type --- */
self.addEventListener('fetch', function (event) {
  var url = new URL(event.request.url);

  // Network-first for external APIs (Google Maps, etc.)
  if (url.origin !== self.location.origin) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  // Cache-first for app shell assets
  event.respondWith(cacheFirst(event.request));
});

/* --- Cache-first strategy --- */
function cacheFirst(request) {
  return caches.match(request).then(function (cached) {
    if (cached) {
      return cached;
    }
    return fetch(request).then(function (response) {
      // Cache a copy of the response
      if (response.status === 200) {
        var clone = response.clone();
        caches.open(CACHE_VERSION).then(function (cache) {
          cache.put(request, clone);
        });
      }
      return response;
    }).catch(function () {
      // Offline fallback for HTML pages
      if (request.headers.get('Accept') && request.headers.get('Accept').includes('text/html')) {
        return offlineFallback();
      }
    });
  });
}

/* --- Network-first strategy --- */
function networkFirst(request) {
  return fetch(request).then(function (response) {
    return response;
  }).catch(function () {
    return caches.match(request).then(function (cached) {
      return cached || offlineFallback();
    });
  });
}

/* --- Offline fallback --- */
function offlineFallback() {
  var html =
    '<!DOCTYPE html>' +
    '<html lang="es"><head><meta charset="UTF-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>AccesiRuta - Sin conexión</title>' +
    '<style>' +
    'body{font-family:-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#F0F9FF;color:#0C4A6E;text-align:center;padding:20px;}' +
    '.container{max-width:300px;}' +
    '.icon{font-size:64px;margin-bottom:16px;}' +
    'h1{font-size:20px;margin-bottom:8px;}' +
    'p{font-size:16px;color:#4B5563;line-height:1.5;}' +
    '.btn{display:inline-block;margin-top:20px;padding:12px 24px;background:#0EA5E9;color:#fff;border-radius:12px;text-decoration:none;font-weight:600;}' +
    '</style></head><body>' +
    '<div class="container">' +
    '<div class="icon">📡</div>' +
    '<h1>Sin conexión</h1>' +
    '<p>No se puede cargar el mapa sin conexión a Internet. Tus reportes guardados están seguros.</p>' +
    '<a href="./index.html" class="btn">Reintentar</a>' +
    '</div></body></html>';

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
