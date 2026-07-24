// ─────────────────────────────────────────────
// RESULTADOS — renderização e lógica de scoring
// ─────────────────────────────────────────────
function showResult() {
  if (Object.keys(answers).length < TOTAL_PERGUNTAS) return;
  document.querySelectorAll('.question-screen').forEach(q => q.classList.remove('active'));
  document.getElementById('progressWrap').style.display = 'none';
  const resumeNote = document.getElementById('resumeNote');
  if (resumeNote) resumeNote.remove();

  const model  = buildPresentationModel();
  const result = document.getElementById('result');
  result.classList.add('show');
  window.scrollTo({top: 0, behavior: 'smooth'});

  // Estimativa em R$ vinda dos inputs numéricos + operacionais (motor de cálculo).
  // Guardamos motor + vazamento dentro de respostas (jsonb) → chegam ao Supabase.
  quizLeadData.respostas._motor = quizLeadData.motor || {};
  if (model.vazamento) quizLeadData.respostas._vazamento = model.vazamento;

  quizLeadData.resultado     = model.level;
  quizLeadData.quizConcluido = true;
  quizLeadData.etapaAtual    = 'resultado';
  persistState();
  saveLeadToSupabase();
  const resultadoPt = ({ good: 'bom', moderate: 'mediano', critical: 'critico' })[model.level] || model.level;
  trackOnce('result_view', { resultado: resultadoPt });
  trackPixelOnce('ViewContent', { content_name: 'resultado_' + resultadoPt });

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
      <div class="score-ring" id="scoreRing">
        <svg viewBox="0 0 120 120" aria-hidden="true">
          <circle class="score-ring-track" cx="60" cy="60" r="52"></circle>
          <circle class="score-ring-fill" cx="60" cy="60" r="52"></circle>
        </svg>
        <div class="score-ring-num"><span id="scoreNum">0</span>%</div>
      </div>
      ${model.badge}
      <h2 class="result-title">${model.title}</h2>
      <p class="result-sub">${model.subtitle}</p>
      <p class="result-thesis">${model.thesis}</p>
      <p class="score-method">Score de 0 a 100 a partir das suas respostas de operação — resposta no WhatsApp, faltas, cobertura e reposição de vaga.</p>
    </div>
    ${model.moneyHTML}
    <p class="section-label">${model.sectionLabel}</p>
    <div class="findings">${insightsHTML}</div>
    <p class="section-label">Daqui, são dois caminhos</p>
    <div class="result-paths">
      <div class="result-path">
        <div class="result-path-title">Continuar como está</div>
        <div class="result-path-desc">Cada mês igual: paciente chegando, parte escapando — e você sem saber onde.</div>
      </div>
      <div class="result-path result-path--accent">
        <div class="result-path-title">Organizar tudo</div>
        <div class="result-path-desc">Site, WhatsApp e atendimento puxando juntos, <strong>pra mais gente marcar consulta</strong>.</div>
      </div>
    </div>
    <div class="cta-section">
      <div class="cta-eyebrow">Próximo passo</div>
      <h3 class="cta-title">${model.ctaTitle}</h3>
      <p class="cta-desc">${model.ctaDesc}</p>
      <a class="btn-whatsapp"
         href="/consultoria?resultado=${ {'good':'bom','moderate':'mediano','critical':'critico'}[model.level] || 'mediano' }">
        Agendar minha sessão gratuita&nbsp;→
      </a>
      <button class="btn-restart" onclick="copyResultSummary(this)">Copiar resumo do resultado</button>
      <button class="btn-restart" onclick="restartQuiz()">Refazer o diagnóstico</button>
    </div>
  `;

  animateScoreRing(model.score);
}

// ── Círculo de score (donut SVG) — cor interpolada + preenchimento animado ──
function scoreColor(score) {
  // Vermelho → âmbar → verde por interpolação RGB: progressão contínua, bonita e
  // visível sobre o card dark (paleta da landing: loss/warn/gain).
  const v = Math.max(0, Math.min(100, score)) / 100;
  const red = [244, 87, 77], amber = [245, 166, 35], green = [43, 213, 118];
  let c1, c2, t;
  if (v < 0.5) { c1 = red;   c2 = amber; t = v / 0.5; }
  else         { c1 = amber; c2 = green; t = (v - 0.5) / 0.5; }
  const rgb = c1.map((a, i) => Math.round(a + (c2[i] - a) * t));
  return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
}

function animateScoreRing(score) {
  const CIRC = 2 * Math.PI * 52; // ≈ 326.726
  const fill = document.querySelector('#scoreRing .score-ring-fill');
  const num  = document.getElementById('scoreNum');
  if (!fill || !num) return;

  const target  = Math.max(0, Math.min(100, Math.round(score)));
  const color   = scoreColor(target);
  const offset  = CIRC * (1 - target / 100);
  fill.style.stroke = color;
  num.style.color   = 'var(--white)';

  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) {
    fill.style.strokeDashoffset = offset;
    num.textContent = target;
    return;
  }

  // anel: dispara a transição CSS (de cheio → alvo) no próximo frame
  fill.style.strokeDashoffset = CIRC;
  requestAnimationFrame(() => { fill.style.strokeDashoffset = offset; });

  // número: conta de 0 → target em ~1.2s
  const DURATION = 1200;
  const start = performance.now();
  (function tick(now) {
    const t = Math.min(1, (now - start) / DURATION);
    const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
    num.textContent = Math.round(eased * target);
    if (t < 1) requestAnimationFrame(tick);
    else num.textContent = target;
  })(start);
}

// Resumo do resultado em texto puro — o usuário leva o diagnóstico com ele
// (colar em nota, mandar pro sócio, guardar). Clipboard API com fallback.
function copyResultSummary(btn) {
  try {
    const model = buildPresentationModel();
    const label = {
      good: 'Boa base', moderate: 'Uns pontos soltos', critical: 'Vários pontos travando'
    }[model.level] || model.level;
    const lines = [
      'Diagnóstico CLINUP — ' + (quizLeadData.nome || 'minha clínica'),
      'Resultado: ' + model.score + '% · ' + label
    ];
    if (model.vazamento && model.vazamento.vazamento_mensal > 0) {
      lines.push('Vazamento estimado: R$ ' + fmtMoney(model.vazamento.vazamento_mensal) +
        '/mês (~R$ ' + fmtMoney(model.vazamento.vazamento_anual) + '/ano)');
    }
    lines.push('', 'Principais pontos:');
    model.insights.forEach(i => lines.push('- ' + i.title));
    lines.push('', 'Feito em: diagnostico-clinup-lac.vercel.app');
    const text = lines.join('\n');

    const confirm = () => {
      const original = btn.textContent;
      btn.textContent = 'Copiado ✓';
      btn.disabled = true;
      setTimeout(() => { btn.textContent = original; btn.disabled = false; }, 2200);
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(confirm).catch(() => fallbackCopy(text, confirm));
    } else {
      fallbackCopy(text, confirm);
    }
  } catch (e) {}
}

function fallbackCopy(text, onDone) {
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    onDone();
  } catch (e) {}
}

function onWhatsappClick() {
  quizLeadData.whatsappClicado = true;
  persistState();
  updateWhatsappClicked();
}

function buildWhatsAppMessage(level, insights) {
  const label = {
    good:     'Boa base',
    moderate: 'Uns pontos soltos',
    critical: 'Vários pontos travando'
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
  // Score 0–100 das respostas; o nível (e toda a copy dinâmica) deriva das faixas do score.
  const score = getScore();

  let level;
  if (score >= 71)      level = 'good';
  else if (score >= 46) level = 'moderate';
  else                  level = 'critical';

  let badge, title, subtitle, ctaTitle, ctaDesc, ctaLabel, sectionLabel;
  if (level === 'good') {
    badge        = '<div class="result-badge good"><svg viewBox="0 0 24 24"><path d="M21.801 10A10 10 0 1 1 17 3.335"/><path d="m9 11 3 3L22 4"/></svg>Boa base</div>';
    title        = 'Sua clínica já vai bem. Agora é só ajustar uns detalhes.';
    subtitle     = 'As pessoas já te acham, entram em contato e parte marca consulta. Agora a gente vê onde <strong>uns ajustes pequenos fazem você fechar mais</strong>, com regularidade.';
    ctaTitle     = 'Sua base é boa — dá pra extrair mais dela';
    ctaDesc      = 'Numa sessão rápida, a gente te mostra os 2 ou 3 ajustes que mais fazem diferença no seu caso — e monta seu plano de ação. <strong>Gratuita e direto ao ponto.</strong>';
    ctaLabel     = 'Quero ver onde melhorar';
    sectionLabel = 'O que achamos — e onde dá pra melhorar';
  } else if (level === 'moderate') {
    badge        = '<div class="result-badge moderate"><svg viewBox="0 0 24 24"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>Uns pontos soltos</div>';
    title        = 'Sua clínica atrai gente. Mas perde paciente no meio do caminho.';
    subtitle     = 'Chega gente interessada, mas <strong>parte some antes de marcar</strong>. Falta seu site, seu WhatsApp e seu atendimento trabalharem juntos.';
    ctaTitle     = 'Você já atrai — falta parar de perder';
    ctaDesc      = 'Numa sessão rápida, a gente te mostra onde os pacientes estão escapando e monta com você o plano de ação. <strong>Gratuita e sem compromisso.</strong>';
    ctaLabel     = 'Quero ver onde estou perdendo';
    sectionLabel = 'O que achamos na sua clínica';
  } else {
    badge        = '<div class="result-badge critical"><svg viewBox="0 0 24 24"><path d="M7.86 2h8.28L22 7.86v8.28L16.14 22H7.86L2 16.14V7.86z"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>Vários pontos travando</div>';
    title        = 'Tem mais de uma coisa travando sua clínica ao mesmo tempo.';
    subtitle     = 'Quando o site, o jeito de te achar e o WhatsApp falham juntos, você perde muito mais paciente no caminho. <strong>Cada ponto tem conserto — e a ordem de arrumar importa.</strong>';
    ctaTitle     = 'Cada semana assim custa pacientes';
    ctaDesc      = 'Quanto antes você tiver seu plano de ação na mão, menos consulta perde. A sessão é <strong>gratuita e direto ao ponto</strong>.';
    ctaLabel     = 'Quero entender por onde começar';
    sectionLabel = 'O que está travando sua clínica';
  }

  const motor = quizLeadData.motor || {};
  const vaz = (window.MotorAuditoria && window.MotorAuditoria.calcularVazamento)
    ? window.MotorAuditoria.calcularVazamento(motor) : null;

  const insights = selectInsights(level, motor, vaz);
  title = personalizeTitle(title);
  return {
    level, score, badge, title, subtitle,
    thesis:          buildThesis(motor, vaz),
    insights,
    vazamento:       vaz,
    moneyHTML:       buildMoneyHTML(vaz),
    ctaTitle, ctaDesc, ctaLabel, sectionLabel,
    whatsappPrefill: buildWhatsAppMessage(level, insights)
  };
}

// Formata inteiro em R$ pt-BR (sem centavos)
function fmtMoney(n) {
  try { return new Intl.NumberFormat('pt-BR').format(Math.round(n || 0)); }
  catch (e) { return String(Math.round(n || 0)); }
}

// Bloco de destaque da estimativa em R$ (somado ao resultado, não substitui a nota)
function buildMoneyHTML(vaz) {
  if (!vaz || vaz.vazamento_mensal <= 0) return '';
  var idle = (vaz.potencial_ocioso_mensal > 0)
    ? '<p class="money-idle">Além disso, ~R$ ' + fmtMoney(vaz.potencial_ocioso_mensal) +
      '/mês de <strong>agenda ociosa</strong> — capacidade livre que caberia mais consulta. É oportunidade de crescimento, não perda direta.</p>'
    : '';
  var naoMede = (!vaz.ausencia_mensuravel)
    ? '<p class="money-idle">Você respondeu que não mede a taxa de falta — então este número considera só o vazamento do WhatsApp. Medir as faltas é o primeiro passo pra fechar essa conta.</p>'
    : '';
  return '' +
    '<div class="money-card">' +
      '<span class="money-chip">Simulação · estimativa</span>' +
      '<p class="money-label">Quanto sua clínica deixa na mesa por mês</p>' +
      '<p class="money-value">R$ ' + fmtMoney(vaz.vazamento_mensal) + '</p>' +
      '<p class="money-year">≈ R$ ' + fmtMoney(vaz.vazamento_anual) + ' por ano, se seguir no cenário de hoje.</p>' +
      '<p class="money-note">Estimativa a partir das suas respostas — pacientes que esfriam por resposta lenta no WhatsApp e faltas que ninguém repõe. O número exato a gente levanta junto na conversa.</p>' +
      idle + naoMede +
    '</div>';
}

// Tese: nomeia o maior ralo, comparando as linhas do motor (resposta × faltas).
function buildThesis(motor, vaz) {
  motor = motor || {};
  var respostaLenta = ['DE_30MIN_2H', 'ACIMA_2H', 'VARIA'].indexOf(motor.resposta) >= 0;
  var respostaRapida = motor.resposta === 'ATE_5MIN';
  var semCobertura  = motor.cobertura === 'SO_COMERCIAL';
  var faltaAlta     = ['DE_11_20', 'ACIMA_20'].indexOf(motor.ausencia) >= 0;
  var vagaVaga      = motor.reposicao === 'FICA_VAGO';
  var convenioAlto  = ['DE_51_70', 'ACIMA_70'].indexOf(motor.convenio) >= 0;

  var lR = vaz ? vaz.detalhe.resposta : 0;
  var lA = vaz ? vaz.detalhe.ausencia : 0;

  if ((respostaLenta || semCobertura) && lR >= lA && lR > 0)
    return 'Seu maior ralo hoje é o <strong>WhatsApp</strong>: paciente chama, a resposta demora e ele esfria. O interesse chega — falta responder na hora pra virar consulta.';
  if ((faltaAlta || vagaVaga) && lA > 0)
    return 'Seu maior ralo hoje é a <strong>agenda</strong>: paciente falta e a vaga fica vazia. Horário pago que ninguém repõe é prejuízo que se repete todo mês.';
  if (convenioAlto)
    return 'Sua receita está muito presa a <strong>convênio</strong>. Organizar o particular — resposta rápida e agenda cheia — é o caminho pra depender menos de repasse.';
  if (respostaRapida && !faltaAlta)
    return 'O atendimento responde rápido e a agenda se sustenta. <strong>A base é boa</strong> — agora é afinar os detalhes e crescer com controle.';
  return 'O diagnóstico apontou onde ajustar. <strong>Cada ponto arrumado é paciente que para de escapar</strong> entre o primeiro contato e a cadeira.';
}

// Achados: gerados dos inputs de operação, ordenados por severidade.
function selectInsights(level, motor, vaz) {
  motor = motor || {};
  const pool = [];
  const ICON = {
    wpp:   '<svg viewBox="0 0 24 24"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>',
    clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>',
    cal:   '<svg viewBox="0 0 24 24"><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
    refresh:'<svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/></svg>',
    shield:'<svg viewBox="0 0 24 24"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/></svg>',
    funnel:'<svg viewBox="0 0 24 24"><path d="M3 4h18l-7 8v6l-4 2v-8z"/></svg>',
    search:'<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>'
  };

  // Tempo de resposta no WhatsApp
  if (['DE_30MIN_2H', 'ACIMA_2H'].indexOf(motor.resposta) >= 0)
    pool.push({icon:ICON.wpp, type:'red', severity:'warning', title:'Resposta lenta no WhatsApp',
      desc:'Quando a resposta passa de meia hora, a maioria dos pacientes já procurou outra clínica. É onde mais escapa dinheiro.'});
  else if (motor.resposta === 'VARIA')
    pool.push({icon:ICON.clock, type:'orange', severity:'warning', title:'Resposta sem padrão',
      desc:'Às vezes rápido, às vezes lento. Sem um tempo garantido de resposta, parte dos pacientes esfria antes de marcar.'});
  else if (motor.resposta === 'ATE_5MIN')
    pool.push({icon:ICON.wpp, type:'blue', severity:'strength', title:'WhatsApp responde rápido',
      desc:'Responder em minutos é o que mais converte contato em consulta. Esse já é um ponto forte seu.'});

  // Cobertura fora do horário
  if (motor.cobertura === 'SO_COMERCIAL')
    pool.push({icon:ICON.clock, type:'orange', severity:'warning', title:'Fora do horário, ninguém responde',
      desc:'Muita gente chama à noite e no fim de semana. Sem cobertura, essas mensagens viram paciente perdido.'});

  // Taxa de falta
  if (['DE_11_20', 'ACIMA_20'].indexOf(motor.ausencia) >= 0)
    pool.push({icon:ICON.cal, type:'red', severity:'warning', title:'Faltas altas viram cadeira vazia',
      desc:'Cada falta é um horário pago que não volta. Com confirmação inteligente, a maioria dessas ausências se evita.'});
  else if (motor.ausencia === 'NAO_MEDE')
    pool.push({icon:ICON.search, type:'orange', severity:'opportunity', title:'Você não mede as faltas',
      desc:'Sem acompanhar o no-show, não dá pra saber quanto a agenda vazia custa. Medir é o primeiro passo pra reduzir.'});

  // Reposição de vaga
  if (motor.reposicao === 'FICA_VAGO')
    pool.push({icon:ICON.refresh, type:'orange', severity:'warning', title:'Vaga que abre fica vazia',
      desc:'Quando alguém desmarca e ninguém repõe, o horário se perde. Uma lista de espera reocupa boa parte automaticamente.'});
  else if (motor.reposicao === 'AUTOMATICA')
    pool.push({icon:ICON.refresh, type:'blue', severity:'strength', title:'Reposição de vaga funcionando',
      desc:'Reocupar horário liberado é o que mantém a agenda cheia. Você já faz isso — poucas clínicas fazem.'});

  // Dependência de convênio
  if (['DE_51_70', 'ACIMA_70'].indexOf(motor.convenio) >= 0)
    pool.push({icon:ICON.shield, type:'orange', severity:'opportunity', title:'Muito preso a convênio',
      desc:'Repasse de convênio aperta a margem. Organizar o particular reduz essa dependência sem perder volume.'});

  // Volume / rastreabilidade de contatos
  if (motor.contatos === 'NAO_SABE')
    pool.push({icon:ICON.funnel, type:'orange', severity:'opportunity', title:'Não sabe de onde vêm os contatos',
      desc:'Sem medir o volume e a origem, fica no escuro sobre o que traz paciente. Rastrear isso destrava as próximas decisões.'});
  else if (['DE_81_150', 'ACIMA_150'].indexOf(motor.contatos) >= 0)
    pool.push({icon:ICON.funnel, type:'blue', severity:'strength', title:'Bom volume de contatos',
      desc:'Chega gente suficiente. O jogo agora é não deixar esse contato escapar antes de marcar.'});

  const warnings      = pool.filter(i => i.severity === 'warning');
  const strengths     = pool.filter(i => i.severity === 'strength');
  const opportunities = pool.filter(i => i.severity === 'opportunity');

  let out;
  if (level === 'critical')      out = [...warnings.slice(0, 3), ...opportunities.slice(0, 1), ...strengths.slice(0, 1)];
  else if (level === 'moderate') out = [...warnings.slice(0, 2), ...opportunities.slice(0, 1), ...strengths.slice(0, 2)];
  else                           out = [...strengths.slice(0, 3), ...opportunities.slice(0, 2)];

  // Failsafe: nunca renderizar resultado sem nenhum achado
  if (out.length === 0) out = pool.slice(0, 3);
  return out;
}

function restartQuiz() {
  Object.keys(answers).forEach(k => delete answers[k]);
  Object.assign(quizLeadData, {
    respostas: {}, pontos: {}, motor: {}, resultado: '', etapaAtual: 'formulario',
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
