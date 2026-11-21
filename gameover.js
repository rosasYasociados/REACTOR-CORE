/* Pantalla independiente de GAME OVER (animación en CSS; no usa temporizadores propios). */
(function (N) {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  function hms(s) {
    s = Math.floor(s); var p = function (n) { return (n < 10 ? '0' : '') + n; };
    return p(Math.floor(s / 3600)) + ':' + p(Math.floor(s / 60) % 60) + ':' + p(s % 60);
  }
  N.GameOver = {
    init: function (onRestart) {
      $('btnRestart').addEventListener('click', onRestart);
      var em = $('embers');                                   // partículas (brasas) generadas una sola vez
      for (var i = 0; i < 16; i++) {
        var p = document.createElement('i');
        p.style.setProperty('--x', (Math.random() * 100).toFixed(0) + '%'); p.style.setProperty('--d', (Math.random() * 6).toFixed(1) + 's');
        p.style.setProperty('--s', (2 + Math.random() * 3).toFixed(1) + 'px'); em.appendChild(p);
      }
    },
    // info: { cause, time (s), events, emergencies }
    show: function (info) {
      var el = $('sceneOver');
      $('goCause').textContent = info.cause;
      $('goTime').textContent = hms(info.time);
      $('goEvents').textContent = info.events;
      $('goEmerg').textContent = info.emergencies;
      el.hidden = false; el.classList.remove('play'); void el.offsetWidth; el.classList.add('play');   // reinicia la animación
      $('btnRestart').focus();
    },
    hide: function () { var el = $('sceneOver'); el.hidden = true; el.classList.remove('play'); }
  };
})(window.NCS = window.NCS || {});
