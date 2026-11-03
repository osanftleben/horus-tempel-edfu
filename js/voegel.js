import * as THREE from 'three';
import { camera, scene } from './szene.js';
import { lit } from './material.js';
import { state } from './himmel.js';

// Umriss einer Körperseite: Schnabel, Flügelansatz, Flügelmitte, Spitze (jeweils [x, z vorn, z hinten]), Schwanz ([x, z] der Gabel, z der Kerbe)
const MILAN = { nase: 0.42, ansatz: [0.07, 0.15, -0.15], mitte: [0.42, 0.14, -0.17], spitze: [0.8, -0.04, -0.17], schwanz: [0.17, -0.62, -0.5] };
const FLEDERMAUS = { nase: 0.11, ansatz: [0.03, 0.05, -0.08], mitte: [0.16, 0.08, -0.11], spitze: [0.29, 0.06, -0.06], schwanz: [0.05, -0.16, -0.14] };

function bewegt(mat) {
  const ambient = mat.onBeforeCompile;
  mat.onBeforeCompile = shader => {
    ambient(shader);
    shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>', '#include <opaque_fragment>\ngl_FragColor.a = 0.5;');
  };
  mat.customProgramCacheKey = () => 'amb-bewegt';
  return mat;
}

function schwarm(form, anzahl, farbe) {
  const [ax, af, ab] = form.ansatz, [mx, mf, mb] = form.mitte, [sx, sf, sb] = form.spitze, [tx, tf, tn] = form.schwanz;
  const ruhe = [[0, 0, form.nase], [tx, 0, tf], [0, 0, tn], [-tx, 0, tf]];
  for (const s of [1, -1]) ruhe.push([s * ax, 0, af], [s * ax, 0, ab], [s * mx, 0, mf], [s * mx, 0, mb], [s * sx, 0, sf], [s * sx, 0, sb]);
  const R = 4, L = 10, flaechen = [[0, R, L], [R, R + 1, L + 1], [R, L + 1, L], [R + 1, 1, 2], [R + 1, 2, L + 1], [L + 1, 2, 3]];
  for (const o of [R, L]) flaechen.push([o, o + 2, o + 1], [o + 1, o + 2, o + 3], [o + 2, o + 4, o + 3], [o + 3, o + 4, o + 5]);
  for (const f of flaechen) {
    const [a, b, c] = f.map(i => ruhe[i]);
    if ((b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]) < 0) f.reverse();
  }
  const n = ruhe.length, index = [];
  for (let k = 0; k < anzahl; k++) for (const f of flaechen) index.push(...f.map(i => i + k * n));
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(anzahl * n * 3), 3));
  g.setIndex(index);
  const mesh = new THREE.Mesh(g, bewegt(lit(new THREE.MeshStandardMaterial({ color: farbe, roughness: 1, side: THREE.DoubleSide }))));
  mesh.frustumCulled = false;
  mesh.layers.set(1);
  scene.add(mesh);
  return { mesh, ruhe, ansatz: ax, mitte: mx };
}

const basis = new THREE.Matrix4(), punkt = new THREE.Vector3(), oben = new THREE.Vector3(), rechts = new THREE.Vector3();
// Flügel knicken am Ansatz um w1 und in der Mitte zusätzlich um w2
function setzen(sw, k, pos, vor, hoch, w1, w2) {
  rechts.crossVectors(hoch, vor).normalize();
  oben.crossVectors(vor, rechts);
  basis.makeBasis(rechts, oben, vor).setPosition(pos);
  const p = sw.mesh.geometry.attributes.position, n = sw.ruhe.length;
  sw.ruhe.forEach(([x, , z], i) => {
    const d = Math.abs(x), s = Math.sign(x);
    let px = x, py = 0;
    if (d > sw.ansatz) {
      const innen = Math.min(d, sw.mitte) - sw.ansatz, aussen = Math.max(0, d - sw.mitte);
      px = s * (sw.ansatz + innen * Math.cos(w1) + aussen * Math.cos(w1 + w2));
      py = innen * Math.sin(w1) + aussen * Math.sin(w1 + w2);
    }
    punkt.set(px, py, z).applyMatrix4(basis);
    p.setXYZ(k * n + i, punkt.x, punkt.y, punkt.z);
  });
}
function fertig(sw) {
  sw.mesh.geometry.attributes.position.needsUpdate = true;
  sw.mesh.geometry.computeVertexNormals();
}

const zufall = (a, b) => a + Math.random() * (b - a);
const milane = schwarm(MILAN, 3, 0x5b3a24), fledermaeuse = schwarm(FLEDERMAUS, 6, 0x1c1612);
const MILAN_V = 8;
const MILAN_STATE = Array.from({ length: 3 }, (_, i) => ({
  mitte: new THREE.Vector2(zufall(-30, 30), zufall(-50, 60)), ziel: new THREE.Vector2(), r: zufall(25, 45), h: zufall(40, 60),
  dreh: i % 2 ? 1 : -1, winkel: zufall(0, 2 * Math.PI), schlagBis: 0, schlagAb: zufall(2, 15), pos: new THREE.Vector3(),
}));
const NEST = [[0, 13, 10, 10, 2.5, 14], [-20, 28, 53, 9, 4, 4], [20, 28, 53, 9, 4, 4], [-20, 36, 40, 10, 2, 4], [20, 36, 40, 10, 2, 4], [0, 14, 10, 8, 2, 12]];
const FLEDER_STATE = NEST.map(([x, y, z, ax, ay, az]) => ({
  mitte: new THREE.Vector3(x, y, z), amp: new THREE.Vector3(ax, ay, az),
  f: [zufall(0.45, 0.8), zufall(0.7, 1.1), zufall(0.45, 0.8)], ph: [zufall(0, 6), zufall(0, 6), zufall(0, 6)], zick: zufall(4, 6),
}));
const vor = new THREE.Vector3(), hoch = new THREE.Vector3(), zurMitte = new THREE.Vector3(), a = new THREE.Vector3(), b = new THREE.Vector3();
let zeit = 0;

function fledermausBei(f, t, out) {
  return out.set(
    f.mitte.x + f.amp.x * Math.sin(f.f[0] * t + f.ph[0]) + 1.2 * Math.sin(f.zick * t),
    f.mitte.y + f.amp.y * Math.sin(f.f[1] * t + f.ph[1]),
    f.mitte.z + f.amp.z * Math.sin(f.f[2] * t + f.ph[2]) + 1.2 * Math.cos(f.zick * 1.3 * t));
}

function updateVoegel(dt) {
  zeit += dt;
  const tag = state.daylight > 0.3;
  milane.mesh.visible = tag;
  fledermaeuse.mesh.visible = !tag;
  if (tag) {
    MILAN_STATE.forEach((m, k) => {
      if (m.mitte.distanceTo(m.ziel) < 2 || m.ziel.lengthSq() === 0) m.ziel.set(zufall(-35, 35), zufall(-60, 70));
      m.mitte.add(a.set(m.ziel.x - m.mitte.x, m.ziel.y - m.mitte.y, 0).setLength(dt * 0.8));
      m.winkel += m.dreh * dt * MILAN_V / m.r;
      const c = Math.cos(m.winkel), s = Math.sin(m.winkel);
      m.pos.set(m.mitte.x + m.r * c, m.h + 1.5 * Math.sin(zeit * 0.3 + k), m.mitte.y + m.r * s);
      vor.set(-s * m.dreh, 0, c * m.dreh);
      zurMitte.set(-c, 0, -s);
      const neigung = Math.atan(MILAN_V * MILAN_V / (m.r * 9.81));
      hoch.set(0, Math.cos(neigung), 0).addScaledVector(zurMitte, Math.sin(neigung));
      if (zeit > m.schlagAb) {
        m.schlagBis = zeit + zufall(1.5, 3.5);
        m.schlagAb = m.schlagBis + zufall(6, 18);
      }
      let w1 = 0.12 + 0.03 * Math.sin(zeit * 0.9 + k), w2 = -0.08;
      if (zeit < m.schlagBis) {
        const t = zeit * 2.6 * 2 * Math.PI;
        w1 += 0.4 * Math.sin(t);
        w2 += 0.3 * Math.sin(t - 0.8);
      }
      setzen(milane, k, m.pos, vor, hoch, w1, w2);
    });
    fertig(milane);
  } else {
    FLEDER_STATE.forEach((f, k) => {
      fledermausBei(f, zeit, a);
      fledermausBei(f, zeit + 0.05, b);
      vor.subVectors(b, a).normalize();
      hoch.set(0, 1, 0);
      const t = zeit * 9 * 2 * Math.PI + k;
      setzen(fledermaeuse, k, a, vor, hoch, 0.1 + 0.6 * Math.sin(t), 0.5 * Math.sin(t - 0.7));
    });
    fertig(fledermaeuse);
  }
}

// Stereo-Richtung des nächsten Milans, wenn einer am Himmel ist
function milanRichtung() {
  if (!milane.mesh.visible) return undefined;
  const m = MILAN_STATE.reduce((x, y) => (x.pos.distanceTo(camera.position) < y.pos.distanceTo(camera.position) ? x : y));
  rechts.set(1, 0, 0).applyQuaternion(camera.quaternion);
  return 0.9 * a.subVectors(m.pos, camera.position).normalize().dot(rechts);
}

export { milanRichtung, updateVoegel };
