const CACHE = 'jplanner-v48';
const TILES = 'jplanner-tiles-v1';   // 지도 타일 저장소 (앱 버전이 바뀌어도 유지)
const TILE_MAX = 2500;
const LOCAL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-512-maskable.png', './apple-touch-icon.png'];
const CDN = ['https://unpkg.com/leaflet@1.9.4/dist/leaflet.css', 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'];
const FONT_CSS = 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,600&family=Noto+Serif+KR:wght@500;700&display=swap';
const TILE_HOST = /(^|\.)tile\.openstreetmap\.org$|(^|\.)server\.arcgisonline\.com$/;
const LIVE_HOST = /cartocdn\.com|router\.project-osrm\.org|nominatim\.openstreetmap\.org|photon\.komoot\.io|rapidapi\.com|adsbdb\.com/;
const BLANK = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    // 하나가 실패해도 나머지는 저장 (아이콘이 없어도 앱 설치가 깨지지 않게)
    await Promise.all(LOCAL.map(u => c.add(new Request(u, {cache: 'reload'})).catch(() => {})));
    // 지도 라이브러리·글꼴을 미리 저장해서 오프라인에서도 앱이 뜨게 함
    await Promise.all(CDN.map(u => fetch(u, {mode: 'cors'}).then(r => r.ok && c.put(u, r)).catch(() => {})));
    try {
      const r = await fetch(FONT_CSS, {mode: 'cors'});
      if (r.ok) {
        const t = await r.clone().text();
        await c.put(FONT_CSS, r);
        const urls = [...t.matchAll(/url\((https:[^)]+)\)/g)].map(m => m[1]);
        await Promise.all(urls.map(u => fetch(u, {mode: 'cors'}).then(x => x.ok && c.put(u, x)).catch(() => {})));
      }
    } catch (_) {}
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE && k !== TILES).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

async function trimTiles() {
  const c = await caches.open(TILES);
  const ks = await c.keys();
  if (ks.length > TILE_MAX) await Promise.all(ks.slice(0, ks.length - TILE_MAX + 200).map(k => c.delete(k)));
}

self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);

  // 지도 타일: 저장본 먼저 → 없으면 네트워크 (본 지역은 오프라인에서도 보임)
  if (TILE_HOST.test(u.hostname)) {
    e.respondWith((async () => {
      const c = await caches.open(TILES);
      const hit = await c.match(r.url);
      if (hit) return hit;
      try {
        const res = await fetch(r);
        if (res && res.ok && res.type !== 'opaque') {
          c.put(r.url, res.clone());
          if (Math.random() < 0.03) e.waitUntil(trimTiles());
        }
        return res;
      } catch (_) {
        // 오프라인이고 저장본도 없는 타일은 빈 타일로 (오류 표시 대신 조용히)
        const bin = Uint8Array.from(atob(BLANK), ch => ch.charCodeAt(0));
        return new Response(bin, {status: 200, headers: {'Content-Type': 'image/png'}});
      }
    })());
    return;
  }

  // 경로·위치검색·항공조회는 항상 네트워크
  if (LIVE_HOST.test(u.hostname)) return;

  // 화면(HTML): 네트워크 우선이지만 4초 안에 안 오면(불안정한 해외 와이파이 등) 저장본으로 바로 열기
  if (r.mode === 'navigate' || /\/(index\.html)?$/.test(u.pathname)) {
    e.respondWith((async () => {
      const fallback = async () => (await caches.match(r, {ignoreSearch: true})) || (await caches.match('./index.html')) || (await caches.match('./'));
      const net = fetch(r, {cache: 'no-cache'}).then(res => {
        if (res && res.ok) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(r, cp)); }
        return res;
      });
      try {
        return await Promise.race([net, new Promise((_, rej) => setTimeout(() => rej(new Error('slow')), 4000))]);
      } catch (_) {
        net.catch(() => {});
        const hit = await fallback();
        return hit || net;
      }
    })());
    return;
  }

  // 그 밖의 파일: 저장본 먼저, 뒤에서 갱신
  e.respondWith(caches.match(r).then(hit => {
    const net = fetch(r).then(res => {
      if (res && (res.ok || res.type === 'opaque')) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(r, cp)); }
      return res;
    }).catch(() => hit);
    return hit || net;
  }));
});
