// Cron diário (vercel.json → crons): faz uma leitura mínima no Supabase pra
// o projeto do plano grátis não ser pausado por inatividade.
const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

module.exports = async function handler(req, res) {
  // Se CRON_SECRET estiver configurado, a Vercel manda "Authorization: Bearer <segredo>"
  // nas chamadas do cron. Sem ele, qualquer um poderia disparar esta rota.
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'missing_server_env' });
  }

  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/leads?select=email&limit=1`, {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      }
    });
    return res.status(r.ok ? 200 : 502).json({ ok: r.ok, status: r.status });
  } catch (err) {
    return res.status(500).json({ error: 'internal_error', details: String(err && err.message || err) });
  }
};
