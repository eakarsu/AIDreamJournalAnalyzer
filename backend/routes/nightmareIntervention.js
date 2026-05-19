// Recurring nightmare intervention: an agentic Image Rehearsal Therapy
// (IRT) flow — daily prompts and rewriting nightmare narratives.
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
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL || 'anthropic/claude-3-5-sonnet-20241022',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      max_tokens: 1200,
    }),
  });
  const data = await r.json();
  if (data.error) throw new Error(data.error.message);
  return data.choices?.[0]?.message?.content;
}

// POST /api/nightmare-intervention/rewrite { nightmareText }
router.post('/rewrite', auth, aiRateLimiter, async (req, res) => {
  try {
    const { nightmareText } = req.body || {};
    if (!nightmareText || typeof nightmareText !== 'string') {
      return res.status(400).json({ error: 'nightmareText required' });
    }
    const system = 'You are a clinical psychologist guiding an Image Rehearsal Therapy (IRT) exercise. Rewrite the patient nightmare into a neutral or empowering narrative while keeping recognisable elements. Provide: (1) rewritten narrative (2) 3 daily rehearsal prompts (3) calming imagery suggestions.';
    const rewritten = await callOpenRouter(nightmareText, system);
    if (!rewritten) return res.status(503).json({ error: 'LLM not configured' });

    try {
      await pool.query(
        `INSERT INTO ai_analyses (user_id, dream_content, analysis_type, result) VALUES ($1,$2,$3,$4)`,
        [req.user.id, nightmareText, 'irt_rewrite', rewritten]
      );
    } catch {}

    return res.json({ rewritten });
  } catch (e) {
    console.error('IRT rewrite error:', e);
    return res.status(500).json({ error: 'rewrite failed' });
  }
});

// GET /api/nightmare-intervention/daily-prompt — fetch daily IRT prompt
router.get('/daily-prompt', auth, aiRateLimiter, async (req, res) => {
  try {
    let recentNightmare = null;
    try {
      const r = await pool.query(
        `SELECT content FROM dreams WHERE user_id = $1 AND lower(content) LIKE '%nightmare%' ORDER BY created_at DESC LIMIT 1`,
        [req.user.id]
      );
      recentNightmare = r.rows[0]?.content;
    } catch {}

    const system = 'Suggest one short (≤80 words) daily IRT rehearsal prompt for the user, anchored in their recent nightmare if provided.';
    const prompt = recentNightmare
      ? `Recent nightmare: ${recentNightmare}`
      : 'No nightmare context provided. Use a general empowering rehearsal prompt.';
    const out = await callOpenRouter(prompt, system);
    return res.json({ prompt: out || 'Picture yourself stepping calmly through a familiar door, finding safety on the other side.' });
  } catch (e) {
    console.error('daily prompt error:', e);
    return res.status(500).json({ error: 'daily prompt failed' });
  }
});

export default router;
