import express from 'express';

const router = express.Router();

router.post('/plan', (req, res) => {
  const {
    recurringCount = 0,
    intensity = 5,
    sleepDebtHours = 0,
    tags = [],
    wakeAfterDream = false,
  } = req.body || {};

  const normalizedTags = Array.isArray(tags) ? tags.map((tag) => String(tag).toLowerCase()) : [];
  const triggerWeight = normalizedTags.filter((tag) => ['stress', 'conflict', 'falling', 'chase', 'illness'].includes(tag)).length * 10;
  const score = Math.min(100, Math.round(
    (Number(recurringCount) || 0) * 14 +
    (Number(intensity) || 0) * 6 +
    (Number(sleepDebtHours) || 0) * 4 +
    triggerWeight +
    (wakeAfterDream ? 12 : 0)
  ));

  const steps = [
    score >= 60 && 'Create an imagery rehearsal rewrite before bedtime.',
    normalizedTags.includes('stress') && 'Add a pre-sleep worry parking note with one next action.',
    (Number(sleepDebtHours) || 0) > 3 && 'Protect an earlier wind-down window for the next two nights.',
    wakeAfterDream && 'Log wake time and body state immediately after the dream.',
  ].filter(Boolean);

  res.json({
    feature: 'nightmare_trigger_plan',
    score,
    level: score >= 70 ? 'high' : score >= 35 ? 'moderate' : 'low',
    triggerTags: normalizedTags,
    steps: steps.length ? steps : ['Continue baseline journal tagging and sleep-quality tracking.'],
  });
});

export default router;
