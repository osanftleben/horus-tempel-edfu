import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { M, TEX_M } from '../masse.js';
import { scene } from '../szene.js';
import { stoneMap } from '../texturen.js';
import { PAINT, lit } from '../material.js';
import { block } from './helfer.js';

const X0 = M.niloX0, X1 = M.courtHalf, T = M.niloTread, RISE = M.niloRise, HEAD = M.niloHead;
const [Z0, Z1] = M.niloZ, WZ = (Z0 + Z1) / 2, WR = M.wellR;
const D1 = -M.niloN1 * RISE, CURB = 0.4, W = 0.3;
const DEEP = M.niloFloor - 0.6;
const WE = M.wellX - Math.sqrt(WR * WR - ((Z1 - Z0) / 2) ** 2) + 0.005;

for (let i = 1; i <= M.niloN1; i++) {
  const z1 = M.niloTop - (i - 1) * T;
  block(X0, X1, D1 - 0.6, -i * RISE, z1 - T, z1, PAINT.none);
}
block(X0, X1, D1 - 0.6, D1, Z0, M.niloLand, PAINT.none);
block(X0, X1, D1 - 0.6, 0, M.niloTop, M.niloTop + W, PAINT.none);
block(X0 - W, X0, D1 - 0.6, CURB, Z0 - W, M.niloTop, PAINT.none);
block(X0 - W, X1, D1 - 0.6, CURB, Z0 - W, Z0, PAINT.none);
block(X1, X1 + W, D1 - 0.6, 0, Z1, M.niloTop, PAINT.none);
block(X1, X1 + W, D1 + M.niloOpen, 0, Z0, Z1, PAINT.none);

const stepTop = j => D1 - j * RISE;
for (let j = 1; j <= M.niloN2; j++) {
  const x = X1 + (j - 1) * T;
  block(x, x + T, DEEP, stepTop(j), Z0, Z1, PAINT.none);
  block(x, x + T, stepTop(j) + HEAD, stepTop(j) + HEAD + 0.5, Z0 - W, Z1 + W, PAINT.none);
}
block(M.niloEnd, M.wellX - WR + 0.7, DEEP, M.niloFloor, Z0, Z1, PAINT.none);
block(M.niloEnd, WE, M.niloFloor + HEAD, M.niloFloor + HEAD + 0.5, Z0 - W, Z1 + W, PAINT.none);
const NX = [27.5, 27.9], NY = stepTop(Math.floor((NX[0] - X1) / T) + 1) + 1.1, NH = 0.5;
block(X1, WE, DEEP, -1.0, Z0 - W, Z0, PAINT.none);
block(X1, NX[0], DEEP, -1.0, Z1, Z1 + W, PAINT.none);
block(NX[1], WE, DEEP, -1.0, Z1, Z1 + W, PAINT.none);
block(NX[0], NX[1], DEEP, NY, Z1, Z1 + W, PAINT.none);
block(NX[0], NX[1], NY + NH, -1.0, Z1, Z1 + W, PAINT.none);
block(NX[0], NX[1], NY, NY + NH, Z1 + 0.25, Z1 + W, PAINT.none);
const NILO_LAMP = { x: (NX[0] + NX[1]) / 2, y: NY, z: Z1 + 0.12, rot: Math.PI };

const stoneMat = lit(new THREE.MeshStandardMaterial({ map: stoneMap, roughness: 0.92, side: THREE.DoubleSide }));
function shaft(profile, segs, phiStart, phiLength) {
  const g = new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), segs, phiStart, phiLength);
  const uv = g.attributes.uv, pos = g.attributes.position;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (phiStart + uv.getX(i) * phiLength) * WR / TEX_M, pos.getY(i) / TEX_M);
  const m = new THREE.Mesh(g, stoneMat);
  m.position.set(M.wellX, 0, WZ);
  m.castShadow = m.receiveShadow = true;
  scene.add(m);
}
const GAP = Math.asin((Z1 - Z0) / 2 / WR), TOP = M.niloFloor + HEAD;
const RIM = [[WR, TOP], [WR, 0.6], [WR + 0.4, 0.6], [WR + 0.4, 0.06], [WR + 0.75, 0.06], [WR + 0.75, 0.02]];
shaft([[WR, M.niloWater - 0.3], ...RIM], 36, 1.5 * Math.PI + GAP, 2 * Math.PI - 2 * GAP);
shaft(RIM, 4, 1.5 * Math.PI - GAP, 2 * GAP);
const water = new THREE.Mesh(new THREE.CircleGeometry(WR, 40).rotateX(-Math.PI / 2),
  lit(new THREE.MeshStandardMaterial({ color: 0x34402f, roughness: 0.08 })));
water.position.set(M.wellX, M.niloWater, WZ);
water.receiveShadow = true;
scene.add(water);

const CUBIT = 0.525;
function scale(x, z, y0, y1, nx, nz) {
  const parts = [], tx = -nz, tz = nx;
  const mark = (w, h, along, y) => parts.push(new THREE.BoxGeometry(tx ? w : 0.012, h, tz ? w : 0.012)
    .translate(x + nx * 0.006 + tx * along, y, z + nz * 0.006 + tz * along));
  mark(0.05, y1 - y0, 0, (y0 + y1) / 2);
  for (let k = 0; y0 + k * CUBIT / 7 <= y1; k++) {
    const big = k % 7 === 0;
    mark(big ? 0.28 : 0.1, big ? 0.04 : 0.02, (big ? 0.28 : 0.1) / 2, y0 + k * CUBIT / 7);
  }
  scene.add(new THREE.Mesh(mergeGeometries(parts), scaleMat));
}
const scaleMat = lit(new THREE.MeshStandardMaterial({ color: 0x4a3524, roughness: 0.9 }));
scale(X1, -67.0, -3.1, -0.5, -1, 0);
scale(29.3, Z0, M.niloFloor, M.niloFloor + HEAD - 0.2, 0, 1);

export { NILO_LAMP };
