// ============================================================
// === Batch 03 Gaps & Frontend Mounts ===
// Auto-generated Gap-feature endpoints (lean v0).
// TODO: configure credentials (set OPENROUTER_API_KEY).
// ============================================================
const express = require('express');
const router = express.Router();

let _gfReady = false;
async function ensureGapTable(pool) {
  if (_gfReady || !pool) return;
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS gap_features (
      id SERIAL PRIMARY KEY,
      slug VARCHAR(120) NOT NULL,
      user_id INT,
      input JSONB,
      output JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);
    _gfReady = true;
  } catch (_) { /* tolerant of missing DB */ }
}

async function callAI(prompt) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return { ok: false, status: 503, error: 'AI service unavailable. Set OPENROUTER_API_KEY (TODO: configure credentials).' };
  try {
    const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL || 'anthropic/claude-3.5-sonnet',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 800,
      }),
    });
    const data = await r.json();
    const text = data?.choices?.[0]?.message?.content || '';
    return { ok: r.ok, status: r.status, text, raw: data };
  } catch (e) {
    return { ok: false, status: 500, error: String(e.message || e) };
  }
}

function buildHandler(slug, label, hint) {
  return async (req, res) => {
    const body = req.body || {};
    const userId = req.user?.id || null;
    const prompt = `Feature: ${label}\nContext hint: ${hint}\nUser input:\n${JSON.stringify(body, null, 2)}\n\nProduce a concise, actionable response.`;
    const ai = await callAI(prompt);
    try {
      const pool = req.app.locals.pool || req.app.get('pool') || null;
      if (pool) {
        await ensureGapTable(pool);
        await pool.query('INSERT INTO gap_features(slug, user_id, input, output) VALUES ($1,$2,$3,$4)',
          [slug, userId, body, { text: ai.text || ai.error || null }]);
      }
    } catch (_) { /* tolerant */ }
    if (!ai.ok) return res.status(ai.status || 500).json({ error: ai.error || ai.text || `Upstream error (${ai.status})`, slug });
    res.json({ slug, label, result: ai.text });
  };
}

router.post('/gap-no-emotion-trajectory-longitudinal-analysis', buildHandler('gap-ai-no-emotion-trajectory-longitudinal-analysis', 'No emotion-trajectory longitudinal analysis', 'No emotion-trajectory longitudinal analysis'));
router.post('/gap-no-cbt-image-rehearsal-therapy-guided-flow', buildHandler('gap-ai-no-cbt-image-rehearsal-therapy-guided-flow', 'No CBT / Image Rehearsal Therapy guided flow', 'No CBT / Image Rehearsal Therapy guided flow'));
router.post('/gap-no-nutrition-medication-correlation-analyser', buildHandler('gap-ai-no-nutrition-medication-correlation-analyser', 'No nutrition/medication correlation analyser', 'No nutrition/medication correlation analyser'));
router.post('/gap-no-vision-model-dream-image-generation', buildHandler('gap-ai-no-vision-model-dream-image-generation', 'No vision-model dream-image generation', 'No vision-model dream-image generation'));
router.post('/gap-no-wearables-biometrics-ingest-no-oura-apple-watch-sync', buildHandler('gap-non-no-wearables-biometrics-ingest-no-oura-apple-watch-sync', 'No wearables/biometrics ingest (no Oura/Apple Watch sync)', 'No wearables/biometrics ingest (no Oura/Apple Watch sync)'));
router.post('/gap-no-notifications-reminder-system', buildHandler('gap-non-no-notifications-reminder-system', 'No notifications / reminder system', 'No notifications / reminder system'));
router.post('/gap-no-webhooks-for-integrations', buildHandler('gap-non-no-webhooks-for-integrations', 'No webhooks for integrations', 'No webhooks for integrations'));
router.post('/gap-no-file-upload-audio-dream-recording-missing', buildHandler('gap-non-no-file-upload-audio-dream-recording-missing', 'No file upload (audio dream recording missing)', 'No file upload (audio dream recording missing)'));
router.post('/gap-no-anonymised-research-corpus-contribution-flow', buildHandler('gap-non-no-anonymised-research-corpus-contribution-flow', 'No anonymised research-corpus contribution flow', 'No anonymised research-corpus contribution flow'));
router.post('/gap-limited-search-no-full-text-dream-search-route', buildHandler('gap-non-limited-search-no-full-text-dream-search-route', 'Limited search (no full-text dream search route)', 'Limited search (no full-text dream search route)'));

module.exports = router;
