// Ore Celebrations — Service Worker
// Bump CACHE_VER whenever you push new code to force clients to get fresh assets.
var CACHE_VER = "v4";
var CACHE_NAME = "ore-celebrations-" + CACHE_VER;

// On install: skip waiting so the new SW activates immediately
self.addEventListener("install", function (event) {
  self.skipWaiting();
});

// On activate: delete all old caches, claim all clients
self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys
          .filter(function (k) { return k !== CACHE_NAME; })
          .map(function (k) { return caches.delete(k); })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener("fetch", function (event) {
  var req = event.request;
  var url = req.url;

  // Only handle GET requests
  if (req.method !== "GET") return;

  // ── Network-first for HTML, JS, CSS, JSON ──────────────────────────────────
  // Always try to fetch fresh; fall back to cache if offline.
  if (/\.(html?|js|css|json)(\?|$)/.test(url) || url.endsWith("/")) {
    event.respondWith(
      fetch(req)
        .then(function (res) {
          if (res && res.ok) {
            var clone = res.clone();
            caches.open(CACHE_NAME).then(function (cache) { cache.put(req, clone); });
          }
          return res;
        })
        .catch(function () { return caches.match(req); })
    );
    return;
  }

  // ── Cache-first for images and videos (large binary assets) ───────────────
  if (/\.(jpe?g|png|gif|webp|svg|mp4|webm|ogg|mov)(\?|$)/.test(url)) {
    event.respondWith(
      caches.match(req).then(function (cached) {
        return (
          cached ||
          fetch(req).then(function (res) {
            if (res && res.ok) {
              var clone = res.clone();
              caches.open(CACHE_NAME).then(function (cache) { cache.put(req, clone); });
            }
            return res;
          })
        );
      })
    );
    return;
  }

  // ── Default: network only ──────────────────────────────────────────────────
  // (fonts from Google, CDN scripts, etc.)
});
