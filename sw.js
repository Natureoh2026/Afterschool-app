/* After-School service worker
   Network-first: 온라인이면 항상 최신 파일을 받아오고(업데이트 즉시 반영),
   오프라인일 때만 캐시로 폴백한다. */
var CACHE = 'afterschool-cache-v1';

self.addEventListener('install', function (e) {
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.filter(function (k) { return k !== CACHE; })
          .map(function (k) { return caches.delete(k); }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') { return; }
  e.respondWith(
    fetch(req).then(function (res) {
      try {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); }).catch(function () {});
      } catch (_) {}
      return res;
    }).catch(function () {
      return caches.match(req).then(function (r) {
        if (r) { return r; }
        if (req.mode === 'navigate') { return caches.match('./index.html'); }
        return undefined;
      });
    })
  );
});
