const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

function supabaseHeaders(prefer) {
  return {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    'Prefer': prefer
  };
}

async function supabaseFetch(path, init = {}) {
  const response = await fetch(`${SUPABASE_URL}${path}`, init);
  const text = await response.text();
  return { ok: response.ok, status: response.status, text };
}

// Campos enviados no upsert.
// created_at é excluído: o banco usa DEFAULT now() na inserção e preserva em updates.
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

async function syncResult(payload) {
  if (!payload?.email) {
    return jsonResponse(400, { error: 'email is required' });
  }

  // Upsert via on_conflict=email:
  // - Se o email não existe → INSERT
  // - Se o email já existe → UPDATE dos campos enviados (created_at preservado)
  const result = await supabaseFetch('/rest/v1/leads?on_conflict=email', {
    method: 'POST',
    headers: supabaseHeaders('resolution=merge-duplicates,return=minimal'),
    body: JSON.stringify(buildUpsertPayload(payload))
  });

  if (!result.ok) {
    return jsonResponse(result.status, {
      error: 'failed_to_sync_lead',
      details: result.text
    });
  }

  return jsonResponse(200, { ok: true });
}

async function markWhatsapp(email, source = 'quiz_clinup') {
  if (!email) {
    return jsonResponse(400, { error: 'email is required' });
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
    return jsonResponse(result.status, {
      error: 'failed_to_mark_whatsapp',
      details: result.text
    });
  }

  return jsonResponse(200, { ok: true });
}

export default async (req) => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return jsonResponse(500, {
      error: 'missing_server_env',
      details: 'Configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Netlify.'
    });
  }

  if (req.method !== 'POST' && req.method !== 'PATCH') {
    return jsonResponse(405, { error: 'method_not_allowed' });
  }

  let body = {};
  try {
    body = await req.json();
  } catch {
    return jsonResponse(400, { error: 'invalid_json' });
  }

  if (body.action === 'sync_result') {
    return syncResult(body.payload || {});
  }

  if (body.action === 'mark_whatsapp') {
    return markWhatsapp(body.email, body.source);
  }

  return jsonResponse(400, { error: 'unknown_action' });
};
