# CLINUP — DESIGN SYSTEM

> **Constituição visual da CLINUP.** Leia este arquivo ANTES de qualquer mudança visual no
> diagnóstico (`index.html`) ou na LP de planos (`planos.html`). Todo valor aqui foi extraído do
> código real (`assets/css/main.css` + os `<style>` inline das duas páginas). Use os **números
> exatos** — não improvise "cinza-claro" ou "espaçamento premium".
>
> Estética: **premium-claro** (fundo off-white, azul de marca como destaque, sensação de clínica
> premium). Stack: HTML/CSS/JS puro, sem build. Fonte de verdade dos tokens: `:root` em
> `main.css`.

---

## 1. Como usar
1. Antes de mexer no visual, ache o token/valor aqui e **reutilize** (não invente um hex novo).
2. Mudanças **cirúrgicas**, nunca refatoração ampla. Não tocar em lógica de diagnóstico/score/
   recomendação/Supabase/serverless sem necessidade explícita.
3. Mudança visual de mobile vai em **media query** (`max-width: 768px` ou `480px`), sem afetar o
   desktop indevidamente.
4. Cheque o **Checklist (§10)** ao final de cada alteração.

---

## 2. Paleta de cores

Tokens definidos em `main.css :root` (⚠️ os nomes são legado do tema escuro — **o valor é o que
vale**: `--white` é navy escuro, `--blue` é azul profundo, `--blue-soft` é o cyan):

| Token | Hex / valor | Uso real |
|---|---|---|
| `--bg` | `#F2F7FB` | Fundo da página (off-white com tom azul) |
| `--card` | `#FFFFFF` | Superfície de card (eleva sobre o `--bg`) |
| `--blue` | `#0C6F98` | **Azul de marca (profundo).** Texto-accent, preços, eyebrows azuis, links, borda de destaque, ring do score |
| `--blue-soft` | `#5BC4F0` | Cyan de marca. Início do gradiente dos botões, foco, fills/tints decorativos |
| `--blue2` | `#2D9EC9` | Fim do gradiente dos botões; `top-stripe`; tom das sombras de botão |
| `--white` | `#0E2233` | **Texto primário (navy).** Títulos, nomes, números |
| `--off` | `#16324A` | Texto de ênfase (`<strong>`), texto de opção |
| `--body` | `#2F4356` | Texto de corpo / descrições (slate escuro, ~10:1 — global nas duas páginas) |
| `--sub` | `#455769` | Secundário: eyebrows, labels, legendas, footer (~7.4:1) |
| `--border` | `rgba(16,50,75,0.10)` | Hairline de cards/inputs/divisores |
| `--green` | `#0E7A48` | **WhatsApp + checks ✓ (exclusivo).** Nunca para navegação |
| `--red` | `#B23A2E` | Estado **crítico** (terracota, não alarme) |
| `--orange` | `#9A5208` | Estado **mediano** (âmbar terroso) |
| `--shadow-sm` | `0 1px 2px rgba(16,40,60,.04), 0 4px 14px rgba(16,40,60,.05)` | Cards padrão |
| `--shadow-md` | `0 6px 22px rgba(16,40,60,.07), 0 14px 40px rgba(16,40,60,.05)` | Cards de destaque (q-card, score-card, cta) |
| `--shadow-lg` | `0 12px 30px rgba(16,40,60,.10), 0 22px 50px rgba(16,40,60,.07)` | Hover forte de card (`.plan-card:hover`) |

Cores fora do `:root` (literais no código, registrar aqui):
- **Texto sobre botão cyan:** `#060D15` (quase-preto) — usado em todos os botões com gradiente azul.
- **Chip do logo:** `background #0A1E30` (navy escuro, intencional — a arte do logo é clara).
- **Linha-topo do score-card por estado:** good `var(--blue-soft)`, moderate `#C9791C`, critical `#C24233`.
- **Ring do score (interpolado em JS, `results.js#scoreColor`):** vermelho `rgb(211,58,44)` → âmbar `rgb(224,138,30)` → verde `rgb(27,158,75)` (lerp RGB por faixa do score).
- **Orbs decorativos da hero (planos):** `.plans-hero::before/::after` — radiais `rgba(91,196,240,0.18)` (blue-soft) e `rgba(12,111,152,0.12)` (blue), `blur(44px)`, `pointer-events:none`, atrás do texto (`z-index:0`; o texto vai a `z-index:1`). A `.plans-hero` é `position:relative; overflow:hidden`. Ambiente sutil — não compete com a leitura.
- **Destaque na headline (`.hl-accent`):** `color: var(--blue)` — **só cor** (mesmo peso/tamanho da headline), aplicado na expressão-chave da headline dinâmica da planos. AA folgado (título grande).

### Regras de cor (decididas, obrigatórias)
- 🟢 **Verde (`--green`) é EXCLUSIVO de botão que abre o WhatsApp** (e dos checks ✓). Nunca usar
  verde para navegação interna ou destaque genérico.
- 🔵 **Azul-ciano (marca) = navegação interna + destaque da marca.** Botão "Continuar", botões de
  navegação, badges, preços.
- 🔴 **Cor de estado** (`--red`/`--orange`) só nos resultados (badge/score). Tom **terroso e
  elegante**, nunca vermelho-alarme estridente.

---

## 3. Tipografia

**Famílias** (carregadas via Google Fonts em ambas as páginas):
- **`'Sora'`** — pesos `400; 600; 700; 800`. Títulos, headlines, nomes, **botões**, números/preços.
- **`'Plus Jakarta Sans'`** — pesos `300; 400; 500; 600`. Corpo, descrições, labels, inputs.

Níveis (valores exatos do código):

| Nível | Família | Tamanho | Peso | letter-spacing | line-height | Cor |
|---|---|---|---|---|---|---|
| Headline diagnóstico (`.intro h1`) | Sora | `clamp(34px, 7vw, 52px)` | 800 | -1.5px | 1.05 | `--white` |
| Headline lead (`.lead-headline`) | Sora | `clamp(28px, 6vw, 42px)` | 800 | -1.5px | 1.1 | `--white` |
| Headline planos (`.plans-hero h1`) | Sora | `clamp(26px, 5vw, 40px)` | 800 | -1px | 1.1 | `--white` |
| Título resultado (`.result-title`) | Sora | `clamp(26px, 5vw, 38px)` | 800 | -1px | 1.1 | `--white` |
| Título CTA (`.cta-title`) | Sora | `clamp(22px, 4vw, 30px)` | 800 | — | 1.2 | `--white` |
| Pergunta quiz (`.q-text`) | Sora | `clamp(20px, 4vw, 26px)` | 700 | — | 1.3 | `--white` |
| Preço (`.plan-price`) | Sora | `clamp(26px, 3.5vw, 34px)` | 800 | — | 1 | `--blue` |
| Nome do plano (`.plan-name`) | Sora | 17px | 800 | — | — | `--white` |
| Título de card (`.finding-title`, `.result-path-title`, `.step-title`) | Sora | 15px | 700 | — | — | `--white` |
| Título de card menor (`.feature-title`) | Sora | 14px (16px ≤768) | 700 | — | — | `--white` |
| Subtítulo / lead-sub | Plus Jakarta | 16–18px | 400 (planos: 500) | — | 1.6–1.65 | `--body` |
| Corpo / descrição | Plus Jakarta | 13–14px | 400 (planos: **500**) | — | 1.45–1.65 | `--body` |
| **Eyebrow** de seção (`.section-label`, `.plans-section-label`, `.cta-eyebrow`, `.plans-team-label`) | Plus Jakarta | 11px | 700 | **3px** | — | `--sub` (ou `--blue`) UPPERCASE |
| Eyebrow quiz (`.q-number`) | Plus Jakarta | 11px | 700 | 4px | — | `--blue` UPPERCASE |
| Badge pill (`.badge`, `.plan-badge`, `.result-badge`) | Plus Jakarta | 10–11px | 700 | 2–3px | — | UPPERCASE |
| Label de campo (`.field-label`) | Plus Jakarta | 12px | 700 | 2px | — | `--sub` UPPERCASE |
| Legenda / footer (`.lead-privacy`, `.plans-footer p`, `.cta-note`) | Plus Jakarta | 12–13px | 500–600 | — | 1.5 | `--sub` |

### Regras de tipografia / legibilidade (obrigatórias)
- **LEGIBILIDADE VENCE ELEGÂNCIA.** Nenhum texto pode ser difícil de ler — a leitura é o recurso
  principal de conversão.
- **Contraste AA mínimo (4.5:1)** em todo texto. Textos secundários **nunca** em cinza-claro fino.
  Referência (sobre branco): `--white` ~15:1, `--off` ~12:1, `--body #2F4356` **~10:1**,
  `--sub #455769` **~7.4:1** — valores globais (mesmos no diagnóstico e na planos).
- **Hierarquia visível e intencional:** Título (Sora 700–800, `--white`) > Subtítulo (`--sub`/
  `--body`, peso médio) > Corpo (`--body`, 14px peso 400–500) > Eyebrow (11px/700, uppercase,
  letter-spacing 3px, `--sub`). A diferença de peso/cor/tamanho tem que ser perceptível.
- **Escalas fluidas com `clamp()`** em todo título grande (já é o padrão acima).
- Corpo/descrições em **peso 500** nas duas páginas (já padronizado).

---

## 4. Espaçamento

**Base = 4px.** Passos usados de fato no código (px): `4, 6, 8, 9, 10, 12, 14, 16, 18, 20, 24,
26, 28, 32, 36, 40, 48, 52, 80`. Os "principais" (use estes por padrão): **8 · 12 · 14 · 16 · 20
· 24 · 28 · 32 · 40 · 48**.

Referências reais:
- **Gaps** (flex/grid): 6 (campos), 9–10 (bullets/opções), 14 (cards de feature/finding), 16
  (steps / opções do quiz), 20 (grid de planos), 24 (intro-meta).
- **Padding de card:** grande `36px 32px` / `40px 32px`; médio `24px 28px` / `28px`; pequeno
  `18px 20px` / `20px`. Mobile (≤480) reduz para `28px 22px` / `14px 16px`.
- **Padding de página:** diagnóstico `main` = `36px 24px 80px`; planos `.plans-page` =
  `48px 24px 80px` (laterais **24px** é o gutter padrão).
- **Margin entre seções:** eyebrow→conteúdo `14–20px`; entre blocos `26–48px`; fechamento
  `40px / 52px`.

> ⚠️ A escala **não é estritamente 8** (aparecem 9, 14, 18, 26, 52). Ver Inconsistência #1.

---

## 5. Cards e superfícies

| Tipo | `border-radius` | Sombra | Borda | Fundo |
|---|---|---|---|---|
| Card grande (`.q-card`, `.score-card`, `.plan-card`, `.cta-section`) | **20px** | `--shadow-md` (cta/q/score) / `--shadow-sm` (plan) | `1px solid var(--border)` | `--card` |
| Card pequeno (`.finding`, `.result-path`, `.feature-item`, `.plans-guarantee`, `.plans-team`, `.step-item`) | **14px** | `--shadow-sm` | `1px solid var(--border)` | `--card` |
| Input (`.field-input`) | 12px | foco: `0 0 0 3px rgba(91,196,240,.15)` | `1.5px solid var(--border)` | `#FFFFFF` |
| Pílula / badge (`.badge`, `.plan-badge`, `.result-badge`, `.plan-rectag`) | `100px` | — | varia | tint/sólido |
| Chip de ícone (`.finding-icon`) | 8px | — | — | tint do estado |

- **Elevação:** `--shadow-sm` (cards padrão) → `--shadow-md` (cards de destaque) → **`--shadow-lg`**
  (hover forte, `.plan-card:hover`). Sombras distintas (não-`--shadow-lg`, mantidas literais por
  serem estados próprios): `.plan-featured` (repouso elevado, `0 8px 26px…, 0 18px 46px…`) e
  `.feature-item:hover` (lift menor de card pequeno).
- **Card recomendado (`.feature-item.is-rec`):** borda `rgba(12,111,152,.45)` + `box-shadow:
  0 0 0 1px rgba(12,111,152,.22), var(--shadow-sm)` + etiqueta "Recomendado" (pílula azul).
- **Card apagado (`.feature-item.is-dim`):** `filter: opacity(.58) saturate(.85)` (via `filter`
  para não brigar com a opacity do reveal).
- **Ícones:** SVG vetorial inline, `stroke: currentColor`, `stroke-width: 1.75`, `24px` (feature)
  / `28px`, cor `var(--blue)`. **Nunca emoji decorativo** em UI premium.

---

## 6. Botões

| Variante | Fundo | Texto | Raio | Peso/Fonte | Hover |
|---|---|---|---|---|---|
| **Primário / CTA azul** (`.btn-start`, `.btn-continue`, `.btn-whatsapp`*, `.btn-next`) | `linear-gradient(135deg, var(--blue-soft) 0%, var(--blue2) 100%)` | `#060D15` | 12px (10px no `.btn-next`) | Sora 800, 15–17px | `translateY(-2px)` + sombra |
| **WhatsApp (plano)** (`.plan-btn-primary`) | `var(--green)` sólido | `#fff` | 10px | Sora 800, 15px | `translateY(-2px)` |
| **Secundário** (`.plan-btn-secondary`, `.btn-back`, `.btn-restart`) | `transparent` + borda | `--blue` / `--sub` | 10px | Sora/Jakarta 600–800 | borda → `--blue` |

\* `.btn-whatsapp` é o botão **"Continuar"** do resultado (navegação interna) → por isso é **azul**,
não verde. Verde só no `.plan-btn-primary` (que abre o wa.me).

- **Regra do verde:** fundo verde = **só** botão que abre WhatsApp. Navegação = azul.
- **Touch target:** paddings garantem ≥44px de altura (ex.: `14–20px` vertical). Manter ≥44px.
- Sombras de botão usam tint cyan **`--blue2` (`rgba(45,158,201,…)`) unificado** em base (`.22–.28`)
  e hover (`.4–.45`). *(O ring de foco do input usa `rgba(91,196,240,.15)` — é foco, não sombra.)*

---

## 7. Breakpoints e responsividade

- **`max-width: 768px`** — mobile/tablet: grids viram 1 coluna (`.plans-grid`, `.plans-features`,
  `.plans-steps`), botões full-width, ajustes de fonte.
- **`max-width: 480px`** — mobile pequeno: reduz padding de cards (`28px 22px`), `result-paths`
  vira 1 coluna.
- **`@media (hover: hover)`** — efeitos de hover **só** em ponteiro fino (desktop); nada no touch.
- **Larguras de container:** diagnóstico `main` = **640px**; planos `.plans-page`/`.plans-top-inner`
  = **1000px**. Gutter lateral = **24px**. `body { overflow-x: hidden }` (sem scroll horizontal).
- **Mobile-first**, touch targets **≥44px**.

---

## 8. Animação e movimento

- **Reveal no scroll (planos):** classe `.reveal` / `.reveal-group` + IntersectionObserver; CSS
  `@keyframes revealUp { from{opacity:0; translateY(20px)} to{opacity:1} }`, duração **0.6s**,
  easing **`cubic-bezier(0.16, 1, 0.3, 1)`** (ease-out "premium"). Stagger por
  `animation-delay` em **+0.09s** (0 / .09 / .18 / .27).
- **Entrada de telas (diagnóstico):** `@keyframes fadeUp` (translateY 18px), **0.35s–0.5s ease**.
- **Score ring:** transição `stroke-dashoffset` **1.2s** `cubic-bezier(0.16,1,0.3,1)`; número
  conta via `requestAnimationFrame` (~1.2s, easeOutCubic).
- **Progress bar:** `width` **0.5s** `cubic-bezier(0.4,0,0.2,1)`.
- **Hover:** `transform/box-shadow` **0.15s–0.25s ease**; lift `translateY(-2px a -5px)`.
- **Orbs da hero (planos):** float vertical muito lento (`@keyframes heroFloat`, **18–22s** ease-in-out
  infinite, ±14px), **gated** por `@media (prefers-reduced-motion: no-preference)` → estático se reduzido.
- **Easings padrão:** premium/entrada = `cubic-bezier(0.16,1,0.3,1)`; UI/progress = `cubic-bezier(0.4,0,0.2,1)`.
- **Movimento = aceno gentil, não fogos.** Sutil, rápido, com propósito.
- **`prefers-reduced-motion` (obrigatório):**
  - Reveal: todo o estado oculto fica sob `@media (prefers-reduced-motion: no-preference)` →
    quem reduz movimento vê tudo **visível, sem deslize** (fallback de opacidade/visibilidade).
  - Score ring: `@media (prefers-reduced-motion: reduce){ .score-ring-fill{ transition:none } }` +
    o JS aplica o valor final direto.
  - **Nunca** deixar conteúdo invisível dependendo de animação desligada.

---

## 9. Princípios e regras

- **Premium-claro:** fundo `--bg`, cards `--card` brancos com `--shadow-*`, azul de marca como
  destaque. Profundidade por sombra suave, não por borda pesada.
- **Anti "cara de IA / template":** sem emojis decorativos (usar **SVG monocromático** na cor da
  marca); sem 3 cards idênticos sem hierarquia; sem gradiente roxo/glassmorphism/sombra exagerada.
  Cada elemento deve parecer intencional.
- **Legibilidade vence elegância** (ver §3).
- **Animação sutil** + `prefers-reduced-motion` sempre (ver §8).
- **Mobile-first**, touch ≥44px, sem scroll horizontal.
- **Processo:** mudanças cirúrgicas; não tocar em lógica de score/recomendação/Supabase/serverless
  sem necessidade; mudança mobile em media query.

---

## 10. Checklist rápido (toda mudança visual)
- [ ] Reusei tokens/valores existentes (cor em hex do `:root`, raio/sombra/spacing da escala)?
- [ ] Contraste **AA** em todo texto novo? Nada de cinza-claro fino?
- [ ] Hierarquia título > subtítulo > corpo > eyebrow visível?
- [ ] Verde só em botão de WhatsApp? Azul na navegação?
- [ ] Ícones em SVG monocromático (sem emoji decorativo)?
- [ ] Animação sutil + fallback de `prefers-reduced-motion`?
- [ ] Responsivo 320–430px e desktop, sem scroll horizontal? Touch ≥44px?
- [ ] Mudança cirúrgica (não mexi em lógica de diagnóstico/score/recomendação/Supabase)?
- [ ] Botões de WhatsApp com destino/mensagem intactos?

---

## 11. Padronização (status)

**✅ Resolvidas** (aplicadas no código — viraram regra no corpo deste doc):
- **#1 Raio de card pequeno = 14px** (firmado no §5; `.step-item` ajustado de 16px → 14px). Botões:
  CTAs primários 12px / compactos 10px (§6).
- **#3 Texto secundário escuro global** (§2/§3): `--body #2F4356` e `--sub #455769` agora no `:root`
  do `main.css` (override da planos removido); corpo/descrições em **peso 500** nas duas páginas.
- **#5 `--shadow-lg`** criado no `:root` e referenciado em `.plan-card:hover` (§2/§5).
- **#6 Tint da sombra dos botões** unificado em `--blue2` (`45,158,201`), base e hover (§6).
- **#7 `--blue3` removido** do `:root` (zero referências no projeto).

**📌 Regras vivas (permanentes):**
- **#4 Nomes de token são legado do tema escuro** — `--white` = navy (texto escuro primário),
  `--blue` = azul profundo, `--blue-soft` = o cyan. Há um aviso no topo do `:root`. **Não renomear**
  (risco alto); todo dev deve saber que **o valor manda, não o nome**.
- **#2 Escala de espaçamento = base-4.** O CSS atual tem alguns valores fora de 8 (9, 14, 18, 26,
  52) que **não** serão refatorados (risco alto/ganho baixo). Ao criar **qualquer** espaçamento
  novo, preferir **8 / 12 / 16 / 24 / 32 / 40 / 48**.
