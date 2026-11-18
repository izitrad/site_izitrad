/* ===== SEÇÃO 07 — ORÇAMENTO (bilhete que se destaca) =====
   Origem: proto-orcamento.html (sketch aprovado, desktop + mobile). O visitante
   escolhe 4 campos (Documento, Idioma, Serviço, Plano: izi, izi+ ou izi pro) em chips; o canhoto do
   bilhete mostra o resumo ao vivo e, ao completar, se DESTACA (balança, se solta,
   fica rosa e gira pra frente), com botão "Enviar" + prévia da mensagem.
   Tudo escopado em .s07 (sem ids globais). Cria 3 ScrollTriggers próprios (rótulo,
   entrada do bilhete, entrada dos campos) — são os últimos da página, não deslocam
   os das seções anteriores. Destino do botão: AINDA A DEFINIR (hoje só prévia). */
(function(){
"use strict";
const root=document.querySelector('.s07');
if(!root || !window.gsap || !window.ScrollTrigger) return;
const {gsap,ScrollTrigger}=window;
gsap.registerPlugin(ScrollTrigger);
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const $=(s,r)=>(r||root).querySelector(s);
const $$=(s,r)=>Array.from((r||root).querySelectorAll(s));
const ticket=$('.s07-ticket'), body=$('.s07-body'), stub=$('.s07-stub'), cta=$('.s07-cta'),
      again=$('.s07-again'), msg=$('.s07-msg'), eta=$('.s07-eta');
const fields=$$('.s07-field:not(.s07-extras):not(.s07-docs)'), items=$$('.s07-sum li'), bars=$$('.s07-prog u');   // as "opções da tradução" (.s07-extras) são opcionais e têm lógica própria (abaixo)
let ready=false, choice={};
const mobile=()=>innerWidth<=760;

/* BILHETE MAIS LARGO (desktop; tamanho "médio" escolhido por ela): o palco tem até 1400 px (secao07.css, até 90% da tela) e o bilhete inteiro é ampliado na mesma proporção (botões,
   textos, logo, canhoto, espaços e recortes crescem juntos). Técnica: o invólucro .s07-escala fica com largura palco/z e recebe transform:scale(z); a altura do palco é ajustada pra o
   espaço bater (transform não muda o layout). z = 85% da razão palco/960, entre 1 e 1,3: ampliar MENOS que a largura deixa os botões caberem em menos linhas, então o bilhete alarga
   sem engordar (a 1920 px: 1421 px de largura, botões de 17,4 px). Funciona igual no Chrome e no Safari (o CSS "zoom" não, por isso não é usado). No celular não há escala. Roda antes
   dos gatilhos desta seção e de novo ao redimensionar. */
const palco=$('.s07-stage'), escala=$('.s07-escala');
/* LARGO (agora o PADRÃO; pedido dela: "esticado pras LATERAIS, não de altura"): palco de até 1520 px / 92% da tela (secao07.css), mas SEM ampliar mais os botões e textos:
   a escala fica travada no valor da largura de 1400 px / 90%, então o espaço a mais vira folga nas linhas e a altura não aumenta. */
const ESCALA_DESKTOP=.85;
function escalarBilhete(){
  if(!palco||!escala) return;
  const larguraBase=Math.min(1400,innerWidth*.9);   // a escala usa a largura "média" de antes, então botões e textos ficam do mesmo tamanho em qualquer tela
  const z=mobile()?1:Math.max(1,Math.min(1.3,larguraBase/960*ESCALA_DESKTOP));
  if(z<=1.005){ escala.style.cssText=''; palco.style.minHeight=''; return; }
  escala.style.width=(100/z)+'%'; escala.style.transformOrigin='top center'; escala.style.transform='scale('+z+')';
  palco.style.minHeight=Math.round(escala.offsetHeight*z)+'px';
}
escalarBilhete();
addEventListener('resize',escalarBilhete);
/* O bilhete CRESCE ou ENCOLHE com o conteúdo (opções da tradução numa linha nova, lista de arquivos, avisos, fontes que terminam de carregar). Como o transform não muda o layout, a altura
   reservada do palco precisa acompanhar: senão o bilhete ampliado passa por cima do botão "Enviar". Observa o invólucro e refaz só a altura mínima (a escala e a largura não mudam). */
if(window.ResizeObserver && escala && palco){
  new ResizeObserver(()=>{
    if(mobile()) return;
    const z=Math.max(1,Math.min(1.3,Math.min(1400,innerWidth*.9)/960*ESCALA_DESKTOP));
    if(z<=1.005) return;
    const alvo=Math.round(escala.offsetHeight*z)+'px';
    if(palco.style.minHeight!==alvo) palco.style.minHeight=alvo;
  }).observe(escala);
}

/* OPÇÕES DE DESENHO DO BILHETE (pedido dela, inspiradas em cartões de embarque; só DESKTOP, só por URL): ?bilhete=1 (faixa rosa + rota gigante + mapa + canhoto com código de barras),
   ?bilhete=2 (lateral rosa com código de barras vertical + rota central), ?bilhete=3 (preto e branco, moldura escura, rosa só no triângulo). Sem o parâmetro (ou no celular) o bilhete é
   o de sempre: os elementos novos do HTML (.s07-band/.s07-map/.s07-strip/.s07-route/.s07-bar) ficam display:none (ver secao07.css). A "rota" é Português -> idioma escolhido (como origem -> destino). */
const VARIANTE=(m=>m?+m[1]:0)(/[?&]bilhete=([1-5])(?:&|#|$)/.exec(location.search));
if(VARIANTE && !mobile()) root.classList.add('s07-v'+VARIANTE);
if(/[?&]prazo=1(?:&|#|$)/.test(location.search)) root.classList.add('s07-prazo1');   // só pra comparar: prazo dos planos em 1 linha
/* código de barras decorativo (barras pseudo-aleatórias a partir de um texto: o mesmo pedido gera as mesmas barras) */
function barras(seed,vertical){
  let s=0; for(const c of String(seed)) s=(s*31+c.charCodeAt(0))>>>0;
  const rnd=()=>{ s=(s*1664525+1013904223)>>>0; return s/4294967296; };
  let p=0, out=''; const L=200, T=60;
  while(p<L){ const w=1+Math.floor(rnd()*4), gap=1+Math.floor(rnd()*3);
    out+=vertical?'<rect x="0" y="'+p+'" width="'+T+'" height="'+w+'"/>':'<rect x="'+p+'" y="0" width="'+w+'" height="'+T+'"/>'; p+=w+gap; }
  return '<svg viewBox="0 0 '+(vertical?T:L)+' '+(vertical?L:T)+'" preserveAspectRatio="none" aria-hidden="true">'+out+'</svg>';
}
/* QR code decorativo (opção 5): grade 21x21 com os 3 quadrados-guia e o resto pseudo-aleatório a partir do texto */
function qr(seed){
  let s=0; for(const c of String(seed)) s=(s*31+c.charCodeAt(0))>>>0;
  const rnd=()=>{ s=(s*1664525+1013904223)>>>0; return s/4294967296; };
  const N=21, g=[]; for(let y=0;y<N;y++){ g.push([]); for(let x=0;x<N;x++) g[y].push(rnd()>.52); }
  const guia=(ox,oy)=>{ for(let k=-1;k<=7;k++){ [[ox+k,oy-1],[ox+k,oy+7],[ox-1,oy+k],[ox+7,oy+k]].forEach(([x,y])=>{ if(x>=0&&y>=0&&x<N&&y<N) g[y][x]=false; }); }
    for(let y=0;y<7;y++) for(let x=0;x<7;x++){ const borda=x===0||y===0||x===6||y===6, miolo=x>=2&&x<=4&&y>=2&&y<=4; g[oy+y][ox+x]=borda||miolo; } };
  guia(0,0); guia(N-7,0); guia(0,N-7);
  let out=''; for(let y=0;y<N;y++) for(let x=0;x<N;x++) if(g[y][x]) out+='<rect x="'+x+'" y="'+y+'" width="1.02" height="1.02"/>';
  return '<svg viewBox="0 0 '+N+' '+N+'" aria-hidden="true">'+out+'</svg>';
}
const pintarBarras=seed=>$$('.s07-bar').forEach(el=>{ el.innerHTML=VARIANTE===5?qr(seed):barras(seed,el.hasAttribute('data-vertical')); });
pintarBarras('izitrad-0001');
const rotaPara=$('.s07-rt-to');
const IDIOMAS={'Inglês':['EN','Inglês'],'Italiano':['IT','Italiano'],'Espanhol':['ES','Espanhol'],'Francês':['FR','Francês']};
/* idioma digitado em "Outro": a sigla é as 2 primeiras letras em maiúsculas (ex.: Alemão -> AL) */
function setRota(nome){
  if(!rotaPara) return;
  let v=IDIOMAS[nome];
  if(!v && nome){ const cod=nome.replace(/[^A-Za-zÀ-ÿ]/g,'').slice(0,2).toUpperCase(); v=[cod||'??',nome]; }
  v=v||['…','Idioma'];
  $('b',rotaPara).textContent=v[0]; $('span',rotaPara).textContent=v[1]; rotaPara.classList.toggle('on',v[0]!=='…');
}

/* Rótulo do capítulo — mesmo mecanismo da 05/06 (tempo real, toca ao entrar,
   reverte ao voltar; x:0 explícito evita o xPercent duplicado). */
(function buildKicker(){
  const k=$('.s07-kicker'); if(!k) return;
  gsap.set(k,{x:0,xPercent:-50,y:70});
  const tl=gsap.timeline({scrollTrigger:{trigger:k,start:'top 85%',toggleActions:'play none none reverse'}});
  tl.to(k,{opacity:1,y:0,duration:.6,ease:'power2.out'},0);
  if(reduce || !window.buildRollingLabel || !window.addRollingTween) return;
  const reels=buildRollingLabel(k);
  gsap.set(reels.map(r=>r.char),{scale:1.22,filter:'blur(3px)'});
  addRollingTween(tl,reels,.1);
})();

/* entrada do bilhete (presa à rolagem): sobe inclinado e assenta */
if(!reduce){
  gsap.fromTo(ticket,{y:150,rotate:-9,opacity:0},{
    y:0,rotate:-2,opacity:1,ease:'power2.out',
    scrollTrigger:{trigger:'.s07-stage',start:'top 92%',end:'top 45%',scrub:.6}
  });
  gsap.from(fields,{opacity:0,y:18,stagger:.12,ease:'power2.out',
    scrollTrigger:{trigger:'.s07-stage',start:'top 70%',end:'top 35%',scrub:.6}});
}

/* "Outro" no IDIOMA: aparece uma caixinha pro cliente digitar o idioma (no Documento "Outro" continua só um botão). O texto digitado vira o idioma do pedido (canhoto, rota e mensagem);
   enquanto estiver vazio o campo NÃO conta como preenchido. */
const outroBox=$('.s07-outro'), outroIn=outroBox?$('input',outroBox):null;
function aplicarIdiomaDigitado(){
  const campo=$('.s07-field[data-key="idioma"]'), li=$('.s07-sum li[data-k="idioma"]'), b=$('b',li);
  const v=outroIn.value.trim(), nome=v?v.charAt(0).toUpperCase()+v.slice(1):'';
  if(nome){ choice.idioma=nome; campo.classList.add('done'); b.textContent=nome; li.classList.add('on'); }
  else{ delete choice.idioma; campo.classList.remove('done'); b.textContent='…'; li.classList.remove('on'); }
  setRota(nome);
}
if(outroIn) outroIn.addEventListener('input',()=>{ aplicarIdiomaDigitado(); update(); atualizarMsg(); });

/* escolha dos chips */
fields.forEach(f=>{
  const key=f.getAttribute('data-key');
  $$('.s07-chip:not([data-extra])',f).forEach(c=>{
    c.addEventListener('click',()=>{
      $$('.s07-chip:not([data-extra])',f).forEach(o=>o.setAttribute('aria-checked',o===c?'true':'false'));
      if(key==='idioma' && outroBox){
        const eOutro=c.textContent.trim()==='Outro';
        outroBox.hidden=!eOutro;
        if(eOutro){ posicionarOutro(); aplicarIdiomaDigitado(); update(); atualizarMsg(); outroIn.focus(); return; }
        outroIn.value='';
      }
      choice[key]=c.textContent.trim();
      f.classList.add('done');
      const li=$('.s07-sum li[data-k="'+key+'"]'), b=$('b',li);
      b.textContent=choice[key]; li.classList.add('on');
      if(key==='idioma') setRota(choice[key]);
      if(key==='servico') atualizarExtras();
      if(!reduce) gsap.fromTo(b,{y:8,opacity:0},{y:0,opacity:1,duration:.3,ease:'power2.out'});
      update(); atualizarMsg();   // depois de pronto, trocar uma escolha também atualiza a prévia da mensagem
    });
  });
});

/* CONTATO (3 campos OBRIGATÓRIOS + estado OPCIONAL, por último no bilhete): nome completo, WhatsApp (com DDD), e-mail e estado de residência. Só contam como preenchidos quando válidos. Por enquanto só na tela
   (o site é estático, nada é enviado; destino a definir). A mensagem de erro só aparece depois que o cliente sai do campo, nunca enquanto ele ainda está digitando. */
const MAIL_RE=/^[^\s@<>()[\]\\,;:"]+@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)+$/;
const DDDS=new Set('11 12 13 14 15 16 17 18 19 21 22 24 27 28 31 32 33 34 35 37 38 41 42 43 44 45 46 47 48 49 51 53 54 55 61 62 63 64 65 66 67 68 69 71 73 74 75 77 79 81 82 83 84 85 86 87 88 89 91 92 93 94 95 96 97 98 99'.split(' '));
const soDigitos=v=>{ let d=v.replace(/\D/g,''); if(d.length>11 && d.startsWith('55')) d=d.slice(2); return d.slice(0,11); };   // aceita colar com +55
function mascaraZap(v){ const d=soDigitos(v); if(!d) return ''; if(d.length<3) return '('+d; return '('+d.slice(0,2)+') '+d.slice(2,7)+(d.length>7?'-'+d.slice(7):''); }
const PALAVRA=/^\p{L}[\p{L}'’.-]*$/u;
const CONTATO={
  nome:v=>{ const n=v.replace(/\s+/g,' ').trim(), p=n.split(' '); return (n.length<=80 && p.length>=2 && p.every(x=>x.length>=2&&PALAVRA.test(x)))?n:null; },
  email:v=>{ const e=v.trim(); return (e.length<=120 && MAIL_RE.test(e))?e:null; },
  whatsapp:v=>{ const d=soDigitos(v); return (d.length===11 && DDDS.has(d.slice(0,2)) && d[2]==='9')?mascaraZap(d):null; },
  estado:v=>v?v:null
};
/* O ESTADO DE RESIDÊNCIA é OPCIONAL: não conta nos campos obrigatórios, não vai pro canhoto; se escolhido, só entra na prévia da mensagem (variável "estado"). */
let estado='';
const contato=$$('.s07-tx').map(f=>{
  const key=f.getAttribute('data-key'), inp=$('.s07-in',f), msg=$('.s07-in-msg',f), sel=inp.tagName==='SELECT';
  if(key==='estado'){
    inp.addEventListener('change',()=>{ estado=inp.value?inp.options[inp.selectedIndex].text:''; f.classList.toggle('done',!!estado); atualizarMsg(); });
    return {reset(){ inp.value=''; estado=''; f.classList.remove('done'); }};
  }
  const li=$('.s07-sum li[data-k="'+key+'"]'), b=$('b',li);
  function aplicar(mostrarErro){
    if(key==='whatsapp') inp.value=mascaraZap(inp.value);
    const v=CONTATO[key](inp.value), ok=v!==null;
    if(ok){ choice[key]=v; f.classList.add('done'); b.textContent=choice[key]; li.classList.add('on'); }
    else{ delete choice[key]; f.classList.remove('done'); b.textContent='…'; li.classList.remove('on'); }
    const erro=!ok && mostrarErro && !!msg && inp.value.trim().length>0;
    if(msg) msg.hidden=!erro;
    inp.setAttribute('aria-invalid',erro?'true':'false'); f.classList.toggle('erro',erro);
  }
  inp.addEventListener('input',()=>{ aplicar(f.classList.contains('erro')); update(); atualizarMsg(); });   // já com erro mostrado: some assim que o campo ficar válido
  inp.addEventListener('blur',()=>{ aplicar(true); update(); atualizarMsg(); });
  return {reset(){ inp.value=''; if(msg) msg.hidden=true; f.classList.remove('erro'); inp.setAttribute('aria-invalid','false'); }};
});

const TOTAL=7;   // campos obrigatórios: documento, idioma, serviço, plano, nome, e-mail, WhatsApp (o estado é opcional)
const count=()=>Object.keys(choice).length;
function update(){
  const n=count();
  bars.forEach((u,i)=>u.classList.toggle('on',i<n));
  if(n===TOTAL && !ready) tear();
  else if(n<TOTAL) eta.textContent='Faltam '+(TOTAL-n)+(TOTAL-n===1?' campo':' campos')+' para destacar o canhoto.';
}

/* OPÇÕES DA TRADUÇÃO (opcionais, fora dos 4 campos que destacam o canhoto): "Reproduzir o layout original" e "Enviar glossário próprio" aparecem JUNTOS e SÓ quando o serviço é
   "Tradução Simples" ou "Tradução Técnica" (não aparecem na Juramentada, na Certificada, no Apostilamento de Haia nem antes de escolher o serviço). Entram no canhoto (linha "Opções") e na mensagem. */
const extrasChips=$$('.s07-chip[data-extra]'), extrasLi=$('.s07-sum li[data-k="extras"]');   // os 2 botões moram na fileira do Serviço (ficam na mesma linha do "Apostilamento de Haia")
const EXTRAS={layout:['Layout original','reproduzir o layout original'],glossario:['Glossário próprio','enviar glossário próprio']};
let extras=[];
const chipExtra=k=>extrasChips.find(c=>c.getAttribute('data-extra')===k);
function resumoExtras(){
  if(!extrasLi) return;
  $('b',extrasLi).textContent=extras.map(k=>EXTRAS[k][0]).join(', ');
  extrasLi.classList.toggle('show',extras.length>0);
}
function atualizarExtras(){
  const mostra=choice.servico==='Tradução Técnica' || choice.servico==='Tradução Simples';
  ['layout','glossario'].forEach(k=>{
    const c=chipExtra(k); if(!c) return;
    c.hidden=!mostra;
    if(!mostra && extras.includes(k)){ extras=extras.filter(x=>x!==k); c.setAttribute('aria-checked','false'); }
  });
  alinharExtras(); resumoExtras(); atualizarMsg();
}
/* DESKTOP: os 2 botões entram na fileira do Serviço, logo depois do "Apostilamento de Haia" (mesma linha, como no desenho dela), e o primeiro é empurrado pra começar na altura do botão
   "Tradução Técnica" (também com a Simples escolhida), sem passar da borda. Se não couber na linha do Apostilamento eles descem pra uma linha nova, mas continuam alinhados à Técnica.
   No celular não alinha (fluem normalmente). */
function alinharExtras(){
  extrasChips.forEach(c=>{ c.style.marginLeft=''; });
  const vis=extrasChips.filter(c=>!c.hidden);
  if(mobile()||!vis.length) return;
  const alvo=$$('.s07-field[data-key="servico"] .s07-chip:not([data-extra])').find(c=>c.textContent.trim()==='Tradução Técnica'); if(!alvo) return;
  const ap=$$('.s07-field[data-key="servico"] .s07-chip:not([data-extra])').find(c=>c.textContent.trim()==='Apostilamento de Haia'); if(!ap) return;
  const caixa=vis[0].parentElement;
  const larg=vis.reduce((s,c)=>s+c.offsetWidth,0)+8*(vis.length-1);                           // largura dos botões lado a lado (gap de 8px)
  const natAp=ap.offsetLeft+ap.offsetWidth+8;                                                // onde o 1º botão começa colado no Apostilamento
  const m=(natAp+larg+2<=caixa.clientWidth)
    ? Math.max(0,Math.min(alvo.offsetLeft-natAp,caixa.clientWidth-natAp-larg-2))              // cabe na linha do Apostilamento: empurra até a altura da Técnica
    : Math.max(0,Math.min(alvo.offsetLeft,caixa.clientWidth-larg-2));                         // não cabe: linha nova, alinhada à Técnica
  vis[0].style.marginLeft=m+'px';
}
/* CAIXINHA DO "OUTRO" (idioma): fica SOLTA (position:absolute) por cima do espaço livre, com a mesma altura dos botões, então nunca muda a altura do bilhete. Desktop: ao lado do botão
   "Outro"; se não couber ao lado (ou no celular, onde a linha é estreita) ela cobre o próprio botão "Outro". */
function posicionarOutro(){
  if(!outroBox||outroBox.hidden) return;
  const chip=$$('.s07-field[data-key="idioma"] .s07-chip').find(c=>c.textContent.trim()==='Outro'); if(!chip) return;
  const caixa=chip.parentElement, larg=Math.min(210,caixa.clientWidth);
  let esq=chip.offsetLeft+chip.offsetWidth+8;
  if(mobile()||esq+larg>caixa.clientWidth) esq=Math.max(0,Math.min(chip.offsetLeft,caixa.clientWidth-larg));
  Object.assign(outroBox.style,{left:esq+'px',top:chip.offsetTop+'px',width:larg+'px',height:chip.offsetHeight+'px'});
}
addEventListener('resize',()=>{ alinharExtras(); posicionarOutro(); });
if(document.fonts&&document.fonts.ready) document.fonts.ready.then(()=>{ alinharExtras(); posicionarOutro(); });
atualizarExtras();   // estado inicial (nenhum serviço escolhido): as opções ficam escondidas
extrasChips.forEach(c=>c.addEventListener('click',()=>{
  const k=c.getAttribute('data-extra'), on=!extras.includes(k);
  extras=on?extras.concat(k):extras.filter(x=>x!==k);
  c.setAttribute('aria-checked',on?'true':'false');
  resumoExtras(); atualizarMsg();
}));

/* CAIXA DE ENVIO DOS DOCUMENTOS (opcional). Por enquanto SÓ NA TELA: o cliente escolhe ou solta os arquivos, vê a lista e pode remover. Os arquivos NÃO são enviados a lugar nenhum
   (site estático; o destino do envio ainda será definido). Validação no navegador: PDF, JPG ou PNG, até 10 MB cada, no máximo 10 arquivos (limites provisórios). Nomes de arquivo entram
   na página só por textContent (nunca como HTML). */
const docsBox=$('.s07-docs'), fileIn=docsBox?$('.s07-file',docsBox):null, dropEl=docsBox?$('.s07-drop',docsBox):null, listaEl=docsBox?$('.s07-files',docsBox):null,
      dmsg=docsBox?$('.s07-drop-msg',docsBox):null, docsLi=$('.s07-sum li[data-k="docs"]');
const MAX_ARQ=10, MAX_MB=10, EXT_OK=['pdf','jpg','jpeg','png'];
let arquivos=[];
const tamanho=n=>n<1048576?Math.max(1,Math.round(n/1024))+' KB':(n/1048576).toFixed(1).replace('.',',')+' MB';
function avisoArq(t){ if(!dmsg) return; dmsg.textContent=t; dmsg.hidden=!t; }
function desenharArq(){
  if(!listaEl) return;
  listaEl.innerHTML='';
  arquivos.forEach((f,i)=>{
    const li=document.createElement('li'), nome=document.createElement('span'), tam=document.createElement('small'), x=document.createElement('button');
    nome.className='s07-fn'; nome.textContent=f.name; tam.textContent=tamanho(f.size);
    x.type='button'; x.className='s07-fx'; x.setAttribute('aria-label','Remover '+f.name); x.textContent='×';
    x.addEventListener('click',()=>{ arquivos.splice(i,1); avisoArq(''); desenharArq(); });
    li.append(nome,tam,x); listaEl.appendChild(li);
  });
  docsBox.classList.toggle('done',arquivos.length>0);
  if(docsLi){ $('b',docsLi).textContent=arquivos.length+(arquivos.length===1?' arquivo':' arquivos'); docsLi.classList.toggle('show',arquivos.length>0); }
  atualizarMsg();
}
function addArquivos(lista){
  const recusados=[];
  Array.from(lista).forEach(f=>{
    const ext=(f.name.split('.').pop()||'').toLowerCase();
    if(!EXT_OK.includes(ext)) recusados.push(f.name+' (formato não aceito)');
    else if(f.size>MAX_MB*1048576) recusados.push(f.name+' (maior que '+MAX_MB+' MB)');
    else if(arquivos.length>=MAX_ARQ) recusados.push(f.name+' (limite de '+MAX_ARQ+' arquivos)');
    else if(!arquivos.some(a=>a.name===f.name&&a.size===f.size)) arquivos.push(f);
  });
  avisoArq(recusados.length?'Não foi possível anexar: '+recusados.join('; ')+'.':'');
  desenharArq();
}
if(fileIn){
  fileIn.addEventListener('change',()=>{ addArquivos(fileIn.files); fileIn.value=''; });
  ['dragenter','dragover'].forEach(ev=>dropEl.addEventListener(ev,e=>{ e.preventDefault(); dropEl.classList.add('over'); }));
  ['dragleave','drop'].forEach(ev=>dropEl.addEventListener(ev,e=>{ e.preventDefault(); dropEl.classList.remove('over'); }));
  dropEl.addEventListener('drop',e=>{ if(e.dataTransfer&&e.dataTransfer.files) addArquivos(e.dataTransfer.files); });
}

/* mensagem montada (prévia do que seria enviado) */
const message=()=>'Olá! Quero um orçamento de '+choice.servico.toLowerCase().replace('haia','Haia')+', documento: '+choice.doc+
  ', tradução para '+choice.idioma.toLowerCase()+', plano '+choice.plano.toLowerCase()+', cliente: '+choice.nome+', e-mail: '+choice.email+', WhatsApp: '+choice.whatsapp+(estado?', estado: '+estado:'')+
  (extras.length?', '+extras.map(k=>EXTRAS[k][1]).join(' e '):'')+
  (arquivos.length?', com '+arquivos.length+(arquivos.length===1?' arquivo anexado':' arquivos anexados'):'')+'.';
function atualizarMsg(){
  if(!ready) return;
  if(!choice.idioma){ msg.textContent='Informe o idioma para completar a mensagem.'; return; }   // o cliente apagou o idioma digitado em "Outro"
  if(!(choice.nome&&choice.email&&choice.whatsapp)){ msg.textContent='Preencha o contato (nome, e-mail e WhatsApp) para completar a mensagem.'; return; }
  msg.innerHTML='Prévia da mensagem: <code>“'+message()+'”</code>'; }

/* DESTACAR: o canhoto se rasga na picote, gira pra frente e fica rosa */
function tear(){
  ready=true;
  pintarBarras(JSON.stringify(choice));   // o código de barras passa a ser do pedido montado
  eta.textContent='Resposta em até 2 horas, dentro do horário comercial.';
  msg.innerHTML='Prévia da mensagem: <code>“'+message()+'”</code>';
  const m=mobile();
  if(reduce){
    ticket.classList.add('ready'); cta.style.opacity=1; cta.classList.add('on');
    msg.style.opacity=1; again.style.opacity=1; again.classList.add('on'); return;
  }
  gsap.timeline()
    .add(()=>ticket.classList.add('ready'),.18)
    .to(body,{x:m?0:-16,y:m?-10:0,rotate:m?0:-1.2,opacity:.5,scale:.985,duration:.55,ease:'power2.out'},0)
    // o canhoto balança na picote (puxa) e se solta
    .to(stub,{rotate:m?-1.5:2,duration:.12,yoyo:true,repeat:3,ease:'sine.inOut'},0)
    .to(stub,m?{y:26,x:0,rotate:-2,scale:1,duration:.7,ease:'back.out(1.8)'}
              :{x:30,y:-8,rotate:7,scale:1.06,duration:.7,ease:'back.out(1.8)'},.5)
    .to(cta,{opacity:1,y:0,duration:.4,ease:'power2.out',onStart:()=>cta.classList.add('on')},1.05)
    .fromTo(cta,{y:14},{y:0,duration:.4,ease:'power2.out'},1.05)
    .to(msg,{opacity:1,duration:.4},1.2)
    .to(again,{opacity:1,duration:.3,onStart:()=>again.classList.add('on')},1.3);
}

again.addEventListener('click',()=>{
  choice={}; ready=false; setRota(''); pintarBarras('izitrad-0001');
  if(outroBox){ outroBox.hidden=true; outroIn.value=''; }
  contato.forEach(c=>c.reset());
  arquivos=[]; avisoArq(''); desenharArq();
  fields.forEach(f=>{f.classList.remove('done'); $$('.s07-chip',f).forEach(c=>c.setAttribute('aria-checked','false'));});
  items.forEach(li=>{li.classList.remove('on'); $('b',li).textContent='…';});
  extras=[]; extrasChips.forEach(c=>c.setAttribute('aria-checked','false')); atualizarExtras();
  bars.forEach(u=>u.classList.remove('on'));
  ticket.classList.remove('ready'); cta.classList.remove('on'); again.classList.remove('on');
  eta.textContent='Preencha os '+TOTAL+' campos para destacar o canhoto.';
  gsap.killTweensOf([body,stub,cta,msg,again]);
  gsap.to(body,{x:0,y:0,rotate:0,opacity:1,scale:1,duration:.4});
  gsap.to(stub,{x:0,y:0,rotate:0,scale:1,duration:.4});
  gsap.to([cta,msg,again],{opacity:0,duration:.2});
});

cta.addEventListener('click',e=>{ e.preventDefault(); /* destino (WhatsApp / formulário) a definir */ });

/* Menu / botões "#orcamento": o scroll nativo + scroll-padding (78px) deixaria o rótulo
   fora do padrão; levamos o topo da seção ao topo da tela, como nas outras seções
   (o rótulo nasce a 5vh). */
function irParaOrcamento(){
  window.scrollTo({top:root.getBoundingClientRect().top+scrollY,behavior:'auto'});
  return true;
}
document.querySelectorAll('a[href="#orcamento"]').forEach(a=>a.addEventListener('click',e=>{
  if(irParaOrcamento()){ e.preventDefault(); history.replaceState(null,'','#orcamento'); }
}));
if(location.hash==='#orcamento'){ setTimeout(irParaOrcamento,0); setTimeout(irParaOrcamento,600); }
})();
