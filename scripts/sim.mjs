import {
  FINISH_Z,
  courseCenter,
  createCollider,
  collectPickups,
  crossGates,
  generateCourse,
  resetCourse,
  terrainHeight,
} from '../src/course.js';
import { createRider, resetRider, stepPhysics } from '../src/physics.js';

const course = generateCourse();
const collide = createCollider(course.obstacles);
const env = { height: terrainHeight, collide };

function run(label, inputFn, seconds = 220) {
  resetCourse(course);
  const rider = createRider();
  resetRider(rider);
  const combo = { value: 0 };
  let crashed = null;
  let t = 0;
  const dt = 1 / 60;
  let maxSpeed = 0;
  let speedSum = 0;
  let speedN = 0;
  let prevX = rider.x;
  let prevZ = rider.z;
  while (t < seconds && !crashed && rider.z < FINISH_Z) {
    const input = inputFn(rider, t, course);
    const ev = stepPhysics(rider, dt, input, env);
    crossGates(course.gates, prevX, prevZ, rider.x, rider.z, combo);
    collectPickups(course, rider.x, rider.z);
    prevX = rider.x;
    prevZ = rider.z;
    if (ev.crashed) crashed = `${ev.crashed} @ z=${rider.z.toFixed(0)} x=${rider.x.toFixed(1)}`;
    if (!Number.isFinite(rider.x) || !Number.isFinite(rider.vx) || !Number.isFinite(rider.speed)) {
      crashed = 'nan';
    }
    maxSpeed = Math.max(maxSpeed, rider.speed);
    if (t < 20) {
      speedSum += rider.speed;
      speedN += 1;
    }
    t += dt;
  }
  return {
    label,
    t: Number(t.toFixed(1)),
    z: Number(rider.z.toFixed(1)),
    crashed,
    finished: rider.z >= FINISH_Z && !crashed,
    gates: course.gates.filter((g) => g.passed).length,
    gateTotal: course.gates.length,
    maxKmh: Math.round(maxSpeed * 3.6),
    earlyKmh: Math.round((speedSum / Math.max(1, speedN)) * 3.6),
    foxes: course.foxes.filter((f) => f.collected).length,
    flakes: course.flakes.filter((f) => f.collected).length,
  };
}

function ai(rider, _t, layout) {
  let target = null;
  for (const g of layout.gates) {
    if (!g.resolved && g.z > rider.z - 2) {
      target = g;
      break;
    }
  }
  const tx = target ? target.x : courseCenter(rider.z + 26);
  const tz = target ? target.z : rider.z + 26;
  let diff = Math.atan2(tx - rider.x, tz - rider.z) - rider.heading;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return {
    steer: Math.max(-1, Math.min(1, diff * 2.5)),
    tuck: rider.z > 500 && rider.speed < 26,
    brake: false,
    jump: false,
  };
}

const problems = [];

let minClear = Infinity;
for (const tree of course.trees) {
  minClear = Math.min(minClear, Math.abs(tree.x - courseCenter(tree.z)));
}
console.log(`trees ${course.trees.length} birch ${course.trees.filter((t) => t.kind === 'birch').length} pine ${course.trees.filter((t) => t.kind === 'pine').length}`);
console.log(`rocks ${course.rocks.length} gates ${course.gates.length} flakes ${course.flakes.length} foxes ${course.foxes.length}`);
console.log(`min tree clearance ${minClear.toFixed(2)} m`);
if (minClear < 15) problems.push(`trees inside corridor (${minClear.toFixed(2)})`);

for (const p of [...course.flakes, ...course.foxes]) {
  for (const o of course.obstacles) {
    const d = Math.hypot(p.x - o.x, p.z - o.z);
    if (d < o.r + 0.7) {
      problems.push(`pickup inside obstacle at z=${p.z.toFixed(0)}`);
      break;
    }
  }
}

const coast = run('coast', () => ({ steer: 0, tuck: false, brake: false, jump: false }));
const steered = run('ai', ai);
const weave = run('weave', (_r, t) => ({
  steer: Math.sin(t * 0.42) * 0.4,
  tuck: false,
  brake: false,
  jump: false,
}));
const hold = run('hold-left', () => ({ steer: 1, tuck: false, brake: false, jump: false }), 90);
const jumper = run('jump', (_r, t) => ({
  steer: 0,
  tuck: true,
  brake: false,
  jump: t > 2 && t < 2.05,
}), 12);

for (const row of [coast, steered, weave, hold, jumper]) {
  console.log(JSON.stringify(row));
}

if (coast.crashed && coast.z < 700) problems.push(`coast crashed early: ${coast.crashed}`);
if (coast.earlyKmh < 25) problems.push(`coast too slow early (${coast.earlyKmh} km/h)`);
if (!steered.finished || steered.crashed) problems.push(`ai failed: ${steered.crashed || 'not finished'}`);
if (steered.gates < 12) problems.push(`ai only passed ${steered.gates} gates`);
if (jumper.crashed) problems.push(`jump crashed: ${jumper.crashed}`);

if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log('sim ok');
