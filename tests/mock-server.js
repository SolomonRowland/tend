// Stand-in for Supabase during tests: runs every query on a real local Postgres
// as the signed-in user (role "authenticated" + jwt claims), so the real RLS
// policies and functions from schema.sql are what's being tested.
const http = require('http'), crypto = require('crypto');
const { Pool } = require('pg');
const pool = new Pool({ host: process.env.PGHOST || '127.0.0.1', user: process.env.PGUSER || 'postgres', password: process.env.PGPASSWORD || 'pg', database: process.env.PGDATABASE || 'tendtest' });
const pw = {}; const tokens = {}; const subs = new Set();
function send(res, code, obj) { res.writeHead(code, { 'content-type': 'application/json', 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' }); res.end(JSON.stringify(obj)); }
function ident(s) { if (!/^[a-z_][a-z0-9_]*$/.test(s)) throw new Error('bad ident ' + s); return s; }
async function asUser(uid, fn) {
  const c = await pool.connect();
  try {
    await c.query('begin');
    const u = uid ? (await c.query('select id, email from auth.users where id=$1', [uid])).rows[0] : null;
    await c.query('set local role ' + (u ? 'authenticated' : 'anon'));
    await c.query("select set_config('request.jwt.claim.sub', $1, true), set_config('request.jwt.claims', $2, true)", [u ? u.id : '', JSON.stringify(u ? { sub: u.id, email: u.email } : {})]);
    const out = await fn(c);
    await c.query('commit'); return out;
  } catch (e) { await c.query('rollback'); throw e; } finally { c.release(); }
}
async function run(q, uid) {
  if (q.op === 'rpc') {
    const keys = Object.keys(q.args || {});
    const sql = 'select public.' + ident(q.fn) + '(' + keys.map((k, i) => ident(k) + ' => $' + (i + 1)).join(', ') + ') as v';
    return asUser(uid, async c => (await c.query(sql, keys.map(k => q.args[k]))).rows[0].v);
  }
  const t = ident(q.table), vals = []; const P = v => { vals.push(v); return '$' + vals.length; };
  const where = (q.filters || []).map(f => ident(f.col) + (f.op === 'eq' ? ' = ' : ' > ') + P(f.val));
  const W = where.length ? ' where ' + where.join(' and ') : '';
  let sql;
  if (q.op === 'select') {
    let cols = q.cols.split(',').map(s => s.trim());
    let from = 'public.' + t;
    cols = cols.map(cn => { const m = /^(\w+)\((\w+)\)$/.exec(cn); if (m) { from = 'public.' + t + ' left join public.' + ident(m[1]) + ' on ' + ident(m[1]) + '.id = ' + t + '.household_id'; return 'json_build_object(\'' + m[2] + '\', ' + ident(m[1]) + '.' + ident(m[2]) + ') as ' + m[1]; } return t + '.' + ident(cn); });
    sql = 'select ' + cols.join(', ') + ' from ' + from + W.replace(/where (\w+)/g, 'where ' + t + '.$1').replace(/ and (\w+)/g, ' and ' + t + '.$1');
    if (q.order) sql += ' order by ' + t + '.' + ident(q.order.col) + (q.order.asc ? ' asc' : ' desc');
    if (q.range) sql += ' offset ' + (+q.range[0]) + ' limit ' + (q.range[1] - q.range[0] + 1); else if (q.limit) sql += ' limit ' + (+q.limit);
    return asUser(uid, async c => (await c.query(sql, vals)).rows.map(r => { for (const k in r) if (r[k] instanceof Date) r[k] = r[k].toISOString(); return r; }));
  }
  if (q.op === 'update') { const sets = Object.keys(q.values).map(k => ident(k) + ' = ' + P(q.values[k])); sql = 'update public.' + t + ' set ' + sets.join(', ') + W.replace(/\$(\d+)/g, (m, n) => '$' + (+n + sets.length)); vals.splice(0, 0, ...vals.splice(vals.length - sets.length)); }
  if (q.op === 'delete') sql = 'delete from public.' + t + W;
  if (q.op === 'upsert') {
    const rows = q.values; if (!rows.length) return [];
    const cols = Object.keys(rows[0]);
    sql = 'insert into public.' + t + ' (' + cols.map(ident).join(', ') + ') values ' + rows.map(r => '(' + cols.map(k => P(k === 'data' ? JSON.stringify(r[k]) : r[k])).join(', ') + ')').join(', ') +
      ' on conflict (household_id, kind, id) do update set ' + cols.filter(k => !['household_id', 'kind', 'id'].includes(k)).map(k => k + ' = excluded.' + k).join(', ');
  }
  const out = await asUser(uid, async c => { const r = await c.query(sql, vals); return r.rowCount; });
  if (t === 'records') for (const s of subs) { try { s.write('data: ' + JSON.stringify({ table: t }) + '\n\n'); } catch (e) {} }
  return null;
}
http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return send(res, 204, {});
  if (req.url === '/events') { res.writeHead(200, { 'content-type': 'text/event-stream', 'access-control-allow-origin': '*', 'cache-control': 'no-cache' }); res.write(':ok\n\n'); subs.add(res); req.on('close', () => subs.delete(res)); return; }
  let body = ''; req.on('data', d => body += d); await new Promise(r => req.on('end', r));
  const b = body ? JSON.parse(body) : {}; const uid = tokens[b.token] || null;
  try {
    if (req.url === '/reset') { await pool.query("truncate public.records, public.invites, public.members, public.households cascade; delete from auth.users"); for (const k in pw) delete pw[k]; return send(res, 200, { ok: 1 }); }
    if (req.url === '/signup') {
      const ex = (await pool.query('select id from auth.users where email=$1', [b.email])).rows[0];
      if (ex) return send(res, 200, { error: { message: 'User already registered' } });
      const id = crypto.randomUUID(); await pool.query('insert into auth.users values ($1,$2)', [id, b.email]); pw[b.email] = b.password;
      const tk = crypto.randomUUID(); tokens[tk] = id; return send(res, 200, { data: { user: { id, email: b.email }, session: { access_token: tk, user: { id, email: b.email } } } });
    }
    if (req.url === '/signin') {
      const u = (await pool.query('select id, email from auth.users where email=$1', [b.email])).rows[0];
      if (!u || pw[b.email] !== b.password) return send(res, 200, { error: { message: 'Invalid login credentials' } });
      const tk = crypto.randomUUID(); tokens[tk] = u.id; return send(res, 200, { data: { user: u, session: { access_token: tk, user: u } } });
    }
    if (req.url === '/q') return send(res, 200, { data: await run(b.q, uid), error: null });
    send(res, 404, {});
  } catch (e) { send(res, 200, { data: null, error: { message: e.message } }); }
}).listen(8790, () => console.log('mock on 8790'));
