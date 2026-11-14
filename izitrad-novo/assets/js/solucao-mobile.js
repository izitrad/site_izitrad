/* ===========================================================================
   SEÇÃO 03 — FINAL NO CELULAR (padrão aprovado, antiga "opção 5")
   ---------------------------------------------------------------------------
   Só age em tela < 900px (celular/tablet, onde os triângulos 3D da 03 estão fora — ver solucao-nodes.js). No desktop (>= 900px) este arquivo
   sai na 1ª linha e NADA muda. Interruptor pra comparar: ?solucao=0 desliga tudo (volta ao celular de antes, sem a cena).

   O que faz: usa o espaço de rolagem que sobra no fim da seção 03 (depois que o texto termina de entrar a seção ainda rola ~3 telas sem nada
   acontecer, porque o desktop reserva esse trecho pra núcleo + anéis + triângulos e no celular essas camadas ficam escondidas). A cena
   (núcleo grande + arcos finos de anéis em cima e embaixo + 4 triângulos planos em SVG, sem documento por enquanto) é ligada à MESMA timeline da
   seção (gancho window.S3M_HOOK, chamado no fim de init() de solucao-orbital.js), nos MESMOS instantes do desktop:
     - texto sai (logo depois de terminar de entrar);
     - núcleo acende e cresce (começa em openAt; pulso em revAt-0,3 = igual ao desktop);
     - anéis entram UM POR VEZ, de dentro pra fora (revAt + k*1,4, duração 0,9, easing power1.inOut), cada um "desenhado" como no desktop: o traço
       sai de BAIXO e segue no sentido HORÁRIO (esquerda, cima, direita, volta embaixo) — aqui em SVG (stroke-dashoffset) em vez da máscara cônica
       (cara no iPhone);
     - o triângulo de cada anel aparece junto com o SEU anel (mesmo fator de revelação do desktop);
     - fecho: pulso do núcleo no instante em que o último anel termina. Reversível (scrub).
   Tocar num triângulo abre a folha de detalhes (os 4 serviços vêm de solucao-nodes.js: mesmos títulos/descrições/itens do popover do desktop).
   Depois da cena vem o FECHO (frase + botão "Receber orçamento" + dica pra seção 04), inserido logo DEPOIS de #solucao. Textos do fecho: rascunho de
   copy — a usuária/o jurídico confirmam. O botão do popover do desktop ("Solicitar orçamento") não tem destino ligado; aqui os botões levam a #orcamento.
   Não usa desfoque (filter:blur) de propósito: o Safari do iPhone desenha "faixinhas" nas camadas do desfoque.

   Geometria: medida numa imagem de referência 375x841 que ela aprovou. Linhas de CIMA = 4 curvas (polinômio ajustado à 2ª referência dela, ~60px de espaço,
   ponto mais alto à direita, a mais externa sai pelo topo); linhas de BAIXO = família de curvas paralelas (elipses, centro 59,2/-56,5, rotação -8°), 4 linhas
   com espaçamento crescente (a 4ª só aparece no canto inferior direito, se a tela for alta o bastante). Núcleo a 24px de cada borda da tela.
   =========================================================================== */
(function(){
  'use strict';
  if(innerWidth>=900) return;
  if(/[?&]solucao=0(?:&|#|$)/.test(location.search)) return;
  var host=document.getElementById('solucao');
  if(!host) return;

  var gsap=window.gsap, ST=window.ScrollTrigger;
  var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  var root=document.documentElement;
  root.classList.add('s3v','s3v-6');
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

  /* triângulo da marca (mesmo traço do play do documento) */
  var TRI_D='M912.63,344.18l-326.98-188.78c-24.29-14.02-54.65,3.51-54.65,31.55v377.56c0,28.05,30.36,45.58,54.65,31.55l326.98-188.78c24.29-14.02,24.29-49.08,0-63.11Z';
  var TRI='<svg class="s3m-tri" viewBox="528 138 412 475" aria-hidden="true" focusable="false"><path d="'+TRI_D+'"/></svg>';
  var DEFS='<svg class="s3m-defs" width="0" height="0" aria-hidden="true" focusable="false"><defs>'+
    '<linearGradient id="s3mTriGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff5cc2"/><stop offset=".55" stop-color="#ff0099"/><stop offset="1" stop-color="#c4006f"/></linearGradient></defs></svg>';

  function el(tag,cls,html){ var e=document.createElement(tag); if(cls) e.className=cls; if(html!=null) e.innerHTML=html; return e; }
  function $$(sel,ctx){ return Array.prototype.slice.call((ctx||document).querySelectorAll(sel)); }

  /* ----- bloco do fecho (logo depois de #solucao, fora do palco sticky: a timeline da seção não é tocada) ----- */
  var sec=el('section','s3m s3m--v6');
  sec.id='s3m'; sec.setAttribute('aria-label','Escolha o seu caso');
  sec.insertAdjacentHTML('afterbegin',DEFS);
  host.insertAdjacentElement('afterend',sec);

  /* ===================== FOLHA DE DETALHES (abre ao tocar num triângulo) ===================== */
  var sheet=null, sheetIdx=0;
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
  }
  function openSheet(i){
    fill(i);
    sheet.setAttribute('aria-hidden','false'); sheet.classList.add('open'); root.classList.add('s3m-sheet-open');
  }
  function closeSheet(){
    if(!sheet) return;
    sheet.setAttribute('aria-hidden','true'); sheet.classList.remove('open'); root.classList.remove('s3m-sheet-open');
  }

  function reveal(els,trigger,stagger){
    if(!canAnim) return;
    gsap.from(els,{autoAlpha:0,y:30,duration:.7,ease:'power3.out',stagger:stagger==null?.1:stagger,
      scrollTrigger:{trigger:trigger||els[0],start:'top 88%',once:true}});
  }

  /* ===================== CENA INTEGRADA NA ROLAGEM DA SEÇÃO 03 ===================== */
  function buildCena(){
    var stage=document.querySelector('#solucao .sol-stage');
    if(!stage||!gsap) return;
    var RAD=Math.PI/180, REF={W:375,H:841,gy:397};
    var MARGEM=24;                                                        /* núcleo a 24px de cada borda da tela */
    /* linhas de CIMA: y(x) das 4 linhas, em u=(x-187,5)/187,5 (ajuste à 2ª referência dela: erro ~0,4px) */
    var TOPPOLY=[[157.356,-23.621,16.402,1.264,2.536],[97.032,-22.243,16.741,0.198,-0.292],[37.248,-20.551,15.06,-1.131,0.266],[-11.462,-17.36,16.594]];
    /* linhas de BAIXO: família de curvas paralelas; a 4ª (mais externa) só aparece no canto inferior direito, como a mais externa de cima sai pelo topo */
    var BOTSET={cx:59.2,cy:-56.5,tilt:-8,a:[793.9,825.7,857.5,889.3],b:[714.5,799.8,889.4,983.3]};
    var OPA_TOP=[.88,.76,.66,.56], OPA_BOT=[1,.9,.78,.66];                 /* opacidade do fio por anel (de dentro pra fora) */
    /* triângulos (px da referência 375x841): tamanho e inclinação medidos nela; os de cima ficam sobre as linhas de cima */
    var TREF=[{x:97.5,y:50.7,s:.89,r:0,ring:2},{x:299.5,y:149.7,s:.84,r:0,ring:0},{x:49,y:655.5,s:1.32,r:0,ring:0},{x:320.5,y:703.5,s:1.10,r:-7,ring:1}];
    function polyY(co,x){ var u=(x-187.5)/187.5, y=0, pw=1; for(var j=0;j<co.length;j++){ y+=co[j]*pw; pw*=u; } return y; }
    var wrap=el('div','s3m-int s3m--v5',
      '<div class="orbit-glow s3m-glow" aria-hidden="true"></div>'+
      '<div class="s3m-docw" aria-hidden="true"><div class="s3m-docr"></div></div>'+
      '<svg class="s3m-rsvg s3m-int__b" aria-hidden="true"><g class="s3m-rg"></g></svg>'+
      '<svg class="s3m-rsvg s3m-int__f" aria-hidden="true"><g class="s3m-rg"></g></svg>'+
      SERV.map(function(s,i){
        return '<button type="button" class="s3m-node" data-i="'+i+'" aria-label="'+s.a+' '+s.b+'"><span class="s3m-node__in">'+TRI+'<span class="s3m-node__lb">'+s.b+'</span></span></button>';
      }).join(''));
    /* A cena fica FIXA na tela (filha do body), e não dentro do palco: no Safari do iPhone o palco (100vh) é maior que a área visível, então quando a timeline acaba
       ele já subiu ~110px e a cena — desenhada pra a tela inteira — ficava deslocada pra cima e cortada. Fixa, ela fica sempre na área visível; antes da seção
       está vazia (tudo escondido) e depois some (esmaecimento no fim da rolagem, que também a esconde). */
    document.body.appendChild(wrap);
    var glow=wrap.querySelector('.s3m-glow'), svgB=wrap.querySelector('.s3m-int__b'), svgF=wrap.querySelector('.s3m-int__f'), nodes=$$('.s3m-node',wrap);
    var docw=wrap.querySelector('.s3m-docw'), docr=docw.querySelector('.s3m-docr'), DOCH=0, CYC=0;
    /* DOCUMENTO (a folha do desktop): clone do .doc real (com o QR) + selo. Clona DEPOIS que o site.js montou o QR e posicionou o selo (inline em %). No celular o
       documento real está escondido, então o site.js não posiciona o selo (medida 0): calcula aqui com a MESMA fórmula do relocateSeal() do desktop (centro em 90%/88%
       do mapa, largura 74% do mapa), medindo o clone sem rotação/escala. */
    function fillDoc(){
      var real=document.querySelector('.doc-mouse .doc'); if(!real||docr.firstChild) return;
      var c=real.cloneNode(true); c.removeAttribute('style'); c.classList.remove('is-dragging');
      $$('[id]',c).forEach(function(e){ e.removeAttribute('id'); });
      docr.appendChild(c);
      var seal=document.querySelector('.selo-layer .doc__seal');
      if(seal){
        var layer=el('div','s3m-selo'), im=seal.cloneNode(true);
        im.removeAttribute('style'); layer.appendChild(im); docr.appendChild(layer);
        var map=c.querySelector('.doc__map');
        if(map){
          var tr=docr.style.transform; docr.style.transition='none'; docr.style.transform='none';
          var mr=map.getBoundingClientRect(), dr=c.getBoundingClientRect();
          docr.style.transform=tr; docr.style.transition='';
          if(mr.width && dr.width){
            im.style.left=((mr.left+mr.width*.90-dr.left)/dr.width*100).toFixed(3)+'%';
            im.style.top=((mr.top+mr.height*.88-dr.top)/dr.height*100).toFixed(3)+'%';
            im.style.width=(mr.width*.74/dr.width*100).toFixed(3)+'%';
          }
        }
      }
    }
    if(document.readyState==='complete') setTimeout(fillDoc,500); else addEventListener('load',function(){ setTimeout(fillDoc,500); });
    var W=0,H=0, RS=[{p:0},{p:0},{p:0},{p:0}], parts=[[],[],[],[]], wins=[null,null,null,null], hookRan=false;

    /* As curvas são desenhadas no ESPAÇO DA REFERÊNCIA (375x841) e o <svg> as ajusta à tela com escala uniforme (viewBox + preserveAspectRatio meet): arcos, triângulos
       e núcleo (todos em coordenadas da referência × k) ficam SEMPRE no mesmo lugar uns dos outros, em qualquer proporção de tela, sem esticar nem achatar. */
    var K=1, OX=0, OY=0, VB={x0:0,y0:0,x1:REF.W,y1:REF.H};
    /* pontos (coords da referência) da metade de baixo (da direita pra esquerda) da elipse i de BOTSET, só o trecho visível */
    function ptsBot(i){
      var S=BOTSET, cx=S.cx, cy=S.cy, a=S.a[i], b=S.b[i], th=S.tilt*RAD, c=Math.cos(th), s=Math.sin(th), out=[];
      for(var d=0;d<=180;d+=.5){
        var t=d*RAD, ex=a*Math.cos(t), ey=b*Math.sin(t), X=cx+ex*c-ey*s, Y=cy+ex*s+ey*c;
        if(X>VB.x0-60&&X<VB.x1+60&&Y>VB.y0-60&&Y<VB.y1+60) out.push([X,Y]);
      }
      return out;
    }
    function ptsTop(i){
      var out=[];
      for(var xx=Math.max(VB.x0-40,-40); xx<=Math.min(VB.x1+40,415); xx+=2){ var yy=polyY(TOPPOLY[i],xx); if(yy>VB.y0-60&&yy<VB.y1+60) out.push([xx,yy]); }
      return out;
    }
    function len(P){ var L=0; for(var i=1;i<P.length;i++) L+=Math.hypot(P[i][0]-P[i-1][0],P[i][1]-P[i-1][1]); return L; }
    function pathG(P,ring,part,opa){
      if(P.length<2) return '';
      var d='M'+P.map(function(q){ return q[0].toFixed(1)+' '+q[1].toFixed(1); }).join('L');
      return '<g data-r="'+ring+'" data-part="'+part+'" style="stroke-dasharray:1 1;stroke-dashoffset:1;visibility:hidden">'+
        '<path pathLength="1" d="'+d+'" class="h" style="opacity:'+(.16*opa)+'"/><path pathLength="1" d="'+d+'" class="c" style="opacity:'+opa+'"/><path pathLength="1" d="'+d+'" class="w" style="opacity:'+(.22*opa)+'"/></g>';
    }
    function build(){
      var htmlB='', htmlF='', L=[];
      for(var i=0;i<4;i++){
        var T=ptsTop(i), BOT=ptsBot(i);
        htmlB+=pathG(T,i,'t',OPA_TOP[i]);
        /* o arco de baixo é UMA linha só (da direita pra esquerda): dividir em "esquerda" e "direita" fazia aparecerem DOIS pedaços soltos ao mesmo tempo, com um vão no
           meio, enquanto o anel se desenhava */
        htmlF+=pathG(BOT,i,'b',OPA_BOT[i]);
        L[i]={b:BOT.length>1?len(BOT):0,t:T.length>1?len(T):0};
      }
      /* viewBox em coordenadas da referência, ESTENDIDO pro que sobra da tela (VB) e com escala UNIFORME (meet): em tela mais larga/curta as elipses simplesmente
         continuam além das bordas da referência */
      [svgB,svgF].forEach(function(sv){ sv.setAttribute('viewBox',VB.x0+' '+VB.y0+' '+(VB.x1-VB.x0)+' '+(VB.y1-VB.y0)); sv.setAttribute('preserveAspectRatio','xMidYMid meet'); });
      svgB.querySelector('.s3m-rg').innerHTML=htmlB; svgF.querySelector('.s3m-rg').innerHTML=htmlF;
      /* janelas do progresso p (0..1) de cada anel: ordem horária a partir de baixo, sem pedaços soltos: primeiro o arco de BAIXO inteiro (da direita pra esquerda), depois o
         vão fora da tela (esquerda, 16% do total visível), depois o arco de CIMA inteiro (da esquerda pra direita) */
      for(var k=0;k<4;k++){
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
       RECOLHIDAS — maior que a área visível; a barra de baixo cobria o fim do palco e a cena (feita pra caber inteira) aparecia cortada embaixo. Uso a menor altura
       já vista (barra visível) e NUNCA aumento depois (a barra recolhe/volta ao rolar: crescer faria a cena "pular"); no desktop/emulador a altura visível = a do palco. */
    var W0=innerWidth, H0=innerHeight;
    function sceneH(){
      if(Math.abs(innerWidth-W0)>2){ W0=innerWidth; H0=innerHeight; }        /* girou a tela: recomeça */
      else if(innerHeight<H0) H0=innerHeight;                                /* só diminui */
      return Math.min(stage.clientHeight||H0,H0);
    }
    function measure(){
      W=wrap.clientWidth; H=sceneH(); if(!W||!H) return;
      wrap.style.height=H+'px'; wrap.style.bottom='auto';
      /* ESCALA UNIFORME: k = a menor das duas (a composição cabe inteira, sem esticar nem achatar); o que sobra (largura ou altura) fica nas bordas, centralizado. */
      K=Math.min(W/REF.W,H/REF.H); OX=(W-REF.W*K)/2; OY=(H-REF.H*K)/2;
      VB={x0:-OX/K,y0:-OY/K,x1:(W-OX)/K,y1:(H-OY)/K};
      var gd=W-2*MARGEM;                                                     /* núcleo: diâmetro = largura da tela menos a margem dos dois lados */
      glow.style.width=gd+'px'; glow.style.height=gd+'px'; glow.style.left=(W/2)+'px'; glow.style.top=(OY+REF.gy*K)+'px';
      /* documento: MESMA proporção do desktop (núcleo = altura do documento x RING_K 2,6 x GLOW_K 0,44 = 1,144; largura/altura = 0,72), no meio do núcleo; o clone tem 446px
         naturais (largura do .doc a 1440) e é reduzido por --ds */
      DOCH=gd/1.144; CYC=OY+REF.gy*K;
      docw.style.left=(W/2)+'px'; docw.style.top=CYC+'px'; docr.style.setProperty('--ds',(DOCH*.72/446).toFixed(4));
      build();
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

    gsap.set(docw,{autoAlpha:0});                                            /* a folha só aparece quando desce (ver o gancho) */
    function showAll(){ gsap.set(glow,{autoAlpha:1,'--gs':1}); gsap.set(docw,{autoAlpha:1,y:0}); RS.forEach(function(r,k){ r.p=1; applyRing(k); }); }
    window.S3M_HOOK=function(tl,T){
      hookRan=true;
      /* SAÍDA: quando a timeline acaba, o palco desgruda e sobe junto com a seção — a cena tem overflow cortado na borda de baixo do palco e as linhas
         apareciam CORTADAS ali. Então a cena inteira se desfaz suavemente (opacity, presa à rolagem) enquanto o palco sai da tela: começa quando o fim da seção
         encosta no fim da tela e termina quando ele chegou a 40% da altura. DECISÃO DELA: fica o ESMAECER (parece travar menos); a versão em que a cena sobe junto com a
         rolagem foi testada e descartada (só o TEXTO de abertura sobe com a rolagem, ver mais abaixo). */
      if(window.ScrollTrigger) gsap.to(wrap,{autoAlpha:0,ease:'none',scrollTrigger:{trigger:'#solucao',start:'bottom bottom',end:'bottom 62%',scrub:true,invalidateOnRefresh:true}});
      var intro=document.querySelector('.s3o-intro'), sid=document.querySelector('.s3-id');
      if(reduce){ showAll(); return; }
      /* 1) texto sai logo depois de terminar de entrar */
      /* As linhas do título, o parágrafo e o rótulo "03 — A SOLUÇÃO" SOBEM junto com a rolagem (1:1, px por px, todos na mesma velocidade) e saem pelo topo da tela,
         a partir do instante em que antes começavam a esmaecer (decisão dela, comparando as duas versões). É um ScrollTrigger próprio: mapeia o instante da timeline pra
         posição de rolagem e anda a altura da tela inteira. */
      /* CORREÇÃO (print dela): rolando pra TRÁS (da 03 de volta pra 02) o rótulo "03 — A SOLUÇÃO" ficava visível em cima da 02. O site.js faz ele "nascer" com um tl.call
         (opacity:1) que NÃO desfaz ao voltar; no desktop isso não aparece porque o documento (z-index maior) fica na frente do rótulo, mas no celular o documento não
         aparece. Aqui o rótulo ganha um tween reversível (opacity 0→1) no mesmo instante em que ele nasce (introAt - INTRO_DELAY_AFTER_LABEL = 0,6): voltando, apaga de novo. */
      var sidEl=document.querySelector('.s3-id');
      if(sidEl) tl.fromTo(sidEl,{opacity:0},{opacity:1,duration:.002,ease:'none',immediateRender:false},T.introAt-.6-.004);   /* .004 ANTES do instante do tl.call do site.js: o tl.call dispara nos dois sentidos, então ao voltar ele liga o rótulo ao cruzar e o meu apaga logo em seguida (mais cedo na timeline) */
      var movers=$$('.s3o-title .s3o-line, .s3o-lead').concat(sid?[sid]:[]), tAt=T.openAt-.05;
      if(window.ScrollTrigger && movers.length)
        gsap.fromTo(movers,{y:0},{y:function(){ return -innerHeight; },ease:'none',immediateRender:false,
          scrollTrigger:{start:function(){ var s=tl.scrollTrigger; return s.start+(tAt/tl.duration())*(s.end-s.start); },end:function(){ return '+='+innerHeight; },scrub:true,invalidateOnRefresh:true}});
      else tl.to([intro,sid],{autoAlpha:0,duration:.6,ease:'none'},tAt);
      /* 2) núcleo acende e cresce, e pulsa no mesmo instante do desktop (PULSO_AT = revAt-0,3) */
      tl.fromTo(glow,{autoAlpha:0,'--gs':.25},{autoAlpha:1,'--gs':1,duration:1.0,ease:'power2.out',immediateRender:false},T.openAt+.5);
      var B='brightness(1.62) saturate(1.28)', N='brightness(1) saturate(1)';
      tl.fromTo(glow,{filter:N,'--gs':1},{filter:B,'--gs':1.15,duration:.3,ease:'power2.out',immediateRender:false},T.revAt-.3);
      tl.fromTo(glow,{filter:B,'--gs':1.15},{filter:N,'--gs':1,duration:.6,ease:'power2.inOut',immediateRender:false},T.revAt);
      /* 3) a FOLHA do desktop desce de cima e assenta no meio do núcleo, depois que o núcleo acendeu e pulsou. Começa logo após o pico do pulso (revAt) e leva 1,2
         unidades de rolagem (power2.out: chega suave). Os anéis começam 1,0 depois (a folha já está quase assentada) — a folga do fim da timeline absorve esse
         deslocamento; se não couber (S menor que 1), encolhe o deslocamento pra NÃO alongar a timeline (isso mudaria a página inteira). */
      var S=Math.max(0,Math.min(1.0,tl.duration()-(T.revAt+3*T.step+T.dur+.6))), docAt=T.revAt+.1, docDur=S+.2;
      if(S>0){
        tl.fromTo(docw,{autoAlpha:0},{autoAlpha:1,duration:.05,ease:'none',immediateRender:false},docAt);
        tl.fromTo(docw,{y:function(){ return -(CYC+DOCH); }},{y:0,ease:'power2.out',duration:docDur,immediateRender:false},docAt);
      } else gsap.set(docw,{autoAlpha:1,y:0});
      /* 4) anéis UM POR VEZ, de dentro pra fora, com o triângulo de cada um */
      RS.forEach(function(r,k){
        tl.fromTo(r,{p:0},{p:1,duration:T.dur,ease:'power1.inOut',immediateRender:false,onUpdate:function(){ applyRing(k); },onReverseComplete:function(){ applyRing(k); }},T.revAt+S+k*T.step);
      });
      /* 5) fecho: pulso do núcleo quando o último anel termina */
      var fim=T.revAt+S+3*T.step+T.dur;
      tl.fromTo(glow,{filter:N},{filter:B,duration:.25,ease:'power2.out',immediateRender:false},fim);
      tl.fromTo(glow,{filter:B},{filter:N,duration:.35,ease:'power2.inOut',immediateRender:false},fim+.25);
    };
    /* rede de segurança: se a timeline da 03 não chamar o gancho (ex.: erro no motor orbital), mostra o estado final em vez de uma cena vazia */
    addEventListener('load',function(){ setTimeout(function(){ if(!hookRan) showAll(); },4000); });
  }

  /* ===================== FECHO ===================== */
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

  buildSheet();
  buildCena();
  buildFecho();
})();
