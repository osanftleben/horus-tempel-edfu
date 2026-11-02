import { renderer, camera } from './szene.js';
import { resetHistory } from './glaettung.js';
import { ANSICHTEN, RUNDGANG } from './ansichten.js';
import { RAUMTEXTE } from './raumtexte.js';
import { glideTo, holdView, planGlide, roomAt, setView } from './steuerung.js';

const html = document.documentElement;
const boxEl = document.getElementById('fuehrung'), blendeEl = document.getElementById('blende');
const nrEl = document.getElementById('fNr'), titelEl = document.getElementById('fTitel'), textEl = document.getElementById('fText');
const zurueckBtn = document.getElementById('fZurueck'), weiterBtn = document.getElementById('fWeiter');
const stickEl = document.getElementById('stick'), hudEl = document.getElementById('hud');
let station = -1, busy = false, timer = 0, vorab = 0;
const wege = new Map();
const weg = (a, b) => {
  const key = `${a}>${b}`;
  if (!wege.has(key)) wege.set(key, planGlide(ANSICHTEN[RUNDGANG[b]]));
  return wege.get(key);
};

function show(i) {
  const p = camera.position, room = roomAt(p.x, p.z);
  nrEl.textContent = `Rundgang ${i + 1} / ${RUNDGANG.length}`;
  titelEl.textContent = room?.name ?? RUNDGANG[i];
  textEl.textContent = RAUMTEXTE[room?.name] ?? '';
  zurueckBtn.disabled = i === 0;
  weiterBtn.lastChild.textContent = i === RUNDGANG.length - 1 ? ' Ende' : ' Weiter';
  boxEl.classList.add('da');
  busy = false;
  clearTimeout(vorab);
  if (i < RUNDGANG.length - 1) vorab = setTimeout(() => { if (station === i && !busy) weg(i, i + 1); }, 800);
}
function go(i) {
  if (busy || i < 0 || i >= RUNDGANG.length) return;
  const from = station, pose = ANSICHTEN[RUNDGANG[i]], plan = from >= 0 && weg(from, i);
  busy = true;
  station = i;
  boxEl.classList.remove('da');
  if (plan) return glideTo(pose, plan, () => show(i));
  blendeEl.classList.add('zu');
  timer = setTimeout(() => {
    setView(...pose);
    resetHistory();
    blendeEl.classList.remove('zu');
    show(i);
  }, 500);
}
const next = () => (station === RUNDGANG.length - 1 ? end() : go(station + 1));

const lockPointer = () => { try { const p = renderer.domElement.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (e) {} };
function start() {
  hudEl.classList.remove('open', 'goto');
  html.classList.add('rundgang');
  holdView(end);
  if (!html.classList.contains('touch') && !document.pointerLockElement) lockPointer();
  station = -1;
  busy = false;
  go(0);
}
function end() {
  if (station < 0) return;
  station = -1;
  busy = false;
  clearTimeout(timer);
  clearTimeout(vorab);
  holdView(null);
  blendeEl.classList.remove('zu');
  boxEl.classList.remove('da');
  html.classList.remove('rundgang');
}

document.getElementById('tourBtn').addEventListener('click', e => { e.target.blur(); start(); });
weiterBtn.addEventListener('click', next);
zurueckBtn.addEventListener('click', () => go(station - 1));
document.getElementById('fEnde').addEventListener('click', end);
addEventListener('keydown', e => {
  if (e.repeat) return;
  if (station < 0) {
    if (e.code === 'KeyR' && document.getElementById('start').classList.contains('hidden') && !html.classList.contains('karte')) start();
    return;
  }
  if (e.code === 'Space' || e.code === 'ArrowRight') next();
  else if (e.code === 'ArrowLeft') go(station - 1);
  else if (e.code === 'Escape' || e.code === 'Tab') end();
});
document.addEventListener('pointerlockchange', () => { if (!document.pointerLockElement) end(); });

let tap = null;
addEventListener('touchstart', e => {
  tap = null;
  const t = e.changedTouches[0];
  if (station < 0 || e.touches.length > 1 || e.target.closest?.('#hud, #fuehrung, #karte')) return;
  const r = stickEl.getBoundingClientRect();
  if (Math.hypot(t.clientX - r.left - r.width / 2, t.clientY - r.top - r.height / 2) < r.width / 2 + 24) return;
  tap = { id: t.identifier, x: t.clientX, y: t.clientY, at: performance.now() };
}, { passive: true });
addEventListener('touchend', e => {
  for (const t of e.changedTouches) {
    if (t.identifier !== tap?.id) continue;
    if (Math.hypot(t.clientX - tap.x, t.clientY - tap.y) < 12 && performance.now() - tap.at < 350) next();
    tap = null;
  }
});
