// Swipe to complete/snooze, "Whose job is it?", Recently done, undo that only touches its own task,
// a delete that isn't lost to a housemate's edit, moving over from the original Tend, and old links forwarding.
const { chromium, devices } = require('playwright');
const fs = require('fs');
const MOCK = fs.readFileSync(__dirname + '/mock-client.js', 'utf8');
const ROOT = 'http://localhost:8766/', APP = ROOT;
const D = __dirname + '/screenshots'; fs.mkdirSync(D, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let ok = 0, bad = 0;
function check(name, cond, extra) { if (cond) { ok++; console.log('PASS', name); } else { bad++; console.log('FAIL', name, extra === undefined ? '' : JSON.stringify(extra)); } }
async function waitFor(p, fn, arg, ms = 8000) { const t = Date.now(); while (Date.now() - t < ms) { if (await p.evaluate(fn, arg)) return true; await sleep(150); } return false; }
// a finger drag across an element, as real touch events
async function swipe(p, sel, dx, dy) {
  await p.evaluate(async ([sel, dx, dy]) => {
    const el = document.querySelector(sel), r = el.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
    const tp = (cx, cy) => new Touch({ identifier: 1, target: el, clientX: cx, clientY: cy });
    const fire = (type, cx, cy) => el.dispatchEvent(new TouchEvent(type, { bubbles: true, cancelable: true, touches: type === 'touchend' ? [] : [tp(cx, cy)], changedTouches: [tp(cx, cy)] }));
    fire('touchstart', x, y);
    for (let i = 1; i <= 8; i++) { fire('touchmove', x + dx * i / 8, y + dy * i / 8); await new Promise(r => setTimeout(r, 16)); }
    fire('touchend', x + dx, y + dy);
  }, [sel, dx, dy]);
}
(async () => {
  await fetch('http://localhost:8790/reset', { method: 'POST' });
  const b = await chromium.launch(); const errs = [];
  async function phone(first, extra) {
    const ctx = await b.newContext({ ...devices['iPhone 13'], deviceScaleFactor: 1 });
    await ctx.addInitScript(MOCK);
    await ctx.addInitScript(([f, x]) => {
      localStorage.setItem('tend.swipeHint', '1');
      if (!localStorage.getItem('tend.profile')) localStorage.setItem('tend.profile', JSON.stringify({ first: f, last: 'Rowland', phone: '(630) 555-0100', email: f + '@x.com', dob: '1990-03-14', prefsSet: true }));
      if (x && !localStorage.getItem('tend.data.v1')) localStorage.setItem('tend.data.v1', x);
    }, [first, extra || null]);
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(first + ': ' + e.message)); return p;
  }
  // ---- moving over from the original Tend ----
  const old = JSON.stringify({ app: 'tend', version: 1, user: 'Solomon', members: ['Solomon'], tasks: [
    { id: 't1', name: 'Replace furnace filter', cat: 'Home', freq: 'Quarterly', last: '2026-08-01', early: 14, history: [{ date: '2026-08-01', by: 'Solomon' }] },
    { id: 't2', name: 'Rotate tires', cat: 'Vehicles', freq: 'Every 6 months', last: '2026-06-10', early: 14, history: [] },
    { id: 't3', name: 'Clean dryer vent', cat: 'Home', freq: 'Yearly', last: '2025-10-01', early: 30, history: [] }], contacts: [], items: [] });
  const A = await phone('Solomon', old);
  await A.goto(ROOT + 'home/');
  check('the old Tend Home address opens Tend', await waitFor(A, () => location.pathname === '/' && !!document.querySelector('#authForm')), A.url());
  await A.click('[data-act=auth-mode]'); await A.fill('#authEmail', 'sol@x.com'); await A.fill('#authPass', 'password123'); await A.click('#authForm button[type=submit]');
  await A.waitForSelector('#houseName'); await A.click('[data-act=house-create]');
  await A.waitForSelector('.welcome [data-act=bring-old]');
  check('offers the list from the original Tend', /3 tasks/.test(await A.textContent('.welcome')));
  await A.screenshot({ path: D + '/feat-1-bring-over.png' });
  await A.click('[data-act=bring-old]');
  check('original list brought over', await waitFor(A, () => window.db && db.tasks.length >= 3 && db.tasks.some(t => t.name === 'Rotate tires')));
  check('and shared', await waitFor(A, () => pendingCount() === 0));
  check('original copy left in place as a backup', await A.evaluate(() => !!localStorage.getItem('tend.data.v1')));
  // fill in more to work with
  await A.evaluate(() => { loadExample(); }); await waitFor(A, () => pendingCount() === 0);
  // ---- Kelly joins ----
  await A.evaluate(() => go('settings', {}, true)); await A.click('[data-act=invite]'); await A.waitForSelector('.clink');
  const link = await A.evaluate(() => C.inviteLink);
  const B = await phone('Kelly');
  await B.goto(link.replace(ROOT, ROOT + 'home/')); // an invite sent before the move still works
  await B.waitForURL(ROOT); await B.waitForSelector('#authForm'); await B.fill('#authEmail', 'kelly@x.com'); await B.fill('#authPass', 'password456'); await B.click('#authForm button[type=submit]');
  check('Kelly joined', await waitFor(B, () => window.db && db.tasks.length > 10 && db.members.indexOf('Solomon') >= 0));
  check('Solomon sees Kelly as a member', await waitFor(A, () => db.members.indexOf('Kelly') >= 0));
  // ---- swipe right to complete ----
  await A.evaluate(() => go('home'));
  await A.waitForSelector('.swipe');
  const sid = await A.evaluate(() => document.querySelector('.swipe').getAttribute('data-id'));
  await swipe(A, '.swipe .row', 0, 160); // mostly downward: that's a scroll, not a swipe
  await sleep(300);
  check('a scroll is not a swipe', await A.evaluate(id => { const t = db.tasks.find(x => x.id === id); return !t.history[0] || t.history[0].date !== iso(today()); }, sid));
  await swipe(A, '.swipe .row', 220, 6);
  check('swipe right marks it done', await waitFor(A, id => { const t = db.tasks.find(x => x.id === id); return t.history[0] && t.history[0].date === iso(today()) && t.history[0].by === 'Solomon' && !!t.history[0].at; }, sid));
  check('with Undo', await waitFor(A, () => !!document.querySelector('[data-act=undo-toast]')));
  await A.screenshot({ path: D + '/feat-2-swiped.png' });
  // ---- Undo only touches its own task, even if Kelly changed something meanwhile ----
  await B.evaluate(() => { const t = { id: newId('t'), name: 'Kelly new task', cat: 'Home', who: '', freq: 'Yearly', first: iso(addDays(today(), 40)), early: 7, active: true, history: [] }; db.tasks.push(t); db = normalize(db); save(); });
  check('Kelly\'s new task reached Solomon', await waitFor(A, () => db.tasks.some(t => t.name === 'Kelly new task')));
  await A.click('[data-act=undo-toast]');
  check('undo puts the task back', await waitFor(A, id => { const t = db.tasks.find(x => x.id === id); return !t.history[0] || t.history[0].date !== iso(today()); }, sid));
  await sleep(1500);
  check('undo kept Kelly\'s new task', await A.evaluate(() => db.tasks.some(t => t.name === 'Kelly new task')));
  check('Kelly still has it too', await waitFor(B, () => db.tasks.some(t => t.name === 'Kelly new task')));
  // ---- swipe left to snooze ----
  await A.evaluate(() => go('list', { filter: 'upcoming', cat: '', q: '' }));
  await A.waitForSelector('.swipe[data-snooze="1"]');
  const zid = await A.evaluate(() => document.querySelector('.swipe[data-snooze="1"]').getAttribute('data-id'));
  await A.evaluate(id => { document.querySelector('.swipe[data-id="' + id + '"]').scrollIntoView({ block: 'center' }); }, zid);
  await swipe(A, '.swipe[data-id="' + zid + '"] .row', -220, 4);
  check('swipe left snoozes a week', await waitFor(A, id => db.tasks.find(x => x.id === id).snooze === iso(addDays(today(), 7)), zid));
  check('Kelly sees the snooze', await waitFor(B, id => db.tasks.find(x => x.id === id).snooze === iso(addDays(today(), 7)), zid));
  // a short drag snaps back and does nothing
  const nid = await A.evaluate(() => document.querySelector('.swipe .row') && document.querySelector('.swipe').getAttribute('data-id'));
  const nh = await A.evaluate(id => JSON.stringify(db.tasks.find(x => x.id === id)), nid);
  await swipe(A, '.swipe[data-id="' + nid + '"] .row', 50, 0); await sleep(400);
  check('a short drag does nothing', (await A.evaluate(id => JSON.stringify(db.tasks.find(x => x.id === id)), nid)) === nh);
  check('and doesn\'t open the task', await A.evaluate(() => ui.screen === 'list'));
  // ---- whose job is it ----
  const jid = await A.evaluate(() => db.tasks.find(t => t.active && !t.auto && info(t).due).id);
  await A.evaluate(id => go('task', { taskId: id }, true), jid); await A.click('[data-act=edit-task]');
  check('Whose Job field offered', !!(await A.$('select[name=owner]')));
  await A.selectOption('select[name=owner]', 'Kelly'); await A.screenshot({ path: D + '/feat-3-whose-job.png' });
  await A.click('.headrow [data-act=save-task]');
  check('assigned to Kelly', await A.evaluate(id => db.tasks.find(x => x.id === id).owner === 'Kelly', jid));
  check('Kelly sees it is hers', await waitFor(B, id => db.tasks.find(x => x.id === id).owner === 'Kelly', jid));
  check('detail says whose job', /Kelly’s job/.test(await A.textContent('.head .eyebrow')));
  await B.evaluate(id => go('task', { taskId: id }, true), jid);
  check('Kelly\'s phone says it\'s hers', /Your job/.test(await B.textContent('.head .eyebrow')));
  const sched = await A.evaluate(() => C.sb.from('records').select('data').eq('kind', 'meta').eq('id', 'schedule').then(r => r.data[0].data));
  check('the server knows whose job it is', sched.tasks.some(r => r[0] === jid && r[5] === 'Kelly'));
  await A.evaluate(() => go('list', { filter: 'all', cat: '', q: '' }));
  const allN = await A.evaluate(() => document.querySelectorAll('#results [data-act=task]').length);
  await A.click('[data-act=mine]');
  const mineN = await A.evaluate(() => document.querySelectorAll('#results [data-act=task]').length);
  check('Just Mine hides Kelly\'s jobs', mineN === allN - 1 && !(await A.$('#results [data-id="' + jid + '"]')), [allN, mineN]);
  await A.screenshot({ path: D + '/feat-4-just-mine.png' });
  await A.click('[data-act=mine]');
  // ---- steps and instructions ----
  const pid = await A.evaluate(() => db.tasks.find(t => t.active && !t.auto && info(t).due && info(t).status !== 'done').id);
  await A.evaluate(id => go('task', { taskId: id }, true), pid); await A.click('[data-act=edit-task]');
  await A.fill('textarea[name=stepsText]', '- Add chlorine\n2. Lower the water\n\nPut on the cover');
  await A.fill('textarea[name=how]', 'Use the blue jug in the shed.');
  await A.click('.headrow [data-act=save-task]');
  check('steps saved', await A.evaluate(id => JSON.stringify(db.tasks.find(x => x.id === id).steps) === JSON.stringify([{ t: 'Add chlorine', d: false }, { t: 'Lower the water', d: false }, { t: 'Put on the cover', d: false }]), pid), await A.evaluate(id => db.tasks.find(x => x.id === id).steps, pid));
  check('instructions shown', /blue jug/.test(await A.textContent('#view')));
  await A.click('[data-act=step][data-i="0"]');
  check('a step ticks off', await A.evaluate(id => db.tasks.find(x => x.id === id).steps[0].d, pid));
  check('Kelly sees the ticked step', await waitFor(B, id => { const t = db.tasks.find(x => x.id === id); return t.steps.length === 3 && t.steps[0].d && t.how === 'Use the blue jug in the shed.'; }, pid));
  await A.evaluate(() => { document.querySelector('.section h2') && [...document.querySelectorAll('.section h2')].find(h => h.textContent === 'Steps').scrollIntoView(); view.scrollTop -= 80; });
  await A.screenshot({ path: D + '/feat-6-steps.png' });
  await A.evaluate(id => go('task', { taskId: id }, true), pid); await A.click('[data-act=complete-open]'); await A.click('[data-act=complete-save]');
  check('finishing the task clears the steps for next time', await A.evaluate(id => db.tasks.find(x => x.id === id).steps.every(s => !s.d), pid));
  // ---- recently done ----
  await B.evaluate(() => go('home'));
  const kt = await B.evaluate(() => document.querySelector('.swipe').getAttribute('data-id'));
  await B.click('.swipe .tick');
  check('Solomon sees what Kelly finished', await waitFor(A, id => { go('home'); const el = [...document.querySelectorAll('.section h2')].find(h => h.textContent === 'Recently Done'); return el && /Kelly · Just now/.test(document.querySelector('#view').innerText); }, kt), await A.evaluate(() => document.querySelector('#view').innerText.slice(0, 1500)));
  await A.evaluate(() => { [...document.querySelectorAll('.section h2')].find(h => h.textContent === 'Recently Done').scrollIntoView(); view.scrollTop -= 60; });
  await A.screenshot({ path: D + '/feat-5-recently-done.png' });
  // ---- a delete isn't undone by a housemate's edit that crosses it ----
  const did = await A.evaluate(() => db.tasks.find(t => t.active && !t.auto && t.name !== 'Kelly new task').id);
  await A.evaluate(() => { window.__offline = true; });
  await A.evaluate(id => { db.tasks = db.tasks.filter(t => t.id !== id); save(); }, did);
  await B.evaluate(id => { db.tasks.find(t => t.id === id).notes = 'edited by Kelly'; save(); }, did);
  await sleep(1500);
  await A.evaluate(() => { window.__offline = false; window.dispatchEvent(new Event('online')); });
  check('Solomon\'s delete wins', await waitFor(A, id => !db.tasks.some(t => t.id === id) && pendingCount() === 0, did));
  check('and reaches Kelly', await waitFor(B, id => !db.tasks.some(t => t.id === id), did));
  // ---- polish: one way to confirm, Save within reach, helpful empty states ----
  await A.evaluate(() => go('settings', {}, true)); await A.click('[data-act=sign-out]');
  check('Sign Out asks in a dialog', await A.evaluate(() => !!document.querySelector('.sheet[role=alertdialog]') && /Sign Out\?/.test(document.querySelector('.sheet').innerText)));
  await A.keyboard.press('Escape');
  check('Escape cancels and stays signed in', await A.evaluate(() => !document.querySelector('.sheet') && !!C.user && ui.screen === 'settings'));
  await A.click('[data-act=member-rm]');
  check('removing a person asks first', await A.evaluate(() => /Remove This Person\?/.test((document.querySelector('.sheet') || {}).innerText || '')));
  await A.click('.sheet [data-act=confirm-cancel]');
  check('cancel keeps the person', await A.evaluate(() => C.members.length === 2));
  await B.evaluate(() => go('settings', {}, true)); await B.click('[data-act=house-leave]');
  check('leaving asks first', await B.evaluate(() => /Leave This Household\?/.test((document.querySelector('.sheet') || {}).innerText || '')));
  await B.click('.sheet [data-act=confirm-cancel]');
  check('cancel keeps Kelly in the household', await B.evaluate(() => !!C.hid));
  await A.click('[data-act=restore]');
  check('restore asks before replacing everyone\'s list', await A.evaluate(() => /Restore from a Backup\?/.test((document.querySelector('.sheet') || {}).innerText || '')));
  await A.click('.sheet [data-act=confirm-cancel]');
  await A.evaluate(() => go('task', { taskId: db.tasks[0].id }, true)); await A.click('[data-act=edit-task]');
  await A.evaluate(() => { view.scrollTop = 900; }); await sleep(300);
  check('Save stays on screen in a long form', await A.evaluate(() => { const r = document.querySelector('[data-act=save-task]').getBoundingClientRect(); return view.scrollTop > 300 && r.top >= 0 && r.bottom < 120; }));
  // ---- one tap saves once, even if Save is tapped again while the phone is busy ----
  const before = await A.evaluate(() => db.tasks.length);
  await A.evaluate(() => { ui.form = null; go('list', { filter: 'all', cat: '', q: '' }); }); await A.click('[data-act=new-task]');
  await A.fill('input[name=name]', 'Double tap test');
  await A.evaluate(() => { const b = document.querySelector('[data-act=save-task]'); b.click(); b.click(); });
  await A.evaluate(() => { const busy = Date.now() + 400; while (Date.now() < busy) {} }); // a slow phone
  await A.evaluate(() => document.querySelector('[data-act=edit-task], [data-act=save-task]') && document.querySelector('[data-act=save-task]') && document.querySelector('[data-act=save-task]').click());
  check('a double-tapped Save makes one task', await A.evaluate(n => db.tasks.length === n + 1 && db.tasks.filter(t => t.name === 'Double tap test').length === 1, before));
  await A.evaluate(() => go('contacts', { cq: '' })); await A.click('[data-act=new-contact]'); await A.fill('input[name=name]', 'Double tap contact');
  await A.evaluate(() => { const f = document.getElementById('contactForm'); f.requestSubmit(); f.requestSubmit(); document.querySelector('[data-act=save-contact]') && document.querySelector('[data-act=save-contact]').click(); });
  check('a double-tapped contact Save makes one contact', await A.evaluate(() => db.contacts.filter(c => c.name === 'Double tap contact').length === 1));
  await sleep(1600);
  await A.evaluate(() => go('list', { filter: 'all', cat: '', q: '' })); await A.click('[data-act=new-task]'); await A.click('[data-act=save-task]');
  await A.fill('input[name=name]', 'Fixed right away'); await A.click('[data-act=save-task]');
  check('after a "give it a name" message, Save works again right away', await A.evaluate(() => db.tasks.some(t => t.name === 'Fixed right away')));
  const lt = await A.evaluate(() => db.tasks.find(t => t.history.length && t.freq !== 'One-time').id);
  await A.evaluate(id => { ui.form = null; go('task', { taskId: id }, true); }, lt); await A.click('[data-act=edit-task]');
  await A.fill('input[name=last]', ''); await A.click('[data-act=save-task]');
  check('clearing Last Completed points to History instead of silently not sticking', await A.evaluate(id => ui.screen === 'edit-task' && /History/.test(document.getElementById('toast').innerText) && db.tasks.find(t => t.id === id).last, lt));
  await A.evaluate(() => { ui.form = null; go('list', { filter: 'all', cat: '', q: '' }); }); await A.fill('#q', 'zzzzqq');
  check('an empty search says so', await A.evaluate(() => /No Matches/.test(document.querySelector('.empty').innerText)));
  await A.evaluate(() => { ui.q = ''; go('home'); });
  console.log('errors', errs); console.log(ok, 'passed', bad, 'failed');
  await b.close(); process.exit(bad || errs.length ? 1 : 0);
})();
