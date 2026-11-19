/* The Lees v11: album view for photos sent together. Every photo in the set can be loved, replied to,
   forwarded, shared or saved on its own, and the whole set can be forwarded or saved at once. */
(function () {
  "use strict";
  var A = function () { return window.LeesApp; };
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function svg(d) { return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + d + '"/></svg>'; }
  function btn(cls, html, label, fn) { var b = el("button", cls); b.type = "button"; b.innerHTML = html; if (label) b.setAttribute("aria-label", label); b.addEventListener("click", fn); return b; }
  var P = {
    close: "M18 6L6 18M6 6l12 12",
    heart: "M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z",
    reply: "M9 17l-5-5 5-5M20 18v-2a4 4 0 0 0-4-4H4",
    fwd: "M15 17l5-5-5-5M4 18v-2a4 4 0 0 1 4-4h12",
    save: "M12 3v12M7 10l5 5 5-5M5 21h14",
    share: "M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v13"
  };

  function openAlbum(ids, focusId) {
    var a = A(); if (!a || !ids || !ids.length) return;
    var live = function () { return ids.map(function (id) { return a.thread().find(function (m) { return m.id === id; }); }).filter(function (m) { return m && !m.deleted && !(m.deletedFor || []).includes(a.me); }); };
    var list = live();
    if (!list.length) return;
    var ov = el("div", "al11");
    ov.setAttribute("role", "dialog");
    ov.setAttribute("aria-label", list.length + " photos");
    var top = el("div", "al11-top");
    var close = btn("al11-x", svg(P.close), "Close", function () { shut(); });
    var who = el("div", "al11-who");
    var first = list[0];
    who.append(el("b", "", list.length + " photos"), el("span", "", (first.from === a.me ? "You" : a.name(first.from)) + " · " + new Date(first.ts).toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })));
    var all = el("div", "al11-all");
    all.append(
      btn("al11-pill", svg(P.fwd) + "<span>Forward all</span>", "Forward all photos", function () { a.forwardSheet(live()); }),
      btn("al11-pill", svg(P.save) + "<span>Save all</span>", "Save all photos", function () { a.saveMedia(live()); })
    );
    top.append(close, who, all);
    var scroll = el("div", "al11-list");
    ov.append(top, scroll);
    document.body.appendChild(ov);

    function item(m, idx) {
      var fig = el("figure", "al11-item");
      fig.dataset.id = m.id;
      var img = new Image(); img.alt = "Photo " + (idx + 1); img.decoding = "async"; img.draggable = false;
      a.mediaURL(m.mid).then(function (u) { if (u) img.src = u; });
      var last = 0;
      img.addEventListener("click", function (e) {
        var now = Date.now();
        if (now - last < 300) { last = 0; if (!a.likedByMe(m)) { a.toggleHeart(m.id).then(paintAll); a.haptic("heart"); } heartPop(e.clientX, e.clientY); return; }
        last = now;
        setTimeout(function () { if (last === now && window.LeesV9 && LeesV9.viewPhoto) LeesV9.viewPhoto(m.id, null, ids); }, 310);
      });
      var bar = el("figcaption", "al11-bar");
      fig.append(img, bar);
      if (m.text) fig.insertBefore(el("p", "al11-cap", m.text), bar);
      paint(fig, m, bar);
      return fig;
    }
    function paint(fig, m0, bar) {
      var m = a.thread().find(function (x) { return x.id === m0.id; }) || m0;
      bar.textContent = "";
      var liked = a.likedByMe(m), n = a.heartCount(m);
      var love = btn("al11-a" + (liked ? " on" : ""), svg(P.heart) + "<span>" + (n ? n : "Love") + "</span>", liked ? "Unlove" : "Love", function () { a.haptic("heart"); a.toggleHeart(m.id).then(paintAll); });
      bar.append(love,
        btn("al11-a", svg(P.reply) + "<span>Reply</span>", "Reply to this photo", function () { shut(); a.openChat(); setTimeout(function () { a.setReply(m); }, 60); }),
        btn("al11-a", svg(P.fwd) + "<span>Forward</span>", "Forward this photo", function () { a.forwardSheet([m]); }),
        btn("al11-a", svg(P.share) + "<span>Share</span>", "Share this photo", function () { a.shareMessages([m]); }),
        btn("al11-a", svg(P.save) + "<span>Save</span>", "Save this photo", function () { a.saveMedia([m]); })
      );
    }
    function paintAll() { scroll.querySelectorAll(".al11-item").forEach(function (f) { var m = list.find(function (x) { return x.id === f.dataset.id; }); if (m) paint(f, m, f.querySelector(".al11-bar")); }); }
    function heartPop(x, y) { try { a.burstAt(x, y, "heart", 6); } catch (e) {} }
    list.forEach(function (m, i) { scroll.appendChild(item(m, i)); });
    var onRender = function () { paintAll(); };
    document.addEventListener("lees:render", onRender);
    var key = function (e) { if (e.key === "Escape" && !document.querySelector(".v9-viewer,#sheet:not(.hidden)")) { e.stopPropagation(); e.preventDefault(); shut(); } };
    document.addEventListener("keydown", key, true);
    function shut() {
      document.removeEventListener("keydown", key, true);
      document.removeEventListener("lees:render", onRender);
      ov.classList.add("out");
      setTimeout(function () { ov.remove(); }, 200);
    }
    requestAnimationFrame(function () {
      ov.classList.add("in");
      var f = focusId && scroll.querySelector('[data-id="' + focusId + '"]');
      if (f && f !== scroll.firstChild) f.scrollIntoView({ block: "start" });
    });
    close.focus();
  }
  /* ---------- Countdown to a sealed letter ---------- */
  function pad(n) { return n < 10 ? "0" + n : String(n); }
  // "2 d 4 h 12 min 08 s": every unit from the biggest non-zero one down to seconds.
  function countdown(ms) {
    var t = Math.max(0, Math.floor(ms / 1000)), d = Math.floor(t / 86400), h = Math.floor(t % 86400 / 3600), m = Math.floor(t % 3600 / 60), sec = t % 60;
    var out = [];
    if (d) out.push(d + (d === 1 ? " day" : " days"));
    if (d || h) out.push(h + " h");
    if (d || h || m) out.push((d || h ? pad(m) : m) + " min");
    out.push((d || h || m ? pad(sec) : sec) + " s");
    return out.join(" ");
  }
  // A notice whose second line counts down live until the letter can be opened.
  function sealedNotice(openAt, onSee) {
    var a = A();
    a.notice("Still sealed", "Opens in " + countdown(openAt - Date.now()), { kind: "letter", duration: 12000, action: onSee ? { label: "See it", run: onSee } : undefined });
    var n = document.getElementById("notice");
    var d = n && n.querySelector(".d");
    if (!d) return;
    var id = setInterval(function () {
      var cur = document.getElementById("notice");
      var dd = cur && cur.querySelector(".d");
      if (!dd || cur.classList.contains("hidden") || !/^Opens in|^Ready/.test(dd.textContent)) { clearInterval(id); return; }
      var left = openAt - Date.now();
      dd.textContent = left > 0 ? "Opens in " + countdown(left) : "It can be opened now";
      if (left <= 0) clearInterval(id);
    }, 1000);
  }
  // Letter cards and envelopes mark their countdown line with data-open (epoch ms); one clock keeps them all live.
  function tick() {
    document.querySelectorAll("[data-open]").forEach(function (n) {
      var at = Number(n.dataset.open), left = at - Date.now();
      if (!at) return;
      if (left > 0) n.textContent = "Opens in " + countdown(left);
      else if (n.dataset.done !== "1") {
        n.dataset.done = "1";
        n.textContent = n.dataset.mine === "1" ? "Can be opened now" : "Ready to open";
        var cta = n.closest(".card11, .v8-env");
        if (cta) { var c = cta.querySelector(".card11-cta"); if (c && n.dataset.mine !== "1") c.textContent = "Open"; cta.classList.add("ready"); }
      }
    });
  }
  setInterval(tick, 1000);
  document.addEventListener("lees:locked", function () { document.querySelectorAll(".al11").forEach(function (n) { n.remove(); }); });
  window.LeesV11 = { openAlbum: openAlbum, countdown: countdown, sealedNotice: sealedNotice };
})();
