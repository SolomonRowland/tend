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
function snapshot() { return JSON.stringify(db.tasks); }
function keepRender() { var k = view.scrollTop; render(); view.scrollTop = k; }
function markDone(dateIso, note) {
  var t = db.tasks.find(function (x) { return x.id === ui.taskId; }); if (!t) return;
  var before = snapshot();
  t.history.unshift({ date: dateIso, by: db.user, note: note || '' });
  t.history.sort(function (a, b) { return a.date < b.date ? 1 : -1; });
  t.last = t.history[0].date; t.snooze = null;
  save();
  var n = nextDue(t);
  ui.flash = 'Done' + (dateIso !== iso(today()) ? ' on ' + fmt(parse(dateIso)) : '') + '. ' + (n ? 'Next due ' + fmt(n, true) + '.' : t.freq === 'One-time' ? 'All finished.' : '');
  ui.undo = before; render();
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
  try { d = JSON.parse(text); } catch (e) { toast('That file isn\u2019t a Tend file.'); return; }
  if (!d || !Array.isArray(d.tasks)) { toast('That file isn\u2019t a Tend file.'); return; }
  var had = !!db;
  if (d.profile && !profileDone() && profileDone(d.profile)) { try { localStorage.setItem(PROFILE_KEY, JSON.stringify(d.profile)); } catch (e) {} }
  db = normalize(d);
  syncUser();
  save(); ui.stack = []; ui.screen = 'home';
  ui.flash = null; render(); view.scrollTop = 0;
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
  mylist: ['Load Your Household List?', 'This replaces everything currently on this phone with your household list.', 'Replace'],
  example: ['Load Example Data?', 'This replaces everything currently on this phone with example data.', 'Replace']
};
function modalHtml() {
  var c = ui.confirm; if (!c) return '';
  if (C.on) CONFIRM.wipe = CONFIRM_CLOUD_WIPE;
  var t = CONFIRM[c.act];
  return '<div class="modal" data-act="confirm-cancel"><div class="sheet" role="alertdialog" aria-modal="true" aria-labelledby="mdlT" data-act="noop"><h3 id="mdlT">' + t[0] + '</h3><p>' + t[1] + '</p>' +
    '<div class="btns2"><button class="btn secondary" data-act="confirm-cancel">Cancel</button><button class="btn solid-danger" data-act="confirm-ok">' + t[2] + '</button></div></div></div>';
}
function showModal() { document.getElementById('modal').innerHTML = modalHtml(); }
document.addEventListener('click', function (e) {
  var el = e.target.closest('[data-act]'); if (!el) return;
  var a = el.getAttribute('data-act'), T = today();
  if (a === 'noop') return;
  if (C.on && cloudAct(a, el)) return;
  if (photoAct(a, el)) return;
  if (C.on && notifyAct(a, el)) return;
  if (a === 'confirm-cancel') { ui.confirm = null; ui.armed = null; showModal(); return; }
  if (a === 'confirm-ok') {
    var cf = ui.confirm; ui.confirm = null; showModal(); if (!cf) return;
    ui.armed = cf.act === 'del-hist' ? 'hist' + cf.idx : cf.act;
    var fx = document.createElement('button'); fx.setAttribute('data-act', cf.act); if (cf.idx != null) fx.setAttribute('data-idx', cf.idx);
    fx.hidden = true; document.body.appendChild(fx); fx.click(); fx.remove(); return;
  }
  if (CONFIRM[a] && !(a === 'example' || a === 'mylist') || ((a === 'example' || a === 'mylist') && db && db.tasks.length)) {
    var key = a === 'del-hist' ? 'hist' + el.getAttribute('data-idx') : a;
    if (ui.armed !== key) {
      if (a === 'del-task') readForm('taskForm'); if (a === 'del-contact') readForm('contactForm'); if (a === 'del-item') readForm('itemForm');
      ui.confirm = { act: a, idx: el.getAttribute('data-idx') }; showModal();
      var okb = document.querySelector('[data-act="confirm-ok"]'); if (okb) okb.focus();
      return;
    }
  }
  if (['del-hist', 'del-task', 'del-contact', 'del-item', 'example', 'wipe', 'mylist'].indexOf(a) < 0 && ui.armed) { ui.armed = null; }
  switch (a) {
    case 'tab-home': go('home'); break;
    case 'tab-tasks': go('list', { filter: 'all', cat: '', q: '' }); break;
    case 'tab-cal': go('calendar', { calY: T.getFullYear(), calM: T.getMonth(), calDay: iso(T) }); break;
    case 'tab-people': go(ui.dir === 'items' ? 'items' : 'contacts', { cq: '', bq: '' }); break;
    case 'dir': ui.dir = el.getAttribute('data-to') === 'items' ? 'items' : 'contacts'; go(ui.dir, { cq: '', bq: '' }); break;
    case 'item': go('item', { itemId: el.getAttribute('data-id') }, true); break;
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
    case 'filter': ui.filter = el.getAttribute('data-filter'); ui.flash = null; ui.undo = null; render(); break;
    case 'task': go('task', { taskId: el.getAttribute('data-id') }, true); break;
    case 'contact': go('contact', { conId: el.getAttribute('data-id') }, true); break;
    case 'back': back(); break;
    case 'clear-q': ui.q = ''; render(); break;
    case 'clear-cq': ui.cq = ''; render(); break;
    case 'clear-bq': ui.bq = ''; render(); break;
    case 'day': ui.calDay = el.getAttribute('data-day'); render(); break;
    case 'cal-today': ui.calY = T.getFullYear(); ui.calM = T.getMonth(); ui.calDay = iso(T); render(); break;
    case 'month': var m = new Date(ui.calY, ui.calM + (+el.getAttribute('data-step')), 1); ui.calY = m.getFullYear(); ui.calM = m.getMonth(); ui.calDay = iso(m); render(); break;
    case 'done': markDone(iso(T)); break;
    case 'complete-open': ui.completing = ui.taskId; ui.flash = null; ui.undo = null; keepRender(); break;
    case 'complete-cancel': ui.completing = null; keepRender(); break;
    case 'complete-save':
      var dd = document.getElementById('doneDate'), dv = dd && dd.value;
      if (!dv || !parse(dv)) { toast('Pick the date you finished it.'); break; }
      if (dv > iso(T)) { toast('Pick today or an earlier day.'); break; }
      var dn = document.getElementById('doneNote'); ui.completing = null; markDone(dv, dn ? dn.value.trim() : ''); break;
    case 'quick-done':
      var qid = el.getAttribute('data-id'), qt = db.tasks.find(function (x) { return x.id === qid; }), qrow = el.closest('.row');
      if (qt && qrow && !qrow.classList.contains('doing')) {
        var qb = snapshot();
        qt.history.unshift({ date: iso(T), by: db.user }); qt.history.sort(function (a, b) { return a.date < b.date ? 1 : -1; });
        qt.last = qt.history[0].date; qt.snooze = null; save(); hideHint();
        var qn = nextDue(qt), qmsg = 'Done: ' + qt.name + '. ' + (qn ? 'Next due ' + fmt(qn, true) + '.' : qt.freq === 'One-time' ? 'All finished.' : '');
        qrow.classList.add('doing');
        var qs = qrow.querySelector('.open b'); if (qs) qs.textContent = 'Done';
        var qm = qrow.querySelector('.open .st .meta'); if (qm) qm.textContent = qn ? 'Next ' + fmt(qn) : '';
        if (navigator.vibrate) try { navigator.vibrate(12); } catch (e) {}
        ui.flash = null; ui.undo = null;
        setTimeout(function () { qrow.classList.add('gone'); }, 900);
        setTimeout(function () { if (ui.screen === 'home' || ui.screen === 'list') keepRender(); showToast(qmsg, qb); }, 1200);
      }
      break;
    case 'undo-toast': if (showToast.undo) { db.tasks = JSON.parse(showToast.undo); save(); hideToast(); keepRender(); showToast('Undone.'); } break;
    case 'hint-ok': hideHint(); keepRender(); break;
    case 'undo': if (ui.undo) { var uk = view.scrollTop; db.tasks = JSON.parse(ui.undo); save(); ui.undo = null; ui.flash = 'Undone.'; render(); view.scrollTop = uk; } break;
    case 'snooze':
      var st = db.tasks.find(function (x) { return x.id === ui.taskId; });
      if (st) { var on = st.snooze && parse(st.snooze) > T; st.snooze = on ? null : iso(addDays(T, 7)); save(); toast(on ? 'Snooze removed.' : 'Snoozed until ' + fmt(addDays(T, 7)) + '. It still turns red if the deadline passes.'); }
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
      if (ht) { var before = snapshot(); ht.history.splice(+el.getAttribute('data-idx'), 1); ht.last = ht.history[0] ? ht.history[0].date : null; save(); ui.armed = null; ui.flash = 'Entry removed.'; ui.undo = before; render(); }
      break;
    case 'edit-task':
      var et = db.tasks.find(function (x) { return x.id === ui.taskId; });
      go('edit-task', { form: Object.assign({}, et, { early: String(et.early) }) }, true); break;
    case 'new-task': go('edit-task', { form: { id: null, name: '', cat: ui.cat || 'Home', who: '', freq: 'Yearly', fixed: false, first: '', last: '', early: String(remindPrefs().days), notes: '', contact: '', item: '', active: true } }, true); break;
    case 'toggle-active': readForm('taskForm'); ui.form.active = !ui.form.active; render(); break;
    case 'cancel': ui.form = null; back(); break;
    case 'save-task': saveTask(); break;
    case 'del-task':
      if (ui.armed !== 'del-task') { readForm('taskForm'); ui.armed = 'del-task'; render(); break; }
      var dt = db.tasks.find(function (x) { return x.id === ui.form.id; }); if (dt && dt.auto === 'birthday') db.noBday = true; if (dt) deletePhotos(dt.photos);
      db.tasks = db.tasks.filter(function (x) { return x.id !== ui.form.id; }); save(); ui.form = null; go('list', { filter: 'all', cat: '', q: '' }); toast('Task deleted.'); break;
    case 'edit-contact':
      var ec = db.contacts.find(function (x) { return x.id === ui.conId; }); go('edit-contact', { form: Object.assign({}, ec, { items: db.items.filter(function (b) { return b.contacts.indexOf(ec.id) >= 0; }).map(function (b) { return b.id; }) }) }, true); break;
    case 'new-contact': go('edit-contact', { form: { id: null, name: '', role: '', phone: '', text: '', email: '', street: '', city: '', state: 'IL', zip: '', web: '', login: '', notes: '', items: [] } }, true); break;
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
    case 'restore': fileInput.click(); break;
    case 'start-empty': db = blank(); save(); go('home'); break;
    case 'example':
      if (db && db.tasks.length && ui.armed !== 'example') { ui.armed = 'example'; render(); break; }
      ui.armed = null; loadExample(); break;
    case 'mylist':
      if (db && db.tasks.length && ui.armed !== 'mylist') { ui.armed = 'mylist'; render(); break; }
      ui.armed = null; loadMyList(); break;
    case 'wipe':
      if (ui.armed !== 'wipe') { ui.armed = 'wipe'; render(); break; }
      if (C.on && C.hid) { db = blank(); syncUser(); save(); ui.armed = null; ui.stack = []; go('home'); toast('Household list erased for everyone.'); break; }
      try { localStorage.removeItem(KEY); } catch (x) {}
      db = null; ui.armed = null; ui.stack = []; ui.screen = 'home'; render(); view.scrollTop = 0; break;
  }
});
document.addEventListener('submit', function (e) {
  e.preventDefault();
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
  else if (el.id === 'otherDate' && el.value) { if (el.value > iso(today())) { toast('Pick today or an earlier day.'); return; } markDone(el.value); }
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
  readForm('taskForm'); var f = ui.form;
  f.name = (f.name || '').trim();
  if (!f.name) { toast('Give the task a name.'); return; }
  if (f.first && !parse(f.first)) f.first = '';
  if (f.last && f.last > iso(today())) { toast('Last completed can\u2019t be in the future.'); return; }
  var early = parseInt(f.early, 10); early = isNaN(early) ? 0 : Math.max(0, Math.min(365, early));
  if (f.who === '__other') f.who = (f.whoOther || '').trim();
  var hol = f.cat === 'Celebrations' && HOLIDAYS[f.holiday] ? f.holiday : '';
  if (hol) { f.freq = 'Yearly'; f.fixed = true; if (!f.first) f.first = iso(today()); }
  var rec = { name: f.name, cat: f.cat, who: (f.who || '').trim(), freq: f.freq, fixed: !!f.fixed, holiday: hol, first: f.first || null, early: early, notes: (f.notes || '').trim(), contact: f.contact || null, item: itemById(f.item) ? f.item : null, active: !!f.active };
  var amt = parseFloat(String(f.amount == null ? '' : f.amount).replace(/[^\d.]/g, ''));
  rec.amount = f.cat === 'Bills & Finance' && amt > 0 ? Math.round(amt * 100) / 100 : null; rec.autopay = f.cat === 'Bills & Finance' && !!f.autopay;
  var t;
  if (f.id) { t = db.tasks.find(function (x) { return x.id === f.id; }); }
  if (!t) { t = { id: newId('t'), history: [], snooze: null, last: null }; db.tasks.push(t); }
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
  readForm('contactForm'); var f = ui.form;
  f.name = (f.name || '').trim();
  if (!f.name) { toast('Give the contact a name.'); return; }
  if (f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) { toast('That email doesn\u2019t look right.'); return; }
  if (f.role === '__other') f.role = (f.roleOther || '').trim();
  var c;
  if (f.id) c = db.contacts.find(function (x) { return x.id === f.id; });
  if (!c) { c = { id: newId('c') }; db.contacts.push(c); }
  ['name', 'role', 'phone', 'text', 'email', 'street', 'city', 'state', 'zip', 'web', 'login', 'notes'].forEach(function (k) { c[k] = (f[k] || '').trim(); });
  c.address = joinAddr(c.street, c.city, c.state, c.zip);
  c.phone = fmtPhone(c.phone); c.text = fmtPhone(c.text); if (c.text === c.phone) c.text = '';
  if (c.web && !/^https?:\/\//i.test(c.web)) c.web = 'https://' + c.web;
  var want = f.items || [];
  db.items.forEach(function (b) { var has = b.contacts.indexOf(c.id) >= 0, on = want.indexOf(b.id) >= 0; if (on && !has) b.contacts.push(c.id); if (!on && has) b.contacts = b.contacts.filter(function (x) { return x !== c.id; }); });
  save(); ui.form = null; ui.stack.pop();
  go('contact', { conId: c.id }, false); ui.stack = [{ screen: 'contacts', scroll: 0 }];
  toast('Saved.');
}

