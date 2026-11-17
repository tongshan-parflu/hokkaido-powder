import * as THREE from 'three';

export function createSnowMaterial() {
  const material = new THREE.MeshStandardMaterial({
    color: 0xfff7f1,
    roughness: 0.78,
    metalness: 0.0,
    envMapIntensity: 0.35,
    vertexColors: true,
  });
  material.userData.sunDir = new THREE.Vector3(0.72, 0.22, 0.2).normalize();

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uSunDir = { value: material.userData.sunDir };
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        '#include <common>\nattribute float aPiste;\nvarying vec3 vSnowWorld;\nvarying float vPiste;\nvarying vec3 vSnowN;',
      )
      .replace(
        '#include <worldpos_vertex>',
        '#include <worldpos_vertex>\n\tvSnowWorld = worldPosition.xyz;\n\tvPiste = aPiste;\n\tvSnowN = normalize(mat3(modelMatrix) * normal);',
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        '#include <common>\nvarying vec3 vSnowWorld;\nvarying float vPiste;\nvarying vec3 vSnowN;\nuniform vec3 uSunDir;',
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        {
          float cx = sin(vSnowWorld.z * 0.0036) * 18.0 + sin(vSnowWorld.z * 0.00155 + 0.7) * 7.0;
          float across = vSnowWorld.x - cx;
          float ridge = abs(fract(across * 1.45) - 0.5);
          float cord = smoothstep(0.06, 0.46, ridge);
          vec3 powder = vec3(0.90, 0.94, 1.0);
          vec3 warmSnow = vec3(1.06, 1.0, 0.94);
          diffuseColor.rgb *= mix(powder, warmSnow, vPiste);
          diffuseColor.rgb += vec3(0.18, 0.15, 0.11) * (cord - 0.48) * vPiste;
          float fres = pow(1.0 - max(dot(normalize(vSnowN), normalize(cameraPosition - vSnowWorld)), 0.0), 2.4);
          diffuseColor.rgb += vec3(1.0, 0.86, 0.72) * fres * 0.12;
        }`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        {
          vec2 cell = floor(vSnowWorld.xz * 6.0);
          float n = fract(sin(dot(cell, vec2(127.1, 311.7))) * 43758.5453);
          float glint = smoothstep(0.988, 0.999, n);
          vec3 viewDir = normalize(cameraPosition - vSnowWorld);
          float spec = pow(max(dot(normalize(vSnowN), normalize(uSunDir + viewDir)), 0.0), 20.0);
          totalEmissiveRadiance += vec3(1.0, 0.95, 0.85) * glint * spec * 0.7;
        }`,
      );
  };
  return material;
}

export function createBarkTextures() {
  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = 256;
  colorCanvas.height = 1024;
  const ctx = colorCanvas.getContext('2d');
  ctx.fillStyle = '#efe8dc';
  ctx.fillRect(0, 0, 256, 1024);
  for (let y = 0; y < 1024; y += 2) {
    const n = 228 + Math.sin(y * 0.08) * 8 + (y % 17) * 0.3;
    ctx.fillStyle = `rgb(${n}, ${n - 6}, ${n - 12})`;
    ctx.fillRect(0, y, 256, 2);
  }
  ctx.strokeStyle = '#2a2724';
  ctx.lineWidth = 2;
  for (let i = 0; i < 90; i++) {
    const y = (i * 11.2 + (i % 5) * 3) % 1024;
    const x = (i * 37) % 180;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 18 + (i % 7) * 3, y + ((i % 3) - 1));
    ctx.stroke();
    if (i % 4 === 0) {
      ctx.strokeStyle = '#6d6458';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, y + 6);
      ctx.lineTo(256, y + 7);
      ctx.stroke();
      ctx.strokeStyle = '#2a2724';
      ctx.lineWidth = 2;
    }
  }
  ctx.fillStyle = 'rgba(70, 90, 60, 0.18)';
  ctx.fillRect(0, 860, 256, 164);

  const heightCanvas = document.createElement('canvas');
  heightCanvas.width = 256;
  heightCanvas.height = 1024;
  const hctx = heightCanvas.getContext('2d');
  hctx.fillStyle = '#808080';
  hctx.fillRect(0, 0, 256, 1024);
  hctx.strokeStyle = '#3a3a3a';
  hctx.lineWidth = 2;
  for (let i = 0; i < 90; i++) {
    const y = (i * 11.2) % 1024;
    hctx.beginPath();
    hctx.moveTo((i * 37) % 200, y);
    hctx.lineTo((i * 37) % 200 + 28, y);
    hctx.stroke();
  }

  const map = new THREE.CanvasTexture(colorCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.anisotropy = 8;
  const normal = normalFromHeight(heightCanvas);
  return { map, normal };
}

function normalFromHeight(canvas) {
  const w = canvas.width;
  const h = canvas.height;
  const src = canvas.getContext('2d').getImageData(0, 0, w, h).data;
  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
  const octx = out.getContext('2d');
  const img = octx.createImageData(w, h);
  const sample = (x, y) => src[((y + h) % h) * w * 4 + ((x + w) % w) * 4] / 255;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = sample(x + 1, y) - sample(x - 1, y);
      const dy = sample(x, y + 1) - sample(x, y - 1);
      const nx = -dx * 2.2;
      const ny = -dy * 2.2;
      const nz = 1;
      const len = Math.hypot(nx, ny, nz);
      const i = (y * w + x) * 4;
      img.data[i] = (nx / len * 0.5 + 0.5) * 255;
      img.data[i + 1] = (ny / len * 0.5 + 0.5) * 255;
      img.data[i + 2] = (nz / len * 0.5 + 0.5) * 255;
      img.data[i + 3] = 255;
    }
  }
  octx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(out);
  tex.colorSpace = THREE.NoColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export function puffTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const blobs = [
    [64, 64, 48],
    [46, 58, 26],
    [80, 52, 22],
    [60, 78, 24],
  ];
  for (const [x, y, r] of blobs) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(255,255,255,0.95)');
    g.addColorStop(0.45, 'rgba(255,255,255,0.45)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
