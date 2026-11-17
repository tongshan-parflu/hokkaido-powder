# 北海道粉雪滑行

A browser ski game on a Niseko-style mountain: snow-loaded firs, a corduroy piste, and Mt. Yotei across the valley. Vite and Three.js. The default light is a low peach sunset; N switches to night skiing.

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
| M | Toggle snowfall |
| Enter | Start, or ski again |

Pass the red-and-white gates, collect snowflakes and Ezo foxes, and stay off the trees and rocks. The course is about two kilometers, from the birch ridge through an open bowl to the valley. 画质 switches 极致 / 细腻 / 流畅. 极致 adds SSAO and a larger shadow map.

## Static build

```bash
npm run build
npm run preview
```

`dist/` is the static site. It has to be served over HTTP. Opening `index.html` as a `file://` URL will not work.

## Assets

CC0 unless noted. Credit is included even where the license does not require it.

- Quaternius, Stylized Nature MegaKit (standard) — pines. [quaternius.com](https://quaternius.com)
- Kenney, Holiday Kit — snow trees and cabin pieces. [kenney.nl](https://kenney.nl)
- Kay Lousberg, KayKit Adventurers — rigged skier. [kaylousberg.com](https://kaylousberg.com)
- Fox model by PixelMannen (CC0). Rigging and glTF conversion by tomkranis (CC-BY 4.0), via the Khronos glTF sample models.
- Poly Haven — `qwantani_sunset` HDRI (Greg Zaal, CC0) and `snow_02` textures. [polyhaven.com](https://polyhaven.com)

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
