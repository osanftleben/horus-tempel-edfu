import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { M, PF, f3 } from '../masse.js';
import { scene } from '../szene.js';
import { graniteMap } from '../texturen.js';
import { diskMat, floorMat, graniteMat, lit, naosMat, paintUniform, sandMat, uraeusMat, woodMat } from '../material.js';
import { windPhase, windStaerke } from '../wind.js';
import { mirrorX } from './helfer.js';
import { EN, ET } from './pylon-hof.js';
import { HB, HF, HH, SCREENS } from './pronaos.js';
import { BARK_Z, MB, MF, MH, NAOS_Z, OB, OF, OFF_C, OFF_HOLES, OH, SB, SF, SHX } from './innenraeume.js';

{
  const parts = [];
  const box = (x0, x1, y0, y1, z0, z1) => parts.push(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2));
  const square = (g, sz) => { g.rotateY(Math.PI / 4); g.scale(1, 1, sz); return g; };
  const W = 0.75, D = 0.675, F = D, N = 0.4;
  box(-0.95, 0.95, 0, 0.25, -0.85, 0.85);
  box(-W, W, 0.25, 2.75, -D, F - 0.4);
  box(-W, -N, 0.25, 2.75, F - 0.4, F); box(N, W, 0.25, 2.75, F - 0.4, F);
  box(-N, N, 0.25, 0.6, F - 0.4, F);
  box(-N, N, 2.3, 2.75, F - 0.4, F);
  box(-0.79, 0.79, 2.75, 2.85, -0.715, 0.715);
  parts.push(square(new THREE.CylinderGeometry(1.31, 1.12, 0.4, 4), 0.9).translate(0, 3.05, 0));
  box(-0.93, 0.93, 3.25, 3.33, -0.84, 0.84);
  parts.push(square(new THREE.ConeGeometry(1.25, 0.8, 4), 0.9).translate(0, 3.73, 0));
  const naos = new THREE.Mesh(mergeGeometries(parts.map(g => g.toNonIndexed())), naosMat);
  naos.position.set(0, M.sanFloor, NAOS_Z);
  naos.castShadow = naos.receiveShadow = true;
  scene.add(naos);
  wingedDisk(0, M.sanFloor + 2.52, NAOS_Z + F + 0.01, 0.76, 1);

  const ped = [];
  ped.push(new THREE.BoxGeometry(1.2, 0.9, 2.6).translate(0, 0.45, 0));
  ped.push(new THREE.BoxGeometry(1.34, 0.12, 2.74).translate(0, 0.96, 0));
  const pedestal = new THREE.Mesh(mergeGeometries(ped), naosMat);
  pedestal.position.set(0, M.sanFloor, BARK_Z);
  pedestal.castShadow = pedestal.receiveShadow = true;
  scene.add(pedestal);

  const goldMat = lit(new THREE.MeshStandardMaterial({ color: 0xc89a42, metalness: 0.35, roughness: 0.4 }));
  const bark = [];
  const top = 1.02;
  bark.push(new THREE.BoxGeometry(0.4, 0.22, 0.9).translate(0, top + 0.11, 0));
  for (const x of [-0.3, 0.3]) bark.push(new THREE.CylinderGeometry(0.035, 0.035, 3.0, 8).rotateX(Math.PI / 2).translate(x, top + 0.26, 0));
  const hull = new THREE.SphereGeometry(1, 28, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2).scale(0.42, 0.3, 1.45);
  bark.push(hull.translate(0, top + 0.56, 0));
  bark.push(new THREE.BoxGeometry(0.8, 0.04, 2.6).translate(0, top + 0.56, 0));
  for (const s of [-1, 1]) {
    bark.push(new THREE.CylinderGeometry(0.07, 0.12, 0.75, 10).rotateX(s * 0.6).translate(0, top + 0.82, s * 1.45));
    bark.push(new THREE.SphereGeometry(0.1, 12, 10).scale(1, 1.05, 1.2).translate(0, top + 1.2, s * 1.68));
    bark.push(new THREE.ConeGeometry(0.04, 0.12, 8).rotateX(s * (Math.PI / 2 + 0.5)).translate(0, top + 1.17, s * 1.8));
    bark.push(new THREE.CylinderGeometry(0.1, 0.1, 0.02, 16).rotateX(Math.PI / 2).translate(0, top + 1.38, s * 1.66));
  }
  bark.push(new THREE.BoxGeometry(0.5, 0.55, 0.75).translate(0, top + 0.86, 0));
  bark.push(new THREE.BoxGeometry(0.6, 0.08, 0.85).translate(0, top + 1.17, 0));
  const barque = new THREE.Mesh(mergeGeometries(bark.map(g => g.index ? g.toNonIndexed() : g)), goldMat);
  barque.position.set(0, M.sanFloor, BARK_Z);
  barque.castShadow = barque.receiveShadow = true;
  scene.add(barque);
}

const breadMat = lit(new THREE.MeshStandardMaterial({ color: 0xa8743a, roughness: 0.9 }));
const fruitMat = lit(new THREE.MeshStandardMaterial({ color: 0x8a3a2a, roughness: 0.6 }));
{
  const bread = [], fruit = [], top = M.offFloor + 0.95;
  for (const x of OFF_HOLES) {
    for (const [dx, dz] of [[-0.45, -0.25], [0, 0.2], [0.45, -0.2]]) {
      bread.push(new THREE.SphereGeometry(0.22, 16, 10).scale(1, 0.45, 1.3).translate(x + dx, top + 0.09, OFF_C + dz));
    }
    bread.push(new THREE.ConeGeometry(0.13, 0.5, 12).translate(x - 0.1, top + 0.25, OFF_C - 0.35));
    for (let i = 0; i < 7; i++) {
      const a = i * 2.4, r = 0.12 + (i % 3) * 0.06;
      fruit.push(new THREE.SphereGeometry(0.08, 10, 8).translate(x + 0.35 + Math.cos(a) * r, top + 0.08, OFF_C + 0.25 + Math.sin(a) * r));
    }
  }
  for (const [geos, mat] of [[bread, breadMat], [fruit, fruitMat]]) {
    const m = new THREE.Mesh(mergeGeometries(geos), mat);
    m.castShadow = m.receiveShadow = true;
    scene.add(m);
  }
}

const uraeusGeos = [];
mirrorX(s => {
  for (const [a, b] of SCREENS) {
    const w = b - a, g = new THREE.PlaneGeometry(w, 0.9);
    const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * w / 3.6);
    g.translate(s * (a + b) / 2, M.screenTop + 0.3 + 0.45, PF);
    uraeusGeos.push(g);
  }
});
const uraeus = new THREE.Mesh(mergeGeometries(uraeusGeos), uraeusMat);
uraeus.castShadow = uraeus.receiveShadow = true;
uraeus.layers.set(1);
scene.add(uraeus);

function wingedDisk(x, y, z, w, facing, rot = facing < 0 ? Math.PI : 0) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w / 4), diskMat);
  m.position.set(x, y, z);
  m.rotation.y = rot;
  m.receiveShadow = true;
  m.layers.set(1);
  scene.add(m);
}
wingedDisk(0, 19.2, 34.81, 4, -1);
wingedDisk(0, 18, 45.04, 9, 1);
wingedDisk(0, 8.4, M.proBack + 0.03, 4.4, 1);
wingedDisk(0, M.hallFloor + 6.25, HB + 0.03, 4, 1);
wingedDisk(0, 6.95, M.offBack + 0.03, 3.4, 1);
wingedDisk(0, 6.95, M.midBack + 0.03, 3.4, 1);
mirrorX(s => wingedDisk(s * (M.chamWall - 0.03), M.chamDoorTop + 0.45, (M.chamDoor[0] + M.chamDoor[1]) / 2, 1.6, 0, -s * Math.PI / 2));

function falconGeometry() {
  const parts = [];
  const add = (g, x, y, z, rx = 0) => { g.rotateX(rx); g.translate(x, y, z); parts.push(g); };
  const lathe = (pts, segs) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), segs);
  add(new THREE.BoxGeometry(1.5, 1.0, 2.2), 0, 0.5, 0);
  add(new THREE.BoxGeometry(0.8, 0.12, 0.7), 0, 1.06, 0.25);
  add(lathe([[0, 0], [0.28, 0], [0.32, 0.25], [0.45, 0.4], [0.56, 0.75], [0.6, 1.1], [0.57, 1.45],
    [0.47, 1.75], [0.33, 1.95], [0.26, 2.05], [0, 2.12]], 28).scale(1, 1, 1.2), 0, 1.0, 0, -0.06);
  for (const s of [-1, 1]) {
    add(new THREE.SphereGeometry(1, 20, 14).scale(0.16, 0.85, 0.5), s * 0.47, 2.0, -0.18, 0.35);
  }
  add(new THREE.BoxGeometry(0.5, 0.1, 0.95), 0, 1.3, -0.8, -0.6);
  add(new THREE.SphereGeometry(0.3, 20, 14).scale(0.95, 1, 1.15), 0, 3.15, 0.12);
  add(new THREE.ConeGeometry(0.1, 0.3, 10), 0, 3.06, 0.46, Math.PI / 2 + 0.5);
  add(lathe([[0, 0], [0.26, 0], [0.24, 0.25], [0.17, 0.55], [0.11, 0.8], [0.07, 0.88], [0.09, 0.93], [0, 0.98]], 20), 0, 3.38, 0.05);
  add(new THREE.CylinderGeometry(0.3, 0.28, 0.36, 20), 0, 3.56, 0.05);
  add(new THREE.BoxGeometry(0.44, 0.8, 0.08), 0, 3.93, -0.2);
  return mergeGeometries(parts);
}
const falconGeo = falconGeometry();
graniteMap.repeat.set(3, 3);
const falconPos = [[-4.6, PF + 2.6], [4.6, PF + 2.6], [-5.4, 49.6], [5.4, 49.6]];
for (const [x, z] of falconPos) {
  const m = new THREE.Mesh(falconGeo, graniteMat);
  m.position.set(x, 0, z);
  m.scale.setScalar(0.85);
  m.castShadow = m.receiveShadow = true;
  scene.add(m);
}

const bronzeMat = lit(new THREE.MeshStandardMaterial({ color: 0x9a7038, metalness: 0.6, roughness: 0.45 }));
const leafWood = [], leafMetal = [], LEAF_COLLIDERS = [];
function doorLeaves(out, y0, y1, zh, w, t, n, band) {
  const h = y1 - y0 - 0.02, rows = Math.max(1, Math.round((h - 0.35) / 3.4));
  mirrorX(s => {
    const x = s * (out - t / 2), face = x - s * t / 2;
    for (let k = 0; k < n; k++) {
      const bw = w / n, bt = t - 0.15 * t * (k % 2);
      leafWood.push(new THREE.BoxGeometry(bt, h, bw - 0.01).translate(x + s * (t - bt) / 2, y0 + h / 2, zh - (k + 0.5) * bw));
    }
    for (let r = 0; r <= rows; r++) {
      const y = y0 + band / 2 + 0.05 + r * (h - band - 0.1) / rows;
      leafMetal.push(new THREE.BoxGeometry(0.03, band, w).translate(face, y, zh - w / 2));
    }
    for (const zc of [zh - band / 4, zh - w + band / 4]) {
      leafMetal.push(new THREE.BoxGeometry(0.03, h, band / 2).translate(face, y0 + h / 2, zc));
    }
  });
}
doorLeaves(M.gateHalf + M.gateRecess, 0, M.gateTop, M.gateDoorZ, M.gateLeaf, 0.25, 5, 0.3);
doorLeaves(M.doorRebate, M.proFloor, 6.3, PF - 0.1, M.doorRebate, 0.12, 4, 0.2);
doorLeaves(M.innerDoor, 0.8, 7.2, M.proBack - 0.3, M.innerDoor, 0.12, 3, 0.2);
doorLeaves(1.4, 1.2, M.hallFloor + 5.6, HB - 0.3, 1.4, 0.12, 3, 0.2);
doorLeaves(1.3, 1.6, 6.4, OB - 0.3, 1.3, 0.12, 3, 0.2);
doorLeaves(1.2, 2.0, 6.4, MB - 0.3, 1.2, 0.12, 3, 0.2);
mirrorX(s => { for (const z of [PF - 1.85, PF - 2.2, PF - 2.55]) LEAF_COLLIDERS.push([s * (M.doorRebate - 0.06), z, 0.15]); });
{
  const leaves = new THREE.Mesh(mergeGeometries(leafWood), woodMat);
  const bands = new THREE.Mesh(mergeGeometries(leafMetal), bronzeMat);
  for (const m of [leaves, bands]) { m.castShadow = m.receiveShadow = true; scene.add(m); }
}

const mastX = [11, 14.5, 27.5, 31];
const mastPos = [];
mirrorX(s => { for (const x of mastX) mastPos.push([s * x, M.pylonFront + 0.7]); });
const mastGeo = new THREE.CylinderGeometry(0.3, 0.42, 40, 12).translate(0, 20, 0);
const mast = new THREE.Mesh(mergeGeometries(mastPos.map(([x, z]) => mastGeo.clone().translate(x, 0, z))), woodMat);
mast.castShadow = true;
scene.add(mast);

const FLAG_L = 7, FLAG_NS = 32, WIND_DIR = new THREE.Vector3(0.75, 0, 0.66).normalize();
const FLAG_COLORS = [0xb03a2a, 0x24467e, 0x3f7a4a, 0xe4dcc8].map(c => new THREE.Color(c));
const FLAG_GLSL = `
uniform float uWindStaerke, uWindPhase;
attribute vec3 aRoot, aFlag, aFarbe;
varying vec3 vFarbe;
const vec3 WDIR = vec3(${f3(WIND_DIR.x)}, 0.0, ${f3(WIND_DIR.z)}), WSIDE = vec3(${f3(WIND_DIR.z)}, 0.0, ${f3(-WIND_DIR.x)});
void flagPose(out vec3 p, out vec3 n) {
  float s = aFlag.x, u = s / ${f3(FLAG_L)}, ph = uWindPhase + aFlag.z;
  float a = mix(0.85, 0.12, uWindStaerke) + 0.1 * sin(ph * 0.25 + aFlag.z);
  float amp = 0.15 + 0.35 * uWindStaerke, k = 6.2832 / 3.2, w = k * s - ph;
  vec3 along = WDIR * cos(a) - vec3(0.0, sin(a), 0.0);
  p = aRoot + along * s + vec3(0.0, aFlag.y, 0.0) + WSIDE * amp * pow(u, 1.3) * sin(w);
  vec3 dPds = along + WSIDE * amp * (1.3 * pow(max(u, 1e-4), 0.3) / ${f3(FLAG_L)} * sin(w) + pow(u, 1.3) * k * cos(w));
  n = normalize(cross(dPds, vec3(0.0, 1.0, 0.0)));
}`;
function flagVertex(shader, normals) {
  shader.uniforms.uWindStaerke = windStaerke;
  shader.uniforms.uWindPhase = windPhase;
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', `#include <common>\n${FLAG_GLSL}`)
    .replace('#include <begin_vertex>', normals ? 'vec3 transformed = flagP;\nvFarbe = aFarbe;' : 'vec3 transformed, flagN;\nflagPose(transformed, flagN);');
  if (normals) shader.vertexShader = shader.vertexShader.replace('#include <beginnormal_vertex>', 'vec3 flagP, objectNormal;\nflagPose(flagP, objectNormal);');
}
const flagMat = lit(new THREE.MeshStandardMaterial({ roughness: 0.9, side: THREE.DoubleSide }));
const ambient = flagMat.onBeforeCompile;
flagMat.onBeforeCompile = shader => {
  ambient(shader);
  flagVertex(shader, true);
  shader.uniforms.uPaint = paintUniform;
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', '#include <common>\nvarying vec3 vFarbe;\nuniform float uPaint;')
    .replace('#include <color_fragment>', 'diffuseColor.rgb *= mix(vec3(0.62, 0.56, 0.47), vFarbe, uPaint);')
    .replace('#include <opaque_fragment>', '#include <opaque_fragment>\ngl_FragColor.a = 0.5;');
};
flagMat.customProgramCacheKey = () => 'amb-fahne';
const flagDepth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, side: THREE.DoubleSide });
flagDepth.onBeforeCompile = shader => flagVertex(shader, false);
flagDepth.customProgramCacheKey = () => 'fahne';
{
  const pos = [], root = [], flag = [], farbe = [], index = [];
  mastPos.forEach(([x, z], m) => {
    const c = FLAG_COLORS[mastX.indexOf(Math.abs(x))], seed = m * 2.39;
    const n0 = pos.length / 3;
    for (let i = 0; i <= FLAG_NS; i++) {
      const s = i / FLAG_NS * FLAG_L, h = 0.7 - 0.58 * i / FLAG_NS;
      for (const t of [-h, 0, h]) {
        pos.push(x + WIND_DIR.x * (0.32 + s * 0.88), 38.6 + t - s * 0.48, z + WIND_DIR.z * (0.32 + s * 0.88));
        root.push(x + WIND_DIR.x * 0.32, 38.6, z + WIND_DIR.z * 0.32);
        flag.push(s, t, seed);
        farbe.push(c.r, c.g, c.b);
      }
    }
    for (let i = 0; i < FLAG_NS; i++) for (let j = 0; j < 2; j++) {
      const a = n0 + i * 3 + j, b = a + 3;
      index.push(a, b, a + 1, b, b + 1, a + 1);
    }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(new Array(pos.length).fill(0), 3));
  g.setAttribute('aRoot', new THREE.Float32BufferAttribute(root, 3));
  g.setAttribute('aFlag', new THREE.Float32BufferAttribute(flag, 3));
  g.setAttribute('aFarbe', new THREE.Float32BufferAttribute(farbe, 3));
  g.setIndex(index);
  g.computeBoundingBox();
  g.boundingBox.expandByScalar(3);
  g.computeBoundingSphere();
  g.boundingSphere.radius += 3;
  const flags = new THREE.Mesh(g, flagMat);
  flags.customDepthMaterial = flagDepth;
  flags.castShadow = true;
  flags.layers.set(1);
  scene.add(flags);
}

function floorPlane(x0, x1, z0, z1, y, mat, tile) {
  const w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  const g = new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2);
  const pos = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (pos.getX(i) + cx) / tile, -(pos.getZ(i) + cz) / tile);
  const m = new THREE.Mesh(g, mat);
  m.position.set(cx, y, cz);
  m.receiveShadow = true;
  scene.add(m);
}
function floorWithHoles(x0, x1, z0, z1, y, mat, tile, holes) {
  const xs = [...new Set([x0, x1, ...holes.flatMap(h => [h[0], h[1]])])].sort((a, b) => a - b);
  for (let i = 0; i + 1 < xs.length; i++) {
    const a = xs[i], b = xs[i + 1];
    let z = z0;
    for (const h of holes.filter(h => h[0] < b && h[1] > a).sort((p, q) => p[2] - q[2])) {
      if (h[2] > z) floorPlane(a, b, z, h[2], y, mat, tile);
      z = Math.max(z, h[3]);
    }
    if (z1 > z) floorPlane(a, b, z, z1, y, mat, tile);
  }
}
const NILO_HOLE = [M.niloX0, M.courtHalf, M.niloZ[0], M.niloTop];
const WZ = (M.niloZ[0] + M.niloZ[1]) / 2;
const WELL_HOLE = [M.wellX - M.wellR, M.wellX + M.wellR, WZ - M.wellR, WZ + M.wellR];
floorWithHoles(-M.encl, M.encl, EN - ET, M.pylonFront, 0.02, floorMat, 8, [NILO_HOLE]);
floorPlane(-M.proHalf, M.proHalf, HF, PF, M.proFloor + 0.01, floorMat, 8);
floorPlane(-HH, HH, HB, HF, M.hallFloor, floorMat, 8);
floorPlane(M.labX0, M.labX1, M.labZ0, HF, M.hallFloor, floorMat, 8);
floorPlane(M.labX0, M.labX1, M.treZ0, M.treZ1, M.hallFloor, floorMat, 8);
floorPlane(M.hallWall, M.nilX1, M.nilZ0, HF, M.hallFloor, floorMat, 8);
floorPlane(-OH, OH, OB, OF, M.offFloor, floorMat, 8);
floorPlane(-MH, MH, MB, MF, M.midFloor, floorMat, 8);
floorPlane(-SHX, SHX, SB, SF, M.sanFloor, floorMat, 8);
floorWithHoles(-200, 200, -180, 220, 0, sandMat, 10, [NILO_HOLE, WELL_HOLE]);

export { LEAF_COLLIDERS, falconPos, mastPos };
