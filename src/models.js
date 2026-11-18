import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js';

const loader = new GLTFLoader();

export function applySnowCover(source, amount = 0.9) {
  const material = source.clone();
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uSnow = { value: amount };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vSnowUp;')
      .replace(
        '#include <beginnormal_vertex>',
        '#include <beginnormal_vertex>\nvSnowUp = normalize(mat3(modelMatrix) * objectNormal);',
      );
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vSnowUp;\nuniform float uSnow;')
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        {
          float snow = smoothstep(0.12, 0.72, vSnowUp.y) * uSnow;
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.95, 0.97, 1.0), snow);
        }`,
      );
  };
  return material;
}

function load(url) {
  return loader.loadAsync(`${import.meta.env.BASE_URL}${url}`);
}

export function loadAssets() {
  return Promise.all([
    load('models/pines/Pine_1.gltf'),
    load('models/pines/Pine_2.gltf'),
    load('models/pines/Pine_3.gltf'),
    load('models/trees/tree-snow-a.glb'),
    load('models/trees/tree-snow-b.glb'),
    load('models/trees/tree-snow-c.glb'),
    load('models/Fox.glb'),
    load('models/Rogue.glb'),
    load('models/lodge/cabin-wall.glb'),
    load('models/lodge/cabin-window-large.glb'),
    load('models/lodge/cabin-roof-snow.glb'),
    load('models/lodge/cabin-roof-snow-chimney.glb'),
    load('models/lodge/cabin-doorway.glb'),
    load('models/lodge/cabin-corner-logs.glb'),
  ]).then((files) => {
    const [p1, p2, p3, a, b, c, fox, skier, wall, win, roof, chimney, door, logs] = files;
    return {
      pines: [p1.scene, p2.scene, p3.scene],
      snowTrees: [a.scene, b.scene, c.scene],
      fox,
      skier,
      lodge: {
        wall: wall.scene,
        win: win.scene,
        roof: roof.scene,
        chimney: chimney.scene,
        door: door.scene,
        logs: logs.scene,
      },
    };
  });
}

export function prepareTree(root, targetHeight, snowAmount) {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const height = Math.max(0.001, box.max.y - box.min.y);
  const fit = targetHeight / height;
  const parts = [];
  root.traverse((obj) => {
    if (!obj.isMesh) return;
    const geo = obj.geometry.clone();
    geo.applyMatrix4(obj.matrixWorld);
    geo.scale(fit, fit, fit);
    geo.translate(0, -box.min.y * fit, 0);
    const material = Array.isArray(obj.material)
      ? obj.material.map((item) => applySnowCover(item, snowAmount))
      : applySnowCover(obj.material, snowAmount);
    const list = Array.isArray(material) ? material : [material];
    for (const item of list) item.side = THREE.DoubleSide;
    parts.push({ geo, material });
  });
  return parts;
}

export function instanceTrees(scene, parts, placements) {
  if (!placements.length || !parts.length) return;
  const dummy = new THREE.Object3D();
  for (const part of parts) {
    const mesh = new THREE.InstancedMesh(part.geo, part.material, placements.length);
    placements.forEach((item, i) => {
      dummy.position.set(item.x, item.y, item.z);
      dummy.rotation.set(0, item.rot || 0, 0);
      dummy.scale.setScalar(item.scale || 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.frustumCulled = false;
    mesh.castShadow = placements.length < 180;
    mesh.receiveShadow = true;
    scene.add(mesh);
  }
}

export function cloneAnimated(gltf, height) {
  const model = cloneSkeleton(gltf.scene);
  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model);
  const h = Math.max(0.001, box.max.y - box.min.y);
  const s = height / h;
  model.scale.setScalar(s);
  model.position.y = -box.min.y * s;
  model.traverse((obj) => {
    if (obj.isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
      obj.frustumCulled = false;
    }
  });
  return model;
}
