import * as THREE from 'three';
import { COL_SOUTH, COL_X, M } from '../masse.js';
import { scene } from '../szene.js';
import { rand } from '../texturen.js';
import { abacusMat, courtColMat, proColMat } from '../material.js';
import { courtAbacus, courtGeos, hallAbacus, hallGeos, mirrorX, proAbacus, proGeos } from './helfer.js';

const courtPos = [];
mirrorX(s => {
  for (let k = 0; k < 12; k++) courtPos.push([s * COL_X, COL_SOUTH - 3.9 * k]);
  for (const x of [3.75, 7.3, 10.8, 14.4]) courtPos.push([s * x, COL_SOUTH]);
});
const PRO_X = [3.8, 8.4, 12.9], PRO_Z = [M.proFront, -20.6, -25.9];
const proPos = [], proType = [];
PRO_Z.forEach((z, r) => mirrorX(s => PRO_X.forEach((x, k) => {
  proPos.push([s * x, z]);
  proType.push(r ? 3 + (r + k) % 2 : k % 3);
})));
const HALL_X = [3.0, 7.0], HALL_Z = [-35.4, -39.1, -42.8];
const hallPos = [];
for (const z of HALL_Z) mirrorX(s => { for (const x of HALL_X) hallPos.push([s * x, z]); });

function instanced(geo, material, positions, spin, y = 0) {
  const mesh = new THREE.InstancedMesh(geo, material, positions.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
  positions.forEach(([x, z], i) => {
    q.setFromAxisAngle(up, spin ? rand() * Math.PI * 2 : 0);
    m.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(1, 1, 1));
    mesh.setMatrixAt(i, m);
  });
  mesh.castShadow = mesh.receiveShadow = true;
  scene.add(mesh);
}
courtGeos.forEach((g, t) => instanced(g, courtColMat, courtPos.filter((p, i) => (i % 16) % 3 === t), true));
instanced(courtAbacus, abacusMat, courtPos, false);
proGeos.forEach((g, t) => instanced(g, proColMat, proPos.filter((p, i) => proType[i] === t), true, M.proFloor));
instanced(proAbacus, abacusMat, proPos, false, M.proFloor);
hallGeos.forEach((g, t) => instanced(g, courtColMat, hallPos.filter((p, i) => (Math.floor(i / 4) + i % 2) % 3 === t), true, M.hallFloor));
instanced(hallAbacus, abacusMat, hallPos, false, M.hallFloor);

export { HALL_X, HALL_Z, PRO_X, PRO_Z, courtPos, hallPos, proPos };
