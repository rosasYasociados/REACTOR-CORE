/* Alarmas visuales de demostración (no representan umbrales reales). */
(function (N) {
  'use strict';
  var STATES = {
    NORMAL:   { cls: 'ok',   log: 'ok',   hue: null, desc: 'Todos los sistemas simulados estables.', sound: null },
    WARNING:  { cls: 'warn', log: 'warn', hue: 45,   desc: 'Fluctuación simulada detectada. Solo demostración.', sound: 'notify' },
    CRITICAL: { cls: 'crit', log: 'crit', hue: 0,    desc: 'Alerta visual máxima de demostración.', sound: 'alarm' },
    OFFLINE:  { cls: 'off',  log: 'info', hue: 215,  desc: 'Simulación detenida.', sound: null }
  };
  var cur = null;

  N.Alarms = {
    STATES: STATES,
    get current() { return cur; },
    // Cambia el estado: actualiza indicador, texto, sonido y registro de eventos
    set: function (key, reason, silent) {
      if (key === cur || !STATES[key]) return;
      cur = key;
      var s = STATES[key], d = document;
      d.body.setAttribute('data-alarm', s.cls);
      d.getElementById('alarmLamp').className = 'lamp big';
      d.getElementById('alarmText').textContent = key;
      d.getElementById('alarmDesc').textContent = s.desc;
      if (N.Dashboard && !silent) N.Dashboard.log('Estado: ' + key + (reason ? ' — ' + reason : ''), s.log, 'ESTADO');
    }
  };
})(window.NCS = window.NCS || {});
