const STEPS = [
  ['Three.js', 'three', 40],
  ['Grundlagen', './webgl.js', 5], ['Grundlagen', './masse.js', 5], ['Grundlagen', './szene.js', 20],
  ['Wandbilder malen', './texturen.js', 350],
  ['Materialien', './material.js', 5],
  ['Mauern bauen', './bau/helfer.js', 5], ['Mauern bauen', './bau/saeulen.js', 5], ['Mauern bauen', './bau/pylon-hof.js', 7], ['Mauern bauen', './bau/pylon-treppe.js', 3],
  ['Mauern bauen', './bau/pronaos.js', 5], ['Mauern bauen', './bau/festsaal.js', 7], ['Mauern bauen', './bau/innenraeume.js', 5],
  ['Mauern bauen', './bau/kapellen.js', 10], ['Mauern bauen', './bau/kammern.js', 5], ['Mauern bauen', './bau/seitenraeume.js', 5],
  ['Mauern bauen', './bau/westtreppe.js', 3], ['Mauern bauen', './bau/reinheitsplatz.js', 2], ['Mauern bauen', './bau/nilometer.js', 1],
  ['Mauern bauen', './bau/mammisi.js', 2],
  ['Mauern bauen', './bau/mauerwerk.js', 6], ['Ausstattung', './bau/ausstattung.js', 7],
  ['Licht und Himmel', './licht.js', 11], ['Licht und Himmel', './strahlen.js', 5], ['Licht und Himmel', './himmel.js', 47],
  ['Licht und Himmel', './glaettung.js', 2], ['Licht und Himmel', './rueckstrahlung.js', 17], ['Licht und Himmel', './lampen.js', 5],
  ['Licht und Himmel', './steuerung.js', 2], ['Licht und Himmel', './main.js', 5],
];
const COMPILE = 3000, FIRST = 1000;
for (const [, mod] of STEPS) {
  const link = document.createElement('link');
  link.rel = 'modulepreload';
  link.href = import.meta.resolve(mod);
  document.head.appendChild(link);
}
const total = STEPS.reduce((s, [, , w]) => s + w, 0) + COMPILE + FIRST;
const bar = document.getElementById('loadBar'), label = document.getElementById('goText');
const paint = () => new Promise(r => { requestAnimationFrame(() => setTimeout(r)); setTimeout(r, 100); });
let shownName = '', shownAt = 0;
async function show(name, done) {
  if (name === shownName && performance.now() - shownAt < 100) return;
  const pct = Math.round((done / total) * 100);
  label.textContent = `${name} … ${pct} %`;
  bar.style.width = `${pct}%`;
  shownName = name;
  await paint();
  shownAt = performance.now();
}
let done = 0;
const stages = window.ladezeiten = {};
for (const [name, mod, w] of STEPS) {
  await show(name, done);
  await import(mod);
  done += w;
}
stages.module = performance.now();
const { compileShaders, start } = await import('./main.js');
await compileShaders(f => show('Shader übersetzen', done + f * COMPILE));
stages.shader = performance.now();
await show('Erstes Bild', done + COMPILE);
start();
stages.bild = performance.now();
import('./messen.js');
