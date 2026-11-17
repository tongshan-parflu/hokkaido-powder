import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {
  FINISH_Z,
  courseCenter,
  slopeElevation,
  terrainHeight,
} from './course.js';
import { cloneAnimated, instanceTrees, prepareTree } from './models.js';
import { puffTexture } from './materials.js';

function std(color, roughness, metalness = 0, extras = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extras });
}

function stripeTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  for (let i = 0; i < 10; i++) {
    ctx.fillStyle = i % 2 ? '#f7f4ee' : '#d23b32';
    ctx.fillRect(0, i * 25.6, 32, 25.6);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function signTexture(text) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 220;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#6a4632';
  ctx.fillRect(0, 0, 512, 220);
  ctx.fillStyle = '#f3e6d0';
  ctx.fillRect(18, 18, 476, 184);
  ctx.fillStyle = '#3a2618';
  ctx.font = '700 72px "Noto Sans JP", "WenQuanYi Micro Hei", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 118);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function yoteiGeometry(radius, height) {
  const radial = 120;
  const rows = 56;
  const positions = [];
  const colors = [];
  const indices = [];
  const forest = new THREE.Color(0x1a3328);
  const rock = new THREE.Color(0x5c564e);
  const snow = new THREE.Color(0xf7f9fc);
  const gully = new THREE.Color(0xc5d0dc);
  const color = new THREE.Color();
  const stride = radial + 1;
  for (let iy = 0; iy <= rows; iy++) {
    const t = iy / rows;
    let r;
    let y = t * height;
    if (t < 0.9) r = radius * (1 - t);
    else {
      const k = (t - 0.9) / 0.1;
      r = radius * 0.1 * (1 - 0.35 * k);
      y = height * (0.92 - 0.03 * k);
    }
    for (let ix = 0; ix <= radial; ix++) {
      const ang = (ix / radial) * Math.PI * 2;
      const gullies = t > 0.18 && t < 0.82 ? Math.sin(ang * 9.0) * 0.055 * r + Math.sin(ang * 3.0) * 0.02 * r : 0;
      const rr = Math.max(0, r + gullies);
      positions.push(Math.cos(ang) * rr, y, Math.sin(ang) * rr);
      if (t < 0.34) color.copy(forest);
      else if (t < 0.48) color.copy(forest).lerp(rock, (t - 0.34) / 0.14);
      else if (t < 0.58) color.copy(rock).lerp(snow, (t - 0.48) / 0.1);
      else color.copy(snow);
      if (t > 0.45 && t < 0.84) color.lerp(gully, (0.5 + 0.5 * Math.sin(ang * 9.0)) * 0.28);
      const light = Math.cos(ang) * 0.9 + 0.08;
      if (light > 0) color.lerp(new THREE.Color(0xffc4aa), Math.min(0.42, light * 0.5));
      else color.lerp(new THREE.Color(0x7f9abd), Math.min(0.4, -light * 0.55));
      colors.push(color.r, color.g, color.b);
    }
  }
  const topCenter = positions.length / 3;
  positions.push(0, height * 0.96, 0);
  colors.push(snow.r, snow.g, snow.b);
  for (let iy = 0; iy < rows; iy++) {
    for (let ix = 0; ix < radial; ix++) {
      const a = iy * stride + ix;
      indices.push(a, a + stride, a + 1, a + 1, a + stride, a + stride + 1);
    }
  }
  const capRow = rows * stride;
  for (let ix = 0; ix < radial; ix++) {
    indices.push(topCenter, capRow + ix + 1, capRow + ix);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function smooth(t, a, b) {
  const x = Math.max(0, Math.min(1, (t - a) / (b - a)));
  return x * x * (3 - 2 * x);
}

let foxSource = null;
const foxMixers = [];

function makeFox() {
  if (foxSource) {
    const model = cloneAnimated(foxSource, 1.15);
    const mixer = new THREE.AnimationMixer(model);
    const clip = foxSource.animations.find((clip) => clip.name === 'Survey') || foxSource.animations[0];
    if (clip) mixer.clipAction(clip).play();
    foxMixers.push(mixer);
    const group = new THREE.Group();
    group.add(model);
    group.traverse((obj) => {
      if (obj.isMesh) obj.castShadow = true;
    });
    return group;
  }
  const orange = std(0xe07a32, 0.55);
  const white = std(0xfff6ee, 0.6);
  const dark = std(0x1c1c1c, 0.4);
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.34, 12, 10), orange);
  body.scale.set(1.15, 0.72, 0.85);
  body.position.y = 0.38;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), orange);
  head.position.set(0, 0.62, 0.28);
  const snout = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), white);
  snout.scale.z = 1.4;
  snout.position.set(0, 0.56, 0.44);
  const earGeo = new THREE.ConeGeometry(0.06, 0.16, 6);
  const earL = new THREE.Mesh(earGeo, orange);
  const earR = new THREE.Mesh(earGeo, orange);
  earL.position.set(-0.1, 0.82, 0.22);
  earR.position.set(0.1, 0.82, 0.22);
  const tail = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), orange);
  tail.scale.set(0.7, 0.7, 2.2);
  tail.position.set(0, 0.48, -0.42);
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), white);
  tip.position.set(0, 0.52, -0.66);
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 6), dark);
  const eyeL = eye.clone();
  const eyeR = eye.clone();
  eyeL.position.set(-0.07, 0.66, 0.42);
  eyeR.position.set(0.07, 0.66, 0.42);
  group.add(body, head, snout, earL, earR, tail, tip, eyeL, eyeR);
  group.traverse((obj) => {
    if (obj.isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });
  return group;
}

function makeCrane() {
  const white = std(0xf7f7f5, 0.55);
  const black = std(0x1a1a1a, 0.5);
  const red = std(0xc43030, 0.45);
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.35, 10, 8), white);
  body.scale.set(1.1, 0.7, 1.8);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.9, 6), black);
  neck.position.set(0, 0.45, 0.45);
  neck.rotation.x = 0.7;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), black);
  head.position.set(0, 0.82, 0.78);
  const crown = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 6), red);
  crown.position.set(0, 0.9, 0.74);
  const wingGeo = new THREE.BoxGeometry(1.1, 0.04, 0.38);
  const wingL = new THREE.Mesh(wingGeo, white);
  const wingR = new THREE.Mesh(wingGeo, white);
  wingL.position.set(-0.7, 0.08, 0);
  wingR.position.set(0.7, 0.08, 0);
  const tipL = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.03, 0.22), black);
  const tipR = tipL.clone();
  tipL.position.set(-1.2, 0.08, 0.05);
  tipR.position.set(1.2, 0.08, 0.05);
  group.add(body, neck, head, crown, wingL, wingR, tipL, tipR);
  group.userData.wings = [wingL, wingR, tipL, tipR];
  return group;
}

function makeDeer() {
  const hide = std(0x8a5a32, 0.7);
  const dark = std(0x3a2a22, 0.6);
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.45, 12, 8), hide);
  body.scale.set(0.7, 0.55, 1.25);
  body.position.y = 0.85;
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 0.45, 6), hide);
  neck.position.set(0, 1.15, 0.4);
  neck.rotation.x = 0.5;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), hide);
  head.position.set(0, 1.38, 0.58);
  const leg = new THREE.CylinderGeometry(0.05, 0.04, 0.7, 5);
  for (const [x, z] of [[-0.18, 0.28], [0.18, 0.28], [-0.18, -0.28], [0.18, -0.28]]) {
    const m = new THREE.Mesh(leg, dark);
    m.position.set(x, 0.35, z);
    group.add(m);
  }
  group.add(body, neck, head);
  group.traverse((obj) => {
    if (obj.isMesh) obj.castShadow = true;
  });
  return group;
}

function addDistantRanges(scene, foot) {
  const ranges = [
    { x: -2400, z: 6400, r: 1700, h: 380, c: 0xd5e2f0 },
    { x: 1900, z: 6200, r: 1500, h: 320, c: 0xc9d6e8 },
    { x: 200, z: 7200, r: 2100, h: 460, c: 0xe0eaf6 },
  ];
  for (const range of ranges) {
    const geo = new THREE.SphereGeometry(1, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.45);
    const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: range.c }));
    mesh.scale.set(range.r, range.h * 0.45, range.r * 0.4);
    mesh.position.set(range.x, 80, range.z + 400);
    scene.add(mesh);
  }
}

function buildHut(scene, z, dx) {
  const x = courseCenter(z) + dx;
  const y = terrainHeight(x, z);
  const wood = std(0x7a5340, 0.7);
  const group = new THREE.Group();
  group.position.set(x, y, z);
  const hall = new THREE.Mesh(new THREE.BoxGeometry(8, 3.2, 5), wood);
  hall.position.y = 1.6;
  hall.castShadow = true;
  const roof = new THREE.Mesh(new THREE.BoxGeometry(9.2, 0.55, 6.2), std(0xf7f8fb, 0.8));
  roof.position.y = 3.4;
  roof.castShadow = true;
  const winMat = new THREE.MeshStandardMaterial({
    color: 0xffd7a1,
    emissive: 0xffb15e,
    emissiveIntensity: 0.45,
    roughness: 0.2,
  });
  const win = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.2), winMat);
  win.position.set(0, 1.8, 2.52);
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(3.4, 0.9),
    new THREE.MeshStandardMaterial({ map: signTexture('山小屋'), roughness: 0.6 }),
  );
  sign.position.set(0, 2.7, 2.56);
  group.add(hall, roof, win, sign);
  scene.add(group);
  const lamp = new THREE.PointLight(0xffb15a, 0.6, 14, 2);
  lamp.position.set(x, y + 2.4, z + 3);
  lamp.userData.night = 8;
  lamp.userData.day = 0.35;
  scene.add(lamp);
  return lamp;
}

function cableBetween(a, b, material) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, len, 5), material);
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  return mesh;
}

export function createWorld(scene, course, assets) {
  foxSource = assets?.fox || null;
  const yoteiH = 1000;
  const yoteiR = yoteiH * 2;
  const yoteiX = -140;
  const yoteiZ = 4600;
  const foot = 40;
  const yotei = new THREE.Mesh(
    yoteiGeometry(yoteiR, yoteiH),
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.86, metalness: 0 }),
  );
  yotei.position.set(yoteiX, foot, yoteiZ);
  scene.add(yotei);
  addDistantRanges(scene, 240);

  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(3200, 2000, 1, 1),
    new THREE.MeshBasicMaterial({ color: 0x3c6274 }),
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(yoteiX - 1600, 20, yoteiZ + 400);
  sea.material.color.set(0xc5d6e4);
  scene.add(sea);

  const dummy = new THREE.Object3D();
  const pines = course.trees.filter((t) => t.kind === 'pine');
  if (assets?.pines) {
    const near = [];
    const far = [];
    pines.forEach((tree, i) => {
      const spot = {
        x: tree.x,
        y: terrainHeight(tree.x, tree.z),
        z: tree.z,
        rot: tree.rot,
        scale: 0.85 + (tree.scale || 1) * 0.35,
      };
      if (tree.z < 340) near.push({ ...spot, scale: spot.scale * 1.15 });
      else if (far.length < 380) far.push(spot);
    });
    const hero = assets.pines.map((root) => prepareTree(root, 16, 0.48));
    hero.forEach((parts, variant) => {
      const list = near.filter((_, i) => i % hero.length === variant);
      instanceTrees(scene, parts, list);
    });
    const snowy = assets.snowTrees.map((root) => prepareTree(root, 11, 0.35));
    snowy.forEach((parts, variant) => {
      const list = far.filter((_, i) => i % snowy.length === variant);
      instanceTrees(scene, parts, list);
    });
    const valley = [];
    for (let i = 0; i < 160; i++) {
      const ang = (i / 160) * Math.PI * 2;
      const rad = 2300 + (i % 7) * 80;
      const x = yoteiX + Math.cos(ang) * rad;
      const z = yoteiZ + Math.sin(ang) * rad * 0.55;
      if (z < 2300 || Math.abs(x) < 80) continue;
      valley.push({ x, y: 48, z, rot: ang, scale: 1.4 + (i % 5) * 0.25 });
    }
    instanceTrees(scene, snowy[0], valley);
  }

  const rockGeo = new THREE.IcosahedronGeometry(0.9, 1);
  const rockPos = rockGeo.attributes.position;
  const rockColors = new Float32Array(rockPos.count * 3);
  const stone = new THREE.Color(0x7a808c);
  const cap = new THREE.Color(0xf4f7fb);
  for (let i = 0; i < rockPos.count; i++) {
    const c = rockPos.getY(i) > 0.25 ? cap : stone;
    rockColors[i * 3] = c.r;
    rockColors[i * 3 + 1] = c.g;
    rockColors[i * 3 + 2] = c.b;
  }
  rockGeo.setAttribute('color', new THREE.BufferAttribute(rockColors, 3));
  if (course.rocks.length) {
    const rocks = new THREE.InstancedMesh(
      rockGeo,
      new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.86 }),
      course.rocks.length,
    );
    course.rocks.forEach((rock, i) => {
      dummy.position.set(rock.x, terrainHeight(rock.x, rock.z) - 0.2, rock.z);
      dummy.rotation.set(rock.rot, rock.rot * 0.6, 0);
      dummy.scale.set(rock.sx, rock.sy, rock.sz);
      dummy.updateMatrix();
      rocks.setMatrixAt(i, dummy.matrix);
    });
    rocks.instanceMatrix.needsUpdate = true;
    rocks.receiveShadow = true;
    rocks.castShadow = true;
    rocks.frustumCulled = false;
    scene.add(rocks);
  }

  const poleGeo = new THREE.CylinderGeometry(0.07, 0.08, 3.1, 8);
  const poleMat = new THREE.MeshStandardMaterial({ map: stripeTexture(), roughness: 0.45 });
  const flagMat = std(0xd23b32, 0.5);
  const flagGeo = new THREE.BufferGeometry();
  flagGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, 0.7, 0, 1.15, 0.28, 0.05], 3));
  flagGeo.computeVertexNormals();
  const gateViews = course.gates.map((gate) => {
    const flags = [];
    for (const side of [-1, 1]) {
      const px = gate.x + side * gate.half;
      const py = terrainHeight(px, gate.z);
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.set(px, py + 1.55, gate.z);
      pole.castShadow = true;
      const flag = new THREE.Mesh(flagGeo, flagMat);
      flag.position.set(px, py + 2.7, gate.z);
      flag.scale.x = -side;
      flag.userData.phase = gate.index + side;
      scene.add(pole, flag);
      flags.push(flag);
    }
    return { flags };
  });

  const foxViews = course.foxes.map((fox) => {
    const group = makeFox();
    const y = terrainHeight(fox.x, fox.z);
    group.position.set(fox.x, y, fox.z);
    group.rotation.y = fox.rot;
    scene.add(group);
    return { group, baseY: y };
  });

  const gemMat = new THREE.MeshStandardMaterial({
    color: 0xf7fbff,
    roughness: 0.15,
    metalness: 0.08,
    emissive: 0xb9d4ee,
    emissiveIntensity: 0.2,
  });
  const flakeViews = course.flakes.map((flake) => {
    const mesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.28, 0), gemMat);
    mesh.position.set(flake.x, terrainHeight(flake.x, flake.z) + 1.15, flake.z);
    scene.add(mesh);
    return { mesh, baseY: mesh.position.y };
  });

  const metal = std(0x8d9298, 0.35, 0.75);
  const cabinMat = std(0x8e2e32, 0.45, 0.1);
  const glass = new THREE.MeshStandardMaterial({
    color: 0xffe1b0,
    roughness: 0.15,
    metalness: 0.1,
    emissive: 0xffb15a,
    emissiveIntensity: 0.25,
  });
  const gondola = buildLift(scene, -18, 36, 920, 78, metal, cabinMat, glass, 1.6);
  const valley = buildValleyCable(scene);
  const chair = buildLift(scene, 17, 58, 780, 86, metal, std(0x243044, 0.5), glass, 0.7);

  const lodge = buildLodge(scene);
  if (assets?.lodge) buildAssetLodge(scene, assets.lodge);
  else buildVistaLodge(scene);
  const hutLamp = buildHut(scene, 210, 22);
  const cranes = [];
  const craneSpots = [
    [14, 22, 72],
    [30, 26, 96],
    [44, 23, 118],
  ];
  craneSpots.forEach(([dx, up, z], i) => {
    const bird = makeCrane();
    const x = courseCenter(z) + dx;
    bird.userData.phase = i * 0.8;
    bird.userData.anchor = new THREE.Vector3(x, terrainHeight(x, z) + up, z);
    bird.scale.setScalar(2.2);
    bird.position.copy(bird.userData.anchor);
    scene.add(bird);
    cranes.push(bird);
  });
  const deer = [18, -22].map((dx, i) => {
    const z = 460 + i * 520;
    const x = courseCenter(z) + dx;
    const mesh = makeDeer();
    mesh.position.set(x, terrainHeight(x, z), z);
    mesh.rotation.y = dx > 0 ? -0.8 : 0.6;
    scene.add(mesh);
    return mesh;
  });

  const signs = [
    [32, 8, '羊蹄コース'],
    [96, -12, '白樺林'],
    [240, 14, '中級'],
  ];
  for (const [z, dx, text] of signs) {
    const x = courseCenter(z) + dx;
    const y = terrainHeight(x, z);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 1.7, 6), std(0x6b4632, 0.7));
    post.position.set(x, y + 0.85, z);
    post.castShadow = true;
    const board = new THREE.Mesh(
      new THREE.PlaneGeometry(4.4, 1.5),
      new THREE.MeshStandardMaterial({ map: signTexture(text), roughness: 0.7 }),
    );
    board.position.set(x, y + 1.8, z);
    board.rotation.y = Math.PI + (dx > 0 ? -0.4 : 0.4);
    scene.add(post, board);
  }
  const markerGeo = new THREE.CylinderGeometry(0.055, 0.07, 2.4, 6);
  const markerMat = new THREE.MeshStandardMaterial({ map: stripeTexture(), roughness: 0.42 });
  const markers = new THREE.InstancedMesh(markerGeo, markerMat, 12);
  const marker = new THREE.Object3D();
  let markerCount = 0;
  for (const z of [40, 62, 88, 118]) {
    for (const dx of [-8, 8]) {
      const x = courseCenter(z) + dx;
      marker.position.set(x, terrainHeight(x, z) + 1.2, z);
      marker.updateMatrix();
      markers.setMatrixAt(markerCount, marker.matrix);
      markerCount += 1;
    }
  }
  markers.count = markerCount;
  markers.instanceMatrix.needsUpdate = true;
  markers.castShadow = true;
  scene.add(markers);
  const greeter = makeFox();
  const foxX = courseCenter(42) - 8;
  greeter.position.set(foxX, terrainHeight(foxX, 50), 50);
  greeter.rotation.y = 0.9;
  scene.add(greeter);

  const nightLights = [...lodge.lights, ...gondola.lamps, ...chair.lamps, hutLamp];
  const windows = lodge.windows;

  let time = 0;
  return {
    followSky() {},
    update(dt) {
      time += dt;
      for (const mixer of foxMixers) mixer.update(dt);
      for (const view of gateViews) {
        for (const flag of view.flags) {
          flag.rotation.y = Math.sin(time * 2.2 + flag.userData.phase) * 0.25;
        }
      }
      course.foxes.forEach((fox, i) => {
        const view = foxViews[i];
        if (!view) return;
        if (fox.collected) {
          const s = view.group.scale.x - dt * 3;
          if (s <= 0) view.group.visible = false;
          else view.group.scale.setScalar(Math.max(0, s));
          return;
        }
        view.group.position.y = view.baseY + Math.sin(time * 2 + fox.phase) * 0.05;
      });
      course.flakes.forEach((flake, i) => {
        const view = flakeViews[i];
        if (flake.collected) {
          view.mesh.visible = false;
          return;
        }
        view.mesh.rotation.y += dt * 1.4;
        view.mesh.position.y = view.baseY + Math.sin(time * 2 + flake.phase) * 0.12;
      });
      gondola.update(time);
      valley.update(time);
      chair.update(time);
      cranes.forEach((bird) => {
        const a = bird.userData.phase;
        const anchor = bird.userData.anchor;
        bird.position.set(
          anchor.x + Math.sin(time * 0.25 + a) * 6,
          anchor.y + Math.sin(time * 0.6 + a) * 1.2,
          anchor.z + time * 0.35,
        );
        bird.rotation.y = 0.4;
        const flap = Math.sin(time * 4.2 + a) * 0.55;
        for (const wing of bird.userData.wings) wing.rotation.z = wing.position.x > 0 ? -flap : flap;
      });
      lodge.steam.forEach((p, i) => {
        p.life -= dt;
        if (p.life <= 0) {
          p.life = 2.2 + Math.random();
          p.x = (Math.random() - 0.5) * 1.2;
          p.y = 0;
          p.z = (Math.random() - 0.5) * 1.2;
        }
        p.y += dt * 0.8;
        p.x += Math.sin(time + i) * dt * 0.15;
        const o = i * 3;
        lodge.steamPos[o] = lodge.origin.x + p.x;
        lodge.steamPos[o + 1] = lodge.origin.y + 5.2 + p.y;
        lodge.steamPos[o + 2] = lodge.origin.z + p.z;
      });
      lodge.steamAttr.needsUpdate = true;
      void deer;
    },
    setNight(on) {
      for (const light of nightLights) light.intensity = on ? light.userData.night : light.userData.day || 0;
      for (const mesh of windows) mesh.material.emissiveIntensity = on ? 1.5 : 0.28;
      glass.emissiveIntensity = on ? 0.9 : 0.22;
    },
    reset() {
      for (const view of foxViews) {
        view.group.visible = true;
        view.group.scale.setScalar(1);
      }
      for (const view of flakeViews) view.mesh.visible = true;
    },
  };
}

function addForestWalls(scene, pineGeo, pineMat) {
  const count = 720;
  const mesh = new THREE.InstancedMesh(pineGeo, pineMat, count);
  const dummy = new THREE.Object3D();
  let n = 0;
  for (let z = 40; z < 980 && n < count; z += 7) {
    for (const side of [-1, 1]) {
      for (let k = 0; k < 2 && n < count; k++) {
        if (side > 0 && z > 78 && z < 145) continue;
        const dx = side * (28 + k * 9 + ((z * 0.13) % 4));
        const x = courseCenter(z) + dx;
        dummy.position.set(x, terrainHeight(x, z) - 0.6, z + ((k * 3) % 5));
        dummy.rotation.y = (z * 0.17 + k * 1.7) % (Math.PI * 2);
        const s = 1.15 + ((Math.floor(z) + k * 3) % 5) * 0.18;
        dummy.scale.set(s * 0.92, s * 1.15, s);
        dummy.updateMatrix();
        mesh.setMatrixAt(n, dummy.matrix);
        n += 1;
      }
    }
  }
  mesh.count = n;
  mesh.instanceMatrix.needsUpdate = true;
  mesh.frustumCulled = false;
  mesh.castShadow = false;
  scene.add(mesh);
}

function buildValleyCable(scene) {
  const metal = std(0x4e555c, 0.4, 0.65);
  const body = std(0xd12626, 0.42, 0.04);
  const glass = new THREE.MeshStandardMaterial({
    color: 0xffe4bc,
    emissive: 0xffb15a,
    emissiveIntensity: 0.4,
    roughness: 0.16,
  });
  const z = 360;
  const yLift = 42;
  const points = [];
  for (let i = 0; i <= 5; i++) {
    const x = -40 + i * 28;
    const zz = z + Math.sin(i * 0.7) * 10;
    const base = terrainHeight(x, zz);
    const top = new THREE.Vector3(x, base + yLift, zz);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.26, yLift, 6), metal);
    pole.position.set(x, base + yLift * 0.5, zz);
    pole.castShadow = true;
    scene.add(pole);
    points.push(top);
  }
  for (let i = 0; i < points.length - 1; i++) scene.add(cableBetween(points[i], points[i + 1], metal));
  const cabins = [];
  for (let i = 0; i < 5; i++) {
    const cabin = new THREE.Group();
    const shell = new THREE.Mesh(new THREE.BoxGeometry(3.4, 2.3, 2.6), body);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(3.7, 0.28, 2.9), std(0xf7f4ee, 0.55));
    roof.position.y = 1.25;
    const win = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.85, 2.65), glass);
    win.position.y = 0.28;
    cabin.add(shell, roof, win);
    scene.add(cabin);
    cabins.push(cabin);
  }
  return {
    update(time) {
      const spans = points.length - 1;
      cabins.forEach((cabin, i) => {
        const u = (time * 0.025 + i / cabins.length) % 1;
        const f = u * spans;
        const a = Math.floor(f);
        const b = Math.min(spans, a + 1);
        cabin.position.lerpVectors(points[a], points[b], f - a);
        cabin.position.y -= 1.8;
      });
    },
  };
}

function buildAssetLodge(scene, parts) {
  const z = 86;
  const x = courseCenter(z) + 16;
  const y = terrainHeight(x, z);
  const group = new THREE.Group();
  group.position.set(x, y, z);
  group.rotation.y = Math.PI * 0.85;
  const add = (src, px, py, pz) => {
    const piece = src.clone(true);
    piece.position.set(px, py, pz);
    group.add(piece);
  };
  for (let i = 0; i < 4; i++) {
    add(i === 1 ? parts.door : i % 2 === 0 ? parts.win : parts.wall, (i - 1.5) * 2.05, 0, 0);
    add(parts.roof, (i - 1.5) * 2.05, 2.15, 0);
  }
  add(parts.logs, -4.2, 0, 0.4);
  add(parts.logs, 4.2, 0, 0.4);
  add(parts.chimney, 2.2, 2.15, 0.2);
  group.traverse((obj) => {
    if (obj.isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });
  scene.add(group);
  const glow = new THREE.PointLight(0xffb15a, 3.2, 28, 2);
  glow.position.set(x - 2, y + 2.4, z + 2);
  scene.add(glow);
  const windowMat = new THREE.MeshStandardMaterial({
    color: 0xffd7a1,
    emissive: 0xff9a3c,
    emissiveIntensity: 1.1,
    roughness: 0.2,
  });
  for (let i = 0; i < 4; i++) {
    const win = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.25), windowMat);
    win.position.set(x - 1.2 + (i - 1.5) * 1.6, y + 1.7, z + 2.4);
    scene.add(win);
  }
}

function buildVistaLodge(scene) {
  const z = 84;
  const x = courseCenter(z) + 20;
  const y = terrainHeight(x, z);
  const wood = std(0x6a4030, 0.68);
  const snowMat = std(0xf6f3ec, 0.78);
  const group = new THREE.Group();
  group.position.set(x, y, z);
  group.rotation.y = Math.PI / 2;
  group.scale.setScalar(1.55);
  const hall = new THREE.Mesh(new THREE.BoxGeometry(14, 4.4, 7.2), wood);
  hall.position.y = 2.2;
  hall.castShadow = true;
  const roof = new THREE.Mesh(new THREE.BoxGeometry(15.4, 0.7, 8.6), snowMat);
  roof.position.y = 4.7;
  roof.castShadow = true;
  const windowMat = new THREE.MeshStandardMaterial({
    color: 0xffd7a1,
    emissive: 0xffa040,
    emissiveIntensity: 0.85,
    roughness: 0.18,
  });
  for (let i = 0; i < 4; i++) {
    const win = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.5), windowMat);
    win.position.set(3.7, 2.4, -4.2 + i * 2.5);
    win.rotation.y = Math.PI / 2;
    group.add(win);
  }
  const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.6, 0.8), std(0x5c463c, 0.8));
  chimney.position.set(4.2, 5.6, 0.4);
  group.add(hall, roof, chimney);
  scene.add(group);
  const lamp = new THREE.PointLight(0xffb15a, 1.4, 18, 2);
  lamp.position.set(x, y + 3.2, z);
  scene.add(lamp);
}

function buildLift(scene, dx, z0, z1, step, metal, bodyMat, glass, scale) {
  const towers = [];
  for (let z = z0; z <= z1; z += step) {
    const x = courseCenter(z) + dx;
    const y = terrainHeight(x, z);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 7.5, 7), metal);
    pole.position.set(x, y + 3.7, z);
    pole.castShadow = true;
    const arm = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.12, 0.12), metal);
    arm.position.set(x, y + 7.2, z);
    scene.add(pole, arm);
    towers.push(new THREE.Vector3(x, y + 7.35, z));
  }
  for (let i = 0; i < towers.length - 1; i++) scene.add(cableBetween(towers[i], towers[i + 1], metal));
  const cabins = [];
  const count = Math.max(4, Math.floor(towers.length * 0.7));
  for (let i = 0; i < count; i++) {
    const cabin = new THREE.Group();
    const shell = new THREE.Mesh(new THREE.BoxGeometry(1.15 * scale, 0.9 * scale, 0.85 * scale), bodyMat);
    const win = new THREE.Mesh(new THREE.BoxGeometry(0.7 * scale, 0.38 * scale, 0.88 * scale), glass);
    win.position.y = 0.12 * scale;
    cabin.add(shell, win);
    scene.add(cabin);
    cabins.push(cabin);
  }
  const lamps = towers.filter((_, i) => i % 2 === 0).map((pos) => {
    const light = new THREE.PointLight(0xffc48a, 0, 18, 2);
    light.position.copy(pos);
    light.position.y -= 1.2;
    light.userData.night = 6;
    light.userData.day = 0;
    scene.add(light);
    return light;
  });
  return {
    lamps,
    update(time) {
      const spans = towers.length - 1;
      cabins.forEach((cabin, i) => {
        const u = (time * 0.045 + i / cabins.length) % 1;
        const f = u * spans;
        const a = Math.floor(f);
        const b = Math.min(spans, a + 1);
        const t = f - a;
        cabin.position.lerpVectors(towers[a], towers[b], t);
        cabin.position.y -= 0.7 * scale;
        const dir = new THREE.Vector3().subVectors(towers[b], towers[a]);
        if (dir.lengthSq() > 0.001) cabin.lookAt(cabin.position.x + dir.x, cabin.position.y, cabin.position.z + dir.z);
      });
    },
  };
}

function buildLodge(scene) {
  const z = FINISH_Z + 36;
  const x = courseCenter(z);
  const y = terrainHeight(x, z);
  const wood = std(0x7a5340, 0.72);
  const plaster = std(0xe7d7c4, 0.8);
  const snowMat = std(0xf4f7fb, 0.82);
  const group = new THREE.Group();
  group.position.set(x, y, z);
  const hall = new THREE.Mesh(new THREE.BoxGeometry(16, 4.2, 8), wood);
  hall.position.y = 2.1;
  hall.castShadow = true;
  hall.receiveShadow = true;
  const wing = new THREE.Mesh(new THREE.BoxGeometry(6, 3.2, 6), plaster);
  wing.position.set(9, 1.6, 1);
  wing.castShadow = true;
  const roof = new THREE.Mesh(new THREE.BoxGeometry(18, 0.7, 10), snowMat);
  roof.position.y = 4.6;
  roof.castShadow = true;
  const roof2 = new THREE.Mesh(new THREE.BoxGeometry(7, 0.45, 7), snowMat);
  roof2.position.set(9, 3.4, 1);
  const windowMat = new THREE.MeshStandardMaterial({
    color: 0xffd7a1,
    emissive: 0xffb15e,
    emissiveIntensity: 0.28,
    roughness: 0.2,
  });
  const windows = [];
  for (let i = 0; i < 5; i++) {
    const win = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.4), windowMat);
    win.position.set(-6 + i * 2.4, 2.3, 4.02);
    windows.push(win);
    group.add(win);
  }
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(3.2, 0.8),
    new THREE.MeshStandardMaterial({ map: signTexture('山の湯'), roughness: 0.6 }),
  );
  sign.position.set(0, 3.5, 4.05);
  group.add(hall, wing, roof, roof2, sign);
  scene.add(group);

  const lights = [];
  for (const side of [-6, 6]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 1.8, 6), wood);
    post.position.set(x + side, y + 0.9, z + 5.2);
    const lamp = new THREE.PointLight(0xffb15a, 0, 10, 2);
    lamp.position.set(x + side, y + 1.9, z + 5.2);
    lamp.userData.night = 4.5;
    lamp.userData.day = 0.4;
    scene.add(post, lamp);
    lights.push(lamp);
  }
  const floodPositions = [
    [courseCenter(400) - 20, 400],
    [courseCenter(900) + 18, 900],
    [courseCenter(1500) - 16, 1500],
  ];
  for (const [fx, fz] of floodPositions) {
    const fy = terrainHeight(fx, fz) + 8;
    const spot = new THREE.SpotLight(0xfff1d2, 0, 90, 0.55, 0.6, 1);
    spot.position.set(fx, fy, fz);
    spot.target.position.set(courseCenter(fz + 40), terrainHeight(courseCenter(fz + 40), fz + 40), fz + 40);
    spot.userData.night = 18;
    spot.userData.day = 0;
    scene.add(spot, spot.target);
    lights.push(spot);
  }

  const steamCount = 48;
  const steamPos = new Float32Array(steamCount * 3);
  const steamGeo = new THREE.BufferGeometry();
  const steamAttr = new THREE.BufferAttribute(steamPos, 3);
  steamAttr.setUsage(THREE.DynamicDrawUsage);
  steamGeo.setAttribute('position', steamAttr);
  const steamPoints = new THREE.Points(
    steamGeo,
    new THREE.PointsMaterial({
      color: 0xf7f4ef,
      size: 2.8,
      map: puffTexture(),
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
      sizeAttenuation: true,
    }),
  );
  steamPoints.frustumCulled = false;
  scene.add(steamPoints);
  const steam = Array.from({ length: steamCount }, () => ({
    x: 0,
    y: Math.random() * 2,
    z: 0,
    life: Math.random() * 2,
  }));

  return { lights, windows, steam, steamPos, steamAttr, origin: new THREE.Vector3(x, y, z) };
}
