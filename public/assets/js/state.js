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
// ATRIBUIÇÃO — UTM da URL → source da sessão
// O source é a chave de atribuição do lead: mark_whatsapp faz PATCH por
// email+source, então o MESMO valor precisa valer nos 3 estágios
// (capture_lead → sync_result → mark_whatsapp). Regra: o source só é
// definido ANTES da captura (etapa 'formulario'); quem volta com sessão
// já capturada mantém o source original — senão o clique no WhatsApp
// erraria a linha no banco.
// ─────────────────────────────────────────────
function applyUtmToSource() {
  try {
    const params    = new URLSearchParams(window.location.search);
    const utmSource = (params.get('utm_source') || '').trim();
    if (!utmSource) return;

    // Só sessão ainda não concluída/capturada recebe nova atribuição. A captura
    // agora acontece no gate (pós-quiz), então o source pode ser definido durante
    // 'inicio'/quiz/gate — mas nunca depois do resultado (senão o mark_whatsapp
    // erraria a linha no banco).
    if (quizLeadData.quizConcluido || quizLeadData.etapaAtual === 'resultado') return;

    // Valor saneado: minúsculas, só [a-z0-9_-], máx. 40 chars — mantém o
    // campo source limpo no banco e o filtro do PATCH previsível
    const clean = utmSource.toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 40);
    if (!clean) return;

    quizLeadData.source = 'quiz_clinup__' + clean;

    // UTMs brutas: guardadas dentro de respostas (jsonb já existente no
    // schema) — chegam ao banco junto do sync_result, sem mudança de schema
    if (!quizLeadData.respostas) quizLeadData.respostas = {};
    quizLeadData.respostas._utm = {
      source:   utmSource,
      medium:   (params.get('utm_medium')   || '').trim(),
      campaign: (params.get('utm_campaign') || '').trim()
    };

    persistState();
  } catch (e) {}
}

applyUtmToSource();

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
  document.getElementById('progressWrap').style.display = 'none';
  document.querySelectorAll('.question-screen').forEach(q => q.classList.remove('active'));
  document.getElementById('result').classList.remove('show');
}

// ─────────────────────────────────────────────
// RETOMADA DE SESSÃO — restaura onde o usuário parou
// ─────────────────────────────────────────────
// Restaura as seleções salvas das perguntas já respondidas (pra quem retoma no
// meio e navega pra trás encontrar suas escolhas marcadas).
function restoreAnswerSelections() {
  Object.keys(answers).forEach(function (k) {
    var n = parseInt(k);
    if (isNaN(n)) return;
    if (NUMERIC_Q[n]) {
      var inp = document.querySelector('#q' + n + ' .q-num-input');
      if (inp && (quizLeadData.motor || {})[MOTOR_FIELD[n]] != null) inp.value = quizLeadData.motor[MOTOR_FIELD[n]];
      enableNext(n);
      return;
    }
    var labelKey   = PERGUNTA_LABELS[n] || ('pergunta_' + n);
    var storedText = (quizLeadData.respostas || {})[labelKey] || '';
    document.querySelectorAll('#opts' + n + ' .opt').forEach(function (o) {
      var hit = storedText ? getOptText(o) === storedText
                           : parseInt(o.dataset.score) === answers[n];
      if (hit) { o.classList.add('selected'); o.dataset.selected = 'true'; }
    });
    enableNext(n);
  });
}

// Preenche o formulário do gate com o contato já salvo (ignora o email fallback).
function prefillLeadForm() {
  try {
    if (quizLeadData.nome)     document.getElementById('leadName').value  = quizLeadData.nome;
    if (quizLeadData.telefone) document.getElementById('leadPhone').value = quizLeadData.telefone;
    if (quizLeadData.email && quizLeadData.email.indexOf('@nao-informado.com') === -1)
      document.getElementById('leadEmail').value = quizLeadData.email;
    if (quizLeadData.nome || quizLeadData.telefone) checkLeadForm();
  } catch (e) {}
}

function showProgress() {
  var pw = document.getElementById('progressWrap');
  pw.classList.add('show');
  pw.style.display = '';
}

function showResumeNote() {
  if (Object.keys(answers).length > 0 && !document.getElementById('resumeNote')) {
    var note = document.createElement('div');
    note.className = 'resume-note';
    note.id = 'resumeNote';
    note.innerHTML = 'Continuando de onde você parou. ' +
      '<button type="button" onclick="restartQuizAnswers()">Recomeçar do zero</button>';
    var pw = document.getElementById('progressWrap');
    pw.parentNode.insertBefore(note, pw);
  }
}

// ─────────────────────────────────────────────
// RETOMADA DE SESSÃO — funil QUIZ-FIRST
// Ordem: quiz (P1..P5) → gate (nome + WhatsApp) → resultado. A captura acontece
// no gate; a retomada devolve o usuário ao estágio onde parou.
// ─────────────────────────────────────────────
function resumeSession() {
  try {
    var etapa      = quizLeadData.etapaAtual;
    var numAnswers = Object.keys(answers).length;
    var hasContact = !!(quizLeadData.nome && quizLeadData.telefone);

    // Concluído (todas as respostas + contato): mostra o resultado
    if (etapa === 'resultado' && numAnswers >= TOTAL_PERGUNTAS && hasContact) {
      hideAllScreens();
      showResult();
      return;
    }

    // Quiz terminado, contato ainda não dado: volta pro gate
    if (numAnswers >= TOTAL_PERGUNTAS && !hasContact) {
      hideAllScreens();
      prefillLeadForm();
      showLeadScreen();                 // é o gate (dispara trackOnce('view_form'))
      quizLeadData.etapaAtual = 'gate';
      persistState();
      return;
    }

    // No meio do quiz: retoma na pergunta onde parou
    var m = etapa && etapa.match(/^pergunta_(\d+)$/);
    if (m && numAnswers > 0) {
      hideAllScreens();
      showProgress();
      restoreAnswerSelections();
      showResumeNote();
      quizLeadData.etapaAtual = 'quiz';
      trackOnce('quiz_start');
      showQuestion(parseInt(m[1]) || 1);
      return;
    }

    // Tráfego novo (ou estado inconsistente): começa o quiz na pergunta 1
    startQuiz();

  } catch (err) {
    console.warn('[CLINUP] Erro ao retomar sessão, reiniciando:', err);
    localStorage.removeItem('clinup_lead');
    localStorage.removeItem('clinup_answers');
    localStorage.removeItem('clinup_version');
    startQuiz();
  }
}
