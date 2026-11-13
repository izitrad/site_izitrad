/* ===========================================================================
   SEÇÃO 03 — FINAL NO CELULAR: 4 PROTÓTIPOS PARA COMPARAÇÃO
   ---------------------------------------------------------------------------
   Só age com o parâmetro na URL E em tela < 900px (celular/tablet, onde os triângulos 3D da 03 estão fora — ver
   solucao-nodes.js). Sem o parâmetro, este arquivo sai na 1ª linha e NADA muda (desktop também não muda nunca).

     ?solucao=1  Cartões com triângulos planos: lista dos 4 serviços; tocar abre uma folha por baixo com os detalhes.
     ?solucao=2  Mini-órbita 2D: documento pequeno + anéis em SVG + 4 triângulos girando devagar; tocar abre a mesma folha.
     ?solucao=3  Um serviço por vez, ligado à rolagem (bloco "sticky", sem toque): o documento muda e o texto troca.
     ?solucao=4  "Qual é a sua?": mini-pergunta (2 perguntas) que indica o serviço e leva ao orçamento.

   Todas terminam com o mesmo FECHO (frase + botão "Receber orçamento" + dica pra seção 04).

   O bloco é inserido logo DEPOIS de #solucao (fora do palco "sticky" da 03, então a timeline da seção não é tocada). Não usa
   desfoque (filter:blur) de propósito: o Safari do iPhone desenha "faixinhas" nas camadas do desfoque.
   Textos: os 4 serviços vêm de solucao-nodes.js (mesmos títulos/descrições/itens do popover do desktop). Perguntas do
   quiz, frase do fecho e rótulos são RASCUNHO de copy — a usuária/o jurídico confirmam. O botão do popover do desktop
   ("Solicitar orçamento") não tem destino ligado; aqui os botões levam a #orcamento (seção 07).
   =========================================================================== */
(function(){
  'use strict';
  var mm=/[?&]solucao=([1-4])(?:&|#|$)/.exec(location.search);
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

  /* ===================== FECHO (igual nas 4) ===================== */
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

  if(V===1||V===2) buildSheet();
  [null,buildV1,buildV2,buildV3,buildV4][V]();
  buildFecho();
})();
