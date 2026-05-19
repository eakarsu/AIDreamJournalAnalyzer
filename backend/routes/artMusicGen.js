// Art/music generation: create accompaniment to dream narratives.
// v0 generates a Suno-style music prompt + a soundscape description; calls
// the underlying provider when configured.
import { Router } from 'express';
import pool from '../db.js';
import auth from '../middleware/auth.js';
import { aiRateLimiter } from '../middleware/rateLimiter.js';

const router = Router();

async function callOpenRouter(prompt, systemPrompt) {
  const apiKey = process.env.OPENROUTER_API_KEY; // TODO: configure credentials
  if (!apiKey) return null;
  const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL || 'anthropic/claude-3-5-sonnet-20241022',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      max_tokens: 800,
    }),
  });
  const j = await r.json();
  return j.choices?.[0]?.message?.content;
}

async function sunoGenerate(prompt) {
  // TODO: configure credentials — SUNO_API_KEY
  const key = process.env.SUNO_API_KEY;
  if (!key) return null;
  const r = await fetch('https://api.suno.ai/v1/generate', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, instrumental: true, duration: 60 }),
  });
  if (!r.ok) return null;
  return await r.json();
}

// POST /api/art-music/compose { dreamId? OR dreamText, mood? }
router.post('/compose', auth, aiRateLimiter, async (req, res) => {
  try {
    const { dreamId, dreamText, mood } = req.body || {};
    let text = dreamText;
    if (!text && dreamId) {
      const r = await pool.query('SELECT content FROM dreams WHERE id = $1 AND user_id = $2', [dreamId, req.user.id]);
      if (!r.rows[0]) return res.status(404).json({ error: 'Dream not found' });
      text = r.rows[0].content;
    }
    if (!text) return res.status(400).json({ error: 'dreamId or dreamText required' });

    const system = 'You are a music director composing ambient dream accompaniment. Output JSON: {"music_prompt":"...","instruments":["..."],"tempo_bpm":int,"mood":"...","soundscape":"..."}.';
    const directive = await callOpenRouter(`Dream: ${text.slice(0, 1500)}\nMood hint: ${mood || 'auto'}`, system);
    let parsed;
    try {
      parsed = directive ? JSON.parse(directive.match(/\{[\s\S]*\}/)?.[0] || '{}') : {};
    } catch {
      parsed = { music_prompt: directive };
    }

    const music = parsed.music_prompt ? await sunoGenerate(parsed.music_prompt) : null;

    return res.json({ directive: parsed, music_provider_result: music });
  } catch (e) {
    console.error('art-music error:', e);
    return res.status(500).json({ error: 'compose failed' });
  }
});

export default router;
