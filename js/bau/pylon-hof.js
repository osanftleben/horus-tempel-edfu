import { COL_SOUTH, COL_X, M, PF, PT } from '../masse.js';
import { PAINT } from '../material.js';
import { block, mirrorX, slopedBlock } from './helfer.js';

const { Z0, Z1, GK } = PT, GT = M.gateBlockTop, GD = GK.y + M.ptDoor;
mirrorX(s => {
  const R0 = M.gateDoorZ - M.gateLeaf - 0.1, GR = M.gateHalf + M.gateRecess;
  const xs = [Math.min(s * M.gateHalf, s * M.towerIn), Math.max(s * M.gateHalf, s * M.towerIn)], pass = s > 0 ? 'xn' : 'xp';
  slopedBlock(...xs, 0, M.gateBlockTop, 36, M.ptZ0, {}, PAINT.pylon, { [pass]: true, zn: true });
  slopedBlock(...xs, 0, GK.from, M.ptCorrZ, R0, {}, PAINT.pylon, { [pass]: true, zp: true });
  block(...xs, M.ptCorrTop, GK.from, M.ptZ0, M.ptCorrZ, PAINT.pylon);
  block(s * M.gateHalf, s * M.towerIn, 0, GT, M.gateDoorZ, 45, PAINT.pylon);
  block(s * GR, s * M.towerIn, 0, GK.from, R0, Z1, PAINT.pylon);
  block(s * GR, s * M.towerIn, 0, GT, Z1, M.gateDoorZ, PAINT.pylon);
  block(s * M.gateHalf, s * GR, M.gateTop, GK.from, R0, Z1, PAINT.pylon);
  block(s * M.gateHalf, s * GR, M.gateTop, GT, Z1, M.gateDoorZ, PAINT.pylon);
  const k = (x0, x1, y0, y1, z0, z1, paint = PAINT.none) => block(s * x0, s * x1, y0, y1, z0, z1, paint);
  k(GK.half, M.towerIn, GK.from, GK.y, Z0, Z1);
  k(GK.half, M.towerIn, GK.y, GT, M.ptCorrZ, Z1);
  if (GD < GT) k(GK.half, M.towerIn, GD, GT, Z0, M.ptCorrZ);
  k(GK.half - 0.04, GK.half, GT, GT + 1.6, Z0, Z1);
});
block(-M.gateHalf, M.gateHalf, M.gateTop, GT, 36, Z0, PAINT.pylon);
block(-M.gateHalf, M.gateHalf, M.gateTop, GT, Z1, 45, PAINT.pylon);
block(-M.gateHalf, M.gateHalf, M.gateTop, GK.from, Z0, Z1, PAINT.pylon);
block(-GK.half, GK.half, GK.from, GK.y, Z0, Z1, PAINT.none);
block(-GK.half, GK.half, GK.y, GT + 1.6, Z0, Z0 + 0.04, PAINT.none);
block(-GK.half, GK.half, GK.y, GT + 1.6, Z1 - 0.04, Z1, PAINT.none);
for (const [y0, y1, d] of [[GT, GT + 0.4, 0.6], [GT + 0.4, GT + 1.6, 1.0]]) {
  block(-M.towerIn, M.towerIn, y0, y1, Z1, 45.8 - 1.0 + d, PAINT.cornice);
  for (const s of [1, -1]) block(s * GK.half, s * M.towerIn, y0, y1, Z0, Z1, PAINT.cornice);
}
const GATE_FRAME = { half: 4.75, top: 17.3, front: 35.4 };
const GATE_CORNICE = [[7.05, 17.3, 17.7, 35.2], [7.2, 17.7, 18.7, 35.05], [7.35, 18.7, 19.7, 34.85], [7.5, 19.7, 20.7, 34.6], [7.7, 20.7, GT + 1.6, 34.3]];
for (const s of [1, -1]) block(s * M.gateHalf, s * GATE_FRAME.half, 0, GATE_FRAME.top, GATE_FRAME.front, 36, PAINT.pylon);
block(-M.gateHalf, M.gateHalf, M.gateTop, GATE_FRAME.top, GATE_FRAME.front, 36, PAINT.pylon);
for (const [h, y0, y1, zf] of GATE_CORNICE) {
  block(-M.towerIn, M.towerIn, y0, y1, zf, Z0, PAINT.cornice);
  for (const s of [1, -1]) block(s * M.towerIn, s * h, y0, y1, zf, 36.4, PAINT.cornice);
}

const EN = M.templeNorth, ET = M.encl - M.courtHalf;
mirrorX(s => {
  block(s * M.courtHalf, s * M.encl, 0, M.enclTop, EN - ET, 37);
  block(s * (M.courtHalf - 0.3), s * (M.encl + 0.3), M.enclTop, M.enclTop + 0.6, EN - ET - 0.3, 34.4, PAINT.cornice);
  block(s * M.ptRoofDoor[1], s * (M.encl + 0.3), M.enclTop, M.enclTop + 0.6, 34.4, 36.5, PAINT.cornice);
  block(s * M.proOut, s * M.courtHalf, 4.5, M.enclTop, PF - 0.6, PF + 0.5);
});
block(-M.encl, M.encl, 0, M.enclTop, EN - ET, EN);
block(-M.encl - 0.3, M.encl + 0.3, M.enclTop, M.enclTop + 0.6, EN - ET - 0.3, EN + 0.3, PAINT.cornice);

mirrorX(s => {
  block(s * (COL_X - 0.7), s * (COL_X + 0.7), M.colAbacus, M.colArch, M.courtNorth, COL_SOUTH + 0.7, PAINT.archLow);
  block(s * (COL_X - 0.7), s * M.courtHalf, M.colArch, M.colRoof, M.courtNorth, COL_SOUTH - 0.7, PAINT.roof);
  block(s * 3.0, s * (COL_X + 0.7), M.colAbacus, M.colArch, COL_SOUTH - 0.7, COL_SOUTH + 0.7, PAINT.archLow);
  block(s * 3.0, s * M.courtHalf, M.colArch, M.colRoof, COL_SOUTH - 0.7, 36.5, PAINT.roof);
  block(s * 3.0, s * 3.2, 0, M.colArch, COL_SOUTH + 0.7, 36, PAINT.wall);
});

export { EN, ET };
