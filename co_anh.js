/* Cờ tướng: đọc thế cờ từ ảnh, chạy hoàn toàn trong máy, không gửi ảnh đi đâu.
   Ảnh vào là { w, h, d: RGBA }. Các bước: tìm bàn (timBan) -> lấy mẫu từng giao điểm theo phép chiếu ->
   giao điểm nào có quân -> chữ trên quân là loại gì (trọng số học ở web/co_mau.js, sinh bởi tools/co_mau_hoc.js) ->
   quân bên nào -> ràng buộc luật cờ (đếm quân, ô đứng được) để sửa chỗ đọc sai. */
(function (goc) {
  'use strict';

  // ---------- Ảnh ----------
  function thuNho(a, canh) {
    const f = Math.max(a.w, a.h) / canh;
    if (f <= 1) return a;
    const w = Math.max(1, Math.round(a.w / f)), h = Math.max(1, Math.round(a.h / f));
    const tong = new Float64Array(w * h * 3), dem = new Uint32Array(w * h), d = a.d;
    for (let y = 0, i = 0; y < a.h; y++) {
      const yy = Math.min(h - 1, (y * h / a.h) | 0) * w;
      for (let x = 0; x < a.w; x++, i += 4) {
        const k = yy + Math.min(w - 1, (x * w / a.w) | 0);
        tong[k * 3] += d[i]; tong[k * 3 + 1] += d[i + 1]; tong[k * 3 + 2] += d[i + 2]; dem[k]++;
      }
    }
    const ra = new Uint8ClampedArray(w * h * 4);
    for (let k = 0; k < w * h; k++) {
      const n = dem[k] || 1;
      ra[k * 4] = tong[k * 3] / n; ra[k * 4 + 1] = tong[k * 3 + 1] / n; ra[k * 4 + 2] = tong[k * 3 + 2] / n; ra[k * 4 + 3] = 255;
    }
    return { w, h, d: ra };
  }
  function xam(a) {
    const n = a.w * a.h, g = new Float32Array(n), d = a.d;
    for (let i = 0; i < n; i++) g[i] = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2];
    return g;
  }
  // Lọc min / max vuông bán kính r
  function locCucTri(g, w, h, r, laMax) {
    const t = new Float32Array(g.length), ra = new Float32Array(g.length);
    const chon = laMax ? (a, b) => (a > b ? a : b) : (a, b) => (a < b ? a : b);
    for (let y = 0; y < h; y++) {
      const y0 = y * w;
      for (let x = 0; x < w; x++) {
        let v = g[y0 + x];
        for (let k = Math.max(0, x - r), e = Math.min(w - 1, x + r); k <= e; k++) v = chon(v, g[y0 + k]);
        t[y0 + x] = v;
      }
    }
    for (let x = 0; x < w; x++) {
      for (let y = 0; y < h; y++) {
        let v = t[y * w + x];
        for (let k = Math.max(0, y - r), e = Math.min(h - 1, y + r); k <= e; k++) v = chon(v, t[k * w + x]);
        ra[y * w + x] = v;
      }
    }
    return ra;
  }
  // Bản đồ nét mảnh: tối trên nền sáng (hoặc ngược lại), chuẩn hóa về 0..1
  function banDoNet(g, w, h, r, toi) {
    const a = toi ? locCucTri(locCucTri(g, w, h, r, true), w, h, r, false) : locCucTri(locCucTri(g, w, h, r, false), w, h, r, true);
    const L = new Float32Array(g.length);
    for (let i = 0; i < L.length; i++) L[i] = toi ? a[i] - g[i] : g[i] - a[i];
    const bac = new Uint32Array(256);
    for (let i = 0; i < L.length; i++) bac[Math.min(255, L[i] | 0)]++;
    let dem = 0, nguong = 255;
    for (; nguong > 0; nguong--) { dem += bac[nguong]; if (dem > L.length * 0.04) break; }
    const chia = Math.max(10, nguong);
    for (let i = 0; i < L.length; i++) L[i] = Math.min(1, L[i] / chia);
    return L;
  }

  // ---------- Phép chiếu: (u, v) trong [0,1]² -> tứ giác q = [trên trái, trên phải, dưới phải, dưới trái] ----------
  function lapH(q) {
    const [x0, y0] = q[0], [x1, y1] = q[1], [x2, y2] = q[2], [x3, y3] = q[3];
    const dx1 = x1 - x2, dx2 = x3 - x2, sx = x0 - x1 + x2 - x3, dy1 = y1 - y2, dy2 = y3 - y2, sy = y0 - y1 + y2 - y3;
    const den = dx1 * dy2 - dx2 * dy1 || 1e-9;
    const g = (sx * dy2 - dx2 * sy) / den, h = (dx1 * sy - sx * dy1) / den;
    return [x1 - x0 + g * x1, x3 - x0 + h * x3, x0, y1 - y0 + g * y1, y3 - y0 + h * y3, y0, g, h];
  }

  // Điểm của lưới: nét phải nằm đúng trên các đoạn kẻ, và không có nét ở giữa ô, giữa sông
  function diemLuoi(L, w, h, q, ky) {
    const H = lapH(q);
    const [a, b, c, d, e, f, g, i] = H;
    const lay = (cot, hang) => {
      const u = cot / 8, v = hang / 9, z = g * u + i * v + 1;
      const x = ((a * u + b * v + c) / z + 0.5) | 0, y = ((d * u + e * v + f) / z + 0.5) | 0;
      if (x < 1 || y < 1 || x >= w - 1 || y >= h - 1) return -1;
      const o = y * w + x;
      let m = L[o];
      if (L[o - 1] > m) m = L[o - 1];
      if (L[o + 1] > m) m = L[o + 1];
      if (L[o - w] > m) m = L[o - w];
      if (L[o + w] > m) m = L[o + w];
      return m;
    };
    const dsT = ky ? [0.3, 0.5, 0.7] : [0.5];
    let tren = 0, ngoai = 0, n = 0, m = 0, roi = 0, song = 0, soSong = 0;
    const doan = (cot, hang, doc) => {
      let v = -1;
      for (const t of dsT) {
        const x = doc ? lay(cot, hang + t) : lay(cot + t, hang);
        if (x < 0) { roi++; continue; }
        if (x > v) v = x;
      }
      if (v >= 0) tren += v;
      n++;
    };
    const lech = (cot, hang) => { const x = lay(cot, hang); if (x >= 0) { ngoai += x; m++; } };
    for (let r = 0; r < 10; r++) for (let k = 0; k < 8; k++) doan(k, r, false);
    for (let k = 0; k < 9; k++) {
      for (let r = 0; r < 9; r++) {
        if (r === 4 && k > 0 && k < 8) {   // sông: cột trong không kẻ (lưới bảng tính thì có)
          for (const t of [4.3, 4.5, 4.7]) { const x = lay(k, t); if (x >= 0) { song += x; soSong++; } }
          continue;
        }
        doan(k, r, true);
      }
    }
    for (let r = 0; r < 9; r++) for (let k = 0; k < 8; k++) { if (r !== 4) lech(k + 0.5, r + 0.5); }
    for (let r = 0; r < 10; r++) for (let k = 0; k < 8; k++) if (ky) lech(k + 0.5, r + (r < 9 ? 0.25 : -0.25));
    if (roi > 8) return -1;
    // Đường chéo cung Tướng: lưới bảng tính, ô giấy không có
    let cheo = 0, dem = 0;
    for (const r0 of [0, 7]) {
      for (const [c0, r1, c1] of [[3, 2, 5], [5, 2, 3]]) {
        for (const t of [0.15, 0.3, 0.7, 0.85]) {
          const x = lay(c0 + (c1 - c0) * t, r0 + r1 * t);
          if (x >= 0) { cheo += x; dem++; }
        }
      }
    }
    cheo = dem ? cheo / dem : 0;
    return tren / n - (m ? ngoai / m : 0) - 0.4 * (soSong ? song / soSong : 0) + 0.25 * cheo;
  }

  // Các đường thẳng dài bằng biến đổi Hough
  function timDuong(L, w, h) {
    const SO_G = 180, cheo = Math.hypot(w, h), RO = Math.ceil(cheo) + 2;
    const cs = new Float32Array(SO_G), sn = new Float32Array(SO_G);
    for (let t = 0; t < SO_G; t++) { cs[t] = Math.cos(t * Math.PI / SO_G); sn[t] = Math.sin(t * Math.PI / SO_G); }
    const phieu = new Float32Array(SO_G * RO);
    const buoc = Math.max(1, Math.round(Math.sqrt(w * h / 90000)));
    for (let y = 0; y < h; y += buoc) {
      for (let x = 0; x < w; x += buoc) {
        const v = L[y * w + x];
        if (v < 0.4) continue;
        for (let t = 0; t < SO_G; t++) {
          const r = ((x * cs[t] + y * sn[t] + cheo) / 2 + 0.5) | 0;
          phieu[t * RO + r] += v;
        }
      }
    }
    const dinh = [];
    for (let t = 0; t < SO_G; t++) {
      for (let r = 2; r < RO - 2; r++) {
        const v = phieu[t * RO + r];
        if (v < 10) continue;
        let la = true;
        for (let dt = -1; dt <= 1 && la; dt++) {
          const tt = (t + dt + SO_G) % SO_G;
          for (let dr = -2; dr <= 2; dr++) {
            const rr = dt + t < 0 || dt + t >= SO_G ? RO - 1 - (r + dr) : r + dr;
            if (rr < 0 || rr >= RO) continue;
            if (phieu[tt * RO + rr] > v) { la = false; break; }
          }
        }
        if (la) dinh.push({ t, ro: r * 2 - cheo, v });
      }
    }
    dinh.sort((a, b) => b.v - a.v);
    // Một đường thẳng sinh nhiều "đường" lệch vài độ, cắt nhau ngay trong ảnh. Đường thật cùng họ không cắt nhau trong ảnh:
    // lấy dần từ mạnh tới yếu, bỏ đường cắt một đường đã lấy ở góc nhỏ, hoặc trùng gần như hoàn toàn
    const lay = [];
    for (const d of dinh.slice(0, 500)) {
      let bo = false;
      for (const e of lay) {
        const g = lech180(d.t, e.t);
        if (g > 25) continue;
        if (g === 0) { if (Math.abs(d.ro - e.ro) < 3) { bo = true; break; } continue; }
        const p = giaoDiem(d, e);
        if (p && p[0] > -8 && p[1] > -8 && p[0] < w + 8 && p[1] < h + 8) { bo = true; break; }
      }
      if (!bo) lay.push(d);
      if (lay.length >= 120) break;
    }
    return lay;
  }
  // Trong một họ đường gần song song, tìm n đường cách đều nhau (cho phép co giãn do chụp nghiêng).
  // Trả các cặp đường biên [đầu, cuối] được nhiều đường khớp nhất.
  // Đường biên có thể bị quân che hết nên không thấy: khi đó suy ra từ các đường còn lại bằng đường cong bậc 2.
  function datLuoi1D(ho, n, cx, cy, soGiu, tamDo) {
    if (ho.length < 2) return [];
    const tam = tamDo * Math.PI / 180, nx = Math.cos(tam), ny = Math.sin(tam);
    const vt = ho.map(d => {
      // Đưa góc về gần tâm họ (đường 179° và -1° là một)
      let t = d.t, ro = d.ro;
      if (t - tamDo > 90) { t -= 180; ro = -ro; } else if (tamDo - t > 90) { t += 180; ro = -ro; }
      const g = t * Math.PI / 180, c = Math.cos(g), s = Math.sin(g);
      return { t, ro, v: d.v, s: (ro - (cx * c + cy * s)) / (nx * c + ny * s || 1e-6) };
    }).sort((a, b) => a.s - b.s);
    const L = vt.length, phieuMax = vt.reduce((m, x) => Math.max(m, x.v), 1), thu = new Map();
    const nap = (k0, buoc, s0) => {   // khớp số thứ tự lưới, chọn khúc n đường nhiều đường thật nhất
      const so = new Map();
      for (const x of vt) {
        const r = (x.s - s0) / buoc, k = Math.round(r);
        if (Math.abs(r - k) < 0.13) { const m = so.get(k); if (!m || Math.abs(r - k) < m.lech) so.set(k, { x, lech: Math.abs(r - k) }); }
      }
      if (so.size < 3) return;
      const dsK = [...so.keys()].sort((p, q) => p - q), xet = new Set();
      for (const o of dsK) {
        for (const dau of [o, o - n + 1]) {
          if (xet.has(dau)) continue;
          xet.add(dau);
          let d = 0;
          for (let k = dau; k < dau + n; k++) { const m = so.get(k); if (m) d += 1 + 0.5 * Math.min(1, m.x.v / phieuMax); }
          // Đường hai đầu có thật thì tin hơn
          if (so.get(dau)) d += 0.25;
          if (so.get(dau + n - 1)) d += 0.25;
          if (d < n * 0.45) continue;
          // Nhiều cặp đường cho cùng một lưới: chỉ giữ một bản, nếu không các lưới khác bị đẩy ra ngoài danh sách
          const khoa = Math.round((s0 + dau * buoc) / 4) + ':' + Math.round(buoc * (n - 1) / 4), cu = thu.get(khoa);
          if (!cu || d > cu.diem) thu.set(khoa, { diem: d, o: dau, buoc, s0, so });
        }
      }
    };
    for (let i = 0; i < L; i++) {
      for (let j = i + 1; j < L; j++) {
        const span = vt[j].s - vt[i].s;
        for (let g = 1; g < n; g++) {
          const buoc = span / g;
          if (buoc < 11) break;
          if (buoc * (n - 1) > 2 * Math.hypot(cx, cy)) continue;
          nap(i, buoc, vt[i].s);
        }
      }
    }
    const dsThu = [...thu.values()].sort((x, y) => y.diem - x.diem);
    const ra = [], daCo = [];
    const giaiBa = (A, b) => {   // hệ 3 x 3
      for (let i = 0; i < 3; i++) {
        let p = i;
        for (let k = i + 1; k < 3; k++) if (Math.abs(A[k][i]) > Math.abs(A[p][i])) p = k;
        [A[i], A[p]] = [A[p], A[i]]; [b[i], b[p]] = [b[p], b[i]];
        if (Math.abs(A[i][i]) < 1e-9) return null;
        for (let k = i + 1; k < 3; k++) { const f = A[k][i] / A[i][i]; for (let j = i; j < 3; j++) A[k][j] -= f * A[i][j]; b[k] -= f * b[i]; }
      }
      const x = [0, 0, 0];
      for (let i = 2; i >= 0; i--) { let v = b[i]; for (let j = i + 1; j < 3; j++) v -= A[i][j] * x[j]; x[i] = v / A[i][i]; }
      return x;
    };
    for (const h of dsThu.slice(0, 160)) {
      // Khớp vị trí s(k) bậc 2 và góc t(k) bậc 1 theo các đường thật trong khúc đã chọn
      let dsDiem = [];
      for (let k = h.o; k < h.o + n; k++) { const m = h.so.get(k); if (m) dsDiem.push([k - h.o, m.x]); }
      if (dsDiem.length < 3) continue;
      let he = null;
      for (let lan = 0; lan < 3; lan++) {
        const A = [[0, 0, 0], [0, 0, 0], [0, 0, 0]], b = [0, 0, 0];
        const mu = dsDiem.length >= 5 ? 1 : 0.0001;   // ít điểm: gần như không cho cong
        for (const [k, x] of dsDiem) {
          const v = [1, k, k * k * mu];
          for (let i = 0; i < 3; i++) { b[i] += v[i] * x.s; for (let j = 0; j < 3; j++) A[i][j] += v[i] * v[j]; }
        }
        for (let i = 0; i < 3; i++) A[i][i] += 1e-6;
        he = giaiBa(A, b);
        if (!he) break;
        he = [he[0], he[1], he[2] * mu];
        const buocTB = (he[1] + he[2] * (n - 1));
        const moi = [];
        for (let k = 0; k < n; k++) {
          const p = he[0] + he[1] * k + he[2] * k * k, sai = Math.abs(he[1] + 2 * he[2] * k) * 0.16;
          let tot = null, ss = sai;
          for (const x of vt) { const e = Math.abs(x.s - p); if (e < ss) { ss = e; tot = x; } }
          if (tot) moi.push([k, tot]);
        }
        void buocTB;
        if (moi.length < 3) break;
        dsDiem = moi;
      }
      if (!he) continue;
      const s0 = he[0], s1 = he[0] + he[1] * (n - 1) + he[2] * (n - 1) * (n - 1);
      if (Math.abs(s1 - s0) < 11 * (n - 1)) continue;
      // Góc: bậc 1 theo số thứ tự
      let sk = 0, st = 0, skk = 0, skt = 0;
      for (const [k, x] of dsDiem) { sk += k; st += x.t; skk += k * k; skt += k * x.t; }
      const m = dsDiem.length, mau = m * skk - sk * sk, g1 = mau ? (m * skt - sk * st) / mau : 0, g0 = (st - g1 * sk) / m;
      const taoDuong = (s, k) => {
        const that = dsDiem.find(([q]) => q === k);
        if (that && Math.abs(that[1].s - s) < 2.5) return that[1];
        const t = g0 + g1 * k, g = t * Math.PI / 180, c = Math.cos(g), sn_ = Math.sin(g);
        return { t, ro: (cx + s * nx) * c + (cy + s * ny) * sn_, v: 0 };
      };
      if (daCo.some(([a, b]) => Math.abs(a - s0) < 4 && Math.abs(b - s1) < 4)) continue;
      daCo.push([s0, s1]);
      ra.push({ a: taoDuong(s0, 0), b: taoDuong(s1, n - 1), diem: dsDiem.length + h.diem * 0.1 });
      if (ra.length >= soGiu) break;
    }
    return ra;
  }
  const giaoDiem = (a, b) => {
    const ta = a.t * Math.PI / 180, tb = b.t * Math.PI / 180;
    const ca = Math.cos(ta), sa = Math.sin(ta), cb = Math.cos(tb), sb = Math.sin(tb), d = ca * sb - sa * cb;
    if (Math.abs(d) < 1e-3) return null;
    return [(a.ro * sb - b.ro * sa) / d, (ca * b.ro - cb * a.ro) / d];
  };
  const lech180 = (a, b) => { const d = Math.abs(a - b) % 180; return d > 90 ? 180 - d : d; };
  function loi(q) {   // tứ giác lồi, đi cùng chiều
    let dau = 0;
    for (let i = 0; i < 4; i++) {
      const p = q[i], r = q[(i + 1) % 4], s = q[(i + 2) % 4];
      const z = (r[0] - p[0]) * (s[1] - r[1]) - (r[1] - p[1]) * (s[0] - r[0]);
      if (!dau) dau = Math.sign(z);
      else if (Math.sign(z) !== dau) return false;
    }
    return !!dau;
  }

  // Làm mờ bản đồ nét để bước dò đầu thấy được đường kẻ ở xa vài điểm ảnh
  function lamMo(L, w, h, r) {
    const t = new Float32Array(L.length), ra = new Float32Array(L.length), chia = 2 * r + 1;
    for (let y = 0; y < h; y++) {
      let s = 0;
      for (let x = -r; x <= r; x++) s += L[y * w + Math.max(0, x)];
      for (let x = 0; x < w; x++) {
        t[y * w + x] = s / chia;
        s += L[y * w + Math.min(w - 1, x + r + 1)] - L[y * w + Math.max(0, x - r)];
      }
    }
    for (let x = 0; x < w; x++) {
      let s = 0;
      for (let y = -r; y <= r; y++) s += t[Math.max(0, y) * w + x];
      for (let y = 0; y < h; y++) {
        ra[y * w + x] = s / chia;
        s += t[Math.min(h - 1, y + r + 1) * w + x] - t[Math.max(0, y - r) * w + x];
      }
    }
    return ra;
  }
  // Chỉnh 4 góc cho khớp lưới nhất, từ thô đến mịn
  function tinhChinh(L, w, h, q, buocDau, Lmo) {
    let tot = q.map(p => p.slice()), diem = diemLuoi(Lmo || L, w, h, tot, true);
    if (Lmo) {
      for (let b = 6; b >= 1.5; b /= 2) {
        let doi = true, vong = 0;
        while (doi && vong++ < 8) {
          doi = false;
          for (let i = 0; i < 4; i++) {
            for (let k = 0; k < 2; k++) {
              for (const s of [-b, b]) {
                const thu = tot.map(p => p.slice());
                thu[i][k] += s;
                const v = diemLuoi(Lmo, w, h, thu, true);
                if (v > diem + 1e-4) { diem = v; tot = thu; doi = true; }
              }
            }
          }
        }
      }
      diem = diemLuoi(L, w, h, tot, true);
    }
    for (let b = buocDau; b >= 0.7; b /= 2) {
      let doi = true, vong = 0;
      while (doi && vong++ < 8) {
        doi = false;
        for (let i = 0; i < 4; i++) {
          for (let k = 0; k < 2; k++) {
            for (const s of [-b, b]) {
              const thu = tot.map(p => p.slice());
              thu[i][k] += s;
              const v = diemLuoi(L, w, h, thu, true);
              if (v > diem + 1e-4) { diem = v; tot = thu; doi = true; }
            }
          }
        }
      }
    }
    return { q: tot, diem };
  }

  // Tìm các hình tròn cùng cỡ (mặt quân): dò mọi tâm + bán kính, đếm số góc có biên theo hướng bán kính
  function timVong(g0, w, h) {
    const gx = new Float32Array(w * h), gy = new Float32Array(w * h);
    const g = lamMo(g0, w, h, 1);   // làm mịn: mặt bàn sần, ảnh JPEG có nhiễu thì độ dốc nhỏ lẻ không tính là biên
    const mau = [];
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const o = y * w + x;
        gx[o] = (g[o + 1] - g[o - 1]) / 2; gy[o] = (g[o + w] - g[o - w]) / 2;
        if ((o & 63) === 0) mau.push(g[o]);
      }
    }
    mau.sort((p, q) => p - q);
    const tp = mau.length ? mau[(mau.length * 0.95) | 0] - mau[(mau.length * 0.05) | 0] : 100;
    const tau = Math.max(6, tp * 0.07), SO = 28, cs = [], sn = [];
    for (let i = 0; i < SO; i++) { cs.push(Math.cos(i * 2 * Math.PI / SO)); sn.push(Math.sin(i * 2 * Math.PI / SO)); }
    const ds = [];
    for (const r of [6, 7, 8, 9, 10, 11, 12, 13, 15, 17, 19, 21, 24, 27, 30, 34, 38, 43, 48]) {
      const buoc = Math.max(2, Math.round(r / 4)), RR = r + 2, cot = Math.ceil((w - 2 * RR) / buoc), hang = Math.ceil((h - 2 * RR) / buoc);
      if (cot <= 0 || hang <= 0) continue;
      const diem = new Float32Array(cot * hang);
      for (let j = 0; j < hang; j++) {
        const cy = RR + j * buoc;
        for (let i = 0; i < cot; i++) {
          const cx = RR + i * buoc;
          let dem = 0;
          for (let t = 0; t < SO; t++) {
            const c = cs[t], s = sn[t];
            for (const q of [r, r - 1, r + 1]) {
              const o = ((cy + q * s + 0.5) | 0) * w + ((cx + q * c + 0.5) | 0);
              const v = gx[o] * c + gy[o] * s;
              if (v > tau || v < -tau) { dem++; break; }
            }
            if (t - dem > SO * 0.3) break;   // đã thiếu quá nhiều góc: bỏ sớm
          }
          diem[j * cot + i] = dem / SO;
        }
      }
      for (let j = 0; j < hang; j++) {
        for (let i = 0; i < cot; i++) {
          const v = diem[j * cot + i];
          if (v < 0.78) continue;
          let dinh = true;
          for (let b = Math.max(0, j - 1); b <= Math.min(hang - 1, j + 1) && dinh; b++) {
            for (let k = Math.max(0, i - 1); k <= Math.min(cot - 1, i + 1); k++) if (diem[b * cot + k] > v) { dinh = false; break; }
          }
          if (dinh) ds.push({ x: RR + i * buoc, y: RR + j * buoc, r, v });
        }
      }
    }
    // Giữ một vòng cho mỗi vị trí, ưu tiên điểm cao rồi bán kính lớn; chọn cỡ có nhiều vòng nhất
    ds.sort((p, q) => q.v - p.v || q.r - p.r);
    const lay = [];
    for (const d of ds) {
      if (lay.some(e => Math.hypot(e.x - d.x, e.y - d.y) < Math.max(e.r, d.r) * 0.7)) continue;
      lay.push(d);
      if (lay.length > 90) break;
    }
    let cuTot = 0, demTot = 0;
    for (const d of lay) {
      const n = lay.filter(e => e.r >= d.r * 0.87 && e.r <= d.r * 1.15).length;
      if (n > demTot || (n === demTot && d.r > cuTot)) { demTot = n; cuTot = d.r; }
    }
    return lay.filter(e => e.r >= cuTot * 0.87 && e.r <= cuTot * 1.15);
  }
  // Từ các vòng cùng cỡ: cỡ ô suy ra từ bán kính, thử đặt một vòng lên từng giao điểm rồi chấm lưới
  function deCuTuVong(vong, Lmo, w, h) {
    if (vong.length < 2) return [];
    // Đủ vòng rõ thì chỉ dùng vòng rõ: vòng nhạt hay là chữ, nút bấm xung quanh, làm lệch phép khớp
    const ro = vong.filter(v => v.v >= 0.9);
    if (ro.length >= 6) vong = ro;
    const R = vong.map(v => v.r).sort((p, q) => p - q)[vong.length >> 1], ds = [], luoi = [];
    // Tìm mạng ô (rộng, cao, gốc) mà nhiều vòng tròn nằm đúng mắt lưới nhất
    for (let tl = 0.3; tl <= 0.56; tl *= 1.012) {
      const cw = R / tl;
      for (let k = 0.96; k <= 1.16; k += 0.02) {
        const ch = cw * k;
        for (const n of vong.slice(0, 16)) {
          let dem = 0;
          for (const v of vong) {
            const fx = (v.x - n.x) / cw, fy = (v.y - n.y) / ch, rx = Math.round(fx), ry = Math.round(fy);
            if (Math.abs(fx - rx) < 0.12 && Math.abs(fy - ry) < 0.12 && Math.abs(rx) <= 8 && Math.abs(ry) <= 9) dem++;
          }
          if (dem >= 3) luoi.push({ cw, ch, n, dem });
        }
      }
    }
    luoi.sort((p, q) => q.dem - p.dem);
    const daXet = [];
    for (const l of luoi) {
      if (daXet.length >= 24) break;
      if (daXet.some(e => Math.abs(e.cw - l.cw) < 0.03 * l.cw && Math.abs(e.ch - l.ch) < 0.03 * l.ch && Math.abs(((l.n.x - e.n.x) / e.cw + 0.5) % 1 - 0.5) < 0.2 && Math.abs(((l.n.y - e.n.y) / e.ch + 0.5) % 1 - 0.5) < 0.2)) continue;
      daXet.push(l);
      // Khớp lại cỡ ô theo các vòng đúng mắt lưới
      let cw = l.cw, ch = l.ch, ax = l.n.x, ay = l.n.y;
      for (let lan = 0; lan < 3; lan++) {
        let si = 0, sx = 0, sii = 0, six = 0, sj = 0, sy = 0, sjj = 0, sjy = 0, m = 0;
        const sai = lan === 0 ? 0.14 : 0.1;
        for (const v of vong) {
          const fx = (v.x - ax) / cw, fy = (v.y - ay) / ch, rx = Math.round(fx), ry = Math.round(fy);
          if (Math.abs(fx - rx) >= sai || Math.abs(fy - ry) >= sai || Math.abs(rx) > 8 || Math.abs(ry) > 9) continue;
          si += rx; sx += v.x; sii += rx * rx; six += rx * v.x; sj += ry; sy += v.y; sjj += ry * ry; sjy += ry * v.y; m++;
        }
        const mx = m * sii - si * si, my = m * sjj - sj * sj;
        if (m >= 3 && mx > 0 && my > 0) {
          const cwM = (m * six - si * sx) / mx, chM = (m * sjy - sj * sy) / my;
          if (cwM > cw * 0.9 && cwM < cw * 1.1) { ax = (sx - cwM * si) / m; cw = cwM; }
          if (chM > ch * 0.9 && chM < ch * 1.1) { ay = (sy - chM * sj) / m; ch = chM; }
        }
      }
      for (let r = 0; r < 10; r++) {
        for (let c = 0; c < 9; c++) {
          const x0 = ax - c * cw, y0 = ay - r * ch, x1 = x0 + 8 * cw, y1 = y0 + 9 * ch;
          if (x0 < 0 || y0 < 0 || x1 >= w || y1 >= h) continue;
          // Các vòng đúng mắt lưới phải nằm trong bàn
          let trong = 0;
          for (const v of vong) {
            const fx = (v.x - ax) / cw, fy = (v.y - ay) / ch;
            if (Math.abs(fx - Math.round(fx)) < 0.14 && Math.abs(fy - Math.round(fy)) < 0.14 && v.x >= x0 - R && v.x <= x1 + R && v.y >= y0 - R && v.y <= y1 + R) trong++;
          }
          if (trong < l.dem * 0.75) continue;
          const q = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], d = diemLuoi(Lmo, w, h, q, true);
          if (d > 0) ds.push({ q, v: d + trong * 0.01 });
        }
      }
    }
    ds.sort((p, q) => q.v - p.v);
    // Bỏ các lưới gần trùng nhau
    const ra = [];
    for (const d of ds) {
      if (ra.some(e => Math.abs(e.q[0][0] - d.q[0][0]) + Math.abs(e.q[0][1] - d.q[0][1]) + Math.abs(e.q[2][0] - d.q[2][0]) + Math.abs(e.q[2][1] - d.q[2][1]) < R)) continue;
      ra.push(d);
      if (ra.length >= 10) break;
    }
    return ra;
  }
  // Tỉ lệ vòng tròn nằm đúng trên giao điểm của lưới
  function khopVong(q, vong) {
    if (!vong.length) return 0;
    const [a, b, c, d, e, f, g, i] = lapH(q), diem = [];
    for (let r = 0; r < 10; r++) for (let k = 0; k < 9; k++) {
      const u = k / 8, v = r / 9, z = g * u + i * v + 1;
      diem.push([(a * u + b * v + c) / z, (d * u + e * v + f) / z]);
    }
    const canh = Math.hypot(q[1][0] - q[0][0], q[1][1] - q[0][1]) / 8;
    let dem = 0;
    for (const v of vong) if (diem.some(p => Math.hypot(p[0] - v.x, p[1] - v.y) < canh * 0.28)) dem++;
    return dem / vong.length;
  }

  // Tìm bàn cờ trong ảnh. Trả { q, diem } theo tọa độ ảnh gốc; diem thấp là không chắc
  function timBan(a) {
    const nho = thuNho(a, 640), w = nho.w, h = nho.h, g = xam(nho), tl = a.w / w;
    const ketQua = [], vong = timVong(g, w, h);
    for (const toi of [true, false]) {
      const L = banDoNet(g, w, h, 3, toi), duong = timDuong(L, w, h);
      // Đề cử từ quân cờ: không bị lưới bảng tính, khung giao diện chi phối
      {
        const Lm = lamMo(L, w, h, 2);
        deCuTuVong(vong, Lm, w, h).slice(0, 6).forEach(c => {
          const r = tinhChinh(L, w, h, c.q, 2, Lm);
          ketQua.push({ q: r.q, diem: r.diem, toi });
        });
      }
      if (duong.length < 4) continue;
      // Hai họ đường gần vuông góc
      const bac = new Float32Array(180);
      duong.forEach(d => { for (let k = -12; k <= 12; k++) bac[(d.t + k + 180) % 180] += d.v; });
      const ghepGoc = t => bac[t] + bac[(t + 90) % 180];
      let t1 = 0;
      for (let t = 0; t < 90; t++) if (ghepGoc(t) > ghepGoc(t1)) t1 = t;
      const ho = (tam) => duong.filter(d => lech180(d.t, tam) <= 22).slice(0, 40);
      const A = ho(t1), B = ho((t1 + 90) % 180);
      if (A.length < 2 || B.length < 2) continue;
      const cx = w / 2, cy = h / 2, nhoNhat = 0.12 * Math.min(w, h);
      const dsTot = [], Lmo = lamMo(L, w, h, 2);
      // Một họ 10 đường (hàng), họ kia 9 đường (cột), và ngược lại nếu bàn nằm ngang trong ảnh
      const t2 = (t1 + 90) % 180;
      for (const [H, tH, C, tC] of [[A, t1, B, t2], [B, t2, A, t1]]) {
        // Giữ nhiều: lưới bảng tính đều tăm tắp, chiếm hết chỗ nếu danh sách ngắn
        const dsH = datLuoi1D(H, 10, cx, cy, 44, tH), dsC = datLuoi1D(C, 9, cx, cy, 44, tC);
        for (const g1 of dsH) {
          for (const g2 of dsC) {
            const p = [giaoDiem(g1.a, g2.a), giaoDiem(g1.a, g2.b), giaoDiem(g1.b, g2.b), giaoDiem(g1.b, g2.a)];
            if (p.some(x => !x || x[0] < -3 || x[1] < -3 || x[0] > w + 3 || x[1] > h + 3)) continue;
            if (!loi(p)) continue;
            const dai = i => Math.hypot(p[i][0] - p[(i + 1) % 4][0], p[i][1] - p[(i + 1) % 4][1]);
            const d0 = dai(0), d1 = dai(1), d2 = dai(2), d3 = dai(3);
            if (Math.min(d0, d1, d2, d3) < nhoNhat) continue;
            if (Math.max(d0, d2) / Math.min(d0, d2) > 2.6 || Math.max(d1, d3) / Math.min(d1, d3) > 2.6) continue;
            // Cạnh đầu tiên của q là chiều 8 ô (đi dọc theo một hàng)
            const q = p[0][1] + p[1][1] <= p[2][1] + p[3][1] ? (Math.abs(p[1][0] - p[0][0]) >= Math.abs(p[1][1] - p[0][1]) ? (p[0][0] <= p[1][0] ? p : [p[1], p[0], p[3], p[2]]) : p) : [p[3], p[2], p[1], p[0]];
            const dat = Math.abs(q[1][0] - q[0][0]) >= Math.abs(q[1][1] - q[0][1]) && q[0][0] > q[1][0] ? [q[1], q[0], q[3], q[2]] : q;
            // Ô cờ gần vuông: ô dẹt hay ô dài là lưới bảng tính. Chụp nghiêng thì ô bị bẹt nhưng hình thang rõ
            const canh = i => Math.hypot(dat[i][0] - dat[(i + 1) % 4][0], dat[i][1] - dat[(i + 1) % 4][1]);
            const oRong = (canh(0) + canh(2)) / 16, oCao = (canh(1) + canh(3)) / 18, tlO_ = oCao / oRong;
            const gonChuNhat = Math.abs(canh(0) - canh(2)) / canh(0) < 0.04 && Math.abs(canh(1) - canh(3)) / canh(1) < 0.04;
            if (gonChuNhat ? tlO_ < 0.8 || tlO_ > 1.3 : tlO_ < 0.55 || tlO_ > 1.7) continue;
            // Xếp hạng trên bản đồ làm mờ: lưới suy ra từ vài đường có thể lệch 1-2 điểm ảnh, đừng để bị loại oan
            dsTot.push({ q: dat.map(x => x.slice()), v: diemLuoi(Lmo, w, h, dat, true) });
          }
        }
      }
      dsTot.sort((x, y) => y.v - x.v);
      dsTot.slice(0, 12).forEach(c => {
        if (c.v <= 0) return;
        const r = tinhChinh(L, w, h, c.q, 2, Lmo);
        ketQua.push({ q: r.q, diem: r.diem, toi });
      });
    }
    if (!ketQua.length) return { q: null, diem: 0, khop: 0 };
    // Điểm cuối = độ khớp đường kẻ + các quân tròn có nằm đúng giao điểm không
    ketQua.forEach(k => { k.khop = khopVong(k.q, vong); k.tong = k.diem + 0.3 * k.khop; });
    ketQua.sort((x, y) => y.tong - x.tong);
    const t = ketQua[0];
    return { q: t.q.map(p => [p[0] * tl, p[1] * tl]), diem: t.diem, khop: t.khop };
  }
  // Người dùng đã kéo 4 góc: chỉnh nhẹ cho khớp đường kẻ, chấm kéo lệch vài điểm ảnh không sao. Chỉ dịch ít, không đổi cả bàn
  function chinhGoc(a, q) {
    const nho = thuNho(a, 640), w = nho.w, h = nho.h, g = xam(nho), tl = w / a.w;
    const qn = q.map(p => [p[0] * tl, p[1] * tl]);
    let tot = null;
    for (const toi of [true, false]) {
      const L = banDoNet(g, w, h, 3, toi), r = tinhChinh(L, w, h, qn, 2, null);
      if (!tot || r.diem > tot.diem) tot = r;
    }
    const canh = Math.hypot(qn[1][0] - qn[0][0], qn[1][1] - qn[0][1]) / 8;
    if (!tot || tot.q.some((p, i) => Math.hypot(p[0] - qn[i][0], p[1] - qn[i][1]) > canh * 0.5)) return q;
    return tot.q.map(p => [p[0] / tl, p[1] / tl]);
  }

  // ---------- Chuẩn hóa chữ: ô mực vuông -> 32x32, đặc trưng hướng nét ----------
  const CO = 32, SO_O = 8, SO_H = 8;
  const CO_DT = SO_O * SO_O * SO_H + SO_O * SO_O;
  function canChu(ink, n) {   // ink: Float32Array n x n, 0..1. Cắt theo khung bao của mực rồi đưa về CO x CO
    const nguong = 0.32;
    const dongX = new Float32Array(n), dongY = new Float32Array(n);
    let tong = 0;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const v = ink[y * n + x]; if (v > nguong) { dongX[x] += v; dongY[y] += v; tong += v; } }
    if (tong < 1) return null;
    const bien = (m, sai) => {   // bỏ phần lẻ tẻ ở hai đầu
      let dau = 0, cuoi = n - 1, c = 0;
      for (; dau < n - 1; dau++) { c += m[dau]; if (c > sai) break; }
      c = 0;
      for (; cuoi > 0; cuoi--) { c += m[cuoi]; if (c > sai) break; }
      return [dau, cuoi];
    };
    const [x0, x1] = bien(dongX, tong * 0.004), [y0, y1] = bien(dongY, tong * 0.004);
    const rong = x1 - x0 + 1, cao = y1 - y0 + 1;
    if (rong < 3 || cao < 3) return null;
    const tl = (CO - 4) / Math.max(rong, cao), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    const ra = new Float32Array(CO * CO);
    for (let y = 0; y < CO; y++) {
      for (let x = 0; x < CO; x++) {
        const sx = cx + (x - (CO - 1) / 2) / tl, sy = cy + (y - (CO - 1) / 2) / tl;
        const ix = Math.floor(sx), iy = Math.floor(sy);
        if (ix < 0 || iy < 0 || ix >= n - 1 || iy >= n - 1) continue;
        const fx = sx - ix, fy = sy - iy, o = iy * n + ix;
        ra[y * CO + x] = ink[o] * (1 - fx) * (1 - fy) + ink[o + 1] * fx * (1 - fy) + ink[o + n] * (1 - fx) * fy + ink[o + n + 1] * fx * fy;
      }
    }
    return ra;
  }
  function dacTrung(c) {   // c: CO x CO -> vector đặc trưng
    const v = new Float32Array(CO_DT), cel = CO / SO_O;
    for (let y = 1; y < CO - 1; y++) {
      for (let x = 1; x < CO - 1; x++) {
        const gx = c[y * CO + x + 1] - c[y * CO + x - 1], gy = c[(y + 1) * CO + x] - c[(y - 1) * CO + x];
        const m = Math.hypot(gx, gy);
        if (m < 0.02) continue;
        let g = Math.atan2(gy, gx);
        if (g < 0) g += Math.PI;
        const b = g / Math.PI * SO_H, b0 = Math.floor(b), f = b - b0;
        // chia phiếu cho 4 ô lân cận để lệch 1-2 điểm ảnh không đổi hẳn đặc trưng
        const ox = x / cel - 0.5, oy = y / cel - 0.5, ix = Math.floor(ox), iy = Math.floor(oy), fx = ox - ix, fy = oy - iy;
        for (const [jx, jy, tx] of [[ix, iy, (1 - fx) * (1 - fy)], [ix + 1, iy, fx * (1 - fy)], [ix, iy + 1, (1 - fx) * fy], [ix + 1, iy + 1, fx * fy]]) {
          if (jx < 0 || jy < 0 || jx >= SO_O || jy >= SO_O) continue;
          const o = (jy * SO_O + jx) * SO_H;
          v[o + (b0 % SO_H)] += m * tx * (1 - f);
          v[o + ((b0 + 1) % SO_H)] += m * tx * f;
        }
      }
    }
    const goc = SO_O * SO_O * SO_H;
    for (let y = 0; y < CO; y++) for (let x = 0; x < CO; x++) {
      v[goc + ((y / cel) | 0) * SO_O + ((x / cel) | 0)] += c[y * CO + x] / (cel * cel);
    }
    let tong = 0;
    for (let i = 0; i < goc; i++) tong += v[i] * v[i];
    tong = Math.sqrt(tong) || 1;
    for (let i = 0; i < goc; i++) v[i] = v[i] / tong * 4;
    return v;
  }
  // Mạng nhỏ: { vao, an, ra, W1, B1, W2, B2 } -> xác suất từng loại. Loại 0 là "không phải quân"
  function duDoan(M, v) {
    const an = M.an, ra = M.ra, h = new Float32Array(an), y = new Float32Array(ra);
    for (let j = 0, k = 0; j < an; j++) {
      let s = M.B1[j];
      for (let i = 0; i < M.vao; i++, k++) s += M.W1[k] * v[i];
      h[j] = s > 0 ? s : 0;
    }
    let tong = 0, lon = -Infinity;
    for (let c = 0, k = 0; c < ra; c++) {
      let s = M.B2[c];
      for (let j = 0; j < an; j++, k++) s += M.W2[k] * h[j];
      y[c] = s;
      if (s > lon) lon = s;
    }
    for (let c = 0; c < ra; c++) { y[c] = Math.exp(y[c] - lon); tong += y[c]; }
    for (let c = 0; c < ra; c++) y[c] /= tong;
    return y;
  }

  // ---------- Đọc quân trên bàn đã biết 4 góc ----------
  const P = 80, S = 60, TAM = (P - 1) / 2;   // ô mẫu P x P, 60 điểm ảnh = 1 cạnh ô
  const SI_HOPLE = [[9, 3], [9, 5], [8, 4], [7, 3], [7, 5]];
  const TV_HOPLE = [[9, 2], [9, 6], [7, 0], [7, 4], [7, 8], [5, 2], [5, 6]];
  const oDung = (t, h, c, duoi) => {   // bên ở phía dưới (duoi = true) đứng được ở (h, c) không
    const H_ = duoi ? h : 9 - h, C_ = duoi ? c : 8 - c;
    if (t === 1) return H_ >= 7 && C_ >= 3 && C_ <= 5;
    if (t === 2) return SI_HOPLE.some(([a, b]) => a === H_ && b === C_);
    if (t === 3) return TV_HOPLE.some(([a, b]) => a === H_ && b === C_);
    if (t === 7) return H_ <= 6 && (H_ <= 4 || C_ % 2 === 0);
    return true;
  };
  const TOI_DA = [0, 1, 2, 2, 2, 2, 2, 5];

  function layMau(a, x, y, ra, o) {   // lấy mẫu song tuyến
    const ix = Math.floor(x), iy = Math.floor(y);
    if (ix < 0 || iy < 0 || ix >= a.w - 1 || iy >= a.h - 1) { ra[o] = ra[o + 1] = ra[o + 2] = 0; return false; }
    const fx = x - ix, fy = y - iy, d = a.d, i = (iy * a.w + ix) * 4, j = i + a.w * 4;
    const w0 = (1 - fx) * (1 - fy), w1 = fx * (1 - fy), w2 = (1 - fx) * fy, w3 = fx * fy;
    ra[o] = d[i] * w0 + d[i + 4] * w1 + d[j] * w2 + d[j + 4] * w3;
    ra[o + 1] = d[i + 1] * w0 + d[i + 5] * w1 + d[j + 1] * w2 + d[j + 5] * w3;
    ra[o + 2] = d[i + 2] * w0 + d[i + 6] * w1 + d[j + 2] * w2 + d[j + 6] * w3;
    return true;
  }
  const trungVi = ds => { const s = Array.from(ds).sort((a, b) => a - b); return s.length ? s[s.length >> 1] : 0; };

  // Trả về { o: [90 ô theo thứ tự ảnh: { p, tin, ... }] }
  function docQuan(a0, q) {
    const M = goc.CoMau;
    // Đưa ảnh về cỡ vừa đủ: 1 ô khoảng 64 điểm ảnh
    const canhTB = (Math.hypot(q[1][0] - q[0][0], q[1][1] - q[0][1]) + Math.hypot(q[2][0] - q[3][0], q[2][1] - q[3][1])) / 2 / 8;
    const tlAnh = canhTB > 80 ? canhTB / 64 : 1;
    const a = tlAnh > 1 ? thuNho(a0, Math.max(a0.w, a0.h) / tlAnh) : a0;
    const rx = a.w / a0.w, ry = a.h / a0.h;
    const qa = q.map(p => [p[0] * rx, p[1] * ry]);
    const [A, B, C, D, E, F, G, I] = lapH(qa);
    const dX = (qa[1][0] - qa[0][0]), dY = (qa[1][1] - qa[0][1]);
    // Tỉ lệ ô: bàn chụp thẳng (hình chữ nhật) thì đo được; bàn chụp nghiêng lấy ô thật gần vuông
    const r1 = Math.hypot(qa[1][0] - qa[0][0], qa[1][1] - qa[0][1]), r2 = Math.hypot(qa[2][0] - qa[3][0], qa[2][1] - qa[3][1]);
    const c1 = Math.hypot(qa[3][0] - qa[0][0], qa[3][1] - qa[0][1]), c2 = Math.hypot(qa[2][0] - qa[1][0], qa[2][1] - qa[1][1]);
    const chuNhat = Math.abs(r1 - r2) / r1 < 0.03 && Math.abs(c1 - c2) / c1 < 0.03 && Math.abs(dX * (qa[3][0] - qa[0][0]) + dY * (qa[3][1] - qa[0][1])) / (r1 * c1) < 0.04;
    const tlO = chuNhat ? ((c1 + c2) / 2 / 9) / ((r1 + r2) / 2 / 8) : 1.06;
    const ban = new Array(90);
    // Màu nền bàn quanh mỗi giao điểm: trung vị các điểm giữa ô
    const m = new Float32Array(3);
    const lay = (c, r) => { const u = c / 8, v = r / 9, z = G * u + I * v + 1; return layMau(a, (A * u + B * v + C) / z, (D * u + E * v + F) / z, m, 0); };
    const mauO = [];
    for (let r = 0; r < 9; r++) for (let k = 0; k < 8; k++) { lay(k + 0.5, r + 0.5); mauO.push([m[0], m[1], m[2]]); }
    const nenChung = [0, 1, 2].map(k => trungVi(mauO.map(x => x[k])));
    // Ngưỡng "khác màu nền" theo độ loang của mặt bàn (vân gỗ, bóng đèn)
    const lechNen = mauO.map(x => Math.abs(x[0] - nenChung[0]) + Math.abs(x[1] - nenChung[1]) + Math.abs(x[2] - nenChung[2])).sort((x, y) => x - y);
    const nguongNen = Math.max(45, lechNen[(lechNen.length * 0.85) | 0] * 1.5);
    const toanBoXam = [];
    for (let i = 0; i < 90; i++) {
      const r = (i / 9) | 0, k = i % 9;
      const anh = new Float32Array(P * P * 3), x = new Float32Array(P * P);
      for (let py = 0, j = 0; py < P; py++) {
        for (let px = 0; px < P; px++, j++) {
          lay(k + (px - TAM) / S, r + (py - TAM) / S * (1 / tlO));
          anh[j * 3] = m[0]; anh[j * 3 + 1] = m[1]; anh[j * 3 + 2] = m[2];
          x[j] = 0.299 * m[0] + 0.587 * m[1] + 0.114 * m[2];
          if (toanBoXam.length < 400000 && (j % 37) === 0) toanBoXam.push(x[j]);
        }
      }
      ban[i] = { r, k, anh, x };
    }
    toanBoXam.sort((x, y) => x - y);
    const tuongPhan = Math.max(30, toanBoXam[(toanBoXam.length * 0.95) | 0] - toanBoXam[(toanBoXam.length * 0.05) | 0]);
    // Ảnh nhỏ phóng lên thì biên trải rộng ra, độ dốc giảm theo đúng tỉ lệ phóng
    const phong = Math.max(1, S / (canhTB / tlAnh));
    const nguongBien = Math.max(3, Math.max(6, tuongPhan * 0.1) / phong);

    // Hình tròn: duyệt tâm + bán kính, đếm góc có biên theo hướng bán kính
    const SO_G = 36, cs = [], sn = [];
    for (let i = 0; i < SO_G; i++) { cs.push(Math.cos(i * 2 * Math.PI / SO_G)); sn.push(Math.sin(i * 2 * Math.PI / SO_G)); }
    // Quân có độ dày: ảnh chụp nghiêng thì mặt quân lệch lên so với giao điểm
    const dsLech = [-12, -8, -4, 0, 4, 8, 12], dsLechY = [-16, -12, -8, -4, 0, 4, 8];
    for (const c of ban) {
      // Bỏ các góc có đường kẻ đi qua (chữ thập, chéo trong cung): chỗ đó luôn có biên dù ô trống
      const trongCung = c.k >= 3 && c.k <= 5 && (c.r <= 2 || c.r >= 7);
      const boGoc = new Uint8Array(SO_G);
      for (let t = 0; t < SO_G; t++) {
        const d9 = Math.min(t % 9, 9 - (t % 9));
        if (d9 <= 1) boGoc[t] = 1;                     // ngang, dọc
        if (trongCung && d9 >= 4) boGoc[t] = 1;        // chéo 45 độ
      }
      const x = c.x, gx = new Float32Array(P * P), gy = new Float32Array(P * P);
      for (let y = 1; y < P - 1; y++) for (let k = 1; k < P - 1; k++) {
        const j = y * P + k;
        gx[j] = (x[j + 1] - x[j - 1]) / 2; gy[j] = (x[j + P] - x[j - P]) / 2;
      }
      let tot = 0, cxT = 0, cyT = 0, rT = 25;
      for (const dy of dsLechY) {
        for (const dx of dsLech) {
          for (let R = 18; R <= 33; R += 1.5) {
            let dem = 0, soDem = 0;
            for (let t = 0; t < SO_G; t++) {
              if (boGoc[t]) continue;
              soDem++;
              const px = TAM + dx + R * cs[t], py = TAM + dy + R * sn[t];
              const ix = px | 0, iy = py | 0;
              if (ix < 1 || iy < 1 || ix >= P - 1 || iy >= P - 1) continue;
              const j = iy * P + ix, rad = gx[j] * cs[t] + gy[j] * sn[t];
              if (Math.abs(rad) > nguongBien) dem++;
            }
            const f = dem / soDem - (Math.abs(dx) + Math.abs(dy)) * 0.0015;
            // Bán kính lớn hơn được ưu tiên: lấy mép quân, không lấy vòng trang trí bên trong
            if (f > tot - 0.04 && (f > tot || (R > rT && dx === cxT && dy === cyT))) { tot = Math.max(tot, f); cxT = dx; cyT = dy; rT = R; }
          }
        }
      }
      // Dò mịn tâm và bán kính theo tổng độ lớn biên: lệch 1-2 điểm ảnh là vòng trang trí không xóa được, chữ bị cắt sai
      let tot2 = -1, cx2 = cxT, cy2 = cyT, r2 = rT;
      if (tot > 0.5) {
        for (let dy = cyT - 4; dy <= cyT + 4; dy++) {
          for (let dx = cxT - 4; dx <= cxT + 4; dx++) {
            for (let R = rT - 2; R <= rT + 2; R += 0.5) {
              let s = 0;
              for (let t = 0; t < SO_G; t++) {
                const px = TAM + dx + R * cs[t], py = TAM + dy + R * sn[t];
                const ix = (px + 0.5) | 0, iy = (py + 0.5) | 0;
                if (ix < 1 || iy < 1 || ix >= P - 1 || iy >= P - 1) continue;
                const j = iy * P + ix, rad = Math.abs(gx[j] * cs[t] + gy[j] * sn[t]);
                s += rad > tuongPhan * 0.5 ? tuongPhan * 0.5 : rad;
              }
              if (s > tot2) { tot2 = s; cx2 = dx; cy2 = dy; r2 = R; }
            }
          }
        }
      }
      c.tron = tot; c.cx = TAM + cx2; c.cy = TAM + cy2; c.R = r2;
    }
    // Màu khác nền trong lõi ô (ngoài chữ thập đường kẻ)
    for (const c of ban) {
      const lan = [];
      // Điểm mẫu tránh đường chéo trong cung và tránh quân ở các giao điểm liền kề
      for (const [dk, dr] of [[-0.5, -0.25], [0.5, -0.25], [-0.5, 0.25], [0.5, 0.25], [-0.25, -0.5], [0.25, -0.5], [-0.25, 0.5], [0.25, 0.5]]) {
        const k = c.k + dk, r = c.r + dr;
        if (k < 0 || k > 8 || r < 0 || r > 9) continue;
        if ((c.r === 4 && dr > 0) || (c.r === 5 && dr < 0)) continue;   // trên sông có chữ, màu khác
        lay(k, r); lan.push([m[0], m[1], m[2]]);
      }
      const nen = lan.length ? [0, 1, 2].map(i => trungVi(lan.map(v => v[i]))) : nenChung;
      c.nen = nen;
      // Lõi ô, không tính dải đường kẻ (cả dải chéo nếu ở trong cung)
      const trongCung = c.k >= 3 && c.k <= 5 && (c.r <= 2 || c.r >= 7);
      let khac = 0, dem = 0;
      for (let py = 0, j = 0; py < P; py++) {
        for (let px = 0; px < P; px++, j++) {
          const dx = px - TAM, dy = py - TAM, rr = dx * dx + dy * dy;
          if (rr > 18 * 18 || Math.abs(dx) < 5 || Math.abs(dy) < 5) continue;
          if (trongCung && Math.abs(Math.abs(dx) - Math.abs(dy)) < 7) continue;
          // Chỉ tính phần nằm trong mặt lưới: ngoài lề bàn và trên sông có màu, có chữ khác
          if ((c.k === 0 && dx < 0) || (c.k === 8 && dx > 0) || (c.r === 0 && dy < 0) || (c.r === 9 && dy > 0) || (c.r === 4 && dy > 0) || (c.r === 5 && dy < 0)) continue;
          dem++;
          const d = Math.abs(c.anh[j * 3] - nen[0]) + Math.abs(c.anh[j * 3 + 1] - nen[1]) + Math.abs(c.anh[j * 3 + 2] - nen[2]);
          if (d > nguongNen) khac++;
        }
      }
      c.khac = khac / (dem || 1);
      // Đường kẻ có đi xuyên tới tâm ô không: ô có quân thì mặt quân che mất. Đo từng nhánh: điểm trên nhánh khác hai điểm bên cạnh, hai điểm bên giống nền bàn
      const diem3 = (x, y) => { const j = ((TAM + y + 0.5) | 0) * P + ((TAM + x + 0.5) | 0); return [c.anh[j * 3], c.anh[j * 3 + 1], c.anh[j * 3 + 2]]; };
      const kc = (u, v) => Math.abs(u[0] - v[0]) + Math.abs(u[1] - v[1]) + Math.abs(u[2] - v[2]);
      const nhanh = [];
      if (c.k > 0) nhanh.push([-1, 0]);
      if (c.k < 8) nhanh.push([1, 0]);
      if (c.r > 0 && !(c.r === 5 && c.k > 0 && c.k < 8)) nhanh.push([0, -1]);
      if (c.r < 9 && !(c.r === 4 && c.k > 0 && c.k < 8)) nhanh.push([0, 1]);
      let thay = 0;
      for (const [ax, ay] of nhanh) {
        let dat = 0;
        for (const d of [9, 12, 15, 18, 21]) {
          const tamD = diem3(ax * d, ay * d), b1 = diem3(ax * d - ay * 9, ay * d + ax * 9), b2 = diem3(ax * d + ay * 9, ay * d - ax * 9);
          if (kc(b1, nen) < nguongNen && kc(b2, nen) < nguongNen && kc(tamD, b1) > 24 && kc(tamD, b2) > 24) dat++;
        }
        if (dat >= 3) thay++;
      }
      c.thayKe = nhanh.length ? thay / nhanh.length : 0;
    }
    // Hai cụm "có quân" / "trống" theo điểm tổng hợp; thấy rõ đường kẻ xuyên qua tâm thì là ô trống
    ban.forEach(c => { c.diem = (c.tron * 0.85 + Math.min(1, c.khac * 1.5) * 0.15) * (c.thayKe >= 0.74 ? 0.45 : c.thayKe >= 0.5 ? 0.8 : 1); });
    const sap = ban.map(c => c.diem).sort((x, y) => x - y);
    let nguong = 0.42, tot = -1;
    for (let i = 1; i < 90; i++) {   // Otsu
      let s0 = 0, s1 = 0;
      for (let k = 0; k < i; k++) s0 += sap[k];
      for (let k = i; k < 90; k++) s1 += sap[k];
      const m0 = s0 / i, m1 = s1 / (90 - i), v = i * (90 - i) * (m1 - m0) * (m1 - m0);
      if (v > tot) { tot = v; nguong = (sap[i - 1] + sap[i]) / 2; }
    }
    nguong = Math.max(0.48, Math.min(0.72, nguong));
    const R_trung = trungVi(ban.filter(c => c.diem >= nguong).map(c => c.R)) || 25;

    // Mực: khác màu mặt quân
    const chiSoQuan = [];
    for (let i = 0; i < 90; i++) {
      const c = ban[i];
      c.coQuan = c.diem >= nguong;
      if (!c.coQuan) continue;
      chiSoQuan.push(i);
      const R = Math.abs(c.R - R_trung) <= 4 ? c.R : R_trung, mat = [[], [], []];
      for (let py = 0; py < P; py += 1) {
        for (let px = 0; px < P; px += 1) {
          const dx = px - c.cx, dy = py - c.cy, rr = Math.sqrt(dx * dx + dy * dy) / R;
          if (rr < 0.35 || rr > 0.9) continue;
          const j = py * P + px;
          mat[0].push(c.anh[j * 3]); mat[1].push(c.anh[j * 3 + 1]); mat[2].push(c.anh[j * 3 + 2]);
        }
      }
      const f = c.mat = mat.map(trungVi);
      c.Rd = R;
      // Khác màu mặt quân, rồi trừ phần loang rộng (mặt quân có bóng đổ, chỗ sáng chỗ tối): chỉ còn nét mảnh, chữ sáng hay tối đều được
      const khac = new Float32Array(P * P);
      for (let j = 0; j < P * P; j++) khac[j] = Math.abs(c.anh[j * 3] - f[0]) + Math.abs(c.anh[j * 3 + 1] - f[1]) + Math.abs(c.anh[j * 3 + 2] - f[2]);
      const nen_ = locCucTri(locCucTri(khac, P, P, 7, false), P, P, 7, true);
      const ink = new Float32Array(P * P), ds = [];
      for (let py = 0, j = 0; py < P; py++) {
        for (let px = 0; px < P; px++, j++) {
          const dx = px - c.cx, dy = py - c.cy, rr = Math.sqrt(dx * dx + dy * dy) / R;
          if (rr > 1.04) continue;   // lấy rộng ra quá mép quân một chút: tâm đo lệch cũng không cắt mất chữ, vết mép xóa ở dưới
          const d = Math.max(0, khac[j] - nen_[j]);
          ink[j] = d;
          if (rr < 0.75) ds.push(d);
        }
      }
      ds.sort((x, y) => x - y);
      const san = ds[(ds.length * 0.5) | 0] * 1.1, toiDa = Math.max(san + 30, ds[(ds.length * 0.97) | 0]);
      for (let j = 0; j < ink.length; j++) ink[j] = ink[j] <= san ? 0 : Math.min(1, (ink[j] - san) / (toiDa - san));
      // Xóa vòng tròn trang trí: vòng mảnh phủ gần kín ở một bán kính, hai bên bán kính đó thưa hẳn (chữ dày không bị xóa nhầm)
      const rDau = Math.floor(R * 0.55), rCuoi = Math.ceil(R * 0.95), phu = new Float32Array(rCuoi + 6), SO_A = 72;
      for (let r_ = rDau - 4; r_ <= rCuoi + 4; r_++) {
        let dem = 0;
        for (let t = 0; t < SO_A; t++) {
          const g = t * 2 * Math.PI / SO_A, x = Math.round(c.cx + r_ * Math.cos(g)), y = Math.round(c.cy + r_ * Math.sin(g));
          if (x >= 0 && y >= 0 && x < P && y < P && ink[y * P + x] > 0.22) dem++;
        }
        phu[Math.max(0, r_)] = dem / SO_A;
      }
      const laVong = new Uint8Array(rCuoi + 6);
      for (let r_ = rDau; r_ <= rCuoi; r_++) {
        const trong_ = phu[Math.max(0, r_ - 4)], ngoai_ = phu[r_ + 4];
        if (phu[r_] > 0.7 && (trong_ < phu[r_] - 0.2 || ngoai_ < phu[r_] - 0.2)) laVong[r_] = 1;
      }
      for (let py = 0, j = 0; py < P; py++) {
        for (let px = 0; px < P; px++, j++) {
          if (!ink[j]) continue;
          const dx = px - c.cx, dy = py - c.cy, rp = Math.sqrt(dx * dx + dy * dy);
          if (rp < rDau - 2 || rp > rCuoi + 2) continue;
          const k = Math.round(rp);
          for (let v = Math.max(rDau, k - 2); v <= Math.min(rCuoi, k + 2); v++) if (laVong[v]) { ink[j] = 0; break; }
        }
      }
      // Xóa vết rời nằm sát mép quân: mảng mực chỉ ở vành ngoài, hoặc mỏng theo bán kính mà dài theo góc (cung tròn)
      const nhan = new Int32Array(P * P), hang_ = new Int32Array(P * P);
      let soNhan = 0;
      for (let j0 = 0; j0 < P * P; j0++) {
        if (nhan[j0] || ink[j0] < 0.3) continue;
        soNhan++;
        let dau = 0, cuoi = 0, rMin = 1e9, rMax = 0, dem = 0, gx_ = 0, gy_ = 0;
        hang_[cuoi++] = j0; nhan[j0] = soNhan;
        while (dau < cuoi) {
          const j = hang_[dau++], x = j % P, y = (j / P) | 0, dx = x - c.cx, dy = y - c.cy, rp = Math.sqrt(dx * dx + dy * dy);
          if (rp < rMin) rMin = rp;
          if (rp > rMax) rMax = rp;
          dem++; gx_ += dx / (rp || 1); gy_ += dy / (rp || 1);
          for (const v of [j - 1, j + 1, j - P, j + P]) {
            if (v < 0 || v >= P * P || nhan[v] || ink[v] < 0.3) continue;
            if (Math.abs((v % P) - x) > 1) continue;
            nhan[v] = soNhan; hang_[cuoi++] = v;
          }
        }
        const moRong = 1 - Math.hypot(gx_, gy_) / (dem || 1);   // 0 = tụ một hướng, lớn = trải dài theo góc
        const chiVanhNgoai = rMin >= R * 0.74, cung = rMax - rMin < R * 0.2 && rMin >= R * 0.55 && moRong > 0.03;
        if (chiVanhNgoai || cung || dem < 3) for (let q = 0; q < cuoi; q++) ink[hang_[q]] = 0;
      }
      c.ink = ink;
    }

    // Loại quân theo mạng đã học, thử các góc xoay
    const xoayMuc = (c, goc_) => {
      const n = P, ra = new Float32Array(n * n), cs_ = Math.cos(goc_), sn_ = Math.sin(goc_);
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
        const dx = x - c.cx, dy = y - c.cy, sx = c.cx + dx * cs_ - dy * sn_, sy = c.cy + dx * sn_ + dy * cs_;
        const ix = Math.floor(sx), iy = Math.floor(sy);
        if (ix < 0 || iy < 0 || ix >= n - 1 || iy >= n - 1) continue;
        const fx = sx - ix, fy = sy - iy, j = iy * n + ix;
        ra[y * n + x] = c.ink[j] * (1 - fx) * (1 - fy) + c.ink[j + 1] * fx * (1 - fy) + c.ink[j + n] * (1 - fx) * fy + c.ink[j + n + 1] * fx * fy;
      }
      return ra;
    };
    const danh = (c, goc_) => {
      const m32 = canChu(goc_ ? xoayMuc(c, goc_) : c.ink, P);
      return m32 ? duDoan(M, dacTrung(m32)) : null;
    };
    const lonNhat = y => { let m1 = 0; for (let t = 1; t < 8; t++) if (y[t] > m1) m1 = y[t]; return m1; };
    const quan = chiSoQuan.map(i => ban[i]);
    let tongTin = 0;
    for (const c of quan) {
      const y0 = danh(c, 0), y1 = danh(c, Math.PI);
      c.y0 = y0; c.y1 = y1; c.xs = y0 || y1; c.xoay = 0;
      tongTin += c.xs ? lonNhat(c.xs) : 0;
    }

    // Bên nào: mức đỏ của mực và mặt quân
    const that = quan.filter(c => c.xs);
    for (const c of that) {
      let tong = 0, duong = 0;
      for (let j = 0; j < P * P; j++) {
        const v = c.ink[j];
        if (v < 0.5) continue;
        const R_ = c.anh[j * 3], G_ = c.anh[j * 3 + 1], B_ = c.anh[j * 3 + 2];
        duong += R_ - Math.max(G_, B_);
        tong++;
      }
      const f = c.mat;
      c.doMuc = tong ? duong / tong : 0;
      c.doMat = f[0] - Math.max(f[1], f[2]);
      c.sangMat = 0.299 * f[0] + 0.587 * f[1] + 0.114 * f[2];
      c.vDo = Math.max(c.doMuc, c.doMat);
    }
    const chia2 = ds => {   // chia 2 cụm theo khoảng cách lớn nhất giữa hai giá trị liền nhau gần giữa
      const s = ds.slice().sort((x, y) => x - y);
      if (s.length < 2) return { nguong: s[0] || 0, cach: 0 };
      let cach = -1, ng = s[0];
      for (let i = 1; i < s.length; i++) {
        const trongSo = Math.min(i, s.length - i) / s.length;
        const v = (s[i] - s[i - 1]) * (trongSo > 0.03 ? 1 : 0.2);
        if (v > cach) { cach = v; ng = (s[i] + s[i - 1]) / 2; }
      }
      return { nguong: ng, cach };
    };
    const dDo = chia2(that.map(c => c.vDo));
    const dSang = chia2(that.map(c => c.sangMat));
    let cachBen = 'do';
    if (dDo.cach < 22) cachBen = dSang.cach > 28 ? 'sang' : 'do';
    that.forEach(c => {
      if (cachBen === 'do') {
        c.ben = c.vDo > Math.max(dDo.nguong, 18) ? 0 : 1;
        c.tinBen = Math.min(1, Math.abs(c.vDo - dDo.nguong) / 30);
      } else {
        c.ben = c.sangMat > dSang.nguong ? 0 : 1;
        c.tinBen = Math.min(1, Math.abs(c.sangMat - dSang.nguong) / 30);
      }
    });

    // Hướng chữ: cả một bên cùng xoay (bàn in, app) nên quyết theo từng bên, tránh từng quân tự lật rồi đọc nhầm
    const nhatLog = (ds, k) => ds.reduce((s, c) => s + Math.log(1e-3 + (c[k] ? lonNhat(c[k]) : 0)), 0);
    for (const b of [0, 1]) {
      const ds = that.filter(c => c.ben === b);
      const lat = nhatLog(ds, 'y1') > nhatLog(ds, 'y0') + 0.15 * ds.length;
      ds.forEach(c => { if (lat && c.y1) { c.xs = c.y1; c.xoay = Math.PI; } else if (c.y0) { c.xs = c.y0; c.xoay = 0; } });
    }
    // Ảnh chụp bàn thật: quân để lệch đủ hướng. Tin thấp thì thử thêm các góc, góc khác phải hơn hẳn mới đổi
    const tinTB = that.reduce((s, c) => s + lonNhat(c.xs), 0) / (that.length || 1);
    if (that.length && !chuNhat && tinTB < 0.8) {
      const dsGoc = [];
      for (let i = 0; i < 12; i++) dsGoc.push(i * Math.PI / 6);
      for (const c of that) {
        let lon = lonNhat(c.xs) + 0.08;
        for (const g of dsGoc) {
          const y = danh(c, g);
          if (!y) continue;
          const m1 = lonNhat(y);
          if (m1 > lon) { lon = m1; c.xs = y; c.xoay = g; }
        }
      }
    }
    // Bỏ các ô mạng cho là không phải quân (chữ trên sông, dấu góc)
    for (let i = that.length - 1; i >= 0; i--) {
      if (that[i].xs[0] > 0.85 && that[i].tron < 0.7) { that[i].coQuan = false; that.splice(i, 1); }
    }

    // Gán loại theo luật: đếm quân và ô đứng được, thử 2 hướng bàn
    // Quy hoạch động trên số quân từng loại đã dùng: tổng log xác suất lớn nhất, đúng số quân tối đa. Ô đứng sai luật bị trừ nặng chứ không cấm,
    // để ảnh lệch một ô vẫn hiện quân cho người soát sửa
    const BUOC = [1, 2, 6, 18, 54, 162, 486, 972];   // cơ số theo TOI_DA + 1: 2, 3, 3, 3, 3, 3, 6
    const SO_TT = 2916;
    const mucLoai = (tt, t) => Math.floor(tt / BUOC[t - 1]) % (TOI_DA[t] + 1);
    const ganBen = (ds, duoi) => {
      let hien = new Float64Array(SO_TT).fill(-Infinity);
      hien[0] = 0;
      const vet = [];
      for (const c of ds) {
        const moi = new Float64Array(SO_TT).fill(-Infinity), v = new Int16Array(SO_TT).fill(-1), vt = new Int8Array(SO_TT);
        const cp = [];
        for (let t = 1; t < 8; t++) cp.push(Math.log(c.xs[t] + 1e-5) - (oDung(t, c.r, c.k, duoi) ? 0 : 7));
        for (let tt = 0; tt < SO_TT; tt++) {
          const g = hien[tt];
          if (g === -Infinity) continue;
          for (let t = 1; t < 8; t++) {
            if (mucLoai(tt, t) >= TOI_DA[t]) continue;
            const n = tt + BUOC[t - 1], x = g + cp[t - 1];
            if (x > moi[n]) { moi[n] = x; v[n] = tt; vt[n] = t; }
          }
        }
        hien = moi;
        vet.push({ v, vt });
      }
      let tot = -Infinity, tt = -1;
      for (let i = 0; i < SO_TT; i++) {
        if (hien[i] === -Infinity) continue;
        const x = hien[i] - (mucLoai(i, 1) === 1 ? 0 : 10);   // thiếu Tướng: trừ điểm
        if (x > tot) { tot = x; tt = i; }
      }
      const gan = [];
      if (tt >= 0) for (let i = ds.length - 1; i >= 0; i--) { gan[i] = vet[i].vt[tt]; tt = vet[i].v[tt]; }
      return { gan, diem: tot };
    };
    const ganHuong = doDuoi => {   // doDuoi: Đỏ ở phía dưới ảnh
      let diem = 0;
      const cl = [];
      for (const b of [0, 1]) {
        // Một bên quá 16 quân là đọc nhầm bên hoặc có ô thừa: bỏ các ô kém chắc nhất
        const ds = that.filter(c => c.ben === b).sort((x, y) => Math.max(...y.xs.slice(1)) - Math.max(...x.xs.slice(1)));
        const giu = ds.slice(0, 16), kq = ganBen(giu, (b === 0) === doDuoi);
        giu.forEach((c, i) => cl.push({ c, t: kq.gan[i] || 0, xs: kq.gan[i] ? c.xs[kq.gan[i]] : 0 }));
        ds.slice(16).forEach(c => cl.push({ c, t: 0, xs: 0 }));
        diem += kq.diem - (ds.length - giu.length) * 12;
      }
      return { cl, diem };
    };
    const h1 = ganHuong(true), h2 = ganHuong(false);
    const huongDo = h1.diem >= h2.diem;
    const chon = huongDo ? h1 : h2;
    const ket = new Int8Array(90), tin = new Float32Array(90);
    chon.cl.forEach(v => {
      if (!v.t) { v.c.coQuan = false; return; }
      const i = v.c.r * 9 + v.c.k;
      ket[i] = v.t + (v.c.ben << 3);
      const lon = Math.max(...v.c.xs.slice(1));
      tin[i] = Math.min(v.xs / (lon || 1) * Math.min(1, lon * 1.25), 0.3 + 0.7 * v.c.tinBen);
    });
    return {
      ban: ket, tin, doDuoi: huongDo, cachBen, chuNhat,
    };
  }

  const API = { timBan, chinhGoc, docQuan, lapH, canChu, dacTrung, duDoan, CO_DT };
  goc.CoAnh = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
