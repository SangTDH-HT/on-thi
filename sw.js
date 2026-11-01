/* App Ôn thi tạm ngừng để nâng cấp (01/11/2026). Máy nào còn bản cũ: trình duyệt tải tệp này thay sw.js cũ, xóa hết
   bản lưu ngoại tuyến, tự gỡ, rồi mở lại trang để trang thông báo xóa nốt mật khẩu và khóa dữ liệu trong máy.
   Không có trình xử lý fetch: mọi yêu cầu đi thẳng lên mạng. */
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', e => e.waitUntil((async () => {
  for (const k of await caches.keys()) await caches.delete(k);
  await self.registration.unregister();
  for (const c of await self.clients.matchAll({ type: 'window', includeUncontrolled: true })) {
    try { await c.navigate(c.url); } catch (err) { /* không chuyển được: lần mở sau tự vào trang báo ngừng */ }
  }
})()));
