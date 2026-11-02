import { M, WS } from '../masse.js';
import { PAINT } from '../material.js';
import { block } from './helfer.js';
import { HW, XH } from './pronaos.js';

const { X0, X1, Z0, Z1, xe, xw, zn, zs, HEAD, MID, runs, steps, landings, slotZ } = WS;
const TOP = M.roofY, T = 0.04, EW = X1 + 0.5;
const stacked = s => s.x0 > xe - 1e-6 && s.z1 < M.stairZ0 + 1e-6;
for (const s of [...landings, ...steps]) {
  const upper = stacked(s) && s.y > MID;
  block(s.x0, s.x1, upper ? MID : 0, s.y, s.z0, s.z1, PAINT.none);
  if (s.y + HEAD < TOP) block(s.x0, s.x1, s.y + HEAD, stacked(s) ? MID : TOP, s.z0, s.z1, PAINT.roof);
}
block(xw, xe, 0, TOP, zn, zs, PAINT.westStair);

block(-XH, EW, 0, TOP, M.midFront, Z0);
block(-XH, -HW, 0, TOP, Z1, M.treZ0);
block(X1, EW, 0, TOP, Z0, M.stairFoot);
block(X1, EW, 0, TOP, M.stairZ0, Z1);
const r2 = runs[2], yAt = z => r2.y0 + (z - zn) * (r2.y1 - r2.y0) / (zs - zn);
const SLITS = [0.2, 0.5, 0.8].map(f => zn + f * (zs - zn)), SW = 0.1;
const outer = (za, zb, y0 = 0, y1 = TOP) => {
  block(-XH, X0, y0, y1, za, zb);
  block(X0, X0 + T, Math.max(y0, runs[1].y1), y1, za, zb, PAINT.westStair);
};
let z = Z0;
for (const c of SLITS) {
  outer(z, c - SW);
  outer(c - SW, c + SW, 0, yAt(c) + 1.3);
  outer(c - SW, c + SW, yAt(c) + 2.4, TOP);
  z = c + SW;
}
outer(z, Z1);
block(X0, X1, runs[0].y1, TOP, Z0, Z0 + T, PAINT.westStair);
block(X0, X1, r2.y1, TOP, Z1 - T, Z1, PAINT.westStair);
block(X1 - T, X1, M.offFloor, TOP, Z0, M.stairFoot, PAINT.westStair);
block(X1 - T, X1, M.offFloor + HEAD + 0.01, TOP, M.stairFoot, M.stairZ0, PAINT.westStair);
block(X1 - T, X1, runs[3].y1, TOP, M.stairZ0, Z1, PAINT.westStair);

{
  const P = TOP + 1.0;
  block(-XH, EW, TOP, P, M.midFront, M.midFront + 0.4, PAINT.none);
  block(-XH, -XH + 0.4, TOP, P, M.midFront + 0.4, Z1 + 0.4, PAINT.none);
  block(-XH + 0.4, -HW, TOP, P, Z1, Z1 + 0.4, PAINT.none);
  block(-HW, EW, TOP, P, M.midFront + 0.4, M.offFront, PAINT.none);
  block(xe - 0.3, xe, TOP, P, zn, slotZ + 0.3, PAINT.none);
  block(xe, X1, TOP, P, slotZ, slotZ + 0.3, PAINT.none);
}

const STAIR_LAMPS = [];
for (const [l, wall, rot, y0, y1] of [[landings[1], Z0, 0, -1, MID], [landings[3], Z1, Math.PI, -1, TOP + 1]]) {
  const x = (l.x0 + l.x1) / 2, y = l.y + 1.5, d = rot ? -0.3 : 0.3;
  block(x - 0.2, x + 0.2, y - 0.12, y, wall, wall + d, PAINT.none);
  STAIR_LAMPS.push({ x, y, z: wall + d / 2, rot, box: [X0, EW + 1, y0, y1, Z0, Z1] });
}

export { STAIR_LAMPS };
