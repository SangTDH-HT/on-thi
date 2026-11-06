/* Luật cờ tướng và bộ máy tính nước đi.
   Toàn bộ nằm trong một hàm để dùng được ở ba nơi: luồng chính, Web Worker (dựng từ chuỗi nguồn của chính hàm này,
   vì WKWebView nạp file:// không cho tải worker từ tệp) và Node (bài kiểm tra, công cụ sinh thế cờ).

   Ô: 0..89 = hàng * 9 + cột. Hàng 0 là hàng đáy của Đen (trên cùng), hàng 9 là hàng đáy của Đỏ. Cột 0 là cột bên trái khi Đỏ nhìn.
   Quân: Đỏ 1..7, Đen 9..15 (cộng 8). Loại: 1 Tướng, 2 Sĩ, 3 Tượng, 4 Mã, 5 Xe, 6 Pháo, 7 Tốt.
   Nước đi: tu | (den << 8). Bên: 0 Đỏ, 1 Đen. */
function COTUONG_LOI(goc) {
  'use strict';

  const TG = 1, SI = 2, TV = 3, MA = 4, XE = 5, PH = 6, TO = 7;
  const FEN_CHU = ' KABNRCP';
  const FEN_DAU = 'rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w';
  const MATE = 10000, THANG = 9000, CAM = 5000;   // CAM: thua vì trường chiếu, nhẹ hơn bị bí
  const VC = 32000;
  const CAP = 1600;   // đủ cho ván dài nhất + độ sâu tìm

  // ---------- Hình học dựng sẵn ----------
  const trong = (h, c) => h >= 0 && h < 10 && c >= 0 && c < 9;
  const cung = (h, c) => c >= 3 && c <= 5 && (h <= 2 || h >= 7);
  const cungBen = (h, c, b) => c >= 3 && c <= 5 && (b === 0 ? h >= 7 && h <= 9 : h >= 0 && h <= 2);
  const TIA = [], MA_DI = [], MA_CHIEU = [], TV_DI = [], SI_DI = [], TG_DI = [];
  const TO_DI = [[], []], TO_CHIEU = [[], []];
  for (let s = 0; s < 90; s++) {
    const h = (s / 9) | 0, c = s % 9;
    const tia = [];
    [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([dh, dc]) => {
      const r = [];
      for (let a = h + dh, b = c + dc; trong(a, b); a += dh, b += dc) r.push(a * 9 + b);
      tia.push(Int8Array.from(r));
    });
    TIA.push(tia);
    const md = [], mc = [];
    [[-2, -1], [-2, 1], [2, -1], [2, 1], [-1, -2], [1, -2], [-1, 2], [1, 2]].forEach(([dh, dc]) => {
      const a = h + dh, b = c + dc;
      if (!trong(a, b)) return;
      // Đi từ s tới đích: chân ở ô sát s theo hướng dài
      const chan = Math.abs(dh) === 2 ? (h + dh / 2) * 9 + c : h * 9 + c + dc / 2;
      md.push(a * 9 + b, chan);
      // Mã đứng ở đích chiếu s: chân ở ô sát con Mã, về phía s theo hướng dài
      const chan2 = Math.abs(dh) === 2 ? (h + dh / 2) * 9 + b : a * 9 + c + dc / 2;
      mc.push(a * 9 + b, chan2);
    });
    MA_DI.push(Int8Array.from(md)); MA_CHIEU.push(Int8Array.from(mc));
    const tv = [];
    [[-2, -2], [-2, 2], [2, -2], [2, 2]].forEach(([dh, dc]) => {
      const a = h + dh, b = c + dc;
      if (trong(a, b) && (a <= 4) === (h <= 4)) tv.push(a * 9 + b, (h + dh / 2) * 9 + c + dc / 2);
    });
    TV_DI.push(Int8Array.from(tv));
    const si = [], tg = [];
    if (cung(h, c)) {
      const ben = h >= 7 ? 0 : 1;
      [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([dh, dc]) => { if (cungBen(h + dh, c + dc, ben)) si.push((h + dh) * 9 + c + dc); });
      [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([dh, dc]) => { if (cungBen(h + dh, c + dc, ben)) tg.push((h + dh) * 9 + c + dc); });
    }
    SI_DI.push(Int8Array.from(si)); TG_DI.push(Int8Array.from(tg));
    for (let b = 0; b < 2; b++) {
      const r = [], tien = b === 0 ? -1 : 1, quaSong = b === 0 ? h <= 4 : h >= 5;
      if (trong(h + tien, c)) r.push((h + tien) * 9 + c);
      if (quaSong) { if (c > 0) r.push(h * 9 + c - 1); if (c < 8) r.push(h * 9 + c + 1); }
      TO_DI[b].push(Int8Array.from(r));
    }
  }
  for (let b = 0; b < 2; b++) {
    for (let s = 0; s < 90; s++) TO_CHIEU[b].push([]);
    // ô s của bên b bị Tốt bên kia đứng ở t dọa nếu Tốt đó đi được tới s
    for (let t = 0; t < 90; t++) TO_DI[1 - b][t].forEach(s => TO_CHIEU[b][s].push(t));
    TO_CHIEU[b] = TO_CHIEU[b].map(a => Int8Array.from(a));
  }

  // ---------- Điểm từng quân theo vị trí (nhìn từ phía Đỏ, hàng 0 ở trên), đã gồm giá trị quân ----------
  const BANG = {
    [TG]: [0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0,
      0,0,0,1,1,1,0,0,0, 0,0,0,2,2,2,0,0,0, 0,0,0,11,15,11,0,0,0],
    [SI]: [0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0,
      0,0,0,20,0,20,0,0,0, 0,0,0,0,23,0,0,0,0, 0,0,0,20,0,20,0,0,0],
    [TV]: [0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0,
      0,0,20,0,0,0,20,0,0, 0,0,0,0,0,0,0,0,0, 18,0,0,0,23,0,0,0,18, 0,0,0,0,0,0,0,0,0, 0,0,20,0,0,0,20,0,0],
    [MA]: [90,90,90,96,90,96,90,90,90, 90,96,103,97,94,97,103,96,90, 92,98,99,103,99,103,99,98,92, 93,108,100,107,100,107,100,108,93,
      90,100,99,103,104,103,99,100,90, 90,98,101,102,103,102,101,98,90, 92,94,98,95,98,95,98,94,92, 93,92,94,95,92,95,94,92,93,
      85,90,92,93,78,93,92,90,85, 88,85,90,88,90,88,90,85,88],
    [XE]: [206,208,207,213,214,213,207,208,206, 206,212,209,216,233,216,209,212,206, 206,208,207,214,216,214,207,208,206, 206,213,213,216,216,216,213,213,206,
      208,211,211,214,215,214,211,211,208, 208,212,212,214,215,214,212,212,208, 204,209,204,212,214,212,204,209,204, 198,208,204,212,212,212,204,208,198,
      200,208,206,212,200,212,206,208,200, 194,206,204,212,200,212,204,206,194],
    [PH]: [100,100,96,91,90,91,96,100,100, 98,98,96,92,89,92,96,98,98, 97,97,96,91,92,91,96,97,97, 96,99,99,98,100,98,99,99,96,
      96,96,96,96,100,96,96,96,96, 95,96,99,96,100,96,99,96,95, 96,96,96,96,96,96,96,96,96, 97,96,100,99,101,99,100,96,97,
      96,97,98,98,98,98,98,97,96, 96,96,97,99,99,99,97,96,96],
    [TO]: [9,9,9,11,13,11,9,9,9, 19,24,34,42,44,42,34,24,19, 19,24,32,37,37,37,32,24,19, 19,23,27,29,30,29,27,23,19, 14,18,20,27,29,27,20,18,14,
      7,0,13,0,16,0,13,0,7, 7,0,7,0,15,0,7,0,7, 0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0],
  };
  // GT[quân][ô]: Đen lật dọc bảng của Đỏ
  const GT = [];
  for (let p = 0; p < 16; p++) {
    const a = new Int16Array(90), t = p & 7;
    if (t) for (let s = 0; s < 90; s++) a[s] = BANG[t][p < 8 ? s : (9 - ((s / 9) | 0)) * 9 + s % 9];
    GT.push(a);
  }
  const GIA_AN = [0, 5000, 20, 20, 90, 200, 95, 12];   // để xếp thứ tự nước ăn

  // ---------- Mã băm Zobrist (hạt giống cố định, luồng nào cũng ra như nhau) ----------
  let hat = 0x2F6E2B1;
  const ngau = () => { hat ^= hat << 13; hat ^= hat >>> 17; hat ^= hat << 5; return hat | 0; };
  const ZL = new Int32Array(16 * 90), ZH = new Int32Array(16 * 90);
  for (let i = 0; i < ZL.length; i++) { ZL[i] = ngau(); ZH[i] = ngau(); }
  const ZBL = ngau(), ZBH = ngau();

  // ---------- Thế cờ ----------
  function The(fen) {
    this.ban = new Int8Array(90);
    this.ds = [new Int8Array(40), new Int8Array(40)];
    this.soQ = [0, 0];
    this.chiSo = new Int8Array(90);
    this.vua = [-1, -1];
    this.gt = [0, 0];
    this.ben = 0;
    this.kLo = 0; this.kHi = 0;
    this.n = 0; this.khongAn = 0;
    this.sNuoc = new Int32Array(CAP); this.sAn = new Int8Array(CAP);
    this.sKLo = new Int32Array(CAP); this.sKHi = new Int32Array(CAP);
    this.sChieu = new Int8Array(CAP); this.sKhong = new Int16Array(CAP);
    this.napFen(fen || FEN_DAU);
  }
  The.prototype.datQuan = function (s, p) {
    const b = p >> 3;
    this.ban[s] = p;
    this.chiSo[s] = this.soQ[b];
    this.ds[b][this.soQ[b]++] = s;
    this.gt[b] += GT[p][s];
    this.kLo ^= ZL[p * 90 + s]; this.kHi ^= ZH[p * 90 + s];
    if ((p & 7) === TG) this.vua[b] = s;
  };
  The.prototype.napFen = function (fen) {
    this.ban.fill(0); this.soQ[0] = this.soQ[1] = 0; this.vua[0] = this.vua[1] = -1; this.gt[0] = this.gt[1] = 0;
    this.kLo = 0; this.kHi = 0; this.n = 0; this.khongAn = 0;
    const [than, ben] = String(fen).trim().split(/\s+/);
    let h = 0, c = 0;
    for (const ch of than) {
      if (ch === '/') { h++; c = 0; continue; }
      if (ch >= '1' && ch <= '9') { c += +ch; continue; }
      const hoa = ch.toUpperCase(), hieu = hoa === 'E' ? 'B' : hoa === 'H' ? 'N' : hoa, t = FEN_CHU.indexOf(hieu);
      if (t <= 0 || h > 9 || c > 8) throw new Error('FEN sai: ' + fen);
      this.datQuan(h * 9 + c, ch === hoa ? t : t + 8);
      c++;
    }
    this.ben = ben === 'b' ? 1 : 0;
    if (this.ben) { this.kLo ^= ZBL; this.kHi ^= ZBH; }
    return this;
  };
  The.prototype.fen = function () {
    let r = '';
    for (let h = 0; h < 10; h++) {
      let trong = 0;
      for (let c = 0; c < 9; c++) {
        const p = this.ban[h * 9 + c];
        if (!p) { trong++; continue; }
        if (trong) { r += trong; trong = 0; }
        const ch = FEN_CHU[p & 7];
        r += p < 8 ? ch : ch.toLowerCase();
      }
      if (trong) r += trong;
      if (h < 9) r += '/';
    }
    return r + (this.ben ? ' b' : ' w');
  };
  The.prototype.di = function (m) {
    const tu = m & 255, den = m >> 8, b = this.ban, p = b[tu], an = b[den], me = this.ben, dich = 1 - me, n = this.n;
    this.sNuoc[n] = m; this.sAn[n] = an; this.sKLo[n] = this.kLo; this.sKHi[n] = this.kHi; this.sKhong[n] = this.khongAn; this.sChieu[n] = 0;
    this.n = n + 1;
    if (an) {
      const ds = this.ds[dich], i = this.chiSo[den], cuoi = ds[--this.soQ[dich]];
      ds[i] = cuoi; this.chiSo[cuoi] = i;
      this.kLo ^= ZL[an * 90 + den]; this.kHi ^= ZH[an * 90 + den];
      this.gt[dich] -= GT[an][den];
      this.khongAn = 0;
      if ((an & 7) === TG) this.vua[dich] = -1;
    } else this.khongAn++;
    const i = this.chiSo[tu];
    this.ds[me][i] = den; this.chiSo[den] = i;
    b[tu] = 0; b[den] = p;
    const q = p * 90;
    this.kLo ^= ZL[q + tu] ^ ZL[q + den] ^ ZBL; this.kHi ^= ZH[q + tu] ^ ZH[q + den] ^ ZBH;
    this.gt[me] += GT[p][den] - GT[p][tu];
    if ((p & 7) === TG) this.vua[me] = den;
    this.ben = dich;
  };
  The.prototype.lui = function () {
    const n = --this.n, m = this.sNuoc[n], tu = m & 255, den = m >> 8, an = this.sAn[n], b = this.ban, p = b[den], dich = this.ben, me = 1 - dich;
    const i = this.chiSo[den];
    this.ds[me][i] = tu; this.chiSo[tu] = i;
    b[tu] = p; b[den] = an;
    this.gt[me] += GT[p][tu] - GT[p][den];
    if ((p & 7) === TG) this.vua[me] = tu;
    if (an) {
      const k = this.soQ[dich]++;
      this.ds[dich][k] = den; this.chiSo[den] = k;
      this.gt[dich] += GT[an][den];
      if ((an & 7) === TG) this.vua[dich] = den;
    }
    this.kLo = this.sKLo[n]; this.kHi = this.sKHi[n]; this.khongAn = this.sKhong[n];
    this.ben = me;
  };
  The.prototype.diNull = function () {
    const n = this.n;
    this.sNuoc[n] = 0; this.sAn[n] = 0; this.sKLo[n] = this.kLo; this.sKHi[n] = this.kHi; this.sKhong[n] = this.khongAn; this.sChieu[n] = 0;
    this.n = n + 1;
    this.kLo ^= ZBL; this.kHi ^= ZBH; this.ben = 1 - this.ben;
  };
  The.prototype.luiNull = function () {
    const n = --this.n;
    this.kLo = this.sKLo[n]; this.kHi = this.sKHi[n]; this.ben = 1 - this.ben;
  };
  // Nước giả hợp lệ (chưa xét Tướng còn an toàn không), ghi vào ra từ vị trí n, trả n mới
  The.prototype.sinh = function (ra, n, chiAn) {
    const b = this.ban, me = this.ben, ds = this.ds[me], so = this.soQ[me];
    for (let i = 0; i < so; i++) {
      const s = ds[i], t = b[s] & 7;
      if (t === XE) {
        const tia = TIA[s];
        for (let d = 0; d < 4; d++) {
          const r = tia[d], L = r.length;
          for (let j = 0; j < L; j++) {
            const o = r[j], q = b[o];
            if (!q) { if (!chiAn) ra[n++] = s | (o << 8); } else { if ((q >> 3) !== me) ra[n++] = s | (o << 8); break; }
          }
        }
      } else if (t === PH) {
        const tia = TIA[s];
        for (let d = 0; d < 4; d++) {
          const r = tia[d], L = r.length;
          let j = 0;
          for (; j < L; j++) {
            const o = r[j];
            if (b[o]) break;
            if (!chiAn) ra[n++] = s | (o << 8);
          }
          for (j++; j < L; j++) {
            const o = r[j], q = b[o];
            if (q) { if ((q >> 3) !== me) ra[n++] = s | (o << 8); break; }
          }
        }
      } else if (t === MA) {
        const a = MA_DI[s];
        for (let j = 0; j < a.length; j += 2) {
          if (b[a[j + 1]]) continue;
          const o = a[j], q = b[o];
          if (q ? (q >> 3) !== me : !chiAn) ra[n++] = s | (o << 8);
        }
      } else if (t === TO) {
        const a = TO_DI[me][s];
        for (let j = 0; j < a.length; j++) {
          const o = a[j], q = b[o];
          if (q ? (q >> 3) !== me : !chiAn) ra[n++] = s | (o << 8);
        }
      } else if (t === TV) {
        const a = TV_DI[s];
        for (let j = 0; j < a.length; j += 2) {
          if (b[a[j + 1]]) continue;
          const o = a[j], q = b[o];
          if (q ? (q >> 3) !== me : !chiAn) ra[n++] = s | (o << 8);
        }
      } else {
        const a = t === SI ? SI_DI[s] : TG_DI[s];
        for (let j = 0; j < a.length; j++) {
          const o = a[j], q = b[o];
          if (q ? (q >> 3) !== me : !chiAn) ra[n++] = s | (o << 8);
        }
      }
    }
    return n;
  };
  // Ô k của bên ben có bị bên kia đánh tới không (kể cả hai Tướng đối mặt nếu k là ô Tướng)
  The.prototype.biDanh = function (k, ben) {
    const b = this.ban, dich = (1 - ben) << 3, xe = dich | XE, ph = dich | PH, ma = dich | MA, to = dich | TO, tg = dich | TG;
    const tia = TIA[k];
    for (let d = 0; d < 4; d++) {
      const r = tia[d], L = r.length;
      let j = 0, q = 0;
      for (; j < L; j++) { q = b[r[j]]; if (q) break; }
      if (j >= L) continue;
      if (q === xe || q === tg) return true;
      for (j++; j < L; j++) { q = b[r[j]]; if (q) { if (q === ph) return true; break; } }
    }
    const a = MA_CHIEU[k];
    for (let j = 0; j < a.length; j += 2) if (b[a[j]] === ma && !b[a[j + 1]]) return true;
    const c = TO_CHIEU[ben][k];
    for (let j = 0; j < c.length; j++) if (b[c[j]] === to) return true;
    return false;
  };
  The.prototype.biChieu = function (ben) {
    const k = this.vua[ben];
    return k < 0 ? false : this.biDanh(k, ben);
  };
  // Đi nước có ghi cờ "chiếu" (cần cho luật lặp nước / trường chiếu)
  The.prototype.diGhi = function (m) { this.di(m); this.sChieu[this.n - 1] = this.biChieu(this.ben) ? 1 : 0; };
  const DEM_TAM = new Int32Array(256);
  The.prototype.hopLe = function () {
    const n = this.sinh(DEM_TAM, 0, false), me = this.ben, kq = [];
    const ds = Array.from(DEM_TAM.subarray(0, n));
    for (const m of ds) { this.di(m); if (!this.biChieu(me)) kq.push(m); this.lui(); }
    return kq;
  };
  The.prototype.coNuoc = function () {
    const n = this.sinh(DEM_TAM, 0, false), me = this.ben;
    const ds = Array.from(DEM_TAM.subarray(0, n));
    for (const m of ds) { this.di(m); const ok = !this.biChieu(me); this.lui(); if (ok) return true; }
    return false;
  };
  // Lặp thế: trả 0 nếu chưa lặp đủ `lan` lần; bit 1 lặp, bit 2 bên đang đi đã chiếu liên tục, bit 4 đối phương đã chiếu liên tục
  The.prototype.lap = function (lan) {
    let minh = false, minhChieu = true, doiChieu = true;
    for (let i = this.n - 1; i >= 0; i--) {
      if (this.sNuoc[i] === 0 || this.sAn[i] !== 0) break;
      if (minh) {
        minhChieu = minhChieu && !!this.sChieu[i];
        if (this.sKLo[i] === this.kLo && this.sKHi[i] === this.kHi && --lan === 0) return 1 | (minhChieu ? 2 : 0) | (doiChieu ? 4 : 0);
      } else doiChieu = doiChieu && !!this.sChieu[i];
      minh = !minh;
    }
    return 0;
  };
  The.prototype.perft = function (d) {
    if (d === 0) return 1;
    const me = this.ben, ra = new Int32Array(256), n = this.sinh(ra, 0, false);
    let dem = 0;
    for (let i = 0; i < n; i++) {
      this.di(ra[i]);
      if (!this.biChieu(me)) dem += d === 1 ? 1 : this.perft(d - 1);
      this.lui();
    }
    return dem;
  };

  // Nước đi dạng chữ ô: 'h2e2' (cột a..i từ trái sang khi Đỏ nhìn, hàng 0 ở đáy Đỏ)
  const oChu = s => 'abcdefghi'[s % 9] + (9 - ((s / 9) | 0));
  const chuO = t => (9 - +t[1]) * 9 + 'abcdefghi'.indexOf(t[0]);
  const nuocChu = m => oChu(m & 255) + oChu(m >> 8);
  const chuNuoc = t => chuO(t.slice(0, 2)) | (chuO(t.slice(2, 4)) << 8);

  // Dựng thế từ FEN đầu + danh sách nước (chuỗi chữ ô), có đủ lịch sử để xét lặp nước
  function dungThe(fen, ds) {
    const T = new The(fen || FEN_DAU);
    (ds || []).forEach(t => T.diGhi(typeof t === 'number' ? t : chuNuoc(t)));
    return T;
  }

  // Ván đã kết thúc chưa. Trả null hoặc { thang: 0|1|null, kieu, ... }
  function ketThuc(T) {
    if (!T.coNuoc()) return { thang: 1 - T.ben, kieu: T.biChieu(T.ben) ? 'bi' : 'het' };
    const st = T.lap(2);   // thế hiện tại đã xuất hiện 3 lần
    if (st) {
      if ((st & 2) && !(st & 4)) return { thang: 1 - T.ben, kieu: 'truong' };   // bên đang đi đã chiếu liên tục
      if ((st & 4) && !(st & 2)) return { thang: T.ben, kieu: 'truong' };
      return { thang: null, kieu: 'lap' };
    }
    if (T.khongAn >= 120) return { thang: null, kieu: 'sau-muoi' };
    let tan = 0;
    for (let b = 0; b < 2; b++) for (let i = 0; i < T.soQ[b]; i++) {
      const t = T.ban[T.ds[b][i]] & 7;
      if (t === XE || t === MA || t === PH || t === TO) tan++;
    }
    if (!tan) return { thang: null, kieu: 'thieu' };
    return null;
  }

  // ---------- Bộ tìm nước đi ----------
  function MayTim() {
    const MAX_PLY = 72, RONG = 128;
    const TT_N = 1 << 19, TT_M = TT_N - 1;
    const ttK = new Int32Array(TT_N), ttV = new Int16Array(TT_N), ttM = new Uint16Array(TT_N), ttD = new Int8Array(TT_N), ttF = new Uint8Array(TT_N);
    const MV = new Int32Array(MAX_PLY * RONG), DS = new Int32Array(MAX_PLY * RONG);
    const HIS = new Int32Array(1 << 15);
    const KIL = new Int32Array(MAX_PLY * 2);
    const PV = new Int32Array(MAX_PLY * MAX_PLY), PVN = new Int32Array(MAX_PLY);
    let T = null, dung = false, nut = 0, hanGio = Infinity, hanNut = Infinity, khongQS = false, coiNhe = false, trangThaiGoc = 0;
    const gio = typeof performance !== 'undefined' ? () => performance.now() : () => Date.now();

    function kiemGio() { if (nut >= hanNut || gio() >= hanGio) dung = true; }

    // Đánh giá từ phía bên đang đi. Điểm theo vị trí tính sẵn; phần động chỉ tính khi còn sát cửa sổ a..b
    function danhGia(a, b) {
      const me = T.ben, tinh = T.gt[me] - T.gt[1 - me] + 3;
      if (coiNhe || tinh + 130 < a || tinh - 130 > b) return tinh;
      return tinh + (me ? -dong() : dong());
    }
    // Phần động: Đỏ trừ Đen. Mã kẹt chân, Xe ít đường, Pháo nhắm thẳng Tướng, thiếu Sĩ Tượng khi đối phương còn quân đánh
    function dong() {
      const B = T.ban;
      let kq = 0;
      for (let ben = 0; ben < 2; ben++) {
        const ds = T.ds[ben], so = T.soQ[ben], kDich = T.vua[1 - ben];
        const cotDich = kDich < 0 ? -1 : kDich % 9;
        let d = 0, soXe = 0, soKhac = 0;
        for (let i = 0; i < so; i++) {
          const s = ds[i], t = B[s] & 7;
          if (t === MA) {
            soKhac++;
            const a = MA_DI[s];
            let bi = 0;
            for (let j = 1; j < a.length; j += 2) if (B[a[j]]) bi++;
            d -= bi * 3;
            // Mã đứng được đâu: số đường đi thực ít quá là kẹt
            if (a.length - bi * 2 <= 4) d -= 6;
          } else if (t === XE) {
            soXe++;
            const tia = TIA[s];
            let mo = 0;
            for (let k = 0; k < 4; k++) {
              const r = tia[k];
              for (let j = 0; j < r.length; j++) { if (B[r[j]]) break; mo++; }
            }
            d += mo;
          } else if (t === PH) {
            soKhac++;
            if (s % 9 === cotDich) {
              // Đếm quân chắn giữa Pháo và Tướng đối phương trên cùng cột
              const buoc = kDich > s ? 9 : -9;
              let chan = 0;
              for (let o = s + buoc; o !== kDich; o += buoc) if (B[o]) chan++;
              if (chan === 0) d += 28;       // Pháo trống: chỉ cần ngòi là chiếu
              else if (chan === 2) d += 8;
            }
          }
        }
        // Thiếu quân thủ thì nguy hiểm hơn khi đối phương có nhiều quân đánh (tính cho bên kia ở vòng dưới)
        const lucDanh = soXe * 2 + soKhac;
        if (lucDanh >= 3) {
          const dsD = T.ds[1 - ben], soD = T.soQ[1 - ben];
          let soSi = 0, soTv = 0;
          for (let i = 0; i < soD; i++) { const t = B[dsD[i]] & 7; if (t === SI) soSi++; else if (t === TV) soTv++; }
          d += (2 - soSi) * 7 + (2 - soTv) * 5;
        }
        kq += ben === 0 ? d : -d;
      }
      return kq;
    }
    const giaTriLap = (st, ply) => {
      let v = 0;
      if (st & 2) v += ply - CAM;
      if (st & 4) v += CAM - ply;
      return v;
    };
    function duocNull() {
      const me = T.ben, ds = T.ds[me], so = T.soQ[me], B = T.ban;
      let luc = 0;
      for (let i = 0; i < so; i++) {
        const t = B[ds[i]] & 7;
        if (t === XE) luc += 2; else if (t === MA || t === PH) luc += 1;
      }
      return luc >= 2;
    }
    function ghiTT(doSau, v, m, co, ply) {
      const i = T.kLo & TT_M;
      if (ttK[i] === T.kHi && ttD[i] > doSau && co !== 1) return;
      ttK[i] = T.kHi; ttD[i] = doSau; ttF[i] = co; ttM[i] = m;
      ttV[i] = v > THANG ? v + ply : v < -THANG ? v - ply : v;
    }

    // Tĩnh hóa: chỉ xét ăn quân (đang bị chiếu thì xét mọi nước thoát)
    function tinh(a, b, ply) {
      nut++;
      if ((nut & 2047) === 0) kiemGio();
      if (dung) return 0;
      if (a < -MATE + ply) a = -MATE + ply;
      if (b > MATE - ply - 1) b = MATE - ply - 1;
      if (a >= b) return a;
      if (ply >= MAX_PLY - 1) return danhGia(a, b);
      const me = T.ben, n0 = ply * RONG, chieu = T.sChieu[T.n - 1];
      let tot = -VC, dung0 = 0;
      if (!chieu) {
        dung0 = danhGia(a, b);
        if (dung0 >= b) return dung0;
        if (dung0 > a) a = dung0;
        tot = dung0;
      }
      const n = T.sinh(MV, n0, !chieu), B = T.ban;
      for (let i = n0; i < n; i++) {
        const m = MV[i], an = B[m >> 8] & 7, tu = B[m & 255] & 7;
        DS[i] = an ? GIA_AN[an] * 16 - GIA_AN[tu] : 0;
      }
      let daDi = 0;
      for (let i = n0; i < n; i++) {
        let k = i;
        for (let j = i + 1; j < n; j++) if (DS[j] > DS[k]) k = j;
        const m = MV[k]; MV[k] = MV[i]; DS[k] = DS[i];
        // Cắt tỉa theo giá trị quân bị ăn: ăn cũng không đủ kéo lên a thì bỏ
        if (!chieu && dung0 + GIA_AN[B[m >> 8] & 7] + 40 < a) continue;
        T.di(m);
        if (T.biChieu(me)) { T.lui(); continue; }
        T.sChieu[T.n - 1] = T.biChieu(T.ben) ? 1 : 0;
        daDi++;
        const v = -tinh(-b, -a, ply + 1);
        T.lui();
        if (dung) return 0;
        if (v > tot) {
          tot = v;
          if (v >= b) return v;
          if (v > a) a = v;
        }
      }
      if (chieu && !daDi) return -MATE + ply;
      return tot;
    }

    function tk(doSau, a, b, ply, choNull) {
      if (ply >= MAX_PLY - 1) return danhGia(a, b);
      PVN[ply] = 0;
      if (doSau <= 0) return khongQS ? danhGia(a, b) : tinh(a, b, ply);
      nut++;
      if ((nut & 2047) === 0) kiemGio();
      if (dung) return 0;
      const laPV = b - a > 1;
      if (T.khongAn >= 4) {
        const st = T.lap(1);
        if (st) return giaTriLap(st, ply);
      }
      if (T.khongAn >= 120) return 0;
      if (a < -MATE + ply) a = -MATE + ply;
      if (b > MATE - ply - 1) b = MATE - ply - 1;
      if (a >= b) return a;
      const me = T.ben, chieu = T.sChieu[T.n - 1];
      // Bảng băm
      const iTT = T.kLo & TT_M;
      let mTT = 0;
      if (ttK[iTT] === T.kHi) {
        mTT = ttM[iTT];
        if (ttD[iTT] >= doSau && !laPV) {
          let v = ttV[iTT];
          if (v > THANG) v -= ply; else if (v < -THANG) v += ply;
          const f = ttF[iTT];
          if (f === 1 || (f === 2 && v >= b) || (f === 3 && v <= a)) return v;
        }
      }
      if (!laPV && !chieu && !khongQS) {
        // Thế quá tốt ở gần đáy: khỏi tìm tiếp
        if (doSau <= 2) {
          const e = danhGia(b - 200, b + 200);
          if (e - 45 * doSau >= b && Math.abs(b) < THANG) return e;
        }
        // Nước trống: cho đối phương đi hai lần mà vẫn hơn thì cắt
        if (choNull && doSau >= 3 && duocNull()) {
          T.diNull();
          const R = doSau >= 6 ? 3 : 2;
          const v = -tk(doSau - 1 - R, -b, -b + 1, ply + 1, false);
          T.luiNull();
          if (dung) return 0;
          if (v >= b && v < THANG) return v;
        }
      }
      // Chưa có nước băm ở nút PV sâu: tìm nông lấy nước tốt
      if (laPV && !mTT && doSau >= 4 && !khongQS) {
        tk(doSau - 2, a, b, ply, false);
        if (dung) return 0;
        if (ttK[iTT] === T.kHi) mTT = ttM[iTT];
      }
      const n0 = ply * RONG, n = T.sinh(MV, n0, false), B = T.ban;
      const k1 = KIL[ply * 2], k2 = KIL[ply * 2 + 1];
      for (let i = n0; i < n; i++) {
        const m = MV[i], an = B[m >> 8] & 7;
        if (m === mTT) DS[i] = 1 << 30;
        else if (an) DS[i] = (1 << 24) + GIA_AN[an] * 16 - GIA_AN[B[m & 255] & 7];
        else if (m === k1) DS[i] = (1 << 23) + 1;
        else if (m === k2) DS[i] = 1 << 23;
        else DS[i] = HIS[m];
      }
      let tot = -VC, mTot = 0, daDi = 0, co = 3;
      for (let i = n0; i < n; i++) {
        let k = i;
        for (let j = i + 1; j < n; j++) if (DS[j] > DS[k]) k = j;
        const m = MV[k], dsm = DS[k]; MV[k] = MV[i]; DS[k] = DS[i];
        const an = B[m >> 8];
        T.di(m);
        if (T.biChieu(me)) { T.lui(); continue; }
        const c = T.biChieu(T.ben);
        T.sChieu[T.n - 1] = c ? 1 : 0;
        daDi++;
        let nd = doSau - 1;
        if (c && ply < 2 * trangThaiGoc + 10) nd++;   // đang chiếu: đi sâu thêm một nước
        let v;
        if (daDi === 1) v = -tk(nd, -b, -a, ply + 1, true);
        else {
          let giam = 0;
          if (doSau >= 3 && daDi > 3 && !chieu && !c && !an && dsm < (1 << 23)) giam = daDi > 12 && doSau >= 5 ? 2 : 1;
          v = -tk(nd - giam, -a - 1, -a, ply + 1, true);
          if (v > a && (giam || laPV) && !dung) v = -tk(nd, -b, -a, ply + 1, true);
        }
        T.lui();
        if (dung) return 0;
        if (v > tot) {
          tot = v;
          if (v > a) {
            a = v; mTot = m; co = 1;
            if (laPV) {
              const con = PVN[ply + 1], d = ply * MAX_PLY, g = (ply + 1) * MAX_PLY;
              PV[d] = m;
              for (let j = 0; j < con; j++) PV[d + 1 + j] = PV[g + j];
              PVN[ply] = con + 1;
            }
            if (v >= b) {
              co = 2;
              if (!an) {
                HIS[m] += doSau * doSau;
                if (HIS[m] > 8000000) for (let j = 0; j < HIS.length; j++) HIS[j] >>= 1;
                if (k1 !== m) { KIL[ply * 2 + 1] = k1; KIL[ply * 2] = m; }
              }
              break;
            }
          } else if (!mTot) mTot = m;
        }
      }
      if (!daDi) return -MATE + ply;   // bí hoặc hết nước đều là thua
      ghiTT(doSau, tot, mTot, co, ply);
      return tot;
    }

    function layPV(m) {
      const con = PVN[1], r = [m];
      for (let j = 0; j < con; j++) r.push(PV[MAX_PLY + j]);
      return r;
    }

    // o: ms, doSau, nut, nhieu (biên độ nhiễu cấp thấp), khongQS, coiNhe, loaiTru: [nước], ngauNhien: xác suất đi bừa
    function tim(T0, o) {
      o = o || {};
      T = T0; dung = false; nut = 0;
      const t0 = gio();
      hanGio = o.ms ? t0 + o.ms : Infinity;
      hanNut = o.nut || Infinity;
      khongQS = !!o.khongQS; coiNhe = !!o.coiNhe;
      KIL.fill(0);
      for (let j = 0; j < HIS.length; j++) HIS[j] >>= 2;
      if (T.n === 0) { T.sChieu[0] = 0; }
      // Ngăn xếp cần có một phần tử trước gốc để đọc cờ "đang bị chiếu"
      const chieuGoc = T.biChieu(T.ben);
      if (T.n > 0) T.sChieu[T.n - 1] = chieuGoc ? 1 : 0;
      const loai = o.loaiTru || [];
      let goc = T.hopLe().filter(m => loai.indexOf(m) < 0);
      if (!goc.length) return { nuoc: 0, diem: chieuGoc || !T.coNuoc() ? -MATE : 0, doSau: 0, pv: [], nut: 0 };
      if (o.ngauNhien && Math.random() < o.ngauNhien) {
        return { nuoc: goc[(Math.random() * goc.length) | 0], diem: 0, doSau: 0, pv: [], nut: 0, bua: true };
      }
      const B = T.ban, maxD = o.doSau || 40;
      // Thứ tự đầu: nước băm, ăn quân giá trị cao
      const iG = T.kLo & TT_M, mBam = ttK[iG] === T.kHi ? ttM[iG] : 0;
      const thuTu = new Map();
      goc.forEach(m => thuTu.set(m, (m === mBam ? 1e6 : 0) + (B[m >> 8] ? GIA_AN[B[m >> 8] & 7] * 16 - GIA_AN[B[m & 255] & 7] : 0)));
      goc.sort((x, y) => thuTu.get(y) - thuTu.get(x));
      let kq = { nuoc: goc[0], diem: 0, doSau: 0, pv: [goc[0]], nut: 0 };
      const chamDiem = new Map();
      for (let d = 1; d <= maxD; d++) {
        trangThaiGoc = d;
        let a = -VC, tot = 0, pvTot = null, xongMot = false;
        for (let i = 0; i < goc.length; i++) {
          const m = goc[i];
          T.di(m);
          const c = T.biChieu(T.ben);
          T.sChieu[T.n - 1] = c ? 1 : 0;
          // Nếu đi nước này mà lặp thế (ở gốc): chấm như trong cây
          let v;
          const nd = d - 1 + (c ? 1 : 0);
          if (o.nhieu) {
            v = -tk(nd, -VC, VC, 1, true);
          } else if (i === 0) {
            v = -tk(nd, -VC, VC, 1, true);
          } else {
            v = -tk(nd, -a - 1, -a, 1, true);
            if (v > a && !dung) v = -tk(nd, -VC, -a, 1, true);
          }
          T.lui();
          if (dung) break;
          xongMot = true;
          chamDiem.set(m, o.nhieu ? v : (i === 0 || v > a ? v : a - 1 - i));
          if (v > a) { a = v; tot = m; pvTot = layPV(m); }
        }
        if (xongMot && tot) {
          kq = { nuoc: tot, diem: a, doSau: d, pv: pvTot, nut };
          // Nước tốt nhất lên đầu, còn lại theo điểm vòng trước
          goc.sort((x, y) => (y === tot) - (x === tot) || (chamDiem.get(y) || -VC) - (chamDiem.get(x) || -VC));
        }
        if (dung) break;
        if (Math.abs(a) > THANG && MATE - Math.abs(a) <= d) break;   // đã thấy đường bí ngắn nhất ở độ sâu này
        if (goc.length === 1 && d >= 3) break;
        if (o.ms && gio() - t0 > o.ms * 0.55) break;   // vòng sau khó kịp, để dành thời gian
      }
      kq.nut = nut;
      kq.ms = Math.round(gio() - t0);
      if (o.nhieu) {
        let chon = kq.nuoc, max = -VC;
        goc.forEach(m => {
          const v = (chamDiem.has(m) ? chamDiem.get(m) : -VC) + (Math.random() * 2 - 1) * o.nhieu;
          if (v > max) { max = v; chon = m; }
        });
        if (chon !== kq.nuoc) { kq.nuoc = chon; kq.pv = [chon]; }
      }
      return kq;
    }

    // Nhiều nước ứng viên: tìm lần lượt, mỗi lần loại những nước đã chọn
    function timNhieu(T0, o) {
      const soNuoc = o.soNuoc || 3, ds = [], loai = [];
      const tong = o.ms || 300;
      for (let k = 0; k < soNuoc; k++) {
        const ms = k === 0 ? tong * 0.6 : tong * 0.4 / Math.max(1, soNuoc - 1);
        const r = tim(T0, Object.assign({}, o, { ms, loaiTru: loai.slice() }));
        if (!r.nuoc) break;
        ds.push(r);
        loai.push(r.nuoc);
      }
      return ds;
    }

    // ---------- Giải chiếu bí: chứng minh chắc chắn, không dùng đánh giá ----------
    function giaiBi(T0, nMax, o) {
      o = o || {};
      const chiChieu = !!o.chiChieu;
      T = T0; nut = 0; dung = false;
      hanGio = o.ms ? gio() + o.ms : Infinity;
      hanNut = o.nut || Infinity;
      const nho = new Map();
      const khoa = n => ((T.kHi & 0xFFFF) * 4294967296 + (T.kLo >>> 0)) * 16 + n;   // 52 bit: số thực JS giữ đủ, n không bị mất
      function cong(n) {
        nut++;
        if ((nut & 1023) === 0) kiemGio();
        if (dung) return 0;
        const k = khoa(n);
        const nhoLai = nho.get(k);
        if (nhoLai !== undefined) return nhoLai;
        const ds = T.hopLe();
        // Nước chiếu, nước ăn lên trước
        const dsDiem = [];
        for (const m of ds) {
          const an = T.ban[m >> 8] & 7;
          T.di(m);
          const c = T.biChieu(T.ben);
          T.lui();
          if (chiChieu && !c) continue;
          dsDiem.push([m, (c ? 100000 : 0) + GIA_AN[an], c]);
        }
        dsDiem.sort((x, y) => y[1] - x[1]);
        let kq = 0;
        for (const [m, , c] of dsDiem) {
          T.di(m);
          T.sChieu[T.n - 1] = c ? 1 : 0;
          const ok = !lapXau() && thu(n - 1);
          T.lui();
          if (dung) return 0;
          if (ok) { kq = m; break; }
        }
        nho.set(k, kq);
        return kq;
      }
      // Trong lời giải không được dẫn tới lặp thế
      function lapXau() { return T.khongAn >= 4 && T.lap(1) !== 0; }
      function thu(n) {
        nut++;
        const ds = T.hopLe();
        if (!ds.length) return true;
        if (n <= 0) return false;
        for (const m of ds) {
          T.di(m);
          T.sChieu[T.n - 1] = T.biChieu(T.ben) ? 1 : 0;
          const ok = cong(n) !== 0;
          T.lui();
          if (dung) return false;
          if (!ok) return false;
        }
        return true;
      }
      // Số nước ít nhất để bên đang đi (đang công) bí được, tối đa n
      function itNhat(nToi) { for (let i = 1; i <= nToi; i++) { if (cong(i)) return i; if (dung) return 0; } return 0; }
      // Bên thủ đang đi: chọn nước chống được lâu nhất
      function chongLau(n) {
        let tot = 0, dai = -1;
        for (const m of T.hopLe()) {
          T.diGhi(m);
          const d = itNhat(n);
          T.lui();
          if (d > dai) { dai = d; tot = m; }
        }
        return [tot, dai];
      }
      const dat = itNhat(nMax);
      if (!dat) return { n: 0, pv: [], het: dung, nut };
      const pv = [];
      let con = dat, da = 0;
      while (con > 0) {
        const m = cong(con);
        if (!m) break;
        pv.push(m); T.diGhi(m); da++;
        if (!T.coNuoc()) break;
        const [tra, d] = chongLau(con - 1);
        pv.push(tra); T.diGhi(tra); da++;
        con = d;
      }
      while (da-- > 0) T.lui();
      return { n: dat, pv, het: false, nut };
    }

    // Tất cả các nước đầu đều thử: nước nào bí được trong đúng n nước (để kiểm thế có lời giải duy nhất)
    function nuocBi(T0, n, o) {
      const ds = T0.hopLe(), kq = [];
      for (const m of ds) {
        T0.di(m);
        T0.sChieu[T0.n - 1] = T0.biChieu(T0.ben) ? 1 : 0;
        let ok = false;
        if (!T0.coNuoc()) ok = true;
        else if (n > 1) {
          ok = true;
          for (const r of T0.hopLe()) {
            T0.di(r);
            T0.sChieu[T0.n - 1] = T0.biChieu(T0.ben) ? 1 : 0;
            const g = giaiBi(T0, n - 1, o);
            T0.lui();
            if (!g.n) { ok = false; break; }
          }
        }
        T0.lui();
        if (ok) kq.push(m);
      }
      return kq;
    }

    return { tim, timNhieu, giaiBi, nuocBi, datCoiNhe(v) { coiNhe = v; }, xoaBam() { ttK.fill(0); ttM.fill(0); HIS.fill(0); } };
  }

  // Sáu mức của máy. nhieu: biên độ nhiễu khi chọn nước (mức thấp hay chọn lệch); ngauNhien: xác suất đi bừa
  const MUC = [
    { so: 1, ten: 'Tập đi', mo: 'Chỉ nhìn một nước, hay hớ quân. Hợp để tập luật.', o: { doSau: 1, khongQS: true, nhieu: 70, ngauNhien: 0.12 } },
    { so: 2, ten: 'Mới biết', mo: 'Nhìn hai nước, thỉnh thoảng để sót quân.', o: { doSau: 2, khongQS: true, nhieu: 40, ngauNhien: 0.04 } },
    { so: 3, ten: 'Phong trào', mo: 'Nhìn ba nước, biết ăn và biết đổi quân.', o: { doSau: 3, nhieu: 20 }, sach: 4 },
    { so: 4, ten: 'Khá', mo: 'Nhìn năm nước, ít khi hớ quân.', o: { doSau: 5, ms: 500, nhieu: 6 }, sach: 8 },
    { so: 5, ten: 'Giỏi', mo: 'Nghĩ khoảng 1 giây mỗi nước.', o: { ms: 1000 }, sach: 14 },
    { so: 6, ten: 'Cao thủ', mo: 'Nghĩ khoảng 3 giây mỗi nước.', o: { ms: 3000 }, sach: 20 },
  ];

  const API = {
    MUC, The, MayTim, dungThe, ketThuc, nuocChu, chuNuoc, oChu, chuO,
    FEN_DAU, MATE, THANG, CAM, TG, SI, TV, MA, XE, PH, TO,
    TIA, MA_DI, MA_CHIEU, TV_DI, SI_DI, TG_DI, TO_DI, cungBen,
  };
  goc.CoLoi = API;

  // ---------- Khi chạy trong Web Worker: nhận lệnh, trả kết quả ----------
  if (typeof goc.importScripts === 'function' && typeof goc.document === 'undefined') {
    const may = MayTim();
    goc.onmessage = e => {
      const d = e.data, id = d.id;
      try { goc.postMessage({ id, ok: true, kq: lamViec(may, dungThe, d) }); }
      catch (loi) { goc.postMessage({ id, ok: false, loi: String(loi) }); }
    };
    goc.postMessage({ id: 0, ok: true, san: true });
  }
  function lamViec(mayX, dung, d) {
    if (d.viec === 'ping') return 'pong';
    if (d.viec === 'xoa') { mayX.xoaBam(); return true; }
    const T = dung(d.fen, d.ds);
    if (d.viec === 'tim') return mayX.tim(T, d.o);
    if (d.viec === 'nhieu') return mayX.timNhieu(T, d.o);
    if (d.viec === 'giai') return mayX.giaiBi(T, d.n, d.o);
    throw new Error('Không rõ việc: ' + d.viec);
  }
  API.lamViec = lamViec;
  return API;
}
if (typeof window !== 'undefined') COTUONG_LOI(window);
else if (typeof module !== 'undefined') module.exports = COTUONG_LOI({});
