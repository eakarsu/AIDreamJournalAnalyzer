import { Router } from 'express';
import pool from '../db.js';
import auth from '../middleware/auth.js';
import { aiRateLimiter } from '../middleware/rateLimiter.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '..', '.env') });

const router = Router();

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

// Analyze a dream
router.post('/analyze-dream', auth, aiRateLimiter, async (req, res) => {
  try {
    const { dreamContent, title } = req.body;
    const systemPrompt = `You are an expert dream analyst and psychologist. Analyze the following dream and provide:
1. **Overall Interpretation**: A comprehensive interpretation of the dream
2. **Key Symbols**: Identify and explain the main symbols in the dream
3. **Emotional Analysis**: What emotions are present and what they might mean
4. **Psychological Themes**: Any recurring psychological themes
5. **Life Connections**: How this dream might relate to waking life
6. **Recommendations**: Suggestions for the dreamer

Be insightful, empathetic, and professional in your analysis.`;

    const analysis = await callOpenRouter(
      `Dream Title: "${title}"\n\nDream Content:\n${dreamContent}`,
      systemPrompt
    );

    // Save analysis to database
    await pool.query(
      `INSERT INTO ai_analyses (user_id, dream_content, analysis_type, result)
       VALUES ($1, $2, $3, $4)`,
      [req.user.id, dreamContent, 'dream_analysis', analysis]
    );

    res.json({ analysis });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Detect patterns across dreams
router.post('/detect-patterns', auth, aiRateLimiter, async (req, res) => {
  try {
    const dreams = await pool.query(
      'SELECT title, content, mood, dream_date FROM dream_entries WHERE user_id = $1 ORDER BY dream_date DESC LIMIT 20',
      [req.user.id]
    );

    if (dreams.rows.length === 0) {
      return res.json({ analysis: 'No dreams found to analyze patterns.' });
    }

    const dreamsText = dreams.rows.map((d, i) =>
      `Dream ${i + 1} (${d.dream_date}): "${d.title}" - ${d.content} [Mood: ${d.mood}]`
    ).join('\n\n');

    const systemPrompt = `You are an expert dream pattern analyst. Analyze the collection of dreams and identify:
1. **Recurring Themes**: Common themes that appear across multiple dreams
2. **Symbol Patterns**: Symbols that repeat and their evolving meanings
3. **Emotional Patterns**: How emotions change across dreams
4. **Temporal Patterns**: Any time-based patterns
5. **Psychological Insights**: Deep psychological patterns
6. **Growth Indicators**: Signs of personal growth or areas needing attention

Provide a comprehensive pattern analysis.`;

    const analysis = await callOpenRouter(dreamsText, systemPrompt);

    await pool.query(
      `INSERT INTO ai_analyses (user_id, dream_content, analysis_type, result)
       VALUES ($1, $2, $3, $4)`,
      [req.user.id, 'Pattern analysis of recent dreams', 'pattern_detection', analysis]
    );

    res.json({ analysis });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Interpret dream symbols
router.post('/interpret-symbol', auth, aiRateLimiter, async (req, res) => {
  try {
    const { symbol, context } = req.body;
    const systemPrompt = `You are an expert in dream symbolism drawing from Jungian psychology, Freudian analysis, and cultural symbolism. Provide a thorough interpretation of the dream symbol including:
1. **Universal Meaning**: Common interpretations across cultures
2. **Psychological Perspective**: Jungian and Freudian interpretations
3. **Cultural Variations**: How different cultures interpret this symbol
4. **Context-Specific Meaning**: What it means in the given context
5. **Personal Growth**: What this symbol might suggest for personal development
6. **Related Symbols**: Other symbols often connected to this one`;

    const analysis = await callOpenRouter(
      `Symbol: "${symbol}"\nContext: ${context || 'General dream context'}`,
      systemPrompt
    );

    res.json({ analysis });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Generate sleep recommendations
router.post('/sleep-recommendations', auth, aiRateLimiter, async (req, res) => {
  try {
    const sleepData = await pool.query(
      'SELECT * FROM sleep_quality WHERE user_id = $1 ORDER BY sleep_date DESC LIMIT 14',
      [req.user.id]
    );

    const moodData = await pool.query(
      'SELECT * FROM mood_entries WHERE user_id = $1 ORDER BY entry_date DESC LIMIT 14',
      [req.user.id]
    );

    const sleepText = sleepData.rows.map(s =>
      `${s.sleep_date}: ${s.hours_slept}hrs, Quality: ${s.quality_rating}/10, Bed: ${s.bedtime}, Wake: ${s.wake_time}`
    ).join('\n');

    const moodText = moodData.rows.map(m =>
      `${m.entry_date}: Mood: ${m.mood}, Intensity: ${m.intensity}/10`
    ).join('\n');

    const systemPrompt = `You are a sleep science expert. Based on the user's sleep and mood data, provide:
1. **Sleep Quality Assessment**: Overall assessment of sleep patterns
2. **Key Issues**: Identified problems or areas for improvement
3. **Personalized Recommendations**: Specific, actionable sleep hygiene tips
4. **Mood-Sleep Connection**: How their sleep relates to mood patterns
5. **Optimal Schedule**: Suggested sleep/wake schedule
6. **Weekly Plan**: A week-long improvement plan`;

    const analysis = await callOpenRouter(
      `Sleep Data:\n${sleepText}\n\nMood Data:\n${moodText}`,
      systemPrompt
    );

    res.json({ analysis });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Lucid dream coaching
router.post('/lucid-coaching', auth, aiRateLimiter, async (req, res) => {
  try {
    const { experience_level, goals } = req.body;
    const lucidDreams = await pool.query(
      'SELECT * FROM lucid_dreams WHERE user_id = $1 ORDER BY dream_date DESC LIMIT 10',
      [req.user.id]
    );

    const dreamsText = lucidDreams.rows.map(d =>
      `${d.dream_date}: "${d.title}" - Technique: ${d.technique_used}, Lucidity: ${d.lucidity_level}/10, Control: ${d.control_level}/10`
    ).join('\n');

    const systemPrompt = `You are an expert lucid dreaming coach. Based on the dreamer's experience, provide:
1. **Progress Assessment**: How they're doing with lucid dreaming
2. **Technique Recommendations**: Best techniques for their level
3. **Reality Check Suggestions**: Specific reality checks to practice
4. **Dream Stabilization Tips**: How to stay lucid longer
5. **Control Exercises**: How to gain more control in lucid dreams
6. **Practice Schedule**: A recommended practice routine`;

    const analysis = await callOpenRouter(
      `Experience Level: ${experience_level || 'intermediate'}\nGoals: ${goals || 'Improve lucid dreaming frequency'}\n\nRecent Lucid Dreams:\n${dreamsText}`,
      systemPrompt
    );

    res.json({ analysis });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Dream journal summary
router.post('/journal-summary', auth, aiRateLimiter, async (req, res) => {
  try {
    const { period } = req.body;
    const days = period === 'week' ? 7 : period === 'month' ? 30 : 90;

    const dreams = await pool.query(
      `SELECT * FROM dream_entries WHERE user_id = $1 AND dream_date >= NOW() - INTERVAL '${days} days' ORDER BY dream_date DESC`,
      [req.user.id]
    );

    const dreamsText = dreams.rows.map(d =>
      `${d.dream_date}: "${d.title}" - ${d.content} [Mood: ${d.mood}, Category: ${d.category}]`
    ).join('\n\n');

    const systemPrompt = `You are a dream journal analyst. Create a comprehensive summary of the dreamer's journal for the specified period:
1. **Period Overview**: Summary of dreaming activity
2. **Most Significant Dreams**: Highlight the most meaningful dreams
3. **Dominant Themes**: Main themes across the period
4. **Emotional Journey**: How emotions evolved
5. **Personal Growth Indicators**: Signs of growth or recurring challenges
6. **Looking Forward**: What to pay attention to in future dreams`;

    const analysis = await callOpenRouter(
      `Journal Summary for the last ${days} days:\n\n${dreamsText}`,
      systemPrompt
    );

    res.json({ analysis });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get AI analysis history
router.get('/history', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM ai_analyses WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
