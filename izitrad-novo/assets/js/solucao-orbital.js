/* =====================================================================
   IZITRAD — Seção 03 (v29N "orbital") · motor (parte clássica)
   ---------------------------------------------------------------------
   Arquitetura (Opção B, aprovada):
   - FASE 1 (transição 02→03, intacta): o DOCUMENTO real chega SOZINHO ao
     centro. Sem composição orbital em volta ainda.
   - FASE 2 (abertura): o documento faz a trajetória centro → posição FINAL
     (direita). O Saturno se materializa JÁ no CENTRO FINAL FIXO (nunca é
     montado no centro e arrastado). Só o documento faz o elo espacial.

   Este arquivo (clássico, ligado ao scrub da initSolucao):
   - cria TODA a estrutura de camadas (anéis, glow, nós/labels/ui/energia,
     popover) e a geometria FIXA final;
   - expõe getGeometry()/layers/ready para o módulo WebGL (solucao-nodes.js);
   - revela a composição (fade + scale-in PROVISÓRIO — a materialização
     definitiva dos anéis será desenvolvida depois, num checkpoint).
   ===================================================================== */
(function(){
  'use strict';

  // deslocamento vertical final do documento (fase de revelação do rótulo
  // "03 — A SOLUÇÃO", ver site.js) — FONTE ÚNICA compartilhada com o `cy`
  // abaixo, pra documento e centro do orbital nunca se desalinharem. Exposto
  // em window pra site.js (script separado, outro closure) ler o mesmo
  // valor. Calibração inicial — se mudar, só este número.
  window.DOC_FINAL_Y_OFFSET = 40;
  // Entrada dos anéis (ESCOLHIDA em 2026-11-05, antes "d6"): os 4 anéis se desenham um
  // por vez (de dentro pra fora), cada um por máscara cônica (var --draw 0..1, CSS
  // .s3o-rings-draw), com uma pausa entre eles — ver ANEL_DUR/ANEL_STEP em init().
  // NÚCLEO (o círculo rosa atrás da folha) — ESCOLHIDA em 2026-11-05 (antes "opção 5"): o núcleo
  // aparece PRIMEIRO, mais à direita do lugar final (NUCLEO_GX), cresce e acende ali (NUCLEO_LEAD
  // = 1.0 de rolagem) e depois desliza pra esquerda ao mesmo tempo em que a folha desliza pra
  // direita — os dois se encontram na posição final (OPEN_DUR); só então os anéis se desenham.
  // Pra isso o deslize e os anéis ficam NUCLEO_LEAD mais tarde na timeline (usa a rolagem que
  // sobra no fim; a duração, 25.3, não muda).
  // TEMPORÁRIO, só pra comparar: ?nucleo=antigo = SEM a animação nova do núcleo (a folha desliza
  // primeiro e o núcleo só faz fade junto do 1º anel). EXCLUIR depois de decidir (lembrete).
  const NUCLEO = new URLSearchParams(location.search).get('nucleo') !== 'antigo';
  const NUCLEO_LEAD = NUCLEO ? 1.0 : 0;
  const NUCLEO_GX = '15vw';   // o quanto o núcleo nasce à direita do lugar final
  // PULSO do núcleo (só na versão nova) — ESCOLHIDO em 2026-11-05: o pulso acontece quando a folha
  // e o núcleo se FUNDEM (fim do deslize) e, no FIM (quando o 4º anel termina), só o traço de
  // energia corre pelo anel. TEMPORÁRIO, só pra comparar: ?pulso=fim = o pulso no fim (junto do
  // traço de energia), sem pulso no encontro.
  const PULSO_FIM = new URLSearchParams(location.search).get('pulso') === 'fim';
  const DOC_SHIFT_X = 0.135;   // fração de innerWidth: centro → posição final (direita)
  const OPEN_DUR    = 1.3;     // duração (unidades da timeline) da abertura
  const FINAL_SCALE = 0.55;    // escala em que a transição assenta o documento
  const RING_K = 2.6;          // base = docHeightFinal * RING_K
  const GLOW_K = 0.44;
  const PLANES = [
    { sy:.47, rot:-8, scale:.68 },
    { sy:.49, rot:-8, scale:.86 },
    { sy:.51, rot:-8, scale:1.04 },
    { sy:.53, rot:-8, scale:1.22 }
  ];

  // rr = "fator de revelação" de cada anel (por PLANO, 0 = menor ... 3 = maior):
  // 0 -> 1 durante a abertura (ver init). O módulo dos triângulos
  // (solucao-nodes.js) multiplica a opacidade de cada nó/rótulo pelo fator do
  // anel em que ele viaja, então o triângulo aparece junto com o SEU anel.
  // Padrão 1 (tudo visível) pra nunca esconder nada se a timeline não rodar.
  const state = { ready:false, rr:{p0:1,p1:1,p2:1,p3:1} };
  let solStage, docStage, backC, frontC;
  let backLayer, frontLayer, glow, ringsB=[], ringsF=[];
  const layers = {};

  function el(tag, cls){ const e=document.createElement(tag); if(cls) e.className=cls; return e; }

  function build(root){
    if(state.built) return true;
    solStage = root.querySelector('.sol-stage');
    docStage = root.querySelector('.doc-stage');
    backC    = root.querySelector('.s3o-back');
    frontC   = root.querySelector('.s3o-front');
    if(!solStage || !docStage || !backC || !frontC) return false;

    // --- fundo (dentro de .s3o-back) ---
    glow = el('div','orbit-glow');
    backLayer  = el('div','saturn-back-layer');
    const nodesBack  = el('div','s3o-nodes-back');
    const labelsBack = el('div','s3o-labels-back');
    backC.append(glow, backLayer, nodesBack, labelsBack);

    // --- frente (dentro de .s3o-front) ---
    frontLayer = el('div','saturn-front-layer-v23');
    const nodesFront  = el('div','s3o-nodes-front');
    const labelsFront = el('div','s3o-labels-front');
    const nodesUI     = el('div','s3o-nodes-ui');
    const energy = document.createElementNS('http://www.w3.org/2000/svg','svg');
    energy.setAttribute('class','saturn-energy-layer');
    energy.innerHTML =
      '<defs><filter id="saturnEnergyGlow" x="-100%" y="-100%" width="300%" height="300%">'+
      '<feGaussianBlur stdDeviation="4.5" result="b"/><feMerge><feMergeNode in="b"/>'+
      '<feMergeNode in="SourceGraphic"/></feMerge></filter></defs>'+
      '<path class="saturn-energy-trail"></path>'+
      '<circle class="saturn-energy-head-glow" r="10"></circle>'+
      '<circle class="saturn-energy-head" r="4.5"></circle>';
    frontC.append(frontLayer, nodesFront, energy, labelsFront, nodesUI);

    // 4 anéis (metade traseira + frontal)
    for(let i=0;i<4;i++){
      const b=el('div','saturn-ring-v23 s3o-ring-'+(i+1));
      const f=el('div','saturn-ring-v23 s3o-ring-'+(i+1));
      backLayer.appendChild(b);  ringsB.push(b);
      frontLayer.appendChild(f); ringsF.push(f);
    }

    // --- detail / popover (nível viewport) ---
    const pop = el('div','s3o-popover');
    pop.setAttribute('aria-hidden','true');
    pop.innerHTML =
      '<div class="s3o-popover__backdrop"></div>'+
      '<section class="s3o-detail">'+
        '<div class="s3o-detail-top"><span class="s3o-index">01 / 04</span>'+
          '<div class="s3o-detail-nav">'+
            '<button data-nav="close" aria-label="Fechar">×</button>'+
          '</div></div>'+
        '<h2 class="s3o-detail-title">Serviço</h2>'+
        '<p class="s3o-detail-text"></p>'+
        '<ul class="s3o-detail-list"></ul>'+
        '<button class="s3o-cta">Solicitar orçamento →</button>'+
      '</section>';
    document.body.appendChild(pop);

    layers.backC=backC; layers.frontC=frontC;
    layers.nodesBack=nodesBack; layers.nodesFront=nodesFront;
    layers.labelsBack=labelsBack; layers.labelsFront=labelsFront;
    layers.nodesUI=nodesUI; layers.energy=energy; layers.glow=glow; layers.popover=pop;

    state.built=true;
    state.ready=true;
    return true;
  }

  /* CENTRO FINAL FIXO (posição da v29N, à direita). NÃO usa a posição ao
     vivo do documento — o Saturno nasce direto no lugar final. */
  function getGeometry(){
    const w = solStage ? solStage.clientWidth : innerWidth;
    const h = solStage ? solStage.clientHeight : innerHeight;
    const base = docStage ? docStage.offsetHeight * FINAL_SCALE * RING_K : h*0.5;
    // cy acompanha DOC_FINAL_Y_OFFSET (mesma constante que desloca o
    // documento na fase de revelação do rótulo, ver site.js) — só isso
    // muda; raio/escala/inclinação/timing do orbital continuam intactos.
    return { cx: w*(0.5+DOC_SHIFT_X), cy: h*0.5 + (window.DOC_FINAL_Y_OFFSET||0), base: base };
  }

  function sync(){
    if(!state.built) return;
    const g = getGeometry();
    if(!g.base) return;
    for(let i=0;i<4;i++){
      const p=PLANES[i], d=g.base*p.scale;
      const w=d+'px', l=(g.cx-d/2)+'px', t=(g.cy-d/2)+'px';
      const tr='rotate('+p.rot+'deg) scaleY('+p.sy+')';
      const b=ringsB[i], f=ringsF[i];
      b.style.width=w; b.style.height=w; b.style.left=l; b.style.top=t; b.style.transform=tr;
      f.style.width=w; f.style.height=w; f.style.left=l; f.style.top=t; f.style.transform=tr;
    }
    const gd=g.base*GLOW_K;
    glow.style.width=gd+'px'; glow.style.height=gd+'px'; glow.style.left=g.cx+'px'; glow.style.top=g.cy+'px';
    // revelação provisória = fade-only → nenhuma camada de anel recebe transform
    // do GSAP (sem scale/transform-origin), evitando re-rasterização por frame do
    // CSS pesado dos anéis durante a abertura. O glow segue centralizado só por
    // CSS translate(-50%,-50%) em (cx,cy).
    // avisa o módulo WebGL (se já ativo) que a geometria mudou
    if(state.onSync) state.onSync(g);
  }

  function init(root, tl, opts){
    opts = opts || {};
    const openAt  = (typeof opts.openAt === 'number') ? opts.openAt : 0;
    // introAt: instante em que o texto da coluna esquerda (.s3o-intro) entra
    // — por padrão seguia o abrir do orbital (openAt+0.15); agora, se vier
    // de fora (site.js passa LABEL_HIDE_AT), sincroniza com o nascimento do
    // rótulo "03 — A Solução" em vez disso. Cai pro comportamento antigo se
    // ninguém passar nada.
    const introAt = (typeof opts.introAt === 'number') ? opts.introAt : openAt+0.15;
    const desktop = matchMedia('(min-width: 761px)').matches;
    const wrap  = root.querySelector('.doc-orbit-wrap');
    const intro = root.querySelector('.s3o-intro');
    const ok = build(root);

    if(wrap)  gsap.set(wrap,  { x: 0 });
    // .s3o-intro em si só controla opacity/pointer-events do CONTAINER (fica
    // opacity:0 no CSS por padrão) — quem sobe de baixo é cada elemento por
    // dentro, individualmente (ver abaixo), não o container inteiro de uma
    // vez. innerHeight*1.0 garante que nasçam abaixo do documento de verdade
    // (documento ocupa ~31%-69% da viewport).
    //
    // título/subtítulo (.s3o-title-a/.s3o-title-b, os "textos grandes") sobem
    // LINHA POR LINHA (cada uma um .s3o-line, ver HTML/CSS) — não mais como
    // 2 blocos inteiros. O parágrafo (.s3o-lead) continua como bloco único
    // de propósito (pedido explícito: só os textos grandes ganham o efeito
    // por linha).
    const titleLines = intro ? Array.from(root.querySelectorAll('.s3o-title .s3o-line')) : [];
    const lead = intro ? root.querySelector('.s3o-lead') : null;
    const introMovers = lead ? titleLines.concat([lead]) : titleLines;
    if(intro) gsap.set(intro, { autoAlpha: 0 });
    // Efeito de BLUR palavra por palavra (o mesmo da pergunta da seção 04,
    // secao04.js): cada palavra vai de invisível+desfocada a nítida, uma
    // depois da outra. Os elementos que SOBEM (linhas do título e o
    // parágrafo) continuam subindo como antes (pedido da usuária: manter a
    // subida E acrescentar o blur); quem controla a opacidade agora são as
    // palavras — os elementos que sobem ficam sempre autoAlpha:1 (o
    // container .s3o-intro é quem esconde tudo antes do introAt).
    function splitWords(el){
      Array.from(el.childNodes).forEach(function(n){
        if(n.nodeType === 3){
          const parts = n.textContent.split(/(\s+)/);
          const frag = document.createDocumentFragment();
          parts.forEach(function(p){
            if(!p) return;
            if(/^\s+$/.test(p)){ frag.appendChild(document.createTextNode(' ')); return; }
            const w = document.createElement('span'); w.className = 's3o-w'; w.textContent = p; frag.appendChild(w);
          });
          n.parentNode.replaceChild(frag, n);
        }else if(n.nodeType === 1 && n.tagName !== 'BR'){
          splitWords(n);   // .s3o-hl (rosa) — mantém o span, divide o texto dentro
        }
      });
    }
    introMovers.forEach(splitWords);
    const wordsOf = introMovers.map(function(el){ return Array.from(el.querySelectorAll('.s3o-w')); });
    const BLUR_PX = () => innerWidth/1440*10;   // mesmo que a 04 (qScaleBase 1440)
    if(introMovers.length){
      gsap.set(introMovers, { autoAlpha: 1, y: () => innerHeight*1.0 });
      gsap.set(wordsOf.flat(), { autoAlpha: 0, filter: () => 'blur('+BLUR_PX()+'px)' });
    }
    if(ok){ gsap.set(backC,{autoAlpha:0}); gsap.set(frontC,{autoAlpha:0}); }

    // 1) documento faz sozinho centro → direita
    if(wrap && desktop){
      tl.fromTo(wrap, { x:0 }, { x:()=>innerWidth*DOC_SHIFT_X, ease:'power2.inOut', duration:OPEN_DUR }, openAt + NUCLEO_LEAD);
    }
    // 2) intro ocupa a esquerda — cada LINHA do título/subtítulo ainda sobe
    // no seu próprio momento, mas com uma defasagem BEM pequena entre elas
    // (LINE_STAGGER=0.025, era 0.08) — a usuária achou o bloco inteiro mais
    // forte que o efeito claramente picotado por linha, mas quis manter o
    // mecanismo por linha só com menos distância: cada linha ainda "chega"
    // separada (textura sutil de movimento), mas rápido o bastante pra ler
    // quase como bloco quando param juntas na posição final. O parágrafo
    // entra depois, como bloco único, com a mesma folga de antes (+0.18)
    // depois da última linha do subtítulo. O container (.s3o-intro) só
    // acompanha em opacity, sem seu próprio movimento — quem se move é
    // sempre um elemento específico.
    if(intro) tl.set(intro, { autoAlpha: 1 }, introAt);
    const LINE_STAGGER = 0.025;
    const GROUP_GAP = 0.18;
    // ease:'none' de propósito — já fazia parte da timeline escrubada (presa
    // ao scroll, não a um timer), mas 'power2.out' desacelerava no final,
    // dando uma sensação de suavização própria, meio dissociada da
    // velocidade real do scroll. 'none' é proporcional 1:1: anda exatamente
    // na medida em que a pessoa rola, para exatamente onde ela parar.
    //
    // duration esticada (era OPEN_DUR*0.55 ≈0.715, agora *0.7 ≈0.91): o
    // parágrafo (o último a começar) terminava de subir por volta de
    // t≈16.2, mas o documento só termina de assentar em t≈16.4 — sobrava um
    // trecho em que o texto já estava parado enquanto o resto ainda se
    // mexia, quebrando a sensação de "tudo caindo junto". Não mexe no
    // instante em que cada linha COMEÇA (introAt/LINE_STAGGER/GROUP_GAP
    // intactos) — só estica até onde cada uma TERMINA, reaproveitando o
    // espaço que já existe até o documento assentar, sem precisar mexer no
    // timing do documento.
    const INTRO_DUR = OPEN_DUR*0.7;
    // Cada bloco (linha do título / parágrafo): a SUBIDA dura INTRO_DUR como
    // antes; o BLUR das palavras só roda nos últimos 70% dessa janela
    // (REVEAL_FROM=.3) — nos primeiros 30% o texto ainda está abaixo da
    // tela, revelar ali seria revelar no escuro. As palavras terminam
    // EXATAMENTE junto com a subida (introAt..+INTRO_DUR), então a duração da
    // timeline não muda. Proporção stagger/duração = a da 04 (.04 / .2):
    // unit escala essa proporção pra caber na janela, qualquer nº de palavras.
    const REVEAL_FROM = 0.3;
    function addIntroBlock(el, words, at){
      tl.fromTo(el, { y:()=>innerHeight*1.0 }, { y:0, ease:'none', duration:INTRO_DUR }, at);
      const n = words.length; if(!n) return;
      const win = INTRO_DUR*(1-REVEAL_FROM);
      const unit = win/(0.2 + 0.04*(n-1));
      tl.fromTo(words,
        { autoAlpha:0, filter:()=>'blur('+BLUR_PX()+'px)' },
        { autoAlpha:1, filter:'blur(0px)', ease:'none', duration:0.2*unit, stagger:0.04*unit },
        at + INTRO_DUR*REVEAL_FROM);
    }
    titleLines.forEach((el, i)=>{
      addIntroBlock(el, wordsOf[i], introAt + i*LINE_STAGGER);
    });
    if(lead){
      const leadAt = introAt + titleLines.length*LINE_STAGGER + GROUP_GAP;
      addIntroBlock(lead, wordsOf[titleLines.length], leadAt);
    }
    // 3) Saturno materializa no centro final (fade + scale-in PROVISÓRIO),
    //    cronometrado com a chegada do documento.
    if(ok){
      // SEQUENCIAL (conforme a Opção B): o deslize do documento termina PRIMEIRO
      // (openAt+OPEN_DUR); só DEPOIS os anéis materializam. Assim a primeira
      // rasterização das 8 camadas pesadas dos anéis NÃO cai no meio do trajeto
      // (que causava o "pulo") — acontece com o documento já parado.
      const revAt = openAt + NUCLEO_LEAD + OPEN_DUR;
      // Só opacidade/máscara (sem scale) nas camadas dos anéis: scale re-rasteriza o
      // CSS pesado (box-shadow/filter/mask/conic) por frame e travava no deslize.
      // Cada anel = sua metade de trás + sua metade da frente juntas, junto com o
      // triângulo/rótulo do serviço que viaja nele (state.rr, lido em solucao-nodes.js).
      // Os containers (.s3o-back/.s3o-front) ligam NA HORA em revAt (quem aparece aos
      // poucos são os filhos).
      if(NUCLEO){
        // núcleo primeiro: o container de trás liga em openAt (só o glow/onda aparecem — os
        // anéis têm visibility própria e os nós/rótulos de trás ficam escondidos até revAt)
        gsap.set([layers.nodesBack, layers.labelsBack], { autoAlpha:0 });
        tl.set(backC, { autoAlpha:1 }, openAt);
        tl.set([layers.nodesBack, layers.labelsBack], { autoAlpha:1 }, revAt);
      }else{
        tl.set(backC,  { autoAlpha:1 }, revAt);
      }
      tl.set(frontC, { autoAlpha:1 }, revAt);
      Object.assign(state.rr, { p0:0, p1:0, p2:0, p3:0 });
      // Entrada dos anéis: um por vez, de dentro pra fora (planos 0 → 3), com pausa entre
      // eles. Todos os tweens ficam entre revAt (17.8) e ~22.9, antes do trecho final
      // da timeline (24.4 → 25.3) → duração (25.3) e gatilhos não mudam.
      const ANEL_DUR = 0.9, ANEL_STEP = 1.4;
      const EASE = 'power1.inOut';
      root.classList.add('s3o-rings-draw');
      [0,1,2,3].forEach((k, i)=>{
        const at = revAt + i*ANEL_STEP;
        const pair = [ringsB[k], ringsF[k]];
        gsap.set(pair, { visibility:'hidden', '--draw':0 });
        tl.set(pair, { visibility:'visible' }, at);
        tl.fromTo(pair, { '--draw':0 }, { '--draw':1, ease:EASE, duration:ANEL_DUR }, at);
        tl.fromTo(state.rr, { ['p'+k]:0 }, { ['p'+k]:1, ease:'power1.out', duration:ANEL_DUR }, at);
        // traço de energia do serviço selecionado (Juramentada = plano 2) aparece com o anel dele
        if(k === 2 && layers.energy) tl.fromTo(layers.energy, { autoAlpha:0 }, { autoAlpha:1, ease:'power1.out', duration:ANEL_DUR }, at);
      });
      // NÚCLEO (brilho central atrás da folha) — ver NUCLEO no topo. O tamanho e a posição entram
      // pelas vars --gs e --gx (CSS: translate(calc(-50% + var(--gx))) scale(var(--gs))); o GSAP
      // nunca escreve o transform do glow (senão ele sai do centro).
      if(NUCLEO){
        // nasce à direita (--gx), cresce/acende ali e, junto com o deslize da folha (mesmo início
        // e duração), desliza até o lugar final
        tl.fromTo(glow, { autoAlpha:0, '--gs':0.25, '--gx':NUCLEO_GX }, { autoAlpha:1, '--gs':1, '--gx':NUCLEO_GX, ease:'power2.out', duration:NUCLEO_LEAD }, openAt);
        tl.fromTo(glow, { '--gx':NUCLEO_GX }, { '--gx':'0vw', ease:'power2.inOut', duration:OPEN_DUR, immediateRender:false }, openAt + NUCLEO_LEAD);
      }else{
        // como antes: o brilho central acende (fade) junto do 1º anel
        tl.fromTo(glow, { autoAlpha:0 }, { autoAlpha:1, ease:'power1.out', duration:ANEL_DUR }, revAt);
      }
      if(NUCLEO){
        // PULSO do núcleo (brilho + um pouco maior, preso à rolagem e reversível): sobe até o pico
        // exatamente quando a folha e o núcleo se fundem (fim do deslize, = revAt) e decai junto do
        // começo dos anéis. No FIM, quando o 4º anel termina de se desenhar (FIM_AT), só o traço de
        // energia corre pelo anel do serviço selecionado (fireEnergy, tempo real, só ao rolar pra
        // FRENTE); depois sobra uma pausa até o fim da timeline (25.3). Com ?pulso=fim o pulso
        // acontece no FIM (junto do traço de energia) e não no encontro.
        const FIM_UP = 0.3, FIM_DOWN = PULSO_FIM ? 0.5 : 0.6, FIM_ESC = PULSO_FIM ? 1.1 : 1.15;
        const FIM_AT = revAt + 3*ANEL_STEP + ANEL_DUR;
        const PULSO_AT = PULSO_FIM ? FIM_AT : revAt - FIM_UP;
        const BRILHO = 'brightness(1.62) saturate(1.28)', NORMAL = 'brightness(1) saturate(1)';
        tl.fromTo(glow, { filter:NORMAL, '--gs':1 }, { filter:BRILHO, '--gs':FIM_ESC, ease:'power2.out', duration:FIM_UP, immediateRender:false }, PULSO_AT);
        tl.fromTo(glow, { filter:BRILHO, '--gs':FIM_ESC }, { filter:NORMAL, '--gs':1, ease:'power2.inOut', duration:FIM_DOWN, immediateRender:false }, PULSO_AT + FIM_UP);
        tl.call(function(){
          const sct = tl.scrollTrigger;
          if(sct && sct.direction > 0 && state.fireEnergy) state.fireEnergy(0);
        }, null, FIM_AT);
      }
      sync();
      addEventListener('resize', sync, {passive:true});
      if(window.ScrollTrigger && ScrollTrigger.addEventListener) ScrollTrigger.addEventListener('refresh', sync);
    }
  }

  window.SolucaoOrbital = {
    init: init,
    getGeometry: getGeometry,
    sync: sync,
    layers: layers,
    state: state,
    onSync: function(fn){ state.onSync = fn; }
  };
})();
