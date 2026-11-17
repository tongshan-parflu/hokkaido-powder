import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {
  FINISH_Z,
  courseCenter,
  slopeElevation,
  terrainHeight,
} from './course.js';
import { createBirchParts, createPineGeometry } from './trees.js';
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
  const geo = new THREE.ConeGeometry(radius, height, 48, 24, true);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const rock = new THREE.Color(0x4e463f);
  const forest = new THREE.Color(0x24362e);
  const snow = new THREE.Color(0xffffff);
  const color = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    let y = pos.getY(i);
    let z = pos.getZ(i);
    const rad = Math.hypot(x, z);
    if (rad > 1) {
      const ang = Math.atan2(z, x);
      const n = 1 + 0.018 * Math.sin(ang * 7) + 0.012 * Math.sin(ang * 3 + y * 0.01);
      x = (x / rad) * rad * n;
      z = (z / rad) * rad * n;
      pos.setX(i, x);
      pos.setZ(i, z);
    }
    const t = (y + height / 2) / height;
    color.copy(forest).lerp(rock, smooth(t, 0.22, 0.42));
    color.lerp(snow, smooth(t, 0.5, 0.66));
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return geo;
}

function smooth(t, a, b) {
  const x = Math.max(0, Math.min(1, (t - a) / (b - a)));
  return x * x * (3 - 2 * x);
}

function makeFox() {
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

function cableBetween(a, b, material) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, len, 5), material);
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  return mesh;
}

export function createWorld(scene, course) {
  const yoteiX = 300;
  const yoteiZ = 680;
  const yoteiH = 560;
  const yoteiR = 145;
  const foot = slopeElevation(yoteiZ) - 200;
  const yotei = new THREE.Mesh(
    yoteiGeometry(yoteiR, yoteiH),
    new THREE.MeshBasicMaterial({ vertexColors: true }),
  );
  yotei.position.set(yoteiX, foot + yoteiH / 2, yoteiZ);
  scene.add(yotei);

  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(2800, 2200, 1, 1),
    std(0x3d5c6e, 0.18, 0.55),
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(yoteiX + 520, foot + 6, yoteiZ + 80);
  scene.add(sea);
  const coast = new THREE.Mesh(
    new THREE.PlaneGeometry(900, 1600, 1, 1),
    std(0x6d7368, 0.9, 0),
  );
  coast.rotation.x = -Math.PI / 2;
  coast.position.set(yoteiX + 280, foot + 14, yoteiZ);
  scene.add(coast);

  const { trunkGeo, trunkMat, crown, crownMat } = createBirchParts();
  const pineGeo = createPineGeometry();
  const pineMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.78 });
  const dummy = new THREE.Object3D();
  const birches = course.trees.filter((t) => t.kind === 'birch');
  const pines = course.trees.filter((t) => t.kind === 'pine');
  function fill(mesh, list) {
    list.forEach((item, i) => {
      dummy.position.set(item.x, terrainHeight(item.x, item.z), item.z);
      dummy.rotation.set(0, item.rot || 0, 0);
      dummy.scale.setScalar(item.scale || 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.frustumCulled = false;
    mesh.receiveShadow = true;
  }
  if (birches.length) {
    const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, birches.length);
    const crowns = new THREE.InstancedMesh(crown, crownMat, birches.length);
    fill(trunks, birches);
    fill(crowns, birches);
    scene.add(trunks, crowns);
  }
  if (pines.length) {
    const pineMesh = new THREE.InstancedMesh(pineGeo, pineMat, pines.length);
    fill(pineMesh, pines);
    scene.add(pineMesh);
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
  const gondola = buildLift(scene, -34, 160, 1680, 150, metal, cabinMat, glass, 1.1);
  const chair = buildLift(scene, 32, 400, 1500, 170, metal, std(0x243044, 0.5), glass, 0.55);

  const lodge = buildLodge(scene);
  const cranes = [];
  for (let i = 0; i < 5; i++) {
    const bird = makeCrane();
    bird.userData.phase = i * 1.3;
    bird.userData.radius = 70 + i * 12;
    scene.add(bird);
    cranes.push(bird);
  }
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
    [120, -15, '白樺林'],
    [640, 16, '羊蹄コース'],
    [1500, -16, '中級'],
  ];
  for (const [z, dx, text] of signs) {
    const x = courseCenter(z) + dx;
    const y = terrainHeight(x, z);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 1.7, 6), std(0x6b4632, 0.7));
    post.position.set(x, y + 0.85, z);
    post.castShadow = true;
    const board = new THREE.Mesh(
      new THREE.PlaneGeometry(2.3, 1),
      new THREE.MeshStandardMaterial({ map: signTexture(text), roughness: 0.7 }),
    );
    board.position.set(x, y + 1.8, z);
    board.rotation.y = Math.PI + (dx > 0 ? -0.4 : 0.4);
    scene.add(post, board);
  }

  const nightLights = [...lodge.lights, ...gondola.lamps];
  const windows = lodge.windows;

  let time = 0;
  return {
    followSky() {},
    update(dt) {
      time += dt;
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
      chair.update(time);
      const hubX = 80;
      const hubZ = 480;
      const hubY = terrainHeight(hubX, hubZ) + 70;
      cranes.forEach((bird) => {
        const a = time * 0.18 + bird.userData.phase;
        const r = bird.userData.radius;
        bird.position.set(hubX + Math.cos(a) * r, hubY + Math.sin(time * 0.7 + a) * 4, hubZ + Math.sin(a) * r * 0.65);
        bird.rotation.y = -a + Math.PI / 2;
        const flap = Math.sin(time * 5 + bird.userData.phase) * 0.45;
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
