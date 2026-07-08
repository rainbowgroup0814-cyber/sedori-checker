// 仕入れ判定チェッカー Service Worker v3
// ネットワーク優先＋HTMLはブラウザキャッシュも迂回して常に再検証
const CACHE = "sedori-checker-v3";
const ASSETS = ["./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  // APIとCDNはService Workerを通さない
  if (url.hostname === "api.keepa.com" || url.hostname.includes("unpkg.com")) return;
  // ネットワーク優先 → 成功したらキャッシュも更新 → 失敗（オフライン）ならキャッシュ
  // HTML/ナビゲーションはブラウザのHTTPキャッシュも迂回して常にサーバーへ再確認
  const isHTML = e.request.mode === "navigate" || (e.request.headers.get("accept") || "").includes("text/html");
  const req = isHTML ? new Request(e.request, { cache: "no-cache" }) : e.request;
  e.respondWith(
    fetch(req)
      .then(res => {
        if (res.ok && e.request.method === "GET") {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
