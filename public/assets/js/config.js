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

// 10 perguntas: as 5 ORIGINAIS (qualitativas — nota+achados) + 5 novas
// financeiras (Q6..Q10) que alimentam a estimativa em R$ do motor.
const PERGUNTA_LABELS = {
  1: 'presenca_digital',
  2: 'canal_captacao',
  3: 'conversao_whatsapp',
  4: 'urgencia_decisao',
  5: 'faturamento_mensal',
  6: 'ticket_medio',
  7: 'consultas_semana',
  8: 'capacidade_semana',
  9: 'tempo_resposta',
  10: 'taxa_falta'
};

// Mapa pergunta → campo do motor. Só as 5 financeiras (Q6..Q10) alimentam o
// cálculo; as 5 originais (Q1..Q5) seguem gerando só a nota/achados.
const MOTOR_FIELD = {
  6: 'T', 7: 'C', 8: 'K', 9: 'resposta', 10: 'ausencia'
};
const NUMERIC_Q = { 6: true, 7: true, 8: true };
const TOTAL_PERGUNTAS = 10;

const STATE_VERSION = '7';

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
