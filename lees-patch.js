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
        if (!hooks.clearConversation) { toast("Not connected yet", "Grok must wire hooks.clearConversation."); return false; }
        hooks.clearConversation({ scope: scope, all: all, from: all ? null : from, to: all ? null : to });
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

  /* ---------- 8. Sign-in: the passphrase is never shown. A lens travels over the blinded marks. ---------- */
  var loadTok = 0, loadDone = true, loadOk = null, lensRun = null;
  var LENS = {
    round:  { w: 46, h: 46, cls: "" },
    small:  { w: 34, h: 34, cls: "" },
    square: { w: 42, h: 42, cls: "sq" },
    drop:   { w: 40, h: 40, cls: "dr" },
    star:   { w: 42, h: 42, cls: "st" }
  };
  var STAR_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.6l2.8 6.2 6.7.7-5 4.5 1.5 6.6L12 17.2l-6 3.4 1.5-6.6-5-4.5 6.7-.7z" fill="currentColor"/></svg>';
  var LENS_STEP_MS = 170;
  function lensKind() { try { var k = localStorage.getItem("pp-lens"); return (k === "scan" || LENS[k]) ? k : "scan"; } catch (e) { return "scan"; } }
  function setArt(on) { var art = document.getElementById("lpArt"); if (art) art.classList.toggle("checking", !!on); }
  function setBehind(on) { var lk = document.getElementById("lock"); if (lk) lk.classList.toggle("lp-behind", !!on); }
  function clearLens() {
    if (!lensRun) return;
    var r = lensRun; lensRun = null;
    r.timers.forEach(function (t) { clearTimeout(t); });
    if (r.anim) { try { r.anim.cancel(); } catch (e) {} }
    if (r.lens) r.lens.remove();
    if (r.status) r.status.remove();
    if (r.marks) r.marks.remove();
    if (r.input) r.input.classList.remove("lp-blind");
  }
  function tf(x, y, s) { return "translate(" + x.toFixed(1) + "px," + y.toFixed(1) + "px) scale(" + s + ")"; }
  // Returns how long the check should take, in ms.
  function startLens() {
    clearLens();
    var input = document.getElementById("pass"), field = input && input.parentNode;
    if (!input || !field) return 900;
    var n = Math.max(1, Math.min(32, (input.value || "").length || 4));
    var fr = field.getBoundingClientRect(), ir = input.getBoundingClientRect(), cs = getComputedStyle(input);
    var marks = document.createElement("div");
    marks.className = "lp-marks";
    marks.style.left = (ir.left - fr.left) + "px";
    marks.style.top = (ir.top - fr.top) + "px";
    marks.style.width = ir.width + "px";
    marks.style.height = ir.height + "px";
    marks.style.paddingLeft = cs.paddingLeft;
    marks.style.fontSize = cs.fontSize;
    marks.style.fontFamily = cs.fontFamily;
    var spans = [];
    for (var i = 0; i < n; i++) { var s = document.createElement("span"); s.textContent = "\u2022"; marks.appendChild(s); spans.push(s); }
    field.appendChild(marks);
    input.classList.add("lp-blind");
    var kind = lensKind();
    if (kind === "scan") return runScan(field, fr, spans, n, marks, input);
    var L = LENS[kind];
    var lens = document.createElement("div");
    lens.className = "lp-lens";
    lens.style.width = L.w + "px"; lens.style.height = L.h + "px";
    var shape = document.createElement("div");
    shape.className = "lp-shape " + L.cls;
    if (kind === "star") shape.innerHTML = STAR_SVG;
    lens.appendChild(shape);
    field.appendChild(lens);
    var run = { input: input, marks: marks, lens: lens, anim: null, timers: [] };
    lensRun = run;
    var reduce = reduceMq && reduceMq.matches;
    if (reduce) return 300;
    var xs = spans.map(function (sp) { var r = sp.getBoundingClientRect(); return r.left - fr.left + r.width / 2 - L.w / 2; });
    var yTop = (fr.height - L.h) / 2;
    var total = Math.max(900, n * LENS_STEP_MS);
    var f0 = 0.08, f1 = 0.92;
    var frames = [
      { transform: tf(xs[0], yTop, 0.5), opacity: 0, offset: 0 },
      { transform: tf(xs[0], yTop, 1), opacity: 1, offset: f0 }
    ];
    for (var k = 0; k < n; k++) {
      var off = n === 1 ? (f0 + f1) / 2 : f0 + (f1 - f0) * k / (n - 1);
      frames.push({ transform: tf(xs[k], yTop, 1), opacity: 1, offset: off });
      (function (sp, at) {
        run.timers.push(setTimeout(function () { sp.classList.add("lp-mag"); }, at - 60));
        run.timers.push(setTimeout(function () { sp.classList.remove("lp-mag"); }, at + 340));
      })(spans[k], off * total);
    }
    frames.push({ transform: tf(xs[n - 1], yTop, 0.85), opacity: 0, offset: 1 });
    run.anim = lens.animate(frames, { duration: total, easing: "ease-in-out", fill: "forwards" });
    return total + 120;
  }
  /* Scan verification: a thin light moves across the blinded marks. Each mark lights as the beam passes it. */
  function runScan(field, fr, spans, n, marks, input) {
    var beam = document.createElement("div");
    beam.className = "lp-beam";
    beam.style.height = fr.height + "px";
    var status = document.createElement("div");
    status.className = "lp-status";
    status.textContent = "Verifying";
    field.parentNode.insertBefore(status, field.nextSibling);
    field.appendChild(beam);
    var run = { input: input, marks: marks, lens: beam, anim: null, timers: [], status: status };
    lensRun = run;
    if (reduceMq && reduceMq.matches) {
      spans.forEach(function (sp) { sp.classList.add("lp-seen"); });
      marks.classList.add("lp-ok"); status.textContent = "Verified";
      return 300;
    }
    var xs = spans.map(function (sp) { var r = sp.getBoundingClientRect(); return r.left - fr.left + r.width / 2 - 1; });
    var total = Math.max(1000, n * LENS_STEP_MS);
    var f0 = 0.06, f1 = 0.94;
    var frames = [
      { transform: "translateX(" + xs[0].toFixed(1) + "px)", opacity: 0, offset: 0 },
      { transform: "translateX(" + xs[0].toFixed(1) + "px)", opacity: 1, offset: f0 }
    ];
    for (var k = 0; k < n; k++) {
      var off = n === 1 ? (f0 + f1) / 2 : f0 + (f1 - f0) * k / (n - 1);
      frames.push({ transform: "translateX(" + xs[k].toFixed(1) + "px)", opacity: 1, offset: off });
      (function (sp, at) {
        run.timers.push(setTimeout(function () { sp.classList.add("lp-lit"); }, at));
        run.timers.push(setTimeout(function () { sp.classList.remove("lp-lit"); sp.classList.add("lp-seen"); }, at + 360));
      })(spans[k], off * total);
    }
    frames.push({ transform: "translateX(" + (xs[n - 1] + 12).toFixed(1) + "px)", opacity: 1, offset: 0.98 });
    frames.push({ transform: "translateX(" + (xs[n - 1] + 12).toFixed(1) + "px)", opacity: 0, offset: 1 });
    run.anim = beam.animate(frames, { duration: total, easing: "ease-in-out", fill: "forwards" });
    run.timers.push(setTimeout(function () {
      marks.classList.add("lp-ok");
      status.textContent = "Verified";
    }, total * 0.96));
    return total + 160;
  }
  // Welcome state. Its blur uses the class lp-wel-on, separate from the scan blur (lp-behind).
  function showWelcome(name) {
    clearLens();
    setBehind(false);
    var o = document.createElement("div");
    o.className = "lp-welcome"; o.id = "lpWelcome";
    o.innerHTML = "<div class='lp-stack'><div class='lp-tick'><svg viewBox='0 0 24 24'><path d='M5 12.5l4.5 4.5L19 7.5'/></svg></div><h2></h2></div>";
    o.querySelector("h2").textContent = "Welcome, " + name;
    document.body.classList.add("lp-wel-on");
    document.body.appendChild(o);
    confetti();
    var timer = null, gone = false;
    function dismiss() {
      if (gone) return; gone = true;
      clearTimeout(timer);
      o.classList.add("lp-out");
      setTimeout(function () { o.remove(); document.body.classList.remove("lp-wel-on"); }, 320);
    }
    o.addEventListener("click", dismiss);
    timer = setTimeout(dismiss, 1200);
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
    var tok = loadTok;
    if (tok !== loadTok) return;
    setArt(false);
    var show = function () { showWelcome(name); if (typeof done === "function") done(); };
    // The server has verified, but the welcome and the unlock wait until the scan has walked the whole passphrase.
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
    var show = signedIn() && !st.bannerOff && (st.typing || st.unread > 0) && !st.inChat;
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
    if (showUnread) trayLabel.textContent = receipt(st.unread);
    else if (showTyping) {
      var mini = document.createElement("span");
      mini.className = "lp-mini";
      mini.innerHTML = "<i></i><i></i><i></i>";
      trayLabel.appendChild(mini);
      trayLabel.appendChild(document.createTextNode((st.name || "They") + " is typing"));
    }
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

  function morphOne(job, done) {
    var card = document.querySelector("#list .msg[data-id='" + job.id + "']");
    var txt = card && card.querySelector(".txt");
    var reduced = reduceMq && reduceMq.matches;
    if (!card || !txt || !st.inChat || reduced || !job.from || !job.from.width) { done(); return; }
    var wasNear = nearBottom();
    var W = job.from.width, H = job.from.height;
    var plain = (txt.childNodes.length === 1 && txt.firstChild.nodeType === 3) ? txt.firstChild.nodeValue : null;
    var timers = [], ended = false, waved = false, dots = null;

    function cleanup() {
      card.classList.remove("lp-morphing", "lp-zoom", "lp-reshape", "lp-showing", "lp-msettle");
      card.style.width = ""; card.style.height = "";
      if (dots) { dots.remove(); dots = null; }
      if (waved && plain !== null) txt.textContent = plain;
      waved = false;
    }
    function end() {
      if (ended) return;
      ended = true;
      timers.forEach(clearTimeout); timers = [];
      cleanup();
      if (wasNear && st.inChat) { var l = listEl(); if (l) l.scrollTop = l.scrollHeight; }
      done();
    }
    function at(ms, fn) {
      timers.push(setTimeout(function () {
        if (ended) return;
        if (!st.inChat) { end(); return; }   // the chat was closed mid-morph: show the final state
        fn();
      }, ms));
    }

    // 1. the dots' size; the typing bubble zooms to 1.14 and its dots fade (240 ms)
    card.classList.add("lp-morphing");
    card.style.width = W + "px"; card.style.height = H + "px";
    dots = document.createElement("span"); dots.className = "lp-mdots";
    dots.innerHTML = "<i></i><i></i><i></i>";
    card.appendChild(dots);
    card.getBoundingClientRect();
    card.classList.add("lp-zoom");
    dots.classList.add("lp-dfade");

    // 2. measure the natural size; reshape from the dots' size to it (470 ms); text fades in
    at(240, function () {
      card.style.width = ""; card.style.height = "";
      var toW = card.offsetWidth, toH = card.offsetHeight;
      card.classList.remove("lp-zoom");
      if (toW && toH) {                       // a zero measurement (hidden or not laid out) skips the reshape
        card.style.width = W + "px"; card.style.height = H + "px";
        card.getBoundingClientRect();
        card.classList.add("lp-reshape");
        card.style.width = toW + "px"; card.style.height = toH + "px";
      }
      card.classList.add("lp-showing");
      timers.push(setTimeout(function () { if (dots && !ended) { dots.remove(); dots = null; } }, 200));
    });

    // 3. release to natural layout, settle bounce (600 ms)
    at(710, function () {
      card.classList.remove("lp-reshape", "lp-morphing", "lp-zoom");
      card.style.width = ""; card.style.height = "";
      card.classList.add("lp-msettle");
    });

    // 4. words wave in one by one (only for plain text; rich text skips the wave)
    at(1310, function () {
      card.classList.remove("lp-msettle");
      if (plain === null || !plain.trim()) { end(); return; }
      var parts = plain.split(/(\s+)/), i = 0;
      txt.textContent = "";
      for (var k = 0; k < parts.length; k++) {
        var part = parts[k];
        if (/^\s+$/.test(part)) { txt.appendChild(document.createTextNode(part)); continue; }
        var s = document.createElement("span");
        s.className = "lp-mw"; s.style.setProperty("--i", String(i++)); s.textContent = part;
        txt.appendChild(s);
      }
      waved = true;
      timers.push(setTimeout(end, 80 + i * 70 + 950));
    });
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
    if (pb) new MutationObserver(injectSettings).observe(pb, { childList: true });
    injectSettings();
    buildLive();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
