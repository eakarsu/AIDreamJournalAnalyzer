import { Router } from 'express';
import pool from '../db.js';
import auth from '../middleware/auth.js';

const router = Router();

router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM dream_symbols ORDER BY name ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM dream_symbols WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Symbol not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { name, meaning, category } = req.body;
    const result = await pool.query(
      'INSERT INTO dream_symbols (name, meaning, category) VALUES ($1, $2, $3) RETURNING *',
      [name, meaning, category]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { name, meaning, category } = req.body;
    const result = await pool.query(
      'UPDATE dream_symbols SET name=$1, meaning=$2, category=$3 WHERE id=$4 RETURNING *',
      [name, meaning, category, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Symbol not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM dream_symbols WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Symbol not found' });
    res.json({ message: 'Symbol deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
