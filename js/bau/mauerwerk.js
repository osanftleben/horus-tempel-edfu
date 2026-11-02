import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { scene } from '../szene.js';
import { archMat } from '../material.js';
import { CELL, blocks } from './helfer.js';

const cells = new Map(), c = new THREE.Vector3();
for (const g of blocks) {
  g.computeBoundingBox();
  g.boundingBox.getCenter(c);
  const key = `${Math.floor(c.x / CELL)},${Math.floor(c.z / CELL)}`;
  if (!cells.has(key)) cells.set(key, []);
  cells.get(key).push(g);
}
archMat.shadowSide = THREE.DoubleSide;
const thin = g => { const s = g.boundingBox.getSize(c); return Math.min(s.x, s.y, s.z) < 0.1; };
const masonry = [...cells.values()].map(gs => {
  gs.sort((a, b) => thin(b) - thin(a));
  const m = new THREE.Mesh(mergeGeometries(gs), archMat);
  m.castShadow = m.receiveShadow = true;
  m.matrixAutoUpdate = false;
  scene.add(m);
  return m;
});

export { masonry };
