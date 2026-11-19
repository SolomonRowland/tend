'use strict';
/* Tend: Constants, dates, storage, holiday and scheduling rules, UI state and icons. */
/* =========================================================
   Tend: household maintenance tracker. Data lives on this phone
   (localStorage), with a JSON backup file for safekeeping.
   ========================================================= */
var KEY = 'tend.data.v1';
var CATS = ['Home','Cleaning','Yard & Pool','Vehicle','Health','Personal','Bills & Finance','Tech & Digital','Pets','Celebrations','Misc'];
var FREQS = [['Weekly',0,7],['Every 2 weeks',0,14],['Monthly',1,0],['Every 2 months',2,0],['Every 3 months',3,0],['Every 4 months',4,0],
  ['Every 6 months',6,0],['Yearly',12,0],['Every 2 years',24,0],['Every 3 years',36,0],['Every 4 years',48,0],['Every 5 years',60,0],
  ['Every 10 years',120,0],['Well-child (by age)',0,0],['One-time',0,0]];
var FREQ = {}; FREQS.forEach(function (f) { FREQ[f[0]] = { mo: f[1], dy: f[2] }; });
var MILESTONES = [0,0.5,1,3,6,9,12,15,18,24,30,36,48,60,72,84,96,108,120,132,144,156,168,180,192,204,216];
var WHERE_GROUPS = [
  ['People', ['Family', 'Adults', 'Kids', 'Solomon', 'Kelly', 'Solomon & Kelly', 'Pets']],
  ['Inside', ['Whole house', 'Kitchen', 'Bathrooms', 'Kitchen & baths', 'Bedrooms', 'All beds', 'Living areas', 'Laundry', 'Laundry / Kitchen', 'Basement', 'Attic', 'HVAC', 'Utility', 'Home office', 'Home']],
  ['Outside', ['Exterior', 'Roof & gutters', 'Garage', 'Yard', 'Patio', 'Deck', 'Pool', 'Driveway']],
  ['Vehicles', ['All vehicles', "Kids' car seats"]],
  ['Tech & Accounts', ['Home network', 'Online', 'Phones & computers']]
];
var USE_GROUPS = [
  ['Health', ['Pediatrician', 'Family doctor', 'OB-GYN', 'Specialist', 'Dentist', 'Orthodontist', 'Eye doctor', 'Chiropractor', 'Physical therapist', 'Counselor / therapist', 'Pharmacy', 'Urgent care', 'Hospital', 'Veterinarian']],
  ['Home Services', ['Heating & cooling (HVAC)', 'Plumber', 'Electrician', 'Handyman', 'Roofer', 'Gutter cleaning', 'Appliance repair', 'Water softener / water treatment', 'Septic service', 'Well service', 'Chimney sweep', 'Garage door', 'Locksmith', 'Pest control', 'Security / alarm', 'House cleaning', 'Carpet cleaning', 'Window cleaning', 'Painter', 'General contractor', 'Flooring', 'Moving / storage']],
  ['Yard & Outdoor', ['Lawn care / landscaping', 'Tree service', 'Snow removal', 'Irrigation / sprinklers', 'Pool service', 'Fence / deck']],
  ['Vehicles', ['Auto mechanic', 'Tire shop', 'Car dealer', 'Car wash / detailing', 'Body shop', 'Towing / roadside', 'Secretary of State / DMV']],
  ['Money & Legal', ['Insurance agent', 'Bank / credit union', 'Mortgage lender', 'Financial advisor', 'Accountant / tax preparer', 'Attorney', 'HOA / property manager', 'Employer / HR benefits']],
  ['Utilities & Tech', ['Electric company', 'Gas company', 'Water / sewer', 'Trash & recycling', 'Internet / cable', 'Cell phone carrier', 'Tech support']],
  ['Family & Kids', ['School', 'Daycare / preschool', 'Babysitter', 'Coach / activities', 'Church', 'Family', 'Friend', 'Neighbor']],
  ['Personal Care', ['Hair salon / barber', 'Gym / fitness', 'Dry cleaner / tailor']],
  ['Government', ['City / village hall', 'Post office', 'Passport office']]
];
var STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','DC','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];
var EARLY = [0, 3, 5, 7, 10, 14, 21, 30, 45, 60, 90, 120, 180];
var MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
var MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
var DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

/* ---------- dates (all local, date-only) ---------- */
function parse(s) { if (!s) return null; var p = String(s).split('-'); var d = new Date(+p[0], +p[1] - 1, +p[2]); return isNaN(d) ? null : d; }
function iso(d) { var m = d.getMonth() + 1, x = d.getDate(); return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (x < 10 ? '0' : '') + x; }
function addDays(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); }
function addMonths(d, n) { var r = new Date(d.getFullYear(), d.getMonth() + n, 1); var last = new Date(r.getFullYear(), r.getMonth() + 1, 0).getDate(); r.setDate(Math.min(d.getDate(), last)); return r; }
function daysBetween(a, b) { return Math.round((b - a) / 86400000); }
function today() { var n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); }
function fmt(d, year) { if (!d) return ''; var t = today(); var y = year === true || (year !== false && d.getFullYear() !== t.getFullYear()); return MON[d.getMonth()] + ' ' + d.getDate() + (y ? ', ' + d.getFullYear() : ''); }

/* ---------- escape ---------- */
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

/* ---------- storage ---------- */
var db = null, storageOk = true;
function blank() { return { app: 'tend', version: 1, user: '', members: [], tasks: [], contacts: [], items: [], lastBackup: null, nextId: 1 }; }
function load() {
  try { var raw = localStorage.getItem(KEY); if (raw) { db = normalize(JSON.parse(raw)); return true; } }
  catch (e) { storageOk = false; }
  db = null; return false;
}
function save() {
  db.savedAt = new Date().toISOString();
  try { localStorage.setItem(KEY, JSON.stringify(db)); storageOk = true; }
  catch (e) { storageOk = false; toast('Couldn\u2019t save on this phone. Save a backup now.'); }
  if (C.on && C.hid) schedulePush();
}
function normalize(d) {
  var out = blank();
  out.user = d.user || '';
  out.members = Array.isArray(d.members) ? d.members.filter(Boolean).map(String).slice(0, 6) : [];
  out.lastBackup = d.lastBackup || null; out.noBday = !!d.noBday;
  var n = 1;
  out.contacts = (d.contacts || []).map(function (c) {
    var street = c.street || '', city = c.city || '', state = c.state || '', zip = c.zip || '';
    if (!street && !city && !state && !zip && c.address) {
      var m = /^\s*(?:(.*?),\s*)?([^,]+?),\s*([A-Za-z]{2})\.?\s*(\d{5}(?:-\d{4})?)?\s*$/.exec(c.address);
      if (m && STATES.indexOf(m[3].toUpperCase()) >= 0) { street = m[1] || ''; city = m[2]; state = m[3].toUpperCase(); zip = m[4] || ''; } else street = c.address;
    }
    var role = ROLE_FIX[c.role] || c.role || '';
    return { id: String(c.id || ('c' + n++)), name: String(c.name || 'Untitled'), role: role, phone: c.phone || '', text: c.text || '', email: c.email || '', login: c.login || '', street: street, city: city, state: state, zip: zip, address: joinAddr(street, city, state, zip), web: c.web || '', notes: c.notes || '' };
  });
  var cids = {}; out.contacts.forEach(function (c) { cids[c.id] = 1; });
  out.items = (Array.isArray(d.items) ? d.items : []).filter(Boolean).map(function (b) {
    var f = {}, src = b.fields && typeof b.fields === 'object' ? b.fields : {};
    Object.keys(src).forEach(function (k) { if (src[k] != null && String(src[k]).trim() !== '') f[k] = String(src[k]); });
    return { id: String(b.id || ('b' + n++)), type: ITEM_TYPES[b.type] ? b.type : 'Other', name: String(b.name || b.type || 'Untitled'), fields: f, notes: b.notes || '', contacts: (Array.isArray(b.contacts) ? b.contacts : []).map(String).filter(function (x, i, a) { return cids[x] && a.indexOf(x) === i; }), photos: normPhotos(b.photos) };
  });
  var bids = {}; out.items.forEach(function (b) { bids[b.id] = 1; });
  var oldBills = Array.isArray(d.budget) ? d.budget.filter(Boolean) : [];
  out.tasks = (d.tasks || []).map(function (t) {
    var hist = Array.isArray(t.history) ? t.history.filter(function (h) { return h && parse(h.date); }).map(function (h) {
      var e = { date: h.date, by: h.by || '', note: h.note || '' };
      if (typeof h.at === 'string' && /^\d{4}-\d\d-\d\dT[\d:.]+Z$/.test(h.at)) e.at = h.at; // exact moment it was ticked off, for "Recently done"
      return e;
    }) : [];
    hist.sort(function (a, b) { return a.date < b.date ? 1 : -1; });
    return {
      id: String(t.id || ('t' + n++)), name: String(t.name || 'Untitled'), cat: CATS.indexOf(t.cat) >= 0 ? t.cat : t.cat === 'Finance & Insurance' ? 'Bills & Finance' : 'Misc', who: t.who || '',
      freq: FREQ[t.freq] ? t.freq : 'Yearly', fixed: !!t.fixed, first: parse(t.first) ? t.first : null, last: parse(t.last) ? t.last : (hist[0] ? hist[0].date : null),
      early: Math.max(0, Math.min(365, parseInt(t.early, 10) || 0)), active: t.active !== false, notes: t.notes || '',
      holiday: HOLIDAYS[t.holiday] ? t.holiday : '', auto: t.auto === 'birthday' ? 'birthday' : '', contact: t.contact && cids[t.contact] ? t.contact : null, item: t.item && bids[t.item] ? t.item : null, amount: parseFloat(t.amount) > 0 ? Math.round(parseFloat(t.amount) * 100) / 100 : null, autopay: !!t.autopay, snooze: parse(t.snooze) ? t.snooze : null, history: hist, photos: normPhotos(t.photos), owner: typeof t.owner === 'string' ? t.owner.slice(0, 40) : ''
    };
  });
  var max = 0;
  out.tasks.concat(out.contacts, out.items).forEach(function (x) { var m = /(\d+)$/.exec(x.id); if (m) max = Math.max(max, +m[1]); });
  out.nextId = Math.max(d.nextId || 1, max + 1);
  /* bills used to be kept separately; each becomes (or joins) a task in Bills & Finance */
  oldBills.forEach(function (e) {
    var amt = Math.round((parseFloat(e.amount) || 0) * 100) / 100; if (!(amt > 0)) return;
    var at = (d.tasks || []).findIndex(function (x) { return x && x.budget === e.id; }), t = at >= 0 ? out.tasks[at] : null;
    if (t) { if (!t.amount) t.amount = amt; t.autopay = t.autopay || !!e.autopay; t.cat = 'Bills & Finance'; return; }
    out.tasks.push({ id: 't' + out.nextId++, name: String(e.name || 'Bill'), cat: 'Bills & Finance', who: '', freq: FREQ[e.freq] ? e.freq : 'Monthly', fixed: true, first: parse(e.next) ? e.next : null, last: null,
      early: 5, active: true, notes: e.notes || '', holiday: '', auto: '', contact: e.payee && cids[e.payee] ? e.payee : null, item: e.item && bids[e.item] ? e.item : null, amount: amt, autopay: !!e.autopay, snooze: null, history: [] });
  });
  return out;
}
var ROLE_FIX = { "Kids' doctor": 'Pediatrician', 'Plates, stickers and licenses': 'Secretary of State / DMV', 'Furnace and A/C service (example)': 'Heating & cooling (HVAC)', 'Oil changes and tires (example)': 'Auto mechanic' };
function fmtPhone(p) { var d = String(p || '').replace(/\D/g, ''); if (d.length === 11 && d[0] === '1') d = d.slice(1); return d.length === 10 ? '(' + d.slice(0, 3) + ') ' + d.slice(3, 6) + '-' + d.slice(6) : String(p || '').trim(); }
function joinAddr(street, city, state, zip) {
  var line2 = [city, [state, zip].filter(Boolean).join(' ')].filter(Boolean).join(', ');
  return [street, line2].filter(Boolean).join(', ');
}
function newId(p) {
  if (C.on) return p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); // unique across phones
  var id = p + db.nextId; db.nextId++; return id;
}

/* ---------- holidays that move each year ---------- */
function nthDow(y, m, dow, n) {
  if (n > 0) { var d = new Date(y, m, 1); return new Date(y, m, 1 + ((dow - d.getDay() + 7) % 7) + (n - 1) * 7); }
  var e = new Date(y, m + 1, 0); return new Date(y, m, e.getDate() - ((e.getDay() - dow + 7) % 7));
}
function easter(y) {
  var a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3),
    h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  return new Date(y, Math.floor((h + l - 7 * m + 114) / 31) - 1, ((h + l - 7 * m + 114) % 31) + 1);
}
var HOLIDAYS = {
  mothers: ['Mother’s Day', function (y) { return nthDow(y, 4, 0, 2); }],
  fathers: ['Father’s Day', function (y) { return nthDow(y, 5, 0, 3); }],
  easter: ['Easter', easter],
  memorial: ['Memorial Day', function (y) { return nthDow(y, 4, 1, -1); }],
  labor: ['Labor Day', function (y) { return nthDow(y, 8, 1, 1); }],
  thanksgiving: ['Thanksgiving', function (y) { return nthDow(y, 10, 4, 4); }]
};
function nextHoliday(k, ref) { var d = HOLIDAYS[k][1](ref.getFullYear()); return d < ref ? HOLIDAYS[k][1](ref.getFullYear() + 1) : d; }
function nextAnniv(dob, from) {
  var b = parse(dob), T = from || today(); if (!b) return null;
  function on(y) { var last = new Date(y, b.getMonth() + 1, 0).getDate(); return new Date(y, b.getMonth(), Math.min(b.getDate(), last)); }
  var d = on(T.getFullYear()); return d < T ? on(T.getFullYear() + 1) : d;
}

/* ---------- scheduling: same rules as the spreadsheet ---------- */
function nextDue(t) {
  if (!t.active) return null;
  var first = parse(t.first), last = parse(t.last), f = FREQ[t.freq];
  if (t.holiday && HOLIDAYS[t.holiday]) return nextHoliday(t.holiday, last ? addDays(last, t.early + 1) : (first || today()));
  if (t.freq === 'One-time') return last ? null : first;
  if (t.freq === 'Well-child (by age)') {
    if (!first) return null;
    if (!last) return addDays(first, 4);
    var x = (last - first) / 86400000 / 30.4375; x = x + Math.max(0.25, x * 0.05);
    var idx = -1; for (var i = 0; i < MILESTONES.length; i++) if (MILESTONES[i] <= x) idx = i;
    var km = MILESTONES[idx + 1]; if (km == null) return null;
    return km === 0.5 ? addDays(first, 14) : addMonths(first, km);
  }
  if (!last) return first;
  if (f.dy) return addDays(last, f.dy);
  if (!f.mo) return null;
  if (t.fixed && first) {
    var ref = addDays(last, t.early);
    var cyc = Math.max(0, Math.floor(((ref.getFullYear() - first.getFullYear()) * 12 + ref.getMonth() - first.getMonth()) / f.mo));
    var c = addMonths(first, cyc * f.mo);
    return c > ref ? c : addMonths(first, (cyc + 1) * f.mo);
  }
  return addMonths(last, f.mo);
}
var STATUS = {
  overdue: { text: 'Overdue', color: 'var(--red)', dot: 'var(--dot-red)', rank: 5 },
  due: { text: 'Due', color: 'var(--orange)', dot: 'var(--dot-orange)', rank: 4 },
  upcoming: { text: 'Upcoming', color: 'var(--green)', dot: 'var(--dot-green)', rank: 3 },
  snoozed: { text: 'Snoozed', color: 'var(--grey)', dot: 'var(--dot-grey)', rank: 2 },
  nodate: { text: 'Needs Date', color: 'var(--grey)', dot: 'transparent', rank: 1 },
  done: { text: 'Done', color: 'var(--grey)', dot: 'transparent', rank: 0 },
  paused: { text: 'Paused', color: 'var(--grey)', dot: 'transparent', rank: 0 }
};
function info(t) {
  var T = today(), due = nextDue(t), r = { due: due, start: null, days: null };
  if (!t.active) r.status = 'paused';
  else if (!due) r.status = (t.freq === 'One-time' && t.last) ? 'done' : 'nodate';
  else {
    r.start = addDays(due, -t.early); r.days = daysBetween(T, due);
    var sn = parse(t.snooze);
    if (r.days < 0) r.status = 'overdue';
    else if (sn && sn > T) r.status = 'snoozed';
    else r.status = T >= r.start ? 'due' : 'upcoming';
  }
  var s = STATUS[r.status]; r.text = s.text; r.color = s.color; r.dot = s.dot;
  var d = r.days;
  r.short = r.status === 'overdue' ? (-d) + 'd overdue' : r.status === 'due' ? (d === 0 ? 'due today' : 'due in ' + d + 'd')
    : r.status === 'snoozed' ? 'until ' + fmt(parse(t.snooze)) : due ? fmt(due) : '';
  r.long = r.status === 'overdue' ? 'Overdue by ' + (-d) + (d === -1 ? ' day' : ' days')
    : r.status === 'due' ? (d === 0 ? 'Due today' : 'Due in ' + d + (d === 1 ? ' day' : ' days'))
    : r.status === 'upcoming' ? 'Upcoming \u00b7 opens ' + fmt(r.start)
    : r.status === 'snoozed' ? 'Snoozed until ' + fmt(parse(t.snooze))
    : r.status === 'nodate' ? 'Needs a date' : r.status === 'done' ? 'Done' : 'Paused';
  return r;
}
function rows() {
  return db.tasks.map(function (t) { return { t: t, i: info(t) }; }).sort(function (a, b) {
    var ad = a.i.due ? a.i.due.getTime() : Infinity, bd = b.i.due ? b.i.due.getTime() : Infinity;
    return ad - bd || a.t.name.localeCompare(b.t.name);
  });
}

/* ---------- ui state ---------- */
var ui = { screen: 'home', stack: [], filter: 'all', cat: '', q: '', cq: '', bq: '', dir: 'contacts', st: null, itemId: null, taskId: null, conId: null, flash: null, undo: null, calY: 0, calM: 0, calDay: null, form: null, armed: null, mine: false };
try { ui.mine = localStorage.getItem('tend.mine') === '1'; } catch (e) {}
function go(screen, opts, push) {
  if (push) ui.stack.push({ screen: ui.screen, taskId: ui.taskId, conId: ui.conId, itemId: ui.itemId, scroll: view.scrollTop });
  else ui.stack = [];
  hideToast(); ui.screen = screen; ui.flash = null; ui.undo = null; ui.armed = null; ui.completing = null;
  Object.keys(opts || {}).forEach(function (k) { ui[k] = opts[k]; });
  render(); view.scrollTop = 0;
}
function back() {
  var p = ui.stack.pop(); if (!p) { go('home'); return; }
  hideToast(); ui.screen = p.screen; ui.taskId = p.taskId; ui.conId = p.conId; if (p.itemId !== undefined) ui.itemId = p.itemId; ui.flash = null; ui.undo = null; ui.armed = null; ui.form = null;
  render(); view.scrollTop = p.scroll || 0;
}
function toast(msg) { ui.flash = msg; ui.undo = null; render(); }

/* ---------- icons ---------- */
var I = {
  home: '<path d="M3 10.5L12 3l9 7.5"/><path d="M5 9.5V20h14V9.5"/><path d="M10 20v-6h4v6"/>',
  tasks: '<path d="M9 6h11"/><path d="M9 12h11"/><path d="M9 18h11"/><path d="M4 6l1 1 2-2"/><path d="M4 12l1 1 2-2"/><path d="M4 18l1 1 2-2"/>',
  cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18"/><path d="M8 3v4"/><path d="M16 3v4"/>',
  people: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7"/><path d="M21.5 20a6.5 6.5 0 0 0-4-6"/>',
  back: '<path d="M15 18l-6-6 6-6"/>', next: '<path d="M9 6l6 6-6 6"/>', check: '<path d="M20 6L9 17l-5-5"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>', x: '<path d="M18 6L6 18"/><path d="M6 6l12 12"/>',
  plus: '<path d="M12 5v14"/><path d="M5 12h14"/>', down: '<path d="M6 9l6 6 6-6"/>',
  phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/>',
  text: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
  pin: '<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  web: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18z"/>',
  snooze: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2"/><path d="M5 3L2 6"/><path d="M19 3l3 3"/>',
  camera: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3.5"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  car: '<path d="M5 16V12l2-5h10l2 5v4"/><path d="M3 16h18"/><path d="M5 12h14"/><circle cx="7.5" cy="18" r="1.6"/><circle cx="16.5" cy="18" r="1.6"/>',
  gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M5 12v9h14v-9"/><path d="M12 8v13"/><path d="M12 8c-2-4-6-4-6-1.5S9 8 12 8c3 0 6 .5 6-1.5S14 4 12 8z"/>',
  plug: '<path d="M9 2v6"/><path d="M15 2v6"/><path d="M6 8h12v4a6 6 0 0 1-12 0z"/><path d="M12 18v4"/>',
  paw: '<circle cx="12" cy="15.5" r="4"/><circle cx="5.5" cy="10" r="2"/><circle cx="18.5" cy="10" r="2"/><circle cx="9" cy="5.5" r="2"/><circle cx="15" cy="5.5" r="2"/>',
  doc: '<path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z"/><path d="M14 3v5h5"/><path d="M8 13h8"/><path d="M8 17h5"/>',
  box: '<path d="M3 7l9-4 9 4v10l-9 4-9-4z"/><path d="M3 7l9 4 9-4"/><path d="M12 11v10"/>',
  leaf: '<path d="M5 19c0-9 6-14 15-14 0 9-5 15-14 15"/><path d="M5 19l9-9"/>',
  spark: '<path d="M12 3v4"/><path d="M12 17v4"/><path d="M3 12h4"/><path d="M17 12h4"/><path d="M6 6l2.5 2.5"/><path d="M15.5 15.5L18 18"/><path d="M18 6l-2.5 2.5"/><path d="M8.5 15.5L6 18"/>',
  heart: '<path d="M12 20s-8-5-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 9c0 6-8 11-8 11z"/>',
  kid: '<circle cx="12" cy="5" r="2.5"/><path d="M12 8v7"/><path d="M7 11l5-1.5 5 1.5"/><path d="M9 21l3-6 3 6"/>',
  ring: '<circle cx="9" cy="14" r="5"/><circle cx="15" cy="14" r="5"/><path d="M10 4l2 2 2-2"/>',
  laptop: '<rect x="4" y="5" width="16" height="11" rx="1.5"/><path d="M2 19h20"/>',
  money: '<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6.5 9h.01"/><path d="M17.5 15h.01"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h8"/>',
  save: '<path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M5 21h14"/>', upload: '<path d="M12 21V9"/><path d="M7 14l5-5 5 5"/><path d="M5 3h14"/>'
};
function ic(name, size, sw) { return '<svg width="' + (size || 20) + '" height="' + (size || 20) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + (sw || 2) + '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + I[name] + '</svg>'; }

