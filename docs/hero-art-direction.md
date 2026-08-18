# izidoc — Especificação de Direção de Arte da Hero

**Status:** especificação para aprovação — nenhuma linha de HTML/CSS/JS deste documento foi implementada.
**Escopo:** apenas a Hero de `index.html` (seção `<section class="hero">`). Nada além disso.
**Infraestrutura que esta especificação assume como disponível e preservada:** Three.js (cena WebGL), GSAP + ScrollTrigger, sistema de tom de fundo persistente entre seções, sistema de `prefers-reduced-motion`, fallback sem WebGL (documento em HTML/CSS puro), narrativa de estados `pre`/`post`.

Este documento existe para que qualquer pessoa — designer ou desenvolvedora — consiga implementar exatamente a mesma Hero sem precisar adivinhar intenção. Onde um número pode ser dado, um número é dado. Onde uma decisão tem um motivo, o motivo está escrito ao lado dela.

---

## 1. Conceito

**Frase única:** *Um documento brasileiro comum se transforma, diante dos olhos do visitante, em um documento com validade internacional.*

A Hero não ilustra uma funcionalidade de produto. Ela dramatiza uma transformação de estado — de "documento doméstico" para "documento aceito no mundo inteiro" — e essa transformação é o único evento que organiza tudo o que existe na cena: composição, luz, movimento e narrativa existem para servir esse único momento (o carimbo), não para decorar a página.

**Teste de validação do conceito (aplicar sempre que houver dúvida de design):**
Esconda o logotipo "izidoc" e o H1. A cena sozinha — documento, selo, luz, palavras ao fundo, linhas de conexão — ainda precisa comunicar, em menos de 3 segundos: *isto é sobre documentos, tradução e reconhecimento internacional*. Se um elemento não contribui para essa leitura, ele não pertence à cena.

**O que a Hero não é** (rejeitado deliberadamente, não por falta de tempo):
- Não é "texto de um lado, objeto do outro" — é um único ambiente contínuo.
- Não é um selo grande parado ao lado do texto.
- Não é um fundo de partículas genérico, HUD, wireframe, grid tecnológico, globo terrestre ou mapa.
- Não é uma landing page tradicional com uma "seção hero" — é uma cena.

---

## 2. Composição completa

### 2.1 Princípio: cena única, não colunas

A Hero é um único palco (`.hero-stage`) onde texto e documento coexistem no mesmo espaço visual, com sobreposição controlada. O documento não fica confinado a uma metade da tela: ele domina a composição e pode se estender sobre a área onde o texto está, e pode sangrar (ultrapassar) a borda direita da viewport.

### 2.2 Zonas (referência: frame de 1600×900 — os percentuais valem proporcionalmente em qualquer largura ≥ 1280px; o comportamento abaixo de 1280px está na seção 8)

```
0%                 20%        40%        58%              88%      100%    118%
┌──────────────────────────────────────────────────────────────────────────┐
│ header fixo (fora da cena, sempre acima de tudo — z mais alto do site)    │
├──────────────────────────────────────────────────────────────────────────┤
│  ZONA A — TEXTO                          ┊  ZONA B — DOCUMENTO            │
│  x: 0%–41%   y: 14%–86%                  ┊  x: 58%–118%  y: 8%–58%        │
│ ┌───────────────────────┐                ┊ ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐      │
│ │ eyebrow (pílula)       │     ZONA C     ┊ ╎                       ╎     │
│ │ H1 linha 1 (branco)    │   ATMOSFERA    ┊ ╎     ┌─────────────┐   ╎     │
│ │ H1 linha 2 (rosa)      │  idiomas em    ┊ ╎     │  DOCUMENTO   │   ╎ →   │
│ │ lead (2–3 linhas)      │  profundidade, ┊ ╎     │  inclinado,  │   ╎ sangra
│ │ [CTA cheio][CTA outline]│  desfocados,   ┊ ╎     │  35–45% da   │   ╎ a borda
│ │ ✓ item   ✓ item        │  atrás de A/B  ┊ ╎     │  largura da  │   ╎ direita
│ │ ✓ item   ✓ item        │                ┊ ╎     │  hero        │   ╎ da view-
│ └───────────────────────┘                ┊ ╎     └─────────────┘   ╎ port
│                                           ┊ ╎            ⊙          ╎     │
│                                           ┊ ╎     ZONA D — SELO     ╎     │
│                                           ┊ ╎  no canto inferior-   ╎     │
│                                           ┊ ╎  esquerdo do          ╎     │
│                                           ┊ ╎  documento, nunca     ╎     │
│                                           ┊ ╎  sobre o texto dele   ╎     │
│                                           ┊  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘      │
│                    ZONA E — TRAJETÓRIAS: linhas finas nascendo do selo,   │
│                    cruzando por CIMA da zona C e por TRÁS da zona A/B     │
│                    (nunca por cima do H1 nem do texto do documento)      │
└──────────────────────────────────────────────────────────────────────────┘
```

### 2.3 Hierarquia visual (ordem em que o olho deve ler a cena — regra de arte-diretor, não sugestão)

1. **O documento** (zona B) — maior elemento, maior contraste (branco puro sobre fundo escuro), foco nítido, ocupa 35–45% da largura da Hero. É o protagonista absoluto.
2. **O H1** (zona A) — segundo maior contraste (branco + rosa sobre escuro), nunca disputa espaço físico com o documento graças ao corte em 58% (zona A termina antes da zona B começar de verdade — a sobreposição descrita em 2.4 é uma exceção controlada, não um choque de dois elementos do mesmo peso).
3. **O selo, no instante do carimbo** — por ~0.6s ele rouba a atenção via flash de luz; fora desse instante é secundário, discreto, menor que o documento.
4. **O CTA principal** (verde, saturado, isolado por espaço negativo) — três âncoras visuais fortes (documento, H1, CTA) formam um triângulo de leitura clássico.
5. **Linhas de conexão e rótulos de destino** (zona E) — terciário, baixo contraste, só existem depois do carimbo.
6. **Palavras da atmosfera** (zona C) — quaternário, desfocadas, quase texturra, nunca disputam leitura com nada.
7. **Névoa / vinheta / blur de primeiro plano** — sem informação, só profundidade.

### 2.4 Regra de sobreposição controlada (não-negociável)

O documento **pode** avançar sobre a badge/eyebrow (zona A superior) — é a única sobreposição de composição permitida, porque a eyebrow é curta, decorativa, e perder parte dela por trás do canto do documento reforça "o documento invade a cena" sem custo de leitura.

O documento **nunca** pode cobrir o H1. O H1 **nunca** pode ficar atrás de nada. Nenhum rótulo de destino, palavra de atmosfera ou linha de trajetória pode cruzar por cima da caixa delimitadora do H1, em nenhuma largura de tela entre 1280px e 1920px+. Isso é um critério de aprovação (seção 9), não uma preferência.

**Causa raiz a evitar (lição de uma tentativa anterior):** posições de elementos 3D não podem ser números fixos ajustados para uma única largura de tela. A implementação deve calcular a posição de destinos/rótulos a partir do FOV/aspect real da câmera no momento do render, de forma que a zona de exclusão do H1 (zona A) seja sempre respeitada — testado explicitamente em 1280px, 1440px, 1920px e 2560px, não só no tamanho em que foi desenhado.

### 2.5 O documento como objeto físico

O documento não é "um card branco com linhas cinzas". Ele deve ler como um objeto fotografado:
- **Espessura:** uma borda/aresta visível (mesmo que sutil) sugerindo que o papel tem profundidade, não é uma folha 2D.
- **Sombra própria:** projetada no "chão" da cena, deslocada na direção oposta à luz-chave (ver seção 6), borrada, nunca um `box-shadow` uniforme e centrado.
- **Reflexo/sheen:** um brilho diagonal fixo sugerindo superfície levemente glacê/laminada — presente sempre, sutil, não é a varredura de luz da autenticação (que é um evento único, ver storyboard).
- **Microtextura de segurança:** só aparece **depois** do carimbo (ver seção 4) — antes disso o papel é limpo/comum.
- **Inclinação:** o documento nunca fica de frente para a câmera. Perspectiva forte (rotação combinada em X, Y e Z — não uma única rotação plana) desde o primeiro frame, mesmo antes de qualquer animação começar.

---

## 3. Diagramas ASCII adicionais

### 3.1 Planos de profundidade (vista lateral — câmera à esquerda olhando para a direita)

```
CÂMERA                                                                    FUNDO
 (usuário)                                                          (mais distante)
    │
    │  plano 7        plano 6      plano 5       plano 4       plano 3        plano 2/1
    │  foreground     selo         documento      trajetórias   atmosfera      névoa + luz
    │  blur           nítido       nítido (HTML)  linhas finas  idiomas        de fundo
    │                                                            (blur         (sem objeto,
    │                                                             crescente    só gradiente
    │                                                             com a        + neblina)
    │                                                             distância)
    │     ░░               ⊙            ▭              ╱          Aa   b        ▓▓▓▓▓
    │     ░░                                           ╱        C
    │     ░░                                          ╱
    ▼
  z ≈ +1.4          z = 0          z ≈ -0.2        z ≈ -1.7      z ≈ -1.3      z ≈ -6
  (quase fora      (referência    (fora do canvas, z ≈ -3.4      até -5.4      até -10
   de quadro,       de mundo)      é HTML puro)                  (3 sub-       (névoa
   opacidade                                                      planos)      exponencial,
   muito baixa)                                                                THREE.FogExp2)
```

7 planos, cada um com resposta própria a mouse e scroll — detalhado na tabela da seção 5.

### 3.2 Composição mobile (< 760px de largura) — ver seção 8 para a justificativa completa

```
┌─────────────────────────┐
│ header                   │
├─────────────────────────┤
│  ● Apostilamento em 24h  │
│  Apostilamento de        │
│  Haia sem sair de casa   │
│  lead em 2–3 linhas      │
│                           │
│      ┌───────────────┐   │  ← documento visível
│      │   documento    │   │    SEM rolar a página,
│      │   (menor,      │   │    dentro dos primeiros
│      │   leve tilt,   │   │    ~760px de altura
│      │   estático)    │   │
│      │         ⊙      │   │
│      └───────────────┘   │
│                           │
│  [CTA cheio]              │
│  [CTA outline]            │
│  ✓ item  ✓ item           │
├─────────────────────────┤
│  barra fixa inferior      │
└─────────────────────────┘
```

### 3.3 Comportamento no scroll (visão temporal, eixo horizontal = progresso de rolagem)

```
0% ─────────────── 100% (fim natural da Hero) ─────── +40% da altura da Hero ───────► próxima seção
│                   │                                  │                              │
│  Hero normal:      │  Documento começa a se           │  Documento PINADO na tela,    │
│  documento na       │  aproximar do topo da            │  totalmente estável, ~60%     │
│  posição B/D,       │  viewport, ainda rolando         │  do trecho — depois encolhe   │
│  rola junto com      │  junto com o resto              │  e funde suavemente nos        │
│  o resto da Hero     │  do conteúdo                     │  últimos ~40% do trecho        │
│                     │                                  │  extra                        │
└─────────────────────┴──────────────────────────────────┴────────────────────────────────┘
```

---

## 4. Storyboard da narrativa (início ao fim)

Cada cena tem duração aproximada, o que está em quadro, o estado da câmera/luz, e — obrigatório — **o motivo narrativo do movimento**. Nenhum movimento existe sem essa justificativa.

| # | Cena | Duração aprox. | O que acontece em quadro | Câmera / luz | Por que esse movimento existe |
|---|------|----------------|---------------------------|--------------|-------------------------------|
| 1 | **Documento nasce** | 0.0–0.6s | Documento já visível na pose de repouso (tilt 3D, sombra, sheen), vazio — só as linhas cinzas de placeholder, sem texto. Ambiente frio, névoa mais fechada, poucas palavras de atmosfera, bem apagadas. Nenhuma conexão/trajetória existe ainda. | Luz-chave fria (azul), intensidade baixa, ambient baixo (contraste alto, sombras profundas). Câmera parada. | Documento "nasce" já com presença física — não é um elemento que aparece do nada, é algo que já estava lá, escondido na penumbra, e a luz sobe para revelá-lo. |
| 2 | **Campos preenchidos** | 0.6–1.6s | As linhas do documento se revelam (efeito de "escrita" via `clip-path`, esquerda→direita), como se estivessem sendo preenchidas automaticamente. | Sem mudança de luz/câmera. | Preenchimento automático = a promessa central do produto ("você não digita nada"); precisa ser lido literalmente. |
| 3 | **Tradução** | 1.6–3.5s | O campo de tipo de documento troca de idioma em sequência (Português → English → Français → Español), cada troca com crossfade + leve desfoque — nunca corte seco. | Sem mudança de luz/câmera. | Mostra "tradução" sem precisar de um ícone de tradução — a própria informação muda de forma, o que é mais honesto que uma metáfora. |
| 4 | **Selo entra** | 3.5–4.6s | O selo desce de fora do quadro (de cima), com peso — aceleração, não velocidade constante — girando levemente, até pousar no canto inferior-esquerdo do documento. | Câmera parada. Luz ainda fria. | "Entra", não "aparece": o carimbo é um evento físico que acontece NO documento, não um efeito decorativo ao lado dele. |
| 5 | **Impacto** | 4.6–4.75s | No instante do pouso: vibração curta do documento (2–3 oscilações rápidas de poucos pixels), flash de luz breve (~90ms), poucas partículas metálicas discretas (10–15, não uma explosão). | Pico de brilho instantâneo no flash; luz-chave começa a esquentar imediatamente após. | O impacto precisa ser sentido, não só visto — a vibração do papel + o flash comunicam peso físico real, não um sticker sendo colado. |
| 6 | **Transformação do ambiente** | 4.75–6.1s | Simultaneamente: (a) o chip do documento troca "PDF" → "Apostila"; (b) o badge troca "Verificado" → "Válido em mais de 120 países"; (c) marca d'água/textura de segurança aparece no papel; (d) linhas de trajetória nascem do selo e se desenham até rótulos de destino (Lisboa, Madri, Nova York, Paris, Tóquio) que agora surgem; (e) a névoa abre e esquenta de temperatura; (f) as palavras de atmosfera ganham um pouco mais de vida (opacidade/movimento). | Luz-chave conclui a transição fria→quente; kicker (rosa) e rim light sobem de intensidade; névoa menos densa. | Este é o clímax: **não é o documento que muda sozinho — o mundo inteiro reage**. É isso que comunica "o documento ganhou o mundo", mais do que qualquer efeito isolado. |
| 7 | **Repouso ativo** | 6.1s em diante | Cena estabiliza: documento e selo continuam com respiração/oscilação quase imperceptível (nunca congela, nunca vira loop óbvio), conexões pulsam bem devagar, câmera responde a mouse/scroll. | Preset "quente" mantido. | Uma cena "viva" sustenta o tempo de permanência do visitante — uma imagem congelada perde o efeito depois dos primeiros segundos. |

**Textos exibidos no documento durante a Cena 3** (nesta ordem, já definidos e implementados): `Birth Certificate` → `Certificat de Naissance` → `Certificado de Nacimiento` (documento nasce em português — "Certidão de Nascimento" — e essa é a última palavra vista antes do carimbo, retornando à origem antes de ganhar validade internacional).

---

## 5. Camadas da cena (detalhamento técnico-artístico dos 7 planos)

| Plano | Conteúdo | Profundidade relativa | Nitidez | Resposta ao mouse | Resposta ao scroll |
|-------|----------|------------------------|---------|--------------------|----------------------|
| 1 — Fundo/luz | Gradiente + névoa exponencial (`FogExp2`), sem geometria própria | mais distante | — | nenhuma (é o "céu" da cena) | cor/densidade tween ao trocar de seção (sistema de tom já existente) |
| 2 — Névoa | Mesma névoa, lida como falloff de profundidade sobre os planos 3–6 | contínuo | — | nenhuma | densidade muda pre→post (mais fechada antes, mais aberta depois) |
| 3 — Atmosfera (idiomas) | Palavras: Português, English, Español, Français, Deutsch, Italiano, 日本語, 中文, العربية | 3 sub-camadas escalonadas | desfoque crescente com a distância (baked na textura, não em tempo real) | leve — a mais lenta de todas (menor deslocamento por pixel de movimento do mouse, por estar mais longe da câmera; é consequência da perspectiva, não um multiplicador artificial) | leve drift de opacidade/velocidade ao trocar pre→post |
| 4 — Trajetórias | Linhas finas do selo até rótulos (Lisboa, Madri, Nova York, Paris, Tóquio) | intermediário, à frente da atmosfera | nítido mas de baixo contraste (opacidade ~0.5) | resposta intermediária | só existem depois do carimbo; entram com "desenho" progressivo, não pop-in |
| 5 — Documento | O card em si (HTML/CSS real — nunca migrar para textura 3D, ver seção "decisões preservadas" abaixo) | plano focal principal | sempre nítido (é texto real) | resposta própria e mais lenta que o selo (documento = objeto "mais pesado", selo = objeto "mais leve e reativo") — dá sensação de massas diferentes | persiste via pin (seção 7) |
| 6 — Selo | Medalhão 3D metálico | mais próximo que o documento | sempre nítido | a mais forte de todas as respostas a mouse (está mais perto da câmera) | acompanha o documento no pin, com leve defasagem própria |
| 7 — Foreground | Mancha de luz borrada (bokeh), canto da tela | mais próxima da câmera | intencionalmente desfocada | quase nenhuma (está "colada" na lente, não no mundo) | nenhuma |

**Regra geral de paralaxe:** a diferença de resposta entre planos vem de física de câmera real (perspectiva + distância), não de multiplicadores arbitrários por camada — um objeto duas vezes mais distante se desloca a metade da velocidade aparente para o mesmo movimento de câmera. A câmera é o único elemento que efetivamente "se move" com o mouse; os planos reagem de forma diferente porque estão a distâncias diferentes dela, não porque cada um tem uma regra própria.

**Decisão preservada de versões anteriores desta especificação:** o documento continua sendo HTML/CSS real (não um plano 3D com texto em textura). Motivo: nitidez de texto em qualquer densidade de pixel, texto selecionável/indexável (SEO), e acessibilidade — nenhum desses ganhos existe se o texto vira imagem. O selo é o único elemento genuinamente 3D, porque é o único que precisa parecer metal/relevo/reflexo — coisas que CSS não simula bem e Three.js simula bem.

---

## 6. Direção de iluminação

Modelo de 3 pontos, como em still de produto (não iluminação plana de interface):

```
                     luz de contorno (rim)
                     atrás/lado oposto,
                     fria (sky blue → dourada no pós)
                     separa o documento do fundo
                              ╲
                               ╲
   luz-chave (key) ──────────► [ DOCUMENTO / SELO ] ◄────── leve preenchimento
   frontal-lateral,                  │                       (ambient, baixo,
   é a luz que "esculpe" —           │ sombra própria         nunca plano)
   define onde está a face           ▼ projetada, deslocada
   iluminada e onde está             na direção oposta
   a sombra do relevo                à luz-chave
```

- **Luz-chave:** origem lateral-superior (esquerda-alto), é a que define a forma — cria um gradiente de luz visível cruzando a superfície do documento e do selo, não uma iluminação uniforme. Antes do carimbo: tom frio (`#7CB9E8`, intensidade baixa). Depois: tom quente (`#FFD9A8`, intensidade alta) — essa mudança de temperatura **é** o sinal visual da transformação, tão importante quanto o carimbo em si.
- **Luz de contorno (rim):** posicionada atrás/oposta à luz-chave. Função única: separar a silhueta do documento/selo do fundo escuro, dar a sensação de "objeto flutuando no espaço" em vez de "recortado colado na tela". Ganha intensidade no pós-carimbo (reforça a separação quando o ambiente "acorda").
- **Preenchimento (ambient):** intencionalmente baixo (contraste alto, sombras que não desaparecem) antes do carimbo — isso é o que dá "peso dramático" à cena inicial. Sobe moderadamente no pós-carimbo, mas nunca o suficiente para achatar a luz-chave.
- **Kicker rosa (marca):** luz pontual de acento na cor de marca, função decorativa/identidade, não estrutural — reforça o brilho do aro do selo e o bloom controlado no momento do flash.
- **Bloom:** só onde há emissão de luz real (aro do selo, flash do impacto) — nunca um bloom genérico sobre a cena inteira.

A luz nunca é estática de fato: mesmo em repouso, uma oscilação quase imperceptível de intensidade (não de cor) evita a sensação de imagem congelada.

---

## 7. Comportamento no scroll

1. **Dentro da Hero:** o documento acompanha o scroll normalmente, como parte do fluxo da página — nenhuma camada é "pinada" ainda.
2. **Na borda natural da Hero:** no instante em que o topo do documento tocaria o topo da viewport (ou seja, o momento exato em que ele sairia de quadro rolando normalmente), ele passa a ficar fixo (pin) — sem salto, sem re-posicionamento visível.
3. **Trecho estendido (pin):** o pin dura o restante do scroll da Hero **mais** aproximadamente 40% da altura da viewport além do fim natural da Hero. Durante os primeiros ~60% desse trecho pinado, o documento permanece estável, totalmente visível, enquanto o resto do conteúdo da página rola por baixo dele. Só nos últimos ~40% do trecho ele encolhe, perde opacidade e desfoca suavemente — a "entrega" para a próxima seção.
4. **Depois do pin:** o documento já desapareceu suavemente antes da próxima seção assumir a tela por completo — nunca deixa um vão vazio, nunca corta de forma abrupta.
5. **Câmera:** durante o scroll, a câmera 3D recua/sobe muito sutilmente (não é o canvas inteiro que se move — é a câmera dentro da cena), reforçando "a cena continua existindo", não "a seção terminou".
6. **Continuidade de cor entre seções:** o fundo da página (fora da cena 3D) já usa um sistema de interpolação de tom entre seções claras/escuras — este comportamento é preservado e deve continuar funcionando junto com o pin, sem competir com ele.

---

## 8. Comportamento no mobile

### 8.1 Decisão de escopo: sem cena 3D em telas estreitas

Abaixo de 760px de largura, a cena Three.js inteira (atmosfera, trajetórias, névoa) **não é carregada**. Só o documento (HTML/CSS) e o selo (SVG estático) aparecem, com a mesma narrativa de estados (preenchimento, troca de idioma, troca de chip, badge final) via CSS/GSAP — sem WebGL.

**Motivo:** a composição de atmosfera foi desenhada para respirar em telas largas; em uma tela de 375–430px de largura, as mesmas palavras/linhas não têm espaço para existir sem colidir com o texto ou o documento. Em vez de forçar uma versão reduzida e ainda assim arriscar poluição visual, o mobile recebe uma versão mais contida e 100% legível da mesma história. É uma decisão de composição, não uma limitação técnica.

### 8.2 O documento precisa estar visível sem rolar

**Esta é uma correção em relação a uma tentativa anterior**, na qual o documento ficava inteiramente abaixo da dobra em mobile — falha grave, porque a maioria do tráfego de um serviço como este é mobile, e a Hero perde o efeito de impacto imediato se o visitante precisa rolar para ver a cena.

Ordem vertical obrigatória em mobile, cabendo dentro de ~760px de altura sem rolar (ver diagrama 3.2):
1. Header
2. Eyebrow (pílula)
3. H1 (fonte reduzida em relação ao desktop, ainda 2 linhas)
4. Lead (encurtado se necessário para caber — priorizar a primeira frase)
5. **Documento** (versão compacta: menor, tilt reduzido, mas ainda claramente inclinado/físico, com o selo visível em repouso no canto)
6. CTA principal + CTA secundário
7. Trust items (podem exigir scroll — não são críticos para o impacto inicial)

### 8.3 Narrativa em mobile

A mesma sequência de estados (pre → filled → post) roda em mobile, só que sem os elementos exclusivos de WebGL (atmosfera, trajetórias, destinos). O selo estático já nasce na pose final; a transição visual de "antes/depois" acontece via: mudança do chip, mudança do badge, aparecimento da marca d'água/textura de segurança no papel. É uma versão mais contida da mesma transformação, não uma versão incompleta.

---

## 9. Critérios objetivos para considerar a Hero aprovada

Uma Hero só é considerada aprovada quando **todos** os itens abaixo são verdadeiros — verificados com capturas de tela reais, em múltiplas larguras, olhadas visualmente (não apenas medidas de DOM).

**Composição / hierarquia**
- [ ] Em 1280px, 1440px, 1920px e 2560px de largura: nenhum rótulo de destino, palavra de atmosfera ou linha de trajetória sobrepõe a caixa delimitadora do H1.
- [ ] Nas mesmas larguras: nenhum rótulo ou linha sobrepõe o texto interno do documento (título, campo de idioma, linhas de preenchimento) de forma a prejudicar a leitura.
- [ ] O badge de status e o chip nunca são cortados pela borda da viewport, em nenhuma largura testada.
- [ ] O documento é reconhecidamente o maior e mais nítido elemento da composição em qualquer estado da narrativa.

**Profundidade e luz**
- [ ] Uma captura estática (sem nenhuma animação rodando) comunica profundidade real — é possível apontar pelo menos 3 planos de distância diferentes só olhando a imagem parada.
- [ ] A mudança de temperatura de luz entre o estado inicial e o pós-carimbo é perceptível em capturas estáticas lado a lado, não só percebida em movimento.

**Impacto estático (o teste mais importante)**
- [ ] Escondendo o H1 e o logotipo, uma pessoa que nunca viu o site reconhece que a cena é sobre documentos, tradução ou reconhecimento internacional.
- [ ] A captura do estado inicial (Cena 1, documento vazio) sustenta comparação com uma Hero premiada em Awwwards — sem poluição, sem sobreposição, com espaço negativo real.
- [ ] A captura do estado pós-autenticação (Cena 6) sustenta a mesma comparação — este é o estado que mais falhou em tentativas anteriores desta Hero e precisa de atenção redobrada antes de aprovar.
- [ ] Uma pessoa pausaria alguns segundos só observando a cena, mesmo sem interagir.

**Scroll e continuidade**
- [ ] Não há salto de layout (CLS) perceptível ao entrar ou sair do trecho pinado.
- [ ] Não existe nenhum momento, durante o scroll, em que a tela fica com um vão vazio entre o documento sumindo e a próxima seção aparecendo.

**Mobile**
- [ ] Em viewport de 375–430px de largura e 700–900px de altura: o documento (ou pelo menos sua metade superior com o selo) está visível sem rolar a página.
- [ ] Nenhum elemento de atmosfera/trajetória aparece em mobile (carregamento de WebGL desabilitado abaixo de 760px, por decisão de composição, não só performance).

**Acessibilidade e resiliência (preservadas de decisões já validadas — não re-testar do zero, apenas confirmar que a nova composição não regrediu)**
- [ ] `prefers-reduced-motion: reduce` mostra o estado final imediatamente, sem nenhuma animação, sem pin de scroll.
- [ ] Sem WebGL disponível (ou conexão marcada como lenta/`saveData`), a composição em HTML/CSS puro ainda comunica a narrativa completa (documento, troca de estado, badge).
- [ ] Nenhum erro no console em nenhum dos cenários acima.

Enquanto qualquer item desta lista estiver marcado como falho, a Hero não está pronta — independentemente de "já estar funcionando" tecnicamente.
