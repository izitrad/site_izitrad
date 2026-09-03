/* =====================================================================
   IZITRAD — landing (scaffold) · orquestração
   - Cada seção é INDEPENDENTE: init próprio, timeline própria, ScrollTrigger
     próprio, tudo ESCOPADO à sua <section> (gsap.utils.selector + root.query).
   - Nunca usa pin:true. O comprimento do scroll vem da altura da <section>;
     o filho sticky (CSS) mantém a cena visível. Sem pin-spacer.
   - Adicionar/remover/reordenar uma seção não quebra as outras.
   ===================================================================== */

/* -------------------------------- 01 · HERO -------------------------- */
function initHero(root){
  const stage   = root.querySelector('.hero-stage');
  const logo    = root.querySelector('.logo');
  const logoImg = root.querySelector('.logo__img');
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
    wipe.style.left=(lr.left-s.left)+'px';
    wipe.style.top=(lr.top-s.top)+'px';
    wipe.style.width=lr.width+'px';
    wipe.style.height=lr.height+'px';
    const t0=wipePath.getBoundingClientRect();
    const triCX=t0.left+t0.width/2, triCY=t0.top+t0.height/2;
    triW0=t0.width;
    const b=wipePath.getBBox();
    wipe.setAttribute('viewBox',`${b.x.toFixed(2)} ${b.y.toFixed(2)} ${b.width.toFixed(2)} ${b.height.toFixed(2)}`);
    triAspect=b.height/b.width;
    const logoRect=logo.getBoundingClientRect();
    logo.style.transformOrigin=(triCX-logoRect.left).toFixed(1)+'px '+(triCY-logoRect.top).toFixed(1)+'px';
    anchorX0=triCX-s.left; anchorY0=triCY-s.top;
    centerX=window.innerWidth/2-s.left; centerY=window.innerHeight/2-s.top;
    triTargetWidth=(window.innerWidth+2*window.innerHeight/triAspect)*COVER_MARGIN;
    triHandoff=triW0*PHASE1_MULT;
    proxy.w=triW0; applyGrowth();
  }
  buildGrow();
  wipe.style.visibility='visible';   // já posicionado → pode mostrar (sem flash)

  const tl=gsap.timeline({ scrollTrigger:{ trigger:root, start:'top top', end:'bottom bottom',
    scrub:0.4, invalidateOnRefresh:true, onRefresh:buildGrow } });
  const grow={p:0};
  tl.to(grow,{p:1,ease:'power1.in',duration:1.8,onUpdate(){ proxy.w=triW0+(triTargetWidth-triW0)*grow.p; applyGrowth(); }},0)
    .to(hint,{autoAlpha:0,duration:0.25},0.2);
  const IN={autoAlpha:1,x:0,y:0,ease:'power2.out',duration:0.5};
  tl.fromTo(apost,{autoAlpha:0,x:-320},IN,1.9)
    .fromTo(haia,{autoAlpha:0,x:320},IN,2.05)
    .fromTo(sem,{autoAlpha:0,y:90},IN,2.2)
    .fromTo(sair,{autoAlpha:0,y:90},IN,2.3)
    .fromTo(decasa,{autoAlpha:0,y:90},IN,2.4)
    .fromTo(copyP,{autoAlpha:0,y:40},IN,2.55)
    .fromTo(copyBtn,{autoAlpha:0,y:40},IN,2.65);
  tl.to({},{duration:0.6},3.25);
}

/* ----------------------------- 02 · O CAMINHO ------------------------ */
function initCaminho(root){
  const ilDoc=root.querySelector('.il--doc'), ilDest=root.querySelector('.il--dest'), ilCam=root.querySelector('.il--cam');
  const introCopy=root.querySelector('.intro-copy'), introLink=root.querySelector('.intro-link');
  const tl=gsap.timeline({ scrollTrigger:{ trigger:root, start:'top top', end:'bottom bottom',
    scrub:0.4, invalidateOnRefresh:true } });
  const IN={autoAlpha:1,x:0,y:0,ease:'power3.out',duration:0.6};
  tl.fromTo(ilDoc,{autoAlpha:0,x:-260},IN,0.10)
    .fromTo(ilDest,{autoAlpha:0,x:260},IN,0.35)
    .fromTo(ilCam,{autoAlpha:0,y:170},IN,0.60)
    .fromTo(introCopy,{autoAlpha:0,y:40},IN,0.90)
    .fromTo(introLink,{autoAlpha:0,y:40},IN,1.05)
    .to({},{duration:0.7},1.4);
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
  gsap.to(q('.doc'),{scale:1.014,duration:2.6,repeat:-1,yoyo:true,ease:'sine.inOut'});

  const tl=gsap.timeline({ scrollTrigger:{ trigger:root, start:'top top', end:'bottom bottom',
    scrub:1, invalidateOnRefresh:true, onRefresh:updateVeins } });

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
  gsap.set(q('.path'),{scaleX:0});
  gsap.set(q('.s3-bg'),{y:0,yPercent:100});

  /* 02 — exploração dos caminhos */
  tl.to(q('.copy-a'),{opacity:0,y:-50,duration:1},0.7)
    .to(q('.doc-stage'),{rotation:2,scale:1.08,duration:1.2},0.5)
    .to(q('.chip'),{opacity:1,stagger:.12,duration:.7},1.25)
    .to(q('.path'),{opacity:.65,scaleX:1,duration:.7},1.2)
    .to(q('.doc-stage'),{rotation:-2,scale:1.02,duration:1},2.2);

  /* transição 02→03 (o mesmo documento atravessa) */
  tl.to(q('.chip'),{opacity:.12,y:10,duration:.7},3.0)
    .to(q('.path'),{opacity:.1,duration:.6},3.0)
    .to(q('.section-id'),{opacity:0,duration:.5},3.2)
    .to(q('.s3-bg'),{yPercent:0,duration:1.4,ease:'power2.inOut'},3.2)
    .to(q('.doc-stage'),{y:90,rotation:3,scale:.78,duration:.9,ease:'power1.in'},3.2)
    .to(q('.doc-stage'),{y:0,rotation:-1.5,scale:.55,duration:1.0,ease:'power2.out'},4.05)
    .to(q('.doc'),{boxShadow:'0 30px 80px rgba(0,0,0,.55), 0 0 62px rgba(255,0,153,.42)',duration:1.2},3.6)
    .to(q('.chip, .path'),{opacity:0,duration:.4},4.4);

  /* 03 — chegada + headline + halo */
  tl.to(q('.s3-id'),{opacity:1,duration:.5},4.8)
    .fromTo(q('.s3-headline'),{opacity:0,x:-40},{opacity:1,x:0,duration:.8},4.9)
    .fromTo(q('.s3-sub'),{opacity:0,x:-30},{opacity:1,x:0,duration:.8},5.2)
    .fromTo(q('.halo'),{opacity:0,scale:.9},{opacity:1,scale:1,duration:1.0},5.3);

  /* serviços ativados em sequência (linha → pulso → nó → rótulo) */
  activate('jur','.o-jur',5.7);
  activate('haia','.o-haia',7.1);
  activate('cert','.o-cert',8.1);
  activate('tec','.o-tec',9.1);
  activate('simp','.o-simp',10.1);

  /* fechamento: composição recua, coração sobe, CTA centrado */
  tl.to(q('.s3-headline, .s3-sub'),{opacity:0,y:-20,duration:.6},11.6)
    .to(q('.svc, .vein'),{opacity:0,duration:.7},11.6)
    .to(q('.doc-stage'),{y:-60,scale:.5,rotation:0,duration:.9,ease:'power2.out'},11.6)
    .fromTo(q('.s3-close'),{opacity:0,y:24},{opacity:1,y:0,duration:.8,ease:'power2.out'},12.0)
    .to({},{duration:.9},13.0);

  gsap.to(q('.progress i'),{height:'100%',ease:'none',
    scrollTrigger:{trigger:root,start:'top top',end:'bottom bottom',scrub:true}});
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

    // Compacto (hambúrguer) a partir do fim do hero: o próprio hero cuida do
    // fade durante seu scroll (ver initHero), mas só enquanto a tween de
    // crescimento do triângulo está ativa (~47% do scroll do hero) — depois
    // disso ela para de atualizar, então a opacity de volta a 1 fica "presa"
    // se só resetássemos via JS ao entrar no modo compacto. Por isso a
    // opacity:1 do compacto é garantida via CSS (!important), não aqui.
    const heroSec=document.querySelector('.sec-hero');
    if(heroSec){
      const nav=header.querySelector('.main-nav');
      const onCompact=()=>{
        const pastHero=heroSec.getBoundingClientRect().bottom<=0;
        if(header.hasAttribute('data-compact')!==pastHero){
          // troca instantânea (sem herdar as transitions de background/opacity
          // do header e do nav) pra não "flashar" o menu ao cruzar hero↔seção 2
          header.style.transition='none';
          if(nav) nav.style.transition='none';
          header.toggleAttribute('data-compact', pastHero);
          header.offsetHeight;
          requestAnimationFrame(()=>{ header.style.transition=''; if(nav) nav.style.transition=''; });
        }
        if(pastHero){ header.style.pointerEvents=''; }
      };
      onCompact(); addEventListener('scroll',onCompact,{passive:true});
    }
  }

  // Inits por seção — independentes. Sem GSAP ou reduced-motion → CSS estático.
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(window.gsap && window.ScrollTrigger && !reduce){
    gsap.registerPlugin(ScrollTrigger);
    document.querySelectorAll('.sec[data-sec]').forEach(sec=>{
      const kind=sec.dataset.sec;
      if(kind==='hero') initHero(sec);
      else if(kind==='caminho') initCaminho(sec);
      else if(kind==='solucao') initSolucao(sec);
    });
    if(document.fonts && document.fonts.ready){ document.fonts.ready.then(()=>ScrollTrigger.refresh()); }
  }
})();
