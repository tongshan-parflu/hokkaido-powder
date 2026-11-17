import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { SSAOPass } from 'three/addons/postprocessing/SSAOPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

const GradeShader = {
  uniforms: { tDiffuse: { value: null }, uNight: { value: 0 } },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uNight;
    varying vec2 vUv;
    void main() {
      vec3 col = texture2D(tDiffuse, vUv).rgb;
      col = pow(max(col, 0.0), vec3(0.94));
      float luma = dot(col, vec3(0.299, 0.587, 0.114));
      vec3 warm = mix(col * vec3(0.86, 0.93, 1.08), col * vec3(1.08, 1.0, 0.9), smoothstep(0.25, 0.8, luma));
      vec3 cool = col * vec3(0.72, 0.82, 1.12);
      col = mix(warm, cool, uNight);
      vec2 sunUv = vec2(0.78, 0.62);
      float shaft = pow(max(0.0, 1.0 - length((vUv - sunUv) * vec2(0.85, 1.35))), 2.4);
      col += vec3(1.0, 0.82, 0.58) * shaft * 0.22 * (1.0 - uNight);
      float d = length(vUv - 0.5);
      float vig = smoothstep(0.95, 0.42, d);
      col *= mix(0.78, 1.0, vig);
      gl_FragColor = vec4(col, 1.0);
    }
  `,
};

function skyMaterial() {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide,
    fog: false,
    depthWrite: false,
    uniforms: {
      uNight: { value: 0 },
      uSunDir: { value: new THREE.Vector3(0.72, 0.18, 0.28).normalize() },
    },
    vertexShader: `
      varying vec3 vDir;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vDir = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: `
      varying vec3 vDir;
      uniform float uNight;
      uniform vec3 uSunDir;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p){
        vec2 i = floor(p); vec2 f = fract(p);
        float a = hash(i), b = hash(i+vec2(1.0,0.0)), c = hash(i+vec2(0.0,1.0)), d = hash(i+vec2(1.0,1.0));
        vec2 u = f*f*(3.0-2.0*f);
        return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
      }
      float fbm(vec2 p){
        float v = 0.0; float a = 0.5;
        for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.05; a *= 0.5; }
        return v;
      }
      void main() {
        vec3 dir = normalize(vDir);
        float h = dir.y;
        vec3 dayHorizon = vec3(1.0, 0.72, 0.48);
        vec3 dayMid = vec3(0.98, 0.62, 0.58);
        vec3 dayZenith = vec3(0.45, 0.62, 0.88);
        vec3 nightHorizon = vec3(0.10, 0.13, 0.22);
        vec3 nightZenith = vec3(0.02, 0.03, 0.07);
        vec3 horizon = mix(dayHorizon, nightHorizon, uNight);
        vec3 zenith = mix(dayZenith, nightZenith, uNight);
        float elev = smoothstep(0.0, 0.22, h);
        float high = smoothstep(0.12, 0.72, h);
        vec3 mid = mix(dayMid, vec3(0.07, 0.11, 0.22), uNight);
        vec3 col = mix(horizon, mid, elev);
        col = mix(col, zenith, high);
        vec2 skyUv = dir.xz / max(0.15, dir.y + 0.35);
        float clouds = fbm(skyUv * 1.6);
        float wispy = smoothstep(0.42, 0.72, clouds) * smoothstep(0.62, 0.02, h);
        col = mix(col, vec3(1.0, 0.74, 0.68), wispy * (1.0 - uNight) * 0.82);
        float sun = pow(max(dot(dir, normalize(uSunDir)), 0.0), 90.0);
        float glow = pow(max(dot(dir, normalize(uSunDir)), 0.0), 3.2);
        col += vec3(1.0, 0.62, 0.28) * sun * (1.0 - uNight);
        col += vec3(1.0, 0.42, 0.24) * glow * 0.32 * (1.0 - uNight);
        float stars = step(0.997, hash(floor(dir.xy * 420.0))) * step(0.25, h);
        col += stars * uNight * 0.9;
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
}

export function createPipeline(scene, camera) {
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
    failIfMajorPerformanceCaveat: false,
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.98;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0xd7c8bc, 1);

  scene.fog = new THREE.FogExp2(0xf6cbb4, 0.0001);
  scene.background = new THREE.Color(0xd9cfc6);

  const hemi = new THREE.HemisphereLight(0xffd0b0, 0x6a88c0, 0.62);
  scene.add(hemi);
  const ambient = new THREE.AmbientLight(0xc5d4ee, 0.08);
  scene.add(ambient);
  const sun = new THREE.DirectionalLight(0xffc48a, 3.8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.bias = -0.00025;
  sun.shadow.normalBias = 0.035;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 90;
  scene.add(sun);
  scene.add(sun.target);

  const sky = new THREE.Mesh(new THREE.SphereGeometry(7000, 32, 20), skyMaterial());
  sky.frustumCulled = false;
  sky.renderOrder = -1;
  sky.visible = false;
  scene.add(sky);

  new RGBELoader().load('/assets/sunset.hdr', (hdr) => {
    hdr.mapping = THREE.EquirectangularReflectionMapping;
    scene.background = hdr;
    scene.environment = hdr;
    scene.environmentIntensity = 1.05;
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromEquirectangular(hdr).texture;
    pmrem.dispose();
  });

  const composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, camera);
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.12, 0.5, 0.9);
  const ssao = new SSAOPass(scene, camera, 1, 1);
  ssao.kernelRadius = 12;
  ssao.minDistance = 0.002;
  ssao.maxDistance = 0.12;
  const grade = new ShaderPass(GradeShader);
  const output = new OutputPass();
  composer.addPass(renderPass);
  composer.addPass(ssao);
  composer.addPass(bloom);
  composer.addPass(grade);
  composer.addPass(output);

  let quality = 'medium';
  let night = false;

  function applyQuality() {
    const high = quality === 'high';
    const low = quality === 'low';
    const size = low ? 0 : high ? 2048 : 1024;
    if (size === 0) {
      renderer.shadowMap.enabled = false;
      sun.castShadow = false;
    } else {
      renderer.shadowMap.enabled = true;
      sun.castShadow = true;
      if (sun.shadow.mapSize.x !== size) {
        sun.shadow.mapSize.set(size, size);
        if (sun.shadow.map) sun.shadow.map.dispose();
        sun.shadow.map = null;
      }
    }
    ssao.enabled = high;
    bloom.enabled = !low;
    grade.enabled = !low;
    bloom.strength = night ? 0.28 : 0.22;
    resize(window.innerWidth, window.innerHeight);
  }

  function resize(width, height) {
    const high = quality === 'high';
    const low = quality === 'low';
    const pr = low ? 1 : high ? 1.5 : 1.25;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, pr));
    renderer.setSize(width, height);
    composer.setSize(width, height);
    const scale = high ? 1.4 : 2;
    ssao.setSize(Math.max(2, Math.floor(width / scale)), Math.max(2, Math.floor(height / scale)));
    bloom.setSize(width, height);
  }

  function setQuality(level) {
    quality = level;
    applyQuality();
  }

  function setNight(on) {
    night = on;
    sky.visible = on;
    sky.material.uniforms.uNight.value = on ? 1 : 0;
    grade.uniforms.uNight.value = on ? 1 : 0;
    sun.intensity = on ? 0.18 : 3.8;
    sun.color.set(on ? 0xb7c6ee : 0xffc48a);
    hemi.intensity = on ? 0.16 : 0.62;
    hemi.color.set(on ? 0x1c2744 : 0xffd0b0);
    ambient.intensity = on ? 0.08 : 0.08;
    scene.fog.color.set(on ? 0x1a2436 : 0xf0c2b0);
    scene.fog.density = on ? 0.0009 : 0.0001;
    scene.environmentIntensity = on ? 0.12 : 0.22;
    renderer.toneMappingExposure = on ? 0.62 : 0.98;
    bloom.strength = on ? 0.28 : 0.22;
    document.body.dataset.night = on ? '1' : '0';
  }

  function update(target) {
    sky.position.copy(camera.position);
    const lift = night ? 36 : 14;
    sun.position.set(target.x + 70, target.y + lift, target.z + 18);
    sun.target.position.set(target.x, target.y + 1, target.z + 8);
    const span = 36;
    const cam = sun.shadow.camera;
    cam.left = -span;
    cam.right = span;
    cam.top = span;
    cam.bottom = -span;
    cam.near = 2;
    cam.far = 95;
    cam.updateProjectionMatrix();
  }

  function render() {
    if (quality === 'low') renderer.render(scene, camera);
    else composer.render();
  }

  applyQuality();
  return { renderer, sun, setQuality, setNight, resize, update, render, get quality() { return quality; } };
}
