/* Sinh tu tools/dong_goi_web.py: luu san moi tep cua ban web de mo khong can mang.
   Ten bo nho doi theo noi dung; ban moi duoc tai ve o lan mo sau. */
const BAN = 'on-thi-80d60dcfb2c8';
const TEP = ["./", "anh/thi.jpg", "anh/trang.jpg", "anh/trietdung.jpg", "anh/trietketthi.jpg", "app.css", "app.js", "cau_hinh.js", "dia_hinh.js", "du_lieu.bin", "fonts/fonts.css", "fonts/saira-latin-ext.woff2", "fonts/saira-latin.woff2", "fonts/saira-stencil-one-latin-ext.woff2", "fonts/saira-stencil-one-latin.woff2", "fonts/saira-stencil-one-vietnamese.woff2", "fonts/saira-vietnamese.woff2", "icon/icon-180.png", "icon/icon-192.png", "icon/icon-512.png", "index.html", "khoa.json", "manifest.webmanifest", "mo_khoa.css", "mo_khoa.js", "xoay_oc.js"];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(BAN)
    .then(c => c.addAll(TEP.map(u => new Request(u, { cache: 'reload' }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ds => Promise.all(ds.filter(k => k !== BAN).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(caches.open(BAN)
    .then(c => c.match(e.request, { ignoreSearch: true }))
    .then(r => r || fetch(e.request)));
});
