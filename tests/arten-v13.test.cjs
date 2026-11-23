/* Runs the 100 ARTEN questions against LeesV12.ask (the search function). */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const questions = JSON.parse(fs.readFileSync(path.join(__dirname, "arten-questions.json"), "utf8"));
const code = fs.readFileSync(path.join(__dirname, "..", "lees-v12.js"), "utf8");

const intervals = [];
const timeouts = [];
const storage = {};
const sandbox = {
  console,
  setInterval(fn, ms) { const id = setInterval(fn, ms); intervals.push(id); return id; },
  clearInterval,
  setTimeout(fn, ms) { const id = setTimeout(fn, ms); timeouts.push(id); return id; },
  clearTimeout,
  localStorage: { getItem: (k) => (k in storage ? storage[k] : null), setItem: (k, v) => { storage[k] = String(v); }, removeItem: (k) => { delete storage[k]; } },
  sessionStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
  requestAnimationFrame: (fn) => setTimeout(fn, 16),
  cancelAnimationFrame: clearTimeout,
  performance: { now: () => 0 },
  innerWidth: 390,
  innerHeight: 800,
  addEventListener() {},
  removeEventListener() {},
  MutationObserver: function () { this.observe = function () {}; this.disconnect = function () {}; },
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
sandbox.document = {
  readyState: "loading",
  hidden: false,
  addEventListener() {},
  removeEventListener() {},
  createElement() { return { style: {}, classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } }, appendChild() {}, setAttribute() {}, addEventListener() {}, querySelector() { return null; }, getContext() { return { clearRect() {}, drawImage() {} }; } }; },
  getElementById() { return null; },
  querySelector() { return null; },
  querySelectorAll() { return []; },
  documentElement: { style: { setProperty() {} }, getAttribute() { return null; } },
  body: { appendChild() {}, classList: { add() {}, remove() {}, toggle() {} } },
};
vm.createContext(sandbox);
vm.runInContext(code, sandbox, { filename: "lees-v12.js" });
intervals.forEach(clearInterval);
timeouts.forEach(clearTimeout);

const ask = sandbox.LeesV12 && sandbox.LeesV12.ask;
if (typeof ask !== "function") {
  console.error("LeesV12.ask missing");
  process.exit(1);
}
let ok = 0;
const misses = [];
for (const item of questions) {
  const hits = ask(item.q) || [];
  const got = hits[0] && hits[0].e && hits[0].e.id;
  if (got === item.id) ok++;
  else misses.push({ q: item.q, want: item.id, got: got || "(none)", score: hits[0] && hits[0].s });
}
console.log(ok + "/" + questions.length);
if (misses.length) {
  console.log("MISSES");
  misses.forEach((m) => console.log("- " + m.want + " got " + m.got + " :: " + m.q));
}
process.exit(ok >= 80 ? 0 : 2);
