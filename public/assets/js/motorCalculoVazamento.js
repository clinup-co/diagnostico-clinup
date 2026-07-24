/* ══════════════════════════════════════════════════════════════════════════════
   MOTOR DE CÁLCULO DE VAZAMENTO — Auditoria ClinUp (rota /auditoria)

   Isolado do funil /diagnostico. Exposto como window.MotorAuditoria no browser
   e como module.exports no Node (pra rodar a suíte de aceitação).

   TODAS as saídas financeiras são ESTIMATIVAS a partir do que o médico informa +
   faixas de referência ClinUp (não são médias de mercado auditadas). A UI rotula
   como "Simulação". Ver spec_cto.md (Frente 2).
   ══════════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';

  /* ── Constantes de negócio (spec §3) ──────────────────────────────────────── */
  var SEMANAS_MES = 4.3;
  var CONVERSAO_REFERENCIA = 0.68;
  var FATOR_ATRIBUICAO = 0.5;   // creditamos ao tempo de resposta só 50% do diferencial
  var FATOR_OCUPACAO = 0.4;     // ocupação realista da capacidade ociosa

  var CONVERSAO_POR_RESPOSTA = { ATE_5MIN: 0.68, DE_5_30MIN: 0.38, DE_30MIN_2H: 0.19, ACIMA_2H: 0.09, VARIA: 0.38 };
  var PENALIDADE_COBERTURA   = { AUTOMATIZADA: 1.00, QUANDO_POSSIVEL: 0.85, SO_COMERCIAL: 0.70 };
  var CONTATOS_POR_FAIXA     = { ATE_30: 30, DE_31_80: 31, DE_81_150: 81, ACIMA_150: 151, NAO_SABE: 30 };
  var AUSENCIA_POR_FAIXA     = { ATE_5: 0.05, DE_6_10: 0.06, DE_11_20: 0.11, ACIMA_20: 0.20 };
  var AUSENCIA_REFERENCIA    = 0.05;
  var TAXA_REPOSICAO         = { AUTOMATICA: 0.60, MANUAL: 0.30, FICA_VAGO: 0.10 };

  /* ── Pontuação dos índices IIO (spec §2) ──────────────────────────────────── */
  var PONTOS_IIO = {
    contatos:    { ATE_30: 100, DE_31_80: 100, DE_81_150: 100, ACIMA_150: 100, NAO_SABE: 0 },
    convenio:    { ATE_30: 100, DE_31_50: 70, DE_51_70: 40, ACIMA_70: 15 },
    resposta:    { ATE_5MIN: 100, DE_5_30MIN: 65, DE_30MIN_2H: 30, ACIMA_2H: 10, VARIA: 40 },
    cobertura:   { AUTOMATIZADA: 100, QUANDO_POSSIVEL: 45, SO_COMERCIAL: 10 },
    ausencia:    { ATE_5: 100, DE_6_10: 65, DE_11_20: 30, ACIMA_20: 10, NAO_MEDE: 0 },
    confirmacao: { AUTOMATIZADA: 100, MANUAL: 45, SEM_PROTOCOLO: 10 },
    reposicao:   { AUTOMATICA: 100, MANUAL: 40, FICA_VAGO: 5 }
  };

  var statusPorPonto = function (val) { return val >= 75 ? 'dentro' : (val >= 50 ? 'atencao' : 'critico'); };

  /* ── Normalização dos inputs numéricos (Q1/Q2/Q3) ─────────────────────────── */
  function num(v, def) { var n = parseFloat(v); return (isFinite(n) && n > 0) ? n : def; }

  function normalizar(e) {
    e = e || {};
    var T = num(e.T, 420), C = num(e.C, 40), K = num(e.K, 55);
    if (K < C) K = C; // spec §2 Q3: se capacidade < consultas, força K = C
    return {
      T: T, C: C, K: K,
      contatos: e.contatos, convenio: e.convenio, ausencia: e.ausencia,
      resposta: e.resposta, cobertura: e.cobertura, confirmacao: e.confirmacao, reposicao: e.reposicao
    };
  }

  /* ── Motor financeiro (spec §3) ───────────────────────────────────────────── */
  function calcularVazamento(entrada) {
    var e = normalizar(entrada);

    // Linha 1 — vazamento por resposta no WhatsApp
    var conversaoEfetiva = (CONVERSAO_POR_RESPOSTA[e.resposta] || 0) * (PENALIDADE_COBERTURA[e.cobertura] || 0);
    var L1 = conversaoEfetiva >= CONVERSAO_REFERENCIA
      ? 0
      : (CONTATOS_POR_FAIXA[e.contatos] || 0) * (CONVERSAO_REFERENCIA - conversaoEfetiva) * e.T * FATOR_ATRIBUICAO;

    // Linha 2 — vazamento por ausência não reposta
    var L2 = 0, ausenciaMensuravel = true;
    if (e.ausencia === 'NAO_MEDE') {
      ausenciaMensuravel = false;
    } else {
      var N = AUSENCIA_POR_FAIXA[e.ausencia] || 0;
      var consultasMes = e.C * SEMANAS_MES;
      var agendadasMes = consultasMes / (1 - N);
      L2 = agendadasMes * (N - AUSENCIA_REFERENCIA) * e.T * (1 - (TAXA_REPOSICAO[e.reposicao] || 0));
      if (L2 < 0) L2 = 0;
    }

    // Linha 3 — potencial ocioso (SEPARADO, nunca somado ao vazamento)
    var L3 = Math.max(0, e.K - e.C) * SEMANAS_MES * e.T * FATOR_OCUPACAO;

    var mensal = Math.round(L1 + L2);
    return {
      entrada: e,
      vazamento_mensal: mensal,
      vazamento_anual: mensal * 12,
      detalhe: { resposta: Math.round(L1), ausencia: Math.round(L2) },
      ausencia_mensuravel: ausenciaMensuravel,
      potencial_ocioso_mensal: Math.round(L3),
      ocupacao_pct: e.K > 0 ? (e.C / e.K) * 100 : 0
    };
  }

  /* ── Índices IIO (spec §2) ─────────────────────────────────────────────────── */
  function calcularIIO(entrada) {
    var e = entrada || {};
    var atracao   = ((PONTOS_IIO.contatos[e.contatos] || 0) + (PONTOS_IIO.convenio[e.convenio] || 0)) / 2;
    var conversao = ((PONTOS_IIO.resposta[e.resposta] || 0) + (PONTOS_IIO.cobertura[e.cobertura] || 0)) / 2;
    var blindagem = ((PONTOS_IIO.ausencia[e.ausencia] || 0) + (PONTOS_IIO.confirmacao[e.confirmacao] || 0) + (PONTOS_IIO.reposicao[e.reposicao] || 0)) / 3;
    return {
      atracao:   { valor: Math.round(atracao),   status: statusPorPonto(atracao) },
      conversao: { valor: Math.round(conversao), status: statusPorPonto(conversao) },
      blindagem: { valor: Math.round(blindagem), status: statusPorPonto(blindagem) }
    };
  }

  /* ══════════════════════════════════════════════════════════════════════════
     Dados para os componentes de laudo (painel de marcadores + dumbbell).
     Tabelas por resposta reproduzem os componentes de referência no input do
     teste de aceitação e generalizam pros demais casos. "Piso da faixa": o valor
     exibido é o melhor caso da faixa informada — o real tende a ser igual ou pior.
     ══════════════════════════════════════════════════════════════════════════ */
  var M_RESPOSTA = {
    ATE_5MIN:    { value: 3,   display: '≤ 5 min',      status: 'dentro'  },
    DE_5_30MIN:  { value: 17,  display: '5 – 30 min',   status: 'atencao' },
    DE_30MIN_2H: { value: 75,  display: '30 min – 2 h', status: 'critico' },
    ACIMA_2H:    { value: 120, display: '> 2 h',        status: 'critico' },
    VARIA:       { value: 60,  display: 'Varia muito',  status: 'atencao' }
  };
  var M_COBERTURA = {
    AUTOMATIZADA:    { value: 100, display: 'Cobertura total',     status: 'dentro'  },
    QUANDO_POSSIVEL: { value: 45,  display: 'Parcial',             status: 'atencao' },
    SO_COMERCIAL:    { value: 0,   display: '0% fora do horário',  status: 'critico' }
  };
  var M_AUSENCIA = {
    ATE_5:    { value: 5,  display: '≤ 5%',   status: 'dentro'  },
    DE_6_10:  { value: 8,  display: '6 – 10%', status: 'atencao' },
    DE_11_20: { value: 11, display: '11 – 20%', status: 'critico' },
    ACIMA_20: { value: 20, display: '> 20%',   status: 'critico' },
    NAO_MEDE: { value: 15, display: 'Não medido', status: 'atencao' }
  };
  var M_REPOSICAO = {
    AUTOMATICA: { value: 90, display: 'Acionamento automático', status: 'dentro'  },
    MANUAL:     { value: 30, display: 'Manual, caso a caso',    status: 'atencao' },
    FICA_VAGO:  { value: 5,  display: 'Fica vago',              status: 'critico' }
  };
  var M_CONVENIO = {
    ATE_30:   { value: 30, display: '≤ 30% da receita',  status: 'dentro'  },
    DE_31_50: { value: 40, display: '31 – 50% da receita', status: 'atencao' },
    DE_51_70: { value: 51, display: '51 – 70% da receita', status: 'atencao' },
    ACIMA_70: { value: 75, display: '> 70% da receita',  status: 'critico' }
  };
  var M_CONFIRMACAO = {
    AUTOMATIZADA:  { value: 90, display: 'Automatizado, com resposta', status: 'dentro'  },
    MANUAL:        { value: 45, display: 'Sem cobrança de resposta',   status: 'atencao' },
    SEM_PROTOCOLO: { value: 10, display: 'Sem protocolo',              status: 'critico' }
  };

  function statusOcupacao(pct) { return pct >= 85 ? 'dentro' : (pct >= 70 ? 'atencao' : 'critico'); }

  // Painel de marcadores — contrato do componente clinup_componente_painel_marcadores
  function buildMarcadores(res) {
    var e = res.entrada;
    var ocup = Math.round(res.ocupacao_pct * 10) / 10;
    var mResp = M_RESPOSTA[e.resposta]       || M_RESPOSTA.VARIA;
    var mCob  = M_COBERTURA[e.cobertura]     || M_COBERTURA.QUANDO_POSSIVEL;
    var mAus  = M_AUSENCIA[e.ausencia]       || M_AUSENCIA.NAO_MEDE;
    var mRep  = M_REPOSICAO[e.reposicao]     || M_REPOSICAO.MANUAL;
    var mConv = M_CONVENIO[e.convenio]       || M_CONVENIO.DE_31_50;
    var mConf = M_CONFIRMACAO[e.confirmacao] || M_CONFIRMACAO.MANUAL;
    var contatosMedido = e.contatos && e.contatos !== 'NAO_SABE';

    return [
      { pilar: 'II', label: 'Tempo mediano de 1ª resposta', value: mResp.value, display: mResp.display,
        refFrom: 1, refTo: 5, refLabel: '≤ 5 min', scale: { type: 'log', min: 1, max: 1440 }, status: mResp.status },
      { pilar: 'II', label: 'Cobertura fora do horário comercial', value: mCob.value, display: mCob.display,
        refFrom: 90, refTo: 100, refLabel: '≥ 90%', scale: { type: 'linear', min: 0, max: 100 }, status: mCob.status },
      { pilar: 'III', label: 'Taxa de ausência (no-show)', value: mAus.value, display: mAus.display,
        refFrom: 0, refTo: 5, refLabel: '≤ 5%', scale: { type: 'linear', min: 0, max: 30 }, status: mAus.status },
      { pilar: 'III', label: 'Reposição de vaga liberada', value: mRep.value, display: mRep.display,
        refFrom: 75, refTo: 100, refLabel: 'Acionamento automático', scale: { type: 'linear', min: 0, max: 100 }, status: mRep.status },
      { pilar: 'I', label: 'Dependência de convênio', value: mConv.value, display: mConv.display,
        refFrom: 0, refTo: 40, refLabel: '≤ 40%', scale: { type: 'linear', min: 0, max: 100 }, status: mConv.status },
      { pilar: 'III', label: 'Protocolo de confirmação', value: mConf.value, display: mConf.display,
        refFrom: 75, refTo: 100, refLabel: 'Automatizado, com resposta', scale: { type: 'linear', min: 0, max: 100 }, status: mConf.status },
      { pilar: 'III', label: 'Ocupação da capacidade instalada', value: ocup, display: Math.round(ocup) + '%',
        refFrom: 85, refTo: 100, refLabel: '≥ 85%', scale: { type: 'linear', min: 0, max: 100 }, status: statusOcupacao(ocup) },
      { pilar: 'I', label: 'Rastreabilidade de origem dos contatos', value: contatosMedido ? 100 : 0,
        display: contatosMedido ? 'Volume mensurado' : 'Origem não medida',
        refFrom: 75, refTo: 100, refLabel: 'Origem conhecida', scale: { type: 'linear', min: 0, max: 100 },
        status: contatosMedido ? 'dentro' : 'critico' }
    ];
  }

  // Comparativo dumbbell — contrato do componente clinup_componente_dumbbell_mobile
  function buildComparativo(res) {
    var e = res.entrada;
    var mResp = M_RESPOSTA[e.resposta]   || M_RESPOSTA.VARIA;
    var mCob  = M_COBERTURA[e.cobertura] || M_COBERTURA.QUANDO_POSSIVEL;
    var mAus  = M_AUSENCIA[e.ausencia]   || M_AUSENCIA.NAO_MEDE;
    var mConv = M_CONVENIO[e.convenio]   || M_CONVENIO.DE_31_50;
    var ocup  = Math.round(res.ocupacao_pct);

    var ppMenor = function (ref, val) { return val >= ref ? 'no alvo' : ('−' + (ref - val) + ' p.p.'); };
    var ppMaior = function (ref, val) { return val <= ref ? 'no alvo' : ('+' + (val - ref) + ' p.p.'); };

    var linhas = [
      { label: 'Cobertura fora do horário comercial', value: mCob.value, ref: 90,
        scale: { type: 'linear', min: 0, max: 100 }, delta: ppMenor(90, mCob.value), inverso: true },
      { label: 'Tempo de 1ª resposta', value: mResp.value, ref: 5,
        scale: { type: 'log', min: 1, max: 1440 },
        delta: mResp.value <= 5 ? 'no alvo' : (Math.round(mResp.value / 5) + '× mais lento'), inverso: false },
      { label: 'Ocupação da capacidade', value: ocup, ref: 85,
        scale: { type: 'linear', min: 0, max: 100 }, delta: ppMenor(85, ocup), inverso: true },
      { label: 'Dependência de convênio', value: mConv.value, ref: 40,
        scale: { type: 'linear', min: 0, max: 100 }, delta: ppMaior(40, mConv.value), inverso: false }
    ];
    // Ausência só entra quando é mensurável (Q6 ≠ NÃO MEDE)
    if (e.ausencia !== 'NAO_MEDE') {
      linhas.push({ label: 'Taxa de ausência (no-show)', value: mAus.value, ref: 5,
        scale: { type: 'linear', min: 0, max: 30 }, delta: ppMaior(5, mAus.value), inverso: false });
    }
    return linhas;
  }

  /* ── Export ────────────────────────────────────────────────────────────────── */
  var api = {
    calcularVazamento: calcularVazamento,
    calcularIIO: calcularIIO,
    buildMarcadores: buildMarcadores,
    buildComparativo: buildComparativo,
    _constantes: {
      SEMANAS_MES: SEMANAS_MES, CONVERSAO_REFERENCIA: CONVERSAO_REFERENCIA,
      FATOR_ATRIBUICAO: FATOR_ATRIBUICAO, FATOR_OCUPACAO: FATOR_OCUPACAO, PONTOS_IIO: PONTOS_IIO
    }
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.MotorAuditoria = api;
})(typeof window !== 'undefined' ? window : this);
