// Browser-side stand-in for supabase-js, talking to mock/server.js.
window.TEND_CLOUD_FACTORY = function () {
  var BASE = 'http://localhost:8790', listeners = [];
  function sess() { try { return JSON.parse(localStorage.getItem('sb-mock-auth-token') || 'null'); } catch (e) { return null; } }
  function post(path, body) {
    if (window.__offline) return Promise.reject(new TypeError('Failed to fetch'));
    var s = sess(); body.token = s ? s.access_token : null;
    return fetch(BASE + path, { method: 'POST', body: JSON.stringify(body) }).then(function (r) { return r.json(); });
  }
  function emit(ev, s) { listeners.forEach(function (f) { f(ev, s); }); }
  function Q(table) { this.q = { table: table, filters: [] }; }
  Q.prototype.select = function (c) { this.q.op = this.q.op || 'select'; this.q.cols = c; return this; };
  Q.prototype.eq = function (c, v) { this.q.filters.push({ col: c, op: 'eq', val: v }); return this; };
  Q.prototype.gt = function (c, v) { this.q.filters.push({ col: c, op: 'gt', val: v }); return this; };
  Q.prototype.gte = function (c, v) { this.q.filters.push({ col: c, op: 'gte', val: v }); return this; };
  Q.prototype.order = function (c, o) { this.q.order = { col: c, asc: !o || o.ascending !== false }; return this; };
  Q.prototype.range = function (a, b) { this.q.range = [a, b]; return this; };
  Q.prototype.limit = function (n) { this.q.limit = n; return this; };
  Q.prototype.update = function (v) { this.q.op = 'update'; this.q.values = v; return this; };
  Q.prototype.delete = function () { this.q.op = 'delete'; return this; };
  Q.prototype.upsert = function (rows) { this.q.op = 'upsert'; this.q.values = rows; return this; };
  Q.prototype.then = function (ok, bad) { window.__calls = (window.__calls || 0) + 1; return post('/q', { q: this.q }).then(function (r) { return { data: r.data, error: r.error }; }).then(ok, bad); };
  var es = null;
  return {
    auth: {
      onAuthStateChange: function (f) { listeners.push(f); return { data: { subscription: { unsubscribe: function () {} } } }; },
      getSession: function () { return Promise.resolve({ data: { session: sess() } }); },
      signUp: function (o) { return post('/signup', o).then(function (r) { if (r.data) { localStorage.setItem('sb-mock-auth-token', JSON.stringify(r.data.session)); emit('SIGNED_IN', r.data.session); } return r; }); },
      signInWithPassword: function (o) { return post('/signin', o).then(function (r) { if (r.data) { localStorage.setItem('sb-mock-auth-token', JSON.stringify(r.data.session)); emit('SIGNED_IN', r.data.session); } return r; }); },
      signOut: function () { localStorage.removeItem('sb-mock-auth-token'); emit('SIGNED_OUT', null); return Promise.resolve({}); },
      resetPasswordForEmail: function () { return Promise.resolve({}); },
      updateUser: function () { return Promise.resolve({}); }
    },
    from: function (t) { return new Q(t); },
    storage: {
      from: function (bucket) {
        return {
          upload: function (path, blob) {
            return blob.arrayBuffer().then(function (buf) {
              var s = '', u = new Uint8Array(buf); for (var i = 0; i < u.length; i++) s += String.fromCharCode(u[i]);
              return post('/storage/upload', { bucket: bucket, path: path, b64: btoa(s) });
            }).then(function (r) { return { data: r.data, error: r.error }; });
          },
          createSignedUrls: function (paths) { return post('/storage/sign', { bucket: bucket, paths: paths }).then(function (r) { return { data: r.data, error: r.error }; }); },
          remove: function (paths) { return post('/storage/remove', { bucket: bucket, paths: paths }).then(function (r) { return { data: r.data, error: r.error }; }); }
        };
      }
    },
    functions: {
      invoke: function (name, o) { return post('/fn', { name: name, body: (o && o.body) || {} }).then(function (r) { return { data: r.data, error: r.error }; }); }
    },
    rpc: function (fn, args) { return post('/q', { q: { op: 'rpc', fn: fn, args: args } }).then(function (r) { return { data: r.data, error: r.error }; }); },
    channel: function () {
      var cb = null, ch = {
        on: function (a, b, f) { cb = f; return ch; },
        subscribe: function (st) { es = new EventSource(BASE + '/events'); es.onmessage = function () { if (!window.__offline) cb({}); }; es.onopen = function () { st && st('SUBSCRIBED'); }; return ch; }
      };
      return ch;
    },
    removeChannel: function () { if (es) es.close(); }
  };
};
