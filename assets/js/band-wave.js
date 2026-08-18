/* ================================================================
   izidoc — onda animada da faixa escura (Canvas 2D, sem framework)

   Porte do componente React HeroWave (dynamic-wave-canvas-background)
   para JS vanilla: o site é HTML/CSS/JS estático. O efeito é um campo de
   plasma calculado por pixel — GLSL-like, mas rodando em Canvas 2D.

   Três adaptações em relação ao original:

   1. Escopo. O original cobre a janela inteira (window.innerWidth/Height).
      Aqui o canvas pertence à faixa escura (.dark-band) e é dimensionado
      pelo próprio elemento — senão a proporção do plasma quebra.

   2. Cor. O original é um plasma azul/roxo. Aqui o campo dirige um brilho
      ROSA da marca (#EC008C) sobre a base navy (#141416), mantido escuro e
      sutil para não competir com os números rosa nem com o texto claro por
      cima.

   3. Custo. É um laço duplo por pixel na CPU. Para um fundo sutil isso não
      precisa de resolução alta nem 60fps: resolução interna reduzida (SCALE),
      throttle de FPS, pausa fora de vista e quadro único em reduced-motion.
   ================================================================ */

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* tabelas de seno/cosseno — evitam Math.sin/cos milhares de vezes por frame */
const TABLE = 1024;
const SIN = new Float32Array(TABLE);
const COS = new Float32Array(TABLE);
for (let i = 0; i < TABLE; i++) {
  const a = (i / TABLE) * Math.PI * 2;
  SIN[i] = Math.sin(a);
  COS[i] = Math.cos(a);
}
const TAU = Math.PI * 2;
const fastSin = (x) => SIN[(((x % TAU) / TAU) * TABLE | 0) & (TABLE - 1)];
const fastCos = (x) => COS[(((x % TAU) / TAU) * TABLE | 0) & (TABLE - 1)];

/* paleta izidoc (0..1) */
const NAVY = { r: 0.078, g: 0.078, b: 0.086 };  /* #141416 */
const PINK = { r: 0.925, g: 0.0,   b: 0.549 };  /* #EC008C */
const GLOW = 0.55;   /* teto do brilho rosa */

export function initBandWave(canvas) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // resolução interna: grande o suficiente para o plasma respirar, pequena o
  // suficiente para o laço por pixel não pesar. ~360px de largura interna.
  let W = 1, H = 1, imageData, data;

  const resize = () => {
    const cw = Math.max(1, canvas.clientWidth);
    const ch = Math.max(1, canvas.clientHeight);
    canvas.width = cw;
    canvas.height = ch;
    const scale = Math.max(3, Math.ceil(cw / 360));
    W = Math.max(1, Math.floor(cw / scale));
    H = Math.max(1, Math.floor(ch / scale));
    imageData = ctx.createImageData(W, H);
    data = imageData.data;
  };
  window.addEventListener('resize', resize, { passive: true });
  resize();

  const start = performance.now();

  const drawField = (time) => {
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const ux = (2 * x - W) / H;
        const uy = (2 * y - H) / H;

        let a = 0, d = 0;
        for (let i = 0; i < 4; i++) {
          a += fastCos(i - d + time * 0.5 - a * ux);
          d += fastSin(i * uy + a);
        }

        const wave = (fastSin(a) + fastCos(d)) * 0.5;      // -1..1
        const glow = Math.max(0, 0.35 + 0.65 * wave) * GLOW; // 0..GLOW, viés claro

        // navy + rosa proporcional ao campo: R e B sobem (rosa), G quase parado
        const r = NAVY.r + glow * PINK.r;
        const g = NAVY.g + glow * PINK.g + glow * 0.06;
        const b = NAVY.b + glow * PINK.b;

        const idx = (y * W + x) * 4;
        data[idx]     = (r < 1 ? r : 1) * 255;
        data[idx + 1] = (g < 1 ? g : 1) * 255;
        data[idx + 2] = (b < 1 ? b : 1) * 255;
        data[idx + 3] = 255;
      }
    }
    // desenha o campo pequeno e reamostra suavizado para o tamanho real
    ctx.putImageData(imageData, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(canvas, 0, 0, W, H, 0, 0, canvas.width, canvas.height);
  };

  if (reduceMotion) {
    drawField(1.2);          // um quadro parado
    return { play() {}, pause() {} };
  }

  const FPS = 30;            // fundo sutil não precisa de 60fps
  const FRAME = 1000 / FPS;
  let raf = null, running = false, last = 0;

  const loop = (now) => {
    if (now - last >= FRAME) {
      last = now;
      drawField((now - start) * 0.001);
    }
    raf = requestAnimationFrame(loop);
  };
  const play = () => { if (!running) { running = true; raf = requestAnimationFrame(loop); } };
  const pause = () => { running = false; if (raf) cancelAnimationFrame(raf); raf = null; };

  if ('IntersectionObserver' in window) {
    new IntersectionObserver((e) => (e[0].isIntersecting ? play() : pause()), { threshold: 0 })
      .observe(canvas);
  } else {
    play();
  }

  drawField(0);              // primeiro quadro imediato, sem piscar
  return { play, pause };
}
