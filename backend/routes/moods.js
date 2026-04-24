import { Router } from 'express';
import pool from '../db.js';
import auth from '../middleware/auth.js';

const router = Router();

router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM mood_entries WHERE user_id = $1 ORDER BY entry_date DESC',
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
      'SELECT * FROM mood_entries WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Mood entry not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { mood, intensity, entry_date, notes, triggers } = req.body;
    const result = await pool.query(
      'INSERT INTO mood_entries (user_id, mood, intensity, entry_date, notes, triggers) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [req.user.id, mood, intensity, entry_date, notes, triggers]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { mood, intensity, entry_date, notes, triggers } = req.body;
    const result = await pool.query(
      'UPDATE mood_entries SET mood=$1, intensity=$2, entry_date=$3, notes=$4, triggers=$5 WHERE id=$6 AND user_id=$7 RETURNING *',
      [mood, intensity, entry_date, notes, triggers, req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Mood entry not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM mood_entries WHERE id = $1 AND user_id = $2 RETURNING *',
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Mood entry not found' });
    res.json({ message: 'Mood entry deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
