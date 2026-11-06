/* Đọc thế cờ bằng lời cho người mới: ghi nước đi, vì sao không đi được, ai đang dọa ai, bản đồ lực, tổng quan, nhận xét nước đi.
   Chạy ở luồng chính và Node, không tìm sâu (phần tìm sâu do co_may.js làm rồi đưa kết quả vào đây). */
function COTUONG_PT(L) {
  'use strict';
  const { The, TG, SI, TV, MA, XE, PH, TO, TIA, MA_DI, TV_DI, SI_DI, TG_DI, TO_DI, THANG, MATE, cungBen } = L;
  const TEN = ['', 'Tướng', 'Sĩ', 'Tượng', 'Mã', 'Xe', 'Pháo', 'Tốt'];
  const KY = ['', 'Tg', 'S', 'T', 'M', 'X', 'P', 'B'];
  const BEN = ['Đỏ', 'Đen'];
  const hang = s => (s / 9) | 0, cotTrai = s => s % 9;
  const cot = (s, ben) => (ben === 0 ? 9 - s % 9 : s % 9 + 1);   // số cột theo cách đếm của bên đó: từ tay phải sang
  const quaSong = (s, ben) => (ben === 0 ? hang(s) <= 4 : hang(s) >= 5);
  // Gọi tên quân kèm màu và số cột của chính bên đó (Đỏ đọc số ở mép dưới bàn, Đen đọc số ở mép trên)
  const tenQuan = (p, s) => `${TEN[p & 7]} ${BEN[p >> 3]} cột ${cot(s, p >> 3)}`;
  // Giá trị quy ước để so đổi quân, đơn vị "Tốt"
  const giaTri = (p, s) => {
    const t = p & 7;
    if (t === XE) return 9;
    if (t === PH) return 4.5;
    if (t === MA) return 4;
    if (t === SI || t === TV) return 2;
    if (t === TO) return s != null && quaSong(s, p >> 3) ? 2 : 1;
    return t === TG ? 1000 : 0;
  };

  // ---------- Ghi nước đi kiểu Việt: P2-5, M8.7, X1/2, Xt.1 ----------
  function ghi(T, m) {
    const tu = m & 255, den = m >> 8, p = T.ban[tu], t = p & 7, ben = p >> 3, h = hang(tu), hd = hang(den), c = tu % 9;
    const cung = [];
    for (let r = 0; r < 10; r++) if (T.ban[r * 9 + c] === p) cung.push(r);
    cung.sort((a, b) => (ben === 0 ? a - b : b - a));   // quân gần phía đối phương đứng trước
    let nhan = String(cot(tu, ben)), nhanChu = nhan;
    if (cung.length >= 2) {
      const i = cung.indexOf(h);
      const tom = cung.length === 2 ? 'ts' : cung.length === 3 ? 'tgs' : null;
      const nhanVi = tom ? tom[i] : String(i + 1);
      const chuVi = tom ? { t: 'trước', g: 'giữa', s: 'sau' }[tom[i]] : `thứ ${i + 1}`;
      // Hai cột cùng có Tốt chồng nhau thì ghi thêm số cột cho khỏi nhầm
      let cotKhac = false;
      if (t === TO) for (let k = 0; k < 9 && !cotKhac; k++) {
        if (k === c) continue;
        let dem = 0;
        for (let r = 0; r < 10; r++) if (T.ban[r * 9 + k] === p) dem++;
        if (dem >= 2) cotKhac = true;
      }
      nhan = cotKhac ? `${cot(tu, ben)}${nhanVi}` : nhanVi;
      nhanChu = cotKhac ? `${cot(tu, ben)} ${chuVi}` : chuVi;
    }
    let dau, so;
    if (hd === h) { dau = '-'; so = cot(den, ben); }
    else {
      dau = (ben === 0 ? hd < h : hd > h) ? '.' : '/';
      so = t === MA || t === SI || t === TV ? cot(den, ben) : Math.abs(hd - h);
    }
    return { ky: `${KY[t]}${nhan}${dau}${so}`, chu: `${TEN[t]} ${nhanChu} ${{ '.': 'tiến', '/': 'lùi', '-': 'ngang sang' }[dau]} ${so}` };
  }
  function docNuoc(T, ky) {
    const can = String(ky).trim();
    for (const m of T.hopLe()) if (ghi(T, m).ky === can) return m;
    return 0;
  }
  // Đi một chuỗi ký hiệu từ FEN, trả danh sách chữ ô (dùng cho sách khai cuộc và bài học). Sai nước thì ném lỗi rõ chỗ
  function chuoiNuoc(fen, chuoi) {
    const T = new The(fen || L.FEN_DAU), ra = [];
    String(chuoi).trim().split(/\s+/).filter(Boolean).forEach((ky, i) => {
      const m = docNuoc(T, ky);
      if (!m) throw new Error(`Nước ${i + 1} "${ky}" không hợp lệ ở thế ${T.fen()} trong chuỗi "${chuoi}"`);
      ra.push(L.nuocChu(m));
      T.diGhi(m);
    });
    return ra;
  }

  // ---------- Vì sao không đi được ----------
  function viSaoKhong(T, tu, den) {
    const p = T.ban[tu], t = p & 7, ben = p >> 3, q = T.ban[den];
    if (!p) return 'Ô này không có quân.';
    if (q && q >> 3 === ben) return 'Ô đó có quân cùng phe.';
    const h = hang(tu), c = tu % 9, hd = hang(den), cd = den % 9, dh = hd - h, dc = cd - c, adh = Math.abs(dh), adc = Math.abs(dc);
    const dem = () => {
      let n = 0;
      const bh = Math.sign(dh), bc = Math.sign(dc);
      for (let a = h + bh, b = c + bc; a !== hd || b !== cd; a += bh, b += bc) if (T.ban[a * 9 + b]) n++;
      return n;
    };
    if (t === XE) {
      if (dh && dc) return 'Xe chỉ đi thẳng theo hàng hoặc cột, không đi chéo.';
      if (dem()) return 'Có quân chắn đường, Xe không nhảy qua được.';
    } else if (t === PH) {
      if (dh && dc) return 'Pháo chỉ đi thẳng theo hàng hoặc cột, không đi chéo.';
      const n = dem();
      if (q) {
        if (n === 0) return 'Pháo muốn ăn phải có đúng một quân ở giữa làm ngòi. Ở đây chưa có ngòi.';
        if (n > 1) return `Pháo chỉ nhảy qua đúng một ngòi. Ở đây có ${n} quân ở giữa.`;
      } else if (n) return 'Pháo chỉ nhảy qua ngòi khi ăn quân. Ô trống phía sau ngòi không đi tới được.';
    } else if (t === MA) {
      if (!((adh === 2 && adc === 1) || (adh === 1 && adc === 2))) return 'Mã đi hình chữ Nhật: một ô thẳng, rồi một ô chéo tiếp theo.';
      const chan = adh === 2 ? (h + dh / 2) * 9 + c : h * 9 + c + dc / 2;
      if (T.ban[chan]) return `Mã bị cản chân: có ${TEN[T.ban[chan] & 7]} đứng sát ngay hướng đi.`;
    } else if (t === TV) {
      if (!(adh === 2 && adc === 2)) return 'Tượng đi chéo đúng 2 ô, như đường chéo của một ô chữ điền.';
      if ((hd <= 4) !== (h <= 4)) return 'Tượng không được qua sông.';
      const mat = (h + dh / 2) * 9 + c + dc / 2;
      if (T.ban[mat]) return `Tượng bị chẹn mắt: có ${TEN[T.ban[mat] & 7]} đứng ngay giữa đường chéo.`;
    } else if (t === SI) {
      if (!(adh === 1 && adc === 1)) return 'Sĩ chỉ đi chéo 1 ô.';
      if (!cungBen(hd, cd, ben)) return 'Sĩ không được ra khỏi cung.';
    } else if (t === TG) {
      if (adh + adc !== 1) return 'Tướng chỉ đi 1 ô ngang hoặc dọc.';
      if (!cungBen(hd, cd, ben)) return 'Tướng không được ra khỏi cung.';
    } else if (t === TO) {
      const tien = ben === 0 ? -1 : 1;
      if (dh === -tien) return 'Tốt không được đi lùi.';
      if (adh + adc !== 1) return 'Tốt chỉ đi 1 ô mỗi nước.';
      if (dc && !quaSong(tu, ben)) return 'Tốt chưa qua sông nên chưa được đi ngang.';
    }
    // Đúng cách đi của quân nhưng làm Tướng mình gặp nguy
    const dangChieu = T.biChieu(ben);
    T.di(tu | (den << 8));
    const nguy = T.biChieu(ben);
    let doiMat = false;
    if (nguy) {
      const a = T.vua[0], b = T.vua[1];
      if (a >= 0 && b >= 0 && a % 9 === b % 9) {
        doiMat = true;
        for (let s = b + 9; s < a; s += 9) if (T.ban[s]) { doiMat = false; break; }
      }
    }
    T.lui();
    if (nguy) {
      if (doiMat) return 'Hai Tướng không được nhìn thẳng mặt nhau trên một cột khi không có quân chắn.';
      if (dangChieu) return 'Tướng đang bị chiếu: chỉ được đi Tướng, chặn đường chiếu, hoặc ăn quân đang chiếu.';
      if (t === TG) return 'Ô đó đang bị quân đối phương canh, Tướng bước vào là bị ăn.';
      return `${TEN[t]} này đang che cho Tướng. Rời chỗ là Tướng bị chiếu ngay.`;
    }
    return '';
  }

  // ---------- Ai đánh tới đâu ----------
  // Các ô quân ở s đánh tới, kể cả ô có quân cùng phe (tức là đang bảo vệ quân đó)
  function dsDanh(T, s) {
    const B = T.ban, p = B[s], t = p & 7, ben = p >> 3, ra = [];
    if (t === XE) {
      for (const r of TIA[s]) for (let j = 0; j < r.length; j++) { ra.push(r[j]); if (B[r[j]]) break; }
    } else if (t === PH) {
      for (const r of TIA[s]) {
        let j = 0;
        while (j < r.length && !B[r[j]]) j++;
        for (j++; j < r.length; j++) { ra.push(r[j]); if (B[r[j]]) break; }
      }
    } else if (t === MA) {
      const a = MA_DI[s];
      for (let j = 0; j < a.length; j += 2) if (!B[a[j + 1]]) ra.push(a[j]);
    } else if (t === TV) {
      const a = TV_DI[s];
      for (let j = 0; j < a.length; j += 2) if (!B[a[j + 1]]) ra.push(a[j]);
    } else if (t === SI) SI_DI[s].forEach(o => ra.push(o));
    else if (t === TG) TG_DI[s].forEach(o => ra.push(o));
    else if (t === TO) TO_DI[ben][s].forEach(o => ra.push(o));
    return ra;
  }
  // Số nước đi thật của một quân (ô trống hoặc ăn được), không xét ghim
  function soNuocQuan(T, s) {
    const B = T.ban, p = B[s], t = p & 7, ben = p >> 3;
    if (t === PH) {
      let n = 0;
      for (const r of TIA[s]) {
        let j = 0;
        while (j < r.length && !B[r[j]]) { n++; j++; }
        for (j++; j < r.length; j++) if (B[r[j]]) { if (B[r[j]] >> 3 !== ben) n++; break; }
      }
      return n;
    }
    return dsDanh(T, s).filter(o => !B[o] || B[o] >> 3 !== ben).length;
  }
  const trongSo = [0, 0.5, 0.8, 0.8, 0.8, 0.6, 0.7, 1];   // quân nhỏ canh ô thì chắc hơn quân lớn
  function banDoLuc(T) {
    const lucDo = new Float32Array(90), lucDen = new Float32Array(90);
    for (let b = 0; b < 2; b++) {
      const dich = b ? lucDen : lucDo;
      for (let i = 0; i < T.soQ[b]; i++) {
        const s = T.ds[b][i], w = trongSo[T.ban[s] & 7];
        for (const o of dsDanh(T, s)) dich[o] += w;
      }
    }
    let oDo = 0, oDen = 0;
    for (let s = 0; s < 90; s++) {
      if (lucDo[s] > lucDen[s]) oDo++;
      else if (lucDen[s] > lucDo[s]) oDen++;
    }
    return { do: lucDo, den: lucDen, oDo, oDen };
  }

  // ---------- Đổi quân ----------
  function trao(T, o) {
    const ds = T.hopLe().filter(m => m >> 8 === o);
    if (!ds.length) return 0;
    ds.sort((a, b) => giaTri(T.ban[a & 255]) - giaTri(T.ban[b & 255]));
    const m = ds[0], v = giaTri(T.ban[o], o);
    T.di(m);
    const g = v - trao(T, o);
    T.lui();
    return Math.max(0, g);
  }
  // Lời lỗ khi đi nước ăn m: dương là lời
  function seeNuoc(T, m) {
    const o = m >> 8, v = giaTri(T.ban[o], o);
    T.di(m);
    const g = v - trao(T, o);
    T.lui();
    return g;
  }
  // Quân của `ben` đang bị dọa: đối phương ăn được mà có lời. Trả [{o, quan, boi, nuoc, mat}] lớn trước
  function quanBiDoa(T, ben) {
    const phaiDoi = T.ben === ben;
    if (phaiDoi) T.diNull();
    const nhom = new Map();
    for (const m of T.hopLe()) {
      const o = m >> 8, q = T.ban[o];
      if (!q || (q & 7) === TG) continue;
      const g = seeNuoc(T, m);
      if (g <= 0) continue;
      const cu = nhom.get(o);
      if (!cu || g > cu.mat) nhom.set(o, { o, quan: q, boi: m & 255, nuoc: m, mat: g, trang: g >= giaTri(q, o) });
    }
    if (phaiDoi) T.luiNull();
    return [...nhom.values()].sort((a, b) => b.mat - a.mat);
  }
  // Nước ăn có lời của bên đang đi
  function nuocAnLoi(T) {
    const kq = [];
    for (const m of T.hopLe()) {
      if (!T.ban[m >> 8]) continue;
      const g = seeNuoc(T, m);
      if (g > 0) kq.push({ nuoc: m, loi: g, quan: T.ban[m >> 8] });
    }
    return kq.sort((a, b) => b.loi - a.loi);
  }
  // Quân đang chiếu Tướng của `ben`
  function quanChieu(T, ben) {
    const k = T.vua[ben];
    if (k < 0) return [];
    const r = [];
    for (let i = 0; i < T.soQ[1 - ben]; i++) {
      const s = T.ds[1 - ben][i], t = T.ban[s] & 7;
      if (t === TG) continue;
      if (dsDanh(T, s).includes(k)) r.push(s);
    }
    return r;
  }
  // Số quân đối phương đang đánh tới một ô (cho phần "vì sao bí")
  function quanCanhO(T, o, ben) {
    const r = [];
    for (let i = 0; i < T.soQ[1 - ben]; i++) {
      const s = T.ds[1 - ben][i];
      if (dsDanh(T, s).includes(o)) r.push(s);
    }
    return r;
  }

  // ---------- Giải thích vì sao Tướng bị bí: các ô thoát bị ai canh ----------
  function viSaoBi(T) {
    const ben = T.ben, k = T.vua[ben], thoat = [];
    const chieu = quanChieu(T, ben);
    if (k < 0) return { thoat, chieu, chu: '' };
    TG_DI[k].forEach(o => {
      if (T.ban[o] && T.ban[o] >> 3 === ben) { thoat.push({ o, chan: true }); return; }
      // Đi thử rồi xem ai ăn được Tướng ở ô đó
      T.di(k | (o << 8));
      const boi = quanCanhO(T, o, ben);
      const doiMat = !boi.length && T.biChieu(ben);
      T.lui();
      thoat.push({ o, boi, doiMat });
    });
    const tenCanh = {};
    thoat.forEach(x => (x.boi || []).forEach(s => { tenCanh[s] = true; }));
    const quanCanh = Object.keys(tenCanh).map(Number);
    const phan = [];
    if (chieu.length) phan.push(`${chieu.map(s => tenQuan(T.ban[s], s)).join(' và ')} đang chiếu`);
    const biChan = thoat.filter(x => x.chan).length;
    if (quanCanh.length) phan.push(`các ô thoát bị ${quanCanh.map(s => tenQuan(T.ban[s], s)).join(', ')} canh`);
    if (biChan) phan.push(biChan === thoat.length ? 'quân nhà chắn hết đường chạy' : 'quân nhà chắn bớt đường chạy');
    if (thoat.some(x => x.doiMat)) phan.push('bước ra là hai Tướng đối mặt');
    phan.push('không quân nào chặn hay ăn được quân chiếu');
    return { thoat, chieu, chu: phan.join('; ') + '.' };
  }

  // ---------- Đếm quân ----------
  function demQuan(T, ben) {
    const d = [0, 0, 0, 0, 0, 0, 0, 0];
    for (let i = 0; i < T.soQ[ben]; i++) d[T.ban[T.ds[ben][i]] & 7]++;
    return d;
  }
  function vatChat(T, ben) {
    let v = 0;
    for (let i = 0; i < T.soQ[ben]; i++) { const s = T.ds[ben][i], p = T.ban[s]; if ((p & 7) !== TG) v += giaTri(p, s); }
    return v;
  }
  function cheoQuan(T) {   // "Đỏ dư 1 Xe, Đen dư 1 Mã"
    const a = demQuan(T, 0), b = demQuan(T, 1), r = [[], []];
    [XE, PH, MA, SI, TV, TO].forEach(t => {
      const lech = a[t] - b[t];
      if (lech > 0) r[0].push(`${lech} ${TEN[t]}`);
      else if (lech < 0) r[1].push(`${-lech} ${TEN[t]}`);
    });
    const c = [];
    if (r[0].length) c.push(`Đỏ dư ${r[0].join(', ')}`);
    if (r[1].length) c.push(`Đen dư ${r[1].join(', ')}`);
    return c.length ? c.join('. ') + '.' : 'Quân hai bên bằng nhau.';
  }

  function giaiDoan(T) {
    const a = demQuan(T, 0), b = demQuan(T, 1);
    const nang = (a[XE] + b[XE]) * 2 + a[MA] + b[MA] + a[PH] + b[PH];
    if (nang <= 6) return 'tan';
    let chuaRa = 0;
    for (let ben = 0; ben < 2; ben++) {
      for (let i = 0; i < T.soQ[ben]; i++) {
        const s = T.ds[ben][i], t = T.ban[s] & 7, day = ben === 0 ? 9 : 0;
        if ((t === XE || t === MA) && hang(s) === day) chuaRa++;
      }
    }
    return chuaRa >= 4 && nang >= 12 ? 'khai' : 'trung';
  }
  const TEN_GD = { khai: 'Khai cuộc', trung: 'Trung cuộc', tan: 'Tàn cuộc' };
  const MEO_GD = {
    khai: 'Giai đoạn ra quân: đưa Xe, Mã, Pháo vào chỗ tốt, đừng đi một quân nhiều lần.',
    trung: 'Giai đoạn giao tranh: tìm chỗ yếu của Tướng đối phương và đòn ăn quân.',
    tan: 'Giai đoạn ít quân: Tốt qua sông rất quý, Tướng cũng phải tham chiến.',
  };

  // ---------- Bốn trụ của thế cờ ----------
  // An toàn Tướng 5..100: thiếu quân thủ, quân địch áp sát, đường thẳng nhắm vào Tướng, ô trong cung bị canh
  function anToan(T, ben) {
    const k = T.vua[ben], dich = 1 - ben, B = T.ban;
    if (k < 0) return 0;
    const q = demQuan(T, dich), mih = demQuan(T, ben);
    let luc = q[XE] * 3 + q[PH] * 2 + q[MA] * 2;
    for (let i = 0; i < T.soQ[dich]; i++) { const s = T.ds[dich][i]; if ((B[s] & 7) === TO && quaSong(s, dich)) luc += 1; }
    if (!luc) return 100;
    const heSo = Math.min(1, luc / 7);   // đối phương còn ít quân đánh thì thiếu Sĩ Tượng cũng đỡ nguy
    let d = 100 - ((2 - mih[SI]) * 13 + (2 - mih[TV]) * 7) * heSo;
    const lucDich = dsDanhBen(T, dich);
    for (let i = 0; i < T.soQ[dich]; i++) {
      const s = T.ds[dich][i], t = B[s] & 7;
      if (t === TG || t === SI || t === TV || !quaSong(s, dich)) continue;
      const gan = Math.abs(hang(s) - hang(k)) <= 3 && Math.abs(s % 9 - k % 9) <= 3;
      d -= (t === XE ? 7 : t === TO ? 3 : 5) * (gan ? 1.4 : 0.8);
      // Xe, Pháo đứng cùng cột với Tướng
      if ((t === XE || t === PH) && s % 9 === k % 9) {
        const buoc = k > s ? 9 : -9;
        let chan = 0;
        for (let o = s + buoc; o !== k; o += buoc) if (B[o]) chan++;
        if (t === XE && chan <= 1) d -= 12;
        if (t === PH && (chan === 0 || chan === 2)) d -= 9;
      }
    }
    // Ô trong cung bị đối phương đánh tới
    const dongCung = ben === 0 ? [7, 8, 9] : [0, 1, 2];
    dongCung.forEach(r => { for (let c = 3; c <= 5; c++) if (lucDich.has(r * 9 + c)) d -= 1.5; });
    if (hang(k) !== (ben === 0 ? 9 : 0)) d -= 5;
    if (T.biChieu(ben)) d -= 10;
    return Math.max(5, Math.min(100, Math.round(d)));
  }
  function dsDanhBen(T, b) {
    const r = new Set();
    for (let i = 0; i < T.soQ[b]; i++) dsDanh(T, T.ds[b][i]).forEach(o => r.add(o));
    return r;
  }
  function hoatDong(T, ben) {
    let n = 0;
    for (let i = 0; i < T.soQ[ben]; i++) {
      const s = T.ds[ben][i], t = T.ban[s] & 7;
      if (t === XE) n += soNuocQuan(T, s);
      else if (t === MA) n += soNuocQuan(T, s) * 1.6;
      else if (t === PH) n += soNuocQuan(T, s) * 0.8;
    }
    return Math.round(n);
  }
  function sucEp(T, ben) {
    let n = 0;
    const dich = 1 - ben, kD = T.vua[dich];
    for (let i = 0; i < T.soQ[ben]; i++) {
      const s = T.ds[ben][i], p = T.ban[s], t = p & 7;
      if (t === TG || t === SI || t === TV) continue;
      if (quaSong(s, ben)) n += t === XE ? 5 : t === TO ? 2 : 3;
      for (const o of dsDanh(T, s)) {
        const q = T.ban[o];
        if (q && q >> 3 === dich) n += (q & 7) === TG ? 3 : 1;
        if (kD >= 0 && Math.abs(hang(o) - hang(kD)) <= 1 && Math.abs(o % 9 - kD % 9) <= 1) n += 0.7;
      }
    }
    return Math.round(n);
  }

  // Một câu so sánh ngắn cho từng trụ
  const soSanh = (a, b, tenA, tenB, nguong, gan, hon) => {
    if (Math.abs(a - b) <= nguong) return gan;
    return a > b ? hon.replace('{a}', tenA).replace('{b}', tenB) : hon.replace('{a}', tenB).replace('{b}', tenA);
  };

  // Điểm (cùng thang với máy, Xe khoảng 210, Mã khoảng 95, Tốt 10 đến 40) đổi sang lời, điểm nhìn từ phía Đỏ
  function diemRaChu(d) {
    if (d == null) return '';
    const a = Math.abs(d), ai = d > 0 ? 'Đỏ' : 'Đen';
    if (a > THANG) { const n = Math.max(1, Math.ceil((MATE - a) / 2)); return `${ai} chiếu bí trong ${n} nước`; }
    if (a >= L.CAM - 200) return `${ai} thắng vì đối phương phạm luật`;
    if (a < 15) return 'Hai bên cân bằng';
    if (a < 40) return `${ai} nhỉnh hơn một chút`;
    if (a < 90) return `${ai} hơn thế`;
    if (a < 170) return `${ai} hơn rõ, cỡ một quân Mã`;
    if (a < 330) return `${ai} hơn nhiều, cỡ một quân Xe`;
    return `${ai} đang thắng lớn`;
  }
  // Cơ hội thắng 0..1 của Đỏ để vẽ cán cân
  function coHoi(d) {
    if (d == null) return 0.5;
    if (d > THANG) return 0.995;
    if (d < -THANG) return 0.005;
    return 1 / (1 + Math.pow(10, -d / 260));
  }

  // ---------- Tổng quan thế cờ cho bên đang đi. may: {diem (từ phía bên đang đi), pv: [...], nuoc} ----------
  function tongQuan(T, may) {
    const me = T.ben, dich = 1 - me;
    const vc = [vatChat(T, 0), vatChat(T, 1)];
    const at = [anToan(T, 0), anToan(T, 1)];
    const hd = [hoatDong(T, 0), hoatDong(T, 1)];
    const se = [sucEp(T, 0), sucEp(T, 1)];
    const luc = banDoLuc(T);
    const gd = giaiDoan(T);
    const diemDo = may && may.diem != null ? (me === 0 ? may.diem : -may.diem) : null;

    const tru = [
      { ma: 'quan', ten: 'Quân số', do: vc[0], den: vc[1], chu: cheoQuan(T), hien: x => x.toLocaleString('vi-VN', { maximumFractionDigits: 1 }) },
      { ma: 'tuong', ten: 'An toàn Tướng', do: at[0], den: at[1], chu: soSanh(at[0], at[1], 'Đỏ', 'Đen', 8, 'Hai Tướng an toàn ngang nhau.', 'Tướng {a} an toàn hơn Tướng {b}.'), hien: x => x },
      { ma: 'thoang', ten: 'Quân linh hoạt', do: hd[0], den: hd[1], chu: soSanh(hd[0], hd[1], 'Đỏ', 'Đen', 6, 'Quân hai bên linh hoạt như nhau.', 'Quân {a} có nhiều đường đi hơn.'), hien: x => x },
      { ma: 'ep', ten: 'Sức ép', do: se[0], den: se[1], chu: soSanh(se[0], se[1], 'Đỏ', 'Đen', 6, 'Hai bên ép nhau ngang ngửa.', '{a} đang ép mạnh hơn {b}.'), hien: x => x },
    ];

    // Việc gấp cho bên đang đi
    const gap = [];
    const chieu = T.biChieu(me);
    if (chieu) {
      const qc = quanChieu(T, me);
      gap.push({ kieu: 'do', chu: qc.length
        ? `${BEN[me]} đang bị ${qc.map(s => tenQuan(T.ban[s], s)).join(' và ')} chiếu: phải thoát ngay.`
        : `${BEN[me]} đang bị chiếu: phải thoát ngay.` });
    }
    if (may && may.diem > THANG) gap.push({ kieu: 'xanh', chu: `${BEN[me]} có đường chiếu bí trong ${Math.max(1, Math.ceil((MATE - may.diem) / 2))} nước.` });
    if (may && may.diem < -THANG) gap.push({ kieu: 'do', chu: `Cẩn thận: ${BEN[dich]} có đường chiếu bí trong ${Math.max(1, Math.ceil((MATE + may.diem) / 2))} nước.` });
    const an = nuocAnLoi(T);
    if (an.length) {
      const x = an[0], s = x.nuoc >> 8;
      gap.push({ kieu: 'xanh', chu: `Có thể ăn ${tenQuan(x.quan, s)} bằng ${tenQuan(T.ban[x.nuoc & 255], x.nuoc & 255)} mà có lời.`, mui: [x.nuoc] });
    }
    const biDoa = quanBiDoa(T, me);
    biDoa.slice(0, 2).forEach(x => gap.push({
      kieu: 'do',
      chu: `${tenQuan(x.quan, x.o)} đang bị ${tenQuan(T.ban[x.boi], x.boi)} dọa${x.trang ? ', ăn là mất trắng' : ''}.`,
      mui: [x.nuoc],
    }));
    const doiPhuongDoa = quanBiDoa(T, dich);
    if (doiPhuongDoa.length && !an.length) {
      const x = doiPhuongDoa[0];
      gap.push({ kieu: 'xanh', chu: `${tenQuan(x.quan, x.o)} đang bị dọa, tìm cách ăn nó.`, mui: [x.nuoc] });
    }

    // Kế hoạch
    const keHoach = [];
    const lech = vc[me] - vc[dich];
    const q = demQuan(T, me);
    if (gd === 'khai') {
      const xeGoc = [], maNha = [];
      for (let i = 0; i < T.soQ[me]; i++) {
        const s = T.ds[me][i], t = T.ban[s] & 7, day = me === 0 ? 9 : 0;
        if (t === XE && hang(s) === day) xeGoc.push(s);
        if (t === MA && hang(s) === day) maNha.push(s);
      }
      if (maNha.length) keHoach.push(`Lên ${maNha.length === 2 ? 'hai Mã' : tenQuan(T.ban[maNha[0]], maNha[0])} trước: Mã bảo vệ Tốt và mở đường cho Xe.`);
      if (xeGoc.length) keHoach.push(`Đưa ${xeGoc.length === 2 ? 'hai Xe' : tenQuan(T.ban[xeGoc[0]], xeGoc[0])} ra cột trống: Xe nằm ở góc thì chưa đánh được gì.`);
      if (![...Array(T.soQ[me]).keys()].some(i => { const s = T.ds[me][i]; return (T.ban[s] & 7) === PH && s % 9 === 4; })) keHoach.push('Pháo đặt ở cột giữa nhắm thẳng Tốt đầu là nước ép quen thuộc.');
    } else {
      if (lech >= 3) keHoach.push('Đang hơn quân: chủ động đổi quân, nhất là đổi Xe. Càng ít quân, phần hơn càng rõ.');
      else if (lech <= -3) keHoach.push('Đang kém quân: tránh đổi quân, gom lực tìm đòn vào Tướng hoặc cố giữ hòa bằng Sĩ Tượng.');
      if (at[dich] <= 60) {
        const qd = demQuan(T, dich);
        const yeu = qd[SI] < 2 ? 'đã mất Sĩ' : qd[TV] < 2 ? 'đã mất Tượng' : 'đang bị áp sát';
        keHoach.push(`Tướng ${BEN[dich]} ${yeu}: gom Xe, Pháo, Mã về phía cung để tấn công.`);
      }
      if (at[me] <= 55) keHoach.push(`Tướng ${BEN[me]} đang hở: đừng đem quân đi xa, giữ Sĩ Tượng và chặn các đường thẳng vào cung.`);
      if (hd[me] + 6 < hd[dich]) {
        let te = null, ti = 99;
        for (let i = 0; i < T.soQ[me]; i++) {
          const s = T.ds[me][i], t = T.ban[s] & 7;
          if (t !== XE && t !== MA && t !== PH) continue;
          const n = soNuocQuan(T, s);
          if (n < ti) { ti = n; te = s; }
        }
        if (te != null) keHoach.push(`Quân ${BEN[me]} đang bí đường. ${tenQuan(T.ban[te], te)} chỉ có ${ti} nước đi, nên đổi chỗ cho nó.`);
      }
      const cotMo = cotTrong(T, me);
      if (q[XE] && cotMo.length) keHoach.push(`Cột ${cotMo.slice(0, 2).join(', ')} không còn Tốt ${BEN[me]} chắn: Xe đứng đó đánh được sâu.`);
      if (gd === 'tan') {
        keHoach.push('Tàn cuộc: đưa Tốt qua sông và cho Tướng ra cột trống để phụ đánh.');
      }
    }
    if (!keHoach.length) keHoach.push('Thế đang yên: tìm một quân chưa làm việc rồi đưa vào chỗ có ích hơn.');

    // Câu nhận định chung
    const hopCau = [];
    const dChu = diemRaChu(diemDo);
    if (dChu) hopCau.push(dChu);
    return { ben: me, gd, tenGd: TEN_GD[gd], meoGd: MEO_GD[gd], tru, gap, keHoach: keHoach.slice(0, 3), diemDo, chuDiem: dChu,
      vung: { do: luc.oDo, den: luc.oDen } };
  }
  // Cột (đếm theo bên ben) không có Tốt của ben: Xe đứng đó nhìn thẳng sang đất địch
  function cotTrong(T, ben) {
    const r = [];
    for (let c = 0; c < 9; c++) {
      let co = false;
      for (let h = 0; h < 10; h++) { const p = T.ban[h * 9 + c]; if (p && (p & 7) === TO && p >> 3 === ben) { co = true; break; } }
      if (!co) r.push(ben === 0 ? 9 - c : c + 1);
    }
    return r.sort((a, b) => Math.abs(a - 5) - Math.abs(b - 5));
  }

  // ---------- Mô tả một nước đi bằng lời ----------
  // T là thế trước khi đi. Trả { chu, an, chieu, bi, doa: [ô], treo: bool }
  function moTaNuoc(T, m) {
    const tu = m & 255, den = m >> 8, p = T.ban[tu], t = p & 7, ben = p >> 3, dich = 1 - ben, an = T.ban[den];
    const phan = [];
    const doaTruoc = new Set(quanBiDoa(T, dich).map(x => x.o));
    const minhBiTruoc = quanBiDoa(T, ben);
    T.di(m);
    const chieu = T.biChieu(dich), bi = !T.coNuoc();
    const doaSau = quanBiDoa(T, dich).filter(x => !doaTruoc.has(x.o));
    const minhBiSau = quanBiDoa(T, ben);
    T.lui();
    if (an) phan.push(`ăn ${TEN[an & 7]}`);
    if (bi) phan.push(chieu ? 'chiếu bí' : 'đối phương hết nước');
    else if (chieu) phan.push('chiếu Tướng');
    const moi = doaSau.filter(x => !(an && x.o === den));
    if (moi.length >= 2) phan.push(`dọa cùng lúc ${moi.slice(0, 2).map(x => TEN[x.quan & 7]).join(' và ')}`);
    else if (moi.length === 1) phan.push(`dọa ăn ${tenQuan(moi[0].quan, moi[0].o)}`);
    const minhCu = minhBiTruoc.find(x => x.o === tu);
    const conBi = o => minhBiSau.some(x => x.o === o);
    if (minhCu && !conBi(den)) phan.push('thoát khỏi chỗ bị dọa');
    const cuuDuoc = minhBiTruoc.filter(x => x.o !== tu && !conBi(x.o));
    if (cuuDuoc.length) phan.push(`giữ được ${TEN[cuuDuoc[0].quan & 7]}`);
    if (phan.length === 0) {
      const day = ben === 0 ? 9 : 0, hTu = hang(tu);
      if (t === XE && hTu === day) phan.push('đưa Xe ra trận');
      else if (t === MA && hTu === day) phan.push('lên Mã');
      else if (t === PH && den % 9 === 4 && tu % 9 !== 4) phan.push('đặt Pháo ở cột giữa, nhắm Tốt đầu');
      else if (t === TO && quaSong(den, ben) && !quaSong(tu, ben)) phan.push('Tốt qua sông, từ nay đi ngang được');
      else if (t === TO) phan.push('đẩy Tốt mở đường');
      else if (t === SI || t === TV) phan.push('củng cố quanh Tướng');
      else if (t === TG) phan.push('đổi chỗ Tướng');
      else if (t === XE) phan.push(`chiếm cột ${cot(den, ben)}`);
      else phan.push(`đổi chỗ ${TEN[t]}`);
    }
    const treo = minhBiSau.find(x => x.o === den);
    const chu = phan.join(', ');
    return { chu: chu.charAt(0).toUpperCase() + chu.slice(1), an: an || 0, chieu, bi, moi: moi.map(x => x.o), treo: treo ? treo.mat : 0 };
  }

  // Chấm một nước. truoc = điểm tốt nhất trước khi đi, sau = điểm sau khi đi, đều nhìn từ phía người đi.
  function chamNuoc(truoc, sau, laNuocTotNhat) {
    if (truoc == null || sau == null) return null;
    const mat = coHoi(truoc) - coHoi(sau);
    // Có đường bí mà bỏ qua, hoặc đi vào thế bị bí
    const boBi = truoc > THANG && sau <= THANG;
    const voBi = sau < -THANG && truoc >= -THANG;
    let ma;
    if (laNuocTotNhat || mat <= 0.015) ma = 'hay';
    else if (boBi || voBi || mat >= 0.3) ma = 'nang';
    else if (mat >= 0.14) ma = 'sai';
    else if (mat >= 0.06) ma = 'lo';
    else ma = 'duoc';
    return { ma, mat, ten: { hay: 'Nước tốt', duoc: 'Được', lo: 'Chưa chuẩn', sai: 'Sai lầm', nang: 'Sai nặng' }[ma] };
  }

  // ---------- Thế tự bày: kiểm hợp lệ, trả danh sách lỗi bằng lời ----------
  const OSI = [[0, 3], [0, 5], [1, 4], [2, 3], [2, 5]];
  const OTV = [[0, 2], [0, 6], [2, 0], [2, 4], [2, 8], [4, 2], [4, 6]];
  function kiemThe(T) {
    const loi = [];
    for (let b = 0; b < 2; b++) {
      const d = demQuan(T, b), ten = BEN[b];
      if (d[TG] !== 1) loi.push(`${ten} phải có đúng 1 Tướng.`);
      [[SI, 2], [TV, 2], [MA, 2], [XE, 2], [PH, 2], [TO, 5]].forEach(([t, max]) => { if (d[t] > max) loi.push(`${ten} có quá ${max} ${TEN[t]}.`); });
      for (let i = 0; i < T.soQ[b]; i++) {
        const s = T.ds[b][i], t = T.ban[s] & 7, h = hang(s), c = s % 9;
        const hBen = b === 0 ? 9 - h : h;   // đếm từ hàng đáy của bên đó
        if (t === TG && !cungBen(h, c, b)) loi.push(`Tướng ${ten} phải ở trong cung.`);
        if (t === SI && !OSI.some(([a, e]) => a === hBen && e === c)) loi.push(`Sĩ ${ten} ở ô không tới được.`);
        if (t === TV && !OTV.some(([a, e]) => a === hBen && e === c)) loi.push(`Tượng ${ten} ở ô không tới được.`);
        if (t === TO && hBen < 3) loi.push(`Tốt ${ten} không thể đứng sau hàng xuất phát.`);
        if (t === TO && hBen <= 4 && hBen >= 3 && c % 2 === 1) loi.push(`Tốt ${ten} chưa qua sông chỉ đứng ở cột lẻ.`);
      }
    }
    if (!loi.length) {
      const k = T.ben, kia = 1 - k;
      if (T.biChieu(kia)) loi.push(`${BEN[kia]} đang bị chiếu mà lại không tới lượt: đổi bên đi trước hoặc sửa thế.`);
      const a = T.vua[0], b = T.vua[1];
      if (a >= 0 && b >= 0 && a % 9 === b % 9) {
        let chan = 0;
        for (let s = b + 9; s < a; s += 9) if (T.ban[s]) chan++;
        if (!chan) loi.push('Hai Tướng đang nhìn thẳng mặt nhau.');
      }
    }
    return [...new Set(loi)];
  }

  return { TEN, KY, BEN, hang, cot, cotTrai, quaSong, tenQuan, giaTri, ghi, docNuoc, chuoiNuoc, viSaoKhong, dsDanh, soNuocQuan, banDoLuc,
    seeNuoc, quanBiDoa, nuocAnLoi, quanChieu, quanCanhO, viSaoBi, demQuan, vatChat, cheoQuan, giaiDoan, TEN_GD, anToan, hoatDong, sucEp,
    diemRaChu, coHoi, tongQuan, moTaNuoc, chamNuoc, kiemThe, cotTrong };
}
if (typeof window !== 'undefined') window.CoPT = COTUONG_PT(window.CoLoi);
else if (typeof module !== 'undefined') module.exports = COTUONG_PT;
