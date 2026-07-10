// ─────────────────────────────────────────────
// PERSISTÊNCIA — localStorage
// ─────────────────────────────────────────────
function persistState() {
  try {
    localStorage.setItem('clinup_version', STATE_VERSION);
    localStorage.setItem('clinup_lead',    JSON.stringify(quizLeadData));
    localStorage.setItem('clinup_answers', JSON.stringify(answers));
  } catch(e) {}
}

function restoreState() {
  try {
    const version = localStorage.getItem('clinup_version');
    if (version !== STATE_VERSION) {
      localStorage.removeItem('clinup_lead');
      localStorage.removeItem('clinup_answers');
      localStorage.removeItem('clinup_version');
      return;
    }
    const saved        = localStorage.getItem('clinup_lead');
    const savedAnswers = localStorage.getItem('clinup_answers');
    if (saved) Object.assign(quizLeadData, JSON.parse(saved));
    if (savedAnswers) {
      const parsed = JSON.parse(savedAnswers);
      Object.keys(parsed).forEach(k => { answers[parseInt(k)] = parsed[k]; });
    }
  } catch(e) {
    localStorage.removeItem('clinup_lead');
    localStorage.removeItem('clinup_answers');
    localStorage.removeItem('clinup_version');
  }
}

restoreState();

// ─────────────────────────────────────────────
// TELAS — mostrar / esconder
// ─────────────────────────────────────────────
function showLeadScreen() {
  document.getElementById('leadScreen').classList.remove('hidden');
  document.getElementById('leadScreen').style.display = '';
  trackOnce('view_form');
}

function hideAllScreens() {
  document.getElementById('leadScreen').classList.add('hidden');
  document.getElementById('intro').style.display = 'none';
  document.getElementById('intro').classList.add('hidden');
  document.getElementById('progressWrap').style.display = 'none';
  document.querySelectorAll('.question-screen').forEach(q => q.classList.remove('active'));
  document.getElementById('result').classList.remove('show');
}

// ─────────────────────────────────────────────
// RETOMADA DE SESSÃO — restaura onde o usuário parou
// ─────────────────────────────────────────────
function resumeSession() {
  try {
    const etapa = quizLeadData.etapaAtual;

    if (!etapa || etapa === 'formulario') {
      trackOnce('view_form');
      const n = document.getElementById('leadName');
      const e = document.getElementById('leadEmail');
      const p = document.getElementById('leadPhone');
      if (quizLeadData.nome)     n.value = quizLeadData.nome;
      if (quizLeadData.email)    e.value = quizLeadData.email;
      if (quizLeadData.telefone) p.value = quizLeadData.telefone;
      if (quizLeadData.nome || quizLeadData.email) checkLeadForm();
      return;
    }

    if (!quizLeadData.nome || !quizLeadData.email) {
      localStorage.removeItem('clinup_lead');
      localStorage.removeItem('clinup_answers');
      trackOnce('view_form'); // formulário segue visível (estado padrão da página)
      return;
    }

    try {
      document.getElementById('leadName').value  = quizLeadData.nome;
      document.getElementById('leadEmail').value = quizLeadData.email;
      document.getElementById('leadPhone').value = quizLeadData.telefone || '';
    } catch(e) {}

    hideAllScreens();

    if (etapa === 'intro') {
      const intro = document.getElementById('intro');
      intro.style.display = '';
      intro.classList.remove('hidden');
      return;
    }

    if (etapa === 'resultado') {
      const hasAnswers = Object.keys(answers).length >= 5;
      if (!hasAnswers) {
        localStorage.removeItem('clinup_lead');
        localStorage.removeItem('clinup_answers');
        showLeadScreen();
        return;
      }
      showResult();
      return;
    }

    const match = etapa.match(/^(quiz|pergunta_(\d+))$/);
    if (!match) {
      showLeadScreen();
      return;
    }

    const qNum = match[2] ? parseInt(match[2]) : 1;
    document.getElementById('progressWrap').classList.add('show');
    document.getElementById('progressWrap').style.display = '';

    Object.keys(answers).forEach(k => {
      const n = parseInt(k);
      if (isNaN(n)) return;
      const labelKey   = PERGUNTA_LABELS[n] || ('pergunta_' + n);
      const storedText = quizLeadData.respostas[labelKey] || '';
      document.querySelectorAll('#opts' + n + ' .opt').forEach(o => {
        const hit = storedText
          ? getOptText(o) === storedText
          : parseInt(o.dataset.score) === answers[n];
        if (hit) { o.classList.add('selected'); o.dataset.selected = 'true'; }
      });
      enableNext(n);
    });

    showQuestion(qNum);

  } catch(err) {
    console.warn('[CLINUP] Erro ao retomar sessão, reiniciando:', err);
    localStorage.removeItem('clinup_lead');
    localStorage.removeItem('clinup_answers');
    showLeadScreen();
  }
}
