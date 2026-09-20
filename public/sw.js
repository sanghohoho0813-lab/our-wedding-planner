/* Our Wedding Planner — 오프라인 지원 서비스 워커
 * - 정적 자원(/_next/static, 아이콘)은 캐시 우선: 한 번 받은 파일은 다시 내려받지 않는다.
 * - 화면(HTML)은 네트워크 우선, 끊기면 마지막으로 본 화면을 보여준다.
 * - 폰트 CDN 은 stale-while-revalidate.
 * - 그 외 외부 요청(Supabase 등)은 건드리지 않는다.
 */
const VERSION = "owp-v2";
const STATIC = `${VERSION}-static`;
const PAGES = `${VERSION}-pages`;
const FONTS = `${VERSION}-fonts`;
const PRECACHE = ["/", "/manifest.webmanifest", "/icons/icon.svg", "/icons/icon-192.png", "/icons/icon-512.png"];
const FONT_HOSTS = new Set(["cdn.jsdelivr.net", "fonts.googleapis.com", "fonts.gstatic.com"]);
const MAX_STATIC = 300;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(PAGES)
      .then((c) => Promise.allSettled(PRECACHE.map((u) => c.add(u))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length <= max) return;
  await Promise.all(keys.slice(0, keys.length - max).map((k) => cache.delete(k)));
}

async function cacheFirst(cacheName, request) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res && (res.ok || res.type === "opaque")) {
    cache.put(request, res.clone());
    trim(cacheName, MAX_STATIC);
  }
  return res;
}

async function staleWhileRevalidate(cacheName, request) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  const refresh = fetch(request)
    .then((res) => {
      if (res && (res.ok || res.type === "opaque")) cache.put(request, res.clone());
      return res;
    })
    .catch(() => hit || Response.error());
  return hit || refresh;
}

async function networkFirstPage(request) {
  const url = new URL(request.url);
  const key = new Request(url.origin + url.pathname);
  const cache = await caches.open(PAGES);
  try {
    const res = await fetch(request);
    if (res && res.ok) cache.put(key, res.clone());
    return res;
  } catch {
    const hit = (await cache.match(key)) || (await cache.match("/"));
    if (hit) return hit;
    // 그 화면도, 홈도 없으면 **마지막으로 본 아무 화면**이라도 보여준다.
    // 끊긴 채로 홈 화면 아이콘을 눌렀을 때 브라우저 오류 화면만 뜨는 것이 제일 나쁘다.
    const keys = await cache.keys();
    if (keys.length) return (await cache.match(keys[keys.length - 1])) || Response.error();
    return Response.error();
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;

  if (!sameOrigin) {
    if (FONT_HOSTS.has(url.hostname)) event.respondWith(staleWhileRevalidate(FONTS, request));
    return;
  }
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/") || url.pathname === "/manifest.webmanifest") {
    event.respondWith(cacheFirst(STATIC, request));
    return;
  }
  if (request.mode === "navigate") {
    event.respondWith(networkFirstPage(request));
    return;
  }
  // 나머지 same-origin(RSC prefetch 등): 네트워크, 끊기면 캐시
  event.respondWith(fetch(request).catch(() => caches.match(request, { ignoreSearch: true }).then((hit) => hit || Response.error())));
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});
