// 离线缓存：软件本身和词典存在手机里，没网也能打开
const VERSION = "et-5e5901490c";
const SHELL = [
  "./",
  "index.html",
  "css/style.css",
  "manifest.webmanifest",
  "js/main.js",
  "js/dict.js",
  "js/store.js",
  "js/srs.js",
  "js/translate.js",
  "js/speech.js",
  "js/sync.js",
  "js/ui.js",
  "js/typer.js",
  "js/glossary.js",
  "js/lessons.js",
  "js/pages/write.js",
  "js/pages/learn.js",
  "js/pages/review.js",
  "js/pages/book.js",
  "js/pages/me.js",
  "vendor/qrcode.js",
  "data/words.json",
  "data/zh2en.json",
  "icons/icon-192.png",
  "icons/apple-touch-icon.png",
];

self.addEventListener("install", (e) => {
  // cache: "reload" 绕过浏览器 HTTP 缓存，确保新版本装进来的是新文件
  e.waitUntil(
    caches.open(VERSION)
      .then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: "reload" }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// 只管自己网站的文件；翻译和 GitHub 请求直接走网络
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== self.location.origin) return;
  const isData = url.pathname.includes("/data/");
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((hit) => {
      // 词典很大且不常变：有缓存直接用；代码文件：先用缓存，后台更新
      const net = fetch(e.request)
        .then((r) => {
          if (r.ok) {
            const copy = r.clone();
            caches.open(VERSION).then((c) => c.put(e.request, copy));
          }
          return r;
        })
        .catch(() => hit || caches.match("index.html"));
      if (hit) {
        if (!isData) e.waitUntil(net.catch(() => {}));
        return hit;
      }
      return net;
    }),
  );
});
