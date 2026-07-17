// ─────────────────────────────────────────────
// CONFIGURAÇÃO GLOBAL — constantes e estado central
// ─────────────────────────────────────────────
const LEAD_SYNC_URL = '/api/lead-sync';

const quizLeadData = {
  nome:            '',
  email:           '',
  telefone:        '',
  respostas:       {},
  pontos:          {},
  resultado:       '',
  etapaAtual:      'formulario',
  quizConcluido:   false,
  whatsappClicado: false,
  createdAt:       '',
  source:          'quiz_clinup'
};

const PERGUNTA_LABELS = {
  1: 'presenca_digital',
  2: 'canal_captacao',
  3: 'conversao_whatsapp',
  4: 'urgencia_decisao',
  5: 'faturamento_mensal'
};

const STATE_VERSION = '3';

const answers = {};

let _leadSaved    = false; // sync completo no resultado (sync_result)
let _leadCaptured = false; // captura imediata no submit do formulário (capture_lead)

// ─────────────────────────────────────────────
// ANALYTICS — Vercel Web Analytics (eventos custom)
// window.va é o stub enfileirador definido no <head>; se o script
// /_vercel/insights não carregar (ad blocker etc.), vira no-op.
// ─────────────────────────────────────────────
const _trackedOnce = {};

function track(name, data) {
  try {
    window.va && window.va('event', { name: name, data: data || {} });
  } catch (e) {}
}

// Dispara um evento no máximo 1x por carregamento de página
function trackOnce(name, data) {
  if (_trackedOnce[name]) return;
  _trackedOnce[name] = true;
  track(name, data);
}

// ─────────────────────────────────────────────
// META PIXEL — eventos padrão (Lead, ViewContent, Contact)
// window.fbq é definido pelo snippet no <head>; se o script for
// bloqueado (ad blocker etc.), vira no-op — nunca quebra o funil.
// ─────────────────────────────────────────────
const _pixelTrackedOnce = {};

function trackPixel(name, data) {
  try {
    window.fbq && window.fbq('track', name, data || {});
  } catch (e) {}
}

// Dispara um evento do Pixel no máximo 1x por carregamento de página
function trackPixelOnce(name, data) {
  if (_pixelTrackedOnce[name]) return;
  _pixelTrackedOnce[name] = true;
  trackPixel(name, data);
}
