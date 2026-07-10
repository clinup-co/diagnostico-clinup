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

function goToIntro() {
  // Honeypot: se bot preencheu o campo oculto, bloqueia
  const hp = document.getElementById('hp_field');
  if (hp && hp.value.length > 0) {
    console.warn('[CLINUP] Bot detectado via honeypot.');
    return;
  }

  // Rate limiting
  if (!checkRateLimit()) {
    const btn = document.getElementById('btnContinue');
    btn.textContent = 'Muitas tentativas. Tente em 1 hora.';
    btn.classList.remove('enabled');
    return;
  }

  const name  = document.getElementById('leadName').value.trim();
  const phone = document.getElementById('leadPhone').value.trim();
  const email = document.getElementById('leadEmail').value.trim();
  if (name.length < 2 || phone.replace(/\D/g,'').length !== 11) return;

  quizLeadData.nome  = sanitize(name);
  const cleanPhone   = phone.replace(/\D/g, '');
  quizLeadData.email = email
    ? sanitize(email).toLowerCase()
    : `sem-email-${cleanPhone}@nao-informado.com`;
  quizLeadData.telefone  = phone.replace(/\D/g,'').replace(/^55/, '').replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  quizLeadData.createdAt = new Date().toISOString();
  quizLeadData.etapaAtual = 'intro';
  persistState();

  // Captura imediata: lead vai pro Supabase já no submit do formulário,
  // antes do quiz — leads que abandonam no meio não se perdem.
  captureLeadToSupabase();
  trackOnce('lead_captured');

  document.getElementById('leadScreen').classList.add('hidden');
  document.getElementById('intro').style.display = '';
  document.getElementById('intro').classList.remove('hidden');
  window.scrollTo({top: 0, behavior: 'smooth'});
}
