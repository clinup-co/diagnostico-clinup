// ─────────────────────────────────────────────
// QUIZ — navegação e seleção de respostas
// ─────────────────────────────────────────────
function startQuiz() {
  quizLeadData.etapaAtual = 'quiz';
  persistState();
  document.getElementById('intro').style.display = 'none';
  document.getElementById('progressWrap').classList.add('show');
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
    window.scrollTo({top: 0, behavior: 'smooth'});
  }
}

function updateProgress(n) {
  const pct = Math.round(((n - 1) / 5) * 100);
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

  const labelKey  = PERGUNTA_LABELS[qNum] || ('pergunta_' + qNum);
  quizLeadData.respostas[labelKey] = sanitize(getOptText(btn));
  persistState();

  enableNext(qNum);
}

function enableNext(qNum) {
  const btn = document.getElementById('next' + qNum);
  if (btn) btn.classList.add('enabled');
}

function goNext(qNum) {
  if (answers[qNum] === undefined) return;
  if (qNum < 5) showQuestion(qNum + 1);
  else showResult();
}

function goBack(qNum) {
  if (qNum > 1) showQuestion(qNum - 1);
}

function getTotal() {
  return Object.values(answers).reduce((a, b) => a + b, 0);
}
