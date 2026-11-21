/* Eventos de inestabilidad (causas ficticias), aviso permanente y apagones aleatorios.
   Regla clave: nada aquí estabiliza el reactor; el aviso solo desaparece cuando el estado vuelve a ser estable. */
(function (N) {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var ALERT = { 'UNSTABLE': 1, 'RADIATION ALERT': 1, 'EMERGENCY': 1, 'CONTAINMENT FAILURE': 1 };
  var CAUSES = {
    cooling:     { cause: 'Obstrucción simulada en el circuito de enfriamiento', warn: 'El calor ficticio sube sin control.',
                   cons: 'Sin reparación, el sistema entrará en emergencia térmica ficticia y fallará.' },
    shield:      { cause: 'Grieta simulada en el blindaje', warn: 'Los RAD-POINTS se disparan.',
                   cons: 'Sin reparación, la alerta de radiación crecerá hasta el fallo del sistema.' },
    stabilizer:  { cause: 'Desfase del campo estabilizador', warn: 'La oscilación del núcleo aumenta.',
                   cons: 'Sin reparación, la estabilidad caerá hasta una emergencia.' },
    containment: { cause: 'Sello de contención desalineado', warn: 'La barrera del sistema pierde integridad.',
                   cons: 'Sin reparación, se producirá un fallo de contención ficticio.' },
    energy:      { cause: 'Sobrecarga del Energy Module', warn: 'La carga energética oscila de forma peligrosa.',
                   cons: 'Sin reparación, la inestabilidad escalará y terminará en fallo.' }
  };
  var NAMES = {}; N.Engine.DEFS.forEach(function (d) { NAMES[d.id] = d.name; });
  var rnd = N.Engine.rnd;

  var ev, stats, nextEvent, unstableFor, checkT, cooldown, opT, pct = 15, hooks = {}, goId = null, banner = {};

  function log(msg, type) { N.Dashboard.log(msg, type, 'EMERGENCIA'); }
  function names(ids) { return ids.map(function (i) { return NAMES[i]; }).join(', '); }
  function offMods() { return Object.keys(N.Engine.mods).filter(function (i) { return i !== 'core' && !N.Engine.mods[i]; }); }
  function faulted() { return Object.keys(N.Engine.faults).filter(function (i) { return N.Engine.faults[i]; }); }
  function candidates() {
    return ['cooling', 'shield', 'stabilizer', 'containment', 'energy'].filter(function (i) { return N.Engine.mods[i] && !N.Engine.faults[i]; });
  }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function schedule(sim) { return sim && sim.demo ? rnd(12, 20) : rnd(35, 60); }

  function spawn(sim) {
    var c = candidates(); if (!c.length) return;
    var id = pick(c), cs = CAUSES[id];
    ev = { id: id, faults: [id], t: 0, esc: 0, cause: cs };
    N.Components.setFault(id, true); stats.events++;
    log('REACTOR UNSTABLE — ' + cs.cause + '. ' + cs.warn + ' Control a corregir: ' + NAMES[id] + '.', 'crit');
    N.Audio.play('notify');
  }
  function escalate() {
    var c = candidates(); ev.esc++;
    if (!c.length) return;
    var id = pick(c); ev.faults.push(id); N.Components.setFault(id, true);
    log('Escalada por inestabilidad no resuelta: nuevo fallo en ' + NAMES[id] + '.', 'crit');
  }
  // Operador del modo demo: reacciona con retraso (solo existe con AUTO DEMO activado)
  function operator() {
    var f = faulted(), o = offMods();
    if (f.length) N.Components.repair(f[0], 'demo');
    else if (o.length) N.Components.set(o[0], true, 'demo');
  }

  N.Emergency = {
    stats: function () { return stats; },
    setBlackoutPct: function (v) { pct = v; },
    init: function (h) {
      hooks = h; banner = { el: $('alertBanner'), st: $('abState'), cause: $('abCause'), fix: $('abFix'), cons: $('abCons') };
      $('abGo').addEventListener('click', function () { if (goId) N.Components.highlight(goId); });
      this.reset();
    },
    reset: function () {
      ev = null; stats = { events: 0, emergencies: 0 }; nextEvent = rnd(20, 30); unstableFor = 0; checkT = 8; cooldown = 0; opT = 0; goId = null;
      if (banner.el) banner.el.hidden = true;
    },
    kick: function () { nextEvent = Math.min(nextEvent, 4); },
    noteState: function (to) { if (to === 'EMERGENCY' || to === 'CONTAINMENT FAILURE') stats.emergencies++; },
    noteBlackoutEnd: function () { cooldown = 90; unstableFor = 0; checkT = 8; },

    // Llamado en cada tick con la simulación en marcha
    update: function (sim, dt) {
      var alert = !!ALERT[sim.state];
      if (ev) {
        ev.t += dt;
        var left = ev.faults.filter(function (i) { return N.Engine.faults[i]; });
        if (!left.length) { log('Evento resuelto manualmente: ' + ev.cause.cause, 'ok'); ev = null; nextEvent = schedule(sim); }
        else if (ev.esc < 2 && ev.t > 18 * (ev.esc + 1) && !N.Components.busyAny()) escalate();
      } else if (sim.state === 'STABLE') {
        nextEvent -= dt; if (nextEvent <= 0) spawn(sim);
      }
      if (sim.demo && alert) { opT += dt; if (opT >= 9) { opT = 0; operator(); } } else opT = 0;

      // Apagón aleatorio: solo con inestabilidad, tras un tiempo mínimo, con enfriamiento entre apagones
      unstableFor = alert ? unstableFor + dt : 0;
      cooldown = Math.max(0, cooldown - dt);
      if (alert && !sim.demo && pct > 0 && unstableFor >= 6 && cooldown <= 0) {
        checkT -= dt;
        if (checkT <= 0) {
          checkT = 8;
          if (Math.random() < pct / 100) { stats.events++; stats.emergencies++; hooks.blackout(); }
        }
      }
    },

    // Aviso permanente: visible mientras el estado sea inestable; solo el jugador puede resolverlo
    renderBanner: function (sim) {
      var show = (sim.mode === 'running' || sim.mode === 'paused') && !!ALERT[sim.state];
      banner.el.hidden = !show;
      if (!show) { goId = null; return; }
      var f = faulted(), o = offMods(), risk = Math.round(sim.risk / N.Engine.RISK_LIMIT * 100);
      banner.st.textContent = sim.state + ' · riesgo ' + risk + '%';
      if (f.length) {
        banner.cause.textContent = (ev ? ev.cause.cause + '. ' + ev.cause.warn : 'Fallo de módulo: ' + names(f));
        banner.fix.textContent = 'Reiniciar: ' + names(f) + ' (pulsa su interruptor)';
        banner.cons.textContent = ev ? ev.cause.cons : 'El riesgo seguirá aumentando hasta provocar un fallo.';
        goId = f[0];
      } else if (o.length) {
        banner.cause.textContent = 'Módulos desactivados manualmente: ' + names(o);
        banner.fix.textContent = 'Reactivar: ' + names(o);
        banner.cons.textContent = 'El riesgo seguirá aumentando hasta provocar un fallo.';
        goId = o[0];
      } else {
        banner.cause.textContent = 'Reparación aplicada: los parámetros aún se están normalizando.';
        banner.fix.textContent = 'Mantén todos los módulos ONLINE.';
        banner.cons.textContent = 'Si el estado no mejora, el riesgo seguirá subiendo.';
        goId = null;
      }
    },

    // Causa específica de la derrota para la pantalla GAME OVER
    describeCause: function (sim, reason) {
      if (reason === 'timeout') return 'No se consiguió restaurar la electricidad: el contador de ELECTRICAL EMERGENCY llegó a cero.';
      var f = faulted();
      if (f.length) return 'Fallo de un módulo ficticio sin reparar: ' + names(f) + '. Inestabilidad no resuelta' + (ev ? ' (' + ev.cause.cause + ').' : '.');
      if (sim.state === 'CONTAINMENT FAILURE') return 'Fallo de contención ficticio: el Containment System permaneció inactivo durante la inestabilidad.';
      return 'Inestabilidad no resuelta: el reactor nunca fue estabilizado a tiempo.';
    }
  };
})(window.NCS = window.NCS || {});
