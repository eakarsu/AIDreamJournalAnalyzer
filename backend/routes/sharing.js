import { Router } from 'express';
import pool from '../db.js';
import auth from '../middleware/auth.js';

const router = Router();

// One-time idempotent table creation for sharing/community feature
let _ensured = false;
async function ensureTables() {
  if (_ensured) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS shared_dreams (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      dream_id INTEGER REFERENCES dream_entries(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      mood VARCHAR(50),
      category VARCHAR(100),
      tags TEXT[] DEFAULT '{}',
      anonymous BOOLEAN DEFAULT TRUE,
      visibility VARCHAR(20) DEFAULT 'public',
      ai_results JSONB DEFAULT '{}'::jsonb,
      shared_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(dream_id)
    );
    CREATE TABLE IF NOT EXISTS shared_dream_comments (
      id SERIAL PRIMARY KEY,
      shared_dream_id INTEGER REFERENCES shared_dreams(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      anonymous BOOLEAN DEFAULT TRUE,
      content TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS shared_dream_likes (
      id SERIAL PRIMARY KEY,
      shared_dream_id INTEGER REFERENCES shared_dreams(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(shared_dream_id, user_id)
    );
  `);
  _ensured = true;
}

// GET /api/sharing/feed?page=1&limit=20 - paginated public feed
router.get('/feed', auth, async (req, res) => {
  try {
    await ensureTables();
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const countRes = await pool.query(
      "SELECT COUNT(*) FROM shared_dreams WHERE visibility = 'public'"
    );
    const total = parseInt(countRes.rows[0].count);

    const result = await pool.query(`
      SELECT sd.*,
        CASE WHEN sd.anonymous THEN NULL ELSE u.name END AS author_name,
        (SELECT COUNT(*) FROM shared_dream_likes WHERE shared_dream_id = sd.id) AS like_count,
        (SELECT COUNT(*) FROM shared_dream_comments WHERE shared_dream_id = sd.id) AS comment_count,
        EXISTS(SELECT 1 FROM shared_dream_likes WHERE shared_dream_id = sd.id AND user_id = $3) AS liked_by_me
      FROM shared_dreams sd
      LEFT JOIN users u ON sd.user_id = u.id
      WHERE sd.visibility = 'public'
      ORDER BY sd.shared_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset, req.user.id]);

    res.json({
      data: result.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/sharing/trending - top tags/symbols across community
router.get('/trending', auth, async (req, res) => {
  try {
    await ensureTables();
    const tagRes = await pool.query(`
      SELECT tag, COUNT(*) AS count
      FROM (
        SELECT UNNEST(tags) AS tag FROM shared_dreams WHERE visibility = 'public'
      ) sub
      GROUP BY tag
      ORDER BY count DESC
      LIMIT 20
    `);
    const moodRes = await pool.query(`
      SELECT mood, COUNT(*) AS count FROM shared_dreams
      WHERE visibility = 'public' AND mood IS NOT NULL
      GROUP BY mood ORDER BY count DESC LIMIT 10
    `);
    const categoryRes = await pool.query(`
      SELECT category, COUNT(*) AS count FROM shared_dreams
      WHERE visibility = 'public' AND category IS NOT NULL
      GROUP BY category ORDER BY count DESC LIMIT 10
    `);
    res.json({
      tags: tagRes.rows,
      moods: moodRes.rows,
      categories: categoryRes.rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/sharing/mine - paginated list of my shares
router.get('/mine', auth, async (req, res) => {
  try {
    await ensureTables();
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const countRes = await pool.query(
      'SELECT COUNT(*) FROM shared_dreams WHERE user_id = $1',
      [req.user.id]
    );
    const total = parseInt(countRes.rows[0].count);
    const result = await pool.query(
      `SELECT sd.*,
        (SELECT COUNT(*) FROM shared_dream_likes WHERE shared_dream_id = sd.id) AS like_count,
        (SELECT COUNT(*) FROM shared_dream_comments WHERE shared_dream_id = sd.id) AS comment_count
       FROM shared_dreams sd
       WHERE sd.user_id = $1
       ORDER BY sd.shared_at DESC
       LIMIT $2 OFFSET $3`,
      [req.user.id, limit, offset]
    );
    res.json({
      data: result.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/sharing - share a dream
router.post('/', auth, async (req, res) => {
  try {
    await ensureTables();
    const { dream_id, anonymous = true, visibility = 'public' } = req.body;
    if (!dream_id) return res.status(400).json({ error: 'dream_id is required' });
    if (!['public', 'private', 'unlisted'].includes(visibility)) {
      return res.status(400).json({ error: 'visibility must be public, private, or unlisted' });
    }

    const dreamRes = await pool.query(
      'SELECT * FROM dream_entries WHERE id = $1 AND user_id = $2',
      [dream_id, req.user.id]
    );
    if (dreamRes.rows.length === 0) {
      return res.status(404).json({ error: 'Dream not found' });
    }
    const d = dreamRes.rows[0];
    const result = await pool.query(
      `INSERT INTO shared_dreams (user_id, dream_id, title, content, mood, category, tags, anonymous, visibility)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (dream_id) DO UPDATE
         SET anonymous = EXCLUDED.anonymous, visibility = EXCLUDED.visibility, shared_at = NOW()
       RETURNING *`,
      [req.user.id, d.id, d.title, d.content, d.mood, d.category, d.tags || [], !!anonymous, visibility]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/sharing/:id - unshare
router.delete('/:id', auth, async (req, res) => {
  try {
    await ensureTables();
    const result = await pool.query(
      'DELETE FROM shared_dreams WHERE id = $1 AND user_id = $2 RETURNING *',
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Shared dream not found' });
    res.json({ message: 'Unshared' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/sharing/:id/like - toggle like
router.post('/:id/like', auth, async (req, res) => {
  try {
    await ensureTables();
    const existing = await pool.query(
      'SELECT id FROM shared_dream_likes WHERE shared_dream_id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (existing.rows.length > 0) {
      await pool.query('DELETE FROM shared_dream_likes WHERE id = $1', [existing.rows[0].id]);
      return res.json({ liked: false });
    }
    await pool.query(
      'INSERT INTO shared_dream_likes (shared_dream_id, user_id) VALUES ($1, $2)',
      [req.params.id, req.user.id]
    );
    res.json({ liked: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/sharing/:id/comments
router.get('/:id/comments', auth, async (req, res) => {
  try {
    await ensureTables();
    const result = await pool.query(
      `SELECT c.*, CASE WHEN c.anonymous THEN NULL ELSE u.name END AS author_name
       FROM shared_dream_comments c
       LEFT JOIN users u ON c.user_id = u.id
       WHERE c.shared_dream_id = $1
       ORDER BY c.created_at DESC`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/sharing/:id/comments
router.post('/:id/comments', auth, async (req, res) => {
  try {
    await ensureTables();
    const { content, anonymous = true } = req.body;
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({ error: 'content is required' });
    }
    const sanitized = content.trim().slice(0, 2000);
    const result = await pool.query(
      `INSERT INTO shared_dream_comments (shared_dream_id, user_id, content, anonymous)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.params.id, req.user.id, sanitized, !!anonymous]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
