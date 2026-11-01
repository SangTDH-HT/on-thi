/* Bản web: mở khóa bằng mật khẩu riêng của từng người rồi mới chạy app.js (app iOS không dùng tệp này).
   Bộ câu hỏi du_lieu.bin mã hóa AES-GCM bằng khóa K; khoa.json có một "ô khóa" cho mỗi người: K bọc bằng
   khóa sinh từ mật khẩu của họ (PBKDF2). Sinh bởi tools/dong_goi_web.py + tools/so_ma.py. */
(() => {
  'use strict';

  const $ = (s, g = document) => g.querySelector(s);
  const kho = {
    doc(k) { try { return localStorage.getItem('gdqp.' + k); } catch (e) { return null; } },
    ghi(k, v) {
      try { if (v == null) localStorage.removeItem('gdqp.' + k); else localStorage.setItem('gdqp.' + k, v); } catch (e) { /* trình duyệt chặn bộ nhớ */ }
    },
  };
  const tu64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  const ra64 = u => btoa(String.fromCharCode(...u));
  const chuan = s => s.toLowerCase().replace(/[^a-z0-9]/g, '');   // bỏ gạch, khoảng trắng; không phân biệt hoa thường
  const giamDong = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const sc = window.crypto && crypto.subtle;

  // Lưu sẵn mọi tệp trong máy: lần sau mở không cần mạng
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).catch(() => { /* chạy tiếp, chỉ mất chế độ ngoại tuyến */ });
  }

  const tai = ten => fetch(ten).then(r => { if (!r.ok) throw new Error(ten + ' ' + r.status); return r; });
  let duLieu = null, oKhoa = null;
  const layDuLieu = () => duLieu || (duLieu = tai('du_lieu.bin').then(r => r.arrayBuffer()).then(b => new Uint8Array(b))
    .catch(e => { duLieu = null; throw e; }));
  const layOKhoa = () => oKhoa || (oKhoa = tai('khoa.json').then(r => r.json()).catch(e => { oKhoa = null; throw e; }));

  // Giải mã bộ câu hỏi bằng K (sai K thì AES-GCM báo lỗi xác thực)
  async function moBang(K) {
    const du = await layDuLieu();
    const k = await sc.importKey('raw', K, 'AES-GCM', false, ['decrypt']);
    const ro = await sc.decrypt({ name: 'AES-GCM', iv: du.subarray(4, 16) }, k, du.subarray(16));
    return JSON.parse(new TextDecoder().decode(ro));
  }
  // Mật khẩu đã chuẩn hóa: 2 ký tự đầu là số hiệu ô khóa, 8 ký tự sau mở ô lấy K
  async function KTuMa(ma) {
    const kj = await layOKhoa(), o = kj.o[ma.slice(0, 2)];
    if (!o) return null;
    const vat = await sc.importKey('raw', new TextEncoder().encode(ma.slice(2)), 'PBKDF2', false, ['deriveKey']);
    const k = await sc.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt: tu64(o.m), iterations: kj.lap }, vat,
      { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
    try { return new Uint8Array(await sc.decrypt({ name: 'AES-GCM', iv: tu64(o.iv) }, k, tu64(o.g))); } catch (e) { return null; }
  }
  // Trả bộ câu hỏi nếu mật khẩu mở được, null nếu sai hoặc đã bị thu hồi; lỗi mạng thì ném ra
  // Mật khẩu bán qua máy chủ (may_chu/Code.gs) không có ô khóa trong khoa.json: máy chủ kiểm rồi trả K
  async function KTuMayChu(ma) {
    const url = (window.CAU_HINH || {}).mayChu;
    if (!url) return null;
    const d = await fetch(url, { method: 'POST', body: JSON.stringify({ viec: 'mo_khoa', ma }) }).then(r => r.json());
    return d.ok && d.khoa ? tu64(d.khoa) : null;
  }
  async function thu(ma) {
    const kCu = kho.doc('mk_k');
    if (kCu && kho.doc('mk') === ma) {
      try { return await moBang(tu64(kCu)); } catch (e) { /* K đã đổi sau một lần thu hồi: mở lại bằng ô khóa */ }
    }
    for (const lay of [KTuMa, KTuMayChu]) {
      const K = await lay(ma);
      if (!K) continue;
      try {
        const dl = await moBang(K);
        kho.ghi('mk', ma); kho.ghi('mk_k', ra64(K));
        return dl;
      } catch (e) { /* K này không mở được: thử nguồn sau */ }
    }
    return null;
  }

  function chayApp(dl) {
    window.GDQP = dl;
    const s = document.createElement('script');
    s.src = 'app.js';
    s.onload = () => document.body.classList.remove('cho-mo');
    document.body.appendChild(s);
  }

  const SVG_KHOA = `<svg viewBox="0 0 120 120" aria-hidden="true">
    <circle cx="60" cy="60" r="47.5" fill="none" stroke="url(#g-vang)" stroke-width="5" stroke-dasharray="1.7 2.2"/>
    <circle cx="60" cy="60" r="44" fill="url(#g-vang)"/>
    <circle cx="60" cy="60" r="43.4" fill="none" stroke="rgba(255,255,255,.4)" stroke-width="1"/>
    <circle cx="60" cy="60" r="35" fill="url(#g-men-do)"/>
    <circle cx="60" cy="60" r="35" fill="none" stroke="#6E4F12" stroke-width="1.4"/>
    <path class="quai" d="M49 58V50a11 11 0 0 1 22 0v8" fill="none" stroke="url(#g-sao-sang)" stroke-width="5.5" stroke-linecap="round"/>
    <path d="M45 56h15v28H45a4 4 0 0 1-4-4V60a4 4 0 0 1 4-4z" fill="url(#g-sao-sang)"/>
    <path d="M60 56h15a4 4 0 0 1 4 4v20a4 4 0 0 1-4 4H60z" fill="url(#g-sao-toi)"/>
    <circle cx="60" cy="67" r="3.6" fill="#6E4F12"/><path d="M58.6 68.5h2.8l.9 7.5h-4.6z" fill="#6E4F12"/></svg>`;
  const laIOSSafari = /iP(hone|ad|od)/.test(navigator.userAgent) && !navigator.standalone;

  function hienKhoa(loiDau) {
    const lop = document.createElement('div');
    lop.className = 'man-khoa';
    const anh = [
      ['trang', 'Trang chính: chọn môn, đề thi thử, học theo bài', 'Hai môn, đề thi thử, học theo bài'],
      ['trietdung', 'Chọn đáp án xong hiện thẻ từ khóa và mẹo nhớ', 'Đúng sai đều có từ khóa, mẹo nhớ'],
      ['thi', 'Thi thử: tô đáp án, phiếu trả lời', 'Thi thử tô phiếu như thật'],
      ['trietketthi', 'Kết quả thi: điểm thang 10, xem lại câu sai', 'Chấm điểm, xem lại câu sai'],
    ];
    lop.innerHTML = `
      <div class="nen-khoa" aria-hidden="true">${window.DIA_HINH || ''}</div>
      <div class="trang-gt">
        <header class="dau-gt">
          <div class="huy-khoa">${SVG_KHOA}</div>
          <div><h1>Ôn thi</h1><p class="mon-khoa">Trắc nghiệm GDQP&amp;AN và Triết học trên điện thoại</p></div>
        </header>
        <p class="loi-gt">457 câu ôn tập của hai môn. Chọn đúng hay sai đều hiện từ khóa và mẹo nhớ, thi thử chấm điểm như đề thật.</p>
        <form class="o-khoa" novalidate>
          <label for="mk">Mật khẩu của bạn</label>
          <input id="mk" type="text" autocomplete="off" autocorrect="off" autocapitalize="none" spellcheck="false"
            enterkeyhint="go" maxlength="16" placeholder="xx-xxxx-xxxx" aria-describedby="mk-loi mk-goi-y">
          <p class="loi-khoa" id="mk-loi" role="alert">${loiDau || ''}</p>
          <button class="nut-chinh" type="submit">Mở khóa</button>
          <p class="goi-y-khoa" id="mk-goi-y">Mỗi người một mật khẩu riêng. Chưa có thì hỏi người gửi link cho bạn.</p>
          ${laIOSSafari ? '<p class="goi-y-khoa them">Muốn dùng như app: bấm nút Chia sẻ, chọn <b>Thêm vào MH chính</b>, rồi mở icon <b>Ôn thi</b> và nhập mật khẩu ở đó.</p>' : ''}
        </form>
        <section class="o-mua" id="o-mua" aria-labelledby="mua-tieu-de" hidden>
          <h2 id="mua-tieu-de">Chưa có mật khẩu?</h2>
          <p class="chu-mua">Mua mật khẩu riêng giá <b id="mua-gia"></b>: nhập Gmail, chuyển khoản theo mã QR. Người bán nhận tiền xong, mật khẩu được gửi về Gmail đó.</p>
          <form id="mua-dang-nhap" class="form-mua" novalidate>
            <label for="mua-email">Gmail nhận mật khẩu</label>
            <input id="mua-email" type="email" inputmode="email" autocomplete="email" autocapitalize="none" spellcheck="false"
              enterkeyhint="go" placeholder="tenban@gmail.com" aria-describedby="mua-loi">
            <button class="nut-phu" type="submit">Tạo mã chuyển khoản</button>
          </form>
          <div id="mua-don" hidden></div>
          <p class="loi-khoa" id="mua-loi" role="alert"></p>
        </section>
        <section class="muc-gt" aria-labelledby="gt-lam">
          <h2 id="gt-lam">App làm được gì</h2>
          <div class="dai-anh" tabindex="0" aria-label="Ảnh chụp app, vuốt ngang để xem">
            ${anh.map(([t, alt, cap]) => `<figure><img src="anh/${t}.jpg" alt="${alt}" width="420" height="913" loading="lazy"><figcaption>${cap}</figcaption></figure>`).join('')}
          </div>
          <ul class="ds-gt">
            <li><b>Hai môn riêng.</b> GDQP&amp;AN 230 câu theo 11 bài. Triết học 227 câu theo 7 chủ đề, có riêng bộ câu ôn tập cô phát.</li>
            <li><b>Học có mẹo.</b> Chọn đáp án là biết đúng sai ngay, kèm từ khóa tô vàng và mẹo nhớ ngắn cho từng câu.</li>
            <li><b>Thi thử như thật.</b> Đề 20, 30, 50 hoặc 100 câu. Tô phiếu trả lời, nộp bài mới chấm điểm thang 10, xem lại câu sai.</li>
            <li><b>Không học vẹt vị trí.</b> Câu hỏi và đáp án xáo lại mỗi lần làm.</li>
            <li><b>Biết mình thuộc tới đâu.</b> Huy hiệu tiến độ từng bài, đếm số câu đã thuộc, luyện lại riêng các câu sai.</li>
            <li><b>Dùng như app, không cần mạng.</b> Thêm vào màn hình chính trên iPhone hoặc Android; sau lần mở đầu chạy cả khi mất mạng.</li>
          </ul>
        </section>
        <section class="muc-gt" aria-labelledby="gt-cai">
          <h2 id="gt-cai">Cài lên điện thoại</h2>
          <ol class="buoc-gt">
            <li><b>iPhone:</b> mở link bằng Safari, bấm nút Chia sẻ, chọn <b>Thêm vào MH chính</b>. <b>Android:</b> mở bằng Chrome, menu ⋮, chọn <b>Thêm vào màn hình chính</b>.</li>
            <li>Mở icon <b>Ôn thi</b> vừa thêm trên màn hình chính.</li>
            <li>Nhập mật khẩu một lần, máy sẽ nhớ. Không cần tài khoản.</li>
          </ol>
        </section>
      </div>`;
    document.body.appendChild(lop);
    moMua(lop);
    const o = $('#mk', lop), loi = $('#mk-loi', lop), nut = $('.o-khoa .nut-chinh', lop);
    if (!giamDong) {
      $('.huy-khoa svg', lop).animate([{ transform: 'scale(.5) rotate(-35deg)', opacity: 0 }, { transform: 'none', opacity: 1 }],
        { duration: 900, delay: 150, easing: 'cubic-bezier(.2,1.35,.3,1)', fill: 'backwards' });
    }

    const baoLoi = t => {
      loi.textContent = t;
      lop.classList.remove('sai'); void lop.offsetWidth; lop.classList.add('sai');
      o.focus();
    };
    // Tự chèn gạch theo dạng xx-xxxx-xxxx khi gõ
    o.addEventListener('input', () => {
      const c = chuan(o.value).slice(0, 10);
      o.value = c.length > 6 ? `${c.slice(0, 2)}-${c.slice(2, 6)}-${c.slice(6)}` : c.length > 2 ? `${c.slice(0, 2)}-${c.slice(2)}` : c;
      lop.classList.remove('sai');
    });
    $('form', lop).addEventListener('submit', async e => {
      e.preventDefault();
      if (!sc) return baoLoi('Trình duyệt này không mở được app. Dùng Safari hoặc Chrome bản mới.');
      const ma = chuan(o.value);
      if (ma.length !== 10) return baoLoi('Mật khẩu có 10 chữ và số, dạng xx-xxxx-xxxx.');
      nut.disabled = true; nut.textContent = 'Đang mở…'; loi.textContent = '';
      let dl = null, loiMang = false;
      try { dl = await thu(ma); } catch (e2) { loiMang = true; }
      nut.disabled = false; nut.textContent = 'Mở khóa';
      if (loiMang) return baoLoi('Chưa tải được dữ liệu. Kiểm tra mạng rồi thử lại.');
      if (!dl) return baoLoi('Sai mật khẩu, hoặc mật khẩu này đã bị thu hồi.');
      o.blur();
      chayApp(dl);
      if (giamDong) { lop.remove(); return; }
      lop.classList.add('mo');   // quai khóa bật lên, rồi màn khóa tan vào app
      setTimeout(() => {
        lop.animate([{ opacity: 1 }, { opacity: 0, transform: 'scale(1.04)' }], { duration: 420, easing: 'ease-in', fill: 'forwards' })
          .onfinish = () => lop.remove();
      }, 520);
    });
  }

  // ---------- Mua mật khẩu: gõ Gmail → đơn + mã QR → chờ người bán xác nhận → mật khẩu về Gmail ----------
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const tien = n => Number(n).toLocaleString('vi-VN') + 'đ';
  function moMua(lop) {
    const ch = window.CAU_HINH || {};
    if (!ch.mayChu) return;   // chưa cài máy chủ bán mã
    const khu = $('#o-mua', lop), loi = $('#mua-loi', lop), donEl = $('#mua-don', lop), dn = $('#mua-dang-nhap', lop);
    khu.hidden = false;
    $('#mua-gia', lop).textContent = tien(ch.gia || 30000);
    $('#mk-goi-y', lop).textContent = 'Mỗi người một mật khẩu riêng. Chưa có thì mua ngay bên dưới.';
    const goi = (url, opt) => fetch(url, opt).then(r => r.json());
    let hen = 0;

    const docDon = () => { try { return JSON.parse(kho.doc('don') || 'null'); } catch (e) { return null; } };
    const hienDangNhap = () => { dn.hidden = false; };
    dn.addEventListener('submit', async e => {
      e.preventDefault();
      const email = $('#mua-email', lop).value.trim().toLowerCase(), nut = $('button', dn);
      if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/.test(email)) { loi.textContent = 'Gmail chưa đúng dạng, ví dụ tenban@gmail.com.'; return; }
      loi.textContent = ''; nut.disabled = true; nut.textContent = 'Đang tạo…';
      try {
        const d = await goi(ch.mayChu, { method: 'POST', body: JSON.stringify({ viec: 'tao_don', email }) });
        if (!d.ok) throw new Error(d.loi || 'Không tạo được đơn.');
        kho.ghi('don', JSON.stringify(d));
        hienDon(d);
      } catch (err) {
        loi.textContent = err instanceof TypeError ? 'Chưa kết nối được máy chủ bán mã. Thử lại sau ít phút.' : err.message;
      }
      nut.disabled = false; nut.textContent = 'Tạo mã chuyển khoản';
    });
    function hienDon(d) {
      dn.hidden = true; donEl.hidden = false;
      donEl.innerHTML = `
        <p class="chu-mua">Gmail nhận mật khẩu: <b>${esc(d.email)}</b> <button type="button" class="nut-nho" data-doi>Đổi Gmail</button></p>
        <img class="qr-mua" src="${esc(d.qr)}" alt="Mã QR chuyển ${tien(d.soTien)} vào ${esc(d.nganHang)} ${esc(d.tenTaiKhoan)}, nội dung ${esc(d.noiDung)}">
        <dl class="ck-mua">
          <dt>Nhận tiền</dt><dd>${esc(d.nganHang)}, ${esc(d.tenTaiKhoan)}</dd>
          <dt>Số tiền</dt><dd>${tien(d.soTien)}</dd>
          <dt>Nội dung</dt><dd><b>${esc(d.noiDung)}</b> <button type="button" class="nut-nho" data-chep="${esc(d.noiDung)}">Chép</button></dd>
        </dl>
        <p class="chu-mua">Mở app ngân hàng hoặc MoMo, quét mã QR: số tiền và nội dung đã điền sẵn, đừng sửa nội dung.
          Chuyển bằng chính điện thoại này thì nhấn giữ mã QR, chọn lưu ảnh, rồi trong app ngân hàng chọn quét QR từ ảnh.</p>
        <p class="tt-mua" id="tt-mua" role="status">Đang chờ người bán xác nhận đã nhận tiền…</p>`;
      kiem(d);
    }
    async function kiem(d) {
      clearTimeout(hen);
      if (!document.body.contains(lop)) return;   // đã mở khóa xong
      const el = $('#tt-mua', lop);
      try {
        const t = await goi(`${ch.mayChu}?viec=trang_thai&don=${encodeURIComponent(d.maDon)}`);
        if (t.tt === 'da_gui') {
          el.innerHTML = `Đã nhận tiền. Mật khẩu đã gửi về <b>${esc(d.email)}</b>: mở Gmail (xem cả mục Quảng cáo, Thư rác), chép mật khẩu vào ô ở trên.`;
          el.classList.add('xong'); kho.ghi('don', null);
          return;
        }
        if (t.tt === 'loi') { el.textContent = 'Đã nhận tiền nhưng gửi mật khẩu bị trục trặc; người bán sẽ gửi lại cho bạn.'; return; }
        if (t.tt === 'thu_hoi' || t.ok === false) { kho.ghi('don', null); donEl.hidden = true; hienDangNhap(); return; }
      } catch (e) { /* mạng chập chờn: lát thử lại */ }
      hen = setTimeout(() => kiem(d), 12000);
    }
    khu.addEventListener('click', e => {
      const chep = e.target.closest('[data-chep]');
      if (chep) {
        const xong = () => { chep.textContent = 'Đã chép'; setTimeout(() => { chep.textContent = 'Chép'; }, 1600); };
        if (navigator.clipboard) navigator.clipboard.writeText(chep.dataset.chep).then(xong, () => {});
        return;
      }
      if (e.target.closest('[data-doi]')) {
        clearTimeout(hen); kho.ghi('don', null); donEl.hidden = true; hienDangNhap();
        $('#mua-email', lop).focus();
      }
    });
    const cu = docDon();
    if (cu) { $('#mua-email', lop).value = cu.email; hienDon(cu); } else hienDangNhap();
  }

  (async () => {
    const ma = kho.doc('mk');
    if (!ma || !sc) return hienKhoa();
    let dl;
    try { dl = await thu(ma); } catch (e) { return hienKhoa('Chưa tải được dữ liệu. Kiểm tra mạng rồi thử lại.'); }
    if (dl) return chayApp(dl);
    kho.ghi('mk', null); kho.ghi('mk_k', null);
    hienKhoa('Mật khẩu trên máy này đã bị thu hồi. Nhập mật khẩu mới.');
  })();
})();
