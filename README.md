# 北海道粉雪滑行

A browser ski game on a Niseko-style mountain: birch runs, snow-loaded pines, and Mt. Yotei across the valley. Vite and Three.js, with a PBR snow surface, soft shadows, bloom, and a night-skiing mode.

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
| W / ↑ | Tuck |
| S / ↓ | Brake |
| Space | Jump |
| N | Day / night (ナイター) |
| Enter | Start, or ski again |

Pass the red-and-white gates, collect snowflakes and Ezo foxes, and stay off the trees and rocks. The course is about two kilometers, from the birch ridge through an open bowl to the valley. 画质 switches 极致 / 细腻 / 流畅. 极致 adds SSAO and a larger shadow map.

## Static build

```bash
npm run build
npm run preview
```

`dist/` is the static site. It has to be served over HTTP. Opening `index.html` as a `file://` URL will not work.

## Assets

Snow textures and the sky HDRI are CC0 from Poly Haven (`snow_02`, `kloofendal_48d_partly_cloudy_puresky`), stored in `public/assets/`.

## Files

- `index.html`, `src/style.css` — Chinese UI
- `src/main.js` — loop, camera, scoring
- `src/course.js` — mountain, gates, trees, pickups
- `src/physics.js` — carving, gravity, jump
- `src/render.js` — ACES, shadows, bloom, SSAO, night
- `src/materials.js` — snow and birch bark
- `src/terrain.js` — snowfield
- `src/trees.js` — birch and conifer meshes
- `src/world.js` — Yotei, sea, lifts, lodge, wildlife
- `src/skier.js` — skier and poses
- `src/snow.js` — snowfall, powder, tracks
- `scripts/sim.mjs` — headless physics check (`npm run sim`)
