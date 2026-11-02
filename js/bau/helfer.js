import * as THREE from 'three';
import { M, TEX_M } from '../masse.js';
import { rand } from '../texturen.js';
import { PAINT } from '../material.js';

function stoneBox(w, h, d) {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv;
  g.setAttribute('aPaintUv', uv.clone());
  const faces = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) {
    const ox = rand(), oy = rand();
    for (let k = f * 4; k < f * 4 + 4; k++) {
      uv.setXY(k, uv.getX(k) * faces[f][0] / TEX_M + ox, uv.getY(k) * faces[f][1] / TEX_M + oy);
    }
  }
  return g;
}

const blocks = [], CELL = 8;
function worldUv(g) {
  const pos = g.attributes.position, nor = g.attributes.normal, uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const ax = Math.abs(nor.getX(i)), ay = Math.abs(nor.getY(i)), az = Math.abs(nor.getZ(i));
    const x = pos.getX(i) / TEX_M, y = pos.getY(i) / TEX_M, z = pos.getZ(i) / TEX_M;
    if (ay >= ax && ay >= az) uv.setXY(i, x, z);
    else if (ax >= az) uv.setXY(i, z, y);
    else uv.setXY(i, x, y);
  }
}
function pushBlock(g, x0, x1, y0, y1, z0, z1, paint) {
  g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  worldUv(g);
  g.setAttribute('aPaintCode', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count).fill(paint), 1));
  blocks.push(g);
}
function block(xa, xb, y0, y1, za, zb, paint = PAINT.wall) {
  const x0 = Math.min(xa, xb), x1 = Math.max(xa, xb), z0 = Math.min(za, zb), z1 = Math.max(za, zb);
  for (let i = Math.floor(x0 / CELL); i * CELL < x1; i++) {
    for (let k = Math.floor(z0 / CELL); k * CELL < z1; k++) {
      const a = Math.max(x0, i * CELL), b = Math.min(x1, (i + 1) * CELL);
      const c = Math.max(z0, k * CELL), d = Math.min(z1, (k + 1) * CELL);
      if (b - a > 1e-4 && d - c > 1e-4) pushBlock(stoneBox(b - a, y1 - y0, d - c), a, b, y0, y1, c, d, paint);
    }
  }
}
function slopedBlock(x0, x1, y0, y1, z0, z1, faces, paint, painted = {}) {
  const g = stoneBox(x1 - x0, y1 - y0, z1 - z0), pos = g.attributes.position;
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, cz = (z0 + z1) / 2;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i) + cy, fx = pos.getX(i) > 0 ? faces.xp : faces.xn, fz = pos.getZ(i) > 0 ? faces.zp : faces.zn;
    if (fx) pos.setX(i, fx(y) - cx);
    if (fz) pos.setZ(i, fz(y) - cz);
  }
  g.computeVertexNormals();
  pushBlock(g, x0, x1, y0, y1, z0, z1, paint);
  const side = ['xp', 'xn', 'yp', 'yn', 'zp', 'zn'], code = g.attributes.aPaintCode;
  for (let i = 0; i < code.count; i++) if (!faces[side[i >> 2]] && !painted[side[i >> 2]]) code.setX(i, PAINT.none);
}
const mirrorX = (fn) => { for (const s of [-1, 1]) fn(s); };

function latheColumn(profile, segs = 36) {
  const pts = profile.map(([r, y]) => new THREE.Vector2(r, y));
  const g = new THREE.LatheGeometry(pts, segs);
  const maxR = Math.max(...profile.map(p => p[0]));
  const cum = [0];
  for (let j = 1; j < pts.length; j++) cum.push(cum[j - 1] + pts[j].distanceTo(pts[j - 1]));
  const uv = g.attributes.uv;
  for (let i = 0; i <= segs; i++) for (let j = 0; j < pts.length; j++) {
    const k = i * pts.length + j;
    uv.setXY(k, uv.getX(k) * 2 * Math.PI * maxR / TEX_M, cum[j] / TEX_M);
  }
  const top = pts[pts.length - 1].y;
  const paintUv = new Float32Array(uv.count * 2);
  for (let i = 0; i <= segs; i++) for (let j = 0; j < pts.length; j++) {
    const k = i * pts.length + j;
    paintUv[k * 2] = i / segs;
    paintUv[k * 2 + 1] = pts[j].y / top;
  }
  g.setAttribute('aPaintUv', new THREE.BufferAttribute(paintUv, 2));
  return g;
}

const courtProfile = [
  [0, 0], [1.0, 0], [1.0, 0.4], [0.82, 0.45],
  [0.72, 0.5], [0.8, 0.9], [0.8, 1.4], [0.76, 3], [0.72, 5.5], [0.68, 7.6],
  [0.73, 7.65], [0.73, 7.85], [0.68, 7.9], [0.73, 7.95], [0.73, 8.15], [0.66, 8.2],
  [0.78, 8.5], [0.98, 8.85], [1.18, 9.2], [1.28, 9.45], [1.28, 9.55], [1.1, 9.6], [0, 9.6],
].map(([r, y]) => [r * 0.95, y * M.colTop / 9.6]);
const proColTop = M.proColTop;
const proProfile = [
  [0, 0], [1.3, 0], [1.3, 0.5], [1.1, 0.55],
  [0.98, 0.6], [1.08, 1.1], [1.08, 1.8], [1.04, 4], [0.98, 7], [0.94, 9.4],
  [0.99, 9.45], [0.99, 9.7], [0.94, 9.75], [0.99, 9.8], [0.99, 10.05], [0.92, 10.1],
  [1.05, 10.5], [1.35, 11.1], [1.62, 11.7], [1.74, 12.15], [1.74, 12.45], [1.5, 12.6], [0, 12.6],
].map(([r, y]) => [r * 0.9, y * (proColTop - M.proFloor) / 12.6]);

const CAPITALS = [{ n1: 16, n2: 8, amp: 0.16 }, { n1: 24, n2: 4, amp: 0.2 }, { n1: 0, n2: 8, amp: 0.12, palm: true }];
const PRO_INNER = [{ bell: true }, { bell: true, buds: 8 }];
function capitalColumn(profile, y0, y1, spec) {
  const fine = [profile[0]];
  for (let j = 1; j < profile.length; j++) {
    const [ra, ya] = profile[j - 1], [rb, yb] = profile[j];
    const n = yb > y0 && ya < y1 ? Math.max(1, Math.ceil(Math.abs(yb - ya) / 0.05)) : 1;
    for (let k = 1; k <= n; k++) fine.push([ra + (rb - ra) * k / n, ya + (yb - ya) * k / n]);
  }
  const g = latheColumn(fine, 96), pos = g.attributes.position, S = THREE.MathUtils.smoothstep;
  const { n1, n2, amp, palm, bell, buds } = spec;
  const lobe = (n, a) => Math.pow(0.5 + 0.5 * Math.cos(n * a), 3);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), r = Math.hypot(x, z);
    if (y <= y0 || y >= y1 || r < 1e-3) continue;
    const t = (y - y0) / (y1 - y0), a = Math.atan2(x, z);
    let f = 0.035 * (Math.abs(Math.cos(12 * a)) - 0.64) * (1 - S(t, 0.15, 0.25));
    if (bell) {
      f += 0.012 * Math.cos(32 * a) * S(t, 0.25, 0.4);
      if (buds) f += 0.32 * Math.pow(lobe(buds, a + Math.PI / buds), 3) * S(t, 0.0, 0.08) * (1 - S(t, 0.22, 0.34));
      pos.setX(i, x * (1 + f));
      pos.setZ(i, z * (1 + f));
      continue;
    }
    if (n1) {
      const e = S(t, 0.2, 0.45) * (1 - S(t, 0.46, 0.52));
      f += (0.1 * lobe(n1, a) - 0.02) * e;
    }
    const e2 = S(t, palm ? 0.2 : 0.45, 0.85) * (1 - 0.5 * S(t, 0.93, 1.0));
    f += (amp * (lobe(n2, a) + 0.6 * lobe(n2, a + Math.PI / n2)) - 0.08 + 0.015 * Math.cos(4 * n2 * a)) * e2;
    if (palm) f += 0.02 * Math.cos(6 * n2 * a) * e2;
    pos.setX(i, x * (1 + f));
    pos.setZ(i, z * (1 + f));
  }
  g.computeVertexNormals();
  return g;
}

const COURT_CAP = [8.2 * M.colTop / 9.6, 9.55 * M.colTop / 9.6];
const courtGeos = CAPITALS.map(c => capitalColumn(courtProfile, ...COURT_CAP, c));
const courtAbacus = stoneBox(1.3, M.colAbacus - M.colTop, 1.3).translate(0, (M.colTop + M.colAbacus) / 2, 0);
const PRO_SCALE = (proColTop - M.proFloor) / 12.6;
const proGeos = [...CAPITALS, ...PRO_INNER].map(c => capitalColumn(proProfile, 10.1 * PRO_SCALE, 12.45 * PRO_SCALE, c));
const proAbacus = stoneBox(2.0, M.proAbacus - proColTop, 2.0).translate(0, (proColTop + M.proAbacus) / 2 - M.proFloor, 0);
const scaledCapitals = (rs, hs) => CAPITALS.map(c => capitalColumn(courtProfile.map(([r, y]) => [r * rs, y * hs]),
  COURT_CAP[0] * hs, COURT_CAP[1] * hs, c));
const HALL_S = (M.hallColTop - M.hallFloor) / M.colTop;
const hallGeos = scaledCapitals(1.0, HALL_S);
const hallAbacus = stoneBox(1.5, M.hallAbacus - M.hallColTop, 1.5).translate(0, (M.hallColTop + M.hallAbacus) / 2 - M.hallFloor, 0);

export { CELL, block, blocks, courtAbacus, courtGeos, courtProfile, hallAbacus, hallGeos, latheColumn, mirrorX, proAbacus, proGeos, scaledCapitals, slopedBlock };
