/* Ten personal ARTEN questions. Calls composePersonal and factsReply, not search. */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const code = fs.readFileSync(path.join(__dirname, "..", "lees-v12.js"), "utf8");
const intervals = [];
const timeouts = [];
const notes = { me: "I like tea in the morning.", other: "She likes rain.\nWrites letters on Sundays." };
const saved = [];
function chain(table) {
  const state = { table: table, subject: "", body: "" };
  const api = {
    select: function () { return api; },
    eq: function (col, val) { if (col === "subject") state.subject = val; return api; },
    order: function () { return api; },
    maybeSingle: async function () {
      if (state.table !== "arten_notes") return { data: null };
      return { data: { body: notes[state.subject] || "" } };
    },
    upsert: async function (row) {
      notes[row.subject] = row.body;
      saved.push(row);
      return { error: null };
    },
    then: undefined
  };
  return api;
}
const sandbox = {
  console,
  setInterval(fn, ms) { const id = setInterval(fn, ms); intervals.push(id); return id; },
  clearInterval,
  setTimeout(fn, ms) { const id = setTimeout(fn, ms); timeouts.push(id); return id; },
  clearTimeout,
  localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  sessionStorage: { getItem: () => null, setItem() {}, removeItem() {}, length: 0, key: () => null },
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
  requestAnimationFrame: (fn) => setTimeout(fn, 16),
  cancelAnimationFrame: clearTimeout,
  performance: { now: () => 0 },
  innerWidth: 390,
  innerHeight: 844,
  addEventListener() {},
  removeEventListener() {},
  MutationObserver: function () { this.observe = function () {}; this.disconnect = function () {}; },
  LeesApp: {
    me: "Lewis",
    other: "Agnes",
    pairId: "pair-1",
    unlocked: true,
    name: function (side) { return side === "Agnes" ? "Mrs Lees" : "Mr Lees"; },
    sb: { from: chain }
  }
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
sandbox.document = {
  readyState: "loading",
  hidden: false,
  addEventListener() {},
  removeEventListener() {},
  createElement() {
    return {
      style: {},
      classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
      appendChild() {},
      setAttribute() {},
      addEventListener() {},
      querySelector() { return null; },
      getContext() { return { clearRect() {}, drawImage() {}, measureText() { return { width: 10 }; } }; }
    };
  },
  getElementById() { return null; },
  querySelector() { return null; },
  querySelectorAll() { return []; },
  documentElement: { style: { setProperty() {} }, getAttribute() { return null; } },
  body: { appendChild() {}, classList: { add() {}, remove() {}, toggle() {} } }
};
vm.createContext(sandbox);
vm.runInContext(code, sandbox, { filename: "lees-v12.js" });
intervals.forEach(clearInterval);
timeouts.forEach(clearTimeout);

const cp = sandbox.LeesV12.composePersonal;
const fr = sandbox.LeesV12.factsReply;
const ctx = {
  meName: "Mr Lees",
  otherName: "Mrs Lees",
  meBody: "I like tea in the morning.",
  otherBody: "She likes rain.\nWrites letters on Sundays."
};
const questions = [
  ["what's my partner's name and what do you know about them", "partner"],
  ["what do you know about me", "me"],
  ["what does my partner like", "partner"],
  ["tell me about them", "partner"],
  ["facts about her", "partner"],
  ["who am i", "me"],
  ["things about me", "me"],
  ["what is my boyfriend's favourite food", "partner"],
  ["what do you know about my wife", "partner"],
  ["my facts", "me"]
];

function bad(text) {
  if (!text || typeof text !== "string") return "empty";
  const bits = text.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (!bits.length) return "no sentence";
  if (!/[.!?]$/.test(text.trim())) return "does not end a sentence";
  if (/\b(\w+(?:\s+\w+){0,3}) is \1\b/i.test(text)) return "X is X";
  if (/Mrs Lees is Mrs Lees/i.test(text)) return "name is name";
  for (const b of bits) {
    if (!/[.!?]$/.test(b.trim())) return "fragment: " + b;
  }
  return "";
}

let ok = 0;
const fails = [];
for (const [q, kind] of questions) {
  const text = cp(q, ctx);
  const why = bad(text);
  const named = kind === "partner" ? text.indexOf("Mrs Lees is your partner.") === 0 : text.indexOf("Here is what you saved about yourself.") === 0;
  if (!why && named && (kind === "me" ? /tea/i.test(text) : /rain|letters/i.test(text))) ok++;
  else fails.push(q + " :: " + (why || "shape") + " :: " + text);
}

(async function () {
  const remembered = await fr("remember that she likes sushi");
  const noted = await fr("note that he likes running");
  const empty = cp("what do you know about me", { meName: "Mr Lees", otherName: "Mrs Lees", meBody: "", otherBody: "" });
  const clash = cp("what's my partner's name and what do you know about them", { meName: "Mr Lees", otherName: "Mrs Lees", meBody: "", otherBody: "Mrs Lees is Mrs Lees" });
  function check(label, text, re) {
    const why = bad(text);
    if (!why && re.test(text)) ok++;
    else fails.push(label + " :: " + (why || "shape") + " :: " + text);
  }
  check("remember sushi", remembered, /^I'll remember that Mrs Lees likes sushi\.$/);
  check("note running", noted, /^I'll remember that Mrs Lees likes running\.$/);
  check("empty me", empty, /I don't have anything saved about you yet\./);
  check("no X is X", clash, /I don't have anything saved about Mrs Lees yet\./);
  if (/Mrs Lees is Mrs Lees/i.test(clash)) fails.push("clash still says X is X");
  console.log(ok + "/14");
  if (fails.length) {
    console.log("FAILS");
    fails.forEach((f) => console.log("- " + f));
    process.exit(1);
  }
  if (!saved.some((r) => r.subject === "other" && /sushi/.test(r.body))) {
    console.log("remember did not save the partner note");
    process.exit(1);
  }
})();
