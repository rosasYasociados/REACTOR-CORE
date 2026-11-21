/* Cámara del núcleo (Canvas 2D con profundidad simulada). Se anima siempre y reacciona al estado ficticio.
   Los parámetros de efecto se interpolan para que las transiciones entre estados sean suaves. */
(function (N) {
  'use strict';
  var TAU = Math.PI * 2;

  // Efectos visuales por estado (hue null = color del tema elegido)
  var FX = {
    OFFLINE:      { hue: 215,  flicker: 0,   shake: 0,   waves: 0.5, smoke: 0,   sparks: 0,   strobe: 0,   radar: 0 },
    STABLE:       { hue: null, flicker: 0,   shake: 0,   waves: 1,   smoke: 0,   sparks: 0,   strobe: 0,   radar: 0 },
    UNSTABLE:     { hue: 48,   flicker: 0.6, shake: 1.2, waves: 2.2, smoke: 0,   sparks: 0,   strobe: 0,   radar: 0 },
    RADIATION:    { hue: 125,  flicker: 0.1, shake: 0.4, waves: 1.6, smoke: 0,   sparks: 0,   strobe: 0,   radar: 1 },
    EMERGENCY:    { hue: 14,   flicker: 0.3, shake: 2.5, waves: 3,   smoke: 0.3, sparks: 0.5, strobe: 1,   radar: 0 },
    FAILURE:      { hue: 0,    flicker: 0.4, shake: 4,   waves: 2.5, smoke: 1,   sparks: 1,   strobe: 0.5, radar: 0 },
    CATASTROPHE:  { hue: 0,    flicker: 0.5, shake: 14,  waves: 4,   smoke: 3,   sparks: 3,   strobe: 1.5, radar: 0 }
  };
  var KEYS = ['flicker', 'shake', 'waves', 'smoke', 'sparks', 'strobe', 'radar'];

  function Reactor(canvas) {
    this.cv = canvas; this.ctx = canvas.getContext('2d');
    this.w = 0; this.h = 0; this.dpr = 1;
    this.hue = 190; this.themeHue = 190;
    this.fx = FX.OFFLINE; this.fxName = 'OFFLINE';
    this.cur = { flicker: 0, shake: 0, waves: 0.5, smoke: 0, sparks: 0, strobe: 0, radar: 0 };
    this.energy = 0.06; this.energyTarget = 0.06;
    this.intensity = 1; this.speed = 1; this.coreScale = 1;
    this.vfx = true; this.shakeOn = true;             // opciones del usuario (Visual Effects / Screen Shake)
    this.waves = []; this.waveTimer = 0; this.parts = []; this.smoke = []; this.sparks = []; this.arcs = []; this.ripples = []; this.pulse = 0;
    var self = this;
    if (window.ResizeObserver) new ResizeObserver(function () { self.resize(); }).observe(canvas);
    else window.addEventListener('resize', function () { self.resize(); });
    this.resize();
  }

  Reactor.prototype.resize = function () {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = this.cv.clientWidth; this.h = this.cv.clientHeight;
    if (!this.w || !this.h) return;
    this.cv.width = this.w * dpr; this.cv.height = this.h * dpr; this.dpr = dpr;
    var n = this.w < 500 ? 90 : 160;
    if (this.parts.length !== n) {
      this.parts = [];
      for (var i = 0; i < n; i++) this.parts.push({
        a: Math.random() * TAU, r: 0.18 + Math.random() * 0.75, y: Math.random() * 2 - 1,
        v: (Math.random() < 0.5 ? -1 : 1) * (0.2 + Math.random() * 0.9), s: 0.8 + Math.random() * 1.8,
        tw: Math.random() * TAU, boost: 0
      });
    }
  };

  // Aplica un efecto por nombre y la energía visual objetivo (0..1); al cambiar de estado lanza una onda de transición
  Reactor.prototype.setFx = function (name, energy) {
    var f = FX[name] || FX.STABLE;
    if (name !== this.fxName) {
      this.fxName = name;
      if (this.vfx && this.ripples.length < 4) { this.ripples.push({ p: 0, hue: f.hue === null ? this.themeHue : f.hue }); this.pulse = 1; }
    }
    this.fx = f; this.energyTarget = energy;
  };
  // Vacía los efectos transitorios (reinicio)
  Reactor.prototype.clearFx = function () {
    this.smoke = []; this.sparks = []; this.arcs = []; this.ripples = []; this.pulse = 0; this.coreScale = 1;
  };

  Reactor.prototype.frame = function (dt, t) {
    var ctx = this.ctx, w = this.w, h = this.h, fx = this.fx, cu = this.cur, vfx = this.vfx;
    if (!w || !h) return;
    var k = Math.min(1, dt * 3), kf = Math.min(1, dt * 2.5), i;
    this.energy += (this.energyTarget - this.energy) * k;
    this.hue += ((fx.hue === null ? this.themeHue : fx.hue) - this.hue) * k;
    for (i = 0; i < KEYS.length; i++) {            // transición suave de los parámetros de efecto
      var key = KEYS[i], tg = fx[key];
      if (!vfx && (key === 'flicker' || key === 'strobe' || key === 'smoke' || key === 'sparks')) tg = 0;
      if (key === 'shake' && !this.shakeOn) tg = 0;
      cu[key] += (tg - cu[key]) * kf;
    }
    this.pulse = Math.max(0, this.pulse - dt * 1.2);
    var e = this.energy, sp = this.speed, hue = this.hue;
    var strobe = cu.strobe > 0.01 ? 1 + cu.strobe * 0.35 * Math.sin(t * 16) : 1;
    var breath = 1 + 0.06 * Math.sin(t * 0.8) + 0.04 * Math.sin(t * 2.1);         // variación lenta de brillo
    var I = this.intensity * strobe * breath * (1 + 0.6 * this.pulse);
    var cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.46;
    var col = function (l, a) { return 'hsla(' + hue.toFixed(0) + ',100%,' + l + '%,' + Math.max(0, a) + ')'; };

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    if (cu.shake > 0.02) ctx.translate((Math.random() - 0.5) * cu.shake * 2, (Math.random() - 0.5) * cu.shake * 2);

    // Resplandor ambiental
    var bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 1.15);
    bg.addColorStop(0, col(50, Math.min(0.55, 0.16 + 0.3 * e) * I)); bg.addColorStop(1, col(40, 0));
    ctx.fillStyle = bg; ctx.fillRect(-20, -20, w + 40, h + 40);

    // Anillo exterior con marcas giratorias
    ctx.lineWidth = 1.5; ctx.strokeStyle = col(55, 0.55 * I);
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
    ctx.strokeStyle = col(60, 0.7 * I); ctx.lineWidth = 2;
    var rot = t * 0.15 * sp;
    for (i = 0; i < 72; i++) {
      var a = rot + i * TAU / 72, l = i % 6 === 0 ? 14 : 6;
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * (R - 4), cy + Math.sin(a) * (R - 4));
      ctx.lineTo(cx + Math.cos(a) * (R - 4 - l), cy + Math.sin(a) * (R - 4 - l)); ctx.stroke();
    }

    // Anillos inclinados (profundidad 3D)
    for (var j = 0; j < 4; j++) {
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(t * (0.12 + j * 0.07) * sp * (j % 2 ? -1 : 1) + j);
      ctx.scale(1, 0.34 + j * 0.1);
      ctx.setLineDash([10 + j * 6, 8]); ctx.lineWidth = 1.6;
      ctx.strokeStyle = col(58, (0.35 + 0.25 * e) * I);
      ctx.beginPath(); ctx.arc(0, 0, R * (0.55 + j * 0.13), 0, TAU); ctx.stroke();
      ctx.restore();
    }
    ctx.setLineDash([]);

    // Radar de alerta (RADIATION ALERT): barrido y anillos pulsantes
    if (cu.radar > 0.02) {
      var sw = t * 1.8 * sp, g0 = ctx.createLinearGradient(cx, cy, cx + Math.cos(sw) * R, cy + Math.sin(sw) * R);
      g0.addColorStop(0, col(60, 0.7 * cu.radar)); g0.addColorStop(1, col(60, 0));
      ctx.fillStyle = g0; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R * 0.98, sw - 0.5, sw); ctx.closePath(); ctx.fill();
      for (i = 0; i < 3; i++) {
        var pr = (t * 0.5 + i / 3) % 1;
        ctx.strokeStyle = col(65, (1 - pr) * 0.5 * cu.radar); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(cx, cy, R * (0.25 + pr * 0.7), 0, TAU); ctx.stroke();
      }
    }

    // Ondas luminosas concéntricas
    this.waveTimer -= dt;
    if (this.waveTimer <= 0) { this.waves.push(0); this.waveTimer = 1.6 / (sp * cu.waves * (0.4 + e * 1.4)); }
    for (var q = this.waves.length - 1; q >= 0; q--) {
      this.waves[q] += dt * 0.32 * sp * (0.5 + e);
      var p = this.waves[q];
      if (p >= 1) { this.waves.splice(q, 1); continue; }
      ctx.strokeStyle = col(65, (1 - p) * 0.55 * I * (0.4 + e)); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx, cy, R * 0.12 + p * R * 0.86, 0, TAU); ctx.stroke();
    }

    // Partículas dinámicas: centelleo y destellos de energía
    ctx.globalCompositeOperation = 'lighter';
    for (var n = 0; n < this.parts.length; n++) {
      var pt = this.parts[n];
      if (vfx && Math.random() < dt * (0.1 + e * 0.25)) pt.boost = 1;
      pt.boost = Math.max(0, pt.boost - dt * 1.5);
      pt.a += pt.v * dt * sp * (0.3 + e * 1.4) * (1 + pt.boost);
      var z = Math.sin(pt.a), sc = 0.55 + 0.45 * (z * 0.5 + 0.5), tw = 0.7 + 0.3 * Math.sin(t * 3 + pt.tw);
      ctx.fillStyle = col(70 + pt.boost * 15, Math.min(1, (0.25 + 0.6 * sc) * (0.3 + e) * I * tw + pt.boost * 0.4));
      ctx.beginPath(); ctx.arc(cx + Math.cos(pt.a) * pt.r * R, cy + z * pt.r * R * 0.42 + pt.y * R * 0.22, pt.s * sc * (1 + pt.boost * 1.5), 0, TAU); ctx.fill();
    }

    // Arcos de energía entre el núcleo y el anillo (más frecuentes con energía e inestabilidad)
    if (vfx && this.arcs.length < 5 && Math.random() < dt * (0.4 + e * 2.2 + cu.flicker * 3)) {
      var aa = Math.random() * TAU, ar = 0.45 + Math.random() * 0.5, pts = [];
      for (i = 1; i <= 8; i++) {
        var f = i / 8, jit = (1 - f) * 0.05 + 0.01, off = (Math.random() - 0.5) * jit * 2;
        pts.push([Math.cos(aa) * ar * f - Math.sin(aa) * off, Math.sin(aa) * ar * f + Math.cos(aa) * off]);
      }
      this.arcs.push({ pts: pts, life: 0, max: 0.12 + Math.random() * 0.18 });
    }
    for (i = this.arcs.length - 1; i >= 0; i--) {
      var ac = this.arcs[i]; ac.life += dt;
      if (ac.life >= ac.max) { this.arcs.splice(i, 1); continue; }
      var al = 1 - ac.life / ac.max;
      for (var pass = 0; pass < 2; pass++) {
        ctx.strokeStyle = pass ? 'rgba(255,255,255,' + (al * 0.9).toFixed(2) + ')' : col(65, al * 0.5 * I); ctx.lineWidth = pass ? 1 : 3.5;
        ctx.beginPath(); ctx.moveTo(cx, cy);
        for (var m = 0; m < ac.pts.length; m++) ctx.lineTo(cx + ac.pts[m][0] * R, cy + ac.pts[m][1] * R);
        ctx.stroke();
      }
    }

    // Rayos de energía
    ctx.lineWidth = 1.2;
    for (var r = 0; r < 10; r++) {
      var ang = t * 0.4 * sp + r * TAU / 10, len = R * (0.35 + 0.25 * Math.sin(t * 2 + r) * e + 0.2 * e) * Math.min(1.8, this.coreScale);
      var g = ctx.createLinearGradient(cx, cy, cx + Math.cos(ang) * len, cy + Math.sin(ang) * len);
      g.addColorStop(0, col(75, 0.55 * I * (0.3 + e))); g.addColorStop(1, col(60, 0));
      ctx.strokeStyle = g; ctx.beginPath(); ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(ang) * len, cy + Math.sin(ang) * len); ctx.stroke();
    }

    // Núcleo luminoso (pulso + parpadeo en estados inestables)
    var flick = cu.flicker > 0.02 && Math.random() < 0.18 * cu.flicker ? 0.25 + Math.random() * 0.4 : 1;
    var pulse = 1 + 0.07 * Math.sin(t * 3.2 * sp) + 0.03 * Math.sin(t * 9 * sp);
    var cr = R * 0.17 * (0.7 + e * 0.5) * pulse * this.coreScale;
    if (cr > 1) {
      var cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, cr * 2.6);
      cg.addColorStop(0, 'rgba(255,255,255,' + Math.min(1, 0.9 * I * flick) + ')');
      cg.addColorStop(0.3, col(70, 0.85 * I * flick)); cg.addColorStop(0.65, col(50, 0.3 * I * flick)); cg.addColorStop(1, col(45, 0));
      ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(cx, cy, cr * 2.6, 0, TAU); ctx.fill();
    }

    // Ondas de transición entre estados (color del nuevo estado)
    for (i = this.ripples.length - 1; i >= 0; i--) {
      var rp = this.ripples[i]; rp.p += dt * 0.9;
      if (rp.p >= 1) { this.ripples.splice(i, 1); continue; }
      ctx.strokeStyle = 'hsla(' + rp.hue.toFixed(0) + ',100%,65%,' + ((1 - rp.p) * 0.8).toFixed(2) + ')'; ctx.lineWidth = 2 + (1 - rp.p) * 5;
      ctx.beginPath(); ctx.arc(cx, cy, R * (0.15 + rp.p * 1.0), 0, TAU); ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';

    // Humo (fallo de contención / emergencia)
    var s, u;
    if (cu.smoke > 0.02 && this.smoke.length < 70 && Math.random() < cu.smoke * 20 * dt) {
      this.smoke.push({ x: cx + (Math.random() - 0.5) * R * 0.6, y: cy + Math.random() * R * 0.2, r: R * 0.05,
        vx: (Math.random() - 0.5) * R * 0.1, vy: -R * (0.12 + Math.random() * 0.18), life: 0, max: 2.5 + Math.random() * 2 });
    }
    for (i = this.smoke.length - 1; i >= 0; i--) {
      s = this.smoke[i]; s.life += dt;
      if (s.life >= s.max) { this.smoke.splice(i, 1); continue; }
      s.x += s.vx * dt; s.y += s.vy * dt; s.r += R * 0.12 * dt; u = s.life / s.max;
      var sg = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r);
      sg.addColorStop(0, 'rgba(90,50,50,' + (0.45 * (1 - u)).toFixed(3) + ')'); sg.addColorStop(1, 'rgba(30,20,25,0)');
      ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TAU); ctx.fill();
    }
    // Chispas
    if (cu.sparks > 0.02 && this.sparks.length < 120 && Math.random() < cu.sparks * 40 * dt) {
      var sa = Math.random() * TAU, sv = R * (0.4 + Math.random() * 0.9);
      this.sparks.push({ x: cx, y: cy, vx: Math.cos(sa) * sv, vy: Math.sin(sa) * sv - R * 0.2, life: 0, max: 0.5 + Math.random() * 0.7 });
    }
    ctx.lineWidth = 1.6; ctx.globalCompositeOperation = 'lighter';
    for (i = this.sparks.length - 1; i >= 0; i--) {
      s = this.sparks[i]; s.life += dt;
      if (s.life >= s.max) { this.sparks.splice(i, 1); continue; }
      s.vy += R * 1.2 * dt; s.x += s.vx * dt; s.y += s.vy * dt; u = 1 - s.life / s.max;
      ctx.strokeStyle = 'hsla(' + (28 + u * 14).toFixed(0) + ',100%,65%,' + u.toFixed(2) + ')';
      ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x - s.vx * 0.03, s.y - s.vy * 0.03); ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
  };

  N.Reactor = Reactor;
})(window.NCS = window.NCS || {});
