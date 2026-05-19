// Peer pattern matching: anonymous matching with users sharing similar
// motifs. v0 uses symbol/tag co-occurrence Jaccard similarity over the
// existing schema. Returns matches stripped of PII.
import { Router } from 'express';
import pool from '../db.js';
import auth from '../middleware/auth.js';

const router = Router();

function jaccard(a, b) {
  const sa = new Set(a);
  const sb = new Set(b);
  if (!sa.size && !sb.size) return 0;
  let intersect = 0;
  for (const x of sa) if (sb.has(x)) intersect++;
  const union = sa.size + sb.size - intersect;
  return union ? intersect / union : 0;
}

// GET /api/peer-pattern-match — find anonymous matches for the calling user
router.get('/', auth, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);

    // Self symbols
    const mineRes = await pool.query(
      `SELECT DISTINCT s.symbol_name FROM symbols s
       INNER JOIN dreams d ON d.id = s.dream_id
       WHERE d.user_id = $1`,
      [req.user.id]
    );
    const myMotifs = mineRes.rows.map(r => r.symbol_name);
    if (!myMotifs.length) {
      return res.json({ matches: [], notice: 'No symbols yet on caller' });
    }

    // All other users + their symbol sets
    const othersRes = await pool.query(
      `SELECT d.user_id, array_agg(DISTINCT s.symbol_name) AS motifs
       FROM symbols s INNER JOIN dreams d ON d.id = s.dream_id
       WHERE d.user_id <> $1
       GROUP BY d.user_id`,
      [req.user.id]
    );

    const scored = othersRes.rows
      .map(r => ({ user_id: r.user_id, motifs: r.motifs || [], score: jaccard(myMotifs, r.motifs || []) }))
      .filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((r, i) => ({
        anonymous_id: `peer-${i + 1}`,
        similarity: Math.round(r.score * 100) / 100,
        shared_motifs: r.motifs.filter(m => myMotifs.includes(m)).slice(0, 10),
      }));

    return res.json({ matches: scored, my_motif_count: myMotifs.length });
  } catch (e) {
    console.error('peer match error:', e);
    return res.status(500).json({ error: 'peer match failed' });
  }
});

export default router;
