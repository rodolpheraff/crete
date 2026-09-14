var VERSION = "v2";
var CACHE = "crete-" + VERSION;
var TILES = "crete-tiles";
var ASSETS = [
  "./",
  "index.html",
  "manifest.json",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css",
  "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"
];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return Promise.all(ASSETS.map(function (a) { return c.add(a).catch(function () {}); }));
  }));
  self.skipWaiting();
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE && k !== TILES; }).map(function (k) { return caches.delete(k); }));
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
  var url = e.request.url;
  // Meteo : toujours le reseau (l'app garde la derniere prevision en localStorage)
  if (url.indexOf("open-meteo.com") !== -1) return;

  // Page : reseau d'abord pour avoir la derniere version, cache si hors ligne
  if (e.request.mode === "navigate") {
    e.respondWith(
      fetch(e.request).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put("index.html", copy); });
        return res;
      }).catch(function () { return caches.match("index.html"); })
    );
    return;
  }

  // Tuiles de carte, polices, librairies : cache d'abord
  var bucket = url.indexOf("tile.openstreetmap.org") !== -1 ? TILES : CACHE;
  e.respondWith(
    caches.match(e.request).then(function (cached) {
      if (cached) return cached;
      return fetch(e.request).then(function (res) {
        if (res && (res.status === 200 || res.type === "opaque")) {
          var copy = res.clone();
          caches.open(bucket).then(function (c) { c.put(e.request, copy); });
        }
        return res;
      });
    })
  );
});
