// Audio dream capture: mobile-friendly voice recording with transcription.
// Accepts a base64 audio blob, forwards to Whisper, persists as a dream.
import { Router } from 'express';
import pool from '../db.js';
import auth from '../middleware/auth.js';
import { aiRateLimiter } from '../middleware/rateLimiter.js';

const router = Router();

async function transcribeBase64(base64, mimeType = 'audio/webm') {
  // TODO: configure credentials — OPENAI_API_KEY for Whisper
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) return null;
  const buf = Buffer.from(base64, 'base64');
  const form = new FormData();
  form.append('file', new Blob([buf], { type: mimeType }), 'recording.webm');
  form.append('model', 'whisper-1');
  const r = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${openaiKey}` },
    body: form,
  });
  if (!r.ok) return null;
  const j = await r.json();
  return j.text || null;
}

// POST /api/audio-dream/capture { audio_base64, mimeType?, title? }
router.post('/capture', auth, aiRateLimiter, async (req, res) => {
  try {
    const { audio_base64, mimeType, title } = req.body || {};
    if (!audio_base64 || typeof audio_base64 !== 'string') {
      return res.status(400).json({ error: 'audio_base64 required' });
    }
    if (audio_base64.length > 8 * 1024 * 1024) {
      return res.status(413).json({ error: 'audio too large (>8MB base64)' });
    }

    const transcript = await transcribeBase64(audio_base64, mimeType);
    if (!transcript) {
      return res.status(503).json({ error: 'Transcription provider not configured (OPENAI_API_KEY)' });
    }

    let dreamId = null;
    try {
      const r = await pool.query(
        `INSERT INTO dreams (user_id, title, content, source) VALUES ($1,$2,$3,$4) RETURNING id`,
        [req.user.id, title || 'Voice capture', transcript, 'audio']
      );
      dreamId = r.rows[0].id;
    } catch (e) {
      // schema may not include `source`; fall back without it
      try {
        const r = await pool.query(
          `INSERT INTO dreams (user_id, title, content) VALUES ($1,$2,$3) RETURNING id`,
          [req.user.id, title || 'Voice capture', transcript]
        );
        dreamId = r.rows[0].id;
      } catch (e2) {
        console.warn('audio dream persistence failed:', e2);
      }
    }

    return res.json({ dream_id: dreamId, transcript });
  } catch (e) {
    console.error('audio capture error:', e);
    return res.status(500).json({ error: 'audio capture failed' });
  }
});

export default router;
