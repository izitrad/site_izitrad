/* =====================================================================
   IZITRAD — landing (scaffold) · orquestração
   - Cada seção é INDEPENDENTE: init próprio, timeline própria, ScrollTrigger
     próprio, tudo ESCOPADO à sua <section> (gsap.utils.selector + root.query).
   - Nunca usa pin:true. O comprimento do scroll vem da altura da <section>;
     o filho sticky (CSS) mantém a cena visível. Sem pin-spacer.
   - Adicionar/remover/reordenar uma seção não quebra as outras.
   ===================================================================== */

/* --------------------- 00 · ONDAS (fundo animado do hero) ------------- */
/* Portado de um componente React (canvas + Perlin noise, grade de linhas
   que ondulam e reagem ao mouse/touch) pra JS puro — este site não usa
   build step nem React, então cada peça (classe Noise, física dos pontos,
   loop de render) vira função/objeto simples, sem hooks. */
function initWaves(canvas){
  if(matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  class Noise{
    constructor(seed){
      this.p=new Uint8Array(512);
      this.seed=seed>0&&seed<1?seed:Math.random();
      this.grad3=[[1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],[1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],[0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]];
      this.init(this.seed);
    }
    init(seed){
      const p=new Uint8Array(256);
      for(let i=0;i<256;i++) p[i]=i;
      for(let i=0;i<256;i++){ const j=Math.floor(seed*(i+1))%256; const k=p[i]; p[i]=p[j]; p[j]=k; }
      for(let i=0;i<512;i++) this.p[i]=p[i&255];
    }
    dot(g,x,y){ return g[0]*x+g[1]*y; }
    perlin2(x,y){
      const X=Math.floor(x)&255, Y=Math.floor(y)&255;
      x-=Math.floor(x); y-=Math.floor(y);
      const fade=t=>t*t*t*(t*(t*6-15)+10);
      const u=fade(x), v=fade(y), p=this.p, grad3=this.grad3;
      const n00=this.dot(grad3[p[X+p[Y]]%12],x,y);
      const n01=this.dot(grad3[p[X+p[Y+1]]%12],x,y-1);
      const n10=this.dot(grad3[p[X+1+p[Y]]%12],x-1,y);
      const n11=this.dot(grad3[p[X+1+p[Y+1]]%12],x-1,y-1);
      const lerp=(a,b,t)=>a+t*(b-a);
      return lerp(lerp(n00,n10,u),lerp(n01,n11,u),v);
    }
  }

  const CFG={
    GRID_X_GAP:10, GRID_Y_GAP:32, GRID_WIDTH_OFFSET:200, GRID_HEIGHT_OFFSET:30,
    WAVE_TIME_X_FACTOR:.0125, WAVE_NOISE_X_FACTOR:.002, WAVE_TIME_Y_FACTOR:.005, WAVE_NOISE_Y_FACTOR:.0015,
    WAVE_NOISE_MAGNITUDE:12, WAVE_AMPLITUDE_X:32, WAVE_AMPLITUDE_Y:16,
    MOUSE_INFLUENCE_RADIUS:175, MOUSE_FALLOFF_FACTOR:.001, MOUSE_FORCE_FACTOR:.00065, MOUSE_SMOOTHING_FACTOR:.1, MAX_MOUSE_VELOCITY:100,
    TENSION_STRENGTH:.005, FRICTION:.925, CURSOR_DISPLACEMENT_STRENGTH:2, MAX_CURSOR_DISPLACEMENT:100
  };

  const container=canvas.parentElement;
  const ctx=canvas.getContext('2d');
  const noise=new Noise(Math.random());
  const mouse={x:-10,y:0,lx:0,ly:0,sx:0,sy:0,v:0,vs:0,a:0,set:false};
  const lineColor='rgba(255,0,153,.55)';
  let lines=[], bounding=null, rafId=null;

  function moved(point, withCursorForce){
    const c={ x:point.x+point.wave.x+(withCursorForce?point.cursor.x:0), y:point.y+point.wave.y+(withCursorForce?point.cursor.y:0) };
    c.x=Math.round(c.x*10)/10; c.y=Math.round(c.y*10)/10;
    return c;
  }
  function setSize(){
    bounding=container.getBoundingClientRect();
    canvas.width=bounding.width; canvas.height=bounding.height;
  }
  function setLines(){
    if(!bounding) return;
    const {width,height}=bounding;
    lines=[];
    const oWidth=width+CFG.GRID_WIDTH_OFFSET, oHeight=height+CFG.GRID_HEIGHT_OFFSET;
    const totalLines=Math.ceil(oWidth/CFG.GRID_X_GAP), totalPoints=Math.ceil(oHeight/CFG.GRID_Y_GAP);
    const xStart=(width-CFG.GRID_X_GAP*totalLines)/2, yStart=(height-CFG.GRID_Y_GAP*totalPoints)/2;
    for(let i=0;i<=totalLines;i++){
      const points=[];
      for(let j=0;j<=totalPoints;j++){
        points.push({x:xStart+CFG.GRID_X_GAP*i, y:yStart+CFG.GRID_Y_GAP*j, wave:{x:0,y:0}, cursor:{x:0,y:0,vx:0,vy:0}});
      }
      lines.push(points);
    }
  }
  function movePoints(time){
    lines.forEach(points=>points.forEach(p=>{
      const nX=(p.x+time*CFG.WAVE_TIME_X_FACTOR)*CFG.WAVE_NOISE_X_FACTOR;
      const nY=(p.y+time*CFG.WAVE_TIME_Y_FACTOR)*CFG.WAVE_NOISE_Y_FACTOR;
      const move=noise.perlin2(nX,nY)*CFG.WAVE_NOISE_MAGNITUDE;
      p.wave.x=Math.cos(move)*CFG.WAVE_AMPLITUDE_X;
      p.wave.y=Math.sin(move)*CFG.WAVE_AMPLITUDE_Y;

      const dx=p.x-mouse.sx, dy=p.y-mouse.sy, d=Math.hypot(dx,dy);
      const influenceRadius=Math.max(CFG.MOUSE_INFLUENCE_RADIUS, mouse.vs);
      if(d<influenceRadius){
        const falloff=1-d/influenceRadius;
        const force=Math.cos(d*CFG.MOUSE_FALLOFF_FACTOR)*falloff;
        const forceFactor=force*influenceRadius*mouse.vs*CFG.MOUSE_FORCE_FACTOR;
        p.cursor.vx+=Math.cos(mouse.a)*forceFactor;
        p.cursor.vy+=Math.sin(mouse.a)*forceFactor;
      }
      p.cursor.vx+=(0-p.cursor.x)*CFG.TENSION_STRENGTH;
      p.cursor.vy+=(0-p.cursor.y)*CFG.TENSION_STRENGTH;
      p.cursor.vx*=CFG.FRICTION; p.cursor.vy*=CFG.FRICTION;
      p.cursor.x+=p.cursor.vx*CFG.CURSOR_DISPLACEMENT_STRENGTH;
      p.cursor.y+=p.cursor.vy*CFG.CURSOR_DISPLACEMENT_STRENGTH;
      p.cursor.x=Math.min(CFG.MAX_CURSOR_DISPLACEMENT, Math.max(-CFG.MAX_CURSOR_DISPLACEMENT, p.cursor.x));
      p.cursor.y=Math.min(CFG.MAX_CURSOR_DISPLACEMENT, Math.max(-CFG.MAX_CURSOR_DISPLACEMENT, p.cursor.y));
    }));
  }
  function drawLines(){
    if(!bounding) return;
    ctx.clearRect(0,0,bounding.width,bounding.height);
    ctx.beginPath();
    ctx.strokeStyle=lineColor;
    ctx.lineWidth=.5;
    lines.forEach(points=>{
      const p1=moved(points[0], false);
      ctx.moveTo(p1.x, p1.y);
      for(let i=0;i<points.length-1;i++){
        const cur=moved(points[i], true), next=moved(points[i+1], true);
        const xc=(cur.x+next.x)/2, yc=(cur.y+next.y)/2;
        ctx.quadraticCurveTo(cur.x, cur.y, xc, yc);
      }
    });
    ctx.stroke();
  }
  function tick(time){
    mouse.sx+=(mouse.x-mouse.sx)*CFG.MOUSE_SMOOTHING_FACTOR;
    mouse.sy+=(mouse.y-mouse.sy)*CFG.MOUSE_SMOOTHING_FACTOR;
    const dx=mouse.sx-mouse.lx, dy=mouse.sy-mouse.ly, d=Math.hypot(dx,dy);
    mouse.v=d;
    mouse.vs+=(d-mouse.vs)*CFG.MOUSE_SMOOTHING_FACTOR;
    mouse.vs=Math.min(CFG.MAX_MOUSE_VELOCITY, mouse.vs);
    mouse.a=Math.atan2(dy,dx);
    mouse.lx=mouse.sx; mouse.ly=mouse.sy;
    movePoints(time);
    drawLines();
    rafId=requestAnimationFrame(tick);
  }
  function updateMousePosition(x,y){
    if(!bounding) return;
    mouse.x=x-bounding.left; mouse.y=y-bounding.top;
    if(!mouse.set){ mouse.sx=mouse.x; mouse.sy=mouse.y; mouse.lx=mouse.x; mouse.ly=mouse.y; mouse.set=true; }
  }
  const onResize=()=>{ setSize(); setLines(); };
  const onMouseMove=e=>updateMousePosition(e.pageX, e.pageY);
  // sem preventDefault: no touch, o scroll da página (que é o motor do
  // hero inteiro) não pode ser bloqueado por essa interação decorativa.
  const onTouchMove=e=>{ if(e.touches[0]) updateMousePosition(e.touches[0].clientX, e.touches[0].clientY); };

  setSize(); setLines();
  addEventListener('resize', onResize);
  addEventListener('mousemove', onMouseMove);
  container.addEventListener('touchmove', onTouchMove, {passive:true});
  rafId=requestAnimationFrame(tick);
}

/* -------------------- 01+02 · HERO → O CAMINHO (palco único) ---------- */
/* Um único ScrollTrigger/timeline (scrub) cobre a sequência inteira:
   Hero (crescimento do triângulo + textos, igual antes) → entrada de
   .s2-layer (yPercent 100→0, ease:none, borda reta — a seção 2 REAL sobe
   cobrindo a Hero, sem painel/clone) → timeline interna de O Caminho (os
   mesmos "atos" que antes rodavam isolados em .sec-caminho, só deslocados
   no tempo pra começar depois que .s2-layer já está 100% posicionada).
   Nada de pin:true, nada de sticky aninhado, nada de 2º ScrollTrigger. */
function initHeroS2Story(root){
  let tl; // declarada aqui (atribuída mais abaixo) pra buildGrow poder re-sincronizá-la — ver buildGrow
  const wavesCanvas = root.querySelector('.hero-waves canvas');
  if(wavesCanvas) initWaves(wavesCanvas);
  const stage   = root.querySelector('.hero-layer');
  const s2Layer = root.querySelector('.s2-layer');
  const logo    = root.querySelector('.logo');
  const logoImg = root.querySelector('.logo__img');
  const logoWordWrap = root.querySelector('.hero-logo-word'); // reveal inicial (ver mais abaixo)
  const triWrap = root.querySelector('.hero-logo-triangle');  // reveal inicial (mesma tween que logoWordWrap)
  const wipe    = root.querySelector('.wipe');
  const wipePath= wipe.querySelector('path');
  const apost = root.querySelector('.ht[data-k="apost"]');
  const haia  = root.querySelector('.ht[data-k="haia"]');
  const sem   = root.querySelector('.ht[data-k="sem"]');
  const sair  = root.querySelector('.ht[data-k="sair"]');
  const decasa= root.querySelector('.ht[data-k="decasa"]');
  const copyP = root.querySelector('.reveal-copy p');
  const copyBtn = root.querySelector('.reveal-copy .btn');
  const hint  = root.querySelector('.hint');
  const header= document.querySelector('[data-header]');
  const ilDoc=root.querySelector('.il--doc'), ilDest=root.querySelector('.il--dest'), ilCam=root.querySelector('.il--cam');
  const introCopy=root.querySelector('.intro-copy'), introLink=root.querySelector('.intro-link');

  // calibra cada trecho HTML pro tamanho/posição exato medido no SVG original
  const DESKTOP_MIN = 900;
  function calibrateHTML(){
    const desktop = innerWidth >= DESKTOP_MIN;
    root.querySelectorAll('.reveal-html .ht').forEach((box)=>{
      const inner = box.querySelector('.ht__in');
      if(!desktop){ box.style.left=''; box.style.top=''; inner.style.fontSize=''; inner.style.transform=''; return; }
      const tx=parseFloat(box.dataset.x), ty=parseFloat(box.dataset.y), tw=parseFloat(box.dataset.w), th=parseFloat(box.dataset.h);
      box.style.left=tx+'px'; box.style.top=ty+'px';
      inner.style.transform='none'; inner.style.fontSize='300px';
      let r=inner.getBoundingClientRect();
      inner.style.fontSize=(300*th/r.height)+'px';
      r=inner.getBoundingClientRect();
      inner.style.transform='scaleX('+(tw/r.width).toFixed(4)+')';
    });
  }
  calibrateHTML();
  addEventListener('resize', calibrateHTML);
  if(document.fonts && document.fonts.ready){
    document.fonts.ready.then(()=>{ calibrateHTML(); ScrollTrigger.refresh(); });
  }

  // ---- crescimento do triângulo via WIDTH real (nítido), técnica validada ---
  const PHASE1_MULT=8, COVER_MARGIN=1.12;
  let anchorX0,anchorY0,triW0,triAspect,triTargetWidth,triHandoff,centerX,centerY;
  const proxy={w:0};

  function applyGrowth(){
    const tw=proxy.w;
    const t=(tw-triW0)/(triTargetWidth-triW0);
    const curAX=anchorX0+(centerX-anchorX0)*t;
    const curAY=anchorY0+(centerY-anchorY0)*t;
    const driftX=curAX-anchorX0, driftY=curAY-anchorY0;
    const sLogo=Math.min(tw,triHandoff)/triW0;
    logo.style.transform=`translate(${driftX.toFixed(1)}px,${driftY.toFixed(1)}px) scale(${sLogo.toFixed(4)})`;
    const pHandoff=Math.sqrt(Math.max(0,(triHandoff-triW0)/(triTargetWidth-triW0)));
    const fadeStart=pHandoff*0.7;
    const rawP=Math.sqrt(Math.max(0,t));
    const fadeT=rawP<=fadeStart?0:Math.min(1,(rawP-fadeStart)/(pHandoff-fadeStart));
    logo.style.opacity=(1-fadeT).toFixed(3);
    if(header){
      header.style.opacity=(1-fadeT).toFixed(3);
      header.style.pointerEvents=fadeT>=0.999?'none':'';
    }
    const th=tw*triAspect;
    wipe.style.transform='none';
    wipe.style.left=(curAX-tw/2)+'px';
    wipe.style.top=(curAY-th/2)+'px';
    wipe.style.width=tw+'px';
    wipe.style.height=th+'px';
  }
  function buildGrow(){
    logo.style.transform='none'; logo.style.opacity='1';
    if(header){ header.style.opacity='1'; header.style.pointerEvents=''; }
    wipe.style.transform='none';
    wipe.setAttribute('viewBox','78 100 1257 507');
    const s=stage.getBoundingClientRect();
    const lr=logoImg.getBoundingClientRect();
    // a apresentação inicial (.hero-logo-word/.hero-logo-triangle, ver a
    // tween logo abaixo) desliza os dois em y — se buildGrow rodar antes
    // disso terminar (ou de novo via onRefresh, com a apresentação ainda em
    // curso), os retângulos medidos vêm deslocados. Descontamos o
    // deslocamento ATUAL (0 se já terminou) pra sempre medir a posição
    // final de repouso. logo e triângulo compartilham a MESMA tween, logo
    // o MESMO entryY vale pros dois.
    const entryY = new DOMMatrixReadOnly(getComputedStyle(logoWordWrap).transform).m42;
    wipe.style.left=(lr.left-s.left)+'px';
    wipe.style.top=(lr.top-s.top-entryY)+'px';
    wipe.style.width=lr.width+'px';
    wipe.style.height=lr.height+'px';
    const t0=wipePath.getBoundingClientRect();
    const triCX=t0.left+t0.width/2, triCY=t0.top+t0.height/2;
    triW0=t0.width;
    const b=wipePath.getBBox();
    wipe.setAttribute('viewBox',`${b.x.toFixed(2)} ${b.y.toFixed(2)} ${b.width.toFixed(2)} ${b.height.toFixed(2)}`);
    triAspect=b.height/b.width;
    const logoRect=logo.getBoundingClientRect();
    // logo e triângulo deslizam pela MESMA tween (mesmo entryY) — a
    // diferença entre os dois não muda com o deslocamento, por isso o
    // transformOrigin não precisa de correção (diferente do anchorY0
    // abaixo, que é uma posição ABSOLUTA em relação ao stage).
    logo.style.transformOrigin=(triCX-logoRect.left).toFixed(1)+'px '+(triCY-logoRect.top).toFixed(1)+'px';
    anchorX0=triCX-s.left; anchorY0=triCY-entryY-s.top;
    centerX=window.innerWidth/2-s.left; centerY=window.innerHeight/2-s.top;
    triTargetWidth=(window.innerWidth+2*window.innerHeight/triAspect)*COVER_MARGIN;
    triHandoff=triW0*PHASE1_MULT;
    proxy.w=triW0; applyGrowth();
    // buildGrow também roda como onRefresh (resize, fonts.ready...) — a
    // qualquer momento do scroll, não só no carregamento. O reset acima
    // (proxy.w=triW0) deixa o triângulo do tamanho de repouso; se o usuário
    // já tiver rolado além do crescimento, isso "encolhe" o triângulo de
    // volta e ele FICA assim (nada mais re-renderiza a timeline sozinho),
    // expondo as ondas do fundo por trás do rosa — o bug da transição
    // Hero→O Caminho. Corrige forçando um novo render da timeline na
    // posição atual: isso chama de novo o onUpdate do tween de crescimento,
    // que recalcula proxy.w certo pro ponto do scroll em que já estamos.
    // Precisa do 3º argumento (force=true) — .time()/.time(mesmoValor)
    // sozinho é ignorado pelo GSAP quando o tempo não muda, exatamente
    // o caso aqui (só o valor de proxy.w mudou, não o tempo da timeline).
    if(tl) tl.render(tl.time(), false, true);
  }
  buildGrow();
  wipe.style.visibility='visible';   // já posicionado → pode mostrar (sem flash)

  // logo (.hero-logo-word) e triângulo (.hero-logo-triangle) entram como UM
  // objeto só: uma ÚNICA tween GSAP escreve autoAlpha/y nos dois — mesmo
  // valor, mesmo frame, sempre. Chamada DEPOIS do buildGrow() acima de
  // propósito: a medição já rodou com os dois wrappers no estado neutro
  // (sem transform), então o gsap.set abaixo não interfere na 1ª medição —
  // só refreshes futuros (onRefresh) precisam da correção via entryY.
  gsap.set([logoWordWrap, triWrap],{autoAlpha:0,y:14});
  gsap.to([logoWordWrap, triWrap],{autoAlpha:1,y:0,duration:.9,ease:'power3.out',delay:1.25});

  // marcos de tempo (unidades locais da timeline, não vh/px):
  //  0 .. 4.23        → Hero (crescimento + textos), inalterado
  //  4.23 .. 5.23      → FASE 1: .s2-layer sobe (yPercent 100→0)
  //  5.23 .. 7.33      → FASE 2: timeline interna de O Caminho
  const ENTRY_START=4.23, ENTRY_DUR=1.0, PHASE2_START=ENTRY_START+ENTRY_DUR;
  // introLink (o último texto a entrar) começa em PHASE2_START+1.05 e leva
  // 0.6 pra terminar — só depois disso o hambúrguer aparece. Antes disso o
  // triângulo rosa aparecia em cima do fundo AINDA rosa da Hero (a fase de
  // entrada) e ficava ilegível (rosa sobre rosa) — parecia uma "faixa" bugada.
  const COMPACT_START=PHASE2_START+1.05+0.6;
  const nav = header ? header.querySelector('.main-nav') : null;

  tl=gsap.timeline({ scrollTrigger:{ trigger:root, start:'top top', end:'bottom bottom',
    scrub:0.4, invalidateOnRefresh:true, onRefresh:buildGrow },
    // compacto (hambúrguer) só liga depois que TODO o texto de O Caminho já
    // revelou (ver COMPACT_START acima). Fica na MESMA timeline que já
    // controla tudo o resto: sem 2º listener pra dessincronizar (era
    // exatamente esse o bug corrigido mais cedo).
    onUpdate(){
      if(!header) return;
      // "this" (não a var "tl" de fora) evita referenciar "tl" antes de
      // ela existir — o GSAP já roda um render/onUpdate durante a própria
      // criação da timeline (o scrub sincroniza com a posição atual do
      // scroll assim que o ScrollTrigger é criado).
      const compact = this.time()>=COMPACT_START;
      if(header.hasAttribute('data-compact')!==compact){
        // troca instantânea (sem herdar as transitions de background/
        // opacity do header/nav) pra não "flashar" o menu na virada
        header.style.transition='none';
        if(nav) nav.style.transition='none';
        header.toggleAttribute('data-compact', compact);
        header.offsetHeight;
        requestAnimationFrame(()=>{ header.style.transition=''; if(nav) nav.style.transition=''; });
      }
    }
  });
  const grow={p:0};
  tl.to(grow,{p:1,ease:'power1.in',duration:2.18,onUpdate(){ proxy.w=triW0+(triTargetWidth-triW0)*grow.p; applyGrowth(); }},0)
    .to(hint,{autoAlpha:0,duration:0.25},0.2);
  const IN={autoAlpha:1,x:0,y:0,ease:'power2.out',duration:0.5};
  tl.fromTo(apost,{autoAlpha:0,x:-320},IN,2.28)
    .fromTo(haia,{autoAlpha:0,x:320},IN,2.43)
    .fromTo(sem,{autoAlpha:0,y:90},IN,2.58)
    .fromTo(sair,{autoAlpha:0,y:90},IN,2.68)
    .fromTo(decasa,{autoAlpha:0,y:90},IN,2.78)
    .fromTo(copyP,{autoAlpha:0,y:40},IN,2.93)
    .fromTo(copyBtn,{autoAlpha:0,y:40},IN,3.03);
  tl.to({},{duration:0.6},3.63);

  // FASE 1 — a seção 2 REAL sobe cobrindo a Hero. Borda reta, ease:none
  // (igual à referência): desde o 1º pixel já é o conteúdo real dela. Os
  // elementos visuais já existentes da Hero (sem fundo/ondas, sem wrapper
  // novo — DOM igual ao original) sobem um pouco menos e somem junto,
  // mesma posição/duração/ease, mesma timeline: dá profundidade (a Seção 2
  // "ultrapassa" a Hero) sem 2º ScrollTrigger e sem alterar a hierarquia.
  tl.fromTo(s2Layer,{yPercent:100},{yPercent:0,ease:'none',duration:ENTRY_DUR},ENTRY_START);
  // .wipe-fill fica de fora de propósito: no CSS original ela é sempre
  // opacity:0 (elemento inerte, nunca usado) — animar a opacidade dela
  // direto sobrescrevia esse 0 pra 1 já na criação da timeline, cobrindo a
  // cena inteira de rosa sólido no repouso (bug visto e corrigido agora).
  // .to() (não .fromTo()): .logo e .wipe já têm sua PRÓPRIA opacity/estado
  // controlados por applyGrowth (ex: logo já está em opacity 0 nesse ponto,
  // depois que o triângulo termina de crescer) — um "from" fixo sobrescrevia
  // isso e fazia a logo reaparecer cedo demais (outro bug já visto e
  // corrigido). .to() anima a partir do valor REAL de cada elemento nesse
  // instante, sem forçar nada. Só "y" — sem opacity: a Hero sobe sólida,
  // sem ficar transparente, e some por trás de .s2-layer (que já cobre
  // tudo com borda reta), não por dissolver.
  const heroVisuals = root.querySelectorAll('.logo, .wipe, .reveal-html, .reveal-copy, .hint');
  if(heroVisuals.length) tl.to(heroVisuals,{y:'-30vh',ease:'none',duration:ENTRY_DUR},ENTRY_START);

  // FASE 2 — só começa depois que .s2-layer está 100% posicionada. Mesma
  // lógica interna que já existia isolada (nenhuma animação foi alterada,
  // só o deslocamento de tempo pra encaixar depois da subida).
  const IN2={autoAlpha:1,x:0,y:0,ease:'power3.out',duration:0.6};
  tl.fromTo(ilDoc,{autoAlpha:0,x:-260},IN2,PHASE2_START+0.10)
    .fromTo(ilDest,{autoAlpha:0,x:260},IN2,PHASE2_START+0.35)
    .fromTo(ilCam,{autoAlpha:0,y:170},IN2,PHASE2_START+0.60)
    .fromTo(introCopy,{autoAlpha:0,y:40},IN2,PHASE2_START+0.90)
    .fromTo(introLink,{autoAlpha:0,y:40},IN2,PHASE2_START+1.05)
    .to({},{duration:0.7},PHASE2_START+1.4);
}

/* ----------------------------- 03 · A SOLUÇÃO ------------------------ */
function initSolucao(root){
  const q = gsap.utils.selector(root);
  const veinsSvg = root.querySelector('.veins');
  const svgNS='http://www.w3.org/2000/svg';
  const FINAL_SCALE=0.55;
  const CONNS=[
    {v:'v-jur', p:'pl-jur', anchor:'jur', to:'.n-jur', curve:40},
    {v:'v-tec', p:'pl-tec', anchor:'tec', to:'.n-tec', curve:46},
    {v:'v-simp',p:'pl-simp',anchor:'simp',to:'.n-simp',curve:-40},
    {v:'v-cert',p:'pl-cert',anchor:'cert',to:'.n-cert',curve:-46},
    {v:'v-haia',p:'pl-haia',fromSel:'.n-jur',to:'.n-haia',curve:30}
  ];
  const ctr = sel => { const r=root.querySelector(sel).getBoundingClientRect(); const s=veinsSvg.getBoundingClientRect(); return {x:r.left-s.left+r.width/2, y:r.top-s.top+r.height/2}; };
  function docAnchors(){
    const s=veinsSvg.getBoundingClientRect();
    const ds=root.querySelector('.doc-stage');
    const fw=ds.offsetWidth*FINAL_SCALE, fh=ds.offsetHeight*FINAL_SCALE;
    const dr=ds.getBoundingClientRect();
    const cx=dr.left-s.left+dr.width/2, cy=dr.top-s.top+dr.height/2;
    const L=cx-fw/2,R=cx+fw/2,T=cy-fh/2,B=cy+fh/2;
    return {_c:{x:cx,y:cy}, jur:{x:cx+fw*0.24,y:T}, tec:{x:R,y:cy-fh*0.02}, simp:{x:cx+fw*0.16,y:B}, cert:{x:L,y:cy+fh*0.06}};
  }
  const veinPath=(start,end,center,curve)=>{
    let ox=start.x-center.x, oy=start.y-center.y; const ol=Math.hypot(ox,oy)||1; ox/=ol; oy/=ol;
    const dx=end.x-start.x, dy=end.y-start.y, dl=Math.hypot(dx,dy)||1, nx=-dy/dl, ny=dx/dl;
    const c1x=start.x+ox*dl*0.30+nx*curve, c1y=start.y+oy*dl*0.30+ny*curve;
    const c2x=end.x-dx*0.30-nx*curve*0.5, c2y=end.y-dy*0.30-ny*curve*0.5;
    return `M${start.x.toFixed(1)},${start.y.toFixed(1)} C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${end.x.toFixed(1)},${end.y.toFixed(1)}`;
  };
  const organic=(a,b,curve)=>{
    const dx=b.x-a.x, dy=b.y-a.y, L=Math.hypot(dx,dy)||1, nx=-dy/L, ny=dx/L;
    const c1x=a.x+dx*.35+nx*curve, c1y=a.y+dy*.35+ny*curve;
    const c2x=a.x+dx*.68-nx*curve*.55, c2y=a.y+dy*.68-ny*curve*.55;
    return `M${a.x.toFixed(1)},${a.y.toFixed(1)} C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${b.x.toFixed(1)},${b.y.toFixed(1)}`;
  };
  const ensurePath=(cls,base)=>{ let el=veinsSvg.querySelector('.'+cls); if(!el){ el=document.createElementNS(svgNS,'path'); el.setAttribute('class',base+' '+cls); veinsSvg.appendChild(el); } return el; };
  const applyDraw=el=>{ el.style.strokeDashoffset=(el._len*(1-(el._p||0)))+'px'; };
  function updateVeins(){
    const s=veinsSvg.getBoundingClientRect(); if(!s.width) return;
    veinsSvg.setAttribute('viewBox',`0 0 ${s.width.toFixed(0)} ${s.height.toFixed(0)}`);
    const A=docAnchors();
    CONNS.forEach(c=>{
      const vp=ensurePath(c.v,'vein'), pp=ensurePath(c.p,'pulse');
      const start=c.anchor?A[c.anchor]:ctr(c.fromSel);
      const end=ctr(c.to);
      const d=c.anchor?veinPath(start,end,A._c,c.curve):organic(start,end,c.curve);
      vp.setAttribute('d',d); pp.setAttribute('d',d);
      vp._len=vp.getTotalLength(); vp.style.strokeDasharray=vp._len+'px'; applyDraw(vp);
      pp._len=pp.getTotalLength(); pp.style.strokeDasharray='14px '+pp._len+'px'; pp.style.strokeDashoffset=pp._len+'px';
    });
  }
  updateVeins();

  /* ---- 02 · os 5 caminhos (reta curta + curva suave doc→card + nós) --- */
  /* Curva "cotovelo" (elbow): cada trecho SAI do documento numa direção
     definida (reta) e CHEGA no card vindo de outra direção definida — dois
     pontos de controle colocados ao longo dessas tangentes (não um offset
     perpendicular genérico) — é o que dá o efeito "reta → curva suave →
     reta", sem parecer fluxograma (ângulo 90°) nem veia (serpenteia). Só
     bordas ESQUERDA/DIREITA do documento (nunca topo/baixo — 04/05 não
     descem pro rodapé). Chega na borda do CARD mais próxima do documento
     (não o centro, não o crachá do número).
     Estilo tracejado: a linha VISÍVEL (.cam-line) tem um stroke-dasharray
     FIXO (padrão "traço-espaço" curto) — não pode ser reaproveitado pro
     dashoffset de revelação (senão o padrão só desliza de fase, não
     revela/esconde nada). Por isso o desenho-por-scroll acontece numa
     <mask> separada (path invisível, mesmo d, comprimento REAL via
     getTotalLength, dasharray=length/dashoffset length→0 — a técnica de
     sempre) que recorta a linha visível — os dois efeitos (tracejado +
     revelação real) coexistem sem conflito. */
  const caminhosSvg = root.querySelector('.caminhos-svg');
  let caminhosDefs = caminhosSvg.querySelector('defs');
  if(!caminhosDefs){ caminhosDefs=document.createElementNS(svgNS,'defs'); caminhosSvg.appendChild(caminhosDefs); }
  const CAMINHOS = [
    // key usa prefixo "pc" (path-caminho) DE PROPÓSITO — "c1".."c5" puro
    // colide com a classe dos CARDS (.c1..c5) e, como o <path> vem antes
    // no DOM, root.querySelector('.c1') pegava a LINHA em vez do CARD.
    // dir0/f0 = direção+distância (fração do trajeto) que a linha sai RETA
    // do documento; dir1/f1 = direção de onde ela CHEGA no card.
    {key:'pc1', anchor:'rTop',   dir0:{x:1,y:0},     f0:.55, dir1:{x:0,y:-1},    f1:.5,  card:'.c1'},
    {key:'pc2', anchor:'lUpper', dir0:{x:-1,y:0},    f0:.62, dir1:{x:-1,y:-.25}, f1:.55, card:'.c2'},
    {key:'pc3', anchor:'rMid',   dir0:{x:1,y:0},     f0:.55, dir1:{x:1,y:.3},    f1:.5,  card:'.c3'},
    {key:'pc4', anchor:'lLower', dir0:{x:-.6,y:.7},  f0:.4,  dir1:{x:-1,y:.15},  f1:.55, card:'.c4'},
    {key:'pc5', anchor:'rLower', dir0:{x:1,y:.15},   f0:.5,  dir1:{x:.6,y:.6},   f1:.5,  card:'.c5'}
  ];
  const ensureCamPath=(cls)=>{ let el=caminhosSvg.querySelector('path.'+cls); if(!el){ el=document.createElementNS(svgNS,'path'); el.setAttribute('class','cam-line '+cls); caminhosSvg.appendChild(el); } return el; };
  const ensureCamNode=(cls)=>{ let el=caminhosSvg.querySelector('circle.'+cls); if(!el){ el=document.createElementNS(svgNS,'circle'); el.setAttribute('class','cam-node '+cls); el.setAttribute('r','3.4'); caminhosSvg.appendChild(el); } return el; };
  const ensureCamMask=(key)=>{
    let mask=caminhosDefs.querySelector('#camMask-'+key), path;
    if(!mask){
      mask=document.createElementNS(svgNS,'mask'); mask.setAttribute('id','camMask-'+key); mask.setAttribute('maskUnits','userSpaceOnUse');
      path=document.createElementNS(svgNS,'path');
      path.setAttribute('stroke','#fff'); path.setAttribute('fill','none'); path.setAttribute('stroke-width','22');
      mask.appendChild(path); caminhosDefs.appendChild(mask);
    } else path=mask.querySelector('path');
    return path;
  };
  function elbow(start,end,dir0,len0,dir1,len1){
    const n0=Math.hypot(dir0.x,dir0.y)||1, n1=Math.hypot(dir1.x,dir1.y)||1;
    const c1x=start.x+dir0.x/n0*len0, c1y=start.y+dir0.y/n0*len0;
    const c2x=end.x-dir1.x/n1*len1, c2y=end.y-dir1.y/n1*len1;
    return `M${start.x.toFixed(1)},${start.y.toFixed(1)} C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${end.x.toFixed(1)},${end.y.toFixed(1)}`;
  }
  function camDocAnchors(){
    const s=caminhosSvg.getBoundingClientRect();
    const dr=root.querySelector('.doc-stage').getBoundingClientRect();
    const cy=dr.top-s.top+dr.height/2;
    const L=dr.left-s.left, R=dr.right-s.left;
    // só esquerda/direita (nunca topo/baixo) — 5 regiões da própria folha,
    // proporcionais à altura real medida agora (getBoundingClientRect).
    return {
      rTop:  {x:R, y:cy-dr.height*0.33},  // 01 — direita, região superior (identificação)
      lUpper:{x:L, y:cy-dr.height*0.14},  // 02 — esquerda, região de conteúdo/texto
      rMid:  {x:R, y:cy+dr.height*0.03},  // 03 — direita, centro
      lLower:{x:L, y:cy+dr.height*0.30},  // 04 — esquerda, etapa posterior
      rLower:{x:R, y:cy+dr.height*0.40}   // 05 — direita, perto do rodapé rosa
    };
  }
  // ponto de ancoragem = o CRACHÁ numerado (.chip small), não o centro do
  // card — é ele quem "nasce" quando a linha chega (ver buildCaminho), a
  // linha mira nele diretamente. small só anima opacity/scale (nunca
  // posição), e scale a partir do centro não desloca o centro medido —
  // então, ao contrário do .chip inteiro antes, não precisa neutralizar
  // nada pra medir: o centro do crachá já é confiável a qualquer momento.
  function cardBadgeAnchor(cardEl, s, docCx, docL, docR){
    const badge=cardEl.querySelector('small');
    const br=badge.getBoundingClientRect();
    const bx=br.left-s.left+br.width/2, by=br.top-s.top+br.height/2;
    // em telas mais estreitas o crachá pode encostar (ou passar por baixo)
    // do documento — trava o ponto pra nunca ultrapassar a borda do doc.
    const x = bx<docCx ? Math.min(bx, docL-14) : Math.max(bx, docR+14);
    return {x, y:by};
  }
  function updateCaminhos(){
    const s=caminhosSvg.getBoundingClientRect(); if(!s.width) return;
    caminhosSvg.setAttribute('viewBox',`0 0 ${s.width.toFixed(0)} ${s.height.toFixed(0)}`);
    const A=camDocAnchors();
    const dr=root.querySelector('.doc-stage').getBoundingClientRect();
    const docCx=dr.left-s.left+dr.width/2, docL=dr.left-s.left, docR=dr.right-s.left;
    CAMINHOS.forEach(c=>{
      const el=ensureCamPath(c.key), maskPath=ensureCamMask(c.key);
      const start=A[c.anchor];
      const end=cardBadgeAnchor(root.querySelector(c.card), s, docCx, docL, docR);
      const dist=Math.hypot(end.x-start.x, end.y-start.y);
      const d=elbow(start, end, c.dir0, dist*c.f0, c.dir1, dist*c.f1);
      el.setAttribute('d', d);
      el.setAttribute('mask','url(#camMask-'+c.key+')');
      maskPath.setAttribute('d', d);
      maskPath._len=maskPath.getTotalLength(); maskPath.style.strokeDasharray=maskPath._len+'px'; applyDraw(maskPath);
      const n0=ensureCamNode(c.key+'-a'); n0.setAttribute('cx',start.x.toFixed(1)); n0.setAttribute('cy',start.y.toFixed(1));
    });
  }
  updateCaminhos();

  gsap.to(q('.doc'),{scale:1.014,duration:2.6,repeat:-1,yoyo:true,ease:'sine.inOut'});

  const tl=gsap.timeline({ scrollTrigger:{ trigger:root, start:'top top', end:'bottom bottom',
    scrub:1, invalidateOnRefresh:true, onRefresh:()=>{ updateVeins(); updateCaminhos(); } } });

  // sequência por caminho (obrigatória, cada etapa só começa depois que a
  // anterior "resolveu"): nó de origem → linha desenha (dasharray/
  // dashoffset real, não fade) → CÍRCULO grande nasce no destino (sem o
  // card ainda) → NÚMERO aparece dentro dele → pausa de leitura só com o
  // círculo+número → SÓ ENTÃO o corpo do card se abre, crescendo a partir
  // do círculo (scaleX, transform-origin do lado do círculo — ver CSS).
  // O crachá (círculo) nunca se move — fica parado como âncora enquanto o
  // corpo cresce ao lado dele. Tudo permanece visível depois (nada some).
  const LINE_DUR=1.0;
  const BADGE_AT=0.92, BADGE_DUR=0.22;   // fração de LINE_DUR em que o círculo nasce
  const NUM_GAP=0.05, NUM_DUR=0.16;      // número entra logo depois do círculo assentar
  const READ_PAUSE=0.28;                 // pausa só com círculo+número (pedido explícito)
  const BOX_DUR=0.42;                    // corpo do card se abrindo
  const buildCaminho=(cfg,at)=>{
    const maskPath=ensureCamMask(cfg.key);
    const nodeA=ensureCamNode(cfg.key+'-a');
    const cardEl=root.querySelector(cfg.card);
    const badge=cardEl.querySelector('small'), num=badge.querySelector('.badge-num'), box=cardEl.querySelector('.chip-box');

    tl.fromTo(nodeA,{opacity:0,scale:.5},{opacity:1,scale:1,duration:.15,ease:'power1.out'},at);

    const lineP={p:0};
    tl.to(lineP,{p:1,duration:LINE_DUR,ease:'power1.inOut',onUpdate(){ maskPath._p=lineP.p; applyDraw(maskPath); }},at);

    const badgeAt=at+LINE_DUR*BADGE_AT;
    tl.fromTo(badge,{opacity:0,scale:.4},{opacity:1,scale:1,duration:BADGE_DUR,ease:'back.out(2.2)'},badgeAt);

    const numAt=badgeAt+BADGE_DUR+NUM_GAP;
    tl.fromTo(num,{opacity:0},{opacity:1,duration:NUM_DUR},numAt);

    const boxAt=numAt+NUM_DUR+READ_PAUSE;
    tl.fromTo(box,{opacity:0,scaleX:0},{opacity:1,scaleX:1,duration:BOX_DUR,ease:'power2.out'},boxAt);
  };

  const activate=(key,svcSel,at)=>{
    const vp=root.querySelector('.v-'+key), pp=root.querySelector('.pl-'+key), node=root.querySelector('.n-'+key);
    const svc=root.querySelector(svcSel);
    const num=svc.querySelector('.svc-num'), title=svc.querySelector('.svc-title'), desc=svc.querySelector('.svc-desc'), line=svc.querySelector('.svc-line');
    const vO={p:0};
    tl.to(vO,{p:1,duration:.6,ease:'power1.inOut',onUpdate(){vp._p=vO.p;applyDraw(vp);}},at);
    const pO={p:0};
    tl.set(pp,{opacity:.95},at+0.4)
      .to(pO,{p:1,duration:.45,ease:'sine.in',onUpdate(){pp.style.strokeDashoffset=(pp._len*(1-pO.p))+'px';}},at+0.4)
      .to(pp,{opacity:0,duration:.18},at+0.86);
    tl.to(node,{opacity:1,scale:1.35,duration:.18,ease:'power2.out'},at+0.8)
      .to(node,{scale:1,duration:.22,ease:'power2.inOut'},at+0.98);
    tl.to(line,{opacity:1,scaleX:1,duration:.25,ease:'power2.out'},at+0.92);
    tl.to(num,{opacity:1,duration:.2},at+1.02)
      .fromTo(title,{opacity:0,y:8},{opacity:1,y:0,duration:.3,ease:'power2.out'},at+1.1)
      .fromTo(desc,{opacity:0,y:5},{opacity:.72,y:0,duration:.3,ease:'power2.out'},at+1.22);
  };

  gsap.set(q('.doc-stage'),{x:0,y:0,xPercent:-50,yPercent:-50,rotation:-4,scale:1});
  gsap.set(q('.s3-bg'),{y:0,yPercent:100});

  /* 01b — apresentação: texto entra primeiro, uma pequena pausa de
     leitura, só DEPOIS a folha entra (de baixo, um pouco menor, ganhando
     opacidade — chega na MESMA pose de repouso de sempre, só o y/scale
     acima são sobrescritos aqui pro estado inicial "escondida"). Antes os
     dois já apareciam prontos assim que a seção entrava em vista. Isso é
     só no .doc-stage (dono do scroll) — o .doc-mouse (tilt do mouse) não é
     tocado, continua isolado. INTRO = quanto essa apresentação empurra o
     resto da timeline; a altura da seção (site.css) cresce na mesma
     proporção pra não acelerar o resto do scroll. */
  gsap.set(q('.copy-a'),{opacity:0,y:32});
  gsap.set(q('.doc-stage'),{opacity:0,y:70,scale:.92});
  tl.to(q('.copy-a'),{opacity:1,y:0,duration:.42,ease:'power2.out'},0)
    .to(q('.doc-stage'),{opacity:1,y:0,scale:1,duration:.75,ease:'power2.out'},0.62);
  const INTRO=0.9;

  /* 02 — os 5 caminhos, um de cada vez: linha desenha → card nasce dela →
     os dois FICAM (nada é escondido) → começa o próximo. .doc-stage fica
     parado nessa fase (sem o "wobble" de rotação/escala que existia antes)
     de propósito — as linhas são recalculadas só no onRefresh (perf), não
     a cada frame do scroll, então precisam de um documento parado pra não
     desalinhar. Ritmo bem espaçado (SLOT largo) de propósito: a ideia é
     que cada caminho tenha espaço pra "respirar" antes do próximo nascer,
     em vez de tudo aparecer rápido demais. */
  const CAMINHOS_START=1.6, SLOT=2.4;
  // updateCaminhos() já rodou uma vez lá em cima (init), mas nesse momento
  // .doc-stage ainda está no estado "escondido" da apresentação inicial
  // (gsap.set aplica na hora, não espera o scroll) — geometria errada,
  // baseada numa pose que não é a de repouso. Recalcula de novo bem antes
  // do caminho 01 nascer, quando o documento já assentou de vez (a
  // apresentação termina por volta de 1.37) e NUNCA mais se move nessa
  // fase — uma vez corrigido aqui, fica certo pro resto da sequência.
  tl.call(updateCaminhos, null, CAMINHOS_START-0.05);
  CAMINHOS.forEach((cfg,i)=> buildCaminho(cfg, CAMINHOS_START+i*SLOT));
  const CAMINHOS_END=CAMINHOS_START+CAMINHOS.length*SLOT; // 1.6+5*1.5=9.1
  // quanto a sequência dos caminhos precisa a mais do que a antiga
  // "exploração" ocupava (2.3 unidades, de 0.7+INTRO a 3.0+INTRO) — soma-se
  // ao +INTRO de todo mundo depois daqui pra abrir espaço sem alterar o
  // resto da coreografia já aprovada, só deslocá-la.
  const CAMINHOS_SHIFT=CAMINHOS_END-(3.0+INTRO);

  /* transição 02→03 (o mesmo documento atravessa) — só começa quando os 5
     caminhos já estão completos (CAMINHOS_END), por isso o headline usa a
     mesma âncora que o resto do bloco (3.0+INTRO+CAMINHOS_SHIFT), não o
     "0.7+INTRO" antigo (que era do início da exploração, antes de existir
     a sequência dos caminhos — deixaria o headline sumir no meio dela). */
  tl.to(q('.copy-a'),{opacity:0,y:-50,duration:1},3.0+INTRO+CAMINHOS_SHIFT)
    .to(q('.chip'),{opacity:.12,y:10,duration:.7},3.0+INTRO+CAMINHOS_SHIFT)
    .to(q('.caminhos-svg'),{opacity:.1,duration:.6},3.0+INTRO+CAMINHOS_SHIFT)
    .to(q('.section-id'),{opacity:0,duration:.5},3.2+INTRO+CAMINHOS_SHIFT)
    .to(q('.s3-bg'),{yPercent:0,duration:1.4,ease:'power2.inOut'},3.2+INTRO+CAMINHOS_SHIFT)
    .to(q('.doc-stage'),{y:90,rotation:3,scale:.78,duration:.9,ease:'power1.in'},3.2+INTRO+CAMINHOS_SHIFT)
    .to(q('.doc-stage'),{y:0,rotation:-1.5,scale:.55,duration:1.0,ease:'power2.out'},4.05+INTRO+CAMINHOS_SHIFT)
    .to(q('.doc'),{boxShadow:'0 30px 80px rgba(0,0,0,.55), 0 0 62px rgba(255,0,153,.42)',duration:1.2},3.6+INTRO+CAMINHOS_SHIFT)
    .to(q('.chip, .caminhos-svg'),{opacity:0,duration:.4},4.4+INTRO+CAMINHOS_SHIFT);

  /* 03 — chegada + headline + halo */
  tl.to(q('.s3-id'),{opacity:1,duration:.5},4.8+INTRO+CAMINHOS_SHIFT)
    .fromTo(q('.s3-headline'),{opacity:0,x:-40},{opacity:1,x:0,duration:.8},4.9+INTRO+CAMINHOS_SHIFT)
    .fromTo(q('.s3-sub'),{opacity:0,x:-30},{opacity:1,x:0,duration:.8},5.2+INTRO+CAMINHOS_SHIFT)
    .fromTo(q('.halo'),{opacity:0,scale:.9},{opacity:1,scale:1,duration:1.0},5.3+INTRO+CAMINHOS_SHIFT);

  /* serviços ativados em sequência (linha → pulso → nó → rótulo) */
  activate('jur','.o-jur',5.7+INTRO+CAMINHOS_SHIFT);
  activate('haia','.o-haia',7.1+INTRO+CAMINHOS_SHIFT);
  activate('cert','.o-cert',8.1+INTRO+CAMINHOS_SHIFT);
  activate('tec','.o-tec',9.1+INTRO+CAMINHOS_SHIFT);
  activate('simp','.o-simp',10.1+INTRO+CAMINHOS_SHIFT);

  /* fechamento: composição recua, coração sobe, CTA centrado */
  tl.to(q('.s3-headline, .s3-sub'),{opacity:0,y:-20,duration:.6},11.6+INTRO+CAMINHOS_SHIFT)
    .to(q('.svc, .vein'),{opacity:0,duration:.7},11.6+INTRO+CAMINHOS_SHIFT)
    .to(q('.doc-stage'),{y:-60,scale:.5,rotation:0,duration:.9,ease:'power2.out'},11.6+INTRO+CAMINHOS_SHIFT)
    .fromTo(q('.s3-close'),{opacity:0,y:24},{opacity:1,y:0,duration:.8,ease:'power2.out'},12.0+INTRO+CAMINHOS_SHIFT)
    .to({},{duration:.9},13.0+INTRO+CAMINHOS_SHIFT);

  gsap.to(q('.progress i'),{height:'100%',ease:'none',
    scrollTrigger:{trigger:root,start:'top top',end:'bottom bottom',scrub:true}});
}

/* ------------------- 03b · INTERAÇÃO DE MOUSE NO DOCUMENTO ------------ */
/* Isolada de propósito: .doc-stage é 100% do scroll (initSolucao acima) e
   .doc (a folha inteira: moldura, fundo, sombra, cantos, conteúdo) já roda
   o breathing loop (scale) + o boxShadow do scroll — nenhum dos dois é
   tocado aqui. O mouse escreve SÓ em .doc-mouse (rotação/translação 3D,
   envolve a folha INTEIRA como peça única) e .doc-shadow (sombra), dois
   elementos próprios — os três sistemas de transform nunca disputam a
   mesma propriedade, e nada DENTRO da folha se move independente dela. */
function initDocInteraction(root){
  if(!matchMedia('(hover: hover) and (pointer: fine)').matches) return; // touch: sem tilt, só scroll
  const stage = root.querySelector('.doc-stage');
  const inner = root.querySelector('.doc-mouse');
  if(!stage || !inner) return;
  const shadow = root.querySelector('.doc-shadow');

  const MAX_ROT_Y=10, MAX_ROT_X=8, MAX_T=6, MAX_SHADOW_T=4;
  const EASE={duration:0.9,ease:'power3'};
  const setRotY = gsap.quickTo(inner,'rotationY',EASE);
  const setRotX = gsap.quickTo(inner,'rotationX',EASE);
  const setTX   = gsap.quickTo(inner,'x',EASE);
  const setTY   = gsap.quickTo(inner,'y',EASE);
  const setShX  = shadow ? gsap.quickTo(shadow,'x',EASE) : null;
  const setShY  = shadow ? gsap.quickTo(shadow,'y',EASE) : null;

  function onMove(e){
    const r = stage.getBoundingClientRect(); // .doc-stage se move no scroll — mede a cada evento, não por rAF
    if(!r.width || !r.height) return;
    const cx = Math.max(-1,Math.min(1, ((e.clientX-r.left)/r.width)*2-1));
    const cy = Math.max(-1,Math.min(1, ((e.clientY-r.top)/r.height)*2-1));
    setRotY(cx*MAX_ROT_Y);
    setRotX(-cy*MAX_ROT_X);
    setTX(cx*MAX_T);
    setTY(cy*MAX_T);
    if(setShX){ setShX(-cx*MAX_SHADOW_T); setShY(-cy*MAX_SHADOW_T); }
  }
  function onLeave(){
    setRotY(0); setRotX(0); setTX(0); setTY(0);
    if(setShX){ setShX(0); setShY(0); }
  }
  stage.addEventListener('pointermove', onMove, {passive:true});
  stage.addEventListener('pointerleave', onLeave, {passive:true});
}

/* ------------------------------ ORQUESTRAÇÃO ------------------------- */
(function(){
  document.documentElement.classList.remove('no-js');
  document.body.classList.remove('pre-anim');

  // Header: toggle do menu mobile + estado "scrolled" (base p/ refinar depois)
  const header=document.querySelector('[data-header]');
  const navToggle=document.querySelector('[data-nav-toggle]');
  if(header && navToggle){
    navToggle.addEventListener('click',()=>{
      const open=header.hasAttribute('data-nav-open');
      header.toggleAttribute('data-nav-open', !open);
      navToggle.setAttribute('aria-expanded', String(!open));
    });
    header.querySelectorAll('.main-nav a').forEach(a=>a.addEventListener('click',()=>{
      header.removeAttribute('data-nav-open');
      navToggle.setAttribute('aria-expanded','false');
    }));
    const onScroll=()=>{ header.toggleAttribute('data-scrolled', scrollY>10); };
    onScroll(); addEventListener('scroll',onScroll,{passive:true});
    // Compacto (hambúrguer): agora controlado de dentro da própria timeline
    // Hero→O Caminho (ver initHeroS2Story) — nada aqui, evita 2 sistemas
    // brigando pelo mesmo atributo (era a causa do bug corrigido antes).
  }

  // Inits por seção — independentes. Sem GSAP ou reduced-motion → CSS estático.
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(window.gsap && window.ScrollTrigger && !reduce){
    gsap.registerPlugin(ScrollTrigger);
    document.querySelectorAll('.sec[data-sec]').forEach(sec=>{
      const kind=sec.dataset.sec;
      if(kind==='hero-s2-story') initHeroS2Story(sec);
      else if(kind==='solucao'){ initSolucao(sec); initDocInteraction(sec); }
    });
    if(document.fonts && document.fonts.ready){ document.fonts.ready.then(()=>ScrollTrigger.refresh()); }
  }
})();
