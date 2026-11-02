import { ROOMS } from './masse.js';
import { camera, renderer } from './szene.js';
import { resetHistory } from './glaettung.js';
import { curLevel, onFloor, roomAt, setView } from './steuerung.js';

const TEMPEL = [-33, 33, -92, 48], VORPLATZ = [-62, 38, 18, 100];
const GROSS = [[-60, 36, -92, 96], [-33, 33, -57, 46]];
const FARBE = { grund: 'rgb(14,10,6)', frei: 'rgb(42,33,22)', unten: 'rgb(70,55,36)', ebene: 'rgb(128,104,70)', zeiger: 'rgb(176,146,96)', raum: 'rgb(222,186,118)' };
const inGround = r => !r.band && (r.levels ? r.levels.includes(0) : !(r.level ?? 0));
const inUpper = r => (r.levels ? r.levels.includes(1) : r.level === 1);
const outside = r => (r.x1 - r.x0) * (r.z1 - r.z0) > 5000;
const ground = ROOMS.filter(r => inGround(r) && !outside(r)), open = ROOMS.filter(outside), upperRooms = ROOMS.filter(inUpper);
const html = document.documentElement;
const planEl = document.getElementById('plan'), planCtx = planEl.getContext('2d');
const karteEl = document.getElementById('karte'), bildEl = document.getElementById('karteBild'), bildCtx = bildEl.getContext('2d');
const nameEl = document.getElementById('karteName'), ebeneBtns = [...karteEl.querySelectorAll('[data-ebene]')];
let last = '', ebene = 0, zeiger = null, gewaehlt = null, view = null;

function fit(canvas, ctx) {
  const w = canvas.clientWidth, h = canvas.clientHeight, dpr = devicePixelRatio;
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return [w, h];
}

function draw(ctx, w, h, [x0, x1, z0, z1], lower, upper, marks, cone) {
  const s = Math.min((w - 10) / (x1 - x0), (h - 10) / (z1 - z0));
  const ox = w / 2 - (x0 + x1) / 2 * s, oz = h / 2 - (z0 + z1) / 2 * s;
  ctx.fillStyle = FARBE.grund;
  ctx.fillRect(0, 0, w, h);
  const rect = r => ctx.fillRect(ox + r.x0 * s, oz + r.z0 * s, (r.x1 - r.x0) * s, (r.z1 - r.z0) * s);
  ctx.fillStyle = FARBE.frei;
  open.forEach(rect);
  ctx.fillStyle = upper ? FARBE.unten : FARBE.ebene;
  lower.forEach(rect);
  if (upper) {
    ctx.fillStyle = FARBE.ebene;
    upper.forEach(rect);
  }
  for (const [farbe, rooms] of marks) {
    ctx.fillStyle = farbe;
    rooms.forEach(rect);
  }
  const p = camera.position, yaw = camera.rotation.y;
  const px = ox + p.x * s, pz = oz + p.z * s, a = Math.atan2(-Math.cos(yaw), -Math.sin(yaw));
  ctx.fillStyle = 'rgba(255,240,205,0.35)';
  ctx.beginPath();
  ctx.moveTo(px, pz);
  ctx.arc(px, pz, cone, a - 0.5, a + 0.5);
  ctx.fill();
  ctx.fillStyle = '#fff3d6';
  ctx.strokeStyle = FARBE.grund;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(px, pz, 3.5, 0, 2 * Math.PI);
  ctx.fill();
  ctx.stroke();
  return { s, ox, oz };
}

const sameRoom = (name, layer) => ROOMS.filter(r => r.name === name && layer(r));
function updatePlan() {
  if (html.classList.contains('karte')) return drawBig();
  if (!html.classList.contains('grundriss')) return;
  const p = camera.position, here = roomAt(p.x, p.z);
  const key = [p.x.toFixed(1), p.z.toFixed(1), camera.rotation.y.toFixed(2), curLevel, here?.name, planEl.clientWidth, planEl.clientHeight].join();
  if (key === last || !planEl.clientWidth) return;
  last = key;
  const [w, h] = fit(planEl, planCtx);
  const upper = curLevel !== 0 || !!here?.band;
  draw(planCtx, w, h, p.z > 47 ? VORPLATZ : TEMPEL, ground, upper && ROOMS.filter(onFloor),
    here ? [[FARBE.raum, sameRoom(here.name, onFloor)]] : [], 22);
}

const layerOf = e => (e ? inUpper : inGround);
function drawBig() {
  const [w, h] = fit(bildEl, bildCtx);
  const layer = layerOf(ebene), marks = [];
  if (zeiger) marks.push([FARBE.zeiger, sameRoom(zeiger.name, layer)]);
  if (gewaehlt) marks.push([FARBE.raum, sameRoom(gewaehlt.name, layer)]);
  view = draw(bildCtx, w, h, GROSS[ebene], ground, ebene ? upperRooms : null, marks, 30);
}
function roomUnder(e) {
  if (!view) return null;
  const r = bildEl.getBoundingClientRect();
  const x = (e.clientX - r.left - view.ox) / view.s, z = (e.clientY - r.top - view.oz) / view.s;
  let best = null;
  for (const room of ROOMS) {
    if (!layerOf(ebene)(room) || x <= room.x0 || x >= room.x1 || z <= room.z0 || z >= room.z1) continue;
    const area = (room.x1 - room.x0) * (room.z1 - room.z0);
    if (!best || area < best.area) best = { room, area };
  }
  return best && { name: best.room.name, room: best.room, x, z };
}
const HINWEIS = () => (html.classList.contains('touch') ? 'Tippe auf einen Raum, noch einmal tippen springt hin' : 'Klick auf einen Raum springt hin');
const showName = t => { nameEl.textContent = t?.name ?? HINWEIS(); };
function setEbene(e) {
  ebene = e;
  zeiger = gewaehlt = null;
  showName(null);
  ebeneBtns.forEach(b => b.classList.toggle('an', +b.dataset.ebene === e));
}

const lockPointer = () => { try { const p = renderer.domElement.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (e) {} };
function openKarte() {
  const here = roomAt(camera.position.x, camera.position.z);
  setEbene(curLevel !== 0 || here?.band ? 1 : 0);
  html.classList.add('karte');
  if (document.pointerLockElement) document.exitPointerLock();
}
function closeKarte(relock) {
  html.classList.remove('karte');
  last = '';
  if (relock && !html.classList.contains('touch')) lockPointer();
}
function jump(t) {
  const { room, x, z } = t;
  const y = room.floor ?? (room.band ? (room.band[0] + room.band[1]) / 2 : 0);
  setView(x, z, 0, 0, ebene, y);
  resetHistory();
  closeKarte(true);
}

planEl.addEventListener('click', openKarte);
document.getElementById('karteZu').addEventListener('click', () => closeKarte(false));
karteEl.addEventListener('click', e => { if (e.target === karteEl) closeKarte(false); });
ebeneBtns.forEach(b => b.addEventListener('click', () => setEbene(+b.dataset.ebene)));
bildEl.addEventListener('mousemove', e => {
  if (html.classList.contains('touch')) return;
  zeiger = roomUnder(e);
  showName(zeiger);
});
bildEl.addEventListener('mouseleave', () => { zeiger = null; showName(gewaehlt); });
bildEl.addEventListener('click', e => {
  const t = roomUnder(e);
  if (!t) return;
  if (html.classList.contains('touch') && t.name !== gewaehlt?.name) {
    gewaehlt = t;
    showName(t);
    return;
  }
  jump(t);
});
addEventListener('keydown', e => {
  if (e.code === 'Tab') {
    e.preventDefault();
    if (e.repeat) return;
    if (html.classList.contains('karte')) closeKarte(true);
    else if (document.getElementById('start').classList.contains('hidden')) openKarte();
  }
  if (e.code === 'Escape' && html.classList.contains('karte')) closeKarte(false);
});

export { updatePlan };
