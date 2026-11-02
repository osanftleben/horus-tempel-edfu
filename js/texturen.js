import * as THREE from 'three';
import { renderer } from './szene.js';

function mulberry32(a) {
  return () => {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(237);

function tileNoise(size, cells) {
  const g = new Float32Array(cells * cells).map(() => rand());
  const out = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    const fy = y / size * cells, iy = Math.floor(fy), ty = fy - iy, sy = ty * ty * (3 - 2 * ty);
    const y0 = iy % cells, y1 = (iy + 1) % cells;
    for (let x = 0; x < size; x++) {
      const fx = x / size * cells, ix = Math.floor(fx), tx = fx - ix, sx = tx * tx * (3 - 2 * tx);
      const x0 = ix % cells, x1 = (ix + 1) % cells;
      const a = g[y0 * cells + x0], b = g[y0 * cells + x1], c = g[y1 * cells + x0], d = g[y1 * cells + x1];
      const top = a + (b - a) * sx, bottom = c + (d - c) * sx;
      out[y * size + x] = top + (bottom - top) * sy;
    }
  }
  return out;
}

function fbm(size) {
  const out = new Float32Array(size * size);
  for (const [cells, w] of [[4, .35], [8, .25], [16, .18], [32, .12], [64, .07], [128, .03]]) {
    const n = tileNoise(size, cells);
    for (let i = 0; i < out.length; i++) out[i] += n[i] * w;
  }
  return out;
}

function canvasTexture(size, paint, srgb = true) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const ctx = cv.getContext('2d');
  const img = ctx.createImageData(size, size);
  paint(img.data);
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const S = 512;

const nStone = fbm(S), nGrain = tileNoise(S, 256);
const stoneValue = i => {
  const y = Math.floor(i / S);
  const strata = 0.5 + 0.5 * Math.sin(y / S * Math.PI * 2 * 6 + nStone[i] * 6);
  let v = 0.72 + 0.5 * (nStone[i] - 0.5) + 0.07 * strata + 0.1 * (nGrain[i] - 0.5);
  if (nGrain[i] > 0.92) v *= 0.72;
  return v;
};
const stoneMap = canvasTexture(S, d => {
  for (let i = 0; i < S * S; i++) {
    const v = stoneValue(i);
    d[i * 4] = 212 * v; d[i * 4 + 1] = 188 * v; d[i * 4 + 2] = 158 * v; d[i * 4 + 3] = 255;
  }
});
const stoneBump = canvasTexture(S, d => {
  for (let i = 0; i < S * S; i++) {
    const v = 255 * Math.min(1, stoneValue(i));
    d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v; d[i * 4 + 3] = 255;
  }
}, false);

const nFloor = fbm(S);
const slabTint = Array.from({ length: 16 }, () => rand());
const floorMap = canvasTexture(S, d => {
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const i = y * S + x;
    const joint = (x % 128 < 2 || y % 128 < 2) ? 0.5 : 1;
    const tint = 0.88 + 0.22 * slabTint[Math.floor(y / 128) * 4 + Math.floor(x / 128)];
    const v = (0.64 + 0.42 * (nFloor[i] - 0.5)) * tint * joint;
    d[i * 4] = 205 * v; d[i * 4 + 1] = 182 * v; d[i * 4 + 2] = 152 * v; d[i * 4 + 3] = 255;
  }
});

const nSand = fbm(S);
const sandMap = canvasTexture(S, d => {
  for (let i = 0; i < S * S; i++) {
    const v = 0.8 + 0.3 * (nSand[i] - 0.5);
    d[i * 4] = 232 * v; d[i * 4 + 1] = 200 * v; d[i * 4 + 2] = 150 * v; d[i * 4 + 3] = 255;
  }
});

const nGranite = fbm(256);
const granite = (base, tint = [1, 1, 1]) => canvasTexture(256, d => {
  for (let i = 0; i < 256 * 256; i++) {
    const r = rand();
    let v = base + 0.1 * (nGranite[i] - 0.5);
    let pink = 0;
    if (r > 0.95) v = base + 0.39 + 0.2 * rand();
    else if (r > 0.92) { v = base + 0.19; pink = 0.08; }
    else if (r < 0.04 && base > 0.3) v = base - 0.25;
    d[i * 4] = 255 * Math.min(1, (v + pink) * tint[0]); d[i * 4 + 1] = 255 * Math.min(1, v * tint[1]);
    d[i * 4 + 2] = 255 * Math.min(1, (v + 0.01) * tint[2]); d[i * 4 + 3] = 255;
  }
});
const graniteMap = granite(0.46, [1, 0.97, 0.88]);
const naosMap = granite(0.34);

const GLYPH_FONT = '"Noto Sans Egyptian Hieroglyphs"';
const glyphFontOk = await Promise.race([
  document.fonts.load(`64px ${GLYPH_FONT}`, '\u{13000}\u{132F9}').then(f => f.length > 0),
  new Promise(r => setTimeout(() => r(false), 6000)),
]).catch(() => false);

const PAL = {
  ground: '#dcc59a', blue: '#2a5d9f', deepBlue: '#1b3a6e', green: '#3f7f50', red: '#a63a28',
  yellow: '#e0aa3c', paleYellow: '#e6c27a', black: '#1c1610', white: '#efe4c8', skin: '#9a4a2a', dado: '#6e2a1c',
};
const cp = c => String.fromCodePoint(c);
const SIGNS = [0x13000, 0x1308B, 0x1309D, 0x130A7, 0x130C0, 0x1313F, 0x13153, 0x13171, 0x13191, 0x13193,
  0x131CB, 0x131F3, 0x13216, 0x13219, 0x13254, 0x132AA, 0x132F4, 0x132F9, 0x132BD, 0x1339B, 0x133A1,
  0x133CF, 0x1340D, 0x131A3, 0x13080, 0x13143].map(cp);
const GODS = [0x13060, 0x13061, 0x13062, 0x13063, 0x13064, 0x13065, 0x13066, 0x13067, 0x13068].map(cp);
const PEOPLE = [0x13000, 0x13001, 0x13003, 0x13004, 0x13007, 0x13008, 0x13009].map(cp);
const NAME = [0x132AA, 0x133CF, 0x13171, 0x130ED, 0x13153, 0x131CB, 0x132F4].map(cp);
const SUN = cp(0x131F3);

const prand = mulberry32(57);
const pick = arr => arr[Math.floor(prand() * arr.length)];
const signColor = ch => ch === SUN ? PAL.red : (prand() < 0.72 ? PAL.blue : PAL.green);

function makeCanvas(w, h) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  return [cv, cv.getContext('2d')];
}
function paintTexture(cv) {
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function glyph(ctx, ch, x, y, size, color, mirror = false) {
  ctx.save();
  ctx.translate(x, y);
  if (mirror) ctx.scale(-1, 1);
  ctx.fillStyle = color;
  if (glyphFontOk) {
    ctx.font = `${size}px ${GLYPH_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(ch, 0, 0);
    ctx.strokeStyle = color;
    ctx.lineWidth = size * 0.018;
    ctx.lineJoin = 'round';
    ctx.strokeText(ch, 0, 0);
  } else {
    ctx.beginPath();
    ctx.roundRect(-size * 0.28, -size * 0.36, size * 0.56, size * 0.72, size * 0.12);
    ctx.fill();
  }
  ctx.restore();
}

function blockBand(ctx, W, y, h) {
  ctx.fillStyle = PAL.black;
  ctx.fillRect(0, y, W, h);
  const n = Math.max(4, Math.round(W / (h * 1.5) / 4) * 4), w = W / n, g = h * 0.14;
  const cols = [PAL.blue, PAL.red, PAL.green, PAL.red];
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = cols[i % 4];
    ctx.fillRect(i * w + g, y + g, w - 2 * g, h - 2 * g);
  }
}

function stripes(ctx, W, y, h, cols) {
  const sh = h / (cols.length * 2 - 1);
  ctx.fillStyle = PAL.black;
  ctx.fillRect(0, y, W, h);
  cols.forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(0, y + i * 2 * sh, W, sh); });
}

function glyphColumn(ctx, x, y0, y1, size, framed) {
  if (framed) {
    ctx.strokeStyle = PAL.blue;
    ctx.lineWidth = Math.max(1.5, size * 0.05);
    ctx.beginPath();
    ctx.moveTo(x - size * 0.6, y0); ctx.lineTo(x - size * 0.6, y1);
    ctx.moveTo(x + size * 0.6, y0); ctx.lineTo(x + size * 0.6, y1);
    ctx.stroke();
  }
  const n = Math.max(1, Math.floor((y1 - y0) / (size * 1.05))), step = (y1 - y0) / n;
  for (let i = 0; i < n; i++) {
    const ch = pick(SIGNS);
    glyph(ctx, ch, x, y0 + step * (i + 0.5), size * 0.9, signColor(ch));
  }
}

function inscription(ctx, W, yTop, yBot, colW) {
  const n = Math.max(1, Math.round(W / colW)), w = W / n;
  for (let i = 0; i < n; i++) glyphColumn(ctx, (i + 0.5) * w, yTop + w * 0.1, yBot - w * 0.1, w * 0.8, false);
  ctx.strokeStyle = PAL.blue;
  ctx.lineWidth = 2;
  for (let i = 0; i <= n; i++) {
    ctx.beginPath(); ctx.moveTo(i * w, yTop); ctx.lineTo(i * w, yBot); ctx.stroke();
  }
}

function cartouche(ctx, cx, cy, w, h, signs) {
  const vertical = h > w, t = Math.min(w, h);
  ctx.beginPath();
  ctx.roundRect(cx - w / 2, cy - h / 2, w, h, t / 2);
  ctx.fillStyle = PAL.white;
  ctx.fill();
  ctx.lineWidth = t * 0.08;
  ctx.strokeStyle = PAL.red;
  ctx.stroke();
  ctx.fillStyle = PAL.red;
  if (vertical) ctx.fillRect(cx - t * 0.6, cy + h / 2, t * 1.2, t * 0.1);
  else ctx.fillRect(cx + w / 2, cy - t * 0.6, t * 0.1, t * 1.2);
  const len = (vertical ? h : w) - t * 0.5, step = len / signs.length;
  const size = Math.min(t * 0.68, step * 1.1);
  signs.forEach((ch, i) => {
    const o = -len / 2 + step * (i + 0.5);
    glyph(ctx, ch, vertical ? cx : cx + o, vertical ? cy + o : cy, size, ch === SUN ? PAL.red : PAL.blue);
  });
}

function khekerFrieze(ctx, W, yTop, h) {
  const n = Math.max(3, Math.round(W / (h * 0.42) / 3) * 3), step = W / n, bw = step * 0.66;
  const cols = [PAL.green, PAL.red, PAL.blue];
  ctx.lineWidth = Math.max(1.5, step * 0.04);
  ctx.strokeStyle = PAL.black;
  for (let i = 0; i < n; i++) {
    const cx = (i + 0.5) * step, yb = yTop + h;
    ctx.fillStyle = cols[i % 3];
    ctx.beginPath();
    ctx.moveTo(cx - bw / 2, yb);
    ctx.lineTo(cx - bw / 2, yTop + h * 0.42);
    ctx.quadraticCurveTo(cx - bw / 2, yTop + h * 0.3, cx, yTop + h * 0.3);
    ctx.quadraticCurveTo(cx + bw / 2, yTop + h * 0.3, cx + bw / 2, yTop + h * 0.42);
    ctx.lineTo(cx + bw / 2, yb);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = PAL.yellow;
    ctx.fillRect(cx - bw / 2, yTop + h * 0.52, bw, h * 0.07);
    ctx.fillStyle = cols[(i + 1) % 3];
    ctx.beginPath();
    ctx.ellipse(cx, yTop + h * 0.17, bw * 0.34, h * 0.13, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
  }
}

function offeringStand(ctx, cx, yBase, h) {
  ctx.lineWidth = Math.max(1.5, h * 0.015);
  ctx.strokeStyle = PAL.black;
  ctx.fillStyle = PAL.yellow;
  ctx.fillRect(cx - h * 0.05, yBase - h * 0.62, h * 0.1, h * 0.62);
  ctx.strokeRect(cx - h * 0.05, yBase - h * 0.62, h * 0.1, h * 0.62);
  ctx.fillStyle = PAL.red;
  ctx.fillRect(cx - h * 0.3, yBase - h * 0.68, h * 0.6, h * 0.06);
  ctx.strokeRect(cx - h * 0.3, yBase - h * 0.68, h * 0.6, h * 0.06);
  [PAL.yellow, PAL.red, PAL.green, PAL.yellow, PAL.red].forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.ellipse(cx + (i - 2) * h * 0.11, yBase - h * 0.68, h * 0.055, h * 0.09, 0, Math.PI, 0);
    ctx.fill(); ctx.stroke();
  });
  ctx.fillStyle = PAL.blue;
  ctx.beginPath();
  ctx.moveTo(cx, yBase - h * 0.78);
  ctx.lineTo(cx - h * 0.12, yBase - h);
  ctx.lineTo(cx, yBase - h * 0.93);
  ctx.lineTo(cx + h * 0.12, yBase - h);
  ctx.closePath(); ctx.fill(); ctx.stroke();
}

function sceneRegister(ctx, W, yTop, yBot, n) {
  const h = yBot - yTop, sw = W / n;
  for (let i = 0; i < n; i++) {
    const x0 = i * sw;
    const fig = Math.min(h * 0.62, sw * 0.42);
    const yFig = yBot - fig * 0.55;
    glyph(ctx, pick(GODS), x0 + sw * 0.25, yFig, fig, pick([PAL.blue, PAL.green, PAL.yellow]), true);
    glyph(ctx, pick(PEOPLE), x0 + sw * 0.75, yFig, fig, PAL.skin);
    offeringStand(ctx, x0 + sw * 0.5, yBot - h * 0.02, Math.min(h * 0.42, sw * 0.3));
    const cs = Math.min(h * 0.09, sw * 0.05);
    for (let k = 0; k < 3; k++) {
      glyphColumn(ctx, x0 + sw * 0.14 + k * cs * 1.3, yTop + h * 0.04, yTop + h * 0.3, cs, false);
      glyphColumn(ctx, x0 + sw * 0.86 - k * cs * 1.3, yTop + h * 0.04, yTop + h * 0.3, cs, false);
    }
  }
}

function leafRow(ctx, W, yTop, yBot, n, cols, redTips = false) {
  const w = W / n, h = yBot - yTop;
  ctx.lineWidth = Math.max(1.5, w * 0.03);
  ctx.strokeStyle = PAL.black;
  for (let i = 0; i <= n; i++) {
    const x = i * w;
    ctx.fillStyle = cols[2];
    ctx.beginPath();
    ctx.moveTo(x - w * 0.4, yBot); ctx.lineTo(x, yTop + h * 0.25); ctx.lineTo(x + w * 0.4, yBot);
    ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  for (let i = 0; i < n; i++) {
    const x = i * w;
    ctx.fillStyle = cols[0];
    ctx.beginPath();
    ctx.moveTo(x + w * 0.02, yBot); ctx.lineTo(x + w / 2, yTop); ctx.lineTo(x + w * 0.98, yBot);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = cols[1];
    ctx.beginPath();
    ctx.moveTo(x + w * 0.3, yBot); ctx.lineTo(x + w / 2, yTop + h * 0.4); ctx.lineTo(x + w * 0.7, yBot);
    ctx.closePath(); ctx.fill();
    if (redTips) {
      ctx.fillStyle = PAL.red;
      ctx.beginPath();
      ctx.moveTo(x + w * 0.42, yTop + h * 0.12); ctx.lineTo(x + w / 2, yTop); ctx.lineTo(x + w * 0.58, yTop + h * 0.12);
      ctx.closePath(); ctx.fill();
    }
  }
}

function star(ctx, x, y, r) {
  ctx.beginPath();
  for (let k = 0; k < 10; k++) {
    const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? r * 0.38 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fillStyle = PAL.yellow;
  ctx.fill();
  ctx.fillStyle = PAL.red;
  ctx.beginPath(); ctx.arc(x, y, r * 0.18, 0, Math.PI * 2); ctx.fill();
}

function starField(ctx, x0, x1, y0, y1, spacing) {
  ctx.fillStyle = PAL.deepBlue;
  ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  ctx.save();
  ctx.beginPath(); ctx.rect(x0, y0, x1 - x0, y1 - y0); ctx.clip();
  const rows = Math.round((y1 - y0) / spacing);
  for (let j = 0; j < rows; j++) {
    for (let x = x0 + (0.5 + (j % 2) * 0.5) * spacing - spacing; x < x1 + spacing; x += spacing) {
      star(ctx, x, y0 + (j + 0.5) * spacing, spacing * 0.28);
    }
  }
  ctx.restore();
}

function featherFill(ctx, xa, xw, top, tot, scale) {
  ctx.fillStyle = PAL.red; ctx.fillRect(xa, top, xw, tot * 0.3);
  ctx.fillStyle = PAL.yellow; ctx.fillRect(xa, top + tot * 0.3, xw, tot * 0.05);
  ctx.fillStyle = PAL.green; ctx.fillRect(xa, top + tot * 0.35, xw, tot * 0.17);
  ctx.fillStyle = PAL.blue; ctx.fillRect(xa, top + tot * 0.52, xw, tot * 0.5);
  const r = scale * 0.035;
  ctx.fillStyle = PAL.white;
  for (let x = xa; x < xa + xw; x += r * 2) {
    ctx.beginPath(); ctx.arc(x + r, top + tot * 0.18, r * 0.75, 0, Math.PI); ctx.fill();
  }
  ctx.lineWidth = Math.max(1.5, scale * 0.008);
  ctx.strokeStyle = PAL.black;
  for (let x = xa; x < xa + xw; x += scale * 0.055) {
    ctx.beginPath(); ctx.moveTo(x, top + tot * 0.52); ctx.lineTo(x, top + tot); ctx.stroke();
  }
}

function vulture(ctx, cx, cy, span) {
  const s = span / 2, wh = span * 0.2;
  ctx.lineWidth = Math.max(2, span * 0.006);
  ctx.strokeStyle = PAL.black;
  ctx.fillStyle = PAL.blue;
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.08, cy - wh * 0.3); ctx.lineTo(cx - s * 0.17, cy - wh * 1.55);
  ctx.lineTo(cx + s * 0.17, cy - wh * 1.55); ctx.lineTo(cx + s * 0.08, cy - wh * 0.3);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  for (const d of [-1, 1]) {
    ctx.strokeStyle = PAL.yellow; ctx.lineWidth = span * 0.012;
    ctx.beginPath(); ctx.arc(cx + d * s * 0.26, cy - wh * 1.0, s * 0.055, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = PAL.red; ctx.fillRect(cx + d * s * 0.26 - s * 0.07, cy - wh * 0.98 + s * 0.05, s * 0.14, s * 0.02);
  }
  ctx.strokeStyle = PAL.black; ctx.lineWidth = Math.max(2, span * 0.006);
  for (const d of [-1, 1]) {
    const top = cy - wh * 0.65, bot = cy + wh * 0.55;
    ctx.beginPath();
    ctx.moveTo(cx + d * s * 0.08, cy - wh * 0.5);
    ctx.lineTo(cx + d * s, cy - wh * 0.62);
    ctx.lineTo(cx + d * s, cy + wh * 0.3);
    ctx.lineTo(cx + d * s * 0.08, cy + wh * 0.5);
    ctx.closePath();
    ctx.save(); ctx.clip();
    featherFill(ctx, Math.min(cx, cx + d * s), s * 1.05, top, bot - top, s);
    ctx.restore();
    ctx.lineWidth = Math.max(2, span * 0.006);
    ctx.stroke();
  }
  ctx.fillStyle = PAL.deepBlue;
  ctx.beginPath(); ctx.ellipse(cx, cy, s * 0.1, wh * 0.75, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = PAL.white;
  ctx.beginPath(); ctx.arc(cx, cy + wh * 0.92, s * 0.06, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = PAL.yellow;
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.025, cy + wh * 1.05); ctx.lineTo(cx, cy + wh * 1.28); ctx.lineTo(cx + s * 0.025, cy + wh * 1.05);
  ctx.closePath(); ctx.fill(); ctx.stroke();
}

function wallTexture() {
  const W = 1024, H = 1366, mx = W / 12, my = H / 16;
  const [cv, ctx] = makeCanvas(W, H);
  const Y = m => H - m * my;
  ctx.fillStyle = PAL.ground; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = PAL.dado; ctx.fillRect(0, Y(0.9), W, 0.9 * my);
  ctx.fillStyle = PAL.yellow; ctx.fillRect(0, Y(1.0), W, 0.1 * my);
  blockBand(ctx, W, Y(1.25), 0.25 * my);
  sceneRegister(ctx, W, Y(4.9), Y(1.25), 3);
  blockBand(ctx, W, Y(5.2), 0.3 * my);
  sceneRegister(ctx, W, Y(8.9), Y(5.2), 3);
  blockBand(ctx, W, Y(9.2), 0.3 * my);
  inscription(ctx, W, Y(11.2), Y(9.2), 0.5 * mx);
  blockBand(ctx, W, Y(11.5), 0.3 * my);
  sceneRegister(ctx, W, Y(14.2), Y(11.5), 3);
  blockBand(ctx, W, Y(14.45), 0.25 * my);
  khekerFrieze(ctx, W, Y(16), 1.55 * my);
  return paintTexture(cv);
}

function pylonTexture() {
  const W = 1024, H = 1152, mx = W / 32, my = H / 36;
  const [cv, ctx] = makeCanvas(W, H);
  const Y = m => H - m * my;
  ctx.fillStyle = PAL.ground; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = PAL.dado; ctx.fillRect(0, Y(1.5), W, 1.5 * my);
  ctx.fillStyle = PAL.yellow; ctx.fillRect(0, Y(1.7), W, 0.2 * my);
  blockBand(ctx, W, Y(2.2), 0.5 * my);
  sceneRegister(ctx, W, Y(20), Y(2.2), 1);
  blockBand(ctx, W, Y(20.6), 0.6 * my);
  sceneRegister(ctx, W, Y(28.4), Y(20.6), 2);
  blockBand(ctx, W, Y(29), 0.6 * my);
  inscription(ctx, W, Y(32.4), Y(29), 1.3 * mx);
  khekerFrieze(ctx, W, Y(34.5), 2.1 * my);
  return paintTexture(cv);
}

function architraveTexture() {
  const W = 1024, H = 256;
  const [cv, ctx] = makeCanvas(W, H);
  ctx.fillStyle = PAL.paleYellow; ctx.fillRect(0, 0, W, H);
  blockBand(ctx, W, 0, H * 0.13);
  blockBand(ctx, W, H * 0.87, H * 0.13);
  cartouche(ctx, W / 2, H / 2, H * 1.9, H * 0.58, NAME);
  const size = H * 0.5;
  for (let x = size * 0.6; x < W / 2 - H * 1.05; x += size * 0.95) {
    for (const gx of [x, W - x]) { const ch = pick(SIGNS); glyph(ctx, ch, gx, H / 2, size, signColor(ch)); }
  }
  return paintTexture(cv);
}

function abacusTexture() {
  const W = 512, H = 128;
  const [cv, ctx] = makeCanvas(W, H);
  ctx.fillStyle = PAL.ground; ctx.fillRect(0, 0, W, H);
  blockBand(ctx, W, 0, 14);
  blockBand(ctx, W, H - 14, 14);
  cartouche(ctx, W / 2, H / 2, 300, 72, NAME);
  glyph(ctx, cp(0x132F9), 58, H / 2, 70, PAL.green, true);
  glyph(ctx, cp(0x132F9), W - 58, H / 2, 70, PAL.green);
  return paintTexture(cv);
}

function labTexture() {
  const W = 768, H = 832, mx = W / 6, my = H / 6.5;
  const [cv, ctx] = makeCanvas(W, H);
  const Y = m => H - m * my;
  ctx.fillStyle = PAL.ground; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = PAL.dado; ctx.fillRect(0, Y(0.7), W, 0.7 * my);
  blockBand(ctx, W, Y(0.95), 0.25 * my);
  inscription(ctx, W, Y(4.6), Y(0.95), 0.3 * mx);
  blockBand(ctx, W, Y(4.85), 0.25 * my);
  sceneRegister(ctx, W, Y(6.2), Y(4.85), 2);
  blockBand(ctx, W, Y(6.5), 0.3 * my);
  return paintTexture(cv);
}

function standingFigure(ctx, x, yBase, h, dir, head) {
  ctx.save();
  ctx.translate(x, yBase);
  ctx.scale(dir * h, h);
  ctx.lineWidth = 0.012;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = PAL.black;
  const poly = (pts, fill) => {
    ctx.beginPath(); pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, -py) : ctx.moveTo(px, -py)));
    ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); ctx.stroke();
  };
  const god = head !== 'king';
  poly([[-0.09, 0.45], [-0.15, 0.02], [-0.08, 0], [-0.03, 0.45]], PAL.skin);
  poly([[0.0, 0.45], [0.13, 0.02], [0.21, 0], [0.06, 0.45]], PAL.skin);
  poly([[-0.09, 0.62], [-0.11, 0.86], [0.1, 0.86], [0.07, 0.62]], PAL.skin);
  poly([[-0.1, 0.64], [0.09, 0.64], [0.16, 0.38], [-0.12, 0.38]], god ? PAL.yellow : PAL.white);
  poly([[-0.02, 0.82], [-0.14, 0.62], [-0.11, 0.6], [0.02, 0.78]], PAL.skin);
  poly([[0.04, 0.84], [0.25, 0.98], [0.27, 0.94], [0.08, 0.78]], PAL.skin);
  poly([[0.24, 0.94], [0.31, 0.94], [0.32, 1.06], [0.29, 1.12], [0.26, 1.12], [0.23, 1.06]], PAL.yellow);
  poly([[0.3, 1.1], [0.38, 1.17], [0.37, 1.19], [0.29, 1.13]], PAL.yellow);
  if (god) poly([[-0.1, 0.84], [-0.11, 1.02], [0.04, 1.06], [0.07, 0.97], [0.05, 0.8]], PAL.blue);
  if (head === 'falcon') {
    ctx.beginPath(); ctx.ellipse(0.02, -0.97, 0.075, 0.08, 0, 0, Math.PI * 2); ctx.fillStyle = PAL.blue; ctx.fill(); ctx.stroke();
    poly([[0.08, 0.99], [0.15, 0.95], [0.08, 0.93]], PAL.yellow);
    poly([[-0.05, 1.04], [0.07, 1.04], [0.05, 1.16], [-0.03, 1.16]], PAL.white);
    poly([[-0.07, 1.04], [0.08, 1.04], [0.08, 1.1], [-0.07, 1.1]], PAL.red);
  } else if (head === 'ibis') {
    ctx.beginPath(); ctx.ellipse(0.02, -0.97, 0.06, 0.065, 0, 0, Math.PI * 2); ctx.fillStyle = PAL.black; ctx.fill();
    ctx.strokeStyle = PAL.black; ctx.lineWidth = 0.022;
    ctx.beginPath(); ctx.moveTo(0.06, -0.97); ctx.quadraticCurveTo(0.18, -0.97, 0.22, -0.85); ctx.stroke();
    ctx.lineWidth = 0.012;
    ctx.beginPath(); ctx.arc(0.02, -1.08, 0.045, 0, Math.PI * 2); ctx.fillStyle = PAL.red; ctx.fill(); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.ellipse(0.02, -0.95, 0.065, 0.075, 0, 0, Math.PI * 2); ctx.fillStyle = PAL.skin; ctx.fill(); ctx.stroke();
    poly([[-0.05, 0.99], [0.06, 0.99], [0.04, 1.2], [0.0, 1.24], [-0.03, 1.2]], PAL.white);
    poly([[-0.07, 0.98], [0.08, 0.98], [0.08, 1.06], [-0.02, 1.06], [-0.02, 1.16], [-0.07, 1.16]], PAL.red);
  }
  ctx.restore();
  return [x + dir * 0.38 * h, yBase - 1.18 * h];
}

function purification(ctx, cx, yTop, yBot, mx) {
  const h = (yBot - yTop) * 0.7, ANKH = cp(0x132F9);
  const spouts = [standingFigure(ctx, cx - 0.95 * mx, yBot, h, 1, 'falcon'), standingFigure(ctx, cx + 0.95 * mx, yBot, h, -1, 'ibis')];
  standingFigure(ctx, cx - 0.05 * mx, yBot, h * 0.95, 1, 'king');
  spouts.forEach(([x0, y0], i) => {
    const s = i ? 1 : -1, x1 = cx - s * 0.32 * mx, y1 = yBot - h * 0.05, ctrl = [cx - s * 0.1 * mx, yTop + h * 0.02];
    for (let k = 1, n = 11; k < n; k++) {
      const t = k / n, u = 1 - t;
      glyph(ctx, ANKH, u * u * x0 + 2 * u * t * ctrl[0] + t * t * x1, u * u * y0 + 2 * u * t * ctrl[1] + t * t * y1, h * 0.095, PAL.blue);
    }
  });
}

function chamberTexture() {
  const W = 512, H = 1280, mx = W / 4, my = H / 10;
  const [cv, ctx] = makeCanvas(W, H);
  ctx.fillStyle = PAL.ground; ctx.fillRect(0, 0, W, H);
  for (const half of [0, 1]) {
    const Y = m => (half + 1) * H / 2 - m * my;
    ctx.fillStyle = PAL.dado; ctx.fillRect(0, Y(0.7), W, 0.7 * my);
    blockBand(ctx, W, Y(0.95), 0.25 * my);
    if (half === 0) {
      inscription(ctx, W, Y(3.3), Y(0.95), 0.26 * mx);
      blockBand(ctx, W, Y(3.5), 0.2 * my);
      sceneRegister(ctx, W, Y(4.4), Y(3.5), 1);
    } else {
      inscription(ctx, W, Y(3.4), Y(0.95), 0.2 * mx);
      ctx.fillStyle = PAL.ground; ctx.fillRect(W / 2 - 1.3 * mx, Y(3.4), 2.6 * mx, 2.45 * my);
      purification(ctx, W / 2, Y(3.4), Y(0.95), mx);
      blockBand(ctx, W, Y(3.6), 0.2 * my);
      inscription(ctx, W, Y(4.4), Y(3.6), 0.2 * mx);
    }
    blockBand(ctx, W, Y(4.6), 0.2 * my);
  }
  return paintTexture(cv);
}

function bearer(ctx, x, yBase, h, nile) {
  ctx.save();
  ctx.translate(x, yBase);
  ctx.scale(h, h);
  ctx.lineWidth = 0.012;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = PAL.black;
  const poly = (pts, fill) => {
    ctx.beginPath(); pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, -py) : ctx.moveTo(px, -py)));
    ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); ctx.stroke();
  };
  const oval = (cx, cy, rx, ry, fill) => {
    ctx.beginPath(); ctx.ellipse(cx, -cy, rx, ry, 0, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill(); ctx.stroke();
  };
  const skin = nile ? PAL.blue : PAL.skin;
  poly([[-0.09, 0.45], [-0.15, 0.02], [-0.08, 0], [-0.03, 0.45]], skin);
  poly([[0.0, 0.45], [0.13, 0.02], [0.21, 0], [0.06, 0.45]], skin);
  poly([[-0.09, 0.62], [-0.11, 0.86], [0.1, 0.86], [0.07, 0.62]], skin);
  if (nile) poly([[0.04, 0.78], [0.15, 0.7], [0.14, 0.55], [0.03, 0.5]], skin);
  poly(nile ? [[-0.1, 0.56], [0.1, 0.56], [0.12, 0.42], [-0.11, 0.42]]
    : [[-0.1, 0.64], [0.09, 0.64], [0.16, 0.38], [-0.12, 0.38]], PAL.white);
  poly([[-0.02, 0.82], [-0.12, 0.6], [-0.08, 0.59], [0.02, 0.78]], skin);
  if (nile) {
    ctx.strokeStyle = PAL.green; ctx.lineWidth = 0.014;
    ctx.beginPath(); ctx.moveTo(-0.1, -0.6); ctx.quadraticCurveTo(-0.16, -0.5, -0.13, -0.36); ctx.stroke();
    ctx.strokeStyle = PAL.black; ctx.lineWidth = 0.012;
    poly([[-0.13, 0.37], [-0.19, 0.27], [-0.13, 0.31], [-0.07, 0.27]], PAL.blue);
  } else poly([[-0.14, 0.6], [-0.05, 0.6], [-0.04, 0.5], [-0.09, 0.47], [-0.15, 0.5]], PAL.red);
  poly([[0.04, 0.84], [0.24, 0.9], [0.25, 0.86], [0.08, 0.78]], skin);
  poly([[0.08, 0.93], [0.44, 0.93], [0.41, 0.9], [0.11, 0.9]], nile ? PAL.yellow : PAL.red);
  if (nile) {
    for (const vx of [0.15, 0.37]) {
      poly([[vx - 0.03, 0.93], [vx + 0.03, 0.93], [vx + 0.035, 1.03], [vx + 0.015, 1.08], [vx - 0.015, 1.08], [vx - 0.035, 1.03]], PAL.yellow);
      poly([[vx + 0.01, 1.06], [vx + 0.06, 1.1], [vx + 0.055, 1.12], [vx + 0.005, 1.08]], PAL.yellow);
    }
    poly([[0.21, 0.93], [0.31, 0.93], [0.33, 1.0], [0.29, 1.06], [0.23, 1.06], [0.19, 1.0]], PAL.blue);
  } else {
    ctx.lineWidth = 0.018; ctx.strokeStyle = PAL.yellow;
    for (const gx of [0.15, 0.37]) { ctx.beginPath(); ctx.arc(gx, -0.98, 0.04, 0, Math.PI * 2); ctx.stroke(); }
    ctx.lineWidth = 0.012; ctx.strokeStyle = PAL.black;
    oval(0.22, 0.96, 0.035, 0.028, PAL.deepBlue);
    oval(0.3, 0.96, 0.035, 0.028, PAL.green);
    oval(0.26, 1.01, 0.032, 0.026, PAL.red);
  }
  oval(0.02, 0.95, 0.065, 0.075, skin);
  if (nile) {
    poly([[-0.08, 0.86], [-0.09, 1.0], [0.04, 1.03], [0.06, 0.96], [0.04, 0.84]], PAL.deepBlue);
    ctx.strokeStyle = PAL.green; ctx.lineWidth = 0.014;
    for (const a of [-0.5, -0.17, 0.17, 0.5]) {
      ctx.beginPath(); ctx.moveTo(0.0, -1.03); ctx.lineTo(Math.sin(a) * 0.12, -1.03 - Math.cos(a) * 0.12); ctx.stroke();
    }
    ctx.strokeStyle = PAL.black; ctx.lineWidth = 0.012;
  } else poly([[-0.08, 0.88], [-0.08, 1.0], [0.05, 1.03], [0.07, 0.96], [0.0, 0.9]], PAL.black);
  ctx.fillStyle = PAL.white; ctx.beginPath(); ctx.arc(0.06, -0.96, 0.012, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function storeTexture() {
  const W = 512, H = 1664, mx = W / 4, my = H / 13;
  const [cv, ctx] = makeCanvas(W, H);
  ctx.fillStyle = PAL.ground; ctx.fillRect(0, 0, W, H);
  for (const half of [0, 1]) {
    const Y = m => (half + 1) * H / 2 - m * my;
    ctx.fillStyle = PAL.dado; ctx.fillRect(0, Y(0.7), W, 0.7 * my);
    blockBand(ctx, W, Y(0.95), 0.25 * my);
    for (let i = 0; i < 4; i++) bearer(ctx, (i + 0.35) * mx, Y(1.05), 1.55 * my, half === 1);
    blockBand(ctx, W, Y(3.15), 0.2 * my);
    sceneRegister(ctx, W, Y(4.75), Y(3.15), 1);
    blockBand(ctx, W, Y(4.95), 0.2 * my);
    inscription(ctx, W, Y(5.95), Y(4.95), 0.26 * mx);
    khekerFrieze(ctx, W, Y(6.5), 0.55 * my);
  }
  return paintTexture(cv);
}

function priest(ctx, x, yBase, h, emblem) {
  ctx.lineWidth = Math.max(1.5, h * 0.012);
  ctx.strokeStyle = PAL.black;
  ctx.fillStyle = PAL.skin;
  for (const [hx, fx] of [[-0.02, -0.13], [0.02, 0.15]]) {
    ctx.beginPath();
    ctx.moveTo(x + hx * h - h * 0.03, yBase - h * 0.45); ctx.lineTo(x + fx * h - h * 0.025, yBase - h * 0.02);
    ctx.lineTo(x + fx * h + h * 0.06, yBase); ctx.lineTo(x + fx * h + h * 0.02, yBase - h * 0.04);
    ctx.lineTo(x + hx * h + h * 0.04, yBase - h * 0.45); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(x - h * 0.07, yBase - h * 0.6); ctx.lineTo(x - h * 0.09, yBase - h * 0.84);
  ctx.lineTo(x + h * 0.09, yBase - h * 0.84); ctx.lineTo(x + h * 0.06, yBase - h * 0.6);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(x + h * 0.02, yBase - h * 0.92, h * 0.065, h * 0.075, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = PAL.white;
  ctx.beginPath();
  ctx.moveTo(x - h * 0.08, yBase - h * 0.62); ctx.lineTo(x + h * 0.08, yBase - h * 0.62);
  ctx.lineTo(x + h * 0.15, yBase - h * 0.36); ctx.lineTo(x - h * 0.11, yBase - h * 0.36);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = PAL.black; ctx.beginPath(); ctx.arc(x + h * 0.06, yBase - h * 0.93, h * 0.01, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = PAL.skin; ctx.lineWidth = h * 0.035;
  ctx.beginPath(); ctx.moveTo(x + h * 0.05, yBase - h * 0.8); ctx.lineTo(x + h * 0.19, yBase - h * 0.66); ctx.stroke();
  ctx.strokeStyle = PAL.yellow; ctx.lineWidth = h * 0.025;
  ctx.beginPath(); ctx.moveTo(x + h * 0.2, yBase - h * 0.3); ctx.lineTo(x + h * 0.2, yBase - h * 1.08); ctx.stroke();
  const ey = yBase - h * 1.16;
  if (emblem === 1) {
    ctx.fillStyle = PAL.red; ctx.strokeStyle = PAL.black; ctx.lineWidth = Math.max(1.5, h * 0.012);
    ctx.beginPath(); ctx.arc(x + h * 0.2, ey, h * 0.07, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  } else glyph(ctx, cp(emblem === 0 ? 0x1313F : 0x132F9), x + h * 0.2, ey, h * 0.2, emblem === 0 ? PAL.blue : PAL.green, true);
}

function stairTexture() {
  const W = 1024, H = 512, mx = W / 8, my = H / 4;
  const [cv, ctx] = makeCanvas(W, H);
  const Y = m => H - m * my;
  ctx.fillStyle = PAL.ground; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = PAL.dado; ctx.fillRect(0, Y(0.5), W, 0.5 * my);
  ctx.fillStyle = PAL.yellow; ctx.fillRect(0, Y(0.58), W, 0.08 * my);
  blockBand(ctx, W, Y(0.8), 0.2 * my);
  for (let i = 0; i < 7; i++) priest(ctx, (i + 0.45) * W / 7, Y(0.85), 1.35 * my, i % 3);
  blockBand(ctx, W, Y(2.75), 0.2 * my);
  inscription(ctx, W, Y(3.45), Y(2.75), 0.32 * mx);
  khekerFrieze(ctx, W, Y(4.0), 0.55 * my);
  return paintTexture(cv);
}

function starTexture() {
  const [cv, ctx] = makeCanvas(512, 512);
  starField(ctx, 0, 512, 0, 512, 128);
  return paintTexture(cv);
}

function pronaosCeilingTexture() {
  const W = 2048, H = 768, m = W / 32;
  const [cv, ctx] = makeCanvas(W, H);
  const X = xm => (xm + 16) * m;
  starField(ctx, 0, W, 0, H, H / 8);
  ctx.fillStyle = PAL.ground; ctx.fillRect(X(-2.4), 0, X(2.4) - X(-2.4), H);
  for (const [a, b] of [[-2.4, -1.8], [1.8, 2.4]]) {
    ctx.fillStyle = PAL.paleYellow; ctx.fillRect(X(a), 0, X(b) - X(a), H);
    glyphColumn(ctx, (X(a) + X(b)) / 2, 0, H, (X(b) - X(a)) * 0.62, true);
    ctx.fillStyle = PAL.black;
    ctx.fillRect(X(a) - 2, 0, 4, H); ctx.fillRect(X(b) - 2, 0, 4, H);
  }
  for (const y of [H * 0.25, H * 0.75]) vulture(ctx, X(0), y, 3.5 * m);
  for (const y of [0, H / 2, H]) cartouche(ctx, X(0), y, 3.2 * m, 0.75 * m, NAME);
  return paintTexture(cv);
}

function columnTexture(W, H, f, scenes) {
  const [cv, ctx] = makeCanvas(W, H);
  const Y = v => H * (1 - v), bh = H * 0.012;
  ctx.fillStyle = PAL.ground; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = PAL.dado; ctx.fillRect(0, Y(f.base), W, H - Y(f.base));
  leafRow(ctx, W, Y(f.foot), Y(f.base + 0.004), Math.round(W / 90), [PAL.green, PAL.yellow, PAL.blue]);
  blockBand(ctx, W, Y(f.foot) - bh, bh);
  const r0 = f.foot + 0.012, r1 = r0 + (f.shaft - r0) * 0.5;
  sceneRegister(ctx, W, Y(r1) + bh, Y(r0), scenes);
  blockBand(ctx, W, Y(r1), bh);
  const u1 = f.shaft - 0.012, n = scenes * 2, w = W / n;
  for (let i = 0; i < n; i++) {
    const cx = (i + 0.5) * w;
    if (i % 2 === 0) cartouche(ctx, cx, (Y(u1) + Y(r1)) / 2, w * 0.45, (Y(r1) - Y(u1)) * 0.8, NAME);
    else for (let k = -1; k <= 1; k++) glyphColumn(ctx, cx + k * w * 0.26, Y(u1) + bh, Y(r1) - bh, w * 0.2, true);
  }
  blockBand(ctx, W, Y(f.shaft), bh);
  stripes(ctx, W, Y(f.bands), Y(f.shaft) - Y(f.bands), [PAL.red, PAL.blue, PAL.green, PAL.blue, PAL.red]);
  const mid = (f.bands + 0.985) / 2;
  leafRow(ctx, W, Y(mid + 0.02), Y(f.bands), Math.round(W / 60), [PAL.green, PAL.yellow, PAL.blue]);
  leafRow(ctx, W, Y(0.985), Y(mid - 0.01), Math.round(W / 85), [PAL.blue, PAL.green, PAL.yellow], true);
  blockBand(ctx, W, 0, Y(0.985));
  return paintTexture(cv);
}

function uraeusTexture() {
  const W = 512, H = 128, n = 8, w = W / n;
  const [cv, ctx] = makeCanvas(W, H);
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = PAL.black;
  for (let i = 0; i < n; i++) {
    const cx = (i + 0.5) * w;
    ctx.fillStyle = PAL.yellow;
    ctx.beginPath(); ctx.ellipse(cx, H * 0.9, w * 0.44, H * 0.085, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = PAL.green;
    ctx.fillRect(cx - w * 0.12, H * 0.5, w * 0.24, H * 0.34); ctx.strokeRect(cx - w * 0.12, H * 0.5, w * 0.24, H * 0.34);
    ctx.fillStyle = PAL.blue;
    ctx.beginPath(); ctx.ellipse(cx, H * 0.52, w * 0.3, H * 0.2, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = PAL.red; ctx.fillRect(cx - w * 0.07, H * 0.38, w * 0.14, H * 0.3);
    ctx.fillStyle = PAL.yellow;
    for (const y of [0.44, 0.54, 0.64]) ctx.fillRect(cx - w * 0.07, H * y, w * 0.14, H * 0.025);
    ctx.fillStyle = PAL.green;
    ctx.beginPath(); ctx.ellipse(cx, H * 0.3, w * 0.13, H * 0.065, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = PAL.red;
    ctx.beginPath(); ctx.arc(cx, H * 0.15, w * 0.2, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }
  return paintTexture(cv);
}

function wingedDiskTexture() {
  const W = 1024, H = 256, cx = W / 2, cy = H * 0.45, r = H * 0.25;
  const [cv, ctx] = makeCanvas(W, H);
  for (const d of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(cx + d * r * 0.6, cy - r * 0.55);
    ctx.quadraticCurveTo(cx + d * W * 0.3, cy - r * 1.25, cx + d * W * 0.495, cy - r * 0.95);
    ctx.lineTo(cx + d * W * 0.47, cy + r * 0.25);
    ctx.quadraticCurveTo(cx + d * W * 0.3, cy + r * 0.9, cx + d * r * 0.6, cy + r * 0.95);
    ctx.closePath();
    ctx.save(); ctx.clip();
    const top = cy - r * 1.3, tot = r * 2.3;
    featherFill(ctx, Math.min(cx, cx + d * W * 0.5), W * 0.5, top, tot, W * 0.45);
    ctx.restore();
    ctx.lineWidth = 3; ctx.strokeStyle = PAL.black; ctx.stroke();
    const ux = cx + d * r * 1.05;
    ctx.fillStyle = PAL.green;
    ctx.beginPath(); ctx.ellipse(ux, cy + r * 0.35, r * 0.2, r * 0.55, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = PAL.red;
    ctx.beginPath(); ctx.arc(ux, cy - r * 0.35, r * 0.18, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }
  ctx.fillStyle = PAL.red;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  ctx.lineWidth = 5; ctx.strokeStyle = PAL.yellow; ctx.stroke();
  const tex = paintTexture(cv);
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

const paintTex = {
  wall: wallTexture(),
  pylon: pylonTexture(),
  arch: architraveTexture(),
  abacus: abacusTexture(),
  stars: starTexture(),
  ceiling: pronaosCeilingTexture(),
  courtCol: columnTexture(768, 1536, { base: 0.042, foot: 0.146, shaft: 0.792, bands: 0.854 }, 2),
  proCol: columnTexture(1024, 2048, { base: 0.04, foot: 0.143, shaft: 0.746, bands: 0.80 }, 3),
  uraeus: uraeusTexture(),
  disk: wingedDiskTexture(),
  lab: labTexture(),
  stair: stairTexture(),
  rooms: chamberTexture(),
  stores: storeTexture(),
};

export { PAL, floorMap, graniteMap, naosMap, paintTex, rand, sandMap, stoneBump, stoneMap };
