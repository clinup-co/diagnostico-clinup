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
  motor:           {},   // inputs do motor de cálculo (ticket, faltas, resposta...)
  resultado:       '',
  etapaAtual:      'inicio',
  quizConcluido:   false,
  whatsappClicado: false,
  createdAt:       '',
  source:          'quiz_clinup'
};

// 10 perguntas: 3 numéricas (T/C/K) + 7 de operação. Cada uma alimenta o motor.
// Ordem da spec §3: contatos, convênio, resposta, cobertura, falta, confirmação, reposição.
const PERGUNTA_LABELS = {
  1: 'ticket_medio',
  2: 'consultas_semana',
  3: 'capacidade_semana',
  4: 'volume_contatos',
  5: 'dependencia_convenio',
  6: 'tempo_resposta',
  7: 'cobertura_fora_horario',
  8: 'taxa_falta',
  9: 'protocolo_confirmacao',
  10: 'reposicao_vaga'
};

// Mapa pergunta → campo do motor de cálculo (motorCalculoVazamento.js)
const MOTOR_FIELD = {
  1: 'T', 2: 'C', 3: 'K',
  4: 'contatos', 5: 'convenio', 6: 'resposta',
  7: 'cobertura', 8: 'ausencia', 9: 'confirmacao', 10: 'reposicao'
};
const NUMERIC_Q = { 1: true, 2: true, 3: true };
const TOTAL_PERGUNTAS = 10;

const STATE_VERSION = '6';

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
