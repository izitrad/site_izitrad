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

  const state = { ready:false };
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
            '<button data-nav="prev" aria-label="Anterior">←</button>'+
            '<button data-nav="next" aria-label="Próximo">→</button>'+
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
    if(introMovers.length) gsap.set(introMovers, { autoAlpha: 0, y: () => innerHeight*1.0 });
    if(ok){ gsap.set(backC,{autoAlpha:0}); gsap.set(frontC,{autoAlpha:0}); }

    // 1) documento faz sozinho centro → direita
    if(wrap && desktop){
      tl.fromTo(wrap, { x:0 }, { x:()=>innerWidth*DOC_SHIFT_X, ease:'power2.inOut', duration:OPEN_DUR }, openAt);
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
    titleLines.forEach((el, i)=>{
      tl.fromTo(el, { autoAlpha:0, y:()=>innerHeight*1.0 }, { autoAlpha:1, y:0, ease:'none', duration:INTRO_DUR }, introAt + i*LINE_STAGGER);
    });
    if(lead){
      const leadAt = introAt + titleLines.length*LINE_STAGGER + GROUP_GAP;
      tl.fromTo(lead, { autoAlpha:0, y:()=>innerHeight*1.0 }, { autoAlpha:1, y:0, ease:'none', duration:INTRO_DUR }, leadAt);
    }
    // 3) Saturno materializa no centro final (fade + scale-in PROVISÓRIO),
    //    cronometrado com a chegada do documento.
    if(ok){
      // SEQUENCIAL (conforme a Opção B): o deslize do documento termina PRIMEIRO
      // (openAt+OPEN_DUR); só DEPOIS os anéis materializam. Assim a primeira
      // rasterização das 8 camadas pesadas dos anéis NÃO cai no meio do trajeto
      // (que causava o "pulo") — acontece com o documento já parado.
      const revAt = openAt + OPEN_DUR, revDur = OPEN_DUR*0.75;
      // revelação PROVISÓRIA = FADE-ONLY (sem scale-in). O scale nas camadas de
      // anéis forçava re-rasterização por frame do CSS pesado (box-shadow/
      // filter/mask/conic) e travava justo no deslize; opacity é composição
      // barata. A materialização definitiva vem depois (checkpoint).
      tl.fromTo(backC,  { autoAlpha:0 }, { autoAlpha:1, ease:'power1.out', duration:revDur }, revAt);
      tl.fromTo(frontC, { autoAlpha:0 }, { autoAlpha:1, ease:'power1.out', duration:revDur }, revAt);
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
