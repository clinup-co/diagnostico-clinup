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

let _leadSaved = false;
