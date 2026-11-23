/* The Lees service worker: keeps the app shell available offline.
   Pages: network first, cached copy when offline. Static files: served from cache, refreshed in the background.
   Supabase API, realtime and storage are never cached. */
const CACHE = "lees-shell-v15-3";
const SHELL = ["/", "/manifest.webmanifest", "/icon-192.png", "/icon-512.png", "/icon-180.png"];
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {}));
  self.skipWaiting();
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.hostname.endsWith("supabase.co")) return;
  const sameOrigin = url.origin === self.location.origin;
  const pinnedLib = url.hostname === "cdn.jsdelivr.net";
  if (!sameOrigin && !pinnedLib) return;
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put("/", copy)).catch(() => {}); }
      return res;
    }).catch(() => caches.match("/").then((r) => r || caches.match(req))));
    return;
  }
  e.respondWith(caches.open(CACHE).then((c) => c.match(req).then((hit) => {
    const net = fetch(req).then((res) => { if (res && (res.ok || res.type === "opaque")) c.put(req, res.clone()).catch(() => {}); return res; }).catch(() => hit);
    return hit || net;
  })));
});
