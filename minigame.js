/* ELECTRICAL EMERGENCY: caja eléctrica, patrón de interruptores y cuenta atrás (15–20 s).
   Un único temporizador (setInterval) que se detiene al ganar, perder o cerrar la escena. */
(function (N) {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var SW = 6;
  var scene, box, tid = 0, winTid = 0, deadline = 0, total = 0, hiddenAt = 0;
  var lastSec = 0, opened = false, done = false, state = [], target = [], cb = null;

  function matches() { var n = 0; for (var i = 0; i < SW; i++) if (state[i] === target[i]) n++; return n; }
  function count(a) { return a.filter(Boolean).length; }

  function makePattern() {
    do { target = []; for (var i = 0; i < SW; i++) target.push(Math.random() < 0.5); } while (count(target) < 2 || count(target) > 4);
    do { state = target.map(function (v) { return Math.random() < 0.5 ? v : !v; }); } while (matches() > SW - 3);   // al menos 3 por corregir
  }
  function paint() {
    var t = $('miniTarget'), s = $('miniSwitches'), i, n = matches();
    t.innerHTML = ''; s.innerHTML = '';
    for (i = 0; i < SW; i++) {
      var led = document.createElement('span'); led.className = target[i] ? 'on' : ''; t.appendChild(led);
      var b = document.createElement('button'); b.type = 'button'; b.className = 'tg' + (state[i] === target[i] ? ' ok' : '');
      b.setAttribute('aria-pressed', state[i]); b.setAttribute('aria-label', 'Interruptor ' + (i + 1)); b.dataset.i = i;
      b.innerHTML = '<i></i><small>' + (i + 1) + '</small>'; s.appendChild(b);
    }
    $('miniProg').textContent = n + '/' + SW;
    $('miniProgBar').style.width = (n / SW * 100) + '%';
  }
  function stopTimers() { clearInterval(tid); clearTimeout(winTid); tid = 0; winTid = 0; }

  function tick() {
    var rem = Math.max(0, (deadline - performance.now()) / 1000);
    var sec = Math.ceil(rem); if (sec !== lastSec) { lastSec = sec; N.Audio.countdown(sec); }   // un tic por segundo
    $('miniSub').textContent = 'You have ' + Math.ceil(rem) + ' seconds before the reactor explodes!';
    $('miniCount').textContent = Math.ceil(rem);
    $('miniTime').style.width = (rem / total * 100) + '%';
    if (rem <= 0) fail();
  }
  function openBox() {
    if (opened || done) return;
    opened = true; lastSec = 0; N.Audio.play('boxOpen'); scene.classList.add('open'); box.removeAttribute('role'); box.removeAttribute('tabindex'); box.style.cursor = 'default';
    total = Math.floor(15 + Math.random() * 6);              // entero aleatorio entre 15 y 20
    deadline = performance.now() + total * 1000;
    $('miniTitle').textContent = 'RESTORE THE POWER!';
    $('miniCount').hidden = false; $('miniTimeWrap').hidden = false;
    stopTimers(); tid = setInterval(tick, 100); tick();
    N.Dashboard.log('ELECTRICAL EMERGENCY: caja abierta, ' + total + ' s para reproducir el patrón', 'warn', 'EMERGENCIA');
  }
  function win() {
    done = true; stopTimers();                                 // la cuenta atrás se detiene aquí
    $('miniMsg').hidden = false; N.Audio.play('win');
    winTid = setTimeout(function () { var f = cb; N.Minigame.close(); if (f) f.onWin(); }, 1800);
  }
  function fail() {
    stopTimers(); var f = cb; N.Minigame.close(); if (f) f.onFail();
  }

  N.Minigame = {
    init: function () {
      scene = $('sceneMini'); box = $('fuseBox');
      box.addEventListener('click', openBox);
      box.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openBox(); } });
      $('miniSwitches').addEventListener('click', function (e) {
        var b = e.target.closest('.tg'); if (!b || !opened || done) return;
        var i = +b.dataset.i; state[i] = !state[i]; N.Audio.play('toggle'); paint();
        if (matches() === SW) win();
      });
      // Si la pestaña se oculta, el tiempo no corre
      document.addEventListener('visibilitychange', function () {
        if (!tid) return;
        if (document.hidden) hiddenAt = performance.now(); else deadline += performance.now() - hiddenAt;
      });
    },
    get isOpen() { return !scene.hidden; },
    // Abre la escena; callbacks: { onWin, onFail }
    open: function (callbacks) {
      stopTimers(); cb = callbacks; opened = false; done = false;
      scene.classList.remove('open'); box.setAttribute('role', 'button'); box.setAttribute('tabindex', '0'); box.style.cursor = '';
      $('miniTitle').textContent = 'RESTORE THE POWER';
      $('miniSub').textContent = 'Haz clic en la caja eléctrica para abrirla.';
      $('miniCount').hidden = true; $('miniTimeWrap').hidden = true; $('miniMsg').hidden = true;
      makePattern(); paint(); scene.hidden = false; box.focus();
    },
    // Cierra la escena y detiene cualquier temporizador (reinicio, éxito o derrota)
    close: function () { stopTimers(); cb = null; opened = false; done = false; if (scene) scene.hidden = true; }
  };
})(window.NCS = window.NCS || {});
