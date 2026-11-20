/* Orquestación: una única simulación ficticia conecta motor, módulos, núcleo, paneles y registro. */
(function (N) {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var HUES = { cyan: 190, blue: 215, violet: 265 };
  // Estado del motor -> nivel de alarma, efecto del núcleo y clase visual global
  var INFO = {
    'STABLE':              { lvl: 'NORMAL',   fx: 'STABLE',    cls: 'stable',    txt: 'Parámetros simulados estables' },
    'UNSTABLE':            { lvl: 'WARNING',  fx: 'UNSTABLE',  cls: 'unstable',  txt: 'Oscilación simulada detectada' },
    'RADIATION ALERT':     { lvl: 'WARNING',  fx: 'RADIATION', cls: 'radiation', txt: 'RAD-POINTS elevados' },
    'EMERGENCY':           { lvl: 'CRITICAL', fx: 'EMERGENCY', cls: 'emergency', txt: 'Emergencia visual de demostración' },
    'CONTAINMENT FAILURE': { lvl: 'CRITICAL', fx: 'FAILURE',   cls: 'failure',   txt: 'Fallo de contención simulado' },
    'OFFLINE':             { lvl: 'OFFLINE',  fx: 'OFFLINE',   cls: 'offline',   txt: 'Núcleo inactivo' }
  };
  var reactor, sim, last = 0, acc = 0, chartAcc = 0, theme = 'cyan', cata = null;

  // ---- Presentación coherente de la simulación ----
  function displayStatus() {
    return sim.mode === 'failed' ? 'SYSTEM FAILURE' : sim.mode === 'paused' ? 'STANDBY' : sim.mode === 'offline' ? 'OFFLINE' : sim.state;
  }
  function paintState() {
    var key = sim.mode === 'running' ? sim.state : 'OFFLINE';
    var inf = INFO[key];
    if (sim.mode !== 'failed') document.body.setAttribute('data-state', inf.cls);
    N.Alarms.set(sim.mode === 'failed' ? 'CRITICAL' : sim.mode === 'paused' ? 'OFFLINE' : inf.lvl, null, true);
    var energy = sim.mode === 'running' && key !== 'OFFLINE' ? 0.3 + 0.7 * Math.min(1, sim.energy / 100) : sim.mode === 'paused' ? 0.22 : 0.06;
    if (sim.mode !== 'failed') reactor.setFx(inf.fx, energy);
    reactor.themeHue = HUES[theme]; N.hue = HUES[theme];
  }
  function render() { sim.status = displayStatus(); N.Dashboard.render(sim); }
  function buttons() {
    $('btnStart').disabled = sim.mode !== 'offline';
    $('btnPause').disabled = sim.mode !== 'running';
    $('btnResume').disabled = sim.mode !== 'paused';
    $('btnDemo').disabled = sim.mode === 'failed';
    $('onlineTxt').textContent = sim.mode === 'running' ? 'SIMULATION ONLINE' : sim.mode === 'paused' ? 'SIMULATION PAUSED' : sim.mode === 'failed' ? 'SYSTEM FAILURE' : 'SIMULATION IDLE';
    paintState();
  }

  // Cambio de estado del motor: se registra como ESTADO o ALERTA
  function onStateChange(from, to) {
    var inf = INFO[to], serious = inf.lvl === 'WARNING' || inf.lvl === 'CRITICAL';
    N.Dashboard.log(from + ' → ' + to + ' — ' + inf.txt, inf.lvl === 'CRITICAL' ? 'crit' : serious ? 'warn' : to === 'STABLE' ? 'ok' : 'info', serious ? 'ALERTA' : 'ESTADO');
  }

  // ---- Modo demo: apaga módulos al azar y los restaura solos ----
  function demoTick(dt) {
    var i, r;
    for (i = sim.restore.length - 1; i >= 0; i--) {
      r = sim.restore[i]; r.t -= dt;
      if (r.t <= 0 || sim.risk > 5) { N.Components.set(r.id, true, 'demo'); sim.restore.splice(i, 1); }
    }
    if (!sim.demo) return;
    sim.demoT -= dt;
    if (sim.demoT <= 0) {
      var pool = ['cooling', 'shield', 'stabilizer', 'containment', 'energy'].filter(function (id) { return N.Engine.mods[id]; });
      var n = Math.random() < 0.3 ? 2 : 1;
      while (n-- > 0 && pool.length) {
        var id = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
        if (N.Components.set(id, false, 'demo')) sim.restore.push({ id: id, t: N.Engine.rnd(6, 10) });
      }
      sim.demoT = N.Engine.rnd(16, 24);
    }
  }

  // ---- Controles ----
  function start() {
    if (sim.mode !== 'offline') return;
    sim.mode = 'running'; sim.state = 'STABLE';
    N.Dashboard.log('Inicio de simulación', 'ok', 'SISTEMA'); N.Audio.play('start');
    N.Engine.step(sim, 0.25);
    onStateChange('OFFLINE', sim.state);
    buttons(); render();
  }
  function pause() {
    if (sim.mode !== 'running') return;
    sim.mode = 'paused'; N.Dashboard.log('Simulación en pausa', 'warn', 'SISTEMA'); N.Audio.play('stop'); buttons(); render();
  }
  function resume() {
    if (sim.mode !== 'paused') return;
    sim.mode = 'running'; N.Dashboard.log('Simulación reanudada', 'ok', 'SISTEMA'); N.Audio.play('start'); buttons(); render();
  }
  function reset() {
    var demo = sim.demo;
    cata = null; reactor.coreScale = 1; reactor.fx && reactor.setFx('OFFLINE', 0.06);
    $('flash').style.opacity = 0; $('sysfail').hidden = true; document.body.classList.remove('blackout');
    N.Components.reset();
    sim = N.Engine.create(demo);
    N.Dashboard.log('Reinicio de simulación: módulos restaurados', 'info', 'REINICIO'); N.Audio.play('stop');
    N.Dashboard.clearChart(); buttons(); render();
  }
  function toggleDemo() {
    sim.demo = !sim.demo;
    var b = $('btnDemo');
    b.setAttribute('aria-pressed', sim.demo); b.textContent = 'AUTO DEMO MODE: ' + (sim.demo ? 'ON' : 'OFF');
    N.Dashboard.log('Modo demostración ' + (sim.demo ? 'activado' : 'desactivado'), 'info', 'SISTEMA');
    if (sim.demo) { sim.demoT = 4; if (sim.mode === 'offline') start(); }
  }

  // ---- Evento final ficticio (solo visual) ----
  function triggerCata() {
    sim.mode = 'failed'; cata = { t: 0, black: false, msg: false };
    N.Components.locked = true; sim.demo = false;
    $('btnDemo').setAttribute('aria-pressed', 'false'); $('btnDemo').textContent = 'AUTO DEMO MODE: OFF';
    document.body.setAttribute('data-state', 'catastrophe');
    N.Alarms.set('CRITICAL', null, true);
    N.Dashboard.log('Evento especial: secuencia final ficticia iniciada', 'crit', 'EVENTO');
    N.Audio.play('alarm'); buttons(); render();
  }
  function cataTick(dt) {
    cata.t += dt; var t = cata.t;
    reactor.setFx('CATASTROPHE', t < 5 ? 1 : 0.05);
    $('flash').style.opacity = t < 0.5 ? t / 0.5 : Math.max(0, 1 - (t - 0.5) / 1.5);
    reactor.coreScale = t < 1.5 ? 1 + t * 0.9 : Math.max(0, 2.35 - (t - 1.5) * 0.7);   // expansión y colapso visual
    if (t > 5.5 && !cata.black) {
      cata.black = true; document.body.classList.add('blackout');
      N.Dashboard.log('Apagado de interfaz en curso', 'crit', 'EVENTO');
    }
    if (t > 7 && !cata.msg) {
      cata.msg = true; $('sysfail').hidden = false; document.body.setAttribute('data-state', 'offline');
      N.Dashboard.log('SYSTEM FAILURE — pulsa RESET para reiniciar', 'crit', 'EVENTO');
    }
  }

  // ---- Bucle principal: el núcleo se dibuja siempre; los datos avanzan solo en ejecución ----
  function loop(ts) {
    var dt = Math.min(0.05, (ts - last) / 1000 || 0.016); last = ts;
    if (sim.mode === 'running') {
      acc += dt * reactor.speed; chartAcc += dt;
      if (acc >= 0.25) {
        var prev = sim.state;
        N.Engine.step(sim, acc); demoTick(acc); acc = 0;
        if (sim.state !== prev) onStateChange(prev, sim.state);
        if (sim.risk >= N.Engine.RISK_LIMIT) triggerCata(); else { paintState(); render(); }
      }
      if (chartAcc >= 0.5) { chartAcc = 0; N.Dashboard.pushChart(sim); }
    } else if (cata) cataTick(dt);
    reactor.frame(dt, ts / 1000);
    requestAnimationFrame(loop);
  }

  function init() {
    reactor = new N.Reactor($('core'));
    sim = N.Engine.create(false);
    N.Dashboard.init();
    N.Components.init(function () { if (sim.mode !== 'running') render(); });
    N.Dashboard.log('Sistema inicializado en modo local', 'info', 'SISTEMA');
    N.Alarms.set('OFFLINE', null, true); buttons(); render();

    $('btnStart').addEventListener('click', start);
    $('btnPause').addEventListener('click', pause);
    $('btnResume').addEventListener('click', resume);
    $('btnReset').addEventListener('click', reset);
    $('btnReboot').addEventListener('click', reset);
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
      N.Dashboard.log('Sonido ' + (on ? 'activado' : 'desactivado'), 'info', 'SISTEMA');
    });
    var btns = document.querySelectorAll('[data-theme].btn');
    Array.prototype.forEach.call(btns, function (b) {
      b.addEventListener('click', function () {
        theme = b.getAttribute('data-theme');
        document.body.setAttribute('data-theme', theme);
        Array.prototype.forEach.call(btns, function (x) { x.classList.toggle('active', x === b); });
        paintState(); N.Dashboard.redrawChart();
        N.Dashboard.log('Modo visual: ' + b.textContent, 'info', 'SISTEMA'); N.Audio.play('notify');
      });
    });

    requestAnimationFrame(function (ts) { last = ts; loop(ts); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})(window.NCS = window.NCS || {});
