/* ===== SEÇÃO 06 — AVALIAÇÕES (carrossel 3D "Stories") =====
   Fonte: _izi-GPT/seção 6/_APROVADO.html — mecânica (heading blur, 3D das
   histórias, mouse tilt, parallax, cursor + anel DrawSVG, avanço
   automático/clique) transportada 1:1. ADAPTAÇÕES combinadas com a usuária:
   - SEM canvas WebGL próprio nem progress/crossCallbacks do fundo: o fundo é
     o canvas compartilhado da 04/05 (STATE_06 em secao04-fundo-1a1.js);
   - tempo de cada história = nº de palavras / 3 (era a duração dos áudios
     originais do Amaterasu, fixa por história);
   - cursor customizado só aparece com o mouse sobre os cards (o original
     deixava ligado na página toda);
   - loops de animação (cursor + inclinação 3D) só rodam com os cards na
     tela e a aba visível;
   - rótulo "06 — AVALIAÇÕES" no mesmo padrão dos outros capítulos (giro de
     letras, ver buildKicker em secao05.js). */
(function(){
"use strict";
const root=document.querySelector('.sec06-stories');
if(!root || !window.gsap || !window.ScrollTrigger) return;
const {gsap,ScrollTrigger}=window;
gsap.registerPlugin(ScrollTrigger);
if(window.DrawSVGPlugin) gsap.registerPlugin(window.DrawSVGPlugin);
const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
const WORDS_PER_SECOND=3;

/* Rótulo do capítulo — mesmo mecanismo do buildKicker() da 05 (tempo real,
   toca ao entrar, reverte ao voltar). x:0 explícito evita o xPercent
   duplicado (ver comentário em secao05.js). */
function buildKicker(){
  const kickerEl=root.querySelector('.s06-kicker');
  if(!kickerEl) return;
  gsap.set(kickerEl,{x:0,xPercent:-50,y:70});
  const kickerTl=gsap.timeline({scrollTrigger:{trigger:kickerEl,start:'top 85%',toggleActions:'play none none reverse'}});
  kickerTl.to(kickerEl,{opacity:1,y:0,duration:.6,ease:'power2.out'},0);
  if(reduceMotion || !window.buildRollingLabel || !window.addRollingTween) return;
  const reels=buildRollingLabel(kickerEl);
  gsap.set(reels.map(r=>r.char),{scale:1.22,filter:'blur(3px)'});
  addRollingTween(kickerTl,reels,.1);
}
buildKicker();

/* HomeStories typography/heading mechanics */
const heading=root.querySelector('.s06-heading'),words=[...root.querySelectorAll('.s06-heading-word')];
function setupHeading(){
  const base=innerWidth<=600?375:1440, blur=innerWidth/base*10;
  gsap.set(words,{autoAlpha:0,filter:`blur(${blur}px)`});
}
setupHeading();
gsap.timeline({paused:true,scrollTrigger:{trigger:heading,start:'top bottom',end:()=>`+=${innerHeight/2}`,scrub:true}})
  .fromTo(words,{autoAlpha:0,filter:()=>`blur(${innerWidth/(innerWidth<=600?375:1440)*10}px)`},{autoAlpha:1,filter:'blur(0px)',stagger:.04,duration:.2,ease:'none'});

/* Hierarquia de transforms do HomeStories: story=rotação do mouse,
   position=estado 3D, inner=translação do mouse, parallax=scroll y. */
const stage=root.querySelector('.s06-stage'),stories=[...root.querySelectorAll('.s06-story')],pos=[...root.querySelectorAll('.s06-position')],inners=[...root.querySelectorAll('.s06-inner')],para=[...root.querySelectorAll('.s06-parallax')],meta=[...root.querySelectorAll('.s06-meta')];

let active=0,locked=false,target=[0,0,0,0],cur=[0,0,0,0];

const splitStoryWords=()=>{
  root.querySelectorAll(".s06-paragraph-m").forEach(p=>{
    if(p.dataset.split==="1") return;
    const ws=p.textContent.trim().split(/\s+/);
    p.innerHTML=ws.map(w=>`<span class="s06-word">${w}</span>`).join(" ");
    p.dataset.split="1";
  });
};
splitStoryWords();
// duração de cada história (s) = palavras / 3 por segundo
const STORY_R=stories.map(s=>s.querySelectorAll('.s06-word').length/WORDS_PER_SECOND);

const amaCursor=document.getElementById("amaCursor");
const amaInner=document.getElementById("amaCursorInner");
const amaOutline=document.getElementById("amaCursorOutline");
const amaProgress=document.getElementById("amaCursorProgress");
let amaMouse=[innerWidth/2,innerHeight/2];
let amaFast=[0,0], amaSlow=[0,0];

let storyDelay=null;      // original "a": 1s de pré-roll, depois reaproveitado pro avanço automático
let storyWordsTween=null; // original "y"
let storyEntered=false;   // original "S"

// Estado inicial do cursor: escondido até o mouse entrar nos cards.
if(amaCursor) gsap.set(amaCursor,{autoAlpha:0});
const cursorResetRing=()=>{
  if(!amaProgress) return;
  gsap.killTweensOf(amaProgress);
  if(window.DrawSVGPlugin) gsap.set(amaProgress,{drawSVG:"0%"});
  if(amaOutline) gsap.to(amaOutline.firstElementChild,{scale:.55});
};
const cursorDot=()=>{ amaCursor && amaCursor.classList.remove("is-arrow","is-label"); };
const cursorArrow=()=>{ amaCursor && amaCursor.classList.add("is-arrow"); };
const cursorEnter=e=>{
  if(!amaCursor) return;
  const mode=e.currentTarget.getAttribute("data-cursor");
  gsap.to(amaCursor,{autoAlpha:1});
  if(mode==="scale"||mode==="arrow") gsap.to(amaOutline.firstElementChild,{scale:1});
  if(mode==="hide") gsap.to(amaCursor,{autoAlpha:0});
  if(mode==="arrow") cursorArrow();
};
const cursorLeave=()=>{
  if(!amaCursor) return;
  cursorDot();
  cursorResetRing();
  gsap.to(amaCursor,{autoAlpha:0});
};

/* Cursor T(L,A,H) recuperado do original. */
const cursorProgress=(L=0,A=0,H=0)=>{
  if(!amaProgress || !window.DrawSVGPlugin) return;
  gsap.killTweensOf(amaProgress);
  if(A) gsap.set(amaProgress,{drawSVG:`${A}% live`});
  if(L){
    gsap.killTweensOf(amaProgress);
    gsap.set(amaProgress,{drawSVG:"0%"});
    gsap.fromTo(amaProgress,{drawSVG:"0%"},{
      keyframes:[
        {drawSVG:"0% 100% live",ease:"none",duration:Math.max(.1,L-.2)},
        {drawSVG:"100% 100% live",ease:"power3.out"}
      ]
    });
  }
  if(H){
    gsap.killTweensOf(amaProgress);
    gsap.to(amaProgress,{drawSVG:"0% live",ease:"power3.out"});
  }
};

/* Original M(), sem áudio. */
const fadeCurrentStory=()=>{
  const ws=[...pos[active].querySelectorAll(".s06-word")];
  gsap.killTweensOf(ws);
  gsap.to(ws,{autoAlpha:.4});
  gsap.to(meta[active],{autoAlpha:0});
};

/* Original q(), sem áudio. R começa DEPOIS do delayedCall de 1 s. */
const startOriginalSequence=()=>{
  const ws=[...pos[active].querySelectorAll(".s06-word")];
  const R=STORY_R[active];
  const O=R/ws.length;

  storyDelay?.kill();
  storyDelay=gsap.delayedCall(1,()=>{
    storyDelay=gsap.delayedCall(R,advanceStory);
    cursorProgress(R,0,0);

    storyWordsTween?.kill();
    storyWordsTween=gsap.fromTo(ws,{autoAlpha:.4},{
      autoAlpha:1,
      duration:3,
      stagger:O
    });
    gsap.to(meta[active],{delay:.5,autoAlpha:1});
  });
};

/* Original C(), sem woosh/áudio. */
const advanceStory=()=>{
  if(locked) return;
  storyDelay?.kill();
  locked=true;
  fadeCurrentStory();
  active=(active+1)%stories.length;
  startOriginalSequence();
  layout(1.5);
};

/* Original ae(): leave/leaveBack cancela o tempo atual e reseta o cursor. */
const leaveOriginalSequence=()=>{
  storyDelay?.kill();
  storyWordsTween?.kill();
  cursorProgress(0,0,1);
  const ws=[...pos[active].querySelectorAll(".s06-word")];
  gsap.set(ws,{autoAlpha:1});
};

/* Original _e(): só inicia no primeiro onEnter do ScrollTrigger. */
const enterOriginalSequence=()=>{
  if(!storyEntered){
    storyEntered=true;
    startOriginalSequence();
  }
};

addEventListener("mousemove",e=>{ amaMouse=[e.clientX,e.clientY]; },{passive:true});

document.querySelectorAll("[data-cursor]").forEach(el=>{
  if(!root.contains(el)) return;
  el.addEventListener("mouseenter",cursorEnter);
  el.addEventListener("mouseleave",cursorLeave);
});

function layout(d=0){
  const mobile=innerWidth<=600,scale=innerWidth/(mobile?375:1440),N=stories.length;
  pos.forEach((el,i)=>{
    let p;
    if(i===active)p={a:1,x:mobile?0:-190,y:mobile?100:0,z:0,b:0};
    else if(i===(active-1+N)%N)p={a:0,x:-600,y:0,z:500,b:5};
    else if(i===(active+1)%N)p={a:.5,x:mobile?190:530,y:mobile?-200:0,z:-500,b:2};
    else if(i===(active+2)%N)p={a:.2,x:mobile?510:450,y:mobile?-650:-450,z:-1000,b:5};
    else p={a:0,x:mobile?1000:100,y:mobile?-1500:-1000,z:-1500,b:5};
    const v={autoAlpha:p.a,x:p.x*scale,y:p.y*scale,z:p.z*scale,filter:`blur(${p.b*scale}px)`};
    d?gsap.to(el,{...v,duration:d,ease:'power3.inOut',onComplete:i===active?()=>{locked=false}:undefined}):gsap.set(el,v);
  });
  meta.forEach((e,i)=>gsap.set(e,{autoAlpha:i===active?1:0,visibility:i===active?'visible':'hidden'}));
}
layout(0);
stage.addEventListener('click',advanceStory);
ScrollTrigger.create({
  ease:"none",
  start:"top bottom",
  end:"bottom top",
  trigger:stage,
  onEnter:enterOriginalSequence,
  onLeave:leaveOriginalSequence,
  onLeaveBack:leaveOriginalSequence
});
if(!reduceMotion){
  addEventListener('mousemove',e=>{
    if(innerWidth<=600)return;
    const R=innerWidth/1440*10;
    target=[(e.clientX/innerWidth*2-1)*R,(e.clientY/innerHeight*2-1)*R,e.clientY/innerHeight*20-10,e.clientX/innerWidth*20-10];
  },{passive:true});
}

let parallaxTween;
function setupParallax(){
  parallaxTween?.kill();
  const mobile=innerWidth<=600,scale=innerWidth/(mobile?375:1440),dist=scale*(mobile?100:250);
  parallaxTween=gsap.timeline({paused:true,scrollTrigger:{scrub:true,start:'top bottom',end:'bottom top',trigger:stage},defaults:{ease:'none'}})
    .fromTo(para,{y:dist},{y:-dist});
}
setupParallax();

/* Loop único (cursor + inclinação 3D) — só roda com os cards na tela e a
   aba visível (o original rodava sempre, mesmo fora da tela). */
let looping=false,inView=false;
function tick(){
  if(!looping) return;
  amaFast=[amaFast[0]+(amaMouse[0]-amaFast[0])*.3,amaFast[1]+(amaMouse[1]-amaFast[1])*.3];
  amaSlow=[amaSlow[0]+(amaMouse[0]-amaSlow[0])*.1,amaSlow[1]+(amaMouse[1]-amaSlow[1])*.1];
  if(amaInner) amaInner.style.transform=`translate3d(${amaFast[0]}px, ${amaFast[1]}px, 0)`;
  if(amaOutline) amaOutline.style.transform=`translate3d(${amaSlow[0]}px, ${amaSlow[1]}px, 0)`;
  for(let i=0;i<4;i++)cur[i]+=(target[i]-cur[i])*.05;
  stories.forEach(e=>e.style.transform=`rotateX(${-cur[2]}deg) rotateY(${cur[3]}deg)`);
  inners.forEach(e=>e.style.transform=`translate(${cur[0]}px, ${cur[1]}px)`);
  requestAnimationFrame(tick);
}
function updateLoop(){
  const want=inView && !document.hidden;
  if(want && !looping){ looping=true; requestAnimationFrame(tick); }
  else if(!want){ looping=false; }
}
if("IntersectionObserver" in window){
  new IntersectionObserver(es=>{ inView=es[0].isIntersecting; updateLoop(); }).observe(stage);
}else{ inView=true; updateLoop(); }
document.addEventListener("visibilitychange",updateLoop);

addEventListener('resize',()=>{setupParallax();layout(0);ScrollTrigger.refresh()},{passive:true});
if(document.fonts?.ready)document.fonts.ready.then(()=>{ScrollTrigger.refresh()});

/* MENU "Avaliações": o rótulo "06 — AVALIAÇÕES" fica a 5vh do topo da seção; o salto nativo da âncora para
   78px depois (scroll-padding-top do html) e o rótulo caía em 123px. Aqui a página para com o topo da seção
   encostado no topo da tela, e o rótulo fica a 5vh — a MESMA altura dos rótulos 02, 03, 04 e 05. Só no
   desktop; no celular vale a âncora nativa. */
function irParaAvaliacoes(){
  const sec = document.getElementById('confianca');
  if(!sec || innerWidth <= 700) return false;
  window.scrollTo({top: sec.getBoundingClientRect().top + scrollY, behavior:'auto'});
  return true;
}
document.querySelectorAll('.main-nav a[href="#confianca"]').forEach(a=>a.addEventListener('click',e=>{
  if(irParaAvaliacoes()){ e.preventDefault(); history.replaceState(null,'','#confianca'); }
}));
if(location.hash === '#confianca'){ setTimeout(irParaAvaliacoes,0); setTimeout(irParaAvaliacoes,600); }
})();
