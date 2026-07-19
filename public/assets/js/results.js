// ─────────────────────────────────────────────
// RESULTADOS — renderização e lógica de scoring
// ─────────────────────────────────────────────
function showResult() {
  if (answers[5] === undefined && answers['5'] === undefined) return;
  document.querySelectorAll('.question-screen').forEach(q => q.classList.remove('active'));
  document.getElementById('progressWrap').style.display = 'none';
  const resumeNote = document.getElementById('resumeNote');
  if (resumeNote) resumeNote.remove();

  const model  = buildPresentationModel();
  const result = document.getElementById('result');
  result.classList.add('show');
  window.scrollTo({top: 0, behavior: 'smooth'});

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
      <p class="score-method">Score calculado a partir das suas 5 respostas — cada uma pesa pelo impacto em captação e conversão de pacientes.</p>
    </div>
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
        Agendar minha conversa gratuita&nbsp;→
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
  // visível sobre o card branco (evita o amarelo "barrento"/olive do HSL puro a 42%).
  const v = Math.max(0, Math.min(100, score)) / 100;
  const red = [211, 58, 44], amber = [224, 138, 30], green = [27, 158, 75];
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
      'Resultado: ' + model.score + '% · ' + label,
      '',
      'Principais pontos:'
    ];
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
    ctaDesc      = 'Numa conversa rápida, a gente te mostra os 2 ou 3 ajustes que mais fazem diferença no seu caso. <strong>Gratuita e direto ao ponto.</strong>';
    ctaLabel     = 'Quero ver onde melhorar';
    sectionLabel = 'O que achamos — e onde dá pra melhorar';
  } else if (level === 'moderate') {
    badge        = '<div class="result-badge moderate"><svg viewBox="0 0 24 24"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>Uns pontos soltos</div>';
    title        = 'Sua clínica atrai gente. Mas perde paciente no meio do caminho.';
    subtitle     = 'Chega gente interessada, mas <strong>parte some antes de marcar</strong>. Falta seu site, seu WhatsApp e seu atendimento trabalharem juntos.';
    ctaTitle     = 'Você já atrai — falta parar de perder';
    ctaDesc      = 'Numa conversa rápida, a gente te mostra onde os pacientes estão escapando e o que arrumar primeiro. <strong>Gratuita e sem compromisso.</strong>';
    ctaLabel     = 'Quero ver onde estou perdendo';
    sectionLabel = 'O que achamos na sua clínica';
  } else {
    badge        = '<div class="result-badge critical"><svg viewBox="0 0 24 24"><path d="M7.86 2h8.28L22 7.86v8.28L16.14 22H7.86L2 16.14V7.86z"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>Vários pontos travando</div>';
    title        = 'Tem mais de uma coisa travando sua clínica ao mesmo tempo.';
    subtitle     = 'Quando o site, o jeito de te achar e o WhatsApp falham juntos, você perde muito mais paciente no caminho. <strong>Cada ponto tem conserto — e a ordem de arrumar importa.</strong>';
    ctaTitle     = 'Cada semana assim custa pacientes';
    ctaDesc      = 'Quanto antes você souber a ordem certa de arrumar, menos consulta perde. A conversa é <strong>gratuita e direto ao ponto</strong>.';
    ctaLabel     = 'Quero entender por onde começar';
    sectionLabel = 'O que está travando sua clínica';
  }

  const insights = selectInsights(level);
  title = personalizeTitle(title);
  return {
    level, score, badge, title, subtitle,
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
    return 'Está tudo no lugar: te acham, chega gente e ela marca consulta. <strong>Agora é crescer com calma e controle.</strong>';
  if (goodSite && goodConv && (onlyRef || a[2] === 1))
    return 'Quem fala com você acaba marcando. O cuidado é como o paciente te encontra: <strong>depender de um lugar só é arriscado</strong> — se ele cai, some paciente.';
  if (goodSite && badConv && multiChannel)
    return 'Chega gente de vários lugares, mas parte some entre o primeiro contato e marcar a consulta. <strong>O problema está no WhatsApp.</strong>';
  if (goodSite && badConv)
    return 'As pessoas te acham, mas você perde na hora de fechar. Não falta gente interessada — <strong>falta transformar esse interesse em consulta marcada</strong>.';
  if (goodSite && a[3] === 1 && multiChannel)
    return 'Chega gente de vários lugares. Agora é <strong>melhorar a hora de fechar</strong>, pra mais gente marcar consulta.';
  if (goodSite && a[3] === 1)
    return 'O básico está no lugar, mas dá pra melhorar como te acham e como você fecha. <strong>São os dois pontos que mais mudam o número de pacientes.</strong>';
  if (weakSite && goodConv)
    return 'Quando alguém chega, você fecha bem. O problema é antes: <strong>pouca gente te encontra e te procura</strong>.';
  if (weakSite && badConv)
    return 'Tem dois problemas ao mesmo tempo: pouca gente te acha, e quem chega não fecha. <strong>Com os dois fracos, você perde paciente em dobro.</strong>';
  return 'O teste mostrou pontos certos pra arrumar. <strong>Cada um ajustado ajuda sua clínica a ser achada, atender melhor e marcar mais consultas.</strong>';
}

function selectInsights(level) {
  const a    = answers;
  const pool = [];

  // Q1 — Presença digital
  if (a[1] === 3) {
    if (level === 'moderate')
      pool.push({icon:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>', type:'orange', severity:'warning',
        title:'Sem site',
        desc:'Quem procura sua clínica no Google não acha nada que passe confiança. O paciente desiste antes de falar com você.'});
    else
      pool.push({icon:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>', type:'red',    severity:'warning',
        title:'Sem site',
        desc:'Quem procura sua clínica no Google não acha nada que passe confiança. O paciente desiste antes de falar com você.'});
  } else if (a[1] === 2)
    pool.push({icon:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>', type:'orange', severity:'warning',
      title:'Site fraco',
      desc:'Site velho ou bagunçado passa impressão de descuido. Às vezes atrapalha mais do que ajuda.'});
  else
    pool.push({icon:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>', type:'blue',   severity:'strength',
      title:'Você é achado na internet',
      desc:'O básico funciona. Agora é fazer ele trazer paciente de verdade, não só existir.'});

  // Q2 — Atração de interessados
  if (a[2] === 2)
    pool.push({icon:'<svg viewBox="0 0 24 24"><path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg>', type:'orange', severity:'warning',
      title:'Depende de indicação',
      desc:'Indicação é ótimo sinal, mas você não controla. Quando para de vir, para de chegar paciente novo.'});
  else if (a[2] === 1)
    pool.push({icon:'<svg viewBox="0 0 24 24"><path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg>', type:'orange', severity:'opportunity',
      title:'Você depende de um lugar só',
      desc:'Crescer com um lugar só funciona até certo ponto. Se ele cair, seu paciente novo cai junto — e isso você não controla.'});
  else
    pool.push({icon:'<svg viewBox="0 0 24 24"><path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg>', type:'blue',   severity:'strength',
      title:'O paciente te acha de vários jeitos',
      desc:'Isso é ótimo. Agora é olhar o que chega de cada lugar e garantir que vire consulta.'});

  // Q3 — Conversão no WhatsApp
  if (a[3] === 2) {
    if (level === 'moderate')
      pool.push({icon:'<svg viewBox="0 0 24 24"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>', type:'orange', severity:'warning',
        title:'Muita gente some no WhatsApp',
        desc:'O WhatsApp é onde o paciente decide. Perder gente ali, na maioria das vezes, é falta de organização — não falta de interesse.'});
    else
      pool.push({icon:'<svg viewBox="0 0 24 24"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>', type:'red',    severity:'warning',
        title:'Muita gente some no WhatsApp',
        desc:'O WhatsApp é onde o paciente decide. Perder gente ali, na maioria das vezes, é falta de organização — não falta de interesse.'});
  } else if (a[3] === 1)
    pool.push({icon:'<svg viewBox="0 0 24 24"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>', type:'orange', severity:'opportunity',
      title:'Dá pra fechar mais no WhatsApp',
      desc:'Metade fechando é metade escapando. Com o atendimento organizado, esse número sobe sem precisar de mais gente.'});
  else
    pool.push({icon:'<svg viewBox="0 0 24 24"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>', type:'blue',   severity:'strength',
      title:'Você fecha bem no WhatsApp',
      desc:'Quem fala com você, marca. Agora é trazer mais gente certa até aqui.'});

  // Q4 — Prontidão (level-aware)
  if (level === 'good') {
    if (a[4] === 0)
      pool.push({icon:'<svg viewBox="0 0 24 24"><path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/></svg>', type:'blue',   severity:'opportunity',
        title:'Pronto pra dar o próximo passo',
        desc:'Sua clínica está preparada. Um olhar mais de perto mostra os pontos certos pra melhorar e crescer com controle.'});
    else if (a[4] === 1)
      pool.push({icon:'<svg viewBox="0 0 24 24"><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>', type:'blue',   severity:'opportunity',
        title:'Bom momento pra olhar de perto',
        desc:'Com o básico no lugar, agora é achar o que dá pra melhorar e fazer com calma e plano.'});
    else
      pool.push({icon:'<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>', type:'blue',   severity:'opportunity',
        title:'Boa hora pra planejar o próximo nível',
        desc:'Avaliar antes de agir é o certo quando a base já está firme. Um olhar organizado mostra o que vale a pena fazer primeiro.'});
  } else if (level === 'critical') {
    if (a[4] === 0)
      pool.push({icon:'<svg viewBox="0 0 24 24"><path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/></svg>', type:'blue',   severity:'opportunity',
        title:'Você quer agir — agora é definir a ordem',
        desc:'Ver que precisa agir já é o começo. O teste já achou os problemas — falta decidir por qual começar.'});
    else if (a[4] === 1)
      pool.push({icon:'<svg viewBox="0 0 24 24"><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>', type:'orange', severity:'opportunity',
        title:'Você tem um prazo — mas os problemas seguem',
        desc:'Ter um prazo é melhor do que nenhum. Cada ponto arrumado destrava uma parte da sua clínica.'});
    else
      pool.push({icon:'<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>', type:'orange', severity:'opportunity',
        title:'Por onde começar — essa é a pergunta certa',
        desc:'Saber a ordem de arrumar faz toda diferença quando tem vários problemas juntos. O teste já mostrou — falta virar um plano.'});
  } else {
    if (a[4] === 0)
      pool.push({icon:'<svg viewBox="0 0 24 24"><path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/></svg>', type:'blue',   severity:'opportunity',
        title:'Boa hora pra organizar',
        desc:'Estar pronto pra agir é uma vantagem. Com os pontos achados, arrumar agora faz você perder menos tempo e menos paciente.'});
    else if (a[4] === 1)
      pool.push({icon:'<svg viewBox="0 0 24 24"><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>', type:'orange', severity:'opportunity',
        title:'Dá pra melhorar agora',
        desc:'Ter um prazo é melhor do que nenhum. Enquanto as pontas seguem soltas, sua clínica rende menos do que podia.'});
    else
      pool.push({icon:'<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>', type:'orange', severity:'opportunity',
        title:'Ainda avaliando? Esse é o próximo passo',
        desc:'Entender antes de agir faz sentido. Com as pontas soltas, ver as prioridades ajuda a decidir por onde começar.'});
  }

  // Q5 — Faturamento
  if (a[5] === 3)
    pool.push({icon:'<svg viewBox="0 0 24 24"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5.76.76 1.23 1.52 1.41 2.5"/></svg>', type:'orange', severity:'opportunity',
      title:'Começo de jornada — muito a crescer',
      desc:'Clínicas nessa fase são as que mais têm espaço pra crescer. Organizar agora como você traz paciente acelera muito o que vem.'});
  else if (a[5] === 2)
    pool.push({icon:'<svg viewBox="0 0 24 24"><path d="M16 7h6v6"/><path d="m22 7-8.5 8.5-5-5L2 17"/></svg>', type:'blue',   severity:'strength',
      title:'Você está crescendo',
      desc:'Sua clínica está crescendo. Com um jeito mais organizado de trazer paciente, isso acelera e fica mais previsível.'});
  else if (a[5] === 1)
    pool.push({icon:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>', type:'blue',   severity:'strength',
      title:'Clínica firme',
      desc:'Tem paciente e o serviço funciona. O próximo nível é trazer paciente de um jeito que não dependa da sorte.'});
  else if ((quizLeadData.respostas || {}).faturamento_mensal !== 'Prefiro não informar')
    pool.push({icon:'<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>', type:'blue',   severity:'strength',
      title:'Clínica estabelecida',
      desc:'O volume alto mostra que dá certo. Agora o desafio é continuar crescendo com organização, não só no esforço.'});

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
    respostas: {}, pontos: {}, resultado: '', etapaAtual: 'formulario',
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
