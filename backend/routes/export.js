import { Router } from 'express';
import pool from '../db.js';
import auth from '../middleware/auth.js';

const router = Router();

// GET /api/export/journal - export dreams with mood and sleep data as CSV or JSON
router.get('/journal', auth, async (req, res) => {
  try {
    const { format = 'json', date_from, date_to } = req.query;

    let query = `
      SELECT
        de.id, de.title, de.content, de.dream_date, de.mood, de.sleep_quality,
        de.is_lucid, de.category, de.tags, de.created_at,
        me.mood AS mood_entry, me.intensity AS mood_intensity, me.notes AS mood_notes,
        sq.hours_slept, sq.quality_rating, sq.bedtime, sq.wake_time
      FROM dream_entries de
      LEFT JOIN mood_entries me ON me.user_id = de.user_id AND me.entry_date = de.dream_date
      LEFT JOIN sleep_quality sq ON sq.user_id = de.user_id AND sq.sleep_date = de.dream_date
      WHERE de.user_id = $1
    `;
    const params = [req.user.id];
    let paramIdx = 2;

    if (date_from) {
      query += ` AND de.dream_date >= $${paramIdx++}`;
      params.push(date_from);
    }
    if (date_to) {
      query += ` AND de.dream_date <= $${paramIdx++}`;
      params.push(date_to);
    }
    query += ' ORDER BY de.dream_date DESC';

    const result = await pool.query(query, params);
    const dreams = result.rows;

    if (format === 'csv') {
      const headers = [
        'id', 'title', 'content', 'dream_date', 'mood', 'sleep_quality',
        'is_lucid', 'category', 'tags', 'mood_entry', 'mood_intensity',
        'mood_notes', 'hours_slept', 'quality_rating', 'bedtime', 'wake_time', 'created_at'
      ];

      const escape = (val) => {
        if (val === null || val === undefined) return '';
        const str = Array.isArray(val) ? val.join(';') : String(val);
        return `"${str.replace(/"/g, '""')}"`;
      };

      const csvRows = [
        headers.join(','),
        ...dreams.map(row => headers.map(h => escape(row[h])).join(','))
      ];

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="dream_journal.csv"');
      return res.send(csvRows.join('\n'));
    }

    // Default JSON
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="dream_journal.json"');
    return res.json({
      exported_at: new Date().toISOString(),
      total: dreams.length,
      dreams
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/export/ai-analyses - export all AI analyses for user as JSON
router.get('/ai-analyses', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM ai_analyses WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="ai_analyses.json"');
    return res.json({
      exported_at: new Date().toISOString(),
      total: result.rows.length,
      analyses: result.rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
