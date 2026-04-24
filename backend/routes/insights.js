import { Router } from 'express';
import pool from '../db.js';
import auth from '../middleware/auth.js';

const router = Router();

router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM dream_insights WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM dream_insights WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Insight not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { title, content, insight_type, related_dreams, significance } = req.body;
    const result = await pool.query(
      `INSERT INTO dream_insights (user_id, title, content, insight_type, related_dreams, significance)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.user.id, title, content, insight_type, related_dreams || [], significance]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { title, content, insight_type, related_dreams, significance } = req.body;
    const result = await pool.query(
      `UPDATE dream_insights SET title=$1, content=$2, insight_type=$3, related_dreams=$4, significance=$5
       WHERE id=$6 AND user_id=$7 RETURNING *`,
      [title, content, insight_type, related_dreams, significance, req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Insight not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM dream_insights WHERE id = $1 AND user_id = $2 RETURNING *',
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Insight not found' });
    res.json({ message: 'Insight deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
