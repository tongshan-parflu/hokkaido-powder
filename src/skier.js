import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { resetRider, stepPhysics } from './physics.js';
import { terrainHeight, terrainNormal } from './course.js';

const _normal = { x: 0, y: 1, z: 0 };
const _up = new THREE.Vector3();
const _forward = new THREE.Vector3();
const _right = new THREE.Vector3();
const _matrix = new THREE.Matrix4();
const _quat = new THREE.Quaternion();
const _worldUp = new THREE.Vector3(0, 1, 0);

function std(color, roughness, metalness = 0) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function add(parent, geo, material, x, y, z, rx = 0, ry = 0, rz = 0) {
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, rz);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function buildSkier() {
  const jacket = std(0x1c3f66, 0.62);
  const accent = std(0xc4483c, 0.55);
  const pants = std(0x1a1e28, 0.7);
  const boot = std(0x2a241c, 0.45);
  const skiMat = std(0x111216, 0.32, 0.25);
  const skiTop = std(0xd24a42, 0.4, 0.05);
  const helmet = std(0xf3f6f8, 0.22, 0.08);
  const lens = std(0xe38a3a, 0.08, 0.65);
  const dark = std(0x22262e, 0.4);
  const poleMat = std(0xd5d8de, 0.25, 0.7);
  const skin = std(0xe2b496, 0.6);

  const root = new THREE.Group();
  const spin = new THREE.Group();
  const bank = new THREE.Group();
  const hips = new THREE.Group();
  const upper = new THREE.Group();
  root.add(spin);
  spin.add(bank);
  bank.add(hips);
  hips.add(upper);
  upper.position.set(0, 0.98, 0.02);

  const skiGeo = new RoundedBoxGeometry(0.11, 0.025, 1.85, 2, 0.01);
  const skiL = add(hips, skiGeo, skiMat, -0.16, 0.04, 0.05);
  const skiR = add(hips, skiGeo, skiMat, 0.16, 0.04, 0.05);
  add(hips, new RoundedBoxGeometry(0.09, 0.012, 1.5, 2, 0.004), skiTop, -0.16, 0.058, 0.02);
  add(hips, new RoundedBoxGeometry(0.09, 0.012, 1.5, 2, 0.004), skiTop, 0.16, 0.058, 0.02);
  const tip = new RoundedBoxGeometry(0.09, 0.02, 0.28, 2, 0.01);
  add(hips, tip, skiMat, -0.16, 0.07, 0.95, -0.45);
  add(hips, tip, skiMat, 0.16, 0.07, 0.95, -0.45);

  add(hips, new RoundedBoxGeometry(0.14, 0.16, 0.32, 2, 0.02), boot, -0.16, 0.16, 0.02);
  add(hips, new RoundedBoxGeometry(0.14, 0.16, 0.32, 2, 0.02), boot, 0.16, 0.16, 0.02);
  const shinL = new THREE.Group();
  const shinR = new THREE.Group();
  shinL.position.set(-0.15, 0.28, 0);
  shinR.position.set(0.15, 0.28, 0);
  hips.add(shinL, shinR);
  add(shinL, new RoundedBoxGeometry(0.13, 0.42, 0.13, 2, 0.03), pants, 0, 0.2, 0);
  add(shinR, new RoundedBoxGeometry(0.13, 0.42, 0.13, 2, 0.03), pants, 0, 0.2, 0);
  add(hips, new RoundedBoxGeometry(0.16, 0.4, 0.16, 2, 0.03), pants, -0.14, 0.72, 0);
  add(hips, new RoundedBoxGeometry(0.16, 0.4, 0.16, 2, 0.03), pants, 0.14, 0.72, 0);
  add(hips, new RoundedBoxGeometry(0.4, 0.22, 0.24, 2, 0.04), pants, 0, 0.9, 0);

  add(upper, new RoundedBoxGeometry(0.48, 0.5, 0.26, 3, 0.04), jacket, 0, 0.28, 0.02);
  add(upper, new RoundedBoxGeometry(0.22, 0.16, 0.08, 2, 0.02), accent, 0, 0.42, 0.14);
  add(upper, new RoundedBoxGeometry(0.28, 0.32, 0.12, 2, 0.02), dark, 0, 0.3, -0.12);

  const armL = new THREE.Group();
  const armR = new THREE.Group();
  armL.position.set(-0.3, 0.42, 0.02);
  armR.position.set(0.3, 0.42, 0.02);
  upper.add(armL, armR);
  add(armL, new RoundedBoxGeometry(0.1, 0.36, 0.1, 2, 0.02), jacket, 0, -0.16, 0);
  add(armR, new RoundedBoxGeometry(0.1, 0.36, 0.1, 2, 0.02), jacket, 0, -0.16, 0);
  add(armL, new RoundedBoxGeometry(0.09, 0.1, 0.1, 2, 0.02), dark, 0, -0.36, 0.02);
  add(armR, new RoundedBoxGeometry(0.09, 0.1, 0.1, 2, 0.02), dark, 0, -0.36, 0.02);

  const head = add(upper, new THREE.SphereGeometry(0.145, 16, 12), skin, 0, 0.66, 0.03);
  head.scale.y = 0.94;
  const helm = add(upper, new THREE.SphereGeometry(0.168, 18, 14), helmet, 0, 0.7, 0.0);
  helm.scale.set(1.02, 0.72, 1.05);
  add(upper, new RoundedBoxGeometry(0.22, 0.055, 0.04, 2, 0.01), lens, 0, 0.64, 0.15);
  add(upper, new RoundedBoxGeometry(0.26, 0.09, 0.025, 2, 0.008), dark, 0, 0.64, 0.13);

  const poleGeo = new THREE.CylinderGeometry(0.012, 0.01, 1.25, 6);
  poleGeo.translate(0, -0.62, 0);
  const poleL = add(armL, poleGeo, poleMat, 0, -0.4, 0.04, 0.35, 0, 0.15);
  const poleR = add(armR, poleGeo, poleMat, 0, -0.4, 0.04, 0.35, 0, -0.15);

  const shadowGeo = new THREE.CircleGeometry(0.62, 20);
  shadowGeo.rotateX(-Math.PI / 2);
  const shadow = new THREE.Mesh(
    shadowGeo,
    new THREE.MeshBasicMaterial({ color: 0x5c6c80, transparent: true, opacity: 0.22, depthWrite: false }),
  );
  shadow.frustumCulled = false;

  return { root, spin, bank, hips, upper, armL, armR, shinL, shinR, skiL, skiR, poleL, poleR, shadow };
}

export function createSkier(scene) {
  const mesh = buildSkier();
  scene.add(mesh.root);
  scene.add(mesh.shadow);
  const rider = {
    x: 0, z: 0, y: 0, vx: 0, vz: 0, vy: 0, heading: 0, speed: 0, onGround: true,
  };
  let steerSm = 0;
  let tuckSm = 0;
  let time = 0;

  function place(stick) {
    const n = terrainNormal(rider.x, rider.z, _normal);
    const blend = stick ? 1 : 0.15;
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
    terrainNormal(rider.x, rider.z, _normal);
    mesh.shadow.position.set(rider.x, ground + 0.05, rider.z);
    _up.set(_normal.x, _normal.y, _normal.z);
    mesh.shadow.quaternion.setFromUnitVectors(_worldUp, _up);
    const air = Math.max(0, rider.y - ground);
    mesh.shadow.material.opacity = 0.22 * Math.max(0, 1 - air / 4);
  }

  function pose(dt, steer, tuck, airborne) {
    time += dt;
    steerSm += (steer - steerSm) * (1 - Math.exp(-8 * dt));
    tuckSm += ((tuck ? 1 : 0) - tuckSm) * (1 - Math.exp(-6 * dt));
    const air = airborne ? 1 : 0;
    mesh.bank.rotation.z = steerSm * 0.52;
    mesh.bank.rotation.x = tuckSm * 0.08;
    mesh.hips.position.y = Math.sin(time * Math.min(rider.speed, 16) * 0.45) * 0.02 - tuckSm * 0.08;
    mesh.upper.rotation.x = 0.18 + tuckSm * 0.72 - air * 0.25;
    mesh.upper.position.y = 0.98 - tuckSm * 0.16;
    mesh.upper.position.z = tuckSm * 0.12;
    mesh.armL.rotation.x = 0.35 + tuckSm * 0.7;
    mesh.armR.rotation.x = 0.35 + tuckSm * 0.7;
    mesh.armL.rotation.z = 0.25 + steerSm * 0.2;
    mesh.armR.rotation.z = -0.25 + steerSm * 0.2;
    mesh.shinL.rotation.x = tuckSm * 0.35 + air * -0.2;
    mesh.shinR.rotation.x = tuckSm * 0.35 + air * -0.2;
    mesh.skiL.rotation.z = steerSm * 0.18;
    mesh.skiR.rotation.z = steerSm * 0.18;
    mesh.poleL.rotation.x = 0.35 + tuckSm * 0.45 + Math.sin(time * 2.2) * 0.05;
    mesh.poleR.rotation.x = 0.35 + tuckSm * 0.45 + Math.sin(time * 2.2 + 1) * 0.05;
  }

  return {
    rider,
    reset() {
      resetRider(rider);
      steerSm = 0;
      tuckSm = 0;
      mesh.spin.rotation.set(0, 0, 0);
      pose(0.016, 0, false, false);
      place(true);
    },
    update(dt, input, env) {
      const events = stepPhysics(rider, dt, input, env);
      pose(dt, input.steer || 0, !!(input.tuck && !input.brake), !rider.onGround);
      place(rider.onGround);
      return events;
    },
    idle(dt) {
      pose(dt, Math.sin(time * 0.4) * 0.15, false, false);
      place(true);
    },
    tumble(dt) {
      time += dt;
      rider.vx *= Math.exp(-2.8 * dt);
      rider.vz *= Math.exp(-2.8 * dt);
      rider.x += rider.vx * dt;
      rider.z += rider.vz * dt;
      rider.y = terrainHeight(rider.x, rider.z);
      mesh.root.position.set(rider.x, rider.y + 0.3, rider.z);
      mesh.spin.rotation.x += dt * 5.2;
      mesh.spin.rotation.z += dt * 3.1;
      mesh.shadow.position.set(rider.x, rider.y + 0.06, rider.z);
    },
    glideStop(dt) {
      rider.vx *= Math.exp(-3.2 * dt);
      rider.vz *= Math.exp(-3.2 * dt);
      rider.x += rider.vx * dt;
      rider.z += rider.vz * dt;
      rider.onGround = true;
      rider.y = terrainHeight(rider.x, rider.z);
      pose(dt, 0, false, false);
      place(true);
    },
  };
}
