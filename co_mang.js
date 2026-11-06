/* Đấu qua mạng không cần máy chủ riêng: hai máy gặp nhau qua các máy chủ MQTT công cộng bằng WebSocket.
   Nối cùng lúc nhiều máy chủ, máy nào sống thì dùng máy đó; trạng thái phòng giữ trên máy chủ (tin giữ lại) và trên từng điện thoại,
   nên đối thủ tắt app rồi mở lại vẫn tiếp tục được, không cần cùng online.
   Trong tin chỉ có nước đi và tên hiển thị người chơi tự đặt. Ai biết mã phòng cũng xem được ván. */
(() => {
  'use strict';
  const CO = (typeof window !== 'undefined' ? window : globalThis).CO = (typeof window !== 'undefined' ? window : globalThis).CO || {};

  const MAY_CHU = [
    'wss://broker.hivemq.com:8884/mqtt',
    'wss://broker.emqx.io:8084/mqtt',
    'wss://broker-cn.emqx.io:8084/mqtt',
  ];
  const GOC = 'onthi-cotuong/v1/';
  const CHU_MA = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const enc = new TextEncoder(), dec = new TextDecoder();

  // ---------- Trình khách MQTT 3.1.1 tối thiểu ----------
  const chuoi = s => { const b = enc.encode(s); return [b.length >> 8, b.length & 255, ...b]; };
  const doDai = n => { const r = []; do { let x = n % 128; n = Math.floor(n / 128); if (n) x |= 128; r.push(x); } while (n); return r; };
  const goi = (dau, than) => Uint8Array.from([dau, ...doDai(than.length), ...than]);

  class Mqtt {
    constructor(url, id, o) {
      this.url = url; this.id = id; this.o = o; this.mo = false; this.dem = []; this.goiSo = 1; this.ws = null; this.moi = 0; this.dungHan = false; this.henLai = null; this.henTim = null; this.traMuon = 0;
    }
    noi() {
      if (this.dungHan) return;
      let ws;
      try { ws = new WebSocket(this.url, 'mqtt'); } catch (e) { this.henNoiLai(); return; }
      ws.binaryType = 'arraybuffer';
      this.ws = ws;
      ws.onopen = () => {
        const will = this.o.will;
        const co = 0x02 | (will ? 0x04 | 0x20 : 0);
        const than = [...chuoi('MQTT'), 4, co, 0, 30, ...chuoi(this.id)];
        if (will) than.push(...chuoi(will.topic), ...chuoi(will.tin));
        ws.send(goi(0x10, than));
      };
      ws.onmessage = e => this.nhan(new Uint8Array(e.data));
      ws.onerror = () => { /* onclose sẽ chạy tiếp */ };
      ws.onclose = () => {
        const dangMo = this.mo;
        this.mo = false;
        clearInterval(this.henTim);
        if (dangMo && this.o.khiDoi) this.o.khiDoi();
        this.henNoiLai();
      };
    }
    henNoiLai() {
      if (this.dungHan) return;
      clearTimeout(this.henLai);
      this.moi = Math.min(this.moi + 1, 5);
      this.henLai = setTimeout(() => this.noi(), [0, 1000, 2000, 4000, 8000, 15000][this.moi]);
    }
    nhan(u) {
      for (const b of u) this.dem.push(b);
      while (this.dem.length >= 2) {
        let i = 1, n = 0, nhan = 1, du = false;
        for (; i < this.dem.length && i < 5; i++) {
          n += (this.dem[i] & 127) * nhan; nhan *= 128;
          if (!(this.dem[i] & 128)) { du = true; i++; break; }
        }
        if (!du || this.dem.length < i + n) return;
        const dau = this.dem[0], than = this.dem.slice(i, i + n);
        this.dem = this.dem.slice(i + n);
        this.xuLy(dau, than);
      }
    }
    xuLy(dau, t) {
      const kieu = dau >> 4;
      if (kieu === 2) {   // CONNACK
        if (t[1] !== 0) { try { this.ws.close(); } catch (e) { /* đã đóng */ } return; }
        this.mo = true; this.moi = 0;
        clearInterval(this.henTim);
        this.henTim = setInterval(() => { try { this.ws.send(Uint8Array.from([0xC0, 0])); } catch (e) { /* mất kết nối */ } }, 20000);
        if (this.o.khiMo) this.o.khiMo(this);
      } else if (kieu === 3) {   // PUBLISH
        const qos = (dau >> 1) & 3, giu = !!(dau & 1), L = (t[0] << 8) | t[1], topic = dec.decode(Uint8Array.from(t.slice(2, 2 + L)));
        let p = 2 + L;
        if (qos) {
          const a = t[p], b = t[p + 1];
          p += 2;
          try { this.ws.send(Uint8Array.from([0x40, 2, a, b])); } catch (e) { /* mất kết nối */ }
        }
        if (this.o.khiTin) this.o.khiTin(topic, dec.decode(Uint8Array.from(t.slice(p))), giu, this);
      }
    }
    dangKy(topic) {
      if (!this.mo) return;
      const so = this.goiSo = (this.goiSo % 65000) + 1;
      this.ws.send(goi(0x82, [so >> 8, so & 255, ...chuoi(topic), 0]));
    }
    gui(topic, tin, giu) {
      if (!this.mo) return false;
      this.ws.send(goi(0x30 | (giu ? 1 : 0), [...chuoi(topic), ...enc.encode(tin)]));
      return true;
    }
    dong() {
      this.dungHan = true;
      clearTimeout(this.henLai); clearInterval(this.henTim);
      if (this.ws) {
        try { if (this.mo) this.ws.send(Uint8Array.from([0xE0, 0])); this.ws.close(); } catch (e) { /* đã đóng */ }
      }
      this.mo = false;
    }
  }

  // ---------- Phòng đấu ----------
  // Trạng thái phòng: { v, ds, fen, van, do: {id, ten}, den: {id, ten}, ket, yc: {kieu, tu} }, v tăng mỗi lần đổi
  function Phong(o) {
    // o: { ma, toi: {id, ten}, khiDoi(the), khiKetNoi(soMayChu), khiDoiThu(dangOnline), khiChoc(chu), kiemHopLe(the) -> bool, moi }
    this.o = o; this.the = o.the || null; this.doiOn = false; this.daDung = false; this.daNhan = new Set();
    const goc = GOC + o.ma.toLowerCase() + '/';
    this.tThe = goc + 'the'; this.tOn = goc + 'on/'; this.tChoc = goc + 'choc';
    const urls = o.mayChu || MAY_CHU;
    const idMqtt = () => 'ot' + o.toi.id.slice(0, 10) + Math.random().toString(36).slice(2, 8);
    this.noi = urls.map(u => new Mqtt(u, idMqtt(), {
      will: { topic: this.tOn + o.toi.id, tin: '0' },
      khiMo: c => {
        c.dangKy(this.tThe); c.dangKy(this.tOn + '+'); c.dangKy(this.tChoc);
        c.gui(this.tOn + o.toi.id, '1', true);
        // Vừa nối lại: đẩy thế mình đang có để máy chủ và đối thủ cùng bắt kịp
        if (this.the) setTimeout(() => this.dayThe(c), 400);
        if (this.o.khiKetNoi) this.o.khiKetNoi(this.soMo());
      },
      khiDoi: () => { if (this.o.khiKetNoi) this.o.khiKetNoi(this.soMo()); },
      khiTin: (topic, tin) => this.nhanTin(topic, tin),
    }));
    this.noi.forEach(c => c.noi());
    this.thucDay = () => { if (document.visibilityState === 'visible') this.noi.forEach(c => { if (!c.mo && !c.dungHan) { c.moi = 0; clearTimeout(c.henLai); if (!c.ws || c.ws.readyState > 1) c.noi(); } }); };
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', this.thucDay);
  }
  Phong.prototype.soMo = function () { return this.noi.filter(c => c.mo).length; };
  Phong.prototype.dayThe = function (chiMot) {
    const s = JSON.stringify(this.the);
    (chiMot ? [chiMot] : this.noi).forEach(c => c.gui(this.tThe, s, true));
  };
  Phong.prototype.nhanTin = function (topic, tin) {
    if (this.daDung) return;
    if (topic === this.tThe) {
      let s;
      try { s = JSON.parse(tin); } catch (e) { return; }
      if (!s || typeof s.v !== 'number' || !Array.isArray(s.ds)) return;
      if (this.the && s.v < this.the.v) { this.dayThe(); return; }   // máy chủ giữ bản cũ: sửa lại
      if (this.the && s.v === this.the.v) return;
      if (this.o.kiemHopLe && !this.o.kiemHopLe(s)) return;
      this.the = s;
      if (this.o.khiDoi) this.o.khiDoi(s);
    } else if (topic.startsWith(this.tOn)) {
      const id = topic.slice(this.tOn.length);
      if (id === this.o.toi.id) return;
      this.doiOn = tin === '1';
      if (this.o.khiDoiThu) this.o.khiDoiThu(this.doiOn, id);
    } else if (topic === this.tChoc) {
      let c;
      try { c = JSON.parse(tin); } catch (e) { return; }
      // Cùng một tin về từ nhiều máy chủ: chỉ nhận lần đầu
      if (!c || c.tu === this.o.toi.id || this.daNhan.has(c.id)) return;
      this.daNhan.add(c.id);
      if (this.o.khiChoc) this.o.khiChoc(String(c.chu || '').slice(0, 80));
    }
  };
  // Đổi trạng thái: nhận hàm sửa, tăng v, gửi đi
  Phong.prototype.doi = function (sua) {
    const s = JSON.parse(JSON.stringify(this.the));
    sua(s);
    s.v = this.the.v + 1;
    this.the = s;
    this.dayThe();
    if (this.o.khiDoi) this.o.khiDoi(s);
    return s;
  };
  Phong.prototype.choc = function (chu) {
    const s = JSON.stringify({ tu: this.o.toi.id, chu, id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7) });
    this.noi.forEach(c => c.gui(this.tChoc, s, false));
  };
  Phong.prototype.dung = function () {
    this.daDung = true;
    this.noi.forEach(c => { c.gui(this.tOn + this.o.toi.id, '0', true); c.dong(); });
    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', this.thucDay);
  };

  CO.taoMaPhong = () => {
    let s = '';
    const r = new Uint32Array(6);
    (typeof crypto !== 'undefined' ? crypto : { getRandomValues: a => a.map(() => Math.random() * 4e9) }).getRandomValues(r);
    for (let i = 0; i < 6; i++) s += CHU_MA[r[i] % CHU_MA.length];
    return s;
  };
  CO.chuanMa = s => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  CO.Phong = Phong;
  CO.Mqtt = Mqtt;
  CO.MAY_CHU = MAY_CHU;
})();
if (typeof module !== 'undefined') module.exports = (typeof window !== 'undefined' ? window : globalThis).CO;
