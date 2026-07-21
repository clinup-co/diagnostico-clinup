// ─────────────────────────────────────────────
// QUIZ — navegação e seleção de respostas
// Seleção auto-avança (padrão Typeform): 1 toque por pergunta.
// Só a pergunta 5 mantém botão explícito ("Ver meu diagnóstico").
// ─────────────────────────────────────────────
let _advanceTimer = null;

function startQuiz() {
  document.getElementById('leadScreen').classList.add('hidden');
  quizLeadData.etapaAtual = 'quiz';
  persistState();
  trackOnce('quiz_start');
  var pw = document.getElementById('progressWrap');
  pw.classList.add('show');
  pw.style.display = '';
  showQuestion(1);
}

function showQuestion(n) {
  document.querySelectorAll('.question-screen').forEach(q => q.classList.remove('active'));
  const q = document.getElementById('q' + n);
  if (q) {
    q.classList.add('active');
    updateProgress(n);
    if (answers[n] !== undefined) {
      const labelKey   = PERGUNTA_LABELS[n] || ('pergunta_' + n);
      const storedText = quizLeadData.respostas[labelKey] || '';
      document.querySelectorAll('#opts' + n + ' .opt').forEach(o => {
        const hit = storedText
          ? getOptText(o) === storedText
          : parseInt(o.dataset.score) === answers[n];
        if (hit) o.classList.add('selected');
      });
      enableNext(n);
    }
    quizLeadData.etapaAtual = 'pergunta_' + n;
    persistState();
    // Posicionamento instantâneo: o layout nunca se move depois de renderizado
    // (scroll suave atrasado deslocava as opções sob o dedo do usuário)
    window.scrollTo(0, 0);
  }
}

// Progresso dotado: o formulário já contou como avanço, a barra nunca
// nasce em 0% — começar com crédito aumenta conclusão (endowed progress)
function updateProgress(n) {
  const pct = 20 + Math.round(((n - 1) / 5) * 80);
  document.getElementById('progressFill').style.width = pct + '%';
  document.getElementById('progressPct').textContent  = pct + '%';
  document.getElementById('progressNum').textContent  = n;
}

function selectOpt(qNum, score, btn) {
  btn.closest('.options').querySelectorAll('.opt').forEach(o => {
    o.classList.remove('selected'); o.dataset.selected = 'false';
  });
  btn.classList.add('selected');
  btn.dataset.selected = 'true';
  answers[qNum] = score;

  // Pontos do score 0–100 (independente do data-score de severidade)
  if (!quizLeadData.pontos) quizLeadData.pontos = {};
  quizLeadData.pontos[qNum] = parseInt(btn.dataset.points, 10) || 0;

  const labelKey  = PERGUNTA_LABELS[qNum] || ('pergunta_' + qNum);
  quizLeadData.respostas[labelKey] = sanitize(getOptText(btn));
  persistState();

  // Evento por pergunta respondida (1x por pergunta por carregamento);
  // opcao = índice 1-based do botão escolhido dentro das opções
  const opts = btn.closest('.options').querySelectorAll('.opt');
  trackOnce('question_' + qNum, { opcao: Array.prototype.indexOf.call(opts, btn) + 1 });

  enableNext(qNum);

  // Auto-avanço: 320ms pra seleção registrar visualmente antes da transição
  if (qNum < 5) {
    clearTimeout(_advanceTimer);
    _advanceTimer = setTimeout(() => goNext(qNum), 320);
  }
}

function enableNext(qNum) {
  const btn = document.getElementById('next' + qNum);
  if (btn) btn.classList.add('enabled');
}

function goNext(qNum) {
  if (answers[qNum] === undefined) return;
  if (qNum < 5) showQuestion(qNum + 1);
  else goToGate();
}

function goBack(qNum) {
  clearTimeout(_advanceTimer); // voltar cancela qualquer avanço pendente
  if (qNum > 1) showQuestion(qNum - 1);
}

// Fim do quiz → gate: pede nome/WhatsApp pra revelar o resultado. O sunk-cost
// das 5 respostas dispara a conversão; a captura acontece aqui (não mais na
// entrada), então tráfego frio responde o quiz antes de dar o contato.
function goToGate() {
  clearTimeout(_advanceTimer);
  if (answers[5] === undefined && answers['5'] === undefined) return;
  quizLeadData.etapaAtual = 'gate';
  persistState();
  document.querySelectorAll('.question-screen').forEach(function (q) { q.classList.remove('active'); });
  document.getElementById('progressWrap').style.display = 'none';
  var note = document.getElementById('resumeNote');
  if (note) note.remove();
  prefillLeadForm();
  showLeadScreen();          // dispara trackOnce('view_form') — agora no gate
  trackOnce('quiz_complete');
  window.scrollTo(0, 0);
}

// Recomeçar do zero (link do aviso de sessão retomada): limpa respostas,
// preserva lead já capturado e a atribuição (_utm).
// (Diferente do restartQuiz de results.js, que reseta o funil inteiro.)
function restartQuizAnswers() {
  clearTimeout(_advanceTimer);
  Object.keys(answers).forEach(k => { delete answers[k]; });
  quizLeadData.pontos = {};
  const utm = quizLeadData.respostas && quizLeadData.respostas._utm;
  quizLeadData.respostas = utm ? { _utm: utm } : {};
  quizLeadData.resultado = '';
  quizLeadData.quizConcluido = false;
  document.querySelectorAll('.opt').forEach(o => {
    o.classList.remove('selected'); o.dataset.selected = 'false';
  });
  const n5 = document.getElementById('next5');
  if (n5) n5.classList.remove('enabled');
  const note = document.getElementById('resumeNote');
  if (note) note.remove();
  showQuestion(1);
}

function getTotal() {
  return Object.values(answers).reduce((a, b) => a + b, 0);
}

// Score 0–100 = soma dos pontos das 5 respostas (piso prático ~18, sem normalizar)
function getScore() {
  const p = quizLeadData.pontos || {};
  return Object.keys(p).reduce((sum, k) => sum + (parseInt(p[k], 10) || 0), 0);
}
