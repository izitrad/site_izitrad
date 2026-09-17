# CHECKPOINT — Seção 03 ORBITAL (izitrad-novo)
_Último update: 2026-09-16_

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
- **Proposta de copy (narrativa das seções) — PENDENTE DE DECISÃO, não implementada.**
  Diagnóstico: `.copy-a`, `.s3-headline` e `.s3o-intro` repetem a mesma ideia ("você sabe o que precisa / a gente resolve") em sequência rápida dentro da mesma seção 03, e `.s3-headline` ainda contradiz `.copy-a`. `.s3-close` também duplica quase literalmente a promessa do Hero. Proposta: separar os eixos — **02 = qual COMBINAÇÃO/ordem** (os 5 chips) e **03 = qual TIPO de tradução** (os nós orbitais) — e parar de repetir a mesma frase-guarda-chuva.
  - `.copy-a` → h2: "Um documento. Cinco jeitos de chegar lá." / sub1: "Apostila, tradução, ou os dois — a ordem muda o resultado." / sub2: "Veja qual combinação é a sua."
  - `.s3-headline` → "Isso resolve a ordem. Falta o tipo de tradução." / `.s3-sub`: "Juramentada, certificada, técnica ou simples — cada uma serve pra um caso diferente."
  - `.s3o-title` → "CADA TRIÂNGULO É UM TIPO DE TRADUÇÃO." (alt: "TOQUE E DESCUBRA QUAL É O SEU."); `.s3o-lead` mantém como está.
  - `.s3-close` → h2: "Já sabe o que precisa? Manda pra gente." (parágrafo mantém).
  - Hero e `.s2-layer` (intro da 02) mantêm como estão.
