# CHECKPOINT — Seção 03 ORBITAL (izitrad-novo)
_Último update: 2026-09-17_

> Este arquivo viaja com o projeto (OneDrive), independente da conta/máquina do Claude.
> **Na retomada:** leia este arquivo + os arquivos listados antes de mexer em qualquer coisa.

## Como rodar
```bash
python -m http.server 8151 --directory "C:/Users/vinic/OneDrive/Desktop/izidoc/_IZITRAD - SITE/izidoc-site-main"
```
Abrir: `http://localhost:8151/izitrad-novo/index.html` (hard refresh: Ctrl+Shift+R).

## O que é
Integração da **Seção 03 aprovada da v29N** dentro do site novo (`izitrad-novo/`), reusando o **documento real** que já atravessa a transição 02→03.
- **Referência (NÃO alterar):** `_izi-GPT/seção 3/29n-verdeizitrad_secao03-teste-nucleo-sem-respiracao.html` (a "v29N": anéis Saturno + 4 triângulos WebGL + popover).
- **Nota:** a v29N e a versão integrada atual devem **ambas ser preservadas** para comparação.

## Arquivos (izitrad-novo/)
- `index.html` — `.doc-stage` dentro de `.doc-orbit-wrap`; camadas de oclusão `.s3o-back`(z6)/`.s3o-front`(z11); `.s3o-intro` (coluna esquerda).
- `assets/css/solucao-orbital.css` — visual dos anéis Saturno + glow + nós/labels/detail/energia (classes com prefixo **`s3o-`** para não colidir).
- `assets/js/solucao-orbital.js` — motor CLÁSSICO (ligado ao scrub da initSolucao): monta as camadas, `getGeometry()` (centro final FIXO), `sync()`, deslize do doc + intro + revelação. Expõe `window.SolucaoOrbital`.
- `assets/js/solucao-nodes.js` — MÓDULO (`type=module`, importa **Three.js 0.180** do jsdelivr): 4 triângulos WebGL, movimento orbital, oclusão dos nós, labels frente/trás, hit-area, popover, energia.
- `assets/js/site.js` — `initSolucao` chama `SolucaoOrbital.init`; foi removido o tween da 03-veias que movia o documento no fim.
- `assets/css/site.css` — estilos do `.doc-orbit-wrap` / `.s3o-*`.
- **Backups:** `.bak`/`.perfbak` (etapas anteriores) e **`.chk`** (= este checkpoint) ao lado de cada arquivo.

## Arquitetura (Opção B — APROVADA)
1. A **transição 02→03 é INTOCADA** e leva o documento ao **CENTRO** da tela.
2. Depois, **SEQUENCIAL**: o documento desliza **centro → direita** (via `.doc-orbit-wrap`, um wrapper EXTERNO — **nunca** escrever transform em `.doc-stage`/`.doc-mouse`/`.doc`); a **intro** entra à esquerda; e **só então** o **Saturno materializa**.
3. O orbital nasce **direto no CENTRO FINAL FIXO** à direita (`getGeometry()` = viewport + tamanho natural do doc × escala 0.55) — **NÃO** acompanha o documento ao vivo. O único elo espacial centro→direita é o documento.
4. **Oclusão:** `.s3o-back` (z<doc) atrás / documento (z9) / `.s3o-front` (z>doc) na frente. Os nós trocam de camada por profundidade.
5. **Núcleo/glow:** centralizado por CSS `translate(-50%,-50%)`. ⚠️ **NÃO** deixar o GSAP tocar o transform do glow (senão sai deslocado pra baixo/direita).
6. Tudo scrubado e **reversível**.

## Feito (sem mudar o visual aprovado)
- Descarga do clique: **verde → ROSA** (decisão nova; o rosa ainda pode ser afinado).
- **Performance** (matou o engasgo/"pulo"):
  - Gating por `IntersectionObserver` dos 3 loops (ondas do hero / crachás 02 `renderAll` / triângulos 03 `animate`) — só rodam quando a seção está por perto.
  - `placeNodes` posiciona por **`transform`** (não `left/top`) → sem reflow por frame.
  - Anéis + glow **`will-change:transform`** (camada GPU; rasteriza 1×, só compõe).
  - **Materialização dos anéis DEPOIS do deslize** (sequencial).
  - **Orbital SUSPENSO durante o deslize** (quando `.s3o-front` opacity ≤ 0.02 → pula `placeNodes` + os 4 renders WebGL) → **isso matou o "pulo no meio do trajeto"**.
  - Hover do núcleo (`s3oNucleoActive`) reimplementado **barato**: só `filter: brightness/saturate` (sem `box-shadow` animado).
  - **Todos os flags `__DIAG_*` removidos** (código limpo).

## Limitação conhecida
No ambiente do agente Claude **não dá pra renderizar/print/profilar** (viewport 0, rAF morto) → **validação visual e FPS dependem da usuária**.

## EM ABERTO / próximos passos
- **Opção 2 (PAUSADA):** documento passando pelos **triângulos VIVOS** durante o deslize sem travar → exige **consolidar os 4 renderers WebGL num só**. Catch: a oclusão (nós atrás/na frente do doc) provavelmente pede **2 canvases** (front/back), não 1 → 2 contextos em vez de 4. Esforço médio-alto, risco visual temporário.
- **Calibração fina (A1) — NÃO decidida:** ainda não escolhemos se a geometria final segue a **v29N** ou a da **integração atual**. **NÃO fazer A1 antes dessa decisão.**
- **Mobile/responsividade** e ajuste do **tom do rosa** da descarga → depois.
- **Proposta de copy (narrativa das seções) — PARCIALMENTE implementada.**
  Diagnóstico: `.copy-a`, `.s3-headline` e `.s3o-intro` repetiam a mesma ideia ("você sabe o que precisa / a gente resolve") em sequência rápida dentro da mesma seção 03, e `.s3-headline` ainda contradizia `.copy-a`. `.s3-close` também duplicava quase literalmente a promessa do Hero. Eixo proposto: **02 = qual COMBINAÇÃO/ordem** (os 5 chips) e **03 = qual TIPO de tradução** (os nós orbitais).
  - ✅ `.copy-a` → h2: "Um documento. Cinco jeitos de chegar lá." / sub1: "Apostila, tradução, ou os dois — a ordem muda o resultado." / sub2: "Veja qual combinação é a sua." — **feito** (2026-09-17).
  - ⬜ `.s3-headline` → "Isso resolve a ordem. Falta o tipo de tradução." / `.s3-sub`: "Juramentada, certificada, técnica ou simples — cada uma serve pra um caso diferente." — ainda não aplicado.
  - ⬜ `.s3o-title` → "CADA TRIÂNGULO É UM TIPO DE TRADUÇÃO." (alt: "TOQUE E DESCUBRA QUAL É O SEU."); `.s3o-lead` mantém como está — ainda não aplicado.
  - ⬜ `.s3-close` → h2: "Já sabe o que precisa? Manda pra gente." (parágrafo mantém) — ainda não aplicado.
  - Hero e `.s2-layer` (intro da 02) mantêm como estão.

## Sessão 2026-09-17 — Polish visual + performance da Seção 02 ("O Caminho")
Fora do escopo da 03 orbital, mas registrado aqui por ser a mesma frente de trabalho. Tudo já commitado localmente (não publicado).

**Visual (feito):**
- `.copy-a` (texto antes dos 5 chips): copy nova (ver acima), tipografia sem uppercase/tracking largo, peso 300, `left:10px`, fonte maior; card `.c2` movido de `top:37%` → `46%` pra não sobrepor o texto.
- `.chip-box` (cards): borda hairline neutra (era rosa forte), sombra em 3 camadas mais sutis, `border-radius` 14→12px. Valores de hover em `initChipTilt` (site.js) sincronizados com o novo visual (estavam hardcoded com o estilo antigo, causando "voltar pro rosa" ao tirar o mouse — corrigido).
- Linhas conectoras (`.cam-line`): traço mais fino (2.3→1.4px), dash mais discreto, `stroke-linecap:round`; curva dos degraus suavizada (`pathStair` default `t` 0.55→0.72). Ajuste extra: `pc2.stair.over` -34→-14 (a curva subia perto demais do texto do `.copy-a`).
- Esferas numeradas dos chips: **trocadas de Three.js/WebGL pra CSS puro** (ver Performance abaixo) — gradientes radiais simulando luz/sombra + brilho pequeno animado (`::before`, deriva lenta) + sombra de contato (`::after`). Número (`.badge-num`) voltou a ser texto real, timing controlado pela mesma timeline GSAP que já existia (fase "4 — número" em `buildCaminho`).
- Barra de progresso (`.progress`) da seção inteira (02+03): já era funcional (scrub 0→100%, site.js:990), só não parecia. Ganhou trilho arredondado + preenchimento em pílula + ponto com glow marcando a posição — depois deixado mais discreto (trilho/preenchimento mais finos, glow mais fraco) a pedido.
- **Tentado e revertido:** glow ambiente atrás do documento (`.s2-glow`, radial-gradient+blur estático) — causou um bug não-descrito na inclinação/interação do mouse com o documento. Removido por completo (HTML+CSS). Não tentar de novo sem investigar a causa primeiro, ou esperar o fundo definitivo que a usuária pretende adicionar.

**Performance (feito):**
- `chip-spheres.js` **removido do projeto** (arquivo deletado) — 5 contextos WebGL a menos na seção 02.
- `.chip-box`: removido `backdrop-filter:blur(8px)` (caro, quase imperceptível num fundo estático como o atual), compensado com opacidade do fundo .86→.97.

**Ainda pendente (perf), mesmo padrão já aplicado aqui:**
- Consolidar os 4 renderers WebGL dos triângulos da seção 03 orbital (a "Opção 2" acima) — mesmo raciocínio das 5 esferas, ainda não feito lá.

## Sessão 2026-09-17 (parte 2) — Cards "vidro premium" (.chip-box--glass)
Usuária trouxe uma referência Three.js bem elaborada (`_izi-GPT/efeito card vidro/_1-NOVO PONTO DE PARTIDA.html` — vidro com transmissão real, fresnel em shader, aberração cromática via 2 passes de render, RectAreaLight). Avaliado como caro demais pra produção (2 renders/frame + shaders custom) — decisão: usar só como referência de ARTE, recriar em CSS puro.

**Resultado — aplicado nos 5 chips (`.chip-box--glass` no site.css, ~linha 349-410):**
- Fundo "vidro": gradiente diagonal simulando reflexo + insets simulando espessura de borda (sem `backdrop-filter`).
- Brilho seguindo o mouse: reaproveita o x/y que `initChipTilt` (site.js) já calcula por `pointermove` — só escreve 2 custom properties (`--mx`/`--my`) a mais, sem listener/loop novo.
- Título sólido/nítido (testamos serigrafia com `text-shadow` em camadas — prejudicava legibilidade, revertido pro estilo limpo).
- Fluxo origem→destino com hierarquia de peso (etapas intermediárias leves `.cd-a`, última forte `.cd-b`), conectadas por setas com leve brilho (`.cd-band`).
- **"Espessura" física falsa**: pseudo-elemento `::after`, retângulo estreito (20px) articulado na borda do card e girado 90° em Y — como o card já gira de verdade via GSAP (`preserve-3d`), a face aparece como profundidade real. Fica sempre do lado que "abre" (onde o crachá NÃO está): direita em c1/c3/c5, **espelhada pra esquerda** em c2/c4 (`.c2 .chip-box--glass::after,.c4 .chip-box--glass::after`) — esses têm `baseY` de rotação POSITIVO (mirror), então a lógica do lado que abre é invertida.
  ⚠️ **Limitação conhecida (avisada à usuária):** é um truque 2D calibrado pro ângulo atual, não um sólido 3D de verdade — só tem espessura num lado, não reage à luz, e pode "quebrar" (mostrar costura) se o ângulo mudar demais. NÃO é equivalente à geometria real do arquivo de referência.
- Hover exagerado (Z/escala/tilt bem mais fortes que os outros elementos do site) pra vender a sensação de "saindo da tela": `GLASS_HOVER_CARD_Z=170` (vs `HOVER_CARD_Z=68` padrão), `GLASS_HOVER_SCALE=1.18` (vs `1.09`), `GLASS_TILT_MULT=1.8`. `baseY` de repouso também mais forte (`±27°` vs `±24°`).
- Bug corrigido durante o trabalho: o crachá numerado (`<small>`, elemento IRMÃO do card, não filho) não acompanhava o crescimento do hover — lia como "o texto cresce e briga com a animação". Agora sobe/escala junto (`gsap.to(badge,{z,scale,...})` sincronizado, mesma duração/easing do resto).
- `chip-desc` reestruturado em HTML: de texto plano (`Original → Apostila`) pra spans semânticos (`<i class="cd-a">`/`.cd-band`/`.cd-b`) — necessário pra hierarquia de peso funcionar.

**Ainda pendente:**
- **Mobile**: `initChipTilt` desliga inteiro em touch (`matchMedia('(hover:hover)...')`), mas o `::after` (espessura) é CSS puro sempre ativo — sem a rotação 3D combinando, provavelmente aparece quebrado/estranho no mobile. Precisa de fallback (provavelmente esconder `::after` e simplificar no media query mobile existente do site.css).
- Atmosfera de fundo (glow atrás do documento) segue revertida (ver sessão parte 1) — não retomada ainda.

## Sessão 2026-09-17 (parte 3) — Glow nas linhas (revertido) + carimbo do selo (feito)

**Glow nas linhas conectoras (`.cam-line`) — TENTADO E REVERTIDO:**
- Testado só em `pc2`/`pc4` (linhas dos cards c2/c4) pra comparar com o resto.
- `filter:drop-shadow` via CSS **não renderizava** — nem no `.cam-line` (que tem `mask` pro desenho progressivo por scroll) nem no `.cam-node` (círculo, sem mask nenhum). Causa mais provável: `filter`+`mask` no mesmo elemento SVG é instável entre navegadores; o motivo do `.cam-node` falhar também ficou sem explicação certa.
- Corrigido trocando pra um **`<filter>` SVG nativo** (`feGaussianBlur`, aplicado via atributo, não CSS) num `<path>` separado sem `mask` — essa técnica **funcionou** (confirmado visualmente). Fica registrado como a técnica certa pra glow em elementos com mask, caso seja retomado.
- Usuária não gostou do resultado visual → **removido por completo** (JS: `ensureCamGlow`/filter def/tweens; CSS: comentário residual). Linhas voltaram ao estado normal, sem glow, nos 5 caminhos.

**Carimbo do selo "BRASIL/APOSTILA" (`.doc__seal`) — FEITO, mantido:**
Ideia da usuária: em vez do selo nascer pronto no documento, ele "carimba" (aparece com efeito, tipo carimbo caindo) sincronizado com o card **"01 — APOSTILAMENTO"** assentando (`boxAt` de `pc1` em `buildCaminho`, site.js).
- `gsap.set('.doc__seal', {xPercent:-50,yPercent:-50,scale:2.2,rotation:-30,opacity:0,...})` — estado inicial escondido (perto do início de `initSolucao`).
- `tl.fromTo('.doc__seal', {opacity:0,scale:2.2,rotation:-30}, {opacity:1,scale:1,rotation:15,duration:.5,ease:'back.out(2.4)'}, boxAt)` — o "carimbo" propriamente dito.
- **Bug encontrado e corrigido:** `.doc` tem `overflow:hidden` (dá o acabamento de canto arredondado da folha); como o selo nasce maior que o tamanho final, a sobra ficava cortada na borda. Solução atual: `tl.set('.doc',{overflow:'visible'})` no início do carimbo e `overflow:'hidden'` de volta ao final (`boxAt+SEAL_DUR`).
  ⚠️ **Trade-off conhecido:** destravar o `overflow` do `.doc` inteiro (não só do selo) faz TODO o card perder o recorte arredondado durante essa janela — se a escala do selo for grande/o movimento for maior (testado com `scale:3.4` + `y:-70`), os cantos do card ficam visivelmente QUADRADOS por um instante (bug visual real, já visto e revertido uma vez). Com `scale:2.2` (valor atual) o problema existe pelo mesmo motivo, só que mais rápido/sutil — **prestar atenção nisso ao validar**.
  Solução "correta" mas não implementada (mais trabalho, precisa de medição via JS): tirar o `.doc__seal` de dentro de `.doc` (mover pra um elemento irmão fora do clip) e posicionar via `getBoundingClientRect` — evitaria depender de destravar o `overflow` do card inteiro.
- Testado empurrar mais o efeito (`scale:3.4`, `y:-70`, `rotation:-40`) — causou o bug dos cantos quadrados de forma bem visível, revertido de volta pro valor atual (`scale:2.2`, sem `y`, `rotation:-30`).

## Sessão 2026-09-17 (parte 4) — Rótulo "03 — A SOLUÇÃO" corrigido + pulso nos 5 caminhos

**Bug real encontrado e corrigido — `.s3-id` invisível:**
Causa raiz: `.s3{display:none}` era um **placeholder temporário** de uma etapa anterior do projeto (comentário no CSS dizia literalmente "remover quando a nova 03 entrar" — a nova 03/orbital já tinha entrado, ninguém removeu). Isso escondia TUDO dentro de `.s3`, inclusive `.s3-id`.
- `.s3-id` movido pra **fora** de `.s3` (agora irmão, `z-index:7` próprio no CSS) — visível normalmente.
- Removidos do HTML: `.s3-intro` (headline+subtítulo antigos) e `.s3-close` (CTA de fechamento antigo) — usuária confirmou que não serão usados (substituídos por `.s3o-intro`/fechamento do orbital).
- **Mantido DORMENTE de propósito** dentro de `.s3` (que continua `display:none`): `.veins`/`.svc` (as linhas + rótulos JURAMENTADA/CERTIFICADA/etc.) — usuária quis preservar esse efeito específico pra reaproveitar depois.
- Bug adicional corrigido: `updateVeins()`/`activate()` (o sistema das linhas dormentes) travava com `TypeError` toda vez que a página carregava, porque `updateVeins()` mede o tamanho do SVG pra criar os paths e aborta cedo quando o tamanho é zero (elemento escondido) — os paths nunca eram criados e o código que os usava (`activate()`) quebrava. **Desligado** (chamadas comentadas, não apagadas) até serem reaproveitadas.
- Validado via inspeção direta do navegador (não por print — não é confiável nesse ambiente): `resize_window` explícito + `tl.seek()` na timeline principal. Detalhes/limitações desse método registrados em memória própria (`browser-debug-izitrad-novo.md`).

**Pulso viajando pela linha — aprovado, aplicado nos 5 caminhos:**
Reaproveitado o efeito do sistema antigo/dormente (`.pulse` das veias): um ponto rosa claro com glow que percorre a linha logo depois dela desenhar, chegando um instante antes da "bola grande"/card aparecer. Implementado como `.cam-pulse` (path SVG próprio por caminho, `ensureCamPulse` em site.js), sincronizado com `LINE_DUR` de cada `buildCaminho`. Testado primeiro só no card 01, aprovado, depois estendido pros outros 4.
⚠️ Nota técnica de depuração: `tl.seek()` sozinho **não dispara callbacks `onUpdate`** por padrão (GSAP suprime eventos em seek) — pra validar esse tipo de efeito via script é preciso `tl.seek(tempo, false)`, e mesmo assim o disparo automático de onUpdate dentro de timelines scrubadas por ScrollTrigger pode não ser confiável nesse ambiente (validação real depende do navegador da usuária).

## Sessão 2026-09-17 (parte 5) — CONCLUÍDO E APROVADO: separação de camadas do selo

Problema identificado: o carimbo do selo (parte 3) precisa vazar da folha, mas isso exigia destravar temporariamente o `overflow:hidden` do `.doc` inteiro — quebrando o recorte arredondado do card inteiro durante a animação (bug visual real, cantos ficando quadrados).

**Solução implementada (arquitetura, sem redesign):** separar o selo do `.doc` estruturalmente.
- `.doc-mouse` (já existente, já é quem recebe o tilt do mouse — "a folha como peça única") virou o wrapper comum de DOIS filhos: `.doc` (intocado, mantém overflow:hidden/border-radius) e `.selo-layer` (NOVO, irmão de `.doc`, `inset:0`/sem overflow, hospeda `.doc__seal`).
- Como `.selo-layer` fica fora de `.doc`, o carimbo vaza livremente sem NUNCA precisar tocar no `overflow` do card — elimina o bug na raiz. **Gambiarra `tl.set(.doc,{overflow:...})` removida.**
- `.selo-layer` herda automaticamente todo movimento "global" do documento (scroll via `.doc-stage`, slide 02→03 via `.doc-orbit-wrap`, tilt do mouse via `.doc-mouse`) por estar dentro da mesma cadeia de ancestrais.
- **Respiração preservada por pedido explícito:** o selo tinha o scale 1↔1.014 por herança (morava dentro de `.doc`); ao virar irmão, deixaria de respirar junto. Resolvido incluindo `.selo-layer` como 2º alvo do MESMO tween de respiração (`gsap.to(q('.doc, .selo-layer'),{scale:1.014,...})`) — mesma instância, sem duplicar timeline, timing/amplitude idênticos.
- Posição do selo (`relocateSeal`, IIFE em `initSolucao`) calculada **uma única vez** via `getBoundingClientRect` (mede `.doc__map` e `.doc`, aplica a fórmula original 90%/88%/74% e converte pra % da caixa de `.doc`) — sem leitura de layout contínua (nem scroll, nem mousemove, nem por frame). Validado: desvio <4px em relação à posição original (dentro da variação natural da respiração).
- `.caminhos-svg` (as linhas dos 5 caminhos) fica estruturalmente acima de todo o grupo do documento (z-index:10 vs z:9 do `.doc-orbit-wrap`) — a separação de camadas resolve de graça o risco de colisão visual entre o selo grande e as linhas, sem precisar tocar nas linhas (`.caminhos-svg` não foi tocado).
- `.selo-layer` usa `z-index:1`, mas só é relevante DENTRO do stacking context próprio de `.doc-mouse` — não compete com `.caminhos-svg`/outras seções.
- **Aprovado pela usuária** ("ficou muito bom, até o momento não vejo nada estranho") — testado tilt do mouse, respiração e o carimbo (sem cortar a borda).
