// Photos: one phone adds a photo to a task, the other phone sees it; deleting it removes it for both.
const { chromium, devices } = require('playwright');
const fs = require('fs');
const MOCK = fs.readFileSync(__dirname + '/mock-client.js', 'utf8');
const APP = 'http://localhost:8766/';
const D = __dirname + '/screenshots'; fs.mkdirSync(D, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let ok = 0, bad = 0;
function check(name, cond, extra) { if (cond) { ok++; console.log('PASS', name); } else { bad++; console.log('FAIL', name, extra === undefined ? '' : JSON.stringify(extra)); } }
async function waitFor(p, fn, arg, ms = 8000) { const t = Date.now(); while (Date.now() - t < ms) { if (await p.evaluate(fn, arg)) return true; await sleep(150); } return false; }
(async () => {
  await fetch('http://localhost:8790/reset', { method: 'POST' });
  const b = await chromium.launch(); const errs = [];
  async function phone(first) {
    const ctx = await b.newContext({ ...devices['iPhone 13'], deviceScaleFactor: 1 });
    await ctx.addInitScript(MOCK);
    await ctx.addInitScript(f => { localStorage.setItem('tend.swipeHint', '1'); if (!localStorage.getItem('tend.profile')) localStorage.setItem('tend.profile', JSON.stringify({ first: f, last: 'Lee', phone: '(555) 555-0100', email: f + '@x.com', dob: '1990-03-14', prefsSet: true })); }, first);
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(first + ': ' + e.message)); return p;
  }
  const A = await phone('Solomon');
  await A.goto(APP); await A.click('[data-act=auth-mode]'); await A.fill('#authEmail', 'sol@x.com'); await A.fill('#authPass', 'password123'); await A.click('#authForm button[type=submit]');
  await A.waitForSelector('#houseName'); await A.click('[data-act=house-create]'); await A.waitForSelector('.welcome [data-act=example]'); await A.click('.welcome [data-act=example]'); await A.waitForSelector('.stats');
  await A.evaluate(() => go('settings', {}, true)); await A.click('[data-act=invite]'); await A.waitForSelector('.clink'); const link = await A.evaluate(() => C.inviteLink);
  const B = await phone('Kelly');
  await B.goto(link); await B.fill('#authEmail', 'kelly@x.com'); await B.fill('#authPass', 'password456'); await B.click('#authForm button[type=submit]');
  await waitFor(B, () => window.db && db.tasks.length > 10);
  const tid = await A.evaluate(() => db.tasks.find(t => t.name.indexOf('furnace') >= 0 || t.name.indexOf('Furnace') >= 0).id);
  await A.evaluate(id => go('task', { taskId: id }, true), tid);
  check('empty photo prompt', await A.$('.photoempty') !== null);
  await A.evaluate(() => { const el = document.querySelector('.photoempty'); el.scrollIntoView(); });
  await A.screenshot({ path: D + '/photo-1-empty.png' });
  const [fc] = await Promise.all([A.waitForEvent('filechooser'), A.click('.photoempty')]);
  await fc.setFiles(__dirname + '/fixtures/photo.jpg');
  check('photo saved on task', await waitFor(A, id => db.tasks.find(t => t.id === id).photos.length === 1, tid));
  const path = await A.evaluate(id => db.tasks.find(t => t.id === id).photos[0].p, tid);
  check('photo path is household/task/file', new RegExp('^[0-9a-f-]{36}/' + tid + '/\\w+\\.jpg$').test(path), path);
  check('thumbnail shows on A', await waitFor(A, () => { const i = document.querySelector('.ph img'); return i && i.complete && i.naturalWidth > 0; }));
  await A.evaluate(() => { document.querySelector('.photos').scrollIntoView(); }); await A.screenshot({ path: D + '/photo-2-added.png' });
  check('B gets photo record', await waitFor(B, id => (db.tasks.find(t => t.id === id).photos || []).length === 1, tid));
  await B.evaluate(id => go('task', { taskId: id }, true), tid);
  check('thumbnail loads on B', await waitFor(B, () => { const i = document.querySelector('.ph img'); return i && i.complete && i.naturalWidth > 0; }));
  const w = await B.evaluate(() => document.querySelector('.ph img').naturalWidth);
  check('photo is resized to 1600 or less', w > 0 && w <= 1600, w);
  await B.click('.ph'); await B.waitForSelector('.viewer img');
  await B.screenshot({ path: D + '/photo-3-viewer.png' });
  await B.click('[data-act=photo-del]'); await B.click('[data-act=photo-del]');
  check('B deleted it', await B.evaluate(id => db.tasks.find(t => t.id === id).photos.length === 0, tid));
  check('A sees it gone', await waitFor(A, id => db.tasks.find(t => t.id === id).photos.length === 0, tid));
  // belonging photo
  const bid = await A.evaluate(() => db.items[0].id);
  await A.evaluate(id => go('item', { itemId: id }, true), bid);
  const [fc2] = await Promise.all([A.waitForEvent('filechooser'), A.click('.photoempty')]);
  await fc2.setFiles(__dirname + '/fixtures/photo.jpg');
  check('belonging photo saved', await waitFor(A, id => db.items.find(x => x.id === id).photos.length === 1, bid));
  check('B gets belonging photo', await waitFor(B, id => (db.items.find(x => x.id === id).photos || []).length === 1, bid));
  console.log('errors', errs); console.log(ok, 'passed', bad, 'failed');
  await b.close(); process.exit(bad || errs.length ? 1 : 0);
})();
