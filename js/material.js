import * as THREE from 'three';
import { M, NZ, WS_GLSL, ZONE_GLSL, bounceColor, bounceUniform, f3, skyFill } from './masse.js';
import { PAL, floorMap, graniteMap, naosMap, paintTex, sandMap, stoneBump, stoneMap } from './texturen.js';

const POINT_INFO = 'getPointLightInfo( pointLight, geometryPosition, directLight );';
const LAMP_MAX = 16, FAR = 1e4;
const lampMin = { value: Array.from({ length: LAMP_MAX }, () => new THREE.Vector3(-FAR, -FAR, -FAR)) };
const lampMax = { value: Array.from({ length: LAMP_MAX }, () => new THREE.Vector3(FAR, FAR, FAR)) };
const SHADOW_LAMPS = 3;
const lampShadowK = { value: new Array(SHADOW_LAMPS).fill(1) };
const lampBounce = { value: Array.from({ length: NZ + 1 }, () => new THREE.Vector3()) };
const aoUniform = { tAO: { value: null }, uAOTexel: { value: new THREE.Vector2(1, 1) } };
const FILL = { flat: 0.7, base: 0.4, ground: 1.0 };
const fillUniform = { value: new THREE.Vector3() };
function setFill() { fillUniform.value.set(FILL.flat, FILL.base, FILL.ground); }
setFill();
const LAMP_SHADOW = `#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
float lampShadowAt( sampler2D map, PointLightShadow ls, vec4 coord ) {
  float dp = ( length( coord.xyz ) - ls.shadowCameraNear ) / ( ls.shadowCameraFar - ls.shadowCameraNear ) + ls.shadowBias;
  return texture2DCompare( map, cubeToUV( normalize( coord.xyz ), 1.0 / ( ls.shadowMapSize.y * 2.0 ) ), dp );
}
#endif
float lampShadow( int i ) {
  float s = 1.0;
  #if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
  ${Array.from({ length: SHADOW_LAMPS }, (_, k) => `#if NUM_POINT_LIGHT_SHADOWS > ${k}
  if ( i == ${k} && receiveShadow ) s = mix( 1.0, lampShadowAt( pointShadowMap[ ${k} ], pointLightShadows[ ${k} ], vPointShadowCoord[ ${k} ] ), uLampShadow[ ${k} ] );
  #endif`).join('\n  ')}
  #endif
  return s;
}`;
const LIGHTS_BEGIN = THREE.ShaderChunk.lights_fragment_begin.replace(
  /#pragma unroll_loop_start\n(\tfor \( int i = 0; i < NUM_POINT_LIGHTS;[\s\S]*?)\t#pragma unroll_loop_end/,
  (_, loop) => loop.replace(/\t\t#if defined\( USE_SHADOWMAP \) && \( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS \)[\s\S]*?#endif\n/, '')
    .replace(POINT_INFO, `${POINT_INFO}
\t\tif ( !directLight.visible || any( lessThan( vAmbPos, uLampMin[ i ] ) ) || any( greaterThan( vAmbPos, uLampMax[ i ] ) ) ) continue;
\t\tdirectLight.color *= lampShadow( i );`));
function addAmbient(shader) {
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', '#include <common>\nvarying vec3 vAmbPos;')
    .replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
      {
        vec4 ap = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
        ap = instanceMatrix * ap;
        #endif
        vAmbPos = (modelMatrix * ap).xyz;
      }`);
  shader.uniforms.uBounce = bounceUniform;
  shader.uniforms.uSkyFill = skyFill;
  shader.uniforms.uBounceColor = bounceColor;
  shader.uniforms.uLampMin = lampMin;
  shader.uniforms.uLampMax = lampMax;
  shader.uniforms.uLampShadow = lampShadowK;
  shader.uniforms.uLampBounce = lampBounce;
  Object.assign(shader.uniforms, aoUniform);
  shader.uniforms.uFill = fillUniform;
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', `#include <common>
      varying vec3 vAmbPos;
      #if NUM_POINT_LIGHTS > 0
      uniform vec3 uLampMin[NUM_POINT_LIGHTS], uLampMax[NUM_POINT_LIGHTS];
      #endif
      uniform float uLampShadow[${SHADOW_LAMPS}];
      uniform float uBounce[${NZ + 1}], uSkyFill[${NZ + 1}];
      uniform vec3 uBounceColor, uLampBounce[${NZ + 1}];
      uniform sampler2D tAO;
      uniform vec2 uAOTexel;
      uniform vec3 uFill;
      ${ZONE_GLSL}`)
    .replace('#include <shadowmap_pars_fragment>', `#include <shadowmap_pars_fragment>\n${LAMP_SHADOW}`)
    .replace('#include <lights_fragment_begin>', LIGHTS_BEGIN)
    .replace('#include <lights_fragment_maps>', `#include <lights_fragment_maps>
      {
        vec3 zi = zoneAt(vAmbPos);
        int zn = int(zi.z + 0.5);
        vec2 at = gl_FragCoord.xy * 0.5 - 0.5, af = fract(at), ab = (floor(at) + 0.5) * uAOTexel;
        vec4 a0 = texture2D(tAO, ab), a1 = texture2D(tAO, ab + vec2(uAOTexel.x, 0.0));
        vec4 a2 = texture2D(tAO, ab + vec2(0.0, uAOTexel.y)), a3 = texture2D(tAO, ab + uAOTexel);
        vec4 aw = vec4((1.0 - af.x) * (1.0 - af.y), af.x * (1.0 - af.y), (1.0 - af.x) * af.y, af.x * af.y)
          * max(vec4(1e-3), 1.0 - abs(vec4(a0.y, a1.y, a2.y, a3.y) - vViewPosition.z) / (0.03 * vViewPosition.z));
        vec4 ao = (a0 * aw.x + a1 * aw.y + a2 * aw.z + a3 * aw.w) / dot(aw, vec4(1.0));
        float wall = 1.0 - clamp(inverseTransformDirection(normal, viewMatrix).y, 0.0, 1.0);
        float fill = uSkyFill[zn] * mix(uFill.x, uFill.y + uFill.z * ao.z, wall);
        irradiance = irradiance * zi.x * (1.0 + fill) + uBounceColor * uBounce[zn] + uLampBounce[zn];
        irradiance *= ao.x;
      }`);
}
const WHITE = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
WHITE.needsUpdate = true;
function lit(mat) {
  mat.map ??= WHITE;
  mat.onBeforeCompile = addAmbient;
  mat.customProgramCacheKey = () => 'amb';
  return mat;
}

const paintUniform = { value: 1 };
const PAINT = { none: 0, wall: 1, archLow: 2, ceiling: 3, roof: 4, plain: 5, archHigh: 6, pylon: 7, lab: 8, cornice: 9, archHall: 10, stair: 11, library: 12, morning: 13, treasury: 14, nile: 15, westStair: 16 };
function paintedMaterial(mode, textures) {
  const mat = new THREE.MeshStandardMaterial({ map: stoneMap, bumpMap: stoneBump, bumpScale: 1.2, roughness: 0.92 });
  mat.onBeforeCompile = shader => {
    shader.uniforms.uPaint = paintUniform;
    for (const k of ['ground', 'blue', 'green', 'red', 'black']) shader.uniforms['u' + k] = { value: new THREE.Color(PAL[k]) };
    for (const [k, t] of Object.entries(textures)) shader.uniforms[k] = { value: t };
    const samplers = Object.keys(textures).map(k => `uniform sampler2D ${k};`).join('\n');
    let vertDecl, vertMain, fragDecl;
    if (mode === 'arch') {
      vertDecl = 'attribute float aPaintCode; varying float vPaintCode; varying vec3 vPaintPos; varying vec3 vPaintNormal;';
      vertMain = `vPaintCode = aPaintCode;
        vPaintPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
        vPaintNormal = normalize(mat3(modelMatrix) * objectNormal);`;
      fragDecl = `varying float vPaintCode; varying vec3 vPaintPos; varying vec3 vPaintNormal;
        ${WS_GLSL}
        vec4 paintSample() {
          int code = int(vPaintCode + 0.5);
          vec3 n = normalize(vPaintNormal), p = vPaintPos;
          bool down = n.y < -0.5, side = abs(n.y) < 0.5;
          float h = abs(n.x) > abs(n.z) ? p.z : p.x;
          vec4 r = vec4(0.0);
          if (code == 1 && side) r = vec4(texture2D(tWall, vec2(h / 12.0, p.y / 16.0)).rgb, 1.0);
          else if (code == 7 && side) r = vec4(texture2D(tPylon, vec2(h / 32.0, p.y / ${f3(M.pylonTop + 1.5)})).rgb, 1.0);
          else if (code == 8 && side) r = vec4(texture2D(tLab, vec2(h / 6.0, (p.y - ${f3(M.hallFloor)}) / 6.5)).rgb, 1.0);
          else if ((code == 12 || code == 13) && side) {
            float v = clamp((p.y - ${f3(M.proFloor)}) / 5.0, 0.002, 0.998) * 0.5 + (code == 12 ? 0.5 : 0.0);
            float hc = abs(n.x) > abs(n.z) ? p.z - ${f3((M.chamZ0 + M.chamZ1) / 2)} : abs(p.x) - ${f3((M.chamX0 + M.chamX1) / 2)};
            r = vec4(texture2D(tRooms, vec2(hc / 4.0 + 0.5, v)).rgb, 1.0);
          }
          else if ((code == 14 || code == 15) && side) {
            float v = clamp((p.y - ${f3(M.hallFloor)}) / 6.5, 0.002, 0.998) * 0.5 + (code == 14 ? 0.5 : 0.0);
            r = vec4(texture2D(tStores, vec2(h / 4.0, v)).rgb, 1.0);
          }
          else if (code == 11 && side) {
            float yl = p.y - ${f3(M.offFloor)} - (p.z - ${f3(M.stairZ0)}) * ${f3(M.stairSlope)};
            r = vec4(texture2D(tStair, vec2(p.z / 8.0, yl / 4.0)).rgb, 1.0);
          }
          else if (code == 16 && side) {
            vec2 fs = wsFloor(p);
            r = vec4(texture2D(tStair, vec2(-fs.y / 8.0, (p.y - fs.x) / 4.0)).rgb, 1.0);
          }
          else if ((code == 2 || code == 6 || code == 10) && side) {
            float y0 = code == 2 ? ${f3(M.colAbacus)} : (code == 6 ? ${f3(M.proAbacus)} : ${f3(M.hallAbacus)});
            float hh = code == 2 ? ${f3(M.colArch - M.colAbacus)} : (code == 6 ? ${f3(M.proArch - M.proAbacus)} : ${f3(M.hallArch - M.hallAbacus)});
            r = vec4(texture2D(tArch, vec2(h / (hh * 4.0), (p.y - y0) / hh)).rgb, 1.0);
          }
          else if ((code == 2 || code == 4 || code == 6 || code == 10) && down) r = vec4(texture2D(tStars, p.xz / 4.0).rgb, 1.0);
          else if (code == 3 && down) r = vec4(texture2D(tCeil, vec2((p.x + 16.0) / 32.0, p.z / 12.0)).rgb, 1.0);
          else if (code == 5) r = vec4(uground, 1.0);
          else if (code == 9 && side) {
            float u = h / 0.5, fu = fract(u);
            int k = int(mod(floor(u), 3.0));
            vec3 c = k == 0 ? ublue : (k == 1 ? ugreen : ured);
            if (fu < 0.1) c = ublack;
            r = vec4(c, 1.0);
          }
          return r;
        }`;
    } else {
      vertDecl = 'attribute vec2 aPaintUv; varying vec2 vPaintUv;';
      vertMain = 'vPaintUv = aPaintUv;';
      fragDecl = 'varying vec2 vPaintUv; vec4 paintSample() { return vec4(texture2D(tPaint, vPaintUv).rgb, 1.0); }';
    }
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${vertDecl}`)
      .replace('#include <worldpos_vertex>', `#include <worldpos_vertex>\n${vertMain}`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\nuniform float uPaint;\nuniform vec3 uground, ublue, ugreen, ured, ublack;\n${samplers}\n${fragDecl}`)
      .replace('#include <map_fragment>', `#include <map_fragment>
        {
          vec4 paint = paintSample();
          float grain = dot(texture2D(map, vMapUv).rgb, vec3(0.3333)) / 0.21;
          float k = paint.a * mix(0.12, 1.0, uPaint);
          diffuseColor.rgb = mix(diffuseColor.rgb, paint.rgb * clamp(0.7 + 0.3 * grain, 0.55, 1.3), k);
        }`);
    addAmbient(shader);
  };
  mat.customProgramCacheKey = () => 'paint-' + mode;
  return mat;
}

function cutoutMaterial(tex, decal) {
  const mat = new THREE.MeshStandardMaterial({
    map: tex, roughness: 0.9, side: THREE.DoubleSide,
    alphaTest: decal ? 0.02 : 0.5, transparent: decal, depthWrite: !decal,
    polygonOffset: decal, polygonOffsetFactor: decal ? -2 : 0,
    forceSinglePass: true,
  });
  mat.onBeforeCompile = shader => {
    shader.uniforms.uPaint = paintUniform;
    shader.uniforms.uStone = { value: new THREE.Color(0xc4a57a) };
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uPaint;\nuniform vec3 uStone;')
      .replace('#include <map_fragment>', `#include <map_fragment>
        diffuseColor.rgb = mix(uStone, diffuseColor.rgb, ${decal ? 'mix(0.4, 1.0, uPaint)' : 'mix(0.1, 1.0, uPaint)'});
        ${decal ? 'diffuseColor.a *= mix(0.15, 1.0, uPaint);' : ''}`);
    addAmbient(shader);
  };
  mat.customProgramCacheKey = () => 'cutout-' + decal;
  return mat;
}

const archMat = paintedMaterial('arch', { tWall: paintTex.wall, tPylon: paintTex.pylon, tArch: paintTex.arch, tStars: paintTex.stars, tCeil: paintTex.ceiling, tLab: paintTex.lab, tStair: paintTex.stair, tRooms: paintTex.rooms, tStores: paintTex.stores });
const courtColMat = paintedMaterial('uv', { tPaint: paintTex.courtCol });
const proColMat = paintedMaterial('uv', { tPaint: paintTex.proCol });
const abacusMat = paintedMaterial('uv', { tPaint: paintTex.abacus });
const uraeusMat = cutoutMaterial(paintTex.uraeus, false);
const diskMat = cutoutMaterial(paintTex.disk, true);

const floorMat = lit(new THREE.MeshStandardMaterial({ map: floorMap, color: new THREE.Color().setScalar(1.45), roughness: 0.85 }));
const sandMat = lit(new THREE.MeshStandardMaterial({ map: sandMap, roughness: 1 }));
const graniteMat = lit(new THREE.MeshStandardMaterial({ map: graniteMap, roughness: 0.8 }));
const naosMat = lit(new THREE.MeshStandardMaterial({ map: naosMap, roughness: 0.3 }));
const woodMat = lit(new THREE.MeshStandardMaterial({ color: 0x5a3a22, roughness: 0.75 }));

export { FILL, LAMP_MAX, PAINT, SHADOW_LAMPS, abacusMat, aoUniform, archMat, courtColMat, diskMat, floorMat, graniteMat, lampBounce, lampMax, lampMin, lampShadowK, lit, naosMat, paintUniform, proColMat, sandMat, setFill, uraeusMat, woodMat };
