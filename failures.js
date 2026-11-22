/* Sistema de fallas ficticias: cada una con su alerta (tarjeta), temporizador, estado y severidad.
   Nada se repara solo: expirar el temporizador solo agrava la falla. Los tiempos usan segundos de simulación. */
(function (N) {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var rnd = N.Engine.rnd, ACCEPT = 70;                          // intensidad "aceptable" (%) para la sobreproducción
  var DEFS = {
    cooling:  { name: 'COOLING SYSTEM FAILURE', lim: [60, 90], game: true,
                msg: 'El circuito de refrigeración ficticio está bloqueado: el calor virtual se acumula.' },
    overload: { name: 'POWER OUTPUT — OVERPRODUCTION', lim: [50, 80], game: false,
                msg: 'Sobreproducción ficticia de energía detectada.' },
    shields:  { name: 'SHIELDS FAILURE', lim: [60, 105], game: true,
                msg: 'Grietas en el blindaje simulado: los RAD-POINTS se filtran.' },
    circuit:  { name: 'SHORT CIRCUIT', lim: [30, 40], game: true,
                msg: 'Cortocircuito ficticio: el cableado del panel está desconectado.' },
    controls: { name: 'CONTROLS FAILURE', lim: [55, 70], game: true,
                msg: 'Los controles del reactor no responden: el panel está bloqueado hasta descifrar el código.' }
  };
  var WARN = ['', 'Aviso adicional: la falla empeora.', 'ADVERTENCIA: riesgo de emergencia.', 'EMERGENCIA: falla crítica sin reparar.'];
  var act = {}, host, hooks = {}, nextSpawn = 30;

  function ids() { return Object.keys(act); }
  function log(msg, type) { N.Dashboard.log(msg, type, 'FALLA'); }

  function stateText(f) {
    if (N.Repair.openId() === f.id) return 'REPARANDO';
    if (f.id === 'overload') return f.hold > 0 ? 'ESTABILIZANDO' : (f.sev > 1 ? 'ADVERTENCIA NIVEL ' + f.sev : 'ACTIVA');
    return f.sev > 1 ? 'ADVERTENCIA NIVEL ' + f.sev : 'ACTIVA';
  }
  function render(f) {
    var c = f.el;
    c.setAttribute('data-sev', f.sev);
    c.querySelector('.fc-state').textContent = stateText(f) + ' · NIVEL ' + f.sev;
    c.querySelector('.fc-time').textContent = Math.max(0, Math.ceil(f.left));
    c.querySelector('.fc-bar').style.width = Math.max(0, f.left / f.limit * 100) + '%';
    var extra = WARN[Math.min(3, f.sev - 1)];
    c.querySelector('.fc-msg').textContent = DEFS[f.id].msg + (extra ? ' ' + extra : '');
    if (f.id === 'overload') {
      c.querySelector('.fc-hint').textContent = 'Reduce la Intensidad del reactor a ' + ACCEPT + '% o menos, o desactiva el Core Module, durante ' + f.need + ' s seguidos.  Progreso: ' + Math.floor(f.hold) + '/' + f.need + ' s';
    }
  }
  function buildCard(f) {
    var d = DEFS[f.id], c = document.createElement('article');
    c.className = 'fail-card'; c.setAttribute('data-id', f.id);
    c.innerHTML = '<div class="fc-head"><b class="fc-name">' + d.name + '</b><span class="fc-state mono"></span></div>' +
      '<p class="fc-msg"></p>' + (d.game ? '' : '<p class="fc-hint mono"></p>') +
      '<div class="fc-meta mono"><span>TIEMPO LÍMITE <b class="fc-time">0</b> s</span></div><span class="bar"><i class="fc-bar"></i></span>' +
      (d.game ? '<button class="btn pri fc-btn" type="button">INICIAR REPARACIÓN</button>' : '');
    host.appendChild(c); f.el = c; host.hidden = false;
  }
  function spawn(id) {
    var free = Object.keys(DEFS).filter(function (k) { return !act[k]; });
    if (!free.length || ids().length >= 2) return;                // nunca más de 2 fallas a la vez
    id = id && !act[id] ? id : free[Math.floor(Math.random() * free.length)];
    var d = DEFS[id], lim = Math.round(rnd(d.lim[0], d.lim[1]));
    var f = act[id] = { id: id, sev: 1, limit: lim, left: lim, hold: 0, need: Math.round(rnd(10, 15)) };
    N.Engine.fail[id] = 1; N.Components.syncLock(); buildCard(f); render(f);
    log(d.name + ': ' + d.msg + ' Tiempo límite ' + lim + ' s.', 'crit'); N.Audio.play('emergency');
  }
  function resolve(id, src) {
    var f = act[id]; if (!f) return;
    delete act[id]; N.Engine.fail[id] = 0; N.Components.syncLock();
    if (f.el.parentNode) f.el.parentNode.removeChild(f.el);
    if (!ids().length) host.hidden = true;
    log(DEFS[id].name + ' reparada: sistema restablecido.', 'ok');
    if (src !== 'repair') N.Audio.play('stable');
  }
  // Tiempo agotado: la falla continúa, sube de nivel y se concede un nuevo plazo más corto
  function escalate(f) {
    f.sev = Math.min(4, f.sev + 1); N.Engine.fail[f.id] = f.sev;
    var lim = DEFS[f.id].lim; f.limit = Math.max(15, Math.round(rnd(lim[0], lim[1]) * 0.5)); f.left = f.limit;
    log(DEFS[f.id].name + ': tiempo agotado. ' + WARN[Math.min(3, f.sev - 1)] + ' (nivel ' + f.sev + ')', 'crit');
    N.Audio.play('emergency');
    if (N.Repair.openId() === f.id) N.Repair.timeUp();
  }

  N.Failures = {
    ACCEPT: ACCEPT,
    init: function (h) {
      hooks = h; host = $('failList');
      host.addEventListener('click', function (e) {
        var b = e.target.closest('.fc-btn'); if (b) N.Repair.open(b.closest('.fail-card').getAttribute('data-id'));
      });
    },
    get: function (id) { return act[id] || null; },
    names: function () { return ids().map(function (k) { return DEFS[k].name; }).join(', '); },
    spawn: spawn,
    focus: function () { host.scrollIntoView({ behavior: 'smooth', block: 'center' }); },
    repaired: function (id) { resolve(id, 'repair'); },
    reset: function () {
      act = {}; for (var k in N.Engine.fail) N.Engine.fail[k] = 0; N.Components.syncLock();
      host.innerHTML = ''; host.hidden = true; nextSpawn = rnd(25, 40); N.Repair.close();
    },
    // Llamado en cada tick con la simulación en marcha
    update: function (sim, dt) {
      var id, f;
      for (id in act) {
        f = act[id];
        if (id === 'overload') {                                   // condición: intensidad aceptable o reactor desactivado
          var ok = hooks.intensity() <= ACCEPT || !N.Engine.mods.core;
          f.hold = ok ? f.hold + dt : 0;
          if (f.hold >= f.need) { resolve(id, 'manual'); continue; }
        }
        f.left -= dt;
        if (f.left <= 0) escalate(f);
        render(f);
        if (N.Repair.openId() === id) N.Repair.sync(f);
      }
      if (!sim.demo) {                                             // en modo demo no aparecen fallas (no hay quien las repare)
        nextSpawn -= dt;
        if (nextSpawn <= 0) { spawn(); nextSpawn = rnd(45, 80); }
      }
    }
  };
})(window.NCS = window.NCS || {});
