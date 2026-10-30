/* Seção 04 — fundo preto + verde da izitrad, versão 1:1 do laboratório aprovado
   (PADRÃO da seção; ?fundo=claro volta ao fundo claro de antes).

   O shader (VS/FS), os presets PREV / STATE_A / STATE_B, os uniforms, a
   suavização da rolagem (lerp .1) e as transições de 3 s (power2.inOut) são os
   do _APROVADO.html — verificado por hash: o fragment shader (9395 caracteres)
   e o vertex shader são idênticos byte a byte. ÚNICA mudança visual: as 3
   cores. As diferenças abaixo não mudam o visual:
     - o canvas fica dentro de .izi-sec04-glow (clip-path) e só desenha com a
       seção na tela (IntersectionObserver) e a aba visível;
     - "reduzir movimento": um quadro parado, sem transições;
     - o ponto da troca de estado é da NOSSA seção (ver measure): o estado
       vertical (STATE_B) entra quando os compromissos entram (opção B), e o
       estado A cinco pontos de % antes (mesmo intervalo do original, 45->50);
     - ao carregar já no meio da seção, o estado é aplicado direto, sem morph.
   Cores (só isto muda): #00083c->#000000, #0b196c->#05421f, #78d6e2->#00FF66. */
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";

const VS = 'varying vec2 vUv;\n\nvoid main() {\n    vUv = uv;\n    gl_Position = vec4(position, 1.0);\n}';
const FS = 'precision highp float;\n\nuniform float uTime;\nuniform vec2 uResolution;\nuniform float uAspect;\n\nuniform float uAlpha;\nuniform float uScale;\nuniform float uLayerAmp;\nuniform float uRotateUV;\n\nuniform float uLayerFreq1;\nuniform float uLayerSpeed1;\nuniform float uNoiseScale1;\nuniform float uNoiseTime1;\nuniform float uNoiseIntensity1;\nuniform int uDebugNoise1;\nuniform float uSplashTransition;\n\nuniform float uLayerFreq2;\nuniform float uLayerSpeed2;\nuniform float uNoiseScale2;\nuniform float uNoiseTime2;\nuniform float uNoiseIntensity2;\nuniform int uDebugNoise2;\n\nuniform float uLayerFreq3;\nuniform float uLayerSpeed3;\nuniform float uNoiseScale3;\nuniform float uNoiseTime3;\nuniform float uNoiseIntensity3;\nuniform int uDebugNoise3;\n\nuniform float uSmoothLow;\nuniform float uSmoothHigh;\n\nuniform float uCurvePointA;\nuniform float uCurvePointB;\nuniform float uDebugCurve;\nuniform float uCurveScaleX;\nuniform float uApplyNoise;\nuniform float uVerticalX;\nuniform float uVerticalY;\nuniform float uCurveTransition;\n\nuniform vec3 uColor1;\nuniform vec3 uColor2;\nuniform vec3 uColor3;\nuniform float uColorWeightFactor;\nuniform float uColorMaxFactor;\n\nvarying vec2 vUv;\n\nvec3 permute(vec3 x) {\n  return mod((34.0 * x + 1.0) * x, 289.0);\n}\n\nvec4 permute(vec4 x) {\n  return mod((34.0 * x + 1.0) * x, 289.0);\n}\n\nvec4 taylorInvSqrt(vec4 r) {\n  return 1.79284291400159 - 0.85373472095314 * r;\n}\n\nvec3 fade(vec3 t) {\n  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);\n}\n\nfloat perlin3D(vec3 P) {\n  vec3 Pi0 = floor(P); \n  vec3 Pi1 = Pi0 + vec3(1.0); \n  Pi0 = mod(Pi0, 289.0);\n  Pi1 = mod(Pi1, 289.0);\n  vec3 Pf0 = fract(P); \n  vec3 Pf1 = Pf0 - vec3(1.0); \n  vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);\n  vec4 iy = vec4(Pi0.yy, Pi1.yy);\n  vec4 iz0 = Pi0.zzzz;\n  vec4 iz1 = Pi1.zzzz;\n\n  vec4 ixy = permute(permute(ix) + iy);\n  vec4 ixy0 = permute(ixy + iz0);\n  vec4 ixy1 = permute(ixy + iz1);\n\n  vec4 gx0 = ixy0 / 7.0;\n  vec4 gy0 = fract(floor(gx0) / 7.0) - 0.5;\n  gx0 = fract(gx0);\n  vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);\n  vec4 sz0 = step(gz0, vec4(0.0));\n  gx0 -= sz0 * (step(0.0, gx0) - 0.5);\n  gy0 -= sz0 * (step(0.0, gy0) - 0.5);\n\n  vec4 gx1 = ixy1 / 7.0;\n  vec4 gy1 = fract(floor(gx1) / 7.0) - 0.5;\n  gx1 = fract(gx1);\n  vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);\n  vec4 sz1 = step(gz1, vec4(0.0));\n  gx1 -= sz1 * (step(0.0, gx1) - 0.5);\n  gy1 -= sz1 * (step(0.0, gy1) - 0.5);\n\n  vec3 g000 = vec3(gx0.x, gy0.x, gz0.x);\n  vec3 g100 = vec3(gx0.y, gy0.y, gz0.y);\n  vec3 g010 = vec3(gx0.z, gy0.z, gz0.z);\n  vec3 g110 = vec3(gx0.w, gy0.w, gz0.w);\n  vec3 g001 = vec3(gx1.x, gy1.x, gz1.x);\n  vec3 g101 = vec3(gx1.y, gy1.y, gz1.y);\n  vec3 g011 = vec3(gx1.z, gy1.z, gz1.z);\n  vec3 g111 = vec3(gx1.w, gy1.w, gz1.w);\n\n  vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));\n  g000 *= norm0.x;\n  g010 *= norm0.y;\n  g100 *= norm0.z;\n  g110 *= norm0.w;\n  vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));\n  g001 *= norm1.x;\n  g011 *= norm1.y;\n  g101 *= norm1.z;\n  g111 *= norm1.w;\n\n  float n000 = dot(g000, Pf0);\n  float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));\n  float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));\n  float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));\n  float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));\n  float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));\n  float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));\n  float n111 = dot(g111, Pf1);\n\n  vec3 fade_xyz = fade(Pf0);\n  vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);\n  vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);\n  float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x);\n  return 2.2 * n_xyz;\n}\n\nvec3 blendOverlay(vec3 base, vec3 blend) {\n    return mix(2.0 * base * blend, 1.0 - 2.0 * (1.0 - base) * (1.0 - blend), step(0.5, base));\n}\n\nvec3 blendSoftLight(vec3 base, vec3 blend) {\n    return mix(2.0 * base * blend + base * base * (1.0 - 2.0 * blend), sqrt(base) * (2.0 * blend - 1.0) + 2.0 * base * (1.0 - blend), step(0.5, blend));\n}\n\nvec3 blendHardLight(vec3 base, vec3 blend) {\n    return mix(2.0 * base * blend, 1.0 - 2.0 * (1.0 - base) * (1.0 - blend), step(0.5, blend));\n}\n\nfloat sigmoid(float x, float a) {\n    return 1.0 / (1.0 + exp(-a * (x - 0.5)));\n}\nfloat gaussian(float x, float sigma) {\n    return exp(-0.5 * (x * x) / (sigma * sigma));\n}\nfloat sinBlend(float x) {\n    return 0.5 - 0.5 * cos(x * 3.14159);\n}\n\nfloat pcurve( float x, float a, float b ){\n    float k = pow(a+b,a+b) / (pow(a,a)*pow(b,b));\n    return k * pow( x, a ) * pow( 1.0-x, b );\n}\n\nfloat plot(vec2 st, float pct){\n  return  smoothstep( pct-0.02, pct, st.y) -\n          smoothstep( pct, pct+0.02, st.y);\n}\n\nvec2 rotateUV(vec2 uv, float rotation)\n{\n    float mid = 0.5;\n    return vec2(\n        cos(rotation) * (uv.x - mid) + sin(rotation) * (uv.y - mid) + mid,\n        cos(rotation) * (uv.y - mid) - sin(rotation) * (uv.x - mid) + mid\n    );\n}\n\nvec2 rotateUV(vec2 uv, float rotation, vec2 mid)\n{\n    return vec2(\n      cos(rotation) * (uv.x - mid.x) + sin(rotation) * (uv.y - mid.y) + mid.x,\n      cos(rotation) * (uv.y - mid.y) - sin(rotation) * (uv.x - mid.x) + mid.y\n    );\n}\n\nvec2 rotateUV(vec2 uv, float rotation, float mid)\n{\n    return vec2(\n      cos(rotation) * (uv.x - mid) + sin(rotation) * (uv.y - mid) + mid,\n      cos(rotation) * (uv.y - mid) - sin(rotation) * (uv.x - mid) + mid\n    );\n}\n\nfloat random(vec2 co) {\n    return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);\n}\n\nvec3 filmGrain(vec2 uv, float time, float grainIntensity) {\n    \n    vec2 noise_uv = uv * 2.5;\n    \n    \n    noise_uv += time * 0.1;\n    \n    \n    float noise = random(noise_uv);\n    \n    \n    noise = (noise - 0.5) * grainIntensity;\n    \n    \n    vec3 grainColor = vec3(noise);\n    grainColor.b *= 0.5; \n    \n    return grainColor;\n}\n\nfloat parabola( float x, float k ){\n    return pow( 4.0*x*(1.0-x), k );\n}\n\nvec4 sRGBTransfer( in vec4 value ) {\n    return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );\n}\n\nvec3 linearToSrgb(vec3 color) {\n    bvec3 cutoff = lessThan(color, vec3(0.0031308));\n    vec3 higher = 1.055 * pow(color, vec3(1.0 / 2.4)) - 0.055;\n    vec3 lower = color * 12.92;\n    return mix(higher, lower, cutoff);\n}\n\nvec3 srgbToLinear(vec3 color) {\n    bvec3 cutoff = lessThan(color, vec3(0.04045));\n    vec3 higher = pow((color + 0.055) / 1.055, vec3(2.4));\n    vec3 lower = color / 12.92;\n    return mix(higher, lower, cutoff);\n}\n\n#include <common>\n#include <dithering_pars_fragment>\n\nvoid main() {\n  vec2 uv = vUv;\n  \n  uv.x -= 0.5;\n  uv.x *= uAspect;\n  uv.x += 0.5;\n\n  vec2 oguv = uv;\n\n  vec2 textureUv = vUv;\n  \n  \n  \n\n  float t = uTime;\n\n  \n  \n  \n\n  \n  uv *= 1.0/uScale;\n  \n  \n  uv.y += t * 0.1;\n\n  float noise1 = perlin3D(vec3(uv * uNoiseScale1, t * uNoiseTime1 + vec2(50.2))) * 0.5 + 0.5;\n  \n  float noise2  = noise1;\n  float noise3 = noise1;\n  #ifdef USE_NOISE\n    noise2 = perlin3D(vec3(uv * uNoiseScale2, (t + 1.6) * uNoiseTime2)) * 0.5 + 0.5;\n    noise3 = perlin3D(vec3(uv * uNoiseScale3, (t + 3.0) * uNoiseTime3)) * 0.5 + 0.5;\n  #endif\n\n  vec3 color1 = uColor1;\n  vec3 color2 = uColor2;\n  vec3 color3 = uColor3;\n\n  float layer1 = smoothstep(uSmoothLow, uSmoothHigh, noise1 + sin(uv.x * uLayerFreq1 + t * uLayerSpeed1) * uLayerAmp);\n  float layer2 = smoothstep(uSmoothLow, uSmoothHigh, noise2 + cos(uv.y * uLayerFreq2 + (t + 1.6) * uLayerSpeed2 + 2.14) * uLayerAmp);\n  float layer3 = smoothstep(uSmoothLow, uSmoothHigh, noise3 + sin((uv.x + uv.y) * uLayerFreq3 + (t + 2.8) * uLayerSpeed3 + 0.42) * uLayerAmp);\n\n  vec3 color = vec3(0.0);\n\n  float curveA = 2.5;\n  float curveB = 1.5;\n\n  float para = parabola(oguv.x, uVerticalX) * pow((1.0 - vUv.y), uVerticalY);\n  \n  oguv -= vec2(0.5);\n  oguv *= 1.0 - (min(abs(uRotateUV), 0.5));\n  oguv += vec2(0.5);\n  oguv = rotateUV(oguv, uRotateUV);\n  oguv.x *= 1.0/uCurveScaleX;\n\n  \n  float pC = pcurve(oguv.x, uCurvePointA, uCurvePointB);\n\n  \n  pC = mix(pC, para, uCurveTransition);\n  \n  \n  \n  \n\n  float pcNoise = pC;\n  pcNoise += (layer1 * 2.0 - 1.0) * uNoiseIntensity1;\n  pcNoise += (layer2 * 2.0 - 1.0) * uNoiseIntensity2;\n  pcNoise += (layer3 * 2.0 - 1.0) * uNoiseIntensity3;\n\n  pC = mix(pC, pcNoise * 0.7, uApplyNoise * pow(pC, 0.3));\n\n  color = mix(color1, color2, pC);\n  float aboveOne = max(0.0, pC - 1.0); \n  color = mix(color, color3, aboveOne); \n\n  float colorFactor = clamp(pC, 0.0, uColorMaxFactor);\n  color = mix(color1, color2, smoothstep(0.0, uColorMaxFactor * uColorWeightFactor, colorFactor));\n  color = mix(color, color3, smoothstep(uColorMaxFactor * uColorWeightFactor, uColorMaxFactor, colorFactor));\n\n  #ifdef USE_DEBUG\n    float pct = plot(oguv,pC) * uDebugCurve;\n    color = (1.0-pct)*color+pct*vec3(0.0,1.0,0.0);\n\n    if (uDebugNoise1 == 1) {\n        color = mix(\n          vec3(noise1),\n          vec3(layer1),\n        step(0.5, vUv.x));\n    }\n    if (uDebugNoise2 == 1) {\n        color = mix(\n          vec3(noise2),\n          vec3(layer2),\n        step(0.5, vUv.x));\n    }\n    if (uDebugNoise3 == 1) {\n        color = mix(\n          vec3(noise3),\n          vec3(layer3),\n        step(0.5, vUv.x));\n    }\n  #endif\n\n  \n  \n  color = mix(color, vec3(0.0), uSplashTransition);\n  \n  gl_FragColor = vec4(color, uAlpha);\n\n  \n  #ifdef USE_ALEPH\n  \n    \n    gl_FragColor.rgb = srgbToLinear(gl_FragColor.rgb);\n    \n  #endif\n  #include <dithering_fragment>\n}';

(function(){
  "use strict";
  // PADRÃO: fundo preto. O HTML já vem com .izi-sec04-dark no wrapper e a logo
  // "izi" da pergunta em branco (sem piscar em branco antes do módulo carregar).
  //   ?fundo=claro -> volta ao fundo claro de antes (remove a classe e a logo)
  const modo = new URLSearchParams(location.search).get("fundo");
  if(modo === "claro"){
    const w0 = document.querySelector(".izi-sec04-unified");
    if(w0) w0.classList.remove("izi-sec04-dark");
    const l0 = document.querySelector(".izi-q-logo-img");
    if(l0) l0.src = "assets/logo-izi." + (document.documentElement.dataset.logo === "antiga" ? "png" : "svg");
    return;
  }
  const gsap = window.gsap;
  const wrap = document.querySelector(".izi-sec04-unified");
  const glow = document.querySelector(".izi-sec04-glow");
  const guiding = document.getElementById("guiding");
  if(!gsap || !wrap || !glow || !guiding) return;
  wrap.classList.add("izi-sec04-dark");
  // logo "izi" da pergunta: versão com os "i" brancos (mesmas dimensões)
  const qLogo = document.querySelector(".izi-q-logo-img");
  if(qLogo) qLogo.src = "assets/logo-izi-branca." + (document.documentElement.dataset.logo === "antiga" ? "png" : "svg");

  const PREV = {
    useNoise:true,globalSpeed:.5,globalNoiseScale:.4,rotateUV:-.1,
    color1:'#000000',color2:'#05421f',color3:'#00FF66',
    curveVerticalTransition:.002026,verticalX:1.49,verticalY:1.99,
    colorWeightFactor:.21,colorMaxFactor:1.48,curvePointA:2.12,curvePointB:.54,
    curveScaleX:1.4,applyNoise:.4,smoothLow:.200203,smoothHigh:.8,
    layerAmp:.043,layerFreq1:1,layerSpeed1:.2,noiseScale1:.163,noiseTime1:.5,noiseIntensity1:1.174,
    layerFreq2:.5,layerSpeed2:.15,noiseScale2:.207,noiseTime2:1.2,noiseIntensity2:.2,
    layerFreq3:.999,layerSpeed3:.1,noiseScale3:.565,noiseTime3:.8,noiseIntensity3:1.158,
    splashTransition:0
  };
  const STATE_A = {
    rotateUV:-.1,curveVerticalTransition:.002026,verticalX:1.49,verticalY:1.99,
    colorWeightFactor:.21,colorMaxFactor:1.48,curvePointA:2.12,curvePointB:.54,
    curveScaleX:1.05,applyNoise:.499,smoothLow:.200203,smoothHigh:.8,
    layerAmp:.043,layerFreq1:1,noiseScale1:.163,noiseIntensity1:1.174,
    layerFreq2:.5,noiseScale2:.207,noiseIntensity2:.2,
    layerFreq3:.999,noiseScale3:.565,noiseIntensity3:1.158
  };
  const STATE_B = {curveVerticalTransition:1,verticalX:.1,verticalY:1,colorWeightFactor:.39,colorMaxFactor:1,applyNoise:.3,smoothLow:.2,smoothHigh:1};
  const cfg = {...PREV};

  const reduce = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  let renderer;
  try{
    renderer = new THREE.WebGLRenderer({alpha:true,antialias:false,powerPreference:'high-performance',stencil:false,depth:false});
  }catch(e){
    // sem WebGL: fica o preto liso do CSS da 04, e a 05 precisa do gradiente
    // rosa de reserva (ver .tech-bg-fallback, secao05.css) já que ela conta
    // com o canvas pra aparecer.
    const techBg = document.querySelector('.technologies .background');
    if(techBg) techBg.classList.add('tech-bg-fallback');
    return;
  }
  renderer.setPixelRatio(Math.min(Math.max(devicePixelRatio,1),1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.className = "izi-sec04-gl";
  renderer.domElement.setAttribute("aria-hidden","true");
  glow.appendChild(renderer.domElement);
  const scene = new THREE.Scene(), camera = new THREE.Camera();
  const U = {
    uAlpha:{value:1},uSplashTransition:{value:0},uResolution:{value:[1,1]},uAspect:{value:1},
    uColor1:{value:new THREE.Color(cfg.color1).convertLinearToSRGB()},
    uColor2:{value:new THREE.Color(cfg.color2).convertLinearToSRGB()},
    uColor3:{value:new THREE.Color(cfg.color3).convertLinearToSRGB()},
    uTime:{value:5},uDebugCurve:{value:0},uDebugNoise1:{value:0},uDebugNoise2:{value:0},uDebugNoise3:{value:0}
  };
  const map = {uColorWeightFactor:'colorWeightFactor',uColorMaxFactor:'colorMaxFactor',uRotateUV:'rotateUV',uCurveTransition:'curveVerticalTransition',uCurvePointA:'curvePointA',uCurvePointB:'curvePointB',uCurveScaleX:'curveScaleX',uApplyNoise:'applyNoise',uVerticalX:'verticalX',uVerticalY:'verticalY',uScale:'globalNoiseScale',uLayerAmp:'layerAmp',uSmoothLow:'smoothLow',uSmoothHigh:'smoothHigh',uLayerFreq1:'layerFreq1',uLayerSpeed1:'layerSpeed1',uNoiseScale1:'noiseScale1',uNoiseTime1:'noiseTime1',uNoiseIntensity1:'noiseIntensity1',uLayerFreq2:'layerFreq2',uLayerSpeed2:'layerSpeed2',uNoiseScale2:'noiseScale2',uNoiseTime2:'noiseTime2',uNoiseIntensity2:'noiseIntensity2',uLayerFreq3:'layerFreq3',uLayerSpeed3:'layerSpeed3',uNoiseScale3:'noiseScale3',uNoiseTime3:'noiseTime3',uNoiseIntensity3:'noiseIntensity3'};
  for(const [u,k] of Object.entries(map)) U[u] = {value:cfg[k]};
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.BufferAttribute(new Float32Array([-1,-1,0,1,-1,0,1,1,0,-1,-1,0,1,1,0,-1,1,0]),3));
  geo.setAttribute('uv',new THREE.BufferAttribute(new Float32Array([0,0,1,0,1,1,0,0,1,1,0,1]),2));
  const mat = new THREE.ShaderMaterial({vertexShader:VS,fragmentShader:FS,uniforms:U,depthTest:false,depthWrite:false,dithering:true,defines:{USE_NOISE:true}});
  const mesh = new THREE.Mesh(geo,mat); mesh.frustumCulled = false; scene.add(mesh);
  // color1/2/3 ficam FORA do "map" de propósito no código original: até
  // aqui nada nunca precisava trocar de cor (só a 04 rodava, cores fixas
  // desde a criação de U). STATE_PINK é a PRIMEIRA vez que algo tenta mudar
  // cfg.color1/2/3 depois da criação — sem sincronizar esses 3 uniforms
  // também, o gsap.to(cfg,{...}) do animateTo() muda o OBJETO cfg
  // perfeitamente, mas o shader nunca via a mudança (bug real, achado
  // testando: "sem mudança de cor nenhuma" reportado pela usuária).
  function syncU(){
    for(const [u,k] of Object.entries(map)) U[u].value = cfg[k];
    U.uColor1.value.set(cfg.color1).convertLinearToSRGB();
    U.uColor2.value.set(cfg.color2).convertLinearToSRGB();
    U.uColor3.value.set(cfg.color3).convertLinearToSRGB();
  }
  function size(){
    const w = Math.max(1,innerWidth), h = Math.max(1,innerHeight);
    renderer.setSize(w,h,false);
    U.uResolution.value = [w,h];
    U.uAspect.value = Math.pow(Math.min(w/h,1),.8);
  }
  function render(){ renderer.render(scene,camera); }
  size();

  // GradientBackground.animateTo — mesma transição independente de 3 s power2.inOut
  let gradientTweens = [];
  function animateTo(state,duration){
    gradientTweens.forEach(t => t.kill()); gradientTweens = [];
    if(reduce){ Object.assign(cfg,state); syncU(); render(); return; }
    gradientTweens.push(gsap.to(cfg,{duration:duration||3,...state,ease:'power2.inOut',onUpdate:syncU}));
  }

  // Progresso da seção (fórmula do original, com a rolagem suavizada) e os pontos
  // da troca de estado na NOSSA seção: B quando os compromissos entram (30% da
  // altura da tela antes do topo deles chegar no topo da tela); A, 5% antes.
  let sectionTop = 0, sectionHeight = 1, pA = .73, pB = .78;
  function measure(){
    const b = wrap.getBoundingClientRect();
    sectionTop = b.top + scrollY; sectionHeight = b.height || 1;
    const gTop = guiding.getBoundingClientRect().top + scrollY;
    pB = (gTop - innerHeight*.3 - (sectionTop - innerHeight)) / sectionHeight;
    pA = pB - .05;
  }
  const clamp01 = v => Math.min(1,Math.max(0,v));
  const progressAt = s => clamp01((innerHeight - (sectionTop - s)) / sectionHeight);
  function crossCallbacks(p,prev){
    if(prev < pA && p >= pA) animateTo(STATE_A,3);
    if(prev < pB && p >= pB) animateTo(STATE_B,3);
    if(prev > pB && p <= pB) animateTo(STATE_B,3);   // (igual ao original)
    if(prev > pA && p <= pA) animateTo(STATE_A,3);
  }

  // ===== Zonas extras — seções DEPOIS da 04 que também recebem este mesmo
  // canvas (hoje só a 05; lista genérica pra a 06 entrar depois só como mais
  // um item, sem reescrever nada disto). NADA do bloco acima (pA/pB/STATE_A/
  // STATE_B/measure/crossCallbacks/progressAt) foi tocado — continuam
  // calculando só sobre .izi-sec04-unified, exatamente como antes. As cores
  // da 04 (PREV: preto/verde) também não mudam enquanto o scroll está
  // dentro dela; STATE_PINK só entra depois que a 04 inteira já terminou. */
  // Só família verde→branco, reaproveitando os verdes EXATOS que a própria
  // 04 já usa (PREV.color2/color3) — sem inventar um preto novo, sem rosa
  // por enquanto. O preto "existe" na transição porque é a PRÓPRIA seção 04
  // (ainda no seu estado original) que aparece na hora da costura, antes
  // desse estado assumir — não precisa duplicar isso aqui.
  // colorWeightFactor/applyNoise sobrescritos (STATE_B tinha .39/.3,
  // calibrados pro efeito de revelação preto/verde da 04) — a usuária achou
  // a transição "abrupta/estranha" herdando esses valores: .39 concentra a
  // cor do meio numa faixa estreita (~39% da curva) e salta rápido pra
  // seguinte, como um "flash". .5 dá espaço mais equilibrado; ruído
  // reduzido pra não "sujar" o branco.
  // color2 trocado de #00FF66 (neon, exato da 04) pra um verde CLARO —
  // pedido explícito pra suavizar logo de cara, não só no 2º estágio.
  // color3 não é mais branco puro (#ffffff) — a usuária achou o salto pro
  // branco "forte demais". #e0f5e8 é um branco puxado pro verde, mantendo a
  // família de cor mais contínua em vez de saltar direto pra um branco
  // neutro.
  const STATE_PINK = {...STATE_B, color1:'#05421f', color2:'#8fe8c4', color3:'#e0f5e8', colorWeightFactor:.5, applyNoise:.15};
  // STATE_B (original) nunca define color1/2/3 — a 04 nunca precisava
  // resetar cor, só mudava geometria. Sem isso, "voltar pro repouso da 04"
  // (ver checkExtraZones) deixava as cores PARADAS no branco/verde de
  // STATE_PINK pra sempre, mesmo já de volta dentro da seção 04 — prejudica
  // a leitura do texto branco de lá (reportado pela usuária).
  const STATE_B_RESTORE = {...STATE_B, color1:PREV.color1, color2:PREV.color2, color3:PREV.color3};
  // 2º estágio: verde #006633 -> #CCFFCC (mais claro, era #99FFCC) -> #FF9999.
  const STATE_SUBTLE = {...STATE_B, color1:'#006633', color2:'#CCFFCC', color3:'#FF9999', colorWeightFactor:.5, applyNoise:.1};
  // Seção 06 (avaliações): claro (topo da tela) -> rosa da logo #FF0099
  // (meio, onde ficam os depoimentos) -> preto (embaixo). Geometria = STATE_B
  // (a mesma do original aprovado da 06 depois dos 50% de progresso).
  // colorWeightFactor .62: o rosa só "fecha" a 62% da altura da tela (de
  // cima pra baixo) — mais alto que o .39 do original pra o preto não subir
  // até o nome do cliente (abaixo do depoimento). Primeira passada: tons e
  // pesos ajustados depois com a usuária.
  const STATE_06 = {...STATE_B, color1:'#FFE9F4', color2:'#FF0099', color3:'#000000', colorWeightFactor:.62};
  // triggerPx: pixels DENTRO da própria zona (não fração da altura dela)
  // até disparar a troca — bem mais direto que reaproveitar a fórmula de
  // "progresso" da 04 (pensada pra seção comprida dela mesma). Essa fórmula
  // teria cruzado o limiar cedo demais, com a 04 ainda ocupando a tela toda.
  // Reduzido de 250 pra 40: a transição em si (animateTo, ver
  // checkExtraZones abaixo) leva um tempo REAL pra completar — disparando
  // cedo demais perto da costura, ela ainda está "no meio do caminho" (fundo
  // escuro) quando o usuário chega no título (mais abaixo), deixando o texto
  // escuro quase ilegível num fundo escuro (reportado com print).
  // "Escada" de estágios de cor, em ORDEM (triggerPx crescente) — não mais
  // zonas independentes. Cada estágio dispara ao passar do seu próprio
  // ponto; ao voltar, usa o ÚLTIMO estágio ainda válido pra trás (ou
  // STATE_B_RESTORE se nenhum). Isso resolve o caso de ter passado do 1º
  // estágio mas não do 2º: recuar um pouco não pulava direto pro preto da
  // 04, ficava preso no estágio errado com a lógica antiga (zonas
  // independentes, cada uma resetando tudo pro repouso da 04 ao sair).
  // extraZones = mesmo nome de antes só por compatibilidade com
  // measureExtra abaixo, que também é usada pra dimensionar o recorte do
  // canvas (união de todos os elementos únicos das etapas).
  const extraZones = [
    { el: document.querySelector('.technologies'), triggerPx:40, state:STATE_PINK },
    // Era 200, depois 900 — ainda aparecia neon na altura do título. Colado
    // bem perto do 1º estágio (40) pra virar quase um "flash" rápido de
    // verde bem na costura, já suavizado bem antes do título aparecer.
    { el: document.querySelector('.technologies'), triggerPx:80, state:STATE_SUBTLE },
    // 06: dispara 40% da altura da tela ANTES do topo da seção chegar no
    // topo da tela — com a 05 ainda ocupando os 40% de cima (rótulos escuros
    // sobre o topo CLARO do novo degradê) e o título da 06 (preto) ainda
    // entrando por baixo. Getter pra acompanhar a altura da janela.
    { el: document.querySelector('#confianca'), get triggerPx(){ return -innerHeight*.4; }, state:STATE_06 }
  ].filter(z => z.el);
  let activeStageIndex = -1;
  function measureExtra(){
    extraZones.forEach(z => {
      const b = z.el.getBoundingClientRect();
      z.top = b.top + scrollY; z.height = b.height || 1;
    });
    if(extraZones.length){
      // recorte estende pela ALTURA INTEIRA das zonas (união, caso tenham
      // elementos diferentes no futuro) — o canvas sempre desenha 1 tela
      // cheia por frame, então recortar uma janela mais alta não custa mais
      // caro (o gasto é por pixel de TELA, não por pixel de altura rolável).
      let maxBottom = -Infinity, refHeight = 1;
      extraZones.forEach(z => { maxBottom = Math.max(maxBottom, z.top + z.height); refHeight = z.height; });
      glow.style.bottom = 'auto';
      // + innerHeight: o recorte passa 1 tela do fim da última zona (06). O
      // palco dos cards fica nos últimos 100vh da 06, então com o recorte
      // terminando no fim da seção, o esmaecimento de baixo (máscara abaixo)
      // caía justo no rodapé da tela durante a leitura — "faixa" reportada
      // pela usuária. Passando 1 tela, o esmaecimento acontece embaixo da 07
      // (bloco opaco que cobre o canvas), fora da vista.
      glow.style.height = Math.max(1, maxBottom - sectionTop + innerHeight) + 'px';
      // sem isso, o canvas SOME numa linha reta exatamente onde o recorte
      // termina (reportado pela usuária: corte visível) — o overflow:hidden
      // sempre corta seco, então a única forma de suavizar é desvanecer o
      // PRÓPRIO canvas antes da borda, via máscara, não o clip em si.
      const fadePx = Math.min(220, refHeight);
      const mask = `linear-gradient(to bottom, #000 0, #000 calc(100% - ${fadePx}px), transparent 100%)`;
      glow.style.maskImage = mask;
      glow.style.webkitMaskImage = mask;
    }
  }
  function stageIndexFor(s){
    let idx = -1;
    extraZones.forEach((z,i) => { if(s >= z.top + z.triggerPx) idx = i; });
    return idx;
  }
  // Título branco enquanto o fundo ainda está escuro/verde (estágio 0,
  // "PINK"), preto assim que clarear (estágio 1, "SUBTLE" em diante) —
  // mesmos gatilhos da cor de fundo, ver .tech-on-dark em secao05.css.
  const techWrapEl = document.querySelector('.technologies');
  function syncTextColor(idx){
    if(!techWrapEl) return;
    techWrapEl.classList.toggle('tech-on-dark', idx < 1);
  }
  function checkExtraZones(s){
    const idx = stageIndexFor(s);
    if(idx !== activeStageIndex){
      // .3s (era .6s, 1.2s, e 3s como a 04 usa pra suas próprias trocas) —
      // pedido da usuária pra mudar mais rápido ainda.
      animateTo(idx >= 0 ? extraZones[idx].state : STATE_B_RESTORE, .3);
      activeStageIndex = idx;
      syncTextColor(idx);
    }
  }
  function snapExtra(){
    const idx = stageIndexFor(scrollY);
    activeStageIndex = idx;
    if(idx >= 0) Object.assign(cfg, extraZones[idx].state);
    syncU();
    syncTextColor(idx);
  }

  let scrollCurrent = scrollY, lastProgress = 0, last = performance.now(), running = false, inView = true;
  function snapState(p){
    // carregou já no meio da seção: aplica o estado direto, sem o morph de 3 s
    if(p >= pB) Object.assign(cfg,STATE_A,STATE_B); else if(p >= pA) Object.assign(cfg,STATE_A);
    syncU();
  }
  function tick(now){
    if(!running) return;
    const fr = Math.min(4,(now - last) / (1000/60)); last = now;
    scrollCurrent += (scrollY - scrollCurrent) * Math.min(1,.1*fr);
    const p = progressAt(scrollCurrent);
    if(p !== lastProgress){ crossCallbacks(p,lastProgress); lastProgress = p; }
    checkExtraZones(scrollCurrent);
    U.uTime.value += .01 * fr * cfg.globalSpeed;
    render();
    requestAnimationFrame(tick);
  }
  function update(){
    const want = inView && !document.hidden && !reduce;
    if(want && !running){ running = true; last = performance.now(); scrollCurrent = scrollY; requestAnimationFrame(tick); }
    else if(!want){ running = false; }
  }

  measure();
  lastProgress = progressAt(scrollY);
  snapState(lastProgress);
  measureExtra();
  snapExtra();
  render();
  // A altura das seções só "assenta" no valor final um tempo DEPOIS do
  // carregamento (fontes, imagens, outros scripts ainda ajustando layout) —
  // medir só uma vez no início trava o recorte do canvas num valor pequeno
  // errado (o corte "voltava" mesmo pedindo a altura inteira). Confirmado:
  // um ScrollTrigger.refresh() manual corrige na hora (o listener abaixo já
  // existia) — só que nada dispara esse refresh sozinho no carregamento
  // normal (só resize de janela). Re-medir por tempo garante certo mesmo
  // sem depender de outro código chamar refresh.
  // snapExtra() SEMPRE junto de measureExtra() — sem isso (bug real, achado
  // testando: "sem mudança de cor nenhuma"), a altura podia se corrigir
  // certinho mas a cor nunca era reavaliada contra o valor novo, ficando
  // presa em PREV pra sempre se o primeiro snapExtra() não tivesse pego a
  // altura certa a tempo.
  function remeasureAll(){ measure(); measureExtra(); snapExtra(); render(); }
  setTimeout(remeasureAll, 1200);
  setTimeout(remeasureAll, 2800);
  // ResizeObserver
  // reage a QUALQUER mudança de altura real da 04 ou da 05, não só resize de
  // janela/fonte — bem mais robusto que os listeners pontuais abaixo.
  if("ResizeObserver" in window){
    const ro = new ResizeObserver(remeasureAll);
    ro.observe(wrap);
    extraZones.forEach(z => ro.observe(z.el));
  }
  // inView agora é OR de todas as fontes observadas (.izi-sec04-unified +
  // cada zona extra) — sem isso, o loop de animação para assim que a 04
  // sai da tela, mesmo com a 05 ainda dentro do recorte estendido do
  // canvas, e checkExtraZones() nunca chega a rodar lá.
  let inViewWrap = true, inViewExtras = extraZones.map(() => false);
  function updateInView(){ inView = inViewWrap || inViewExtras.some(Boolean); update(); }
  if("IntersectionObserver" in window){
    new IntersectionObserver(es => { inViewWrap = es[0].isIntersecting; updateInView(); }).observe(wrap);
    extraZones.forEach((z,i) => {
      new IntersectionObserver(es => { inViewExtras[i] = es[0].isIntersecting; updateInView(); }).observe(z.el);
    });
  }
  document.addEventListener("visibilitychange",update);
  if(reduce){
    // um quadro parado; a troca de estado acontece direto, sem animação
    addEventListener("scroll",() => {
      const p = progressAt(scrollY);
      if(p !== lastProgress){ crossCallbacks(p,lastProgress); lastProgress = p; }
    },{passive:true});
    addEventListener("scroll",() => checkExtraZones(scrollY),{passive:true});
  }
  function relayout(){ size(); measure(); render(); }
  addEventListener("resize",relayout,{passive:true});
  addEventListener("resize",remeasureAll,{passive:true});
  if(window.ScrollTrigger && ScrollTrigger.addEventListener) ScrollTrigger.addEventListener("refresh",measure);
  if(window.ScrollTrigger && ScrollTrigger.addEventListener) ScrollTrigger.addEventListener("refresh",remeasureAll);
  if(document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
  if(document.fonts && document.fonts.ready) document.fonts.ready.then(remeasureAll);
  update();
})();
