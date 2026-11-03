import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { M, bounceColor, bounceUniform, zoneAtPoint } from './masse.js';
import { scene } from './szene.js';
import { lampBounce, lit } from './material.js';
import { LAMP_I, lampLevel, lightDepthRT, lightVP, sun } from './licht.js';
import { standLightAt } from './lampen.js';
import { NAOS_Z, OFF_C, OFF_HOLES } from './bau/innenraeume.js';

// Räuchergefäße: [x, Boden, z, Decke, auf dem Tisch]
const TISCH = M.offFloor + 0.95;
const GEFAESSE = [
  [0, M.sanFloor, NAOS_Z + 1.2, M.sanTop, false],
  ...OFF_HOLES.map(x => [x - 0.5, TISCH, OFF_C + 0.3, M.offTop, true]),
  [M.labX0 + 0.6, M.hallFloor, M.hallFront - 0.9, M.labTop, false],
];
const STAENDER_H = 0.9, SCHALE_H = 0.08;

const lathe = (pts, segs) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), segs);
const staender = lathe([[0, 0], [0.16, 0], [0.17, 0.04], [0.06, 0.1], [0.03, 0.2], [0.025, 0.75], [0.05, 0.8], [0.13, 0.84], [0.14, STAENDER_H], [0.12, STAENDER_H], [0.1, 0.86], [0, 0.85]], 18);
const schale = lathe([[0, 0], [0.05, 0], [0.06, 0.02], [0.09, 0.05], [0.1, SCHALE_H], [0.085, SCHALE_H], [0.07, 0.05], [0, 0.04]], 16);
const bronze = [], ton = [], glut = [];
const quellen = GEFAESSE.map(([x, y, z, decke, tisch]) => {
  const h = tisch ? SCHALE_H : STAENDER_H;
  (tisch ? ton : bronze).push((tisch ? schale : staender).clone().translate(x, y, z));
  glut.push(new THREE.CircleGeometry(tisch ? 0.06 : 0.09, 12).rotateX(-Math.PI / 2).translate(x, y + h - 0.02, z));
  return { pos: new THREE.Vector3(x, y + h, z), hoch: decke - y - h - 0.4 };
});
for (const [geos, mat] of [
  [bronze, lit(new THREE.MeshStandardMaterial({ color: 0x8a6232, metalness: 0.6, roughness: 0.45 }))],
  [ton, lit(new THREE.MeshStandardMaterial({ color: 0x8e5a3a, roughness: 0.85 }))],
]) {
  const m = new THREE.Mesh(mergeGeometries(geos), mat);
  m.castShadow = m.receiveShadow = true;
  scene.add(m);
}
const glutMesh = new THREE.Mesh(mergeGeometries(glut), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.35, 0.08).multiplyScalar(1.6) }));
glutMesh.layers.set(1);
scene.add(glutMesh);

const N = 96, LEBEN = 18;
const zeit = { value: 0 }, sonne = { value: new THREE.Color() }, hand = { value: new THREE.Color() };
const rauchVert = `
  uniform float uZeit, uHoch;
  uniform vec3 uQuelle, uSonne, uHand, uUmgebung;
  uniform mat4 uLightVP;
  uniform sampler2D tLightDepth;
  attribute vec2 aTeil;
  varying vec2 vUv, vMuster;
  varying vec3 vFarbe;
  varying float vA;
  void main() {
    float seed = aTeil.x, a = fract(uZeit / ${LEBEN.toFixed(1)} + seed) * ${LEBEN.toFixed(1)}, u = a / ${LEBEN.toFixed(1)};
    float y = uHoch * (1.0 - exp(-a * 0.6 / uHoch));
    float r = 0.02 + 1.1 * pow(u, 1.6);
    vec3 c = uQuelle + vec3(
      0.12 * sin(y * 1.3 - uZeit * 0.8 + aTeil.y) + r * sin(seed * 41.0 + a * 0.3),
      y,
      0.12 * cos(y * 1.1 - uZeit * 0.6 + aTeil.y * 1.7) + r * cos(seed * 29.0 + a * 0.25));
    float groesse = 0.06 + 1.3 * pow(u, 0.8);
    float w = seed * 6.2832 + a * 0.15;
    vec2 q = mat2(cos(w), sin(w), -sin(w), cos(w)) * position.xy;
    vec4 mv = modelViewMatrix * vec4(c, 1.0);
    mv.xy += q * groesse;
    gl_Position = projectionMatrix * mv;
    vUv = position.xy;
    vMuster = position.xy + vec2(seed * 3.7, seed * 5.3);

    vec4 lp = uLightVP * vec4(c, 1.0);
    vec3 l = lp.xyz / lp.w * 0.5 + 0.5;
    float beam = step(l.z - 0.0006, texture2D(tLightDepth, l.xy).x);
    vec3 d = c - cameraPosition;
    vFarbe = beam * uSonne + uHand / (dot(d, d) + 1.0) + uUmgebung;
    vA = smoothstep(0.0, 0.04, u) * (1.0 - smoothstep(0.55, 1.0, u)) * mix(0.35, 0.05, u) * smoothstep(uHoch, uHoch * 0.75, y);
  }`;
const rauchFrag = `
  varying vec2 vUv, vMuster;
  varying vec3 vFarbe;
  varying float vA;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p), s = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), s.x), mix(hash(i + vec2(0, 1)), hash(i + 1.0), s.x), s.y);
  }
  void main() {
    float f = 0.6 * noise(vMuster * 4.0) + 0.4 * noise(vMuster * 9.0);
    float a = vA * smoothstep(0.5, 0.1, length(vUv)) * smoothstep(0.25, 0.75, f);
    if (a < 0.002) discard;
    gl_FragColor = vec4(0.8 * vFarbe * a, a);
  }`;

const quad = new THREE.PlaneGeometry(1, 1);
const schwaden = quellen.map(q => {
  const g = new THREE.InstancedBufferGeometry();
  g.index = quad.index;
  g.attributes.position = quad.attributes.position;
  g.instanceCount = N;
  g.setAttribute('aTeil', new THREE.InstancedBufferAttribute(new Float32Array(Array.from({ length: N }, (_, i) => [(i + Math.random() * 0.5) / N, Math.random() * 6.3]).flat()), 2));
  g.boundingBox = new THREE.Box3(q.pos.clone().add(new THREE.Vector3(-2, 0, -2)), q.pos.clone().add(new THREE.Vector3(2, q.hoch + 1, 2)));
  g.boundingSphere = g.boundingBox.getBoundingSphere(new THREE.Sphere());
  const mat = new THREE.ShaderMaterial({
    uniforms: { uZeit: zeit, uSonne: sonne, uHand: hand, uHoch: { value: q.hoch }, uQuelle: { value: q.pos }, uUmgebung: { value: new THREE.Color() },
      uLightVP: { value: lightVP }, tLightDepth: { value: lightDepthRT.depthTexture } },
    vertexShader: rauchVert, fragmentShader: rauchFrag,
    transparent: true, depthWrite: false, premultipliedAlpha: true, blending: THREE.NormalBlending,
  });
  const m = new THREE.Mesh(g, mat);
  m.layers.set(1);
  scene.add(m);
  return { ...q, zone: zoneAtPoint(q.pos.x, q.pos.y + 1, q.pos.z), umgebung: mat.uniforms.uUmgebung.value };
});

const LAMPE = new THREE.Color(1.0, 0.6, 0.3);
function updateWeihrauch(dt) {
  zeit.value += dt;
  sonne.value.copy(sun.color).multiplyScalar(sun.intensity * 0.06);
  hand.value.copy(LAMPE).multiplyScalar(LAMP_I * lampLevel * 0.5);
  for (const s of schwaden) {
    const b = lampBounce.value[s.zone], k = bounceUniform.value[s.zone];
    s.umgebung.copy(LAMPE).multiplyScalar(0.5 * standLightAt(s.pos))
      .add({ r: b.x + bounceColor.value.r * k, g: b.y + bounceColor.value.g * k, b: b.z + bounceColor.value.b * k });
  }
}

export { updateWeihrauch };
