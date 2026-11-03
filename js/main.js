import * as THREE from 'three';
import { M, NZ, ROOMS, STEPS, ZONES, bounceTarget, bounceUniform } from './masse.js';
import { camera, renderer, scene } from './szene.js';
import { paintUniform } from './material.js';
import { depthOnly, depthRT, dustMat, lightCam, lightDepthRT, sun, updateLamp } from './licht.js';
import { blurRT, renderVolumetric, volMat, volRT } from './strahlen.js';
import { dayIn, deg, hourIn, moonDir, setLive, stars, state, sunDir, sunDirty, sunUpdated, trueSun, updateSun } from './himmel.js';
import { bloom, measureBounce, renderPost, setPostSize } from './rueckstrahlung.js';
import { endFrame, jitterCamera, resetHistory, setBeams, taaPass } from './glaettung.js';
import { updateStandLamps } from './lampen.js';
import { AO, renderAO, setAOSize } from './verdeckung.js';
import { measureKey } from './belichtung.js';
import { updatePlan } from './grundriss.js';
import './rundgang.js';
import './klang.js';
import { fotoNachBild } from './foto.js';
import { EYE_KEY, curLevel, eyeState, floorAt, isFree, paintTarget, roomAt, setLevel, setView, updateControls, updateEye } from './steuerung.js';

const SEALED = ZONES.filter(z => z.portals).map(zone => ({ zone,
  boxes: zone.portals.map(([x0, x1, y0, y1, z0, z1]) => new THREE.Box3().set(new THREE.Vector3(x0, y0, z0), new THREE.Vector3(x1, y1, z1)).expandByScalar(0.25)) }));
const frustum = new THREE.Frustum(), viewProj = new THREE.Matrix4();
function sealedRoom() {
  const p = camera.position;
  const s = SEALED.find(({ zone: { room: [x0, x1, z0, z1, y0, y1] } }) =>
    p.x > x0 && p.x < x1 && p.z > z0 && p.z < z1 && p.y > y0 && p.y < y1);
  if (!s) return null;
  frustum.setFromProjectionMatrix(viewProj.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
  return s.boxes.some(b => frustum.intersectsBox(b)) ? null : s.zone;
}
const HIDDEN = 1 << 31, roomBox = new THREE.Box3();
let culledZone = null, cullables = null, cullOn = true;
function cullTo(zone) {
  if (zone === culledZone) return;
  cullables ??= scene.children.filter(o => (o.isMesh || o.isPoints) && o.frustumCulled)
    .map(o => ({ o, box: new THREE.Box3().setFromObject(o), mask: o.layers.mask }));
  if (zone) {
    const [x0, x1, z0, z1, y1] = zone.box;
    roomBox.min.set(x0 - 0.3, -1, z0 - 0.3);
    roomBox.max.set(x1 + 0.3, y1 + 1, z1 + 0.3);
  }
  for (const c of cullables) c.o.layers.mask = zone && !c.box.intersectsBox(roomBox) ? HIDDEN : c.mask;
  culledZone = zone;
}

const buf = new THREE.Vector2();
const DPR = Math.round(devicePixelRatio * 100) / 100;
const STUFEN = [...new Set([0.5, 0.75, 1, 1.5, 2, 3].map(pr => Math.min(pr, DPR)))];
const qualIn = document.getElementById('qual'), qualOut = document.getElementById('qualOut');
let stufe = STUFEN.length - 1;
try { const s = localStorage.getItem('edfu-qualitaet'); if (s !== null && STUFEN[+s]) stufe = +s; } catch (e) {}
qualIn.max = STUFEN.length - 1;
const showStufe = () => {
  qualIn.value = stufe;
  qualOut.textContent = `${stufe + 1} von ${STUFEN.length}`;
  bloom.enabled = stufe >= 2;
};
qualIn.addEventListener('input', () => {
  stufe = +qualIn.value;
  showStufe();
  resize();
  resetHistory();
  try { localStorage.setItem('edfu-qualitaet', stufe); } catch (e) {}
});
showStufe();
function resize() {
  const w = Math.max(1, innerWidth), h = Math.max(1, innerHeight);
  camera.aspect = w / h;
  camera.fov = Math.min(65, THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(deg(85) / 2) / camera.aspect)));
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(STUFEN[stufe]);
  renderer.setSize(w, h);
  setPostSize();
  stars.uniforms.uPix.value = renderer.getPixelRatio();
  const b = renderer.getDrawingBufferSize(buf);
  depthRT.setSize(b.x, b.y);
  volRT.setSize(Math.ceil(b.x / 4), Math.ceil(b.y / 4));
  blurRT.setSize(Math.ceil(b.x / 4), Math.ceil(b.y / 4));
  setAOSize(b.x, b.y);
  dustMat.uniforms.uScale.value = b.y / (2 * Math.tan(deg(camera.fov) / 2));
}
addEventListener('resize', resize);
resize();

const clock = new THREE.Clock();
let bounceDue = false, lastBounce = -1e9;

const fpsEl = document.getElementById('fps');
let fpsFrames = 0, fpsSince = performance.now();
function updateFps() {
  fpsFrames++;
  const now = performance.now(), span = now - fpsSince;
  if (span >= 500) {
    const fps = fpsFrames * 1000 / span;
    fpsEl.innerHTML = `${fps.toFixed(0)} FPS<br><small>${(span / fpsFrames).toFixed(1)} ms/Bild</small>`;
    fpsEl.style.color = fps >= 50 ? '#f0cf8a' : fps >= 30 ? '#e8a060' : '#e06050';
    fpsFrames = 0;
    fpsSince = now;
  }
}

function frame() {
  updateFps();
  const dt = Math.min(clock.getDelta(), 0.05);
  updateControls(dt);
  updateEye(dt);
  updatePlan();
  updateLamp(dt, clock.elapsedTime);
  updateStandLamps(dt, clock.elapsedTime);
  dustMat.uniforms.uTime.value = clock.elapsedTime;
  stars.uniforms.uTime.value = clock.elapsedTime;
  paintUniform.value += (paintTarget - paintUniform.value) * Math.min(1, dt * 3);
  camera.updateMatrixWorld();
  jitterCamera(buf.x, buf.y);

  const sunChanged = sunDirty, sealed = sealedRoom();
  cullTo(sunDirty || renderer.shadowMap.needsUpdate || !cullOn ? null : sealed);
  scene.overrideMaterial = depthOnly;
  if (sunDirty) {
    renderer.setRenderTarget(lightDepthRT);
    renderer.render(scene, lightCam);
    renderer.shadowMap.needsUpdate = sun.shadow.needsUpdate = true;
    sunUpdated();
  }
  camera.layers.set(0);
  renderer.setRenderTarget(depthRT);
  renderer.render(scene, camera);
  scene.overrideMaterial = null;
  renderAO();
  if (sunChanged) bounceDue = true;
  if (bounceDue && performance.now() - lastBounce > 250) {
    measureBounce();
    bounceDue = false;
    lastBounce = performance.now();
  }
  for (let i = 0; i < NZ; i++) {
    bounceUniform.value[i] += (bounceTarget[i] - bounceUniform.value[i]) * Math.min(1, dt * 2);
  }
  const beams = volMat.uniforms.uSunColor.value;
  const beamsOn = Math.max(beams.r, beams.g, beams.b) > 1e-3 && !sealed && stufe >= 2;
  setBeams(beamsOn);
  if (beamsOn) renderVolumetric();
  renderer.setRenderTarget(null);

  camera.layers.enable(1);
  renderPost(dt);
  fotoNachBild();
  measureKey();
  endFrame();
  requestAnimationFrame(frame);
}

const BATCH = renderer.extensions.has('KHR_parallel_shader_compile') ? 4 : 1;
const compileTimes = [];
async function compileShaders(report) {
  const users = new Map();
  scene.traverse(o => { for (const m of [o.material ?? []].flat()) if (!users.has(m)) users.set(m, o); });
  const sig = (m, o) => [m.type, m.customProgramCacheKey(), !!m.map, m.transparent, m.side, m.alphaTest > 0, !!o.isInstancedMesh].join();
  const todo = new Map();
  for (const [m, o] of users) todo.set(sig(m, o), m.isMeshStandardMaterial ? 1 : 0.05);
  const total = [...todo.values()].reduce((a, b) => a + b, 0);
  const seen = new Set();
  let n = 0, batch = [], names = [], done = 0, coming = 0;
  await report(0);
  for (const [m, o] of users) {
    renderer.setRenderTarget(depthRT);
    renderer.compile(o, camera, scene);
    renderer.setRenderTarget(null);
    const p = renderer.properties.get(m).currentProgram, s = sig(m, o);
    if (!seen.has(p)) { seen.add(p); batch.push(p); names.push(m.type); }
    if (todo.has(s)) { coming += todo.get(s); todo.delete(s); }
    if (++n < users.size && batch.length < BATCH) continue;
    const t0 = performance.now();
    while (!batch.every(p => p.isReady())) await new Promise(r => setTimeout(r, 5));
    for (const p of batch) p.getUniforms();
    if (batch.length) compileTimes.push([names.join('+'), Math.round(performance.now() - t0)]);
    batch = []; names = [];
    done += coming; coming = 0;
    await report(done / total);
  }
}
function start() {
  frame();
  document.getElementById('start').classList.add('ready');
  document.getElementById('goText').textContent = 'Eintreten';
}

window.temple = { THREE, scene, camera, renderer, sunDir, moonDir, trueSun, state, updateSun, bounce: bounceUniform.value, ZONES,
  M, ROOMS, STEPS, isFree, floorAt, roomAt, compileTimes,
  get level() { return curLevel; }, set level(l) { setLevel(l); },
  get cull() { return cullOn; }, set cull(on) { cullOn = on; },  setView(...a) { setView(...a); resetHistory(); },
  eye: { EYE_KEY, eyeState },
  passes: { renderAO, AO, taaPass, renderPost, depthRT, depthOnly, lightDepthRT, lightCam, renderVolumetric, measureBounce },
  setTime(hour, day = state.day) { setLive(false); state.hour = hour; state.day = day; hourIn.value = hour; dayIn.value = day; updateSun(); },
};

export { compileShaders, start };
