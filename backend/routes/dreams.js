import { Router } from 'express';
import pool from '../db.js';
import auth from '../middleware/auth.js';

const router = Router();

router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM dream_entries WHERE user_id = $1 ORDER BY dream_date DESC',
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
      'SELECT * FROM dream_entries WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Dream not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { title, content, dream_date, mood, sleep_quality, is_lucid, category, tags } = req.body;
    const result = await pool.query(
      `INSERT INTO dream_entries (user_id, title, content, dream_date, mood, sleep_quality, is_lucid, category, tags)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [req.user.id, title, content, dream_date, mood, sleep_quality, is_lucid || false, category, tags || []]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { title, content, dream_date, mood, sleep_quality, is_lucid, category, tags } = req.body;
    const result = await pool.query(
      `UPDATE dream_entries SET title=$1, content=$2, dream_date=$3, mood=$4, sleep_quality=$5,
       is_lucid=$6, category=$7, tags=$8, updated_at=NOW() WHERE id=$9 AND user_id=$10 RETURNING *`,
      [title, content, dream_date, mood, sleep_quality, is_lucid, category, tags, req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Dream not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM dream_entries WHERE id = $1 AND user_id = $2 RETURNING *',
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Dream not found' });
    res.json({ message: 'Dream deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
