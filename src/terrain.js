import * as THREE from 'three';
import { COURSE_LENGTH, HALF_WIDTH, terrainHeight, terrainNormal } from './course.js';
import { createSnowMaterial } from './materials.js';

export function createTerrain(scene) {
  const segX = 140;
  const segZ = 260;
  const geo = new THREE.PlaneGeometry(HALF_WIDTH * 2, COURSE_LENGTH, segX, segZ);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  const colors = new Float32Array(pos.count * 3);
  const normal = { x: 0, y: 1, z: 0 };
  const color = new THREE.Color();
  const lit = new THREE.Color(0xf7f5f2);
  const shade = new THREE.Color(0xd5dee8);

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i) + COURSE_LENGTH / 2;
    const y = terrainHeight(x, z);
    pos.setXYZ(i, x, y, z);
    uv.setXY(i, x * 0.16, z * 0.16);
    terrainNormal(x, z, normal);
    const light = Math.max(0, Math.min(1, normal.y));
    color.copy(shade).lerp(lit, 0.35 + 0.65 * Math.pow(light, 0.65));
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  geo.computeBoundingSphere();

  const mesh = new THREE.Mesh(geo, createSnowMaterial());
  mesh.receiveShadow = true;
  scene.add(mesh);
  return mesh;
}
