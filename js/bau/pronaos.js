import { M, PF } from '../masse.js';
import { PAINT } from '../material.js';
import { CELL, block, mirrorX, slopedBlock } from './helfer.js';
import { PRO_X, PRO_Z } from './saeulen.js';

const SCREENS = [[PRO_X[0], PRO_X[1]], [PRO_X[1], PRO_X[2]], [PRO_X[2], M.screenEnd]];
const DH = M.doorHalf, JT = M.jambTop;
const outAt = y => M.proOut - M.proBatter * y / M.proRoof;
const ALL = { xn: true, xp: true, yp: true, yn: true, zn: true, zp: true };
function battered(s, xIn, za, zb) {
  const faces = s > 0 ? { xp: outAt } : { xn: y => -outAt(y) };
  for (let k = Math.floor(za / CELL); k * CELL < zb; k++) {
    const c = Math.max(za, k * CELL), d = Math.min(zb, (k + 1) * CELL);
    if (d - c > 1e-4) slopedBlock(Math.min(s * xIn, s * M.proOut), Math.max(s * xIn, s * M.proOut), 0, M.proRoof, c, d, faces, PAINT.wall, ALL);
  }
}
mirrorX(s => {
  block(s * 3.0, s * M.screenEnd, 0, M.proFloor, PF - 1.4, PF + 1.4, PAINT.none);
  for (const [a, b] of SCREENS) {
    block(s * a, s * b, M.proFloor, M.screenTop, PF - 0.4, PF + 0.4);
    block(s * a, s * b, M.screenTop, M.screenTop + 0.3, PF - 0.55, PF + 0.55, PAINT.cornice);
  }
  block(s * DH, s * M.jambOut, 0, JT, PF - 0.1, PF + 1.6);
  block(s * M.doorRebate, s * 4.15, 0, JT, PF - 1.6, PF - 0.1);
  const xs = (a, b) => [Math.min(s * a, s * b), Math.max(s * a, s * b)];
  const lerp = (a, b, y0, y1) => y => a + (b - a) * (y - y0) / (y1 - y0);
  const inner = (a, b, y0, y1) => (s > 0 ? { xn: lerp(a, b, y0, y1) } : { xp: y => -lerp(a, b, y0, y1)(y) });
  slopedBlock(...xs(DH - 0.45, DH), 6.3, 7.0, PF - 0.1, PF + 1.6, inner(DH, DH - 0.45, 6.3, 7.0), PAINT.wall, ALL);
  block(s * (DH - 0.45), s * DH, 7.0, JT, PF - 0.1, PF + 1.6);
  block(s * (DH - 0.5), s * 4.15, JT, JT + 0.12, PF - 1.65, PF + 1.65, PAINT.cornice);
  const C0 = JT + 0.12, C1 = JT + 0.58;
  slopedBlock(...xs(DH - 0.85, 4.15), C0, C1, PF - 1.95, PF + 1.95, { ...inner(DH - 0.5, DH - 0.85, C0, C1),
    zp: lerp(PF + 1.65, PF + 1.95, C0, C1), zn: lerp(PF - 1.65, PF - 1.95, C0, C1) }, PAINT.cornice, ALL);
  block(s * (DH - 0.85), s * 4.15, C1, JT + 0.7, PF - 1.95, PF + 1.95, PAINT.cornice);
  battered(s, M.screenEnd, PF - 0.6, PF + 0.7);
  battered(s, M.proHalf, M.hallFront, PF - 0.6);
});
const TW = outAt(M.proTorus);
block(-M.screenEnd, M.screenEnd, M.proAbacus, M.proTorus, PF - 0.6, PF + 0.6, PAINT.archHigh);
block(-TW - 0.2, TW + 0.2, M.proTorus, M.proTorus + 0.3, PF - 0.6, PF + 1.0, PAINT.cornice);
block(-TW - 0.5, TW + 0.5, M.proTorus + 0.3, M.proCrest, PF - 0.6, PF + 1.5, PAINT.cornice);
mirrorX(s => {
  const f = d => y => s * (outAt(y) + d);
  slopedBlock(Math.min(s * (M.proOut - 0.15), s * (M.proOut + 0.15)), Math.max(s * (M.proOut - 0.15), s * (M.proOut + 0.15)),
    0, M.proTorus, PF + 0.55, PF + 0.85, s > 0 ? { xn: f(-0.15), xp: f(0.15) } : { xn: f(0.15), xp: f(-0.15) },
    PAINT.cornice, { yp: true, zn: true, zp: true });
});
block(-3.0, 3.0, 0, 0.2, PF + 1.6, PF + 3.2, PAINT.none);
block(-3.0, 3.0, 0.2, 0.4, PF + 1.6, PF + 2.4, PAINT.none);
block(-DH, DH, 0, M.proFloor, PF - 0.6, PF + 1.6, PAINT.none);
const JAMB_COLLIDERS = [-1, 1].flatMap(s => [[s * 2.8, PF + 1.1, 0.5], [s * 3.45, PF + 1.1, 0.5]]);

for (const z of PRO_Z.slice(1)) block(-M.proHalf, M.proHalf, M.proAbacus, M.proArch, z - 1.0, z + 1.0, PAINT.archHigh);
mirrorX(s => { for (const x of PRO_X) block(s * x - 1.0, s * x + 1.0, M.proAbacus, M.proArch, M.proBack, PF - 0.4, PAINT.archHigh); });
block(-M.proHalf, M.proHalf, M.proArch, M.proRoof, M.proBack, PF - 0.6, PAINT.ceiling);

const HB = M.hallBack, HF = M.hallFront, HH = M.hallHalf, HW = M.hallWall, XH = M.houseHalf;
mirrorX(s => block(s * M.innerDoor, s * M.proHalf, 0, M.proRoof, HF, M.proBack));
block(-M.innerDoor, M.innerDoor, 7.2, M.proRoof, HF, M.proBack);
block(-M.innerDoor, M.innerDoor, M.proFloor, 0.8, HF, M.proBack, PAINT.none);

export { HB, HF, HH, HW, JAMB_COLLIDERS, SCREENS, XH };
