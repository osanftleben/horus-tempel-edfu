import * as THREE from 'three';
import { M, WAB_TREAD } from '../masse.js';
import { scene } from '../szene.js';
import { PAINT, courtColMat, floorMat } from '../material.js';
import { block, scaledCapitals } from './helfer.js';

const X0 = M.corrWall, X1 = M.midHalf, F = M.midFloor, KF = M.wabFloor, KT = M.wabTop;
const FRONT = M.sanctBack, BACK = M.wabBack, COLS = M.wabCols;
const COL_Z = FRONT - 0.3, PIER = 0.6, SCREEN_H = 1.6, ARCH_H = 0.6, ABACUS_H = 0.3;

block(X0, X1, 0, KF - 0.01, BACK, FRONT, PAINT.none);
for (let i = 1; i <= M.wabSteps; i++) {
  const z1 = M.wabStepZ - (i - 1) * WAB_TREAD;
  block(X0, X1, F - 0.01, F + i * (KF - F) / M.wabSteps, z1 - WAB_TREAD, z1, PAINT.none);
}
{
  const w = X1 - X0, d = FRONT - BACK;
  const g = new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2);
  g.attributes.uv.array.forEach((v, i, a) => { a[i] = v * (i % 2 ? d : w) / 8; });
  const floor = new THREE.Mesh(g, floorMat);
  floor.position.set((X0 + X1) / 2, KF, (FRONT + BACK) / 2);
  floor.receiveShadow = true;
  scene.add(floor);
}

block(X0, X0 + PIER, KF, KT, FRONT - 0.6, FRONT);
block(X1 - PIER, X1, KF, KT, FRONT - 0.6, FRONT);
block(X0 + PIER, COLS[0], KF, KF + SCREEN_H, FRONT - 0.5, FRONT - 0.1);
block(COLS[1], X1 - PIER, KF, KF + SCREEN_H, FRONT - 0.5, FRONT - 0.1);
block(X0 + PIER, X1 - PIER, KT - ARCH_H, KT, FRONT - 0.6, FRONT);
block(X0, X1, KT, KT + 0.25, FRONT - 0.6, FRONT + 0.15, PAINT.cornice);
block(X0, X1, KT + 0.25, KT + 1.0, FRONT - 0.6, FRONT + 0.5, PAINT.cornice);
block(X0, X1, KT + 1.0, M.backRoof, FRONT - 0.6, FRONT);

const colTop = KT - ARCH_H - ABACUS_H - KF;
const colGeos = scaledCapitals(0.5, colTop / M.colTop);
for (const [i, x] of COLS.entries()) {
  const col = new THREE.Mesh(colGeos[i], courtColMat);
  col.position.set(x, KF, COL_Z);
  col.rotation.y = x;
  col.castShadow = col.receiveShadow = true;
  scene.add(col);
  block(x - 0.42, x + 0.42, KT - ARCH_H - ABACUS_H, KT - ARCH_H, COL_Z - 0.42, COL_Z + 0.42, PAINT.none);
}

const XC = (X0 + X1) / 2, ALTAR = [BACK + 0.7, BACK + 1.6], ALTAR_H = 1.0;
block(XC - 0.7, XC + 0.7, KF, KF + ALTAR_H, ALTAR[0], ALTAR[1], PAINT.none);
const WAB_LAMP = { x: XC, y: KF + ALTAR_H, z: ALTAR[1] - 0.2, rot: 0 };

const WAB_COLLIDERS = [...COLS.map(x => [x, COL_Z, 0.4]), [XC, (ALTAR[0] + ALTAR[1]) / 2, 0.8]];

export { WAB_COLLIDERS, WAB_LAMP };
