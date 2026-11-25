'use strict';
/* Tend (iPhone app only): the daily heads-up, scheduled by the phone itself.
   The website gets its heads-up by web push from the tend-notify function. Inside the
   app there's no web push, so the phone schedules the next two weeks of heads-ups as
   local notifications, worded by the same buildDigest the server uses (js/digest.js,
   copied out of supabase/functions/tend-notify/index.ts by build.js).
   They're rebuilt whenever the list changes and whenever the app goes to the background,
   so they follow the latest list this phone has seen.
   build.js loads this file after notify.js, so the functions below replace the web ones. */
(function () {
  var LN = window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.LocalNotifications;
  if (!LN) return;
  var PREF = 'tend.native.notify', DAYS = 14, FIRST_ID = 1000;

  function pref() { try { var p = JSON.parse(localStorage.getItem(PREF) || 'null'); if (p) return p; } catch (e) {} return { on: false, hour: 8 }; }
  function setPref(p) { try { localStorage.setItem(PREF, JSON.stringify(p)); } catch (e) {} }
  var P = pref(); N.hour = P.hour; N.state = P.on ? 'on' : 'off';

  function myName() {
    var me = C.user && (C.members || []).find(function (x) { return x.user_id === C.user.id; });
    if (me && me.name) return me.name;
    try { return fullName(getProfile()); } catch (e) { return ''; }
  }
  function cancelAll() {
    return LN.getPending().then(function (r) {
      var list = (r && r.notifications || []).map(function (n) { return { id: n.id }; });
      return list.length ? LN.cancel({ notifications: list }) : null;
    });
  }
  /* Cancel what's scheduled and lay out the next two weeks from the list as it is now. */
  var busy = null, again = false;
  function reschedule() {
    if (busy) { again = true; return busy; }
    busy = cancelAll().then(function () {
      if (!P.on || !db || !C.hid) return;
      var snap = scheduleSnapshot(db), me = myName(), uid = C.user && C.user.id, now = new Date(), out = [];
      for (var d = 0; d < DAYS; d++) {
        var at = new Date(now.getFullYear(), now.getMonth(), now.getDate() + d, P.hour, 0, 0);
        if (at <= now) continue;
        var msg = buildDigest(snap, iso(at), me, uid);
        if (msg) out.push({ id: FIRST_ID + d, title: msg.title, body: msg.body, schedule: { at: at, allowWhileIdle: true } });
      }
      return out.length ? LN.schedule({ notifications: out }) : null;
    }).catch(function () {}).then(function () { busy = null; if (again) { again = false; reschedule(); } });
    return busy;
  }
  var t = 0;
  function rescheduleSoon() { clearTimeout(t); t = setTimeout(reschedule, 1500); }

  // the list changed on this phone
  var webSave = save;
  save = function () { var r = webSave.apply(this, arguments); rescheduleSoon(); return r; };
  // leaving the app: lay them out from the latest list (including changes from other phones)
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') { clearTimeout(t); reschedule(); } });
  setTimeout(reschedule, 4000);

  notifyCheck = function () {
    if (N.checked) return; N.checked = true;
    LN.checkPermissions().then(function (r) {
      if (r.display === 'denied') N.state = 'blocked';
      else N.state = P.on ? 'on' : 'off';
      if (ui.screen === 'settings') keepRender();
    }).catch(function () {});
  };
  notifyOn = function () {
    if (N.busy) return; N.busy = true; N.msg = ''; keepRender();
    LN.requestPermissions().then(function (r) {
      N.busy = false;
      if (r.display !== 'granted') { N.state = 'blocked'; keepRender(); return; }
      P.on = true; setPref(P); N.state = 'on';
      return reschedule().then(function () { toast('Notifications are on. You’ll get a heads-up at ' + hourLabel(N.hour) + '.'); });
    }).catch(function (e) { N.busy = false; N.msg = (e && e.message) || 'Couldn’t turn on notifications.'; keepRender(); });
  };
  notifyOff = function () {
    P.on = false; setPref(P); N.state = 'off';
    reschedule().then(function () { toast('Notifications are off on this phone.'); });
  };
  notifyHour = function (h) {
    N.hour = P.hour = h; setPref(P); keepRender();
    reschedule().then(function () { toast('You’ll get your heads-up at ' + hourLabel(h) + '.'); });
  };
  notifyTest = function () {
    var msg = db && buildDigest(scheduleSnapshot(db), iso(today()), myName(), C.user && C.user.id);
    LN.schedule({ notifications: [{ id: 999, title: msg ? msg.title : 'Tend', body: msg ? msg.body : 'Nothing is due this week. This is how your heads-up will look.', schedule: { at: new Date(Date.now() + 5000) } }] })
      .then(function () { toast('Test coming in 5 seconds. Leave the app to see it pop up.'); }, function (e) { warn((e && e.message) || 'Couldn’t send a test.'); });
  };
  // on sign-out: this phone stops getting that person's heads-up
  notifyForget = function () { N.checked = false; P.on = false; setPref(P); N.state = 'off'; return cancelAll().catch(function () {}); };

  isStandalone = function () { return true; }; // the web version's "add to Home Screen first" note doesn't apply
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') N.checked = false; }); // permission may have changed in Settings
  var webSettings = notifySettings;
  notifySettings = function () {
    if (!C.on || !C.hid) return '';
    notifyCheck();
    if (N.state === 'unknown') N.state = P.on ? 'on' : 'off';
    if (N.state === 'blocked') return '<div class="section"><h2 style="font-size:19px">Notifications</h2></div><div class="tip" style="margin:0 16px">Notifications are blocked for Tend. Turn them on in your iPhone’s Settings → Notifications → Tend, then come back here.</div>';
    return webSettings();
  };
})();
