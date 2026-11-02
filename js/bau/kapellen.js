import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { CHAPELS, M, chapelDoorHole } from '../masse.js';
import { scene } from '../szene.js';
import { PAINT, floorMat, lit, naosMat } from '../material.js';
import { block, mirrorX } from './helfer.js';
import { XH } from './pronaos.js';
import { MB } from './innenraeume.js';

const MH = M.midHalf, CI = M.corrIn, CO = M.corrOut, CW = M.corrWall;
const CB0 = M.chapBack0, CB1 = M.chapBack1, F = M.midFloor;
const DOOR_TOP = F + 3.2;

block(-MH, MH, 0, F - 0.01, CB1, MB, PAINT.none);
mirrorX(s => block(s * MH, s * XH, 0, M.innerMass, M.houseBack, MB));
block(-XH, XH, 0, M.innerMass, M.houseBack, CB1);

const holes = CHAPELS.map(c => chapelDoorHole(c.door));
function wallWithDoors(x0, x1, z0, z1, top) {
  const alongZ = z1 - z0 > x1 - x0;
  const inside = holes.filter(h => h.x0 >= x0 - 1e-6 && h.x1 <= x1 + 1e-6 && h.z0 >= z0 - 1e-6 && h.z1 <= z1 + 1e-6)
    .map(h => alongZ ? [h.z0, h.z1] : [h.x0, h.x1]).sort((a, b) => a[0] - b[0]);
  const piece = (a, b, y0) => alongZ ? block(x0, x1, y0, top, a, b) : block(a, b, y0, top, z0, z1);
  let a = alongZ ? z0 : x0;
  for (const [ha, hb] of inside) {
    if (ha > a) piece(a, ha, 0);
    piece(ha, hb, DOOR_TOP);
    a = hb;
  }
  const end = alongZ ? z1 : x1;
  if (end > a) piece(a, end, 0);
}
mirrorX(s => wallWithDoors(Math.min(s * CO, s * CW), Math.max(s * CO, s * CW), CB0, M.sanctBack, M.backRoof));
wallWithDoors(-CW, -M.midEnd, MB, M.midFront, M.innerMass);
block(-MH, -CW, M.chapTop, M.midRoof, MB, M.midFront, PAINT.ceiling);
wallWithDoors(-CW, CW, CB0, M.corrBack1, M.backRoof);
for (const [x0, x1, z0, z1] of [
  [-MH, -CW, -67.2, -66.6], [-MH, -CW, -72.4, -71.8], [CW, MH, -67.2, -66.6], [CW, MH, -72.4, -71.8],
  [-MH, -CW, -77.6, CB0], [CW, MH, -77.6, CB0],
  [-2.9, -2.3, CB1, CB0], [2.3, 2.9, CB1, CB0], [-9.0, -8.4, CB1, CB0], [8.4, 9.0, CB1, CB0],
]) wallWithDoors(x0, x1, z0, z1, M.chapTop);

const SLIT_Z = [-65.5, -71.0], SLIT_HZ = 1.2, SLIT_HX = 0.3;
mirrorX(s => {
  const xa = s * CI, xb = s * CO, xc = s * (CI + CO) / 2;
  let z = MB - 0.8;
  for (const c of SLIT_Z) {
    block(xa, xb, M.corrTop, M.backRoof, c + SLIT_HZ, z, PAINT.roof);
    block(xa, xc - s * SLIT_HX, M.corrTop, M.backRoof, c - SLIT_HZ, c + SLIT_HZ, PAINT.roof);
    block(xc + s * SLIT_HX, xb, M.corrTop, M.backRoof, c - SLIT_HZ, c + SLIT_HZ, PAINT.roof);
    z = c - SLIT_HZ;
  }
  block(xa, xb, M.corrTop, M.backRoof, M.corrBack0, z, PAINT.roof);
  block(s * SLIT_HX, s * CO, M.corrTop, M.backRoof, M.corrBack1, M.corrBack0, PAINT.roof);
  block(s * CW, s * MH, M.chapTop, M.backRoof, CB1, M.sanctBack - (s > 0 ? 0.6 : 0), PAINT.ceiling);
});
block(-CW, CW, M.chapTop, M.backRoof, CB1, CB0, PAINT.ceiling);

{
  const w = 2 * MH, d = MB - CB1;
  const g = new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2);
  g.attributes.uv.array.forEach((v, i, a) => { a[i] = v * (i % 2 ? d : w) / 8; });
  const floor = new THREE.Mesh(g, floorMat);
  floor.position.set(0, F, (MB + CB1) / 2);
  floor.receiveShadow = true;
  scene.add(floor);
}

const shrineGeo = (() => {
  const parts = [];
  const box = (x0, x1, y0, y1, z0, z1) => parts.push(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2));
  const W = 0.5, D = 0.4, N = 0.24;
  box(-0.62, 0.62, 0, 0.2, -0.5, 0.5);
  box(-W, W, 0.2, 1.75, -D, D - 0.3);
  box(-W, -N, 0.2, 1.75, D - 0.3, D); box(N, W, 0.2, 1.75, D - 0.3, D);
  box(-N, N, 0.2, 0.45, D - 0.3, D);
  box(-N, N, 1.45, 1.75, D - 0.3, D);
  box(-0.54, 0.54, 1.75, 1.82, -0.44, 0.44);
  const cornice = new THREE.CylinderGeometry(0.86, 0.74, 0.26, 4);
  cornice.rotateY(Math.PI / 4); cornice.scale(1, 1, 0.8); cornice.translate(0, 1.95, 0);
  parts.push(cornice);
  box(-0.62, 0.62, 2.08, 2.14, -0.5, 0.5);
  return mergeGeometries(parts.map(g => g.toNonIndexed()));
})();
const figureGeo = mergeGeometries([
  new THREE.CylinderGeometry(0.07, 0.09, 0.62, 12).translate(0, 0.76, 0),
  new THREE.SphereGeometry(0.07, 12, 10).translate(0, 1.14, 0),
  new THREE.CylinderGeometry(0.05, 0.06, 0.14, 10).translate(0, 1.27, 0),
].map(g => g.toNonIndexed())).translate(0, 0, 0.22);
const goldMat = lit(new THREE.MeshStandardMaterial({ color: 0xc89a42, metalness: 0.35, roughness: 0.4 }));

const CHAPEL_LAMPS = [], CHAPEL_COLLIDERS = [];
const TABLE_H = 0.85;
for (const c of CHAPELS) {
  const [fx, fz] = c.shrine;
  const wx = fx > 0 ? c.x0 : fx < 0 ? c.x1 : (c.x0 + c.x1) / 2;
  const wz = fz > 0 ? c.z0 : (c.z0 + c.z1) / 2;
  const at = d => [wx + fx * d, wz + fz * d];
  const rot = Math.atan2(fx, fz);
  const [sx, sz] = at(0.6);
  const shrine = new THREE.Mesh(shrineGeo, naosMat);
  shrine.position.set(sx, F, sz);
  shrine.rotation.y = rot;
  shrine.castShadow = shrine.receiveShadow = true;
  const figure = new THREE.Mesh(figureGeo, goldMat);
  figure.position.set(sx, F, sz);
  figure.rotation.y = rot;
  scene.add(shrine, figure);
  const [tx, tz] = at(2.0);
  const hx = fx ? 0.3 : 0.45, hz = fx ? 0.45 : 0.3;
  block(tx - hx, tx + hx, F, F + TABLE_H, tz - hz, tz + hz, PAINT.none);
  CHAPEL_LAMPS.push({ x: tx + fx * 0.12, y: F + TABLE_H, z: tz + fz * 0.12, rot, chapel: c });
  CHAPEL_COLLIDERS.push([sx, sz, 0.7], [tx, tz, 0.5]);
}

const CORRIDOR_LAMPS = [];
const CONSOLE_Y = F + 1.5;
mirrorX(s => {
  for (const z of [-63.5, -69.0]) {
    block(s * CI, s * (CI + 0.3), CONSOLE_Y - 0.12, CONSOLE_Y, z - 0.2, z + 0.2, PAINT.none);
    CORRIDOR_LAMPS.push({ x: s * (CI + 0.14), y: CONSOLE_Y, z, rot: s * Math.PI / 2 });
  }
  const x = s * 3.0;
  block(x - 0.2, x + 0.2, CONSOLE_Y - 0.12, CONSOLE_Y, M.corrBack0 - 0.3, M.corrBack0, PAINT.none);
  CORRIDOR_LAMPS.push({ x, y: CONSOLE_Y, z: M.corrBack0 - 0.14, rot: Math.PI });
});

export { CHAPEL_COLLIDERS, CHAPEL_LAMPS, CORRIDOR_LAMPS, DOOR_TOP };
