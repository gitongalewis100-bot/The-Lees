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
    }
    var top = document.querySelector("#home .topbar");
    if (top && shield && !$("homeShield")) {
      var hs = document.createElement("button");
      hs.id = "homeShield"; hs.className = "ibtn"; hs.type = "button";
      hs.setAttribute("aria-label", "Shield"); hs.title = "Shield";
      hs.innerHTML = '<svg class="i" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>';
      top.appendChild(hs);
      bindLongPress(hs, askGhost);
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
  function playPreset(key, vol) {
    var P = PRESETS[key];
    if (!P) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      var t = actx.currentTime;
      var g = actx.createGain();
      g.connect(actx.destination);
      var peak = Math.max(0, Math.min(1, vol)) * (P.v || 0.5) * 0.6;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + P.d);
      if (P.noise) {
        var len = Math.floor(actx.sampleRate * P.d), buf = actx.createBuffer(1, len, actx.sampleRate), ch = buf.getChannelData(0);
        for (var i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / len);
        var src = actx.createBufferSource(); src.buffer = buf;
        var bp = actx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = P.f;
        src.connect(bp); bp.connect(g); src.start(t);
        return;
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
    } catch (e) { /* audio blocked until the first gesture: ignore */ }
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
    playPreset(p.preset, p.vol);
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
      play.addEventListener("click", function () { playPreset(sel.value, Number(vol.value)); });
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
    ["attach", "mic", "clock"].forEach(function (id) { var b = $(id); if (b) pop.appendChild(b); });
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

  /* ---------- 5. Send: long press = schedule; boomerang when the side's last send was 5+ minutes ago ---------- */
  function lastSentKey() { var side = store.get("pp-last", null); return "lp-lastsent-" + (side || "x"); }
  function boomerang() {
    var k = lastSentKey(), last = store.get(k, 0), now = Date.now();
    store.set(k, now);
    if (last && now - last < 5 * 60 * 1000) return;
    var send = $("send"), svg = send && send.querySelector("svg");
    if (!svg || !svg.animate) return;
    svg.animate([
      { transform: "translate(0,0) rotate(0deg)" },
      { transform: "translate(26px,-34px) rotate(70deg)", offset: 0.28 },
      { transform: "translate(64px,-18px) rotate(170deg)", offset: 0.5 },
      { transform: "translate(40px,-52px) rotate(260deg)", offset: 0.7 },
      { transform: "translate(-6px,-14px) rotate(330deg)", offset: 0.88 },
      { transform: "translate(0,0) rotate(360deg)" }
    ], { duration: 1000, easing: "cubic-bezier(.3,.1,.3,1)" });
  }
  function bindSend() {
    var send = $("send");
    if (!send || send.dataset.lp) return;
    send.dataset.lp = "1";
    var timer = null, fired = false;
    send.addEventListener("pointerdown", function () {
      fired = false; clearTimeout(timer);
      timer = setTimeout(function () {
        fired = true;
        if (navigator.vibrate) navigator.vibrate(10);
        var c = $("clock"); if (c) c.click();
      }, 450);
    });
    ["pointerup", "pointerleave", "pointercancel"].forEach(function (t) { send.addEventListener(t, function () { clearTimeout(timer); }); });
    send.addEventListener("click", function (e) {
      if (fired) { fired = false; e.stopImmediatePropagation(); e.preventDefault(); return; }
      var input = $("input");
      if (input && input.value.trim()) boomerang();
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

  /* ---------- 8. Sign-in: processing, then tick and welcome ---------- */
  hooks.signInStart = function () {
    var o = document.createElement("div");
    o.className = "lp-welcome"; o.id = "lpWelcome";
    o.innerHTML = "<div class='lp-stack'><div class='lp-spin' role='status' aria-label='Checking passphrase'></div></div>";
    document.body.appendChild(o);
  };
  hooks.signInOk = function (name) {
    var o = $("lpWelcome");
    if (!o) { hooks.signInStart(); o = $("lpWelcome"); }
    o.innerHTML = "<div class='lp-stack'><div class='lp-tick'><svg viewBox='0 0 24 24'><path d='M5 12.5l4.5 4.5L19 7.5'/></svg></div><h2></h2></div>";
    o.querySelector("h2").textContent = "Welcome, " + name;
    confetti();
    setTimeout(function () { o.remove(); }, 1300);
  };
  hooks.signInFail = function (msg) {
    var o = $("lpWelcome"); if (o) o.remove();
    toast("Couldn't sign in", msg || "Check your passphrase.");
  };


  /* ---------- 9. Live surfaces (from the approved mock-up) ---------- */
  var NUMW = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];
  var reduceMq = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  var st = { typing: false, unread: 0, name: "", inChat: false, bannerOff: false, trayOff: false, lastTypingAt: 0, typingRect: null };
  var seenIds = {}, ready = false, divider = null, savedTop = null;
  var banner = null, tray = null, trayLabel = null, trayCount = null, chip = null, live = null;

  function receipt(n) { return (n <= 10 ? NUMW[n] : n) + (n === 1 ? " message received" : " messages received"); }
  function say(t) {
    if (!live) { live = document.createElement("div"); live.className = "lp-sr"; live.setAttribute("aria-live", "polite"); document.body.appendChild(live); }
    live.textContent = ""; setTimeout(function () { live.textContent = t; }, 40);
  }
  function listEl() { return $("list"); }
  function latestBtn() { return $("toBottom"); }
  function nearBottom() { var b = listEl(); return b ? b.scrollHeight - b.scrollTop - b.clientHeight <= 80 : true; }
  function goLatest() { var b = latestBtn(); if (b && !b.classList.contains("hidden")) b.click(); }

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
  function syncBanner() {
    if (!banner) return;
    var show = !st.bannerOff && (st.typing || st.unread > 0) && !st.inChat;
    banner.classList.toggle("lp-show", show);
    var name = st.name || "";
    banner.querySelector(".lp-bn-name").textContent = name;
    banner.querySelector(".lp-bn-av").textContent = (name.split(" ").pop() || "?").charAt(0).toUpperCase();
    var line = banner.querySelector(".lp-bn-line");
    if (st.typing) { line.innerHTML = '<span class="lp-mini"><i></i><i></i><i></i></span><span>typing</span>'; }
    else { line.textContent = receipt(st.unread); }
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

    var b = latestBtn();
    if (b) {
      // remember where the reader was before jumping to the newest message
      b.addEventListener("click", function () {
        if (!nearBottom()) { savedTop = listEl().scrollTop; chip.classList.remove("hidden"); }
      }, true);
      new MutationObserver(syncTray).observe(b, { attributes: true, attributeFilter: ["class"] });
    }
    syncTray();
  }
  function syncTray() {
    if (!tray) return;
    var b = latestBtn();
    var on = !!b && !b.classList.contains("hidden") && st.inChat && !st.trayOff;
    tray.classList.toggle("hidden", !on);
    if (!on) return;
    trayLabel.textContent = st.unread > 0 ? receipt(st.unread) : "";
    trayCount.textContent = st.unread;
    trayCount.classList.toggle("hidden", st.unread === 0);
  }

  function ensureDivider(row) {
    if (divider || !row || !row.parentNode) return;
    divider = document.createElement("div");
    divider.className = "lp-divider"; divider.textContent = "New messages";
    row.parentNode.insertBefore(divider, row);
  }
  function clearDivider() {
    if (!divider) return;
    var d = divider; divider = null;
    d.classList.add("lp-gone");
    setTimeout(function () { d.remove(); }, 300);
  }

  /* typing bubble zooms, dots fade, the same shape reshapes into the arrived message, then it settles */
  function morph(row) {
    if (reduceMq && reduceMq.matches) return;
    var box = row.querySelector(".bubble") || row.querySelector(".msg") || row;
    var from = st.typingRect, to = box.getBoundingClientRect();
    if (!from || !to.width || !from.width) return;
    box.classList.add("lp-pending");
    var c = document.createElement("div");
    c.className = "lp-morph";
    c.innerHTML = '<span class="lp-mini"><i></i><i></i><i></i></span>';
    document.body.appendChild(c);
    var fr = { left: from.left + "px", top: from.top + "px", width: from.width + "px", height: from.height + "px", transform: "scale(1)", offset: 0 };
    var zoom = { left: from.left + "px", top: from.top + "px", width: from.width + "px", height: from.height + "px", transform: "scale(1.14)", offset: 0.32 };
    var land = { left: to.left + "px", top: to.top + "px", width: to.width + "px", height: to.height + "px", transform: "scale(1)", offset: 1 };
    c.animate([fr, zoom, land], { duration: 760, easing: "cubic-bezier(.2,.9,.25,1)", fill: "forwards" });
    c.querySelectorAll("i").forEach(function (i) { i.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 260, fill: "forwards" }); });
    setTimeout(function () {
      c.remove();
      box.classList.remove("lp-pending");
      box.classList.add("lp-settle");
      setTimeout(function () { box.classList.remove("lp-settle"); }, 620);
    }, 780);
  }

  /* detect partner messages that are new since the last check */
  function scanArrivals() {
    var l = listEl(); if (!l) return;
    var fresh = [];
    l.querySelectorAll(".msg[data-id]").forEach(function (c) {
      var id = c.getAttribute("data-id");
      if (!seenIds[id]) { seenIds[id] = true; if (ready) fresh.push(c); }
    });
    fresh.forEach(function (c) {
      var row = c.closest(".row");
      if (!row || !row.classList.contains("theirs") || !st.inChat) return;
      if (st.unread > 0) ensureDivider(row);
      if (Date.now() - st.lastTypingAt < 8000) morph(row);
    });
  }

  /* called by the app's own typing and unread code (see the three hooks in index.html) */
  hooks.onTyping = function (on, energy, name) {
    if (name) st.name = name;
    if (on) {
      st.lastTypingAt = Date.now();
      var t = $("typing");
      if (t) st.typingRect = t.getBoundingClientRect();
      if (!st.typing) st.bannerOff = false;
    }
    st.typing = !!on;
    syncBanner();
  };
  hooks.onUnread = function (n, name, inChat) {
    if (name) st.name = name;
    var grew = n > st.unread;
    st.unread = n;
    st.inChat = !!inChat;
    if (n === 0) { clearDivider(); st.trayOff = false; st.bannerOff = false; }
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
    setTimeout(function () { ready = true; }, 1500);
    syncTray(); syncBanner();
  }

  /* ---------- init ---------- */
  function init() {
    if (store.get("lp-ghost", false)) document.body.classList.add("ghost");
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
