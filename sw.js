var CACHE_NAME = 'supplement-app-v8';
var ASSETS = [
  './',
  'index.html',
  'style.css',
  'app.js',
  'db.js',
  'reminder.js',
  'components/supplement.js',
  'components/todo.js',
  'manifest.json',
  'https://unpkg.com/vue@3.5.13/dist/vue.global.prod.js'
];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(ASSETS).catch(function() { /* some assets may fail, that's ok */ });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; }).map(function(k) {
          return caches.delete(k);
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(e) {
  // Only handle GET requests for our own assets
  if (e.request.method !== 'GET') return;

  var url = new URL(e.request.url);
  var isVueCDN = url.hostname === 'unpkg.com';
  var isLocal = url.origin === self.location.origin;
  if (!isLocal && !isVueCDN) return;

  e.respondWith(
    fetch(e.request).then(function(response) {
      if (response.ok) {
        var clone = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(e.request, clone);
        });
      }
      return response;
    }).catch(function() {
      return caches.match(e.request);
    })
  );
});
