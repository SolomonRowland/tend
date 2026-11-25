// The desktop layout (1024px and wider): a sidebar instead of the bottom tabs, pages that use the
// width, and nothing running off the page, on every screen in every theme. Phones keep their layout.
const { chromium } = require('playwright');
const fs = require('fs');
const MOCK = fs.readFileSync(__dirname + '/mock-client.js', 'utf8');
const APP = 'http://localhost:8766/';
const D = __dirname + '/screenshots'; fs.mkdirSync(D, { recursive: true });
let ok = 0, bad = 0;
function check(name, cond, extra) { if (cond) { ok++; console.log('PASS', name); } else { bad++; console.log('FAIL', name, extra === undefined ? '' : JSON.stringify(extra)); } }
const box = (p, sel) => p.evaluate(s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, shown: getComputedStyle(e).display !== 'none' && r.width > 0 }; }, sel);
async function signUp(p, email) {
  await p.goto(APP); await p.waitForSelector('#authForm');
  check('sign-in sits in a centered card at ' + (await p.evaluate(() => innerWidth)) + 'px', await p.evaluate(() => { const r = document.getElementById('app').getBoundingClientRect(); return innerWidth < 1024 || (r.width <= 520 && Math.abs(r.x + r.width / 2 - innerWidth / 2) < 2 && r.y > 0); }));
  await p.click('[data-act=auth-mode]'); await p.fill('#authEmail', email); await p.fill('#authPass', 'password123'); await p.click('#authForm button[type=submit]');
  await p.waitForSelector('#houseName'); await p.click('[data-act=house-create]');
  await p.waitForSelector('.welcome [data-act=example]'); await p.click('.welcome [data-act=example]'); await p.waitForSelector('.stats');
}
(async () => {
  await fetch('http://localhost:8790/reset', { method: 'POST' });
  const b = await chromium.launch(); const errs = [], issues = [];
  for (const [w, h] of [[1024, 700], [1440, 900], [1920, 1080]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    await ctx.addInitScript(MOCK);
    await ctx.addInitScript(() => { localStorage.setItem('tend.swipeHint', '1'); if (!localStorage.getItem('tend.profile')) localStorage.setItem('tend.profile', JSON.stringify({ first: 'Solomon', last: 'Lee', phone: '(555) 555-0100', email: 'a@b.co', dob: '1990-03-14', prefsSet: true })); });
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(w + ': ' + e.message));
    await signUp(p, 'desk' + w + '@x.com');
    const nav = await box(p, '#tabs'), view = await box(p, '#view');
    check(w + ': sidebar on the left, full height', nav.shown && nav.x === 0 && nav.w >= 240 && nav.h >= h - 1 && view.x >= nav.w, [nav, view]);
    check(w + ': Settings and the brand are in the sidebar', (await box(p, '#tabs .deskonly')).shown && (await box(p, '#tabs .brand')).shown);
    check(w + ': home lists use two columns', await p.evaluate(() => getComputedStyle(document.querySelector('.stack')).gridTemplateColumns.split(' ').length === 2));
    await p.click('#tabs [data-act=tab-settings]');
    check(w + ': Settings opens from the sidebar and is marked', await p.evaluate(() => ui.screen === 'settings' && document.querySelector('#tabs [data-on]') && !document.querySelector('#tabs [aria-current][data-act=tab-home]:not([data-dim])')));
    await p.click('#tabs [data-act=tab-tasks]');
    check(w + ': Tasks opens from the sidebar', await p.evaluate(() => ui.screen === 'list'));
    // editing: the sidebar stays put but can't be used until Save or Cancel
    await p.evaluate(() => go('edit-task', { form: Object.assign({}, db.tasks[0], { early: String(db.tasks[0].early) }) }, true));
    check(w + ': sidebar stays visible while editing', (await box(p, '#tabs')).shown && await p.evaluate(() => getComputedStyle(tabs).pointerEvents === 'none'));
    await p.evaluate(() => view.scrollTop = 600);
    check(w + ': Save stays in view while scrolling a form', await p.evaluate(() => { const r = document.querySelector('[data-act=save-task]').getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; }));
    for (const th of ['mono', 'mocha', 'midnight', 'mono/dark', 'mocha/dark', 'midnight/dark']) {
      await p.evaluate(t => { setTheme(t.split('/')[0]); setMode(t.split('/')[1] || 'light'); }, th);
      const screens = await p.evaluate(() => {
        const t = db.tasks[0], c = db.contacts[0];
        return [['home', {}], ['list', { filter: 'all', cat: '', q: '' }], ['calendar', { calY: 2026, calM: 10, calDay: '2026-11-17' }], ['contacts', { cq: '' }], ['contact', { conId: c.id }], ['items', { bq: '' }],
          ['item', { itemId: db.items[0].id }], ['task', { taskId: t.id }], ['prefs', { form: remindPrefs() }], ['settings', {}],
          ['edit-task', { form: Object.assign({}, t, { early: String(t.early) }) }], ['edit-contact', { form: Object.assign({ items: [] }, c) }], ['edit-item', { form: itemForm(db.items[0]) }], ['profile', { form: Object.assign({}, getProfile()) }]];
      });
      for (const [s, o] of screens) {
        await p.evaluate(([s, o]) => { go(s, o, false); }, [s, o]);
        const r = await p.evaluate(() => ({ ow: document.documentElement.scrollWidth - innerWidth, wide: [...document.querySelectorAll('#view *')].filter(el => { const r = el.getBoundingClientRect(); return r.width && r.right > innerWidth + 1 && getComputedStyle(el).position !== 'fixed'; }).slice(0, 3).map(el => el.tagName + '.' + el.className), undef: /undefined|NaN|\[object/.test(view.innerText), screen: ui.screen, shell: document.body.classList.contains('shell') }));
        if (r.ow > 0 || r.wide.length || r.undef || r.screen !== s || !r.shell) issues.push([w, th, s, JSON.stringify(r)]);
        if (w === 1440 && (th === 'midnight' || th === 'midnight/dark') && ['home', 'list', 'calendar', 'task', 'edit-task', 'items'].includes(s)) await p.waitForTimeout(450).then(() => p.screenshot({ path: D + '/desktop-' + th.replace('/', '-') + '-' + s + '.png' }));
      }
    }
    await ctx.close();
  }
  check('every desktop screen fits, in every theme and width', !issues.length, issues.slice(0, 10));
  // a phone keeps its bottom tabs, with no sidebar extras
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await ctx.addInitScript(MOCK);
  await ctx.addInitScript(() => { localStorage.setItem('tend.swipeHint', '1'); localStorage.setItem('tend.profile', JSON.stringify({ first: 'Solomon', last: 'Lee', phone: '(555) 555-0100', email: 'a@b.co', dob: '1990-03-14', prefsSet: true })); });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push('phone: ' + e.message));
  await signUp(p, 'deskphone@x.com');
  const nav = await box(p, '#tabs');
  check('phone: tabs along the bottom', nav.shown && nav.y > 700 && nav.w === 390, nav);
  check('phone: four tabs, no sidebar extras', await p.evaluate(() => [...tabs.querySelectorAll('button')].filter(x => getComputedStyle(x).display !== 'none').length === 4 && getComputedStyle(tabs.querySelector('.brand')).display === 'none'));
  check('phone: lists stay one column', await p.evaluate(() => getComputedStyle(document.querySelector('.stack')).display === 'flex'));
  check('no page errors', !errs.length, errs.slice(0, 5));
  await b.close();
  console.log(ok, 'passed', bad, 'failed'); process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
