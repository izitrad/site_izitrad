/* =====================================================================
   ESFERAS 3D DOS CRACHÁS NUMERADOS (seção "O Caminho")
   Porta o protótipo aprovado (aprovado-izitrad_cards_threejs_aprovada_
   velocidade_00042.html — pasta _izi-GPT) pro site: substitui só o
   círculo rosa numerado (.chip small) por uma esfera Three.js real, com
   o número pintado na própria textura. Módulo INDEPENDENTE de propósito:
   não importa/toca site.js, não mexe na timeline GSAP/ScrollTrigger que
   já revela .chip small (opacity/scale) — a esfera só RENDERIZA dentro
   do mesmo elemento; quem controla se ela aparece continua sendo a
   timeline de sempre (buildCaminho, site.js).
   ===================================================================== */
let THREE;
try {
  THREE = await import("https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js");
} catch (e1) {
  try {
    THREE = await import("https://unpkg.com/three@0.180.0/build/three.module.js");
  } catch (e2) {
    THREE = await import("https://esm.sh/three@0.180.0");
  }
}

class NumberSphere {
  constructor(root, label){
    this.root = root;
    this.canvas = root.querySelector("canvas");
    this.label = label;

    try {
      this.renderer = new THREE.WebGLRenderer({
        canvas:this.canvas,
        antialias:true,
        alpha:true,
        powerPreference:"high-performance"
      });
    } catch(err) {
      console.error("Falha ao iniciar WebGL da esfera:", err);
      this.root.classList.add("sphere-fallback");
      return;
    }
    if(!this.renderer) return;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(36,1,.1,20);
    this.camera.position.set(0,0,5.2);

    this.group = new THREE.Group();
    this.scene.add(this.group);

    const texture = this.createTexture(label);

    const geometry = new THREE.SphereGeometry(1.5,72,72);
    // sem clearcoat (era o principal responsável pelo reflexo tipo Fresnel/
    // "bola de bilhar") e roughness maior (mais fosca, menos espelhada) —
    // ajuste pedido depois de ver ao vivo: brilho excessivo nas luzes
    // abaixo, não previsto ao portar o protótipo aprovado.
    const material = new THREE.MeshPhysicalMaterial({
      map:texture,
      roughness:.62,
      metalness:.01,
      clearcoat:0
    });

    this.sphere = new THREE.Mesh(geometry,material);
    this.group.add(this.sphere);

    // número sempre de frente pro viewer no repouso
    this.frontY = 0;
    this.limit = THREE.MathUtils.degToRad(34);
    this.autoDir = 1;
    this.group.rotation.y = this.frontY;

    // HemisphereLight é luz difusa/ambiente (sem brilho pontual) — subir
    // ela é o jeito seguro de deixar o rosa mais vivo sem voltar a criar
    // pontos de reflexo fortes.
    this.scene.add(new THREE.HemisphereLight(0xffffff,0x640038,2.8));

    this.key = new THREE.DirectionalLight(0xffffff,2.8);
    this.key.position.set(-3.4,4.2,5);
    this.scene.add(this.key);

    const rim = new THREE.PointLight(0xff4db5,2.2,9);
    rim.position.set(3,-.8,2.5);
    this.scene.add(rim);

    const fill = new THREE.PointLight(0xffd4ec,2,8);
    fill.position.set(-2,-2.2,3);
    this.scene.add(fill);

    this.dragging = false;
    this.lastX = 0;
    this.lastY = 0;
    this.vx = 0;
    this.vy = 0;

    this.resize();
    this.bindPointer();
  }

  createTexture(text){
    const c = document.createElement("canvas");
    c.width = 2048;
    c.height = 1024;

    const ctx = c.getContext("2d");
    ctx.fillStyle = "#ff0099";
    ctx.fillRect(0,0,c.width,c.height);

    const grd = ctx.createLinearGradient(0,0,c.width,0);
    grd.addColorStop(0,"rgba(120,0,70,.20)");
    grd.addColorStop(.22,"rgba(255,255,255,.05)");
    grd.addColorStop(.50,"rgba(255,255,255,.12)");
    grd.addColorStop(.78,"rgba(110,0,65,.10)");
    grd.addColorStop(1,"rgba(120,0,70,.20)");
    ctx.fillStyle = grd;
    ctx.fillRect(0,0,c.width,c.height);

    ctx.save();
    ctx.translate(c.width*.25,c.height*.50);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#ffffff";
    ctx.font = "900 150px Arial, sans-serif";
    ctx.shadowColor = "rgba(75,0,45,.20)";
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 6;
    ctx.fillText(text,0,20);
    ctx.restore();

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    tex.needsUpdate = true;
    return tex;
  }

  resize(){
    if(!this.renderer) return;
    // offsetWidth (não getBoundingClientRect) de propósito: o crachá nasce
    // com scale:.7 na timeline de entrada (buildCaminho, site.js) e, no
    // carregamento da página, a timeline está no início desse estado —
    // getBoundingClientRect() mediria o tamanho JÁ ENCOLHIDO pelo scale
    // (~35px em vez dos 50px reais), dimensionando o renderer pra uma
    // resolução baixa que depois aparece esticada (borrada) quando o
    // scroll revela o card e o scale volta a 1. offsetWidth ignora
    // transforms e sempre reflete o tamanho CSS real da caixa.
    const s = Math.max(2, Math.round(this.root.offsetWidth));
    this.renderer.setSize(s,s,false);
    this.camera.aspect = 1;
    this.camera.updateProjectionMatrix();
  }

  bindPointer(){
    this.canvas.style.pointerEvents = "auto";
    this.canvas.style.touchAction = "none";
    this.canvas.style.cursor = "grab";

    this.canvas.addEventListener("pointerdown",e=>{
      this.dragging = true;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
      this.vx = 0;
      this.vy = 0;
      this.canvas.style.cursor = "grabbing";
      this.canvas.setPointerCapture?.(e.pointerId);
    });

    this.canvas.addEventListener("pointermove",e=>{
      if(!this.dragging) return;

      const dx = e.clientX-this.lastX;
      const dy = e.clientY-this.lastY;

      const ry = dx*.0055;
      const rx = dy*.0055;

      this.group.rotation.y += ry;
      this.group.rotation.x += rx;

      this.vy = ry;
      this.vx = rx;

      this.lastX = e.clientX;
      this.lastY = e.clientY;
    });

    const release = ()=>{
      this.dragging = false;
      this.canvas.style.cursor = "grab";
    };

    this.canvas.addEventListener("pointerup",release);
    this.canvas.addEventListener("pointercancel",release);
  }

  render(){
    if(!this.renderer) return;
    if(!this.dragging){
      let rel = this.group.rotation.y - this.frontY;

      this.group.rotation.y += this.vy;
      this.group.rotation.x += this.vx;
      this.vx *= .90;
      this.vy *= .90;

      rel = this.group.rotation.y - this.frontY;
      if(rel >= this.limit){
        this.group.rotation.y = this.frontY + this.limit;
        this.vy = 0;
        this.autoDir = -1;
      } else if(rel <= -this.limit){
        this.group.rotation.y = this.frontY - this.limit;
        this.vy = 0;
        this.autoDir = 1;
      }

      if(Math.abs(this.vy) < .00025){
        this.group.rotation.y += .00042 * this.autoDir;
      }
    } else {
      const minY = this.frontY - this.limit;
      const maxY = this.frontY + this.limit;
      this.group.rotation.y = Math.max(minY,Math.min(maxY,this.group.rotation.y));
    }

    this.renderer.render(this.scene,this.camera);
  }
}

const sphereMap = new Map();

document.querySelectorAll(".chip small").forEach(badge=>{
  const numEl = badge.querySelector(".badge-num");
  const number = numEl?.textContent?.trim() || "01";
  const sphere = new NumberSphere(badge,number);
  sphereMap.set(badge,sphere);
  // número HTML só existe como fallback (ver .sphere-fallback no CSS) —
  // com a esfera funcionando, o número real vive na textura dela.
  if(numEl && sphere.renderer) numEl.style.display = "none";
});

function renderAll(){
  sphereMap.forEach(s=>s.render());
  requestAnimationFrame(renderAll);
}
renderAll();

window.addEventListener("resize",()=>{
  sphereMap.forEach(s=>s.resize());
});
