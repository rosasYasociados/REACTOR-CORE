/* Minijuegos de reparación (ficticios). Cada uno recibe (raíz, api{prog,win}) y devuelve { frame(dt)?, destroy() }. */
(function (N) {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg', TAU = Math.PI * 2;
  var G = N.RepairGames = N.RepairGames || {};

  function svgEl(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function htmlEl(tag, cls, parent, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls; if (text != null) e.textContent = text; if (parent) parent.appendChild(e);
    return e;
  }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  /* ================= 1. COOLING: cámara central, anillo de tuberías y 5 válvulas rojas ================= */
  G.cooling = {
    title: 'COOLING SYSTEM — REPARACIÓN',
    sub: 'Gira cada llave roja arrastrando alrededor de su volante hasta abrirla al 100%.',
    make: function (root, api) {
      var C = 300, DEG = 5.4;                                    // 5.4° de giro por cada 1% de apertura
      var svg = svgEl('svg', { viewBox: '0 0 600 600', 'class': 'cool-svg', role: 'group', 'aria-label': 'Instalación de refrigeración' }, root);
      var defs = svgEl('defs', {}, svg);
      var cp = svgEl('clipPath', { id: 'coolClip' }, defs); svgEl('circle', { cx: C, cy: C, r: 48 }, cp);
      var gP = svgEl('g', { 'class': 'pipes' }, svg);
      function pipe(x1, y1, x2, y2, w, parent) {                  // tubería de cobre oxidado con interior y agua
        var a = { x1: x1, y1: y1, x2: x2, y2: y2 };
        function ln(cls, sw) { var o = {}; for (var k in a) o[k] = a[k]; o['class'] = cls; o['stroke-width'] = sw; return svgEl('line', o, parent); }
        ln('pp-base', w); ln('pp-hi', w * 0.3); ln('pp-in', w - 10); return ln('water', w - 16);
      }
      function ringPipe(r, w, parent) {
        function ci(cls, sw) { return svgEl('circle', { cx: C, cy: C, r: r, fill: 'none', 'class': cls, 'stroke-width': sw }, parent); }
        ci('pp-base', w); ci('pp-hi', w * 0.3); ci('pp-in', w - 10); return ci('water', w - 16);
      }
      function screw(x, y, parent) {
        svgEl('circle', { cx: x, cy: y, r: 5.5, 'class': 'screw' }, parent);
        svgEl('line', { x1: x - 3, y1: y, x2: x + 3, y2: y, 'class': 'screw-l' }, parent);
      }
      var ang = function (i, off) { return (-90 + i * 72 + (off || 0)) * Math.PI / 180; };
      var P = function (a, r) { return [C + r * Math.cos(a), C + r * Math.sin(a)]; };

      ringPipe(150, 26, gP);                                       // anillo exterior
      var i, a, p1, p2;
      for (i = 0; i < 5; i++) {                                    // radios hacia la cámara
        a = ang(i, 36); p1 = P(a, 60); p2 = P(a, 150); pipe(p1[0], p1[1], p2[0], p2[1], 22, gP);
      }
      var valves = [];
      for (i = 0; i < 5; i++) {
        a = ang(i); var ux = Math.cos(a), uy = Math.sin(a), v = P(a, 215);
        p2 = P(a, 150); var feed = pipe(v[0], v[1], p2[0], p2[1], 24, gP);        // alimentación: el agua entra hacia el anillo
        var s1 = P(a, 250), s2 = P(a, 292); pipe(s1[0], s1[1], s2[0], s2[1], 26, gP);   // entrada exterior
        var f1 = P(a, 288); svgEl('rect', { x: f1[0] - 20, y: f1[1] - 6, width: 40, height: 12, rx: 2, 'class': 'flange', transform: 'rotate(' + (a * 180 / Math.PI + 90) + ' ' + f1[0] + ' ' + f1[1] + ')' }, gP);
        screw(f1[0] - uy * 14, f1[1] + ux * 14, gP); screw(f1[0] + uy * 14, f1[1] - ux * 14, gP);
        // manómetro interior (indicador ficticio de presión)
        var gc = P(a, 102);
        svgEl('circle', { cx: gc[0], cy: gc[1], r: 17, 'class': 'gauge' }, svg);
        var needle = svgEl('line', { x1: gc[0], y1: gc[1], x2: gc[0], y2: gc[1] - 12, 'class': 'needle' }, svg);
        // luz de estado
        var lc = P(a, 262); var lx = lc[0] - uy * 40, ly = lc[1] + ux * 40;
        var light = svgEl('circle', { cx: lx, cy: ly, r: 7, 'class': 'vlight' }, svg);
        // volante rojo (gira) + núcleo con porcentaje (fijo) + zona de interacción
        var wheel = svgEl('g', { 'class': 'wheel' }, svg);
        svgEl('circle', { cx: v[0], cy: v[1], r: 33, fill: '#241014', stroke: '#1a0a0c', 'stroke-width': 3 }, wheel);
        svgEl('circle', { cx: v[0], cy: v[1], r: 31, fill: 'none', stroke: '#d4161e', 'stroke-width': 8 }, wheel);
        svgEl('circle', { cx: v[0], cy: v[1], r: 24, fill: 'none', stroke: '#7a0c12', 'stroke-width': 2 }, wheel);
        for (var k = 0; k < 6; k++) {
          var sa = k * Math.PI / 3, e1 = [v[0] + 12 * Math.cos(sa), v[1] + 12 * Math.sin(sa)], e2 = [v[0] + 31 * Math.cos(sa), v[1] + 31 * Math.sin(sa)];
          svgEl('line', { x1: e1[0], y1: e1[1], x2: e2[0], y2: e2[1], stroke: '#e5353c', 'stroke-width': 5, 'stroke-linecap': 'round' }, wheel);
          svgEl('circle', { cx: e2[0], cy: e2[1], r: 4.5, fill: '#ff7a7f' }, wheel);
        }
        svgEl('circle', { cx: v[0], cy: v[1], r: 17, fill: '#450a0e', stroke: '#9b1119', 'stroke-width': 2 }, svg);
        var txt = svgEl('text', { x: v[0], y: v[1] + 4, 'class': 'vtxt' }, svg); txt.textContent = '0%';
        var hit = svgEl('circle', { cx: v[0], cy: v[1], r: 44, 'class': 'vhit', tabindex: 0, role: 'slider', 'aria-label': 'Llave ' + (i + 1),
          'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': 0 }, svg);
        valves.push({ i: i, vx: v[0], vy: v[1], target: 0, disp: 0, locked: false, drag: false, prev: 0, snd: 0, lastFlow: -1,
          wheel: wheel, txt: txt, needle: needle, gc: gc, light: light, feed: feed, hit: hit });
      }
      for (i = 0; i < 12; i++) {                                   // manchas de óxido y tornillos en el anillo
        a = rnd(0, TAU); p1 = P(a, 150 + rnd(-8, 8)); svgEl('circle', { cx: p1[0], cy: p1[1], r: rnd(3, 8), 'class': 'rust' }, gP);
      }
      for (i = 0; i < 10; i++) { a = ang(i * 0.5, 36 * (i % 2)); p1 = P(a, 150); screw(p1[0], p1[1], gP); }

      // cámara central: agua que sube con el flujo y arco de progreso
      svgEl('circle', { cx: C, cy: C, r: 66, 'class': 'chamber' }, svg);
      svgEl('circle', { cx: C, cy: C, r: 50, fill: '#06121c' }, svg);
      var cw = svgEl('rect', { x: C - 50, y: C + 50, width: 100, height: 0, 'class': 'chwater', 'clip-path': 'url(#coolClip)' }, svg);
      var arc = svgEl('circle', { cx: C, cy: C, r: 58, fill: 'none', 'class': 'carc', 'stroke-dasharray': '0 400', transform: 'rotate(-90 ' + C + ' ' + C + ')' }, svg);
      var ctxt = svgEl('text', { x: C, y: C + 6, 'class': 'ctxt' }, svg); ctxt.textContent = '0%';
      screw(C - 56, C - 56, svg); screw(C + 56, C - 56, svg); screw(C - 56, C + 56, svg); screw(C + 56, C + 56, svg);

      function sc() { var r = svg.getBoundingClientRect(); return 600 / r.width; }
      function angleOf(v, e) {
        var r = svg.getBoundingClientRect(), k = sc();
        return Math.atan2((e.clientY - r.top) * k - v.vy, (e.clientX - r.left) * k - v.vx) * 180 / Math.PI;
      }
      function lock(v) {
        v.target = 100; v.locked = true; v.drag = false; v.hit.setAttribute('class', 'vhit locked'); N.Audio.play('pressure');
      }
      valves.forEach(function (v) {
        v.hit.addEventListener('pointerdown', function (e) {
          if (v.locked) return; e.preventDefault(); v.drag = true; v.prev = angleOf(v, e); v.snd = 0; v.hit.setPointerCapture(e.pointerId);
        });
        v.hit.addEventListener('pointermove', function (e) {
          if (!v.drag) return;
          var a2 = angleOf(v, e), d = a2 - v.prev; v.prev = a2;
          if (d > 180) d -= 360; else if (d < -180) d += 360;
          v.target = clamp(v.target + d / DEG, 0, 100);
          v.snd += Math.abs(d); if (v.snd >= 24) { v.snd = 0; N.Audio.play('valveTurn'); }
          if (v.target >= 99.5) lock(v);
        });
        var end = function () { v.drag = false; };
        v.hit.addEventListener('pointerup', end); v.hit.addEventListener('pointercancel', end);
        v.hit.addEventListener('keydown', function (e) {           // alternativa con teclado
          if (v.locked) return; var d = (e.key === 'ArrowRight' || e.key === 'ArrowUp') ? 5 : (e.key === 'ArrowLeft' || e.key === 'ArrowDown') ? -5 : 0;
          if (!d) return; e.preventDefault(); v.target = clamp(v.target + d, 0, 100); N.Audio.play('valveTurn'); if (v.target >= 99.5) lock(v);
        });
        v.hit.addEventListener('contextmenu', function (e) { e.preventDefault(); });
      });

      var done = false, lastWater = -1, ringLast = -1;
      N.Audio.water(0.15);                                         // el agua circula desde el principio
      return {
        frame: function (dt) {
          var k = Math.min(1, dt * 9), tot = 0, allDone = true;
          valves.forEach(function (v) {
            v.disp += (v.target - v.disp) * k; tot += v.disp / 100;
            v.wheel.setAttribute('transform', 'rotate(' + (v.disp * DEG).toFixed(1) + ' ' + v.vx + ' ' + v.vy + ')');   // giro progresivo
            v.txt.textContent = Math.round(v.disp) + '%';
            v.needle.setAttribute('transform', 'rotate(' + (-120 + v.disp * 2.4).toFixed(1) + ' ' + v.gc[0] + ' ' + v.gc[1] + ')');
            v.hit.setAttribute('aria-valuenow', Math.round(v.disp));
            if (Math.abs(v.disp - v.lastFlow) > 0.4) {              // flujo en la alimentación de esta válvula
              v.lastFlow = v.disp; var f = v.disp / 100;
              v.feed.style.setProperty('--fd', (2.6 - 2.1 * f).toFixed(2) + 's'); v.feed.style.setProperty('--wo', (0.3 + 0.7 * f).toFixed(2));
            }
            v.light.setAttribute('class', 'vlight ' + (v.locked ? 'ok' : v.target > 0 ? 'mid' : ''));
            if (!(v.locked && v.disp >= 99.5)) allDone = false;
          });
          var avg = tot / 5;
          if (Math.abs(avg - ringLast) > 0.01) {
            ringLast = avg; gP.style.setProperty('--fd', (2.6 - 2.1 * avg).toFixed(2) + 's'); gP.style.setProperty('--wo', (0.35 + 0.65 * avg).toFixed(2));
            var lv = 0.12 + 0.88 * avg, h = 100 * lv;
            cw.setAttribute('y', C + 50 - h); cw.setAttribute('height', h);
            arc.setAttribute('stroke-dasharray', (avg * 364).toFixed(1) + ' 400'); ctxt.textContent = Math.round(avg * 100) + '%';
            api.prog(avg);
          }
          if (Math.abs(avg - lastWater) > 0.02) { lastWater = avg; N.Audio.water(0.15 + 0.85 * avg); }   // más flujo, más sonido
          if (allDone && !done) { done = true; N.Audio.play('flowRestore'); api.win(); }
        },
        destroy: function () { N.Audio.water(-1); }
      };
    }
  };

  /* ================= 2. SHIELDS: pared metálica con 7–11 grietas que se sueldan manteniendo pulsado ================= */
  function crackPath(kind) {                                       // grieta irregular con ramas (viewBox 0 0 100 100)
    var steps = kind === 'l' ? 9 : kind === 'm' ? 7 : 5, pts = [], x = 50 + rnd(-8, 8), i;
    for (i = 0; i <= steps; i++) { pts.push([x, 8 + i * 84 / steps]); x = clamp(x + rnd(-16, 16), 14, 86); }
    var d = 'M' + pts.map(function (p) { return p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' L');
    var br = kind === 'l' ? 3 : kind === 'm' ? 2 : 1;
    for (i = 0; i < br; i++) {
      var b = pts[1 + Math.floor(Math.random() * (pts.length - 2))], dir = Math.random() < 0.5 ? -1 : 1;
      d += ' M' + b[0].toFixed(1) + ' ' + b[1].toFixed(1) + ' L' + clamp(b[0] + dir * rnd(10, 22), 6, 94).toFixed(1) + ' ' + (b[1] + rnd(4, 14)).toFixed(1) +
        ' L' + clamp(b[0] + dir * rnd(22, 34), 6, 94).toFixed(1) + ' ' + (b[1] + rnd(10, 24)).toFixed(1);
    }
    return d;
  }
  G.shields = {
    title: 'SHIELDS — REPARACIÓN',
    sub: 'Mantén presionado sobre cada grieta para soldarla. Las grandes tardan más.',
    make: function (root, api) {
      var wall = htmlEl('div', 'wall', root), cv = htmlEl('canvas', 'wcanvas', wall), cx = cv.getContext('2d');
      var KINDS = [{ k: 's', w: 12, need: 5 }, { k: 'm', w: 16, need: 6.5 }, { k: 'l', w: 20, need: 8 }];
      var n = 7 + Math.floor(Math.random() * 5), cracks = [], placed = [], i, tries;
      for (i = 0; i < n; i++) {
        var kd = KINDS[(i + Math.floor(Math.random() * 3)) % 3], x, y, ok, gap = 1;
        for (tries = 0; tries < 300; tries++) {                      // posiciones sin solaparse (unidades: ancho de la pared)
          x = rnd(10, 90); y = rnd(12, 88) * 0.625; ok = true;
          for (var j = 0; j < placed.length; j++) {
            var dx = x - placed[j].x, dy = y - placed[j].y;
            if (Math.sqrt(dx * dx + dy * dy) < (kd.w + placed[j].w) / 2 * gap + 1) { ok = false; break; }
          }
          if (ok) break; if (tries % 60 === 59) gap -= 0.15;
        }
        placed.push({ x: x, y: y, w: kd.w });
        var el = htmlEl('button', 'crack', wall); el.type = 'button';
        el.style.left = x + '%'; el.style.top = (y / 0.625) + '%'; el.style.setProperty('--w', kd.w + '%'); el.setAttribute('aria-label', 'Grieta ' + (i + 1));
        var ring = htmlEl('span', 'ring', el), d = crackPath(kd.k);
        var sv = svgEl('svg', { viewBox: '0 0 100 100', 'class': 'cr-svg' }, el);
        svgEl('path', { d: d, 'class': 'cr-base' }, sv);
        var weld = svgEl('path', { d: d, pathLength: 100, 'class': 'cr-weld', 'stroke-dasharray': '0 100' }, sv);
        var torch = svgEl('circle', { r: 4, 'class': 'torch', cx: -10, cy: -10 }, sv);
        var bar = htmlEl('span', 'cb', el); htmlEl('i', '', bar); var pct = htmlEl('em', 'cpct mono', el, '0%');
        cracks.push({ el: el, ring: ring, weld: weld, torch: torch, len: weld.getTotalLength(), bar: bar.firstChild, pct: pct, need: kd.need, p: 0, hold: false, done: false });
      }
      cracks.forEach(function (c) {
        c.el.addEventListener('pointerdown', function (e) { if (c.done) return; e.preventDefault(); c.hold = true; c.el.setPointerCapture(e.pointerId); });
        var up = function () { c.hold = false; };
        c.el.addEventListener('pointerup', up); c.el.addEventListener('pointercancel', up); c.el.addEventListener('lostpointercapture', up);
        c.el.addEventListener('contextmenu', function (e) { e.preventDefault(); });
      });
      var parts = [], cw = 0, ch = 0, dpr = 1, done = false;
      function fit() {
        dpr = Math.min(window.devicePixelRatio || 1, 2); cw = wall.clientWidth; ch = wall.clientHeight;
        cv.width = cw * dpr; cv.height = ch * dpr; cx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      fit();
      return {
        frame: function (dt) {
          if (wall.clientWidth !== cw) fit();
          var wr = wall.getBoundingClientRect(), tot = 0, anyHold = false;
          cracks.forEach(function (c) {
            if (!c.done) {
              c.p = c.hold ? c.p + dt / c.need : Math.max(0, c.p - dt / c.need * 0.5);   // al soltar, la soldadura se enfría poco a poco
              if (c.hold) {
                anyHold = true;
                var pt = c.weld.getPointAtLength(Math.min(c.len, c.p * c.len)), r = c.el.getBoundingClientRect();
                var px = r.left - wr.left + r.width * (0.14 + 0.72 * pt.x / 100), py = r.top - wr.top + r.height * (0.14 + 0.72 * pt.y / 100);
                c.torch.setAttribute('cx', pt.x); c.torch.setAttribute('cy', pt.y);
                for (var s = 0; s < 3 && parts.length < 160; s++) {
                  var a = rnd(0, TAU), v = rnd(40, 170);
                  parts.push({ x: px, y: py, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, life: 0, max: rnd(0.25, 0.6) });
                }
                c.glow = { x: px, y: py };
              } else { c.torch.setAttribute('cx', -10); c.glow = null; }
              if (c.p >= 1) {
                c.p = 1; c.done = true; c.hold = false; c.torch.setAttribute('cx', -10); c.glow = null;
                c.el.classList.add('fixed'); N.Audio.play('repair');
              }
              c.weld.setAttribute('stroke-dasharray', (c.p * 100).toFixed(1) + ' 100');
              c.el.style.setProperty('--p', (c.p * 100).toFixed(1)); c.bar.style.width = (c.p * 100) + '%'; c.pct.textContent = Math.round(c.p * 100) + '%';
              c.el.classList.toggle('hold', c.hold);
            }
            tot += c.p;
          });
          if (anyHold) N.Audio.play('weld');
          // partículas y brillo de soldadura
          cx.clearRect(0, 0, cw, ch); cx.globalCompositeOperation = 'lighter';
          cracks.forEach(function (c) {
            if (!c.glow) return;
            var g = cx.createRadialGradient(c.glow.x, c.glow.y, 0, c.glow.x, c.glow.y, 34);
            g.addColorStop(0, 'rgba(255,240,200,.9)'); g.addColorStop(0.3, 'rgba(255,150,40,.45)'); g.addColorStop(1, 'rgba(255,90,0,0)');
            cx.fillStyle = g; cx.beginPath(); cx.arc(c.glow.x, c.glow.y, 34, 0, TAU); cx.fill();
          });
          for (var i = parts.length - 1; i >= 0; i--) {
            var q = parts[i]; q.life += dt;
            if (q.life >= q.max) { parts.splice(i, 1); continue; }
            q.vy += 420 * dt; q.x += q.vx * dt; q.y += q.vy * dt; var u = 1 - q.life / q.max;
            cx.strokeStyle = 'hsla(' + (28 + u * 20).toFixed(0) + ',100%,' + (55 + u * 25).toFixed(0) + '%,' + u.toFixed(2) + ')'; cx.lineWidth = 1.6;
            cx.beginPath(); cx.moveTo(q.x, q.y); cx.lineTo(q.x - q.vx * 0.03, q.y - q.vy * 0.03); cx.stroke();
          }
          cx.globalCompositeOperation = 'source-over';
          api.prog(tot / cracks.length);
          if (!done && tot >= cracks.length - 0.0001) { done = true; api.win(); }
        },
        destroy: function () { parts = []; }
      };
    }
  };

  /* ================= 3. SHORT CIRCUIT: 8 cables que se arrastran hasta su terminal ================= */
  G.circuit = {
    title: 'SHORT CIRCUIT — REPARACIÓN',
    sub: 'Arrastra cada cable hasta su terminal del mismo color. Las conexiones erróneas se pueden corregir.',
    make: function (root, api, opts) {
      var COL = ['#ff4560', '#ffc83d', '#3dffb0', '#27d3ff', '#8a5bff', '#ff7ad9', '#ff8a3d', '#e8f1ff'], LET = 'ABCDEFGH', N8 = (opts && opts.n) || 8;
      var order = [], i; for (i = 0; i < N8; i++) order.push(i);
      for (i = N8 - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = order[i]; order[i] = order[j]; order[j] = t; }   // terminales derechos mezclados
      var box = htmlEl('div', 'wires', root), left = htmlEl('div', 'wcol left', box), right = htmlEl('div', 'wcol right', box);
      var svg = svgEl('svg', { 'class': 'wsvg' }, box), miss = htmlEl('p', 'wmiss mono', root);
      var lt = [], rt = [], link = [], ok = [], paths = [], drag = null;
      function mk(parent, id, side, idx) {
        var b = htmlEl('button', 'term ' + side, parent, LET[id]); b.type = 'button'; b.style.setProperty('--c', COL[id]); b.setAttribute('aria-label', 'Terminal ' + LET[id]);
        b.dataset.i = idx; return b;
      }
      for (i = 0; i < N8; i++) { lt.push(mk(left, i, 'left', i)); link.push(-1); ok.push(false); paths.push(svgEl('path', { 'class': 'wire', fill: 'none', visibility: 'hidden' }, svg)); }
      for (i = 0; i < N8; i++) rt.push(mk(right, order[i], 'right', i));
      var temp = svgEl('path', { 'class': 'wire temp', fill: 'none', visibility: 'hidden' }, svg);

      function pt(elm, side) {
        var r = elm.getBoundingClientRect(), b = box.getBoundingClientRect();
        return [(side === 'l' ? r.right : r.left) - b.left, r.top + r.height / 2 - b.top];
      }
      function curve(x1, y1, x2, y2) { var k = Math.max(40, Math.abs(x2 - x1) * 0.45); return 'M' + x1 + ' ' + y1 + ' C' + (x1 + k) + ' ' + y1 + ' ' + (x2 - k) + ' ' + y2 + ' ' + x2 + ' ' + y2; }
      function drawAll() {
        for (var a = 0; a < N8; a++) {
          var p = paths[a];
          if (link[a] < 0) { p.setAttribute('visibility', 'hidden'); continue; }
          var s = pt(lt[a], 'l'), e = pt(rt[link[a]], 'r');
          p.setAttribute('d', curve(s[0], s[1], e[0], e[1])); p.setAttribute('stroke', COL[a]); p.setAttribute('visibility', 'visible');
          p.setAttribute('class', 'wire ' + (ok[a] ? 'ok' : 'bad'));
        }
      }
      function refresh() {
        var good = 0, miss_ = [];
        for (var a = 0; a < N8; a++) {
          if (ok[a]) good++; else miss_.push(LET[a]);
          lt[a].classList.toggle('done', ok[a]); lt[a].classList.toggle('miss', !ok[a]); lt[a].classList.toggle('bad', !ok[a] && link[a] >= 0);
        }
        for (var b = 0; b < N8; b++) {
          var taken = -1; for (var a2 = 0; a2 < N8; a2++) if (link[a2] === b) taken = a2;
          rt[b].classList.toggle('done', taken >= 0 && ok[taken]); rt[b].classList.toggle('bad', taken >= 0 && !ok[taken]);
        }
        miss.textContent = good === N8 ? 'TODAS LAS CONEXIONES COMPLETAS' : 'FALTAN ' + (N8 - good) + ' DE ' + N8 + ': ' + miss_.join(' · ');
        drawAll(); api.prog(good / N8);
        if (good === N8) { N.Audio.play('repair'); api.win(); }
      }
      function boxPoint(e) { var b = box.getBoundingClientRect(); return [e.clientX - b.left, e.clientY - b.top]; }
      function assign(a, j) {
        for (var k = 0; k < N8; k++) if (ok[k] && link[k] === j) { link[a] = -1; N.Audio.play('wrong'); return; }   // terminal ya bloqueado
        for (k = 0; k < N8; k++) if (link[k] === j && k !== a) link[k] = -1;                                       // desplaza un cable erróneo
        link[a] = j;
        if (order[j] === a) { ok[a] = true; N.Audio.play('repair'); } else N.Audio.play('wrong');
      }
      lt.forEach(function (b, a) {
        b.addEventListener('pointerdown', function (e) {
          if (ok[a]) return; e.preventDefault(); link[a] = -1; drag = a; b.setPointerCapture(e.pointerId);
          temp.setAttribute('stroke', COL[a]); temp.setAttribute('visibility', 'visible'); N.Audio.play('valveTurn'); drawAll();
          var s = pt(b, 'l'), p = boxPoint(e); temp.setAttribute('d', curve(s[0], s[1], p[0], p[1]));
        });
        b.addEventListener('pointermove', function (e) {
          if (drag !== a) return;
          var s = pt(b, 'l'), p = boxPoint(e); temp.setAttribute('d', curve(s[0], s[1], p[0], p[1]));
          var h = document.elementFromPoint(e.clientX, e.clientY), t = h && h.closest ? h.closest('.term.right') : null;
          rt.forEach(function (r) { r.classList.toggle('hover', r === t); });
        });
        var up = function (e) {
          if (drag !== a) return; drag = null; temp.setAttribute('visibility', 'hidden');
          rt.forEach(function (r) { r.classList.remove('hover'); });
          var h = document.elementFromPoint(e.clientX, e.clientY), t = h && h.closest ? h.closest('.term.right') : null;
          if (t) assign(a, +t.dataset.i);
          refresh();
        };
        b.addEventListener('pointerup', up);
        b.addEventListener('pointercancel', function () { drag = null; temp.setAttribute('visibility', 'hidden'); refresh(); });
        b.addEventListener('contextmenu', function (e) { e.preventDefault(); });
      });
      var onResize = function () { drawAll(); };
      window.addEventListener('resize', onResize);
      refresh();
      return { destroy: function () { window.removeEventListener('resize', onResize); } };
    }
  };
  G._u = { svgEl: svgEl, htmlEl: htmlEl, rnd: rnd, clamp: clamp };   // utilidades compartidas con repairgames2.js
})(window.NCS = window.NCS || {});
