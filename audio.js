/* Audio sintetizado (Web Audio API), sin archivos. Desactivado hasta que el usuario lo activa.
   Buses: sfx (efectos), amb (ambiente), alarm (alarmas) -> master.
   Un único temporizador para el patrón de alarma y un límite de voces para evitar solapamientos. */
(function (N) {
  'use strict';
  var ctx = null, on = false, sfxOn = true, g = {}, noiseBuf = null;
  var vol = { master: 0.7, ambient: 0.5, alarm: 0.8 };
  var voices = 0, MAX_VOICES = 14, last = {}, lastAny = 0;
  var amb = null, offTid = 0, alarmTimer = 0, alarmType = 'none';
  var want = { amb: 'off', alarm: 'none', fast: false };
  var ALARM_BUS = { warning: 1, emergency: 1, alarm: 1 };          // sonidos que NO dependen del interruptor "Sound Effects"

  function ensure() {
    if (ctx) return true;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    ['master', 'sfx', 'amb', 'alarm'].forEach(function (k) { g[k] = ctx.createGain(); });
    g.sfx.connect(g.master); g.amb.connect(g.master); g.alarm.connect(g.master); g.master.connect(ctx.destination);
    var n = ctx.sampleRate * 2; noiseBuf = ctx.createBuffer(1, n, ctx.sampleRate);
    var d = noiseBuf.getChannelData(0); for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    return true;
  }
  function applyVol() {
    if (!ctx) return;
    var t = ctx.currentTime;
    g.master.gain.setTargetAtTime(on ? vol.master * vol.master : 0, t, 0.05);
    g.amb.gain.setTargetAtTime(vol.ambient * vol.ambient, t, 0.05);
    g.alarm.gain.setTargetAtTime(vol.alarm * vol.alarm, t, 0.05);
    g.sfx.gain.setTargetAtTime(sfxOn ? 1 : 0, t, 0.03);
  }

  // Tono con envolvente; omite voces nuevas si ya hay demasiadas (salvo alarmas)
  function tone(f0, f1, dur, type, v, delay, bus) {
    bus = bus || 'sfx'; if (voices >= MAX_VOICES && bus !== 'alarm') return;
    var t = ctx.currentTime + (delay || 0), o = ctx.createOscillator(), a = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    a.gain.setValueAtTime(0.0001, t); a.gain.exponentialRampToValueAtTime(v, t + Math.min(0.02, dur / 3)); a.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(a); a.connect(g[bus]); voices++;
    o.onended = function () { voices--; a.disconnect(); };
    o.start(t); o.stop(t + dur + 0.05);
  }
  // Ráfaga de ruido filtrada (explosiones, chispas, golpes)
  function noise(dur, v, fa, fb, ftype, delay, bus) {
    bus = bus || 'sfx'; if (voices >= MAX_VOICES && bus !== 'alarm') return;
    var t = ctx.currentTime + (delay || 0), s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), a = ctx.createGain();
    s.buffer = noiseBuf; f.type = ftype; f.frequency.setValueAtTime(fa, t); f.frequency.exponentialRampToValueAtTime(Math.max(20, fb), t + dur);
    a.gain.setValueAtTime(v, t); a.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(a); a.connect(g[bus]); voices++;
    s.onended = function () { voices--; a.disconnect(); };
    s.start(t, Math.random()); s.stop(t + dur + 0.05);
  }

  // Efectos de un disparo: [función, enfriamiento mínimo en ms]
  var S = {
    click:     [function () { tone(1400, 1000, 0.04, 'square', 0.04); }, 80],
    toggle:    [function () { tone(700, 1000, 0.06, 'triangle', 0.1); }, 40],
    toggleOn:  [function () { tone(500, 1000, 0.12, 'triangle', 0.12); tone(1000, 1500, 0.1, 'sine', 0.08, 0.08); }, 100],
    moduleOn:  [function () { tone(180, 640, 0.35, 'sawtooth', 0.08); tone(900, 1200, 0.1, 'sine', 0.08, 0.28); }, 100],
    moduleOff: [function () { tone(640, 140, 0.4, 'sawtooth', 0.08); }, 100],
    repair:    [function () { tone(500, 500, 0.08, 'square', 0.06); tone(750, 750, 0.08, 'square', 0.06, 0.1); tone(1000, 1000, 0.14, 'square', 0.06, 0.2); }, 200],
    start:     [function () { tone(180, 720, 0.5, 'sawtooth', 0.08); tone(360, 1080, 0.5, 'sine', 0.06, 0.1); }, 150],
    stop:      [function () { tone(720, 140, 0.55, 'sawtooth', 0.08); }, 150],
    notify:    [function () { tone(880, 880, 0.12, 'sine', 0.1); tone(1320, 1320, 0.18, 'sine', 0.1, 0.14); }, 150],
    stable:    [function () { tone(660, 990, 0.25, 'sine', 0.1); tone(990, 1320, 0.3, 'sine', 0.08, 0.15); }, 300],
    warning:   [function () { tone(880, 880, 0.14, 'square', 0.16, 0, 'alarm'); tone(660, 660, 0.2, 'square', 0.16, 0.18, 'alarm'); }, 400],
    emergency: [function () { tone(400, 1000, 0.45, 'sawtooth', 0.2, 0, 'alarm'); tone(400, 1000, 0.45, 'sawtooth', 0.2, 0.5, 'alarm'); }, 800],
    alarm:     [function () { for (var i = 0; i < 3; i++) tone(520, 380, 0.22, 'square', 0.1, i * 0.3, 'alarm'); }, 800],
    blackout:  [function () { noise(0.5, 0.5, 2500, 60, 'lowpass'); tone(320, 35, 0.9, 'sawtooth', 0.25); }, 1000],
    restore:   [function () { noise(0.4, 0.35, 300, 4000, 'bandpass'); tone(440, 1760, 0.35, 'square', 0.1, 0.05); tone(1320, 1320, 0.5, 'sine', 0.1, 0.35); }, 1000],
    boxOpen:   [function () { noise(0.12, 0.4, 3000, 800, 'bandpass'); tone(140, 90, 0.25, 'square', 0.12, 0.05); }, 300],
    win:       [function () { tone(660, 660, 0.12, 'sine', 0.12); tone(880, 880, 0.12, 'sine', 0.12, 0.12); tone(1320, 1320, 0.3, 'sine', 0.12, 0.24); }, 500],
    explosion: [function () { noise(2.2, 0.9, 4000, 60, 'lowpass'); tone(110, 28, 1.6, 'sine', 0.6); noise(0.15, 0.7, 6000, 2000, 'highpass'); }, 2000],
    valveTurn: [function () { noise(0.07, 0.35, 900, 300, 'bandpass'); tone(150, 110, 0.08, 'square', 0.07); }, 60],
    pressure:  [function () { noise(0.6, 0.25, 4000, 1200, 'highpass'); tone(200, 520, 0.5, 'sine', 0.1); tone(520, 520, 0.15, 'sine', 0.08, 0.5); }, 400],
    flowRestore: [function () { noise(1.0, 0.4, 300, 2800, 'bandpass'); tone(180, 360, 0.8, 'sine', 0.1); tone(360, 720, 0.6, 'sine', 0.08, 0.5); }, 1000],
    weld:      [function () { noise(0.1, 0.22, 5000, 2500, 'highpass'); tone(1800 + Math.random() * 800, 900, 0.05, 'square', 0.03); }, 85],
    wrong:     [function () { tone(160, 110, 0.22, 'sawtooth', 0.12); }, 150],
    keyInsert: [function () { noise(0.08, 0.35, 2500, 900, 'bandpass'); tone(520, 380, 0.1, 'square', 0.08); }, 150],
    keyTurn:   [function () { for (var i = 0; i < 4; i++) tone(300 + i * 40, 260 + i * 40, 0.05, 'square', 0.07, i * 0.07); noise(0.12, 0.3, 1800, 600, 'bandpass', 0.28); }, 300],
    crank:     [function () { for (var i = 0; i < 5; i++) noise(0.09, 0.3, 600, 200, 'lowpass', i * 0.12); tone(60, 160, 0.7, 'sawtooth', 0.18, 0.5); noise(0.5, 0.4, 900, 200, 'lowpass', 0.5); }, 1500],
    clunk:     [function () { noise(0.07, 0.35, 1500, 400, 'lowpass'); tone(110, 70, 0.1, 'square', 0.1); }, 60],
    gameover:  [function () { tone(220, 55, 3.2, 'sawtooth', 0.14); tone(165, 41, 3.2, 'sawtooth', 0.12); tone(131, 33, 3.2, 'sawtooth', 0.1); }, 2000]
  };

  // ---- Alarma en bucle: un único setInterval ----
  var PERIOD = { unstable: 1800, radiation: 1300, emergency: 1100, critical: 700, blackout: 1800 };
  function alarmFire() {
    if (!on || !ctx || ctx.state !== 'running') return;
    var i;
    switch (alarmType) {
      case 'unstable':  tone(660, 660, 0.12, 'square', 0.22, 0, 'alarm'); tone(880, 880, 0.12, 'square', 0.22, 0.18, 'alarm'); break;
      case 'radiation': for (i = 0; i < 4; i++) tone(1500, 1500, 0.03, 'square', 0.18, i * 0.09, 'alarm'); tone(520, 520, 0.28, 'sine', 0.18, 0.4, 'alarm'); break;
      case 'emergency': tone(520, 900, 0.45, 'sawtooth', 0.2, 0, 'alarm'); break;
      case 'critical':  tone(450, 980, 0.3, 'sawtooth', 0.3, 0, 'alarm'); tone(980, 450, 0.3, 'sawtooth', 0.3, 0.3, 'alarm'); break;
      case 'blackout':  tone(180, 140, 0.5, 'triangle', 0.3, 0, 'alarm'); break;
    }
  }
  function setAlarm(t) {
    if (t === alarmType && (alarmTimer || t === 'none')) return;
    clearInterval(alarmTimer); alarmTimer = 0; alarmType = t;
    if (t === 'none' || !on) return;
    alarmFire(); alarmTimer = setInterval(alarmFire, PERIOD[t]);
  }

  // ---- Ambiente continuo del reactor + zumbido eléctrico ----
  var AMB = {
    calm:  { lvl: 0.5,  lp: 260, lfo: 0.25, f: 55, buzz: 0.05 },
    tense: { lvl: 0.7,  lp: 480, lfo: 1.3,  f: 60, buzz: 0.2 },
    idle:  { lvl: 0.15, lp: 140, lfo: 0.15, f: 50, buzz: 0 },
    off:   { lvl: 0,    lp: 90,  lfo: 0.1,  f: 40, buzz: 0 }
  };
  function startAmb() {
    if (amb || !ctx) return;
    var o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), lfo = ctx.createOscillator(), bo = ctx.createOscillator();
    var lp = ctx.createBiquadFilter(), ag = ctx.createGain(), lg = ctx.createGain(), bp = ctx.createBiquadFilter(), bz = ctx.createGain();
    o1.type = 'sawtooth'; o2.type = 'sine'; lfo.type = 'sine'; bo.type = 'square'; lp.type = 'lowpass'; bp.type = 'bandpass'; bp.frequency.value = 400; bp.Q.value = 4;
    ag.gain.value = 0; lg.gain.value = 0.08; bz.gain.value = 0; bo.frequency.value = 100;
    o1.connect(lp); o2.connect(lp); lp.connect(ag); ag.connect(g.amb); lfo.connect(lg); lg.connect(ag.gain);
    bo.connect(bp); bp.connect(bz); bz.connect(g.amb);
    [o1, o2, lfo, bo].forEach(function (o) { o.start(); });
    amb = { o1: o1, o2: o2, lfo: lfo, bo: bo, lp: lp, ag: ag, bz: bz };
    ambMode(want.amb, false);
  }
  function ambMode(m, fast) {
    if (!amb) return;
    var p = AMB[m] || AMB.off, t = ctx.currentTime, tc = fast ? 0.08 : 0.7;
    amb.ag.gain.setTargetAtTime(p.lvl * 0.5, t, tc); amb.lp.frequency.setTargetAtTime(p.lp, t, tc);
    amb.lfo.frequency.setTargetAtTime(p.lfo, t, tc);
    amb.o1.frequency.setTargetAtTime(p.f, t, tc); amb.o2.frequency.setTargetAtTime(p.f * 1.5, t, tc);
    amb.bz.gain.setTargetAtTime(p.buzz * 0.4, t, tc);
    amb.bo.frequency.setTargetAtTime(fast && m === 'off' ? 30 : 100, t, fast ? 0.25 : tc);   // el zumbido cae de tono al interrumpirse
  }
  function stopAmb() {
    if (!amb) return;
    var a = amb; amb = null;
    [a.o1, a.o2, a.lfo, a.bo].forEach(function (o) { try { o.stop(); o.disconnect(); } catch (e) { /* ya detenido */ } });
    a.lp.disconnect(); a.ag.disconnect(); a.bz.disconnect();
  }
  // ---- Agua circulando (minijuego de refrigeración): ruido filtrado continuo, más fuerte con más flujo ----
  var water = null, waterWant = -1;
  function waterLevel(l) {
    if (!water) return;
    var t = ctx.currentTime;
    water.gn.gain.setTargetAtTime(0.12 + 0.9 * l, t, 0.25); water.lp.frequency.setTargetAtTime(500 + 2200 * l, t, 0.25);
  }
  function startWater() {
    if (water || !ctx) return;
    var s = ctx.createBufferSource(), hp = ctx.createBiquadFilter(), lp = ctx.createBiquadFilter(), gn = ctx.createGain();
    s.buffer = noiseBuf; s.loop = true; hp.type = 'highpass'; hp.frequency.value = 200; lp.type = 'lowpass'; gn.gain.value = 0;
    s.connect(hp); hp.connect(lp); lp.connect(gn); gn.connect(g.amb); s.start();
    water = { s: s, lp: lp, gn: gn, hp: hp }; waterLevel(waterWant);
  }
  function stopWater() {
    if (!water) return;
    var w = water; water = null;
    try { w.s.stop(); w.s.disconnect(); } catch (e) { /* ya detenido */ }
    w.hp.disconnect(); w.lp.disconnect(); w.gn.disconnect();
  }
  function applyWater() { if (!on || waterWant < 0) { stopWater(); return; } if (!water) startWater(); else waterLevel(waterWant); }
  // ---- Motor del generador (minijuego de energía externa): grave, con "traqueteo"; usa el bus ambiente ----
  var eng = null, engWant = -1, engTid = 0;
  function startEngine() {
    if (eng || !ctx) return;
    var o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), lfo = ctx.createOscillator(), lp = ctx.createBiquadFilter(), gn = ctx.createGain(), lg = ctx.createGain();
    o1.type = 'sawtooth'; o2.type = 'square'; lfo.type = 'sine'; lp.type = 'lowpass'; lp.frequency.value = 420;
    o1.frequency.value = 46; o2.frequency.value = 92; lfo.frequency.value = 13; gn.gain.value = 0; lg.gain.value = 0.35;
    o1.connect(lp); o2.connect(lp); lp.connect(gn); gn.connect(g.amb); lfo.connect(lg); lg.connect(gn.gain);
    [o1, o2, lfo].forEach(function (o) { o.start(); });
    eng = { o1: o1, o2: o2, lfo: lfo, lp: lp, gn: gn };
    var t = ctx.currentTime; gn.gain.setTargetAtTime(0.9, t, 0.15);
  }
  function stopEngine() {
    clearTimeout(engTid); engTid = 0;
    if (!eng) return;
    var e = eng; eng = null;
    [e.o1, e.o2, e.lfo].forEach(function (o) { try { o.stop(); o.disconnect(); } catch (x) { /* ya detenido */ } });
    e.lp.disconnect(); e.gn.disconnect();
  }
  function applyEngine() {
    if (!on || engWant < 0) { stopEngine(); return; }
    if (engWant > 0) { clearTimeout(engTid); engTid = 0; if (!eng) startEngine(); return; }
    if (eng && !engTid) {                                         // apagado: el motor "se queda sin energía"
      var t = ctx.currentTime;
      eng.gn.gain.setTargetAtTime(0, t, 0.35); eng.o1.frequency.setTargetAtTime(14, t, 0.3); eng.o2.frequency.setTargetAtTime(28, t, 0.3);
      engTid = setTimeout(stopEngine, 1200);
    }
  }
  function applyScene() { if (!on) return; if (!amb) startAmb(); else ambMode(want.amb, want.fast); setAlarm(want.alarm); }

  N.Audio = {
    isOn: function () { return on; },
    // Debe llamarse desde un gesto del usuario (política de autoplay)
    toggle: function () {
      if (!on) {
        if (!ensure()) return false;
        if (ctx.state === 'suspended') ctx.resume();
        clearTimeout(offTid); on = true; applyVol(); applyScene(); applyWater(); applyEngine(); this.play('toggleOn');
      } else {
        on = false; clearInterval(alarmTimer); alarmTimer = 0; applyVol();
        clearTimeout(offTid); offTid = setTimeout(function () { stopAmb(); stopWater(); stopEngine(); }, 400);       // fundido y liberación de osciladores
      }
      return on;
    },
    setVolume: function (k, v) { vol[k] = v / 100; applyVol(); },
    setSfx: function (b) { sfxOn = !!b; applyVol(); },
    // Escena sonora según el estado del juego: { amb: calm|tense|idle|off, alarm: none|unstable|radiation|emergency|critical|blackout, fast }
    scene: function (s) { want = { amb: s.amb, alarm: s.alarm, fast: !!s.fast }; applyScene(); },
    play: function (name) {
      if (!on || !ctx || !S[name] || (!sfxOn && !ALARM_BUS[name])) return;
      var now = performance.now();
      if (name === 'click' && now - lastAny < 120) return;           // el clic genérico cede ante cualquier otro sonido
      if (last[name] && now - last[name] < S[name][1]) return;       // evita repeticiones inmediatas
      last[name] = now; lastAny = now;
      try { S[name][0](); } catch (e) { /* sonido no crítico */ }
    },
    // Agua del minijuego de refrigeración: nivel 0..1; un valor negativo la detiene
    water: function (l) { waterWant = l; applyWater(); },
    // Nota de la secuencia de memoria (0..8)
    note: function (i) {
      if (!on || !ctx) return;
      var f = [262, 294, 330, 392, 440, 523, 587, 659, 784][i % 9]; tone(f, f, 0.22, 'sine', 0.16);
    },
    // Motor del generador: 1 = en marcha, 0 = se apaga progresivamente, -1 = detener ya
    engine: function (l) { engWant = l; applyEngine(); },
    // Tic de la cuenta atrás del minijuego (más agudo y urgente al final)
    countdown: function (n) {
      if (!on || !ctx) return;
      if (n <= 3) tone(1100, 1100, 0.12, 'square', 0.2, 0, 'alarm');
      else if (n <= 6) tone(900, 900, 0.08, 'square', 0.14, 0, 'alarm');
      else tone(700, 700, 0.05, 'square', 0.08, 0, 'alarm');
    }
  };

  // Pestaña oculta: se suspende el audio para no acumular sonidos
  document.addEventListener('visibilitychange', function () {
    if (!ctx || !on) return;
    if (document.hidden) ctx.suspend(); else ctx.resume();
  });
})(window.NCS = window.NCS || {});
