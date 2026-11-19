// Tend Home: daily heads-up notifications.
// Runs every hour (see supabase/notifications.sql). For each phone that turned
// notifications on, if it's that phone's chosen hour and it hasn't had today's
// heads-up yet, it sends a short list of what's overdue, due today and coming up.
// Also handles { action: 'init' } (makes the sending keys, returns the public one)
// and { action: 'test' } (sends a test to the signed-in person's phones right now).
import webpush from 'npm:web-push@3.6.7';
import { createClient } from 'npm:@supabase/supabase-js@2.117.3';

const APP_URL = 'https://solomonrowland.github.io/tend/home/';
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

// --- digest start (plain JavaScript so the tests can run it) ---
function localToday(tz, now) {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' }).formatToParts(now);
  const g = (t) => (p.find((x) => x.type === t) || {}).value;
  return { date: g('year') + '-' + g('month') + '-' + g('day'), hour: parseInt(g('hour'), 10) };
}
function addDaysIso(isoDate, n) {
  const d = new Date(isoDate + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10);
}
function listNames(names, max) {
  const shown = names.slice(0, max), more = names.length - shown.length;
  return shown.join(', ') + (more > 0 ? ' and ' + more + ' more' : '');
}
// schedule.tasks rows: [id, name, due, opens, snoozedUntil]
function buildDigest(schedule, today) {
  const rows = (schedule && Array.isArray(schedule.tasks)) ? schedule.tasks : [];
  const week = addDaysIso(today, 7), overdue = [], dueToday = [], soon = [];
  rows.forEach((r) => {
    const name = r[1], due = r[2], opens = r[3], snooze = r[4];
    if (due < today) overdue.push(name);
    else if (snooze && snooze > today) return;
    else if (due === today) dueToday.push(name);
    else if (due <= week || opens <= today) soon.push(name);
  });
  const n = overdue.length + dueToday.length + soon.length;
  if (!n) return null;
  const parts = [];
  if (overdue.length) parts.push('Overdue: ' + listNames(overdue, 2) + '.');
  if (dueToday.length) parts.push('Due today: ' + listNames(dueToday, 2) + '.');
  if (soon.length) parts.push('Coming up: ' + listNames(soon, overdue.length || dueToday.length ? 1 : 3) + '.');
  const title = overdue.length ? overdue.length + (overdue.length === 1 ? ' thing is' : ' things are') + ' overdue'
    : dueToday.length ? dueToday.length + (dueToday.length === 1 ? ' thing' : ' things') + ' due today'
    : soon.length + (soon.length === 1 ? ' thing' : ' things') + ' coming up this week';
  return { title, body: parts.join(' '), count: n };
}
// --- digest end ---

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  let body: any = {};
  try { body = await req.json(); } catch (_) { body = {}; }

  // sending keys: made once, kept in push_config (only this function can read the private half)
  let { data: cfg } = await sb.from('push_config').select('public_key, private_key').eq('id', 1).maybeSingle();
  if (!cfg) {
    const k = webpush.generateVAPIDKeys();
    await sb.from('push_config').upsert({ id: 1, public_key: k.publicKey, private_key: k.privateKey });
    ({ data: cfg } = await sb.from('push_config').select('public_key, private_key').eq('id', 1).maybeSingle());
  }
  if (body.action === 'init') return json({ publicKey: cfg!.public_key });
  webpush.setVapidDetails(APP_URL, cfg!.public_key, cfg!.private_key);

  // test: only for the signed-in person
  let onlyUser: string | null = null;
  if (body.action === 'test') {
    const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
    const { data: u } = await sb.auth.getUser(token);
    if (!u || !u.user) return json({ error: 'Sign in first' }, 401);
    onlyUser = u.user.id;
  }

  let q = sb.from('push_subs').select('*');
  if (onlyUser) q = q.eq('user_id', onlyUser);
  const { data: subs, error } = await q;
  if (error) return json({ error: error.message }, 500);

  const now = new Date(), schedules = new Map(), result = { checked: 0, sent: 0, removed: 0 };
  for (const s of subs || []) {
    result.checked++;
    let tz = s.tz; try { localToday(tz, now); } catch (_) { tz = 'America/Chicago'; }
    const t = localToday(tz, now);
    if (!onlyUser && (t.hour !== s.hour || s.last_sent === t.date)) continue;
    // still in that household?
    const { data: mem } = await sb.from('members').select('user_id').eq('household_id', s.household_id).eq('user_id', s.user_id).maybeSingle();
    if (!mem) { await sb.from('push_subs').delete().eq('endpoint', s.endpoint); result.removed++; continue; }
    if (!schedules.has(s.household_id)) {
      const { data: rec } = await sb.from('records').select('data').eq('household_id', s.household_id).eq('kind', 'meta').eq('id', 'schedule').maybeSingle();
      schedules.set(s.household_id, rec ? rec.data : null);
    }
    let msg = buildDigest(schedules.get(s.household_id), t.date);
    if (onlyUser) msg = msg ? { ...msg, title: 'Test: ' + msg.title } : { title: 'Test from Tend Home', body: 'Notifications are working. Nothing is due this week.', count: 0 };
    if (!onlyUser) await sb.from('push_subs').update({ last_sent: t.date }).eq('endpoint', s.endpoint);
    if (!msg) continue;
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify({ title: msg.title, body: msg.body, url: APP_URL, tag: 'tend-daily' }), { TTL: 6 * 3600 });
      result.sent++;
    } catch (e: any) {
      if (e && (e.statusCode === 404 || e.statusCode === 410)) { await sb.from('push_subs').delete().eq('endpoint', s.endpoint); result.removed++; }
    }
  }
  return json(result);
});
