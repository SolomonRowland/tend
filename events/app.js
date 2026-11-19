/* Tent & Table: screens.
   Ministry level: Events, Directory and Account (bottom tabs).
   Each event opens in its own workspace with tabs for the sections it uses.
   Public pages (no account): #/e/<slug> to sign up, #/c/<slug> connection card. */

/* ================================================================ helpers */
function $(s, el) { return (el || document).querySelector(s); }
function $$(s, el) { return Array.from((el || document).querySelectorAll(s)); }
function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function num(v) { var n = parseFloat(String(v == null ? '' : v).replace(/[^0-9.\-]/g, '')); return isFinite(n) ? n : 0; }
function money(n) { n = num(n); return (n < 0 ? '−$' : '$') + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 }); }
function plural(n, w, ws) { return n + ' ' + (n === 1 ? w : (ws || w + 's')); }
function lget(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function lset(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} }
function getPath(o, p) { return p.split('.').reduce(function (a, k) { return a == null ? a : a[k]; }, o); }
function setPath(o, p, v) { var ks = p.split('.'), last = ks.pop(); ks.reduce(function (a, k) { if (a[k] == null || typeof a[k] !== 'object') a[k] = {}; return a[k]; }, o)[last] = v; }
var TODAY = isoDay(new Date());
function dt(d) { return new Date(d + 'T12:00:00'); }
function fmtDay(d, opt) { if (!d) return ''; return dt(d).toLocaleDateString('en-US', opt || { weekday: 'short', month: 'short', day: 'numeric' }); }
function fmtLong(d) { return fmtDay(d, { weekday: 'long', month: 'long', day: 'numeric' }); }
function fmtRange(a, b) {
  if (!a) return 'No Date Yet';
  var A = dt(a), yr = A.getFullYear() !== new Date().getFullYear() ? ', ' + A.getFullYear() : '';
  if (!b || b === a) return fmtDay(a, { weekday: 'short', month: 'short', day: 'numeric' }) + yr;
  var B = dt(b);
  if (A.getMonth() === B.getMonth()) return A.toLocaleDateString('en-US', { month: 'short' }) + ' ' + A.getDate() + '–' + B.getDate() + yr;
  return fmtDay(a, { month: 'short', day: 'numeric' }) + ' – ' + fmtDay(b, { month: 'short', day: 'numeric' }) + yr;
}
function fmtTime(t) { if (!t) return ''; var m = /^(\d{1,2}):(\d{2})/.exec(t); if (!m) return t; var h = +m[1], ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; return h + (m[2] === '00' ? '' : ':' + m[2]) + ' ' + ap; }
function countdown(ev) {
  if (!ev.starts_on) return '';
  var a = dayDiff(ev.starts_on, TODAY), b = dayDiff(ev.ends_on || ev.starts_on, TODAY);
  if (a > 1) return 'In ' + a + ' Days'; if (a === 1) return 'Tomorrow'; if (a <= 0 && b >= 0) return a === 0 && b === 0 ? 'Today' : 'Happening Now';
  return 'Finished';
}
function digits(p) { return String(p || '').replace(/[^0-9+]/g, ''); }
function webUrl(u) { u = String(u || '').trim(); if (!u) return ''; return /^https?:\/\//i.test(u) ? u : 'https://' + u.replace(/^[a-z]+:\/*/i, ''); }
function mapUrl(a) { return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(a); }
function errMsg(e) {
  var m = String((e && (e.message || e.error_description || e.msg)) || e || '');
  if (/invalid login credentials/i.test(m)) return 'That email and password don’t match.';
  if (/already registered|user_already_exists/i.test(m)) return 'That email already has an account. Sign in instead.';
  if (/password should be|weak password/i.test(m)) return 'Use a password with at least 8 characters.';
  if (/email not confirmed/i.test(m)) return 'Confirm your email first, then sign in.';
  if (/failed to fetch|network|load failed/i.test(m)) return 'Can’t connect right now. Check your connection and try again.';
  if (/does not exist|schema cache/i.test(m)) return 'The database isn’t set up yet. Run events/supabase/schema.sql in Supabase.';
  if (/duplicate key|unique/i.test(m)) return 'That’s already been added.';
  return m || 'Something went wrong. Try again.';
}
var IC = {
  back: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>',
  close: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  chev: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>',
  check: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  plus: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  more: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>',
  tent: '<svg width="20" height="20" viewBox="100 80 312 316" fill="currentColor" aria-hidden="true"><path d="M252 84C262 128 300 164 398 180L388 190C390 250 396 316 404 390H390C378 318 364 254 354 214Q256 232 158 214C148 254 134 318 122 390H108C116 316 122 250 124 190L114 180C206 164 242 128 252 84Z"/><path d="M178 290H334L340 304H172Z"/><rect x="184" y="302" width="11" height="70" rx="5"/><rect x="317" y="302" width="11" height="70" rx="5"/><rect x="214" y="302" width="9" height="50" rx="4" opacity=".75"/><rect x="289" y="302" width="9" height="50" rx="4" opacity=".75"/></svg>',
  cal: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
  book: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20V3H6.5A2.5 2.5 0 004 5.5v14z"/><path d="M4 19.5A2.5 2.5 0 006.5 22H20v-5"/></svg>',
  user: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  phone: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6A19.8 19.8 0 012.1 4.2 2 2 0 014.1 2h3a2 2 0 012 1.7c.1 1 .4 1.9.7 2.8a2 2 0 01-.5 2.1L8 9.9a16 16 0 006 6l1.3-1.3a2 2 0 012.1-.4c.9.3 1.8.6 2.8.7a2 2 0 011.7 2z"/></svg>',
  text: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>',
  mail: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 6l-10 7L2 6"/></svg>',
  pin: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>',
  web: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 010 20M12 2a15 15 0 000 20"/></svg>',
  warn: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z"/><path d="M12 9v4M12 17h.01"/></svg>',
  home: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1h-5v-6h-6v6H4a1 1 0 01-1-1z"/></svg>',
  gear: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/></svg>',
  box: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8M12 13v8"/></svg>',
  down: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>',
  users: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.9M16 3.1a4 4 0 010 7.8"/></svg>',
  list: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6h12M9 12h12M9 18h12M4 6h.01M4 12h.01M4 18h.01"/></svg>',
  store: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l1.5-5h15L21 9M3 9h18M3 9v11h18V9M9 20v-6h6v6"/></svg>',
  food: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 2v9a2 2 0 002 2v9M5 2v6M9 2v6M17 2c-2 2-3 5-3 8h3v12"/></svg>',
  check2: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 12.5l3 3 5-6"/></svg>',
  dollar: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>',
  heart: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 00-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 000-7.8z"/></svg>',
  share: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/></svg>',
  search: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>'
};

/* ================================================================ vocab */
var GROUPS = ['Team Member', 'Board', 'Worship', 'Speaker', 'Prayer Team', 'Volunteer'];
var TITLES = ['Founder', 'President', 'Vice President', 'Pastor', 'Board Member', 'Treasurer', 'Secretary', 'Events Director', 'Worship Director', 'Worship Leader', 'Songwriter', 'Vocalist', 'Musician', 'Sound Engineer', 'Speaker', 'Guest Speaker', 'In-House Speaker', 'Evangelist', 'Prayer Director', 'Altar Counselor', 'Volunteer Coordinator', 'Volunteer'];
var VENDOR_CATS = ['Tent', 'Sound And Lights', 'Food', 'Restrooms', 'Rentals', 'Printing', 'Security', 'Power', 'Venue', 'Other'];
var GEAR_CATS = ['Sound', 'Power', 'Tables And Chairs', 'Tents', 'Stage', 'Parking', 'Ushers', 'Kids', 'Baptism', 'Hospitality', 'Other'];
var PAY = ['Not Paid', 'Deposit Paid', 'Paid In Full'];
var TEAMS = [['leader', 'Leadership'], ['team', 'Ministry Team'], ['speaker', 'Speakers'], ['worship', 'Worship Team'], ['volunteer', 'Volunteers']];
var RESPONSES = ['I gave my life to Jesus', 'I recommitted my life to Jesus', 'I’d like someone to pray with me', 'I’m looking for a church home', 'I’d like to be baptized', 'I’d like to serve'];
var PHASES = [['planning', 'Planning'], ['setup', 'Setup'], ['during', 'During The Event'], ['teardown', 'Teardown']];
var TABS = [['overview', 'Overview'], ['calendar', 'Calendar'], ['people', 'People'], ['agenda', 'Agenda'], ['vendors', 'Vendors & Contacts'], ['equipment', 'Equipment'], ['food', 'Food'], ['tasks', 'Tasks'], ['money', 'Money'], ['followup', 'Follow-Up'], ['share', 'Share']];
var SECTIONS = TABS.filter(function (t) { return t[0] !== 'overview' && t[0] !== 'share'; });
var PRESETS = {
  big: { label: 'Big Event', on: ['calendar', 'people', 'vendors', 'equipment', 'food', 'tasks', 'money', 'followup'] },
  night: { label: 'Worship Or Prayer Night', on: ['calendar', 'people', 'equipment', 'tasks', 'money', 'followup'] },
  meeting: { label: 'Meeting', on: ['calendar', 'people', 'agenda', 'tasks', 'food'] }
};

/* ================================================================ state + store */
var DB = null;
var S = {
  loading: true, user: null, acct: null, authMode: 'in', authMsg: '', busy: false,
  tab: 'home', dirTab: 'people', dirQ: '', dirGroup: '', dirStatus: 'current', dirCat: '', budgetYear: new Date().getFullYear(),
  db: {}, ev: null, evTab: 'overview', sub: {}, calDay: null,
  sheet: null, toast: '', pubMode: '', pubSlug: '', pub: null, mine: [], cardDone: false, pubErr: '', cardErr: ''
};
function org() { return S.acct && S.acct.org; }
function T(t) { return S.db[t] || (S.db[t] = []); }
function byId(t, id) { return T(t).find(function (r) { return r.id === id; }); }
function evRows(t, ev) { var id = (ev || S.ev || {}).id; return T(t).filter(function (r) { return r.event_id === id; }); }
function put(t, row) { var a = T(t), i = a.findIndex(function (r) { return r.id === row.id; }); if (i >= 0) a[i] = row; else a.push(row); return row; }
function drop(t, id) { (CASCADE[t] || []).forEach(function (c) { T(c[0]).filter(function (r) { return r[c[1]] === id; }).forEach(function (r) { drop(c[0], r.id); }); }); S.db[t] = T(t).filter(function (r) { return r.id !== id; }); }
function save(t, row, msg) { return busy(DB.save(t, row), msg === undefined ? 'Saved' : msg).then(function (r) { put(t, r); return r; }); }
function remove(t, id, msg) { return busy(DB.remove(t, id), msg || 'Deleted').then(function () { drop(t, id); }); }
function on(sec, ev) { ev = ev || S.ev; var s = (ev && ev.sections) || []; return sec === 'overview' || sec === 'share' || !s.length || s.indexOf(sec) >= 0; }
function memberNames() { return ((S.acct && S.acct.members) || []).map(function (m) { return m.name || m.email; }).filter(Boolean); }
function peopleNames() { var s = {}; memberNames().concat(T('ed_people').filter(function (p) { return p.status === 'current'; }).map(function (p) { return p.name; })).forEach(function (n) { s[n] = 1; }); return Object.keys(s).sort(); }
function events() { return T('ed_events').slice(); }

var toastT = 0;
function toast(m) { S.toast = m; renderLayer(); clearTimeout(toastT); toastT = setTimeout(function () { S.toast = ''; renderLayer(); }, 2600); }
function busy(p, okMsg) {
  S.busy = true; renderLayer();
  return Promise.resolve(p).then(function (v) { S.busy = false; if (okMsg) toast(okMsg); renderLayer(); return v; },
    function (e) { S.busy = false; if (S.sheet) { S.sheet.err = errMsg(e); refreshSheetErr(); } else toast(errMsg(e)); throw e; });
}

/* ================================================================ loading */
function boot() {
  var m = /[?&]join=([A-Za-z0-9]+)/.exec(location.search);
  if (m) { lset('ed.join', m[1]); try { history.replaceState(null, '', location.pathname); } catch (e) {} }
  if (/^#\/(e|c)\//.test(location.hash || '')) { route(); return; }
  DB.user().then(function (u) { S.user = u; if (!u) { S.loading = false; render(); return; } return loadAcct(); })
    .catch(function (e) { S.loading = false; S.authMsg = errMsg(e); render(); });
}
function loadAcct() {
  return DB.myOrg().then(function (a) {
    S.acct = a; if (!a) { S.loading = false; render(); return; }
    return loadAll().then(function () { S.loading = false; route(); render(); });
  }).catch(function (e) { S.loading = false; S.authMsg = errMsg(e); render(); });
}
function loadAll() {
  var oid = org().id;
  return Promise.all([DB.list('ed_events', 'org_id', oid)].concat(DIR_TABLES.map(function (t) { return DB.list(t, 'org_id', oid); }))).then(function (r) {
    S.db = {}; S.db.ed_events = r[0]; DIR_TABLES.forEach(function (t, i) { S.db[t] = r[i + 1]; });
    var ids = r[0].map(function (e) { return e.id; });
    return Promise.all(EVENT_TABLES.map(function (t) { return DB.listIn(t, 'event_id', ids); })).then(function (rr) { EVENT_TABLES.forEach(function (t, i) { S.db[t] = rr[i]; }); });
  });
}
function refreshEvent() {
  if (!S.ev) return Promise.resolve();
  var id = S.ev.id;
  return Promise.all(EVENT_TABLES.map(function (t) { return DB.list(t, 'event_id', id); })).then(function (rr) {
    EVENT_TABLES.forEach(function (t, i) { S.db[t] = T(t).filter(function (r) { return r.event_id !== id; }).concat(rr[i]); });
    render();
  }).catch(function () {});
}

/* ================================================================ routing */
function route() {
  var m = /^#\/(e|c|v|r)\/([a-z0-9-]+)/.exec(location.hash || '');
  if (m) { S.pubMode = m[1]; S.pubSlug = m[2]; S.cardDone = false; render(); return loadPublic(); }
  if (S.pubMode && !window.ED_DEMO) { S.pubMode = ''; S.pub = null; }
  var w = /^#\/w\/([0-9a-f-]{36})/.exec(location.hash || '');
  if (w && S.acct && byId('ed_events', w[1])) openEvent(w[1], true);
  if (!S.loading) render();
}
window.addEventListener('hashchange', route);
function openEvent(id, fromRoute) {
  S.ev = byId('ed_events', id); S.evTab = 'overview'; S.sub = {}; S.calDay = null;
  if (!fromRoute && !window.ED_DEMO) { try { history.pushState(null, '', '#/w/' + id); } catch (e) {} }
  render(); window.scrollTo(0, 0); refreshEvent();
}
function closeEvent() {
  S.ev = null;
  if (/^#\/w\//.test(location.hash) && !window.ED_DEMO) { try { history.pushState(null, '', location.pathname + location.search); } catch (e) {} }
  render(); window.scrollTo(0, 0);
}
window.addEventListener('popstate', function () { if (S.ev && !/^#\/w\//.test(location.hash)) { S.ev = null; render(); } });
function openPub(kind, slug) {
  S.pubFromEv = S.ev ? S.ev.id : null;
  if (window.ED_DEMO) { S.pubMode = kind; S.pubSlug = slug; S.cardDone = false; S.pub = null; render(); window.scrollTo(0, 0); loadPublic(); }
  else location.hash = '#/' + kind + '/' + slug;
}

/* ================================================================ render core */
function render() {
  var h;
  if (S.pubMode) h = S.pubMode === 'c' ? viewCard() : viewPublic();
  else if (S.loading) h = '<div class="auth"><div class="logo">' + IC.tent + '</div><p class="muted">Loading…</p></div>';
  else if (!S.user) h = viewAuth();
  else if (!S.acct) h = viewSetup();
  else if (S.ev) h = viewWorkspace();
  else h = viewShell();
  $('#app').innerHTML = h;
  document.body.classList.toggle('has-nav', !!(S.user && S.acct && !S.ev && !S.pubMode));
  renderLayer();
}
function renderLayer() {
  var layer = $('#layer'), sh = layer.querySelector('.sheet');
  if (S.sheet && sh && S.sheet.drawn) {
    sh.querySelectorAll('[data-save]').forEach(function (b) { b.disabled = S.busy; });
  } else {
    layer.querySelectorAll('.scrim').forEach(function (x) { x.remove(); });
    if (S.sheet) {
      layer.insertAdjacentHTML('afterbegin', '<div class="scrim" data-a="scrim"><div class="sheet" role="dialog" aria-modal="true">' + S.sheet.html() + '<div class="err" hidden></div></div></div>');
      S.sheet.drawn = true; var f = layer.querySelector('[autofocus]'); if (f && window.innerWidth > 700) f.focus();
      if (S.sheet.after) S.sheet.after(layer.querySelector('.sheet'));
      refreshSheetErr();
    }
  }
  var t = layer.querySelector('.toast'); if (t) t.remove();
  if (S.toast) layer.insertAdjacentHTML('beforeend', '<div class="toast" role="status">' + esc(S.toast) + '</div>');
}
function refreshSheetErr() { var e = $('#layer .sheet .err'); if (!e || !S.sheet) return; e.hidden = !S.sheet.err; e.textContent = S.sheet.err || ''; }
function openSheet(html, onSave, extra) { S.sheet = Object.assign({ html: typeof html === 'function' ? html : function () { return html; }, save: onSave, err: '' }, extra || {}); renderLayer(); }
function closeSheet() { S.sheet = null; renderLayer(); }
function redrawSheet() { if (S.sheet) { S.sheet.drawn = false; renderLayer(); } }
function sheetErr(m) { S.sheet.err = m; refreshSheetErr(); }
function ask(msg, yes, fn, sub) {
  openSheet('<h3>' + esc(msg) + '</h3>' + (sub ? '<p class="lead">' + esc(sub) + '</p>' : '') + '<div class="acts"><button class="btn plain" data-a="close">Cancel</button><button class="btn" data-save data-a="sheet-save">' + esc(yes) + '</button></div>',
    function () { S.sheet = null; renderLayer(); var p = fn(); if (p && p.catch) p.catch(function () {}); });
}

/* ---------- small building blocks */
function head(title, sub, left, right, eyebrow, titleAct) {
  var t = titleAct ? '<button class="htbtn" data-a="' + titleAct + '"><h1>' + esc(title) + '</h1>' + IC.down + '</button>' : '<h1>' + esc(title) + '</h1>';
  return '<header class="top"><div class="hrow">' + (left || '') + '<div class="htxt">' + (eyebrow ? '<div class="eyebrow">' + esc(eyebrow) + '</div>' : '') + t + '</div>' +
    '<div class="hact">' + (DB.mode === 'demo' ? '<span class="demo-flag">Demo</span>' : '') + (right || '') + '</div></div>' + (sub ? '<div class="hsub">' + esc(sub) + '</div>' : '') + '</header>';
}
function tabs(list, cur, act, cls) {
  return '<nav class="' + (cls || 'tabs') + '" role="tablist">' + list.map(function (t) {
    return '<button role="tab" aria-selected="' + (t[0] === cur) + '" data-a="' + act + '" data-v="' + t[0] + '">' + esc(t[1]) + '</button>';
  }).join('') + '</nav>';
}
function secHead(title, right, sub) { return '<div class="sec"><h2>' + esc(title) + (sub ? ' <small>' + esc(sub) + '</small>' : '') + '</h2>' + (right || '') + '</div>'; }
function addBtn(label, act, id, cls) { return '<button class="btn sm ' + (cls || '') + '" data-a="' + act + '"' + (id ? ' data-id="' + esc(id) + '"' : '') + '>' + IC.plus + ' ' + esc(label) + '</button>'; }
function listBox(rows, empty) { return rows.length ? '<div class="list">' + rows.join('') + '</div>' : '<div class="empty card">' + empty + '</div>'; }
function row(o) {
  var tag = o.act ? 'button' : 'div';
  return '<' + tag + ' class="row' + (o.cls ? ' ' + o.cls : '') + '"' + (o.act ? ' data-a="' + o.act + '" data-id="' + esc(o.id) + '"' + (o.t ? ' data-t="' + esc(o.t) + '"' : '') : '') + '>' + (o.lead || '') +
    '<div class="main"><div class="t">' + o.title + '</div>' + (o.sub ? '<div class="s">' + o.sub + '</div>' : '') + '</div>' + (o.right || '') + (o.act ? '<span class="chev">' + IC.chev + '</span>' : '') + '</' + tag + '>';
}
function pill(text, kind) { return text ? '<span class="pill ' + (kind || '') + '">' + esc(text) + '</span>' : ''; }
function payPill(s, due) { var late = due && s !== 'Paid In Full' && due < TODAY; return pill(late ? 'Overdue' : s, s === 'Paid In Full' ? 'green' : late ? 'red' : s === 'Deposit Paid' ? 'amber' : ''); }
function stat(k, v, hl) { return '<div class="stat' + (hl ? ' hl' : '') + '"><div class="k">' + esc(k) + '</div><div class="v">' + v + '</div></div>'; }
function meter(a, b) { var p = b ? Math.min(100, Math.round(100 * a / b)) : 0; return '<div class="meter" role="img" aria-label="' + p + '% done"><i style="width:' + p + '%"></i></div>'; }
function ck(on, act, id, label) { return '<button class="ck' + (on ? ' on' : '') + '" data-a="' + act + '" data-id="' + esc(id) + '" aria-pressed="' + !!on + '" aria-label="' + esc(label || 'Done') + '">' + (on ? IC.check : '') + '</button>'; }
function actions(r) {
  var b = [];
  if (r.phone) { b.push('<a class="act" href="tel:' + esc(digits(r.phone)) + '">' + IC.phone + 'Call</a>'); b.push('<a class="act" href="sms:' + esc(digits(r.phone)) + '">' + IC.text + 'Text</a>'); }
  if (r.email) b.push('<a class="act" href="mailto:' + esc(r.email) + '">' + IC.mail + 'Email</a>');
  if (r.address) b.push('<a class="act" href="' + esc(mapUrl(r.address)) + '" target="_blank" rel="noopener">' + IC.pin + 'Map</a>');
  if (r.website) b.push('<a class="act" href="' + esc(webUrl(r.website)) + '" target="_blank" rel="noopener">' + IC.web + 'Website</a>');
  return b.length ? '<div class="acts-row">' + b.join('') + '</div>' : '';
}
function infoList(pairs) {
  var p = pairs.filter(function (x) { return x[1] !== '' && x[1] != null; });
  return p.length ? '<dl class="info">' + p.map(function (x) { return '<dt>' + esc(x[0]) + '</dt><dd>' + (x[2] ? x[1] : esc(x[1])) + '</dd>'; }).join('') + '</dl>' : '';
}
function contactLine(r) { return esc([r.phone, r.email].filter(Boolean).join(' · ')); }

/* ================================================================ forms */
/* field: {k, label, type, opts, ph, half, hint, def, auto}
   types: text tel email url date time int money textarea select list check multi */
function optsOf(f) { var o = typeof f.opts === 'function' ? f.opts() : (f.opts || []); return o.map(function (x) { return Array.isArray(x) ? x : [x, x]; }); }
function fieldHtml(f, data) {
  var id = 'f_' + f.k.replace(/\./g, '_'), v = getPath(data || {}, f.k); if (v == null || v === '') v = f.def != null && !(data && data.id) ? (typeof f.def === 'function' ? f.def() : f.def) : (v == null ? '' : v);
  var cls = 'fld' + (f.half ? ' half' : ''), lab = '<label for="' + id + '">' + esc(f.label) + '</label>', hint = f.hint ? '<span class="hint">' + esc(f.hint) + '</span>' : '', inp;
  if (f.type === 'check') return '<div class="' + cls + '"><label class="cbx"><input type="checkbox" id="' + id + '" name="' + f.k + '"' + (v ? ' checked' : '') + '><span>' + esc(f.label) + '</span></label>' + hint + '</div>';
  if (f.type === 'multi') {
    var vals = Array.isArray(v) ? v : [];
    return '<fieldset class="' + cls + '"><legend>' + esc(f.label) + '</legend><div class="multi">' + optsOf(f).map(function (o, i) {
      return '<label class="cbx"><input type="checkbox" id="' + id + '_' + i + '" name="' + f.k + '" value="' + esc(o[0]) + '"' + (vals.indexOf(o[0]) >= 0 ? ' checked' : '') + '><span>' + esc(o[1]) + '</span></label>';
    }).join('') + '</div>' + hint + '</fieldset>';
  }
  if (f.type === 'textarea') inp = '<textarea class="inp" id="' + id + '" name="' + f.k + '" placeholder="' + esc(f.ph || '') + '">' + esc(v) + '</textarea>';
  else if (f.type === 'select') inp = '<select class="inp" id="' + id + '" name="' + f.k + '">' + optsOf(f).map(function (o) { return '<option value="' + esc(o[0]) + '"' + (String(o[0]) === String(v) ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select>';
  else if (f.type === 'list') inp = '<input class="inp" id="' + id + '" name="' + f.k + '" list="dl_' + id + '" value="' + esc(v) + '" placeholder="' + esc(f.ph || '') + '" autocomplete="off"' + (f.auto ? ' autofocus' : '') + '><datalist id="dl_' + id + '">' + optsOf(f).map(function (o) { return '<option value="' + esc(o[0]) + '">'; }).join('') + '</datalist>';
  else {
    var type = { tel: 'tel', email: 'email', url: 'url', date: 'date', time: 'time' }[f.type] || 'text';
    var mode = f.type === 'money' ? ' inputmode="decimal"' : f.type === 'int' ? ' inputmode="numeric"' : '';
    inp = '<input class="inp" id="' + id + '" name="' + f.k + '" type="' + type + '"' + mode + ' value="' + esc(f.type === 'money' && v !== '' ? num(v) : v) + '" placeholder="' + esc(f.ph || '') + '"' + (f.auto ? ' autofocus' : '') + '>';
  }
  return '<div class="' + cls + '">' + lab + inp + hint + '</div>';
}
function itemFields(kind) {
  if (kind !== 'attend') return F.item;
  return [{ k: 'title', label: 'Service Or Night', auto: true, ph: 'Night 1 Service' }, { k: 'on_date', label: 'Date', type: 'date', half: true }, { k: 'time_label', label: 'Time', half: true, ph: '7 PM' },
    { k: 'needed', label: 'Seats Available', type: 'int', half: true, def: 200 }, { k: 'notes', label: 'Details For Guests', type: 'textarea', ph: 'Doors open at 6:30 PM.' }];
}
function formBody(fields, data) { return '<div class="fgrid">' + fields.map(function (f) { return f.html ? f.html(data) : fieldHtml(f, data); }).join('') + '</div>'; }
function readForm(fields, base) {
  var out = JSON.parse(JSON.stringify(base || {})), root = $('#layer .sheet');
  fields.forEach(function (f) {
    if (f.html) return;
    var v;
    if (f.type === 'multi') v = $$('[name="' + f.k + '"]:checked', root).map(function (x) { return x.value; });
    else { var el = root.querySelector('[name="' + f.k + '"]'); if (!el) return; v = f.type === 'check' ? el.checked : el.value.trim(); }
    if (f.type === 'money') v = v === '' ? 0 : Math.max(0, num(v));
    if (f.type === 'int') v = v === '' ? null : Math.round(num(v));
    if ((f.type === 'date' || f.type === 'time') && v === '') v = null;
    setPath(out, f.k, v);
  });
  return out;
}
function sheetFoot(del, saveLabel) {
  return '<div class="acts">' + (del ? '<button class="btn ghost" data-a="sheet-del">Delete</button>' : '') + '<span class="grow"></span><button class="btn plain" data-a="close">Cancel</button><button class="btn" data-save data-a="sheet-save">' + esc(saveLabel || 'Save') + '</button></div>';
}
/* Edit any row with a field list. opts: title, sub, top (html above the form), required, prep(row) -> row, after(saved) */
function editRow(t, rec, fields, opts) {
  opts = opts || {};
  var base = rec || opts.base || {};
  openSheet(function () {
    return '<h3>' + esc(opts.title || (rec ? 'Edit' : 'Add')) + '</h3>' + (opts.sub ? '<p class="lead">' + esc(opts.sub) + '</p>' : '') + (opts.top ? opts.top(base) : '') + formBody(fields, base) + sheetFoot(!!rec && opts.del !== false, opts.saveLabel);
  }, function () {
    var v = readForm(fields, base);
    var req = opts.required || fields[0].k;
    if (!String(getPath(v, req) == null ? '' : getPath(v, req)).trim()) { sheetErr('Please fill in ' + (fields.find(function (f) { return f.k === req; }) || {}).label + '.'); return; }
    if (opts.prep) { var m = opts.prep(v); if (typeof m === 'string') { sheetErr(m); return; } if (m) v = m; }
    return save(t, v).then(function (r) { closeSheet(); if (opts.after) opts.after(r); render(); }).catch(function () {});
  }, { del: rec ? function () { ask(opts.delMsg || 'Delete this?', 'Delete', function () { return remove(t, rec.id).then(function () { render(); }); }, opts.delSub); } : null, after: opts.afterDraw });
}

/* ================================================================ field sets */
var F = {
  person: [
    { k: 'name', label: 'Name', auto: true }, { k: 'title', label: 'Title', type: 'list', opts: TITLES, half: true, ph: 'Worship Director' },
    { k: 'status', label: 'Status', type: 'select', opts: [['current', 'Current'], ['previous', 'Previous']], half: true },
    { k: 'groups', label: 'Groups', type: 'multi', opts: GROUPS },
    { k: 'phone', label: 'Phone', type: 'tel', half: true }, { k: 'email', label: 'Email', type: 'email', half: true },
    { k: 'address', label: 'Address' }, { k: 'notes', label: 'Notes', type: 'textarea', ph: 'Background check date, skills, shirt size…' }],
  vendor: [
    { k: 'name', label: 'Business Name', auto: true }, { k: 'category', label: 'Category', type: 'list', opts: VENDOR_CATS, half: true }, { k: 'contact_name', label: 'Contact Person', half: true },
    { k: 'phone', label: 'Phone', type: 'tel', half: true }, { k: 'email', label: 'Email', type: 'email', half: true },
    { k: 'website', label: 'Website', type: 'url', ph: 'example.com' }, { k: 'address', label: 'Address' }, { k: 'notes', label: 'Notes', type: 'textarea', ph: 'Pricing, what to ask for next time…' }],
  contact: [
    { k: 'name', label: 'Name', auto: true }, { k: 'organization', label: 'Organization', half: true }, { k: 'role', label: 'Role', half: true, ph: 'Landowner, Permit Office…' },
    { k: 'phone', label: 'Phone', type: 'tel', half: true }, { k: 'email', label: 'Email', type: 'email', half: true },
    { k: 'website', label: 'Website', type: 'url' }, { k: 'address', label: 'Address' }, { k: 'notes', label: 'Notes', type: 'textarea' }],
  equipment: [
    { k: 'name', label: 'Item', auto: true }, { k: 'quantity', label: 'Quantity Owned', type: 'int', half: true, def: 1 }, { k: 'category', label: 'Category', type: 'list', opts: GEAR_CATS, half: true },
    { k: 'location', label: 'Stored At', half: true }, { k: 'condition', label: 'Condition', type: 'select', opts: ['Good', 'Needs Repair', 'Missing', 'Retired'], half: true }, { k: 'notes', label: 'Notes', type: 'textarea' }],
  budget: [
    { k: 'name', label: 'Budget Line', auto: true, ph: 'Annual Tent Revival' }, { k: 'planned', label: 'Planned Amount', type: 'money', half: true }, { k: 'year', label: 'Year', type: 'int', half: true, def: function () { return S.budgetYear; } },
    { k: 'event_id', label: 'Event (Optional)', type: 'select', opts: function () { return [['', 'None']].concat(events().map(function (e) { return [e.id, e.title]; })); } },
    { k: 'notes', label: 'Notes', type: 'textarea' }],
  event: [
    { k: 'title', label: 'Event Name', auto: true, ph: 'Annual Tent Revival' },
    { k: 'starts_on', label: 'First Day', type: 'date', half: true }, { k: 'ends_on', label: 'Last Day', type: 'date', half: true, hint: 'Leave empty for a one-day event.' },
    { k: 'time_label', label: 'Time', ph: 'Nightly at 7 PM' }, { k: 'place', label: 'Place', half: true, ph: 'Miller Field' }, { k: 'address', label: 'Address', half: true },
    { k: 'about', label: 'About This Event', type: 'textarea', hint: 'Shown on the public sign-up page.' },
    { k: 'contact_line', label: 'Public Contact Line', ph: 'Questions? Text Steve at (555) 555-0142' },
    { k: 'giving_link', label: 'Online Giving Link', type: 'url', ph: 'https://…', half: true }, { k: 'budget', label: 'Budget', type: 'money', half: true },
    { k: 'is_open', label: 'Public Sign-Ups Are Open', type: 'check', def: true },
    { html: function () { return '<div class="fld"><label>Start From A Preset</label><div class="seg wrap">' + Object.keys(PRESETS).map(function (k) { return '<button type="button" data-a="preset" data-v="' + k + '">' + esc(PRESETS[k].label) + '</button>'; }).join('') + '</div></div>'; } },
    { k: 'sections', label: 'Tabs This Event Uses', type: 'multi', opts: SECTIONS, hint: 'Overview and Share are always there.' }],
  schedule: [
    { k: 'title', label: 'What', auto: true, ph: 'Sound Check' }, { k: 'on_date', label: 'Date', type: 'date', half: true },
    { k: 'location', label: 'Location', half: true }, { k: 'start_time', label: 'Starts', type: 'time', half: true }, { k: 'end_time', label: 'Ends', type: 'time', half: true },
    { k: 'owner', label: 'Who’s In Charge', type: 'list', opts: function () { return peopleNames(); } }, { k: 'notes', label: 'Notes', type: 'textarea' }],
  task: [
    { k: 'title', label: 'Task', auto: true }, { k: 'phase', label: 'Phase', type: 'select', opts: PHASES, half: true },
    { k: 'owner', label: 'Who', type: 'list', opts: function () { return peopleNames(); }, half: true },
    { k: 'due_on', label: 'Due Date', type: 'date', half: true }, { k: 'due_time', label: 'Time', half: true, ph: '10 AM' },
    { k: 'done', label: 'Done', type: 'check' }, { k: 'notes', label: 'Notes', type: 'textarea' }],
  agenda: [
    { k: 'title', label: 'Topic', auto: true }, { k: 'leader', label: 'Led By', type: 'list', opts: function () { return peopleNames(); }, half: true },
    { k: 'minutes', label: 'Minutes', type: 'int', half: true }, { k: 'done', label: 'Covered', type: 'check' }, { k: 'notes', label: 'Notes And Decisions', type: 'textarea' }],
  setlist: [
    { k: 'title', label: 'Name', auto: true, ph: 'Night 1' }, { k: 'on_date', label: 'Date', type: 'date', half: true }, { k: 'rehearsal', label: 'Rehearsal', half: true, ph: '5:30 PM Sound Check' },
    { k: 'songs', label: 'Songs, One Per Line', type: 'textarea' }],
  item: [
    { k: 'title', label: 'What', auto: true }, { k: 'on_date', label: 'Date', type: 'date', half: true }, { k: 'time_label', label: 'Time', half: true, ph: '6 PM' },
    { k: 'needed', label: 'How Many Needed', type: 'int', half: true, def: 1 }, { k: 'notes', label: 'Details For People Signing Up', type: 'textarea' }],
  signup: [{ k: 'name', label: 'Name', auto: true }, { k: 'phone', label: 'Phone', type: 'tel', half: true }, { k: 'email', label: 'Email', type: 'email', half: true }, { k: 'note', label: 'Note' }],
  rsvp: [{ k: 'name', label: 'Name', auto: true }, { k: 'party', label: 'How Many Coming', type: 'int', half: true, def: 1, hint: 'Including you.' }, { k: 'phone', label: 'Phone', type: 'tel', half: true }, { k: 'email', label: 'Email', type: 'email' }, { k: 'note', label: 'Anything We Should Know?' }],
  offering: [
    { k: 'service', label: 'Service', auto: true, ph: 'Night 1' }, { k: 'on_date', label: 'Date', type: 'date', half: true }, { k: 'deposited', label: 'Deposited At The Bank', type: 'check', half: true },
    { k: 'cash', label: 'Cash', type: 'money', half: true }, { k: 'checks', label: 'Checks', type: 'money', half: true }, { k: 'online', label: 'Online Or Card', type: 'money', half: true }, { k: 'other', label: 'Other', type: 'money', half: true },
    { k: 'counter1', label: 'Counted By', type: 'list', opts: function () { return peopleNames(); }, half: true }, { k: 'counter2', label: 'Second Counter', type: 'list', opts: function () { return peopleNames(); }, half: true, hint: 'Two people count every offering.' },
    { k: 'notes', label: 'Notes', type: 'textarea' }],
  expense: [
    { k: 'description', label: 'What For', auto: true }, { k: 'category', label: 'Category', type: 'list', opts: ['Food', 'Hospitality', 'Permits', 'Printing', 'Supplies', 'Travel', 'Other'], half: true }, { k: 'amount', label: 'Amount', type: 'money', half: true },
    { k: 'pay_status', label: 'Payment Status', type: 'select', opts: PAY, half: true }, { k: 'due_on', label: 'Due Date', type: 'date', half: true },
    { k: 'payer', label: 'Who Pays It', type: 'list', opts: function () { return peopleNames(); } }, { k: 'notes', label: 'Notes', type: 'textarea' }],
  card: [
    { k: 'name', label: 'Name', auto: true }, { k: 'phone', label: 'Phone', type: 'tel', half: true }, { k: 'email', label: 'Email', type: 'email', half: true },
    { k: 'status', label: 'Status', type: 'select', opts: [['new', 'New'], ['contacted', 'Contacted'], ['connected', 'Connected']], half: true },
    { k: 'follow_up_by', label: 'Follow-Up By', type: 'list', opts: function () { return peopleNames(); }, half: true },
    { k: 'responses', label: 'Responses', type: 'multi', opts: RESPONSES }, { k: 'prayer', label: 'Prayer Request', type: 'textarea' }, { k: 'notes', label: 'Follow-Up Notes', type: 'textarea' }]
};
var F_ASSIGN = {
  person: function (team) {
    var f = [{ k: 'team', label: 'Team', type: 'select', opts: TEAMS, half: true }, { k: 'role', label: 'Role At This Event', type: 'list', opts: TITLES, half: true }, { k: 'days', label: 'Days Serving', ph: 'All Nights' }];
    if (team === 'speaker') f = f.concat([
      { k: 'details.status', label: 'Status', type: 'select', opts: ['Invited', 'Confirmed', 'Declined'], half: true }, { k: 'details.date', label: 'Speaking Date', type: 'date', half: true },
      { k: 'details.time', label: 'Time', half: true, ph: '7:30 PM' }, { k: 'details.topic', label: 'Message', half: true },
      { k: 'details.travel', label: 'Travel', ph: 'Flight, pickup, mileage' }, { k: 'details.lodging', label: 'Lodging', ph: 'Hotel or host home' }]);
    return f.concat([
      { k: 'amount', label: team === 'speaker' ? 'Honorarium' : 'Stipend Or Fee', type: 'money', half: true }, { k: 'pay_status', label: 'Payment Status', type: 'select', opts: PAY, half: true },
      { k: 'payer', label: 'Who Pays It', type: 'list', opts: function () { return peopleNames(); }, half: true }, { k: 'due_on', label: 'Payment Due', type: 'date', half: true },
      { k: 'notes', label: 'Notes', type: 'textarea' }]);
  },
  vendor: [
    { k: 'service', label: 'What They’re Providing', ph: '60x120 Tent, Sides, Chairs' }, { k: 'status', label: 'Booking', type: 'select', opts: ['Quoted', 'Booked', 'Cancelled'], half: true },
    { k: 'arrival', label: 'Delivery Or Arrival', half: true }, { k: 'cost', label: 'Total Cost', type: 'money', half: true }, { k: 'paid', label: 'Paid So Far', type: 'money', half: true },
    { k: 'pay_status', label: 'Payment Status', type: 'select', opts: PAY, half: true }, { k: 'due_on', label: 'Next Payment Due', type: 'date', half: true },
    { k: 'payer', label: 'Who Pays It', type: 'list', opts: function () { return peopleNames(); } }, { k: 'notes', label: 'Notes', type: 'textarea' }],
  contact: [{ k: 'role', label: 'Role For This Event', ph: 'Landowner, Tent Permit…' }, { k: 'notes', label: 'Notes', type: 'textarea' }],
  equipment: [{ k: 'quantity', label: 'How Many', type: 'int', half: true }, { k: 'loaded', label: 'Loaded', type: 'check', half: true }, { k: 'returned', label: 'Returned', type: 'check', half: true }, { k: 'notes', label: 'Notes', type: 'textarea' }]
};

/* ================================================================ auth + setup */
function viewAuth() {
  var up = S.authMode === 'up', reset = S.authMode === 'reset';
  return '<div class="auth"><div class="logo">' + IC.tent + '</div><h1>Tent &amp; Table</h1>' +
    '<p class="lead">Plan every event your ministry runs, from the annual tent revival to a monthly board meeting: people, speakers, worship, vendors, equipment, food, money and follow-up.</p>' +
    '<form data-form="auth" class="fgrid">' +
    '<div class="fld"><label for="a_email">Email</label><input class="inp" id="a_email" name="email" type="email" autocomplete="email" required></div>' +
    (reset ? '' : '<div class="fld"><label for="a_pw">Password</label><input class="inp" id="a_pw" name="pw" type="password" autocomplete="' + (up ? 'new-password' : 'current-password') + '" minlength="8" required></div>') +
    '<div class="fld"><button class="btn block" type="submit"' + (S.busy ? ' disabled' : '') + '>' + (reset ? 'Send Reset Link' : up ? 'Create Account' : 'Sign In') + '</button></div></form>' +
    (up ? '<p class="small muted">Each login belongs to one ministry. If you serve with two ministries, use a different email for each.</p>' : '') +
    (S.authMsg ? '<div class="err">' + esc(S.authMsg) + '</div>' : '') +
    '<p class="small muted" style="margin-top:16px">' + (up ? 'Already have an account? <a href="#" data-a="auth-mode" data-v="in">Sign In</a>' : 'New here? <a href="#" data-a="auth-mode" data-v="up">Create An Account</a> · <a href="#" data-a="auth-mode" data-v="reset">Forgot Password</a>') + '</p>' +
    '<div class="card" style="margin-top:24px"><b>Just Looking?</b><p class="small muted" style="margin:4px 0 10px">Open a demo ministry with sample events. Nothing you change there is saved to an account.</p><button class="btn ghost sm" data-a="try-demo">Try The Demo</button></div></div>';
}
function viewSetup() {
  return head('Tent & Table', '', '', '<button class="link" data-a="signout">Sign Out</button>') + '<main>' +
    '<h1>Set Up Your Ministry</h1><p class="lead">This login will belong to one ministry. Start a new ministry account, or join one with an invite link.</p>' +
    '<div class="card"><h2>Start A Ministry</h2><form data-form="create-org" class="fgrid">' +
    '<div class="fld"><label for="o_name">Ministry Name</label><input class="inp" id="o_name" name="name" placeholder="GGG Ministries" required></div>' +
    '<div class="fld"><label for="o_me">Your Name</label><input class="inp" id="o_me" name="me" required></div>' +
    '<div class="fld"><button class="btn block" type="submit">Start The Account</button></div></form></div>' +
    '<div class="card"><h2>Join A Ministry</h2><form data-form="join" class="fgrid">' +
    '<div class="fld"><label for="j_code">Invite Code</label><input class="inp" id="j_code" name="code" value="' + esc(lget('ed.join') || '') + '" placeholder="From the invite link"></div>' +
    '<div class="fld"><label for="j_me">Your Name</label><input class="inp" id="j_me" name="me" required></div>' +
    '<div class="fld"><button class="btn ghost block" type="submit">Join</button></div></form></div>' +
    (S.authMsg ? '<div class="err">' + esc(S.authMsg) + '</div>' : '') + '</main>';
}

/* ================================================================ ministry shell */
function viewShell() {
  if (S.tab === 'settings') return viewSettings();
  var body = S.tab === 'directory' ? viewDirectory() : S.tab === 'events' ? viewEvents() : viewHome();
  var me = myMember(), hr = new Date().getHours();
  var title = S.tab === 'home' ? (hr < 12 ? 'Good Morning' : hr < 17 ? 'Good Afternoon' : 'Good Evening') : { events: 'Events', directory: 'Directory' }[S.tab];
  var sub = S.tab === 'home' ? [me.name ? me.name.split(' ')[0] : '', new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })].filter(Boolean).join(' · ') : '';
  return head(title, sub, '<span class="brandmark" aria-hidden="true">' + IC.tent + '</span>',
      (S.tab === 'events' ? addBtn('New Event', 'new-event') : '') + '<button class="iconbtn" data-a="open-settings" aria-label="Settings">' + IC.gear + '</button>', org().name) +
    '<main>' + body + demoNote() + '</main>' +
    '<nav class="bottomnav" aria-label="Main">' + [['home', 'Home', IC.home], ['events', 'Events', IC.cal], ['directory', 'Directory', IC.book]].map(function (t) {
      return '<button data-a="nav" data-v="' + t[0] + '"' + (S.tab === t[0] ? ' aria-current="page"' : '') + '>' + t[2] + '<span>' + t[1] + '</span></button>';
    }).join('') + '</nav>';
}
function demoNote() { return DB.mode === 'demo' ? '<p class="small muted demo-note">This is a demo ministry kept in your browser. <a href="#" data-a="reset-demo">Reset The Demo</a>' + (window.supabase && !window.ED_DEMO ? ' · <a href="#" data-a="leave-demo">Leave The Demo</a>' : '') + '</p>' : ''; }
function myMember() { return ((S.acct && S.acct.members) || []).find(function (m) { return S.user && m.user_id === S.user.id; }) || {}; }

function viewEvents() {
  var all = events(), up = [], past = [];
  all.forEach(function (e) { ((e.ends_on || e.starts_on || '9999') >= TODAY ? up : past).push(e); });
  up.sort(function (a, b) { return String(a.starts_on || '9').localeCompare(String(b.starts_on || '9')); });
  past.sort(function (a, b) { return String(b.starts_on).localeCompare(String(a.starts_on)); });
  function evRow(e) {
    var d = e.starts_on ? dt(e.starts_on) : null, cd = countdown(e);
    return '<button class="row" data-a="open-event" data-id="' + e.id + '"><span class="datebox">' + (d ? '<small>' + d.toLocaleDateString('en-US', { month: 'short' }) + '</small><b>' + d.getDate() + '</b>' : '<small>TBD</small>') + '</span>' +
      '<div class="main"><div class="t">' + esc(e.title) + '</div><div class="s">' + esc([fmtRange(e.starts_on, e.ends_on), e.time_label, e.place].filter(Boolean).join(' · ')) + '</div></div>' +
      (cd && cd !== 'Finished' ? pill(cd, cd === 'Today' || cd === 'Happening Now' ? 'red' : '') : '') + '<span class="chev">' + IC.chev + '</span></button>';
  }
  return secHead('Upcoming', '', plural(up.length, 'event')) + listBox(up.map(evRow), 'No upcoming events. Tap New Event to plan one, starting with your big annual event.') +
    (past.length ? secHead('Past', '', plural(past.length, 'event')) + listBox(past.map(evRow), '') : '') +
    '<p class="small muted" style="margin-top:18px">For an annual event, open last year’s event and choose <b>Start Next Year</b> from its menu. It keeps your plan and resets the dates, tasks and sign-ups.</p>';
}

/* ---------------------------------------------------------------- directory */
var DIRTABS = [['people', 'People', 'ed_people'], ['vendors', 'Vendors', 'ed_vendors'], ['contacts', 'Contacts', 'ed_contacts'], ['equipment', 'Equipment', 'ed_equipment'], ['budget', 'Budget', 'ed_budget']];
function usedIn(t, id) {
  var map = { ed_people: ['ed_event_people', 'person_id'], ed_vendors: ['ed_event_vendors', 'vendor_id'], ed_contacts: ['ed_event_contacts', 'contact_id'], ed_equipment: ['ed_event_equipment', 'equipment_id'] }[t];
  if (!map) return [];
  return T(map[0]).filter(function (a) { return a[map[1]] === id; }).map(function (a) { return { a: a, e: byId('ed_events', a.event_id) }; }).filter(function (x) { return x.e; });
}
function viewDirectory() {
  var t = S.dirTab, h = tabs(DIRTABS.map(function (d) { return [d[0], d[1]]; }), t, 'dir-tab', 'seg-tabs');
  if (t === 'budget') return h + viewBudget();
  var q = S.dirQ.toLowerCase();
  var tool = '<div class="toolbar"><label class="search">' + IC.search + '<input id="dir_q" type="search" placeholder="Search ' + esc(DIRTABS.find(function (d) { return d[0] === t; })[1]) + '" value="' + esc(S.dirQ) + '" data-input="dir-q" aria-label="Search"></label>';
  function match(r, keys) { return !q || keys.some(function (k) { return String(r[k] || '').toLowerCase().indexOf(q) >= 0; }); }
  if (t === 'people') {
    var ppl = T('ed_people').filter(function (p) { return (S.dirStatus === 'all' || p.status === S.dirStatus) && (!S.dirGroup || (p.groups || []).indexOf(S.dirGroup) >= 0) && match(p, ['name', 'title', 'phone', 'email']); })
      .sort(function (a, b) { return a.name.localeCompare(b.name); });
    tool += '<select class="inp sm" data-change="dir-group" aria-label="Group"><option value="">All Groups</option>' + GROUPS.map(function (g) { return '<option' + (S.dirGroup === g ? ' selected' : '') + '>' + g + '</option>'; }).join('') + '</select>' +
      '<select class="inp sm" data-change="dir-status" aria-label="Status">' + [['current', 'Current'], ['previous', 'Previous'], ['all', 'All']].map(function (o) { return '<option value="' + o[0] + '"' + (S.dirStatus === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></div>';
    return h + tool + secHead(plural(ppl.length, 'Person', 'People'), addBtn('Add Person', 'dir-add', 'ed_people')) +
      listBox(ppl.map(function (p) { return row({ act: 'dir-open', id: p.id, t: 'ed_people', lead: avatar(p.name), title: esc(p.name) + (p.status === 'previous' ? ' ' + pill('Previous') : ''), sub: esc([p.title, (p.groups || []).join(', ')].filter(Boolean).join(' · ')) }); }),
        q || S.dirGroup ? 'No one matches.' : 'Add your team members, volunteers, worship team and speakers here once, then assign them to events.');
  }
  if (t === 'vendors' || t === 'contacts') {
    var tbl = t === 'vendors' ? 'ed_vendors' : 'ed_contacts', cats = {};
    T(tbl).forEach(function (r) { var c = t === 'vendors' ? r.category : r.organization; if (c) cats[c] = 1; });
    var list = T(tbl).filter(function (r) { return (!S.dirCat || (t === 'vendors' ? r.category : r.organization) === S.dirCat) && match(r, ['name', 'category', 'contact_name', 'organization', 'role', 'phone']); }).sort(function (a, b) { return a.name.localeCompare(b.name); });
    tool += '<select class="inp sm" data-change="dir-cat" aria-label="Filter"><option value="">' + (t === 'vendors' ? 'All Categories' : 'All Organizations') + '</option>' + Object.keys(cats).sort().map(function (c) { return '<option' + (S.dirCat === c ? ' selected' : '') + '>' + esc(c) + '</option>'; }).join('') + '</select></div>';
    return h + tool + secHead(plural(list.length, t === 'vendors' ? 'Vendor' : 'Contact'), addBtn(t === 'vendors' ? 'Add Vendor' : 'Add Contact', 'dir-add', tbl)) +
      listBox(list.map(function (r) { var n = usedIn(tbl, r.id).length; return row({ act: 'dir-open', id: r.id, t: tbl, lead: avatar(r.name), title: esc(r.name), sub: esc(t === 'vendors' ? [r.category, r.contact_name, r.phone].filter(Boolean).join(' · ') : [r.role, r.organization, r.phone].filter(Boolean).join(' · ')), right: n ? '<span class="muted small">' + plural(n, 'Event') + '</span>' : '' }); }),
        t === 'vendors' ? 'Tent rentals, sound, food trucks, printers. Add them once and book them for any event.' : 'Landowners, permit offices, partner churches, the sheriff’s non-emergency line…');
  }
  // equipment
  var gear = T('ed_equipment').filter(function (g) { return (!S.dirCat || g.category === S.dirCat) && match(g, ['name', 'category', 'location']); });
  var gcats = {}; T('ed_equipment').forEach(function (g) { if (g.category) gcats[g.category] = 1; });
  tool += '<select class="inp sm" data-change="dir-cat" aria-label="Category"><option value="">All Categories</option>' + Object.keys(gcats).sort().map(function (c) { return '<option' + (S.dirCat === c ? ' selected' : '') + '>' + esc(c) + '</option>'; }).join('') + '</select></div>';
  var groups = {}; gear.forEach(function (g) { (groups[g.category || 'Other'] = groups[g.category || 'Other'] || []).push(g); });
  var total = T('ed_equipment').reduce(function (s, g) { return s + num(g.quantity); }, 0), repair = T('ed_equipment').filter(function (g) { return g.condition !== 'Good'; }).length;
  return h + tool + '<div class="stats">' + stat('Items', T('ed_equipment').length) + stat('Pieces Owned', total) + stat('Need Attention', repair, repair > 0) + '</div>' +
    secHead('Inventory', addBtn('Add Item', 'dir-add', 'ed_equipment')) +
    (gear.length ? Object.keys(groups).sort().map(function (c) {
      return '<div class="grouplbl">' + esc(c) + '</div>' + listBox(groups[c].sort(function (a, b) { return a.name.localeCompare(b.name); }).map(function (g) {
        return row({ act: 'dir-open', id: g.id, t: 'ed_equipment', title: esc(g.name), sub: esc('Stored At ' + (g.location || '—')) + (g.condition !== 'Good' ? ' · <span class="danger">' + esc(g.condition) + '</span>' : ''), right: '<span class="qty">' + num(g.quantity) + '</span>' });
      }), '');
    }).join('') : '<div class="empty card">Everything the ministry owns: sound gear, tables, cones, offering buckets. Each event picks from this list.</div>');
}
function avatar(n) { var i = String(n || '?').replace(/^(pastor|rev\.?|evangelist|dr\.?)\s+/i, '').split(/\s+/).map(function (w) { return w[0]; }).join('').slice(0, 2).toUpperCase(); return '<span class="avatar" aria-hidden="true">' + esc(i) + '</span>'; }

function eventMoney(e) {
  var id = e.id, vend = T('ed_event_vendors').filter(function (r) { return r.event_id === id && r.status !== 'Cancelled'; }), ppl = T('ed_event_people').filter(function (r) { return r.event_id === id && num(r.amount) > 0; }), exp = T('ed_expenses').filter(function (r) { return r.event_id === id; });
  var committed = vend.reduce(function (s, r) { return s + num(r.cost); }, 0) + ppl.reduce(function (s, r) { return s + num(r.amount); }, 0) + exp.reduce(function (s, r) { return s + num(r.amount); }, 0);
  var paid = vend.reduce(function (s, r) { return s + (r.pay_status === 'Paid In Full' ? num(r.cost) : Math.min(num(r.paid), num(r.cost))); }, 0) + ppl.filter(function (r) { return r.pay_status === 'Paid In Full'; }).reduce(function (s, r) { return s + num(r.amount); }, 0) + exp.filter(function (r) { return r.pay_status === 'Paid In Full'; }).reduce(function (s, r) { return s + num(r.amount); }, 0);
  var given = T('ed_offerings').filter(function (r) { return r.event_id === id; }).reduce(function (s, r) { return s + num(r.cash) + num(r.checks) + num(r.online) + num(r.other); }, 0);
  return { budget: num(e.budget), committed: committed, paid: paid, owed: committed - paid, given: given };
}
function viewBudget() {
  var y = S.budgetYear, years = {}; years[y] = 1; years[new Date().getFullYear()] = 1;
  T('ed_budget').forEach(function (b) { years[b.year] = 1; }); events().forEach(function (e) { if (e.starts_on) years[+e.starts_on.slice(0, 4)] = 1; });
  var lines = T('ed_budget').filter(function (b) { return +b.year === +y; }), planned = lines.reduce(function (s, b) { return s + num(b.planned); }, 0);
  var evs = events().filter(function (e) { return e.starts_on && +e.starts_on.slice(0, 4) === +y; }).sort(function (a, b) { return a.starts_on.localeCompare(b.starts_on); });
  var tot = { committed: 0, paid: 0, given: 0 }; var per = evs.map(function (e) { var m = eventMoney(e); tot.committed += m.committed; tot.paid += m.paid; tot.given += m.given; return { e: e, m: m }; });
  return '<div class="toolbar"><label class="sr" for="b_year">Year</label><select class="inp sm" id="b_year" data-change="budget-year">' + Object.keys(years).sort().map(function (x) { return '<option' + (+x === +y ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select></div>' +
    '<div class="stats">' + stat('Planned', money(planned)) + stat('Committed', money(tot.committed)) + stat('Paid', money(tot.paid)) + stat(planned - tot.committed >= 0 ? 'Left To Commit' : 'Over Plan', money(Math.abs(planned - tot.committed)), planned - tot.committed < 0) + '</div>' +
    secHead('Budget Lines', addBtn('Add Line', 'dir-add', 'ed_budget')) +
    listBox(lines.map(function (b) { var e = b.event_id && byId('ed_events', b.event_id); return row({ act: 'dir-edit', id: b.id, t: 'ed_budget', title: esc(b.name), sub: esc([e ? 'For ' + e.title : '', b.notes].filter(Boolean).join(' · ')), right: '<span class="amt">' + money(b.planned) + '</span>' }); }),
      'Add what you plan to spend this year, by event or category.') +
    secHead('Events In ' + y, '', 'Given ' + money(tot.given)) +
    listBox(per.map(function (x) {
      return row({ act: 'open-event', id: x.e.id, title: esc(x.e.title), sub: 'Budget ' + money(x.m.budget) + ' · Committed ' + money(x.m.committed) + ' · Paid ' + money(x.m.paid) + ' · Given ' + money(x.m.given),
        right: x.m.budget && x.m.committed > x.m.budget ? pill('Over Budget', 'red') : '' });
    }), 'No events dated in ' + y + '.');
}
function openDirRecord(t, id) {
  var r = byId(t, id); if (!r) return;
  var used = usedIn(t, id), sub = '', info = [];
  if (t === 'ed_people') { sub = [r.title, r.status === 'previous' ? 'Previous' : ''].filter(Boolean).join(' · '); info = [['Groups', (r.groups || []).join(', ')], ['Phone', r.phone], ['Email', r.email], ['Address', r.address], ['Notes', r.notes]]; }
  if (t === 'ed_vendors') { sub = r.category; info = [['Contact', r.contact_name], ['Phone', r.phone], ['Email', r.email], ['Website', r.website], ['Address', r.address], ['Notes', r.notes]]; }
  if (t === 'ed_contacts') { sub = [r.role, r.organization].filter(Boolean).join(', '); info = [['Phone', r.phone], ['Email', r.email], ['Website', r.website], ['Address', r.address], ['Notes', r.notes]]; }
  if (t === 'ed_equipment') {
    sub = r.category; info = [['Quantity Owned', String(num(r.quantity))], ['Stored At', r.location], ['Condition', r.condition], ['Notes', r.notes]];
  }
  openSheet(function () {
    return '<div class="sheethead">' + (t !== 'ed_equipment' ? avatar(r.name) : '') + '<div><h3>' + esc(r.name) + '</h3>' + (sub ? '<p class="lead">' + esc(sub) + '</p>' : '') + '</div></div>' + actions(r) + infoList(info) +
      '<h4>Events</h4>' + (used.length ? '<div class="list">' + used.map(function (u) {
        return row({ act: 'open-event', id: u.e.id, title: esc(u.e.title), sub: esc([fmtRange(u.e.starts_on, u.e.ends_on), u.a.role || u.a.service || (u.a.quantity ? 'Bringing ' + u.a.quantity : '')].filter(Boolean).join(' · ')) });
      }).join('') + '</div>' : '<p class="small muted">Not used in any event yet.</p>') +
      '<div class="acts"><button class="btn ghost" data-a="sheet-del">Delete</button><span class="grow"></span><button class="btn plain" data-a="close">Close</button><button class="btn" data-a="dir-edit" data-id="' + r.id + '" data-t="' + t + '">Edit</button></div>';
  }, null, { del: function () { ask('Delete ' + r.name + ' from the Directory?', 'Delete', function () { return remove(t, r.id).then(render); }, used.length ? 'It will also be removed from ' + plural(used.length, 'event') + '.' : ''); } });
}
var DIRFORM = { ed_people: ['person', 'Person'], ed_vendors: ['vendor', 'Vendor'], ed_contacts: ['contact', 'Contact'], ed_equipment: ['equipment', 'Equipment'], ed_budget: ['budget', 'Budget Line'] };
function editDir(t, rec, after) {
  var d = DIRFORM[t];
  editRow(t, rec, F[d[0]], { title: (rec ? 'Edit ' : 'Add ') + d[1], base: rec ? null : { org_id: org().id, status: 'current', groups: S.dirGroup ? [S.dirGroup] : [] },
    prep: function (v) { v.org_id = org().id; if (t === 'ed_budget' && !v.event_id) v.event_id = null; if (t === 'ed_equipment') v.quantity = Math.max(0, v.quantity || 0); return v; },
    after: after, delMsg: 'Delete this from the Directory?', delSub: rec && usedIn(t, rec.id).length ? 'It will also be removed from every event that uses it.' : '' });
}

/* ---------------------------------------------------------------- home */
function upcomingEvents() { return events().filter(function (e) { return (e.ends_on || e.starts_on || '9999') >= TODAY; }).sort(function (a, b) { return String(a.starts_on || '9').localeCompare(String(b.starts_on || '9')); }); }
function withEvent(e, fn) { var keep = S.ev; S.ev = e; try { return fn(); } finally { S.ev = keep; } }
function viewHome() {
  var up = upcomingEvents(), next = up[0], wk = addDays(TODAY, 7);
  var att = [], week = [], owed = 0, late = 0, cards = 0;
  events().forEach(function (e) {
    var isUp = up.indexOf(e) >= 0;
    withEvent(e, function () {
      if (isUp) attention(e).forEach(function (x) { att.push({ e: e, x: x }); });
      cards += evRows('ed_cards').filter(function (c) { return c.status === 'new'; }).length;
      if (!isUp) return;
      payables(e).forEach(function (p) { owed += p.owed; });
      late += evRows('ed_tasks').filter(function (t) { return !t.done && t.due_on && t.due_on < TODAY; }).length;
      if (on('calendar')) evRows('ed_schedule').filter(function (s) { return s.on_date >= TODAY && s.on_date <= wk; }).forEach(function (s) { week.push({ d: s.on_date, k: s.start_time || '', title: s.title, sub: [fmtTime(s.start_time), e.title].filter(Boolean).join(' · '), e: e, tab: 'calendar' }); });
      if (on('tasks')) evRows('ed_tasks').filter(function (t) { return !t.done && t.due_on && t.due_on >= TODAY && t.due_on <= wk; }).forEach(function (t) { week.push({ d: t.due_on, k: 'zz', title: t.title, sub: ['Task', t.owner, e.title].filter(Boolean).join(' · '), e: e, tab: 'tasks' }); });
    });
  });
  week.sort(function (a, b) { return (a.d + a.k).localeCompare(b.d + b.k); });
  att.sort(function (a, b) { return (a.x[0] === 'red' ? 0 : 1) - (b.x[0] === 'red' ? 0 : 1); });
  var h = '';
  h += '<div class="stats three">' + '<div class="stat c-red"><div class="v">' + late + '</div><div class="k">Overdue Tasks</div></div>' + '<div class="stat c-amber"><div class="v">' + money(owed) + '</div><div class="k">Still Owed</div></div>' + '<div class="stat c-green"><div class="v">' + up.length + '</div><div class="k">Upcoming Events</div></div></div>';
  h += secHead('Next Up');
  if (next) {
    var days = next.starts_on ? dayDiff(next.starts_on, TODAY) : null, ts = evRows('ed_tasks', next), td = ts.filter(function (t) { return t.done; }).length;
    h += '<button class="countdown cdbtn" data-a="open-event" data-id="' + next.id + '"><div class="cd-num">' + (days != null && days > 1 ? '<b>' + days + '</b><span>Days<br>To Go</span>' : '<b class="word">' + esc(countdown(next)) + '</b>') + '</div>' +
      '<div class="cd-side"><div class="cd-k">Next Up</div><div class="cd-title">' + esc(next.title) + '</div><div class="cd-sub">' + esc(fmtRange(next.starts_on, next.ends_on)) + '</div>' + (ts.length ? '<div class="cd-bar"><i style="width:' + Math.round(100 * td / ts.length) + '%"></i></div>' : '') + '</div></button>';
  } else h += '<div class="card empty">No upcoming events. ' + addBtn('Plan An Event', 'new-event') + '</div>';
  h += secHead('Needs Attention', '', att.length ? String(att.length) : '') + (att.length ? '<div class="list">' + att.slice(0, 8).map(function (a) {
    return '<button class="row flag ' + a.x[0] + '" data-a="open-event-tab" data-id="' + a.e.id + '" data-v="' + a.x[3] + '"><div class="main"><div class="t">' + esc(a.x[1]) + '</div><div class="s">' + esc(a.e.title) + (a.x[2] ? ' · ' + esc(a.x[2]) : '') + '</div></div><span class="chev">' + IC.chev + '</span></button>';
  }).join('') + '</div>' + (att.length > 8 ? '<p class="small muted">' + (att.length - 8) + ' more inside each event.</p>' : '') : '<div class="empty good">' + IC.check + ' Everything is on track.</div>');
  h += secHead('This Week') + listBox(week.slice(0, 8).map(function (w) {
    return '<button class="row" data-a="open-event-tab" data-id="' + w.e.id + '" data-v="' + w.tab + '"><span class="datebox sm"><small>' + dt(w.d).toLocaleDateString('en-US', { weekday: 'short' }) + '</small><b>' + dt(w.d).getDate() + '</b></span><div class="main"><div class="t">' + esc(w.title) + '</div><div class="s">' + esc(w.sub) + '</div></div><span class="chev">' + IC.chev + '</span></button>';
  }), 'Nothing scheduled in the next 7 days.');
  h += secHead('Quick Add') + '<div class="quick">' + [['new-event', 'Event', IC.cal, ''], ['dir-add', 'Person', IC.user, 'ed_people'], ['dir-add', 'Vendor', IC.tent, 'ed_vendors'], ['dir-add', 'Equipment', IC.box, 'ed_equipment']].map(function (q) {
    return '<button class="qa" data-a="' + q[0] + '"' + (q[3] ? ' data-id="' + q[3] + '"' : '') + '>' + q[2] + '<span>' + q[1] + '</span></button>';
  }).join('') + '</div>';
  return h;
}

/* ---------------------------------------------------------------- settings */
var NOTIFY = [['weekly', 'Weekly Summary', 'Every Monday: what’s coming up, what’s overdue and what’s owed.'], ['tasks', 'My Tasks', 'A reminder the day before a task assigned to you is due.'], ['payments', 'Payments Due', 'Three days before a payment you’re responsible for is due.'], ['signups', 'New Sign-Ups', 'When someone signs up to serve or bring food.'], ['cards', 'New Connection Cards', 'When a guest fills out a connection card.'], ['events', 'Event Reminders', 'One week and one day before each event starts.']];
var NOTIFY_DEF = { weekly: true, tasks: true, payments: true, signups: false, cards: true, events: true, channel: 'email' };
function prefs() { return Object.assign({}, NOTIFY_DEF, myMember().prefs || {}); }
function sw(on, act, id, label) { return '<button class="switch" role="switch" aria-checked="' + !!on + '" aria-label="' + esc(label) + '" data-a="' + act + '" data-id="' + esc(id) + '"><i></i></button>'; }
function kv(pairs) {
  return '<div class="kv">' + pairs.map(function (p) { return '<div><span>' + esc(p[0]) + '</span><b>' + (p[1] ? esc(p[1]) : '<em class="muted">Not Set</em>') + '</b></div>'; }).join('') + '</div>';
}
function viewSettings() {
  var a = S.acct, o = a.org, owner = a.role === 'owner', me = myMember(), p = prefs();
  var h = head('Settings', '', '<button class="iconbtn" data-a="close-settings" aria-label="Back">' + IC.back + '</button>', '', o.name) + '<main class="settings">';
  h += secHead('Ministry Profile', owner ? '<button class="link" data-a="edit-org">Edit</button>' : '') +
    '<div class="card profile"><div class="sheethead"><span class="brandmark big">' + IC.tent + '</span><div><h3>' + esc(o.name) + '</h3><p class="lead">' + esc(o.about || (owner ? 'Add a short description of your ministry.' : '')) + '</p></div></div>' +
    kv([['Phone', o.phone], ['Email', o.email], ['Website', o.website], ['Address', o.address], ['Online Giving', o.giving_link], ['Time Zone', (TIMEZONES.find(function (z) { return z[0] === (o.timezone || 'America/Chicago'); }) || [, o.timezone])[1]]]) +
    actions({ phone: o.phone, email: o.email, website: o.website, address: o.address }) + '</div>' +
    (owner ? '' : '<p class="small muted">Only the account owner can change the ministry profile.</p>');
  h += secHead('My Profile', '<button class="link" data-a="edit-me">Edit</button>') +
    '<div class="card"><div class="sheethead">' + avatar(me.name || S.user.email) + '<div><h3>' + esc(me.name || 'Add Your Name') + '</h3><p class="lead">' + (owner ? 'Account Owner' : 'Member') + '</p></div></div>' +
    kv([['Phone', me.phone], ['Login Email', S.user.email || me.email]]) +
    '<div class="btnrow"><button class="btn sm ghost" data-a="change-email">Change Login Email</button><button class="btn sm ghost" data-a="change-pw">Change Password</button></div></div>';
  h += secHead('Notifications') + '<div class="card"><div class="fld"><label for="n_ch">Send Them By</label><select class="inp" id="n_ch" data-change="notify-channel">' + [['email', 'Email'], ['text', 'Text Message'], ['both', 'Email And Text']].map(function (c) { return '<option value="' + c[0] + '"' + (p.channel === c[0] ? ' selected' : '') + '>' + c[1] + '</option>'; }).join('') + '</select></div>' +
    '<div class="swlist">' + NOTIFY.map(function (n) { return '<div class="swrow"><div class="main"><b>' + esc(n[1]) + '</b><span>' + esc(n[2]) + '</span></div>' + sw(p[n[0]], 'notify', n[0], n[1]) + '</div>'; }).join('') + '</div>' +
    ((p.channel !== 'email') && !me.phone ? '<p class="small danger">Add your phone number under My Profile to get texts.</p>' : '') + '</div>';
  h += secHead('Team And Access', owner && a.members.length < 10 ? addBtn('Invite', 'invite') : '', a.members.length + ' Of 10') +
    '<div class="list">' + a.members.map(function (m) {
      var self = m.user_id === S.user.id;
      return row({ lead: avatar(m.name || m.email), title: esc(m.name || m.email) + (self ? ' <span class="muted small">(You)</span>' : ''), sub: esc([m.email, m.phone].filter(Boolean).join(' · ')), right: (m.role === 'owner' ? pill('Owner', 'red') : '') + (owner && !self ? '<button class="iconbtn sm" data-a="remove-member" data-id="' + esc(m.user_id) + '" aria-label="Remove ' + esc(m.name || m.email) + '">' + IC.close + '</button>' : '') });
    }).join('') + '</div>' +
    (a.invites.length ? '<div class="grouplbl">Open Invites</div><div class="list">' + a.invites.map(function (i) {
      return '<div class="row"><div class="main"><div class="t">Invite Link</div><div class="urlbox">' + esc(inviteUrl(i.code)) + '</div></div><button class="link" data-a="copy" data-v="' + esc(inviteUrl(i.code)) + '">Copy</button><button class="link" data-a="cancel-invite" data-id="' + esc(i.code) + '">Cancel</button></div>';
    }).join('') + '</div>' : '') +
    '<p class="small muted">Each login belongs to one ministry. Someone who serves with another ministry signs up there with a different email.</p>';
  h += secHead('Account') + '<div class="list">' +
    (DB.mode === 'demo' ? row({ act: 'reset-demo', id: 'x', title: 'Reset The Demo', sub: 'Put the sample ministry back the way it started' }) : '') +
    row({ act: 'signout', id: 'x', title: 'Sign Out', sub: esc(S.user.email || '') }) +
    row({ act: 'leave-org', id: 'x', title: '<span class="danger">Leave This Ministry</span>', sub: 'You’ll lose access to its events and Directory' }) + '</div>';
  return h + '<p class="small muted center" style="margin-top:22px">Tent &amp; Table</p></main>';
}
var TIMEZONES = [['America/New_York', 'Eastern'], ['America/Chicago', 'Central'], ['America/Denver', 'Mountain'], ['America/Phoenix', 'Arizona'], ['America/Los_Angeles', 'Pacific'], ['America/Anchorage', 'Alaska'], ['Pacific/Honolulu', 'Hawaii']];
var F_ORG = [
  { k: 'name', label: 'Ministry Name', auto: true }, { k: 'about', label: 'About The Ministry', type: 'textarea', ph: 'Who you are and what you do.' },
  { k: 'phone', label: 'Ministry Phone', type: 'tel', half: true }, { k: 'email', label: 'Ministry Email', type: 'email', half: true },
  { k: 'website', label: 'Website', type: 'url', ph: 'yourministry.org' }, { k: 'address', label: 'Mailing Address' },
  { k: 'giving_link', label: 'Online Giving Link', type: 'url', hint: 'New events start with this link.', half: true }, { k: 'timezone', label: 'Time Zone', type: 'select', opts: TIMEZONES, half: true }];
var F_ME = [{ k: 'name', label: 'Your Name', auto: true }, { k: 'phone', label: 'Mobile Phone', type: 'tel', hint: 'Used for text reminders and shown to your team.' }];
function editProfile(fields, base, title, fn) {
  openSheet(function () { return '<h3>' + esc(title) + '</h3>' + formBody(fields, base) + sheetFoot(false); }, function () {
    var v = readForm(fields, {}); if (!v[fields[0].k]) { sheetErr('Please fill in ' + fields[0].label + '.'); return; }
    return busy(fn(v), 'Saved').then(function () { closeSheet(); render(); }).catch(function () {});
  });
}
function inviteUrl(code) { return location.origin + location.pathname + '?join=' + code; }

/* ================================================================ event workspace */
var SEC_IC = { calendar: 'cal', people: 'users', agenda: 'list', vendors: 'store', equipment: 'box', food: 'food', tasks: 'check2', money: 'dollar', followup: 'heart', share: 'share' };
var AREAS = [['overview', 'Overview'], ['plan', 'Plan'], ['dir', 'Directory'], ['money', 'Money'], ['guests', 'Guests']];
var AREA_SUBS = {
  plan: [['schedule', 'Schedule', 'calendar'], ['tasks', 'Tasks', 'tasks'], ['agenda', 'Agenda', 'agenda'], ['setlists', 'Set Lists', 'people']],
  dir: [['people', 'People', 'people'], ['volunteers', 'Volunteers', 'vols'], ['vendors', 'Vendors', 'vendors'], ['contacts', 'Contacts', 'vendors'], ['equipment', 'Equipment', 'equipment']],
  guests: [['attending', 'Attending', 'always'], ['checkin', 'Check-In', 'always'], ['followup', 'Follow-Up', 'followup']]
};
var JUMP = { calendar: ['plan', 'schedule'], tasks: ['plan', 'tasks'], agenda: ['plan', 'agenda'], setlists: ['plan', 'setlists'], people: ['dir', 'people'], vendors: ['dir', 'vendors'], contacts: ['dir', 'contacts'], equipment: ['dir', 'equipment'], food: ['dir', 'volunteers'], signups: ['dir', 'volunteers'], volunteers: ['dir', 'volunteers'], attending: ['guests', 'attending'], checkin: ['guests', 'checkin'], followup: ['guests', 'followup'], share: ['guests', 'attending'], money: ['money'], payments: ['money'] };
function subOn(x) { return x[2] === 'always' ? true : x[2] === 'vols' ? (on('people') || on('food')) : on(x[2]); }
function areaSubs(k) { return (AREA_SUBS[k] || []).filter(subOn); }
function areaOn(k) { return k === 'overview' || (k === 'money' ? on('money') : areaSubs(k).length > 0); }
function goArea(key) {
  if (AREAS.some(function (x) { return x[0] === key; })) { S.evTab = key; return; }
  var j = JUMP[key] || ['overview']; S.evTab = j[0];
  if (j[1]) S.sub['area_' + j[0]] = j[1];
  if (key === 'money' || key === 'payments') S.sub.money = 'payments';
  if (key === 'food') S.sub.signkind = 'meal';
  if (key === 'signups' || key === 'volunteers') S.sub.signkind = 'serve';
}
function hidden(fn) { S.hideSub = true; try { return fn(); } finally { S.hideSub = false; } }
function viewWorkspace() {
  var e = S.ev = byId('ed_events', S.ev.id) || S.ev;
  var areas = AREAS.filter(function (x) { return areaOn(x[0]); });
  if (!areas.some(function (x) { return x[0] === S.evTab; })) S.evTab = 'overview';
  var menu = '<button class="iconbtn" data-a="event-menu" aria-label="Event Menu">' + IC.more + '</button>';
  var h = head(e.title, [fmtRange(e.starts_on, e.ends_on), e.time_label, e.place].filter(Boolean).join(' · '), '<button class="iconbtn" data-a="close-event" aria-label="Back To Events">' + IC.back + '</button>', menu, org().name);
  h = h.replace(/<\/header>$/, tabs(areas, S.evTab, 'ev-tab', 'areabar') + '</header>');
  var body;
  if (S.evTab === 'overview') body = wsOverview(e);
  else if (S.evTab === 'money') body = wsMoney(e);
  else {
    var subs = areaSubs(S.evTab), key = 'area_' + S.evTab, cur = S.sub[key];
    if (!subs.some(function (x) { return x[0] === cur; })) cur = S.sub[key] = subs[0][0];
    body = (subs.length > 1 ? tabs(subs, cur, 'sub-tab" data-k="' + key, 'subtabs') : '') + areaView(S.evTab, cur, e);
  }
  return '<div class="ws">' + h + '<main>' + body + '</main></div>';
}
function areaView(area, sub, e) {
  if (sub === 'schedule') return wsCalendar(e);
  if (sub === 'tasks') return wsTasks(e);
  if (sub === 'agenda') return wsAgenda(e);
  if (sub === 'setlists') return setlistsView();
  if (sub === 'people') return dirPeople(e);
  if (sub === 'vendors' || sub === 'contacts') { S.sub.vendors = sub; return hidden(function () { return wsVendors(e); }); }
  if (sub === 'equipment') return wsEquipment(e);
  if (sub === 'checkin') return checkinView(e);
  if (sub === 'followup') return wsFollowup(e);
  if (sub === 'attending') return attendingView(e);
  if (sub === 'volunteers') return volunteersView(e);
  return '';
}
function volunteersView(e) {
  var kinds = [];
  if (on('people')) kinds.push(['serve', 'Volunteers']);
  if (on('food')) kinds.push(['meal', 'Meals']);
  var st = subTabs('signkind', kinds, 'serve');
  var top = kinds.length > 1 ? st.html.replace('class="subtabs"', 'class="subtabs mini"') : '';
  if (st.cur === 'meal') return top + shareBar('v') + wsFood(e);
  var av = assigned('volunteer');
  return top + shareBar('v') + secHead('Volunteer Team', addBtn('Add From Directory', 'pick-people', 'volunteer'), av.length ? String(av.length) : '') +
    listBox(av.map(function (x) { return personRow(x); }), 'Volunteers you place yourself, straight from the Directory.') +
    signupBlock('serve', 'Volunteer Spots', 'Add Spot');
}
function attendingView(e) {
  var its = evRows('ed_items').filter(function (i) { return i.kind === 'attend'; }), f = fill('attend'), people = 0, here = 0;
  its.forEach(function (i) { signups(i.id).forEach(function (s) { people += 1; if (s.checked_in_at) here += (s.party || 1); }); });
  return shareBar('r') + (its.length ? '<div class="stats three">' + stat('Coming', f.have) + stat('RSVPs', people) + stat('Checked In', here) + '</div>' : '') +
    signupBlock('attend', 'Who’s Coming', 'Add Service') +
    (its.length ? '' : '<p class="small muted">Add each service or night people can RSVP for, with how many seats you have. Guests RSVP with the link above.</p>');
}
function checkinView(e) {
  var its0 = evRows('ed_items').filter(function (i) { return i.kind === 'attend' || i.kind === 'serve'; }), days = [];
  its0.forEach(function (i) { var d = i.on_date || ''; if (days.indexOf(d) < 0) days.push(d); }); days.sort();
  if (!days.length) return '<div class="empty card">Add RSVP services under Attending, or volunteer spots under Directory, then check people in here.</div>';
  var day = S.sub.ciDay != null && days.indexOf(S.sub.ciDay) >= 0 ? S.sub.ciDay : (days.indexOf(TODAY) >= 0 ? TODAY : days.find(function (d) { return d >= TODAY; }) || days[0]);
  S.sub.ciDay = day;
  var its = its0.filter(function (i) { return (i.on_date || '') === day; }), all = 0, here = 0;
  function block(kind, label) {
    var list = its.filter(function (i) { return i.kind === kind; }); if (!list.length) return '';
    return secHead(label) + list.map(function (i) {
      var su = signups(i.id).slice().sort(function (a, b) { return a.name.localeCompare(b.name); });
      su.forEach(function (s) { var n = kind === 'attend' ? (s.party || 1) : 1; all += n; if (s.checked_in_at) here += n; });
      return '<div class="grouplbl">' + esc(i.title) + '</div>' + listBox(su.map(function (s) {
        return '<div class="row">' + ck(!!s.checked_in_at, 'checkin', s.id, 'Checked in') + '<div class="main"><div class="t">' + esc(s.name) + '</div><div class="s">' + esc([kind === 'attend' && (s.party || 1) > 1 ? 'Party of ' + s.party : '', s.phone || s.email].filter(Boolean).join(' · ')) + '</div></div>' + (s.checked_in_at ? pill('Here', 'green') : '') + '</div>';
      }), 'No one yet.');
    }).join('');
  }
  var body = block('attend', 'Guests') + block('serve', 'Volunteers');
  return '<div class="toolbar"><label class="sr" for="ci_day">Day</label><select class="inp sm" id="ci_day" data-change="ci-day">' + days.map(function (d) { return '<option value="' + d + '"' + (d === day ? ' selected' : '') + '>' + esc(d ? fmtLong(d) : 'No Date') + '</option>'; }).join('') + '</select></div>' +
    '<div class="stats">' + stat('Checked In', here + ' / ' + all, true) + '</div>' + body;
}
function setlistsView() {
  var sets = evRows('ed_setlists').sort(function (a, b) { return String(a.on_date || '').localeCompare(String(b.on_date || '')); });
  return secHead('Set Lists', addBtn('Add Set List', 'add-setlist')) + (sets.length ? sets.map(function (s) {
    return '<button class="card setlist" data-a="edit-setlist" data-id="' + s.id + '"><div class="sl-head"><b>' + esc(s.title || 'Set List') + '</b><span class="muted small">' + esc([s.on_date ? fmtDay(s.on_date) : '', s.rehearsal].filter(Boolean).join(' · ')) + '</span></div><ol>' + String(s.songs || '').split('\n').filter(Boolean).map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ol></button>';
  }).join('') : '<div class="empty">No set lists yet.</div>');
}
var DIR_TEAMS = [['leader', 'Leadership', 'Who is leading this event?'], ['team', 'Ministry Team', 'Altar counselors, prayer team, security, host…'], ['speaker', 'Speakers', 'Guest and in-house speakers.'], ['worship', 'Worship Team', 'Musicians, vocalists and sound.']];
function dirPeople(e) {
  var f = S.sub.dirTeam || 'all', total = evRows('ed_event_people').filter(function (x) { return x.team !== 'volunteer'; }).length;
  var h = '<div class="toolbar"><label class="sr" for="dt_team">Team</label><select class="inp sm" id="dt_team" data-change="dir-team"><option value="all">All Teams · ' + total + '</option>' + DIR_TEAMS.map(function (t) { return '<option value="' + t[0] + '"' + (f === t[0] ? ' selected' : '') + '>' + t[1] + ' · ' + assigned(t[0]).length + '</option>'; }).join('') + '</select></div>';
  DIR_TEAMS.filter(function (t) { return f === 'all' || f === t[0]; }).forEach(function (t) {
    var list = assigned(t[0]);
    if (t[0] === 'speaker') list.sort(function (a, b) { return String((a.a.details || {}).date || '9').localeCompare(String((b.a.details || {}).date || '9')); });
    h += secHead(t[1], addBtn('Add', 'pick-people', t[0]), list.length ? String(list.length) : '') + listBox(list.map(function (x) {
      if (t[0] !== 'speaker') return personRow(x);
      var d = x.a.details || {};
      return personRow(x, esc([d.date ? fmtDay(d.date) : '', d.time, d.topic ? '“' + d.topic + '”' : ''].filter(Boolean).join(' · ')) + (num(x.a.amount) ? '<br>Honorarium ' + money(x.a.amount) + ' · ' + esc(x.a.pay_status) : ''),
        pill(d.status || 'Confirmed', (d.status || 'Confirmed') === 'Confirmed' ? 'green' : d.status === 'Declined' ? '' : 'amber'));
    }), t[2]);
  });
  return h;
}
function sectionStatus(k, e) {
  var n;
  if (k === 'calendar') { var d = eventDays(e).length; return plural(d, 'day') + ' · ' + plural(evRows('ed_schedule').length, 'item'); }
  if (k === 'people') { var sv = fill('serve'); return plural(evRows('ed_event_people').filter(function (a) { return a.team !== 'volunteer'; }).length, 'person', 'people') + (sv.need ? ' · ' + sv.have + '/' + sv.need + ' spots' : ''); }
  if (k === 'agenda') return plural(evRows('ed_agenda').length, 'topic');
  if (k === 'vendors') { var owed = payables(e).filter(function (p) { return p.t === 'v'; }).reduce(function (s, p) { return s + p.owed; }, 0); return plural(evRows('ed_event_vendors').length, 'vendor') + (owed ? ' · ' + money(owed) + ' owed' : ''); }
  if (k === 'equipment') { var eq = evRows('ed_event_equipment'); return plural(eq.length, 'item') + (eq.length ? ' · ' + eq.filter(function (x) { return x.loaded; }).length + ' loaded' : ''); }
  if (k === 'food') { var ml = fill('meal'); return ml.need ? ml.have + '/' + ml.need + ' meals' : 'No meals yet'; }
  if (k === 'tasks') { var ts = evRows('ed_tasks'); n = ts.filter(function (t) { return !t.done && t.due_on && t.due_on < TODAY; }).length; return ts.filter(function (t) { return t.done; }).length + '/' + ts.length + ' done' + (n ? ' · <b class="red">' + n + ' late</b>' : ''); }
  if (k === 'money') { var m = eventMoney(e); return money(m.committed) + ' costs · ' + money(m.given) + ' given'; }
  if (k === 'followup') { n = evRows('ed_cards').filter(function (c) { return c.status === 'new'; }).length; return n ? '<b class="red">' + n + ' new</b>' : plural(evRows('ed_cards').length, 'card'); }
  if (k === 'share') return 'Links and QR codes';
  return '';
}
function subTabs(key, list, def) { var cur = S.sub[key] || def; if (!list.some(function (x) { return x[0] === cur; })) cur = list[0][0]; S.sub[key] = cur; return { cur: cur, html: S.hideSub ? '' : tabs(list, cur, 'sub-tab" data-k="' + key, 'subtabs') }; }

/* ---------- overview */
function attention(e) {
  var out = [], soon = addDays(TODAY, 14), started = e.starts_on && e.starts_on <= TODAY, ended = (e.ends_on || e.starts_on) && (e.ends_on || e.starts_on) < TODAY;
  if (on('tasks')) { var late = evRows('ed_tasks').filter(function (t) { return !t.done && t.due_on && t.due_on < TODAY; }); if (late.length) out.push(['red', plural(late.length, 'Task') + ' Overdue', late.slice(0, 3).map(function (t) { return t.title; }).join(', '), 'tasks']); }
  if (on('money') || on('vendors') || on('people')) {
    var pays = payables(e), od = pays.filter(function (p) { return p.owed > 0 && p.due && p.due < TODAY; }), ds = pays.filter(function (p) { return p.owed > 0 && p.due && p.due >= TODAY && p.due <= soon; });
    if (od.length) out.push(['red', plural(od.length, 'Payment') + ' Overdue', od.map(function (p) { return p.name + ' ' + money(p.owed); }).join(', '), 'money']);
    if (ds.length) out.push(['amber', plural(ds.length, 'Payment') + ' Due In The Next 2 Weeks', ds.map(function (p) { return p.name + ' ' + money(p.owed) + ' by ' + fmtDay(p.due, { month: 'short', day: 'numeric' }); }).join(', '), 'money']);
  }
  if (on('vendors')) { var q = evRows('ed_event_vendors').filter(function (v) { return v.status === 'Quoted'; }); if (q.length) out.push(['amber', plural(q.length, 'Vendor') + ' Not Booked Yet', q.map(function (v) { return (byId('ed_vendors', v.vendor_id) || {}).name; }).join(', '), 'vendors']); }
  if (on('people')) {
    var sp = evRows('ed_event_people').filter(function (p) { return p.team === 'speaker' && (p.details || {}).status === 'Invited'; });
    if (sp.length) out.push(['amber', plural(sp.length, 'Speaker') + ' Not Confirmed', sp.map(function (p) { return (byId('ed_people', p.person_id) || {}).name; }).join(', '), 'people']);
    var open = evRows('ed_items').filter(function (i) { return i.kind === 'serve'; }).reduce(function (s, i) { return s + Math.max(0, i.needed - signups(i.id).length); }, 0);
    if (open) out.push(['amber', plural(open, 'Volunteer Spot') + ' Still Open', 'Share the sign-up link.', 'volunteers']);
  }
  if (on('food')) { var mo = evRows('ed_items').filter(function (i) { return i.kind === 'meal'; }).reduce(function (s, i) { return s + Math.max(0, i.needed - signups(i.id).length); }, 0); if (mo) out.push(['amber', plural(mo, 'Meal Spot') + ' Still Open', '', 'food']); }
  if (on('equipment')) {
    var eq = evRows('ed_event_equipment'), cf = eq.filter(function (a) { return conflict(a); });
    if (cf.length) out.push(['red', plural(cf.length, 'Equipment Item') + ' Double-Booked', cf.map(function (a) { return (byId('ed_equipment', a.equipment_id) || {}).name; }).join(', '), 'equipment']);
    var bad = eq.filter(function (a) { var g = byId('ed_equipment', a.equipment_id); return g && g.condition !== 'Good'; });
    if (bad.length) out.push(['amber', plural(bad.length, 'Item') + ' Needs Repair Or Is Missing', bad.map(function (a) { return byId('ed_equipment', a.equipment_id).name; }).join(', '), 'equipment']);
    if (ended) { var nr = eq.filter(function (a) { return !a.returned; }); if (nr.length) out.push(['amber', plural(nr.length, 'Item') + ' Not Returned', '', 'equipment']); }
    else if (e.starts_on && dayDiff(e.starts_on, TODAY) <= 2) { var nl = eq.filter(function (a) { return !a.loaded; }); if (nl.length) out.push(['amber', plural(nl.length, 'Item') + ' Not Loaded', '', 'equipment']); }
  }
  if (on('followup')) { var nc = evRows('ed_cards').filter(function (c) { return c.status === 'new'; }); if (nc.length) out.push(['red', plural(nc.length, 'New Connection Card') + ' To Follow Up', nc.map(function (c) { return c.name; }).join(', '), 'followup']); }
  return out;
}
function wsOverview(e) {
  var cd = countdown(e), att = attention(e), m = eventMoney(e);
  var up = [];
  if (on('calendar')) evRows('ed_schedule').filter(function (s) { return s.on_date >= TODAY; }).forEach(function (s) { up.push({ d: s.on_date, t: s.start_time || '', title: s.title, sub: [fmtTime(s.start_time), s.location].filter(Boolean).join(' · '), tab: 'calendar' }); });
  if (on('tasks')) evRows('ed_tasks').filter(function (t) { return !t.done && t.due_on && t.due_on >= TODAY; }).forEach(function (t) { up.push({ d: t.due_on, t: 'zz', title: t.title, sub: 'Task' + (t.owner ? ' · ' + t.owner : ''), tab: 'tasks' }); });
  up.sort(function (a, b) { return (a.d + a.t).localeCompare(b.d + b.t); });
  var days = e.starts_on ? Math.round((dt(e.starts_on) - dt(TODAY)) / 864e5) : null, ts = evRows('ed_tasks'), td = ts.filter(function (t) { return t.done; }).length, pct = ts.length ? Math.round(100 * td / ts.length) : 0;
  var g = [];
  function tile(k, v, jump, hl) { g.push('<button class="stat' + (hl ? ' hl' : '') + '" data-a="ev-tab" data-id="' + jump + '"><div class="v">' + v + '</div><div class="k">' + esc(k) + '</div></button>'); }
  if (on('people')) { var sv = fill('serve'); tile('Volunteers', sv.need ? sv.have + '/' + sv.need : assigned('volunteer').length, 'volunteers'); }
  if (fill('attend').need) tile('Coming', fill('attend').have, 'attending');
  if (on('food') && fill('meal').need) { var ml = fill('meal'); tile('Meals', ml.have + '/' + ml.need, 'food'); }
  if (on('equipment')) { var eq = evRows('ed_event_equipment'); tile('Loaded', eq.filter(function (x) { return x.loaded; }).length + '/' + eq.length, 'equipment'); }
  if (on('vendors')) { var ow = payables(e).filter(function (p) { return p.t === 'v'; }).reduce(function (s, p) { return s + p.owed; }, 0); tile('Vendors Owed', money(ow), 'vendors', ow > 0); }
  if (on('money')) { tile('Committed', money(m.committed), 'money', m.budget && m.committed > m.budget); tile('Given', money(m.given), 'money'); }
  if (on('agenda')) tile('Agenda', evRows('ed_agenda').length, 'agenda');
  if (on('followup')) { var nc = evRows('ed_cards').filter(function (c) { return c.status === 'new'; }).length; tile('New Cards', nc, 'followup', nc > 0); }
  return '<div class="countdown"><div class="cd-num">' + (days != null && days > 1 ? '<b>' + days + '</b><span>Days<br>To Go</span>' : '<b class="word">' + esc(cd || 'Not Scheduled') + '</b>') + '</div>' +
      '<div class="cd-side">' + (ts.length ? '<div class="cd-k">Tasks</div><div class="cd-v">' + td + ' of ' + ts.length + ' done</div><div class="cd-bar"><i style="width:' + pct + '%"></i></div>' : '<div class="cd-k">' + esc(fmtRange(e.starts_on, e.ends_on)) + '</div>') +
      (e.address ? '<a class="cd-link" href="' + esc(mapUrl(e.address)) + '" target="_blank" rel="noopener">' + IC.pin + ' Directions</a>' : '') + '</div></div>' +
    (g.length ? secHead('At A Glance') + '<div class="stats glance">' + g.slice(0, 6).join('') + '</div>' : '') +
    secHead('Needs Attention', '', att.length ? String(att.length) : '') +
    (att.length ? '<div class="list">' + att.map(function (a) { return row({ act: 'ev-tab', id: a[3], cls: 'flag ' + a[0], title: esc(a[1]), sub: esc(a[2]) }); }).join('') + '</div>'
      : '<div class="empty good">' + IC.check + ' Nothing needs attention right now.</div>') +
    (up.length ? secHead('Coming Up') + listBox(up.slice(0, 5).map(function (u) { return row({ act: 'ev-tab', id: u.tab, lead: '<span class="datebox sm"><small>' + dt(u.d).toLocaleDateString('en-US', { month: 'short' }) + '</small><b>' + dt(u.d).getDate() + '</b></span>', title: esc(u.title), sub: esc(u.sub) }); }), '') : '');
}
function signups(itemId) { return T('ed_signups').filter(function (s) { return s.item_id === itemId; }); }
function taken(i) { return signups(i.id).reduce(function (n, s) { return n + (i.kind === 'attend' ? (s.party || 1) : 1); }, 0); }
function fill(kind) { var need = 0, have = 0; evRows('ed_items').filter(function (i) { return i.kind === kind; }).forEach(function (i) { need += i.needed; have += Math.min(i.needed, taken(i)); }); return { need: need, have: have }; }

/* ---------- calendar */
function eventDays(e) {
  var s = {};
  if (e.starts_on) { var n = e.ends_on ? dayDiff(e.ends_on, e.starts_on) : 0; for (var i = 0; i <= Math.min(n, 60); i++) s[addDays(e.starts_on, i)] = 1; }
  evRows('ed_schedule').forEach(function (r) { if (r.on_date) s[r.on_date] = 1; });
  evRows('ed_items').forEach(function (r) { if (r.on_date) s[r.on_date] = 1; });
  return Object.keys(s).sort();
}
function wsCalendar(e) {
  var days = eventDays(e);
  var tasksDue = evRows('ed_tasks').filter(function (t) { return t.due_on && days.indexOf(t.due_on) < 0 && t.due_on >= TODAY && !t.done; });
  if (!days.length) return '<div class="card empty">Give this event its dates to build its calendar. <button class="link" data-a="edit-event">Set Dates</button></div>';
  var cur = S.calDay && days.indexOf(S.calDay) >= 0 ? S.calDay : (days.indexOf(TODAY) >= 0 ? TODAY : days.find(function (d) { return d >= TODAY; }) || days[0]);
  S.calDay = cur;
  var strip = '<div class="daystrip" role="tablist">' + days.map(function (d) {
    var x = dt(d), busy = evRows('ed_schedule').some(function (s) { return s.on_date === d; });
    return '<button role="tab" aria-selected="' + (d === cur) + '" data-a="cal-day" data-v="' + d + '"><small>' + x.toLocaleDateString('en-US', { weekday: 'short' }) + '</small><b>' + x.getDate() + '</b><small>' + x.toLocaleDateString('en-US', { month: 'short' }) + '</small>' + (busy ? '<i></i>' : '') + '</button>';
  }).join('') + '</div>';
  var sched = evRows('ed_schedule').filter(function (s) { return s.on_date === cur; }).sort(function (a, b) { return String(a.start_time || '').localeCompare(String(b.start_time || '')); });
  var tasks = evRows('ed_tasks').filter(function (t) { return t.due_on === cur; });
  var its = evRows('ed_items').filter(function (i) { return i.on_date === cur; });
  var sets = evRows('ed_setlists').filter(function (s) { return s.on_date === cur; });
  var sp = evRows('ed_event_people').filter(function (p) { return p.team === 'speaker' && (p.details || {}).date === cur; });
  return strip + secHead(fmtLong(cur), addBtn('Add To Schedule', 'add-sched')) +
    listBox(sched.map(function (s) { return row({ act: 'edit-sched', id: s.id, lead: '<span class="time">' + esc(fmtTime(s.start_time) || 'All Day') + (s.end_time ? '<small>' + esc(fmtTime(s.end_time)) + '</small>' : '') + '</span>', title: esc(s.title), sub: esc([s.location, s.owner].filter(Boolean).join(' · ')) }); }), 'Nothing scheduled this day.') +
    (sp.length ? '<div class="grouplbl">Speaking</div>' + listBox(sp.map(function (p) { var pr = byId('ed_people', p.person_id) || {}; return row({ act: 'edit-assign', id: p.id, lead: avatar(pr.name), title: esc(pr.name), sub: esc([p.details.time, p.details.topic].filter(Boolean).join(' · ')) }); }), '') : '') +
    (tasks.length ? '<div class="grouplbl">Tasks Due</div>' + listBox(tasks.map(taskRow), '') : '') +
    (its.length ? '<div class="grouplbl">Sign-Up Spots</div>' + listBox(its.map(function (i) { var n = signups(i.id).length; return row({ act: 'edit-item', id: i.id, title: esc(i.title), sub: esc([i.time_label, i.kind === 'meal' ? 'Food' : 'Volunteers'].filter(Boolean).join(' · ')), right: pill(n + ' / ' + i.needed, n >= i.needed ? 'green' : 'amber') }); }), '') : '') +
    (sets.length ? '<div class="grouplbl">Set Lists</div>' + listBox(sets.map(function (s) { return row({ act: 'edit-setlist', id: s.id, title: esc(s.title || 'Set List'), sub: esc(String(s.songs || '').split('\n').filter(Boolean).join(' · ')) }); }), '') : '') +
    (tasksDue.length ? '<p class="small muted" style="margin-top:16px">' + plural(tasksDue.length, 'more task') + ' fall before the event. See the Tasks tab.</p>' : '');
}

/* ---------- people */
function assigned(team) { return evRows('ed_event_people').filter(function (a) { return a.team === team; }).map(function (a) { return { a: a, p: byId('ed_people', a.person_id) || { name: '(Removed)' } }; }).sort(function (x, y) { return x.p.name.localeCompare(y.p.name); }); }
function personRow(x, extraSub, right) { return row({ act: 'edit-assign', id: x.a.id, lead: avatar(x.p.name), title: esc(x.p.name), sub: esc([x.a.role || x.p.title, x.a.days].filter(Boolean).join(' · ')) + (extraSub ? '<br>' + extraSub : ''), right: right || '' }); }
function wsPeople(e) {
  var cnt = function (t) { return assigned(t).length; };
  var st = subTabs('people', [['team', 'Team', cnt('leader') + cnt('team')], ['speakers', 'Speakers', cnt('speaker')], ['worship', 'Worship', cnt('worship')], ['volunteers', 'Volunteers', cnt('volunteer') + evRows('ed_signups').filter(function (s) { var i = byId('ed_items', s.item_id); return i && i.kind === 'serve'; }).length], ['checkin', 'Check-In', '']], 'team');
  var h = st.html;
  if (st.cur === 'team') {
    return h + secHead('Leadership', addBtn('Add From Directory', 'pick-people', 'leader')) + listBox(assigned('leader').map(function (x) { return personRow(x); }), 'Who is leading this event? Add them from the Directory.') +
      secHead('Ministry Team', addBtn('Add From Directory', 'pick-people', 'team', 'ghost')) + listBox(assigned('team').map(function (x) { return personRow(x); }), 'Altar counselors, prayer team, security, host…');
  }
  if (st.cur === 'speakers') {
    var sp = assigned('speaker').sort(function (a, b) { return String((a.a.details || {}).date || '9').localeCompare(String((b.a.details || {}).date || '9')); });
    return h + secHead('Speakers', addBtn('Add From Directory', 'pick-people', 'speaker')) + listBox(sp.map(function (x) {
      var d = x.a.details || {};
      return personRow(x, esc([d.date ? fmtDay(d.date) : '', d.time, d.topic ? '“' + d.topic + '”' : ''].filter(Boolean).join(' · ')) + (d.travel || d.lodging ? '<br>' + esc([d.travel, d.lodging].filter(Boolean).join(' · ')) : '') + (num(x.a.amount) ? '<br>Honorarium ' + money(x.a.amount) + ' · ' + esc(x.a.pay_status) + (x.a.payer ? ' · ' + esc(x.a.payer) + ' pays' : '') : ''),
        pill(d.status || 'Confirmed', (d.status || 'Confirmed') === 'Confirmed' ? 'green' : d.status === 'Declined' ? '' : 'amber'));
    }), 'Add guest and in-house speakers from the Directory.');
  }
  if (st.cur === 'worship') {
    var sets = evRows('ed_setlists').sort(function (a, b) { return String(a.on_date || '').localeCompare(String(b.on_date || '')); });
    return h + secHead('Worship Team', addBtn('Add From Directory', 'pick-people', 'worship')) + listBox(assigned('worship').map(function (x) { return personRow(x); }), 'Add your musicians, vocalists and sound team from the Directory.') +
      secHead('Set Lists', addBtn('Add Set List', 'add-setlist', '', 'ghost')) +
      (sets.length ? sets.map(function (s) {
        return '<button class="card setlist" data-a="edit-setlist" data-id="' + s.id + '"><div class="sl-head"><b>' + esc(s.title || 'Set List') + '</b><span class="muted small">' + esc([s.on_date ? fmtDay(s.on_date) : '', s.rehearsal].filter(Boolean).join(' · ')) + '</span></div><ol>' + String(s.songs || '').split('\n').filter(Boolean).map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ol></button>';
      }).join('') : '<div class="empty card">No set lists yet.</div>');
  }
  if (st.cur === 'volunteers') {
    return h + secHead('Assigned Volunteers', addBtn('Add From Directory', 'pick-people', 'volunteer')) + listBox(assigned('volunteer').map(function (x) { return personRow(x); }), 'Volunteers you place yourself. People can also sign up below.') +
      signupBlock('serve', 'Sign-Up Spots', 'Add Spot');
  }
  // check-in
  var serve = evRows('ed_items').filter(function (i) { return i.kind === 'serve'; }), days = [];
  serve.forEach(function (i) { var d = i.on_date || ''; if (days.indexOf(d) < 0) days.push(d); }); days.sort();
  var day = S.sub.ciDay != null && days.indexOf(S.sub.ciDay) >= 0 ? S.sub.ciDay : (days.indexOf(TODAY) >= 0 ? TODAY : days.find(function (d) { return d >= TODAY; }) || days[0]);
  S.sub.ciDay = day; var its = serve.filter(function (i) { return (i.on_date || '') === day; }), all = 0, here = 0;
  var body = its.map(function (i) {
    var su = signups(i.id); all += su.length; here += su.filter(function (s) { return s.checked_in_at; }).length;
    return '<div class="grouplbl">' + esc(i.title) + ' · ' + su.length + ' Of ' + i.needed + '</div>' + listBox(su.map(function (s) {
      return '<div class="row">' + ck(!!s.checked_in_at, 'checkin', s.id, 'Checked in') + '<div class="main"><div class="t">' + esc(s.name) + '</div><div class="s">' + esc(s.phone || s.email) + '</div></div>' + (s.checked_in_at ? pill('Here', 'green') : '') + '</div>';
    }), 'No one signed up.');
  }).join('');
  return h + (days.length ? '<div class="toolbar"><label class="sr" for="ci_day">Day</label><select class="inp sm" id="ci_day" data-change="ci-day">' + days.map(function (d) { return '<option value="' + d + '"' + (d === day ? ' selected' : '') + '>' + esc(d ? fmtLong(d) : 'No Date') + '</option>'; }).join('') + '</select></div>' +
    '<div class="stats">' + stat('Checked In', here + ' / ' + all, true) + '</div>' + body : '<div class="empty card">Add volunteer sign-up spots first, under Volunteers.</div>');
}
function signupBlock(kind, title, addLabel) {
  var list = evRows('ed_items').filter(function (i) { return i.kind === kind; }).sort(function (a, b) { return String(a.on_date || '').localeCompare(String(b.on_date || '')) || a.sort - b.sort; });
  var f = fill(kind), groups = [];
  list.forEach(function (i) { var g = groups.find(function (x) { return x.d === (i.on_date || ''); }); if (!g) groups.push(g = { d: i.on_date || '', items: [] }); g.items.push(i); });
  var att = kind === 'attend';
  return secHead(title, addBtn(addLabel, 'add-item', kind, 'ghost'), att ? '' : f.have + ' Of ' + f.need + ' Filled') +
    '<div class="btnrow"><button class="btn sm plain" data-a="csv-signups" data-id="' + kind + '">Download List</button></div>' +
    (groups.length ? groups.map(function (g) {
      return '<div class="grouplbl">' + esc(g.d ? fmtLong(g.d) : 'Any Day') + '</div>' + g.items.map(function (i) {
        var su = signups(i.id), tk = taken(i), open = i.needed - tk;
        return '<div class="card slotcard"><div class="slot-head"><div class="main"><b>' + esc(i.title) + '</b>' + (i.time_label || i.notes ? '<div class="small muted">' + esc([i.time_label, i.notes].filter(Boolean).join(' · ')) + '</div>' : '') + '</div>' +
          pill(att ? tk + ' Coming' : tk + ' / ' + i.needed, att ? (open > 0 ? 'green' : 'amber') : open > 0 ? 'amber' : 'green') + '<button class="link" data-a="edit-item" data-id="' + i.id + '">Edit</button></div>' + meter(Math.min(su.length, i.needed), i.needed) +
          (su.length ? '<div class="list inner">' + su.map(function (s) {
            return '<div class="row"><div class="main"><div class="t">' + esc(s.name) + (s.checked_in_at ? ' ' + pill('Here', 'green') : '') + '</div><div class="s">' + esc([att && (s.party || 1) > 1 ? 'Party of ' + s.party : '', s.phone, s.email, s.note].filter(Boolean).join(' · ')) + '</div></div>' +
              (s.phone ? '<a class="link" href="sms:' + esc(digits(s.phone)) + '">Text</a>' : '') + '<button class="link" data-a="del-signup" data-id="' + s.id + '">Remove</button></div>';
          }).join('') + '</div>' : '') + (open > 0 ? '<button class="link" data-a="add-signup" data-id="' + i.id + '">' + IC.plus + (att ? ' Add An RSVP' : ' Add A Person') + '</button>' : '') + '</div>';
      }).join('');
    }).join('') : '<div class="empty card">Nothing for people to sign up for yet.</div>') +
    (kind === 'serve' ? '<div class="card tip"><b>Keep Your Volunteers</b><p class="small muted">Save everyone who signed up to the Directory as current volunteers, so you can invite them next time.</p><button class="btn sm ghost" data-a="vols-to-dir">Add Them To The Directory</button></div>' : '');
}

/* ---------- agenda */
function wsAgenda(e) {
  var list = evRows('ed_agenda').sort(function (a, b) { return a.sort - b.sort; }), mins = list.reduce(function (s, a) { return s + num(a.minutes); }, 0);
  return secHead('Agenda', addBtn('Add Topic', 'add-agenda'), mins ? 'About ' + mins + ' Minutes' : '') +
    listBox(list.map(function (a, i) {
      return '<div class="row">' + ck(a.done, 'toggle-agenda', a.id, 'Covered') + '<button class="main" data-a="edit-agenda" data-id="' + a.id + '"><div class="t' + (a.done ? ' done' : '') + '">' + (i + 1) + '. ' + esc(a.title) + '</div><div class="s">' + esc([a.leader, a.minutes ? a.minutes + ' Min' : ''].filter(Boolean).join(' · ')) + (a.notes ? '<br>' + esc(a.notes) : '') + '</div></button></div>';
    }), 'No topics yet.') +
    secHead('Meeting Notes', '<button class="link" data-a="edit-notes">' + (e.notes ? 'Edit' : 'Add Notes') + '</button>') +
    '<div class="card notes">' + (e.notes ? esc(e.notes) : '<span class="muted">Decisions, prayer needs and next steps.</span>') + '</div>';
}

/* ---------- vendors & contacts */
function wsVendors(e) {
  var vs = evRows('ed_event_vendors').map(function (a) { return { a: a, v: byId('ed_vendors', a.vendor_id) || { name: '(Removed)' } }; }).sort(function (x, y) { return x.v.name.localeCompare(y.v.name); });
  var cs = evRows('ed_event_contacts').map(function (a) { return { a: a, c: byId('ed_contacts', a.contact_id) || { name: '(Removed)' } }; }).sort(function (x, y) { return x.c.name.localeCompare(y.c.name); });
  var st = subTabs('vendors', [['vendors', 'Vendors', vs.length], ['contacts', 'Contacts', cs.length]], 'vendors');
  if (st.cur === 'contacts') return st.html + secHead('Contacts For This Event', addBtn('Add From Directory', 'pick', 'ed_contacts')) +
    listBox(cs.map(function (x) { return row({ act: 'edit-assign-c', id: x.a.id, lead: avatar(x.c.name), title: esc(x.c.name), sub: esc([x.a.role || x.c.role, x.c.organization].filter(Boolean).join(' · ')) + (x.c.phone ? '<br>' + esc(x.c.phone) : '') }); }), 'Landowner, permit office, fire inspector… add who you’ll need to reach.');
  var live = vs.filter(function (x) { return x.a.status !== 'Cancelled'; }), cost = live.reduce(function (s, x) { return s + num(x.a.cost); }, 0), paid = live.reduce(function (s, x) { return s + (x.a.pay_status === 'Paid In Full' ? num(x.a.cost) : num(x.a.paid)); }, 0);
  return st.html + '<div class="stats">' + stat('Total Cost', money(cost)) + stat('Paid', money(paid)) + stat('Still Owed', money(cost - paid), cost - paid > 0) + '</div>' +
    secHead('Vendors For This Event', addBtn('Add From Directory', 'pick', 'ed_vendors')) +
    listBox(vs.map(function (x) {
      var a = x.a, owed = a.pay_status === 'Paid In Full' ? 0 : Math.max(0, num(a.cost) - num(a.paid));
      return row({ act: 'edit-assign-v', id: a.id, lead: avatar(x.v.name), title: esc(x.v.name) + ' ' + pill(a.status, a.status === 'Booked' ? 'green' : a.status === 'Quoted' ? 'amber' : ''),
        sub: esc([a.service, a.arrival].filter(Boolean).join(' · ')) + (num(a.cost) ? '<br>' + money(a.cost) + (owed ? ' · ' + money(owed) + ' Owed' : '') + (a.payer ? ' · ' + esc(a.payer) + ' Pays' : '') + (a.due_on && owed ? ' · Due ' + fmtDay(a.due_on, { month: 'short', day: 'numeric' }) : '') : ''),
        right: num(a.cost) ? payPill(a.pay_status, a.due_on) : '' });
    }), 'Book vendors from the Directory: tent, sound, restrooms, food trucks.');
}

/* ---------- equipment */
function overlaps(a, b) { if (!a.starts_on || !b.starts_on) return false; return a.starts_on <= (b.ends_on || b.starts_on) && b.starts_on <= (a.ends_on || a.starts_on); }
function conflict(asg) {
  var g = byId('ed_equipment', asg.equipment_id), me = byId('ed_events', asg.event_id); if (!g || !me) return null;
  var others = T('ed_event_equipment').filter(function (x) { return x.equipment_id === g.id && x.event_id !== me.id; }).map(function (x) { return { x: x, e: byId('ed_events', x.event_id) }; }).filter(function (o) { return o.e && overlaps(o.e, me); });
  var total = num(asg.quantity) + others.reduce(function (s, o) { return s + num(o.x.quantity); }, 0);
  return total > num(g.quantity) ? { total: total, owned: num(g.quantity), events: others.map(function (o) { return o.e.title; }) } : null;
}
function wsEquipment(e) {
  var list = evRows('ed_event_equipment').map(function (a) { return { a: a, g: byId('ed_equipment', a.equipment_id) || { name: '(Removed)', quantity: 0 } }; })
    .sort(function (x, y) { return String(x.g.category).localeCompare(String(y.g.category)) || x.g.name.localeCompare(y.g.name); });
  var loaded = list.filter(function (x) { return x.a.loaded; }).length, ret = list.filter(function (x) { return x.a.returned; }).length;
  var pct = T('ed_equipment').length ? Math.round(100 * list.length / T('ed_equipment').length) : 0;
  return '<div class="stats">' + stat('Items', list.length + '<small> ' + pct + '% Of Inventory</small>') + stat('Loaded', loaded + ' / ' + list.length) + stat('Returned', ret + ' / ' + list.length, loaded && ret < list.length) + '</div>' +
    secHead('Equipment For This Event', addBtn('Add From Inventory', 'pick', 'ed_equipment')) +
    (list.length ? '<div class="list">' + list.map(function (x) {
      var c = conflict(x.a), g = x.g;
      return '<div class="row eqrow"><div class="main"><button class="t linklike" data-a="edit-assign-e" data-id="' + x.a.id + '">' + esc(g.name) + '</button><div class="s">' + esc([g.category, g.location].filter(Boolean).join(' · ')) + (g.condition && g.condition !== 'Good' ? ' · <span class="danger">' + esc(g.condition) + '</span>' : '') +
        (c ? '<br><span class="danger">' + IC.warn + ' Needs ' + c.total + ', ministry owns ' + c.owned + ' (also at ' + esc(c.events.join(', ')) + ')</span>' : '') + '</div>' +
        '<div class="eqchecks"><label class="cbx sm"><input type="checkbox" data-change="eq-flag" data-k="loaded" data-id="' + x.a.id + '"' + (x.a.loaded ? ' checked' : '') + '><span>Loaded</span></label><label class="cbx sm"><input type="checkbox" data-change="eq-flag" data-k="returned" data-id="' + x.a.id + '"' + (x.a.returned ? ' checked' : '') + '><span>Returned</span></label></div></div>' +
        '<div class="stepper"><button data-a="eq-qty" data-id="' + x.a.id + '" data-d="-1" aria-label="Fewer">−</button><b>' + num(x.a.quantity) + '</b><button data-a="eq-qty" data-id="' + x.a.id + '" data-d="1" aria-label="More">+</button><small>of ' + num(g.quantity) + '</small></div></div>';
    }).join('') + '</div>' : '<div class="empty card">Pick what this event needs from the ministry’s inventory.</div>');
}

/* ---------- food */
function wsFood(e) {
  var fv = evRows('ed_event_vendors').map(function (a) { return { a: a, v: byId('ed_vendors', a.vendor_id) || {} }; }).filter(function (x) { return /food|cater/i.test(x.v.category || ''); });
  return signupBlock('meal', 'Meal Sign-Ups', 'Add Meal') +
    (on('vendors') || fv.length ? secHead('Food Vendors', on('vendors') ? '<button class="link" data-a="ev-tab" data-id="vendors">Vendors</button>' : '') + listBox(fv.map(function (x) { return row({ act: 'edit-assign-v', id: x.a.id, title: esc(x.v.name), sub: esc([x.a.service, x.a.arrival].filter(Boolean).join(' · ')), right: pill(x.a.status, x.a.status === 'Booked' ? 'green' : 'amber') }); }), 'No food trucks or caterers booked.') : '');
}

/* ---------- tasks */
function taskRow(t) {
  var late = !t.done && t.due_on && t.due_on < TODAY;
  return '<div class="row">' + ck(t.done, 'toggle-task', t.id) + '<button class="main" data-a="edit-task" data-id="' + t.id + '"><div class="t' + (t.done ? ' done' : '') + '">' + esc(t.title) + '</div><div class="s">' +
    (t.due_on ? '<span class="' + (late ? 'danger' : '') + '">' + (late ? 'Overdue · ' : '') + esc(fmtDay(t.due_on) + (t.due_time ? ', ' + t.due_time : '')) + '</span>' : '') + esc(t.owner ? (t.due_on ? ' · ' : '') + t.owner : '') + '</div></button></div>';
}
function wsTasks(e) {
  var all = evRows('ed_tasks'), done = all.filter(function (t) { return t.done; }).length;
  return '<div class="stats">' + stat('Done', done + ' / ' + all.length) + stat('Overdue', all.filter(function (t) { return !t.done && t.due_on && t.due_on < TODAY; }).length, true) + '</div>' + meter(done, all.length) +
    '<div class="btnrow" style="margin-top:14px">' + addBtn('Add Task', 'add-task') + '</div>' +
    PHASES.map(function (p) {
      var list = all.filter(function (t) { return (t.phase || 'planning') === p[0]; }).sort(function (a, b) { return String(a.due_on || '9').localeCompare(String(b.due_on || '9')) || a.sort - b.sort; });
      if (!list.length) return '';
      return secHead(p[1], '', list.filter(function (t) { return t.done; }).length + ' Of ' + list.length + ' Done') + listBox(list.map(taskRow), '');
    }).join('') + (all.length ? '' : '<div class="empty card" style="margin-top:12px">No tasks yet.</div>');
}

/* ---------- money */
function payables(e) {
  var out = [];
  evRows('ed_event_vendors', e).filter(function (a) { return a.status !== 'Cancelled' && num(a.cost) > 0; }).forEach(function (a) { var v = byId('ed_vendors', a.vendor_id) || {}; out.push({ t: 'v', id: a.id, name: v.name, what: a.service || 'Vendor', amount: num(a.cost), owed: a.pay_status === 'Paid In Full' ? 0 : Math.max(0, num(a.cost) - num(a.paid)), status: a.pay_status, payer: a.payer, due: a.due_on }); });
  evRows('ed_event_people', e).filter(function (a) { return num(a.amount) > 0; }).forEach(function (a) { var p = byId('ed_people', a.person_id) || {}; out.push({ t: 'p', id: a.id, name: p.name, what: a.team === 'speaker' ? 'Honorarium' : 'Stipend', amount: num(a.amount), owed: a.pay_status === 'Paid In Full' ? 0 : num(a.amount), status: a.pay_status, payer: a.payer, due: a.due_on }); });
  evRows('ed_expenses', e).forEach(function (x) { out.push({ t: 'x', id: x.id, name: x.description, what: x.category || 'Expense', amount: num(x.amount), owed: x.pay_status === 'Paid In Full' ? 0 : num(x.amount), status: x.pay_status, payer: x.payer, due: x.due_on }); });
  return out;
}
function payRow(p) {
  var act = { v: 'edit-assign-v', p: 'edit-assign', x: 'edit-expense' }[p.t];
  return row({ act: act, id: p.id, title: esc(p.name), sub: esc([p.what, p.payer ? p.payer + ' Pays' : 'No One Assigned To Pay', p.due && p.owed ? 'Due ' + fmtDay(p.due, { month: 'short', day: 'numeric' }) : ''].filter(Boolean).join(' · ')),
    right: '<span class="amt">' + money(p.amount) + (p.owed && p.owed !== p.amount ? '<small>' + money(p.owed) + ' Owed</small>' : '') + payPill(p.status, p.due) + '</span>' });
}
function wsMoney(e) {
  var m = eventMoney(e), st = subTabs('money', [['summary', 'Summary'], ['payments', 'Payments'], ['offerings', 'Offerings', evRows('ed_offerings').length], ['expenses', 'Expenses', evRows('ed_expenses').length]], 'summary');
  var h = st.html;
  if (st.cur === 'summary') {
    var pays = payables(e), cats = {};
    pays.forEach(function (p) { var k = { v: 'Vendors', p: 'Speakers And Stipends', x: 'Expenses' }[p.t]; cats[k] = (cats[k] || 0) + p.amount; });
    return h + '<div class="stats">' + stat('Budget', m.budget ? money(m.budget) : '—') + stat('Committed', money(m.committed), m.budget && m.committed > m.budget) + stat('Paid', money(m.paid)) + stat('Still Owed', money(m.owed), m.owed > 0) + stat('Given', money(m.given)) + stat(m.given - m.committed >= 0 ? 'Over Costs' : 'Short Of Costs', money(Math.abs(m.given - m.committed)), m.given - m.committed < 0) + '</div>' +
      (m.budget ? '<div class="grouplbl">Budget Used</div>' + meter(m.committed, m.budget) : '<p class="small muted">Set a budget for this event in its details to track it here.</p>') +
      secHead('Where It Goes') + listBox(Object.keys(cats).map(function (k) { return row({ title: esc(k), right: '<span class="amt">' + money(cats[k]) + '</span>' }); }), 'No costs yet.') +
      (on('money') && e.giving_link ? '<p class="small muted">The public page shows a Give Online button that opens your giving link.</p>' : '');
  }
  if (st.cur === 'payments') {
    var p = payables(e).sort(function (a, b) { return (b.owed > 0) - (a.owed > 0) || String(a.due || '9').localeCompare(String(b.due || '9')); });
    return h + '<p class="lead">Everything this event owes, with who is responsible for paying it. Tap one to update its status.</p>' +
      secHead('Still Owed', '', money(p.reduce(function (s, x) { return s + x.owed; }, 0))) + listBox(p.filter(function (x) { return x.owed > 0; }).map(payRow), 'Everything is paid.') +
      secHead('Paid In Full') + listBox(p.filter(function (x) { return x.owed <= 0; }).map(payRow), 'Nothing paid yet.');
  }
  if (st.cur === 'offerings') {
    var off = evRows('ed_offerings').sort(function (a, b) { return String(a.on_date || '').localeCompare(String(b.on_date || '')); });
    var nd = off.filter(function (o) { return !o.deposited; }).length;
    return h + '<div class="stats">' + stat('Total Given', money(m.given), true) + stat('Not Deposited', nd, nd > 0) + '</div>' + secHead('Offerings', addBtn('Record Offering', 'add-offering')) +
      listBox(off.map(function (o) {
        var t = num(o.cash) + num(o.checks) + num(o.online) + num(o.other);
        return row({ act: 'edit-offering', id: o.id, title: esc(o.service || 'Offering') + (o.on_date ? ' <span class="muted small">' + esc(fmtDay(o.on_date)) + '</span>' : ''), sub: 'Cash ' + money(o.cash) + ' · Checks ' + money(o.checks) + ' · Online ' + money(o.online) + (o.counter1 ? '<br>Counted By ' + esc([o.counter1, o.counter2].filter(Boolean).join(' And ')) : ''),
          right: '<span class="amt">' + money(t) + '</span>' + pill(o.deposited ? 'Deposited' : 'Not Deposited', o.deposited ? 'green' : 'amber') });
      }), 'Record each service’s offering after two people count it.');
  }
  var ex = evRows('ed_expenses');
  return h + secHead('Expenses', addBtn('Add Expense', 'add-expense'), money(ex.reduce(function (s, x) { return s + num(x.amount); }, 0))) +
    listBox(ex.map(function (x) { return payRow({ t: 'x', id: x.id, name: x.description, what: x.category || 'Expense', amount: num(x.amount), owed: x.pay_status === 'Paid In Full' ? 0 : num(x.amount), status: x.pay_status, payer: x.payer, due: x.due_on }); }), 'Supplies, permits, water and ice. Vendor and speaker costs are tracked on their own tabs.');
}

/* ---------- follow-up */
function wsFollowup(e) {
  var all = evRows('ed_cards').sort(function (a, b) { return String(b.created_at).localeCompare(String(a.created_at)); });
  var c = function (s) { return all.filter(function (x) { return x.status === s; }).length; };
  var st = subTabs('followup', [['new', 'New', c('new')], ['contacted', 'Contacted', c('contacted')], ['connected', 'Connected', c('connected')], ['all', 'All', all.length]], 'new');
  var list = st.cur === 'all' ? all : all.filter(function (x) { return x.status === st.cur; });
  return shareBar('c') + st.html + '<div class="btnrow">' + addBtn('Add A Card', 'add-card') + '<button class="btn sm plain" data-a="csv-cards">Download List</button></div>' +
    listBox(list.map(function (x) {
      return row({ act: 'edit-card', id: x.id, lead: avatar(x.name), title: esc(x.name), sub: (x.responses || []).map(function (r) { return '<span class="tag">' + esc(r) + '</span>'; }).join(' ') + (x.prayer ? '<br>Prayer: ' + esc(x.prayer) : '') + '<br>' + (x.follow_up_by ? 'Follow-Up By ' + esc(x.follow_up_by) : '<span class="danger">No One Assigned</span>'),
        right: pill(x.status[0].toUpperCase() + x.status.slice(1), { new: 'red', contacted: 'amber', connected: 'green' }[x.status]) });
    }), st.cur === 'new' ? 'No new cards. You’re caught up.' : 'Nothing here.');
}

/* ---------- share */
function pubUrl(kind) { var base = location.href.split('#')[0].split('?')[0]; return base + (DB.mode === 'demo' && !window.ED_DEMO ? '?demo' : '') + '#/' + kind + '/' + S.ev.slug; }
function qrSvg(text) { try { var q = qrcode(0, 'M'); q.addData(text); q.make(); return q.createSvgTag({ cellSize: 4, margin: 0, scalable: true }); } catch (e) { return ''; } }
var SHARE = { v: ['Volunteer Sign-Up', 'People pick a spot to serve or a dish to bring.', 'Scan To Serve Or Bring Food'], r: ['Guest RSVP', 'Guests let you know they’re coming and how many.', 'Scan To RSVP'], c: ['Connection Card', 'Guests fill it out on their phone during the altar call or after service.', 'Scan To Fill Out A Connection Card'] };
function shareBar(k) {
  var url = pubUrl(k);
  return '<div class="sharebar"><button class="sb-qr" data-a="show-qr" data-id="' + k + '" aria-label="Show QR Code">' + qrSvg(url) + '</button><div class="main"><b>' + esc(SHARE[k][0]) + ' Link</b><span>' + (S.ev.is_open ? 'Anyone with the link or QR code. No account needed.' : 'Sign-ups are closed for this event.') + '</span></div>' +
    '<div class="sb-acts"><button class="btn sm plain" data-a="copy" data-v="' + esc(url) + '">Copy</button><button class="btn sm plain" data-a="show-qr" data-id="' + k + '">QR</button></div></div>';
}
function showQr(k) {
  var url = pubUrl(k);
  openSheet(function () {
    return '<h3>' + esc(SHARE[k][0]) + '</h3><p class="lead">' + esc(SHARE[k][1]) + ' Text the link, post it, or print the QR code for the tent and tables.</p><div class="qrbig-sheet">' + qrSvg(url) + '</div><div class="urlbox">' + esc(url) + '</div>' +
      '<div class="acts"><button class="btn plain" data-a="open-pub" data-id="' + k + '">Open Page</button><span class="grow"></span>' + (window.ED_DEMO ? '' : '<button class="btn plain" data-a="print-qr" data-id="' + k + '">Print Poster</button>') + '<button class="btn" data-a="copy" data-v="' + esc(url) + '">Copy Link</button></div>';
  });
}
function wsShare(e) {
  function box(title, sub, url, k) {
    return '<div class="card"><div class="qr"><div class="code">' + qrSvg(url) + '</div><div class="main"><b>' + esc(title) + '</b><p class="small muted">' + esc(sub) + '</p><div class="urlbox">' + esc(url) + '</div>' +
      '<div class="btnrow"><button class="link" data-a="copy" data-v="' + esc(url) + '">Copy Link</button><button class="link" data-a="open-pub" data-id="' + k + '">Open</button>' + (window.ED_DEMO ? '' : '<button class="link" data-a="print-qr" data-id="' + k + '">Print Poster</button>') + '</div></div></div></div>';
  }
  var any = on('people') || on('food'), out = '<p class="lead">Text these links, post them, or print the QR codes for the tent and tables. No one needs an account to use them.</p>';
  if (any) out += box('Volunteer And Meal Sign-Up', 'People pick a spot or a dish.', pubUrl('e'), 'e');
  if (on('followup')) out += box('Connection Card', 'Guests fill it out on their phone during the altar call or after service.', pubUrl('c'), 'c');
  if (!any && !on('followup')) out += '<div class="empty card">This event doesn’t use public sign-ups or connection cards.</div>';
  if (!e.is_open) out += '<div class="err">Public sign-ups are closed for this event. Open them again in the event details.</div>';
  return out;
}

/* ================================================================ pickers */
function pick(t, team) {
  var cfg = {
    ed_people: { title: 'Add ' + (TEAMS.find(function (x) { return x[0] === team; }) || [, 'People'])[1], list: T('ed_people').filter(function (p) { return p.status === 'current'; }), has: function (r) { return evRows('ed_event_people').some(function (a) { return a.person_id === r.id && a.team === team; }); }, sub: function (r) { return [r.title, (r.groups || []).join(', ')].filter(Boolean).join(' · '); }, newLabel: 'New Person' },
    ed_vendors: { title: 'Add Vendors', list: T('ed_vendors'), has: function (r) { return evRows('ed_event_vendors').some(function (a) { return a.vendor_id === r.id; }); }, sub: function (r) { return [r.category, r.contact_name].filter(Boolean).join(' · '); }, newLabel: 'New Vendor' },
    ed_contacts: { title: 'Add Contacts', list: T('ed_contacts'), has: function (r) { return evRows('ed_event_contacts').some(function (a) { return a.contact_id === r.id; }); }, sub: function (r) { return [r.role, r.organization].filter(Boolean).join(' · '); }, newLabel: 'New Contact' },
    ed_equipment: { title: 'Add Equipment', list: T('ed_equipment').filter(function (g) { return g.condition !== 'Retired'; }), has: function (r) { return evRows('ed_event_equipment').some(function (a) { return a.equipment_id === r.id; }); }, sub: function (r) { return [r.category, 'Own ' + num(r.quantity), r.condition !== 'Good' ? r.condition : ''].filter(Boolean).join(' · '); }, newLabel: 'New Item' }
  }[t];
  var groupHint = { leader: 'Team Member', team: 'Prayer Team', speaker: 'Speaker', worship: 'Worship', volunteer: 'Volunteer' }[team];
  var list = cfg.list.slice().sort(function (a, b) {
    var ga = t === 'ed_people' && (a.groups || []).indexOf(groupHint) >= 0 ? 0 : 1, gb = t === 'ed_people' && (b.groups || []).indexOf(groupHint) >= 0 ? 0 : 1;
    return ga - gb || a.name.localeCompare(b.name);
  });
  openSheet(function () {
    return '<h3>' + esc(cfg.title) + '</h3><p class="lead">From the Directory. ' + (t === 'ed_people' ? 'People in the ' + esc(groupHint) + ' group are listed first.' : '') + '</p>' +
      '<label class="search block">' + IC.search + '<input type="search" placeholder="Search" data-input="pick-q" aria-label="Search" autofocus></label>' +
      (t === 'ed_people' ? '<div class="fgrid"><div class="fld half"><label for="pk_role">Role At This Event</label><input class="inp" id="pk_role" list="pk_roles" placeholder="Optional"><datalist id="pk_roles">' + TITLES.map(function (x) { return '<option value="' + esc(x) + '">'; }).join('') + '</datalist></div></div>' : '') +
      '<div class="picklist">' + list.map(function (r) {
        var has = cfg.has(r);
        return '<label class="pickrow' + (has ? ' has' : '') + '" data-name="' + esc((r.name + ' ' + cfg.sub(r)).toLowerCase()) + '"><input type="checkbox" value="' + r.id + '"' + (has ? ' disabled checked' : '') + '>' + (t !== 'ed_equipment' ? avatar(r.name) : '') + '<span class="main"><span class="t">' + esc(r.name) + '</span><span class="s">' + esc(has ? 'Already Added' : cfg.sub(r)) + '</span></span></label>';
      }).join('') + (list.length ? '' : '<p class="muted small">The Directory has nothing here yet.</p>') + '</div>' +
      '<div class="acts"><button class="btn ghost" data-a="pick-new" data-t="' + t + '" data-id="' + esc(team || '') + '">' + IC.plus + ' ' + esc(cfg.newLabel) + '</button><span class="grow"></span><button class="btn plain" data-a="close">Cancel</button><button class="btn" data-save data-a="sheet-save">Add Selected</button></div>';
  }, function () {
    var root = $('#layer .sheet'), ids = $$('.picklist input:checked:not(:disabled)', root).map(function (x) { return x.value; });
    if (!ids.length) { sheetErr('Pick at least one.'); return; }
    var role = (root.querySelector('#pk_role') || {}).value || '';
    return busy(Promise.all(ids.map(function (id) { return DB.save(assignTable(t), assignRow(t, id, team, role)); })), 'Added To This Event').then(function (rows) {
      rows.forEach(function (r) { put(assignTable(t), r); }); closeSheet(); render();
    }).catch(function () {});
  });
}
function assignTable(t) { return { ed_people: 'ed_event_people', ed_vendors: 'ed_event_vendors', ed_contacts: 'ed_event_contacts', ed_equipment: 'ed_event_equipment' }[t]; }
function assignRow(t, id, team, role) {
  var e = S.ev.id;
  if (t === 'ed_people') { var p = byId('ed_people', id) || {}; return { event_id: e, person_id: id, team: team, role: role || (team === 'speaker' ? (p.title || 'Speaker') : p.title || ''), days: '', details: team === 'speaker' ? { status: 'Invited' } : {}, amount: 0, pay_status: 'Not Paid', payer: '', due_on: null, notes: '' }; }
  if (t === 'ed_vendors') return { event_id: e, vendor_id: id, service: '', status: 'Quoted', arrival: '', cost: 0, paid: 0, pay_status: 'Not Paid', payer: '', due_on: null, notes: '' };
  if (t === 'ed_contacts') { var c = byId('ed_contacts', id) || {}; return { event_id: e, contact_id: id, role: c.role || '', notes: '' }; }
  return { event_id: e, equipment_id: id, quantity: 1, loaded: false, returned: false, notes: '' };
}
function assignTop(dirTable, id) {
  return function () {
    var r = byId(dirTable, id) || {};
    return '<div class="sheethead">' + (dirTable !== 'ed_equipment' ? avatar(r.name) : '') + '<div><b>' + esc(r.name) + '</b><div class="small muted">' + esc(r.title || r.category || r.role || '') + '</div></div><button class="link" data-a="dir-edit" data-t="' + dirTable + '" data-id="' + id + '">Edit In Directory</button></div>' + actions(r);
  };
}
function editAssign(t, a) {
  var cfg = {
    ed_event_people: [F_ASSIGN.person(a.team), 'ed_people', a.person_id, 'Remove from this event?'],
    ed_event_vendors: [F_ASSIGN.vendor, 'ed_vendors', a.vendor_id, 'Remove this vendor from the event?'],
    ed_event_contacts: [F_ASSIGN.contact, 'ed_contacts', a.contact_id, 'Remove this contact from the event?'],
    ed_event_equipment: [F_ASSIGN.equipment, 'ed_equipment', a.equipment_id, 'Take this off the equipment list?']
  }[t];
  editRow(t, a, cfg[0], { title: 'At This Event', top: assignTop(cfg[1], cfg[2]), required: cfg[0][0].k, delMsg: cfg[3], prep: function (v) {
    if (t === 'ed_event_vendors' && v.pay_status === 'Paid In Full') v.paid = v.cost;
    if (t === 'ed_event_equipment') { v.quantity = Math.max(1, v.quantity || 1); }
    return v;
  } });
  // the team of a person can change; the required check uses the first field
}

/* ================================================================ public pages */
function loadPublic() {
  S.pubErr = '';
  return DB.rpc('ed_public', { p_slug: S.pubSlug }).then(function (p) {
    S.pub = p; if (!p) { S.pubErr = 'This event link isn’t working. Check with the person who sent it.'; render(); return; }
    var toks = []; try { toks = JSON.parse(lget('ed.tok.' + S.pubSlug) || '[]'); } catch (e) {}
    return (toks.length ? DB.rpc('ed_mine', { p_tokens: toks }) : Promise.resolve([])).then(function (m) { S.mine = m || []; lset('ed.tok.' + S.pubSlug, JSON.stringify(S.mine.map(function (x) { return x.token; }))); render(); });
  }).catch(function (e) { S.pubErr = errMsg(e); render(); });
}
function pubOn(k) { var s = (S.pub.event.sections || []); return !s.length || s.indexOf(k) >= 0; }
function pubHero(extra) {
  var e = S.pub.event;
  return '<div class="phero"><div class="in"><div class="eyebrow">' + esc(e.ministry || 'You’re Invited') + '</div><h1>' + esc(e.title) + '</h1><div class="meta">' +
    esc([fmtRange(e.starts_on, e.ends_on), e.time_label].filter(Boolean).join(' · ')) + (e.place || e.address ? '<br>' + esc([e.place, e.address].filter(Boolean).join(', ')) : '') + '</div>' + (extra || '') + '</div></div>';
}
function backLink() { return S.user || window.ED_DEMO ? '<p class="center"><a href="#" data-a="leave-pub" class="small">Back To Tent &amp; Table</a></p>' : ''; }
function viewPublic() {
  if (S.pubErr) return '<main class="auth"><div class="logo">' + IC.tent + '</div><h1>Not Found</h1><p class="lead">' + esc(S.pubErr) + '</p>' + backLink() + '</main>';
  if (!S.pub) return '<main class="auth"><p class="muted">Loading…</p></main>';
  var e = S.pub.event, its = S.pub.items.filter(function (i) { var md = S.pubMode; if (md === 'v' && i.kind === 'attend') return false; if (md === 'r' && i.kind !== 'attend') return false; return i.kind === 'attend' || pubOn(i.kind === 'meal' ? 'food' : 'people'); }), mineIds = S.mine.map(function (m) { return m.item_id; });
  function section(kind, title, lead) {
    var list = its.filter(function (i) { return i.kind === kind; }); if (!list.length) return '';
    var html = '', day = null;
    list.forEach(function (i) {
      if ((i.on_date || '') !== day) { day = i.on_date || ''; html += '<div class="grouplbl">' + esc(day ? fmtLong(day) : 'Any Day') + '</div>'; }
      var tk = i.taken != null ? i.taken : i.names.length, left = i.needed - tk, mine = mineIds.indexOf(i.id) >= 0, att = kind === 'attend';
      html += '<div class="slot' + (left <= 0 && !mine ? ' full' : '') + '"><div class="main"><div class="t">' + esc(i.title) + '</div><div class="s">' + esc([i.time_label, i.notes].filter(Boolean).join(' · ')) + (i.time_label || i.notes ? '<br>' : '') +
        (att ? (left > 0 ? (left <= 25 ? '<b class="red">' + plural(left, 'Seat') + ' Left</b>' : 'Seats available') : 'Full') : (left > 0 ? '<b class="red">' + plural(left, 'Spot') + ' Left</b>' : 'Full') + (i.names.length ? ' · ' + esc(i.names.join(', ')) : '')) + '</div></div>' +
        (mine ? pill(att ? 'You’re Coming' : 'You’re In', 'green') : left > 0 && e.is_open ? '<button class="btn sm" data-a="pub-sign" data-id="' + i.id + '">' + (att ? 'RSVP' : 'Sign Up') + '</button>' : '') + '</div>';
    });
    return secHead(title) + '<p class="lead small">' + esc(lead) + '</p>' + html;
  }
  var mine = S.mine.length ? '<div class="card mine"><b>You’re Signed Up For</b>' + S.mine.map(function (m) {
    var i = S.pub.items.find(function (x) { return x.id === m.item_id; }) || {};
    return '<div class="mine-row"><span>' + esc(i.title || 'A Spot') + (i.on_date ? ' <span class="muted small">' + esc(fmtDay(i.on_date)) + '</span>' : '') + '</span><button class="link" data-a="pub-unsign" data-id="' + esc(m.token) + '">Cancel</button></div>';
  }).join('') + '</div>' : '';
  return '<main class="pub">' + pubHero((e.about ? '<p class="about">' + esc(e.about) + '</p>' : '') + (e.contact_line ? '<p class="small muted">' + esc(e.contact_line) + '</p>' : '') +
      '<div class="btnrow">' + (e.giving_link && pubOn('money') ? '<a class="btn" href="' + esc(webUrl(e.giving_link)) + '" target="_blank" rel="noopener">Give Online</a>' : '') + (pubOn('followup') ? '<button class="btn ghost" data-a="pub-go" data-id="c">Connection Card</button>' : '') + (e.address ? '<a class="btn ghost" href="' + esc(mapUrl(e.address)) + '" target="_blank" rel="noopener">Directions</a>' : '') + '</div>') +
    mine + (e.is_open ? '' : '<div class="err">Sign-ups for this event are closed.</div>') +
    section('attend', 'Attend', 'Let us know you’re coming so we can save you a seat.') + section('serve', 'Serve', 'Pick a spot. The team will reach out with details.') + section('meal', 'Bring Food', 'Sign up to bring a meal or dish for the team.') +
    (!its.length ? '<div class="empty card">Nothing to sign up for yet. Check back soon.</div>' : '') + backLink() + '</main>';
}
function viewCard() {
  if (S.pubErr) return viewPublic();
  if (!S.pub) return '<main class="auth"><p class="muted">Loading…</p></main>';
  var e = S.pub.event;
  if (S.cardDone) return '<main class="pub">' + pubHero() + '<div class="card thanks"><span class="okmark">' + IC.check + '</span><h2>Thank You!</h2><p class="lead">Someone from our team will reach out soon. We’re glad you came.</p><button class="btn ghost sm" data-a="card-again">Fill Out Another Card</button></div>' + backLink() + '</main>';
  return '<main class="pub">' + pubHero('<p class="lead">We’re so glad you’re here. Fill this out and someone will follow up with you.</p>') +
    '<form data-form="card" class="fgrid">' +
    '<div class="fld"><label for="c_name">Your Name</label><input class="inp" id="c_name" name="name" autocomplete="name" required></div>' +
    '<div class="fld half"><label for="c_phone">Phone</label><input class="inp" id="c_phone" name="phone" type="tel" autocomplete="tel"></div>' +
    '<div class="fld half"><label for="c_email">Email</label><input class="inp" id="c_email" name="email" type="email" autocomplete="email"></div>' +
    '<fieldset class="fld"><legend>Today…</legend><div class="multi one">' + RESPONSES.map(function (r, i) { return '<label class="cbx"><input type="checkbox" id="c_r' + i + '" name="r" value="' + esc(r) + '"><span>' + esc(r) + '</span></label>'; }).join('') + '</div></fieldset>' +
    '<div class="fld"><label for="c_pr">How Can We Pray For You?</label><textarea class="inp" id="c_pr" name="prayer"></textarea></div>' +
    '<div class="fld"><button class="btn block" type="submit"' + (S.busy ? ' disabled' : '') + '>Send My Card</button></div></form>' +
    (S.cardErr ? '<div class="err">' + esc(S.cardErr) + '</div>' : '') +
    (pubOn('people') || pubOn('food') ? '<p><a href="#" data-a="pub-go" data-id="e" class="small">Want to serve or bring food? Sign up here.</a></p>' : '') + backLink() + '</main>';
}

/* ================================================================ event actions */
function editEvent(ev) {
  var base = ev ? Object.assign({}, ev, { sections: ev.sections && ev.sections.length ? ev.sections : SECTIONS.map(function (s) { return s[0]; }) }) : { is_open: true, sections: PRESETS.big.on.slice(), budget: 0, giving_link: org().giving_link || '' };
  editRow('ed_events', ev ? base : null, F.event, { title: ev ? 'Event Details' : 'New Event', base: ev ? null : base, del: false,
    prep: function (v) {
      if (v.ends_on && v.starts_on && v.ends_on < v.starts_on) return 'The last day can’t be before the first day.';
      if (!v.ends_on) v.ends_on = v.starts_on || null;
      if (v.sections.length === SECTIONS.length) v.sections = [];
      else if (!v.sections.length) return 'Pick at least one tab for this event.';
      if (!ev) { v.org_id = org().id; v.slug = slugFor(v.title); }
      return v;
    }, after: function (r) { if (!ev) openEvent(r.id); else S.ev = r; } });
}
function eventMenu() {
  var e = S.ev;
  openSheet('<h3>' + esc(e.title) + '</h3><div class="list menu">' +
    row({ act: 'edit-event', id: e.id, title: 'Edit Details And Tabs', sub: 'Name, dates, place, budget and which tabs this event uses' }) +
    row({ act: 'renew-event', id: e.id, title: 'Start Next Year', sub: 'For an annual event: new dates, tasks and checklists reset, sign-ups cleared' }) +
    row({ act: 'copy-event', id: e.id, title: 'Duplicate As A New Event', sub: 'Use this event as a template for another one' }) +
    (window.ED_DEMO ? '' : row({ act: 'popout', id: e.id, title: 'Open In A New Window', sub: 'Keep the ministry view open beside it' })) +
    row({ act: 'delete-event', id: e.id, title: '<span class="danger">Delete Event</span>' }) +
    '</div><div class="acts"><span class="grow"></span><button class="btn plain" data-a="close">Close</button></div>');
}
function renewEvent() {
  var e = S.ev, len = e.starts_on && e.ends_on ? dayDiff(e.ends_on, e.starts_on) : 0;
  var nextStart = e.starts_on ? addDays(e.starts_on, 364) : TODAY;
  var fields = [
    { k: 'start', label: 'New First Day', type: 'date', half: true, def: nextStart }, { k: 'end', label: 'New Last Day', type: 'date', half: true, def: addDays(nextStart, len) },
    { k: 'clear_signups', label: 'Clear volunteer and meal sign-ups', type: 'check', def: true },
    { k: 'clear_volunteers', label: 'Remove assigned volunteers', type: 'check', def: true },
    { k: 'clear_speakers', label: 'Remove speakers (you’ll book new ones)', type: 'check', def: false },
    { k: 'clear_money', label: 'Clear offerings and expenses', type: 'check', def: true },
    { k: 'clear_setlists', label: 'Clear set lists', type: 'check', def: true },
    { k: 'clear_cards', label: 'Clear connection cards (finish follow-up first)', type: 'check', def: false }];
  openSheet(function () {
    return '<h3>Start Next Year</h3><p class="lead">Keeps your plan: the schedule, tasks, team, vendors, contacts and equipment list. Moves every date to the new year and resets tasks, equipment checks and vendor payments.</p>' + formBody(fields, {}) + sheetFoot(false, 'Start Next Year');
  }, function () {
    var v = readForm(fields, {}); if (!v.start) { sheetErr('Pick the new first day.'); return; }
    if (v.end && v.end < v.start) { sheetErr('The last day can’t be before the first day.'); return; }
    var opts = {}; ['clear_signups', 'clear_volunteers', 'clear_speakers', 'clear_money', 'clear_setlists', 'clear_cards'].forEach(function (k) { opts[k] = !!v[k]; });
    return busy(DB.rpc('ed_renew_event', { p_event: e.id, p_start: v.start, p_end: v.end || null, p_opts: opts }), 'Ready for ' + v.start.slice(0, 4)).then(function () { closeSheet(); return loadAll(); }).then(function () { S.ev = byId('ed_events', e.id); S.evTab = 'overview'; render(); }).catch(function () {});
  });
}
function copyEvent() {
  var e = S.ev, fields = [{ k: 'title', label: 'New Event Name', auto: true, def: e.title + ' (Copy)' }, { k: 'start', label: 'First Day', type: 'date', def: e.starts_on || TODAY }];
  openSheet(function () { return '<h3>Duplicate As A New Event</h3><p class="lead">Copies the schedule, tasks, agenda, team, vendors, contacts, equipment list and sign-up spots. Sign-ups, money and connection cards are not copied.</p>' + formBody(fields, {}) + sheetFoot(false, 'Duplicate'); },
    function () {
      var v = readForm(fields, {}); if (!v.title) { sheetErr('Give the new event a name.'); return; }
      return busy(DB.rpc('ed_copy_event', { p_event: e.id, p_title: v.title, p_start: v.start || null }), 'Event created').then(function (id) { closeSheet(); return loadAll().then(function () { openEvent(id); }); }).catch(function () {});
    });
}

/* ================================================================ CSV + clipboard */
function csv(rows) { return rows.map(function (r) { return r.map(function (c) { c = String(c == null ? '' : c); return /[",\n]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c; }).join(','); }).join('\n'); }
function download(name, text) {
  if (window.ED_DEMO) { toast('Downloads work in the installed app'); return; }
  var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv' })); a.download = name; document.body.appendChild(a); a.click();
  setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
function copyText(text) { (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(function () { toast('Link copied'); }, function () { toast('Press and hold the link to copy it'); }); }

/* ================================================================ event wiring */
document.addEventListener('click', function (ev) {
  var t = ev.target.closest('[data-a]'); if (!t) return;
  var a = t.getAttribute('data-a'), id = t.getAttribute('data-id');
  if (a === 'scrim') { if (ev.target === t) closeSheet(); return; }
  var fn = A[a]; if (!fn) return;
  if (t.tagName === 'A' && (t.getAttribute('href') || '#') === '#') ev.preventDefault();
  if (t.tagName === 'BUTTON' || t.getAttribute('href') === '#') ev.preventDefault();
  fn(t, id);
});
document.addEventListener('input', function (ev) {
  var k = ev.target.getAttribute('data-input');
  if (k === 'dir-q') { S.dirQ = ev.target.value; var pos = ev.target.selectionStart; render(); var el = $('#dir_q'); if (el) { el.focus(); try { el.setSelectionRange(pos, pos); } catch (e) {} } }
  if (k === 'pick-q') { var q = ev.target.value.toLowerCase(); $$('#layer .pickrow').forEach(function (r) { r.hidden = q && r.getAttribute('data-name').indexOf(q) < 0; }); }
});
document.addEventListener('change', function (ev) {
  var t = ev.target, k = t.getAttribute('data-change'); if (!k) return;
  if (k === 'dir-group') { S.dirGroup = t.value; render(); }
  if (k === 'dir-status') { S.dirStatus = t.value; render(); }
  if (k === 'dir-cat') { S.dirCat = t.value; render(); }
  if (k === 'budget-year') { S.budgetYear = +t.value; render(); }
  if (k === 'notify-channel') { var me = myMember(), p = prefs(); p.channel = t.value; me.prefs = p; render(); DB.updateMe(org().id, { prefs: p }).catch(function (e) { toast(errMsg(e)); }); }
  if (k === 'dir-team') { S.sub.dirTeam = t.value; render(); }
  if (k === 'ci-day') { S.sub.ciDay = t.value; render(); }
  if (k === 'eq-flag') {
    var r = byId('ed_event_equipment', t.getAttribute('data-id')), f = t.getAttribute('data-k'), v = Object.assign({}, r); v[f] = t.checked;
    put('ed_event_equipment', v); render(); DB.save('ed_event_equipment', v).then(function (x) { put('ed_event_equipment', x); }, function (e) { put('ed_event_equipment', r); render(); toast(errMsg(e)); });
  }
});
function toggle(t, id, field, valFn) {
  var r = byId(t, id), v = Object.assign({}, r); v[field] = valFn ? valFn(r) : !r[field];
  put(t, v); render(); DB.save(t, v).then(function (x) { put(t, x); }, function (e) { put(t, r); render(); toast(errMsg(e)); });
}
var A = {
  close: closeSheet,
  'sheet-save': function () { if (S.sheet && S.sheet.save) { var p = S.sheet.save(); if (p && p.catch) p.catch(function () {}); } },
  'sheet-del': function () { if (S.sheet && S.sheet.del) S.sheet.del(); },
  nav: function (t) { S.tab = t.getAttribute('data-v'); render(); window.scrollTo(0, 0); },
  'auth-mode': function (t) { S.authMode = t.getAttribute('data-v'); S.authMsg = ''; render(); },
  'try-demo': function () { lset('ed.mode', 'demo'); location.reload(); },
  'leave-demo': function () { lset('ed.mode', null); location.href = location.pathname; },
  'reset-demo': function () { ask('Put the demo back to its starting data?', 'Reset Demo', function () { DB.reset(); S.ev = null; S.tab = 'home'; return loadAll().then(function () { render(); toast('Demo reset'); }); }); },
  signout: function () { DB.signOut().then(function () { if (DB.mode === 'demo') { lset('ed.mode', null); location.href = location.pathname; return; } S.user = null; S.acct = null; S.db = {}; S.ev = null; render(); }); },
  // directory
  'dir-tab': function (t) { S.dirTab = t.getAttribute('data-v'); S.dirQ = ''; S.dirCat = ''; render(); },
  'dir-open': function (t, id) { openDirRecord(t.getAttribute('data-t'), id); },
  'dir-add': function (t, id) { editDir(id, null); },
  'dir-edit': function (t, id) { var tb = t.getAttribute('data-t'); editDir(tb, byId(tb, id)); },
  // events
  'new-event': function () { editEvent(null); },
  'open-event': function (t, id) { closeSheet(); openEvent(id); },
  'close-event': function () { closeEvent(); },
  'ev-tab': function (t, id) { goArea(id || t.getAttribute('data-v')); render(); window.scrollTo(0, 0); if (S.evTab === 'dir' || S.evTab === 'guests') refreshEvent(); },
  'sub-tab': function (t) { S.sub[t.getAttribute('data-k')] = t.getAttribute('data-v'); render(); },
  'cal-day': function (t) { S.calDay = t.getAttribute('data-v'); render(); },
  'event-menu': eventMenu,
  'edit-event': function () { closeSheet(); editEvent(S.ev); },
  'renew-event': function () { closeSheet(); renewEvent(); },
  'copy-event': function () { closeSheet(); copyEvent(); },
  popout: function () { closeSheet(); window.open(location.pathname + location.search + '#/w/' + S.ev.id, '_blank', 'noopener'); },
  'delete-event': function () { var e = S.ev; ask('Delete “' + e.title + '” and everything in it?', 'Delete Event', function () { return remove('ed_events', e.id, 'Event deleted').then(closeEvent); }, 'This can’t be undone. The Directory is not affected.'); },
  preset: function (t) { var p = PRESETS[t.getAttribute('data-v')]; $$('#layer [name="sections"]').forEach(function (x) { x.checked = p.on.indexOf(x.value) >= 0; }); },
  // assignments
  'pick-people': function (t, id) { pick('ed_people', id); },
  pick: function (t, id) { pick(id); },
  'pick-new': function (t, team) {
    var tb = t.getAttribute('data-t');
    editDir(tb, null, function (r) { DB.save(assignTable(tb), assignRow(tb, r.id, team || null, '')).then(function (x) { put(assignTable(tb), x); render(); toast('Added to the Directory and this event'); }); });
  },
  'edit-assign': function (t, id) { editAssign('ed_event_people', byId('ed_event_people', id)); },
  'edit-assign-v': function (t, id) { editAssign('ed_event_vendors', byId('ed_event_vendors', id)); },
  'edit-assign-c': function (t, id) { editAssign('ed_event_contacts', byId('ed_event_contacts', id)); },
  'edit-assign-e': function (t, id) { editAssign('ed_event_equipment', byId('ed_event_equipment', id)); },
  'eq-qty': function (t, id) {
    var r = byId('ed_event_equipment', id), g = byId('ed_equipment', r.equipment_id) || {}, q = num(r.quantity) + num(t.getAttribute('data-d'));
    if (q < 1) { ask('Take ' + g.name + ' off the list?', 'Remove', function () { return remove('ed_event_equipment', id, 'Removed').then(render); }); return; }
    if (q > num(g.quantity)) { toast('The ministry owns ' + num(g.quantity)); return; }
    toggle('ed_event_equipment', id, 'quantity', function () { return q; });
  },
  // plan
  'add-sched': function () { editRow('ed_schedule', null, F.schedule, { title: 'Add To Schedule', base: { event_id: S.ev.id, on_date: S.calDay } , prep: function (v) { if (!v.on_date) return 'Pick a date.'; return v; }, after: function (r) { S.calDay = r.on_date; } }); },
  'edit-sched': function (t, id) { editRow('ed_schedule', byId('ed_schedule', id), F.schedule, { title: 'Edit Schedule Item', prep: function (v) { if (!v.on_date) return 'Pick a date.'; return v; } }); },
  'add-task': function () { editRow('ed_tasks', null, F.task, { title: 'Add Task', base: { event_id: S.ev.id, phase: 'planning', done: false, sort: evRows('ed_tasks').length } }); },
  'edit-task': function (t, id) { editRow('ed_tasks', byId('ed_tasks', id), F.task, { title: 'Edit Task' }); },
  'toggle-task': function (t, id) { toggle('ed_tasks', id, 'done'); },
  'add-agenda': function () { editRow('ed_agenda', null, F.agenda, { title: 'Add Topic', base: { event_id: S.ev.id, done: false, sort: evRows('ed_agenda').length } }); },
  'edit-agenda': function (t, id) { editRow('ed_agenda', byId('ed_agenda', id), F.agenda, { title: 'Edit Topic' }); },
  'toggle-agenda': function (t, id) { toggle('ed_agenda', id, 'done'); },
  'edit-notes': function () { var f = [{ k: 'notes', label: 'Notes, Decisions And Next Steps', type: 'textarea', auto: true }]; editRow('ed_events', S.ev, f, { title: 'Meeting Notes', del: false, required: 'notes', after: function (r) { S.ev = r; } }); },
  'add-setlist': function () { editRow('ed_setlists', null, F.setlist, { title: 'Add Set List', base: { event_id: S.ev.id, on_date: S.ev.starts_on } }); },
  'edit-setlist': function (t, id) { editRow('ed_setlists', byId('ed_setlists', id), F.setlist, { title: 'Edit Set List' }); },
  // sign-ups
  'add-item': function (t, kind) { editRow('ed_items', null, itemFields(kind), { title: kind === 'meal' ? 'Add Meal' : kind === 'attend' ? 'Add A Service' : 'Add Volunteer Spot', base: { event_id: S.ev.id, kind: kind, needed: kind === 'attend' ? 200 : 1, on_date: S.ev.starts_on, sort: evRows('ed_items').length }, prep: function (v) { v.needed = Math.max(1, Math.min(5000, v.needed || 1)); return v; } }); },
  'edit-item': function (t, id) { var it = byId('ed_items', id); editRow('ed_items', it, itemFields(it.kind), { title: it.kind === 'meal' ? 'Edit Meal' : it.kind === 'attend' ? 'Edit Service' : 'Edit Volunteer Spot', prep: function (v) { v.needed = Math.max(1, Math.min(5000, v.needed || 1)); return v; }, delMsg: 'Delete this spot?', delSub: signups(id).length ? 'The ' + plural(signups(id).length, 'person', 'people') + ' signed up will be removed too.' : '' }); },
  'add-signup': function (t, id) { var it = byId('ed_items', id); editRow('ed_signups', null, it.kind === 'attend' ? F.rsvp : F.signup, { title: it.kind === 'attend' ? 'Add An RSVP' : 'Add A Person', sub: it.title + (it.on_date ? ' · ' + fmtDay(it.on_date) : ''), base: { event_id: S.ev.id, item_id: id, checked_in_at: null, note: '', party: 1 }, prep: function (v) { v.party = Math.max(1, Math.min(50, v.party || 1)); return v; }, saveLabel: 'Add' }); },
  'del-signup': function (t, id) { var s = byId('ed_signups', id); ask('Remove ' + s.name + ' from this spot?', 'Remove', function () { return remove('ed_signups', id, 'Removed').then(render); }); },
  checkin: function (t, id) { toggle('ed_signups', id, 'checked_in_at', function (r) { return r.checked_in_at ? null : new Date().toISOString(); }); },
  'vols-to-dir': function () {
    var serve = evRows('ed_items').filter(function (i) { return i.kind === 'serve'; }).map(function (i) { return i.id; }), have = {}, adds = [];
    T('ed_people').forEach(function (p) { have[p.name.toLowerCase()] = 1; });
    evRows('ed_signups').filter(function (s) { return serve.indexOf(s.item_id) >= 0; }).forEach(function (s) { var k = s.name.toLowerCase(); if (have[k]) return; have[k] = 1; adds.push({ org_id: org().id, name: s.name, title: 'Volunteer', groups: ['Volunteer'], status: 'current', phone: s.phone, email: s.email, address: '', notes: 'Signed up for ' + S.ev.title }); });
    if (!adds.length) { toast('Everyone is already in the Directory'); return; }
    busy(Promise.all(adds.map(function (r) { return DB.save('ed_people', r); }))).then(function (rows) { rows.forEach(function (r) { put('ed_people', r); }); toast(plural(rows.length, 'volunteer') + ' added to the Directory'); render(); }).catch(function () {});
  },
  // money
  'add-offering': function () { editRow('ed_offerings', null, F.offering, { title: 'Record Offering', base: { event_id: S.ev.id, on_date: S.ev.starts_on && S.ev.starts_on <= TODAY ? TODAY : S.ev.starts_on, deposited: false } }); },
  'edit-offering': function (t, id) { editRow('ed_offerings', byId('ed_offerings', id), F.offering, { title: 'Edit Offering' }); },
  'add-expense': function () { editRow('ed_expenses', null, F.expense, { title: 'Add Expense', base: { event_id: S.ev.id, pay_status: 'Not Paid' } }); },
  'edit-expense': function (t, id) { editRow('ed_expenses', byId('ed_expenses', id), F.expense, { title: 'Edit Expense' }); },
  // follow-up
  'add-card': function () { editRow('ed_cards', null, F.card, { title: 'Add A Connection Card', base: { event_id: S.ev.id, status: 'new', responses: [] } }); },
  'edit-card': function (t, id) { var c = byId('ed_cards', id); editRow('ed_cards', c, F.card, { title: 'Connection Card', top: function () { return actions(c); }, delMsg: 'Delete this card?' }); },
  'csv-cards': function () { download(S.ev.slug + '-connection-cards.csv', csv([['Name', 'Phone', 'Email', 'Responses', 'Prayer Request', 'Status', 'Follow-Up By', 'Notes', 'Date']].concat(evRows('ed_cards').map(function (c) { return [c.name, c.phone, c.email, (c.responses || []).join('; '), c.prayer, c.status, c.follow_up_by, c.notes, String(c.created_at || '').slice(0, 10)]; })))); },
  'csv-signups': function (t, kind) {
    var rows = [['Date', 'Spot', 'Name', 'Phone', 'Email', 'Note', 'Checked In', 'Party']];
    evRows('ed_items').filter(function (i) { return i.kind === kind; }).forEach(function (i) { signups(i.id).forEach(function (s) { rows.push([i.on_date, i.title, s.name, s.phone, s.email, s.note, s.checked_in_at ? 'Yes' : '', s.party || 1]); }); });
    download(S.ev.slug + (kind === 'meal' ? '-food' : kind === 'attend' ? '-attending' : '-volunteers') + '.csv', csv(rows));
  },
  // share + public
  copy: function (t) { copyText(t.getAttribute('data-v')); },
  'open-pub': function (t, id) { closeSheet(); openPub(id, S.ev.slug); },
  'show-qr': function (t, id) { showQr(id); },
  'pub-go': function (t, id) { openPub(id, S.pubSlug); },
  'leave-pub': function () { if (/^#\/(e|c|v|r)\//.test(location.hash)) { try { history.pushState(null, '', location.pathname + location.search); } catch (e) {} } S.pubMode = ''; S.pub = null; S.cardDone = false; if (!S.user && !window.ED_DEMO) boot(); else if (S.pubFromEv && byId('ed_events', S.pubFromEv)) { var back = S.pubFromEv, tab = S.evTab, sub = S.sub; S.pubFromEv = null; openEvent(back); S.evTab = tab; S.sub = sub; render(); } else render(); },
  'print-qr': function (t, id) {
    var url = pubUrl(id), d = document.createElement('div'); d.className = 'printonly';
    d.innerHTML = '<h1>' + esc(S.ev.title) + '</h1><p>' + esc((SHARE[id] || SHARE.v)[2]) + '</p><div class="qrbig">' + qrSvg(url) + '</div><p class="url">' + esc(url) + '</p>';
    document.body.appendChild(d); window.print(); setTimeout(function () { d.remove(); }, 800);
  },
  'pub-sign': function (t, id) {
    var it = S.pub.items.find(function (x) { return x.id === id; });
    var f = it.kind === 'attend' ? F.rsvp : F.signup.map(function (x) { return x.k === 'note' ? Object.assign({}, x, { label: it.kind === 'meal' ? 'What Are You Bringing?' : 'Anything We Should Know?' }) : x; });
    openSheet(function () { return '<h3>' + (it.kind === 'attend' ? 'RSVP' : 'Sign Up') + '</h3><p class="lead">' + esc(it.title + (it.on_date ? ' · ' + fmtLong(it.on_date) : '') + (it.time_label ? ' · ' + it.time_label : '')) + '</p>' + formBody(f, {}) + '<p class="small muted">Add a phone or email so the team can reach you. ' + (it.kind === 'attend' ? 'Your name is not shown to others.' : 'Only your first name is shown to others.') + '</p>' + sheetFoot(false, 'Sign Me Up'); },
      function () {
        var v = readForm(f, {});
        return busy(DB.rpc('ed_sign', { p_slug: S.pubSlug, p_item: id, p_name: v.name, p_phone: v.phone, p_email: v.email, p_note: v.note, p_party: it.kind === 'attend' ? Math.max(1, Math.min(50, v.party || 1)) : 1 })).then(function (tok) {
          lset('ed.tok.' + S.pubSlug, JSON.stringify(S.mine.map(function (m) { return m.token; }).concat([tok]))); closeSheet(); toast(it.kind === 'attend' ? 'You’re on the list. See you there!' : 'You’re signed up. Thank you!'); return loadPublic();
        });
      });
  },
  'pub-unsign': function (t, tok) { ask('Cancel this sign-up?', 'Cancel Sign-Up', function () { return DB.rpc('ed_unsign', { p_token: tok }).then(function () { lset('ed.tok.' + S.pubSlug, JSON.stringify(S.mine.map(function (m) { return m.token; }).filter(function (x) { return x !== tok; }))); toast('Cancelled'); return loadPublic(); }, function (e) { toast(errMsg(e)); }); }); },
  'card-again': function () { S.cardDone = false; render(); },
  // account
  invite: function () { busy(DB.rpc('ed_create_invite', { oid: org().id })).then(function (code) { S.acct.invites.push({ code: code, org_id: org().id }); render(); copyText(inviteUrl(code)); }).catch(function () {}); },
  'cancel-invite': function (t, id) { DB.cancelInvite(id).then(function () { S.acct.invites = S.acct.invites.filter(function (i) { return i.code !== id; }); render(); }); },
  'remove-member': function (t, id) { var m = S.acct.members.find(function (x) { return x.user_id === id; }); ask('Remove ' + (m.name || m.email) + ' from the ministry?', 'Remove', function () { return busy(DB.rpc('ed_remove_member', { oid: org().id, uid: id }), 'Removed').then(function () { S.acct.members = S.acct.members.filter(function (x) { return x.user_id !== id; }); render(); }); }); },
  'leave-org': function () { ask('Leave ' + org().name + '?', 'Leave', function () { return busy(DB.rpc('ed_remove_member', { oid: org().id, uid: S.user.id })).then(function () { S.acct = null; S.db = {}; render(); }); }, 'You’ll lose access to its events and Directory.'); },
  'open-settings': function () { S.prevTab = S.tab; S.tab = 'settings'; render(); window.scrollTo(0, 0); },
  'close-settings': function () { S.tab = S.prevTab || 'home'; render(); window.scrollTo(0, 0); },
  'open-event-tab': function (t, id) { openEvent(id); goArea(t.getAttribute('data-v') || 'overview'); render(); },
  'edit-org': function () { var o = org(); editProfile(F_ORG, o, 'Ministry Profile', function (v) { var f = {}; F_ORG.forEach(function (x) { f[x.k] = v[x.k] || ''; }); return DB.updateOrg(o.id, f).then(function () { Object.assign(o, f); }); }); },
  'edit-me': function () { var me = myMember(); editProfile(F_ME, me, 'My Profile', function (v) { return DB.updateMe(org().id, { name: v.name, phone: v.phone || '' }).then(function () { me.name = v.name; me.phone = v.phone || ''; }); }); },
  'change-email': function () { var f = [{ k: 'email', label: 'New Login Email', type: 'email', auto: true, hint: 'We’ll send a confirmation link to the new address. Your login changes once you click it.' }]; editProfile(f, {}, 'Change Login Email', function (v) { return DB.changeEmail(v.email).then(function () { if (DB.mode === 'demo') { S.user.email = v.email; myMember().email = v.email; } else toast('Check ' + v.email + ' for a confirmation link'); }); }); },
  'change-pw': function () { var f = [{ k: 'pw', label: 'New Password', auto: true, hint: 'At least 8 characters.' }]; openSheet(function () { return '<h3>Change Password</h3><div class="fgrid"><div class="fld"><label for="f_pw">New Password</label><input class="inp" id="f_pw" name="pw" type="password" minlength="8" autocomplete="new-password" autofocus><span class="hint">At least 8 characters.</span></div></div>' + sheetFoot(false); }, function () { var v = $('#layer #f_pw').value; if (v.length < 8) { sheetErr('Use at least 8 characters.'); return; } return busy(DB.changePassword(v), 'Password changed').then(closeSheet).catch(function () {}); }); },
  notify: function (t, k) { var me = myMember(), p = prefs(); p[k] = !p[k]; me.prefs = p; render(); DB.updateMe(org().id, { prefs: p }).catch(function (e) { toast(errMsg(e)); }); },
};

document.addEventListener('submit', function (ev) {
  var f = ev.target, k = f.getAttribute('data-form'); if (!k) return; ev.preventDefault();
  var v = {}; new FormData(f).forEach(function (val, key) { if (key === 'r') (v.r = v.r || []).push(val); else v[key] = String(val).trim(); });
  if (k === 'auth') {
    S.authMsg = ''; S.busy = true; render();
    var p = S.authMode === 'reset' ? DB.resetPassword(v.email).then(function () { S.authMsg = 'Check your email for a reset link.'; S.authMode = 'in'; })
      : (S.authMode === 'up' ? DB.signUp(v.email, v.pw) : DB.signIn(v.email, v.pw)).then(function (u) { if (!u) { S.authMsg = 'Check your email to confirm your account, then sign in.'; S.authMode = 'in'; return; } S.user = u; S.loading = true; return loadAcct(); });
    p.catch(function (e) { S.authMsg = errMsg(e); }).then(function () { S.busy = false; render(); });
  } else if (k === 'create-org') {
    DB.rpc('ed_create_org', { p_name: v.name, p_display: v.me }).then(loadAcct).catch(function (e) { S.authMsg = errMsg(e); render(); });
  } else if (k === 'join') {
    if (!v.code) { S.authMsg = 'Paste the code from your invite link.'; render(); return; }
    DB.rpc('ed_accept_invite', { p_code: v.code.replace(/^.*join=/, ''), p_display: v.me }).then(function () { lset('ed.join', null); return loadAcct(); }).catch(function (e) { S.authMsg = errMsg(e); render(); });
  } else if (k === 'card') {
    S.cardErr = '';
    if (!v.phone && !v.email) { S.cardErr = 'Add a phone number or email so we can reach you.'; render(); return; }
    S.busy = true;
    DB.rpc('ed_connect', { p_slug: S.pubSlug, p_name: v.name, p_phone: v.phone, p_email: v.email, p_responses: v.r || [], p_prayer: v.prayer }).then(function () { S.busy = false; S.cardDone = true; render(); window.scrollTo(0, 0); }, function (e) { S.busy = false; S.cardErr = errMsg(e); render(); });
  }
});
document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && S.sheet) closeSheet(); });
document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible' && S.ev) refreshEvent(); });

(function start() {
  var DEMO = !!window.ED_DEMO || /[?&]demo\b/.test(location.search) || lget('ed.mode') === 'demo' || !window.supabase;
  DB = DEMO ? DemoDB() : CloudDB();
  if (DB.mode === 'cloud') DB.sb.auth.onAuthStateChange(function (evt) { if (evt === 'SIGNED_OUT') { S.user = null; S.acct = null; render(); } });
  boot();
  if ('serviceWorker' in navigator && location.protocol === 'https:' && !window.ED_DEMO) navigator.serviceWorker.register('sw.js').catch(function () {});
})();
