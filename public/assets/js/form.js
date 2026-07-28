// ─────────────────────────────────────────────
// FORMULÁRIO DE LEAD — validação e navegação
// ─────────────────────────────────────────────
function checkLeadForm() {
  const name    = document.getElementById('leadName').value.trim();
  const phone   = document.getElementById('leadPhone').value.replace(/\D/g,'');
  const btn     = document.getElementById('btnContinue');
  if (name.length >= 2 && /^[A-Za-zÀ-ÿ\s]+$/.test(name) && phone.length === 11) {
    btn.classList.add('enabled');
  } else {
    btn.classList.remove('enabled');
  }
}

function submitLeadForm() {
  // Honeypot: se bot preencheu o campo oculto, bloqueia
  const hp = document.getElementById('hp_field');
  if (hp && hp.value.length > 0) {
    console.warn('[CLINUP] Bot detectado via honeypot.');
    return;
  }

  const nameInput  = document.getElementById('leadName');
  const phoneInput = document.getElementById('leadPhone');
  const name       = nameInput.value.trim();
  const cleanPhone = phoneInput.value.replace(/\D/g, '');

  // Clique inválido: mostra o erro no campo e foca — nunca falha em silêncio
  // nem consome tentativa do rate limit
  const nameOk  = name.length >= 2 && /^[A-Za-zÀ-ÿ\s]+$/.test(name);
  const phoneOk = cleanPhone.length === 11;
  if (!nameOk || !phoneOk) {
    if (!name) {
      nameInput.classList.add('invalid');
      document.getElementById('errName').textContent = 'Digite seu nome';
    } else validateName(nameInput);
    if (!cleanPhone) {
      phoneInput.classList.add('invalid');
      document.getElementById('errPhone').textContent = 'Digite seu WhatsApp';
    } else validatePhone(phoneInput);
    (nameOk ? phoneInput : nameInput).focus();
    return;
  }

  // Rate limiting — só submissão válida conta como tentativa
  if (!checkRateLimit()) {
    const btn = document.getElementById('btnContinue');
    btn.textContent = 'Muitas tentativas. Tente em 1 hora.';
    btn.classList.remove('enabled');
    return;
  }

  const email = document.getElementById('leadEmail').value.trim();

  quizLeadData.nome  = sanitize(name);
  quizLeadData.email = email
    ? sanitize(email).toLowerCase()
    : `sem-email-${cleanPhone}@nao-informado.com`;
  quizLeadData.telefone  = cleanPhone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  quizLeadData.createdAt = new Date().toISOString();
  persistState();

  // Captura no gate (pós-quiz): o contato é o último passo pra revelar o
  // resultado. capture_lead salva o contato; showResult dispara o sync_result
  // completo logo em seguida (upsert pela mesma chave de email).
  captureLeadToSupabase();
  trackOnce('lead_captured');
  trackPixelOnce('Lead');

  revelarResultado();
}

// Duração total da tela de processamento. O cálculo em si é instantâneo:
// o tempo existe pra dar peso ao laudo, não porque a conta demora. Mexer
// aqui é o único ponto a ajustar se ficar longo demais.
const PROC_MS = 3600;

// Etapas: descrevem trabalho que o motor realmente faz. Nada de "cruzando
// com benchmark de clínicas" — motorCalculoVazamento.js registra que as
// saídas NÃO são médias de mercado auditadas.
// A última etapa cai perto do fim de propósito: barra cheia parada é o
// momento em que a pessoa acha que travou. Aqui sobra ~450ms entre os
// 100% e a abertura, o que lê como entrega e não como espera.
const PROC_ETAPAS = [
  { t: 0,    pct: '22%',  msg: 'Lendo suas respostas sobre o atendimento…' },
  { t: 1000, pct: '52%',  msg: 'Estimando a receita presa em cada gargalo…' },
  { t: 2000, pct: '80%',  msg: 'Ordenando os gargalos por prejuízo…' },
  { t: 3150, pct: '100%', msg: 'Laudo pronto. Abrindo…' }
];

function revelarResultado() {
  const overlay = document.getElementById('procOverlay');
  const abrir   = function () {
    document.getElementById('leadScreen').classList.add('hidden');
    if (overlay) overlay.style.display = 'none';
    showResult();
  };

  // Sem overlay, ou pra quem pediu menos movimento: vai direto. A espera é
  // encenação, e encenação não se impõe a quem desligou animação.
  const semMovimento = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!overlay || semMovimento) { abrir(); return; }

  const barra  = document.getElementById('procBarFill');
  const status = document.getElementById('procStatus');
  overlay.style.display = 'flex';

  PROC_ETAPAS.forEach(function (etapa) {
    setTimeout(function () {
      if (barra) barra.style.width = etapa.pct;
      if (!status) return;
      status.style.opacity = '0';
      setTimeout(function () {
        status.textContent = etapa.msg;
        status.style.opacity = '1';
      }, 100);
    }, etapa.t);
  });

  setTimeout(abrir, PROC_MS);
}
