/* Seção 04 — fundo preto com o verde da izitrad, shader ALTERNATIVO escrito por
   nós (TESTE: só liga com ?fundo=meu; ?fundo=preto é a versão 1:1 do
   laboratório, em secao04-fundo-1a1.js).
   Arquivo independente (não depende do secao04.js): cria um <canvas> dentro de
   .izi-sec04-glow e desenha um gradiente preto → verde deformado por ruído, bem
   lento. Shader e ruído escritos aqui (técnica: campo de ruído fbm deformando
   uma curva de gradiente); sem biblioteca — WebGL puro.

   Como funciona o recorte: o canvas é position:fixed (tela cheia) e o
   .izi-sec04-glow tem clip-path:inset(0) — clip-path recorta também
   descendentes fixed, então o fundo só aparece dentro da seção 04 e some nas
   vizinhas, sem precisar de sticky (o sticky da faixa não pode ter ancestral
   com overflow).

   Custo: o gradiente é suave, então renderiza a METADE da resolução (o CSS
   estica) e só enquanto a seção está na tela e a aba visível. Com "reduzir
   movimento" (prefers-reduced-motion) desenha um quadro só, parado.

   Desligar/remover: tirar o <script> do index.html e o bloco
   "?fundo=preto" do secao04.css. Sem WebGL: fica o preto liso do CSS. */
(function(){
  "use strict";
  if(new URLSearchParams(location.search).get("fundo") !== "meu") return; // (?fundo=preto = versão 1:1, secao04-fundo-1a1.js)
  var wrap = document.querySelector(".izi-sec04-unified");
  var glow = document.querySelector(".izi-sec04-glow");
  if(!wrap || !glow) return;
  wrap.classList.add("izi-sec04-dark");
  // logo "izi" da pergunta (PNG com os "i" pretos): no preto usa a versão com os
  // "i" brancos e o "z" rosa (mesmas dimensões, então o recorte não muda)
  var qLogo = document.querySelector(".izi-q-logo-img");
  if(qLogo) qLogo.src = "assets/logo-izi-branca.png";

  var canvas = document.createElement("canvas");
  canvas.className = "izi-sec04-gl";
  canvas.setAttribute("aria-hidden", "true");
  glow.appendChild(canvas);
  var gl = canvas.getContext("webgl", {alpha:false, antialias:false, powerPreference:"low-power"});
  if(!gl) return;

  var VS = "attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}";
  var FS = [
    "precision mediump float;",
    "uniform vec2 uRes;uniform float uTime;",
    "float hash(vec3 p){p=fract(p*0.3183099+vec3(.1,.2,.3));p*=17.0;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}",
    "float vn(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.0-2.0*f);",
    " return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),",
    "            mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}",
    "float fbm(vec3 p){float a=.5,s=0.;for(int i=0;i<3;i++){s+=a*vn(p);p*=2.03;a*=.5;}return s;}",
    "void main(){",
    " vec2 uv=gl_FragCoord.xy/uRes;float asp=uRes.x/uRes.y;",
    " vec2 p=vec2((uv.x-.5)*asp,uv.y-.5);float t=uTime;",
    /* velocidade de evolução ~.25 (n1) e ~.2 (n2) células de ruído por segundo
       (a 1ª versão tinha ~.06 e parecia parada; a referência tem ~.15–.36) */
    " float n1=fbm(vec3(p*1.1+vec2(0.,t*.08),t*.25));",
    " float n2=fbm(vec3(p*1.8-vec2(t*.07,0.),t*.2+7.));",
    /* dois focos de luz que PASSEIAM pela tela (períodos de ~50 a 100 s, em
       fases diferentes); a 1ª versão tinha um degradê fixo à direita e o ruído
       só o deformava — o brilho nunca saía de lá. Perto dos focos o ruído tem
       mais peso (amp), longe deles o campo fica quase preto. */
    " vec2 q1=vec2(.55*sin(t*.09),.28*sin(t*.07+1.3));",
    " vec2 q2=vec2(.5*sin(t*.06+3.1),.3*sin(t*.08+.4));",
    " float b1=1.-smoothstep(0.,.85,length((p-q1)*vec2(.75,1.25)));",
    " float b2=1.-smoothstep(0.,.7,length((p-q2)*vec2(.75,1.25)));",
    " float base=max(b1,b2*.8);",
    " float amp=.55+.55*base;",
    " float f=base*1.1+(n1-.5)*amp+(n2-.5)*.3*amp-.05;",
    " vec3 c0=vec3(0.),c1=vec3(0.,.09,.04),c2=vec3(0.,1.,.4);", /* preto, verde fundo, #00FF66 */
    " vec3 col=mix(c0,c1,smoothstep(.15,.6,f));",
    " col=mix(col,c2,smoothstep(.55,1.05,f)*.42);",
    " col+=(hash(vec3(gl_FragCoord.xy,t))-.5)/255.;", /* dither: evita faixas no degradê escuro */
    " gl_FragColor=vec4(col,1.);",
    "}"
  ].join("\n");

  function sh(type, src){
    var s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
  }
  var vs = sh(gl.VERTEX_SHADER, VS), fs = sh(gl.FRAGMENT_SHADER, FS);
  if(!vs || !fs) return;
  var prog = gl.createProgram();
  gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
  if(!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
  gl.useProgram(prog);
  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW); // 1 triângulo cobre a tela
  var loc = gl.getAttribLocation(prog, "a");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  var uRes = gl.getUniformLocation(prog, "uRes"), uTime = gl.getUniformLocation(prog, "uTime");

  var SCALE = .5, time = 5, last = performance.now(), running = false, inView = true;
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  function resize(){
    var w = Math.max(1, Math.round(innerWidth * SCALE)), h = Math.max(1, Math.round(innerHeight * SCALE));
    if(canvas.width !== w || canvas.height !== h){ canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); }
    draw();
  }
  function draw(){
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform1f(uTime, time);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  function frame(now){
    if(!running) return;
    time += Math.min(.1, (now - last) / 1000); last = now; // 1 unidade de tempo por segundo
    draw();
    requestAnimationFrame(frame);
  }
  function update(){
    var want = inView && !document.hidden && !reduce;
    if(want && !running){ running = true; last = performance.now(); requestAnimationFrame(frame); }
    else if(!want){ running = false; }
  }
  if("IntersectionObserver" in window){
    new IntersectionObserver(function(es){ inView = es[0].isIntersecting; update(); }).observe(wrap);
  }
  document.addEventListener("visibilitychange", update);
  addEventListener("resize", resize, {passive:true});
  resize(); update();
})();
