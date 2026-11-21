# NUCLEAR CORE SIMULATOR

Simulación visual, educativa y **ficticia** de una instalación nuclear futurista. No modela ni representa procedimientos, parámetros ni controles de reactores reales.

HTML5 + CSS3 + JavaScript vanilla + Canvas + SVG + Web Audio. Sin dependencias, CDNs ni conexión a internet.

## Archivos

```
nuclear-core-simulator/
├── index.html     versión autosuficiente (CSS y JS incrustados): ábrela sola y funciona
├── build.py       (opcional) regenera index.html desde src/
├── src/           código modular
│   ├── index.html
│   ├── css/style.css
│   └── js/  settings · audio · alarms · charts · engine · reactor · components · dashboard
│            emergency · minigame · gameover · main
└── README.md
```

El `index.html` de la raíz no depende de carpetas ni de rutas: se puede copiar solo a cualquier sitio. Si editas `src/`, ejecuta `python3 build.py` para regenerarlo.
Los scripts usan el namespace `window.NCS` para funcionar con `file://`.

## Ejecutar en local

Abre `index.html` con doble clic en un navegador moderno. No hace falta servidor.

## Publicar en GitHub Pages

1. Sube `index.html` (y el resto si quieres) a la raíz del repositorio.
2. En **Settings → Pages**, elige la rama `main` y la carpeta `/ (root)`.

## Cómo se juega

- **REACTOR CONTROL PANEL** (siempre visible arriba): interruptor ON/OFF por módulo. Un módulo con **FAULT** se repara pulsando su interruptor (reinicio de ~1 s).
- **Inestabilidad:** aparece el aviso REACTOR UNSTABLE / STABILIZE THE REACTOR! con causa, control a corregir y consecuencia. Nunca se resuelve solo; sin intervención el riesgo sistémico sube hasta el fallo.
- **Apagón:** solo con inestabilidad y con probabilidad configurable (⚙). Abre ELECTRICAL EMERGENCY: haz clic en la caja y reproduce el patrón en 15–20 s. Si ganas, vuelves al dashboard con el mismo estado inestable; si pierdes, GAME OVER.
- **GAME OVER:** causa, tiempo de supervivencia, eventos y emergencias. REINICIAR restaura todo y empieza otra partida.
- **AUTO DEMO MODE:** acelera los eventos y añade un operador automático (sin apagones). Solo en este modo algo se repara solo.

## Sonido y efectos

- Todo el audio se genera con Web Audio (sin archivos) y **empieza desactivado**: actívalo con el icono 🔇 de la cabecera o en ⚙ Settings.
- **Settings:** Master / Ambient / Alarm Volume, Sound Effects, Visual Effects, Screen Shake, tema y probabilidad de apagón. Se guardan en `localStorage` (el sonido siempre arranca apagado).
- Ambiente y zumbido eléctrico continuos; alarma en bucle según el estado (UNSTABLE, RADIATION ALERT, EMERGENCY, CONTAINMENT FAILURE); apagón, restauración, cuenta atrás, explosión y GAME OVER con sonido propio.

## Controles

- **START / PAUSE / RESET SIMULATION** y **MODO DEMO** (activa perturbaciones ficticias más frecuentes).
- **Intensidad visual** y **velocidad de animación**.
- Configuración (⚙): sonido ON/OFF y modo visual (cian, azul, violeta).

## Limitaciones

- Los valores y las alarmas son inventados y no tienen significado físico.
- El audio solo se activa tras pulsar el botón de sonido (restricción de los navegadores).
