/* Bàn cờ dùng chung (bài học, ván cờ, giải thế, bày thế) + nối tới máy cờ chạy nền + hiệu ứng đập quân. */
(() => {
  'use strict';
  const L = window.CoLoi, PT = window.CoPT;
  const CO = window.CO = window.CO || {};
  const HAN = [null, ['帥', '將'], ['仕', '士'], ['相', '象'], ['傌', '馬'], ['俥', '車'], ['炮', '砲'], ['兵', '卒']];
  const TEN = PT.TEN;
  const LOAI_LOP = ['', 'tg', 'si', 'tv', 'ma', 'xe', 'ph', 'to'];

  // ---------- Nối với app.js: lưu trữ, âm thanh, rung, hộp hỏi, chuyển màn ----------
  let OT = null;
  CO.CAI = { chu: 'han', dap: 1 };   // chu: chữ trên quân ('han' như bàn cờ thật, 'viet'); dap: hiệu ứng đập quân và lời khiêu khích
  CO.gan = api => {
    OT = api;
    CO.OT = api;
    Object.assign(CO.CAI, api.kho.doc('co.cai', {}));
    themAm(api);
  };
  CO.luuCai = () => OT.kho.ghi('co.cai', CO.CAI);
  const giam = () => OT && OT.giamDong.matches;
  const doi = ms => new Promise(r => setTimeout(r, ms));
  CO.doi = doi;
  const esc = s => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
  CO.esc = esc;

  // ---------- Âm thanh quân gỗ, tổng hợp bằng Web Audio ----------
  function themAm(api) {
    const { tieng, BAN_AM } = api;
    const on = (c, ra, t, tan, q, to, dai) => {   // tiếng gõ gỗ: nhiễu ngắn qua lọc dải
      const n = Math.floor(c.sampleRate * dai), b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3);
      const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
      s.buffer = b; f.type = 'bandpass'; f.frequency.value = tan; f.Q.value = q; g.gain.value = to;
      s.connect(f); f.connect(g); g.connect(ra); s.start(t);
    };
    // Đặt quân thường: cạch nhẹ, khô
    BAN_AM.dat = (c, ra, t) => {
      on(c, ra, t, 1900, 1.1, 0.5, 0.05);
      tieng(c, ra, t, 620, 0.07, { to: 0.22, tanCuoi: 430, kieu: 'triangle' });
      tieng(c, ra, t, 1240, 0.035, { to: 0.07 });
    };
    // Chạm chọn quân: rất nhẹ
    BAN_AM.cham = (c, ra, t) => { on(c, ra, t, 2600, 1.4, 0.16, 0.025); };
    // Đập quân khi ăn: thân bàn dội, gỗ nổ khô
    BAN_AM.dap = (c, ra, t) => {
      on(c, ra, t, 1200, 0.8, 1.15, 0.09);
      on(c, ra, t, 3200, 1.2, 0.45, 0.03);
      tieng(c, ra, t, 240, 0.2, { to: 0.8, tanCuoi: 92, kieu: 'triangle' });
      tieng(c, ra, t, 520, 0.09, { to: 0.34, tanCuoi: 300, kieu: 'triangle' });
      tieng(c, ra, t + 0.012, 1050, 0.05, { to: 0.12 });
    };
    // Chiếu: đập quân rồi một tiếng trống cái, thách thức
    BAN_AM.chieu = (c, ra, t) => {
      BAN_AM.dap(c, ra, t);
      tieng(c, ra, t + 0.05, 180, 0.42, { to: 0.8, tanCuoi: 66, kieu: 'sine' });
      tieng(c, ra, t + 0.05, 362, 0.24, { to: 0.26, tanCuoi: 170, kieu: 'triangle' });
      on(c, ra, t + 0.05, 700, 0.7, 0.55, 0.16);
      tieng(c, ra, t + 0.2, 660, 0.3, { to: 0.1, kieu: 'sawtooth', loc: 1500, tanCuoi: 620 });
    };
    // Máy hoặc đối thủ ăn quân mình: nặng và trầm hơn
    BAN_AM.biAn = (c, ra, t) => {
      on(c, ra, t, 800, 0.7, 1.1, 0.1);
      tieng(c, ra, t, 170, 0.28, { to: 0.85, tanCuoi: 70, kieu: 'triangle' });
      tieng(c, ra, t + 0.09, 196, 0.26, { to: 0.26, kieu: 'triangle', loc: 900, tanCuoi: 150 });
    };
  }

  // ---------- Máy cờ chạy nền ----------
  // WKWebView nạp từ file:// có thể chặn worker từ tệp, nên dựng worker từ chuỗi nguồn: thử blob, rồi data:, cuối cùng chạy ngay luồng chính
  let tho = null, soId = 1, mayChinh = null, duoiChinh = Promise.resolve(), sanSang = null;
  const cho = new Map();
  CO.kieuMay = '';
  const thuTho = url => new Promise((ok, no) => {
    let w;
    try { w = new Worker(url); } catch (e) { no(e); return; }
    const hen = setTimeout(() => { try { w.terminate(); } catch (e) { /* đã dừng */ } no(new Error('hết giờ')); }, 2500);
    w.onmessage = e => { if (e.data && e.data.san) { clearTimeout(hen); ok(w); } };
    w.onerror = () => { clearTimeout(hen); no(new Error('worker lỗi')); };
  });
  function khoiDongMay() {
    if (sanSang) return sanSang;
    const nguon = `(${window.COTUONG_LOI.toString()})(self);`;
    sanSang = (async () => {
      const thu = [
        ['blob', () => URL.createObjectURL(new Blob([nguon], { type: 'application/javascript' }))],
        ['data', () => 'data:application/javascript;charset=utf-8,' + encodeURIComponent(nguon)],
      ];
      for (const [ten, lam] of thu) {
        try {
          const w = await thuTho(lam());
          w.onmessage = e => {
            const d = e.data, c = cho.get(d.id);
            if (!c) return;
            cho.delete(d.id);
            if (d.ok) c.ok(d.kq); else c.no(new Error(d.loi));
          };
          w.onerror = e => { cho.forEach(c => c.no(new Error('Máy cờ lỗi: ' + e.message))); cho.clear(); };
          tho = w;
          CO.kieuMay = ten;
          return;
        } catch (e) { /* thử cách sau */ }
      }
      mayChinh = L.MayTim();
      CO.kieuMay = 'chinh';
    })();
    return sanSang;
  }
  CO.khoiDongMay = khoiDongMay;
  // viec: 'tim' | 'nhieu' | 'giai'; d: { fen, ds, o, n }
  CO.goiMay = async (viec, d) => {
    await khoiDongMay();
    const goi = Object.assign({ viec }, d);
    if (tho) {
      const id = soId++;
      return new Promise((ok, no) => { cho.set(id, { ok, no }); tho.postMessage(Object.assign({ id }, goi)); });
    }
    // Chạy ngay luồng chính: nhường một nhịp để chữ "đang nghĩ" kịp hiện
    const viecNay = duoiChinh.then(() => doi(40)).then(() => L.lamViec(mayChinh, L.dungThe, goi));
    duoiChinh = viecNay.catch(() => {});
    return viecNay;
  };

  // ---------- Thế cờ viết gọn cho bài học ----------
  const MA_Q = { K: 1, A: 2, B: 3, N: 4, R: 5, C: 6, P: 7 };
  CO.theTuChu = (chuoi, ben) => {
    if (!chuoi || chuoi === 'dau') return L.FEN_DAU;
    if (chuoi.includes('/')) return chuoi;
    const T = new L.The('9/9/9/9/9/9/9/9/9/9 w');
    chuoi.trim().split(/\s+/).forEach(x => {
      const hoa = x[0].toUpperCase(), s = L.chuO(x.slice(1));
      T.datQuan(s, x[0] === hoa ? MA_Q[hoa] : MA_Q[hoa] + 8);
    });
    T.ben = ben === 'b' ? 1 : 0;
    return T.fen();
  };

  // ---------- Mặt bàn: vẽ đường kẻ bằng SVG, co giãn theo cỡ ô ----------
  const ke = (() => {
    const x = c => 5 + c * 10, y = h => 5 + h * 10;
    let d = '';
    for (let h = 0; h < 10; h++) d += `M${x(0)} ${y(h)}H${x(8)}`;
    d += `M${x(0)} ${y(0)}V${y(9)}M${x(8)} ${y(0)}V${y(9)}`;
    for (let c = 1; c < 8; c++) d += `M${x(c)} ${y(0)}V${y(4)}M${x(c)} ${y(5)}V${y(9)}`;
    d += `M${x(3)} ${y(0)}L${x(5)} ${y(2)}M${x(5)} ${y(0)}L${x(3)} ${y(2)}M${x(3)} ${y(7)}L${x(5)} ${y(9)}M${x(5)} ${y(7)}L${x(3)} ${y(9)}`;
    // Dấu góc ở chỗ đứng của Pháo và Tốt
    const dau = (h, c) => {
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => {
        if (c === 0 && a < 0) return;
        if (c === 8 && a > 0) return;
        const px = x(c) + a * 1, py = y(h) + b * 1;
        d += `M${px + a * 2.1} ${py}H${px}V${py + b * 2.1}`;
      });
    };
    [[2, 1], [2, 7], [7, 1], [7, 7]].forEach(([h, c]) => dau(h, c));
    [3, 6].forEach(h => [0, 2, 4, 6, 8].forEach(c => dau(h, c)));
    return d;
  })();
  const svgBan = han => `<svg class="ke" viewBox="0 0 90 100" aria-hidden="true">
      <path class="ke-sang" d="${ke}" transform="translate(.22 .24)"/><path class="ke-toi" d="${ke}"/>
      <rect class="ke-vien" x="3.6" y="3.6" width="82.8" height="92.8"/>
      <g class="chu-song${han ? ' han' : ''}"><text x="25" y="${han ? 52.3 : 51.9}">${han ? '楚 河' : 'Sở Hà'}</text><text x="65" y="${han ? 52.3 : 51.9}">${han ? '漢 界' : 'Hán Giới'}</text></g>
    </svg>`;
  // Đầu mũi tên tô màu cố định cho từng kiểu (Safari cũ không hiểu fill="context-stroke")
  const MAU_MUI = { goi: '#0B6B43', 'doa-do': '#B3141B', 'doa-den': '#16307E' };
  const iconMui = `<defs>${Object.keys(MAU_MUI).map(k => `<marker id="dau-${k}" viewBox="0 0 10 10" refX="6.5" refY="5" markerWidth="3.2" markerHeight="3.2" orient="auto"><path d="M0 0L10 5L0 10z" fill="${MAU_MUI[k]}"/></marker>`).join('')}</defs>`;

  // Chữ trên quân
  CO.htmlChu = (p, kieu) => {
    const t = p & 7, ben = p >> 3;
    if ((kieu || CO.CAI.chu) === 'han') return `<b class="han">${HAN[t][ben]}</b>`;
    return `<b class="chu${t === 1 || t === 3 ? ' dai' : t === 6 ? ' vua' : ''}">${TEN[t]}</b>`;
  };
  // Mỗi quân lấy một khoảng vân gỗ khác nhau trên ảnh mặt cắt, như quân gỗ thật không quân nào giống quân nào
  let soVan = 0;
  const vanGo = () => { soVan = (soVan + 1) % 997; const a = (soVan * 37) % 53, b = (soVan * 61) % 47; return `${24 + a}% ${26 + b}%`; };
  CO.htmlQuan = (p, lop = '', kieu) => `<i class="quan ${p >> 3 ? 'den' : 'do'} ${LOAI_LOP[p & 7]} ${lop}"><span class="mat" style="--vt:${vanGo()}">${CO.htmlChu(p, kieu)}</span></i>`;

  class BanCo {
    // o: lat, khiDi(m), khiSai(lyDo, tu, den), khiBam(s), choChon(s) -> bool
    constructor(o = {}) {
      this.o = o; this.lat = !!o.lat; this.T = null; this.chon = null; this.dich = []; this.khoa = false;
      this.quan = new Map(); this.co = 40; this.cuoi = 0;
      const el = this.el = document.createElement('div');
      el.className = 'ban';
      const so = Array.from({ length: 9 }, (_, i) => i);
      const han = CO.CAI.chu === 'han';
      el.innerHTML = `<div class="ban-so" aria-hidden="true">${so.map(i => `<span>${i + 1}</span>`).join('')}</div>
        <div class="ban-giua">
          ${svgBan(han)}
          <svg class="ban-phu" viewBox="0 0 90 100" aria-hidden="true"><g class="ph-dai"></g><g class="ph-luc"></g></svg>
          <div class="lop-dau" aria-hidden="true"></div>
          <div class="lop-quan" aria-hidden="true"></div>
          <svg class="ban-mui" viewBox="0 0 90 100" aria-hidden="true">${iconMui}<g class="ph-mui"></g></svg>
          <div class="lop-bam" role="group" aria-label="Bàn cờ, dùng phím mũi tên để di chuyển, Enter để chọn"></div>
        </div>
        <div class="ban-so" aria-hidden="true">${so.map(i => `<span>${9 - i}</span>`).join('')}</div>`;
      this.giua = el.querySelector('.ban-giua');
      this.lopDau = el.querySelector('.lop-dau');
      this.lopQuan = el.querySelector('.lop-quan');
      this.lopBam = el.querySelector('.lop-bam');
      this.phDai = el.querySelector('.ph-dai');
      this.phLuc = el.querySelector('.ph-luc');
      this.phMui = el.querySelector('.ph-mui');
      let htm = '';
      for (let i = 0; i < 90; i++) {
        htm += `<button class="o-ban" data-i="${i}" tabindex="${i === 76 ? 0 : -1}" style="left:${(i % 9) * 100 / 9}%;top:${((i / 9) | 0) * 10}%"></button>`;
      }
      this.lopBam.innerHTML = htm;
      this.nut = [...this.lopBam.children];
      this.ganSuKien();
    }
    s(i) { return this.lat ? 89 - i : i; }     // ô màn hình -> ô bàn
    xy(s) {
      const v = this.lat ? 89 - s : s;
      return [(v % 9 + 0.5) * this.co, (((v / 9) | 0) + 0.5) * this.co];
    }
    // Đặt cỡ ô theo khoảng trống cho phép
    doCo(rongToiDa, caoToiDa) {
      this.co = Math.max(24, Math.floor(Math.min(rongToiDa / 9, caoToiDa / 10.72)));
      this.el.style.setProperty('--o', this.co + 'px');
      this.quan.forEach((el, s) => this.datViTri(el, s));
      this.veDau();
    }
    datViTri(el, s) { const [x, y] = this.xy(s); el.style.transform = `translate(${x}px,${y}px)`; }
    datLat(v) {
      this.lat = !!v;
      this.quan.forEach((el, s) => this.datViTri(el, s));
      this.veDau(); this.capNhatNhan();
      if (this.muiHien) this.veMui(this.muiHien);
      if (this.lucHien) this.veLuc(this.lucHien);
      if (this.oHien) this.veO(this.oHien);
      if (this.chon != null) this.veCham();
    }
    // Nạp lại toàn bộ theo thế T (không hiệu ứng)
    nap(T) {
      this.T = T; this.chon = null; this.dich = []; this.hopLe = null;
      this.lopDau.querySelectorAll('.cham, .nhay-o').forEach(x => x.remove());
      this.lopQuan.innerHTML = '';
      this.quan.clear();
      for (let s = 0; s < 90; s++) {
        const p = T.ban[s];
        if (p) this.themQuan(s, p);
      }
      this.danhDauChieu(); this.veDau(); this.capNhatNhan();
    }
    themQuan(s, p) {
      const w = document.createElement('div');
      w.innerHTML = CO.htmlQuan(p);
      const el = w.firstChild;
      this.lopQuan.appendChild(el);
      this.datViTri(el, s);
      this.quan.set(s, el);
      return el;
    }
    capNhatNhan() {
      if (!this.T) return;
      this.nut.forEach((b, i) => {
        const s = this.s(i), p = this.T.ban[s], cot = PT.cot(s, 0), hang = 10 - ((s / 9) | 0);
        b.setAttribute('aria-label', `Cột ${cot}, hàng ${hang}${p ? ': ' + TEN[p & 7] + (p >> 3 ? ' Đen' : ' Đỏ') : ''}${this.dich.includes(s) ? ', đi được' : ''}`);
      });
    }
    // ---------- Chọn quân, đi quân ----------
    duocChon(s) {
      const p = this.T && this.T.ban[s];
      if (!p || (p >> 3) !== this.T.ben) return false;
      return this.o.choChon ? this.o.choChon(s) : true;
    }
    dsHopLe() { return this.hopLe || (this.hopLe = this.T.hopLe()); }
    chonQuan(s) {
      this.boChon(true);
      this.chon = s;
      this.dich = this.dsHopLe().filter(m => (m & 255) === s).map(m => m >> 8);
      const el = this.quan.get(s);
      if (el) el.classList.add('chon');
      this.veCham();
      if (OT) { OT.rung('chon'); OT.phat('cham'); }
      if (this.o.khiChon) this.o.khiChon(s);
    }
    boChon(giuCham) {
      if (this.chon != null) { const el = this.quan.get(this.chon); if (el) el.classList.remove('chon'); }
      this.chon = null; this.dich = [];
      if (!giuCham) this.lopDau.querySelectorAll('.cham').forEach(x => x.remove());
    }
    veCham() {
      this.lopDau.querySelectorAll('.cham').forEach(x => x.remove());
      this.dich.forEach(o => this.lopDau.appendChild(this.chamO(o, this.T.ban[o] ? 'cham an-duoc' : 'cham')));
      this.capNhatNhan();
    }
    chamO(s, lop) {
      const d = document.createElement('i'), [x, y] = this.xy(s);
      d.className = lop; d.style.transform = `translate(${x}px,${y}px)`;
      return d;
    }
    // Hiện chấm cho một quân mà không cần chạm (bài học)
    hienCham(s) {
      this.lopDau.querySelectorAll('.cham').forEach(x => x.remove());
      if (!this.T) return;
      this.T.hopLe().filter(m => (m & 255) === s).forEach(m => {
        const o = m >> 8;
        this.lopDau.appendChild(this.chamO(o, this.T.ban[o] ? 'cham an-duoc' : 'cham'));
      });
    }
    bam(s) {
      if (this.khoa) { if (this.o.khiBam) this.o.khiBam(s); return; }
      if (this.chon != null) {
        if (s === this.chon) { this.boChon(); return; }
        if (this.dich.includes(s)) { const m = this.chon | (s << 8); this.boChon(); this.o.khiDi(m); return; }
        if (this.duocChon(s)) { this.chonQuan(s); return; }
        const tu = this.chon, ly = PT.viSaoKhong(this.T, tu, s);
        this.lacQuan(tu);
        if (this.o.khiSai) this.o.khiSai(ly, tu, s);
        return;
      }
      if (this.duocChon(s)) { this.chonQuan(s); return; }
      if (this.o.khiBam) this.o.khiBam(s);
    }
    lacQuan(s) {
      const el = this.quan.get(s);
      if (OT) OT.rung('sai');
      if (!el || giam()) return;
      el.firstChild.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-5px)' }, { transform: 'translateX(5px)' }, { transform: 'translateX(-3px)' }, { transform: 'translateX(0)' }], { duration: 260 });
    }
    ganSuKien() {
      let keo = null, vuaKeo = false;
      const oDuoiTay = (x, y) => {
        const r = this.lopBam.getBoundingClientRect();
        const c = Math.floor((x - r.left) / this.co), h = Math.floor((y - r.top) / this.co);
        if (c < 0 || c > 8 || h < 0 || h > 9) return null;
        return this.s(h * 9 + c);
      };
      this.lopBam.addEventListener('pointerdown', e => {
        const b = e.target.closest('.o-ban');
        if (!b || this.khoa) return;
        const s = this.s(+b.dataset.i);
        if (!this.duocChon(s)) return;
        keo = { s, x0: e.clientX, y0: e.clientY, da: false, id: e.pointerId };
      });
      addEventListener('pointermove', e => {
        if (!keo || e.pointerId !== keo.id) return;
        const dx = e.clientX - keo.x0, dy = e.clientY - keo.y0;
        if (!keo.da && Math.hypot(dx, dy) < 10) return;
        if (!keo.da) { keo.da = true; if (this.chon !== keo.s) this.chonQuan(keo.s); const el = this.quan.get(keo.s); if (el) el.classList.add('keo'); }
        const el = this.quan.get(keo.s);
        if (!el) return;
        const r = this.lopBam.getBoundingClientRect();
        el.style.transform = `translate(${e.clientX - r.left}px,${e.clientY - r.top - this.co * 0.75}px)`;
      }, { passive: true });
      const tha = e => {
        if (!keo || e.pointerId !== keo.id) return;
        const k = keo;
        keo = null;
        if (!k.da) return;
        vuaKeo = true;
        setTimeout(() => { vuaKeo = false; }, 60);
        const el = this.quan.get(k.s);
        if (el) { el.classList.remove('keo'); this.datViTri(el, k.s); }
        const dich = oDuoiTay(e.clientX, e.clientY - this.co * 0.75);
        if (dich == null || dich === k.s) return;
        this.bam(dich);
      };
      addEventListener('pointerup', tha);
      addEventListener('pointercancel', e => {
        if (!keo || e.pointerId !== keo.id) return;
        const el = this.quan.get(keo.s);
        if (el) { el.classList.remove('keo'); this.datViTri(el, keo.s); }
        keo = null;
      });
      this.lopBam.addEventListener('click', e => {
        if (vuaKeo) return;
        const b = e.target.closest('.o-ban');
        if (b) this.bam(this.s(+b.dataset.i));
      });
      this.lopBam.addEventListener('keydown', e => {
        const b = e.target.closest('.o-ban');
        if (!b) return;
        const buoc = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -9, ArrowDown: 9 }[e.key];
        if (!buoc) return;
        e.preventDefault();
        const i = +b.dataset.i, moi = i + buoc;
        if (moi < 0 || moi > 89 || (Math.abs(buoc) === 1 && ((moi / 9) | 0) !== ((i / 9) | 0))) return;
        b.tabIndex = -1;
        this.nut[moi].tabIndex = 0;
        this.nut[moi].focus();
      });
    }
    // ---------- Đi quân có hiệu ứng ----------
    // Thế this.T phải được cập nhật trước (T.diGhi) rồi gọi hàm này với nước vừa đi.
    // o: { an, chieu, bi, cuaMinh: nước của bên người chơi hay không }
    async diHinh(m, o = {}) {
      const tu = m & 255, den = m >> 8, el = this.quan.get(tu), biAn = this.quan.get(den);
      this.hopLe = null;
      this.boChon();
      if (!el) { this.nap(this.T); return; }
      this.quan.delete(tu);
      if (biAn) this.quan.delete(den);
      this.quan.set(den, el);
      const [x0, y0] = this.xy(tu), [x1, y1] = this.xy(den);
      el.classList.add('dang-di');
      this.datViTri(el, den);
      const manh = !!(o.an || o.chieu) && !!CO.CAI.dap;
      if (giam()) {
        if (biAn) biAn.remove();
        el.classList.remove('dang-di');
        if (OT) { OT.phat(o.chieu ? 'chieu' : o.an ? 'dap' : 'dat'); OT.rung(o.chieu || o.an ? 'manh' : 'nhe'); }
        if (o.chieu && CO.CAI.dap) this.dauAn(o.bi ? 'Chiếu bí!' : 'Chiếu!', 'chieu');
        this.danhDauChieu();
        this.datCuoi(m);
        return;
      }
      if (manh) {
        // Nhấc cao, bay tới, đập xuống mặt bàn
        const bay = 250;
        el.animate([{ transform: `translate(${x0}px,${y0}px)` }, { transform: `translate(${x1}px,${y1}px)` }], { duration: bay, easing: 'cubic-bezier(.35,.1,.3,1)' });
        const mat = el.firstChild;
        mat.animate([
          { transform: 'none', offset: 0 },
          { transform: 'translateY(-34%) scale(1.5)', offset: 0.62, easing: 'cubic-bezier(.7,0,1,.6)' },
          { transform: 'scale(.9)', offset: 0.84 },
          { transform: 'scale(1.06)', offset: 0.93 },
          { transform: 'none', offset: 1 },
        ], { duration: bay + 90 });
        await doi(bay * 0.95);
        this.vaCham(den, biAn, o);
      } else {
        el.animate([{ transform: `translate(${x0}px,${y0}px)` }, { transform: `translate(${x1}px,${y1}px)` }], { duration: 230, easing: 'cubic-bezier(.3,.8,.3,1)' });
        await doi(170);
        if (biAn) biAn.remove();
        if (OT) { OT.phat(o.chieu ? 'chieu' : o.an ? 'dap' : 'dat'); OT.rung(o.an || o.chieu ? 'manh' : 'nhe'); }
      }
      await doi(70);
      el.classList.remove('dang-di');
      this.danhDauChieu();
      this.datCuoi(m);
    }
    vaCham(s, biAn, o) {
      const [x, y] = this.xy(s), r = this.lopQuan.getBoundingClientRect();
      if (OT) { OT.phat(o.chieu ? 'chieu' : !o.cuaMinh ? 'biAn' : 'dap'); OT.rung('manh'); }
      // Quân bị ăn văng ra
      if (biAn) {
        biAn.classList.add('dang-chet');
        const huong = Math.random() < 0.5 ? -1 : 1;
        biAn.firstChild.animate([
          { transform: 'none', opacity: 1 },
          { transform: `translate(${huong * this.co * 0.9}px,${-this.co * 0.5}px) rotate(${huong * 120}deg) scale(.7)`, opacity: 0 },
        ], { duration: 380, easing: 'cubic-bezier(.2,.8,.4,1)', fill: 'forwards' }).onfinish = () => biAn.remove();
      }
      // Sóng dội trên mặt bàn
      [0, 90].forEach((tre, k) => {
        const sg = document.createElement('i');
        sg.className = 'song-doi' + (o.chieu ? ' do' : '');
        sg.style.transform = `translate(${x}px,${y}px)`;
        this.lopDau.appendChild(sg);
        sg.animate([
          { transform: `translate(${x}px,${y}px) scale(.3)`, opacity: 0.85 },
          { transform: `translate(${x}px,${y}px) scale(${k ? 3.4 : 2.4})`, opacity: 0 },
        ], { duration: k ? 620 : 460, delay: tre, easing: 'cubic-bezier(.1,.7,.3,1)', fill: 'both' }).onfinish = () => sg.remove();
      });
      // Bàn rung: chiếu thì rung mạnh hơn
      const a = o.chieu ? 7 : 4;
      this.el.animate([
        { transform: 'none' },
        { transform: `translate(${-a * 0.4}px,${a}px) rotate(-.5deg)`, offset: 0.14 },
        { transform: `translate(${a * 0.5}px,${-a * 0.6}px) rotate(.4deg)`, offset: 0.32 },
        { transform: `translate(${-a * 0.3}px,${a * 0.4}px) rotate(-.25deg)`, offset: 0.52 },
        { transform: `translate(${a * 0.15}px,${-a * 0.2}px)`, offset: 0.74 },
        { transform: 'none' },
      ], { duration: o.chieu ? 420 : 300, easing: 'ease-out' });
      // Dăm gỗ bắn ra
      if (OT && OT.phaoSao) OT.phaoSao(r.left + x, r.top + y, o.chieu ? 26 : 16, o.chieu ? 0.95 : 0.7, ['#E9C88F', '#C99A58', '#8A6230', '#F4DFB5']);
      // Dấu mộc
      if (o.chieu) this.dauAn(o.bi ? 'Chiếu bí!' : 'Chiếu!', 'chieu');
      else if (o.an) this.dauAn('Ăn!', 'nho', s);
    }
    dauAn(chu, kieu, s) {
      const d = document.createElement('b');
      d.className = 'dau-an ' + kieu;
      d.textContent = chu;
      if (s != null) {
        const [x, y] = this.xy(s);
        d.style.left = x + 'px'; d.style.top = y + 'px';
      }
      this.giua.appendChild(d);
      if (giam()) { setTimeout(() => d.remove(), 900); return; }
      const lon = kieu === 'chieu';
      const nen = 'translate(-50%,-50%) rotate(-9deg)';
      d.animate([
        { transform: `${nen} scale(${lon ? 3 : 2.2})`, opacity: 0 },
        { transform: `${nen} scale(.92)`, opacity: 1, offset: 0.12 },
        { transform: `${nen} scale(1)`, opacity: 1, offset: 0.2 },
        { transform: `${nen} scale(1)`, opacity: 1, offset: 0.78 },
        { transform: `${nen} scale(1.06)`, opacity: 0 },
      ], { duration: lon ? 1250 : 800, easing: 'ease-out', fill: 'both' }).onfinish = () => d.remove();
    }
    // Lời khiêu khích hiện cạnh bàn, phía bên vừa đi
    loiChoc(chu, phiaTren) {
      if (!CO.CAI.dap || !chu) return;
      this.el.querySelectorAll('.loi-choc').forEach(x => x.remove());
      const d = document.createElement('p');
      d.className = 'loi-choc' + (phiaTren ? ' tren' : ' duoi');
      d.textContent = chu;
      this.el.appendChild(d);
      if (giam()) { setTimeout(() => d.remove(), 2200); return; }
      d.animate([
        { transform: 'translate(-50%,10px) scale(.8)', opacity: 0 },
        { transform: 'translate(-50%,0) scale(1.04)', opacity: 1, offset: 0.08 },
        { transform: 'translate(-50%,0) scale(1)', opacity: 1, offset: 0.14 },
        { transform: 'translate(-50%,0) scale(1)', opacity: 1, offset: 0.86 },
        { transform: 'translate(-50%,-6px) scale(1)', opacity: 0 },
      ], { duration: 2400, fill: 'both' }).onfinish = () => d.remove();
    }
    // ---------- Đánh dấu ----------
    datCuoi(m) { this.cuoi = m; this.veDau(); }
    veDau() {
      this.lopDau.querySelectorAll('.nuoc-cuoi').forEach(x => x.remove());
      if (this.cuoi) {
        [this.cuoi & 255, this.cuoi >> 8].forEach((s, k) => {
          this.lopDau.insertBefore(this.chamO(s, 'nuoc-cuoi' + (k ? ' den' : ' tu')), this.lopDau.firstChild);
        });
      }
      this.lopDau.querySelectorAll('.cham, .vong-o').forEach(x => {
        const s = +x.dataset.s;
        if (s >= 0) { const [a, b] = this.xy(s); x.style.transform = `translate(${a}px,${b}px)`; }
      });
    }
    danhDauChieu() {
      this.quan.forEach(el => el.classList.remove('bi-chieu'));
      if (!this.T) return;
      const k = this.T.vua[this.T.ben];
      if (k >= 0 && this.T.biChieu(this.T.ben)) { const el = this.quan.get(k); if (el) el.classList.add('bi-chieu'); }
    }
    veO(ds) {
      this.oHien = ds;
      this.lopDau.querySelectorAll('.vong-o').forEach(x => x.remove());
      (ds || []).forEach(s => { const d = this.chamO(s, 'vong-o'); d.dataset.s = s; this.lopDau.appendChild(d); });
    }
    // Đánh dấu kết quả chạm đúng / sai trên một ô
    nhayO(s, dung) {
      const d = this.chamO(s, 'nhay-o ' + (dung ? 'dung' : 'sai'));
      this.lopDau.appendChild(d);
      const [x, y] = this.xy(s), nen = `translate(${x}px,${y}px)`;
      if (giam()) { setTimeout(() => d.remove(), 800); return; }
      d.animate([{ transform: `${nen} scale(.5)`, opacity: 0 }, { transform: `${nen} scale(1.15)`, opacity: 1, offset: 0.35 }, { transform: `${nen} scale(1)`, opacity: 0 }], { duration: 800 }).onfinish = () => d.remove();
    }
    tamDo(s) {
      const v = this.lat ? 89 - s : s;
      return [5 + (v % 9) * 10, 5 + ((v / 9) | 0) * 10];
    }
    // Mũi tên: [{tu, den, mau: 'goi' | 'doa' | 'bi'}]
    veMui(ds) {
      this.muiHien = ds && ds.length ? ds : null;
      this.phMui.innerHTML = (ds || []).map(a => {
        const [x0, y0] = this.tamDo(a.tu), [x1, y1] = this.tamDo(a.den);
        const dx = x1 - x0, dy = y1 - y0, L0 = Math.hypot(dx, dy) || 1;
        const sx = x0 + dx / L0 * 1.6, sy = y0 + dy / L0 * 1.6, ex = x1 - dx / L0 * 2.6, ey = y1 - dy / L0 * 2.6;
        const mau = MAU_MUI[a.mau] ? a.mau : 'goi';
        return `<line class="mui ${mau}" x1="${sx.toFixed(1)}" y1="${sy.toFixed(1)}" x2="${ex.toFixed(1)}" y2="${ey.toFixed(1)}" marker-end="url(#dau-${mau})"/>`;
      }).join('');
    }
    // Bản đồ lực: mỗi giao điểm một chấm, to theo độ chênh; hai bên ngang nhau thì vòng rỗng
    veLuc(T) {
      this.lucHien = T || null;
      if (!T) { this.phLuc.innerHTML = ''; return; }
      const m = PT.banDoLuc(T);
      let h = '';
      for (let s = 0; s < 90; s++) {
        const a = m.do[s], b = m.den[s];
        if (!a && !b) continue;
        const [x, y] = this.tamDo(s), d = a - b;
        if (Math.abs(d) < 0.15) { h += `<circle class="luc giua" cx="${x}" cy="${y}" r="1.7"/>`; continue; }
        const r = 1.5 + Math.min(Math.abs(d), 2.6) * 1.28;
        h += `<circle class="luc ${d > 0 ? 'do' : 'den'}" cx="${x}" cy="${y}" r="${r.toFixed(1)}"/>`;
      }
      this.phLuc.innerHTML = h;
    }
    veDai(kieu) {
      this.el.classList.toggle('so-noi', kieu === 'so');
      if (!kieu) { this.phDai.innerHTML = ''; return; }
      const r = (x, y, w, h) => `<rect class="dai" x="${x}" y="${y}" width="${w}" height="${h}" rx="1"/>`;
      if (kieu === 'song') this.phDai.innerHTML = r(5, 45, 80, 10);
      else if (kieu === 'cung') this.phDai.innerHTML = r(35, 5, 20, 20) + r(35, 75, 20, 20);
      else this.phDai.innerHTML = '';
    }
    xoaPhu() { this.veMui(null); this.veLuc(null); this.veDai(null); this.veO(null); }
    capNhatChuQuan() {
      if (!this.T) return;
      this.nap(this.T);
      const han = CO.CAI.chu === 'han', g = this.el.querySelector('.chu-song'), t = g.querySelectorAll('text');
      g.classList.toggle('han', han);
      t[0].textContent = han ? '楚 河' : 'Sở Hà';
      t[1].textContent = han ? '漢 界' : 'Hán Giới';
      t.forEach(x => x.setAttribute('y', han ? 52.3 : 51.9));
    }
  }
  CO.BanCo = BanCo;

  // Cỡ vùng an toàn của iPhone (tai thỏ, thanh vuốt)
  CO.leAnToan = () => {
    const d = document.createElement('div');
    d.style.cssText = 'position:fixed;visibility:hidden;padding-top:var(--tren);padding-bottom:var(--duoi)';
    document.body.appendChild(d);
    const cs = getComputedStyle(d), kq = [parseFloat(cs.paddingTop) || 0, parseFloat(cs.paddingBottom) || 0];
    d.remove();
    return kq;
  };
  // Khớp bàn cờ vào màn, chừa `chua` px cho phần còn lại
  CO.khopBan = (ban, chua) => {
    const [a, b] = CO.leAnToan();
    ban.doCo(Math.min(innerWidth - 6, 620), innerHeight - a - b - chua);
  };
})();
