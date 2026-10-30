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

/* Texto do título ("E por trás do simples?") — em DOIS lugares porque o
   setupDesktop() reescreve o heading em palavras (cada uma vira um
   .heading-word animado) e o cleanupDesktop() devolve ao HTML original.
   Se o texto mudar, mudar aqui E no HTML (h2.heading em index.html). */
const HEADING_HTML = '<div>E por trás</div><div>do <strong>simples</strong>?</div>';
const HEADING_WORDS_HTML =
  '<div><span class="heading-word">E</span> <span class="heading-word">por</span> <span class="heading-word">trás</span></div>' +
  '<div><span class="heading-word">do</span> <span class="heading-word"><strong>simples</strong>?</span></div>';

function cleanupDesktop(){
  if(drawTween) drawTween.kill();
  desktopAnimations.forEach(a => {
    if(a && a.scrollTrigger) a.scrollTrigger.kill();
    if(a && a.kill) a.kill();
  });
  desktopAnimations = [];
  if(headingWords.length){
    heading.innerHTML = HEADING_HTML;
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
  heading.innerHTML = HEADING_WORDS_HTML;

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
          /* "top 80%" = mesmo ponto que o antigo `-=${viewportH*.8}`, mas sem
             depender da posição de scroll no momento do refresh (o "-=" fazia
             o start deslocar quando a página recalculava já rolada). */
          start:"top 80%",
          trigger:principle,
          toggleActions:"play reverse play reverse"
        }
      }
    );
    desktopAnimations.push(tween);
  });

  /* Number scrub. Mesma lógica da referência (y de 0 até alturaDosPrincípios
     − alturaDoNúmero, start "top top", end "bottom center"), com uma
     diferença consciente na CURVA: a referência usa power1.inOut, cujo ponto
     mais lento (meio da seção) tem velocidade 2·Y/D (Y = deslocamento, D =
     distância de rolagem). Com o "6" deles (636px de altura) isso dá ~0,82
     — o número sobe devagar. A nossa logo é baixa (~323px), Y fica maior e a
     velocidade passa de 1: a logo ficava parada. Aqui a curva mistura linear
     e power1.inOut (mix = a·p + (1−a)·inOut(p)); a velocidade no meio é
     (Y/D)·(2−a), então "a" é escolhido pra dar ~0,82 no meio, mantendo o
     deslocamento final Y original (a logo termina no mesmo ponto).
     Voltar ao original: ease:"power1.inOut" e sem a conta de "a". */
  /* EXIT_RISE: a logo termina mais alta que "alturaDosPrincípios − alturaDaLogo"
     (que a deixava com a base ~.17·altura-da-tela ainda visível no fim, saindo
     só junto com a página e parecendo arrastada). Tirar .17·altura-da-tela do
     deslocamento a faz sair da tela por cima até o fim da seção. */
  const EXIT_RISE = .10;
  const numberY = principles.clientHeight-number.clientHeight-viewportH*EXIT_RISE;
  const scrollDist = Math.max(1, section.offsetHeight-viewportH/2);
  /* NUMBER_MID_SPEED: velocidade do deslocamento (y) no meio da seção, em
     fração da rolagem — a logo sobe (1 − isso) da velocidade do texto. A
     referência tem ~0,82 (o "6" sobe a 18% do texto), mas na nossa, com uma
     logo baixa, isso deixava os parágrafos passando rápido demais por ela.
     0,5 ≈ curva linear (a logo sobe à metade da velocidade do texto). */
  const NUMBER_MID_SPEED = .5;
  const mixA = Math.min(1, Math.max(0, 2-NUMBER_MID_SPEED*scrollDist/Math.max(1,numberY)));
  const numberEase = p => mixA*p + (1-mixA)*(p<.5 ? 2*p*p : 1-2*(1-p)*(1-p));
  const numberTween = gsap.fromTo(
    number,
    {y:0},
    {
      y:numberY,
      ease:numberEase,
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
  /* Segmento que percorre a linha: 50% do comprimento no original (clarão
     largo). No fundo preto (padrão) vira um segmento curto de 20% — a
     "faísca" que corre (a mesma proporção que a referência usa na linha do
     hero: "100% 120%" → "0% 20%"), na mesma velocidade (percorre 100% em 5 s). */
  // (preto é o padrão; ?fundo=claro volta ao fundo claro de antes)
  const darkBg = new URLSearchParams(location.search).get("fundo") !== "claro";
  drawTween.fromTo(
    dividerPath,
    {drawSVG:darkBg ? "100% 120%" : "100% 150%"},
    {drawSVG:darkBg ? "0% 20%" : "0% 50%",duration:5,ease:"none"}
  );
}

/* Letras da logo do hero (i z i T r a d) pra reaproveitar na faixa "o jeito izi" e nos
   parágrafos. Logo NOVA: cada letra é um <g> (forma + anel do contorno de 5pt, 2 <path>) dentro
   de um <g transform>; devolvo os 7 <g> e o transform. Logo ANTIGA (?logo=antiga): 7 <path>
   soltos, sem transform. Sem o SVG do hero devolve null. */
function getHeroLetters(){
  const hero = document.querySelector("svg.logo__img");
  if(!hero) return null;
  const wrap = hero.querySelector(":scope > g[transform]");
  if(wrap){
    const letters = Array.from(wrap.children).filter(function(n){ return n.tagName === "g"; });
    return letters.length === 7 ? { letters: letters, transform: wrap.getAttribute("transform") } : null;
  }
  const paths = Array.from(hero.querySelectorAll("path"));
  return paths.length === 7 ? { letters: paths, transform: null } : null;
}

/* Copia uma letra da logo do hero pra dentro de "parent" na cor dada. Logo nova: clona o <g>
   (sem as classes .wm/.wm-z, cujo <style> da logo antiga vaza pro documento com traço de 3px)
   e pinta só com preenchimento. Logo antiga: <path> com o traço de 3 de sempre. */
function cloneHeroLetter(src, parent, color){
  const NS = "http://www.w3.org/2000/svg";
  if(src.tagName === "g"){
    const g = src.cloneNode(true);
    g.removeAttribute("class");
    g.querySelectorAll("path").forEach(function(p){
      p.removeAttribute("class");
      p.setAttribute("fill", color);
      p.setAttribute("stroke", "none");
    });
    parent.appendChild(g);
    return g;
  }
  const p = document.createElementNS(NS, "path");
  p.setAttribute("d", src.getAttribute("d"));
  p.setAttribute("fill", color);
  p.setAttribute("stroke", color);
  p.setAttribute("stroke-width", "3");
  p.setAttribute("stroke-miterlimit", "10");
  parent.appendChild(p);
  return p;
}

/* Logo "izitrad" inline nos parágrafos (.izi-inline-logo): reaproveita as 7 letras da logo do
   hero (i z i T r a d). Logo antiga: sem o triângulo (aumentaria a caixa e a altura da linha),
   viewBox x 96.5→1142.2, y 329.7→588.6. Logo nova (transform do hero já aplicado): as letras
   ocupam x 100.1→1138.4, y 329.6→588.6 e o TRIÂNGULO (copiado do .wipe, x 1175→1307, y 190→330)
   entra no viewBox só na LARGURA (x até 1310); na altura ele vaza pra cima da caixa
   (overflow:visible), então a altura da linha não muda. Se o SVG do hero não existir, fica
   o texto "IZITRAD". */
function setupInlineLogos(){
  const hero = getHeroLetters();
  if(!hero) return;
  const NS = "http://www.w3.org/2000/svg";
  document.querySelectorAll(".izi-inline-logo").forEach(function(el){
    const svg = document.createElementNS(NS, "svg");
    const triEl = hero.transform ? document.querySelector(".hero-layer .wipe path") : null;
    const triD = triEl ? triEl.getAttribute("d") : null;
    svg.setAttribute("viewBox", hero.transform ? (triD ? "100.1 329.6 1210 259" : "100.1 329.6 1038.3 259") : "96.5 329.7 1045.7 258.9");
    svg.setAttribute("aria-hidden", "true");
    let parent = svg;
    if(hero.transform){
      parent = document.createElementNS(NS, "g");
      parent.setAttribute("transform", hero.transform);
      svg.appendChild(parent);
    }
    hero.letters.forEach(function(s, i){
      const letra = cloneHeroLetter(s, parent, i === 1 ? "#FF0099" : "#111");
      if(i === 1) letra.classList.add("izi-inline-z");
    });
    if(triD){
      const tri = document.createElementNS(NS, "path");
      tri.setAttribute("d", triD);
      tri.setAttribute("class", "izi-inline-tri");
      tri.setAttribute("fill", "#FF0099");
      svg.appendChild(tri);
    }
    el.textContent = "";
    el.appendChild(svg);
  });
}

setupTitleDots();
setupInlineLogos();

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

  /* Reescrito pra troca de fonte (Big Shoulders Display → Steelfish Eb):
     a versão anterior usava ctx.measureText().actualBoundingBox* (métrica
     da fonte) + um fudge "+9px" calibrado visualmente só pra fonte antiga
     — quebrou com a troca. Uma 2ª tentativa usou canvas (fillText + scan
     de alpha pixel a pixel) mas sobrava um erro de alguns px, variável
     por tamanho de tela (~1px em telas pequenas, ~6px em telas grandes)
     — o Canvas2D não renderiza texto de forma IDÊNTICA ao motor de
     layout normal da página em todo tamanho. Solução final: SVG
     getBBox() — mede a caixa de tinta REAL usando o MESMO motor de
     renderização de texto da página (não um canvas à parte), sem
     nenhuma constante mágica. */
  function fitSimples(){
    const line = document.getElementById("iziPre04SimpleLine");
    const title = line && line.closest(".izi-pre04-simple-title");
    if(!line || !title) return false;

    /* largura/posição REAL do container-PAI (não window.innerWidth) —
       innerWidth inclui a faixa da barra de rolagem (~15-17px no Windows
       sem overlay), então o container onde o título de fato renderiza
       (width:100% do pai) é mais estreito. Mede o PAI, não o título — o
       título tem margin-left:-.035em (calculado embaixo, cssMarginLeft),
       que depende do fontSize que ainda vamos calcular; medir o próprio
       título aqui criaria uma referência circular (margem antiga, do
       fontSize anterior). */
    const containerRect = title.parentElement.getBoundingClientRect();
    const containerWidth = containerRect.width || window.innerWidth;
    const containerLeft = containerRect.left;

    const family = '"Steelfish Eb"';
    const weight = "normal"; /* só uma variante estática carregada (@font-face
      sem faixa de peso) — pedir 900 faria o canvas/svg cair pra fonte de
      fallback do sistema em vez da Steelfish, que não tem peso 900
      registrado; "normal" usa a face real. */
    const probeSize = 800;

    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.style.position = "absolute";
    svg.style.visibility = "hidden";
    svg.style.pointerEvents = "none";
    const textEl = document.createElementNS(svgNS, "text");
    textEl.setAttribute("x", "0");
    textEl.setAttribute("y", "0");
    textEl.style.fontFamily = family;
    textEl.style.fontWeight = weight;
    textEl.style.fontSize = probeSize + "px";
    textEl.textContent = TEXT;
    svg.appendChild(textEl);
    document.body.appendChild(svg);
    const bbox = textEl.getBBox();
    document.body.removeChild(svg);
    if(!bbox.width) return false;

    /* advance (largura de "avanço"/layout, usada pra centralização via
       text-align:center do CSS — diferente da largura de TINTA acima).
       canvas measureText já bate com o Range real do DOM (conferido),
       só a medição de TINTA (bbox acima) que precisava do getBBox. */
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    ctx.font = weight + " " + probeSize + "px " + family;
    const advance = ctx.measureText(TEXT).width;
    if(!advance) return false;

    const inkWidthAtProbe = bbox.width;
    const targetInkWidth = containerWidth - (TARGET_MARGIN * 2);
    const scale = targetInkWidth / inkWidthAtProbe;
    const fittedSize = probeSize * scale;
    title.style.fontSize = fittedSize + "px";

    /* Reconstrói a MESMA geometria de posicionamento do CSS (text-align:
       center + margin-left:-.035em do .izi-pre04-simple-title) no tamanho
       final, ancorando na tinta real (bbox.x do getBBox) — não em
       métrica de fonte. advanceAtFitted/inkLeftAtFitted são a versão
       escalada do que foi medido no probe. */
    const advanceAtFitted = advance * scale;
    const inkLeftAtFitted = bbox.x * scale;
    const cssMarginLeft = -.035 * fittedSize;
    const advanceBoxLeft = containerLeft + cssMarginLeft + (containerWidth - advanceAtFitted) / 2;
    const inkLeftAbsolute = advanceBoxLeft + inkLeftAtFitted;

    const correction = (containerLeft + TARGET_MARGIN) - inkLeftAbsolute;
    /* margin-left (não position:relative + left): o título agora é
       position:sticky (trava do SIMPLES após esticar, ver freeze em abaixo)
       e em sticky "left" vira RESTRIÇÃO de rolagem, não deslocamento — a
       correção horizontal seria ignorada. margin-left desloca a caixa do
       mesmo jeito (o visual é idêntico ao relative+left). */
    title.style.marginLeft = (cssMarginLeft + correction) + "px";
    return true;
  }

  /* fitSimples() pode falhar silenciosamente (retorna false) se o SVG de
     medição (getBBox) ainda não estiver pronto pra medir — visto
     acontecer mesmo depois de document.fonts.load() resolver (a fonte
     "carregada" não garante que o motor de renderização/layout já
     processou o SVG temporário no MESMO tick). Sem retry, isso deixava
     title.style.fontSize nunca setado nessa passada — SIMPLES ficava no
     tamanho de fallback do CSS (22cqw) até um resize acontecer (se
     acontecesse). fitSimplesUntilReady devolve uma Promise que só resolve
     depois que fitSimples() de fato funcionou (ou esgotou as tentativas,
     via requestAnimationFrame, até 20x ≈ 1/3s) — quem espera essa
     Promise (window.__iziSimplesReady, abaixo) tem garantia real de que
     o fontSize já foi aplicado, não só "tentado". */
  function fitSimplesUntilReady(triesLeft){
    return new Promise(function(resolve){
      function attempt(remaining){
        if(fitSimples() || remaining <= 0){ resolve(); return; }
        requestAnimationFrame(function(){ attempt(remaining - 1); });
      }
      attempt(triesLeft);
    });
  }

  /* Exposto em window pro outro IIFE (mais abaixo, "PRELÚDIO 04") que monta
     a ScrollTrigger do "estica" do SIMPLES poder esperar o MESMO
     encadeamento de promise — precisa saber quando fitSimples() de fato
     RODOU (fontSize aplicado), não só quando a fonte "carregou" (dois
     eventos diferentes; duas chamadas separadas a document.fonts.load()
     pra "a mesma fonte" não têm ordem de resolução garantida entre si). */
  window.__iziSimplesReady = document.fonts.load('normal 100px "Steelfish Eb"')
    .then(function(){ return fitSimplesUntilReady(20); })
    .then(function(){ if(window.ScrollTrigger) ScrollTrigger.refresh(); });

  let fitTimer;
  window.addEventListener("resize", function(){
    clearTimeout(fitTimer);
    fitTimer = setTimeout(function(){
      fitSimplesUntilReady(20).then(function(){
        if(window.ScrollTrigger) ScrollTrigger.refresh();
      });
    }, 120);
  });
})();

/* ===== PRELÚDIO 04 — mecânica preservada do conceito enviado ===== */
(function(){
  if(!window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);

  gsap.set("#iziPre04Kicker",{xPercent:-50});

  // Janela do giro do rótulo. Histórico: primeiro start:'top bottom'→
  // end:'top top' (só 900px visíveis possíveis, é o máximo de scroll NÃO
  // pinado — "top bottom"→"top top" é SEMPRE exatamente 1 altura de tela,
  // não dá pra esticar). Depois start:'top 180%' (mais scroll total, mas
  // 44% dele rodava com a seção ainda fora da tela, invisível — a usuária
  // percebeu que "parecia mais curto" mesmo com número maior, e média
  // confirmou: só 900px dos 1620px eram realmente vistos). Comparado aos
  // ~1400px VISÍVEIS do rótulo "02", faltava esticar de verdade.
  // Solução agora: end:'top -56%' — o giro continua rodando 56% de altura
  // de tela DEPOIS que a seção já está 100% na tela (.izi-pre04-stage já
  // grudado/parado), consumindo scroll real e TODO visível (nada roda fora
  // da tela). .izi-pre04-intro precisou crescer de 130vh pra 186vh (100
  // entrada + 56 giro pinado + 30 pergunta pinada, ver CSS) pra sobrar
  // esse tempo "parado" extra. Total visível: 900 (entrada) + 504 (56% de
  // 900) ≈ 1404px — bate com os ~1400px visíveis do "02".
  // ease "none" (era power2.out): tinha ido pra ease-out pra evitar a
  // sensação de "começa tarde/arrasta" que o linear dava aqui — só que
  // ease-out resolve a MAIOR PARTE do giro/fade logo cedo (medido: com
  // power2.out, a 50% da janela já tá 87,5% revelado; a 70%, já 97,3%),
  // sobrando uns 400-500px de "scroll morto" no fim da janela onde nada
  // muda mais — é exatamente isso que dava a sensação de "sobe rápido,
  // com pouco scroll" comparado à seção "02" (que usa ease:'none' tanto no
  // painel quanto no giro das letras, e revela 1:1 com o scroll a janela
  // inteira). Voltando pra "none" pra igualar de verdade com a "02" — se
  // voltar a sensação de "arrasta no começo", o ajuste certo é ENCURTAR a
  // janela (end mais perto de -56%), não trocar o ease de novo.
  gsap.to("#iziPre04Kicker",{
    opacity:1,y:0,ease:"none",
    scrollTrigger:{trigger:"#iziPre04Intro",start:"top bottom",end:"top -56%",scrub:true}
  });

  // Giro sincronizado das letras — mesmo mecanismo já padronizado nos
  // rótulos "02 — O Caminho" (ver buildRollingLabel/addSyncedRollingTween
  // em site.js, funções globais reaproveitadas aqui: site.js carrega antes
  // de secao04.js no index.html). Reimplementado inline (não chama
  // addSyncedRollingTween direto) porque aqui não existe uma timeline `tl`
  // compartilhada pra nestar o tween — igual o rótulo "02" da seção 03,
  // que também precisou de ScrollTrigger próprio (mesma trigger/start/end
  // já usados pelo fade acima, só dirigindo o giro em vez da opacity/y).
  var reduceMotionS04 = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(!reduceMotionS04 && window.buildRollingLabel){
    var kickerEl = document.querySelector('#iziPre04Kicker');
    var kickerReels = buildRollingLabel(kickerEl);
    gsap.set(kickerReels.map(function(r){return r.char;}), {scale:1.4, filter:'blur(5px)'});
    var kickerRollProxy = {p:0};
    gsap.to(kickerRollProxy, {p:1, ease:'none',
      scrollTrigger:{trigger:"#iziPre04Intro",start:"top bottom",end:"top -56%",scrub:true},
      onUpdate:function(){
        var p = kickerRollProxy.p;
        for(var i=0;i<kickerReels.length;i++){
          var r = kickerReels[i];
          r.track.style.setProperty('--k', String(p*r.to));
          if(p>=1){
            r.char.style.transform = '';
            r.char.style.filter = '';
          } else {
            var scale = 1+0.4*(1-p), blurPx = (5*(1-p)).toFixed(2);
            r.char.style.transform = 'scale('+scale+')';
            r.char.style.filter = 'blur('+blurPx+'px)';
          }
        }
      }
    });
  }

  // "E como é fazer isso com um IZITRAD?" — mesmo efeito de aparecimento do
  // "Guiding Principles" (ver setupDesktop() acima: heading.innerHTML
  // reconstruído em palavras, cada uma com blur+autoAlpha, stagger .04) —
  // aqui preserva a estrutura/CSS já calibrados (.izi-q-line1, .izi-q-prefix,
  // .izi-question-word, .izi-q-mark, versões V14-V16), só quebra o TEXTO de
  // .izi-q-line1/.izi-q-prefix em palavras; .izi-question-word e .izi-q-mark
  // já são unidades atômicas (IZITRAD / "?"), viram "palavra" cada um.
  // start:"top -56%" == end do giro do kicker acima — só começa depois que
  // "04 — COMO FUNCIONA" estiver 100% girado, nunca sobreposto. end:"top
  // -236%" (56%+180%): 180% de altura de viewport de revelação — era 30,
  // 45, 90, 160, agora 180vh. Exige aumentar .izi-pre04-intro (secao04.css)
  // o bastante pra manter a folga antes do fade de saída — é essa altura
  // que dá o tempo "grudado"/sticky pra seção não desgrudar da tela no
  // meio da revelação (ver V28/V29/V31/V32/V33 no CSS).
  (function(){
    function splitIntoWords(el){
      var text = el.textContent;
      var words = text.trim().split(/\s+/);
      el.textContent = '';
      var spans = [];
      words.forEach(function(w, i){
        var span = document.createElement('span');
        span.className = 'iziq-word';
        span.textContent = w;
        el.appendChild(span);
        spans.push(span);
        if(i < words.length-1) el.appendChild(document.createTextNode(' '));
      });
      return spans;
    }
    var line1 = document.querySelector('#iziPre04Question .izi-q-line1');
    var prefix = document.querySelector('#iziPre04Question .izi-q-prefix');
    var questionWordEl = document.querySelector('#iziPre04Question .izi-question-word');
    var markEl = document.querySelector('#iziPre04Question .izi-q-mark');
    var questionWords = [];
    // .izi-question-word/.izi-q-mark já são display:block !important (V16,
    // dentro do flex .izi-q-line2) — não força inline-block neles, deixa a
    // regra existente. Só as palavras NOVAS (de line1/prefix) precisam.
    if(line1){
      var line1Words = splitIntoWords(line1);
      gsap.set(line1Words, {display:'inline-block'});
      questionWords = questionWords.concat(line1Words);
    }
    if(prefix){
      var prefixWords = splitIntoWords(prefix);
      gsap.set(prefixWords, {display:'inline-block'});
      questionWords = questionWords.concat(prefixWords);
    }
    if(questionWordEl){ questionWordEl.classList.add('iziq-word'); questionWords.push(questionWordEl); }
    if(markEl){ markEl.classList.add('iziq-word'); questionWords.push(markEl); }
    if(!questionWords.length) return;
    // neutraliza o estado inicial do CSS (.izi-pre04-question{opacity:0;
    // transform:translateY(44px)}) — quem controla a revelação agora são as
    // palavras, não o bloco inteiro.
    gsap.set('#iziPre04Question', {opacity:1, y:0});
    var qScaleBase = 1440;
    gsap.set(questionWords, {autoAlpha:0, filter:'blur('+(innerWidth/qScaleBase*10)+'px)'});
    gsap.to(questionWords, {
      autoAlpha:1, filter:'blur(0px)', stagger:.04, duration:.2, ease:'none',
      scrollTrigger:{trigger:"#iziPre04Intro", start:"top -56%", end:"top -236%", scrub:true}
    });

    // Saída: MESMO mecanismo da entrada (blur+autoAlpha por palavra,
    // stagger .04, ease none), só invertido — de nítido/visível pra
    // borrado/invisível, em vez de opacity+y no bloco inteiro. Ordem do
    // stagger mantida igual à entrada (1ª palavra ainda é a 1ª a se mexer);
    // se quiser inverter a ordem também (última palavra some primeiro), é
    // só trocar stagger:.04 por stagger:{each:.04, from:"end"} aqui embaixo.
    // Rótulo não entra (fica visível, ver comentário mais abaixo).
    // fromTo (não .to()): com .to() a 1ª palavra ("E", stagger 0 igual a
    // entrada) saía "seca" — pulava de opacity 1 pra 0 já nos primeiros 5%
    // da janela, sem gradação nenhuma (testado isoladamente, as outras 8
    // palavras já ficavam suaves normalmente). O GSAP fica ambíguo sobre o
    // valor "de onde parte" quando duas tweens staggered diferentes miram
    // o mesmo alvo com posição zero de stagger (a entrada TAMBÉM começa
    // essa mesma palavra em offset 0) — fromTo trava from/to explícitos e
    // tira a ambiguidade.
    // immediateRender:false é OBRIGATÓRIO aqui: por padrão fromTo renderiza
    // o "from" ({autoAlpha:1,blur:0}) IMEDIATAMENTE na criação (ainda no
    // carregamento da página, scrollY=0) — isso sobrescrevia o autoAlpha:0
    // que a entrada tinha acabado de setar em TODAS as palavras, corrompendo
    // o valor "de onde partir" que a entrada (um .to() simples, sem from
    // explícito) captura de forma preguiçosa por palavra — só a 1ª palavra
    // escapava (capturada na criação da própria entrada, antes da saída
    // existir). Resultado sem isso: entrada quebrada, palavras 2-9 já
    // nasciam visíveis/nítidas, só a 1ª de fato revelava.
    gsap.fromTo(questionWords,
      {autoAlpha:1, filter:'blur(0px)'},
      {autoAlpha:0, filter:'blur('+(innerWidth/qScaleBase*10)+'px)', stagger:.04, duration:.2, ease:'none', immediateRender:false,
      scrollTrigger:{trigger:"#iziPre04Intro", start:"55% top", end:"bottom top", scrub:true}}
    );
  })();

  // Rótulo "04 — COMO FUNCIONA" fica (pedido: não precisa sumir, ele sai de
  // tela naturalmente junto com o resto do .izi-pre04-stage quando o
  // sticky solta, rolando pra cima com a seção, sem fade/efeito próprio).

  const line=document.querySelector("#iziPre04SimpleLine");
  if(line){
    gsap.set(line,{transformOrigin:"0 0",scaleX:1,scaleY:0});
    // BOTTOM_MARGIN: respiro visível (pedido) entre a linha achatada e a
    // borda de baixo da tela no instante em que ela começa a entrar.
    // start:"top bottom" sozinho = 0px por definição (o gatilho dispara
    // EXATAMENTE quando o topo da linha toca a borda de baixo). Adiantar
    // o start em alguns px ("top bottom-=Npx") faz a largada acontecer
    // um pouco mais cedo, com essa folga já visível desde o começo.
    // IMPORTANTE: o "end" precisa somar o MESMO BOTTOM_MARGIN (não só
    // lineHeight*FINAL_STRETCH sozinho) — sem isso a margem "dilui"
    // conforme estica (relatado: "os 10px vão sumindo"). Motivo: o topo
    // da linha sobe na tela 1px por 1px de scroll (é scroll normal, não
    // animado), enquanto a ALTURA dela cresce numa taxa de
    // lineHeight*FINAL_STRETCH px por (span da janela) px de scroll — se
    // o span for só lineHeight*FINAL_STRETCH (sem a margem), essa taxa
    // fica LIGEIRAMENTE MAIOR que 1 (854/844≈1,012), então a borda de
    // baixo da palavra cresce um pouquinho mais rápido do que o topo
    // sobe, comendo a margem aos poucos até zerar no fim. Somando
    // BOTTOM_MARGIN no span total (end-start = lineHeight*FINAL_STRETCH
    // exato de novo) as duas taxas voltam a bater 1:1, e a margem fica
    // constante do início ao fim do estica.
    const BOTTOM_MARGIN=30;
    // FINAL_STRETCH era fixo (1.45), calibrado só olhando a tela de
    // referência (1440x900). Medido depois: nessa mesma tela a palavra
    // esticada ("tinta" real, via getBBox — mesma técnica do fitSimples
    // acima) fica com 1140px de altura contra 900px de viewport, ou seja
    // ~126,7% da tela — é ESSE estouro (não um scaleY fixo) que fazia a
    // palavra "tomar a tela toda" na print aprovada. Um 1.45 fixo não
    // reproduz esse mesmo efeito fora dessa resolução: no celular sobra
    // ~64% de tela vazia (fica pequena), e num desktop 1920x1080 comum
    // vaza ~41% (quase o dobro do aprovado). TARGET_FILL_FACTOR generaliza
    // a MESMA proporção validada visualmente pra qualquer tela — o
    // scaleY final passa a ser calculado (não fixo) pra sempre entregar
    // esse mesmo estouro de ~126,7% da altura do viewport.
    const TARGET_FILL_FACTOR = 1140/900; // ≈1.2667 — proporção validada em 1440x900
    // TOP_MARGIN: pedido "a palavra tem que crescer mais em cima" — com o
    // TARGET_FILL_FACTOR acima sobrava ~80-90px de vão entre o topo da tela
    // e o topo das letras (embaixo eram 30px). Motivo: aquele fator mira na
    // CAIXA de métrica da fonte (ascent+descent, 1054px numa fonte de 878px),
    // bem maior que o desenho das letras em caixa alta (~727px, ver
    // measureCapExtent). Agora o scaleY é calculado pra as LETRAS ocuparem
    // exatamente (altura da tela - BOTTOM_MARGIN - TOP_MARGIN), em qualquer
    // tela. Se a medição falhar, cai no cálculo antigo.
    const TOP_MARGIN = 30;

    // Altura de layout ORIGINAL da linha (sem o padding-bottom extra do efeito
    // 3, ver .izi-fx-word no CSS). O padding faz line.offsetHeight crescer, mas
    // a margem negativa (com o título em display:flow-root) devolve a altura ao
    // TÍTULO — então a altura do título é sempre a altura original, com ou sem
    // o efeito, e é ela que todo cálculo do "estica" usa. (Descontar o padding
    // de line.offsetHeight dava erro de ~0,5px por arredondamento.)
    function lineBoxH(){
      return line.parentElement.offsetHeight;
    }

    function measureInkHeight(){
      const cs = getComputedStyle(line);
      const fontSizeApplied = parseFloat(cs.fontSize);
      if(!fontSizeApplied) return 0;
      const svgNS = "http://www.w3.org/2000/svg";
      const svg = document.createElementNS(svgNS,"svg");
      svg.style.position = "absolute";
      svg.style.visibility = "hidden";
      svg.style.pointerEvents = "none";
      const textEl = document.createElementNS(svgNS,"text");
      textEl.style.fontFamily = cs.fontFamily;
      textEl.style.fontSize = fontSizeApplied + "px";
      textEl.textContent = line.textContent;
      svg.appendChild(textEl);
      document.body.appendChild(svg);
      const h = textEl.getBBox().height;
      document.body.removeChild(svg);
      return h;
    }

    // Distância (em px, com scaleY=1) do topo das letras em caixa alta até a
    // borda de baixo da caixa da linha: h - baseline + capHeight. A linha é
    // esticada com transform-origin no topo, então a borda de baixo da caixa
    // fica em (topo da caixa + scaleY*h) — e o topo VISÍVEL das letras em
    // (borda de baixo - scaleY*E). Como baseline ≈ borda de baixo (medido:
    // 791,5 vs 791), E ≈ altura das letras. capHeight vem do canvas
    // (actualBoundingBoxAscent de "I", letra de topo reto); baseline vem das
    // métricas da fonte + meia-entrelinha (line-height .9 < ascent+descent).
    function measureCapExtent(){
      const fs = parseFloat(getComputedStyle(line).fontSize);
      const h = lineBoxH();
      if(!fs || !h) return 0;
      const ctx = document.createElement("canvas").getContext("2d");
      ctx.font = "normal " + fs + 'px "Steelfish Eb"';
      const m = ctx.measureText("I");
      const asc = m.fontBoundingBoxAscent, desc = m.fontBoundingBoxDescent, cap = m.actualBoundingBoxAscent;
      if(!asc || !desc || !cap) return 0;
      const baselineFromTop = (h - (asc + desc)) / 2 + asc;
      const E = h - baselineFromTop + cap;
      return E > 0 ? E : 0;
    }

    let simplesStretchTween = null;
    // Desaceleração antes do travamento (pedido: a parada era "abrupta").
    // Antes: a palavra crescia/subia a 1px por 1px de scroll e, no engate do
    // pin, PARAVA de uma vez (velocidade 1 → 0 no mesmo frame). Agora o
    // "estica" linear termina um pouco ANTES (em F1 < F) e o pin engata ali;
    // dentro do pin, a palavra segue crescendo (scaleY F1→F) E subindo
    // (y 0→-D) com ease "power1.out" — velocidade cai linearmente de 1 pra
    // 0, e D = W/2 (W = janela de desaceleração em px de scroll). Crescer
    // D/h de scaleY faz a borda de baixo descer D px; subir D px cancela
    // exatamente → a base continua fixa na margem, e o tamanho/posição
    // FINAIS ficam idênticos aos de antes (só o caminho até lá muda).
    const DECEL_VH = 0.35; // janela de desaceleração, em fração da altura da tela
    let simplesDecel = {F:1, F1:1, D:0, W:0};
    // "end" como FUNÇÃO (não string fixa): o GSAP reavalia funções de
    // start/end a cada ScrollTrigger.refresh() — se por algum motivo
    // line.offsetHeight ainda estiver errado/0 na primeira criação
    // (mesmo com o retry do fitSimplesUntilReady acima), qualquer
    // refresh() seguinte (já rolam vários: no fim do fitSimplesUntilReady,
    // no listener de resize) recalcula com o valor CORRETO — autocorrige
    // sozinho em vez de ficar preso na string errada pra sempre.
    function setupSimplesStretch(){
      const inkHeight = measureInkHeight();
      if(!inkHeight) return;
      const capExtent = measureCapExtent();
      const FINAL_STRETCH = capExtent
        ? (window.innerHeight - BOTTOM_MARGIN - TOP_MARGIN) / capExtent
        : (window.innerHeight * TARGET_FILL_FACTOR) / inkHeight;
      if(simplesStretchTween){
        simplesStretchTween.scrollTrigger.kill();
        simplesStretchTween.kill();
      }
      const h = lineBoxH();
      let W = window.innerHeight * DECEL_VH;
      let D = W / 2;
      let F1 = h ? FINAL_STRETCH - D / h : FINAL_STRETCH;
      if(!h || F1 < FINAL_STRETCH * 0.3){ W = 0; D = 0; F1 = FINAL_STRETCH; } // sem base confiável: sem desaceleração
      simplesDecel = {F:FINAL_STRETCH, F1:F1, D:D, W:W};
      gsap.set(line,{y:0});
      simplesStretchTween = gsap.to(line,{
        scaleY:F1,scaleX:1,ease:"none",
        scrollTrigger:{
          trigger:line,
          start:`top bottom-=${BOTTOM_MARGIN}px`,
          end:function(){ return `top bottom-=${(lineBoxH() * F1) + BOTTOM_MARGIN}px`; },
          scrub:true
        }
      });
    }

    // ===== Faixa "jeito izi" + travamento (sticky) do SIMPLES já esticado =====
    // Pedido: depois que a palavra termina de crescer, ela fica "travada"
    // na tela por um trecho de scroll, e nesse meio tempo uma faixa preta
    // entra aos poucos pela esquerda (acompanhando o scroll, não um timer),
    // passando por cima da palavra, com um texto branco dentro.
    //
    // Histórico: o travamento era um pin do GSAP (fixed, depois transform).
    // Ambos deram solavanco: "transform" recompensa o scroll por JS a cada
    // frame (a palavra tremia em scroll real); "fixed" troca a caixa de
    // fluxo normal pra position:fixed NO MEIO do scroll, troca que não é
    // contínua frame a frame (travinha no engate, pior ainda quando a
    // palavra ainda está em movimento nesse instante, caso da desaceleração
    // acima). Agora é position:sticky NATIVO no título (CSS), sem troca
    // nenhuma — o navegador resolve no compositor.
    //
    // Como o sticky engata sozinho: o título (h2) tem "top" = posição em
    // que a caixa da linha está no instante em que o "estica" termina,
    // (altura da tela - BOTTOM_MARGIN - F1*altura da linha). O topo do
    // título rola 1:1 com o scroll até chegar nesse "top", e aí o navegador
    // o segura — exatamente onde o "estica" (ScrollTrigger acima) acaba.
    // Quanto tempo segura = altura da .izi-pre04-simple-zone - altura do
    // título; por isso a zone ganha min-height = título + totalPx. A altura
    // original da zone (105vh) vira margin-bottom pra o resto da página
    // ficar no MESMO lugar de antes (antes o pin criava esse espaço extra).
    //
    // A faixa é position:fixed FORA da zone (a zone tem container-type,
    // que viraria containing block do fixed) e só aparece via opacity.
    const band = document.getElementById("iziPre04SimpleBand");
    const simpleZoneEl = document.querySelector(".izi-pre04-simple-zone");
    const simpleTitleEl = line.closest(".izi-pre04-simple-title");
    // Divide o texto da faixa em letras (uma <span> por caractere) pra elas
    // entrarem em sequência DEPOIS da faixa (ver timeline abaixo).
    const bandTextEl = band ? band.querySelector(".izi-pre04-simple-band-text") : null;
    let bandChars = [];
    if(bandTextEl){
      const txt = bandTextEl.textContent;
      bandTextEl.setAttribute("aria-label", txt);
      bandTextEl.textContent = "";
      // "izi" no fim vira a LOGO (as 3 primeiras letras do SVG da hero: i, z, i
      // — reaproveita as mesmas formas, sem PNG, porque o PNG tem os "i"
      // pretos e sumiriam na faixa preta). Cada letra entra como uma "letra".
      const hero = getHeroLetters();
      const useLogo = /izi$/i.test(txt) && !!hero;
      const letters = useLogo ? txt.slice(0,-3) : txt;
      Array.from(letters).forEach(function(ch){
        const sp = document.createElement("span");
        sp.className = "izi-band-ch";
        sp.setAttribute("aria-hidden", "true");
        sp.textContent = ch;
        bandTextEl.appendChild(sp);
        bandChars.push(sp);
      });
      if(useLogo){
        // viewBox = união das 3 letras. Logo nova (transform do hero já aplicado, contorno
        // incluído): x 100.1→411.3, y 329.6→588.6. Logo antiga: x 96.5→408.1 (traço de 3 incluído).
        const NS = "http://www.w3.org/2000/svg";
        const svgLogo = document.createElementNS(NS, "svg");
        svgLogo.setAttribute("class", hero.transform ? "izi-band-logo izi-band-logo--nova" : "izi-band-logo");
        svgLogo.setAttribute("viewBox", hero.transform ? "100.1 329.6 311.2 259" : "96.5 329.7 311.6 258.9");
        svgLogo.setAttribute("aria-hidden", "true");
        let parent = svgLogo;
        if(hero.transform){
          parent = document.createElementNS(NS, "g");
          parent.setAttribute("transform", hero.transform);
          svgLogo.appendChild(parent);
        }
        hero.letters.slice(0,3).forEach(function(src, i){
          const color = i === 1 ? "#FF0099" : "#fff"; // "z" rosa, "i" brancos
          const el = cloneHeroLetter(src, parent, color);
          if(i === 1) el.classList.add("izi-band-z");
          bandChars.push(el);
        });
        bandTextEl.appendChild(svgLogo);
      }
    }
    let freezeTween = null;
    let exitTween = null;
    let trailTicker = null;
    function setupSimplesFreeze(){
      if(!band || !simpleZoneEl || !simpleTitleEl) return;
      const stretchST = simplesStretchTween && simplesStretchTween.scrollTrigger;
      if(!stretchST) return;
      if(freezeTween){
        freezeTween.scrollTrigger.kill();
        freezeTween.kill();
      }
      if(exitTween){
        exitTween.scrollTrigger.kill();
        exitTween.kill();
        exitTween = null;
        simpleTitleEl.style.opacity = "";
        simpleTitleEl.style.filter = "";
        Array.from(line.querySelectorAll(".izi-sx-ch")).forEach(function(c){
          c.style.opacity = ""; c.style.filter = "";
        });
      }
      gsap.set(band,{xPercent:-100,opacity:0});
      // Efeito copiado da pergunta "E como é fazer isso com a izi?" (ver
      // questionWords acima): autoAlpha 0→1 + blur→nítido, ease none, com
      // stagger .04 e duration .2 — ou seja, cada elemento leva 5x o
      // intervalo entre um e o próximo, então há uma ONDA com vários
      // elementos meio-desfocados ao mesmo tempo (em vez de um por vez).
      // Aqui os elementos são as letras da faixa. BAND_BLUR_PX é fixo em px
      // (a pergunta usa 10px*vw/1440 em fonte de ~130px; 20px de texto
      // pede bem menos) — ajustar aqui se quiser mais/menos desfoque.
      const BAND_BLUR_PX = 6;
      gsap.set(bandChars,{autoAlpha:0,filter:"blur("+BAND_BLUR_PX+"px)"});
      const dec = simplesDecel;
      const vh = window.innerHeight;
      const vw = window.innerWidth;

      // ===== RASTRO da faixa (TESTE: comparar variantes por ?rastro=...) =====
      //   1c = cauda de vidro curta (~300px)   1l = cauda de vidro longa (~metade da tela)
      //   2c = ecos curtos (~300px)            2l = ecos longos (~metade da tela)
      // Sem o parâmetro: sem rastro. Os elementos são irmãos fixos da faixa (não
      // filhos): um filho com backdrop-filter dentro de outro com backdrop-filter
      // só enxerga o conteúdo do pai (o pai vira "backdrop root"), então a cauda
      // não desfocaria as letras do SIMPLES. Cada um acompanha o x da faixa
      // (trailTicker, abaixo).
      Array.from(document.querySelectorAll(".izi-band-trail,.izi-band-trail-r,.izi-band-echo")).forEach(function(n){ n.remove(); });
      const qs = new URLSearchParams(location.search);
      const trailMode = qs.get("rastro") || "1l"; // padrão: cauda longa (escolhida); ?rastro=none desliga
      // OV: quantos px a cauda entra POR BAIXO da faixa. 14 no fundo claro. No
      // preto a borda da faixa esmaece em 20px (máscara), então a cauda entra
      // 20 e esmaece na mesma largura em sentido oposto (fade cruzado): sem vão
      // nem soma de transparências na junção. (Também no CSS: .izi-sec04-dark
      // .izi-band-trail{mask-image ... 10px}.) Preto é o padrão (?fundo=claro = claro).
      const OV = qs.get("fundo") !== "claro" ? 10 : 14;
      const bandW = band.offsetWidth;
      let trailEls = [];   // {el, offset}: offset = quanto o elemento fica ATRÁS da borda esquerda da faixa
      let trailLen = 0;    // comprimento total do rastro (a travessia precisa ir até vw + trailLen pra ele sair da tela)
      if(trailMode === "1c" || trailMode === "1l" || trailMode === "1f" || trailMode === "1r"){ // 1f = 1l com a cauda SEMPRE no comprimento total; 1r = idem só com a cauda do REVERSO (direita) — só pra avaliar o visual
        trailLen = trailMode === "1c" ? 300 : Math.round(vw * .5);
        // elemento separado, ancorado na borda direita = borda esquerda da
        // faixa, com 14px A MAIS entrando por baixo da faixa (rampa na máscara,
        // ver CSS) pra a emenda ser uma transição suave. (Uma versão com a
        // cauda EMBUTIDA na própria faixa, sem emenda, foi testada e a usuária
        // preferiu esta.)
        const el = document.createElement("div");
        el.className = "izi-band-trail";
        el.setAttribute("aria-hidden", "true");
        el.style.width = (trailLen + OV) + "px";
        band.parentElement.appendChild(el);
        trailEls.push({el:el, offset:trailLen, w:trailLen, tail:true});
        // EFEITO REVERSO: voltando o scroll a faixa anda pra ESQUERDA e a cauda
        // aparece do lado DIREITO dela (espelhada), começando 14px por baixo da
        // borda direita. Nunca aparece junto com a da esquerda (só uma direção
        // por vez), então o custo de desenho não dobra.
        const elR = document.createElement("div");
        elR.className = "izi-band-trail-r";
        elR.setAttribute("aria-hidden", "true");
        elR.style.width = (trailLen + OV) + "px";
        band.parentElement.appendChild(elR);
        trailEls.push({el:elR, offset:-(bandW - OV), w:trailLen, tail:true, side:"r"});
      } else if(trailMode === "2c" || trailMode === "2l"){
        const n = trailMode === "2c" ? 3 : 5;
        const step = trailMode === "2c" ? 100 : 190;
        trailLen = n * step;
        for(let k = 1; k <= n; k++){
          const el = document.createElement("div");
          el.className = "izi-band-echo";
          el.setAttribute("aria-hidden", "true");
          el.style.opacity = String([.55,.38,.24,.14,.07][k-1]);
          band.parentElement.appendChild(el);
          trailEls.push({el:el, offset:k * step, w:bandW});
        }
      }
      trailEls.forEach(function(t){
        // sem sobreposição com a faixa: 1px por baixo dela escurecia duas vezes
        // e aparecia como uma linha vertical na emenda
        t.el.style.left = (-t.offset) + "px"; // base: à esquerda da tela
        gsap.set(t.el,{yPercent:-50,x:-bandW});      // fora da tela até a faixa entrar
        // cauda nasce recolhida (scaleX 0, ancorada na borda direita = borda
        // esquerda da faixa) e transparente
        if(t.tail) gsap.set(t.el,{scaleX:0,opacity:0,transformOrigin:t.side === "r" ? "0% 50%" : "100% 50%"});
      });
      // O rastro acompanha a faixa e, nas CAUDAS, só existe enquanto a faixa
      // está andando pra direita: comprimento (scaleX) e opacidade seguem a
      // velocidade da faixa (px/s), suavizada — sobe rápido (τ .06s) e recolhe
      // devagar (τ .25s) quando o scroll para. Voltando o scroll (faixa indo
      // pra esquerda) não tem cauda. Precisa de ticker (não onUpdate do
      // scrub): onUpdate só dispara quando o scroll muda, e o recolher depois
      // que o scroll para tem que continuar rodando sozinho.
      // Velocidade em que a cauda chega ao comprimento total: 2500 px/s da
      // FAIXA (~1100 px/s de scroll, uma rolada firme de roda de mouse).
      const TRAIL_FULL_SPEED = 2500;
      if(trailTicker){ gsap.ticker.remove(trailTicker); trailTicker = null; }

      // ===== EFEITOS EXTRAS (padrão: 3 e 4 ligados; ?efeito=3 | 4 | 34 | 0) =====
      //   4 = desfoque de movimento horizontal no texto e na logo da faixa,
      //       proporcional à velocidade (sensação de velocidade, sem cauda extra)
      //   3 = rastro que altera a palavra: as letras do SIMPLES que a faixa
      //       acabou de cobrir ficam escuras e voltam ao rosa ao longo da cauda
      //       (usa background-clip:text com um degradê que segue a faixa)
      const fxMode = qs.has("efeito") ? qs.get("efeito") : "34"; // padrão: 3 e 4 ligados; ?efeito=0 desliga
      const fx3 = fxMode.indexOf("3") >= 0, fx4 = fxMode.indexOf("4") >= 0;
      const MB_MAX = 9;      // fx4: desfoque horizontal máximo (stdDeviation, px)
      const WORD_TL_MAX = 620; // fx3: comprimento máximo do rastro na palavra (px)
      line.classList.toggle("izi-fx-word", fx3);
      line.style.removeProperty("--bx"); line.style.removeProperty("--tl");
      bandTextEl.style.filter = "";
      let mbGauss = null;
      if(fx4){
        let svgF = document.getElementById("iziMotionBlurSvg");
        if(!svgF){
          svgF = document.createElementNS("http://www.w3.org/2000/svg","svg");
          svgF.setAttribute("id","iziMotionBlurSvg");
          svgF.setAttribute("width","0"); svgF.setAttribute("height","0");
          svgF.setAttribute("aria-hidden","true");
          svgF.style.cssText = "position:absolute;width:0;height:0;pointer-events:none";
          svgF.innerHTML = '<filter id="iziMotionBlur" x="-60%" y="-20%" width="220%" height="140%" color-interpolation-filters="sRGB"><feGaussianBlur id="iziMotionBlurG" stdDeviation="0 0"/></filter>';
          document.body.appendChild(svgF);
        }
        mbGauss = document.getElementById("iziMotionBlurG");
      }
      const lineLeft = line.getBoundingClientRect().left; // a palavra não anda na horizontal

      if(trailEls.length || fx3 || fx4){
        let lastLeft = null, lastT = performance.now(), s = 0, sr = 0; // s: faixa indo pra DIREITA (cauda à esquerda) | sr: indo pra ESQUERDA (cauda à direita)
        trailTicker = function(){
          const now = performance.now();
          const dt = Math.max(1, now - lastT) / 1000;
          lastT = now;
          // posição real (na tela) da borda esquerda da faixa = xPercent*largura + x
          const left = Math.round(gsap.getProperty(band,"xPercent")/100 * bandW + gsap.getProperty(band,"x"));
          // SÓ existe rastro/desfoque/efeito na palavra enquanto o scroll está DENTRO
          // do trecho da faixa (progress entre 0 e 1). Fora dele a faixa está
          // parada fora da tela — mas um pulo de scroll (voltar ao topo, clicar no
          // menu) faz a timeline "voar" de uma ponta à outra em 1 quadro: a
          // velocidade dispara e as caudas (position:fixed, visíveis em qualquer
          // seção) apareciam por instantes em outras partes da página. Fora do
          // trecho zera tudo NA HORA e descarta lastLeft (senão o primeiro quadro
          // dentro do trecho mediria a velocidade contra uma posição antiga).
          const stF = freezeTween && freezeTween.scrollTrigger;
          const inRange = !!stF && stF.progress > 0 && stF.progress < 1;
          if(!inRange){
            s = 0; sr = 0; lastLeft = null;
          } else if(lastLeft !== null){
            const v = (left - lastLeft) / dt; // px/s, positivo = pra direita
            const target = trailMode === "1f" ? 1 : Math.min(1, Math.max(0, v) / TRAIL_FULL_SPEED);
            const targetR = trailMode === "1r" ? 1 : Math.min(1, Math.max(0, -v) / TRAIL_FULL_SPEED);
            s += (target - s) * (1 - Math.exp(-dt / (target > s ? .06 : .25)));
            sr += (targetR - sr) * (1 - Math.exp(-dt / (targetR > sr ? .06 : .25)));
            if(s < .002) s = 0;
            if(sr < .002) sr = 0;
          }
          if(inRange) lastLeft = left;
          trailEls.forEach(function(t){
            if(t.tail){
              const k = t.side === "r" ? sr : s;
              gsap.set(t.el,{x:left,scaleX:k,opacity:Math.min(1,k*1.6)});
            }
            else gsap.set(t.el,{x:left});
          });
          if(fx4){
            // só indo pra DIREITA: no reverso (voltando o scroll) fica só a cauda de vidro
            if(s > .01){
              mbGauss.setAttribute("stdDeviation", (s * MB_MAX).toFixed(2) + " 0");
              bandTextEl.style.filter = "url(#iziMotionBlur)";
            } else bandTextEl.style.filter = "";
          }
          if(fx3){
            line.style.setProperty("--bx", (left - lineLeft) + "px");
            line.style.setProperty("--tl", (s * WORD_TL_MAX).toFixed(1) + "px");
          }
        };
        gsap.ticker.add(trailTicker);
      }
      // Etapas do travamento, em px de scroll, uma depois da outra:
      //   desaceleração (dec.W) → faixa ENTRA → letras (onda) → segura →
      //   faixa ATRAVESSA a tela pra direita e sai. Ajustar aqui.
      const ENTER_PX = 300;          // entrada da faixa (era ~130px: "rápida demais")
      // "O JEITO izi" pediu-se um pouco mais rápido: a onda de letras foi de 205
      // para 150px de scroll (−27%). Os 55px economizados foram para o respiro
      // (HOLD_PX 50 → 105), então o total da trava (totalPx) continua IGUAL e
      // nenhum gatilho posterior (sumiço, fundo, compromissos) se desloca.
      const LETTERS_PX = 150;        // frase em onda (ver comentário nas letras) — era 205
      const HOLD_PX = 105;           // respiro com a frase completa — era 50
      const TRAVERSE_PX = vh;        // travessia: faixa vai de left:0 até fora da tela (direita)
      const totalPx = dec.W + ENTER_PX + LETTERS_PX + HOLD_PX + TRAVERSE_PX;
      const f = function(px){ return px / totalPx; }; // px de scroll → fração da timeline
      const decFrac = f(dec.W); // parte da timeline gasta na desaceleração

      // layout do sticky (ver comentário acima)
      const h = lineBoxH();
      const titleH = simpleTitleEl.offsetHeight;
      simpleTitleEl.style.top = (vh - BOTTOM_MARGIN - dec.F1 * h) + "px";
      const baseMin = (window.innerWidth <= 700 ? 1.10 : 1.05) * vh; // min-height original da zone (CSS)
      simpleZoneEl.style.setProperty("min-height", (titleH + totalPx) + "px", "important");
      simpleZoneEl.style.setProperty("margin-bottom", Math.max(0, baseMin - titleH) + "px", "important");

      freezeTween = gsap.timeline({
        scrollTrigger:{
          trigger:line,
          start:() => stretchST.end,
          end:() => stretchST.end + totalPx,
          scrub:true
        }
      })
      // 1) desaceleração: palavra segue crescendo e subindo, velocidade → 0
      // (immediateRender:false — o "estica" acima é quem manda no scaleY
      // antes do travamento; sem isso esse fromTo escreveria F1/0 já no load)
      .fromTo(line,{scaleY:dec.F1,y:0},{scaleY:dec.F,y:-dec.D,ease:"power1.out",duration:decFrac,immediateRender:false})
      // 2) faixa entra (posição = depois da desaceleração). ease power1.out:
      // "pousa" suave em vez de bater no fim
      .set(band,{opacity:1},decFrac)
      .to(band,{xPercent:0,ease:"power1.out",duration:f(ENTER_PX)})
      // 3) a frase entra em sequência (letra por letra, blur→nítido, mesmo
      // efeito das outras frases da seção) SÓ depois que a faixa entrou.
      // Janela de ~205px (era ~95: as letras de "JEITO" passavam rápido
      // demais e só o "IZI" era perceptível), dividida na MESMA proporção da
      // pergunta (duration .2 / stagger total .32 → 38,5% / 61,5%)
      .fromTo(bandChars,{autoAlpha:0,filter:"blur("+BAND_BLUR_PX+"px)"},
        {autoAlpha:1,filter:"blur(0px)",ease:"none",duration:f(LETTERS_PX)*(.2/.52),stagger:{amount:f(LETTERS_PX)*(.32/.52)}})
      .to({},{duration:f(HOLD_PX)}) // segura a faixa com a frase completa
      // 4) travessia: a faixa (com texto e logo dentro) desliza pra direita
      // e sai da tela — linear, 1:1 com o scroll, sem fade. x em px (o
      // xPercent:0 acima é a posição de repouso; aqui soma o deslocamento)
      // x em pixels INTEIROS (snap): faixa e cauda são duas camadas; numa posição
      // fracionada as duas bordas se encontram em meio pixel cada, e a soma de
      // duas coberturas parciais deixa um fio de fundo aparecendo na emenda
      .to(band,{x:vw + trailLen,ease:"none",duration:f(TRAVERSE_PX),snap:{x:1}}); // + trailLen: o rastro também precisa sair da tela
      // ===== SAÍDA: a palavra desfoca e some, como a pergunta =====
      // A pergunta sai desfocando e sumindo enquanto o palco rola (blur +
      // autoAlpha, ease none, ligado ao scroll). A palavra faz o mesmo DEPOIS
      // que o travamento solta, enquanto sobe naturalmente pela tela — nunca
      // durante a faixa (mexer na palavra enquanto a faixa saía, na tentativa
      // da "soltada com aceleração", tirava a atenção do gesto principal).
      // Aplicado no TÍTULO (h2, sem transform), não na linha: filter na linha
      // é aplicado ANTES do scaleY e esticaria o desfoque só na vertical.
      // Desfoque proporcional à largura (base 24px a 1440), bem menor que os
      // ~10% da fonte que a pergunta usa (a palavra tem ~790px de altura).
      // ?saida=0 desliga (pra comparar).
      if(qs.get("saida") !== "0"){
        const EXIT_BLUR = 24 * window.innerWidth / 1440;
        const EXIT_PX = vh * .85; // termina pouco antes da palavra sair da tela
        const exitOld = qs.get("saida") === "antiga";
        const EXIT_LEAD = exitOld ? 0 : TRAVERSE_PX * (1 - vw / (vw + trailLen)); // px de rolagem que o sumiço começa ANTES do fim da trava (0 sem cauda e na versão antiga)
        // Proxy (p de 0 a 1) e escrita manual de opacity/filter no onUpdate: tweenar
        // "filter" direto pelo GSAP não interpolava de forma confiável quando a
        // 1ª renderização vinha de um salto de scroll (opacity andava, filter
        // ficava em blur(0px)). Assim o estado é sempre função de p, inclusive
        // na volta (p=0 limpa os estilos).
        const exitProxy = {p:0};
        // ===== SAÍDA LETRA POR LETRA (padrão) — ?saida=antiga volta à versão do último commit =====
        // Cada letra desfoca e some, da DIREITA pra ESQUERDA (S,E,L,P,M,I,S),
        // com a mesma onda da pergunta (cada uma leva 5x o intervalo entre uma e a
        // próxima: duration .2 / stagger total .32). Começa no mesmo ponto de hoje
        // (faixa acabou de sair) e a subida da palavra não muda: só opacity/filter
        // das letras. Duas armadilhas:
        //  - as letras ficam DENTRO da linha, que tem scaleY (F): um blur() comum
        //    seria esticado F vezes na vertical. Por isso o desfoque é um filtro
        //    SVG com stdDeviation "s s/F" (depois do scaleY fica s x s).
        //  - o efeito 3 usa background-clip:text na linha (texto transparente):
        //    filhos com filter/opacity ficam FORA desse recorte e sumiriam. Como a
        //    faixa já saiu, a classe do efeito 3 é tirada durante a saída (a cor
        //    volta a ser o rosa normal) e devolvida quando p volta a 0.
        // ?saida=antiga = a do último commit (palavra inteira, começa só no fim da trava)
        const letterMode = qs.get("saida") !== "antiga";
        let exitChars = [], exitGauss = [];
        if(letterMode){
          if(!line.querySelector(".izi-sx-ch")){
            const txt = line.textContent;
            line.textContent = "";
            Array.from(txt).forEach(function(chr){
              const sp = document.createElement("span");
              sp.className = "izi-sx-ch";
              sp.textContent = chr;
              line.appendChild(sp);
            });
          }
          exitChars = Array.from(line.querySelectorAll(".izi-sx-ch")).reverse(); // 0 = última letra (direita)
          let svgX = document.getElementById("iziExitBlurSvg");
          if(svgX) svgX.remove();
          svgX = document.createElementNS("http://www.w3.org/2000/svg","svg");
          svgX.setAttribute("id","iziExitBlurSvg");
          svgX.setAttribute("width","0"); svgX.setAttribute("height","0");
          svgX.setAttribute("aria-hidden","true");
          svgX.style.cssText = "position:absolute;width:0;height:0;pointer-events:none";
          svgX.innerHTML = exitChars.map(function(_, k){
            return '<filter id="iziExitBlur' + k + '" x="-60%" y="-30%" width="220%" height="160%" color-interpolation-filters="sRGB"><feGaussianBlur id="iziExitBlurG' + k + '" stdDeviation="0 0"/></filter>';
          }).join("");
          document.body.appendChild(svgX);
          exitGauss = exitChars.map(function(_, k){ return document.getElementById("iziExitBlurG" + k); });
        }
        // fração da janela: cada letra dura EX_DUR; a última começa em EX_SPREAD
        // (EX_DUR + EX_SPREAD = 1: a última termina junto com a janela). Era
        // .2/.52 e .32/.52 (mesma proporção da pergunta: 38,5% / 61,5%); agora
        // cada letra apaga mais devagar, começo e fim da janela iguais.
        // (Testado 50% x 60%: ficou 60% — a última letra começa em 40%.)
        const EX_DUR = .6, EX_SPREAD = 1 - EX_DUR;
        exitTween = gsap.to(exitProxy,{
          p:1,ease:"none",
          onUpdate:function(){
            const p = exitProxy.p;
            if(letterMode){
              const n = exitChars.length;
              const F = Math.max(1, dec.F);
              if(p < .001){
                if(fx3) line.classList.add("izi-fx-word");
                exitChars.forEach(function(c){ c.style.opacity = ""; c.style.filter = ""; });
                return;
              }
              line.classList.remove("izi-fx-word");
              exitChars.forEach(function(c, k){
                const start = n > 1 ? k / (n - 1) * EX_SPREAD : 0;
                const q = Math.min(1, Math.max(0, (p - start) / EX_DUR));
                if(q <= 0){ c.style.opacity = ""; c.style.filter = ""; return; }
                c.style.opacity = String(1 - q);
                const s = EXIT_BLUR * q;
                exitGauss[k].setAttribute("stdDeviation", s.toFixed(2) + " " + (s / F).toFixed(2));
                c.style.filter = "url(#iziExitBlur" + k + ")";
              });
              return;
            }
            if(p < .001){
              simpleTitleEl.style.opacity = "";
              simpleTitleEl.style.filter = "";
            } else {
              simpleTitleEl.style.opacity = String(1 - p);
              simpleTitleEl.style.filter = "blur(" + (EXIT_BLUR * p).toFixed(2) + "px)";
            }
          },
          scrollTrigger:{
            trigger:line,
            // EXIT_LEAD: o sumiço começa quando o CORPO da faixa sai da tela (borda
            // esquerda dela chega em vw), não no fim da travessia — a faixa anda
            // vw + trailLen pra a cauda também sair, então o corpo sai com a
            // fração vw/(vw+trailLen) da travessia e sobrava um vão (~1/3 da
            // travessia) até o sumiço começar. Só o COMEÇO antecipa: o fim fica
            // onde estava (senão a palavra sumia ~EXIT_LEAD px antes de sair da
            // tela), então a janela fica EXIT_LEAD px mais longa e a onda de
            // letras, mais lenta. (?saida=antiga não antecipa.)
            start:() => stretchST.end + totalPx - EXIT_LEAD,
            end:() => stretchST.end + totalPx + EXIT_PX,
            scrub:true
          }});
      }
      // a zone mudou de altura: recalcula os triggers das seções seguintes
      ScrollTrigger.refresh();
      setupHeaderContrast();
    }

    // Triângulo do menu: ele é rosa (mesmo rosa do SIMPLES) e some quando a
    // palavra passa por baixo dele — só as linhas brancas do hambúrguer
    // apareciam. Enquanto as letras cobrem o botão, o header ganha
    // [data-over-pink] e o CSS pinta o triângulo de preto (secao04.css).
    // Janela: começa quando o topo das letras sobe até a borda de baixo do
    // botão (scaleY = (vh - BOTTOM_MARGIN - btn.bottom) / capExtent, e o
    // "estica" é linear em scroll) e termina quando, depois do travamento,
    // a base das letras sobe até o topo do botão.
    const siteHeader = document.querySelector("[data-header]");
    let headerST = null;
    function setupHeaderContrast(){
      if(!siteHeader) return;
      if(headerST){ headerST.kill(); headerST = null; }
      siteHeader.removeAttribute("data-over-pink");
      const stretchST = simplesStretchTween && simplesStretchTween.scrollTrigger;
      const freezeST = freezeTween && freezeTween.scrollTrigger;
      if(!stretchST || !freezeST) return;
      const E = measureCapExtent();
      if(!E) return;
      const btn = siteHeader.querySelector(".menu-toggle");
      let r = btn ? btn.getBoundingClientRect() : null;
      // no desktop o botão pode estar display:none (rect zerado): usa a
      // caixa padrão dele (66x75, colada no topo direito)
      const btnTop = r && r.height ? r.top : 10;
      const btnBottom = r && r.height ? r.bottom : 85;
      const vh = window.innerHeight;
      headerST = ScrollTrigger.create({
        start:() => {
          const need = (vh - BOTTOM_MARGIN - btnBottom) / E; // scaleY em que o topo das letras chega no botão
          const d = simplesDecel;
          if(!d.F1) return stretchST.end;
          const p = need / d.F1;
          if(p < 1) return stretchST.start + p * (stretchST.end - stretchST.start); // ainda no estica (linear)
          // caso comum: só chega no botão durante a desaceleração (scaleY F1→F com
          // ease power1.out: scale = F1 + (F-F1)*(1-(1-u)^2)) — inverte pra achar u
          const ratio = d.F > d.F1 ? Math.min(1, Math.max(0, (need - d.F1) / (d.F - d.F1))) : 1;
          return stretchST.end + (1 - Math.sqrt(1 - ratio)) * d.W;
        },
        end:() => freezeST.end + (vh - BOTTOM_MARGIN - btnTop),
        onToggle:self => siteHeader.toggleAttribute("data-over-pink", self.isActive)
      });
    }

    // (window.__iziSimplesReady || Promise.resolve()) é defensivo — se o
    // outro IIFE não rodou por algum motivo, ainda cria a ScrollTrigger
    // (com a altura do fallback, melhor que nada) em vez de nunca criar.
    (window.__iziSimplesReady || Promise.resolve()).then(function(){
      setupSimplesStretch();
      setupSimplesFreeze();
    });

    // Resize: fitSimples() (outro IIFE) recalcula o fontSize em até
    // ~120ms + 20 tentativas de rAF; espera 500ms (folga generosa acima
    // desse pior caso) antes de remedir a tinta e recriar o estica com o
    // FINAL_STRETCH certo pro novo tamanho — sem isso o cálculo ficaria
    // preso na proporção da tela anterior. setupSimplesFreeze depende do
    // stretchST.end recém-recalculado, por isso roda sempre DEPOIS de
    // setupSimplesStretch(), nunca antes/paralelo.
    let simplesResizeTimer;
    window.addEventListener("resize", function(){
      clearTimeout(simplesResizeTimer);
      simplesResizeTimer = setTimeout(function(){
        setupSimplesStretch();
        setupSimplesFreeze();
      }, 500);
    });
  }
})();

/* ===== Medidor de desempenho (?fps=1) — só pra teste ===== */
/* Painel fixo no canto inferior esquerdo com: FPS atual, FPS mínimo e pior
   quadro (ms) dos últimos 2 segundos, e quantos quadros passaram de 20ms
   (perdidos: acima de ~16,7ms o navegador não fecha o quadro a 60fps).
   Roda um requestAnimationFrame próprio e só existe com ?fps=1. */
(function(){
  if(new URLSearchParams(location.search).get("fps") !== "1") return;
  const box = document.createElement("div");
  box.style.cssText = "position:fixed;left:10px;bottom:10px;z-index:99999;padding:8px 10px;background:rgba(0,0,0,.82);color:#7CFF9B;font:12px/1.4 ui-monospace,Consolas,monospace;border-radius:6px;pointer-events:none;white-space:pre";
  box.textContent = "FPS: …";
  document.body.appendChild(box);
  // Botão "Testar": rola sozinho (3 idas pelo trecho) e mostra o tempo por
  // quadro. Rodar com a aba VISÍVEL (em aba oculta o navegador não desenha).
  // Compare abrindo também com &saida=0.
  const btn = document.createElement("button");
  btn.textContent = "▶ Testar saída e travessia";
  btn.style.cssText = "position:fixed;left:10px;bottom:118px;z-index:99999;padding:6px 10px;font:12px ui-monospace,Consolas,monospace;background:#111;color:#fff;border:1px solid #7CFF9B;border-radius:6px;cursor:pointer";
  const out = document.createElement("div");
  out.style.cssText = "position:fixed;left:10px;bottom:150px;z-index:99999;padding:8px 10px;background:rgba(0,0,0,.88);color:#fff;font:12px/1.5 ui-monospace,Consolas,monospace;border-radius:6px;white-space:pre;display:none";
  document.body.appendChild(out); document.body.appendChild(btn);
  function passFn(y0, y1, step){
    return new Promise(function(res){
      window.scrollTo(0, y0);
      let y = y0, lastT = null; const dts = [];
      setTimeout(function(){
        requestAnimationFrame(function f(t){
          if(lastT !== null) dts.push(t - lastT);
          lastT = t; y += step; window.scrollTo(0, y);
          if(y < y1) requestAnimationFrame(f); else res(dts);
        });
      }, 700);
    });
  }
  function statOf(dts){
    const s = dts.slice().sort(function(a,b){ return a-b; });
    const q = function(p){ return s[Math.min(s.length-1, Math.floor(p*s.length))]; };
    const avg = dts.reduce(function(a,b){ return a+b; }, 0) / dts.length;
    return "média " + avg.toFixed(1) + "ms | p95 " + q(.95).toFixed(1) + "ms | pior " + s[s.length-1].toFixed(1) + "ms | >16,7ms: " + dts.filter(function(d){ return d > 16.7; }).length + " de " + dts.length;
  }
  btn.addEventListener("click", async function(){
    btn.disabled = true; btn.textContent = "rodando…";
    const line = document.querySelector("#iziPre04SimpleLine");
    const sts = ScrollTrigger.getAll().filter(function(s){ return s.trigger === line; }).sort(function(a,b){ return a.start - b.start; });
    const fr = sts[1], vh = innerHeight;
    const travA = fr.start + .35*vh + 300 + 205 + 50, travB = fr.end;
    const exitA = fr.end, exitB = fr.end + .85*vh;
    const modo = new URLSearchParams(location.search).get("saida") === "0" ? "SEM saída" : "COM saída";
    const res = [];
    for(const t of [["Travessia da faixa", travA, travB], ["Saída da palavra", exitA, exitB]]){
      const all = [];
      for(let k=0;k<3;k++){ const d = await passFn(t[1], t[2], 10); Array.prototype.push.apply(all, d); }
      res.push(t[0] + ": " + statOf(all));
    }
    out.style.display = "block";
    out.textContent = "[" + modo + " | tela " + innerWidth + "x" + innerHeight + "]\n" + res.join("\n");
    btn.disabled = false; btn.textContent = "▶ Testar de novo";
  });
  const frames = []; // {t, dt}
  let last = performance.now();
  function tick(now){
    const dt = now - last; last = now;
    frames.push({t: now, dt: dt});
    while(frames.length && now - frames[0].t > 2000) frames.shift();
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
  setInterval(function(){
    if(frames.length < 3) return;
    const dts = frames.map(function(f){ return f.dt; });
    const worst = Math.max.apply(null, dts);
    const avg = dts.reduce(function(a,b){ return a+b; }, 0) / dts.length;
    const slow = dts.filter(function(d){ return d > 20; }).length;
    const fps = 1000 / avg, fpsMin = 1000 / worst;
    box.style.color = fpsMin >= 50 ? "#7CFF9B" : (fpsMin >= 30 ? "#FFD84D" : "#FF6B6B");
    box.textContent = "FPS médio: " + fps.toFixed(0) + "\nFPS mínimo (2s): " + fpsMin.toFixed(0) + "\nPior quadro: " + worst.toFixed(1) + " ms\nQuadros >20ms: " + slow + " de " + dts.length;
  }, 250);
})();
