'use strict';
/* Tend: Start-up. */
/* ---------- start ---------- */
(function start() {
  var T = today(); ui.calY = T.getFullYear(); ui.calM = T.getMonth(); ui.calDay = iso(T);
  if (C.on) { KEY = 'tend.data.none'; render(); cloudInit(); } else { load(); render(); }
  if (navigator.storage && navigator.storage.persist) { try { navigator.storage.persist(); } catch (e) {} }
  // re-check the date when the app comes back, so statuses roll over at midnight
  var lastDay = iso(T);
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible' && db && iso(today()) !== lastDay) { lastDay = iso(today()); if (['edit-task', 'edit-contact', 'edit-item', 'starter-pick', 'profile'].indexOf(ui.screen) < 0 && profileDone()) render(); }
  });
  if ('serviceWorker' in navigator && location.protocol === 'https:') { navigator.serviceWorker.register('sw.js').catch(function () {}); }
})();
