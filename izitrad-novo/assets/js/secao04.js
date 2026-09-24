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
      const h = line.offsetHeight;
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
      const h = line.offsetHeight;
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
          end:function(){ return `top bottom-=${(line.offsetHeight * F1) + BOTTOM_MARGIN}px`; },
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
      Array.from(txt).forEach(function(ch){
        const sp = document.createElement("span");
        sp.className = "izi-band-ch";
        sp.setAttribute("aria-hidden", "true");
        sp.textContent = ch;
        bandTextEl.appendChild(sp);
        bandChars.push(sp);
      });
    }
    let freezeTween = null;
    function setupSimplesFreeze(){
      if(!band || !simpleZoneEl || !simpleTitleEl) return;
      const stretchST = simplesStretchTween && simplesStretchTween.scrollTrigger;
      if(!stretchST) return;
      if(freezeTween){
        freezeTween.scrollTrigger.kill();
        freezeTween.kill();
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
      const FREEZE_VH = 60; // duração (scroll) só da parte da FAIXA (depois da desaceleração)
      const dec = simplesDecel;
      const vh = window.innerHeight;
      const bandPx = vh * (FREEZE_VH/100);
      const totalPx = dec.W + bandPx;
      const decFrac = totalPx ? dec.W / totalPx : 0; // parte da timeline gasta na desaceleração
      const bandFrac = 1 - decFrac;

      // layout do sticky (ver comentário acima)
      const h = line.offsetHeight;
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
      // 2) faixa (posição em .at = depois da desaceleração)
      .set(band,{opacity:1},decFrac)
      .to(band,{xPercent:0,ease:"none",duration:.25*bandFrac})
      // 3) a frase entra em sequência (letra por letra, blur→nítido, mesmo
      // efeito das outras frases da seção) SÓ depois que a faixa entrou
      // janela da frase = .40*bandFrac (era .25: as letras de "JEITO" passavam
      // rápido demais no scroll — ~95px pra 9 letras — e o efeito só era
      // perceptível no fim, no "IZI"), dividida na MESMA proporção da
      // pergunta (duration .2 / stagger total .32 → 38,5% / 61,5%)
      .fromTo(bandChars,{autoAlpha:0,filter:"blur("+BAND_BLUR_PX+"px)"},
        {autoAlpha:1,filter:"blur(0px)",ease:"none",duration:.40*bandFrac*(.2/.52),stagger:{amount:.40*bandFrac*(.32/.52)}})
      .to({},{duration:.10*bandFrac}) // segura a faixa visível um pouco antes de sumir
      .to(band,{opacity:0,ease:"none",duration:.25*bandFrac});
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
