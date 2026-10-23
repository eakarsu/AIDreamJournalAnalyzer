import { Router } from 'express';
import express from 'express';
import pool from '../db.js';
import auth from '../middleware/auth.js';

const AI_FEATURES = ['dream-pattern-summary', 'sleep-mood-correlation', 'recurring-symbol-digest'];
const TASK_STATUSES = ['open', 'in_progress', 'done'];
const TASK_PRIORITIES = ['low', 'medium', 'high'];

function hasProviderKey(env = process.env) {
  return Boolean(String(env.OPENROUTER_API_KEY || env.OPENAI_API_KEY || '').trim());
}

function displayValue(value) {
  if (value === null || value === undefined || value === '') return '(empty)';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function filterRecords(records, filters = {}) {
  const exactKeys = ['status', 'priority', 'type', 'mood', 'category', 'severity'];
  const q = filters.q === undefined || filters.q === null ? '' : String(filters.q).trim().toLowerCase();
  return (records || []).filter((record) => {
    if (!record || typeof record !== 'object') return false;
    for (const key of exactKeys) {
      const wanted = filters[key];
      if (wanted === undefined || wanted === null || wanted === '') continue;
      if (String(record[key]) !== String(wanted)) return false;
    }
    if (!q) return true;
    return Object.values(record).some((value) => {
      if (value === null || value === undefined) return false;
      const text = typeof value === 'object' ? JSON.stringify(value) : String(value);
      return text.toLowerCase().includes(q);
    });
  });
}

function csvCell(value) {
  if (value === null || value === undefined) return '';
  const text = typeof value === 'object' ? JSON.stringify(value) : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function toCSV(records) {
  const rows = records || [];
  const headers = [...new Set(rows.flatMap((row) => Object.keys(row || {})))];
  if (headers.length === 0) return '';
  return [headers.join(','), ...rows.map((row) => headers.map((h) => csvCell(row[h])).join(','))].join('\n');
}

function countBy(records, key) {
  const counts = {};
  for (const record of records || []) {
    const label = displayValue(record ? record[key] : undefined);
    counts[label] = (counts[label] || 0) + 1;
  }
  return counts;
}

function buildAiResult(feature, records) {
  const rows = records || [];
  if (feature === 'sleep-mood-correlation') {
    const moods = [...new Set(rows.map((r) => displayValue(r.mood)))];
    const lucid = rows.filter((r) => r.is_lucid).length;
    return {
      feature, aiGenerated: false, provider: null,
      summary: { total: rows.length, lucid, notLucid: rows.length - lucid, moods },
      sections: [
        { label: 'Overview', content: `Dreams reviewed: ${rows.length}. Lucid dreams: ${lucid}. Non-lucid dreams: ${rows.length - lucid}.` },
        { label: 'Moods recorded', content: moods.join('; ') || 'No dreams found.' },
        { label: 'Recommendations', content: rows.length === 0 ? 'Record a first dream to start sleep-mood tracking.' : 'Compare sleep quality on lucid and non-lucid nights before drawing conclusions.' },
      ],
    };
  }
  if (feature === 'recurring-symbol-digest') {
    const tagCounts = {};
    for (const row of rows) {
      const tags = Array.isArray(row.tags) ? row.tags : [];
      for (const tag of tags) tagCounts[displayValue(tag)] = (tagCounts[displayValue(tag)] || 0) + 1;
    }
    const top = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
    return {
      feature, aiGenerated: false, provider: null,
      summary: { total: rows.length, distinctTags: Object.keys(tagCounts).length, tagCounts },
      sections: [
        { label: 'Overview', content: `Dreams reviewed: ${rows.length}. Distinct tags: ${Object.keys(tagCounts).length}.` },
        { label: 'Most frequent tags', content: top.map(([k, v]) => `${k}: ${v}`).join('; ') || 'No tags recorded.' },
        { label: 'Recommendations', content: top.length === 0 ? 'Add tags to dreams so recurring symbols can surface.' : 'Re-read dreams carrying the most frequent tags to spot recurring symbols.' },
      ],
    };
  }
  const byMood = countBy(rows, 'mood');
  const byCategory = countBy(rows, 'category');
  return {
    feature, aiGenerated: false, provider: null,
    summary: { total: rows.length, byMood, byCategory },
    sections: [
      { label: 'Overview', content: `Dreams reviewed: ${rows.length} across ${Object.keys(byCategory).length} category label(s).` },
      { label: 'Mood breakdown', content: Object.entries(byMood).map(([k, v]) => `${k}: ${v}`).join('; ') || 'No dreams found.' },
      { label: 'Recommendations', content: rows.length === 0 ? 'Record a first dream to start pattern tracking.' : 'Review the most frequent mood and category pairing first.' },
    ],
  };
}

async function maybeEnhance(feature, records, fallback) {
  if (!hasProviderKey()) return fallback;
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${String(process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY).trim()}`,
        'X-Title': 'AI Dream Journal Analyzer',
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a dream journal analyst. Answer with labelled sections.' },
          { role: 'user', content: `Feature: ${feature}\nRecords (JSON): ${JSON.stringify(records).slice(0, 6000)}\nDeterministic draft:\n${fallback.sections.map((s) => `${s.label}: ${s.content}`).join('\n')}` },
        ],
        max_tokens: 1200,
      }),
      signal: AbortSignal.timeout(15000),
    });
    const data = await response.json();
    const content = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    if (!content) return fallback;
    return { ...fallback, aiGenerated: true, provider: 'openrouter', sections: [{ label: 'AI analysis', content }, ...fallback.sections] };
  } catch {
    return fallback;
  }
}

function createTasksStore() {
  return { seq: 0, byId: new Map() };
}

function userKey(req) {
  const user = req.user || {};
  return String(user.id ?? user.userId ?? user.sub ?? 'unknown');
}

function validateTask(body, partial) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return 'Request body must be a JSON object';
  if (!partial || body.title !== undefined) {
    if (typeof body.title !== 'string' || body.title.trim().length === 0) return 'title is required';
  }
  if (body.status !== undefined && !TASK_STATUSES.includes(body.status)) return `status must be one of: ${TASK_STATUSES.join(', ')}`;
  if (body.priority !== undefined && !TASK_PRIORITIES.includes(body.priority)) return `priority must be one of: ${TASK_PRIORITIES.join(', ')}`;
  if (body.flagged !== undefined && typeof body.flagged !== 'boolean') return 'flagged must be true or false';
  return null;
}

function createWaveRouter({ authenticate = auth, fetchRecords, store } = {}) {
  if (typeof authenticate !== 'function') throw new Error('createWaveRouter requires an authenticate middleware');
  const fetchMain = fetchRecords || (async (req) => {
    const result = await pool.query('SELECT * FROM dream_entries WHERE user_id = $1 ORDER BY dream_date DESC LIMIT 500', [req.user.id]);
    return result.rows;
  });
  const tasks = store || createTasksStore();
  const router = express.Router();

  router.get('/tasks', authenticate, (req, res) => {
    const mine = [...tasks.byId.values()].filter((t) => t.userId === userKey(req));
    res.json({ data: filterRecords(mine, req.query), total: filterRecords(mine, req.query).length });
  });

  router.post('/tasks', authenticate, (req, res) => {
    const error = validateTask(req.body, false);
    if (error) return res.status(400).json({ error });
    const task = {
      id: ++tasks.seq,
      userId: userKey(req),
      title: req.body.title.trim(),
      notes: req.body.notes === undefined ? '' : req.body.notes,
      status: req.body.status || 'open',
      priority: req.body.priority || 'medium',
      flagged: req.body.flagged === undefined ? false : req.body.flagged,
      dueDate: req.body.dueDate === undefined ? null : req.body.dueDate,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    tasks.byId.set(task.id, task);
    res.status(201).json(task);
  });

  const updateTask = (req, res) => {
    const task = tasks.byId.get(Number(req.params.id));
    if (!task || task.userId !== userKey(req)) return res.status(404).json({ error: 'Task not found' });
    const error = validateTask(req.body, true);
    if (error) return res.status(400).json({ error });
    for (const key of ['title', 'notes', 'status', 'priority', 'flagged', 'dueDate']) {
      if (req.body[key] !== undefined) task[key] = key === 'title' ? String(req.body[key]).trim() : req.body[key];
    }
    task.updatedAt = new Date().toISOString();
    res.json(task);
  };
  router.put('/tasks/:id', authenticate, updateTask);
  router.patch('/tasks/:id', authenticate, updateTask);

  for (const feature of AI_FEATURES) {
    router.post(`/ai/${feature}`, authenticate, async (req, res) => {
      const records = await fetchMain(req);
      const fallback = buildAiResult(feature, records);
      res.json({ ...await maybeEnhance(feature, records, fallback), generatedAt: new Date().toISOString() });
    });
  }
  return router;
}

function createApp(deps) {
  const app = express();
  app.use(express.json({ limit: '1mb' }));
  app.use('/api', createWaveRouter(deps));
  return app;
}

export { AI_FEATURES, TASK_STATUSES, TASK_PRIORITIES, hasProviderKey, filterRecords, toCSV, buildAiResult, createTasksStore, createWaveRouter, createApp };
export default createWaveRouter;
