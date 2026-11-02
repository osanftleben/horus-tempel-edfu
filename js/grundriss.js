import { ROOMS } from './masse.js';
import { camera } from './szene.js';
import { curLevel, onFloor, roomAt } from './steuerung.js';

const TEMPEL = [-33, 33, -92, 48], VORPLATZ = [-62, 38, 18, 100];
const FARBE = { grund: 'rgb(14,10,6)', unten: 'rgb(70,55,36)', ebene: 'rgb(128,104,70)', raum: 'rgb(222,186,118)' };
const planEl = document.getElementById('plan'), ctx = planEl.getContext('2d');
const ground = ROOMS.filter(r => !r.levels && !r.band && !(r.level ?? 0));
let last = '';

function updatePlan() {
  if (!document.documentElement.classList.contains('grundriss')) return;
  const p = camera.position, yaw = camera.rotation.y, here = roomAt(p.x, p.z);
  const w = planEl.clientWidth, h = planEl.clientHeight, dpr = devicePixelRatio;
  const key = [p.x.toFixed(1), p.z.toFixed(1), yaw.toFixed(2), curLevel, here?.name, w, h].join();
  if (key === last || !w) return;
  last = key;
  if (planEl.width !== Math.round(w * dpr) || planEl.height !== Math.round(h * dpr)) {
    planEl.width = Math.round(w * dpr);
    planEl.height = Math.round(h * dpr);
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = FARBE.grund;
  ctx.fillRect(0, 0, w, h);
  const [x0, x1, z0, z1] = p.z > 47 ? VORPLATZ : TEMPEL;
  const s = Math.min((w - 10) / (x1 - x0), (h - 10) / (z1 - z0));
  const ox = w / 2 - (x0 + x1) / 2 * s, oz = h / 2 - (z0 + z1) / 2 * s;
  const rect = r => ctx.fillRect(ox + r.x0 * s, oz + r.z0 * s, (r.x1 - r.x0) * s, (r.z1 - r.z0) * s);
  const upper = curLevel !== 0 || !!here?.band;
  ctx.fillStyle = upper ? FARBE.unten : FARBE.ebene;
  ground.forEach(rect);
  if (upper) {
    ctx.fillStyle = FARBE.ebene;
    ROOMS.filter(onFloor).forEach(rect);
  }
  if (here) {
    ctx.fillStyle = FARBE.raum;
    ROOMS.filter(r => r.name === here.name && onFloor(r)).forEach(rect);
  }
  const px = ox + p.x * s, pz = oz + p.z * s, a = Math.atan2(-Math.cos(yaw), -Math.sin(yaw));
  ctx.fillStyle = 'rgba(255,240,205,0.35)';
  ctx.beginPath();
  ctx.moveTo(px, pz);
  ctx.arc(px, pz, 22, a - 0.5, a + 0.5);
  ctx.fill();
  ctx.fillStyle = '#fff3d6';
  ctx.strokeStyle = FARBE.grund;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(px, pz, 3.5, 0, 2 * Math.PI);
  ctx.fill();
  ctx.stroke();
}

export { updatePlan };
