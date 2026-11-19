// The original Tend's offline cache is retired: Tend now lives at ./home/ (which has its own).
// Phones that installed the original get this version, which clears the old cache and steps aside.
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return /^tend-v\d+$/.test(k); }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.registration.unregister(); }));
});
