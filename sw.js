// Tend offline cache. Bump VERSION whenever a file changes so phones pick up the update.
var VERSION = 'tend-app-v11';
var FILES = ['./', './index.html', './css/app.css', './vendor/supabase.js', './js/cloud.js', './js/core.js', './js/screens.js', './js/photos.js', './js/notify.js', './js/starter.js', './js/actions.js', './js/swipe.js', './js/data.js', './js/main.js',
  './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(FILES.map(function (f) { return new Request(f, { cache: 'reload' }); })); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  // Tend's own old caches, including the ones from before Tend Home moved here
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return /^tend-(v\d+|home-v\d+|app-v\d+)$/.test(k) && k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
// Network first for the app's own files (so updates arrive), cache fallback when offline.
// Requests to Supabase are left alone.
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(fetch(e.request, { cache: 'no-cache' }).then(function (res) {
    if (res.ok) { var copy = res.clone(); caches.open(VERSION).then(function (c) { c.put(e.request, copy); }); }
    return res;
  }).catch(function () { return caches.open(VERSION).then(function (c) { return c.match(e.request).then(function (r) { return r || c.match('./index.html'); }); }); }));
});

// Daily heads-up from the tend-notify function.
self.addEventListener('push', function (e) {
  var d = {}; try { d = e.data ? e.data.json() : {}; } catch (x) { d = { body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'Tend', {
    body: d.body || '', icon: 'icon-192.png', badge: 'icon-192.png', tag: d.tag || 'tend-daily', data: { url: d.url || './' }
  }));
});
self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  var url = new URL((e.notification.data && e.notification.data.url) || './', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
    for (var i = 0; i < list.length; i++) { if (list[i].url.indexOf(self.registration.scope) === 0 && 'focus' in list[i]) return list[i].focus(); }
    return self.clients.openWindow(url);
  }));
});
