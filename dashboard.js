/* Paneles de estado, instrumentación, reloj y registro de eventos. */
(function (N) {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var gT, gE, gS, chart, logEl;

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function hms(s) { s = Math.floor(s); return pad(Math.floor(s / 3600)) + ':' + pad(Math.floor(s / 60) % 60) + ':' + pad(s % 60); }
  function themeColor() { return 'hsl(' + (N.hue || 190) + ',100%,60%)'; }

  N.Dashboard = {
    init: function () {
      logEl = $('log');
      gT = new N.Charts.Gauge($('gTemp'), 'TEMP', '', 100);
      gE = new N.Charts.Gauge($('gEnergy'), 'ENERGY', '%', 100);
      gS = new N.Charts.Gauge($('gStab'), 'STABILITY', '%', 100);
      chart = new N.Charts.Line($('chart'), [themeColor, '#3dffb0', '#ffc83d'], 40);
      var clock = $('clock');
      var tick = function () { var d = new Date(); clock.textContent = pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds()); };
      tick(); setInterval(tick, 1000);
      this.render({ status: 'OFFLINE', temp: 0, energy: 0, particles: 0, stab: 100, runtime: 0 });
    },

    // Añade una entrada al registro (más reciente arriba, máximo 80)
    log: function (msg, type) {
      if (!logEl) return;
      var d = new Date(), li = document.createElement('li');
      li.className = type || 'info';
      var t = document.createElement('time'); t.textContent = pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
      var s = document.createElement('span'); s.textContent = msg;
      li.appendChild(t); li.appendChild(s);
      logEl.insertBefore(li, logEl.firstChild);
      while (logEl.children.length > 80) logEl.removeChild(logEl.lastChild);
    },

    // Actualiza todos los valores visibles
    render: function (s) {
      $('vStatus').textContent = s.status;
      $('vTemp').textContent = s.temp.toFixed(1) + ' ºS';
      $('vEnergy').textContent = s.energy.toFixed(1) + ' MSU';
      $('vParticles').textContent = Math.round(s.particles).toLocaleString('en-US');
      $('vStability').textContent = s.stab.toFixed(1) + ' %';
      $('vRuntime').textContent = hms(s.runtime);
      $('coreTag').textContent = 'CORE ' + s.status;
      gT.set(s.temp); gE.set(s.energy / 1.2); gS.set(s.stab);
      var load = Math.min(100, s.energy / 1.2);
      $('bField').style.width = s.stab + '%';
      $('bLoad').style.width = load + '%';
      $('bLink').style.width = (s.status === 'OFFLINE' ? 0 : 92 + Math.sin(s.runtime) * 6) + '%';
      var on = s.status !== 'OFFLINE';
      var states = [
        on ? (s.temp > 75 ? 'warn' : 'ok') : '', on ? (s.energy > 95 ? 'warn' : 'ok') : '',
        on ? (s.stab < 72 ? 'warn' : 'ok') : '', on ? (s.stab < 45 ? 'crit' : 'ok') : '',
        on ? 'ok' : '', on ? (s.stab < 45 ? 'warn' : 'ok') : ''
      ];
      for (var i = 0; i < 6; i++) $('l' + i).className = 'lamp ' + states[i];
    },

    pushChart: function (s) { chart.push([s.temp, Math.min(100, s.energy / 1.2), s.stab]); },
    clearChart: function () { chart.clear(); },
    redrawChart: function () { chart.draw(); }
  };
})(window.NCS = window.NCS || {});
