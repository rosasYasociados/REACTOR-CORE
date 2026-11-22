/* Minijuegos de la actualización 07 (todo ficticio). Mismo contrato que repairgames.js: make(root, api) -> { frame(dt)?, destroy() }.
   Las secuencias y esperas se gestionan con frame(dt): no se crean temporizadores propios. */
(function (N) {
  'use strict';
  var G = N.RepairGames = N.RepairGames || {}, U = G._u;
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function retrigger(el, cls) { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }

  /* ================= MEMORY SEQUENCE: 6 patrones consecutivos de luces ================= */
  G.memory = {
    title: 'MEMORY SEQUENCE',
    sub: 'Memoriza la secuencia de luces y repítela. Cada patrón completado desbloquea el siguiente.',
    winText: 'SECUENCIA COMPLETA',
    make: function (root, api) {
      var LENS = [3, 4, 4, 5, 5, 6], seqs = [], i, s;
      for (i = 0; i < 6; i++) {                                       // secuencias distintas entre sí y sin repetir luz seguida
        do {
          s = []; for (var k = 0; k < LENS[i]; k++) { var p; do { p = Math.floor(Math.random() * 9); } while (k && p === s[k - 1]); s.push(p); }
        } while (seqs.some(function (x) { return x.join() === s.join(); }));
        seqs.push(s);
      }
      var wrap = U.htmlEl('div', 'mem', root), lv = U.htmlEl('div', 'mem-lv', wrap), st = U.htmlEl('p', 'mem-st mono', wrap, ''), grid = U.htmlEl('div', 'mem-grid', wrap);
      var chips = [], pads = [], padT = [];
      for (i = 0; i < 6; i++) chips.push(U.htmlEl('span', '', lv, String(i + 1)));
      for (i = 0; i < 9; i++) {
        var b = U.htmlEl('button', 'pad', grid); b.type = 'button'; b.style.setProperty('--h', i * 40); b.setAttribute('aria-label', 'Luz ' + (i + 1)); b.dataset.i = i;
        pads.push(b); padT.push(0);
      }
      var lvl = 0, phase = 'intro', t = 0, lastK = -1, pos = 0;
      function setChips() { chips.forEach(function (c, j) { c.className = j < lvl ? 'done' : j === lvl ? 'cur' : 'lock'; }); }
      function begin() { phase = 'intro'; t = 0; lastK = -1; pos = 0; grid.classList.remove('bad'); st.textContent = 'PATRÓN ' + (lvl + 1) + '/6 — OBSERVA'; setChips(); api.prog(lvl / 6); }
      function press(n) {
        padT[n] = 0.22; N.Audio.note(n);
        if (n === seqs[lvl][pos]) {
          pos++; api.prog((lvl + pos / seqs[lvl].length) / 6);
          if (pos === seqs[lvl].length) { phase = 'ok'; t = 0; st.textContent = 'CORRECTO'; N.Audio.play('repair'); }
        } else { phase = 'err'; t = 0; grid.classList.add('bad'); st.textContent = 'ERROR — OBSERVA DE NUEVO'; N.Audio.play('wrong'); }
      }
      grid.addEventListener('pointerdown', function (e) { var b2 = e.target.closest('.pad'); if (!b2 || phase !== 'input') return; e.preventDefault(); press(+b2.dataset.i); });
      grid.addEventListener('click', function (e) { var b2 = e.target.closest('.pad'); if (b2 && e.detail === 0 && phase === 'input') press(+b2.dataset.i); });   // teclado
      begin();
      return {
        frame: function (dt) {
          for (var j = 0; j < 9; j++) { padT[j] = Math.max(0, padT[j] - dt); pads[j].classList.toggle('lit', padT[j] > 0); }
          var seq = seqs[lvl], D = 0.55;
          if (phase === 'intro') { t += dt; if (t >= 0.9) { phase = 'show'; t = 0; lastK = -1; } }
          else if (phase === 'show') {
            t += dt; var kk = Math.floor(t / D);
            if (kk >= seq.length) { if (t >= seq.length * D + 0.1) { phase = 'input'; pos = 0; st.textContent = 'REPITE EL PATRÓN'; } }
            else if (kk !== lastK) { lastK = kk; padT[seq[kk]] = 0.36; N.Audio.note(seq[kk]); }
          } else if (phase === 'ok') {
            t += dt; if (t >= 0.9) { lvl++; if (lvl >= 6) { phase = 'done'; setChips(); api.prog(1); api.win(); } else begin(); }
          } else if (phase === 'err') { t += dt; if (t >= 1) { grid.classList.remove('bad'); phase = 'show'; t = 0; lastK = -1; pos = 0; st.textContent = 'PATRÓN ' + (lvl + 1) + '/6 — OBSERVA'; } }
        },
        destroy: function () { /* sin recursos externos */ }
      };
    }
  };

  /* ================= CODE BREAKER (reparación de CONTROLS FAILURE): 3 fases con códigos distintos ================= */
  function feedback(code, guess) {
    var res = [], left = {}, i;
    for (i = 0; i < code.length; i++) { if (guess[i] === code[i]) res[i] = 'g'; else { res[i] = null; left[code[i]] = (left[code[i]] || 0) + 1; } }
    for (i = 0; i < code.length; i++) if (res[i] === null) { if (left[guess[i]] > 0) { res[i] = 'a'; left[guess[i]]--; } else res[i] = 'r'; }
    return res;
  }
  G.controls = {
    title: 'CONTROLS — CODE BREAKER',
    sub: 'Descifra 3 códigos con las pistas. Verde: dígito en su sitio · Ámbar: está en otro lugar · Rojo: no está.',
    make: function (root, api) {
      var LENS = [3, 4, 4], ph = 0, code = [], guess = [], adv = -1, done = false;
      var wrap = U.htmlEl('div', 'cb', root), chipsEl = U.htmlEl('div', 'cb-ph', wrap), clues = U.htmlEl('ul', 'cb-clues', wrap),
        slotsEl = U.htmlEl('div', 'cb-slots mono', wrap), hist = U.htmlEl('div', 'cb-hist mono', wrap), pad = U.htmlEl('div', 'cb-pad', wrap);
      var chips = [0, 1, 2].map(function (n) { return U.htmlEl('span', '', chipsEl, 'CÓDIGO ' + (n + 1)); });
      function newPhase() {
        var len = LENS[ph], digits = shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
        code = digits.slice(0, len); guess = []; hist.innerHTML = ''; clues.innerHTML = '';
        var sum = code.reduce(function (a, b) { return a + b; }, 0), cl = ['La suma de los dígitos es ' + sum + '.', 'El primer dígito es ' + (code[0] % 2 ? 'impar' : 'par') + '.'];
        cl.push(len >= 4 ? 'El código contiene el dígito ' + code[1 + Math.floor(Math.random() * (len - 1))] + '.' : 'El último dígito es ' + (code[2] > code[0] ? 'mayor' : 'menor') + ' que el primero.');
        cl.forEach(function (c) { U.htmlEl('li', '', clues, c); });
        chips.forEach(function (c, j) { c.className = j < ph ? 'done' : j === ph ? 'cur' : 'lock'; });
        api.prog(ph / 3); drawSlots();
      }
      function drawSlots() {
        slotsEl.innerHTML = '';
        for (var i = 0; i < LENS[ph]; i++) U.htmlEl('span', guess[i] != null ? 'f' : '', slotsEl, guess[i] != null ? String(guess[i]) : '_');
      }
      function addDigit(d) { if (adv >= 0 || done || guess.length >= LENS[ph]) return; guess.push(d); N.Audio.play('toggle'); drawSlots(); }
      function del() { if (adv >= 0 || done) return; guess.pop(); drawSlots(); }
      function submit() {
        if (adv >= 0 || done) return;
        if (guess.length !== LENS[ph]) { N.Audio.play('wrong'); retrigger(slotsEl, 'shake'); return; }
        var fb = feedback(code, guess), row = U.htmlEl('div', 'row', hist);
        guess.forEach(function (d, i) { U.htmlEl('b', fb[i], row, String(d)); });
        hist.scrollTop = hist.scrollHeight;
        if (fb.every(function (x) { return x === 'g'; })) { N.Audio.play('repair'); adv = 0.9; chips[ph].className = 'done'; api.prog((ph + 1) / 3); }
        else N.Audio.play('valveTurn');
        guess = []; drawSlots();
      }
      for (var n = 0; n < 10; n++) { (function (d) { var b = U.htmlEl('button', 'btn sm', pad, String(d)); b.type = 'button'; b.addEventListener('click', function () { addDigit(d); }); })(n); }
      var bd = U.htmlEl('button', 'btn sm', pad, '⌫'); bd.type = 'button'; bd.setAttribute('aria-label', 'Borrar'); bd.addEventListener('click', del);
      var be = U.htmlEl('button', 'btn sm pri', pad, 'OK'); be.type = 'button'; be.addEventListener('click', submit);
      function onKey(e) {
        if (e.key >= '0' && e.key <= '9') { addDigit(+e.key); e.preventDefault(); }
        else if (e.key === 'Backspace') { del(); e.preventDefault(); } else if (e.key === 'Enter') { submit(); e.preventDefault(); }
      }
      document.addEventListener('keydown', onKey);
      newPhase();
      return {
        frame: function (dt) {                                          // avance automático al resolver una fase
          if (adv < 0) return;
          adv -= dt;
          if (adv < 0) { adv = -1; ph++; if (ph >= 3) { done = true; api.prog(1); api.win(); } else newPhase(); }
        },
        destroy: function () { document.removeEventListener('keydown', onKey); }
      };
    }
  };

  /* ================= CALIBRATION: detener cada indicador dentro de su zona ================= */
  G.calibration = {
    title: 'CALIBRATION',
    sub: 'Pulsa FIJAR (o Espacio) cuando el indicador esté dentro de la zona verde. Cada vez es más difícil.',
    winText: 'CALIBRACIÓN COMPLETA',
    make: function (root, api) {
      var W = [0.30, 0.24, 0.18, 0.13, 0.09], SP = [0.45, 0.6, 0.8, 1.0, 1.25], rows = [], idx = 0, cool = 0, done = false;
      var wrap = U.htmlEl('div', 'cal', root);
      function tri(x) { x = x % 2; return x < 1 ? x : 2 - x; }
      for (var i = 0; i < 5; i++) {
        var el = U.htmlEl('div', 'cal-row' + (i === 0 ? ' act' : ''), wrap);
        U.htmlEl('span', 'cal-lab mono', el, 'IND ' + (i + 1));
        var tr = U.htmlEl('div', 'cal-track', el), c = U.rnd(W[i] / 2 + 0.04, 1 - W[i] / 2 - 0.04);
        var z = U.htmlEl('i', 'cal-zone', tr); z.style.left = ((c - W[i] / 2) * 100) + '%'; z.style.width = (W[i] * 100) + '%';
        var m = U.htmlEl('i', 'cal-mark', tr), stt = U.htmlEl('span', 'cal-st mono', el, 'EN ESPERA');
        rows.push({ el: el, mark: m, st: stt, c: c, w: W[i], sp: SP[i], ph: U.rnd(0, 2), pos: 0.5 });
        m.style.left = '50%';
      }
      rows[0].st.textContent = 'ACTIVO';
      var fix = U.htmlEl('button', 'btn pri cal-fix', wrap, 'FIJAR'); fix.type = 'button'; fix.id = 'calFix';
      function press() {
        if (done || idx >= 5 || cool > 0) return;
        var r = rows[idx];
        if (Math.abs(r.pos - r.c) <= r.w / 2) {
          r.el.classList.remove('act'); r.el.classList.add('ok'); r.st.textContent = 'CALIBRADO'; N.Audio.play('repair'); idx++;
          api.prog(idx / 5);
          if (idx >= 5) { done = true; api.win(); } else { rows[idx].el.classList.add('act'); rows[idx].st.textContent = 'ACTIVO'; }
        } else { N.Audio.play('wrong'); retrigger(r.el, 'miss'); r.st.textContent = 'FUERA DE ZONA'; cool = 0.35; }
      }
      fix.addEventListener('click', press);
      function onKey(e) { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); press(); } }
      document.addEventListener('keydown', onKey);
      return {
        frame: function (dt) {
          cool = Math.max(0, cool - dt);
          if (done || idx >= 5) return;
          var r = rows[idx]; r.ph += dt * r.sp; r.pos = tri(r.ph); r.mark.style.left = (r.pos * 100).toFixed(1) + '%';
          if (cool === 0 && r.st.textContent === 'FUERA DE ZONA') r.st.textContent = 'ACTIVO';
        },
        destroy: function () { document.removeEventListener('keydown', onKey); }
      };
    }
  };

  /* ================= TOTAL BLACKOUT: encontrar la llave del generador de emergencia ================= */
  function keySvg(teeth, hue) {
    var t = teeth.map(function (h, i) { return '<rect x="' + (23) + '" y="' + (44 + i * 9) + '" width="' + (5 + h * 5) + '" height="6" rx="1"/>'; }).join('');
    return '<svg viewBox="0 0 40 100" aria-hidden="true" style="--kh:' + hue + '"><circle cx="20" cy="18" r="13" class="kb"/><circle cx="20" cy="18" r="5" class="kh"/>' +
      '<rect x="16" y="30" width="8" height="62" rx="2" class="kshaft"/><g class="kt">' + t + '</g></svg>';
  }
  G.keysearch = {
    title: 'TOTAL BLACKOUT — GENERADOR DE EMERGENCIA',
    sub: 'Una de las llaves brilla un poco más. Identifícala, insértala en la cerradura y gírala.',
    winText: 'GENERADOR DE EMERGENCIA ACTIVADO',
    make: function (root, api) {
      var wrap = U.htmlEl('div', 'ks', root), top = U.htmlEl('div', 'ks-top', wrap), lamp = U.htmlEl('span', 'ks-lamp', top), msg = U.htmlEl('p', 'ks-msg mono', top, 'ELIGE UNA LLAVE');
      var lock = U.htmlEl('button', 'ks-lock', wrap); lock.type = 'button'; lock.setAttribute('aria-label', 'Cerradura del generador');
      lock.innerHTML = '<svg viewBox="0 0 60 60" aria-hidden="true"><circle cx="30" cy="30" r="26" class="lk"/><circle cx="30" cy="25" r="6" class="hole"/><rect x="27" y="26" width="6" height="18" rx="2" class="hole"/></svg>';
      var box = U.htmlEl('div', 'ks-box', wrap), good = Math.floor(Math.random() * 6), keys = [], i;
      for (i = 0; i < 6; i++) {
        var b = U.htmlEl('button', 'key' + (i === good ? ' hot' : ''), box); b.type = 'button'; b.setAttribute('aria-label', 'Llave ' + (i + 1)); b.dataset.i = i;
        var teeth = []; for (var k = 0; k < 5; k++) teeth.push(Math.random()); b.innerHTML = keySvg(teeth, 36 + Math.round(Math.random() * 12));
        keys.push(b);
      }
      var st = 'idle', t = 0, sel = -1;
      function setMsg(txt) { msg.textContent = txt; }
      box.addEventListener('click', function (e) {
        var b2 = e.target.closest('.key'); if (!b2 || st !== 'idle') return;
        sel = +b2.dataset.i; st = 'moving'; t = 0; box.classList.add('busy'); N.Audio.play('keyInsert'); setMsg('INSERTANDO…');
        var kr = b2.getBoundingClientRect(), hr = lock.getBoundingClientRect();     // la llave sube hasta la cerradura, punta arriba
        b2.style.zIndex = 5; b2.style.transform = 'translate(' + (hr.left + hr.width / 2 - kr.left - kr.width / 2) + 'px,' + (hr.top + hr.height / 2 - kr.top - kr.height / 2 + 6) + 'px) rotate(180deg)';
      });
      lock.addEventListener('click', function () {
        if (st !== 'inserted') return; st = 'turning'; t = 0; N.Audio.play('keyTurn'); setMsg('GIRANDO…');
        keys[sel].style.transform += ' rotate(90deg)';
      });
      return {
        frame: function (dt) {
          t += dt;
          if (st === 'moving' && t >= 0.65) { st = 'inserted'; t = 0; lock.classList.add('ready'); setMsg('GIRA LA LLAVE (pulsa la cerradura)'); }
          else if (st === 'turning' && t >= 0.7) {
            t = 0; lock.classList.remove('ready');
            if (sel === good) { st = 'won'; lamp.className = 'ks-lamp ok'; setMsg('LLAVE CORRECTA — GENERADOR ARRANCANDO'); N.Audio.play('crank'); wrap.classList.add('gen-on'); api.prog(1); }
            else { st = 'wrong'; lamp.className = 'ks-lamp bad'; setMsg('LLAVE INCORRECTA'); N.Audio.play('wrong'); }
          } else if (st === 'wrong' && t >= 0.9) { st = 'retract'; t = 0; keys[sel].style.transform = ''; N.Audio.play('keyInsert'); }   // la llave se retira sola
          else if (st === 'retract' && t >= 0.7) { st = 'idle'; keys[sel].style.zIndex = ''; lamp.className = 'ks-lamp'; box.classList.remove('busy'); setMsg('ELIGE OTRA LLAVE'); }
          else if (st === 'won' && t >= 1.4) { st = 'done'; api.win(); }
        },
        destroy: function () { /* animaciones CSS: se eliminan con la escena */ }
      };
    }
  };

  /* ================= GENERATOR TO EXTERNAL POWER: 3 escenarios con un único temporizador (el de la escena) ================= */
  G.extpower = {
    title: 'GENERATOR → EXTERNAL POWER',
    sub: 'Tienes 60 s en total para los 3 escenarios.',
    winText: 'EXTERNAL POWER RESTORED.',
    make: function (root, api) {
      var head = U.htmlEl('p', 'ext-head mono', root), body = U.htmlEl('div', 'ext-body', root), sc = 0, pend = null, inner = null, lampT = 0, lampEl = null;
      function after(sec, fn) { pend = { t: sec, fn: fn }; }
      function show(n) {
        sc = n; body.innerHTML = ''; inner = null; head.textContent = 'ESCENARIO ' + (n + 1) + '/3 — ' + ['GENERATOR', 'BREAKER PANEL', 'CABLE CONNECTION'][n]; api.prog(n / 3);
        [s1, s2, s3][n]();
      }

      /* Escenario 1: apagar el generador */
      function s1() {
        N.Audio.engine(1);
        var gen = U.htmlEl('div', 'gen run', body);
        gen.innerHTML = '<svg class="gen-svg" viewBox="0 0 320 170" role="img" aria-label="Generador en marcha"><rect x="10" y="62" width="300" height="90" rx="8" class="g-body"/>' +
          [0, 1, 2].map(function (i) { return '<rect class="pist" x="' + (44 + i * 56) + '" y="26" width="30" height="42" rx="4" style="animation-delay:' + (i * 0.06) + 's"/>'; }).join('') +
          '<g class="fly"><circle cx="258" cy="107" r="34" class="g-fly"/><path d="M258 73v68M224 107h68M234 83l48 48M282 83l-48 48" class="g-spk"/></g>' +
          '<g class="exh"><circle cx="59" cy="18" r="8"/><circle cx="115" cy="14" r="8"/><circle cx="171" cy="18" r="8"/></g>' +
          '<rect x="30" y="112" width="150" height="26" rx="3" class="g-pan"/><circle cx="46" cy="125" r="5" class="g-led"/><circle cx="64" cy="125" r="5" class="g-led"/><circle cx="82" cy="125" r="5" class="g-led"/></svg>';
        var pan = U.htmlEl('div', 'gen-pan', body);
        shuffle([['⛽', 'FUEL'], ['⟳', 'TEST'], ['⚡', 'SYNC'], ['☰', 'LOAD'], ['❄', 'COOL'], ['⏻', 'STOP'], ['◐', 'LAMP'], ['⚙', 'AUX']]).forEach(function (d) {
          var b = U.htmlEl('button', 'gbtn', pan); b.type = 'button'; b.innerHTML = '<b>' + d[0] + '</b><small>' + d[1] + '</small>';
          b.addEventListener('click', function () {
            if (!gen.classList.contains('run')) return;
            if (d[1] === 'STOP') { gen.classList.remove('run'); gen.classList.add('stopping'); N.Audio.engine(0); N.Audio.play('clunk'); after(1.3, function () { show(1); }); }
            else { N.Audio.play('wrong'); retrigger(b, 'shake'); }
          });
        });
      }

      /* Escenario 2: 7 interruptores; la combinación correcta se descubre sin pistas */
      function s2() {
        var DEF = [['GEN OUTPUT', false], ['LOAD BUS A', true], ['LOAD BUS B', true], ['GRID TIE', true], ['GROUND', true], ['BYPASS', false], ['AUX FEED', false]];
        var order = shuffle(DEF.map(function (d, i) { return i; })), state = [], j, wrongCount;
        do { wrongCount = 0; state = DEF.map(function (d) { var v = Math.random() < 0.5; return v; }); DEF.forEach(function (d, i) { if (state[i] !== d[1]) wrongCount++; }); } while (wrongCount < 3);
        var brk = U.htmlEl('div', 'brk', body), row = U.htmlEl('div', 'brk-row', brk), sws = [];
        order.forEach(function (di) {
          var cell = U.htmlEl('div', 'bsw', row); U.htmlEl('span', 'mono', cell, DEF[di][0]);
          var b = U.htmlEl('button', 'btog', cell); b.type = 'button'; b.setAttribute('aria-pressed', state[di]); b.setAttribute('aria-label', DEF[di][0]); b.innerHTML = '<i></i>';
          b.addEventListener('click', function () { state[di] = !state[di]; b.setAttribute('aria-pressed', state[di]); N.Audio.play('clunk'); });
          sws.push(b);
        });
        var act = U.htmlEl('div', 'brk-act', brk), lamp = U.htmlEl('span', 'ks-lamp', act), eng = U.htmlEl('button', 'btn pri', act, 'CERRAR CIRCUITO'); eng.type = 'button';
        var tries = U.htmlEl('span', 'mono brk-tr', act, 'INTENTOS: 0'), n = 0, lock = false;
        eng.addEventListener('click', function () {
          if (lock) return; n++; tries.textContent = 'INTENTOS: ' + n;
          var ok = DEF.every(function (d, i) { return state[i] === d[1]; });
          if (ok) { lock = true; lamp.className = 'ks-lamp ok'; N.Audio.play('repair'); after(0.9, function () { show(2); }); }
          else { lamp.className = 'ks-lamp bad'; retrigger(brk, 'shake'); N.Audio.play('wrong'); lampT = 0.8; lampEl = lamp; }   // señal de error, nuevo intento permitido
        });
      }

      /* Escenario 3: 3 cables (reutiliza el minijuego de cables) */
      function s3() {
        var wrap = U.htmlEl('div', 'ext-wires', body);
        var lamps = U.htmlEl('div', 'ext-lamps', wrap);
        for (var i = 0; i < 12; i++) { var l = U.htmlEl('i', '', lamps); l.style.setProperty('--n', i); }
        var host = U.htmlEl('div', '', wrap);
        inner = G.circuit.make(host, {
          prog: function (p) { api.prog((2 + p) / 3); },
          win: function () { wrap.classList.add('restored'); N.Audio.play('restore'); api.win(); }     // animación de restauración + EXTERNAL POWER RESTORED
        }, { n: 3 });
      }
      show(0);
      return {
        frame: function (dt) {
          if (lampT > 0) { lampT -= dt; if (lampT <= 0 && lampEl) lampEl.className = 'ks-lamp'; }
          if (pend) { pend.t -= dt; if (pend.t <= 0) { var f = pend.fn; pend = null; f(); } }
        },
        destroy: function () { N.Audio.engine(-1); if (inner && inner.destroy) inner.destroy(); pend = null; }
      };
    }
  };
})(window.NCS = window.NCS || {});
