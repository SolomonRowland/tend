const { chromium, devices } = require('playwright');
const fs = require('fs');
const MOCK = fs.readFileSync(__dirname + '/mock-client.js', 'utf8');
const APP = 'http://localhost:8766/';
const D = process.argv[2] || __dirname + '/screenshots';
fs.mkdirSync(D, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let ok = 0, bad = 0;
function check(name, cond, extra) { if (cond) { ok++; console.log('PASS', name); } else { bad++; console.log('FAIL', name, extra === undefined ? '' : JSON.stringify(extra)); } }
async function waitFor(p, fn, arg, ms = 8000) { const t = Date.now(); while (Date.now() - t < ms) { if (await p.evaluate(fn, arg)) return true; await sleep(150); } return false; }
(async () => {
  await fetch('http://localhost:8790/reset', { method: 'POST' });
  const b = await chromium.launch(); const errs = [];
  async function phone(first, last) {
    const ctx = await b.newContext({ ...devices['iPhone 13'], deviceScaleFactor: 1 });
    await ctx.addInitScript(MOCK);
    await ctx.addInitScript(([f, l]) => { if (!localStorage.getItem('tend.profile')) localStorage.setItem('tend.profile', JSON.stringify({ first: f, last: l, phone: '(630) 555-0100', email: f.toLowerCase() + '@x.com', dob: '1990-03-14', prefsSet: true })); }, [first, last]);
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(first + ': ' + e.message));
    return p;
  }
  const A = await phone('Solomon', 'Rowland');
  await A.goto(APP);
  await A.waitForSelector('#authForm'); await A.screenshot({ path: D + '/1-signin.png' });
  await A.click('[data-act=auth-mode]'); await A.fill('#authEmail', 'sol@x.com'); await A.fill('#authPass', 'short'); await A.click('#authForm button[type=submit]');
  check('short password rejected', /8 characters/.test(await A.textContent('.cerr')));
  await A.fill('#authPass', 'password123'); await A.click('#authForm button[type=submit]');
  await A.waitForSelector('#houseName'); await A.screenshot({ path: D + '/2-household.png' });
  check('house name default', (await A.inputValue('#houseName')) === 'The Rowland Home');
  await A.click('[data-act=house-create]');
  await A.waitForSelector('.welcome [data-act=restore]'); await A.screenshot({ path: D + '/3-welcome.png' });
  await A.click('.welcome [data-act=example]');
  await A.waitForSelector('.stats'); await sleep(1500);
  const nA = await A.evaluate(() => db.tasks.length);
  check('owner data pushed', await A.evaluate(() => pendingCount() === 0), await A.evaluate(() => pendingCount()));
  // settings + invite
  await A.evaluate(() => go('settings', {}, true)); await A.click('[data-act=invite]'); await A.waitForSelector('.clink');
  const link = await A.evaluate(() => C.inviteLink); check('invite link', /\?join=/.test(link), link);
  await A.screenshot({ path: D + '/4-settings.png' });
  // Kelly
  const B = await phone('Kelly', 'Rowland');
  await B.goto(link); await B.waitForSelector('#authForm');
  check('invite note shown', /invited/.test(await B.textContent('.welcome')));
  await B.screenshot({ path: D + '/5-kelly-invited.png' });
  await B.fill('#authEmail', 'kelly@x.com'); await B.fill('#authPass', 'password456'); await B.click('#authForm button[type=submit]');
  check('kelly joined and sees list', await waitFor(B, n => window.db && db.tasks.length === n + 1, nA), await B.evaluate(() => [C.hid, C.err, window.db && db.tasks.length]));
  await B.screenshot({ path: D + '/6-kelly-home.png' });
  check('url cleaned', !/join=/.test(B.url()));
  check('kelly birthday separate', await waitFor(B, () => db.tasks.filter(t => t.auto === 'birthday').length === 2));
  check('A gets kelly birthday', await waitFor(A, () => db.tasks.some(t => t.auto === 'birthday' && t.who === 'Kelly')));
  check('members both', await waitFor(A, () => db.members.indexOf('Kelly') >= 0 && db.members.indexOf('Solomon') >= 0));
  // Kelly ticks first task on home
  await B.evaluate(() => { localStorage.setItem('tend.swipeHint', '1'); go('home'); });
  const tid = await B.evaluate(() => document.querySelector('.row.split .tick').getAttribute('data-id'));
  await B.click('.row.split .tick');
  check('A sees Kelly completion', await waitFor(A, id => { const t = db.tasks.find(x => x.id === id); return t && t.history[0] && t.history[0].by === 'Kelly'; }, tid), tid);
  check('A screen rerendered', await waitFor(A, () => { const s = document.querySelector('#view').innerText; return true; }));
  // A creates a task via the form
  await A.evaluate(() => go('list', { filter: 'all', cat: '', q: '' })); await A.click('[data-act=new-task]');
  await A.fill('input[name=name]', 'Check foundation crack'); await A.screenshot({ path: D + '/7-a-newtask.png' });
  await A.click('.headrow [data-act=save-task]');
  check('B gets new task', await waitFor(B, () => db.tasks.some(t => t.name === 'Check foundation crack')));
  const newId = await A.evaluate(() => db.tasks.find(t => t.name === 'Check foundation crack').id);
  check('random id', !/^t\d+$/.test(newId), newId);
  // B is editing while A changes something: B form must not be wiped
  await B.evaluate(id => go('task', { taskId: id }, true), newId); await B.click('[data-act=edit-task]'); await B.fill('input[name=name]', 'Check foundation crack (north wall)');
  await A.evaluate(() => { const t = db.tasks.find(x => x.name === 'Rotate tires') || db.tasks[3]; t.notes = 'changed by A'; save(); });
  await sleep(2500);
  check('B form kept while editing', (await B.inputValue('input[name=name]')) === 'Check foundation crack (north wall)');
  await B.click('.headrow [data-act=save-task]');
  check('A gets B rename', await waitFor(A, id => db.tasks.find(t => t.id === id).name === 'Check foundation crack (north wall)', newId));
  // offline edits on both, same task -> history merged
  const cid = await A.evaluate(() => db.tasks.find(t => t.active && !t.auto && t.history.length === 0 && t.freq !== 'One-time').id);
  await B.evaluate(() => { window.__offline = true; });
  await B.evaluate(id => { const t = db.tasks.find(x => x.id === id); t.history.unshift({ date: '2026-11-10', by: 'Kelly' }); t.last = '2026-11-10'; save(); }, cid);
  await B.evaluate(() => { const t = db.tasks.find(x => x.name === 'Check foundation crack (north wall)'); t.notes = 'offline note from Kelly'; save(); });
  await sleep(1200);
  check('B shows pending offline', await B.evaluate(() => pendingCount() >= 2 && !C.online), await B.evaluate(() => [pendingCount(), C.online]));
  await B.evaluate(() => go('settings', {}, true)); await B.screenshot({ path: D + '/8-kelly-offline.png' });
  await A.evaluate(id => { const t = db.tasks.find(x => x.id === id); t.history.unshift({ date: '2026-11-12', by: 'Solomon' }); t.last = '2026-11-12'; save(); }, cid);
  await sleep(1500);
  await B.evaluate(() => { window.__offline = false; window.dispatchEvent(new Event('online')); });
  const merged = id => { const t = db.tasks.find(x => x.id === id); return t.history.length === 2 && t.last === '2026-11-12'; };
  check('B merged history', await waitFor(B, merged, cid), await B.evaluate(id => db.tasks.find(x => x.id === id).history, cid));
  check('A merged history', await waitFor(A, merged, cid), await A.evaluate(id => db.tasks.find(x => x.id === id).history, cid));
  check('A got offline note', await waitFor(A, () => db.tasks.some(t => t.notes === 'offline note from Kelly')));
  check('both settled', await waitFor(B, () => pendingCount() === 0) && await waitFor(A, () => pendingCount() === 0));
  // deletion
  await A.evaluate(id => { db.tasks = db.tasks.filter(t => t.id !== id); save(); }, newId);
  check('B sees delete', await waitFor(B, id => !db.tasks.some(t => t.id === id), newId));
  // same totals + identical data
  await sleep(1000);
  const sig = () => JSON.stringify(db.tasks.map(t => stable(t)).sort()) + JSON.stringify(db.contacts.map(stable).sort()) + JSON.stringify(db.items.map(stable).sort());
  check('A and B identical', (await A.evaluate(sig)) === (await B.evaluate(sig)));
  // no ping-pong: calls stop growing
  const c1 = await A.evaluate(() => window.__calls); await sleep(3000); const c2 = await A.evaluate(() => window.__calls);
  check('quiet when idle', c2 - c1 <= 1, [c1, c2]);
  // reload keeps session + data
  await B.reload(); check('B reload signed in with data', await waitFor(B, n => window.db && C.hid && db.tasks.length > 10, 0));
  // remove member and stranger
  await A.evaluate(() => { C.membersAt = 0; go('settings', {}, true); }); await sleep(800);
  await A.screenshot({ path: D + '/9-owner-settings.png', fullPage: false });
  const S = await phone('Stranger', 'X'); await S.goto(APP + '?join=' + link.split('join=')[1]);
  await S.fill('#authEmail', 'st@x.com'); await S.fill('#authPass', 'password789'); await S.click('#authForm button[type=submit]');
  await S.waitForSelector('#houseName');
  check('used invite rejected', /expired or was already used/.test(await S.textContent('.welcome')), await S.textContent('.welcome'));
  await S.screenshot({ path: D + '/10-stranger.png' });
  console.log('errors', errs); console.log(ok, 'passed', bad, 'failed');
  await b.close();
  process.exit(bad ? 1 : 0);
})();
