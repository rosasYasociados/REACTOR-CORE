/* Motor de simulación ficticio. Reglas abstractas de videojuego: NO usa fórmulas ni
   parámetros físicos reales. Los "puntos" y "ºS" son unidades inventadas. */
(function (N) {
  'use strict';
  var RISK_LIMIT = 14;           // segundos ficticios de riesgo acumulado hasta el evento final

  var DEFS = [
    { id: 'core',        name: 'Core Module',        desc: 'Núcleo luminoso simulado. Si se apaga, todo queda en reposo.' },
    { id: 'cooling',     name: 'Cooling Module',     desc: 'Reduce el calor ficticio acumulado por el sistema.' },
    { id: 'shield',      name: 'Shielding Module',   desc: 'Contiene los RAD-POINTS ficticios de la cámara.' },
    { id: 'stabilizer',  name: 'Stabilizer',         desc: 'Mantiene estable la oscilación visual del núcleo.' },
    { id: 'containment', name: 'Containment System', desc: 'Última barrera del sistema simulado.' },
    { id: 'energy',      name: 'Energy Module',      desc: 'Eleva la salida de energía, a costa de más carga.' }
  ];
  var mods = {};
  DEFS.forEach(function (d) { mods[d.id] = true; });

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function ease(cur, tgt, dt, rate) { return cur + (tgt - cur) * Math.min(1, dt * rate); }

  function create(demo) {
    return { mode: 'offline', state: 'OFFLINE', status: 'OFFLINE', temp: 0, energy: 0, particles: 0,
      stab: 100, rad: 0, risk: 0, runtime: 0, disturb: 0, recover: 0, nextEvent: 18,
      demo: !!demo, demoT: 8, restore: [] };
  }

  // Un paso de simulación (dt en segundos de simulación)
  function step(sim, dt) {
    var m = mods, on = m.core;
    sim.runtime += dt;

    // Perturbaciones ficticias ocasionales (más fuertes en modo demo)
    if (sim.recover > 0) { sim.recover -= dt; if (sim.recover <= 0) sim.disturb = 0; }
    else if (on) {
      sim.nextEvent -= dt;
      if (sim.nextEvent <= 0) {
        sim.disturb = sim.demo ? rnd(20, 36) : rnd(12, 24);
        sim.recover = rnd(5, 8);
        sim.nextEvent = sim.demo ? rnd(18, 28) : rnd(35, 60);
      }
    }

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
      stab -= sim.disturb;
    }
    if (!m.shield) rad += 36;
    if (!m.containment) rad += 24;
    if (heat > 70) rad += 12;
    rad += (97 - stab) * 0.35;

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

    // Riesgo sistémico: se acumula en estados graves y se recupera en los demás
    var up = s === 'CONTAINMENT FAILURE' ? 1 : s === 'EMERGENCY' ? 0.6 : s === 'RADIATION ALERT' ? 0.15 : 0;
    sim.risk = clamp(sim.risk + (up ? up * dt : -1.2 * dt), 0, RISK_LIMIT);
  }

  function radLevel(v) { return v < 30 ? 'NORMAL' : v < 60 ? 'ELEVATED' : v < 85 ? 'HIGH' : 'CRITICAL'; }

  N.Engine = { DEFS: DEFS, mods: mods, RISK_LIMIT: RISK_LIMIT, create: create, step: step, radLevel: radLevel, rnd: rnd };
})(window.NCS = window.NCS || {});
