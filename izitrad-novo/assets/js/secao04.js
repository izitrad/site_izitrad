/* ===========================================================================
   SEÇÃO 04 — "SEÇÃO 04 - APROVADO" (fonte: _izi-GPT/seção 4/seção 04 - aprovado.html)
   Transporte literal dos 4 blocos <script> do arquivo aprovado, concatenados
   nesta mesma ordem. Nenhuma lógica foi alterada. Requer gsap/ScrollTrigger/
   CustomEase/DrawSVGPlugin já carregados (gsap.registerPlugin é idempotente,
   seguro chamar de novo aqui mesmo já tendo sido chamado em site.js).
   =========================================================================== */

gsap.registerPlugin(ScrollTrigger, DrawSVGPlugin);

const section = document.querySelector("#guiding");
const number = document.querySelector("#number");
const principles = document.querySelector("#principles");
const principleEls = gsap.utils.toArray(".principle");
const dividerPath = document.querySelector("#divider path");
const heading = document.querySelector(".guiding-principles .heading");

let desktopAnimations = [];
let drawTween;
let headingWords = [];
let dotTweens = [];

/* GlobalTitle original behavior:
   each turquoise dot blinks forever, with a fresh-looking random pause
   between 2 and 6 seconds; timeline itself is yoyo. */
function setupTitleDots(){
  dotTweens.forEach(t => t.kill());
  dotTweens = [];
  document.querySelectorAll(".principle .dot").forEach(dot => {
    const repeatDelay = gsap.utils.random(2,6,1);
    const tl = gsap.timeline({
      repeatDelay,
      repeat:-1,
      yoyo:true,
      defaults:{ease:"none"}
    });
    tl.to(dot,{autoAlpha:0}).to(dot,{autoAlpha:1});
    dotTweens.push(tl);
  });
}

function cleanupDesktop(){
  if(drawTween) drawTween.kill();
  desktopAnimations.forEach(a => {
    if(a && a.scrollTrigger) a.scrollTrigger.kill();
    if(a && a.kill) a.kill();
  });
  desktopAnimations = [];
  if(headingWords.length){
    heading.innerHTML = '<div>Guiding</div><div>Principles</div>';
    headingWords = [];
  }
}

function setupDesktop(){
  cleanupDesktop();
  if(innerWidth <= 600) return;

  const viewportH = innerHeight;
  const viewportW = innerWidth;
  const scaleBase = 1440;

  /* GlobalHeading — mechanics recovered from Amaterasu's actual bundle.
     Original component:
       SplitText(type:"words")
       autoAlpha: 0 -> 1
       blur: (viewportWidth / 1440 * 10px) -> 0
       stagger: .04
       duration: .2
       ease: none
       scrub: true
       start: "top bottom"

     The live site uses a custom scroller/scrollerProxy. In this standalone
     normal-scroll reference, "top center" is the equivalent 1/2-viewport
     progression distance, so the visual interpolation remains inspectable. */
  heading.innerHTML =
    '<div><span class="heading-word">Guiding</span></div>' +
    '<div><span class="heading-word">Principles</span></div>';

  headingWords = gsap.utils.toArray(".heading-word", heading);
  gsap.set(headingWords,{
    display:"inline-block",
    autoAlpha:0,
    filter:`blur(${viewportW/scaleBase*10}px)`
  });

  const headingTween = gsap.timeline({
    paused:true,
    scrollTrigger:{
      scrub:true,
      start:"top bottom",
      end:"top center",
      trigger:heading
    }
  }).fromTo(
    headingWords,
    {
      autoAlpha:0,
      filter:`blur(${viewportW/scaleBase*10}px)`
    },
    {
      autoAlpha:1,
      filter:"blur(0px)",
      stagger:.04,
      duration:.2,
      ease:"none"
    }
  );

  desktopAnimations.push(headingTween);

  /* Exact HomeGuidingPrinciples reveal.
     Important: it animates G.children, therefore BOTH GlobalTitle and
     paragraph-s enter in sequence with the .2 stagger. */
  principleEls.forEach(principle => {
    const tween = gsap.fromTo(
      principle.children,
      {
        y: viewportW/scaleBase*50,
        autoAlpha:0,
        filter:`blur(${viewportW/scaleBase*5}px)`
      },
      {
        y:0,
        duration:2,
        stagger:.2,
        autoAlpha:1,
        filter:"blur(0px)",
        clearProps:"filter",
        ease:"power3.out",
        scrollTrigger:{
          start:()=>`-=${viewportH*.8}`,
          trigger:principle,
          toggleActions:"play reverse play reverse"
        }
      }
    );
    desktopAnimations.push(tween);
  });

  /* Exact number scrub. */
  const numberTween = gsap.fromTo(
    number,
    {y:0},
    {
      y:principles.clientHeight-number.clientHeight,
      ease:"power1.inOut",
      scrollTrigger:{
        scrub:true,
        start:"top top",
        end:"bottom center",
        trigger:section
      }
    }
  );
  desktopAnimations.push(numberTween);

  /* Exact divider loop from HomeGuidingPrinciples. */
  drawTween = gsap.timeline({paused:false,repeat:-1});
  drawTween.fromTo(
    dividerPath,
    {drawSVG:"100% 150%"},
    {drawSVG:"0% 50%",duration:5,ease:"none"}
  );
}

setupTitleDots();

document.fonts.ready.then(()=>{
  setupDesktop();
  ScrollTrigger.refresh();
});

let rt;
addEventListener("resize",()=>{
  clearTimeout(rt);
  rt=setTimeout(()=>{
    setupDesktop();
    ScrollTrigger.refresh();
  },150);
});

/* SIMPLES — ajuste geométrico: 10px VISUAIS em cada borda */
(function(){
  const TARGET_MARGIN = 10;
  const TEXT = "SIMPLES";

  function fitSimples(){
    const line = document.getElementById("iziPre04SimpleLine");
    const title = line && line.closest(".izi-pre04-simple-title");
    if(!line || !title) return;

    const family = '"Big Shoulders Display"';
    const weight = 900;
    const probeSize = 1000;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    ctx.font = weight + " " + probeSize + "px " + family;

    const m = ctx.measureText(TEXT);
    const inkWidthAtProbe = m.actualBoundingBoxLeft + m.actualBoundingBoxRight;
    if(!inkWidthAtProbe) return;

    const targetInkWidth = window.innerWidth - (TARGET_MARGIN * 2);
    const fittedSize = targetInkWidth * probeSize / inkWidthAtProbe;

    /* Só a dimensão da palavra é recalculada. */
    title.style.fontSize = fittedSize + "px";

    /* Corrige apenas os side-bearings da fonte para os pixels visíveis
       terminarem em 10px de cada lado. Não toca no transform animado. */
    ctx.font = weight + " " + fittedSize + "px " + family;
    const fm = ctx.measureText(TEXT);
    const advance = fm.width;
    const inkLeftFromBox = fm.actualBoundingBoxLeft;
    const inkWidth = fm.actualBoundingBoxLeft + fm.actualBoundingBoxRight;

    const desiredInkLeft = TARGET_MARGIN + 9; /* calibração óptica pela captura: +9px */
    const centeredBoxLeft = (window.innerWidth - advance) / 2;
    const currentInkLeft = centeredBoxLeft + (advance - fm.actualBoundingBoxRight);
    const correction = desiredInkLeft - currentInkLeft;

    title.style.position = "relative";
    title.style.left = correction + "px";
  }

  document.fonts.load('900 100px "Big Shoulders Display"').then(function(){
    fitSimples();
    if(window.ScrollTrigger) ScrollTrigger.refresh();
  });

  let fitTimer;
  window.addEventListener("resize", function(){
    clearTimeout(fitTimer);
    fitTimer = setTimeout(function(){
      fitSimples();
      if(window.ScrollTrigger) ScrollTrigger.refresh();
    }, 120);
  });
})();

/* ===== PRELÚDIO 04 — mecânica preservada do conceito enviado ===== */
(function(){
  if(!window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);

  gsap.set("#iziPre04Kicker",{xPercent:-50});

  gsap.to("#iziPre04Kicker",{
    opacity:1,y:0,ease:"none",
    scrollTrigger:{trigger:"#iziPre04Intro",start:"top 72%",end:"top 48%",scrub:true}
  });

  gsap.to("#iziPre04Question",{
    opacity:1,y:0,ease:"none",
    scrollTrigger:{trigger:"#iziPre04Intro",start:"top 58%",end:"top 22%",scrub:true}
  });

  gsap.to(["#iziPre04Question","#iziPre04Kicker"],{
    opacity:0,y:-35,ease:"none",
    scrollTrigger:{trigger:"#iziPre04Intro",start:"55% top",end:"bottom top",scrub:true}
  });

  const line=document.querySelector("#iziPre04SimpleLine");
  if(line){
    gsap.set(line,{transformOrigin:"0 0",scaleX:1,scaleY:0});
    const lineHeight=line.offsetHeight;
    const FINAL_STRETCH=1.45;
    gsap.to(line,{
      scaleY:FINAL_STRETCH,scaleX:1,ease:"none",
      scrollTrigger:{
        trigger:line,
        start:"top bottom",
        end:`top bottom-=${lineHeight * FINAL_STRETCH}px`,
        scrub:true
      }
    });
  }
})();
