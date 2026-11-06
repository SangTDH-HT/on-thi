/* Cờ tướng: trang chính, bài học, giải thế cờ, luyện mắt, tự bày thế, bảng tra, ván đã lưu, chế độ chụp màn hình. */
(() => {
  'use strict';
  const L = window.CoLoi, PT = window.CoPT, CO = window.CO, DL = window.CO_DL;
  const $ = (s, g = document) => g.querySelector(s);
  const $$ = (s, g = document) => [...g.querySelectorAll(s)];
  const esc = CO.esc, doi = CO.doi;
  const BEN = PT.BEN;
  const kho = () => CO.OT.kho;
  const xao = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const CHU_Q = { K: 1, A: 2, B: 3, N: 4, R: 5, C: 6, P: 7 };
  const dsBai = () => DL.BAI.flatMap(c => c.bai);
  const OK_ICON = '<svg viewBox="0 0 24 24" class="ic" aria-hidden="true"><path d="M5 12.6l4.3 4.2L19.2 7"/></svg>';
  let mayCuc = null;
  const may = () => mayCuc || (mayCuc = L.MayTim());

  CO.moMan = () => { CO.OT.diToi('co', 1); return true; };
  CO.veMan = () => { CO.dongNgan(); CO.OT.veChinh(); CO.OT.diToi('chinh', -1); };
  CO.hoiTam = o => CO.OT.hoi(o);

  // ---------- Hộp nổi dưới đáy màn ----------
  let dongTamHienTai = null;
  CO.moTam = (html, o = {}) => {
    const lop = $('#co-tam'), tam = $('.tam-hoi', lop);
    tam.innerHTML = html;
    const dong = () => {
      lop.hidden = true; lop.onclick = null; dongTamHienTai = null;
      if (o.khiDong) o.khiDong();
    };
    dongTamHienTai = dong;
    lop.onclick = e => {
      if (e.target === lop) { dong(); return; }
      if (o.khiBam) o.khiBam(e, dong);
    };
    CO.OT.moLop(lop);
    return dong;
  };
  CO.dongTam = () => { if (dongTamHienTai) dongTamHienTai(); };
  // Ngăn trượt: để bàn cờ còn nhìn thấy phía trên, chạm bàn vẫn đi được
  let nganDong = null;
  CO.moNgan = (html, o = {}) => {
    const ngan = $('#co-ngan');
    $('.ngan-nd', ngan).innerHTML = html;
    if (o.caoTheoBan) {
      // Ngăn mở ngay dưới bàn cờ để vẫn nhìn được cả bàn khi đọc phân tích
      const r = o.caoTheoBan.getBoundingClientRect();
      ngan.style.top = Math.min(Math.max(r.bottom + 4, innerHeight * 0.3), innerHeight * 0.74) + 'px';
    } else ngan.style.top = '30vh';
    ngan.hidden = false;
    nganDong = o.khiDong || null;
    ngan.onclick = e => {
      if (e.target.closest('.ngan-dong')) { CO.dongNgan(); return; }
      if (o.khiBam) o.khiBam(e);
    };
    if (!CO.OT.giamDong.matches) ngan.animate([{ transform: 'translateY(100%)' }, { transform: 'none' }], { duration: 340, easing: 'cubic-bezier(.2,1.05,.3,1)' });
    $('.ngan-nd', ngan).scrollTop = 0;
  };
  CO.capNhatNgan = html => { const ngan = $('#co-ngan'); if (!ngan.hidden) { const nd = $('.ngan-nd', ngan), y = nd.scrollTop; nd.innerHTML = html; nd.scrollTop = y; } };
  CO.dongNgan = () => { const ngan = $('#co-ngan'); if (ngan.hidden) return; ngan.hidden = true; if (nganDong) nganDong(); nganDong = null; };
  CO.saoChep = chu => {
    const thu = () => {
      const t = document.createElement('textarea');
      t.value = chu; t.setAttribute('readonly', '');
      t.style.cssText = 'position:fixed;top:0;left:0;opacity:0;-webkit-user-select:text;user-select:text';
      document.body.appendChild(t);
      t.focus(); t.setSelectionRange(0, chu.length);
      try { document.execCommand('copy'); } catch (e) { /* trình duyệt chặn */ }
      t.remove();
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(chu).catch(thu);
    else thu();
    CO.OT.rung('dung');
  };

  // ---------- Nền phần Cờ tướng: lưới bàn cờ cỡ lớn chìm trong gỗ gụ ----------
  CO.nen = () => {
    const C = 92, X0 = 11, Y0 = 34, R = 9;
    let m = '';
    for (let r = 0; r < R; r++) m += `M${X0 - C * 2} ${Y0 + r * C}H${X0 + C * 6}`;
    for (let c = -2; c < 7; c++) m += `M${X0 + c * C} ${Y0 - C}V${Y0 + C * 3}M${X0 + c * C} ${Y0 + C * 4}V${Y0 + C * R}`;
    const x = c => X0 + c * C, y = r => Y0 + r * C;
    return `<svg viewBox="0 0 390 844" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <g class="dm"><path d="${m}"/></g>
      <g class="dm-cai"><path d="M${x(1)} ${y(0)}L${x(3)} ${y(2)}"/><path d="M${x(3)} ${y(0)}L${x(1)} ${y(2)}"/>
        <path d="M${x(-2)} ${y(3)}H${x(6)}"/><path d="M${x(-2)} ${y(4)}H${x(6)}"/>
        <path d="M${x(1)} ${y(6)}L${x(3)} ${y(8)}"/><path d="M${x(3)} ${y(6)}L${x(1)} ${y(8)}"/></g></svg>`;
  };

  // ---------- Trang chính ----------
  const iconRow = (quan, so, xong) => (quan
    ? `<span class="bieu-quan${xong ? ' xong' : ''}" aria-hidden="true">${CO.htmlQuan(CHU_Q[quan])}</span>`
    : `<span class="bieu-so${xong ? ' xong' : ''}" aria-hidden="true">${xong ? OK_ICON : so}</span>`);
  function hang(lam, bieu, ten, phu, nhan) {
    return `<li><button class="bai bai-co" data-co="${lam}" aria-label="${esc(nhan || ten)}${phu ? '. ' + esc(phu.replace(/<[^>]+>/g, '')) : ''}">${bieu}
      <span class="chu-bai"><span class="ten">${esc(ten)}</span>${phu ? `<span class="phu">${phu}</span>` : ''}</span></button></li>`;
  }
  CO.veTrang = () => {
    const nd = $('#nd-co');
    const hoc = kho().doc('co.hoc', {}), the = kho().doc('co.the', {}), tk = kho().doc('co.tk', {}), ls = kho().doc('co.ls', []);
    const baiHet = dsBai(), soBai = baiHet.length, daHoc = baiHet.filter(b => hoc[b.ma]).length;
    const tiep = baiHet.find(b => !hoc[b.ma]);
    const vanDo = CO.vanDo(), phongDo = CO.phongDo();
    const C = 2 * Math.PI * 56;
    const vong = `<svg class="vong-huy" viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="56" class="vong-nen"/><circle cx="60" cy="60" r="56" class="vong-tien" stroke-dasharray="${(C * daHoc / soBai).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 60 60)"/></svg>`;
    const tiepNut = tiep ? `<button class="nut-chinh" data-co="bai:${tiep.ma}">Học tiếp: ${esc(tiep.ten)}<small>${daHoc ? `Đã xong ${daHoc}/${soBai} bài` : `Bắt đầu từ đây, khoảng ${tiep.phut} phút`}</small></button>` : '';
    const vanDoNut = vanDo ? `<button class="nut-phu" data-co="danh-tiep">Đánh tiếp: ${vanDo.kieu === 'may' ? `Mức ${vanDo.muc}` : 'Hai người'}, nước ${Math.ceil(vanDo.ds.length / 2) + 1}</button>` : '';
    const phongNut = phongDo ? `<button class="nut-phu" data-co="phong-tiep">Về phòng ${esc(phongDo.ma)}: đấu tiếp qua mạng</button>` : '';
    const muc = L.MUC.map(m => {
      const k = tk[m.so], ghi = k ? `${k.t} thắng, ${k.b} thua` : m.ten;
      return `<button class="de co-muc" data-co="muc:${m.so}" aria-label="Mức ${m.so}, ${m.ten}${k ? `, ${k.t} thắng ${k.b} thua ${k.h} hòa` : ''}">
        <span class="nhan">Mức</span><b>${m.so}</b><span class="kq${k && k.t ? ' cao-co' : ''}">${ghi}</span></button>`;
    }).join('');
    const chang = DL.BAI.map((c, i) => {
      const da = c.bai.filter(b => hoc[b.ma]).length;
      const mo = !!tiep && c.bai.includes(tiep);
      return `<details class="chang"${mo ? ' open' : ''}>
        <summary><span class="ten-chang">${esc(c.chang)}</span><span class="dem-chang">${da}/${c.bai.length}</span><small>${esc(c.mo)}</small></summary>
        <ul class="ds-bai gon">${c.bai.map((b, k) => hang(`bai:${b.ma}`, iconRow(b.quan, k + 1, hoc[b.ma]), b.ten, hoc[b.ma] ? '<span class="xong">Đã học</span>' : `Khoảng ${b.phut} phút`, `Bài ${b.ten}`)).join('')}</ul></details>`;
    }).join('');
    const nhomThe = window.CO_THE.nhom.map(g => {
      const da = g.ds.filter((_, i) => the[`${g.ma}-${i}`]).length;
      return hang(`the:${g.ma}`, `<span class="bieu-so the${da === g.ds.length ? ' xong' : ''}" aria-hidden="true">${g.n || '!'}</span>`, g.ten, `${da ? `Đã giải ${da}/${g.ds.length}` : `${g.ds.length} thế`}. ${esc(g.mo)}`);
    }).join('');
    nd.innerHTML = `
      <header class="dau-trang">
        <div class="huy-lon huy-co">${vong}<span class="quan-huy">${CO.htmlQuan(1, '')}</span></div>
        <div class="dau-chu"><h1 class="ten-app">Cờ tướng</h1>
          <p class="thuoc">${daHoc ? `Đã học<b>${daHoc}<small>/${soBai} bài</small></b>` : `${soBai} bài ngắn, 6 mức máy, ${window.CO_THE.nhom.reduce((a, g) => a + g.ds.length, 0)} thế cờ.`}</p></div>
      </header>
      <div class="co-tiep">${phongNut}${vanDoNut}${tiepNut}</div>
      <h2 class="nhan-muc">Đánh cờ</h2>
      <p class="chu-thich">Chọn mức của máy. Mức 1 hay hớ quân, Mức 6 nghĩ 3 giây mỗi nước.</p>
      <div class="luoi-de luoi-muc">${muc}</div>
      <ul class="ds-bai gon">
        ${hang('hai-nguoi', '<span class="bieu-so nguoi" aria-hidden="true">2</span>', 'Hai người một máy', 'Đặt điện thoại giữa bàn, thay phiên nhau đi')}
        ${hang('mang', '<span class="bieu-so nguoi" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 19.5h.01M8.5 16a5 5 0 0 1 7 0M5 12.5a10 10 0 0 1 14 0M2 9a15 15 0 0 1 20 0"/></svg></span>', 'Đấu qua mạng', 'Tạo phòng, gửi mã cho bạn. Ai ở đâu cũng đấu được')}
      </ul>
      <h2 class="nhan-muc">Học cờ</h2>
      <p class="chu-thich">Mỗi bài vài phút, có bàn cờ để đi thử. Đi sai, app nói rõ vì sao sai.</p>
      <div class="ds-chang">${chang}</div>
      <h2 class="nhan-muc">Giải thế cờ</h2>
      <p class="chu-thich">Thế nào cũng có lời giải đã được máy chứng minh.</p>
      <ul class="ds-bai gon">${nhomThe}
        ${hang('mat', '<span class="bieu-so the" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg></span>', 'Luyện mắt nhìn thế cờ', 'Mười câu nhanh: quân nào bị dọa, ăn được gì, bên nào hơn')}
        ${hang('anh', '<span class="bieu-so the" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10.500" r="1.800"/><path d="M21 16l-5-5-8 8"/></svg></span>', 'Đưa ảnh thế cờ, máy tính nước', 'Ảnh chụp màn hình hay bàn cờ thật: chiếu bí trong mấy nước, hoặc tránh bị chiếu bí')}
        ${hang('bay', '<span class="bieu-so the" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16zM13 7l4 4"/></svg></span>', 'Tự bày thế, máy giải', 'Xếp quân như thế gặp ngoài đời, máy tìm đường thắng')}
      </ul>
      <h2 class="nhan-muc">Tra cứu</h2>
      <ul class="ds-bai co-cuoi">
        ${hang('tra', '<span class="bieu-so" aria-hidden="true">?</span>', 'Bảng tra các quân', 'Cách đi, giá trị, chữ Hán')}
        ${hang('tu', '<span class="bieu-so" aria-hidden="true">Aa</span>', 'Từ điển cờ tướng', `${DL.TU.length} thuật ngữ giải thích bằng lời dễ hiểu`)}
        ${hang('ls', '<span class="bieu-so" aria-hidden="true">≡</span>', 'Ván đã lưu', ls.length ? `${ls.length} ván, xem lại có phân tích` : 'Chưa có ván nào, đánh xong sẽ tự lưu')}
      </ul>`;
    if (!CO.OT.giamDong.matches && !veMotLan) {
      veMotLan = true;
      const q = $('.quan-huy .mat', nd);
      if (q) q.animate([{ transform: 'translateY(-46px) scale(1.5) rotate(-14deg)', opacity: 0 }, { transform: 'translateY(0) scale(.94)', opacity: 1, offset: 0.72 }, { transform: 'scale(1.03)', offset: 0.86 }, { transform: 'none' }], { duration: 560, delay: 240, easing: 'cubic-bezier(.55,0,.9,.5)', fill: 'backwards' });
    }
  };
  let veMotLan = false;
  CO.veMenu = el => {
    const c = CO.CAI;
    el.innerHTML = `<h3 class="muc-menu">Chữ trên quân cờ</h3>
      <div class="chon-chu" role="radiogroup" aria-label="Chữ trên quân cờ">
        <button class="co" role="radio" aria-checked="${c.chu === 'han'}" data-chu="han"><i class="bong"></i><span class="vi-du">${CO.htmlQuan(5 + 8, '', 'han')}</span><span>Chữ Hán<small>Như bàn cờ thật</small></span></button>
        <button class="co" role="radio" aria-checked="${c.chu === 'viet'}" data-chu="viet"><i class="bong"></i><span class="vi-du">${CO.htmlQuan(5 + 8, '', 'viet')}</span><span>Chữ Việt<small>Tạm dùng khi chưa nhớ mặt chữ</small></span></button>
      </div>
      <h3 class="muc-menu">Khi đánh cờ</h3>
      <div class="dong-am"><p><b>Đập quân và khiêu khích</b><small>Khi ăn quân, chiếu tướng: đập mạnh, rung bàn, hiện lời chọc.</small></p>
        <button class="cong-tac" id="nut-dap" role="switch" aria-checked="${!!c.dap}" aria-label="Đập quân và khiêu khích"><i></i></button></div>`;
    el.onclick = e => {
      const b = e.target.closest('[data-chu]');
      if (b) { c.chu = b.dataset.chu; CO.luuCai(); CO.veMenu(el); CO.OT.rung('chon'); CO.veTrang(); return; }
      if (e.target.closest('#nut-dap')) { c.dap = c.dap ? 0 : 1; CO.luuCai(); $('#nut-dap').setAttribute('aria-checked', !!c.dap); CO.OT.rung('chon'); if (c.dap) CO.OT.phat('dap'); }
    };
  };

  // ---------- Hộp chọn khi mở ván ----------
  CO.hopVanMoi = (soMuc) => {
    const m = L.MUC[soMuc - 1];
    let ben = 0, tg = 1;
    const ve = () => `<h2>Mức ${m.so}: ${esc(m.ten)}</h2><p>${esc(m.mo)}</p>
      <div class="chon-ben" role="radiogroup" aria-label="Chọn bên">
        <button role="radio" aria-checked="${ben === 0}" data-ben="0"><i class="dau-ben ben-do"></i>Cầm Đỏ<small>Đi trước</small></button>
        <button role="radio" aria-checked="${ben === 1}" data-ben="1"><i class="dau-ben ben-den"></i>Cầm Đen<small>Đi sau</small></button>
        <button role="radio" aria-checked="${ben === 2}" data-ben="2"><i class="dau-ben ben-tron"></i>Ngẫu nhiên</button>
      </div>
      <div class="dong-am"><p><b>Trợ giảng</b><small>Chấm từng nước, cảnh báo khi sắp mất quân lớn, chỉ quân đang bị dọa.</small></p>
        <button class="cong-tac" data-lam-hop="tg" role="switch" aria-checked="${!!tg}" aria-label="Trợ giảng"><i></i></button></div>
      <button class="nut-chinh" data-lam-hop="bat">Bắt đầu đánh</button>
      <button class="nut-chu" data-lam-hop="thoi">Để sau</button>`;
    const bat = () => {
      const d = CO.vanDo();
      const chay = () => { CO.dongTam(); kho().ghi('co.dang', null); CO.moVanMay(soMuc, ben === 2 ? (Math.random() < 0.5 ? 0 : 1) : ben, !!tg); };
      if (d) {
        CO.dongTam();
        CO.OT.hoi({ tieuDe: 'Bỏ ván đang đánh dở?', noiDung: `Bạn còn ván ở nước ${Math.ceil(d.ds.length / 2) + 1}. Mở ván mới sẽ bỏ ván đó.`, nut: [{ nhan: 'Bỏ và đánh ván mới', kieu: 'chinh', gt: 1 }, { nhan: 'Đánh tiếp ván cũ', kieu: 'phu', gt: 2 }, { nhan: 'Để sau', kieu: 'chu', gt: null }] })
          .then(g => { if (g === 1) { kho().ghi('co.dang', null); CO.moVanMay(soMuc, ben === 2 ? (Math.random() < 0.5 ? 0 : 1) : ben, !!tg); } else if (g === 2) CO.moVanDo(); });
      } else chay();
    };
    CO.moTam(ve(), {
      khiBam: (e, dong) => {
        const b = e.target.closest('[data-ben]');
        if (b) { ben = +b.dataset.ben; $('#co-tam .tam-hoi').innerHTML = ve(); CO.OT.rung('chon'); return; }
        const l = e.target.closest('[data-lam-hop]');
        if (!l) return;
        if (l.dataset.lamHop === 'tg') { tg = tg ? 0 : 1; l.setAttribute('aria-checked', !!tg); CO.OT.rung('chon'); } else if (l.dataset.lamHop === 'bat') bat();
        else dong();
      },
    });
  };
  function hopMang() {
    let ten = kho().doc('co.ten', '');
    let ben = 2;
    const ve = loi => `<h2>Đấu qua mạng</h2>
      <p>Không cần tài khoản. Nước đi đi qua máy chủ công cộng miễn phí, ai biết mã phòng cũng xem được ván, nên chỉ cần đặt một tên gọi vui.</p>
      <label class="o-nhap"><span>Tên hiển thị</span><input id="m-ten" maxlength="16" autocomplete="off" placeholder="Ví dụ: Sáng" value="${esc(ten)}"></label>
      <h3 class="muc-tam">Tạo phòng mới</h3>
      <div class="chon-ben" role="radiogroup" aria-label="Chọn bên khi tạo phòng">
        <button role="radio" aria-checked="${ben === 0}" data-ben="0"><i class="dau-ben ben-do"></i>Cầm Đỏ</button>
        <button role="radio" aria-checked="${ben === 1}" data-ben="1"><i class="dau-ben ben-den"></i>Cầm Đen</button>
        <button role="radio" aria-checked="${ben === 2}" data-ben="2"><i class="dau-ben ben-tron"></i>Ngẫu nhiên</button>
      </div>
      <button class="nut-chinh" data-lam-hop="tao">Tạo phòng, lấy mã</button>
      <h3 class="muc-tam">Hoặc vào phòng của bạn</h3>
      <div class="dong-ma"><label class="o-nhap"><span>Mã phòng</span><input id="m-ma" maxlength="6" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="6 ký tự"></label>
        <button class="nut-phu" data-lam-hop="vao">Vào phòng</button></div>
      <p class="bao-loi" id="m-loi" role="alert">${loi ? esc(loi) : ''}</p>
      <button class="nut-chu" data-lam-hop="thoi">Để sau</button>`;
    const luuTen = () => { const i = $('#m-ten'); if (i) { ten = i.value.trim(); kho().ghi('co.ten', ten); } };
    const dongCu = () => { if (CO.phongDo()) CO.xoaPhong(); };
    CO.moTam(ve(), {
      khiBam: (e, dong) => {
        const b = e.target.closest('[data-ben]');
        if (b) { luuTen(); ben = +b.dataset.ben; const ma = $('#m-ma').value; $('#co-tam .tam-hoi').innerHTML = ve(); $('#m-ma').value = ma; CO.OT.rung('chon'); return; }
        const l = e.target.closest('[data-lam-hop]');
        if (!l) return;
        if (l.dataset.lamHop === 'thoi') { dong(); return; }
        luuTen();
        if (l.dataset.lamHop === 'tao') { dongCu(); dong(); CO.taoPhong({ ben, ten: ten || 'Người chơi' }); return; }
        if (l.dataset.lamHop === 'vao') {
          const ma = CO.chuanMa($('#m-ma').value);
          if (ma.length !== 6) { $('#m-loi').textContent = 'Mã phòng có đúng 6 ký tự.'; return; }
          l.textContent = 'Đang tìm phòng...';
          l.disabled = true;
          CO.vaoPhong({ ma, ten: ten || 'Người chơi' }).then(() => dong()).catch(er => {
            l.textContent = 'Vào phòng'; l.disabled = false;
            const el = $('#m-loi');
            if (el) el.textContent = er.message;
          });
        }
      },
    });
  }

  // ---------- Bảng tra, từ điển, ván đã lưu ----------
  function hopTra() {
    CO.moTam(`<h2>Bảng tra các quân</h2><ul class="bang-tra">${DL.TRA.map(x => `<li><span class="doi-quan">${CO.htmlQuan(CHU_Q[x.q], '', 'han')}${CO.htmlQuan(CHU_Q[x.q] + 8, '', 'han')}</span>
        <div><b>${x.ten}</b><em>giá trị ${x.gia}</em><p>${esc(x.di)}</p><small>${esc(x.nho)}</small></div></li>`).join('')}</ul>
      <button class="nut-chu" data-lam-tam="dong">Đóng</button>`, { khiBam: (e, d) => { if (e.target.dataset.lamTam === 'dong') d(); } });
  }
  function hopTu() {
    CO.moTam(`<h2>Từ điển cờ tướng</h2><dl class="tu-dien">${DL.TU.map(([a, b]) => `<dt>${esc(a)}</dt><dd>${esc(b)}</dd>`).join('')}</dl>
      <button class="nut-chu" data-lam-tam="dong">Đóng</button>`, { khiBam: (e, d) => { if (e.target.dataset.lamTam === 'dong') d(); } });
  }
  function hopLs() {
    const ds = kho().doc('co.ls', []);
    if (!ds.length) { CO.OT.hoi({ tieuDe: 'Chưa có ván nào', noiDung: 'Đánh xong một ván là app tự lưu vào đây, kèm biên bản và phân tích.', nut: [{ nhan: 'Đã hiểu', kieu: 'chinh', gt: 1 }] }); return; }
    const tenKq = v => {
      const k = v.ket;
      if (!k) return 'Chưa xong';
      if (k.thang == null) return 'Hòa';
      if (v.ben == null) return `${BEN[k.thang]} thắng`;
      return k.thang === v.ben ? 'Thắng' : 'Thua';
    };
    CO.moTam(`<h2>Ván đã lưu</h2><ul class="ds-van">${ds.map((v, i) => `<li><button data-i="${i}"><b class="kq-van k-${tenKq(v) === 'Thắng' ? 'thang' : tenKq(v) === 'Thua' ? 'thua' : 'hoa'}">${tenKq(v)}</b>
        <span>${v.kieu === 'may' ? `Mức ${v.muc}, cầm ${BEN[v.ben]}` : v.kieu === 'nguoi' ? 'Hai người một máy' : `Qua mạng, phòng ${esc(v.ma || '')}`}<small>${new Date(v.bat).toLocaleDateString('vi-VN')}, ${Math.ceil(v.ds.length / 2)} nước</small></span></button></li>`).join('')}</ul>
      <button class="nut-chu" data-lam-tam="dong">Đóng</button>`, {
      khiBam: (e, dong) => {
        if (e.target.dataset.lamTam === 'dong') { dong(); return; }
        const b = e.target.closest('[data-i]');
        if (b) { dong(); CO.xemLai(ds[+b.dataset.i]); }
      },
    });
  }

  // ---------- Bài học ----------
  let H = null, BH = null;
  function timBai(ma) {
    const ds = dsBai(), i = ds.findIndex(b => b.ma === ma);
    return { bai: ds[i], thu: i, tong: ds.length, sau: ds[i + 1] };
  }
  function theBuoc(i) {
    let the = 'dau', truoc = '';
    for (let k = 0; k <= i; k++) {
      const b = H.bai.buoc[k];
      if (b.the !== undefined) { the = b.the; truoc = b.truoc || ''; } else if (b.truoc !== undefined) truoc = b.truoc;
    }
    const fen = CO.theTuChu(the, H.bai.buoc[i].ben);
    const T = new L.The(fen);
    if (truoc) PT.chuoiNuoc(fen, truoc).forEach(t => T.diGhi(L.chuNuoc(t)));
    return { T, fen };
  }
  function moBai(ma) {
    const f = timBai(ma);
    if (!f.bai) return;
    H = { ma, bai: f.bai, sau: f.sau, i: 0, xong: false };
    $('#man-co').innerHTML = `<div class="co-hoc">
      <header class="thanh-tren">
        <button class="nut-ve" data-hoc="ve" aria-label="Về trang Cờ tướng">${CO.icon('ve')}</button>
        <div class="tieu-de"><b>${esc(f.bai.ten)}</b><span>Bài ${f.thu + 1} trên ${f.tong}</span></div>
        <div class="dem" id="h-dem"></div>
      </header>
      <div class="tien-do" id="h-tien" aria-hidden="true"></div>
      <div id="h-ban"></div>
      <section class="the-hoc" id="h-the" aria-live="polite"></section>
      <footer class="hoc-duoi"><button class="nut-phu nut-mui" data-hoc="lui" aria-label="Bước trước"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg></button>
        <button class="nut-chinh" data-hoc="tiep" id="h-tiep">Tiếp</button></footer>
    </div>`;
    BH = new CO.BanCo({ khiDi: m => { if (H && H.khiDi) H.khiDi(m); }, khiSai: (l, t, d) => { if (H && H.khiSai) H.khiSai(l, t, d); }, khiBam: s => { if (H && H.khiBam) H.khiBam(s); }, choChon: s => (H && H.choChon ? H.choChon(s) : false) });
    $('#h-ban').appendChild(BH.el);
    CO.khopBan(BH, 310);   // veBuoc chỉnh lại theo từng bước
    CO.moMan();
    veBuoc();
  }
  // Bước hỏi đáp hay có bảng thì thu nhỏ bàn cho đủ chỗ đọc
  const chuaHoc = b => (b && ((b.k === 'hoi' && !b.the) || b.bangHan || b.bang || b.kyHieu || b.ds || b.tq) ? 430 : b && b.k === 'hoi' ? 370 : 310);
  addEventListener('resize', () => { if (BH && $('#h-ban') && H) CO.khopBan(BH, chuaHoc(H.bai.buoc[H.i])); });
  const htmlBang = () => `<ul class="bang-gia">${DL.TRA.filter(x => x.q !== 'K').map(x => `<li><span class="bieu-quan">${CO.htmlQuan(CHU_Q[x.q])}</span><b>${x.ten}</b><span>${x.gia}</span></li>`).join('')}<li><span class="bieu-quan">${CO.htmlQuan(1)}</span><b>Tướng</b><span>vô giá, mất là thua</span></li></ul>`;
  const htmlKy = () => `<ul class="bang-ky"><li><b>Tg S T X P M B</b> Tướng, Sĩ, Tượng, Xe, Pháo, Mã, Binh (tức Tốt)</li><li><b>.</b> tiến</li><li><b>/</b> lùi</li><li><b>-</b> đi ngang</li></ul>`;
  const htmlHan = () => `<ul class="bang-han">${DL.TRA.map(x => `<li><span class="doi-quan">${CO.htmlQuan(CHU_Q[x.q], '', 'han')}${CO.htmlQuan(CHU_Q[x.q] + 8, '', 'han')}</span><div><b>${x.ten}</b><small>${esc(x.nho)}</small></div></li>`).join('')}</ul>`;
  function htmlTQ(T) {
    const tq = PT.tongQuan(T, null);
    return `<div class="chu-giai"><span class="ben-do"><i class="dau-ben"></i>Đỏ</span><span class="ben-den"><i class="dau-ben"></i>Đen</span></div><ul class="ds-tru gon">${tq.tru.map(t => {
      const tong = Math.max(1, t.do + t.den), a = t.do / tong * 100;
      return `<li class="tru"><div class="tru-dau"><b>${t.ten}</b><span>${t.hien(t.do)} và ${t.hien(t.den)}</span></div><div class="buom"><i class="b-do" style="width:${a.toFixed(1)}%"></i><i class="b-den" style="width:${(100 - a).toFixed(1)}%"></i></div></li>`;
    }).join('')}</ul>`;
  }
  function dat(ok) {
    H.datBuoc = ok;
    const t = $('#h-tiep');
    if (!t) return;
    t.disabled = !ok;
    t.textContent = H.i === H.bai.buoc.length - 1 ? 'Xong bài' : 'Tiếp';
  }
  function phanHoi(html, kieu) {
    const el = $('#h-ph');
    if (!el) return;
    el.className = 'phan-hoi ' + (kieu || '');
    el.innerHTML = html;
    const the = $('#h-the');
    if (the) setTimeout(() => { the.scrollTop = the.scrollHeight; }, 30);
  }
  function veBuoc() {
    const b = H.bai.buoc[H.i], { T, fen } = theBuoc(H.i);
    H.T = T; H.khiDi = null; H.khiSai = null; H.khiBam = null; H.choChon = () => false;
    CO.khopBan(BH, chuaHoc(b));
    BH.xoaPhu(); BH.cuoi = 0; BH.khoa = true;
    BH.nap(T);
    $('#h-dem').innerHTML = `${H.i + 1}<small>/${H.bai.buoc.length}</small>`;
    $('#h-tien').innerHTML = H.bai.buoc.map((_, k) => `<i class="${k < H.i ? 'da' : k === H.i ? 'dang' : ''}"></i>`).join('');
    const the = $('#h-the');
    let them = '';
    if (b.bang) them = htmlBang();
    if (b.kyHieu) them = htmlKy();
    if (b.bangHan) them = htmlHan();
    if (b.tq) them = htmlTQ(T);
    if (b.ds) them = `<ol class="ds-cau">${b.ds.map(x => `<li>${esc(x)}</li>`).join('')}</ol>`;
    let hinh = '';
    if (b.hinh) {
      const mau = '帥仕相傌俥炮兵'.indexOf(b.hinh) >= 0 ? 0 : 1;
      const dsH = mau ? '將士象馬車砲卒' : '帥仕相傌俥炮兵';
      const kieu = [1, 2, 3, 4, 5, 6, 7][dsH.indexOf(b.hinh)] + mau * 8;
      hinh = `<div class="hinh-quan" aria-hidden="true">${CO.htmlQuan(kieu, '', 'han')}</div>`;
    }
    the.innerHTML = `${hinh}<p class="chu-hoc">${esc(b.chu)}</p>${them}<div class="vung-pa" id="h-pa"></div><div class="phan-hoi" id="h-ph"></div>`;
    the.scrollTop = 0;
    // Thứ phủ lên bàn
    if (b.o) BH.veO(b.o.map(L.chuO));
    if (b.mui) BH.veMui(b.mui.map(([a, c]) => ({ tu: L.chuO(a), den: L.chuO(c), mau: 'doa-do' })));
    if (b.dai) BH.veDai(b.dai);
    if (b.luc) BH.veLuc(T);
    if (b.cham && b.k === 'xem') BH.hienCham(L.chuO(b.cham));
    dat(b.k === 'xem');
    if (b.k === 'di') batDi(b, T);
    else if (b.k === 'thu') batThu(b, T);
    else if (b.k === 'an') batAn(b, T, fen);
    else if (b.k === 'hoi') batHoi(b);
    else if (b.k === 'cham') batCham(b);
    else if (b.k === 'demo') batDemo(b, fen);
    else if (b.k === 'giai') batGiai(b, T);
  }
  function batDi(b, T) {
    BH.khoa = false;
    H.choChon = s => (T.ban[s] >> 3) === T.ben && (!b.tu || L.oChu(s) === b.tu) && !H.datBuoc;
    H.khiSai = ly => { if (ly) phanHoi(esc(ly), 'sai'); };
    H.khiDi = async m => {
      const t = L.nuocChu(m), g = PT.ghi(T, m);
      let dung = b.ky ? g.ky === b.ky : b.dap ? b.dap.includes(t) : true;
      if (!dung && b.bi) { T.di(m); dung = !T.coNuoc(); T.lui(); }
      if (!dung) {
        BH.lacQuan(m & 255);
        CO.OT.phat('sai');
        phanHoi(esc(b.sai || (b.ky ? `Nước vừa rồi là ${g.ky}, chưa phải ${b.ky}. Thử lại.` : 'Chưa phải nước này. Thử lại.')), 'sai');
        return;
      }
      const d = PT.moTaNuoc(T, m), an = T.ban[m >> 8];
      T.diGhi(m);
      BH.khoa = true;
      BH.T = T;
      await BH.diHinh(m, { an, chieu: d.chieu, bi: d.bi, cuaMinh: true });
      thuongDung();
      phanHoi(esc(b.dung || (d.bi ? 'Bí! Đúng rồi.' : 'Đúng rồi.')), 'dung');
      dat(true);
    };
  }
  function thuongDung() {
    CO.OT.phat('dung'); CO.OT.rung('dung');
    const r = BH.el.getBoundingClientRect();
    CO.OT.phaoSao(r.left + r.width / 2, r.top + r.height * 0.3, 18, 0.9);
  }
  function batThu(b, T) {
    const tu = L.chuO(b.tu), den = L.chuO(b.den);
    BH.khoa = false;
    BH.veO([den]);
    H.choChon = s => s === tu && !H.datBuoc;
    H.khiSai = (ly, t, d) => {
      if (d === den) {
        phanHoi(`<b>Không đi được.</b> ${esc(ly)}`, 'dung');
        CO.OT.phat('sai');
        dat(true);
        BH.boChon();
      } else phanHoi('Hãy thử đúng ô đang được khoanh.', '');
    };
    H.khiDi = () => { phanHoi('Nước này đi được, nhưng hãy thử ô đang được khoanh.', ''); };
  }
  function batAn(b, T, fen) {
    let dem = 0;
    const con = () => { let n = 0; for (let s = 0; s < 90; s++) { const p = H.T.ban[s]; if (p > 8 && (p & 7) !== 1) n++; } return n; };
    BH.khoa = false;
    T.ben = 0;
    const lamLai = () => { H.T = new L.The(fen); BH.nap(H.T); dem = 0; H.T.ben = 0; phanHoi('', ''); };
    H.choChon = s => { const p = H.T.ban[s]; return p && p < 8 && (p & 7) !== 1 && !H.datBuoc; };
    H.khiSai = ly => { if (ly) phanHoi(esc(ly), 'sai'); };
    H.khiDi = async m => {
      const U = H.T, an = U.ban[m >> 8];
      U.diGhi(m);
      U.ben = 0;
      BH.khoa = true;
      await BH.diHinh(m, { an, cuaMinh: true });
      BH.hopLe = null;
      BH.khoa = false;
      dem++;
      const left = con();
      if (!left) {
        thuongDung();
        phanHoi(dem <= b.toiDa ? `Giỏi lắm: ăn hết trong ${dem} nước!` : `Ăn hết rồi, mất ${dem} nước. Có cách chỉ cần ${b.toiDa} nước.`, 'dung');
        BH.khoa = true;
        dat(true);
      } else if (dem >= b.toiDa + 3) {
        phanHoi('Hơi nhiều nước rồi. Đang làm lại từ đầu, nghĩ đường đi trước nhé.', 'sai');
        await doi(1100);
        lamLai();
      } else phanHoi(`Đã đi ${dem} nước, còn ${left} quân.`, '');
    };
  }
  function batHoi(b) {
    const ds = xao(b.pa.map((chu, i) => ({ chu, i })));
    $('#h-pa').innerHTML = `<div class="ds-pa">${ds.map((x, k) => `<button class="pa" data-i="${x.i}"><span class="chu">${'ABCD'[k]}</span><span class="nd">${esc(x.chu)}</span><span class="dau"></span></button>`).join('')}</div>`;
    const el = $('#h-pa');
    el.onclick = e => {
      const n = e.target.closest('.pa');
      if (!n || H.datBuoc) return;
      const dung = +n.dataset.i === b.da;
      $$('.pa', el).forEach(p => {
        if (+p.dataset.i === b.da) { p.classList.add('dung'); p.querySelector('.dau').innerHTML = OK_ICON; } else if (p !== n) p.classList.add('mo');
      });
      if (!dung) n.classList.add('sai');
      $('.ds-pa', el).classList.add('khoa');
      CO.OT.phat(dung ? 'dung' : 'sai'); CO.OT.rung(dung ? 'dung' : 'sai');
      phanHoi(esc(b.giai), dung ? 'dung' : 'sai');
      dat(true);
    };
  }
  function batCham(b) {
    BH.khoa = true;
    H.khiBam = s => {
      if (H.datBuoc) return;
      const o = L.oChu(s);
      if (b.dap.includes(o)) {
        BH.nhayO(s, true);
        BH.veO([s]);
        CO.OT.phat('dung'); CO.OT.rung('dung');
        phanHoi(esc(b.giai || 'Đúng rồi.'), 'dung');
        dat(true);
      } else {
        BH.nhayO(s, false);
        CO.OT.phat('sai'); CO.OT.rung('sai');
        phanHoi('Chưa đúng, nhìn kỹ rồi chạm lại.', 'sai');
      }
    };
  }
  function batDemo(b, fen) {
    let k = 0;
    const ve = () => {
      const t = $('#h-tiep');
      t.disabled = false;
      if (k < b.nuoc.length) t.textContent = k === 0 ? 'Đi nước đầu' : 'Nước tiếp';
      else t.textContent = H.i === H.bai.buoc.length - 1 ? 'Xong bài' : 'Tiếp';
    };
    H.datBuoc = false;
    H.T = new L.The(fen);
    BH.nap(H.T);
    H.buocDemo = async () => {
      if (k >= b.nuoc.length) return false;
      const [ky, chu] = b.nuoc[k], U = H.T, m = PT.docNuoc(U, ky), an = U.ban[m >> 8], chieu0 = (U.di(m), U.biChieu(U.ben));
      U.lui();
      const ben = U.ben;
      U.diGhi(m);
      $('#h-tiep').disabled = true;
      BH.T = U;
      BH.khoa = true;
      await BH.diHinh(m, { an, chieu: chieu0, cuaMinh: ben === 0 });
      k++;
      phanHoi(`<b>${Math.ceil(k / 2)}. ${BEN[ben]} ${esc(ky)}</b> ${esc(chu)}`, '');
      if (k >= b.nuoc.length) H.datBuoc = true;
      ve();
      return true;
    };
    ve();
    $('#h-tiep').disabled = false;
  }
  function batGiai(b, T) {
    const lg = may().giaiBi(new L.The(T.fen()), b.n, { nut: 3000000 });
    const dsSol = lg.pv.map(L.nuocChu);
    let sol = dsSol, k = 0;
    BH.khoa = false;
    H.choChon = s => T.ben === 0 && (T.ban[s] >> 3) === 0 && !H.datBuoc;
    H.khiSai = ly => { if (ly) phanHoi(esc(ly), 'sai'); };
    H.khiDi = async m => {
      const con = Math.ceil((sol.length - k) / 2);
      const t = L.nuocChu(m);
      let dung = t === sol[k];
      if (!dung) dung = conBiDuoc(T, m, con - 1);
      if (!dung) { BH.lacQuan(m & 255); CO.OT.phat('sai'); phanHoi('Nước này chưa ép được Đen. Thử nước khác.', 'sai'); return; }
      const d = PT.moTaNuoc(T, m), an = T.ban[m >> 8], theoMau = t === sol[k];
      T.diGhi(m);
      BH.khoa = true; BH.T = T;
      await BH.diHinh(m, { an, chieu: d.chieu, bi: d.bi, cuaMinh: true });
      if (!T.coNuoc()) {
        thuongDung();
        phanHoi(esc(b.dung || 'Bí rồi!'), 'dung');
        dat(true);
        return;
      }
      await doi(450);
      const r = theoMau ? L.chuNuoc(sol[k + 1]) : chongLau(T, con - 1);
      const an2 = T.ban[r >> 8], g2 = PT.ghi(T, r);
      T.diGhi(r);
      await BH.diHinh(r, { an: an2, chieu: T.biChieu(T.ben), cuaMinh: false });
      phanHoi(`Đen đáp ${esc(g2.ky)}. Tiếp đi.`, '');
      BH.khoa = false; BH.hopLe = null;
      if (theoMau) k += 2;
      else { const g = may().giaiBi(new L.The(T.fen()), con - 1, { nut: 2000000 }); sol = g.pv.map(L.nuocChu); k = 0; }
    };
  }
  function conBiDuoc(T, m, con) {
    T.diGhi(m);
    let ok = true;
    if (T.coNuoc()) {
      if (con <= 0) ok = false;
      else {
        for (const r of T.hopLe()) {
          T.diGhi(r);
          const g = may().giaiBi(T, con, { nut: 400000 });
          T.lui();
          if (!g.n) { ok = false; break; }
        }
      }
    }
    T.lui();
    return ok;
  }
  function chongLau(T, con) {
    let tot = 0, dai = -1;
    for (const r of T.hopLe()) {
      T.diGhi(r);
      const g = may().giaiBi(T, con, { nut: 400000 });
      T.lui();
      if (g.n > dai) { dai = g.n; tot = r; }
    }
    return tot;
  }
  async function xongBai() {
    const hoc = kho().doc('co.hoc', {});
    hoc[H.ma] = 1;
    kho().ghi('co.hoc', hoc);
    const sau = H.sau;
    CO.OT.phat('ken'); CO.OT.rung('manh');
    const r = BH.el.getBoundingClientRect();
    CO.OT.phaoSao(r.left + r.width / 2, r.top + r.height / 2, 70, 1.3);
    const gt = await CO.OT.hoi({
      tieuDe: 'Xong bài rồi!', noiDung: sau ? `Bài tiếp theo: ${sau.ten}.` : 'Bạn đã đi hết các bài. Giờ đấu với máy hoặc giải thế cờ để lên tay.',
      nut: [sau ? { nhan: 'Học bài tiếp', kieu: 'chinh', gt: 'sau' } : { nhan: 'Đánh với máy Mức 1', kieu: 'chinh', gt: 'danh' }, { nhan: 'Về trang Cờ tướng', kieu: 'chu', gt: 've' }],
    });
    if (gt === 'sau') moBai(sau.ma);
    else if (gt === 'danh') CO.hopVanMoi(1);
    else if (gt === 've' || gt == null) { thoatHoc(); }
  }
  function thoatHoc() { H = null; BH = null; CO.veMan(); }
  document.addEventListener('click', async e => {
    const b = e.target.closest('[data-hoc]');
    if (!b || !H) return;
    const lam = b.dataset.hoc;
    CO.OT.rung('nhe');
    if (lam === 've') { thoatHoc(); return; }
    if (lam === 'lui') {
      if (H.i > 0) { H.i--; H.buocDemo = null; veBuoc(); } else thoatHoc();
      return;
    }
    if (lam === 'tiep') {
      if (H.buocDemo && !H.datBuoc) { await H.buocDemo(); return; }
      if (!H.datBuoc) return;
      H.buocDemo = null;
      if (H.i + 1 >= H.bai.buoc.length) { xongBai(); return; }
      H.i++;
      veBuoc();
    }
  });

  // ---------- Giải thế cờ ----------
  let G = null, BG = null;
  function moThe(ma, i) {
    const nh = window.CO_THE.nhom.find(x => x.ma === ma);
    if (!nh) return;
    const da = kho().doc('co.the', {});
    if (i == null) { i = nh.ds.findIndex((_, k) => !da[`${ma}-${k}`]); if (i < 0) i = 0; }
    G = { nh, i };
    $('#man-co').innerHTML = `<div class="co-giai">
      <header class="thanh-tren">
        <button class="nut-ve" data-giai="ve" aria-label="Về trang Cờ tướng">${CO.icon('ve')}</button>
        <div class="tieu-de"><b id="g-ten"></b><span id="g-phu"></span></div>
        <div class="dem" id="g-dem"></div>
      </header>
      <div id="g-ban"></div>
      <section class="the-hoc" id="g-the" aria-live="polite"></section>
      <footer class="cong-cu nho" id="g-nut">
        <button class="cc" data-giai="truoc" aria-label="Thế trước">${CO.icon('truoc')}</button>
        <button class="cc" data-giai="goi">${CO.icon('goi')}<span>Gợi ý</span></button>
        <button class="cc" data-giai="lai">${CO.icon('lui')}<span>Làm lại</span></button>
        <button class="cc" data-giai="loi">${CO.icon('bien')}<span>Lời giải</span></button>
        <button class="cc" data-giai="sau" aria-label="Thế sau">${CO.icon('sau')}</button>
      </footer>
    </div>`;
    BG = new CO.BanCo({
      khiDi: m => diThe(m),
      khiSai: ly => { if (ly) baoThe(esc(ly), 'sai'); },
      choChon: s => G && !G.xong && !G.dangDi && (G.T.ban[s] >> 3) === 0 && G.T.ben === 0,
    });
    $('#g-ban').appendChild(BG.el);
    CO.khopBan(BG, 240);
    CO.moMan();
    veThe();
  }
  addEventListener('resize', () => { if (BG && $('#g-ban')) CO.khopBan(BG, 240); });
  function baoThe(html, kieu) { const el = $('#g-bao'); if (el) { el.className = 'phan-hoi ' + (kieu || ''); el.innerHTML = html; } }
  function veThe() {
    const { nh, i } = G, x = nh.ds[i];
    G.fen = x[0] + ' w'; G.sol = x[1].split(' '); G.solGoc = G.sol.slice(); G.k = 0; G.xong = false; G.goiLan = 0; G.dangDi = false; G.ten = x[2]; G.nhoLoi = false;
    G.T = new L.The(G.fen);
    BG.xoaPhu(); BG.cuoi = 0; BG.khoa = false;
    BG.nap(G.T);
    const da = kho().doc('co.the', {})[`${nh.ma}-${i}`];
    $('#g-ten').textContent = nh.ten;
    $('#g-phu').textContent = nh.n ? G.ten : G.ten;
    $('#g-dem').innerHTML = `${i + 1}<small>/${nh.ds.length}</small>`;
    const de = nh.n ? `Đỏ đi. Thắng trong ${nh.n} nước${nh.n > 1 ? ', Đen sẽ chống trả hết sức' : ''}.` : 'Đỏ đi. Tìm nước làm Đen mất quân.';
    $('#g-the').innerHTML = `<p class="chu-hoc">${de}${da ? ' <span class="da-giai">Đã giải</span>' : ''}</p><div class="phan-hoi" id="g-bao"></div>`;
  }
  async function diThe(m) {
    if (G.xong || G.dangDi) return;
    const T = G.T, t = L.nuocChu(m), nh = G.nh;
    const conLai = Math.ceil((G.sol.length - G.k) / 2);
    let dung = t === G.sol[G.k];
    G.dangDi = true;
    if (!dung && nh.n) dung = conBiDuoc(T, m, conLai - 1);
    if (!dung) {
      G.dangDi = false;
      G.saiLan = (G.saiLan || 0) + 1;
      BG.lacQuan(m & 255);
      CO.OT.phat('sai');
      // Chỉ ra Đen thoát thế nào
      let them = '';
      if (nh.n) {
        T.diGhi(m);
        const chieu = T.biChieu(T.ben);
        T.lui();
        them = chieu ? 'Nước chiếu này chưa đủ: Tướng Đen vẫn thoát được.' : 'Nước này chưa ép được Đen: Đen còn đường thoát.';
      } else them = 'Nước này chưa thắng được quân. Nhìn xem quân Đen nào đang không có ai bảo vệ, hoặc đứng cùng đường với quân khác.';
      baoThe(them, 'sai');
      return;
    }
    const d = PT.moTaNuoc(T, m), an = T.ban[m >> 8], g = PT.ghi(T, m), theoMau = t === G.sol[G.k];
    T.diGhi(m);
    BG.T = T; BG.khoa = true; BG.veMui(null); BG.veO(null);
    await BG.diHinh(m, { an, chieu: d.chieu, bi: d.bi, cuaMinh: true });
    if (!T.coNuoc()) { xongThe(); G.dangDi = false; return; }
    if (!nh.n && G.k + 1 >= G.sol.length) { xongThe(); G.dangDi = false; return; }
    baoThe(`<b>${esc(g.ky)}</b> ${esc(d.chu)}. Đen đang đáp...`, 'dung');
    await doi(520);
    if (!G) return;
    const r = theoMau ? L.chuNuoc(G.sol[G.k + 1]) : chongLau(T, conLai - 1);
    const an2 = T.ban[r >> 8], g2 = PT.ghi(T, r), d2 = PT.moTaNuoc(T, r);
    T.diGhi(r);
    await BG.diHinh(r, { an: an2, chieu: d2.chieu, cuaMinh: false });
    if (!G) return;
    baoThe(`Đen đáp <b>${esc(g2.ky)}</b>. Đi tiếp đi.`, '');
    BG.khoa = false; BG.hopLe = null;
    if (theoMau) G.k += 2;
    else {
      const lg = may().giaiBi(new L.The(T.fen()), conLai - 1, { nut: 2000000 });
      G.sol = lg.pv.map(L.nuocChu); G.k = 0;
    }
    G.dangDi = false;
  }
  function xongThe() {
    G.xong = true;
    const T = G.T, nh = G.nh, tuGiai = !G.nhoLoi;
    if (tuGiai) { const da = kho().doc('co.the', {}); da[`${nh.ma}-${G.i}`] = 1; kho().ghi('co.the', da); }
    BG.khoa = true;
    let chu;
    if (nh.n && !T.coNuoc()) {
      const vs = PT.viSaoBi(T);
      BG.veO(vs.thoat.map(x => x.o));
      BG.veMui(vs.chieu.map(s => ({ tu: s, den: T.vua[T.ben], mau: 'doa-do' })));
      chu = T.biChieu(T.ben) ? `Chiếu bí! ${vs.chu.charAt(0).toUpperCase() + vs.chu.slice(1)}` : 'Đen hết nước đi, cũng là thua. Tướng không còn ô nào an toàn và Đen không có quân khác để đi.';
    } else chu = 'Đúng rồi, nước đó thắng được quân.';
    if (!tuGiai) chu = 'Đây là lời giải. ' + chu;
    if (tuGiai) { CO.OT.phat('khen'); CO.OT.rung('dung'); const r = BG.el.getBoundingClientRect(); CO.OT.phaoSao(r.left + r.width / 2, r.top + r.height * 0.3, 42, 1.1); }
    baoThe(esc(chu), 'dung');
    const the = $('#g-the');
    if (the && !$('#g-tiep')) {
      const b = document.createElement('button');
      b.className = 'nut-chinh'; b.id = 'g-tiep'; b.dataset.giai = 'sau';
      b.textContent = G.i + 1 < nh.ds.length ? 'Thế tiếp theo' : 'Xong nhóm này';
      the.appendChild(b);
      setTimeout(() => { the.scrollTop = the.scrollHeight; }, 30);
    }
  }
  async function loiGiai() {
    if (G.xong) return;
    G.nhoLoi = true;
    G.T = new L.The(G.fen);
    G.dangDi = true;
    BG.nap(G.T);
    BG.khoa = true;
    const T = G.T, ds = G.solGoc;
    const dong = [];
    for (let i = 0; i < ds.length; i++) {
      if (!G || !G.dangDi) return;
      const m = L.chuNuoc(ds[i]), g = PT.ghi(T, m), d = PT.moTaNuoc(T, m), an = T.ban[m >> 8];
      T.diGhi(m);
      BG.T = T;
      await BG.diHinh(m, { an, chieu: d.chieu, bi: d.bi, cuaMinh: i % 2 === 0 });
      dong.push(`<b>${esc(g.ky)}</b> ${esc(d.chu)}`);
      baoThe(dong.join('<br>'), '');
      await doi(800);
    }
    G.dangDi = false;
    xongThe();
  }
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-giai]');
    if (!b || !G) return;
    const lam = b.dataset.giai, nh = G.nh;
    CO.OT.rung('nhe');
    if (lam === 've') { G = null; BG = null; CO.veMan(); return; }
    if (lam === 'lai') { G.dangDi = false; veThe(); return; }
    if (lam === 'truoc') { G.dangDi = false; if (G.i > 0) { G.i--; veThe(); } return; }
    if (lam === 'sau') {
      G.dangDi = false;
      if (G.i + 1 < nh.ds.length) { G.i++; veThe(); } else { G = null; BG = null; CO.veMan(); }
      return;
    }
    if (lam === 'loi') { loiGiai(); return; }
    if (lam === 'goi' && !G.xong) {
      const t = G.sol[G.k];
      if (!t) return;
      const m = L.chuNuoc(t);
      G.goiLan++;
      G.nhoLoi = G.goiLan > 1 ? true : G.nhoLoi;
      if (G.goiLan === 1) { BG.veO([m & 255]); baoThe(`Gợi ý: nhìn vào ${esc(PT.tenQuan(G.T.ban[m & 255], m & 255))}.`, ''); }
      else { BG.veMui([{ tu: m & 255, den: m >> 8, mau: 'goi' }]); baoThe(`Nước đúng: ${esc(PT.ghi(G.T, m).ky)}.`, ''); }
    }
  });

  // ---------- Luyện mắt ----------
  let M_ = null, BM = null;
  function taoCau(f) {
    const T = new L.The(f + ' w'), kieu = [];
    const doa = PT.quanBiDoa(T, 0);
    if (doa.length) kieu.push({ loai: 'cham', de: 'Chạm vào quân Đỏ đang bị dọa ăn có lời.', dap: doa.map(x => x.o), giai: `${PT.tenQuan(doa[0].quan, doa[0].o)} đang bị ${PT.tenQuan(T.ban[doa[0].boi], doa[0].boi)} dọa.`, mui: doa.map(x => ({ tu: x.boi, den: x.o, mau: 'doa-den' })) });
    const an = PT.nuocAnLoi(T);
    if (an.length) kieu.push({ loai: 'cham', de: 'Chạm vào quân Đen mà Đỏ ăn được có lời.', dap: an.map(x => x.nuoc >> 8), giai: `${PT.TEN[T.ban[an[0].nuoc & 255] & 7]} Đỏ ăn được ${PT.tenQuan(an[0].quan, an[0].nuoc >> 8)}.`, mui: an.map(x => ({ tu: x.nuoc & 255, den: x.nuoc >> 8, mau: 'doa-do' })) });
    const chieu = [];
    T.hopLe().forEach(m => { T.di(m); if (T.biChieu(T.ben) && !chieu.includes(m & 255)) chieu.push(m & 255); T.lui(); });
    if (chieu.length) kieu.push({ loai: 'cham', de: 'Chạm vào quân Đỏ có thể chiếu Tướng Đen ngay nước này.', dap: chieu, giai: `Quân chiếu được: ${chieu.map(s => PT.tenQuan(T.ban[s], s)).join(', ')}.` });
    const vc = PT.vatChat(T, 0) - PT.vatChat(T, 1);
    kieu.push({ loai: 'chon', de: 'Đếm quân: bên nào hơn về quân số?', pa: ['Đỏ hơn', 'Đen hơn', 'Gần bằng nhau'], da: Math.abs(vc) < 1 ? 2 : vc > 0 ? 0 : 1, giai: PT.cheoQuan(T) });
    const at = [PT.anToan(T, 0), PT.anToan(T, 1)];
    if (Math.abs(at[0] - at[1]) >= 14) kieu.push({ loai: 'chon', de: 'Tướng bên nào đang an toàn hơn?', pa: ['Tướng Đỏ', 'Tướng Đen'], da: at[0] > at[1] ? 0 : 1, giai: `Điểm an toàn: Đỏ ${at[0]}, Đen ${at[1]}. Nhìn Sĩ Tượng còn lại và quân địch áp sát cung.` });
    // Ưu tiên câu chạm quân vì tập mắt tốt hơn
    const chamDs = kieu.filter(k => k.loai === 'cham');
    const k = chamDs.length && Math.random() < 0.72 ? chamDs[(Math.random() * chamDs.length) | 0] : kieu[(Math.random() * kieu.length) | 0];
    return Object.assign({ T }, k);
  }
  function moMat() {
    const ds = xao(window.CO_THE.mat).slice(0, 10).map(taoCau);
    M_ = { ds, i: 0, dung: 0, da: false };
    $('#man-co').innerHTML = `<div class="co-hoc">
      <header class="thanh-tren">
        <button class="nut-ve" data-mat="ve" aria-label="Về trang Cờ tướng">${CO.icon('ve')}</button>
        <div class="tieu-de"><b>Luyện mắt nhìn thế cờ</b><span id="m-phu"></span></div>
        <div class="dem" id="m-dem"></div>
      </header>
      <div class="tien-do" id="m-tien" aria-hidden="true"></div>
      <div id="m-ban"></div>
      <section class="the-hoc" id="m-the" aria-live="polite"></section>
      <footer class="hoc-duoi"><button class="nut-chinh" data-mat="tiep" id="m-tiep" disabled>Câu tiếp</button></footer>
    </div>`;
    BM = new CO.BanCo({ khiBam: chamMat, choChon: () => false });
    BM.khoa = true;
    $('#m-ban').appendChild(BM.el);
    CO.khopBan(BM, 300);
    CO.moMan();
    veMat();
  }
  function veMat() {
    const c = M_.ds[M_.i];
    M_.da = false;
    BM.xoaPhu(); BM.cuoi = 0;
    BM.nap(c.T);
    $('#m-dem').innerHTML = `${M_.i + 1}<small>/${M_.ds.length}</small>`;
    $('#m-phu').textContent = `Đúng ${M_.dung} câu`;
    $('#m-tien').innerHTML = M_.ds.map((_, k) => `<i class="${k < M_.i ? (M_.ds[k].ok ? 'dung' : 'sai') : k === M_.i ? 'dang' : ''}"></i>`).join('');
    $('#m-tiep').disabled = true;
    $('#m-tiep').textContent = M_.i + 1 < M_.ds.length ? 'Câu tiếp' : 'Xem kết quả';
    $('#m-the').innerHTML = `<p class="chu-hoc">${esc(c.de)}</p><div class="vung-pa" id="m-pa">${c.pa ? `<div class="ds-pa">${c.pa.map((x, k) => `<button class="pa" data-mat-pa="${k}"><span class="chu">${'ABC'[k]}</span><span class="nd">${esc(x)}</span><span class="dau"></span></button>`).join('')}</div>` : ''}</div><div class="phan-hoi" id="m-ph"></div>`;
  }
  function ketMat(dung) {
    const c = M_.ds[M_.i];
    M_.da = true; c.ok = dung;
    if (dung) M_.dung++;
    CO.OT.phat(dung ? 'dung' : 'sai'); CO.OT.rung(dung ? 'dung' : 'sai');
    const el = $('#m-ph');
    el.className = 'phan-hoi ' + (dung ? 'dung' : 'sai');
    el.textContent = (dung ? 'Đúng. ' : 'Chưa đúng. ') + c.giai;
    if (c.mui) BM.veMui(c.mui);
    if (c.dap && c.loai === 'cham') BM.veO(c.dap);
    $('#m-tiep').disabled = false;
    $('#m-phu').textContent = `Đúng ${M_.dung} câu`;
    const t = $('#m-the');
    setTimeout(() => { t.scrollTop = t.scrollHeight; }, 30);
  }
  function chamMat(s) {
    const c = M_ && M_.ds[M_.i];
    if (!c || M_.da || c.loai !== 'cham') return;
    const dung = c.dap.includes(s);
    BM.nhayO(s, dung);
    ketMat(dung);
  }
  document.addEventListener('click', async e => {
    const pa = e.target.closest('[data-mat-pa]');
    if (pa && M_ && !M_.da) {
      const c = M_.ds[M_.i], k = +pa.dataset.matPa, dung = k === c.da;
      $$('#m-pa .pa').forEach((p, i) => {
        if (i === c.da) { p.classList.add('dung'); p.querySelector('.dau').innerHTML = OK_ICON; } else if (p !== pa) p.classList.add('mo');
      });
      if (!dung) pa.classList.add('sai');
      $('#m-pa .ds-pa').classList.add('khoa');
      ketMat(dung);
      return;
    }
    const b = e.target.closest('[data-mat]');
    if (!b || !M_) return;
    CO.OT.rung('nhe');
    if (b.dataset.mat === 've') { M_ = null; BM = null; CO.veMan(); return; }
    if (M_.i + 1 < M_.ds.length) { M_.i++; veMat(); return; }
    const d = M_.dung, n = M_.ds.length;
    if (d >= 8) { CO.OT.phat('ken'); const r = BM.el.getBoundingClientRect(); CO.OT.phaoSao(r.left + r.width / 2, r.top + r.height / 2, 90, 1.4); }
    const gt = await CO.OT.hoi({
      tieuDe: `Đúng ${d} trên ${n} câu`, noiDung: d >= 8 ? 'Mắt nhìn tốt đấy. Giờ đấu với máy và để ý những thứ này trong ván thật.' : 'Càng tập càng thấy nhanh. Mỗi ngày một lượt là đủ để lên tay.',
      nut: [{ nhan: 'Làm lượt mới', kieu: 'chinh', gt: 'lai' }, { nhan: 'Về trang Cờ tướng', kieu: 'chu', gt: 've' }],
    });
    if (gt === 'lai') moMat(); else { M_ = null; BM = null; CO.veMan(); }
  });

  // ---------- Tự bày thế, máy giải. Thế đọc từ ảnh cũng vào đây để soát rồi tính nước ----------
  let Y = null, BY = null, luotTinh = 0;
  const THE_TRONG = '9/9/9/9/9/9/9/9/9/9 w';
  const nutCC = (lam, icon, chu, lop = '', id = '') => `<button class="cc ${lop}" data-bay="${lam}"${id ? ` id="${id}"` : ''}>${icon ? CO.icon(icon) : ''}<span>${chu}</span></button>`;
  const nutBen = () => `<button class="cc" data-bay="ben" id="y-ben"><i class="dau-ben ben-${Y.ben ? 'den' : 'do'} to"></i><span>${BEN[Y.ben]} đi trước</span></button>`;
  const banTuThe = fen => new L.The(fen);
  function moBay(o = {}) {
    luotTinh++;
    Y = {
      ben: o.ben || 0, chon: null, dangTinh: false, buoc: 'soat', yeuCau: 'chieu', soNuoc: 3, coKetQua: false, daSua: !!o.anh,
      tuAnh: !!o.anh, anh: o.anh || null, loNgo: o.loNgo || [], pv: null,
    };
    Y.T = new L.The(o.fen || L.FEN_DAU);
    const bangQ = (mau) => [1, 2, 3, 4, 5, 6, 7].map(t => `<button class="o-q" data-bay-q="${t + mau * 8}" aria-label="Đặt ${PT.TEN[t]} ${BEN[mau]}">${CO.htmlQuan(t + mau * 8)}</button>`).join('');
    $('#man-co').innerHTML = `<div class="co-bay">
      <header class="thanh-tren">
        <button class="nut-ve" data-bay="ve" aria-label="Về trang Cờ tướng">${CO.icon('ve')}</button>
        <div class="tieu-de"><b>${Y.tuAnh ? 'Soát thế cờ từ ảnh' : 'Tự bày thế, máy giải'}</b><span id="y-phu"></span></div>
      </header>
      <div id="y-ban"></div>
      <div class="bang-q" id="y-bang" role="group" aria-label="Chọn quân để đặt">${bangQ(0)}${bangQ(1)}</div>
      <section class="the-hoc" id="y-the" aria-live="polite"></section>
      <footer class="cong-cu nho" id="y-cc"></footer>
    </div>`;
    BY = new CO.BanCo({ khiBam: bamBay, choChon: () => false, lat: !!o.lat });
    BY.khoa = true;
    $('#y-ban').appendChild(BY.el);
    CO.khopBan(BY, 300);
    CO.moMan();
    veBay();
  }
  function veBay() {
    Y.T.ben = Y.ben;
    BY.nap(Y.T);
    BY.xoaPhu(); BY.cuoi = 0;
    const soat = Y.buoc === 'soat';
    $('#y-bang').hidden = !soat;
    if (soat && Y.loNgo.length) BY.veO(Y.loNgo);
    $$('.o-q').forEach(b => b.setAttribute('aria-pressed', +b.dataset.bayQ === Y.chon));
    if (soat) {
      $('#y-phu').textContent = 'Chọn quân ở bảng rồi chạm ô để đặt';
      $('#y-cc').innerHTML = nutCC('xoaq', 'tay', 'Bỏ quân', '', 'y-xoa') + (Y.tuAnh ? nutCC('canlai', 'xoay', 'Căn lại') : nutCC('dau', 'xoay', 'Thế đầu'))
        + nutCC('trong', 'lui', 'Xóa hết') + nutBen() + nutCC('giai', 'goi', 'Tính nước', 'chinh');
      const x = $('#y-xoa');
      if (x) x.setAttribute('aria-pressed', Y.chon === 0);
      vePanelSoat();
    } else {
      $('#y-phu').textContent = Y.coKetQua ? 'Chạm vào một nước để xem trên bàn' : 'Chọn yêu cầu rồi bấm Tính nước';
      $('#y-cc').innerHTML = nutCC('sua', 'lui', 'Sửa thế') + nutBen()
        + (Y.coKetQua ? nutCC('doiyc', 'goi', 'Yêu cầu khác', 'rong') : nutCC('tinh', 'goi', 'Tính nước', 'chinh rong'));
      if (!Y.coKetQua) veForm();
    }
  }
  function vePanelSoat() {
    const the = $('#y-the'), loi = Y.daSua ? PT.kiemThe(banTuThe(Y.T.fen())) : [];
    let h = '';
    if (Y.tuAnh) {
      const so = Y.T.ban.reduce((n, p) => n + (p ? 1 : 0), 0), nl = Y.loNgo.length;
      h = `<div class="soat-anh">
        <button class="anh-nho" data-bay="xemanh" aria-label="Phóng to ảnh gốc"><img src="${Y.anh.nho}" alt="Bàn cờ trong ảnh bạn chọn"></button>
        <div><p class="chu-hoc"><b>Đọc được ${so} quân.</b>${nl ? ` ${nl} quân chưa chắc, có vòng đứt nét.` : ''}</p>
        <p class="meo-gd">So với ảnh bên cạnh. Quân nào sai thì chọn quân đúng ở bảng rồi chạm vào ô đó.${Y.anh.nghieng ? ' Ảnh chụp nghiêng dễ đọc sai, nhớ soát từng quân.' : ''}</p></div></div>`;
    } else {
      h = '<p class="chu-hoc">Chạm quân ở bảng, rồi chạm ô để đặt. Chọn Bỏ quân rồi chạm để xóa. Xếp xong bấm Tính nước.</p>';
    }
    if (loi.length) h += `<div class="phan-hoi sai"><b>Thế này chưa hợp lệ:</b><ul>${loi.slice(0, 4).map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>`;
    the.innerHTML = h;
  }
  function bamBay(s) {
    if (!Y || Y.buoc !== 'soat') return;
    if (Y.chon == null) {
      $('#y-the').insertAdjacentHTML('afterbegin', '<p class="phan-hoi sai">Chọn một quân ở bảng trước, hoặc chọn Bỏ quân.</p>');
      return;
    }
    const F = new L.The(THE_TRONG);
    for (let o = 0; o < 90; o++) {
      if (o === s) continue;
      if (Y.T.ban[o]) F.datQuan(o, Y.T.ban[o]);
    }
    if (Y.chon) F.datQuan(s, Y.chon);
    F.ben = Y.ben;
    Y.T = F;
    Y.daSua = true;
    Y.loNgo = Y.loNgo.filter(x => x !== s);
    CO.OT.rung('chon'); CO.OT.phat('dat');
    veBay();
  }
  // Soát xong: thế phải hợp lệ mới tính được
  function sangHoi() {
    Y.T.ben = Y.ben;
    const fen = Y.T.fen(), loi = PT.kiemThe(banTuThe(fen));
    if (loi.length) {
      Y.daSua = true;
      vePanelSoat();
      CO.OT.phat('sai');
      return;
    }
    const kt = L.ketThuc(banTuThe(fen));
    if (kt && kt.thang != null) {
      $('#y-the').innerHTML = `<p class="phan-hoi dung">Thế này đã xong: ${BEN[kt.thang]} thắng vì ${kt.kieu === 'bi' ? 'chiếu bí' : 'đối phương hết nước'}. Đổi bên đi trước hoặc sửa thế.</p>`;
      return;
    }
    Y.buoc = 'hoi'; Y.coKetQua = false;
    veBay();
  }
  function veForm() {
    const ten = BEN[Y.ben], kia = BEN[1 - Y.ben], n = Y.soNuoc;
    const mo = { chieu: `${ten} đi trước, tìm đường chiếu bí ${kia} trong tối đa ${n} nước.`, tranh: `${ten} đi trước, tìm nước để ${kia} không ép bí được trong ${n} nước.`, hay: `${ten} đi trước, máy tìm các nước đáng đi nhất.` }[Y.yeuCau];
    const nut = (k, chu) => `<button role="radio" aria-checked="${Y.yeuCau === k}" data-y-yc="${k}">${chu}</button>`;
    $('#y-the').innerHTML = `<div class="chon-yc" role="radiogroup" aria-label="Yêu cầu">${nut('chieu', 'Chiếu bí')}${nut('tranh', 'Tránh bị bí')}${nut('hay', 'Nước hay nhất')}</div>
      ${Y.yeuCau === 'hay' ? '' : `<div class="chon-so"><span id="y-nhan-so">Trong mấy nước</span><div class="ds-so" role="radiogroup" aria-labelledby="y-nhan-so">${[1, 2, 3, 4, 5, 6, 7, 8].map(v => `<button role="radio" aria-checked="${v === n}" data-y-n="${v}">${v}</button>`).join('')}</div></div>`}
      <p class="meo-gd">${esc(mo)}</p>
      ${Y.yeuCau !== 'hay' && n >= 5 ? '<p class="meo-gd">Từ 5 nước trở lên máy ưu tiên các đường chiếu liên tục, có thể không kịp xét hết mọi đường trong thời gian cho phép.</p>' : ''}`;
  }
  // Viết một đường nước đi: { ky, chu } cho từng nước
  const dongNuoc = (fen, ds, pv) => {
    const U = L.dungThe(fen, ds), ra = [];
    for (const m of pv) { ra.push({ m, ky: PT.ghi(U, m).ky, mo: PT.moTaNuoc(U, m) }); U.diGhi(m); }
    return ra;
  };
  const chuoiKy = ds => ds.map((x, i) => `${i % 2 === 0 ? `${i / 2 + 1}. ` : ''}${x.ky}`).join('  ');
  const dangTinh = chu => { $('#y-the').innerHTML = `<p class="chu-hoc"><i class="dang-nghi"></i><span id="y-tt">${esc(chu)}</span></p>`; };

  async function tinhNuoc() {
    if (Y.dangTinh) return;
    const luot = ++luotTinh, conLuot = () => Y && luot === luotTinh;
    Y.T.ben = Y.ben;
    const fen = Y.T.fen(), loi = PT.kiemThe(banTuThe(fen));
    if (loi.length) {
      $('#y-the').innerHTML = `<div class="phan-hoi sai"><b>Thế này chưa hợp lệ:</b><ul>${loi.slice(0, 4).map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>`;
      CO.OT.phat('sai');
      return;
    }
    Y.dangTinh = true; Y.pv = null;
    BY.veMui(null);
    try {
      if (Y.yeuCau === 'chieu') await tinhChieu(fen, conLuot);
      else if (Y.yeuCau === 'tranh') await tinhTranh(fen, conLuot);
      else await tinhHay(fen, conLuot);
    } catch (e) {
      if (conLuot()) $('#y-the').innerHTML = `<p class="phan-hoi sai">Máy tính bị lỗi: ${esc(e.message || e)}. Thử lại nhé.</p>`;
    }
    if (!conLuot()) return;
    Y.dangTinh = false;
    Y.coKetQua = true;
    $('#y-phu').textContent = 'Chạm vào một nước để xem trên bàn';
    $('#y-cc').innerHTML = nutCC('sua', 'lui', 'Sửa thế') + nutBen() + nutCC('doiyc', 'goi', 'Yêu cầu khác', 'rong');
    $('#y-the').scrollTop = 0;
  }
  // Chiếu bí trong N nước: thử đường chiếu liên tục trước (nhanh, đi được sâu), rồi xét đủ mọi nước
  async function tinhChieu(fen, conLuot) {
    const n = Y.soNuoc, ten = BEN[Y.ben], kia = BEN[1 - Y.ben];
    dangTinh(`Máy đang tìm đường chiếu bí trong ${n} nước...`);
    const lien = await CO.goiMay('giai', { fen, ds: [], n, o: { chiChieu: true, ms: 3000 } });
    if (!conLuot()) return;
    let lg = lien, xetHet = false;
    if (lien.n) {
      if (lien.n > 1) {   // có đường chiếu liên tục: xem còn đường ngắn hơn có nước êm không
        const ngan = await CO.goiMay('giai', { fen, ds: [], n: lien.n - 1, o: { ms: 3000 } });
        if (!conLuot()) return;
        if (ngan.n) lg = ngan;
      }
    } else {
      dangTinh('Chưa có đường chiếu liên tục. Máy đang xét cả các nước êm...');
      lg = await CO.goiMay('giai', { fen, ds: [], n, o: { ms: 12000 } });
      if (!conLuot()) return;
      xetHet = !lg.n && !lg.het;
    }
    const the = $('#y-the');
    if (lg.n) {
      Y.pv = lg.pv;
      const ds = dongNuoc(fen, [], lg.pv);
      the.innerHTML = `<p class="chu-hoc"><b>${ten} chiếu bí trong ${lg.n} nước.</b></p>
        <ol class="ds-chon">${ds.map((x, i) => `<li><button class="nuoc-chon ${i % 2 ? 'nuoc-dap' : ''}" data-bay-mui="${x.m}" data-bay-ky="${i}"><b>${i % 2 === 0 ? `${i / 2 + 1}. ${ten}` : kia}: ${esc(x.ky)}</b> ${esc(x.mo.chu)}.</button></li>`).join('')}</ol>
        ${ds.length > 1 ? `<p class="meo-gd">Đây là đường ${kia} chống được lâu nhất, đi cách khác thì bị bí sớm hơn.</p>` : ''}
        <button class="nut-phu" data-bay="chay">Xem từng nước trên bàn</button>
        <button class="nut-phu" data-bay="danh">Đánh với máy từ thế này</button>`;
      BY.veMui([{ tu: lg.pv[0] & 255, den: lg.pv[0] >> 8, mau: 'goi' }]);
      CO.OT.phat('dung');
      return;
    }
    the.innerHTML = `${xetHet
      ? `<p class="chu-hoc"><b>${ten} không có đường chiếu bí trong ${n} nước.</b> Máy đã xét hết mọi nước, ${kia} luôn có cách chống.</p>`
      : `<p class="chu-hoc"><b>Chưa tìm ra đường chiếu bí trong ${n} nước.</b> Máy ${lien.het ? 'chưa kịp xét hết' : 'đã xét hết'} các đường chiếu liên tục, còn đường có nước êm thì chưa xét hết trong thời gian cho phép.</p>`}
      ${n < 8 ? `<button class="nut-phu" data-y-tiep="${n + 1}">Thử ${n + 1} nước</button>` : ''}
      <button class="nut-phu" data-bay="hay">Xem nước đáng đi nhất</button>`;
  }
  // Tránh bị bí: với từng nước của mình, đối phương có ép bí được trong N nước không
  async function tinhTranh(fen, conLuot) {
    const n = Y.soNuoc, ten = BEN[Y.ben], kia = BEN[1 - Y.ben], T = banTuThe(fen), ds = T.hopLe();
    const dangChieu = T.biChieu(Y.ben);
    let doa = null;
    dangTinh(`Máy đang xem ${kia} dọa gì...`);
    if (!dangChieu) {
      // Giả sử mình bỏ lượt: đối phương có bí được không. Chính là mối dọa hiện tại
      const fen2 = fen.replace(/ [wb]$/, Y.ben ? ' w' : ' b');
      if (!banTuThe(fen2).biChieu(Y.ben)) {
        const g = await CO.goiMay('giai', { fen: fen2, ds: [], n, o: { ms: 2000 } });
        if (!conLuot()) return;
        if (g.n) doa = { n: g.n, ds: dongNuoc(fen2, [], g.pv) };
      }
    }
    const HAN = 14000, t0 = performance.now(), kq = [];
    // Xét nước ăn quân, nước chiếu trước cho có kết quả sớm
    for (let i = 0; i < ds.length; i++) {
      const m = ds[i];
      const el = $('#y-tt');
      if (el) el.textContent = `Máy đang xét nước ${i + 1} trên ${ds.length}...`;
      const chu = L.nuocChu(m), lien = await CO.goiMay('giai', { fen, ds: [chu], n, o: { chiChieu: true, ms: 200 } });
      if (!conLuot()) return;
      let g = lien, chac = true;
      if (!lien.n) {
        const con = HAN - (performance.now() - t0), phan = Math.max(60, con / (ds.length - i));
        g = await CO.goiMay('giai', { fen, ds: [chu], n, o: { ms: phan } });
        if (!conLuot()) return;
        chac = !g.het;
      }
      kq.push({ m, ky: PT.ghi(T, m).ky, mo: PT.moTaNuoc(T, m), bi: g.n, pv: g.pv || [], chac });
    }
    const an = kq.filter(x => !x.bi), thua = kq.filter(x => x.bi).sort((a, b) => b.bi - a.bi);
    // Xếp các nước an toàn theo đánh giá của máy
    const xep = [];
    const loai = thua.map(x => x.m);
    for (let k = 0; k < Math.min(3, an.length); k++) {
      const el = $('#y-tt');
      if (el) el.textContent = 'Máy đang chọn nước tốt nhất trong các nước thoát...';
      const r = await CO.goiMay('tim', { fen, ds: [], o: { ms: 500, loaiTru: loai.concat(xep.map(x => x.m)) } });
      if (!conLuot()) return;
      const x = an.find(v => v.m === r.nuoc);
      if (!x) break;
      x.diem = r.diem;
      xep.push(x);
    }
    const conLai = an.filter(x => !xep.includes(x));
    const moiChieu = m => {   // đối phương còn mấy nước chiếu sau nước này
      const U = banTuThe(fen);
      U.di(m);
      const ra = U.hopLe();
      let dem = 0;
      for (const r of ra) { U.di(r); if (U.biChieu(U.ben)) dem++; U.lui(); }
      return dem;
    };
    const dongAn = x => {
      if (x.mo.bi) return `<li><button class="nuoc-chon" data-bay-mui="${x.m}"><b>${esc(x.ky)}</b> ${esc(x.mo.chu)}.</button></li>`;
      const c = moiChieu(x.m);
      const nhan = c ? `${kia} còn ${c} nước chiếu nhưng không ép bí được trong ${n} nước` : `${kia} không chiếu được ở nước sau`;
      return `<li><button class="nuoc-chon" data-bay-mui="${x.m}"><b>${esc(x.ky)}</b> ${esc(x.mo.chu)}.<small>${esc(x.chac ? nhan : `Chưa thấy bị bí, máy chưa kịp xét hết mọi đường`)}${x.diem != null ? `. ${esc(PT.diemRaChu(Y.ben === 0 ? x.diem : -x.diem))}` : ''}</small></button></li>`;
    };
    const dongThua = x => {
      const d = dongNuoc(fen, [x.m], x.pv);
      return `<li><button class="nuoc-chon nuoc-thua" data-bay-mui="${x.m}"><b>${esc(x.ky)}</b> bị bí sau ${x.bi} nước<small>${esc(d.map(v => v.ky).join('  '))}</small></button></li>`;
    };
    const dau = dangChieu ? `<p class="chu-hoc"><b>${ten} đang bị chiếu.</b></p>`
      : doa ? `<p class="chu-hoc"><b>${kia} đang dọa chiếu bí sau ${doa.n} nước:</b> ${doa.n === 1 ? `${esc(doa.ds[0].ky)}, ${esc(doa.ds[0].mo.chu.charAt(0).toLowerCase() + doa.ds[0].mo.chu.slice(1))}` : esc(chuoiKy(doa.ds))}.</p>`
        : `<p class="chu-hoc"><b>${kia} chưa dọa được chiếu bí trong ${n} nước.</b></p>`;
    const the = $('#y-the');
    if (an.length) {
      the.innerHTML = `${dau}<h3>${an.length === ds.length ? `Cả ${ds.length} nước đều không bị bí trong ${n} nước` : `${an.length} trên ${ds.length} nước tránh được bí trong ${n} nước`}</h3>
        <ol class="ds-chon">${xep.concat(conLai.slice(0, 5 - Math.min(5, xep.length))).map(dongAn).join('')}</ol>
        ${conLai.length > 5 - Math.min(5, xep.length) ? `<p class="meo-gd">Còn ${conLai.length - (5 - Math.min(5, xep.length))} nước khác cũng không bị bí.</p>` : ''}
        ${thua.length ? `<details class="nhom-thua"><summary>${thua.length} nước đi vào thế bị bí</summary><ol class="ds-chon">${thua.slice(0, 30).map(dongThua).join('')}</ol></details>` : ''}
        <button class="nut-phu" data-bay="danh">Đánh với máy từ thế này</button>`;
      const dauTien = xep[0] || an[0];
      BY.veMui([{ tu: dauTien.m & 255, den: dauTien.m >> 8, mau: 'goi' }]);
      CO.OT.phat('dung');
    } else {
      const lau = thua[0];
      the.innerHTML = `${dau}<h3>Không thoát được: nước nào cũng bị bí trong ${n} nước</h3>
        <p class="meo-gd">Chống được lâu nhất là ${esc(lau.ky)}, bị bí sau ${lau.bi} nước.</p>
        <ol class="ds-chon">${thua.slice(0, 30).map(dongThua).join('')}</ol>`;
      BY.veMui([{ tu: lau.m & 255, den: lau.m >> 8, mau: 'goi' }]);
    }
  }
  // Nước hay nhất: đường bí ngắn nếu có, không thì ba nước đáng đi và kế hoạch
  async function tinhHay(fen, conLuot) {
    const the = $('#y-the');
    dangTinh('Máy đang tìm đường chiếu bí...');
    let lg = null;
    try {
      lg = await CO.goiMay('giai', { fen, ds: [], n: 3, o: { ms: 2200 } });
      if (!lg.n) { const dai = await CO.goiMay('giai', { fen, ds: [], n: 8, o: { chiChieu: true, ms: 2600 } }); if (dai.n) lg = dai; }
    } catch (e) { /* đọc thế bên dưới */ }
    if (!conLuot()) return;
    const ten = BEN[Y.ben];
    if (lg && lg.n) {
      Y.pv = lg.pv;
      const ds = dongNuoc(fen, [], lg.pv);
      the.innerHTML = `<p class="chu-hoc"><b>${ten} thắng trong ${lg.n} nước.</b></p><p class="duong">${esc(chuoiKy(ds))}</p>
        <button class="nut-phu" data-bay="chay">Xem từng nước trên bàn</button>
        <button class="nut-phu" data-bay="danh">Đánh với máy từ thế này</button>`;
      return;
    }
    dangTinh('Chưa thấy đường bí ngay. Máy đang đọc thế cờ...');
    const ds = await CO.goiMay('nhieu', { fen, ds: [], o: { ms: 1800, soNuoc: 3 } });
    if (!conLuot()) return;
    const U = banTuThe(fen);
    const tq = PT.tongQuan(U, ds[0]);
    const hang_ = ds.map((r, i) => {
      const g = PT.ghi(U, r.nuoc), d = PT.moTaNuoc(U, r.nuoc), dDo = Y.ben === 0 ? r.diem : -r.diem;
      return `<li><button class="nuoc-chon" data-bay-mui="${r.nuoc}"><b>${i + 1}. ${esc(g.ky)}</b> ${esc(d.chu)}.<small>${esc(PT.diemRaChu(dDo))}</small></button></li>`;
    }).join('');
    the.innerHTML = `<p class="chu-hoc"><b>${esc(tq.chuDiem)}</b></p><p class="meo-gd">${esc(tq.tenGd)}. ${esc(PT.cheoQuan(U))}</p>
      <h3>Ba nước đáng cân nhắc cho ${ten}</h3><ol class="ds-chon">${hang_}</ol>
      <h3>Kế hoạch</h3><ul class="ds-ke">${tq.keHoach.map(k => `<li>${esc(k)}</li>`).join('')}</ul>
      <button class="nut-phu" data-bay="danh">Đánh với máy từ thế này</button>`;
    if (ds[0]) BY.veMui([{ tu: ds[0].nuoc & 255, den: ds[0].nuoc >> 8, mau: 'goi' }]);
  }
  async function chayLoiBay() {
    Y.T.ben = Y.ben;
    const fen = Y.T.fen(), U = new L.The(fen);
    BY.nap(U);
    BY.veMui(null);
    for (const m of Y.pv) {
      if (!Y) return;
      const an = U.ban[m >> 8], d = PT.moTaNuoc(U, m);
      U.diGhi(m);
      BY.T = U;
      await BY.diHinh(m, { an, chieu: d.chieu, bi: d.bi, cuaMinh: true });
      await doi(750);
    }
    if (!Y) return;
    await doi(800);
    Y.T = new L.The(fen);
    BY.nap(Y.T);
  }
  document.addEventListener('click', e => {
    const q = e.target.closest('[data-bay-q]');
    if (q && Y) { Y.chon = +q.dataset.bayQ; veBay(); CO.OT.rung('chon'); return; }
    const mui = e.target.closest('[data-bay-mui]');
    if (mui && BY) {
      const m = +mui.dataset.bayMui;
      // Đang xem đường bí nhiều nước thì nạp đúng thế trước nước đó để mũi tên có nghĩa
      const ky = mui.dataset.bayKy;
      if (ky != null && Y && Y.pv) {
        const U = new L.The(Y.T.fen());
        Y.pv.slice(0, +ky).forEach(x => U.diGhi(x));
        BY.nap(U);
      }
      BY.veMui([{ tu: m & 255, den: m >> 8, mau: 'goi' }]);
      return;
    }
    if (!Y) return;
    const yc = e.target.closest('[data-y-yc]');
    if (yc) { Y.yeuCau = yc.dataset.yYc; veForm(); CO.OT.rung('nhe'); return; }
    const so = e.target.closest('[data-y-n]');
    if (so) { Y.soNuoc = +so.dataset.yN; veForm(); CO.OT.rung('nhe'); return; }
    const tiep = e.target.closest('[data-y-tiep]');
    if (tiep) { Y.soNuoc = +tiep.dataset.yTiep; Y.coKetQua = false; tinhNuoc(); return; }
    const b = e.target.closest('[data-bay]');
    if (!b) return;
    const lam = b.dataset.bay;
    CO.OT.rung('nhe');
    if (lam === 've') { luotTinh++; Y = null; BY = null; A = null; CO.veMan(); return; }
    if (lam === 'xoaq') { Y.chon = 0; veBay(); return; }
    if (lam === 'dau') { Y.T = new L.The(L.FEN_DAU); Y.ben = 0; Y.daSua = false; veBay(); return; }
    if (lam === 'trong') { Y.T = new L.The(THE_TRONG); Y.loNgo = []; Y.daSua = true; veBay(); return; }
    if (lam === 'ben') { luotTinh++; Y.dangTinh = false; Y.ben = 1 - Y.ben; Y.coKetQua = false; Y.pv = null; veBay(); return; }
    if (lam === 'giai') { sangHoi(); return; }
    if (lam === 'sua') { luotTinh++; Y.dangTinh = false; Y.buoc = 'soat'; Y.coKetQua = false; Y.pv = null; veBay(); return; }
    if (lam === 'doiyc') { luotTinh++; Y.dangTinh = false; Y.coKetQua = false; Y.pv = null; BY.nap(Y.T); veBay(); return; }
    if (lam === 'tinh') { tinhNuoc(); return; }
    if (lam === 'hay') { Y.yeuCau = 'hay'; tinhNuoc(); return; }
    if (lam === 'chay') { chayLoiBay(); return; }
    if (lam === 'xemanh') { CO.moTam(`<img class="anh-to" src="${Y.anh.nho}" alt="Bàn cờ trong ảnh bạn chọn"><button class="nut-phu" data-dong-anh>Đóng</button>`, { khiBam: (ev, dong) => { if (ev.target.closest('[data-dong-anh]')) dong(); } }); return; }
    if (lam === 'canlai') { luotTinh++; Y = null; BY = null; moManAnh(); veCan('Kéo 4 chấm vào 4 góc lưới rồi đọc lại.'); return; }
    if (lam === 'danh') {
      Y.T.ben = Y.ben;
      const fen = Y.T.fen(), ben = Y.ben;
      luotTinh++;
      Y = null; BY = null;
      CO.moVanTuThe(fen, ben, 5);
    }
  });

  // ---------- Đưa ảnh thế cờ: chọn ảnh, tìm bàn, kéo 4 góc nếu cần, đọc quân rồi sang màn soát ----------
  let A = null;
  const CANH_ANH = 1600;
  function chonAnh() {
    const cu = $('#co-chon-anh');
    if (cu) cu.remove();   // lần trước bấm hủy thì ô chọn còn nằm lại
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'image/*'; inp.id = 'co-chon-anh';
    inp.style.cssText = 'position:fixed;left:0;top:0;width:1px;height:1px;opacity:0;pointer-events:none';   // Safari đời cũ không mở được ô chọn đã ẩn hẳn
    document.body.appendChild(inp);
    inp.addEventListener('change', () => {
      const f = inp.files && inp.files[0];
      inp.remove();
      if (f) napAnh(f);
    });
    inp.click();
  }
  const docTep = f => new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = () => no(r.error); r.readAsDataURL(f); });
  const giaiAnh = url => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => no(new Error('anh')); i.src = url; });
  function moManAnh() {
    luotTinh++;
    $('#man-co').innerHTML = `<div class="co-bay co-can">
      <header class="thanh-tren">
        <button class="nut-ve" data-can="ve" aria-label="Về trang Cờ tướng">${CO.icon('ve')}</button>
        <div class="tieu-de"><b>Ảnh thế cờ</b><span id="a-phu">Ảnh chỉ xử lý trong máy, không gửi đi đâu</span></div>
      </header>
      <div class="anh-khung" id="a-khung"></div>
      <section class="the-hoc" id="a-the" aria-live="polite"></section>
      <footer class="cong-cu nho" id="a-cc"></footer>
    </div>`;
    CO.moMan();
  }
  async function napAnh(f) {
    moManAnh();
    $('#a-the').innerHTML = '<p class="chu-hoc"><i class="dang-nghi"></i>Đang mở ảnh...</p>';
    let img;
    try { img = await giaiAnh(await docTep(f)); } catch (e) {
      $('#a-the').innerHTML = '<p class="phan-hoi sai">Không mở được ảnh này. Chọn ảnh JPG hoặc PNG khác.</p>';
      $('#a-cc').innerHTML = '<button class="cc chinh rong" data-can="khac"><span>Chọn ảnh khác</span></button>';
      return;
    }
    const k = Math.min(1, CANH_ANH / Math.max(img.naturalWidth, img.naturalHeight));
    const can = document.createElement('canvas');
    can.width = Math.max(1, Math.round(img.naturalWidth * k)); can.height = Math.max(1, Math.round(img.naturalHeight * k));
    const g = can.getContext('2d', { willReadFrequently: true });
    g.fillStyle = '#fff'; g.fillRect(0, 0, can.width, can.height);
    g.drawImage(img, 0, 0, can.width, can.height);
    let dl;
    try { dl = g.getImageData(0, 0, can.width, can.height); } catch (e) {
      $('#a-the').innerHTML = '<p class="phan-hoi sai">Máy này không đọc được điểm ảnh của ảnh đã chọn. Tự xếp quân bằng tay nhé.</p>';
      $('#a-cc').innerHTML = '<button class="cc chinh rong" data-can="tay"><span>Tự xếp quân</span></button>';
      return;
    }
    A = { can, a: { w: can.width, h: can.height, d: dl.data }, q: null };
    veAnhNen();
    $('#a-the').innerHTML = '<p class="chu-hoc"><i class="dang-nghi"></i>Đang tìm bàn cờ trong ảnh...</p>';
    await doi(50);
    const kq = window.CoAnh.timBan(A.a);
    if (!A) return;
    const chac = kq.q && (kq.diem >= 0.62 || (kq.diem >= 0.5 && kq.khop >= 0.5));
    if (kq.q) A.q = kq.q;
    if (chac) { docTuAnh(true); return; }
    if (!A.q) {
      const w = A.a.w, h = A.a.h, le = Math.min(w, h) * 0.12;
      A.q = [[le, le], [w - le, le], [w - le, h - le], [le, h - le]];
    }
    veCan('Chưa nhận ra chắc bàn cờ. Kéo 4 chấm vào 4 góc lưới: chỗ hai đường kẻ ngoài cùng gặp nhau, không phải mép bàn.');
  }
  // Vẽ ảnh vừa khung, tính tỉ lệ để đổi tọa độ ảnh <-> màn hình
  function veAnhNen() {
    const kh = $('#a-khung');
    if (!kh || !A) return;
    const toiDaCao = Math.max(220, innerHeight - CO.leAnToan().reduce((s, v) => s + v, 0) - 250);
    const W = Math.min(innerWidth - 12, 620), s = Math.min(W / A.a.w, toiDaCao / A.a.h);
    const rong = Math.round(A.a.w * s), cao = Math.round(A.a.h * s), dpr = Math.min(2, window.devicePixelRatio || 1);
    A.s = s; A.dpr = dpr;
    kh.innerHTML = `<div class="anh-vung" id="a-vung" style="width:${rong}px;height:${cao}px">
      <canvas id="a-nen" width="${Math.round(rong * dpr)}" height="${Math.round(cao * dpr)}"></canvas>
      <canvas id="a-luoi" width="${Math.round(rong * dpr)}" height="${Math.round(cao * dpr)}"></canvas>
      <canvas id="a-lup" class="kinh-lup" width="${Math.round(108 * dpr)}" height="${Math.round(108 * dpr)}" hidden></canvas>
    </div>`;
    $('#a-nen').getContext('2d').drawImage(A.can, 0, 0, Math.round(rong * dpr), Math.round(cao * dpr));
  }
  const TEN_GOC = ['trên trái', 'trên phải', 'dưới phải', 'dưới trái'];
  function veCan(chu) {
    if (!A) return;
    if (!A.q) { const w = A.a.w, h = A.a.h, le = Math.min(w, h) * 0.12; A.q = [[le, le], [w - le, le], [w - le, h - le], [le, h - le]]; }
    veAnhNen();
    const vung = $('#a-vung');
    vung.insertAdjacentHTML('beforeend', A.q.map((_, i) => `<button class="goc-keo" data-goc="${i}" aria-label="Góc ${TEN_GOC[i]} của lưới. Dùng phím mũi tên để dịch"><i></i></button>`).join(''));
    $('#a-the').innerHTML = `<p class="chu-hoc">${esc(chu)}</p>
      <p class="meo-gd">Không căn được thì <button class="nut-chu-nho" data-can="tay">tự xếp quân bằng tay</button>.</p>`;
    $('#a-cc').innerHTML = '<button class="cc rong" data-can="khac"><span>Chọn ảnh khác</span></button><button class="cc chinh rong" data-can="doc"><span>Đọc quân</span></button>';
    datGoc();
  }
  function datGoc() {
    const c = $('#a-luoi');
    if (!c || !A) return;
    const s = A.s, dpr = A.dpr, g = c.getContext('2d');
    g.clearRect(0, 0, c.width, c.height);
    const [a, b, cc, d, e, f, h, i] = window.CoAnh.lapH(A.q);
    const P = (k, r) => { const u = k / 8, v = r / 9, z = h * u + i * v + 1; return [(a * u + b * v + cc) / z * s * dpr, (d * u + e * v + f) / z * s * dpr]; };
    const ve = (mau, day) => {
      g.strokeStyle = mau; g.lineWidth = day * dpr;
      g.beginPath();
      for (let r = 0; r < 10; r++) { const p0 = P(0, r), p1 = P(8, r); g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]); }
      for (let k = 0; k < 9; k++) { const p0 = P(k, 0), p1 = P(k, 9); g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]); }
      g.stroke();
    };
    ve('rgba(0,0,0,.55)', 2.4);
    ve('#3DE0FF', 1.1);
    $$('.goc-keo').forEach((nut, n) => { nut.style.transform = `translate(${A.q[n][0] * s}px,${A.q[n][1] * s}px)`; });
  }
  function kinhLup(n, xMan) {
    const l = $('#a-lup');
    if (!l || !A) return;
    if (n == null) { l.hidden = true; return; }
    l.hidden = false;
    const r = 26, [x, y] = A.q[n], g = l.getContext('2d'), W = l.width;
    g.fillStyle = '#111'; g.fillRect(0, 0, W, W);
    g.drawImage(A.can, x - r, y - r, 2 * r, 2 * r, 0, 0, W, W);
    g.strokeStyle = '#3DE0FF'; g.lineWidth = A.dpr;
    g.beginPath(); g.moveTo(W / 2, 0); g.lineTo(W / 2, W); g.moveTo(0, W / 2); g.lineTo(W, W / 2); g.stroke();
    // Đặt kính phía đối diện ngón tay
    l.style.left = xMan > $('#a-vung').clientWidth / 2 ? '6px' : '';
    l.style.right = xMan > $('#a-vung').clientWidth / 2 ? '' : '6px';
  }
  let gocDangKeo = null;
  document.addEventListener('pointerdown', e => {
    const nut = e.target.closest('.goc-keo');
    if (!nut || !A) return;
    e.preventDefault();
    gocDangKeo = +nut.dataset.goc;
    try { nut.setPointerCapture(e.pointerId); } catch (x) { /* máy cũ */ }
    kinhLup(gocDangKeo, A.q[gocDangKeo][0] * A.s);
  });
  document.addEventListener('pointermove', e => {
    if (gocDangKeo == null || !A) return;
    const v = $('#a-vung');
    if (!v) return;
    const r = v.getBoundingClientRect();
    A.q[gocDangKeo] = [Math.max(0, Math.min(A.a.w - 1, (e.clientX - r.left) / A.s)), Math.max(0, Math.min(A.a.h - 1, (e.clientY - r.top) / A.s))];
    datGoc();
    kinhLup(gocDangKeo, e.clientX - r.left);
  });
  const thaGoc = () => { if (gocDangKeo != null) { gocDangKeo = null; kinhLup(null); } };
  document.addEventListener('pointerup', thaGoc);
  document.addEventListener('pointercancel', thaGoc);
  document.addEventListener('keydown', e => {
    const nut = e.target.closest && e.target.closest('.goc-keo');
    if (!nut || !A) return;
    const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
    if (!d) return;
    e.preventDefault();
    const n = +nut.dataset.goc, buoc = 2 / A.s;
    A.q[n] = [Math.max(0, Math.min(A.a.w - 1, A.q[n][0] + d[0] * buoc)), Math.max(0, Math.min(A.a.h - 1, A.q[n][1] + d[1] * buoc))];
    datGoc();
  });
  // Ảnh nhỏ cắt quanh bàn cờ để so khi soát
  function catBan() {
    const q = A.q, xs = q.map(p => p[0]), ys = q.map(p => p[1]), le = (Math.max(...xs) - Math.min(...xs)) / 8 * 0.6;
    const x0 = Math.max(0, Math.min(...xs) - le), y0 = Math.max(0, Math.min(...ys) - le), x1 = Math.min(A.a.w, Math.max(...xs) + le), y1 = Math.min(A.a.h, Math.max(...ys) + le);
    const W = Math.min(720, x1 - x0), k = W / (x1 - x0), c = document.createElement('canvas');
    c.width = Math.round(W); c.height = Math.round((y1 - y0) * k);
    c.getContext('2d').drawImage(A.can, x0, y0, x1 - x0, y1 - y0, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.82);
  }
  async function docTuAnh(tuDong) {
    const the = $('#a-the');
    if (the) the.innerHTML = '<p class="chu-hoc"><i class="dang-nghi"></i>Đang đọc từng quân...</p>';
    await doi(40);
    if (!A) return;
    if (!tuDong) A.q = window.CoAnh.chinhGoc(A.a, A.q);
    const r = window.CoAnh.docQuan(A.a, A.q);
    let so = 0;
    for (let i = 0; i < 90; i++) if (r.ban[i]) so++;
    if (so < 2) {
      veCan('Chưa đọc được quân nào. Xem lại 4 chấm đã nằm đúng góc lưới chưa.');
      return;
    }
    // Đổi về tọa độ máy cờ (Đỏ ở dưới). Ảnh chụp từ phía Đen thì xoay bàn cho giống ảnh
    const lat = !r.doDuoi, T = new L.The(THE_TRONG), loNgo = [];
    for (let i = 0; i < 90; i++) {
      if (!r.ban[i]) continue;
      const s = lat ? 89 - i : i;
      T.datQuan(s, r.ban[i]);
      if (r.tin[i] < 0.6) loNgo.push(s);
    }
    // Mặc định bên ở phía dưới ảnh đi trước; bên đang bị chiếu thì phải tới lượt bên đó
    let ben = lat ? 1 : 0;
    if (T.vua[0] >= 0 && T.vua[1] >= 0 && T.biChieu(1 - ben) && !T.biChieu(ben)) ben = 1 - ben;
    T.ben = ben;
    moBay({ fen: T.fen(), ben, lat, loNgo, anh: { nho: catBan(), nghieng: !r.chuNhat } });
  }
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-can]');
    if (!b) return;
    const lam = b.dataset.can;
    CO.OT.rung('nhe');
    if (lam === 've') { A = null; CO.veMan(); return; }
    if (lam === 'khac') { chonAnh(); return; }
    if (lam === 'doc') { docTuAnh(false); return; }
    if (lam === 'tay') { A = null; moBay(); }
  });
  addEventListener('resize', () => { if (A && $('.goc-keo')) { const chu = $('#a-the .chu-hoc'); veCan(chu ? chu.textContent : ''); } });

  // ---------- Bấm từ trang chính ----------
  document.addEventListener('click', e => {
    const nd = $('#nd-co');
    if (!nd || !nd.contains(e.target)) return;
    const b = e.target.closest('[data-co]');
    if (!b) return;
    const lam = b.dataset.co, [k, v] = lam.split(':');
    CO.OT.rung('nhe');
    if (k === 'bai') moBai(v);
    else if (k === 'muc') CO.hopVanMoi(+v);
    else if (k === 'the') moThe(v);
    else if (lam === 'danh-tiep') CO.moVanDo();
    else if (lam === 'phong-tiep') CO.moLaiPhong();
    else if (lam === 'hai-nguoi') {
      const d = CO.vanDo();
      if (d) CO.OT.hoi({ tieuDe: 'Bỏ ván đang đánh dở?', noiDung: 'Mở ván hai người sẽ bỏ ván đang dở.', nut: [{ nhan: 'Bỏ và mở ván mới', kieu: 'chinh', gt: 1 }, { nhan: 'Để sau', kieu: 'chu', gt: null }] }).then(g => { if (g) { kho().ghi('co.dang', null); CO.moVanHaiNguoi(); } });
      else CO.moVanHaiNguoi();
    } else if (lam === 'mang') hopMang();
    else if (lam === 'mat') moMat();
    else if (lam === 'bay') moBay();
    else if (lam === 'anh') chonAnh();
    else if (lam === 'tra') hopTra();
    else if (lam === 'tu') hopTu();
    else if (lam === 'ls') hopLs();
  });

  // ---------- Chế độ chụp màn hình và kiểm thử: #demo=cotrang, covan, ... ----------
  CO.chayDemo = async kieu => {
    const D = CO.demoVan;
    if (kieu === 'cotrang') return;
    await doi(500);
    if (kieu === 'cobai') { moBai('phao'); await doi(600); H.i = 1; veBuoc(); return; }
    if (kieu === 'cohoi') { moBai('xe'); await doi(500); H.i = 5; veBuoc(); return; }
    if (kieu === 'cothe') { moThe('b2', 3); return; }
    if (kieu === 'comat') { moMat(); return; }
    if (kieu === 'cobay') { moBay(); return; }
    if (kieu === 'cotranh') {   // màn kết quả tránh bị chiếu bí, chụp cho trang giới thiệu
      moBay({ fen: '5kN2/1R6C/b1n1b1nr1/9/9/4cC3/9/4pp3/6p2/3rcK1R1 w', ben: 0 });
      Y.buoc = 'hoi'; Y.yeuCau = 'tranh'; Y.soNuoc = 3;
      veBay();
      tinhNuoc();
      return;
    }
    if (kieu === 'comang') { hopMang(); return; }
    if (kieu === 'cotra') { hopTra(); return; }
    if (kieu === 'covanmoi') { CO.hopVanMoi(3); return; }
    const ds = PT.chuoiNuoc(L.FEN_DAU, 'P2-5 M8.7 M2.3 B7.1 X1-2 X9-8 X2.6 M2.3 B7.1 P8-9 X2-3 P9/1');
    CO.OT.kho.ghi('co.dang', null);
    CO.moVanMay(3, 0, true);
    await doi(300);
    if (kieu === 'covandau') return;
    D.V.ds = ds;
    D.V.bat = Date.now();
    CO.demoLai();
    await doi(900);
    if (kieu === 'covan') return;
    if (kieu === 'coluc') { D.banDo(); return; }
    if (kieu === 'codoa') { D.banDo(); D.banDo(); return; }
    if (kieu === 'copt') { D.moTheCo(); return; }
    if (kieu === 'cobien') { D.moBien(); return; }
    if (kieu === 'coxem') {
      const v = Object.assign({}, D.V, { ket: { thang: 0, kieu: 'bi' } });
      CO.xemLai(v);
    }
  };
  CO.demoLai = () => { const v = CO.demoVan.V; CO.moVanTruc(v); };
})();
