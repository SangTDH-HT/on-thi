/* Ván cờ: đấu với máy, hai người một máy, đấu qua mạng; phân tích, biên bản, xem lại. */
(() => {
  'use strict';
  const L = window.CoLoi, PT = window.CoPT, CO = window.CO, DL = window.CO_DL;
  const $ = (s, g = document) => g.querySelector(s);
  const esc = CO.esc, doi = CO.doi;
  const BEN = PT.BEN, MS_PT = 280;

  const IC = {
    ve: '<path d="M15 5l-7 7 7 7"/>',
    lui: '<path d="M9 14L4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3"/>',
    goi: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.4 1 2.5h6c0-1.1.3-1.8 1-2.5A6 6 0 0 0 12 3z"/>',
    ban: '<path d="M4 6l5-2 6 2 5-2v14l-5 2-6-2-5 2zM9 4v14M15 6v14"/>',
    the: '<path d="M12 3v18M7 21h10M5 7h14M5 7l-3 7a3.4 3.4 0 0 0 6 0zM19 7l-3 7a3.4 3.4 0 0 0 6 0z"/>',
    bien: '<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
    xoay: '<path d="M4 12a8 8 0 0 1 14-5l2 2M20 12a8 8 0 0 1-14 5l-2-2M20 4v5h-5M4 20v-5h5"/>',
    co: '<path d="M5 21V4M5 4c4-2 6 2 10 0v9c-4 2-6-2-10 0"/>',
    hoa: '<path d="M3 11l4-4 5 3 5-3 4 4-9 9z"/>',
    choc: '<path d="M4 5h16v11H9l-5 4z"/>',
    dau: '<path d="M6 5v14M19 5l-9 7 9 7z"/>',
    cuoi: '<path d="M18 5v14M5 5l9 7-9 7z"/>',
    chia: '<path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v13"/>',
    tay: '<path d="M7 21l-4.3-4.3a2.4 2.4 0 0 1 0-3.4l9.6-9.6a2.4 2.4 0 0 1 3.4 0l5.6 5.6a2.4 2.4 0 0 1 0 3.4L13 21zM22 21H7M5 11l9 9"/>',
    truoc: '<path d="M15 5l-7 7 7 7"/>',
    sau: '<path d="M9 5l7 7-7 7"/>',
  };
  const icon = k => `<svg viewBox="0 0 24 24" aria-hidden="true">${IC[k]}</svg>`;
  const dauThuong = c => c.charAt(0).toLowerCase() + c.slice(1);   // ghép mô tả vào giữa câu, giữ hoa tên quân
  CO.icon = icon;

  const CHOC = {
    an: ['Cạch! Xin nhé.', 'Quân này ngon đấy.', 'Cảm ơn đã cho ăn.', 'Ăn rồi, còn gì nữa không?', 'Đứng đó làm chi cho mất.'],
    anLon: ['Mất {q} rồi nhé!', 'Đau chưa? {q} về tay tôi rồi.', 'Tạm biệt {q}!', '{q} này tôi nhận nhé.'],
    chieu: ['Chiếu! Chạy đi đâu?', 'Tướng ơi, ra đây nói chuyện.', 'Chiếu này đỡ nổi không?', 'Run chưa?', 'Chiếu cái cho tỉnh ngủ.'],
    bi: ['Hết đường rồi nhé!', 'Bí rồi! Ván sau cố lên.', 'Chiếu bí. Cảm ơn đã tham gia.'],
  };
  const CHOC_NHANH = ['Đi nhanh lên!', 'Run chưa?', 'Nước này hay đó, tiếc là sắp thua.', 'Có cần tôi chấp không?', 'Nghĩ lâu vậy, tính xin hòa hả?', 'Xin lỗi, tôi ăn hơi nhiều.', 'Chuẩn bị nhận thua đi.', 'Hay lắm! Mà vẫn thua nha.'];
  const mot = a => a[(Math.random() * a.length) | 0];
  function loiKhieuKhich(an, chieu, bi) {
    if (bi) return mot(CHOC.bi);
    if (chieu) return mot(CHOC.chieu);
    if (!an) return '';
    const t = an & 7;
    return t === L.XE || t === L.PH || t === L.MA ? mot(CHOC.anLon).replace('{q}', PT.TEN[t]) : mot(CHOC.an);
  }

  // ---------- Trạng thái ván ----------
  let V = null, T = null, B = null, phien = 0, xem = null, P = null, loiDs = [], lopPhu = 0, dangXuLy = false, XL = null, lucBat = 0;
  const KQ = new Map();
  const kho = () => CO.OT.kho;
  const benDau = v => (new L.The(v.fen)).ben;
  const benLuc = (v, n) => (benDau(v) + n) % 2;
  const luuVan = () => {
    if (!V || V.kieu === 'xem') return;
    if (V.kieu === 'mang') kho().ghi('co.phong', V.ket && V.ra ? null : { ma: V.ma, the: P ? P.the : null, ten: V.tenToi });
    else kho().ghi('co.dang', V.ket ? null : V);
  };

  function taoVan(o) {
    return { id: Date.now().toString(36), kieu: o.kieu, muc: o.muc || 0, ben: o.ben == null ? null : o.ben, fen: o.fen || L.FEN_DAU, ds: o.ds || [], tg: o.tg !== false, pt: {}, c: {}, ket: null, bat: Date.now(), xoay: !!o.xoay };
  }
  const tenVan = v => (v.kieu === 'may' ? `Mức ${v.muc}: ${L.MUC[v.muc - 1].ten}` : v.kieu === 'nguoi' ? 'Hai người một máy' : 'Đấu qua mạng');
  const coPhanTich = () => V && (V.kieu !== 'mang' || !!V.ket);

  // ---------- Phân tích nền: kết quả lưu theo số nước đã đi ----------
  function phanTich(n, ms) {
    if (V.pt[n]) return Promise.resolve(V.pt[n]);
    const khoa = V.id + ':' + n;
    if (KQ.has(khoa)) return KQ.get(khoa);
    const v = V, dau = v.ds.slice(0, n).join();
    const p = CO.goiMay('tim', { fen: v.fen, ds: v.ds.slice(0, n), o: { ms: ms || MS_PT } }).then(r => {
      const kq = { d: r.diem, m: r.nuoc ? L.nuocChu(r.nuoc) : '', l: (r.pv || []).slice(0, 8).map(L.nuocChu).join(' '), s: r.doSau };
      if (v.ds.slice(0, n).join() === dau) v.pt[n] = kq;   // đã đi lại trong lúc máy nghĩ thì bỏ kết quả cũ
      return kq;
    });
    KQ.set(khoa, p);
    return p;
  }
  const diemDo = (v, n) => (v.pt[n] ? (benLuc(v, n) === 0 ? v.pt[n].d : -v.pt[n].d) : null);

  // ---------- Dựng màn ----------
  function mo(v, phong) {
    V = v; phien++; xem = null; KQ.clear(); loiDs = []; dangXuLy = false; lucBat = 0; XL = null;
    P = phong || null;
    T = L.dungThe(V.fen, V.ds);
    const man = $('#man-co');
    man.innerHTML = `<div class="co-van">
      <header class="thanh-tren">
        <button class="nut-ve" data-lam="ve" aria-label="Về trang Cờ tướng">${icon('ve')}</button>
        <div class="tieu-de"><b id="v-ten"></b><span id="v-phu"></span></div>
        <div class="den-luot" id="v-luot" aria-live="polite"></div>
      </header>
      <div class="hang-ben" id="v-tren"></div>
      <div id="v-ban"></div>
      <div class="hang-ben" id="v-duoi"></div>
      <div class="can-can" id="v-can" role="img"><div class="vach"><i></i></div><p></p></div>
      <div class="loi-binh" id="v-loi" aria-live="polite"></div>
      <div class="xem-lai-bao" id="v-xem" hidden></div>
      <footer class="cong-cu" id="v-nut"></footer>
    </div>`;
    B = new CO.BanCo({
      lat: V.ben === 1,
      khiDi: nguoiDi,
      khiSai: ly => { if (ly) hienLoi(`<b class="nhan-sai">Không đi được.</b> ${esc(ly)}`, 'sai'); },
      choChon: () => !B.khoa && xem == null && !V.ket && (V.kieu === 'nguoi' || T.ben === V.ben) && !dangXuLy,
      khiChon: s => {
        // Quân khắc chữ Hán: chạm quân là nhắc tên và cách đi, người mới khỏi phải tra
        const p = T.ban[s], t = p & 7, ten = DL.TRA.find(x => x.ten === PT.TEN[t]);
        if (ten) hienGoiY(`${ten.han[p >> 3]} là ${ten.ten}. ${ten.di}`);
      },
    });
    $('#v-ban').appendChild(B.el);
    khop();
    B.nap(T);
    if (V.ds.length) B.datCuoi(L.chuNuoc(V.ds[V.ds.length - 1]));
    if (V.xoay && V.kieu === 'nguoi') B.datLat(T.ben === 1);
    veDau(); veNut(); veCan();
    CO.moMan();
    if (!V.ds.length && V.kieu === 'may' && V.ben === 0) hienLoi(`Bạn cầm Đỏ, đi trước. Chạm quân rồi chạm chỗ đến. ${V.tg ? 'Trợ giảng đang bật: máy sẽ nhận xét từng nước.' : ''}`);
    if (!V.ds.length && V.kieu === 'nguoi') hienLoi('Hai người thay phiên trên một máy. Đỏ đi trước.');
    if (V.ket) { dongVan(); return; }
    tiepLuot();
  }
  addEventListener('resize', () => { if (B && V && $('#v-ban')) khop(); });
  function khop() { CO.khopBan(B, V && V.kieu === 'xem' ? 330 : 262); }

  function veDau() {
    $('#v-ten').textContent = tenVan(V);
    const phu = V.kieu === 'may' ? `Bạn cầm ${BEN[V.ben]}`
      : V.kieu === 'mang' ? (V.ben == null ? `Đang xem phòng ${V.ma}` : `Phòng ${V.ma}, bạn cầm ${BEN[V.ben]}`)
        : V.kieu === 'xem' ? '' : 'Đỏ đi trước';
    $('#v-phu').textContent = phu;
    const hangChu = (ben, ten, luc) => {
      const mat = daMat(ben === 0 ? 1 : 0);
      return `<span class="ten-ben ben-${ben ? 'den' : 'do'}"><i class="dau-ben"></i>${esc(ten)}${luc ? `<em>${luc}</em>` : ''}</span><span class="da-an">${mat ? 'Đã ăn: ' + mat : ''}</span>`;
    };
    const tenBen = ben => {
      if (V.kieu === 'may') return ben === V.ben ? 'Bạn' : 'Máy';
      if (V.kieu === 'mang' && P && P.the) { const g = ben === 0 ? P.the.do : P.the.den; return g ? g.ten : 'Đang chờ người vào'; }
      return BEN[ben];
    };
    const duoi = B.lat ? 1 : 0, tren = 1 - duoi;
    $('#v-tren').innerHTML = hangChu(tren, tenBen(tren));
    $('#v-duoi').innerHTML = hangChu(duoi, tenBen(duoi));
    veLuot();
  }
  function daMat(ben) {
    const goc = new L.The(V.fen), a = PT.demQuan(goc, ben), T0 = xem == null ? T : L.dungThe(V.fen, V.ds.slice(0, xem)), b = PT.demQuan(T0, ben);
    const r = [];
    [L.XE, L.PH, L.MA, L.SI, L.TV, L.TO].forEach(t => { if (a[t] > b[t]) r.push(`${a[t] - b[t]} ${PT.TEN[t]}`); });
    return r.join(', ');
  }
  function veLuot(chu) {
    const el = $('#v-luot');
    if (!el) return;
    if (chu) { el.innerHTML = `<i class="dang-nghi"></i>${esc(chu)}`; return; }
    if (V.ket) { el.textContent = 'Đã xong'; return; }
    if (V.kieu === 'xem') { el.textContent = ''; return; }
    const luot = T.ben;
    el.innerHTML = `<i class="dau-ben ben-${luot ? 'den' : 'do'}"></i>${V.kieu === 'nguoi' || V.ben == null ? `Lượt ${BEN[luot]}` : luot === V.ben ? 'Tới lượt bạn' : V.kieu === 'mang' ? 'Chờ đối thủ' : 'Lượt máy'}`;
  }
  function veNut() {
    const nut = (lam, ic, ten, phu) => `<button class="cc" data-lam="${lam}"${phu || ''}>${icon(ic)}<span>${ten}</span></button>`;
    let h;
    if (V.kieu === 'may') h = nut('lui', 'lui', 'Đi lại') + nut('goi', 'goi', 'Gợi ý') + nut('ban', 'ban', 'Bản đồ') + nut('the', 'the', 'Thế cờ') + nut('bien', 'bien', 'Biên bản');
    else if (V.kieu === 'nguoi') h = nut('lui', 'lui', 'Đi lại') + nut('xoay', 'xoay', 'Xoay bàn') + nut('ban', 'ban', 'Bản đồ') + nut('the', 'the', 'Thế cờ') + nut('bien', 'bien', 'Biên bản');
    else if (V.kieu === 'mang') h = (V.ket ? nut('xemlai', 'the', 'Xem lại') + nut('moi', 'xoay', 'Ván mới') : nut('choc', 'choc', 'Chọc') + nut('hoa', 'hoa', 'Xin hòa') + nut('thua', 'co', 'Nhận thua')) + nut('ma', 'chia', 'Mã phòng') + nut('bien', 'bien', 'Biên bản');
    $('#v-nut').innerHTML = h;
  }
  function veCan() {
    const el = $('#v-can');
    if (!el) return;
    if (!coPhanTich()) { el.hidden = true; return; }
    const n = xem == null ? V.ds.length : xem;
    let d = diemDo(V, n), k = n;
    while (d == null && k > 0 && n - k < 3) { k--; d = diemDo(V, k); }
    el.hidden = false;
    const tl = PT.coHoi(d), chu = d == null ? 'Máy đang đọc thế cờ' : PT.diemRaChu(d);
    el.querySelector('i').style.width = (tl * 100).toFixed(1) + '%';
    el.querySelector('p').textContent = chu;
    el.setAttribute('aria-label', 'Cán cân: ' + chu);
  }

  // ---------- Lời bình ----------
  function hienLoi(html, kieu) {
    loiDs = [{ html, kieu }].concat(loiDs).slice(0, 3);
    const el = $('#v-loi');
    if (el) { el.innerHTML = loiDs.map((x, i) => `<p class="loi ${x.kieu || ''}${i ? ' cu' : ''}">${x.html}</p>`).join(''); el.scrollTop = 0; }
  }
  function hienGoiY(chu) {
    const el = $('#v-loi');
    if (!el) return;
    el.querySelectorAll('.goi-tam').forEach(x => x.remove());
    const p = document.createElement('p');
    p.className = 'loi goi-tam';
    p.textContent = chu;
    el.insertBefore(p, el.firstChild);
    el.scrollTop = 0;
  }
  const THE_CHAM = { hay: 'tot', duoc: 'duoc', lo: 'lo', sai: 'sai', nang: 'nang' };
  const nhanCham = c => `<span class="the-cham ${THE_CHAM[c.ma]}">${c.ten}</span>`;

  // ---------- Vòng ván cờ ----------
  function tiepLuot() {
    const p0 = phien;
    veLuot();
    B.khoa = false;
    luuVan();
    if (V.ket) return;
    const kt = L.ketThuc(T);
    if (kt) { ketThuc(kt); return; }
    if (V.xoay && V.kieu === 'nguoi') { B.datLat(T.ben === 1); veDau(); }
    if (V.kieu === 'may' && T.ben !== V.ben) { mayDi(p0); return; }
    if (V.kieu === 'mang') return;
    // Lượt người: đọc thế sẵn để gợi ý và chấm nước cho nhanh
    if (V.tg) phanTich(V.ds.length).then(() => { if (p0 === phien) veCan(); }).catch(() => {});
    canhBaoSauMay();
  }
  function canhBaoSauMay() {
    if (!V.tg || V.kieu !== 'may') return;
    const chieu = T.biChieu(T.ben);
    if (chieu) { hienLoi(`<b class="nhan-sai">Bạn đang bị chiếu!</b> Đi Tướng, chặn đường hoặc ăn quân đang chiếu.`, 'sai'); return; }
    const doa = PT.quanBiDoa(T, T.ben);
    if (doa.length) {
      const x = doa[0];
      hienLoi(`<b class="nhan-sai">Coi chừng:</b> ${PT.tenQuan(x.quan, x.o)} đang bị ${PT.tenQuan(T.ban[x.boi], x.boi)} dọa${x.trang ? ', không có ai bảo vệ' : ''}.`, 'canh');
    }
  }
  const trenCua = ben => (B.lat ? ben === 0 : ben === 1);   // bên này đang ngồi phía trên màn hình
  const moTaDuoc = (T0, m) => { const g = PT.ghi(T0, m), d = PT.moTaNuoc(T0, m); return { g, d }; };

  async function nguoiDi(m) {
    const p0 = phien, n = V.ds.length, cuaMinh = V.kieu === 'nguoi' || T.ben === V.ben;
    const { g, d } = moTaDuoc(T, m);
    const an = T.ban[m >> 8];
    T.diGhi(m);
    V.ds.push(L.nuocChu(m));
    B.khoa = true;
    B.loiChoc(loiKhieuKhich(an, d.chieu, d.bi), trenCua(1 - T.ben));
    await B.diHinh(m, { an, chieu: d.chieu, bi: d.bi, cuaMinh });
    if (p0 !== phien) return;
    veDau(); B.veMui(null);
    if (lopPhu) capNhatLop();
    hienLoi(`<b>${esc(g.ky)}</b> ${esc(d.chu)}.`);
    if (V.kieu === 'mang') {
      const kt = L.ketThuc(T);
      if (P) P.doi(s => { s.ds = V.ds.slice(); if (kt) s.ket = kt; });
      luuVan();
      if (kt) { ketThuc(kt); return; }
      veLuot();
      return;
    }
    // Nhận xét nước vừa đi; nước quá tệ thì hỏi lại trước khi máy đáp
    if (V.tg && !L.ketThuc(T)) {
      dangXuLy = true;
      veLuot('Máy đang đọc');
      let cham = null, truoc = null, sau = null;
      try {
        [truoc, sau] = await Promise.all([phanTich(n), phanTich(n + 1)]);
        cham = PT.chamNuoc(truoc.d, -sau.d, truoc.m === L.nuocChu(m));
      } catch (e) { /* bỏ qua chấm nước nếu máy lỗi */ }
      dangXuLy = false;
      if (p0 !== phien) return;
      veCan();
      if (cham) {
        V.c[n] = cham.ma;
        const chiTiet = giaiThich(n, m, truoc, sau, cham);
        loiDs.shift();
        hienLoi(`${nhanCham(cham)} <b>${esc(g.ky)}</b> ${esc(d.chu)}.${chiTiet ? ' ' + chiTiet : ''}`, cham.ma === 'nang' || cham.ma === 'sai' ? 'canh' : '');
        if (cham.ma === 'nang' && V.kieu === 'may') {
          const gt = await hoiLai(chiTiet);
          if (p0 !== phien) return;
          if (gt === 'lui') { luiNuoc(1); return; }
        }
      }
    }
    tiepLuot();
  }
  // Giải thích bằng lời vì sao nước này dở: đối phương đáp gì, nên đi gì
  function giaiThich(n, m, truoc, sau, cham) {
    if (cham.ma === 'hay' || cham.ma === 'duoc') return '';
    const T0 = L.dungThe(V.fen, V.ds.slice(0, n));
    const r = [];
    if (sau && sau.m) {
      const T1 = L.dungThe(V.fen, V.ds.slice(0, n + 1)), mr = L.chuNuoc(sau.m);
      if (T1.hopLe().includes(mr)) {
        const ten = BEN[T1.ben];
        if (sau.d > L.THANG) r.push(`${ten} có đường chiếu bí trong ${Math.max(1, Math.ceil((L.MATE - sau.d) / 2))} nước, bắt đầu từ ${esc(PT.ghi(T1, mr).ky)}.`);
        else r.push(`${ten} sẽ đáp ${esc(PT.ghi(T1, mr).ky)}: ${esc(dauThuong(PT.moTaNuoc(T1, mr).chu))}.`);
      }
    }
    if (truoc && truoc.m) {
      const mt = L.chuNuoc(truoc.m);
      if (T0.hopLe().includes(mt) && mt !== m) r.push(`Nên đi ${esc(PT.ghi(T0, mt).ky)}: ${esc(dauThuong(PT.moTaNuoc(T0, mt).chu))}.`);
    }
    return r.join(' ');
  }
  function hoiLai(chiTiet) {
    return CO.hoiTam({
      tieuDe: 'Khoan đã, nước này mất nhiều lắm',
      noiDung: chiTiet.replace(/<[^>]+>/g, ''),
      nut: [{ nhan: 'Đi lại nước này', kieu: 'chinh', gt: 'lui' }, { nhan: 'Cứ đi, xem sao', kieu: 'chu', gt: 'giu' }],
    });
  }
  function timSach() {
    const muc = L.MUC[V.muc - 1];
    if (!muc.sach || V.fen !== L.FEN_DAU || V.ds.length >= muc.sach) return null;
    const hop = [];
    for (const s of DL.SACH) {
      const ds = sachCache(s.chuoi);
      if (ds.length > V.ds.length && V.ds.every((t, i) => ds[i] === t)) hop.push(ds[V.ds.length]);
    }
    return hop.length ? hop[(Math.random() * hop.length) | 0] : null;
  }
  const dsSach = new Map();
  const sachCache = c => { if (!dsSach.has(c)) dsSach.set(c, PT.chuoiNuoc(L.FEN_DAU, c)); return dsSach.get(c); };
  // Tên khai cuộc theo các nước đã đi
  function tenKhai(ds) {
    if (!ds.length) return '';
    let ten = '', dai = 0;
    for (const s of DL.SACH) {
      const d = sachCache(s.chuoi);
      let k = 0;
      while (k < d.length && k < ds.length && d[k] === ds[k]) k++;
      if (k >= 2 && k > dai) { dai = k; ten = s.ten; }
    }
    return ten;
  }

  async function mayDi(p0) {
    const muc = L.MUC[V.muc - 1];
    B.khoa = true;
    veLuot('Máy đang nghĩ');
    const t0 = Date.now();
    let m = 0;
    const sach = timSach();
    if (sach) { m = L.chuNuoc(sach); await doi(350); }
    else {
      try {
        const r = await CO.goiMay('tim', { fen: V.fen, ds: V.ds, o: muc.o });
        m = r.nuoc;
      } catch (e) {
        hienLoi('Máy cờ gặp lỗi, đã chuyển sang chạy dự phòng.');
        const ds = T.hopLe();
        m = ds[(Math.random() * ds.length) | 0];
      }
    }
    if (p0 !== phien) return;
    const cho = 520 - (Date.now() - t0);
    if (cho > 0) await doi(cho);
    if (p0 !== phien) return;
    if (!m) { tiepLuot(); return; }
    const { g, d } = moTaDuoc(T, m);
    const an = T.ban[m >> 8];
    T.diGhi(m);
    V.ds.push(L.nuocChu(m));
    B.loiChoc(loiKhieuKhich(an, d.chieu, d.bi), trenCua(1 - T.ben));
    await B.diHinh(m, { an, chieu: d.chieu, bi: d.bi, cuaMinh: false });
    if (p0 !== phien) return;
    veDau(); B.veMui(null);
    if (lopPhu) capNhatLop();
    hienLoi(`Máy đi <b>${esc(g.ky)}</b>: ${esc(dauThuong(d.chu))}.`);
    tiepLuot();
  }

  function luiNuoc(so) {
    phien++;
    KQ.clear();
    B.boChon();
    for (let i = 0; i < so && V.ds.length; i++) { const n = V.ds.length - 1; V.ds.pop(); delete V.c[n]; delete V.pt[n + 1]; }
    T = L.dungThe(V.fen, V.ds);
    B.T = T;
    B.nap(T);
    B.khoa = false; B.xoaPhu();
    B.cuoi = V.ds.length ? L.chuNuoc(V.ds[V.ds.length - 1]) : 0;
    B.veDau();
    dangXuLy = false;
    if (lucBat === 1) B.veLuc(T);
    loiDs = [];
    $('#v-loi').innerHTML = '';
    veDau(); veCan();
    tiepLuot();
  }
  function diLai() {
    if (!V.ds.length) { hienLoi('Chưa có nước nào để đi lại.'); return; }
    if (V.kieu === 'nguoi') { luiNuoc(1); return; }
    // Đấu máy: lùi tới lượt mình
    const so = T.ben === V.ben ? Math.min(2, V.ds.length) : 1;
    luiNuoc(so);
    if (V.ds.length === 0 && T.ben !== V.ben) tiepLuot();
  }

  // ---------- Kết thúc ----------
  const TEN_KET = { bi: 'Chiếu bí', het: 'Hết nước đi', truong: 'Trường chiếu, bên chiếu liên tục bị xử thua', lap: 'Thế cờ lặp lại 3 lần', 'sau-muoi': '60 nước liền không ăn quân', thieu: 'Hai bên đều hết quân đánh', nhan: 'Có người nhận thua', hoa: 'Hai bên đồng ý hòa' };
  function ketThuc(kt) {
    if (V.ket) return;
    V.ket = kt;
    if (V.kieu === 'may') {
      const tk = kho().doc('co.tk', {}), m = tk[V.muc] || { t: 0, h: 0, b: 0 };
      if (kt.thang == null) m.h++; else if (kt.thang === V.ben) m.t++; else m.b++;
      tk[V.muc] = m;
      kho().ghi('co.tk', tk);
    }
    luuVanDaXong();
    luuVan();
    if (P && V.kieu === 'mang' && !(P.the && P.the.ket)) P.doi(s => { s.ket = kt; s.ds = V.ds.slice(); });
    dongVan(true);
  }
  function luuVanDaXong() {
    const ds = kho().doc('co.ls', []);
    if (ds.some(x => x.id === V.id)) return;
    const gon = { id: V.id, kieu: V.kieu, muc: V.muc, ben: V.ben, fen: V.fen, ds: V.ds, ket: V.ket, bat: V.bat, c: V.c, ma: V.ma, pt: {} };
    Object.keys(V.pt).forEach(k => { const x = V.pt[k]; gon.pt[k] = { d: x.d, m: x.m }; });
    ds.unshift(gon);
    kho().ghi('co.ls', ds.slice(0, 30));
  }
  function dongVan(hieuUng) {
    B.khoa = true;
    veDau(); veNut(); veCan();
    if (hieuUng) setTimeout(() => hopKet(true), 900);
    else hienLoi(`Ván đã xong: ${TEN_KET[V.ket.kieu] || ''}.`);
  }
  function hopKet(hu) {
    if (!V || !V.ket) return;
    const kt = V.ket, minh = V.ben;
    let tieuDe, kieu;
    if (kt.thang == null) { tieuDe = 'Hòa cờ'; kieu = 'hoa'; }
    else if (V.kieu === 'nguoi' || minh == null) { tieuDe = `${BEN[kt.thang]} thắng`; kieu = 'thang'; }
    else if (kt.thang === minh) { tieuDe = 'Bạn thắng!'; kieu = 'thang'; }
    else { tieuDe = V.kieu === 'may' ? 'Máy thắng rồi' : 'Đối thủ thắng'; kieu = 'thua'; }
    const so = Math.ceil(V.ds.length / 2);
    const OT = CO.OT;
    if (hu && !OT.giamDong.matches) {
      if (kieu === 'thang') { OT.rung('manh'); OT.phat('ken'); const r = B.el.getBoundingClientRect(); OT.phaoSao(r.left + r.width / 2, r.top + r.height / 2, 120, 1.5); OT.vongBia(r.left + r.width / 2, r.top + r.height / 2); }
      else if (kieu === 'hoa') OT.phat('khen');
      else { OT.rung('sai'); OT.phat('sai'); }
    }
    const nutMoi = V.kieu === 'mang' ? (minh != null ? { nhan: 'Đấu ván mới, đổi màu', kieu: 'phu', gt: 'moi' } : null) : { nhan: 'Ván mới', kieu: 'phu', gt: 'moi' };
    CO.hoiTam({
      tieuDe, noiDung: `${TEN_KET[kt.kieu] || ''}. Ván dài ${so} nước.${kieu === 'thua' && V.kieu === 'may' ? ' Xem lại để thấy mình sai ở nước nào.' : ''}`,
      nut: [{ nhan: 'Xem lại và phân tích ván này', kieu: 'chinh', gt: 'xem' }, nutMoi, { nhan: 'Về trang Cờ tướng', kieu: 'chu', gt: 've' }].filter(Boolean),
    }).then(gt => {
      if (gt === 'xem') CO.xemLai(ganVanLai());
      else if (gt === 'moi') vanMoi();
      else if (gt === 've') thoat();
    });
  }
  const ganVanLai = () => Object.assign({}, V);
  function vanMoi() {
    if (V.kieu === 'mang') { yeuCauVanMoi(); return; }
    if (V.kieu === 'may') { CO.hopVanMoi(V.muc); return; }
    mo(taoVan({ kieu: 'nguoi', xoay: V.xoay, tg: V.tg }));
  }
  function thoat() {
    phien++;
    if (P) { P.dung(); P = null; }
    if (V && V.kieu === 'mang' && V.ket) CO.xoaPhong();
    B = null; V = null;
    CO.veMan();
  }

  // ---------- Công cụ: gợi ý, bản đồ, thế cờ, biên bản ----------
  function nutBanDo() {
    lucBat = (lucBat + 1) % 3;
    const Tx = theDangXem();
    B.veLuc(null); B.veMui(null);
    if (lucBat === 1) {
      B.veLuc(Tx);
      const m = PT.banDoLuc(Tx);
      hienGoiY(`Bản đồ lực: chấm đỏ là vùng Đỏ canh mạnh hơn (${m.oDo} ô), chấm xanh là vùng Đen (${m.oDen} ô), vòng rỗng là ô giằng co. Bấm tiếp để xem đe dọa.`);
    } else if (lucBat === 2) {
      const a = muiDoa(Tx);
      B.veMui(a);
      hienGoiY(a.length ? 'Mũi tên là các đòn ăn có lời: ai đang dọa ăn ai. Bấm tiếp để tắt.' : 'Không bên nào đang có đòn ăn lời ngay. Bấm tiếp để tắt.');
    } else hienGoiY('Đã tắt lớp phủ trên bàn.');
    const nut = $('#v-nut [data-lam="ban"]');
    if (nut) nut.setAttribute('aria-pressed', lucBat ? 'true' : 'false');
  }
  const theDangXem = () => (xem == null ? T : L.dungThe(V.fen, V.ds.slice(0, xem)));
  // Mũi tên các đòn ăn có lời của cả hai bên; màu theo bên đang dọa
  const muiDoa = Tx => {
    const a = [];
    [0, 1].forEach(b => PT.quanBiDoa(Tx, b).forEach(x => a.push({ tu: x.boi, den: x.o, mau: b === 0 ? 'doa-den' : 'doa-do' })));
    return a;
  };
  // Khi mở Thế cờ: vẽ lên bàn đúng những việc gấp đang liệt kê, để nhìn bàn là thấy
  function muiTheCo() {
    const Tx = theDangXem(), n = xem == null ? V.ds.length : xem, pt = coPhanTich() ? V.pt[n] : null;
    const tq = PT.tongQuan(Tx, pt ? { diem: pt.d } : null), a = [];
    tq.gap.forEach(g => (g.mui || []).forEach(m => {
      const tu = m & 255, benDanh = Tx.ban[tu] >> 3;
      a.push({ tu, den: m >> 8, mau: g.kieu === 'xanh' ? 'goi' : benDanh === 0 ? 'doa-do' : 'doa-den' });
    }));
    B.veMui(a);
  }
  const traLaiMui = () => { B.veMui(lucBat === 2 ? muiDoa(theDangXem()) : null); };

  async function goiY() {
    const p0 = phien;
    if (V.ket) return;
    if (V.kieu === 'may' && T.ben !== V.ben) { hienGoiY('Máy đang nghĩ, chờ tới lượt bạn nhé.'); return; }
    hienGoiY('Máy đang tìm nước hay...');
    const pt = await phanTich(V.ds.length, 700);
    if (p0 !== phien || !pt.m) return;
    const m = L.chuNuoc(pt.m), g = PT.ghi(T, m), d = PT.moTaNuoc(T, m);
    B.veMui([{ tu: m & 255, den: m >> 8, mau: 'goi' }]);
    hienGoiY(`Gợi ý: ${g.ky} (${g.chu}). ${d.chu}.`);
    CO.OT.rung('nhe');
  }

  // Lớp trượt dưới bàn: 1 thế cờ, 2 biên bản
  function moLop(loai) {
    lopPhu = loai;
    veLop();
    if (loai === 1) muiTheCo();
    CO.moNgan(veLopHtml(), { caoTheoBan: B.el, khiDong: () => { lopPhu = 0; if (B) traLaiMui(); }, khiBam: bamLop });
  }
  function capNhatLop() { if (lopPhu) CO.capNhatNgan(veLopHtml()); }
  function veLop() { if (lopPhu === 1) docTheCo(); }
  const veLopHtml = () => (lopPhu === 1 ? htmlThe() : htmlBien());
  function docTheCo() {
    if (!coPhanTich()) return;
    const n = xem == null ? V.ds.length : xem;
    const v = V;
    phanTich(n, 500).then(() => { if (v === V && lopPhu === 1) { CO.capNhatNgan(htmlThe()); muiTheCo(); veCan(); } }).catch(() => {});
  }
  function htmlThe() {
    const n = xem == null ? V.ds.length : xem, Tx = theDangXem(), co = coPhanTich();
    const pt = co ? V.pt[n] : null;
    const tq = PT.tongQuan(Tx, pt ? { diem: pt.d } : null);
    const khai = n <= 20 ? tenKhai(V.ds.slice(0, n)) : '';
    const thanh = (t, i) => {
      const tong = Math.max(1, t.do + t.den), a = t.do / tong * 100;
      return `<li class="tru"><div class="tru-dau"><b>${t.ten}</b><span>${t.hien(t.do)} và ${t.hien(t.den)}</span></div>
        <div class="buom" role="img" aria-label="${t.ten}: Đỏ ${t.hien(t.do)}, Đen ${t.hien(t.den)}"><i class="b-do" style="width:${a.toFixed(1)}%"></i><i class="b-den" style="width:${(100 - a).toFixed(1)}%"></i></div>
        <p>${esc(t.chu)}</p></li>`;
    };
    const gap = tq.gap.map(g => `<li class="${g.kieu}">${g.kieu === 'do' ? '<b>Nguy:</b> ' : '<b>Cơ hội:</b> '}${esc(g.chu)}</li>`).join('');
    const cach = co && pt && pt.m ? (() => {
      const m = L.chuNuoc(pt.m);
      if (!Tx.hopLe().includes(m)) return '';
      const g = PT.ghi(Tx, m), d = PT.moTaNuoc(Tx, m);
      // Đọc đường máy tính ra ký hiệu
      const U = L.dungThe(V.fen, V.ds.slice(0, n));
      const duong = (pt.l || '').split(' ').filter(Boolean).slice(0, 6).map(t => { const q = L.chuNuoc(t); if (!U.hopLe().includes(q)) return null; const k = PT.ghi(U, q).ky; U.diGhi(q); return k; }).filter(Boolean);
      return `<h3>Máy sẽ đi</h3><p class="nuoc-may"><b>${esc(g.ky)}</b> ${esc(g.chu)}. ${esc(d.chu)}.</p>${duong.length > 1 ? `<p class="duong">Đường tính trước: ${duong.join(', ')}</p>` : ''}`;
    })() : '';
    // Thứ tự đọc: kết luận, việc gấp, bốn trụ (vì sao), kế hoạch, nước máy sẽ đi
    return `<div class="ngan-dau"><h2>Thế cờ${xem != null ? ` sau nước ${Math.ceil(xem / 2)}` : ''}</h2><span>${tq.tenGd}, lượt ${BEN[tq.ben]}</span></div>
      ${co ? `<p class="ket-can"><b>${esc(tq.chuDiem || 'Máy đang đọc thế cờ')}</b></p>` : '<p class="ket-can">Đang đấu với người nên máy không chấm điểm. Xem lại sau ván sẽ có đủ.</p>'}
      ${khai ? `<p class="khai">Khai cuộc: ${esc(khai)}</p>` : ''}
      <p class="meo-gd">${esc(tq.meoGd)}</p>
      ${gap ? `<h3>Việc cần chú ý</h3><ul class="ds-gap">${gap}</ul>` : ''}
      <h3>Bốn trụ của thế cờ</h3>
      <div class="chu-giai"><span class="ben-do"><i class="dau-ben"></i>Đỏ</span><span class="ben-den"><i class="dau-ben"></i>Đen</span></div>
      <ul class="ds-tru">${tq.tru.map(thanh).join('')}</ul>
      <h3>Kế hoạch cho ${BEN[tq.ben]}</h3><ul class="ds-ke">${tq.keHoach.map(k => `<li>${esc(k)}</li>`).join('')}</ul>
      ${cach}`;
  }
  function htmlBien() {
    const U = new L.The(V.fen);
    const hang = [];
    const benA = U.ben;
    let so = 1;
    const o = [];
    V.ds.forEach((t, i) => {
      const m = L.chuNuoc(t), g = PT.ghi(U, m);
      const c = V.c[i];
      o.push(`<button class="o-nuoc${xem === i + 1 ? ' dang' : ''}${c ? ' c-' + c : ''}" data-xem="${i + 1}" aria-label="${g.chu}">${esc(g.ky)}${c === 'sai' || c === 'nang' ? `<small>${c === 'nang' ? 'nặng' : 'sai'}</small>` : ''}</button>`);
      U.diGhi(m);
    });
    if (benA === 1) o.unshift('<span class="o-trong"></span>');
    for (let i = 0; i < o.length; i += 2) hang.push(`<li><span class="so">${so++}</span>${o[i]}${o[i + 1] || ''}</li>`);
    const chu = bienBanChu();
    return `<div class="ngan-dau"><h2>Biên bản</h2><span>${V.ds.length ? `${Math.ceil(V.ds.length / 2)} nước` : 'Chưa đi nước nào'}</span></div>
      <p class="chu-thich-ngan">Chạm một nước để xem lại thế cờ lúc đó. Ký hiệu: tên quân, cột, hướng (dấu chấm là tiến, gạch chéo là lùi, gạch ngang là đi ngang), số.</p>
      <ol class="ds-nuoc">${hang.join('') || '<li class="trong">Đi nước đầu tiên, biên bản sẽ tự ghi ở đây.</li>'}</ol>
      ${V.ds.length ? `<div class="nut-ngan"><button class="nut-phu" data-lam-ngan="chep" data-chu="${esc(chu)}">Sao chép biên bản</button>${V.ket || V.kieu !== 'mang' ? '<button class="nut-phu" data-lam-ngan="xemlai">Xem lại và phân tích</button>' : ''}</div>` : ''}`;
  }
  function bienBanChu() {
    const U = new L.The(V.fen), r = [];
    let so = 1, dong = '';
    V.ds.forEach((t, i) => {
      const m = L.chuNuoc(t), k = PT.ghi(U, m).ky;
      if (i % 2 === 0) dong = `${so++}. ${k}`;
      else { r.push(`${dong}  ${k}`); dong = ''; }
      U.diGhi(m);
    });
    if (dong) r.push(dong);
    const dau = `Cờ tướng, ${tenVan(V)}, ${new Date(V.bat).toLocaleDateString('vi-VN')}`;
    const kq = V.ket ? `\nKết quả: ${V.ket.thang == null ? 'Hòa' : BEN[V.ket.thang] + ' thắng'}` : '';
    return `${dau}\n${r.join('\n')}${kq}`;
  }
  function bamLop(e) {
    const x = e.target.closest('[data-xem]');
    if (x) { xemNuoc(+x.dataset.xem); capNhatLop(); return; }
    const b = e.target.closest('[data-lam-ngan]');
    if (!b) return;
    if (b.dataset.lamNgan === 'chep') { CO.saoChep(b.dataset.chu); b.textContent = 'Đã sao chép'; }
    else if (b.dataset.lamNgan === 'xemlai') { CO.dongNgan(); CO.xemLai(ganVanLai()); }
  }
  // Xem lại một thế trong ván đang đánh
  function xemNuoc(n) {
    xem = n >= V.ds.length ? null : n;
    const Tx = theDangXem();
    B.T = Tx;
    B.nap(Tx);
    B.cuoi = n > 0 ? L.chuNuoc(V.ds[n - 1]) : 0;
    B.veDau();
    if (xem == null) { B.T = T; B.hopLe = null; }
    B.veMui(null);
    if (lucBat === 1) B.veLuc(Tx); else B.veLuc(null);
    const bao = $('#v-xem');
    bao.hidden = xem == null;
    if (xem != null) bao.innerHTML = `Đang xem sau nước ${Math.ceil(xem / 2)}. <button class="nut-chu-nho" data-lam="hientai">Về thế hiện tại</button>`;
    veDau(); veCan();
  }

  // ---------- Đấu qua mạng ----------
  const idToi = () => {
    let id = kho().doc('co.id', null);
    if (!id) { id = Math.random().toString(36).slice(2, 12) + Date.now().toString(36); kho().ghi('co.id', id); }
    return id;
  };
  function kiemThePhong(s) {
    try {
      const U = new L.The(s.fen || L.FEN_DAU);
      for (const t of s.ds) { const m = L.chuNuoc(t); if (!U.hopLe().includes(m)) return false; U.diGhi(m); U.sChieu[U.n - 1] = U.biChieu(U.ben) ? 1 : 0; }
      return true;
    } catch (e) { return false; }
  }
  function dungPhong({ ma, ten, the }) {
    const toi = { id: idToi(), ten: ten || 'Bạn' };
    const v = taoVan({ kieu: 'mang', tg: false, fen: the ? the.fen : L.FEN_DAU, ds: the ? the.ds.slice() : [] });
    v.ma = ma; v.tenToi = toi.ten;
    const phong = new CO.Phong({
      ma, toi, the,
      kiemHopLe: kiemThePhong,
      khiDoi: s => doiTrangThaiPhong(s),
      khiKetNoi: so => hienKetNoi(so),
      khiDoiThu: on => { if (V && V.kieu === 'mang') { doiOn = on; hienKetNoi(P ? P.soMo() : 0); } },
      khiChoc: chu => {
        if (!B) return;
        B.loiChoc(chu, true);
        CO.OT.rung('chon');
        CO.OT.phat('cham');
        hienLoi(`Đối thủ chọc: ${esc(chu)}`);
      },
    });
    return { v, phong, toi };
  }
  let doiOn = false;
  function hienKetNoi(so) {
    const el = $('#v-phu');
    if (!el || !V || V.kieu !== 'mang') return;
    const tinh = !so ? 'Đang nối mạng lại...' : doiOn ? 'Đối thủ đang online' : 'Đối thủ chưa online, nước đi vẫn được giữ';
    el.textContent = `Phòng ${V.ma}: ${tinh}`;
  }
  function doiTrangThaiPhong(s) {
    if (!V || V.kieu !== 'mang' || !P) return;
    const toiId = P.o.toi.id;
    const benMoi = s.do && s.do.id === toiId ? 0 : s.den && s.den.id === toiId ? 1 : null;
    // Ván mới: nạp lại từ đầu
    if (s.van !== V.van && V.van != null) {
      V = Object.assign(taoVan({ kieu: 'mang', tg: false, fen: s.fen }), { ma: V.ma, tenToi: V.tenToi, van: s.van, ben: benMoi });
      mo(V, P);
      hienLoi('Ván mới bắt đầu. Hai bên đã đổi màu.');
      return;
    }
    V.van = s.van;
    if (V.ben !== benMoi) { V.ben = benMoi; B.datLat(benMoi === 1); }
    // Có nước mới của đối thủ
    const moi = s.ds.length - V.ds.length;
    const giong = V.ds.every((t, i) => s.ds[i] === t);
    if (moi === 1 && giong) {
      const m = L.chuNuoc(s.ds[s.ds.length - 1]), g = PT.ghi(T, m), d = PT.moTaNuoc(T, m), an = T.ban[m >> 8];
      T.diGhi(m);
      V.ds.push(s.ds[s.ds.length - 1]);
      if (xem != null) xemNuoc(V.ds.length);
      B.loiChoc(loiKhieuKhich(an, d.chieu, d.bi), trenCua(1 - T.ben));
      B.diHinh(m, { an, chieu: d.chieu, bi: d.bi, cuaMinh: false }).then(() => { if (V) { veDau(); } });
      hienLoi(`Đối thủ đi <b>${esc(g.ky)}</b>: ${esc(dauThuong(d.chu))}.`);
      CO.OT.rung('chon');
    } else if (moi !== 0 || !giong) {
      V.ds = s.ds.slice();
      T = L.dungThe(V.fen, V.ds);
      if (xem == null) { B.nap(T); B.cuoi = V.ds.length ? L.chuNuoc(V.ds[V.ds.length - 1]) : 0; B.veDau(); }
    }
    B.khoa = false;
    veDau(); veNut();
    if (s.den && s.do && lopCho) { lopCho = false; CO.dongTam(); hienLoi('Đối thủ đã vào phòng. Đỏ đi trước.'); }
    luuVan();
    // Yêu cầu từ đối thủ
    if (s.yc && s.yc.tu !== toiId && !V.ket && !hoiDangMo) {
      hoiDangMo = true;
      CO.hoiTam({ tieuDe: 'Đối thủ xin hòa', noiDung: 'Đồng ý thì ván kết thúc hòa ngay.', nut: [{ nhan: 'Đồng ý hòa', kieu: 'chinh', gt: 1 }, { nhan: 'Đánh tiếp', kieu: 'phu', gt: 0 }] })
        .then(gt => {
          hoiDangMo = false;
          if (!P || !V) return;
          P.doi(x => { x.yc = null; if (gt) x.ket = { thang: null, kieu: 'hoa' }; });
        });
    }
    // Kết quả
    if (s.ket && !V.ket) { V.ket = s.ket; luuVanDaXong(); luuVan(); dongVan(true); }
    if (!s.ket && !V.ket && L.ketThuc(T) && moi === 1) ketThuc(L.ketThuc(T));
  }
  let lopCho = false, hoiDangMo = false;
  function taoPhong({ ben, ten }) {
    const ma = CO.taoMaPhong(), toi = { id: idToi(), ten: ten || 'Bạn' };
    const benThat = ben === 2 ? (Math.random() < 0.5 ? 0 : 1) : ben;
    const the = { v: 1, ds: [], fen: L.FEN_DAU, van: 1, do: benThat === 0 ? toi : null, den: benThat === 1 ? toi : null, ket: null, yc: null };
    const { v, phong } = dungPhong({ ma, ten, the });
    v.ben = benThat; v.van = 1;
    mo(v, phong);
    luuVan();
    hienChoPhong(ma);
  }
  function hienChoPhong(ma) {
    lopCho = true;
    CO.moTam(`<h2>Gửi mã này cho bạn</h2>
      <p class="ma-phong" aria-label="Mã phòng">${ma.split('').join(' ')}</p>
      <p>Người kia mở Cờ tướng, chọn Đấu qua mạng, Vào phòng, rồi nhập mã. Bàn cờ sẽ tự mở khi họ vào.</p>
      <button class="nut-chinh" data-lam-tam="chep">Sao chép mã</button>
      <button class="nut-chu" data-lam-tam="dong">Để sau, cứ xem bàn cờ</button>`, {
      khiBam: (e, dong) => {
        const l = e.target.dataset.lamTam;
        if (l === 'chep') { CO.saoChep(ma); e.target.textContent = 'Đã sao chép'; }
        if (l === 'dong') { lopCho = false; dong(); }
      },
    });
  }
  function vaoPhong({ ma, ten }) {
    return new Promise((ok, no) => {
      const toi = { id: idToi(), ten: ten || 'Bạn' };
      let xong = false;
      const phong = new CO.Phong({
        ma, toi, kiemHopLe: kiemThePhong,
        khiDoi: s => {
          if (xong) return;
          xong = true;
          clearTimeout(hen);
          // Ngồi vào ghế trống
          const v = Object.assign(taoVan({ kieu: 'mang', tg: false, fen: s.fen, ds: s.ds.slice() }), { ma, tenToi: toi.ten, van: s.van });
          const daNgoi = (s.do && s.do.id === toi.id) ? 0 : (s.den && s.den.id === toi.id) ? 1 : null;
          v.ben = daNgoi != null ? daNgoi : !s.do ? 0 : !s.den ? 1 : null;
          phong.o.khiDoi = x => doiTrangThaiPhong(x);
          phong.o.khiKetNoi = so => hienKetNoi(so);
          phong.o.khiDoiThu = on => { doiOn = on; hienKetNoi(phong.soMo()); };
          phong.o.khiChoc = chu => { if (B) { B.loiChoc(chu, true); CO.OT.rung('chon'); CO.OT.phat('cham'); hienLoi(`Đối thủ chọc: ${esc(chu)}`); } };
          mo(v, phong);
          if (daNgoi == null && v.ben != null) {
            phong.doi(x => { if (v.ben === 0) x.do = toi; else x.den = toi; });
            hienLoi(`Đã vào phòng. Bạn cầm ${BEN[v.ben]}${v.ben === 0 ? ', đi trước' : ''}.`);
          } else if (v.ben == null) hienLoi('Phòng đã đủ 2 người. Bạn đang xem ván này.');
          if (s.ket) { V.ket = s.ket; dongVan(false); }
          luuVan();
          ok();
        },
      });
      const hen = setTimeout(() => {
        if (xong) return;
        xong = true;
        phong.dung();
        no(new Error(phong.soMo() ? 'Không thấy phòng này. Kiểm tra lại mã.' : 'Chưa nối được mạng. Kiểm tra kết nối rồi thử lại.'));
      }, 9000);
    });
  }
  function moLaiPhong() {
    const luu = kho().doc('co.phong', null);
    if (!luu || !luu.the) return false;
    const { v, phong, toi } = dungPhong(luu);
    v.van = luu.the.van;
    v.ben = luu.the.do && luu.the.do.id === toi.id ? 0 : luu.the.den && luu.the.den.id === toi.id ? 1 : null;
    mo(v, phong);
    if (luu.the.ket) { V.ket = luu.the.ket; dongVan(false); }
    return true;
  }
  function yeuCauVanMoi() {
    if (!P) return;
    P.doi(s => {
      const a = s.do, b = s.den;
      s.do = b; s.den = a; s.ds = []; s.ket = null; s.yc = null; s.van = (s.van || 1) + 1;
    });
  }
  function hopChoc() {
    CO.moTam(`<h2>Chọc đối thủ</h2><div class="ds-choc">${CHOC_NHANH.map((c, i) => `<button class="nut-phu" data-i="${i}">${esc(c)}</button>`).join('')}</div><button class="nut-chu" data-lam-tam="dong">Thôi</button>`, {
      khiBam: (e, dong) => {
        const b = e.target.closest('[data-i]');
        if (e.target.dataset.lamTam === 'dong') { dong(); return; }
        if (!b) return;
        const c = CHOC_NHANH[+b.dataset.i];
        if (P) P.choc(c);
        hienLoi(`Bạn chọc: ${esc(c)}`);
        dong();
      },
    });
  }

  // ---------- Bấm nút trong màn ván cờ ----------
  document.addEventListener('click', e => {
    const man = $('#man-co');
    if (!man || !man.contains(e.target) || !V) return;
    const b = e.target.closest('[data-lam]');
    if (!b) return;
    const lam = b.dataset.lam;
    CO.OT.rung('nhe');
    if (lam === 've') thoat();
    else if (lam === 'lui') diLai();
    else if (lam === 'goi') goiY();
    else if (lam === 'ban') nutBanDo();
    else if (lam === 'the') moLop(1);
    else if (lam === 'bien') moLop(2);
    else if (lam === 'xoay') { V.xoay = !V.xoay; B.datLat(V.xoay ? T.ben === 1 : !B.lat); veDau(); hienGoiY(V.xoay ? 'Bàn sẽ tự xoay theo lượt đi.' : 'Đã xoay bàn. Bàn giữ nguyên hướng này.'); }
    else if (lam === 'hientai') xemNuoc(V.ds.length);
    else if (lam === 'choc') hopChoc();
    else if (lam === 'hoa') {
      if (P && !V.ket) { P.doi(s => { s.yc = { kieu: 'hoa', tu: P.o.toi.id }; }); hienLoi('Đã gửi lời xin hòa, chờ đối thủ trả lời.'); }
    } else if (lam === 'thua') {
      CO.hoiTam({ tieuDe: 'Nhận thua ván này?', noiDung: 'Đối thủ sẽ được tính thắng.', nut: [{ nhan: 'Nhận thua', kieu: 'chinh', gt: 1 }, { nhan: 'Đánh tiếp', kieu: 'chu', gt: 0 }] })
        .then(gt => { if (gt && V && V.ben != null) ketThuc({ thang: 1 - V.ben, kieu: 'nhan' }); });
    } else if (lam === 'ma') { hienChoPhong(V.ma); }
    else if (lam === 'xemlai') CO.xemLai(ganVanLai());
    else if (lam === 'moi') vanMoi();
  });

  // ---------- Xem lại cả ván: đồ thị cán cân, từng nước, sai lầm ----------
  function xemLai(v0) {
    phien++;
    const v = Object.assign({}, v0, { kieu: v0.kieu, pt: Object.assign({}, v0.pt), c: Object.assign({}, v0.c) });
    V = v; lopPhu = 0; xem = 0; P = null;
    XL = { i: v.ds.length, token: phien, xong: false };
    T = L.dungThe(v.fen, v.ds);
    KQ.clear();
    const man = $('#man-co');
    man.innerHTML = `<div class="co-van xem-lai">
      <header class="thanh-tren">
        <button class="nut-ve" data-xl="ve" aria-label="Về trang Cờ tướng">${icon('ve')}</button>
        <div class="tieu-de"><b>Xem lại ván</b><span>${esc(tenVan(v))}</span></div>
        <div class="den-luot" id="xl-tien"></div>
      </header>
      <div id="v-ban"></div>
      <div class="do-thi" id="xl-do"></div>
      <div class="loi-binh" id="v-loi" aria-live="polite"></div>
      <footer class="cong-cu nho" id="v-nut">
        <button class="cc" data-xl="dau" aria-label="Về đầu ván">${icon('dau')}</button>
        <button class="cc" data-xl="truoc" aria-label="Nước trước">${icon('truoc')}</button>
        <button class="cc" data-xl="sau" aria-label="Nước sau">${icon('sau')}</button>
        <button class="cc" data-xl="cuoi" aria-label="Về cuối ván">${icon('cuoi')}</button>
        <button class="cc rong" data-xl="thu">${icon('lui')}<span>Thử lại từ đây</span></button>
        <button class="cc" data-xl="ban">${icon('ban')}<span>Bản đồ</span></button>
      </footer>
    </div>`;
    B = new CO.BanCo({ lat: v.ben === 1, khiDi: () => {}, choChon: () => false });
    B.khoa = true;
    $('#v-ban').appendChild(B.el);
    CO.khopBan(B, 356);
    CO.moMan();
    chonXL(v.ds.length);
    chayPhanTichXL(XL.token);
    man.querySelector('#xl-do').addEventListener('pointerdown', chamDoThi);
    man.querySelector('#xl-do').addEventListener('pointermove', e => { if (e.buttons || e.pointerType === 'touch') chamDoThi(e); });
  }
  CO.xemLai = xemLai;
  function chamDoThi(e) {
    const svg = $('#xl-do svg');
    if (!svg || !V) return;
    const r = svg.getBoundingClientRect(), n = V.ds.length;
    const i = Math.round((e.clientX - r.left) / r.width * n);
    chonXL(Math.max(0, Math.min(n, i)));
  }
  async function chayPhanTichXL(tok) {
    const v = V, n = v.ds.length;
    for (let i = n; i >= 0; i--) {
      if (!XL || tok !== XL.token || V !== v) return;
      if (v.pt[i]) continue;
      const tb = $('#xl-tien');
      if (tb) tb.innerHTML = `<i class="dang-nghi"></i>Phân tích ${n - i + 1}/${n + 1}`;
      try { await phanTich(i, 220); } catch (e) { return; }
      if (XL && tok === XL.token && V === v) { veDoThi(); if (XL.i === i || XL.i === i + 1) veLoiXL(); }
    }
    if (!XL || tok !== XL.token || V !== v) return;
    // Chấm tất cả các nước
    chamCaVan(v);
    XL.xong = true;
    const tb = $('#xl-tien');
    if (tb) tb.textContent = '';
    veDoThi(); veLoiXL();
    // Lưu kết quả phân tích để lần sau khỏi tính lại
    const ls = kho().doc('co.ls', []), k = ls.find(x => x.id === v.id);
    if (k) { k.c = v.c; k.pt = {}; Object.keys(v.pt).forEach(j => { k.pt[j] = { d: v.pt[j].d, m: v.pt[j].m }; }); kho().ghi('co.ls', ls); }
  }
  function chamCaVan(v) {
    for (let i = 0; i < v.ds.length; i++) {
      const a = v.pt[i], b = v.pt[i + 1];
      if (!a || !b) continue;
      const c = PT.chamNuoc(a.d, -b.d, a.m === v.ds[i]);
      if (c) v.c[i] = c.ma;
    }
  }
  function chonXL(i) {
    XL.i = i;
    const Tx = L.dungThe(V.fen, V.ds.slice(0, i));
    B.T = Tx;
    B.nap(Tx);
    B.cuoi = i > 0 ? L.chuNuoc(V.ds[i - 1]) : 0;
    B.veDau();
    B.veMui(null);
    if (XL.ban) B.veLuc(Tx); else B.veLuc(null);
    veDoThi(); veLoiXL();
    const a = V.pt[i];
    if (a && a.m) {
      const m = L.chuNuoc(a.m);
      if (Tx.hopLe().includes(m)) B.veMui([{ tu: m & 255, den: m >> 8, mau: 'goi' }]);
    }
  }
  function veLoiXL() {
    const el = $('#v-loi');
    if (!el) return;
    const i = XL.i, r = [];
    if (i === 0) r.push('<p class="loi">Thế xuất phát. Mũi tên xanh là nước máy chọn.</p>');
    else {
      const T0 = L.dungThe(V.fen, V.ds.slice(0, i - 1)), m = L.chuNuoc(V.ds[i - 1]), g = PT.ghi(T0, m), d = PT.moTaNuoc(T0, m);
      const a = V.pt[i - 1], b = V.pt[i];
      const c = a && b ? PT.chamNuoc(a.d, -b.d, a.m === V.ds[i - 1]) : null;
      const ten = BEN[T0.ben];
      const gt = c ? giaiThichXL(i - 1, m, a, b, c) : '';
      r.push(`<p class="loi">${c ? nhanCham(c) + ' ' : ''}<b>${Math.ceil(i / 2)}. ${ten} ${esc(g.ky)}</b> ${esc(d.chu)}.${gt ? ' ' + gt : ''}</p>`);
    }
    const dd = diemDo(V, i);
    if (dd != null) r.push(`<p class="loi cu">${esc(PT.diemRaChu(dd))}.</p>`);
    if (i === V.ds.length && V.ket) r.push(`<p class="loi cu">Kết thúc: ${esc(TEN_KET[V.ket.kieu] || '')}${V.ket.thang == null ? ', hòa' : `, ${BEN[V.ket.thang]} thắng`}.</p>`);
    if (XL.xong) r.push(tomTatVan());
    el.innerHTML = r.join('');
  }
  function giaiThichXL(n, m, truoc, sau, cham) {
    if (cham.ma === 'hay' || cham.ma === 'duoc') return '';
    const T0 = L.dungThe(V.fen, V.ds.slice(0, n)), r = [];
    if (sau && sau.m) {
      const T1 = L.dungThe(V.fen, V.ds.slice(0, n + 1)), mr = L.chuNuoc(sau.m);
      if (T1.hopLe().includes(mr)) r.push(`Đối phương đáp ${esc(PT.ghi(T1, mr).ky)}: ${esc(dauThuong(PT.moTaNuoc(T1, mr).chu))}.`);
    }
    if (truoc && truoc.m) {
      const mt = L.chuNuoc(truoc.m);
      if (T0.hopLe().includes(mt) && mt !== m) r.push(`Nên đi ${esc(PT.ghi(T0, mt).ky)}.`);
    }
    return r.join(' ');
  }
  function tomTatVan() {
    const dem = [{ tot: 0, lo: 0, sai: 0, nang: 0, tong: 0 }, { tot: 0, lo: 0, sai: 0, nang: 0, tong: 0 }];
    const tuiMat = [0, 0];
    for (let i = 0; i < V.ds.length; i++) {
      const c = V.c[i], ben = benLuc(V, i), k = dem[ben];
      if (!c) continue;
      k.tong++;
      if (c === 'hay' || c === 'duoc') k.tot++;
      else k[c]++;
      const a = V.pt[i], b = V.pt[i + 1];
      if (a && b) tuiMat[ben] += Math.max(0, PT.coHoi(a.d) - PT.coHoi(-b.d));
    }
    const chinh = ben => (dem[ben].tong ? Math.max(0, Math.round(100 - tuiMat[ben] / dem[ben].tong * 220)) : 0);
    const dong = ben => `<li><b class="ben-${ben ? 'den' : 'do'}"><i class="dau-ben"></i>${BEN[ben]}</b> chính xác ${chinh(ben)}%: ${dem[ben].tot} nước tốt, ${dem[ben].lo} chưa chuẩn, ${dem[ben].sai} sai lầm, ${dem[ben].nang} sai nặng</li>`;
    return `<ul class="tom-tat-van">${dong(0)}${dong(1)}</ul>`;
  }
  // Đồ thị cán cân: một đường duy nhất, trên giữa là Đỏ hơn, dưới giữa là Đen hơn; chạm để tới nước đó
  function veDoThi() {
    const el = $('#xl-do');
    if (!el || !V) return;
    const n = V.ds.length, W = 360, H = 104, M = H / 2;
    if (!n) { el.innerHTML = ''; return; }
    const xs = i => (i / n) * W, ys = i => { const d = diemDo(V, i); return d == null ? null : M - (PT.coHoi(d) * 2 - 1) * (M - 5); };
    let duong = '', cuoi = null;
    const diem = [];
    for (let i = 0; i <= n; i++) { const y = ys(i); if (y == null) continue; diem.push([xs(i), y, i]); duong += `${duong ? 'L' : 'M'}${xs(i).toFixed(1)} ${y.toFixed(1)}`; cuoi = i; }
    const vung = diem.length > 1 ? `${duong}L${xs(cuoi).toFixed(1)} ${M}L${diem[0][0].toFixed(1)} ${M}Z` : '';
    const dau = [];
    for (let i = 0; i < n; i++) {
      const c = V.c[i];
      if ((c === 'sai' || c === 'nang') && ys(i + 1) != null) dau.push(`<rect class="d-${c}" x="${(xs(i + 1) - 4).toFixed(1)}" y="${(ys(i + 1) - 4).toFixed(1)}" width="8" height="8" transform="rotate(45 ${xs(i + 1).toFixed(1)} ${ys(i + 1).toFixed(1)})"/>`);
    }
    const iHien = XL.i;
    const yHien = ys(iHien);
    el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Đồ thị cán cân cả ván: phía trên là Đỏ hơn, phía dưới là Đen hơn">
        <defs><clipPath id="c-tren"><rect x="0" y="0" width="${W}" height="${M}"/></clipPath><clipPath id="c-duoi"><rect x="0" y="${M}" width="${W}" height="${M}"/></clipPath></defs>
        ${vung ? `<path class="vung-do" d="${vung}" clip-path="url(#c-tren)"/><path class="vung-den" d="${vung}" clip-path="url(#c-duoi)"/>` : ''}
        <line class="truc" x1="0" y1="${M}" x2="${W}" y2="${M}"/>
        <path class="duong" d="${duong}"/>
        ${dau.join('')}
        <line class="chon" x1="${xs(iHien).toFixed(1)}" y1="0" x2="${xs(iHien).toFixed(1)}" y2="${H}"/>
        ${yHien != null ? `<circle class="diem" cx="${xs(iHien).toFixed(1)}" cy="${yHien.toFixed(1)}" r="4"/>` : ''}
      </svg><span class="nhan tren">Đỏ hơn</span><span class="nhan duoi">Đen hơn</span><span class="nhan phai">Hình thoi: sai lầm</span>`;
  }
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-xl]');
    if (!b || !XL) return;
    const lam = b.dataset.xl, n = V.ds.length;
    CO.OT.rung('nhe');
    if (lam === 've') { XL.token = -1; XL = null; phien++; V = null; B = null; CO.veMan(); }
    else if (lam === 'dau') chonXL(0);
    else if (lam === 'cuoi') chonXL(n);
    else if (lam === 'truoc') chonXL(Math.max(0, XL.i - 1));
    else if (lam === 'sau') chonXL(Math.min(n, XL.i + 1));
    else if (lam === 'ban') { XL.ban = !XL.ban; chonXL(XL.i); }
    else if (lam === 'thu') {
      const ds = V.ds.slice(0, Math.max(0, XL.i - 1 + (XL.i === 0 ? 1 : 0)));
      const moi = V.kieu === 'may' ? { kieu: 'may', muc: V.muc, ben: V.ben, fen: V.fen, ds, tg: true } : { kieu: 'nguoi', fen: V.fen, ds, tg: true };
      XL.token = -1; XL = null;
      mo(taoVan(moi));
      hienLoi('Thử lại từ thế này, tìm nước khác hay hơn.');
    }
  });

  // ---------- Mở ván từ trang chính ----------
  CO.moVanMay = (muc, ben, tg) => mo(taoVan({ kieu: 'may', muc, ben, tg }));
  CO.moVanHaiNguoi = () => mo(taoVan({ kieu: 'nguoi', tg: true }));
  CO.moVanTuThe = (fen, ben, muc) => mo(taoVan({ kieu: 'may', muc, ben, fen, tg: true }));
  CO.moVanTruc = v => mo(v);
  CO.moVanDo = () => { const d = kho().doc('co.dang', null); if (d) { mo(d); return true; } return false; };
  CO.vanDo = () => kho().doc('co.dang', null);
  CO.phongDo = () => kho().doc('co.phong', null);
  CO.moLaiPhong = moLaiPhong;
  CO.xoaPhong = () => kho().ghi('co.phong', null);
  CO.taoPhong = taoPhong;
  CO.vaoPhong = vaoPhong;
  CO.tenKetVan = TEN_KET;
  CO.demoVan = {
    get B() { return B; }, get T() { return T; }, get V() { return V; },
    moTheCo: () => moLop(1), moBien: () => moLop(2), banDo: nutBanDo, hienLoi,
  };
})();
