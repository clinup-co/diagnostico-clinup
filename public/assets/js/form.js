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

  // Captura imediata: lead vai pro Supabase já no submit do formulário,
  // antes do quiz — leads que abandonam no meio não se perdem.
  captureLeadToSupabase();
  trackOnce('lead_captured');
  trackPixelOnce('Lead');

  // Direto pra pergunta 1 — sem tela intermediária: o usuário acabou de se
  // comprometer; cada clique extra entre o form e o quiz é abandono
  document.getElementById('leadScreen').classList.add('hidden');
  startQuiz();
}
