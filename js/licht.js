import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { COL_SOUTH, COL_X, M, PF } from './masse.js';
import { camera, renderer, scene } from './szene.js';
import { rand } from './texturen.js';
import { HB, HF, HH } from './bau/pronaos.js';
import { MB, MF, MH, OB, OF, OH, SB, SF, SHX } from './bau/innenraeume.js';

const target = new THREE.Vector3(0, 8, -18);
const SH = 80;
const sun = new THREE.DirectionalLight(0xffffff, 5);
sun.castShadow = true;
sun.shadow.mapSize.set(4096, 4096);
Object.assign(sun.shadow.camera, { left: -SH, right: SH, top: SH, bottom: -SH, near: 1, far: 320 });
sun.shadow.camera.updateProjectionMatrix();
sun.shadow.camera.layers.enable(1);
sun.shadow.bias = -0.0002;
sun.shadow.normalBias = 0.03;
sun.shadow.autoUpdate = false;
sun.target.position.copy(target);
scene.add(sun, sun.target);

const hemi = new THREE.HemisphereLight(0xbcd4ff, 0x927e6a, 0.6);
scene.add(hemi);

const LAMP_I = 1.6;
const lampLight = new THREE.PointLight(0xffa04a, 0, 18, 2);
const lamp = new THREE.Group();
lamp.position.set(0.24, -0.25, -0.62);
const lampBody = new THREE.Mesh(
  mergeGeometries([
    new THREE.SphereGeometry(1, 16, 10).scale(0.055, 0.026, 0.075),
    new THREE.CylinderGeometry(0.011, 0.02, 0.06, 8).rotateX(Math.PI / 2).translate(0, 0.008, -0.085),
    new THREE.CylinderGeometry(0.02, 0.022, 0.012, 10).translate(0, 0.025, 0.012),
  ]),
  new THREE.MeshBasicMaterial({ color: 0x3a2214 }));
const flame = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8),
  new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.62, 0.25).multiplyScalar(8) }));
flame.position.set(0, 0.05, -0.112);
lampLight.position.set(0, 0.08, -0.115).add(lamp.position);
lamp.add(lampBody, flame);
lampBody.layers.set(1);
flame.layers.set(1);
lamp.visible = false;
camera.add(lamp, lampLight);
scene.add(camera);
let lampOn = false, lampLevel = 0;
function setLamp(on) { lampOn = on; }
function updateLamp(dt, t) {
  lampLevel += ((lampOn ? 1 : 0) - lampLevel) * Math.min(1, dt * 6);
  const flicker = 0.88 + 0.07 * Math.sin(t * 11.3) + 0.04 * Math.sin(t * 23.7 + 1.3) + 0.03 * (Math.random() - 0.5);
  lampLight.intensity = LAMP_I * lampLevel * flicker;
  flame.scale.set(0.014, 0.04 * (0.8 + 0.3 * flicker), 0.014);
  lamp.visible = lampLevel > 0.01;
}

const LD = 2048;
const lightDepthRT = new THREE.WebGLRenderTarget(LD, LD, { depthTexture: new THREE.DepthTexture(LD, LD) });
const lightCam = new THREE.OrthographicCamera(-SH, SH, SH, -SH, 1, 320);
const lightVP = new THREE.Matrix4();
const SHADOW_BOX = [[-58, 36], [0, 35], [-97, 92]];
const corner = new THREE.Vector3();
function fitShadow() {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (let i = 0; i < 8; i++) {
    corner.set(SHADOW_BOX[0][i & 1], SHADOW_BOX[1][(i >> 1) & 1], SHADOW_BOX[2][i >> 2]).applyMatrix4(lightCam.matrixWorldInverse);
    x0 = Math.min(x0, corner.x); x1 = Math.max(x1, corner.x); y0 = Math.min(y0, corner.y); y1 = Math.max(y1, corner.y);
  }
  for (const cam of [sun.shadow.camera, lightCam]) {
    Object.assign(cam, { left: x0, right: x1, bottom: y0, top: y1 });
    cam.updateProjectionMatrix();
  }
}
const depthOnly = new THREE.MeshBasicMaterial({ colorWrite: false });

const bufSize = renderer.getDrawingBufferSize(new THREE.Vector2());
const depthRT = new THREE.WebGLRenderTarget(bufSize.x, bufSize.y, { depthTexture: new THREE.DepthTexture(bufSize.x, bufSize.y) });

const DUST = 44000;
const dustPos = new Float32Array(DUST * 3), dustSeed = new Float32Array(DUST);
for (let i = 0; i < DUST; i++) {
  let x, y, z;
  const where = rand();
  if (where < 0.5) {
    x = (rand() * 2 - 1) * (M.proHalf - 0.5); y = M.proFloor + 0.2 + rand() * (M.proArch - M.proFloor - 0.4);
    z = M.proBack + 0.5 + rand() * (PF - M.proBack - 1);
  } else if (where < 0.78) {
    x = (rand() * 2 - 1) * (HH - 0.5); y = M.hallFloor + 0.2 + rand() * 10.5; z = HB + 0.5 + rand() * (HF - HB - 1);
  } else if (where < 0.85) {
    x = (rand() * 2 - 1) * (OH - 0.4); y = M.offFloor + 0.2 + rand() * 7.8; z = OB + 0.3 + rand() * (OF - OB - 0.6);
  } else if (where < 0.89) {
    x = (rand() * 2 - 1) * (MH - 0.4); y = M.midFloor + 0.2 + rand() * 6.8; z = MB + 0.3 + rand() * (MF - MB - 0.6);
  } else if (where < 0.91) {
    x = (rand() * 2 - 1) * (SHX - 0.3); y = M.sanFloor + 0.2 + rand() * 5.2; z = SB + 0.3 + rand() * (SF - SB - 0.6);
  } else {
    const side = rand();
    if (side < 0.66) { x = (side < 0.33 ? -1 : 1) * (COL_X - 0.5 + rand() * (M.courtHalf - COL_X + 0.4)); z = M.courtNorth + 0.5 + rand() * (35 - M.courtNorth); }
    else { x = (rand() * 2 - 1) * M.courtHalf; z = COL_SOUTH - 0.6 + rand() * (35 - COL_SOUTH + 0.6); }
    y = 0.2 + rand() * (M.colArch - 0.4);
  }
  dustPos.set([x, y, z], i * 3);
  dustSeed[i] = rand();
}
const dustGeo = new THREE.BufferGeometry();
dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
dustGeo.setAttribute('aSeed', new THREE.BufferAttribute(dustSeed, 1));
const dustMat = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0 }, uScale: { value: 1 }, uColor: { value: new THREE.Color() },
    uLightVP: { value: lightVP }, tLightDepth: { value: lightDepthRT.depthTexture },
  },
  vertexShader: `
    uniform float uTime, uScale;
    uniform mat4 uLightVP;
    uniform sampler2D tLightDepth;
    attribute float aSeed;
    varying float vA;
    void main() {
      vec3 p = position;
      float t = uTime * 0.25;
      p += vec3(sin(t * 0.7 + aSeed * 40.0), sin(t * 0.5 + aSeed * 17.0) * 0.6, cos(t * 0.6 + aSeed * 29.0)) * 0.8;
      vec4 lp = uLightVP * vec4(p, 1.0);
      vec3 l = lp.xyz / lp.w * 0.5 + 0.5;
      float lit = step(l.z - 0.0006, texture2D(tLightDepth, l.xy).x);
      vec4 mv = modelViewMatrix * vec4(p, 1.0);
      gl_Position = projectionMatrix * mv;
      float dist = -mv.z;
      gl_PointSize = lit * max(1.5, uScale * (0.008 + 0.012 * fract(aSeed * 7.3)) / dist);
      vA = lit * (0.35 + 0.65 * fract(aSeed * 3.1)) * smoothstep(40.0, 3.0, dist) * smoothstep(0.3, 1.0, dist);
    }`,
  fragmentShader: `
    uniform vec3 uColor;
    varying float vA;
    void main() {
      float a = smoothstep(0.5, 0.0, length(gl_PointCoord - 0.5)) * vA;
      if (a < 0.003) discard;
      gl_FragColor = vec4(uColor * a, 1.0);
    }`,
  blending: THREE.AdditiveBlending, depthWrite: false, transparent: true,
});
const dust = new THREE.Points(dustGeo, dustMat);
dust.frustumCulled = false;
dust.layers.set(1);
scene.add(dust);

export { LAMP_I, bufSize, depthOnly, depthRT, dustMat, fitShadow, hemi, lampLevel, lampOn, lightCam, lightDepthRT, lightVP, setLamp, sun, target, updateLamp };
