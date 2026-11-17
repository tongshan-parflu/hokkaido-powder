import * as THREE from 'three';
import { puffTexture } from './materials.js';

function makePoints(count, size, attenuation, opacity) {
  const positions = new Float32Array(count * 3);
  const geo = new THREE.BufferGeometry();
  const attr = new THREE.BufferAttribute(positions, 3);
  attr.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('position', attr);
  const mat = new THREE.PointsMaterial({
    color: 0xffffff,
    size,
    map: puffTexture(),
    transparent: true,
    opacity,
    depthWrite: false,
    sizeAttenuation: attenuation,
    fog: false,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  return { points, positions, attr };
}

export function createEffects(scene) {
  const snowCount = 880;
  const snow = makePoints(snowCount, 4.4, false, 0.82);
  scene.add(snow.points);
  const flakes = [];
  for (let i = 0; i < snowCount; i++) {
    flakes.push({
      x: (Math.random() - 0.5) * 28,
      y: -1 + Math.random() * 16,
      z: -4 - Math.random() * 26,
      fall: 0.55 + Math.random() * 0.9,
      drift: Math.random() * Math.PI * 2,
    });
  }
  const flakeOffset = new THREE.Vector3();

  const sprayCount = 360;
  const spray = makePoints(sprayCount, 1.35, true, 0.62);
  scene.add(spray.points);
  const pool = [];
  for (let i = 0; i < sprayCount; i++) pool.push({ x: 0, y: -500, z: 0, vx: 0, vy: 0, vz: 0, life: 0 });
  let cursor = 0;

  const N = 72;
  const cols = 6;
  const trailPos = new Float32Array(N * cols * 3);
  const trailCol = new Float32Array(N * cols * 3);
  const trailGeo = new THREE.BufferGeometry();
  const trailAttr = new THREE.BufferAttribute(trailPos, 3);
  trailAttr.setUsage(THREE.DynamicDrawUsage);
  trailGeo.setAttribute('position', trailAttr);
  trailGeo.setAttribute('color', new THREE.BufferAttribute(trailCol, 3));
  const index = [];
  for (let i = 0; i < N - 1; i++) {
    for (let k = 0; k < cols - 1; k++) {
      const a = i * cols + k;
      index.push(a, a + cols, a + 1, a + 1, a + cols, a + cols + 1);
    }
  }
  trailGeo.setIndex(index);
  const trail = new THREE.Mesh(
    trailGeo,
    new THREE.MeshBasicMaterial({
      color: 0xd5deea,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  trail.frustumCulled = false;
  trail.renderOrder = 2;
  scene.add(trail);
  const samples = Array.from({ length: N }, () => ({ x: 0, y: 0, z: 0, hx: 0, hz: 1, live: false }));
  let head = 0;
  let last = null;

  function writeTrail() {
    let ax = 0;
    let ay = -400;
    let az = 0;
    let has = false;
    for (let i = 0; i < N; i++) {
      const s = samples[(head + i) % N];
      if (s.live) {
        ax = s.x;
        ay = s.y;
        az = s.z;
        has = true;
      }
      const fade = i / (N - 1);
      const w = s.live ? 0.2 + fade * 0.26 : 0;
      const rx = s.hz || 1;
      const rz = -s.hx;
      const heights = [0.07, 0.015, -0.05, -0.05, 0.015, 0.07];
      const widths = [-1.15, -0.58, -0.18, 0.18, 0.58, 1.15];
      for (let k = 0; k < cols; k++) {
        const o = (i * cols + k) * 3;
        trailPos[o] = (has ? ax : 0) + rx * widths[k] * w;
        trailPos[o + 1] = (has ? ay : -400) + (s.live ? heights[k] : 0);
        trailPos[o + 2] = (has ? az : 0) + rz * widths[k] * w;
      }
    }
    trailAttr.needsUpdate = true;
    trailGeo.setDrawRange(0, has ? Infinity : 0);
  }

  return {
    updateSnow(dt, camera) {
      const t = performance.now() * 0.001;
      for (let i = 0; i < flakes.length; i++) {
        const f = flakes[i];
        f.y -= f.fall * dt;
        f.x += Math.sin(t * 0.25 + f.drift) * dt * 0.35;
        if (f.y < -3.5) f.y += 16;
        if (f.x > 15) f.x -= 30;
        if (f.x < -15) f.x += 30;
        flakeOffset.set(f.x, f.y, f.z);
        flakeOffset.applyQuaternion(camera.quaternion);
        snow.positions[i * 3] = camera.position.x + flakeOffset.x;
        snow.positions[i * 3 + 1] = camera.position.y + flakeOffset.y;
        snow.positions[i * 3 + 2] = camera.position.z + flakeOffset.z;
      }
      snow.attr.needsUpdate = true;
      for (let i = 0; i < pool.length; i++) {
        const p = pool[i];
        if (p.life <= 0) {
          spray.positions[i * 3 + 1] = -400;
          continue;
        }
        p.life -= dt;
        p.vy -= 1.6 * dt;
        p.vx *= 1 - 0.4 * dt;
        p.vz *= 1 - 0.4 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.z += p.vz * dt;
        spray.positions[i * 3] = p.x;
        spray.positions[i * 3 + 1] = p.y;
        spray.positions[i * 3 + 2] = p.z;
      }
      spray.attr.needsUpdate = true;
    },
    emit(x, y, z, vx, vy, vz, n = 1) {
      for (let i = 0; i < n; i++) {
        const p = pool[cursor];
        cursor = (cursor + 1) % pool.length;
        p.life = 0.7 + Math.random() * 0.55;
        p.x = x + (Math.random() - 0.5) * 0.3;
        p.y = y + Math.random() * 0.2;
        p.z = z + (Math.random() - 0.5) * 0.3;
        p.vx = vx + (Math.random() - 0.5) * 0.6;
        p.vy = vy + Math.random() * 1.4;
        p.vz = vz + (Math.random() - 0.5) * 0.6;
      }
    },
    burst(x, y, z, n = 24) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const s = 0.8 + Math.random() * 2.2;
        this.emit(x, y, z, Math.cos(a) * s, 1.2 + Math.random() * 2.4, Math.sin(a) * s, 1);
      }
    },
    pushTrail(x, y, z, hx, hz) {
      if (last && Math.hypot(x - last.x, z - last.z) < 0.42) return;
      const s = samples[head];
      s.x = x;
      s.y = y;
      s.z = z;
      s.hx = hx;
      s.hz = hz;
      s.live = true;
      head = (head + 1) % N;
      last = { x, z };
      writeTrail();
    },
    breakTrail() {
      samples[head].live = false;
      head = (head + 1) % N;
      last = null;
      writeTrail();
    },
    resetTrail() {
      for (const s of samples) s.live = false;
      last = null;
      head = 0;
      trailPos.fill(0);
      trailAttr.needsUpdate = true;
      for (const p of pool) p.life = 0;
    },
  };
}
