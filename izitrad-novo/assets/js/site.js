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
  // PERF #1 (gating por visibilidade): só anima/desenha as ondas quando o
  // hero está (perto de) visível. NÃO destrói canvas/estado — só suspende o
  // trabalho do loop e retoma. rootMargin pré-ativa antes de aparecer.
  let wavesVisible=true;
  if('IntersectionObserver' in window){
    new IntersectionObserver(es=>{ wavesVisible = es.some(e=>e.isIntersecting); }, {rootMargin:'300px'}).observe(container);
  }
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
    if(wavesVisible){
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
    }
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
  const focusChars = buildFocusChars(copyP); // ver FOCUS TEXT acima
  const hint  = root.querySelector('.hint');
  const header= document.querySelector('[data-header]');
  const ilDoc=root.querySelector('.il--doc'), ilDest=root.querySelector('.il--dest'), ilCam=root.querySelector('.il--cam');
  const introCopy=root.querySelector('.intro-copy'), introLink=root.querySelector('.intro-link');
  const introEyebrow=root.querySelector('.intro-eyebrow');
  // giro de entrada das letras (rolling text — ver ROLLING TEXT acima),
  // por CIMA do slide/fade que já existia (fromTo ilDoc/ilDest/ilCam mais
  // abaixo) — não troca a animação de entrada, soma a ela. O rótulo
  // "02 — O CAMINHO" (intro-eyebrow) nunca teve entrada nenhuma (só
  // aparece junto com a camada) — aqui ele ganha a mesma, sozinho.
  const ilDocReels=buildRollingLabel(ilDoc, {words:true}), ilDestReels=buildRollingLabel(ilDest), ilCamReels=buildRollingLabel(ilCam);
  const introEyebrowReels=buildRollingLabel(introEyebrow);

  // calibra cada trecho HTML pro tamanho/posição exato medido no SVG original
  const DESKTOP_MIN = 900;
  // RENTE ÀS BORDAS (pedido da usuária): o quadro 1920x1080 dos títulos agora
  // ESCALA pela largura da tela (s = innerWidth/1920), então o hero fica igual
  // em qualquer largura. "APOSTILAMENTO" ocupa a tela toda menos EDGE_PX de
  // folga de cada lado, e o bloco "SEM SAIR / DE CASA" termina EDGE_PX antes da
  // borda direita. A folga é em px REAIS (EDGE_PX/s em unidades do quadro).
  // Geometria BASE (data-x/y/w/h no HTML): apost 1647x147, haia 442x84, sem
  // 465x177, sair 504x177, decasa 999x180, bloco branco começando em x=740, gap
  // de 30 entre linhas. k1 estica a linha de cima até a largura toda; k2 estica
  // o bloco branco (e "DE HAIA", que acompanha ele) até a borda direita,
  // mantendo a borda ESQUERDA dele em 740 (onde o parágrafo já termina).
  const FRAME_W = 1920, EDGE_PX = 10;
  function heroGeometry(s){
    const mu = EDGE_PX/s;
    const k1 = (FRAME_W - 2*mu)/1647;
    const R = FRAME_W - mu, X0 = 740, k2 = (R - X0)/999, GAP = 45;   // GAP = entrelinha VERTICAL entre as 3 linhas (era 30)
    const y1 = 140, h1 = 147*k1, y2 = y1 + h1 + GAP, hRow = 177*k2, y3 = y2 + hRow + GAP;
    // "DE HAIA" 25% maior (HAIA_SCALE): a borda DIREITA (junto do "SEM") e o topo
    // (alinhado com o "SEM") ficam onde estavam; cresce pra esquerda e pra baixo.
    const HAIA_SCALE = 1.25;
    const wHaia = 442*k2*HAIA_SCALE;
    return {
      apost: {x:mu,                   y:y1, w:FRAME_W - 2*mu, h:h1},
      // y: "DE HAIA" CENTRALIZADO na altura do "SEM SAIR" (meio-termo entre alinhar o
      // topo, y2, e alinhar a base, y2+hRow-h): divide o espaço vazio da coluna
      // esquerda em duas metades, em cima e embaixo dele.
      haia:  {x:X0 - 30*k2 - wHaia,   y:y2 + (hRow - 84*k2*HAIA_SCALE)/2, w:wHaia, h:84*k2*HAIA_SCALE},
      sem:   {x:X0,                   y:y2, w:465*k2,         h:hRow},
      sair:  {x:X0 + 495*k2,          y:y2, w:504*k2,         h:hRow},
      decasa:{x:X0,                   y:y3, w:R - X0,         h:180*k2}
    };
  }
  // ALINHAMENTO PELA TINTA (não pela caixa): a caixa do texto não coincide com a
  // tinta das letras — cada letra tem folga lateral própria (o "O" é mais
  // afastado que o "R"/"A") e o letter-spacing negativo também vale DEPOIS da
  // última letra, então a tinta do fim passa um pouco da caixa. Pra a folga de
  // EDGE_PX valer pra tinta, medimos onde a tinta realmente começa e termina:
  // a POSIÇÃO do 1º e do último glifo vem do próprio DOM (Range, então já inclui
  // letter-spacing/kerning/arredondamento reais) e a folga lateral da forma de
  // cada um vem do canvas (measureText de UM glifo, no mesmo tamanho). Uma versão
  // que desenhava o texto inteiro no canvas errava uns 5px no fim das palavras
  // largas (o canvas e o DOM arredondam o avanço das letras de jeito diferente).
  // Tudo medido SEM escala (calibrateHTML zera transform do inner e do quadro);
  // o x do GSAP das metades animadas (.ht-a, .ht-m...) é descontado.
  const inkCtx = document.createElement('canvas').getContext('2d');
  function gsapShiftX(node, inner){
    let sh = 0;
    for(let e = node.parentElement; e && e !== inner; e = e.parentElement){
      sh += (window.gsap && gsap.getProperty(e,'x')) || 0;
    }
    return sh;
  }
  function inkEdges(inner){
    const w = document.createTreeWalker(inner, NodeFilter.SHOW_TEXT, {acceptNode:(n)=>
      (n.parentElement.closest('.sem-line') || !n.textContent.trim()) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT});
    let first = null, last = null;
    while(w.nextNode()){ if(!first) first = w.currentNode; last = w.currentNode; }
    if(!first) return null;
    const cs = getComputedStyle(inner);
    inkCtx.font = cs.fontWeight+' '+cs.fontSize+' '+cs.fontFamily;
    if('letterSpacing' in inkCtx) inkCtx.letterSpacing = '0px';
    const base = inner.getBoundingClientRect().left;
    const i1 = first.textContent.search(/\S/), i2 = last.textContent.search(/\S\s*$/);
    const rg = document.createRange();
    rg.setStart(first, i1); rg.setEnd(first, i1+1);
    const o1 = rg.getBoundingClientRect().left - base - gsapShiftX(first, inner);
    rg.setStart(last, i2); rg.setEnd(last, i2+1);
    const o2 = rg.getBoundingClientRect().left - base - gsapShiftX(last, inner);
    const m1 = inkCtx.measureText(first.textContent[i1]), m2 = inkCtx.measureText(last.textContent[i2]);
    return {l: o1 - m1.actualBoundingBoxLeft, r: o2 + m2.actualBoundingBoxRight};
  }
  function calibrateHTML(){
    const desktop = innerWidth >= DESKTOP_MIN;
    const frame = root.querySelector('.reveal-html .hr-frame');
    // largura REAL do palco (sem a barra de rolagem, que come ~15px do innerWidth)
    const stageW = (root.querySelector('.reveal-html') || {}).clientWidth || innerWidth;
    const s = stageW/FRAME_W;
    const geo = desktop ? heroGeometry(s) : null;
    // mede SEM escala (getBoundingClientRect devolveria px já escalados)
    if(frame) frame.style.transform = desktop ? 'translate(-50%,-50%)' : '';
    root.querySelectorAll('.reveal-html .ht').forEach((box)=>{
      const inner = box.querySelector('.ht__in');
      if(!desktop){ box.style.left=''; box.style.top=''; inner.style.fontSize=''; inner.style.transform=''; return; }
      const g = geo[box.dataset.k];
      const tx=g.x, ty=g.y, tw=g.w, th=g.h;
      box.style.left=tx+'px'; box.style.top=ty+'px';
      inner.style.transform='none'; inner.style.fontSize='300px';
      let r=inner.getBoundingClientRect();
      const fs = 300*th/r.height;
      inner.style.fontSize=fs+'px';
      const ink = inkEdges(inner);
      if(ink && ink.r > ink.l){
        // tinta de tx a tx+tw: escala pela LARGURA DA TINTA e recua a caixa pelo
        // offset esquerdo da tinta (já escalado)
        const il = ink.l, ir = ink.r, sx = tw/(ir-il);
        inner.style.transform='scaleX('+sx.toFixed(4)+')';
        box.style.left=(tx - il*sx)+'px';
      }else{
        r=inner.getBoundingClientRect();
        inner.style.transform='scaleX('+(tw/r.width).toFixed(4)+')';
      }
    });
    if(frame && desktop) frame.style.transform = 'translate(-50%,-50%) scale('+s.toFixed(5)+')';
    // PARÁGRAFO + BOTÃO como um bloco ancorado nos títulos (variáveis CSS lidas em
    // site.css, só em desktop): a esquerda alinha com a esquerda (tinta) do "DE
    // HAIA"; o topo com o topo do "DE CASA" e a altura é a do "DE CASA" (o botão
    // fica na base dele; o miolo se distribui por flex space-between); a largura
    // vai até 44px antes de onde o "DE CASA" começa. O topo do quadro na tela é
    // 55% da altura do palco - 540*s (quadro centrado em top:55%).
    const copy = root.querySelector('.reveal-copy');
    if(copy){
      if(desktop){
        const stageH = (root.querySelector('.reveal-html') || {}).clientHeight || innerHeight;
        const frameTop = 0.55*stageH - 540*s;
        const dc = geo.decasa, hz = geo.haia;
        const left = hz.x*s;
        copy.style.setProperty('--copy-left', left.toFixed(1)+'px');
        copy.style.setProperty('--copy-top', (frameTop + dc.y*s).toFixed(1)+'px');
        copy.style.setProperty('--copy-h', (dc.h*s).toFixed(1)+'px');
        copy.style.setProperty('--copy-w', Math.max(200, dc.x*s - 44 - left).toFixed(1)+'px');
      }else{
        ['--copy-left','--copy-top','--copy-h','--copy-w'].forEach((p)=>copy.style.removeProperty(p));
      }
    }
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
  // delay: a saudação ("Olá," .15s, "somos" .7s, "a" 1.25s + .8s de duração, ver
  // .logo__greet-word--N em site.css) termina em 2.05s; a logo entra 0.04s DEPOIS
  // (2.09s), com uma pausa mínima, e não junto com o "a" como era com delay 1.25.
  gsap.to([logoWordWrap, triWrap],{autoAlpha:1,y:0,duration:.9,ease:'power3.out',delay:2.09});

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
  // "APOSTILA" entra primeiro (da esquerda, como a palavra inteira entrava) e
  // "MENTO" logo depois (da direita), na mesma janela dos outros títulos →
  // duração da timeline e gatilhos inalterados. O .ht fica visível desde já;
  // quem esconde cada metade antes da hora é o autoAlpha:0 do fromTo.
  const apostA = root.querySelector('.ht[data-k="apost"] .ht-a');
  const apostM = root.querySelector('.ht[data-k="apost"] .ht-m');
  gsap.set(apost,{autoAlpha:1});
  // OBS: o GSAP grava o "from" DENTRO do objeto "to" do fromTo (toVars.startAt).
  // Como IN é compartilhado, os títulos abaixo acabam todos usando o "from" do
  // ÚLTIMO fromTo ({autoAlpha:0,y:90}): na prática "APOSTILAMENTO" e "DE HAIA"
  // sobem de baixo, não vêm dos lados como os valores abaixo sugerem. Mantido
  // assim DE PROPÓSITO (é o que está na tela e foi aprovado). "APOSTILA" e
  // "MENTO" usam cópias próprias ({...IN}) justamente pra o "from" de cada um
  // valer: "APOSTILA" vem da ESQUERDA; "MENTO" vem da DIREITA.
  // ORDEM: a palavra "APOSTILAMENTO" termina PRIMEIRO (APOSTILA em 2.28, MENTO
  // em 2.78, quando a APOSTILA acabou) e só depois entram os outros títulos,
  // com o mesmo ritmo de antes (+.15, +.15, +.10, +.10). Tudo acaba em 3.78,
  // ainda antes da fase seguinte (ENTRY_START 4.23) → duração e gatilhos iguais.
  // "DE HAIA" também é dividido: "DE" (da esquerda) em 2.93 e "HAIA" (de baixo)
  // 0.15 depois — atraso curto porque o "DE" é uma palavra curta. Os outros
  // títulos adiantam 0.15: o último ("DE CASA") termina em 3.93, antes da fase
  // seguinte (ENTRY_START 4.23) → duração e gatilhos iguais.
  // Todos os títulos usam cópia própria de IN ({...IN}), então o "from" de cada
  // um vale (o IN compartilhado já não é usado direto por nenhum).
  // "DE CASA" também dividido: "DE" (da esquerda) em 3.43 e "CASA" (de baixo) 0.15
  // depois; o .ht fica visível desde já e cada metade esconde a si mesma.
  const decasaD = root.querySelector('.ht[data-k="decasa"] .ht-d2');
  const decasaC = root.querySelector('.ht[data-k="decasa"] .ht-c');
  const casaLine = root.querySelector('.ht[data-k="decasa"] .casa-line');
  gsap.set(decasa,{autoAlpha:1});
  const haiaD = root.querySelector('.ht[data-k="haia"] .ht-d');
  const haiaH = root.querySelector('.ht[data-k="haia"] .ht-h');
  gsap.set(haia,{autoAlpha:1});
  tl.fromTo(apostA,{autoAlpha:0,x:-320,y:0},{...IN},2.28)
    .fromTo(apostM,{autoAlpha:0,x:320,y:0},{...IN},2.78)
    .fromTo(haiaD,{autoAlpha:0,x:-320,y:0},{...IN},2.93)
    .fromTo(haiaH,{autoAlpha:0,x:0,y:55},{...IN},3.08)   // sobe de baixo, curto (55) pra não invadir o parágrafo
    .fromTo(sem,{autoAlpha:0,x:0,y:-200},{...IN},3.23)   // desce de cima, de longe: passa POR CIMA das letras do APOSTILAMENTO (pedido da usuária)
    .fromTo(sair,{autoAlpha:0,x:320,y:0},{...IN},3.33)   // vem da direita
    .fromTo(decasaD,{autoAlpha:0,x:-320,y:0},{...IN},3.43)   // "DE" da esquerda
    .fromTo([decasaC,casaLine],{autoAlpha:0,x:0,y:90},{...IN},3.58);   // "CASA" sobe de baixo, 0.15 depois (acaba em 4.08, antes da fase seguinte em 4.23); o contorno (casaLine) sobe junto
  // "CASA" entra como CONTORNO LIMPO (o mesmo do "SEM": .sem-line + #semOutline) e
  // PREENCHE: o miolo (cor do .ht-c) vai de transparente a branco em 3.68→4.18
  // (começa 0.1 depois da entrada e dura o mesmo, como o "SEM" em relação ao seu
  // próprio movimento). O contorno tem cor branca própria (CSS), não herda isso.
  tl.fromTo(decasaC,
    {color:'rgba(255,255,255,0)'},
    {color:'rgb(255,255,255)', ease:'power2.out', duration:0.5},
    3.68);
  // "SEM" desce só como CONTORNO LIMPO e PREENCHE no MESMO tempo em que o "SAIR"
  // entra (3.33→3.83, mesma duração/ease do IN). O contorno é o anel branco
  // (.sem-line + filtro SVG #semOutline, ver CSS) que fica sempre ligado — por
  // dentro da silhueta, então some visualmente quando o miolo (a cor do próprio
  // .ht__in) vai de transparente a branco. O fromTo acerta o estado inicial
  // (miolo transparente); o .sem-line tem cor branca própria (CSS), não herda
  // essa animação.
  const semIn = sem.querySelector('.ht__in');
  tl.fromTo(semIn,
    {color:'rgba(255,255,255,0)'},
    {color:'rgb(255,255,255)', ease:'power2.out', duration:0.5},
    3.33);
  // revelação caractere a caractere do parágrafo (ver FOCUS TEXT acima) —
  // ocupa a MESMA janela que antes era só o fade em bloco (2.93 → hold em
  // 3.63), redistribuindo o tempo internamente: não mexe em ENTRY_START/
  // PHASE2_START nem na duração total da timeline (nem cria ScrollTrigger
  // novo — tudo dentro do `tl` já existente, escrubado pelo scroll).
  // FOCUS_START era 2.93 (junto com o "DE" do "DE HAIA", cedo demais): agora 3.43,
  // junto com o "DE" do "DE CASA" (o último título). Letras 3.43→~3.9, botão
  // ~3.82→4.12, ainda antes da fase seguinte (4.23) → duração/gatilhos iguais.
  const FOCUS_START=3.43, FOCUS_STAGGER=0.0032, FOCUS_CHAR_DUR=0.14;
  const focusEase = window.CustomEase ? 'focusTextEase' : 'power3.out';
  tl.fromTo(focusChars,
    {opacity:0,scale:.88,filter:'blur(6px)'},
    {opacity:1,scale:1,filter:'blur(0px)',stagger:FOCUS_STAGGER,duration:FOCUS_CHAR_DUR,ease:focusEase},
    FOCUS_START);
  // botão só entra depois que ~85% do texto já revelou ("somente depois
  // que a maior parte do texto já estiver legível") — duration própria
  // (mais curta que IN) pra caber antes do hold em 3.63.
  const focusSpread = FOCUS_STAGGER*(focusChars.length-1)+FOCUS_CHAR_DUR;
  tl.fromTo(copyBtn,{autoAlpha:0,y:40},{autoAlpha:1,x:0,y:0,ease:'power2.out',duration:0.3},FOCUS_START+focusSpread*0.85);
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
  // "SEU DESTINO" chega ROSA (#FF0099, cor inicial no CSS) e, conforme a rolagem continua (de
  // PHASE2_START+1.0 a +1.8), uma VARREDURA da esquerda pra direita deixa as letras VERDES (#00FF66): as
  // letras já viradas ficam verdes, as que ainda não chegaram ficam rosa, e a "frente" (~2 letras) passa
  // por BRANCO (rosa → branco → verde) — rosa e verde misturados direto dão um cinza opaco, e o branco no
  // meio mantém a cor viva. Presa à rolagem (scrub) e reversível; cabe antes do fim da pausa
  // (PHASE2_START+2.1), então a duração da timeline e os gatilhos não mudam.
  const destLetras = ilDestReels.map(r => r.char);
  const destVarre = {p:0};
  const DEST_FRENTE = 2;   // largura da frente, em letras
  const mixRGB = (a,b,t) => 'rgb(' + a.map((v,k)=>Math.round(v + (b[k]-v)*t)).join(',') + ')';
  function pintaDestino(){
    const x = destVarre.p * (destLetras.length - 1 + DEST_FRENTE);
    destLetras.forEach((c,i)=>{
      const f = Math.min(1, Math.max(0, (x - i) / DEST_FRENTE));
      c.style.color = f <= 0 ? '#FF0099' : f >= 1 ? '#00FF66'
        : f < .5 ? mixRGB([255,0,153],[255,255,255], f/.5) : mixRGB([255,255,255],[0,255,102], (f-.5)/.5);
    });
  }
  tl.fromTo(destVarre,{p:0},{p:1,ease:'none',duration:0.8,onUpdate:pintaDestino},PHASE2_START+1.0);
  addRollingTween(tl, ilDocReels,  PHASE2_START+0.10);
  addRollingTween(tl, ilDestReels, PHASE2_START+0.35);
  addRollingTween(tl, ilCamReels,  PHASE2_START+0.60);
  // "02 — O Caminho": padronizado pro giro SINCRONIZADO (ver
  // addSyncedRollingTween acima) igual o "03 — A Solução" — era o único
  // rótulo ainda na versão antiga (addRollingTween), que a usuária reportou
  // como "estático"/desalinhado comparado ao "03". ilDoc/ilDest/ilCam
  // (título grande) ficam de fora por enquanto, fora do escopo pedido.
  // at=ENTRY_START (não PHASE2_START+0.10): o rótulo fica no top:5% de
  // .s2-layer, ou seja, é a PRIMEIRA coisa a aparecer conforme a camada sobe
  // (yPercent 100→0, mesma janela ENTRY_START..ENTRY_START+ENTRY_DUR) — a
  // usuária reportou que ele ficava "parado" visível lá embaixo, estático,
  // até a subida terminar inteira, só girando DEPOIS. Começando o giro
  // junto com a subida (duration=ENTRY_DUR, termina exatamente quando a
  // camada termina de subir) ele já aparece girando, nunca estático.
  // ease 'none' (linear): tentamos 'sine.inOut' (largada devagar demais)
  // e depois 'power2.out' (largada boa, mas desacelerava tanto no final que
  // as letras pareciam prontas ANTES da seção cobrir a tela toda). 'none'
  // anda proporcional ao scroll o tempo inteiro — sem largada lenta nem
  // desaceleração no fim. Esse é o estado APROVADO ("perfeito").
  addSyncedRollingTween(tl, introEyebrowReels, ENTRY_START, ENTRY_DUR, 'none');

  // ÂNCORA "#caminho" (menu "O Caminho"): a .s2-layer mora DENTRO do palco sticky (.hero-s2-stage,
  // overflow:hidden) e começa fora da tela (yPercent 100). O salto nativo da âncora rolava o PRÓPRIO
  // palco (scrollTop) e deixava a página parada: aparecia a camada escura VAZIA ("tela preta" — o texto
  // só entra pela timeline). Agora o clique rola a PÁGINA até o ponto da timeline em que o texto da 02
  // já entrou todo (COMPACT_START + 0.05), e o palco nunca rola sozinho (foco por Tab, hash na URL…).
  const palcoS2 = root.querySelector('.hero-s2-stage');
  if(palcoS2 && s2Layer){
    palcoS2.addEventListener('scroll', ()=>{ if(palcoS2.scrollTop) palcoS2.scrollTop = 0; });
    const irParaCaminho = ()=>{
      const st = tl.scrollTrigger;
      if(!st || getComputedStyle(s2Layer).position !== 'absolute') return false;   // celular: layout normal, âncora nativa
      const y = st.start + ((COMPACT_START + 0.05) / tl.duration()) * (st.end - st.start);
      window.scrollTo({top:y, behavior:'auto'});
      return true;
    };
    document.querySelectorAll('a[href="#caminho"]').forEach(a=>a.addEventListener('click', e=>{
      if(irParaCaminho()){ e.preventDefault(); history.replaceState(null, '', '#caminho'); }
    }));
    // página aberta já com #caminho na URL: o navegador faz o salto nativo DEPOIS do carregamento (e
    // rola o palco) — refaz duas vezes (setTimeout, não rAF: roda mesmo com a aba em segundo plano)
    if(location.hash === '#caminho'){
      const refaz = ()=>{ palcoS2.scrollTop = 0; irParaCaminho(); };
      setTimeout(refaz, 0); setTimeout(refaz, 500);
    }
  }
}

/* --------------- ROLLING TEXT (giro de entrada dos rótulos) ----------- */
/* Portado de um componente React (rolling-text.tsx, GSAP) pra JS puro:
   cada letra vira uma "janela" (.rl-window) que recorta uma coluna
   (.rl-track) com a MESMA letra repetida N vezes (.rl-cell) — a coluna
   sobe N voltas via a custom property --k e assenta de volta na letra
   certa, dando um giro de entrada sem nunca mostrar texto errado/
   embaralhado. PRNG determinístico (mulberry32) só pra variar
   cycles/duration por letra de forma ESTÁVEL (mesmo resultado sempre,
   sem Math.random) — mesma técnica do componente original. */
const rlRand = seed => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
// reconstrói o texto do elemento em spans (ver .rl-* no site.css) e
// devolve um "carretel" por letra (sem mexer em espaços) pra animar depois.
function buildRollingLabel(el, opts){
  // rótulo tem só 14px — cycles/duration mais generosos que o componente
  // original de propósito, senão o giro passa despercebido nesse tamanho.
  const o = Object.assign({minCycles:4, cycleVariance:4, duration:.5, durationVariance:.35}, opts);
  const chars = Array.from(el.textContent);
  el.textContent = '';
  const wrap = document.createElement('span');
  wrap.className = 'rl-wrap';
  const reels = [];
  // o.words (só o título "SEU DOCUMENTO" da tela escura 02): as letras de cada palavra
  // ficam num .rl-word (inline-block nowrap), pra a frase poder quebrar linha NO ESPAÇO
  // sem quebrar no meio da palavra (entre inline-blocks soltos sempre há quebra possível),
  // e o espaço vira um espaço comum (o padrão é NBSP, que nunca quebra)
  let wordEl = null;
  chars.forEach((ch,i)=>{
    if(ch===' '){ wordEl = null; wrap.appendChild(document.createTextNode(o.words ? ' ' : ' ')); return; }
    const rand = rlRand(i*1013+7);
    const cycles = o.minCycles + Math.floor(rand()*o.cycleVariance);
    const dur = o.duration + rand()*o.durationVariance;
    const charEl=document.createElement('span'); charEl.className='rl-char';
    const sizer=document.createElement('span'); sizer.className='rl-sizer'; sizer.textContent=ch;
    const win=document.createElement('span'); win.className='rl-window';
    const track=document.createElement('span'); track.className='rl-track';
    track.style.setProperty('--k','0');
    for(let c=0;c<=cycles;c++){ const cell=document.createElement('span'); cell.className='rl-cell'; cell.textContent=ch; track.appendChild(cell); }
    win.appendChild(track); charEl.appendChild(sizer); charEl.appendChild(win);
    if(o.words){
      if(!wordEl){ wordEl = document.createElement('span'); wordEl.className = 'rl-word'; wrap.appendChild(wordEl); }
      wordEl.appendChild(charEl);
    }else{
      wrap.appendChild(charEl);
    }
    reels.push({track, char:charEl, to:cycles, duration:dur});
  });
  el.appendChild(wrap);
  return reels;
}
// injeta os tweens (um "scroll.k" por letra, levemente escalonados) na
// TIMELINE SCRUBADA já existente da seção — nada de tempo real, mesmo
// motor (scrub ligado ao scroll) de todo o resto do site.
function addRollingTween(tl, reels, at, stagger){
  stagger = stagger||.045;
  reels.forEach((r,i)=>{
    const t0 = at+i*stagger;
    const scroll={k:0};
    tl.to(scroll,{k:r.to, duration:r.duration, ease:'expo.out',
      onUpdate(){ r.track.style.setProperty('--k', String(scroll.k)); }
    }, t0);
    // no tamanho pequeno do rótulo (14px) o giro sozinho quase não se nota
    // — a letra também cresce/borra um pouco enquanto gira e assenta de
    // volta no tamanho normal junto com o fim do giro (mesma at/duration).
    tl.fromTo(r.char,{scale:1.22,filter:'blur(3px)'},{scale:1,filter:'blur(0px)',duration:r.duration,ease:'expo.out'},t0);
  });
}
// versão SINCRONIZADA do giro (mesmo padrão do rótulo "03 — A SOLUÇÃO" em
// initSolucao, ver s3IdReels/rollProxy) — UM proxy só (p:0→1) dirige TODAS
// as letras pelo MESMO progresso ao mesmo tempo, em vez de cada letra ter
// sua própria duração/atraso aleatórios (addRollingTween acima). Corrige o
// "desalinhado" de pausar o scroll no meio e pegar uma mistura de letras já
// assentadas com letras ainda girando/borradas — reportado pela usuária no
// rótulo "02 — O Caminho" (que usava addRollingTween). Também remove
// transform/filter (em vez de zerar) quando p>=1: mesmo "zerados"
// (scale(1)/blur(0px)), os dois forçam o navegador a rasterizar a letra numa
// camada separada, trocando o antialiasing normal do texto por um diferente
// (glifos com mais traço — Ç,Ã,O — ficam com peso visual inconsistente
// comparado a glifos simples — 0,3,A) mesmo já assentado. Sem a propriedade
// no style, a letra volta a renderizar pelo caminho normal, igual o resto
// do site. Cada letra mantém seu próprio número de ciclos (r.to, variedade
// visual), só o PROGRESSO fica sincronizado entre todas.
function addSyncedRollingTween(tl, reels, at, duration, ease){
  ease = ease || 'sine.inOut';
  gsap.set(reels.map(r=>r.char), {scale:1.22, filter:'blur(3px)'});
  const rollProxy = {p:0};
  tl.to(rollProxy, {p:1, duration:duration, ease:ease,
    onUpdate(){
      const p = rollProxy.p;
      for(const r of reels){
        r.track.style.setProperty('--k', String(p*r.to));
        if(p>=1){
          r.char.style.transform = '';
          r.char.style.filter = '';
        } else {
          const scale = 1+0.22*(1-p), blurPx = (3*(1-p)).toFixed(2);
          r.char.style.transform = 'scale('+scale+')';
          r.char.style.filter = 'blur('+blurPx+'px)';
        }
      }
    }
  }, at);
}

/* ------------- FOCUS TEXT (revelação caractere a caractere) ---------- */
/* Portado de um componente React (focus-text.tsx, GSAP+CustomEase) pra JS
   puro: cada caractere vira um <span class="fc-char"> animável (blur+
   escala+opacidade individuais); agrupados em <span class="fc-word"> (ver
   .fc-word no CSS) só pra nunca quebrar uma palavra no meio do reveal —
   os espaços entre palavras ficam como texto normal, fora dos spans.
   Devolve a lista de chars, na ordem do texto, pra a timeline scrubada já
   existente animar (ver initHeroS2Story) — sem ScrollTrigger próprio,
   mesmo motor do resto do site (nada de tween/scrub isolado). */
function buildFocusChars(el){
  const words = el.textContent.trim().split(/\s+/);
  el.textContent = '';
  const chars = [];
  words.forEach((word, wi)=>{
    const wordEl = document.createElement('span');
    wordEl.className = 'fc-word';
    Array.from(word).forEach(ch=>{
      const charEl = document.createElement('span');
      charEl.className = 'fc-char';
      charEl.textContent = ch;
      wordEl.appendChild(charEl);
      chars.push(charEl);
    });
    el.appendChild(wordEl);
    if(wi < words.length-1) el.appendChild(document.createTextNode(' '));
  });
  return chars;
}

/* ----------------------------- 03 · A SOLUÇÃO ------------------------ */
function initSolucao(root){
  const q = gsap.utils.selector(root);
  // rótulos "02 / O CAMINHO" e "03 / A SOLUÇÃO" (ver ROLLING TEXT acima) —
  // sem giro em prefers-reduced-motion (fica só o texto puro, comportamento
  // de antes).
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const idReels   = reduceMotion ? null : buildRollingLabel(root.querySelector('.section-id'));
  // mesmos parâmetros padrão do "02" (ver addRollingTweenRealtime abaixo —
  // toca em tempo real, não precisa mais estreitar variação pra evitar
  // ficar preso num meio-termo do scroll).
  const s3IdReels = reduceMotion ? null : buildRollingLabel(root.querySelector('.s3-id'));
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
  // DESLIGADO (não apagado): .veins agora vive dentro de .s3 (display:none,
  // dormente de propósito — ver index.html). updateVeins() mede o tamanho
  // do SVG (getBoundingClientRect) pra criar os paths; com display:none o
  // tamanho é zero, a função aborta cedo e os paths nunca são criados —
  // depois activate() tentava usá-los e estourava (TypeError, "vp" null).
  // Reativar junto com .s3 se o efeito for reaproveitado.
  // updateVeins();

  /* ---- 02 · os 5 caminhos (reta → curva suave → reta + nós) --- */
  /* Geometria "reta/curva/reta" EXPLÍCITA (pathSTS mais abaixo): dois
     segmentos de reta de verdade (L) nas pontas, e só o trecho do meio é
     Bézier — a curva existe só pra mudar de direção, nunca é o corpo do
     trajeto (diferente da versão anterior, um cúbico único esticado, que
     virava "onda"/S). Cada caminho tem seus PRÓPRIOS parâmetros (direção e
     comprimento de cada reta, abertura da curva) — não é roteamento
     genérico. Só bordas ESQUERDA/DIREITA do documento (nunca topo/baixo —
     04/05 não descem pro rodapé). Termina GEOMETRICAMENTE na borda do
     círculo numerado (não no centro, não alguns px antes).
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
  // dir0/f0 = direção+distância (fração da reta origem→destino) que a
  // linha sai RETA do documento; dir1/f1 = direção+distância do trecho
  // reto final, já vindo DE onde o path chega no destino; bend = o quanto
  // a curva do meio "puxa" nessas mesmas direções (maior = curva mais
  // aberta/suave, menor = mudança de direção mais concentrada). Cada
  // caminho tem sua PRÓPRIA geometria — não é um roteamento genérico.
  const CAMINHOS = [
    // key usa prefixo "pc" (path-caminho) DE PROPÓSITO — "c1".."c5" puro
    // colide com a classe dos CARDS (.c1..c5) e, como o <path> vem antes
    // no DOM, root.querySelector('.c1') pegava a LINHA em vez do CARD.
    // 01 — muda de altura CEDO (18%→34%, platô acima), percorre um trecho
    // longo nesse novo nível até quase o card (68%) e só então volta pra
    // reta final curta. Mesma gramática do 02/04 (stair), mas a quebra
    // principal acontece perto do documento, não do card.
    {key:'pc1', anchor:'rTop',   dir0:{x:1,y:0}, dir1:{x:1,y:0}, card:'.c1',
      stair:{f0:.18, f1:.34, f2:.68, f3:.85, over:-30}},
    // 02 — reta → sobe (platô acima dos dois pontos) → reta intermediária
    // bem visível → desce de volta → reta final. Duas transições de propósito.
    {key:'pc2', anchor:'lUpper', dir0:{x:-1,y:0}, dir1:{x:-1,y:0}, card:'.c2',
      stair:{f0:.20, f1:.40, f2:.64, f3:.84, over:-14}},
    // 03 — quebra concentrada na região CENTRAL do percurso (32%→72%,
    // platô abaixo), com retas evidentes antes e depois — plano maior e
    // desnível mais visível que a versão anterior (estava enxuta demais),
    // mas ainda sem uma curva grudada no card.
    {key:'pc3', anchor:'rMid',   dir0:{x:1,y:0}, dir1:{x:1,y:0}, card:'.c3',
      stair:{f0:.32, f1:.44, f2:.60, f3:.72, over:38}},
    // 04 — espelho do 02: reta → desce (platô abaixo dos dois pontos) →
    // reta intermediária longa → sobe de volta → reta final.
    {key:'pc4', anchor:'lLower', dir0:{x:-1,y:0}, dir1:{x:-1,y:0}, card:'.c4',
      stair:{f0:.18, f1:.38, f2:.62, f3:.82, over:34}},
    // 05 — mudança de nível mais pronunciada (26%→48%, platô acima) e
    // platô mais longo que 01/03: a trajetória mais "elaborada" da direita.
    {key:'pc5', anchor:'rLower', dir0:{x:1,y:0}, dir1:{x:1,y:0}, card:'.c5',
      stair:{f0:.26, f1:.48, f2:.70, f3:.88, over:-46}}
  ];
  const ensureCamPath=(cls)=>{ let el=caminhosSvg.querySelector('path.'+cls); if(!el){ el=document.createElementNS(svgNS,'path'); el.setAttribute('class','cam-line '+cls); caminhosSvg.appendChild(el); } return el; };
  const ensureCamNode=(cls)=>{ let el=caminhosSvg.querySelector('circle.'+cls); if(!el){ el=document.createElementNS(svgNS,'circle'); el.setAttribute('class','cam-node '+cls); el.setAttribute('r','7.2'); caminhosSvg.appendChild(el); } return el; };
  // pulso viajando pela linha (mesma técnica do sistema antigo/dormente
  // .pulse da seção 03) — aprovado, aplicado nos 5 caminhos.
  const ensureCamPulse=(cls)=>{ let el=caminhosSvg.querySelector('path.cam-pulse.'+cls); if(!el){ el=document.createElementNS(svgNS,'path'); el.setAttribute('class','cam-pulse '+cls); caminhosSvg.appendChild(el); } return el; };
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
  // RETA → CURVA SUAVE → RETA, explícito (não um cúbico genérico esticado):
  // dois segmentos de reta de verdade (L) nas pontas, com só a curva do
  // meio (mid1→mid2) sendo Bézier. Os pontos de controle da curva ficam
  // ao longo das MESMAS direções dos trechos retos que ela conecta (c1 na
  // direção de saída, c2 na direção de chegada) — isso garante transição
  // suave (sem "bico") nas emendas reta/curva, e a curva serve só pra
  // mudar de direção, nunca é o corpo principal do trajeto.
  function pathSTS(start,dir0,len0,end,dir1,len1,bendLen){
    const n0=Math.hypot(dir0.x,dir0.y)||1, n1=Math.hypot(dir1.x,dir1.y)||1;
    const ux0=dir0.x/n0, uy0=dir0.y/n0, ux1=dir1.x/n1, uy1=dir1.y/n1;
    const mid1={x:start.x+ux0*len0, y:start.y+uy0*len0};
    const mid2={x:end.x-ux1*len1,   y:end.y-uy1*len1};
    const c1={x:mid1.x+ux0*bendLen, y:mid1.y+uy0*bendLen};
    const c2={x:mid2.x-ux1*bendLen, y:mid2.y-uy1*bendLen};
    const f=n=>n.toFixed(1);
    return `M${f(start.x)},${f(start.y)} L${f(mid1.x)},${f(mid1.y)} C${f(c1.x)},${f(c1.y)} ${f(c2.x)},${f(c2.y)} ${f(mid2.x)},${f(mid2.y)} L${f(end.x)},${f(end.y)}`;
  }
  // RETA → CURVA → RETA → CURVA → RETA (3 níveis, 2 transições) — usado nos
  // caminhos que precisam mudar de altura duas vezes (ver CAMINHOS[].stair).
  // f0..f3 = posições (fração de start→end) onde cada trecho reto começa/
  // termina; midY = altura do platô intermediário. Cada curva pega tangente
  // horizontal nas duas pontas (mesmo princípio do pathSTS), então as duas
  // emendas reta/curva ficam sempre suaves, sem "bico".
  function pathStair(start,end,midY,f0,f1,f2,f3,t){
    t = t||.72;
    const dx=end.x-start.x;
    const xA=start.x+dx*f0, xC=start.x+dx*f1, xD=start.x+dx*f2, xF=start.x+dx*f3;
    const xB=xA+(xC-xA)*t, xBc=xC-(xC-xA)*t;
    const xE=xD+(xF-xD)*t, xFc=xF-(xF-xD)*t;
    const f=n=>n.toFixed(1);
    return `M${f(start.x)},${f(start.y)} L${f(xA)},${f(start.y)} C${f(xB)},${f(start.y)} ${f(xBc)},${f(midY)} ${f(xC)},${f(midY)} L${f(xD)},${f(midY)} C${f(xE)},${f(midY)} ${f(xFc)},${f(end.y)} ${f(xF)},${f(end.y)} L${f(end.x)},${f(end.y)}`;
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
      rLower:{x:R+10, y:cy+dr.height*0.40} // 05 — direita, perto do rodapé rosa (canto arredondado: +10px pra fora)
    };
  }
  // centro do CRACHÁ numerado (.chip small), não o centro do card — é ele
  // quem "nasce" quando a linha chega (ver buildCaminho), a linha mira
  // nele. small só anima opacity/scale (nunca posição), e scale a partir
  // do centro não desloca o centro medido — então, ao contrário do .chip
  // inteiro antes, não precisa neutralizar nada pra medir: o centro do
  // crachá já é confiável a qualquer momento (inclusive logo depois de um
  // ScrollTrigger.refresh(), ver onRefresh mais abaixo).
  function badgeCenter(cardEl, s, docCx, docL, docR){
    const badge=cardEl.querySelector('small');
    const br=badge.getBoundingClientRect();
    const bx=br.left-s.left+br.width/2, by=br.top-s.top+br.height/2;
    // em telas mais estreitas o crachá pode encostar (ou passar por baixo)
    // do documento — trava o ponto pra nunca ultrapassar a borda do doc.
    const x = bx<docCx ? Math.min(bx, docL-14) : Math.max(bx, docR+14);
    return {x, y:by, r:br.width/2};
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
      const center=badgeCenter(root.querySelector(c.card), s, docCx, docL, docR);
      // termina GEOMETRICAMENTE na borda do círculo (não no centro, não
      // alguns px antes) — recua um raio a partir do centro, na direção
      // de chegada (dir1) do próprio caminho.
      const n1=Math.hypot(c.dir1.x,c.dir1.y)||1;
      const end={x:center.x-c.dir1.x/n1*center.r, y:center.y-c.dir1.y/n1*center.r};
      const dist=Math.hypot(end.x-start.x, end.y-start.y);
      let d;
      if(c.stair){
        const st=c.stair;
        const midY = st.over<0 ? Math.min(start.y,end.y)+st.over : Math.max(start.y,end.y)+st.over;
        d = pathStair(start, end, midY, st.f0, st.f1, st.f2, st.f3);
      } else {
        d = pathSTS(start, c.dir0, dist*c.f0, end, c.dir1, dist*c.f1, dist*c.bend);
      }
      el.setAttribute('d', d);
      el.setAttribute('mask','url(#camMask-'+c.key+')');
      maskPath.setAttribute('d', d);
      maskPath._len=maskPath.getTotalLength(); maskPath.style.strokeDasharray=maskPath._len+'px'; applyDraw(maskPath);
      const n0=ensureCamNode(c.key+'-a'); n0.setAttribute('cx',start.x.toFixed(1)); n0.setAttribute('cy',start.y.toFixed(1));
      const pulse=ensureCamPulse(c.key); pulse.setAttribute('d', d); pulse._len=pulse.getTotalLength();
    });
  }
  updateCaminhos();

  // .selo-layer (mesma caixa/centro de .doc, ver CSS) entra como 2º alvo do
  // MESMO tween — não duplica timeline, não muda amplitude/duração/timing:
  // é a mesma instância animando os dois em sincronia perfeita. Preserva a
  // respiração visual que o selo tinha por herança quando ainda morava
  // dentro de .doc (antes da separação de camadas).
  gsap.to(q('.doc, .selo-layer'),{scale:1.014,duration:2.6,repeat:-1,yoyo:true,ease:'sine.inOut'});

  const tl=gsap.timeline({ scrollTrigger:{ trigger:root, start:'top top', end:'bottom bottom',
    scrub:1, invalidateOnRefresh:true, onRefresh:()=>{ updateCaminhos(); } } }); // updateVeins() desligado (ver acima)

  // Cada caminho é UMA sequência de 5 fases, estritamente consecutivas
  // (a fase N só começa quando a fase N-1 termina, nunca em paralelo):
  //   1. bola pequena nasce na borda do documento (fica visível, não se move)
  //   2. a linha percorre o caminho a partir dela (dasharray/dashoffset real,
  //      nunca fade da linha inteira)
  //   3. ao chegar, a bola grande (crachá) nasce no destino
  //   4. o número aparece dentro da bola grande
  //   5. o card é revelado
  const DOT_DUR=.15;   // fase 1 — bola pequena
  const LINE_DUR=1.0;  // fase 2 — linha percorrendo o caminho
  const BADGE_DUR=.22; // fase 3 — bola grande
  const NUM_DUR=.16;   // fase 4 — número
  const CARD_DUR=.5;   // fase 5 — card
  const buildCaminho=(cfg,at)=>{
    const maskPath=ensureCamMask(cfg.key);
    const nodeA=ensureCamNode(cfg.key+'-a');
    const cardEl=root.querySelector(cfg.card);
    const badge=cardEl.querySelector('small'), num=badge.querySelector('.badge-num'), box=cardEl.querySelector('.chip-box');

    // 1 — bola pequena
    tl.addLabel(cfg.key+'-dotSmall',at);
    tl.fromTo(nodeA,{opacity:0,scale:.5},{opacity:1,scale:1,duration:DOT_DUR,ease:'power1.out'},at);

    // 2 — linha percorre o caminho, só depois da bola pequena estar visível
    const lineAt=at+DOT_DUR;
    tl.addLabel(cfg.key+'-line',lineAt);
    const lineP={p:0};
    tl.to(lineP,{p:1,duration:LINE_DUR,ease:'power1.inOut',onUpdate(){ maskPath._p=lineP.p; applyDraw(maskPath); }},lineAt);

    // pulso percorrendo a linha — começa no meio do desenho da linha e
    // chega perto do fim, um instante antes da bola grande.
    {
      const pulse=ensureCamPulse(cfg.key);
      const pulseAt=lineAt+LINE_DUR*0.5, pulseDur=LINE_DUR*0.45;
      const pO={p:0};
      tl.set(pulse,{opacity:.95},pulseAt)
        .to(pO,{p:1,duration:pulseDur,ease:'sine.in',onUpdate(){ pulse.style.strokeDasharray='14px '+pulse._len+'px'; pulse.style.strokeDashoffset=(pulse._len*(1-pO.p))+'px'; }},pulseAt)
        .to(pulse,{opacity:0,duration:.18},pulseAt+pulseDur);
    }

    // 3 — bola grande, só quando a linha termina de chegar
    const badgeAt=lineAt+LINE_DUR;
    tl.addLabel(cfg.key+'-dotBig',badgeAt);
    tl.fromTo(badge,{opacity:0,scale:.7},{opacity:1,scale:1,duration:BADGE_DUR,ease:'power2.out'},badgeAt);

    // 4 — número, só depois da bola grande estar completamente visível
    const numAt=badgeAt+BADGE_DUR;
    tl.addLabel(cfg.key+'-number',numAt);
    tl.fromTo(num,{opacity:0,scale:.8},{opacity:1,scale:1,duration:NUM_DUR,ease:'power1.out'},numAt);

    // 5 — card, só depois do número estar completamente visível
    const boxAt=numAt+NUM_DUR;
    tl.addLabel(cfg.key+'-card',boxAt);
    // ease com leve overshoot (back.out) — o card "salta" um pouco além do
    // tamanho final antes de assentar, em vez de só desacelerar suave.
    // opacity/filter também herdam essa ease (GSAP aplica por tween, não
    // por propriedade) mas o overshoot nelas é imperceptível — quem
    // realmente "salta" é o scale/y.
    tl.fromTo(box,
      {opacity:0, y:12, scale:.97, filter:'blur(4px)'},
      {opacity:1, y:0, scale:1, filter:'blur(0px)', duration:CARD_DUR, ease:'back.out(1.6)'},
      boxAt);
    // TESTE — carimbo do selo, síncrono com o card de Apostilamento assentando.
    // .doc__seal agora mora em .selo-layer (irmão de .doc, sem overflow) —
    // pode vazar da folha livremente, sem precisar mais destravar/travar o
    // overflow:hidden de .doc (gambiarra antiga removida).
    if(cfg.key==='pc1'){
      const SEAL_DUR=.5;
      tl.fromTo(q('.doc__seal'),
        {opacity:0, scale:2.2, rotation:-30},
        {opacity:1, scale:1, rotation:15, duration:SEAL_DUR, ease:'back.out(2.4)'},
        boxAt);
    }
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

  // Separação de camadas do selo (.doc__seal agora mora em .selo-layer,
  // irmão de .doc — ver index.html/CSS): calcula a posição EQUIVALENTE ao
  // antigo left:90%/top:88%/width:74% (que eram relativos a .doc__map),
  // agora em % da caixa de .doc (que .selo-layer replica via inset:0).
  // Medição ÚNICA, na montagem — nunca de novo depois (sem leitura de
  // layout no scroll/mousemove/frame da animação).
  (function relocateSeal(){
    const seal = root.querySelector('.doc__seal');
    const docMap = root.querySelector('.doc__map');
    const docEl = root.querySelector('.doc');
    if(!seal || !docMap || !docEl) return;
    const mr = docMap.getBoundingClientRect(), dr = docEl.getBoundingClientRect();
    if(!mr.width || !dr.width) return;
    const cx = mr.left + mr.width*0.90, cy = mr.top + mr.height*0.88; // fórmula original (90%/88% de .doc__map)
    const w  = mr.width*0.74; // fórmula original (74% de .doc__map)
    seal.style.left  = ((cx-dr.left)/dr.width*100).toFixed(3)+'%';
    seal.style.top   = ((cy-dr.top)/dr.height*100).toFixed(3)+'%';
    seal.style.width = (w/dr.width*100).toFixed(3)+'%';
  })();
  // TESTE — selo "carimba" no documento (em vez de nascer já pronto),
  // sincronizado com o card "01 — APOSTILAMENTO" assentando (ver boxAt em
  // buildCaminho, cfg.key==='pc1'). Base xPercent/yPercent replica o
  // translate(-50%,-50%) que já existia no CSS — precisa ir pro GSAP porque
  // ele passa a controlar o transform inteiro do elemento.
  gsap.set(q('.doc__seal'),{xPercent:-50,yPercent:-50,scale:2.2,rotation:-30,opacity:0,transformOrigin:'50% 50%'});

  /* --- Transição 02→03: transporte LITERAL da máscara aprovada (v5) ---
     .s3-mask-front (camada de 200vh, era o .intro da v5) carrega o FURO; a
     .s3-bg é a camada revelada atrás. O MESMO `progress` (proxy p, escrubado
     pelo ScrollTrigger) controla a matemática da máscara E o translateY da
     caixa de 200vh — preservando a relação geométrica da v5. Valores
     CONGELADOS: base 1440/375, radius 360→1440 / 100→450, pos 1000→2000 /
     500→730, escala innerWidth/base, lerp linear, borda dura `#000 0`. Nada é
     compensado nem refinado. A ÚNICA substituição é scrollY+rAF → scrub.
     Antes do slot da transição, radius=0 (a frente cobre o escuro). */
  const maskFront = root.querySelector('.s3-mask-front');
  const maskProxy = {p:0};
  function applyMaskV5(){
    const p = maskProxy.p;
    const mobile = innerWidth <= 600;
    const scale  = innerWidth / (mobile ? 375 : 1440);
    const radiusStart = scale * (mobile ? 100 : 360);
    const radiusEnd   = scale * (mobile ? 450 : 1440);
    const posStart    = scale * (mobile ? 500 : 1000);
    const posEnd      = scale * (mobile ? 730 : 2000);
    const radius = radiusStart + (radiusEnd - radiusStart) * p; // lerp linear
    const pos    = posStart    + (posEnd    - posStart)    * p; // lerp linear
    maskFront.style.setProperty('--mask-radius', radius + 'px');
    maskFront.style.setProperty('--mask-position', pos + 'px');
    // window-travel da v5: a caixa de 200vh(150vh) sobe (offsetHeight -
    // innerHeight) ao longo de p — o mesmo (maskEnd-maskStart) da v5.
    const travel = innerHeight * (mobile ? 0.5 : 1);
    maskFront.style.transform = 'translateY(' + (-p * travel) + 'px)';
  }

  /* FASE DE COVER (depois de p=1, controlada pelo MESMO scrub, sem autoplay).
     A v5 fica INTACTA até p=1. Aqui o MESMO raio da máscara continua crescendo
     a partir de radiusEnd (valor final da v5) até ULTRAPASSAR matematicamente o
     canto mais distante da viewport — garantindo cobertura 100% do fundo
     escuro. pos e translateY ficam CONGELADOS no valor de p=1 (só o raio muda).
     Nada da geometria/comportamento da v5 antes de p=1 é tocado. */
  const coverProxy = {c:0};
  const COVER = 0.8; // duração (unidades da timeline) desta fase
  function applyCover(){
    const c = coverProxy.c;
    const mobile = innerWidth <= 600;
    const scale  = innerWidth / (mobile ? 375 : 1440);
    const radiusEnd = scale * (mobile ? 450 : 1440); // raio da v5 em p=1
    const posEnd    = scale * (mobile ? 730 : 2000); // pos congelada (p=1)
    const travel    = innerHeight * (mobile ? 0.5 : 1); // translateY congelado
    // centro da máscara NA TELA em p=1 (o translateY move a origem)
    const cx = innerWidth / 2, cy = -travel + posEnd;
    // raio que ultrapassa o canto mais distante (+6% de margem de garantia);
    // nunca menor que radiusEnd (não encolhe se a v5 já cobria).
    let maxD = 0;
    for(const [x,y] of [[0,0],[innerWidth,0],[0,innerHeight],[innerWidth,innerHeight]]){
      const d = Math.hypot(x-cx, y-cy); if(d>maxD) maxD=d;
    }
    const rCover = Math.max(radiusEnd, maxD * 1.06);
    const radius = radiusEnd + (rCover - radiusEnd) * c; // lerp linear
    maskFront.style.setProperty('--mask-radius', radius + 'px');
    maskFront.style.setProperty('--mask-position', posEnd + 'px'); // congelado
    maskFront.style.transform = 'translateY(' + (-travel) + 'px)'; // congelado
  }

  /* SAÍDA em BLOCO de TODA a composição da 02 — sem fade. Dirigida por onUpdate
     com innerHeight AO VIVO (recomputa todo frame; robusto a resize e ao
     momento de avaliação). TODO o conjunto — os 5 cards + esferas, o texto
     "UM DOCUMENTO / VÁRIOS CAMINHOS" (.copy-a), as linhas (.caminhos-svg) e o
     rótulo "02 — O CAMINHO" (.section-id) — recebe o MESMO y e sobe junto como
     UMA peça só, saindo de cena por cima. O documento é o ÚNICO que NÃO entra
     aqui (cai independente pra dentro da 03). */
  const riseGroup = root.querySelectorAll('.chip, .copy-a, .caminhos-svg, .section-id');
  const riseProxy = {p:0};
  function applyRise(){
    gsap.set(riseGroup, {y: -riseProxy.p * innerHeight * 1.3});
  }

  /* 01b — apresentação: texto entra primeiro, uma pequena pausa de
     leitura, só DEPOIS a folha entra (de baixo, um pouco menor, ganhando
     opacidade — chega na MESMA pose de repouso de sempre, só o y/scale
     acima são sobrescritos aqui pro estado inicial "escondida"). Antes os
     dois já apareciam prontos assim que a seção entrava em vista. Isso é
     só no .doc-stage (dono do scroll) — o .doc-mouse (tilt do mouse) não é
     tocado, continua isolado. INTRO = quanto essa apresentação empurra o
     resto da timeline; a altura da seção (site.css) cresce na mesma
     proporção pra não acelerar o resto do scroll. */
  // Texto "UM DOCUMENTO. CINCO JEITOS DE CHEGAR LÁ." com o BLUR palavra por
  // palavra da pergunta da 04 (secao04.js): cada palavra vai de invisível +
  // desfocada a nítida, uma depois da outra. A subida (y 32→0) continua como
  // antes; quem controla a opacidade agora são as palavras (o .copy-a fica
  // sempre visível). As palavras terminam dentro da MESMA janela de antes
  // (0 .. .6, a folha entra em .62) → duração/gatilhos da timeline não mudam.
  // Proporção stagger/duração = a da 04 (.04/.2): unit escala pra caber na janela.
  const copyA = q('.copy-a');
  function splitWords(el){
    Array.from(el.childNodes).forEach(function(n){
      if(n.nodeType === 3){
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(function(p){
          if(!p) return;
          if(/^\s+$/.test(p)){ frag.appendChild(document.createTextNode(' ')); return; }
          const w = document.createElement('span'); w.className = 's2-w'; w.textContent = p; frag.appendChild(w);
        });
        n.parentNode.replaceChild(frag, n);
      }else if(n.nodeType === 1 && n.tagName !== 'BR'){
        splitWords(n);   // <span> rosa — mantém o span, divide o texto dentro
      }
    });
  }
  copyA.forEach(splitWords);
  const copyWords = Array.from(root.querySelectorAll('.copy-a .s2-w'));
  const copyBlur = () => innerWidth/1440*10;   // mesmo que a 04 (qScaleBase 1440)
  gsap.set(copyA,{y:32});
  gsap.set(copyWords,{autoAlpha:0,filter:()=>'blur('+copyBlur()+'px)'});
  gsap.set(q('.doc-stage'),{opacity:0,y:70,scale:.92});
  tl.to(copyA,{y:0,duration:.42,ease:'power2.out'},0)
    .to(q('.doc-stage'),{opacity:1,y:0,scale:1,duration:.75,ease:'power2.out'},0.62);
  // FUNDO da continuação da 02 (só desktop, onde o .sol-stage é sticky): a seção SOBE preta (#111, a
  // mesma cor da tela escura "SEU DOCUMENTO…" que está por baixo) e, quando começa a animação do título
  // ("UM DOCUMENTO / CINCO JEITOS…", em t=0 da `tl`), o preto some e aparece o fundo claro de sempre. É um
  // overlay (.sol-bgdark) com autoAlpha 1→0 na MESMA `tl` (não cria gatilho novo e cabe em 0….35, antes
  // de a folha entrar em .62 → duração/gatilhos não mudam); o gradiente claro do .sol-stage fica intacto.
  const solStage = q('.sol-stage')[0];
  if(solStage && getComputedStyle(solStage).position === 'sticky'){
    const bgDark = document.createElement('div');
    bgDark.className = 'sol-bgdark'; bgDark.setAttribute('aria-hidden','true');
    solStage.insertBefore(bgDark, solStage.firstChild);
    // COMPARAÇÃO (temporário): o clareamento padrão leva .35 da `tl`; ?branco=abrupto leva só .06 (quase um corte)
    const brancoAbrupto = new URLSearchParams(location.search).get('branco') === 'abrupto';
    tl.fromTo(bgDark, {autoAlpha:1}, {autoAlpha:0, ease:'none', duration: brancoAbrupto ? .06 : .35}, 0);
  }
  if(copyWords.length){
    const COPY_WIN = 0.6, copyUnit = COPY_WIN/(0.2 + 0.04*(copyWords.length-1));
    tl.fromTo(copyWords,
      {autoAlpha:0,filter:()=>'blur('+copyBlur()+'px)'},
      {autoAlpha:1,filter:'blur(0px)',ease:'none',duration:0.2*copyUnit,stagger:0.04*copyUnit},0);
  }
  // rótulo "02 / O CAMINHO" já nasce visível (sem gsap.set/opacity antes
  // disso) — o giro das letras (rolling text) é a própria entrada dele.
  // Padronizado pro giro SINCRONIZADO (mesmo padrão de addSyncedRollingTween,
  // aplicado no ".intro-eyebrow" da seção Hero→Caminho) — mesmo problema do
  // addRollingTween antigo: pausar o scroll no meio pega letras já
  // assentadas do lado de outras ainda girando/borradas.
  // AQUI PRECISA DE SCROLLTRIGGER PRÓPRIO, fora da `tl` principal: a `tl`
  // usa start:'top top' (linha ~814) — só começa a contar quando .sol-stage
  // JÁ ESTÁ 100% grudada no topo (sticky). Enquanto a seção ainda está
  // subindo pra dentro da tela via scroll normal (ANTES de stickar), a `tl`
  // fica travada em t=0 — se o giro estivesse dentro dela (como antes),
  // ficava parado/borrado a viagem toda e só começava a girar depois que a
  // seção já tinha terminado de entrar (reportado pela usuária, print). Esse
  // 2º ScrollTrigger cobre exatamente essa janela que falta: do momento em
  // que o topo da seção entra pela base da viewport (start:'top bottom') até
  // o momento em que gruda no topo (end:'top top', onde a `tl` principal
  // assume) — mesma técnica de proxy+onUpdate de addSyncedRollingTween, só
  // que dirigida pelo PRÓPRIO scroll da página em vez de por uma posição
  // dentro de `tl`. ease:'none': anda proporcional ao scroll o tempo todo.
  if(idReels){
    gsap.set(idReels.map(r=>r.char), {scale:1.22, filter:'blur(3px)'});
    const idRollProxy = {p:0};
    gsap.to(idRollProxy, {p:1, ease:'none',
      scrollTrigger:{trigger:root, start:'top bottom', end:'top top', scrub:true},
      onUpdate(){
        const p = idRollProxy.p;
        for(const r of idReels){
          r.track.style.setProperty('--k', String(p*r.to));
          if(p>=1){
            r.char.style.transform = '';
            r.char.style.filter = '';
          } else {
            const scale = 1+0.22*(1-p), blurPx = (3*(1-p)).toFixed(2);
            r.char.style.transform = 'scale('+scale+')';
            r.char.style.filter = 'blur('+blurPx+'px)';
          }
        }
      }
    });
  }
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
  tl.to(maskProxy,{p:1,duration:1.4,ease:'none',onUpdate:applyMaskV5},3.2+INTRO+CAMINHOS_SHIFT)
    // fase de cover: começa EXATAMENTE quando a v5 chega em p=1 (4.6) e sela o
    // escuro; mesmo scrub, sem autoplay. Ver applyCover acima.
    .to(coverProxy,{c:1,duration:COVER,ease:'none',onUpdate:applyCover},4.6+INTRO+CAMINHOS_SHIFT)
    // SAÍDA EM BLOCO de TODA a 02 (cards+esferas+texto+linhas+rótulo) — SEM
    // FADE: todos o MESMO y, sobem juntos como uma peça só e saem de quadro por
    // cima (clipado pelo overflow:hidden do .sol-stage). Sincronizado com o
    // MESMO progresso da transição: começa em p=0 (3.2), sobe durante a máscara
    // (p=0→1) e continua durante o cover, ficando totalmente fora do
    // enquadramento no fim (5.4). opacity fica 1 o tempo todo (sem blur/scale/
    // fade). Ver applyRise/riseGroup acima. 1ª versão com deslocamento BEM
    // perceptível (-1.3*vh) pra avaliar a direção.
    .to(riseProxy,{p:1,duration:1.4+COVER,ease:'none',onUpdate:applyRise},3.2+INTRO+CAMINHOS_SHIFT)
    // y reduzido de 90→40 (era overshoot antes do assentamento) — só esse
    // número: abre espaço entre o pico deste tween e a posição final do
    // documento, necessário pra caber uma revelação do rótulo "03 — A
    // SOLUÇÃO" sem flicker (ver LABEL_HIDE_AT/S3ID_HIDE_MARGIN abaixo).
    // Duração/easing/rotação/escala e o resto da queda continuam intactos.
    .to(q('.doc-stage'),{y:40,rotation:3,scale:.78,duration:.9,ease:'power1.in'},3.2+INTRO+CAMINHOS_SHIFT)
    // queda do documento prolongada: agora assenta só no FIM do cover (5.4),
    // reforçando o documento caindo da 02 pra dentro da 03 enquanto o escuro
    // termina de cobrir (era duração 1.0, terminando em 5.05).
    .to(q('.doc-stage'),{y:0,rotation:-1.5,scale:.55,duration:0.55+COVER,ease:'power2.out'},4.05+INTRO+CAMINHOS_SHIFT)
    .to(q('.doc'),{boxShadow:'0 30px 80px rgba(0,0,0,.55), 0 0 62px rgba(255,0,153,.42)',duration:1.2},3.6+INTRO+CAMINHOS_SHIFT);

  /* 03 — chegada + headline + halo */
  // "03 / A SOLUÇÃO" ficava opacity 0→1 (fade simples); agora aparece de
  // uma vez (set, sem tween) e o giro das letras é que faz a entrada.
  // ⚠️ .s3-id é EXCEÇÃO ao padrão "+COVER em todas as âncoras da 03".
  //
  // MICROFASE DE REVELAÇÃO (checkpoint medido, não estimado — ver
  // ferramentas de inspeção no navegador): por volta de t≈15.9 (medido
  // via getBoundingClientRect em várias amostras) o documento já está 100%
  // assentado (.doc-stage não se move mais entre 15.5 e 16.0 — os dois
  // tweens de queda/assentamento anteriores JÁ terminaram visualmente ali,
  // mesmo que o tween2 só termine formalmente em ~16.0). Esse é o
  // CHECKPOINT: o rótulo nasce exatamente na altura do documento (mesmo
  // centro), oculto por trás dele (z-index:7 do rótulo < z-index:9 de
  // .doc-orbit-wrap, já garantia isso — sem mexer em stacking contexts).
  // Daí em diante (até pouco antes de ORBITAL_OPEN_AT=16.5, com folga de
  // 0.1): documento e rótulo se separam em sentidos opostos na MESMA
  // curva (sine.inOut, suave, sem concentrar movimento numa ponta) — o
  // documento ganha um deslocamento vertical FINAL (DOC_FINAL_Y_OFFSET,
  // ver window.DOC_FINAL_Y_OFFSET em solucao-orbital.js — fonte única,
  // também usada pelo cy do orbital, os dois permanecem vinculados) sem
  // retornar a 0 depois — não é bounce/overshoot, é a nova posição de
  // repouso da seção 03. O rótulo sobe de "atrás do documento" até
  // top:5%/y:0 (mesma posição de todos os .section-id) e para.
  const CHECKPOINT_AT = 5.3+INTRO+CAMINHOS_SHIFT; // ≈15.9 medido
  const REVEAL_DUR = 0.5; // até ≈16.4 — 0.1 de folga antes do orbital abrir (16.5)
  const REVEAL_EASE = 'sine.inOut'; // .doc-stage fica nessa curva — intacta, não mexer
  // SIMPLIFICADO: o documento desce (tweens de sempre, intocados — a queda,
  // o assentamento e depois o tween de CHECKPOINT_AT) e o rótulo sobe num
  // ÚNICO tween, sem parar no meio. Quem decide o que fica visível em cada
  // frame é só o z-index: o documento (z-index:9 de .doc-orbit-wrap) sempre
  // por cima do rótulo (z-index:7) — sem opacity, sem máscara. Não existe
  // mais cálculo de margem/instante-exato-de-revelação: o cruzamento
  // acontece onde quer que os dois se sobreponham naquele frame, o que é
  // automaticamente robusto a qualquer viewport (ao contrário da versão
  // anterior, que tentava prever o momento exato via medição do documento).
  //
  // LABEL_HIDE_AT: só o instante em que o rótulo NASCE (ponto de partida da
  // subida), atrás do documento — mesmo ponto de referência de antes
  // (bate com o print onde os cards "04"/"05" ainda estão saindo de
  // quadro). Não precisa mais ser preciso a esse ponto: como o documento
  // sempre oclude por cima, mesmo que o rótulo nasça um pouco mais alto ou
  // mais baixo que o topo exato do documento, ele continua escondido
  // enquanto estiver atrás dele.
  const LABEL_HIDE_AT = 4.0+INTRO+CAMINHOS_SHIFT; // ≈14.6
  const S3ID_HIDE_MARGIN = 20; // só garante que nasce claramente atrás, não colado na borda
  function s3IdHiddenY(){
    const docEl = root.querySelector('.doc-stage');
    const labelEl = root.querySelector('.s3-id');
    if(!docEl || !labelEl) return 0;
    const docTop = docEl.getBoundingClientRect().top;
    const topOculto = docTop + S3ID_HIDE_MARGIN;
    const topNatural = innerHeight*0.05; // top:5% de CSS, mesmo valor de sempre
    return topOculto - topNatural;
  }
  // tl.call (não tl.set): função-valor num .set() só é avaliada a PRIMEIRA
  // vez que o scrub passa por ali e fica em cache dali pra frente (GSAP
  // otimiza assim) — .call() reexecuta toda vez que o playhead cruza esse
  // ponto, sempre lendo a posição ao vivo do documento nesse instante.
  tl.call(function(){ gsap.set(q('.s3-id'),{y:s3IdHiddenY(),opacity:1}); }, null, LABEL_HIDE_AT);
  // sobe direto até top:5%/y:0 — um tween só, do nascimento (atrás do
  // documento) até o repouso final. Termina ≈16.4, com folga antes do
  // orbital abrir (ORBITAL_OPEN_AT=16.5).
  const LABEL_RISE_DUR = 1.8; // 14.6 → 16.4
  tl.to(q('.s3-id'),{y:0,ease:'sine.inOut',duration:LABEL_RISE_DUR},LABEL_HIDE_AT);
  // giro de letras SINCRONIZADO com a subida — não é mais um giro
  // independente (real-time OU escrubado com atraso aleatório por letra):
  // um único proxy escrubado, MESMA janela/easing do tween de subida acima
  // (LABEL_HIDE_AT → +LABEL_RISE_DUR, sine.inOut), dirige TODAS as letras
  // no mesmo progresso `p` ao mesmo tempo — sem stagger, sem duração
  // aleatória por letra. Efeitos:
  //  1) o giro só termina quando a subida termina (chega no topo) — pedido
  //     explícito da usuária, em vez do flourish rápido de antes;
  //  2) como todas as letras estão SEMPRE no mesmo estágio uma da outra,
  //     parar o scroll em qualquer ponto mostra um estado uniforme (todas
  //     igualmente giradas/borradas), nunca uma mistura desalinhada de
  //     letras prontas com letras no meio do giro (era esse o bug do print
  //     anterior — resolvido aqui pela sincronia, não por tempo real).
  if(s3IdReels){
    gsap.set(s3IdReels.map(r=>r.char), {scale:1.22, filter:'blur(3px)'});
    const rollProxy = {p:0};
    tl.to(rollProxy, {p:1, duration:LABEL_RISE_DUR, ease:'sine.inOut',
      onUpdate(){
        const p = rollProxy.p;
        for(const r of s3IdReels){
          r.track.style.setProperty('--k', String(p*r.to));
          if(p>=1){
            // giro 100% terminado: REMOVE transform/filter em vez de deixar
            // em valor neutro (scale(1)/blur(0px)) — mesmo "zerados", esses
            // dois continuam forçando o navegador a rasterizar a letra numa
            // camada separada pro filtro, o que troca o antialiasing normal
            // do texto por um diferente (glifos com mais traço — Ç, Ã, O —
            // ficam com peso visual inconsistente comparado a letras simples
            // — 0, 3, A). Sem a propriedade no style, a letra volta a
            // renderizar pelo caminho normal de texto, igual o resto do site.
            r.char.style.transform = '';
            r.char.style.filter = '';
          } else {
            const scale = 1+0.22*(1-p), blurPx = (3*(1-p)).toFixed(2);
            r.char.style.transform = 'scale('+scale+')';
            r.char.style.filter = 'blur('+blurPx+'px)';
          }
        }
      }
    }, LABEL_HIDE_AT);
  }
  // documento ganha o deslocamento final — SEM retorno a 0 depois (fonte
  // única: window.DOC_FINAL_Y_OFFSET, ver solucao-orbital.js). Único
  // movimento desta fase: é ele quem revela o rótulo ao descer.
  tl.to(q('.doc-stage'),{y:'+='+(window.DOC_FINAL_Y_OFFSET||40),ease:REVEAL_EASE,duration:REVEAL_DUR},CHECKPOINT_AT);
  // .s3-headline/.s3-sub/.halo removidos do HTML (não usados — substituídos
  // pelo .s3o-intro do orbital). O sistema de linhas (.veins/.svc) abaixo
  // continua intacto, DORMENTE (.s3 tem display:none), preservado de
  // propósito pra reaproveitar o efeito depois.

  /* serviços ativados em sequência (linha → pulso → nó → rótulo) — DESLIGADO
     junto com updateVeins() (ver acima): sem os paths criados, activate()
     tentaria animar elementos que não existem (mesmo TypeError). Mantido
     comentado (não apagado) pra reaproveitar depois, junto com .s3. */
  // activate('jur','.o-jur',5.7+COVER+INTRO+CAMINHOS_SHIFT);
  // activate('haia','.o-haia',7.1+COVER+INTRO+CAMINHOS_SHIFT);
  // activate('cert','.o-cert',8.1+COVER+INTRO+CAMINHOS_SHIFT);
  // activate('tec','.o-tec',9.1+COVER+INTRO+CAMINHOS_SHIFT);
  // activate('simp','.o-simp',10.1+COVER+INTRO+CAMINHOS_SHIFT);

  tl.to({},{duration:.9},13.0+COVER+INTRO+CAMINHOS_SHIFT);

  /* --- ETAPA 1 · abertura da composição orbital (Opção B) ---------------
     Começa DEPOIS do cover da transição (documento já no CENTRO). Motor
     separado em solucao-orbital.js, injetando no MESMO timeline scrubado
     (100% reversível). Anéis/nós/interações entram nas próximas etapas. */
  const ORBITAL_OPEN_AT = 4.6 + COVER + INTRO + CAMINHOS_SHIFT + 0.5;
  // introAt = LABEL_HIDE_AT: mesmo instante em que o rótulo "03 — A Solução"
  // nasce atrás do documento — a entrada do texto da coluna esquerda
  // (.s3o-intro) fica ATRELADA a esse momento (mesma origem), mas com uma
  // folga de +0.6: LABEL_HIDE_AT sozinho (14.6) cai bem no meio da máscara
  // 02→03 ainda abrindo (fundo ainda claro, cards da 02 ainda visíveis) —
  // o texto aparecia ali com contraste ruim, brigando com o resto da
  // composição que ainda não tinha fechado em preto. +0.6 pousa por volta
  // de t≈15.2, quando a máscara já fechou 100% (fundo já preto), mantendo
  // a mesma "origem" de sincronização mas com o fundo pronto pra receber o
  // texto.
  const INTRO_DELAY_AFTER_LABEL = 0.6;
  if(window.SolucaoOrbital) window.SolucaoOrbital.init(root, tl, {openAt: ORBITAL_OPEN_AT, introAt: LABEL_HIDE_AT+INTRO_DELAY_AFTER_LABEL});

  // MENU "A Solução": leva ao FINAL da animação da 03 (ORBITAL_OPEN_AT + 7.8 = 24.3 da timeline, logo
  // depois de o último anel fechar em 23.9), onde o núcleo, os 4 anéis e os triângulos já estão prontos
  // pra clicar — e o texto da esquerda continua na tela. O link "Explorar o caminho" da 02 não é tocado
  // (continua indo pro começo da 03), e só no desktop (sticky); no celular vale a âncora nativa.
  const irParaSolucao = ()=>{
    const st = tl.scrollTrigger, palco = q('.sol-stage')[0];
    if(!st || !palco || getComputedStyle(palco).position !== 'sticky') return false;
    const y = st.start + ((ORBITAL_OPEN_AT + 7.8) / tl.duration()) * (st.end - st.start);
    window.scrollTo({top:y, behavior:'auto'});
    return true;
  };
  document.querySelectorAll('.main-nav a[href="#solucao"]').forEach(a=>a.addEventListener('click', e=>{
    if(irParaSolucao()){ e.preventDefault(); history.replaceState(null, '', '#solucao'); }
  }));
  if(location.hash === '#solucao'){ setTimeout(irParaSolucao, 0); setTimeout(irParaSolucao, 500); }

  gsap.to(q('.progress i'),{height:'100%',ease:'none',
    scrollTrigger:{trigger:root,start:'top top',end:'bottom bottom',scrub:true}});
}

/* ------------------- 03a2 · QR FAKE DO DOCUMENTO ---------------------- */
/* Só visual (port do proto-doc.html) — padrão determinístico com os 3
   "finder patterns" nos cantos, pra parecer um QR de verdade. Trocar por
   um QR funcional depois. */
function initDocQR(){
  const svg = document.getElementById('docQr'); if(!svg) return;
  const N = 21, NS = 'http://www.w3.org/2000/svg';
  const finder = (ox,oy)=>{
    for(let y=0;y<7;y++)for(let x=0;x<7;x++){
      const edge = x===0||x===6||y===0||y===6;
      const core = x>=2&&x<=4&&y>=2&&y<=4;
      if(edge||core) put(ox+x,oy+y);
    }
  };
  function put(x,y){const r=document.createElementNS(NS,'rect');r.setAttribute('x',x);r.setAttribute('y',y);r.setAttribute('width',1);r.setAttribute('height',1);r.setAttribute('fill','#0e0e12');svg.appendChild(r);}
  let seed=1337; const rnd=()=>{seed=(seed*1103515245+12345)&0x7fffffff;return seed/0x7fffffff;};
  const inFinder=(x,y)=>((x<8&&y<8)||(x>=N-8&&y<8)||(x<8&&y>=N-8));
  for(let y=0;y<N;y++)for(let x=0;x<N;x++){ if(inFinder(x,y))continue; if(rnd()>0.55)put(x,y); }
  finder(0,0); finder(N-7,0); finder(0,N-7);
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
  if(!matchMedia('(hover: hover) and (pointer: fine)').matches) return null; // touch: sem tilt, só scroll
  const stage = root.querySelector('.doc-stage');
  const inner = root.querySelector('.doc-mouse');
  if(!stage || !inner) return null;
  const shadow = root.querySelector('.doc-shadow');

  const MAX_ROT_Y=10, MAX_ROT_X=8, MAX_T=6, MAX_SHADOW_T=4;
  const EASE={duration:0.9,ease:'power3'};
  // canal de x/y tem duração PRÓPRIA (mais curta) — é o mesmo canal que o
  // drag agora usa (soma tiltX+dragX), e precisa responder rápido/direto
  // ao ponteiro; a rotação do tilt (dominante, visualmente) continua em
  // 0.9s, inalterada.
  const XY_EASE={duration:0.2,ease:'power3.out'};
  const setRotY = gsap.quickTo(inner,'rotationY',EASE);
  const setRotX = gsap.quickTo(inner,'rotationX',EASE);
  const setTX   = gsap.quickTo(inner,'x',XY_EASE);
  const setTY   = gsap.quickTo(inner,'y',XY_EASE);
  const setShX  = shadow ? gsap.quickTo(shadow,'x',EASE) : null;
  const setShY  = shadow ? gsap.quickTo(shadow,'y',EASE) : null;

  // .doc-mouse continua sendo o ÚNICO dono do seu x/y — applyXY() é o ÚNICO
  // canal de escrita, alimentado pela SOMA tiltX+dragX / tiltY+dragY (ver
  // initDocDrag). Durante o drag (suspended) escreve DIRETO via gsap.set —
  // setTX/setTY (quickTo, com a própria easing) já são a suavização do
  // tilt; encadear os dois (drag → quickTo → tela) somava duas easings e
  // fazia o documento "ultrapassar" visivelmente antes de assentar. Com
  // tiltX/Y sempre 0 durante o drag, gsap.set aqui vira só o drag puro —
  // nenhuma disputa de propriedade, nenhum elemento novo.
  let tiltX=0, tiltY=0, dragX=0, dragY=0, suspended=false;
  function applyXY(){
    if(suspended) gsap.set(inner,{x:tiltX+dragX,y:tiltY+dragY});
    else{ setTX(tiltX+dragX); setTY(tiltY+dragY); }
  }

  function onMove(e){
    if(suspended) return;
    const r = stage.getBoundingClientRect(); // .doc-stage se move no scroll — mede a cada evento, não por rAF
    if(!r.width || !r.height) return;
    const cx = Math.max(-1,Math.min(1, ((e.clientX-r.left)/r.width)*2-1));
    const cy = Math.max(-1,Math.min(1, ((e.clientY-r.top)/r.height)*2-1));
    setRotY(cx*MAX_ROT_Y);
    setRotX(-cy*MAX_ROT_X);
    tiltX = cx*MAX_T; tiltY = cy*MAX_T;
    applyXY();
    if(setShX){ setShX(-cx*MAX_SHADOW_T); setShY(-cy*MAX_SHADOW_T); }
  }
  function onLeave(){
    if(suspended) return;
    setRotY(0); setRotX(0);
    tiltX=0; tiltY=0; applyXY();
    if(setShX){ setShX(0); setShY(0); }
  }
  stage.addEventListener('pointermove', onMove, {passive:true});
  stage.addEventListener('pointerleave', onLeave, {passive:true});

  return {
    setSuspended(v){
      // Só alterna a flag — NUNCA gsap.set/kill em rotationX/rotationY (ou
      // x/y da sombra) aqui. Os dois já quebraram o tilt por motivos
      // diferentes: gsap.set(...,{rotationX:0,...}) causava o salto (a folha
      // "endireitava" ao ser agarrada); gsap.killTweensOf nos mesmos canais
      // mata a tween PERSISTENTE que o gsap.quickTo(setRotX/setRotY/setShX/
      // setShY) mantém internamente — depois disso o quickTo fica "morto" e
      // para de animar pro resto da sessão (era o bug do drag travando o
      // tilt). onMove() já tem `if(suspended) return`, então basta não
      // chamar mais setRotX/setRotY/tiltX/tiltY durante o drag — a rotação
      // simplesmente pára de ser redirecionada e o quickTo continua intacto
      // pro próximo movimento real do mouse.
      suspended=v;
    },
    setDragOffset(dx,dy){ dragX=dx; dragY=dy; applyXY(); }
  };
}

/* ------------------- 03c · DRAG NO DOCUMENTO ------------------------- */
/* Nenhum elemento/wrapper novo — escreve só via tilt.setDragOffset, que
   soma no MESMO x/y de .doc-mouse que o tilt já usa (ver initDocInteraction
   acima). Versão mínima de validação: sem rotação por velocidade, sem
   inércia — só acompanha o ponteiro (clamp ±70px) e volta com um gsap.to
   simples. Se não houver tilt (touch/reduced-motion), o drag não faz nada
   (return early) — a folha só reage a mouse fino, igual ao tilt hoje. */
function initDocDrag(root, tilt){
  if(!tilt) return;
  const docEl = root.querySelector('.doc');
  if(!docEl) return;

  const MAX_DRAG=70;
  let dragging=false, startPX=0, startPY=0, startDX=0, startDY=0;
  const ret={x:0,y:0}; // proxy do retorno — onUpdate soma via tilt.setDragOffset

  function onDown(e){
    if(e.pointerType==='mouse' && e.button!==0) return;
    // sem isso, arrastar com mouse real seleciona o texto do documento por
    // baixo (fica um destaque azul por cima da página, parece um bug visual).
    e.preventDefault();
    gsap.killTweensOf(ret); // interrompe o retorno em andamento, se houver
    dragging=true;
    try{ docEl.setPointerCapture(e.pointerId); }catch(err){}
    startPX=e.clientX; startPY=e.clientY; // posição inicial do ponteiro
    startDX=ret.x; startDY=ret.y;         // offset visual atual do documento
    tilt.setSuspended(true);
    docEl.classList.add('is-dragging');
  }
  function onMove(e){
    if(!dragging) return;
    let dx=startDX+(e.clientX-startPX);
    let dy=startDY+(e.clientY-startPY);
    const distance=Math.hypot(dx,dy); // clamp circular — preserva a direção, só limita o raio
    if(distance>MAX_DRAG){ dx=(dx/distance)*MAX_DRAG; dy=(dy/distance)*MAX_DRAG; }
    ret.x=dx; ret.y=dy;
    tilt.setDragOffset(dx,dy);
  }
  function onUp(e){
    if(!dragging) return;
    dragging=false;
    docEl.classList.remove('is-dragging');
    try{
      if(e?.pointerId!==undefined && docEl.hasPointerCapture?.(e.pointerId)){
        docEl.releasePointerCapture(e.pointerId);
      }
    }catch(err){}
    // setSuspended(false) só no onComplete, DEPOIS do retorno terminar —
    // reativar cedo (antes do gsap.to abaixo) parecia melhor, mas troca o
    // gsap.set direto (usado enquanto suspended) pelo setTX/setTY (quickTo,
    // com sua própria easing de .2s): o retorno passa a ser suavizado DUAS
    // VEZES em cadeia (a tween do retorno + a easing do tilt por cima),
    // um movimento elástico/trêmulo em vez de reto — exatamente o problema
    // que o comentário abaixo (na criação de setTX/setTY) já descreve.
    // Custo aceito: ~0.6s de pausa do tilt após soltar, sem nenhum tremor.
    gsap.to(ret,{x:0,y:0,duration:.6,ease:'power3.out',
      onUpdate(){ tilt.setDragOffset(ret.x,ret.y); },
      onComplete(){ tilt.setSuspended(false); }});
  }
  docEl.addEventListener('pointerdown', onDown);
  docEl.addEventListener('pointermove', onMove);
  docEl.addEventListener('pointerup', onUp);
  docEl.addEventListener('pointercancel', onUp);
  docEl.addEventListener('lostpointercapture', onUp);
}

/* ------------------- 03d · TILT 3D DOS CARDS (chips) ------------------ */
/* Sensação de profundidade/tilt 3D (referência: card com perspective +
   preserve-3d), portada pra GSAP puro — sem lib nova. Cada .chip-box
   mantém uma inclinação BASE de repouso, espelhada esquerda/direita (ver
   .c2/.c4 vs .c1/.c3/.c5 no CSS), e o mouse soma um delta por cima
   (rotationY/X/Z) enquanto o ponteiro está sobre o card — ao sair, tudo
   volta suavemente pra base. .chip-box gira como PLACA RÍGIDA (uma
   rotação só, sem deformação); título e descrição são camadas
   INDEPENDENTES (translateZ + parallax x/y próprios) que parecem flutuar
   à frente da placa. Escreve só rotationX/Y/Z, z, scale e x/y nos filhos
   — canais de propriedade GSAP que o scroll (buildCaminho/updateCaminhos)
   nunca toca (ele escreve opacity/y/scale/filter em .chip/.chip-box/
   small/num), mesmo padrão de convivência que initDocInteraction acima. */
function initChipTilt(root){
  if(!matchMedia('(hover: hover) and (pointer: fine)').matches) return; // touch: sem tilt
  const LEFT = new Set(['c2','c4']);
  const EASE = {duration:.55, ease:'power3'};
  // sombra/borda de repouso vêm do CSS (.chip-box) — aqui só os valores do
  // estado de hover, pra reforçar visualmente a elevação (z:42 sozinho não
  // "vende" profundidade sem uma sombra crescendo junto). boxShadow/border-
  // color não são propriedades numéricas puras — não dá pra usar quickTo
  // (que é só pra número), então uma gsap.to() normal por vez (mesmo padrão
  // já usado no boxShadow de .doc, mais acima em initSolucao).
  const REST_SHADOW='0 1px 2px rgba(20,0,12,.05), 0 3px 8px rgba(20,0,12,.05), 0 18px 36px -14px rgba(30,0,18,.26)';
  const HOVER_SHADOW='0 2px 4px rgba(20,0,12,.06), 0 8px 20px rgba(20,0,12,.08), 0 34px 64px -12px rgba(30,0,18,.32), 0 0 30px rgba(255,0,153,.20)';
  const REST_BORDER='rgba(20,0,12,.08)';
  const HOVER_BORDER='rgba(255,0,153,.55)';
  // título/descrição ganham uma separação PERMANENTE (pequena) já no
  // repouso — antes só existia Z no hover, então o card parecia "chapado"
  // o resto do tempo. Sutil de propósito: o grosso da profundidade
  // continua reservado pro hover (REST != 0, mas bem menor que HOVER).
  const REST_TITLE_Z=8, REST_DESC_Z=4;
  const HOVER_TITLE_Z=96, HOVER_DESC_Z=62, HOVER_CARD_Z=68;
  // card de vidro (.chip-box--glass): elevação/inclinação BEM mais forte no
  // hover, pra vender a sensação de "saindo da tela" — sombra própria (mantém
  // os insets do vidro, só engorda a sombra externa + acrescenta glow rosa).
  const GLASS_HOVER_CARD_Z=170, GLASS_HOVER_SCALE=1.18, GLASS_TILT_MULT=1.8;
  const GLASS_REST_SHADOW='inset 0 1px 0 rgba(255,255,255,.9), inset 0 -10px 18px rgba(180,190,210,.16), 0 1px 2px rgba(20,0,12,.05), 0 3px 8px rgba(20,0,12,.05), 0 18px 36px -14px rgba(30,0,18,.26)';
  const GLASS_HOVER_SHADOW='inset 0 1px 0 rgba(255,255,255,.9), inset 0 -10px 18px rgba(180,190,210,.16), 0 2px 4px rgba(20,0,12,.06), 0 14px 28px rgba(20,0,12,.12), 0 60px 110px -20px rgba(20,0,10,.48), 0 0 46px rgba(255,0,153,.22)';
  // mesma lógica pro texto: sem sombra própria, o título/descrição em Z
  // mais alto ainda parecem "colados" no card — a sombra reforça que estão
  // soltos, flutuando à frente dele (mesmo padrão do boxShadow acima).
  const REST_TEXT_SHADOW='0 0 0 rgba(0,0,0,0)';
  const HOVER_TITLE_SHADOW='0 10px 18px rgba(0,0,0,.28)';
  const HOVER_DESC_SHADOW='0 6px 12px rgba(0,0,0,.20)';
  root.querySelectorAll('.chip').forEach(chip=>{
    const box = chip.querySelector('.chip-box');
    if(!box) return;
    const title = box.querySelector('b');
    const desc  = box.querySelector('.chip-desc');
    const isLeft = [...chip.classList].some(c=>LEFT.has(c));
    // TESTE (card de vidro, .chip-box--glass): reaproveita o x/y do tilt pra
    // mover o brilho do vidro (CSS var, ver site.css) — sem listener/loop novo.
    const isGlass = box.classList.contains('chip-box--glass');
    // o crachá numerado é IRMÃO do card, não filho — nunca acompanhava o
    // hover. Com o crescimento grande do glass (scale 1.18 + z 170), o card
    // "inflava" ao redor de um crachá parado, lendo como um conflito bem
    // perto do título. Sobe/escala junto, na mesma perspectiva (.chip).
    const badge = isGlass ? chip.querySelector('small') : null;
    // card de vidro: rotationY de repouso mais forte — acentua a ponta
    // esquerda "recuando" e a direita "abrindo" (onde mora a face de
    // espessura, ::after no CSS), vendendo mais claramente o pequeno bloco
    // físico em vez de um cartão plano.
    // card de vidro: inclinação de repouso mais forte, mas respeitando o
    // espelhamento esquerda/direita (c2/c4 têm o crachá e o transform-origin
    // no lado oposto — um baseY fixo sem isLeft inclinaria eles pro lado
    // errado, quebrando a face de espessura que é sempre à DIREITA do card).
    const baseX=4, baseY=isGlass?(isLeft?27:-27):(isLeft?24:-24), baseZRot=isLeft?4.5:-4.5;

    gsap.set(box,{rotationX:baseX,rotationY:baseY,rotationZ:baseZRot,z:0,scale:1});
    if(title) gsap.set(title,{z:REST_TITLE_Z});
    if(desc) gsap.set(desc,{z:REST_DESC_Z});
    const setRotY = gsap.quickTo(box,'rotationY',EASE);
    const setRotX = gsap.quickTo(box,'rotationX',EASE);
    const setRotZ = gsap.quickTo(box,'rotationZ',EASE);
    const setZ    = gsap.quickTo(box,'z',EASE);
    const setScale= gsap.quickTo(box,'scale',EASE);
    const setTitleZ = title && gsap.quickTo(title,'z',EASE);
    const setTitleX = title && gsap.quickTo(title,'x',EASE);
    const setTitleY = title && gsap.quickTo(title,'y',EASE);
    const setDescZ  = desc && gsap.quickTo(desc,'z',EASE);
    const setDescX  = desc && gsap.quickTo(desc,'x',EASE);
    const setDescY  = desc && gsap.quickTo(desc,'y',EASE);

    // pointermove dispara a cada poucos px de movimento (bem mais rápido
    // que a tela desenha) — cada disparo retargeta os quickTo, forçando o
    // Chrome a rerasterizar o texto (sob rotação 3D) mais vezes do que
    // qualquer frame consegue mostrar, e é isso que borra o texto EM
    // MOVIMENTO (assentado fica nítido). Agrupar num rAF (no máx. 1 update
    // por frame real) resolve sem mudar a sensação do tilt.
    let rafId=null, lastEvent=null;
    function applyMove(e){
      const r = box.getBoundingClientRect();
      if(!r.width || !r.height) return;
      const x = Math.max(-1,Math.min(1, ((e.clientX-r.left)/r.width)*2-1));
      const y = Math.max(-1,Math.min(1, ((e.clientY-r.top)/r.height)*2-1));
      const tm = isGlass ? GLASS_TILT_MULT : 1;
      setRotY(baseY + x*8.5*tm);
      setRotX(baseX - y*6.5*tm);
      setRotZ(baseZRot + x*0.8*tm);
      // glass: só o brilho acompanha o mouse — título/desc ficam solidários
      // ao card (evita 2 movimentos concorrentes na mesma área de texto).
      if(setTitleX && !isGlass){ setTitleX(x*14); setTitleY(y*10); }
      if(setDescX && !isGlass){ setDescX(x*8); setDescY(y*6); }
      if(isGlass){ box.style.setProperty('--mx', x); box.style.setProperty('--my', y); }
    }
    function onMove(e){
      lastEvent=e;
      if(rafId) return;
      rafId=requestAnimationFrame(()=>{ rafId=null; applyMove(lastEvent); });
    }
    function onEnter(){
      setZ(isGlass ? GLASS_HOVER_CARD_Z : HOVER_CARD_Z);
      setScale(isGlass ? GLASS_HOVER_SCALE : 1.09);
      // no card de vidro, título/desc "crescendo" (translateZ) por cima do
      // brilho que já se move com o mouse duplicava movimento e lia como bug —
      // aqui só o card inteiro se move (tilt+scale), texto fica solidário.
      if(setTitleZ && !isGlass) setTitleZ(HOVER_TITLE_Z);
      if(setDescZ && !isGlass) setDescZ(HOVER_DESC_Z);
      // .chip-box--glass mantém os insets do vidro (sombra própria, ver
      // GLASS_HOVER_SHADOW) — só a elevação externa/glow crescem; a borda
      // (que no glass é decorativa/CSS) não é tocada, ao contrário dos
      // outros cards, onde ela vira rosa no hover.
      if(isGlass){
        gsap.to(box,{boxShadow:GLASS_HOVER_SHADOW,duration:.55,ease:'power3'});
        if(badge) gsap.to(badge,{z:GLASS_HOVER_CARD_Z*.55,scale:1.10,duration:.55,ease:'power3'});
      }
      else gsap.to(box,{boxShadow:HOVER_SHADOW,borderColor:HOVER_BORDER,duration:.4,ease:'power2.out'});
      if(title && !isGlass) gsap.to(title,{textShadow:HOVER_TITLE_SHADOW,duration:.4,ease:'power2.out'});
      if(desc) gsap.to(desc,{textShadow:HOVER_DESC_SHADOW,duration:.4,ease:'power2.out'});
    }
    function onLeave(){
      if(rafId){ cancelAnimationFrame(rafId); rafId=null; }
      setRotY(baseY); setRotX(baseX); setRotZ(baseZRot);
      setZ(0); setScale(1);
      if(setTitleZ){ setTitleZ(REST_TITLE_Z); setTitleX(0); setTitleY(0); }
      if(setDescZ){ setDescZ(REST_DESC_Z); setDescX(0); setDescY(0); }
      if(isGlass){ box.style.setProperty('--mx', 0); box.style.setProperty('--my', 0); }
      if(isGlass){
        gsap.to(box,{boxShadow:GLASS_REST_SHADOW,duration:.55,ease:'power3'});
        if(badge) gsap.to(badge,{z:0,scale:1,duration:.55,ease:'power3'});
      }
      else gsap.to(box,{boxShadow:REST_SHADOW,borderColor:REST_BORDER,duration:.5,ease:'power2.out'});
      if(title && !isGlass) gsap.to(title,{textShadow:REST_TEXT_SHADOW,duration:.5,ease:'power2.out'});
      if(desc) gsap.to(desc,{textShadow:REST_TEXT_SHADOW,duration:.5,ease:'power2.out'});
    }
    box.addEventListener('pointerenter', onEnter, {passive:true});
    box.addEventListener('pointermove', onMove, {passive:true});
    box.addEventListener('pointerleave', onLeave, {passive:true});
  });
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

  initDocQR();

  // Inits por seção — independentes. Sem GSAP ou reduced-motion → CSS estático.
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(window.gsap && window.ScrollTrigger && !reduce){
    gsap.registerPlugin(ScrollTrigger);
    if(window.CustomEase){
      gsap.registerPlugin(CustomEase);
      CustomEase.create('focusTextEase','0.16,1,0.3,1'); // ver FOCUS TEXT acima
    }
    document.querySelectorAll('.sec[data-sec]').forEach(sec=>{
      const kind=sec.dataset.sec;
      if(kind==='hero-s2-story') initHeroS2Story(sec);
      else if(kind==='solucao'){ initSolucao(sec); initDocDrag(sec, initDocInteraction(sec)); initChipTilt(sec); }
    });
    if(document.fonts && document.fonts.ready){ document.fonts.ready.then(()=>ScrollTrigger.refresh()); }
  }
})();
