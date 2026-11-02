import * as THREE from 'three';

const M = {
  pylonFront: 46, pylonBack: 35, pylonTop: 32.0, towerIn: 6, towerOut: 34.9, batter: 1.8,
  gateHalf: 2.5, gateTop: 14, gateBlockTop: 20.1,
  gateDoorZ: 43.0, gateLeaf: 2.65, gateRecess: 0.3,
  courtHalf: 21.5, courtNorth: -14.5, encl: 23.6, enclTop: 9.9, templeNorth: -90.3,
  colTop: 7.9, colAbacus: 8.5, colArch: 9.3, colRoof: 9.9,
  proFloor: 0.6, proHalf: 17.3, proOut: 20.3, proFront: -15, proBack: -29.4,
  proColTop: 12.2, proAbacus: 12.9, proArch: 14.3, proRoof: 14.9, screenTop: 6.0,
  proTorus: 14.0, proCrest: 15.8, proBatter: 1.4,
  doorHalf: 2.3, doorRebate: 2.65, jambOut: 3.95, jambTop: 8.0,
  screenEnd: 16.3,
  houseHalf: 16.7, houseBack: -85.4,
  hallFloor: 1.0, hallHalf: 10.25, hallWall: 11.75, hallFront: -32.7, hallBack: -46,
  hallColTop: 9.4, hallAbacus: 10.0, hallArch: 11.2, hallRoof: 12.0, hallMass: 12.4,
  innerDoor: 1.6,
  labX0: -14.2, labX1: -11.75, labZ0: -38.1, labTop: 7.5, labRoof: 8.3,
  offFloor: 1.4, offHalf: 10.25, offFront: -48.3, offBack: -53.0, offTop: 10.4, offRoof: 11.2,
  midFloor: 1.8, midHalf: 14.7, midFront: -55.3, midBack: -59.6, midTop: 10.1, midRoof: 10.9,
  innerMass: 12.4, sanctBack: -62,
  sanFloor: 2.2, sanHalf: 2.65, sanFront: -62, sanBack: -72, sanTop: 9.9, sanRoof: 10.7,
  stairX0: 14.2, stairX1: 16.2, stairZ0: -49.6, stairZ1: -36.0, stairSteps: 52, roofY: 12.4,
};
Object.assign(M, {
  corrIn: 4.6, corrOut: 6.8, corrWall: 8.65,
  corrBack0: -74.05, corrBack1: -76.15, chapBack0: -76.95, chapBack1: -83.4,
  corrTop: 9.0, chapTop: 7.6, backRoof: 10.7,
});
Object.assign(M, {
  midEnd: 7.8,
  wabBack: -66.6, wabFloor: 2.7, wabTop: 7.6, wabCols: [10.4, 12.95],
  wabStepZ: -60.5, wabSteps: 5,
});
Object.assign(M, {
  niloX0: 20.3, niloTop: -62.0, niloN1: 20,
  niloZ: [-69.4, -68.2], niloN2: 25,
  niloTread: 0.3, niloRise: 0.2, niloHead: 2.6, niloOpen: 2.0,
  wellX: 31.0, wellR: 1.5, niloWater: -9.4,
});
M.niloLand = M.niloTop - M.niloN1 * M.niloTread;
M.niloEnd = M.courtHalf + M.niloN2 * M.niloTread;
M.niloFloor = -(M.niloN1 + M.niloN2) * M.niloRise;
Object.assign(M, {
  mamX: -33.4, mamZ: 84.0, mamL: 23.15, mamW: 13.54, mamFloor: 0.4,
  mamCol: 0.975,
  mamNaos: [3.955, 5.635, 8.721, 10.535, 18.495, 20.228],
  mamNaosHalf: 3.6, mamProHalf: 2.18, mamSanHalf: 1.71,
  mamDoorHalf: 1.137, mamDoorTop: 4.7, mamEntryHalf: 1.1,
  mamPostTop: 3.4, mamCeil: 5.7, mamRecess: 6.66,
  mamScreen: 2.27, mamColTop: 4.66, mamBesTop: 6.2, mamArchTop: 6.9, mamTop: 7.65,
});
Object.assign(M, {
  chamWall: 4.3, chamX0: 4.8, chamX1: 7.45, chamOut: 7.95,
  chamZ0: -18.6, chamZ1: M.proFront - 0.4, chamBack: -19.1,
  chamTop: 5.2, chamRoof: 5.6, chamDoor: [-17.95, -16.55], chamDoorTop: 3.2,
});
const chamX = (s, a, b) => (s > 0 ? { x0: a, x1: b } : { x0: -b, x1: -a });
const CHAMBERS = [[-1, 'Haus des Morgens', 'Tür zum Haus des Morgens'], [1, 'Bibliothek', 'Tür zur Bibliothek']];
M.stairFoot = M.stairZ0 - 2.0;
M.labDoor = [M.hallFront - 5.1, M.hallFront - 3.3];
M.stairSlope = (M.roofY - M.offFloor) / (M.stairZ1 - M.stairZ0);
Object.assign(M, {
  treZ0: M.hallBack + 0.6, treZ1: M.labZ0 - 0.5,
  treDoor: [M.hallFront - 9.15, M.hallFront - 7.35],
  treOut: [-44.7, -43.3],
  nilX1: M.hallWall + 2.0, nilZ0: M.labZ0,
  nilOut: [-34.8, -33.4],
  doorTop: M.hallFloor + 3.2,
  outTop: M.hallFloor + 3.2, outSteps: 5,
});
const OUT_DOORS = [[M.labX0, -M.houseHalf, M.treOut], [M.nilX1, M.houseHalf, M.nilOut]];
const TEX_M = 4;
const f3 = n => Number(n).toFixed(3);

Object.assign(M, { wsX0: -16.2, wsX1: -11.85, wsZ0: -54.8, wsZ1: M.treZ0 - 0.5, wsW: 1.3 });
const WS = (() => {
  const { wsX0: X0, wsX1: X1, wsZ0: Z0, wsZ1: Z1, wsW: W } = M;
  const xe = X1 - W, xw = X0 + W, zn = Z0 + W, zs = Z1 - W;
  const HEAD = 3.4;
  const MID = 7.0;
  const rect = (axis, [c0, c1], t0, t1) => (axis === 'z'
    ? { x0: c0, x1: c1, z0: Math.min(t0, t1), z1: Math.max(t0, t1) }
    : { x0: Math.min(t0, t1), x1: Math.max(t0, t1), z0: c0, z1: c1 });
  const runs = [
    { axis: 'z', c: [xe, X1], a: M.stairFoot, b: zn, n: 6, levels: [0] },
    { axis: 'x', c: [Z0, zn], a: xe, b: xw, n: 6, levels: [0] },
    { axis: 'z', c: [X0, xw], a: zn, b: zs, n: 21, levels: [0, 2] },
    { axis: 'x', c: [zs, Z1], a: xw, b: xe, n: 6, levels: [2] },
    { axis: 'z', c: [xe, X1], a: zs, b: zn, n: 21, levels: [2] },
  ];
  const rise = (M.roofY - M.offFloor) / runs.reduce((s, r) => s + r.n, 0);
  let y = M.offFloor, s = 0;
  for (const r of runs) { r.y0 = y; r.y1 = y += r.n * rise; r.s = s; s += Math.abs(r.b - r.a) + W; }
  const top = runs[4];
  const OUT = 5, exitZ = top.a + (top.b - top.a) * (top.n - OUT) / top.n, exitSplit = top.y0 + (top.n - 1.5) * rise;
  const steps = runs.flatMap((r, ri) => Array.from({ length: r.n }, (_, i) => ({
    ...rect(r.axis, r.c, r.a + (r.b - r.a) * i / r.n, r.a + (r.b - r.a) * (i + 1) / r.n),
    y: r.y0 + (i + 1) * rise, levels: ri === 4 && i >= r.n - OUT ? [2, 1] : r.levels })));
  const landings = [
    { x0: xe, x1: X1, z0: M.stairFoot, z1: M.stairZ0, y: M.offFloor, levels: [0] },
    { x0: xe, x1: X1, z0: Z0, z1: zn, y: runs[0].y1, levels: [0] },
    { x0: X0, x1: xw, z0: Z0, z1: zn, y: runs[1].y1, levels: [0, 2] },
    { x0: X0, x1: xw, z0: zs, z1: Z1, y: runs[2].y1, levels: [0, 2] },
    { x0: xe, x1: X1, z0: zs, z1: Z1, y: runs[3].y1, levels: [2] },
    { x0: xe, x1: X1, z0: Z0, z1: zn, y: top.y1, levels: [2, 1] },
  ];
  const open = Array.from({ length: top.n }, (_, i) => top.y0 + (i + 1) * rise).findIndex(h => h + HEAD > M.roofY - 1e-6);
  const slotZ = top.a + (top.b - top.a) * open / top.n;
  return { X0, X1, Z0, Z1, W, xe, xw, zn, zs, HEAD, MID, runs, rise, steps, landings, exitZ, exitSplit, slotZ };
})();
const WS_GLSL = (() => {
  const run = i => {
    const r = WS.runs[i], t = r.axis === 'z' ? 'p.z' : 'p.x', k = (r.y1 - r.y0) / (r.b - r.a);
    return `vec2(clamp(${f3(r.y0)} + (${t} - ${f3(r.a)}) * ${f3(k)}, ${f3(r.y0)}, ${f3(r.y1)}), ${f3(r.s)} + (${t} - ${f3(r.a)}) * ${Math.sign(r.b - r.a).toFixed(1)})`;
  };
  return `
  vec2 wsFloor(vec3 p) {
    vec2 r = ${run(3)};
    if (p.x > ${f3(WS.xe - 0.1)}) r = p.y < ${f3(WS.MID)} ? ${run(0)} : ${run(4)};
    else if (p.x < ${f3(WS.xw + 0.1)}) r = ${run(2)};
    else if (p.z < ${f3(WS.zn + 0.1)}) r = ${run(1)};
    return r;
  }`;
})();

const UP = { x0: 7.6, x1: 9.6, z0: M.hallFront - 4.6, z1: M.hallFront, n: 14 };
const PF = M.proFront, HFz = M.hallFront, RIM = M.proOut - M.proBatter - 0.4;
const CR = { x0: UP.x0, x1: UP.x1, z1: PF - 0.6, n: 5, tread: 0.3, rise: (M.proCrest - M.proRoof) / 5 };

const CB0 = M.chapBack0, CB1 = M.chapBack1, CWL = M.corrWall, CO = M.corrOut, CMH = M.midHalf, SBK = M.sanctBack;
const CHAPELS = [
  { name: 'Kapelle des Min', x0: -CMH, x1: -CWL, z0: M.midBack, z1: M.midFront,
    door: { dir: 'x', c: (M.midFront + M.midBack) / 2, w0: -CWL, w1: -M.midEnd }, shrine: [1, 0] },
  { name: 'Kammer der Gewänder', x0: -CMH, x1: -CWL, z0: -66.6, z1: SBK, door: { dir: 'x', c: -64.3, w0: -CWL, w1: -CO }, shrine: [1, 0] },
  { name: 'Kapelle des Götterthrons', x0: -CMH, x1: -CWL, z0: -71.8, z1: -67.2, door: { dir: 'x', c: -69.5, w0: -CWL, w1: -CO }, shrine: [1, 0] },
  { name: 'Kapelle des Osiris', x0: -CMH, x1: -CWL, z0: CB0, z1: -72.4, door: { dir: 'x', c: -74.7, w0: -CWL, w1: -CO }, shrine: [1, 0] },
  { name: 'Kammer des Westens', x0: -CMH, x1: -9.0, z0: CB1, z1: -77.6, door: { dir: 'x', c: -80.5, w0: -9.0, w1: -8.4 }, shrine: [1, 0] },
  { name: 'Grab des Osiris', x0: -8.4, x1: -2.9, z0: CB1, z1: CB0, door: { dir: 'z', c: -5.2, w0: CB0, w1: M.corrBack1 }, shrine: [0, 1] },
  { name: 'Kapelle des Siegers', x0: -2.3, x1: 2.3, z0: CB1, z1: CB0, door: { dir: 'z', c: 0, w0: CB0, w1: M.corrBack1 }, shrine: [0, 1] },
  { name: 'Kapelle des Chons', x0: 2.9, x1: 8.4, z0: CB1, z1: CB0, door: { dir: 'z', c: 5.2, w0: CB0, w1: M.corrBack1 }, shrine: [0, 1] },
  { name: 'Kapelle der Hathor', x0: 9.0, x1: CMH, z0: CB1, z1: -77.6, door: { dir: 'x', c: -80.5, w0: 8.4, w1: 9.0 }, shrine: [-1, 0] },
  { name: 'Kapelle des Re-Throns', x0: CWL, x1: CMH, z0: CB0, z1: -72.4, door: { dir: 'x', c: -74.7, w0: CO, w1: CWL }, shrine: [-1, 0] },
  { name: 'Kapelle der ausgebreiteten Flügel', x0: CWL, x1: CMH, z0: -71.8, z1: -67.2, door: { dir: 'x', c: -69.5, w0: CO, w1: CWL }, shrine: [-1, 0] },
];
const CHAPEL_DOOR = 0.7;
const WAB_DOOR = [(M.midFront + M.midBack) / 2 - 0.8, (M.midFront + M.midBack) / 2 + 0.8];
const WAB_TREAD = 0.3;
function chapelDoorHole({ dir, c, w0, w1 }, reach = 0) {
  const a = Math.min(w0, w1) - reach, b = Math.max(w0, w1) + reach;
  return dir === 'x' ? { x0: a, x1: b, z0: c - CHAPEL_DOOR, z1: c + CHAPEL_DOOR }
    : { x0: c - CHAPEL_DOOR, x1: c + CHAPEL_DOOR, z0: a, z1: b };
}

const mamRect = (u0, u1, v0, v1) => ({ x0: M.mamX - u1, x1: M.mamX - u0, z0: M.mamZ + v0, z1: M.mamZ + v1 });
const MAM = { ...mamRect(0, M.mamL, -M.mamW / 2, M.mamW / 2), inner: M.mamW / 2 - M.mamCol };

const COL_X = 17.8, COL_SOUTH = 32.1;
Object.assign(M, {
  ptZ0: 38.8, ptZ1: 42.2,
  ptIn: 6.6, ptCorr: 8.2, ptHall: 17.4,
  ptX0: 18.5, ptX1: 22.5, ptOut: 24.1, ptEnd: 28.6,
  ptW: 1.0, ptRevs: 8, ptTop: M.pylonTop + 1.5,
  ptCorrZ: 40.0, ptCorrTop: 3.0, ptDoor: 2.2, ptSlab: 0.6,
  ptRoofDoor: [21.65, 22.35],
  ptGateHalf: 4.0, ptGateFloor: 18.1,
});
const PT = (() => {
  const { ptX0: X0, ptX1: X1, ptZ0: Z0, ptZ1: Z1, ptW: W, ptRevs: N } = M;
  const xa = X0 + W, xb = X1 - W, za = Z0 + W, zb = Z1 - W;
  const nl = Math.round((xb - xa) / 0.27), ns = Math.round((zb - za) / 0.27);
  const rise = M.ptTop / (N * 2 * (nl + ns)), REV = 2 * (nl + ns) * rise;
  const rect = (axis, [c0, c1], t0, t1) => (axis === 'z'
    ? { x0: c0, x1: c1, z0: Math.min(t0, t1), z1: Math.max(t0, t1) }
    : { x0: Math.min(t0, t1), x1: Math.max(t0, t1), z0: c0, z1: c1 });
  const runs = [['x', [Z0, za], xa, xb, nl], ['z', [xb, X1], za, zb, ns], ['x', [zb, Z1], xb, xa, nl], ['z', [X0, xa], zb, za, ns]];
  const corners = [[X0, xa, Z0, za], [xb, X1, Z0, za], [xb, X1, zb, Z1], [X0, xa, zb, Z1]];
  const steps = [], landings = [];
  for (let k = 0; k <= N; k++) {
    let y = k * REV;
    landings.push({ x0: X0, x1: xa, z0: Z0, z1: za, y, k, corner: 0 });
    if (k === N) break;
    runs.forEach(([axis, c, a, b, n], r) => {
      for (let i = 0; i < n; i++) steps.push({ ...rect(axis, c, a + (b - a) * i / n, a + (b - a) * (i + 1) / n), y: y + (i + 1) * rise, k });
      y += n * rise;
      if (r < 3) { const [x0, x1, z0, z1] = corners[r + 1]; landings.push({ x0, x1, z0, z1, y, k, corner: r + 1 }); }
    });
  }
  const halls = Array.from({ length: N }, (_, k) => k * REV);
  const mezz = Array.from({ length: N - 1 }, (_, k) => k * REV + (nl + ns) * rise);
  const hallTop = M.pylonTop - 0.4;
  const RD = M.ptRoofDoor, RL = landings.find(l => l.corner === 1 && Math.abs(l.y - M.colRoof) < 0.5);
  const GK = { half: M.ptGateHalf, y: M.ptGateFloor, from: halls.filter(h => h < M.ptGateFloor).at(-1), x: 7.9, n: 8, tread: 0.27 };
  GK.steps = Array.from({ length: GK.n }, (_, i) => ({ x0: GK.x - (i + 1) * GK.tread, x1: GK.x - i * GK.tread, z0: Z0, z1: M.ptCorrZ,
    y: GK.from + (i + 1) * (GK.y - GK.from) / GK.n }));
  const OUT = 3, split = M.ptTop - 1.5 * rise, top = steps.length - OUT;
  const grow = (r, d = 0.02) => ({ ...r, x0: r.x0 - d, x1: r.x1 + d, z0: r.z0 - d, z1: r.z1 + d });
  const east = [
    ...steps.map((s, i) => ({ ...grow(s), y: s.y, levels: i >= top ? [0, 1] : [0] })),
    ...landings.map(l => ({ ...grow(l), y: l.y, levels: l.k === N || l === RL ? [0, 1] : [0] })),
    { x0: 1.6, x1: M.ptCorr + 0.02, z0: Z0, z1: M.ptCorrZ, y: 0 },
    ...halls.flatMap(y => [{ x0: M.ptCorr, x1: M.ptHall, z0: Z0, z1: Z1, y }, { x0: M.ptHall - 0.02, x1: X0 + 0.02, z0: Z0, z1: za, y }]),
    ...mezz.flatMap(y => [{ x0: X1 - 0.02, x1: M.ptOut + 0.02, z0: zb, z1: Z1, y }, { x0: M.ptOut, x1: M.ptEnd, z0: Z0, z1: Z1, y }]),
    { x0: RD[0], x1: RD[1], z0: 34.4, z1: Z0 + 0.02, y: M.colRoof, levels: [0, 1] },
    { x0: GK.x - 0.02, x1: M.ptCorr + 0.02, z0: Z0, z1: M.ptCorrZ, y: GK.from },
    ...GK.steps.map(r => ({ ...grow(r), y: r.y })),
    { x0: -0.02, x1: GK.x - GK.n * GK.tread + 0.02, z0: Z0, z1: Z1, y: GK.y },
  ];
  const mirror = r => ({ ...r, x0: -r.x1, x1: -r.x0 });
  const floors = [...east, ...east.map(mirror)];
  const XO = M.towerOut - 3 + 0.9, ZN = M.pylonBack + M.batter - 0.9, ZS = M.pylonFront - M.batter + 0.9;
  const TOPB = [M.ptTop - 0.5, M.ptTop + 0.5];
  const towerRooms = turm => [
    { name: `Treppe im ${turm}`, x0: X0, x1: xa, z0: Z0, z1: Z1, stacked: true, levels: [0, 1], split },
    { name: `Treppe im ${turm}`, x0: X0, x1: X1, z0: Z0, z1: za, stacked: true },
    { name: `Treppe im ${turm}`, x0: xb, x1: X1, z0: Z0, z1: Z1, stacked: true },
    { name: `Treppe im ${turm}`, x0: X0, x1: X1, z0: zb, z1: Z1, stacked: true },
    { name: `Gang im ${turm}`, x0: 1.6, x1: M.ptCorr + 0.8, z0: Z0, z1: M.ptCorrZ, stacked: true },
    { name: `Gang im ${turm}`, x0: RD[0] - 0.3, x1: RD[1] + 0.3, z0: 34.0, z1: Z0 + 0.8, stacked: true, levels: [0, 1], split: (RL.y + M.colRoof) / 2,
      band: [RL.y - 0.6, M.colRoof + 0.6] },
    { name: `Kammer im ${turm}`, x0: M.ptCorr, x1: M.ptHall, z0: Z0, z1: Z1, stacked: true },
    { name: `Kammer im ${turm}`, x0: M.ptHall - 0.8, x1: X0 + 0.8, z0: Z0, z1: za, stacked: true },
    { name: `Kammer im ${turm}`, x0: X1 - 0.8, x1: M.ptOut + 0.8, z0: zb, z1: Z1, stacked: true },
    { name: `Kammer im ${turm}`, x0: M.ptOut, x1: M.ptEnd, z0: Z0, z1: Z1, stacked: true },
    { name: `Auf dem ${turm}`, x0: X0 - 2.0, x1: xa, z0: Z0, z1: za, floor: M.ptTop, level: 1, band: TOPB },
    { name: `Auf dem ${turm}`, x0: M.towerIn + 0.4, x1: X0 - 0.3, z0: ZN + 0.4, z1: ZS - 0.4, floor: M.ptTop, level: 1, band: TOPB },
    { name: `Auf dem ${turm}`, x0: X1 + 0.3, x1: XO - 0.6, z0: ZN + 0.4, z1: ZS - 0.4, floor: M.ptTop, level: 1, band: TOPB },
    { name: `Auf dem ${turm}`, x0: M.towerIn + 0.4, x1: XO - 0.6, z0: ZN + 0.4, z1: Z0 - 0.3, floor: M.ptTop, level: 1, band: TOPB },
    { name: `Auf dem ${turm}`, x0: M.towerIn + 0.4, x1: XO - 0.6, z0: Z1 + 0.3, z1: ZS - 0.4, floor: M.ptTop, level: 1, band: TOPB },
  ];
  const roof = { name: 'Dach des Säulenumgangs', floor: M.colRoof, level: 1 };
  const colRoof = [
    { ...roof, x0: 3.4, x1: M.courtHalf - 0.3, z0: COL_SOUTH - 0.3, z1: 35.5 },
    { ...roof, x0: COL_X - 0.3, x1: M.courtHalf - 0.3, z0: M.courtNorth + 0.4, z1: 35.5 },
    { ...roof, x0: M.courtHalf - 1.5, x1: RD[1] + 0.3, z0: 34.4, z1: 35.5 },
  ];
  const gate = { name: 'Kammer über dem Tor', x0: -GK.half, x1: GK.half, z0: Z0, z1: Z1, stacked: true };
  const rooms = [...towerRooms('Ostturm'), ...towerRooms('Westturm').map(mirror), gate, ...colRoof, ...colRoof.map(mirror)];
  return { X0, X1, Z0, Z1, xa, xb, za, zb, nl, ns, rise, REV, steps, landings, halls, mezz, hallTop, RL, GK, floors, rooms };
})();

const ROOMS = [
  ...CHAPELS.map(c => ({ name: c.name, ...chapelDoorHole(c.door, 0.8), floor: M.midFloor })),
  { name: 'Tor zum Pronaos',            x0: -M.doorHalf, x1: M.doorHalf, z0: PF - 1.6, z1: PF + 2.4 },
  ...CHAMBERS.map(([s, , door]) => ({ name: door, ...chamX(s, M.chamWall - 0.8, M.chamX0 + 0.8), z0: M.chamDoor[0], z1: M.chamDoor[1],
    floor: M.proFloor })),
  { name: 'Tor zum Festsaal',           x0: -M.innerDoor, x1: M.innerDoor, z0: HFz - 0.8, z1: M.proBack + 0.8 },
  { name: 'Tür zum Laboratorium',       x0: -M.hallWall - 1.0, x1: -M.hallHalf + 1.0, z0: M.labDoor[0], z1: M.labDoor[1] },
  { name: 'Tür zur Schatzkammer',       x0: -M.hallWall - 1.0, x1: -M.hallHalf + 1.0, z0: M.treDoor[0], z1: M.treDoor[1] },
  { name: 'Tür zur Nilkammer',          x0: M.hallHalf - 1.0, x1: M.hallWall + 1.0, z0: M.labDoor[0], z1: M.labDoor[1] },
  { name: 'Tür zum Umgang',             x0: -M.houseHalf - 1.0, x1: M.labX0 + 1.0, z0: M.treOut[0], z1: M.treOut[1] },
  { name: 'Tür zum Umgang',             x0: M.nilX1 - 1.0, x1: M.houseHalf + 1.0, z0: M.nilOut[0], z1: M.nilOut[1] },
  { name: 'Tür zur Westtreppe',         x0: WS.xe + 0.3, x1: -M.offHalf + 1.0, z0: M.stairFoot, z1: M.stairZ0 },
  { name: 'Tür zum Opfertischsaal',     x0: -1.4, x1: 1.4, z0: M.offFront - 0.8, z1: M.hallBack + 0.8 },
  { name: 'Tür zum Mittleren Saal',     x0: -1.3, x1: 1.3, z0: M.midFront - 0.8, z1: M.offBack + 0.8 },
  { name: 'Tür zum Allerheiligsten',    x0: -1.2, x1: 1.2, z0: M.sanFront - 0.8, z1: M.midBack + 0.8 },
  { name: 'Tür zum Hof des Reinheitsplatzes', x0: M.midEnd - 0.8, x1: CWL + 0.8, z0: WAB_DOOR[0], z1: WAB_DOOR[1] },
  { name: 'Reinheitsplatz (Wabet)',     x0: M.wabCols[0] + 0.4, x1: M.wabCols[1] - 0.4, z0: SBK - 1.4, z1: SBK + 1.0 },
  { name: 'Durchgang zum Umgang',        x0: M.proOut, x1: M.courtHalf, z0: PF - 1.6, z1: PF + 2.0 },
  { name: 'Durchgang zum Umgang',        x0: -M.courtHalf, x1: -M.proOut, z0: PF - 1.6, z1: PF + 2.0 },
  { name: 'Tor des Pylons',             x0: -M.gateHalf, x1: M.gateHalf, z0: 34, z1: 47, band: [-1, 2] },
  ...CHAMBERS.map(([s, name]) => ({ name, ...chamX(s, M.chamX0, M.chamX1), z0: M.chamZ0, z1: M.chamZ1, floor: M.proFloor })),
  { name: 'Pronaos · erster Säulensaal', x0: -M.chamWall, x1: M.chamWall, z0: M.proBack, z1: PF - 1.6, floor: M.proFloor },
  { name: 'Pronaos · erster Säulensaal', x0: -M.doorRebate + 0.12, x1: M.doorRebate - 0.12, z0: M.proBack, z1: PF - 0.1, floor: M.proFloor },
  { name: 'Pronaos · erster Säulensaal', x0: -M.proHalf, x1: M.proHalf, z0: M.proBack, z1: M.chamBack, floor: M.proFloor },
  ...[-1, 1].map(s => ({ name: 'Pronaos · erster Säulensaal', ...chamX(s, M.chamOut, M.proHalf), z0: M.proBack, z1: PF - 0.4, floor: M.proFloor })),
  { name: 'Festsaal · zweiter Säulensaal', x0: -M.hallHalf, x1: M.hallHalf, z0: M.hallBack, z1: HFz, floor: M.hallFloor },
  { name: 'Laboratorium',               x0: M.labX0, x1: M.labX1, z0: M.labZ0, z1: HFz, floor: M.hallFloor },
  { name: 'Schatzkammer · feste Opfergaben', x0: M.labX0, x1: M.labX1, z0: M.treZ0, z1: M.treZ1, floor: M.hallFloor },
  { name: 'Nilkammer · flüssige Opfergaben', x0: M.hallWall, x1: M.nilX1, z0: M.nilZ0, z1: HFz, floor: M.hallFloor },
  { name: 'Opfertischsaal',             x0: -M.offHalf, x1: M.offHalf, z0: M.offBack, z1: M.offFront, floor: M.offFloor },
  { name: 'Mittlerer Saal',             x0: -M.midEnd, x1: M.midEnd, z0: M.midBack, z1: M.midFront, floor: M.midFloor },
  { name: 'Hof des Reinheitsplatzes',   x0: CWL, x1: CMH, z0: SBK, z1: M.midFront, floor: M.midFloor },
  { name: 'Reinheitsplatz (Wabet)',     x0: CWL, x1: CMH, z0: M.wabBack, z1: SBK - 0.6, floor: M.wabFloor },
  { name: 'Korridor der Mysterien',     x0: -CO, x1: -M.corrIn, z0: M.corrBack1, z1: M.midBack + 0.8, floor: M.midFloor },
  { name: 'Korridor der Mysterien',     x0: M.corrIn, x1: CO, z0: M.corrBack1, z1: M.midBack + 0.8, floor: M.midFloor },
  { name: 'Korridor der Mysterien',     x0: -CO, x1: CO, z0: M.corrBack1, z1: M.corrBack0, floor: M.midFloor },
  ...CHAPELS.map(({ name, x0, x1, z0, z1 }) => ({ name, x0, x1, z0, z1, floor: M.midFloor })),
  { name: 'Allerheiligstes',            x0: -M.sanHalf, x1: M.sanHalf, z0: M.sanBack, z1: M.sanFront, floor: M.sanFloor },
  { name: 'Gang zur Osttreppe',         x0: M.offHalf - 1.1, x1: M.stairX1, z0: M.stairFoot, z1: M.stairZ0, floor: M.offFloor },
  { name: 'Osttreppe zum Dach',         x0: M.stairX0, x1: M.stairX1, z0: M.stairFoot, z1: M.stairZ1 + 1.0, floor: M.offFloor, levels: [0, 1], split: 7 },
  { name: 'Westtreppe zum Dach',        x0: WS.xe, x1: WS.X1, z0: WS.Z0, z1: M.stairZ0, floor: M.offFloor },
  { name: 'Westtreppe zum Dach',        x0: WS.X0, x1: WS.X1, z0: WS.Z0, z1: WS.zn, floor: WS.runs[1].y0 },
  { name: 'Westtreppe zum Dach',        x0: WS.X0, x1: WS.xw, z0: WS.Z0, z1: WS.Z1, floor: WS.runs[2].y0,
    levels: [0, 2], split: (WS.runs[2].y0 + WS.runs[2].y1) / 2 },
  { name: 'Westtreppe zum Dach',        x0: WS.X0, x1: WS.X1, z0: WS.zs, z1: WS.Z1, floor: WS.runs[3].y0, level: 2 },
  { name: 'Westtreppe zum Dach',        x0: WS.xe, x1: WS.X1, z0: WS.Z0, z1: WS.exitZ, floor: M.roofY, levels: [2, 1], split: WS.exitSplit },
  { name: 'Westtreppe zum Dach',        x0: WS.xe, x1: WS.X1, z0: WS.Z0, z1: WS.Z1, floor: WS.runs[4].y0, level: 2 },
  { name: 'Dach über dem Festsaal',     x0: -M.hallWall + 0.4, x1: UP.x0, z0: M.hallBack - 1.9, z1: HFz, floor: M.roofY, level: 1 },
  { name: 'Dach über dem Festsaal',     x0: UP.x1, x1: M.stairX0 - 0.3, z0: M.hallBack - 1.9, z1: HFz, floor: M.roofY, level: 1 },
  { name: 'Dach über dem Festsaal',     x0: UP.x0 - 0.8, x1: UP.x1 + 0.8, z0: M.hallBack - 1.9, z1: UP.z0, floor: M.roofY, level: 1 },
  { name: 'Dach über dem Festsaal',     x0: M.stairX0 - 1.1, x1: M.stairX1, z0: M.stairZ1, z1: HFz, floor: M.roofY, level: 1 },
  { name: 'Dach über der Westtreppe',   x0: -M.houseHalf + 0.4, x1: WS.xe - 0.3, z0: M.midFront + 0.4, z1: WS.Z1, floor: M.roofY, level: 1 },
  { name: 'Dach über der Westtreppe',   x0: WS.xe - 1.4, x1: WS.X1, z0: M.midFront + 0.4, z1: WS.zn, floor: M.roofY, level: 1 },
  { name: 'Dach über der Westtreppe',   x0: WS.xe - 1.4, x1: -M.offHalf, z0: WS.slotZ + 0.3, z1: WS.Z1, floor: M.roofY, level: 1 },
  { name: 'Treppe zum Pronaosdach',     x0: UP.x0, x1: UP.x1, z0: UP.z0 - 1.1, z1: HFz + 1.4, floor: M.roofY, level: 1 },
  { name: 'Treppe auf die Hohlkehle',   x0: CR.x0, x1: CR.x1, z0: CR.z1 - CR.n * CR.tread - 1.0, z1: CR.z1 + 1.0, level: 1 },
  { name: 'Dach des Pronaos',           x0: -RIM, x1: RIM, z0: HFz + 0.3, z1: PF - 0.6, floor: M.proRoof, level: 1 },
  { name: 'Auf der Hohlkehle über dem Hof', x0: -RIM, x1: RIM, z0: PF - 0.6, z1: PF + 1.4, floor: M.proCrest, level: 1 },
  { name: 'Hof mit Säulenumgang',        x0: -M.courtHalf, x1: M.courtHalf, z0: M.courtNorth + 0.1, z1: M.pylonBack, floor: 0 },
  { name: 'Umgang (Ost)',               x0: M.proOut, x1: M.courtHalf, z0: HFz - 1.3, z1: PF - 0.6, floor: 0 },
  { name: 'Umgang (West)',              x0: -M.courtHalf, x1: -M.proOut, z0: HFz - 1.3, z1: PF - 0.6, floor: 0 },
  { name: 'Umgang (Ost)',               x0: M.houseHalf, x1: M.niloX0 - 0.3, z0: M.templeNorth, z1: HFz, floor: 0 },
  { name: 'Umgang (Ost)',               x0: M.houseHalf, x1: M.courtHalf, z0: M.niloTop, z1: HFz, floor: 0 },
  { name: 'Umgang (Ost)',               x0: M.houseHalf, x1: M.courtHalf, z0: M.templeNorth, z1: M.niloZ[0] - 0.3, floor: 0 },
  { name: 'Treppe zum Nilometer',       x0: M.niloX0, x1: M.courtHalf, z0: M.niloZ[0], z1: M.niloTop + 1.0 },
  { name: 'Nilometer',                  x0: M.niloX0, x1: M.wellX - M.wellR + 0.7, z0: M.niloZ[0], z1: M.niloZ[1] },
  { name: 'Umgang (West)',              x0: -M.courtHalf, x1: -M.houseHalf, z0: M.templeNorth, z1: HFz, floor: 0 },
  { name: 'Umgang (Nord)',              x0: -M.courtHalf, x1: M.courtHalf, z0: M.templeNorth, z1: M.houseBack, floor: 0 },
  { name: 'Vor dem Pylon',              x0: -140, x1: MAM.x0 - 0.3, z0: M.pylonFront, z1: 160, floor: 0 },
  { name: 'Vor dem Pylon',              x0: MAM.x1 + 0.3, x1: 140, z0: M.pylonFront, z1: 160, floor: 0 },
  { name: 'Vor dem Pylon',              x0: -140, x1: 140, z0: M.pylonFront, z1: MAM.z0 - 0.3, floor: 0 },
  { name: 'Vor dem Pylon',              x0: -140, x1: 140, z0: MAM.z1 + 0.3, z1: 160, floor: 0 },
  { name: 'Eingang des Mammisi',        ...mamRect(-1.2, M.mamCol + 1.0, -M.mamEntryHalf, M.mamEntryHalf) },
  { name: 'Umgang des Mammisi',         ...mamRect(M.mamCol, M.mamNaos[0], -MAM.inner, MAM.inner), floor: M.mamFloor },
  { name: 'Umgang des Mammisi',         ...mamRect(M.mamNaos[5], M.mamL - M.mamCol, -MAM.inner, MAM.inner), floor: M.mamFloor },
  { name: 'Umgang des Mammisi',         ...mamRect(M.mamCol, M.mamL - M.mamCol, -MAM.inner, -M.mamNaosHalf), floor: M.mamFloor },
  { name: 'Umgang des Mammisi',         ...mamRect(M.mamCol, M.mamL - M.mamCol, M.mamNaosHalf, MAM.inner), floor: M.mamFloor },
  { name: 'Tür zum Vorraum',            ...mamRect(M.mamNaos[0] - 1.0, M.mamNaos[1] + 1.0, -M.mamDoorHalf, M.mamDoorHalf), floor: M.mamFloor },
  { name: 'Vorraum des Mammisi',        ...mamRect(M.mamNaos[1], M.mamNaos[2], -M.mamProHalf, M.mamProHalf), floor: M.mamFloor },
  { name: 'Tür zum Sanktuar',           ...mamRect(M.mamNaos[2] - 1.0, M.mamNaos[3] + 1.0, -M.mamDoorHalf, M.mamDoorHalf), floor: M.mamFloor },
  { name: 'Sanktuar des Mammisi',       ...mamRect(M.mamNaos[3], M.mamNaos[4], -M.mamSanHalf, M.mamSanHalf), floor: M.mamFloor },
  ...PT.rooms,
];
const STEPS = [
  { x0: -3.0, x1: 3.0, z0: PF + 2.4, z1: PF + 3.2, y: 0.2 },
  { x0: -3.0, x1: 3.0, z0: PF + 1.6, z1: PF + 2.4, y: 0.4 },
  { x0: M.jambOut, x1: M.screenEnd, z0: PF + 0.6, z1: PF + 1.4, y: 0.6 },
  { x0: -M.screenEnd, x1: -M.jambOut, z0: PF + 0.6, z1: PF + 1.4, y: 0.6 },
  { x0: -M.doorHalf, x1: M.doorHalf, z0: PF - 0.6, z1: PF + 1.6, y: M.proFloor },
  { x0: -M.innerDoor, x1: M.innerDoor, z0: HFz, z1: M.proBack, y: 0.8 },
  { x0: -M.hallWall, x1: -M.hallHalf, z0: M.labDoor[0], z1: M.labDoor[1], y: M.hallFloor },
  { x0: -M.hallWall, x1: -M.hallHalf, z0: M.treDoor[0], z1: M.treDoor[1], y: M.hallFloor },
  { x0: M.hallHalf, x1: M.hallWall, z0: M.labDoor[0], z1: M.labDoor[1], y: M.hallFloor },
  { x0: -1.4, x1: 1.4, z0: M.offFront, z1: M.hallBack, y: 1.2 },
  { x0: -1.3, x1: 1.3, z0: M.midFront, z1: M.offBack, y: 1.6 },
  { x0: -1.2, x1: 1.2, z0: M.sanFront, z1: M.midBack, y: 2.0 },
  { x0: CWL, x1: CMH, z0: M.wabBack, z1: SBK + 0.02, y: M.wabFloor },
  { x0: M.midEnd - 0.02, x1: CWL + 0.02, z0: WAB_DOOR[0], z1: WAB_DOOR[1], y: M.midFloor },
  { x0: M.stairX0, x1: M.stairX1, z0: M.stairZ1, z1: M.stairZ1 + 1.0, y: M.roofY, levels: [0, 1] },
  { x0: WS.X1, x1: -M.offHalf, z0: M.stairFoot, z1: M.stairZ0, y: M.offFloor },
  ...WS.landings, ...WS.steps,
];
for (let i = 0; i < M.stairSteps; i++) {
  const t = (M.stairZ1 - M.stairZ0) / M.stairSteps;
  STEPS.push({ x0: M.stairX0, x1: M.stairX1, z0: M.stairZ0 + i * t, z1: M.stairZ0 + (i + 1) * t,
    y: M.offFloor + (i + 1) * (M.roofY - M.offFloor) / M.stairSteps, levels: [0, 1] });
}
for (let i = 1; i <= M.wabSteps; i++) {
  const z1 = M.wabStepZ - (i - 1) * WAB_TREAD;
  STEPS.push({ x0: CWL, x1: CMH, z0: z1 - WAB_TREAD - 0.02, z1: z1 + 0.02, y: M.midFloor + i * (M.wabFloor - M.midFloor) / M.wabSteps });
}
for (let i = 1; i <= M.niloN1; i++) {
  const z1 = M.niloTop - (i - 1) * M.niloTread;
  STEPS.push({ x0: M.niloX0, x1: M.courtHalf, z0: z1 - M.niloTread - 0.02, z1: z1 + 0.02, y: -i * M.niloRise });
}
STEPS.push({ x0: M.niloX0, x1: M.courtHalf + 0.02, z0: M.niloZ[0], z1: M.niloLand + 0.02, y: -M.niloN1 * M.niloRise });
for (let j = 1; j <= M.niloN2; j++) {
  const x0 = M.courtHalf + (j - 1) * M.niloTread;
  STEPS.push({ x0: x0 - 0.02, x1: x0 + M.niloTread + 0.02, z0: M.niloZ[0], z1: M.niloZ[1], y: -(M.niloN1 + j) * M.niloRise });
}
STEPS.push({ x0: M.niloEnd - 0.02, x1: M.wellX - M.wellR + 0.7, z0: M.niloZ[0], z1: M.niloZ[1], y: M.niloFloor });
STEPS.push(
  { ...mamRect(-0.92, -0.58, -M.mamEntryHalf, M.mamEntryHalf), y: M.mamFloor / 3 },
  { ...mamRect(-0.62, -0.28, -M.mamEntryHalf, M.mamEntryHalf), y: 2 * M.mamFloor / 3 },
  { ...mamRect(-0.32, M.mamCol + 0.02, -M.mamEntryHalf, M.mamEntryHalf), y: M.mamFloor },
);
for (const [xi, xo, [z0, z1]] of OUT_DOORS) {
  const n = M.outSteps, t = (xo - xi) / n;
  for (let i = 0; i < n; i++) {
    const a = xi + i * t, b = a + t;
    STEPS.push({ x0: Math.min(a, b) - 0.02, x1: Math.max(a, b) + 0.02, z0, z1, y: M.hallFloor * (1 - i / n) });
  }
}
for (let i = 0; i < UP.n; i++) {
  const t = (UP.z1 - UP.z0) / UP.n;
  STEPS.push({ x0: UP.x0, x1: UP.x1, z0: UP.z0 + i * t, z1: UP.z0 + (i + 1) * t,
    y: M.hallRoof + (i + 1) * (M.proRoof - M.hallRoof) / UP.n, level: 1 });
}
STEPS.push({ x0: UP.x0, x1: UP.x1, z0: HFz, z1: HFz + 1.4, y: M.proRoof, level: 1 });
STEPS.push({ x0: -M.hallHalf, x1: M.hallHalf, z0: M.hallBack, z1: HFz, y: M.hallRoof, level: 1 });
for (let i = 0; i < CR.n; i++) {
  const z0 = CR.z1 - (CR.n - i) * CR.tread;
  STEPS.push({ x0: CR.x0, x1: CR.x1, z0: z0 - 0.02, z1: z0 + CR.tread + 0.02, y: M.proRoof + (i + 1) * CR.rise, level: 1 });
}

const portal = (x, [z0, z1], y0, y1) => [x, x, y0, y1, z0, z1];
const roomArea = ([x0, x1, z0, z1, y0, y1]) => 2 * ((x1 - x0) * (z1 - z0) + (x1 - x0 + z1 - z0) * (y1 - y0));
const ZONES = [
  { box: [-1.7, 1.7, HFz, M.proBack, 7.3], amb: [0.08, 0.12], haze: 0.012,
    room: [-1.6, 1.6, HFz, M.proBack, 0.6, 7.2] },
  ...CHAMBERS.map(([s]) => {
    const { x0, x1 } = chamX(s, M.chamX0, M.chamX1);
    return { box: [x0 - 0.05, x1 + 0.05, M.chamZ0 - 0.05, M.chamZ1, M.chamTop + 0.05], amb: [0.025, 0.04], haze: 0.015,
      room: [x0, x1, M.chamZ0, M.chamZ1, M.proFloor, M.chamTop], portals: [portal(s * M.chamX0, M.chamDoor, M.proFloor, M.chamDoorTop)] };
  }),
  { box: [-M.proHalf - 0.05, M.proHalf + 0.05, M.proBack - 0.05, PF, M.proArch + 0.05], amb: [0.12, 0.35], haze: 0.011,
    room: [-M.proHalf, M.proHalf, M.proBack, PF - 0.4, 0.6, M.proArch] },
  { box: [-M.hallHalf - 0.05, M.hallHalf + 0.05, M.hallBack - 0.05, HFz + 0.6, M.hallArch + 0.05], amb: [0.07, 0.1], haze: 0.026,
    room: [-M.hallHalf, M.hallHalf, M.hallBack, HFz, 1.0, M.hallArch] },
  { box: [M.labX0 - 0.05, -M.hallHalf, M.labZ0 - 0.05, HFz + 0.6, M.labTop + 0.05], amb: [0.06, 0.07], haze: 0.012,
    room: [M.labX0, M.labX1, M.labZ0, HFz, 1.0, M.labTop], portals: [portal(M.labX1, M.labDoor, M.hallFloor, M.doorTop)] },
  { box: [M.labX0 - 0.05, -M.hallHalf, M.treZ0 - 0.05, M.treZ1 + 0.05, M.labTop + 0.05], amb: [0.05, 0.05], haze: 0.012,
    room: [M.labX0, M.labX1, M.treZ0, M.treZ1, M.hallFloor, M.labTop], portals: [portal(M.labX1, M.treDoor, M.hallFloor, M.doorTop), portal(M.labX0, M.treOut, M.hallFloor, M.outTop)] },
  { box: [M.hallHalf, M.nilX1 + 0.05, M.nilZ0 - 0.05, HFz + 0.6, M.labTop + 0.05], amb: [0.05, 0.06], haze: 0.012,
    room: [M.hallWall, M.nilX1, M.nilZ0, HFz, M.hallFloor, M.labTop], portals: [portal(M.hallWall, M.labDoor, M.hallFloor, M.doorTop), portal(M.nilX1, M.nilOut, M.hallFloor, M.outTop)] },
  ...OUT_DOORS.map(([xi, xo, [z0, z1]]) => ({ box: [Math.min(xi, xo) - 0.05, Math.max(xi, xo) + 0.05, z0 - 0.05, z1 + 0.05, M.outTop + 0.05],
    amb: [0.25, 0.25], haze: 0.01 })),
  { box: [-M.offHalf - 0.05, M.offHalf + 0.05, M.offBack - 0.05, M.hallBack, M.offTop + 0.05], amb: [0.05, 0.07], haze: 0.02,
    room: [-M.offHalf, M.offHalf, M.offBack, M.offFront, 1.4, M.offTop] },
  { box: [WS.X0 - 0.05, -M.offHalf - 0.05, WS.Z0 - 0.05, WS.Z1 + 0.05, WS.MID], amb: [0.02, 0.035], haze: 0.015,
    room: [WS.X0, WS.X1, WS.Z0, WS.Z1, M.offFloor, WS.MID] },
  { box: [WS.xe - 0.05, WS.X1 + 0.05, WS.Z0 - 0.05, WS.Z1 + 0.05, M.roofY - 0.05], amb: [0.35, 0.1], haze: 0.01,
    room: [WS.xe, WS.X1, WS.Z0, WS.slotZ, WS.MID, M.roofY] },
  { box: [WS.X0 - 0.05, WS.X1 + 0.05, WS.Z0 - 0.05, WS.Z1 + 0.05, M.roofY - 0.05], amb: [0.03, 0.04], haze: 0.015 },
  { box: [CWL - 0.05, CMH + 0.05, SBK - 0.05, M.midFront + 0.05, M.innerMass + 0.05], amb: [0.4, 0.45], haze: 0.008,
    room: [CWL, CMH, SBK, M.midFront, M.midFloor, M.innerMass] },
  { box: [CWL - 0.05, CMH + 0.05, M.wabBack - 0.05, SBK - 0.05, M.wabTop + 0.05], amb: [0.03, 0.2], haze: 0.015,
    room: [CWL, CMH, M.wabBack, SBK, M.wabFloor, M.wabTop] },
  { box: [-CMH - 0.05, -CWL + 0.05, M.midBack - 0.05, M.midFront + 0.05, M.chapTop + 0.05], amb: [0.006, 0.006], haze: 0.015,
    room: [-CMH, -CWL, M.midBack, M.midFront, M.midFloor, M.chapTop] },
  { box: [-M.midHalf - 0.05, M.midHalf + 0.05, M.sanFront - 0.05, M.offBack, M.midTop + 0.05], amb: [0.035, 0.05], haze: 0.02,
    room: [-M.midEnd, M.midEnd, M.midBack, M.midFront, 1.8, M.midTop] },
  { box: [-M.sanHalf - 0.05, M.sanHalf + 0.05, M.sanBack - 0.05, M.sanFront, M.sanTop + 0.05], amb: [0.025, 0.035], haze: 0.025,
    room: [-M.sanHalf, M.sanHalf, M.sanBack, M.sanFront, 2.2, M.sanTop] },
  { box: [-CO - 0.05, -M.corrIn + 0.05, M.corrBack0, SBK, M.corrTop + 0.05], amb: [0.012, 0.03], haze: 0.022,
    room: [-CO, -M.corrIn, M.corrBack0, SBK, M.midFloor, M.corrTop] },
  { box: [M.corrIn - 0.05, CO + 0.05, M.corrBack0, SBK, M.corrTop + 0.05], amb: [0.012, 0.03], haze: 0.022,
    room: [M.corrIn, CO, M.corrBack0, SBK, M.midFloor, M.corrTop] },
  { box: [-CO - 0.05, CO + 0.05, M.corrBack1 - 0.05, M.corrBack0, M.corrTop + 0.05], amb: [0.012, 0.012], haze: 0.022,
    room: [-CO, CO, M.corrBack1, M.corrBack0, M.midFloor, M.corrTop] },
  { box: [-CMH - 0.05, CMH + 0.05, CB1 - 0.05, SBK, M.chapTop + 0.05], amb: [0.006, 0.006], haze: 0.015,
    walls: CHAPELS.filter(c => c.z1 <= SBK).reduce((a, { x0, x1, z0, z1 }) => a + roomArea([x0, x1, z0, z1, M.midFloor, M.chapTop]), 0) },
  { box: [M.offHalf + 0.05, M.stairX1 + 0.05, M.stairFoot - 0.05, M.stairZ1 + 1.1, M.roofY - 0.05], amb: [0.05, 0.3], haze: 0.012,
    room: [M.stairX0, M.stairX1, M.stairFoot, M.stairZ1 + 1.0, 1.4, M.roofY] },
  { box: [M.niloX0 - 0.05, M.courtHalf + 0.05, M.niloZ[0] - 0.05, M.niloTop + 0.05, 0], amb: [0.08, 0.45], haze: 0.01 },
  { box: [M.wellX - M.wellR - 0.05, M.wellX + M.wellR + 0.05, (M.niloZ[0] + M.niloZ[1]) / 2 - M.wellR - 0.05,
    (M.niloZ[0] + M.niloZ[1]) / 2 + M.wellR + 0.05, 0], amb: [0.06, 0.06], haze: 0.01 },
  { box: [M.courtHalf, M.wellX - M.wellR + 0.3, M.niloZ[0] - 0.05, M.niloZ[1] + 0.05, 0], amb: [0.015, 0.015], haze: 0.015 },
  ...[[M.mamNaos[3], M.mamNaos[4], M.mamSanHalf, 0.02, [M.mamNaos[3]]], [M.mamNaos[1], M.mamNaos[2], M.mamProHalf, 0.1, [M.mamNaos[1], M.mamNaos[2]]]]
    .map(([u0, u1, h, amb, doors]) => {
      const r = mamRect(u0, u1, -h, h), top = M.mamFloor + M.mamCeil;
      return { box: [r.x0 - 0.05, r.x1 + 0.05, r.z0 - 0.05, r.z1 + 0.05, top + 0.05], amb: [amb, amb], haze: 0.015,
        room: [r.x0, r.x1, r.z0, r.z1, M.mamFloor, top],
        portals: doors.map(u => portal(M.mamX - u, [M.mamZ - M.mamDoorHalf, M.mamZ + M.mamDoorHalf], M.mamFloor, M.mamFloor + M.mamDoorTop)) };
    }),
  { box: [MAM.x0 + 0.5, MAM.x1 - 0.5, MAM.z0 + 0.5, MAM.z1 - 0.5, M.mamFloor + M.mamBesTop + 0.05], amb: [0.45, 0.45], haze: 0.008 },
  { box: [-2.9, 2.9, 35.45, 46.0, M.gateTop + 0.05], amb: [0.45, 0.45], haze: 0.006 },
  ...[1, -1].flatMap(s => {
    const xs = (a, b) => [Math.min(s * a, s * b), Math.max(s * a, s * b)], z = [PT.Z0 - 0.05, PT.Z1 + 0.05];
    const sw = roomArea([PT.X0, PT.X1, PT.Z0, PT.Z1, 0, 2 * PT.REV]), hw = roomArea([M.ptCorr, M.ptHall, PT.Z0, PT.Z1, 0, PT.REV - M.ptSlab]);
    return [
      { box: [...xs(PT.X0 - 0.05, PT.X1 + 0.05), ...z, 16], amb: [0.04, 0.04], haze: 0.012, walls: sw },
      { box: [...xs(PT.X0 - 0.05, PT.X1 + 0.05), ...z, 27], amb: [0.07, 0.07], haze: 0.012, walls: sw },
      { box: [...xs(PT.X0 - 0.05, PT.X1 + 0.05), ...z, M.ptTop - 0.1], amb: [0.25, 0.25], haze: 0.01, walls: sw },
      { box: [...xs(M.towerIn + 0.05, M.ptEnd + 0.05), M.pylonBack + M.batter + 0.05, z[1], M.pylonTop], amb: [0.06, 0.04], haze: 0.012, walls: hw },
      { box: [...xs(M.gateHalf + 0.4, M.towerIn + 0.1), z[0], M.ptCorrZ + 0.05, M.ptCorrTop + 0.05], amb: [0.15, 0.15], haze: 0.012 },
    ];
  }),
  { box: [-M.towerIn - 0.05, M.towerIn + 0.05, PT.Z0 - 0.05, PT.Z1 + 0.05, M.gateBlockTop + 1.65], amb: [0.45, 0.45], haze: 0.006 },
  { box: [-M.courtHalf - 0.05, M.courtHalf + 0.05, COL_SOUTH - 0.75, 36.5, M.colArch + 0.05], amb: [0.75, 0.2], haze: 0.009, open: true },
  { box: [COL_X - 0.75, M.courtHalf + 0.05, M.courtNorth - 0.1, 36.5, M.colArch + 0.05], amb: [0.75, 0.35], haze: 0.009, alongX: true, open: true },
  { box: [-M.courtHalf - 0.05, -COL_X + 0.75, M.courtNorth - 0.1, 36.5, M.colArch + 0.05], amb: [0.35, 0.75], haze: 0.009, alongX: true, open: true },
  { box: [-M.courtHalf - 0.05, M.courtHalf + 0.05, M.templeNorth - 0.05, M.courtNorth, M.enclTop], amb: [0.72, 0.72], haze: 0.0006, open: true, reach: 4.8 },
  { box: [-M.courtHalf - 0.05, M.courtHalf + 0.05, M.courtNorth, 35.0, 40.0], amb: [1, 1], haze: 0.00005, open: true },
];
const NZ = ZONES.length;
const ZONE_GROUP = 6;
const inBox = ([x0, x1, z0, z1, y1]) => `p.x > ${f3(x0)} && p.x < ${f3(x1)} && p.z > ${f3(z0)} && p.z < ${f3(z1)} && p.y < ${f3(y1)}`;
const ZONE_GLSL = `
  vec3 zoneAt(vec3 p) {
${Array.from({ length: Math.ceil(NZ / ZONE_GROUP) }, (_, g) => {
  const group = ZONES.slice(g * ZONE_GROUP, (g + 1) * ZONE_GROUP), b = group.map(z => z.box);
  const hull = [Math.min(...b.map(v => v[0])), Math.max(...b.map(v => v[1])), Math.min(...b.map(v => v[2])), Math.max(...b.map(v => v[3])), Math.max(...b.map(v => v[4]))];
  return `    if (${inBox(hull)}) {\n` + group.map(({ box, amb, haze, alongX }, j) => {
    const [c, a0, a1] = alongX ? ['x', box[0], box[1]] : ['z', box[2], box[3]];
    return `      if (${inBox(box)})
        return vec3(mix(${f3(amb[0])}, ${f3(amb[1])}, clamp((p.${c} - ${f3(a0)}) / ${f3(a1 - a0)}, 0.0, 1.0)), ${haze.toFixed(5)}, ${g * ZONE_GROUP + j}.0);`;
  }).join('\n') + '\n    }';
}).join('\n')}
    return vec3(1.0, 0.00015, ${NZ}.0);
  }`;
const bounceUniform = { value: new Array(NZ + 1).fill(0) };
const bounceTarget = new Array(NZ + 1).fill(0);
const bounceColor = { value: new THREE.Color(1.0, 0.8, 0.58).multiplyScalar(0.75) };
const OPEN_ZONES = [...ZONES.flatMap((z, i) => (z.open ? [i] : [])), NZ];
const skyFill = { value: new Array(NZ + 1).fill(0) };
const groundReach = { value: [...ZONES.map(z => z.reach ?? 1e4), 1e4] };
function zoneAtPoint(x, y, z) {
  for (let i = 0; i < NZ; i++) {
    const [x0, x1, z0, z1, y1] = ZONES[i].box;
    if (x > x0 && x < x1 && z > z0 && z < z1 && y < y1) return i;
  }
  return NZ;
}
function zoneLight(x, y, z) {
  const i = zoneAtPoint(x, y, z);
  if (i === NZ) return 1;
  const { box: [x0, x1, z0, z1], amb, alongX } = ZONES[i];
  const t = alongX ? (x - x0) / (x1 - x0) : (z - z0) / (z1 - z0);
  return THREE.MathUtils.lerp(amb[0], amb[1], THREE.MathUtils.clamp(t, 0, 1)) + bounceUniform.value[i];
}

export { CHAPELS, COL_SOUTH, CR, MAM,WAB_DOOR, WAB_TREAD, COL_X, M, NZ, OPEN_ZONES, OUT_DOORS, PF, PT, ROOMS, chapelDoorHole, STEPS, TEX_M, UP, WS, WS_GLSL, ZONES, ZONE_GLSL, bounceColor, bounceTarget, bounceUniform, f3, mamRect, roomArea, groundReach, skyFill, zoneAtPoint, zoneLight };
