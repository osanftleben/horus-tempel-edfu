import * as THREE from 'three';
import { M } from '../masse.js';
import { lit, woodMat } from '../material.js';
import { addMesh, box, goldMat, limestoneMat } from './kammern.js';

const F = M.hallFloor;
const clayMat = lit(new THREE.MeshStandardMaterial({ color: 0x9a5a36, roughness: 0.9 }));
const gemMats = [0x1f3f8a, 0x2f8a7a, 0xa33a24].map(c => lit(new THREE.MeshStandardMaterial({ color: c, roughness: 0.3 })));
const jarGeo = (pts, seg = 16) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg);

const TRE = {
  chests: [[M.labX0 + 0.4, M.treZ1 - 0.8], [M.labX0 + 0.4, M.treZ1 - 2.0]],
  table: [M.labX1 - 0.35, M.treOut[0] + 1.4],
  shelf: [(M.labX0 + M.labX1) / 2, M.treZ0 + 0.22],
};
{
  const wood = [], gold = [], stone = [], gems = [[], [], []];
  for (const [x, z] of TRE.chests) {
    wood.push(box(0.55, 0.55, 0.95, x, F + 0.275, z), box(0.6, 0.06, 1.0, x, F + 0.58, z));
  }
  const [tx, tz] = TRE.table;
  wood.push(box(0.5, 0.06, 0.9, tx, F + 0.8, tz));
  for (const [a, b] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) wood.push(box(0.05, 0.77, 0.05, tx + a * 0.2, F + 0.385, tz + b * 0.38));
  for (let k = 0; k < 7; k++) {
    const top = k > 3, i = top ? k - 4 : k;
    gold.push(box(0.09, 0.05, 0.2, tx - 0.15 + i * 0.1 + (top ? 0.05 : 0), F + 0.855 + (top ? 0.05 : 0), tz - 0.2));
  }
  for (let k = 0; k < 9; k++) {
    const g = new THREE.SphereGeometry(0.03, 8, 6).translate(tx - 0.1 + (k % 3) * 0.05, F + 0.86 + Math.floor(k / 3) % 2 * 0.03, tz + 0.12 + Math.floor(k / 3) * 0.1);
    gems[k % 3].push(g);
  }
  const [sx, sz] = TRE.shelf, w = 1.6;
  for (const dx of [-w / 2, w / 2]) wood.push(box(0.05, 1.3, 0.36, sx + dx, F + 0.65, sz));
  for (const y of [0.2, 0.75, 1.3]) wood.push(box(w, 0.04, 0.36, sx, F + y, sz));
  const small = [[0, 0], [0.06, 0], [0.08, 0.08], [0.07, 0.16], [0.04, 0.2], [0.045, 0.24], [0, 0.24]];
  for (const y of [0.22, 0.77]) {
    for (let k = 0; k < 6; k++) {
      const g = jarGeo(small, 12).translate(sx - w / 2 + 0.17 + k * 0.25, F + y, sz);
      (k % 2 ? stone : gold).push(g);
    }
  }
  addMesh(wood, woodMat);
  addMesh(gold, goldMat);
  addMesh(stone, limestoneMat);
  gems.forEach((g, i) => addMesh(g, gemMats[i]));
}

const NIL = {
  jars: [[M.nilX1 - 0.45, M.nilZ0 + 0.45], [M.nilX1 - 0.45, M.nilZ0 + 1.25]],
  table: [M.hallWall + 0.4, M.hallFront - 0.5],
};
{
  const clay = [], stone = [], gold = [];
  const big = [[0, 0], [0.1, 0.02], [0.22, 0.2], [0.26, 0.42], [0.22, 0.66], [0.12, 0.8], [0.09, 0.86], [0.12, 0.9], [0.1, 0.92], [0, 0.92]];
  for (const [x, z] of NIL.jars) {
    stone.push(new THREE.CylinderGeometry(0.2, 0.24, 0.14, 16).translate(x, F + 0.07, z));
    clay.push(jarGeo(big).translate(x, F + 0.1, z));
  }
  const [tx, tz] = NIL.table;
  stone.push(box(0.5, 0.08, 0.6, tx, F + 0.79, tz), box(0.3, 0.75, 0.4, tx, F + 0.375, tz));
  const hes = [[0, 0], [0.04, 0], [0.055, 0.06], [0.07, 0.17], [0.06, 0.23], [0.028, 0.26], [0.024, 0.32], [0.035, 0.34], [0, 0.34]];
  for (const dz of [-0.17, 0.15]) {
    gold.push(jarGeo(hes, 12).translate(tx - 0.08, F + 0.83, tz + dz));
    gold.push(new THREE.CylinderGeometry(0.01, 0.014, 0.12, 8).rotateZ(-0.9).translate(tx - 0.02, F + 0.83 + 0.3, tz + dz));
  }
  addMesh(clay, clayMat);
  addMesh(stone, limestoneMat);
  addMesh(gold, goldMat);
}

const SIDE_LAMPS = [
  { x: TRE.chests[0][0], y: F + 0.61, z: TRE.chests[0][1], rot: Math.PI / 2 },
  { x: NIL.table[0] + 0.1, y: F + 0.83, z: NIL.table[1] - 0.02, rot: Math.PI / 2 },
];
const SIDE_COLLIDERS = [
  ...TRE.chests.flatMap(([x, z]) => [[x, z - 0.25, 0.35], [x, z + 0.25, 0.35]]),
  [TRE.table[0], TRE.table[1] - 0.22, 0.3], [TRE.table[0], TRE.table[1] + 0.22, 0.3],
  [TRE.shelf[0] - 0.45, TRE.shelf[1], 0.3], [TRE.shelf[0] + 0.45, TRE.shelf[1], 0.3],
  ...NIL.jars.map(([x, z]) => [x, z, 0.3]),
  [NIL.table[0], NIL.table[1], 0.35],
];

export { SIDE_COLLIDERS, SIDE_LAMPS };
