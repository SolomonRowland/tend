'use strict';
/* Tend: a daily heads-up notification on each phone that turns it on.
   The phone subscribes for web push and saves the subscription (plus the hour and
   time zone it wants) in push_subs. The tend-notify function runs every hour and
   sends each phone a short list of what's overdue, due today and coming up this week. */
var NOTIFY_HOURS = [[7, '7:00 AM'], [8, '8:00 AM'], [9, '9:00 AM'], [12, '12:00 PM'], [17, '5:00 PM'], [19, '7:00 PM'], [20, '8:00 PM']];
var N = { state: 'unknown', hour: 8, busy: false, msg: '' };

function pushSupported() { return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window; }
function isStandalone() { return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true; }
function isIOS() { return /iPhone|iPad|iPod/.test(navigator.userAgent); }
function b64urlToBytes(s) {
  var p = '='.repeat((4 - s.length % 4) % 4), b = atob((s + p).replace(/-/g, '+').replace(/_/g, '/')), out = new Uint8Array(b.length);
  for (var i = 0; i < b.length; i++) out[i] = b.charCodeAt(i);
  return out;
}
function swReady() {
  if (!navigator.serviceWorker) return Promise.reject(new Error('Notifications aren’t supported here.'));
  return navigator.serviceWorker.getRegistration().then(function (r) { return r || navigator.serviceWorker.register('sw.js'); }).then(function () { return navigator.serviceWorker.ready; });
}
/* Find out whether this phone is already set up, once per app start. */
function notifyCheck() {
  if (!C.on || !C.hid || N.checked) return; N.checked = true;
  if (!pushSupported()) { N.state = 'unsupported'; return; }
  if (Notification.permission === 'denied') { N.state = 'blocked'; return; }
  swReady().then(function (reg) { return reg.pushManager.getSubscription(); }).then(function (sub) {
    if (!sub) { N.state = 'off'; if (ui.screen === 'settings') keepRender(); return; }
    return C.sb.from('push_subs').select('hour, household_id').eq('endpoint', sub.endpoint).then(function (r) {
      var row = r.data && r.data[0];
      N.state = row ? 'on' : 'off'; if (row) N.hour = row.hour;
      if (row && row.household_id !== C.hid) saveSub(sub).catch(function () {});
      if (ui.screen === 'settings') keepRender();
    });
  }).catch(function () { N.state = 'off'; });
}
function phoneTz() { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Chicago'; } catch (e) { return 'America/Chicago'; } }
/* save (or take over) this phone's subscription for the signed-in person and household */
function saveSub(sub) {
  var j = sub.toJSON ? sub.toJSON() : sub;
  return C.sb.rpc('save_push_sub', { p_endpoint: j.endpoint, p_household: C.hid, p_p256dh: j.keys.p256dh, p_auth: j.keys.auth, p_hour: N.hour, p_tz: phoneTz() })
    .then(function (r) { if (r.error) throw r.error; });
}
/* on sign-out: this phone stops getting that person's heads-up */
function notifyForget() {
  N.checked = false; N.state = 'unknown';
  if (!pushSupported()) return Promise.resolve();
  return navigator.serviceWorker.getRegistration().then(function (reg) { return reg && reg.pushManager.getSubscription(); }).then(function (sub) {
    if (!sub) return;
    return C.sb.from('push_subs').delete().eq('endpoint', sub.endpoint).then(function () { return sub.unsubscribe(); });
  });
}
function serverKey() {
  return C.sb.rpc('push_public_key').then(function (r) {
    if (r.data) return r.data;
    // first phone ever: ask the function to make the sending keys
    return C.sb.functions.invoke('tend-notify', { body: { action: 'init' } }).then(function (x) {
      if (x.error || !x.data || !x.data.publicKey) throw new Error('Notifications aren’t set up on the server yet.');
      return x.data.publicKey;
    });
  });
}
function notifyOn() {
  if (N.busy) return; N.busy = true; N.msg = ''; keepRender();
  // must ask for permission right away, inside the tap
  var perm = Notification.requestPermission();
  Promise.resolve(perm).then(function (p) {
    if (p !== 'granted') { N.state = p === 'denied' ? 'blocked' : 'off'; throw null; }
    return Promise.all([swReady(), serverKey()]);
  }).then(function (x) {
    var reg = x[0], key = x[1];
    return reg.pushManager.getSubscription().then(function (old) {
      return old || reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64urlToBytes(key) });
    });
  }).then(saveSub).then(function () {
    N.state = 'on'; N.busy = false; keepRender(); toast('Notifications are on. You’ll get a heads-up at ' + hourLabel(N.hour) + '.');
  }).catch(function (e) {
    N.busy = false; if (e) N.msg = cloudMsg(e); keepRender();
  });
}
function notifyOff() {
  N.busy = true; keepRender();
  swReady().then(function (reg) { return reg.pushManager.getSubscription(); }).then(function (sub) {
    if (!sub) return;
    return C.sb.from('push_subs').delete().eq('endpoint', sub.endpoint).then(function () { return sub.unsubscribe(); });
  }).then(function () { N.state = 'off'; N.busy = false; keepRender(); toast('Notifications are off on this phone.'); }, function (e) { N.busy = false; N.msg = cloudMsg(e); keepRender(); });
}
function notifyHour(h) {
  N.hour = h; keepRender();
  swReady().then(function (reg) { return reg.pushManager.getSubscription(); }).then(function (sub) {
    if (sub) return C.sb.from('push_subs').update({ hour: h, tz: phoneTz() }).eq('endpoint', sub.endpoint).then(function (r) { if (r.error) throw r.error; });
  }).then(function () { toast('You’ll get your heads-up at ' + hourLabel(h) + '.'); }, function (e) { toast(cloudMsg(e)); });
}
function notifyTest() {
  N.busy = true; keepRender();
  C.sb.functions.invoke('tend-notify', { body: { action: 'test' } }).then(function (r) {
    N.busy = false; keepRender();
    if (r.error) throw r.error;
    toast(r.data && r.data.sent ? 'Test sent. It should pop up in a few seconds.' : 'Nothing was sent. Try turning notifications off and on again.');
  }).catch(function (e) { N.busy = false; keepRender(); toast(cloudMsg(e)); });
}
function hourLabel(h) { var m = NOTIFY_HOURS.find(function (x) { return x[0] === h; }); return m ? m[1] : h + ':00'; }

function notifySettings() {
  if (!C.on || !C.hid) return '';
  notifyCheck();
  var h = '<div class="section"><h2 style="font-size:19px">Notifications</h2></div>';
  var note = function (t) { return '<p class="note" style="text-align:left;padding:0 20px 8px">' + t + '</p>'; };
  if (N.state === 'unsupported' || (isIOS() && !isStandalone())) {
    return h + '<div class="tip" style="margin:0 16px">' + (isIOS() && !isStandalone()
      ? 'To get a daily heads-up, open Tend Home from your Home Screen. In Safari, tap Share, then Add to Home Screen.'
      : 'This browser can’t show notifications. On iPhone, open Tend Home from your Home Screen (iOS 16.4 or newer).') + '</div>';
  }
  if (N.state === 'blocked') return h + '<div class="tip" style="margin:0 16px">Notifications are blocked for Tend Home. Turn them on in your phone’s Settings → Notifications → Tend Home, then come back here.</div>';
  if (N.state !== 'on') {
    return h + note('Get one short heads-up a day on this phone: what’s overdue, due today and coming up this week.') +
      (N.msg ? '<p class="cerr" style="margin:0 16px 8px">' + esc(N.msg) + '</p>' : '') +
      '<div class="stack"><button class="btn primary" data-act="notify-on"' + (N.busy || N.state === 'unknown' ? ' disabled' : '') + '>' + ic('bell', 18) + (N.busy ? 'One moment…' : 'Turn On Daily Heads-Up') + '</button></div>';
  }
  h += note('A daily heads-up comes to this phone. Choose when:');
  h += '<div class="listcard" role="radiogroup">' + NOTIFY_HOURS.map(function (x) {
    var on = x[0] === N.hour;
    return '<button type="button" class="lrow" role="radio" aria-checked="' + on + '" data-act="notify-hour" data-v="' + x[0] + '"><span class="t">' + x[1] + '</span>' +
      '<span style="width:24px;height:24px;flex:0 0 24px;border-radius:999px;display:flex;align-items:center;justify-content:center;' + (on ? 'background:var(--rose);color:#fff' : 'border:2px solid var(--dusty)') + '">' + (on ? ic('check', 13, 3) : '') + '</span></button>';
  }).join('') + '</div>';
  if (N.msg) h += '<p class="cerr" style="margin:8px 16px 0">' + esc(N.msg) + '</p>';
  h += '<div class="btns2" style="margin:10px 16px 0"><button class="btn secondary" data-act="notify-test"' + (N.busy ? ' disabled' : '') + '>Send a Test</button><button class="btn secondary" data-act="notify-off"' + (N.busy ? ' disabled' : '') + '>Turn Off</button></div>';
  return h;
}
function notifyAct(a, el) {
  switch (a) {
    case 'notify-on': notifyOn(); return true;
    case 'notify-off': notifyOff(); return true;
    case 'notify-test': notifyTest(); return true;
    case 'notify-hour': notifyHour(+el.getAttribute('data-v')); return true;
  }
  return false;
}
