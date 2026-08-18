/* ================================================================
   izidoc — plasma da Hero (WebGL, sem framework)
   Porte do componente React ShaderBackground para JS vanilla: este
   site é HTML/CSS/JS estático, sem build, sem React/Tailwind. O shader
   em si é GLSL puro, então nada dele se perde na conversão.

   Duas adaptações em relação ao original:

   1. Cor. O shader original desenha linhas ADITIVAS (fragColor += lines)
      sobre fundo escuro — o que sobre branco simplesmente desapareceria,
      porque somar luz ao branco continua branco. Aqui as linhas passam a
      INTERPOLAR o fundo branco em direção ao rosa da marca (#EC008C),
      escurecendo em vez de clarear.

   2. Escopo. O original é `fixed` cobrindo a tela inteira. Aqui o canvas
      pertence à Hero (`position:absolute` dentro dela) e é dimensionado
      pelo tamanho do próprio elemento, não por window.innerWidth — senão
      a proporção do plasma quebra em telas largas.
   ================================================================ */

const VS = `
  attribute vec4 aVertexPosition;
  void main() {
    gl_Position = aVertexPosition;
  }
`;

const FS = `
  precision highp float;
  uniform vec2 iResolution;
  uniform float iTime;

  const float overallSpeed = 0.2;
  const float gridSmoothWidth = 0.015;

  /* Eixos com escalas independentes, de propósito.

     O original normalizava os dois eixos por iResolution.x, então a extensão
     VERTICAL do desenho passava a depender da proporção da tela: em 16:10 as
     linhas tinham ±3.1 de espaço e se espalhavam em ondas suaves, mas em
     21:9 sobrava só ±2.0 — e como os deslocamentos das linhas chegam a ±2.0,
     elas estouravam a faixa visível e viravam um emaranhado. O mesmo site
     rendia desenhos diferentes só por causa da largura do monitor.

     Separando os eixos, scaleX passa a controlar quantos ciclos de onda
     cabem na largura e scaleY a extensão vertical — que agora é constante em
     qualquer tela. 3.1 reproduz a proporção do desenho em 16:10. */
  const float scaleX = 5.0;
  const float scaleY = 3.1;

  /* paleta izidoc */
  const vec3 brandPink = vec3(0.925, 0.0, 0.549);   /* #EC008C */
  const vec3 brandInk  = vec3(0.078, 0.078, 0.086); /* #141416 */
  const vec3 bgWhite   = vec3(1.0, 1.0, 1.0);
  const vec3 bgTint    = vec3(0.980, 0.965, 0.976); /* branco com leve véu rosado */

  /* gramatura: fio bem fino. A original (0.01/0.2) empastava com 31 linhas;
     estes valores mantêm cada traço legível como um fio isolado. */
  const float minLineWidth = 0.0022;
  const float maxLineWidth = 0.042;
  const float lineSpeed = 1.0 * overallSpeed;
  const float lineAmplitude = 1.0;
  const float lineFrequency = 0.2;
  const float warpSpeed = 0.2 * overallSpeed;
  const float warpFrequency = 0.5;
  const float warpAmplitude = 1.0;
  const float offsetFrequency = 0.5;
  const float offsetSpeed = 1.33 * overallSpeed;
  const float minOffsetSpread = 0.6;
  const float maxOffsetSpread = 2.0;
  const int linesPerGroup = 50;

  #define drawCircle(pos, radius, coord) smoothstep(radius + gridSmoothWidth, radius, length(coord - (pos)))
  #define drawSmoothLine(pos, halfWidth, t) smoothstep(halfWidth, 0.0, abs(pos - (t)))
  #define drawCrispLine(pos, halfWidth, t) smoothstep(halfWidth + gridSmoothWidth, halfWidth, abs(pos - (t)))

  float random(float t) {
    return (cos(t) + cos(t * 1.3 + 1.3) + cos(t * 1.4 + 1.4)) / 3.0;
  }

  float getPlasmaY(float x, float horizontalFade, float offset) {
    return random(x * lineFrequency + iTime * lineSpeed) * horizontalFade * lineAmplitude + offset;
  }

  void main() {
    vec2 fragCoord = gl_FragCoord.xy;
    vec2 uv = fragCoord.xy / iResolution.xy;
    vec2 space;
    space.x = (fragCoord.x - iResolution.x * 0.5) / iResolution.x * 2.0 * scaleX;
    space.y = (fragCoord.y - iResolution.y * 0.5) / iResolution.y * 2.0 * scaleY;

    /* Inclinação diagonal da fita inteira: a direita nasce mais alta e a
       esquerda termina mais baixa, quebrando a simetria em que as duas pontas
       ficavam na mesma altura. É uma rampa linear pela largura (não uma onda),
       então some ao movimento sem virar mais uma ondulação. O verticalFade
       (a máscara que apaga as linhas no topo/base) também é inclinado pelo
       mesmo valor, senão a ponta que sobe entraria na zona apagada e a fita
       ficaria mais fraca de um lado.

       leftDrop é uma queda EXTRA que só age na metade esquerda (zero da
       metade pra direita): faz a esquerda descer mais sem mexer na altura da
       direita, que já está no lugar certo. */
    const float lineTilt = 2.0;
    const float leftDrop = 1.6;
    float tilt = (0.5 - uv.x) * lineTilt + max(0.0, 0.5 - uv.x) * leftDrop;
    space.y += tilt;
    float tiltedY = uv.y + tilt / (2.0 * scaleY);

    float horizontalFade = 1.0 - (cos(uv.x * 6.28) * 0.5 + 0.5);
    float verticalFade = 1.0 - (cos(tiltedY * 6.28) * 0.5 + 0.5);

    space.y += random(space.x * warpFrequency + iTime * warpSpeed) * warpAmplitude * (0.5 + horizontalFade);
    space.x += random(space.y * warpFrequency + iTime * warpSpeed + 2.0) * warpAmplitude * horizontalFade;

    /* intensidade acumulada das linhas (escalar) e um leve desvio de matiz,
       para as linhas não ficarem todas exatamente do mesmo rosa chapado */
    float intensity = 0.0;
    float inkMix = 0.0;

    for (int l = 0; l < linesPerGroup; l++) {
      float normalizedLineIndex = float(l) / float(linesPerGroup);
      float offsetTime = iTime * offsetSpeed;
      float offsetPosition = float(l) + space.x * offsetFrequency;
      float rand = random(offsetPosition + offsetTime) * 0.5 + 0.5;
      float halfWidth = mix(minLineWidth, maxLineWidth, rand * horizontalFade) / 2.0;
      float offset = random(offsetPosition + offsetTime * (1.0 + normalizedLineIndex)) * mix(minOffsetSpread, maxOffsetSpread, horizontalFade);
      float linePosition = getPlasmaY(space.x, horizontalFade, offset);
      float line = drawSmoothLine(linePosition, halfWidth, space.y) / 2.0 + drawCrispLine(linePosition, halfWidth * 0.15, space.y);

      intensity += line * rand;
      inkMix += line * normalizedLineIndex;
    }

    /* as linhas somem em direção ao topo e à base: a Hero precisa dissolver
       no branco da página, sem uma borda dura onde o canvas termina */
    intensity *= verticalFade;
    inkMix = clamp(inkMix * 0.12, 0.0, 1.0);

    vec3 bg = mix(bgWhite, bgTint, uv.x);
    vec3 lineTone = mix(brandPink, brandInk, inkMix * 0.35);

    /* teto em 0.82 para o plasma nunca virar uma mancha sólida por cima do
       texto — ele é fundo, não protagonista */
    vec3 col = mix(bg, lineTone, clamp(intensity * 0.5, 0.0, 0.82));

    gl_FragColor = vec4(col, 1.0);
  }
`;

function compile(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('hero-shader: erro ao compilar shader', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function buildProgram(gl, lines) {
  const vs = compile(gl, gl.VERTEX_SHADER, VS);
  // injeta o nº de linhas em runtime (menos no mobile, p/ aliviar aparelhos fracos)
  const fsSource = FS.replace(/linesPerGroup\s*=\s*\d+/, 'linesPerGroup = ' + lines);
  const fs = compile(gl, gl.FRAGMENT_SHADER, fsSource);
  if (!vs || !fs) return null;
  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('hero-shader: erro ao linkar programa', gl.getProgramInfoLog(program));
    return null;
  }
  return program;
}

export function initHeroShader(canvas) {
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' });
  if (!gl) return null;

  const isMobile = window.matchMedia('(max-width: 640px)').matches;
  const program = buildProgram(gl, isMobile ? 30 : 50);
  if (!program) return null;

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

  const aVertexPosition = gl.getAttribLocation(program, 'aVertexPosition');
  const uResolution = gl.getUniformLocation(program, 'iResolution');
  const uTime = gl.getUniformLocation(program, 'iTime');

  // DPR limitado a 1.5: o shader roda por pixel, e num display 3x o custo
  // triplica sem ganho visual perceptível num fundo difuso como este.
  const resize = () => {
    // PERF: renderiza abaixo da resolução real (o CSS estica o canvas); num
    // plasma difuso não dá pra perceber e alivia bastante a GPU. Mobile mais baixo.
    const scale = window.innerWidth <= 640 ? 0.6 : 0.7;
    const w = Math.max(1, Math.round(canvas.clientWidth * scale));
    const h = Math.max(1, Math.round(canvas.clientHeight * scale));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
  };
  window.addEventListener('resize', resize, { passive: true });
  resize();

  const start = performance.now();
  let frame = null;
  let running = false;

  const draw = () => {
    resize();
    gl.useProgram(program);
    gl.uniform2f(uResolution, canvas.width, canvas.height);
    gl.uniform1f(uTime, (performance.now() - start) / 1000);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.vertexAttribPointer(aVertexPosition, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(aVertexPosition);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };

  const loop = () => {
    draw();
    frame = requestAnimationFrame(loop);
  };

  const play = () => { if (!running) { running = true; loop(); } };
  const pause = () => { running = false; if (frame) cancelAnimationFrame(frame); frame = null; };

  // fora de vista, não gasta GPU/bateria — a Hero sai da tela logo no
  // primeiro scroll e o plasma não precisa continuar rodando.
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => {
      entries[0].isIntersecting ? play() : pause();
    }, { threshold: 0 }).observe(canvas);
  } else {
    play();
  }

  draw(); // primeiro quadro imediato, para não piscar branco na entrada
  return { pause, play };
}
