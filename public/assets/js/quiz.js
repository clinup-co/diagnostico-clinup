// ─────────────────────────────────────────────
// QUIZ — navegação e seleção de respostas
// 9 perguntas: 3 numéricas (Próxima) + 6 de opção (auto-avança, 1 toque).
// Só a última pergunta mantém botão explícito ("Ver meu diagnóstico").
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
    // Restaura seleção/valor já respondido (retomada ou navegação pra trás)
    if (answers[n] !== undefined) {
      if (NUMERIC_Q[n]) {
        var inp = q.querySelector('.q-num-input');
        if (inp && (quizLeadData.motor || {})[MOTOR_FIELD[n]] != null) inp.value = quizLeadData.motor[MOTOR_FIELD[n]];
      } else {
        const labelKey   = PERGUNTA_LABELS[n] || ('pergunta_' + n);
        const storedText = (quizLeadData.respostas || {})[labelKey] || '';
        document.querySelectorAll('#opts' + n + ' .opt').forEach(o => {
          const hit = storedText
            ? getOptText(o) === storedText
            : parseInt(o.dataset.score) === answers[n];
          if (hit) o.classList.add('selected');
        });
        enableNext(n);
      }
    }
    quizLeadData.etapaAtual = 'pergunta_' + n;
    persistState();
    // Posicionamento instantâneo: o layout nunca se move depois de renderizado
    window.scrollTo(0, 0);
  }
}

// Progresso: começa com crédito (endowed progress — o formulário/gate ainda vem)
function updateProgress(n) {
  const pct = Math.round((n / TOTAL_PERGUNTAS) * 100);
  document.getElementById('progressFill').style.width = pct + '%';
  document.getElementById('progressPct').textContent  = pct + '%';
  document.getElementById('progressNum').textContent  = n;
}

// ── Pergunta de OPÇÃO (auto-avança) ──────────────────────────────────────────
function selectOpt(qNum, score, btn) {
  btn.closest('.options').querySelectorAll('.opt').forEach(o => {
    o.classList.remove('selected'); o.dataset.selected = 'false';
  });
  btn.classList.add('selected');
  btn.dataset.selected = 'true';
  answers[qNum] = score;

  // Pontos do score 0–100 (data-points) + código pro motor (data-code)
  if (!quizLeadData.pontos) quizLeadData.pontos = {};
  quizLeadData.pontos[qNum] = parseInt(btn.dataset.points, 10) || 0;
  if (!quizLeadData.motor) quizLeadData.motor = {};
  if (MOTOR_FIELD[qNum] && btn.dataset.code) quizLeadData.motor[MOTOR_FIELD[qNum]] = btn.dataset.code;

  const labelKey  = PERGUNTA_LABELS[qNum] || ('pergunta_' + qNum);
  quizLeadData.respostas[labelKey] = sanitize(getOptText(btn));
  persistState();

  const opts = btn.closest('.options').querySelectorAll('.opt');
  trackOnce('question_' + qNum, { opcao: Array.prototype.indexOf.call(opts, btn) + 1 });

  enableNext(qNum);

  if (qNum < TOTAL_PERGUNTAS) {
    clearTimeout(_advanceTimer);
    _advanceTimer = setTimeout(() => goNext(qNum), 320);
  }
}

// ── Pergunta NUMÉRICA (ticket, consultas, capacidade) ────────────────────────
function onNumInput(qNum, field, el) {
  var v = parseFloat(el.value);
  if (!quizLeadData.motor) quizLeadData.motor = {};
  if (isFinite(v) && v >= 0) {
    quizLeadData.motor[field] = v;
    answers[qNum] = v;
    quizLeadData.pontos[qNum] = 0; // numérica não pontua o score (só o cálculo em R$)
    var labelKey = PERGUNTA_LABELS[qNum] || ('pergunta_' + qNum);
    quizLeadData.respostas[labelKey] = String(v);
    persistState();
  }
  enableNext(qNum);
}

function submitNumeric(qNum) {
  var el = document.querySelector('#q' + qNum + ' .q-num-input');
  var v = el ? parseFloat(el.value) : NaN;
  if (!(isFinite(v) && v >= 0)) { if (el) el.focus(); return; } // exige um número válido
  onNumInput(qNum, MOTOR_FIELD[qNum], el);
  trackOnce('question_' + qNum);
  goNext(qNum);
}

function enableNext(qNum) {
  const btn = document.getElementById('next' + qNum);
  if (btn) btn.classList.add('enabled');
}

function goNext(qNum) {
  if (answers[qNum] === undefined) return;
  if (qNum < TOTAL_PERGUNTAS) showQuestion(qNum + 1);
  else goToGate();
}

function goBack(qNum) {
  clearTimeout(_advanceTimer); // voltar cancela qualquer avanço pendente
  if (qNum > 1) showQuestion(qNum - 1);
}

// Fim do quiz → gate: pede nome/WhatsApp pra revelar o resultado. A captura
// acontece aqui (sunk-cost das respostas dispara a conversão).
function goToGate() {
  clearTimeout(_advanceTimer);
  if (answers[TOTAL_PERGUNTAS] === undefined) return;
  quizLeadData.etapaAtual = 'gate';
  persistState();
  document.querySelectorAll('.question-screen').forEach(function (q) { q.classList.remove('active'); });
  document.getElementById('progressWrap').style.display = 'none';
  var note = document.getElementById('resumeNote');
  if (note) note.remove();
  prefillLeadForm();
  showLeadScreen();          // dispara trackOnce('view_form') — no gate
  trackOnce('quiz_complete');
  window.scrollTo(0, 0);
}

// Recomeçar do zero (link do aviso de retomada): limpa respostas,
// preserva lead já capturado e a atribuição (_utm).
function restartQuizAnswers() {
  clearTimeout(_advanceTimer);
  Object.keys(answers).forEach(k => { delete answers[k]; });
  quizLeadData.pontos = {};
  quizLeadData.motor  = {};
  const utm = quizLeadData.respostas && quizLeadData.respostas._utm;
  quizLeadData.respostas = utm ? { _utm: utm } : {};
  quizLeadData.resultado = '';
  quizLeadData.quizConcluido = false;
  document.querySelectorAll('.opt').forEach(o => {
    o.classList.remove('selected'); o.dataset.selected = 'false';
  });
  document.querySelectorAll('.btn-next').forEach(b => b.classList.remove('enabled'));
  const note = document.getElementById('resumeNote');
  if (note) note.remove();
  showQuestion(1);
}

function getTotal() {
  return Object.values(answers).reduce((a, b) => a + b, 0);
}

// Score 0–100 = soma dos pontos (só as 6 perguntas de operação pontuam; as
// 3 numéricas contribuem 0 — elas servem ao cálculo em R$, não à nota)
function getScore() {
  const p = quizLeadData.pontos || {};
  return Object.keys(p).reduce((sum, k) => sum + (parseInt(p[k], 10) || 0), 0);
}
