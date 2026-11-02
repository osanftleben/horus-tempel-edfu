import { renderer } from './szene.js';
import { ANSICHTEN } from './ansichten.js';

const LADEN = performance.now();
const STUNDEN = { Tag: 12, Nacht: 22 };
const WARM = 12;

const gl = renderer.getContext();
const timer = gl.getExtension('EXT_disjoint_timer_query_webgl2');
const px = new Uint8Array(4);
const median = a => { const s = [...a].sort((x, y) => x - y); return s.length ? s[s.length >> 1] : NaN; };
const quart = (a, q) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(s.length * q))]; };
const pause = () => new Promise(r => setTimeout(r));

const raf = window.requestAnimationFrame;
let frameCb = null;
async function holdLoop() {
  window.requestAnimationFrame = cb => { frameCb = cb; return 0; };
  while (!frameCb) await new Promise(r => setTimeout(r, 5));
}
function releaseLoop() {
  window.requestAnimationFrame = raf;
  const cb = frameCb; frameCb = null;
  raf(cb);
}

function oneFrame() {
  const cb = frameCb; frameCb = null;
  let q = null;
  if (timer) { q = gl.createQuery(); gl.beginQuery(timer.TIME_ELAPSED_EXT, q); }
  const t0 = performance.now();
  cb(t0);
  const t1 = performance.now();
  if (q) gl.endQuery(timer.TIME_ELAPSED_EXT);
  renderer.setRenderTarget(null);
  gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
  return { bild: performance.now() - t0, cpu: t1 - t0, q };
}
function gpuTime(q) {
  if (!q) return NaN;
  const ok = gl.getQueryParameter(q, gl.QUERY_RESULT_AVAILABLE) && !gl.getParameter(timer.GPU_DISJOINT_EXT);
  const v = ok ? gl.getQueryParameter(q, gl.QUERY_RESULT) / 1e6 : NaN;
  gl.deleteQuery(q);
  return v;
}

async function measureView(pose, bilder) {
  window.temple.setView(...pose);
  for (let i = 0; i < WARM; i++) oneFrame();
  const r = [];
  for (let i = 0; i < bilder; i++) r.push(oneFrame());
  await pause();
  return r.map(({ bild, cpu, q }) => ({ bild, cpu, gpu: gpuTime(q) }));
}

async function messen({ ansichten = ANSICHTEN, stunden = STUNDEN, bilder = 30, runden = 2,
  varianten = [{ name: '', an() {}, aus() {} }], zeige = true } = {}) {
  await holdLoop();
  const samples = {};
  const add = (v, a, s, list) => (((samples[v] ??= {})[a] ??= {})[s] ??= []).push(...list);
  try {
    for (let r = 0; r < runden; r++) {
      const order = r % 2 ? [...varianten].reverse() : varianten;
      for (const v of order) {
        v.an();
        for (const [s, h] of Object.entries(stunden)) {
          window.temple.setTime(h);
          for (const [a, pose] of Object.entries(ansichten)) add(v.name, a, s, await measureView(pose, bilder));
        }
        v.aus();
      }
    }
  } finally { releaseLoop(); }
  const result = {};
  for (const [v, byView] of Object.entries(samples)) for (const [a, byTime] of Object.entries(byView)) for (const [s, list] of Object.entries(byTime)) {
    const b = list.map(x => x.bild), g = list.map(x => x.gpu).filter(x => x === x);
    ((result[v] ??= {})[a] ??= {})[s] = {
      bild: +median(b).toFixed(1), streuung: [+quart(b, 0.25).toFixed(1), +quart(b, 0.75).toFixed(1)],
      cpu: +median(list.map(x => x.cpu)).toFixed(1), gpu: g.length ? +median(g).toFixed(1) : null, gpuWerte: g.length,
    };
  }
  const size = renderer.getDrawingBufferSize(new window.temple.THREE.Vector2());
  const info = { aufloesung: `${size.x}x${size.y}`, ...ladeInfo(), bilder, runden };
  console.log('Messung', info);
  for (const [v, t] of Object.entries(result)) {
    console.log(v ? `Variante ${v}` : 'Messung');
    console.table(Object.fromEntries(Object.entries(t).map(([a, byTime]) => [a,
      Object.fromEntries(Object.entries(byTime).flatMap(([s, m]) => [[`${s} ms`, m.bild], [`${s} GPU`, m.gpu]]))])));
  }
  fetch('/__log?messen=' + encodeURIComponent(JSON.stringify({ info, result }))).catch(() => {});
  if (zeige) show(info, result);
  return { info, result };
}
function ladeInfo() {
  return { browser: navigator.userAgent.match(/(Firefox|Chrome)\/[\d.]+/)?.[0], laden: +(LADEN / 1000).toFixed(2),
    programme: renderer.info.programs.length,
    abschnitte: Object.fromEntries(Object.entries(window.ladezeiten ?? {}).map(([k, t]) => [k, Math.round(t)])),
    uebersetzen: window.temple.compileTimes };
}

function show(info, result) {
  const box = document.getElementById('messung') ?? document.body.appendChild(Object.assign(document.createElement('pre'), { id: 'messung' }));
  box.style.cssText = 'position:fixed;left:1em;top:1em;z-index:20;margin:0;padding:0.8em 1em;max-height:90vh;overflow:auto;' +
    'background:rgba(20,14,8,0.88);color:#f3e6cf;font:13px/1.4 monospace;border:1px solid #6b5636;cursor:pointer';
  const times = Object.keys(Object.values(Object.values(result)[0])[0]);
  const lines = [`Bildzeit in ms (Median), ${info.aufloesung}, ${info.browser}, ${info.runden} × ${info.bilder} Bilder, geladen nach ${info.laden} s`,
    'ms: CPU + GPU bis readPixels (in Chrome nie unter 16,7) · GPU: Timer-Query um das ganze Bild', ''];
  for (const [v, t] of Object.entries(result)) {
    if (v) lines.push('', `Variante: ${v}`);
    lines.push('Ansicht'.padEnd(34) + times.map(s => s.padStart(8) + (s + ' GPU').padStart(11)).join(''));
    for (const [a, byTime] of Object.entries(t))
      lines.push(a.padEnd(34) + times.map(s => String(byTime[s].bild).padStart(8) + String(byTime[s].gpu ?? '–').padStart(11)).join(''));
  }
  box.textContent = lines.join('\n');
  box.onclick = () => box.remove();
}

window.messen = messen;
if (location.hash === '#laden') fetch('/__log?laden=' + encodeURIComponent(JSON.stringify(ladeInfo()))).catch(() => {});
if (location.hash.startsWith('#messen')) {
  document.getElementById('start').classList.add('hidden');
  messen();
}

export { ANSICHTEN, messen };
