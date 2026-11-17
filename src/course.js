/** Pure course data: terrain, layout, gates, and pickups. No rendering. */

export const COURSE_LENGTH = 2100;
export const HALF_WIDTH = 150;
export const START_Z = 28;
export const FINISH_Z = COURSE_LENGTH - 80;

export const SCORE = {
  gate: 100,
  flake: 25,
  fox: 200,
  perfect: 500,
  comboCap: 5,
};

const SEED = 20261117;

function mulberry32(seed) {
  let a = seed >>> 0;
  return function rand() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

/** Longitudinal snow line, without banks. Useful for distant scenery. */
export function slopeElevation(z) {
  const zc = clamp(z, 0, COURSE_LENGTH);
  const drop =
    0.125 * zc +
    0.11 * (COURSE_LENGTH / Math.PI) * (1 - Math.cos((Math.PI * zc) / COURSE_LENGTH));
  return 430 - drop;
}

/** Center of the fall line. The trough and gates follow this curve. */
export function courseCenter(z) {
  return Math.sin(z * 0.0036) * 18 + Math.sin(z * 0.00155 + 0.7) * 7;
}

function smooth01(t) {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
}

export function terrainHeight(x, z) {
  const cx = courseCenter(z);
  const dx = x - cx;
  const adx = Math.abs(dx);
  let y = slopeElevation(z);
  y += Math.sin(z * 0.016) * 2.6;
  y += Math.sin(z * 0.0065 + 0.8) * 3.4;
  y += Math.sin(z * 0.031 + dx * 0.01) * 0.7;

  if (z > 820 && z < 1360) {
    const u = (z - 820) / 540;
    const bowl = Math.sin(u * Math.PI);
    const radial = Math.exp(-(dx * dx) / (62 * 62));
    y -= bowl * radial * 7.5;
  }

  const offPiste = smooth01((adx - 9) / 12);
  y += Math.sin(x * 0.31 + z * 0.12) * (0.05 + offPiste * 0.22);
  y += Math.sin(x * 0.87 + z * 0.63) * offPiste * 0.05;
  const shoulder = smooth01((adx - 28) / 80);
  y += shoulder * shoulder * 12;

  if (adx > HALF_WIDTH - 18) {
    const k = (adx - (HALF_WIDTH - 18)) / 18;
    y += k * k * 10;
  }
  return y;
}

const _normal = { x: 0, y: 1, z: 0 };

export function terrainNormal(x, z, out = _normal) {
  const e = 1.2;
  const hL = terrainHeight(x - e, z);
  const hR = terrainHeight(x + e, z);
  const hD = terrainHeight(x, z - e);
  const hU = terrainHeight(x, z + e);
  const nx = hL - hR;
  const ny = 2 * e;
  const nz = hD - hU;
  const len = Math.hypot(nx, ny, nz) || 1;
  out.x = nx / len;
  out.y = ny / len;
  out.z = nz / len;
  return out;
}

/** Heading (atan2 of x, z) that points downhill. */
export function downhillHeading(x, z) {
  const e = 2;
  const gx = terrainHeight(x + e, z) - terrainHeight(x - e, z);
  const gz = terrainHeight(x, z + e) - terrainHeight(x, z - e);
  return Math.atan2(-gx, -gz);
}

function dist2(ax, az, bx, bz) {
  const dx = ax - bx;
  const dz = az - bz;
  return dx * dx + dz * dz;
}

function tooClose(list, x, z, minDist) {
  const min2 = minDist * minDist;
  for (let i = 0; i < list.length; i++) {
    if (dist2(list[i].x, list[i].z, x, z) < min2) return true;
  }
  return false;
}

export function generateCourse() {
  const rand = mulberry32(SEED);
  const gates = [];
  const gateCount = 16;
  for (let i = 0; i < gateCount; i++) {
    const z = 175 + i * 108;
    const offset = i === 0 ? 0 : Math.sin(i * 1.17) * 8.4;
    gates.push({
      x: courseCenter(z) + offset,
      z,
      half: 3.9,
      index: i,
      passed: false,
      resolved: false,
    });
  }

  const trees = [];
  const rocks = [];
  const obstacles = [];

  const startX = courseCenter(START_Z);

  function pushTree(x, z, kind, scale) {
    if (z < 58 || z > FINISH_Z - 30) return;
    if (Math.abs(x) > HALF_WIDTH - 8) return;
    if (Math.hypot(x - startX, z - START_Z) < 14) return;
    const dx = x - courseCenter(z);
    if (Math.abs(dx) < 16.5) return;
    if (tooClose(trees, x, z, 2.4)) return;
    if (tooClose(gates, x, z, 6.5)) return;
    const r = (kind === 'pine' ? 0.72 : 0.4) * scale;
    const tree = { x, z, kind, scale, rot: rand() * Math.PI * 2, r };
    trees.push(tree);
    obstacles.push({ x, z, r, kind: 'tree' });
  }

  function grove(z, side, kind, n, near, far) {
    const anchor = courseCenter(z) + side * (near + rand() * (far - near));
    for (let k = 0; k < n; k++) {
      const ang = rand() * Math.PI * 2;
      const rad = Math.pow(rand(), 0.65) * 8;
      pushTree(anchor + Math.cos(ang) * rad, z + (rand() - 0.5) * 10, kind, 0.7 + rand() * 0.85);
    }
  }
  for (let z = 36; z < 980; z += 16) {
    grove(z, -1, rand() < 0.8 ? 'birch' : 'pine', 5, 18, 26);
    grove(z, 1, rand() < 0.45 ? 'birch' : 'pine', 4, 18, 30);
    if (rand() > 0.35) grove(z + 4, -1, 'birch', 4, 28, 46);
    if (rand() > 0.45) grove(z + 7, 1, 'pine', 3, 30, 48);
  }
  for (let z = 980; z < COURSE_LENGTH - 40; z += 20) {
    if (z > 880 && z < 1320 && rand() > 0.55) continue;
    grove(z, -1, rand() < 0.2 ? 'birch' : 'pine', 4, 20, 44);
    grove(z, 1, 'pine', 4, 20, 42);
  }

  function pushRock(x, z, scale, decorative) {
    if (z < 70 || z > FINISH_Z - 40) return;
    const dx = Math.abs(x - courseCenter(z));
    if (!decorative && (dx < 13.4 || dx > 16.8)) return;
    if (decorative && (dx < 26 || dx > 42)) return;
    if (tooClose(obstacles, x, z, 3.2)) return;
    if (tooClose(gates, x, z, 8)) return;
    const r = 0.62 * scale;
    const rock = {
      x,
      z,
      scale,
      rot: rand() * Math.PI,
      snow: rand() > 0.35,
      r,
      sx: 0.75 + rand() * 0.7,
      sy: 0.45 + rand() * 0.55,
      sz: 0.75 + rand() * 0.7,
    };
    rocks.push(rock);
    obstacles.push({ x, z, r, kind: 'rock' });
  }

  for (let z = 140; z < COURSE_LENGTH - 50; z += 28) {
    const cx = courseCenter(z);
    const side = rand() > 0.5 ? 1 : -1;
    pushRock(cx + side * (22 + rand() * 8), z + rand() * 10, 0.7 + rand() * 0.8, true);
    if (z > 460 && rand() > 0.28) {
      const challengeSide = rand() > 0.5 ? 1 : -1;
      pushRock(cx + challengeSide * (10.5 + rand() * 6.5), z + 8 + rand() * 12, 0.65 + rand() * 0.7, false);
    }
  }

  const flakes = [];
  for (let i = 0; i < 34; i++) {
    const z = 96 + i * 56;
    let x = courseCenter(z) + Math.sin(i * 0.85) * 6.2;
    if (tooClose(obstacles, x, z, 2.4)) {
      x = courseCenter(z) + Math.cos(i * 0.7) * 3.2;
    }
    if (tooClose(obstacles, x, z, 2.1)) continue;
    flakes.push({ x, z, collected: false, phase: rand() * Math.PI * 2 });
  }

  const foxes = [];
  for (let i = 0; i < 8; i++) {
    const z = 230 + i * 210;
    const side = i % 2 === 0 ? -1 : 1;
    let x = courseCenter(z) + side * (9.5 + (i % 3) * 1.4);
    let guard = 0;
    while (tooClose(obstacles, x, z, 2.6) && guard < 6) {
      x += side * 1.4;
      guard += 1;
    }
    if (tooClose(obstacles, x, z, 2.2)) continue;
    if (Math.abs(x - courseCenter(z)) > 18) continue;
    foxes.push({
      x,
      z,
      rot: side > 0 ? -0.7 : 0.7,
      collected: false,
      phase: rand() * Math.PI * 2,
    });
  }

  return { gates, trees, rocks, obstacles, flakes, foxes };
}

export function resetCourse(course) {
  for (const g of course.gates) {
    g.passed = false;
    g.resolved = false;
  }
  for (const f of course.flakes) f.collected = false;
  for (const f of course.foxes) f.collected = false;
}

export function createCollider(obstacles) {
  const cell = 18;
  const grid = new Map();
  const keyOf = (x, z) => `${Math.floor(x / cell)},${Math.floor(z / cell)}`;
  for (const o of obstacles) {
    const key = keyOf(o.x, o.z);
    let bucket = grid.get(key);
    if (!bucket) {
      bucket = [];
      grid.set(key, bucket);
    }
    bucket.push(o);
  }
  return function collide(x, z, airHeight) {
    const ix = Math.floor(x / cell);
    const iz = Math.floor(z / cell);
    for (let gz = iz - 1; gz <= iz + 1; gz++) {
      for (let gx = ix - 1; gx <= ix + 1; gx++) {
        const bucket = grid.get(`${gx},${gz}`);
        if (!bucket) continue;
        for (const o of bucket) {
          if (o.kind === 'rock' && airHeight > 1.05) continue;
          const rad = o.r + 0.36;
          const dx = o.x - x;
          const dz = o.z - z;
          if (dx * dx + dz * dz < rad * rad) return o;
        }
      }
    }
    return null;
  };
}

/**
 * Mark gates the rider's segment crossed.
 * `combo` is a { value } box so callers keep the streak.
 */
export function crossGates(gates, prevX, prevZ, x, z, combo) {
  const events = [];
  const dz = z - prevZ;
  for (const g of gates) {
    if (g.resolved) continue;
    if (!(prevZ < g.z && z >= g.z)) continue;
    const t = dz !== 0 ? (g.z - prevZ) / dz : 1;
    const cx = prevX + (x - prevX) * t;
    g.resolved = true;
    if (Math.abs(cx - g.x) <= g.half) {
      g.passed = true;
      combo.value += 1;
      const mult = Math.min(combo.value, SCORE.comboCap);
      const points = SCORE.gate * mult;
      events.push({ type: 'gate', points, combo: combo.value, mult, gate: g });
    } else {
      combo.value = 0;
      events.push({ type: 'miss', gate: g });
    }
  }
  return events;
}

export function collectPickups(course, x, z) {
  const events = [];
  for (const f of course.flakes) {
    if (f.collected) continue;
    const dx = f.x - x;
    const dz = f.z - z;
    if (dx * dx + dz * dz < 1.35 * 1.35) {
      f.collected = true;
      events.push({ type: 'flake', points: SCORE.flake, pickup: f });
    }
  }
  for (const f of course.foxes) {
    if (f.collected) continue;
    const dx = f.x - x;
    const dz = f.z - z;
    if (dx * dx + dz * dz < 1.7 * 1.7) {
      f.collected = true;
      events.push({ type: 'fox', points: SCORE.fox, pickup: f });
    }
  }
  return events;
}
