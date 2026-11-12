/* ===== SEÇÃO 05 — DESTINO (transporte literal do componente aprovado) =====
   Fonte: _izi-GPT/seção 5/seção 05 - aprovada.html. NÃO redesenhar/recalibrar
   sem reler esse arquivo primeiro — nenhuma linha de lógica/valor foi mudada
   aqui, só o ENCAIXE: no arquivo original esse era o único script da página,
   declarando `section`, `heading`, `rt` etc. soltos no topo; secao04.js JÁ
   declara `const section`/`const heading`/`let rt` no topo dele — como os
   dois são scripts comuns (não módulos), duas declarações iguais no mesmo
   escopo travam a página inteira com SyntaxError. Isolado com uma IIFE
   (function(){...})() envolvendo TODO o script original, sem tocar em
   nenhuma linha de dentro. Removido só o listener do #debugBtn (o botão de
   debug em si não foi transportado — decisão tomada com a usuária). */
(function(){
"use strict";
gsap.registerPlugin(ScrollTrigger, MotionPathPlugin);
const section=document.querySelector('.technologies');
const wrapper=document.querySelector('#wrapper');
const first=document.querySelector('.technology:first-child');
const heading=document.querySelector('#mainHeading');
let tl, headingTl;

function prepareHeadingWords(){
  [...heading.children].forEach(line=>{
    const words=line.textContent.trim().split(/\s+/);
    line.innerHTML=words.map(w=>`<span class="word">${w}</span>`).join(' ');
  });
}
prepareHeadingWords();

function buildHeading(){
  if(headingTl){headingTl.scrollTrigger?.kill();headingTl.kill();headingTl=null;}
  const words=heading.querySelectorAll('.word');
  gsap.set(words,{autoAlpha:0});
  const refWidth=innerWidth<=600?375:1440;
  headingTl=gsap.timeline({
    paused:true,
    scrollTrigger:{
      scrub:true,
      start:'top bottom',
      end:`=-${innerHeight/2}`,
      trigger:heading
    }
  }).fromTo(words,
    {autoAlpha:0,filter:`blur(${innerWidth/refWidth*10}px)`},
    {autoAlpha:1,filter:'blur(0px)',stagger:.04,duration:.2,ease:'none'}
  );
}

function build(){
  if(tl){tl.scrollTrigger?.kill();tl.kill();tl=null;}
  gsap.set(first,{clearProps:'all'});gsap.set(first.firstElementChild,{clearProps:'transform'});wrapper.classList.remove('is-scrolling');
  if(innerWidth<=600)return;
  const blur=innerWidth/1440*50;
  tl=gsap.timeline({paused:true,scrollTrigger:{scrub:true,start:'top bottom',end:`bottom =+${innerHeight*1.3}`,trigger:section,onUpdate:self=>{if(self.progress>0&&self.progress<1)wrapper.classList.add('is-scrolling');else wrapper.classList.remove('is-scrolling')}},defaults:{duration:1,ease:'none'}})
    .to(first,{motionPath:{path:'#motionPath',align:'#motionPath',start:1,end:0,alignOrigin:[.5,.5],autoRotate:false},ease:'none'},0)
    .fromTo(first,{opacity:0,filter:`blur(${blur}px)`},{opacity:1,filter:'blur(0px)',duration:.4,ease:'none'},0)
    .fromTo(first.firstElementChild,{rotate:450,scale:.3},{rotate:0,scale:1,ease:'none'},0);
}
buildHeading();
build();

// Entrada do rótulo "05 — CONFIANÇA" — fade+subida (opacity:0→1, y:70px→0)
// + giro de letras, mas em TEMPO REAL (toca uma vez, ~1s, quando o rótulo
// entra na tela) em vez de preso 1:1 ao scroll: com scrub, a frase só
// assentava se a usuária rolasse a janela inteira (~1350px) sem parar —
// parando no meio (ou rolando rápido demais) o texto ficava sempre
// embaralhado, nunca "chegava". addRollingTween (site.js) é a variante em
// tempo real que o site já tinha pronta (usada antes do rótulo "02" virar
// sincronizada com scroll) — cada letra com sua própria duração/atraso
// (~0.5-0.85s, stagger .045s entre elas), sem precisar de scrub aqui porque
// não tem o problema de "pausar no meio do scroll" que a versão sincronizada
// resolve. ScrollTrigger sem scrub = toca uma vez ao entrar (toggleActions
// padrão "play none none none"), não repete ao rolar de novo.
function buildKicker(){
  const kickerEl = document.querySelector('.tech-kicker');
  if(!kickerEl) return;
  // x:0 explícito — sem isso, o GSAP lia o "translate(-50%,70px)" já presente
  // no CSS na PRIMEIRA vez que tocava a transform do elemento, guardava esse
  // -50% como um x FIXO (px), e o xPercent:-50 abaixo somava OUTRO -50% em
  // cima — juntos, centralizavam duas vezes (rótulo saía ~78px pra esquerda
  // do centro certo, medido). Dizendo x:0 explicitamente, não sobra nenhum
  // deslocamento herdado do CSS pro GSAP somar em cima.
  gsap.set(kickerEl, {x:0, xPercent:-50, y:70});

  const kickerTl = gsap.timeline({
    scrollTrigger:{trigger:kickerEl, start:'top 85%', toggleActions:'play none none reverse'}
  });
  kickerTl.to(kickerEl, {opacity:1, y:0, duration:.6, ease:'power2.out'}, 0);

  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(reduceMotion || !window.buildRollingLabel || !window.addRollingTween) return;
  const reels = buildRollingLabel(kickerEl);
  gsap.set(reels.map(r=>r.char), {scale:1.22, filter:'blur(3px)'});
  addRollingTween(kickerTl, reels, .1);
}
buildKicker();

let rt;addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(()=>{buildHeading();build();ScrollTrigger.refresh()},120)});

// === Panels: reconstructed from the original Panel component + visual references ===
const panelItems = [
  {
    heading: "Aproximar pessoas\ne negócios de\nnovos destinos",
    label: "NOSSA MISSÃO",
    paragraph: "Tornar simples, seguro e acessível o processo de tradução e apostilamento para quem viaja, estuda, trabalha ou reconstrói a vida em outro país, e para empresas que levam seus negócios ao exterior. Por isso, todo o atendimento acontece no ambiente digital, do orçamento à entrega, permitindo que o cliente resolva tudo de onde estiver."
  },
  {
    heading: "Clareza\ncomo padrão",
    label: "NOSSA VISÃO",
    paragraph: "Ser referência em tradução e apostilamento digital para quem leva seus documentos ao exterior, reconhecida pela capacidade de transformar exigências complexas em processos claros, com valores transparentes e uma linguagem simples e direta em cada etapa."
  },
  {
    heading: "Pessoas antes\nde protocolos",
    label: "NOSSOS VALORES",
    paragraph: "Transparência, para que o cliente conheça cada valor e cada etapa antes de decidir. Rigor, porque cada documento carrega um plano importante, seja uma viagem ou um novo começo. Proximidade, com uma equipe que acompanha cada pedido do início ao fim e está pronta para realizar os ajustes necessários."
  }
];

const techPanel = document.querySelector('#techPanel');
const panelSurface = document.querySelector('#panelSurface');
const panelInner = document.querySelector('#panelInner');
const panelBackdrop = document.querySelector('#panelBackdrop');
const panelClose = document.querySelector('#panelClose');
const panelHeading = document.querySelector('#panelHeading');
const panelLabel = document.querySelector('#panelLabel');
const panelParagraph = document.querySelector('#panelParagraph');
const technologiesWrapper = document.querySelector('.technologies .wrapper') || document.querySelector('.wrapper');
const navMenuToggle = document.querySelector('[data-nav-toggle]');
let panelTimeline = null;
let activePanel = -1;

function panelWidth(){
  return panelSurface.getBoundingClientRect().width;
}
function setPanelContent(index){
  const data = panelItems[index];
  panelHeading.innerHTML = data.heading.split('\n').map(x=>`<div>${x}</div>`).join('');
  panelLabel.textContent = data.label;
  panelParagraph.textContent = data.paragraph;
  // CSS usa isso pra pintar o triângulo do "FECHAR" na cor do botão aberto
  techPanel.setAttribute('data-panel', index);
}
function openPanel(index){
  if(activePanel >= 0) return;
  activePanel = index;
  setPanelContent(index);
  techPanel.classList.add('is-open');
  techPanel.setAttribute('aria-hidden','false');
  document.body.classList.add('panel-lock');

  gsap.killTweensOf([panelSurface,panelInner,panelBackdrop,panelClose,technologiesWrapper,navMenuToggle]);
  gsap.set(panelSurface,{x:0,xPercent:100});
  gsap.set(panelInner,{x:0,xPercent:-50});
  gsap.set(panelBackdrop,{autoAlpha:0});
  gsap.set(panelClose,{autoAlpha:0});

  panelTimeline = gsap.timeline({defaults:{duration:.7,ease:'power3.out'}});
  // Original HomeTechnologies wrapper shift: 233px at 1440 reference width.
  if(technologiesWrapper && innerWidth > 600){
    panelTimeline.to(technologiesWrapper,{x:-(innerWidth/1440*233)},0);
  }
  // Original Panel mechanics.
  panelTimeline.to(panelSurface,{xPercent:0},0)
    .to(panelInner,{xPercent:0},0)
    .to(panelBackdrop,{autoAlpha:1},0)
    .to(panelClose,{autoAlpha:1},.5);
  // Menu hamburguer soma com o "FECHAR" no canto superior direito — some
  // enquanto o painel tá aberto pra não disputar espaço (pedido da usuária).
  // Bem rápido de propósito (.15s) — precisa sumir quase instantâneo no
  // início da abertura, não arrastar junto com o resto (que usa .7s).
  if(navMenuToggle) panelTimeline.to(navMenuToggle,{autoAlpha:0,duration:.15,ease:'power1.out'},0);
}
function closePanel(){
  if(activePanel < 0) return;
  gsap.killTweensOf([panelSurface,panelInner,panelBackdrop,panelClose,technologiesWrapper,navMenuToggle]);
  const tl = gsap.timeline({
    defaults:{duration:.7,ease:'power3.inOut'},
    onComplete:()=>{
      techPanel.classList.remove('is-open');
      techPanel.setAttribute('aria-hidden','true');
      document.body.classList.remove('panel-lock');
      activePanel=-1;
    }
  });
  if(technologiesWrapper && innerWidth > 600) tl.to(technologiesWrapper,{x:0},0);
  tl.to(panelClose,{autoAlpha:0},0)
    .to(panelInner,{xPercent:-50},0)
    .to(panelSurface,{xPercent:100},0)
    .to(panelBackdrop,{autoAlpha:0},0);
  // Só volta quando a caixa branca já saiu quase toda da tela (perto do
  // fim dos .7s do fechamento), não no início.
  if(navMenuToggle) tl.to(navMenuToggle,{autoAlpha:1,duration:.15,ease:'power1.out'},.55);
}
document.querySelectorAll('.technology').forEach((el,index)=>{
  el.addEventListener('click',(ev)=>{
    ev.preventDefault();
    openPanel(index);
  });
});
panelClose.addEventListener('click',closePanel);
panelBackdrop.addEventListener('click',closePanel);
document.addEventListener('keydown',e=>{ if(e.key==='Escape') closePanel(); });

/* MENU "Confiança": o rótulo "05 — CONFIANÇA" fica a 5vh do topo DA SEÇÃO (position:absolute; top:5vh). O
   salto nativo da âncora para 78px depois (scroll-padding-top do html), então o rótulo caía em 123px, e o
   salto anterior desta função (0.2 altura de tela) o deixava FORA da tela. Agora a página para com o topo
   da seção encostado no topo da tela: o rótulo fica a 5vh, a MESMA altura dos rótulos 02, 03, 04 e 06.
   Vale também no celular (antes lá valia a âncora nativa: o rótulo caía ~78px abaixo do triângulo do menu). */
function irParaConfianca(){
  const sec = document.getElementById('destino');
  if(!sec) return false;
  window.scrollTo({top: sec.getBoundingClientRect().top + scrollY, behavior:'auto'});
  return true;
}
document.querySelectorAll('.main-nav a[href="#destino"]').forEach(a=>a.addEventListener('click',e=>{
  if(irParaConfianca()){ e.preventDefault(); history.replaceState(null,'','#destino'); }
}));
if(location.hash === '#destino'){ setTimeout(irParaConfianca,0); setTimeout(irParaConfianca,600); }

})();
