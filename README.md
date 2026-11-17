# 北海道粉雪滑行

A browser skiing game on a long Hokkaido powder slope: birch groves, snow-covered pines, and a Mt. Yotei-style cone in the sunset fog. Built with Vite and Three.js. No account, no build tools required beyond Node for the dev server.

## Play

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:4731](http://127.0.0.1:4731).

| Key | Action |
| --- | --- |
| A / ← | Carve left |
| D / → | Carve right |
| W / ↑ | Tuck (accelerate) |
| S / ↓ | Brake |
| Space | Jump |
| Enter | Start, or ski again after a run |

Pass the flag gates, pick up snowflakes and Ezo foxes (北狐), and stay off the trees and rocks. The run is about two kilometers. Your best total is kept in this browser.

On a phone, on-screen buttons appear once the run starts.

## Static build

```bash
npm run build
npm run preview
```

`dist/` is a static site. Serve that folder with any static host. Opening `index.html` as a `file://` URL will not work, because the game is an ES module.

## Files

- `index.html` — page, Chinese HUD, start and result screens
- `src/main.js` — loop, camera, input, scoring
- `src/course.js` — slope, gates, trees, pickups
- `src/physics.js` — carving, gravity, jumps
- `src/terrain.js` — snow mesh
- `src/world.js` — trees, volcano, foxes, gates
- `src/skier.js` — low-poly skier
- `src/snow.js` — snowfall, spray, tracks
- `src/style.css` — interface
- `scripts/sim.mjs` — headless run of the same physics (`npm run sim`)
