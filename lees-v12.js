/* The Lees v12
   1. Last seen + activity: what each of you did, per session, visible to both of you.
   2. Reset everything (passphrase checked on the server) and Recently deleted: restore all / delete all for good.
   3. Sealed letters that open themselves the next time the other person opens the app.
   4. The guide: a spotlight tour (most important first), a Settings switch, and smart tips for features
      you haven't used after two sign-ins.
   5. ARTEN: the flower in the corner. Ask anything about the app, get a considered answer, then "Show me" runs
      the guide for it or "Take me there" goes straight to it.
   Talks to the app only through window.LeesApp and its lees:* events. */
(function () {
  "use strict";
  var A = function () { return window.LeesApp; };
  var reduce = function () { try { return matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; } };
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function svg(d, cls) { return '<svg class="' + (cls || "i sm") + '" viewBox="0 0 24 24" aria-hidden="true"><path d="' + d + '"/></svg>'; }
  function btn(cls, html, label, fn) { var b = el("button", cls); b.type = "button"; b.innerHTML = html; if (label) b.setAttribute("aria-label", label); if (fn) b.addEventListener("click", fn); return b; }
  var LS = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
    del: function (k) { try { localStorage.removeItem(k); } catch (e) {} }
  };
  function missingFn(err) { var m = String((err && err.message) || "") + " " + String((err && err.code) || ""); return /could not find|does not exist|schema cache|PGRST20|42883|42P01|PGRST205/i.test(m); }
  var P = {
    close: "M18 6L6 18M6 6l12 12", back: "M15 18l-6-6 6-6", next: "M9 6l6 6-6 6", check: "M20 6L9 17l-5-5",
    chat: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z", send: "M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z",
    image: "M3 3h18v18H3zM8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM21 15l-5-5L5 21", mic: "M9 3h6v11H9zM5 11a7 7 0 0 0 14 0M12 18v3",
    book: "M2 5.5C4.5 4 7.5 4 11 5.5V20c-3.5-1.5-6.5-1.5-9 0zM22 5.5C19.5 4 16.5 4 13 5.5V20c3.5-1.5 6.5-1.5 9 0z",
    heart: "M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z",
    letter: "M3 5h18v14H3zM3 7l9 6 9-6", play: "M7 4l13 8-13 8z", bell: "M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0",
    gear: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15l1.6 1-2 3.4-1.8-.7a7 7 0 0 1-2.2 1.3L14.7 22h-4l-.3-2a7 7 0 0 1-2.2-1.3l-1.8.7-2-3.4 1.6-1a7 7 0 0 1 0-2.6l-1.6-1 2-3.4 1.8.7A7 7 0 0 1 10.4 4l.3-2h4l.3 2a7 7 0 0 1 2.2 1.3l1.8-.7 2 3.4-1.6 1a7 7 0 0 1 0 2.6z",
    sign: "M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3", out: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9",
    eye: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z", clock: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2",
    trash: "M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6", undo: "M9 14L4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11", star: "M12 2l3 7 7 .6-5.3 4.7 1.6 7.2L12 17.8 5.7 21.5l1.6-7.2L2 9.6 9 9z",
    shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z", cal: "M3 4h18v18H3zM16 2v4M8 2v4M3 10h18", spark: "M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6",
    archive: "M3 4h18v4H3zM5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8M10 12h4", search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-4.3-4.3",
    lock: "M3 11h18v11H3zM7 11V7a5 5 0 0 1 10 0v4", arrow: "M5 12h14M13 6l6 6-6 6", game: "M6 12h4M8 10v4M15 13h.01M18 11h.01M17.3 5H6.7a4 4 0 0 0-4 3.6L2 15a3 3 0 0 0 5.2 2l1.5-1.5h6.6L16.8 17A3 3 0 0 0 22 15l-.7-6.4A4 4 0 0 0 17.3 5z"
  };

  /* =====================================================================================================
     1. ACTIVITY + LAST SEEN
     ===================================================================================================== */
  var ACT = {
    signin: ["Signed in", P.sign], signout: ["Signed out", P.out], idle: ["Signed out after being idle", P.out], away: ["Left the app open in the background", P.clock], back: ["Came back to the app", P.sign],
    open_chat: ["Opened the conversation", P.chat], send_text: ["Sent a message", P.send], send_media: ["Sent photos", P.image], send_photo: ["Sent a photo", P.image], send_video: ["Sent a video", P.image],
    send_voice: ["Sent a voice note", P.mic], read: ["Read your messages", P.eye], nudge: ["Sent “thinking of you”", P.heart], letter: ["Sealed a letter", P.letter], letter_open: ["Opened a sealed letter", P.letter],
    game: ["Played tic-tac-toe", P.game], journal: ["Opened the journal", P.book], notifications: ["Checked notifications", P.bell], settings: ["Opened settings", P.gear], media: ["Looked through media", P.image],
    calendar: ["Opened the calendar", P.cal], moments: ["Looked at moments", P.star], archive: ["Opened the archive", P.archive], create: ["Opened Create", P.spark], vault: ["Opened recently deleted", P.trash],
    mood: ["Shared a mood", P.heart], love: ["Loved a message", P.heart], reset: ["Reset The Lees", P.undo], guide: ["Took the guide", P.spark], arten: ["Asked ARTEN", P.spark], panel: ["Opened a page", P.next]
  };
  var PANEL_ACT = { "Journal": "journal", "Notifications": "notifications", "Settings": "settings", "Media": "media", "Calendar": "calendar", "Moments": "moments", "Archive": "archive", "Create": "create", "Recently deleted": "vault", "Sealed letters": "letter", "Tic-tac-toe": "game", "Trophy cabinet": "panel" };
  var Act = {
    q: [], local: LS.get("v12-act-local", []), remote: [], loaded: false, server: true, ids: null, lastLogged: {}, readFrom: 0, timer: 0, beat: 0, chan: null,
    log: function (action, detail) {
      var a = A(); if (!a || !a.unlocked || !action) return;
      var now = Date.now(), key = action + "|" + (detail || "");
      // The same thing twice within 40 s is one entry (switching back and forth between views).
      if (this.lastLogged[key] && now - this.lastLogged[key] < 40000 && action !== "send_text") return;
      this.lastLogged[key] = now;
      var item = { action: action, detail: String(detail || "").slice(0, 200), at: new Date(now).toISOString() };
      // Several messages in a row become one "Sent 4 messages".
      var last = this.q[this.q.length - 1];
      if (last && last.action === action && action === "send_text" && now - Date.parse(last.at) < 5 * 60000) { last.n = (last.n || 1) + 1; last.detail = last.n + " messages"; last.at = item.at; }
      else this.q.push(item);
      var mine = { side: a.me, action: item.action, detail: item.detail, at: now };
      this.local.push(mine); if (this.local.length > 300) this.local = this.local.slice(-300);
      LS.set("v12-act-local", this.local);
      try { if (a.broadcast) a.broadcast("act", { action: item.action, detail: item.detail }); } catch (e) {}
      clearTimeout(this.timer); this.timer = setTimeout(function () { Act.flush(); }, 8000);
      Usage.mark(action);
    },
    flush: async function () {
      var a = A(); if (!a || !a.sb || !this.q.length) return;
      var items = this.q.splice(0, 60).map(function (x) { return { action: x.action, detail: x.detail, at: x.at }; });
      try {
        var r = await a.sb.rpc("log_activity", { p_items: items });
        if (r.error) { if (missingFn(r.error)) this.server = false; else this.q = items.concat(this.q); }
      } catch (e) { this.q = items.concat(this.q); }
    },
    touch: function () { var a = A(); if (!a || !a.unlocked || !a.sb || !this.server || document.hidden) return; if (a.idleFor && a.idleFor() > 5 * 60 * 1000) return; a.sb.rpc("touch_last_seen").then(function (r) { if (r && r.error && missingFn(r.error)) Act.server = false; }, function () {}); },
    load: async function () {
      var a = A(); if (!a || !a.sb || !a.pairId) return;
      var r = await a.sb.from("activity_log").select("*").eq("pair_id", a.pairId).order("at", { ascending: false }).limit(600);
      if (r.error) { if (missingFn(r.error)) this.server = false; this.loaded = true; return; }
      this.server = true;
      this.remote = (r.data || []).map(function (x) { return { side: x.side, action: x.action, detail: x.detail || "", at: Date.parse(x.at) || 0, id: x.id }; });
      this.loaded = true;
      paintSeen();
    },
    subscribe: function () {
      var a = A(); if (!a || !a.sb || !a.pairId || !a.sb.channel) return;
      try { if (this.chan) a.sb.removeChannel(this.chan); } catch (e) {}
      this.chan = a.sb.channel("act-" + a.pairId).on("postgres_changes", { event: "INSERT", schema: "public", table: "activity_log", filter: "pair_id=eq." + a.pairId }, function (p) {
        var x = p && p.new; if (!x || !x.id || Act.remote.some(function (y) { return y.id === x.id; })) return;
        Act.remote.unshift({ side: x.side, action: x.action, detail: x.detail || "", at: Date.parse(x.at) || Date.now(), id: x.id });
        paintSeen();
      }).subscribe();
    },
    // Everything known for one side, newest first. Server rows when available; this device's own log otherwise.
    list: function (side) {
      var src = this.server && this.loaded ? this.remote.concat(this.live.filter(function (l) { return !Act.remote.some(function (r) { return r.side === l.side && r.action === l.action && Math.abs(r.at - l.at) < 15000; }); })) : this.local.concat(this.live);
      var mine = A() && A().me;
      if (side === mine) {
        var pend = this.q.map(function (x) { return { side: mine, action: x.action, detail: x.detail, at: Date.parse(x.at) }; });
        src = src.concat(pend.filter(function (p) { return !src.some(function (r) { return r.side === p.side && r.action === p.action && Math.abs(r.at - p.at) < 15000; }); }));
      }
      return src.filter(function (x) { return x.side === side; }).sort(function (x, y) { return y.at - x.at; });
    },
    live: []
  };
  // The other person's actions also arrive live by broadcast (instant, even before the server row lands).
  document.addEventListener("lees:remote-act", function (e) {
    var p = e.detail || {}; if (!p.action || !p.from) return;
    Act.live.push({ side: p.from, action: p.action, detail: p.detail || "", at: p.at || Date.now() });
    if (Act.live.length > 80) Act.live.shift();
    paintSeen();
  });

  // What counts as an action: sign in/out, views and pages, own sends (by kind), reading, cards (letters, games, nudges).
  function scanOwnSends() {
    var a = A(); if (!a || !a.unlocked) return;
    var list = a.thread() || [];
    if (!Act.ids) { Act.ids = new Set(list.map(function (m) { return m.id; })); Act.cids = new Set(list.map(function (m) { return m.clientId; }).filter(Boolean)); return; }
    var fresh = list.filter(function (m) { return m.from === a.me && !Act.ids.has(m.id) && !(m.clientId && Act.cids.has(m.clientId)) && Date.now() - m.ts < 120000; });
    list.forEach(function (m) { Act.ids.add(m.id); if (m.clientId) Act.cids.add(m.clientId); });
    var batches = {};
    fresh.forEach(function (m) {
      var card = a.cardOf && m.kind === "text" ? a.cardOf(m.text) : null;
      if (card) { Act.log(card.t === "letter" ? "letter" : card.t === "game" ? "game" : "nudge", card.title || ""); return; }
      if (m.batchId) { batches[m.batchId] = (batches[m.batchId] || 0) + 1; return; }
      if (m.kind === "image") Act.log("send_photo"); else if (m.kind === "video") Act.log("send_video"); else if (m.kind === "audio") Act.log("send_voice"); else Act.log("send_text");
    });
    Object.keys(batches).forEach(function (k) { if (!Act.lastLogged["batch" + k]) { Act.lastLogged["batch" + k] = 1; Act.log("send_media", batches[k] + " photos and videos in one send"); } });
  }
  var lastUnread = 0;
  function watchReading() {
    var a = A(); if (!a || !a.unlocked) return;
    var n = a.unreadN || 0;
    if (lastUnread > 0 && n < lastUnread && a.view === "chat") Act.readFrom += lastUnread - n;
    lastUnread = n;
    if (Act.readFrom && n === 0) { Act.log("read", Act.readFrom === 1 ? "1 message" : Act.readFrom + " messages"); Act.readFrom = 0; }
  }

  function dayLabel(t) {
    var d = new Date(t), now = new Date(), y = new Date(); y.setDate(now.getDate() - 1);
    if (d.toDateString() === now.toDateString()) return "today";
    if (d.toDateString() === y.toDateString()) return "yesterday";
    var diff = (now - d) / 864e5;
    if (diff < 6) return d.toLocaleDateString([], { weekday: "long" });
    return d.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short", year: d.getFullYear() === now.getFullYear() ? undefined : "numeric" });
  }
  function hm(t) { return new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); }
  function hm12(t) { return new Date(t).toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true }); }
  function ago(t) {
    var s = Math.max(0, (Date.now() - t) / 1000);
    if (s < 60) return "just now"; if (s < 3600) return Math.round(s / 60) + " min ago"; if (s < 86400) return Math.round(s / 3600) + " h ago";
    var d = Math.round(s / 86400); return d === 1 ? "1 day ago" : d + " days ago";
  }
  function isOnline(side) {
    var a = A(); if (!a) return false;
    var p = a.presence && a.presence[side];
    return !!(p && !p.away);
  }
  function lastSeenOf(side) {
    var a = A(); if (!a) return 0;
    var m = (a.members || {})[side] || {}, list = Act.list(side);
    return Math.max(m.lastSeen || 0, list.length ? list[0].at : 0);
  }
  function seenText(side, short) {
    if (isOnline(side)) return short ? "Online" : "Online now";
    var t = lastSeenOf(side);
    if (!t) return "";
    return "Last seen " + dayLabel(t) + " at " + hm12(t);
  }
  // Chat header line (called by the app's presence renderer every few seconds).
  function presenceLine(remote, zoneTime, status) {
    var a = A(); if (!a || !a.me) return null;
    var o = a.other;
    if (isOnline(o)) return { text: "Online now" + (status ? " · " + status : ""), live: true };
    var s = seenText(o);
    if (!s) return null;
    return { text: s + (zoneTime ? " · their time " + zoneTime : ""), live: false };
  }
  // Home card and chat header get a clear "Online / Last seen" line; both open the activity page.
  function paintSeen() {
    var a = A(); if (!a || !a.unlocked) return;
    var o = a.other, card = document.querySelector("#people .person .grow");
    if (card) {
      var strip = card.querySelector(".seen12");
      if (!strip) { strip = el("button", "seen12"); strip.type = "button"; strip.addEventListener("click", function (e) { e.stopPropagation(); var app = A(); if (app && app.openChat) app.openChat(); }); card.appendChild(strip); }
      var on = isOnline(o), t = lastSeenOf(o), last = Act.list(o)[0];
      var text = on ? "Online now" : t ? seenText(o) : "Not seen yet";
      var sub = !on && last ? (ACT[last.action] || ACT.panel)[0] + (last.detail ? " · " + last.detail : "") : on ? "In The Lees right now" : "";
      var sig = text + "|" + sub + "|" + on;
      if (strip.dataset.sig !== sig) {
        strip.dataset.sig = sig;
        strip.className = "seen12" + (on ? " on" : "");
        strip.innerHTML = '<i class="seen12-dot"></i><span class="seen12-t"></span>' + (sub ? '<span class="seen12-s"></span>' : "") + svg(P.next, "i seen12-chev");
        strip.querySelector(".seen12-t").textContent = text;
        if (sub) strip.querySelector(".seen12-s").textContent = sub;
        strip.setAttribute("aria-label", text + ". Open the chat");
      }
    }
    var pr = document.getElementById("presence");
    if (pr && !pr._v12) { pr._v12 = true; pr.setAttribute("role", "button"); pr.tabIndex = 0; pr.addEventListener("click", function () { openActivity(A().other); }); pr.addEventListener("keydown", function (e) { if (e.key === "Enter") openActivity(A().other); }); }
    if (Activity.open) Activity.paint();
    bothOnlineNotice();
  }
  function bothOnlineNotice() {
    var a = A(); if (!a || !a.me || !a.other || !a.notice || !a.pairId) return;
    if (!isOnline(a.me) || !isOnline(a.other)) return;
    var key = "lees-both-online-" + a.pairId, last = 0;
    try { last = Number(localStorage.getItem(key) || 0); } catch (e) {}
    if (last && Date.now() - last < 30 * 60 * 1000) return;
    try { localStorage.setItem(key, String(Date.now())); } catch (e) {}
    a.notice("You're both online", "");
  }

  /* The activity page: who did what, grouped into sessions (sign-in to sign-out, or a gap of 30 min). */
  var Activity = { open: false, side: null, body: null, paint: function () {} };
  function sessionsOf(list) {
    var asc = list.slice().sort(function (x, y) { return x.at - y.at; }), out = [], cur = null;
    asc.forEach(function (x) {
      if (!cur || x.action === "signin" || x.at - cur.end > 30 * 60000) { cur = { start: x.at, end: x.at, items: [] }; out.push(cur); }
      cur.items.push(x); cur.end = x.at;
      if (x.action === "signout" || x.action === "idle") cur = null;
    });
    return out.reverse();
  }
  function openActivity(side) {
    var a = A(); if (!a) return;
    try { localStorage.setItem("lees-activity-opened-v13", "1"); } catch (e) {}
    try { if (a.renderHome) a.renderHome(); } catch (e) {}
    Activity.side = side || a.other;
    Act.flush(); Act.load();
    a.openPanel("Activity", "Last seen and what happened", Object.assign(function (body) {
      Activity.body = body; Activity.open = true;
      body.classList.add("act12");
      Activity.paint = function () {
        // The panel area is shared by every page: paint only while it is still showing Activity.
        if (!Activity.body || !Activity.body.isConnected || !Activity.body.classList.contains("act12") || document.getElementById("panelTitle").textContent !== "Activity") { Activity.open = false; return; }
        var b = Activity.body, s = Activity.side, a2 = A();
        b.textContent = "";
        var tabs = el("div", "act12-tabs");
        [a2.other, a2.me].forEach(function (sd) {
          var t = btn("act12-tab" + (sd === s ? " on" : ""), "", null, function () { Activity.side = sd; Activity.paint(); });
          t.textContent = sd === a2.me ? "You" : a2.name(sd);
          tabs.appendChild(t);
        });
        b.appendChild(tabs);
        var on = isOnline(s), t = lastSeenOf(s), list = Act.list(s);
        var hero = el("div", "act12-hero" + (on ? " on" : ""));
        var av = el("div", "avatar " + s.toLowerCase(), s === "Lewis" ? "L" : "A");
        var tx = el("div", "act12-htx");
        tx.appendChild(el("small", "", s === a2.me ? "You were last active" : a2.name(s) + (on ? " is" : " was last seen")));
        if (on) tx.appendChild(el("b", "", "Online now"));
        else if (t) {
          tx.appendChild(el("b", "", new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })));
          tx.appendChild(el("span", "act12-date", new Date(t).toLocaleDateString([], { weekday: "long", day: "numeric", month: "long", year: "numeric" }) + " · " + ago(t)));
        } else tx.appendChild(el("b", "", "Not seen yet"));
        if (list[0]) tx.appendChild(el("span", "act12-last", "Last thing: " + (ACT[list[0].action] || ACT.panel)[0].toLowerCase() + (list[0].detail ? " (" + list[0].detail + ")" : "")));
        hero.append(av, tx);
        b.appendChild(hero);
        if (!Act.server) b.appendChild(note("One database update needed", "Run supabase/RUN_THIS_v12.sql once. Until then this page shows only what happened on this phone, and the other side can't see it."));
        var scroller = el("div", "act12-list");
        var sessions = sessionsOf(list);
        if (!sessions.length) { var e = el("div", "act12-empty"); e.append(el("b", "", "Nothing yet"), el("span", "", "Sign-ins, messages, photos, letters, games and pages opened will show here.")); scroller.appendChild(e); }
        sessions.forEach(function (ss, i) {
          var card = el("section", "act12-sess" + (i === 0 ? " first" : ""));
          var head = el("header", "act12-sh");
          var mins = Math.max(1, Math.round((ss.end - ss.start) / 60000));
          var live = i === 0 && on;
          head.append(el("b", "", dayLabel(ss.start).replace(/^./, function (c) { return c.toUpperCase(); })), el("span", "", hm(ss.start) + " – " + (live ? "now" : hm(ss.end)) + " · " + (live ? "in progress" : mins + " min")));
          card.appendChild(head);
          var ol = el("ol", "act12-tl");
          ss.items.slice().reverse().forEach(function (x) {
            var li = el("li", "act12-it k-" + x.action);
            var d = ACT[x.action] || ACT.panel;
            li.innerHTML = '<span class="act12-ic">' + svg(d[1]) + "</span>";
            var w = el("div", "act12-w"); w.appendChild(el("span", "act12-a", d[0] + (x.action === "panel" && x.detail ? ": " + x.detail : "")));
            if (x.detail && x.action !== "panel") w.appendChild(el("small", "", x.detail));
            li.append(w, el("time", "mono", hm(x.at)));
            ol.appendChild(li);
          });
          card.appendChild(ol);
          scroller.appendChild(card);
        });
        scroller.appendChild(el("p", "snote", "You both see each other's activity. It is kept for the newest 600 actions each."));
        b.appendChild(scroller);
      };
      Activity.paint();
    }, { still: true }));
  }
  function note(title, text) { var n = el("div", "v12-note"); n.append(el("b", "", title), el("span", "", text)); return n; }

  /* =====================================================================================================
     2. RESET EVERYTHING + RECENTLY DELETED
     ===================================================================================================== */
  var KEEP_KEYS = /^(pp-last|pp-known|pp-lens|pp-tagline|pp-vibrate|pp-app-theme|pp-theme|pp-remember|pp-fail|v12-guide-on|v12-logins)/;
  function wipeLocal() {
    try {
      var drop = [];
      for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (/^(pp-|v8-|v9-|v10-|v11-|v12-)/.test(k) && !KEEP_KEYS.test(k)) drop.push(k); }
      drop.forEach(function (k) { localStorage.removeItem(k); });
    } catch (e) {}
    Act.local = []; Act.remote = []; Act.live = []; Act.q = [];
  }
  async function removeFiles(paths) {
    var a = A(); if (!a || !a.sb || !paths || !paths.length) return 0;
    var uniq = Array.from(new Set(paths.filter(Boolean))), done = 0;
    var keep = new Set(Object.keys(a.members || {}).map(function (s) { return (a.members[s] || {}).avatar_path; }).filter(Boolean));
    uniq = uniq.filter(function (p) { return !keep.has(p); });
    for (var i = 0; i < uniq.length; i += 100) {
      try { var r = await a.sb.storage.from("media").remove(uniq.slice(i, i + 100)); if (!r.error) done += Math.min(100, uniq.length - i); } catch (e) {}
    }
    return done;
  }
  function openReset() {
    var a = A(); if (!a) return;
    a.openPanel("Reset everything", "For both of you", Object.assign(function (body) {
      body.classList.add("rs12");
      var hero = el("div", "rs12-hero");
      hero.innerHTML = '<span class="rs12-ic">' + svg(P.undo, "i") + "</span>";
      hero.append(el("h3", "", "Start The Lees over"), el("p", "", "Everything you've made together is removed for both of you, for good, and the app goes back to how it was on day one. The guide then shows you both around again."));
      body.appendChild(hero);
      var cols = el("div", "rs12-cols");
      var gone = el("div", "rs12-col gone"), kept = el("div", "rs12-col kept");
      gone.appendChild(el("b", "", "Removed"));
      ["Every message, photo, video and voice note", "Recently deleted (the vault)", "Sealed letters, tic-tac-toe games, trophies", "Journal, notes, scheduled messages, drafts", "Activity and last-seen history", "Moods and statuses"].forEach(function (t) { gone.appendChild(el("span", "", t)); });
      kept.appendChild(el("b", "", "Kept"));
      ["Your accounts and passphrases", "Profile photos", "Names and the lock-screen line", "Themes and your settings"].forEach(function (t) { kept.appendChild(el("span", "", t)); });
      cols.append(gone, kept);
      body.appendChild(cols);
      var form = el("form", "rs12-form"); form.autocomplete = "off";
      var lab = el("label", "rs12-lab", "Type your passphrase to confirm");
      var field = el("div", "rs12-field");
      var inp = el("input", "in"); inp.type = "password"; inp.autocomplete = "current-password"; inp.placeholder = a.name(a.me) + "'s passphrase"; inp.setAttribute("aria-label", "Your passphrase"); inp.id = "rs12Pass";
      var peek = btn("rs12-peek", svg(P.eye), "Show passphrase", function () { inp.type = inp.type === "password" ? "text" : "password"; peek.classList.toggle("on", inp.type === "text"); });
      var ok = el("span", "rs12-ok"); ok.innerHTML = svg(P.check);
      field.append(inp, ok, peek);
      var err = el("p", "rs12-err"); err.setAttribute("role", "alert");
      var go = el("button", "btn wide danger rs12-go", "Reset for both of us"); go.type = "submit"; go.disabled = true;
      inp.addEventListener("input", function () { go.disabled = inp.value.length < 1; err.textContent = ""; field.classList.remove("bad"); });
      form.append(lab, field, err, go);
      body.appendChild(form);
      body.appendChild(el("p", "snote", "Your passphrase is checked on the server. " + a.name(a.other) + " is signed out of nothing; their app resets the moment yours does."));
      form.addEventListener("submit", async function (e) {
        e.preventDefault();
        if (!inp.value) return;
        var sure = await a.confirmAct("Reset everything for both of you?", "This can't be undone. Messages, photos, letters, games and the vault are removed for good.", "Reset");
        if (!sure) return;
        go.disabled = true; go.classList.add("busy"); go.textContent = "Checking passphrase…";
        var r = await a.sb.rpc("factory_reset", { p_pass: inp.value });
        if (r.error) {
          go.disabled = false; go.classList.remove("busy"); go.textContent = "Reset for both of us";
          if (missingFn(r.error)) { err.textContent = "One database update is needed first: run supabase/RUN_THIS_v12.sql once in Supabase."; return; }
          if (/wrong passphrase|28P01/i.test((r.error.message || "") + (r.error.code || ""))) { err.textContent = "That passphrase isn't right. Nothing was removed."; field.classList.remove("bad"); void field.offsetWidth; field.classList.add("bad"); a.haptic("error"); inp.select(); return; }
          err.textContent = "Couldn't reset: " + (r.error.message || "try again") + ". Nothing was removed."; return;
        }
        field.classList.add("good");
        go.textContent = "Removing files…";
        var paths = (r.data || []).map(function (x) { return typeof x === "string" ? x : x && (x.factory_reset || Object.values(x)[0]); });
        await removeFiles(paths);
        try { a.broadcast("reset", { at: Date.now() }); } catch (e2) {}
        await afterReset(true);
      });
      setTimeout(function () { try { inp.focus({ preventScroll: true }); } catch (e3) {} }, 250);
    }, { still: true }));
  }
  // Runs on both phones: drop everything kept on this device, reload, go home, and start the guide.
  var resetting = false;
  async function afterReset(mine) {
    var a = A(); if (!a || resetting) return;
    resetting = true;
    try {
      var at = (a.pairSettings && a.pairSettings.reset_at) || new Date().toISOString();
      wipeLocal();
      LS.set("v12-reset-seen", Date.parse(at) || Date.now());
      LS.del("v12-guide-done-" + a.me);
      Usage.reset();
      await a.reloadAll();
      a.render();
      while (a.view === "panel") { try { a.goBack(); } catch (e) { break; } if (a.view === "panel") await new Promise(function (r) { setTimeout(r, 30); }); else break; }
      if (a.view !== "home") { try { a.goBack(); } catch (e) {} }
      a.renderHome();
      a.notice(mine ? "Everything was reset" : a.name(a.other) + " reset The Lees", mine ? "The Lees is back to day one for both of you." : "Everything was cleared for both of you. Here's the tour again.", { kind: "success", duration: 6000 });
      Act.log("reset");
      setTimeout(function () { if (Guide.enabled()) Guide.start("full"); }, 900);
    } finally { resetting = false; }
  }
  document.addEventListener("lees:remote-reset", function () { afterReset(false); });
  function checkResetFlag() {
    var a = A(); if (!a || !a.unlocked) return;
    var at = a.pairSettings && a.pairSettings.reset_at ? Date.parse(a.pairSettings.reset_at) : 0;
    var seen = LS.get("v12-reset-seen", 0);
    if (at && at > seen + 1000) { if (!seen) { LS.set("v12-reset-seen", at); return; } afterReset(false); }
  }

  // Recently deleted: a toolbar with Restore all and Delete all permanently, added on top of the vault page.
  function vaultToolbar() {
    var a = A(); if (!a || a.view !== "panel") return;
    if (document.getElementById("panelTitle").textContent !== "Recently deleted") return;
    var body = document.getElementById("panelBody");
    if (!body || body.querySelector(".vt12")) return;
    if (/Loading/.test(body.textContent) && body.children.length < 2) return;
    var bar = el("div", "vt12");
    var info = el("div", "vt12-i");
    info.append(el("b", "", "Everything deleted, by either of you"), el("span", "", "Restore puts things back for both of you. Delete for good removes them and their files permanently."));
    var row = el("div", "vt12-row");
    var restore = btn("vt12-b", svg(P.undo) + "<span>Restore all</span>", "Restore everything", async function () {
      if (!(await a.confirmAct("Restore everything?", "Every deleted message, photo and voice note goes back into the conversation for both of you.", "Restore all"))) return;
      restore.disabled = true;
      var r = await a.sb.rpc("trash_restore_all");
      if (r.error && missingFn(r.error)) {
        var l = await a.sb.rpc("trash_list");
        if (!l.error) await a.restoreMany((l.data || []).map(function (x) { return x.id; }), "");
      } else if (r.error) { a.notice("Couldn't restore", r.error.message, { error: true }); restore.disabled = false; return; }
      else { await a.reloadAll(); a.render(); a.notice((r.data || 0) + " restored", "They're back in the conversation for both of you.", { kind: "success" }); }
      if (a.openVault && a.openVault._reload) a.openVault._reload();
    });
    var purge = btn("vt12-b danger", svg(P.trash) + "<span>Delete all for good</span>", "Delete everything permanently", async function () {
      if (!(await a.confirmAct("Delete everything for good?", "Everything in Recently deleted is removed permanently, with its photos, videos and voice notes, for both of you. This can't be undone.", "Delete for good"))) return;
      purge.disabled = true;
      var r = await a.sb.rpc("trash_purge_all");
      if (r.error) { purge.disabled = false; a.notice(missingFn(r.error) ? "One database update needed" : "Couldn't delete", missingFn(r.error) ? "Run supabase/RUN_THIS_v12.sql once in Supabase." : r.error.message, { error: true }); return; }
      var paths = (r.data || []).map(function (x) { return typeof x === "string" ? x : x && Object.values(x)[0]; });
      var n = await removeFiles(paths);
      await a.reloadAll(); a.render();
      a.notice("Deleted for good", (paths.length ? n + " files removed. " : "") + "Recently deleted is empty.", { kind: "success" });
      if (a.openVault && a.openVault._reload) a.openVault._reload();
    });
    row.append(restore, purge);
    bar.append(info, row);
    var old = body.querySelector(".vault-all"); if (old) old.remove();
    var chips = body.querySelector(".v8-chips");
    if (chips) chips.after(bar); else body.prepend(bar);
  }
  new MutationObserver(function () { vaultToolbar(); }).observe(document.documentElement, { childList: true, subtree: true });

  /* =====================================================================================================
     3. LETTERS THAT OPEN THEMSELVES ON THE NEXT LAUNCH
     ===================================================================================================== */
  var letterTimer = 0;
  async function openPendingLetters() {
    var a = A(), F = window.LeesFeatures; if (!a || !a.unlocked || !F || !F._d) return;
    var cards = (a.thread() || []).filter(function (m) { return m.from === a.other && m.kind === "text"; }).map(function (m) { return a.cardOf ? a.cardOf(m.text) : null; }).filter(function (c) { return c && c.t === "letter" && c.onOpen && c.id; });
    if (!cards.length) return;
    var opened = LS.get("v12-onopen-done", []);
    var todo = cards.filter(function (c) { return opened.indexOf(c.id) < 0; });
    if (!todo.length) return;
    var env = (F._d.env || []);
    for (var i = 0; i < todo.length; i++) {
      var c = todo[i], e = env.find(function (x) { return x.id === c.id; });
      if (e && e.openedAt) { opened.push(c.id); continue; }
      var at = e ? e.openAt : Date.parse(c.at);
      if (at > Date.now()) { clearTimeout(letterTimer); letterTimer = setTimeout(openPendingLetters, Math.min(65000, at - Date.now() + 800)); continue; }
      opened.push(c.id); LS.set("v12-onopen-done", opened.slice(-100));
      a.notice(a.name(a.other) + " left you a letter", "It was sealed to open the moment you came in.", { kind: "letter", duration: 3500 });
      Act.log("letter_open", c.title || "");
      setTimeout(function (id) { return function () { F.openLetterById(id); }; }(c.id), 1200);
      break;
    }
    LS.set("v12-onopen-done", opened.slice(-100));
  }

  /* =====================================================================================================
     4. THE GUIDE: spotlight tour, settings switch, smart tips
     ===================================================================================================== */
  function go(where) {
    var a = A(); if (!a) return Promise.resolve();
    return new Promise(function (res) {
      if (where === "home") { if (a.view === "chat" || a.view === "panel") { var n = 0; var step = function () { if (A().view === "home" || n++ > 6) return res(); A().goBack(); setTimeout(step, 80); }; step(); return; } return res(); }
      if (where === "chat") { if (a.view !== "chat") a.openChat(); return setTimeout(res, 380); }
      res();
    });
  }
  // Ordered by how much a day-to-day conversation needs them. "tour" groups let ARTEN and tips run one part.
  var STEPS = [
    { id: "welcome", tour: ["full"], where: "home", title: "Welcome to The Lees", text: "A private place for just the two of you. This short tour shows the essentials first, then the extras. Use Next and Back, or End tour at any time. You can run it again from Settings › Guide & ARTEN." },
    { id: "person", tour: ["full", "chat"], where: "home", target: "#people .person", title: "Your conversation", text: "Tap here to open your chat. The line underneath shows whether they're online now, or exactly when they were last seen and what they did." },
    { id: "compose", tour: ["full", "chat"], where: "chat", target: "#input", title: "Write a message", text: "Type here, then tap Send. Press and hold Send to schedule it for later or add an effect." },
    { id: "send", tour: ["full", "chat"], where: "chat", target: "#send", title: "Send", text: "Sends straight away. For five seconds afterwards you can tap Undo." },
    { id: "mic", tour: ["full", "voice"], where: "chat", target: "#mic", title: "Voice notes", text: "Tap to record, tap the square to stop and listen back, then Send. Transcripts can be switched on in Settings › Privacy." },
    { id: "attach", tour: ["full", "photos"], where: "chat", target: "#footer .lp-plus, #attach", title: "Photos and videos", text: "Tap + then Attach, and pick up to 30 at once. They're sent as one set: one card, one notification, and you can rotate, crop, mark View once or Quiet before sending." },
    { id: "hold", tour: ["full", "chat"], where: "chat", target: "#list .row.theirs .msg, #list .row .msg", title: "Hold a message", text: "Press and hold any message to reply, love, copy, edit, pin, forward or delete it. Double-tap to send a heart." },
    { id: "unread", tour: ["full", "chat"], where: "chat", target: "#list", title: "New messages", text: "New messages stay softly blurred until you've scrolled them fully into view above the message box. Each one you see takes the count down by one." },
    { id: "seen", tour: ["full", "lastseen"], where: "chat", target: "#presence", title: "Online and last seen", text: "Shows Online now, or the exact day and time they were last in the app. Tap it to see everything each of you did, session by session." },
    { id: "back", tour: ["full"], where: "chat", target: "#back", title: "Back to home", text: "Returns to your home screen, where everything else lives." },
    { id: "nudge", tour: ["full", "nudge"], where: "home", target: '.navbtn[data-key="heart"]', title: "Thinking of you", text: "One tap sends a heartbeat to their phone, with a buzz and rising hearts. They can send one straight back." },
    { id: "create", tour: ["full", "letters", "game"], where: "home", target: '.navbtn[data-key="plus"]', title: "Create: letters and games", text: "Seal a letter that opens on a date you choose, or the next time they open the app. Start a live game of tic-tac-toe. Trophies are earned along the way." },
    { id: "journal", tour: ["full", "journal"], where: "home", target: '.navbtn[data-key="book"]', title: "Journal", text: "Shared pages you both write in, with prompts, search and autosave." },
    { id: "bell", tour: ["full", "notifications"], where: "home", target: '.navbtn[data-key="bell"]', title: "Notifications", text: "Everything from the other person in one feed: messages, letters, games, nudges, awards and journal entries." },
    { id: "media", tour: ["full", "media"], where: "home", target: '.navbtn[data-key="image"]', title: "Media, moments, calendar, archive", text: "Every photo and video by month, pinned moments, a calendar of your days together, and older messages you archived." },
    { id: "shield", tour: ["full", "shield"], where: "home", target: '.navbtn[data-key="shield"]', title: "Shield", text: "Blurs the whole conversation when someone is looking over your shoulder. Hold a message to peek." },
    { id: "extras", tour: ["full"], where: "home", target: ".hx9", title: "Your day at a glance", text: "Streak, moods, today's question, closeness, the best time to talk and memories from this day." },
    { id: "settings", tour: ["full", "settings", "reset"], where: "home", target: ".settings-main", title: "Settings", text: "Themes, sounds, privacy, passphrase and locks, backups, Recently deleted and Reset everything. There's a search at the top." },
    { id: "arten", tour: ["full", "arten"], where: "home", target: "#ar12Fab", title: "Meet ARTEN", text: "The flower in the corner is ARTEN, your guide. Ask it anything about The Lees. It answers, and can show you how or take you straight there." }
  ];
  var Guide = {
    on: false, list: [], i: 0, layer: null, card: null, ring: null, name: "",
    enabled: function () { return LS.get("v12-guide-on", true) !== false; },
    setEnabled: function (v) { LS.set("v12-guide-on", !!v); },
    start: async function (name, opts) {
      var a = A(); if (!a || !a.unlocked) return;
      this.stop(true);
      this.name = name || "full";
      this.list = STEPS.filter(function (s) { return s.tour.indexOf(Guide.name) >= 0; });
      if (opts && opts.extra) this.list = this.list.concat(opts.extra);
      if (!this.list.length) return;
      this.i = 0; this.on = true;
      try { if (Arten.isOpen()) await Arten.close(); } catch (e) {}
      this.build();
      await this.show();
      Act.log("guide", this.name === "full" ? "Full tour" : this.name);
    },
    build: function () {
      var lay = el("div", "gd12"); lay.setAttribute("role", "dialog"); lay.setAttribute("aria-modal", "true"); lay.setAttribute("aria-live", "polite");
      var ring = el("div", "gd12-ring"), card = el("div", "gd12-card");
      lay.append(ring, card);
      lay.addEventListener("click", function (e) { if (e.target === lay) Guide.pulse(); });
      document.body.appendChild(lay);
      this.layer = lay; this.ring = ring; this.card = card;
      this.key = function (e) { if (!Guide.on) return; if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); Guide.stop(); } else if (e.key === "ArrowRight") Guide.next(); else if (e.key === "ArrowLeft") Guide.back(); };
      document.addEventListener("keydown", this.key, true);
      this.onResize = function () { Guide.place(); };
      addEventListener("resize", this.onResize);
      requestAnimationFrame(function () { lay.classList.add("v12-in"); });
    },
    pulse: function () { if (!this.card) return; this.card.classList.remove("nudge"); void this.card.offsetWidth; this.card.classList.add("nudge"); },
    target: function () {
      var s = this.list[this.i]; if (!s || !s.target) return null;
      var parts = s.target.split(","), n = null;
      for (var k = 0; k < parts.length && !n; k++) { var all = document.querySelectorAll(parts[k].trim()); for (var j = all.length - 1; j >= 0; j--) { var r = all[j].getBoundingClientRect(); if (r.width && r.height) { n = all[j]; break; } } }
      return n;
    },
    show: async function () {
      var s = this.list[this.i]; if (!s) return this.stop();
      if (s.where) await go(s.where);
      if (s.before) { try { await s.before(); } catch (e) {} }
      var t = this.target();
      if (t && t.scrollIntoView) { var r = t.getBoundingClientRect(); if (r.top < 60 || r.bottom > innerHeight - 40) t.scrollIntoView({ block: "center", behavior: reduce() ? "auto" : "smooth" }); }
      var c = this.card; c.textContent = "";
      c.classList.remove("swap"); void c.offsetWidth; c.classList.add("swap");
      var top = el("div", "gd12-top");
      var mark = el("span", "gd12-mark"); mark.innerHTML = svg(P.spark);
      top.append(mark, el("span", "gd12-step mono", "Step " + (this.i + 1) + " of " + this.list.length));
      var x = btn("gd12-x", svg(P.close), "End tour", function () { Guide.stop(); });
      top.appendChild(x);
      var h = el("h3", "gd12-t", s.title), p = el("p", "gd12-p", s.text);
      var dots = el("div", "gd12-dots");
      for (var k = 0; k < this.list.length; k++) { var d = el("i", k < this.i ? "done" : k === this.i ? "on" : ""); dots.appendChild(d); }
      var bar = el("div", "gd12-bar");
      var end = btn("gd12-end", "End tour", null, function () { Guide.stop(); });
      var back = btn("gd12-btn ghost", svg(P.back) + "<span>Back</span>", "Back", function () { Guide.back(); });
      back.disabled = this.i === 0;
      var last = this.i === this.list.length - 1;
      var nx = btn("gd12-btn", "<span>" + (last ? "Finish" : "Next") + "</span>" + svg(last ? P.check : P.next), last ? "Finish" : "Next", function () { Guide.next(); });
      bar.append(end, el("span", "grow"), back, nx);
      c.append(top, h, p, dots, bar);
      this.place();
      setTimeout(function () { Guide.place(); }, 420);
      try { nx.focus({ preventScroll: true }); } catch (e) {}
    },
    place: function () {
      if (!this.on || !this.card) return;
      var t = this.target(), ring = this.ring, card = this.card, vw = innerWidth, vh = innerHeight, pad = 8;
      var cw = Math.min(360, vw - 32); card.style.width = cw + "px";
      var ch = card.offsetHeight || 220;
      if (!t) {
        ring.classList.add("none");
        ring.style.cssText = "left:" + (vw / 2) + "px;top:" + (vh / 2) + "px;width:0;height:0";
        card.style.left = Math.round((vw - cw) / 2) + "px"; card.style.top = Math.round((vh - ch) / 2) + "px";
        card.dataset.side = "center";
        return;
      }
      ring.classList.remove("none");
      var r = t.getBoundingClientRect();
      var big = r.height > vh * 0.6;
      var L = Math.max(6, r.left - pad), T = Math.max(6, r.top - pad), W = Math.min(vw - 12, r.width + pad * 2), H = big ? Math.min(vh * 0.5, r.height) : r.height + pad * 2;
      if (big) T = Math.max(6, r.top + 10);
      ring.style.cssText = "left:" + L + "px;top:" + T + "px;width:" + W + "px;height:" + H + "px;border-radius:" + (Math.min(W, H) > 120 ? 22 : Math.min(28, Math.min(W, H) / 2 + 4)) + "px";
      var below = T + H + 14, above = T - 14 - ch, top;
      if (big) top = Math.min(vh - ch - 16, T + H + 14 < vh - ch - 16 ? T + H + 14 : vh - ch - 16);
      else if (below + ch < vh - 12) { top = below; card.dataset.side = "below"; }
      else if (above > 12) { top = above; card.dataset.side = "above"; }
      else { top = Math.max(12, vh - ch - 16); card.dataset.side = "over"; }
      var left = Math.min(vw - cw - 16, Math.max(16, r.left + r.width / 2 - cw / 2));
      card.style.left = Math.round(left) + "px"; card.style.top = Math.round(top) + "px";
      card.style.setProperty("--ax", Math.round(Math.min(cw - 24, Math.max(24, r.left + r.width / 2 - left))) + "px");
    },
    next: function () { if (this.i < this.list.length - 1) { this.i++; this.show(); } else this.finish(); },
    back: function () { if (this.i > 0) { this.i--; this.show(); } },
    finish: function () {
      var a = A();
      if (this.name === "full" && a) LS.set("v12-guide-done-" + a.me, Date.now());
      this.stop();
      if (a) a.notice("You're all set", this.name === "full" ? "Ask ARTEN, the flower in the corner, whenever you need help." : "Ask ARTEN if you'd like to see anything else.", { kind: "success" });
    },
    stop: function (silent) {
      if (!this.layer) { this.on = false; return; }
      var a = A();
      if (!silent && this.name === "full" && a) LS.set("v12-guide-done-" + a.me, LS.get("v12-guide-done-" + a.me, 0) || Date.now());
      document.removeEventListener("keydown", this.key, true);
      removeEventListener("resize", this.onResize);
      var lay = this.layer; this.layer = null; this.on = false;
      lay.classList.remove("v12-in"); lay.classList.add("out");
      setTimeout(function () { lay.remove(); }, 260);
    }
  };

  /* Smart tips: each sign-in is counted. A feature you still haven't used after two sign-ins gets one card
     (one per sign-in, most important first) with "Show me" (runs that part of the guide) or "Not now". */
  var FEATURES = [
    { k: "open_chat", tour: "chat", title: "Your conversation", text: "Tap the card with their name to open your chat." },
    { k: "send_voice", tour: "voice", title: "Send a voice note", text: "Tap the microphone in the chat to record. You can listen back before sending." },
    { k: "send_media", alt: ["send_photo", "send_video"], tour: "photos", title: "Send photos as one set", text: "Pick many photos at once and they arrive as one card, with one notification." },
    { k: "nudge", tour: "nudge", title: "Thinking of you", text: "One tap sends a heartbeat and rising hearts to their phone." },
    { k: "letter", tour: "letters", title: "Seal a letter", text: "Write something that opens on a date you choose, or the next time they open the app." },
    { k: "journal", tour: "journal", title: "The shared journal", text: "A place to write longer things together, with prompts." },
    { k: "game", tour: "game", title: "Play tic-tac-toe", text: "A live game with a 10-second clock and chat." },
    { k: "media", tour: "media", title: "All your photos", text: "Every photo and video, by month, in one place." },
    { k: "notifications", tour: "notifications", title: "Notifications", text: "Everything from the other person in one feed." },
    { k: "arten", tour: "arten", title: "Ask ARTEN", text: "Ask the flower in the corner anything about The Lees." }
  ];
  var Usage = {
    key: function () { var a = A(); return "v12-usage-" + (a && a.me); },
    all: function () { return LS.get(this.key(), {}); },
    mark: function (k) { var u = this.all(); if (u[k]) return; u[k] = Date.now(); LS.set(this.key(), u); },
    reset: function () { LS.del(this.key()); var a = A(); LS.set("v12-logins-" + (a && a.me), 0); LS.del("v12-tips-" + (a && a.me)); },
    logins: function () { var a = A(); return LS.get("v12-logins-" + (a && a.me), 0); },
    bump: function () { var a = A(); var n = this.logins() + 1; LS.set("v12-logins-" + (a && a.me), n); return n; },
    used: function (f) { var u = this.all(); return !!(u[f.k] || (f.alt || []).some(function (x) { return u[x]; })); }
  };
  function maybeTip() {
    var a = A(); if (!a || !a.unlocked || !Guide.enabled() || Guide.on || Arten.isOpen()) return;
    if (Usage.logins() < 3) return; // the third sign-in is the first after two without using it
    var tips = LS.get("v12-tips-" + a.me, {});
    var f = FEATURES.find(function (x) { var t = tips[x.k] || {}; return !Usage.used(x) && !t.never && (!t.at || Usage.logins() - (t.login || 0) >= 2); });
    if (!f) return;
    tips[f.k] = { at: Date.now(), login: Usage.logins(), never: false }; LS.set("v12-tips-" + a.me, tips);
    var card = el("div", "tip12"); card.setAttribute("role", "status");
    var ic = el("span", "tip12-ic"); ic.innerHTML = svg(P.spark);
    var tx = el("div", "tip12-tx"); tx.append(el("small", "mono", "Tip from ARTEN"), el("b", "", f.title), el("span", "", f.text));
    var row = el("div", "tip12-row");
    var close = function () { card.classList.add("out"); setTimeout(function () { card.remove(); }, 240); };
    row.append(btn("tip12-b primary", "Show me", null, function () { close(); Guide.start(f.tour); }), btn("tip12-b", "Not now", null, close), btn("tip12-b quiet", "Don't suggest this", null, function () { tips[f.k].never = true; LS.set("v12-tips-" + a.me, tips); close(); }));
    tx.appendChild(row);
    card.append(ic, tx, btn("tip12-x", svg(P.close), "Close", close));
    document.body.appendChild(card);
    requestAnimationFrame(function () { card.classList.add("v12-in"); });
    setTimeout(function () { if (card.isConnected) close(); }, 20000);
  }

  /* =====================================================================================================
     5. ARTEN
     ===================================================================================================== */
  // Knowledge: every feature, the words people use for it, a full answer, and where "Take me there" goes.
  var KB = [
    { id: "send", title: "Sending a message", kw: "send message text write type chat reply talk say", q: ["how do i send a message", "how to text", "write to her", "write to him"], tour: "chat", go: "chat",
      a: "Open the conversation from the card with their name on the home screen. Type in the box at the bottom and tap Send (the paper plane). On a keyboard, Enter sends and Shift+Enter starts a new line.", steps: ["Home › tap their name", "Type in the message box", "Tap Send"], more: "Press and hold Send to schedule the message for later. For five seconds after sending you can tap Undo." },
    { id: "photos", title: "Photos and videos as one set", kw: "photo photos picture pictures image images video videos attach gallery camera stack set album batch many multiple send", q: ["send many photos", "send photos at once", "why do i get many notifications for photos", "stacked photos"], tour: "photos", go: "attach",
      a: "In the chat, tap + and then Attach, and pick as many photos and videos as you like, up to 30. They open in a preview where you can swipe between them, rotate, flip, crop, choose HD, mark View once or Quiet, and add one caption. Send delivers them as one set: one album card in the chat and one notification on their phone, not one per photo.", steps: ["Open the chat", "Tap + and choose photos or videos", "Adjust any of them, add a caption", "Tap Send once"], more: "Tap the album in the chat to see every photo full size. Each one can be loved, replied to, saved, shared or forwarded on its own." },
    { id: "voice", title: "Voice notes", kw: "voice note record recording audio mic microphone speak listen transcript transcribe", q: ["record a voice note", "send audio"], tour: "voice", go: "mic",
      a: "In the chat, tap the microphone to start recording. Tap the square to stop and listen back (you can drag along the waveform and change speed), then tap Send. Or tap the plane while recording to send at once.", steps: ["Open the chat", "Tap the microphone", "Tap the square to stop", "Listen, then Send"], more: "If the microphone is blocked, The Lees shows a short how-to for your browser. Transcripts can be switched on in Settings › Privacy." },
    { id: "lastseen", title: "Online and last seen", kw: "last seen online offline active status presence time date hour", q: ["when were they last online", "when was she last online", "when was he last online", "are they online now", "show last seen", "last seen today", "online now status", "what time were they last seen"], tour: "lastseen", go: "activity",
      a: "Online shows only after about 3 seconds of activity, and only while they have been active in the last 5 minutes. After that The Lees shows Last seen with a 12-hour time, such as Last seen today at 3:42 PM, Last seen yesterday at 9:05 AM, or Last seen Mon 12 Nov at 9:05 PM. The line under their name on the home card opens the chat. If you are both online, each of you sees You're both online once every 30 minutes.", steps: ["Look under their name on the home card", "Tap that line to open the chat"] },
    { id: "activity", title: "Activity", kw: "activity session sessions actions what did doing history list did they do page opened", q: ["what did they do", "see activity", "open activity", "what are they doing", "activity list", "their activity history", "what did she do today", "show me their sessions"], tour: "lastseen", go: "activity",
      a: "The ACTIVITY button sits on the top right of the chat card on the home screen. It opens Activity: every session, newest first, up to the last 600 actions. Switch between them and you at the top. The list scrolls. The chat header line also opens Activity.", steps: ["Home", "Tap ACTIVITY on their card", "Scroll the list"] },
    { id: "unread", title: "The unread line", kw: "unread new messages blur blurred read count badge seen", q: ["why are messages blurred", "how do messages get marked read"], tour: "chat", go: "chat",
      a: "New messages arrive softly blurred. A message counts as read once the whole card is in view above the message box. Then the blur lifts and the count drops by one. A set of photos counts as one message. Scrolling to the very bottom reads everything." },
    { id: "hold", title: "Reply, love, edit or delete", kw: "reply love heart like edit delete remove copy pin forward react reaction emoji long press hold double tap", q: ["how to reply", "how to delete a message", "how to like a message", "edit a message"], tour: "chat", go: "chat",
      a: "Press and hold any message for its menu: Reply, Love, Copy, Edit (your own), Pin to moments, Forward, Blur, and Delete for you or for both. Double-tap a message to send a heart. Deleted messages go to Recently deleted, where they can be restored." },
    { id: "letters", title: "Sealed letters", kw: "letter letters sealed seal envelope capsule time future open later surprise write compose", q: ["write a letter", "send a letter that opens later", "letter that opens when she opens the app", "how do i seal a letter", "where are sealed letters", "open a sealed letter", "new sealed letter", "envelope for later"], tour: "letters", go: "letters",
      a: "Home › Create › Sealed letters › New. Write the letter, choose a wax seal and paper, then choose when it can be opened: a date and time, a quick choice like Tomorrow morning, or When they next open the app. With that last one the letter opens itself, full screen, the moment they come in.", steps: ["Home › Create", "Sealed letters › New letter", "Write, then choose when it opens", "Seal and send"], more: "They see the envelope straight away, and a live countdown until it can be opened. You can read and edit your letter until then." },
    { id: "letterdelete", title: "Delete a sealed letter", kw: "delete remove hide select withdraw withdrawn letters letter sealed both checkbox", q: ["delete a sealed letter", "remove a letter from my side", "delete for both", "delete for me", "select letters", "delete all letters", "remove from your letters", "withdraw a letter i sent"], go: "letters",
      a: "Open Sealed letters and tap Select. Tick the letters in the current tab, then Delete selected or Delete all. A letter you received can only be removed from your side. A letter you sent can be deleted for you or for both, and Delete for both removes it for your partner too. The chat card then says Letter removed.", steps: ["Sealed letters", "Tap Select", "Choose Delete selected or Delete all"] },
    { id: "game", title: "Tic-tac-toe", kw: "game games play tic tac toe noughts crosses challenge match", q: ["play a game", "start tic tac toe"], tour: "game", go: "game",
      a: "Home › Create › Tic-tac-toe, or Settings › Letters, games & awards. Invite them; once they join, each move has a 10-second clock. There's a chat and quick replies during the game, and a rematch button at the end." },
    { id: "nudge", title: "Thinking of you", kw: "thinking nudge heartbeat miss love ping buzz hearts", q: ["send thinking of you", "nudge her"], tour: "nudge", go: "nudge",
      a: "On the home screen tap Thinking of you. Their phone gets a heartbeat buzz, rising hearts and a card to send one back. You can send one a minute." },
    { id: "journal", title: "Journal", kw: "journal diary write entry entries notes prompt pages page", q: ["write in the journal", "open the journal", "how do i add a journal page", "where is the diary", "journal prompts", "search the journal", "edit a journal page", "shared journal"], tour: "journal", go: "journal",
      a: "Home › Journal. Tap + to write a page; there are prompts if you're stuck, and it saves as you type. Search and filters are at the top. You both see every page." },
    { id: "stickers", title: "Stickers", kw: "sticker stickers emoji reaction send sticker luck congrats cuddle sparkle rainy", q: ["send a sticker", "where are stickers", "open the sticker picker", "how do i send stickers", "good luck sticker", "sticker menu", "emoji stickers", "more stickers"], go: "stickers",
      a: "In the chat, tap + and choose Stickers & emoji. The grid shows every sticker, including Good luck, Congrats, Cuddle, Rainy day and Sparkle. Tap one to send it. If reduced motion is on, the sticker stays still with no particles." },
    { id: "idle", title: "Idle sign-out", kw: "idle inactive inactivity timeout signout warning countdown minutes automatic autosign", q: ["will i be signed out if i leave it", "still there warning", "idle sign out", "signed out after 5 minutes", "inactivity limit", "why was i signed out", "30 second warning", "auto sign out"], go: null,
      a: "After 5 minutes with no taps, keys or scrolling, The Lees asks Still there? and counts down 30 seconds. Cancel, or any tap, key or scroll, keeps you signed in and starts the 5 minutes again. Sign out, or doing nothing until the countdown ends, signs you out and locks the app. Coming back after the app was hidden for more than 5 minutes shows the same warning. It does not sign you out instantly. The unsend window is unchanged." },
    { id: "facts", title: "Partner facts", kw: "partner facts fact know about favourite favorite boyfriend girlfriend husband wife remember note things name", q: ["what do you know about my partner", "whats my partners name", "remember that she likes sushi", "note that he likes running", "things we know", "facts about her", "what does my partner like", "tell me about them"], go: "facts",
      a: "Ask me what I know about your partner and I'll say their name first, then up to five facts you saved. Say remember that she likes sushi, or note that he likes running, and I'll keep it for this pair. Settings › Things we know is where you add, read and delete your own facts. There is no separate things-I-like list; facts live here. I can also mention a line from their journal." },
    { id: "history", title: "Chat history", kw: "history arten conversations clock past questions earlier asked", q: ["show chat history", "arten history", "what did i ask you", "past questions", "open chat history", "clock history", "previous conversation with arten", "see earlier questions"], go: null,
      a: "In the ARTEN panel, the clock button labelled Chat history opens a full-screen list. Each row is the date and time and the first question, cut at 80 characters. Tap a row to read that whole conversation. History lasts for this sign-in only. Signing out or locking clears it." },
    { id: "notifications", title: "Notifications", kw: "notifications alerts bell feed sound buzz mute quiet push telegram", q: ["turn off notifications", "mute", "why so many notifications"], tour: "notifications", go: "notifications",
      a: "Home › Notifications shows everything from the other person in one feed. To silence alerts, go to Settings › Notifications › Mute (8 hours or a week). Photos sent together make a single alert. A message sent as Quiet arrives without any sound." },
    { id: "media", title: "Media", kw: "media gallery photos videos voice notes all pictures month save download", q: ["see all photos", "find a photo"], tour: "media", go: "media",
      a: "Home › Media shows every photo and video by month and every voice note in a list. Open one to swipe through, save it, pin it as a moment or delete it." },
    { id: "calendar", title: "Calendar", kw: "calendar day days date history month heat", q: ["what did we say on a day"], tour: "media", go: "calendar",
      a: "Home › Calendar colours each day by how much you talked, with dots for photos, journal pages and letters. Tap a day to see that day's messages, or swipe between months." },
    { id: "moments", title: "Moments", kw: "moments pin pinned favourite favorite save star", q: ["pin a message"], go: "moments",
      a: "Hold a message and choose Pin to moments. Home › Moments collects them all." },
    { id: "archive", title: "Archive", kw: "archive archived old hide older", q: [], go: "archive",
      a: "Home › Archive holds messages you archived. Settings › Messages & data can archive older messages automatically after a number of days." },
    { id: "shield", title: "Shield", kw: "shield hide blur privacy someone looking screen private", q: ["hide the chat"], tour: "shield", go: "shield",
      a: "Tap Shield on the home screen (or the shield at the top of the chat) to blur the whole conversation. Hold a message to peek. Tap it again to turn it off." },
    { id: "theme", title: "Themes and chat look", kw: "theme themes colour color dark light wallpaper bubble font size look appearance", q: ["change theme", "dark mode", "change wallpaper"], go: "look",
      a: "Settings › Appearance changes the app theme (yours only) and the shared chat theme. In the chat, the palette button at the top opens the style studio: themes, wallpaper from your phone with brightness and blur, bubble shapes, text size and corners." },
    { id: "passphrase", title: "Passphrase and sign-in", kw: "passphrase password change forgot recovery sign in login lock pin chat lock", q: ["change my password", "forgot passphrase"], go: "security",
      a: "Settings › Security & sign-in › Change passphrase. If you forget it, tap Forgot passphrase? on the sign-in screen and answer your two recovery questions. You can also add a chat lock there." },
    { id: "switch", title: "Signing in as the right person", kw: "switch account side mr mrs who sign in as role position other person", q: ["switch account", "sign in as mrs lees"], go: null,
      a: "On the sign-in screen, the two cards at the top choose who is signing in. The highlighted card (with the tick) is who the passphrase is for, and the field says whose passphrase it wants. Tap the other card to switch." },
    { id: "deleted", title: "Recently deleted", kw: "recently deleted restore undelete recover trash bin vault deleted permanently", q: ["restore a deleted message", "empty the bin", "delete permanently"], go: "vault",
      a: "Settings › Messages & data › Recently deleted. Everything either of you deleted is kept there. Restore one, Restore all (it goes back for both of you), or Delete all for good, which also removes the files permanently." },
    { id: "reset", title: "Reset everything", kw: "reset factory start over wipe everything clear all fresh default erase restart", q: ["reset the app", "delete everything", "start over"], tour: "reset", go: "reset",
      a: "Settings › Messages & data › Reset everything. Type your passphrase (it's checked on the server) and confirm. Every message, photo, letter, game, trophy, journal page, activity and the vault are removed for both of you. Accounts, passphrases and profile photos stay. Afterwards the guide shows you both around again.", more: "To remove only the conversation, use Clear conversation instead. It can be undone from Recently deleted." },
    { id: "clear", title: "Clear conversation", kw: "clear conversation delete messages range wipe chat", q: ["clear the chat"], go: "clear",
      a: "Settings › Messages & data › Clear conversation. Choose just for you or for both, and all time or a range of dates. A clear for both can be undone from Recently deleted." },
    { id: "schedule", title: "Send later", kw: "schedule later scheduled timer send later effect", q: ["schedule a message"], tour: "chat", go: "chat",
      a: "Type a message, then press and hold Send. Choose a time (and an effect if you like). Scheduled messages show as a chip at the top of the chat, where you can send now or cancel." },
    { id: "backup", title: "Backup and export", kw: "backup export download save print pdf restore file", q: ["back up our chat"], go: "data",
      a: "Settings › Messages & data has Export, an encrypted Backup and Restore from backup." },
    { id: "mood", title: "Moods and today's question", kw: "mood feeling question daily streak closeness best time on this day", q: ["share my mood"], go: "home",
      a: "On the home screen, in the column under Settings: Streak, Mood (share how you feel, they're told at once), Today's question, Closeness, the Best time to talk, and On this day memories." },
    { id: "guide", title: "The guide", kw: "guide tour help tutorial walkthrough onboarding show how learn tips turn off", q: ["show me around", "start the tour", "turn off tips"], tour: "full", go: "help",
      a: "Settings › Guide & ARTEN › Take the tour runs the whole walkthrough, most important first. The Guide switch turns the tour and tips on or off (it's on by default). When the app is reset, the tour starts again by itself." },
    { id: "arten", title: "About ARTEN", kw: "arten flower who are you assistant help bot", q: ["who are you", "what can you do"], tour: "arten",
      a: "I'm ARTEN, the guide built into The Lees. I know every part of the app. Ask me how to do something and I'll explain it, then Show me walks you through it on screen, and Take me there opens it. I work on your phone, so nothing you type here is sent anywhere." }
  ];
  var SYN = { pic: "photo", pics: "photos", picture: "photo", pictures: "photos", image: "photo", images: "photos", img: "photo", vid: "video", vids: "videos", clip: "video",
    text: "message", texts: "messages", msg: "message", msgs: "messages", dm: "message", talk: "message", chat: "message", pw: "passphrase", password: "passphrase", pass: "passphrase", pin: "passphrase",
    bin: "deleted", trash: "deleted", recycle: "deleted", undelete: "restore", recover: "restore", erase: "reset", wipe: "reset", factory: "reset", fresh: "reset", restart: "reset",
    online: "seen", offline: "seen", active: "seen", activity: "seen", lastseen: "seen", status: "seen", recording: "voice", audio: "voice", vn: "voice", mic: "voice",
    notif: "notifications", notification: "notifications", alert: "notifications", alerts: "notifications", noti: "notifications", ttt: "game", xo: "game",
    dark: "theme", colour: "theme", color: "theme", wallpaper: "theme", her: "partner", him: "partner", she: "partner", he: "partner", wife: "partner", husband: "partner",
    boyfriend: "partner", girlfriend: "partner", favourite: "favorite", favorite: "favorite", fact: "facts", facts: "facts",
    sticker: "stickers", emoji: "stickers", idle: "idle", inactivity: "idle", timeout: "idle", autosign: "idle",
    tutorial: "guide", tour: "guide", walkthrough: "guide", help: "guide", stack: "photos", stacked: "photos", album: "photos", batch: "photos", many: "photos" };
  var STOP = { a: 1, an: 1, the: 1, i: 1, to: 1, do: 1, does: 1, how: 1, can: 1, my: 1, me: 1, is: 1, it: 1, of: 1, in: 1, on: 1, for: 1, and: 1, or: 1, what: 1, where: 1, why: 1, when: 1, you: 1, your: 1, we: 1, our: 1, us: 1, be: 1, are: 1, there: 1, this: 1, that: 1, with: 1, at: 1, from: 1, please: 1, want: 1, would: 1, like: 1, could: 1, should: 1, get: 1, make: 1, use: 1, using: 1, app: 1, lees: 1 };
  function stem(w) { if (w.length > 5 && /ing$/.test(w)) return w.slice(0, -3); if (w.length > 4 && /ed$/.test(w)) return w.slice(0, -2); if (w.length > 3 && /s$/.test(w) && !/ss$/.test(w)) return w.slice(0, -1); return w; }
  function toks(s) { return String(s || "").toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9 ]+/g, " ").split(/\s+/).filter(Boolean); }
  function near(a, b) {
    if (a === b) return true; if (a.length < 4 || b.length < 4 || Math.abs(a.length - b.length) > 1) return false;
    var i = 0, j = 0, d = 0;
    while (i < a.length && j < b.length) { if (a[i] === b[j]) { i++; j++; continue; } if (++d > 1) return false; if (a.length > b.length) i++; else if (b.length > a.length) j++; else { i++; j++; } }
    return d + (a.length - i) + (b.length - j) <= 1;
  }
  var INDEX = KB.map(function (e) {
    var words = toks(e.kw + " " + e.title).map(stem), qs = e.q.map(function (q) { return toks(q).filter(function (w) { return !STOP[w]; }).map(stem); });
    return { e: e, words: words, qs: qs, titleW: toks(e.title).map(stem) };
  });
  function search(question) {
    var raw = toks(question), q = [];
    raw.forEach(function (w) { if (STOP[w]) return; var s = SYN[w] || w; q.push(stem(s)); if (SYN[w]) q.push(stem(w)); });
    if (!q.length) return [];
    var res = INDEX.map(function (ix) {
      var s = 0, hit = 0;
      q.forEach(function (w) {
        var best = 0;
        if (ix.titleW.indexOf(w) >= 0) best = 3;
        else if (ix.words.indexOf(w) >= 0) best = 2;
        else if (ix.words.some(function (x) { return near(x, w) || (w.length > 4 && x.indexOf(w) === 0) || (x.length > 4 && w.indexOf(x) === 0); })) best = 1.2;
        if (best) hit++;
        s += best;
      });
      ix.qs.forEach(function (pq) { var m = pq.filter(function (w) { return q.indexOf(w) >= 0; }).length; if (pq.length && m / pq.length >= 0.6) s += 3 * m / pq.length; });
      s *= 0.6 + 0.4 * (hit / q.length);
      return { e: ix.e, s: s };
    }).filter(function (x) { return x.s > 1.1; }).sort(function (x, y) { return y.s - x.s; });
    return res;
  }
  function goTo(where) {
    var a = A(); if (!a) return;
    var F = window.LeesFeatures;
    var map = {
      chat: function () { a.openChat(); }, attach: function () { a.openChat(); setTimeout(function () { var b = document.querySelector("#footer .lp-plus") || document.getElementById("attach"); if (b) b.classList.add("gd12-glow"); }, 400); },
      mic: function () { a.openChat(); setTimeout(function () { var b = document.getElementById("mic"); if (b) b.classList.add("gd12-glow"); }, 400); },
      activity: function () { openActivity(a.other); }, letters: function () { if (F) F.openLetters(); }, game: function () { if (F) F.openGame(); },
      nudge: function () { go("home").then(function () { var b = document.querySelector('.navbtn[data-key="heart"]'); if (b) b.classList.add("gd12-glow"); }); },
      journal: function () { a.openJournal(); }, notifications: function () { a.openNotifications(); }, media: function () { a.openMedia(); }, calendar: function () { a.openCalendar(); },
      moments: function () { a.openMoments(); }, archive: function () { a.openArchive(); }, shield: function () { go("home").then(function () { var b = document.querySelector('.navbtn[data-key="shield"]'); if (b) b.classList.add("gd12-glow"); }); },
      look: function () { a.openSettingsCategory("look"); }, security: function () { a.openSettingsCategory("security"); }, data: function () { a.openSettingsCategory("data"); },
      vault: function () { a.openVault(); }, reset: function () { openReset(); }, clear: function () { if (window.LeesV9 && LeesV9.openClear) LeesV9.openClear(); else a.openSettingsCategory("data"); },
      help: function () { a.openSettingsCategory("help"); }, home: function () { go("home"); },
      stickers: function () { a.openChat(); setTimeout(function () { if (window.LeesV9 && LeesV9.openPicker) LeesV9.openPicker(); }, 280); },
      facts: function () { openFacts(); }
    };
    if (map[where]) map[where]();
  }
  document.addEventListener("animationend", function (e) { if (e.target.classList && e.target.classList.contains("gd12-glow") && e.animationName === "gd12glow") e.target.classList.remove("gd12-glow"); }, true);

  // The flower: drawn here (no image file), then animated by the warp renderer from the ARTEN kit:
  // slow clockwise spin, spikes breathing in and out on a steady rhythm, soft rings on each breath.
  function flowerSource(S) {
    var c = document.createElement("canvas"); c.width = c.height = S;
    var x = c.getContext("2d"), h = S / 2;
    x.translate(h, h);
    // Pointed petals (the spikes) in three rings, light at the tips, darker towards the heart.
    function petals(n, rOut, rIn, width, rot, l0, l1) {
      for (var i = 0; i < n; i++) {
        x.save(); x.rotate(rot + i * Math.PI * 2 / n);
        var g = x.createLinearGradient(rIn, 0, rOut, 0);
        g.addColorStop(0, "rgb(" + l0 + "," + l0 + "," + l0 + ")"); g.addColorStop(0.65, "rgb(" + l1 + "," + l1 + "," + l1 + ")"); g.addColorStop(1, "rgb(" + Math.min(255, l1 + 20) + "," + Math.min(255, l1 + 20) + "," + Math.min(255, l1 + 20) + ")");
        x.fillStyle = g;
        x.beginPath(); x.moveTo(rIn, 0);
        x.bezierCurveTo(rIn + (rOut - rIn) * 0.25, -width, rIn + (rOut - rIn) * 0.7, -width * 0.9, rOut, 0);
        x.bezierCurveTo(rIn + (rOut - rIn) * 0.7, width * 0.9, rIn + (rOut - rIn) * 0.25, width, rIn, 0);
        x.closePath(); x.fill();
        x.strokeStyle = "rgba(0,0,0,.18)"; x.lineWidth = S / 360; x.stroke();
        x.strokeStyle = "rgba(255,255,255,.35)"; x.lineWidth = S / 500; x.beginPath(); x.moveTo(rIn + (rOut - rIn) * 0.15, 0); x.lineTo(rOut * 0.93, 0); x.stroke();
        x.restore();
      }
    }
    petals(16, h * 0.99, h * 0.12, h * 0.15, 0, 120, 235);
    petals(16, h * 0.78, h * 0.1, h * 0.14, Math.PI / 16, 95, 215);
    petals(12, h * 0.55, h * 0.08, h * 0.12, Math.PI / 12, 70, 190);
    var cg = x.createRadialGradient(-h * 0.05, -h * 0.05, 0, 0, 0, h * 0.24);
    cg.addColorStop(0, "rgb(255,255,255)"); cg.addColorStop(0.5, "rgb(170,170,170)"); cg.addColorStop(1, "rgb(55,55,55)");
    x.fillStyle = cg; x.beginPath(); x.arc(0, 0, h * 0.22, 0, Math.PI * 2); x.fill();
    for (var i = 0; i < 34; i++) { var ang = i * 2.39996, rr = h * 0.19 * Math.sqrt(i / 34); x.fillStyle = "rgba(255,255,255,.8)"; x.beginPath(); x.arc(Math.cos(ang) * rr, Math.sin(ang) * rr, h * 0.014, 0, Math.PI * 2); x.fill(); }
    return x.getImageData(0, 0, S, S);
  }
  var hexToRgb = function (hx) { return [1, 3, 5].map(function (i) { return parseInt(hx.slice(i, i + 2), 16); }); };
  var toHex = function (a) { return "#" + a.map(function (v) { return Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0"); }).join(""); };
  var mix = function (a, b, k) { var X = hexToRgb(a), Y = hexToRgb(b); return toHex(X.map(function (v, i) { return v + (Y[i] - v) * k; })); };
  var hexOf = function (v) { v = String(v || "").trim(); if (/^#[0-9a-f]{6}$/i.test(v)) return v.toLowerCase(); if (/^#[0-9a-f]{3}$/i.test(v)) return "#" + v.slice(1).split("").map(function (c) { return c + c; }).join("").toLowerCase(); var m = /^rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(v); return m ? toHex([+m[1], +m[2], +m[3]]) : null; };
  function lum(hx) { var c = hexToRgb(hx).map(function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; }
  function contrast(a, b) { var X = lum(a), Y = lum(b); return (Math.max(X, Y) + 0.05) / (Math.min(X, Y) + 0.05); }
  function makeFlower(canvas, onFrame) {
    var F = { phase: 0, running: false, raf: 0, last: 0, speed: 1, target: 1, ready: false, palette: null, ring: [40, 90, 255] };
    var S = Math.min(240, Math.max(112, Math.ceil(56 * (window.devicePixelRatio || 1))));
    canvas.width = canvas.height = S;
    var ctx = canvas.getContext("2d"), half = S / 2, R_OUT = half * 0.8, ROT = Math.PI * 2 / 30, PERIOD = 3.2, OMEGA = Math.PI * 2 / PERIOD, BREATH = 0.17, RIPPLE = 2, PETAL_OFF = Math.PI / 8, RING_LIFE = 1.6;
    var w = 480, h = 480, img = flowerSource(w), base = img.data, src = new Uint8ClampedArray(base.length);
    var cxs = w / 2, cys = h / 2, Rs = w / 2 * 0.99;
    // Your flower (flower.webp, background already removed). Until it loads, the drawn one stands in.
    var pic = new Image();
    pic.onload = function () {
      var t = document.createElement("canvas"); t.width = w; t.height = h;
      var tc = t.getContext("2d"); tc.imageSmoothingQuality = "high"; tc.drawImage(pic, 0, 0, w, h);
      base = tc.getImageData(0, 0, w, h).data; src = new Uint8ClampedArray(base.length);
      F.recolor();
    };
    pic.src = "/flower.webp?v=1";
    F.recolor = function () {
      if (!F.palette) return; var L_ = F.palette.light, D_ = F.palette.dark;
      for (var i = 0; i < base.length; i += 4) {
        var al = base[i + 3]; if (!al) { src[i + 3] = 0; continue; }
        var L = (0.3 * base[i] + 0.59 * base[i + 1] + 0.11 * base[i + 2]) / 255, k = Math.round(Math.min(1, Math.max(0, (L - 0.22) / 0.6)) * 23) / 23;
        src[i] = D_[0] + (L_[0] - D_[0]) * k; src[i + 1] = D_[1] + (L_[1] - D_[1]) * k; src[i + 2] = D_[2] + (L_[2] - D_[2]) * k; src[i + 3] = al;
      }
      F.render(F.phase, true);
    };
    var out = ctx.createImageData(S, S), o = out.data, rings = [], lastPeak = -1;
    var N = 4096, TWO = Math.PI * 2, K = N / TWO, SIN = new Float32Array(N), COS = new Float32Array(N);
    for (var i = 0; i < N; i++) { SIN[i] = Math.sin(i / K); COS[i] = Math.cos(i / K); }
    var lut = function (T, a) { return T[((a * K) | 0) & (N - 1)]; };
    var idx = [], RR = [], TH = [], ED = [];
    for (var y = 0; y < S; y++) for (var xx = 0; xx < S; xx++) {
      var dx = xx + 0.5 - half, dy = y + 0.5 - half, r = Math.hypot(dx, dy) / R_OUT;
      if (r > 1.25) continue;
      idx.push((y * S + xx) * 4); RR.push(r); TH.push(Math.atan2(dy, dx) + TWO * 8); ED.push(Math.max(0, Math.min(1, (1.25 - r) / 0.1)));
    }
    var n = idx.length, I = Int32Array.from(idx), Rr = Float32Array.from(RR), Th = Float32Array.from(TH), Ed = Float32Array.from(ED);
    function drawRings(phase) {
      var pk = Math.floor((phase - PERIOD / 4) / PERIOD);
      if (pk !== lastPeak && phase >= PERIOD / 4) { lastPeak = pk; rings.push(phase); }
      while (rings.length && phase - rings[0] > RING_LIFE) rings.shift();
      rings.forEach(function (born) { var age = (phase - born) / RING_LIFE; ctx.beginPath(); ctx.arc(half, half, R_OUT * (1 + 0.22 * age), 0, TWO); ctx.strokeStyle = "rgba(" + F.ring.join(",") + "," + (0.55 * (1 - age)) + ")"; ctx.lineWidth = 1.8 * S / 240; ctx.stroke(); });
    }
    F.render = function (phase, still) {
      var rot = (phase * ROT) % TWO, breathG = 0.03 * Math.sin(OMEGA * phase), b0 = (OMEGA * phase) % TWO + TWO * 8;
      for (var j = 0; j < n; j++) {
        var th = Th[j] - rot, oi = I[j];
        var p = (lut(COS, 7 * (th - PETAL_OFF) + TWO * 64) + 1) / 2;
        var wave = lut(SIN, b0 - RIPPLE * th + TWO * 16);
        var srcR = (Rr[j] * Rs) / (1 + breathG + BREATH * wave * p * p);
        var sx = (cxs + srcR * lut(COS, th) + 0.5) | 0, sy = (cys + srcR * lut(SIN, th) + 0.5) | 0;
        if (sx < 0 || sy < 0 || sx >= w || sy >= h) { o[oi + 3] = 0; continue; }
        var si = (sy * w + sx) * 4;
        o[oi] = src[si]; o[oi + 1] = src[si + 1]; o[oi + 2] = src[si + 2]; o[oi + 3] = src[si + 3] * Ed[j];
      }
      ctx.putImageData(out, 0, 0); if (!still) drawRings(phase);
      if (onFrame) onFrame();
    };
    F.sync = function (want) {
      want = want && !reduce() && !document.hidden;
      if (want && !F.running) { F.running = true; F.last = performance.now(); F.raf = requestAnimationFrame(F.loop); }
      if (!want && F.running) { F.running = false; cancelAnimationFrame(F.raf); }
    };
    F.loop = function (now) {
      if (!F.running) return;
      var dt = Math.min(0.05, (now - F.last) / 1000);
      if (dt >= 1 / 30) { F.last = now; F.speed += (F.target - F.speed) * Math.min(1, dt * 3); F.phase += dt * F.speed; F.render(F.phase); }
      F.raf = requestAnimationFrame(F.loop);
    };
    F.ready = true;
    return F;
  }

  var HIST_KEY = "lees-arten-history-v13";
  function histRead() { try { var v = JSON.parse(sessionStorage.getItem(HIST_KEY) || "[]"); return Array.isArray(v) ? v : []; } catch (e) { return []; } }
  function histWrite(list) { try { sessionStorage.setItem(HIST_KEY, JSON.stringify(list.slice(-40))); } catch (e) {} }
  function clearArtenHistory() { try { sessionStorage.removeItem(HIST_KEY); } catch (e) {} try { Arten.convo = null; } catch (e2) {} }
  function histWhen(t) {
    var d = new Date(t);
    return d.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" }) + ", " + d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });
  }
  function openArtenHistory() {
    var a = A(); if (!a || !a.openPanel) return;
    a.openPanel("Chat history", "This sign-in", function (body) {
      var items = histRead().slice().reverse();
      if (!items.length) { body.appendChild(el("p", "snote", "No conversations yet. Ask ARTEN something and it stays until you sign out.")); return; }
      items.forEach(function (c) {
        var b = el("button", "ah13"); b.type = "button";
        var q0 = (c.turns && c.turns[0] && c.turns[0].q) || "";
        b.append(el("b", "", histWhen(c.at || Date.now())), el("span", "", String(q0).slice(0, 80)));
        b.addEventListener("click", function () {
          a.openPanel("Chat history", histWhen(c.at || Date.now()), function (body2) {
            (c.turns || []).forEach(function (turn) {
              body2.appendChild(el("p", "ah13-q", turn.q || ""));
              body2.appendChild(el("p", "ah13-a", turn.a || ""));
            });
          });
        });
        body.appendChild(b);
      });
    });
  }
  var FACT_WORDS = /\b(name|know|about|like|favourite|favorite|him|her|boyfriend|girlfriend|partner|husband|wife)\b/i;
  var REMEMBER_RE = /\b(?:remember|note)\s+that\s+(?:she|he|they|my partner|partner|her|him)\s+(?:likes|like|loves|love)\s+(.{1,180})/i;
  function skipFacts(q) {
    if (REMEMBER_RE.test(q)) return false;
    if (/\b(activit|last seen|online|session|sticker|journal|letter|idle|sign out|signed out)\b/i.test(q)) return true;
    if (/\b(did|doing)\b/i.test(q) && !/\b(like|likes|favourite|favorite)\b/i.test(q)) return true;
    if (/\b(how|where|send|delete|message|letter|sticker|setting|settings|journal|reset|theme)\b/i.test(q) && !/\b(partner|boyfriend|girlfriend|husband|wife)\b/i.test(q) && !/\babout (her|him|them|my)\b/i.test(q)) return true;
    return false;
  }
  async function factsReply(q) {
    if (!FACT_WORDS.test(q) || skipFacts(q)) return null;
    var a = A(); if (!a) return null;
    var name = a.name(a.other);
    var mem = REMEMBER_RE.exec(String(q || ""));
    if (mem) {
      var fact = mem[1].replace(/[.?!]+$/, "").trim().slice(0, 300);
      if (!fact) return name + " is " + name + ". Tell me a short fact and I'll remember it.";
      if (a.sb && a.pairId && a.me && a.other) {
        var ins = await a.sb.from("arten_facts").insert({ pair_id: a.pairId, owner_side: a.me, subject_side: a.other, category: "like", fact: fact, source: "arten" });
        if (ins.error) return "I couldn't save that. " + (ins.error.message || "Try Things we know.");
      }
      return "I'll remember that " + name + " likes " + fact + ".";
    }
    var facts = [];
    if (a.sb && a.pairId && a.me) {
      var r = await a.sb.from("arten_facts").select("fact").eq("pair_id", a.pairId).eq("owner_side", a.me).order("created_at", { ascending: false }).limit(5);
      facts = ((r && r.data) || []).map(function (x) { return x.fact; }).filter(Boolean);
    }
    var journal = [];
    try { journal = (a.journal || []).filter(function (j) { return j && j.side === a.other && j.text; }).slice(0, 3); } catch (e) {}
    if (!facts.length && !journal.length) return name + " is " + name + ". I don't have any saved facts about them yet. Tell me one and I'll remember it.";
    var lines = facts.slice(0, 5).map(function (f) { return name + " likes " + f + "."; });
    journal.forEach(function (j) { if (lines.length < 5) lines.push(name + " wrote in the journal: " + String(j.text).replace(/\s+/g, " ").slice(0, 90) + "."); });
    return name + ". " + lines.slice(0, 5).join(" ");
  }
  function openFacts() {
    var a = A(); if (!a || !a.openPanel) return;
    a.openPanel("Things we know", "Facts you keep about " + a.name(a.other), function (body) {
      body.classList.add("facts13");
      var form = el("form", "facts13-form");
      var input = el("input", "in");
      input.maxLength = 300;
      input.placeholder = "Something you know about " + a.name(a.other);
      input.setAttribute("aria-label", "A fact about " + a.name(a.other));
      var add = el("button", "btn", "Add"); add.type = "submit";
      form.append(input, add);
      var list = el("div", "facts13-list");
      body.append(form, list);
      var draw = async function () {
        list.textContent = "";
        if (!a.sb || !a.pairId) { list.appendChild(el("p", "snote", "Sign in to save facts.")); return; }
        var r = await a.sb.from("arten_facts").select("id,fact").eq("pair_id", a.pairId).eq("owner_side", a.me).order("created_at", { ascending: false });
        var rows = (r && r.data) || [];
        if (!rows.length) list.appendChild(el("p", "snote", "Nothing saved yet. There is no separate things-I-like list. Add a fact here, or tell ARTEN to remember one."));
        rows.forEach(function (row) {
          var line = el("div", "facts13-row");
          line.appendChild(el("span", "", row.fact));
          var del = el("button", "btn ghost sm", "Delete"); del.type = "button";
          del.addEventListener("click", async function () { await a.sb.from("arten_facts").delete().eq("id", row.id); draw(); });
          line.appendChild(del);
          list.appendChild(line);
        });
      };
      form.addEventListener("submit", async function (ev) {
        ev.preventDefault();
        var fact = input.value.trim();
        if (!fact || !a.sb) return;
        var ins = await a.sb.from("arten_facts").insert({ pair_id: a.pairId, owner_side: a.me, subject_side: a.other, category: "like", fact: fact.slice(0, 300), source: "manual" });
        if (ins.error) { a.notice("Couldn't save that", ins.error.message, { error: true }); return; }
        input.value = "";
        a.notice("Saved", "");
        draw();
      });
      draw();
    });
  }

  var Arten = {
    built: false, open_: false, animating: false, busy: false, flower: null, fab: null, panel: null, list: null, input: null, mode: "ask", history: [],
    isOpen: function () { return this.open_; },
    build: function () {
      if (this.built) return; this.built = true;
      var fab = btn("ar12-fab", "", "Ask ARTEN, your guide");
      fab.id = "ar12Fab";
      fab.innerHTML = '<span class="ar12-unit"><canvas width="112" height="112" aria-hidden="true"></canvas><span class="ar12-msgic" aria-hidden="true"><svg viewBox="0 0 28 28"><rect x="2.5" y="5" width="23" height="15" rx="6"></rect><circle cx="9" cy="12.5" r="1.3"></circle><circle cx="14" cy="12.5" r="1.3"></circle><circle cx="19" cy="12.5" r="1.3"></circle></svg></span></span>';
      document.body.appendChild(fab);
      this.fab = fab;
      var cv = fab.querySelector("canvas");
      var self = this;
      this.flower = makeFlower(cv, function () { if (self.mark && self.open_) { var m = self.mark.getContext("2d"); m.clearRect(0, 0, 80, 80); m.drawImage(cv, 0, 0, 80, 80); } });
      ["pointerenter", "pointerdown"].forEach(function (ev) { fab.addEventListener(ev, function () { self.flower.target = 2.4; }); });
      ["pointerleave", "pointerup", "pointercancel"].forEach(function (ev) { fab.addEventListener(ev, function () { self.flower.target = 1; }); });
      fab.addEventListener("click", function () { self.open(); });
      // The panel: small, anchored next to the flower, never the whole page.
      var root = el("div", "ar12-root closed"); root.setAttribute("aria-hidden", "true"); root.inert = true;
      var pan = el("div", "ar12-panel"); pan.setAttribute("role", "dialog"); pan.setAttribute("aria-label", "ARTEN, your guide");
      var head = el("header", "ar12-head");
      var mk = el("span", "ar12-mark"); var mcv = document.createElement("canvas"); mcv.width = mcv.height = 80; mk.appendChild(mcv); this.mark = mcv;
      var ttl = el("div", "ar12-ttl"); ttl.append(el("b", "", "ARTEN"), el("small", "", "Your guide to The Lees"));
      var modeBtn = btn("ar12-hb", svg(P.arrow), "Take me to…", function () { self.setMode(self.mode === "go" ? "ask" : "go"); });
      modeBtn.title = "Take me to…";
      var histBtn = btn("ar12-hb", svg(P.clock), "Chat history", function () { openArtenHistory(); });
      histBtn.title = "Chat history";
      var x = btn("ar12-hb", svg(P.close), "Close ARTEN", function () { self.close(); });
      head.append(mk, ttl, histBtn, modeBtn, x);
      this.modeBtn = modeBtn;
      var list = el("div", "ar12-list"); list.setAttribute("aria-live", "polite");
      var chips = el("div", "ar12-chips");
      var form = el("form", "ar12-form"); form.autocomplete = "off";
      var inp = el("textarea", "ar12-in"); inp.rows = 1; inp.placeholder = "Ask about anything in The Lees…"; inp.setAttribute("aria-label", "Your question");
      var send = btn("ar12-send", svg(P.send), "Ask");
      send.type = "submit";
      form.append(inp, send);
      inp.addEventListener("input", function () { inp.style.height = "auto"; inp.style.height = Math.min(96, inp.scrollHeight) + "px"; send.disabled = !inp.value.trim(); });
      inp.addEventListener("keydown", function (e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event("submit")); } });
      form.addEventListener("submit", function (e) { e.preventDefault(); var v = inp.value.trim(); if (!v || self.busy) return; inp.value = ""; inp.style.height = "auto"; send.disabled = true; if (self.mode === "go") self.takeMe(v); else self.ask(v); });
      send.disabled = true;
      pan.append(head, list, chips, form);
      root.appendChild(pan);
      document.body.appendChild(root);
      this.root = root; this.panel = pan; this.list = list; this.input = inp; this.chips = chips; this.form = form;
      root.addEventListener("click", function (e) { if (e.target === root) self.close(); });
      document.addEventListener("keydown", function (e) { if (e.key === "Escape" && self.open_ && !Guide.on) { e.preventDefault(); e.stopPropagation(); self.close(); } }, true);
      this.theme();
      new MutationObserver(function () { self.theme(); }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
      this.welcome();
      this.setMode("ask");
      Ask.init(fab);
    },
    theme: function () {
      var cs = getComputedStyle(document.documentElement), g = function (n) { return hexOf(cs.getPropertyValue(n)); };
      var brand = g("--accent") || "#9a5a48", surface = g("--surface") || "#ffffff", bg = g("--bg") || "#f8f4ee", ink = g("--ink") || "#2a2420";
      var dark = lum(bg) < 0.2;
      var deep = mix(brand, dark ? "#000000" : ink, dark ? 0.55 : 0.45);
      var body = dark ? mix(brand, "#000000", 0.35) : brand;
      var fl = hexToRgb(mix(brand, "#ffffff", dark ? 0.42 : 0.28)), fd = hexToRgb(mix(brand, "#000000", dark ? 0.5 : 0.42));
      var ask = "#ffffff";
      for (var k = 0.35; k <= 1.001; k += 0.05) { var c = mix(toHex(fl), "#ffffff", k); if (contrast(c, body) >= 4.5) { ask = c; break; } }
      var r = document.documentElement.style;
      r.setProperty("--ar-body", body); r.setProperty("--ar-ask", ask); r.setProperty("--ar-halo", mix(surface, brand, dark ? 0.22 : 0.14)); r.setProperty("--ar-glow", brand);
      if (this.flower) { this.flower.palette = { light: fl, dark: fd }; this.flower.ring = hexToRgb(brand); this.flower.recolor(); }
    },
    setMode: function (m) {
      this.mode = m;
      this.panel.classList.toggle("go", m === "go");
      this.modeBtn.classList.toggle("on", m === "go");
      this.input.placeholder = m === "go" ? "Where to? e.g. seal a letter" : "Ask about anything in The Lees…";
      this.form.querySelector(".ar12-send").innerHTML = m === "go" ? '<span>Get started</span>' : svg(P.send);
      this.form.querySelector(".ar12-send").classList.toggle("wide", m === "go");
      this.paintChips();
      try { this.input.focus({ preventScroll: true }); } catch (e) {}
    },
    screenOf: function () {
      var a = A(); if (!a) return "default";
      var t = "";
      try { t = (document.getElementById("panelTitle") || {}).textContent || ""; } catch (e) {}
      if (a.view === "panel") {
        if (t === "Activity") return "activity";
        if (t === "Sealed letters" || t === "New sealed letter" || t === "Edit sealed letter") return "letters";
        if (/Sticker/i.test(t)) return "stickers";
        if (t === "Media") return "media";
      }
      if (a.view === "chat") return "chat";
      if (a.view === "home") return "home";
      return "default";
    },
    paintChips: function () {
      var self = this, c = this.chips; c.textContent = "";
      var map = {
        home: [["Open chat", "chat"], ["Send photos", "attach"], ["Sealed letters", "letters"], ["Last seen", "activity"], ["Journal", "journal"], ["Stickers", "stickers"]],
        chat: [["Stickers", "stickers"], ["Send photos", "attach"], ["Sealed letters", "letters"], ["Last seen", "activity"], ["Recently deleted", "vault"], ["Reset everything", "reset"]],
        activity: [["Sealed letters", "letters"], ["Send photos", "attach"], ["Journal", "journal"], ["Stickers", "stickers"], ["Last seen", "activity"], ["Reset everything", "reset"]],
        letters: [["Write a letter", "letters"], ["Delete a letter", "letters"], ["Last seen", "activity"], ["Send photos", "attach"], ["Journal", "journal"], ["Stickers", "stickers"]],
        stickers: [["Send a sticker", "stickers"], ["Send photos", "attach"], ["Last seen", "activity"], ["Sealed letters", "letters"], ["Journal", "journal"], ["Reset everything", "reset"]],
        media: [["Send photos", "attach"], ["Journal", "journal"], ["Stickers", "stickers"], ["Last seen", "activity"], ["Sealed letters", "letters"], ["Open chat", "chat"]],
        default: [["Open chat", "chat"], ["Send photos", "attach"], ["Sealed letters", "letters"], ["Last seen", "activity"], ["Journal", "journal"], ["Stickers", "stickers"]]
      };
      var list = map[this.screenOf()] || map.default;
      list.forEach(function (it) {
        var b = btn("ar12-chip", "", null, function () { self.go(it[1], it[0]); });
        b.textContent = it[0];
        c.appendChild(b);
      });
    },
    rememberTurn: function (q, answer) {
      if (!this.convo || this.convo.closed) this.convo = { id: String(Date.now()), at: Date.now(), turns: [], closed: false };
      if (!this.convo.turns.length) this.convo.at = Date.now();
      this.convo.turns.push({ q: String(q || ""), a: String(answer || "") });
      var all = histRead().filter(function (c) { return c.id !== Arten.convo.id; });
      all.push(Arten.convo);
      histWrite(all);
    },
    welcome: function () {
      var a = A();
      var m = this.bubble("bot");
      m.innerHTML = "<p><b>Hi" + (a && a.me ? ", " + esc(a.name(a.me)) : "") + ".</b> I'm ARTEN. Ask me how anything in The Lees works and I'll explain it. Then I can <b>show you</b> on screen, or <b>take you there</b>.</p><p class=\"ar12-hint\">Tap the arrow at the top to tell me where you want to go instead.</p>";
    },
    bubble: function (who) { var b = el("div", "ar12-msg " + who); this.list.appendChild(b); this.scroll(); return b; },
    say: function (who, text) { var b = this.bubble(who); b.textContent = text; return b; },
    scroll: function () { var l = this.list; requestAnimationFrame(function () { l.scrollTop = l.scrollHeight; }); },
    think: function (q, problem) {
      var b = this.bubble("bot think"), self = this;
      var words = ["Thinking", "Cooking", "ARTENING"].concat(problem ? ["Troubleshooting"] : []);
      var pool = ["Almost there", "One moment", "Looking it up", "With you", "Just a second", "On it", "Warming up", "Piecing it", "Checking now", "Finding it", "Quietly looking", "Nearly ready", "Hold on", "Sorting it", "Reading carefully", "Matching words", "Turning pages", "Softly thinking", "Right with you", "Gathering steps", "Little pause", "Opening up"];
      var seq = words.concat(pool);
      var pairAt = 0;
      var steps = ["Reading your question", "Matching every word to each part of The Lees", problem ? "Looking for what could be going wrong" : "Weighing the closest answers", "Checking the steps", "Writing the answer"];
      b.innerHTML = '<button type="button" class="ar12-th" aria-expanded="false"><span class="ar12-orb"></span><b>Thinking</b><span class="ar12-dots"><i></i><i></i><i></i></span><svg class="i ar12-chev" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg></button><ol class="ar12-tsteps"></ol>';
      var head = b.querySelector(".ar12-th"), label = head.querySelector("b"), ol = b.querySelector("ol");
      head.addEventListener("click", function () { var o = !b.classList.contains("expanded"); b.classList.toggle("expanded", o); head.setAttribute("aria-expanded", String(o)); self.scroll(); });
      if (this.flower) this.flower.target = 7;   // the spikes race while it thinks
      var si = 0;
      var showPair = function () {
        var a1 = seq[pairAt % seq.length], b1 = seq[(pairAt + 1) % seq.length];
        label.textContent = a1 === b1 ? a1 : a1 + " · " + b1;
      };
      showPair();
      var wt = setInterval(function () { pairAt = (pairAt + 1) % seq.length; showPair(); }, 520);
      var st = setInterval(function () { if (si >= steps.length) return; ol.appendChild(el("li", "", steps[si++])); if (ol.children.length > 1) ol.children[ol.children.length - 2].classList.add("done"); }, 420);
      var t0 = performance.now();
      return { el: b, done: function (ms) { return new Promise(function (r) { setTimeout(function () { clearInterval(wt); clearInterval(st); while (si < steps.length) ol.appendChild(el("li", "", steps[si++])); [].forEach.call(ol.children, function (x) { x.classList.add("done"); }); label.textContent = "Thought for " + ((performance.now() - t0) / 1000).toFixed(1) + " s"; b.classList.add("collapsed"); if (self.flower) self.flower.target = 1; r(); }, Math.max(0, ms)); }); } };
    },
    ask: async function (q) {
      if (this.busy) return; this.busy = true;
      this.say("me", q);
      Act.log("arten", q.slice(0, 80));
      var t0 = performance.now();
      var factText = null;
      try { factText = await factsReply(q); } catch (e) {}
      var hits = factText ? [{ e: { id: "facts", title: "Partner facts", a: factText, go: "facts" }, s: 9 }] : search(q);
      var th = this.think(q, /not work|doesn.?t|broken|error|problem|can.?t|cannot|fail|wrong|issue|stuck/i.test(q));
      var wait = Math.max(2000, Math.min(3400, 1600 + q.length * 20 + (hits.length ? 0 : 500)));
      await th.done(wait - (performance.now() - t0));
      var b = this.bubble("bot");
      if (!hits.length) {
        b.innerHTML = "<p>I couldn't match that to a part of The Lees. Here's what I can help with:</p>";
        var ul = el("div", "ar12-sugg");
        ["Sending photos", "Last seen", "Sealed letters", "Voice notes", "Recently deleted", "Reset everything", "Themes", "Notifications"].forEach(function (t) { ul.appendChild(btn("ar12-chip", esc(t), null, function () { Arten.ask(t); })); });
        b.appendChild(ul);
        this.rememberTurn(q, "I couldn't match that to a part of The Lees.");
        this.busy = false; this.scroll(); return;
      }
      var top = hits[0].e, also = hits.slice(1).filter(function (h) { return h.s >= hits[0].s * 0.72; }).slice(0, 2).map(function (h) { return h.e; });
      await this.write(b, top, also, q);
      this.rememberTurn(q, top.a);
      this.busy = false;
    },
    write: async function (b, e, also, q) {
      var h = el("div", "ar12-ah"); h.textContent = e.title; b.appendChild(h);
      var p = el("p", ""); b.appendChild(p);
      await this.type(p, e.a);
      if (e.steps && e.steps.length) {
        var ol = el("ol", "ar12-steps"); b.appendChild(ol);
        for (var i = 0; i < e.steps.length; i++) { var li = el("li", "", e.steps[i]); ol.appendChild(li); await sleep(reduce() ? 0 : 90); this.scroll(); }
      }
      if (e.more) { var m = el("p", "ar12-more"); b.appendChild(m); await this.type(m, e.more); }
      var acts = el("div", "ar12-acts");
      var self = this;
      if (e.tour) acts.appendChild(btn("ar12-act primary", svg(P.spark) + "<span>Show me how</span>", null, function () { self.close().then(function () { Guide.start(e.tour); }); }));
      if (e.go) acts.appendChild(btn("ar12-act", svg(P.arrow) + "<span>Take me there</span>", null, function () { self.go(e.go, e.title); }));
      if (acts.children.length) b.appendChild(acts);
      if (also.length) {
        var rel = el("div", "ar12-rel"); rel.appendChild(el("small", "", "You might also mean"));
        also.forEach(function (x) { rel.appendChild(btn("ar12-chip", esc(x.title), null, function () { self.say("me", x.title); var bb = self.bubble("bot"); self.write(bb, x, [], x.title); })); });
        b.appendChild(rel);
      }
      this.scroll();
    },
    type: async function (node, text) {
      if (reduce()) { node.textContent = text; return; }
      var words = text.split(/(\s+)/), out = "";
      for (var i = 0; i < words.length; i++) { out += words[i]; if (i % 3 === 0) { node.textContent = out; this.scroll(); await sleep(16); } }
      node.textContent = text; this.scroll();
    },
    takeMe: async function (v) {
      this.say("me", "Take me to: " + v);
      var hits = search(v), b;
      var e = hits.find(function (h) { return h.e.go; });
      if (!e) { b = this.bubble("bot"); b.innerHTML = "<p>I'm not sure where that is. Try words like <i>letter</i>, <i>photos</i>, <i>last seen</i>, <i>theme</i> or <i>reset</i>.</p>"; return; }
      this.go(e.e.go, e.e.title);
    },
    go: function (where, title) {
      var b = this.bubble("bot"); b.innerHTML = "<p>Opening <b>" + esc(title) + "</b>…</p>";
      var self = this;
      setTimeout(function () { self.close().then(function () { goTo(where); }); }, 380);
    },
    // Zoom open from the flower into the small panel, like an app opening on a phone; zoom back on close.
    open: async function () {
      if (this.open_ || this.animating) return;
      var a = A(); if (!a || !a.unlocked) return;
      if (!this.convo || this.convo.closed) this.convo = { id: String(Date.now()), at: Date.now(), turns: [], closed: false };
      this.paintChips();
      this.animating = true; Ask.reset();
      Usage.mark("arten");
      var root = this.root, pan = this.panel, fab = this.fab, unit = fab.querySelector(".ar12-unit");
      root.classList.remove("closed"); root.inert = false; root.removeAttribute("aria-hidden");
      this.placePanel();
      var R0 = unit.getBoundingClientRect(), P1 = pan.getBoundingClientRect();
      var sx = R0.width / P1.width, sy = R0.height / P1.height, tx = R0.left - P1.left, ty = R0.top - P1.top;
      fab.classList.add("under");
      this.open_ = true;
      this.flower.sync(true);
      if (!reduce() && pan.animate) {
        var anim = pan.animate([{ transform: "translate(" + tx + "px," + ty + "px) scale(" + sx + "," + sy + ")", borderRadius: (28 / sx) + "px / " + (28 / sy) + "px", opacity: 0.6 }, { transform: "none", borderRadius: "26px", opacity: 1 }], { duration: 420, easing: "cubic-bezier(.16,1,.3,1)" });
        pan.querySelectorAll(".ar12-list, .ar12-chips, .ar12-form, .ar12-ttl, .ar12-hb").forEach(function (n) { n.animate([{ opacity: 0 }, { opacity: 0, offset: 0.35 }, { opacity: 1 }], { duration: 380 }); });
        try { await anim.finished; } catch (e) {}
      }
      root.classList.add("open");
      this.animating = false;
      try { this.input.focus({ preventScroll: true }); } catch (e) {}
    },
    close: async function () {
      if (!this.open_) return;
      if (this.animating) { await sleep(440); }
      this.animating = true;
      var root = this.root, pan = this.panel, unit = this.fab.querySelector(".ar12-unit");
      root.classList.remove("open");
      var R0 = unit.getBoundingClientRect(), P1 = pan.getBoundingClientRect();
      var sx = R0.width / P1.width, sy = R0.height / P1.height, tx = R0.left - P1.left, ty = R0.top - P1.top;
      if (!reduce() && pan.animate) {
        pan.querySelectorAll(".ar12-list, .ar12-chips, .ar12-form, .ar12-ttl, .ar12-hb").forEach(function (n) { n.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 110, fill: "forwards" }); });
        var anim = pan.animate([{ transform: "none", borderRadius: "26px", opacity: 1 }, { transform: "translate(" + tx + "px," + ty + "px) scale(" + sx + "," + sy + ")", borderRadius: (28 / sx) + "px / " + (28 / sy) + "px", opacity: 0.4 }], { duration: 320, easing: "cubic-bezier(.4,0,.2,1)", fill: "forwards" });
        try { await anim.finished; } catch (e) {}
        pan.getAnimations().forEach(function (x) { x.cancel(); });
        pan.querySelectorAll(".ar12-list, .ar12-chips, .ar12-form, .ar12-ttl, .ar12-hb").forEach(function (n) { n.getAnimations().forEach(function (x) { x.cancel(); }); });
      }
      root.classList.add("closed"); root.inert = true; root.setAttribute("aria-hidden", "true");
      this.fab.classList.remove("under");
      this.open_ = false; this.animating = false;
      if (this.convo && this.convo.turns && this.convo.turns.length) this.convo.closed = true;
      Ask.lastQuiet = Date.now(); Ask.schedule();
      try { this.fab.focus({ preventScroll: true }); } catch (e) {}
    },
    placePanel: function () {
      var f = this.fab.getBoundingClientRect(), vw = innerWidth, vh = innerHeight;
      var w = Math.min(380, vw - 24), maxH = Math.min(560, vh - 24 - (vh - f.bottom) - 8);
      var h = Math.max(340, Math.min(maxH, vh * 0.66));
      var right = Math.max(12, vw - f.right), bottom = Math.max(12, vh - f.bottom);
      var s = this.panel.style;
      s.width = w + "px"; s.height = Math.min(h, vh - 24) + "px"; s.right = right + "px"; s.bottom = bottom + "px";
      s.transformOrigin = "bottom right";
    },
    // Where the flower sits: bottom right, lifted above the chat's message box and any bottom bar.
    position: function () {
      if (!this.fab) return;
      var a = A(), fab = this.fab;
      var show = !!(a && a.unlocked) && a.view !== "chat" && !document.querySelector("#mediaPreview, .v9-viewer, .al11, .av12, .v8-overlay, .love9");
      fab.classList.toggle("gone", !show);
      var bottom = 18;
      if (a && a.view === "chat") {
        var ft = document.getElementById("footer"); if (ft) { var r = ft.getBoundingClientRect(); if (r.height) bottom = innerHeight - r.top + 12; }
        // Above the "new messages" pill when it shows, so the two never overlap.
        var bn = document.querySelector(".lp-banner");
        if (bn && bn.offsetParent && !bn.classList.contains("hidden")) { var br = bn.getBoundingClientRect(); if (br.height && br.right > innerWidth - 90) bottom = Math.max(bottom, innerHeight - br.top + 10); }
      }
      fab.style.setProperty("--ar-bottom", Math.round(bottom) + "px");
      if (a && (a.view === "home" || !a.view)) {
        var card = document.querySelector("#people .person");
        if (card) {
          var cb = card.getBoundingClientRect().bottom;
          var fabH = fab.offsetHeight || 64;
          var top = innerHeight - bottom - fabH;
          if (top < cb + 16) bottom = Math.max(8, innerHeight - (cb + 16) - fabH);
        }
      }
      fab.style.setProperty("--ar-bottom", Math.round(bottom) + "px");
      this.flower.sync(show || this.open_);
      if (this.open_) this.placePanel();
    }
  };
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, Math.max(0, ms)); }); }

  // "ASK": after a few seconds of quiet, the halo stretches, A-S-K types itself, holds, fades, contracts.
  var Ask = { curW: 56, busy: false, t: 0, lastQuiet: Date.now(), L: 96, IDLE: 3000, fab: null, measure: null,
    init: function (fab) {
      this.fab = fab; this.body = fab.querySelector(".ar12-body"); this.unit = fab.querySelector(".ar12-unit"); this.text = fab.querySelector(".ar12-ask"); this.typed = fab.querySelector(".ar12-typed");
      if (!this.text || !this.body) return;
      var self = this;
      ["pointerdown", "keydown", "touchstart"].forEach(function (ev) { document.addEventListener(ev, function () { self.lastQuiet = Date.now(); }, { passive: true }); });
      this.schedule();
    },
    widthFor: function (s) {
      if (!this.measure) { var c = document.createElement("canvas").getContext("2d"), self = this; this.measure = function (x) { var cs = getComputedStyle(self.text); c.font = cs.fontWeight + " " + cs.fontSize + " " + cs.fontFamily; return c.measureText(x).width + 4; }; }
      return s ? 58 + this.measure(s) + 14 : 56;
    },
    set: function (w) { if (!this.body || !this.unit) return; this.curW = w; var s = Math.max(0, Math.min(1, (w - 56) / this.L)); this.body.style.transform = "scaleX(" + s + ")"; this.unit.style.transform = "translate3d(" + (-this.L * s) + "px,0,0)"; },
    tween: function (to, ms, ease) { var self = this; return new Promise(function (res) { var from = self.curW, t0 = performance.now(); var step = function (now) { var k = Math.min(1, (now - t0) / ms); self.set(from + (to - from) * ease(k)); if (k < 1) requestAnimationFrame(step); else res(); }; requestAnimationFrame(step); }); },
    ok: function () { var a = A(); return !reduce() && !document.hidden && !Arten.isOpen() && !Guide.on && a && a.unlocked && a.view !== "chat" && !Arten.fab.classList.contains("gone"); },
    play: async function () {
      if (!this.ok() || this.busy) { this.lastQuiet = Date.now(); return this.schedule(); }
      this.busy = true;
      await this.tween(this.widthFor("ASK"), 380, function (k) { return 1 - Math.pow(1 - k, 3); });
      await sleep(60);
      for (var i = 1; i <= 3; i++) { this.typed.textContent = "ASK".slice(0, i); if (i < 3) await sleep(150); }
      this.text.classList.add("blink"); await sleep(2000); this.text.classList.remove("blink");
      this.typed.classList.add("nocaret"); this.typed.style.transition = "opacity 200ms ease-out"; this.typed.style.opacity = "0";
      await this.tween(56, 260, function (k) { return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; });
      this.typed.textContent = ""; this.typed.style.transition = "none"; this.typed.style.opacity = "1"; this.typed.classList.remove("nocaret");
      this.busy = false; this.lastQuiet = Date.now(); this.schedule();
    },
    schedule: function () {
      if (!this.body || !this.text) return;
      var self = this; clearTimeout(this.t); if (this.busy) return;
      this.t = setTimeout(function () { if (self.busy) return; if (Date.now() - self.lastQuiet >= self.IDLE) self.play(); else self.schedule(); }, Math.max(400, this.IDLE - (Date.now() - this.lastQuiet)));
    },
    reset: function () { clearTimeout(this.t); this.busy = false; if (!this.typed) return; this.typed.textContent = ""; this.typed.style.opacity = "1"; this.text.classList.remove("blink"); this.set(56); this.lastQuiet = Date.now(); }
  };

  /* =====================================================================================================
     ALBUM VIEWER: a set opens as a smooth feed (or a grid); any photo opens full screen with swipe,
     a filmstrip, double-tap to love, and Love / Reply / Forward / Share / Save on each one.
     ===================================================================================================== */
  var AP = { grid: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z", feed: "M4 5h16v6H4zM4 14h16v6H4z", save: "M12 3v12M7 10l5 5 5-5M5 21h14", fwd: "M15 17l5-5-5-5M4 18v-2a4 4 0 0 1 4-4h12", reply: "M9 17l-5-5 5-5M20 18v-2a4 4 0 0 0-4-4H4", share: "M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v13" };
  function openAlbum12(ids, focusId) {
    var a = A(); if (!a || !ids || !ids.length) return;
    var live = function () { return ids.map(function (id) { return a.thread().find(function (m) { return m.id === id; }); }).filter(function (m) { return m && !m.deleted && !(m.deletedFor || []).includes(a.me); }); };
    var list = live(); if (!list.length) return;
    var mode = LS.get("v12-album-mode", "feed");
    var ov = el("div", "av12"); ov.setAttribute("role", "dialog"); ov.setAttribute("aria-modal", "true");
    var vids = list.filter(function (m) { return m.kind === "video"; }).length;
    var noun = vids === list.length ? "videos" : vids ? "items" : "photos";
    ov.setAttribute("aria-label", list.length + " " + noun);
    var glow = el("div", "av12-glow");
    var top = el("header", "av12-top");
    var first = list[0];
    var who = el("div", "av12-who");
    who.append(el("b", "", list.length + " " + noun), el("span", "", (first.from === a.me ? "From you" : "From " + a.name(first.from)) + " · " + new Date(first.ts).toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })));
    var modeB = btn("av12-ib", svg(mode === "grid" ? AP.feed : AP.grid), mode === "grid" ? "Show as a feed" : "Show as a grid", function () { mode = mode === "grid" ? "feed" : "grid"; LS.set("v12-album-mode", mode); modeB.innerHTML = svg(mode === "grid" ? AP.feed : AP.grid); modeB.setAttribute("aria-label", mode === "grid" ? "Show as a feed" : "Show as a grid"); paint(); });
    var more = el("div", "av12-all");
    more.append(
      btn("av12-pill", svg(AP.fwd) + "<span>Forward all</span>", "Forward all", function () { a.forwardSheet(live()); }),
      btn("av12-pill", svg(AP.save) + "<span>Save all</span>", "Save all", function () { a.saveMedia(live()); })
    );
    top.append(btn("av12-ib", svg(P.close), "Close", function () { shut(); }), who, modeB, more);
    var scroll = el("div", "av12-scroll");
    ov.append(glow, top, scroll);
    document.body.appendChild(ov);
    var urls = {};
    function url(m) { if (!urls[m.id]) urls[m.id] = a.mediaURL(m.mid); return urls[m.id]; }
    function media(m, cls, opts) {
      var n;
      if (m.kind === "video") { n = document.createElement("video"); n.playsInline = true; n.preload = "metadata"; n.className = cls; if (opts && opts.controls) n.controls = true; else n.muted = true; url(m).then(function (u) { if (u) n.src = u + (opts && opts.controls ? "" : "#t=0.1"); }); }
      else { n = new Image(); n.className = cls; n.alt = ""; n.decoding = "async"; n.draggable = false; if (!(opts && opts.eager)) n.loading = "lazy"; url(m).then(function (u) { if (u) { n.src = u; if (n.decode) n.decode().then(function () { n.classList.add("ld"); }, function () { n.classList.add("ld"); }); else n.classList.add("ld"); } }); }
      return n;
    }
    function fresh(m) { return a.thread().find(function (x) { return x.id === m.id; }) || m; }
    function actions(m, dark) {
      m = fresh(m);
      var bar = el("div", "av12-acts" + (dark ? " dark" : "")), liked = a.likedByMe(m), n = a.heartCount(m);
      bar.append(
        btn("av12-a" + (liked ? " on" : ""), svg(P.heart) + "<span>" + (n ? n : "Love") + "</span>", liked ? "Unlove" : "Love", function () { a.haptic("heart"); a.toggleHeart(m.id).then(refresh); }),
        btn("av12-a", svg(AP.reply) + "<span>Reply</span>", "Reply", function () { shut(); a.openChat(); setTimeout(function () { a.setReply(fresh(m)); }, 60); }),
        btn("av12-a", svg(AP.fwd) + "<span>Forward</span>", "Forward", function () { a.forwardSheet([fresh(m)]); }),
        btn("av12-a", svg(AP.share) + "<span>Share</span>", "Share", function () { a.shareMessages([fresh(m)]); }),
        btn("av12-a", svg(AP.save) + "<span>Save</span>", "Save", function () { a.saveMedia([fresh(m)]); })
      );
      bar.dataset.id = m.id;
      return bar;
    }
    function heartAt(x, y) { try { a.burstAt(x, y, "heart", 7); } catch (e) {} }
    function dbl(node, m, single) {
      var last = 0, t = 0;
      node.addEventListener("click", function (e) {
        var now = Date.now();
        if (now - last < 300) { clearTimeout(t); last = 0; var f = fresh(m); if (!a.likedByMe(f)) a.toggleHeart(f.id).then(refresh); a.haptic("heart"); heartAt(e.clientX, e.clientY); return; }
        last = now; t = setTimeout(function () { single && single(); }, 300);
      });
    }
    function paint() {
      list = live();
      scroll.textContent = ""; scroll.className = "av12-scroll " + (mode === "grid" ? "av12-grid-mode" : "av12-feed");
      if (mode === "grid") {
        var g = el("div", "av12-grid");
        list.forEach(function (m, i) {
          var t = btn("av12-cell", "", "Open " + (i + 1) + " of " + list.length);
          t.appendChild(media(m, "av12-m"));
          if (m.kind === "video") t.insertAdjacentHTML("beforeend", '<span class="av12-play">' + svg(P.play, "i") + "</span>");
          var h = a.heartCount(fresh(m)); if (h) t.insertAdjacentHTML("beforeend", '<span class="av12-h">♥ ' + h + "</span>");
          dbl(t, m, function () { pager(i); });
          g.appendChild(t);
        });
        scroll.appendChild(g);
      } else {
        list.forEach(function (m, i) {
          var fig = el("figure", "av12-item"); fig.dataset.id = m.id;
          var frame = el("div", "av12-frame");
          frame.appendChild(media(m, "av12-m", { controls: m.kind === "video" }));
          frame.appendChild(el("span", "av12-n mono", (i + 1) + " / " + list.length));
          if (m.kind !== "video") dbl(frame, m, function () { pager(i); });
          fig.appendChild(frame);
          if (m.text) fig.appendChild(el("figcaption", "av12-cap", m.text));
          fig.appendChild(actions(m));
          scroll.appendChild(fig);
        });
      }
      setGlow(list[0]);
    }
    function setGlow(m) { if (!m || m.kind === "video") return; url(m).then(function (u) { if (u) glow.style.backgroundImage = "url(" + JSON.stringify(u) + ")"; }); }
    function refresh() { document.querySelectorAll(".av12-acts[data-id]").forEach(function (b) { var m = list.find(function (x) { return x.id === b.dataset.id; }); if (m) b.replaceWith(actions(m, b.classList.contains("dark"))); }); }
    // Full screen: swipe sideways through the set, filmstrip to jump, swipe down to go back.
    function pager(start) {
      var pg = el("div", "av12-pg"); pg.setAttribute("role", "dialog"); pg.setAttribute("aria-label", "Photo viewer");
      var bar = el("div", "av12-pgtop");
      var count = el("span", "av12-count mono");
      bar.append(btn("av12-ib", svg(P.back), "Back", function () { closePg(); }), count, el("span", "grow"));
      var track = el("div", "av12-track");
      list.forEach(function (m, i) {
        var slide = el("div", "av12-slide"); slide.dataset.i = i;
        slide.appendChild(media(m, "av12-full", { controls: m.kind === "video", eager: Math.abs(i - start) < 2 }));
        if (m.kind !== "video") dbl(slide, m, function () { pg.classList.toggle("bare"); });
        track.appendChild(slide);
      });
      var foot = el("div", "av12-pgfoot");
      var cap = el("p", "av12-pgcap");
      var acts = el("div", "av12-pgacts");
      var film = el("div", "av12-film");
      list.forEach(function (m, i) { var t = btn("av12-ft", "", "Go to " + (i + 1)); t.appendChild(media(m, "av12-m")); t.addEventListener("click", function () { goTo(i, true); }); film.appendChild(t); });
      foot.append(cap, acts, film);
      pg.append(bar, track, foot);
      ov.appendChild(pg);
      var cur = -1;
      function show(i) {
        if (i === cur) return; cur = i;
        var m = list[i];
        count.textContent = (i + 1) + " of " + list.length;
        cap.textContent = m.text || ""; cap.classList.toggle("hidden", !m.text);
        acts.textContent = ""; acts.appendChild(actions(m, true));
        film.querySelectorAll(".av12-ft").forEach(function (t, k) { t.classList.toggle("on", k === i); });
        var ft = film.children[i]; if (ft && ft.scrollIntoView) ft.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
        track.querySelectorAll("video").forEach(function (v, k) { if (!v.closest(".av12-slide") || +v.closest(".av12-slide").dataset.i !== i) try { v.pause(); } catch (e) {} });
        setGlow(m);
      }
      function goTo(i, smooth) { track.scrollTo({ left: i * track.clientWidth, behavior: smooth && !reduce() ? "smooth" : "auto" }); show(i); }
      var rt = 0;
      track.addEventListener("scroll", function () { cancelAnimationFrame(rt); rt = requestAnimationFrame(function () { show(Math.round(track.scrollLeft / Math.max(1, track.clientWidth))); }); }, { passive: true });
      var y0 = null, x0 = 0;
      track.addEventListener("pointerdown", function (e) { y0 = e.clientY; x0 = e.clientX; });
      track.addEventListener("pointerup", function (e) { if (y0 === null) return; var dy = e.clientY - y0, dx = e.clientX - x0; y0 = null; if (dy > 110 && Math.abs(dy) > Math.abs(dx) * 1.6) closePg(); });
      function key(e) { if (e.key === "ArrowRight" && cur < list.length - 1) { e.preventDefault(); goTo(cur + 1, true); } else if (e.key === "ArrowLeft" && cur > 0) { e.preventDefault(); goTo(cur - 1, true); } else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); closePg(); } }
      document.addEventListener("keydown", key, true);
      function closePg() { document.removeEventListener("keydown", key, true); pg.classList.add("out"); setTimeout(function () { pg.remove(); }, 200); }
      pg._close = closePg;
      requestAnimationFrame(function () { pg.classList.add("v12-in"); goTo(start, false); });
    }
    var onRender = function () { refresh(); };
    document.addEventListener("lees:render", onRender);
    var keyTop = function (e) { if (e.key === "Escape" && !ov.querySelector(".av12-pg") && !document.querySelector("#sheet:not(.hidden)")) { e.stopPropagation(); e.preventDefault(); shut(); } };
    document.addEventListener("keydown", keyTop, true);
    function shut() {
      document.removeEventListener("keydown", keyTop, true);
      document.removeEventListener("lees:render", onRender);
      ov.classList.add("out"); setTimeout(function () { ov.remove(); if (Arten.built) Arten.position(); }, 220);
    }
    paint();
    if (Arten.built) Arten.position();
    requestAnimationFrame(function () {
      ov.classList.add("v12-in");
      var i = focusId ? list.findIndex(function (m) { return m.id === focusId; }) : -1;
      if (i > 0 && mode === "feed") { var f = scroll.querySelector('[data-id="' + focusId + '"]'); if (f) f.scrollIntoView({ block: "start" }); }
    });
  }
  function hookAlbum() { if (window.LeesV11 && !LeesV11._v12) { LeesV11.openAlbum = openAlbum12; LeesV11._v12 = true; } }
  document.addEventListener("lees:locked", function () { document.querySelectorAll(".av12").forEach(function (n) { n.remove(); }); });

  /* =====================================================================================================
     SIGN-IN: two clear identity cards; the field says whose passphrase it wants
     ===================================================================================================== */
  function polishLock() {
    var sw = document.getElementById("acctSwitch"); if (!sw || sw._v12) return; sw._v12 = true;
    var lock = document.getElementById("lock");
    lock.classList.add("lk12");
    var lab = el("p", "lk12-lab", "Signing in as");
    sw.parentNode.insertBefore(lab, sw);
    sw.querySelectorAll("button[data-side]").forEach(function (b) {
      if (!b.querySelector(".lk12-sub")) { var sub = el("small", "lk12-sub", "Tap to choose"); b.appendChild(sub); var tick = el("span", "lk12-tick"); tick.innerHTML = svg(P.check); b.appendChild(tick); }
    });
    var sync = function () {
      var on = sw.querySelector('button[aria-pressed="true"]'), pass = document.getElementById("pass");
      sw.classList.toggle("picked", !!on);
      var put = function (n, t) { if (n && n.textContent !== t) n.textContent = t; };
      sw.querySelectorAll("button[data-side]").forEach(function (b) { put(b.querySelector(".lk12-sub"), b === on ? "Signing in" : on ? "Tap to switch" : "Tap to choose"); });
      if (pass && on) { var nm = on.querySelector("b").textContent; if (pass.placeholder !== nm + "'s passphrase") { pass.placeholder = nm + "'s passphrase"; pass.setAttribute("aria-label", nm + "'s passphrase"); } put(lab, "Signing in as " + nm); }
      else put(lab, "Who's signing in?");
    };
    // Attributes only: sync() writes text inside the switch, and watching text would make it call itself forever.
    new MutationObserver(sync).observe(sw, { attributes: true, subtree: true, attributeFilter: ["aria-pressed"] });
    sync();
  }

  /* =====================================================================================================
     SETTINGS ENTRIES
     ===================================================================================================== */
  function wrapSettings() {
    var base = window.LeesSettingsExtra;
    if (!base || base._v12) return;
    var f = function () {
      var list = base() || [], a = A();
      list.push(
        { cat: "help", id: "tour", label: "Take the tour", sub: "Everything, most important first", keywords: "guide tour help tutorial walkthrough onboarding learn", icon: "sparkle", run: function () { Guide.start("full"); } },
        { cat: "help", id: "guide-on", label: "Guide", sub: "Tour after a reset, and tips for things you haven't tried", keywords: "guide tips hints onboarding tour switch off on", icon: "bell", toggle: { get: function () { return Guide.enabled(); }, set: function (v) { Guide.setEnabled(v); a.notice(v ? "Guide on" : "Guide off", v ? "Tips and the tour after a reset are back." : "No more tips. You can still take the tour here."); } } },
        { cat: "help", id: "ask-arten", label: "Ask ARTEN", sub: "Questions about anything in the app", keywords: "arten assistant ask question help flower", icon: "chat", run: function () { while (A().view === "panel") { A().goBack(); if (A().view !== "panel") break; } setTimeout(function () { Arten.open(); }, 260); } },
        { cat: "data", id: "vault", label: "Recently deleted", sub: "Restore, or delete for good", keywords: "recently deleted restore bin trash vault recover undelete permanently", icon: "undo", run: function () { a.openVault(); } },
        { cat: "data", id: "reset", label: "Reset everything", sub: "Back to day one, for both of you", keywords: "reset factory wipe start over default erase everything", icon: "trash", danger: true, run: openReset },
        { cat: "privacy", id: "activity", label: "Last seen and activity", sub: "What each of you did, session by session", keywords: "last seen online activity history presence status", icon: "history", run: function () { openActivity(a.other); } },
        { cat: "privacy", id: "facts", label: "Things we know", sub: "Facts you keep about " + (a ? a.name(a.other) : "them"), keywords: "facts partner know like remember things about", icon: "heart", run: function () { openFacts(); } }
      );
      return list;
    };
    f._v12 = true; f._v10 = true; // v10 re-wraps on every sign-in unless it sees its own mark
    window.LeesSettingsExtra = f;
  }

  /* =====================================================================================================
     WIRING
     ===================================================================================================== */
  var started = false;
  function onUnlocked() {
    var a = A(); if (!a) return;
    Act.ids = null; scanOwnSends();
    lastUnread = a.unreadN || 0;
    Act.log("signin");
    var n = Usage.bump();
    Arten.build(); Arten.theme(); Arten.position();
    clearInterval(Act.beat);
    Act.beat = setInterval(function () { Act.touch(); paintSeen(); Arten.position(); }, 60000);
    Act.touch();
    setTimeout(function () { var A2 = A(); if (!A2 || !A2.unlocked) return; if (Guide.enabled() && !LS.get("v12-guide-done-" + A2.me, 0) && n <= 1) Guide.start("full"); else setTimeout(maybeTip, 5000); }, 1600);
    started = true;
  }
  document.addEventListener("lees:unlocked", onUnlocked);
  document.addEventListener("lees:synced", function () { Act.load(); Act.subscribe(); paintSeen(); checkResetFlag(); setTimeout(openPendingLetters, 1500); });
  document.addEventListener("lees:locked", function () { clearInterval(Act.beat); Guide.stop(true); clearArtenHistory(); if (Arten.built) { Arten.close(); Arten.position(); } document.querySelectorAll(".tip12").forEach(function (n) { n.remove(); }); started = false; });
  document.addEventListener("lees:view", function (e) {
    var d = e.detail || {};
    if (d.view === "chat") { Act.log("open_chat"); readVisible(900); }
    if (Arten.built) setTimeout(function () { Arten.position(); }, 30);
    setTimeout(paintSeen, 40);
  });
  document.addEventListener("lees:panel", function (e) { var t = (e.detail || {}).title || ""; var k = PANEL_ACT[t]; if (k) Act.log(k); else if (t && t !== "Activity") Act.log("panel", t); });
  document.addEventListener("lees:activity", function (e) { var d = e.detail || {}; if (d.action) { if (d.action === "send_media") { Act.lastLogged["batch-sent"] = Date.now(); } Act.log(d.action, d.detail); } });
  // A message that is fully in view above the message box counts as read, even without scrolling (on opening
  // the chat, after it renders, after the window changes size). The short delay lets you see the blur lift.
  var readT = 0;
  function readVisible(delay) {
    clearTimeout(readT);
    readT = setTimeout(function () { var a = A(); if (a && a.unlocked && a.view === "chat" && !document.hidden && a.passUnread) a.passUnread(true); }, delay == null ? 650 : delay);
  }
  document.addEventListener("lees:render", function () { scanOwnSends(); watchReading(); paintSeen(); var a = A(); if (a && a.view === "chat") readVisible(); });
  document.addEventListener("visibilitychange", function () { if (!document.hidden) readVisible(800); });
  addEventListener("resize", function () { readVisible(300); });
  document.addEventListener("visibilitychange", function () {
    var a = A(); if (!a || !a.unlocked) return;
    if (document.hidden) { Act.log("away"); Act.flush(); try { if (a.presenceAway) a.presenceAway(); else a.presenceTrack({ typing: false, ts: Date.now(), away: true }); } catch (e) {} }
    else { Act.log("back"); if (!(a.idleFor && a.idleFor() > 5 * 60 * 1000)) Act.touch(); try { if (a.presenceBack) a.presenceBack(); else a.presenceTrack({ typing: false, ts: Date.now() }); } catch (e) {} }
    if (Arten.built) Arten.position();
  });
  addEventListener("resize", function () { if (Arten.built) Arten.position(); });
  addEventListener("pagehide", function () { Act.flush(); });
  // Presence changes (their phone going away or coming back) repaint the line within a few seconds.
  setInterval(function () { var a = A(); if (a && a.unlocked) { paintSeen(); scanOwnSends(); watchReading(); if (Arten.built) Arten.position(); } }, 4000);

  function boot() {
    polishLock(); wrapSettings(); hookAlbum();
    var a = A();
    if (a && a.unlocked && !started) onUnlocked();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
  setTimeout(wrapSettings, 0);

  window.LeesV12 = {
    presenceLine: presenceLine, openActivity: openActivity, openReset: openReset, guide: Guide, arten: Arten, ask: search, log: function (k, d) { Act.log(k, d); },
    beforeSignOut: async function (why) { Act.log(why === "idle" ? "idle" : "signout"); clearArtenHistory(); await Act.flush(); },
    _act: Act, _usage: Usage, _kb: KB, maybeTip: maybeTip
  };
})();
