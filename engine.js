/* Motor de simulación ficticio. Reglas abstractas de videojuego: NO usa fórmulas ni
   parámetros físicos reales. Los "puntos" y "ºS" son unidades inventadas.
   Nada aquí corrige un problema por sí solo: solo el jugador (o el operador del modo demo) puede hacerlo. */
(function (N) {
  'use strict';
  var RISK_LIMIT = 14;           // segundos ficticios de riesgo acumulado hasta el fallo

  var DEFS = [
    { id: 'core',        name: 'Core Module',        desc: 'Núcleo luminoso simulado. Si se apaga, todo queda en reposo.' },
    { id: 'cooling',     name: 'Cooling Module',     desc: 'Reduce el calor ficticio acumulado por el sistema.' },
    { id: 'shield',      name: 'Shielding Module',   desc: 'Contiene los RAD-POINTS ficticios de la cámara.' },
    { id: 'stabilizer',  name: 'Stabilizer',         desc: 'Mantiene estable la oscilación visual del núcleo.' },
    { id: 'containment', name: 'Containment System', desc: 'Última barrera del sistema simulado.' },
    { id: 'energy',      name: 'Energy Module',      desc: 'Eleva la salida de energía, a costa de más carga.' }
  ];
  var PEN = { core: 0, cooling: 14, shield: 14, stabilizer: 14, containment: 14, energy: 26 };   // penalización por fallo
  var mods = {}, faults = {};
  DEFS.forEach(function (d) { mods[d.id] = true; faults[d.id] = false; });

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function ease(cur, tgt, dt, rate) { return cur + (tgt - cur) * Math.min(1, dt * rate); }

  function create(demo) {
    return { mode: 'offline', state: 'OFFLINE', status: 'OFFLINE', temp: 0, energy: 0, particles: 0,
      stab: 100, rad: 0, risk: 0, runtime: 0, demo: !!demo };
  }

  // Un paso de simulación (dt en segundos de simulación)
  function step(sim, dt) {
    var m = {}, k, pen = 0, nf = 0;
    for (k in mods) { m[k] = mods[k] && !faults[k]; if (faults[k]) { pen += PEN[k]; nf++; } }   // un módulo con fallo cuenta como inactivo
    var on = m.core;
    sim.runtime += dt;

    // Reglas abstractas: cada módulo suma o resta "puntos"
    var heat = on ? 40 : 6, en = on ? 52 : 0, stab = 97, rad = on ? 10 : 2;
    if (on) {
      if (!m.cooling) { heat += 38; stab -= 28; }
      if (m.energy) { heat += 8; en += 38; rad += 6; }
      if (!m.stabilizer) { heat += 6; stab -= 26; }
      if (!m.containment) stab -= 12;
      if (!m.shield) stab -= 4;
      if (m.energy && !m.cooling) stab -= 10;
      if (m.energy && !m.stabilizer) stab -= 8;
      stab -= pen;
    }
    if (!m.shield) rad += 36;
    if (!m.containment) rad += 24;
    if (heat > 70) rad += 12;
    rad += (97 - stab) * 0.35 + (on ? nf * 4 : 0);

    var noise = on ? 1 : 0;
    sim.temp = clamp(ease(sim.temp, heat + 9 * Math.sin(sim.runtime / 7) * noise, dt, 1.1) + rnd(-0.4, 0.4) * noise, 0, 100);
    sim.energy = clamp(ease(sim.energy, en + 8 * Math.sin(sim.runtime / 5) * noise, dt, 1.2) + rnd(-0.6, 0.6) * noise, 0, 120);
    sim.stab = clamp(ease(sim.stab, stab, dt, 1.4) + rnd(-0.25, 0.25) * noise, 0, 100);
    sim.rad = clamp(ease(sim.rad, rad, dt, 1.0) + rnd(-0.5, 0.5) * noise, 0, 100);
    sim.particles = sim.energy * 38 + rnd(-40, 40) * noise;

    // Estado global según reglas de prioridad
    var s;
    if (!on) s = 'OFFLINE';
    else if (!m.containment && (sim.stab < 55 || sim.rad > 65)) s = 'CONTAINMENT FAILURE';
    else if (sim.stab < 32 || sim.temp > 91) s = 'EMERGENCY';
    else if (sim.rad >= 60) s = 'RADIATION ALERT';
    else if (sim.stab < 75) s = 'UNSTABLE';
    else s = 'STABLE';
    sim.state = s;

    // Riesgo sistémico: crece mientras haya inestabilidad y solo baja cuando el estado es estable
    var up = s === 'CONTAINMENT FAILURE' ? 1 : s === 'EMERGENCY' ? 0.6 : s === 'RADIATION ALERT' ? 0.3 : s === 'UNSTABLE' ? 0.25 : 0;
    sim.risk = clamp(sim.risk + (up ? up * dt : -1.2 * dt), 0, RISK_LIMIT);
  }

  function radLevel(v) { return v < 30 ? 'NORMAL' : v < 60 ? 'ELEVATED' : v < 85 ? 'HIGH' : 'CRITICAL'; }

  N.Engine = { DEFS: DEFS, mods: mods, faults: faults, RISK_LIMIT: RISK_LIMIT, create: create, step: step, radLevel: radLevel, rnd: rnd };
})(window.NCS = window.NCS || {});
