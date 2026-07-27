/* YOMUNJA ─ オフラインで起動するための最小構成
   ・アプリの本体と画像は、初回に端末へ保存する
   ・2回目以降は保存したものから起動し、裏で新しい版を取りに行く
   ・書誌API（openBD）は保存しない。常に通信して、失敗したら手入力へ */

const VERSION = 'yomunja-v2';
const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './logo.png',
  './icon-192.png',
  './icon-512.png',
  './icon-180.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(VERSION)
      .then(c => c.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // 書誌API・読み取りライブラリは保存しない（常に最新を取りに行く）
  if (url.hostname.includes('openbd.jp') ||
      url.hostname.includes('esm.sh') ||
      url.hostname.includes('jsdelivr.net') ||
      url.hostname.includes('unpkg.com')) return;

  // 同じフォルダのファイルは、保存したものを先に返しつつ裏で更新する
  if (url.origin === location.origin) {
    e.respondWith(
      caches.match(req).then(hit => {
        const net = fetch(req).then(res => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(VERSION).then(c => c.put(req, copy));
          }
          return res;
        }).catch(() => hit);
        return hit || net;
      })
    );
    return;
  }

  // 外部の書体などは、取れなければ保存済みを返す
  e.respondWith(
    fetch(req).then(res => {
      if (res && res.status === 200) {
        const copy = res.clone();
        caches.open(VERSION).then(c => c.put(req, copy));
      }
      return res;
    }).catch(() => caches.match(req))
  );
});
