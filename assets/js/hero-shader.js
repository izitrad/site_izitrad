/* ================================================================
   izidoc — ondas interativas da Hero (Canvas 2D, sem framework)

   Substitui o plasma WebGL anterior por uma malha de linhas horizontais
   que ondulam sozinhas com o tempo e reagem à posição do mouse — no
   espírito do componente "Interactive Waves" (linhas + ruído + resposta
   ao ponteiro), refeito do zero em Canvas 2D puro para não depender de
   WebGL nem de bibliotecas externas.

   Mantém a assinatura initHeroShader(canvas) e o contrato de retorno
   {play, pause} para não exigir mudanças em cinematic.js.
   ================================================================ */

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* paleta izidoc (0..255) */
const PINK_RGB = [236, 0, 140];   /* #EC008C */
const INK_RGB  = [20, 20, 22];    /* #141416 */

/* pseudo-ruído suave por soma de cossenos — mesma técnica já usada no
   shader anterior (função random() do GLSL), contínua e barata, sem
   precisar de tabelas de permutação nem de lib de Perlin/Simplex */
function noise(t) {
  return (Math.cos(t) + Math.cos(t * 1.3 + 1.3) + Math.cos(t * 1.4 + 1.4)) / 3;
}

export function initHeroShader(canvas) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const isMobile = window.matchMedia('(max-width: 640px)').matches;
  const numLines = isMobile ? 10 : 16;
  const ampBase = 14;        // amplitude do movimento ambiente, em px CSS
  const mouseRadius = 220;   // raio de influência do mouse, em px CSS
  const mouseStrength = 46;  // força máxima do "empurrão" perto do mouse

  let W = 1, H = 1, dpr = 1, segments = 40;
  const resize = () => {
    const cw = Math.max(1, canvas.clientWidth);
    const ch = Math.max(1, canvas.clientHeight);
    // DPR limitado: o custo do laço de pontos cresce com a resolução, e num
    // fundo difuso como este não dá pra perceber acima de ~1.5x.
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(cw * dpr);
    canvas.height = Math.round(ch * dpr);
    W = cw;
    H = ch;
    segments = Math.max(24, Math.min(64, Math.round(W / 22)));
  };
  window.addEventListener('resize', resize, { passive: true });
  resize();

  // mouse "cru" (tx/ty, direto do evento) vs. suavizado (x/y, com lerp por
  // quadro) — sem o lerp a onda "gruda" na posição do cursor a cada frame
  // em vez de fluir atrás dele.
  const mouse = { x: -9999, y: -9999, tx: -9999, ty: -9999, active: false };
  const onMove = (e) => {
    const r = canvas.getBoundingClientRect();
    mouse.tx = e.clientX - r.left;
    mouse.ty = e.clientY - r.top;
    mouse.active = true;
  };
  const onLeave = () => { mouse.active = false; };
  window.addEventListener('pointermove', onMove, { passive: true });
  canvas.addEventListener('pointerleave', onLeave, { passive: true });

  const start = performance.now();

  const drawFrame = (time) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(dpr, dpr);

    mouse.x += (mouse.tx - mouse.x) * 0.08;
    mouse.y += (mouse.ty - mouse.y) * 0.08;

    // brilho suave seguindo o mouse — mesma ideia do .glow-follow usado no
    // resto do site, aqui desenhado no canvas em vez de CSS
    if (mouse.active) {
      const glow = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, mouseRadius);
      glow.addColorStop(0, 'rgba(236,0,140,0.10)');
      glow.addColorStop(1, 'rgba(236,0,140,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, W, H);
    }

    ctx.lineWidth = 1;
    ctx.lineCap = 'round';

    for (let l = 0; l < numLines; l++) {
      const t = l / (numLines - 1);            // 0..1, topo → base
      const baseY = H * (0.08 + t * 0.86);      // margem de 8% em cima/baixo
      const edgeFade = Math.sin(t * Math.PI);   // some perto das bordas

      ctx.beginPath();
      for (let s = 0; s <= segments; s++) {
        const px = (s / segments) * W;
        const phase = time * 0.35 + t * 4.2;
        const ambient =
          noise(px * 0.012 + phase) * ampBase +
          noise(px * 0.004 - phase * 0.6) * ampBase * 0.6;

        let py = baseY + ambient * edgeFade;

        if (mouse.active) {
          const dx = px - mouse.x;
          const dy = py - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < mouseRadius) {
            const f = 1 - dist / mouseRadius;
            py -= f * f * mouseStrength * edgeFade;
          }
        }

        if (s === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }

      // gradiente de cor por profundidade: rosa vivo no topo, leve véu de
      // tinta escura nas linhas de baixo — nunca chega a ficar preto puro
      const mixF = t * 0.35;
      const r = Math.round(PINK_RGB[0] + (INK_RGB[0] - PINK_RGB[0]) * mixF);
      const g = Math.round(PINK_RGB[1] + (INK_RGB[1] - PINK_RGB[1]) * mixF);
      const b = Math.round(PINK_RGB[2] + (INK_RGB[2] - PINK_RGB[2]) * mixF);
      const opacity = (0.14 + t * 0.05) * edgeFade;
      ctx.strokeStyle = `rgba(${r},${g},${b},${opacity.toFixed(3)})`;
      ctx.stroke();
    }

    ctx.restore();
  };

  if (reduceMotion) {
    drawFrame(1.4);           // um quadro parado, sem animação nem mouse
    return { play() {}, pause() {} };
  }

  let raf = null, running = false;
  const loop = () => {
    drawFrame((performance.now() - start) / 1000);
    raf = requestAnimationFrame(loop);
  };
  const play = () => { if (!running) { running = true; loop(); } };
  const pause = () => { running = false; if (raf) cancelAnimationFrame(raf); raf = null; };

  // fora de vista, não gasta CPU — a Hero sai da tela logo no primeiro
  // scroll e a onda não precisa continuar rodando.
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => {
      entries[0].isIntersecting ? play() : pause();
    }, { threshold: 0 }).observe(canvas);
  } else {
    play();
  }

  drawFrame(0);                // primeiro quadro imediato, para não piscar branco
  return { play, pause };
}
