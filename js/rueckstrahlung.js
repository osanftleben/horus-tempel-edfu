import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ZONES, bounceTarget } from './masse.js';
import { camera, renderer, scene } from './szene.js';
import { bufSize, lightDepthRT, lightVP } from './licht.js';
import { fullscreenVert, quad } from './strahlen.js';
import { taaPass } from './glaettung.js';
import { state } from './himmel.js';

const BOUNCE_ZONES = ZONES.map((z, i) => (z.room ? i : -1)).filter(i => i >= 0);
const BS = 1024, BOUNCE_K = 0.8;
const bounceRT = new THREE.WebGLRenderTarget(BS, BOUNCE_ZONES.length, { depthBuffer: false });
const bouncePixels = new Uint8Array(BS * BOUNCE_ZONES.length * 4);
const bounceMat = new THREE.ShaderMaterial({
  uniforms: {
    tLightDepth: { value: lightDepthRT.depthTexture }, uLightVP: { value: lightVP },
    uRoomXZ: { value: BOUNCE_ZONES.map(i => new THREE.Vector4(...ZONES[i].room.slice(0, 4))) },
    uRoomY: { value: BOUNCE_ZONES.map(i => new THREE.Vector2(...ZONES[i].room.slice(4, 6))) },
  },
  vertexShader: fullscreenVert,
  fragmentShader: `
    uniform sampler2D tLightDepth;
    uniform mat4 uLightVP;
    uniform vec4 uRoomXZ[${BOUNCE_ZONES.length}];
    uniform vec2 uRoomY[${BOUNCE_ZONES.length}];
    float hash(float n) { return fract(sin(n * 12.9898) * 43758.5453); }
    void main() {
      int r = int(gl_FragCoord.y);
      float k = floor(gl_FragCoord.x);
      vec4 xz = uRoomXZ[r];
      vec2 yy = uRoomY[r];
      vec2 g = (vec2(mod(k, 32.0), floor(k / 32.0)) + 0.5) / 32.0;
      vec3 p = vec3(mix(xz.x, xz.y, g.x), mix(yy.x, yy.y, hash(k + float(r) * 37.0)), mix(xz.z, xz.w, g.y));
      vec4 lp = uLightVP * vec4(p, 1.0);
      vec3 l = lp.xyz / lp.w * 0.5 + 0.5;
      float lit = 0.0;
      if (all(greaterThan(l.xy, vec2(0.0))) && all(lessThan(l.xy, vec2(1.0))))
        lit = step(l.z - 0.0006, texture2D(tLightDepth, l.xy).x);
      gl_FragColor = vec4(lit, 0.0, 0.0, 1.0);
    }`,
});
function measureBounce() {
  quad.material = bounceMat;
  renderer.setRenderTarget(bounceRT);
  quad.render(renderer);
  renderer.readRenderTargetPixels(bounceRT, 0, 0, BS, BOUNCE_ZONES.length, bouncePixels);
  BOUNCE_ZONES.forEach((zi, row) => {
    let n = 0;
    for (let k = 0; k < BS; k++) if (bouncePixels[(row * BS + k) * 4] > 127) n++;
    bounceTarget[zi] = BOUNCE_K * Math.sqrt(n / BS) * state.light;
  });
}

const composerRT = new THREE.WebGLRenderTarget(bufSize.x, bufSize.y, { type: THREE.HalfFloatType });
const composer = new EffectComposer(renderer, composerRT);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(taaPass);
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.3, 0.5, 0.92);
bloom.materialHighPassFilter.fragmentShader = bloom.materialHighPassFilter.fragmentShader
  .replace('gl_FragColor = mix( outputColor, texel, alpha );', 'gl_FragColor = mix( outputColor, texel, alpha * texel.a );');
composer.addPass(bloom);
composer.addPass(new OutputPass());
function setComposerSize(w, h) {
  const pr = renderer.getPixelRatio();
  composer.setPixelRatio(pr);
  composer.setSize(w, h);
  bloom.setSize(Math.max(1, Math.round(w * pr / 2)), Math.max(1, Math.round(h * pr / 2)));
}

export { bloom, composer, measureBounce, setComposerSize };
