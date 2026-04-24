import { Router } from 'express';
import pool from '../db.js';
import auth from '../middleware/auth.js';

const router = Router();

router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM recurring_dreams WHERE user_id = $1 ORDER BY last_occurrence DESC',
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
      'SELECT * FROM recurring_dreams WHERE id = $1 AND user_id = $2',
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
    const { title, description, frequency, first_occurrence, last_occurrence, occurrence_count, common_elements, emotional_tone } = req.body;
    const result = await pool.query(
      `INSERT INTO recurring_dreams (user_id, title, description, frequency, first_occurrence, last_occurrence, occurrence_count, common_elements, emotional_tone)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [req.user.id, title, description, frequency, first_occurrence, last_occurrence, occurrence_count, common_elements, emotional_tone]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { title, description, frequency, first_occurrence, last_occurrence, occurrence_count, common_elements, emotional_tone } = req.body;
    const result = await pool.query(
      `UPDATE recurring_dreams SET title=$1, description=$2, frequency=$3, first_occurrence=$4, last_occurrence=$5,
       occurrence_count=$6, common_elements=$7, emotional_tone=$8 WHERE id=$9 AND user_id=$10 RETURNING *`,
      [title, description, frequency, first_occurrence, last_occurrence, occurrence_count, common_elements, emotional_tone, req.params.id, req.user.id]
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
      'DELETE FROM recurring_dreams WHERE id = $1 AND user_id = $2 RETURNING *',
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Entry not found' });
    res.json({ message: 'Entry deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
