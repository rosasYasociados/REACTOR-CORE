/* Orquestación: estado de la simulación ficticia, bucle de animación y controles. */
(function (N) {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var HUES = { cyan: 190, blue: 215, violet: 265 };
  var reactor, sim, last = 0, acc = 0, chartAcc = 0, theme = 'cyan';

  function freshSim(keepDemo) {
    return { mode: 'offline', temp: 0, energy: 0, particles: 0, stab: 100, runtime: 0,
      stabTarget: 96, nextEvent: 15, recover: 0, demo: !!keepDemo, status: 'OFFLINE' };
  }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function ease(cur, tgt, dt, rate) { return cur + (tgt - cur) * Math.min(1, dt * rate); }

  // Un paso de la simulación visual (datos puramente ficticios)
  function step(dt) {
    sim.runtime += dt;
    var drop = 96 - sim.stab;
    var tempT = 46 + 9 * Math.sin(sim.runtime / 7) + drop * 0.55;
    var enT = 70 + 14 * Math.sin(sim.runtime / 5) + drop * 0.25;
    sim.temp = Math.max(0, Math.min(100, ease(sim.temp, tempT, dt, 1.2) + rnd(-0.4, 0.4)));
    sim.energy = Math.max(0, Math.min(120, ease(sim.energy, enT, dt, 1.2) + rnd(-0.6, 0.6)));
    sim.stab = Math.max(0, Math.min(100, ease(sim.stab, sim.stabTarget, dt, 1.4) + rnd(-0.25, 0.25)));
    sim.particles = sim.energy * 38 + rnd(-40, 40);

    // Perturbaciones ficticias: aleatorias en modo normal, más intensas en modo demo
    if (sim.recover > 0) { sim.recover -= dt; if (sim.recover <= 0) sim.stabTarget = 96; }
    else {
      sim.nextEvent -= dt;
      if (sim.nextEvent <= 0) {
        if (sim.demo) { sim.stabTarget = Math.random() < 0.45 ? rnd(25, 40) : rnd(52, 68); sim.nextEvent = rnd(16, 26); }
        else { sim.stabTarget = rnd(58, 68); sim.nextEvent = rnd(30, 55); }
        sim.recover = rnd(5, 8);
      }
    }
    var key = sim.stab < 45 ? 'CRITICAL' : sim.stab < 72 ? 'WARNING' : 'NORMAL';
    N.Alarms.set(key, key === 'NORMAL' ? 'parámetros simulados estabilizados' : 'estabilidad simulada ' + sim.stab.toFixed(0) + '%');
    sim.status = key === 'NORMAL' ? 'ACTIVE' : key;
  }

  function refreshButtons() {
    $('btnStart').disabled = sim.mode === 'running';
    $('btnPause').disabled = sim.mode !== 'running';
    $('onlineTxt').textContent = sim.mode === 'running' ? 'SIMULATION ONLINE' : sim.mode === 'paused' ? 'SIMULATION PAUSED' : 'SIMULATION IDLE';
    applyReactorState();
  }

  function applyReactorState() {
    var a = N.Alarms.STATES[N.Alarms.current] || N.Alarms.STATES.OFFLINE;
    var energy = sim.mode === 'running' ? 0.3 + 0.7 * Math.min(1, sim.energy / 100) : sim.mode === 'paused' ? 0.22 : 0.06;
    reactor.setState(energy, a.hue === null ? HUES[theme] : a.hue);
    N.hue = HUES[theme];
  }

  function start() {
    if (sim.mode === 'running') return;
    var resumed = sim.mode === 'paused';
    sim.mode = 'running'; sim.status = 'ACTIVE';
    N.Dashboard.log(resumed ? 'Simulación reanudada' : 'Inicio de simulación', 'ok');
    N.Audio.play('start');
    N.Alarms.set('NORMAL', 'sistemas simulados en línea');
    refreshButtons();
  }
  function pause() {
    if (sim.mode !== 'running') return;
    sim.mode = 'paused'; sim.status = 'STANDBY';
    N.Dashboard.log('Simulación en pausa', 'warn');
    N.Audio.play('stop');
    N.Alarms.set('OFFLINE', 'simulación en pausa');
    N.Dashboard.render(sim); refreshButtons();
  }
  function reset() {
    var demo = sim.demo;
    sim = freshSim(demo);
    N.Dashboard.log('Reinicio de simulación', 'info');
    N.Audio.play('stop');
    N.Alarms.set('OFFLINE', 'sistema reiniciado');
    N.Dashboard.clearChart(); N.Dashboard.render(sim); refreshButtons();
  }
  function toggleDemo() {
    sim.demo = !sim.demo;
    var b = $('btnDemo');
    b.setAttribute('aria-pressed', sim.demo); b.textContent = 'MODO DEMO: ' + (sim.demo ? 'ON' : 'OFF');
    N.Dashboard.log('Modo demostración ' + (sim.demo ? 'activado' : 'desactivado'), 'info');
    if (sim.demo) { sim.nextEvent = 4; if (sim.mode !== 'running') start(); }
  }

  // Bucle principal: el núcleo se dibuja siempre; los datos solo avanzan al ejecutar
  function loop(ts) {
    var dt = Math.min(0.05, (ts - last) / 1000 || 0.016); last = ts;
    var speed = reactor.speed;
    if (sim.mode === 'running') {
      acc += dt * speed; chartAcc += dt;
      if (acc >= 0.25) { step(acc); acc = 0; applyReactorState(); N.Dashboard.render(sim); }
      if (chartAcc >= 0.5) { chartAcc = 0; N.Dashboard.pushChart(sim); }
    }
    reactor.frame(dt, ts / 1000);
    requestAnimationFrame(loop);
  }

  function init() {
    reactor = new N.Reactor($('core'));
    sim = freshSim(false);
    N.Dashboard.init();
    N.Dashboard.log('Sistema inicializado en modo local', 'info');
    N.Alarms.set('OFFLINE');
    refreshButtons(); applyReactorState();

    $('btnStart').addEventListener('click', start);
    $('btnPause').addEventListener('click', pause);
    $('btnReset').addEventListener('click', reset);
    $('btnDemo').addEventListener('click', toggleDemo);

    $('rInt').addEventListener('input', function (e) { reactor.intensity = e.target.value / 100; $('oInt').textContent = e.target.value + '%'; });
    $('rSpd').addEventListener('input', function (e) { reactor.speed = e.target.value / 100; $('oSpd').textContent = (e.target.value / 100).toFixed(1) + 'x'; });

    $('btnSettings').addEventListener('click', function () {
      var p = $('settings'), open = p.hidden;
      p.hidden = !open; this.setAttribute('aria-expanded', open);
    });
    $('btnSound').addEventListener('click', function () {
      var on = N.Audio.toggle();
      this.setAttribute('aria-pressed', on); this.textContent = 'SONIDO: ' + (on ? 'ON' : 'OFF');
      N.Dashboard.log('Sonido ' + (on ? 'activado' : 'desactivado'), 'info');
    });
    var btns = document.querySelectorAll('[data-theme].btn');
    Array.prototype.forEach.call(btns, function (b) {
      b.addEventListener('click', function () {
        theme = b.getAttribute('data-theme');
        document.body.setAttribute('data-theme', theme);
        Array.prototype.forEach.call(btns, function (x) { x.classList.toggle('active', x === b); });
        applyReactorState(); N.Dashboard.redrawChart();
        N.Dashboard.log('Modo visual: ' + b.textContent, 'info'); N.Audio.play('notify');
      });
    });

    requestAnimationFrame(function (ts) { last = ts; loop(ts); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})(window.NCS = window.NCS || {});
