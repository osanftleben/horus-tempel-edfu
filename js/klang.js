import { camera } from './szene.js';
import { OPEN_ZONES, zoneAtPoint } from './masse.js';
import { lampLevel } from './licht.js';
import { standLightAt } from './lampen.js';
import { state } from './himmel.js';

const toggle = document.getElementById('sound'), startEl = document.getElementById('start');
const TOENE = [146.8, 174.6, 196, 220, 261.6, 293.7];
let ctx = null, out, hall, tierBus, nextTier = 0, wind, windFilter, heulen = [], roar, fizz, crackleBus, cricketBus, knacken = [], grillen = [];
let open = 1, gust = 0.5, gustZiel = 0.5, gustBis = 0;
const smooth = (param, v, tc) => param.setTargetAtTime(v, ctx.currentTime, tc);

function noiseBuffer(sec, shape = () => 1) {
  const n = Math.round(ctx.sampleRate * sec), b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * shape(i / n);
  return b;
}
function loop(buf, offset) {
  const s = ctx.createBufferSource();
  s.buffer = buf;
  s.loop = true;
  s.start(0, offset);
  return s;
}
function impulse(sec) {
  const n = Math.round(ctx.sampleRate * sec), b = ctx.createBuffer(2, n, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = b.getChannelData(c);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-5 * i / n);
  }
  return b;
}
function build() {
  ctx = new AudioContext();
  out = ctx.createGain();
  out.gain.value = 0;
  out.connect(ctx.destination);
  const noise = noiseBuffer(4);
  windFilter = ctx.createBiquadFilter();
  windFilter.type = 'bandpass';
  windFilter.frequency.value = 450;
  windFilter.Q.value = 3;
  wind = ctx.createGain();
  wind.gain.value = 0;
  loop(noise, 0).connect(windFilter).connect(wind).connect(out);
  hall = ctx.createConvolver();
  const hallGain = ctx.createGain();
  hall.buffer = impulse(4);
  hallGain.gain.value = 0.5;
  hall.connect(hallGain).connect(out);
  wind.connect(hall);
  tierBus = ctx.createGain();
  tierBus.gain.value = 0;
  tierBus.connect(out);
  tierBus.connect(hall);
  heulen = [0, 1].map(i => {
    const f = ctx.createBiquadFilter(), g = ctx.createGain();
    f.type = 'bandpass';
    f.Q.value = 14;
    f.frequency.value = TOENE[i * 3];
    g.gain.value = 0;
    loop(noise, 0.9 + i * 1.3).connect(f).connect(g);
    g.connect(out);
    g.connect(hall);
    return { f, g, next: 0, staerke: 0 };
  });
  const roarFilter = ctx.createBiquadFilter();
  roarFilter.type = 'lowpass';
  roarFilter.frequency.value = 320;
  roar = ctx.createGain();
  roar.gain.value = 0;
  loop(noise, 1.7).connect(roarFilter).connect(roar).connect(out);
  const fizzFilter = ctx.createBiquadFilter();
  fizzFilter.type = 'bandpass';
  fizzFilter.frequency.value = 2500;
  fizzFilter.Q.value = 0.4;
  fizz = ctx.createGain();
  fizz.gain.value = 0;
  loop(noise, 2.9).connect(fizzFilter).connect(fizz).connect(out);
  crackleBus = ctx.createBiquadFilter();
  crackleBus.type = 'lowpass';
  crackleBus.frequency.value = 5000;
  crackleBus.connect(out);
  knacken = Array.from({ length: 16 }, () => {
    const sec = 0.003 + Math.random() * 0.012, attack = 0.0005 / sec;
    return noiseBuffer(sec, u => Math.min(1, u / attack) * (1 - u) ** 2);
  });
  cricketBus = ctx.createGain();
  cricketBus.gain.value = 0;
  cricketBus.connect(out);
  grillen = [4350, 4620, 4480].map((f, i) => {
    const osc = ctx.createOscillator(), gain = ctx.createGain(), pan = ctx.createStereoPanner();
    osc.frequency.value = f;
    gain.gain.value = 0;
    pan.pan.value = [-0.7, 0.6, 0.1][i];
    osc.connect(gain).connect(pan).connect(cricketBus);
    osc.start();
    return { gain, next: 0 };
  });
}

function crackle(t, level) {
  const s = ctx.createBufferSource(), band = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = knacken[Math.floor(Math.random() * knacken.length)];
  band.type = 'lowpass';
  band.frequency.value = 1500 + Math.random() * 3000;
  band.Q.value = 0.3;
  g.gain.value = level * (0.15 + Math.random() ** 2 * 0.85);
  s.connect(band).connect(g).connect(crackleBus);
  s.start(t);
}
function chirp(c, t) {
  for (let k = 0; k < 3 + Math.floor(Math.random() * 2); k++) {
    const t0 = t + k * 0.045;
    c.gain.gain.setValueAtTime(0, t0);
    c.gain.gain.linearRampToValueAtTime(1, t0 + 0.006);
    c.gain.gain.linearRampToValueAtTime(0, t0 + 0.028);
  }
}

const TIERE = {
  eule: { toene: [[0, 0.45, 330, 300], [0.75, 0.55, 320, 288, 0.8]], vib: [5, 3] },
  taube: { toene: [[0, 0.18, 480, 520, 0.6], [0.25, 0.18, 500, 540, 0.8], [0.5, 0.3, 540, 500], [0.9, 0.18, 480, 500, 0.6], [1.15, 0.25, 500, 460, 0.5]], vib: [25, 15] },
  milan: { toene: [[0, 0.25, 2200, 2900, 0.6], [0.25, 1.2, 2900, 1900]], vib: [11, 90], laut: 0.4 },
  heulen: { toene: [[0, 0.7, 520, 820, 1, true], [0.7, 1.1, 820, 760, 1, true], [1.8, 0.8, 760, 560, 0.7]], vib: [6, 18], laut: 0.45 },
  klaeffen: { toene: [[0, 0.08, 950, 1050], [0.16, 0.08, 980, 1080, 0.8], [0.34, 0.07, 940, 1020, 0.7]], vib: [1, 0], laut: 0.3 },
};
function schakale(t) {
  for (let k = 0, n = 2 + Math.floor(Math.random() * 2); k < n; k++) {
    const f = 0.9 + Math.random() * 0.25, h = TIERE.heulen;
    ruf({ ...h, toene: h.toene.map(([at, dur, f0, f1, a, w]) => [at, dur, f0 * f, f1 * f, a, w]) }, t + k * (0.3 + Math.random()));
  }
  ruf(TIERE.klaeffen, t + 2.5 + Math.random());
}
function ruf({ toene, vib, laut = 1 }, t) {
  const osc = ctx.createOscillator(), g = ctx.createGain(), pan = ctx.createStereoPanner(), lfo = ctx.createOscillator(), tiefe = ctx.createGain();
  const staerke = laut * (0.3 + Math.random() * 0.7), end = t + Math.max(...toene.map(([at, dur]) => at + dur));
  pan.pan.value = Math.random() * 1.6 - 0.8;
  g.gain.value = 0;
  lfo.frequency.value = vib[0];
  tiefe.gain.value = vib[1];
  lfo.connect(tiefe).connect(osc.frequency);
  osc.connect(g).connect(pan).connect(tierBus);
  let gebunden = false;
  for (const [at, dur, f0, f1, a = 1, weiter = false] of toene) {
    const t0 = t + at;
    osc.frequency.setValueAtTime(f0, t0);
    osc.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    if (!gebunden) g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(staerke * a, t0 + dur * (gebunden ? 0.5 : 0.3));
    if (!weiter) g.gain.linearRampToValueAtTime(0, t0 + dur);
    gebunden = weiter;
  }
  for (const o of [osc, lfo]) {
    o.start(t);
    o.stop(end + 0.1);
  }
}

function update() {
  if (!ctx) return;
  const on = toggle.checked && startEl.classList.contains('hidden') && !document.hidden;
  smooth(out.gain, on ? 2 : 0, 0.3);
  if (!on) return;
  const now = ctx.currentTime, p = camera.position;
  open += ((OPEN_ZONES.includes(zoneAtPoint(p.x, p.y, p.z)) ? 1 : 0) - open) * 0.15;
  if (now > gustBis) {
    gustZiel = Math.random() ** 2;
    gustBis = now + 0.5 + Math.random() * 2;
  }
  gust += (gustZiel - gust) * 0.12 + (Math.random() - 0.5) * 0.04;
  gust = Math.min(1, Math.max(0, gust));
  smooth(wind.gain, (0.018 + 0.06 * gust) * (0.05 + 0.95 * open), 0.4);
  smooth(windFilter.frequency, (300 + 600 * gust) * (0.5 + 0.5 * open), 0.4);
  for (const h of heulen) {
    if (now > h.next) {
      smooth(h.f.frequency, TOENE[Math.floor(Math.random() * TOENE.length)] * (0.99 + Math.random() * 0.02), 1.5);
      h.staerke = Math.random();
      h.next = now + 4 + Math.random() * 6;
    }
    smooth(h.g.gain, (0.05 + 0.15 * gust) * h.staerke * (0.15 + 0.85 * open), 1.2);
  }
  const fire = 1 - Math.exp(-6 * standLightAt(p)), own = lampLevel;
  smooth(roar.gain, 0.08 * fire + 0.015 * own, 0.3);
  smooth(fizz.gain, (0.012 * fire + 0.004 * own) * (0.4 + Math.random() * 0.9), 0.05);
  const rate = 10 * fire + 3 * own, level = 0.3 * Math.max(fire, 0.5 * own);
  for (let n = rate * 0.1; n > 0; n--) {
    if (n < 1 && Math.random() >= n) continue;
    let t = now + 0.05 + Math.random() * 0.1;
    crackle(t, level);
    for (let k = Math.random() < 0.3 ? 1 + Math.floor(Math.random() * 3) : 0; k > 0; k--) crackle(t += 0.02 + Math.random() * 0.06, level * 0.5);
  }
  const night = 1 - Math.min(1, Math.max(0, (state.daylight - 0.05) / 0.2));
  smooth(tierBus.gain, 0.02 * (0.1 + 0.9 * open), 1);
  if (nextTier < now) nextTier = now + 3 + Math.random() * 10;
  else if (nextTier < now + 0.2) {
    if (night > 0.9) Math.random() < 0.12 ? schakale(nextTier) : ruf(TIERE.eule, nextTier);
    else if (night < 0.1) ruf(Math.random() < 0.7 ? TIERE.taube : TIERE.milan, nextTier);
    nextTier += 12 + Math.random() * 25;
  }
  smooth(cricketBus.gain, 0.012 * night * open, 1);
  for (const c of grillen) {
    if (c.next < now) c.next = now + Math.random();
    if (c.next < now + 0.2) {
      chirp(c, c.next);
      c.next += 0.5 + Math.random() * 0.9;
    }
  }
}
setInterval(update, 100);

const wake = () => {
  if (!ctx) build();
  if (ctx.state !== 'running') ctx.resume().catch(() => {});
};
for (const ev of ['pointerdown', 'keydown', 'touchstart']) addEventListener(ev, wake, { capture: true, passive: true });

const setSound = on => {
  toggle.checked = on;
  try { localStorage.setItem('edfu-klang', on ? '' : '0'); } catch (e) {}
};
toggle.addEventListener('change', () => setSound(toggle.checked));
try { setSound(localStorage.getItem('edfu-klang') !== '0'); } catch (e) {}
addEventListener('keydown', e => { if (e.code === 'KeyT' && !e.repeat) setSound(!toggle.checked); });
