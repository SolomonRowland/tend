// Tend (shared household) offline cache. Bump VERSION whenever a file changes so phones pick up the update.
var VERSION = 'tend-home-v3';
var FILES = ['./', './index.html', './css/app.css', './vendor/supabase.js', './js/cloud.js', './js/core.js', './js/screens.js', './js/photos.js', './js/starter.js', './js/actions.js', './js/data.js', './js/main.js',
  './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
// Network first for the app's own files (so updates arrive), cache fallback when offline.
// Requests to Supabase are left alone.
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(fetch(e.request, { cache: 'no-cache' }).then(function (res) {
    var copy = res.clone(); caches.open(VERSION).then(function (c) { c.put(e.request, copy); }); return res;
  }).catch(function () { return caches.match(e.request).then(function (r) { return r || caches.match('./index.html'); }); }));
});
