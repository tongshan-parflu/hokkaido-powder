import * as THREE from 'three';
import './style.css';
import {
  FINISH_Z,
  SCORE,
  START_Z,
  collectPickups,
  createCollider,
  crossGates,
  generateCourse,
  resetCourse,
  terrainHeight,
} from './course.js';
import { createEffects } from './snow.js';
import { createPipeline } from './render.js';
import { createSkier } from './skier.js';
import { createTerrain } from './terrain.js';
import { createWorld } from './world.js';

const BEST_KEY = 'hokkaido-powder-best';

const hud = document.getElementById('hud');
const screenStart = document.getElementById('screen-start');
const screenEnd = document.getElementById('screen-end');
const hint = document.getElementById('hint');
const comboEl = document.getElementById('combo');
const popupLayer = document.getElementById('popups');
const glError = document.getElementById('gl-error');

const speedEl = document.getElementById('speed');
const distanceEl = document.getElementById('distance');
const scoreEl = document.getElementById('score');
const timeEl = document.getElementById('time');
const gatesEl = document.getElementById('gates');
const flakesEl = document.getElementById('flakes');
const foxesEl = document.getElementById('foxes');
const comboNEl = document.getElementById('combo-n');
const bestStart = document.getElementById('best-start');
const bestStartN = document.getElementById('best-start-n');

const endTitle = document.getElementById('end-title');
const endReason = document.getElementById('end-reason');
const endTotal = document.getElementById('end-total');
const endScore = document.getElementById('end-score');
const endDistance = document.getElementById('end-distance');
const endPerfect = document.getElementById('end-perfect');
const endGates = document.getElementById('end-gates');
const endFlakes = document.getElementById('end-flakes');
const endFoxes = document.getElementById('end-foxes');
const endTime = document.getElementById('end-time');
const endBest = document.getElementById('end-best');

const keys = { left: false, right: false, up: false, down: false, jumpQueued: false };

const course = generateCourse();
const collide = createCollider(course.obstacles);
const env = { height: terrainHeight, collide };
const combo = { value: 0 };

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(66, 1, 0.2, 9000);
const desiredPos = new THREE.Vector3();
const desiredLook = new THREE.Vector3();
const camPos = new THREE.Vector3();
const lookAt = new THREE.Vector3();

const pipeline = createPipeline(scene, camera);
const renderer = pipeline.renderer;
if (!renderer.getContext()) {
  fail('当前浏览器没有可用的 WebGL');
  throw new Error('WebGL unavailable');
}
renderer.domElement.tabIndex = 0;
renderer.domElement.setAttribute('role', 'application');
renderer.domElement.setAttribute('aria-label', '北海道粉雪滑行');
document.body.prepend(renderer.domElement);

createTerrain(scene);
const world = createWorld(scene, course);
const effects = createEffects(scene);
const skier = createSkier(scene);

let mode = 'menu';
let elapsed = 0;
let score = 0;
let prevX = 0;
let prevZ = 0;
let hintTimer = 0;
let crashTimer = 0;
let finishTimer = 0;
let crashKind = '';
let trailOpen = false;
let forceSnap = true;
let lastScoreDrawn = -1;
let best = loadBest();

function fail(message) {
  if (!glError) return;
  glError.hidden = false;
  glError.textContent = message;
}

function loadBest() {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0;
  }
}

function saveBest(n) {
  try {
    localStorage.setItem(BEST_KEY, String(n));
  } catch {
    /* private mode */
  }
}

function showBest() {
  if (best > 0) {
    bestStart.hidden = false;
    bestStartN.textContent = best.toLocaleString('zh-CN');
  }
}

function resize() {
  camera.aspect = window.innerWidth / Math.max(1, window.innerHeight);
  camera.updateProjectionMatrix();
  pipeline.resize(window.innerWidth, window.innerHeight);
}

function formatClock(t) {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatClockFine(t) {
  const m = Math.floor(t / 60);
  const sec = (t % 60).toFixed(1).padStart(4, '0');
  return `${m}:${sec}`;
}

function popup(text) {
  const el = document.createElement('div');
  el.className = 'popup';
  el.textContent = text;
  popupLayer.appendChild(el);
  setTimeout(() => el.remove(), 880);
}

function readInput() {
  return {
    steer: (keys.left ? 1 : 0) - (keys.right ? 1 : 0),
    tuck: keys.up,
    brake: keys.down,
    jump: keys.jumpQueued,
  };
}

function distanceOf() {
  return Math.max(0, skier.rider.z - START_Z);
}

function updateHud() {
  const rider = skier.rider;
  const kmh = Math.round(rider.speed * 3.6);
  speedEl.textContent = String(kmh);
  speedEl.style.color = kmh > 95 ? '#c4453c' : '';
  distanceEl.textContent = String(Math.floor(distanceOf()));
  if (score !== lastScoreDrawn) {
    scoreEl.textContent = score.toLocaleString('zh-CN');
    scoreEl.classList.remove('pop');
    void scoreEl.offsetWidth;
    scoreEl.classList.add('pop');
    lastScoreDrawn = score;
  }
  timeEl.textContent = formatClock(elapsed);
  const gatesPassed = course.gates.filter((g) => g.passed).length;
  gatesEl.textContent = `${gatesPassed}/${course.gates.length}`;
  flakesEl.textContent = String(course.flakes.filter((f) => f.collected).length);
  foxesEl.textContent = String(course.foxes.filter((f) => f.collected).length);
  if (combo.value > 1) {
    comboEl.hidden = false;
    comboNEl.textContent = String(combo.value);
  } else {
    comboEl.hidden = true;
  }
}

function desiredCamera(drift, extraUp) {
  const rider = skier.rider;
  const aheadX = Math.sin(rider.heading);
  const aheadZ = Math.cos(rider.heading);
  const rx = Math.cos(rider.heading);
  const rz = -Math.sin(rider.heading);
  const back = 6.6 + Math.min(rider.speed, 30) * 0.035;
  const up = 2.35 + extraUp + Math.min(rider.speed, 30) * 0.012;
  desiredPos.set(
    rider.x - aheadX * back + rx * drift,
    rider.y + up,
    rider.z - aheadZ * back + rz * drift,
  );
  const floorY = terrainHeight(desiredPos.x, desiredPos.z) + 1.45;
  if (desiredPos.y < floorY) desiredPos.y = floorY;
  const look = 8 + Math.min(rider.speed, 32) * 0.16;
  desiredLook.set(rider.x + aheadX * look, rider.y + 1.05, rider.z + aheadZ * look);
}

function updateCamera(dt, drift, extraUp) {
  desiredCamera(drift, extraUp);
  if (forceSnap) {
    camPos.copy(desiredPos);
    lookAt.copy(desiredLook);
    forceSnap = false;
  } else {
    const k = 1 - Math.exp(-4 * dt);
    camPos.lerp(desiredPos, k);
    lookAt.lerp(desiredLook, k);
  }
  camera.position.copy(camPos);
  camera.lookAt(lookAt);
  const tuck = mode === 'play' && keys.up && !keys.down;
  const targetFov = 66 + Math.min(skier.rider.speed, 32) * 0.4 + (tuck ? 8 : 0);
  if (Math.abs(camera.fov - targetFov) > 0.05) {
    camera.fov += (targetFov - camera.fov) * (1 - Math.exp(-4 * dt));
    camera.updateProjectionMatrix();
  }
}

function sprayFrom(side, n) {
  const rider = skier.rider;
  const rx = Math.cos(rider.heading);
  const rz = -Math.sin(rider.heading);
  effects.emit(
    rider.x + rx * side * 0.42,
    rider.y + 0.12,
    rider.z + rz * side * 0.42,
    rx * side * 2.4 + rider.vx * 0.08,
    1.5,
    rz * side * 2.4 + rider.vz * 0.08,
    n,
  );
}

function pushTrack() {
  const rider = skier.rider;
  const hx = Math.sin(rider.heading);
  const hz = Math.cos(rider.heading);
  const bx = rider.x - hx * 0.9;
  const bz = rider.z - hz * 0.9;
  const by = terrainHeight(bx, bz) + 0.08;
  effects.pushTrail(bx, by, bz, hx, hz);
  trailOpen = true;
}

function beginRun() {
  if (mode === 'play' || mode === 'crash' || mode === 'finishwait') return;
  resetCourse(course);
  world.reset();
  effects.resetTrail();
  skier.reset();
  score = 0;
  scoreEl.textContent = '0';
  lastScoreDrawn = 0;
  combo.value = 0;
  elapsed = 0;
  hintTimer = 6.5;
  trailOpen = false;
  crashKind = '';
  prevX = skier.rider.x;
  prevZ = skier.rider.z;
  mode = 'play';
  document.body.dataset.mode = 'play';
  screenStart.hidden = true;
  screenEnd.hidden = true;
  hud.hidden = false;
  hint.hidden = false;
  hint.classList.remove('hide');
  popupLayer.replaceChildren();
  forceSnap = true;
  updateHud();
}

function showEnd(kind) {
  mode = 'end';
  document.body.dataset.mode = 'end';
  hud.hidden = true;
  hint.hidden = true;
  const distance = distanceOf();
  const distanceBonus = Math.floor(distance);
  const allGates = course.gates.every((g) => g.passed);
  const perfect = kind === 'finish' && allGates ? SCORE.perfect : 0;
  const total = score + distanceBonus + perfect;
  if (total > best) {
    best = total;
    saveBest(best);
    showBest();
  }
  endTitle.textContent = kind === 'finish' ? '抵达山脚' : '摔倒了';
  endTitle.dataset.kind = kind;
  if (kind === 'finish') {
    endReason.textContent = allGates
      ? '全旗门穿过。羊蹄山就在身后，粉雪还在脚下。'
      : '你滑完了这条通向羊蹄山脚的粉雪雪道。';
  } else if (crashKind === '岩石') {
    endReason.textContent = '雪下的岩石把你绊倒了。';
  } else if (crashKind === '边界') {
    endReason.textContent = '你冲出了雪道，扎进了边沿的深雪。';
  } else {
    endReason.textContent = '白桦和云杉不会让路。';
  }
  endTotal.textContent = total.toLocaleString('zh-CN');
  endScore.textContent = score.toLocaleString('zh-CN');
  endDistance.textContent = `${distanceBonus.toLocaleString('zh-CN')} 米`;
  endPerfect.hidden = perfect === 0;
  endPerfect.textContent = `全旗门 +${perfect}`;
  endGates.textContent = `${course.gates.filter((g) => g.passed).length}/${course.gates.length}`;
  endFlakes.textContent = String(course.flakes.filter((f) => f.collected).length);
  endFoxes.textContent = String(course.foxes.filter((f) => f.collected).length);
  endTime.textContent = formatClockFine(elapsed);
  endBest.textContent = best.toLocaleString('zh-CN');
  screenEnd.hidden = false;
}

function step(dt) {
  const menu = mode === 'menu';
  if (menu) {
    skier.idle(dt);
    updateCamera(dt, Math.sin(performance.now() * 0.00025) * 1.15, 0.85);
  } else if (mode === 'play') {
    elapsed += dt;
    hintTimer -= dt;
    hint.classList.toggle('hide', hintTimer <= 0);
    const input = readInput();
    keys.jumpQueued = false;
    const fromX = prevX;
    const fromZ = prevZ;
    const events = skier.update(dt, input, env);
    const rider = skier.rider;
    if (!events.crashed && rider.z >= FINISH_Z) {
      mode = 'finishwait';
      finishTimer = 0.7;
      effects.burst(rider.x, rider.y + 1, rider.z, 28);
    } else if (events.crashed) {
      mode = 'crash';
      crashTimer = 1.15;
      crashKind = events.crashed;
      effects.burst(rider.x, rider.y + 0.6, rider.z, 36);
    } else {
      const gateEvents = crossGates(course.gates, fromX, fromZ, rider.x, rider.z, combo);
      for (const ev of gateEvents) {
        if (ev.type === 'gate') {
          score += ev.points;
          popup(ev.mult > 1 ? `旗门 +${ev.points}  连击` : `旗门 +${ev.points}`);
        }
      }
      const picks = collectPickups(course, rider.x, rider.z);
      for (const ev of picks) {
        score += ev.points;
        popup(ev.type === 'fox' ? `北狐 +${ev.points}` : `雪花 +${ev.points}`);
      }
      const n = Math.max(1, Math.round(dt * 60 * 3));
      if (events.spray === 'left' || events.spray === 'both') sprayFrom(-1, n);
      if (events.spray === 'right' || events.spray === 'both') sprayFrom(1, n);
      if (events.jumped) effects.burst(rider.x, rider.y, rider.z, 10);
      if (events.landed) effects.burst(rider.x, rider.y + 0.2, rider.z, 16);
      if (rider.onGround) pushTrack();
      else if (trailOpen) {
        effects.breakTrail();
        trailOpen = false;
      }
      updateHud();
    }
    prevX = skier.rider.x;
    prevZ = skier.rider.z;
    updateCamera(dt, 0, 0);
  } else if (mode === 'crash') {
    skier.tumble(dt);
    crashTimer -= dt;
    updateCamera(dt, 0, 0.4);
    if (crashTimer <= 0) showEnd('crash');
  } else if (mode === 'finishwait') {
    skier.glideStop(dt);
    finishTimer -= dt;
    updateCamera(dt, 0, 0.3);
    if (finishTimer <= 0) showEnd('finish');
  } else {
    updateCamera(dt, 0, 0.2);
  }

  world.update(dt);
  effects.updateSnow(dt, camera);
}

function draw() {
  const rider = skier.rider;
  pipeline.update(rider);
  pipeline.render();
}

window.addEventListener('resize', resize);
resize();

window.addEventListener('keydown', (e) => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
    e.preventDefault();
  }
  if (e.code === 'Enter' || (e.code === 'Space' && mode !== 'play' && mode !== 'crash' && mode !== 'finishwait')) {
    e.preventDefault();
    if (mode === 'menu' || mode === 'end') beginRun();
    return;
  }
  if ((e.code === 'KeyR' || e.code === 'Enter') && mode === 'end') {
    beginRun();
    return;
  }
  if (e.code === 'KeyM' && !e.repeat) {
    effects.setSnowing(!effects.snowing);
    const snowBtn = document.getElementById('btn-snow');
    if (snowBtn) snowBtn.textContent = effects.snowing ? '停雪' : '降雪';
    return;
  }
  if (e.code === 'KeyN' && !e.repeat) {
    const next = document.body.dataset.night !== '1';
    pipeline.setNight(next);
    world.setNight(next);
    const nightBtn = document.getElementById('btn-night');
    if (nightBtn) nightBtn.textContent = next ? '白天' : '夜间';
    return;
  }
  if (e.code === 'Space' && mode === 'play' && !e.repeat) keys.jumpQueued = true;
  const mapped = {
    KeyA: 'left',
    ArrowLeft: 'left',
    KeyD: 'right',
    ArrowRight: 'right',
    KeyW: 'up',
    ArrowUp: 'up',
    KeyS: 'down',
    ArrowDown: 'down',
  }[e.code];
  if (mapped) keys[mapped] = true;
});

window.addEventListener('keyup', (e) => {
  const mapped = {
    KeyA: 'left',
    ArrowLeft: 'left',
    KeyD: 'right',
    ArrowRight: 'right',
    KeyW: 'up',
    ArrowUp: 'up',
    KeyS: 'down',
    ArrowDown: 'down',
  }[e.code];
  if (mapped) keys[mapped] = false;
});

window.addEventListener('blur', () => {
  keys.left = false;
  keys.right = false;
  keys.up = false;
  keys.down = false;
});

const qualityNames = { high: '极致', medium: '细腻', low: '流畅' };
let qualityLevel = 'medium';
function cycleQuality() {
  qualityLevel = qualityLevel === 'medium' ? 'high' : qualityLevel === 'high' ? 'low' : 'medium';
  pipeline.setQuality(qualityLevel);
  const el = document.getElementById('btn-quality');
  if (el) el.textContent = `画质 · ${qualityNames[qualityLevel]}`;
}
document.getElementById('btn-quality')?.addEventListener('click', (e) => {
  e.stopPropagation();
  cycleQuality();
});
document.getElementById('btn-snow')?.addEventListener('click', (e) => {
  e.stopPropagation();
  effects.setSnowing(!effects.snowing);
  e.currentTarget.textContent = effects.snowing ? '停雪' : '降雪';
});
document.getElementById('btn-night')?.addEventListener('click', (e) => {
  e.stopPropagation();
  const next = document.body.dataset.night !== '1';
  pipeline.setNight(next);
  world.setNight(next);
  e.currentTarget.textContent = next ? '白天' : '夜间';
});
document.getElementById('btn-start').addEventListener('click', () => beginRun());
document.getElementById('btn-again').addEventListener('click', () => {
  if (mode === 'end') beginRun();
});

renderer.domElement.addEventListener('pointerdown', () => {
  if (mode === 'menu') beginRun();
});

for (const el of document.querySelectorAll('[data-hold]')) {
  const name = el.dataset.hold;
  const set = (down) => {
    keys[name] = down;
  };
  el.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    set(true);
  });
  el.addEventListener('pointerup', (e) => {
    e.preventDefault();
    set(false);
  });
  el.addEventListener('pointercancel', () => set(false));
  el.addEventListener('pointerleave', () => set(false));
}
document.getElementById('btn-jump').addEventListener('pointerdown', (e) => {
  e.preventDefault();
  if (mode === 'play') keys.jumpQueued = true;
});

showBest();
skier.reset();
prevX = skier.rider.x;
prevZ = skier.rider.z;
document.body.dataset.mode = 'menu';
updateCamera(0.016, 0, 0.85);
draw();

let last = performance.now();
let accumulator = 0;
function frame(now) {
  const frameDt = Math.min(0.25, Math.max(0.001, (now - last) / 1000));
  last = now;
  accumulator += frameDt;
  const stepDt = 1 / 60;
  let steps = 0;
  while (accumulator >= stepDt && steps < 15) {
    step(stepDt);
    accumulator -= stepDt;
    steps += 1;
  }
  if (accumulator > stepDt) accumulator = stepDt;
  draw();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
