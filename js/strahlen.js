import * as THREE from 'three';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { ZONE_GLSL } from './masse.js';
import { camera, renderer } from './szene.js';
import { depthRT, lightDepthRT, lightVP } from './licht.js';

const fullscreenVert = `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

const volMat = new THREE.ShaderMaterial({
  uniforms: {
    tDepth: { value: depthRT.depthTexture }, tLightDepth: { value: lightDepthRT.depthTexture },
    uInvProj: { value: camera.projectionMatrixInverse }, uCamWorld: { value: camera.matrixWorld },
    uLightVP: { value: lightVP }, uCamPos: { value: camera.position },
    uSunDir: { value: new THREE.Vector3() }, uSunColor: { value: new THREE.Color() }, uFrame: { value: 0 },
  },
  vertexShader: fullscreenVert,
  fragmentShader: `
    uniform sampler2D tDepth, tLightDepth;
    uniform mat4 uInvProj, uCamWorld, uLightVP;
    uniform vec3 uCamPos, uSunDir, uSunColor;
    uniform float uFrame;
    varying vec2 vUv;
    #define STEPS 32
    ${ZONE_GLSL}

    float ign(vec2 p) { return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }

    float sunlit(vec3 p) {
      vec4 lp = uLightVP * vec4(p, 1.0);
      vec3 l = lp.xyz / lp.w * 0.5 + 0.5;
      if (any(lessThan(l.xy, vec2(0.0))) || any(greaterThan(l.xy, vec2(1.0)))) return 1.0;
      return step(l.z - 0.0006, texture2D(tLightDepth, l.xy).x);
    }

    void main() {
      float d = texture2D(tDepth, vUv).x;
      vec4 v = uInvProj * vec4(vUv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0);
      v /= v.w;
      vec3 wp = (uCamWorld * v).xyz;
      vec3 rd = wp - uCamPos;
      float dist = length(rd);
      rd /= dist;
      dist = min(dist, 90.0);
      float stepLen = dist / float(STEPS);
      float j = ign(gl_FragCoord.xy + 5.588238 * uFrame);
      float acc = 0.0;
      for (int i = 0; i < STEPS; i++) {
        vec3 p = uCamPos + rd * ((float(i) + j) * stepLen);
        acc += sunlit(p) * zoneAt(p).y;
      }
      acc *= stepLen;
      float g = 0.55, c = dot(rd, uSunDir);
      float hg = (1.0 - g * g) / pow(1.0 + g * g - 2.0 * g * c, 1.5);
      float phase = 0.35 + 0.16 * hg;
      gl_FragColor = vec4(uSunColor * acc * phase, 1.0);
    }`,
});

const blurMat = new THREE.ShaderMaterial({
  uniforms: { tInput: { value: null }, uDir: { value: new THREE.Vector2() } },
  vertexShader: fullscreenVert,
  fragmentShader: `
    uniform sampler2D tInput;
    uniform vec2 uDir;
    varying vec2 vUv;
    void main() {
      vec3 c = texture2D(tInput, vUv).rgb * 0.2270270;
      c += (texture2D(tInput, vUv + uDir * 1.3846154).rgb + texture2D(tInput, vUv - uDir * 1.3846154).rgb) * 0.3162162;
      c += (texture2D(tInput, vUv + uDir * 3.2307692).rgb + texture2D(tInput, vUv - uDir * 3.2307692).rgb) * 0.0702703;
      gl_FragColor = vec4(c, 1.0);
    }`,
});
const volTarget = () => new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthBuffer: false });
const volRT = volTarget(), blurRT = volTarget();
const quad = new FullScreenQuad(volMat);

function renderVolumetric() {
  volMat.uniforms.uFrame.value = (volMat.uniforms.uFrame.value + 1) % 64;
  quad.material = volMat;
  renderer.setRenderTarget(volRT);
  quad.render(renderer);
  quad.material = blurMat;
  for (let i = 0; i < 2; i++) {
    blurMat.uniforms.tInput.value = volRT.texture;
    blurMat.uniforms.uDir.value.set(1.5 / volRT.width, 0);
    renderer.setRenderTarget(blurRT);
    quad.render(renderer);
    blurMat.uniforms.tInput.value = blurRT.texture;
    blurMat.uniforms.uDir.value.set(0, 1.5 / volRT.height);
    renderer.setRenderTarget(volRT);
    quad.render(renderer);
  }
}

export { blurRT, fullscreenVert, quad, renderVolumetric, volMat, volRT };
