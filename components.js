/* Panel REACTOR COMPONENTS: módulos ficticios con interruptor, estado y animación. */
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
  var cards = {}, timers = {}, onChange = null;

  function paint(id, label) {
    var c = cards[id], on = N.Engine.mods[id];
    c.el.classList.toggle('on', on);
    c.sw.setAttribute('aria-checked', on);
    c.state.textContent = label || (on ? 'ONLINE' : 'OFFLINE');
    c.lamp.className = 'lamp ' + (label ? 'warn' : on ? 'ok' : '');
    c.fill.style.width = on && !label ? '100%' : label && on ? '60%' : '0%';
  }

  N.Components = {
    locked: false,
    init: function (cb) {
      onChange = cb;
      var host = document.getElementById('modules');
      N.Engine.DEFS.forEach(function (d) {
        var el = document.createElement('article');
        el.className = 'mod on';
        el.innerHTML = '<div class="mod-top"><svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">' + ICONS[d.id] + '</svg>' +
          '<h3>' + d.name + '</h3><button class="sw" role="switch" aria-checked="true" aria-label="' + d.name + '"><i></i></button></div>' +
          '<p class="desc">' + d.desc + '</p>' +
          '<div class="mod-foot"><span class="lamp ok"></span><b class="ms mono">ONLINE</b><span class="bar"><i style="width:100%"></i></span></div>';
        host.appendChild(el);
        var c = cards[d.id] = { el: el, sw: el.querySelector('.sw'), state: el.querySelector('.ms'),
          lamp: el.querySelector('.lamp'), fill: el.querySelector('.bar i'), name: d.name };
        c.sw.addEventListener('click', function () { N.Components.set(d.id, !N.Engine.mods[d.id], 'usuario'); });
      });
    },
    // Cambia un módulo (origen: 'usuario' o 'demo'); devuelve true si hubo cambio
    set: function (id, on, src) {
      if (this.locked || N.Engine.mods[id] === on) return false;
      N.Engine.mods[id] = on;
      var c = cards[id];
      paint(id, on ? 'STARTING' : 'STOPPING');
      c.el.classList.remove('act'); void c.el.offsetWidth; c.el.classList.add('act');   // reinicia la animación
      clearTimeout(timers[id]);
      timers[id] = setTimeout(function () { paint(id); }, 800);
      N.Dashboard.log(c.name + (on ? ' activado' : ' desactivado') + (src === 'demo' ? ' (demo)' : ''), on ? 'ok' : 'warn', 'MÓDULO');
      N.Audio.play(on ? 'start' : 'stop');
      if (onChange) onChange(id, on);
      return true;
    },
    // Restaura todos los módulos (reinicio) sin registrar uno por uno
    reset: function () {
      for (var id in cards) { clearTimeout(timers[id]); N.Engine.mods[id] = true; paint(id); }
      this.locked = false;
    }
  };
})(window.NCS = window.NCS || {});
