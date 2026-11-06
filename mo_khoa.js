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
  const UA = navigator.userAgent;
  const laIOS = /iP(hone|ad|od)/.test(UA), laAndroid = /Android/.test(UA);
  const laIOSSafari = laIOS && !navigator.standalone;
  // Trình duyệt nhúng trong app khác: không có mục thêm vào màn hình chính
  const appNhung = (UA.match(/Zalo|FBAN|FBAV|FB_IAB|Messenger|Instagram|TikTok|musical_ly|Line\//i) || [])[0];
  const TEN_NHUNG = /zalo/i.test(appNhung || '') ? 'Zalo' : /insta/i.test(appNhung || '') ? 'Instagram'
    : /tiktok|musical/i.test(appNhung || '') ? 'TikTok' : /line/i.test(appNhung || '') ? 'Line' : 'Facebook hoặc Messenger';
  const LINK_APP = location.origin + location.pathname;

  // ---------- Trang giới thiệu: ảnh chụp thật (tools/chup_gioi_thieu.py) ----------
  const ANH_QP = [
    ['qp_trang', 'Trang chính môn GDQP&AN: lưới đề thi thử có điểm từng đề, danh sách bài học', 'Đề thi thử có điểm từng đề, bài học có tiến độ'],
    ['qp_dung', 'Chọn đáp án xong hiện thẻ Chính xác, từ khóa tô vàng và mẹo nhớ', 'Chọn xong hiện từ khóa và mẹo nhớ'],
    ['qp_thi', 'Bài thi thử: bốn đáp án tô như phiếu trắc nghiệm', 'Thi thử: tô đáp án, nộp bài mới chấm'],
    ['qp_phieu', 'Phiếu trả lời: các ô câu đã tô, câu còn trống và nút nộp bài', 'Phiếu trả lời: thấy câu trống, nhảy tới câu bất kỳ'],
    ['qp_ket', 'Kết quả: 8 trên 10 điểm, số câu đúng, câu sai, nút luyện lại câu sai', 'Điểm thang 10, luyện lại đúng các câu sai'],
  ];
  const ANH_TR = [
    ['tr_trang', 'Trang chính môn Triết học: đề thi thử, bộ ôn tập của cô, các chủ đề', 'Năm đề 50 câu, bộ của cô, bảy chủ đề'],
    ['tr_bo', 'Câu hỏi trong bộ ôn tập của cô', 'Bộ ôn tập cô phát có mục riêng'],
    ['tr_dung', 'Chọn đáp án xong hiện từ khóa và mẹo nhớ', 'Mẹo nhớ cho từng câu'],
    ['tr_ket', 'Kết quả thi Triết học: 8,2 trên 10 điểm', 'Chấm như đề thật 50 câu'],
  ];
  const ANH_CO = [
    ['co_trang', 'Trang Cờ tướng: 6 mức đánh với máy, hai người, đấu qua mạng, học cờ', 'Đánh với máy, hai người, học cờ, giải thế'],
    ['co_bai', 'Bài học quân Pháo trên bàn cờ, có lời giảng', 'Học từng quân ngay trên bàn cờ'],
    ['co_van', 'Ván cờ với máy mức 3, quân gỗ chữ Hán', 'Quân gỗ chữ Hán như bàn cờ thật'],
    ['co_luc', 'Bản đồ lực: chấm đỏ và xanh cho vùng mỗi bên kiểm soát', 'Bản đồ lực: vùng mỗi bên kiểm soát'],
    ['co_tc', 'Bảng Thế cờ: bên nào nhỉnh hơn và việc cần chú ý', 'Thế cờ: ai hơn, việc gì cần làm trước'],
    ['co_xem', 'Xem lại ván: đồ thị cán cân và chấm từng nước', 'Xem lại ván, chấm từng nước'],
    ['co_the', 'Bài giải thế cờ chiếu bí 2 nước', 'Giải thế cờ chiếu bí 1 tới 5 nước'],
    ['co_mang', 'Đấu qua mạng: tạo phòng, lấy mã, vào phòng', 'Đấu qua mạng bằng mã phòng'],
  ];
  const daiAnh = ds => `<div class="dai-anh" tabindex="0" role="group" aria-label="Ảnh chụp app, vuốt ngang để xem">
    ${ds.map(([t, alt, cap]) => `<figure><img src="anh/${t}.jpg" alt="${alt}" width="480" height="1039" loading="lazy"><figcaption>${cap}</figcaption></figure>`).join('')}
  </div>`;

  // Hình vẽ lại nút và menu của Safari, Chrome để biết bấm vào đâu
  const I_CHIA_SE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15V3.5M8 7l4-4 4 4M7.5 10.5H6a1 1 0 0 0-1 1V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8.500a1 1 0 0 0-1-1h-1.500"/></svg>';
  const I_THEM = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="3.500"/><path d="M12 8.500v7M8.500 12h7"/></svg>';
  const I_SACH = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 6.500C10 5 7 4.500 4 5v14c3-.5 6 0 8 1.500 2-1.500 5-2 8-1.500V5c-3-.5-6 0-8 1.500zM12 6.500v14"/></svg>';
  const I_THE = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="7" width="13" height="13" rx="2"/><path d="M8 4h10a2 2 0 0 1 2 2v10"/></svg>';
  const I_LUI = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>';
  const I_TOI = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>';
  const I_CHEP = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>';
  const I_SAO = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4l2.400 5.200 5.600.6-4.200 3.800 1.200 5.600L12 16.400l-5 2.800 1.200-5.600L4 9.800l5.600-.6z"/></svg>';
  const I_TAI = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11M7.500 11l4.500 4.500 4.500-4.500M5 20h14"/></svg>';
  const ICON = '<img src="icon/icon-180.png" alt="" width="60" height="60">';
  const chepLink = `<span class="chep-link"><span class="link-chu">${esc0(LINK_APP)}</span> <button type="button" class="nut-nho" data-chep-link>Chép link</button></span>`;
  function esc0(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

  const hinhNha = kieu => `<div class="mo ${kieu} mo-nha" aria-hidden="true">
    <span class="o-ung-dung"></span><span class="o-ung-dung"></span>
    <span class="o-ung-dung la-app bam">${ICON}<i>Ôn thi</i></span><span class="o-ung-dung"></span>
  </div>`;

  const BUOC_IOS = [
    ['Mở link bằng Safari', `Đang đọc trong Zalo hay Messenger thì chép link này, dán vào Safari. ${chepLink}`,
      `<div class="mo ios mo-dia-chi" aria-hidden="true"><span class="thanh-dc">sangtdh-ht.github.io</span></div>`],
    ['Bấm nút Chia sẻ', 'Hình ô vuông có mũi tên đi lên, ở thanh dưới màn hình. Trên iOS 26: bấm dấu ba chấm cạnh thanh địa chỉ trước, rồi chọn Chia sẻ.',
      `<div class="mo ios mo-thanh" aria-hidden="true"><span>${I_LUI}</span><span class="mo-nhat">${I_TOI}</span><span class="bam">${I_CHIA_SE}</span><span>${I_SACH}</span><span>${I_THE}</span></div>`],
    ['Chọn Thêm vào MH chính', 'Kéo danh sách lên để tìm. Không thấy thì bấm Xem thêm ở cuối hàng.',
      `<div class="mo ios mo-ds" aria-hidden="true"><span>Sao chép ${I_CHEP}</span><span>Thêm vào mục ưa thích ${I_SAO}</span><span class="bam">Thêm vào MH chính ${I_THEM}</span></div>`],
    ['Bấm Thêm', 'Ở góc trên bên phải. Có công tắc mở như ứng dụng web thì để bật.',
      `<div class="mo ios mo-hoi" aria-hidden="true"><div class="hoi-tren"><span>Hủy</span><b>Thêm vào MH chính</b><span class="bam dam">Thêm</span></div><div class="hoi-than">${ICON}<span>Ôn thi</span></div></div>`],
    ['Mở icon Ôn thi, nhập mật khẩu', 'iPhone giữ dữ liệu của icon riêng với Safari, nên đã nhập trong Safari vẫn phải nhập lại một lần ở đây. Mở lần đầu khi có mạng để máy tải hết, lần sau không cần mạng.',
      hinhNha('ios')],
  ];
  const BUOC_ANDROID = [
    ['Mở link bằng Chrome', `Đang đọc trong Zalo hay Messenger thì chép link này, dán vào Chrome. ${chepLink}`,
      `<div class="mo adr mo-dia-chi" aria-hidden="true"><span class="thanh-dc">sangtdh-ht.github.io</span><span class="ba-cham"><i></i><i></i><i></i></span></div>`],
    ['Bấm nút ba chấm', 'Ở góc trên bên phải Chrome. Nếu Chrome tự hiện bảng mời cài ở cuối màn hình thì bấm luôn vào đó, rồi sang bước 4.',
      `<div class="mo adr mo-dia-chi" aria-hidden="true"><span class="thanh-dc">sangtdh-ht.github.io</span><span class="ba-cham bam"><i></i><i></i><i></i></span></div>`],
    ['Chọn Cài đặt ứng dụng', 'Máy nào không có mục này thì chọn Thêm vào màn hình chính. Tên mục đổi theo bản Chrome.',
      `<div class="mo adr mo-ds" aria-hidden="true"><span>Thẻ mới</span><span>Dấu trang</span><span class="bam">${I_TAI} Cài đặt ứng dụng</span></div>`],
    ['Bấm Cài đặt', 'Một số máy ghi là Thêm. Chờ vài giây để máy tạo icon.',
      `<div class="mo adr mo-hoi" aria-hidden="true"><b>Cài đặt ứng dụng?</b><div class="hoi-than">${ICON}<span>Ôn thi<small>sangtdh-ht.github.io</small></span></div><div class="hoi-nut-mo"><span>Hủy</span><span class="bam dam">Cài đặt</span></div></div>`],
    ['Mở icon Ôn thi, nhập mật khẩu', 'Icon nằm ở màn hình chính hoặc trong ngăn ứng dụng. Mở lần đầu khi có mạng để máy tải hết, lần sau không cần mạng.',
      hinhNha('adr')],
  ];
  const dsBuoc = ds => `<ol class="buoc-gt buoc-cai">${ds.map(([tieu, chu, hinh]) => `<li><b class="ten-buoc">${tieu}</b><p>${chu}</p>${hinh}</li>`).join('')}</ol>`;
  const hoiDap = ds => `<div class="hoi-dap">${ds.map(([h, d]) => `<details><summary>${h}</summary><p>${d}</p></details>`).join('')}</div>`;

  function hienKhoa(loiDau) {
    const lop = document.createElement('div');
    lop.className = 'man-khoa';
    const tabDau = laAndroid ? 'android' : 'ios';
    lop.innerHTML = `
      <div class="nen-khoa" aria-hidden="true">${window.DIA_HINH || ''}</div>
      <div class="trang-gt">
        <div class="cot-khoa">
        <header class="dau-gt">
          <div class="huy-khoa">${SVG_KHOA}</div>
          <div><h1>Ôn thi</h1><p class="mon-khoa">Trắc nghiệm GDQP&amp;AN, Triết học và Cờ tướng trên điện thoại</p></div>
        </header>
        <p class="loi-gt">457 câu ôn tập của hai môn, câu nào cũng có từ khóa và mẹo nhớ, thi thử chấm điểm như đề thật. Thêm bàn Cờ tướng để học từ đầu và đánh với máy.</p>
        <nav class="nhay-gt" aria-label="Xem nhanh">
          <a href="#gt-qp" class="n-qp">GDQP&amp;AN</a><a href="#gt-tr" class="n-tr">Triết học</a><a href="#gt-co" class="n-co">Cờ tướng</a><a href="#gt-cai" class="n-cai">Cách cài</a>
        </nav>
        ${appNhung ? `<p class="goi-y-khoa them nhung">Bạn đang mở trong ${TEN_NHUNG}, ở đây không cài được app. Chép link rồi dán vào ${laIOS ? 'Safari' : 'Chrome'}. ${chepLink}</p>` : ''}
        <form class="o-khoa" novalidate>
          <label for="mk">Mật khẩu của bạn</label>
          <input id="mk" type="text" autocomplete="off" autocorrect="off" autocapitalize="none" spellcheck="false"
            enterkeyhint="go" maxlength="16" placeholder="xx-xxxx-xxxx" aria-describedby="mk-loi mk-goi-y">
          <p class="loi-khoa" id="mk-loi" role="alert">${loiDau || ''}</p>
          <button class="nut-chinh" type="submit">Mở khóa</button>
          <p class="goi-y-khoa" id="mk-goi-y">Mỗi người một mật khẩu riêng. Chưa có thì hỏi người gửi link cho bạn.</p>
          ${laIOSSafari && !appNhung ? '<p class="goi-y-khoa them">Muốn dùng như app: <a href="#gt-cai">cài lên iPhone trước</a> rồi nhập mật khẩu trong icon <b>Ôn thi</b>.</p>' : ''}
        </form>
        <section class="o-mua" id="o-mua" aria-labelledby="mua-tieu-de" hidden>
          <h2 id="mua-tieu-de">Chưa có mật khẩu?</h2>
          <p class="chu-mua">Mua mật khẩu riêng giá <b id="mua-gia"></b>: nhập Gmail, chuyển khoản theo mã QR. Người bán kiểm tra tiền vào rồi gửi mật khẩu về Gmail đó.</p>
          <form id="mua-dang-nhap" class="form-mua" novalidate>
            <label for="mua-email">Gmail nhận mật khẩu</label>
            <input id="mua-email" type="email" inputmode="email" autocomplete="email" autocapitalize="none" spellcheck="false"
              enterkeyhint="go" placeholder="tenban@gmail.com" aria-describedby="mua-loi">
            <button class="nut-phu" type="submit">Tạo mã chuyển khoản</button>
          </form>
          <div id="mua-don" hidden></div>
          <p class="loi-khoa" id="mua-loi" role="alert"></p>
        </section>
        </div>

        <section class="dai-mon mon-qp" id="gt-qp" aria-labelledby="tieu-qp">
          <div class="trong">
            <header class="dau-mon">
              <svg class="dau-hieu" viewBox="0 0 60 60" aria-hidden="true"><circle cx="30" cy="30" r="29" fill="url(#g-vang)"/><circle cx="30" cy="30" r="22" fill="url(#g-men-do)"/><path d="M30 14l4.700 10.200 11.100 1.200-8.300 7.500 2.300 11-9.800-5.600-9.800 5.600 2.300-11-8.300-7.500 11.100-1.200z" fill="url(#g-sao-sang)"/></svg>
              <div><h2 id="tieu-qp">GDQP&amp;AN</h2><p>230 câu theo 11 bài</p></div>
            </header>
            ${daiAnh(ANH_QP)}
            <ul class="ds-gt">
              <li><b>Học theo từng bài.</b> Chọn đáp án là biết đúng sai ngay. Đúng hay sai đều hiện từ khóa tô vàng và một mẹo nhớ ngắn.</li>
              <li><b>Thi thử tô phiếu.</b> Chọn đề 20, 30, 50 hoặc 100 câu ở menu. Đề trộn đủ các bài, làm hết các đề là đi qua đủ 230 câu.</li>
              <li><b>Nộp bài mới chấm.</b> Điểm thang 10, xem lại từng câu kèm mẹo, bấm một nút để luyện lại riêng các câu sai.</li>
              <li><b>Không học vẹt vị trí.</b> Mỗi lần làm, câu hỏi và đáp án xáo lại. Đáp án kiểu "Tất cả đều đúng" vẫn nằm cuối.</li>
              <li><b>Biết mình thuộc tới đâu.</b> Mỗi bài có huy hiệu tiến độ, trang chính đếm số câu đã thuộc và ghi điểm từng đề.</li>
              <li><b>Báo trước câu chưa chắc.</b> Bảy câu có đáp án suy luận, chưa tìm được căn cứ trong giáo trình, đều có dòng cảnh báo.</li>
            </ul>
          </div>
        </section>

        <section class="dai-mon mon-tr" id="gt-tr" aria-labelledby="tieu-tr">
          <div class="nen-dai" aria-hidden="true">${window.XOAY_OC || ''}</div>
          <div class="trong">
            <header class="dau-mon">
              <svg class="dau-hieu" viewBox="0 0 60 60" aria-hidden="true"><circle cx="30" cy="30" r="29" fill="url(#g-kim-lam)"/><circle cx="30" cy="30" r="22" fill="url(#g-men-lam)"/><path d="M30 12c1 6 7 9 7 16a7 7 0 0 1-14 0c0-3 1.500-5 3-6.500 0 2.500 1 4 2 4.500 1-4-.5-8 2-14z" fill="url(#g-sao-sang)"/><path d="M16 38c5-1.500 10-1 14 1.500 4-2.500 9-3 14-1.500v7c-5-1.500-10-1-14 1.500-4-2.500-9-3-14-1.500z" fill="#F4F0E0"/></svg>
              <div><h2 id="tieu-tr">Triết học</h2><p>227 câu theo 7 chủ đề, có bộ ôn tập của cô</p></div>
            </header>
            ${daiAnh(ANH_TR)}
            <ul class="ds-gt">
              <li><b>Bộ ôn tập của cô có mục riêng.</b> 97 câu, đã gộp ba câu trùng. Đề thật 50 câu có 17 câu lấy từ bộ này.</li>
              <li><b>Thêm 130 câu từ tài liệu lớp.</b> Đã lọc trùng, bỏ câu mơ hồ, chia theo 7 chủ đề để học dần.</li>
              <li><b>Đề 50 câu như đề thật.</b> Mặc định 5 đề, đổi được sang 20, 30 hoặc 100 câu. Làm hết là đi qua đủ 227 câu.</li>
              <li><b>Học và thi giống GDQP&amp;AN.</b> Từ khóa, mẹo nhớ, tô phiếu, chấm điểm, luyện lại câu sai. Mỗi môn giữ riêng bài, đề và điểm.</li>
            </ul>
          </div>
        </section>

        <section class="dai-mon mon-co" id="gt-co" aria-labelledby="tieu-co">
          <div class="trong">
            <header class="dau-mon">
              <span class="dau-hieu quan-dau" aria-hidden="true">帥</span>
              <div><h2 id="tieu-co">Cờ tướng</h2><p>Chưa biết chơi cũng học được, chơi rồi thì có máy để đấu</p></div>
            </header>
            ${daiAnh(ANH_CO)}
            <ul class="ds-gt">
              <li><b>Học cờ từ con số 0.</b> 37 bài theo 6 chặng: luật từng quân, nhìn thế cờ, khai cuộc, đòn chiến thuật, sát cục, tàn cuộc. Đi sai thì app nói rõ vì sao, như Mã bị cản chân, Pháo thiếu ngòi.</li>
              <li><b>Đánh với máy 6 mức.</b> Trợ giảng chấm từng nước, cảnh báo quân bị dọa, hỏi lại khi bạn sắp đi nước hớ. Có đi lại và gợi ý.</li>
              <li><b>Nhìn ra thế cờ.</b> Bản đồ lực cho thấy vùng mỗi bên kiểm soát, mũi tên chỉ đe dọa, bảng Thế cờ nói bên nào hơn và việc nào cần làm trước.</li>
              <li><b>Xem lại ván.</b> Đồ thị cán cân cả ván, đánh dấu sai lầm, thử lại từ bất kỳ nước nào. Lưu 30 ván gần nhất, có biên bản ký hiệu Việt.</li>
              <li><b>Giải thế cờ.</b> 226 thế chiếu bí 1 tới 5 nước và 90 đòn thắng quân. Có luyện mắt 10 câu, tự bày thế cho máy giải.</li>
              <li><b>Đấu với bạn.</b> Hai người chung một máy, bàn tự xoay theo lượt. Hoặc đấu qua mạng bằng mã phòng 6 ký tự, không cần tài khoản.</li>
              <li><b>Có khí thế bàn cờ thật.</b> Quân gỗ chữ Hán, đổi sang chữ Việt được. Ăn quân, chiếu tướng thì quân đập mạnh, bàn rung, hiện lời khiêu khích, tắt được trong menu.</li>
            </ul>
          </div>
        </section>

        <section class="dai-mon mon-chung" aria-labelledby="tieu-chung">
          <div class="trong">
            <h2 id="tieu-chung" class="tieu-chung">Chung cho cả app</h2>
            <ul class="ds-gt">
              <li><b>Chạy cả khi mất mạng.</b> Sau lần mở đầu, ôn thi và đánh với máy không cần mạng. Chỉ đấu cờ qua mạng mới cần.</li>
              <li><b>Có âm thanh.</b> Chuông khi đúng, hai nốt trầm khi sai, tiếng bút chì khi tô phiếu, kèn hiệu khi đạt từ 8 điểm. Tắt được trong menu.</li>
              <li><b>Mở lại đúng chỗ đang học.</b> Thoát giữa chừng, lần sau vào đúng môn và lượt đang làm dở.</li>
              <li><b>Không cần tài khoản.</b> Nhập mật khẩu một lần, máy nhớ. Tiến độ lưu ngay trong máy, nên đổi máy thì nhập lại mật khẩu và học tiếp từ đầu.</li>
            </ul>
          </div>
        </section>

        <section class="dai-mon mon-cai" id="gt-cai" aria-labelledby="tieu-cai">
          <div class="trong">
            <h2 id="tieu-cai" class="tieu-chung">Cài lên điện thoại</h2>
            <p class="chu-cai">App không có trên App Store hay CH Play. Bạn thêm trang này vào màn hình chính, mất khoảng một phút, app nặng khoảng 3 MB.</p>
            ${!laIOS && !laAndroid ? '<p class="chu-cai">Bạn đang xem trên máy tính. Mở link này trên điện thoại rồi làm theo các bước dưới.</p>' : ''}
            <div class="tab-cai" role="tablist" aria-label="Chọn loại điện thoại">
              <button type="button" role="tab" id="tab-ios" aria-controls="cai-ios" data-tab="ios" aria-selected="${tabDau === 'ios'}" tabindex="${tabDau === 'ios' ? 0 : -1}">iPhone, iPad</button>
              <button type="button" role="tab" id="tab-android" aria-controls="cai-android" data-tab="android" aria-selected="${tabDau === 'android'}" tabindex="${tabDau === 'android' ? 0 : -1}">Android</button>
            </div>
            <div id="cai-ios" role="tabpanel" aria-labelledby="tab-ios" ${tabDau === 'ios' ? '' : 'hidden'}>
              ${dsBuoc(BUOC_IOS)}
              <h3 class="tieu-hoi">Gặp trục trặc trên iPhone</h3>
              ${hoiDap([
                ['Không thấy mục Thêm vào MH chính', 'Thường do đang mở trong Zalo, Messenger hoặc Facebook. Chép link, dán vào Safari rồi làm lại từ bước 1.'],
                ['Mở icon mà vẫn thấy thanh địa chỉ Safari', 'Icon đang là dấu trang thường. Xóa icon, thêm lại, và để bật công tắc mở như ứng dụng web ở bước 4.'],
                ['Icon đòi mật khẩu dù đã nhập trong Safari', 'Bình thường. Nhập lại một lần trong icon, từ đó máy nhớ.'],
                ['Muốn gỡ app', 'Nhấn giữ icon, chọn xóa. Tiến độ học mất theo icon, mật khẩu thì vẫn dùng lại được.'],
              ])}
            </div>
            <div id="cai-android" role="tabpanel" aria-labelledby="tab-android" ${tabDau === 'android' ? '' : 'hidden'}>
              ${dsBuoc(BUOC_ANDROID)}
              <h3 class="tieu-hoi">Gặp trục trặc trên Android</h3>
              ${hoiDap([
                ['Không thấy mục cài trong menu', 'Thường do đang mở trong Zalo, Messenger hoặc Facebook. Chép link, dán vào Chrome. Máy chưa có Chrome thì tải trên CH Play.'],
                ['Đã cài mà không thấy icon', 'Xem trong ngăn ứng dụng. Xiaomi, Oppo, Vivo hay chặn tạo icon: vào Cài đặt, Ứng dụng, Chrome, Quyền, cho phép tạo lối tắt trên màn hình chính, rồi cài lại.'],
                ['Máy Samsung, muốn dùng Samsung Internet', 'Có biểu tượng cài trên thanh địa chỉ thì bấm vào đó. Không có thì mở menu ba gạch, chọn thêm trang vào màn hình chờ. Làm trên Chrome thì đúng theo các bước ở trên.'],
                ['Muốn gỡ app', 'Nhấn giữ icon, chọn gỡ cài đặt. Xóa dữ liệu của Chrome cũng xóa tiến độ và mật khẩu máy đang nhớ, nhập lại mật khẩu là mở được.'],
              ])}
            </div>
            <h3 class="tieu-hoi">Về mật khẩu</h3>
            ${hoiDap([
              ['Đã chuyển khoản mà chưa thấy mật khẩu', 'Người bán kiểm tra tiền bằng tay nên có thể cần chờ một lúc. Trang tự báo khi đã gửi. Xem cả mục Quảng cáo và Thư rác trong Gmail.'],
              ['Quên mật khẩu, hoặc đổi điện thoại', 'Tìm thư trong Gmail đã dùng khi mua, mật khẩu vẫn dùng được trên máy mới.'],
            ])}
            <a class="nut-chinh len-mua" href="#o-mua">Lên ô mua mật khẩu</a>
          </div>
        </section>
      </div>`;
    document.body.appendChild(lop);
    moMua(lop);
    moCai(lop);
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

  // ---------- Phần cài đặt: đổi tab iPhone / Android, chép link ----------
  function moCai(lop) {
    const tabs = [...lop.querySelectorAll('.tab-cai [role=tab]')];
    const chon = t => tabs.forEach(n => {
      const dung = n === t;
      n.setAttribute('aria-selected', dung);
      n.tabIndex = dung ? 0 : -1;
      $('#cai-' + n.dataset.tab, lop).hidden = !dung;
    });
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => chon(t));
      t.addEventListener('keydown', e => {
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
        e.preventDefault();
        const moi = tabs[(i + 1) % tabs.length];
        chon(moi); moi.focus();
      });
    });
    lop.addEventListener('click', e => {
      const nut = e.target.closest('[data-chep-link]');
      if (!nut) return;
      const xong = () => { nut.textContent = 'Đã chép'; setTimeout(() => { nut.textContent = 'Chép link'; }, 1600); };
      const bao = () => { nut.textContent = 'Nhấn giữ link để chép'; };   // trình duyệt nhúng hay chặn bộ nhớ tạm
      if (navigator.clipboard) navigator.clipboard.writeText(LINK_APP).then(xong, bao); else bao();
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
        ${d.tuDong ? '<p class="chu-mua">Tiền vào tài khoản là mật khẩu tự gửi về Gmail của bạn, thường trong 1–2 phút. Trang này tự báo khi đã gửi.</p>' : ''}
        <button type="button" class="nut-chinh nut-da-chuyen" data-da-chuyen>Tôi đã chuyển khoản</button>
        <p class="tt-mua" id="tt-mua" role="status" hidden></p>`;
      if (d.daBao) daBao();
      kiem(d);
    }
    function daBao() {   // đã báo người bán: ẩn nút, hiện trạng thái chờ
      const nut = $('[data-da-chuyen]', lop), el = $('#tt-mua', lop), d = docDon() || {};
      if (nut) nut.hidden = true;
      el.hidden = false;
      el.textContent = d.tuDong
        ? 'Đang chờ tiền vào tài khoản. Tới nơi là mật khẩu tự gửi về Gmail của bạn; quá 10 phút chưa thấy thì người bán kiểm tra tay giúp bạn.'
        : 'Đã báo người bán. Người bán kiểm tra tiền vào rồi gửi mật khẩu về Gmail của bạn; trang này tự báo khi đã gửi.';
    }
    async function baoDaChuyen(nut) {
      const d = docDon();
      if (!d) return;
      nut.disabled = true; nut.textContent = 'Đang báo…'; loi.textContent = '';
      try {
        const t = await goi(ch.mayChu, { method: 'POST', body: JSON.stringify({ viec: 'da_chuyen', maDon: d.maDon }) });
        if (!t.ok) throw new Error(t.loi || 'Chưa báo được, thử lại.');
        d.daBao = true; if ('tuDong' in t) d.tuDong = !!t.tuDong;
        kho.ghi('don', JSON.stringify(d));
        daBao();
      } catch (e) {
        loi.textContent = e instanceof TypeError ? 'Chưa kết nối được máy chủ bán mã. Thử lại sau ít phút.' : e.message;
        nut.disabled = false; nut.textContent = 'Tôi đã chuyển khoản';
      }
    }
    async function kiem(d) {
      clearTimeout(hen);
      if (!document.body.contains(lop)) return;   // đã mở khóa xong
      const el = $('#tt-mua', lop);
      try {
        const t = await goi(`${ch.mayChu}?viec=trang_thai&don=${encodeURIComponent(d.maDon)}`);
        if (t.tt === 'da_gui') {
          const nut = $('[data-da-chuyen]', lop);
          if (nut) nut.hidden = true;
          el.hidden = false;
          el.innerHTML = `Đã nhận tiền. Mật khẩu đã gửi về <b>${esc(d.email)}</b>: mở Gmail (xem cả mục Quảng cáo, Thư rác), chép mật khẩu vào ô ở trên.`;
          el.classList.add('xong'); kho.ghi('don', null);
          return;
        }
        if (t.tt === 'loi') {
          daBao();
          el.textContent = 'Đã nhận tiền nhưng gửi mật khẩu bị trục trặc; người bán sẽ gửi lại cho bạn.';
          return;
        }
        if (t.tt === 'da_chuyen') daBao();   // đã báo từ máy khác hoặc trước khi tải lại trang
        if (t.tt === 'thu_hoi' || t.ok === false) { kho.ghi('don', null); donEl.hidden = true; hienDangNhap(); return; }
      } catch (e) { /* mạng chập chờn: lát thử lại */ }
      hen = setTimeout(() => kiem(d), 12000);
    }
    khu.addEventListener('click', e => {
      const bao = e.target.closest('[data-da-chuyen]');
      if (bao) return baoDaChuyen(bao);
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
