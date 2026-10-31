/* Ôn thi GDQP&AN và Triết học — chạy trong WKWebView của app iOS (có cầu nối luu/rung) hoặc trình duyệt thường. */
(() => {
  'use strict';

  const $ = (s, g = document) => g.querySelector(s);
  const $$ = (s, g = document) => [...g.querySelectorAll(s)];
  const CHU = 'ABCD';
  const EM = 'cubic-bezier(.2,.9,.25,1)';
  const giamDong = matchMedia('(prefers-reduced-motion: reduce)');
  // Chế độ chụp màn hình (app: tham số -demo; trình duyệt: #demo=...). Không đọc/ghi dữ liệu thật.
  const DEMO = window.__DEMO__ || (location.hash.match(/demo=([\w-]+)/) || [])[1] || null;

  // ---------- Lưu trữ: UserDefaults của app qua cầu nối, localStorage dự phòng ----------
  const kho = {
    doc(k, macDinh) {
      if (DEMO) return macDinh;
      try {
        const tuApp = window.__LUU__ && window.__LUU__[k];
        const s = tuApp != null ? tuApp : localStorage.getItem('gdqp.' + k);
        return s ? JSON.parse(s) : macDinh;
      } catch (e) { return macDinh; }
    },
    ghi(k, v) {
      if (DEMO) return;
      const s = v == null ? null : JSON.stringify(v);
      try { if (s == null) localStorage.removeItem('gdqp.' + k); else localStorage.setItem('gdqp.' + k, s); } catch (e) { /* trình duyệt chặn bộ nhớ */ }
      try { window.webkit.messageHandlers.luu.postMessage({ k, v: s }); } catch (e) { /* không chạy trong app */ }
    },
  };

  // Rung Taptic Engine qua app; trình duyệt thì bỏ qua
  const rung = kieu => {
    if (DEMO) return;
    try { window.webkit.messageHandlers.rung.postMessage(kieu); }
    catch (e) { if (navigator.vibrate) navigator.vibrate(kieu === 'sai' ? [24, 60, 24] : 12); }
  };

  // ---------- Âm thanh: tổng hợp bằng Web Audio, không cần file ----------
  // iOS chỉ cho phát sau khi người dùng chạm -> AudioContext tạo / đánh thức trong sự kiện chạm.
  let amBat = kho.doc('am', 1) !== 0, ac = null, amTong = null;
  function moAm() {
    if (!ac) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ac = new AC();
      const nen = ac.createDynamicsCompressor();
      amTong = ac.createGain(); amTong.gain.value = 0.95;
      amTong.connect(nen); nen.connect(ac.destination);
    }
    if (ac.state === 'suspended') ac.resume();
    return ac;
  }
  ['touchend', 'click'].forEach(su => addEventListener(su, () => { if (amBat) moAm(); }, { capture: true, passive: true }));

  // Một nốt: dao động + bao âm lượng (lên nhanh, giữ, tắt dần), tùy chọn lọc thấp và rung giọng
  function tieng(c, ra, t, tan, dai, o = {}) {
    const dd = c.createOscillator(), g = c.createGain();
    dd.type = o.kieu || 'sine';
    dd.frequency.setValueAtTime(tan, t);
    if (o.tanCuoi) dd.frequency.exponentialRampToValueAtTime(o.tanCuoi, t + dai);
    if (o.rung) {
      const lfo = c.createOscillator(), lg = c.createGain();
      lfo.frequency.value = o.rung; lg.gain.value = tan * 0.012;
      lfo.connect(lg); lg.connect(dd.frequency); lfo.start(t); lfo.stop(t + dai + 0.05);
    }
    let cuoi = dd;
    if (o.loc) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.loc; f.Q.value = 0.7; dd.connect(f); cuoi = f; }
    const to = o.to || 0.2, vao = o.vao || 0.006;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(to, t + vao);
    if (o.giu) g.gain.setValueAtTime(to, t + o.giu);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dai);
    cuoi.connect(g); g.connect(ra);
    dd.start(t); dd.stop(t + dai + 0.05);
  }
  function chuong(c, ra, t, tan, to) {   // chuông kim loại: nốt gốc + bồi âm lệch
    tieng(c, ra, t, tan, 0.75, { to });
    tieng(c, ra, t, tan * 2.76, 0.32, { to: to * 0.35 });
    tieng(c, ra, t, tan * 5.4, 0.14, { to: to * 0.15 });
  }
  const BAN_AM = {
    dung(c, ra, t) { chuong(c, ra, t, 1318.5, 0.2); chuong(c, ra, t + 0.085, 1975.5, 0.17); },
    sai(c, ra, t) {
      tieng(c, ra, t, 330, 0.2, { kieu: 'triangle', to: 0.26, loc: 1200 });
      tieng(c, ra, t + 0.16, 247, 0.34, { kieu: 'triangle', to: 0.26, loc: 900, tanCuoi: 220 });
    },
    to(c, ra, t) {   // tô ô bằng bút chì: tiếng sột ngắn
      const n = Math.floor(c.sampleRate * 0.08), b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
      const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
      s.buffer = b; f.type = 'bandpass'; f.frequency.value = 3200; f.Q.value = 1.2; g.gain.value = 0.22;
      s.connect(f); f.connect(g); g.connect(ra); s.start(t);
    },
    ken(c, ra, t) {   // kèn hiệu khi được điểm cao: Đô - Mi - Son - Đô cao
      [[523.25, 0, 0.13], [659.25, 0.12, 0.13], [783.99, 0.24, 0.13], [1046.5, 0.36, 0.75]].forEach(([tan, tre, dai]) =>
        tieng(c, ra, t + tre, tan, dai, { kieu: 'sawtooth', to: 0.1, loc: 2400, vao: 0.02, giu: dai * 0.55, rung: dai > 0.5 ? 5.5 : 0 }));
    },
    khen(c, ra, t) { chuong(c, ra, t, 1046.5, 0.16); chuong(c, ra, t + 0.11, 1568, 0.14); },
  };
  function phat(kieu) {
    if (!amBat || DEMO) return;
    const c = moAm();
    if (!c) return;
    try { BAN_AM[kieu](c, amTong, c.currentTime + 0.02); } catch (e) { /* trình duyệt thiếu Web Audio */ }
  }
  if (DEMO) window.__AM__ = BAN_AM;   // cho bài thử dựng tiếng ngoại tuyến

  // ---------- Dữ liệu: hai môn ----------
  // Mỗi môn có bài, đề, lượt đang làm, điểm thi thử và cỡ đề riêng. GDQP giữ khóa lưu cũ ('luot', 'lichsu',
  // 'code') để bản đã cài không mất gì; Triết thêm tiền tố 'tr.'. Tiến độ từng câu chung một bảng vì mã câu
  // hai môn không trùng ('3-17' và 'tr1a2b3c').
  const MON = {
    qp: { ma: 'qp', ten: 'GDQP&AN', tenApp: 'Ôn thi GDQP&AN', bai: 'Bài', kho: '', coMacDinh: 20,
      men: 'g-men-do', menToi: 'g-men-reu', kim: 'g-kim', mauTheme: '#26301F' },
    tr: { ma: 'tr', ten: 'Triết học', tenApp: 'Ôn thi Triết học', bai: 'Chủ đề', kho: 'tr.', coMacDinh: 50,
      men: 'g-men-lam', menToi: 'g-men-muc', kim: 'g-kim-lam', mauTheme: '#222A3D' },
  };
  const CAU = new Map();
  Object.values(MON).forEach(m => {
    const du = window.GDQP[m.ma];
    m.dsBai = du.bai; m.de = du.de; m.bo = du.bo || null;   // bo: 97 câu trong bộ ôn tập cô phát (Triết)
    m.coDS = Object.keys(du.de).map(Number).sort((a, b) => a - b);
    m.baiTheoSo = new Map(du.bai.map(b => [b.so, b]));
    m.tatCa = [];
    du.bai.forEach(b => b.cau.forEach(c => { CAU.set(c.ma, Object.assign({ bai: b.so, mon: m.ma }, c)); m.tatCa.push(c.ma); }));
    m.tong = m.tatCa.length;
    m.luot = kho.doc(m.kho + 'luot', {});       // 'b3' | 'bo' | 'tat' | 'd20-2' | 'luyen' -> lượt đang làm dở
    m.lichSu = kho.doc(m.kho + 'lichsu', {});   // 'd20-2' -> { cao, cuoi, lan }: điểm thi thử
    m.coDe = kho.doc(m.kho + 'code', m.coMacDinh);   // số câu mỗi đề thi thử, chọn trong menu
    if (!m.de[m.coDe]) m.coDe = m.coMacDinh;
  });
  let M = MON[kho.doc('mon', 'qp')] || MON.qp;   // môn đang mở
  let tienDo = kho.doc('tiendo', {});   // ma -> { d: lần cuối đúng (1/0), n: số lần làm, s: số lần sai }
  const luuTienDo = () => kho.ghi('tiendo', tienDo);
  const luuLuot = () => kho.ghi(M.kho + 'luot', M.luot);
  const luuLichSu = () => kho.ghi(M.kho + 'lichsu', M.lichSu);
  // Phiên bản dữ liệu đề thi GDQP: 1 = 10 đề × 100 câu (bỏ), 2 = 12 đề × 20 câu khóa 'd3',
  // 3 = chọn cỡ đề trong menu, khóa 'd20-3' -> đổi khóa của bản 2 để giữ điểm đề 20 câu
  const pb = kho.doc('pb', 1);
  if (pb < 3) {
    const qp = MON.qp, khoaMoi = k => (pb === 2 ? 'd20-' + k.slice(1) : null);
    const cu = Object.keys(qp.luot).filter(k => /^d\d+$/.test(k));
    cu.forEach(k => { const m = khoaMoi(k); if (m) qp.luot[m] = Object.assign(qp.luot[k], { khoa: m }); delete qp.luot[k]; });
    const ls = {};
    Object.keys(qp.lichSu).forEach(k => { const m = /^d\d+$/.test(k) && khoaMoi(k); if (m) ls[m] = qp.lichSu[k]; });
    qp.lichSu = ls;
    kho.ghi('luot', qp.luot); kho.ghi('lichsu', qp.lichSu); kho.ghi('pb', 3);
  }
  // Lượt dở có câu không còn trong dữ liệu (đổi bộ câu hỏi) thì bỏ, tránh mở ra bị lỗi
  Object.values(MON).forEach(m => {
    const hong = Object.keys(m.luot).filter(k => !(m.luot[k].ds || []).every(it => CAU.has(it.ma)));
    if (hong.length) { hong.forEach(k => delete m.luot[k]); kho.ghi(m.kho + 'luot', m.luot); }
  });
  const daThuoc = ma => !!(tienDo[ma] && tienDo[ma].d);
  const ghiTienDo = (ma, dung) => {
    const td = tienDo[ma] || { d: 0, n: 0, s: 0 };
    td.n++; if (!dung) td.s++; td.d = dung ? 1 : 0;
    tienDo[ma] = td;
  };

  const xao = a => {
    a = a.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  };
  const esc = s => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
  const soDiem = v => (Number.isInteger(v) ? String(v) : v.toFixed(1).replace('.', ','));
  // In đậm các cụm viết hoa trong mẹo (từ khóa nhấn mạnh)
  const toDam = s => s.replace(/(\p{Lu}[\p{Lu}\d]+(?:[\s–-]+\p{Lu}[\p{Lu}\d]*)*)/gu, '<b>$1</b>');
  // Gạch chân chữ phủ định trong câu hỏi ("KHÔNG", "không phải", "nào sau đây không đúng", "là sai?")
  const gachPhuDinh = s => s
    .replace(/(KHÔNG(?: ĐÚNG| PHẢI)?|không phải|đáp án sai|\bsai(?=\s*\?))/g, '<u class="phu-dinh">$1</u>')
    .replace(/((?:nào|đâu)(?: sau đây)?(?: là)? )(không (?:đúng|thuộc|bao gồm))/g, '$1<u class="phu-dinh">$2</u>');
  const viet = s => s.charAt(0).toUpperCase() + s.slice(1);
  // Câu lấy từ đâu: 'câu 17 trong đề' (GDQP), 'câu 12 bộ ôn tập của cô' / 'tài liệu lớp' (Triết); coBai thêm bài / chủ đề
  const nguonCau = (c, coBai) => {
    const goc = c.mon === 'qp' ? `câu ${c.nhan} trong đề` : c.soCo ? `câu ${c.soCo} bộ ôn tập của cô` : 'tài liệu lớp';
    return coBai ? `${MON[c.mon].bai.toLowerCase()} ${c.bai}, ${goc}` : goc;
  };
  const doi = ms => new Promise(r => setTimeout(r, ms));
  const soDaTo = l => Object.keys(l.chon).length;

  const laThi = khoa => /^d\d+-\d+$/.test(khoa);           // 'd30-2' = đề 2 của cỡ 30 câu
  const tachThi = khoa => khoa.slice(1).split('-').map(Number);
  const maCuaKhoa = khoa => {
    if (khoa === 'tat') return M.tatCa;
    if (khoa === 'bo') return M.bo;
    if (laThi(khoa)) { const [co, so] = tachThi(khoa); return M.de[co][so - 1]; }
    return M.baiTheoSo.get(+khoa.slice(1)).cau.map(c => c.ma);
  };
  const tenKhoa = khoa => {
    if (khoa === 'tat') return `Cả ${M.tong} câu`;
    if (khoa === 'luyen') return 'Luyện câu sai';
    if (khoa === 'bo') return 'Bộ ôn tập của cô';
    if (laThi(khoa)) { const [co, so] = tachThi(khoa); return `Đề ${so} (${co} câu)`; }
    return `${M.bai} ${khoa.slice(1)}`;
  };
  const gopBai = khoa => khoa === 'tat' || khoa === 'luyen' || khoa === 'bo';   // lượt trộn nhiều bài / chủ đề
  // Mỗi lượt: xáo thứ tự câu và thứ tự đáp án; đáp án kiểu "Tất cả…" giữ ở cuối
  const taoLuot = (khoa, dsMa, chiSai) => ({
    khoa, thi: laThi(khoa) && !chiSai, chiSai: !!chiSai, i: 0, chon: {}, chuoi: 0,
    ds: xao(dsMa).map(ma => ({ ma, tt: CAU.get(ma).ghim ? xao([0, 1, 2]).concat(3) : xao([0, 1, 2, 3]) })),
  });

  // ---------- Huy hiệu (SVG) ----------
  function saoKhoi(cx, cy, R) {  // sao 5 cánh chia mặt sáng / tối cho có khối
    const p = [];
    for (let k = 0; k < 10; k++) {
      const g = (-90 + k * 36) * Math.PI / 180, r = k % 2 ? R * 0.4 : R;
      p.push([cx + r * Math.cos(g), cy + r * Math.sin(g)]);
    }
    return p.map((a, k) => {
      const b = p[(k + 1) % 10];
      return `<path d="M${cx} ${cy}L${a[0].toFixed(2)} ${a[1].toFixed(2)}L${b[0].toFixed(2)} ${b[1].toFixed(2)}Z" fill="url(#${k % 2 ? 'g-sao-toi' : 'g-sao-sang'})"/>`;
    }).join('');
  }
  function sachLua(cx, cy, s) {  // Triết: sách mở + ngọn lửa tri thức, mặt sáng / tối như ngôi sao
    const m = (d, f) => `<path d="${d}" fill="${f}"/>`;
    return `<g transform="translate(${cx} ${cy}) scale(${s})">`
      + m('M-23 15Q-11 12 0 20Q11 12 23 15V17.6Q11 14.6 0 22.6Q-11 14.6-23 17.6Z', '#8A6418')
      + m('M0-1Q-11-8-23-5V15Q-11 12 0 20Z', 'url(#g-sao-sang)')
      + m('M0-1Q11-8 23-5V15Q11 12 0 20Z', 'url(#g-sao-toi)')
      + (s > 0.6 ? '<path d="M-19 1.5Q-11-.5-4 3.4M-19 6.5Q-11 4.5-4 8.4M-19 11.5Q-11 9.5-4 13.4" fill="none" stroke="#B8892A" stroke-width="1.2" stroke-linecap="round" opacity=".75"/>'
        + '<path d="M19 1.5Q11-.5 4 3.4M19 6.5Q11 4.5 4 8.4M19 11.5Q11 9.5 4 13.4" fill="none" stroke="#6E4F12" stroke-width="1.2" stroke-linecap="round" opacity=".6"/>' : '')
      + m('M0-27C-5-19-9-14-7-9.5Q-5-5 0-5Z', 'url(#g-sao-sang)')
      + m('M0-27C5-19 9-14 7-9.5Q5-5 0-5Z', 'url(#g-sao-toi)')
      + m('M0-18.5C-2.6-14-3.8-11.4-2.8-9Q-1.8-7 0-7Q1.8-7 2.8-9C3.8-11.4 2.6-14 0-18.5Z', '#FFF6D2')
      + '</g>';
  }
  // Biểu tượng của môn ở tâm huy hiệu, s = 1 cho huy hiệu lớn (khung 120)
  const bieuTuong = (mon, cx, cy, s) => (mon.ma === 'tr' ? sachLua(cx, cy + 2.5 * s, s) : saoKhoi(cx, cy + 1.5 * s, 27 * s));
  function huyLon(tiLe, khongVong) {
    const C = 2 * Math.PI * 56;
    const vong = khongVong ? '' :
      `<circle cx="60" cy="60" r="56" class="vong-nen"/>
       <circle cx="60" cy="60" r="56" class="vong-tien" stroke-dasharray="${(C * tiLe).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 60 60)"/>`;
    return `<svg viewBox="0 0 120 120" aria-hidden="true">${vong}
      <circle cx="60" cy="60" r="47.5" fill="none" stroke="url(#g-vang)" stroke-width="5" stroke-dasharray="1.7 2.2"/>
      <circle cx="60" cy="60" r="44" fill="url(#g-vang)"/>
      <circle cx="60" cy="60" r="43.4" fill="none" stroke="rgba(255,255,255,.4)" stroke-width="1"/>
      <circle cx="60" cy="60" r="35" fill="url(#${M.men})"/>
      <circle cx="60" cy="60" r="35" fill="none" stroke="#6E4F12" stroke-width="1.4"/>
      ${bieuTuong(M, 60, 60, 1)}</svg>`;
  }
  // so: số bài / chủ đề; null: huy hiệu "cả môn" có biểu tượng môn; chuỗi (vd 'Cô'): bộ ôn tập của cô
  function huyBai(so, tiLe) {
    const xong = tiLe >= 1, C = 2 * Math.PI * 25, dacBiet = typeof so !== 'number';
    const giua = so == null ? bieuTuong(M, 28, 28, 0.39)
      : `<text x="28" y="${dacBiet ? 33 : 33.4}" text-anchor="middle" class="so-bai${dacBiet ? ' chu' : ''}">${so}</text>`;
    return `<svg viewBox="0 0 56 56" class="hb${xong ? ' xong' : ''}" aria-hidden="true">
      <circle cx="28" cy="28" r="25" class="vong-nen"/>
      <circle cx="28" cy="28" r="25" class="vong-tien" stroke-dasharray="${(C * tiLe).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 28 28)"${tiLe > 0 ? '' : ' style="display:none"'}/>
      <circle cx="28" cy="28" r="19.5" fill="url(#${xong ? 'g-vang' : M.kim})"/>
      <circle cx="28" cy="28" r="19" fill="none" stroke="rgba(255,255,255,.3)" stroke-width=".8"/>
      <circle cx="28" cy="28" r="14.8" fill="url(#${xong || dacBiet ? M.men : M.menToi})"/>${giua}</svg>`;
  }

  const ICON_DUNG = '<svg viewBox="0 0 24 24" class="ic" aria-hidden="true"><path d="M5 12.6l4.3 4.2L19.2 7"/></svg>';
  const ICON_SAI = '<svg viewBox="0 0 24 24" class="ic" aria-hidden="true"><path d="M6.6 6.6l10.8 10.8M17.4 6.6L6.6 17.4"/></svg>';

  // ---------- Chuyển màn, hộp hỏi ----------
  const MAN = { chinh: $('#man-chinh'), lam: $('#man-lam'), ket: $('#man-ket') };
  let manHien = 'chinh';
  function diToi(ten, huong) {
    if (ten === manHien) return;
    const tenCu = manHien, cu = MAN[tenCu], moi = MAN[ten];
    manHien = ten;
    moi.hidden = false; moi.style.zIndex = 2; cu.style.zIndex = 1;
    if (giamDong.matches) { cu.hidden = true; return; }
    moi.animate([{ transform: `translateX(${huong * 100}%)` }, { transform: 'none' }], { duration: 440, easing: EM });
    cu.animate([{ transform: 'none', opacity: 1 }, { transform: `translateX(${-huong * 26}%)`, opacity: 0.35 }], { duration: 440, easing: EM })
      .onfinish = () => { if (manHien !== tenCu) cu.hidden = true; };
  }

  function moLop(lop) {
    lop.hidden = false;
    const tam = $('.tam-hoi', lop);
    if (!giamDong.matches) {
      lop.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220 });
      tam.animate([{ transform: 'translateY(100%)' }, { transform: 'none' }], { duration: 420, easing: 'cubic-bezier(.2,1.1,.3,1)' });
    }
    tam.focus({ preventScroll: true });
  }
  // Hộp hỏi dùng chung: trả về giá trị nút được bấm (null nếu chạm ra ngoài)
  function hoi({ tieuDe, noiDung, nut }) {
    return new Promise(xong => {
      const lop = $('#hoi');
      $('#hoi-tieu-de').textContent = tieuDe;
      $('#hoi-noi-dung').textContent = noiDung;
      $('#hoi-nut').innerHTML = nut.map((n, k) => `<button class="nut-${n.kieu}" data-k="${k}">${esc(n.nhan)}</button>`).join('');
      lop.onclick = e => {
        const b = e.target.closest('[data-k]');
        if (e.target !== lop && !b) return;
        lop.hidden = true; lop.onclick = null;
        xong(b ? nut[+b.dataset.k].gt : null);
      };
      moLop(lop);
    });
  }

  // ---------- Trang chính ----------
  function veChinh() {
    const thuoc = M.tatCa.filter(daThuoc).length, tenBai = M.bai.toLowerCase();
    document.title = M.tenApp;
    $('#ten-app').textContent = M.tenApp;
    $('#huy-lon').innerHTML = huyLon(thuoc / M.tong);
    $('#thuoc').innerHTML = thuoc
      ? `Đã thuộc<b>${thuoc}<small>/${M.tong} câu</small></b>`
      : `${M.tong} câu, ${M.dsBai.length} ${tenBai}.<br>Chọn một đề hoặc một ${tenBai} để bắt đầu.`;

    const deHien = M.de[M.coDe];
    $('#nhan-thi').textContent = `Thi thử: ${deHien.length} đề, mỗi đề ${M.coDe} câu`;
    $('#chu-thich-thi').textContent = `Làm xong bấm nộp bài mới chấm điểm (thang 10). ${deHien.length} đề phủ đủ ${M.tong} câu; `
      + 'mỗi lần thi câu hỏi và đáp án được xáo lại. Đổi số câu mỗi đề bằng nút menu ở góc trên.';
    $('#luoi-de').style.setProperty('--cot', deHien.length <= 5 ? deHien.length : 4);
    $('#luoi-de').innerHTML = deHien.map((_, k) => {
      const khoa = `d${M.coDe}-${k + 1}`, l = M.luot[khoa], ls = M.lichSu[khoa];
      let kq, cls = '', nhan;
      if (l) {
        kq = `<span class="kq dang">${soDaTo(l)}/${l.ds.length}</span>`; cls = ' dang-lam';
        nhan = `đang làm, đã tô ${soDaTo(l)} trên ${l.ds.length} câu`;
      } else if (ls) {
        kq = `<span class="kq ${ls.cao >= 8 ? 'cao' : ls.cao >= 5 ? 'vua' : 'thap'}">${soDiem(ls.cao)}</span>`; cls = ' da-thi';
        nhan = `điểm cao nhất ${soDiem(ls.cao)}, đã thi ${ls.lan} lần`;
      } else { kq = '<span class="kq">Chưa thi</span>'; nhan = 'chưa thi'; }
      return `<button class="de${cls}" data-khoa="${khoa}" aria-label="Đề ${k + 1}, ${nhan}"><span class="nhan">Đề</span><b>${k + 1}</b>${kq}</button>`;
    }).join('');

    const dong = (khoa, huy, ten, phu, nhan = ten) =>
      `<li><button class="bai" data-khoa="${khoa}" aria-label="${esc(nhan + '. ' + phu.replace(/<[^>]+>/g, ''))}">${huy}
        <span class="chu-bai"><span class="ten">${esc(ten)}</span><span class="phu">${phu}</span></span></button></li>`;
    const dangLam = l => `<span class="dang">Đang làm câu ${l.i + 1}/${l.ds.length}${l.chiSai ? ' (câu sai)' : ''}</span>`;
    const tienDoNhom = (ds, l) => {
      const n = ds.length, t = ds.filter(daThuoc).length;
      return [t / n, l ? dangLam(l)
        : t === n ? `<span class="xong">✓ Thuộc hết ${n} câu</span>`
        : ds.some(ma => tienDo[ma]) ? `Đã thuộc ${t}/${n} câu` : `${n} câu, chưa làm`];
    };
    // Bộ ôn tập cô phát (chỉ Triết): đề thật lấy 17 câu từ đây
    $('#muc-bo').hidden = !M.bo;
    if (M.bo) {
      const [tl, phu] = tienDoNhom(M.bo, M.luot.bo);
      $('#ds-bo').innerHTML = dong('bo', huyBai('Cô', tl), `Cả bộ ${M.bo.length} câu cô phát, xáo trộn`, phu, 'Bộ ôn tập của cô');
    }
    $('#nhan-bai').textContent = `Học theo ${tenBai}`;
    const hang = M.dsBai.map(b => {
      const [tl, phu] = tienDoNhom(b.cau.map(c => c.ma), M.luot['b' + b.so]);
      return dong('b' + b.so, huyBai(b.so, tl), b.ten, phu, `${M.bai} ${b.so}: ${b.ten}`);
    });
    const lt = M.luot.tat;
    hang.push(dong('tat', huyBai(null, thuoc / M.tong), `Cả ${M.tong} câu, xáo trộn cả ${M.dsBai.length} ${tenBai}`,
      lt ? dangLam(lt) : `Đã thuộc ${thuoc}/${M.tong} câu`));
    $('#ds-bai').innerHTML = hang.join('');
  }

  const EM_NEN = 'cubic-bezier(.3,.6,.2,1)';
  // Vẽ dần các đường đồng thau của nền môn ma, các đường mảnh hiện mờ dần
  function veNen(ma) {
    const lop = $(`.lop-nen[data-mon="${ma}"]`);
    if (!lop || giamDong.matches) return;
    $$('.dm-cai path', lop).forEach((p, k) => {
      const L = p.getTotalLength();
      p.style.strokeDasharray = L;
      p.animate([{ strokeDashoffset: L }, { strokeDashoffset: 0 }], { duration: 1900, delay: 150 + k * 110, easing: EM_NEN, fill: 'backwards' });
    });
    $$('.dm', lop).forEach(g => g.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 1500, easing: 'ease-out' }));
  }
  // Huy hiệu lớn xoay vào, vòng tiến độ chạy tới mức đã thuộc
  function hienHuyLon(tre) {
    if (giamDong.matches) return;
    $('#huy-lon svg').animate([{ transform: 'scale(.5) rotate(-35deg)', opacity: 0 }, { transform: 'none', opacity: 1 }],
      { duration: 950, delay: tre, easing: 'cubic-bezier(.2,1.35,.3,1)', fill: 'backwards' });
    const vong = $('#huy-lon .vong-tien');
    if (vong) {
      const C = 2 * Math.PI * 56;
      vong.animate([{ strokeDasharray: `0 ${C}` }, { strokeDasharray: vong.getAttribute('stroke-dasharray') }],
        { duration: 1300, delay: tre + 300, easing: EM_NEN, fill: 'backwards' });
    }
  }
  function datMon() {   // bảng màu, nút chọn môn và màu thanh trạng thái theo môn đang mở
    document.body.dataset.mon = M.ma;
    $('#chon-mon').dataset.chon = M.ma;
    $$('#chon-mon [role="tab"]').forEach(t => {
      const chon = t.dataset.mon === M.ma;
      t.setAttribute('aria-selected', chon); t.tabIndex = chon ? 0 : -1;
    });
    $('#noi-dung').setAttribute('aria-labelledby', 'tab-' + M.ma);
    $('meta[name="theme-color"]').setAttribute('content', M.mauTheme);
  }

  function moDau() {
    $('#nen').innerHTML = Object.keys(MON).map(ma =>
      `<div class="lop-nen ${ma}${ma === M.ma ? ' hien' : ''}" data-mon="${ma}">${(ma === 'tr' ? window.XOAY_OC : window.DIA_HINH) || ''}</div>`).join('');
    datMon();
    veChinh();
    veNen(M.ma);
    hienHuyLon(250);
  }

  // ---------- Đổi môn: nền hòa sang môn mới, nội dung trượt theo hướng nấc được chọn ----------
  let dangDoiMon = false;
  function doiMon(ma) {
    if (ma === M.ma || dangDoiMon || !MON[ma]) return;
    const huong = Object.keys(MON).indexOf(ma) > Object.keys(MON).indexOf(M.ma) ? 1 : -1;
    M = MON[ma]; kho.ghi('mon', ma);
    rung('chon');
    $('#chon-mon').dataset.chon = ma;   // con trượt chạy ngay, bảng màu đổi lúc nội dung đã khuất
    $$('.lop-nen').forEach(l => l.classList.toggle('hien', l.dataset.mon === ma));
    $('#thong-bao').textContent = `Đã chuyển sang môn ${M.ten}`;
    const nd = $('#noi-dung'), cuon = $('#cuon-chinh');
    const doi = () => { datMon(); veChinh(); cuon.scrollTop = 0; };
    if (giamDong.matches) { doi(); return; }
    dangDoiMon = true;
    nd.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: `translateX(${-huong * 36}px)` }],
      { duration: 170, easing: 'ease-in', fill: 'forwards' }).onfinish = () => {
      doi();
      nd.getAnimations().forEach(a => a.cancel());
      nd.animate([{ opacity: 0, transform: `translateX(${huong * 44}px)` }, { opacity: 1, transform: 'none' }], { duration: 420, easing: EM });
      $$('#luoi-de .de, #ds-bo .bai, #ds-bai .bai', nd).forEach((el, k) => el.animate(
        [{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }],
        { duration: 360, delay: 60 + Math.min(k, 14) * 28, easing: EM, fill: 'backwards' }));
      hienHuyLon(40);
      veNen(ma);
      dangDoiMon = false;
    };
  }

  // ---------- Menu chọn số câu mỗi đề ----------
  function veMenu() {
    $('#nut-am').setAttribute('aria-checked', amBat);
    $('#menu-co').textContent = `Số câu mỗi đề thi thử môn ${M.ten}`;
    $('#menu-chu-thich').textContent = `Đề nào cũng trộn đủ các ${M.bai.toLowerCase()}; làm hết các đề là đi qua đủ ${M.tong} câu.`;
    $('#ds-co').innerHTML = M.coDS.map(co => {
      const chon = co === M.coDe, that = M.ma === 'tr' && co === 50 ? ', bằng đề thi thật' : '';
      return `<button class="co" role="radio" aria-checked="${chon}" data-co="${co}">
        <i class="bong${chon ? ' ngay' : ''}"></i><b>${co}</b><span>câu một đề<small>${M.de[co].length} đề${that}</small></span></button>`;
    }).join('');
  }
  function moMenu() {
    rung('nhe');
    veMenu();
    const lop = $('#menu'), ngan = $('.ngan-menu', lop);
    lop.hidden = false;
    $('#nut-menu').setAttribute('aria-expanded', 'true');
    if (!giamDong.matches) {
      lop.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220 });
      ngan.animate([{ transform: 'translateX(-100%)' }, { transform: 'none' }], { duration: 440, easing: 'cubic-bezier(.2,1.05,.3,1)' });
      $$('.co', ngan).forEach((c, k) => c.animate([{ opacity: 0, transform: 'translateX(-18px)' }, { opacity: 1, transform: 'none' }],
        { duration: 360, delay: 120 + k * 60, easing: EM, fill: 'backwards' }));
    }
    ngan.focus({ preventScroll: true });
  }
  function dongMenu() {
    const lop = $('#menu'), ngan = $('.ngan-menu', lop);
    if (lop.hidden) return;
    $('#nut-menu').setAttribute('aria-expanded', 'false');
    if (giamDong.matches) { lop.hidden = true; return; }
    lop.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 230, fill: 'forwards' });
    ngan.animate([{ transform: 'none' }, { transform: 'translateX(-100%)' }], { duration: 240, easing: 'ease-in', fill: 'forwards' })
      .onfinish = () => { lop.hidden = true; [lop, ngan].forEach(el => el.getAnimations().forEach(a => a.cancel())); };
  }
  function chonCo(co) {
    if (co === M.coDe) return dongMenu();
    M.coDe = co; kho.ghi(M.kho + 'code', co);
    rung('chon');
    $$('#ds-co .co').forEach(b => { b.setAttribute('aria-checked', +b.dataset.co === co); b.querySelector('.bong').classList.remove('ngay'); });
    veChinh();
    if (!giamDong.matches) {
      $$('#luoi-de .de').forEach((d, k) => d.animate([{ opacity: 0, transform: 'scale(.85)' }, { opacity: 1, transform: 'none' }],
        { duration: 380, delay: 280 + k * 35, easing: 'cubic-bezier(.2,1.3,.3,1)', fill: 'backwards' }));
    }
    setTimeout(dongMenu, 320);
  }

  // ---------- Mở bài / đề ----------
  let hienTai = null, daChon = false, dangChuyen = false, henTu = 0;

  async function moKhoa(khoa) {
    rung('nhe');
    const l = M.luot[khoa];
    if (!l || (l.thi ? soDaTo(l) === 0 : l.i === 0)) return batDau(khoa, l || taoLuot(khoa, maCuaKhoa(khoa)));
    const gt = await hoi({
      tieuDe: `${tenKhoa(khoa)} đang làm dở`,
      noiDung: l.thi
        ? `Đã tô ${soDaTo(l)}/${l.ds.length} câu. Làm tiếp, hay xáo đề lại và làm từ đầu?`
        : `Đang ở câu ${l.i + 1} trên ${l.ds.length}${l.chiSai ? ', lượt làm lại câu sai' : ''}. Làm tiếp, hay xáo lại và làm từ đầu?`,
      nut: [
        { nhan: l.thi ? 'Làm tiếp bài thi' : `Làm tiếp câu ${l.i + 1}`, kieu: 'chinh', gt: 'tiep' },
        { nhan: 'Làm lại từ đầu', kieu: 'phu', gt: 'lai' },
        { nhan: 'Để sau', kieu: 'chu', gt: null },
      ],
    });
    if (gt === 'tiep') batDau(khoa, l);
    else if (gt === 'lai') batDau(khoa, taoLuot(khoa, maCuaKhoa(khoa)));
  }
  function batDau(khoa, l) {
    M.luot[khoa] = l; luuLuot();
    hienTai = l;
    MAN.lam.classList.toggle('thi', !!l.thi);
    veLam();
    diToi('lam', 1);
  }

  // ---------- Màn làm bài ----------
  function veTienDo() {
    const l = hienTai, el = $('#tien-do'), n = l.ds.length;
    if (l.thi) {   // thi thử: chỉ cho biết câu nào đã tô, không lộ đúng sai
      if (n <= 40) {
        el.className = 'tien-do';
        el.innerHTML = l.ds.map((it, k) => `<i class="${l.chon[it.ma] != null ? 'da' : k === l.i ? 'dang' : ''}"></i>`).join('');
      } else {
        el.className = 'tien-do lien';
        el.innerHTML = `<i class="da-to" style="width:${(soDaTo(l) / n * 100).toFixed(2)}%"></i>`;
      }
      return;
    }
    const kq = it => { const g = l.chon[it.ma]; return g == null ? null : g === CAU.get(it.ma).da; };
    if (n <= 40) {
      el.className = 'tien-do';
      el.innerHTML = l.ds.map((it, k) => {
        const r = kq(it);
        return `<i class="${r == null ? (k === l.i ? 'dang' : '') : r ? 'dung' : 'sai'}"></i>`;
      }).join('');
    } else {
      let d = 0, s = 0;
      l.ds.forEach(it => { const r = kq(it); if (r === true) d++; else if (r === false) s++; });
      el.className = 'tien-do lien';
      el.innerHTML = `<i class="dung" style="width:${(d / n * 100).toFixed(2)}%"></i><i class="sai" style="width:${(s / n * 100).toFixed(2)}%"></i>`;
    }
  }

  function veDieuHuong() {
    const l = hienTai, n = l.ds.length, da = soDaTo(l);
    $('#thi-truoc').disabled = l.i === 0;
    $('#thi-sau').disabled = l.i === n - 1;
    const p = $('#thi-phieu');
    p.classList.toggle('nop', da === n);
    p.innerHTML = `${da === n ? 'Nộp bài' : 'Phiếu trả lời'}<small>${da}/${n}</small>`;
  }

  function veLam() {
    const l = hienTai, it = l.ds[l.i], c = CAU.get(it.ma);
    $('#lam-bai').textContent = l.thi ? `Đề ${tachThi(l.khoa)[1]}` : gopBai(l.khoa) ? tenKhoa(l.khoa) : `${M.bai} ${c.bai}`;
    $('#lam-ten').textContent = l.thi ? `Thi thử ${l.ds.length} câu, nộp bài mới chấm điểm`
      : l.chiSai ? 'Làm lại câu sai'
      : l.khoa === 'tat' ? `Xáo trộn cả ${M.dsBai.length} ${M.bai.toLowerCase()}`
      : l.khoa === 'bo' ? `${M.bo.length} câu cô phát, xáo trộn` : M.baiTheoSo.get(c.bai).ten;
    $('#lam-dem').innerHTML = `${l.i + 1}<small>/${l.ds.length}</small>`;
    veTienDo();

    let hoiTxt = c.hoi, nhan = '';
    const m = hoiTxt.match(/^CHỌN ĐÁP ÁN SAI\s*:\s*/i);
    if (m) { hoiTxt = hoiTxt.slice(m[0].length); nhan = '<span class="pill-sai">Chọn đáp án sai</span>'; }
    hoiTxt = gachPhuDinh(esc(hoiTxt));
    // thi thử chỉ ghi số câu; luyện tập ghi nguồn, câu trong bộ cô phát tô màu đồng (có thể vào đề thật)
    const viTri = l.thi ? `<span>Câu ${l.i + 1}</span>`
      : `<span${c.soCo ? ' class="nguon-co"' : ''}>${viet(nguonCau(c, gopBai(l.khoa)))}</span>`;
    const g = l.chon[it.ma];
    $('#san').innerHTML = `
      <p class="meta">${nhan}${viTri}</p>
      <h2 class="cau-hoi">${hoiTxt}</h2>
      <div class="ds-pa" role="group" aria-label="Các đáp án">
        ${it.tt.map((goc, k) => `<button class="pa${l.thi && g === goc ? ' chon' : ''}" data-goc="${goc}"${l.thi ? ` aria-pressed="${g === goc}"` : ''}>
          <span class="chu">${CHU[k]}</span><span class="nd">${esc(c.pa[goc])}</span><span class="dau">${l.thi ? '<i class="bong"></i>' : ''}</span></button>`).join('')}
      </div>`;
    $('#cho-meo').innerHTML = '';
    $('#cuon').scrollTop = 0;
    if (l.thi) { $$('#san .pa.chon .bong').forEach(b => b.classList.add('ngay')); veDieuHuong(); return; }
    $('#thanh-duoi').classList.remove('hien');
    daChon = false;
    if (g != null) { daChon = true; apKetQua(g, null, false); }   // mở lại đúng lúc đã chọn mà chưa bấm "Câu tiếp"
  }

  // Trượt nội dung sang câu khác (huong 1: tới, -1: lùi)
  function doiCau(huong) {
    if (giamDong.matches) { veLam(); return; }
    dangChuyen = true;
    const san = $('#san'), meo = $('#cho-meo');
    const ra = [san, meo].map(el => el.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: `translateX(${-huong * 40}px)` }],
      { duration: 170, easing: 'ease-in', fill: 'forwards' }));
    ra[0].onfinish = () => {
      ra.forEach(a => a.cancel());
      veLam();
      san.animate([{ opacity: 0, transform: `translateX(${huong * 46}px)` }, { opacity: 1, transform: 'none' }], { duration: 380, easing: EM });
      $$('.pa', san).forEach((p, k) => p.animate([{ opacity: 0, transform: 'translateY(16px)' }, { opacity: 1, transform: 'none' }],
        { duration: 380, delay: 70 + k * 50, easing: EM, fill: 'backwards' }));
      dangChuyen = false;
    };
  }

  // ----- Luyện tập: chọn là biết đúng sai + mẹo -----
  function chon(nut, ev) {
    if (daChon || dangChuyen) return;
    daChon = true;
    const l = hienTai, it = l.ds[l.i], c = CAU.get(it.ma);
    const goc = +nut.dataset.goc, dung = goc === c.da;
    l.chon[it.ma] = goc;
    l.chuoi = dung ? (l.chuoi || 0) + 1 : 0;
    ghiTienDo(it.ma, dung);
    luuTienDo(); luuLuot();
    apKetQua(goc, ev, true);
  }

  function apKetQua(goc, ev, hieuUng) {
    const l = hienTai, it = l.ds[l.i], c = CAU.get(it.ma), dung = goc === c.da;
    const nuts = $$('#san .pa');
    const nutChon = nuts.find(n => +n.dataset.goc === goc);
    const nutDung = nuts.find(n => +n.dataset.goc === c.da);
    $('#san .ds-pa').classList.add('khoa');
    nuts.forEach(n => {
      n.setAttribute('aria-disabled', 'true');
      if (n !== nutChon && n !== nutDung) n.classList.add('mo');
    });
    nutDung.classList.add('dung');
    nutDung.querySelector('.dau').innerHTML = ICON_DUNG;
    if (!dung) { nutChon.classList.add('sai'); nutChon.querySelector('.dau').innerHTML = ICON_SAI; }
    if (!hieuUng) $$('#san .ic path').forEach(p => { p.style.animation = 'none'; p.style.strokeDashoffset = 0; });
    veTienDo();
    const chuDung = CHU[it.tt.indexOf(c.da)];
    hienMeo(c, dung, chuDung, hieuUng);
    $('#nut-tiep').textContent = l.i + 1 < l.ds.length ? 'Câu tiếp' : 'Xem kết quả';
    $('#thanh-duoi').classList.add('hien');
    $('#thong-bao').textContent = dung ? 'Chính xác.' : `Chưa đúng. Đáp án đúng là ${chuDung}.`;
    if (!hieuUng) return;
    if (dung) {
      rung('dung'); phat('dung');
      const r = nutChon.getBoundingClientRect();
      const x = ev && ev.clientX ? ev.clientX : r.left + r.width / 2;
      const y = ev && ev.clientY ? ev.clientY : r.top + r.height / 2;
      vongBia(x, y);
      phaoSao(x, y, 30, 1);
    } else {
      rung('sai'); phat('sai');
      nutDung.classList.add('nhay');
    }
    setTimeout(cuonToiMeo, 460);   // chờ các đáp án mờ thu gọn xong
  }

  function hienMeo(c, dung, chuDung, hieuUng) {
    const kw = c.k.split(' · ').map((t, i) => `<mark style="--tre:${160 + i * 170}ms">${toDam(esc(t))}</mark>`).join(' ');
    const phu = dung
      ? (hienTai.chuoi >= 2 ? `<small>Chuỗi ${hienTai.chuoi} câu đúng liên tiếp</small>` : '')
      : `<small>Đáp án đúng là ${chuDung}: ${esc(c.pa[c.da])}</small>`;
    $('#cho-meo').innerHTML = `
      <section class="the-meo ${dung ? 'la-dung' : 'la-sai'}${hieuUng && !giamDong.matches ? ' vao' : ''}" aria-label="Từ khóa và mẹo nhớ">
        <div class="ket-luan"><span class="dau-kl">${dung ? ICON_DUNG : ICON_SAI}</span>
          <div><b>${dung ? 'Chính xác' : 'Chưa đúng'}</b>${phu}</div></div>
        <h3>Từ khóa</h3>
        <p class="tu-khoa">${kw}</p>
        <h3>Mẹo nhớ</h3>
        <p class="meo">${toDam(esc(c.m))}</p>
        ${c.nghi ? '<p class="nghi">Đáp án suy luận: giáo trình chưa có câu chữ khớp nguyên văn, nên hỏi lại thầy.</p>' : ''}
        ${c.gc ? `<p class="gc"><b>Ghi chú:</b> ${esc(c.gc)}</p>` : ''}
        ${c.gt ? `<p class="gc"><b>Tài liệu lớp giải thích:</b> ${esc(c.gt)}</p>` : ''}
      </section>`;
    const the = $('.the-meo');
    if (the.classList.contains('vao')) requestAnimationFrame(() => requestAnimationFrame(() => the.classList.add('mo-ra')));
    else the.classList.add('mo-ra', 'ngay');
  }

  function cuonToiMeo() {
    const cuon = $('#cuon'), the = $('.the-meo');
    const nutKq = $$('#san .pa.dung, #san .pa.sai');   // đáp án đúng + đáp án đã chọn sai
    if (!the || !nutKq.length) return;
    const rc = cuon.getBoundingClientRect(), r = the.getBoundingClientRect();
    const day = rc.bottom - $('#thanh-duoi').offsetHeight - 8;   // mép trên thanh "Câu tiếp"
    // Muốn thấy cả thẻ mẹo, nhưng đừng đẩy đáp án đúng / đã chọn khỏi màn trừ khi cần để thấy đầu thẻ
    const canCaThe = r.bottom - day, canDauThe = r.top + 150 - day;
    const giuKq = Math.min(...nutKq.map(n => n.getBoundingClientRect().top)) - rc.top - 8;
    const dich = Math.min(canCaThe, Math.max(giuKq, canDauThe), r.top - rc.top - 12);
    if (dich > 4) cuon.scrollBy({ top: dich, behavior: giamDong.matches ? 'auto' : 'smooth' });
  }

  function cauTiep() {
    if (!daChon || dangChuyen) return;
    const l = hienTai;
    if (l.i + 1 >= l.ds.length) return ketThuc();
    l.i++; luuLuot();
    rung('chon');
    $('#thanh-duoi').classList.remove('hien');
    doiCau(1);
  }

  // ----- Thi thử: tô đáp án, làm xong mới chấm -----
  function chonThi(nut) {
    const l = hienTai, it = l.ds[l.i], goc = +nut.dataset.goc;
    if (dangChuyen || l.chon[it.ma] === goc) return;
    const lanDau = l.chon[it.ma] == null;
    l.chon[it.ma] = goc; luuLuot();
    $$('#san .pa').forEach(n => { n.classList.toggle('chon', n === nut); n.setAttribute('aria-pressed', n === nut); });
    rung('chon'); phat('to');
    veTienDo(); veDieuHuong();
    clearTimeout(henTu);
    if (lanDau && l.i + 1 < l.ds.length) henTu = setTimeout(() => sangCau(l.i + 1), 480);
  }
  function sangCau(toi) {
    const l = hienTai;
    clearTimeout(henTu);
    if (dangChuyen || toi < 0 || toi >= l.ds.length || toi === l.i) return;
    const huong = toi > l.i ? 1 : -1;
    l.i = toi; luuLuot();
    rung('nhe');
    doiCau(huong);
  }

  function moPhieu() {
    const l = hienTai, n = l.ds.length, da = soDaTo(l);
    $('#phieu-dem').innerHTML = `Đã tô <b>${da}</b>/${n}`;
    $('#luoi-phieu').innerHTML = l.ds.map((it, k) => {
      const g = l.chon[it.ma], chu = g == null ? '' : CHU[it.tt.indexOf(g)];
      return `<button class="o${g != null ? ' da' : ''}${k === l.i ? ' dang' : ''}" data-i="${k}" aria-label="Câu ${k + 1}, ${g != null ? 'đã chọn ' + chu : 'chưa tô'}"><span>${k + 1}</span><i>${chu}</i></button>`;
    }).join('');
    $('#phieu-nop').textContent = da < n ? `Nộp bài (còn ${n - da} câu trống)` : 'Nộp bài';
    moLop($('#phieu'));
    const o = $('#luoi-phieu .o.dang');
    if (o) o.scrollIntoView({ block: 'center' });
  }
  const dongPhieu = () => { $('#phieu').hidden = true; };

  async function nopBai() {
    const l = hienTai, trong = l.ds.length - soDaTo(l);
    const gt = await hoi({
      tieuDe: trong ? `Còn ${trong} câu chưa tô` : 'Nộp bài?',
      noiDung: trong ? `Nộp luôn thì ${trong} câu bỏ trống bị tính sai.` : 'Nộp xong sẽ chấm điểm ngay, không sửa đáp án được nữa.',
      nut: [{ nhan: 'Nộp bài', kieu: 'chinh', gt: 1 }, { nhan: trong ? 'Làm tiếp' : 'Xem lại bài', kieu: 'chu', gt: null }],
    });
    if (gt) ketThuc();
  }

  // ---------- Kết quả ----------
  let ketQua = null;
  const xepLoai = d => (d >= 9 ? ['Xuất sắc', 'vang'] : d >= 8 ? ['Giỏi', 'vang'] : d >= 6.5 ? ['Khá', 'bac'] : d >= 5 ? ['Trung bình', 'dong'] : ['Chưa đạt', 'do']);

  function ketThuc() {
    const l = hienTai;
    const ds = l.ds.map((it, k) => {
      const c = CAU.get(it.ma), g = l.chon[it.ma];
      return { k, it, c, g, dung: g === c.da, bo: g == null };
    });
    const tong = ds.length, dung = ds.filter(x => x.dung).length, bo = ds.filter(x => x.bo).length;
    const diem = Math.round(dung / tong * 100) / 10;
    const sai = ds.filter(x => !x.dung);
    let kyLuc = false;
    if (l.thi) {
      ds.forEach(x => { if (!x.bo) ghiTienDo(x.it.ma, x.dung); });   // thi xong mới tính vào mức thuộc
      luuTienDo();
      const ls = M.lichSu[l.khoa] || { cao: 0, cuoi: 0, lan: 0 };
      kyLuc = ls.lan > 0 && diem > ls.cao;
      ls.lan++; ls.cuoi = diem; ls.cao = Math.max(ls.cao, diem);
      M.lichSu[l.khoa] = ls; luuLichSu();
    }
    delete M.luot[l.khoa]; luuLuot();
    ketQua = { khoa: l.khoa, thi: l.thi, ds, sai: sai.map(x => x.it.ma), loc: sai.length ? 'sai' : 'tat' };

    const [loai, mau] = xepLoai(diem);
    const nhanLai = l.thi ? `Thi lại đề ${tachThi(l.khoa)[1]}, xáo mới`
      : `Làm lại ${l.khoa === 'tat' ? `cả ${M.tong} câu` : l.khoa === 'bo' ? 'cả bộ của cô' : `cả ${M.bai.toLowerCase()}`}, xáo mới`;
    const nutSai = !sai.length ? ''
      : l.thi || l.khoa === 'luyen' ? `<button class="nut-chinh" data-lam="luyen">Luyện lại ${sai.length} câu sai</button>`
      : `<button class="nut-chinh" data-lam="sai">Làm lại ${sai.length} câu sai</button>`;
    const nutLai = l.khoa === 'luyen' ? '' : `<button class="${sai.length ? 'nut-phu' : 'nut-chinh'}" data-lam="lai">${nhanLai}</button>`;
    const xemLai = l.thi
      ? `<h2 class="nhan-muc">Xem lại bài làm</h2>
         <div class="loc" role="group" aria-label="Lọc câu">
           <button data-loc="sai" aria-pressed="${ketQua.loc === 'sai'}">Sai và bỏ trống (${sai.length})</button>
           <button data-loc="tat" aria-pressed="${ketQua.loc === 'tat'}">Cả ${tong} câu</button></div>
         <ol class="ds-sai" id="ds-xem">${veXemLai()}</ol>`
      : sai.length ? `<h2 class="nhan-muc">Câu đã làm sai</h2><ol class="ds-sai" id="ds-xem">${veXemLai()}</ol>` : '';
    $('#ket').innerHTML = `
      <div class="huy-ket">${huyLon(1, true)}<i class="loe"></i></div>
      <p class="diem" aria-label="Điểm ${soDiem(diem)} trên 10"><span id="so-diem">${soDiem(diem)}</span><small>/10</small></p>
      <p class="xep-loai ${mau}">${loai}</p>
      <p class="tom-tat">${tenKhoa(l.khoa)}${l.chiSai ? ', lượt làm lại câu sai' : ''}${kyLuc ? '. Điểm cao nhất mới của đề này' : ''}</p>
      <div class="thong-ke"><span class="tk dung">${ICON_DUNG} Đúng ${dung}</span><span class="tk sai">${ICON_SAI} Sai ${tong - dung - bo}</span>${bo ? `<span class="tk bo"><i></i> Bỏ trống ${bo}</span>` : ''}</div>
      <div class="nut-ket">${nutSai}${nutLai}<button class="nut-chu" data-lam="ve">Về trang chính</button></div>
      ${xemLai}`;
    $('#ket').scrollTop = 0;
    diToi('ket', 1);
    if (giamDong.matches) return;
    $('.huy-ket').classList.add('vao');
    demDiem(diem);
    setTimeout(() => {
      const r = $('.huy-ket').getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
      if (diem >= 8) { phaoSao(x, y, 110, 1.55); vongBia(x, y); rung('manh'); phat('ken'); }
      else if (diem >= 5) { phaoSao(x, y, 40, 1.1); rung('dung'); phat('khen'); }
    }, 1150);
  }

  function veXemLai() {
    const { ds, loc, thi } = ketQua;
    return ds.filter(x => loc === 'tat' || !x.dung).map(x => {
      const c = x.c, tt = x.it.tt;
      const nhanKq = x.dung ? 'Đúng' : x.bo ? 'Bỏ trống' : 'Sai';
      const viTri = thi ? `câu ${x.k + 1} (${nguonCau(c, true)})` : nguonCau(c, true);
      return `<li class="${x.dung ? 'la-dung' : x.bo ? 'la-bo' : 'la-sai'}"><details>
        <summary><small><span class="nhan-kq">${nhanKq}</span>, ${viTri}</small>${esc(c.hoi)}</summary>
        <div class="lo">
          ${!x.dung && !x.bo ? `<p class="cs"><b>Đã chọn:</b> ${CHU[tt.indexOf(x.g)]}. ${esc(c.pa[x.g])}</p>` : ''}
          <p class="dd"><b>Đáp án đúng:</b> ${CHU[tt.indexOf(c.da)]}. ${esc(c.pa[c.da])}</p>
          <p class="kk"><b>Từ khóa:</b> ${toDam(esc(c.k.split(' · ').join('; ')))}</p>
          <p>${toDam(esc(c.m))}</p>
          ${c.nghi ? '<p class="nghi">Đáp án suy luận: nên hỏi lại thầy.</p>' : ''}
        </div></details></li>`;
    }).join('');
  }

  function demDiem(diem) {
    const el = $('#so-diem'), T = 1250, t0 = performance.now() + 350;
    const buoc = t => {
      const p = Math.max(0, Math.min(1, (t - t0) / T)), e = 1 - Math.pow(1 - p, 3);
      el.textContent = soDiem(Math.round(diem * e * 10) / 10);
      if (p < 1) requestAnimationFrame(buoc);
    };
    el.textContent = '0';
    requestAnimationFrame(buoc);
  }

  // ---------- Hiệu ứng: vòng bia + pháo sao ----------
  function vongBia(x, y) {
    if (giamDong.matches) return;
    const fx = $('#fx');
    ['giua', '', '', ''].forEach((kieu, k) => {
      const v = document.createElement('i');
      v.className = 'vong ' + kieu;
      v.style.left = x + 'px'; v.style.top = y + 'px';
      v.style.animationDelay = (kieu ? (k - 1) * 120 : 0) + 'ms';
      fx.appendChild(v);
      setTimeout(() => v.remove(), 1300);
    });
  }

  const cv = $('#phao'), ctx = cv.getContext('2d');
  let hat = [], dangVe = false;
  function coKhung() {
    const d = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(innerWidth * d); cv.height = Math.round(innerHeight * d);
    ctx.setTransform(d, 0, 0, d, 0, 0);
  }
  addEventListener('resize', coKhung);
  coKhung();
  const MAU = ['#F2CF73', '#D9AA3D', '#FFF3C4', '#E8B84A', '#9BE8BE', '#F6D57E'];
  function phaoSao(x, y, so, manh) {
    if (giamDong.matches) return;
    for (let k = 0; k < so; k++) {
      const g = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.3;
      const v = (3 + Math.random() * 6.5) * manh;
      hat.push({
        x, y, vx: Math.cos(g) * v, vy: Math.sin(g) * v, r: 3 + Math.random() * 5,
        a: Math.random() * 6.28, va: (Math.random() - 0.5) * 0.32, song: 1, tan: 0.011 + Math.random() * 0.012,
        mau: MAU[k % MAU.length], sao: Math.random() < 0.72,
      });
    }
    if (!dangVe) { dangVe = true; requestAnimationFrame(khung); }
  }
  function veSao(r) {
    ctx.beginPath();
    for (let k = 0; k < 10; k++) {
      const rr = k % 2 ? r * 0.45 : r, g = -Math.PI / 2 + k * Math.PI / 5;
      ctx.lineTo(Math.cos(g) * rr, Math.sin(g) * rr);
    }
    ctx.closePath(); ctx.fill();
  }
  function khung() {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    hat = hat.filter(h => h.song > 0 && h.y < innerHeight + 40);
    for (const h of hat) {
      h.vy += 0.2; h.vx *= 0.985; h.vy *= 0.985;
      h.x += h.vx; h.y += h.vy; h.a += h.va; h.song -= h.tan;
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, h.song * 1.6));
      ctx.translate(h.x, h.y); ctx.rotate(h.a); ctx.fillStyle = h.mau;
      if (h.sao) veSao(h.r); else ctx.fillRect(-h.r * 0.22, -h.r, h.r * 0.44, h.r * 2);
      ctx.restore();
    }
    if (hat.length) requestAnimationFrame(khung);
    else { dangVe = false; ctx.clearRect(0, 0, innerWidth, innerHeight); }
  }

  // ---------- Sự kiện ----------
  const veTrangChinh = () => { rung('nhe'); clearTimeout(henTu); veChinh(); diToi('chinh', -1); };
  $('#nut-menu').addEventListener('click', moMenu);
  $('#menu').addEventListener('click', e => {
    const b = e.target.closest('.co');
    if (b) chonCo(+b.dataset.co);
    else if (e.target.closest('#nut-am')) {
      amBat = !amBat; kho.ghi('am', amBat ? 1 : 0);
      $('#nut-am').setAttribute('aria-checked', amBat);
      rung('chon');
      phat('dung');   // bật lại thì nghe thử luôn
    } else if (e.target.id === 'menu' || e.target.closest('#menu-dong')) dongMenu();
  });
  $('#chon-mon').addEventListener('click', e => { const t = e.target.closest('[role="tab"]'); if (t) doiMon(t.dataset.mon); });
  $('#chon-mon').addEventListener('keydown', e => {   // mũi tên trái / phải chuyển nấc như tab thường
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const ma = e.key === 'ArrowRight' ? 'tr' : 'qp';
    doiMon(ma);
    $('#tab-' + ma).focus();
  });
  $('#luoi-de').addEventListener('click', e => { const b = e.target.closest('.de'); if (b) moKhoa(b.dataset.khoa); });
  ['#ds-bai', '#ds-bo'].forEach(s => $(s).addEventListener('click', e => { const b = e.target.closest('.bai'); if (b) moKhoa(b.dataset.khoa); }));
  $('#san').addEventListener('click', e => {
    const p = e.target.closest('.pa');
    if (p) { if (hienTai.thi) chonThi(p); else chon(p, e); }
  });
  $('#nut-tiep').addEventListener('click', cauTiep);
  $('#nut-ve').addEventListener('click', veTrangChinh);
  $('#thi-truoc').addEventListener('click', () => sangCau(hienTai.i - 1));
  $('#thi-sau').addEventListener('click', () => sangCau(hienTai.i + 1));
  $('#thi-phieu').addEventListener('click', () => { rung('nhe'); if (soDaTo(hienTai) === hienTai.ds.length) nopBai(); else moPhieu(); });
  $('#phieu').addEventListener('click', e => {
    const o = e.target.closest('.o');
    if (o) { dongPhieu(); sangCau(+o.dataset.i); return; }
    if (e.target.id === 'phieu' || e.target.id === 'phieu-dong') dongPhieu();
    else if (e.target.id === 'phieu-nop') { dongPhieu(); nopBai(); }
  });
  $('#ket').addEventListener('click', e => {
    const loc = e.target.closest('[data-loc]');
    if (loc) {
      ketQua.loc = loc.dataset.loc;
      $$('#ket [data-loc]').forEach(b => b.setAttribute('aria-pressed', b === loc));
      $('#ds-xem').innerHTML = veXemLai();
      return;
    }
    const b = e.target.closest('[data-lam]');
    if (!b) return;
    rung('nhe');
    const k = ketQua.khoa;
    if (b.dataset.lam === 'sai') batDau(k, taoLuot(k, ketQua.sai, true));
    else if (b.dataset.lam === 'luyen') batDau('luyen', taoLuot('luyen', ketQua.sai, true));
    else if (b.dataset.lam === 'lai') batDau(k, taoLuot(k, maCuaKhoa(k)));
    else veTrangChinh();
  });

  // ---------- Chế độ chụp màn hình ('triet...' = cùng kiểu cho môn Triết, vd 'triettrang', 'trietdung') ----------
  async function chayDemo(kieu) {
    M.dsBai.forEach(b => b.cau.forEach((c, k) => {
      if (b.so === 1 || (b.so <= 4 && k % 3 !== 0) || (b.so === 7 && k < 9)) tienDo[c.ma] = { d: 1, n: 1, s: 0 };
    }));
    M.luot.b7 = taoLuot('b7', maCuaKhoa('b7')); M.luot.b7.i = 9;
    const d = so => `d${M.coDe}-${so}`;
    M.lichSu = { [d(1)]: { cao: 8.5, cuoi: 8.5, lan: 2 }, [d(2)]: { cao: 7, cuoi: 7, lan: 1 }, [d(4)]: { cao: 4.5, cuoi: 4.5, lan: 1 } };
    const d3 = M.luot[d(3)] = taoLuot(d(3), maCuaKhoa(d(3)));
    d3.ds.slice(0, 7).forEach((it, k) => { d3.chon[it.ma] = it.tt[k % 4]; });
    d3.i = 7;
    veChinh();
    if (kieu === 'trang') return;
    await doi(1500);
    if (kieu === 'menu') return moMenu();
    if (kieu === 'co100') { moMenu(); await doi(900); return chonCo(100); }
    if (kieu === 'hoi') return moKhoa('b7');
    if (kieu === 'bo') return batDau('bo', taoLuot('bo', maCuaKhoa('bo')));
    if (kieu === 'thi' || kieu === 'phieu') {
      batDau(d(3), d3);
      await doi(900);
      if (kieu === 'phieu') return moPhieu();
      const nut = $$('#san .pa')[1];
      return chonThi(nut);
    }
    if (kieu === 'ketthi') {
      const l = taoLuot(d(5), maCuaKhoa(d(5)));
      l.ds.forEach((it, k) => { if (k !== 7) l.chon[it.ma] = k % 6 === 1 ? (CAU.get(it.ma).da + 1) % 4 : CAU.get(it.ma).da; });
      batDau(d(5), l);
      await doi(900);
      return ketThuc();
    }
    batDau('b3', taoLuot('b3', maCuaKhoa('b3')));
    await doi(900);
    if (kieu === 'ket') {
      hienTai.ds.forEach((it, k) => { hienTai.chon[it.ma] = k % 7 === 3 ? (CAU.get(it.ma).da + 1) % 4 : CAU.get(it.ma).da; });
      hienTai.i = hienTai.ds.length - 1;
      daChon = true;
      return ketThuc();
    }
    if (kieu === 'lam') return;
    const c = CAU.get(hienTai.ds[0].ma);
    const nut = $$('#san .pa').find(n => (+n.dataset.goc === c.da) === (kieu === 'dung'));
    const r = nut.getBoundingClientRect();
    chon(nut, { clientX: r.left + r.width * 0.7, clientY: r.top + r.height / 2 });
  }

  if (DEMO && DEMO.startsWith('triet')) M = MON.tr;
  moDau();
  if (DEMO) chayDemo(DEMO.replace(/^triet/, '') || 'trang');
})();
