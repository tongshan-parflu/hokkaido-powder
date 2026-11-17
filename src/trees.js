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

export function createPineGeometry() {
  const parts = [];
  const layers = [
    { r: 2.5, h: 2.4, y: 0.2, c: 0x16362c },
    { r: 2.0, h: 2.1, y: 1.15, c: 0x1c4034 },
    { r: 1.45, h: 1.8, y: 2.15, c: 0x143028 },
    { r: 0.85, h: 1.4, y: 3.15, c: 0x1a3c30 },
  ];
  for (const layer of layers) {
    const cone = new THREE.ConeGeometry(layer.r, layer.h, 9);
    const skirt = cone.attributes.position;
    for (let vi = 0; vi < skirt.count; vi++) {
      const edge = Math.hypot(skirt.getX(vi), skirt.getZ(vi)) / layer.r;
      if (edge > 0.42) skirt.setY(vi, skirt.getY(vi) - layer.h * 0.22 * (edge - 0.42));
    }
    cone.translate(0, layer.y + layer.h / 2, 0);
    paint(cone, layer.c);
    parts.push(cone);
    const cap = new THREE.ConeGeometry(layer.r * 0.92, layer.h * 0.42, 8);
    cap.translate(0, layer.y + layer.h * 0.82, 0);
    paint(cap, 0xf4f8fc);
    parts.push(cap);
  }
  const tip = new THREE.SphereGeometry(0.28, 8, 6);
  tip.translate(0, 5.15, 0);
  paint(tip, 0xf7fbff);
  parts.push(tip);
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
        const dx = side * (42 + ((z * 0.13 + k * 17) % 36));
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
