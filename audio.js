/* Efectos sonoros sintetizados (Web Audio API). Desactivado por defecto. */
(function (N) {
  'use strict';
  var ctx = null, on = false;

  // Un tono: frecuencia inicial/final, duración, tipo de onda, volumen, retardo
  function tone(f0, f1, dur, type, vol, delay) {
    var t = ctx.currentTime + (delay || 0);
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(ctx.destination);
    o.start(t); o.stop(t + dur + 0.05);
  }

  var SOUNDS = {
    start:  function () { tone(180, 720, 0.5, 'sawtooth', 0.08); tone(360, 1080, 0.5, 'sine', 0.06, 0.1); },
    stop:   function () { tone(720, 140, 0.55, 'sawtooth', 0.08); },
    notify: function () { tone(880, 880, 0.12, 'sine', 0.1); tone(1320, 1320, 0.18, 'sine', 0.1, 0.14); },
    alarm:  function () { for (var i = 0; i < 3; i++) tone(520, 380, 0.22, 'square', 0.07, i * 0.3); }
  };

  N.Audio = {
    isOn: function () { return on; },
    play: function (name) {
      if (!on || !ctx || !SOUNDS[name]) return;
      try { SOUNDS[name](); } catch (e) { /* audio no crítico */ }
    },
    // Activa/desactiva; debe llamarse desde un gesto del usuario
    toggle: function () {
      if (!on) {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return false;
        if (!ctx) ctx = new AC();
        if (ctx.state === 'suspended') ctx.resume();
        on = true; this.play('start');
      } else {
        this.play('stop'); on = false;
      }
      return on;
    }
  };
})(window.NCS = window.NCS || {});
