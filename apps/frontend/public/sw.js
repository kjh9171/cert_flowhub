// FlowHub Service Worker
// - 정적 에셋/페이지 HTML만 캐시 (stale-while-revalidate / network-first)
// - /api/*, /socket.io/*, /uploads/* 등 동적 요청은 절대 캐시하지 않는다
//   (캐시 시 최신 작업 상태가 한 세대 뒤로 밀리는 버그가 있었다 → SW 바이패스)

const CACHE = "flowhub-v3";
const PRECACHE = ["/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // 구버전 캐시(flowhub-v1, v2 등)는 모두 삭제
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // 동적 경로는 SW가 끼어들지 않는다 → 항상 네트워크로 직행
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/socket.io/") ||
    url.pathname.startsWith("/uploads/")
  ) {
    return;
  }

  // 페이지 탐색: network-first (실패 시에만 캐시 폴백)
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(req, clone));
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // 정적 에셋: stale-while-revalidate
  event.respondWith(
    caches.match(req).then(
      (cached) =>
        cached ||
        fetch(req).then((res) => {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(req, clone));
          return res;
        })
    )
  );
});
