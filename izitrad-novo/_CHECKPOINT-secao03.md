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
