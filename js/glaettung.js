import * as THREE from 'three';
import { FullScreenQuad, Pass } from 'three/addons/postprocessing/Pass.js';
import { camera } from './szene.js';
import { depthRT } from './licht.js';
import { fullscreenVert, volRT } from './strahlen.js';

const taaMat = new THREE.ShaderMaterial({
  uniforms: {
    tDiffuse: { value: null }, tHistory: { value: null }, tDepth: { value: depthRT.depthTexture },
    tVol: { value: volRT.texture }, uBeams: { value: 1 },
    uInvProj: { value: camera.projectionMatrixInverse }, uCamWorld: { value: camera.matrixWorld },
    uPrevVP: { value: new THREE.Matrix4() }, uCurVP: { value: new THREE.Matrix4() }, uTexel: { value: new THREE.Vector2() }, uReset: { value: 1 },
  },
  vertexShader: fullscreenVert,
  fragmentShader: `
    uniform sampler2D tDiffuse, tHistory, tDepth, tVol;
    uniform mat4 uInvProj, uCamWorld, uPrevVP, uCurVP;
    uniform vec2 uTexel;
    uniform float uReset, uBeams;
    varying vec2 vUv;

    float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
    vec3 squash(vec3 c) { return c / (1.0 + luma(c)); }
    vec3 unsquash(vec3 c) { return c / max(1.0 - luma(c), 1e-4); }

    vec3 history(vec2 uv) {
      vec2 pos = uv / uTexel, t1 = floor(pos - 0.5) + 0.5, f = pos - t1;
      vec2 w0 = f * (-0.5 + f * (1.0 - 0.5 * f)), w1 = 1.0 + f * f * (-2.5 + 1.5 * f);
      vec2 w2 = f * (0.5 + f * (2.0 - 1.5 * f)), w3 = f * f * (-0.5 + 0.5 * f);
      vec2 w12 = w1 + w2;
      vec2 t0 = (t1 - 1.0) * uTexel, t3 = (t1 + 2.0) * uTexel, t12 = (t1 + w2 / w12) * uTexel;
      vec3 r = texture2D(tHistory, vec2(t12.x, t0.y)).rgb * (w12.x * w0.y)
             + texture2D(tHistory, vec2(t0.x, t12.y)).rgb * (w0.x * w12.y)
             + texture2D(tHistory, t12).rgb * (w12.x * w12.y)
             + texture2D(tHistory, vec2(t3.x, t12.y)).rgb * (w3.x * w12.y)
             + texture2D(tHistory, vec2(t12.x, t3.y)).rgb * (w12.x * w3.y);
      return max(r / (w12.x * w0.y + w0.x * w12.y + w12.x * w12.y + w3.x * w12.y + w12.x * w3.y), 0.0);
    }

    void main() {
      vec3 cur = squash(texture2D(tDiffuse, vUv).rgb + texture2D(tVol, vUv).rgb * uBeams);
      vec3 lo = cur, hi = cur;
      for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
        if (x == 0 && y == 0) continue;
        vec2 o = vUv + vec2(x, y) * uTexel;
        vec3 c = squash(texture2D(tDiffuse, o).rgb + texture2D(tVol, o).rgb * uBeams);
        lo = min(lo, c); hi = max(hi, c);
      }

      float d = texture2D(tDepth, vUv).x;
      vec4 v = uInvProj * vec4(vUv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0);
      vec4 wp = uCamWorld * vec4(v.xyz / v.w, 1.0);
      vec4 prev = uPrevVP * wp, now = uCurVP * wp;
      vec2 puv = vUv + (prev.xy / prev.w - now.xy / now.w) * 0.5;

      float a = d < 1.0 ? 1.0 : 0.0;
      vec3 res = cur;
      if (uReset < 0.5 && all(greaterThanEqual(puv, vec2(0.0))) && all(lessThanEqual(puv, vec2(1.0)))) {
        vec3 hist = clamp(squash(history(puv)), lo, hi);
        res = mix(hist, cur, texture2D(tDiffuse, vUv).a < 0.75 ? 0.6 : 0.1);
        a = mix(texture2D(tHistory, puv).a, a, 0.1);
      }
      gl_FragColor = vec4(unsquash(res), a);
    }`,
});
const histTarget = () => new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthBuffer: false });
class TAAPass extends Pass {
  constructor() {
    super();
    this.hist = [histTarget(), histTarget()];
    this.quad = new FullScreenQuad(taaMat);
  }
  setSize(w, h) {
    for (const t of this.hist) t.setSize(w, h);
    taaMat.uniforms.uTexel.value.set(1 / w, 1 / h);
    taaMat.uniforms.uReset.value = 1;
  }
  render(renderer, readBuffer) {
    const [prev, next] = this.hist;
    taaMat.uniforms.tDiffuse.value = readBuffer.texture;
    taaMat.uniforms.tHistory.value = prev.texture;
    renderer.setRenderTarget(next);
    this.quad.render(renderer);
    taaMat.uniforms.uReset.value = 0;
    this.hist = [next, prev];
    return next;
  }
}
const taaPass = new TAAPass();

const halton = (i, b) => { let f = 1, r = 0; for (; i > 0; i = Math.floor(i / b)) { f /= b; r += f * (i % b); } return r; };
const JITTER = Array.from({ length: 8 }, (_, i) => [halton(i + 1, 2) - 0.5, halton(i + 1, 3) - 0.5]);
let jitterIdx = 0;

function jitterCamera(w, h) {
  camera.clearViewOffset();
  taaMat.uniforms.uCurVP.value.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
  const [jx, jy] = JITTER[jitterIdx++ % JITTER.length];
  camera.setViewOffset(w, h, jx, jy, w, h);
}
function endFrame() {
  taaMat.uniforms.uPrevVP.value.copy(taaMat.uniforms.uCurVP.value);
}
function resetHistory() { taaMat.uniforms.uReset.value = 1; }
function setBeams(on) { taaMat.uniforms.uBeams.value = on ? 1 : 0; }

export { endFrame, jitterCamera, resetHistory, setBeams, taaMat, taaPass };
