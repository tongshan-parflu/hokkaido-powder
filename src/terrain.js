import * as THREE from 'three';
import { COURSE_LENGTH, HALF_WIDTH, courseCenter, terrainHeight, terrainNormal } from './course.js';
import { createSnowMaterial } from './materials.js';

export function createTerrain(scene) {
  const segX = 140;
  const segZ = 260;
  const geo = new THREE.PlaneGeometry(HALF_WIDTH * 2, COURSE_LENGTH, segX, segZ);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  const colors = new Float32Array(pos.count * 3);
  const piste = new Float32Array(pos.count);
  const normal = { x: 0, y: 1, z: 0 };
  const color = new THREE.Color();
  const warm = new THREE.Color(0xfff4e8);
  const cool = new THREE.Color(0xb7c9e2);
  const sunDir = new THREE.Vector3(-0.92, 0.32, -0.22).normalize();

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i) + COURSE_LENGTH / 2;
    const y = terrainHeight(x, z);
    pos.setXYZ(i, x, y, z);
    uv.setXY(i, x * 0.045, z * 0.045);
    terrainNormal(x, z, normal);
    const ndl = Math.max(0, normal.x * sunDir.x + normal.y * sunDir.y + normal.z * sunDir.z);
    color.copy(cool).lerp(warm, 0.25 + 0.75 * ndl);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
    const adx = Math.abs(x - courseCenter(z));
    piste[i] = adx <= 8 ? 1 : adx >= 20 ? 0 : (20 - adx) / 12;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.setAttribute('aPiste', new THREE.BufferAttribute(piste, 1));
  geo.computeVertexNormals();
  geo.computeBoundingSphere();

  const mesh = new THREE.Mesh(geo, createSnowMaterial());
  mesh.receiveShadow = true;
  scene.add(mesh);
  return mesh;
}
