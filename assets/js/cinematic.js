import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const fineHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

// Ondas interativas da Hero (Canvas 2D). Guardas mais frouxas que as do selo
// 3D: não há WebGL nem texturas, então a única exclusão real é reduced-motion
// (é movimento contínuo) e save-data. Sem ele, o gradiente CSS da
// .hero-atmosphere continua sendo o fundo, e nada de conteúdo se perde.
function bootHeroShader() {
  const canvas = document.getElementById('heroShader');
  const hero = document.querySelector('.hero');
  if (!canvas || !hero || reduceMotion) return;
  const conn = navigator.connection;
  if (conn && (conn.saveData || /^(slow-2g|2g)$/.test(conn.effectiveType || ''))) return;
  import('./hero-shader.js')
    .then(({ initHeroShader }) => {
      if (initHeroShader(canvas)) hero.classList.add('shader-active');
    })
    .catch(() => {});
}

// Onda animada da faixa escura (Canvas 2D). Como o próprio módulo já lida com
// reduced-motion (desenha um quadro parado), aqui só a save-data corta — o
// efeito é parte visual da faixa. Sem ele, o navy sólido do .dark-band segue
// como fundo.
function bootBandWave() {
  const canvas = document.getElementById('bandWave');
  const band = canvas && canvas.closest('.dark-band');
  if (!canvas || !band) return;
  const conn = navigator.connection;
  if (conn && (conn.saveData || /^(slow-2g|2g)$/.test(conn.effectiveType || ''))) return;
  import('./band-wave.js')
    .then(({ initBandWave }) => {
      if (initBandWave(canvas)) band.classList.add('wave-active');
    })
    .catch(() => {});
}

// O tom vale o da seção que ocupa a MAIOR área visível da viewport — ou seja, a
// que a pessoa está de fato olhando.
//
// Duas decisões aqui, ambas por causa de bugs reais observados:
//
// 1. Área visível, não uma "linha" fixa numa % da tela. Numa viewport alta
//    (~1570px) várias seções aparecem juntas e uma seção curta pode dominar a
//    tela inteira sem cruzar a linha — o fundo então assumia o tom da seção
//    seguinte e a de países (texto branco) ficava sobre fundo claro.
//
// 2. Recalculado a cada atualização de scroll, em vez de callbacks
//    onEnter/onEnterBack por seção. Esses callbacks só disparam quando o scroll
//    ATRAVESSA a fronteira: num carregamento já rolado, num salto de âncora
//    (#preco), num reload que restaura a posição ou num resize, ela nunca é
//    atravessada e o tom ficava travado no da seção anterior. Recalcular a
//    partir da posição atual é idempotente e imune a todos esses casos.

function initToneBackground() {
  const sections = [...document.querySelectorAll('[data-tone]')];
  if (!document.getElementById('cinematicBg') || !sections.length) return;

  let current = null;
  const applyTone = (tone) => {
    if (tone === current) return;
    current = tone;
    // só alterna a classe: o cross-fade entre as duas camadas é feito em CSS.
    document.documentElement.classList.toggle('tone-light', tone === 'light');
  };

  const resolveTone = () => {
    const vh = window.innerHeight;
    let active = null;
    let best = 0;
    for (const sec of sections) {
      const r = sec.getBoundingClientRect();
      const visible = Math.min(r.bottom, vh) - Math.max(r.top, 0);
      if (visible > best) { best = visible; active = sec; }
    }
    if (active) applyTone(active.dataset.tone);
  };

  ScrollTrigger.create({
    trigger: document.documentElement,
    start: 'top top',
    end: 'bottom bottom',
    onUpdate: resolveTone,
    onRefresh: resolveTone
  });
  resolveTone();
}

const REVEAL_SELECTOR = '.reveal, .rv, .qz-card, .trad-card, .trust-card, .intl-card, ' +
  '.versus-col, .file-card, .plan, .doc-panel, .section-head';

// cada seção pode pedir uma personalidade de entrada via data-rv="up|left|right|
// scale|blur" em vez do fade genérico. É atributo, não classe, de propósito: as
// classes .rv-* do <style> inline pertencem a outro mecanismo (só limpam o
// transform/filter quando ganham .rv.in), então usá-las aqui deixaria o elemento
// permanentemente deslocado/borrado. O "default" preserva o comportamento antigo.
const REVEAL_VARIANTS = {
  default: { y: 34 },
  up: { y: 42 },
  left: { x: -46 },
  right: { x: 46 },
  scale: { scale: 0.92 },
  blur: { y: 12, filter: 'blur(10px)' }
};

function initReveals() {
  const els = gsap.utils.toArray(REVEAL_SELECTOR);
  if (!els.length || reduceMotion) return;
  ScrollTrigger.batch(els, {
    start: 'top 87%',
    once: true,
    onEnter: (batch) => {
      const groups = new Map();
      batch.forEach((el) => {
        const variant = REVEAL_VARIANTS[el.dataset.rv] ? el.dataset.rv : 'default';
        if (!groups.has(variant)) groups.set(variant, []);
        groups.get(variant).push(el);
      });
      groups.forEach((group, variant) => gsap.from(group, {
        opacity: 0, ...REVEAL_VARIANTS[variant], duration: 0.9, ease: 'power3.out', stagger: 0.08, overwrite: 'auto',
        clearProps: 'transform,filter'
      }));
    }
  });
}

// .flags-grid e .faq-list têm uma cascata própria em CSS que só roda quando o
// container ganha a classe .in — resquício do mecanismo antigo de reveal, que
// era um IntersectionObserver removido na migração pro GSAP. Sem ninguém para
// adicionar .in, os cartões de bandeira e os itens do FAQ ficavam presos em
// opacity:0 para sempre: duas seções inteiras invisíveis (só apareciam sob
// prefers-reduced-motion, que zera essa animação). Aqui o GSAP assume esse papel.
function initStaggerLists() {
  const lists = document.querySelectorAll('.flags-grid, .faq-list');
  lists.forEach((list) => {
    if (list.closest('.arc-mode')) return; // arc-mode controla as bandeiras
    if (reduceMotion) { list.classList.add('in'); return; }
    ScrollTrigger.create({
      trigger: list,
      start: 'top 90%',
      once: true,
      onEnter: () => list.classList.add('in')
    });
    // rede de segurança: bandeiras e perguntas do FAQ são conteúdo real, não
    // decoração — não podem ficar invisíveis em nenhuma circunstância. Além de
    // garantir o .in, força o estado final direto caso a animação não tenha
    // rodado (aba em segundo plano na hora do gatilho, animação interrompida).
    setTimeout(() => {
      list.classList.add('in');
      list.querySelectorAll('.flag-card, details').forEach((el) => {
        if (getComputedStyle(el).opacity === '0') {
          el.style.opacity = '1';
          el.style.transform = 'none';
        }
      });
    }, 4000);
  });
}

function initTimelineDraw() {
  const timeline = document.querySelector('.timeline');
  if (!timeline || reduceMotion) return;
  gsap.set(timeline, { '--line-p': 0 });
  gsap.to(timeline, {
    '--line-p': 1, ease: 'none',
    scrollTrigger: { trigger: timeline, start: 'top 75%', end: 'bottom 85%', scrub: 0.6 }
  });
}

function initScrollProgress() {
  const bar = document.createElement('div');
  bar.className = 'cine-progress';
  document.body.appendChild(bar);
  ScrollTrigger.create({
    trigger: document.documentElement,
    start: 'top top',
    end: 'bottom bottom',
    // PERF: scaleX (GPU, sem layout) em vez de animar width a cada frame de scroll
    onUpdate: (self) => { bar.style.transform = 'scaleX(' + self.progress.toFixed(4) + ')'; }
  });
}

function initCustomCursor() {
  if (!fineHover || reduceMotion) return;
  const cursor = document.createElement('div');
  cursor.className = 'cine-cursor';
  document.body.appendChild(cursor);
  document.body.classList.add('cine-cursor-on');
  const moveX = gsap.quickTo(cursor, 'x', { duration: 0.35, ease: 'power3.out' });
  const moveY = gsap.quickTo(cursor, 'y', { duration: 0.35, ease: 'power3.out' });
  window.addEventListener('pointermove', (e) => { moveX(e.clientX); moveY(e.clientY); }, { passive: true });
  document.addEventListener('pointerover', (e) => {
    cursor.classList.toggle('is-cta', !!e.target.closest('a,button'));
  });
}

function initMagneticButtons() {
  if (!fineHover || reduceMotion) return;
  document.querySelectorAll('.hero-ctas .btn').forEach((btn) => {
    btn.classList.add('magnetic');
    const moveX = gsap.quickTo(btn, 'x', { duration: 0.4, ease: 'power3.out' });
    const moveY = gsap.quickTo(btn, 'y', { duration: 0.4, ease: 'power3.out' });
    btn.addEventListener('mousemove', (e) => {
      const r = btn.getBoundingClientRect();
      moveX((e.clientX - r.left - r.width / 2) * 0.35);
      moveY((e.clientY - r.top - r.height / 2) * 0.35);
    });
    btn.addEventListener('mouseleave', () => { moveX(0); moveY(0); });
  });
}

// Flip cards de tradução. No desktop o flip é 100% CSS (hover). Em telas de
// toque não há hover, então o card vira ao TOCAR (alterna .is-flipped) — e o
// clique num link/botão do verso (o CTA) é respeitado, não vira o card de volta.
function initFlipCards() {
  if (window.matchMedia('(hover: hover)').matches) return; // desktop: só CSS
  document.querySelectorAll('.flip-card').forEach((card) => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('a,button')) return; // deixa o CTA funcionar
      card.classList.toggle('is-flipped');
    });
  });
}

// Países: scroll controla a coreografia das bandeiras (pin + scrub, GSAP).
// Entrada (pop-in) -> círculo -> arco, conforme o scroll; solta no fim.
// Fallback: reduced-motion ou mobile mantém o grid normal.
function initCountriesArc() {
  const section = document.querySelector('.countries');
  const stage = section && section.querySelector('.flags-grid');
  if (!section || !stage) return;
  const isMobile = window.matchMedia('(max-width: 768px)').matches;
  if (reduceMotion || isMobile) return;

  const cards = [...stage.querySelectorAll('.flag-card')];
  const N = cards.length;
  if (!N) return;

  section.classList.add('arc-mode');
  stage.classList.remove('reveal'); // o palco é controlado por este código
  const head = section.querySelector('.section-head'); // título com blur preso ao scroll

  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (t) => Math.min(Math.max(t, 0), 1);
  const mix = (a, b, t) => ({
    x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t),
    rot: lerp(a.rot, b.rot, t), scale: lerp(a.scale, b.scale, t),
  });

  // "home" = posição natural de cada card NO GRID (relativa ao centro do grid).
  // A animação sempre TERMINA aqui (transform=0) => grid original intacto, pixel
  // a pixel, com o mesmo estilo. Nada de recriar grid na mão.
  let homes = [];
  const measure = () => {
    const g = stage.getBoundingClientRect();
    const cx = g.left + g.width / 2, cy = g.top + g.height / 2;
    homes = cards.map((c) => {
      const r = c.getBoundingClientRect();
      return { x: (r.left + r.width / 2) - cx, y: (r.top + r.height / 2) - cy, rot: 0, scale: 1 };
    });
  };

  const H = 520; // altura "virtual" p/ dimensionar círculo/arco (maior = mais presença)
  const circlePos = (i, w) => {
    const r = Math.min(w, H) * 0.36;
    const a = (i / N) * Math.PI * 2 - Math.PI / 2;
    return { x: Math.cos(a) * r, y: Math.sin(a) * r, rot: 0, scale: 1 };
  };
  const arcPos = (i, w) => {
    const t = (i / (N - 1)) * 2 - 1;
    const amp = Math.min(H * 0.5, 210);
    return { x: t * Math.min(w, 900) * 0.46, y: amp * t * t - amp * 0.55, rot: t * 22, scale: 1 };
  };

  // scroll: grid → círculo → arco → grid. As bandeiras ficam SEMPRE visíveis
  // (a seção nunca fica vazia); o scroll só faz elas "dançarem" e voltarem.
  const render = (p) => {
    const w = stage.getBoundingClientRect().width;
    // glow "respira" só durante a animação (0→0.7); some no descanso
    section.style.setProperty('--arc-glow', Math.sin(clamp(p / 0.7) * Math.PI).toFixed(3));
    // título: blur → nítido preso ao scroll (foca nos primeiros ~14%)
    if (head) {
      const hp = clamp(p / 0.14);
      head.style.opacity = (0.4 + 0.6 * hp).toFixed(2);
      head.style.filter = `blur(${((1 - hp) * 8).toFixed(1)}px)`;
      head.style.transform = `translateY(${((1 - hp) * 14).toFixed(1)}px)`;
    }
    cards.forEach((card, i) => {
      const home = homes[i] || { x: 0, y: 0, rot: 0, scale: 1 };
      const circle = circlePos(i, w), arc = arcPos(i, w);
      let pos;
      if (p < 0.23) {                    // grid → círculo
        pos = mix(home, circle, clamp(p / 0.23));
      } else if (p < 0.46) {             // círculo → arco
        pos = mix(circle, arc, clamp((p - 0.23) / 0.23));
      } else if (p < 0.70) {             // arco → grid (assenta de volta)
        pos = mix(arc, home, clamp((p - 0.46) / 0.24));
      } else {                           // DESCANSO: grid parado (~2 rolagens) antes de soltar
        pos = home;
      }
      const dx = pos.x - home.x, dy = pos.y - home.y; // deslocamento a partir do lugar dele
      card.style.transform =
        `translate(${dx.toFixed(1)}px,${dy.toFixed(1)}px) rotate(${pos.rot.toFixed(1)}deg) scale(${pos.scale.toFixed(3)})`;
    });
  };

  measure();
  ScrollTrigger.create({
    trigger: section, start: 'top top+=90', end: '+=2800', pin: true, scrub: 1,
    onUpdate: (self) => render(self.progress),
    onRefresh: () => { measure(); render(0); },
  });
  render(0);
}

function init() {
  // marca que a camada GSAP assumiu as revelações. O <style> inline mantém
  // `.reveal{opacity:0;transform:translateY(28px)}` do mecanismo antigo (.in),
  // que o GSAP não limpa — `clearProps` remove só o inline e o elemento voltava
  // pro deslocamento de 28px pra sempre. Sob .cine-on esse estado é neutralizado
  // e o GSAP passa a ser a única fonte da animação. Se o CDN do GSAP falhar,
  // este módulo nem executa, a classe não entra e o fallback antigo continua valendo.
  document.documentElement.classList.add('cine-on');
  initToneBackground();
  initCountriesArc();
  initReveals();
  initStaggerLists();
  initTimelineDraw();
  initScrollProgress();
  initCustomCursor();
  initMagneticButtons();
  initFlipCards();
  bootHeroShader();
  bootBandWave();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
