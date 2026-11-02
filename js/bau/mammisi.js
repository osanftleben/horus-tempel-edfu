import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { M, mamRect } from '../masse.js';
import { scene } from '../szene.js';
import { stoneMap } from '../texturen.js';
import { PAINT, courtColMat, floorMat, lit } from '../material.js';
import { CELL, block, scaledCapitals, slopedBlock } from './helfer.js';

const F = M.mamFloor, L = M.mamL, H = M.mamW / 2, C = M.mamCol, N = M.mamNaos;
const PIER_U = 1.7, PIER_V = 1.5, SCREEN_T = 0.3, FRONT_V = 1.6;
function b(u0, u1, y0, y1, v0, v1, paint = PAINT.wall) {
  const r = mamRect(Math.min(u0, u1), Math.max(u0, u1), Math.min(v0, v1), Math.max(v0, v1));
  block(r.x0, r.x1, y0, y1, r.z0, r.z1, paint);
}
const at = (u, v) => [M.mamX - u, M.mamZ + v];
const SIDE = [1, 2, 3, 4, 5, 6].map(k => PIER_U + k * (L - 2 * PIER_U) / 7);
const BACK = [1, 2].map(k => -H + PIER_V + k * (2 * H - 2 * PIER_V) / 3);

b(-0.3, L + 0.3, 0, F - 0.01, -H - 0.3, H + 0.3, PAINT.none);
for (const [u0, k] of [[-0.9, 1], [-0.6, 2]]) b(u0, u0 + 0.3, 0, k * F / 3, -M.mamEntryHalf - 0.2, M.mamEntryHalf + 0.2, PAINT.none);
{
  const g = new THREE.PlaneGeometry(L, 2 * H).rotateX(-Math.PI / 2);
  const [cx, cz] = at(L / 2, 0), pos = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (pos.getX(i) + cx) / 8, -(pos.getZ(i) + cz) / 8);
  const floor = new THREE.Mesh(g, floorMat);
  floor.position.set(cx, F, cz);
  floor.receiveShadow = true;
  scene.add(floor);
}
const y = h => F + h;

const BATTER = 0.27, inset = h => BATTER * (h - F) / M.mamArchTop;
const ALL = { xn: true, xp: true, yp: true, yn: true, zn: true, zp: true };
function battered(u0, u1, h0, h1, v0, v1, out, paint = PAINT.wall) {
  const r = mamRect(u0, u1, v0, v1);
  for (let i = Math.floor(r.x0 / CELL); i * CELL < r.x1; i++) for (let k = Math.floor(r.z0 / CELL); k * CELL < r.z1; k++) {
    const x0 = Math.max(r.x0, i * CELL), x1 = Math.min(r.x1, (i + 1) * CELL);
    const z0 = Math.max(r.z0, k * CELL), z1 = Math.min(r.z1, (k + 1) * CELL);
    if (x1 - x0 < 1e-4 || z1 - z0 < 1e-4) continue;
    const faces = {};
    if (out.includes('u0') && x1 === r.x1) faces.xp = h => r.x1 - inset(h);
    if (out.includes('u1') && x0 === r.x0) faces.xn = h => r.x0 + inset(h);
    if (out.includes('v0') && z0 === r.z0) faces.zn = h => r.z0 + inset(h);
    if (out.includes('v1') && z1 === r.z1) faces.zp = h => r.z1 - inset(h);
    slopedBlock(x0, x1, y(h0), y(h1), z0, z1, faces, paint, ALL);
  }
}
for (const [u0, u1, ou] of [[0, PIER_U, 'u0'], [L - PIER_U, L, 'u1']]) {
  for (const [v0, v1, ov] of [[-H, -H + PIER_V, 'v0'], [H - PIER_V, H, 'v1']]) battered(u0, u1, 0, M.mamBesTop, v0, v1, [ou, ov]);
}
function screen(u0, u1, v0, v1, cols) {
  const alongU = Math.abs(u1 - u0) > Math.abs(v1 - v0), cu = (u0 + u1) / 2, cv = (v0 + v1) / 2;
  const [a0, a1] = alongU ? [Math.min(u0, u1), Math.max(u0, u1)] : [Math.min(v0, v1), Math.max(v0, v1)];
  const part = (t, h0, h1, paint = PAINT.wall, c0 = a0, c1 = a1) =>
    alongU ? b(c0, c1, y(h0), y(h1), cv - t, cv + t, paint) : b(cu - t, cu + t, y(h0), y(h1), c0, c1, paint);
  const S = M.mamScreen, FR = 0.15, CAP = S - 0.3;
  part(SCREEN_T - 0.04, 0, CAP);
  part(SCREEN_T, 0, FR);
  part(SCREEN_T, CAP - FR, CAP);
  for (const [c0, c1] of [[a0, a0 + FR], [a1 - FR, a1], ...cols.map(c => [c - 0.62, c + 0.62])]) {
    if (Math.min(c1, a1) > Math.max(c0, a0)) part(SCREEN_T, FR, CAP - FR, PAINT.wall, Math.max(c0, a0), Math.min(c1, a1));
  }
  part(SCREEN_T + 0.04, CAP, CAP + 0.1, PAINT.cornice);
  part(SCREEN_T + 0.12, CAP + 0.1, S, PAINT.cornice);
}
for (const s of [-1, 1]) screen(PIER_U, L - PIER_U, s * (H - C / 2), s * (H - C / 2), SIDE);
screen(L - C / 2, L - C / 2, -H + PIER_V, H - PIER_V, BACK);
for (const s of [-1, 1]) screen(C / 2, C / 2, s * FRONT_V, s * (H - PIER_V), [s * FRONT_V]);
for (const s of [-1, 1]) {
  const E = M.mamEntryHalf;
  b(C / 2 - 0.35, C / 2 + 0.35, y(0), y(M.mamPostTop - 0.2), s * E, s * (E + 0.6));
  b(C / 2 - 0.42, C / 2 + 0.42, y(M.mamPostTop - 0.2), y(M.mamPostTop), s * (E - 0.07), s * (E + 0.67), PAINT.cornice);
}
battered(0, C, M.mamBesTop, M.mamArchTop, -H, H, ['u0', 'v0', 'v1'], PAINT.archLow);
battered(L - C, L, M.mamBesTop, M.mamArchTop, -H, H, ['u1', 'v0', 'v1'], PAINT.archLow);
for (const [s, ov] of [[-1, 'v0'], [1, 'v1']]) battered(C, L - C, M.mamBesTop, M.mamArchTop, s * (H - C), s * H, [ov], PAINT.archLow);
function slab(u0, u1, h0, h1, v0, v1, [hu0, hu1, hv], paint) {
  b(u0, hu0, y(h0), y(h1), v0, v1, paint);
  b(hu1, u1, y(h0), y(h1), v0, v1, paint);
  b(hu0, hu1, y(h0), y(h1), v0, -hv, paint);
  b(hu0, hu1, y(h0), y(h1), hv, v1, paint);
}
const RIM = 0.6, HOLE = [N[1], N[4], M.mamSanHalf], OUTER = [N[1] - RIM, N[4] + RIM, M.mamSanHalf + RIM];
b(C, L - C, y(M.mamBesTop), y(M.mamRecess), -H + C, H - C, PAINT.ceiling);
slab(C, L - C, M.mamRecess, M.mamArchTop, -H + C, H - C, OUTER, PAINT.ceiling);
slab(OUTER[0], OUTER[1], M.mamRecess, M.mamTop, -OUTER[2], OUTER[2], HOLE, PAINT.none);
const TI = BATTER - 0.05;
slab(TI, L - TI, M.mamArchTop, M.mamArchTop + 0.3, -H + TI, H - TI, OUTER, PAINT.cornice);
slab(-0.1, L + 0.1, M.mamArchTop + 0.3, M.mamTop, -H - 0.1, H + 0.1, OUTER, PAINT.cornice);

const supports = [
  ...SIDE.flatMap(u => [[u, -H + C / 2, 0, -1], [u, H - C / 2, 0, 1]]),
  ...BACK.map(v => [L - C / 2, v, -1, 0]),
  [C / 2, -FRONT_V, 1, 0], [C / 2, FRONT_V, 1, 0],
];
const colGeos = scaledCapitals(0.62, M.mamColTop / M.colTop);
let colCount = 0;
const besGeo = mergeGeometries([
  new THREE.BoxGeometry(0.15, 0.42, 0.18).translate(-0.12, 0.21, 0),
  new THREE.BoxGeometry(0.15, 0.42, 0.18).translate(0.12, 0.21, 0),
  new THREE.SphereGeometry(0.27, 14, 10).scale(1, 1.1, 0.6).translate(0, 0.66, 0),
  new THREE.BoxGeometry(0.66, 0.12, 0.14).translate(0, 0.62, 0.06),
  new THREE.BoxGeometry(0.22, 0.2, 0.1).translate(0, 0.9, 0.1),
  new THREE.SphereGeometry(0.19, 14, 10).scale(1.1, 1, 0.75).translate(0, 1.08, 0.02),
  new THREE.BoxGeometry(0.42, 0.3, 0.07).translate(0, 1.38, -0.02),
].map(g => g.toNonIndexed())).translate(0, 0, 0.55);
const besMat = lit(new THREE.MeshStandardMaterial({ map: stoneMap, color: 0xf0e2c8, roughness: 0.9 }));
const besGeos = [];
function column(x, z, base, nx, nz) {
  const col = new THREE.Mesh(colGeos[colCount++ % 3], courtColMat);
  col.position.set(x, base, z);
  col.rotation.y = x + z;
  col.castShadow = col.receiveShadow = true;
  scene.add(col);
  block(x - 0.45, x + 0.45, base + M.mamColTop, base + M.mamBesTop, z - 0.45, z + 0.45, PAINT.none);
  besGeos.push(besGeo.clone().rotateY(Math.atan2(nx, nz)).translate(x, base + M.mamColTop, z));
}
for (const [u, v, nx, nz] of supports) column(...at(u, v), F, nx, nz);
const COURT_COLS = [-2.07, 2.07].map(v => at(-14.03, v));
for (const [x, z] of COURT_COLS) column(x, z, 0, 1, 0);
{
  const bes = new THREE.Mesh(mergeGeometries(besGeos), besMat);
  bes.castShadow = bes.receiveShadow = true;
  scene.add(bes);
}

const TOP = y(M.mamBesTop), NH = M.mamNaosHalf, DH = M.mamDoorHalf;
for (const [u0, u1] of [[N[0], N[1]], [N[2], N[3]]]) {
  for (const s of [-1, 1]) b(u0, u1, y(0), TOP, s * DH, s * NH);
  b(u0, u1, y(M.mamDoorTop), TOP, -DH, DH);
}
for (const s of [-1, 1]) {
  b(N[1], N[2], y(0), TOP, s * M.mamProHalf, s * NH);
  b(N[3], N[4], y(0), TOP, s * M.mamSanHalf, s * NH);
}
b(N[4], N[5], y(0), TOP, -NH, NH);
b(N[1], N[2], y(M.mamCeil), TOP, -M.mamProHalf, M.mamProHalf, PAINT.ceiling);
b(N[3], N[4], y(M.mamCeil), TOP, -M.mamSanHalf, M.mamSanHalf, PAINT.ceiling);

const ALTAR = [N[4] - 1.5, N[4] - 0.8];
b(ALTAR[0], ALTAR[1], y(0), y(0.9), -0.5, 0.5, PAINT.none);
const [lx, lz] = at(ALTAR[0] + 0.15, 0);
const MAM_LAMP = { x: lx, y: y(0.9), z: lz, rot: Math.PI / 2 };

const MAM_COLLIDERS = [[...at((ALTAR[0] + ALTAR[1]) / 2, 0), 0.6], ...COURT_COLS.map(([x, z]) => [x, z, 0.75])];

export { MAM_COLLIDERS, MAM_LAMP };
