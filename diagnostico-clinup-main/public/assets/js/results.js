// ─────────────────────────────────────────────
// RESULTADOS — renderização e lógica de scoring
// ─────────────────────────────────────────────
function showResult() {
  if (answers[5] === undefined && answers['5'] === undefined) return;
  document.querySelectorAll('.question-screen').forEach(q => q.classList.remove('active'));
  document.getElementById('progressWrap').style.display = 'none';

  const model  = buildPresentationModel();
  const result = document.getElementById('result');
  result.classList.add('show');
  window.scrollTo({top: 0, behavior: 'smooth'});

  quizLeadData.resultado     = model.level;
  quizLeadData.quizConcluido = true;
  quizLeadData.etapaAtual    = 'resultado';
  persistState();
  saveLeadToSupabase();

  const insightsHTML = model.insights.map(i => `
    <div class="finding">
      <div class="finding-icon ${i.type}">${i.icon}</div>
      <div class="finding-body">
        <div class="finding-title">${i.title}</div>
        <div class="finding-desc">${i.desc}</div>
      </div>
    </div>
  `).join('');

  result.innerHTML = `
    <div class="score-card ${model.level}">
      ${model.badge}
      <h2 class="result-title">${model.title}</h2>
      <p class="result-sub">${model.subtitle}</p>
      <p class="result-thesis">${model.thesis}</p>
    </div>
    <p class="section-label">${model.sectionLabel}</p>
    <div class="findings">${insightsHTML}</div>
    <p class="section-label">Daqui, são dois caminhos</p>
    <div class="result-paths">
      <div class="result-path">
        <div class="result-path-title">Continuar como está</div>
        <div class="result-path-desc">Seguir perdendo parte dos interessados no meio do caminho, na base da tentativa e erro.</div>
      </div>
      <div class="result-path result-path--accent">
        <div class="result-path-title">Organizar a estrutura</div>
        <div class="result-path-desc">Presença, WhatsApp e atendimento conectados, pra transformar mais interesse em agendamento.</div>
      </div>
    </div>
    <div class="cta-section">
      <div class="cta-eyebrow">Próximo passo</div>
      <h3 class="cta-title">${model.ctaTitle}</h3>
      <p class="cta-desc">${model.ctaDesc}</p>
      <a class="btn-whatsapp"
         href="/planos?resultado=${ {'good':'bom','moderate':'mediano','critical':'critico'}[model.level] || 'mediano' }">
        Continuar
      </a>
      <button class="btn-restart" onclick="restartQuiz()">↩ Refazer o diagnóstico</button>
    </div>
  `;
}

function onWhatsappClick() {
  quizLeadData.whatsappClicado = true;
  persistState();
  updateWhatsappClicked();
}

function buildWhatsAppMessage(level, insights) {
  const label = {
    good:     'Boa estrutura',
    moderate: 'Estrutura com pontos soltos',
    critical: 'Gargalos ativos'
  }[level] || level;

  const gargalos = insights.filter(i => i.severity !== 'strength');
  const pontos   = gargalos.length > 0 ? gargalos.slice(0, 4) : insights.slice(0, 3);
  const bullets  = pontos.map(i => `- ${i.title}`).join('\n');

  return encodeURIComponent([
    'Olá, fiz o diagnóstico da CLINUP e quero entender meus resultados.',
    '',
    `Resultado: ${label}`,
    '',
    'Principais pontos:',
    bullets,
    '',
    'Quero entender o que vocês recomendam para minha clínica.'
  ].join('\n'));
}

function personalizeTitle(title) {
  const fullName = (quizLeadData.nome || '').trim();
  if (!fullName) return title;
  const firstRaw = fullName.split(/\s+/)[0];
  if (!firstRaw) return title;
  const first = firstRaw.charAt(0).toUpperCase() + firstRaw.slice(1).toLowerCase();
  return first + ', ' + title.charAt(0).toLowerCase() + title.slice(1);
}

function buildPresentationModel() {
  const a     = answers;
  const total = getTotal();

  const pillars = {
    previsibilidade: a[2],
    apresentacao:    a[1],
    conversao:       a[3],
    prontidao:       a[4]
  };

  let level;
  if (total <= 3)      level = 'good';
  else if (total <= 7) level = 'moderate';
  else                 level = 'critical';

  if (level === 'critical' && pillars.apresentacao === 0 && pillars.conversao === 0 && pillars.prontidao === 0) {
    level = 'moderate';
  }
  const criticalCount = Object.values(pillars).filter(v => v >= 2).length;
  if (level === 'good' && criticalCount >= 2) {
    level = 'moderate';
  }

  let badge, title, subtitle, ctaTitle, ctaDesc, ctaLabel, sectionLabel;
  if (level === 'good') {
    badge        = '<div class="result-badge good">✅ Boa estrutura</div>';
    title        = 'Sua clínica já tem uma boa base. O próximo passo é ajustar os pontos finos.';
    subtitle     = 'A clínica já aparece, recebe interessados e consegue converter parte deles. Agora o foco é identificar onde pequenos ajustes podem aumentar a consistência.';
    ctaTitle     = 'Veja como resolver isso na prática';
    ctaDesc      = 'A CLINUP organiza a presença, o WhatsApp e o atendimento da sua clínica. Veja os planos e escolha por onde começar.';
    ctaLabel     = 'Quero ver onde otimizar';
    sectionLabel = 'O que encontramos — e onde otimizar';
  } else if (level === 'moderate') {
    badge        = '<div class="result-badge moderate">⚠️ Estrutura com pontos soltos</div>';
    title        = 'Sua clínica atrai interesse. Mas perde pacientes no meio do caminho.';
    subtitle     = 'Tem movimento, mas a estrutura não está conectada do começo ao fim. Isso faz a clínica perder oportunidades mesmo quando o interesse existe.';
    ctaTitle     = 'Veja como resolver isso na prática';
    ctaDesc      = 'A CLINUP organiza a presença, o WhatsApp e o atendimento da sua clínica. Veja os planos e escolha por onde começar.';
    ctaLabel     = 'Quero ver onde estou perdendo';
    sectionLabel = 'O que encontramos na sua clínica';
  } else {
    badge        = '<div class="result-badge critical">🚨 Gargalos ativos</div>';
    title        = 'Há mais de um gargalo travando sua clínica ao mesmo tempo.';
    subtitle     = 'Quando presença, atração e WhatsApp falham juntos, o impacto se acumula e a clínica perde mais oportunidades no caminho. Cada ponto tem solução — e a ordem de correção importa.';
    ctaTitle     = 'Veja como resolver isso na prática';
    ctaDesc      = 'A CLINUP organiza a presença, o WhatsApp e o atendimento da sua clínica. Veja os planos e escolha por onde começar.';
    ctaLabel     = 'Quero entender por onde começar';
    sectionLabel = 'Gargalos identificados no diagnóstico';
  }

  const insights = selectInsights(level);
  title = personalizeTitle(title);
  return {
    level, badge, title, subtitle,
    thesis:          buildThesis(),
    insights,
    ctaTitle, ctaDesc, ctaLabel, sectionLabel,
    whatsappPrefill: buildWhatsAppMessage(level, insights)
  };
}

function buildThesis() {
  const a            = answers;
  const goodSite     = a[1] === 0;
  const weakSite     = a[1] >= 2;
  const multiChannel = a[2] === 0;
  const onlyRef      = a[2] === 2;
  const goodConv     = a[3] === 0;
  const badConv      = a[3] === 2;

  if (goodSite && goodConv && multiChannel)
    return 'A estrutura digital da clínica está bem alinhada: presença, atração e conversão funcionam juntos. O próximo passo é escalar de forma mais controlada.';
  if (goodSite && goodConv && (onlyRef || a[2] === 1))
    return 'A conversão funciona bem. O ponto de atenção está na atração: depender de um canal único torna o fluxo de novos pacientes mais vulnerável a variações.';
  if (goodSite && badConv && multiChannel)
    return 'A clínica atrai bem por vários canais, mas parte desse interesse se perde entre o primeiro contato e o agendamento. O WhatsApp é o ponto crítico.';
  if (goodSite && badConv)
    return 'A clínica é encontrada, mas perde força na etapa de conversão. O problema não está em atrair — está em transformar esse interesse em agenda.';
  if (goodSite && a[3] === 1 && multiChannel)
    return 'A atração funciona por vários canais. O próximo passo é fortalecer a etapa de conversão para que mais desse interesse chegue ao agendamento.';
  if (goodSite && a[3] === 1)
    return 'A base digital está no lugar, mas atração e conversão ainda têm espaço de melhoria. São os dois pontos com maior impacto direto no volume de pacientes.';
  if (weakSite && goodConv)
    return 'A conversão responde bem quando alguém chega — o gargalo está antes disso, na visibilidade e na atração de novos interessados.';
  if (weakSite && badConv)
    return 'O diagnóstico aponta dois pontos críticos ao mesmo tempo: a presença digital e a conversão. Quando os dois estão fracos, o impacto no volume de pacientes é ampliado.';
  return 'O diagnóstico aponta pontos específicos na estrutura digital. Cada um, ajustado, tende a melhorar a forma como a clínica atrai, atende e converte novos pacientes.';
}

function selectInsights(level) {
  const a    = answers;
  const pool = [];

  // Q1 — Presença digital
  if (a[1] === 3) {
    if (level === 'moderate')
      pool.push({icon:'🌐', type:'orange', severity:'warning',
        title:'Sem presença digital',
        desc:'Quem pesquisa a clínica no Google não encontra nada que transmita confiança. O paciente some antes de entrar em contato.'});
    else
      pool.push({icon:'🌐', type:'red',    severity:'warning',
        title:'Sem presença digital',
        desc:'Quem pesquisa a clínica no Google não encontra nada que transmita confiança. O paciente some antes de entrar em contato.'});
  } else if (a[1] === 2)
    pool.push({icon:'🌐', type:'orange', severity:'warning',
      title:'Presença digital fraca',
      desc:'Site desatualizado ou mal estruturado passa impressão de descuido. Em alguns casos prejudica mais do que ajuda.'});
  else
    pool.push({icon:'🌐', type:'blue',   severity:'strength',
      title:'Presença digital ativa',
      desc:'A base está funcional. O próximo passo é garantir que ela esteja gerando movimento real — não só existindo.'});

  // Q2 — Atração de interessados
  if (a[2] === 2)
    pool.push({icon:'📣', type:'orange', severity:'warning',
      title:'Depende de indicação',
      desc:'Indicação é sinal de qualidade — mas não é previsível. Quando para de chegar, o fluxo de novos pacientes para junto.'});
  else if (a[2] === 1)
    pool.push({icon:'📣', type:'orange', severity:'opportunity',
      title:'Canal único de atração',
      desc:'Crescer com um canal funciona até certo ponto. Um canal só torna o fluxo de pacientes vulnerável a variações que você não controla.'});
  else
    pool.push({icon:'📣', type:'blue',   severity:'strength',
      title:'Múltiplos canais ativos',
      desc:'Boa diversificação. O próximo passo é qualificar o que chega por cada canal e garantir que esteja convertendo.'});

  // Q3 — Conversão no WhatsApp
  if (a[3] === 2) {
    if (level === 'moderate')
      pool.push({icon:'💬', type:'orange', severity:'warning',
        title:'Alto abandono no WhatsApp',
        desc:'O WhatsApp é onde o paciente decide. Perder contato ali muitas vezes é falta de estrutura — não de interesse.'});
    else
      pool.push({icon:'💬', type:'red',    severity:'warning',
        title:'Alto abandono no WhatsApp',
        desc:'O WhatsApp é onde o paciente decide. Perder contato ali muitas vezes é falta de estrutura — não de interesse.'});
  } else if (a[3] === 1)
    pool.push({icon:'💬', type:'orange', severity:'opportunity',
      title:'Conversão abaixo do potencial',
      desc:'Metade fechando significa metade vazando. Com a estrutura certa no atendimento, essa taxa sobe sem aumentar volume.'});
  else
    pool.push({icon:'💬', type:'blue',   severity:'strength',
      title:'Boa conversão no WhatsApp',
      desc:'Quem chega, fecha. O foco agora é aumentar o volume de interessados qualificados que chegam até esse ponto.'});

  // Q4 — Prontidão (level-aware)
  if (level === 'good') {
    if (a[4] === 0)
      pool.push({icon:'⚡', type:'blue',   severity:'opportunity',
        title:'Estrutura pronta para evoluir',
        desc:'A clínica está operacionalmente preparada. Uma análise fina identifica os pontos exatos onde otimizar para crescer com mais controle.'});
    else if (a[4] === 1)
      pool.push({icon:'📅', type:'blue',   severity:'opportunity',
        title:'Bom momento para uma análise fina',
        desc:'Com a base bem posicionada, o próximo passo é mapear os pontos de otimização e implementá-los com planejamento.'});
    else
      pool.push({icon:'🔍', type:'blue',   severity:'opportunity',
        title:'Hora certa de mapear o próximo nível',
        desc:'Avaliar antes de agir é a postura certa quando a base já está estabelecida. Uma análise estruturada mostra o que realmente vale priorizar.'});
  } else if (level === 'critical') {
    if (a[4] === 0)
      pool.push({icon:'⚡', type:'blue',   severity:'opportunity',
        title:'Urgência reconhecida — definir a ordem é o próximo passo',
        desc:'Reconhecer a necessidade de agir é o ponto de partida. O diagnóstico já identificou os gargalos — falta definir por qual começar.'});
    else if (a[4] === 1)
      pool.push({icon:'📅', type:'orange', severity:'opportunity',
        title:'Prazo definido — gargalos seguem ativos',
        desc:'Ter um prazo para agir é melhor do que não ter. Cada etapa corrigida libera parte do potencial da clínica.'});
    else
      pool.push({icon:'🔍', type:'orange', severity:'opportunity',
        title:'Por onde começar — essa é a pergunta certa',
        desc:'Entender a ordem de correção faz toda a diferença quando há vários gargalos ativos. O diagnóstico deu a leitura — falta transformar isso em plano.'});
  } else {
    if (a[4] === 0)
      pool.push({icon:'⚡', type:'blue',   severity:'opportunity',
        title:'Momento favorável para organizar',
        desc:'Estar pronto para agir é uma vantagem. Com os pontos identificados, agir agora reduz o tempo em que a estrutura opera abaixo do potencial.'});
    else if (a[4] === 1)
      pool.push({icon:'📅', type:'orange', severity:'opportunity',
        title:'Janela de melhoria disponível',
        desc:'Ter um prazo definido é melhor do que não ter. Enquanto os pontos desconectados seguem ativos, a estrutura opera abaixo do potencial.'});
    else
      pool.push({icon:'🔍', type:'orange', severity:'opportunity',
        title:'Avaliação em andamento — próximo passo recomendado',
        desc:'Entender o cenário antes de agir faz sentido. Com pontos da estrutura desconectados, mapear as prioridades ajuda a decidir por onde começar.'});
  }

  // Q5 — Faturamento
  if (a[5] === 3)
    pool.push({icon:'💡', type:'orange', severity:'opportunity',
      title:'Fase inicial — alto potencial',
      desc:'Clínicas nessa faixa têm o maior espaço de crescimento. Estruturar a captação agora acelera muito o que vem pela frente.'});
  else if (a[5] === 2)
    pool.push({icon:'📊', type:'blue',   severity:'strength',
      title:'Crescimento em andamento',
      desc:'A clínica está crescendo. Com captação mais estruturada, essa curva tende a acelerar de forma mais previsível.'});
  else if (a[5] === 1)
    pool.push({icon:'🚀', type:'blue',   severity:'strength',
      title:'Faturamento consolidado',
      desc:'A demanda existe e a entrega funciona. O próximo nível é ter um sistema de captação que não dependa de variáveis externas.'});
  else if ((quizLeadData.respostas || {}).faturamento_mensal !== 'Prefiro não informar')
    pool.push({icon:'🏆', type:'blue',   severity:'strength',
      title:'Clínica estabelecida',
      desc:'Alto volume mostra que o serviço tem tração. O desafio agora é manter o crescimento com estrutura — não só com esforço.'});

  const warnings      = pool.filter(i => i.severity === 'warning');
  const strengths     = pool.filter(i => i.severity === 'strength');
  const opportunities = pool.filter(i => i.severity === 'opportunity');

  if (level === 'critical')
    return [...warnings.slice(0, 3), ...opportunities.slice(0, 1), ...strengths.slice(0, 1)];
  if (level === 'moderate')
    return [...warnings.slice(0, 2), ...opportunities.slice(0, 1), ...strengths.slice(0, 2)];
  return [...strengths.slice(0, 3), ...opportunities.slice(0, 2)];
}

function restartQuiz() {
  Object.keys(answers).forEach(k => delete answers[k]);
  Object.assign(quizLeadData, {
    respostas: {}, resultado: '', etapaAtual: 'formulario',
    quizConcluido: false, whatsappClicado: false
  });
  _leadSaved = false;
  localStorage.removeItem('clinup_lead');
  localStorage.removeItem('clinup_answers');
  localStorage.removeItem('clinup_version');
  document.querySelectorAll('.opt').forEach(o => { o.classList.remove('selected'); o.dataset.selected = 'false'; });
  document.querySelectorAll('.btn-next').forEach(b => b.classList.remove('enabled'));
  document.getElementById('result').classList.remove('show');
  document.getElementById('result').innerHTML = '';
  document.getElementById('progressWrap').style.display = '';
  document.getElementById('progressWrap').classList.add('show');
  showQuestion(1);
}
