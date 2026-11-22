/* Escena independiente que aloja los minijuegos de N.RepairGames. Dos modos:
   - 'failure': la cuenta atrás es el temporizador de la falla (Failures); si se agota, la falla sigue y se puede reintentar.
   - 'timed'  : cuenta atrás propia en tiempo real (apagones); si se agota se llama a onFail. Un único temporizador por escena,
                aunque el minijuego tenga varias fases (p. ej. los 3 escenarios de energía externa).
   Un único bucle rAF; todo se detiene al cerrar. */
(function (N) {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var scene, body, cur = null, game = null, raf = 0, endTid = 0, last = 0, over = false, lastSec = -1, mode = 'failure', timed = null;

  function setProg(p) { p = Math.max(0, Math.min(1, p)); $('rpProg').textContent = Math.round(p * 100) + '%'; $('rpProgBar').style.width = (p * 100) + '%'; }
  function showResult(ok, text) {
    var r = $('rpResult'); r.hidden = false; r.className = 'rp-result mono ' + (ok ? 'ok' : 'fail'); r.textContent = text;
  }
  function stopLoop() { cancelAnimationFrame(raf); raf = 0; }
  function destroyGame() { if (game && game.destroy) { game.destroy(); game.destroy = null; } }
  function tickTimed() {
    var rem = Math.max(0, (timed.deadline - performance.now()) / 1000), sec = Math.ceil(rem);
    $('rpCount').textContent = sec; $('rpTime').style.width = (rem / timed.total * 100) + '%';
    if (sec !== lastSec) { lastSec = sec; if (sec <= 10) N.Audio.countdown(sec); }
    if (rem <= 0) { var cb = timed.cb; N.Repair.close(); if (cb && cb.onFail) cb.onFail(); }     // derrota: el llamador aplica la consecuencia
  }
  function loop(ts) {
    var dt = Math.min(0.25, (ts - last) / 1000 || 0); last = ts;
    if (timed && !over) tickTimed();
    if (cur && game && game.frame && !over) game.frame(dt);
    if (cur) raf = requestAnimationFrame(loop);
  }
  function teardown() {
    stopLoop(); clearTimeout(endTid); endTid = 0; destroyGame();
    game = null; if (body) body.innerHTML = '';
  }
  function win() {
    if (over) return; over = true; stopLoop();
    var def = N.RepairGames[cur];
    showResult(true, def.winText || 'REPARACIÓN COMPLETA'); N.Audio.play('win');
    destroyGame();                                              // detiene sonidos (agua, motor...)
    if (mode === 'timed') {
      var cb = timed.cb; endTid = setTimeout(function () { N.Repair.close(); if (cb && cb.onWin) cb.onWin(); }, 1700);
    } else {
      N.Failures.repaired(cur);                                 // la falla se resuelve y el dashboard se actualiza
      endTid = setTimeout(function () { N.Repair.close(); }, 1500);
    }
  }
  function begin(id, m) {
    var def = N.RepairGames[id];
    teardown(); cur = id; mode = m; over = false; lastSec = -1;
    scene.hidden = false; $('rpResult').hidden = true; $('rpRetry').hidden = true; $('rpClose').hidden = m === 'timed';
    $('rpTitle').textContent = def.title; $('rpSub').textContent = def.sub; setProg(0);
    return def;
  }
  function start(def) {
    game = def.make(body, { prog: setProg, win: win });
    last = performance.now(); raf = requestAnimationFrame(loop);
    N.Audio.play('boxOpen');
  }

  N.Repair = {
    init: function () {
      scene = $('sceneRepair'); body = $('rpBody');
      $('rpClose').addEventListener('click', function () { N.Repair.close(); });
      $('rpRetry').addEventListener('click', function () { if (cur) N.Repair.open(cur); });
      // Pestaña oculta: el tiempo del modo cronometrado no corre
      var hiddenAt = 0;
      document.addEventListener('visibilitychange', function () {
        if (!timed) return;
        if (document.hidden) hiddenAt = performance.now(); else timed.deadline += performance.now() - hiddenAt;
      });
    },
    isOpen: function () { return !!cur; },
    openId: function () { return cur; },
    // Reparación de una falla (temporizador de la falla)
    open: function (id) {
      var f = N.Failures.get(id);
      if (!N.RepairGames[id] || !f) return;
      timed = null; var def = begin(id, 'failure');
      $('rpTag').textContent = 'REPAIR · ' + id.toUpperCase();
      N.Repair.sync(f); start(def);
    },
    // Minijuego de emergencia con cuenta atrás propia: cb = { onWin, onFail }
    openTimed: function (id, seconds, cb) {
      if (!N.RepairGames[id]) return;
      var def = begin(id, 'timed');
      timed = { deadline: performance.now() + seconds * 1000, total: seconds, cb: cb };
      $('rpTag').textContent = 'EMERGENCY · ' + id.toUpperCase();
      tickTimed(); start(def);
    },
    // Sincroniza la cuenta atrás con el temporizador de la falla
    sync: function (f) {
      if (!cur || mode !== 'failure') return;
      var rem = Math.max(0, f.left), sec = Math.ceil(rem);
      $('rpCount').textContent = sec; $('rpTime').style.width = (rem / f.limit * 100) + '%';
      if (sec !== lastSec) { lastSec = sec; if (sec <= 10 && !over) N.Audio.countdown(sec); }
    },
    // El plazo de la falla terminó mientras se reparaba: la falla sigue y se puede reintentar
    timeUp: function () {
      if (!cur || over || mode !== 'failure') return;
      over = true; stopLoop(); destroyGame();
      showResult(false, 'REPARACIÓN FALLIDA'); $('rpSub').textContent = 'Se agotó el tiempo: la falla continúa y la emergencia aumenta.';
      $('rpRetry').hidden = false;
    },
    close: function () { teardown(); cur = null; timed = null; over = false; if (scene) scene.hidden = true; }
  };
  N.RepairGames = N.RepairGames || {};
})(window.NCS = window.NCS || {});
