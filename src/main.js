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
import { loadAssets } from './models.js';
import { LEVELS } from './course.js';
import { bestFor, getSave, isUnlocked, patchSave, recordRun, starsFor } from './save.js';
import { formatTime, t } from './i18n.js';
import { playCarve, resumeAudio, setAudio, setWind, stopAudio, unlockAudio } from './audio.js';
import { autoQuality, bootNative, buzz } from './native.js';

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
const camera = new THREE.PerspectiveCamera(32, 1, 0.2, 14000);
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

let world = null;
let effects = null;
let skier = null;

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

let currentLevel = 'green';
let finishLine = LEVELS.red.finish;
let tiltBeta = 0;
let tiltGamma = 0;
let carveCooldown = 0;

function tiltSteer() {
  const save = getSave();
  if (save.controls === 'touch') return 0;
  const landscape = window.matchMedia('(orientation: landscape)').matches;
  const raw = landscape ? tiltBeta : tiltGamma;
  const delta = raw - (save.tiltZero || 0);
  if (!Number.isFinite(delta)) return 0;
  return Math.max(-1, Math.min(1, -delta / 24));
}

function readInput() {
  const touchSteer = (keys.left ? 1 : 0) - (keys.right ? 1 : 0);
  const tilt = tiltSteer();
  const steer = touchSteer !== 0 ? touchSteer : tilt;
  return {
    steer,
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
  const back = 5.8 + Math.min(rider.speed, 30) * 0.02;
  const up = 2.15 + extraUp;
  desiredPos.set(
    rider.x - aheadX * back + rx * (1.35 + drift),
    rider.y + up,
    rider.z - aheadZ * back + rz * (1.35 + drift),
  );
  const floorY = terrainHeight(desiredPos.x, desiredPos.z) + 1.45;
  if (desiredPos.y < floorY) desiredPos.y = floorY;
  const look = 26 + Math.min(rider.speed, 32) * 0.2;
  desiredLook.set(rider.x + aheadX * look, rider.y - 1.4, rider.z + aheadZ * look);
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
  const targetFov = 32 + Math.min(skier.rider.speed, 32) * 0.18 + (tuck ? 4 : 0);
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
    rx * side * 3.1 + rider.vx * 0.05,
    1.7,
    rz * side * 3.1 + rider.vz * 0.05,
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

function beginRun(level = currentLevel) {
  if (!skier || !world || !effects) return;
  if (mode === 'play' || mode === 'crash' || mode === 'finishwait') return;
  if (!isUnlocked(level)) return;
  currentLevel = level;
  const profile = LEVELS[level] || LEVELS.red;
  finishLine = profile.finish;
  for (const gate of course.gates) gate.half = profile.gateHalf;
  env.collide = createCollider(course.obstacles.map((o) => ({ ...o, r: o.r * profile.radiusScale })));
  pipeline.setNight(profile.night);
  world.setNight(profile.night);
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
  document.getElementById('screen-pause').hidden = true;
  document.getElementById('screen-settings').hidden = true;
  document.getElementById('screen-tutorial').hidden = true;
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
  const relevant = course.gates.filter((g) => g.z <= finishLine + 30);
  const passed = relevant.filter((g) => g.passed).length;
  const allGates = passed === relevant.length && relevant.length > 0;
  const perfect = kind === 'finish' && allGates ? SCORE.perfect : 0;
  const total = score + distanceBonus + perfect;
  const profile = LEVELS[currentLevel] || LEVELS.red;
  const ratio = relevant.length ? passed / relevant.length : 0;
  let stars = 0;
  if (kind === 'finish') {
    stars = 1;
    if (ratio >= 0.75) stars = 2;
    if (ratio >= 0.999 && elapsed <= profile.par) stars = 3;
  }
  recordRun(currentLevel, { time: elapsed, stars });
  if (total > best) {
    best = total;
    saveBest(best);
    showBest();
  }
  const lang = getSave().lang;
  endTitle.textContent = kind === 'finish' ? t(lang, 'finish') : t(lang, 'crash');
  const starEl = document.getElementById('stars');
  if (starEl) starEl.textContent = '★★★'.slice(0, stars) + '☆☆☆'.slice(stars);
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
  if (endTotal) endTotal.textContent = total.toLocaleString('zh-CN');
  endScore.textContent = score.toLocaleString('zh-CN');
  endDistance.textContent = `${distanceBonus.toLocaleString('zh-CN')} 米`;
  endPerfect.hidden = perfect === 0;
  endPerfect.textContent = `全旗门 +${perfect}`;
  endGates.textContent = `${passed}/${relevant.length}`;
  endFlakes.textContent = String(course.flakes.filter((f) => f.collected).length);
  endFoxes.textContent = String(course.foxes.filter((f) => f.collected).length);
  endTime.textContent = formatTime(elapsed);
  const saved = bestFor(currentLevel);
  endBest.textContent = saved ? formatTime(saved.time) : '—';
  renderCourses();
  screenEnd.hidden = false;
}

function step(dt) {
  const menu = mode === 'menu';
  if (menu) {
    skier.idle(dt);
    updateCamera(dt, Math.sin(performance.now() * 0.00025) * 1.15, 0.85);
  } else if (mode === 'paused') {
    updateCamera(dt, 0, 0);
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
    if (!events.crashed && rider.z >= finishLine) {
      mode = 'finishwait';
      finishTimer = 0.7;
      effects.burst(rider.x, rider.y + 1, rider.z, 28);
    } else if (events.crashed) {
      mode = 'crash';
      crashTimer = 1.15;
      crashKind = events.crashed;
      effects.burst(rider.x, rider.y + 0.6, rider.z, 36);
      buzz('crash');
    } else {
      const gateEvents = crossGates(course.gates, fromX, fromZ, rider.x, rider.z, combo);
      for (const ev of gateEvents) {
        if (ev.type === 'gate') {
          score += ev.points;
          popup(ev.mult > 1 ? `旗门 +${ev.points}  连击` : `旗门 +${ev.points}`);
          buzz('gate');
        }
      }
      carveCooldown -= dt;
      if (Math.abs(input.steer) > 0.35 && rider.speed > 8 && carveCooldown <= 0) {
        playCarve();
        carveCooldown = 0.28;
      }
      setWind(rider.speed / 28);
      const picks = collectPickups(course, rider.x, rider.z);
      for (const ev of picks) {
        score += ev.points;
        popup(ev.type === 'fox' ? `北狐 +${ev.points}` : `雪花 +${ev.points}`);
      }
      const n = Math.max(2, Math.round(dt * 60 * (rider.speed > 8 ? 5 : 2)));
      if (rider.onGround && rider.speed > 7) {
        sprayFrom(-1, n);
        sprayFrom(1, n);
      } else {
        if (events.spray === 'left' || events.spray === 'both') sprayFrom(-1, n);
        if (events.spray === 'right' || events.spray === 'both') sprayFrom(1, n);
      }
      if (events.jumped) effects.burst(rider.x, rider.y, rider.z, 10);
      if (events.landed) {
        effects.burst(rider.x, rider.y + 0.2, rider.z, 16);
        buzz('land');
      }
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
  if (e.code === 'Escape' && mode === 'play') {
    pauseGame();
    return;
  }
  if (e.code === 'Enter' || (e.code === 'Space' && mode !== 'play' && mode !== 'crash' && mode !== 'finishwait' && mode !== 'paused')) {
    e.preventDefault();
    if (mode === 'end') beginRun();
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
document.getElementById('btn-again').addEventListener('click', () => {
  if (mode === 'end') beginRun();
});
document.getElementById('btn-end-menu').addEventListener('click', () => showMenu());
document.getElementById('btn-pause').addEventListener('click', () => pauseGame());
document.getElementById('btn-resume').addEventListener('click', () => resumeGame());
document.getElementById('btn-retry').addEventListener('click', () => beginRun());
document.getElementById('btn-quit').addEventListener('click', () => showMenu());
document.getElementById('btn-settings').addEventListener('click', () => openSettings());
document.getElementById('btn-settings-close').addEventListener('click', () => closeSettings());
document.getElementById('btn-how').addEventListener('click', () => {
  document.getElementById('screen-tutorial').hidden = false;
});
document.getElementById('btn-tutorial').addEventListener('click', () => {
  patchSave({ tutorialDone: true });
  document.getElementById('screen-tutorial').hidden = true;
  const pending = document.body.dataset.pendingLevel;
  if (pending) beginRun(pending);
});
document.getElementById('btn-lang').addEventListener('click', () => {
  patchSave({ lang: getSave().lang === 'zh' ? 'en' : 'zh' });
  applyLang();
});
document.getElementById('btn-calibrate').addEventListener('click', () => {
  const landscape = window.matchMedia('(orientation: landscape)').matches;
  const zero = landscape ? tiltBeta : tiltGamma;
  patchSave({ tiltZero: zero });
  const note = document.getElementById('cal-note');
  note.hidden = false;
  note.textContent = t(getSave().lang, 'calibrated');
  unlockAudio();
});
for (const id of ['set-sound', 'set-music', 'set-haptics', 'set-controls', 'set-quality']) {
  document.getElementById(id).addEventListener('click', () => cycleSetting(id));
}

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

function lang() {
  return getSave().lang || 'zh';
}

function applyLang() {
  const code = lang();
  document.documentElement.lang = code === 'zh' ? 'zh-CN' : 'en';
  document.title = t(code, 'title');
  for (const el of document.querySelectorAll('[data-i18n]')) {
    el.textContent = t(code, el.dataset.i18n);
  }
  const langBtn = document.getElementById('btn-lang');
  if (langBtn) langBtn.textContent = code === 'zh' ? 'English' : '中文';
  refreshSettingLabels();
  renderCourses();
}

function refreshSettingLabels() {
  const save = getSave();
  const code = lang();
  const onOff = (v) => (v ? t(code, 'on') : t(code, 'off'));
  document.getElementById('set-sound').textContent = onOff(save.sound);
  document.getElementById('set-music').textContent = onOff(save.music);
  document.getElementById('set-haptics').textContent = onOff(save.haptics);
  document.getElementById('set-controls').textContent = t(code, save.controls);
  const q = save.quality === 'auto' ? 'auto' : save.quality;
  document.getElementById('set-quality').textContent = t(code, q);
  document.body.dataset.controls = save.controls;
  setAudio({ sound: save.sound, music: save.music });
}

function renderCourses() {
  const root = document.getElementById('course-list');
  if (!root) return;
  const code = lang();
  root.replaceChildren();
  for (const id of ['green', 'red', 'black', 'night']) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'course';
    const open = isUnlocked(id);
    btn.disabled = !open;
    const bestTime = bestFor(id);
    const earned = starsFor(id);
    const stars = `${'★'.repeat(earned)}${'☆'.repeat(3 - earned)}`;
    const meta = open
      ? `${stars}  ${bestTime ? `${t(code, 'best')} ${formatTime(bestTime.time)}` : t(code, 'none')}`
      : t(code, 'locked');
    btn.innerHTML = `<span><b>${t(code, id)}</b><small>${meta}</small></span>`;
    btn.addEventListener('click', () => requestRun(id));
    root.append(btn);
  }
}

function requestRun(level) {
  unlockAudio();
  const go = () => {
    if (!getSave().tutorialDone) {
      document.body.dataset.pendingLevel = level;
      document.getElementById('screen-tutorial').hidden = false;
      return;
    }
    beginRun(level);
  };
  const ask = window.DeviceOrientationEvent && typeof window.DeviceOrientationEvent.requestPermission === 'function';
  if (ask) window.DeviceOrientationEvent.requestPermission().then(go).catch(go);
  else go();
}

function showMenu() {
  mode = 'menu';
  document.body.dataset.mode = 'menu';
  hud.hidden = true;
  hint.hidden = true;
  screenEnd.hidden = true;
  document.getElementById('screen-pause').hidden = true;
  document.getElementById('screen-settings').hidden = true;
  document.getElementById('screen-tutorial').hidden = true;
  screenStart.hidden = false;
  renderCourses();
}

function pauseGame() {
  if (mode !== 'play') return;
  mode = 'paused';
  document.body.dataset.mode = 'paused';
  document.getElementById('screen-pause').hidden = false;
  stopAudio();
}

function resumeGame() {
  if (mode !== 'paused') return;
  mode = 'play';
  document.body.dataset.mode = 'play';
  document.getElementById('screen-pause').hidden = true;
  resumeAudio();
}

function openSettings() {
  refreshSettingLabels();
  document.getElementById('screen-settings').hidden = false;
}

function closeSettings() {
  document.getElementById('screen-settings').hidden = true;
}

function cycleSetting(id) {
  const save = getSave();
  if (id === 'set-sound') patchSave({ sound: !save.sound });
  if (id === 'set-music') patchSave({ music: !save.music });
  if (id === 'set-haptics') patchSave({ haptics: !save.haptics });
  if (id === 'set-controls') {
    const order = ['both', 'tilt', 'touch'];
    patchSave({ controls: order[(order.indexOf(save.controls) + 1) % order.length] });
  }
  if (id === 'set-quality') {
    const order = ['auto', 'high', 'medium', 'low'];
    const next = order[(order.indexOf(save.quality) + 1) % order.length];
    patchSave({ quality: next });
    pipeline.setQuality(next === 'auto' ? autoQuality() : next);
  }
  refreshSettingLabels();
  unlockAudio();
}

function syncChrome() {
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  document.body.classList.toggle('is-touch', coarse);
  const portrait = window.matchMedia('(orientation: portrait)').matches;
  document.body.classList.toggle('portrait', coarse && portrait);
}

window.addEventListener('deviceorientation', (event) => {
  if (event.beta != null) tiltBeta = event.beta;
  if (event.gamma != null) tiltGamma = event.gamma;
});
window.addEventListener('orientationchange', syncChrome);
window.matchMedia('(orientation: portrait)').addEventListener('change', syncChrome);

for (const zone of [document.getElementById('zone-left'), document.getElementById('zone-right')]) {
  const name = zone.id === 'zone-left' ? 'left' : 'right';
  zone.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    if (getSave().controls === 'tilt') return;
    keys[name] = true;
  });
  zone.addEventListener('pointerup', () => { keys[name] = false; });
  zone.addEventListener('pointercancel', () => { keys[name] = false; });
  zone.addEventListener('pointerleave', () => { keys[name] = false; });
}

document.getElementById('context-restore').addEventListener('click', () => {
  document.getElementById('context-restore').hidden = true;
  if (mode === 'paused') resumeGame();
});
renderer.domElement.addEventListener('webglcontextlost', (event) => {
  event.preventDefault();
  if (mode === 'play') pauseGame();
  document.getElementById('context-restore').hidden = false;
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    if (mode === 'play') pauseGame();
    stopAudio();
  } else resumeAudio();
});

syncChrome();
applyLang();
pipeline.setQuality(getSave().quality === 'auto' ? autoQuality() : getSave().quality);
bootNative((active) => {
  if (!active && mode === 'play') pauseGame();
  if (active) resumeAudio();
  else stopAudio();
});

showBest();
document.body.dataset.mode = 'menu';

let last = performance.now();
let accumulator = 0;
let booted = false;
function frame(now) {
  if (!booted) return;
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

loadAssets()
  .then((assets) => {
    createTerrain(scene);
    world = createWorld(scene, course, assets);
    effects = createEffects(scene);
    skier = createSkier(scene, assets.skier);
    skier.reset();
    prevX = skier.rider.x;
    prevZ = skier.rider.z;
    updateCamera(0.016, 0, 0.85);
    draw();
    booted = true;
    last = performance.now();
    requestAnimationFrame(frame);
  })
  .catch((error) => {
    console.error(error);
    fail('场景资源加载失败');
  });
