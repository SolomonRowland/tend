'use strict';
/* Tend: Your profile, reminder choices, the Settings screen and color themes. */
/* ---------- your profile (kept with your account and on this device, separate from the task list) ---------- */
var PROFILE_KEY = 'tend.profile';
function getProfile() { try { var p = JSON.parse(localStorage.getItem(PROFILE_KEY) || 'null'); if (p && typeof p === 'object') return p; } catch (e) {} return {}; }
/* Your profile lives with your account too, so signing in on another phone or computer
   doesn't ask for it again, and someone else signing in here doesn't get yours. */
var PROFILE_FIELDS = ['first', 'last', 'phone', 'email', 'dob', 'remindDays', 'alertHour', 'cal', 'prefsSet'];
function profileToAccount() {
  if (!C.on || !C.user || !C.sb) return;
  var p = getProfile(), out = {}; if (!profileDone(p)) return;
  PROFILE_FIELDS.forEach(function (k) { if (p[k] != null) out[k] = p[k]; });
  C.sb.auth.updateUser({ data: { tend_profile: out } }).then(function (r) { if (r && r.data && r.data.user) C.user.user_metadata = r.data.user.user_metadata; }, function () {});
}
function profileFromAccount() {
  if (!C.user) return;
  var p = getProfile(), saved = (C.user.user_metadata || {}).tend_profile, mine = p.uid === C.user.id;
  if (saved && profileDone(saved) && (!mine || !profileDone(p))) {
    var keep = mine ? p : {}; // theme and other phone-only choices stay; another person's details don't
    PROFILE_FIELDS.forEach(function (k) { if (saved[k] != null) keep[k] = saved[k]; });
    keep.uid = C.user.id; try { localStorage.setItem(PROFILE_KEY, JSON.stringify(keep)); } catch (e) {}
    return;
  }
  if (!mine && p.uid) { try { localStorage.removeItem(PROFILE_KEY); } catch (e) {} return; } // someone else's profile on this phone
  if (!p.uid && profileDone(p)) { p.uid = C.user.id; try { localStorage.setItem(PROFILE_KEY, JSON.stringify(p)); } catch (e) {} }
  if (profileDone(p) && !saved) profileToAccount(); // made before this was kept with the account
}
function profileDone(p) { p = p || getProfile(); return !!(p.first && p.last && p.phone && p.email && parse(p.dob)); }
function syncUser() {
  var p = getProfile(); if (!db || !p.first) return;
  db.user = p.first;
  if (db.members.indexOf(p.first) < 0) db.members.unshift(p.first);
}
/* your own birthday reminder, kept in step with the birthday in your profile */
function ensureBirthday() {
  var p = getProfile(); if (!db || !profileDone(p)) return false;
  var t = db.tasks.find(function (x) { return x.auto === 'birthday' && (!C.on || x.who === p.first); }), nb = nextAnniv(p.dob), changed = false;
  if (!t) {
    if (db.noBday) return false;
    db.tasks.push({ id: newId('t'), name: C.on ? p.first + '\u2019s Birthday' : 'My Birthday', cat: 'Celebrations', who: p.first, freq: 'Yearly', fixed: true, holiday: '', auto: 'birthday', first: iso(nb), last: null, early: 7,
      active: true, notes: 'Added from your profile. Plan something you enjoy.', contact: null, item: null, snooze: null, history: [] });
    changed = true;
  } else {
    var b = parse(p.dob), f = parse(t.first);
    if (!f || f.getMonth() !== b.getMonth() || f.getDate() !== Math.min(b.getDate(), new Date(f.getFullYear(), b.getMonth() + 1, 0).getDate())) { t.first = iso(nb); t.last = null; t.history = []; changed = true; }
    if (t.who !== p.first) { t.who = p.first; changed = true; }
  }
  return changed;
}
var REMIND_DAYS = [[0, 'On the due date'], [1, '1 day before'], [3, '3 days before'], [7, '1 week before'], [14, '2 weeks before'], [30, '1 month before']];
var ALERT_HOURS = [[7, '7:00 AM'], [8, '8:00 AM'], [9, '9:00 AM'], [12, '12:00 PM'], [17, '5:00 PM'], [19, '7:00 PM']];
var CAL_APPS = [['apple', 'iPhone Calendar'], ['google', 'Google Calendar']];
function remindPrefs() {
  var p = getProfile();
  return { days: REMIND_DAYS.some(function (x) { return x[0] === +p.remindDays; }) ? +p.remindDays : 7, hour: ALERT_HOURS.some(function (x) { return x[0] === +p.alertHour; }) ? +p.alertHour : 9, cal: p.cal === 'google' ? 'google' : 'apple' };
}
function setupStep() { var p = getProfile(); return !profileDone(p) ? 1 : !p.prefsSet ? 2 : 0; }
function stepHead(n, title, sub) {
  return '<header class="head" style="gap:10px"><span class="eyebrow">Step ' + n + ' of 2</span><h1>' + title + '</h1><span class="sub">' + sub + '</span>' +
    '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:6px;margin-top:6px">' + [1, 2].map(function (i) { return '<i style="height:4px;border-radius:2px;background:' + (i <= n ? '#fff' : 'rgba(255,255,255,.28)') + '"></i>'; }).join('') + '</div></header>';
}
function choiceList(name, list, cur) {
  return '<div class="listcard" role="radiogroup">' + list.map(function (x) {
    var on = String(x[0]) === String(cur);
    return '<button type="button" class="lrow" role="radio" aria-checked="' + on + '" data-act="pref-pick" data-k="' + name + '" data-v="' + x[0] + '"><span class="t">' + x[1] + '</span>' +
      '<span style="width:24px;height:24px;flex:0 0 24px;border-radius:999px;display:flex;align-items:center;justify-content:center;' + (on ? 'background:var(--fill);color:#fff' : 'border:2px solid var(--dusty)') + '">' + (on ? ic('check', 13, 3) : '') + '</span></button>';
  }).join('') + '</div>';
}
function scrReminders(setup) {
  var f = ui.form || remindPrefs();
  var h = setup ? stepHead(2, 'Reminders', 'Choose how early tasks show up and how your calendar reminds you. You can change these any time in Settings.')
    : '<header class="head"><div class="headrow"><button class="textbtn" data-act="cancel">Cancel</button><span style="font-weight:700">Reminders</span><button class="textbtn" data-act="save-prefs">Save</button></div></header>';
    h += '<div class="section"><h2 style="font-size:19px">Ready Early</h2></div><p class="note" style="text-align:left;padding:0 20px 8px">How early new tasks show up as ready to do.</p>' + choiceList('days', REMIND_DAYS, f.days);
  h += '<div class="section"><h2 style="font-size:19px">Calendar App</h2></div><p class="note" style="text-align:left;padding:0 20px 8px">Where “Add to Calendar” sends a task.</p>' + choiceList('cal', CAL_APPS, f.cal);
  h += '<div class="section"><h2 style="font-size:19px">Alert Time</h2></div><p class="note" style="text-align:left;padding:0 20px 8px">When your calendar alerts you, the day before a task is due.' + (f.cal === 'google' ? ' Google Calendar uses its own alert settings.' : '') + '</p>' + choiceList('hour', ALERT_HOURS, f.hour);
  h += '<div class="stack" style="margin-top:18px"><button class="btn primary" data-act="save-prefs">' + (setup ? ic('check', 20, 2.4) + 'Finish' : 'Save') + '</button></div>';
  return h + '<div class="pad-b"></div>';
}
function savePrefs() {
  var f = ui.form || remindPrefs(), p = getProfile(), setup = setupStep() === 2;
  p.remindDays = +f.days; p.alertHour = +f.hour; p.cal = f.cal; p.prefsSet = true; if (C.user) p.uid = C.user.id;
  try { localStorage.setItem(PROFILE_KEY, JSON.stringify(p)); } catch (e) { warn('Couldn’t save on this device.'); return; }
  ui.form = null; profileToAccount();
  if (setup) { ui.stack = []; go('home'); toast('Welcome, ' + (p.first || '') + '! You’re all set.'); } else { ui.stack = []; go('settings'); toast('Reminder settings saved.'); }
}
function scrProfile(setup) {
  var f = ui.form || getProfile();
  if (C.on && C.user && !f.email) { f = JSON.parse(JSON.stringify(f)); f.email = C.user.email; }
  var h = (setup ? stepHead(1, 'About You', 'Tend uses this to greet you, mark the tasks you finish, and remind you of your birthday. ' + (C.on ? 'Your household sees your name and email. The rest is kept privately with your account, so you won\u2019t be asked again on another device.' : 'It stays on this device.'))
    : '<header class="head" style="gap:10px"><div class="headrow"><button class="textbtn" data-act="cancel">Cancel</button><span style="font-weight:700">Your Profile</span><button class="textbtn" data-act="save-profile">Save</button></div></header>');
    h += '<form class="form" id="profileForm" autocomplete="on" novalidate>' +
    '<div class="two"><label class="field"><span>First Name</span><input class="input" name="first" autocomplete="given-name" value="' + esc(f.first || '') + '" required></label>' +
    '<label class="field"><span>Last Name</span><input class="input" name="last" autocomplete="family-name" value="' + esc(f.last || '') + '" required></label></div>' +
    '<label class="field"><span>Phone</span><input class="input" type="tel" inputmode="tel" autocomplete="tel" name="phone" value="' + esc(f.phone || '') + '" placeholder="(555) 555-0100" required></label>' +
    '<label class="field"><span>Email</span><input class="input" type="email" inputmode="email" autocapitalize="off" autocomplete="email" name="email" value="' + esc(f.email || '') + '" placeholder="name@example.com" required></label>' +
    '<label class="field"><span>Date of Birth</span><input class="input" type="date" name="dob" autocomplete="bday" max="' + iso(today()) + '" value="' + esc(f.dob || '') + '" required><small>Tend adds a yearly reminder to celebrate your birthday.</small></label>' +
    '<p class="note" style="text-align:left;padding:0 2px">All fields are required.</p>' +
    '<button type="submit" class="btn primary">' + (setup ? 'Continue' : 'Save') + '</button></form>';
  return h;
}
function saveProfile() {
  var el = document.getElementById('profileForm'), f = {};
  Array.prototype.forEach.call(el.elements, function (x) { if (x.name) f[x.name] = String(x.value || '').trim(); });
  ui.form = f;
  var miss = [['first', 'first name'], ['last', 'last name'], ['phone', 'phone'], ['email', 'email'], ['dob', 'date of birth']].filter(function (x) { return !f[x[0]]; });
  if (miss.length) { warn('Please add your ' + miss.map(function (x) { return x[1]; }).join(', ') + '.'); return; }
  if (String(f.phone).replace(/\D/g, '').length < 10) { warn('That phone number looks too short.'); return; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) { warn('That email doesn’t look right.'); return; }
  if (!parse(f.dob) || f.dob > iso(today())) { warn('Pick your date of birth.'); return; }
  f.phone = fmtPhone(f.phone);
  var old = getProfile(); ['remindDays', 'alertHour', 'cal', 'prefsSet', 'themeSet'].forEach(function (k) { if (old[k] != null) f[k] = old[k]; });
  var wasSetup = !profileDone();
  if (C.user) f.uid = C.user.id;
  try { localStorage.setItem(PROFILE_KEY, JSON.stringify(f)); } catch (e) { warn('Couldn’t save on this device.'); return; }
  ui.form = null; syncUser(); ensureBirthday(); save(); profileToAccount();
  if (C.on && C.hid) loadMembers().then(function () { if (ui.screen === 'settings') keepRender(); }, function () {});
  if (wasSetup) { ui.stack = []; go('home'); }
  else { ui.stack = []; go('settings'); toast('Profile saved.'); }
}

/* ---------- settings ---------- */
function scrSettings() {
  var lb = db.lastBackup ? new Date(db.lastBackup) : null;
  var h = '<header class="head" style="gap:10px">' + '<div class="headrow">' + backBtn() + '</div><h1>Settings</h1></header>';
    h += cloudSettings();
  var pf = getProfile();
  h += '<div class="section"><h2 style="font-size:19px">Your Profile</h2><button class="link" data-act="edit-profile">Edit</button></div><div class="listcard">' +
    [['Name', [pf.first, pf.last].filter(Boolean).join(' ')], ['Phone', pf.phone], ['Email', pf.email], ['Date of Birth', pf.dob && parse(pf.dob) ? fmt(parse(pf.dob), true) : '']].map(function (x) {
      return '<div class="lrow"><span class="s">' + x[0] + '</span><span class="t" style="text-align:right;word-break:break-word">' + esc(x[1] || '—') + '</span></div>';
    }).join('') + '</div><p class="note" style="text-align:left;padding:8px 20px 0">Tasks you finish are marked with your first name.</p>';
  h += '<div class="section"><h2 style="font-size:19px">Backup</h2></div><div class="stack">' +
    '<div class="tip" style="margin:0">' + (C.on ? 'Your list is saved online and shared with your household. A backup file is still a good safety net. Save one' : 'Your list is saved on this device only. Save a backup file') + ' to iCloud Drive or Files about once a month, and before you change phones. ' + (lb ? '<br><strong>Last backup:</strong> ' + fmt(lb, true) + '.' : '<br><strong>No backup yet.</strong>') + '</div>' +
    '<button class="btn primary" data-act="backup">' + ic('save', 20) + 'Save a Backup File</button>' +
    '<button class="btn secondary" data-act="restore">' + ic('upload', 18) + 'Restore from a Backup File</button></div>';
  var rp = remindPrefs(), lab = function (list, v) { var m = list.find(function (x) { return String(x[0]) === String(v); }); return m ? m[1] : ''; };
  h += '<div class="section"><h2 style="font-size:19px">Reminders</h2><button class="link" data-act="edit-prefs">Edit</button></div><div class="listcard">' +
    [['Ready Early', lab(REMIND_DAYS, rp.days)], ['Calendar App', lab(CAL_APPS, rp.cal)], ['Alert Time', rp.cal === 'google' ? 'Set in Google Calendar' : lab(ALERT_HOURS, rp.hour)]].map(function (x) {
      return '<div class="lrow"><span class="s">' + x[0] + '</span><span class="t" style="text-align:right">' + esc(x[1]) + '</span></div>';
    }).join('') + '</div>' + (C.on ? '' : '<p class="note" style="text-align:left;padding:8px 20px 0">Tend can’t send texts or notifications on its own. On any task, tap Add to Calendar and your calendar does the alerting.</p>');
  h += notifySettings();
  var ct = curTheme();
  var cm = curMode();
  h += '<div class="section"><h2 style="font-size:19px">Appearance</h2></div><div class="seg seg3" role="group" aria-label="Light or dark" style="margin:0 16px 10px">' + MODES.map(function (x) {
    return '<button data-act="mode" data-v="' + x[0] + '" aria-pressed="' + (cm === x[0]) + '">' + x[1] + '</button>';
  }).join('') + '</div>';
  h += '<div class="themes" role="group" aria-label="Color Theme">' + THEMES.map(function (x) {
    return '<button class="themebtn" data-act="theme" data-t="' + x[0] + '" aria-pressed="' + (ct === x[0]) + '"><span class="sw"><i style="background:' + x[2] + '"></i><i style="background:' + x[3] + '"></i></span>' + x[1] + '</button>';
  }).join('') + '</div><p class="note" style="text-align:left;padding:8px 20px 0">Automatic follows your device\u2019s light or dark setting. Tend Blue is the standard look. These only change this device.</p>';
  h += '<div class="section"><h2 style="font-size:19px">Suggested Tasks</h2></div><div class="stack"><button class="btn secondary" data-act="starter">' + ic('plus', 18) + 'What Do You Tend To? Add Suggestions</button><p class="note" style="text-align:left;padding:0 4px">Tasks already on your list are skipped.</p></div>';
  h += '<div class="section"><h2 style="font-size:19px">Your Data</h2></div><div class="stack">' +
    '<button class="btn danger' + (ui.armed === 'wipe' ? ' armed' : '') + '" data-act="wipe">' + (ui.armed === 'wipe' ? 'Tap Again to Erase Everything' : 'Erase All Data and Start Over') + '</button></div>';
  h += '<div class="section"><h2 style="font-size:19px">About</h2></div><div class="listcard"><div class="lrow"><span class="s">Tasks</span><span class="t">' + db.tasks.length + '</span></div><div class="lrow"><span class="s">Contacts</span><span class="t">' + db.contacts.length + '</span></div><div class="lrow"><span class="s">Belongings</span><span class="t">' + db.items.length + '</span></div><div class="lrow"><span class="s">Saved on Phone</span><span class="t" style="color:' + (storageOk ? 'var(--green)' : 'var(--red)') + '">' + (storageOk ? 'Yes' : 'Problem: back up now') + '</span></div></div>';
  if (!C.on) h += '<div class="section"><h2 style="font-size:19px">Testing</h2></div><p class="note" style="text-align:left;padding:0 20px 8px">For trying Tend out. Each of these replaces your whole list.</p><div class="stack">' +
    '<button class="btn secondary" data-act="example"' + (ui.armed === 'example' ? ' style="background:var(--fill);color:#fff"' : '') + '>' + (ui.armed === 'example' ? 'Tap Again: Replaces Your Current List' : 'Load Example Data') + '</button>' +
    '</div>';
  return h + '<div class="pad-b"></div>';
}
/* the original, phone-only Tend kept its list here (same website, so this phone can still read it) */
var OLD_KEY = 'tend.data.v1';
function oldTendRaw() { try { var r = localStorage.getItem(OLD_KEY), d = r && JSON.parse(r); return d && Array.isArray(d.tasks) && d.tasks.length ? r : null; } catch (e) { return null; } }
function oldTendCount() { var r = oldTendRaw(); return r ? JSON.parse(r).tasks.length : 0; }
function scrWelcome() {
  if (C.on) return '<div class="welcome"><img src="icon-192.png" alt=""><h1>Fill Your Household List</h1><p>Whatever you add here is shared with everyone in ' + esc(C.house || 'your household') + '.</p>' +
    (oldTendCount() ? '<p class="cnote"><strong>Your list from the original Tend is on this device</strong> (' + oldTendCount() + ' tasks). Bring it over to share it with your household.</p><button class="btn primary" data-act="bring-old">' + ic('upload', 18) + 'Bring Over My Tend List</button>'
      : '<p class="cnote"><strong>Moving from another phone?</strong> In Tend on that phone, open Settings and tap Save a Backup File. Then load that file here.</p>') +
    '<button class="btn ' + (oldTendCount() ? 'secondary' : 'primary') + '" data-act="start-starter">' + ic('plus', 18) + 'Pick from Suggested Tasks</button><button class="btn secondary" data-act="restore">' + ic('upload', 18) + 'Load a Tend Backup File</button><button class="btn secondary" data-act="start-empty">Start with an Empty List</button><button class="btn secondary" data-act="example">Try It with Example Data</button></div>';
  return '<div class="welcome"><img src="icon-192.png" alt=""><h1>Welcome to Tend</h1><p>Your household\u2019s recurring tasks, kids\u2019 visits and the people you call for them, all in one place on this device.</p>' +
    '<p>New here? Tell Tend what you tend to and pick from tasks people often forget. Or load a backup file. You can change it any time in Settings.</p>' +
    '<button class="btn primary" data-act="start-starter">What Do You Tend To?</button><button class="btn secondary" data-act="example">Try It with Example Data</button><button class="btn secondary" data-act="restore">' + ic('upload', 18) + 'Load My Tend File</button><button class="btn secondary" data-act="start-empty">Start with an Empty List</button>' +
    (storageOk ? '' : '<p style="color:var(--red)">This browser is blocking storage, so nothing will be saved. Add Tend to your Home Screen and open it from there.</p>') + '</div>';
}


/* ---------- color themes (fills and text only) ---------- */
var THEMES = [['midnight', 'Tend Blue', '#0049C5', '#FFFFFF'], ['mono', 'Black & White', '#111111', '#FFFFFF'], ['mocha', 'Mocha', '#3B2A2A', '#A8777C']];
var THEME_KEY = 'tend.theme';
function curTheme() { var t = 'midnight'; try { t = localStorage.getItem(THEME_KEY) || 'midnight'; } catch (e) {} return THEMES.some(function (x) { return x[0] === t; }) ? t : 'midnight'; }
function applyTheme(t) {
  var th = THEMES.find(function (x) { return x[0] === t; }) || THEMES[0];
  if (th[0] === 'mocha') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', th[0]);
  if (typeof applyMode === 'function' && document.documentElement.hasAttribute('data-mode')) applyMode(); else { var m = document.querySelector('meta[name="theme-color"]'); if (m) m.setAttribute('content', th[2]); }
}
function setTheme(t) { try { localStorage.setItem(THEME_KEY, t); } catch (e) {} applyTheme(t); }
/* light or dark: Automatic follows the phone */
var MODES = [['auto', 'Automatic'], ['light', 'Light'], ['dark', 'Dark']];
function curMode() { var m = 'auto'; try { m = localStorage.getItem('tend.mode') || 'auto'; } catch (e) {} return MODES.some(function (x) { return x[0] === m; }) ? m : 'auto'; }
function isDark() { var m = curMode(); return m === 'dark' || (m === 'auto' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches); }
function applyMode() {
  document.documentElement.setAttribute('data-mode', curMode());
  var m = document.querySelector('meta[name="theme-color"]'), th = THEMES.find(function (x) { return x[0] === curTheme(); }) || THEMES[0];
  if (m) m.setAttribute('content', isDark() ? (th[0] === 'midnight' ? '#0B4FB8' : th[0] === 'mono' ? '#000000' : '#2A1D1D') : th[2]);
}
function setMode(v) { try { localStorage.setItem('tend.mode', v); } catch (e) {} applyMode(); }
applyTheme(curTheme()); applyMode();
if (window.matchMedia) { var mq = window.matchMedia('(prefers-color-scheme: dark)'); if (mq.addEventListener) mq.addEventListener('change', applyMode); }

