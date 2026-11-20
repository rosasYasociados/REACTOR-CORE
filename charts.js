/* Instrumentos: medidores circulares (SVG) y gráfico de evolución (Canvas). */
(function (N) {
  'use strict';

  // ---- Medidor circular de 270° ----
  function pt(deg) {
    var a = deg * Math.PI / 180;
    return (50 + 40 * Math.cos(a)).toFixed(2) + ' ' + (50 + 40 * Math.sin(a)).toFixed(2);
  }
  var ARC = 'M ' + pt(135) + ' A 40 40 0 1 1 ' + pt(405);

  function Gauge(host, label, unit, max) {
    this.max = max; this.unit = unit;
    host.className = 'gauge';
    host.innerHTML = '<svg viewBox="0 0 100 100" role="img" aria-label="' + label + '">' +
      '<path class="g-track" d="' + ARC + '"/>' +
      '<path class="g-val" d="' + ARC + '" pathLength="100" stroke-dasharray="0 100"/>' +
      '<text class="g-num" x="50" y="56">0</text>' +
      '<text class="g-lab" x="50" y="76">' + label + '</text></svg>';
    this.val = host.querySelector('.g-val');
    this.num = host.querySelector('.g-num');
  }
  Gauge.prototype.set = function (v) {
    var p = Math.max(0, Math.min(100, v / this.max * 100));
    this.val.setAttribute('stroke-dasharray', p.toFixed(1) + ' 100');
    this.num.textContent = Math.round(v) + this.unit;
  };

  // ---- Gráfico de líneas multiserie (valores 0..100) ----
  function Line(canvas, colors, maxPoints) {
    this.cv = canvas; this.ctx = canvas.getContext('2d');
    this.colors = colors; this.max = maxPoints || 80;
    this.data = colors.map(function () { return []; });
    this.w = 0; this.h = 0;
    var self = this;
    if (window.ResizeObserver) new ResizeObserver(function () { self.resize(); }).observe(canvas);
    else window.addEventListener('resize', function () { self.resize(); });
    this.resize();
  }
  Line.prototype.resize = function () {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = this.cv.clientWidth; this.h = this.cv.clientHeight;
    if (!this.w || !this.h) return;
    this.cv.width = this.w * dpr; this.cv.height = this.h * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.draw();
  };
  Line.prototype.push = function (vals) {
    for (var i = 0; i < this.data.length; i++) {
      this.data[i].push(vals[i]);
      if (this.data[i].length > this.max) this.data[i].shift();
    }
    this.draw();
  };
  Line.prototype.clear = function () {
    this.data = this.colors.map(function () { return []; });
    this.draw();
  };
  Line.prototype.draw = function () {
    var c = this.ctx, w = this.w, h = this.h;
    if (!w || !h) return;
    c.clearRect(0, 0, w, h);
    c.strokeStyle = 'rgba(120,180,255,.12)'; c.lineWidth = 1;
    for (var g = 1; g < 4; g++) { c.beginPath(); c.moveTo(0, h * g / 4); c.lineTo(w, h * g / 4); c.stroke(); }
    for (var s = 0; s < this.data.length; s++) {
      var d = this.data[s]; if (d.length < 2) continue;
      var col = typeof this.colors[s] === 'function' ? this.colors[s]() : this.colors[s];
      c.beginPath();
      for (var i = 0; i < d.length; i++) {
        var x = w - (d.length - 1 - i) * (w / (this.max - 1));
        var y = h - 4 - (d[i] / 100) * (h - 8);
        if (i) c.lineTo(x, y); else c.moveTo(x, y);
      }
      c.strokeStyle = col; c.lineWidth = 1.8; c.shadowColor = col; c.shadowBlur = 6; c.stroke(); c.shadowBlur = 0;
    }
  };

  N.Charts = { Gauge: Gauge, Line: Line };
})(window.NCS = window.NCS || {});
