var CACHE_NAME = 'supplement-app-v3';
var ASSETS = [
  '/supplement-app/',
  '/supplement-app/index.html',
  '/supplement-app/style.css',
  '/supplement-app/app.js',
  '/supplement-app/db.js',
  '/supplement-app/reminder.js',
  '/supplement-app/components/supplement.js',
  '/supplement-app/components/todo.js',
  '/supplement-app/manifest.json',
  'https://unpkg.com/vue@3.5.13/dist/vue.global.prod.js'
];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(ASSETS);
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
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      return cached || fetch(e.request).then(function(response) {
        if (response.ok && response.type === 'basic') {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(e.request, clone);
          });
        }
        return response;
      });
    })
  );
});
