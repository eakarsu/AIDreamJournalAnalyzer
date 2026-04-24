import { Router } from 'express';
import pool from '../db.js';
import auth from '../middleware/auth.js';

const router = Router();

router.get('/overview', auth, async (req, res) => {
  try {
    const dreamCount = await pool.query('SELECT COUNT(*) FROM dream_entries WHERE user_id = $1', [req.user.id]);
    const lucidCount = await pool.query('SELECT COUNT(*) FROM lucid_dreams WHERE user_id = $1', [req.user.id]);
    const avgSleep = await pool.query('SELECT AVG(hours_slept)::numeric(10,1) as avg_hours, AVG(quality_rating)::numeric(10,1) as avg_quality FROM sleep_quality WHERE user_id = $1', [req.user.id]);
    const moodDist = await pool.query('SELECT mood, COUNT(*) as count FROM mood_entries WHERE user_id = $1 GROUP BY mood ORDER BY count DESC', [req.user.id]);
    const recurringCount = await pool.query('SELECT COUNT(*) FROM recurring_dreams WHERE user_id = $1', [req.user.id]);
    const goalCount = await pool.query('SELECT COUNT(*) FROM sleep_goals WHERE user_id = $1 AND status = $2', [req.user.id, 'active']);
    const categoryDist = await pool.query('SELECT category, COUNT(*) as count FROM dream_entries WHERE user_id = $1 AND category IS NOT NULL GROUP BY category ORDER BY count DESC', [req.user.id]);
    const weeklyDreams = await pool.query(
      `SELECT DATE_TRUNC('week', dream_date) as week, COUNT(*) as count
       FROM dream_entries WHERE user_id = $1 AND dream_date >= NOW() - INTERVAL '12 weeks'
       GROUP BY week ORDER BY week`,
      [req.user.id]
    );

    res.json({
      totalDreams: parseInt(dreamCount.rows[0].count),
      totalLucidDreams: parseInt(lucidCount.rows[0].count),
      avgSleepHours: avgSleep.rows[0].avg_hours || 0,
      avgSleepQuality: avgSleep.rows[0].avg_quality || 0,
      moodDistribution: moodDist.rows,
      totalRecurringDreams: parseInt(recurringCount.rows[0].count),
      activeGoals: parseInt(goalCount.rows[0].count),
      categoryDistribution: categoryDist.rows,
      weeklyDreamCounts: weeklyDreams.rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/sleep-trends', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT sleep_date, hours_slept, quality_rating
       FROM sleep_quality WHERE user_id = $1
       ORDER BY sleep_date DESC LIMIT 30`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/mood-trends', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT entry_date, mood, intensity
       FROM mood_entries WHERE user_id = $1
       ORDER BY entry_date DESC LIMIT 30`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
