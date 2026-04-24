import express from 'express';
import cors from 'cors';
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
import statsRoutes from './routes/stats.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

const app = express();
const PORT = process.env.BACKEND_PORT || 3001;

app.use(cors());
app.use(express.json());

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
app.use('/api/stats', statsRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
