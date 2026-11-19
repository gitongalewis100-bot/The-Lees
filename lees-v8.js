/* The Lees v8: the Create hub (+), sealed letters, live games (tic-tac-toe first) and awards.
   Talks to the app only through window.LeesApp and its lees:* events. Server rules live in
   supabase/migrations/2026-11-18_letters_games_awards.sql: a sealed letter's body is not readable
   by its recipient before its date, and every game move is checked by the database. */
(function () {
  "use strict";
  var A = function () { return window.LeesApp; };
  var $ = function (id) { return document.getElementById(id); };
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function svg(d, cls) { return '<svg class="' + (cls || "i sm") + '" viewBox="0 0 24 24" aria-hidden="true"><path d="' + d + '"/></svg>'; }
  var reduce = function () { return !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches); };
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };
  var D = { env: [], letters: {}, game: null, games: [], awards: [], chan: null, nextTimer: 0, pollTimer: 0, tickTimer: 0, gameOpen: false, offset: 0, shownReady: {} };
  var OTHER = function (s) { return s === "Lewis" ? "Agnes" : "Lewis"; };
  var initial = function (side) { return side === "Lewis" ? "L" : "A"; };
  var fmtWhen = function (ts) { return new Date(ts).toLocaleString([], { weekday: "short", day: "numeric", month: "short", year: new Date(ts).getFullYear() !== new Date().getFullYear() ? "numeric" : undefined, hour: "2-digit", minute: "2-digit" }); };
  function until(ts) {
    var ms = ts - Date.now();
    if (ms <= 0) return "Ready now";
    var m = Math.round(ms / 60000), h = Math.floor(m / 60), d = Math.floor(h / 24);
    if (d >= 2) return "Opens in " + d + " days";
    if (d === 1) return "Opens tomorrow";
    if (h >= 1) return "Opens in " + h + " h " + (m % 60) + " min";
    if (m >= 1) return "Opens in " + m + " min";
    return "Opens in under a minute";
  }

  /* ================= Sync ================= */
  function sb() { return A() && A().sb; }
  // Until the server side of a feature is switched on, say so plainly instead of showing a raw error.
  function friendly(err) {
    var m = (err && err.message) || "";
    if (/could not find|does not exist|schema cache|PGRST20|42883|42P01/i.test(m + " " + (err && err.code))) return "This feature is still being switched on. Try again in a little while.";
    return m || "Try again in a moment.";
  }
  async function loadEnvelopes() {
    var c = sb(); if (!c || !A().pairId) return;
    var r = await c.rpc("sealed_envelopes");
    if (r.error) return;
    D.env = (r.data || []).map(function (e) { return { id: e.id, from: e.author_side, to: e.recipient_side, title: e.title || "", seal: e.seal || "wax-red", paper: e.paper || "cream", openAt: Date.parse(e.open_at), openedAt: e.opened_at ? Date.parse(e.opened_at) : 0, createdAt: Date.parse(e.created_at) }; });
    scheduleNextReady();
    refreshBadges();
  }
  async function loadGames() {
    var c = sb(); if (!c || !A().pairId) return;
    var r = await c.from("game_sessions").select("*").eq("pair_id", A().pairId).order("created_at", { ascending: false }).limit(200);
    if (r.error) return;
    D.games = r.data || [];
    var live = D.games.find(function (g) { return g.status === "invited" || g.status === "active"; });
    D.game = live || D.games[0] || null;
    if (D.game) noteClock(D.game);
    refreshBadges();
  }
  async function loadAwards() {
    var c = sb(); if (!c || !A().pairId) return;
    var r = await c.from("awards").select("*").eq("pair_id", A().pairId).order("created_at", { ascending: false }).limit(500);
    if (!r.error) D.awards = r.data || [];
  }
  function subscribe() {
    var c = sb(); if (!c || !A().pairId) return;
    if (D.chan) { try { c.removeChannel(D.chan); } catch (e) {} }
    var pid = A().pairId;
    D.chan = c.channel("v8-" + pid)
      .on("postgres_changes", { event: "*", schema: "public", table: "game_sessions", filter: "pair_id=eq." + pid }, function (p) { onGameRow(p.new && p.new.id ? p.new : null); })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "awards", filter: "pair_id=eq." + pid }, function (p) { onAward(p.new); })
      .on("postgres_changes", { event: "*", schema: "public", table: "sealed_letters", filter: "pair_id=eq." + pid }, function () { loadEnvelopes().then(rerender); })
      .on("broadcast", { event: "letter" }, function (m) { onLetterPing((m && m.payload) || {}); })
      .on("broadcast", { event: "game" }, function (m) { onGamePing((m && m.payload) || {}); })
      .subscribe();
  }
  function ping(event, payload) { try { if (D.chan) D.chan.send({ type: "broadcast", event: event, payload: payload }); } catch (e) {} }
  function setPanel(fn) { D.panel = fn ? { redraw: fn, title: ($("panelTitle") || {}).textContent } : null; }
  // Only the panel that registered may redraw, and only while it is the one on screen.
  function rerender() { var a = A(); if (a && a.view === "panel" && D.panel && D.panel.redraw && $("panelTitle").textContent === D.panel.title) D.panel.redraw(); }

  document.addEventListener("lees:unlocked", function () {
    D.shownReady = store.get("v8-shown-" + A().me, {});
    Promise.all([loadEnvelopes(), loadGames(), loadAwards()]).then(function () { subscribe(); refreshBadges(); setTimeout(announceReady, 900); checkInvite(); });
  });
  document.addEventListener("lees:synced", function () { if (!D.chan) subscribe(); });
  document.addEventListener("lees:resume", function () { Promise.all([loadEnvelopes(), loadGames()]).then(function () { announceReady(); checkInvite(); rerender(); }); });
  document.addEventListener("lees:locked", function () {
    var c = sb(); if (c && D.chan) { try { c.removeChannel(D.chan); } catch (e) {} }
    D.chan = null; D.env = []; D.letters = {}; D.game = null; D.games = []; D.awards = []; D.gameOpen = false;
    clearTimeout(D.nextTimer); clearInterval(D.tickTimer);
    document.querySelectorAll(".v8-overlay").forEach(function (n) { n.remove(); });
  });
  document.addEventListener("lees:render", function () { if (D.gameOpen) drawGameChat(); });

  // Opened from the letter card in the chat: behaves exactly like tapping the envelope in Sealed letters.
  function openLetterById(id) {
    var a = A();
    loadEnvelopes().then(function () {
      var e = D.env.find(function (x) { return x.id === id; });
      if (!e) { a.notice("Letter not found", "It may have been withdrawn.", { error: true }); return; }
      if (e.to === a.me && e.openAt > Date.now()) { a.haptic("error"); a.notice("Still sealed", "This letter opens " + fmtWhen(e.openAt) + ".", { kind: "letter", action: { label: "See it", run: function () { openLetters("in"); } } }); return; }
      openLetter(e);
    });
  }
  function readyForMe() { var me = A() && A().me; return D.env.filter(function (e) { return e.to === me && !e.openedAt && e.openAt <= Date.now(); }); }
  function pendingInvite() { var g = D.game, me = A() && A().me; return g && g.status === "invited" && g.state && g.state.by !== me ? g : null; }
  function readyCount() { return readyForMe().length + (pendingInvite() ? 1 : 0); }
  function refreshBadges() {
    var tile = document.querySelector('.navbtn[data-key="plus"]');
    if (!tile) return;
    var n = readyCount(), b = tile.querySelector(".notif-count");
    if (n && !b) { b = el("span", "notif-count"); tile.appendChild(b); }
    if (b) { if (n) b.textContent = String(n); else b.remove(); }
    tile.classList.toggle("v8-glow", n > 0);
  }
  function scheduleNextReady() {
    clearTimeout(D.nextTimer);
    var me = A() && A().me, now = Date.now();
    var next = D.env.filter(function (e) { return e.to === me && !e.openedAt && e.openAt > now; }).sort(function (a, b) { return a.openAt - b.openAt; })[0];
    if (!next) return;
    D.nextTimer = setTimeout(function () { refreshBadges(); announceReady(); rerender(); }, Math.min(2147000000, next.openAt - now + 400));
  }

  /* ================= Create hub ================= */
  function openCreate() {
    var a = A(); if (!a) return;
    a.openPanel("Create", "Just for the two of you", stillFn(function (body) {
      body.classList.add("v8");
      setPanel(function () { a.renderPanel(); });
      var grid = el("div", "v8-hub");
      var ready = readyForMe().length, sealedForThem = D.env.filter(function (e) { return e.from === a.me && !e.openedAt; }).length;
      grid.appendChild(hubCard("letter", "Sealed letter", "Write now, choose the day it can be opened", ready ? ready + " ready for you" : sealedForThem ? sealedForThem + " sealed for " + a.name(a.other) : "", function () { openLetters(); }, ready > 0));
      var inv = pendingInvite();
      grid.appendChild(hubCard("ttt", "Tic-tac-toe", "Live, 10 seconds a move, chat while you play", inv ? a.name(a.other) + " is waiting for you" : tally(a.me).w + " wins · " + tally(a.me).l + " losses", function () { openGame(); }, !!inv));
      grid.appendChild(hubCard("trophy", "Trophy cabinet", "Awards you've won, and your points", xp(a.me) + " points · level " + level(xp(a.me)), function () { openCabinet(); }, false));
      body.appendChild(grid);
      body.appendChild(el("p", "snote", "More games are coming. Awards from every game add to the same cabinet."));
    }));
  }
  function stillFn(f) { f.still = true; return f; }
  var HUB_ART = {
    letter: '<svg viewBox="0 0 120 84" aria-hidden="true"><rect x="6" y="10" width="108" height="68" rx="8" class="env-body"/><path d="M6 18l54 34 54-34" class="env-flap"/><circle cx="60" cy="50" r="12" class="env-seal"/><path d="M55 50h10M60 45v10" class="env-seal-mark"/></svg>',
    ttt: '<svg viewBox="0 0 84 84" aria-hidden="true"><path d="M30 8v68M54 8v68M8 30h68M8 54h68" class="ttt-grid"/><path d="M13 13l12 12M25 13L13 25" class="ttt-x"/><circle cx="42" cy="42" r="7" class="ttt-o"/><path d="M59 59l12 12M71 59L59 71" class="ttt-x"/></svg>',
    trophy: '<svg viewBox="0 0 84 84" aria-hidden="true"><path d="M26 12h32v18a16 16 0 0 1-32 0z" class="tr-cup"/><path d="M26 18H14a10 10 0 0 0 12 14M58 18h12a10 10 0 0 1-12 14" class="tr-ear"/><path d="M42 46v12M30 72h24l-3-14H33z" class="tr-base"/></svg>'
  };
  function hubCard(kind, title, sub, meta, fn, hot) {
    var b = el("button", "v8-card lift v8-" + kind + (hot ? " hot" : ""));
    b.type = "button";
    var art = el("div", "v8-art"); art.innerHTML = HUB_ART[kind];
    var tx = el("div", "v8-tx");
    tx.appendChild(el("b", "", title));
    tx.appendChild(el("span", "", sub));
    if (meta) tx.appendChild(el("em", "", meta));
    b.append(art, tx);
    b.addEventListener("click", function () { A().haptic("press"); fn(); });
    return b;
  }

  /* ================= Sealed letters ================= */
  var SEALS = { "wax-red": ["#a3242c", "Crimson"], "wax-gold": ["#b8892b", "Gold"], "wax-navy": ["#283c6e", "Midnight"], "wax-forest": ["#2f5a43", "Forest"], "wax-rose": ["#c2476f", "Rose"], "wax-plum": ["#5b2f6b", "Plum"] };
  var PAPERS = { cream: ["#fbf5e6", "Cream"], blush: ["#fbecec", "Blush"], sky: ["#edf3fb", "Sky"], sage: ["#eef4ec", "Sage"], night: ["#1f1d2b", "Night"] };
  var TITLES = ["Open when you miss me", "Open on your birthday", "Open when you can't sleep", "Open on our anniversary", "Open when you need a smile", "Open on a hard day"];
  function envelopeArt(e, big) {
    var seal = (SEALS[e.seal] || SEALS["wax-red"])[0];
    var w = document.createElement("div");
    w.className = "env" + (big ? " big" : "");
    w.style.setProperty("--seal", seal);
    w.style.setProperty("--paper", (PAPERS[e.paper] || PAPERS.cream)[0]);
    w.innerHTML = '<div class="env-back"></div><div class="env-letter"></div><div class="env-front"></div><div class="env-flapx"></div>' +
      '<div class="env-wax"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5s-7.5-4.4-7.5-10A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.9c0 5.6-7.5 10-7.5 10z"/></svg></div>' +
      '<div class="env-addr"><span class="env-to"></span><span class="env-from"></span></div><div class="env-stamp"><span></span></div><div class="env-post mono"></div>';
    w.querySelector(".env-to").textContent = "To " + A().name(e.to);
    w.querySelector(".env-from").textContent = "From " + A().name(e.from);
    var d = new Date(e.openAt);
    w.querySelector(".env-stamp span").textContent = d.toLocaleDateString([], { day: "numeric", month: "short" });
    w.querySelector(".env-post").textContent = "Do not open before " + d.toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });
    return w;
  }
  function openLetters(tab) {
    var a = A();
    var cur = tab || (readyForMe().length || D.env.some(function (e) { return e.to === a.me; }) ? "in" : "out");
    a.openPanel("Sealed letters", "Written now, opened on the day", stillFn(function (body) {
      body.classList.add("v8");
      setPanel(function () { a.renderPanel(); });
      var tabs = el("div", "v8-tabs");
      [["in", "For you"], ["out", "From you"]].forEach(function (t) {
        var b = el("button", "v8-tab" + (cur === t[0] ? " on" : ""), t[1]);
        b.type = "button";
        var n = t[0] === "in" ? readyForMe().length : 0;
        if (n) b.appendChild(el("span", "v8-dot", String(n)));
        b.addEventListener("click", function () { cur = t[0]; a.renderPanel(); });
        tabs.appendChild(b);
      });
      body.appendChild(tabs);
      var write = el("button", "v8-write");
      write.type = "button";
      write.innerHTML = svg("M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z") + "<span>Write a sealed letter to " + a.name(a.other) + "</span>";
      write.addEventListener("click", function () { composeLetter(); });
      body.appendChild(write);
      var list = D.env.filter(function (e) { return cur === "in" ? e.to === a.me : e.from === a.me; });
      list.sort(function (x, y) { var rx = cur === "in" && !x.openedAt && x.openAt <= Date.now(), ry = cur === "in" && !y.openedAt && y.openAt <= Date.now(); if (rx !== ry) return rx ? -1 : 1; return y.openAt - x.openAt; });
      if (!list.length) {
        var empty = el("div", "v8-empty");
        empty.appendChild(envelopeArt({ from: a.other, to: a.me, seal: "wax-red", paper: "cream", openAt: Date.now() }, false));
        empty.appendChild(el("b", "", cur === "in" ? "No letters for you yet" : "You haven't sealed a letter yet"));
        empty.appendChild(el("span", "", cur === "in" ? "When " + a.name(a.other) + " seals one, it waits here until its day." : "Write one now. " + a.name(a.other) + " sees the envelope, but can't open it before the day you choose."));
        body.appendChild(empty);
        return;
      }
      var grid = el("div", "v8-envs");
      list.forEach(function (e) { grid.appendChild(envelopeCard(e)); });
      body.appendChild(grid);
    }));
  }
  function envelopeCard(e) {
    var a = A(), mine = e.from === a.me, ready = e.openAt <= Date.now();
    var card = el("button", "v8-env" + (ready && !mine && !e.openedAt ? " ready" : "") + (!ready && !mine ? " locked" : "") + (e.openedAt ? " opened" : ""));
    card.type = "button";
    card.appendChild(envelopeArt(e));
    var meta = el("div", "v8-env-meta");
    meta.appendChild(el("b", "", e.title || "A letter"));
    var line = mine ? (e.openedAt ? "Opened " + fmtWhen(e.openedAt) : ready ? "Delivered · not opened yet" : until(e.openAt)) : (e.openedAt ? "Opened " + fmtWhen(e.openedAt) : ready ? "Ready to open" : until(e.openAt));
    meta.appendChild(el("span", "", line));
    meta.appendChild(el("small", "mono", (ready ? "Opened on " : "Opens ") + fmtWhen(e.openAt)));
    card.appendChild(meta);
    card.addEventListener("click", function () {
      if (!mine && !ready) {
        card.classList.remove("shake"); void card.offsetWidth; card.classList.add("shake");
        a.haptic("error");
        a.notice("Still sealed", "This letter opens " + fmtWhen(e.openAt) + ".");
        return;
      }
      openLetter(e);
    });
    return card;
  }
  async function openLetter(e) {
    var a = A(), c = sb(); if (!c) return;
    var r = await c.rpc("open_sealed_letter", { p_id: e.id });
    var row = Array.isArray(r.data) ? r.data[0] : r.data;
    if (r.error || !row) { a.notice("Couldn't open the letter", friendly(r.error), { error: true }); return; }
    if (!e.openedAt && e.to === a.me) { e.openedAt = Date.now(); ping("letter", { kind: "opened", id: e.id }); }
    D.letters[e.id] = row;
    showLetter(e, row);
    refreshBadges();
  }
  function showLetter(e, row) {
    var a = A();
    var ov = el("div", "v8-overlay v8-reader" + (reduce() ? " still" : ""));
    ov.setAttribute("role", "dialog"); ov.setAttribute("aria-modal", "true"); ov.setAttribute("aria-label", "Letter from " + a.name(e.from));
    var stage = el("div", "v8-rstage");
    var env = envelopeArt(e, true);
    stage.appendChild(env);
    var paper = el("article", "v8-paper p-" + (row.paper || "cream"));
    paper.style.setProperty("--paper", (PAPERS[row.paper] || PAPERS.cream)[0]);
    var head = el("header", "v8-ph");
    head.appendChild(el("span", "mono", new Date(row.created_at).toLocaleDateString([], { weekday: "long", day: "numeric", month: "long", year: "numeric" })));
    if (row.title) head.appendChild(el("h2", "", row.title));
    paper.appendChild(head);
    var txt = el("div", "v8-ptext");
    txt.textContent = row.body;
    paper.appendChild(txt);
    paper.appendChild(el("p", "v8-sign", "— " + a.name(e.from)));
    var foot = el("div", "v8-pfoot mono", e.from === a.me ? (e.openedAt ? "Opened by " + a.name(e.to) + " · " + fmtWhen(e.openedAt) : "Sealed until " + fmtWhen(e.openAt)) : "Kept in your letters");
    paper.appendChild(foot);
    stage.appendChild(paper);
    var close = el("button", "v8-x"); close.type = "button"; close.setAttribute("aria-label", "Close letter"); close.innerHTML = svg("M18 6L6 18M6 6l12 12");
    var tools = el("div", "v8-rtools");
    if (e.from === a.me && !e.openedAt && e.openAt > Date.now()) {
      var edb = el("button", "btn sm", "Edit letter"); edb.type = "button";
      edb.addEventListener("click", function () { ov.remove(); composeLetter({ id: e.id, title: row.title || "", body: row.body, seal: row.seal, paper: row.paper, at: row.open_at }); });
      tools.appendChild(edb);
      var wd = el("button", "btn ghost sm", "Withdraw letter"); wd.type = "button";
      wd.addEventListener("click", async function () {
        var ok = await a.centredBanner({ title: "Withdraw this letter?", desc: a.name(e.to) + " will no longer see it. This can't be undone.", okLabel: "Withdraw" });
        if (!ok) return;
        var d = await sb().from("sealed_letters").delete().eq("id", e.id);
        if (d.error) { a.notice("Couldn't withdraw", d.error.message, { error: true }); return; }
        ping("letter", { kind: "withdrawn", id: e.id });
        ov.remove(); await loadEnvelopes(); rerender();
      });
      tools.appendChild(wd);
    }
    if (e.to === a.me) {
      var rep = el("button", "btn sm", "Write back"); rep.type = "button";
      rep.addEventListener("click", function () { ov.remove(); composeLetter(); });
      tools.appendChild(rep);
    }
    ov.append(close, stage, tools);
    document.body.appendChild(ov);
    var shut = function () { ov.classList.add("out"); setTimeout(function () { ov.remove(); }, 260); rerender(); };
    close.addEventListener("click", shut);
    ov.addEventListener("keydown", function (ev) { if (ev.key === "Escape") shut(); });
    close.focus();
    requestAnimationFrame(function () { ov.classList.add("open"); });
    if (e.to === a.me && !reduce()) setTimeout(function () { confettiHearts(); }, 900);
  }
  function confettiHearts() {
    var a = A();
    for (var i = 0; i < 14; i++) {
      (function (k) { setTimeout(function () { try { a.burstAt(window.innerWidth * (0.2 + Math.random() * 0.6), window.innerHeight * 0.35, "heart", 3); } catch (e) {} }, k * 60); })(i);
    }
  }
  function localInput(dt) { var p = function (n) { return String(n).padStart(2, "0"); }; return dt.getFullYear() + "-" + p(dt.getMonth() + 1) + "-" + p(dt.getDate()) + "T" + p(dt.getHours()) + ":" + p(dt.getMinutes()); }
  function composeLetter(editing) {
    var a = A();
    var draft = editing ? { title: editing.title, body: editing.body, seal: editing.seal || "wax-red", paper: editing.paper || "cream", at: editing.at } : store.get("v8-letter-draft-" + a.me, { title: "", body: "", seal: "wax-red", paper: "cream", at: null });
    a.openPanel(editing ? "Edit sealed letter" : "New sealed letter", "To " + a.name(a.other), stillFn(function (body) {
      body.classList.add("v8");
      setPanel(null);
      var save = function () { if (!editing) store.set("v8-letter-draft-" + a.me, draft); };
      var sheet = el("div", "v8-compose");
      var paper = el("div", "v8-paper edit");
      var setPaper = function () { paper.style.setProperty("--paper", (PAPERS[draft.paper] || PAPERS.cream)[0]); paper.className = "v8-paper edit p-" + draft.paper; };
      setPaper();
      var title = el("input", "v8-title");
      title.placeholder = "Open when…"; title.maxLength = 80; title.value = draft.title;
      title.setAttribute("aria-label", "What's written on the envelope");
      title.addEventListener("input", function () { draft.title = title.value; save(); });
      var chips = el("div", "v8-chips");
      TITLES.forEach(function (t) { var c = el("button", "chip", t); c.type = "button"; c.addEventListener("click", function () { title.value = t; draft.title = t; save(); }); chips.appendChild(c); });
      var ta = el("textarea", "v8-body");
      ta.placeholder = "Dear " + a.name(a.other) + ",\n\n";
      ta.maxLength = 20000; ta.value = draft.body;
      ta.setAttribute("aria-label", "Your letter");
      var count = el("div", "v8-count mono");
      var fit = function () { ta.style.height = "auto"; ta.style.height = Math.max(220, ta.scrollHeight) + "px"; count.textContent = ta.value.length ? ta.value.trim().split(/\s+/).length + " words" : ""; };
      ta.addEventListener("input", function () { draft.body = ta.value; save(); fit(); });
      paper.append(title, ta, el("p", "v8-sign", "— " + a.name(a.me)));
      sheet.append(chips, paper, count);
      // When it can be opened
      var when = el("div", "v8-when");
      when.appendChild(el("div", "v8-lab", "Can be opened from"));
      var quick = el("div", "v8-chips");
      var dt = el("input", "in plain v8-dt");
      dt.type = "datetime-local";
      var min = new Date(Date.now() + 60000);
      dt.min = localInput(min);
      var initialAt = draft.at && Date.parse(draft.at) > Date.now() ? new Date(draft.at) : (function () { var d = new Date(); d.setDate(d.getDate() + 1); d.setHours(8, 0, 0, 0); return d; })();
      dt.value = localInput(initialAt);
      var hint = el("div", "v8-hint");
      var showHint = function () { var t = Date.parse(dt.value); hint.textContent = isFinite(t) ? (t <= Date.now() ? "Choose a time in the future." : until(t) + " · " + fmtWhen(t)) : ""; hint.classList.toggle("bad", !(t > Date.now())); };
      dt.addEventListener("input", function () { var t = Date.parse(dt.value); draft.at = isFinite(t) ? new Date(t).toISOString() : null; save(); showHint(); markQuick(); });
      var quicks = [
        ["Tonight, 9 pm", function () { var d = new Date(); d.setHours(21, 0, 0, 0); if (d <= new Date()) d.setDate(d.getDate() + 1); return d; }],
        ["Tomorrow morning", function () { var d = new Date(); d.setDate(d.getDate() + 1); d.setHours(8, 0, 0, 0); return d; }],
        ["In a week", function () { var d = new Date(); d.setDate(d.getDate() + 7); d.setSeconds(0, 0); return d; }],
        ["In a month", function () { var d = new Date(); d.setMonth(d.getMonth() + 1); d.setSeconds(0, 0); return d; }],
        ["In a year", function () { var d = new Date(); d.setFullYear(d.getFullYear() + 1); d.setSeconds(0, 0); return d; }]
      ];
      var qbtns = [];
      var markQuick = function () { qbtns.forEach(function (b) { b.classList.toggle("on", localInput(b._fn()) === dt.value); }); };
      quicks.forEach(function (q) { var b = el("button", "chip", q[0]); b.type = "button"; b._fn = q[1]; b.addEventListener("click", function () { dt.value = localInput(q[1]()); draft.at = new Date(dt.value).toISOString(); save(); showHint(); markQuick(); }); quick.appendChild(b); qbtns.push(b); });
      when.append(quick, dt, hint);
      // Seal and paper
      var looks = el("div", "v8-looks");
      looks.appendChild(el("div", "v8-lab", "Wax seal"));
      var seals = el("div", "v8-swatches");
      Object.keys(SEALS).forEach(function (k) {
        var b = el("button", "v8-sw seal" + (draft.seal === k ? " on" : "")); b.type = "button"; b.style.setProperty("--c", SEALS[k][0]); b.setAttribute("aria-label", SEALS[k][1] + " seal");
        b.addEventListener("click", function () { draft.seal = k; save(); seals.querySelectorAll(".v8-sw").forEach(function (n) { n.classList.toggle("on", n === b); }); });
        seals.appendChild(b);
      });
      looks.appendChild(seals);
      looks.appendChild(el("div", "v8-lab", "Paper"));
      var papers = el("div", "v8-swatches");
      Object.keys(PAPERS).forEach(function (k) {
        var b = el("button", "v8-sw paper" + (draft.paper === k ? " on" : "")); b.type = "button"; b.style.setProperty("--c", PAPERS[k][0]); b.setAttribute("aria-label", PAPERS[k][1] + " paper");
        b.addEventListener("click", function () { draft.paper = k; save(); setPaper(); papers.querySelectorAll(".v8-sw").forEach(function (n) { n.classList.toggle("on", n === b); }); });
        papers.appendChild(b);
      });
      looks.appendChild(papers);
      var go = el("button", "btn wide v8-seal-btn");
      go.type = "button";
      go.innerHTML = '<span class="v8-wax-mini"></span><span>' + (editing ? "Save and reseal" : "Seal and send") + '</span>';
      go.addEventListener("click", async function () {
        var t = Date.parse(dt.value);
        if (!ta.value.trim()) { a.notice("Write the letter first", "", { error: true }); ta.focus(); return; }
        if (!(t > Date.now() + 30000)) { a.notice("Choose when it can be opened", "Pick a time at least a minute from now.", { error: true }); dt.focus(); return; }
        var ok = await a.centredBanner({ title: editing ? "Save changes?" : "Seal this letter?", desc: editing ? "The letter stays sealed until " + fmtWhen(t) + ". " + a.name(a.other) + " is told it changed." : a.name(a.other) + " will see the envelope now and can open it from " + fmtWhen(t) + ". You can read and edit it until then.", okLabel: editing ? "Save" : "Seal it" });
        if (!ok) return;
        go.disabled = true;
        var c = sb();
        var fields = { title: title.value.trim(), body: ta.value, seal: draft.seal, paper: draft.paper, open_at: new Date(t).toISOString() };
        var r = editing
          ? await c.from("sealed_letters").update(fields).eq("id", editing.id).select("id, open_at").maybeSingle()
          : await c.from("sealed_letters").insert(Object.assign({ pair_id: a.pairId, author_id: a.userId, author_side: a.me, recipient_side: a.other }, fields)).select("id, open_at").maybeSingle();
        if (editing && !r.error && !r.data) r = { error: { message: "It may already be open, so it can't be changed" } };
        go.disabled = false;
        if (r.error) { a.notice("Couldn't seal the letter", friendly(r.error) + " Your letter is still here.", { error: true }); return; }
        if (!editing) store.set("v8-letter-draft-" + a.me, { title: "", body: "", seal: draft.seal, paper: draft.paper, at: null });
        ping("letter", { kind: editing ? "edited" : "sealed", id: r.data && r.data.id, open_at: new Date(t).toISOString() });
        // The letter also arrives as a message: it shows in the chat and notifies like any message.
        if (!editing && r.data && r.data.id && a.sendCard) a.sendCard({ t: "letter", id: r.data.id, title: fields.title, at: fields.open_at, seal: draft.seal });
        await loadEnvelopes();
        sealAnimation(draft.seal, function () { a.goBack(); openLetters("out"); a.notice("Letter sealed", a.name(a.other) + " can open it " + fmtWhen(t) + "."); });
      });
      body.append(sheet, when, looks, go);
      showHint(); markQuick();
      setTimeout(fit, 0);
    }));
  }
  function sealAnimation(seal, done) {
    if (reduce()) { done(); return; }
    var ov = el("div", "v8-overlay v8-sealing");
    var e = envelopeArt({ from: A().me, to: A().other, seal: seal, paper: "cream", openAt: Date.now() }, true);
    ov.appendChild(e);
    document.body.appendChild(ov);
    A().haptic("pin");
    setTimeout(function () { ov.classList.add("fly"); }, 900);
    setTimeout(function () { ov.remove(); done(); }, 1500);
  }
  function onLetterPing(p) {
    var a = A(); if (!a || !a.unlocked) return;
    loadEnvelopes().then(function () {
      rerender();
      // "sealed" needs no alert here: the letter arrives as a chat message and notifies through that pipeline.
      if (p.kind === "edited") alertTo("letter", a.name(a.other) + " changed a sealed letter", "It still opens " + (p.open_at ? fmtWhen(Date.parse(p.open_at)) : "on its day") + ".", "letter-edit-" + p.id + "-" + Date.now(), { label: "See it", run: function () { openLetters("in"); } });
      if (p.kind === "opened") alertTo("letter", a.name(a.other) + " opened your letter", "", "letter-opened-" + p.id, { label: "See it", run: function () { openLetters("out"); } });
    });
  }
  // A letter whose day has come is announced with priority: a full-screen card, once per letter on each device.
  function announceReady() {
    var a = A(); if (!a || !a.unlocked) return;
    var list = readyForMe().filter(function (e) { return !D.shownReady[e.id]; });
    if (!list.length || document.querySelector(".v8-ready")) return;
    var e = list[0];
    D.shownReady[e.id] = Date.now();
    store.set("v8-shown-" + a.me, D.shownReady);
    var ov = el("div", "v8-overlay v8-ready");
    ov.setAttribute("role", "alertdialog"); ov.setAttribute("aria-modal", "true");
    var box = el("div", "v8-ready-box");
    box.appendChild(el("div", "v8-ready-kicker mono", "A sealed letter is ready"));
    box.appendChild(envelopeArt(e, true));
    box.appendChild(el("h2", "", e.title || "A letter from " + a.name(e.from)));
    box.appendChild(el("p", "", "From " + a.name(e.from) + ", sealed on " + new Date(e.createdAt).toLocaleDateString([], { day: "numeric", month: "long" }) + "." + (list.length > 1 ? " " + (list.length - 1) + " more waiting." : "")));
    var row = el("div", "v8-ready-row");
    var later = el("button", "btn ghost", "Later"); later.type = "button";
    var open = el("button", "btn", "Open it"); open.type = "button";
    row.append(later, open);
    box.appendChild(row);
    ov.appendChild(box);
    document.body.appendChild(ov);
    try { if (a.alert) a.alert("letter", "A sealed letter is ready", (e.title || "From " + a.name(e.from)), { ref: "letter-ready-" + e.id, toast: false, priority: true }); else if (!a.mute()) { a.chime(); a.arrivalBuzz(); } } catch (err) {}
    requestAnimationFrame(function () { ov.classList.add("open"); });
    later.addEventListener("click", function () { ov.remove(); refreshBadges(); });
    open.addEventListener("click", function () { ov.remove(); openLetter(e); });
    open.focus();
  }

  /* ================= Games: tic-tac-toe ================= */
  var LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
  var QUICK = ["Your move! ⏳", "Good one 👏", "Ha! 😄", "Watch this 😎", "Not fair 😤", "GG 🤝", "Rematch? 🔁", "Hurry up ⏰"];
  // Server time is read from each row: the clock is the row's deadline measured against its updated_at,
  // so a phone with the wrong time still shows the right countdown.
  // A row that just arrived was written moments ago, so its updated_at gives the server-clock offset.
  // Older rows (from a reload) use that offset instead of assuming they are fresh.
  function noteClock(g, fresh) {
    if (!g || !g.state) return;
    var up = Date.parse(g.updated_at || g.created_at);
    if (fresh && isFinite(up)) D.offset = up - Date.now();
    var dl = g.state.deadline ? Date.parse(g.state.deadline) : 0;
    g._localDeadline = dl ? dl - (D.offset || 0) : 0;
  }
  function tally(side) {
    var w = 0, l = 0, d = 0, me = side;
    D.games.forEach(function (g) {
      if (g.status !== "done" || !g.state) return;
      var win = g.state.winner;
      if (win === "draw") d++; else if (win === me) w++; else if (win) l++;
    });
    return { w: w, l: l, d: d };
  }
  function onGameRow(row) {
    var a = A(); if (!row || !a || !a.unlocked) { loadGames().then(rerenderGame); return; }
    var i = D.games.findIndex(function (g) { return g.id === row.id; });
    var prev = i >= 0 ? D.games[i] : null;
    if (i >= 0) D.games[i] = row; else D.games.unshift(row);
    noteClock(row, true);
    var newest = D.games.slice().sort(function (x, y) { return Date.parse(y.created_at) - Date.parse(x.created_at); })[0];
    D.game = newest;
    if (D.pendingMove && row.id === D.pendingMove.g && (row.state.board || [])[D.pendingMove.cell]) D.pendingMove = null;
    refreshBadges();
    if (row.status === "invited" && row.state.by !== a.me && (!prev || prev.status !== "invited")) {
      if (D.gameOpen) alertTo("game", a.name(row.state.by) + " wants a rematch", "", "game-inv-" + row.id, { label: "Play", run: function () { acceptAndOpen(row); } });
      else checkInvite(); // the challenge itself arrives as a message card and notifies through the message pipeline
    }
    if (row.status === "active" && prev && prev.status === "invited" && row.state.by === a.me) { a.notice(a.name(a.other) + " joined the game", "", {}); if (!D.gameOpen) openGame(); }
    if (row.status === "done" && (!prev || prev.status !== "done")) onGameOver(row);
    if (row.status === "abandoned" && prev && prev.status !== "abandoned" && row.state.quit_by && row.state.quit_by !== a.me) {
      if (prev.status === "invited") alertTo("game", a.name(a.other) + " said not now", "Your tic-tac-toe invite was declined.", "game-decline-" + row.id, { label: "Invite again", run: function () { openGame(); } });
      else alertTo("game", a.name(a.other) + " left the game", "", "game-left-" + row.id, null);
    }
    rerenderGame();
  }
  function onGamePing(p) { if (p && p.kind === "nudge" && A().unlocked) alertTo("game", A().name(A().other) + " is waiting for your move", "", "game-nudge-" + Date.now(), { label: "Play", run: openGame }); }
  function alertTo(kind, title, detail, ref, action) { var a = A(); if (a.alert) a.alert(kind, title, detail, { ref: ref, action: action || undefined }); else a.notice(title, detail, { kind: kind, action: action || undefined }); }
  function checkInvite() {
    var a = A(), g = pendingInvite();
    if (!g || D.gameOpen || document.querySelector(".v8-invite")) return;
    var ov = el("div", "v8-overlay v8-invite");
    var box = el("div", "v8-ready-box");
    var art = el("div", "v8-art big"); art.innerHTML = HUB_ART.ttt;
    box.append(el("div", "v8-ready-kicker mono", "Game invite"), art, el("h2", "", a.name(g.state.by) + " challenged you"), el("p", "", "Tic-tac-toe, live. 10 seconds a move."));
    var row = el("div", "v8-ready-row");
    var no = el("button", "btn ghost", "Not now"); no.type = "button";
    var yes = el("button", "btn", "Play"); yes.type = "button";
    row.append(no, yes); box.appendChild(row); ov.appendChild(box);
    document.body.appendChild(ov);
    try { if (!a.mute()) a.chime(); } catch (e) {}
    requestAnimationFrame(function () { ov.classList.add("open"); });
    no.addEventListener("click", async function () {
      ov.remove();
      var r = await sb().rpc("game_quit", { p_id: g.id });
      ping("game", { kind: "declined", id: g.id });
      if (r && r.data) onGameRow(Array.isArray(r.data) ? r.data[0] : r.data);
      a.notice("Invite declined", a.name(g.state.by) + " will see you said not now.", { kind: "game" });
    });
    yes.addEventListener("click", function () { ov.remove(); acceptAndOpen(g); });
  }
  async function acceptAndOpen(g) {
    var r = await sb().rpc("game_accept", { p_id: g.id });
    if (r.error) { A().notice("Couldn't join", friendly(r.error), { error: true }); return; }
    if (r.data) onGameRow(Array.isArray(r.data) ? r.data[0] : r.data);
    openGame();
  }
  async function startGame() {
    var a = A();
    var r = await sb().rpc("game_start", { p_kind: "tictactoe" });
    if (r.error) { a.notice("Couldn't start a game", friendly(r.error), { error: true }); return; }
    var row = Array.isArray(r.data) ? r.data[0] : r.data;
    if (row) onGameRow(row);
    if (row && a.sendCard) a.sendCard({ t: "game", id: row.id });
    a.haptic("send");
  }
  /* Game mode lives inside the real conversation: the board docks above the thread (beside it on a wide screen),
     so the whole chat works while you play: typing and recording bubbles, banners, photos, voice notes, drawing,
     replies and reactions. Quick replies are a short row of one-tap reactions. */
  var QUICK = ["👏", "😄", "😤", "🔥", "⏳ Your move", "🔁 Rematch?"];
  function openGame() {
    var a = A();
    D.gameOpen = true;
    D.dockMin = false;
    clearInterval(D.tickTimer);
    D.tickTimer = setInterval(tick, 100);
    a.openChat();
    setTimeout(mountDock, 0);
  }
  function closeGame() {
    D.gameOpen = false;
    clearInterval(D.tickTimer);
    var d = $("gameDock"); if (d) d.remove();
    var c = $("chat"); if (c) c.classList.remove("game-mode");
  }
  function mountDock() {
    var a = A(), chat = $("chat");
    if (!D.gameOpen || !chat || !a || a.view !== "chat") return;
    var dock = $("gameDock");
    if (!dock) {
      dock = el("div", "gdock");
      dock.id = "gameDock";
      dock.setAttribute("role", "region");
      dock.setAttribute("aria-label", "Tic-tac-toe");
      chat.insertBefore(dock, $("list"));
      chat.classList.add("game-mode");
      drawGame();
    }
  }
  function rerenderGame() { if (D.gameOpen && $("gameDock")) drawGame(); }
  function boardOf(g) { var b = (g && g.state && g.state.board) || ["", "", "", "", "", "", "", "", ""]; if (D.pendingMove && g && D.pendingMove.g === g.id) { b = b.slice(); b[D.pendingMove.cell] = A().me; } return b; }
  function markOf(g, side) { return g && g.state && g.state.x === side ? "X" : "O"; }
  function drawGame() {
    var a = A(), wrap = $("gameDock"); if (!wrap) return;
    var g = D.game, me = a.me, them = a.other;
    wrap.textContent = "";
    wrap.classList.toggle("min", !!D.dockMin);
    // Head: score, timer, status, minimise, close
    var head = el("div", "gd-head");
    var tm = tally(me), tt = tally(them);
    var score = el("div", "gd-score");
    var pl = function (side, t) {
      var p = el("span", "gd-p" + (g && g.status === "active" && g.state.turn === side ? " turn" : ""));
      p.append(el("span", "avatar " + side.toLowerCase(), initial(side)), el("b", "", g ? markOf(g, side) : (side === me ? "You" : "")));
      p.title = (side === me ? "You" : a.name(side)) + (g ? " · " + markOf(g, side) : "");
      return p;
    };
    score.append(pl(me, tm), el("span", "gd-vs mono", tm.w + " – " + tt.w), pl(them, tt));
    var ring = el("div", "ttt-ring gd-ring");
    ring.innerHTML = '<svg viewBox="0 0 44 44"><circle cx="22" cy="22" r="19" class="bg"/><circle cx="22" cy="22" r="19" class="fg" id="tttArc"/></svg><span id="tttSec">10</span>';
    var minB = el("button", "gd-ic"); minB.type = "button"; minB.setAttribute("aria-label", D.dockMin ? "Show the board" : "Hide the board");
    minB.innerHTML = svg(D.dockMin ? "M6 9l6 6 6-6" : "M18 15l-6-6-6 6");
    minB.addEventListener("click", function () { D.dockMin = !D.dockMin; drawGame(); });
    var x = el("button", "gd-ic"); x.type = "button"; x.setAttribute("aria-label", "Close game mode");
    x.innerHTML = svg("M18 6L6 18M6 6l12 12");
    x.addEventListener("click", closeGame);
    var tro = el("button", "gd-ic"); tro.type = "button"; tro.setAttribute("aria-label", "Trophies");
    tro.innerHTML = svg("M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3");
    tro.addEventListener("click", openCabinet);
    head.append(ring, score, tro, minB, x);
    wrap.appendChild(head);
    var msg = el("div", "ttt-msg gd-msg"); msg.id = "tttMsg";
    wrap.appendChild(msg);
    var body = el("div", "gd-body");
    var board = el("div", "ttt-board gd-board");
    board.setAttribute("role", "grid");
    var b = boardOf(g), canPlay = g && g.status === "active" && g.state.turn === me && !D.pendingMove;
    var win = g && g.state && g.state.line ? g.state.line : null;
    for (var i = 0; i < 9; i++) (function (i) {
      var c = el("button", "ttt-cell" + (b[i] ? " filled m-" + markOf(g, b[i]).toLowerCase() : "") + (win && win.indexOf(i) >= 0 ? " win" : "") + (D.lastCell === i ? " fresh" : ""));
      c.type = "button";
      c.setAttribute("aria-label", "Square " + (i + 1) + (b[i] ? ", " + markOf(g, b[i]) : ", empty"));
      if (b[i]) c.innerHTML = markOf(g, b[i]) === "X" ? '<svg viewBox="0 0 40 40"><path d="M10 10l20 20M30 10L10 30"/></svg>' : '<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="11"/></svg>';
      c.disabled = !canPlay || !!b[i];
      c.addEventListener("click", function () { play(i); });
      board.appendChild(c);
    })(i);
    body.appendChild(board);
    var acts = el("div", "ttt-acts gd-acts");
    var mk = function (label, cls, fn) { var x2 = el("button", cls, label); x2.type = "button"; x2.addEventListener("click", fn); acts.appendChild(x2); return x2; };
    if (!g || g.status === "done" || g.status === "abandoned") {
      mk(g && g.status === "done" ? "Rematch" : "Challenge " + a.name(them), "btn sm", async function () {
        if (g && g.status === "done") { var r = await sb().rpc("game_rematch", { p_id: g.id }); if (r.error) { a.notice("Couldn't start", friendly(r.error), { error: true }); return; } var rr = Array.isArray(r.data) ? r.data[0] : r.data; onGameRow(rr); if (rr && a.sendCard) a.sendCard({ t: "game", id: rr.id }); }
        else startGame();
      });
    } else if (g.status === "invited") {
      if (g.state.by === me) mk("Nudge", "btn ghost sm", function () { ping("game", { kind: "nudge" }); a.notice("Nudge sent", ""); });
      else mk("Join the game", "btn sm", function () { acceptAndOpen(g); });
      mk(g.state.by === me ? "Cancel invite" : "Decline", "btn ghost sm", async function () { await sb().rpc("game_quit", { p_id: g.id }); loadGames().then(rerenderGame); });
    } else {
      var flag = el("button", "gd-ic"); flag.type = "button"; flag.setAttribute("aria-label", "Leave game");
      flag.innerHTML = svg("M5 21V4M5 4h11l-2 4 2 4H5");
      flag.addEventListener("click", async function () { if (await a.centredBanner({ title: "Leave this game?", desc: "It ends now and counts as unfinished.", okLabel: "Leave" })) { await sb().rpc("game_quit", { p_id: g.id }); loadGames().then(rerenderGame); } });
      head.insertBefore(flag, tro);
    }
    if (acts.children.length) body.appendChild(acts);
    var quick = el("div", "gd-quick");
    QUICK.forEach(function (q) {
      var c = el("button", "gd-q", q); c.type = "button";
      c.setAttribute("aria-label", "Send " + q);
      c.addEventListener("click", function () { a.sendText(q); a.haptic("send"); c.classList.remove("sent"); void c.offsetWidth; c.classList.add("sent"); });
      quick.appendChild(c);
    });
    body.appendChild(quick);
    wrap.appendChild(body);
    tick();
  }
  function drawGameChat() { if (D.gameOpen) mountDock(); }
  async function play(i) {
    var a = A(), g = D.game;
    if (!g || g.status !== "active" || g.state.turn !== a.me || D.pendingMove || (g.state.board || [])[i]) return;
    var left = g._localDeadline ? g._localDeadline - Date.now() : 10000;
    D.pendingMove = { g: g.id, cell: i, left: left, at: Date.now() };
    D.lastCell = i;
    a.haptic("press");
    drawGame();
    var r = await sb().rpc("game_move", { p_id: g.id, p_cell: i });
    if (r.error) {
      D.pendingMove = null;
      a.notice(/time/i.test(r.error.message) ? "Too slow — the turn passed" : "Move not accepted", r.error.message, { error: true });
      await loadGames(); rerenderGame();
      return;
    }
    var row = Array.isArray(r.data) ? r.data[0] : r.data;
    D.moveStats = D.moveStats || {};
    (D.moveStats[g.id] = D.moveStats[g.id] || []).push({ cell: i, left: left, ms: 10000 - left });
    D.pendingMove = null;
    if (row) onGameRow(row);
  }
  var timeoutAsked = 0;
  function tick() {
    var g = D.game, arc = $("tttArc"), sec = $("tttSec"), msg = $("tttMsg"), a = A();
    if (!a || !a.unlocked || a.view === "home" || a.view === "lock") { if (D.gameOpen) closeGame(); return; }
    if (a.view !== "chat") return;
    if (!$("gameDock")) { mountDock(); return; }
    if (!arc || !g) return;
    var me = a.me, them = a.other, txt = "";
    var ring = arc.closest(".ttt-ring");
    if (g.status === "active" && g._localDeadline) {
      var left = Math.max(0, g._localDeadline - Date.now()), frac = left / 10000;
      arc.style.strokeDashoffset = String(119.4 * (1 - frac));
      sec.textContent = String(Math.ceil(left / 1000));
      ring.classList.toggle("hot", left < 3500);
      ring.classList.toggle("mine", g.state.turn === me);
      ring.classList.remove("idle");
      txt = D.pendingMove ? "Sending your move…" : g.state.turn === me ? (left > 0 ? "Your move" : "Time's up") : a.name(them) + " is thinking…";
      if (g.state.skipped && g.state.timeouts) txt += " · " + (g.state.skipped === me ? "you ran out of time" : a.name(them) + " ran out of time");
      if (left === 0 && Date.now() - timeoutAsked > 1500 && Date.now() > g._localDeadline + 1600) {
        timeoutAsked = Date.now();
        sb().rpc("game_timeout", { p_id: g.id }).then(function (r) { var row = r && (Array.isArray(r.data) ? r.data[0] : r.data); if (row) onGameRow(row); });
      }
    } else {
      ring.classList.add("idle"); ring.classList.remove("hot", "mine");
      arc.style.strokeDashoffset = "0"; sec.textContent = "";
      if (!g || g.status === "abandoned") txt = g && g.state && g.state.timeouts >= 4 ? "Game ended: nobody moved" : "Start a game whenever you like";
      else if (g.status === "invited") txt = g.state.by === me ? "Waiting for " + a.name(them) + " to join…" : a.name(g.state.by) + " invited you";
      else if (g.status === "done") txt = g.state.winner === "draw" ? "A draw. Well played." : g.state.winner === me ? "You won! 🎉" : a.name(them) + " won this round";
    }
    if (msg.textContent !== txt) msg.textContent = txt;
  }

  /* ================= Awards ================= */
  var AWARDS = {
    first_win: { t: "First Victory", d: "Win your first game", tier: "bronze", p: 10, ic: "★" },
    hat_trick: { t: "Hat-trick", d: "Win three games in a row", tier: "silver", p: 30, ic: "3" },
    unstoppable: { t: "Unstoppable", d: "Win five games in a row", tier: "gold", p: 60, ic: "5" },
    flawless: { t: "Flawless", d: "Win with only three moves", tier: "silver", p: 20, ic: "◆" },
    lightning: { t: "Lightning", d: "Win with every move under two seconds", tier: "gold", p: 40, ic: "ϟ" },
    clutch: { t: "Clutch", d: "Make the winning move with under two seconds left", tier: "gold", p: 40, ic: "⏱" },
    comeback: { t: "Comeback", d: "Win right after losing two in a row", tier: "silver", p: 25, ic: "↺" },
    diplomat: { t: "Diplomat", d: "Draw three games", tier: "bronze", p: 15, ic: "≈" },
    regular: { t: "Regular", d: "Finish ten games", tier: "bronze", p: 15, ic: "10" },
    champion: { t: "Champion", d: "Win ten games", tier: "gold", p: 80, ic: "♛" },
    legend: { t: "Legend", d: "Win twenty-five games", tier: "diamond", p: 150, ic: "✦" },
    night_owl: { t: "Night Owl", d: "Win a game between midnight and 5 am", tier: "bronze", p: 10, ic: "☾" },
    sweetheart: { t: "Good Sport", d: "Send a message during a game", tier: "bronze", p: 5, ic: "♥" }
  };
  function xp(side) { return D.awards.filter(function (w) { return w.side === side; }).reduce(function (s, w) { return s + (w.points || 0); }, 0); }
  function level(p) { return 1 + Math.floor(Math.sqrt(p / 12)); }
  function has(code) { var me = A().me; return D.awards.some(function (w) { return w.side === me && w.code === code; }); }
  function onGameOver(g) {
    var a = A(), me = a.me, st = g.state || {};
    if (st.winner === me) { try { a.burstAt(window.innerWidth / 2, window.innerHeight / 3, "star", 26); } catch (e) {} a.haptic("heart"); }
    var done = D.games.filter(function (x) { return x.status === "done" && x.state; }).sort(function (x, y) { return Date.parse(x.created_at) - Date.parse(y.created_at); });
    var results = done.map(function (x) { return x.state.winner === me ? "w" : x.state.winner === "draw" ? "d" : "l"; });
    var streak = 0; for (var i = results.length - 1; i >= 0 && results[i] === "w"; i--) streak++;
    var t = tally(me), earned = [];
    var myMoves = (st.moves || []).filter(function (m) { return m.side === me; });
    var won = st.winner === me;
    if (won) {
      earned.push("first_win");
      if (streak >= 3) earned.push("hat_trick");
      if (streak >= 5) earned.push("unstoppable");
      if (myMoves.length === 3) earned.push("flawless");
      if (myMoves.length && myMoves.every(function (m) { return (m.ms || 9999) < 2000; })) earned.push("lightning");
      var lastMove = myMoves[myMoves.length - 1];
      if (lastMove && (lastMove.ms || 0) > 8000) earned.push("clutch");
      var prev = results.slice(0, -1);
      if (prev.length >= 2 && prev[prev.length - 1] === "l" && prev[prev.length - 2] === "l") earned.push("comeback");
      var hr = new Date().getHours(); if (hr < 5) earned.push("night_owl");
    }
    if (t.d >= 3) earned.push("diplomat");
    if (t.w + t.l + t.d >= 10) earned.push("regular");
    if (t.w >= 10) earned.push("champion");
    if (t.w >= 25) earned.push("legend");
    var since = Date.parse(g.created_at);
    if (a.thread().some(function (m) { return m.from === me && m.ts >= since; })) earned.push("sweetheart");
    earned = earned.filter(function (c, k) { return earned.indexOf(c) === k && !has(c); });
    grant(earned, g.id);
  }
  async function grant(codes, gameId) {
    var a = A(), c = sb(); if (!codes.length || !c) return;
    var rows = codes.map(function (code) { var w = AWARDS[code]; return { pair_id: a.pairId, user_id: a.userId, side: a.me, game: "tictactoe", code: code, tier: w.tier, points: w.p, game_id: gameId, meta: { title: w.t } }; });
    var won = [];
    for (var k = 0; k < rows.length; k++) {
      var r = await c.from("awards").insert(rows[k]).select("*").maybeSingle();
      if (r.error) { if (!/duplicate|unique/i.test(r.error.message)) a.notice("Couldn't save your award", friendly(r.error), { error: true }); continue; }
      var w = r.data || rows[k];
      if (!D.awards.some(function (x) { return x.id && x.id === w.id; })) D.awards.unshift(w);
      won.push(codes[k]);
    }
    if (won.length) showAwards(won);
  }
  function onAward(w) {
    var a = A(); if (!w || !a) return;
    if (!D.awards.some(function (x) { return x.id === w.id; })) D.awards.unshift(w);
    if (w.side !== a.me) { var info = AWARDS[w.code]; if (info) alertTo("award", a.name(w.side) + " earned " + info.t, info.d + " · +" + (w.points || info.p) + " points", "award-" + w.id, { label: "Trophies", run: openCabinet }); }
    rerender();
  }
  function medal(code, earned) {
    var w = AWARDS[code] || { tier: "bronze", ic: "★" };
    var m = el("div", "medal t-" + w.tier + (earned ? "" : " locked"));
    m.innerHTML = '<div class="medal-ribbon"></div><div class="medal-disc"><span></span></div>';
    m.querySelector("span").textContent = earned ? w.ic : "?";
    return m;
  }
  function showAwards(codes) {
    var a = A(), q = codes.slice();
    var next = function () {
      if (!q.length) return;
      var code = q.shift(), w = AWARDS[code];
      var ov = el("div", "v8-overlay v8-award");
      ov.setAttribute("role", "dialog"); ov.setAttribute("aria-label", "Award: " + w.t);
      var box = el("div", "v8-award-box t-" + w.tier);
      box.append(el("div", "v8-ready-kicker mono", w.tier.charAt(0).toUpperCase() + w.tier.slice(1) + " award"), medal(code, true), el("h2", "", w.t), el("p", "", w.d), el("div", "v8-xp mono", "+" + w.p + " points · level " + level(xp(a.me))));
      var ok = el("button", "btn", q.length ? "Next" : "Keep it"); ok.type = "button";
      box.appendChild(ok); ov.appendChild(box);
      document.body.appendChild(ov);
      requestAnimationFrame(function () { ov.classList.add("open"); });
      a.haptic("pin");
      ok.addEventListener("click", function () { ov.remove(); next(); });
      ok.focus();
    };
    next();
  }
  function openCabinet() {
    var a = A();
    loadAwards().then(function () { if (D.panel && D.panel.cab) rerender(); });
    a.openPanel("Trophy cabinet", "Awards from every game", stillFn(function (body) {
      body.classList.add("v8");
      setPanel(function () { a.renderPanel(); }); D.panel.cab = true;
      var top = el("div", "cab-top");
      [a.me, a.other].forEach(function (side) {
        var p = xp(side), lv = level(p), nextAt = 12 * lv * lv, prevAt = 12 * (lv - 1) * (lv - 1);
        var c = el("div", "cab-p");
        var av = el("div", "avatar " + side.toLowerCase(), initial(side));
        var info = el("div", "cab-info");
        info.append(el("b", "", side === a.me ? "You" : a.name(side)), el("span", "mono", "Level " + lv + " · " + p + " points"));
        var bar = el("div", "cab-bar"); var fill = el("i"); fill.style.width = Math.min(100, Math.round(100 * (p - prevAt) / Math.max(1, nextAt - prevAt))) + "%"; bar.appendChild(fill);
        info.appendChild(bar);
        var t = tally(side);
        info.appendChild(el("small", "", t.w + " wins · " + t.l + " losses · " + t.d + " draws"));
        c.append(av, info);
        top.appendChild(c);
      });
      body.appendChild(top);
      body.appendChild(el("div", "v8-lab", "Your awards"));
      var grid = el("div", "cab-grid");
      Object.keys(AWARDS).forEach(function (code) {
        var w = AWARDS[code], got = D.awards.find(function (x) { return x.side === a.me && x.code === code; });
        var cell = el("div", "cab-cell" + (got ? " got" : ""));
        cell.appendChild(medal(code, !!got));
        cell.appendChild(el("b", "", w.t));
        cell.appendChild(el("small", "", got ? new Date(got.created_at || Date.now()).toLocaleDateString([], { day: "numeric", month: "short" }) + " · +" + w.p : w.d));
        grid.appendChild(cell);
      });
      body.appendChild(grid);
      var theirs = D.awards.filter(function (x) { return x.side === a.other; });
      if (theirs.length) {
        body.appendChild(el("div", "v8-lab", a.name(a.other) + "'s latest"));
        var row = el("div", "cab-row");
        theirs.slice(0, 8).forEach(function (w) { var c = el("div", "cab-mini"); c.appendChild(medal(w.code, true)); c.appendChild(el("small", "", (AWARDS[w.code] || {}).t || w.code)); row.appendChild(c); });
        body.appendChild(row);
      }
      body.appendChild(el("p", "snote", "Points carry over to every future game in The Lees."));
      var play = el("button", "btn wide", "Play tic-tac-toe"); play.type = "button"; play.addEventListener("click", openGame);
      body.appendChild(play);
    }), D.gameOpen && a.view === "chat" ? "chat" : undefined);
  }

  /* ================= Settings entries ================= */
  window.LeesSettingsExtra = function () {
    var a = A(); if (!a) return [];
    return [
      { id: "letters", label: "Sealed letters", sub: "Write one, or open those for you", keywords: "letter capsule envelope future open when", icon: "letter", value: readyForMe().length ? readyForMe().length + " ready" : "", run: function () { openLetters(); } },
      { id: "game", label: "Tic-tac-toe", sub: "Live game with " + a.name(a.other), keywords: "game play tic tac toe noughts crosses", icon: "play", run: function () { openGame(); } },
      { id: "cabinet", label: "Trophy cabinet", sub: xp(a.me) + " points", keywords: "awards trophies medals points level", icon: "trophy", run: function () { openCabinet(); } }
    ];
  };
  window.LeesFeatures = { openLetterById: openLetterById, openCreate: openCreate, readyCount: readyCount, openLetters: openLetters, openGame: openGame, openCabinet: openCabinet, _d: D };
})();
