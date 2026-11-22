// Random-tap stress test: signs in, loads the example household, then taps, types and submits
// at random for a few thousand steps. After every step it checks that nothing threw, the screen
// isn't blank, no "undefined"/"NaN" shows, and every task is still well formed.
// Seeded, so a failure can be replayed:  SEED=123 node monkey.test.js
const { chromium } = require('playwright');
const fs = require('fs');
const MOCK = fs.readFileSync(__dirname + '/mock-client.js', 'utf8');
const APP = 'http://localhost:8766/';
const STEPS = +(process.env.STEPS || 600), SEEDS = process.env.SEED ? [+process.env.SEED] : [1, 2, 3];
// things a tester's thumb shouldn't do mid-run: leave, sign out, open file pickers, ask for notification permission
const SKIP = new Set(['sign-out', 'house-leave', 'member-rm', 'restore', 'backup', 'photo-add', 'notify-on', 'notify-off', 'notify-test', 'invite', 'invite-copy', 'invite-cancel', 'copy', 'cal-add', 'gcal', 'bring-old', 'auth-mode', 'forgot']);
const WORDS = ['Oil change', '', '  ', 'Filter 16x25x1', '<img src=x onerror="window.__xss=1">', '"><svg onload=window.__xss=1>', "O'Brien & Sons", 'Ünïcødé ✓', '12', '-3', '1e9', 'a'.repeat(300), 'Line one\nLine two\n- three', '2026-02-29', '0', 'null'];
function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
(async () => {
  const b = await chromium.launch(); const errs = []; const issues = []; let steps = 0; const seen = {};
  for (const seed of SEEDS) {
    const R = rng(seed), pick = a => a[Math.floor(R() * a.length)];
    const ctx = await b.newContext({ viewport: { width: 390, height: 800 }, isMobile: true, hasTouch: true });
    await ctx.addInitScript(MOCK);
    await ctx.addInitScript(() => { localStorage.setItem('tend.swipeHint', '1'); if (!localStorage.getItem('tend.profile')) localStorage.setItem('tend.profile', JSON.stringify({ first: 'Sam', last: 'Lee', phone: '(630) 555-0100', email: 'a@b.co', dob: '1990-03-14', prefsSet: true })); });
    const p = await ctx.newPage(); let last = '';
    p.on('pageerror', e => errs.push('seed ' + seed + ' after ' + last + ': ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n')));
    p.on('console', m => { if (m.type() === 'error' && !/EventSource|net::ERR|Failed to load resource/.test(m.text())) errs.push('seed ' + seed + ' console after ' + last + ': ' + m.text()); });
    p.on('dialog', d => d.dismiss());
    await p.goto(APP); await p.waitForSelector('#authForm');
    await p.click('[data-act=auth-mode]'); await p.fill('#authEmail', 'monkey' + seed + '-' + Date.now() + '@x.com'); await p.fill('#authPass', 'password123'); await p.click('#authForm button[type=submit]');
    await p.waitForSelector('#houseName'); await p.click('[data-act=house-create]');
    await p.waitForSelector('.welcome [data-act=example]'); await p.click('.welcome [data-act=example]'); await p.waitForSelector('.stats');
    for (let i = 0; i < STEPS; i++) {
      steps++;
      const targets = await p.evaluate(skip => {
        const vis = el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight && !el.closest('[hidden]'); };
        const acts = [...document.querySelectorAll('[data-act]')].filter(el => vis(el) && !skip.includes(el.getAttribute('data-act')) && !el.disabled).map((el, k) => { el.setAttribute('data-mk', 'a' + k); return { k: 'a' + k, act: el.getAttribute('data-act') }; });
        const fields = [...document.querySelectorAll('input:not([type=file]):not([type=hidden]), textarea, select')].filter(vis).map((el, k) => { el.setAttribute('data-mk', 'f' + k); return { k: 'f' + k, tag: el.tagName, type: el.type || '', n: el.options ? el.options.length : 0 }; });
        return { acts, fields, form: !!document.querySelector('form.form, form#authForm') };
      }, [...SKIP]);
      const r = R();
      try {
        if (r < 0.62 && targets.acts.length) { const kinds = [...new Set(targets.acts.map(x => x.act))], kind = pick(kinds), t = pick(targets.acts.filter(x => x.act === kind)); last = 'tap ' + t.act; seen[t.act] = (seen[t.act] || 0) + 1; await p.click('[data-mk=' + t.k + ']', { timeout: 1500, force: true }); }
        else if (r < 0.80 && targets.fields.length) {
          const f = pick(targets.fields); const sel = '[data-mk=' + f.k + ']';
          if (f.tag === 'SELECT') { last = 'select'; await p.evaluate(([s, ix]) => { const el = document.querySelector(s); el.selectedIndex = ix; el.dispatchEvent(new Event('change', { bubbles: true })); }, [sel, Math.floor(R() * f.n)]); }
          else if (f.type === 'date') { last = 'date'; const d = new Date(2020 + Math.floor(R() * 10), Math.floor(R() * 12), 1 + Math.floor(R() * 28)); await p.evaluate(([s, v]) => { const el = document.querySelector(s); el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }, [sel, R() < 0.1 ? '' : d.toISOString().slice(0, 10)]); }
          else { const w = pick(WORDS); last = 'type ' + JSON.stringify(w.slice(0, 20)); await p.fill(sel, w, { timeout: 1500 }); }
        }
        else if (r < 0.86 && targets.form) { last = 'submit'; await p.evaluate(() => { const f = document.querySelector('form.form, form#profileForm'); if (f) f.requestSubmit(); }); }
        else if (r < 0.92) { last = 'back'; await p.evaluate(() => { if (ui.stack.length) back(); }); }
        else if (r < 0.96) { last = 'swipe'; const sw = await p.$$('.swipe .row'); if (sw.length) { const el = pick(sw); const bx = await el.boundingBox(); if (bx) { const dx = R() < 0.5 ? 1 : -1; await p.evaluate(([x, y, dx]) => { const el = document.elementFromPoint(x, y); if (!el) return; const T = (t, xx) => new Touch({ identifier: 1, target: el, clientX: xx, clientY: y }); const fire = (type, xx) => el.dispatchEvent(new TouchEvent(type, { bubbles: true, cancelable: true, touches: type === 'touchend' ? [] : [T(type, xx)], changedTouches: [T(type, xx)] })); fire('touchstart', x); for (let k = 1; k <= 8; k++) fire('touchmove', x + dx * k * 30); fire('touchend', x + dx * 240); }, [bx.x + bx.width / 2, bx.y + bx.height / 2, dx]); } } }
        else { last = 'scroll'; await p.evaluate(v => { view.scrollTop = v; }, Math.floor(R() * 3000)); }
      } catch (e) { /* element went away between looking and tapping: fine */ }
      if (i % 3 === 0) await p.waitForTimeout(60);
      const bad = await p.evaluate(() => {
        const out = [];
        if (C.on && !C.user) return ['signed out'];
        if (!view.innerHTML.trim()) out.push('blank screen ' + ui.screen);
        if (window.__xss) { out.push('typed text ran as code on ' + ui.screen); window.__xss = 0; }
        const txt = view.innerText + ' ' + (document.getElementById('modal').innerText || '') + ' ' + (document.getElementById('toast').innerText || '');
        const m = txt.match(/.{0,30}\b(undefined|NaN|Invalid Date|\[object Object\])\b.{0,20}/); if (m && !/“[^”]*(undefined|null)[^”]*”/.test(m[0])) out.push('shows ' + JSON.stringify(m[0]) + ' on ' + ui.screen);
        if (db) db.tasks.forEach(t => {
          if (!t.id || typeof t.name !== 'string' || !Array.isArray(t.history)) out.push('broken task ' + JSON.stringify(t).slice(0, 120));
          if (t.history.some(h => !/^\d{4}-\d\d-\d\d$/.test(h.date))) out.push('bad history date on ' + t.name);
          if (t.last && !/^\d{4}-\d\d-\d\d$/.test(t.last)) out.push('bad last on ' + t.name);
          if (t.steps && !Array.isArray(t.steps)) out.push('steps not a list on ' + t.name);
          try { info(t); nextDue(t); } catch (e) { out.push('info() throws on ' + t.name + ': ' + e.message); }
        });
        if (db && new Set(db.tasks.map(t => t.id)).size !== db.tasks.length) out.push('duplicate task ids');
        return out;
      });
      if (bad[0] === 'signed out') break;
      bad.forEach(x => issues.push('seed ' + seed + ' step ' + i + ' after ' + last + ': ' + x));
      if (issues.length > 30 || errs.length > 30) break;
    }
    await ctx.close();
  }
  const uniq = a => [...new Set(a.map(x => x.replace(/step \d+ /, '')))];
  if (process.env.COVER) console.log(Object.entries(seen).sort((a, b) => b[1] - a[1]).map(x => x.join(':')).join(' '));
  console.log('monkey steps', steps, '· issues', uniq(issues).length, uniq(issues).slice(0, 20), '· errors', uniq(errs).slice(0, 12));
  await b.close(); process.exit(issues.length || errs.length ? 1 : 0);
})();
