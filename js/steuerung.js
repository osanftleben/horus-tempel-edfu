import * as THREE from 'three';
import { OPEN_ZONES, PT, ROOMS, STEPS, zoneAtPoint, zoneLight } from './masse.js';
import { imageHigh, imageKey } from './belichtung.js';
import { camera, renderer } from './szene.js';
import { courtPos, hallPos, proPos } from './bau/saeulen.js';
import { SKY_Z } from './bau/festsaal.js';
import { JAMB_COLLIDERS } from './bau/pronaos.js';
import { BARK_Z, NAOS_Z, OFF_C, OFF_HOLES } from './bau/innenraeume.js';
import { LEAF_COLLIDERS, falconPos, mastPos } from './bau/ausstattung.js';
import { CHAPEL_COLLIDERS } from './bau/kapellen.js';
import { CHAMBER_COLLIDERS } from './bau/kammern.js';
import { SIDE_COLLIDERS } from './bau/seitenraeume.js';
import { WAB_COLLIDERS } from './bau/reinheitsplatz.js';
import { MAM_COLLIDERS } from './bau/mammisi.js';
import { lampLevel, lampOn, setLamp } from './licht.js';
import { brazierPos, standLightAt, standPos } from './lampen.js';
import { deg, hourIn, lastLive, live, setLive, state, syncNow, updateSun } from './himmel.js';
import { resetHistory } from './glaettung.js';
import { ANSICHTEN, GRUPPEN } from './ansichten.js';

const keys = {};
const paintToggle = document.getElementById('paint');
let paintTarget = 1;
paintToggle.addEventListener('change', () => { paintTarget = paintToggle.checked ? 1 : 0; });
const lampToggle = document.getElementById('lamp');
lampToggle.addEventListener('change', () => setLamp(lampToggle.checked));
const measToggle = document.getElementById('meas');
const showMeas = on => {
  measToggle.checked = on;
  document.documentElement.classList.toggle('messwerte', on);
  try { localStorage.setItem('edfu-messwerte', on ? '1' : ''); } catch (e) {}
};
measToggle.addEventListener('change', () => showMeas(measToggle.checked));
try { showMeas(localStorage.getItem('edfu-messwerte') === '1'); } catch (e) {}
addEventListener('keydown', e => {
  keys[e.code] = true;
  if (e.code === 'KeyF' && !e.repeat) {
    paintToggle.checked = !paintToggle.checked;
    paintTarget = paintToggle.checked ? 1 : 0;
  }
  if (e.code === 'KeyL' && !e.repeat) {
    setLamp(!lampOn);
    lampToggle.checked = lampOn;
  }
  if (e.code === 'KeyN' && !e.repeat) setLive(!live);
  if (e.code === 'KeyM' && !e.repeat) showMeas(!measToggle.checked);
  if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
});
addEventListener('keyup', e => { keys[e.code] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

let yaw = deg(-12), pitch = deg(8), dragging = false;
const canvas = renderer.domElement;
const startEl = document.getElementById('start');
const look = (dx, dy) => {
  yaw -= dx * 0.0022;
  pitch = THREE.MathUtils.clamp(pitch - dy * 0.0022, -1.45, 1.45);
};
const lockPointer = () => { try { const p = canvas.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (e) {} };

const touchMode = () => document.documentElement.classList.contains('touch');
const fullToggle = document.getElementById('full');
const setFull = on => {
  if (on && !document.fullscreenElement) document.documentElement.requestFullscreen({ navigationUI: 'hide' }).catch(() => {});
  else if (!on && document.fullscreenElement) document.exitFullscreen().catch(() => {});
};
fullToggle.addEventListener('change', () => setFull(fullToggle.checked));
const landToggle = document.getElementById('land');
const setLand = async on => {
  try {
    if (!on) return screen.orientation.unlock();
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
    await screen.orientation.lock('landscape');
  } catch (e) { landToggle.checked = false; }
};
landToggle.addEventListener('change', () => setLand(landToggle.checked));
addEventListener('fullscreenchange', () => {
  fullToggle.checked = !!document.fullscreenElement;
  if (!document.fullscreenElement) landToggle.checked = false;
});
if (!document.fullscreenEnabled) document.getElementById('fullRow').style.display = 'none';
if (!document.fullscreenEnabled || !screen.orientation?.lock) document.getElementById('landRow').style.display = 'none';

startEl.addEventListener('click', () => {
  if (!startEl.classList.contains('ready')) return;
  startEl.classList.add('hidden');
  if (touchMode()) setFull(true);
  else lockPointer();
});
canvas.addEventListener('click', () => {
  hudEl.classList.remove('goto');
  if (!touchMode() && document.pointerLockElement !== canvas) lockPointer();
});
canvas.addEventListener('mousedown', () => { dragging = true; });
addEventListener('mouseup', () => { dragging = false; });
addEventListener('mousemove', e => {
  if (document.pointerLockElement === canvas || dragging) look(e.movementX, e.movementY);
});

const STICK = 56;
const stickEl = document.getElementById('stick'), knobEl = stickEl.firstElementChild;
const stick = { id: null, x0: 0, y0: 0, f: 0, s: 0 }, swipe = { id: null, x: 0, y: 0 };
const onUI = e => e.target.closest?.('#hud, #start');
addEventListener('touchstart', e => {
  if (onUI(e)) return;
  e.preventDefault();
  document.documentElement.classList.add('touch');
  hudEl.classList.remove('open', 'goto');
  const r = stickEl.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  for (const t of e.changedTouches) {
    if (stick.id === null && Math.hypot(t.clientX - cx, t.clientY - cy) < STICK + 24) {
      Object.assign(stick, { id: t.identifier, x0: cx, y0: cy, f: 0, s: 0 });
      stickEl.className = 'on';
    } else if (swipe.id === null) Object.assign(swipe, { id: t.identifier, x: t.clientX, y: t.clientY });
  }
}, { passive: false });
addEventListener('touchmove', e => {
  if (stick.id === null && swipe.id === null) return;
  e.preventDefault();
  for (const t of e.changedTouches) {
    if (t.identifier === stick.id) {
      let dx = t.clientX - stick.x0, dy = t.clientY - stick.y0;
      const len = Math.hypot(dx, dy);
      if (len > STICK) { dx *= STICK / len; dy *= STICK / len; }
      stick.s = dx / STICK;
      stick.f = -dy / STICK;
      knobEl.style.transform = `translate(${dx}px, ${dy}px)`;
      stickEl.className = stick.f > 0.9 ? 'on run' : 'on';
    } else if (t.identifier === swipe.id) {
      const k = 800 / Math.min(innerWidth, innerHeight);
      look((swipe.x - t.clientX) * k, (swipe.y - t.clientY) * k);
      swipe.x = t.clientX;
      swipe.y = t.clientY;
    }
  }
}, { passive: false });
const release = e => {
  for (const t of e.changedTouches) {
    if (t.identifier === stick.id) {
      stick.id = null;
      stick.f = stick.s = 0;
      stickEl.className = knobEl.style.transform = '';
    }
    if (t.identifier === swipe.id) swipe.id = null;
  }
};
addEventListener('touchend', release);
addEventListener('touchcancel', release);

const hudEl = document.getElementById('hud');
document.getElementById('place').addEventListener('click', () => {
  if (touchMode() && !hudEl.classList.toggle('open')) hudEl.classList.remove('goto');
});

const colliders = [
  ...courtPos.map(([x, z]) => [x, z, 1.0]),
  ...proPos.map(([x, z]) => [x, z, 1.2]),
  ...hallPos.map(([x, z]) => [x, z, 1.0]),
  ...falconPos.map(([x, z]) => [x, z, 1.35]),
  ...OFF_HOLES.map(x => [x, OFF_C, 1.0]),
  [0, NAOS_Z, 1.15], [0, BARK_Z + 0.7, 0.9], [0, BARK_Z - 0.7, 0.75],
  ...mastPos.map(([x, z]) => [x, z, 0.45]),
  ...standPos.map(([x, z]) => [x, z, 0.3]),
  ...brazierPos.map(([x, z]) => [x, z, 0.75]),
  ...CHAPEL_COLLIDERS,
  ...SIDE_COLLIDERS,
  ...CHAMBER_COLLIDERS,
  ...WAB_COLLIDERS,
  ...LEAF_COLLIDERS,
  ...JAMB_COLLIDERS,
  ...MAM_COLLIDERS,
  ...SKY_Z.flatMap(c => [[0, c - 0.4, 0.85, 1], [0, c + 0.4, 0.85, 1]]),
];
const R = 0.35;
let curLevel = 0;
const onLevel = e => (e.levels ? e.levels.includes(curLevel) : (e.level ?? 0) === curLevel);
const inRect = (r, x, z, m = 0) => x > r.x0 + m && x < r.x1 - m && z > r.z0 + m && z < r.z1 - m;
let footY = 0;
function stackedAt(x, z) {
  let y = null;
  for (const s of PT.floors) if (onLevel(s) && inRect(s, x, z) && (y === null || Math.abs(s.y - footY) < Math.abs(y - footY))) y = s.y;
  return y;
}
const reachable = (x, z) => { const y = stackedAt(x, z); return y !== null && Math.abs(y - footY) < 0.6; };
const inBand = r => !r.band || (footY > r.band[0] && footY < r.band[1]);
function isFree(x, z) {
  if (!ROOMS.some(r => onLevel(r) && inBand(r) && inRect(r, x, z, R) && (!r.stacked || reachable(x, z)))) return false;
  for (const [cx, cz, cr, lv = 0] of colliders) {
    if (lv !== curLevel) continue;
    const dx = x - cx, dz = z - cz;
    if (dx * dx + dz * dz < (cr + R) ** 2) return false;
  }
  return true;
}
function floorAt(x, z) {
  const y = stackedAt(x, z);
  if (y !== null && (Math.abs(y - footY) < 0.6 || !ROOMS.some(r => !r.stacked && onLevel(r) && inBand(r) && inRect(r, x, z)))) return y;
  for (const s of STEPS) if (onLevel(s) && inRect(s, x, z)) return s.y;
  const room = ROOMS.find(r => r.floor !== undefined && onLevel(r) && inBand(r) && inRect(r, x, z));
  return room ? room.floor : 0;
}
const roomAt = (x, z) => ROOMS.find(r => onLevel(r) && inBand(r) && inRect(r, x, z));
function updateLevel(x, z) {
  const r = ROOMS.find(r => r.levels && r.levels.includes(curLevel) && inBand(r) && inRect(r, x, z));
  if (r) curLevel = floorAt(x, z) > r.split ? r.levels[1] : r.levels[0];
}
function setLevel(l) { curLevel = l; }
const EYE = 1.67;
let eyeY = (footY = floorAt(camera.position.x, camera.position.z)) + EYE;
function setView(x, z, yawDeg, pitchDeg = 0, level = 0, y = 0) {
  camera.position.x = x; camera.position.z = z; yaw = deg(yawDeg); pitch = deg(pitchDeg);
  curLevel = level; footY = y; updateLevel(x, z);
  footY = floorAt(x, z);
  eyeY = footY + EYE;
}
const gotoBtn = document.getElementById('gotoBtn'), gotoList = document.getElementById('gotoList');
for (const [gruppe, orte] of Object.entries(GRUPPEN)) {
  const g = document.createElement('div');
  g.textContent = gruppe;
  gotoList.append(g);
  for (const ort of Object.keys(orte)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = b.dataset.ort = ort;
    gotoList.append(b);
  }
}
gotoBtn.addEventListener('click', () => {
  hudEl.classList.toggle('goto');
  gotoList.scrollTop = 0;
  gotoBtn.blur();
});
gotoList.addEventListener('click', e => {
  const view = ANSICHTEN[e.target.dataset?.ort];
  if (!view) return;
  e.target.blur();
  setView(...view);
  resetHistory();
  hudEl.classList.remove('open', 'goto');
});

function updateControls(dt) {
  let gait = keys.ShiftLeft || keys.ShiftRight ? 3.0 : 1.4;
  let f = 0, s = 0;
  if (keys.KeyW || keys.ArrowUp) f += 1;
  if (keys.KeyS || keys.ArrowDown) f -= 1;
  if (keys.KeyD || keys.ArrowRight) s += 1;
  if (keys.KeyA || keys.ArrowLeft) s -= 1;
  const turn = Math.max(0, Math.abs(stick.s) - 0.15) / 0.85;
  yaw -= Math.sign(stick.s) * turn * turn * 1.8 * dt;
  if (!f && !s && Math.abs(stick.f) > 0.15) {
    f = stick.f;
    gait = f > 0.9 ? 3.0 : 1.4 * Math.min(1, Math.abs(f) / 0.8);
  }
  let speed = gait * dt;
  if (f || s) {
    const len = Math.hypot(f, s);
    const ux = (-Math.sin(yaw) * f + Math.cos(yaw) * s) / len, uz = (-Math.cos(yaw) * f - Math.sin(yaw) * s) / len;
    const px = camera.position.x, pz = camera.position.z;
    const rise = floorAt(px + ux * 0.6, pz + uz * 0.6) - floorAt(px - ux * 0.3, pz - uz * 0.3);
    if (rise > 0.15) speed *= 0.43; else if (rise < -0.15) speed *= 0.57;
    const dx = ux * speed, dz = uz * speed;
    if (isFree(camera.position.x + dx, camera.position.z)) camera.position.x += dx;
    if (isFree(camera.position.x, camera.position.z + dz)) camera.position.z += dz;
    updateLevel(camera.position.x, camera.position.z);
    footY = floorAt(camera.position.x, camera.position.z);
  }
  eyeY += (footY + EYE - eyeY) * Math.min(1, dt * 10);
  camera.position.y = eyeY;
  if (keys.KeyQ || keys.KeyE) {
    if (live) setLive(false);
    state.hour = THREE.MathUtils.clamp(state.hour + (keys.KeyE ? 1 : -1) * dt * 0.8, 0, 24);
    hourIn.value = state.hour;
    updateSun();
  } else if (live && performance.now() - lastLive > 15000) syncNow();
  camera.rotation.set(pitch, yaw, 0);
}

const placeEl = document.getElementById('placeName'), poseEl = document.getElementById('pose');
let lastPlace = '', lastPose = '';
const lampHint = document.getElementById('lampHint');
const EYE_KEY = { ref: 0.156, k: 0.5, highRef: 0.46, highK: 0.8, down: 0.6, up: 2.0 };
const eyeState = {};
function updateEye(dt) {
  const p = camera.position;
  const base = 0.01 + 0.09 * state.daylight;
  const sky = Math.max(state.daylight > 0 ? state.light : 0.25 * state.light, 0.3 * state.dusk);
  const around = zoneLight(p.x, p.y, p.z) * (base + (1 - base) * sky) + standLightAt(p);
  const light = around + 0.12 * lampLevel;
  const maxExp = 2.6 + 3.4 * (1 - state.daylight);
  const eyeExp = l => THREE.MathUtils.clamp(1.05 * Math.pow(l, -0.38), 1.0, maxExp);
  lampHint.classList.toggle('show', !lampOn && around * eyeExp(around) < 0.2);
  const zoneExp = eyeExp(light), key = imageKey(), high = imageHigh();
  let imgExp = 1;
  if (key > 0) {
    const open = OPEN_ZONES.includes(zoneAtPoint(p.x, p.y, p.z)) ? Math.max(state.daylight, state.dusk) : 0;
    imgExp = THREE.MathUtils.clamp(Math.min(Math.pow(EYE_KEY.ref / (key * zoneExp), EYE_KEY.k),
      Math.pow(EYE_KEY.highRef / (high * zoneExp), EYE_KEY.highK * open)),
    1 - (1 - EYE_KEY.down) * state.daylight, 1 + (EYE_KEY.up - 1) * open);
  }
  Object.assign(eyeState, { key, high, zoneExp, imgExp });
  const targetExp = zoneExp * imgExp;
  renderer.toneMappingExposure += (targetExp - renderer.toneMappingExposure) * Math.min(1, dt * 0.8);
  const name = roomAt(p.x, p.z)?.name ?? '';
  if (name !== lastPlace) { placeEl.textContent = name; lastPlace = name; }
  const r = THREE.MathUtils.radToDeg, look = ((r(yaw) % 360) + 540) % 360 - 180;
  const pose = `x ${p.x.toFixed(2)}  z ${p.z.toFixed(2)}  y ${p.y.toFixed(2)}\nBlick ${look.toFixed(0)}°  Neigung ${r(pitch).toFixed(0)}°  Ebene ${curLevel}`;
  if (pose !== lastPose) { poseEl.textContent = pose; lastPose = pose; }
}

export { EYE_KEY, curLevel, eyeState, floorAt, isFree, paintTarget, roomAt, setLevel, setView, updateControls, updateEye };
