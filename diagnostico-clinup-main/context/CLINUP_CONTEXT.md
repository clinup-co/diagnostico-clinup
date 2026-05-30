# CLINUP — Contexto Completo do Projeto

> Documento de referência da CLINUP. Use este arquivo para retomar trabalhos no projeto sem perder histórico, decisões e padrões já estabelecidos.

---

## 1. O QUE É A CLINUP

CLINUP é uma estrutura digital-comercial para clínicas de estética, odontologia e saúde. Não é agência de tráfego nem social media. Posiciona-se como **facilitadora**: rápido, eficaz, sem enrolação.

**Frase de posicionamento oficial:**
> "A CLINUP não é agência de tráfego nem social media. Trabalhamos como facilitadores: rápido, eficaz, sem enrolação."

**O que entrega:**
- Site profissional da clínica com botão direto pro WhatsApp
- Revisão da apresentação digital da clínica
- Plataforma própria de automação e organização do WhatsApp
- Vídeos profissionais no estilo publicidade

**O que NÃO faz:**
- Gestão de tráfego pago
- Social media / criação de posts no Instagram
- Captação ativa de pacientes (a CLINUP melhora a conversão de quem já chega, não traz tráfego)

---

## 2. SITUAÇÃO ATUAL DO NEGÓCIO

- Empresa em fase de lançamento, sem cases ou depoimentos reais
- MEI registrado (Roberto Carlos Braga)
- Sem capital de giro — precisa fechar primeiro cliente com urgência
- Site, diagnóstico e fluxo comercial estruturados
- Próximo passo: prospecção ativa via EvoluaProspect

**Regras de honestidade comercial:**
- NÃO inventar cases ou depoimentos
- Quando perguntarem por referências: "Estamos em fase de lançamento e justamente por isso estou selecionando algumas clínicas pra trabalhar de perto."
- NÃO prometer pacientes, faturamento ou agenda cheia
- Reembolso garantido se não fizer sentido após a entrega + 1 rodada de ajuste

---

## 3. PLANOS E PRICING

| Plano | Valor | Para quem | O que inclui |
|-------|-------|-----------|--------------|
| **Essencial** | R$ 297/mês | Clínica que precisa de presença profissional | Página profissional da clínica com botão direto pro WhatsApp, visual adaptado pra celular, apresentação clara dos serviços, 1 rodada de ajuste |
| **Profissional** | R$ 997/mês | Clínica que quer atender e converter melhor | Tudo do Essencial + revisão geral do perfil + plataforma de automação do WhatsApp (7 dias grátis, depois R$59,90/mês à parte) + 2 vídeos profissionais de publicidade por mês + 1 rodada de ajuste |
| **Escala** | Sob consulta | Clínica com necessidades específicas | Tudo do Profissional + estratégia avançada + integrações específicas + acompanhamento premium |

**Pagamento:** mensalidade recorrente, sem fidelidade obrigatória.

**Links de pagamento Asaas:**
- Essencial: `https://www.asaas.com/c/x0bqc2huenmx8mry`
- Profissional: `https://www.asaas.com/c/dggnwji3t0vj07aw`
- Escala: via WhatsApp (atendimento humano)

**Observação Asaas:** verificar se o nome de exibição está correto (deve mostrar CLINUP MKT e não o CPF/nome pessoal).

---

## 4. FLUXO COMERCIAL

```
EvoluaProspect dispara mensagem de abordagem
    ↓
Cliente responde → Roberto atende manualmente
    ↓
Confirma a dor (texto)
    ↓
Envia infográfico (1-infografico.jpg)
    ↓
Envia link do diagnóstico
    ↓
Analisa resultado (bom / mediano / crítico)
    ↓
Mostra prévia do site (modelo)
    ↓
Mostra prévia da plataforma de automação
    ↓
Explica vídeos
    ↓
Apresenta os 2 planos principais (Essencial e Profissional)
    ↓
Garantia e fechamento → link de pagamento
```

**Mensagem de abordagem (disparada pela EvoluaProspect):**
> "Oi, tudo bem? Pergunta rápida: vocês também passam por isso de chegar gente no WhatsApp, perguntar valor, conversar um pouco e sumir sem marcar?"

---

## 5. INFRAESTRUTURA TÉCNICA

### Diagnóstico CLINUP (próprio)
- **URL atual:** `https://diagnostico-clinup-lac.vercel.app`
- **Stack:** HTML/CSS/JS puro, sem framework, sem build step
- **Hospedagem:** Vercel (migrado da Netlify após estouro de limite)
- **Backend:** Supabase (salva leads, scoring, resultado)
- **Serverless function:** `api/lead-sync.js` (formato Vercel)
- **Estrutura do projeto:**
  ```
  /
  ├── index.html          (diagnóstico)
  ├── planos.html         (LP de planos pós-diagnóstico)
  ├── vercel.json         (config Vercel + rewrite /planos)
  ├── api/
  │   └── lead-sync.js    (sync com Supabase)
  ├── assets/
  │   ├── css/main.css
  │   ├── js/  (config, utils, api, state, form, quiz, results, main)
  │   └── images/ (logo.png, fundo-top-para-site-da-clinup.jpeg)
  └── netlify/            (mantido como backup, inativo)
  ```
- **Variáveis de ambiente (Vercel):** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

### Site CLINUP MKT (feito pelo freelancer)
- **URL:** `https://clinupmkt.com.br`
- **Stack:** PHP MVC + painel admin
- **Status:** sub-utilizado. Painel admin com bugs. Não é fonte principal do fluxo comercial.
- **Decisão:** o fluxo principal usa o diagnóstico na Vercel, não esse site

### WhatsApp comercial
- **Número:** `5511951438583`
- **Conta:** WhatsApp Business
- **Bio aprovada:** "Estrutura digital-comercial pra clínicas. Site, WhatsApp organizado, automação e vídeos no estilo publicidade. Pra clínica atrair mais, converter melhor e parecer mais profissional."

---

## 6. LP DE PLANOS — ESTRUTURA E COPY ATUAL

Página `/planos` (apenas no projeto do diagnóstico na Vercel).

### Headline dinâmica (por resultado do diagnóstico)
- **BOM:** "[Nome], sua clínica já tem uma boa base. A CLINUP refina a apresentação e o atendimento pra você converter mais."
- **MEDIANO:** "[Nome], sua clínica atrai interesse, mas perde paciente no atendimento. A CLINUP organiza o WhatsApp, melhora a apresentação e ajuda a fechar mais."
- **CRÍTICO:** "[Nome], sua clínica tem potencial, mas falta organização. A CLINUP cuida da apresentação, do WhatsApp e do atendimento pra você fechar mais."

### Seção "Como a CLINUP ajuda sua clínica" (4 cards)
1. 🌐 **Presença profissional online** — Site da clínica que transmite confiança e leva o paciente direto pro WhatsApp
2. 💬 **WhatsApp organizado e automatizado** — Atendimento revisado e plataforma que responde rápido pra nenhum interessado se perder
3. 🎬 **Vídeos prontos pra postar** — 2 vídeos profissionais por mês no estilo publicidade, sem precisar improvisar conteúdo
4. ⚡ **Perfil revisado pra converter** — Revisão geral da apresentação da clínica pra passar mais confiança no primeiro contato

### Linha de diferenciação (entre features e planos)
> "A CLINUP não é agência de tráfego nem social media. Trabalhamos como facilitadores: rápido, eficaz, sem enrolação."

### Badge "Mais escolhido" (dinâmico por resultado)
- BOM → Essencial
- MEDIANO → Profissional
- CRÍTICO → Profissional

### Botões dos planos
Cada botão abre o WhatsApp com mensagem pré-preenchida:
- **Essencial:** "Olá, fiz o diagnóstico da CLINUP e escolho o Plano Essencial (R$297/mês)."
- **Profissional:** "Olá, fiz o diagnóstico da CLINUP e escolho o Plano Profissional (R$997/mês)."
- **Escala:** "Olá, fiz o diagnóstico da CLINUP e quero saber mais sobre o Plano Escala."

### Garantia
> "Entrega no prazo combinado, com prévia antes da publicação e 1 rodada de ajuste incluída. Se não fizer sentido, devolvemos o valor."

### Fechamento
> "Pronto pra começar? Escolha um plano acima."

---

## 7. RESULTADO DO DIAGNÓSTICO — ESTRUTURA ATUAL

3 cenários: BOM, MEDIANO, CRÍTICO.

### Título personalizado
Formato: `[Primeiro nome], [continuação do título em minúscula].`
Fallback: se o nome não estiver disponível, mostrar título sem nome.

### Componentes da tela
- Badge ("⚠️ Estrutura com pontos soltos" etc.)
- Headline + subtítulo descritivo
- Cards de insights/findings (sinais identificados na clínica)
- Bloco "Próximo passo"
  - Eyebrow: "PRÓXIMO PASSO"
  - Título: "Veja como resolver isso na prática"
  - Descrição: "A CLINUP organiza a presença, o WhatsApp e o atendimento da sua clínica. Veja os planos e escolha por onde começar."
  - Botão "Continuar" (azul-ciano, NÃO verde — verde é exclusivo de botões que abrem WhatsApp)
  - Botão "Refazer o diagnóstico"

### Lógica de cores nos botões (regra do sistema)
- **Verde:** abre WhatsApp
- **Azul-ciano (cor da marca):** navegação interna

---

## 8. TOM, LINGUAGEM E ESTILO

### Tom de voz
- Humano, direto, brasileiro
- Mensagens curtas, sem marketingês
- Sem CAPS LOCK, sem emojis em excesso
- Linguagem de clínica, NÃO de SaaS / corporativo

### Palavras a EVITAR
- "Empresa" → usar "clínica"
- "Operação" → usar "clínica" ou descrever especificamente
- "Escalar", "alavancar", "performance", "previsibilidade", "mensuração"
- "Lotar agenda", "agenda cheia"
- "Quero escalar minha operação"
- "Diagnósticos inteligentes"
- "Classificação comercial: quente"

### Palavras a USAR
- "Facilitadores"
- "Rápido, eficaz, sem enrolação"
- "Caminho até o agendamento"
- "Sem improviso"
- "Estrutura digital-comercial"

### Regras de honestidade
- Nunca inventar cases, depoimentos ou autoridade
- Nunca prometer resultados financeiros ou volume de pacientes
- Sempre dizer "estamos em lançamento" quando perguntarem por referências

---

## 9. MATERIAIS DE VENDAS

### Documentos no Outputs
- `CLINUP-guia-atendimento.md` — guia passo a passo de atendimento no WhatsApp
- `CLINUP-plano-7-dias.md` — plano operacional dia a dia
- `clinup-infografico.html` — infográfico "Por que o paciente some?" (post quadrado 1080x1080)

### Materiais a ter no celular para o atendimento
- 1-infografico.jpg (já feito)
- 2-site-modelo-X.jpg (prints de modelos de site — precisa criar)
- 3-plataforma.mp4 (vídeo da plataforma de automação — precisa gravar)
- Guia de atendimento (.md)
- Link do diagnóstico: `https://diagnostico-clinup-lac.vercel.app`

### Ordem dos materiais no atendimento WhatsApp
1. Mensagem de abordagem (IA dispara)
2. Confirma a dor (texto)
3. Infográfico
4. Link do diagnóstico
5. Análise do resultado (texto)
6. Print do modelo de site
7. Vídeo da plataforma
8. Explicação dos vídeos
9. Planos e preço
10. Garantia e fechamento

---

## 10. OBJEÇÕES E RESPOSTAS PADRÃO

| Objeção | Resposta |
|---------|----------|
| "quanto custa?" | Qualifica antes ("vocês hoje têm site ou só redes sociais?"), depois apresenta os 2 planos principais |
| "achei caro" | "O Essencial a R$297 já resolve a parte da presença. O Profissional resolve o conjunto inteiro." |
| "já tenho agência" | "Não é concorrência. Agência cuida de tráfego e post. A CLINUP cuida do caminho até o agendamento. Funciona junto." |
| "já tenho site" | "A página é só uma parte. O que trava é o que vem depois: como a pessoa chega no WhatsApp e como a conversa conduz." |
| "é mensal?" | "Sim, mensalidade. Sem fidelidade obrigatória." |
| "vocês fazem tráfego?" | "Gestão de anúncio não tá inclusa. A CLINUP cuida da estrutura." |
| "os vídeos são tipo Canva?" | "Não. São vídeos estilo publicidade/propaganda, no formato de anúncio." |
| "têm cases?" | "Estamos em lançamento e justamente por isso estou selecionando algumas clínicas pra trabalhar de perto." |
| "vou pensar" | "Sem pressa. Quando você diz vou pensar, é mais sobre valor, momento da clínica ou entender melhor como funciona?" |
| "não tenho interesse" | "Tranquilo, obrigado pela resposta direta. Boa semana." (encerrar, não insistir) |

---

## 11. DECISÕES IMPORTANTES JÁ TOMADAS

- **NÃO usar IA de atendimento automática da EvoluaProspect.** A IA dispara apenas a mensagem de abordagem. O resto é atendimento manual.
- **Site clinupmkt.com.br ficou em segundo plano.** Fluxo principal usa o diagnóstico na Vercel.
- **Migração Netlify → Vercel feita com sucesso.** Variáveis de ambiente cadastradas, Supabase funcionando.
- **Não criar depoimentos falsos.** Mesmo em fase de lançamento.
- **Não usar prints de sites de terceiros como prova social.** Risco legal e estratégico.
- **Verde nos botões = só WhatsApp.** Azul-ciano = navegação interna.
- **Personalização com primeiro nome** já implementada no resultado do diagnóstico.

---

## 12. PRÓXIMOS PASSOS DEFINIDOS

### Imediato (esta semana)
1. Disparar prospecção via EvoluaProspect (30 clínicas como teste inicial)
2. Atender manualmente todas as respostas
3. Documentar o que aprende em cada conversa
4. Fechar o primeiro cliente

### Curto prazo
1. Criar 2-3 prints reais de modelos de site para mostrar no atendimento
2. Gravar vídeo curto da plataforma de automação
3. Após primeiro cliente: capturar prints de antes/depois do WhatsApp organizado
4. Pedir primeiro depoimento real (em texto ou vídeo)

### Médio prazo (após cases reais)
1. Adicionar seção de prova social na LP (com cases verdadeiros)
2. Considerar "Modelos de site que entregamos" como portfólio de demonstração
3. Revisar dinamismo / micro-interações do site (última prioridade)

---

## 13. PADRÕES TÉCNICOS DO PROJETO

### Regras gerais para qualquer alteração
- Alterações sempre CIRÚRGICAS, nunca refatorações
- Não tocar em lógica do diagnóstico, scoring, Supabase ou serverless function sem necessidade explícita
- Não alterar textos/copy sem aprovação
- Toda mudança visual mobile deve estar em media query, sem afetar desktop
- Verde só em botões que abrem WhatsApp
- Tipografia: usar `clamp()` para escalas fluidas
- Touch targets mínimos: 44px

### Stack confirmado
- HTML/CSS/JS puro (sem framework, sem build)
- Hospedagem: Vercel
- Backend: Supabase (via serverless function `/api/lead-sync`)
- Domínio do diagnóstico: `diagnostico-clinup-lac.vercel.app`
- Domínio do site institucional: `clinupmkt.com.br`

---

*Última atualização: maio/2026*
