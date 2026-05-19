import { Router } from 'express';
import pool from '../db.js';
import auth from '../middleware/auth.js';

const router = Router();

// In-memory store for tag/symbol rules (lightweight; survives within process lifetime)
const rulesStore = {
  rules: [
    { id: 1, pattern: 'water', tag: 'emotion', symbol: 'Water', priority: 8, note: 'Emotional/unconscious cue' },
    { id: 2, pattern: 'flying', tag: 'freedom', symbol: 'Flying', priority: 9, note: 'Liberation, ambition' },
    { id: 3, pattern: 'chase|chased|running from', tag: 'fear', symbol: 'Chase', priority: 7, note: 'Avoidance, anxiety' },
    { id: 4, pattern: 'teeth', tag: 'anxiety', symbol: 'Teeth Falling', priority: 6, note: 'Powerlessness' },
    { id: 5, pattern: 'mirror', tag: 'self', symbol: 'Mirror', priority: 7, note: 'Self-reflection' },
  ],
  nextId: 6,
};

// 1) GET /dream-frequency  -> { months: [{month, count, lucidCount}] }
router.get('/dream-frequency', auth, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId || 1;
    const result = await pool.query(
      `SELECT to_char(date_trunc('month', dream_date), 'YYYY-MM') AS month,
              COUNT(*)::int AS count,
              SUM(CASE WHEN is_lucid THEN 1 ELSE 0 END)::int AS lucid_count
       FROM dream_entries
       WHERE user_id = $1
       GROUP BY date_trunc('month', dream_date)
       ORDER BY month ASC`,
      [userId]
    );
    const months = result.rows.map(r => ({
      month: r.month,
      count: Number(r.count) || 0,
      lucidCount: Number(r.lucid_count) || 0,
    }));
    res.json({ months, total: months.reduce((a, b) => a + b.count, 0) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2) GET /emotion-heatmap  -> { emotions:[...], slots:[...], matrix:[[..]] }
router.get('/emotion-heatmap', auth, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId || 1;
    // Pull dreams + sleep_quality (with bedtime/wake_time) for the user.
    const dreams = await pool.query(
      `SELECT id, mood, dream_date FROM dream_entries WHERE user_id = $1 AND mood IS NOT NULL`,
      [userId]
    );
    const sleep = await pool.query(
      `SELECT sleep_date, bedtime FROM sleep_quality WHERE user_id = $1`,
      [userId]
    );

    const bedtimeByDate = new Map();
    for (const row of sleep.rows) {
      const dateStr = row.sleep_date instanceof Date
        ? row.sleep_date.toISOString().slice(0, 10)
        : String(row.sleep_date);
      bedtimeByDate.set(dateStr, row.bedtime);
    }

    const slots = ['Early Night', 'Late Night', 'Pre-Dawn', 'Morning'];
    // Bucket helper: based on bedtime hour or deterministic fallback by dream id
    const slotIndex = (bedtime, fallbackSeed) => {
      let hour;
      if (bedtime && typeof bedtime === 'string') {
        hour = parseInt(bedtime.split(':')[0], 10);
      } else if (bedtime && bedtime.getHours) {
        hour = bedtime.getHours();
      }
      if (Number.isFinite(hour)) {
        if (hour >= 20 && hour < 23) return 0; // Early Night 20-23
        if (hour >= 23 || hour < 1) return 1;  // Late Night 23-01
        if (hour >= 1 && hour < 4) return 2;   // Pre-Dawn 01-04
        return 3;                              // Morning otherwise
      }
      return fallbackSeed % slots.length;
    };

    // Build list of unique emotions
    const emotionCounts = new Map();
    for (const d of dreams.rows) {
      const e = (d.mood || 'Unknown').trim();
      emotionCounts.set(e, (emotionCounts.get(e) || 0) + 1);
    }
    const emotions = Array.from(emotionCounts.keys()).sort((a, b) => emotionCounts.get(b) - emotionCounts.get(a)).slice(0, 12);
    const emotionIdx = new Map(emotions.map((e, i) => [e, i]));

    // Initialize matrix [emotions x slots]
    const matrix = emotions.map(() => slots.map(() => 0));

    for (const d of dreams.rows) {
      const e = (d.mood || 'Unknown').trim();
      if (!emotionIdx.has(e)) continue;
      const dateStr = d.dream_date instanceof Date
        ? d.dream_date.toISOString().slice(0, 10)
        : String(d.dream_date);
      const bt = bedtimeByDate.get(dateStr);
      const si = slotIndex(bt, d.id);
      matrix[emotionIdx.get(e)][si] += 1;
    }

    res.json({ emotions, slots, matrix });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3) GET /interpretation-report  -> PDF (text/plain fallback if pdfkit absent)
router.get('/interpretation-report', auth, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId || 1;
    const dreams = await pool.query(
      `SELECT id, title, content, dream_date, mood, sleep_quality, is_lucid, category, tags
       FROM dream_entries WHERE user_id = $1 ORDER BY dream_date DESC LIMIT 20`,
      [userId]
    );
    const insights = await pool.query(
      `SELECT title, content, insight_type, significance FROM dream_insights WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10`,
      [userId]
    );

    // Apply rule-based interpretation
    const rules = rulesStore.rules;
    const interpretations = dreams.rows.map(d => {
      const haystack = `${d.title}\n${d.content}`.toLowerCase();
      const matches = [];
      for (const r of rules) {
        try {
          const re = new RegExp(r.pattern, 'i');
          if (re.test(haystack)) matches.push({ symbol: r.symbol, tag: r.tag, note: r.note, priority: r.priority });
        } catch (_) { /* invalid regex - skip */ }
      }
      matches.sort((a, b) => b.priority - a.priority);
      return { dream: d, matches };
    });

    // Generate PDF using minimal in-line PDF builder (no extra dep required)
    const lines = [];
    lines.push('AI Dream Journal - Interpretation Report');
    lines.push(`Generated: ${new Date().toISOString()}`);
    lines.push(`Dreams analyzed: ${dreams.rows.length}`);
    lines.push('');
    lines.push('--- Symbolic Interpretations ---');
    for (const item of interpretations) {
      const d = item.dream;
      const dateStr = d.dream_date instanceof Date ? d.dream_date.toISOString().slice(0, 10) : String(d.dream_date);
      lines.push(`[${dateStr}] ${d.title}  mood=${d.mood || '-'} lucid=${d.is_lucid ? 'yes' : 'no'}`);
      if (item.matches.length === 0) {
        lines.push('  (no rule matches)');
      } else {
        for (const m of item.matches) {
          lines.push(`  -> ${m.symbol} [${m.tag}] (p=${m.priority}): ${m.note}`);
        }
      }
      lines.push('');
    }
    lines.push('--- Recent Insights ---');
    for (const i of insights.rows) {
      lines.push(`* (${i.significance}) ${i.title}`);
      lines.push(`  ${i.content}`);
    }

    // Build minimal PDF
    const escapePdf = s => String(s).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
    const contentLines = lines.map(l => {
      const wrapped = [];
      let s = String(l);
      while (s.length > 95) { wrapped.push(s.slice(0, 95)); s = s.slice(95); }
      wrapped.push(s);
      return wrapped;
    }).flat();

    let stream = 'BT /F1 10 Tf 12 TL 50 780 Td';
    for (const cl of contentLines) {
      stream += ` (${escapePdf(cl)}) Tj T*`;
    }
    stream += ' ET';
    const streamBuf = Buffer.from(stream, 'utf8');

    const objects = [];
    objects.push('<< /Type /Catalog /Pages 2 0 R >>');
    objects.push('<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
    objects.push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>');
    objects.push(`<< /Length ${streamBuf.length} >>\nstream\n${stream}\nendstream`);
    objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');

    let pdf = '%PDF-1.4\n';
    const offsets = [];
    objects.forEach((body, idx) => {
      offsets.push(Buffer.byteLength(pdf, 'utf8'));
      pdf += `${idx + 1} 0 obj\n${body}\nendobj\n`;
    });
    const xrefStart = Buffer.byteLength(pdf, 'utf8');
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    for (const off of offsets) {
      pdf += `${String(off).padStart(10, '0')} 00000 n \n`;
    }
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="dream-interpretation-report.pdf"');
    res.send(Buffer.from(pdf, 'utf8'));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4) CRUD /rules
router.get('/rules', auth, (req, res) => {
  res.json({ rules: rulesStore.rules });
});

router.post('/rules', auth, (req, res) => {
  const { pattern, tag, symbol, priority, note } = req.body || {};
  if (!pattern || !tag) return res.status(400).json({ error: 'pattern and tag required' });
  const rule = {
    id: rulesStore.nextId++,
    pattern: String(pattern),
    tag: String(tag),
    symbol: symbol ? String(symbol) : '',
    priority: Number(priority) || 5,
    note: note ? String(note) : '',
  };
  rulesStore.rules.push(rule);
  res.status(201).json(rule);
});

router.put('/rules/:id', auth, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const rule = rulesStore.rules.find(r => r.id === id);
  if (!rule) return res.status(404).json({ error: 'rule not found' });
  const { pattern, tag, symbol, priority, note } = req.body || {};
  if (pattern !== undefined) rule.pattern = String(pattern);
  if (tag !== undefined) rule.tag = String(tag);
  if (symbol !== undefined) rule.symbol = String(symbol);
  if (priority !== undefined) rule.priority = Number(priority) || rule.priority;
  if (note !== undefined) rule.note = String(note);
  res.json(rule);
});

router.delete('/rules/:id', auth, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const idx = rulesStore.rules.findIndex(r => r.id === id);
  if (idx === -1) return res.status(404).json({ error: 'rule not found' });
  const [removed] = rulesStore.rules.splice(idx, 1);
  res.json({ deleted: true, rule: removed });
});

export default router;
