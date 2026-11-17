import * as THREE from 'three';
import { resetRider, stepPhysics } from './physics.js';
import { terrainHeight, terrainNormal } from './course.js';

const _normal = { x: 0, y: 1, z: 0 };
const _up = new THREE.Vector3();
const _forward = new THREE.Vector3();
const _right = new THREE.Vector3();
const _matrix = new THREE.Matrix4();
const _quat = new THREE.Quaternion();
const _worldUp = new THREE.Vector3(0, 1, 0);

function mat(color) {
  return new THREE.MeshLambertMaterial({ color, flatShading: true });
}

function box(parent, w, h, d, x, y, z, material, rx = 0, ry = 0, rz = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, rz);
  parent.add(mesh);
  return mesh;
}

function buildMesh() {
  const jacket = mat(0xc53636);
  const pants = mat(0x1d2944);
  const boot = mat(0x2a241c);
  const ski = mat(0x16181c);
  const stripe = mat(0xd64545);
  const helmet = mat(0xf3f6f8);
  const lens = mat(0xe0893a);
  const dark = mat(0x22262c);
  const poleMat = mat(0xc5c9d0);
  const skin = mat(0xe0b294);

  const root = new THREE.Group();
  const spin = new THREE.Group();
  const lean = new THREE.Group();
  const upper = new THREE.Group();
  root.add(spin);
  spin.add(lean);
  lean.add(upper);
  upper.position.set(0, 0.98, 0);

  box(lean, 0.1, 0.02, 1.72, -0.16, 0.03, 0.08, ski);
  box(lean, 0.1, 0.02, 1.72, 0.16, 0.03, 0.08, ski);
  box(lean, 0.07, 0.012, 1.45, -0.16, 0.05, 0.08, stripe);
  box(lean, 0.07, 0.012, 1.45, 0.16, 0.05, 0.08, stripe);
  box(lean, 0.12, 0.12, 0.3, -0.16, 0.12, 0.02, boot);
  box(lean, 0.12, 0.12, 0.3, 0.16, 0.12, 0.02, boot);
  box(lean, 0.12, 0.4, 0.12, -0.15, 0.4, 0.0, pants);
  box(lean, 0.12, 0.4, 0.12, 0.15, 0.4, 0.0, pants);
  box(lean, 0.14, 0.36, 0.16, -0.14, 0.74, 0.0, pants);
  box(lean, 0.14, 0.36, 0.16, 0.14, 0.74, 0.0, pants);
  box(lean, 0.38, 0.2, 0.22, 0, 0.9, 0, pants);

  box(upper, 0.46, 0.46, 0.24, 0, 0.26, 0.02, jacket);
  box(upper, 0.3, 0.34, 0.14, 0, 0.28, -0.14, dark);
  box(upper, 0.12, 0.34, 0.12, -0.3, 0.28, 0.02, jacket, 0, 0, 0.18);
  box(upper, 0.12, 0.34, 0.12, 0.3, 0.28, 0.02, jacket, 0, 0, -0.18);
  box(upper, 0.1, 0.1, 0.1, -0.36, 0.1, 0.08, dark);
  box(upper, 0.1, 0.1, 0.1, 0.36, 0.1, 0.08, dark);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 6), skin);
  head.position.set(0, 0.62, 0.02);
  head.scale.y = 0.92;
  upper.add(head);
  const helm = new THREE.Mesh(new THREE.SphereGeometry(0.165, 8, 6), helmet);
  helm.position.set(0, 0.66, -0.01);
  helm.scale.set(1, 0.72, 1);
  upper.add(helm);
  box(upper, 0.2, 0.055, 0.04, 0, 0.6, 0.14, lens);
  box(upper, 0.24, 0.085, 0.03, 0, 0.6, 0.125, dark);

  const poleGeo = new THREE.CylinderGeometry(0.015, 0.012, 1.2, 4);
  poleGeo.translate(0, -0.6, 0);
  const poleL = new THREE.Mesh(poleGeo, poleMat);
  const poleR = new THREE.Mesh(poleGeo, poleMat);
  poleL.position.set(-0.38, 0.12, 0.06);
  poleR.position.set(0.38, 0.12, 0.06);
  poleL.rotation.set(0.28, 0, 0.22);
  poleR.rotation.set(0.28, 0, -0.22);
  upper.add(poleL, poleR);

  const shadowGeo = new THREE.CircleGeometry(0.55, 16);
  shadowGeo.rotateX(-Math.PI / 2);
  const shadow = new THREE.Mesh(
    shadowGeo,
    new THREE.MeshBasicMaterial({
      color: 0x66788e,
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
    }),
  );
  shadow.frustumCulled = false;

  return { root, spin, lean, upper, poleL, poleR, shadow };
}

export function createSkier(scene) {
  const mesh = buildMesh();
  scene.add(mesh.root);
  scene.add(mesh.shadow);

  const rider = {
    x: 0,
    z: 0,
    y: 0,
    vx: 0,
    vz: 0,
    vy: 0,
    heading: 0,
    speed: 0,
    onGround: true,
  };

  let steerSm = 0;
  let tuckSm = 0;
  let time = 0;

  function place(stickToSlope) {
    const n = terrainNormal(rider.x, rider.z, _normal);
    const blend = stickToSlope ? 1 : 0.12;
    _up.set(n.x * blend, n.y * blend + (1 - blend), n.z * blend).normalize();
    _forward.set(Math.sin(rider.heading), 0, Math.cos(rider.heading));
    _forward.addScaledVector(_up, -_forward.dot(_up));
    if (_forward.lengthSq() < 1e-8) _forward.set(0, 0, 1);
    _forward.normalize();
    _right.crossVectors(_up, _forward).normalize();
    _matrix.makeBasis(_right, _up, _forward);
    _quat.setFromRotationMatrix(_matrix);
    mesh.root.quaternion.copy(_quat);
    mesh.root.position.set(rider.x, rider.y, rider.z);
    mesh.spin.rotation.set(0, 0, 0);

    const ground = terrainHeight(rider.x, rider.z);
    const gn = terrainNormal(rider.x, rider.z, _normal);
    mesh.shadow.position.set(rider.x, ground + 0.07, rider.z);
    _up.set(gn.x, gn.y, gn.z);
    mesh.shadow.quaternion.setFromUnitVectors(_worldUp, _up);
    const air = Math.max(0, rider.y - ground);
    mesh.shadow.material.opacity = 0.28 * Math.max(0, 1 - air / 5);
    mesh.shadow.scale.setScalar(1 + air * 0.15);
  }

  function pose(dt, steer, tuck) {
    time += dt;
    steerSm += (steer - steerSm) * (1 - Math.exp(-8 * dt));
    tuckSm += ((tuck ? 1 : 0) - tuckSm) * (1 - Math.exp(-7 * dt));
    mesh.lean.rotation.z = steerSm * 0.46;
    mesh.lean.rotation.x = tuckSm * 0.05;
    mesh.lean.position.y = Math.sin(time * Math.min(rider.speed, 18) * 0.55) * 0.018;
    mesh.upper.rotation.x = 0.14 + tuckSm * 0.68;
    mesh.upper.position.y = 0.98 - tuckSm * 0.24;
    mesh.upper.position.z = tuckSm * 0.16;
    mesh.poleL.rotation.x = 0.28 + tuckSm * 0.55;
    mesh.poleR.rotation.x = 0.28 + tuckSm * 0.55;
  }

  return {
    rider,
    reset() {
      resetRider(rider);
      steerSm = 0;
      tuckSm = 0;
      mesh.spin.rotation.set(0, 0, 0);
      pose(0.016, 0, false);
      place(true);
    },
    update(dt, input, env) {
      const events = stepPhysics(rider, dt, input, env);
      pose(dt, input.steer || 0, !!(input.tuck && !input.brake));
      place(rider.onGround);
      return events;
    },
    idle(dt) {
      pose(dt, Math.sin(time * 0.45) * 0.22, false);
      place(true);
    },
    tumble(dt) {
      time += dt;
      rider.vx *= Math.exp(-2.8 * dt);
      rider.vz *= Math.exp(-2.8 * dt);
      rider.x += rider.vx * dt;
      rider.z += rider.vz * dt;
      rider.y = terrainHeight(rider.x, rider.z);
      mesh.root.position.set(rider.x, rider.y + 0.28, rider.z);
      mesh.spin.rotation.x += dt * 5.5;
      mesh.spin.rotation.z += dt * 3.4;
      mesh.shadow.position.set(rider.x, rider.y + 0.08, rider.z);
      mesh.shadow.material.opacity = 0.22;
    },
    glideStop(dt) {
      rider.vx *= Math.exp(-3.2 * dt);
      rider.vz *= Math.exp(-3.2 * dt);
      rider.x += rider.vx * dt;
      rider.z += rider.vz * dt;
      rider.onGround = true;
      rider.y = terrainHeight(rider.x, rider.z);
      pose(dt, 0, false);
      place(true);
    },
  };
}
