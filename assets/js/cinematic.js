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

// Transição "wipe" rosa da Hero — o triângulo é SEMPRE o mesmo elemento
// (#heroTriangleGrow, um clone do path real gerado em build() via
// getBBox(), ver mais abaixo), do repouso até cobrir a tela inteira. Nunca
// existem duas peças pra sincronizar: o triângulo ORIGINAL, dentro da logo
// (.hlogo-tri), fica escondido pra sempre (opacity 0) assim que build()
// roda, e quem desenha o triângulo — sempre, do primeiro ao último quadro —
// é o #heroTriangleGrow. (Uma versão anterior trocava entre o path original
// escalando junto com a logo e um recorte à parte no meio do efeito, com um
// crossfade como rede de segurança — mas mesmo com as duas peças desenhando
// a mesma fórmula de tamanho/posição, um recorte feito à mão tinha padding
// levemente diferente da forma real e causava um "fantasma" visível durante
// a troca. Gerar o clone com viewBox calculado ao vivo elimina esse risco
// por completo, e como não há mais troca, não precisa nem de crossfade.)
//
// A logo INTEIRA (wordmark + a caixa onde o triângulo escondido mora)
// continua crescendo via transform na "fase 1", ancorada no triângulo, com
// a wordmark preta (.hlogo-fade) + "z" + "Olá, somos a" desvanecendo juntas
// — só que agora isso é decoração visual (a logo cresce e desvanece), sem
// nenhuma responsabilidade sobre desenhar o triângulo em si. Ela para de
// crescer em PHASE1_MULT (8x) e fica arbitrariamente parada dali pra frente
// (já invisível), enquanto o #heroTriangleGrow continua crescendo sozinho
// até cobrir a tela — só precisa de uma fração da largura em px pra isso (a
// logo inteira precisaria de ~8x mais só pra chegar no mesmo tamanho de
// triângulo, porque a wordmark ocupa a maior parte do width; crescer ela
// até cobrir a tela estouraria o limite de textura de GPU do navegador,
// ~16384px, bem antes de cobrir os cantos).
//
// #heroTriangleGrow cresce via width real (não transform:scale): o Chrome
// cacheia o SVG numa textura de GPU e só amplia ela ao escalar por
// transform, serrilhando em ~20-40x mesmo sendo vetor na origem (testado e
// confirmado — persiste mesmo sem will-change/force3D). Mudar width força o
// navegador a redesenhar o vetor de verdade a cada quadro, sempre nítido. A
// logo (wordmark) em si só cresce até PHASE1_MULT (8x) via transform:scale,
// bem abaixo de onde esse serrilhado se torna perceptível.
//
// O risco de width real é empurrar a altura da Hero (trigger do pin) a cada
// quadro, quebrando o range do scroll num loop (testado e confirmado
// quebrado, com a Hero e a viewport inteira colapsando). Por isso a logo
// (#heroLogoFull) e o triângulo isolado (#heroTriangleGrow) ficam FORA do
// fluxo normal (position:absolute/fixed) assim que o crescimento começa —
// crescer um elemento fora do fluxo nunca afeta a altura de ninguém. A logo
// especificamente precisa ficar no fluxo normal EM REPOUSO (pra não
// arriscar a cadeia de layout flex/grid da Hero), então o build() abaixo
// MEDE o tamanho de repouso em fluxo normal primeiro, TRAVA a altura do
// wrapper nesse valor em px, e só então tira a logo do fluxo.
function initHeroPinkWipe() {
  const hero = document.querySelector('.hero');
  const logo = document.getElementById('heroLogoFull');
  const entrance = document.querySelector('.hero-logo-entrance');
  const triGrow = document.getElementById('heroTriangleGrow');
  const greeting = document.querySelector('.hero-greeting');
  // wordmark preta + "z" rosa + "Olá, somos a": um bloco só que cresce
  // junto com a logo na fase 1 e desvanece perto do handoff.
  const fadeSvgParts = document.querySelectorAll('.hlogo-fade, .hlogo-z');
  const logoPinkParts = document.querySelectorAll('.hlogo-tri');
  const triPath = logoPinkParts[0];
  if (!hero || !logo || !entrance || !triGrow || !triPath || reduceMotion) return;

  // até quantas vezes o tamanho de repouso a logo INTEIRA cresce antes do
  // triângulo isolado assumir sozinho — também o teto de escala da fase 1
  // (ver comentário grande acima sobre serrilhado).
  const PHASE1_MULT = 8;
  // folga bem generosa sobre a distância até o canto mais longe: o
  // triângulo aponta pra um lado só, então "afina" perto da ponta — cobrir
  // o centro de um canto não garante cobrir os cantos acima/abaixo dele
  // nessa direção. Como o alvo final fica bem abaixo do limite de textura
  // de GPU mesmo assim (a peça é só o triângulo, não a logo inteira), dá
  // pra ser generoso sem risco.
  const SAFETY = 6;

  let currentST = null;

  const build = () => {
    // mata o pin/timeline anterior antes de remedir — sem isso, um resize
    // deixava as constantes de tamanho/âncora desatualizadas enquanto o
    // scroll continuava usando o timeline antigo.
    if (currentST) currentST.kill();

    // reset — volta tudo ao fluxo normal antes de medir de novo.
    logo.style.cssText = '';
    entrance.style.height = '';
    triGrow.style.cssText = '';
    if (greeting) greeting.style.cssText = '';
    // o triângulo ORIGINAL (dentro da logo) fica escondido pra sempre — quem
    // desenha o triângulo do início ao fim é o #heroTriangleGrow (clone
    // gerado logo abaixo), sempre o MESMO elemento, nascendo já no lugar
    // certo e acompanhando a logo na fase 1. Sem handoff nem crossfade entre
    // duas peças, então não existe mais um instante pra sincronizar.
    //
    // a OPACITY de entrada do #heroTriangleGrow (aparecer junto com a logo,
    // não antes) fica só por conta do CSS (.hero-triangle-grow, mesma
    // animação/delay de .hero-logo-entrance) — não é setada aqui de propósito,
    // pra não competir com essa animação (setar opacity:1 via JS assim que a
    // página carrega, antes do delay de 1.25s acabar, fazia o triângulo
    // aparecer sozinho na tela antes da logo e do "Olá, somos a").
    gsap.set(logoPinkParts, { opacity: 0 });

    const r = logo.getBoundingClientRect(); // medida em fluxo normal, tamanho de repouso
    const w0 = r.width, h0 = r.height;
    const eRect = entrance.getBoundingClientRect();

    entrance.style.position = 'relative';
    entrance.style.height = h0 + 'px'; // trava o espaço ANTES de tirar a logo do fluxo
    logo.style.position = 'absolute';
    logo.style.left = (r.left - eRect.left) + 'px';
    logo.style.top = (r.top - eRect.top) + 'px';
    logo.style.width = w0 + 'px';
    logo.style.height = h0 + 'px';
    logo.style.maxWidth = 'none';
    logo.style.margin = '0';

    // posição/tamanho do triângulo medidos DIRETO no navegador (não
    // estimados à mão pelos pontos de controle do path SVG).
    const triRect0 = triPath.getBoundingClientRect();
    const triCenterX0 = triRect0.left + triRect0.width / 2;
    const triCenterY0 = triRect0.top + triRect0.height / 2;
    // transform-origin no centro DE VERDADE do triângulo, em PIXELS
    // relativos à própria caixa da logo — scale() já mantém a âncora fixa
    // sozinho, sem precisar de translate manual pra isso (só o drift pro
    // centro, ver applyGrowth, precisa de translate).
    logo.style.transformOrigin = (triCenterX0 - r.left).toFixed(1) + 'px ' + (triCenterY0 - r.top).toFixed(1) + 'px';

    // a entrada da logo ("Olá, somos a" + wordmark) tem uma animação
    // (heroGreetIn, delay 1.25s) que desliza .hero-logo-entrance de
    // translateY(14px) até translateY(0). build() roda antes desse delay
    // começar, então sem corrigir, a âncora nasceria 14px errada pra
    // sempre (medida só uma vez aqui). Em vez de esperar a animação
    // terminar, lê o deslocamento ATUAL (via computed style) e já desconta
    // — a âncora nasce certa pra posição final, sem depender de timing.
    const entranceShiftY = new DOMMatrix(getComputedStyle(entrance).transform).m42;

    // âncora = centro medido do triângulo, em coordenadas de tela.
    const anchorX0 = triCenterX0;
    const anchorY0 = triCenterY0 - entranceShiftY;

    // "Olá, somos a" cresce junto com a logo: o transform-origin dela é
    // ancorado no MESMO ponto de tela que a logo usa (em pixels, já que
    // esse ponto fica fora da própria caixa da saudação). Aplicando o
    // mesmo translate+scale que a logo recebe, os dois crescem como se
    // fossem uma peça rígida só.
    if (greeting) {
      const gRect = greeting.getBoundingClientRect();
      greeting.style.transformOrigin = (anchorX0 - gRect.left).toFixed(1) + 'px ' + (anchorY0 - gRect.top).toFixed(1) + 'px';
    }

    // #heroTriangleGrow ganha um CLONE do path real (não um arquivo .svg
    // recortado à parte) com viewBox calculado via getBBox() no próprio
    // navegador — width/height do elemento passam a corresponder 1:1 ao
    // tamanho do triângulo (+ a metade do traço), garantido igual ao path
    // original em qualquer tamanho, sem depender de um crop feito à mão
    // que podia ter padding levemente diferente (era a causa do "fantasma"
    // visível no crossfade: o arquivo recortado tinha viewBox mais largo
    // que a forma real, então o triângulo dentro dele renderizava menor
    // que o tw que a gente mandava pra ele).
    const bbox = triPath.getBBox();
    const strokeW = parseFloat(getComputedStyle(triPath).strokeWidth) || 0;
    const pad = strokeW / 2;
    triGrow.setAttribute('viewBox', `${(bbox.x - pad).toFixed(2)} ${(bbox.y - pad).toFixed(2)} ${(bbox.width + strokeW).toFixed(2)} ${(bbox.height + strokeW).toFixed(2)}`);
    const clone = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    clone.setAttribute('d', triPath.getAttribute('d'));
    clone.setAttribute('fill', '#FF0099');
    clone.setAttribute('stroke', '#FF0099');
    clone.setAttribute('stroke-width', '3');
    clone.setAttribute('stroke-miterlimit', '10');
    triGrow.replaceChildren(clone);

    // proporção e tamanho de repouso do triângulo — medidos direto, pra
    // bater exatamente com o que o navegador realmente desenha. triAspect
    // vem dos MESMOS números usados no viewBox acima (bbox+traço), não de
    // uma medição separada — fonte única, sem risco de discrepância.
    const triAspect = (bbox.height + strokeW) / (bbox.width + strokeW);
    const triW0 = triRect0.width; // tamanho do triângulo com a logo em repouso (escala 1)
    const triHandoff = triW0 * PHASE1_MULT;

    // âncora final = centro da viewport, pra onde o triângulo caminha
    // enquanto cresce — do centro, o canto mais longe fica bem mais perto
    // do que do canto onde a logo nasceu.
    const centerX = window.innerWidth / 2, centerY = window.innerHeight / 2;
    const corners = [[0, 0], [window.innerWidth, 0], [0, window.innerHeight], [window.innerWidth, window.innerHeight]];
    const maxDist = Math.max(...corners.map(([x, y]) => Math.hypot(centerX - x, centerY - y)));
    const triTargetWidth = maxDist * SAFETY;

    // fade da wordmark/z/saudação: só nos últimos 30% da DISTÂNCIA DE
    // SCROLL antes do handoff — não 30% do TAMANHO (a curva 'power1.in'
    // acelera bastante perto do fim da fase 1, então uma janela definida em
    // tamanho cabe numa distância de scroll minúscula e o fade parece um
    // corte seco em vez de gradual). rawP desfaz a curva só pra decidir
    // ESSE timing — o crescimento em si continua vindo direto de tw.
    const pHandoff = Math.sqrt((triHandoff - triW0) / (triTargetWidth - triW0));
    const fadeStartP = pHandoff * 0.7;

    // UM crescimento só, numa taxa só, do início ao fim — não duas fases
    // com velocidades diferentes se revezando (causava um "pulo" de
    // velocidade no deslocamento pro centro; testado e confirmado). tw =
    // largura "verdadeira" do triângulo nesse instante, sempre proporcional
    // ao scroll.
    const proxy = { w: triW0 };
    const applyGrowth = () => {
      const tw = proxy.w;
      const t = (tw - triW0) / (triTargetWidth - triW0);
      const curAnchorX = anchorX0 + (centerX - anchorX0) * t;
      const curAnchorY = anchorY0 + (centerY - anchorY0) * t;
      const driftX = curAnchorX - anchorX0, driftY = curAnchorY - anchorY0;

      // logo cresce via transform até o teto de PHASE1_MULT — além disso
      // ela para de crescer (evita estourar o limite de textura de GPU),
      // mas continua desenhando o mesmo tamanho que triGrow assumiu.
      const sLogo = Math.min(tw, triHandoff) / triW0;
      const groupTransform = `translate(${driftX.toFixed(1)}px,${driftY.toFixed(1)}px) scale(${sLogo.toFixed(4)})`;
      logo.style.transform = groupTransform;

      const rawP = Math.sqrt(Math.max(0, t));
      const fadeT = rawP <= fadeStartP ? 0 : Math.min(1, (rawP - fadeStartP) / (pHandoff - fadeStartP));
      const fadeOpacity = (1 - fadeT).toFixed(3);
      fadeSvgParts.forEach((el) => { el.style.opacity = fadeOpacity; });
      if (greeting) {
        greeting.style.transform = groupTransform; // mesmo translate+scale da logo — cresce junto
        greeting.style.opacity = fadeOpacity;
      }

      // o triângulo (#heroTriangleGrow) é o MESMO elemento do início ao
      // fim — cresce continuamente a partir de tw, acompanhando a mesma
      // âncora que o resto (curAnchorX/Y). Nada de trocar/crossfadear com
      // outra peça.
      const th = tw * triAspect;
      triGrow.style.left = (curAnchorX - tw / 2) + 'px';
      triGrow.style.top = (curAnchorY - th / 2) + 'px';
      triGrow.style.width = tw + 'px';
      triGrow.style.height = th + 'px';
    };

    const tl = gsap.timeline({
      scrollTrigger: {
        // scroll mais longo (320% em vez de 170%) => a mesma taxa linear de
        // crescimento fica espalhada por mais distância de rolagem, então
        // cada "giro" de scroll cresce menos.
        trigger: hero, start: 'top top', end: '+=320%', pin: true, scrub: 1, invalidateOnRefresh: true,
      }
    })
      // duration 0.9 (não 1) => sobra 0.9 a 1 como pausa parada, rosa já
      // cobrindo tudo, antes de soltar o pin — sem essa pausa a próxima
      // seção aparecia rápido demais.
      //
      // ease 'power1.in' (não 'none'): curva ÚNICA e contínua, sempre
      // determinada pela posição do scroll (via scrub) — só começa mais
      // devagar e vai acelerando, em vez de crescer no mesmo ritmo do
      // primeiro ao último pixel.
      .to(proxy, { w: triTargetWidth, ease: 'power1.in', duration: 0.9, onUpdate: applyGrowth }, 0);

    applyGrowth(); // estado inicial correto (repouso) sem esperar o 1º scroll
    currentST = tl.scrollTrigger;
  };

  build();
  // build() inteiro no resize (não só ScrollTrigger.refresh()) — as
  // constantes de tamanho/âncora dependem da largura/altura da viewport no
  // momento da medição, então uma troca de tela precisa remedir tudo, não só
  // recalcular onde o pin começa/termina.
  window.addEventListener('resize', build);
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
  initHeroPinkWipe();
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
