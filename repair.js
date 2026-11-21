/* Escena independiente de reparación: una sola interfaz que aloja los minijuegos de N.RepairGames.
   Un único bucle rAF (solo si el minijuego lo necesita) y un único temporizador de cierre; se detiene todo al cerrar. */
(function (N) {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var scene, body, cur = null, game = null, raf = 0, endTid = 0, last = 0, over = false, lastSec = -1;

  function setProg(p) { p = Math.max(0, Math.min(1, p)); $('rpProg').textContent = Math.round(p * 100) + '%'; $('rpProgBar').style.width = (p * 100) + '%'; }
  function showResult(ok, text) {
    var r = $('rpResult'); r.hidden = false; r.className = 'rp-result mono ' + (ok ? 'ok' : 'fail'); r.textContent = text;
  }
  function stopLoop() { cancelAnimationFrame(raf); raf = 0; }
  function loop(ts) {
    var dt = Math.min(0.25, (ts - last) / 1000 || 0); last = ts;   // sigue el tiempo real aunque el equipo vaya lento
    if (game && game.frame && !over) game.frame(dt);
    raf = requestAnimationFrame(loop);
  }
  function teardown() {
    stopLoop(); clearTimeout(endTid); endTid = 0;
    if (game && game.destroy) game.destroy();
    game = null; if (body) body.innerHTML = '';
  }
  function win() {
    if (over) return; over = true; stopLoop();
    showResult(true, 'REPARACIÓN COMPLETA'); N.Audio.play('win');
    if (game && game.destroy) { game.destroy(); game.destroy = null; }   // detiene el agua
    var id = cur; N.Failures.repaired(id);                      // la falla se resuelve y el dashboard se actualiza
    endTid = setTimeout(function () { N.Repair.close(); }, 1500);
  }

  N.Repair = {
    init: function () {
      scene = $('sceneRepair'); body = $('rpBody');
      $('rpClose').addEventListener('click', function () { N.Repair.close(); });
      $('rpRetry').addEventListener('click', function () { if (cur) N.Repair.open(cur); });
    },
    isOpen: function () { return !!cur; },
    openId: function () { return cur; },
    open: function (id) {
      var def = N.RepairGames[id], f = N.Failures.get(id);
      if (!def || !f) return;
      teardown();
      cur = id; over = false; lastSec = -1;
      scene.hidden = false; $('rpResult').hidden = true; $('rpRetry').hidden = true;
      $('rpTag').textContent = 'REPAIR · ' + id.toUpperCase(); $('rpTitle').textContent = def.title; $('rpSub').textContent = def.sub;
      setProg(0); N.Repair.sync(f);
      game = def.make(body, { prog: setProg, win: win });
      if (game.frame) { last = performance.now(); raf = requestAnimationFrame(loop); }
      N.Audio.play('boxOpen');
    },
    // Sincroniza la cuenta atrás con el temporizador de la falla
    sync: function (f) {
      if (!cur) return;
      var rem = Math.max(0, f.left), sec = Math.ceil(rem);
      $('rpCount').textContent = sec; $('rpTime').style.width = (rem / f.limit * 100) + '%';
      if (sec !== lastSec) { lastSec = sec; if (sec <= 10 && !over) N.Audio.countdown(sec); }
    },
    // El plazo de la falla terminó mientras se reparaba: derrota, la falla sigue y se puede reintentar
    timeUp: function () {
      if (!cur || over) return;
      over = true; stopLoop();
      if (game && game.destroy) { game.destroy(); game.destroy = null; }
      showResult(false, 'REPARACIÓN FALLIDA'); $('rpSub').textContent = 'Se agotó el tiempo: la falla continúa y la emergencia aumenta.';
      $('rpRetry').hidden = false;
    },
    close: function () { teardown(); cur = null; over = false; if (scene) scene.hidden = true; }
  };
  N.RepairGames = N.RepairGames || {};
})(window.NCS = window.NCS || {});
