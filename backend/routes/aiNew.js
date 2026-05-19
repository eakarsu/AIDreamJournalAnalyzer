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

// Apply pass 5: ensure additive lifestyle_logs table exists for /lifestyle-correlation.
// Created idempotently at module load. ENV: none (uses existing DB pool).
(async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS lifestyle_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        log_date DATE NOT NULL,
        caffeine_mg INTEGER,
        alcohol_units NUMERIC,
        exercise_minutes INTEGER,
        screen_time_minutes INTEGER,
        meditation_minutes INTEGER,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
  } catch (e) {
    console.warn('lifestyle_logs ensure failed:', e.message);
  }
})();

async function callOpenRouter(prompt, systemPrompt) {
  if (!process.env.OPENROUTER_API_KEY) {
    const err = new Error('AI service not configured (OPENROUTER_API_KEY missing)');
    err.statusCode = 503;
    throw err;
  }
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

// POST /api/ai/weekly-digest
// Accepts { week_start_date }, fetches dreams + mood + sleep for that week,
// generates weekly digest report with themes, sleep quality trends, mood patterns, AI recommendations
router.post('/weekly-digest', auth, aiRateLimiter, async (req, res) => {
  try {
    const { week_start_date } = req.body;
    if (!week_start_date) {
      return res.status(400).json({ error: 'week_start_date is required' });
    }

    const weekStart = new Date(week_start_date);
    if (isNaN(weekStart.getTime())) {
      return res.status(400).json({ error: 'week_start_date must be a valid date' });
    }
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const [dreamsResult, moodResult, sleepResult] = await Promise.all([
      pool.query(
        `SELECT title, content, dream_date, mood, sleep_quality, is_lucid, category, tags
         FROM dream_entries
         WHERE user_id = $1 AND dream_date BETWEEN $2 AND $3
         ORDER BY dream_date ASC`,
        [req.user.id, week_start_date, weekEnd.toISOString().slice(0, 10)]
      ),
      pool.query(
        `SELECT mood, intensity, entry_date, notes
         FROM mood_entries
         WHERE user_id = $1 AND entry_date BETWEEN $2 AND $3
         ORDER BY entry_date ASC`,
        [req.user.id, week_start_date, weekEnd.toISOString().slice(0, 10)]
      ),
      pool.query(
        `SELECT sleep_date, hours_slept, quality_rating, bedtime, wake_time
         FROM sleep_quality
         WHERE user_id = $1 AND sleep_date BETWEEN $2 AND $3
         ORDER BY sleep_date ASC`,
        [req.user.id, week_start_date, weekEnd.toISOString().slice(0, 10)]
      )
    ]);

    const dreamsText = dreamsResult.rows.length > 0
      ? dreamsResult.rows.map(d =>
          `${d.dream_date}: "${d.title}" [Mood: ${d.mood}, Lucid: ${d.is_lucid}, Category: ${d.category}]\n${d.content}`
        ).join('\n\n')
      : 'No dreams recorded this week.';

    const moodText = moodResult.rows.length > 0
      ? moodResult.rows.map(m => `${m.entry_date}: ${m.mood} (intensity: ${m.intensity}/10) - ${m.notes || 'No notes'}`).join('\n')
      : 'No mood entries this week.';

    const sleepText = sleepResult.rows.length > 0
      ? sleepResult.rows.map(s => `${s.sleep_date}: ${s.hours_slept}hrs, Quality: ${s.quality_rating}/10, Bed: ${s.bedtime}, Wake: ${s.wake_time}`).join('\n')
      : 'No sleep data this week.';

    const systemPrompt = `You are an expert dream journal analyst and wellness coach. Generate a comprehensive weekly digest report that includes:
1. **Weekly Overview**: Summary of dreaming and wellness activity for the week
2. **Dream Themes**: Main themes and symbols that appeared across dreams
3. **Sleep Quality Trends**: Analysis of sleep patterns and quality throughout the week
4. **Mood Patterns**: How mood evolved during the week and connections to sleep/dreams
5. **Key Insights**: The most significant findings and what they may indicate
6. **AI Recommendations**: Personalized, actionable recommendations for the coming week
7. **Progress Indicators**: Signs of growth or areas needing attention

Provide a structured, empathetic, and actionable weekly digest.`;

    const prompt = `Weekly Digest Report for week of ${week_start_date}:

DREAMS (${dreamsResult.rows.length} recorded):
${dreamsText}

MOOD ENTRIES (${moodResult.rows.length} entries):
${moodText}

SLEEP DATA (${sleepResult.rows.length} entries):
${sleepText}`;

    const analysis = await callOpenRouter(prompt, systemPrompt);

    await pool.query(
      `INSERT INTO ai_analyses (user_id, dream_content, analysis_type, result) VALUES ($1, $2, $3, $4)`,
      [req.user.id, `Weekly digest for week of ${week_start_date}`, 'weekly_digest', analysis]
    );

    res.json({
      week_start_date,
      week_end_date: weekEnd.toISOString().slice(0, 10),
      dream_count: dreamsResult.rows.length,
      mood_entry_count: moodResult.rows.length,
      sleep_entry_count: sleepResult.rows.length,
      analysis
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

// POST /api/ai/dream-visualization-prompt
// Accepts { dream_id }, fetches dream content, generates detailed visual description
router.post('/dream-visualization-prompt', auth, aiRateLimiter, async (req, res) => {
  try {
    const { dream_id } = req.body;
    if (!dream_id) {
      return res.status(400).json({ error: 'dream_id is required' });
    }

    const dreamResult = await pool.query(
      'SELECT * FROM dream_entries WHERE id = $1 AND user_id = $2',
      [dream_id, req.user.id]
    );

    if (dreamResult.rows.length === 0) {
      return res.status(404).json({ error: 'Dream not found' });
    }

    const dream = dreamResult.rows[0];

    const systemPrompt = `You are a visionary artist and dream interpreter who specializes in translating dreams into vivid visual descriptions. Generate a detailed visual description that could be used as an image generation prompt or artistic brief. Include:
1. **Color Palette**: Dominant colors, tones, and atmospheric hues
2. **Atmosphere & Lighting**: Mood, time of day, light quality, shadows
3. **Key Visual Elements**: Main subjects, objects, environments, characters
4. **Composition**: Perspective, framing, depth, spatial relationships
5. **Artistic Style**: Suggested artistic style (surrealism, impressionism, digital art, etc.)
6. **Texture & Detail**: Surface qualities, fine details, tactile sensations translated visually
7. **Image Generation Prompt**: A single concise prompt (100-150 words) suitable for AI image generation

Create a visualization that captures both the literal and symbolic elements of the dream.`;

    const prompt = `Dream Title: "${dream.title}"
Dream Date: ${dream.dream_date}
Mood: ${dream.mood}
Category: ${dream.category}
Lucid Dream: ${dream.is_lucid}

Dream Content:
${dream.content}`;

    const analysis = await callOpenRouter(prompt, systemPrompt);

    await pool.query(
      `INSERT INTO ai_analyses (user_id, dream_content, analysis_type, result) VALUES ($1, $2, $3, $4)`,
      [req.user.id, `Visualization prompt for dream: "${dream.title}"`, 'dream_visualization', analysis]
    );

    res.json({
      dream_id: dream.id,
      dream_title: dream.title,
      dream_date: dream.dream_date,
      visualization_prompt: analysis
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

// POST /api/ai/pattern-breaking
// Accepts { recurring_dream_id }, fetches all instances, generates lucid dreaming techniques
router.post('/pattern-breaking', auth, aiRateLimiter, async (req, res) => {
  try {
    const { recurring_dream_id } = req.body;
    if (!recurring_dream_id) {
      return res.status(400).json({ error: 'recurring_dream_id is required' });
    }

    const recurringResult = await pool.query(
      'SELECT * FROM recurring_dreams WHERE id = $1 AND user_id = $2',
      [recurring_dream_id, req.user.id]
    );

    if (recurringResult.rows.length === 0) {
      return res.status(404).json({ error: 'Recurring dream not found' });
    }

    const recurringDream = recurringResult.rows[0];

    // Fetch all journal instances matching this recurring dream title
    const instancesResult = await pool.query(
      `SELECT title, content, dream_date, mood, sleep_quality
       FROM dream_entries
       WHERE user_id = $1 AND LOWER(title) ILIKE LOWER($2)
       ORDER BY dream_date DESC`,
      [req.user.id, `%${recurringDream.title.split(' ').slice(0, 3).join('%')}%`]
    );

    const instancesText = instancesResult.rows.length > 0
      ? instancesResult.rows.map((d, i) =>
          `Instance ${i + 1} (${d.dream_date}): Mood: ${d.mood}, Sleep Quality: ${d.sleep_quality}/10\n${d.content}`
        ).join('\n\n')
      : 'No specific journal instances found matching this recurring dream title.';

    const systemPrompt = `You are an expert lucid dreaming coach and Jungian psychologist specializing in resolving recurring dream patterns. Provide a comprehensive pattern-breaking protocol including:
1. **Pattern Analysis**: What this recurring dream pattern reveals about the subconscious
2. **Root Cause Assessment**: Likely psychological or emotional triggers for this pattern
3. **Lucid Dreaming Techniques**: Specific MILD, WILD, or WBTB techniques to gain lucidity in this dream
4. **In-Dream Script**: A detailed script for what to do when lucid in this dream to break the pattern
5. **Reality Check Protocol**: Custom reality checks based on elements in this recurring dream
6. **Daytime Practices**: Waking-life exercises to process the underlying themes
7. **Journaling Prompts**: Specific questions to journal about to uncover deeper meaning
8. **Timeline**: A realistic 4-week practice schedule to resolve this pattern

Be specific, practical, and empathetic in your guidance.`;

    const prompt = `Recurring Dream Pattern Analysis:
Title: "${recurringDream.title}"
Description: ${recurringDream.description || 'N/A'}
Frequency: ${recurringDream.frequency || 'Unknown'}
First Occurrence: ${recurringDream.first_occurrence || 'Unknown'}
Last Occurrence: ${recurringDream.last_occurrence || 'Unknown'}
Total Occurrences: ${recurringDream.occurrence_count || instancesResult.rows.length}
Common Elements: ${recurringDream.common_elements || 'N/A'}
Emotional Tone: ${recurringDream.emotional_tone || 'N/A'}

Journal Instances Found (${instancesResult.rows.length}):
${instancesText}`;

    const analysis = await callOpenRouter(prompt, systemPrompt);

    await pool.query(
      `INSERT INTO ai_analyses (user_id, dream_content, analysis_type, result) VALUES ($1, $2, $3, $4)`,
      [req.user.id, `Pattern-breaking protocol for recurring dream: "${recurringDream.title}"`, 'pattern_breaking', analysis]
    );

    res.json({
      recurring_dream_id: recurringDream.id,
      dream_title: recurringDream.title,
      occurrence_count: recurringDream.occurrence_count || instancesResult.rows.length,
      journal_instances_found: instancesResult.rows.length,
      pattern_breaking_protocol: analysis
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

// POST /api/ai/emotion-trajectory
// Aggregates mood_entries over a window and asks the model for a longitudinal arc.
router.post('/emotion-trajectory', auth, aiRateLimiter, async (req, res) => {
  try {
    const { days } = req.body || {};
    const windowDays = Number.isInteger(days) && days > 0 && days <= 365 ? days : 30;

    const moodResult = await pool.query(
      `SELECT mood, intensity, entry_date, notes
       FROM mood_entries
       WHERE user_id = $1
         AND entry_date >= (CURRENT_DATE - ($2 || ' days')::interval)
       ORDER BY entry_date ASC`,
      [req.user.id, windowDays]
    );

    if (moodResult.rows.length === 0) {
      return res.json({
        window_days: windowDays,
        entry_count: 0,
        analysis: 'No mood entries recorded in the selected window. Add daily mood entries to enable trajectory analysis.'
      });
    }

    const moodText = moodResult.rows.map(m =>
      `${m.entry_date}: ${m.mood} (intensity ${m.intensity}/10)${m.notes ? ' — ' + m.notes : ''}`
    ).join('\n');

    const systemPrompt = `You are an empathetic emotional-wellbeing coach. Given a sequence of dated mood entries, produce a longitudinal emotion trajectory analysis with:
1. **Trajectory Summary**: An overall arc (improving, declining, oscillating, stable) with brief justification.
2. **Phases & Turning Points**: Distinct phases in the window, with start/end dates and dominant tone.
3. **Volatility & Range**: Comments on intensity range and day-to-day variability.
4. **Likely Drivers**: Plausible drivers inferred from notes (caveat as inferred, not diagnostic).
5. **Risk Signals**: Any worrying patterns warranting attention (without diagnosing).
6. **Forward Outlook**: 2-3 actionable practices for the next two weeks.

Be specific, calibrated, and non-clinical.`;

    const prompt = `Mood entries over the past ${windowDays} days (${moodResult.rows.length} entries):\n${moodText}`;

    const analysis = await callOpenRouter(prompt, systemPrompt);

    await pool.query(
      `INSERT INTO ai_analyses (user_id, dream_content, analysis_type, result) VALUES ($1, $2, $3, $4)`,
      [req.user.id, `Emotion trajectory over ${windowDays} days`, 'emotion_trajectory', analysis]
    );

    res.json({
      window_days: windowDays,
      entry_count: moodResult.rows.length,
      analysis
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

// POST /api/ai/cbt-suggestions
// Joins a dream with recent mood and asks for CBT-style reframes and homework prompts.
router.post('/cbt-suggestions', auth, aiRateLimiter, async (req, res) => {
  try {
    const { dream_id } = req.body || {};
    if (!dream_id) {
      return res.status(400).json({ error: 'dream_id is required' });
    }

    const dreamResult = await pool.query(
      'SELECT * FROM dream_entries WHERE id = $1 AND user_id = $2',
      [dream_id, req.user.id]
    );
    if (dreamResult.rows.length === 0) {
      return res.status(404).json({ error: 'Dream not found' });
    }
    const dream = dreamResult.rows[0];

    const moodResult = await pool.query(
      `SELECT mood, intensity, entry_date, notes
       FROM mood_entries
       WHERE user_id = $1
         AND entry_date BETWEEN ($2::date - INTERVAL '7 days') AND ($2::date + INTERVAL '1 day')
       ORDER BY entry_date ASC`,
      [req.user.id, dream.dream_date]
    );

    const moodText = moodResult.rows.length > 0
      ? moodResult.rows.map(m => `${m.entry_date}: ${m.mood} (${m.intensity}/10)${m.notes ? ' — ' + m.notes : ''}`).join('\n')
      : 'No nearby mood entries.';

    const systemPrompt = `You are a CBT-trained therapist (educational, non-clinical) helping a user reframe distressing dream content. Provide:
1. **Identified Cognitions**: Likely automatic thoughts or core beliefs surfaced by the dream.
2. **Cognitive Distortions**: Name relevant CBT distortions (catastrophizing, mind-reading, all-or-nothing, etc.).
3. **Reframes**: For each cognition, a balanced, evidence-based alternative thought.
4. **Behavioral Experiments**: 2-3 small experiments to test the reframes in waking life.
5. **Homework Prompts**: 3 short journaling prompts.
6. **Grounding Practice**: A brief grounding/relaxation exercise tailored to the dream's themes.

Tone: warm, psychoeducational, with a clear note this is not a substitute for therapy.`;

    const prompt = `Dream Title: "${dream.title}"
Dream Date: ${dream.dream_date}
Mood at recording: ${dream.mood}
Lucid: ${dream.is_lucid}
Category: ${dream.category}

Dream Content:
${dream.content}

Mood entries within +/- 1 week:
${moodText}`;

    const analysis = await callOpenRouter(prompt, systemPrompt);

    await pool.query(
      `INSERT INTO ai_analyses (user_id, dream_content, analysis_type, result) VALUES ($1, $2, $3, $4)`,
      [req.user.id, `CBT suggestions for dream: "${dream.title}"`, 'cbt_suggestions', analysis]
    );

    res.json({
      dream_id: dream.id,
      dream_title: dream.title,
      mood_entry_count: moodResult.rows.length,
      analysis
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

// POST /api/ai/lifestyle-correlation
// Apply pass 5: correlates caffeine/alcohol/exercise with sleep + dream quality.
// Optional body: { days } (default 30, max 365).
// Joins lifestyle_logs with sleep_quality + dream_entries within window.
// 503 if OPENROUTER_API_KEY missing (via callOpenRouter).
router.post('/lifestyle-correlation', auth, aiRateLimiter, async (req, res) => {
  try {
    const { days } = req.body || {};
    const windowDays = Number.isInteger(days) && days > 0 && days <= 365 ? days : 30;

    const [lifestyleRes, sleepRes, dreamsRes] = await Promise.all([
      pool.query(
        `SELECT log_date, caffeine_mg, alcohol_units, exercise_minutes, screen_time_minutes, meditation_minutes, notes
         FROM lifestyle_logs
         WHERE user_id = $1 AND log_date >= (CURRENT_DATE - ($2 || ' days')::interval)
         ORDER BY log_date ASC`,
        [req.user.id, windowDays]
      ),
      pool.query(
        `SELECT sleep_date, hours_slept, quality_rating
         FROM sleep_quality
         WHERE user_id = $1 AND sleep_date >= (CURRENT_DATE - ($2 || ' days')::interval)
         ORDER BY sleep_date ASC`,
        [req.user.id, windowDays]
      ),
      pool.query(
        `SELECT dream_date, title, mood, sleep_quality, is_lucid
         FROM dream_entries
         WHERE user_id = $1 AND dream_date >= (CURRENT_DATE - ($2 || ' days')::interval)
         ORDER BY dream_date ASC`,
        [req.user.id, windowDays]
      ),
    ]);

    if (lifestyleRes.rows.length === 0) {
      return res.json({
        window_days: windowDays,
        lifestyle_log_count: 0,
        sleep_entry_count: sleepRes.rows.length,
        dream_count: dreamsRes.rows.length,
        analysis: 'No lifestyle logs in the selected window. Add caffeine/alcohol/exercise/screen-time entries to enable correlation analysis.'
      });
    }

    const lifestyleText = lifestyleRes.rows.map(l =>
      `${l.log_date}: caffeine=${l.caffeine_mg ?? '-'}mg, alcohol=${l.alcohol_units ?? '-'}u, exercise=${l.exercise_minutes ?? '-'}min, screen=${l.screen_time_minutes ?? '-'}min, meditation=${l.meditation_minutes ?? '-'}min${l.notes ? ' — ' + l.notes : ''}`
    ).join('\n');
    const sleepText = sleepRes.rows.length ? sleepRes.rows.map(s => `${s.sleep_date}: ${s.hours_slept}hrs, quality ${s.quality_rating}/10`).join('\n') : 'No sleep data.';
    const dreamsText = dreamsRes.rows.length ? dreamsRes.rows.map(d => `${d.dream_date}: "${d.title}" mood=${d.mood} q=${d.sleep_quality} lucid=${d.is_lucid}`).join('\n') : 'No dream entries.';

    const systemPrompt = `You are a sleep-and-wellness analyst. Given dated lifestyle logs (caffeine, alcohol, exercise, screen time, meditation) plus sleep quality and dream entries, output:
1. **Observed Correlations**: Pairs (e.g., caffeine vs sleep quality) with direction and strength (qualitative).
2. **Confounders**: Factors that may confound observed correlations.
3. **Behavioral Hypotheses**: Plausible mechanisms.
4. **Recommendations**: 3-5 small, testable behavior changes for the next 2 weeks.
5. **Caveats**: Note this is observational, not causal, and small samples are noisy.

Stay non-clinical, calibrated, and practical.`;

    const prompt = `Window: last ${windowDays} days.

LIFESTYLE LOGS (${lifestyleRes.rows.length}):
${lifestyleText}

SLEEP (${sleepRes.rows.length}):
${sleepText}

DREAMS (${dreamsRes.rows.length}):
${dreamsText}`;

    const analysis = await callOpenRouter(prompt, systemPrompt);

    await pool.query(
      `INSERT INTO ai_analyses (user_id, dream_content, analysis_type, result) VALUES ($1, $2, $3, $4)`,
      [req.user.id, `Lifestyle correlation over ${windowDays} days`, 'lifestyle_correlation', analysis]
    );

    res.json({
      window_days: windowDays,
      lifestyle_log_count: lifestyleRes.rows.length,
      sleep_entry_count: sleepRes.rows.length,
      dream_count: dreamsRes.rows.length,
      analysis
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

// POST /api/ai/lifestyle-logs
// Apply pass 5: simple writer for the additive lifestyle_logs table so the
// correlation endpoint above is usable end-to-end without a dedicated CRUD route.
router.post('/lifestyle-logs', auth, async (req, res) => {
  try {
    const { log_date, caffeine_mg, alcohol_units, exercise_minutes, screen_time_minutes, meditation_minutes, notes } = req.body || {};
    if (!log_date) return res.status(400).json({ error: 'log_date is required (YYYY-MM-DD)' });
    const result = await pool.query(
      `INSERT INTO lifestyle_logs (user_id, log_date, caffeine_mg, alcohol_units, exercise_minutes, screen_time_minutes, meditation_minutes, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [req.user.id, log_date, caffeine_mg ?? null, alcohol_units ?? null, exercise_minutes ?? null, screen_time_minutes ?? null, meditation_minutes ?? null, notes ?? null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
