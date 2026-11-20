/* Cámara del núcleo (Canvas 2D con profundidad simulada). Se anima siempre, independiente del resto. */
(function (N) {
  'use strict';
  var TAU = Math.PI * 2;

  function Reactor(canvas) {
    this.cv = canvas; this.ctx = canvas.getContext('2d');
    this.w = 0; this.h = 0;
    this.hue = 190; this.hueTarget = 190;   // matiz actual / objetivo
    this.energy = 0.06; this.energyTarget = 0.06;
    this.intensity = 1; this.speed = 1;
    this.waves = []; this.waveTimer = 0;
    this.parts = [];
    var self = this;
    if (window.ResizeObserver) new ResizeObserver(function () { self.resize(); }).observe(canvas);
    else window.addEventListener('resize', function () { self.resize(); });
    this.resize();
  }

  Reactor.prototype.resize = function () {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = this.cv.clientWidth; this.h = this.cv.clientHeight;
    if (!this.w || !this.h) return;
    this.cv.width = this.w * dpr; this.cv.height = this.h * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        var n = this.w < 500 ? 90 : 160;
    if (this.parts.length !== n) {
      this.parts = [];
      for (var i = 0; i < n; i++) this.parts.push({
        a: Math.random() * TAU, r: 0.18 + Math.random() * 0.75, y: Math.random() * 2 - 1,
        v: (Math.random() < 0.5 ? -1 : 1) * (0.2 + Math.random() * 0.9), s: 0.8 + Math.random() * 1.8
      });
    }
  };

  Reactor.prototype.setState = function (energy, hue) { this.energyTarget = energy; this.hueTarget = hue; };

  Reactor.prototype.frame = function (dt, t) {
    var ctx = this.ctx, w = this.w, h = this.h;
    if (!w || !h) return;
    var k = Math.min(1, dt * 3);
    this.energy += (this.energyTarget - this.energy) * k;
    this.hue += (this.hueTarget - this.hue) * k;
    var e = this.energy, I = this.intensity, sp = this.speed, hue = this.hue;
    var cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.46;
    var col = function (l, a) { return 'hsla(' + hue.toFixed(0) + ',100%,' + l + '%,' + a + ')'; };

    // Lienzo transparente: el fondo lo aporta el CSS
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, w, h);

    // Resplandor ambiental
    var bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 1.15);
    bg.addColorStop(0, col(50, Math.min(0.5, 0.16 + 0.3 * e) * I)); bg.addColorStop(1, col(40, 0));
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);

    // Anillo exterior con marcas giratorias
    ctx.lineWidth = 1.5; ctx.strokeStyle = col(55, 0.55 * I);
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
    ctx.strokeStyle = col(60, 0.7 * I); ctx.lineWidth = 2;
    var rot = t * 0.15 * sp;
    for (var i = 0; i < 72; i++) {
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

    // Ondas concéntricas expansivas
    this.waveTimer -= dt;
    if (this.waveTimer <= 0) { this.waves.push(0); this.waveTimer = 1.6 / (sp * (0.4 + e * 1.4)); }
    for (var q = this.waves.length - 1; q >= 0; q--) {
      this.waves[q] += dt * 0.32 * sp * (0.5 + e);
      var p = this.waves[q];
      if (p >= 1) { this.waves.splice(q, 1); continue; }
      ctx.strokeStyle = col(65, (1 - p) * 0.55 * I * (0.4 + e)); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx, cy, R * 0.12 + p * R * 0.86, 0, TAU); ctx.stroke();
    }

    // Partículas orbitales con perspectiva
    ctx.globalCompositeOperation = 'lighter';
    for (var n = 0; n < this.parts.length; n++) {
      var pt = this.parts[n];
      pt.a += pt.v * dt * sp * (0.3 + e * 1.4);
      var z = Math.sin(pt.a), sc = 0.55 + 0.45 * (z * 0.5 + 0.5);
      var x = cx + Math.cos(pt.a) * pt.r * R, y = cy + z * pt.r * R * 0.42 + pt.y * R * 0.22;
      ctx.fillStyle = col(70, (0.25 + 0.6 * sc) * (0.3 + e) * I);
      ctx.beginPath(); ctx.arc(x, y, pt.s * sc, 0, TAU); ctx.fill();
    }

    // Rayos de energía
    ctx.lineWidth = 1.2;
    for (var r = 0; r < 10; r++) {
      var ang = t * 0.4 * sp + r * TAU / 10, len = R * (0.35 + 0.25 * Math.sin(t * 2 + r) * e + 0.2 * e);
      var g = ctx.createLinearGradient(cx, cy, cx + Math.cos(ang) * len, cy + Math.sin(ang) * len);
      g.addColorStop(0, col(75, 0.55 * I * (0.3 + e))); g.addColorStop(1, col(60, 0));
      ctx.strokeStyle = g; ctx.beginPath(); ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(ang) * len, cy + Math.sin(ang) * len); ctx.stroke();
    }

    // Núcleo luminoso pulsante
    var pulse = 1 + 0.07 * Math.sin(t * 3.2 * sp) + 0.03 * Math.sin(t * 9 * sp);
    var cr = R * 0.17 * (0.7 + e * 0.5) * pulse;
    var cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, cr * 2.6);
    cg.addColorStop(0, 'rgba(255,255,255,' + Math.min(1, 0.9 * I) + ')');
    cg.addColorStop(0.3, col(70, 0.85 * I)); cg.addColorStop(0.65, col(50, 0.3 * I)); cg.addColorStop(1, col(45, 0));
    ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(cx, cy, cr * 2.6, 0, TAU); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  };

  N.Reactor = Reactor;
})(window.NCS = window.NCS || {});
