'use strict';
/* Tend: Rendering and every tap, form submit and file action. */
/* ---------- render ---------- */
var view = document.getElementById('view'), tabs = document.getElementById('tabs');
function render() {
  if (C.on) { var cs = cloudScreen(); if (cs) { view.innerHTML = cs; tabs.hidden = true; document.getElementById('fab').innerHTML = ''; return; } }
  if (!db) { view.innerHTML = scrWelcome(); tabs.hidden = true; return; }
  if ((ui.screen === 'starter' || ui.screen === 'starter-pick') && !ui.st) ui.screen = 'home';
  var inStarter = ui.screen === 'starter' || ui.screen === 'starter-pick';
  var stp = inStarter ? 0 : setupStep();
  if (stp) { tabs.hidden = true; document.getElementById('fab').innerHTML = ''; view.innerHTML = stp === 1 ? scrProfile(true) : scrReminders(true); return; }
  if (!inStarter) { var pfn = getProfile().first; if (db.user !== pfn || db.members.indexOf(pfn) < 0 || ensureBirthday()) { syncUser(); save(); } }
  tabs.hidden = ['edit-task', 'edit-contact', 'edit-item', 'prefs', 'starter', 'starter-pick', 'profile'].indexOf(ui.screen) >= 0;
  var s = ui.screen;
  view.innerHTML = s === 'home' ? scrHome() : s === 'list' ? scrList() : s === 'calendar' ? scrCal() : s === 'contacts' ? scrContacts()
    : s === 'contact' ? scrContact() : s === 'task' ? scrTask() : s === 'settings' ? scrSettings() : s === 'edit-task' ? scrEditTask() : s === 'edit-contact' ? scrEditContact()
    : s === 'items' ? scrItems() : s === 'item' ? scrItem() : s === 'edit-item' ? scrEditItem() : s === 'starter' ? scrStarter() : s === 'starter-pick' ? scrStarterPick() : s === 'profile' ? scrProfile(false) : s === 'prefs' ? scrReminders(false) : scrHome();
  var tabOf = { home: 'home', settings: 'home', profile: 'home', prefs: 'home', list: 'tasks', task: 'tasks', 'edit-task': 'tasks', calendar: 'cal', contacts: 'people', contact: 'people', 'edit-contact': 'people', items: 'people', item: 'people', 'edit-item': 'people' };
  var cur = tabOf[ui.screen];
  var fab = document.getElementById('fab');
  fab.innerHTML = '';
  tabs.innerHTML = [['home', 'Home', 'tab-home'], ['tasks', 'Tasks', 'tab-tasks'], ['cal', 'Calendar', 'tab-cal'], ['people', 'Directory', 'tab-people']].map(function (x) {
    return '<button data-act="' + x[2] + '"' + (cur === x[0] ? ' aria-current="page"' : '') + '>' + ic(x[0], 24) + x[1] + '</button>';
  }).join('');
}

/* ---------- actions ---------- */
/* complete a task from a list row: check fills, row slides away, toast with Undo */
function quickDone(qid, qrow) {
  var T = today(), qt = db.tasks.find(function (x) { return x.id === qid; });
  if (!qt || !qrow || qrow.classList.contains('doing')) return;
  if (needsSheet(qt)) { go('task', { taskId: qid }, true); ui.completing = qid; keepRender(); return; } // it needs the new expiration date
  var qb = snapshot(qid);
  qt.history.unshift({ date: iso(T), by: db.user, at: new Date().toISOString() }); qt.history.sort(function (a, b) { return a.date < b.date ? 1 : -1; });
  qt.last = qt.history[0].date; qt.snooze = null; (qt.steps || []).forEach(function (s) { s.d = false; }); applyDone(qt, iso(T)); save(); hideHint();
  var qn = nextDue(qt), qmsg = 'Done: ' + qt.name + '. ' + (qn ? 'Next due ' + fmt(qn, true) + '.' : qt.freq === 'One-time' ? 'All finished.' : '');
  qrow.classList.add('doing');
  var qs = qrow.querySelector('.open b'); if (qs) qs.textContent = 'Done';
  var qm = qrow.querySelector('.open .st .meta'); if (qm) qm.textContent = qn ? 'Next ' + fmt(qn) : '';
  haptic(12);
  var box = qrow.closest('.swipe') || qrow;
  setTimeout(function () { box.classList.add('gone'); }, 900);
  var on = ui.screen; // if they've moved on to another screen by then, don't pop a toast over it
  setTimeout(function () { if (ui.screen !== on) return; keepRender(); showToast(qmsg, qb); }, 1200);
}
/* snooze a task for a week from a list row (swipe left) */
function quickSnooze(id, row) {
  var t = db.tasks.find(function (x) { return x.id === id; }); if (!t) return;
  var qb = snapshot(id), until = addDays(today(), 7);
  t.snooze = iso(until); save(); haptic(10);
  var box = row.closest('.swipe') || row; box.classList.add('gone');
  var on = ui.screen;
  setTimeout(function () { if (ui.screen !== on) return; keepRender(); showToast('Snoozed ' + t.name + ' until ' + fmt(until) + '.', qb); }, 300);
}
/* Undo keeps a copy of just the one task it changes, so a housemate's edits that sync in meanwhile are never rolled back */
/* new contacts start in the state most of your contacts are in */
function usualState() { var n = {}, best = ''; db.contacts.forEach(function (c) { if (c.state) { n[c.state] = (n[c.state] || 0) + 1; if (!best || n[c.state] > n[best]) best = c.state; } }); return best; }
function snapshot(id) {
  var t = db.tasks.find(function (x) { return x.id === id; }); if (!t) return null;
  var b = itemById(t.item); // a task that updates its belonging when done: undo puts both back
  return JSON.stringify(b ? { task: t, item: b } : t);
}
function restoreSnap(snap) {
  if (!snap) return; var old = JSON.parse(snap), ob = null;
  if (old.task) { ob = old.item; old = old.task; }
  var i = db.tasks.findIndex(function (x) { return x.id === old.id; });
  if (i >= 0) db.tasks[i] = old; else db.tasks.push(old);
  if (ob) { var j = db.items.findIndex(function (x) { return x.id === ob.id; }); if (j >= 0) db.items[j] = ob; }
  save();
}
/* finishing a task keeps its belonging up to date: a new expiration, the last-done date, the mileage */
function applyDone(t, dateIso, extra) {
  var ti = tieOf(t), b = itemById(t.item); extra = extra || {};
  if (ti && ti.renew && extra.tie) ti.b.fields[ti.key] = extra.tie;
  var latest = t.history[0] && t.history[0].date === dateIso;
  if (ti && !ti.renew && (!ti.b.fields[ti.key] || ti.b.fields[ti.key] < dateIso)) ti.b.fields[ti.key] = dateIso;
  if (b && b.type === 'Vehicle' && extra.miles) {
    if (extra.miles > miles(b.fields.miles)) b.fields.miles = String(extra.miles);
    if (ti && ti.key === 'oilLast' && latest) b.fields.oilMiles = String(extra.miles);
  }
}
function needsSheet(t) { var ti = tieOf(t); return !!(ti && ti.renew); }
function keepRender() { var k = view.scrollTop; render(); view.scrollTop = k; }
function markDone(dateIso, note, extra) {
  var t = db.tasks.find(function (x) { return x.id === ui.taskId; }); if (!t) return;
  var before = snapshot(t.id);
  if (extra && extra.miles) note = (note ? note + ' \u00b7 ' : '') + extra.miles.toLocaleString() + ' mi';
  t.history.unshift({ date: dateIso, by: db.user, note: note || '', at: new Date().toISOString() });
  t.history.sort(function (a, b) { return a.date < b.date ? 1 : -1; });
  t.last = t.history[0].date; t.snooze = null; (t.steps || []).forEach(function (s) { s.d = false; });
  applyDone(t, dateIso, extra);
  save(); haptic(12);
  var n = nextDue(t);
  render(); showToast('Done' + (dateIso !== iso(today()) ? ' on ' + fmt(parse(dateIso)) : '') + '. ' + (n ? 'Next due ' + fmt(n, true) + '.' : t.freq === 'One-time' ? 'All finished.' : ''), before);
}
function downloadFile(name, text, type) {
  var file;
  try { file = new File([text], name, { type: type }); } catch (e) { file = null; }
  if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
    return navigator.share({ files: [file], title: name }).then(function () { return true; }, function (e) { return e && e.name === 'AbortError' ? false : fallback(); });
  }
  return Promise.resolve(fallback());
  function fallback() {
    var url = URL.createObjectURL(new Blob([text], { type: type })), a = document.createElement('a');
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000); return true;
  }
}
function backup() {
  var data = JSON.parse(JSON.stringify(db)); data.exportedAt = new Date().toISOString(); data.profile = getProfile();
  var name = 'Tend-backup-' + iso(today()) + '.json';
  downloadFile(name, JSON.stringify(data, null, 1), 'application/json').then(function (ok) {
    if (ok) { db.lastBackup = new Date().toISOString(); save(); toast('Backup saved. Keep it in iCloud Drive or Files.'); }
  });
}
function icsFor(t) {
  var i = info(t); if (!i.due) return null;
  var d = function (x) { return iso(x).replace(/-/g, ''); };
  var txt = function (s) { return String(s).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/[,;]/g, function (c) { return '\\' + c; }); };
  var con = t.contact ? db.contacts.find(function (c) { return c.id === t.contact; }) : null;
  var desc = 'Due ' + fmt(i.due, true) + (t.early ? '. Can start ' + fmt(i.start, true) : '') + '.' + (t.notes ? '\n' + t.notes : '') + (con ? '\nContact: ' + con.name + (con.phone ? ' ' + con.phone : '') : '');
  var ib = itemById(t.item);
  if (ib) { var kv = ITEM_TYPES[ib.type].fields.filter(function (x) { return ib.fields[x[0]] && ITEM_TYPES[ib.type].key.indexOf(x[0]) >= 0; }).map(function (x) { return x[1] + ': ' + (x[2] === 'date' ? fmt(parse(ib.fields[x[0]]), true) : ib.fields[x[0]]); }); desc += '\n' + ib.name + (kv.length ? ' (' + kv.join(', ') + ')' : ''); }
  var lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Tend//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'BEGIN:VEVENT',
    'UID:tend-' + t.id + '-' + d(i.due) + '@tend.local', 'DTSTAMP:' + new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, ''),
    'DTSTART;VALUE=DATE:' + d(i.due), 'DTEND;VALUE=DATE:' + d(addDays(i.due, 1)), 'SUMMARY:' + txt('Due: ' + t.name + (t.who ? ' (' + t.who + ')' : '')),
    'DESCRIPTION:' + txt(desc), 'TRANSP:TRANSPARENT'];
  var startGap = Math.max(0, daysBetween(today(), i.due));
  var back = 24 - remindPrefs().hour;
  if (t.early > 1 && t.early <= startGap) lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + txt(t.name + ' can be done now'), 'TRIGGER:-P' + (t.early - 1) + 'DT' + back + 'H', 'END:VALARM');
  lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + txt(t.name + ' is due tomorrow'), 'TRIGGER:-PT' + back + 'H', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR');
  return lines.join('\r\n') + '\r\n';
}
function googleCalUrl(t) {
  var i = info(t); if (!i.due) return null;
  var d = function (x) { return iso(x).replace(/-/g, ''); };
  var con = t.contact ? db.contacts.find(function (c) { return c.id === t.contact; }) : null;
  var det = 'Due ' + fmt(i.due, true) + '.' + (t.notes ? '\n' + t.notes : '') + (con ? '\nContact: ' + con.name + (con.phone ? ' ' + con.phone : '') : '');
  return 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent('Due: ' + t.name + (t.who ? ' (' + t.who + ')' : '')) +
    '&dates=' + d(i.due) + '/' + d(addDays(i.due, 1)) + '&details=' + encodeURIComponent(det);
}
function restoreFrom(text) {
  var d;
  try { d = JSON.parse(text); } catch (e) { warn('That file isn\u2019t a Tend file.'); return; }
  if (!d || !Array.isArray(d.tasks)) { warn('That file isn\u2019t a Tend file.'); return; }
  var had = !!db;
  if (d.profile && !profileDone() && profileDone(d.profile)) { try { localStorage.setItem(PROFILE_KEY, JSON.stringify(d.profile)); } catch (e) {} }
  var nd; try { nd = normalize(d); } catch (e) { warn('That file couldn\u2019t be read. Nothing was changed.'); return; }
  db = nd;
  syncUser();
  save(); ui.stack = []; ui.screen = 'home';
  render(); view.scrollTop = 0;
  if (had) { ui.screen = 'settings'; toast('Restored ' + db.tasks.length + ' tasks and ' + db.contacts.length + ' contacts.'); }
}
var fileInput = document.getElementById('restoreFile');
fileInput.addEventListener('change', function () {
  var f = fileInput.files && fileInput.files[0]; if (!f) return;
  var r = new FileReader(); r.onload = function () { restoreFrom(String(r.result)); fileInput.value = ''; }; r.readAsText(f);
});

var CONFIRM_CLOUD_WIPE = ['Erase the Household List?', 'Every task, contact and belonging is erased for everyone in your household. Save a backup first if you might want it back.', 'Erase for Everyone'];
var CONFIRM = {
  'del-task': ['Delete This Task?', 'Its completion history goes with it. This can\u2019t be undone.', 'Delete'],
  'del-contact': ['Delete This Contact?', 'Tasks and belongings that use this contact will stay, without it.', 'Delete'],
  'del-item': ['Delete This Belonging?', 'Its saved details are removed. Related tasks stay.', 'Delete'],
  'del-hist': ['Remove This Completion?', 'Tend will recalculate the next due date.', 'Remove'],
  wipe: ['Erase All Data?', 'Every task, contact and belonging on this phone will be erased. Save a backup first if you might want it back.', 'Erase Everything'],
  example: ['Load Example Data?', 'This replaces everything currently on this phone with example data.', 'Replace'],
  restore: ['Restore from a Backup?', 'The backup file replaces the list for everyone in your household.', 'Choose File', 1],
  'sign-out': ['Sign Out?', 'Your household\u2019s list stays safe online. Sign back in any time.', 'Sign Out', 1],
  'house-leave': ['Leave This Household?', 'You\u2019ll lose its list until someone invites you again.', 'Leave'],
  'member-rm': ['Remove This Person?', 'They lose the household\u2019s list right away. You can invite them again later.', 'Remove']
};
/* what each confirmation is remembered as once it has been agreed to */
var ARMED_AS = { 'sign-out': 'signout', 'house-leave': 'leave' };
function armKey(a, c) { return a === 'del-hist' ? 'hist' + c.idx : a === 'member-rm' ? 'rm-' + c.uid : ARMED_AS[a] || a; }
function needsConfirm(a) {
  if (!CONFIRM[a]) return false;
  if (a === 'example') return !!(db && db.tasks.length);
  if (a === 'restore') return !!(C.on && db && db.tasks.length);
  if (a === 'sign-out') return C.on && ui.screen === 'settings' && !!db;
  if (a === 'house-leave' || a === 'member-rm') return C.on;
  return true;
}
function modalHtml() {
  var c = ui.confirm; if (!c) return '';
  if (C.on) CONFIRM.wipe = CONFIRM_CLOUD_WIPE;
  var t = CONFIRM[c.act].slice();
  if (c.act === 'sign-out') { var pend = pendingCount(); if (pend) t[1] = pend + (pend === 1 ? ' change hasn\u2019t' : ' changes haven\u2019t') + ' reached the household yet and will be lost.'; }
  return '<div class="modal" data-act="confirm-cancel"><div class="sheet" role="alertdialog" aria-modal="true" aria-labelledby="mdlT" data-act="noop"><h3 id="mdlT">' + t[0] + '</h3><p>' + t[1] + '</p>' +
    '<div class="btns2"><button class="btn secondary" data-act="confirm-cancel">Cancel</button><button class="btn ' + (t[3] ? 'primary' : 'solid-danger') + '" data-act="confirm-ok">' + t[2] + '</button></div></div></div>';
}
var confirmFrom = null;
function closeConfirm() { ui.confirm = null; ui.armed = null; showModal(); if (confirmFrom && document.contains(confirmFrom)) { try { confirmFrom.focus(); } catch (e) {} } confirmFrom = null; }
/* Escape backs out of a question or a photo; iOS only shows :active styles once something listens for touches */
document.addEventListener('keydown', function (e) {
  if (e.key !== 'Escape') return;
  if (ui.confirm) closeConfirm(); else if (ui.viewer) { ui.viewer = null; ui.armed = null; showViewer(); }
});
document.addEventListener('touchstart', function () {}, { passive: true });
function showModal() { document.getElementById('modal').innerHTML = modalHtml(); }
/* One tap saves once. A second tap on Save (or Add, or Done) while the first is still being handled,
   or a moment after, is ignored, so a slow phone can never make two copies. */
var SAVE_ACTS = ['save-task', 'save-contact', 'save-item', 'save-prefs', 'save-profile', 'st-apply', 'complete-save', 'house-create', 'invite'];
var saveLock = {};
var formTok = typeof WeakMap === 'function' ? new WeakMap() : null, tokN = 0;
function saveOnce(key) {
  // the lock belongs to the form being saved, so finishing one form and starting the next is never held up
  if (ui.form && formTok) { if (!formTok.has(ui.form)) formTok.set(ui.form, ++tokN); key += ':' + formTok.get(ui.form); }
  else if (key === 'complete-save') key += ':' + ui.taskId; // finishing one task never holds up the next
  var now = Date.now(); if (now < (saveLock[key] || 0)) return false; saveLock[key] = now + 1500; return true;
}
document.addEventListener('click', function (e) {
  var el = e.target.closest('[data-act]'); if (!el) return;
  var a = el.getAttribute('data-act'), T = today();
  if (a === 'noop') return;
  if (SAVE_ACTS.indexOf(a) >= 0 && !saveOnce(a.replace(/^save-/, ''))) return;
  if (a === 'confirm-cancel') { closeConfirm(); return; }
  if (a === 'confirm-ok') {
    var cf = ui.confirm; ui.confirm = null; showModal(); if (!cf) return;
    ui.armed = armKey(cf.act, cf);
    var fx = document.createElement('button'); fx.setAttribute('data-act', cf.act); if (cf.idx != null) fx.setAttribute('data-idx', cf.idx); if (cf.uid) fx.setAttribute('data-uid', cf.uid);
    fx.hidden = true; document.body.appendChild(fx); fx.click(); fx.remove(); return;
  }
  /* anything that can't be taken back asks once, the same way, wherever it lives */
  if (needsConfirm(a)) {
    var cfm = { act: a, idx: el.getAttribute('data-idx'), uid: el.getAttribute('data-uid') };
    if (ui.armed !== armKey(a, cfm)) {
      if (a === 'del-task') readForm('taskForm'); if (a === 'del-contact') readForm('contactForm'); if (a === 'del-item') readForm('itemForm');
      confirmFrom = document.activeElement; ui.confirm = cfm; showModal();
      var okb = document.querySelector('[data-act="confirm-cancel"].btn'); if (okb) okb.focus();
      return;
    }
  }
  if (C.on && cloudAct(a, el)) return;
  if (photoAct(a, el)) return;
  if (C.on && notifyAct(a, el)) return;
  if (['del-hist', 'del-task', 'del-contact', 'del-item', 'example', 'wipe'].indexOf(a) < 0 && ui.armed) { ui.armed = null; }
  switch (a) {
    case 'tab-home': go('home'); break;
    case 'tab-tasks': go('list', { filter: 'all', cat: '', q: '' }); break;
    case 'tab-cal': go('calendar', { calY: T.getFullYear(), calM: T.getMonth(), calDay: iso(T) }); break;
    case 'tab-people': go(ui.dir === 'items' ? 'items' : 'contacts', { cq: '', bq: '' }); break;
    case 'dir': ui.dir = el.getAttribute('data-to') === 'items' ? 'items' : 'contacts'; go(ui.dir, { cq: '', bq: '' }); break;
    case 'item': go('item', { itemId: el.getAttribute('data-id') }, true); break;
    case 'hist-all': ui.histAll = ui.itemId; keepRender(); break;
    case 'tie-new':
      var tb = itemById(ui.itemId), tk = el.getAttribute('data-k'); if (!tb) break;
      var tyears = tb.type === 'Document' ? ({ 'Passport': 'Every 10 years', 'Driver\u2019s license': 'Every 4 years', 'State ID': 'Every 4 years' }[tb.fields.kind] || 'Yearly') : 'Yearly';
      go('edit-task', { form: { id: null, name: renewName(tb, tk), cat: { Vehicle: 'Vehicle', Home: 'Home', Appliance: 'Home', Pet: 'Pets', Document: 'Personal' }[tb.type] || 'Misc', who: tb.type === 'Vehicle' || tb.type === 'Pet' ? tb.name : '', freq: tyears, fixed: true, first: '', last: '', early: tb.type === 'Document' ? '60' : '30', notes: '', how: '', stepsText: '', contact: '', item: tb.id, tie: tk, active: true, owner: '' } }, true); break;
    case 'new-item': go('edit-item', { form: itemForm(null) }, true); break;
    case 'edit-item': var eb = itemById(ui.itemId); if (eb) go('edit-item', { form: itemForm(eb) }, true); break;
    case 'save-item': saveItem(); break;
    case 'del-item':
      if (ui.armed !== 'del-item') { readForm('itemForm'); ui.armed = 'del-item'; render(); break; }
      var bid = ui.form.id; deletePhotos((itemById(bid) || {}).photos); db.items = db.items.filter(function (x) { return x.id !== bid; });
      db.tasks.forEach(function (t) { if (t.item === bid) t.item = null; }); save(); ui.form = null; go('items', { bq: '' }); toast('Belonging deleted.'); break;
    case 'copy': copyText(el.getAttribute('data-v'), el); break;
    case 'auto-vehicles':
      var vns = vehicleNamesInTasks();
      vns.forEach(function (nm) {
        var nb = { id: newId('b'), type: 'Vehicle', name: nm, fields: {}, notes: '', contacts: [] }; db.items.push(nb);
        db.tasks.forEach(function (t) { if (t.cat === 'Vehicle' && t.who === nm && !t.item) t.item = nb.id; });
      });
      save(); toast('Added ' + vns.length + (vns.length === 1 ? ' vehicle' : ' vehicles') + ' and connected their tasks. Tap one to add its plate and VIN.'); break;
    case 'new-task-item':
      var nbi = itemById(ui.itemId); if (!nbi) break;
      go('edit-task', { form: { id: null, name: '', cat: { Vehicle: 'Vehicle', Home: 'Home', Appliance: 'Home', Pet: 'Pets', Document: 'Personal' }[nbi.type] || 'Misc', who: nbi.type === 'Vehicle' || nbi.type === 'Pet' ? nbi.name : '', freq: 'Yearly', fixed: false, first: '', last: '', early: '14', notes: '', contact: '', item: nbi.id, active: true } }, true); break;
    case 'starter': startStarter(false); break;
    case 'theme': setTheme(el.getAttribute('data-t')); keepRender(); break;
    case 'mode': setMode(el.getAttribute('data-v')); keepRender(); break;
    case 'pref-pick': if (!ui.form || ui.form.days == null) ui.form = remindPrefs(); var pk = el.getAttribute('data-k'), pv = el.getAttribute('data-v'); ui.form[pk] = pk === 'cal' ? pv : +pv; keepRender(); break;
    case 'save-prefs': savePrefs(); break;
    case 'edit-prefs': go('prefs', { form: remindPrefs() }, true); break;
    case 'start-starter': startStarter(true); break;
    case 'st-cancel': ui.st = null; db = null; load(); ui.stack = []; ui.screen = 'home'; render(); view.scrollTop = 0; break;
    case 'st-role': var rk = el.getAttribute('data-k'); ui.st.roles[rk] = !ui.st.roles[rk]; keepRender(); break;
    case 'st-next': stPrefill(); go('starter-pick', {}, true); break;
    case 'st-pick': var pk = el.getAttribute('data-key'); ui.st.picks[pk] = !ui.st.picks[pk]; keepRender(); break;
    case 'st-all':
      var ar = ROLES.find(function (r) { return r.k === el.getAttribute('data-k'); });
      var allOn = ar.s.every(function (x, i) { return ui.st.picks[ar.k + ':' + i]; });
      ar.s.forEach(function (x, i) { ui.st.picks[ar.k + ':' + i] = !allOn; }); keepRender(); break;
    case 'st-add': var ak = el.getAttribute('data-kind'), al = ak === 'car' ? ui.st.cars : ak === 'pet' ? ui.st.pets : ak === 'bday' ? ui.st.bdays : ui.st.kids; al.push(ak === 'kid' || ak === 'bday' ? { n: '', b: '' } : ''); keepRender(); break;
    case 'st-del': var dk = el.getAttribute('data-kind'), dl = dk === 'car' ? ui.st.cars : dk === 'pet' ? ui.st.pets : dk === 'bday' ? ui.st.bdays : ui.st.kids; if (dl.length > 1) dl.splice(+el.getAttribute('data-i'), 1); keepRender(); break;
    case 'st-apply': applyStarter(); break;
    case 'settings': go('settings', {}, true); break;
    case 'list': go('list', { filter: el.getAttribute('data-filter') || 'all', cat: el.getAttribute('data-cat') || '', q: '' }); break;
    case 'mine': ui.mine = !ui.mine; try { localStorage.setItem('tend.mine', ui.mine ? '1' : ''); } catch (x) {} keepRender(); break;
    case 'filter': ui.filter = el.getAttribute('data-filter'); render(); break;
    case 'task': go('task', { taskId: el.getAttribute('data-id') }, true); break;
    case 'contact': go('contact', { conId: el.getAttribute('data-id') }, true); break;
    case 'back': back(); break;
    case 'clear-q': ui.q = ''; render(); break;
    case 'clear-cq': ui.cq = ''; render(); break;
    case 'clear-bq': ui.bq = ''; render(); break;
    case 'day': ui.calDay = el.getAttribute('data-day'); render(); break;
    case 'cal-today': ui.calY = T.getFullYear(); ui.calM = T.getMonth(); ui.calDay = iso(T); render(); break;
    case 'month': var m = new Date(ui.calY, ui.calM + (+el.getAttribute('data-step')), 1); ui.calY = m.getFullYear(); ui.calM = m.getMonth(); ui.calDay = iso(m); render(); break;
    case 'done': var dt0 = db.tasks.find(function (x) { return x.id === ui.taskId; }); if (dt0 && needsSheet(dt0)) { ui.completing = dt0.id; keepRender(); } else markDone(iso(T)); break;
    case 'complete-open': ui.completing = ui.taskId; keepRender(); break;
    case 'complete-cancel': ui.completing = null; keepRender(); break;
    case 'complete-save':
      var dd = document.getElementById('doneDate'), dv = dd && dd.value;
      if (!dv || !parse(dv)) { warn('Pick the date you finished it.'); break; }
      if (dv > iso(T)) { warn('Pick today or an earlier day.'); break; }
      var ctt = db.tasks.find(function (x) { return x.id === ui.taskId; }), cti = ctt && tieOf(ctt), ex = {};
      if (cti && cti.renew) {
        var nt = (document.getElementById('doneTie') || {}).value, old = cti.b.fields[cti.key] || '';
        if (!nt || !parse(nt)) { warn('Enter the new ' + cti.label.toLowerCase() + ' date.'); break; }
        if (old && nt <= old) { warn('The new date should be after ' + fmt(parse(old), true) + '.'); break; }
        ex.tie = nt;
      }
      var mi0 = (document.getElementById('doneMiles') || {}).value;
      if (mi0 && !miles(mi0)) { warn('Mileage should be a number, like 45210.'); break; }
      ex.miles = miles(mi0);
      var dn = document.getElementById('doneNote'); ui.completing = null; markDone(dv, dn ? dn.value.trim() : '', ex); break;
    case 'quick-done': quickDone(el.getAttribute('data-id'), el.closest('.row')); break;
    case 'undo-toast': if (showToast.undo) { restoreSnap(showToast.undo); hideToast(); keepRender(); showToast('Undone.'); } break;
    case 'hint-ok': hideHint(); keepRender(); break;
    case 'step':
      var stt = db.tasks.find(function (x) { return x.id === ui.taskId; }), sti = +el.getAttribute('data-i');
      if (stt && stt.steps && stt.steps[sti]) {
        stt.steps[sti].d = !stt.steps[sti].d; save(); haptic(8); keepRender();
        if (stt.steps[sti].d && stt.steps.every(function (s) { return s.d; }) && info(stt).status !== 'done') toast('All steps done. Tap Mark Complete when you\u2019re finished.');
      }
      break;
    case 'snooze':
      var st = db.tasks.find(function (x) { return x.id === ui.taskId; });
      if (st) { var sb4 = snapshot(st.id), on = st.snooze && parse(st.snooze) > T; st.snooze = on ? null : iso(addDays(T, 7)); save(); keepRender(); showToast(on ? 'Snooze removed.' : 'Snoozed until ' + fmt(addDays(T, 7)) + '. It still turns red if the deadline passes.', sb4); }
      break;
    case 'ics':
      var it = db.tasks.find(function (x) { return x.id === ui.taskId; });
      if (it && remindPrefs().cal === 'google') { var gu = googleCalUrl(it); if (gu) window.open(gu, '_blank', 'noopener'); break; }
      var ics = it && icsFor(it);
      if (ics) downloadFile(it.name.replace(/[^\w ]+/g, '').trim().replace(/\s+/g, '-') + '.ics', ics, 'text/calendar');
      break;
    case 'del-hist':
      var k = 'hist' + el.getAttribute('data-idx');
      if (ui.armed !== k) { ui.armed = k; render(); break; }
      var ht = db.tasks.find(function (x) { return x.id === ui.taskId; });
      if (ht) { var before = snapshot(ht.id); ht.history.splice(+el.getAttribute('data-idx'), 1); ht.last = ht.history[0] ? ht.history[0].date : null; save(); ui.armed = null; keepRender(); showToast('Completion removed.', before); }
      break;
    case 'edit-task':
      var et = db.tasks.find(function (x) { return x.id === ui.taskId; });
      go('edit-task', { form: Object.assign({}, et, { early: String(et.early), stepsText: (et.steps || []).map(function (s) { return s.t; }).join('\n') }) }, true); break;
    case 'new-task': go('edit-task', { form: { id: null, name: '', cat: ui.cat || 'Home', who: '', freq: 'Yearly', fixed: false, first: '', last: '', early: String(remindPrefs().days), notes: '', how: '', stepsText: '', contact: '', item: '', active: true, owner: '' } }, true); break;
    case 'toggle-active': readForm('taskForm'); ui.form.active = !ui.form.active; render(); break;
    case 'cancel': ui.form = null; back(); break;
    case 'save-task': saveTask(); break;
    case 'del-task':
      if (ui.armed !== 'del-task') { readForm('taskForm'); ui.armed = 'del-task'; render(); break; }
      var dt = db.tasks.find(function (x) { return x.id === ui.form.id; }); if (dt && dt.auto === 'birthday') db.noBday = true; if (dt) deletePhotos(dt.photos);
      db.tasks = db.tasks.filter(function (x) { return x.id !== ui.form.id; }); save(); ui.form = null; go('list', { filter: 'all', cat: '', q: '' }); toast('Task deleted.'); break;
    case 'edit-contact':
      var ec = db.contacts.find(function (x) { return x.id === ui.conId; }); go('edit-contact', { form: contactForm(ec, db.items.filter(function (b) { return b.contacts.indexOf(ec.id) >= 0; }).map(function (b) { return b.id; })) }, true); break;
    case 'new-contact': go('edit-contact', { form: contactForm({ kind: 'business', name: '', role: '', phone: '', text: '', email: '', street: '', city: '', state: usualState(), zip: '', web: '', login: '', notes: '', hours: {}, hoursNote: '', askFor: '', after: '' }, []) }, true); break;
    case 'contact-kind': readForm('contactForm'); ui.form.kind = el.getAttribute('data-k'); keepRender(); break;
    case 'save-contact': saveContact(); break;
    case 'del-contact':
      if (ui.armed !== 'del-contact') { readForm('contactForm'); ui.armed = 'del-contact'; render(); break; }
      var cid = ui.form.id; db.contacts = db.contacts.filter(function (x) { return x.id !== cid; });
      db.tasks.forEach(function (t) { if (t.contact === cid) t.contact = null; }); db.items.forEach(function (b) { b.contacts = b.contacts.filter(function (x) { return x !== cid; }); }); save(); ui.form = null; go('contacts', { cq: '' }); toast('Contact deleted.'); break;
    case 'rel-del':
      readForm(document.getElementById('itemForm') ? 'itemForm' : 'contactForm');
      var rk = el.getAttribute('data-kind') === 'contact' ? 'contacts' : 'items', rid = el.getAttribute('data-id');
      ui.form[rk] = (ui.form[rk] || []).filter(function (x) { return x !== rid; }); keepRender(); break;
    case 'edit-profile': go('profile', { form: Object.assign({}, getProfile()) }, true); break;
    case 'save-profile': saveProfile(); break;
    case 'backup': backup(); break;
    case 'restore':
      ui.armed = null; fileInput.click(); break;
    case 'bring-old': var oldRaw = oldTendRaw(); if (oldRaw) { restoreFrom(oldRaw); toast('Brought over ' + db.tasks.length + ' tasks from the original Tend.'); } break;
    case 'start-empty': db = blank(); save(); go('home'); break;
    case 'example':
      if (db && db.tasks.length && ui.armed !== 'example') { ui.armed = 'example'; render(); break; }
      ui.armed = null; loadExample(); break;
    case 'wipe':
      if (ui.armed !== 'wipe') { ui.armed = 'wipe'; render(); break; }
      if (C.on && C.hid) { db = blank(); syncUser(); save(); ui.armed = null; ui.stack = []; go('home'); toast('Household list erased for everyone.'); break; }
      try { localStorage.removeItem(KEY); } catch (x) {}
      db = null; ui.armed = null; ui.stack = []; ui.screen = 'home'; render(); view.scrollTop = 0; break;
  }
});
document.addEventListener('submit', function (e) {
  e.preventDefault();
  if (['taskForm', 'contactForm', 'itemForm', 'profileForm', 'prefsForm'].indexOf(e.target.id) >= 0 && !saveOnce(e.target.id.replace(/Form$/, ''))) return;
  if (C.on && cloudSubmit(e.target.id)) return;
  if (e.target.id === 'profileForm') { saveProfile(); return; }
  if (e.target.id === 'taskForm') saveTask(); else if (e.target.id === 'contactForm') saveContact(); else if (e.target.id === 'itemForm') saveItem();
});
document.addEventListener('change', function (e) {
  var el = e.target;
  if (el.getAttribute && el.getAttribute('data-st') === 'bday' && ui.st) { keepRender(); return; }
  if (el.name === 'addRel' && el.value && ui.form) {
    var rf = el.form.id, rv = el.value; readForm(rf); var key = rf === 'itemForm' ? 'contacts' : 'items';
    ui.form[key] = (ui.form[key] || []).concat([rv]); ui.form.addRel = ''; keepRender(); return;
  }
  if (el.id === 'catSel') { ui.cat = el.value; render(); }
  else if (el.id === 'otherDate' && el.value) { if (el.value > iso(today())) { warn('Pick today or an earlier day.'); return; } markDone(el.value); }
  else if (el.getAttribute && el.getAttribute('data-rerender')) { readForm(el.form ? el.form.id : 'taskForm'); render(); var nx = document.querySelector('input[name=whoOther], input[name=roleOther]'); if (nx && el.value === '__other') nx.focus(); }
});
document.addEventListener('input', function (e) {
  var el = e.target;
  if (el.getAttribute && el.getAttribute('data-st') && ui.st) {
    var sk = el.getAttribute('data-st'), si = +el.getAttribute('data-i');
    if (sk === 'kid' || sk === 'bday') { var kl = sk === 'kid' ? ui.st.kids : ui.st.bdays; if (kl[si]) kl[si][el.getAttribute('data-f')] = el.value; }
    else { var sl = sk === 'car' ? ui.st.cars : ui.st.pets; if (si < sl.length) sl[si] = el.value; }
    var sb = document.querySelector('[data-act="st-apply"]'), pl = stPlan().length;
    if (sb) { sb.disabled = !pl; sb.textContent = pl ? 'Add ' + pl + (pl === 1 ? ' Task' : ' Tasks') : 'Nothing New Selected'; }
    return;
  }
  if (el.id === 'q' || el.id === 'cq' || el.id === 'bq') {
    ui[el.id] = el.value;
    var res = document.getElementById('results'); if (res) res.innerHTML = el.id === 'q' ? taskResults() : el.id === 'bq' ? itemResults() : contactResults();
    var clr = el.parentNode.querySelector('.clear'); if (clr) clr.hidden = !el.value;
  }
});
function saveTask() {
  if (!ui.form) return;
  readForm('taskForm'); var f = ui.form;
  f.name = (f.name || '').trim();
  if (!f.name) { warn('Give the task a name.'); return; }
  if (f.first && !parse(f.first)) f.first = '';
  if (f.last && f.last > iso(today())) { warn('Last completed can\u2019t be in the future.'); return; }
  var was = f.id && db.tasks.find(function (x) { return x.id === f.id; });
  if (!f.last && was && was.history.length) { warn('To clear Last Completed, remove its entry under History on the task.'); return; }
  var early = parseInt(f.early, 10); early = isNaN(early) ? 0 : Math.max(0, Math.min(365, early));
  if (f.who === '__other') f.who = (f.whoOther || '').trim();
  var hol = f.cat === 'Celebrations' && HOLIDAYS[f.holiday] ? f.holiday : '';
  if (hol) { f.freq = 'Yearly'; f.fixed = true; if (!f.first) f.first = iso(today()); }
  var rec = { name: f.name, cat: f.cat, who: (f.who || '').trim(), freq: f.freq, fixed: !!f.fixed, holiday: hol, first: f.first || null, early: early, notes: (f.notes || '').trim(), contact: f.contact || null, item: itemById(f.item) ? f.item : null, active: !!f.active };
  rec.tie = rec.item && tieChoices(itemById(rec.item)).some(function (x) { return x[0] === f.tie; }) ? f.tie : '';
  var amt = parseFloat(String(f.amount == null ? '' : f.amount).replace(/[^\d.]/g, ''));
  var was0 = f.id && db.tasks.find(function (x) { return x.id === f.id; });
  rec.owner = f.owner && (personById(f.owner) || (was0 && was0.owner === f.owner)) ? f.owner : '';
  rec.how = String(f.how || '').trim().slice(0, 4000);
  var oldSteps = {}; ((f.id && (db.tasks.find(function (x) { return x.id === f.id; }) || {}).steps) || []).forEach(function (s) { oldSteps[s.t] = s.d; });
  rec.steps = normSteps(String(f.stepsText || '').split('\n').map(function (line) { var tx = line.replace(/^\s*([-*•]|\d+[.)])\s*/, '').trim(); return { t: tx, d: !!oldSteps[tx] }; }));
  rec.amount = f.cat === 'Bills & Finance' && amt > 0 ? Math.round(amt * 100) / 100 : null; rec.autopay = f.cat === 'Bills & Finance' && !!f.autopay;
  var t;
  if (f.id) { t = db.tasks.find(function (x) { return x.id === f.id; }); }
  if (!t) { t = { id: newId('t'), history: [], snooze: null, last: null }; db.tasks.push(t); f.id = t.id; } // saving the same form again updates, never copies
  Object.assign(t, rec);
  var newLast = f.last || null;
  if (newLast !== t.last) {
    if (newLast && !t.history.some(function (h) { return h.date === newLast; })) { t.history.push({ date: newLast, by: '' }); }
    t.history.sort(function (a, b) { return a.date < b.date ? 1 : -1; });
    t.last = newLast;
  }
  save(); ui.form = null; ui.stack.pop();
  go('task', { taskId: t.id }, false); ui.stack = [{ screen: 'list', scroll: 0 }];
  toast('Saved.');
}
function saveContact() {
  if (!ui.form) return;
  readForm('contactForm'); var f = ui.form;
  f.name = (f.name || '').trim();
  if (!f.name) { warn('Give the contact a name.'); return; }
  if (f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) { warn('That email doesn\u2019t look right.'); return; }
  if (f.role === '__other') f.role = (f.roleOther || '').trim();
  var hours = {}, half = '';
  [['wk', 'hWk'], ['sat', 'hSa'], ['sun', 'hSu']].forEach(function (d) {
    var o = f[d[1] + 'O'] || '', cl = f[d[1] + 'C'] || '';
    if ((o && !cl) || (cl && !o)) half = d[0];
    hours[d[0]] = o && cl ? hoursOf(o + '-' + cl) : '';
  });
  if (f.kind === 'business' && half) { warn('Add both the opening and closing time for ' + { wk: 'Mon\u2013Fri', sat: 'Saturday', sun: 'Sunday' }[half] + ', or leave both blank.'); return; }
  var c;
  if (f.id) c = db.contacts.find(function (x) { return x.id === f.id; });
  if (!c) { c = { id: newId('c') }; db.contacts.push(c); f.id = c.id; }
  ['name', 'role', 'phone', 'text', 'email', 'street', 'city', 'state', 'zip', 'web', 'login', 'notes', 'hoursNote', 'askFor', 'after'].forEach(function (k) { c[k] = String(f[k] || '').trim(); });
  c.kind = f.kind === 'person' ? 'person' : 'business'; c.hours = hours; c.after = fmtPhone(c.after);
  c.address = joinAddr(c.street, c.city, c.state, c.zip);
  c.phone = fmtPhone(c.phone); c.text = fmtPhone(c.text); if (c.text === c.phone) c.text = '';
  if (c.web && !/^https?:\/\//i.test(c.web)) c.web = 'https://' + c.web;
  var want = f.items || [];
  db.items.forEach(function (b) { var has = b.contacts.indexOf(c.id) >= 0, on = want.indexOf(b.id) >= 0; if (on && !has) b.contacts.push(c.id); if (!on && has) b.contacts = b.contacts.filter(function (x) { return x !== c.id; }); });
  save(); ui.form = null; ui.stack.pop();
  go('contact', { conId: c.id }, false); ui.stack = [{ screen: 'contacts', scroll: 0 }];
  toast('Saved.');
}

