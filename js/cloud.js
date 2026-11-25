/* Tend shared household: sign-in, household, invites and live sync (Supabase).
   The app itself lives in index.html; this file adds the shared layer on top.
   Each task, contact and belonging is one row in "records". A phone keeps the
   last version it knows the server has (snap). Anything that differs is a
   local change and gets pushed; anything newer on the server gets pulled. */
var CLOUD_URL = 'https://mbzabezkhptjjbyzkxbw.supabase.co';
var CLOUD_KEY = 'sb_publishable_0uqPd7iYgo98ld-CaF5M6g_AV3VAlEI';

var C = {
  on: false, ready: false, sb: null, user: null, hid: null, house: '', role: '',
  members: [], invites: [], snap: {}, since: null, firstPull: false,
  pushing: false, pushAgain: false, pulling: false, pullAgain: false, pushT: 0, pullT: 0,
  online: true, lastSync: null, err: '', chan: null, joinCode: '', recovery: false, inflight: {}, authP: null, authUid: null,
  auth: { mode: 'in', email: '', msg: '', busy: false }, inviteLink: '', stale: false
};
var CLOUD_FACTORY = window.TEND_CLOUD_FACTORY || (window.supabase && CLOUD_URL && CLOUD_KEY ? function () {
  return window.supabase.createClient(CLOUD_URL, CLOUD_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
} : null);
C.on = !!CLOUD_FACTORY;

function cget(k) { try { return localStorage.getItem('tend.c.' + k); } catch (e) { return null; } }
function cset(k, v) { try { if (v == null) localStorage.removeItem('tend.c.' + k); else localStorage.setItem('tend.c.' + k, v); } catch (e) {} }
function stable(v) {
  if (v === null || typeof v !== 'object') return JSON.stringify(v === undefined ? null : v);
  if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
  return '{' + Object.keys(v).sort().filter(function (k) { return v[k] !== undefined; }).map(function (k) { return JSON.stringify(k) + ':' + stable(v[k]); }).join(',') + '}';
}
function cloudMsg(e) {
  var m = String((e && (e.message || e.error_description || e.msg)) || e || '');
  if (/invalid login credentials/i.test(m)) return 'That email and password don’t match.';
  if (/already registered|already been registered|user_already_exists/i.test(m)) return 'That email already has an account. Sign in instead.';
  if (/password should be|weak password|at least/i.test(m)) return 'Use a password with at least 8 characters.';
  if (/email not confirmed/i.test(m)) return 'Confirm your email first, then sign in.';
  if (/failed to fetch|network|load failed|fetch/i.test(m)) return 'Can’t reach Tend right now. Check your connection and try again.';
  if (/email rate limit|over_email_send_rate_limit/i.test(m)) return 'Tend can’t send more sign-up emails right now. Try again in an hour.';
  if (/address not authorized|email_address_not_authorized/i.test(m)) return 'Tend can’t send email to that address yet. Ask the person who invited you to check the email settings.';
  if (/too large|records_size|item limit/i.test(m)) return 'That’s too much to save in one item. Try shortening the notes.';
  if (/rate limit|too many/i.test(m)) return 'Too many tries. Wait a minute and try again.';
  return m.replace(/^.*?:\s*/, '') || 'Something went wrong. Try again.';
}

/* ---------- start-up ---------- */
function cloudInit() {
  var m = /[?&]join=([A-Za-z0-9]+)/.exec(location.search);
  if (m) { cset('join', m[1]); try { history.replaceState(null, '', location.pathname); } catch (e) {} }
  C.joinCode = cget('join') || '';
  if (C.joinCode) C.auth.mode = 'up';
  C.sb = CLOUD_FACTORY();
  var cached = null; try { cached = JSON.parse(cget('house') || 'null'); } catch (e) {}
  C.sb.auth.onAuthStateChange(function (ev, s) {
    if (ev === 'PASSWORD_RECOVERY') { C.recovery = true; }
    var u = (s && s.user) || null, changed = (u && u.id) !== (C.user && C.user.id);
    C.user = u;
    if (C.ready && changed) setTimeout(afterAuth, 0); else if (C.ready && ev === 'PASSWORD_RECOVERY') render();
  });
  C.sb.auth.getSession().then(function (r) {
    var s = r && r.data && r.data.session; C.user = s ? s.user : null;
    // Offline with an expired sign-in: the sign-in is still saved, it just can't be refreshed
    // until there's signal. Keep showing the household's list instead of the sign-in screen.
    if (!C.user && cached && hasSavedSignIn() && !navigator.onLine) { C.user = { id: cached.uid, email: cached.email || '' }; C.waitingForSignal = true; }
    if (C.user && cached && cached.uid === C.user.id) useHousehold(cached);
    C.ready = true; render(); if (!C.waitingForSignal) afterAuth();
  }, function () { C.ready = true; render(); });
  window.addEventListener('online', function () {
    if (C.waitingForSignal) { C.waitingForSignal = false; C.sb.auth.getSession().then(function (r) { var s = r && r.data && r.data.session; if (!s) { C.user = null; afterAuth(); } else { C.user = s.user; pull(); schedulePush(); } }); return; }
    pull(); schedulePush();
  });
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible' && C.hid) { pull(); schedulePush(); checkStillMember(); } });
  setInterval(function () { if (C.hid && document.visibilityState === 'visible') { pull(); if (pendingCount()) push(); } }, 60000);
}
function hasSavedSignIn() { try { for (var i = 0; i < localStorage.length; i++) if (/^sb-.+-auth-token$/.test(localStorage.key(i))) return true; } catch (e) {} return false; }
/* Runs once per sign-in, even though both the sign-in screen and the auth listener ask for it. */
function afterAuth() {
  if (!C.user) {
    // signed out (here, or the sign-in ran out): this phone stops getting that household's heads-up and keeps no copy of it
    var was = C.hid; if (!was) { try { was = (JSON.parse(cget('house') || 'null') || {}).hid; } catch (e) {} }
    if (was) { forgetHousehold(was); notifyForget().catch(function () {}); }
    C.authP = null; C.authUid = null; dropHousehold(); render(); return Promise.resolve();
  }
  if (C.authP && C.authUid === C.user.id) return C.authP;
  C.authUid = C.user.id; profileFromAccount();
  var p = C.authP = refreshHousehold().then(function () {
    if (!C.hid && C.joinCode) return joinWith(C.joinCode, true);
  }).catch(function (e) { setOnline(false, e); }).then(function () { render(); });
  return p;
}
/* A phone whose person was removed from the household stops showing (and keeps no copy of) its list. */
function checkStillMember() {
  if (!C.user || !C.hid || !C.online || checkStillMember.busy) return;
  checkStillMember.busy = true;
  var hid = C.hid;
  refreshHousehold().then(function () {
    checkStillMember.busy = false;
    if (hid && C.hid !== hid) { forgetHousehold(hid); ui.stack = []; ui.screen = 'home'; render(); toast('You’re no longer in that household.'); }
  }, function () { checkStillMember.busy = false; });
}
function forgetHousehold(hid) { try { localStorage.removeItem('tend.data.h.' + hid); } catch (e) {} cset('sync.' + hid, null); }
function refreshHousehold() {
  return C.sb.from('members').select('household_id, role, households(name)').eq('user_id', C.user.id).limit(1).then(function (r) {
    if (r.error) throw r.error;
    var row = r.data && r.data[0];
    if (!row) { if (C.hid) dropHousehold(); return; }
    useHousehold({ uid: C.user.id, email: C.user.email || '', hid: row.household_id, name: row.households ? row.households.name : 'Our Home', role: row.role });
    return loadMembers();
  });
}
function useHousehold(h) {
  var same = C.hid === h.hid;
  C.hid = h.hid; C.house = h.name || 'Our Home'; C.role = h.role || 'member';
  cset('house', JSON.stringify(h));
  if (same) return;
  KEY = 'tend.data.h.' + h.hid;
  var st = {}; try { st = JSON.parse(cget('sync.' + h.hid) || '{}'); } catch (e) {}
  C.snap = st.snap || {}; C.since = st.since || null; C.lastSync = st.lastSync || null; C.firstPull = !!db || !!C.since;
  load(); subscribe(); pull();
}
function dropHousehold() {
  if (C.chan) { try { C.sb.removeChannel(C.chan); } catch (e) {} C.chan = null; }
  C.hid = null; C.house = ''; C.role = ''; C.members = []; C.invites = []; C.snap = {}; C.since = null; C.firstPull = false;
  cset('house', null); KEY = 'tend.data.none'; db = null;
}
function loadMembers() {
  if (!C.hid) return Promise.resolve();
  var hid = C.hid; C.membersAt = Date.now();
  return C.sb.from('members').select('user_id, email, name, role, joined_at').eq('household_id', hid).order('joined_at').then(function (r) {
    if (r.error) throw r.error; if (hid !== C.hid) return;
    C.members = r.data || [];
    // each person is listed under their first and last name, kept in step with their profile
    var me = C.members.find(function (x) { return x.user_id === C.user.id; }), pn = fullName(getProfile());
    if (me && pn && me.name !== pn) { me.name = pn; C.sb.from('members').update({ name: pn }).eq('household_id', hid).eq('user_id', C.user.id).then(function () {}); }
    cset('people.' + hid, JSON.stringify(C.members.map(function (x) { return { id: x.user_id, name: x.name || '' }; })));
    // The shared list of first names (for "who" and birthdays) follows who is actually in the household,
    // so people who left drop off. Every phone reads the same table, so they all agree.
    var names = []; C.members.forEach(function (x) { var fn = firstWord(x.name); if (fn && names.indexOf(fn) < 0) names.push(fn); });
    if (db && names.length && stable(names) !== stable(db.members)) { db.members = names; save(); }
    if (db && adoptOwners()) save();
    if (C.role !== 'owner') return;
    return C.sb.from('invites').select('code, expires_at').eq('household_id', hid).order('created_at').then(function (q) {
      if (q.error) return; C.invites = q.data || [];
      if (C.inviteLink && !C.invites.some(function (v) { return C.inviteLink.indexOf(v.code) >= 0; })) C.inviteLink = '';
    });
  });
}

/* ---------- sync ---------- */
function recMap(d) {
  var m = {}; if (!d) return m;
  d.tasks.forEach(function (x) { m['task:' + x.id] = x; });
  d.contacts.forEach(function (x) { m['contact:' + x.id] = x; });
  d.items.forEach(function (x) { m['item:' + x.id] = x; });
  m['meta:settings'] = { members: d.members };
  m['meta:schedule'] = scheduleSnapshot(d);
  return m;
}
/* What the daily notification reads: each active task's next due date and when it opens.
   Dates don't depend on today, so every phone computes the same thing. */
function scheduleSnapshot(d) {
  var out = [];
  d.tasks.forEach(function (t) {
    if (!t.active) return;
    var due = nextDue(t); if (!due) return;
    out.push([t.id, t.name, iso(due), iso(addDays(due, -t.early)), t.snooze || null, t.owner && (personById(t.owner) || !isAccountId(t.owner)) ? ownerName(t) : '']); // the digest matches this against members.name; a person who left: everyone hears it
  });
  out.sort(function (a, b) { return a[2] < b[2] ? -1 : a[2] > b[2] ? 1 : a[0] < b[0] ? -1 : 1; });
  return { tasks: out };
}
function saveSync() { if (C.hid) cset('sync.' + C.hid, JSON.stringify({ snap: C.snap, since: C.since, lastSync: C.lastSync })); }
function pendingCount() {
  if (!C.hid || !db) return 0;
  var cur = recMap(db), n = 0;
  Object.keys(cur).forEach(function (k) { if (C.snap[k] !== stable(cur[k])) n++; });
  Object.keys(C.snap).forEach(function (k) { if (!(k in cur)) n++; });
  return n;
}
function setOnline(ok, e) {
  var was = C.online; C.online = ok; C.err = ok ? '' : cloudMsg(e);
  if (ok) { C.lastSync = new Date().toISOString(); saveSync(); }
  if (was !== ok && ui.screen === 'settings') refreshView();
}
function schedulePush() { if (!C.hid) return; clearTimeout(C.pushT); C.pushT = setTimeout(push, 600); }
function push() {
  if (!C.hid || !db) return Promise.resolve();
  if (C.pushing) { C.pushAgain = true; return Promise.resolve(); }
  var hid = C.hid, cur = recMap(db), rows = [], sent = {};
  Object.keys(cur).forEach(function (k) {
    var j = stable(cur[k]); if (C.snap[k] === j) return;
    var p = k.indexOf(':'); rows.push({ household_id: hid, kind: k.slice(0, p), id: k.slice(p + 1), data: cur[k], deleted: false }); sent[k] = j;
  });
  Object.keys(C.snap).forEach(function (k) {
    if (k in cur) return;
    var p = k.indexOf(':'); rows.push({ household_id: hid, kind: k.slice(0, p), id: k.slice(p + 1), data: {}, deleted: true }); sent[k] = null;
  });
  if (!rows.length) return Promise.resolve();
  C.pushing = true;
  // what the server was known to have when this push started; a pull that lands mid-push may move it
  var was = {}; Object.keys(sent).forEach(function (k) { was[k] = C.snap[k]; C.inflight[k] = sent[k]; });
  var chunks = []; for (var i = 0; i < rows.length; i += 400) chunks.push(rows.slice(i, i + 400));
  var chain = Promise.resolve();
  chunks.forEach(function (ch) {
    chain = chain.then(function () {
      return C.sb.from('records').upsert(ch).then(function (r) {
        if (r.error) throw r.error;
        if (hid !== C.hid) return;
        ch.forEach(function (row) {
          var k = row.kind + ':' + row.id; delete C.inflight[k];
          if (C.snap[k] !== was[k]) return; // a newer version arrived while this was on its way: keep that
          if (sent[k] === null) delete C.snap[k]; else C.snap[k] = sent[k];
        });
        saveSync();
      });
    });
  });
  return chain.then(function () { setOnline(true); }, function (e) { setOnline(false, e); if (isDenied(e)) checkStillMember(); })
    .then(function () { C.pushing = false; C.inflight = {}; if (C.pushAgain) { C.pushAgain = false; return push(); } });
}
function isDenied(e) { return /row-level security|permission denied|42501/i.test(String((e && (e.message || e.code)) || e || ''));
}
function pull() {
  if (!C.hid) return Promise.resolve();
  if (C.pulling) { C.pullAgain = true; return Promise.resolve(); }
  C.pulling = true;
  var hid = C.hid, rows = [];
  var since = C.since ? new Date(new Date(C.since).getTime() - 10000).toISOString() : null;
  // Pages walk forward by updated_at (not by position), so a row changed mid-pull can't be skipped.
  var seen = {};
  function page(cursor, from) {
    var q = C.sb.from('records').select('kind, id, data, deleted, updated_at').eq('household_id', hid);
    if (cursor) q = q.gte('updated_at', cursor);
    return q.order('updated_at', { ascending: true }).range(from, from + 999).then(function (r) {
      if (r.error) throw r.error;
      var got = r.data || [];
      got.forEach(function (x) { var k = x.kind + ':' + x.id; if (!seen[k] || seen[k].updated_at <= x.updated_at) seen[k] = x; }); // newest version of each wins
      if (got.length < 1000) return;
      var last = got[got.length - 1].updated_at;
      return last === cursor ? page(cursor, from + 1000) : page(last, 0);
    });
  }
  return page(since, 0).then(function () {
    if (hid !== C.hid) return;
    Object.keys(seen).forEach(function (k) { rows.push(seen[k]); });
    rows.sort(function (a, b) { return a.updated_at < b.updated_at ? -1 : a.updated_at > b.updated_at ? 1 : 0; });
    C.firstPull = true; C.pullErr = ''; applyRows(rows); setOnline(true);
  }).catch(function (e) {
    if (hid !== C.hid) return;
    setOnline(false, e); if (!db) { C.pullErr = cloudMsg(e); render(); } else refreshView();
  }).then(function () { C.pulling = false; if (C.pullAgain) { C.pullAgain = false; return pull(); } });
}
function mergeHistory(a, b) {
  var seen = {}, out = [];
  (a || []).concat(b || []).forEach(function (h) { var k = h.date + '|' + (h.by || ''); if (!seen[k]) { seen[k] = 1; out.push(h); } });
  return out.sort(function (x, y) { return x.date < y.date ? 1 : -1; });
}
function applyRows(rows) {
  if (!rows.length) { if (!db) refreshView(); return; }
  var base = db || blank(), cur = recMap(base), changed = {}, keepLocal = {}, any = false;
  rows.forEach(function (r) {
    if (!C.since || r.updated_at > C.since) C.since = r.updated_at;
    if (!r.deleted && (!r.data || typeof r.data !== 'object' || Array.isArray(r.data))) return; // a damaged record is skipped, never allowed to stop sync
    var k = r.kind + ':' + r.id, local = cur[k], localJ = local ? stable(local) : undefined;
    // a change only counts as ours-and-unsent if it isn't already on its way to the server
    var dirty = localJ !== C.snap[k] && !(local && C.inflight[k] === localJ);
    var remoteJ = r.deleted ? undefined : stable(r.data);
    if (remoteJ === C.snap[k]) return; // already have it
    any = true;
    if (r.deleted) { delete cur[k]; changed[k] = 1; return; }
    if (!local && C.snap[k] !== undefined) { keepLocal[k] = remoteJ; return; } // deleted here and not yet sent: the delete wins
    if (dirty && local) {
      keepLocal[k] = remoteJ;
      if (r.kind === 'task') { var m = JSON.parse(JSON.stringify(local)); m.history = mergeHistory(local.history, r.data.history); m.last = m.history[0] ? m.history[0].date : m.last; cur[k] = m; }
      return;
    }
    cur[k] = r.data; changed[k] = 1;
  });
  if (!any) { saveSync(); return; }
  var d = { app: 'tend', version: 1, user: base.user, lastBackup: base.lastBackup, noBday: base.noBday, nextId: base.nextId, members: base.members, tasks: [], contacts: [], items: [] };
  Object.keys(cur).forEach(function (k) {
    var p = k.indexOf(':'), kind = k.slice(0, p);
    if (kind === 'task') d.tasks.push(cur[k]); else if (kind === 'contact') d.contacts.push(cur[k]); else if (kind === 'item') d.items.push(cur[k]);
    else if (k === 'meta:settings') d.members = Array.isArray(cur[k].members) ? cur[k].members.slice() : d.members;
  });
  db = normalize(d);
  var after = recMap(db);
  Object.keys(changed).forEach(function (k) { if (k in after) C.snap[k] = stable(after[k]); else delete C.snap[k]; });
  Object.keys(keepLocal).forEach(function (k) { C.snap[k] = keepLocal[k]; });
  saveLocal(); saveSync();
  if (pendingCount()) schedulePush();
  refreshView();
  // someone joined, left or renamed: fetch the household's people again (for "Whose job")
  if (changed['meta:settings'] && C.user) loadMembers().then(function () { refreshView(); }, function () {});
}
function saveLocal() { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) {} }
function subscribe() {
  if (!C.sb.channel) return;
  if (C.chan) { try { C.sb.removeChannel(C.chan); } catch (e) {} }
  C.chan = C.sb.channel('household-' + C.hid)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'records', filter: 'household_id=eq.' + C.hid }, function () { clearTimeout(C.pullT); C.pullT = setTimeout(pull, 300); })
    .subscribe(function (status) { if (status === 'SUBSCRIBED') pull(); });
}
function refreshView() {
  var busy = ['edit-task', 'edit-contact', 'edit-item', 'profile', 'prefs', 'starter', 'starter-pick'].indexOf(ui.screen) >= 0 || ui.completing || ui.confirm || ui.viewer ||
    document.querySelector('.row.doing') || (document.activeElement && /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName));
  if (busy) { C.stale = true; return; }
  C.stale = false;
  if (ui.screen === 'task' && db && !db.tasks.some(function (t) { return t.id === ui.taskId; })) { ui.stack = []; go('home'); toast('That task was removed on another phone.'); return; }
  keepRender();
}

/* ---------- household actions ---------- */
function createHousehold() {
  var nm = (document.getElementById('houseName') || {}).value || '';
  C.auth.busy = true; C.err = ''; render();
  C.sb.rpc('create_household', { p_name: nm.trim() || 'Our Home', p_display: getProfile().first || '' }).then(function (r) {
    if (r.error) throw r.error; return refreshHousehold();
  }).then(function () { C.auth.busy = false; db = null; render(); }, function (e) { C.auth.busy = false; C.err = cloudMsg(e); render(); });
}
function joinWith(code, auto) {
  code = String(code || '').trim().replace(/^.*[?&]join=/, '');
  if (!code) { C.err = 'Paste the invite link or code.'; render(); return Promise.resolve(); }
  C.auth.busy = true; C.err = ''; if (!auto) render();
  return C.sb.rpc('accept_invite', { p_code: code, p_display: getProfile().first || '' }).then(function (r) {
    if (r.error) throw r.error; cset('join', null); C.joinCode = ''; return refreshHousehold();
  }).then(function () { C.auth.busy = false; render(); if (C.hid) toast('You’ve joined ' + C.house + '.'); }, function (e) {
    C.auth.busy = false; C.err = cloudMsg(e); cset('join', null); C.joinCode = ''; render();
  });
}
function makeInvite() {
  C.sb.rpc('create_invite', { hid: C.hid }).then(function (r) {
    if (r.error) throw r.error;
    C.inviteLink = location.origin + location.pathname + '?join=' + r.data;
    loadMembers().then(function () { keepRender(); });
    var text = 'Join our household on Tend so we share one list of what needs doing. Open this link, create an account, and you’re in:';
    if (navigator.share) navigator.share({ title: 'Join our Tend household', text: text, url: C.inviteLink }).catch(function () {});
    keepRender();
  }).catch(function (e) { warn(cloudMsg(e)); });
}
function signOut() {
  var hid = C.hid;
  // stop this phone's daily heads-up first (needs to still be signed in to remove it)
  notifyForget().catch(function () {}).then(function () { return C.sb.auth.signOut(); }).catch(function () {}).then(function () {
    if (hid) forgetHousehold(hid);
    C.authP = null; C.authUid = null; dropHousehold(); C.user = null; ui.stack = []; ui.screen = 'home'; render();
  });
}

/* ---------- screens ---------- */
function cloudScreen() {
  if (!C.ready) return '<div class="welcome" style="align-items:center;justify-content:center"><div class="waiting" role="status"><i class="spin"></i><p>Opening Tend…</p></div></div>';
  if (C.recovery && C.user) return scrNewPassword();
  if (!C.user) return scrSignIn();
  if (!C.hid) return scrHousehold();
  if (!db && !C.firstPull) return '<div class="welcome" style="align-items:center;justify-content:center">' + (C.pullErr
    ? '<p>' + esc(C.pullErr) + '</p><button class="btn primary" data-act="cloud-retry">Try Again</button>' : '<div class="waiting" role="status"><i class="spin"></i><p>Loading your household…</p></div>') + '</div>';
  return '';
}
function authErr() { return C.err ? '<p class="cerr" role="alert">' + esc(C.err) + '</p>' : ''; }
function scrSignIn() {
  var up = C.auth.mode === 'up';
  var h = '<div class="welcome"><img src="icon-192.png" alt=""><h1>' + (up ? 'Create Your Account' : 'Welcome to Tend') + '</h1>';
  h += C.joinCode ? '<p class="cnote"><strong>You’re invited to a household.</strong> ' + (up ? 'Create your account to join.' : 'Sign in, or create an account, to join.') + '</p>'
    : '<p>' + (up ? 'Everyone in your household uses their own email and password.' : 'Sign in to see your household’s list.') + '</p>';
  h += C.auth.msg ? '<p class="cnote">' + esc(C.auth.msg) + '</p>' : '';
  h += authErr();
  h += '<form id="authForm" class="stack" style="padding:0;gap:14px" novalidate>' +
    '<label class="field"><span>Email</span><input class="input" id="authEmail" type="email" inputmode="email" autocapitalize="off" autocomplete="username" value="' + esc(C.auth.email) + '" placeholder="name@example.com"></label>' +
    '<label class="field"><span>Password</span><input class="input" id="authPass" type="password" autocomplete="' + (up ? 'new-password' : 'current-password') + '" placeholder="' + (up ? 'At least 8 characters' : '') + '"></label>' +
    '<button type="submit" class="btn primary"' + (C.auth.busy ? ' disabled' : '') + '>' + (C.auth.busy ? '<i class="spin"></i>One moment…' : up ? 'Create Account' : 'Sign In') + '</button></form>';
  h += '<button class="btn secondary" data-act="auth-mode">' + (up ? 'I Already Have an Account' : 'New to Tend? Create an Account') + '</button>';
  if (!up) h += '<button class="link" data-act="auth-forgot" style="align-self:center">Forgot your password?</button>';
  return h + '</div>';
}
function scrNewPassword() {
  return '<div class="welcome"><img src="icon-192.png" alt=""><h1>Set a New Password</h1>' + authErr() +
    '<form id="newPassForm" class="stack" style="padding:0;gap:14px" novalidate><label class="field"><span>New Password</span><input class="input" id="newPass" type="password" autocomplete="new-password" placeholder="At least 8 characters"></label>' +
    '<button type="submit" class="btn primary">Save Password</button></form></div>';
}
function scrHousehold() {
  var last = getProfile().last;
  var h = '<div class="welcome"><img src="icon-192.png" alt=""><h1>Your Household</h1><p>Signed in as <strong>' + esc(C.user.email || '') + '</strong>.</p>' + authErr();
  h += '<div class="ccard"><h2>Start a New Household</h2><p>You’ll be the owner and can invite up to 7 others.</p>' +
    '<label class="field"><span>Household Name</span><input class="input" id="houseName" value="' + esc(last ? 'The ' + last + ' Home' : 'Our Home') + '"></label>' +
    '<button class="btn primary" data-act="house-create"' + (C.auth.busy ? ' disabled' : '') + '>Create Household</button></div>';
  h += '<div class="ccard"><h2>Join a Household</h2><p>Open the invite link you were sent, or paste it here.</p>' +
    '<label class="field"><span>Invite Link or Code</span><input class="input" id="joinCode" autocapitalize="off" autocomplete="off"></label>' +
    '<button class="btn secondary" data-act="house-join"' + (C.auth.busy ? ' disabled' : '') + '>Join</button></div>';
  h += '<button class="link" data-act="sign-out" style="align-self:center">Sign Out</button>';
  return h + '</div>';
}
function cloudSettings() {
  if (!C.on || !C.hid) return '';
  if (C.online && Date.now() - (C.membersAt || 0) > 10000) { C.membersAt = Date.now(); setTimeout(function () { loadMembers().then(function () { if (ui.screen === 'settings') keepRender(); }, function () {}); }, 0); }
  var me = C.user && C.user.id, owner = C.role === 'owner';
  var n = C.members.length;
  var h = '<div class="section"><h2 style="font-size:19px">Who Can See This List</h2><span style="font-size:13px;color:var(--muted);font-weight:600">' + n + (n === 1 ? ' person' : ' people') + '</span></div>' +
    '<p class="note" style="text-align:left;padding:0 20px 10px">Everyone in <strong>' + esc(C.house) + '</strong> sees and can change its tasks, contacts, belongings and photos. No one else can. Your profile and appearance settings stay on your phone.</p><div class="listcard">';
  h += C.members.map(function (m) {
    var you = m.user_id === me;
    return '<div class="lrow"><span class="col" style="min-width:0"><span class="t">' + esc(m.name || (m.email || '').split('@')[0]) + (you ? ' <span class="cyou">You</span>' : '') + '</span><span class="s" style="word-break:break-all">' + esc(m.email || '') + '</span><span class="s">' + (m.role === 'owner' ? 'Owner' : 'Member') + (m.joined_at ? ' · joined ' + esc(fmt(new Date(m.joined_at), true)) : '') + '</span></span>' +
      (owner && !you ? '<button class="link" data-act="member-rm" data-uid="' + esc(m.user_id) + '">Remove</button>' : '') + '</div>';
  }).join('');
  if (owner) h += C.invites.map(function (v) {
    return '<div class="lrow"><span class="col"><span class="t">Invite link, not used yet</span><span class="s">Anyone with this link can join until ' + esc(fmt(new Date(v.expires_at))) + '</span></span><button class="link" data-act="invite-cancel" data-code="' + esc(v.code) + '">Cancel</button></div>';
  }).join('');
  h += '</div>';
  if (owner) {
    h += '<div class="stack" style="margin-top:10px"><button class="btn primary" data-act="invite"' + (C.members.length >= 8 ? ' disabled' : '') + '>' + ic('plus', 18) + 'Invite Someone</button>';
    if (C.inviteLink) h += '<div class="ccard" style="margin:0"><p style="margin:0">Text this link to the person you’re inviting. It works once and expires in 14 days.</p><div class="clink">' + esc(C.inviteLink) + '</div><button class="btn secondary" data-act="invite-copy"><span>Copy</span></button></div>';
    h += '</div>';
  }
  var pend = pendingCount();
  h += '<p class="note" style="text-align:left;padding:8px 20px 0">' + (!C.online ? 'Offline. ' + (pend ? pend + (pend === 1 ? ' change' : ' changes') + ' will sync when you’re back online.' : 'Your list will update when you’re back online.')
    : pend ? 'Syncing ' + pend + (pend === 1 ? ' change' : ' changes') + '…' : 'Everything is synced' + (C.lastSync ? ' · ' + new Date(C.lastSync).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '') + '.') + '</p>';
  h += '<div class="stack" style="margin-top:6px">' +
    (!owner ? '<button class="btn secondary" data-act="house-leave">Leave Household</button>' : '') +
    '<button class="btn secondary" data-act="sign-out">Sign Out</button></div>';
  return h;
}

/* ---------- events (return true when handled) ---------- */
function cloudSubmit(id) {
  if (id === 'authForm') {
    var em = (document.getElementById('authEmail').value || '').trim(), pw = document.getElementById('authPass').value || '';
    C.auth.email = em; C.auth.msg = ''; C.err = '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { C.err = 'That email doesn’t look right.'; render(); return true; }
    if (pw.length < (C.auth.mode === 'up' ? 8 : 1)) { C.err = C.auth.mode === 'up' ? 'Use a password with at least 8 characters.' : 'Enter your password.'; render(); return true; }
    C.auth.busy = true; render();
    var p = C.auth.mode === 'up' ? C.sb.auth.signUp({ email: em, password: pw, options: { emailRedirectTo: location.origin + location.pathname + (C.joinCode ? '?join=' + C.joinCode : '') } }) : C.sb.auth.signInWithPassword({ email: em, password: pw });
    p.then(function (r) {
      C.auth.busy = false;
      if (r.error) throw r.error;
      if (C.auth.mode === 'up' && !(r.data && r.data.session)) { C.auth.mode = 'in'; C.auth.msg = 'Check your email to confirm your account, then sign in here.'; render(); return; }
      C.user = r.data.user; profileFromAccount(); render(); afterAuth();
    }).catch(function (e) { C.auth.busy = false; C.err = cloudMsg(e); render(); });
    return true;
  }
  if (id === 'newPassForm') {
    var np = document.getElementById('newPass').value || '';
    if (np.length < 8) { C.err = 'Use a password with at least 8 characters.'; render(); return true; }
    C.sb.auth.updateUser({ password: np }).then(function (r) { if (r.error) throw r.error; C.recovery = false; C.err = ''; render(); toast('Password saved.'); }).catch(function (e) { C.err = cloudMsg(e); render(); });
    return true;
  }
  return false;
}
function cloudAct(a, el) {
  switch (a) {
    case 'auth-mode': C.auth.mode = C.auth.mode === 'up' ? 'in' : 'up'; C.err = ''; C.auth.msg = ''; var ee = document.getElementById('authEmail'); if (ee) C.auth.email = ee.value.trim(); render(); return true;
    case 'auth-forgot':
      var fe = document.getElementById('authEmail'), em = fe ? fe.value.trim() : '';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { C.err = 'Type your email above first.'; render(); return true; }
      C.auth.email = em;
      C.sb.auth.resetPasswordForEmail(em, { redirectTo: location.origin + location.pathname }).then(function (r) { if (r.error) throw r.error; C.err = ''; C.auth.msg = 'If that email has an account, a reset link is on its way.'; render(); }).catch(function (e) { C.err = cloudMsg(e); render(); });
      return true;
    case 'cloud-retry': C.pullErr = ''; render(); pull(); return true;
    case 'house-create': createHousehold(); return true;
    case 'house-join': joinWith((document.getElementById('joinCode') || {}).value); return true;
    case 'invite': makeInvite(); return true;
    case 'invite-copy': copyText(C.inviteLink, el); return true;
    case 'invite-cancel':
      C.sb.from('invites').delete().eq('code', el.getAttribute('data-code')).then(function () { C.inviteLink = ''; return loadMembers(); }).then(function () { keepRender(); }, function (e) { warn(cloudMsg(e)); });
      return true;
    case 'member-rm':
      var uid = el.getAttribute('data-uid');
      ui.armed = null;
      C.sb.rpc('remove_member', { hid: C.hid, uid: uid }).then(function (r) { if (r.error) throw r.error; return loadMembers(); }).then(function () { keepRender(); toast('Removed from the household.'); }, function (e) { warn(cloudMsg(e)); });
      return true;
    case 'house-leave':
      ui.armed = null;
      C.sb.rpc('remove_member', { hid: C.hid, uid: C.user.id }).then(function (r) {
        if (r.error) throw r.error; var hid = C.hid; try { localStorage.removeItem('tend.data.h.' + hid); } catch (e) {} cset('sync.' + hid, null); dropHousehold(); ui.stack = []; ui.screen = 'home'; render();
      }).catch(function (e) { warn(cloudMsg(e)); });
      return true;
    case 'sign-out':
      ui.armed = null; signOut(); return true;
  }
  return false;
}
