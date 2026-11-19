// Tend Home's old offline worker, retired: Tend now lives one level up and has its own.
// Phones that had it get this version, which steps aside so the main app's worker takes over.
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.registration.unregister()); });
