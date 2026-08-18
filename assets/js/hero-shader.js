/* ================================================================
   izidoc — ondas interativas da Hero (Canvas 2D, sem framework)

   Porte fiel do componente React "Interactive Waves" (malha de linhas +
   ruído Perlin + física de mouse com tensão/atrito) para JS vanilla: o
   site é HTML/CSS/JS estático, sem build, sem React. A lógica (grade de
   pontos, ruído, mola/atrito do cursor) é a mesma do original; só a cor
   das linhas muda, para usar o rosa da marca em vez de preto sólido.

   Mantém a assinatura initHeroShader(canvas) e o contrato de retorno
   {play, pause} para não exigir mudanças em cinematic.js.
   ================================================================ */

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- ruído Perlin 2D (idêntico ao original) ---------- */
class Noise {
  constructor(seed) {
    this.p = new Uint8Array(512);
    this.seed = seed > 0 && seed < 1 ? seed : Math.random();
    this.grad3 = [
      [1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0],
      [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
      [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1]
    ];
    this.init(this.seed);
  }
  init(seed) {
    let i, j, k;
    const p = new Uint8Array(256);
    for (i = 0; i < 256; i++) p[i] = i;
    for (i = 0; i < 256; i++) {
      j = Math.floor(seed * (i + 1)) % 256;
      k = p[i];
      p[i] = p[j];
      p[j] = k;
    }
    for (i = 0; i < 512; i++) this.p[i] = p[i & 255];
  }
  dot(g, x, y) { return g[0] * x + g[1] * y; }
  perlin2(x, y) {
    let X = Math.floor(x) & 255;
    let Y = Math.floor(y) & 255;
    x -= Math.floor(x);
    y -= Math.floor(y);
    const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
    const u = fade(x);
    const v = fade(y);
    const p = this.p;
    const grad3 = this.grad3;
    const n00 = this.dot(grad3[p[X + p[Y]] % 12], x, y);
    const n01 = this.dot(grad3[p[X + p[Y + 1]] % 12], x, y - 1);
    const n10 = this.dot(grad3[p[X + 1 + p[Y]] % 12], x - 1, y);
    const n11 = this.dot(grad3[p[X + 1 + p[Y + 1]] % 12], x - 1, y - 1);
    const lerp = (a, b, t) => a + t * (b - a);
    return lerp(lerp(n00, n10, u), lerp(n01, n11, u), v);
  }
}

/* config idêntica ao original — só GRID_X_GAP sobe um pouco no mobile,
   para não sobrecarregar a CPU de aparelhos fracos com uma malha tão densa */
function buildConfig(isMobile) {
  return {
    GRID_X_GAP: isMobile ? 18 : 10,
    GRID_Y_GAP: 32,
    GRID_WIDTH_OFFSET: 200,
    GRID_HEIGHT_OFFSET: 30,
    WAVE_TIME_X_FACTOR: 0.0125,
    WAVE_NOISE_X_FACTOR: 0.002,
    WAVE_TIME_Y_FACTOR: 0.005,
    WAVE_NOISE_Y_FACTOR: 0.0015,
    WAVE_NOISE_MAGNITUDE: 12,
    WAVE_AMPLITUDE_X: 32,
    WAVE_AMPLITUDE_Y: 16,
    MOUSE_INFLUENCE_RADIUS: 175,
    MOUSE_FALLOFF_FACTOR: 0.001,
    MOUSE_FORCE_FACTOR: 0.00065,
    MOUSE_SMOOTHING_FACTOR: 0.1,
    MAX_MOUSE_VELOCITY: 100,
    TENSION_STRENGTH: 0.005,
    FRICTION: 0.925,
    CURSOR_DISPLACEMENT_STRENGTH: 2,
    MAX_CURSOR_DISPLACEMENT: 100,
  };
}

export function initHeroShader(canvas) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const isMobile = window.matchMedia('(max-width: 640px)').matches;
  const cfg = buildConfig(isMobile);
  const noise = new Noise(Math.random());
  const lineColor = 'rgba(236,0,140,0.55)'; /* #EC008C — rosa da marca, onde o original usa preto */

  let bounding = { width: 1, height: 1 };
  let dpr = 1;
  let lines = [];

  const mouse = { x: -9999, y: -9999, lx: 0, ly: 0, sx: 0, sy: 0, v: 0, vs: 0, a: 0, set: false };

  const setSize = () => {
    bounding = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.max(1, Math.round(bounding.width * dpr));
    canvas.height = Math.max(1, Math.round(bounding.height * dpr));
  };

  const setLines = () => {
    const { width, height } = bounding;
    lines = [];
    const { GRID_X_GAP, GRID_Y_GAP, GRID_WIDTH_OFFSET, GRID_HEIGHT_OFFSET } = cfg;
    const oWidth = width + GRID_WIDTH_OFFSET;
    const oHeight = height + GRID_HEIGHT_OFFSET;
    const totalLines = Math.ceil(oWidth / GRID_X_GAP);
    const totalPoints = Math.ceil(oHeight / GRID_Y_GAP);
    const xStart = (width - GRID_X_GAP * totalLines) / 2;
    const yStart = (height - GRID_Y_GAP * totalPoints) / 2;
    for (let i = 0; i <= totalLines; i++) {
      const points = [];
      for (let j = 0; j <= totalPoints; j++) {
        points.push({
          x: xStart + GRID_X_GAP * i,
          y: yStart + GRID_Y_GAP * j,
          wave: { x: 0, y: 0 },
          cursor: { x: 0, y: 0, vx: 0, vy: 0 },
        });
      }
      lines.push(points);
    }
  };

  const moved = (point, withCursorForce) => {
    const x = point.x + point.wave.x + (withCursorForce ? point.cursor.x : 0);
    const y = point.y + point.wave.y + (withCursorForce ? point.cursor.y : 0);
    return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
  };

  const movePoints = (time) => {
    const {
      WAVE_TIME_X_FACTOR, WAVE_NOISE_X_FACTOR, WAVE_TIME_Y_FACTOR, WAVE_NOISE_Y_FACTOR,
      WAVE_NOISE_MAGNITUDE, WAVE_AMPLITUDE_X, WAVE_AMPLITUDE_Y, MOUSE_INFLUENCE_RADIUS,
      MOUSE_FALLOFF_FACTOR, MOUSE_FORCE_FACTOR, TENSION_STRENGTH, FRICTION,
      CURSOR_DISPLACEMENT_STRENGTH, MAX_CURSOR_DISPLACEMENT,
    } = cfg;

    for (const points of lines) {
      for (const p of points) {
        const noiseInputX = (p.x + time * WAVE_TIME_X_FACTOR) * WAVE_NOISE_X_FACTOR;
        const noiseInputY = (p.y + time * WAVE_TIME_Y_FACTOR) * WAVE_NOISE_Y_FACTOR;
        const move = noise.perlin2(noiseInputX, noiseInputY) * WAVE_NOISE_MAGNITUDE;
        p.wave.x = Math.cos(move) * WAVE_AMPLITUDE_X;
        p.wave.y = Math.sin(move) * WAVE_AMPLITUDE_Y;

        const dx = p.x - mouse.sx;
        const dy = p.y - mouse.sy;
        const d = Math.hypot(dx, dy);
        const influenceRadius = Math.max(MOUSE_INFLUENCE_RADIUS, mouse.vs);

        if (d < influenceRadius) {
          const falloff = 1 - d / influenceRadius;
          const force = Math.cos(d * MOUSE_FALLOFF_FACTOR) * falloff;
          const forceFactor = force * influenceRadius * mouse.vs * MOUSE_FORCE_FACTOR;
          p.cursor.vx += Math.cos(mouse.a) * forceFactor;
          p.cursor.vy += Math.sin(mouse.a) * forceFactor;
        }

        p.cursor.vx += (0 - p.cursor.x) * TENSION_STRENGTH;
        p.cursor.vy += (0 - p.cursor.y) * TENSION_STRENGTH;
        p.cursor.vx *= FRICTION;
        p.cursor.vy *= FRICTION;
        p.cursor.x += p.cursor.vx * CURSOR_DISPLACEMENT_STRENGTH;
        p.cursor.y += p.cursor.vy * CURSOR_DISPLACEMENT_STRENGTH;
        p.cursor.x = Math.min(MAX_CURSOR_DISPLACEMENT, Math.max(-MAX_CURSOR_DISPLACEMENT, p.cursor.x));
        p.cursor.y = Math.min(MAX_CURSOR_DISPLACEMENT, Math.max(-MAX_CURSOR_DISPLACEMENT, p.cursor.y));
      }
    }
  };

  const drawLines = () => {
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, bounding.width, bounding.height);
    ctx.beginPath();
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 0.6;

    for (const points of lines) {
      if (!points.length) continue;
      let p1 = moved(points[0], false);
      ctx.moveTo(p1.x, p1.y);
      for (let i = 0; i < points.length - 1; i++) {
        const cur = moved(points[i], true);
        const next = moved(points[i + 1], true);
        const xc = (cur.x + next.x) / 2;
        const yc = (cur.y + next.y) / 2;
        ctx.quadraticCurveTo(cur.x, cur.y, xc, yc);
      }
    }
    ctx.stroke();
    ctx.restore();
  };

  const updateMousePosition = (clientX, clientY) => {
    mouse.x = clientX - bounding.left;
    mouse.y = clientY - bounding.top;
    if (!mouse.set) {
      mouse.sx = mouse.x; mouse.sy = mouse.y;
      mouse.lx = mouse.x; mouse.ly = mouse.y;
      mouse.set = true;
    }
  };
  const onMouseMove = (e) => updateMousePosition(e.clientX, e.clientY);
  const onTouchMove = (e) => {
    if (!e.touches[0]) return;
    updateMousePosition(e.touches[0].clientX, e.touches[0].clientY);
  };
  const onResize = () => { setSize(); setLines(); };

  window.addEventListener('resize', onResize, { passive: true });
  window.addEventListener('pointermove', onMouseMove, { passive: true });
  canvas.addEventListener('touchmove', onTouchMove, { passive: true });

  setSize();
  setLines();

  const draw = (time) => {
    const { MOUSE_SMOOTHING_FACTOR, MAX_MOUSE_VELOCITY } = cfg;
    mouse.sx += (mouse.x - mouse.sx) * MOUSE_SMOOTHING_FACTOR;
    mouse.sy += (mouse.y - mouse.sy) * MOUSE_SMOOTHING_FACTOR;
    const dx = mouse.sx - mouse.lx;
    const dy = mouse.sy - mouse.ly;
    const d = Math.hypot(dx, dy);
    mouse.v = d;
    mouse.vs += (d - mouse.vs) * MOUSE_SMOOTHING_FACTOR;
    mouse.vs = Math.min(MAX_MOUSE_VELOCITY, mouse.vs);
    mouse.a = Math.atan2(dy, dx);
    mouse.lx = mouse.sx; mouse.ly = mouse.sy;

    movePoints(time);
    drawLines();
  };

  if (reduceMotion) {
    draw(0);
    return { play() {}, pause() {} };
  }

  let raf = null, running = false;
  const loop = (t) => { draw(t); raf = requestAnimationFrame(loop); };
  const play = () => { if (!running) { running = true; loop(performance.now()); } };
  const pause = () => { running = false; if (raf) cancelAnimationFrame(raf); raf = null; };

  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => {
      entries[0].isIntersecting ? play() : pause();
    }, { threshold: 0 }).observe(canvas);
  } else {
    play();
  }

  draw(0);
  return { play, pause };
}
