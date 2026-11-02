# चतुरङ्ग — Chaturanga

> **The Ancient Indian War Game** — a fully browser-based 3D chess experience with ancient Indian piece names, cinematic camera animations, and full battle scenes for every capture.

## ▶ Play

Open `index.html` in any modern browser. No server or build step needed.

## 🏛 Pieces

| Standard | Ancient Name | Sanskrit |
|----------|-------------|---------|
| King     | Raja        | राज     |
| Queen    | Mantri      | मन्त्री |
| Rook     | Ratha       | रथ      |
| Bishop   | Gaja        | गज      |
| Knight   | Ashva       | अश्व    |
| Pawn     | Padati      | पदाति   |

## ✨ Features

- **3D ancient Indian pieces** built from geometry (no external assets)
- **Cinematic camera** swoops on every move — side view, front view, dynamic angle
- **Full battle animations** on every capture — soldiers clash, elephants charge, chariots attack
- Torch-lit battlefield environment with stars, fog, and flickering lights
- Complete chess rules: castling, en passant, promotion, check/checkmate/stalemate
- Drag to orbit, scroll to zoom; camera preset buttons (Top / White / Black / Cinematic auto-rotate)

## 📁 Structure

```
index.html          — Shell
style.css           — Ancient Indian dark aesthetic
js/
  chess-engine.js   — Full chess rules engine
  pieces.js         — 3D piece geometry builder
  renderer.js       — Three.js scene, board, lighting, raycasting
  animations.js     — Cinematic camera, movement arcs, dust particles
  battle-scenes.js  — 2D canvas battle animations for each capture type
  main.js           — Game controller
```

## 🛠 Tech

- [Three.js r128](https://threejs.org/) — 3D rendering
- [GSAP 3](https://greensock.com/gsap/) — animation support
- Vanilla JS, no framework, no build step
