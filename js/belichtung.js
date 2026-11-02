import * as THREE from 'three';
import { renderer } from './szene.js';
import { fullscreenVert, quad } from './strahlen.js';
import { taaPass } from './glaettung.js';

const W = 32, H = 18, LO = -14, RANGE = 22;
const keyRT = new THREE.WebGLRenderTarget(W, H, { depthBuffer: false });
const keyMat = new THREE.ShaderMaterial({
  uniforms: { tInput: { value: null } },
  vertexShader: fullscreenVert,
  fragmentShader: `
    uniform sampler2D tInput;
    varying vec2 vUv;
    void main() {
      vec2 cell = vec2(${1 / W}, ${1 / H});
      float sum = 0.0, solid = 0.0, sumSolid = 0.0;
      for (int y = 0; y < 4; y++) for (int x = 0; x < 4; x++) {
        vec4 c = texture2D(tInput, vUv + (vec2(x, y) - 1.5) * 0.25 * cell);
        float l = log2(max(dot(c.rgb, vec3(0.2126, 0.7152, 0.0722)), 1e-4));
        sum += l;
        solid += c.a; sumSolid += l * c.a;
      }
      float v = clamp((sum / 16.0 - (${LO}.0)) / ${RANGE}.0, 0.0, 1.0) * 255.0;
      float vs = clamp((sumSolid / max(solid, 1e-3) - (${LO}.0)) / ${RANGE}.0, 0.0, 1.0);
      gl_FragColor = vec4(floor(v) / 255.0, fract(v), vs, solid / 16.0);
    }`,
});

const gl = renderer.getContext();
const pbo = gl.createBuffer();
gl.bindBuffer(gl.PIXEL_PACK_BUFFER, pbo);
gl.bufferData(gl.PIXEL_PACK_BUFFER, W * H * 4, gl.STREAM_READ);
gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
const px = new Uint8Array(W * H * 4), solid = [];
let fence = null, last = 0, key = 0, high = 0;

function measureKey() {
  if (fence) {
    if (gl.clientWaitSync(fence, 0, 0) === gl.TIMEOUT_EXPIRED) return;
    gl.deleteSync(fence);
    fence = null;
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, pbo);
    gl.getBufferSubData(gl.PIXEL_PACK_BUFFER, 0, px);
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
    let sum = 0;
    solid.length = 0;
    for (let i = 0; i < W * H; i++) {
      sum += (px[i * 4] + px[i * 4 + 1] / 255) / 255;
      if (px[i * 4 + 3] >= 128) solid.push(px[i * 4 + 2] / 255);
    }
    key = 2 ** (sum / (W * H) * RANGE + LO);
    solid.sort((a, b) => a - b);
    high = solid.length ? 2 ** (solid[Math.floor(0.95 * solid.length)] * RANGE + LO) : 0;
  }
  const now = performance.now();
  if (now - last < 100) return;
  last = now;
  keyMat.uniforms.tInput.value = taaPass.hist[0].texture;
  quad.material = keyMat;
  renderer.setRenderTarget(keyRT);
  quad.render(renderer);
  gl.bindBuffer(gl.PIXEL_PACK_BUFFER, pbo);
  gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, 0);
  gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
  renderer.setRenderTarget(null);
  fence = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
  gl.flush();
}
const imageKey = () => key, imageHigh = () => high;

export { imageHigh, imageKey, measureKey };
