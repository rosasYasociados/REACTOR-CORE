/* REACTOR CONTROL PANEL: módulos ficticios siempre visibles, con interruptor, estado, fallos y animación. */
(function (N) {
  'use strict';
  var ICONS = {
    core: '<circle cx="12" cy="12" r="3.5" fill="currentColor"/><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="3 2.5"/>',
    cooling: '<path d="M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round"/>',
    shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" fill="none" stroke="currentColor" stroke-width="1.6"/>',
    stabilizer: '<path d="M2 12c3-8 5-8 8 0s5 8 8 0 3-6 4-4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',
    containment: '<path d="M12 2.5l8.5 5v9L12 21.5l-8.5-5v-9z" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.4"/>',
    energy: '<path d="M13 2L5 13h6l-1 9 9-12h-6z" fill="currentColor"/>'
  };
  var cards = {}, timers = {}, hlTimers = {}, onChange = null;

  // Refresca la tarjeta según el estado real (mods + faults); "label" fuerza un texto transitorio
  function paint(id, label) {
    var c = cards[id], on = N.Engine.mods[id], f = N.Engine.faults[id];
    c.el.classList.toggle('on', on);
    c.el.classList.toggle('fault', f && !label);
    c.sw.setAttribute('aria-checked', on);
    c.state.textContent = label || (f ? 'FAULT' : on ? 'ONLINE' : 'OFFLINE');
    c.lamp.className = 'lamp ' + (label ? 'warn' : f ? 'crit' : on ? 'ok' : '');
    c.fill.style.width = label ? '60%' : f ? '35%' : on ? '100%' : '0%';
    c.hint.hidden = !f || !!label;
    summary();
  }
  function summary() {
    var online = 0, faults = 0, total = 0;
    for (var id in cards) { total++; if (N.Engine.faults[id]) faults++; else if (N.Engine.mods[id]) online++; }
    document.getElementById('cpSummary').textContent = 'ONLINE ' + online + '/' + total + ' · FAULT ' + faults + (N.Engine.fail.controls ? ' · CONTROLS OFFLINE' : '');
  }
  // Control denegado mientras dura CONTROLS FAILURE
  function deny(id) { var el = cards[id].el; el.classList.remove('deny'); void el.offsetWidth; el.classList.add('deny'); N.Audio.play('wrong'); }
  function pulse(id) { var el = cards[id].el; el.classList.remove('act'); void el.offsetWidth; el.classList.add('act'); }

  N.Components = {
    locked: false,
    // Refleja CONTROLS FAILURE en la interfaz (aspecto bloqueado y resumen)
    syncLock: function () { document.body.classList.toggle('controls-off', !!N.Engine.fail.controls); summary(); },
    // true mientras algún módulo se está reiniciando (el jugador está actuando)
    busyAny: function () { for (var id in cards) if (cards[id].busy) return true; return false; },
    init: function (cb) {
      onChange = cb;
      var host = document.getElementById('modules');
      N.Engine.DEFS.forEach(function (d) {
        var el = document.createElement('article');
        el.className = 'mod on'; el.id = 'mod-' + d.id;
        el.innerHTML = '<div class="mod-top"><svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">' + ICONS[d.id] + '</svg>' +
          '<h3>' + d.name + '</h3><button class="sw" type="button" role="switch" aria-checked="true" aria-label="' + d.name + '"><i></i></button></div>' +
          '<p class="desc">' + d.desc + '</p><p class="hint" hidden>FALLO DETECTADO: pulsa el interruptor para reiniciar el módulo.</p>' +
          '<div class="mod-foot"><span class="lamp ok"></span><b class="ms mono">ONLINE</b><span class="bar"><i style="width:100%"></i></span></div>';
        host.appendChild(el);
        var c = cards[d.id] = { el: el, sw: el.querySelector('.sw'), state: el.querySelector('.ms'), hint: el.querySelector('.hint'),
          lamp: el.querySelector('.lamp'), fill: el.querySelector('.bar i'), name: d.name, busy: false };
        c.sw.addEventListener('click', function () {
          if (N.Engine.faults[d.id]) N.Components.repair(d.id); else N.Components.set(d.id, !N.Engine.mods[d.id], 'usuario');
        });
      });
      summary();
    },
    // ON/OFF manual (o del operador demo); devuelve true si hubo cambio
    set: function (id, on, src) {
      var c = cards[id];
      if (this.locked || c.busy || N.Engine.mods[id] === on) return false;
      if (N.Engine.fail.controls) { deny(id); return false; }
      N.Engine.mods[id] = on;
      paint(id, on ? 'STARTING' : 'STOPPING'); pulse(id);
      clearTimeout(timers[id]); timers[id] = setTimeout(function () { paint(id); }, 800);
      N.Dashboard.log(c.name + (on ? ' activado' : ' desactivado') + (src === 'demo' ? ' (operador demo)' : ''), on ? 'ok' : 'warn', 'MÓDULO');
      N.Audio.play(on ? 'moduleOn' : 'moduleOff');
      if (onChange) onChange(id, on);
      return true;
    },
    // Marca/limpia un fallo ficticio (lo usa Emergency al crear un evento)
    setFault: function (id, on) { N.Engine.faults[id] = on; paint(id); pulse(id); if (onChange) onChange(id, on); },
    // Reinicio manual del módulo con fallo: tarda ~1.2 s y solo entonces el fallo desaparece
    repair: function (id, src) {
      var c = cards[id];
      if (this.locked || c.busy || !N.Engine.faults[id]) return false;
      if (N.Engine.fail.controls) { deny(id); return false; }
      c.busy = true; paint(id, 'REBOOT'); pulse(id);
      N.Dashboard.log('Reiniciando ' + c.name + '…', 'info', 'MÓDULO');
      clearTimeout(timers[id]);
      timers[id] = setTimeout(function () {
        c.busy = false; N.Engine.faults[id] = false; N.Engine.mods[id] = true; paint(id);
        N.Dashboard.log(c.name + ' reparado' + (src === 'demo' ? ' (operador demo)' : '') + ': fallo corregido', 'ok', 'MÓDULO');
        N.Audio.play('repair');
        if (onChange) onChange(id, true);
      }, 1200);
      return true;
    },
    // Resalta una tarjeta (botón "IR AL CONTROL" del aviso)
    highlight: function (id) {
      var c = cards[id]; if (!c) return;
      c.el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      c.el.classList.add('hl'); clearTimeout(hlTimers[id]);
      hlTimers[id] = setTimeout(function () { c.el.classList.remove('hl'); }, 2600);
    },
    // Reinicio total: módulos ON, sin fallos, sin temporizadores pendientes
    reset: function () {
      for (var id in cards) {
        clearTimeout(timers[id]); clearTimeout(hlTimers[id]);
        cards[id].busy = false; cards[id].el.classList.remove('hl');
        N.Engine.mods[id] = true; N.Engine.faults[id] = false; paint(id);
      }
      this.locked = false;
    }
  };
})(window.NCS = window.NCS || {});
