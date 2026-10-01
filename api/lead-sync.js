const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function supabaseHeaders(prefer) {
  return {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    'Prefer': prefer
  };
}

async function supabaseFetch(path, init) {
  const response = await fetch(`${SUPABASE_URL}${path}`, init);
  const text = await response.text();
  return { ok: response.ok, status: response.status, text };
}

function buildUpsertPayload(payload) {
  return {
    nome:             payload.nome,
    email:            payload.email,
    telefone:         payload.telefone,
    respostas:        payload.respostas,
    resultado:        payload.resultado,
    etapa_atual:      payload.etapa_atual,
    quiz_concluido:   payload.quiz_concluido,
    whatsapp_clicado: payload.whatsapp_clicado ?? false,
    source:           payload.source
  };
}

async function syncResult(payload, res) {
  if (!payload?.email) {
    return res.status(400).json({ error: 'email is required' });
  }

  const result = await supabaseFetch('/rest/v1/leads?on_conflict=email', {
    method: 'POST',
    headers: supabaseHeaders('resolution=merge-duplicates,return=minimal'),
    body: JSON.stringify(buildUpsertPayload(payload))
  });

  if (!result.ok) {
    return res.status(result.status).json({ error: 'failed_to_sync_lead', details: result.text });
  }

  return res.status(200).json({ ok: true });
}

// Captura imediata (submit do formulário, antes do quiz): upsert por email
// só dos dados de contato. Colunas ausentes do body não são tocadas no
// conflito — um lead que já tem respostas/resultado não é sobrescrito.
function buildCapturePayload(payload) {
  return {
    nome:        payload.nome,
    email:       payload.email,
    telefone:    payload.telefone,
    etapa_atual: payload.etapa_atual,
    source:      payload.source
  };
}

async function captureLead(payload, res) {
  if (!payload?.email) {
    return res.status(400).json({ error: 'email is required' });
  }

  const result = await supabaseFetch('/rest/v1/leads?on_conflict=email', {
    method: 'POST',
    headers: supabaseHeaders('resolution=merge-duplicates,return=minimal'),
    body: JSON.stringify(buildCapturePayload(payload))
  });

  if (!result.ok) {
    return res.status(result.status).json({ error: 'failed_to_capture_lead', details: result.text });
  }

  await notifyNewLead(payload);
  return res.status(200).json({ ok: true });
}

// Aviso de lead novo por e-mail (Resend). Só roda se RESEND_API_KEY e
// NOTIFY_EMAIL estiverem configurados na Vercel. Falha aqui nunca derruba
// a captura: o lead já foi salvo antes desta chamada.
function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

async function notifyNewLead(payload) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.NOTIFY_EMAIL;
  if (!apiKey || !to) return;

  const nome = escapeHtml(payload.nome || 'Sem nome');
  const telefone = escapeHtml(payload.telefone || '');
  const digits = String(payload.telefone || '').replace(/\D/g, '');
  const email = String(payload.email || '');
  const emailLinha = email && !email.endsWith('@nao-informado.com')
    ? `<p><b>E-mail:</b> ${escapeHtml(email)}</p>`
    : '';
  const wpp = digits ? `<p><a href="https://wa.me/55${digits}">Abrir conversa no WhatsApp →</a></p>` : '';

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        from: process.env.NOTIFY_FROM || 'ClinUp <onboarding@resend.dev>',
        to: [to],
        subject: `Novo lead no diagnóstico: ${payload.nome || 'sem nome'}`,
        html: `<p><b>Nome:</b> ${nome}</p><p><b>WhatsApp:</b> ${telefone}</p>${emailLinha}${wpp}` +
              '<p>As respostas completas do quiz ficam na tabela <code>leads</code> do Supabase.</p>'
      }),
      signal: controller.signal
    });
    if (!r.ok) console.warn('[CLINUP] Aviso de lead falhou:', r.status, await r.text());
  } catch (err) {
    console.warn('[CLINUP] Aviso de lead falhou:', String((err && err.message) || err));
  } finally {
    clearTimeout(timer);
  }
}

async function markWhatsapp(email, source, res) {
  if (!email) {
    return res.status(400).json({ error: 'email is required' });
  }

  const emailFilter  = encodeURIComponent(`eq.${email}`);
  const sourceFilter = encodeURIComponent(`eq.${source}`);

  const result = await supabaseFetch(
    `/rest/v1/leads?email=${emailFilter}&source=${sourceFilter}`,
    {
      method: 'PATCH',
      headers: supabaseHeaders('return=minimal'),
      body: JSON.stringify({ whatsapp_clicado: true })
    }
  );

  if (!result.ok) {
    return res.status(result.status).json({ error: 'failed_to_mark_whatsapp', details: result.text });
  }

  return res.status(200).json({ ok: true });
}

module.exports = async function handler(req, res) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({
      error: 'missing_server_env',
      details: 'Configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel.'
    });
  }

  if (req.method !== 'POST' && req.method !== 'PATCH') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const body = req.body;
  if (!body || typeof body !== 'object') {
    return res.status(400).json({ error: 'invalid_json' });
  }

  // Exceção não tratada (ex.: URL do Supabase malformada, falha de rede no
  // fetch) vira 500 com mensagem em vez de FUNCTION_INVOCATION_FAILED mudo.
  try {
    if (body.action === 'sync_result') {
      return await syncResult(body.payload || {}, res);
    }

    if (body.action === 'capture_lead') {
      return await captureLead(body.payload || {}, res);
    }

    if (body.action === 'mark_whatsapp') {
      return await markWhatsapp(body.email, body.source || 'quiz_clinup', res);
    }
  } catch (err) {
    // "fetch failed" do undici esconde a causa (DNS, porta, TLS) em err.cause
    const cause = err && err.cause
      ? String(err.cause.message || err.cause.code || err.cause)
      : undefined;
    return res.status(500).json({
      error: 'internal_error',
      details: String((err && err.message) || err),
      cause
    });
  }

  return res.status(400).json({ error: 'unknown_action' });
};
