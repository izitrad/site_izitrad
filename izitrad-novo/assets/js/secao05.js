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
    heading: "O quântico\nnatureza do\npensamento",
    label: "NOSSA MENTE, UM MUNDO QUÂNTICO",
    paragraph: "Estamos investindo a longo prazo em pesquisa e hardware de computação quântica para formar o ápice do nosso foco. Acreditamos que, embora o cérebro em si possa não ser quântico por natureza, seus comportamentos codificados frequentemente exibem padrões incrivelmente adequados para a modelagem quântica, permitindo-nos lidar com complexidades comportamentais em ordens de magnitude muito maiores do que os formalismos atuais."
  },
  {
    heading: "Entendimento\nordem da\nnatureza",
    label: "BELEZA NA ENTROPIA DA NATUREZA",
    paragraph: "Exploramos como pequenas mudanças nos processos mentais podem levar a transformações significativas no comportamento. Nosso trabalho se concentra em desvendar padrões emergentes na tomada de decisões, na regulação emocional e nas interações sociais. Ao expandir os limites da compreensão nessas áreas, buscamos desenvolver tecnologias transformadoras que aprimorem o potencial humano, tanto individual quanto coletivo."
  },
  {
    heading: "Sabedoria\nhumana,\npersonalizado",
    label: "MELHORES PRÁTICAS CLÍNICAS APLICADAS",
    paragraph: "Complementamos de forma intrincada nossa abordagem ao uso de tecnologias de ponta com insights profundos, impulsionados pelos melhores psicólogos, psiquiatras e neurocientistas do mundo, garantindo que nossa pesquisa esteja fundamentada em práticas éticas seguras, empíricas e aplicadas, visando uma experiência humana verdadeiramente acolhedora."
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
}
function openPanel(index){
  if(activePanel >= 0) return;
  activePanel = index;
  setPanelContent(index);
  techPanel.classList.add('is-open');
  techPanel.setAttribute('aria-hidden','false');
  document.body.classList.add('panel-lock');

  gsap.killTweensOf([panelSurface,panelInner,panelBackdrop,panelClose,technologiesWrapper]);
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
}
function closePanel(){
  if(activePanel < 0) return;
  gsap.killTweensOf([panelSurface,panelInner,panelBackdrop,panelClose,technologiesWrapper]);
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

})();
