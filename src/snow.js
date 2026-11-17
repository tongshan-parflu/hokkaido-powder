import * as THREE from 'three';

function softCircle() {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.85)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makePoints(count, size) {
  const positions = new Float32Array(count * 3);
  const geo = new THREE.BufferGeometry();
  const attr = new THREE.BufferAttribute(positions, 3);
  attr.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('position', attr);
  const mat = new THREE.PointsMaterial({
    color: 0xffffff,
    size,
    map: softCircle(),
    transparent: true,
    opacity: 0.82,
    depthWrite: false,
    sizeAttenuation: true,
    fog: false,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  return { points, positions, attr, count };
}

export function createEffects(scene) {
  const snowCount = 520;
  const snow = makePoints(snowCount, 3.6);
  snow.points.material.sizeAttenuation = false;
  snow.points.material.opacity = 0.88;
  scene.add(snow.points);
  const flakes = [];
  for (let i = 0; i < snowCount; i++) {
    flakes.push({
      x: (Math.random() - 0.5) * 26,
      y: -2 + Math.random() * 14,
      z: -5 - Math.random() * 24,
      fall: 1.6 + Math.random() * 2.4,
      drift: Math.random() * Math.PI * 2,
    });
  }
  const flakeOffset = new THREE.Vector3();

  const sprayCount = 200;
  const spray = makePoints(sprayCount, 0.55);
  spray.points.material.opacity = 0.7;
  scene.add(spray.points);
  const pool = [];
  for (let i = 0; i < sprayCount; i++) {
    pool.push({ x: 0, y: -400, z: 0, vx: 0, vy: 0, vz: 0, life: 0 });
  }
  let cursor = 0;

  const trailN = 48;
  const trailGeo = new THREE.BufferGeometry();
  const trailPos = new Float32Array(trailN * 4 * 3);
  const trailAttr = new THREE.BufferAttribute(trailPos, 3);
  trailAttr.setUsage(THREE.DynamicDrawUsage);
  trailGeo.setAttribute('position', trailAttr);
  const trailIndex = [];
  for (let i = 0; i < trailN; i++) {
    const a = i * 4;
    trailIndex.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  trailGeo.setIndex(trailIndex);
  const trail = new THREE.Mesh(
    trailGeo,
    new THREE.MeshBasicMaterial({
      color: 0x9aafc4,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    }),
  );
  trail.frustumCulled = false;
  trail.renderOrder = 1;
  scene.add(trail);
  const samples = Array.from({ length: trailN + 1 }, () => ({
    lx: 0, ly: 0, lz: 0, rx: 0, ry: 0, rz: 0, live: false,
  }));
  let head = 0;
  let lastSample = null;

  function writeTrail() {
    for (let i = 0; i < trailN; i++) {
      const a = samples[(head + i) % samples.length];
      const b = samples[(head + i + 1) % samples.length];
      const o = i * 12;
      const dx = b.lx - a.lx;
      const dz = b.lz - a.lz;
      const dist = Math.hypot(dx, dz);
      const live = a.live && b.live && dist < 2.4 && dist > 0.001;
      if (!live) {
        trailPos.fill(0, o, o + 12);
        continue;
      }
      const fade = (i + 1) / trailN;
      const half = 0.06 + fade * 0.2;
      const len = Math.hypot(b.rx - b.lx, b.rz - b.lz) || 1;
      const ox = ((b.rx - b.lx) / len) * half;
      const oz = ((b.rz - b.lz) / len) * half;
      const ax = (a.lx + a.rx) * 0.5;
      const az = (a.lz + a.rz) * 0.5;
      const bx = (b.lx + b.rx) * 0.5;
      const bz = (b.lz + b.rz) * 0.5;
      const ay = (a.ly + a.ry) * 0.5;
      const by = (b.ly + b.ry) * 0.5;
      const prevLen = Math.hypot(a.rx - a.lx, a.rz - a.lz) || 1;
      const pox = ((a.rx - a.lx) / prevLen) * half;
      const poz = ((a.rz - a.lz) / prevLen) * half;
      trailPos[o] = ax - pox;
      trailPos[o + 1] = ay;
      trailPos[o + 2] = az - poz;
      trailPos[o + 3] = ax + pox;
      trailPos[o + 4] = ay;
      trailPos[o + 5] = az + poz;
      trailPos[o + 6] = bx - ox;
      trailPos[o + 7] = by;
      trailPos[o + 8] = bz - oz;
      trailPos[o + 9] = bx + ox;
      trailPos[o + 10] = by;
      trailPos[o + 11] = bz + oz;
    }
    trailAttr.needsUpdate = true;
  }

  return {
    updateSnow(dt, camera) {
      const t = performance.now() * 0.001;
      for (let i = 0; i < flakes.length; i++) {
        const f = flakes[i];
        f.y -= f.fall * dt;
        f.x += Math.sin(t * 0.35 + f.drift) * dt * 0.8;
        if (f.y < -4) f.y += 16;
        if (f.x > 14) f.x -= 28;
        if (f.x < -14) f.x += 28;
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
        p.vy -= 6 * dt;
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
        p.life = 0.35 + Math.random() * 0.28;
        p.x = x + (Math.random() - 0.5) * 0.2;
        p.y = y + Math.random() * 0.15;
        p.z = z + (Math.random() - 0.5) * 0.2;
        p.vx = vx + (Math.random() - 0.5) * 0.8;
        p.vy = vy + Math.random() * 0.8;
        p.vz = vz + (Math.random() - 0.5) * 0.8;
      }
    },
    burst(x, y, z, n = 20) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const s = 1.5 + Math.random() * 3.5;
        this.emit(x, y, z, Math.cos(a) * s, 1.5 + Math.random() * 3, Math.sin(a) * s, 1);
      }
    },
    pushTrail(left, right) {
      const moved = lastSample
        ? Math.hypot(left.x - lastSample.x, left.z - lastSample.z)
        : 1;
      if (moved < 0.45) return;
      const s = samples[head];
      s.lx = left.x;
      s.ly = left.y;
      s.lz = left.z;
      s.rx = right.x;
      s.ry = right.y;
      s.rz = right.z;
      s.live = true;
      head = (head + 1) % samples.length;
      lastSample = { x: left.x, z: left.z };
      writeTrail();
    },
    breakTrail() {
      const s = samples[head];
      s.live = false;
      s.lx = s.ly = s.lz = s.rx = s.ry = s.rz = 0;
      head = (head + 1) % samples.length;
      lastSample = null;
      writeTrail();
    },
    resetTrail() {
      for (const s of samples) s.live = false;
      lastSample = null;
      head = 0;
      trailPos.fill(0);
      trailAttr.needsUpdate = true;
      for (const p of pool) p.life = 0;
    },
  };
}
