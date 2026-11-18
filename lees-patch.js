/* Lees patch v1. Loaded with `defer` after the app script.
   It reaches the app only through the DOM and window.LeesHooks.
   Hooks that need app data (clearConversation, signIn* calls, onGhost) are wired by Grok; see GROK_DEPLOY.md. */
(function () {
  "use strict";

  var $ = function (id) { return document.getElementById(id); };
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };
  var hooks = (window.LeesHooks = window.LeesHooks || {});
  var LONG_MS = 1500;

  /* ---------- helpers ---------- */
  function toast(title, body) {
    var t = document.createElement("div");
    t.className = "lp-toast";
    var b = document.createElement("b"); b.textContent = title;
    t.appendChild(b);
    if (body) { var s = document.createElement("span"); s.textContent = body; t.appendChild(s); }
    document.body.appendChild(t);
    setTimeout(function () { t.classList.add("out"); }, 2600);
    setTimeout(function () { t.remove(); }, 3000);
  }

  function modal(opts) {
    var wrap = document.createElement("div");
    wrap.className = "lp-modal-wrap";
    var m = document.createElement("div");
    m.className = "lp-modal";
    m.setAttribute("role", "dialog");
    m.setAttribute("aria-modal", "true");
    var h = document.createElement("h3"); h.textContent = opts.title;
    var p = document.createElement("p"); p.textContent = opts.body;
    m.appendChild(h); m.appendChild(p);
    if (opts.extra) m.appendChild(opts.extra);
    var acts = document.createElement("div"); acts.className = "lp-actions";
    var cancel = document.createElement("button"); cancel.type = "button"; cancel.className = "lp-btn"; cancel.textContent = "Cancel";
    var ok = document.createElement("button"); ok.type = "button"; ok.className = "lp-btn primary"; ok.textContent = opts.ok;
    acts.appendChild(cancel); acts.appendChild(ok); m.appendChild(acts);
    wrap.appendChild(m);
    document.body.appendChild(wrap);
    function close() { wrap.remove(); }
    cancel.addEventListener("click", close);
    wrap.addEventListener("click", function (e) { if (e.target === wrap) close(); });
    ok.addEventListener("click", function () { if (opts.onOk(m) !== false) close(); });
    setTimeout(function () { ok.focus(); }, 40);
    return { close: close, modal: m };
  }

  function confetti() {
    var cols = ["#e8b04b", "#9a5a48", "#6f8f7a", "#b5534a", "#7d6a9b"];
    for (var i = 0; i < 70; i++) {
      var p = document.createElement("i");
      p.className = "lp-conf";
      p.style.left = (Math.random() * 100) + "vw";
      p.style.background = cols[i % cols.length];
      p.style.setProperty("--dx", (Math.random() * 160 - 80) + "px");
      p.style.animationDuration = (1.1 + Math.random() * 0.8) + "s";
      p.style.animationDelay = (Math.random() * 0.2) + "s";
      document.body.appendChild(p);
      setTimeout(function (n) { return function () { n.remove(); }; }(p), 2400);
    }
  }

  /* ---------- 1. Shield and ghost mode ---------- */
  function ghostOn() { return document.body.classList.contains("ghost"); }
  function msgIds() {
    return Array.prototype.map.call(document.querySelectorAll("#list .msg[data-id]"), function (n) { return n.getAttribute("data-id"); });
  }
  function setGhost(on) {
    store.set("lp-ghost", on);
    if (on) {
      store.set("lp-ghost-base", msgIds());
      document.body.classList.add("ghost");
      toast("Ghost mode on", "Messages are hidden until you turn it off.");
    } else {
      var base = store.get("lp-ghost-base", []) || [];
      var n = msgIds().filter(function (id) { return base.indexOf(id) === -1; }).length;
      document.body.classList.remove("ghost");
      store.set("lp-ghost-base", null);
      toast("Ghost mode off", n ? (n + (n === 1 ? " message" : " messages") + " arrived while hidden.") : "");
    }
    if (hooks.onGhost) hooks.onGhost(on);
  }
  function askGhost() {
    if (ghostOn()) {
      modal({ title: "Ghost mode", body: "Turn ghost mode off? Messages that arrived while hidden will show as a new notification.", ok: "Turn off", onOk: function () { setGhost(false); } });
    } else {
      modal({ title: "Ghost mode", body: "Sure you want ghost mode on? Messages will disappear and show no history until you turn it off.", ok: "Turn on", onOk: function () { setGhost(true); } });
    }
  }
  /* A long press fires fn; the click that follows the release is swallowed so the blur toggle does not also run. */
  function bindNoSelect(btn) {
    btn.style.webkitTouchCallout = "none";
    btn.addEventListener("contextmenu", function (e) { e.preventDefault(); });
    btn.addEventListener("selectstart", function (e) { e.preventDefault(); });
    btn.addEventListener("dragstart", function (e) { e.preventDefault(); });
  }
  function bindLongPress(btn, fn) {
    var timer = null, fired = false;
    btn.addEventListener("pointerdown", function () {
      fired = false; clearTimeout(timer);
      timer = setTimeout(function () { fired = true; if (navigator.vibrate) navigator.vibrate(12); fn(); }, LONG_MS);
    });
    ["pointerup", "pointerleave", "pointercancel"].forEach(function (t) { btn.addEventListener(t, function () { clearTimeout(timer); }); });
    btn.addEventListener("click", function (e) { if (fired) { fired = false; e.stopImmediatePropagation(); e.preventDefault(); } }, true);
  }
  function bindShields() {
    var shield = $("shieldBtn");
    if (shield && !shield.dataset.lp) {
      shield.dataset.lp = "1";
      bindLongPress(shield, askGhost);
      bindNoSelect(shield);
    }
    var top = document.querySelector("#home .topbar");
    if (top && shield && !$("homeShield")) {
      var hs = document.createElement("button");
      hs.id = "homeShield"; hs.className = "ibtn"; hs.type = "button";
      hs.setAttribute("aria-label", "Shield"); hs.title = "Shield";
      hs.innerHTML = '<svg class="i" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>';
      top.appendChild(hs);
      bindLongPress(hs, askGhost);
      bindNoSelect(hs);
      hs.addEventListener("click", function () { shield.click(); });
      new MutationObserver(function () { hs.classList.toggle("shieldon", shield.classList.contains("shieldon")); })
        .observe(shield, { attributes: true, attributeFilter: ["class"] });
      hs.classList.toggle("shieldon", shield.classList.contains("shieldon"));
    }
  }

  /* ---------- 2. Clear conversation (Settings) ---------- */
  function clearModal() {
    var box = document.createElement("div");
    box.innerHTML = "<label for='lpScope'>Clear for</label>" +
      "<select id='lpScope'><option value='me'>My side only</option><option value='both'>Both sides</option></select>" +
      "<label for='lpFrom'>From</label><input id='lpFrom' type='date'>" +
      "<label for='lpTo'>To</label><input id='lpTo' type='date'>" +
      "<div style='margin-top:12px'><button type='button' class='lp-btn' id='lpAll'>All</button></div>";
    var all = false;
    box.querySelector("#lpAll").addEventListener("click", function () {
      all = !all;
      this.classList.toggle("primary", all);
      box.querySelector("#lpFrom").disabled = all;
      box.querySelector("#lpTo").disabled = all;
    });
    modal({
      title: "Clear conversation",
      body: "Choose whose messages to clear, then a date range or All. This cannot be undone.",
      ok: "Clear",
      extra: box,
      onOk: function (m) {
        var scope = m.querySelector("#lpScope").value;
        var from = m.querySelector("#lpFrom").value;
        var to = m.querySelector("#lpTo").value;
        if (!all && (!from || !to)) { toast("Choose a range", "Pick From and To dates, or All."); return false; }
        if (!hooks.doClear) { toast("Not ready", "Try again in a moment."); return false; }
        hooks.doClear({ scope: scope, all: all, from: all ? null : from, to: all ? null : to });
        return true;
      }
    });
  }

  /* ---------- 3. Notification sounds (Settings) ---------- */
  var PRESETS = {
    glass:   { name: "Soft glass",     type: "sine",     f0: 880,  f1: 1320, d: 0.28 },
    tin:     { name: "Tin bell",       type: "triangle", f0: 1040, f1: 780,  d: 0.40 },
    paper:   { name: "Paper tap",      noise: true,      f: 2400,            d: 0.09 },
    marimba: { name: "Warm marimba",   type: "sine",     f0: 523,  f1: 392,  d: 0.50, h: 2 },
    pebble:  { name: "Pebble",         type: "sine",     f0: 300,  f1: 180,  d: 0.12 },
    chime:   { name: "Wind chime",     type: "sine",     f0: 1568, f1: 2093, d: 0.60, h: 3 },
    knock:   { name: "Gentle knock",   type: "triangle", f0: 220,  f1: 160,  d: 0.18 },
    blip:    { name: "Soft blip",      type: "square",   f0: 740,  f1: 740,  d: 0.07, v: 0.35 }
  };
  var actx = null;
  function unlockAudio() {
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === "suspended") actx.resume();
      var buf = actx.createBuffer(1, 1, 22050);
      var src = actx.createBufferSource();
      src.buffer = buf;
      src.connect(actx.destination);
      src.start(0);
      if (actx.state === "running") document.removeEventListener("pointerdown", unlockAudio, true);
    } catch (e) {}
  }
  document.addEventListener("pointerdown", unlockAudio, true);
  document.addEventListener("keydown", unlockAudio, true);
  hooks.primeAudio = unlockAudio;
  function playPreset(key, vol, tried, onFail) {
    var P = PRESETS[key];
    if (!P) return false;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === "suspended") {
        if (tried) { if (onFail) onFail(); return false; }
        var resume = actx.resume();
        if (resume && resume.then) resume.then(function () { playPreset(key, vol, true, onFail); });
        else setTimeout(function () { playPreset(key, vol, true, onFail); }, 40);
        return true;
      }
      var t = actx.currentTime;
      var g = actx.createGain();
      g.connect(actx.destination);
      var peak = Math.max(0, Math.min(1, vol)) * (P.v || 0.5);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + P.d);
      if (P.noise) {
        var len = Math.floor(actx.sampleRate * P.d), buf = actx.createBuffer(1, len, actx.sampleRate), ch = buf.getChannelData(0);
        for (var i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / len);
        var src = actx.createBufferSource(); src.buffer = buf;
        var bp = actx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = P.f;
        src.connect(bp); bp.connect(g); src.start(t);
        return true;
      }
      var o = actx.createOscillator();
      o.type = P.type;
      o.frequency.setValueAtTime(P.f0, t);
      o.frequency.exponentialRampToValueAtTime(P.f1, t + P.d);
      o.connect(g); o.start(t); o.stop(t + P.d + 0.02);
      if (P.h) {
        var o2 = actx.createOscillator(), g2 = actx.createGain();
        g2.gain.value = 0.25;
        o2.frequency.setValueAtTime(P.f0 * P.h, t);
        o2.connect(g2); g2.connect(g); o2.start(t); o2.stop(t + P.d);
      }
      return true;
    } catch (e) { return false; }
  }
  var SOUND_KEY = "lp-sounds";
  var DEFAULTS = { inChat: { preset: "glass", vol: 0.6 }, outChat: { preset: "tin", vol: 0.7 } };
  function soundPrefs() {
    var s = store.get(SOUND_KEY, {}) || {};
    return { inChat: Object.assign({}, DEFAULTS.inChat, s.inChat), outChat: Object.assign({}, DEFAULTS.outChat, s.outChat) };
  }
  /* Grok calls this where chime() plays today: where = "inChat" or "outChat". */
  hooks.playArrival = function (where) {
    var p = soundPrefs()[where === "inChat" ? "inChat" : "outChat"];
    return playPreset(p.preset, Math.max(0.55, p.vol));
  };
  function soundsBlock() {
    var wrap = document.createElement("div"); wrap.className = "lp-block";
    var title = document.createElement("div"); title.className = "lp-title"; title.textContent = "Notification sounds";
    var note = document.createElement("p"); note.className = "lp-note"; note.textContent = "Sounds play only while the web app is open.";
    wrap.appendChild(title); wrap.appendChild(note);
    [["inChat", "Inside the chat"], ["outChat", "Outside the chat"]].forEach(function (row) {
      var key = row[0], prefs = soundPrefs()[key];
      var line = document.createElement("div"); line.className = "lp-sound";
      var lab = document.createElement("span"); lab.textContent = row[1];
      var sel = document.createElement("select"); sel.setAttribute("aria-label", row[1] + " sound");
      Object.keys(PRESETS).forEach(function (k) {
        var o = document.createElement("option"); o.value = k; o.textContent = PRESETS[k].name;
        if (k === prefs.preset) o.selected = true;
        sel.appendChild(o);
      });
      var vol = document.createElement("input"); vol.type = "range"; vol.min = "0"; vol.max = "1"; vol.step = "0.05";
      vol.value = String(prefs.vol); vol.setAttribute("aria-label", row[1] + " volume");
      var play = document.createElement("button"); play.type = "button"; play.className = "lp-btn"; play.textContent = "Preview";
      function save() {
        var s = store.get(SOUND_KEY, {}) || {};
        s[key] = { preset: sel.value, vol: Number(vol.value) };
        store.set(SOUND_KEY, s);
      }
      sel.addEventListener("change", save);
      vol.addEventListener("input", save);
      play.addEventListener("click", function () {
        var label = play.textContent;
        playPreset(sel.value, Number(vol.value), false, function () {
          play.textContent = "Tap Preview again";
          setTimeout(function () { play.textContent = label; }, 2500);
        });
      });
      line.appendChild(lab); line.appendChild(sel); line.appendChild(vol); line.appendChild(play);
      wrap.appendChild(line);
    });
    return wrap;
  }

  /* Injects the new rows into Settings only, and only once per opening. */
  function injectSettings() {
    var body = $("panelBody"), title = $("panelTitle");
    if (!body || !title || !/settings/i.test(title.textContent || "")) return;
    if (body.querySelector(".lp-settings")) return;
    var wrap = document.createElement("div"); wrap.className = "lp-settings";
    var row = document.createElement("button"); row.type = "button"; row.className = "lp-row";
    row.innerHTML = "<span>Clear conversation</span><span aria-hidden='true' style='color:var(--muted)'>&rsaquo;</span>";
    row.addEventListener("click", clearModal);
    wrap.appendChild(row);
    wrap.appendChild(soundsBlock());
    body.insertBefore(wrap, body.firstChild);
  }

  /* ---------- 4. Composer: + pop-out ---------- */
  function buildComposer() {
    var footer = $("footer"), input = $("input");
    if (!footer || !input || footer.querySelector(".lp-plus")) return;
    var plus = document.createElement("button");
    plus.type = "button"; plus.className = "lp-plus"; plus.setAttribute("aria-label", "More options"); plus.setAttribute("aria-expanded", "false");
    plus.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>';
    var pop = document.createElement("div"); pop.className = "lp-pop lp-closed";
    ["attach"].forEach(function (id) { var b = $(id); if (b) pop.appendChild(b); });
    footer.insertBefore(plus, footer.firstChild);
    footer.appendChild(pop);
    plus.addEventListener("click", function () {
      var open = pop.classList.toggle("lp-closed") === false;
      plus.setAttribute("aria-expanded", String(open));
    });
    document.addEventListener("pointerdown", function (e) {
      if (!pop.classList.contains("lp-closed") && !pop.contains(e.target) && !plus.contains(e.target)) {
        pop.classList.add("lp-closed"); plus.setAttribute("aria-expanded", "false");
      }
    }, true);
  }

  /* ---------- 5. Send: boomerang when this side's last send was 5+ minutes ago ---------- */
  function lastSentKey() { var side = store.get("pp-last-side", null); return "lp-lastsent-" + (side || "x"); }
  /* Oval flight path for the paper plane. Starts and ends at the send button; the nose follows the
     direction of travel and turns once around the loop. Returns sampled x, y and rotation (deg). */
  function boomerangKeys(R, k, N) {
    var d = Math.SQRT1_2, u = [d, -d], n = [-u[1], u[0]];
    var C = [R * n[0], R * n[1]];
    var out = [], prev = null, rot = 0;
    for (var i = 0; i <= N; i++) {
      var t = i / N, s = t * t * (3 - 2 * t), a = 2 * Math.PI * s;
      var ca = Math.cos(a), sa = Math.sin(a);
      var x = C[0] + R * (-ca * n[0] + k * sa * u[0]);
      var y = C[1] + R * (-ca * n[1] + k * sa * u[1]);
      var tx = sa * n[0] + k * ca * u[0], ty = sa * n[1] + k * ca * u[1];
      var ang = Math.atan2(ty, tx) * 180 / Math.PI + 45;
      if (prev === null) rot = ang;
      else { var dl = ang - prev; while (dl > 180) dl -= 360; while (dl < -180) dl += 360; rot += dl; }
      prev = ang;
      out.push({ x: x, y: y, rot: rot });
    }
    return out;
  }
  function boomerang() {
    var k = lastSentKey(), last = store.get(k, 0), now = Date.now();
    store.set(k, now);
    if (!last || now - last < 5 * 60 * 1000) return;
    var send = $("send");
    if (!send || (reduceMq && reduceMq.matches)) return;
    var r = send.getBoundingClientRect();
    var size = 36;
    var fly = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    fly.setAttribute("viewBox", "0 0 24 24");
    fly.setAttribute("class", "lp-boom");
    fly.setAttribute("aria-hidden", "true");
    fly.innerHTML = '<path d="M22 2 L2 10.2 L10.2 13.2 L13.4 22 Z" fill="currentColor"/><path d="M10.15 13.15 L22 2" fill="none" stroke="rgba(255,255,255,.7)" stroke-width="0.8" stroke-linejoin="round"/>';
    var cx = r.left + r.width / 2;
    var cy = r.top + r.height / 2;
    fly.style.position = "fixed";
    fly.style.left = "0";
    fly.style.top = "0";
    fly.style.width = size + "px";
    fly.style.height = size + "px";
    fly.style.zIndex = "90";
    fly.style.pointerEvents = "none";
    fly.style.overflow = "visible";
    fly.style.transformOrigin = "center center";
    fly.style.color = getComputedStyle(send).backgroundColor || "#9a5a48";
    document.body.appendChild(fly);
    var icon = send.querySelector("svg");
    if (icon) icon.style.opacity = "0";
    var kf = boomerangKeys(30, 1.6, 72);
    var frames = kf.map(function (p) {
      return { transform: "translate(" + (cx + p.x - size / 2).toFixed(2) + "px," + (cy + p.y - size / 2).toFixed(2) + "px) rotate(" + p.rot.toFixed(2) + "deg)" };
    });
    var anim = fly.animate(frames, { duration: 1500, easing: "linear", fill: "forwards" });
    var done = function () { fly.remove(); if (icon) icon.style.opacity = ""; };
    anim.onfinish = done;
    anim.oncancel = done;
  }
  function sendingNow() {
    var input = $("input");
    var held = document.getElementById("heldVoice");
    return !!((input && input.value.trim()) || (held && !held.classList.contains("hidden")));
  }
  function bindSend() {
    var send = $("send"), input = $("input");
    if (!send || send.dataset.lp) return;
    send.dataset.lp = "1";
    send.addEventListener("click", function () {
      if (send.dataset.lpHold === "1") { send.dataset.lpHold = ""; return; }
      if (sendingNow()) boomerang();
    }, true);
    if (input) input.addEventListener("keydown", function (e) {
      var coarse = window.matchMedia && matchMedia("(pointer: coarse)").matches;
      if (e.key === "Enter" && !e.shiftKey && !coarse && sendingNow()) boomerang();
    }, true);
  }

  /* ---------- 6. Recording: bin with poof ---------- */
  function bindBin() {
    var b = $("recCancel");
    if (!b || b.dataset.lp) return;
    b.dataset.lp = "1";
    b.setAttribute("aria-label", "Discard recording");
    b.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>';
    b.addEventListener("click", function () {
      var r = b.getBoundingClientRect();
      var g = document.createElement("div");
      g.className = "lp-puff";
      g.style.left = r.left + "px"; g.style.top = r.top + "px";
      g.style.width = r.width + "px"; g.style.height = r.height + "px";
      g.innerHTML = b.innerHTML;
      document.body.appendChild(g);
      setTimeout(function () { g.remove(); }, 460);
    }, true);
  }

  /* ---------- 7. Swipe up to ignore a notice ---------- */
  function bindNotice() {
    var n = $("notice");
    if (!n || n.dataset.lp) return;
    n.dataset.lp = "1";
    var y0 = null;
    n.addEventListener("pointerdown", function (e) { y0 = e.clientY; n.classList.remove("lp-away"); });
    n.addEventListener("pointermove", function (e) {
      if (y0 === null) return;
      var dy = Math.min(0, e.clientY - y0);
      n.style.transform = "translateY(" + dy + "px)";
      n.style.opacity = String(Math.max(0.2, 1 + dy / 120));
    });
    function end(e) {
      if (y0 === null) return;
      var dy = e.clientY - y0;
      y0 = null;
      if (dy < -40) {
        n.classList.add("lp-away");
        setTimeout(function () { n.classList.add("hidden"); n.classList.remove("lp-away"); n.style.transform = ""; n.style.opacity = ""; }, 320);
      } else {
        n.style.transform = ""; n.style.opacity = "";
      }
    }
    n.addEventListener("pointerup", end);
    n.addEventListener("pointercancel", end);
  }

  /* ---------- 8. Sign-in: the passphrase is never shown. A scanner sweeps the blinded marks. ----------
     Twelve scanners. On "Surprise me" (the default) each sign-in deals the next one from a shuffled deck,
     so none repeats until every one has played; then the deck is reshuffled. */
  var loadTok = 0, loadDone = true, loadOk = null, lensRun = null;
  var SCANNERS = ["scan", "prism", "ripple", "orbit", "pulse", "constellation", "bars", "ink", "aurora", "star", "round", "square"];
  var STAR_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.6l2.8 6.2 6.7.7-5 4.5 1.5 6.6L12 17.2l-6 3.4 1.5-6.6-5-4.5 6.7-.7z" fill="currentColor"/></svg>';
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function nextScanner() {
    var pref = "auto";
    try { pref = localStorage.getItem("pp-lens") || "auto"; } catch (e) {}
    if (pref === "small") pref = "round";
    if (pref === "drop") pref = "ink";
    if (pref !== "auto" && SCANNERS.indexOf(pref) >= 0) return pref;
    var deck = store.get("pp-scan-deck", null);
    if (!deck || !Array.isArray(deck.order) || deck.order.length !== SCANNERS.length || deck.i >= deck.order.length || deck.order.some(function (k) { return SCANNERS.indexOf(k) < 0; })) {
      var last = deck && deck.order ? deck.order[deck.order.length - 1] : null;
      var order = shuffle(SCANNERS.slice());
      if (order[0] === last) { order.push(order.shift()); }
      deck = { order: order, i: 0 };
    }
    var k = deck.order[deck.i];
    deck.i += 1;
    store.set("pp-scan-deck", deck);
    return k;
  }
  function setArt(on) { var art = document.getElementById("lpArt"); if (art) art.classList.toggle("checking", !!on); }
  function setBehind(on) { var lk = document.getElementById("lock"); if (lk) { lk.classList.toggle("lp-behind", !!on); lk.classList.toggle("lp-checking", !!on); } }
  function clearLens() {
    if (!lensRun) return;
    var r = lensRun; lensRun = null;
    r.timers.forEach(function (t) { clearTimeout(t); });
    (r.anims || []).forEach(function (a) { try { a.cancel(); } catch (e) {} });
    (r.nodes || []).forEach(function (n) { n.remove(); });
    if (r.input) { r.input.classList.remove("lp-blind"); r.input.readOnly = false; if (r.ph != null) r.input.placeholder = r.ph; }
  }
  // Returns how long the check should take, in ms.
  function startLens() {
    clearLens();
    var input = document.getElementById("pass"), field = input && input.parentNode;
    if (!input || !field) return 700;
    var n = Math.max(1, Math.min(24, (input.value || "").length || 4));
    var fr = field.getBoundingClientRect(), ir = input.getBoundingClientRect(), cs = getComputedStyle(input);
    var kind = nextScanner();
    var marks = document.createElement("div");
    marks.className = "lp-marks lp-k-" + kind;
    marks.style.left = (ir.left - fr.left) + "px";
    marks.style.top = (ir.top - fr.top) + "px";
    marks.style.width = ir.width + "px";
    marks.style.height = ir.height + "px";
    marks.style.paddingLeft = cs.paddingLeft;
    var spans = [];
    for (var i = 0; i < n; i++) { var s = document.createElement("span"); s.textContent = "•"; marks.appendChild(s); spans.push(s); }
    field.appendChild(marks);
    var run = { input: input, ph: input.placeholder, nodes: [marks], anims: [], timers: [], kind: kind };
    input.placeholder = "";
    input.readOnly = true;
    input.classList.add("lp-blind");
    lensRun = run;
    field.dataset.scanner = kind;
    if (reduceMq && reduceMq.matches) { spans.forEach(function (sp) { sp.classList.add("lp-seen"); }); marks.classList.add("lp-ok"); return 250; }
    var H = fr.height;
    var xs = spans.map(function (sp) { var r = sp.getBoundingClientRect(); return r.left - fr.left + r.width / 2; });
    var cy = (ir.top - fr.top) + ir.height / 2;
    var total = Math.min(1100, Math.max(620, n * 60));
    var f0 = 0.08, f1 = 0.9;
    var at = function (k) { return (n === 1 ? (f0 + f1) / 2 : f0 + (f1 - f0) * k / (n - 1)) * total; };
    var mk = function (cls, html) { var d = document.createElement("div"); d.className = "lp-sc " + cls; if (html) d.innerHTML = html; field.appendChild(d); run.nodes.push(d); return d; };
    var light = function (k, cls) {
      run.timers.push(setTimeout(function () { spans[k].classList.add(cls || "lp-lit"); }, at(k)));
      run.timers.push(setTimeout(function () { spans[k].classList.remove(cls || "lp-lit"); spans[k].classList.add("lp-seen"); }, at(k) + 260));
    };
    var sweep = function (node, w, extra) {
      var fr2 = [{ transform: "translateX(" + (xs[0] - w / 2 - 14) + "px)", opacity: 0 }, { opacity: 1, offset: f0 }, { opacity: 1, offset: f1 + 0.04 }, { transform: "translateX(" + (xs[n - 1] - w / 2 + 14) + "px)", opacity: 0 }];
      run.anims.push(node.animate(fr2, Object.assign({ duration: total, easing: "cubic-bezier(.45,.05,.35,1)", fill: "forwards" }, extra || {})));
    };
    var hop = function (node, w, h, scale) {
      var frames = [{ transform: "translate(" + (xs[0] - w / 2) + "px," + (cy - h / 2) + "px) scale(.4)", opacity: 0, offset: 0 }];
      for (var k = 0; k < n; k++) frames.push({ transform: "translate(" + (xs[k] - w / 2) + "px," + (cy - h / 2) + "px) scale(" + (scale || 1) + ")", opacity: 1, offset: at(k) / total });
      frames.push({ transform: "translate(" + (xs[n - 1] - w / 2) + "px," + (cy - h / 2) + "px) scale(.6)", opacity: 0, offset: 1 });
      run.anims.push(node.animate(frames, { duration: total, easing: "ease-in-out", fill: "forwards" }));
    };
    var k2;
    switch (kind) {
      case "scan": { var b = mk("lp-beam"); b.style.height = H + "px"; sweep(b, 3); for (k2 = 0; k2 < n; k2++) light(k2); break; }
      case "prism": { var p = mk("lp-prism"); p.style.height = H + "px"; sweep(p, 46); for (k2 = 0; k2 < n; k2++) light(k2, "lp-tint"); break; }
      case "aurora": { var au = mk("lp-aurora"); au.style.height = H + "px"; sweep(au, 90); for (k2 = 0; k2 < n; k2++) light(k2, "lp-rise"); break; }
      case "bars": {
        var v = mk("lp-vbar"); v.style.height = H + "px"; sweep(v, 2);
        var hz = mk("lp-hbar"); hz.style.width = fr.width + "px";
        run.anims.push(hz.animate([{ transform: "translateY(4px)", opacity: 0 }, { opacity: 1, offset: .15 }, { transform: "translateY(" + (H - 6) + "px)", opacity: 1, offset: .5 }, { transform: "translateY(4px)", opacity: 1, offset: .85 }, { transform: "translateY(" + (H / 2) + "px)", opacity: 0 }], { duration: total, easing: "ease-in-out", fill: "forwards" }));
        for (k2 = 0; k2 < n; k2++) light(k2); break;
      }
      case "ripple": {
        for (k2 = 0; k2 < n; k2++) (function (k) {
          run.timers.push(setTimeout(function () {
            var r = mk("lp-ring"); r.style.left = (xs[k] - 14) + "px"; r.style.top = (cy - 14) + "px";
            run.anims.push(r.animate([{ transform: "scale(.2)", opacity: .9 }, { transform: "scale(1.6)", opacity: 0 }], { duration: 520, easing: "ease-out", fill: "forwards" }));
          }, at(k)));
          light(k);
        })(k2);
        break;
      }
      case "orbit": {
        var o = mk("lp-orbit", "<i></i>"); hop(o, 30, 30, 1);
        for (k2 = 0; k2 < n; k2++) light(k2); break;
      }
      case "ink": case "round": case "square": case "star": {
        var cls = kind === "square" ? "sq" : kind === "ink" ? "dr" : kind === "star" ? "st" : "";
        var L = mk("lp-lens", "<div class='lp-shape " + cls + "'>" + (kind === "star" ? STAR_SVG : "") + "</div>");
        L.style.width = L.style.height = "40px"; L.style.left = "0"; L.style.top = "0";
        hop(L, 40, 40, 1);
        for (k2 = 0; k2 < n; k2++) light(k2, "lp-mag"); break;
      }
      case "pulse": {
        var W = Math.max(40, xs[n - 1] - xs[0] + 28), x0 = xs[0] - 14;
        var pts = "M0 " + (H / 2);
        for (k2 = 0; k2 < n; k2++) { var px = xs[k2] - x0; pts += " L" + (px - 6) + " " + (H / 2) + " L" + (px - 2) + " " + (H / 2 - 12) + " L" + (px + 2) + " " + (H / 2 + 10) + " L" + (px + 6) + " " + (H / 2); }
        pts += " L" + W + " " + (H / 2);
        var svg = mk("lp-ecg", "<svg width='" + W + "' height='" + H + "' viewBox='0 0 " + W + " " + H + "'><path d='" + pts + "'/></svg>");
        svg.style.left = x0 + "px"; svg.style.top = "0";
        var path = svg.querySelector("path"), len = 0;
        try { len = path.getTotalLength(); } catch (e) { len = W * 2; }
        path.style.strokeDasharray = len; path.style.strokeDashoffset = len;
        run.anims.push(path.animate([{ strokeDashoffset: len }, { strokeDashoffset: 0 }], { duration: total, easing: "linear", fill: "forwards" }));
        run.anims.push(svg.animate([{ opacity: 1, offset: .85 }, { opacity: 0 }], { duration: total + 120, fill: "forwards" }));
        for (k2 = 0; k2 < n; k2++) light(k2); break;
      }
      case "constellation": {
        var W2 = fr.width, lines = "";
        for (k2 = 1; k2 < n; k2++) lines += "<line x1='" + xs[k2 - 1] + "' y1='" + cy + "' x2='" + xs[k2] + "' y2='" + cy + "' style='--d:" + Math.round(at(k2 - 1)) + "ms'/>";
        var cs2 = mk("lp-const", "<svg width='" + W2 + "' height='" + H + "'>" + lines + "</svg>");
        cs2.style.left = "0"; cs2.style.top = "0";
        for (k2 = 0; k2 < n; k2++) light(k2, "lp-starlit"); break;
      }
    }
    run.timers.push(setTimeout(function () { marks.classList.add("lp-ok"); }, total * 0.96));
    return total + 80;
  }
  // Welcome: shows as soon as the passphrase is verified and the home screen loads behind it.
  // It leaves the moment home is on screen (at least 650 ms, at most 2.4 s), so there is no dead pause.
  function showWelcome(name) {
    clearLens();
    var o = document.createElement("div");
    o.className = "lp-welcome"; o.id = "lpWelcome";
    o.innerHTML = "<div class='lp-stack'><div class='lp-tick'><svg viewBox='0 0 24 24'><path d='M5 12.5l4.5 4.5L19 7.5'/></svg></div><h2></h2><p class='lp-wsub'>Opening your journal</p></div>";
    o.querySelector("h2").textContent = "Welcome, " + name;
    document.body.appendChild(o);
    var shownAt = Date.now(), gone = false;
    function dismiss() {
      if (gone) return; gone = true;
      setBehind(false);
      o.classList.add("lp-out");
      setTimeout(function () { o.remove(); }, 360);
    }
    function homeUp() { var h = document.getElementById("home"); return h && !h.classList.contains("hidden"); }
    function check() {
      if (gone) return;
      var dt = Date.now() - shownAt;
      if ((homeUp() && dt >= 650) || dt >= 2400) { dismiss(); return; }
      setTimeout(check, 60);
    }
    o.addEventListener("click", dismiss);
    check();
  }
  hooks.signInStart = function () {
    loadTok++;
    var tok = loadTok;
    loadDone = false; loadOk = null;
    setArt(true); setBehind(true);
    var wait = startLens();
    setTimeout(function () {
      if (tok !== loadTok) return;
      loadDone = true;
      if (loadOk) { var f = loadOk; loadOk = null; f(); }
    }, wait);
  };
  hooks.signInOk = function (name, done) {
    setArt(false);
    // When the sweep finishes: the welcome appears and the journal opens behind it at the same moment.
    var show = function () { showWelcome(name); if (typeof done === "function") done(); };
    if (!loadDone) { loadOk = show; return; }
    loadOk = null;
    show();
  };
  hooks.signInFail = function (msg) {
    loadTok++; loadDone = true; loadOk = null;
    setArt(false); setBehind(false); clearLens();
    toast("Couldn't sign in", msg || "Check your passphrase.");
  };


  /* ---------- 9. Live surfaces (from the approved mock-up) ---------- */
  var NUMW = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];
  var reduceMq = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  var st = { typing: false, unread: 0, name: "", inChat: false, bannerOff: false, trayOff: false, lastTypingAt: 0, typingRect: null };
  var seenIds = {}, ready = false, savedTop = null;
  var banner = null, tray = null, trayLabel = null, trayCount = null, chip = null, live = null;

  function receipt(n) { return (n <= 10 ? NUMW[n] : n) + (n === 1 ? " message received" : " messages received"); }
  function say(t) {
    if (!live) { live = document.createElement("div"); live.className = "lp-sr"; live.setAttribute("aria-live", "polite"); document.body.appendChild(live); }
    live.textContent = ""; setTimeout(function () { live.textContent = t; }, 40);
  }
  function listEl() { return $("list"); }
  function nearBottom() { var b = listEl(); return b ? b.scrollHeight - b.scrollTop - b.clientHeight <= 80 : true; }
  function goLatest() {
    var l = listEl();
    if (l && !nearBottom()) {
      savedTop = l.scrollTop;
      if (chip) chip.classList.remove("hidden");
    }
    if (window.LeesUI) window.LeesUI.jumpLatest();
    else if (l) l.scrollTop = l.scrollHeight;
  }

  /* swipe up to ignore: removes only the current event; the next one shows again */
  function bindSwipe(el, onUp) {
    var y0 = null;
    el.addEventListener("pointerdown", function (e) { y0 = e.clientY; });
    el.addEventListener("pointermove", function (e) {
      if (y0 === null) return;
      var dy = Math.min(0, e.clientY - y0);
      el.style.transform = "translateY(" + dy + "px)";
      el.style.opacity = String(Math.max(0.2, 1 + dy / 120));
    });
    function end(e) {
      if (y0 === null) return;
      var dy = e.clientY - y0; y0 = null;
      el.style.transform = ""; el.style.opacity = "";
      if (dy < -40) onUp();
    }
    el.addEventListener("pointerup", end);
    el.addEventListener("pointercancel", end);
  }

  function buildBanner() {
    if (banner) return;
    banner = document.createElement("div");
    banner.className = "lp-banner"; banner.setAttribute("role", "button"); banner.tabIndex = 0;
    banner.innerHTML = '<div class="lp-bn-av"></div><div class="lp-bn-body"><div class="lp-bn-name"></div><div class="lp-bn-line"></div></div><span class="lp-bn-view">View</span>';
    document.body.appendChild(banner);
    banner.addEventListener("click", function () { if (window.LeesHooks && LeesHooks.openChat) LeesHooks.openChat(); });
    bindSwipe(banner, function () { st.bannerOff = true; syncBanner(); });
  }
  function signedIn() {
    var lock = document.getElementById("lock");
    return !(lock && !lock.classList.contains("hidden"));
  }
  function syncBanner() {
    if (!banner) return;
    if (st.unread > (st.lastUnread || 0)) st.bannerOff = false;
    st.lastUnread = st.unread;
    // Home only: on a panel the banner would sit over the Back button.
    var onHome = window.LeesApp ? window.LeesApp.view === "home" : true;
    // The banner is for typing only; new messages arrive through the app's toast pipeline.
    var show = signedIn() && onHome && !st.bannerOff && st.typing && !st.inChat;
    clearTimeout(st.bannerTimer);
    if (show && !st.typing) st.bannerTimer = setTimeout(function () { st.bannerOff = true; syncBanner(); }, 3200);
    banner.classList.toggle("lp-show", show);
    var name = st.name || "";
    banner.querySelector(".lp-bn-name").textContent = name;
    banner.querySelector(".lp-bn-av").textContent = (name.split(" ").pop() || "?").charAt(0).toUpperCase();
    var line = banner.querySelector(".lp-bn-line");
    if (st.typing) { line.innerHTML = '<span class="lp-mini"><i></i><i></i><i></i></span><span>' + (name || "They") + ' is typing</span>'; }
    else { line.textContent = "New message"; }
    banner.querySelector(".lp-bn-view").classList.toggle("lp-gone-el", st.typing);
  }

  function buildTray() {
    if (tray) return;
    var chat = $("chat"), footer = $("footer");
    if (!chat || !footer) return;
    tray = document.createElement("div");
    tray.className = "lp-tray hidden"; tray.setAttribute("role", "button"); tray.tabIndex = 0;
    trayLabel = document.createElement("span"); trayLabel.className = "lp-tray-label";
    var nb = document.createElement("span"); nb.className = "lp-newest";
    trayCount = document.createElement("span"); trayCount.className = "lp-count hidden";
    nb.appendChild(trayCount);
    nb.appendChild(document.createTextNode("Newest"));
    nb.insertAdjacentHTML("beforeend", '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>');
    tray.appendChild(trayLabel); tray.appendChild(nb);
    chat.insertBefore(tray, footer);
    var glow = document.createElement("div");
    glow.id = "lpGlow";
    glow.className = "lp-glow";
    chat.insertBefore(glow, tray);
    tray.addEventListener("click", goLatest);
    tray.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); goLatest(); } });
    bindSwipe(tray, function () { st.trayOff = true; syncTray(); });

    chip = document.createElement("button");
    chip.type = "button"; chip.className = "lp-chip hidden"; chip.textContent = "Back to where you were";
    chat.insertBefore(chip, footer);
    chip.addEventListener("click", function () {
      var l = listEl();
      if (l && savedTop !== null) l.scrollTo({ top: savedTop, behavior: "smooth" });
      savedTop = null; chip.classList.add("hidden");
    });

    var l = listEl();
    if (l && !l.dataset.lpScroll) {
      l.dataset.lpScroll = "1";
      l.addEventListener("scroll", function () { if (nearBottom()) st.trayOff = false; syncTray(); }, { passive: true });
    }
    syncTray();
  }
  function syncTray() {
    if (!tray) return;
    var away = !!(st.inChat && signedIn() && !nearBottom());
    var showTyping = !!(st.typing && away);
    var showUnread = !!(st.unread > 0 && st.inChat && signedIn());
    var on = (showTyping || showUnread) && !st.trayOff;
    tray.classList.toggle("hidden", !on);
    var glow = document.getElementById("lpGlow");
    if (glow) glow.classList.toggle("show", !!(showUnread && !st.trayOff));
    if (chip) chip.classList.toggle("hidden", savedTop === null);
    if (!on) return;
    trayLabel.textContent = "";
    if (showTyping) {
      var mini = document.createElement("span");
      mini.className = "lp-mini";
      mini.innerHTML = "<i></i><i></i><i></i>";
      trayLabel.appendChild(mini);
      trayLabel.appendChild(document.createTextNode((st.name || "They") + " is typing" + (showUnread ? " · " : "")));
    }
    if (showUnread) trayLabel.appendChild(document.createTextNode(showTyping ? st.unread + " new" : receipt(st.unread)));
    trayCount.textContent = st.unread;
    trayCount.classList.toggle("hidden", !showUnread);
  }


  /* ---------- 10. Morph: the typing bubble becomes the arrived message, in its place ----------
     The message's own bubble starts at the dots' size, zooms, reshapes to its natural size,
     settles, then its words wave in. Timings follow the approved mock-up. */
  var morphQueue = [], morphActive = false, afterFx = [];
  function runAfterFx() { var q = afterFx; afterFx = []; for (var i = 0; i < q.length; i++) q[i](); }
  function nextMorph() {
    if (!morphQueue.length) { morphActive = false; runAfterFx(); return; }
    morphActive = true;
    var job = morphQueue.shift();
    morphOne(job, nextMorph);
  }
  hooks.arrived = function (dotsRect, ids) {
    if (!ids || !ids.length || !dotsRect) return;
    for (var i = 0; i < ids.length; i++) morphQueue.push({ id: ids[i], from: dotsRect });
    if (!morphActive) nextMorph();
  };
  hooks.afterArrival = function (fn) { if (morphActive) afterFx.push(fn); else fn(); };

  // The arrived bubble grows out of where the typing dots were. Only transform and opacity move:
  // the bubble's size and its words are never touched, so text can't be clipped mid-animation.
  function morphOne(job, done) {
    var card = document.querySelector("#list .msg[data-id='" + job.id + "']");
    var reduced = reduceMq && reduceMq.matches;
    if (!card || !st.inChat || reduced) { done(); return; }
    var finished = false;
    function end() { if (finished) return; finished = true; card.classList.remove("lp-pop-in"); done(); }
    card.classList.remove("lp-pop-in"); void card.offsetWidth;
    card.classList.add("lp-pop-in");
    card.addEventListener("animationend", end, { once: true });
    setTimeout(end, 700);
  }

  /* detect partner messages that are new since the last check */
  function scanArrivals() {
    var l = listEl(); if (!l) return;
    var fresh = [];
    l.querySelectorAll(".msg[data-id]").forEach(function (c) {
      var id = c.getAttribute("data-id");
      if (!seenIds[id]) { seenIds[id] = true; if (ready) fresh.push(c); }
    });
    // The morph is started by hooks.arrived, which the app calls from its arrival handler.
  }

  /* called by the app's own typing and unread code (see the three hooks in index.html) */
  hooks.onTyping = function (on, energy, name) {
    if (name) st.name = name;
    if (on) {
      st.lastTypingAt = Date.now();
      if (!st.typing) st.bannerOff = false;
    }
    st.typing = !!on;
    clearTimeout(st.typingTimer);
    if (on) st.typingTimer = setTimeout(function () { st.typing = false; syncBanner(); }, 4000);
    syncBanner(); syncTray();
  };
  hooks.onUnread = function (n, name, inChat) {
    if (name) st.name = name;
    var grew = n > st.unread;
    st.unread = n;
    st.inChat = !!inChat;
    if (n === 0) { st.trayOff = false; st.bannerOff = false; }
    if (grew) {
      st.trayOff = false; st.bannerOff = false;
      say(receipt(n) + (st.name ? " from " + st.name : ""));
    }
    syncTray(); syncBanner();
  };

  function buildLive() {
    buildBanner();
    buildTray();
    var chat = $("chat");
    if (chat) {
      st.inChat = !chat.classList.contains("hidden");
      new MutationObserver(function () {
        st.inChat = !chat.classList.contains("hidden");
        if (!st.inChat && chip) chip.classList.add("hidden");
        syncTray(); syncBanner();
      }).observe(chat, { attributes: true, attributeFilter: ["class"] });
    }
    var l = listEl();
    if (l) {
      scanArrivals();
      new MutationObserver(function () { requestAnimationFrame(scanArrivals); })
        .observe(l, { childList: true, subtree: true });
    }
    document.addEventListener("keydown", function (e) {
      if (e.key !== "End" || !st.inChat || /INPUT|TEXTAREA/.test(e.target.tagName)) return;
      e.preventDefault(); goLatest();
    });
    var homeV = document.getElementById("home");
    ["home", "panel", "chat"].forEach(function (id) { var v = document.getElementById(id); if (v) new MutationObserver(function () { syncBanner(); }).observe(v, { attributes: true, attributeFilter: ["class"] }); });
    var lock = document.getElementById("lock");
    if (lock) new MutationObserver(function () {
      if (!signedIn()) { st.typing = false; st.unread = 0; st.bannerOff = false; st.trayOff = false; }
      syncBanner(); syncTray();
    }).observe(lock, { attributes: true, attributeFilter: ["class"] });
    setTimeout(function () { ready = true; }, 1500);
    syncTray(); syncBanner();
  }

  function bindMotion() {
    var art = document.getElementById("lpArt");
    if (!art || (reduceMq && reduceMq.matches)) return;
    var bits = {
      figs: art.querySelector(".figs"),
      headL: art.querySelector(".headL"),
      headR: art.querySelector(".headR"),
      armL: art.querySelector(".armL"),
      armR: art.querySelector(".armR"),
      handL: art.querySelector(".handL"),
      handR: art.querySelector(".handR")
    };
    art.querySelectorAll(".star").forEach(function (star, n) {
      star.style.animationDelay = (Math.random() * 2.2) + "s";
      star.style.animationDuration = (1.6 + (n % 5) * 0.35) + "s";
    });
    var poses = [
      { figs: "translateY(-2px)", headL: "translateY(-6px) rotate(-6deg)", headR: "translateY(-8px) rotate(5deg)", armL: "none", armR: "none", handL: "rotate(-8deg)", handR: "rotate(6deg)" },
      { figs: "translate(-6px,1px) rotate(-2deg)", headL: "translateY(-10px) rotate(-14deg)", headR: "translateY(-4px) rotate(4deg)", armL: "rotate(-28deg)", armR: "rotate(4deg)", handL: "rotate(-18deg)", handR: "rotate(8deg)" },
      { figs: "translate(7px,0) rotate(2deg)", headL: "translateY(-3px) rotate(6deg)", headR: "translateY(-12px) rotate(16deg)", armL: "rotate(6deg)", armR: "rotate(34deg)", handL: "rotate(10deg)", handR: "rotate(-20deg)" },
      { figs: "translateY(-4px)", headL: "translateY(-14px) rotate(-4deg)", headR: "translateY(-14px) rotate(4deg)", armL: "rotate(-46deg)", armR: "rotate(42deg)", handL: "rotate(-8deg)", handR: "rotate(8deg)" },
      { figs: "translate(-2px,2px)", headL: "translate(3px,-6px) rotate(-8deg)", headR: "translate(-4px,-7px) rotate(3deg)", armL: "rotate(8deg)", armR: "rotate(-6deg)", handL: "rotate(14deg)", handR: "rotate(-12deg)" },
      { figs: "translate(2px,-1px) rotate(1deg)", headL: "translateY(-5px) rotate(2deg)", headR: "translateY(-16px) rotate(-12deg)", armL: "rotate(-8deg)", armR: "rotate(-38deg)", handL: "rotate(4deg)", handR: "rotate(16deg)" },
      { figs: "translateY(3px)", headL: "translateY(2px) rotate(3deg)", headR: "translateY(1px) rotate(-2deg)", armL: "rotate(12deg)", armR: "rotate(-10deg)", handL: "rotate(6deg)", handR: "rotate(-4deg)" },
      { figs: "translate(-4px,-3px) rotate(-1deg)", headL: "translateY(-9px) rotate(-18deg)", headR: "translateY(-6px) rotate(-4deg)", armL: "rotate(-52deg)", armR: "rotate(8deg)", handL: "rotate(-12deg)", handR: "rotate(18deg)" },
      { figs: "translate(3px,-2px)", headL: "translateY(-7px) rotate(8deg)", headR: "translateY(-11px) rotate(14deg)", armL: "rotate(4deg)", armR: "rotate(48deg)", handL: "rotate(-6deg)", handR: "rotate(-14deg)" },
      { figs: "none", headL: "translateY(-4px)", headR: "translateY(-5px)", armL: "rotate(-6deg)", armR: "rotate(6deg)", handL: "none", handR: "none" }
    ];
    var running = [], i = 0;
    function go() {
      running.forEach(function (a) { try { a.cancel(); } catch (e) {} });
      running = [];
      var pose = poses[i];
      var ms = 1100 + Math.random() * 900;
      Object.keys(bits).forEach(function (k) {
        var el = bits[k];
        if (!el || !el.animate) return;
        running.push(el.animate(
          [{ transform: getComputedStyle(el).transform }, { transform: pose[k] || "none" }],
          { duration: ms, easing: "cubic-bezier(.37,.02,.2,1)", fill: "forwards" }
        ));
      });
      i = (i + 1 + Math.floor(Math.random() * (poses.length - 1))) % poses.length;
      setTimeout(go, ms + 180 + Math.random() * 640);
    }
    go();
  }
  function bindLift() {
    if (reduceMq && reduceMq.matches) return;
    document.addEventListener("pointermove", function (e) {
      var card = e.target.closest ? e.target.closest(".media-card, .media-kind, .who-card") : null;
      document.querySelectorAll(".lp-tilted").forEach(function (n) {
        if (n !== card) { n.style.transform = ""; n.classList.remove("lp-tilted"); }
      });
      if (!card) return;
      var r = card.getBoundingClientRect();
      var px = (e.clientX - r.left) / Math.max(1, r.width) - 0.5;
      var py = (e.clientY - r.top) / Math.max(1, r.height) - 0.5;
      card.classList.add("lp-tilted");
      card.style.transform = "perspective(720px) rotateY(" + (px * 9).toFixed(2) + "deg) rotateX(" + (-py * 8).toFixed(2) + "deg) translateY(-8px)";
    }, { passive: true });
  }

  /* ---------- init ---------- */
  function init() {
    if (store.get("lp-ghost", false)) document.body.classList.add("ghost");
    bindMotion();
    bindLift();
    bindShields();
    buildComposer();
    bindSend();
    bindBin();
    bindNotice();
    var pb = $("panelBody");
    hooks.soundsBlock = soundsBlock;
    hooks.clearConversation = clearModal;
    buildLive();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
