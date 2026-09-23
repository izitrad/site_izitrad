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
    title.style.position = "relative";
    title.style.left = correction + "px";
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
    const BOTTOM_MARGIN=13;
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

    let simplesStretchTween = null;
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
      const FINAL_STRETCH = (window.innerHeight * TARGET_FILL_FACTOR) / inkHeight;
      if(simplesStretchTween){
        simplesStretchTween.scrollTrigger.kill();
        simplesStretchTween.kill();
      }
      simplesStretchTween = gsap.to(line,{
        scaleY:FINAL_STRETCH,scaleX:1,ease:"none",
        scrollTrigger:{
          trigger:line,
          start:`top bottom-=${BOTTOM_MARGIN}px`,
          end:function(){ return `top bottom-=${(line.offsetHeight * FINAL_STRETCH) + BOTTOM_MARGIN}px`; },
          scrub:true
        }
      });
    }

    // (window.__iziSimplesReady || Promise.resolve()) é defensivo — se o
    // outro IIFE não rodou por algum motivo, ainda cria a ScrollTrigger
    // (com a altura do fallback, melhor que nada) em vez de nunca criar.
    (window.__iziSimplesReady || Promise.resolve()).then(setupSimplesStretch);

    // Resize: fitSimples() (outro IIFE) recalcula o fontSize em até
    // ~120ms + 20 tentativas de rAF; espera 500ms (folga generosa acima
    // desse pior caso) antes de remedir a tinta e recriar o estica com o
    // FINAL_STRETCH certo pro novo tamanho — sem isso o cálculo ficaria
    // preso na proporção da tela anterior.
    let simplesResizeTimer;
    window.addEventListener("resize", function(){
      clearTimeout(simplesResizeTimer);
      simplesResizeTimer = setTimeout(setupSimplesStretch, 500);
    });
  }
})();
