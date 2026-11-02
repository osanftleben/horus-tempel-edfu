import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { M } from '../masse.js';
import { scene } from '../szene.js';
import { PAINT, lit, woodMat } from '../material.js';
import { block, mirrorX } from './helfer.js';

const { chamWall: CW, chamX0: X0, chamX1: X1, chamOut: XO, chamZ0: Z0, chamZ1: Z1, chamBack: ZB, chamTop: T, chamRoof: R } = M;
const [D0, D1] = M.chamDoor, F = M.proFloor, DT = M.chamDoorTop;
const C = 0.15;
mirrorX(s => {
  block(s * CW, s * X0, 0, R, ZB, D0);
  block(s * CW, s * X0, 0, R, D1, Z1);
  block(s * CW, s * X0, DT, R, D0, D1);
  block(s * CW, s * X0, 0, F, D0, D1, PAINT.none);
  block(s * X1, s * XO, 0, R, ZB, Z1);
  block(s * X0, s * X1, 0, R, ZB, Z0);
  block(s * X0, s * X1, T, R, Z0, Z1, PAINT.roof);
  block(s * (CW - C), s * X0, R, R + 0.45, ZB - C, Z1, PAINT.cornice);
  block(s * X1, s * (XO + C), R, R + 0.45, ZB - C, Z1, PAINT.cornice);
  block(s * X0, s * X1, R, R + 0.45, ZB - C, Z0, PAINT.cornice);
  block(s * X0, s * X1, R, R + 0.45, Z0, Z1, PAINT.none);
  const paint = s > 0 ? PAINT.library : PAINT.morning;
  block(s * X0, s * (X0 + 0.04), F, T, Z0, D0, paint);
  block(s * X0, s * (X0 + 0.04), F, T, D1, Z1, paint);
  block(s * X0, s * (X0 + 0.04), DT, T, D0, D1, paint);
  block(s * (X1 - 0.04), s * X1, F, T, Z0, Z1, paint);
  block(s * X0, s * X1, F, T, Z0, Z0 + 0.04, paint);
  block(s * X0, s * X1, F, T, Z1 - 0.04, Z1, paint);
});

const papyrusMat = lit(new THREE.MeshStandardMaterial({ color: 0xd8c49a, roughness: 0.85 }));
const limestoneMat = lit(new THREE.MeshStandardMaterial({ color: 0xcdb48c, roughness: 0.9 }));
const waterMat = lit(new THREE.MeshStandardMaterial({ color: 0x23404a, roughness: 0.08, metalness: 0.1 }));
const goldMat = lit(new THREE.MeshStandardMaterial({ color: 0xc89a42, metalness: 0.35, roughness: 0.4 }));
function addMesh(geos, mat) {
  const m = new THREE.Mesh(mergeGeometries(geos.map(g => g.index ? g.toNonIndexed() : g)), mat);
  m.castShadow = m.receiveShadow = true;
  scene.add(m);
}
const box = (w, h, d, x, y, z) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);
const roll = (len, x, y, z, alongX) => {
  const g = new THREE.CylinderGeometry(0.04, 0.04, len, 10);
  return alongX ? g.rotateZ(Math.PI / 2).translate(x, y, z) : g.rotateX(Math.PI / 2).translate(x, y, z);
};

const LIB = { chests: [[X1 - 0.4, Z1 - 0.9], [X1 - 0.4, Z0 + 1.2]], shelfX: (X0 + X1) / 2 - 0.2 };
{
  const wood = [], paper = [];
  LIB.chests.forEach(([x, z], i) => {
    wood.push(box(0.55, 0.55, 0.95, x, F + 0.275, z));
    if (i === 0) {
      wood.push(box(0.04, 0.6, 0.95, x + 0.27, F + 0.85, z));
      for (let k = 0; k < 6; k++) paper.push(roll(0.42, x - 0.12 + (k % 3) * 0.1, F + 0.58 + Math.floor(k / 3) * 0.08, z - 0.15 + (k % 2) * 0.2, true));
    } else wood.push(box(0.6, 0.06, 1.0, x, F + 0.58, z));
  });
  const sx = LIB.shelfX, sz = Z0 + 0.22, w = 1.4;
  for (const dx of [-w / 2, w / 2]) wood.push(box(0.05, 1.7, 0.36, sx + dx, F + 0.85, sz));
  for (const y of [0.15, 0.75, 1.35]) {
    wood.push(box(w, 0.04, 0.36, sx, F + y, sz));
    for (let k = 0; k < 9; k++) paper.push(roll(0.3, sx - w / 2 + 0.12 + k * 0.145, F + y + 0.06, sz, false));
  }
  paper.push(box(0.38, 0.005, 0.5, LIB.chests[0][0] - 0.05, F + 0.555, LIB.chests[0][1] + 0.6));
  addMesh(wood, woodMat);
  addMesh(paper, papyrusMat);
}

const MOR = { basin: [-(X0 + X1) / 2, Z0 + 0.36], table: [-(X1 - 0.35), Z1 - 1.0] };
{
  const [bx, bz] = MOR.basin, stone = [];
  stone.push(box(1.2, 0.5, 0.6, bx, F + 0.25, bz));
  addMesh(stone, limestoneMat);
  addMesh([new THREE.PlaneGeometry(1.0, 0.42).rotateX(-Math.PI / 2).translate(bx, F + 0.505, bz)], waterMat);
  const [tx, tz] = MOR.table;
  addMesh([box(0.5, 0.06, 0.9, tx, F + 0.8, tz), ...[[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([a, b]) => box(0.05, 0.77, 0.05, tx + a * 0.2, F + 0.385, tz + b * 0.38))], woodMat);
  const vase = [];
  for (const dz of [-0.2, 0.15]) {
    vase.push(new THREE.LatheGeometry([[0, 0], [0.05, 0], [0.07, 0.08], [0.09, 0.22], [0.08, 0.3], [0.035, 0.34], [0.03, 0.42], [0.045, 0.45], [0, 0.45]]
      .map(([r, y]) => new THREE.Vector2(r, y)), 16).translate(tx, F + 0.83, tz + dz));
    vase.push(new THREE.CylinderGeometry(0.012, 0.018, 0.16, 8).rotateX(-0.9).translate(tx, F + 0.83 + 0.4, tz + dz + 0.07));
  }
  addMesh(vase, goldMat);
}

const CHAMBER_LAMPS = [
  { x: LIB.chests[1][0], y: F + 0.61, z: LIB.chests[1][1], rot: -Math.PI / 2 },
  { x: MOR.table[0], y: F + 0.83, z: MOR.table[1] + 0.32, rot: Math.PI / 2 },
];
const CHAMBER_COLLIDERS = [
  ...LIB.chests.flatMap(([x, z]) => [[x, z - 0.25, 0.35], [x, z + 0.25, 0.35]]),
  [LIB.shelfX - 0.4, Z0 + 0.2, 0.3], [LIB.shelfX + 0.4, Z0 + 0.2, 0.3],
  [MOR.basin[0] - 0.3, MOR.basin[1], 0.32], [MOR.basin[0] + 0.3, MOR.basin[1], 0.32],
  [MOR.table[0], MOR.table[1] - 0.22, 0.3], [MOR.table[0], MOR.table[1] + 0.22, 0.3],
];

export { CHAMBER_COLLIDERS, CHAMBER_LAMPS, addMesh, box, goldMat, limestoneMat };
