// Dream collage generator: vision/image model creates mood boards from
// dream text. v0 calls an image-gen endpoint when configured; otherwise
// returns prompt and palette suggestions.
import { Router } from 'express';
import pool from '../db.js';
import auth from '../middleware/auth.js';
import { aiRateLimiter } from '../middleware/rateLimiter.js';

const router = Router();

async function imageGen(prompt) {
  // TODO: configure credentials — STABILITY_API_KEY or OPENAI_API_KEY
  const stabilityKey = process.env.STABILITY_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  if (stabilityKey) {
    const r = await fetch('https://api.stability.ai/v2beta/stable-image/generate/core', {
      method: 'POST',
      headers: { Authorization: `Bearer ${stabilityKey}`, Accept: 'application/json' },
      body: new URLSearchParams({ prompt, output_format: 'png' }),
    });
    if (r.ok) {
      const j = await r.json();
      return { provider: 'stability', image: j.image };
    }
  }
  if (openaiKey) {
    const r = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: { Authorization: `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'dall-e-3', prompt: prompt.slice(0, 1000), n: 1, size: '1024x1024' }),
    });
    if (r.ok) {
      const j = await r.json();
      return { provider: 'openai', url: j.data?.[0]?.url };
    }
  }
  return null;
}

// POST /api/dream-collage/generate { dreamId } OR { dreamText }
router.post('/generate', auth, aiRateLimiter, async (req, res) => {
  try {
    const { dreamId, dreamText } = req.body || {};
    let text = dreamText;
    if (!text && dreamId) {
      const r = await pool.query('SELECT content FROM dreams WHERE id = $1 AND user_id = $2', [dreamId, req.user.id]);
      if (!r.rows[0]) return res.status(404).json({ error: 'Dream not found' });
      text = r.rows[0].content;
    }
    if (!text) return res.status(400).json({ error: 'dreamId or dreamText required' });

    const imagePrompt = `Mood-board collage capturing the dream below. Surreal, soft-lit, painterly. Dream: ${text.slice(0, 600)}`;
    const result = await imageGen(imagePrompt);

    if (!result) {
      return res.json({
        image: null,
        suggested_prompt: imagePrompt,
        palette: ['#2c1b47', '#7d5fff', '#f7c873', '#f7f1e1'],
        notice: 'Image generation provider not configured',
      });
    }
    return res.json({ image: result, suggested_prompt: imagePrompt });
  } catch (e) {
    console.error('dream-collage error:', e);
    return res.status(500).json({ error: 'collage failed' });
  }
});

export default router;
