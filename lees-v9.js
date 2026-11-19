/* The Lees v9: rebuilt screens. Notifications, Journal, Calendar, Media, Blurred words, Send later,
   Clear conversation, the chat style studio, six home extras, lock-screen lines, stickers and emoji.
   Reaches the app only through window.LeesApp (index.html) and window.LeesFeatures (lees-v8.js). */
(function () {
  "use strict";
  var A = function () { return window.LeesApp; };
  var F = function () { return window.LeesFeatures || {}; };
  var $ = function (id) { return document.getElementById(id); };
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function btn(cls, text, fn, label) { var b = el("button", cls, text); b.type = "button"; if (label) b.setAttribute("aria-label", label); if (fn) b.addEventListener("click", fn); return b; }
  function svg(d) { return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + d + '"/></svg>'; }
  var I = {
    back: "M15 18l-6-6 6-6", next: "M9 6l6 6-6 6", close: "M18 6L6 18M6 6l12 12", search: "M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14zM21 21l-4.3-4.3",
    check: "M20 6L9 17l-5-5", plus: "M12 5v14M5 12h14", trash: "M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6", edit: "M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z",
    chat: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z", star: "M12 2l3 7 7 .6-5.3 4.7 1.6 7.2L12 17.8 5.7 21.5l1.6-7.2L2 9.6 9 9z",
    download: "M12 3v12M7 10l5 5 5-5M5 21h14", play: "M8 5.5v13l11-6.5z", pause: "M7 5h3.5v14H7zM13.5 5H17v14h-3.5z", more: "M5 12h.01M12 12h.01M19 12h.01",
    clock: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2", image: "M3 5h18v14H3zM8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM21 15l-5-5L5 19",
    smile: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM8 14s1.5 2 4 2 4-2 4-2M9 9.5h.01M15 9.5h.01", clip: "M21 11.5l-8.5 8.5a5 5 0 0 1-7-7L14 4.5a3.5 3.5 0 0 1 5 5L10.5 18a2 2 0 0 1-3-3L16 6.5",
    sun: "M12 4V2M12 22v-2M4 12H2M22 12h-2M5.6 5.6L4.2 4.2M19.8 19.8l-1.4-1.4M5.6 18.4l-1.4 1.4M19.8 4.2l-1.4 1.4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"
  };
  var reduce = function () { return !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches); };
  var still = function (f) { f.still = true; return f; };
  var day0 = function (t) { var d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
  var DAY = 864e5;
  function fmtDay(t) {
    var d0 = day0(Date.now()), d = day0(t);
    if (d === d0) return "Today";
    if (d === d0 - DAY) return "Yesterday";
    return new Date(t).toLocaleDateString([], { weekday: "long", day: "numeric", month: "long", year: new Date(t).getFullYear() !== new Date().getFullYear() ? "numeric" : undefined });
  }
  var hm = function (t) { return new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); };
  function avatar(side) { var a = el("div", "avatar " + String(side).toLowerCase(), side === "Lewis" ? "L" : "A"); a.dataset.side = side; return a; }
  function seg(options, value, onPick, cls) {
    var w = el("div", "v9-seg" + (cls ? " " + cls : ""));
    w.setAttribute("role", "tablist");
    options.forEach(function (o) {
      var b = btn("v9-seg-b" + (o[0] === value ? " on" : ""), "", function () { w.querySelectorAll(".v9-seg-b").forEach(function (x) { x.classList.toggle("on", x === b); x.setAttribute("aria-selected", String(x === b)); }); onPick(o[0]); });
      b.setAttribute("role", "tab"); b.setAttribute("aria-selected", String(o[0] === value));
      b.appendChild(el("span", "", o[1]));
      if (o[2]) b.appendChild(el("em", "", String(o[2])));
      w.appendChild(b);
    });
    return w;
  }
  function msgs() { var a = A(); return a.thread().filter(function (m) { return !m.deleted && !(m.deletedFor || []).includes(a.me); }); }

  /* ======================= Notifications ======================= */
  var NAV = {
    letter: function () { if (F().openLetters) F().openLetters("in"); }, game: function () { if (F().openGame) F().openGame(); },
    award: function () { if (F().openCabinet) F().openCabinet(); }, love: function () { A().openChat(); }, journal: function () { openJournal(); },
    message: function () { A().openChat(); }
  };
  var KIND_LABEL = { message: "Message", letter: "Letter", game: "Game", love: "Thinking of you", award: "Award", journal: "Journal", info: "Update" };
  function openNotifications() {
    var a = A(), tab = "all";
    a.openPanel("Notifications", "Everything from " + a.name(a.other), still(function (body) {
      body.classList.add("v9");
      var cut = (a.seen || {})[a.me] || 0;
      var feed = a.feedAll().filter(function (f) { return f.kind !== "message"; }).map(function (f) { return { kind: f.kind, title: f.title, detail: f.detail, at: f.at, unread: !f.read, side: f.side, id: f.id }; });
      var mine = msgs().filter(function (m) { return m.from && m.from !== a.me; }).slice(-80).map(function (m) { return { kind: "message", title: a.name(m.from), detail: a.previewOf(m), at: m.ts, unread: m.ts > cut, side: m.from, mid: m.id }; });
      var all = feed.concat(mine).sort(function (x, y) { return y.at - x.at; });
      var count = function (k) { return all.filter(function (x) { return (k === "all" || (k === "unread" ? x.unread : x.kind === k)); }).length; };
      var head = el("div", "v9-nhead");
      var unreadN = count("unread");
      var summary = el("div", "v9-nsum");
      summary.append(el("b", "", unreadN ? unreadN + " new" : "You're up to date"), el("span", "", all.length + " in the last while"));
      var markAll = btn("v9-link", "Mark all read", function () {
        a.feedSave(a.feedAll().map(function (f) { f.read = true; return f; }));
        Promise.resolve(a.markSeen && a.markSeen()).then(function () { a.renderPanel(); });
      });
      if (!unreadN) markAll.disabled = true;
      head.append(summary, markAll);
      body.appendChild(head);
      // Ready letters are pinned at the top until they're opened
      var ready = (F()._d && F()._d.env || []).filter(function (e) { return e.to === a.me && !e.openedAt && e.openAt <= Date.now(); });
      ready.forEach(function (e) {
        var pin = btn("v9-pin", "", function () { NAV.letter(); });
        pin.innerHTML = '<span class="v9-pin-ic">' + svg("M3 5h18v14H3zM3 7l9 6 9-6") + '</span>';
        var t = el("div", "v9-pin-t"); t.append(el("b", "", "A sealed letter is ready"), el("span", "", (e.title || "From " + a.name(e.from)) + " · tap to open"));
        pin.appendChild(t);
        body.appendChild(pin);
      });
      var tabs = seg([["all", "All"], ["unread", "New", unreadN || ""], ["message", "Messages"], ["letter", "Letters"], ["game", "Games"], ["love", "Love"]], tab, function (k) { tab = k; draw(); }, "scroll");
      body.appendChild(tabs);
      var list = el("div", "v9-nlist");
      body.appendChild(list);
      function draw() {
        list.textContent = "";
        var items = all.filter(function (x) { return tab === "all" || (tab === "unread" ? x.unread : x.kind === tab); });
        if (!items.length) {
          var e = el("div", "v9-empty");
          e.innerHTML = '<span class="v9-empty-ic">' + svg("M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0") + "</span>";
          e.append(el("b", "", tab === "unread" ? "Nothing new" : "Nothing here yet"), el("span", "", "Messages, letters, games and nudges from " + a.name(a.other) + " all land here."));
          list.appendChild(e);
          return;
        }
        var lastDay = "";
        items.slice(0, 120).forEach(function (x) {
          var d = fmtDay(x.at);
          if (d !== lastDay) { list.appendChild(el("div", "v9-day mono", d)); lastDay = d; }
          var row = btn("v9-n k-" + x.kind + (x.unread ? " unread" : ""), "", function () { (NAV[x.kind] || NAV.message)(); });
          var ic = el("div", "v9-n-ic");
          ic.appendChild(avatar(x.side || a.other));
          var badge = el("span", "v9-n-badge"); badge.innerHTML = svg({ message: I.chat, letter: "M3 5h18v14H3zM3 7l9 6 9-6", game: "M9 3v18M15 3v18M3 9h18M3 15h18", love: "M12 21s-7.5-4.6-9.6-9.3C.8 8 3 4.5 6.6 4.5c2.1 0 3.6 1.1 5.4 3.1 1.8-2 3.3-3.1 5.4-3.1 3.6 0 5.8 3.5 4.2 7.2C19.5 16.4 12 21 12 21z", award: "M12 3a6 6 0 1 0 0 12 6 6 0 0 0 0-12zM8.5 14L7 22l5-3 5 3-1.5-8", journal: "M2 5.5C4.5 4 7.5 4 11 5.5V20c-3.5-1.5-6.5-1.5-9 0zM22 5.5C19.5 4 16.5 4 13 5.5V20c3.5-1.5 6.5-1.5 9 0z" }[x.kind] || I.chat);
          ic.appendChild(badge);
          var tx = el("div", "v9-n-tx");
          var top = el("div", "v9-n-top");
          top.append(el("b", "", x.title), el("time", "mono", hm(x.at)));
          tx.append(top, el("span", "v9-n-kind", KIND_LABEL[x.kind] || "Update"));
          if (x.detail) tx.appendChild(el("p", "", x.detail));
          row.append(ic, tx);
          list.appendChild(row);
        });
      }
      draw();
      a.fillAvatars();
      // Opening Notifications counts as seeing everything in the feed.
      setTimeout(function () { a.feedSave(a.feedAll().map(function (f) { f.read = true; return f; })); }, 1200);
    }));
  }

  /* ======================= Journal ======================= */
  function openJournal() {
    var a = A(), filter = "all", q = "";
    a.openPanel("Journal", "Kept between you", still(function (body) {
      body.classList.add("v9");
      var write = btn("v9-write", "", function () { composeJournal(); });
      write.innerHTML = '<span class="v9-write-ic">' + svg(I.edit) + '</span><span><b>Write in the journal</b><small>A page for today. ' + a.name(a.other) + ' reads it too.</small></span>';
      body.appendChild(write);
      var bar = el("div", "v9-jbar");
      var sb = el("label", "v9-search"); sb.innerHTML = svg(I.search);
      var si = el("input"); si.type = "search"; si.placeholder = "Search the journal"; si.setAttribute("aria-label", "Search the journal");
      si.addEventListener("input", function () { q = si.value.trim().toLowerCase(); draw(); });
      sb.appendChild(si);
      bar.appendChild(sb);
      body.appendChild(bar);
      var entries = a.journal.slice(), notes = a.notes().slice();
      body.appendChild(seg([["all", "All", entries.length || ""], ["me", "Mine"], ["them", a.name(a.other)], ["notes", "Notes", notes.length || ""]], filter, function (k) { filter = k; draw(); }, "scroll"));
      var list = el("div", "v9-jlist");
      body.appendChild(list);
      function draw() {
        list.textContent = "";
        var items;
        if (filter === "notes") items = notes.map(function (n) { return { note: true, id: n.id, from: n.from, text: n.text, ts: n.ts, kind: n.kind, edited: n.edited }; });
        else items = entries.filter(function (e) { return filter === "all" || (filter === "me" ? e.from === a.me : e.from !== a.me); });
        if (q) items = items.filter(function (e) { return String(e.text).toLowerCase().indexOf(q) >= 0; });
        items.sort(function (x, y) { return y.ts - x.ts; });
        if (!items.length) {
          var e = el("div", "v9-empty");
          e.innerHTML = '<span class="v9-empty-ic">' + svg("M2 5.5C4.5 4 7.5 4 11 5.5V20c-3.5-1.5-6.5-1.5-9 0zM22 5.5C19.5 4 16.5 4 13 5.5V20c3.5-1.5 6.5-1.5 9 0z") + "</span>";
          e.append(el("b", "", q ? "No page matches that" : "No pages yet"), el("span", "", q ? "Try another word." : "Write the first one. It stays here for both of you."));
          list.appendChild(e);
          return;
        }
        var lastMonth = "";
        items.forEach(function (it) {
          var mo = new Date(it.ts).toLocaleDateString([], { month: "long", year: "numeric" });
          if (mo !== lastMonth) { list.appendChild(el("div", "v9-day mono", mo)); lastMonth = mo; }
          list.appendChild(journalCard(it));
        });
        a.fillAvatars();
      }
      function journalCard(it) {
        var c = el("article", "v9-page" + (it.from === a.me ? " mine" : ""));
        var h = el("header", "v9-page-h");
        h.appendChild(avatar(it.from));
        var who = el("div", "v9-page-who");
        who.append(el("b", "", it.from === a.me ? "You" : a.name(it.from)), el("span", "mono", new Date(it.ts).toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" }) + " · " + hm(it.ts) + (it.edited ? " · edited" : "")));
        h.appendChild(who);
        var tag = el("span", "v9-tag", it.note ? (it.kind === "gratitude" ? "Grateful" : it.kind === "wish" ? "A wish" : "Note") : it.kind === "diary" ? "Diary" : "Quick note");
        h.appendChild(tag);
        if (it.from === a.me) {
          var menu = btn("v9-more", "", function () {
            a.choiceSheet({ title: it.note ? "This note" : "This page", options: [["edit", "Edit", "Change the words"], ["delete", "Delete", "Removes it for both of you"]], value: "" }).then(async function (v) {
              if (v === "edit") { if (it.note) composeNote(it); else composeJournal(it); }
              if (v === "delete") {
                if (!(await a.centredBanner({ title: "Delete this " + (it.note ? "note" : "page") + "?", desc: "It disappears from the journal on both sides.", okLabel: "Delete" }))) return;
                if (it.note) await a.removeNote(it.id); else await a.deleteJournal(it.id);
                await a.reloadJournal(); a.renderPanel(); a.notice("Deleted", "", { kind: "success" });
              }
            });
          }, "Options");
          menu.innerHTML = svg(I.more);
          h.appendChild(menu);
        }
        c.appendChild(h);
        var t = el("div", "v9-page-text", it.text);
        c.appendChild(t);
        if (String(it.text).length > 420) {
          c.classList.add("long");
          var more = btn("v9-link", "Read all", function () { c.classList.toggle("open"); more.textContent = c.classList.contains("open") ? "Show less" : "Read all"; });
          c.appendChild(more);
        }
        return c;
      }
      draw();
    }));
  }
  function composeJournal(existing) {
    var a = A();
    var key = "v9-jdraft-" + a.me;
    var draft = existing ? { text: existing.text, kind: existing.kind || "diary" } : a.store.get(key, { text: "", kind: "diary" });
    a.openPanel(existing ? "Edit page" : "New page", new Date().toLocaleDateString([], { weekday: "long", day: "numeric", month: "long" }), still(function (body) {
      body.classList.add("v9");
      body.appendChild(seg([["diary", "Diary page"], ["note", "Quick note"]], draft.kind, function (k) { draft.kind = k; save(); }));
      var paper = el("div", "v8-paper edit v9-jpaper");
      var dateLine = el("div", "mono v9-jdate", new Date(existing ? existing.ts : Date.now()).toLocaleDateString([], { weekday: "long", day: "numeric", month: "long", year: "numeric" }));
      var ta = el("textarea", "v8-body");
      ta.placeholder = "Dear journal,\n\n";
      ta.value = draft.text; ta.maxLength = 10000;
      ta.setAttribute("aria-label", "Journal page");
      var prompts = el("div", "v8-chips");
      ["Today I'm grateful for…", "Something that made me smile…", "I want us to…", "What I learned today…", "I'm looking forward to…"].forEach(function (p) {
        prompts.appendChild(btn("chip", p, function () { ta.value = (ta.value ? ta.value.replace(/\s*$/, "\n\n") : "") + p + " "; ta.focus(); fit(); draft.text = ta.value; save(); }));
      });
      var count = el("div", "v8-count mono");
      var fit = function () { ta.style.height = "auto"; ta.style.height = Math.max(260, ta.scrollHeight) + "px"; count.textContent = ta.value.trim() ? ta.value.trim().split(/\s+/).length + " words" : ""; };
      var save = function () { if (!existing) a.store.set(key, draft); };
      ta.addEventListener("input", function () { draft.text = ta.value; save(); fit(); });
      paper.append(dateLine, ta, el("p", "v8-sign", "— " + a.name(a.me)));
      body.append(prompts, paper, count);
      var go = btn("btn wide v9-save", existing ? "Save changes" : "Add to the journal", async function () {
        var t = ta.value.trim();
        if (!t) { a.notice("Write something first", "", { error: true }); ta.focus(); return; }
        go.disabled = true;
        var ok = existing ? await a.editJournal(existing.id, t, draft.kind) : await a.saveJournal(t, draft.kind);
        go.disabled = false;
        if (!ok) return;
        if (!existing) a.store.set(key, { text: "", kind: draft.kind });
        a.notice(existing ? "Page saved" : "Added to the journal", "", { kind: "success" });
        a.goBack();
        a.renderPanel();
      });
      body.appendChild(go);
      setTimeout(fit, 0);
    }));
  }
  function composeNote(n) {
    var a = A();
    a.formPanel({ title: "Edit note", fields: [{ key: "t", label: "Note", value: n.text }], submit: "Save", validate: function (v) { return v.t.trim() ? null : "Write something."; } }).then(async function (v) {
      if (!v) return; await a.saveNoteEdit(n.id, v.t.trim()); a.renderPanel();
    });
  }

  /* ======================= Calendar ======================= */
  var calCursor = null, calSel = null;
  function openCalendar() {
    var a = A();
    if (!calCursor) { calCursor = new Date(); calCursor.setDate(1); }
    if (!calSel) calSel = day0(Date.now());
    a.openPanel("Calendar", "Your days together", still(function (body) {
      body.classList.add("v9");
      var all = msgs();
      var byDay = {};
      all.forEach(function (m) { var k = day0(m.ts); var d = byDay[k] || (byDay[k] = { n: 0, photos: [], mine: 0, theirs: 0, list: [] }); d.n++; if (m.from === a.me) d.mine++; else d.theirs++; if (m.kind === "image" && m.mid) d.photos.push(m); d.list.push(m); });
      var jByDay = {}; a.journal.forEach(function (j) { var k = day0(j.ts); (jByDay[k] = jByDay[k] || []).push(j); });
      var env = (F()._d && F()._d.env) || [];
      var lByDay = {}; env.forEach(function (e) { var k = day0(e.openAt); (lByDay[k] = lByDay[k] || []).push(e); });
      var maxN = 1; Object.keys(byDay).forEach(function (k) { maxN = Math.max(maxN, byDay[k].n); });
      var head = el("div", "v9-calhead");
      var title = el("div", "v9-caltitle");
      var prev = btn("v9-icb", "", function () { calCursor = new Date(calCursor.getFullYear(), calCursor.getMonth() - 1, 1); draw(); }, "Previous month"); prev.innerHTML = svg(I.back);
      var next = btn("v9-icb", "", function () { calCursor = new Date(calCursor.getFullYear(), calCursor.getMonth() + 1, 1); draw(); }, "Next month"); next.innerHTML = svg(I.next);
      var today = btn("v9-pill", "Today", function () { calCursor = new Date(); calCursor.setDate(1); calSel = day0(Date.now()); draw(); });
      head.append(prev, title, next, today);
      body.appendChild(head);
      var stats = el("div", "v9-calstats");
      body.appendChild(stats);
      var grid = el("div", "v9-cal");
      grid.setAttribute("role", "grid");
      body.appendChild(grid);
      var legend = el("div", "v9-legend");
      legend.innerHTML = '<span><i class="lg-m"></i>Messages</span><span><i class="lg-p"></i>Photos</span><span><i class="lg-j"></i>Journal</span><span><i class="lg-l"></i>Letter</span>';
      body.appendChild(legend);
      var detail = el("div", "v9-calday");
      body.appendChild(detail);
      var mem = el("div", "");
      body.appendChild(mem);
      var x0 = null;
      grid.addEventListener("pointerdown", function (e) { x0 = e.clientX; });
      grid.addEventListener("pointerup", function (e) { if (x0 == null) return; var dx = e.clientX - x0; x0 = null; if (Math.abs(dx) > 60) (dx < 0 ? next : prev).click(); });
      function draw() {
        var y = calCursor.getFullYear(), mo = calCursor.getMonth();
        title.textContent = "";
        title.append(el("b", "", calCursor.toLocaleDateString([], { month: "long" })), el("span", "", String(y)));
        grid.textContent = "";
        var wk = [];
        for (var w = 0; w < 7; w++) wk.push(new Date(2024, 0, 7 + w).toLocaleDateString([], { weekday: "narrow" }));
        wk.forEach(function (d) { grid.appendChild(el("div", "v9-dow", d)); });
        var pad = new Date(y, mo, 1).getDay(), days = new Date(y, mo + 1, 0).getDate();
        for (var i = 0; i < pad; i++) grid.appendChild(el("div", "v9-cpad"));
        var monthN = 0, monthPhotos = 0, busiest = null;
        for (var d = 1; d <= days; d++) (function (d) {
          var k = new Date(y, mo, d).getTime(), info = byDay[k];
          var c = btn("v9-cday" + (k === day0(Date.now()) ? " today" : "") + (k === calSel ? " sel" : "") + (k > Date.now() ? " future" : ""), "", function () { calSel = k; draw(); });
          c.setAttribute("aria-label", new Date(k).toDateString() + (info ? ", " + info.n + " messages" : ""));
          c.appendChild(el("span", "n", String(d)));
          if (info) {
            var lvl = Math.min(4, Math.ceil(4 * info.n / maxN));
            c.dataset.heat = String(lvl);
            monthN += info.n; monthPhotos += info.photos.length;
            if (!busiest || info.n > busiest.n) busiest = { d: d, n: info.n };
          }
          var dots = el("span", "dots");
          if (info) dots.appendChild(el("i", "lg-m"));
          if (info && info.photos.length) dots.appendChild(el("i", "lg-p"));
          if (jByDay[k]) dots.appendChild(el("i", "lg-j"));
          if (lByDay[k]) dots.appendChild(el("i", "lg-l"));
          c.appendChild(dots);
          grid.appendChild(c);
        })(d);
        stats.textContent = "";
        [[monthN, "messages"], [monthPhotos, "photos"], [busiest ? new Date(y, mo, busiest.d).toLocaleDateString([], { day: "numeric", month: "short" }) : "—", "busiest day"]].forEach(function (s) { var b = el("div", "v9-stat"); b.append(el("b", "", String(s[0])), el("span", "", s[1])); stats.appendChild(b); });
        drawDay();
      }
      function drawDay() {
        detail.textContent = "";
        var k = calSel, info = byDay[k], js = jByDay[k] || [], ls = lByDay[k] || [];
        var h = el("div", "v9-calday-h");
        h.append(el("b", "", fmtDay(k)), el("span", "mono", info ? info.n + " messages · " + info.mine + " yours · " + info.theirs + " from " + a.name(a.other) : "No messages"));
        detail.appendChild(h);
        if (info && info.photos.length) {
          var strip = el("div", "v9-strip");
          info.photos.slice(0, 12).forEach(function (m) { var t = btn("v9-thumb", "", function () { viewPhoto(m.id); }, "Open photo"); var im = new Image(); im.alt = ""; a.mediaURL(m.mid).then(function (u) { if (u) im.src = u; }); t.appendChild(im); strip.appendChild(t); });
          detail.appendChild(strip);
        }
        if (info) {
          var ul = el("div", "v9-daylist");
          info.list.slice(0, 6).forEach(function (m) { var r = el("div", "v9-dl"); r.append(el("time", "mono", hm(m.ts)), el("b", "", m.from === a.me ? "You" : a.name(m.from)), el("span", "", a.previewOf(m))); ul.appendChild(r); });
          if (info.list.length > 6) ul.appendChild(el("div", "v9-more-n", "+" + (info.list.length - 6) + " more"));
          detail.appendChild(ul);
        }
        js.forEach(function (j) { var r = el("div", "v9-dl j"); r.append(el("time", "mono", hm(j.ts)), el("b", "", "Journal"), el("span", "", String(j.text).slice(0, 90))); detail.appendChild(r); });
        ls.forEach(function (l) { var r = el("div", "v9-dl l"); r.append(el("time", "mono", hm(l.openAt)), el("b", "", "Letter"), el("span", "", (l.title || "Sealed letter") + (l.openAt > Date.now() ? " opens" : " opened"))); detail.appendChild(r); });
        var acts = el("div", "v9-row");
        if (info) acts.appendChild(btn("btn", "Open the chat at this day", function () { a.openChatAt(k, k + DAY); }));
        if (k >= day0(Date.now())) acts.appendChild(btn("btn ghost", "Seal a letter for this day", function () { if (F().openLetters) F().openLetters("out"); }));
        detail.appendChild(acts);
        // On this day, in earlier months and years
        mem.textContent = "";
        var dd = new Date(k), past = [];
        Object.keys(byDay).forEach(function (kk) { var x = new Date(Number(kk)); if (x.getDate() === dd.getDate() && Number(kk) < k) past.push(Number(kk)); });
        if (past.length) {
          mem.appendChild(el("div", "v9-day mono", "On this day before"));
          past.sort(function (p, q) { return q - p; }).slice(0, 4).forEach(function (pk) {
            var m0 = byDay[pk].list[0];
            var r = btn("v9-mem", "", function () { calCursor = new Date(pk); calCursor.setDate(1); calSel = pk; draw(); });
            r.append(el("b", "", new Date(pk).toLocaleDateString([], { month: "long", year: "numeric" })), el("span", "", byDay[pk].n + " messages · “" + a.previewOf(m0).slice(0, 60) + "”"));
            mem.appendChild(r);
          });
        }
      }
      draw();
    }));
  }

  /* ======================= Media ======================= */
  function mediaList(kind) { return msgs().filter(function (m) { return m.mid && !m.archived && !m.once && m.kind === kind; }).sort(function (x, y) { return y.ts - x.ts; }); }
  var mediaTab = "image";
  function openMedia() {
    var a = A();
    a.openPanel("Media", "Everything you've shared", still(function (body) {
      body.classList.add("v9");
      var photos = mediaList("image"), vids = mediaList("video"), voice = mediaList("audio");
      body.appendChild(seg([["image", "Photos", photos.length || ""], ["video", "Videos", vids.length || ""], ["audio", "Voice", voice.length || ""]], mediaTab, function (k) { mediaTab = k; draw(); }));
      var box = el("div", "v9-media");
      body.appendChild(box);
      function draw() {
        box.textContent = "";
        var items = mediaTab === "image" ? photos : mediaTab === "video" ? vids : voice;
        if (!items.length) {
          var e = el("div", "v9-empty");
          e.innerHTML = '<span class="v9-empty-ic">' + svg(mediaTab === "audio" ? "M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM19 11a7 7 0 0 1-14 0M12 18v3" : I.image) + "</span>";
          e.append(el("b", "", "Nothing here yet"), el("span", "", mediaTab === "audio" ? "Voice notes you send each other collect here." : "Photos and videos from the chat collect here."));
          box.appendChild(e); return;
        }
        var lastMonth = "", grid = null;
        items.forEach(function (m) {
          var mo = new Date(m.ts).toLocaleDateString([], { month: "long", year: "numeric" });
          if (mo !== lastMonth) { box.appendChild(el("div", "v9-day mono", mo)); lastMonth = mo; grid = el("div", mediaTab === "audio" ? "v9-vlist" : "v9-grid"); box.appendChild(grid); }
          if (mediaTab === "audio") grid.appendChild(voiceRow(m));
          else {
            var t = btn("v9-cell", "", function () { if (m.kind === "image") viewPhoto(m.id); else viewVideo(m); }, (m.from === a.me ? "Your " : a.name(m.from) + "'s ") + (m.kind === "image" ? "photo" : "video"));
            if (m.kind === "image") { var im = new Image(); im.alt = ""; im.loading = "lazy"; a.mediaURL(m.mid).then(function (u) { if (u) im.src = u; }); t.appendChild(im); }
            else { var v = document.createElement("video"); v.muted = true; v.preload = "metadata"; v.playsInline = true; a.mediaURL(m.mid).then(function (u) { if (u) v.src = u + "#t=0.1"; }); t.appendChild(v); t.appendChild(el("span", "v9-cell-play")); if (m.dur) t.appendChild(el("span", "v9-cell-len mono", a.fmtDur(m.dur))); }
            if (m.moment) t.appendChild(el("span", "v9-cell-star", "★"));
            grid.appendChild(t);
          }
        });
      }
      draw();
    }));
  }
  function voiceRow(m) {
    var a = A();
    var r = el("div", "v9-vrow");
    var au = new Audio(); au.preload = "none";
    var p = btn("v9-vplay", "", null, "Play"); p.innerHTML = svg(I.play);
    var t = el("div", "v9-vtx");
    t.append(el("b", "", m.from === a.me ? "You" : a.name(m.from)), el("span", "mono", new Date(m.ts).toLocaleDateString([], { day: "numeric", month: "short" }) + " · " + hm(m.ts) + " · " + a.fmtDur(m.dur || 0)));
    var bar = el("div", "v9-vbar"); var fill = el("i"); bar.appendChild(fill);
    t.appendChild(bar);
    if (m.transcript) t.appendChild(el("p", "v9-vtr", m.transcript));
    var go = btn("v9-icb", "", function () { a.openChatAt(day0(m.ts), day0(m.ts) + DAY); }, "Show in chat"); go.innerHTML = svg(I.chat);
    r.append(p, t, go);
    p.addEventListener("click", async function () {
      if (!au.src) { var u = await a.mediaURL(m.mid); if (!u) { a.notice("Couldn't load that voice note", "", { error: true }); return; } au.src = u; }
      if (au.paused) { document.querySelectorAll(".v9-vrow audio").forEach(function () {}); au.play().catch(function () {}); } else au.pause();
    });
    au.addEventListener("play", function () { p.innerHTML = svg(I.pause); r.classList.add("on"); });
    au.addEventListener("pause", function () { p.innerHTML = svg(I.play); r.classList.remove("on"); });
    au.addEventListener("timeupdate", function () { var d = isFinite(au.duration) ? au.duration : (m.dur || 1); fill.style.width = Math.min(100, 100 * au.currentTime / d) + "%"; });
    r.appendChild(au);
    return r;
  }
  // Full-screen photo viewer: swipe or arrow keys between photos, with Show in chat, Save, Moment and Delete.
  function viewPhoto(id, src, ids) {
    var a = A();
    var list = mediaList("image").slice().reverse();
    if (Array.isArray(ids) && ids.length) { list = ids.map(function (x) { return a.thread().find(function (m) { return m.id === x; }); }).filter(Boolean); }
    var i = list.findIndex(function (m) { return m.id === id; });
    if (i < 0) { if (src) { list = [{ id: id, src: src, ts: Date.now(), from: a.me }]; i = 0; } else if (list.length) i = 0; else return; }
    var ov = el("div", "v9-viewer");
    ov.setAttribute("role", "dialog"); ov.setAttribute("aria-label", "Photo");
    var top = el("div", "v9-vw-top");
    var who = el("div", "v9-vw-who");
    var close = btn("v9-vw-b", "", function () { shut(); }, "Close"); close.innerHTML = svg(I.close);
    top.append(close, who);
    var stage = el("div", "v9-vw-stage");
    var img = new Image(); img.alt = "Photo"; img.draggable = false;
    stage.appendChild(img);
    var bar = el("div", "v9-vw-bar");
    var showB = btn("v9-vw-a", "", function () { var m = list[i]; shut(); a.openChatAt(day0(m.ts), day0(m.ts) + DAY); }); showB.innerHTML = svg(I.chat) + "<span>Show in chat</span>";
    var saveB = btn("v9-vw-a", "", async function () { var m = list[i]; var u = img.src; try { var b = await (await fetch(u)).blob(); var url = URL.createObjectURL(b); var l = document.createElement("a"); l.href = url; l.download = "the-lees-" + new Date(m.ts).toISOString().slice(0, 10) + ".jpg"; document.body.appendChild(l); l.click(); l.remove(); setTimeout(function () { URL.revokeObjectURL(url); }, 2000); } catch (e) { a.notice("Couldn't save", "", { error: true }); } }); saveB.innerHTML = svg(I.download) + "<span>Save</span>";
    var starB = btn("v9-vw-a", "", async function () { var m = list[i]; if (!m.id || !a.setMoment) return; await a.setMoment(m.id, !m.moment); m.moment = !m.moment; paint(); });
    var delB = btn("v9-vw-a danger", "", async function () {
      var m = list[i];
      var v = await a.choiceSheet({ title: "Delete this photo?", options: [["me", "Delete for me", a.name(a.other) + " still has it"], ["both", "Delete for both", "Shows as deleted for both of you"]], value: "" });
      if (!v) return;
      if (v === "me") await a.deleteForMe(m.id); else await a.deleteForEveryone(m.id);
      list.splice(i, 1);
      if (!list.length) { shut(); return; }
      i = Math.min(i, list.length - 1); paint();
    }); delB.innerHTML = svg(I.trash) + "<span>Delete</span>";
    var cur = function () { var m = list[i]; return (m && m.id && a.thread().find(function (x) { return x.id === m.id; })) || m; };
    var likeB = btn("v9-vw-a", "", async function () { var m = cur(); if (!m || !m.id || String(m.id).indexOf("local-") === 0) return; a.haptic("heart"); await a.toggleHeart(m.id); paint(); });
    var replyB = btn("v9-vw-a", "", function () { var m = cur(); if (!m || !m.id) return; shut(); a.openChat(); setTimeout(function () { a.setReply(m); }, 60); }); replyB.innerHTML = svg("M9 17l-5-5 5-5M20 18v-2a4 4 0 0 0-4-4H4") + "<span>Reply</span>";
    var fwdB = btn("v9-vw-a", "", function () { var m = cur(); if (m && m.id && a.forwardSheet) a.forwardSheet([m]); }); fwdB.innerHTML = svg("M15 17l5-5-5-5M4 18v-2a4 4 0 0 1 4-4h12") + "<span>Forward</span>";
    bar.append(likeB, replyB, fwdB, saveB, starB, delB, showB);
    var count = el("div", "v9-vw-count mono");
    ov.append(top, stage, count, bar);
    document.body.appendChild(ov);
    function paint() {
      var m = list[i];
      who.textContent = "";
      who.append(el("b", "", m.from === a.me ? "You" : a.name(m.from)), el("span", "", fmtDay(m.ts) + ", " + hm(m.ts)));
      count.textContent = list.length > 1 ? (i + 1) + " / " + list.length : "";
      starB.innerHTML = svg(I.star) + "<span>" + (m.moment ? "Moment ★" : "Moment") + "</span>";
      var live = cur(), liked = live && a.likedByMe && a.likedByMe(live), hc = live && a.heartCount ? a.heartCount(live) : 0;
      likeB.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z"/></svg><span>' + (liked ? "Loved" : "Love") + (hc ? " · " + hc : "") + "</span>";
      likeB.classList.toggle("liked", !!liked);
      starB.classList.toggle("on", !!m.moment);
      if (m.src) img.src = m.src; else a.mediaURL(m.mid).then(function (u) { if (u && list[i] === m) img.src = u; });
    }
    var x0 = null;
    stage.addEventListener("pointerdown", function (e) { x0 = e.clientX; });
    stage.addEventListener("pointerup", function (e) { if (x0 == null) return; var dx = e.clientX - x0; x0 = null; if (dx < -50 && i < list.length - 1) { i++; paint(); } else if (dx > 50 && i > 0) { i--; paint(); } });
    var key = function (e) { if (e.key === "Escape") { e.stopPropagation(); e.preventDefault(); shut(); } if (e.key === "ArrowRight" && i < list.length - 1) { i++; paint(); } if (e.key === "ArrowLeft" && i > 0) { i--; paint(); } };
    document.addEventListener("keydown", key, true);
    function shut() { document.removeEventListener("keydown", key, true); ov.classList.add("out"); setTimeout(function () { ov.remove(); }, 200); }
    paint();
    requestAnimationFrame(function () { ov.classList.add("in"); });
    close.focus();
  }
  function viewVideo(m) {
    var a = A();
    var ov = el("div", "v9-viewer in");
    var top = el("div", "v9-vw-top");
    var key = function (e) { if (e.key === "Escape") { e.stopPropagation(); shutV(); } };
    var shutV = function () { document.removeEventListener("keydown", key, true); v.pause(); ov.remove(); };
    document.addEventListener("keydown", key, true);
    var close = btn("v9-vw-b", "", function () { shutV(); }, "Close"); close.innerHTML = svg(I.close);
    var who = el("div", "v9-vw-who"); who.append(el("b", "", m.from === a.me ? "You" : a.name(m.from)), el("span", "", fmtDay(m.ts) + ", " + hm(m.ts)));
    top.append(close, who);
    var stage = el("div", "v9-vw-stage");
    var v = document.createElement("video"); v.controls = true; v.playsInline = true; v.autoplay = true;
    a.mediaURL(m.mid).then(function (u) { if (u) v.src = u; });
    stage.appendChild(v);
    ov.append(top, stage);
    document.body.appendChild(ov);
    close.focus();
  }

  /* ======================= Blurred words ======================= */
  var OFF = "~";
  function openWords() {
    var a = A(), tab = "yours", q = "";
    a.openPanel("Blurred words", "Blurred in the chat until you hold to read", still(function (body) {
      body.classList.add("v9");
      var yours = function () { return (a.S(a.me).blurWords || []).filter(function (w) { return w.indexOf(OFF) !== 0; }); };
      var offSet = function () { return new Set((a.S(a.me).blurWords || []).filter(function (w) { return w.indexOf(OFF) === 0; }).map(function (w) { return w.slice(1); })); };
      var persist = function (mine, off) { a.setS(a.me, { blurWords: mine.concat(Array.from(off).map(function (w) { return OFF + w; })) }); a.render(); };
      var intro = el("p", "v9-intro", "Words here are blurred in your view of the chat. Hold a blurred message to read it.");
      body.appendChild(intro);
      var add = el("form", "v9-addword");
      var inp = el("input", "in plain"); inp.placeholder = "Add a word or phrase"; inp.maxLength = 40; inp.setAttribute("aria-label", "Add a word or phrase");
      var go = btn("btn", "Add"); go.type = "submit";
      add.append(inp, go);
      add.addEventListener("submit", function (e) {
        e.preventDefault();
        var w = inp.value.trim().toLowerCase();
        if (!w || w.indexOf(OFF) === 0) return;
        var mine = yours();
        if (mine.indexOf(w) >= 0) { a.notice("Already on your list", "", { kind: "info" }); return; }
        mine.push(w); persist(mine, offSet()); inp.value = ""; draw(); a.haptic("press");
      });
      body.appendChild(add);
      var tabsBox = el("div", "");
      body.appendChild(tabsBox);
      var list = el("div", "");
      body.appendChild(list);
      function draw() {
        tabsBox.textContent = "";
        var off = offSet();
        tabsBox.appendChild(seg([["yours", "Your words", yours().length || ""], ["built", "Built in", a.TERMS.length - off.size + " on"]], tab, function (k) { tab = k; q = ""; draw(); }));
        list.textContent = "";
        if (tab === "yours") {
          var mine = yours();
          if (!mine.length) { var e = el("div", "v9-empty small"); e.append(el("b", "", "No words of your own yet"), el("span", "", "Add any word above. It's blurred straight away.")); list.appendChild(e); return; }
          var chips = el("div", "v9-wchips");
          mine.sort().forEach(function (w) {
            var c = el("span", "v9-wchip");
            c.appendChild(el("span", "", w));
            var x = btn("", "", function () { persist(yours().filter(function (z) { return z !== w; }), offSet()); draw(); a.notice("Removed “" + w + "”", "", { kind: "success", action: { label: "Undo", run: function () { var m = yours(); m.push(w); persist(m, offSet()); draw(); } } }); }, "Remove " + w);
            x.innerHTML = svg(I.close);
            c.appendChild(x);
            chips.appendChild(c);
          });
          list.appendChild(chips);
        } else {
          var s = el("label", "v9-search"); s.innerHTML = svg(I.search);
          var si = el("input"); si.type = "search"; si.placeholder = "Find a built-in word"; si.value = q; si.setAttribute("aria-label", "Find a built-in word");
          s.appendChild(si);
          list.appendChild(s);
          var rows = el("div", "scard v9-wlist");
          list.appendChild(rows);
          var paintRows = function () {
            rows.textContent = "";
            var off2 = offSet();
            var shown = a.TERMS.filter(function (w) { return !q || w.indexOf(q) >= 0; }).slice(0, 120);
            shown.forEach(function (w) {
              var on = !off2.has(w);
              var r = btn("v9-wrow", "", function () { var o = offSet(); if (o.has(w)) o.delete(w); else o.add(w); persist(yours(), o); paintRows(); });
              r.setAttribute("role", "switch"); r.setAttribute("aria-checked", String(on));
              r.append(el("span", "", w), el("span", "sw8" + (on ? " on" : ""), ""));
              r.lastChild.innerHTML = "<i></i>";
              rows.appendChild(r);
            });
            if (!shown.length) rows.appendChild(el("p", "fp-desc", "No built-in word matches."));
          };
          si.addEventListener("input", function () { q = si.value.trim().toLowerCase(); paintRows(); });
          paintRows();
        }
      }
      draw();
    }));
  }

  /* ======================= Send later ======================= */
  var EFFECTS = [["none", "Plain"], ["hearts", "Hearts"], ["petals", "Petals"], ["glow", "Glow"]];
  var READY_LINES = ["Good morning, my love ☀️", "Good night, sleep well 🌙", "Thinking of you ❤️", "I'm proud of you.", "Can't wait to see you.", "Drink some water 💧"];
  function openSchedule() {
    var a = A();
    var typed = (a.draft || "").trim();
    var text = typed || READY_LINES[0], effect = "hearts", when = null, label = "";
    a.sheetOpen(function (body) {
      body.classList.add("v9-sheet");
      body.appendChild(el("h3", "fp-title", "Send later"));
      var prev = el("div", "v9-sprev");
      var bub = el("div", "v9-sbub");
      var bt = el("div", "", text);
      var meta = el("div", "v9-swhen mono", "Choose a time");
      bub.append(bt);
      prev.append(bub, meta);
      body.appendChild(prev);
      if (!typed) {
        body.appendChild(el("div", "v9-lab", "Message"));
        var lines = el("div", "v8-chips");
        READY_LINES.forEach(function (l) { var c = btn("chip" + (l === text ? " on" : ""), l, function () { text = l; bt.textContent = l; lines.querySelectorAll(".chip").forEach(function (x) { x.classList.toggle("on", x === c); }); }); lines.appendChild(c); });
        body.appendChild(lines);
        body.appendChild(el("p", "v9-hint", "Or type a message in the chat first, then hold Send."));
      }
      body.appendChild(el("div", "v9-lab", "When"));
      var now = new Date();
      var at = function (h, add) { var d = new Date(); d.setDate(d.getDate() + (add || 0)); d.setHours(h, 0, 0, 0); return d.getTime(); };
      var opts = [
        ["In 1 hour", Date.now() + 3600e3], ["Tonight, 9 pm", at(21, now.getHours() >= 21 ? 1 : 0)], ["Tomorrow, 7 am", at(7, 1)],
        ["Tomorrow, noon", at(12, 1)], ["In 3 days", Date.now() + 3 * DAY], ["In a week", Date.now() + 7 * DAY]
      ];
      var tg = el("div", "v9-tgrid");
      var dt = el("input", "in plain v9-dt"); dt.type = "datetime-local";
      var pick = function (t, l, b) {
        when = t; label = l;
        tg.querySelectorAll(".v9-tchip").forEach(function (x) { x.classList.toggle("on", x === b); });
        meta.textContent = "Arrives " + new Date(t).toLocaleString([], { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
        go.disabled = false;
      };
      opts.forEach(function (o) { var b = btn("v9-tchip", "", function () { pick(o[1], o[0], b); dt.value = ""; }); b.append(el("b", "", o[0]), el("small", "", new Date(o[1]).toLocaleString([], { weekday: "short", hour: "2-digit", minute: "2-digit" }))); tg.appendChild(b); });
      body.appendChild(tg);
      dt.addEventListener("input", function () { var t = Date.parse(dt.value); if (t > Date.now()) pick(t, "Custom", null); else { when = null; go.disabled = true; meta.textContent = "Pick a time in the future"; } });
      body.appendChild(dt);
      body.appendChild(el("div", "v9-lab", "Arrives with"));
      body.appendChild(seg(EFFECTS, effect, function (k) { effect = k; bub.dataset.fx = k; bub.classList.remove("pulse"); void bub.offsetWidth; bub.classList.add("pulse"); }));
      bub.dataset.fx = effect;
      var go = btn("btn wide v9-save", "Schedule it", async function () {
        if (!when) return;
        a.sheetClose();
        await a.scheduleText(when, effect, text);
      });
      go.disabled = true;
      body.appendChild(go);
      var n = a.sched().length;
      if (n) body.appendChild(btn("v9-link center", "See scheduled messages (" + n + ")", function () { a.sheetClose(); a.openScheduled(); }));
    });
  }

  /* ======================= Clear conversation ======================= */
  function ymd(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function openClear() {
    var a = A(), scope = "me", range = "7";
    a.openPanel("Clear conversation", "Tidy the chat safely", still(function (body) {
      body.classList.add("v9");
      body.appendChild(el("div", "v9-lab", "Clear it for"));
      var who = el("div", "v9-choice2");
      var mk = function (k, title, sub) {
        var b = btn("v9-c2" + (scope === k ? " on" : ""), "", function () { scope = k; who.querySelectorAll(".v9-c2").forEach(function (x) { x.classList.toggle("on", x === b); }); sum(); });
        b.append(el("b", "", title), el("span", "", sub));
        return b;
      };
      who.append(mk("me", "Just me", "Hidden on your side. " + a.name(a.other) + " keeps everything."), mk("both", "Both of us", "Hidden on both sides."));
      body.appendChild(who);
      body.appendChild(el("div", "v9-lab", "Which messages"));
      var custom = el("div", "v9-range hidden");
      var f1 = el("input", "in plain"); f1.type = "date"; f1.setAttribute("aria-label", "From");
      var f2 = el("input", "in plain"); f2.type = "date"; f2.setAttribute("aria-label", "To");
      custom.append(el("span", "", "From"), f1, el("span", "", "to"), f2);
      body.appendChild(seg([["1", "Today"], ["7", "7 days"], ["30", "30 days"], ["all", "Everything"], ["custom", "Pick dates"]], range, function (k) { range = k; custom.classList.toggle("hidden", k !== "custom"); sum(); }, "scroll"));
      body.appendChild(custom);
      [f1, f2].forEach(function (i) { i.addEventListener("input", sum); });
      var box = el("div", "v9-clsum");
      body.appendChild(box);
      var hold = el("button", "v9-hold");
      hold.type = "button";
      hold.innerHTML = '<i></i><span></span>';
      body.appendChild(hold);
      body.appendChild(el("p", "v9-hint center", "Messages are hidden, not destroyed. Hold the button to confirm, so nothing is cleared by accident."));
      function bounds() {
        var to = Date.now() + 1, from = 0, f = null, t = null;
        if (range === "custom") {
          if (!f1.value || !f2.value) return null;
          from = Date.parse(f1.value + "T00:00:00"); to = Date.parse(f2.value + "T00:00:00") + DAY; f = f1.value; t = f2.value;
          if (!(to > from)) return null;
        } else if (range !== "all") { from = day0(Date.now()) - (Number(range) - 1) * DAY; f = ymd(new Date(from)); t = ymd(new Date()); }
        return { from: from, to: to, f: f, t: t };
      }
      var target = 0;
      function sum() {
        var b = bounds();
        box.textContent = "";
        if (!b) { box.appendChild(el("span", "", "Choose both dates.")); hold.disabled = true; target = 0; hold.querySelector("span").textContent = "Choose a range"; return; }
        target = msgs().filter(function (m) { return m.ts >= b.from && m.ts < b.to; }).length;
        box.append(el("b", "", target + (target === 1 ? " message" : " messages")), el("span", "", (scope === "both" ? " will be hidden for both of you" : " will be hidden on your side") + (range === "all" ? " (everything)" : "")));
        hold.disabled = !target;
        hold.querySelector("span").textContent = target ? "Hold to clear " + target : "Nothing to clear";
      }
      var timer = 0, t0 = 0, raf = 0;
      var start = function (e) {
        if (hold.disabled) return;
        e.preventDefault();
        t0 = Date.now(); hold.classList.add("holding");
        var step = function () { var p = Math.min(1, (Date.now() - t0) / 1300); hold.querySelector("i").style.width = (p * 100) + "%"; if (p < 1) raf = requestAnimationFrame(step); };
        raf = requestAnimationFrame(step);
        timer = setTimeout(async function () {
          stop();
          var b = bounds(); if (!b) return;
          a.haptic("error");
          hold.disabled = true; hold.querySelector("span").textContent = "Clearing…";
          if (window.LeesHooks && LeesHooks.doClear) await LeesHooks.doClear({ scope: scope, all: range === "all", from: b.f, to: b.t });
          sum();
        }, 1300);
      };
      var stop = function () { clearTimeout(timer); cancelAnimationFrame(raf); hold.classList.remove("holding"); hold.querySelector("i").style.width = "0"; };
      hold.addEventListener("pointerdown", start);
      ["pointerup", "pointerleave", "pointercancel"].forEach(function (ev) { hold.addEventListener(ev, stop); });
      hold.addEventListener("keydown", function (e) { if ((e.key === "Enter" || e.key === " ") && !e.repeat) start(e); });
      hold.addEventListener("keyup", stop);
      sum();
    }));
  }

  /* ======================= Chat style studio ======================= */
  var BUBBLES = [["default", "Theme", null], ["rose", "Rose", "#f6d3de"], ["sage", "Sage", "#d7ebdd"], ["sky", "Sky", "#d6e7f5"], ["sand", "Sand", "#f0e2c8"]];
  function openStudio() {
    var a = A();
    var me = a.me, s0 = a.S(me);
    var st = Object.assign({ bubble: "default", size: "medium", corners: "round", wall: "none", dim: 0.25, wblur: 0 }, s0.chatStyle || {});
    var theme = s0.chatTheme || "";
    var ov = el("div", "v9-studio");
    ov.setAttribute("role", "dialog"); ov.setAttribute("aria-label", "Chat style");
    var top = el("div", "v9-st-top");
    var cancel = btn("v9-link", "Cancel", function () { shut(false); });
    var done = btn("v9-done", "Done", function () { shut(true); });
    top.append(cancel, el("b", "", "Chat style"), done);
    var pv = el("div", "v9-st-pv");
    var pvList = el("div", "v9-st-list");
    function mock() {
      pvList.textContent = "";
      [["theirs", "Hey you ❤️"], ["mine", "Look at our new chat!"], ["theirs", "I love it. Keep this one."]].forEach(function (r) { var row = el("div", "v9-st-row " + r[0]); row.appendChild(el("div", "v9-st-b", r[1])); pvList.appendChild(row); });
    }
    mock();
    pv.appendChild(pvList);
    var tabs = el("div", ""), panel = el("div", "v9-st-panel");
    ov.append(top, pv, tabs, panel);
    document.body.appendChild(ov);
    var wallUrl = null;
    async function paintPreview() {
      var t = theme ? a.resolvedTheme(theme) : a.resolvedTheme(a.SH().theme);
      pv.dataset.theme = t;
      pv.dataset.bubble = st.bubble;
      pv.dataset.size = st.size;
      pv.dataset.corners = st.corners;
      pv.style.setProperty("--wall-dim", String(st.dim));
      pv.style.setProperty("--wall-blur", st.wblur + "px");
      if (st.wall === "photo") {
        if (!wallUrl) { try { wallUrl = localStorage.getItem("pp-wall-" + me); } catch (e) {} }
        if (wallUrl) { pv.style.setProperty("--wall-img", 'url("' + wallUrl + '")'); pv.classList.add("has-wall"); return; }
      }
      pv.classList.remove("has-wall");
    }
    var tab = "themes";
    tabs.appendChild(seg([["themes", "Themes"], ["wall", "Wallpaper"], ["bubbles", "Bubbles & text"]], tab, function (k) { tab = k; drawPanel(); }));
    function drawPanel() {
      panel.textContent = "";
      if (tab === "themes") {
        var grid = el("div", "v9-st-themes");
        var opts = [{ id: "", name: "Same as the app" }].concat(a.THEMES);
        opts.forEach(function (t) {
          var c = btn("v9-st-th" + (theme === t.id ? " on" : ""), "", function () { theme = t.id; grid.querySelectorAll(".v9-st-th").forEach(function (x) { x.classList.toggle("on", x === c); }); paintPreview(); });
          var mini = el("div", "v9-st-mini");
          mini.dataset.theme = t.id ? a.resolvedTheme(t.id) : a.resolvedTheme(a.SH().theme);
          mini.innerHTML = "<i class='a'></i><i class='b'></i><i class='c'></i>";
          c.append(mini, el("span", "", t.name));
          grid.appendChild(c);
        });
        panel.appendChild(grid);
        var both = btn("v9-link center", "Use the chosen theme for the whole app (both of you)", function () { if (!theme) return; a.setSH({ theme: theme }); a.applyTheme(); a.notice("App theme changed", "Both of you see it now.", { kind: "success" }); });
        panel.appendChild(both);
      } else if (tab === "wall") {
        var row = el("div", "v9-st-walls");
        var none = btn("v9-st-wall" + (st.wall !== "photo" ? " on" : ""), "", function () { st.wall = "none"; drawPanel(); paintPreview(); });
        none.append(el("span", "v9-st-wnone"), el("span", "", "None"));
        var photo = btn("v9-st-wall" + (st.wall === "photo" ? " on" : ""), "", function () {
          var f = document.createElement("input"); f.type = "file"; f.accept = "image/*";
          f.addEventListener("change", async function () {
            var file = f.files && f.files[0]; if (!file) return;
            var data = await shrinkData(file, 1280);
            try { localStorage.setItem("pp-wall-" + me, data); } catch (e) { a.notice("Couldn't keep that photo", "It's too large for this device's storage. Try a smaller one.", { error: true }); return; }
            wallUrl = data;
            st.wall = "photo"; drawPanel(); paintPreview();
          });
          f.click();
        });
        var th = el("span", "v9-st-wphoto"); th.innerHTML = svg(I.image);
        photo.append(th, el("span", "", st.wall === "photo" ? "Change photo" : "Choose a photo"));
        row.append(none, photo);
        panel.appendChild(row);
        panel.appendChild(slider("Brightness", I.sun, 1 - st.dim, 0.2, 1, 0.01, function (v) { st.dim = Math.round((1 - v) * 100) / 100; paintPreview(); }));
        panel.appendChild(slider("Blur", I.image, st.wblur, 0, 16, 1, function (v) { st.wblur = v; paintPreview(); }));
        panel.appendChild(el("p", "v9-hint", "Wallpapers stay on this device. " + a.name(a.other) + " keeps their own."));
      } else {
        panel.appendChild(el("div", "v9-lab", "Bubble colour"));
        var bw = el("div", "v9-swrow");
        BUBBLES.forEach(function (b) {
          var c = btn("v9-swb" + (st.bubble === b[0] ? " on" : ""), "", function () { st.bubble = b[0]; bw.querySelectorAll(".v9-swb").forEach(function (x) { x.classList.toggle("on", x === c); }); paintPreview(); }, b[1]);
          var dot = el("span", ""); if (b[2]) dot.style.background = b[2]; else dot.className = "auto";
          c.append(dot, el("small", "", b[1]));
          bw.appendChild(c);
        });
        panel.appendChild(bw);
        panel.appendChild(el("div", "v9-lab", "Text size"));
        panel.appendChild(seg([["small", "Small"], ["medium", "Medium"], ["large", "Large"]], st.size, function (k) { st.size = k; paintPreview(); }));
        panel.appendChild(el("div", "v9-lab", "Corners"));
        panel.appendChild(seg([["round", "Round"], ["soft", "Soft"]], st.corners, function (k) { st.corners = k; paintPreview(); }));
      }
    }
    function slider(label, icon, value, min, max, step, fn) {
      var w = el("label", "v9-slider");
      var head = el("div", "v9-slider-h"); head.innerHTML = svg(icon); head.appendChild(el("span", "", label));
      var r = el("input"); r.type = "range"; r.min = String(min); r.max = String(max); r.step = String(step); r.value = String(value);
      r.addEventListener("input", function () { fn(Number(r.value)); });
      w.append(head, r);
      return w;
    }
    function shut(save) {
      if (save) {
        a.setS(me, { chatTheme: theme, chatStyle: Object.assign({}, a.S(me).chatStyle || {}, { bubble: st.bubble, size: st.size, corners: st.corners, wall: st.wall, dim: st.dim, wblur: st.wblur }) });
        a.applyTheme();
        a.notice("Chat style saved", "", { kind: "success" });
      }
      ov.classList.add("out");
      setTimeout(function () { ov.remove(); }, 220);
    }
    var esc = function (e) { if (e.key === "Escape" && !document.querySelector(".cb-scrim") && $("sheet").classList.contains("hidden")) { e.stopPropagation(); shut(false); } };
    document.addEventListener("keydown", esc, true);
    var shut0 = shut;
    shut = function (save) { document.removeEventListener("keydown", esc, true); shut0(save); };
    drawPanel(); paintPreview();
    requestAnimationFrame(function () { ov.classList.add("in"); done.focus(); });
  }
  function shrinkData(file, max) {
    return new Promise(function (res) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () { var s = Math.min(1, max / Math.max(img.width, img.height)); var c = document.createElement("canvas"); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s); c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url); res(c.toDataURL("image/jpeg", 0.78)); };
      img.onerror = function () { URL.revokeObjectURL(url); res(""); };
      img.src = url;
    });
  }
  function shrink(file, max) {
    return new Promise(function (res) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () { var s = Math.min(1, max / Math.max(img.width, img.height)); var c = document.createElement("canvas"); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s); c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url); c.toBlob(function (b) { res(b || file); }, "image/jpeg", 0.85); };
      img.onerror = function () { URL.revokeObjectURL(url); res(file); };
      img.src = url;
    });
  }

  /* ======================= Home extras ======================= */
  var QUESTIONS = [
    "What's a small thing I do that makes your day?", "Where should our next trip be?", "What song reminds you of us?", "What's one thing you want us to try this month?",
    "What made you laugh today?", "What's a memory of us you replay often?", "What do you need more of from me this week?", "If we had a free day tomorrow, what would we do?",
    "What's something you're proud of lately?", "What's your favourite photo of us, and why?", "What's one dream you haven't told me about?", "What does a perfect evening look like to you?",
    "What's a habit we could build together?", "What's the kindest thing someone did for you recently?", "What should we celebrate this week?", "What's something new you'd like to learn together?",
    "Which day with me would you live again?", "What's a little luxury you'd love right now?", "How can I support you tomorrow?", "What's your favourite thing about our home (or future home)?",
    "What was the first thing you noticed about me?", "What's a tradition you want us to keep?", "What are you looking forward to most this year?", "What's your comfort food today?",
    "Who should we spend more time with?", "What's one word for how you feel about us today?", "What place feels most like 'us'?", "What would you write in a letter to us in 10 years?",
    "What's a goal we can chase together?", "What's something I said that stayed with you?"
  ];
  var MOODS = [["😊", "Happy"], ["🥰", "In love"], ["😌", "Calm"], ["😴", "Tired"], ["🤒", "Unwell"], ["😔", "Low"], ["😤", "Stressed"], ["🤩", "Excited"], ["🥺", "Missing you"], ["🔥", "On fire"]];
  function dayKey(t) { var d = new Date(t); return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate(); }
  function streak() {
    var a = A(), days = {};
    msgs().forEach(function (m) { var k = dayKey(m.ts); var d = days[k] || (days[k] = {}); d[m.from] = true; });
    var n = 0, t = Date.now();
    var both = function (k) { var d = days[k]; return d && d.Lewis && d.Agnes; };
    if (!both(dayKey(t))) t -= DAY;
    while (both(dayKey(t))) { n++; t -= DAY; }
    return n;
  }
  function closeness() {
    var a = A(), since = Date.now() - 7 * DAY;
    var recent = msgs().filter(function (m) { return m.ts >= since; });
    if (!recent.length) return { score: 0, why: "No messages this week yet." };
    var mine = recent.filter(function (m) { return m.from === a.me; }).length, theirs = recent.length - mine;
    var balance = recent.length ? 1 - Math.abs(mine - theirs) / recent.length : 0;
    var hearts = recent.reduce(function (s, m) { return s + (m.hearts || []).length; }, 0);
    var gaps = [];
    for (var i = 1; i < recent.length; i++) if (recent[i].from !== recent[i - 1].from) gaps.push(recent[i].ts - recent[i - 1].ts);
    gaps.sort(function (x, y) { return x - y; });
    var med = gaps.length ? gaps[Math.floor(gaps.length / 2)] : 6 * 3600e3;
    var speed = Math.max(0, 1 - Math.log10(1 + med / 60000) / 3);
    var days = {}; recent.forEach(function (m) { days[dayKey(m.ts)] = 1; });
    var presence = Object.keys(days).length / 7;
    var vol = Math.min(1, recent.length / 140);
    var score = Math.round(100 * (0.25 * balance + 0.25 * speed + 0.2 * presence + 0.15 * vol + 0.15 * Math.min(1, hearts / 20)));
    return { score: score, why: recent.length + " messages · replies in about " + (med < 3600e3 ? Math.max(1, Math.round(med / 60000)) + " min" : Math.round(med / 3600e3) + " h") + " · " + hearts + " hearts · " + Object.keys(days).length + "/7 days" };
  }
  function bestTime() {
    var hours = new Array(24).fill(0), list = msgs();
    for (var i = 1; i < list.length; i++) if (list[i].from !== list[i - 1].from && list[i].ts - list[i - 1].ts < 10 * 60000) hours[new Date(list[i].ts).getHours()]++;
    var best = 0; hours.forEach(function (v, h) { if (v > hours[best]) best = h; });
    return { hour: hours[best] ? best : null, hours: hours };
  }
  function onThisDay() {
    var now = new Date();
    return msgs().filter(function (m) { var d = new Date(m.ts); return d.getDate() === now.getDate() && day0(m.ts) < day0(Date.now()); });
  }
  function hourLabel(h) { return new Date(2020, 0, 1, h).toLocaleTimeString([], { hour: "numeric" }); }
  function homeExtras(box) {
    var a = A(); if (!a || !a.me) return;
    var them = a.S(a.other), mine = a.S(a.me);
    var themMood = (them.chatStyle || {}).mood, myMood = (mine.chatStyle || {}).mood;
    var fresh = function (m) { return m && Date.now() - (m.at || 0) < 2 * DAY; };
    var q = QUESTIONS[Math.floor(day0(Date.now()) / DAY) % QUESTIONS.length];
    var answered = a.store.get("v9-q-" + dayKey(Date.now()), false);
    var cl = closeness(), bt = bestTime(), otd = onThisDay(), st = streak();
    var tiles = [
      { k: "streak", ic: "🔥", label: "Streak", val: st ? st + (st === 1 ? " day" : " days") : "Start today", fn: openStreak, hot: st >= 3 },
      { k: "mood", ic: fresh(themMood) ? themMood.e : "🙂", label: fresh(themMood) ? a.name(a.other) + (/s$/i.test(a.name(a.other)) ? "' mood" : "'s mood") : "Mood", val: fresh(themMood) ? themMood.l : (fresh(myMood) ? "You: " + myMood.e : "Share yours"), fn: openMood },
      { k: "question", ic: "💭", label: "Today's question", val: answered ? "Answered" : "1 new", fn: function () { openQuestion(q); }, hot: !answered },
      { k: "close", ic: "💞", label: "Closeness", val: cl.score + "%", fn: function () { openCloseness(cl); } },
      { k: "best", ic: "⏰", label: "Best time", val: bt.hour == null ? "Learning…" : hourLabel(bt.hour), fn: function () { openBest(bt); } },
      { k: "memory", ic: "📸", label: "On this day", val: otd.length ? otd.length + " memories" : "None yet", fn: function () { openMemory(otd); } }
    ];
    var HX = {
      streak: "M12 22c4 0 7-2.7 7-7 0-3-1.6-5.4-3.4-7.2-.4 2-1.4 3.2-2.6 3.7.2-3.5-1.4-6.5-4-8.5.2 3.2-1.6 5.5-3.2 7.4C4.6 12.4 5 14 5 15c0 4.3 3 7 7 7z",
      mood: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM8 14s1.5 2 4 2 4-2 4-2M9 9.5h.01M15 9.5h.01",
      question: "M21 12a8.5 8.5 0 0 1-12.6 7.4L3 21l1.6-5A8.5 8.5 0 1 1 21 12zM9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6M12 16.5h.01",
      close: "M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z",
      best: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3.5 2",
      memory: "M4 8h3l2-3h6l2 3h3v11H4zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"
    };
    tiles.forEach(function (t) {
      var b = btn("hx9-t" + (t.hot ? " hot" : ""), "", function () { a.haptic("press"); t.fn(); }, t.label + ": " + t.val);
      b.dataset.k = t.k;
      var e = el("span", "hx9-e");
      if (t.k === "mood" && fresh(themMood)) { e.textContent = themMood.e; e.classList.add("emo"); } else e.innerHTML = svg(HX[t.k]);
      var tx = el("span", "hx9-tx");
      tx.append(el("b", "", t.val), el("small", "", t.label));
      b.append(e, tx);
      box.appendChild(b);
    });
  }
  function sheet(title, build) { var a = A(); a.sheetOpen(function (body) { body.classList.add("v9-sheet"); body.appendChild(el("h3", "fp-title", title)); build(body); }); }
  function openStreak() {
    var a = A(), n = streak();
    sheet("Your streak", function (b) {
      var big = el("div", "v9-big"); big.append(el("span", "", "🔥"), el("b", "", String(n)), el("small", "", n === 1 ? "day in a row" : "days in a row"));
      b.appendChild(big);
      b.appendChild(el("p", "fp-desc", "A day counts when both of you send at least one message. " + (n ? "Keep it going today." : "Say something today to start one.")));
      var wk = el("div", "v9-week");
      for (var i = 6; i >= 0; i--) {
        var t = Date.now() - i * DAY, k = dayKey(t);
        var ms = msgs().filter(function (m) { return dayKey(m.ts) === k; });
        var both = ms.some(function (m) { return m.from === "Lewis"; }) && ms.some(function (m) { return m.from === "Agnes"; });
        var d = el("div", "v9-wd" + (both ? " on" : "")); d.append(el("span", "", new Date(t).toLocaleDateString([], { weekday: "narrow" })), el("i", "", both ? "🔥" : "·"));
        wk.appendChild(d);
      }
      b.appendChild(wk);
      b.appendChild(btn("btn wide", "Open the chat", function () { a.sheetClose(); a.openChat(); }));
    });
  }
  function openMood() {
    var a = A(), mine = (a.S(a.me).chatStyle || {}).mood, them = (a.S(a.other).chatStyle || {}).mood;
    sheet("How are you feeling?", function (b) {
      if (them && Date.now() - them.at < 2 * DAY) { var t = el("div", "v9-moodthem"); t.append(el("span", "", them.e), el("div", "", "")); t.lastChild.append(el("b", "", a.name(a.other) + " feels " + them.l.toLowerCase()), el("small", "", "Shared " + fmtDay(them.at).toLowerCase() + ", " + hm(them.at) + (them.n ? " · “" + them.n + "”" : ""))); b.appendChild(t); }
      var grid = el("div", "v9-moods");
      var picked = mine && Date.now() - mine.at < 2 * DAY ? mine.e : null;
      var note = el("input", "in plain"); note.placeholder = "Add a few words (optional)"; note.maxLength = 60;
      MOODS.forEach(function (m) { var c = btn("v9-mood" + (picked === m[0] ? " on" : ""), "", function () { picked = m[0]; grid.querySelectorAll(".v9-mood").forEach(function (x) { x.classList.toggle("on", x === c); }); }, m[1]); c.append(el("span", "", m[0]), el("small", "", m[1])); grid.appendChild(c); });
      b.append(grid, note);
      b.appendChild(btn("btn wide", "Share my mood", function () {
        if (!picked) { a.notice("Pick how you feel", "", { error: true }); return; }
        var label = (MOODS.find(function (m) { return m[0] === picked; }) || [])[1] || "";
        var cs = Object.assign({}, a.S(a.me).chatStyle || {}, { mood: { e: picked, l: label, n: note.value.trim(), at: Date.now() } });
        a.setS(a.me, { chatStyle: cs });
        if (a.broadcast) a.broadcast("mood", { e: picked, l: label, n: cs.mood.n });
        a.sheetClose(); a.render();
        a.notice("Mood shared", a.name(a.other) + " sees " + picked + " on their home screen.", { kind: "success" });
      }));
    });
  }
  function openQuestion(q) {
    var a = A();
    sheet("Today's question", function (b) {
      var card = el("div", "v9-qcard"); card.append(el("span", "mono", new Date().toLocaleDateString([], { weekday: "long", day: "numeric", month: "long" })), el("b", "", q));
      b.appendChild(card);
      var ta = el("textarea", "in plain"); ta.rows = 3; ta.placeholder = "Your answer…"; ta.maxLength = 600;
      b.appendChild(ta);
      b.appendChild(el("p", "fp-desc", "Your answer goes to the chat with the question, so " + a.name(a.other) + " can answer too."));
      b.appendChild(btn("btn wide", "Send my answer", async function () {
        var t = ta.value.trim(); if (!t) { ta.focus(); return; }
        a.sheetClose();
        await a.sendText("💭 " + q + "\n" + t);
        a.store.set("v9-q-" + dayKey(Date.now()), true);
        a.render();
      }));
    });
  }
  function openCloseness(cl) {
    sheet("Closeness this week", function (b) {
      var ring = el("div", "v9-ring"); ring.style.setProperty("--p", String(cl.score)); ring.append(el("b", "", cl.score + "%"), el("small", "", cl.score >= 75 ? "Very close" : cl.score >= 50 ? "Close" : cl.score >= 25 ? "Drifting a little" : "Quiet week"));
      b.appendChild(ring);
      b.appendChild(el("p", "fp-desc center", cl.why));
      b.appendChild(el("p", "v9-hint center", "Worked out on this device from the last 7 days: balance of who writes, how fast you reply, days you talked, and hearts."));
      b.appendChild(btn("btn wide", "Send a little love", function () { A().sheetClose(); A().sendNudge(); }));
    });
  }
  function openBest(bt) {
    sheet("When you talk most", function (b) {
      var max = Math.max.apply(null, bt.hours.concat([1]));
      var chart = el("div", "v9-hours");
      bt.hours.forEach(function (v, h) { var c = el("i"); c.style.height = Math.max(4, Math.round(100 * v / max)) + "%"; if (h === bt.hour) c.className = "peak"; c.title = hourLabel(h) + ": " + v; chart.appendChild(c); });
      b.appendChild(chart);
      var axis = el("div", "v9-axis mono"); ["12a", "6a", "12p", "6p", "12a"].forEach(function (t) { axis.appendChild(el("span", "", t)); });
      b.appendChild(axis);
      b.appendChild(el("p", "fp-desc center", bt.hour == null ? "Not enough back-and-forth yet. It learns as you chat." : "You're most often both online around " + hourLabel(bt.hour) + ". A good time for a call."));
    });
  }
  function openMemory(list) {
    var a = A();
    sheet("On this day", function (b) {
      if (!list.length) { b.appendChild(el("p", "fp-desc", "No messages from this date in earlier months yet. Memories appear here as time goes on.")); return; }
      var groups = {};
      list.forEach(function (m) { var k = day0(m.ts); (groups[k] = groups[k] || []).push(m); });
      Object.keys(groups).sort(function (x, y) { return y - x; }).forEach(function (k) {
        var g = groups[k], ph = g.find(function (m) { return m.kind === "image" && m.mid; });
        var r = btn("v9-mem", "", function () { a.sheetClose(); a.openChatAt(Number(k), Number(k) + DAY); });
        if (ph) { var im = new Image(); im.alt = ""; a.mediaURL(ph.mid).then(function (u) { if (u) im.src = u; }); r.appendChild(im); }
        var t = el("div", ""); t.append(el("b", "", new Date(Number(k)).toLocaleDateString([], { day: "numeric", month: "long", year: "numeric" })), el("span", "", g.length + " messages · “" + a.previewOf(g[0]).slice(0, 70) + "”"));
        r.appendChild(t);
        b.appendChild(r);
      });
    });
  }

  /* ======================= Lock-screen lines ======================= */
  var LINE_IDEAS = ["Do what you love, love what you do.", "Home is wherever you are.", "Two hearts, one story.", "Every day with you is my favourite.", "Still choosing you.", "Small moments, big love.", "You and me, always."];
  function openTaglines() {
    var a = A();
    var mode = "one", lines = [];
    try { mode = localStorage.getItem("pp-tagline-mode") || "one"; lines = JSON.parse(localStorage.getItem("pp-taglines") || "[]"); } catch (e) {}
    var one = ""; try { one = localStorage.getItem("pp-tagline") || LINE_IDEAS[0]; } catch (e) { one = LINE_IDEAS[0]; }
    if (!lines.length) lines = [one];
    a.openPanel("Lock-screen lines", "Shared · both of you see them", still(function (body) {
      body.classList.add("v9");
      var demo = el("div", "v9-tdemo"); var dl = el("p", "", ""); demo.appendChild(dl); body.appendChild(demo);
      var timer = 0, li = 0, ci = 0, dir = 1;
      var play = function () {
        clearTimeout(timer);
        if (!dl.isConnected) return;
        var list = mode === "rotate" ? lines.filter(Boolean) : [lines[0] || one];
        if (!list.length) list = [one];
        var t = list[li % list.length];
        if (dir > 0) { dl.textContent = t.slice(0, ++ci); if (ci >= t.length) { if (list.length < 2) return; dir = -1; timer = setTimeout(play, 1800); return; } timer = setTimeout(play, 50); }
        else { dl.textContent = t.slice(0, --ci); if (ci <= 0) { dir = 1; li++; timer = setTimeout(play, 300); return; } timer = setTimeout(play, 20); }
      };
      var restart = function () { clearTimeout(timer); li = 0; ci = 0; dir = 1; play(); };
      body.appendChild(el("div", "v9-lab", "Mode"));
      body.appendChild(seg([["one", "One line"], ["rotate", "Take turns"]], mode, function (k) { mode = k; draw(); restart(); }));
      var box = el("div", "");
      body.appendChild(box);
      function draw() {
        box.textContent = "";
        var card = el("div", "scard v9-lines");
        var shown = mode === "rotate" ? lines : [lines[0] || ""];
        shown.forEach(function (l, i) {
          var r = el("div", "v9-line");
          var inp = el("input", "in plain"); inp.value = l; inp.maxLength = 80; inp.placeholder = "A line for the sign-in screen"; inp.setAttribute("aria-label", "Line " + (i + 1));
          inp.addEventListener("input", function () { lines[i] = inp.value; restart(); });
          r.appendChild(inp);
          if (mode === "rotate" && lines.length > 1) { var x = btn("v9-icb", "", function () { lines.splice(i, 1); draw(); restart(); }, "Remove line"); x.innerHTML = svg(I.close); r.appendChild(x); }
          card.appendChild(r);
        });
        box.appendChild(card);
        if (mode === "rotate" && lines.length < 12) box.appendChild(btn("v9-link", "+ Add a line", function () { lines.push(""); draw(); }));
        box.appendChild(el("div", "v9-lab", "Ideas"));
        var ideas = el("div", "v8-chips wrap");
        LINE_IDEAS.forEach(function (t) { ideas.appendChild(btn("chip", t, function () { if (mode === "rotate") { if (lines.indexOf(t) < 0 && lines.length < 12) lines.push(t); } else lines[0] = t; draw(); restart(); })); });
        box.appendChild(ideas);
      }
      draw();
      body.appendChild(btn("btn wide v9-save", "Save", async function () {
        var clean = lines.map(function (l) { return String(l || "").trim(); }).filter(Boolean).slice(0, 12);
        if (!clean.length) { a.notice("Add at least one line", "", { error: true }); return; }
        if (clean.some(function (l) { return l.length > 80; })) { a.notice("Lines can be up to 80 characters", "", { error: true }); return; }
        try { localStorage.setItem("pp-tagline-mode", mode); localStorage.setItem("pp-taglines", JSON.stringify(clean)); localStorage.setItem("pp-tagline", clean[0]); } catch (e) {}
        var c = a.sb, ok = true;
        if (c && a.pairId) { var r = await c.from("pair_settings").update({ tagline: clean[0], taglines: clean, tagline_mode: mode }).eq("pair_id", a.pairId); ok = !r.error; }
        a.notice(ok ? "Lines saved" : "Saved on this device only", ok ? (mode === "rotate" ? clean.length + " lines take turns on the sign-in screen." : "") : "The shared copy couldn't be saved.", { kind: ok ? "success" : "error", error: !ok });
        clearTimeout(timer);
        a.goBack();
      }));
      restart();
    }));
  }

  /* ======================= Stickers and emoji ======================= */
  var EMOJI = {
    "Smileys": "😀 😃 😄 😁 😆 😅 😂 🤣 🥲 😊 😇 🙂 🙃 😉 😌 😍 🥰 😘 😗 😙 😚 😋 😛 😝 😜 🤪 🤨 🧐 🤓 😎 🥸 🤩 🥳 😏 😒 😞 😔 😟 😕 🙁 😣 😖 😫 😩 🥺 😢 😭 😤 😠 😡 🤯 😳 🥵 🥶 😱 😨 😰 😥 😓 🤗 🤔 🤭 🤫 🤥 😶 😐 😑 😬 🙄 😯 😦 😧 😮 😲 🥱 😴 🤤 😪 😵 🤐 🥴 🤢 🤮 🤧 😷 🤒 🤕",
    "Love": "❤️ 🧡 💛 💚 💙 💜 🤎 🖤 🤍 ❤️‍🔥 💕 💞 💓 💗 💖 💘 💝 💟 ❣️ 💔 💋 💌 💍 💐 🌹 🥀 🌷 🌸 🫶 🤝 🫂 👫 💑 💏 😘 🥰",
    "Hands": "👍 👎 👏 🙌 🫶 👐 🤲 🙏 🤞 ✌️ 🤟 🤘 👌 🤌 🤏 👈 👉 👆 👇 ☝️ ✋ 🤚 🖐 🖖 👋 🤙 💪 🫡 🤗",
    "Life": "☀️ 🌙 ⭐ 🌟 ✨ ⚡ 🔥 🌈 ☁️ 🌧 ❄️ 🌊 🍕 🍔 🍟 🌮 🍜 🍣 🍩 🍪 🎂 🍰 🍫 🍿 ☕ 🍵 🧋 🍷 🥂 🍾 🎉 🎊 🎁 🎈 🎵 🎶 📸 🎬 📚 ✈️ 🚗 🏠 🛏 ⏰ 💤 💯 ✅ ❌ ❓ ❗"
  };
  function openPicker() {
    var a = A(), tab = "stickers";
    a.sheetOpen(function (body) {
      body.classList.add("v9-sheet", "v9-picker");
      var tabsBox = el("div", ""), grid = el("div", "");
      body.append(tabsBox, grid);
      function draw() {
        tabsBox.textContent = "";
        tabsBox.appendChild(seg([["stickers", "Stickers"], ["emoji", "Emoji"]], tab, function (k) { tab = k; draw(); }));
        grid.textContent = "";
        if (tab === "stickers") {
          var g = el("div", "v9-stk");
          Object.keys(a.STICKERS).forEach(function (id) {
            var b = btn("v9-stk-b", "", async function () { a.sheetClose(); a.haptic("send"); await a.sendText("[[sticker:" + id + "]]"); }, a.STICKERS[id].label);
            b.appendChild(a.stickerNode(id));
            b.appendChild(el("small", "", a.STICKERS[id].label));
            g.appendChild(b);
          });
          grid.appendChild(g);
          grid.appendChild(el("p", "v9-hint center", "Animated stickers are built in. They work offline."));
        } else {
          var bar = el("div", "v9-emobar");
          var pv = el("div", "v9-emopv"); var sendB = btn("v9-emosend", "Send", function () { var t = $("input").value.trim(); if (!t) return; a.sheetClose(); $("send").click(); });
          var showPv = function () { var t = $("input").value; pv.textContent = t || "Tap emoji to add them to your message"; pv.classList.toggle("empty", !t); sendB.disabled = !t.trim(); };
          var del = btn("v9-emodel", "", function () { var inp = $("input"); var arr = Array.from(inp.value); arr.pop(); inp.value = arr.join(""); inp.dispatchEvent(new Event("input", { bubbles: true })); showPv(); }, "Delete");
          del.innerHTML = svg("M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zM18 9l-6 6M12 9l6 6");
          bar.append(pv, del, sendB); grid.appendChild(bar); showPv();
          var recent = a.store.get("v9-emoji-recent", []);
          var cats = recent.length ? [["Recent", recent.join(" ")]] : [];
          Object.keys(EMOJI).forEach(function (k) { cats.push([k, EMOJI[k]]); });
          cats.forEach(function (c) {
            grid.appendChild(el("div", "v9-lab", c[0]));
            var g2 = el("div", "v9-emo");
            c[1].split(" ").filter(Boolean).forEach(function (e) {
              g2.appendChild(btn("v9-emo-b", e, function () {
                var inp = $("input"); var s = inp.selectionStart != null ? inp.selectionStart : inp.value.length;
                inp.value = inp.value.slice(0, s) + e + inp.value.slice(inp.selectionEnd || s);
                inp.dispatchEvent(new Event("input", { bubbles: true }));
                var r = [e].concat(a.store.get("v9-emoji-recent", []).filter(function (x) { return x !== e; })).slice(0, 16);
                a.store.set("v9-emoji-recent", r);
                showPv(); a.haptic("press");
                if ($("sheet").classList.contains("hidden")) $("sheet").classList.remove("hidden");
              }, e));
            });
            grid.appendChild(g2);
          });
          grid.appendChild(btn("btn wide", "Done", function () { a.sheetClose(); $("input").focus(); }));
        }
      }
      draw();
    });
  }
  // The + menu: small and quiet. Each row is an icon and a name. Attach opens a second step that asks what to attach.
  var MENU_I = {
    attach: I.clip, photos: I.image, camera: "M4 8h3l2-3h6l2 3h3v11H4zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z", audio: "M9 18V6l10-2v12M6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM16 19a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
    video: "M3 6h12v12H3zM15 10l6-3v10l-6-3", draw: "M3 21l3.5-1 11-11-2.5-2.5-11 11zM14.5 6.5l3 3", sticker: I.smile, later: I.clock, back: I.back, chev: I.next
  };
  function pickFiles(accept, capture) {
    var f = $("file");
    f.accept = accept; f.multiple = !capture;
    if (capture) f.setAttribute("capture", capture); else f.removeAttribute("capture");
    f.click();
  }
  function composerExtras() {
    var pop = document.querySelector("#footer .lp-pop");
    var plus = document.querySelector("#footer .lp-plus");
    if (!pop || !plus || pop.dataset.v9) return;
    pop.dataset.v9 = "1";
    pop.classList.add("v9-pop");
    pop.setAttribute("role", "menu");
    var att = $("attach");
    if (att) att.classList.add("hidden");
    var close = function () { pop.classList.add("lp-closed"); plus.setAttribute("aria-expanded", "false"); };
    var item = function (key, label, sub, fn, chev) {
      var b = btn("v9-mi", "", function () { A().haptic("press"); fn(); });
      b.setAttribute("role", "menuitem");
      b.innerHTML = '<span class="v9-mi-ic">' + svg(MENU_I[key]) + '</span><span class="v9-mi-t"><b></b>' + (sub ? "<small></small>" : "") + "</span>" + (chev ? '<span class="v9-mi-ch">' + svg(MENU_I.chev) + "</span>" : "");
      b.querySelector("b").textContent = label;
      if (sub) b.querySelector("small").textContent = sub;
      return b;
    };
    var main = function () {
      [].slice.call(pop.children).forEach(function (n) { if (n !== att) n.remove(); });
      var box = el("div", "v9-menu");
      box.append(
        item("attach", "Attach", "Photos, camera, audio", function () { attachStep(); }, true),
        item("draw", "Draw", "Sketch on a card and send it", function () { close(); A().openDraw(); }),
        item("sticker", "Stickers & emoji", "", function () { close(); openPicker(); }),
        item("later", "Send later", "", function () { close(); openSchedule(); })
      );
      pop.appendChild(box);
    };
    var attachStep = function () {
      [].slice.call(pop.children).forEach(function (n) { if (n !== att) n.remove(); });
      var box = el("div", "v9-menu step");
      var head = btn("v9-mhead", "", function () { main(); });
      head.innerHTML = svg(MENU_I.back) + "<span>Attach</span>";
      box.append(
        head,
        item("photos", "Photos & videos", "Several at once", function () { close(); pickFiles("image/*,video/*"); }),
        item("camera", "Take a photo", "", function () { close(); pickFiles("image/*", "environment"); }),
        item("video", "Record a video", "", function () { close(); pickFiles("video/*", "environment"); }),
        item("audio", "Audio file", "Music or a recording", function () { close(); pickFiles("audio/*"); })
      );
      pop.appendChild(box);
    };
    main();
    plus.addEventListener("click", function () { main(); });
  }

  /* ======================= Wiring ======================= */
  // Emoji on laptops now come from the self-hosted Noto Color Emoji font (lees-v11.css), so text,
  // inputs and every surface match without swapping glyphs for images.
  window.LeesV9 = {
    openNotifications: openNotifications, openJournal: openJournal, openCalendar: openCalendar, openMedia: openMedia,
    openWords: openWords, openSchedule: openSchedule, openClear: openClear, openStudio: openStudio, homeExtras: homeExtras,
    openTaglines: openTaglines, openPicker: openPicker, viewPhoto: viewPhoto
  };
  function boot() { composerExtras(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { setTimeout(boot, 50); }); else setTimeout(boot, 50);
  document.addEventListener("lees:unlocked", function () { composerExtras(); setTimeout(function () { if (A().renderBellCount) A().renderBellCount(); }, 400); });
  document.addEventListener("lees:feed", function () { if (A().renderBellCount) A().renderBellCount(); });
})();
