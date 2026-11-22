/* Preferencias del usuario guardadas en localStorage (si no está disponible, funciona igual sin guardar). */
(function (N) {
  'use strict';
  var KEY = 'ncs-settings-v1', tid = 0, data = {};
  var DEF = { master: 70, ambient: 50, alarm: 80, sfx: true, vfx: true, shake: true, theme: 'cyan', intensity: 100, speed: 100, blackout: 15 };
  var THEMES = ['cyan', 'blue', 'violet'];

  function save() { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* almacenamiento no disponible */ } }

  N.Settings = {
    DEF: DEF,
    load: function () {
      var o = {};
      try { o = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { o = {}; }
      for (var k in DEF) data[k] = typeof o[k] === typeof DEF[k] ? o[k] : DEF[k];
      ['master', 'ambient', 'alarm', 'blackout'].forEach(function (k) { data[k] = Math.max(0, Math.min(100, data[k])); });
      data.intensity = Math.max(30, Math.min(150, data.intensity)); data.speed = Math.max(50, Math.min(300, data.speed));
      if (THEMES.indexOf(data.theme) < 0) data.theme = DEF.theme;
      return data;
    },
    get: function (k) { return data[k]; },
    // Guarda con un pequeño retraso para no escribir en cada movimiento de un slider
    set: function (k, v) { data[k] = v; clearTimeout(tid); tid = setTimeout(save, 250); }
  };
})(window.NCS = window.NCS || {});
