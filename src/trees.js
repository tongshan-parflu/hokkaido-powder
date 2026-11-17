import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createBarkTextures } from './materials.js';
import { courseCenter, terrainHeight } from './course.js';

const swayTime = { value: 0 };

function attachSway(mat) {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uSway = swayTime;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uSway;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
       transformed.x += sin(uSway + position.y * 0.35) * position.y * 0.012;`,
      );
  };
}

export function setTreeSway(time) {
  swayTime.value = time;
}

function paint(geo, hex) {
  const color = new THREE.Color(hex);
  const count = geo.attributes.position.count;
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geo;
}

export function createBirchParts() {
  const { map, normal } = createBarkTextures();
  const trunkParts = [];
  for (const [ox, oz, h] of [[0, 0, 7.2], [-1.15, 0.45, 5.6], [0.95, -0.35, 6.1]]) {
    const trunk = new THREE.CylinderGeometry(0.13, 0.2, h, 7, 3);
    trunk.translate(ox, h / 2, oz);
    trunkParts.push(trunk);
  }
  const trunkGeo = mergeGeometries(trunkParts, false);
  trunkParts.forEach((g) => g.dispose());
  const trunkMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map,
    normalMap: normal,
    roughness: 0.78,
    metalness: 0.0,
  });

  const parts = [];
  for (let i = 0; i < 8; i++) {
    const h = 1.4 + (i % 3) * 0.45;
    const branch = new THREE.CylinderGeometry(0.02, 0.055, h, 5);
    branch.translate(0, h / 2, 0);
    const ang = (i / 8) * Math.PI * 2;
    branch.rotateZ(0.85);
    branch.rotateY(ang);
    branch.translate(Math.cos(ang) * 0.08, 4.6 + (i % 4) * 0.7, Math.sin(ang) * 0.08);
    paint(branch, i % 2 ? 0x4a4036 : 0x3a332c);
    parts.push(branch);
    if (i % 2 === 0) {
      const snow = new THREE.SphereGeometry(0.48 + (i % 3) * 0.08, 8, 6);
      snow.translate(Math.cos(ang) * 0.7, 5.3 + (i % 4) * 0.55, Math.sin(ang) * 0.7);
      paint(snow, 0xf7fbff);
      parts.push(snow);
    }
  }
  const crown = mergeGeometries(parts, false);
  parts.forEach((g) => g.dispose());
  crown.computeVertexNormals();
  const crownMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.72,
    metalness: 0.0,
  });
  attachSway(crownMat);
  return { trunkGeo, trunkMat, crown, crownMat };
}

function paintFir(geo) {
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const snow = new THREE.Color(0xf4f7fb);
  const needle = new THREE.Color(0x1d4036);
  const frost = new THREE.Color(0xd5e0ea);
  let minY = Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  const span = Math.max(0.001, maxY - minY);
  for (let i = 0; i < pos.count; i++) {
    const y = (pos.getY(i) - minY) / span;
    const edge = Math.hypot(pos.getX(i), pos.getZ(i));
    const color = needle.clone();
    color.lerp(frost, Math.min(1, y * 0.65 + edge * 0.08));
    color.lerp(snow, Math.min(1, y * 0.85));
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geo;
}

function firTier(radius, height, y, seed) {
  const cone = new THREE.ConeGeometry(radius, height, 12);
  const pos = cone.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const rad = Math.hypot(x, z);
    const edge = radius > 0 ? rad / radius : 0;
    const ang = Math.atan2(z, x);
    const jag = 1 + 0.22 * Math.sin(ang * 4 + seed) + 0.1 * Math.sin(ang * 9 + seed * 2);
    if (rad > 0.02) {
      pos.setX(i, (x / rad) * rad * jag);
      pos.setZ(i, (z / rad) * rad * jag);
    }
    if (edge > 0.28) pos.setY(i, pos.getY(i) - height * 0.38 * (edge - 0.28));
  }
  cone.translate(0, y + height * 0.32, 0);
  return paintFir(cone);
}

export function createPineGeometry(seed = 1) {
  const parts = [];
  const tiers = 9;
  let y = 0.2;
  for (let i = 0; i < tiers; i++) {
    const t = i / (tiers - 1);
    const radius = 3.1 * (1 - t * 0.82);
    const height = 1.55 + (1 - t) * 0.85;
    parts.push(firTier(radius, height, y, seed + i * 1.7));
    const clumps = 2;
    for (let c = 0; c < clumps; c++) {
      const ang = seed * 2 + i * 0.7 + (c / clumps) * Math.PI * 2;
      const clump = new THREE.SphereGeometry(radius * 0.2, 6, 5);
      clump.scale(1.15, 0.42, 0.9);
      clump.translate(Math.cos(ang) * radius * 0.42, y + height * 0.48, Math.sin(ang) * radius * 0.42);
      paint(clump, 0xf7fbff);
      parts.push(clump);
    }
    y += height * 0.46;
  }
  const merged = mergeGeometries(parts, false);
  parts.forEach((g) => g.dispose());
  merged.computeVertexNormals();
  return merged;
}

function forestTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 384;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 256, 384);
  const tree = (x, base, h, w, snowy) => {
    ctx.fillStyle = '#1c3a30';
    ctx.beginPath();
    ctx.moveTo(x, base - h);
    ctx.lineTo(x - w, base);
    ctx.lineTo(x + w, base);
    ctx.fill();
    ctx.fillStyle = '#f4f7fb';
    ctx.beginPath();
    ctx.moveTo(x, base - h - 6);
    ctx.lineTo(x - w * 0.55, base - h * 0.62);
    ctx.lineTo(x + w * 0.55, base - h * 0.62);
    ctx.fill();
    if (snowy) {
      ctx.fillStyle = '#f7f4ee';
      ctx.fillRect(x - 3, base - h * 0.92, 6, h * 0.7);
    }
  };
  tree(70, 360, 200, 48, false);
  tree(128, 370, 250, 58, false);
  tree(186, 358, 180, 42, true);
  tree(40, 368, 140, 30, true);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function addHillForest(scene) {
  const tex = forestTexture();
  const geo = new THREE.PlaneGeometry(11, 16);
  geo.translate(0, 8, 0);
  const mat = new THREE.MeshStandardMaterial({
    map: tex,
    transparent: true,
    alphaTest: 0.35,
    roughness: 0.85,
    side: THREE.DoubleSide,
  });
  const count = 420;
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  const dummy = new THREE.Object3D();
  let n = 0;
  for (let z = 30; z < 1900 && n < count; z += 22) {
    for (const side of [-1, 1]) {
      for (let k = 0; k < 2 && n < count; k++) {
        const dx = side * (58 + ((z * 0.13 + k * 17) % 48));
        const x = courseCenter(z) + dx;
        dummy.position.set(x, terrainHeight(x, z), z + ((k * 5) % 9));
        dummy.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
        const s = 0.85 + ((z + k) % 7) * 0.16;
        dummy.scale.set(s, s * (0.85 + (k % 3) * 0.1), s);
        dummy.updateMatrix();
        mesh.setMatrixAt(n, dummy.matrix);
        n += 1;
      }
    }
  }
  mesh.count = n;
  mesh.instanceMatrix.needsUpdate = true;
  mesh.frustumCulled = false;
  scene.add(mesh);
}
