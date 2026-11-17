import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createBarkTextures } from './materials.js';

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
  const trunkGeo = new THREE.CylinderGeometry(0.16, 0.24, 8.2, 8, 4);
  trunkGeo.translate(0, 4.1, 0);
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
      const snow = new THREE.SphereGeometry(0.28 + (i % 3) * 0.05, 8, 6);
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
  return { trunkGeo, trunkMat, crown, crownMat };
}

export function createPineGeometry() {
  const parts = [];
  const layers = [
    { r: 1.7, h: 2.3, y: 0.35, c: 0x1a3a30 },
    { r: 1.35, h: 2.05, y: 1.45, c: 0x21483a },
    { r: 1.0, h: 1.8, y: 2.5, c: 0x17342c },
    { r: 0.66, h: 1.45, y: 3.45, c: 0x1e4036 },
  ];
  for (const layer of layers) {
    const cone = new THREE.ConeGeometry(layer.r, layer.h, 8);
    cone.translate(0, layer.y + layer.h / 2, 0);
    paint(cone, layer.c);
    parts.push(cone);
    const cap = new THREE.ConeGeometry(layer.r * 0.72, layer.h * 0.28, 8);
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
