import { M, PT } from '../masse.js';
import { PAINT } from '../material.js';
import { block, mirrorX, slopedBlock } from './helfer.js';

const { X0, X1, Z0, Z1, xa, xb, za, zb, nl, ns, rise, REV, steps, landings, halls, mezz, hallTop, RL, GK } = PT;
const TY = M.pylonTop, PB = M.pylonBack, PF = M.pylonFront, IN = M.ptIn, END = M.ptEnd;
const N = y => PB + M.batter * y / TY, S = y => PF - M.batter * y / TY, O = y => M.towerOut - 3 * y / TY;
const HW = [9.8, 15.8], SL = [(X0 + xa) / 2, (xb + X1) / 2];
const WZ = [39.95, 41.05];
const PT_LAMPS = [];

const front = [
  ...halls.slice(1, -1).flatMap(f => HW.map(c => [c - 0.3, c + 0.3, f + 1.8, f + 3.0])),
  ...halls.flatMap(f => [[SL[0], f + (2 * nl + 1.5 * ns) * rise], [SL[1], f + (nl + ns / 2) * rise]])
    .map(([c, y]) => [c - 0.15, c + 0.15, y + 1.0, y + 2.2]).filter(h => h[3] < TY - 0.5),
];
const court = [
  ...[halls[4] + 2.7, halls[7] + 0.3].flatMap(y => HW.map(c => [c - 0.45, c + 0.45, y, y + 0.9])),
  [M.ptRoofDoor[0], M.ptRoofDoor[1], M.colRoof, M.colRoof + M.ptDoor],
];
const LOW_WIN = { 1: [27.2, 27.7, [9.76, 10.7], [9.4, 10.2], [9.0, 9.85]], [-1]: [13.9, 14.55, [12.0, 12.86], [11.6, 12.4], [11.2, 11.95]] };
const LOW_STEPS = [37.2, 38.0];

mirrorX(s => {
  const part = (x0, x1, y0, y1, z0, z1, f = {}) => {
    const out = f.o && (s > 0 ? O : y => -O(y)), faces = { zn: f.n && N, zp: f.s && S, [s > 0 ? 'xp' : 'xn']: out };
    slopedBlock(Math.min(s * x0, s * x1), Math.max(s * x0, s * x1), y0, y1, z0, z1, faces, PAINT.pylon, { [s > 0 ? 'xn' : 'xp']: f.i });
  };
  const b = (x0, x1, y0, y1, z0, z1, paint = PAINT.none) => block(s * x0, s * x1, y0, y1, z0, z1, paint);
  const wall = (u0, u1, z0, z1, f, holes) => {
    const xs = [...new Set([u0, u1, ...holes.flat().filter((v, i) => i % 4 < 2)])].sort((p, q) => p - q);
    for (let i = 0; i + 1 < xs.length; i++) {
      const a = xs[i], c = xs[i + 1];
      let y = 0;
      for (const h of holes.filter(h => h[0] <= a + 1e-6 && h[1] >= c - 1e-6).sort((p, q) => p[2] - q[2])) {
        if (h[2] > y) part(a, c, y, h[2], z0, z1, f);
        y = h[3];
      }
      if (y < TY) part(a, c, y, TY, z0, z1, f);
    }
  };
  const doors = (x0, x1, z0, z1, floors) => {
    let y = 0;
    for (const f of floors) { if (f > y) b(x0, x1, y, f, z0, z1); y = f + M.ptDoor; }
    b(x0, x1, y, TY, z0, z1);
  };

  part(M.towerIn, IN, 0, TY, PB, Z0, { n: 1, i: 1 });
  part(M.towerIn, IN, 0, TY, M.ptCorrZ, PF, { s: 1, i: 1 });
  part(M.towerIn, IN, M.ptCorrTop, GK.from, Z0, M.ptCorrZ, { i: 1 });
  part(M.towerIn, IN, GK.y + M.ptDoor, TY, Z0, M.ptCorrZ, { i: 1 });
  {
    const [x0, x1, ...open] = LOW_WIN[s], lo = Math.min(...open.flat()), hi = Math.max(...open.flat());
    wall(IN, END, PB, Z0, { n: 1 }, [...court, [x0, x1, lo, hi]]);
    const zs = [PB, ...LOW_STEPS, Z0];
    open.forEach(([y0, y1], k) => {
      const f = (a, c) => (k ? b(x0, x1, a, c, zs[k], zs[k + 1]) : part(x0, x1, a, c, zs[k], zs[k + 1], { n: 1 }));
      if (y0 > lo) f(lo, y0);
      if (y1 < hi) f(y1, hi);
    });
  }
  wall(IN, END, Z1, PF, { s: 1 }, front);
  part(END, M.towerOut, 0, TY, PB, WZ[0], { n: 1, o: 1 });
  part(END, M.towerOut, 0, TY, WZ[1], PF, { s: 1, o: 1 });
  {
    let y = 0;
    for (const m of mezz) { part(END, M.towerOut, y, m + 1.0, WZ[0], WZ[1], { o: 1 }); y = m + 2.2; }
    part(END, M.towerOut, y, TY, WZ[0], WZ[1], { o: 1 });
  }

  b(IN, M.ptCorr, 0, TY, M.ptCorrZ, Z1);
  b(IN, M.ptCorr, M.ptCorrTop, GK.from, Z0, M.ptCorrZ);
  b(IN, M.ptCorr, GK.y + M.ptDoor, TY, Z0, M.ptCorrZ);
  for (const r of GK.steps) b(r.x0, r.x1, GK.from, r.y, r.z0, r.z1);
  halls.forEach((f, k) => k && b(M.ptCorr, M.ptHall, f - M.ptSlab, f, Z0, Z1));
  b(M.ptCorr, M.ptHall, hallTop, TY, Z0, Z1);
  b(M.ptHall, X0, 0, TY, za, Z1);
  doors(M.ptHall, X0, Z0, za, halls);
  b(xa, xb, 0, M.ptTop, za, zb);
  for (const p of [...steps, ...landings]) if (p.y > 0) b(p.x0, p.x1, p.k ? p.y - M.ptSlab : 0, p.y, p.z0, p.z1);
  b(X1, M.ptOut, 0, TY, Z0, zb);
  doors(X1, M.ptOut, zb, Z1, mezz);
  b(M.ptOut, END, 0, mezz[0], Z0, Z1);
  mezz.forEach((m, k) => k && b(M.ptOut, END, m - M.ptSlab, m, Z0, Z1));
  b(M.ptOut, END, mezz[mezz.length - 1] + REV - M.ptSlab, TY, Z0, Z1);

  const zn = PB + M.batter, zs = PF - M.batter, xo = M.towerOut - 3;
  const around = (x1, y0, y1, z0, z1) => {
    b(M.towerIn, X0, y0, y1, z0, z1, PAINT.cornice);
    b(X1, x1, y0, y1, z0, z1, PAINT.cornice);
    b(X0, X1, y0, y1, z0, Z0, PAINT.cornice);
    b(X0, X1, y0, y1, Z1, z1, PAINT.cornice);
  };
  around(xo + 0.4, TY, TY + 0.4, zn - 0.4, zs + 0.4);
  around(xo + 0.9, TY + 0.4, M.ptTop, zn - 0.9, zs + 0.9);
  b(X0, X0 + 0.04, TY, M.ptTop, Z0, Z1);
  b(X1 - 0.04, X1, TY, M.ptTop, Z0, Z1);
  b(X0, X1, TY, M.ptTop, Z0, Z0 + 0.04);
  b(X0, X1, TY, M.ptTop, Z1 - 0.04, Z1);
  const P0 = M.ptTop, P1 = M.ptTop + 1.0;
  b(X0 - 0.3, X1 + 0.3, P0, P1, Z0 - 0.3, Z0);
  b(X1, X1 + 0.3, P0, P1, Z0, Z1);
  b(X0 - 0.3, X1 + 0.3, P0, P1, Z1, Z1 + 0.3);
  b(X0 - 0.3, X0, P0, P1, za, Z1);

  for (const l of landings.filter(l => l.corner === 1 && l.k % 2 === 0 && l !== RL)) {
    const z = (l.z0 + l.z1) / 2, ly = l.y + 1.5;
    b(X1 - 0.3, X1, ly - 0.12, ly, z - 0.2, z + 0.2);
    PT_LAMPS.push({ x: s * (X1 - 0.15), y: ly, z, rot: -s * Math.PI / 2, box: [Math.min(s * X0, s * X1), Math.max(s * X0, s * X1), ly - 2.6, ly + 2.4, Z0, Z1] });
  }
});

export { PT_LAMPS };
