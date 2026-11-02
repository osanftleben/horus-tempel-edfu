import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { CHAPELS, M, NZ, PF, WAB_DOOR, ZONES, chapelDoorHole, roomArea } from './masse.js';
import { camera, renderer, scene } from './szene.js';
import { LAMP_MAX, SHADOW_LAMPS, lampBounce, lampMax, lampMin, lampShadowK, lit } from './material.js';
import { LAMP_I, lampLevel as handLevel } from './licht.js';
import { blocks } from './bau/helfer.js';
import { HB } from './bau/pronaos.js';
import { NAOS_Z, OFF_C, OFF_HOLES } from './bau/innenraeume.js';
import { CHAPEL_LAMPS, CORRIDOR_LAMPS, DOOR_TOP } from './bau/kapellen.js';
import { CHAMBER_LAMPS } from './bau/kammern.js';
import { MAM_LAMP } from './bau/mammisi.js';
import { NILO_LAMP } from './bau/nilometer.js';
import { WAB_LAMP } from './bau/reinheitsplatz.js';
import { SIDE_LAMPS } from './bau/seitenraeume.js';
import { STAIR_LAMPS } from './bau/westtreppe.js';
import { PT_LAMPS } from './bau/pylon-treppe.js';
import { state } from './himmel.js';

const lamps = [];
const addLamp = (x, y, z, i, range, group, box = null) => {
  const pos = new THREE.Vector3(x, y, z);
  lamps.push({ pos, i, range, group, box, glow: new THREE.Sphere(pos, Math.min(range, 1.5 * Math.sqrt(i))), ph: lamps.length * 2.3 });
};
const FAR = 1e4, box = (x0, x1, y0, y1, z0, z1) => new THREE.Box3(new THREE.Vector3(x0, y0, z0), new THREE.Vector3(x1, y1, z1));
function sealedBox(x, y, z) {
  const zone = ZONES.find(({ portals, room }) => portals && x > room[0] && x < room[1] && z > room[2] && z < room[3] && y > room[4] && y < room[5]);
  if (!zone) return null;
  const [x0, x1, z0, z1, y1] = zone.box;
  const b = box(x0 - 1, x1 + 1, -FAR, y1 + 1, z0 - 1, z1 + 1);
  b.doors = zone.portals.map(([px0, px1, py0, py1, pz0, pz1]) => box(px0, px1, py0, py1, pz0, pz1).expandByScalar(0.25));
  return b;
}
const CHAPEL_IN = 0.3, CHAPEL_OUT = 2.5;
const chapelDoors = new Map(CHAPELS.map(c => {
  const h = chapelDoorHole(c.door);
  return [c, box(h.x0, h.x1, M.midFloor, DOOR_TOP, h.z0, h.z1).expandByScalar(0.25)];
}));
function chapelBox(c) {
  const { x0, x1, z0, z1, door } = c;
  const b = box(x0 - CHAPEL_IN, x1 + CHAPEL_IN, -FAR, M.chapTop + 1, z0 - CHAPEL_IN, z1 + CHAPEL_IN);
  const a = door.dir, lo = Math.min(door.w0, door.w1), hi = Math.max(door.w0, door.w1);
  if (lo >= (a === 'x' ? x1 : z1) - 1e-6) b.max[a] = hi + CHAPEL_OUT;
  else b.min[a] = lo - CHAPEL_OUT;
  b.doors = [chapelDoors.get(c)];
  return b;
}
const corridorDoors = [-1, 1].map(s => box(Math.min(s * M.corrIn, s * M.corrOut), Math.max(s * M.corrIn, s * M.corrOut),
  M.midFloor, M.midFloor + 3, M.midBack, M.midBack).expandByScalar(0.25));
function corridorBox(x, z) {
  const back = z < M.corrBack0, s = Math.sign(x);
  const b = back ? box(-M.corrOut - 1, M.corrOut + 1, -FAR, M.corrTop + 1, M.corrBack1 - 0.4, M.corrBack0 + 1)
    : box(Math.min(s * M.corrIn, s * M.corrOut) - 1, Math.max(s * M.corrIn, s * M.corrOut) + 1, -FAR, M.corrTop + 1,
      M.corrBack1 - 0.4, M.midBack + 1);
  b.doors = [...chapelDoors.values()].filter(d => d.intersectsBox(b));
  if (!back) b.doors.push(corridorDoors[s > 0 ? 1 : 0]);
  return b;
}
const sanctBox = box(-M.sanHalf - 1, M.sanHalf + 1, -FAR, M.sanTop + 1, M.sanBack - 1, M.midFront + 0.3);
sanctBox.doors = [box(-1.2, 1.2, M.sanFloor, M.sanFloor + 3, M.sanFront, M.sanFront).expandByScalar(0.25)];

const wabBox = box(M.corrWall - 0.3, M.midHalf + 0.3, -FAR, M.innerMass + 1, M.wabBack - 0.3, M.midFront + 0.3);
wabBox.doors = [box(M.midEnd, M.corrWall, M.midFloor, M.midFloor + 3.4, WAB_DOOR[0], WAB_DOOR[1]).expandByScalar(0.25)];

const hallBox = box(-M.hallHalf - 1, M.hallHalf + 1, -FAR, FAR, M.offBack - 1, M.hallFront + 1);
hallBox.doors = [box(-M.innerDoor, M.innerDoor, M.hallFloor, M.hallFloor + 3, M.hallFront, M.proBack)];
const STAND_H = 1.45;
const PAIR_I = 6;
const PAIRS = [
  [3.4, M.pylonFront + 1.2, 0],
  [2.6, PF + 3.7, 0],
  [1.8, HB + 1.4, M.hallFloor, false, hallBox],
  [1.85, NAOS_Z + 0.9, M.sanFloor, true, sanctBox],
];
const standPos = PAIRS.flatMap(([x, z]) => [[-x, z], [x, z]]);
const pairGroup = b => (b ? 'inner' : 'night');
for (const [x, z, y, split, b] of PAIRS) {
  for (const lx of split ? [-x, x] : [0]) addLamp(lx, y + STAND_H + 0.25, z, PAIR_I * (split ? 0.5 : 1), 16, pairGroup(b), b);
}

const standGeo = (() => {
  const lathe = (pts, segs) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), segs);
  return mergeGeometries([
    new THREE.CylinderGeometry(0.24, 0.27, 0.08, 20).translate(0, 0.04, 0),
    lathe([[0.1, 0.08], [0.06, 0.2], [0.045, 0.6], [0.04, 1.15], [0.05, 1.22], [0.12, 1.33], [0.13, 1.36], [0.0, 1.36]], 16),
    lathe([[0.0, 1.35], [0.12, 1.36], [0.24, 1.4], [0.28, STAND_H], [0.26, STAND_H], [0.2, 1.42], [0.0, 1.41]], 24),
  ].map(g => g.index ? g.toNonIndexed() : g));
})();
const bronzeMat = lit(new THREE.MeshStandardMaterial({ color: 0x8a6232, metalness: 0.6, roughness: 0.45 }));
const stands = new THREE.Mesh(mergeGeometries(standPos.map(([x, z], i) => standGeo.clone().translate(x, PAIRS[i >> 1][2], z))), bronzeMat);
const oil = new THREE.InstancedMesh(new THREE.CircleGeometry(0.25, 20).rotateX(-Math.PI / 2),
  new THREE.MeshBasicMaterial({ color: 0x1a0e06 }), standPos.length);

const flameMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.45, 0.12).multiplyScalar(2.6) });
const coreMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.78, 0.4).multiplyScalar(4.5) });
const flameGeo = new THREE.LatheGeometry([[0, 0], [0.55, 0.08], [0.85, 0.25], [0.7, 0.5], [0.35, 0.78], [0, 1]]
  .map(([r, y]) => new THREE.Vector2(r, y)), 12);
const glowTex = (() => {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d'), grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.25, 'rgba(255,255,255,0.35)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
})();
const glowMat = new THREE.SpriteMaterial({ map: glowTex, color: 0xff9040, blending: THREE.AdditiveBlending,
  depthWrite: false, transparent: true });

const flames = [];
const glows = [];
function addFlame(x, y, z, mat, ph, size, group) {
  const f = new THREE.Mesh(flameGeo, mat);
  f.position.set(x, y, z);
  f.layers.set(1);
  scene.add(f);
  flames.push([f, ph, size, group]);
}
function addGlow(x, y, z, size, group) {
  const s = new THREE.Sprite(glowMat.clone());
  s.position.set(x, y, z);
  s.scale.setScalar(size);
  s.layers.set(1);
  scene.add(s);
  glows.push([s, group]);
}

standPos.forEach(([x, z], i) => {
  const y = PAIRS[i >> 1][2], group = pairGroup(PAIRS[i >> 1][4]);
  oil.setMatrixAt(i, new THREE.Matrix4().makeTranslation(x, y + STAND_H - 0.03, z));
  for (let k = 0; k < 3; k++) {
    const a = k * 2.1 + i, r = k > 0 ? 0.1 : 0;
    addFlame(x + Math.cos(a) * r, y + STAND_H - 0.02, z + Math.sin(a) * r, k === 0 ? coreMat : flameMat, i * 1.7 + k * 0.9, k === 0 ? 0.6 : 1, group);
  }
  addGlow(x, y + STAND_H + 0.15, z, 1.3, group);
});
stands.castShadow = stands.receiveShadow = true;
scene.add(stands, oil);

const S = 1.4;
const clayMat = lit(new THREE.MeshStandardMaterial({ color: 0x7a4a2a, roughness: 0.85 }));
const clayGeo = mergeGeometries([
  new THREE.SphereGeometry(1, 16, 10).scale(0.055, 0.026, 0.075).translate(0, 0.026, 0),
  new THREE.CylinderGeometry(0.011, 0.02, 0.06, 8).rotateX(-Math.PI / 2).translate(0, 0.034, 0.085),
].map(g => g.index ? g.toNonIndexed() : g)).scale(S, S, S);
function clayLamp(x, y, z, rot, i, group, out = 0, b = sealedBox(x, y, z)) {
  const body = new THREE.Mesh(clayGeo, clayMat);
  body.position.set(x, y, z);
  body.rotation.y = rot;
  body.castShadow = true;
  scene.add(body);
  const tx = x + Math.sin(rot) * 0.115 * S, tz = z + Math.cos(rot) * 0.115 * S;
  addFlame(tx, y + 0.05 * S, tz, flameMat, x * 1.3 + z, 0.35, group);
  addGlow(tx, y + 0.08 * S, tz, 0.3, group);
  addLamp(tx + Math.sin(rot) * out, y + 0.3, tz + Math.cos(rot) * out, i, 10, group, b);
}
for (const tx of OFF_HOLES) clayLamp(tx - 0.62, M.offFloor + 0.95, OFF_C + 0.42, 0, 1.5, 'inner');
for (const l of CORRIDOR_LAMPS) clayLamp(l.x, l.y, l.z, l.rot, 1.6, 'inner', 0.3, corridorBox(l.x, l.z));
for (const l of CHAPEL_LAMPS) clayLamp(l.x, l.y, l.z, l.rot, 1.4, 'inner', 0, chapelBox(l.chapel));
clayLamp(WAB_LAMP.x, WAB_LAMP.y, WAB_LAMP.z, WAB_LAMP.rot, 1.4, 'inner', 0, wabBox);
for (const l of CHAMBER_LAMPS) clayLamp(l.x, l.y, l.z, l.rot, 1.4, 'inner');
for (const l of SIDE_LAMPS) clayLamp(l.x, l.y, l.z, l.rot, 1.4, 'inner');
clayLamp(MAM_LAMP.x, MAM_LAMP.y, MAM_LAMP.z, MAM_LAMP.rot, 1.4, 'inner');
clayLamp(NILO_LAMP.x, NILO_LAMP.y, NILO_LAMP.z, NILO_LAMP.rot, 1.4, 'inner');
for (const l of STAIR_LAMPS) clayLamp(l.x, l.y, l.z, l.rot, 1.6, 'inner', 0.3, box(...l.box));
for (const l of PT_LAMPS) clayLamp(l.x, l.y, l.z, l.rot, 1.6, 'inner', 0.3, box(...l.box));

const BRAZIER_I = 25;
const brazierPos = [[-6.5, 8], [6.5, 8]];
{
  const stoneMat = lit(new THREE.MeshStandardMaterial({ color: 0xb89a70, roughness: 0.9 }));
  const altarGeo = mergeGeometries([
    new THREE.BoxGeometry(0.9, 0.72, 0.9).translate(0, 0.36, 0),
    new THREE.BoxGeometry(1.04, 0.1, 1.04).translate(0, 0.77, 0),
  ]);
  const lathe = (pts, segs) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), segs);
  const bowlGeo = lathe([[0.0, 0.82], [0.2, 0.83], [0.42, 0.9], [0.55, 1.05], [0.52, 1.05], [0.4, 0.94], [0.0, 0.92]], 28);
  const emberMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.25, 0.05).multiplyScalar(1.5) });
  for (const [x, z] of brazierPos) {
    const altar = new THREE.Mesh(altarGeo, stoneMat);
    const bowl = new THREE.Mesh(bowlGeo, bronzeMat);
    const embers = new THREE.Mesh(new THREE.CircleGeometry(0.46, 24).rotateX(-Math.PI / 2), emberMat);
    altar.position.set(x, 0, z); bowl.position.set(x, 0, z); embers.position.set(x, 1.0, z);
    altar.castShadow = altar.receiveShadow = bowl.castShadow = bowl.receiveShadow = true;
    scene.add(altar, bowl, embers);
    for (let k = 0; k < 6; k++) {
      const a = k * 1.05 + x, r = k === 0 ? 0 : 0.26;
      addFlame(x + Math.cos(a) * r, 0.98, z + Math.sin(a) * r, k === 0 ? coreMat : flameMat, a * 2.3, k === 0 ? 3.2 : 2.3, 'night');
    }
    addGlow(x, 1.4, z, 2.4, 'night');
    addLamp(x, 1.9, z, BRAZIER_I, 45, 'night');
  }
}

const POOL = 8;
const slots = Array.from({ length: POOL }, (_, k) => {
  const light = new THREE.PointLight(0xff9a40, 0, 16, 2);
  if (k < SHADOW_LAMPS) {
    light.castShadow = true;
    light.shadow.autoUpdate = false;
    light.shadow.mapSize.set(512, 512);
    light.shadow.camera.near = 0.1;
    light.shadow.bias = -0.003;
    light.shadow.normalBias = 0.03;
  }
  scene.add(light);
  return { light, lamp: null, w: 0, sk: 1 };
});
const shadowSlots = slots.slice(0, SHADOW_LAMPS), plainSlots = slots.slice(SHADOW_LAMPS);
const levels = { night: 0, inner: 1 };
const lampLevel = l => levels[l.group];
const frustum = new THREE.Frustum(), viewProj = new THREE.Matrix4();
for (const l of lamps) if (!l.box) {
  l.eye = new THREE.Box3().setFromCenterAndSize(l.pos.clone().setY(l.pos.y + l.glow.radius), new THREE.Vector3(0.5, 0.5, 0.5));
  l.eye.sight = true;
}
function seen(l, p) {
  if (!frustum.intersectsSphere(l.glow)) return false;
  return l.box ? l.box.containsPoint(p) || !!l.box.doors?.some(d => d.sight && frustum.intersectsBox(d)) : l.eye.sight;
}
function score(l, p, held) {
  return lampLevel(l) * l.i / (p.distanceToSquared(l.pos) + 1) * (held ? 1.6 : 1) * (seen(l, p) ? 1 : 0.05);
}
const doors = [...new Set(lamps.flatMap(l => l.box ? l.box.doors ?? [] : [l.eye]))];
let walls = null, sightAt = 0;
const ray = new THREE.Ray(), hit = new THREE.Vector3(), mid = new THREE.Vector3();
function checkSight(p) {
  walls ??= blocks.map(g => g.boundingBox ?? (g.computeBoundingBox(), g.boundingBox));
  for (let n = 0; n < Math.min(2, doors.length); n++) {
    const door = doors[sightAt = (sightAt + 1) % doors.length], d = p.distanceTo(door.getCenter(mid));
    ray.origin.copy(p);
    ray.direction.subVectors(mid, p).normalize();
    door.sight = !walls.some(b => ray.intersectBox(b, hit) && hit.distanceTo(p) < d);
  }
}
function assignLights(dt) {
  const p = camera.position;
  frustum.setFromProjectionMatrix(viewProj.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
  checkSight(p);
  const held = new Set(slots.map(s => s.lamp));
  const want = lamps.filter(l => lampLevel(l) > 0.01)
    .sort((a, b) => score(b, p, held.has(b)) - score(a, p, held.has(a))).slice(0, POOL);
  const vis = want.filter(l => seen(l, p)), order = [...vis, ...want.filter(l => !vis.includes(l))];
  const top = new Set(order.slice(0, SHADOW_LAMPS)), rest = new Set(order.slice(SHADOW_LAMPS));
  swapLights(top, rest, dt);
  fill(shadowSlots, top, dt, plainSlots, rest);
  fill(plainSlots, rest, dt, shadowSlots, top);
  shadowSlots.forEach((s, k) => { if (s !== swap?.up) s.sk = Math.min(1, s.sk + dt * 3); lampShadowK.value[k] = s.sk; });
}
let swap = null;
function swapLights(top, rest, dt) {
  if (!swap) {
    const up = shadowSlots.find(s => s.w >= 1 && rest.has(s.lamp) && !plainSlots.some(o => o.lamp === s.lamp));
    const down = plainSlots.find(s => s.w >= 1 && top.has(s.lamp) && !shadowSlots.some(o => o.lamp === s.lamp));
    if (up && down) swap = { up, down };
  }
  if (!swap) return;
  const { up, down } = swap;
  up.sk = Math.max(0, up.sk - dt * 3);
  if (up.sk > 0) return;
  const l = up.lamp;
  place(up, down.lamp);
  place(down, l);
  swap = null;
}
function fill(slots, want, dt, other, otherWant) {
  const busy = s => s === swap?.up || s === swap?.down;
  for (const s of slots) {
    if (!s.lamp || busy(s)) continue;
    if (want.has(s.lamp)) { s.w = Math.min(1, s.w + dt * 4); continue; }
    if (otherWant.has(s.lamp)) {
      const o = other.find(o => o.lamp === s.lamp);
      if (!o) { s.w = Math.min(1, s.w + dt * 4); continue; }
      s.w = Math.min(s.w, 1 - o.w);
    } else s.w -= dt * 4;
    if (s.w <= 0) { s.lamp = null; s.w = 0; }
  }
  for (const l of want) {
    if (slots.some(s => s.lamp === l) || swap?.up.lamp === l || swap?.down.lamp === l) continue;
    const free = slots.find(s => !s.lamp);
    if (!free) break;
    place(free, l);
    free.w = 0;
  }
}
function place(s, l) {
  s.lamp = l;
  s.light.position.copy(l.pos);
  s.light.distance = l.range;
  if (s.light.castShadow) {
    s.light.shadow.camera.far = l.range;
    s.light.shadow.camera.updateProjectionMatrix();
    s.light.shadow.needsUpdate = renderer.shadowMap.needsUpdate = true;
  }
}

const flicker = (l, t) => 0.9 + 0.06 * Math.sin(t * 9.1 + l.ph) + 0.04 * Math.sin(t * 21.7 + l.ph * 0.7);

const RHO = 0.45, BOUNCE_K = 4 * Math.PI * RHO / (1 - RHO);
const zoneIndex = p => ZONES.findIndex(({ box: [x0, x1, z0, z1, y1] }) => p.x > x0 && p.x < x1 && p.z > z0 && p.z < z1 && p.y < y1);
const zoneWalls = ZONES.map(z => z.walls ?? (z.room ? roomArea(z.room) : 0));
for (const l of lamps) l.zone = zoneIndex(l.pos);
const bounceRGB = new THREE.Color(0xff9a40).multiply(new THREE.Color(1.0, 0.8, 0.58));
const zoneSum = new Array(NZ).fill(0);
function updateBounce(t) {
  zoneSum.fill(0);
  for (const l of lamps) if (l.zone >= 0) zoneSum[l.zone] += l.i * lampLevel(l) * flicker(l, t);
  const hz = zoneIndex(camera.position);
  if (hz >= 0) zoneSum[hz] += LAMP_I * handLevel;
  zoneSum.forEach((s, z) => {
    const e = zoneWalls[z] ? BOUNCE_K * s / zoneWalls[z] : 0;
    lampBounce.value[z].set(bounceRGB.r * e, bounceRGB.g * e, bounceRGB.b * e);
  });
}

function updateStandLamps(dt, t) {
  const want = 1 - THREE.MathUtils.smoothstep(state.daylight, 0.15, 0.45);
  levels.night += (want - levels.night) * Math.min(1, dt * 1.5);
  assignLights(dt);
  for (const s of slots) {
    const l = s.lamp;
    if (!l) { s.light.intensity = 0; continue; }
    s.light.intensity = l.i * lampLevel(l) * s.w * (flicker(l, t) + 0.03 * (Math.random() - 0.5));
  }
  setLampBoxes();
  updateBounce(t);
  for (const [f, ph, size, group] of flames) {
    const level = levels[group], on = level > 0.01;
    f.visible = on;
    if (!on) continue;
    const fl = 0.85 + 0.12 * Math.sin(t * 10.3 + ph) + 0.08 * Math.sin(t * 25.1 + ph * 3.1);
    const h = 0.2 * size * level * fl;
    f.scale.set(0.045 * size * level, h, 0.045 * size * level);
    f.rotation.set(0.12 * Math.sin(t * 3.7 + ph), 0, 0.12 * Math.sin(t * 4.3 + ph * 1.7));
  }
  for (const [s, group] of glows) {
    s.visible = levels[group] > 0.01;
    s.material.opacity = 0.35 * levels[group];
  }
}

let pointLights = null;
const ANY = box(-FAR, FAR, -FAR, FAR, -FAR, FAR);
function setLampBoxes() {
  if (!pointLights) {
    pointLights = [];
    scene.traverse(o => { if (o.isPointLight) pointLights.push(o); });
    pointLights.sort((a, b) => b.castShadow - a.castShadow);
  }
  let n = 0;
  for (const light of pointLights) {
    if (!light.visible || n >= LAMP_MAX) continue;
    const b = slots.find(s => s.light === light)?.lamp?.box ?? ANY;
    lampMin.value[n].copy(b.min);
    lampMax.value[n].copy(b.max);
    n++;
  }
}

function standLightAt(p) {
  let sum = 0;
  for (const l of lamps) sum += lampLevel(l) * l.i / (p.distanceToSquared(l.pos) + 1);
  return 0.12 * sum;
}

export { brazierPos, standLightAt, standPos, updateStandLamps };
