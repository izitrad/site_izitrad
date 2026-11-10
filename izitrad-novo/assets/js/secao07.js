/* ===== SEÇÃO 07 — ORÇAMENTO (bilhete que se destaca) =====
   Origem: proto-orcamento.html (sketch aprovado, desktop + mobile). O visitante
   escolhe 4 campos (Documento, Idioma, Serviço, Prazo) em chips; o canhoto do
   bilhete mostra o resumo ao vivo e, ao completar, se DESTACA (balança, se solta,
   fica rosa e gira pra frente), com botão "Pedir orçamento" + prévia da mensagem.
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
const fields=$$('.s07-field'), items=$$('.s07-sum li'), bars=$$('.s07-prog u');
let ready=false, choice={};
const mobile=()=>innerWidth<=760;

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

/* escolha dos chips */
fields.forEach(f=>{
  const key=f.getAttribute('data-key');
  $$('.s07-chip',f).forEach(c=>{
    c.addEventListener('click',()=>{
      $$('.s07-chip',f).forEach(o=>o.setAttribute('aria-checked',o===c?'true':'false'));
      choice[key]=c.textContent.trim();
      f.classList.add('done');
      const li=$('.s07-sum li[data-k="'+key+'"]'), b=$('b',li);
      b.textContent=choice[key]; li.classList.add('on');
      if(!reduce) gsap.fromTo(b,{y:8,opacity:0},{y:0,opacity:1,duration:.3,ease:'power2.out'});
      update();
    });
  });
});

const count=()=>Object.keys(choice).length;
function update(){
  const n=count();
  bars.forEach((u,i)=>u.classList.toggle('on',i<n));
  if(n===4 && !ready) tear();
  else if(n<4) eta.textContent='Faltam '+(4-n)+(4-n===1?' campo':' campos')+' para destacar o canhoto.';
}

/* mensagem montada (prévia do que seria enviado) */
const message=()=>'Olá! Quero um orçamento de '+choice.servico.toLowerCase()+' — '+choice.doc.toLowerCase()+
  ', tradução para '+choice.idioma.toLowerCase()+', prazo '+choice.prazo.toLowerCase()+'.';

/* DESTACAR: o canhoto se rasga na picote, gira pra frente e fica rosa */
function tear(){
  ready=true;
  eta.textContent='Resposta em até 2 horas úteis (exemplo).';
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
  choice={}; ready=false;
  fields.forEach(f=>{f.classList.remove('done'); $$('.s07-chip',f).forEach(c=>c.setAttribute('aria-checked','false'));});
  items.forEach(li=>{li.classList.remove('on'); $('b',li).textContent='—';});
  bars.forEach(u=>u.classList.remove('on'));
  ticket.classList.remove('ready'); cta.classList.remove('on'); again.classList.remove('on');
  eta.textContent='Preencha os 4 campos para destacar o canhoto.';
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
