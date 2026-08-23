var CACHE = 'roots-v12';
var URLS = [
  './',
  './index.html',
  './timeline.html',
  './tree.html',
  './library.html',
  './onboarding.html',
  './style.css',
  './onboarding.css',
  './data.js',
  './dataset_v2.js',
  './dataset.js',
  './zw_locations.js',
  './schools_db.js',
  './registration-data.js',
  './validation.js',
  './onboarding.js',
  './lookups.js',
  './customary.js',
  './shell.js',
  './store.js',
  './settings.js',
  './app.js',
  './timeline.js',
  './tree.js',
  './library.js',
  './institutional/institutional-config.js',
  './institutional/institutional.css',
  './institutional/institutional-login.html',
  './institutional/institutional-login.js',
  './institutional/institutional-onboarding.html',
  './institutional/institutional-onboarding.js',
  './institutional/institutional-workspace.html',
  './institutional/institutional-workspace.css',
  './institutional/institutional-workspace-config.js',
  './institutional/institutional-access.js',
  './institutional/institutional-shell.js',
  './institutional/institutional-dashboard.js',
  './institutional/institutional-search.js',
  './institutional/institutional-lineage.js',
  './institutional/institutional-projects.js',
  './institutional/institutional-reports.js',
  './institutional/institutional-exports.js',
  './institutional/institutional-disputes.js',
  './institutional/institutional-access-centre.js',
  './institutional/institutional-organisation.js',
  './admin/admin-permissions.js',
  './admin/admin-data.js',
  './admin/admin.css',
  './admin/admin-login.html',
  './admin/admin-login.js',
  './admin/admin.html',
  './admin/admin.js',
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
