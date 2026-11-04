import * as THREE from 'three';
import { renderer, scene } from './szene.js';
import { rand } from './texturen.js';
import { dustMat, fitShadow, hemi, lightCam, lightVP, sun, target } from './licht.js';
import { volMat } from './strahlen.js';
import { OPEN_ZONES, skyFill } from './masse.js';

const RAD = Math.PI / 180, EDFU_LAT = 24.98 * RAD, EDFU_LON = 32.87;
function equationOfTime(day) {
  const B = 2 * Math.PI * (day - 81) / 364;
  return 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);
}
function edfuNow() {
  const now = new Date(), year = now.getUTCFullYear();
  let day = Math.round((Date.UTC(year, now.getUTCMonth(), now.getUTCDate()) - Date.UTC(year, 0, 0)) / 864e5);
  let hour = now.getUTCHours() + now.getUTCMinutes() / 60 + now.getUTCSeconds() / 3600 + EDFU_LON / 15 + equationOfTime(day) / 60;
  if (hour >= 24) { hour -= 24; day++; }
  return { year, hour, day: Math.min(day, 365) };
}
const state = edfuNow();

function skyVector(H, dec, out) {
  const north = Math.sin(dec) * Math.cos(EDFU_LAT) - Math.cos(dec) * Math.cos(H) * Math.sin(EDFU_LAT);
  const up = Math.sin(dec) * Math.sin(EDFU_LAT) + Math.cos(dec) * Math.cos(H) * Math.cos(EDFU_LAT);
  return out.set(-Math.cos(dec) * Math.sin(H), up, -north);
}
function skyAt() {
  const utcHours = state.hour - EDFU_LON / 15 - equationOfTime(state.day) / 60;
  const d = (Date.UTC(state.year, 0, state.day) + utcHours * 3600e3) / 864e5 - 10957.5;
  const L = RAD * (218.316 + 13.176396 * d), Ma = RAD * (134.963 + 13.064993 * d), F = RAD * (93.272 + 13.22935 * d);
  const l = L + RAD * 6.289 * Math.sin(Ma), b = RAD * 5.128 * Math.sin(F), e = RAD * 23.4397;
  const ra = Math.atan2(Math.sin(l) * Math.cos(e) - Math.tan(b) * Math.sin(e), Math.cos(l));
  const dec = Math.asin(Math.sin(b) * Math.cos(e) + Math.cos(b) * Math.sin(e) * Math.sin(l));
  const lst = RAD * (280.16 + 360.9856235 * d) + EDFU_LON * RAD;
  return { lst, moonH: lst - ra, moonDec: dec };
}

const BRIGHT_STARS = [
  [6.752, -16.72, -1.46], [6.399, -52.70, -0.74], [14.660, -60.83, -0.27], [14.261, 19.18, -0.05], [18.616, 38.78, 0.03],
  [5.278, 46.00, 0.08], [5.242, -8.20, 0.13], [7.655, 5.22, 0.34], [5.919, 7.41, 0.5], [1.629, -57.24, 0.46],
  [14.064, -60.37, 0.61], [19.846, 8.87, 0.76], [12.443, -63.10, 0.77], [4.599, 16.51, 0.86], [16.490, -26.43, 0.96],
  [13.420, -11.16, 0.97], [7.755, 28.03, 1.14], [22.961, -29.62, 1.16], [20.690, 45.28, 1.25], [10.140, 11.97, 1.35],
  [6.977, -28.97, 1.5], [7.577, 31.89, 1.58], [17.560, -37.10, 1.62], [5.419, 6.35, 1.64], [5.438, 28.61, 1.65],
  [5.604, -1.20, 1.69], [5.679, -1.94, 1.77], [5.533, -0.30, 2.23], [5.796, -9.67, 2.06], [12.900, 55.96, 1.77],
  [11.062, 61.75, 1.79], [13.792, 49.31, 1.86], [13.399, 54.93, 2.23], [11.031, 56.38, 2.37], [11.897, 53.69, 2.44],
  [12.257, 57.03, 3.31], [2.530, 89.26, 1.98], [3.405, 49.86, 1.79], [6.628, 16.40, 1.93], [6.378, -17.96, 1.98],
  [7.140, -26.39, 1.83], [2.120, 23.46, 2.0], [0.727, -17.99, 2.04], [0.675, 56.54, 2.24], [0.153, 59.15, 2.28],
  [0.945, 60.72, 2.47], [1.430, 60.24, 2.68], [1.907, 63.67, 3.37], [0.140, 29.09, 2.06], [1.162, 35.62, 2.05],
  [2.065, 42.33, 2.1], [3.136, 40.96, 2.1], [23.079, 15.21, 2.49], [23.063, 28.08, 2.42], [0.221, 15.18, 2.83],
  [11.818, 14.57, 2.14], [10.333, 19.84, 2.0], [17.582, 12.56, 2.07], [14.845, 74.16, 2.08], [15.578, 26.71, 2.23],
  [20.370, 40.26, 2.23], [3.791, 24.11, 2.87], [3.819, 24.05, 3.6], [3.747, 24.11, 3.7], [3.763, 24.37, 3.9],
  [3.772, 23.95, 4.1], [3.753, 24.47, 4.3],
];
const stars = (() => {
  const pos = [], bright = [], size = [], col = [];
  const add = (v, mag, warmth) => {
    pos.push(v.x, v.y, v.z);
    bright.push(THREE.MathUtils.clamp(3.2 * Math.pow(10, -0.25 * mag), 0.06, 5));
    size.push(THREE.MathUtils.clamp(5.0 - 0.6 * mag, 1.4, 6.5));
    const c = new THREE.Color().setRGB(1, 0.95, 0.9).lerp(warmth > 0 ? new THREE.Color(1, 0.75, 0.5) : new THREE.Color(0.7, 0.8, 1), Math.abs(warmth));
    col.push(c.r, c.g, c.b);
  };
  const eq = (ra, dec) => new THREE.Vector3(Math.cos(dec) * Math.cos(ra), Math.cos(dec) * Math.sin(ra), Math.sin(dec));
  for (const [h, d, m] of BRIGHT_STARS) add(eq(h * 15 * RAD, d * RAD), m, (rand() - 0.5) * 0.8);
  for (let i = 0; i < 4500; i++) {
    const z = rand() * 2 - 1, a = rand() * Math.PI * 2, r = Math.sqrt(1 - z * z);
    add(new THREE.Vector3(r * Math.cos(a), r * Math.sin(a), z), 3.3 + 3.2 * Math.sqrt(rand()), (rand() - 0.5) * 0.6);
  }
  const G = [[-0.0548756, -0.8734371, -0.4838350], [0.4941094, -0.4448296, 0.7469822], [-0.8676661, -0.1980764, 0.4559838]];
  for (let i = 0; i < 70000; i++) {
    const gl = rand() * Math.PI * 2;
    if (rand() > 0.35 + 0.65 * Math.pow(Math.cos(gl / 2), 4)) { i--; continue; }
    const gb = (rand() + rand() + rand() - 1.5) * 0.16;
    const g = [Math.cos(gb) * Math.cos(gl), Math.cos(gb) * Math.sin(gl), Math.sin(gb)];
    const v = new THREE.Vector3(...[0, 1, 2].map(k => G[0][k] * g[0] + G[1][k] * g[1] + G[2][k] * g[2]));
    pos.push(v.x, v.y, v.z); bright.push(0.012 + 0.02 * rand()); size.push(2.5 + rand() * 3.5); col.push(0.85, 0.9, 1);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('aBright', new THREE.Float32BufferAttribute(bright, 1));
  geo.setAttribute('aSize', new THREE.Float32BufferAttribute(size, 1));
  geo.setAttribute('aColor', new THREE.Float32BufferAttribute(col, 3));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uRot: { value: new THREE.Matrix3() }, uVis: { value: 1 }, uTime: { value: 0 }, uPix: { value: renderer.getPixelRatio() } },
    vertexShader: `
      uniform mat3 uRot; uniform float uVis, uTime, uPix;
      attribute float aBright, aSize; attribute vec3 aColor;
      varying vec3 vCol;
      void main() {
        vec3 dir = uRot * position;
        vec4 v = viewMatrix * vec4(dir * 500.0, 0.0);
        gl_Position = projectionMatrix * vec4(v.xyz, 1.0);
        gl_Position.z = gl_Position.w * 0.99999;
        float twinkle = 0.8 + 0.2 * sin(uTime * (2.0 + fract(position.y * 91.0) * 3.0) + position.x * 997.0);
        float air = smoothstep(-0.01, 0.25, dir.y);
        vCol = aColor * aBright * uVis * mix(1.0, twinkle, step(0.1, aBright)) * air;
        gl_PointSize = aSize * uPix;
      }`,
    fragmentShader: `
      varying vec3 vCol;
      void main() {
        float d = length(gl_PointCoord - 0.5) * 2.0;
        float a = 1.0 - smoothstep(0.0, 1.0, d);
        gl_FragColor = vec4(vCol * a * a, 1.0);
      }`,
    blending: THREE.AdditiveBlending, depthWrite: false, transparent: true,
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  pts.layers.set(1);
  scene.add(pts);
  return mat;
})();

const moon = (() => {
  const mat = new THREE.ShaderMaterial({
    uniforms: { uMoon: { value: new THREE.Vector3(0, 1, 0) }, uSun: { value: new THREE.Vector3(0, 1, 0) }, uVis: { value: 1 }, uSize: { value: 0.013 } },
    vertexShader: `
      uniform vec3 uMoon; uniform float uSize;
      varying vec2 vUv; varying vec3 vR, vU;
      void main() {
        vec3 up0 = abs(uMoon.y) > 0.99 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0);
        vR = normalize(cross(uMoon, up0)); vU = cross(vR, uMoon);
        vUv = position.xy;
        vec3 dir = uMoon + (vR * position.x + vU * position.y) * uSize;
        vec4 v = viewMatrix * vec4(dir * 500.0, 0.0);
        gl_Position = projectionMatrix * vec4(v.xyz, 1.0);
        gl_Position.z = gl_Position.w * 0.99998;
      }`,
    fragmentShader: `
      uniform vec3 uMoon, uSun; uniform float uVis;
      varying vec2 vUv; varying vec3 vR, vU;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p) {
        vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
      }
      void main() {
        float r = length(vUv);
        vec3 n = vUv.x * vR + vUv.y * vU - sqrt(max(0.0, 1.0 - r * r)) * uMoon;
        float lit = smoothstep(-0.06, 0.1, dot(n, uSun));
        float maria = 0.6 + 0.4 * smoothstep(0.38, 0.62, noise(vUv * 2.2 + 3.0) * 0.65 + noise(vUv * 5.0) * 0.35);
        float disk = 1.0 - smoothstep(0.96, 1.0, r);
        vec3 col = vec3(1.0, 0.96, 0.88) * (0.01 + 0.7 * lit * maria) * disk;
        float frac = 0.5 - 0.5 * dot(uMoon, uSun);
        col += vec3(0.6, 0.7, 1.0) * 0.05 * frac * exp(-3.0 * max(r - 1.0, 0.0)) * (1.0 - disk);
        gl_FragColor = vec4(col * uVis, 1.0);
      }`,
    blending: THREE.AdditiveBlending, depthWrite: false, transparent: true,
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), mat);
  m.frustumCulled = false;
  m.layers.set(1);
  scene.add(m);
  return mat;
})();
const SUN = 8.5;
const SKY = { horizon: 1.9, zenith: 0.8, zenithTint: new THREE.Color(0.22, 0.74, 1.85), curve: 0.25, glow: 0.6 };
const skyDome = (() => {
  const mat = new THREE.ShaderMaterial({
    uniforms: { uZenith: { value: new THREE.Color() }, uHorizon: { value: new THREE.Color() }, uGlow: { value: new THREE.Color() },
      uSun: { value: new THREE.Vector3(0, 1, 0) }, uCurve: { value: SKY.curve } },
    vertexShader: `
      varying vec3 vDir;
      void main() {
        vDir = position;
        vec4 v = viewMatrix * vec4(position * 500.0, 0.0);
        gl_Position = projectionMatrix * vec4(v.xyz, 1.0);
        gl_Position.z = gl_Position.w * 0.999995;
      }`,
    fragmentShader: `
      uniform vec3 uZenith, uHorizon, uGlow, uSun;
      uniform float uCurve;
      varying vec3 vDir;
      void main() {
        vec3 d = normalize(vDir);
        float h = max(d.y, 0.0);
        vec3 col = mix(uHorizon, uZenith, smoothstep(0.0, uCurve, h)) * (1.0 - 0.25 * smoothstep(uCurve, 1.0, h));
        float c = max(dot(d, uSun), 0.0);
        col += uGlow * (0.35 * pow(c, 6.0) + 1.2 * pow(c, 60.0)) * (1.0 - 0.6 * h);
        gl_FragColor = vec4(col, 1.0);
      }`,
    side: THREE.BackSide, depthWrite: false,
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), mat);
  m.frustumCulled = false;
  m.renderOrder = -1;
  m.layers.set(1);
  scene.add(m);
  return mat;
})();
const sunDir = new THREE.Vector3();
const warm = new THREE.Color(1.0, 0.55, 0.28), white = new THREE.Color(1.0, 0.93, 0.82);
const haze = new THREE.Color(1.0, 1.02, 1.04);
const skyNight = new THREE.Color(0.01, 0.015, 0.035), skyDawn = new THREE.Color(1.1, 0.6, 0.35), skyDay = new THREE.Color(0.75, 0.95, 1.3);
scene.background = new THREE.Color();
let sunDirty = true;
function sunUpdated() { sunDirty = false; }

const hourIn = document.getElementById('hour'), dayIn = document.getElementById('day');
const hourOut = document.getElementById('hourOut'), dayOut = document.getElementById('dayOut');
const sunInfo = document.getElementById('sunInfo');
const deg = THREE.MathUtils.degToRad;

const trueSun = new THREE.Vector3(), moonDir = new THREE.Vector3();
const moonColor = new THREE.Color(0.62, 0.72, 1.0), moonSky = new THREE.Color(0.006, 0.01, 0.024);
const duskSky = new THREE.Color(0.028, 0.036, 0.075);
const hemiSky = hemi.color.clone(), hemiGround = hemi.groundColor.clone();
const nightSky = new THREE.Color(0xa8b8e0), nightGround = new THREE.Color(0x707686);
const skyRot = new THREE.Matrix3();
function updateSun() {
  const dec = deg(-23.44 * Math.cos(2 * Math.PI / 365 * (state.day + 10)));
  const H = deg(15 * (state.hour - 12));
  skyVector(H, dec, trueSun).normalize();
  const up = trueSun.y;

  const sky = skyAt();
  skyVector(sky.moonH, sky.moonDec, moonDir).normalize();
  const moonFrac = 0.5 - 0.5 * moonDir.dot(trueSun);
  const night = 1 - THREE.MathUtils.smoothstep(up, -0.15, -0.02);
  const moonLevel = night * THREE.MathUtils.smoothstep(moonDir.y, -0.01, 0.12) * moonFrac;
  const cl = Math.cos(sky.lst), sl = Math.sin(sky.lst);
  skyRot.set(-sl, cl, 0,
    cl * Math.cos(EDFU_LAT), sl * Math.cos(EDFU_LAT), Math.sin(EDFU_LAT),
    cl * Math.sin(EDFU_LAT), sl * Math.sin(EDFU_LAT), -Math.cos(EDFU_LAT));
  stars.uniforms.uRot.value.copy(skyRot);
  stars.uniforms.uVis.value = (1 - THREE.MathUtils.smoothstep(up, -0.16, -0.03)) * (1 - 0.45 * moonLevel);
  moon.uniforms.uMoon.value.copy(moonDir);
  moon.uniforms.uSun.value.copy(trueSun);
  moon.uniforms.uVis.value = 0.35 + 0.65 * night;

  const daylight = THREE.MathUtils.smoothstep(up, -0.02, 0.12);
  state.daylight = daylight;
  state.light = daylight > 0 ? daylight : 0.16 * moonLevel;
  const highSun = THREE.MathUtils.smoothstep(up, 0.05, 0.6);
  if (daylight > 0) {
    sunDir.copy(trueSun);
    sun.color.copy(warm).lerp(white, highSun);
    sun.intensity = SUN * daylight;
  } else {
    sunDir.copy(moonDir.y > 0 ? moonDir : trueSun);
    sun.color.copy(moonColor);
    sun.intensity = 0.7 * moonLevel;
  }
  sun.position.copy(target).addScaledVector(sunDir, 150);
  lightCam.position.copy(sun.position);
  lightCam.lookAt(target);
  lightCam.updateMatrixWorld();
  fitShadow();
  lightVP.multiplyMatrices(lightCam.projectionMatrix, lightCam.matrixWorldInverse);

  const dusk = (1 - daylight) * Math.pow(THREE.MathUtils.smoothstep(up, -0.19, -0.01), 1.5);
  state.dusk = dusk;
  hemi.intensity = 0.09 + 0.67 * daylight + 0.12 * moonLevel + 0.22 * dusk;
  for (const i of OPEN_ZONES) skyFill.value[i] = daylight;
  hemi.color.copy(hemiSky).lerp(nightSky, 1 - daylight);
  hemi.groundColor.copy(hemiGround).lerp(nightGround, 1 - daylight);
  scene.background.copy(skyDawn).lerp(skyDay, highSun).lerp(skyNight, 1 - daylight).multiplyScalar(0.2 + 0.5 * daylight)
    .add(moonSky.clone().multiplyScalar(moonLevel))
    .add(duskSky.clone().multiplyScalar(dusk));
  {
    const b = scene.background, lum = 0.2126 * b.r + 0.7152 * b.g + 0.0722 * b.b;
    skyDome.uniforms.uHorizon.value.copy(b).lerp(haze.clone().multiplyScalar(lum), 0.85 * daylight)
      .multiplyScalar(THREE.MathUtils.lerp(1.3, SKY.horizon, daylight));
    const lumDay = 0.2126 * skyDay.r + 0.7152 * skyDay.g + 0.0722 * skyDay.b;
    const blue = skyDay.clone().multiply(SKY.zenithTint).multiplyScalar(SKY.zenith * lum / lumDay);
    skyDome.uniforms.uZenith.value.copy(b).multiplyScalar(0.8).lerp(blue, THREE.MathUtils.smoothstep(daylight, 0, 0.4));
    skyDome.uniforms.uGlow.value.copy(warm).lerp(white, highSun).multiplyScalar(SKY.glow * (0.3 + 0.7 * (1 - highSun)) * Math.max(daylight, dusk));
    skyDome.uniforms.uSun.value.copy(trueSun);
    skyDome.uniforms.uCurve.value = SKY.curve;
  }
  volMat.uniforms.uSunDir.value.copy(sunDir);
  volMat.uniforms.uSunColor.value.copy(sun.color).multiplyScalar(sun.intensity * 5.5 / SUN);
  dustMat.uniforms.uColor.value.copy(sun.color).multiplyScalar(sun.intensity * 0.12 * 5.5 / SUN);

  const hh = Math.floor(state.hour), mm = Math.floor((state.hour - hh) * 60);
  hourOut.textContent = `${hh}:${String(mm).padStart(2, '0')} Uhr`;
  dayOut.textContent = new Date(state.year, 0, state.day).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' });
  const elev = Math.asin(THREE.MathUtils.clamp(up, -1, 1)) * 180 / Math.PI;
  const moonPct = Math.round(moonFrac * 100);
  sunInfo.textContent = elev > 0 ? `Sonnenhöhe ${elev.toFixed(0)}° · wahre Ortszeit Edfu`
    : moonDir.y > 0 ? `Nacht · Mond ${moonPct} % beleuchtet, ${(Math.asin(moonDir.y) / RAD).toFixed(0)}° hoch`
    : `Nacht · Mond (${moonPct} %) unter dem Horizont`;
  sunDirty = true;
}
const liveToggle = document.getElementById('live');
let live = true, lastLive = performance.now();
function syncNow() {
  Object.assign(state, edfuNow());
  hourIn.value = state.hour; dayIn.value = state.day;
  lastLive = performance.now();
  updateSun();
}
function setLive(on) {
  live = on; liveToggle.checked = on;
  if (on) syncNow();
}
liveToggle.addEventListener('change', () => setLive(liveToggle.checked));
hourIn.addEventListener('input', () => { setLive(false); state.hour = +hourIn.value; updateSun(); });
dayIn.addEventListener('input', () => { setLive(false); state.day = +dayIn.value; updateSun(); });
hourIn.value = state.hour; dayIn.value = state.day;
updateSun();

export { SKY, dayIn, deg, hourIn, lastLive, live, moonDir, setLive, skyDome, stars, state, sunDir, sunDirty, sunUpdated, syncNow, trueSun, updateSun };
