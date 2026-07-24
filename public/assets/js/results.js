// ─────────────────────────────────────────────
// RESULTADO — Laudo de Integridade Operacional (Diagnóstico 2.0)
// Motor de cálculo + índices IIO + painel de marcadores + comparativo dumbbell.
// Portado pro visual dark do site (sem Tailwind); reusa motorCalculoVazamento.js.
// ─────────────────────────────────────────────

// Formata inteiro em R$ pt-BR (sem centavos)
function fmtMoney(n) {
  try { return new Intl.NumberFormat('pt-BR').format(Math.round(n || 0)); }
  catch (e) { return String(Math.round(n || 0)); }
}

var STATUS_LABEL = { critico: 'Gargalo Crítico', atencao: 'Atenção', dentro: 'Dentro da Faixa' };
var STATUS_PESO  = { critico: 0, atencao: 1, dentro: 2 };
var STATUS_HEX   = { critico: '#F4574D', atencao: '#F5A623', dentro: '#2BD576' };

function clampN(n, mn, mx) { mn = (mn == null ? 0 : mn); mx = (mx == null ? 100 : mx); return Math.min(Math.max(n, mn), mx); }
function posicao(valor, escala) {
  var v = clampN(valor, escala.min, escala.max);
  if (escala.type === 'log') {
    var lmin = Math.log(escala.min) / Math.LN10, lmax = Math.log(escala.max) / Math.LN10;
    return ((Math.log(Math.max(v, escala.min)) / Math.LN10 - lmin) / (lmax - lmin)) * 100;
  }
  return ((v - escala.min) / (escala.max - escala.min)) * 100;
}

// Nível pro /consultoria: pior faixa entre os 3 índices IIO
function iioLevel(iio) {
  var f = [iio.atracao.status, iio.conversao.status, iio.blindagem.status];
  if (f.indexOf('critico') >= 0) return 'critical';
  if (f.indexOf('atencao') >= 0) return 'moderate';
  return 'good';
}

// ── Render dos índices IIO ───────────────────────────────────────────────────
function renderIIO(iio) {
  var faixaTxt = { critico: 'Crítico', atencao: 'Atenção', dentro: 'Dentro da faixa' };
  var card = function (nome, ind) {
    return '<div class="iio-card iio-' + ind.status + '">' +
      '<div class="iio-name">' + nome + '</div>' +
      '<div class="iio-val num">' + ind.valor + '</div>' +
      '<div class="iio-faixa">' + faixaTxt[ind.status] + '</div></div>';
  };
  return '<div class="iio-grid">' +
    card('Atração', iio.atracao) + card('Conversão', iio.conversao) + card('Blindagem', iio.blindagem) +
    '</div>';
}

// ── Render do painel de marcadores ───────────────────────────────────────────
function renderMarcadores(res) {
  var dados = MotorAuditoria.buildMarcadores(res).slice()
    .sort(function (a, b) { return STATUS_PESO[a.status] - STATUS_PESO[b.status]; });
  var out = dados.map(function (m) {
    var hex = STATUS_HEX[m.status];
    var ri = posicao(m.refFrom, m.scale), rf = posicao(m.refTo, m.scale);
    var rw = Math.max(rf - ri, 2);
    var tick = clampN(posicao(m.value, m.scale), 1.5, 98.5);
    return '<li class="mk-item">' +
      '<div class="mk-row-top"><span class="mk-label">' + m.label + '<span class="mk-pilar">Pilar ' + m.pilar + '</span></span>' +
        '<span class="mk-status" style="color:' + hex + '">' + STATUS_LABEL[m.status] + '</span></div>' +
      '<div class="mk-track">' +
        '<div class="mk-ref" style="left:' + ri + '%;width:' + rw + '%"></div>' +
        '<div class="mk-tick" style="left:' + tick + '%;background:' + hex + ';box-shadow:0 0 0 6px ' + hex + '22"></div>' +
      '</div>' +
      '<div class="mk-row-bot"><span class="mk-refl">Referência: <b>' + m.refLabel + '</b></span>' +
        '<span class="mk-disp" style="color:' + hex + '">' + m.display + '</span></div>' +
      '</li>';
  }).join('');
  return '<ul class="mk-list">' + out + '</ul>';
}

// ── Render do comparativo dumbbell ───────────────────────────────────────────
var TRIANGULO = '<svg width="12" height="11" viewBox="0 0 11 10" aria-hidden="true"><path d="M5.5 0 11 10H0z" fill="#F4574D"/></svg>';
function renderDumbbell(res) {
  var dados = MotorAuditoria.buildComparativo(res).map(function (d) {
    return { d: d, gap: Math.abs(posicao(d.value, d.scale) - posicao(d.ref, d.scale)) };
  }).sort(function (a, b) { return b.gap - a.gap; }).slice(0, 5);
  var out = dados.map(function (x) {
    var d = x.d;
    var pr = clampN(posicao(d.ref, d.scale), 3, 97), pv = clampN(posicao(d.value, d.scale), 3, 97);
    var esq = Math.min(pr, pv), larg = Math.abs(pv - pr), origem = pv >= pr ? 'left' : 'right';
    return '<li>' +
      '<div class="db-top"><span class="db-label">' + d.label + '</span><span class="db-delta">' + d.delta + '</span></div>' +
      '<div class="db-track">' +
        '<div class="db-base"></div>' +
        '<div class="db-line" style="left:' + esq + '%;width:' + larg + '%;--origem:' + origem + '"></div>' +
        '<div class="db-ref" style="left:' + pr + '%"></div>' +
        '<div class="db-val" style="left:' + pv + '%">' + TRIANGULO + '</div>' +
      '</div></li>';
  }).join('');
  return '<ul class="db-list">' + out + '</ul>';
}

// Revela as linhas do dumbbell (escalonado 80ms; imediato se reduced-motion)
function revealDumbbell() {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var lines = document.querySelectorAll('#result .db-line');
  var vals  = document.querySelectorAll('#result .db-val');
  var on = function (i) {
    if (lines[i]) lines[i].classList.add('on');
    if (vals[i]) vals[i].classList.add('on');
  };
  for (var i = 0; i < lines.length; i++) {
    if (reduce) on(i);
    else (function (idx) { setTimeout(function () { on(idx); }, idx * 80); })(i);
  }
}

// ── Pílulas de autoridade (pesquisa EXTERNA, atribuída — não é prova social da CLINUP) ──
function pillsHTML() {
  return '<div class="pills">' +
    '<div class="pill"><span class="pill-src">HBR</span><span class="pill-txt">Estudo da <b>Harvard Business Review</b> ("The Short Life of Online Sales Leads"): responder um lead em até 5 minutos aumenta em <b>~21×</b> a chance de qualificá-lo, contra 30 minutos.</span></div>' +
    '<div class="pill"><span class="pill-src">MIT</span><span class="pill-txt">Pesquisa do <b>MIT (Lead Response Management)</b>: a chance de contato cai drasticamente a cada minuto — a primeira hora é decisiva pra converter interesse em agendamento.</span></div>' +
    '<div class="pill"><span class="pill-src">MGMA</span><span class="pill-txt">Benchmarks da <b>MGMA</b> apontam o no-show como uma das maiores fontes de perda de receita em clínicas — cada horário vago não se revende.</span></div>' +
    '</div>';
}

// ── Monta o HTML do laudo ────────────────────────────────────────────────────
function buildLaudoHTML(res, iio, motor) {
  var clinica = (quizLeadData.nome || '').trim() || 'Sua clínica';
  var idle = (res.potencial_ocioso_mensal > 0)
    ? '<p class="money-idle">Fora da conta acima: ~R$ ' + fmtMoney(res.potencial_ocioso_mensal) +
      '/mês de <strong>capacidade ociosa</strong> — agenda que caberia mais. Oportunidade de crescimento, <strong>não somada</strong> ao vazamento.</p>'
    : '';
  var naoMede = (!res.ausencia_mensuravel)
    ? '<p class="money-idle">Você indicou não medir a taxa de ausência. Sem medição, essa linha <strong>não entra</strong> no total — que sai subdimensionado. O vazamento real tende a ser maior.</p>'
    : '';

  return '' +
    '<div class="laudo-head">' +
      '<div class="laudo-eyebrow">Laudo de Integridade Operacional</div>' +
      '<div class="laudo-clinica">' + clinica + '</div>' +
      '<div class="laudo-ref">Ref. ' + quizLeadData.refId + ' · gerado pela análise ClinUp</div>' +
      '<span class="laudo-chip">Simulação · estimativa</span>' +
    '</div>' +

    '<div class="money-card">' +
      '<span class="money-chip">Vazamento estimado</span>' +
      '<p class="money-label">Quanto sua clínica deixa na mesa por mês</p>' +
      '<p class="money-value">R$ <span id="laudoMensal">' + fmtMoney(res.vazamento_mensal) + '</span></p>' +
      '<p class="money-year">≈ R$ <span id="laudoAnual">' + fmtMoney(res.vazamento_anual) + '</span> por ano, no cenário atual.</p>' +
      '<p class="money-note">Soma do que escapa por resposta lenta no WhatsApp e por faltas não repostas. <span id="laudoOcioso" hidden></span></p>' +
      idle + naoMede +
    '</div>' +

    '<div class="laudo-recalc">' +
      '<div class="laudo-recalc-h">Ajuste com os seus números reais</div>' +
      '<div class="laudo-recalc-sub">O laudo recalcula na hora conforme você edita.</div>' +
      '<div class="recalc-grid">' +
        '<label>Ticket (R$)<input id="reT" type="number" min="1" max="99999" inputmode="numeric" value="' + motor.T + '" oninput="recalcLaudo()"></label>' +
        '<label>Consultas/sem<input id="reC" type="number" min="1" max="9999" inputmode="numeric" value="' + motor.C + '" oninput="recalcLaudo()"></label>' +
        '<label>Capacidade/sem<input id="reK" type="number" min="1" max="9999" inputmode="numeric" value="' + motor.K + '" oninput="recalcLaudo()"></label>' +
      '</div>' +
    '</div>' +

    '<p class="section-label">Índices de Integridade Operacional (IIO)</p>' +
    renderIIO(iio) +

    '<p class="section-label">Painel de marcadores</p>' +
    '<div id="mkPainel">' + renderMarcadores(res) + '</div>' +

    '<p class="section-label">Sua clínica vs. faixa de referência</p>' +
    '<div id="dbPainel">' + renderDumbbell(res) + '</div>' +
    '<div class="db-legend"><span><span style="width:9px;height:9px;border-radius:50%;background:#2BD576;display:inline-block"></span>Referência</span>' +
      '<span>' + TRIANGULO + ' Sua clínica</span></div>' +

    '<p class="section-label">O que a pesquisa mostra</p>' +
    pillsHTML() +
    '<p class="laudo-conserv">Cálculo conservador: atribuímos apenas <strong>50% da perda</strong> ao fator tempo de resposta — o número exibido é o mínimo real, defensável.</p>' +

    '<p class="laudo-method"><b>Faixas de referência ClinUp</b>, construídas a partir de padrões de clínicas com atendimento e confirmação automatizados — não são médias de mercado auditadas. Os valores são estimativas a partir do que você informou, posicionadas no piso da faixa: o real tende a ser igual ou pior.</p>' +

    '<div class="cta-section" style="margin-top:22px;">' +
      '<div class="cta-eyebrow">Próximo passo</div>' +
      '<h3 class="cta-title">Um plano pra estancar esse vazamento em 30 dias</h3>' +
      '<p class="cta-desc">Numa conversa gratuita, a gente entrega a <strong>ordem de prioridade</strong> pra tapar os gargalos do seu laudo — começando pelo que mais custa. Sem compromisso.</p>' +
      '<a class="laudo-cta" href="/consultoria?resultado=' + ({ good: 'bom', moderate: 'mediano', critical: 'critico' }[quizLeadData.resultado] || 'mediano') + '">Receber meu Plano de Recuperação de 30 dias&nbsp;→</a>' +
      '<button class="btn-restart" onclick="copyResultSummary(this)">Copiar resumo do laudo</button>' +
      '<button class="btn-restart" onclick="restartQuiz()">Refazer o diagnóstico</button>' +
    '</div>';
}

// ── Recálculo ao vivo (T/C/K) ────────────────────────────────────────────────
var _recalcRaf = null, _recalcCur = { mensal: 0, anual: 0 };
function recalcLaudo() {
  var motor = quizLeadData.motor || {};
  var t = parseFloat(document.getElementById('reT').value);
  var c = parseFloat(document.getElementById('reC').value);
  var k = parseFloat(document.getElementById('reK').value);
  if (isFinite(t) && t > 0) motor.T = t;
  if (isFinite(c) && c > 0) motor.C = c;
  if (isFinite(k) && k > 0) motor.K = k;
  quizLeadData.motor = motor;
  var res = MotorAuditoria.calcularVazamento(motor);
  quizLeadData.respostas._vazamento = res;
  persistState();

  // números com tween 400ms (lógica §9)
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var target = { mensal: res.vazamento_mensal, anual: res.vazamento_anual };
  var elM = document.getElementById('laudoMensal'), elA = document.getElementById('laudoAnual');
  if (reduce) { if (elM) elM.textContent = fmtMoney(target.mensal); if (elA) elA.textContent = fmtMoney(target.anual); _recalcCur = target; }
  else {
    var from = { mensal: _recalcCur.mensal, anual: _recalcCur.anual }, t0 = performance.now();
    if (_recalcRaf) cancelAnimationFrame(_recalcRaf);
    (function tick(now) {
      var p = Math.min(1, (now - t0) / 400), e = 1 - Math.pow(1 - p, 3);
      if (elM) elM.textContent = fmtMoney(from.mensal + (target.mensal - from.mensal) * e);
      if (elA) elA.textContent = fmtMoney(from.anual + (target.anual - from.anual) * e);
      if (p < 1) _recalcRaf = requestAnimationFrame(tick); else _recalcCur = target;
    })(t0);
  }
  // marcadores e dumbbell dependem de ocupação (C/K) → re-render (sem re-animar)
  var mk = document.getElementById('mkPainel'); if (mk) mk.innerHTML = renderMarcadores(res);
  var db = document.getElementById('dbPainel'); if (db) { db.innerHTML = renderDumbbell(res); document.querySelectorAll('#dbPainel .db-line,#dbPainel .db-val').forEach(function (el) { el.classList.add('on'); }); }
}

// ── Exibição do resultado ────────────────────────────────────────────────────
function showResult() {
  if (Object.keys(answers).length < TOTAL_PERGUNTAS) return;
  document.querySelectorAll('.question-screen').forEach(q => q.classList.remove('active'));
  document.getElementById('progressWrap').style.display = 'none';
  const resumeNote = document.getElementById('resumeNote');
  if (resumeNote) resumeNote.remove();

  const motor = quizLeadData.motor || {};
  const res = MotorAuditoria.calcularVazamento(motor);
  const iio = MotorAuditoria.calcularIIO(motor);
  if (!quizLeadData.refId) quizLeadData.refId = 'CU-' + Math.random().toString(16).slice(2, 8).toUpperCase();
  _recalcCur = { mensal: res.vazamento_mensal, anual: res.vazamento_anual };

  quizLeadData.resultado     = iioLevel(iio);
  quizLeadData.quizConcluido = true;
  quizLeadData.etapaAtual    = 'resultado';
  // motor + vazamento + iio → Supabase dentro de respostas (jsonb)
  quizLeadData.respostas._motor = motor;
  quizLeadData.respostas._vazamento = res;
  quizLeadData.respostas._iio = iio;
  persistState();
  saveLeadToSupabase();

  const result = document.getElementById('result');
  result.classList.add('show');
  result.innerHTML = buildLaudoHTML(res, iio, motor);
  window.scrollTo({ top: 0, behavior: 'smooth' });
  revealDumbbell();

  const resultadoPt = ({ good: 'bom', moderate: 'mediano', critical: 'critico' })[quizLeadData.resultado] || quizLeadData.resultado;
  trackOnce('result_view', { resultado: resultadoPt });
  trackPixelOnce('ViewContent', { content_name: 'laudo_' + resultadoPt });
}

// ── Copiar resumo do laudo (texto puro) ──────────────────────────────────────
function copyResultSummary(btn) {
  try {
    var motor = quizLeadData.motor || {};
    var res = MotorAuditoria.calcularVazamento(motor);
    var iio = MotorAuditoria.calcularIIO(motor);
    var faixa = { critico: 'crítico', atencao: 'atenção', dentro: 'ok' };
    var lines = [
      'Laudo ClinUp — ' + ((quizLeadData.nome || '').trim() || 'minha clínica') + ' (Ref. ' + quizLeadData.refId + ')',
      'Vazamento estimado: R$ ' + fmtMoney(res.vazamento_mensal) + '/mês (~R$ ' + fmtMoney(res.vazamento_anual) + '/ano)',
      'Capacidade ociosa: R$ ' + fmtMoney(res.potencial_ocioso_mensal) + '/mês (separado)',
      '',
      'Índices (IIO):',
      '- Atração: ' + iio.atracao.valor + ' (' + faixa[iio.atracao.status] + ')',
      '- Conversão: ' + iio.conversao.valor + ' (' + faixa[iio.conversao.status] + ')',
      '- Blindagem: ' + iio.blindagem.valor + ' (' + faixa[iio.blindagem.status] + ')',
      '',
      'Feito em: diagnostico-clinup-lac.vercel.app'
    ];
    var text = lines.join('\n');
    var done = function () {
      var original = btn.textContent;
      btn.textContent = 'Copiado ✓'; btn.disabled = true;
      setTimeout(function () { btn.textContent = original; btn.disabled = false; }, 2200);
    };
    if (navigator.clipboard && navigator.clipboard.writeText)
      navigator.clipboard.writeText(text).then(done).catch(function () { fallbackCopy(text, done); });
    else fallbackCopy(text, done);
  } catch (e) {}
}

function fallbackCopy(text, onDone) {
  try {
    var ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.left = '-9999px';
    document.body.appendChild(ta); ta.select(); document.execCommand('copy');
    document.body.removeChild(ta); onDone();
  } catch (e) {}
}

function onWhatsappClick() {
  quizLeadData.whatsappClicado = true;
  persistState();
  updateWhatsappClicked();
}

function restartQuiz() {
  Object.keys(answers).forEach(k => delete answers[k]);
  Object.assign(quizLeadData, {
    respostas: {}, pontos: {}, motor: {}, resultado: '', etapaAtual: 'formulario',
    quizConcluido: false, whatsappClicado: false, refId: ''
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
