// ─────────────────────────────────────────────
// RESULTADO — Laudo de Integridade Operacional
// Funde a leitura qualitativa (nota 0–100 + achados das 5 perguntas originais)
// com a estimativa em R$ e um bloco de marcadores técnicos EXPLICADOS: cada
// gargalo REAL vem com o que é / por que é problema / quanto custa + prova de
// autoridade. Só rendemos os 3 marcadores medidos de verdade (resposta, no-show,
// ocupação); os demais dependeriam de campos não perguntados (premissa) e ficam
// de fora — nada inventado. Motor reusado de motorCalculoVazamento.js.
// ─────────────────────────────────────────────

var STATUS_LABEL = { critico: 'Gargalo crítico', atencao: 'Atenção', dentro: 'Dentro da faixa' };
var STATUS_PESO  = { critico: 0, atencao: 1, dentro: 2 };
var STATUS_HEX   = { critico: '#F4574D', atencao: '#F5A623', dentro: '#2BD576' };

// Formata inteiro em R$ pt-BR (sem centavos)
function fmtMoney(n) {
  try { return new Intl.NumberFormat('pt-BR').format(Math.round(n || 0)); }
  catch (e) { return String(Math.round(n || 0)); }
}

function clampN(n, mn, mx) { mn = (mn == null ? 0 : mn); mx = (mx == null ? 100 : mx); return Math.min(Math.max(n, mn), mx); }

// Posição 0–100 de um valor na escala (linear ou log) — usada na barra mk-track
function posicao(valor, escala) {
  var v = clampN(valor, escala.min, escala.max);
  if (escala.type === 'log') {
    var lmin = Math.log(escala.min) / Math.LN10, lmax = Math.log(escala.max) / Math.LN10;
    return ((Math.log(Math.max(v, escala.min)) / Math.LN10 - lmin) / (lmax - lmin)) * 100;
  }
  return ((v - escala.min) / (escala.max - escala.min)) * 100;
}

// ── Nome do responsável ──────────────────────────────────────────────────────
// O gate captura 1 nome. Usamos como responsável (Dr(a). Primeiro-nome) e
// falamos da clínica de forma neutra ("sua operação").
function drNome() {
  var full = (quizLeadData.nome || '').trim();
  if (!full) return '';
  var first = full.split(/\s+/)[0];
  if (!first) return '';
  return 'Dr(a). ' + first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}

// ── Estimativa em R$ (5 perguntas financeiras + motor de cálculo) ─────────────
// Input do motor: os 5 números informados (T/C/K/resposta/ausencia) + premissas
// conservadoras nas NÃO-perguntadas (as que produzem o MENOR vazamento — mantém
// o número defensável). ATENÇÃO: passar o motor "cru" ao cálculo zera L1
// (CONTATOS_POR_FAIXA[undefined]=0), então TODO caminho — render inicial e
// recálculo — tem que passar por aqui.
function motorInput(overrides) {
  return Object.assign(
    { contatos: 'ATE_30', cobertura: 'AUTOMATIZADA', reposicao: 'AUTOMATICA', convenio: 'ATE_30', confirmacao: 'AUTOMATIZADA' },
    quizLeadData.motor || {},
    overrides || {}
  );
}

function computeVazamento() {
  if (!(window.MotorAuditoria && window.MotorAuditoria.calcularVazamento)) return null;
  return window.MotorAuditoria.calcularVazamento(motorInput());
}

// ── Marcadores técnicos explicados (núcleo do laudo) ─────────────────────────
// Cada gargalo REAL vira um card respirado. Só os 3 medidos entram; casamos por
// label com a saída de buildMarcadores (fonte de valor/escala/status/faixa).
var GARGALO_SPECS = [
  {
    label: 'Tempo mediano de 1ª resposta',
    nome: 'Tempo de 1ª resposta no WhatsApp',
    tipo: 'vazamento',
    custo: function (v) { return v.detalhe.resposta; },
    oque: 'É quanto tempo, em média, um paciente espera pela primeira resposta quando chama sua clínica.',
    porque: 'Interesse tem prazo curto de validade. Cada minuto de espera é gente que já resolveu em outro lugar — e some sem avisar.',
    prova: [
      { src: 'HBR', txt: 'Estudo da <b>Harvard Business Review</b> ("The Short Life of Online Sales Leads"): responder um contato em até 5 minutos aumenta em <b>~21×</b> a chance de qualificá-lo, contra 30 minutos.' },
      { src: 'MIT', txt: 'Pesquisa do <b>MIT (Lead Response Management)</b>: a chance de contato cai a cada minuto — a primeira hora é decisiva pra virar interesse em consulta marcada.' }
    ]
  },
  {
    label: 'Taxa de ausência (no-show)',
    nome: 'Taxa de faltas (no-show)',
    tipo: 'vazamento',
    custo: function (v) { return v.detalhe.ausencia; },
    oque: 'É a fatia de pacientes agendados que não aparece — e cujo horário fica vago, sem reposição.',
    porque: 'A hora médica não se revende: quando alguém falta e a vaga não é preenchida, aquela receita do dia não volta mais.',
    prova: [
      { src: 'MGMA', txt: 'Benchmarks da <b>MGMA</b> apontam o no-show como uma das maiores fontes de perda de receita em clínicas — cada horário vago não se revende.' }
    ]
  },
  {
    label: 'Ocupação da capacidade instalada',
    nome: 'Ocupação da agenda',
    tipo: 'oportunidade',
    custo: function (v) { return v.potencial_ocioso_mensal; },
    oque: 'É quanto da sua capacidade de atendimento está de fato preenchida — consultas feitas vs. consultas que caberiam.',
    porque: 'Capacidade instalada é estoque perecível: a cadeira parada num horário livre não volta. Agenda folgada é crescimento parado.',
    prova: [
      { src: 'Operação', txt: 'Princípio operacional: capacidade ociosa não é perda contábil, mas é <b>receita potencial não capturada</b> — por isso entra separada, como oportunidade, e não somada ao vazamento.' }
    ]
  }
];

// Casa cada spec com o marcador medido; identifica o ponto cego do no-show.
function gargaloData(res) {
  if (!res) return [];
  var mk = MotorAuditoria.buildMarcadores(res);
  var byLabel = {};
  mk.forEach(function (m) { byLabel[m.label] = m; });
  return GARGALO_SPECS.map(function (spec) {
    var m = byLabel[spec.label];
    if (!m) return null;
    var blind = spec.label === 'Taxa de ausência (no-show)' && !res.ausencia_mensuravel;
    var status = blind ? 'atencao' : m.status;
    return {
      spec: spec, m: m, blind: blind, status: status,
      peso: STATUS_PESO[status],
      // ponto cego não conta como gargalo quantificado (Regra 1)
      gargalo: !blind && status !== 'dentro'
    };
  }).filter(Boolean).sort(function (a, b) { return a.peso - b.peso; });
}

// Linha "Quanto custa" — amarra ao R$ real do motor
function custoLinha(item, res) {
  var v = item.spec.custo(res) || 0;
  if (item.spec.tipo === 'oportunidade') {
    return v > 0
      ? '~R$ <b>' + fmtMoney(v) + '</b>/mês de agenda que caberia mais — oportunidade de crescimento, não somada ao vazamento.'
      : 'Sua agenda está praticamente cheia — sem capacidade ociosa relevante.';
  }
  if (item.blind) return 'Sem medição, essa linha fica de fora do total — o vazamento real tende a ser maior.';
  return v > 0
    ? 'R$ <b>' + fmtMoney(v) + '</b>/mês escapando por aqui, na estimativa conservadora.'
    : 'Sem perda estimada por aqui — está dentro da faixa de referência.';
}

function renderOneCard(item, res) {
  var spec = item.spec, m = item.m, hex = STATUS_HEX[item.status];

  if (item.blind) {
    return '<div class="gc gc-blind">' +
      '<div class="gc-head"><span class="gc-name">' + spec.nome + '</span>' +
        '<span class="gc-chip" style="color:' + STATUS_HEX.atencao + ';border-color:' + STATUS_HEX.atencao + '55">Ponto cego</span></div>' +
      '<div class="gc-exp">' +
        '<div class="gc-line"><span class="gc-k">O que é</span><span class="gc-v">' + spec.oque + '</span></div>' +
        '<div class="gc-line"><span class="gc-k">Por que importa</span><span class="gc-v">Você indicou <b>não medir</b> as faltas. Sem esse número, não dá pra dimensionar a perda — e o total do laudo sai por baixo.</span></div>' +
        '<div class="gc-line"><span class="gc-k">Quanto custa</span><span class="gc-v">' + custoLinha(item, res) + '</span></div>' +
      '</div>' +
      '<div class="gc-proof">' + spec.prova.map(function (p) {
        return '<div class="pill"><span class="pill-src">' + p.src + '</span><span class="pill-txt">' + p.txt + '</span></div>';
      }).join('') + '</div>' +
    '</div>';
  }

  var ri = posicao(m.refFrom, m.scale), rf = posicao(m.refTo, m.scale);
  var rw = Math.max(rf - ri, 2);
  var tick = clampN(posicao(m.value, m.scale), 1.5, 98.5);

  return '<div class="gc gc-' + item.status + '">' +
    '<div class="gc-head"><span class="gc-name">' + spec.nome + '</span>' +
      '<span class="gc-chip" style="color:' + hex + ';border-color:' + hex + '55">' + STATUS_LABEL[item.status] + '</span></div>' +
    '<div class="mk-track">' +
      '<div class="mk-ref" style="left:' + ri + '%;width:' + rw + '%"></div>' +
      '<div class="mk-tick" style="left:' + tick + '%;background:' + hex + ';box-shadow:0 0 0 6px ' + hex + '22"></div>' +
    '</div>' +
    '<div class="mk-row-bot"><span class="mk-refl">Referência: <b>' + m.refLabel + '</b></span>' +
      '<span class="mk-disp" style="color:' + hex + '">' + m.display + '</span></div>' +
    '<div class="gc-exp">' +
      '<div class="gc-line"><span class="gc-k">O que é</span><span class="gc-v">' + spec.oque + '</span></div>' +
      '<div class="gc-line"><span class="gc-k">Por que é um problema</span><span class="gc-v">' + spec.porque + '</span></div>' +
      '<div class="gc-line"><span class="gc-k">Quanto custa</span><span class="gc-v">' + custoLinha(item, res) + '</span></div>' +
    '</div>' +
    '<div class="gc-proof">' + spec.prova.map(function (p) {
      return '<div class="pill"><span class="pill-src">' + p.src + '</span><span class="pill-txt">' + p.txt + '</span></div>';
    }).join('') + '</div>' +
  '</div>';
}

function renderGargaloCards(res) {
  return gargaloData(res).map(function (item) { return renderOneCard(item, res); }).join('');
}

// ── Money card (com ids pro recálculo ao vivo) ───────────────────────────────
function buildMoneyBreak(res) {
  var linhas = '';
  var temResp  = res.detalhe.resposta > 0;
  var temFalta = res.ausencia_mensuravel && res.detalhe.ausencia > 0;
  if (temResp || temFalta) {
    linhas = '<div class="money-lines">' +
      (temResp ? '<div class="money-line"><span>Resposta lenta no WhatsApp</span><b>R$ ' + fmtMoney(res.detalhe.resposta) + '/mês</b></div>' : '') +
      (temFalta ? '<div class="money-line"><span>Faltas não repostas</span><b>R$ ' + fmtMoney(res.detalhe.ausencia) + '/mês</b></div>' : '') +
      '</div>';
  }
  var idle = (res.potencial_ocioso_mensal > 0)
    ? '<p class="money-idle">Fora da conta acima: ~R$ ' + fmtMoney(res.potencial_ocioso_mensal) +
      '/mês de <strong>capacidade ociosa</strong> — agenda que caberia mais. Oportunidade de crescimento, <strong>não somada</strong> ao vazamento.</p>'
    : '';
  var naoMede = (!res.ausencia_mensuravel)
    ? '<p class="money-idle">Você indicou não medir a taxa de ausência. Sem medição, essa linha <strong>não entra</strong> no total — que sai subdimensionado.</p>'
    : '';
  return linhas + idle + naoMede;
}

function buildMoneyCard(res) {
  return '<div class="money-card">' +
    '<span class="money-chip">Vazamento estimado</span>' +
    '<p class="money-label">Quanto sua operação deixa na mesa por mês</p>' +
    '<p class="money-value">R$ <span id="laudoMensal">' + fmtMoney(res.vazamento_mensal) + '</span></p>' +
    '<p class="money-year">≈ R$ <span id="laudoAnual">' + fmtMoney(res.vazamento_anual) + '</span> por ano, no cenário atual.</p>' +
    '<div id="laudoBreak">' + buildMoneyBreak(res) + '</div>' +
    '<p class="money-note">Soma do que escapa por resposta lenta no WhatsApp e por faltas não repostas, com premissas conservadoras onde faltou dado. O valor exato a gente levanta na conversa.</p>' +
  '</div>';
}

// ── Recálculo ao vivo (T/C/K) — tween 400ms nos R$ + re-render dos cards ─────
var _recalcRaf = null, _recalcCur = { mensal: 0, anual: 0 };
function recalcLaudo() {
  var m = quizLeadData.motor || (quizLeadData.motor = {});
  var t = parseFloat(document.getElementById('reT').value);
  var c = parseFloat(document.getElementById('reC').value);
  var k = parseFloat(document.getElementById('reK').value);
  if (isFinite(t) && t > 0) m.T = t;
  if (isFinite(c) && c > 0) m.C = c;
  if (isFinite(k) && k > 0) m.K = k;

  var res = MotorAuditoria.calcularVazamento(motorInput());
  quizLeadData.respostas._vazamento = res;
  persistState();

  var target = { mensal: res.vazamento_mensal, anual: res.vazamento_anual };
  var elM = document.getElementById('laudoMensal'), elA = document.getElementById('laudoAnual');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) {
    if (elM) elM.textContent = fmtMoney(target.mensal);
    if (elA) elA.textContent = fmtMoney(target.anual);
    _recalcCur = target;
  } else {
    var from = { mensal: _recalcCur.mensal, anual: _recalcCur.anual }, t0 = performance.now();
    if (_recalcRaf) cancelAnimationFrame(_recalcRaf);
    (function tick(now) {
      var p = Math.min(1, (now - t0) / 400), e = 1 - Math.pow(1 - p, 3);
      if (elM) elM.textContent = fmtMoney(from.mensal + (target.mensal - from.mensal) * e);
      if (elA) elA.textContent = fmtMoney(from.anual + (target.anual - from.anual) * e);
      if (p < 1) _recalcRaf = requestAnimationFrame(tick); else _recalcCur = target;
    })(t0);
  }
  // quebra do money-card e cards de gargalo dependem de T/C/K → re-render direto
  var brk = document.getElementById('laudoBreak'); if (brk) brk.innerHTML = buildMoneyBreak(res);
  var gc = document.getElementById('gcPainel'); if (gc) gc.innerHTML = renderGargaloCards(res);
}

// ── Montagem do laudo ────────────────────────────────────────────────────────
function buildLaudoHTML(model, vaz) {
  var nome = drNome();
  var pt = ({ good: 'bom', moderate: 'mediano', critical: 'critico' })[model.level] || 'mediano';

  // 1 · Cabeçalho do laudo
  var head = '<div class="laudo-head">' +
    '<div class="laudo-eyebrow">Laudo de Integridade Operacional</div>' +
    '<div class="laudo-clinica">' + (nome ? 'Emitido para ' + nome : 'Laudo da sua operação') + '</div>' +
    '<div class="laudo-ref">Ref: ' + (quizLeadData.refId || 'CU-------') + ' · análise ClinUp</div>' +
    '<span class="laudo-chip">Simulação · estimativa</span>' +
  '</div>';

  // 2 · Nota + badge + título + tese + achados (5 perguntas qualitativas)
  var insightsHTML = model.insights.map(function (i) {
    return '<div class="finding">' +
      '<div class="finding-icon ' + i.type + '">' + i.icon + '</div>' +
      '<div class="finding-body"><div class="finding-title">' + i.title + '</div>' +
      '<div class="finding-desc">' + i.desc + '</div></div></div>';
  }).join('');

  var scoreCard = '<div class="score-card ' + model.level + '">' +
    '<div class="score-ring" id="scoreRing">' +
      '<svg viewBox="0 0 120 120" aria-hidden="true">' +
        '<circle class="score-ring-track" cx="60" cy="60" r="52"></circle>' +
        '<circle class="score-ring-fill" cx="60" cy="60" r="52"></circle>' +
      '</svg><div class="score-ring-num"><span id="scoreNum">0</span>%</div>' +
    '</div>' + model.badge +
    '<h2 class="result-title">' + model.title + '</h2>' +
    '<p class="result-sub">' + model.subtitle + '</p>' +
    '<p class="result-thesis">' + model.thesis + '</p>' +
    '<p class="score-method">Score do seu perfil — captação, canal e conversão de pacientes. Abaixo, a estimativa em reais a partir dos seus números.</p>' +
  '</div>' +
  '<p class="section-label">' + model.sectionLabel + '</p>' +
  '<div class="findings">' + insightsHTML + '</div>';

  // Sem motor disponível: entrega só a leitura qualitativa + CTA simples
  if (!vaz) {
    return head + scoreCard + buildCTA(model, pt, 0);
  }

  var itens = gargaloData(vaz);
  var n = itens.filter(function (x) { return x.gargalo; }).length;
  var hasLeak = vaz.vazamento_mensal > 0;

  // 3 · Veredito personalizado + money card
  var quem = nome ? nome + ',' : 'Sua operação:';
  var verdict;
  if (n > 0 && hasLeak) {
    verdict = '<p class="laudo-verdict">' + quem + ' sua operação apresenta um vazamento estimado de ' +
      '<b class="v-money">R$ ' + fmtMoney(vaz.vazamento_mensal) + '/mês</b>, decorrente de ' +
      '<b>' + n + (n === 1 ? ' gargalo' : ' gargalos') + '</b> identificado' + (n === 1 ? '' : 's') + ' abaixo.</p>';
  } else if (n > 0) {
    verdict = '<p class="laudo-verdict">' + quem + ' identificamos <b>' + n + (n === 1 ? ' ponto' : ' pontos') +
      '</b> fora da faixa de referência — o detalhe de cada um está abaixo.</p>';
  } else {
    verdict = '<p class="laudo-verdict laudo-verdict--good">' + quem + ' os marcadores medidos estão <b>dentro da faixa de referência</b> — nenhum gargalo crítico no atendimento. Abaixo, o detalhe de cada um.</p>';
  }

  var moneyBlock = hasLeak ? buildMoneyCard(vaz) : '';

  // 4 · Recálculo ao vivo (só faz sentido quando há vazamento a estancar)
  var recalc = hasLeak ? (
    '<div class="laudo-recalc">' +
      '<div class="laudo-recalc-h">Ajuste com os seus números reais</div>' +
      '<div class="laudo-recalc-sub">O laudo recalcula na hora conforme você edita.</div>' +
      '<div class="recalc-grid">' +
        '<label>Ticket (R$)<input id="reT" type="number" min="1" max="99999" inputmode="numeric" value="' + vaz.entrada.T + '" oninput="recalcLaudo()"></label>' +
        '<label>Consultas/sem<input id="reC" type="number" min="1" max="9999" inputmode="numeric" value="' + vaz.entrada.C + '" oninput="recalcLaudo()"></label>' +
        '<label>Capacidade/sem<input id="reK" type="number" min="1" max="9999" inputmode="numeric" value="' + vaz.entrada.K + '" oninput="recalcLaudo()"></label>' +
      '</div>' +
    '</div>'
  ) : '';

  // 5 · Marcadores técnicos explicados (1 card por gargalo medido)
  var cards = '<p class="section-label">Marcadores técnicos, explicados</p>' +
    '<div id="gcPainel">' + itens.map(function (item) { return renderOneCard(item, vaz); }).join('') + '</div>';

  // 6 · Conservadorismo + rodapé de metodologia
  var conserv = (vaz.detalhe.resposta > 0)
    ? '<p class="laudo-conserv">Cálculo conservador: atribuímos apenas <strong>50% da perda</strong> ao fator tempo de resposta — o número exibido é o mínimo defensável.</p>'
    : '';
  var method = '<p class="laudo-method"><b>Faixas de referência ClinUp</b>, construídas a partir de padrões de clínicas com atendimento e confirmação automatizados — não são médias de mercado auditadas. Os valores são estimativas a partir do que você informou, posicionadas no piso da faixa: o real tende a ser igual ou pior.</p>';

  return head + scoreCard + verdict + moneyBlock + recalc + cards + conserv + method + buildCTA(model, pt, vaz.vazamento_mensal);
}

// 7 · CTA de conversão — ancoragem R$ 500 + escassez, quebra de objeção com Ref/R$
function buildCTA(model, pt, mensal) {
  var refTxt = quizLeadData.refId ? 'do seu Ref: ' + quizLeadData.refId : 'do seu laudo';
  var desc = (mensal > 0)
    ? 'A sessão de diagnóstico costuma custar <strong>R$ 500</strong> — pra quem concluiu o laudo, é <strong>gratuita</strong>. Numa conversa, a gente entrega a <strong>ordem de prioridade</strong> pra tapar os gargalos ' + refTxt + ', começando pelos <strong>R$ ' + fmtMoney(mensal) + '/mês</strong> que escapam. Vagas limitadas pela agenda.'
    : 'A sessão de diagnóstico costuma custar <strong>R$ 500</strong> — pra quem concluiu o laudo, é <strong>gratuita</strong>. Numa conversa, a gente aponta os próximos ajustes ' + refTxt + ' pra você crescer com controle. Vagas limitadas pela agenda.';
  return '<div class="cta-section" style="margin-top:22px;">' +
    '<div class="cta-eyebrow">Próximo passo</div>' +
    '<h3 class="cta-title">Um plano pra estancar esse vazamento em 30 dias</h3>' +
    '<p class="cta-desc">' + desc + '</p>' +
    '<a class="laudo-cta" href="/consultoria?resultado=' + pt + '">Receber meu Plano de Recuperação de 30 dias&nbsp;→</a>' +
    '<button class="btn-restart" onclick="copyResultSummary(this)">Copiar resumo do laudo</button>' +
    '<button class="btn-restart" onclick="restartQuiz()">Refazer o diagnóstico</button>' +
  '</div>';
}

// ── Exibição do resultado ────────────────────────────────────────────────────
function showResult() {
  if (Object.keys(answers).length < TOTAL_PERGUNTAS) return;
  document.querySelectorAll('.question-screen').forEach(q => q.classList.remove('active'));
  document.getElementById('progressWrap').style.display = 'none';
  const resumeNote = document.getElementById('resumeNote');
  if (resumeNote) resumeNote.remove();

  const model = buildPresentationModel();
  const vaz   = computeVazamento(); // estimativa em R$ das 5 perguntas financeiras
  if (!quizLeadData.refId) quizLeadData.refId = 'CU-' + Math.random().toString(16).slice(2, 8).toUpperCase();
  _recalcCur = vaz ? { mensal: vaz.vazamento_mensal, anual: vaz.vazamento_anual } : { mensal: 0, anual: 0 };

  const result = document.getElementById('result');
  result.classList.add('show');
  window.scrollTo({ top: 0, behavior: 'smooth' });

  quizLeadData.resultado     = model.level;
  quizLeadData.quizConcluido = true;
  quizLeadData.etapaAtual    = 'resultado';
  quizLeadData.respostas._motor = quizLeadData.motor || {};
  if (vaz) quizLeadData.respostas._vazamento = vaz;
  persistState();
  saveLeadToSupabase();
  const resultadoPt = ({ good: 'bom', moderate: 'mediano', critical: 'critico' })[model.level] || model.level;
  trackOnce('result_view', { resultado: resultadoPt });
  trackPixelOnce('ViewContent', { content_name: 'laudo_' + resultadoPt });

  result.innerHTML = buildLaudoHTML(model, vaz);
  animateScoreRing(model.score);
}

// ── Círculo de score (donut SVG) — cor interpolada + preenchimento animado ──
function scoreColor(score) {
  // Vermelho → âmbar → verde por interpolação RGB: progressão contínua, bonita e
  // visível sobre o card dark (paleta da landing: loss/warn/gain).
  const v = Math.max(0, Math.min(100, score)) / 100;
  const red = [244, 87, 77], amber = [245, 166, 35], green = [43, 213, 118];
  let c1, c2, t;
  if (v < 0.5) { c1 = red;   c2 = amber; t = v / 0.5; }
  else         { c1 = amber; c2 = green; t = (v - 0.5) / 0.5; }
  const rgb = c1.map((a, i) => Math.round(a + (c2[i] - a) * t));
  return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
}

function animateScoreRing(score) {
  const CIRC = 2 * Math.PI * 52; // ≈ 326.726
  const fill = document.querySelector('#scoreRing .score-ring-fill');
  const num  = document.getElementById('scoreNum');
  if (!fill || !num) return;

  const target  = Math.max(0, Math.min(100, Math.round(score)));
  const color   = scoreColor(target);
  const offset  = CIRC * (1 - target / 100);
  fill.style.stroke = color;
  num.style.color   = 'var(--white)';

  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) {
    fill.style.strokeDashoffset = offset;
    num.textContent = target;
    return;
  }

  // anel: dispara a transição CSS (de cheio → alvo) no próximo frame
  fill.style.strokeDashoffset = CIRC;
  requestAnimationFrame(() => { fill.style.strokeDashoffset = offset; });

  // número: conta de 0 → target em ~1.2s
  const DURATION = 1200;
  const start = performance.now();
  (function tick(now) {
    const t = Math.min(1, (now - start) / DURATION);
    const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
    num.textContent = Math.round(eased * target);
    if (t < 1) requestAnimationFrame(tick);
    else num.textContent = target;
  })(start);
}

// Resumo do laudo em texto puro — o usuário leva o diagnóstico com ele
// (colar em nota, mandar pro sócio, guardar). Clipboard API com fallback.
function copyResultSummary(btn) {
  try {
    const model = buildPresentationModel();
    const label = {
      good: 'Boa base', moderate: 'Uns pontos soltos', critical: 'Vários pontos travando'
    }[model.level] || model.level;
    const vaz = computeVazamento();
    const lines = [
      'Laudo ClinUp — ' + ((quizLeadData.nome || '').trim() || 'minha clínica') +
        (quizLeadData.refId ? ' (Ref: ' + quizLeadData.refId + ')' : ''),
      'Resultado: ' + model.score + '% · ' + label
    ];
    if (vaz && vaz.vazamento_mensal > 0) {
      lines.push('Vazamento estimado: R$ ' + fmtMoney(vaz.vazamento_mensal) + '/mês (~R$ ' + fmtMoney(vaz.vazamento_anual) + '/ano)');
    }
    lines.push('', 'Principais achados:');
    model.insights.forEach(i => lines.push('- ' + i.title));
    lines.push('', 'Feito em: diagnostico-clinup-lac.vercel.app');
    const text = lines.join('\n');

    const confirm = () => {
      const original = btn.textContent;
      btn.textContent = 'Copiado ✓';
      btn.disabled = true;
      setTimeout(() => { btn.textContent = original; btn.disabled = false; }, 2200);
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(confirm).catch(() => fallbackCopy(text, confirm));
    } else {
      fallbackCopy(text, confirm);
    }
  } catch (e) {}
}

function fallbackCopy(text, onDone) {
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    onDone();
  } catch (e) {}
}

function onWhatsappClick() {
  quizLeadData.whatsappClicado = true;
  persistState();
  updateWhatsappClicked();
}

function buildWhatsAppMessage(level, insights) {
  const label = {
    good:     'Boa base',
    moderate: 'Uns pontos soltos',
    critical: 'Vários pontos travando'
  }[level] || level;

  const gargalos = insights.filter(i => i.severity !== 'strength');
  const pontos   = gargalos.length > 0 ? gargalos.slice(0, 4) : insights.slice(0, 3);
  const bullets  = pontos.map(i => `- ${i.title}`).join('\n');

  return encodeURIComponent([
    'Olá, fiz o diagnóstico da CLINUP e quero entender meus resultados.',
    '',
    `Resultado: ${label}`,
    '',
    'Principais pontos:',
    bullets,
    '',
    'Quero entender o que vocês recomendam para minha clínica.'
  ].join('\n'));
}

function personalizeTitle(title) {
  const fullName = (quizLeadData.nome || '').trim();
  if (!fullName) return title;
  const firstRaw = fullName.split(/\s+/)[0];
  if (!firstRaw) return title;
  const first = firstRaw.charAt(0).toUpperCase() + firstRaw.slice(1).toLowerCase();
  return first + ', ' + title.charAt(0).toLowerCase() + title.slice(1);
}

function buildPresentationModel() {
  // Score 0–100 das respostas; o nível (e toda a copy dinâmica) deriva das faixas do score.
  const score = getScore();

  let level;
  if (score >= 71)      level = 'good';
  else if (score >= 46) level = 'moderate';
  else                  level = 'critical';

  let badge, title, subtitle, ctaTitle, ctaDesc, ctaLabel, sectionLabel;
  if (level === 'good') {
    badge        = '<div class="result-badge good"><svg viewBox="0 0 24 24"><path d="M21.801 10A10 10 0 1 1 17 3.335"/><path d="m9 11 3 3L22 4"/></svg>Boa base</div>';
    title        = 'Sua clínica já vai bem. Agora é só ajustar uns detalhes.';
    subtitle     = 'As pessoas já te acham, entram em contato e parte marca consulta. Agora a gente vê onde <strong>uns ajustes pequenos fazem você fechar mais</strong>, com regularidade.';
    ctaTitle     = 'Sua base é boa — dá pra extrair mais dela';
    ctaDesc      = 'Numa sessão rápida, a gente te mostra os 2 ou 3 ajustes que mais fazem diferença no seu caso — e monta seu plano de ação. <strong>Gratuita e direto ao ponto.</strong>';
    ctaLabel     = 'Quero ver onde melhorar';
    sectionLabel = 'O que achamos — e onde dá pra melhorar';
  } else if (level === 'moderate') {
    badge        = '<div class="result-badge moderate"><svg viewBox="0 0 24 24"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>Uns pontos soltos</div>';
    title        = 'Sua clínica atrai gente. Mas perde paciente no meio do caminho.';
    subtitle     = 'Chega gente interessada, mas <strong>parte some antes de marcar</strong>. Falta seu site, seu WhatsApp e seu atendimento trabalharem juntos.';
    ctaTitle     = 'Você já atrai — falta parar de perder';
    ctaDesc      = 'Numa sessão rápida, a gente te mostra onde os pacientes estão escapando e monta com você o plano de ação. <strong>Gratuita e sem compromisso.</strong>';
    ctaLabel     = 'Quero ver onde estou perdendo';
    sectionLabel = 'O que achamos na sua clínica';
  } else {
    badge        = '<div class="result-badge critical"><svg viewBox="0 0 24 24"><path d="M7.86 2h8.28L22 7.86v8.28L16.14 22H7.86L2 16.14V7.86z"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>Vários pontos travando</div>';
    title        = 'Tem mais de uma coisa travando sua clínica ao mesmo tempo.';
    subtitle     = 'Quando o site, o jeito de te achar e o WhatsApp falham juntos, você perde muito mais paciente no caminho. <strong>Cada ponto tem conserto — e a ordem de arrumar importa.</strong>';
    ctaTitle     = 'Cada semana assim custa pacientes';
    ctaDesc      = 'Quanto antes você tiver seu plano de ação na mão, menos consulta perde. A sessão é <strong>gratuita e direto ao ponto</strong>.';
    ctaLabel     = 'Quero entender por onde começar';
    sectionLabel = 'O que está travando sua clínica';
  }

  const insights = selectInsights(level);
  title = personalizeTitle(title);
  return {
    level, score, badge, title, subtitle,
    thesis:          buildThesis(),
    insights,
    ctaTitle, ctaDesc, ctaLabel, sectionLabel,
    whatsappPrefill: buildWhatsAppMessage(level, insights)
  };
}

function buildThesis() {
  const a            = answers;
  const goodSite     = a[1] === 0;
  const weakSite     = a[1] >= 2;
  const multiChannel = a[2] === 0;
  const onlyRef      = a[2] === 2;
  const goodConv     = a[3] === 0;
  const badConv      = a[3] === 2;

  if (goodSite && goodConv && multiChannel)
    return 'Está tudo no lugar: te acham, chega gente e ela marca consulta. <strong>Agora é crescer com calma e controle.</strong>';
  if (goodSite && goodConv && (onlyRef || a[2] === 1))
    return 'Quem fala com você acaba marcando. O cuidado é como o paciente te encontra: <strong>depender de um lugar só é arriscado</strong> — se ele cai, some paciente.';
  if (goodSite && badConv && multiChannel)
    return 'Chega gente de vários lugares, mas parte some entre o primeiro contato e marcar a consulta. <strong>O problema está no WhatsApp.</strong>';
  if (goodSite && badConv)
    return 'As pessoas te acham, mas você perde na hora de fechar. Não falta gente interessada — <strong>falta transformar esse interesse em consulta marcada</strong>.';
  if (goodSite && a[3] === 1 && multiChannel)
    return 'Chega gente de vários lugares. Agora é <strong>melhorar a hora de fechar</strong>, pra mais gente marcar consulta.';
  if (goodSite && a[3] === 1)
    return 'O básico está no lugar, mas dá pra melhorar como te acham e como você fecha. <strong>São os dois pontos que mais mudam o número de pacientes.</strong>';
  if (weakSite && goodConv)
    return 'Quando alguém chega, você fecha bem. O problema é antes: <strong>pouca gente te encontra e te procura</strong>.';
  if (weakSite && badConv)
    return 'Tem dois problemas ao mesmo tempo: pouca gente te acha, e quem chega não fecha. <strong>Com os dois fracos, você perde paciente em dobro.</strong>';
  return 'O teste mostrou pontos certos pra arrumar. <strong>Cada um ajustado ajuda sua clínica a ser achada, atender melhor e marcar mais consultas.</strong>';
}

function selectInsights(level) {
  const a    = answers;
  const pool = [];

  // Q1 — Presença digital
  if (a[1] === 3) {
    if (level === 'moderate')
      pool.push({icon:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>', type:'orange', severity:'warning',
        title:'Sem site',
        desc:'Quem procura sua clínica no Google não acha nada que passe confiança. O paciente desiste antes de falar com você.'});
    else
      pool.push({icon:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>', type:'red',    severity:'warning',
        title:'Sem site',
        desc:'Quem procura sua clínica no Google não acha nada que passe confiança. O paciente desiste antes de falar com você.'});
  } else if (a[1] === 2)
    pool.push({icon:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>', type:'orange', severity:'warning',
      title:'Site fraco',
      desc:'Site velho ou bagunçado passa impressão de descuido. Às vezes atrapalha mais do que ajuda.'});
  else
    pool.push({icon:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>', type:'blue',   severity:'strength',
      title:'Você é achado na internet',
      desc:'O básico funciona. Agora é fazer ele trazer paciente de verdade, não só existir.'});

  // Q2 — Atração de interessados
  if (a[2] === 2)
    pool.push({icon:'<svg viewBox="0 0 24 24"><path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg>', type:'orange', severity:'warning',
      title:'Depende de indicação',
      desc:'Indicação é ótimo sinal, mas você não controla. Quando para de vir, para de chegar paciente novo.'});
  else if (a[2] === 1)
    pool.push({icon:'<svg viewBox="0 0 24 24"><path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg>', type:'orange', severity:'opportunity',
      title:'Você depende de um lugar só',
      desc:'Crescer com um lugar só funciona até certo ponto. Se ele cair, seu paciente novo cai junto — e isso você não controla.'});
  else
    pool.push({icon:'<svg viewBox="0 0 24 24"><path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg>', type:'blue',   severity:'strength',
      title:'O paciente te acha de vários jeitos',
      desc:'Isso é ótimo. Agora é olhar o que chega de cada lugar e garantir que vire consulta.'});

  // Q3 — Conversão no WhatsApp
  if (a[3] === 2) {
    if (level === 'moderate')
      pool.push({icon:'<svg viewBox="0 0 24 24"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>', type:'orange', severity:'warning',
        title:'Muita gente some no WhatsApp',
        desc:'O WhatsApp é onde o paciente decide. Perder gente ali, na maioria das vezes, é falta de organização — não falta de interesse.'});
    else
      pool.push({icon:'<svg viewBox="0 0 24 24"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>', type:'red',    severity:'warning',
        title:'Muita gente some no WhatsApp',
        desc:'O WhatsApp é onde o paciente decide. Perder gente ali, na maioria das vezes, é falta de organização — não falta de interesse.'});
  } else if (a[3] === 1)
    pool.push({icon:'<svg viewBox="0 0 24 24"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>', type:'orange', severity:'opportunity',
      title:'Dá pra fechar mais no WhatsApp',
      desc:'Metade fechando é metade escapando. Com o atendimento organizado, esse número sobe sem precisar de mais gente.'});
  else
    pool.push({icon:'<svg viewBox="0 0 24 24"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>', type:'blue',   severity:'strength',
      title:'Você fecha bem no WhatsApp',
      desc:'Quem fala com você, marca. Agora é trazer mais gente certa até aqui.'});

  // Q4 — Prontidão (level-aware)
  if (level === 'good') {
    if (a[4] === 0)
      pool.push({icon:'<svg viewBox="0 0 24 24"><path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/></svg>', type:'blue',   severity:'opportunity',
        title:'Pronto pra dar o próximo passo',
        desc:'Sua clínica está preparada. Um olhar mais de perto mostra os pontos certos pra melhorar e crescer com controle.'});
    else if (a[4] === 1)
      pool.push({icon:'<svg viewBox="0 0 24 24"><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>', type:'blue',   severity:'opportunity',
        title:'Bom momento pra olhar de perto',
        desc:'Com o básico no lugar, agora é achar o que dá pra melhorar e fazer com calma e plano.'});
    else
      pool.push({icon:'<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>', type:'blue',   severity:'opportunity',
        title:'Boa hora pra planejar o próximo nível',
        desc:'Avaliar antes de agir é o certo quando a base já está firme. Um olhar organizado mostra o que vale a pena fazer primeiro.'});
  } else if (level === 'critical') {
    if (a[4] === 0)
      pool.push({icon:'<svg viewBox="0 0 24 24"><path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/></svg>', type:'blue',   severity:'opportunity',
        title:'Você quer agir — agora é definir a ordem',
        desc:'Ver que precisa agir já é o começo. O teste já achou os problemas — falta decidir por qual começar.'});
    else if (a[4] === 1)
      pool.push({icon:'<svg viewBox="0 0 24 24"><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>', type:'orange', severity:'opportunity',
        title:'Você tem um prazo — mas os problemas seguem',
        desc:'Ter um prazo é melhor do que nenhum. Cada ponto arrumado destrava uma parte da sua clínica.'});
    else
      pool.push({icon:'<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>', type:'orange', severity:'opportunity',
        title:'Por onde começar — essa é a pergunta certa',
        desc:'Saber a ordem de arrumar faz toda diferença quando tem vários problemas juntos. O teste já mostrou — falta virar um plano.'});
  } else {
    if (a[4] === 0)
      pool.push({icon:'<svg viewBox="0 0 24 24"><path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/></svg>', type:'blue',   severity:'opportunity',
        title:'Boa hora pra organizar',
        desc:'Estar pronto pra agir é uma vantagem. Com os pontos achados, arrumar agora faz você perder menos tempo e menos paciente.'});
    else if (a[4] === 1)
      pool.push({icon:'<svg viewBox="0 0 24 24"><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>', type:'orange', severity:'opportunity',
        title:'Dá pra melhorar agora',
        desc:'Ter um prazo é melhor do que nenhum. Enquanto as pontas seguem soltas, sua clínica rende menos do que podia.'});
    else
      pool.push({icon:'<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>', type:'orange', severity:'opportunity',
        title:'Ainda avaliando? Esse é o próximo passo',
        desc:'Entender antes de agir faz sentido. Com as pontas soltas, ver as prioridades ajuda a decidir por onde começar.'});
  }

  // Q5 — Faturamento
  if (a[5] === 3)
    pool.push({icon:'<svg viewBox="0 0 24 24"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5.76.76 1.23 1.52 1.41 2.5"/></svg>', type:'orange', severity:'opportunity',
      title:'Começo de jornada — muito a crescer',
      desc:'Clínicas nessa fase são as que mais têm espaço pra crescer. Organizar agora como você traz paciente acelera muito o que vem.'});
  else if (a[5] === 2)
    pool.push({icon:'<svg viewBox="0 0 24 24"><path d="M16 7h6v6"/><path d="m22 7-8.5 8.5-5-5L2 17"/></svg>', type:'blue',   severity:'strength',
      title:'Você está crescendo',
      desc:'Sua clínica está crescendo. Com um jeito mais organizado de trazer paciente, isso acelera e fica mais previsível.'});
  else if (a[5] === 1)
    pool.push({icon:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>', type:'blue',   severity:'strength',
      title:'Clínica firme',
      desc:'Tem paciente e o serviço funciona. O próximo nível é trazer paciente de um jeito que não dependa da sorte.'});
  else if ((quizLeadData.respostas || {}).faturamento_mensal !== 'Prefiro não informar')
    pool.push({icon:'<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>', type:'blue',   severity:'strength',
      title:'Clínica estabelecida',
      desc:'O volume alto mostra que dá certo. Agora o desafio é continuar crescendo com organização, não só no esforço.'});

  const warnings      = pool.filter(i => i.severity === 'warning');
  const strengths     = pool.filter(i => i.severity === 'strength');
  const opportunities = pool.filter(i => i.severity === 'opportunity');

  if (level === 'critical')
    return [...warnings.slice(0, 3), ...opportunities.slice(0, 1), ...strengths.slice(0, 1)];
  if (level === 'moderate')
    return [...warnings.slice(0, 2), ...opportunities.slice(0, 1), ...strengths.slice(0, 2)];
  return [...strengths.slice(0, 3), ...opportunities.slice(0, 2)];
}

function restartQuiz() {
  Object.keys(answers).forEach(k => delete answers[k]);
  Object.assign(quizLeadData, {
    respostas: {}, pontos: {}, motor: {}, refId: '', resultado: '', etapaAtual: 'formulario',
    quizConcluido: false, whatsappClicado: false
  });
  _leadSaved = false;
  localStorage.removeItem('clinup_lead');
  localStorage.removeItem('clinup_answers');
  localStorage.removeItem('clinup_version');
  document.querySelectorAll('.opt').forEach(o => { o.classList.remove('selected'); o.dataset.selected = 'false'; });
  document.querySelectorAll('.btn-next').forEach(b => b.classList.remove('enabled'));
  document.getElementById('result').classList.remove('show');
  document.getElementById('result').innerHTML = '';
  document.getElementById('progressWrap').style.display = '';
  document.getElementById('progressWrap').classList.add('show');
  showQuestion(1);
}
