# Audit Notes — AIDreamJournalAnalyzer

Audit source: `_AUDIT/reports/batch_03.md` § 2 (partial-build).

## Original audit recommendations

### Missing AI counterparts
- Emotion trajectory analysis.
- CBT (cognitive-behavioral therapy) suggestions.
- Nutritional / medical correlations (caffeine, alcohol vs. dream quality).
- Dream social features (sharing with pattern comparison).

### Missing non-AI features
- Social dream sharing with privacy controls.
- Dream marketplace / community.
- Export with visualizations (timeline, heatmaps).

### Custom feature suggestions
- Real-time biometric sync (Oura / Apple Watch).
- Recurring nightmare intervention (image rehearsal therapy).
- Dream collage generator (vision model).
- Peer analysis (anonymous matching).
- Medication / supplement effect correlation.
- Art / music generation for dream narratives.

## Current state observed

Solid AI surface already exists (`routes/ai.js`: analyze-dream, detect-patterns,
interpret-symbol, sleep-recommendations, lucid-coaching, journal-summary,
history; `routes/aiNew.js` adds weekly-digest and dream-visualization-prompt).
Domain CRUD covered (categories, dreams, goals, insights, lucid, moods,
recurring, sharing, sleep_quality, symbols, tags).

## Implementations applied this pass

None applied this round — every audit-suggested item is either already covered
in shape (visualization, summary) or sits in the NEEDS-CREDS / NEEDS-PRODUCT
buckets below.

## Prioritized backlog

1. **MECHANICAL** — Add `/emotion-trajectory` endpoint in `aiNew.js`: aggregate
   `mood_entries` over a window and request the model for a longitudinal
   emotional arc analysis. Pattern matches existing `weekly-digest` route.
2. **MECHANICAL** — Add `/cbt-suggestions` endpoint: take `{ dream_id }`,
   join the dream content with mood and prompt the model for CBT-style
   reframes and homework prompts.
3. **MECHANICAL** — Add `/lifestyle-correlation` endpoint: optional table
   `lifestyle_logs` (caffeine/alcohol/exercise) joined with sleep+dreams
   for AI correlation analysis. (Schema add required first.)
4. **NEEDS-CREDS** — Oura / Apple Watch / Fitbit integrations require OAuth
   apps and per-user credentials.
5. **NEEDS-PRODUCT-DECISION** — Social/marketplace features need privacy,
   moderation, and payments architecture.
6. **TOO-RISKY** — Anonymous peer matching across users introduces re-identification
   risks and moderation obligations; needs DPIA before implementation.

## Apply pass 3 (frontend)

FE already wired. `frontend/src/pages/AIAnalysis.jsx` calls `/api/ai/analyze-dream`, `/api/ai/detect-patterns`, `/api/ai/interpret-symbol`, `/api/ai/journal-summary`, and `/api/ai/history` with `Authorization: Bearer <token>` headers (via `apiHeaders()` in `App.jsx`). Route `/ai-analysis` is registered in `App.jsx`. No FE changes required.

## Apply pass 4 (mechanical backlog)

Implemented the two MECHANICAL backlog items that did not require schema changes:

- `POST /api/ai/emotion-trajectory` (in `backend/routes/aiNew.js`): aggregates `mood_entries` over a configurable window (default 30 days, max 365) and asks the model for a longitudinal arc, phases, volatility, drivers, risk signals, and forward outlook. Persists to `ai_analyses` with `analysis_type='emotion_trajectory'`.
- `POST /api/ai/cbt-suggestions` (in `backend/routes/aiNew.js`): given `{ dream_id }`, joins the dream with mood entries within +/- 7 days and asks the model for cognitions, distortions, reframes, behavioral experiments, and homework prompts. Persists with `analysis_type='cbt_suggestions'`.

Both reuse the existing `callOpenRouter` helper in the same file, now augmented with a 503 short-circuit when `OPENROUTER_API_KEY` is missing. Existing routes (`weekly-digest`, `dream-visualization-prompt`, `pattern-breaking`) honor the new `err.statusCode` in their catch handlers, so they also surface 503 instead of 500 when the key is missing. No new dependencies and no schema changes.

FE: `frontend/src/pages/AIAnalysis.jsx` adds two tabs, "Emotion Trajectory" and "CBT Suggestions", with form fields, JWT bearer (`apiHeaders()`), and explicit `503` handling that surfaces "AI not configured" to the user.

Smoke-tested locally: backend boots, login succeeds, `emotion-trajectory` returns 200 (empty-window short-circuit) with a valid token; with `OPENROUTER_API_KEY=""` and a mood entry seeded, it returns 503 as expected.

Lifestyle correlation backlog item (`/lifestyle-correlation`) was deferred because it requires a new `lifestyle_logs` table — out of scope per the apply-pass-4 constraints.

## Apply pass 5 (all backlog)

Implemented the deferred MECHANICAL `/lifestyle-correlation` endpoint plus a writer for the additive table. ENV: `OPENROUTER_API_KEY` (503 on missing).

- `backend/routes/aiNew.js` — at module load, `CREATE TABLE IF NOT EXISTS lifestyle_logs (...)` (additive, idempotent). `POST /api/ai/lifestyle-correlation` joins lifestyle logs with sleep + dreams over a window (default 30 days, max 365) and asks for correlations, confounders, hypotheses, recommendations, and caveats. `POST /api/ai/lifestyle-logs` is a minimal writer for the new table so the correlation tool is end-to-end usable.
- `frontend/src/pages/AIAnalysis.jsx` — adds a "Lifestyle Correlation" tab with a window-days input, JWT bearer (`apiHeaders()`), and explicit 503 handling that surfaces "AI not configured" to the user.

Smoke-tested locally: backend boots on alt port 3811, login OK, `POST /api/ai/lifestyle-correlation` with no logs in window returns 200 and the empty-window short-circuit message before any AI call.

Remaining backlog (unchanged tags): NEEDS-CREDS Oura/AppleWatch/Fitbit OAuth integrations; NEEDS-PRODUCT-DECISION social/marketplace; TOO-RISKY anonymous peer matching.
