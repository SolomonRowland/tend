// Opens every screen in every color theme at three phone widths and checks for
// script errors, text running off the screen, and "undefined"/"NaN" showing up.
const { chromium } = require('playwright');
const fs = require('fs');
const MOCK = fs.readFileSync(__dirname + '/mock-client.js', 'utf8');
const APP = 'http://localhost:8766/';
(async () => {
  const b = await chromium.launch(); const errs = []; const issues = [];
  let n = 0;
  for (const w of [320, 390, 430]) {
    const ctx = await b.newContext({ viewport: { width: w, height: 800 }, isMobile: true, hasTouch: true });
    await ctx.addInitScript(MOCK);
    await ctx.addInitScript(() => { if (!localStorage.getItem('tend.profile')) localStorage.setItem('tend.profile', JSON.stringify({ first: 'Solomon', last: 'Rowland', phone: '(630) 555-0100', email: 'a@b.co', dob: '1990-03-14', prefsSet: true })); });
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(w + ': ' + e.message));
    p.on('console', m => { if (m.type() === 'error' && !/EventSource|net::ERR/.test(m.text())) errs.push(w + ' console: ' + m.text()); });
    await p.goto(APP); await p.waitForSelector('#authForm');
    await p.click('[data-act=auth-mode]'); await p.fill('#authEmail', 'sweep' + w + '@x.com'); await p.fill('#authPass', 'password123'); await p.click('#authForm button[type=submit]');
    await p.waitForSelector('#houseName'); await p.click('[data-act=house-create]');
    await p.waitForSelector('.welcome [data-act=example]'); await p.click('.welcome [data-act=example]'); await p.waitForSelector('.stats');
    for (const th of ['mono', 'mocha', 'midnight', 'mono/dark', 'mocha/dark', 'midnight/dark']) {
      await p.evaluate(t => { setTheme(t.split('/')[0]); setMode(t.split('/')[1] || 'light'); }, th);
      const screens = await p.evaluate(() => {
        const t = db.tasks[0], bt = db.tasks.find(x => x.amount), c = db.contacts[0];
        return [['home', {}], ['list', { filter: 'all', cat: '', q: '' }], ['calendar', { calY: 2026, calM: 10, calDay: '2026-11-17' }], ['contacts', { cq: '' }], ['contact', { conId: c.id }], ['items', { bq: '' }],
          ['item', { itemId: db.items[0].id }], ['task', { taskId: t.id }], ['task', { taskId: bt.id }], ['prefs', { form: remindPrefs() }], ['settings', {}],
          ['edit-task', { form: Object.assign({}, t, { early: String(t.early) }) }], ['edit-contact', { form: Object.assign({ items: [] }, c) }], ['edit-task', { form: Object.assign({}, bt, { early: String(bt.early) }) }], ['profile', { form: Object.assign({}, getProfile()) }]];
      });
      for (const [s, o] of screens) {
        await p.evaluate(([s, o]) => { go(s, o, false); }, [s, o]); n++;
        const r = await p.evaluate(() => ({ ow: document.documentElement.scrollWidth - innerWidth, wide: [...document.querySelectorAll('#view *')].filter(el => { const r = el.getBoundingClientRect(); return r.width && r.right > innerWidth + 1 && getComputedStyle(el).position !== 'fixed'; }).slice(0, 3).map(el => el.tagName + '.' + el.className + ':' + (el.textContent || '').slice(0, 30)), undef: /undefined|NaN|\[object/.test(view.innerText), screen: ui.screen }));
        if (r.ow > 0 || r.wide.length || r.undef || r.screen !== s) issues.push([w, th, s, JSON.stringify(r)]);
        if (w === 390 && (th === 'midnight/dark' || th === 'midnight') && ['home', 'list', 'task', 'settings', 'calendar', 'edit-task'].includes(s)) await p.screenshot({ path: __dirname + '/screenshots/' + th.replace('/', '-') + '-' + s + '.png' }).catch(() => {});
      }
    }
    for (const it of await p.evaluate(() => db.items.map(b => b.id))) { await p.evaluate(id => { go('edit-item', { form: itemForm(itemById(id)) }, false); }, it); n++; if (await p.evaluate(() => /undefined|NaN/.test(view.innerText))) issues.push([w, 'edit-item', it]); }
    await ctx.close();
  }
  console.log('screens checked', n, '· issues', issues.length, issues.slice(0, 15), '· errors', errs.slice(0, 10));
  await b.close(); process.exit(issues.length || errs.length ? 1 : 0);
})();
