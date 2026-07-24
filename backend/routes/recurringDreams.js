import { Router } from 'express';
import pool from '../db.js';
import auth from '../middleware/auth.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '..', '.env') });

async function callOpenRouter(prompt, systemPrompt) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:3000',
      'X-Title': 'AI Dream Journal Analyzer'
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL || 'anthropic/claude-3-5-sonnet-20241022',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      max_tokens: 2000
    })
  });
  const data = await response.json();
  if (data.error) throw new Error(data.error.message || 'OpenRouter API error');
  return data.choices[0].message.content;
}

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
    const newEntry = result.rows[0];

    // Auto-trigger AI coaching if this dream title has been logged 3+ times
    if (title) {
      const matchCount = await pool.query(
        `SELECT COUNT(*) FROM dream_entries WHERE user_id = $1 AND LOWER(title) = LOWER($2)`,
        [req.user.id, title]
      );
      const count = parseInt(matchCount.rows[0].count);
      if (count >= 3) {
        try {
          const dreamInstances = await pool.query(
            `SELECT title, content, dream_date, mood FROM dream_entries WHERE user_id = $1 AND LOWER(title) = LOWER($2) ORDER BY dream_date DESC`,
            [req.user.id, title]
          );
          const instancesText = dreamInstances.rows.map((d, i) =>
            `Instance ${i + 1} (${d.dream_date}): ${d.content} [Mood: ${d.mood}]`
          ).join('\n\n');

          const systemPrompt = `You are an expert lucid dreaming coach specializing in resolving recurring dream patterns. Provide targeted techniques to help the dreamer understand and overcome this recurring dream.`;
          const prompt = `This dream has occurred ${count} times. Title: "${title}"\nDescription: ${description || 'N/A'}\nCommon elements: ${common_elements || 'N/A'}\nEmotional tone: ${emotional_tone || 'N/A'}\n\nRecurring instances from journal:\n${instancesText}\n\nProvide specific lucid dreaming and psychological techniques to resolve this recurring pattern.`;

          const analysis = await callOpenRouter(prompt, systemPrompt);
          await pool.query(
            `INSERT INTO ai_analyses (user_id, dream_content, analysis_type, result) VALUES ($1, $2, $3, $4)`,
            [req.user.id, `Auto-triggered coaching for recurring dream: "${title}" (${count} occurrences)`, 'recurring_dream_coaching', analysis]
          );
          return res.json({ ...newEntry, auto_coaching_triggered: true, coaching_analysis: analysis });
        } catch (aiErr) {
          // Non-fatal: return entry even if AI coaching fails
          return res.json({ ...newEntry, auto_coaching_triggered: false, coaching_error: aiErr.message });
        }
      }
    }

    res.json(newEntry);
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
