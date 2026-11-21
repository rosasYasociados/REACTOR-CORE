/* Orquestación: una única simulación ficticia conecta motor, módulos, emergencias, escenas y paneles.
   Modos de sim.mode: offline | running | paused | blackout (apagón + minijuego) | failed (game over). */
(function (N) {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var HUES = { cyan: 190, blue: 215, violet: 265 };
  var INFO = {
    'STABLE':              { lvl: 'NORMAL',   fx: 'STABLE',    cls: 'stable',    txt: 'Parámetros simulados estables' },
    'UNSTABLE':            { lvl: 'WARNING',  fx: 'UNSTABLE',  cls: 'unstable',  txt: 'Oscilación simulada detectada' },
    'RADIATION ALERT':     { lvl: 'WARNING',  fx: 'RADIATION', cls: 'radiation', txt: 'RAD-POINTS elevados' },
    'EMERGENCY':           { lvl: 'CRITICAL', fx: 'EMERGENCY', cls: 'emergency', txt: 'Emergencia visual de demostración' },
    'CONTAINMENT FAILURE': { lvl: 'CRITICAL', fx: 'FAILURE',   cls: 'failure',   txt: 'Fallo de contención simulado' },
    'OFFLINE':             { lvl: 'OFFLINE',  fx: 'OFFLINE',   cls: 'offline',   txt: 'Núcleo inactivo' }
  };
  var reactor, sim, pwrTid = 0, lastScene = '', last = 0, acc = 0, chartAcc = 0, theme = 'cyan', cata = null, blkTid = 0;

  // ---- Presentación coherente de la simulación ----
  function displayStatus() {
    return sim.mode === 'failed' ? 'SYSTEM FAILURE' : sim.mode === 'blackout' ? 'POWER FAILURE' :
      sim.mode === 'paused' ? 'STANDBY' : sim.mode === 'offline' ? 'OFFLINE' : sim.state;
  }
  // Escena sonora según modo y estado: ambiente continuo + alarma en bucle (solo se actualiza al cambiar)
  function audioScene() {
    var m = sim.mode, st = sim.state, sc;
    if (m === 'failed') sc = { amb: 'off', alarm: 'none' };
    else if (m === 'blackout') sc = { amb: 'off', alarm: 'blackout', fast: true };
    else if (m !== 'running' || st === 'OFFLINE') sc = { amb: 'idle', alarm: 'none' };
    else if (st === 'STABLE') sc = { amb: 'calm', alarm: 'none' };
    else sc = { amb: 'tense', alarm: st === 'UNSTABLE' ? 'unstable' : st === 'RADIATION ALERT' ? 'radiation' : st === 'EMERGENCY' ? 'emergency' : 'critical' };
    var key = sc.amb + sc.alarm; if (key === lastScene) return;
    lastScene = key; N.Audio.scene(sc);
  }
  function paintState() {
    var m = sim.mode, run = m === 'running', inf = INFO[run ? sim.state : 'OFFLINE'];
    if (m !== 'failed') document.body.setAttribute('data-state', inf.cls);
    N.Alarms.set(m === 'failed' || m === 'blackout' ? 'CRITICAL' : m === 'paused' ? 'OFFLINE' : inf.lvl, null, true);
    if (m !== 'failed') {
      var energy = run && sim.state !== 'OFFLINE' ? 0.3 + 0.7 * Math.min(1, sim.energy / 100) : m === 'paused' ? 0.22 : m === 'blackout' ? 0.03 : 0.06;
      reactor.setFx(inf.fx, energy);
    }
    reactor.themeHue = HUES[theme]; N.hue = HUES[theme];
    audioScene();
  }
  function render() { sim.status = displayStatus(); N.Dashboard.render(sim); N.Emergency.renderBanner(sim); }
  function buttons() {
    var m = sim.mode;
    $('btnStart').disabled = m !== 'offline';
    $('btnPause').disabled = m !== 'running';
    $('btnResume').disabled = m !== 'paused';
    $('btnDemo').disabled = m === 'failed' || m === 'blackout';
    $('onlineTxt').textContent = m === 'running' ? 'SIMULATION ONLINE' : m === 'paused' ? 'SIMULATION PAUSED' :
      m === 'blackout' ? 'POWER FAILURE' : m === 'failed' ? 'SYSTEM FAILURE' : 'SIMULATION IDLE';
    paintState();
  }

  function onStateChange(from, to) {
    var inf = INFO[to], serious = inf.lvl === 'WARNING' || inf.lvl === 'CRITICAL';
    N.Dashboard.log(from + ' → ' + to + ' — ' + inf.txt, inf.lvl === 'CRITICAL' ? 'crit' : serious ? 'warn' : to === 'STABLE' ? 'ok' : 'info', serious ? 'ALERTA' : 'ESTADO');
    N.Emergency.noteState(to);
    if (to === 'STABLE' && from !== 'OFFLINE') N.Audio.play('stable');
    else if (inf.lvl === 'CRITICAL') N.Audio.play('emergency');
    else if (inf.lvl === 'WARNING') N.Audio.play('warning');
  }

  // ---- Controles ----
  function start() {
    if (sim.mode !== 'offline') return;
    sim.mode = 'running'; sim.state = 'STABLE';
    N.Dashboard.log('Inicio de simulación', 'ok', 'SISTEMA'); N.Audio.play('start');
    N.Engine.step(sim, 0.25); acc = 0;
    onStateChange('OFFLINE', sim.state); buttons(); render();
  }
  function pause() {
    if (sim.mode !== 'running') return;
    sim.mode = 'paused'; N.Dashboard.log('Simulación en pausa', 'warn', 'SISTEMA'); N.Audio.play('stop'); buttons(); render();
  }
  function resume() {
    if (sim.mode !== 'paused') return;
    sim.mode = 'running'; acc = 0; N.Dashboard.log('Simulación reanudada', 'ok', 'SISTEMA'); N.Audio.play('start'); buttons(); render();
  }
  // Reinicio total: estados, módulos, contadores, escenas, temporizadores y alertas
  function reset() {
    var demo = sim.demo;
    clearTimeout(blkTid); blkTid = 0; cata = null;
    N.Minigame.close(); N.GameOver.hide(); $('powerFail').hidden = true; $('flash').style.opacity = 0;
    clearTimeout(pwrTid); pwrTid = 0; document.body.classList.remove('blackout', 'power-off', 'power-on');
    reactor.clearFx();
    N.Components.reset(); N.Emergency.reset();
    sim = N.Engine.create(demo); acc = 0; chartAcc = 0;
    N.Dashboard.log('Reinicio de simulación: módulos restaurados y alertas eliminadas', 'info', 'REINICIO'); N.Audio.play('stop');
    N.Dashboard.clearChart(); buttons(); render();
  }
  function restartGame() { reset(); start(); }        // botón REINICIAR de GAME OVER: nueva partida
  function toggleDemo() {
    sim.demo = !sim.demo;
    var b = $('btnDemo');
    b.setAttribute('aria-pressed', sim.demo); b.textContent = 'AUTO DEMO MODE: ' + (sim.demo ? 'ON' : 'OFF');
    N.Dashboard.log('Modo demostración ' + (sim.demo ? 'activado (operador automático, sin apagones)' : 'desactivado'), 'info', 'SISTEMA');
    if (sim.demo) { N.Emergency.kick(); if (sim.mode === 'offline') start(); }
  }

  // ---- Apagón + minijuego ----
  function startBlackout() {
    sim.mode = 'blackout'; N.Components.locked = true;
    document.body.classList.add('power-off'); $('powerFail').hidden = false;
    N.Dashboard.log('POWER FAILURE: apagón en la instalación. Iniciando ELECTRICAL EMERGENCY', 'crit', 'EMERGENCIA');
    N.Audio.play('blackout'); buttons(); render();
    clearTimeout(blkTid);
    blkTid = setTimeout(function () {
      blkTid = 0; $('powerFail').hidden = true;
      N.Minigame.open({ onWin: blackoutWin, onFail: function () { triggerCata('timeout'); } });
    }, 2600);
  }
  function blackoutWin() {
    document.body.classList.remove('power-off'); N.Components.locked = false;
    document.body.classList.add('power-on'); clearTimeout(pwrTid);           // encendido progresivo con parpadeo
    pwrTid = setTimeout(function () { pwrTid = 0; document.body.classList.remove('power-on'); }, 1900);
    N.Audio.play('restore');
    sim.mode = 'running'; acc = 0; N.Emergency.noteBlackoutEnd();
    N.Dashboard.log('POWER RESTORED: electricidad restablecida. El reactor sigue inestable: estabilízalo manualmente', 'warn', 'EMERGENCIA');
    buttons(); render();                                   // el estado NO cambia: no hay estabilización automática
  }

  // ---- Fallo final: cinemática breve en el dashboard y luego GAME OVER ----
  function triggerCata(reason) {
    if (sim.mode === 'failed') return;
    var cause = N.Emergency.describeCause(sim, reason);
    clearTimeout(blkTid); blkTid = 0; N.Minigame.close(); $('powerFail').hidden = true;
    document.body.classList.remove('power-off');
    sim.mode = 'failed'; sim.demo = false; N.Components.locked = true;
    $('btnDemo').setAttribute('aria-pressed', 'false'); $('btnDemo').textContent = 'AUTO DEMO MODE: OFF';
    cata = { t: 0, black: false, over: false, cause: cause };
    document.body.setAttribute('data-state', 'catastrophe');
    N.Dashboard.log('Fallo final de la simulación: ' + cause, 'crit', 'EVENTO');
    buttons(); render();                                   // la escena sonora 'failed' silencia ambiente y alarmas
  }
  function cataTick(dt) {
    cata.t += dt; var t = cata.t;
    if (!cata.boom && t > 0.25) { cata.boom = true; N.Audio.play('explosion'); }
    reactor.setFx('CATASTROPHE', t < 3 ? 1 : 0.05);
    $('flash').style.opacity = !reactor.vfx ? 0 : t < 0.4 ? t / 0.4 : Math.max(0, 1 - (t - 0.4) / 1.4);
    reactor.coreScale = t < 1.2 ? 1 + t * 0.9 : Math.max(0, 2.1 - (t - 1.2) * 0.8);
    if (t > 2 && !cata.black) { cata.black = true; document.body.classList.add('blackout'); }
    if (t > 3.2 && !cata.over) {
      cata.over = true; N.Audio.play('gameover'); var st = N.Emergency.stats();
      N.GameOver.show({ cause: cata.cause, time: sim.runtime, events: st.events, emergencies: st.emergencies });
    }
  }

  // ---- Bucle principal: el núcleo se dibuja siempre; los datos avanzan solo con la simulación en marcha ----
  function loop(ts) {
    var dt = Math.min(0.05, (ts - last) / 1000 || 0.016); last = ts;
    if (sim.mode === 'running') {
      acc += dt * reactor.speed; chartAcc += dt;
      if (acc >= 0.25) {
        var prev = sim.state, d = acc; acc = 0;
        N.Engine.step(sim, d); N.Emergency.update(sim, d);
        if (sim.mode === 'running') {                       // Emergency puede haber iniciado un apagón
          if (sim.state !== prev) onStateChange(prev, sim.state);
          if (sim.risk >= N.Engine.RISK_LIMIT) triggerCata('risk'); else { paintState(); render(); }
        }
      }
      if (chartAcc >= 0.5) { chartAcc = 0; if (sim.mode === 'running') N.Dashboard.pushChart(sim); }
    } else if (cata) cataTick(dt);
    reactor.frame(dt, ts / 1000);
    requestAnimationFrame(loop);
  }

  function init() {
    reactor = new N.Reactor($('core'));
    sim = N.Engine.create(false);
    N.Dashboard.init();
    N.Components.init(function () { if (sim.mode !== 'running') render(); });
    N.Emergency.init({ blackout: startBlackout });
    N.Minigame.init(); N.GameOver.init(restartGame);
    N.Dashboard.log('Sistema inicializado en modo local', 'info', 'SISTEMA');
    N.Alarms.set('OFFLINE', null, true); buttons(); render();

    $('btnStart').addEventListener('click', start);
    $('btnPause').addEventListener('click', pause);
    $('btnResume').addEventListener('click', resume);
    $('btnReset').addEventListener('click', reset);
    $('btnDemo').addEventListener('click', toggleDemo);

    // ---- Ajustes y preferencias (se guardan en localStorage) ----
    var S = N.Settings, d = S.load();
    function press(id, on, label) { var b = $(id); b.setAttribute('aria-pressed', on); b.textContent = label + (on ? 'ON' : 'OFF'); }
    function syncSound() {
      var on = N.Audio.isOn(); press('btnSound', on, 'SONIDO: ');
      $('btnSoundTop').setAttribute('aria-pressed', on); $('btnSoundTop').textContent = on ? '🔊' : '🔇';
    }
    function toggleSound() {
      var on = N.Audio.toggle(); syncSound();
      N.Dashboard.log('Sonido ' + (on ? 'activado' : 'desactivado'), 'info', 'SISTEMA');
    }
    function applyVfx() { document.body.classList.toggle('novfx', !S.get('vfx')); reactor.vfx = S.get('vfx'); press('btnVfx', S.get('vfx'), 'VISUAL EFFECTS: '); }
    function applyShake() { document.body.classList.toggle('noshake', !S.get('shake')); reactor.shakeOn = S.get('shake'); press('btnShake', S.get('shake'), 'SCREEN SHAKE: '); }
    var themeBtns = document.querySelectorAll('[data-theme].btn');
    function setTheme(name, announce) {
      theme = name; document.body.setAttribute('data-theme', name);
      Array.prototype.forEach.call(themeBtns, function (x) { x.classList.toggle('active', x.getAttribute('data-theme') === name); });
      paintState(); N.Dashboard.redrawChart(); S.set('theme', name);
      if (announce) { N.Dashboard.log('Modo visual: ' + name.toUpperCase(), 'info', 'SISTEMA'); N.Audio.play('notify'); }
    }
    // Sliders de volumen
    [['rMaster', 'oMaster', 'master'], ['rAmb', 'oAmb', 'ambient'], ['rAlm', 'oAlm', 'alarm']].forEach(function (c) {
      $(c[0]).value = d[c[2]]; $(c[1]).textContent = d[c[2]] + '%'; N.Audio.setVolume(c[2], d[c[2]]);
      $(c[0]).addEventListener('input', function (e) { var v = +e.target.value; $(c[1]).textContent = v + '%'; N.Audio.setVolume(c[2], v); S.set(c[2], v); });
    });
    // Intensidad, velocidad y probabilidad de apagón
    $('rInt').value = d.intensity; $('oInt').textContent = d.intensity + '%'; reactor.intensity = d.intensity / 100;
    $('rInt').addEventListener('input', function (e) { reactor.intensity = e.target.value / 100; $('oInt').textContent = e.target.value + '%'; S.set('intensity', +e.target.value); });
    $('rSpd').value = d.speed; $('oSpd').textContent = (d.speed / 100).toFixed(1) + 'x'; reactor.speed = d.speed / 100;
    $('rSpd').addEventListener('input', function (e) { reactor.speed = e.target.value / 100; $('oSpd').textContent = (e.target.value / 100).toFixed(1) + 'x'; S.set('speed', +e.target.value); });
    $('rBlk').value = d.blackout; $('oBlk').textContent = d.blackout + '%'; N.Emergency.setBlackoutPct(d.blackout);
    $('rBlk').addEventListener('input', function (e) { N.Emergency.setBlackoutPct(+e.target.value); $('oBlk').textContent = e.target.value + '%'; S.set('blackout', +e.target.value); });
    // Interruptores de ajustes
    N.Audio.setSfx(d.sfx); press('btnSfx', d.sfx, 'SOUND EFFECTS: ');
    $('btnSfx').addEventListener('click', function () { var v = !S.get('sfx'); S.set('sfx', v); N.Audio.setSfx(v); press('btnSfx', v, 'SOUND EFFECTS: '); });
    applyVfx(); $('btnVfx').addEventListener('click', function () { S.set('vfx', !S.get('vfx')); applyVfx(); });
    applyShake(); $('btnShake').addEventListener('click', function () { S.set('shake', !S.get('shake')); applyShake(); });
    $('btnSound').addEventListener('click', toggleSound); $('btnSoundTop').addEventListener('click', toggleSound);
    Array.prototype.forEach.call(themeBtns, function (b) { b.addEventListener('click', function () { setTheme(b.getAttribute('data-theme'), true); }); });
    setTheme(d.theme, false);
    $('btnSettings').addEventListener('click', function () {
      var p = $('settings'), open = p.hidden;
      p.hidden = !open; this.setAttribute('aria-expanded', open);
    });
    // Clic genérico de botones (cede ante los sonidos propios de cada acción)
    document.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('button');
      if (b && !b.classList.contains('sw') && !b.classList.contains('tg')) N.Audio.play('click');
    });

    requestAnimationFrame(function (ts) { last = ts; loop(ts); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})(window.NCS = window.NCS || {});
