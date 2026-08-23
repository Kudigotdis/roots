var CACHE = 'roots-v3';
var URLS = [
  './',
  './index.html',
  './style.css',
  './data.js',
  './lookups.js',
  './customary.js',
  './app.js',
  './manifest.json',
  './assets/icons/clock.svg',
  './assets/icons/tree.svg',
  './assets/icons/read-book.svg',
  './assets/icons/profile-picture.svg',
  './assets/icons/people.svg'
];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(cache) {
      return cache.addAll(URLS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE; }).map(function(k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  e.respondWith(
    caches.match(req).then(function(cached) {
      return cached || fetch(req).then(function(res) {
        return caches.open(CACHE).then(function(cache) {
          if (res.ok && req.url.startsWith(self.location.origin)) {
            cache.put(req, res.clone());
          }
          return res;
        });
      });
    }).catch(function() {
      return new Response('Offline — no cached version available.', { status: 503 });
    })
  );
});
