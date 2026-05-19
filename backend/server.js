import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import authRoutes from './routes/auth.js';
import dreamRoutes from './routes/dreams.js';
import symbolRoutes from './routes/symbols.js';
import moodRoutes from './routes/moods.js';
import categoryRoutes from './routes/categories.js';
import sleepQualityRoutes from './routes/sleepQuality.js';
import lucidDreamRoutes from './routes/lucidDreams.js';
import recurringDreamRoutes from './routes/recurringDreams.js';
import tagRoutes from './routes/tags.js';
import goalRoutes from './routes/goals.js';
import insightRoutes from './routes/insights.js';
import aiRoutes from './routes/ai.js';
import aiNewRoutes from './routes/aiNew.js';
import exportRoutes from './routes/export.js';
import statsRoutes from './routes/stats.js';
import sharingRoutes from './routes/sharing.js';
import customViewsRoutes from './routes/customViews.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

const app = express();
const PORT = process.env.BACKEND_PORT || 3001;

// Security headers
app.use(helmet({ contentSecurityPolicy: false }));

// Env-driven CORS allowlist
const corsOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:5173')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true); // allow same-origin/curl
    if (corsOrigins.includes('*') || corsOrigins.includes(origin)) return cb(null, true);
    return cb(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/dreams', dreamRoutes);
app.use('/api/symbols', symbolRoutes);
app.use('/api/moods', moodRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/sleep-quality', sleepQualityRoutes);
app.use('/api/lucid-dreams', lucidDreamRoutes);
app.use('/api/recurring-dreams', recurringDreamRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/insights', insightRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/ai', aiNewRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/sharing', sharingRoutes);
app.use('/api/biometric-sync', (await import('./routes/biometricSync.js')).default);
app.use('/api/nightmare-intervention', (await import('./routes/nightmareIntervention.js')).default);
app.use('/api/dream-collage', (await import('./routes/dreamCollage.js')).default);
app.use('/api/peer-pattern-match', (await import('./routes/peerPatternMatch.js')).default);
app.use('/api/audio-dream', (await import('./routes/audioDreamCapture.js')).default);
app.use('/api/art-music', (await import('./routes/artMusicGen.js')).default);

// Mount custom views BEFORE any 404 handler
app.use('/api/custom-views', customViewsRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});


// === Batch 03 Gaps & Frontend Mounts ===
try {
  const _batch03 = require('./routes/batch03Gaps');
  if (typeof authenticateToken === 'function') app.use('/api', authenticateToken, _batch03);
  else app.use('/api', _batch03);
} catch (_e) { /* batch03 gap routes optional */ }

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
