import * as THREE from 'three';
import { camera, renderer } from './szene.js';
import { depthRT, sun } from './licht.js';
import { fullscreenVert, quad } from './strahlen.js';
import { aoUniform } from './material.js';
import { taaMat } from './glaettung.js';
import { COL_SOUTH, COL_X, M, ZONE_GLSL, f3, groundReach } from './masse.js';

const AO = { radius: 1.2, strength: 1.0, bias: 0.0015, on: true };
const DIRS = 4, STEPS = 3;

const GROUND_ROOFS = [-1, 1].flatMap(s => [[COL_X - 0.7, M.encl, M.courtNorth, 36.5], [3.0, COL_X - 0.7, COL_SOUTH - 0.7, 36.5]]
  .map(([x0, x1, z0, z1]) => (s > 0 ? [x0, x1, z0, z1] : [-x1, -x0, z0, z1])));

const aoMat = new THREE.ShaderMaterial({
  uniforms: {
    tDepth: { value: depthRT.depthTexture }, uProj: { value: camera.projectionMatrix }, uInvProj: { value: camera.projectionMatrixInverse },
    uTexel: { value: new THREE.Vector2() }, uRadius: { value: AO.radius }, uStrength: { value: AO.strength }, uBias: { value: AO.bias },
    uCamWorld: { value: camera.matrixWorld }, tSun: { value: null }, uSunMatrix: { value: sun.shadow.matrix }, uSunBias: { value: 0 },
    uReach: groundReach,
  },
  vertexShader: fullscreenVert,
  fragmentShader: `
    #include <packing>
    uniform sampler2D tDepth, tSun;
    uniform mat4 uProj, uInvProj, uCamWorld, uSunMatrix;
    uniform vec2 uTexel;
    uniform float uRadius, uStrength, uBias, uSunBias;
    uniform float uReach[${groundReach.value.length}];
    varying vec2 vUv;
    #define DIRS ${DIRS}
    #define STEPS ${STEPS}
    ${ZONE_GLSL}

    float ign(vec2 p) { return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }
    vec3 viewPos(vec2 uv) {
      vec4 v = uInvProj * vec4(uv * 2.0 - 1.0, texture2D(tDepth, uv).x * 2.0 - 1.0, 1.0);
      return v.xyz / v.w;
    }

    float sunGround(vec3 p, vec3 n, float reach, float j) {
      vec2 h = n.xz / max(length(n.xz), 1e-3);
      float y = max(p.y, 0.3), lit = 0.0, wsum = 0.0;
      for (int i = 0; i < 6; i++) {
        float k = fract(j + float(i) * 0.618034);
        float az = (float(i - (i / 3) * 3 - 1) + k - 0.5) * 0.7, dep = i < 3 ? 0.15 + 0.45 * k : 0.6 + 0.7 * k;
        vec2 hz = vec2(h.x * cos(az) - h.y * sin(az), h.x * sin(az) + h.y * cos(az));
        vec3 d = vec3(hz.x * cos(dep), -sin(dep), hz.y * cos(dep));
        float w = max(dot(n, d), 0.0);
        vec3 q = p + d * (y / sin(dep));
        q.y = 0.05;
        if (y / tan(dep) > reach) q = p + d * ((reach - 0.3) / cos(dep));
        if (p.y > ${f3(M.colRoof + 0.05)}) {
          vec3 r = p + d * ((p.y - ${f3(M.colRoof)}) / sin(dep));
          ${GROUND_ROOFS.map(([x0, x1, z0, z1]) => `if (r.x > ${f3(x0)} && r.x < ${f3(x1)} && r.z > ${f3(z0)} && r.z < ${f3(z1)}) q = vec3(r.x, ${f3(M.colRoof + 0.05)}, r.z);`).join('\n          ')}
        }
        vec4 c = uSunMatrix * vec4(q, 1.0);
        c.xyz /= c.w;
        float s = 1.0;
        if (all(greaterThanEqual(c.xy, vec2(0.0))) && all(lessThanEqual(c.xy, vec2(1.0))) && c.z <= 1.0)
          s = step(c.z + uSunBias, unpackRGBAToDepth(texture2D(tSun, c.xy)));
        lit += w * s; wsum += w;
      }
      return wsum > 0.0 ? lit / wsum : 1.0;
    }

    void main() {
      if (texture2D(tDepth, vUv).x >= 1.0) { gl_FragColor = vec4(1.0, 1e4, 1.0, 0.0); return; }
      vec3 p = viewPos(vUv);
      vec3 pr = viewPos(vUv + vec2(uTexel.x, 0.0)), pl = viewPos(vUv - vec2(uTexel.x, 0.0));
      vec3 pu = viewPos(vUv + vec2(0.0, uTexel.y)), pd = viewPos(vUv - vec2(0.0, uTexel.y));
      vec3 dx = abs(pr.z - p.z) < abs(p.z - pl.z) ? pr - p : p - pl;
      vec3 dy = abs(pu.z - p.z) < abs(p.z - pd.z) ? pu - p : p - pd;
      vec3 n = normalize(cross(dx, dy));
      if (dot(n, p) > 0.0) n = -n;
      vec2 r = vec2(uProj[0][0], uProj[1][1]) * 0.5 * uRadius / -p.z;
      r *= min(1.0, 0.12 / r.y);
      float j = ign(gl_FragCoord.xy), js = ign(gl_FragCoord.yx + 17.0);
      float bias = uBias * (1.0 - p.z), a0 = j * 6.2831853, r2 = uRadius * uRadius, sum = 0.0;
      for (int k = 0; k < DIRS; k++) {
        float a = a0 + float(k) * 6.2831853 / float(DIRS), m = 0.0;
        for (int i = 0; i < STEPS; i++) {
          float t = (float(i) + js) / float(STEPS);
          vec3 v = viewPos(vUv + vec2(cos(a), sin(a)) * r * t * t) - p;
          float vv = dot(v, v), f = max(1.0 - vv / r2, 0.0);
          m = max(m, f * f * f * max((dot(v, n) - bias) / sqrt(vv + 1e-4), 0.0));
        }
        sum += m;
      }
      float ao = max(0.0, 1.0 - sum * uStrength / float(DIRS));
      vec3 wp = (uCamWorld * vec4(p, 1.0)).xyz, wn = normalize(mat3(uCamWorld) * n);
      float ground = sunGround(wp, wn, uReach[int(zoneAt(wp).z + 0.5)], j);
      gl_FragColor = vec4(ao, -p.z, ground, wn.y);
    }`,
});
const aoBlurMat = new THREE.ShaderMaterial({
  uniforms: { tInput: { value: null }, uDir: { value: new THREE.Vector2() }, uAO: { value: 1 } },
  vertexShader: fullscreenVert,
  fragmentShader: `
    uniform sampler2D tInput;
    uniform vec2 uDir;
    uniform float uAO;
    varying vec2 vUv;
    void main() {
      vec4 c = texture2D(tInput, vUv);
      vec2 sum = c.xz, w = vec2(1.0);
      for (int i = -3; i <= 3; i++) {
        if (i == 0) continue;
        vec4 s = texture2D(tInput, vUv + uDir * float(i));
        float e = max(0.0, 1.0 - abs(s.y - c.y) / (0.05 * c.y)) * step(abs(s.w - c.w), 0.3);
        vec2 k = vec2(abs(i) == 1 ? 0.8 * uAO : abs(i) == 2 ? 0.4 * uAO : 0.0, abs(i) == 1 ? 0.9 : abs(i) == 2 ? 0.6 : 0.3) * e;
        sum += s.xz * k; w += k;
      }
      gl_FragColor = vec4(sum / w, c.yw).xzyw;
    }`,
});
const aoTimeMat = new THREE.ShaderMaterial({
  uniforms: {
    tInput: { value: null }, tHist: { value: null }, uInvProj: { value: camera.projectionMatrixInverse }, uCamWorld: { value: camera.matrixWorld },
    uPrevVP: taaMat.uniforms.uPrevVP, uCurVP: taaMat.uniforms.uCurVP, uReset: { value: 1 },
  },
  vertexShader: fullscreenVert,
  fragmentShader: `
    uniform sampler2D tInput, tHist;
    uniform mat4 uInvProj, uCamWorld, uPrevVP, uCurVP;
    uniform float uReset;
    varying vec2 vUv;
    void main() {
      vec4 c = texture2D(tInput, vUv);
      gl_FragColor = c;
      if (uReset > 0.5 || c.y > 9e3) return;
      vec4 v = uInvProj * vec4(vUv * 2.0 - 1.0, 0.0, 1.0);
      vec3 ray = v.xyz / v.w;
      vec4 wp = uCamWorld * vec4(ray * (c.y / -ray.z), 1.0);
      vec4 prev = uPrevVP * wp, now = uCurVP * wp;
      vec2 puv = vUv + (prev.xy / prev.w - now.xy / now.w) * 0.5;
      if (any(lessThan(puv, vec2(0.0))) || any(greaterThan(puv, vec2(1.0)))) return;
      vec4 h = texture2D(tHist, puv);
      if (abs(h.y - prev.w) > 0.04 * prev.w) return;
      gl_FragColor.xz = mix(h.xz, c.xz, 0.12);
    }`,
});
const halfTarget = () => new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthBuffer: false });
const aoRT = halfTarget(), aoBlurRT = halfTarget();
let aoHist = [halfTarget(), halfTarget()];

function setAOSize(w, h) {
  for (const t of [aoRT, aoBlurRT, ...aoHist]) t.setSize(Math.ceil(w / 2), Math.ceil(h / 2));
  aoTimeMat.uniforms.uReset.value = 1;
  aoMat.uniforms.uTexel.value.set(1 / w, 1 / h);
  aoUniform.uAOTexel.value.set(1 / aoRT.width, 1 / aoRT.height);
}

function renderAO() {
  if (!AO.on) return;
  aoMat.uniforms.uRadius.value = AO.radius;
  aoMat.uniforms.uStrength.value = AO.strength;
  aoMat.uniforms.uBias.value = AO.bias;
  aoMat.uniforms.tSun.value = sun.shadow.map?.texture ?? null;
  aoMat.uniforms.uSunBias.value = sun.shadow.bias;
  quad.material = aoMat;
  renderer.setRenderTarget(aoRT);
  quad.render(renderer);
  quad.material = aoBlurMat;
  for (let i = 0; i < 2; i++) {
    aoBlurMat.uniforms.uAO.value = i ? 0 : 1;
    aoBlurMat.uniforms.tInput.value = aoRT.texture;
    aoBlurMat.uniforms.uDir.value.set(1 / aoRT.width, 0);
    renderer.setRenderTarget(aoBlurRT);
    quad.render(renderer);
    aoBlurMat.uniforms.tInput.value = aoBlurRT.texture;
    aoBlurMat.uniforms.uDir.value.set(0, 1 / aoRT.height);
    renderer.setRenderTarget(aoRT);
    quad.render(renderer);
  }
  const [prev, next] = aoHist;
  const u = aoTimeMat.uniforms;
  u.tInput.value = aoRT.texture;
  u.tHist.value = prev.texture;
  u.uReset.value = Math.max(u.uReset.value, taaMat.uniforms.uReset.value);
  quad.material = aoTimeMat;
  renderer.setRenderTarget(next);
  quad.render(renderer);
  u.uReset.value = 0;
  aoUniform.tAO.value = next.texture;
  aoHist = [next, prev];
}

export { AO, renderAO, setAOSize };
