import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { camera, scene } from './szene.js';
import { lit } from './material.js';
import { rand, sandMap } from './texturen.js';
import { dustMat } from './licht.js';
import { skyDome } from './himmel.js';
import { windPhase, windStaerke } from './wind.js';

// Osten ist +x, Norden −z. Der Nil fließt östlich des Tempels von Süd nach Nord.
const WEIT = 10000, NIL = [520, 900], NIL_Y = -0.4, SAND = [-200, 200, -180, 220];
camera.far = 12000;
camera.updateProjectionMatrix();

const DUNST_GLSL = `
uniform vec3 uDunst;
vec3 dunst(vec3 c, vec3 p) {
  float d = length(p - cameraPosition) / 7000.0;
  return mix(c, uDunst, 1.0 - exp(-d * sqrt(d)));
}`;
// Ferne Flächen verblassen zur Horizontfarbe des Himmels
function fern(mat, key, extra = {}) {
  const ambient = mat.onBeforeCompile;
  mat.onBeforeCompile = shader => {
    ambient(shader);
    shader.uniforms.uDunst = skyDome.uniforms.uHorizon;
    Object.assign(shader.uniforms, extra.uniforms ?? {});
    if (extra.vertex) extra.vertex(shader);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${DUNST_GLSL}\n${extra.fragDecl ?? ''}`)
      .replace('#include <map_fragment>', `#include <map_fragment>\n${extra.farbe ?? ''}`)
      .replace('#include <opaque_fragment>', '#include <opaque_fragment>\ngl_FragColor.rgb = dunst(gl_FragColor.rgb, vAmbPos);');
  };
  mat.customProgramCacheKey = () => `amb-${key}`;
  return mat;
}

// Boden bis zum Horizont, ohne die vorhandene Sandfläche und das Flussbett
const FELDER = `
  float hash2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }`;
const bodenMat = fern(lit(new THREE.MeshStandardMaterial({ map: sandMap, roughness: 1 })), 'boden', {
  fragDecl: FELDER,
  farbe: `{
    vec3 p = vAmbPos;
    float west = smoothstep(260.0, 300.0, p.x + 30.0 * sin(p.z / 310.0)) * (1.0 - step(${NIL[0].toFixed(1)}, p.x));
    float ost = step(${NIL[1].toFixed(1)}, p.x) * (1.0 - smoothstep(1300.0, 1400.0, p.x + 80.0 * sin(p.z / 420.0)));
    vec2 zelle = vec2(p.x / 45.0, p.z / 28.0 + floor(p.x / 45.0) * 0.37);
    float h = hash2(floor(zelle));
    vec3 feld = h < 0.45 ? vec3(0.09, 0.2, 0.04) : h < 0.75 ? vec3(0.17, 0.26, 0.06) : vec3(0.3, 0.22, 0.12);
    vec2 saum = abs(fract(zelle) - 0.5);
    float graben = smoothstep(0.47, 0.5, max(saum.x, saum.y));
    float hell = dot(diffuseColor.rgb, vec3(0.33));
    diffuseColor.rgb = mix(diffuseColor.rgb, feld * (0.4 + 0.6 * hell) * (1.0 - 0.35 * graben), max(west, ost));
  }`,
});
{
  const xs = [-WEIT, ...Array.from({ length: 19 }, (_, i) => -4500 + i * 500), SAND[0], SAND[1], ...NIL, WEIT].filter((x, i, a) => a.indexOf(x) === i).sort((a, b) => a - b);
  const zs = [-WEIT, ...Array.from({ length: 19 }, (_, i) => -4500 + i * 500), SAND[2], SAND[3], WEIT].filter((z, i, a) => a.indexOf(z) === i).sort((a, b) => a - b);
  const teile = [];
  for (let i = 0; i + 1 < xs.length; i++) for (let j = 0; j + 1 < zs.length; j++) {
    const [x0, x1, z0, z1] = [xs[i], xs[i + 1], zs[j], zs[j + 1]];
    if (x0 >= SAND[0] && x1 <= SAND[1] && z0 >= SAND[2] && z1 <= SAND[3]) continue;
    if (x0 >= NIL[0] && x1 <= NIL[1]) continue;
    const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0).rotateX(-Math.PI / 2).translate((x0 + x1) / 2, 0, (z0 + z1) / 2);
    const pos = g.attributes.position, uv = g.attributes.uv;
    for (let k = 0; k < uv.count; k++) uv.setXY(k, pos.getX(k) / 10, -pos.getZ(k) / 10);
    teile.push(g);
  }
  for (const x of NIL) {
    const g = new THREE.PlaneGeometry(2 * WEIT, -NIL_Y).rotateY(x === NIL[0] ? Math.PI / 2 : -Math.PI / 2).translate(x, NIL_Y / 2, 0);
    g.deleteAttribute('uv');
    g.setAttribute('uv', new THREE.Float32BufferAttribute(new Array(g.attributes.position.count * 2).fill(0.5), 2));
    teile.push(g);
  }
  const boden = new THREE.Mesh(mergeGeometries(teile), bodenMat);
  boden.receiveShadow = true;
  scene.add(boden);
}

// Der Nil spiegelt den Himmel, Wellen lassen die Sonne glitzern
const wasserMat = new THREE.ShaderMaterial({
  uniforms: { ...skyDome.uniforms, uDunst: skyDome.uniforms.uHorizon, uZeit: dustMat.uniforms.uTime },
  vertexShader: `
    varying vec3 vAmbPos;
    void main() {
      vAmbPos = (modelMatrix * vec4(position, 1.0)).xyz;
      gl_Position = projectionMatrix * viewMatrix * vec4(vAmbPos, 1.0);
    }`,
  fragmentShader: `
    uniform vec3 uZenith, uHorizon, uGlow, uSun;
    uniform float uCurve, uZeit;
    varying vec3 vAmbPos;
    ${DUNST_GLSL}
    void main() {
      vec3 v = cameraPosition - vAmbPos;
      float dist = length(v);
      v /= dist;
      vec2 q = vAmbPos.xz;
      float t = uZeit, fein = 0.35 + 0.65 / (1.0 + dist / 150.0);
      vec2 w = vec2(sin(q.x * 0.9 + t * 1.3) + 0.6 * sin(q.x * 2.3 - q.y * 1.1 + t * 2.1),
                    sin(q.y * 0.7 - t * 1.1) + 0.6 * sin(q.y * 2.9 + q.x * 0.8 + t * 1.7)) * 0.05 * fein;
      vec3 n = normalize(vec3(w.x, 1.0, w.y));
      vec3 r = reflect(-v, n);
      r.y = abs(r.y);
      vec3 himmel = mix(uHorizon, uZenith, smoothstep(0.0, uCurve, r.y)) * (1.0 - 0.25 * smoothstep(uCurve, 1.0, r.y));
      float sonne = pow(max(dot(r, uSun), 0.0), 400.0) * 12.0 + pow(max(dot(r, uSun), 0.0), 30.0) * 0.4;
      float fres = 0.02 + 0.98 * pow(1.0 - max(dot(n, v), 0.0), 5.0);
      vec3 grund = vec3(0.05, 0.07, 0.05) * uHorizon;
      vec3 c = mix(grund, himmel, fres) + uGlow * sonne;
      gl_FragColor = vec4(dunst(c, vAmbPos), 1.0);
    }`,
});
{
  const wasser = new THREE.Mesh(new THREE.PlaneGeometry(NIL[1] - NIL[0], 2 * WEIT).rotateX(-Math.PI / 2).translate((NIL[0] + NIL[1]) / 2, NIL_Y, 0), wasserMat);
  scene.add(wasser);
}

// Wüstenplateaus im Osten jenseits des Nils und im Westen
const bergMat = fern(lit(new THREE.MeshStandardMaterial({ color: 0xc8a272, roughness: 1 })), 'berg');
function plateau(innen, aussen, hoch, seite) {
  const NX = 40, NZ = 120, g = new THREE.PlaneGeometry(1, 1, NX, NZ).rotateX(-Math.PI / 2);
  const pos = g.attributes.position, x0 = Math.min(innen, aussen), x1 = Math.max(innen, aussen);
  for (let i = 0; i < pos.count; i++) {
    const u = pos.getX(i) + 0.5, z = pos.getZ(i) * 2 * WEIT, x = x0 + u * (x1 - x0);
    const kante = Math.abs(x - innen) - 150 * Math.sin(z / 530) - 90 * Math.sin(z / 170 + 2);
    const h = hoch(z) * THREE.MathUtils.smoothstep(kante, 0, 500) * (0.9 + 0.1 * Math.sin(x / 300 + z / 410))
      * (1 - 0.6 * Math.max(0, Math.sin(z / 260 + seite)) ** 8);
    pos.setXYZ(i, x, h, z);
  }
  g.computeVertexNormals();
  scene.add(new THREE.Mesh(g, bergMat));
}
plateau(2600, 6000, z => 110 + 45 * Math.sin(z / 1300) + 20 * Math.sin(z / 470 + 1), 0);
plateau(-1800, -6000, z => 55 + 25 * Math.sin(z / 1100 + 2) + 12 * Math.sin(z / 390), 1.7);

// Dattelpalmen in Hainen am Fluss und vereinzelt um den Tempel
const palmen = [];
const hain = (cx, cz, n, r) => {
  for (let i = 0; i < n; i++) {
    const a = rand() * 2 * Math.PI, d = r * Math.sqrt(rand());
    palmen.push([cx + Math.cos(a) * d, cz + Math.sin(a) * d]);
  }
};
for (let i = 0; i < 34; i++) hain(300 + rand() * 200, -1800 + rand() * 3600, 25 + Math.floor(rand() * 30), 30 + rand() * 30);
for (let i = 0; i < 24; i++) hain(950 + rand() * 300, -1800 + rand() * 3600, 25 + Math.floor(rand() * 30), 30 + rand() * 30);
for (let i = 0; i < 45; i++) {
  const a = rand() * 2 * Math.PI, d = 130 + rand() * 130;
  palmen.push([Math.cos(a) * d, 20 + Math.sin(a) * d]);
}

const STAMM = 0.25, WEDEL = 14, GLIEDER = 5, WEDEL_L = 4.2;
const stammGeo = new THREE.CylinderGeometry(STAMM * 0.7, STAMM, 1, 6, 1, true).translate(0, 0.5, 0);
const kroneGeo = (() => {
  const teile = [];
  for (let k = 0; k < WEDEL; k++) {
    const pos = [], index = [], dreh = (k / WEDEL) * 2 * Math.PI + (k % 2) * 0.2, steil = k % 2 ? 0.8 : 0.35;
    let r = 0, y = 0;
    for (let s = 0; s <= GLIEDER; s++) {
      const u = s / GLIEDER, breit = 0.6 * Math.sin(Math.PI * Math.min(1, u * 1.2 + 0.1));
      for (const q of [-1, 0, 1]) pos.push(r, y - (q ? 0.12 : 0) * breit, q * breit);
      const w = steil - 1.5 * u;
      r += Math.cos(w) * WEDEL_L / GLIEDER;
      y += Math.sin(w) * WEDEL_L / GLIEDER;
    }
    for (let s = 0; s < GLIEDER; s++) for (let q = 0; q < 2; q++) {
      const a = s * 3 + q, b = a + 3;
      index.push(a, b, a + 1, b, b + 1, a + 1);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(index);
    teile.push(g.rotateY(dreh));
  }
  const g = mergeGeometries(teile);
  g.computeVertexNormals();
  return g;
})();
const stammMat = fern(lit(new THREE.MeshStandardMaterial({ color: 0x6b5238, roughness: 1 })), 'stamm');
const kroneMat = fern(lit(new THREE.MeshStandardMaterial({ color: 0x3e5a24, roughness: 0.9, side: THREE.DoubleSide })), 'krone', {
  uniforms: { uWindStaerke: windStaerke, uWindPhase: windPhase },
  vertex: shader => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uWindStaerke, uWindPhase;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        {
          float r = length(transformed.xz);
          float ph = uWindPhase * 0.6 + instanceMatrix[3].x * 0.37 + instanceMatrix[3].z * 0.23 + atan(transformed.z, transformed.x) * 2.0;
          transformed.y += sin(ph) * 0.02 * r * r * (0.3 + uWindStaerke);
          transformed.x += 0.04 * r * (0.5 + uWindStaerke) * sin(uWindPhase * 0.3 + instanceMatrix[3].z * 0.1);
        }`);
  },
});
{
  const staemme = new THREE.InstancedMesh(stammGeo, stammMat, palmen.length);
  const kronen = new THREE.InstancedMesh(kroneGeo, kroneMat, palmen.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), p = new THREE.Vector3();
  palmen.forEach(([x, z], i) => {
    const h = 8 + rand() * 7, neig = (rand() - 0.5) * 0.15, dreh = rand() * 2 * Math.PI;
    q.setFromEuler(e.set(neig, dreh, 0, 'YXZ'));
    staemme.setMatrixAt(i, m.compose(p.set(x, 0, z), q, s.set(1, h, 1)));
    const top = new THREE.Vector3(0, h, 0).applyQuaternion(q);
    kronen.setMatrixAt(i, m.compose(p.set(x + top.x, top.y, z + top.z), q, s.setScalar(0.85 + rand() * 0.3)));
  });
  staemme.castShadow = kronen.castShadow = true;
  kronen.layers.set(1);
  scene.add(staemme, kronen);
}
