import { CR, M, OUT_DOORS, PF, UP } from '../masse.js';
import { PAINT } from '../material.js';
import { block, mirrorX } from './helfer.js';
import { HALL_X, HALL_Z } from './saeulen.js';
import { HB, HF, HH, HW, XH } from './pronaos.js';

const HBW = M.offFront;
const [LD0, LD1] = M.labDoor, DOOR_TOP = M.doorTop;
function doorWall(xa, xb, za, zb, doors, top = DOOR_TOP, sill = M.hallFloor, paint) {
  let z = za;
  for (const [d0, d1] of doors) {
    block(xa, xb, 0, M.hallMass, z, d0, paint);
    block(xa, xb, top, M.hallMass, d0, d1, paint);
    if (sill > 0) block(xa, xb, 0, sill, d0, d1, PAINT.none);
    z = d1;
  }
  block(xa, xb, 0, M.hallMass, z, zb, paint);
}
block(-HH, HH, 0, M.hallFloor - 0.01, HB, HF, PAINT.none);
doorWall(-HW, -HH, HBW, HF, [M.treDoor, M.labDoor]);
doorWall(-XH, M.labX0, M.wsZ1, HF, [M.treOut], M.outTop, 0);
block(M.labX0, M.labX1, 0, M.hallMass, M.treZ1, M.labZ0);
doorWall(HH, HW, HBW, HF, [M.labDoor]);
block(HW, M.stairX0, 0, M.hallMass, HBW, M.nilZ0);
doorWall(M.nilX1, M.stairX0, M.nilZ0, HF, [M.nilOut], M.outTop, 0);
for (const [xi, xo, [z0, z1]] of OUT_DOORS) {
  const n = M.outSteps, t = (xo - xi) / n;
  for (let i = 0; i < n; i++) block(xi + i * t, xi + (i + 1) * t, 0, M.hallFloor * (1 - i / n), z0, z1, PAINT.none);
}
mirrorX(s => block(s * 1.4, s > 0 ? M.stairX0 : M.wsX1, 0, M.hallMass, HBW, HB));
block(-1.4, 1.4, M.hallFloor + 5.6, M.hallMass, HBW, HB);
block(-1.4, 1.4, 0, 1.2, HBW, HB, PAINT.none);

for (const z of HALL_Z) block(-HH, HH, M.hallAbacus, M.hallArch, z - 0.85, z + 0.85, PAINT.archHall);
mirrorX(s => { for (const x of HALL_X) block(s * x - 0.85, s * x + 0.85, M.hallAbacus, M.hallArch, HB, HF, PAINT.archHall); });

const SKY_Z = [-37.25, -40.95, -44.6], SKY_HX = 0.6, SKY_HZ = 1.0;
block(-HH, -SKY_HX, M.hallArch, M.hallRoof, HB, HF, PAINT.ceiling);
block(SKY_HX, HH, M.hallArch, M.hallRoof, HB, HF, PAINT.ceiling);
{
  let z = HF;
  for (const c of SKY_Z) { block(-SKY_HX, SKY_HX, M.hallArch, M.hallRoof, z, c + SKY_HZ, PAINT.ceiling); z = c - SKY_HZ; }
  block(-SKY_HX, SKY_HX, M.hallArch, M.hallRoof, z, HB, PAINT.ceiling);
}

{
  const { stairX0: X0, stairX1: X1, stairZ0: Z0, stairZ1: Z1, stairSteps: N, roofY: TOP } = M;
  const tread = (Z1 - Z0) / N, rise = (TOP - M.offFloor) / N;
  for (let i = 0; i < N; i++) {
    const za = Z0 + i * tread, zb = za + tread, y = M.offFloor + (i + 1) * rise;
    block(X0, X1, 0, y, za, zb, PAINT.none);
    if (y + 3.0 < TOP) block(X0, X1, y + 3.0, TOP, za, zb, PAINT.roof);
  }
  doorWall(X0, X1, Z1, HF, [M.nilOut], M.outTop, 0, PAINT.none);
  block(X0, X1, M.offFloor + 3.4, TOP, M.stairFoot, Z0);
  const yAt = z => M.offFloor + (z - Z0) * M.stairSlope;
  const SLITS = [-47.0, -44.2, -41.4, -38.6], SW = 0.1;
  let z = M.stairFoot;
  const wall = (za, zb, y0 = 0, y1 = TOP) => {
    block(X1 + 0.0, XH, y0, y1, za, zb);
    const va = Math.max(za, Z0), vb = Math.min(zb, Z1);
    if (vb > va) block(X1 - 0.04, X1, Math.max(y0, M.offFloor), y1, va, vb, PAINT.stair);
  };
  for (const c of SLITS) {
    wall(z, c - SW);
    wall(c - SW, c + SW, 0, yAt(c) + 1.3);
    wall(c - SW, c + SW, yAt(c) + 2.4, TOP);
    z = c + SW;
  }
  wall(z, M.nilOut[0]);
  wall(M.nilOut[0], M.nilOut[1], M.outTop, TOP);
  wall(M.nilOut[1], HF);
  block(X0, X0 + 0.04, M.offFloor, TOP, Z0, Z1, PAINT.stair);
}
{
  const T = M.roofY, P = T + 1.0;
  block(-HW, XH, T, P, HBW, HBW + 0.4, PAINT.none);
  block(-HW, -HW + 0.4, T, P, M.wsZ1, HF, PAINT.none);
  block(M.stairX1, XH, T, P, HBW, HF, PAINT.none);
  block(M.stairX0 - 0.3, M.stairX0, T, P, HBW + 0.4, M.stairZ1, PAINT.none);
  for (let i = 0; i < UP.n; i++) {
    const t = (UP.z1 - UP.z0) / UP.n;
    block(UP.x0, UP.x1, M.hallRoof, M.hallRoof + (i + 1) * (M.proRoof - M.hallRoof) / UP.n, UP.z0 + i * t, UP.z0 + (i + 1) * t, PAINT.none);
  }
  const PR = M.proRoof, PP = PR + 1.0, PO = M.proOut - M.proBatter;
  mirrorX(s => block(s * (PO - 0.4), s * PO, PR, PP, HF, PF - 0.6, PAINT.none));
  block(-PO, UP.x0, PR, PP, HF, HF + 0.3, PAINT.none);
  block(UP.x1, PO, PR, PP, HF, HF + 0.3, PAINT.none);
  for (let i = 0; i < CR.n; i++) {
    const z0 = CR.z1 - (CR.n - i) * CR.tread;
    block(CR.x0, CR.x1, PR, PR + (i + 1) * CR.rise, z0, z0 + CR.tread, PAINT.none);
  }
  for (const c of SKY_Z) {
    const y0 = M.hallRoof, y1 = M.hallRoof + 0.3;
    mirrorX(s => block(s * SKY_HX, s * (SKY_HX + 0.2), y0, y1, c - SKY_HZ - 0.2, c + SKY_HZ + 0.2, PAINT.none));
    for (const d of [-1, 1]) block(-SKY_HX, SKY_HX, y0, y1, c + d * SKY_HZ, c + d * (SKY_HZ + 0.2), PAINT.none);
  }
}

const LAB_HOLE = { x0: -13.4, x1: -12.5, z0: HF - 3.6, z1: HF - 2.0 };
block(M.labX0, M.labX1, 0, M.hallFloor - 0.01, M.labZ0, HF, PAINT.none);
block(M.labX0, LAB_HOLE.x0, M.labTop, M.labRoof, M.labZ0, HF, PAINT.roof);
block(LAB_HOLE.x1, M.labX1, M.labTop, M.labRoof, M.labZ0, HF, PAINT.roof);
block(LAB_HOLE.x0, LAB_HOLE.x1, M.labTop, M.labRoof, M.labZ0, LAB_HOLE.z0, PAINT.roof);
block(LAB_HOLE.x0, LAB_HOLE.x1, M.labTop, M.labRoof, LAB_HOLE.z1, HF, PAINT.roof);
block(M.labX0, M.labX0 + 0.04, M.hallFloor, M.labTop, M.labZ0, HF, PAINT.lab);
block(M.labX1 - 0.04, M.labX1, M.hallFloor, M.labTop, M.labZ0, LD0, PAINT.lab);
block(M.labX1 - 0.04, M.labX1, M.hallFloor, M.labTop, LD1, HF, PAINT.lab);
block(M.labX1 - 0.04, M.labX1, M.hallFloor + 3.2, M.labTop, LD0, LD1, PAINT.lab);
block(M.labX0, M.labX1, M.hallFloor, M.labTop, M.labZ0, M.labZ0 + 0.04, PAINT.lab);
block(M.labX0, M.labX1, M.hallFloor, M.labTop, HF - 0.04, HF, PAINT.lab);

function lining(x0, x1, z0, z1, paint, west, east) {
  const y0 = M.hallFloor, y1 = M.labTop, t = 0.04;
  const side = (xa, xb, doors) => {
    let z = z0;
    for (const [d0, d1, top] of doors) { block(xa, xb, y0, y1, z, d0, paint); block(xa, xb, top, y1, d0, d1, paint); z = d1; }
    block(xa, xb, y0, y1, z, z1, paint);
  };
  side(x0, x0 + t, west);
  side(x1 - t, x1, east);
  block(x0, x1, y0, y1, z0, z0 + t, paint);
  block(x0, x1, y0, y1, z1 - t, z1, paint);
}
for (const [x0, x1, z0, z1] of [[M.labX0, M.labX1, M.treZ0, M.treZ1], [HW, M.nilX1, M.nilZ0, HF]]) {
  block(x0, x1, 0, M.hallFloor - 0.01, z0, z1, PAINT.none);
  block(x0, x1, M.labTop, M.labRoof, z0, z1, PAINT.roof);
  block(x0, x1, M.labRoof, M.hallMass, z0, z1);
}
lining(M.labX0, M.labX1, M.treZ0, M.treZ1, PAINT.treasury, [[...M.treOut, M.outTop]], [[...M.treDoor, DOOR_TOP]]);
lining(HW, M.nilX1, M.nilZ0, HF, PAINT.nile, [[...M.labDoor, DOOR_TOP]], [[...M.nilOut, M.outTop]]);

export { SKY_Z };
