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
  // VARIANTES DE COMPARAÇÃO da entrada dos anéis (temporário, pra decidir):
  //   (sem parâmetro)  = opção 1: anéis acendem em sequência, do menor ao maior (PADRÃO, aprovada)
  //   ?aneis=abraco    = opção 2: metades de trás primeiro, depois as da frente
  //   ?aneis=onda      = opção 3: opção 1 + onda de luz só no núcleo
  //   ?aneis=desenho   = opção 4: anéis se desenham por máscara cônica (CARA em desempenho)
  //   ?aneis=expande   = opção 5: anéis nascem pequenos no centro e se expandem
  //   ?aneis=expandidos = versão 6: os ANÉIS entram MAIORES e bem expandidos e vão
  //                      encolhendo até o tamanho original conforme o scroll (os
  //                      triângulos, em tamanho normal, acompanham o anel deles)
  //   ?aneis=d1..d6    = opção 4 (desenho) USANDO A ROLAGEM QUE SOBRA (a entrada normal
  //                      dura <1 de timeline; o miolo livre vai de ~18.8 a ~24.4):
  //     d1 um anel por vez (sem sobreposição)      d2 lento, com sobreposição
  //     d3 um por vez, desenhando pros DOIS lados  d4 um por vez, serviços aparecem
  //     d5 = d3 + d4 (dois lados + serviços)          conforme o traço passa
  //     d6 um por vez com PAUSAS entre os anéis
  //   &ordem=fora      = em d1..d6, desenha do anel maior pro menor (padrão: menor → maior)
  const VARIANT = (function(){
    const v = (new URLSearchParams(location.search).get('aneis')||'').toLowerCase();
    return ['abraco','onda','desenho','expande','expandidos','d1','d2','d3','d4','d5','d6'].indexOf(v) >= 0 ? v : '';
  })();
  const ORDEM_FORA = (new URLSearchParams(location.search).get('ordem')||'').toLowerCase() === 'fora';
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
  let backLayer, frontLayer, glow, wave, waveI, ringsB=[], ringsF=[];
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
    if(VARIANT === 'onda'){
      // onda de luz do núcleo (só nesta variante): .orbit-wave fixa (achatada/
      // inclinada como os anéis, escrita em sync()), .orbit-wave-i é a escalada
      wave  = el('div','orbit-wave');
      waveI = el('div','orbit-wave-i');
      wave.appendChild(waveI);
      backC.append(glow, wave, backLayer, nodesBack, labelsBack);
    }else{
      backC.append(glow, backLayer, nodesBack, labelsBack);
    }

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
      // opção 5 (?aneis=expande): o scale entra no FIM da transformação, via
      // var --rs (animada pelo GSAP; 1 = tamanho final), então o anel cresce
      // uniformemente em torno do próprio centro (= centro comum dos anéis).
      // Nas outras variantes a string é a de sempre.
      const tr='rotate('+p.rot+'deg) scaleY('+p.sy+')' + ((VARIANT==='expande' || VARIANT==='expandidos') ? ' scale(var(--rs,1))' : '');
      const b=ringsB[i], f=ringsF[i];
      b.style.width=w; b.style.height=w; b.style.left=l; b.style.top=t; b.style.transform=tr;
      f.style.width=w; f.style.height=w; f.style.left=l; f.style.top=t; f.style.transform=tr;
    }
    if(wave){
      // onda (?aneis=onda): mesmo centro/inclinação dos anéis, tamanho do EXTERNO
      const wp=PLANES[3], wd=g.base*wp.scale;
      wave.style.width=wd+'px'; wave.style.height=wd+'px';
      wave.style.left=(g.cx-wd/2)+'px'; wave.style.top=(g.cy-wd/2)+'px';
      wave.style.transform='rotate('+wp.rot+'deg) scaleY('+wp.sy+')';
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
      const revAt = openAt + OPEN_DUR, revDur = OPEN_DUR*0.75;
      // revelação PROVISÓRIA = FADE-ONLY (sem scale-in). O scale nas camadas de
      // anéis forçava re-rasterização por frame do CSS pesado (box-shadow/
      // filter/mask/conic) e travava justo no deslize; opacity é composição
      // barata. A materialização definitiva vem depois (checkpoint).
      // Os anéis acendem em SEQUÊNCIA, de dentro pra fora (plano 0 = menor ...
      // 3 = maior), em vez de um fade único das duas camadas. Cada anel =
      // sua metade de trás + sua metade da frente juntas, junto com o
      // triângulo/rótulo do serviço que viaja nele (state.rr, lido em
      // solucao-nodes.js). Os containers (.s3o-back/.s3o-front) ligam NA HORA
      // em revAt (quem aparece aos poucos agora são os filhos). Tudo cabe na
      // MESMA janela de antes (revAt .. revAt+revDur): a duração da timeline e
      // os gatilhos de rolagem não mudam. Só opacidade (sem scale) — mesma
      // razão de antes: scale nas camadas dos anéis re-rasteriza CSS pesado.
      // VARIANTES (ver VARIANT no topo): o ramo padrão ('') é a opção 1; os
      // demais existem só pra COMPARAÇÃO via ?aneis=... e todos cabem na MESMA
      // janela (revAt .. revAt+revDur).
      tl.set(backC,  { autoAlpha:1 }, revAt);
      tl.set(frontC, { autoAlpha:1 }, revAt);
      Object.assign(state.rr, { p0:0, p1:0, p2:0, p3:0 });
      if(VARIANT === 'abraco'){
        // OPÇÃO 2 — anéis "abraçam" o documento: FASE A (1ª metade): metades de
        // TRÁS (ringsB) em sequência + brilho; FASE B (2ª metade): metades da
        // FRENTE (ringsF) fecham cada anel — triângulo/energia entram aqui.
        const HALF = revDur*0.25, HGAP = (revDur*0.5 - HALF)/3, PHASE_B = revAt + revDur*0.5;
        for(let k=0;k<4;k++){
          tl.fromTo(ringsB[k], { autoAlpha:0 }, { autoAlpha:1, ease:'power1.out', duration:HALF }, revAt + k*HGAP);
          tl.fromTo(ringsF[k], { autoAlpha:0 }, { autoAlpha:1, ease:'power1.out', duration:HALF }, PHASE_B + k*HGAP);
          tl.fromTo(state.rr, { ['p'+k]:0 }, { ['p'+k]:1, ease:'power1.out', duration:HALF }, PHASE_B + k*HGAP);
        }
        tl.fromTo(glow, { autoAlpha:0 }, { autoAlpha:1, ease:'power1.out', duration:HALF+HGAP }, revAt);
        if(layers.energy) tl.fromTo(layers.energy, { autoAlpha:0 }, { autoAlpha:1, ease:'power1.out', duration:HALF }, PHASE_B + 2*HGAP);
      }else if(/^d[1-6]$/.test(VARIANT)){
        // OPÇÃO 4 (desenho por máscara cônica) espalhada pela rolagem livre. Cada
        // anel = metade de trás + da frente com a mesma var --draw (0..1). Todos
        // os tweens ficam entre revAt (17.8) e ~23.5, antes do último trecho da
        // timeline (24.4→25.3) → duração e gatilhos não mudam.
        const CFG = {
          d1:{ dur:1.2, step:1.2 },
          d2:{ dur:3.0, step:0.9 },
          d3:{ dur:1.2, step:1.2, two:true },
          d4:{ dur:1.2, step:1.2, follow:true },
          d5:{ dur:1.2, step:1.2, two:true, follow:true },
          d6:{ dur:0.9, step:1.4 }
        }[VARIANT];
        const ORDER = ORDEM_FORA ? [3,2,1,0] : [0,1,2,3];   // planos, na ordem em que se desenham
        const EASE = 'power1.inOut';
        root.classList.add(CFG.two ? 's3o-rings-draw2' : 's3o-rings-draw');
        if(CFG.follow){
          // serviços aparecem conforme o traço passa por eles (lido em placeNodes)
          Object.assign(state.rr, { p0:1, p1:1, p2:1, p3:1 });
          state.dr = { p0:0, p1:0, p2:0, p3:0 };
          state.drTwo = !!CFG.two;
        }
        ORDER.forEach((k, i)=>{
          const at = revAt + i*CFG.step;
          const pair = [ringsB[k], ringsF[k]];
          gsap.set(pair, { visibility:'hidden', '--draw':0 });
          tl.set(pair, { visibility:'visible' }, at);
          tl.fromTo(pair, { '--draw':0 }, { '--draw':1, ease:EASE, duration:CFG.dur }, at);
          if(CFG.follow) tl.fromTo(state.dr, { ['p'+k]:0 }, { ['p'+k]:1, ease:EASE, duration:CFG.dur }, at);
          else tl.fromTo(state.rr, { ['p'+k]:0 }, { ['p'+k]:1, ease:'power1.out', duration:CFG.dur }, at);
          if(k === 2 && layers.energy) tl.fromTo(layers.energy, { autoAlpha:0 }, { autoAlpha:1, ease:'power1.out', duration:CFG.dur }, at);
        });
        tl.fromTo(glow, { autoAlpha:0 }, { autoAlpha:1, ease:'power1.out', duration:CFG.dur }, revAt);
      }else{
        // OPÇÃO 1 (padrão) + variantes 'onda' / 'desenho' / 'expande': mesma
        // sequência de dentro pra fora, mudando só COMO cada anel aparece.
        const RING_DUR = revDur*0.55;
        const RING_GAP = (revDur - RING_DUR)/3;
        const INVERT = VARIANT === 'expande' || VARIANT === 'expandidos';   // OPÇÃO 5 e 6: do maior (k=3) pro menor (k=0)
        const ENTRY_FROM = 2.2;   // escala de onde os anéis da versão 6 começam (fora, maiores)
        const GROWN = 1 + 0.5;   // escala em que a versão 6 termina a entrada (= 1+EXP abaixo)
        if(VARIANT === 'desenho') root.classList.add('s3o-rings-draw');   // OPÇÃO 4 (CSS .s3o-rings-draw)
        for(let k=0;k<4;k++){
          const at = revAt + (INVERT ? 3-k : k)*RING_GAP;
          const pair = [ringsB[k], ringsF[k]];
          if(VARIANT === 'desenho'){
            // máscara cônica revela o arco (var --draw 0..1); nasce embaixo, sentido horário
            gsap.set(pair, { visibility:'hidden', '--draw':0 });
            tl.set(pair, { visibility:'visible' }, at);
            tl.fromTo(pair, { '--draw':0 }, { '--draw':1, ease:'power1.inOut', duration:RING_DUR }, at);
          }else if(VARIANT === 'expande'){
            // OPÇÃO 5: nasce pequeno (--rs .12) no centro comum e cresce até o
            // tamanho final enquanto aparece (transform via var, ver sync()).
            tl.fromTo(pair, { autoAlpha:0, '--rs':0.12 }, { autoAlpha:1, '--rs':1, ease:'power2.out', duration:RING_DUR }, at);
          }else if(VARIANT === 'expandidos'){
            // VERSÃO 6: os anéis vêm DE FORA PRA DENTRO — nascem maiores que a escala
            // expandida (ENTRY_FROM), um do maior pro menor, e encolhem até GROWN
            // enquanto aparecem; depois o scroll encolhe até 1 (abaixo)
            tl.fromTo(pair, { autoAlpha:0, '--rs':ENTRY_FROM }, { autoAlpha:1, '--rs':GROWN, ease:'power2.out', duration:RING_DUR }, at);
          }else{
            tl.fromTo(pair, { autoAlpha:0 }, { autoAlpha:1, ease:'power1.out', duration:RING_DUR }, at);
          }
          tl.fromTo(state.rr, { ['p'+k]:0 }, { ['p'+k]:1, ease:'power1.out', duration:RING_DUR }, at);
        }
        // brilho central acompanha o começo (cobre a janela dos 2 primeiros anéis)
        tl.fromTo(glow, { autoAlpha:0 }, { autoAlpha:1, ease:'power1.out', duration:RING_DUR+RING_GAP }, revAt);
        // traço de energia do serviço selecionado (0 = Juramentada = plano 2)
        // aparece com o anel dele, senão ficaria solto antes do anel acender
        if(layers.energy) tl.fromTo(layers.energy, { autoAlpha:0 }, { autoAlpha:1, ease:'power1.out', duration:RING_DUR }, revAt + (INVERT ? 1 : 2)*RING_GAP);
        if(VARIANT === 'expandidos'){
          // VERSÃO 6: os ANÉIS aparecem GRANDES e bem expandidos (escala 1+EXP) —
          // os anéis fazem a entrada da opção 1 (fade em sequência) já nesse
          // tamanho — e DEPOIS que a entrada termina (revAt+revDur) encolhem até
          // o tamanho original, em velocidade proporcional ao scroll (ease:'none'),
          // usando a rolagem que sobra no fim da timeline (ela tem 25.3, a entrada
          // termina ~18.8; encolher leva SETTLE_DUR e termina ~21.8, sem passar
          // da duração total → gatilhos não mudam). Os triângulos NÃO mudam de
          // tamanho, mas o raio da órbita deles segue o mesmo fator dos anéis
          // (state.settle.v, lido em placeNodes: raio = 1 + EXP*(1-v), mesma reta
          // linear do --rs dos anéis), senão ficariam soltos fora do anel.
          // Ajustes: SETTLE_DUR (quanto de scroll) e EXP (.5 = anéis 1.5x no início).
          const SETTLE_DUR = 3.0, EXP = GROWN - 1;
          state.settleK = { exp:EXP, size:0 };
          state.settle  = { v:0 };
          tl.fromTo(state.settle, { v:0 }, { v:1, ease:'none', duration:SETTLE_DUR }, revAt + revDur);
          for(let k=0;k<4;k++){
            tl.fromTo([ringsB[k], ringsF[k]], { '--rs':1+EXP }, { '--rs':1, ease:'none', duration:SETTLE_DUR }, revAt + revDur);
          }
        }
        if(VARIANT === 'onda'){
          // OPÇÃO 3 (só no NÚCLEO): onda (só degradê, atrás do documento) nasce
          // no centro e se expande até um pouco além do núcleo (.orbit-glow,
          // diâmetro base*GLOW_K), em velocidade constante, e some. Não comanda
          // os anéis. O brilho do núcleo segue com o fade da opção 1 (acima).
          const WAVE_DUR = revDur*0.6;
          const S0 = 0.08, S1 = (GLOW_K/PLANES[3].scale)*1.15;
          tl.fromTo(waveI, { scale:S0 }, { scale:S1, ease:'none', duration:WAVE_DUR }, revAt);
          tl.fromTo(wave,  { autoAlpha:0 }, { autoAlpha:1, ease:'power1.out', duration:WAVE_DUR*0.2 }, revAt);
          tl.to(wave, { autoAlpha:0, ease:'power1.in', duration:WAVE_DUR*0.35 }, revAt + WAVE_DUR*0.7);
        }
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
