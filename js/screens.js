'use strict';
/* Tend: Every screen and form: home, tasks, calendar, directory, settings, profile, belongings, bills. */
/* ---------- small pieces ---------- */
function initials(name) { var p = String(name).replace(/[^A-Za-z ]/g, ' ').split(' ').filter(Boolean); return ((p[0] || '?')[0] + (p[1] ? p[1][0] : '')).toUpperCase(); }
function backBtn() { return '<button class="backbtn" data-act="back">' + ic('back', 18, 2.2) + 'Back</button>'; }
function tickHint() {
  var seen = false; try { seen = localStorage.getItem('tend.swipeHint') === '1'; } catch (e) {}
  if (seen) return '';
  return '<div class="hint"><i class="tk"></i><span>Tap the circle or swipe right to mark a task done today. Swipe left to snooze it a week. Open a task to pick another date or add a note.</span><button data-act="hint-ok">Got It</button></div>';
}
function hideHint() { try { localStorage.setItem('tend.swipeHint', '1'); } catch (e) {} }
/* a "nothing here" moment: what it is, and what to do next */
function emptyBox(icon, title, sub) { return '<div class="empty"><span class="ei">' + ic(icon, 26) + '</span><b>' + title + '</b>' + (sub ? '<span>' + sub + '</span>' : '') + '</div>'; }
function showToast(msg, undo, err) {
  var el = document.getElementById('toast'); clearTimeout(showToast.t);
  el.className = ''; el.innerHTML = '<div class="flash' + (err ? ' err' : '') + '" role="' + (err ? 'alert' : 'status') + '">' + ic(err ? 'alert' : 'check', 20, 2.4) + '<span>' + esc(msg) + '</span>' + (undo ? '<button data-act="undo-toast">Undo</button>' : '') + '</div>';
  showToast.undo = undo || null;
  showToast.t = setTimeout(hideToast, 6000);
}
function hideToast() {
  var el = document.getElementById('toast'); clearTimeout(showToast.t); showToast.undo = null;
  if (!el.innerHTML) return; el.className = 'out'; setTimeout(function () { if (el.className === 'out') { el.innerHTML = ''; el.className = ''; } }, 260);
}
/* "Whose job is it?": a task can belong to one person in the household, or to anyone ('') */
function people() { return C.on ? db.members.slice() : []; }
function assignable() { return people().length > 1; }
function isMine(t) { return !t.owner || t.owner === db.user; }
function ownerTag(t) { return t.owner && assignable() ? (t.owner === db.user ? 'You' : t.owner) : ''; }
function canTick(r) { return r.t.active && r.i.status !== 'done'; }
function tick(r) { return '<button class="tick" data-act="quick-done" data-id="' + esc(r.t.id) + '" aria-label="Mark ' + esc(r.t.name) + ' done today"><i>' + ic('check', 14, 3) + '</i></button>'; }
function billTag(t) { return t.amount ? money(t.amount) + (t.autopay ? ' autopay' : '') : ''; }
function taskRow(r, alt, mode) {
  var t = r.t, i = r.i, meta = (mode === 'contact' ? [t.who, i.short] : [t.cat, t.who]).concat([billTag(t), ownerTag(t)]).filter(Boolean).map(esc).join(' \u00b7 ');
  var inner = '<span class="col"><span class="name">' + esc(t.name) + '</span><span class="meta">' + meta + '</span></span>' +
    '<span class="st"><b style="color:' + i.color + '">' + i.text + '</b>' + (mode === 'contact' ? '' : '<span class="meta">' + esc(i.status === 'overdue' || i.status === 'due' || i.status === 'snoozed' ? i.short : (i.due ? fmt(i.due) : '')) + '</span>') + '</span>';
  if (!canTick(r)) return '<button class="row' + (alt ? ' alt' : '') + '" data-act="task" data-id="' + esc(t.id) + '">' + inner + '</button>';
  return swipeWrap(r, '<div class="row split' + (alt ? ' alt' : '') + '">' + tick(r) + '<button class="open" data-act="task" data-id="' + esc(t.id) + '">' + inner + '</button></div>');
}
/* rows you can swipe: right to complete, left to snooze a week (when it isn't overdue) */
function canSnoozeRow(r) { return r.i.due && r.i.status !== 'overdue' && r.i.status !== 'snoozed'; }
function swipeWrap(r, rowHtml) {
  return '<div class="swipe" data-id="' + esc(r.t.id) + '" data-snooze="' + (canSnoozeRow(r) ? '1' : '') + '"><div class="swbg" aria-hidden="true"><span class="swl">' + ic('check', 18, 2.6) + 'Done</span><span class="swr">Snooze 1 Week' + ic('snooze', 18) + '</span></div>' + rowHtml + '</div>';
}
function attnRow(r) {
  var t = r.t, i = r.i;
  return swipeWrap(r, '<div class="row split">' + tick(r) + '<button class="open" data-act="task" data-id="' + esc(t.id) + '"><span class="col"><span class="name ellip">' + esc(t.name) + '</span><span class="meta">' + [billTag(t) || t.cat, t.who, ownerTag(t), i.short].filter(Boolean).map(esc).join(' \u00b7 ') + '</span></span><b style="color:' + i.color + ';font-size:12.5px">' + i.text + '</b></button></div>');
}
function searchBox(id, val, ph, label) {
  return '<label class="search">' + ic('search', 18) + '<span class="sr">' + label + '</span><input id="' + id + '" type="search" inputmode="search" enterkeyhint="search" autocomplete="off" autocorrect="off" spellcheck="false" placeholder="' + ph + '" value="' + esc(val) + '">' +
    '<button class="clear" data-act="clear-' + id + '" aria-label="Clear search"' + (val ? '' : ' hidden') + '>' + ic('x', 16) + '</button></label>';
}

/* ---------- screens ---------- */
function scrHome() {
  var R = rows(), c = { overdue: 0, due: 0, upcoming: 0 };
  R.forEach(function (r) { if (c[r.i.status] != null) c[r.i.status]++; });
  var need = c.overdue + c.due, T = today();
  var attn = R.filter(function (r) { return r.i.status === 'overdue' || r.i.status === 'due'; });
  var h = '<header class="head round"><div class="headrow"><span class="eyebrow">' + DAYS[T.getDay()] + ', ' + MON[T.getMonth()] + ' ' + T.getDate() + '</span>' +
    '<button class="iconbtn" data-act="settings" aria-label="Settings and backup">' + ic('gear') + '</button></div>' +
    '<h1>Hi, ' + esc(db.user) + '</h1><span class="sub">' + (need ? need + (need === 1 ? ' thing needs' : ' things need') + ' attention' : 'Everything is on track') + '</span></header>';
  h += '<div class="stats">' + [['overdue', 'Overdue', 'var(--red)'], ['due', 'Due Now', 'var(--orange)'], ['upcoming', 'Upcoming', 'var(--green)']].map(function (s) {
    return '<button class="stat" data-act="list" data-filter="' + s[0] + '"><span class="n" style="color:' + s[2] + '">' + c[s[0]] + '</span><span class="l">' + s[1] + '</span></button>';
  }).join('') + '</div>';
    var nod = R.filter(function (r) { return r.i.status === 'nodate'; }).length;
  if (nod) h += '<button class="tip" data-act="list" data-filter="nodate" style="display:flex;gap:12px;align-items:center;width:calc(100% - 32px);text-align:left"><span style="flex:1 1 auto">' + nod + (nod === 1 ? ' task needs' : ' tasks need') + ' a date before Tend can track ' + (nod === 1 ? 'it' : 'them') + '. Tap to review.</span><span style="color:var(--rose)">' + ic('next', 18) + '</span></button>';
  if (!db.tasks.length) h += '<button class="tip" data-act="starter" style="display:flex;gap:12px;align-items:center;width:calc(100% - 32px);text-align:left"><span style="flex:1 1 auto"><strong>Get Started:</strong> tell Tend what you tend to, and pick from tasks people often forget.</span><span style="color:var(--rose)">' + ic('next', 18) + '</span></button>';
  h += '<div class="section"><h2>Needs Attention</h2><button class="link" data-act="list" data-filter="due-all">See All</button></div>';
  if (attn.length) h += tickHint();
  h += '<div class="stack">';
  h += attn.length ? attn.slice(0, 6).map(attnRow).join('') : '<p class="note" style="text-align:left;padding:4px">All caught up. Nothing needs attention right now.</p>';
  if (attn.length > 6) h += '<button class="link" data-act="list" data-filter="due-all" style="align-self:flex-start">See ' + (attn.length - 6) + ' more</button>';
  h += '</div>';
  var up = R.filter(function (r) { return r.i.status === 'upcoming' && r.i.due && daysBetween(T, r.i.due) <= 30; }).sort(function (a, b) { return a.i.due - b.i.due; });
  if (up.length) h += '<div class="section"><h2>Coming Up</h2><span style="font-size:13px;color:var(--muted);font-weight:600">Next 30 days</span></div><div class="stack">' + up.slice(0, 5).map(function (r) { return taskRow(r, false); }).join('') +
    (up.length > 5 ? '<button class="link" data-act="list" data-filter="upcoming" style="align-self:flex-start">See ' + (up.length - 5) + ' more</button>' : '') + '</div>';
  h += recentlyDone();
  var bills = db.tasks.filter(function (t) { return t.amount && t.active; }).map(function (t) { return { t: t, s: billMonth(t, T.getFullYear(), T.getMonth()) }; }).filter(function (x) { return x.s; });
  if (bills.length) {
    var bp = 0, bt = 0, bl = 0; bills.forEach(function (x) { if (x.s.paid) bp += x.t.amount; else { bt += x.t.amount; if (x.s.late) bl++; } });
    h += '<div class="section"><h2>' + MONTHS[T.getMonth()] + ' Bills</h2><button class="link" data-act="list" data-filter="all" data-cat="Bills & Finance">See All</button></div>' +
      '<div class="card" style="margin:0 16px;padding:14px;display:flex;flex-direction:column;gap:10px"><div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px;font-size:14px">' +
      '<span><b style="font-size:17px">' + money(bp) + '</b> <span style="color:var(--muted)">paid</span></span><span><b style="font-size:17px">' + money(bt) + '</b> <span style="color:var(--muted)">to go</span></span></div>' +
      '<div class="bar" style="height:8px;border-radius:4px"><i style="height:8px;border-radius:4px;width:' + Math.round(bp / Math.max(1, bp + bt) * 100) + '%;background:var(--dot-green)"></i></div>' +
      '<span style="font-size:13px;color:' + (bl ? 'var(--red)' : 'var(--muted)') + '">' + bills.filter(function (x) { return x.s.paid; }).length + ' of ' + bills.length + ' paid' + (bl ? ' · ' + bl + ' overdue' : '') + '</span></div>';
  }
  var soon = db.items.map(function (b) { return { b: b, e: itemExpiry(b) }; }).filter(function (x) { return x.e && x.e.days <= 60 && x.e.days >= -30; }).sort(function (a, b) { return a.e.days - b.e.days; });
  if (soon.length) h += '<div class="section"><h2>Expiring Soon</h2></div><div class="stack">' + soon.map(function (x) { return itemRow(x.b, false); }).join('') + '</div>';
  var max = 1, cats = CATS.map(function (cn) {
    var mine = R.filter(function (r) { return r.t.cat === cn && r.t.active; });
    max = Math.max(max, mine.length);
    return { name: cn, n: mine.length, open: mine.filter(function (r) { return r.i.status === 'overdue' || r.i.status === 'due'; }).length };
  }).filter(function (x) { return x.n; });
  if (cats.length) {
    h += '<div class="section"><h2>By Category</h2></div><div class="cats">' + cats.map(function (x) {
      return '<button class="cat" data-act="list" data-filter="all" data-cat="' + esc(x.name) + '"><span style="font-weight:600">' + esc(x.name) + '</span><span class="bar"><i style="width:' + Math.round(x.n / max * 100) + '%"></i></span><span class="meta" style="font-size:12.5px;color:var(--muted)">' + x.n + (x.n === 1 ? ' task' : ' tasks') + (x.open ? ' \u00b7 ' + x.open + ' need attention' : ' \u00b7 all clear') + '</span></button>';
    }).join('') + '</div>';
  }
  return h + '<div class="pad-b"></div>';
}
/* the last few things anyone finished, newest first: "Sam · Replaced furnace filter · 2h ago" */
function agoText(e) {
  if (e.at) {
    var m = Math.max(0, Math.round((Date.now() - Date.parse(e.at)) / 60000));
    if (m < 1) return 'Just now'; if (m < 60) return m + 'm ago'; if (m < 60 * 24) return Math.round(m / 60) + 'h ago';
  }
  var d = daysBetween(parse(e.date), today());
  return d <= 0 ? 'Today' : d === 1 ? 'Yesterday' : d < 7 ? d + ' days ago' : fmt(parse(e.date));
}
function recentlyDone() {
  var cut = iso(addDays(today(), -7)), list = [];
  db.tasks.forEach(function (t) { t.history.forEach(function (e) { if (e.date >= cut) list.push({ t: t, e: e }); }); });
  if (!list.length) return '';
  list.sort(function (a, b) { var x = a.e.at || a.e.date, y = b.e.at || b.e.date; return x < y ? 1 : x > y ? -1 : 0; });
  return '<div class="section"><h2>Recently Done</h2><span style="font-size:13px;color:var(--muted);font-weight:600">Past week</span></div><div class="listcard">' + list.slice(0, 4).map(function (x) {
    var who = x.e.by ? (x.e.by === db.user ? 'You' : x.e.by) : '';
    return '<button class="lrow" data-act="task" data-id="' + esc(x.t.id) + '"><span class="donedot">' + ic('check', 12, 3) + '</span><span class="col" style="flex:1 1 auto;min-width:0"><span class="t ellip">' + esc(x.t.name) + '</span>' +
      '<span class="s">' + esc([who, agoText(x.e)].filter(Boolean).join(' \u00b7 ')) + '</span></span></button>';
  }).join('') + '</div>';
}
function kidAge(t, due) {
  var b = parse(t.first); if (!b || !due) return 'Well-child visit';
  var mo = Math.round((due - b) / 86400000 / 30.4375);
  if (mo < 1) return 'Newborn visit';
  if (mo < 24) return mo + '-month visit';
  if (mo < 36 && mo % 12) return mo + '-month visit';
  return Math.round(mo / 12) + '-year visit';
}
function filteredTasks() {
  var q = ui.q.trim().toLowerCase(), f = ui.filter;
  return rows().filter(function (r) {
    var s = r.i.status;
    if (f === 'all' && (s === 'paused' || s === 'done')) { /* still shown, at the end */ }
    if (f === 'due-all' && s !== 'overdue' && s !== 'due') return false;
    if (['overdue', 'due', 'upcoming', 'nodate', 'paused'].indexOf(f) >= 0 && s !== f) return false;
    if (ui.cat && r.t.cat !== ui.cat) return false;
    if (ui.mine && assignable() && !isMine(r.t)) return false;
    if (q && r.t.name.toLowerCase().indexOf(q) < 0 && (r.t.who || '').toLowerCase().indexOf(q) < 0 && !(r.t.item && (itemById(r.t.item) || { name: '' }).name.toLowerCase().indexOf(q) >= 0)) return false;
    return true;
  });
}
function taskResults() {
  var list = filteredTasks();
  if (!list.length) return ui.q.trim() ? emptyBox('search', 'No Matches', 'No tasks match \u201C' + esc(ui.q.trim()) + '\u201D.')
    : !db.tasks.length ? emptyBox('tasks', 'No Tasks Yet', 'Tap Add to create your first one.') : emptyBox('check', 'Nothing here. Nice work.', '');
  if (ui.filter !== 'all' && ui.filter !== 'due-all') return list.map(function (r, i) { return taskRow(r, i % 2 === 1); }).join('');
  var order = [['overdue', 'Overdue'], ['due', 'Due Now'], ['snoozed', 'Snoozed'], ['upcoming', 'Upcoming'], ['nodate', 'Needs a date'], ['paused', 'Paused'], ['done', 'Done']], out = '';
  order.forEach(function (g) {
    var part = list.filter(function (r) { return r.i.status === g[0]; });
    if (part.length) out += '<div class="grp">' + g[1] + ' \u00b7 ' + part.length + '</div>' + part.map(function (r, i) { return taskRow(r, i % 2 === 1); }).join('');
  });
  return out;
}
function titleRow(title, act, label) { return '<div class="titlerow"><h1>' + title + '</h1><button class="addbtn" data-act="' + act + '" aria-label="Add ' + label + '">' + ic('plus', 18, 2.6) + 'Add</button></div>'; }
function scrList() {
  var R = rows().filter(function (r) { return !ui.mine || !assignable() || isMine(r.t); }), counts = {}; R.forEach(function (r) { counts[r.i.status] = (counts[r.i.status] || 0) + 1; });
  var chips = [['all', 'All'], ['overdue', 'Overdue'], ['due', 'Due Now'], ['upcoming', 'Upcoming']];
  if (counts.nodate) chips.push(['nodate', 'Needs Date']);
  if (counts.paused) chips.push(['paused', 'Paused']);
  var f = ui.filter === 'due-all' ? 'all' : ui.filter;
  var need = (counts.overdue || 0) + (counts.due || 0);
  var h = '<header class="head" style="gap:12px"><span class="eyebrow">' + R.length + ' tasks' + (need ? ' \u00b7 ' + need + ' need attention' : ' \u00b7 all on track') + '</span>' + titleRow(ui.filter === 'due-all' ? 'Needs Attention' : 'Tasks', 'new-task', 'Task') +
    '<div class="toprow">' + searchBox('q', ui.q, 'Search tasks', 'Search tasks') +
    '<label class="selectwrap"><span class="sr">Category</span><select class="headselect" id="catSel"><option value="">All Categories</option>' + CATS.map(function (c) { return '<option' + (ui.cat === c ? ' selected' : '') + '>' + esc(c) + '</option>'; }).join('') + '</select>' + ic('down', 16) + '</label></div>' +
    '<div class="chips" role="group" aria-label="Filter by status">' + chips.map(function (c) { var n = c[0] === 'all' ? R.length : (counts[c[0]] || 0); return '<button class="chip" data-act="filter" data-filter="' + c[0] + '" aria-pressed="' + (f === c[0] && ui.filter !== 'due-all') + '">' + c[1] + '<span class="n">' + n + '</span></button>'; }).join('') +
    (assignable() ? '<button class="chip" data-act="mine" aria-pressed="' + !!ui.mine + '">Just Mine</button>' : '') + '</div></header>';
  return h + (db.tasks.length ? '<div style="padding-top:12px">' + tickHint() + '</div>' : '') + '<div class="stack" id="results" style="padding-top:8px;padding-bottom:96px">' + taskResults() + '</div>';
}
/* how this month is going: finished vs. still to do vs. overdue */
function monthDonut(R) {
  var y = ui.calY, m = ui.calM, done = {}, todo = 0, late = 0, T = today();
  db.tasks.forEach(function (t) { t.history.forEach(function (x) { var d = parse(x.date); if (d && d.getFullYear() === y && d.getMonth() === m) done[t.id] = 1; }); });
  R.forEach(function (r) { var d = r.i.due; if (!d || done[r.t.id] || d.getFullYear() !== y || d.getMonth() !== m) return; if (r.i.status === 'overdue') late++; else todo++; });
  var nd = Object.keys(done).length, total = nd + todo + late;
  var past = y < T.getFullYear() || (y === T.getFullYear() && m < T.getMonth());
  var C = 2 * Math.PI * 40, segs = [[nd, 'var(--dot-green)'], [late, 'var(--dot-red)'], [todo, 'var(--dusty)']], off = 0, arcs = '';
  if (total) segs.forEach(function (sg) { if (!sg[0]) return; var len = C * sg[0] / total; arcs += '<circle cx="50" cy="50" r="40" fill="none" stroke="' + sg[1] + '" stroke-width="14" stroke-dasharray="' + len + ' ' + (C - len) + '" stroke-dashoffset="' + (-off) + '" transform="rotate(-90 50 50)"/>'; off += len; });
  var pct = total ? Math.round(nd / total * 100) : 0;
  return '<div class="card" style="margin:14px 16px 0;padding:14px;display:flex;align-items:center;gap:16px">' +
    '<svg width="96" height="96" viewBox="0 0 100 100" role="img" aria-label="' + nd + ' of ' + total + ' done this month"><circle cx="50" cy="50" r="40" fill="none" stroke="var(--blush)" stroke-width="14"/>' + arcs +
    '<text x="50" y="50" text-anchor="middle" dominant-baseline="central" style="font:700 20px var(--serif);fill:var(--ink)">' + (total ? pct + '%' : '—') + '</text></svg>' +
    '<div class="col" style="gap:6px"><span style="font-weight:700;font-size:15px">' + MONTHS[m] + ' Progress</span>' +
    (total ? '<span class="meta" style="font-size:13px;color:var(--muted)">' + nd + ' of ' + total + ' done</span>' : '<span class="meta" style="font-size:13px;color:var(--muted)">Nothing due this month.</span>') +
    '<div class="legend" style="padding:0;gap:10px"><span><i style="background:var(--dot-green)"></i>Done ' + nd + '</span>' + (late ? '<span><i style="background:var(--dot-red)"></i>Overdue ' + late + '</span>' : '') + '<span><i style="background:var(--dusty)"></i>' + (past ? 'Missed ' : 'To do ') + todo + '</span></div></div></div>';
}
function scrCal() {
  var R = rows(), byDay = {}, T = today(), tIso = iso(T);
  R.forEach(function (r) { if (r.i.due) (byDay[iso(r.i.due)] = byDay[iso(r.i.due)] || []).push(r); });
  var first = new Date(ui.calY, ui.calM, 1), n = new Date(ui.calY, ui.calM + 1, 0).getDate(), cells = '', count = 0;
  for (var b = 0; b < first.getDay(); b++) cells += '<span aria-hidden="true"></span>';
  for (var d = 1; d <= n; d++) {
    var k = iso(new Date(ui.calY, ui.calM, d)), L = byDay[k] || [], worst = null;
    L.forEach(function (r) { if (!worst || STATUS[r.i.status].rank > STATUS[worst.i.status].rank) worst = r; });
    count += L.length;
    var cls = 'day' + (L.length ? ' has' : '') + (k === tIso ? ' today' : '') + (k === ui.calDay ? ' sel' : '');
    cells += '<button class="' + cls + '" data-act="day" data-day="' + k + '" aria-label="' + MONTHS[ui.calM] + ' ' + d + (L.length ? ', ' + L.length + (L.length === 1 ? ' deadline' : ' deadlines') : '') + '">' + d + '<i style="background:' + (worst ? worst.i.dot : 'transparent') + '"></i></button>';
  }
  var sel = parse(ui.calDay), items = byDay[ui.calDay] || [];
  var h = '<header class="head" style="gap:14px"><div class="headrow"><button class="iconbtn" data-act="month" data-step="-1" aria-label="Previous month">' + ic('back', 20, 2.2) + '</button>' +
    '<div style="display:flex;flex-direction:column;align-items:center;gap:2px"><h1 style="font-size:24px">' + MONTHS[ui.calM] + ' ' + ui.calY + '</h1><span class="sub" style="font-size:12.5px">' + count + (count === 1 ? ' deadline' : ' deadlines') + '</span></div>' +
    '<button class="iconbtn" data-act="month" data-step="1" aria-label="Next month">' + ic('next', 20, 2.2) + '</button></div>' +
    '<div class="dow"><span>SUN</span><span>MON</span><span>TUE</span><span>WED</span><span>THU</span><span>FRI</span><span>SAT</span></div></header>';
  h += '<div class="cal">' + cells + '</div>';
  h += '<div class="legend"><span><i style="background:var(--dot-red)"></i>Overdue</span><span><i style="background:var(--dot-orange)"></i>Due</span><span><i style="background:var(--dot-green)"></i>Upcoming</span><span><i style="background:var(--dot-grey)"></i>Snoozed</span>' +
    (ui.calY !== T.getFullYear() || ui.calM !== T.getMonth() ? '<button class="link" style="min-height:30px;margin-left:auto;font-size:12.5px;padding:0 12px" data-act="cal-today">Today</button>' : '') + '</div>';
  h += monthDonut(R);
  h += '<div class="section"><h2 style="font-size:19px">' + (sel ? DAYS[sel.getDay()] + ', ' + fmt(sel, false) : '') + '</h2></div><div class="stack">';
  h += items.length ? items.map(function (r) { return taskRow(r, false); }).join('') : '<p class="note" style="text-align:left;padding:4px">No deadlines this day. Tap a day with a dot.</p>';
  return h + '</div><div class="pad-b"></div>';
}
function contactMatches(c, q) {
  if (!q) return true;
  if ((c.name + ' ' + c.email + ' ' + c.role + ' ' + c.address + ' ' + c.login + ' ' + c.web).toLowerCase().indexOf(q) >= 0) return true;
  var dq = q.replace(/\D/g, '');
  return dq.length >= 3 && (c.phone + ' ' + c.text).replace(/[^\d ]/g, '').split(' ').some(function (n) { return n && n.indexOf(dq) >= 0; });
}
function contactResults() {
  var q = ui.cq.trim().toLowerCase();
  var list = db.contacts.slice().sort(function (a, b) { return a.name.localeCompare(b.name); }).filter(function (c) { return contactMatches(c, q); });
  if (!list.length) return q ? emptyBox('search', 'No Matches', 'No contacts match that search.') : emptyBox('people', 'No Contacts Yet', 'Tap Add to save the first person you call.');
  return list.map(function (c, i) {
    var n = db.tasks.filter(function (t) { return t.contact === c.id; }).length;
    return '<button class="row' + (i % 2 ? ' alt' : '') + '" data-act="contact" data-id="' + esc(c.id) + '"><span class="avatar">' + esc(initials(c.name)) + '</span><span class="col"><span class="name">' + esc(c.name) + '</span>' + (c.role ? '<span class="meta">' + esc(c.role) + '</span>' : '') + '</span><span style="font-size:12.5px;color:var(--rose);font-weight:600">' + (n ? n + (n === 1 ? ' task' : ' tasks') : '') + '</span></button>';
  }).join('');
}
function scrContacts() {
  var n = db.contacts.length;
  var h = '<header class="head" style="gap:12px"><span class="eyebrow">' + n + (n === 1 ? ' contact' : ' contacts') + '</span>' + titleRow('Contacts', 'new-contact', 'Contact') + dirSwitch('contacts') +
    searchBox('cq', ui.cq, 'Search contact', 'Search contacts') + '</header>';
  return h + '<div class="stack" id="results" style="padding-top:12px;padding-bottom:28px">' + contactResults() + '</div>';
}
function telHref(p) { var d = String(p).replace(/[^\d+]/g, ''); if (/^\d{10}$/.test(d)) d = '+1' + d; return d; }
function contactActions(c, soft) {
  var cls = soft ? 'act soft' : 'act', sz = soft ? 16 : 20, out = '';
  var tx = c.text || c.phone;
  if (c.phone) out += '<a class="' + cls + '" href="tel:' + esc(telHref(c.phone)) + '">' + ic('phone', sz) + 'Call</a>';
  if (tx) out += '<a class="' + cls + '" href="sms:' + esc(telHref(tx)) + '">' + ic('text', sz) + 'Text</a>';
  if (c.email) out += '<a class="' + cls + '" href="mailto:' + esc(c.email) + '">' + ic('mail', sz) + 'Email</a>';
  if (c.address) out += '<a class="' + cls + '" href="https://maps.apple.com/?q=' + encodeURIComponent(c.address) + '" target="_blank" rel="noopener">' + ic('pin', sz) + 'Map</a>';
  if (c.web) out += '<a class="' + cls + '" href="' + esc(webHref(c.web)) + '" target="_blank" rel="noopener">' + ic('web', sz) + 'Website</a>';
  return out;
}
function webHref(w) { return /^https?:\/\//i.test(w) ? w : 'https://' + w; }
function scrContact() {
  var c = db.contacts.find(function (x) { return x.id === ui.conId; });
  if (!c) { ui.screen = 'contacts'; return scrContacts(); }
  var h = '<header class="head" style="gap:12px">' + '<div class="headrow">' + backBtn() + '<button class="textbtn" data-act="edit-contact">Edit</button></div>' +
    '<div style="display:flex;align-items:center;gap:14px"><span class="avatar" style="width:56px;height:56px;flex-basis:56px;font-size:19px">' + esc(initials(c.name)) + '</span><span class="col"><h1 style="font-size:24px">' + esc(c.name) + '</h1>' + (c.role ? '<span class="sub">' + esc(c.role) + '</span>' : '') + '</span></div></header>';
    var acts = contactActions(c, false);
  if (acts) h += '<div class="actions">' + acts + '</div>';
  var f = [];
  if (c.phone) f.push(['Call', c.phone]); if (c.text && c.text !== c.phone) f.push(['Text', c.text]); if (c.email) f.push(['Email', c.email]); if (c.address) f.push(['Address', c.address]);
  if (c.web) f.push(['Website', c.web.replace(/^https?:\/\//, '')]); if (c.login) f.push(['Login', c.login]); if (c.notes) f.push(['Notes', c.notes]);
  if (f.length) h += '<div class="listcard"' + (acts ? '' : ' style="margin-top:16px"') + '>' + f.map(function (x) { return '<div class="lrow" style="flex-direction:column;align-items:flex-start;gap:3px"><span class="s">' + x[0] + '</span><span class="t" style="word-break:break-word;white-space:pre-wrap">' + esc(x[1]) + '</span></div>'; }).join('') + '</div>';
  var rb = db.items.filter(function (b) { return b.contacts.indexOf(c.id) >= 0; });
  if (rb.length || db.items.length) h += '<div class="section"><h2 style="font-size:19px">Related Belongings</h2><button class="link" data-act="edit-contact">' + (rb.length ? 'Edit' : '+ Add') + '</button></div><div class="stack">' +
    (rb.length ? rb.map(function (b, i) { return itemRow(b, i % 2 === 1); }).join('') : '<p class="note" style="text-align:left;padding:4px">No related belongings yet.</p>') + '</div>';
  var linked = rows().filter(function (r) { return r.t.contact === c.id; });
  h += '<div class="section"><h2 style="font-size:19px">Related Tasks</h2></div><div class="stack">' +
    (linked.length ? linked.map(function (r) { return taskRow(r, false, 'contact'); }).join('') : '<p class="note" style="text-align:left;padding:4px">No related tasks yet. Open a task, tap Edit, and pick this contact.</p>') + '</div>';
  return h + '<div class="pad-b"></div>';
}
function scheduleText(t) {
  if (t.holiday && HOLIDAYS[t.holiday]) return 'Every year on ' + HOLIDAYS[t.holiday][0] + '. The date moves each year and Tend works it out for you.';
  if (t.freq === 'Well-child (by age)') return 'By age: the next visit follows the pediatric schedule from the birth date (newborn, 2 weeks, 1, 2, 4, 6, 9, 12, 15, 18, 24, 30 months, then yearly).';
  if (t.freq === 'One-time') return 'One-time: once it\u2019s done, it\u2019s finished.';
  if (FREQ[t.freq].dy) return 'Repeats ' + t.freq.toLowerCase() + ' from the day you finish it.';
  return t.fixed ? 'Fixed calendar date: stays on the same date every cycle, so finishing early won\u2019t shift it.' : 'From last done: the next due date counts forward from the day you finish it.';
}
function scrTask() {
  var t = db.tasks.find(function (x) { return x.id === ui.taskId; });
  if (!t) { ui.screen = 'list'; return scrList(); }
  var i = info(t), con = t.contact ? db.contacts.find(function (c) { return c.id === t.contact; }) : null, kid = t.freq === 'Well-child (by age)';
  var h = '<header class="head" style="gap:10px;padding-bottom:24px"><div class="headrow">' + backBtn() + '<button class="textbtn" data-act="edit-task">Edit</button></div>' +
    '<span class="eyebrow">' + esc(t.cat) + (t.who ? ' \u00b7 ' + esc(t.who) : '') + (ownerTag(t) ? ' \u00b7 ' + (t.owner === db.user ? 'Your job' : esc(t.owner) + '\u2019s job') : '') + '</span><h1>' + esc(t.name) + '</h1><span class="pill" style="color:' + i.color + '">' + esc(i.long) + '</span></header>';
    h += '<div class="grid2">' +
    '<div class="tile"><span class="k">Next Due</span><span class="v">' + (i.due ? fmt(i.due, true) : '\u2014') + '</span></div>' +
    '<div class="tile"><span class="k">Can Start On</span><span class="v" style="color:var(--rose)">' + (i.start ? fmt(i.start, true) : '\u2014') + '</span></div>' +
    '<div class="tile"><span class="k">Last Completed</span><span class="v">' + (t.last ? fmt(parse(t.last), true) : 'Not yet') + '</span></div>' +
    '<div class="tile"><span class="k">' + (kid ? 'Schedule' : 'Repeats') + '</span><span class="v">' + esc(kid ? 'By age' : t.freq) + '</span></div></div>';
  h += '<div class="stack">';
  if (t.active && i.status !== 'done') {
    if (ui.completing === t.id) {
      h += '<div class="card" style="padding:14px;display:flex;flex-direction:column;gap:12px;border:2px solid var(--rose)"><label class="field"><span>Completed On</span><input class="input" type="date" id="doneDate" value="' + iso(today()) + '" max="' + iso(today()) + '"></label>' +
        '<label class="field"><span>Note</span><input class="input" id="doneNote" maxlength="140" placeholder="Optional, e.g. $65 at the shop, used 5W-30"></label>' +
        '<div class="btns2"><button class="btn secondary" data-act="complete-cancel">Cancel</button><button class="btn primary" style="min-height:48px;font-size:15px;border-radius:14px" data-act="complete-save">' + ic('check', 18, 2.4) + 'Save</button></div></div>';
    } else {
      h += '<button class="btn primary" data-act="complete-open">' + ic('check', 20, 2.4) + 'Mark Complete</button>';
      var canSnooze = i.due && i.status !== 'overdue', extra = [];
      if (canSnooze) extra.push('<button class="btn secondary" data-act="snooze">' + ic('snooze', 18) + (i.status === 'snoozed' ? 'Unsnooze' : 'Snooze 1 Week') + '</button>');
      if (i.due) extra.push('<button class="btn secondary" data-act="ics">' + ic('bell', 18) + 'Add to Calendar</button>');
      if (extra.length) h += extra.length === 2 ? '<div class="btns2">' + extra.join('') + '</div>' : extra[0];
    }
    h += '<span class="note">When you finish it, it\u2019s marked as done by ' + esc(db.user) + '.</span>';
  } else if (!t.active) {
    h += '<p class="note">This task is paused. Tap Edit to turn it back on.</p>';
  }
  h += '</div>';
  if (con) {
    h += '<div class="card" style="margin:8px 16px 0;padding:12px 14px;display:flex;flex-direction:column;gap:12px"><span style="font-size:12.5px;color:var(--muted)">Contact</span>' +
      '<button data-act="contact" data-id="' + esc(con.id) + '" style="display:flex;align-items:center;gap:12px;text-align:left;min-height:44px"><span class="avatar" style="width:40px;height:40px;flex-basis:40px;font-size:13px">' + esc(initials(con.name)) + '</span><span class="col"><span style="font-weight:600">' + esc(con.name) + '</span>' + (con.role ? '<span style="font-size:12.5px;color:var(--muted)">' + esc(con.role) + '</span>' : '') + '</span><span style="color:var(--muted)">' + ic('next', 18) + '</span></button>';
    var a = contactActions(con, true); if (a) h += '<div style="display:flex;gap:8px;flex-wrap:wrap">' + a + '</div>';
    h += '</div>';
  }
  if (t.amount) {
    h += '<div class="card" style="margin:8px 16px 0;padding:12px 14px;display:flex;align-items:center;gap:12px"><span class="col"><span style="font-size:12.5px;color:var(--muted)">Amount</span><span style="font-family:var(--serif);font-size:24px;font-weight:700">' + money(t.amount) + '</span></span>' +
      '<span class="pill" style="margin-left:auto;background:var(--blush);color:var(--rose)">' + (t.autopay ? 'Autopay' : 'Pay manually') + '</span></div>';
  }
  var bi = itemById(t.item);
  if (bi) {
    var kr = keyRows(bi);
    h += '<div class="card" style="margin:8px 16px 0;padding:12px 14px 2px;display:flex;flex-direction:column;gap:4px"><span style="font-size:12.5px;color:var(--muted)">Belonging</span>' +
      '<button data-act="item" data-id="' + esc(bi.id) + '" style="display:flex;align-items:center;gap:12px;text-align:left;min-height:44px"><span class="badge">' + ic(ITEM_TYPES[bi.type].icon, 20) + '</span><span class="col"><span style="font-weight:600">' + esc(bi.name) + '</span><span style="font-size:12.5px;color:var(--muted)">' + (kr ? 'Tap for all details' : 'No details yet. Tap to add them.') + '</span></span><span style="color:var(--muted)">' + ic('next', 18) + '</span></button>' +
      (kr ? '<div>' + kr + '</div>' : '<div style="height:10px"></div>') + '</div>';
  }
  h += stepsCard(t);
  h += photosCard('task', t);
  h += '<div class="section"><h2 style="font-size:19px">History</h2></div><div class="listcard">';
  h += t.history.length ? t.history.map(function (x, idx) {
    var armed = ui.armed === 'hist' + idx;
    return '<div class="lrow"><span class="col"><span class="t">' + fmt(parse(x.date), true) + '</span>' + (x.by ? '<span class="s">by ' + esc(x.by) + '</span>' : '') + (x.note ? '<span class="s" style="color:var(--ink)">' + esc(x.note) + '</span>' : '') + '</span>' +
      '<button class="link" style="color:' + (armed ? 'var(--red)' : 'var(--muted)') + ';font-size:13px" data-act="del-hist" data-idx="' + idx + '" aria-label="Remove this entry">' + (armed ? 'Tap to Remove' : ic('x', 16)) + '</button></div>';
  }).join('') : '<p class="note" style="text-align:left;margin:12px 0">No completions logged yet.</p>';
  h += '</div>';
  h += '<div class="card" style="margin:10px 16px 0;padding:14px;display:flex;flex-direction:column;gap:6px">' +
    (t.notes ? '<span style="font-size:12.5px;color:var(--muted)">Notes</span><span style="line-height:1.45;white-space:pre-wrap">' + esc(t.notes) + '</span>' : '') +
    '<span style="font-size:12.5px;color:var(--muted);line-height:1.4">' + esc(scheduleText(t)) + (t.early ? ' Opens ' + t.early + ' days before it\u2019s due.' : '') + '</span></div>';
  return h + '<div class="pad-b"></div>';
}

/* ---------- forms ---------- */
function groupedSelect(name, groups, cur, placeholder) {
  /* one plain alphabetical list; the group shows as a small caption under the field */
  var all = [], groupOf = {};
  groups.forEach(function (g) { g[1].forEach(function (v) { if (!groupOf[v]) { groupOf[v] = g[0]; all.push(v); } }); });
  all.sort(function (a, b) { return a.localeCompare(b); });
  var known = !cur || groupOf[cur] || cur === '__other';
  var out = '<select class="input" name="' + name + '" data-rerender="1"><option value=""' + (cur ? '' : ' selected') + '>' + esc(placeholder) + '</option>';
  if (!known) out += '<option value="' + esc(cur) + '" selected>' + esc(cur) + '</option>';
  out += all.map(function (v) { return opt(v, cur); }).join('');
  out += '<option value="__other"' + (cur === '__other' ? ' selected' : '') + '>Other (type it in)…</option></select>';
  if (cur && groupOf[cur]) out += '<small class="catcap">' + esc(groupOf[cur]) + '</small>';
  return out;
}
function whereGroups() {
  var groups = WHERE_GROUPS.map(function (g) { return [g[0], g[1].slice()]; });
  var all = []; groups.forEach(function (g) { all = all.concat(g[1]); });
  db.items.forEach(function (b) {
    var gi = b.type === 'Vehicle' ? 3 : b.type === 'Pet' ? 0 : -1;
    if (gi >= 0 && all.indexOf(b.name) < 0) { groups[gi][1].push(b.name); all.push(b.name); }
  });
  var kids = [], extra = [];
  db.tasks.forEach(function (t) {
    if (!t.who || all.indexOf(t.who) >= 0 || kids.indexOf(t.who) >= 0 || extra.indexOf(t.who) >= 0) return;
    var pair = t.who.split(' & '); if (pair.length === 2 && db.members.indexOf(pair[0]) >= 0 && db.members.indexOf(pair[1]) >= 0) { groups[0][1].push(t.who); all.push(t.who); return; }
    (t.freq === 'Well-child (by age)' ? kids : extra).push(t.who);
  });
  db.members.forEach(function (m) { if (groups[0][1].indexOf(m) < 0) groups[0][1].push(m); });
  groups[0][1] = groups[0][1].concat(kids.sort());
  if (extra.length) groups.push(['Your Other Places', extra.sort()]);
  return groups;
}
function opt(v, cur, label) { return '<option value="' + esc(v) + '"' + (v === cur ? ' selected' : '') + '>' + esc(label || v) + '</option>'; }
function scrEditTask() {
  var f = ui.form, isNew = !f.id, kid = f.freq === 'Well-child (by age)', simple = kid || f.freq === 'One-time' || (FREQ[f.freq] && FREQ[f.freq].dy);
  var h = '<header class="head"><div class="headrow"><button class="textbtn" data-act="cancel">Cancel</button><span style="font-weight:700">' + (isNew ? 'New Task' : 'Edit Task') + '</span><button class="textbtn" data-act="save-task">Save</button></div></header>';
    h += '<form class="form" id="taskForm" autocomplete="off" novalidate>' +
    '<label class="field"><span>Task</span><input class="input" name="name" value="' + esc(f.name) + '" placeholder="e.g. Replace furnace filter" required></label>' +
    '<div class="two"><label class="field"><span>Category</span><select class="input" name="cat" data-rerender="1">' + CATS.map(function (c) { return opt(c, f.cat); }).join('') + '</select></label>' +
    '<label class="field"><span>' + (kid ? 'Child' : 'Applies To') + '</span>' + groupedSelect('who', whereGroups(), f.who, 'Choose\u2026') + '</label></div>' +
    (assignable() ? '<label class="field"><span>Whose Job</span><select class="input" name="owner">' + opt('', f.owner || '', 'Anyone in the household') +
      people().map(function (p) { return opt(p, f.owner || '', p === db.user ? p + ' (you)' : p); }).join('') + '</select><small>Their daily heads-up includes it. Everyone still sees it.</small></label>' : '') +
    (f.who === '__other' ? '<label class="field"><span>Type the ' + (kid ? 'Child\u2019s Name' : 'Place or Person') + '</span><input class="input" name="whoOther" value="' + esc(f.whoOther || '') + '" placeholder="' + (kid ? 'Name' : 'e.g. Shed') + '"></label>' : '') +
    (f.cat === 'Celebrations' ? '<label class="field"><span>Holiday</span><select class="input" name="holiday" data-rerender="1"><option value="">None (use the date below)</option>' + Object.keys(HOLIDAYS).map(function (k) { return opt(k, f.holiday || '', HOLIDAYS[k][0]); }).join('') + '</select><small>For holidays that move each year. Tend finds the right date every year.</small></label>' : '') +
    (f.cat === 'Bills & Finance' ? '<div class="two"><label class="field"><span>Amount</span><input class="input" name="amount" inputmode="decimal" value="' + esc(f.amount == null ? '' : String(f.amount)) + '" placeholder="Optional"></label>' +
      '<label class="field"><span>Paid By</span><select class="input" name="autopay">' + opt('', f.autopay ? '1' : '', 'Me, manually') + opt('1', f.autopay ? '1' : '', 'Autopay') + '</select></label></div>' : '') +
    '<label class="field"><span>How Often</span><select class="input" name="freq" data-rerender="1">' + FREQS.map(function (x) { return opt(x[0], f.freq); }).join('') + '</select></label>' +
    (simple ? '' : '<label class="field"><span>Schedule</span><select class="input" name="fixed">' + opt('0', f.fixed ? '1' : '0', 'From last done') + opt('1', f.fixed ? '1' : '0', 'Fixed calendar date') + '</select><small>From last done counts from when you finish it. Fixed date stays on the calendar (like a plate renewal).</small></label>') +
    '<div class="two"><label class="field"><span>' + (kid ? 'Birth Date' : (f.freq === 'One-time' ? 'Due Date' : 'First Due Date')) + '</span><input class="input" type="date" name="first" value="' + esc(f.first || '') + '"></label>' +
    '<label class="field"><span>Last Completed</span><input class="input" type="date" name="last" value="' + esc(f.last || '') + '"></label></div>' +
    '<label class="field"><span>Can Start Early</span><select class="input" name="early">' + earlyOptions(f.early) + '</select><small>How long before the deadline it can be done. Choose \u201COn the due date only\u201D if there\u2019s no window.</small></label>' +
    '<label class="field"><span>Contact</span><select class="input" name="contact"><option value="">None</option>' + db.contacts.slice().sort(function (a, b) { return a.name.localeCompare(b.name); }).map(function (c) { return opt(c.id, f.contact || '', c.name); }).join('') + '</select></label>' +
    '<label class="field"><span>Belonging</span><select class="input" name="item" data-rerender="1">' + itemOptions(f.item) + '</select>' + itemCaption(f.item) + '</label>' +
    '<label class="field"><span>Notes</span><textarea class="input" name="notes" rows="3">' + esc(f.notes) + '</textarea></label>' +
    '<label class="field"><span>Steps</span><textarea class="input" name="stepsText" rows="4" placeholder="One step per line, e.g.\nAdd winterizing chlorine\nLower the water level\nPut on the cover">' + esc(f.stepsText || '') + '</textarea><small>A checklist you tick off each time. It clears when the task is marked done.</small></label>' +
    '<label class="field"><span>Instructions</span><textarea class="input" name="how" rows="5" maxlength="4000" placeholder="How to do it: parts, settings, where things are, links">' + esc(f.how || '') + '</textarea></label>' +
    '<div class="switchrow"><span class="col"><span style="font-weight:600">Active</span><span style="font-size:12.5px;color:var(--muted)">Turn off to pause it without deleting.</span></span><button type="button" class="switch" data-act="toggle-active" aria-pressed="' + (f.active ? 'true' : 'false') + '" aria-label="Active"><i></i></button></div>' +
    '<button type="submit" class="btn primary">Save</button>' +
    (isNew ? '' : '<button type="button" class="btn danger' + (ui.armed === 'del-task' ? ' armed' : '') + '" data-act="del-task">' + (ui.armed === 'del-task' ? 'Tap Again to Delete for Good' : 'Delete Task') + '</button>') +
    '</form>';
  return h;
}
function earlyOptions(cur) {
  var c = parseInt(cur, 10) || 0, list = EARLY.slice(); if (list.indexOf(c) < 0) { list.push(c); list.sort(function (a, b) { return a - b; }); }
  return list.map(function (d) {
    var l = d === 0 ? 'On the due date only' : d % 30 === 0 ? (d / 30) + (d === 30 ? ' month' : ' months') + ' before' : d % 7 === 0 ? (d / 7) + (d === 7 ? ' week' : ' weeks') + ' before' : d + ' days before';
    return '<option value="' + d + '"' + (d === c ? ' selected' : '') + '>' + l + '</option>';
  }).join('');
}
function scrEditContact() {
  var f = ui.form, isNew = !f.id;
  var h = '<header class="head"><div class="headrow"><button class="textbtn" data-act="cancel">Cancel</button><span style="font-weight:700">' + (isNew ? 'New Contact' : 'Edit Contact') + '</span><button class="textbtn" data-act="save-contact">Save</button></div></header>';
    h += '<form class="form" id="contactForm" autocomplete="off" novalidate>' +
    '<label class="field"><span>Name</span><input class="input" name="name" value="' + esc(f.name) + '" placeholder="Person or business" required></label>' +
    '<label class="field"><span>Used For</span>' + groupedSelect('role', USE_GROUPS, f.role, 'Choose what they help with\u2026') + '<small>This shows under their name in your contacts.</small></label>' +
    (f.role === '__other' ? '<label class="field"><span>Type What They Help With</span><input class="input" name="roleOther" value="' + esc(f.roleOther || '') + '" placeholder="e.g. Piano teacher"></label>' : '') +
    '<div class="two"><label class="field"><span>Call Phone</span><input class="input" type="tel" inputmode="tel" name="phone" value="' + esc(f.phone) + '" placeholder="(630) 555-0100"></label>' +
    '<label class="field"><span>Text Phone</span><input class="input" type="tel" inputmode="tel" name="text" value="' + esc(f.text) + '" placeholder="Same as call"></label></div>' +
    '<small style="margin-top:-8px;font-size:12px;color:var(--muted)">Leave Text phone blank to text the call number.</small>' +
    '<label class="field"><span>Email</span><input class="input" type="email" inputmode="email" autocapitalize="off" name="email" value="' + esc(f.email) + '" placeholder="name@example.com"></label>' +
    '<label class="field"><span>Street Address</span><input class="input" name="street" value="' + esc(f.street) + '" placeholder="123 Main St"></label>' +
    '<label class="field"><span>City</span><input class="input" name="city" value="' + esc(f.city) + '" placeholder="City"></label>' +
    '<div class="two"><label class="field"><span>State</span><select class="input" name="state"><option value="">\u2014</option>' + STATES.map(function (s) { return opt(s, f.state); }).join('') + '</select></label>' +
    '<label class="field"><span>ZIP</span><input class="input" inputmode="numeric" name="zip" maxlength="10" value="' + esc(f.zip) + '" placeholder="ZIP"></label></div>' +
    '<label class="field"><span>Website</span><input class="input" type="url" inputmode="url" autocapitalize="off" name="web" value="' + esc(f.web) + '" placeholder="www.example.com"></label>' +
    '<label class="field"><span>Login (Username or Account #)</span><input class="input" autocapitalize="off" autocorrect="off" spellcheck="false" name="login" value="' + esc(f.login) + '" placeholder="e.g. rowland.family"><small>For patient portals and online accounts. Keep passwords in your iPhone\u2019s Passwords app, not here.</small></label>' +
    relItemsField(f) +
    '<label class="field"><span>Notes</span><textarea class="input" name="notes" rows="3">' + esc(f.notes) + '</textarea></label>' +
    '<button type="submit" class="btn primary">Save</button>' +
    (isNew ? '' : '<button type="button" class="btn danger' + (ui.armed === 'del-contact' ? ' armed' : '') + '" data-act="del-contact">' + (ui.armed === 'del-contact' ? 'Tap Again to Delete for Good' : 'Delete Contact') + '</button>') +
    '</form>';
  return h;
}
function stepsCard(t) {
  var h = '';
  var steps = t.steps || [];
  if (steps.length) {
    var n = steps.filter(function (s) { return s.d; }).length;
    h += '<div class="section"><h2 style="font-size:19px">Steps</h2><span style="font-size:13px;color:var(--muted);font-weight:600">' + n + ' of ' + steps.length + ' done</span></div><div class="listcard" role="group" aria-label="Steps">' +
      steps.map(function (s, i) {
        return '<button type="button" class="lrow step' + (s.d ? ' on' : '') + '" role="checkbox" aria-checked="' + s.d + '" data-act="step" data-i="' + i + '"><span class="stepbox">' + (s.d ? ic('check', 13, 3) : '') + '</span><span class="t" style="flex:1 1 auto">' + esc(s.t) + '</span></button>';
      }).join('') + '</div>';
  }
  if (t.how) h += '<div class="section"><h2 style="font-size:19px">Instructions</h2></div><div class="card" style="margin:0 16px;padding:14px;line-height:1.5;white-space:pre-wrap;word-break:break-word">' + esc(t.how) + '</div>';
  return h;
}
function readForm(id) {
  var el = document.getElementById(id); if (!el) return;
  Array.prototype.forEach.call(el.elements, function (x) { if (x.name) ui.form[x.name] = x.value; });
  if (id === 'taskForm' && ui.form.fixed != null) ui.form.fixed = ui.form.fixed === true || ui.form.fixed === '1';
}


/* ---------- your profile (kept on this phone, separate from the task list) ---------- */
var PROFILE_KEY = 'tend.profile';
function getProfile() { try { var p = JSON.parse(localStorage.getItem(PROFILE_KEY) || 'null'); if (p && typeof p === 'object') return p; } catch (e) {} return {}; }
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
    db.tasks.push({ id: newId('t'), name: C.on ? p.first + '\u2019s birthday' : 'My birthday', cat: 'Celebrations', who: p.first, freq: 'Yearly', fixed: true, holiday: '', auto: 'birthday', first: iso(nb), last: null, early: 7,
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
  p.remindDays = +f.days; p.alertHour = +f.hour; p.cal = f.cal; p.prefsSet = true;
  try { localStorage.setItem(PROFILE_KEY, JSON.stringify(p)); } catch (e) { warn('Couldn’t save on this phone.'); return; }
  ui.form = null;
  if (setup) { ui.stack = []; go('home'); toast('Welcome, ' + (p.first || '') + '! You’re all set.'); } else { ui.stack = []; go('settings'); toast('Reminder settings saved.'); }
}
function scrProfile(setup) {
  var f = ui.form || getProfile();
  if (C.on && C.user && !f.email) { f = JSON.parse(JSON.stringify(f)); f.email = C.user.email; }
  var h = (setup ? stepHead(1, 'About You', 'Tend uses this to greet you, mark the tasks you finish, and remind you of your birthday. ' + (C.on ? 'Your household sees your first name. The rest stays on this phone.' : 'It stays on this phone.'))
    : '<header class="head" style="gap:10px"><div class="headrow"><button class="textbtn" data-act="cancel">Cancel</button><span style="font-weight:700">Your Profile</span><button class="textbtn" data-act="save-profile">Save</button></div></header>');
    h += '<form class="form" id="profileForm" autocomplete="on" novalidate>' +
    '<div class="two"><label class="field"><span>First Name</span><input class="input" name="first" autocomplete="given-name" value="' + esc(f.first || '') + '" required></label>' +
    '<label class="field"><span>Last Name</span><input class="input" name="last" autocomplete="family-name" value="' + esc(f.last || '') + '" required></label></div>' +
    '<label class="field"><span>Phone</span><input class="input" type="tel" inputmode="tel" autocomplete="tel" name="phone" value="' + esc(f.phone || '') + '" placeholder="(630) 555-0100" required></label>' +
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
  try { localStorage.setItem(PROFILE_KEY, JSON.stringify(f)); } catch (e) { warn('Couldn’t save on this phone.'); return; }
  ui.form = null; syncUser(); ensureBirthday(); save();
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
    }).join('') + '</div><p class="note" style="text-align:left;padding:8px 20px 0">Tasks you finish on this phone are marked with your first name.</p>';
  h += '<div class="section"><h2 style="font-size:19px">Backup</h2></div><div class="stack">' +
    '<div class="tip" style="margin:0">' + (C.on ? 'Your list is saved online and shared with your household. A backup file is still a good safety net. Save one' : 'Your list is saved on this phone only. Save a backup file') + ' to iCloud Drive or Files about once a month, and before you change phones. ' + (lb ? '<br><strong>Last backup:</strong> ' + fmt(lb, true) + '.' : '<br><strong>No backup yet.</strong>') + '</div>' +
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
  }).join('') + '</div><p class="note" style="text-align:left;padding:8px 20px 0">Automatic follows your phone\u2019s light or dark setting. Tend Blue is the standard look. These only change this phone.</p>';
  h += '<div class="section"><h2 style="font-size:19px">Suggested Tasks</h2></div><div class="stack"><button class="btn secondary" data-act="starter">' + ic('plus', 18) + 'What Do You Tend To? Add Suggestions</button><p class="note" style="text-align:left;padding:0 4px">Tasks already on your list are skipped.</p></div>';
  h += '<div class="section"><h2 style="font-size:19px">Your Data</h2></div><div class="stack">' +
    '<button class="btn danger' + (ui.armed === 'wipe' ? ' armed' : '') + '" data-act="wipe">' + (ui.armed === 'wipe' ? 'Tap Again to Erase Everything' : 'Erase All Data and Start Over') + '</button></div>';
  h += '<div class="section"><h2 style="font-size:19px">About</h2></div><div class="listcard"><div class="lrow"><span class="s">Tasks</span><span class="t">' + db.tasks.length + '</span></div><div class="lrow"><span class="s">Contacts</span><span class="t">' + db.contacts.length + '</span></div><div class="lrow"><span class="s">Belongings</span><span class="t">' + db.items.length + '</span></div><div class="lrow"><span class="s">Saved on Phone</span><span class="t" style="color:' + (storageOk ? 'var(--green)' : 'var(--red)') + '">' + (storageOk ? 'Yes' : 'Problem: back up now') + '</span></div></div>';
  if (!C.on) h += '<div class="section"><h2 style="font-size:19px">Testing</h2></div><p class="note" style="text-align:left;padding:0 20px 8px">For trying Tend out. Each of these replaces your whole list.</p><div class="stack">' +
    '<button class="btn secondary" data-act="mylist"' + (ui.armed === 'mylist' ? ' style="background:var(--fill);color:#fff"' : '') + '>' + (ui.armed === 'mylist' ? 'Tap Again: Replaces Your Current List' : 'Load Our Household List') + '</button>' +
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
    (oldTendCount() ? '<p class="cnote"><strong>Your list from the original Tend is on this phone</strong> (' + oldTendCount() + ' tasks). Bring it over to share it with your household.</p><button class="btn primary" data-act="bring-old">' + ic('upload', 18) + 'Bring Over My Tend List</button>'
      : '<p class="cnote"><strong>Moving from another phone?</strong> In Tend on that phone, open Settings and tap Save a Backup File. Then load that file here.</p>') +
    '<button class="btn ' + (oldTendCount() ? 'secondary' : 'primary') + '" data-act="start-starter">' + ic('plus', 18) + 'Pick from Suggested Tasks</button><button class="btn secondary" data-act="restore">' + ic('upload', 18) + 'Load a Tend Backup File</button><button class="btn secondary" data-act="mylist">Load Our Household List</button><button class="btn secondary" data-act="start-empty">Start with an Empty List</button><button class="btn secondary" data-act="example">Try It with Example Data</button></div>';
  return '<div class="welcome"><img src="icon-192.png" alt=""><h1>Welcome to Tend</h1><p>Your household\u2019s recurring tasks, kids\u2019 visits and the people you call for them, all in one place on this phone.</p>' +
    '<p>New here? Tell Tend what you tend to and pick from tasks people often forget. Or load your household list. You can change it any time in Settings.</p>' +
    '<button class="btn primary" data-act="start-starter">What Do You Tend To?</button><button class="btn secondary" data-act="mylist">Load Our Household List</button><button class="btn secondary" data-act="example">Try It with Example Data</button><button class="btn secondary" data-act="restore">' + ic('upload', 18) + 'Load My Tend File</button><button class="btn secondary" data-act="start-empty">Start with an Empty List</button>' +
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

/* ---------- belongings ---------- */
var ITEM_TYPES = {
  Vehicle: { icon: 'car', ph: 'e.g. 2017 Tahoe', key: ['plate', 'plateExp', 'vin', 'policy'], fields: [['year', 'Year', 'num'], ['make', 'Make'], ['model', 'Model'], ['color', 'Color'], ['vin', 'VIN', 'code'], ['plate', 'Plate Number', 'code'], ['plateExp', 'Plates Expire', 'date'], ['insurer', 'Insurance Company'], ['policy', 'Policy Number', 'code'], ['tires', 'Tire Size', 'code'], ['oil', 'Oil Type', 'code'], ['bought', 'Purchased', 'date']] },
  Home: { icon: 'home', ph: 'e.g. Home', key: ['furnaceFilter', 'fridgeFilter', 'shutoff', 'policy'], fields: [['address', 'Address'], ['built', 'Year Built', 'num'], ['furnaceFilter', 'Furnace Filter Size', 'code'], ['fridgeFilter', 'Fridge Water Filter #', 'code'], ['waterHeater', 'Water Heater Installed (Year)', 'num'], ['roof', 'Roof Replaced (Year)', 'num'], ['shutoff', 'Main Water Shutoff Location'], ['paint', 'Paint Colors', 'long'], ['insurer', 'Insurance Company'], ['policy', 'Policy Number', 'code']] },
  Appliance: { icon: 'plug', ph: 'e.g. Dishwasher', key: ['model', 'serial', 'part', 'warranty'], fields: [['kind', 'Appliance', 'sel', ['Dishwasher', 'Refrigerator', 'Freezer', 'Range / oven', 'Cooktop', 'Microwave', 'Range hood', 'Garbage disposal', 'Washer', 'Dryer', 'Water heater', 'Furnace', 'Air conditioner', 'Heat pump', 'Water softener', 'Sump pump', 'Dehumidifier', 'Humidifier', 'Garage door opener', 'Generator', 'Grill', 'Lawn mower', 'Snow blower', 'Other']], ['brand', 'Brand'], ['model', 'Model Number', 'code'], ['serial', 'Serial Number', 'code'], ['where', 'Where It Is'], ['bought', 'Purchased', 'date'], ['warranty', 'Warranty Ends', 'date'], ['part', 'Filter / Part Number', 'code'], ['store', 'Bought From']] },
  Pet: { icon: 'paw', ph: 'e.g. Max', key: ['chip', 'tag', 'tagExp'], fields: [['species', 'Animal', 'sel', ['Dog', 'Cat', 'Bird', 'Fish', 'Rabbit', 'Guinea pig / hamster', 'Reptile', 'Horse', 'Other']], ['breed', 'Breed'], ['born', 'Birthday', 'date'], ['chip', 'Microchip Number', 'code'], ['tag', 'License / Rabies Tag #', 'code'], ['tagExp', 'Tag Expires', 'date'], ['food', 'Food & Amount'], ['meds', 'Medicines']] },
  Document: { icon: 'doc', ph: 'e.g. Sam’s passport', key: ['number', 'expires'], fields: [['kind', 'Document', 'sel', ['Driver’s license', 'Passport', 'State ID', 'Birth certificate', 'Social Security card', 'Insurance card', 'Vehicle title', 'Deed', 'Will / trust', 'Other']], ['holder', 'Whose'], ['number', 'Number', 'code'], ['issued', 'Issued', 'date'], ['expires', 'Expires', 'date'], ['kept', 'Where It’s Kept']] },
  // anything that doesn't fit the others: a few broad fields, plus notes and photos like every belonging
  Thing: { icon: 'tag', ph: 'e.g. Grandma’s china, kayak, ring', key: ['kept', 'expires'], fields: [['about', 'Description', 'long'], ['kept', 'Where It’s Kept'], ['brand', 'Brand / Maker'], ['bought', 'Got It On', 'date'], ['paid', 'Paid or Worth', 'money'], ['expires', 'Renew or Expires', 'date'], ['ident', 'Serial or ID Number', 'code']] },
  Other: { icon: 'box', ph: 'e.g. Generator', key: ['model', 'serial', 'warranty'], fields: [['brand', 'Brand'], ['model', 'Model Number', 'code'], ['serial', 'Serial Number', 'code'], ['bought', 'Purchased', 'date'], ['warranty', 'Warranty Ends', 'date']] }
};
var ITEM_ORDER = ['Vehicle', 'Home', 'Appliance', 'Pet', 'Document', 'Thing', 'Other'];
var ITEM_PLURAL = { Vehicle: 'Vehicles', Home: 'Homes', Appliance: 'Appliances', Pet: 'Pets', Document: 'Documents', Other: 'Other' };
var EXPIRY_KEYS = { plateExp: 1, warranty: 1, tagExp: 1, expires: 1 };
function itemById(id) { return id ? db.items.find(function (b) { return b.id === id; }) || null : null; }
function itemExpiry(b) {
  var best = null, T = today();
  ITEM_TYPES[b.type].fields.forEach(function (x) {
    var d = EXPIRY_KEYS[x[0]] && parse(b.fields[x[0]]);
    if (d && (!best || d < best.date)) best = { label: x[1], date: d, days: daysBetween(T, d) };
  });
  return best;
}
function expiryNote(d) {
  var n = daysBetween(today(), d);
  if (n < 0) return '<span class="exp" style="color:var(--red)">Expired</span>';
  if (n <= 60) return '<span class="exp" style="color:var(--orange)">' + (n === 0 ? 'Expires today' : 'Expires in ' + n + (n === 1 ? ' day' : ' days')) + '</span>';
  return '';
}
var GENERIC_NAME = /^(vehicle|car|pet|appliance|item) ?\d*$|^(our )?home$|^untitled$/i;
function autoName(type, f) {
  if (type === 'Vehicle') return [f.year, f.model || f.make].filter(Boolean).join(' ');
  if (type === 'Appliance') return f.kind && f.kind !== 'Other' ? f.kind : [f.brand, f.model].filter(Boolean).join(' ');
  if (type === 'Home') return f.address ? f.address.split(',')[0].trim() : 'Home';
  if (type === 'Document') return f.holder && f.kind ? f.holder + '\u2019s ' + (f.kind === 'Driver\u2019s license' ? 'driver\u2019s license' : f.kind.toLowerCase()) : (f.kind || '');
  if (type === 'Other') return [f.brand, f.model].filter(Boolean).join(' ');
  return '';
}
function itemSub(b) {
  var f = b.fields, out = [];
  if (b.type === 'Vehicle') { var ymm = [f.year, f.make, f.model].filter(Boolean).join(' '); if (ymm && ymm !== b.name) out.push(ymm); if (f.plate) out.push('Plate ' + f.plate); }
  else if (b.type === 'Document') { if (f.kind) out.push(f.kind); if (f.holder) out.push(f.holder); }
  else if (b.type === 'Pet') { if (f.breed || f.species) out.push(f.breed || f.species); }
  else if (b.type === 'Home') { if (f.address) out.push(f.address); }
  else { if (b.type === 'Appliance' && f.kind && f.kind !== b.name) out.push(f.kind); var bm = [f.brand, f.model].filter(Boolean).join(' '); if (bm) out.push(bm); }
  return out.join(' · ') || b.type;
}
function itemRow(b, alt) {
  var e = itemExpiry(b), n = db.tasks.filter(function (t) { return t.item === b.id; }).length, right = '';
  if (e && e.days <= 60) right = '<b style="color:' + (e.days < 0 ? 'var(--red)' : 'var(--orange)') + '">' + (e.days < 0 ? 'Expired' : e.days === 0 ? 'Expires today' : 'Expires in ' + e.days + 'd') + '</b><span class="meta">' + esc(e.label) + '</span>';
  else if (n) right = '<span style="color:var(--rose);font-weight:600">' + n + (n === 1 ? ' task' : ' tasks') + '</span>';
  return '<button class="row' + (alt ? ' alt' : '') + '" data-act="item" data-id="' + esc(b.id) + '"><span class="badge">' + ic(ITEM_TYPES[b.type].icon, 20) + '</span><span class="col"><span class="name ellip">' + esc(b.name) + '</span><span class="meta ellip">' + esc(itemSub(b)) + '</span></span><span class="st">' + right + '</span></button>';
}
function fieldRows(b, keys) {
  return ITEM_TYPES[b.type].fields.filter(function (x) { return b.fields[x[0]] && (!keys || keys.indexOf(x[0]) >= 0); }).map(function (x) {
    var v = b.fields[x[0]], d = x[2] === 'date' ? parse(v) : null, amt = x[2] === 'money' ? parseFloat(String(v).replace(/[^\d.]/g, '')) : NaN;
    return '<div class="lrow"><span class="col"><span class="s">' + esc(x[1]) + '</span><span class="t" style="word-break:break-word;white-space:pre-wrap">' + esc(d ? fmt(d, true) : amt > 0 ? money(amt) : v) + '</span>' + (d && EXPIRY_KEYS[x[0]] ? expiryNote(d) : '') + '</span>' +
      (d ? '' : '<button class="copy" data-act="copy" data-v="' + esc(v) + '" aria-label="Copy ' + esc(x[1]) + '">' + ic('copy', 15) + '<span>Copy</span></button>') + '</div>';
  }).join('');
}
function keyRows(b) {
  var keys = ITEM_TYPES[b.type].key, html = fieldRows(b, keys);
  if (html) return html;
  return fieldRows(b, ITEM_TYPES[b.type].fields.filter(function (x) { return b.fields[x[0]]; }).slice(0, 4).map(function (x) { return x[0]; }));
}
function dirSwitch(cur) {
  return '<div class="segdark" role="tablist" aria-label="Directory">' + [['contacts', 'Contacts'], ['items', 'Belongings']].map(function (x) {
    return '<button role="tab" data-act="dir" data-to="' + x[0] + '" aria-selected="' + (cur === x[0]) + '">' + x[1] + '</button>';
  }).join('') + '</div>';
}
function itemMatches(b, q) {
  if (!q) return true;
  var all = [b.name, b.type, b.notes].concat(Object.keys(b.fields).map(function (k) { return b.fields[k]; })).join(' ').toLowerCase();
  return all.indexOf(q) >= 0;
}
function vehicleNamesInTasks() {
  var out = [];
  db.tasks.forEach(function (t) {
    if (t.cat !== 'Vehicle' || t.item || !t.who || /^all vehicles$|car seat/i.test(t.who) || out.indexOf(t.who) >= 0) return;
    if (db.items.some(function (b) { return b.type === 'Vehicle' && b.name.toLowerCase() === t.who.toLowerCase(); })) return;
    out.push(t.who);
  });
  return out.sort();
}
function itemResults() {
  var q = ui.bq.trim().toLowerCase(), out = '';
  var list = db.items.filter(function (b) { return itemMatches(b, q); });
  var vn = q ? [] : vehicleNamesInTasks();
  if (vn.length) out += '<div class="tip" style="margin:0 0 4px;display:flex;flex-direction:column;gap:10px"><span>Your tasks mention <strong>' + vn.map(esc).join('</strong> and <strong>') + '</strong>. Add ' + (vn.length === 1 ? 'it' : 'them') + ' here so plate #, VIN and insurance show up on those tasks.</span><button class="btn primary" style="min-height:44px;font-size:14.5px;border-radius:12px" data-act="auto-vehicles">Add ' + (vn.length === 1 ? 'This Vehicle' : 'These ' + vn.length + ' Vehicles') + '</button></div>';
  if (!list.length) return out + (q ? emptyBox('search', 'No Matches', 'Nothing matches that search.') : '<div class="tip" style="margin:0">Save the details you always have to dig for: VIN and plate number, appliance model #, filter sizes, microchip #, passport expiration. Link a belonging to a task and its details show up right on that task.</div>');
  ITEM_ORDER.forEach(function (ty) {
    var part = list.filter(function (b) { return b.type === ty; }).sort(function (a, b) { return a.name.localeCompare(b.name); });
    if (part.length) out += '<div class="grp">' + ITEM_PLURAL[ty] + ' · ' + part.length + '</div>' + part.map(function (b, i) { return itemRow(b, i % 2 === 1); }).join('');
  });
  return out;
}
function scrItems() {
  var n = db.items.length;
  var h = '<header class="head" style="gap:12px"><span class="eyebrow">' + n + (n === 1 ? ' belonging' : ' belongings') + '</span>' + titleRow('Belongings', 'new-item', 'Belonging') + dirSwitch('items') +
    searchBox('bq', ui.bq, 'Search belongings', 'Search belongings') + '</header>';
  return h + '<div class="stack" id="results" style="padding-top:12px;padding-bottom:28px">' + itemResults() + '</div>';
}
function scrItem() {
  var b = itemById(ui.itemId);
  if (!b) { ui.screen = 'items'; return scrItems(); }
  var h = '<header class="head" style="gap:12px"><div class="headrow">' + backBtn() + '<button class="textbtn" data-act="edit-item">Edit</button></div>' +
    '<div style="display:flex;align-items:center;gap:14px"><span class="badge" style="width:56px;height:56px;flex-basis:56px;border-radius:16px">' + ic(ITEM_TYPES[b.type].icon, 28) + '</span><span class="col"><span class="eyebrow">' + esc(b.type) + '</span><h1 style="font-size:24px">' + esc(b.name) + '</h1></span></div></header>';
    var rowsH = fieldRows(b);
  h += '<div class="listcard" style="margin-top:16px">' + (rowsH || '<p class="note" style="text-align:left;margin:12px 0">No details saved yet. Tap Edit to add them.</p>') + '</div>';
  if (b.notes) h += '<div class="card" style="margin:10px 16px 0;padding:14px;display:flex;flex-direction:column;gap:6px"><span style="font-size:12.5px;color:var(--muted)">Notes</span><span style="line-height:1.45;white-space:pre-wrap">' + esc(b.notes) + '</span></div>';
  h += photosCard('item', b);
  var rc = b.contacts.map(function (id) { return db.contacts.find(function (c) { return c.id === id; }); }).filter(Boolean);
  h += '<div class="section"><h2 style="font-size:19px">Related Contacts</h2><button class="link" data-act="edit-item">' + (rc.length ? 'Edit' : '+ Add') + '</button></div><div class="stack">' +
    (rc.length ? rc.map(function (c, i) { return contactRow(c, i % 2 === 1); }).join('') : '<p class="note" style="text-align:left;padding:4px">No related contacts yet, like a mechanic or insurance agent.</p>') + '</div>';
  var linked = rows().filter(function (r) { return r.t.item === b.id; });
  h += '<div class="section"><h2 style="font-size:19px">Related Tasks</h2><button class="link" data-act="new-task-item">+ Add Task</button></div><div class="stack">' +
    (linked.length ? linked.map(function (r) { return taskRow(r, false, 'contact'); }).join('') : '<p class="note" style="text-align:left;padding:4px">No related tasks yet. Open a task, tap Edit, and pick this under Belonging.</p>') + '</div>';
  return h + '<div class="pad-b"></div>';
}
function itemCaption(id) {
  var b = itemById(id);
  if (b) { var sub = itemSub(b); return '<small class="catcap">' + esc(b.type + (sub !== b.type ? ' \u00b7 ' + sub : '')) + '</small>'; }
  return '<small>' + (db.items.length ? 'Its details (plate #, model #, filter size\u2026) show right on this task.' : 'Add cars, appliances and more under Directory \u2192 Belongings, then link them here.') + '</small>';
}
function itemOptions(cur) {
  return '<option value="">None</option>' + db.items.slice().sort(function (a, b) { return a.name.localeCompare(b.name); }).map(function (b) { return opt(b.id, cur || '', b.name); }).join('');
}
/* ---------- bills: a task with an amount ---------- */
function money(n, cents) {
  n = Math.round((+n || 0) * 100) / 100;
  var c = cents || (n % 1 !== 0);
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: c ? 2 : 0, maximumFractionDigits: c ? 2 : 0 });
}
/* for a bill task: paid this month, or due this month */
function billMonth(t, y, m) {
  var paid = t.history.find(function (h) { var d = parse(h.date); return d && d.getFullYear() === y && d.getMonth() === m; });
  if (paid) return { paid: true };
  var i = info(t); if (!i.due || i.due.getFullYear() !== y || i.due.getMonth() !== m) return null;
  return { paid: false, late: i.status === 'overdue' };
}
function scrEditItem() {
  var f = ui.form, isNew = !f.id, T = ITEM_TYPES[f.type] || ITEM_TYPES.Other;
  var h = '<header class="head"><div class="headrow"><button class="textbtn" data-act="cancel">Cancel</button><span style="font-weight:700">' + (isNew ? 'New Belonging' : 'Edit Belonging') + '</span><button class="textbtn" data-act="save-item">Save</button></div></header>';
    h += '<form class="form" id="itemForm" autocomplete="off" novalidate>' +
    '<label class="field"><span>Category</span><select class="input" name="type" data-rerender="1">' + ITEM_ORDER.map(function (ty) { return opt(ty, f.type); }).join('') + '</select><small>The category decides which details you can save.</small></label>' +
    '<label class="field"><span>Name</span><input class="input" name="name" value="' + esc(f.name) + '" placeholder="' + esc(T.ph) + '">' + (f.type === 'Pet' ? '' : '<small>Optional. Leave it blank and Tend names it from the details below (' + esc(T.ph.replace('e.g. ', '')) + ').</small>') + '</label>';
  var pair = [];
  T.fields.forEach(function (x) {
    var nm = 'f_' + x[0], v = f[nm] || '', el;
    if (x[2] === 'date') el = '<input class="input" type="date" name="' + nm + '" value="' + esc(v) + '">';
    else if (x[2] === 'num') el = '<input class="input" inputmode="numeric" name="' + nm + '" value="' + esc(v) + '" maxlength="6">';
    else if (x[2] === 'money') el = '<input class="input" inputmode="decimal" name="' + nm + '" value="' + esc(v) + '" placeholder="$">';
    else if (x[2] === 'code') el = '<input class="input" autocapitalize="characters" autocorrect="off" spellcheck="false" name="' + nm + '" value="' + esc(v) + '">';
    else if (x[2] === 'long') el = '<textarea class="input" name="' + nm + '" rows="2">' + esc(v) + '</textarea>';
    else if (x[2] === 'sel') el = '<select class="input" name="' + nm + '"><option value="">Choose…</option>' + (v && x[3].indexOf(v) < 0 ? opt(v, v) : '') + x[3].map(function (o) { return opt(o, v); }).join('') + '</select>';
    else el = '<input class="input" name="' + nm + '" value="' + esc(v) + '">';
    var fld = '<label class="field"><span>' + esc(x[1]) + '</span>' + el + '</label>';
    var small = x[2] === 'num' || x[2] === 'date' || x[2] === 'sel' || x[2] === 'money';
    if (small && x[1].length < 22) { pair.push(fld); if (pair.length === 2) { h += '<div class="two">' + pair.join('') + '</div>'; pair = []; } }
    else { if (pair.length) { h += pair[0]; pair = []; } h += fld; }
  });
  if (pair.length) h += pair[0];
  h += relContactsField(f);
  h += '<label class="field"><span>Notes</span><textarea class="input" name="notes" rows="3">' + esc(f.notes) + '</textarea><small>Keep passwords and full ID numbers you’d worry about losing in your iPhone’s Passwords app, not here.</small></label>' +
    '<button type="submit" class="btn primary">Save</button>' +
    (isNew ? '' : '<button type="button" class="btn danger' + (ui.armed === 'del-item' ? ' armed' : '') + '" data-act="del-item">' + (ui.armed === 'del-item' ? 'Tap Again to Delete for Good' : 'Delete Belonging') + '</button>') +
    '</form>';
  return h;
}
function relChips(list, nameOf, kind) {
  return list.length ? '<div class="chiprow">' + list.map(function (id) { return '<span class="rchip">' + esc(nameOf(id)) + '<button type="button" data-act="rel-del" data-kind="' + kind + '" data-id="' + esc(id) + '" aria-label="Remove">' + ic('x', 14, 2.6) + '</button></span>'; }).join('') + '</div>' : '';
}
function relContactsField(f) {
  var cur = f.contacts || [], left = db.contacts.filter(function (c) { return cur.indexOf(c.id) < 0; }).sort(function (a, b) { return a.name.localeCompare(b.name); });
  return '<div class="field"><span>Related Contacts</span>' + relChips(cur, function (id) { var c = db.contacts.find(function (x) { return x.id === id; }); return c ? c.name : '?'; }, 'contact') +
    (left.length ? '<select class="input" name="addRel"><option value="">' + (cur.length ? '+ Add another contact…' : '+ Add a contact…') + '</option>' + left.map(function (c) { return opt(c.id, '', c.name); }).join('') + '</select>' : (db.contacts.length ? '' : '<small>Add contacts first, like your mechanic or insurance agent.</small>')) +
    '<small>For example, the mechanic and insurance agent for a car.</small></div>';
}
function relItemsField(f) {
  var cur = f.items || [], left = db.items.filter(function (b) { return cur.indexOf(b.id) < 0; }).sort(function (a, b) { return a.name.localeCompare(b.name); });
  return '<div class="field"><span>Related Belongings</span>' + relChips(cur, function (id) { var b = itemById(id); return b ? b.name : '?'; }, 'item') +
    (left.length ? '<select class="input" name="addRel"><option value="">' + (cur.length ? '+ Add another belonging…' : '+ Add a belonging…') + '</option>' + left.map(function (b) { return opt(b.id, '', b.name); }).join('') + '</select>' : (db.items.length ? '' : '<small>Add belongings under Directory → Belongings first.</small>')) +
    '<small>For example, the cars this mechanic works on.</small></div>';
}
function contactRow(c, alt) {
  return '<button class="row' + (alt ? ' alt' : '') + '" data-act="contact" data-id="' + esc(c.id) + '"><span class="avatar">' + esc(initials(c.name)) + '</span><span class="col"><span class="name">' + esc(c.name) + '</span>' + (c.role ? '<span class="meta">' + esc(c.role) + '</span>' : '') + '</span><span style="color:var(--muted)">' + ic('next', 18) + '</span></button>';
}
function itemForm(b) {
  var f = { id: b ? b.id : null, type: b ? b.type : 'Vehicle', name: b ? b.name : '', origName: b ? b.name : '', notes: b ? b.notes : '', contacts: b ? b.contacts.slice() : [] };
  if (b) Object.keys(b.fields).forEach(function (k) { f['f_' + k] = b.fields[k]; });
  return f;
}
function saveItem() {
  readForm('itemForm'); var f = ui.form;
  f.name = (f.name || '').trim();
  var type = ITEM_TYPES[f.type] ? f.type : 'Other', fields = {};
  ITEM_TYPES[type].fields.forEach(function (x) {
    var v = String(f['f_' + x[0]] || '').trim();
    if (x[0] === 'vin' || x[0] === 'plate') v = v.toUpperCase();
    if (x[2] === 'date' && v && !parse(v)) v = '';
    if (v) fields[x[0]] = v;
  });
  var auto = autoName(type, fields);
  if (auto && (!f.name || (GENERIC_NAME.test(f.name) && f.name === f.origName))) f.name = auto;
  if (!f.name) { warn(type === 'Pet' ? 'Give your pet a name.' : 'Give it a name, or fill in a few details.'); return; }
  var b = f.id ? itemById(f.id) : null;
  if (!b) { b = { id: newId('b'), contacts: [] }; db.items.push(b); }
  var oldName = b.name;
  if (oldName && oldName !== f.name) db.tasks.forEach(function (t) { if (t.item === b.id && t.who === oldName) t.who = f.name; });
  b.type = type; b.name = f.name; b.fields = fields; b.notes = (f.notes || '').trim(); b.contacts = (f.contacts || []).filter(function (id) { return db.contacts.some(function (c) { return c.id === id; }); });
  /* a new plate or tag expiration gives the matching renewal task its date */
  var expKey = { Vehicle: ['plateExp', /registration/i], Pet: ['tagExp', /license|rabies tag/i], Document: ['expires', /renew/i] }[type];
  if (expKey && fields[expKey[0]]) db.tasks.forEach(function (t) { if (t.item === b.id && !t.first && !t.last && expKey[1].test(t.name)) t.first = fields[expKey[0]]; });
  save(); ui.form = null; ui.stack.pop();
  go('item', { itemId: b.id }, false); ui.stack = [{ screen: 'items', scroll: 0 }];
  toast('Saved.');
}
function copyText(v, btn) {
  function done() { if (btn) { var s = btn.querySelector('span'); if (s) { s.textContent = 'Copied'; setTimeout(function () { s.textContent = 'Copy'; }, 1500); } } }
  function legacy() { var ta = document.createElement('textarea'); ta.value = v; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (e) {} ta.remove(); done(); }
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(v).then(done, legacy); else legacy();
}

