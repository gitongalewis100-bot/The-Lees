/* In-memory Supabase stand-in for local UI testing. Not shipped. */
(function () {
  const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Math.random().toString(36).slice(2));
  let lastNow = 0; const now = () => { let t = Date.now(); if (t <= lastNow) t = lastNow + 1; lastNow = t; return new Date(t).toISOString(); };
  const LEWIS = '11111111-1111-1111-1111-111111111111', AGNES = '22222222-2222-2222-2222-222222222222', PAIR = '99999999-9999-9999-9999-999999999999';
  const seed = window.__FAKE_SEED || {};
  const meSide = seed.me || 'Lewis';
  const DB = {
    pair_members: [
      { pair_id: PAIR, user_id: LEWIS, side: 'Lewis', tz: 'Africa/Nairobi', status: '', haptics: true, sound: true, last_seen_at: new Date(Date.now() - 3600e3 * 3).toISOString() },
      { pair_id: PAIR, user_id: AGNES, side: 'Agnes', tz: 'Africa/Nairobi', status: 'At work', haptics: true, sound: true, last_seen_at: new Date(Date.now() - 3600e3 * 2.2).toISOString() }
    ],
    pair_settings: [{ pair_id: PAIR, theme: 'warm', archive_days: 0, chat_lock_mode: 'off' }],
    messages: [], notes: [], scheduled_messages: [], read_markers: [], note_reads: [], journal_entries: [], drafts: [],
    sealed_letters: [], game_sessions: [], awards: [], message_trash: [], activity_log: [], notify_log: [], arten_items: (seed.items || []), arten_conversations: [], arten_notes: []
  };
  const t0 = Date.now() - 864e5;
  const txt = ['Morning love ☀️', 'Did you sleep well? 😴', 'Yes! Dreamt of the beach 🏖️', 'Coffee later? ☕', 'Always ❤️', 'Leaving work at 5', 'I miss you 🥺', 'Send me a photo of the sunset 🌅', 'On it 😘', 'Love you more 💕'];
  (seed.messages || txt.map((t, i) => ({ from: i % 2 ? 'Lewis' : 'Agnes', text: t, ago: (txt.length - i) * 600e3 }))).forEach((m) => {
    DB.messages.push({ id: uuid(), pair_id: PAIR, sender_id: m.from === 'Lewis' ? LEWIS : AGNES, kind: m.kind || 'text', text: m.text || null, media_path: m.media_path || null, created_at: new Date(Date.now() - (m.ago || 0)).toISOString(), hearts: [], deleted_for: [], hidden_for: [], deleted: false, effect: 'none', history: [], batch_id: m.batch_id || null });
  });
  DB.read_markers.push({ pair_id: PAIR, user_id: meSide === 'Lewis' ? LEWIS : AGNES, side: meSide, read_at: new Date(Date.now() - 2400e3).toISOString() });
  DB.activity_log.push(
    { id: uuid(), pair_id: PAIR, user_id: AGNES, side: 'Agnes', at: new Date(Date.now() - 3600e3 * 2.3).toISOString(), action: 'signin', detail: '' },
    { id: uuid(), pair_id: PAIR, user_id: AGNES, side: 'Agnes', at: new Date(Date.now() - 3600e3 * 2.28).toISOString(), action: 'open_chat', detail: '' },
    { id: uuid(), pair_id: PAIR, user_id: AGNES, side: 'Agnes', at: new Date(Date.now() - 3600e3 * 2.25).toISOString(), action: 'send_text', detail: '2 messages' },
    { id: uuid(), pair_id: PAIR, user_id: AGNES, side: 'Agnes', at: new Date(Date.now() - 3600e3 * 2.21).toISOString(), action: 'open_journal', detail: '' },
    { id: uuid(), pair_id: PAIR, user_id: AGNES, side: 'Agnes', at: new Date(Date.now() - 3600e3 * 2.2).toISOString(), action: 'signout', detail: '' });
  const blobs = new Map();
  const listeners = [];
  const userId = () => (session ? session.user.id : null);
  const sideOf = (u) => (u === LEWIS ? 'Lewis' : u === AGNES ? 'Agnes' : null);
  let session = null;
  const pw = { 'lewis@the-lees.app': seed.pass || 'test', 'agnes@the-lees.app': seed.pass || 'test' };
  function emit(table, type, row, old) {
    listeners.forEach((l) => { if (l.kind === 'pg' && (l.table === table) && (l.event === '*' || l.event === type)) setTimeout(() => l.cb({ eventType: type, new: row || {}, old: old || {} }), 5); });
  }
  function parseFilter(f) { return f; }
  class Q {
    constructor(t) { this.t = t; this.f = []; this.op = 'select'; this.ord = []; this.one = false; this.rng = null; this.lim = null; this.ret = false; }
    select() { if (this.op === 'select') this.op = 'select'; else this.ret = true; return this; }
    insert(v) { this.op = 'insert'; this.v = v; return this; }
    upsert(v) { this.op = 'upsert'; this.v = v; return this; }
    update(v) { this.op = 'update'; this.v = v; return this; }
    delete() { this.op = 'delete'; return this; }
    eq(c, v) { this.f.push((r) => String(r[c]) === String(v)); return this; }
    neq(c, v) { this.f.push((r) => String(r[c]) !== String(v)); return this; }
    in(c, v) { this.f.push((r) => v.map(String).includes(String(r[c]))); return this; }
    is(c, v) { this.f.push((r) => (r[c] == null) === (v == null)); return this; }
    gte(c, v) { this.f.push((r) => r[c] >= v); return this; } lte(c, v) { this.f.push((r) => r[c] <= v); return this; }
    gt(c, v) { this.f.push((r) => r[c] > v); return this; } lt(c, v) { this.f.push((r) => r[c] < v); return this; }
    filter(c, op, v) { if (op === 'eq') return this.eq(c, v); if (op === 'is') return this.is(c, null); return this; }
    not() { return this; } or() { return this; } contains() { return this; } match(o) { Object.entries(o).forEach(([k, v]) => this.eq(k, v)); return this; }
    order(c, o) { this.ord.push([c, !o || o.ascending !== false]); return this; }
    range(a, b) { this.rng = [a, b]; return this; } limit(n) { this.lim = n; return this; }
    maybeSingle() { this.one = true; return this; } single() { this.one = true; return this; }
    then(res, rej) { return Promise.resolve().then(() => this.run()).then(res, rej); }
    run() {
      if (!DB[this.t]) DB[this.t] = [];
      const T = DB[this.t];
      if (seed.missing && seed.missing.includes(this.t)) return { data: null, error: { message: 'relation "' + this.t + '" does not exist', code: '42P01' } };
      const m = (r) => this.f.every((f) => f(r));
      if (this.op === 'select') {
        let rows = T.filter(m);
        for (const [c, asc] of this.ord.slice().reverse()) rows = rows.slice().sort((a, b) => (a[c] > b[c] ? 1 : a[c] < b[c] ? -1 : 0) * (asc ? 1 : -1));
        if (this.rng) rows = rows.slice(this.rng[0], this.rng[1] + 1);
        if (this.lim) rows = rows.slice(0, this.lim);
        rows = rows.map((r) => ({ ...r }));
        return { data: this.one ? rows[0] || null : rows, error: null };
      }
      if (this.op === 'insert' || this.op === 'upsert') {
        const arr = (Array.isArray(this.v) ? this.v : [this.v]).map((r) => {
          const row = { id: uuid(), created_at: now(), ...r };
          if (this.t === 'messages') Object.assign(row, { hearts: [], deleted_for: [], hidden_for: [], deleted: false, history: [], ...r, id: row.id, created_at: row.created_at });
          if (this.op === 'upsert') {
            const keyCols = this.t === 'read_markers' ? ['pair_id', 'user_id'] : this.t === 'drafts' ? ['pair_id', 'user_id'] : ['id'];
            const i = T.findIndex((x) => keyCols.every((k) => x[k] === r[k]));
            if (i >= 0) { T[i] = { ...T[i], ...r }; emit(this.t, 'UPDATE', T[i]); return T[i]; }
          }
          T.push(row); emit(this.t, 'INSERT', row); return row;
        });
        return { data: this.one ? arr[0] : arr, error: null };
      }
      if (this.op === 'update') {
        const rows = T.filter(m); rows.forEach((r) => { Object.assign(r, this.v); emit(this.t, 'UPDATE', r); });
        return { data: this.one ? rows[0] || null : rows, error: null };
      }
      if (this.op === 'delete') {
        const gone = T.filter(m); DB[this.t] = T.filter((r) => !m(r)); gone.forEach((r) => emit(this.t, 'DELETE', null, r));
        return { data: gone, error: null };
      }
    }
  }
  const mine = () => DB.pair_members.find((r) => r.user_id === userId());
  const RPC = {
    public_labels: () => [{ side: 'Lewis', label: 'Mr Lees' }, { side: 'Agnes', label: 'Mrs Lees' }],
    claim_side: () => PAIR,
    recovery_prompts: () => [],
    unread_count: () => 0,
    mark_read_upto: (a) => { const s = sideOf(userId()); const r = DB.read_markers.find((x) => x.side === s); if (r) r.read_at = a.p_at; else DB.read_markers.push({ pair_id: PAIR, user_id: userId(), side: s, read_at: a.p_at }); emit('read_markers', 'UPDATE', r); return null; },
    set_reaction: (a) => { const m = DB.messages.find((x) => x.id === a.p_id); const s = sideOf(userId()); if (m) { m.hearts = m.hearts.includes(s) ? m.hearts.filter((x) => x !== s) : m.hearts.concat(s); emit('messages', 'UPDATE', m); } return null; },
    sealed_envelopes: () => DB.sealed_letters.map((l) => ({ ...l, body: undefined })),
    open_sealed_letter: (a) => { const l = DB.sealed_letters.find((x) => x.id === a.p_id); if (!l) return null; if (Date.parse(l.open_at) > Date.now()) throw { message: 'sealed' }; l.opened_at = l.opened_at || now(); return l; },
    trash_list: () => DB.message_trash.map((t) => ({ id: t.message_id, original: t.row, scope: 'both', deleted_by: t.by || 'Agnes', deleted_at: t.deleted_at })),
    trash_restore: (a) => { const t = DB.message_trash.find((x) => x.message_id === a.p_id); if (!t) return false; DB.message_trash = DB.message_trash.filter((x) => x !== t); DB.messages.push(t.row); emit('messages', 'INSERT', t.row); return true; },
    trash_delete_both: (a) => { const m = DB.messages.find((x) => x.id === a.p_id); if (m) { DB.messages = DB.messages.filter((x) => x !== m); DB.message_trash.push({ id: uuid(), message_id: m.id, deleted_at: now(), row: m, kind: m.kind, text: m.text, sender_side: sideOf(m.sender_id), created_at: m.created_at }); emit('messages', 'DELETE', null, m); } return true; },
    trash_clear: () => { DB.messages.forEach((m) => DB.message_trash.push({ id: uuid(), message_id: m.id, deleted_at: now(), row: m, kind: m.kind, text: m.text, sender_side: sideOf(m.sender_id), created_at: m.created_at })); const n = DB.messages.length; DB.messages = []; return n; },
    trash_purge_all: () => { const p = DB.message_trash.map((t) => t.row.media_path).filter(Boolean); DB.message_trash = []; return p; },
    trash_restore_all: () => { const n = DB.message_trash.length; DB.message_trash.forEach((t) => DB.messages.push(t.row)); DB.message_trash = []; return n; },
    factory_reset: (a) => { if (a.p_pass !== (seed.pass || 'test')) throw { message: 'wrong passphrase', code: '28P01' }; const paths = DB.messages.map((m) => m.media_path).filter(Boolean); ['messages', 'notes', 'scheduled_messages', 'journal_entries', 'drafts', 'sealed_letters', 'game_sessions', 'awards', 'message_trash', 'activity_log', 'note_reads'].forEach((t) => { DB[t] = []; }); DB.pair_settings[0].reset_at = now(); emit('pair_settings', 'UPDATE', DB.pair_settings[0]); return paths; },
    touch_last_seen: () => { const r = mine(); if (r) { r.last_seen_at = now(); } return null; },
    log_activity: (a) => { (a.p_items || []).forEach((it) => { const row = { id: uuid(), pair_id: PAIR, user_id: userId(), side: sideOf(userId()), at: it.at || now(), action: it.action, detail: it.detail || '' }; DB.activity_log.push(row); emit('activity_log', 'INSERT', row); }); const r = mine(); if (r) r.last_seen_at = now(); return null; },
    purge_retained_for_me: () => { const cut = new Date(); cut.setUTCHours(0, 0, 0, 0); cut.setUTCDate(cut.getUTCDate() - 10); const c = cut.toISOString(); DB.activity_log = DB.activity_log.filter((r) => r.at >= c); DB.arten_conversations = DB.arten_conversations.filter((r) => r.user_id !== userId() || r.started_at >= c); window.__purged = (window.__purged || 0) + 1; return null; },
    undo_send: () => true, game_start: () => null, delete_for_me: () => null, archive_message: () => null, mark_opened_once: () => null, set_emoji: () => null, set_moment: () => null, set_hidden: () => null
  };
  function rpc(name, args) {
    return Promise.resolve().then(() => {
      if (seed.missingRpc && seed.missingRpc.includes(name)) return { data: null, error: { message: 'Could not find the function public.' + name, code: 'PGRST202' } };
      if (!RPC[name]) { console.info('[fake] rpc', name); return { data: null, error: null }; }
      try { return { data: RPC[name](args || {}), error: null }; } catch (e) { return { data: null, error: e }; }
    });
  }
  function channel(name, cfg) {
    const ch = { name, subs: [], presenceKey: cfg && cfg.config && cfg.config.presence && cfg.config.presence.key, tracked: null };
    ch.on = (kind, opts, cb) => { const l = { kind: kind === 'postgres_changes' ? 'pg' : kind, table: opts && opts.table, event: opts && opts.event, cb, ch }; listeners.push(l); ch.subs.push(l); return ch; };
    ch.subscribe = (cb) => { setTimeout(() => { cb && cb('SUBSCRIBED'); if (ch.presenceKey) firePresence(); }, 10); return ch; };
    ch.track = (o) => { ch.tracked = o; firePresence(); return Promise.resolve('ok'); };
    ch.untrack = () => Promise.resolve();
    ch.send = (m) => { window.__fakeSent = (window.__fakeSent || []).concat([m]); return Promise.resolve('ok'); };
    ch.presenceState = () => { const s = {}; if (ch.tracked) s[ch.presenceKey] = [ch.tracked]; if (window.__fakePartnerOnline) s[meSide === 'Lewis' ? 'Agnes' : 'Lewis'] = [{ typing: false, ts: Date.now() }]; return s; };
    function firePresence() { ch.subs.filter((l) => l.kind === 'presence').forEach((l) => setTimeout(() => l.cb({}), 5)); }
    ch._firePresence = firePresence;
    return ch;
  }
  const client = {
    from: (t) => new Q(t), rpc, channel, removeChannel: () => {},
    auth: {
      getSession: async () => ({ data: { session } }),
      signInWithPassword: async ({ email, password }) => { if (pw[email] !== password) return { data: null, error: { message: 'Invalid login credentials' } }; session = { user: { id: email.startsWith('lewis') ? LEWIS : AGNES, email } }; return { data: { session }, error: null }; },
      signOut: async () => { session = null; return { error: null }; },
      signUp: async () => ({ error: { message: 'no' } }), updateUser: async () => ({ error: null }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } })
    },
    storage: { from: () => ({
      upload: async (p, b) => { blobs.set(p, b); return { data: { path: p }, error: null }; },
      createSignedUrl: async (p) => ({ data: { signedUrl: blobs.has(p) ? URL.createObjectURL(blobs.get(p)) : (window.__fakeImg ? window.__fakeImg(p) : '') }, error: null }),
      remove: async (ps) => { ps.forEach((p) => blobs.delete(p)); return { data: [], error: null }; },
      list: async () => ({ data: [...blobs.keys()].map((k) => ({ name: k.split('/').pop() })), error: null })
    }) },
    functions: { invoke: async () => ({ data: null, error: { message: 'not here' } }) }
  };
  window.supabase = { createClient: () => client };
  window.__fake = {
    DB, PAIR, LEWIS, AGNES, emit, blobs, listeners,
    partnerSend(o) { const row = { id: uuid(), pair_id: PAIR, sender_id: meSide === 'Lewis' ? AGNES : LEWIS, kind: o.kind || 'text', text: o.text || null, media_path: o.media_path || null, created_at: now(), hearts: [], deleted_for: [], hidden_for: [], deleted: false, effect: 'none', history: [], batch_id: o.batch_id || null, quiet: false }; DB.messages.push(row); emit('messages', 'INSERT', row); return row; },
    presence(on) { window.__fakePartnerOnline = on; listeners.filter((l) => l.kind === 'presence').forEach((l) => l.cb({})); }
  };
})();
