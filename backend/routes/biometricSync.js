// Real-time biometric sync: ingest sleep-stage data from wearables (Oura,
// Apple Watch). v0 stores rows in a `biometric_samples` table if it exists
// and computes a basic dream/REM correlation per dream entry.
import { Router } from 'express';
import pool from '../db.js';
import auth from '../middleware/auth.js';

const router = Router();

// POST /api/biometric-sync/ingest  { provider, samples:[{ts, rem_minutes, deep_minutes, hr, hrv}] }
router.post('/ingest', auth, async (req, res) => {
  try {
    const { provider, samples } = req.body || {};
    if (!provider || !Array.isArray(samples) || samples.length === 0) {
      return res.status(400).json({ error: 'provider and samples[] required' });
    }
    // TODO: configure credentials — OURA_CLIENT_ID / APPLE_HEALTH_TOKEN
    const apiKey = process.env.OURA_API_KEY || process.env.APPLE_HEALTH_TOKEN;
    if (!apiKey && provider !== 'manual') {
      // not fatal — accept manual uploads
    }

    const inserted = [];
    for (const s of samples.slice(0, 500)) {
      try {
        const r = await pool.query(
          `INSERT INTO biometric_samples (user_id, provider, ts, rem_minutes, deep_minutes, heart_rate, hrv)
           VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
          [req.user.id, provider, s.ts || new Date(), s.rem_minutes || null, s.deep_minutes || null, s.hr || null, s.hrv || null]
        );
        inserted.push(r.rows[0].id);
      } catch (e) {
        // table may not exist — return parsed payload only
        break;
      }
    }

    return res.json({ provider, ingested: inserted.length, totalSubmitted: samples.length });
  } catch (e) {
    console.error('biometric ingest error:', e);
    return res.status(500).json({ error: 'ingest failed' });
  }
});

// GET /api/biometric-sync/correlate/:dreamId — basic time-window join
router.get('/correlate/:dreamId', auth, async (req, res) => {
  try {
    const { dreamId } = req.params;
    const dream = await pool.query('SELECT * FROM dreams WHERE id = $1 AND user_id = $2', [dreamId, req.user.id]);
    if (!dream.rows[0]) return res.status(404).json({ error: 'Dream not found' });

    let samples = { rows: [] };
    try {
      samples = await pool.query(
        `SELECT * FROM biometric_samples
         WHERE user_id = $1 AND ts BETWEEN ($2::timestamp - INTERVAL '8 hours') AND $2::timestamp
         ORDER BY ts ASC`,
        [req.user.id, dream.rows[0].created_at || new Date()]
      );
    } catch {}

    const totalRem = samples.rows.reduce((a, b) => a + (b.rem_minutes || 0), 0);
    const totalDeep = samples.rows.reduce((a, b) => a + (b.deep_minutes || 0), 0);

    return res.json({
      dreamId,
      sample_count: samples.rows.length,
      total_rem_minutes: totalRem,
      total_deep_minutes: totalDeep,
      correlation_note: totalRem > 30 ? 'Significant REM window before recall' : 'Low REM signal',
    });
  } catch (e) {
    console.error('biometric correlate error:', e);
    return res.status(500).json({ error: 'correlate failed' });
  }
});

export default router;
