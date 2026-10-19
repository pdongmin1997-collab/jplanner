const CACHE = 'jplanner-v22';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL.map(u => new Request(u, {cache: 'reload'})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  // 지도 타일 · 경로 · 위치검색은 항상 네트워크
  if (/tile\.openstreetmap\.org|arcgisonline\.com|router\.project-osrm\.org|nominatim\.openstreetmap\.org|photon\.komoot\.io/.test(u.hostname)) return;
  // 화면(HTML) 요청은 네트워크 우선: 새 버전이 바로 반영되고, 오프라인일 때만 저장본 사용
  if (r.mode === 'navigate' || /\/(index\.html)?$/.test(u.pathname)) {
    e.respondWith(fetch(r, {cache: 'no-cache'}).then(res => {
      if (res && res.ok) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(r, cp)); }
      return res;
    }).catch(() => caches.match(r).then(hit => hit || caches.match('./index.html'))));
    return;
  }
  e.respondWith(caches.match(r).then(hit => {
    const net = fetch(r).then(res => {
      if (res && (res.ok || res.type === 'opaque')) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(r, cp)); }
      return res;
    }).catch(() => hit);
    return hit || net;
  }));
});
