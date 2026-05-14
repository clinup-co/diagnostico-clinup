// ─────────────────────────────────────────────
// SANITIZAÇÃO — remove tags HTML dos inputs
// ─────────────────────────────────────────────
function sanitize(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .trim();
}

// Extrai o texto limpo de um botão .opt (sem o emoji do .opt-icon)
function getOptText(btn) {
  const clone = btn.cloneNode(true);
  clone.querySelector('.opt-icon')?.remove();
  return clone.textContent.trim();
}

// ─────────────────────────────────────────────
// RATE LIMITING — máx 3 submissões por hora
// ─────────────────────────────────────────────
function checkRateLimit() {
  const KEY    = 'clinup_attempts';
  const MAX    = 3;
  const WINDOW = 60 * 60 * 1000; // 1 hora em ms
  const now    = Date.now();
  let attempts = [];
  try {
    attempts = JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch(e) { attempts = []; }
  // remove tentativas antigas
  attempts = attempts.filter(t => now - t < WINDOW);
  if (attempts.length >= MAX) return false; // bloqueado
  attempts.push(now);
  localStorage.setItem(KEY, JSON.stringify(attempts));
  return true;
}

// ── VALIDAÇÃO E MÁSCARA ───────────────────────

function maskPhone(input) {
  let v = input.value.replace(/\D/g, '');
  if (v.length > 11) v = v.slice(0, 11);
  v = v.length <= 10
    ? v.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3')
    : v.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
  input.value = v;
  validatePhone(input);
  checkLeadForm();
}

function validateName(input) {
  const val = input.value.trim();
  const err = document.getElementById('errName');
  if (!val) {
    input.classList.remove('valid','invalid'); err.textContent = '';
  } else if (val.length < 2) {
    input.classList.add('invalid'); input.classList.remove('valid');
    err.textContent = 'Digite seu nome completo';
  } else if (!/^[A-Za-zÀ-ÿ\s]+$/.test(val)) {
    input.classList.add('invalid'); input.classList.remove('valid');
    err.textContent = 'Use apenas letras';
  } else {
    input.classList.add('valid'); input.classList.remove('invalid');
    err.textContent = '';
  }
  checkLeadForm();
}

function validatePhone(input) {
  const clean = input.value.replace(/\D/g,'');
  const err   = document.getElementById('errPhone');
  if (!input.value) {
    input.classList.remove('valid','invalid'); err.textContent = '';
  } else if (clean.length < 11) {
    input.classList.add('invalid'); input.classList.remove('valid');
    err.textContent = 'Formato: (11) 99999-9999';
  } else {
    input.classList.add('valid'); input.classList.remove('invalid');
    err.textContent = '';
  }
}

function validateEmail(input) {
  const val   = input.value.trim();
  const err   = document.getElementById('errEmail');
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!val) {
    input.classList.remove('valid','invalid'); err.textContent = '';
  } else if (!regex.test(val)) {
    input.classList.add('invalid'); input.classList.remove('valid');
    err.textContent = 'Digite um e-mail válido';
  } else {
    input.classList.add('valid'); input.classList.remove('invalid');
    err.textContent = '';
  }
  checkLeadForm();
}
