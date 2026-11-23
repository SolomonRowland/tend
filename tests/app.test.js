// The iPhone app build (app/www): the daily heads-up is scheduled on the phone as local
// notifications, worded like the server's, and follows changes, the chosen hour and sign-out.
// Capacitor's LocalNotifications plugin is stood in for, the way it looks to the page in the app.
const { chromium, devices } = require('playwright');
const fs = require('fs');
const MOCK = fs.readFileSync(__dirname + '/mock-client.js', 'utf8');
const APP = 'http://localhost:8766/app/www/';
const D = __dirname + '/screenshots'; fs.mkdirSync(D, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let ok = 0, bad = 0;
function check(name, cond, extra) { if (cond) { ok++; console.log('PASS', name); } else { bad++; console.log('FAIL', name, extra === undefined ? '' : JSON.stringify(extra)); } }
async function waitFor(p, fn, arg, ms = 8000) { const t = Date.now(); while (Date.now() - t < ms) { if (await p.evaluate(fn, arg)) return true; await sleep(150); } return false; }
const FAKE_CAPACITOR = () => {
  const pending = new Map(); window.__perm = window.__perm || 'prompt'; window.__ln = pending;
  window.Capacitor = { isNativePlatform: () => true, Plugins: { LocalNotifications: {
    checkPermissions: () => Promise.resolve({ display: window.__perm }),
    requestPermissions: () => { if (window.__perm === 'prompt') window.__perm = window.__answer || 'granted'; return Promise.resolve({ display: window.__perm }); },
    schedule: (o) => { o.notifications.forEach(n => pending.set(n.id, { id: n.id, title: n.title, body: n.body, at: new Date(n.schedule.at).toISOString(), hour: new Date(n.schedule.at).getHours() })); return Promise.resolve({ notifications: o.notifications.map(n => ({ id: String(n.id) })) }); },
    getPending: () => Promise.resolve({ notifications: [...pending.values()].map(n => ({ id: n.id })) }),
    cancel: (o) => { o.notifications.forEach(n => pending.delete(n.id)); return Promise.resolve(); },
  } } };
};
const list = p => p.evaluate(() => [...window.__ln.values()].sort((a, b) => a.id - b.id));
(async () => {
  await fetch('http://localhost:8790/reset', { method: 'POST' });
  const b = await chromium.launch(); const errs = [];
  const ctx = await b.newContext({ ...devices['iPhone 13'], deviceScaleFactor: 1 });
  await ctx.addInitScript(MOCK);
  await ctx.addInitScript(() => { localStorage.setItem('tend.swipeHint', '1'); if (!localStorage.getItem('tend.profile')) localStorage.setItem('tend.profile', JSON.stringify({ first: 'Solomon', last: 'Rowland', phone: '(555) 555-0100', email: 'app@x.com', dob: '1990-03-14', prefsSet: true })); });
  await ctx.addInitScript(FAKE_CAPACITOR);
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto(APP); await p.click('[data-act=auth-mode]'); await p.fill('#authEmail', 'app@x.com'); await p.fill('#authPass', 'password123'); await p.click('#authForm button[type=submit]');
  await p.waitForSelector('#houseName'); await p.click('[data-act=house-create]'); await p.waitForSelector('.welcome [data-act=example]'); await p.click('.welcome [data-act=example]'); await p.waitForSelector('.stats');
  check('app build loads the app-only scripts', await p.evaluate(() => typeof buildDigest === 'function' && !document.querySelector('link[rel=manifest]')));
  await p.evaluate(() => go('settings', {}, true));
  check('no add-to-home-screen tip in the app', await waitFor(p, () => !!document.querySelector('[data-act=notify-on]:not([disabled])')) && !/Add to Home Screen/.test(await p.textContent('#view')));
  check('nothing scheduled before turning on', (await list(p)).length === 0);
  await p.click('[data-act=notify-on]');
  check('turned on', await waitFor(p, () => N.state === 'on'));
  check('heads-ups scheduled', await waitFor(p, () => window.__ln.size > 0));
  let L = await list(p);
  const want = await p.evaluate(() => { const t = new Date(); t.setDate(t.getDate() + 1); return buildDigest(scheduleSnapshot(db), iso(t), 'Solomon Rowland', C.user.id); });
  check('at 8:00 AM by default, up to two weeks out', L.every(n => n.hour === 8) && L.length >= 13 && L.length <= 14, L.map(n => n.at));
  check('worded like the server heads-up', L.find(n => n.id === 1001) && L.find(n => n.id === 1001).title === want.title && L.find(n => n.id === 1001).body === want.body, [L.find(n => n.id === 1001), want]);
  await p.evaluate(() => { document.querySelector('[data-act=notify-hour]').scrollIntoView(); view.scrollTop -= 160; });
  await p.screenshot({ path: D + '/app-notify-on.png' });
  // the hour changes
  await p.click('[data-act=notify-hour][data-v="19"]');
  check('moved to 7:00 PM', await waitFor(p, () => window.__ln.size > 0 && [...window.__ln.values()].every(n => n.hour === 19)));
  check('hour remembered', await p.evaluate(() => JSON.parse(localStorage.getItem('tend.native.notify')).hour === 19));
  // finishing everything overdue changes tomorrow's wording
  const before = (await list(p)).find(n => n.id === 1001);
  await p.evaluate(() => { db.tasks.forEach(t => { t.active = false; }); save(); });
  check('list change reschedules', await waitFor(p, () => window.__ln.size === 0), await list(p));
  await p.evaluate(() => { db.tasks.forEach(t => { t.active = true; }); save(); });
  check('and back again', await waitFor(p, () => window.__ln.size > 0));
  check('same wording as before', JSON.stringify((await list(p)).find(n => n.id === 1001)) === JSON.stringify(before));
  // a test
  await p.click('[data-act=notify-test]');
  check('test scheduled in a few seconds', await waitFor(p, () => window.__ln.has(999) && new Date(window.__ln.get(999).at) - Date.now() < 7000));
  // turning off
  await p.evaluate(() => window.__ln.delete(999));
  await p.click('[data-act=notify-off]');
  check('turned off clears them', await waitFor(p, () => N.state === 'off' && window.__ln.size === 0));
  await p.click('[data-act=notify-on]');
  check('on again', await waitFor(p, () => window.__ln.size > 0));
  // signing out stops them
  await p.evaluate(() => signOut());
  check('sign-out clears them', await waitFor(p, () => window.__ln.size === 0 && !JSON.parse(localStorage.getItem('tend.native.notify')).on));
  // blocked in iPhone Settings
  const q = await ctx.newPage(); q.on('pageerror', e => errs.push(e.message));
  await q.addInitScript(() => { window.__perm = 'denied'; });
  await q.goto(APP); await q.fill('#authEmail', 'app@x.com'); await q.fill('#authPass', 'password123');
  if ((await q.textContent('#authForm button[type=submit]')) !== 'Sign In') await q.click('[data-act=auth-mode]');
  await q.fill('#authEmail', 'app@x.com'); await q.fill('#authPass', 'password123'); await q.click('#authForm button[type=submit]');
  await waitFor(q, () => window.db && db.tasks.length > 10);
  await q.evaluate(() => go('settings', {}, true));
  check('blocked: points to iPhone Settings', await waitFor(q, () => /Settings → Notifications → Tend/.test(document.querySelector('#view').textContent)));
  check('no page errors', errs.length === 0, errs);
  await b.close();
  console.log(ok, 'passed', bad, 'failed'); process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
