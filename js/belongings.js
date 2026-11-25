'use strict';
/* Tend: Belongings (vehicles, homes, appliances, pets, documents): their details, the dates tasks keep up to date, and their history. */
/* ---------- belongings ---------- */
var ITEM_TYPES = {
  Vehicle: { icon: 'car', ph: 'e.g. Silverado', key: ['plate', 'plateExp', 'vin', 'policy'], fields: [
    ['h', 'Basics'], ['desc', 'Vehicle', 'text', 'e.g. 2026 Chevy Silverado LTZ'], ['color', 'Color'], ['vin', 'VIN', 'code'], ['plate', 'Plate Number', 'code'], ['plateExp', 'Plates Expire', 'date'], ['inspect', 'Inspection / Emissions Due', 'date'],
    ['h', 'Insurance'], ['insurer', 'Insurance Company'], ['policy', 'Policy Number', 'code'], ['insRenew', 'Insurance Renews', 'date'], ['roadside', 'Roadside Assistance Phone', 'text', 'e.g. (800) 555-0100'],
    ['h', 'Maintenance'], ['miles', 'Current Mileage', 'mi'], ['oilLast', 'Last Oil Change', 'date'], ['oilMiles', 'Oil Change Mileage', 'mi'], ['oil', 'Oil Type', 'code', 'e.g. 0W-20 full synthetic, 8 qt'], ['oilFilter', 'Oil Filter', 'code', 'e.g. ACDelco PF63E'],
    ['airFilter', 'Engine Air Filter', 'code'], ['cabinFilter', 'Cabin Air Filter', 'code'], ['brakes', 'Last Brake Service', 'date'], ['battery', 'Battery Installed', 'date'], ['wipers', 'Wiper Blade Sizes', 'code', 'e.g. 22 in. driver, 22 in. passenger'],
    ['h', 'Tires'], ['rotateLast', 'Last Tire Rotation', 'date'], ['tiresBought', 'Tires Bought', 'date'], ['tires', 'Tire Size', 'code', 'e.g. 275/55R20'], ['tireBrand', 'Tire Brand & Model'], ['psi', 'Tire Pressure', 'code', 'e.g. 35 PSI front and rear'],
    ['h', 'Ownership'], ['bought', 'Purchased', 'date'], ['warranty', 'Warranty Ends', 'date'], ['history', 'Accidents & Repairs', 'long']] },
  Home: { icon: 'home', ph: 'e.g. Home', key: ['furnaceFilter', 'fridgeFilter', 'shutoff', 'policy'], fields: [['address', 'Address'], ['built', 'Year Built', 'num'], ['furnaceFilter', 'Furnace Filter Size', 'code'], ['fridgeFilter', 'Fridge Water Filter #', 'code'], ['waterHeater', 'Water Heater Installed (Year)', 'num'], ['roof', 'Roof Replaced (Year)', 'num'], ['shutoff', 'Main Water Shutoff Location'], ['paint', 'Paint Colors', 'long'], ['insurer', 'Insurance Company'], ['policy', 'Policy Number', 'code'], ['insRenew', 'Policy Renews', 'date']] },
  Appliance: { icon: 'plug', ph: 'e.g. Dishwasher', key: ['model', 'serial', 'part', 'warranty'], fields: [['kind', 'Appliance', 'sel', ['Dishwasher', 'Refrigerator', 'Freezer', 'Range / oven', 'Cooktop', 'Microwave', 'Range hood', 'Garbage disposal', 'Washer', 'Dryer', 'Water heater', 'Furnace', 'Air conditioner', 'Heat pump', 'Water softener', 'Sump pump', 'Dehumidifier', 'Humidifier', 'Garage door opener', 'Generator', 'Grill', 'Lawn mower', 'Snow blower', 'Other']], ['brand', 'Brand'], ['model', 'Model Number', 'code'], ['serial', 'Serial Number', 'code'], ['where', 'Where It Is'], ['bought', 'Purchased', 'date'], ['warranty', 'Warranty Ends', 'date'], ['part', 'Filter / Part Number', 'code'], ['store', 'Bought From']] },
  Pet: { icon: 'paw', ph: 'e.g. Max', key: ['chip', 'tag', 'tagExp'], fields: [['species', 'Animal', 'sel', ['Dog', 'Cat', 'Bird', 'Fish', 'Rabbit', 'Guinea pig / hamster', 'Reptile', 'Horse', 'Other']], ['breed', 'Breed'], ['born', 'Birthday', 'date'], ['chip', 'Microchip Number', 'code'], ['tag', 'License / Rabies Tag #', 'code'], ['tagExp', 'Tag Expires', 'date'], ['food', 'Food & Amount'], ['meds', 'Medicines']] },
  Document: { icon: 'doc', ph: 'e.g. Sam’s passport', key: ['number', 'expires'], fields: [['kind', 'Document', 'sel', ['Driver’s license', 'Passport', 'State ID', 'Birth certificate', 'Social Security card', 'Insurance card', 'Vehicle title', 'Deed', 'Will / trust', 'Other']], ['holder', 'Whose'], ['number', 'Number', 'code'], ['issued', 'Issued', 'date'], ['expires', 'Expires', 'date'], ['kept', 'Where It’s Kept']] },
  // anything that doesn't fit the others: a few broad fields, plus notes and photos like every belonging
  Thing: { icon: 'tag', ph: 'e.g. Grandma’s china, kayak, ring', key: ['kept', 'expires'], fields: [['about', 'Description', 'long'], ['kept', 'Where It’s Kept'], ['brand', 'Brand / Maker'], ['bought', 'Got It On', 'date'], ['paid', 'Paid or Worth', 'money'], ['expires', 'Renew or Expires', 'date'], ['ident', 'Serial or ID Number', 'code']] },
  Other: { icon: 'box', ph: 'e.g. Generator', key: ['model', 'serial', 'warranty'], fields: [['brand', 'Brand'], ['model', 'Model Number', 'code'], ['serial', 'Serial Number', 'code'], ['bought', 'Purchased', 'date'], ['warranty', 'Warranty Ends', 'date']] }
};
var ITEM_ORDER = ['Vehicle', 'Home', 'Appliance', 'Pet', 'Document', 'Thing', 'Other'];
var ITEM_PLURAL = { Vehicle: 'Vehicles', Home: 'Homes', Appliance: 'Appliances', Pet: 'Pets', Document: 'Documents', Other: 'Other' };
/* only ID numbers people paste into forms get a Copy button */
var COPY_KEYS = { vin: 1, plate: 1, policy: 1, serial: 1, model: 1, chip: 1, tag: 1, number: 1, ident: 1, part: 1 };
var EXPIRY_KEYS = { plateExp: 1, warranty: 1, tagExp: 1, expires: 1, insRenew: 1, inspect: 1 };
/* parts that wear out with age: how old they are, and when that's worth a look */
var AGE_KEYS = { tiresBought: 6, battery: 4 };
function ageNote(d, limit) {
  var mo = (today().getFullYear() - d.getFullYear()) * 12 + today().getMonth() - d.getMonth(); if (mo < 0) return '';
  var txt = mo < 12 ? (mo <= 1 ? 'New' : mo + ' months old') : (Math.floor(mo / 12) + (mo >= 24 ? ' years' : ' year') + (mo % 12 >= 6 ? ' and a half' : '') + ' old');
  return '<span class="exp" style="color:' + (mo >= limit * 12 ? 'var(--orange)' : 'var(--muted)') + '">' + txt + (mo >= limit * 12 ? ', worth checking' : '') + '</span>';
}
/* dates a task can keep up to date: an expiration it renews, or the last time something was done */
var LAST_KEYS = { oilLast: 1, rotateLast: 1, brakes: 1 };
function tieOf(t) {
  var b = t && t.tie ? itemById(t.item) : null; if (!b) return null;
  var x = ITEM_TYPES[b.type].fields.find(function (y) { return y[0] === t.tie; });
  if (!x || !(EXPIRY_KEYS[t.tie] || LAST_KEYS[t.tie])) return null;
  return { b: b, key: t.tie, label: x[1], renew: !!EXPIRY_KEYS[t.tie] };
}
function tieChoices(b) { return b ? ITEM_TYPES[b.type].fields.filter(function (x) { return EXPIRY_KEYS[x[0]] || LAST_KEYS[x[0]]; }) : []; }
/* a likely match from the task's name, for new tasks */
function guessTie(name, b) {
  var keys = tieChoices(b).map(function (x) { return x[0]; }), n = String(name || '').toLowerCase();
  var rules = [[/registration|plates?\b|sticker/, 'plateExp'], [/insurance|policy/, 'insRenew'], [/oil/, 'oilLast'], [/rotat/, 'rotateLast'], [/brake/, 'brakes'], [/emission|inspection/, 'inspect'], [/rabies|tag|pet license/, 'tagExp'], [/warranty/, 'warranty'], [/renew|license|passport|expire/, 'expires']];
  for (var i = 0; i < rules.length; i++) if (rules[i][0].test(n) && keys.indexOf(rules[i][1]) >= 0) return rules[i][1];
  return '';
}
/* the suggested next expiration: the old one plus how often the task repeats (a year if it doesn't) */
function renewGuess(t, ti) {
  var old = parse(ti.b.fields[ti.key]) || today(), f = FREQ[t.freq] || {};
  return f.dy ? addDays(old, f.dy) : addMonths(old, f.mo || 12);
}
function miles(v) { var n = parseInt(String(v || '').replace(/\D/g, ''), 10); return n > 0 ? n : 0; }
function renewName(b, key) {
  return key === 'plateExp' ? 'Renew ' + b.name + ' Registration' : key === 'insRenew' ? 'Renew ' + b.name + ' Insurance' : key === 'tagExp' ? 'Renew ' + b.name + '\u2019s License Tag'
    : key === 'warranty' ? b.name + ' Warranty Ends' : key === 'inspect' ? b.name + ' Emissions / Inspection' : 'Renew ' + b.name;
}
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
  if (type === 'Vehicle') return vehName(f.desc);
  if (type === 'Appliance') return f.kind && f.kind !== 'Other' ? f.kind : [f.brand, f.model].filter(Boolean).join(' ');
  if (type === 'Home') return f.address ? f.address.split(',')[0].trim() : 'Home';
  if (type === 'Document') return f.holder && f.kind ? f.holder + '\u2019s ' + (f.kind === 'Driver\u2019s license' ? 'driver\u2019s license' : f.kind.toLowerCase()) : (f.kind || '');
  if (type === 'Other') return [f.brand, f.model].filter(Boolean).join(' ');
  return '';
}
/* a short name from the description: "2026 Chevy Silverado LTZ" becomes "Silverado" */
function vehName(desc) {
  var w = String(desc || '').trim().split(/\s+/).filter(function (x) { return !/^(19|20)\d\d$/.test(x); });
  return w.length > 1 ? w[1] : w[0] || '';
}
function itemSub(b) {
  var f = b.fields, out = [];
  if (b.type === 'Vehicle') { if (f.desc && f.desc !== b.name) out.push(f.desc); if (f.plate) out.push('Plate ' + f.plate); }
  else if (b.type === 'Document') { if (f.kind) out.push(f.kind); if (f.holder) out.push(f.holder); }
  else if (b.type === 'Pet') { if (f.breed || f.species) out.push(f.breed || f.species); }
  else if (b.type === 'Home') { if (f.address) out.push(f.address); }
  else { if (b.type === 'Appliance' && f.kind && f.kind !== b.name) out.push(f.kind); var bm = [f.brand, f.model].filter(Boolean).join(' '); if (bm) out.push(bm); }
  return out.join(' · ') || (b.type === b.name ? '' : b.type);
}
function itemRow(b, alt) {
  var e = itemExpiry(b), n = db.tasks.filter(function (t) { return t.item === b.id; }).length, right = '';
  if (e && e.days <= 60) right = '<b style="color:' + (e.days < 0 ? 'var(--red)' : 'var(--orange)') + '">' + (e.days < 0 ? 'Expired' : e.days === 0 ? 'Expires today' : 'Expires in ' + e.days + 'd') + '</b><span class="meta">' + esc(e.label) + '</span>';
  else if (n) right = '<span style="color:var(--rose);font-weight:600">' + n + (n === 1 ? ' task' : ' tasks') + '</span>';
  return '<button class="row' + (alt ? ' alt' : '') + '" data-act="item" data-id="' + esc(b.id) + '"><span class="badge">' + ic(ITEM_TYPES[b.type].icon, 20) + '</span><span class="col"><span class="name ellip">' + esc(b.name) + '</span><span class="meta ellip">' + esc(itemSub(b)) + '</span></span><span class="st">' + right + '</span></button>';
}
function fieldRows(b, keys, withTie) {
  var head = '', showHeads = !keys && withTie;
  return ITEM_TYPES[b.type].fields.filter(function (x) { if (x[0] === 'h') return showHeads; return b.fields[x[0]] && (!keys || keys.indexOf(x[0]) >= 0); }).map(function (x) {
    if (x[0] === 'h') { head = x[1]; return ''; }
    var hd = head ? '<div class="lrow" style="min-height:0;padding:12px 0 2px;border:0"><span class="s" style="font-weight:700;letter-spacing:.04em;text-transform:uppercase;font-size:11.5px">' + esc(head) + '</span></div>' : ''; head = '';
    var v = b.fields[x[0]], d = x[2] === 'date' ? parse(v) : null, amt = x[2] === 'money' ? parseFloat(String(v).replace(/[^\d.]/g, '')) : NaN;
    var shown = x[2] === 'mi' && miles(v) ? miles(v).toLocaleString() + ' mi' : v;
    var tied = d && withTie ? db.tasks.find(function (t) { return t.item === b.id && t.tie === x[0]; }) : null;
    var extra = !withTie || !d ? '' : tied ? '<button class="link tielink" data-act="task" data-id="' + esc(tied.id) + '">' + (EXPIRY_KEYS[x[0]] ? 'Renewal task: ' : 'Updated by: ') + esc(tied.name) + '</button>'
      : EXPIRY_KEYS[x[0]] && x[0] !== 'warranty' ? '<button class="link tielink" data-act="tie-new" data-k="' + x[0] + '">' + ic('bell', 13) + ' Remind me to renew</button>' : '';
    return hd + '<div class="lrow"><span class="col"><span class="s">' + esc(x[1]) + '</span><span class="t" style="word-break:break-word;white-space:pre-wrap">' + esc(d ? fmt(d, true) : amt > 0 ? money(amt) : shown) + '</span>' + (d && EXPIRY_KEYS[x[0]] ? expiryNote(d) : '') + (d && AGE_KEYS[x[0]] ? ageNote(d, AGE_KEYS[x[0]]) : '') + extra + '</span>' +
      (d || !COPY_KEYS[x[0]] ? '' : '<button class="copy" data-act="copy" data-v="' + esc(v) + '" aria-label="Copy ' + esc(x[1]) + '">' + ic('copy', 15) + '<span>Copy</span></button>') + '</div>';
  }).join('');
}
function keyRows(b) {
  var keys = ITEM_TYPES[b.type].key, html = fieldRows(b, keys);
  if (html) return html;
  return fieldRows(b, ITEM_TYPES[b.type].fields.filter(function (x) { return x[0] !== 'h' && b.fields[x[0]]; }).slice(0, 4).map(function (x) { return x[0]; }));
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
    var rowsH = fieldRows(b, null, true);
  h += '<div class="listcard" style="margin-top:16px">' + (rowsH || '<p class="note" style="text-align:left;margin:12px 0">No details saved yet. Tap Edit to add them.</p>') + '</div>';
  if (b.notes) h += '<div class="card" style="margin:10px 16px 0;padding:14px;display:flex;flex-direction:column;gap:6px"><span style="font-size:12.5px;color:var(--muted)">Notes</span><span style="line-height:1.45;white-space:pre-wrap">' + esc(b.notes) + '</span></div>';
  h += photosCard('item', b);
  var rc = b.contacts.map(function (id) { return db.contacts.find(function (c) { return c.id === id; }); }).filter(Boolean);
  h += '<div class="section"><h2 style="font-size:19px">Related Contacts</h2><button class="link" data-act="edit-item">' + (rc.length ? 'Edit' : '+ Add') + '</button></div><div class="stack">' +
    (rc.length ? rc.map(function (c, i) { return contactRow(c, i % 2 === 1); }).join('') : '<p class="note" style="text-align:left;padding:4px">No related contacts yet, like a mechanic or insurance agent.</p>') + '</div>';
  var linked = rows().filter(function (r) { return r.t.item === b.id; });
  h += '<div class="section"><h2 style="font-size:19px">Related Tasks</h2><button class="link" data-act="new-task-item">+ Add Task</button></div><div class="stack">' +
    (linked.length ? linked.map(function (r) { return taskRow(r, false, 'contact'); }).join('') : '<p class="note" style="text-align:left;padding:4px">No related tasks yet. Open a task, tap Edit, and pick this under Belonging.</p>') + '</div>';
  h += itemTimeline(b);
  return h + '<div class="pad-b"></div>';
}
/* everything done for a belonging, newest first, gathered from its tasks' history */
function itemTimeline(b) {
  var all = [];
  db.tasks.forEach(function (t) { if (t.item === b.id) t.history.forEach(function (x) { all.push({ t: t, h: x }); }); });
  if (!all.length) return '';
  all.sort(function (x, y) { return x.h.date < y.h.date ? 1 : x.h.date > y.h.date ? -1 : x.t.name.localeCompare(y.t.name); });
  var open = ui.histAll === b.id, shown = open ? all : all.slice(0, 8), year = '';
  var h = '<div class="section"><h2 style="font-size:19px">History</h2><span class="meta" style="color:var(--muted)">' + all.length + (all.length === 1 ? ' entry' : ' entries') + '</span></div><div class="listcard">';
  shown.forEach(function (x) {
    var d = parse(x.h.date), y = String(d.getFullYear());
    if (y !== year) { year = y; h += '<div class="lrow" style="min-height:0;padding:10px 0 2px;border:0"><span class="s" style="font-weight:700;letter-spacing:.04em">' + y + '</span></div>'; }
    h += '<button class="lrow" style="width:100%;text-align:left" data-act="task" data-id="' + esc(x.t.id) + '"><span class="col"><span class="t">' + esc(x.t.name) + '</span>' +
      '<span class="s">' + fmt(d, true) + (x.h.by ? ' \u00b7 ' + esc(x.h.by) : '') + '</span>' + (x.h.note ? '<span class="s" style="color:var(--ink)">' + esc(x.h.note) + '</span>' : '') + '</span><span style="color:var(--muted)">' + ic('next', 16) + '</span></button>';
  });
  h += '</div>';
  if (all.length > shown.length) h += '<div class="stack" style="margin-top:8px"><button class="btn secondary" data-act="hist-all">Show All ' + all.length + '</button></div>';
  return h;
}
function tieField(f) {
  var b = itemById(f.item), ch = tieChoices(b); if (!ch.length) return '';
  if (f.tie === undefined) f.tie = guessTie(f.name, b);
  var cur = ch.some(function (x) { return x[0] === f.tie; }) ? f.tie : '', lab = cur ? ch.find(function (x) { return x[0] === cur; })[1] : '';
  return '<label class="field"><span>When Done, Update</span><select class="input" name="tie" data-rerender="1">' + opt('', cur, 'Nothing') +
    ch.map(function (x) { return opt(x[0], cur, b.name + ' \u203a ' + x[1]); }).join('') + '</select><small>' +
    (!cur ? 'Pick a date on ' + esc(b.name) + ' that this task keeps up to date.'
      : EXPIRY_KEYS[cur] ? 'Due on ' + esc(b.name) + '\u2019s ' + esc(lab) + ' date' + (b.fields[cur] ? ' (' + fmt(parse(b.fields[cur]), true) + ')' : '') + '. When you mark it done, Tend asks for the new date and saves it on ' + esc(b.name) + '.'
      : 'Marking it done fills in ' + esc(lab) + ' on ' + esc(b.name) + '.') + '</small></label>';
}
function itemCaption(id) {
  var b = itemById(id);
  if (b) { var sub = itemSub(b); return '<small class="catcap">' + esc(b.type + (sub !== b.type ? ' \u00b7 ' + sub : '')) + '</small>'; }
  return '<small>' + (db.items.length ? 'Its details (plate #, model #, filter size\u2026) show right on this task.' : 'Add cars, appliances and more under Directory \u2192 Belongings, then link them here.') + '</small>';
}
function itemOptions(cur) {
  return '<option value="">None</option>' + db.items.slice().sort(function (a, b) { return a.name.localeCompare(b.name); }).map(function (b) { return opt(b.id, cur || '', b.name); }).join('');
}
