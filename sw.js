// 고스톱 교실 서비스 워커: 앱·화투 그림을 저장해 두어 인터넷 없이도 열리게 한다
const VERSION = "gostop-v8";
const ANIMALS = ["mouse","cow","tiger","rabbit","dragon","snake","horse","sheep","monkey","rooster","dog","pig","bengal","fox","bear","panda","chick","frog","koala","hamster","penguin","lion","soccer","helmet"];
const CORE = ["./", "index.html", "manifest.webmanifest",
  ...Array.from({length: 48}, (_, i) => `cards/${i}.png`),
  ...ANIMALS.map(k => `animals/${k}.png`),
  "icons/icon-192-v1.png", "icons/icon-512-v1.png", "icons/apple-touch-icon-v1.png", "icons/favicon-v1.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE.map(u => new Request(u, { cache: "reload" })))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// 화면(index.html)은 인터넷 먼저(3초 넘으면 저장본), 나머지는 저장본 먼저
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  const same = url.origin === location.origin;
  if (!same && !url.host.endsWith("fonts.googleapis.com") && !url.host.endsWith("fonts.gstatic.com")) return;
  if (e.request.mode === "navigate") {
    e.respondWith(caches.open(VERSION).then(async c => {
      const net = fetch(e.request).then(r => { if (r.ok) c.put("index.html", r.clone()); return r; });
      const timeout = new Promise(res => setTimeout(() => c.match("index.html").then(h => h && res(h)), 3000));
      try { return await Promise.race([net, timeout]); } catch (err) { return (await c.match("index.html")) || Response.error(); }
    }));
    return;
  }
  e.respondWith(caches.open(VERSION).then(async c => {
    const hit = await c.match(e.request);
    const img = /\/(cards|animals|icons)\//.test(url.pathname);
    if (hit && img) return hit;  // 그림은 바뀌지 않으니 저장본만 쓴다
    const net = fetch(e.request).then(r => { if (r.ok) c.put(e.request, r.clone()); return r; });
    if (hit) { e.waitUntil(net.catch(() => {})); return hit; }
    return net.catch(async () => (img && await c.match(url.pathname.replace(/^.*\/(cards|animals|icons)\//, "$1/").split("?")[0])) || Response.error());
  }));
});
