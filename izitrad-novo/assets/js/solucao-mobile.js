/* ===========================================================================
   SEÇÃO 03 — FINAL NO CELULAR: 4 PROTÓTIPOS PARA COMPARAÇÃO
   ---------------------------------------------------------------------------
   Só age com o parâmetro na URL E em tela < 900px (celular/tablet, onde os triângulos 3D da 03 estão fora — ver
   solucao-nodes.js). Sem o parâmetro, este arquivo sai na 1ª linha e NADA muda (desktop também não muda nunca).

     ?solucao=1  Cartões com triângulos planos: lista dos 4 serviços; tocar abre uma folha por baixo com os detalhes.
     ?solucao=2  Mini-órbita 2D: documento pequeno + anéis em SVG + 4 triângulos girando devagar; tocar abre a mesma folha.
     ?solucao=3  Um serviço por vez, ligado à rolagem (bloco "sticky", sem toque): o documento muda e o texto troca.
     ?solucao=4  "Qual é a sua?": mini-pergunta (2 perguntas) que indica o serviço e leva ao orçamento.
     ?solucao=6  A opção 5 INTEGRADA na rolagem da seção 03 (usa o espaço de scroll que sobra): texto sai, núcleo acende e os anéis entram um por vez, de dentro pra
                 fora, como no desktop, cada um com o seu triângulo (ligada à MESMA timeline via gancho window.S3M_HOOK chamado em solucao-orbital.js).
     ?solucao=5  Ideia da usuária (esboço): a ARTE REAL da cena orbital do desktop (anéis, núcleo, documento) encaixada no retrato em tela
                 cheia, como se tivesse um zoom; triângulos refeitos em SVG (mais leves) balançando sobre os anéis; tocar abre a folha.

   Todas terminam com o mesmo FECHO (frase + botão "Receber orçamento" + dica pra seção 04).

   O bloco é inserido logo DEPOIS de #solucao (fora do palco "sticky" da 03, então a timeline da seção não é tocada). Não usa
   desfoque (filter:blur) de propósito: o Safari do iPhone desenha "faixinhas" nas camadas do desfoque.
   Textos: os 4 serviços vêm de solucao-nodes.js (mesmos títulos/descrições/itens do popover do desktop). Perguntas do
   quiz, frase do fecho e rótulos são RASCUNHO de copy — a usuária/o jurídico confirmam. O botão do popover do desktop
   ("Solicitar orçamento") não tem destino ligado; aqui os botões levam a #orcamento (seção 07).
   =========================================================================== */
(function(){
  'use strict';
  var mm=/[?&]solucao=([1-6])(?:&|#|$)/.exec(location.search);
  if(!mm || innerWidth>=900) return;
  var host=document.getElementById('solucao');
  if(!host) return;

  var V=+mm[1];
  var gsap=window.gsap, ST=window.ScrollTrigger;
  var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  var root=document.documentElement;
  root.classList.add('s3v','s3v-'+V);
  if(gsap && ST) gsap.registerPlugin(ST);
  var canAnim=!!(gsap && ST) && !reduce;

  /* ----- dados (mesmos do popover do desktop, solucao-nodes.js) ----- */
  var SERV=[
    {n:'01', a:'Tradução', b:'Juramentada', text:'Traduções oficiais com validade legal no Brasil e no exterior.',
     list:['Documentos pessoais','Documentos acadêmicos','Documentos empresariais','Uso em órgãos oficiais']},
    {n:'02', a:'Tradução', b:'Certificada', text:'Traduções acompanhadas de certificação para instituições, empresas e processos específicos.',
     list:['Certificados e declarações','Documentos acadêmicos','Processos internacionais','Demandas institucionais']},
    {n:'03', a:'Tradução', b:'Técnica', text:'Conteúdo técnico traduzido com precisão, consistência terminológica e atenção ao contexto.',
     list:['Manuais e catálogos','Documentação corporativa','Conteúdo especializado','Materiais técnicos']},
    {n:'04', a:'Tradução', b:'Simples', text:'Traduções para usos cotidianos, profissionais e informativos, com agilidade e clareza.',
     list:['Textos pessoais','Conteúdo profissional','Materiais informativos','Demandas rápidas']}
  ];
  var APOSTILA={a:'Apostila', b:'de Haia', text:'Validação internacional do documento.'};

  /* triângulo da marca (mesmo traço do play do documento) */
  var TRI_D='M912.63,344.18l-326.98-188.78c-24.29-14.02-54.65,3.51-54.65,31.55v377.56c0,28.05,30.36,45.58,54.65,31.55l326.98-188.78c24.29-14.02,24.29-49.08,0-63.11Z';
  var TRI='<svg class="s3m-tri" viewBox="528 138 412 475" aria-hidden="true" focusable="false"><path d="'+TRI_D+'"/></svg>';
  var DEFS='<svg class="s3m-defs" width="0" height="0" aria-hidden="true" focusable="false"><defs>'+
    '<linearGradient id="s3mTriGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff5cc2"/><stop offset=".55" stop-color="#ff0099"/><stop offset="1" stop-color="#c4006f"/></linearGradient></defs></svg>';

  function el(tag,cls,html){ var e=document.createElement(tag); if(cls) e.className=cls; if(html!=null) e.innerHTML=html; return e; }
  function $$(sel,ctx){ return Array.prototype.slice.call((ctx||document).querySelectorAll(sel)); }

  /* ----- bloco ----- */
  var sec=el('section','s3m s3m--v'+V);
  sec.id='s3m'; sec.setAttribute('aria-label','Escolha o seu caso');
  sec.insertAdjacentHTML('afterbegin',DEFS);
  var inner=el('div','s3m-inner');
  sec.appendChild(inner);
  host.insertAdjacentElement('afterend',sec);

  /* ===================== FOLHA DE DETALHES (opções 1 e 2) ===================== */
  var sheet=null, sheetIdx=0, onSheetChange=function(){};
  function buildSheet(){
    sheet=el('div','s3m-sheet');
    sheet.setAttribute('aria-hidden','true');
    sheet.innerHTML=
      '<div class="s3m-sheet__bg" data-close></div>'+
      '<section class="s3m-sheet__panel" role="dialog" aria-modal="true" aria-label="Detalhes do serviço">'+
        '<div class="s3m-sheet__grip"><i></i></div>'+
        '<div class="s3m-sheet__top"><span class="s3m-sheet__idx"></span>'+
          '<div class="s3m-sheet__nav"><button type="button" data-d="-1" aria-label="Serviço anterior">&#8249;</button>'+
          '<button type="button" data-d="1" aria-label="Próximo serviço">&#8250;</button>'+
          '<button type="button" data-close aria-label="Fechar">&#215;</button></div></div>'+
        '<h3 class="s3m-sheet__title"></h3><p class="s3m-sheet__text"></p><ul class="s3m-sheet__list"></ul>'+
        '<a class="s3m-cta" href="#orcamento" data-close>Solicitar orçamento</a>'+
      '</section>';
    document.body.appendChild(sheet);
    var panel=sheet.querySelector('.s3m-sheet__panel');
    sheet.addEventListener('click',function(e){
      var c=e.target.closest('[data-close]'); if(c){ closeSheet(); return; }
      var d=e.target.closest('[data-d]'); if(d){ fill((sheetIdx+ +d.getAttribute('data-d')+SERV.length)%SERV.length); }
    });
    document.addEventListener('keydown',function(e){ if(e.key==='Escape') closeSheet(); });
    /* arrastar a alça pra baixo fecha */
    var grip=sheet.querySelector('.s3m-sheet__grip'), y0=null, dy=0;
    grip.addEventListener('touchstart',function(e){ y0=e.touches[0].clientY; dy=0; panel.style.transition='none'; },{passive:true});
    grip.addEventListener('touchmove',function(e){ if(y0==null) return; dy=Math.max(0,e.touches[0].clientY-y0); panel.style.transform='translateY('+dy+'px)'; },{passive:true});
    grip.addEventListener('touchend',function(){ if(y0==null) return; panel.style.transition=''; panel.style.transform=''; if(dy>90) closeSheet(); y0=null; });
  }
  function fill(i){
    sheetIdx=i; var s=SERV[i];
    sheet.querySelector('.s3m-sheet__idx').textContent=s.n+' / 0'+SERV.length;
    sheet.querySelector('.s3m-sheet__title').innerHTML=s.a+'<br>'+s.b;
    sheet.querySelector('.s3m-sheet__text').textContent=s.text;
    sheet.querySelector('.s3m-sheet__list').innerHTML=s.list.map(function(x){ return '<li>'+x+'</li>'; }).join('');
    onSheetChange(i);
  }
  function openSheet(i){
    fill(i);
    sheet.setAttribute('aria-hidden','false'); sheet.classList.add('open'); root.classList.add('s3m-sheet-open');
    onSheetChange(i,true);
  }
  function closeSheet(){
    if(!sheet) return;
    sheet.setAttribute('aria-hidden','true'); sheet.classList.remove('open'); root.classList.remove('s3m-sheet-open');
    onSheetChange(sheetIdx,false,true);
  }

  function reveal(els,trigger,stagger){
    if(!canAnim) return;
    gsap.from(els,{autoAlpha:0,y:30,duration:.7,ease:'power3.out',stagger:stagger==null?.1:stagger,
      scrollTrigger:{trigger:trigger||els[0],start:'top 88%',once:true}});
  }

  /* ===================== OPÇÃO 1 — cartões com triângulos planos ===================== */
  function buildV1(){
    inner.innerHTML=
      '<p class="s3m-kicker">Toque para ver os detalhes</p>'+
      '<ul class="s3m-rows">'+SERV.map(function(s,i){
        return '<li><button type="button" class="s3m-row'+(i===0?' is-hint':'')+'" data-i="'+i+'">'+TRI+
          '<span class="s3m-row__txt"><small>'+s.n+' / '+s.a.toUpperCase()+'</small><b>'+s.b+'</b><span>'+s.text+'</span></span>'+
          '<span class="s3m-plus" aria-hidden="true">+</span></button></li>';
      }).join('')+'</ul>';
    var list=inner.querySelector('.s3m-rows');
    list.addEventListener('click',function(e){
      var b=e.target.closest('.s3m-row'); if(!b) return;
      list.querySelectorAll('.is-hint').forEach(function(x){ x.classList.remove('is-hint'); });
      openSheet(+b.getAttribute('data-i'));
    });
    reveal($$('.s3m-rows li',inner),list,.12);
  }

  /* ===================== OPÇÃO 2 — mini-órbita em 2D ===================== */
  function buildV2(){
    var RINGS=[{rx:158,ry:92,w:7},{rx:126,ry:73,w:10},{rx:92,ry:53,w:13}];   /* w = graus por segundo */
    var CFG=[{ring:0,a:-35},{ring:1,a:80},{ring:2,a:215},{ring:0,a:145}];     /* anel e ângulo inicial de cada serviço */
    var TILT=-14, CX=200, CY=180;
    var ell=RINGS.map(function(r,i){ return '<ellipse cx="'+CX+'" cy="'+CY+'" rx="'+r.rx+'" ry="'+r.ry+'" style="opacity:'+[1,.75,.55][i]+'"/>'; }).join('');
    inner.innerHTML=
      '<p class="s3m-kicker">Toque num triângulo</p>'+
      '<div class="s3m-orbit">'+
        '<svg class="s3m-rings" viewBox="0 0 400 360" aria-hidden="true"><g transform="rotate('+TILT+' '+CX+' '+CY+')">'+ell+'</g></svg>'+
        '<div class="s3m-doc" aria-hidden="true"><img class="s3m-doc__logo" src="assets/img/hero-logo-full.svg?v=2" alt="">'+
          '<b class="s3m-doc__t">DIPLOMA</b><span class="s3m-doc__s">DE GRADUAÇÃO</span>'+
          '<i class="s3m-doc__ln"></i><i class="s3m-doc__ln s"></i><i class="s3m-doc__map"></i>'+
          '<span class="s3m-doc__bar"><svg viewBox="528 138 412 475"><path d="'+TRI_D+'"/></svg></span></div>'+
        SERV.map(function(s,i){
          return '<button type="button" class="s3m-node'+(i===0?' is-hint':'')+'" data-i="'+i+'" aria-label="'+s.a+' '+s.b+'"><span class="s3m-node__in">'+TRI+
            '<span class="s3m-node__lb">'+s.b+'</span></span></button>';
        }).join('')+
      '</div>';
    var orbit=inner.querySelector('.s3m-orbit'), nodes=$$('.s3m-node',orbit);
    var rad=Math.PI/180, cosT=Math.cos(TILT*rad), sinT=Math.sin(TILT*rad);
    function place(){
      var k=orbit.clientWidth/400;
      nodes.forEach(function(n,i){
        var c=CFG[i], r=RINGS[c.ring], th=c.a*rad;
        var x=r.rx*Math.cos(th), y=r.ry*Math.sin(th);
        var X=CX+x*cosT-y*sinT, Y=CY+x*sinT+y*cosT, d=Math.sin(th);     /* d>0 = lado da frente */
        gsap.set(n,{x:X*k,y:Y*k,xPercent:-50,yPercent:-50,scale:.84+.22*(d+1)/2,zIndex:d>0?8:3,opacity:d>0?1:.78});
      });
    }
    if(!gsap){ return; }
    place();
    var inView=false, running=false;
    function tick(t,dt){ dt=Math.min(dt,60); CFG.forEach(function(c){ c.a+=RINGS[c.ring].w*dt/1000; }); place(); }
    function sync(){
      var want=inView && !reduce && !root.classList.contains('s3m-sheet-open') && !document.hidden;
      if(want && !running){ gsap.ticker.add(tick); running=true; }
      else if(!want && running){ gsap.ticker.remove(tick); running=false; }
    }
    if('IntersectionObserver' in window) new IntersectionObserver(function(es){ inView=es[0].isIntersecting; sync(); },{rootMargin:'120px'}).observe(orbit);
    else { inView=true; sync(); }
    document.addEventListener('visibilitychange',sync);
    onSheetChange=function(){ sync(); };
    addEventListener('resize',place,{passive:true});
    orbit.addEventListener('click',function(e){
      var b=e.target.closest('.s3m-node'); if(!b) return;
      nodes.forEach(function(x){ x.classList.remove('is-hint'); });
      openSheet(+b.getAttribute('data-i'));
    });
    if(canAnim){
      gsap.from(orbit.querySelector('.s3m-rings'),{autoAlpha:0,scale:.7,duration:1,ease:'power3.out',scrollTrigger:{trigger:orbit,start:'top 85%',once:true}});
      gsap.from(orbit.querySelector('.s3m-doc'),{autoAlpha:0,scale:.6,duration:.9,delay:.1,ease:'back.out(1.4)',scrollTrigger:{trigger:orbit,start:'top 85%',once:true}});
      gsap.from($$('.s3m-node__in',orbit),{autoAlpha:0,scale:.3,duration:.7,stagger:.12,delay:.35,ease:'back.out(1.8)',scrollTrigger:{trigger:orbit,start:'top 85%',once:true}});
    }
  }

  /* ===================== OPÇÃO 3 — um serviço por vez, ligado à rolagem ===================== */
  function buildV3(){
    inner.innerHTML=
      '<div class="s3m-seq"><div class="s3m-seq__pin">'+
        '<p class="s3m-kicker s3m-seq__k">Passo <b>1</b> / 4</p>'+
        '<div class="s3m-seq__doc"><div class="s3m-doc s3m-doc--big" aria-hidden="true"><img class="s3m-doc__logo" src="assets/img/hero-logo-full.svg?v=2" alt="">'+
          '<b class="s3m-doc__t">DIPLOMA</b><span class="s3m-doc__s">DE GRADUAÇÃO</span><i class="s3m-doc__ln"></i><i class="s3m-doc__ln s"></i><i class="s3m-doc__map"></i>'+
          '<span class="s3m-doc__bar"><svg viewBox="528 138 412 475"><path d="'+TRI_D+'"/></svg></span></div>'+
          SERV.map(function(s,i){ return '<span class="s3m-chip" data-i="'+i+'">'+TRI+s.b+'</span>'; }).join('')+
        '</div>'+
        '<div class="s3m-seq__panels">'+SERV.map(function(s,i){
          return '<div class="s3m-panel" data-i="'+i+'"><h3>'+s.a+'<br>'+s.b+'</h3><p>'+s.text+'</p><ul>'+
            s.list.map(function(x){ return '<li>'+x+'</li>'; }).join('')+'</ul></div>';
        }).join('')+'</div>'+
        '<div class="s3m-seq__dots" aria-hidden="true">'+SERV.map(function(){ return '<i></i>'; }).join('')+'</div>'+
      '</div></div>';
    var seq=inner.querySelector('.s3m-seq'), panels=$$('.s3m-panel',seq), chips=$$('.s3m-chip',seq),
        dots=$$('.s3m-seq__dots i',seq), kN=seq.querySelector('.s3m-seq__k b'), doc=seq.querySelector('.s3m-doc');
    var TILTS=[-8,5,-3,7];
    function mark(i){ dots.forEach(function(d,j){ d.classList.toggle('on',j===i); }); kN.textContent=i+1; }
    if(!canAnim){ panels.forEach(function(p,i){ p.style.opacity=i===0?1:0; }); chips.forEach(function(c,i){ c.style.opacity=i===0?1:0; }); mark(0); return; }
    gsap.set(panels,{autoAlpha:0,y:40}); gsap.set(chips,{autoAlpha:0,y:12,scale:.9});
    gsap.set(panels[0],{autoAlpha:1,y:0}); gsap.set(chips[0],{autoAlpha:1,y:0,scale:1}); gsap.set(doc,{rotation:TILTS[0]});
    var tl=gsap.timeline({defaults:{ease:'power2.inOut'}});
    tl.to({},{duration:SERV.length});
    for(var i=0;i<SERV.length-1;i++){
      tl.to(panels[i],{autoAlpha:0,y:-34,duration:.2},i+.78)
        .fromTo(panels[i+1],{autoAlpha:0,y:40},{autoAlpha:1,y:0,duration:.22},i+.88)
        .to(chips[i],{autoAlpha:0,y:-12,scale:.9,duration:.2},i+.78)
        .fromTo(chips[i+1],{autoAlpha:0,y:12,scale:.9},{autoAlpha:1,y:0,scale:1,duration:.22},i+.88)
        .to(doc,{rotation:TILTS[i+1],duration:.4},i+.7);
    }
    ST.create({trigger:seq,start:'top top',end:'bottom bottom',animation:tl,scrub:.4,
      onUpdate:function(self){ mark(Math.min(SERV.length-1,Math.floor(self.progress*SERV.length+.06))); }});
    mark(0);
  }

  /* ===================== OPÇÃO 4 — "Qual é a sua?" ===================== */
  function buildV4(){
    var Q=[
      {q:'Para que você vai usar a tradução?',o:[
        ['Um órgão oficial vai exigir (consulado, juízo, universidade, cartório)',0],
        ['Uma instituição ou processo pede certificação',1],
        ['É um texto técnico (manual, catálogo, contrato)',2],
        ['Só preciso entender o conteúdo',3]]},
      {q:'O documento vai ser usado em outro país?',o:[['Sim',1],['Não',0],['Ainda não sei',0]]}
    ];
    var ans=[];
    inner.innerHTML='<p class="s3m-kicker">Qual é a sua? Responda em 2 passos</p><div class="s3m-quiz"></div>';
    var box=inner.querySelector('.s3m-quiz');
    function swap(html,cb,first){
      if(!canAnim||first){ box.innerHTML=html; cb&&cb(); return; }
      gsap.to(box,{autoAlpha:0,y:-14,duration:.18,onComplete:function(){ box.innerHTML=html; cb&&cb(); gsap.fromTo(box,{autoAlpha:0,y:18},{autoAlpha:1,y:0,duration:.32,ease:'power2.out'}); }});
    }
    function step(n,first){
      var q=Q[n];
      swap('<p class="s3m-quiz__n">Pergunta '+(n+1)+' de '+Q.length+'</p><h3 class="s3m-quiz__q">'+q.q+'</h3>'+
        '<div class="s3m-quiz__opts">'+q.o.map(function(o,i){ return '<button type="button" class="s3m-opt" data-v="'+o[1]+'">'+o[0]+'</button>'; }).join('')+'</div>',null,first);
    }
    function result(){
      var s=SERV[ans[0]], ap=ans[1]===1 && ans[0]<=1;
      swap('<p class="s3m-quiz__n">Pra você, a mais indicada</p><h3 class="s3m-quiz__r">'+s.a+'<br>'+s.b+'</h3><p class="s3m-quiz__t">'+s.text+'</p>'+
        (ap?'<p class="s3m-quiz__ap">'+TRI+'<span><b>+ '+APOSTILA.a+' '+APOSTILA.b+'</b><br>'+APOSTILA.text+'</span></p>':'')+
        '<ul class="s3m-quiz__l">'+s.list.map(function(x){ return '<li>'+x+'</li>'; }).join('')+'</ul>'+
        '<a class="s3m-cta" href="#orcamento">Pedir orçamento</a><button type="button" class="s3m-redo">Refazer</button>');
    }
    box.addEventListener('click',function(e){
      var o=e.target.closest('.s3m-opt');
      if(o){ ans.push(+o.getAttribute('data-v')); if(ans.length<Q.length) step(ans.length); else result(); return; }
      if(e.target.closest('.s3m-redo')){ ans=[]; step(0); }
    });
    step(0,true);
    reveal([box],box,0);
  }

  /* ===================== OPÇÃO 5 — ideia da usuária: a ARTE REAL da 03, com "zoom", em tela cheia ===================== */
  /* Reaproveita a arte pronta da cena orbital do desktop (mesmas classes/CSS de solucao-orbital.css): os 4 anéis Saturno (metade de trás
     atrás do documento, metade da frente na frente), o NÚCLEO (.orbit-glow) e o DOCUMENTO REAL (clone de .doc, com o selo). A cena é
     encaixada no retrato como se tivesse levado um zoom (o núcleo ocupa ~62% da largura; os anéis, maiores que a tela, saem pelas bordas).
     MESMA geometria e MESMO movimento do desktop (solucao-orbital.js / solucao-nodes.js): anéis com os 4 planos de escala e achatamento
     originais (rotação -8°), os 4 triângulos igualmente espaçados girando pelos anéis (começam com o 1º no topo, mesma velocidade),
     escala/opacidade por profundidade, e tocar num triângulo gira o anel até ele ficar no topo e abre a folha (como o popover do desktop).
     Os triângulos 3D (WebGL) viram SVG planos. */
  function buildV5(){
    var RAD=Math.PI/180;
    /* ?forma= como a arte preenche o retrato (o esboço dela ocupa a tela inteira: núcleo grande, arcos perto do topo e do fim):
         2 (padrão) = anéis na orientação do desktop (inclinação -8°, mesma escala), mas esticados na vertical (quase círculos) pra os arcos
                      chegarem perto do topo e do fim da tela — a mais parecida com o esboço;
         3          = a MESMA arte do desktop (anéis achatados, mesma escala e inclinação) GIRADA 90°: o eixo longo dos anéis fica na vertical;
         1          = a cena do desktop como está (faixa horizontal achatada), só com zoom. */
    var fm=/[?&]forma=([1234])(?:&|#|$)/.exec(location.search), FORMA=fm?+fm[1]:4;
    /* SEM o documento por enquanto (pedido dela: trabalhar só com a arte — anéis, núcleo e triângulos — e inserir a folha depois). &folha=1 liga. */
    var WITH_DOC=/[?&]folha=1(?:&|#|$)/.test(location.search);
    /* inclinação dos anéis: a da arte original é -8°, mas como aqui só aparecem pedaços de anéis enormes, a linha visível sobe menos (~6°) do que
       na arte (referência dela: ~9° nas linhas de baixo e de trás). Na forma 1 uso -12° pra a inclinação VISÍVEL ficar como a da arte;
       &incl=NN ajusta (graus, positivo = sobe pra direita). */
    var im=/[?&]incl=(\d{1,2})(?:&|#|$)/.exec(location.search), INCL=im?+im[1]:12;
    var TILT_DEG=FORMA===3?82:(FORMA===1?-INCL:-8), TILT=TILT_DEG*RAD, cosT=Math.cos(TILT), sinT=Math.sin(TILT);
    var DOC_NAT=446, DOC_AR=.72, RING_K=2.6, GLOW_K=.44;                   /* largura natural do .doc (31vw a 1440) e constantes do orbital */
    var PLANES=[{s:.68,sy:.47},{s:.86,sy:.49},{s:1.04,sy:.51},{s:1.22,sy:.53}];   /* PLANES de solucao-orbital.js (escala e achatamento de cada anel) */
    var RYF=[.22,.30,.38,.45];                                             /* forma 2: meia-altura alvo de cada anel (fração da altura da cena) */
    /* forma 1: cada anel mantém o achatamento (sy) e a inclinação (-8°) ORIGINAIS, mas é dimensionado pela meia-altura (fração da altura da
       tela) em vez de pelo núcleo: o eixo longo fica bem maior que a tela, então só os ARCOS de cima e de baixo aparecem, nas extremidades,
       levemente curvos e inclinados, e o meio fica livre pro núcleo (que ocupa quase a largura toda). */
    var RYF1=[.28,.34,.40,.45];
    var S2P=[2,0,1,3];                                                     /* serviço -> plano (serviceToPlane de solucao-nodes.js) */
    /* forma 4 (PADRÃO) = IDÊNTICA à imagem de referência dela (375x841). Só a METADE DE BAIXO da imagem era dela (a de cima era a minha, sem alteração);
       ajustei elipses às 3 linhas de baixo e elas batem com os anéis ORIGINAIS do desktop (rotação -8°, planos .68/.86/1.04/1.22 e achatamento
       .47/.49/.51/.53): erro de 2,6px com centro (113,394) e escala base=1630 (px da imagem). Os arcos de CIMA saem dessas mesmas elipses (antes eu
       desenhava com outra curvatura). Núcleo: centro (186,397), diâmetro 90,4% da largura. Triângulos: posição, tamanho e inclinação medidos na imagem
       (os de trás, em cima, menores; os da frente, embaixo, ~1,4x; "Simples" inclinado -7° junto com o rótulo). Coordenadas em px da imagem 375x841. */
    var REF={W:375,H:841,cx:113.2,cy:394,base:1630,gx:186,gy:397};
    var TREF=[{x:97.5,y:62,s:.89,r:0,snap:0},{x:299.5,y:146.5,s:.84,r:0,snap:0},{x:49,y:655.5,s:1.32,r:0,snap:0},{x:320.5,y:703.5,s:1.10,r:-7,snap:0}];
    /* o "zoom": diâmetro do núcleo como fração da largura da tela (padrão 78% como no esboço; 47% na forma 1). &zoom=60, &zoom=90... muda. */
    var zm=/[?&]zoom=(\d{2})(?:&|#|$)/.exec(location.search);
    var ZOOM_CORE=zm ? Math.max(.35,Math.min(.99,+zm[1]/100)) : (FORMA===4?.904:(FORMA===1?.9:.78));
    /* triângulos PARADOS (decisão dela), no lugar do esboço (fração da cena), sobre o ponto do anel do serviço mais perto desse lugar */
    var TG=FORMA===1
      ? [{x:.27,y:.11},{x:.80,y:.23},{x:.19,y:.86},{x:.68,y:.93}]       /* forma 1: 2 triângulos nos arcos de cima e 2 nos de baixo (como no esboço) */
      : [{x:.33,y:.13},{x:.88,y:.21},{x:.17,y:.72},{x:.66,y:.88}];      /* formas 2 e 3 (tela cheia): cantos do esboço */
    /* Juramentada topo-esq., Certificada topo-dir., Técnica baixo-esq., Simples baixo-dir. */
    /* Anéis em SVG (3 traços: halo + fio + brilho, sem máscara/sombra/filtro) = PADRÃO. Motivos: com os anéis CSS gigantes aparecem retângulos/faixas
       de desenho errado (viram retângulos escuros atrás dos triângulos no print de referência dela e uma faixa translúcida no meu teste) e o peso
       é ~7x maior. &leve=0 volta aos anéis CSS originais (tubo com máscara, sombra e reflexo) pra comparar. */
    var LEVE=!/[?&]leve=0(?:&|#|$)/.test(location.search);
    function ringsHTML(){ return LEVE ? '<svg class="s3m-rsvg" aria-hidden="true"><g class="s3m-rg"></g></svg>' : [0,1,2,3].map(function(){ return '<div class="saturn-ring-v23"></div>'; }).join(''); }
    inner.innerHTML=
      '<div class="s3m-uni s3m-uni--f'+FORMA+'">'+
        '<div class="orbit-glow s3m-glow" aria-hidden="true"></div>'+
        '<div class="saturn-back-layer s3m-lay s3m-lay--b" aria-hidden="true">'+ringsHTML()+'</div>'+
        '<div class="s3m-docr" aria-hidden="true"></div>'+
        '<div class="saturn-front-layer-v23 s3m-lay s3m-lay--f" aria-hidden="true">'+ringsHTML()+'</div>'+
        SERV.map(function(s,i){
          return '<button type="button" class="s3m-node'+(i===0?' is-hint':'')+'" data-i="'+i+'" aria-label="'+s.a+' '+s.b+'"><span class="s3m-node__in">'+TRI+
            '<span class="s3m-node__lb">'+s.b+'</span></span></button>';
        }).join('')+
      '</div>';
    var uni=inner.querySelector('.s3m-uni'), glow=uni.querySelector('.s3m-glow'), docr=uni.querySelector('.s3m-docr'),
        ringsB=$$('.s3m-lay--b .saturn-ring-v23',uni), ringsF=$$('.s3m-lay--f .saturn-ring-v23',uni), nodes=$$('.s3m-node',uni),
        svgB=uni.querySelector('.s3m-lay--b .s3m-rsvg'), svgF=uni.querySelector('.s3m-lay--f .s3m-rsvg');

    /* documento real: clona DEPOIS que o site.js montou o QR e posicionou o selo (inline em %) */
    function fillDoc(){
      var real=document.querySelector('.doc-mouse .doc'); if(!real) return;
      var c=real.cloneNode(true); c.removeAttribute('style'); c.classList.remove('is-dragging');
      $$('[id]',c).forEach(function(e){ e.removeAttribute('id'); });
      docr.innerHTML=''; docr.appendChild(c);
      /* selo: no celular o site.js não o posiciona (documento escondido -> medida 0), então calcula aqui com a MESMA fórmula do
         relocateSeal() (centro em 90%/88% do mapa, largura 74% do mapa), medindo o clone sem rotação/escala */
      var seal=document.querySelector('.selo-layer .doc__seal');
      if(seal){
        var layer=el('div','s3m-selo'), im=seal.cloneNode(true);
        im.removeAttribute('style'); layer.appendChild(im); docr.appendChild(layer);
        var map=c.querySelector('.doc__map');
        if(map){
          docr.style.transition='none'; docr.style.transform='none';
          var mr=map.getBoundingClientRect(), dr=c.getBoundingClientRect();
          docr.style.transform=''; docr.style.transition='';
          if(mr.width && dr.width){
            im.style.left=((mr.left+mr.width*.90-dr.left)/dr.width*100).toFixed(3)+'%';
            im.style.top=((mr.top+mr.height*.88-dr.top)/dr.height*100).toFixed(3)+'%';
            im.style.width=(mr.width*.74/dr.width*100).toFixed(3)+'%';
          }
        }
      }
      docr.classList.add('on');
    }
    if(WITH_DOC){
      if(document.readyState==='complete') setTimeout(fillDoc,500);
      else addEventListener('load',function(){ setTimeout(fillDoc,500); });
    }

    /* Elipses medidas na referência (px da imagem 375x841). METADE DE CIMA (camada de trás) e METADE DE BAIXO (camada da frente) têm cada uma o seu conjunto:
       ajustei as 4 linhas de cima (erro 0,15px, rotação -7,99°) e as 3 de baixo (erro 1,0px, rotação -8°) separadamente, pra a curvatura de cima e a de
       baixo ficarem EXATAMENTE como na imagem. */
    var TOPSET={cx:173.7,cy:306.5,tilt:-7.99,a:[404.2,493.4,576.1,630.1],b:[151.2,202.0,252.2,294.8]};
    /* baixo: as 3 linhas como UMA família de curvas paralelas (mesma trajetória, espaçamento igual ~87px) — o ajuste com uma elipse independente por linha deixava a 1ª
       com curvatura diferente das outras duas. Erro 0,94px em relação à imagem. */
    var BOTSET={cx:59.2,cy:-56.5,tilt:-8,a:[793.9,825.7,857.5],b:[714.5,799.8,889.4]};
    var OPA_TOP=[.88,.76,.66,.56], OPA_BOT=[1,.9,.78];                         /* opacidade do fio por anel (de dentro pra fora) */
    function drawRef(kx,ky){
      /* anéis em SVG: desenha no espaço da referência e deixa o <svg> esticar pra tela (viewBox + preserveAspectRatio none) — ver buildV6 */
      if(LEVE){ kx=1; ky=1; }
      [[TOPSET,svgB,ringsB,0,OPA_TOP],[BOTSET,svgF,ringsF,1,OPA_BOT]].forEach(function(c){
        var S=c[0], sv=c[1], rings=c[2], half=c[3], opa=c[4], cx=S.cx*kx, cy=S.cy*ky;
        if(LEVE){
          sv.setAttribute('viewBox','0 0 '+REF.W+' '+REF.H); sv.setAttribute('preserveAspectRatio','none');
          var g=sv.querySelector('.s3m-rg'); g.setAttribute('transform','rotate('+S.tilt+' '+cx+' '+cy+')');
          g.innerHTML=S.a.map(function(a0,i){
            var a=a0*kx, b=S.b[i]*kx, d=half?('M'+(cx+a)+' '+cy+'A'+a+' '+b+' 0 0 1 '+(cx-a)+' '+cy):('M'+(cx-a)+' '+cy+'A'+a+' '+b+' 0 0 1 '+(cx+a)+' '+cy);
            return '<path d="'+d+'" class="h" style="opacity:'+(.16*opa[i])+'"/><path d="'+d+'" class="c" style="opacity:'+opa[i]+'"/><path d="'+d+'" class="w" style="opacity:'+(.22*opa[i])+'"/>';
          }).join('');
        }else{
          rings.forEach(function(r,i){
            if(i>=S.a.length){ r.style.display='none'; return; }
            var a=S.a[i]*kx, b=S.b[i]*kx, d=2*a;
            r.style.width=d+'px'; r.style.height=d+'px'; r.style.left=(cx-a)+'px'; r.style.top=(cy-a)+'px'; r.style.transform='rotate('+S.tilt+'deg) scaleY('+(b/a)+')';
          });
        }
      });
    }
    var W=0,H=0,CX=0,CY=0,GX=0,GY=0,RX=[],RY=[],seeded=false;
    function pt(ri,th){ var x=RX[ri]*Math.cos(th), y=RY[ri]*Math.sin(th); return {x:CX+x*cosT-y*sinT,y:CY+x*sinT+y*cosT}; }
    function measure(){
      W=uni.clientWidth; H=uni.clientHeight;
      /* geometria do desktop (getGeometry): base = altura exibida do documento * RING_K; núcleo = base * GLOW_K. Aqui a base sai do zoom escolhido. */
      var base=ZOOM_CORE*W/GLOW_K, docH=base/RING_K, docW=docH*DOC_AR, ds=docW/DOC_NAT;
      CX=W/2; CY=H*.5+(FORMA===1&&WITH_DOC?40*(docW/245.5):0);   /* forma 1 com folha: +40px é o DOC_FINAL_Y_OFFSET do desktop (documento exibido de ~245px de largura lá) */
      var kx=W/REF.W, ky=H/REF.H;
      if(FORMA===4){ CX=REF.cx*kx; CY=REF.cy*ky; base=REF.base*kx; }       /* centro e escala dos anéis medidos na referência */
      GX=FORMA===4?REF.gx*kx:CX; GY=FORMA===4?REF.gy*ky:CY;               /* centro do núcleo */
      docr.style.setProperty('--ds',ds);
      docr.style.left=GX+'px'; docr.style.top=GY+'px';
      if(FORMA===4){ drawRef(kx,ky); } else {
      for(var i=0;i<4;i++){
          var d=base*PLANES[i].s, sy=FORMA===2?Math.min(1.15,2*RYF[i]*H/d):PLANES[i].sy;
          if(FORMA===1) d=2*(RYF1[i]*H)/sy;                                 /* forma 1: tamanho pela meia-altura desejada, achatamento original */
          RX[i]=d/2; RY[i]=d/2*sy;
          if(!LEVE){
            var st={width:d+'px',height:d+'px',left:(CX-d/2)+'px',top:(CY-d/2)+'px',transform:'rotate('+TILT_DEG+'deg) scaleY('+sy+')'};
            [ringsB[i],ringsF[i]].forEach(function(r){ for(var k in st) r.style[k]=st[k]; });
          }
        }
        if(LEVE){
          /* anéis em SVG: metade de CIMA (atrás do documento) e de BAIXO (na frente), 3 traços cada (halo largo, fio, brilho fino) */
          [svgB,svgF].forEach(function(sv,half){
            sv.setAttribute('viewBox','0 0 '+W+' '+H);
            var g=sv.querySelector('.s3m-rg'); g.setAttribute('transform','rotate('+TILT_DEG+' '+CX+' '+CY+')');
            g.innerHTML=RX.map(function(rx,i){
              var ry=RY[i], d=half?('M'+(CX+rx)+' '+CY+'A'+rx+' '+ry+' 0 0 1 '+(CX-rx)+' '+CY):('M'+(CX-rx)+' '+CY+'A'+rx+' '+ry+' 0 0 1 '+(CX+rx)+' '+CY), a=half?1:.72;
              var ra=[.78,.68,.58,.5][i]*(half?1:.9);          /* opacidade do fio por anel (de dentro pra fora), medida na referência: ~.74 no anel 0 e ~.53 no 2 */
              return '<path d="'+d+'" class="h" style="opacity:'+(.16*ra)+'"/><path d="'+d+'" class="c" style="opacity:'+ra+'"/>';
            }).join('');
          });
        }
        }
      var gd=FORMA===4?ZOOM_CORE*W:base*GLOW_K; glow.style.width=gd+'px'; glow.style.height=gd+'px'; glow.style.left=GX+'px'; glow.style.top=GY+'px';
      /* triângulos PARADOS: cada um no ponto do anel do seu serviço (plano S2P) mais perto do lugar do esboço */
      if(FORMA===4){
        nodes.forEach(function(n,i){
          var t=TREF[i], tx=t.x*kx, ty=t.y*ky, bq={x:tx,y:ty};
          if(t.snap){ var best=1e9; for(var r=0;r<4;r++) for(var d3=0;d3<360;d3+=.5){ var q=pt(r,d3*RAD), dd=Math.pow(q.x-tx,2)+Math.pow(q.y-ty,2); if(dd<best){ best=dd; bq={x:q.x,y:q.y}; } } }   /* em cima os arcos mudaram: reassenta no arco mais próximo */
          gsap.set(n,{x:bq.x,y:bq.y,xPercent:-50,yPercent:-50,scale:t.s*kx,rotation:t.r,opacity:1,zIndex:i<2?3:8});
          var sh=bq.x+56>W?W-(bq.x+56):(bq.x-56<0?56-bq.x:0); n.style.setProperty('--sh',sh.toFixed(1)+'px');
          n.style.setProperty('--ls',i<2?'.21em':'.13em');      /* espaçamento das letras do rótulo medido na referência (os de trás, mais abertos) */
        });
        seeded=true; return;
      }
      nodes.forEach(function(n,i){
        var ring=S2P[i], best=1e9, bq=null;
        for(var d2=0;d2<360;d2+=.5){ var q=pt(ring,d2*RAD), dist=Math.pow(q.x-TG[i].x*W,2)+Math.pow(q.y-TG[i].y*H,2); if(dist<best){ best=dist; bq={x:q.x,y:q.y,a:d2}; } }
        /* profundidade como no desktop (placeNodes): lado de baixo = FRENTE (maior e mais forte), lado de cima = ATRÁS (menor); em cima passa atrás do
           núcleo. minS por plano e escala até 1.08 são os do desktop; a opacidade de trás é mais alta que a do desktop (.58) pra não apagar. */
        var depth=(Math.sin(bq.a*RAD)+1)/2, de=depth*depth*(3-2*depth), pl=PLANES[ring].s;
        var minS=pl>=1.2?.73:pl>=1?.76:pl>=.8?.79:.82;
        gsap.set(n,{x:bq.x,y:bq.y,xPercent:-50,yPercent:-50,scale:minS+de*(1.08-minS),opacity:.85+.15*de,zIndex:depth<.5?3:8});
        /* rótulo sempre legível: se o triângulo está colado na borda, o texto desliza pra dentro da tela */
        var sh=bq.x+56>W?W-(bq.x+56):(bq.x-56<0?56-bq.x:0);
        n.style.setProperty('--sh',sh.toFixed(1)+'px');
      });
    }
    if(!gsap) return;
    measure();
    addEventListener('resize',measure,{passive:true});
    if(document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
    uni.addEventListener('click',function(e){
      var b=e.target.closest('.s3m-node'); if(!b) return;
      nodes.forEach(function(x){ x.classList.remove('is-hint'); });
      openSheet(+b.getAttribute('data-i'));
    });
    /* entrada por TRANSIÇÃO DE CSS (tempo real, não depende de quadros do GSAP — com o GSAP a entrada podia ficar travada e os triângulos
       invisíveis quando o aparelho engasgava). Fica escondido só até a cena aparecer na tela; se o observador não existir, já mostra. */
    nodes.forEach(function(n,i){ n.style.setProperty('--d',(.45+i*.14)+'s'); });
    if(canAnim && 'IntersectionObserver' in window){
      uni.classList.add('is-wait');
      var io=new IntersectionObserver(function(es){ if(es[0].isIntersecting){ uni.classList.add('is-in'); io.disconnect(); } },{threshold:.18});
      io.observe(uni);
      setTimeout(function(){ uni.classList.add('is-in'); },6000);          /* rede de segurança: nunca fica escondido */
    }
  }

  /* ===================== OPÇÃO 6 — a opção 5 INTEGRADA na rolagem da seção 03 (mesmo esquema da animação do desktop) ===================== */
  /* Usa o espaço de rolagem que sobra no celular: depois que o texto termina de entrar (t=16,4 da timeline) a seção ainda rola ~2500px (~3 telas) sem nada acontecer,
     porque o desktop reserva esse trecho pra núcleo + anéis + triângulos e no celular essas camadas ficam escondidas. Aqui a cena (a da opção 5, forma 4) entra
     DENTRO do palco da 03 e é ligada à MESMA timeline (gancho S3M_HOOK chamado por solucao-orbital.js, só com ?solucao=6), nos MESMOS instantes do desktop:
       - texto sai (logo depois de terminar de entrar);
       - núcleo acende e cresce (começa em openAt; pulso em revAt-0,3 = igual ao desktop);
       - anéis entram UM POR VEZ, de dentro pra fora (revAt + k*1,4, duração 0,9, easing power1.inOut), cada um "desenhado" como no desktop: o traço sai de BAIXO e
         segue no sentido HORÁRIO (esquerda, cima, direita, volta embaixo) — aqui em SVG (stroke-dashoffset) em vez da máscara cônica (cara no iPhone);
       - o triângulo de cada anel aparece junto com o SEU anel (mesmo fator de revelação do desktop);
       - fecho: pulso do núcleo no instante em que o último anel termina. Reversível (scrub). Sem o parâmetro nada muda. */
  function buildV6(){
    var stage=document.querySelector('#solucao .sol-stage');
    if(!stage||!gsap) return;
    var RAD=Math.PI/180, REF={W:375,H:841,gx:186,gy:397}, ZOOM=.904;
    var TOPSET={cx:173.7,cy:306.5,tilt:-7.99,a:[404.2,493.4,576.1,630.1],b:[151.2,202.0,252.2,294.8]};
    var BOTSET={cx:59.2,cy:-56.5,tilt:-8,a:[793.9,825.7,857.5],b:[714.5,799.8,889.4]};
    var OPA_TOP=[.88,.76,.66,.56], OPA_BOT=[1,.9,.78];
    var TREF=[{x:97.5,y:62,s:.89,r:0,ring:2},{x:299.5,y:146.5,s:.84,r:0,ring:0},{x:49,y:655.5,s:1.32,r:0,ring:0},{x:320.5,y:703.5,s:1.10,r:-7,ring:1}];
    /* VARIANTES pra comparar (&op=): 1 (padrão) = a aprovada; 2 = igual à 1, só o NÚCLEO maior (a 12px de cada borda da tela); 3 = igual à 1, só a parte de CIMA com a
       formatação de linhas da 2ª referência dela (4 linhas paralelas, ~60px de espaço, ponto mais alto à direita, a mais externa sai pelo topo). */
    var om=/[?&]op=([12345])(?:&|#|$)/.exec(location.search), OP=om?+om[1]:1;
    var TOPPOLY=[[157.356,-23.621,16.402,1.264,2.536],[97.032,-22.243,16.741,0.198,-0.292],[37.248,-20.551,15.06,-1.131,0.266],[-11.462,-17.36,16.594]];   /* y(x) das 4 linhas, em u=(x-187,5)/187,5 (ajuste à imagem: erro ~0,4px) */
    if(OP===5){ BOTSET.a.push(889.3); BOTSET.b.push(939); OPA_BOT.push(.66); }   /* opção 5: 4ª linha de baixo (família paralela), só um trecho no canto inferior direito, como a de cima */
    if(OP>=3){ TREF[0].y=50.7; TREF[1].y=149.7; }                      /* os triângulos de cima ficam sobre as linhas novas */
    function polyY(co,x){ var u=(x-187.5)/187.5, y=0, pw=1; for(var j=0;j<co.length;j++){ y+=co[j]*pw; pw*=u; } return y; }
    var wrap=el('div','s3m-int s3m--v5',
      '<div class="orbit-glow s3m-glow" aria-hidden="true"></div>'+
      '<svg class="s3m-rsvg s3m-int__b" aria-hidden="true"><g class="s3m-rg"></g></svg>'+
      '<svg class="s3m-rsvg s3m-int__f" aria-hidden="true"><g class="s3m-rg"></g></svg>'+
      SERV.map(function(s,i){
        return '<button type="button" class="s3m-node" data-i="'+i+'" aria-label="'+s.a+' '+s.b+'"><span class="s3m-node__in">'+TRI+'<span class="s3m-node__lb">'+s.b+'</span></span></button>';
      }).join(''));
    /* A cena fica FIXA na tela (filha do body), e não dentro do palco: no Safari do iPhone o palco (100vh) é maior que a área visível, então quando a timeline acaba
       ele já subiu ~110px e a cena — desenhada pra a tela inteira — ficava deslocada pra cima e cortada (print do iPhone dela, diferente do localhost). Fixa, ela
       fica sempre na área visível; antes da seção está vazia (tudo escondido) e depois some (esmaecimento no fim da rolagem, que também a esconde). */
    document.body.appendChild(wrap);
    var glow=wrap.querySelector('.s3m-glow'), svgB=wrap.querySelector('.s3m-int__b'), svgF=wrap.querySelector('.s3m-int__f'), nodes=$$('.s3m-node',wrap);
    var W=0,H=0, RS=[{p:0},{p:0},{p:0},{p:0}], parts=[[],[],[],[]], wins=[null,null,null,null], hookRan=false;

    /* pontos (px da tela) da metade de cima (half 0: esq.->dir.) ou de baixo (half 1: dir.->esq.) da elipse i do conjunto S, só o trecho visível */
    /* As curvas são desenhadas no ESPAÇO DA REFERÊNCIA (375x841) e o <svg> as estica pra tela (viewBox + preserveAspectRatio none): assim arcos, triângulos e núcleo
       (todos em coordenadas da referência × (kx,ky)) ficam SEMPRE no mesmo lugar uns dos outros, em qualquer proporção de tela. Antes os eixos dos arcos usavam só
       a escala da largura e os centros a da altura: numa tela mais curta (iPhone com barras, ~412x773) os arcos de baixo desciam ~130px em relação aos triângulos e
       uma linha (a do triângulo "Técnica") e parte das outras saíam da tela. */
    var K=1, OX=0, OY=0, VB={x0:0,y0:0,x1:REF.W,y1:REF.H};
    function pts(S,i,half){
      var cx=S.cx, cy=S.cy, a=S.a[i], b=S.b[i], th=S.tilt*RAD, c=Math.cos(th), s=Math.sin(th), out=[];
      for(var d=0;d<=180;d+=.5){
        var t=(half?d:180+d)*RAD, ex=a*Math.cos(t), ey=b*Math.sin(t), X=cx+ex*c-ey*s, Y=cy+ex*s+ey*c;
        if(X>VB.x0-60&&X<VB.x1+60&&Y>VB.y0-60&&Y<VB.y1+60) out.push([X,Y]);
      }
      return out;
    }
    function len(P){ var L=0; for(var i=1;i<P.length;i++) L+=Math.hypot(P[i][0]-P[i-1][0],P[i][1]-P[i-1][1]); return L; }
    function pathG(P,ring,part,opa){
      if(P.length<2) return '';
      var d='M'+P.map(function(q){ return q[0].toFixed(1)+' '+q[1].toFixed(1); }).join('L');
      return '<g data-r="'+ring+'" data-part="'+part+'" style="stroke-dasharray:1 1;stroke-dashoffset:1;visibility:hidden">'+
        '<path pathLength="1" d="'+d+'" class="h" style="opacity:'+(.16*opa)+'"/><path pathLength="1" d="'+d+'" class="c" style="opacity:'+opa+'"/><path pathLength="1" d="'+d+'" class="w" style="opacity:'+(.22*opa)+'"/></g>';
    }
    function build(kx,ky){
      var htmlB='', htmlF='', L=[];
      for(var i=0;i<4;i++){
        var T;
        if(OP>=3){ T=[]; for(var xx=Math.max(VB.x0-40,-40); xx<=Math.min(VB.x1+40,415); xx+=2){ var yy=polyY(TOPPOLY[i],xx); if(yy>VB.y0-60&&yy<VB.y1+60) T.push([xx,yy]); } }
        else T=pts(TOPSET,i,0);
        htmlB+=pathG(T,i,'t',OPA_TOP[i]);
        var BOT=[];
        if(i<BOTSET.a.length){
          /* o arco de baixo é UMA linha só (da direita pra esquerda): dividir em "esquerda" e "direita" fazia aparecerem DOIS pedaços soltos ao mesmo tempo, com um vão no
             meio, enquanto o anel se desenhava (print do iPhone dela) */
          BOT=pts(BOTSET,i,1); htmlF+=pathG(BOT,i,'b',OPA_BOT[i]);
        }
        L[i]={b:BOT.length>1?len(BOT):0,t:T.length>1?len(T):0};
      }
      /* viewBox em coordenadas da referência, ESTENDIDO pro que sobra da tela (VB) e com escala UNIFORME (meet): a composição não é esticada nem achatada — em tela
         mais larga/curta as elipses simplesmente continuam além das bordas da referência */
      [svgB,svgF].forEach(function(sv){ sv.setAttribute('viewBox',VB.x0+' '+VB.y0+' '+(VB.x1-VB.x0)+' '+(VB.y1-VB.y0)); sv.setAttribute('preserveAspectRatio','xMidYMid meet'); });
      svgB.querySelector('.s3m-rg').innerHTML=htmlB; svgF.querySelector('.s3m-rg').innerHTML=htmlF;
      /* janelas do progresso p (0..1) de cada anel: a volta horária começa embaixo (trecho esquerdo), passa pela esquerda (fora da tela), sobe e cruza o topo da esq. pra dir.,
         desce pela direita (fora da tela) e volta embaixo (trecho direito). Os vãos "fora da tela" gastam tempo proporcional (16% do total visível cada). */
      for(var k=0;k<4;k++){
        /* ordem horária a partir de baixo, sem pedaços soltos: primeiro o arco de BAIXO inteiro (da direita pra esquerda), depois o vão fora da tela (esquerda), depois o
           arco de CIMA inteiro (da esquerda pra direita) */
        var l=L[k], tot=(l.b+l.t)||1, gap=.16*tot, seq=[], cur=0, w={};
        if(l.b>0){ seq.push(['b',cur,cur+l.b]); cur+=l.b; }
        if(l.t>0){ if(seq.length) cur+=gap; seq.push(['t',cur,cur+l.t]); cur+=l.t; }
        seq.forEach(function(s){ w[s[0]]=[s[1]/cur,s[2]/cur]; }); wins[k]=w;
      }
      parts=[0,1,2,3].map(function(k){ return $$('g[data-r="'+k+'"]',wrap); });
    }
    function applyRing(k){
      var p=RS[k].p, w=wins[k]; if(!w) return;
      parts[k].forEach(function(g){
        var win=w[g.getAttribute('data-part')]; if(!win) return;
        var q=Math.max(0,Math.min(1,(p-win[0])/(win[1]-win[0]||1)));
        g.style.strokeDashoffset=(1-q).toFixed(4); g.style.visibility=q>0?'visible':'hidden';
      });
      nodes.forEach(function(n,i){
        if(TREF[i].ring!==k) return;
        n.style.visibility=p<.02?'hidden':'visible';
        gsap.set(n,{opacity:p,scale:TREF[i].s*K*(.78+.22*p)});
      });
    }
    /* ALTURA DA CENA = a área VISÍVEL da tela, não a do palco. O palco (.sol-stage) tem height:100vh e, no Safari do iPhone, 100vh é a altura com as barras
       RECOLHIDAS — maior que a área visível; a barra de baixo cobria o fim do palco e a cena (feita pra caber inteira) aparecia cortada embaixo, diferente do
       localhost. Uso a menor altura já vista (barra visível) e NUNCA aumento depois (a barra recolhe/volta ao rolar: crescer faria a cena "pular"); no desktop/emulador
       a altura visível = a do palco, então nada muda. */
    var W0=innerWidth, H0=innerHeight;
    function sceneH(){
      if(Math.abs(innerWidth-W0)>2){ W0=innerWidth; H0=innerHeight; }        /* girou a tela: recomeça */
      else if(innerHeight<H0) H0=innerHeight;                                /* só diminui */
      return Math.min(stage.clientHeight||H0,H0);
    }
    function measure(){
      W=wrap.clientWidth; H=sceneH(); if(!W||!H) return;
      wrap.style.height=H+'px'; wrap.style.bottom='auto';
      /* ESCALA UNIFORME: k = a menor das duas (a composição cabe inteira, sem esticar nem achatar); o que sobra (largura ou altura) fica nas bordas, centralizado.
         O núcleo escala junto com a composição (diâmetro = ZOOM x largura da referência x k), então em tela mais curta ele diminui um pouco, como ela permitiu. */
      K=Math.min(W/REF.W,H/REF.H); OX=(W-REF.W*K)/2; OY=(H-REF.H*K)/2;
      VB={x0:-OX/K,y0:-OY/K,x1:(W-OX)/K,y1:(H-OY)/K};
      var gd=ZOOM*REF.W*K, gl=OX+REF.gx*K;
      if(OP===2){ gd=W-24; gl=W/2; } if(OP>=4){ var mg=/[?&]m=(\d+(?:\.\d+)?)/.exec(location.search); gd=W-2*(mg?+mg[1]:12); gl=W/2; }                                  /* opção 2: núcleo a 12px de cada borda da tela */
      glow.style.width=gd+'px'; glow.style.height=gd+'px'; glow.style.left=gl+'px'; glow.style.top=(OY+REF.gy*K)+'px';
      build(K,K);
      nodes.forEach(function(n,i){
        var t=TREF[i], bx=OX+t.x*K, sh=bx+56>W?W-(bx+56):(bx-56<0?56-bx:0);
        gsap.set(n,{x:bx,y:OY+t.y*K,xPercent:-50,yPercent:-50,rotation:t.r,zIndex:8});
        n.style.setProperty('--sh',sh.toFixed(1)+'px'); n.style.setProperty('--ls',i<2?'.21em':'.13em');
      });
      for(var k=0;k<4;k++) applyRing(k);
    }
    /* estado inicial (antes da timeline chegar lá): tudo escondido */
    gsap.set(glow,{autoAlpha:0,'--gs':.25});
    measure();
    addEventListener('resize',measure,{passive:true});
    if(document.fonts&&document.fonts.ready) document.fonts.ready.then(measure);
    wrap.addEventListener('click',function(e){ var b=e.target.closest('.s3m-node'); if(b && b.style.visibility!=='hidden') openSheet(+b.getAttribute('data-i')); });

    function showAll(){ gsap.set(glow,{autoAlpha:1,'--gs':1}); RS.forEach(function(r,k){ r.p=1; applyRing(k); }); }
    window.S3M_HOOK=function(tl,T){
      hookRan=true;
      /* SAÍDA: quando a timeline acaba, o palco desgruda e sobe junto com a seção — a cena tem overflow cortado na borda de baixo do palco e as linhas
         apareciam CORTADAS ali (print do iPhone dela). Então a cena inteira se desfaz suavemente (opacity, presa à rolagem) enquanto o palco sai da tela:
         começa quando o fim da seção encosta no fim da tela e termina quando ele chegou a 40% da altura. */
      if(window.ScrollTrigger) gsap.to(wrap,{autoAlpha:0,ease:'none',scrollTrigger:{trigger:'#solucao',start:'bottom bottom',end:'bottom 62%',scrub:true,invalidateOnRefresh:true}});
      var intro=document.querySelector('.s3o-intro'), sid=document.querySelector('.s3-id');
      if(reduce){ showAll(); return; }
      /* 1) texto sai logo depois de terminar de entrar */
      tl.to([intro,sid],{autoAlpha:0,duration:.6,ease:'none'},T.openAt-.05);
      /* 2) núcleo acende e cresce, e pulsa no mesmo instante do desktop (PULSO_AT = revAt-0,3) */
      tl.fromTo(glow,{autoAlpha:0,'--gs':.25},{autoAlpha:1,'--gs':1,duration:1.0,ease:'power2.out',immediateRender:false},T.openAt+.5);
      var B='brightness(1.62) saturate(1.28)', N='brightness(1) saturate(1)';
      tl.fromTo(glow,{filter:N,'--gs':1},{filter:B,'--gs':1.15,duration:.3,ease:'power2.out',immediateRender:false},T.revAt-.3);
      tl.fromTo(glow,{filter:B,'--gs':1.15},{filter:N,'--gs':1,duration:.6,ease:'power2.inOut',immediateRender:false},T.revAt);
      /* 3) anéis UM POR VEZ, de dentro pra fora, com o triângulo de cada um */
      RS.forEach(function(r,k){
        tl.fromTo(r,{p:0},{p:1,duration:T.dur,ease:'power1.inOut',immediateRender:false,onUpdate:function(){ applyRing(k); },onReverseComplete:function(){ applyRing(k); }},T.revAt+k*T.step);
      });
      /* 4) fecho: pulso do núcleo quando o último anel termina */
      var fim=T.revAt+3*T.step+T.dur;
      tl.fromTo(glow,{filter:N},{filter:B,duration:.3,ease:'power2.out',immediateRender:false},fim);
      tl.fromTo(glow,{filter:B},{filter:N,duration:.7,ease:'power2.inOut',immediateRender:false},fim+.3);
    };
    /* rede de segurança: se a timeline da 03 não chamar o gancho (ex.: erro no motor orbital), mostra o estado final em vez de uma cena vazia */
    addEventListener('load',function(){ setTimeout(function(){ if(!hookRan) showAll(); },4000); });
  }

  /* ===================== FECHO (igual nas 5) ===================== */
  function buildFecho(){
    var f=el('div','s3m-fecho',
      '<p class="s3m-fecho__t">Sem compromisso: você vê o valor antes de começar.</p>'+
      '<a class="s3m-cta" href="#orcamento">Receber orçamento</a>'+
      '<a class="s3m-next" href="#como">Role para ver como funciona <i>&#8595;</i></a>');
    sec.appendChild(f);
    reveal($$('.s3m-fecho__t,.s3m-fecho .s3m-cta,.s3m-next',f),f,.12);
  }

  /* Botões que levam a outra seção: usam o MESMO caminho do menu (clicam no link do menu), pra cair no ponto certo
     (o salto nativo da âncora para 78px antes/depois por causa do scroll-padding do html — ver secao05/06/07.js). */
  document.addEventListener('click',function(e){
    var a=e.target.closest('.s3m a[href^="#"], .s3m-sheet a[href^="#"]'); if(!a) return;
    var h=a.getAttribute('href'), t=document.querySelector('.main-nav a[href="'+h+'"]');
    if(!t) return;
    e.preventDefault(); closeSheet(); t.click();
  });

  if(V===1||V===2||V===5||V===6) buildSheet();
  [null,buildV1,buildV2,buildV3,buildV4,buildV5,buildV6][V]();
  buildFecho();
})();
