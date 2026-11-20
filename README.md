# NUCLEAR CORE SIMULATOR

Simulación visual, educativa y **ficticia** de una instalación nuclear futurista. No modela ni representa procedimientos, parámetros ni controles de reactores reales.

HTML5 + CSS3 + JavaScript vanilla + Canvas + SVG + Web Audio. Sin dependencias, CDNs ni conexión a internet.

## Estructura

```
nuclear-core-simulator/
├── index.html
├── css/style.css
├── js/
│   ├── audio.js      efectos sonoros (Web Audio, desactivado por defecto)
│   ├── alarms.js     estados NORMAL / WARNING / CRITICAL / OFFLINE
│   ├── charts.js     medidores SVG y gráfico de evolución
│   ├── reactor.js    cámara del núcleo en Canvas
│   ├── dashboard.js  paneles, reloj y registro de eventos
│   └── main.js       estado de la simulación, bucle y controles
└── README.md
```

Se usan scripts clásicos con el namespace `window.NCS` para que funcione abriendo `index.html` con `file://`.

## Ejecutar en local

Abre `index.html` con doble clic en cualquier navegador moderno. No hace falta servidor.

## Publicar en GitHub Pages

1. Sube el contenido de la carpeta a un repositorio (`index.html` en la raíz).
2. En **Settings → Pages**, elige la rama `main` y la carpeta `/ (root)`.
3. Abre la URL que GitHub genera. Todas las rutas son relativas.

## Controles

- **START / PAUSE / RESET SIMULATION** y **MODO DEMO** (activa perturbaciones ficticias más frecuentes).
- **Intensidad visual** y **velocidad de animación**.
- Configuración (⚙): sonido ON/OFF y modo visual (cian, azul, violeta).

## Limitaciones

- Los valores y las alarmas son inventados y no tienen significado físico.
- El audio solo se activa tras pulsar el botón de sonido (restricción de los navegadores).
