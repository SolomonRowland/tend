// Daily heads-up: turning it on saves this phone, the hour can change, a test can be sent,
// turning it off removes the phone, and the household schedule the server reads stays current.
const { chromium, devices } = require('playwright');
const fs = require('fs');
const MOCK = fs.readFileSync(__dirname + '/mock-client.js', 'utf8');
const APP = 'http://localhost:8766/home/';
const D = __dirname + '/screenshots'; fs.mkdirSync(D, { recursive: true });
const src = fs.readFileSync(__dirname + '/../home/supabase/functions/tend-notify/index.ts', 'utf8');
const { buildDigest } = new Function(src.split('// --- digest start')[1].split('// --- digest end ---')[0].replace(/^[^\n]*\n/, '') + '; return { buildDigest };')();
const sleep = ms => new Promise(r => setTimeout(r, ms));
let ok = 0, bad = 0;
function check(name, cond, extra) { if (cond) { ok++; console.log('PASS', name); } else { bad++; console.log('FAIL', name, extra === undefined ? '' : JSON.stringify(extra)); } }
async function waitFor(p, fn, arg, ms = 8000) { const t = Date.now(); while (Date.now() - t < ms) { if (await p.evaluate(fn, arg)) return true; await sleep(150); } return false; }
const FAKE_PUSH = () => {
  let sub = null;
  const make = () => ({ endpoint: 'https://push.example/' + Math.random().toString(36).slice(2), toJSON() { return { endpoint: this.endpoint, keys: { p256dh: 'p256-test', auth: 'auth-test' } }; }, unsubscribe() { sub = null; return Promise.resolve(true); } });
  if (window.PushManager) {
    PushManager.prototype.getSubscription = function () { return Promise.resolve(sub); };
    PushManager.prototype.subscribe = function (o) { window.__appKeyLen = o.applicationServerKey.length; sub = make(); return Promise.resolve(sub); };
  }
  if (window.Notification) { Object.defineProperty(Notification, 'permission', { get: () => window.__perm || 'default' }); Notification.requestPermission = () => { window.__perm = 'granted'; return Promise.resolve('granted'); }; }
  if (window.__standalone) Object.defineProperty(navigator, 'standalone', { get: () => true });
};
(async () => {
  await fetch('http://localhost:8790/reset', { method: 'POST' });
  const b = await chromium.launch(); const errs = [];
  async function phone(first, standalone) {
    const ctx = await b.newContext({ ...devices['iPhone 13'], deviceScaleFactor: 1 });
    await ctx.grantPermissions(['notifications'], { origin: 'http://localhost:8766' });
    await ctx.addInitScript(MOCK);
    await ctx.addInitScript(([f, s]) => { window.__standalone = s; localStorage.setItem('tend.tickHint', '1'); if (!localStorage.getItem('tend.profile')) localStorage.setItem('tend.profile', JSON.stringify({ first: f, last: 'Rowland', phone: '(630) 555-0100', email: f + '@x.com', dob: '1990-03-14', prefsSet: true })); }, [first, standalone]);
    await ctx.addInitScript(FAKE_PUSH);
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(first + ': ' + e.message)); return p;
  }
  const A = await phone('Solomon', false);
  await A.goto(APP); await A.click('[data-act=auth-mode]'); await A.fill('#authEmail', 'sol@x.com'); await A.fill('#authPass', 'password123'); await A.click('#authForm button[type=submit]');
  await A.waitForSelector('#houseName'); await A.click('[data-act=house-create]'); await A.waitForSelector('.welcome [data-act=example]'); await A.click('.welcome [data-act=example]'); await A.waitForSelector('.stats');
  await A.evaluate(() => go('settings', {}, true)); await sleep(500);
  check('Safari shows the add-to-home-screen tip', /Add to Home Screen/.test(await A.textContent('#view')));
  await A.evaluate(() => { [...document.querySelectorAll('.section h2')].find(h => h.textContent === 'Notifications').scrollIntoView(); view.scrollTop -= 80; });
  await A.screenshot({ path: D + '/notify-1-safari.png' });
  // the same person, opened from the Home Screen
  const H = await phone('Solomon', true);
  await H.goto(APP); await H.fill('#authEmail', 'sol@x.com'); await H.fill('#authPass', 'password123');
  await H.click('[data-act=auth-mode]').catch(() => {}); if (await H.$('#authPass')) { await H.fill('#authEmail', 'sol@x.com'); await H.fill('#authPass', 'password123'); }
  if ((await H.textContent('#authForm button[type=submit]')) !== 'Sign In') await H.click('[data-act=auth-mode]');
  await H.fill('#authEmail', 'sol@x.com'); await H.fill('#authPass', 'password123'); await H.click('#authForm button[type=submit]');
  check('home-screen app loads household', await waitFor(H, () => window.db && db.tasks.length > 10));
  await H.evaluate(() => go('settings', {}, true));
  check('turn-on button shows', await waitFor(H, () => !!document.querySelector('[data-act=notify-on]:not([disabled])')), await H.evaluate(() => N));
  await H.evaluate(() => { document.querySelector('[data-act=notify-on]').scrollIntoView(); view.scrollTop -= 120; });
  await H.screenshot({ path: D + '/notify-2-off.png' });
  await H.click('[data-act=notify-on]');
  check('turned on', await waitFor(H, () => N.state === 'on'), await H.evaluate(() => N));
  check('server key passed to subscribe', (await H.evaluate(() => window.__appKeyLen)) === 65, await H.evaluate(() => window.__appKeyLen));
  const rows = async () => (await (await fetch('http://localhost:8790/q', { method: 'POST', body: JSON.stringify({ token: null, q: { op: 'rpc', fn: 'is_member', args: { hid: '00000000-0000-0000-0000-000000000000' } } }) })).json());
  const sub = await H.evaluate(() => C.sb.from('push_subs').select('endpoint, hour, tz, household_id').then(r => r.data));
  check('phone saved for this person', sub.length === 1 && sub[0].hour === 8 && sub[0].tz && sub[0].household_id === (await H.evaluate(() => C.hid)), sub);
  await H.evaluate(() => { document.querySelector('[data-act=notify-hour]').scrollIntoView(); view.scrollTop -= 160; });
  await H.screenshot({ path: D + '/notify-3-on.png' });
  await H.click('[data-act=notify-hour][data-v="19"]');
  check('hour changed', await waitFor(H, () => C.sb.from('push_subs').select('hour').then(r => r.data[0].hour === 19)));
  await H.click('[data-act=notify-test]');
  check('test sent', await waitFor(H, () => /Test sent/.test(document.querySelector('#view').innerText)));
  // other people can't see this phone
  const K = await phone('Kelly', true);
  await K.goto(APP); if ((await K.textContent('#authForm button[type=submit]')) !== 'Create Account') await K.click('[data-act=auth-mode]');
  await K.fill('#authEmail', 'kelly@x.com'); await K.fill('#authPass', 'password456'); await K.click('#authForm button[type=submit]');
  await K.waitForSelector('#houseName');
  check('others cannot see your phones', (await K.evaluate(() => C.sb.from('push_subs').select('endpoint').then(r => r.data.length))) === 0);
  // the schedule the server reads is there and matches
  const sched = await H.evaluate(() => C.sb.from('records').select('data').eq('kind', 'meta').eq('id', 'schedule').then(r => r.data[0] && r.data[0].data));
  check('schedule synced for the server', sched && sched.tasks.length > 50, sched && sched.tasks.length);
  const today = await H.evaluate(() => iso(today()));
  const dg = buildDigest(sched, today);
  const overdue = await H.evaluate(() => rows().filter(r => r.i.status === 'overdue').length);
  check('heads-up matches the app', dg && dg.title.startsWith(overdue + ' things are overdue'), [dg && dg.title, overdue]);
  console.log('   sample:', dg.title, '|', dg.body);
  // completing a task updates the schedule
  const before = JSON.stringify(sched);
  await H.evaluate(() => { const t = db.tasks.find(x => info(x).status === 'overdue'); t.history.unshift({ date: iso(today()), by: 'Solomon' }); t.last = iso(today()); save(); });
  check('schedule follows changes', await waitFor(H, b => C.sb.from('records').select('data').eq('kind', 'meta').eq('id', 'schedule').then(r => JSON.stringify(r.data[0].data) !== b), before));
  await H.click('[data-act=notify-off]');
  check('turned off and removed', await waitFor(H, () => N.state === 'off') && (await H.evaluate(() => C.sb.from('push_subs').select('endpoint').then(r => r.data.length))) === 0);
  // signing out stops that phone's heads-up (so the next person on the phone doesn't get yours)
  await H.click('[data-act=notify-on]'); await waitFor(H, () => N.state === 'on');
  const { Client } = require('pg'); const pg = new Client({ host: '127.0.0.1', user: 'postgres', password: 'pg', database: 'tendtest' }); await pg.connect();
  const nSubs = async () => (await pg.query('select count(*)::int as n from public.push_subs')).rows[0].n;
  check('phone on before sign-out', (await nSubs()) === 1);
  await H.evaluate(() => signOut()); await waitFor(H, () => !C.user);
  check('sign-out removes the phone', (await nSubs()) === 0);
  await pg.end();
  console.log('errors', errs); console.log(ok, 'passed', bad, 'failed');
  await b.close(); process.exit(bad || errs.length ? 1 : 0);
})();
