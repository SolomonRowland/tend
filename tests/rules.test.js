// Scheduling and data-safety rules, checked directly in the page:
// well-child visits, finishing a task never leaves it due again, damaged backup files,
// and dates kept in one standard shape.
const { chromium } = require('playwright');
const fs = require('fs');
const MOCK = fs.readFileSync(__dirname + '/mock-client.js', 'utf8');
const APP = 'http://localhost:8766/';
let ok = 0, bad = 0;
function check(name, cond, extra) { if (cond) { ok++; console.log('PASS', name); } else { bad++; console.log('FAIL', name, extra === undefined ? '' : JSON.stringify(extra)); } }
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext(); await ctx.addInitScript(MOCK);
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(APP); await p.waitForTimeout(600);

  // ---- well-child visits follow the pediatric schedule ----
  const wc = await p.evaluate(() => {
    const realToday = today; window.today = () => new Date(2026, 0, 1);
    const t = normalize({ tasks: [{ id: 't', name: 'wc', freq: 'Well-child (by age)', first: '2025-12-30', history: [] }] }).tasks[0];
    const seq = []; for (let k = 0; k < 12; k++) { const d = nextDue(t); if (!d) break; seq.push(iso(d)); t.last = iso(d); }
    // a 3-year-old added with no visits recorded starts at the visit due now, not the newborn one
    const older = normalize({ tasks: [{ id: 'o', name: 'wc', freq: 'Well-child (by age)', first: '2022-12-15', history: [] }] }).tasks[0];
    const olderDue = iso(nextDue(older));
    // the 12-month visit done 30 days early counts as the 12-month visit
    const early = normalize({ tasks: [{ id: 'e', name: 'wc', freq: 'Well-child (by age)', first: '2024-06-10', last: '2025-05-11' }] }).tasks[0];
    const earlyNext = iso(nextDue(early));
    const label = kidAge({ first: '2025-12-30' }, parse('2026-01-13'));
    window.today = realToday;
    return { seq, olderDue, earlyNext, label };
  });
  check('well-child schedule includes 2 and 4 months', JSON.stringify(wc.seq.slice(0, 7)) === JSON.stringify(['2026-01-03', '2026-01-13', '2026-01-30', '2026-02-28', '2026-04-30', '2026-06-30', '2026-09-30']), wc.seq);
  check('an older child starts at the visit due now', wc.olderDue === '2025-12-15', wc.olderDue);
  check('a visit done early isn\'t asked for again', wc.earlyNext === '2025-09-10', wc.earlyNext);
  check('the 2-week visit is called that', wc.label === '2-week visit', wc.label);

  // ---- finishing any repeating task never leaves it due again; one-time tasks end ----
  const sched = await p.evaluate(() => {
    let s = 11; const R = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    const bad = []; const realToday = today;
    const freqs = FREQS.map(f => f[0]).filter(f => f !== 'Well-child (by age)' && f !== MANUAL);
    for (let n = 0; n < 8000; n++) {
      const T = new Date(2024 + Math.floor(R() * 4), Math.floor(R() * 12), 1 + Math.floor(R() * 31));
      window.today = () => new Date(T.getFullYear(), T.getMonth(), T.getDate());
      const freq = freqs[Math.floor(R() * freqs.length)], early = EARLY[Math.floor(R() * EARLY.length)];
      const t = normalize({ tasks: [{ id: 't1', name: 'x', freq, fixed: R() < 0.5, early, first: iso(addDays(T, Math.floor(R() * 900) - 600)), holiday: R() < 0.1 ? Object.keys(HOLIDAYS)[Math.floor(R() * 6)] : '', history: R() < 0.6 ? [{ date: iso(addDays(T, -Math.floor(R() * 800))) }] : [] }] }).tasks[0];
      t.history.unshift({ date: iso(today()), by: '' }); t.last = iso(today());
      const i = info(t);
      if (freq === 'One-time') { if (i.status !== 'done') bad.push([freq, t.holiday, i.status]); continue; }
      if (!i.due || i.due <= today()) bad.push([freq, t.fixed, early, t.first, i.due && iso(i.due)]);
    }
    window.today = realToday; return bad.slice(0, 5).concat([bad.length]);
  });
  check('finishing a task never leaves it due again', sched[sched.length - 1] === 0, sched);

  // ---- damaged backup files and odd dates ----
  const data = await p.evaluate(() => {
    const out = {};
    try { const d = normalize({ tasks: [null, 7, 'x', [], { name: 'Keep me', history: [null, { date: '2026-1-5' }, { date: 'soon' }], first: '2026-2-3', snooze: 'nope' }], contacts: { a: 1 }, items: [null, { name: 'Car', type: 'Vehicle' }] });
      out.tasks = d.tasks.length; out.name = d.tasks[0].name; out.hist = d.tasks[0].history.map(h => h.date); out.first = d.tasks[0].first; out.snooze = d.tasks[0].snooze; out.contacts = d.contacts.length; out.items = d.items.length;
    } catch (e) { out.err = e.message; }
    try { normalize(null); normalize('nonsense'); out.nullOk = true; } catch (e) { out.nullOk = false; }
    return out;
  });
  check('damaged entries in a file are skipped, the rest kept', !data.err && data.tasks === 1 && data.name === 'Keep me' && data.contacts === 0 && data.items === 1, data);
  check('dates are stored in one standard shape', JSON.stringify(data.hist) === '["2026-01-05"]' && data.first === '2026-02-03' && data.snooze === null, data);
  check('an empty or unreadable file doesn\'t crash', data.nullOk);

  // ---- contacts: person or business, opening hours ----
  const ct = await p.evaluate(() => {
    const d = normalize({ contacts: [{ id: 'c1', name: 'Grandma', role: 'Family' }, { id: 'c2', name: 'Dentist', role: 'Dentist', hours: { wk: '08:00-17:00', sat: 'junk', sun: '' } }, { id: 'c3', name: 'Diner', kind: 'business', hours: { wk: '18:00-02:00', sat: '18:00-02:00', sun: '' } }] });
    const dent = d.contacts[1], diner = d.contacts[2];
    const at = (y, m, dd, h, mi) => new Date(y, m, dd, h, mi);
    return {
      kinds: d.contacts.map(c => c.kind).join(','), sat: dent.hours.sat,
      tueNoon: openState(dent, at(2026, 10, 24, 12, 0)).text, tueEve: openState(dent, at(2026, 10, 24, 18, 0)).text,
      friEve: openState(dent, at(2026, 10, 27, 18, 0)).text, sunAm: openState(dent, at(2026, 10, 29, 7, 0)).text,
      lateNight: openState(diner, at(2026, 10, 25, 1, 30)).text, sunLate: openState(diner, at(2026, 10, 29, 1, 0)).text,
      none: openState(d.contacts[0]), clock: [clock('00:00'), clock('12:30'), clock('17:05')].join(' ')
    };
  });
  check('old contacts are sorted into person or business by what they\'re for', ct.kinds === 'person,business,business', ct.kinds);
  check('bad hours are dropped', ct.sat === '', ct.sat);
  check('open during hours', ct.tueNoon === 'Open now · until 5 PM', ct.tueNoon);
  check('closed in the evening says when it opens', ct.tueEve === 'Closed · opens 8 AM tomorrow', ct.tueEve);
  check('Friday evening skips the closed weekend', ct.friEve === 'Closed · opens 8 AM Mon', ct.friEve);
  check('early Sunday still points to Monday', ct.sunAm === 'Closed · opens 8 AM tomorrow', ct.sunAm);
  check('open past midnight', ct.lateNight === 'Open now · until 2 AM', ct.lateNight);
  check('Saturday-night hours carry into early Sunday', ct.sunLate === 'Open now · until 2 AM', ct.sunLate);
  check('no hours, no open/closed note', ct.none === null);
  check('times read naturally', ct.clock === '12 AM 12:30 PM 5:05 PM', ct.clock);
  const veh = await p.evaluate(() => { const d = normalize({ items: [{ id: 'v', type: 'Vehicle', name: 'Car', fields: { year: '2017', make: 'Chevy', model: 'Tahoe LTZ', plate: 'X1' } }] }); return [d.items[0].fields.desc, 'year' in d.items[0].fields, vehName('2026 Chevy Silverado LTZ'), vehName('Tahoe')]; });
  check('old year, make and model become one description', veh[0] === '2017 Chevy Tahoe LTZ' && veh[1] === false, veh);
  check('a vehicle is named from its description', veh[2] === 'Silverado' && veh[3] === 'Tahoe', veh);
  console.log('errors', errs); console.log(ok, 'passed', bad, 'failed');
  await b.close(); process.exit(bad || errs.length ? 1 : 0);
})();
