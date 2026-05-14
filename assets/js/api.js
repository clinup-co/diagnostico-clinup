// ─────────────────────────────────────────────
// HEADERS padrão para todas as requisições
// ─────────────────────────────────────────────
function serverHeaders() {
  return {
    'Content-Type': 'application/json'
  };
}

// ─────────────────────────────────────────────
// PAYLOAD — monta objeto para envio ao Supabase
// ─────────────────────────────────────────────
function buildSupabasePayload() {
  return {
    nome:             quizLeadData.nome,
    email:            quizLeadData.email,
    telefone:         quizLeadData.telefone,
    respostas:        quizLeadData.respostas,
    resultado:        quizLeadData.resultado,
    etapa_atual:      quizLeadData.etapaAtual,
    quiz_concluido:   quizLeadData.quizConcluido,
    whatsapp_clicado: quizLeadData.whatsappClicado,
    created_at:       quizLeadData.createdAt,
    source:           quizLeadData.source
  };
}

// ─────────────────────────────────────────────
// SUPABASE — insert e update
// ─────────────────────────────────────────────
async function saveLeadToSupabase(attempt) {
  if (_leadSaved) return;
  attempt = attempt || 1;
  const payload = buildSupabasePayload();

  console.log('[CLINUP] Tentativa', attempt, '— payload:', JSON.stringify(payload));
  console.log('[CLINUP] URL:', LEAD_SYNC_URL);

  try {
    const res = await fetch(LEAD_SYNC_URL, {
      method:  'POST',
      headers: serverHeaders(),
      body:    JSON.stringify({
        action: 'sync_result',
        payload
      })
    });

    const body = await res.text();
    console.log('[CLINUP] Status:', res.status, '— Resposta:', body);

    if (res.ok) {
      _leadSaved = true;
      console.log('[CLINUP] Lead salvo com sucesso.');
      return;
    }

    if (attempt < 3) {
      setTimeout(() => saveLeadToSupabase(attempt + 1), attempt * 3000);
    } else {
      console.warn('[CLINUP] Falha após 3 tentativas. Status:', res.status, body);
    }

  } catch(err) {
    console.warn('[CLINUP] Erro de rede na tentativa', attempt, ':', err.message);
    if (attempt < 3) {
      setTimeout(() => saveLeadToSupabase(attempt + 1), attempt * 3000);
    }
  }
}

async function updateWhatsappClicked() {
  if (!quizLeadData.email) return;
  try {
    const res = await fetch(LEAD_SYNC_URL, {
      method:  'PATCH',
      headers: serverHeaders(),
      body:    JSON.stringify({
        action: 'mark_whatsapp',
        email: quizLeadData.email,
        source: quizLeadData.source
      })
    });

    const body = await res.text();
    console.log('[CLINUP] WhatsApp Status:', res.status, '— Resposta:', body);
  } catch(err) {
    console.error('[CLINUP] Erro ao atualizar whatsapp_clicado:', err);
  }
}
