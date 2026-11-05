/* =====================================================================
   IZITRAD — Seção 03 (v29N "orbital") · nós/triângulos (WebGL)
   ---------------------------------------------------------------------
   Módulo (type=module) — importa Three.js igual à demo v29N. Constrói os
   4 triângulos (serviços) + movimento orbital + oclusão dos nós (metade
   traseira atrás do doc / frontal na frente) + labels de profundidade +
   hit-area + detail/popover + energia.

   TUDO ancorado na GEOMETRIA FINAL FIXA exposta por SolucaoOrbital
   (getGeometry → {cx,cy,base}) — o orbital NUNCA é montado no centro.
   Roda num rAF próprio (movimento orbital contínuo, como na v29N); a
   REVELAÇÃO vem do fade das camadas .s3o-back/.s3o-front (controlado pelo
   scrub em solucao-orbital.js), então os nós aparecem/somem junto com a
   composição e a reversibilidade é preservada.
   ===================================================================== */
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";

const SO = window.SolucaoOrbital;
if(SO && SO.state && SO.state.ready){
  boot();
} else {
  // se o motor clássico ainda não montou (ex.: gsap/reduced-motion), não faz nada.
  // (em reduced-motion a Seção 03 fica estática, sem WebGL — comportamento aceito.)
}

function boot(){
  const solStage = document.querySelector('.sol-stage');
  const L = SO.layers;
  const nodesFront=L.nodesFront, nodesBack=L.nodesBack, nodesUI=L.nodesUI;
  const labelsBack=L.labelsBack, labelsFront=L.labelsFront;
  const pop=L.popover, glowEl=L.glow, energySvg=L.energy;
  if(!nodesFront || !pop) return;

  /* PERF #1 (gating por visibilidade): suspende o trabalho contínuo do loop
     (movimento orbital + placeNodes + render dos 4 triângulos) quando a Seção
     03 está fora da área relevante da viewport. NUNCA destrói/recria renderer,
     geometria, materiais, estado orbital (angle), nós ou labels — só PULA o
     corpo do frame e retoma. `rootMargin` generoso pré-ativa antes da seção
     aparecer, evitando primeiro-frame atrasado na transição 02→03. Ao voltar,
     um placeNodes reposiciona tudo no estado correto do scroll, sem salto/flash. */
  const secEl = document.querySelector('.sec-solucao');
  let secVisible = true;
  if('IntersectionObserver' in window && secEl){
    new IntersectionObserver(es=>{ secVisible = es.some(e=>e.isIntersecting); }, {rootMargin:'600px'}).observe(secEl);
  }

  const PLANES = [
    { sy:.47, rot:-8, scale:.68 },
    { sy:.49, rot:-8, scale:.86 },
    { sy:.51, rot:-8, scale:1.04 },
    { sy:.53, rot:-8, scale:1.22 }
  ];
  const serviceToPlane=[2,0,1,3];

  const services = [
    { title:"Tradução<br>Juramentada", text:"Traduções oficiais com validade legal no Brasil e no exterior.",
      list:["Documentos pessoais","Documentos acadêmicos","Documentos empresariais","Uso em órgãos oficiais"] },
    { title:"Tradução<br>Certificada", text:"Traduções acompanhadas de certificação para instituições, empresas e processos específicos.",
      list:["Certificados e declarações","Documentos acadêmicos","Processos internacionais","Demandas institucionais"] },
    { title:"Tradução<br>Técnica", text:"Conteúdo técnico traduzido com precisão, consistência terminológica e atenção ao contexto.",
      list:["Manuais e catálogos","Documentação corporativa","Conteúdo especializado","Materiais técnicos"] },
    { title:"Tradução<br>Simples", text:"Traduções para usos cotidianos, profissionais e informativos, com agilidade e clareza.",
      list:["Textos pessoais","Conteúdo profissional","Materiais informativos","Demandas rápidas"] }
  ];

  /* ---- botões (triângulo WebGL) + hit-area + label ---- */
  const buttons=[], uiNodes=[], depthLabels=[];
  services.forEach((s,i)=>{
    const b=document.createElement('button');
    b.type='button'; b.className='s3o-node'+(i===0?' active':''); b.dataset.index=i;
    b.setAttribute('aria-label', s.title.replace(/<br>/g,' '));
    b.innerHTML='<span class="s3o-halo"></span><canvas></canvas><span class="s3o-label">'+s.title+'</span>';
    nodesFront.appendChild(b); buttons.push(b);

    const u=document.createElement('button');
    u.type='button'; u.className='s3o-node-ui';
    u.setAttribute('aria-label', s.title.replace(/<br>/g,' '));
    u.innerHTML='<span class="s3o-ui-label">'+s.title+'</span>';
    nodesUI.appendChild(u); uiNodes.push(u);

    const dl=document.createElement('div');
    dl.className='s3o-label-depth';
    dl.innerHTML='<span class="s3o-depth-label">'+s.title+'</span>';
    labelsFront.appendChild(dl); depthLabels.push(dl);
  });

  /* ---- TriangleButton (Three.js) — port da v29N ---- */
  class TriangleButton{
    constructor(button){
      this.button=button; this.canvas=button.querySelector('canvas');
      this.renderer=new THREE.WebGLRenderer({canvas:this.canvas,antialias:true,alpha:true,powerPreference:"high-performance"});
      this.renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));
      this.renderer.outputColorSpace=THREE.SRGBColorSpace;
      this.scene=new THREE.Scene();
      this.camera=new THREE.PerspectiveCamera(34,1,.1,20); this.camera.position.set(0,0,6.25);
      this.group=new THREE.Group(); this.scene.add(this.group);
      const geometry=new THREE.ExtrudeGeometry(this.tri(.30),{depth:.54,bevelEnabled:true,bevelSegments:7,steps:1,bevelSize:.11,bevelThickness:.09,curveSegments:32});
      geometry.center();
      const material=new THREE.MeshPhysicalMaterial({color:0xff0099,roughness:.34,metalness:0,clearcoat:.34,clearcoatRoughness:.28,emissive:0x220012,emissiveIntensity:.22});
      this.mesh=new THREE.Mesh(geometry,material);
      this.mesh.rotation.x=THREE.MathUtils.degToRad(-7);
      this.mesh.rotation.y=THREE.MathUtils.degToRad(-20);
      this.mesh.rotation.z=THREE.MathUtils.degToRad(-92);
      this.mesh.scale.setScalar(1.02); this.group.add(this.mesh);
      this.scene.add(new THREE.HemisphereLight(0xffffff,0xa60060,1.25));
      const key=new THREE.DirectionalLight(0xffffff,2.05); key.position.set(-3.6,4.8,5.5); this.scene.add(key);
      const fill=new THREE.PointLight(0xff4fbd,1.7,9); fill.position.set(2.8,-1.0,3.6); this.scene.add(fill);
      const vio=new THREE.PointLight(0x7f28ff,.75,8); vio.position.set(-2.8,1.6,2.4); this.scene.add(vio);
      this.pointerX=0; this.pointerY=0; this.targetX=0; this.targetY=0; this.hovered=false; this.hoverVisual=0;
      this.resize();
    }
    tri(radius){
      const pts=[new THREE.Vector2(0,1.75),new THREE.Vector2(-1.55,-1.15),new THREE.Vector2(1.55,-1.15)];
      const shape=new THREE.Shape();
      const pa=(a,b,d)=>{const v=new THREE.Vector2().subVectors(b,a);const len=v.length();return a.clone().add(v.multiplyScalar(d/len));};
      const a=pts[0],b=pts[1],c=pts[2];
      const a1=pa(a,c,radius),a2=pa(a,b,radius),b1=pa(b,a,radius),b2=pa(b,c,radius),c1=pa(c,b,radius),c2=pa(c,a,radius);
      shape.moveTo(a1.x,a1.y); shape.quadraticCurveTo(a.x,a.y,a2.x,a2.y);
      shape.lineTo(b1.x,b1.y); shape.quadraticCurveTo(b.x,b.y,b2.x,b2.y);
      shape.lineTo(c1.x,c1.y); shape.quadraticCurveTo(c.x,c.y,c2.x,c2.y);
      shape.lineTo(a1.x,a1.y); return shape;
    }
    resize(){ const r=this.button.getBoundingClientRect(); const s=Math.max(74,Math.round(r.width)); this.renderer.setSize(s,s,false); this.camera.aspect=1; this.camera.updateProjectionMatrix(); }
    render(t,active){
      const yBase=THREE.MathUtils.degToRad(-20), xBase=THREE.MathUtils.degToRad(-7);
      this.pointerX+=(this.targetX-this.pointerX)*.15; this.pointerY+=(this.targetY-this.pointerY)*.15;
      const mY=this.pointerX*THREE.MathUtils.degToRad(18), mX=-this.pointerY*THREE.MathUtils.degToRad(14);
      const aY=Math.sin(t*.00042)*THREE.MathUtils.degToRad(4.5), aX=Math.cos(t*.00031)*THREE.MathUtils.degToRad(1.6);
      this.mesh.rotation.y=yBase+aY+mY; this.mesh.rotation.x=xBase+aX+mX; this.mesh.rotation.z=THREE.MathUtils.degToRad(-92);
      const targetScale=(this.hovered?1.11:1)*(active?1.055:1);
      this.group.scale.setScalar(THREE.MathUtils.lerp(this.group.scale.x||1,targetScale,.20));
      this.group.position.z=THREE.MathUtils.lerp(this.group.position.z,this.hovered?.25:0,.20);
      this.hoverVisual=THREE.MathUtils.lerp(this.hoverVisual,this.hovered?1:0,.22);
      this.mesh.material.emissiveIntensity=.22+this.hoverVisual*.34;
      this.mesh.material.clearcoat=.34+this.hoverVisual*.38;
      this.mesh.material.roughness=.34-this.hoverVisual*.10;
      this.group.position.y=Math.sin(t*.00075)*.03;
      this.renderer.render(this.scene,this.camera);
    }
  }
  const triangles=buttons.map(b=>new TriangleButton(b));

  /* ---- popover (detail) ---- */
  const dTitle=pop.querySelector('.s3o-detail-title'), dText=pop.querySelector('.s3o-detail-text');
  const dList=pop.querySelector('.s3o-detail-list'), dIndex=pop.querySelector('.s3o-index');
  const dBackdrop=pop.querySelector('.s3o-popover__backdrop');

  let selected=0, angle=-Math.PI/2, targetAngle=angle, speed=0.00008;
  let paused=false, snapping=false, pendingOpenIndex=null, snapDuration=420, last=performance.now();

  function updateDetail(i){
    selected=i; buttons.forEach((b,k)=>b.classList.toggle('active',k===i));
    const s=services[i];
    dIndex.textContent=String(i+1).padStart(2,'0')+' / 04';
    dTitle.innerHTML=s.title; dText.textContent=s.text;
    dList.innerHTML=s.list.map(x=>'<li>'+x+'</li>').join('');
  }
  function positionPopover(button){
    const panel=pop.querySelector('.s3o-detail'); const br=button.getBoundingClientRect();
    const panelW=Math.min(390,innerWidth-32), approxH=430, gap=22;
    let left=br.right+gap, top=br.top+br.height*.25;
    if(left+panelW>innerWidth-16) left=br.left-panelW-gap;
    if(left<16) left=Math.max(16,(innerWidth-panelW)/2);
    if(top+approxH>innerHeight-16) top=innerHeight-approxH-16;
    if(top<16) top=16;
    panel.style.left=left+'px'; panel.style.top=top+'px';
    panel.style.transformOrigin=(left>br.left?'0% 18%':'100% 18%');
  }
  function closePopover(){ pop.classList.remove('open'); pop.setAttribute('aria-hidden','true'); if(!snapping) paused=false; }
  function shortestSignedAngle(delta){ const TAU=Math.PI*2; let d=((delta+Math.PI)%TAU+TAU)%TAU-Math.PI; if(Math.abs(Math.abs(d)-Math.PI)<0.0001) d=-Math.PI; return d; }

  /* ---- energia percorrendo o anel ---- */
  const trail=energySvg.querySelector('.saturn-energy-trail');
  const head=energySvg.querySelector('.saturn-energy-head');
  const glowHead=energySvg.querySelector('.saturn-energy-head-glow');
  let energyRAF=0;
  function fireEnergy(i){
    if(!trail) return;
    cancelAnimationFrame(energyRAF);
    const G=SO.getGeometry(); const cx=G.cx, cy=G.cy, base=G.base;
    const p=PLANES[serviceToPlane[i]];
    const rx=(base*p.scale)/2, ry=rx*p.sy, rot=p.rot*Math.PI/180;
    const step=Math.PI*2/buttons.length, startA=angle+i*step;
    const TAU=Math.PI*2, duration=1150, trailSpan=.48, start=performance.now();
    const sr=solStage.getBoundingClientRect();
    energySvg.setAttribute('viewBox','0 0 '+Math.max(1,sr.width)+' '+Math.max(1,sr.height));
    energySvg.classList.add('energy-live');
    const point=a=>{const ex=Math.cos(a)*rx,ey=Math.sin(a)*ry;return{x:cx+ex*Math.cos(rot)-ey*Math.sin(rot),y:cy+ex*Math.sin(rot)+ey*Math.cos(rot)};};
    function frame(now){
      const raw=Math.min(1,(now-start)/duration), e=1-Math.pow(1-raw,3), a=startA+TAU*e;
      const energy=Math.pow(1-raw,.72), headE=Math.pow(1-raw,.58), trailE=Math.pow(1-raw,.82);
      const liveSpan=.10+trailSpan*(.20+.80*trailE), segs=26; let d='';
      for(let s=0;s<=segs;s++){const q=s/segs;const pt=point(a-liveSpan*(1-q));d+=(s===0?'M ':' L ')+pt.x.toFixed(2)+' '+pt.y.toFixed(2);}
      const hp=point(a);
      trail.setAttribute('d',d); head.setAttribute('cx',hp.x); head.setAttribute('cy',hp.y);
      glowHead.setAttribute('cx',hp.x); glowHead.setAttribute('cy',hp.y);
      head.setAttribute('r',(1.5+5.8*headE).toFixed(2)); glowHead.setAttribute('r',(4.0+11.5*headE).toFixed(2));
      head.style.opacity=String(.12+.88*headE); glowHead.style.opacity=String(.05+.95*Math.pow(energy,1.18)); trail.style.opacity=String(.06+.94*trailE);
      trail.style.strokeWidth=(1.5+5.2*trailE).toFixed(2);
      if(raw<1) energyRAF=requestAnimationFrame(frame); else { energySvg.classList.remove('energy-live'); trail.setAttribute('d',''); }
    }
    energyRAF=requestAnimationFrame(frame);
  }

  function openPopover(i){
    fireEnergy(i);
    if(glowEl){ glowEl.classList.remove('izi-filled-pulse'); void glowEl.offsetWidth; glowEl.classList.add('izi-filled-pulse'); }
    closePopover(); updateDetail(i);
    const step=Math.PI*2/buttons.length, cur=angle+i*step, top=-Math.PI/2;
    let delta=shortestSignedAngle(top-cur); delta=THREE.MathUtils.clamp(delta,-Math.PI,Math.PI);
    targetAngle=angle+delta;
    snapDuration=(Math.abs(Math.abs(delta)-Math.PI)<0.03)?650:420;
    pendingOpenIndex=i; snapping=true; paused=true;
  }

  /* ---- interações (hit-area repassa hover/tilt + clique) ---- */
  uiNodes.forEach((u,i)=>{
    const tri=triangles[i];
    const tilt=e=>{const r=u.getBoundingClientRect();tri.targetX=THREE.MathUtils.clamp(((e.clientX-r.left)/r.width-.5)*2,-1,1);tri.targetY=THREE.MathUtils.clamp(((e.clientY-r.top)/r.height-.5)*2,-1,1);};
    u.addEventListener('pointerenter',e=>{tri.hovered=true;buttons[i].classList.add('ui-hover');if(glowEl)glowEl.classList.add('nucleo-active');tilt(e);});
    u.addEventListener('pointermove',tilt);
    u.addEventListener('pointerleave',()=>{tri.hovered=false;buttons[i].classList.remove('ui-hover');if(glowEl)glowEl.classList.remove('nucleo-active');tri.targetX=0;tri.targetY=0;});
    u.addEventListener('click',()=>openPopover(i));
    u.addEventListener('focus',()=>{tri.hovered=true;buttons[i].classList.add('ui-hover');if(glowEl)glowEl.classList.add('nucleo-active');});
    u.addEventListener('blur',()=>{tri.hovered=false;buttons[i].classList.remove('ui-hover');if(glowEl)glowEl.classList.remove('nucleo-active');});
  });
  pop.querySelector('[data-nav="prev"]').onclick=()=>{const i=(selected+services.length-1)%services.length;updateDetail(i);positionPopover(buttons[i]);};
  pop.querySelector('[data-nav="next"]').onclick=()=>{const i=(selected+1)%services.length;updateDetail(i);positionPopover(buttons[i]);};
  function cancelAndClose(){pendingOpenIndex=null;snapping=false;targetAngle=angle;closePopover();}
  pop.querySelector('[data-nav="close"]').onclick=cancelAndClose;
  dBackdrop.onclick=cancelAndClose;
  document.addEventListener('keydown',e=>{if(e.key==='Escape')cancelAndClose();});
  addEventListener('resize',()=>{triangles.forEach(t=>t.resize());if(pop.classList.contains('open'))positionPopover(buttons[selected]);},{passive:true});

  /* ---- posicionamento orbital (ancorado na geometria FINAL FIXA) ---- */
  function placeNodes(){
    const G=SO.getGeometry(); const cx=G.cx, cy=G.cy, base=G.base; const rot=-8*Math.PI/180;
    buttons.forEach((b,i)=>{
      const a=angle+i*(Math.PI*2/buttons.length); const p=PLANES[serviceToPlane[i]];
      const rx=(base*p.scale)/2, ry=rx*p.sy;
      const ex=Math.cos(a)*rx, ey=Math.sin(a)*ry;
      const x=cx+ex*Math.cos(rot)-ey*Math.sin(rot), y=cy+ex*Math.sin(rot)+ey*Math.cos(rot);
      const depth=(Math.sin(a)+1)/2, de=depth*depth*(3-2*depth);
      const minS=p.scale>=1.20?.73:p.scale>=1.00?.76:p.scale>=.80?.79:.82;
      // rv = fator de revelação do ANEL deste serviço (0..1, vem da timeline em
      // solucao-orbital.js: o triângulo e o rótulo aparecem junto com o seu
      // anel). Abaixo de .02 fica visibility:hidden pra não ser clicável
      // enquanto invisível. Sem o fator (ex.: timeline não rodou), vale 1.
      const rr=SO.state&&SO.state.rr; const rv=rr?rr['p'+serviceToPlane[i]]:1;
      const hid=rv<.02?'hidden':'';
      const sc=(minS+de*(1.08-minS)), op=(.58+de*.42)*rv;
      // PERF: posiciona por TRANSFORM (não left/top) → sem reflow por frame.
      // O centro fica em (x,y) via translate(px) + translate(-50%,-50%) (metade
      // do próprio tamanho), depois scale. Visualmente idêntico ao anterior.
      const tr='translate('+x+'px,'+y+'px) translate(-50%,-50%) scale('+sc+')';
      b.style.transform=tr; b.style.opacity=op; b.style.visibility=hid;
      const u=uiNodes[i]; u.style.transform=tr; u.style.opacity=op; u.style.visibility=hid;
      const dl=depthLabels[i]; dl.style.transform=tr; dl.style.opacity=op; dl.style.visibility=hid;
      const labelLayer=depth<.5?labelsBack:labelsFront; if(dl.parentElement!==labelLayer) labelLayer.appendChild(dl);
      const nodeLayer=depth<.5?nodesBack:nodesFront; if(b.parentElement!==nodeLayer) nodeLayer.appendChild(b); b.style.zIndex=1;
    });
  }

  function animate(t){
    const dt=Math.min(34,t-last); last=t;
    // gating: fora da seção OU antes da composição revelar (ex.: DURANTE o
    // deslize do documento, quando .s3o-front ainda está invisível) → só mantém
    // o rAF vivo e pula o trabalho pesado (movimento orbital + placeNodes + 4
    // renders WebGL). Nada é destruído; ao revelar/assentar, retoma no estado
    // correto (placeNodes reposiciona; o ângulo não pula). Deixa o TRAJETO do
    // documento sem carga concorrente.
    const revealed = SO.layers.frontC ? (parseFloat(getComputedStyle(SO.layers.frontC).opacity)||0) > 0.02 : true;
    if(!secVisible || !revealed){ requestAnimationFrame(animate); return; }
    if(snapping){
      const rem=targetAngle-angle, ease=1-Math.pow(0.001,dt/snapDuration); angle+=rem*ease;
      if(Math.abs(targetAngle-angle)<0.0012){
        angle=targetAngle; snapping=false;
        if(pendingOpenIndex!==null){ const i=pendingOpenIndex; pendingOpenIndex=null;
          requestAnimationFrame(()=>{ positionPopover(buttons[i]); pop.classList.add('open'); pop.setAttribute('aria-hidden','false'); paused=true; }); }
      }
    } else if(!paused){
      angle+=speed*dt;
      if(Math.abs(angle)>Math.PI*8){ angle=Math.atan2(Math.sin(angle),Math.cos(angle)); targetAngle=angle; }
    }
    placeNodes();
    triangles.forEach((s,i)=>s.render(t,i===selected));
    requestAnimationFrame(animate);
  }
  updateDetail(0);
  requestAnimationFrame(animate);
}
