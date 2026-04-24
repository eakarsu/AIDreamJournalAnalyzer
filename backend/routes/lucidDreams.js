import { Router } from 'express';
import pool from '../db.js';
import auth from '../middleware/auth.js';

const router = Router();

router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM lucid_dreams WHERE user_id = $1 ORDER BY dream_date DESC',
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
      'SELECT * FROM lucid_dreams WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Entry not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { title, content, dream_date, technique_used, lucidity_level, duration_minutes, control_level } = req.body;
    const result = await pool.query(
      `INSERT INTO lucid_dreams (user_id, title, content, dream_date, technique_used, lucidity_level, duration_minutes, control_level)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [req.user.id, title, content, dream_date, technique_used, lucidity_level, duration_minutes, control_level]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { title, content, dream_date, technique_used, lucidity_level, duration_minutes, control_level } = req.body;
    const result = await pool.query(
      `UPDATE lucid_dreams SET title=$1, content=$2, dream_date=$3, technique_used=$4, lucidity_level=$5,
       duration_minutes=$6, control_level=$7 WHERE id=$8 AND user_id=$9 RETURNING *`,
      [title, content, dream_date, technique_used, lucidity_level, duration_minutes, control_level, req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Entry not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM lucid_dreams WHERE id = $1 AND user_id = $2 RETURNING *',
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Entry not found' });
    res.json({ message: 'Entry deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
