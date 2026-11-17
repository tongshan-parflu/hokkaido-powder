import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {
  COURSE_LENGTH,
  FINISH_Z,
  courseCenter,
  slopeElevation,
  terrainHeight,
} from './course.js';

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

function birchBark() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#f3f0e8';
  ctx.fillRect(0, 0, 64, 256);
  ctx.strokeStyle = '#2a2a28';
  ctx.lineWidth = 2;
  for (let i = 0; i < 26; i++) {
    const y = 8 + i * 9.4;
    ctx.beginPath();
    ctx.moveTo(3, y);
    ctx.lineTo(14 + Math.random() * 16, y + (Math.random() - 0.5) * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(34, y + 3);
    ctx.lineTo(58, y + 3 + (Math.random() - 0.5) * 2);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(80,80,70,0.35)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 8; i++) {
    ctx.beginPath();
    ctx.moveTo(0, 20 + i * 30);
    ctx.lineTo(64, 22 + i * 30);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function labelTexture(text, bg, fg) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1024, 256);
  ctx.fillStyle = fg;
  ctx.font = '700 112px "WenQuanYi Micro Hei", "Noto Sans SC", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 512, 132);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function woodSignTexture(text) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 220;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#6b4632';
  ctx.fillRect(0, 0, 512, 220);
  ctx.fillStyle = '#f0ddc4';
  ctx.fillRect(14, 14, 484, 192);
  ctx.fillStyle = '#3a2618';
  ctx.font = '700 84px "WenQuanYi Micro Hei", "Noto Sans SC", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 118);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeBirchCrown() {
  const parts = [];
  const rand = (function mulberry() {
    let a = 77;
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  })();
  for (let i = 0; i < 6; i++) {
    const h = 1.3 + rand() * 1.5;
    const branch = new THREE.CylinderGeometry(0.025, 0.055, h, 4);
    branch.translate(0, h / 2, 0);
    const ang = (i / 6) * Math.PI * 2 + 0.3;
    const tilt = 0.7 + rand() * 0.35;
    branch.rotateZ(tilt);
    branch.rotateY(ang);
    branch.translate(Math.cos(ang) * 0.05, 4.4 + rand() * 1.6, Math.sin(ang) * 0.05);
    paint(branch, i % 2 ? 0x3a342c : 0x4a4036);
    parts.push(branch);
  }
  const merged = mergeGeometries(parts, false);
  parts.forEach((g) => g.dispose());
  merged.computeVertexNormals();
  return merged;
}

function makePine() {
  const parts = [];
  const layers = [
    { r: 1.55, h: 2.5, y: 0.4, c: 0x1a3c32 },
    { r: 1.15, h: 2.15, y: 1.7, c: 0x21483c },
    { r: 0.72, h: 1.7, y: 2.9, c: 0x17362e },
  ];
  for (const layer of layers) {
    const cone = new THREE.ConeGeometry(layer.r, layer.h, 6);
    cone.translate(0, layer.y + layer.h / 2, 0);
    paint(cone, layer.c);
    parts.push(cone);
  }
  const snow = new THREE.ConeGeometry(0.46, 0.72, 6);
  snow.translate(0, 4.55, 0);
  paint(snow, 0xf7fbff);
  parts.push(snow);
  const merged = mergeGeometries(parts, false);
  parts.forEach((g) => g.dispose());
  merged.computeVertexNormals();
  return merged;
}

function makeFoxGeometry() {
  const parts = [];
  const add = (geo, hex, x, y, z, rx = 0, ry = 0, rz = 0) => {
    geo.translate(0, 0, 0);
    geo.rotateX(rx);
    geo.rotateY(ry);
    geo.rotateZ(rz);
    geo.translate(x, y, z);
    paint(geo, hex);
    parts.push(geo);
  };
  add(new THREE.BoxGeometry(0.62, 0.32, 0.3), 0xe07a32, 0, 0.36, 0);
  add(new THREE.BoxGeometry(0.22, 0.18, 0.06), 0xfff6ee, 0, 0.34, 0.16);
  add(new THREE.BoxGeometry(0.32, 0.24, 0.28), 0xe07a32, 0, 0.6, 0.2);
  add(new THREE.BoxGeometry(0.14, 0.1, 0.16), 0xfff6ee, 0, 0.54, 0.38);
  add(new THREE.BoxGeometry(0.06, 0.06, 0.04), 0x1c1c1c, 0, 0.52, 0.46);
  add(new THREE.BoxGeometry(0.045, 0.045, 0.03), 0x1a1a1a, -0.08, 0.64, 0.33);
  add(new THREE.BoxGeometry(0.045, 0.045, 0.03), 0x1a1a1a, 0.08, 0.64, 0.33);
  const earL = new THREE.ConeGeometry(0.07, 0.16, 4);
  earL.translate(0, 0.08, 0);
  add(earL, 0xc4622a, -0.1, 0.78, 0.16);
  const earR = new THREE.ConeGeometry(0.07, 0.16, 4);
  earR.translate(0, 0.08, 0);
  add(earR, 0xc4622a, 0.1, 0.78, 0.16);
  add(new THREE.BoxGeometry(0.12, 0.12, 0.42), 0xd86a28, 0, 0.46, -0.32, 0.5, 0, 0);
  add(new THREE.BoxGeometry(0.1, 0.1, 0.14), 0xfff6ee, 0, 0.55, -0.52, 0.4, 0, 0);
  for (const [x, z] of [[-0.18, 0.08], [0.18, 0.08], [-0.18, -0.1], [0.18, -0.1]]) {
    add(new THREE.BoxGeometry(0.08, 0.16, 0.1), 0xc4622a, x, 0.12, z);
  }
  const merged = mergeGeometries(parts, false);
  parts.forEach((g) => g.dispose());
  merged.computeVertexNormals();
  return merged;
}

function coneMountain(radius, height, segments, wobble) {
  const geo = new THREE.ConeGeometry(radius, height, segments);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const rock = new THREE.Color(0x667488);
  const forest = new THREE.Color(0x3e5568);
  const snow = new THREE.Color(0xf7f8fb);
  const color = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    let y = pos.getY(i);
    let z = pos.getZ(i);
    const rad = Math.hypot(x, z);
    if (rad > 0.001) {
      const ang = Math.atan2(z, x);
      const n = 1 + wobble * Math.sin(ang * 5 + y * 0.02);
      x = (x / rad) * rad * n;
      z = (z / rad) * rad * n;
      pos.setX(i, x);
      pos.setZ(i, z);
    }
    const t = (y + height / 2) / height;
    color.copy(forest).lerp(rock, Math.min(1, Math.max(0, (t - 0.35) / 0.25)));
    color.lerp(snow, Math.min(1, Math.max(0, (t - 0.62) / 0.18)));
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return geo;
}

function placeMountain(scene, x, z, radius, height, segments, wobble) {
  const geo = coneMountain(radius, height, segments, wobble);
  const mesh = new THREE.Mesh(
    geo,
    new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }),
  );
  const base = slopeElevation(z) - height * 0.22;
  mesh.position.set(x, base + height / 2, z);
  scene.add(mesh);
  return mesh;
}

export function createScenery(scene) {
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(2200, 28, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      fog: false,
      depthWrite: false,
      uniforms: {
        sunDir: { value: new THREE.Vector3(-0.45, 0.18, 0.28).normalize() },
        topColor: { value: new THREE.Color(0x6d7fa0) },
        horizonColor: { value: new THREE.Color(0xf2c3a4) },
        bottomColor: { value: new THREE.Color(0xd5e0ea) },
      },
      vertexShader: `
        varying vec3 vPos;
        void main() {
          vPos = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vPos;
        uniform vec3 sunDir;
        uniform vec3 topColor;
        uniform vec3 horizonColor;
        uniform vec3 bottomColor;
        void main() {
          vec3 dir = normalize(vPos);
          float h = dir.y;
          vec3 col = mix(bottomColor, horizonColor, smoothstep(-0.15, 0.08, h));
          col = mix(col, topColor, smoothstep(0.05, 0.62, h));
          float sun = pow(max(dot(dir, sunDir), 0.0), 64.0);
          float glow = pow(max(dot(dir, sunDir), 0.0), 5.0);
          col += vec3(1.0, 0.78, 0.5) * sun * 0.85;
          col += vec3(0.95, 0.55, 0.32) * glow * 0.28;
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    }),
  );
  sky.frustumCulled = false;
  sky.renderOrder = -1;
  scene.add(sky);

  placeMountain(scene, -150, 480, 150, 340, 9, 0.028);
  placeMountain(scene, 310, 1100, 120, 150, 6, 0.05);
  placeMountain(scene, -340, 1320, 140, 180, 6, 0.04);

  return {
    sky,
    follow(camera) {
      sky.position.copy(camera.position);
    },
  };
}

function makeBanner(scene, z, text) {
  const x = courseCenter(z);
  const width = 16;
  const poleGeo = new THREE.CylinderGeometry(0.11, 0.14, 5.6, 6);
  const poleMat = new THREE.MeshLambertMaterial({ color: 0x8d3a34, flatShading: true });
  for (const side of [-1, 1]) {
    const px = x + side * (width / 2);
    const py = terrainHeight(px, z);
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.set(px, py + 2.8, z);
    scene.add(pole);
  }
  const cloth = new THREE.Mesh(
    new THREE.PlaneGeometry(width - 0.6, 1.25),
    new THREE.MeshLambertMaterial({
      map: labelTexture(text, '#c4453c', '#fff8f2'),
      side: THREE.DoubleSide,
    }),
  );
  const y = Math.max(terrainHeight(x - width / 2, z), terrainHeight(x + width / 2, z)) + 4.7;
  cloth.position.set(x, y, z);
  cloth.rotation.y = Math.PI;
  scene.add(cloth);
}

function makeSign(scene, z, dx, text) {
  const x = courseCenter(z) + dx;
  const y = terrainHeight(x, z);
  const post = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.1, 1.8, 5),
    new THREE.MeshLambertMaterial({ color: 0x6b4632, flatShading: true }),
  );
  post.position.set(x, y + 0.9, z);
  const board = new THREE.Mesh(
    new THREE.PlaneGeometry(2.4, 1.05),
    new THREE.MeshLambertMaterial({ map: woodSignTexture(text), side: THREE.DoubleSide }),
  );
  board.position.set(x, y + 1.85, z);
  board.rotation.y = Math.PI + (dx > 0 ? -0.45 : 0.45);
  scene.add(post, board);
}

export function createWorld(scene, course) {
  const scenery = createScenery(scene);

  const birchTrunkGeo = new THREE.CylinderGeometry(0.16, 0.23, 6.4, 6);
  birchTrunkGeo.translate(0, 3.2, 0);
  const birchCrownGeo = makeBirchCrown();
  const pineGeo = makePine();
  const birchMat = new THREE.MeshLambertMaterial({
    color: 0xffffff,
    map: birchBark(),
    flatShading: true,
  });
  const crownMat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  const pineMat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });

  const birches = course.trees.filter((t) => t.kind === 'birch');
  const pines = course.trees.filter((t) => t.kind === 'pine');
  const dummy = new THREE.Object3D();

  function fill(mesh, list, yLift = 0) {
    list.forEach((item, i) => {
      const y = terrainHeight(item.x, item.z) + yLift;
      dummy.position.set(item.x, y, item.z);
      dummy.rotation.set(0, item.rot || 0, 0);
      dummy.scale.setScalar(item.scale || 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.frustumCulled = false;
  }

  if (birches.length) {
    const trunks = new THREE.InstancedMesh(birchTrunkGeo, birchMat, birches.length);
    const crowns = new THREE.InstancedMesh(birchCrownGeo, crownMat, birches.length);
    fill(trunks, birches);
    fill(crowns, birches);
    scene.add(trunks, crowns);
  }
  if (pines.length) {
    const pineMesh = new THREE.InstancedMesh(pineGeo, pineMat, pines.length);
    fill(pineMesh, pines);
    scene.add(pineMesh);
  }

  const rockGeo = new THREE.DodecahedronGeometry(0.85, 0);
  const rockMat = new THREE.MeshLambertMaterial({ color: 0x7d8694, flatShading: true });
  if (course.rocks.length) {
    const rocks = new THREE.InstancedMesh(rockGeo, rockMat, course.rocks.length);
    course.rocks.forEach((rock, i) => {
      dummy.position.set(rock.x, terrainHeight(rock.x, rock.z) - 0.15, rock.z);
      dummy.rotation.set(rock.rot, rock.rot * 0.7, rock.rot * 0.3);
      dummy.scale.set(rock.sx, rock.sy, rock.sz);
      dummy.updateMatrix();
      rocks.setMatrixAt(i, dummy.matrix);
    });
    rocks.instanceMatrix.needsUpdate = true;
    rocks.frustumCulled = false;
    scene.add(rocks);

    const snowy = course.rocks.filter((r) => r.snow);
    if (snowy.length) {
      const capGeo = new THREE.ConeGeometry(0.5, 0.38, 5);
      capGeo.translate(0, 0.16, 0);
      const caps = new THREE.InstancedMesh(
        capGeo,
        new THREE.MeshLambertMaterial({ color: 0xf7fbff, flatShading: true }),
        snowy.length,
      );
      snowy.forEach((rock, i) => {
        dummy.position.set(rock.x, terrainHeight(rock.x, rock.z) + rock.sy * 0.55, rock.z);
        dummy.rotation.set(0, rock.rot, 0);
        dummy.scale.setScalar(rock.sx);
        dummy.updateMatrix();
        caps.setMatrixAt(i, dummy.matrix);
      });
      caps.instanceMatrix.needsUpdate = true;
      caps.frustumCulled = false;
      scene.add(caps);
    }
  }

  const gatePalette = {
    red: new THREE.MeshLambertMaterial({ color: 0xd24b45, flatShading: true, side: THREE.DoubleSide }),
    blue: new THREE.MeshLambertMaterial({ color: 0x2c4f8f, flatShading: true, side: THREE.DoubleSide }),
    gold: new THREE.MeshLambertMaterial({ color: 0xe6b15a, flatShading: true, side: THREE.DoubleSide }),
    miss: new THREE.MeshLambertMaterial({ color: 0x8d939c, flatShading: true, side: THREE.DoubleSide }),
  };
  const poleGeo = new THREE.CylinderGeometry(0.07, 0.09, 3.3, 6);
  const flagGeo = new THREE.BufferGeometry();
  flagGeo.setAttribute(
    'position',
    new THREE.Float32BufferAttribute([0, 0, 0, 0, 0.95, 0, 1.45, 0.38, 0.12], 3),
  );
  flagGeo.computeVertexNormals();

  const gateViews = course.gates.map((gate) => {
    const base = gate.index % 2 === 0 ? 'red' : 'blue';
    const meshes = [];
    const flags = [];
    for (const side of [-1, 1]) {
      const px = gate.x + side * gate.half;
      const py = terrainHeight(px, gate.z);
      const pole = new THREE.Mesh(poleGeo, gatePalette[base]);
      pole.position.set(px, py + 1.65, gate.z);
      const flag = new THREE.Mesh(flagGeo, gatePalette[base]);
      flag.position.set(px, py + 2.85, gate.z);
      flag.scale.x = -side;
      flag.userData.phase = gate.index + side;
      scene.add(pole, flag);
      meshes.push(pole, flag);
      flags.push(flag);
    }
    return { base, state: base, meshes, flags };
  });

  const foxGeo = makeFoxGeometry();
  const foxMat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  const ringGeo = new THREE.CircleGeometry(0.7, 16);
  ringGeo.rotateX(-Math.PI / 2);
  const foxViews = course.foxes.map((fox) => {
    const group = new THREE.Group();
    const body = new THREE.Mesh(foxGeo, foxMat);
    body.position.y = 0;
    group.add(body);
    const ring = new THREE.Mesh(
      ringGeo,
      new THREE.MeshBasicMaterial({
        color: 0xfff4e8,
        transparent: true,
        opacity: 0.45,
        depthWrite: false,
      }),
    );
    ring.position.y = 0.08;
    group.add(ring);
    const y = terrainHeight(fox.x, fox.z);
    group.position.set(fox.x, y, fox.z);
    group.rotation.y = fox.rot;
    scene.add(group);
    return { group, baseY: y };
  });

  const gem = new THREE.OctahedronGeometry(0.28, 0);
  const flakeMat = new THREE.MeshBasicMaterial({ color: 0xf7fbff });
  const flakeViews = course.flakes.map((flake) => {
    const group = new THREE.Group();
    const crystal = new THREE.Mesh(gem, flakeMat);
    crystal.position.y = 1.05;
    group.add(crystal);
    const ring = new THREE.Mesh(
      ringGeo,
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.4,
        depthWrite: false,
      }),
    );
    ring.position.y = 0.08;
    ring.scale.setScalar(0.7);
    group.add(ring);
    const y = terrainHeight(flake.x, flake.z);
    group.position.set(flake.x, y, flake.z);
    scene.add(group);
    return { group, crystal, baseY: y };
  });

  makeBanner(scene, 52, '出发');
  makeBanner(scene, FINISH_Z, '终点');
  makeSign(scene, 110, -14, '白桦林');
  makeSign(scene, 980, 14, '羊蹄山');

  let time = 0;
  return {
    followSky: scenery.follow,
    update(dt) {
      time += dt;
      for (const view of gateViews) {
        for (const flag of view.flags) {
          flag.rotation.y = Math.sin(time * 2.4 + flag.userData.phase) * 0.22;
        }
      }
      course.gates.forEach((gate, i) => {
        const view = gateViews[i];
        const want = !gate.resolved ? view.base : gate.passed ? 'gold' : 'miss';
        if (want === view.state) return;
        view.state = want;
        for (const m of view.meshes) m.material = gatePalette[want];
      });
      course.foxes.forEach((fox, i) => {
        const view = foxViews[i];
        if (fox.collected) {
          const s = view.group.scale.x - dt * 3.2;
          if (s <= 0) view.group.visible = false;
          else view.group.scale.setScalar(s);
          return;
        }
        view.group.position.y = view.baseY + Math.sin(time * 2 + fox.phase) * 0.08;
        view.group.rotation.y = fox.rot + Math.sin(time * 0.8 + fox.phase) * 0.15;
      });
      course.flakes.forEach((flake, i) => {
        const view = flakeViews[i];
        if (flake.collected) {
          view.group.visible = false;
          return;
        }
        view.crystal.rotation.y += dt * 1.6;
        view.crystal.rotation.x = Math.sin(time * 1.4 + flake.phase) * 0.4;
        view.crystal.position.y = 1.05 + Math.sin(time * 2.2 + flake.phase) * 0.12;
      });
    },
    reset() {
      for (const view of gateViews) {
        view.state = view.base;
        for (const m of view.meshes) m.material = gatePalette[view.base];
      }
      for (const view of foxViews) {
        view.group.visible = true;
        view.group.scale.setScalar(1);
      }
      for (const view of flakeViews) view.group.visible = true;
    },
  };
}

export const WORLD_LENGTH = COURSE_LENGTH;
