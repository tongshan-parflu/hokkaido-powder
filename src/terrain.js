import * as THREE from 'three';
import { COURSE_LENGTH, HALF_WIDTH, terrainHeight, terrainNormal } from './course.js';

export function createTerrain(scene) {
  const segX = 80;
  const segZ = 260;
  const geo = new THREE.PlaneGeometry(HALF_WIDTH * 2, COURSE_LENGTH, segX, segZ);
  geo.rotateX(-Math.PI / 2);

  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  const colors = new Float32Array(pos.count * 3);
  const lit = new THREE.Color(0xf7f8fb);
  const shade = new THREE.Color(0xd5e0ec);
  const normal = { x: 0, y: 1, z: 0 };
  const color = new THREE.Color();

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i) + COURSE_LENGTH / 2;
    const y = terrainHeight(x, z);
    pos.setX(i, x);
    pos.setY(i, y);
    pos.setZ(i, z);
    uv.setXY(i, x * 0.07, z * 0.07);

    terrainNormal(x, z, normal);
    const slopeLight = Math.max(0, Math.min(1, normal.y));
    color.copy(shade).lerp(lit, 0.42 + 0.58 * slopeLight);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }

  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  geo.computeBoundingSphere();

  const mesh = new THREE.Mesh(
    geo,
    new THREE.MeshLambertMaterial({
      color: 0xf4f7fb,
      vertexColors: true,
    }),
  );
  mesh.matrixAutoUpdate = false;
  mesh.updateMatrix();
  scene.add(mesh);
  return mesh;
}
