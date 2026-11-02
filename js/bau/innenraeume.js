import * as THREE from 'three';
import { M, WAB_DOOR } from '../masse.js';
import { scene } from '../szene.js';
import { PAINT, woodMat } from '../material.js';
import { block, mirrorX } from './helfer.js';
import { XH } from './pronaos.js';

const OF = M.offFront, OB = M.offBack, OH = M.offHalf;
const OFF_C = (OF + OB) / 2;
const OFF_HOLES = [-4.5, 4.5], OFF_HOLE_Z = [OFF_C - 1.0, OFF_C + 1.0];
const SF0 = M.stairFoot;
block(-OH, OH, 0, M.offFloor - 0.01, OB, OF, PAINT.none);
mirrorX(s => {
  const east = s > 0, door = east ? M.stairX1 : -M.wsX1, out = east ? XH : -M.wsX1;
  block(s * OH, s * out, 0, M.innerMass, OB, SF0);
  block(s * OH, s * (east ? M.stairX0 : out), 0, M.innerMass, M.stairZ0, OF);
  block(s * OH, s * door, M.offFloor + 3.4, M.innerMass, SF0, M.stairZ0);
  block(s * OH, s * door, 0, M.offFloor, SF0, M.stairZ0, PAINT.none);
});
block(-OH, OH, M.offTop, M.offRoof, OB, OFF_HOLE_Z[0], PAINT.ceiling);
block(-OH, OH, M.offTop, M.offRoof, OFF_HOLE_Z[1], OF, PAINT.ceiling);
block(-OH, -5, M.offTop, M.offRoof, OFF_HOLE_Z[0], OFF_HOLE_Z[1], PAINT.ceiling);
block(-4, 4, M.offTop, M.offRoof, OFF_HOLE_Z[0], OFF_HOLE_Z[1], PAINT.ceiling);
block(5, OH, M.offTop, M.offRoof, OFF_HOLE_Z[0], OFF_HOLE_Z[1], PAINT.ceiling);
for (const x of OFF_HOLES) block(x - 0.8, x + 0.8, M.offFloor, M.offFloor + 0.95, OFF_C - 0.6, OFF_C + 0.6, PAINT.none);

mirrorX(s => block(s * 1.3, s > 0 ? XH : M.wsX1, 0, M.innerMass, M.midFront, OB));
block(-1.3, 1.3, 6.4, M.innerMass, M.midFront, OB);
block(-1.3, 1.3, 0, 1.6, M.midFront, OB, PAINT.none);

const MF = M.midFront, MB = M.midBack, MH = M.midHalf, MC = (MF + MB) / 2, ME = M.midEnd, CW = M.corrWall;
block(-MH, MH, 0, M.midFloor - 0.01, MB, MF, PAINT.none);
mirrorX(s => block(s * MH, s * XH, 0, M.innerMass, MB, MF));
block(ME, CW, 0, M.innerMass, MB, WAB_DOOR[0]);
block(ME, CW, 0, M.innerMass, WAB_DOOR[1], MF);
block(ME, CW, M.midFloor + 3.4, M.innerMass, WAB_DOOR[0], WAB_DOOR[1]);
block(-ME, -0.5, M.midTop, M.midRoof, MB, MF, PAINT.ceiling);
block(0.5, ME, M.midTop, M.midRoof, MB, MF, PAINT.ceiling);
block(-0.5, 0.5, M.midTop, M.midRoof, MB, MC - 0.8, PAINT.ceiling);
block(-0.5, 0.5, M.midTop, M.midRoof, MC + 0.8, MF, PAINT.ceiling);

mirrorX(s => {
  block(s * 1.2, s * M.corrIn, 0, M.innerMass, M.sanctBack, MB);
  block(s * M.corrIn, s * M.corrOut, M.midFloor + 5.0, M.innerMass, MB - 0.8, MB);
  block(s * M.corrOut, s * (s > 0 ? CW : XH), 0, M.innerMass, M.sanctBack, MB);
});
block(-1.2, 1.2, 6.4, M.innerMass, M.sanctBack, MB);
block(-1.2, 1.2, 0, 2.0, M.sanctBack, MB, PAINT.none);

const SF = M.sanFront, SB = M.sanBack, SHX = M.sanHalf;
const NAOS_Z = SB + 1.6, BARK_Z = SB + 4.7;
const SAN_HOLES = [SF - 2.0, BARK_Z - 0.2, NAOS_Z], SAN_HX = 0.3, SAN_HZ = 0.6;
block(-SHX, SHX, 0, M.sanFloor - 0.01, SB, SF, PAINT.none);
mirrorX(s => block(s * SHX, s * M.corrIn, 0, M.sanRoof, M.corrBack0, SF));
block(-M.corrIn, M.corrIn, 0, M.sanRoof, M.corrBack0, SB);
block(-SHX, -SAN_HX, M.sanTop, M.sanRoof, SB, SF, PAINT.roof);
block(SAN_HX, SHX, M.sanTop, M.sanRoof, SB, SF, PAINT.roof);
{
  let z = SF;
  for (const c of SAN_HOLES) { block(-SAN_HX, SAN_HX, M.sanTop, M.sanRoof, c + SAN_HZ, z, PAINT.roof); z = c - SAN_HZ; }
  block(-SAN_HX, SAN_HX, M.sanTop, M.sanRoof, SB, z, PAINT.roof);
}

function woodDoor(w, h, d, x, y, z) {
  const door = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), woodMat);
  door.position.set(x, y, z);
  door.castShadow = door.receiveShadow = true;
  scene.add(door);
}
for (const z of [SF0 + 0.05, M.stairZ0 - 0.05]) woodDoor(1.0, 3.4, 0.08, -(OH + 0.55), M.offFloor + 1.7, z);

export { BARK_Z, MB, MF, MH, NAOS_Z, OB, OF, OFF_C, OFF_HOLES, OH, SB, SF, SHX };
