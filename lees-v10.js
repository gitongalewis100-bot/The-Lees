/* The Lees v10: swipe to reply, tap a quote to jump to the original, and Our special days
   (anniversary, birthdays, any date) with countdowns, calendar marks and a celebration on the day. */
(function () {
  "use strict";
  var A = function () { return window.LeesApp; };
  var $ = function (id) { return document.getElementById(id); };
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function btn(cls, text, fn, label) { var b = el("button", cls, text); b.type = "button"; if (label) b.setAttribute("aria-label", label); if (fn) b.addEventListener("click", fn); return b; }
  var reduce = function () { return !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches); };
  var DAY = 864e5;

  /* ---------- Swipe right on a message to reply ---------- */
  function bindSwipeReply() {
    var list = $("list");
    if (!list || list.dataset.v10) return;
    list.dataset.v10 = "1";
    var s = null;
    list.addEventListener("pointerdown", function (e) {
      if (e.pointerType === "mouse") return;
      var card = e.target.closest(".msg");
      if (!card || card.classList.contains("gone") || e.target.closest(".vc9-wave,.bars,.scratch,video,.oncegate")) return;
      s = { card: card, row: card.closest(".row"), x: e.clientX, y: e.clientY, dx: 0, live: false, id: e.pointerId };
    }, { passive: true });
    list.addEventListener("pointermove", function (e) {
      if (!s || e.pointerId !== s.id) return;
      var dx = e.clientX - s.x, dy = e.clientY - s.y;
      if (!s.live) {
        if (Math.abs(dy) > 12) { s = null; return; }
        if (dx > 14 && Math.abs(dx) > Math.abs(dy) * 1.6) {
          s.live = true;
          s.icon = el("span", "v10-reply-ic");
          s.icon.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 17l-5-5 5-5M20 18v-2a4 4 0 0 0-4-4H4"/></svg>';
          s.row.appendChild(s.icon);
          s.row.classList.add("v10-swiping");
        } else return;
      }
      s.dx = Math.max(0, Math.min(90, dx));
      s.card.style.transform = "translateX(" + s.dx + "px)";
      s.icon.style.opacity = String(Math.min(1, s.dx / 60));
      s.icon.classList.toggle("ready", s.dx >= 60);
      if (s.dx >= 60 && !s.buzzed) { s.buzzed = true; A().haptic("press"); }
    }, { passive: true });
    var end = function () {
      if (!s) return;
      var st = s; s = null;
      if (!st.live) return;
      st.card.style.transition = "transform .22s cubic-bezier(.2,1.2,.3,1)";
      st.card.style.transform = "";
      setTimeout(function () { st.card.style.transition = ""; if (st.icon) st.icon.remove(); st.row.classList.remove("v10-swiping"); }, 240);
      if (st.dx >= 60) {
        var m = A().thread().find(function (x) { return x.id === st.card.dataset.id; });
        if (m && !m.deleted) A().setReply(m);
      }
    };
    list.addEventListener("pointerup", end);
    list.addEventListener("pointercancel", end);
    // Tap a quoted reply to jump to the message it answers.
    list.addEventListener("click", function (e) {
      var q = e.target.closest(".quote");
      if (!q) return;
      var card = q.closest(".msg");
      var m = card && A().thread().find(function (x) { return x.id === card.dataset.id; });
      if (m && m.replyTo && m.replyTo.id) { e.stopPropagation(); A().jumpToMessage(m.replyTo.id, "flash"); }
    });
  }

  /* ---------- Our special days ---------- */
  var KINDS = [["anniversary", "Anniversary", "💍"], ["birthday", "Birthday", "🎂"], ["first", "A first", "✨"], ["trip", "Trip", "✈️"], ["other", "Special day", "📅"]];
  var kindOf = function (k) { return KINDS.find(function (x) { return x[0] === k; }) || KINDS[4]; };
  function days() { return (A() && A().specialDays) || []; }
  // Next time this date comes round (it repeats every year unless it's one-off).
  function nextOf(d) {
    var base = new Date(d.date + "T00:00:00");
    if (isNaN(base)) return null;
    var now = new Date(); now.setHours(0, 0, 0, 0);
    if (!d.yearly) return base.getTime() >= now.getTime() ? base.getTime() : null;
    var n = new Date(now.getFullYear(), base.getMonth(), base.getDate());
    if (n.getTime() < now.getTime()) n.setFullYear(n.getFullYear() + 1);
    return n.getTime();
  }
  function upcoming() {
    return days().map(function (d) { return { d: d, at: nextOf(d) }; }).filter(function (x) { return x.at != null; }).sort(function (a, b) { return a.at - b.at; });
  }
  function countdown(at) {
    var t0 = new Date(); t0.setHours(0, 0, 0, 0);
    var n = Math.round((at - t0.getTime()) / DAY);
    return n === 0 ? "Today" : n === 1 ? "Tomorrow" : "In " + n + " days";
  }
  function years(d, at) { if (!d.yearly) return ""; var y = new Date(at).getFullYear() - new Date(d.date + "T00:00:00").getFullYear(); return y > 0 ? y + (y === 1 ? " year" : " years") : ""; }
  async function save(list) {
    var a = A();
    a.specialDays = list;
    var c = a.sb, ok = true;
    if (c && a.pairId) { var r = await c.from("pair_settings").update({ special_days: list }).eq("pair_id", a.pairId); ok = !r.error; if (!ok) a.notice("Couldn't save", r.error.message, { error: true }); }
    return ok;
  }
  function openDays() {
    var a = A();
    var still = function (f) { f.still = true; return f; };
    a.openPanel("Our special days", "Shared · both of you see them", still(function (body) {
      body.classList.add("v9");
      var up = upcoming();
      if (up.length) {
        var n = up[0], k = kindOf(n.d.kind);
        var hero = el("div", "v10-hero");
        hero.append(el("span", "v10-hero-e", k[2]), el("b", "", n.d.title || k[1]), el("strong", "", countdown(n.at)), el("small", "", new Date(n.at).toLocaleDateString([], { weekday: "long", day: "numeric", month: "long", year: "numeric" }) + (years(n.d, n.at) ? " · " + years(n.d, n.at) : "")));
        body.appendChild(hero);
      }
      var add = btn("v9-write", "", function () { edit(null); });
      add.innerHTML = '<span class="v9-write-ic"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg></span><span><b>Add a special day</b><small>Anniversary, birthdays, firsts, trips</small></span>';
      body.appendChild(add);
      if (!days().length) { var e = el("div", "v9-empty small"); e.append(el("b", "", "No special days yet"), el("span", "", "Add your anniversary first. You'll both get a reminder the day before and a celebration on the day.")); body.appendChild(e); return; }
      var card = el("div", "scard");
      days().map(function (d, i) { return { d: d, i: i, at: nextOf(d) }; }).sort(function (x, y) { return (x.at || 9e15) - (y.at || 9e15); }).forEach(function (x) {
        var k = kindOf(x.d.kind);
        var r = btn("srow", "", function () { edit(x.i); });
        r.append(el("span", "v10-e", k[2]));
        var lab = el("span", "srow-lab"); lab.append(el("span", "srow-t", x.d.title || k[1]), el("small", "srow-s", new Date(x.d.date + "T00:00:00").toLocaleDateString([], { day: "numeric", month: "long", year: "numeric" }) + (x.d.yearly ? " · every year" : "")));
        r.append(lab, el("span", "srow-v", x.at != null ? countdown(x.at) : "Passed"));
        card.appendChild(r);
      });
      body.appendChild(card);
    }));
  }
  function edit(i) {
    var a = A(), cur = i == null ? { kind: "anniversary", title: "", date: "", yearly: true } : Object.assign({}, days()[i]);
    a.sheetOpen(function (b) {
      b.classList.add("v9-sheet");
      b.appendChild(el("h3", "fp-title", i == null ? "Add a special day" : "Edit special day"));
      var kinds = el("div", "v8-chips wrap");
      KINDS.forEach(function (k) { var c = btn("chip" + (cur.kind === k[0] ? " on" : ""), k[2] + " " + k[1], function () { cur.kind = k[0]; kinds.querySelectorAll(".chip").forEach(function (x) { x.classList.toggle("on", x === c); }); }); kinds.appendChild(c); });
      b.appendChild(kinds);
      var t = el("input", "in plain"); t.placeholder = "Name it, e.g. The day we met"; t.maxLength = 60; t.value = cur.title || ""; t.style.marginTop = "12px";
      var d = el("input", "in plain"); d.type = "date"; d.value = cur.date || "";
      var y = el("label", "v10-yearly"); var cb = el("input"); cb.type = "checkbox"; cb.checked = cur.yearly !== false; y.append(cb, el("span", "", "Every year"));
      b.append(t, d, y);
      var row = el("div", "fp-acts");
      if (i != null) row.appendChild(btn("btn ghost", "Delete", async function () { var list = days().slice(); list.splice(i, 1); if (await save(list)) { a.sheetClose(); a.renderPanel(); } }));
      row.appendChild(btn("btn", "Save", async function () {
        if (!d.value) { a.notice("Pick the date", "", { error: true }); return; }
        var item = { kind: cur.kind, title: t.value.trim(), date: d.value, yearly: cb.checked, by: a.me };
        var list = days().slice(); if (i == null) list.push(item); else list[i] = item;
        if (list.length > 30) { a.notice("Up to 30 days", "", { error: true }); return; }
        if (await save(list)) { a.sheetClose(); a.renderPanel(); a.notice("Saved", (item.title || kindOf(item.kind)[1]) + " · " + countdown(nextOf(item) || Date.now()), { kind: "success" }); }
      }));
      b.appendChild(row);
    });
  }
  // A reminder the day before and a celebration on the day, once per device each.
  function celebrate() {
    var a = A(); if (!a || !a.unlocked) return;
    var t0 = new Date(); t0.setHours(0, 0, 0, 0);
    upcoming().forEach(function (x) {
      var k = kindOf(x.d.kind), name = x.d.title || k[1], key = "v10-cel-" + x.d.date + "-" + new Date(x.at).getFullYear();
      var n = Math.round((x.at - t0.getTime()) / DAY);
      if (n === 0 && !a.store.get(key, false)) {
        a.store.set(key, true);
        if (a.loveBurst) a.loveBurst(true);
        a.alert("love", "Happy " + name.toLowerCase() + " " + k[2], years(x.d, x.at) ? years(x.d, x.at) + " today." : "Today is the day.", { priority: true, ref: key, action: { label: "Say something", run: function () { a.openChat(); } } });
      } else if (n === 1 && !a.store.get(key + "-eve", false)) {
        a.store.set(key + "-eve", true);
        a.alert("info", name + " is tomorrow " + k[2], "A good time to seal a letter or plan something.", { ref: key + "-eve", action: { label: "Seal a letter", run: function () { if (window.LeesFeatures) LeesFeatures.openLetters("out"); } } });
      }
    });
  }

  /* ---------- Settings entry and calendar marks ---------- */
  var prevExtra = window.LeesSettingsExtra;
  function wrapExtra() {
    var base = window.LeesSettingsExtra;
    if (!base || base._v10) return;
    var f = function () {
      var list = base() || [];
      var up = upcoming()[0];
      list.unshift({ id: "special", label: "Our special days", sub: "Anniversary, birthdays, firsts", keywords: "anniversary birthday date remember countdown special day", icon: "calendar", value: up ? countdown(up.at) : "", run: openDays });
      return list;
    };
    f._v10 = true;
    window.LeesSettingsExtra = f;
  }
  void prevExtra;
  function calendarMarks() {
    var head = document.querySelector(".v9-calhead");
    if (!head) return;
    if (!head.dataset.v10) {
      head.dataset.v10 = "1";
      var up = upcoming()[0];
      var chip = btn("v10-calnext", "", openDays);
      if (up) { var k = kindOf(up.d.kind); chip.textContent = k[2] + " " + (up.d.title || k[1]) + " · " + countdown(up.at); }
      else chip.textContent = "+ Add your special days";
      head.parentNode.insertBefore(chip, head.nextSibling);
    }
    var map = {};
    days().forEach(function (d) { var b = new Date(d.date + "T00:00:00"); map[(d.yearly ? "" : b.getFullYear() + "-") + b.getMonth() + "-" + b.getDate()] = kindOf(d.kind)[2]; });
    document.querySelectorAll(".v9-cday").forEach(function (c) {
      var lab = c.getAttribute("aria-label") || ""; var dt = new Date(lab.split(",")[0]); if (isNaN(dt)) return;
      var e = map[dt.getMonth() + "-" + dt.getDate()] || map[dt.getFullYear() + "-" + dt.getMonth() + "-" + dt.getDate()];
      if (e && !c.querySelector(".v10-sd")) c.appendChild(el("span", "v10-sd", e));
    });
  }

  function boot() { bindSwipeReply(); wrapExtra(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { setTimeout(boot, 80); }); else setTimeout(boot, 80);
  document.addEventListener("lees:unlocked", function () { bindSwipeReply(); wrapExtra(); setTimeout(celebrate, 2500); });
  document.addEventListener("lees:resume", function () { setTimeout(celebrate, 800); });
  document.addEventListener("lees:synced", function () { setTimeout(celebrate, 600); });
  var calT = 0;
  new MutationObserver(function () { if (!document.querySelector(".v9-cal")) return; clearTimeout(calT); calT = setTimeout(calendarMarks, 30); }).observe(document.body, { childList: true, subtree: true });
  window.LeesV10 = { openDays: openDays };
})();
