/* v15 ARTEN holdout runner. Loads lees-v12.js in a VM with an in-memory store holding the fixture
   (as arten_notes rows for the v14 code, and as arten_items rows for v15), then asks each question
   through the same path the ARTEN panel uses. Usage: node tests/arten-holdout.test.cjs [--json] [--misses] */
const fs = require("fs"), path = require("path"), vm = require("vm");
const H = JSON.parse(fs.readFileSync(path.join(__dirname, "arten-holdout.json"), "utf8"));
const code = fs.readFileSync(path.join(__dirname, "..", "lees-v12.js"), "utf8");
const PAIR = "pair-1";
function freshDB() {
  const F = H.fixture, other = (s) => (s === "Lewis" ? "Agnes" : "Lewis");
  const notes = [], items = [];
  const add = (author, subjectSide, lines) => {
    notes.push({ pair_id: PAIR, owner_side: author, subject: subjectSide === author ? "me" : "other", body: lines.join("\n") });
    lines.forEach((b) => items.push({ id: "i" + items.length, pair_id: PAIR, author_side: author, subject_side: subjectSide, body: b, source: "written", status: "saved", created_at: "2026-11-0" + (1 + (items.length % 9)) + "T10:00:00Z", updated_at: "2026-11-01T10:00:00Z" }));
  };
  add("Lewis", "Agnes", F.Lewis_about_Agnes); add("Agnes", "Lewis", F.Agnes_about_Lewis);
  add("Lewis", "Lewis", F.Lewis_about_Lewis); add("Agnes", "Agnes", F.Agnes_about_Agnes);
  return { arten_notes: notes, arten_items: items, arten_facts: [], arten_conversations: [] };
}
let DB = freshDB();
function from(t) {
  const st = { f: [], op: "select", v: null, one: false };
  const rows = () => (DB[t] = DB[t] || []);
  const run = () => {
    const m = (r) => st.f.every((f) => f(r));
    if (st.op === "select") { const d = rows().filter(m).map((r) => ({ ...r })); return { data: st.one ? d[0] || null : d, error: null }; }
    if (st.op === "insert" || st.op === "upsert") {
      const arr = (Array.isArray(st.v) ? st.v : [st.v]).map((r) => {
        if (st.op === "upsert" && t === "arten_notes") { const i = rows().findIndex((x) => x.pair_id === r.pair_id && x.owner_side === r.owner_side && x.subject === r.subject); if (i >= 0) { rows()[i] = { ...rows()[i], ...r }; return rows()[i]; } }
        const row = { id: "n" + Math.random().toString(36).slice(2), created_at: new Date().toISOString(), ...r }; rows().push(row); return row;
      });
      return { data: st.one ? arr[0] : arr, error: null };
    }
    if (st.op === "update") { const d = rows().filter(m); d.forEach((r) => Object.assign(r, st.v)); return { data: st.one ? d[0] || null : d, error: null }; }
    if (st.op === "delete") { const d = rows().filter(m); DB[t] = rows().filter((r) => !m(r)); return { data: d, error: null }; }
  };
  const api = {
    select() { return api; }, insert(v) { st.op = "insert"; st.v = v; return api; }, upsert(v) { st.op = "upsert"; st.v = v; return api; },
    update(v) { st.op = "update"; st.v = v; return api; }, delete() { st.op = "delete"; return api; },
    eq(c, v) { st.f.push((r) => String(r[c]) === String(v)); return api; }, neq(c, v) { st.f.push((r) => String(r[c]) !== String(v)); return api; },
    in(c, v) { st.f.push((r) => v.map(String).includes(String(r[c]))); return api; }, is(c, v) { st.f.push((r) => (r[c] == null) === (v == null)); return api; },
    gte() { return api; }, lt() { return api; }, or() { return api; }, order() { return api; }, limit() { return api; },
    maybeSingle() { st.one = true; return api; }, single() { st.one = true; return api; },
    then(res, rej) { return Promise.resolve().then(run).then(res, rej); }
  };
  return api;
}
const timers = [];
const noopEl = () => ({ style: { setProperty() {} }, dataset: {}, classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } }, appendChild() {}, append() {}, setAttribute() {}, addEventListener() {}, querySelector() { return null; }, querySelectorAll() { return []; }, getContext() { return { clearRect() {}, drawImage() {} }; } });
const sandbox = {
  console, clearInterval, clearTimeout,
  setInterval(fn, ms) { const id = setInterval(fn, ms); timers.push(id); return id; },
  setTimeout(fn, ms) { const id = setTimeout(fn, ms); timers.push(id); return id; },
  localStorage: { getItem: () => null, setItem() {}, removeItem() {}, length: 0, key: () => null },
  sessionStorage: { getItem: () => null, setItem() {}, removeItem() {}, length: 0, key: () => null },
  matchMedia: () => ({ matches: true, addEventListener() {}, removeEventListener() {} }),
  requestAnimationFrame: (fn) => setTimeout(fn, 0), cancelAnimationFrame: clearTimeout,
  performance: { now: () => Date.now() }, innerWidth: 390, innerHeight: 844,
  addEventListener() {}, removeEventListener() {},
  MutationObserver: function () { this.observe = function () {}; this.disconnect = function () {}; },
  LeesApp: { me: "Lewis", other: "Agnes", pairId: PAIR, unlocked: true, name: (s) => s, sb: { from, rpc: async () => ({ data: null, error: null }) } }
};
sandbox.window = sandbox; sandbox.globalThis = sandbox;
sandbox.document = { readyState: "loading", hidden: false, addEventListener() {}, removeEventListener() {}, createElement: noopEl, getElementById() { return null; }, querySelector() { return null; }, querySelectorAll() { return []; }, documentElement: { style: { setProperty() {} }, getAttribute() { return null; } }, body: noopEl() };
vm.createContext(sandbox);
vm.runInContext(code, sandbox, { filename: "lees-v12.js" });
const L = sandbox.LeesV12;
async function respond(q) {
  if (typeof L.respond === "function") { const r = await L.respond(q); return { id: r && r.id, text: String((r && r.text) || ""), kind: r && r.kind }; }
  let t = null; try { t = await L.factsReply(q); } catch (e) {}
  if (t) return { id: "facts", text: t };
  const h = L.ask(q) || [];
  return { id: h[0] && h[0].e.id, text: (h[0] && h[0].e.a) || "" };
}
const XisX = /\b([A-Z][a-z]+)\s+is\s+\1\b/;
const REFUSE = /\b(won.?t|can.?t|cannot|not going to|rather not|not safe|safer)\b/i;
(async () => {
  const groups = {}, misses = [];
  for (const it of H.questions) {
    DB = freshDB();
    const r = await respond(it.q);
    const low = r.text.toLowerCase();
    let pass = false;
    if (it.g === "howto" || it.g === "nav") pass = it.ids.includes(r.id);
    else if (it.g === "personal") pass = it.has.some((h) => low.includes(h.toLowerCase())) && !XisX.test(r.text);
    else if (it.kind === "add") pass = it.has.some((h) => low.includes(h.toLowerCase())) && !REFUSE.test(r.text);
    else if (it.kind === "refuse") { const wrote = ["arten_notes", "arten_items"].some((t) => (DB[t] || []).some((x) => String(x.body).includes(it.not[0]))); pass = REFUSE.test(r.text) && !it.not.some((b) => r.text.includes(b)) && !wrote; }
    else if (it.kind === "edit") pass = /about me|about agnes|things we know/i.test(r.text);
    const g = it.g === "edit" ? "edit" : it.g;
    groups[g] = groups[g] || [0, 0]; groups[g][1]++; if (pass) groups[g][0]++;
    if (!pass) misses.push(`[${g}${it.kind ? "/" + it.kind : ""}] ${it.q} -> ${r.id || "-"} :: ${r.text.slice(0, 140).replace(/\n/g, " ")}`);
  }
  timers.forEach((t) => { clearTimeout(t); clearInterval(t); });
  const tot = Object.values(groups).reduce((a, g) => [a[0] + g[0], a[1] + g[1]], [0, 0]);
  console.log("holdout " + tot[0] + "/" + tot[1] + " = " + (100 * tot[0] / tot[1]).toFixed(1) + "%  " + Object.entries(groups).map(([k, v]) => k + " " + v[0] + "/" + v[1]).join("  "));
  if (process.argv.includes("--misses")) misses.forEach((m) => console.log(" - " + m));
  process.exit(0);
})();
