// === Batch 03 Gaps & Frontend Mounts ===
// Auto-generated frontend page (lean v0). Wires Custom Feature Suggestions
// and Gap endpoints (AI counterparts + non-AI features) to backend routes.
import React, { useState } from 'react';

const API_BASE = (typeof process !== 'undefined' && process.env && process.env.REACT_APP_API_URL) || 'http://localhost:4000/api';

const FEATURES = [
  { kind: 'cfs', slug: 'cf-real-time-biometric-sync', label: 'Real-time biometric sync', desc: 'Integrate Oura/Apple Watch for sleep-stage correlation', endpoint: '/cf-real-time-biometric-sync' },
  { kind: 'cfs', slug: 'cf-recurring-nightmare-intervention', label: 'Recurring nightmare intervention', desc: 'Agentic IRT flow (daily prompts, rewriting nightmare narratives)', endpoint: '/cf-recurring-nightmare-intervention' },
  { kind: 'cfs', slug: 'cf-dream-collage-generator', label: 'Dream collage generator', desc: 'Vision model creates mood boards from dream text', endpoint: '/cf-dream-collage-generator' },
  { kind: 'cfs', slug: 'cf-peer-pattern-matching', label: 'Peer pattern matching', desc: 'Anonymous matching with users sharing similar motifs', endpoint: '/cf-peer-pattern-matching' },
  { kind: 'cfs', slug: 'cf-audio-dream-capture', label: 'Audio dream capture', desc: 'Mobile-friendly voice recording with transcription', endpoint: '/cf-audio-dream-capture' },
  { kind: 'cfs', slug: 'cf-art-music-generation', label: 'Art/music generation', desc: 'Create accompaniment to dream narratives', endpoint: '/cf-art-music-generation' },
  { kind: 'gap-ai', slug: 'gap-ai-no-emotion-trajectory-longitudinal-analysis', label: 'No emotion-trajectory longitudinal analysis', desc: 'No emotion-trajectory longitudinal analysis', endpoint: '/gap-no-emotion-trajectory-longitudinal-analysis' },
  { kind: 'gap-ai', slug: 'gap-ai-no-cbt-image-rehearsal-therapy-guided-flow', label: 'No CBT / Image Rehearsal Therapy guided flow', desc: 'No CBT / Image Rehearsal Therapy guided flow', endpoint: '/gap-no-cbt-image-rehearsal-therapy-guided-flow' },
  { kind: 'gap-ai', slug: 'gap-ai-no-nutrition-medication-correlation-analyser', label: 'No nutrition/medication correlation analyser', desc: 'No nutrition/medication correlation analyser', endpoint: '/gap-no-nutrition-medication-correlation-analyser' },
  { kind: 'gap-ai', slug: 'gap-ai-no-vision-model-dream-image-generation', label: 'No vision-model dream-image generation', desc: 'No vision-model dream-image generation', endpoint: '/gap-no-vision-model-dream-image-generation' },
  { kind: 'gap-non', slug: 'gap-non-no-wearables-biometrics-ingest-no-oura-apple-watch-sync', label: 'No wearables/biometrics ingest (no Oura/Apple Watch sync)', desc: 'No wearables/biometrics ingest (no Oura/Apple Watch sync)', endpoint: '/gap-no-wearables-biometrics-ingest-no-oura-apple-watch-sync' },
  { kind: 'gap-non', slug: 'gap-non-no-notifications-reminder-system', label: 'No notifications / reminder system', desc: 'No notifications / reminder system', endpoint: '/gap-no-notifications-reminder-system' },
  { kind: 'gap-non', slug: 'gap-non-no-webhooks-for-integrations', label: 'No webhooks for integrations', desc: 'No webhooks for integrations', endpoint: '/gap-no-webhooks-for-integrations' },
  { kind: 'gap-non', slug: 'gap-non-no-file-upload-audio-dream-recording-missing', label: 'No file upload (audio dream recording missing)', desc: 'No file upload (audio dream recording missing)', endpoint: '/gap-no-file-upload-audio-dream-recording-missing' },
  { kind: 'gap-non', slug: 'gap-non-no-anonymised-research-corpus-contribution-flow', label: 'No anonymised research-corpus contribution flow', desc: 'No anonymised research-corpus contribution flow', endpoint: '/gap-no-anonymised-research-corpus-contribution-flow' },
  { kind: 'gap-non', slug: 'gap-non-limited-search-no-full-text-dream-search-route', label: 'Limited search (no full-text dream search route)', desc: 'Limited search (no full-text dream search route)', endpoint: '/gap-limited-search-no-full-text-dream-search-route' },
];

function authHeaders() {
  const t = (typeof window !== 'undefined') ? localStorage.getItem('token') : null;
  return { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) };
}

export default function Batch03Features() {
  const [active, setActive] = useState(FEATURES[0]?.slug);
  const [input, setInput] = useState('');
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const current = FEATURES.find(f => f.slug === active) || FEATURES[0];

  async function run() {
    if (!current) return;
    setLoading(true); setError(null);
    try {
      let parsed;
      try { parsed = input ? JSON.parse(input) : {}; } catch { parsed = { input }; }
      const r = await fetch(`${API_BASE}${current.endpoint}`, {
        method: 'POST', headers: authHeaders(), body: JSON.stringify(parsed)
      });
      let body; try { body = await r.json(); } catch { body = { raw: await r.text() }; }
      if (!r.ok) setError(body.error || `HTTP ${r.status}`);
      setResults(prev => ({ ...prev, [current.slug]: body }));
    } catch (e) {
      setError(String(e.message || e));
    } finally { setLoading(false); }
  }

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <h2 style={{ marginTop: 0 }}>Batch 03 Features <small style={{ color: '#64748b', fontWeight: 400 }}>(AIDreamJournalAnalyzer)</small></h2>
      <p style={{ color: '#475569', maxWidth: 720 }}>
        Audit-driven AI counterparts, non-AI feature gaps, and custom feature suggestions.
        Backend endpoints prefixed <code>/api/cf-*</code> (custom features) and <code>/api/gap-*</code> (gap fills).
      </p>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '12px 0' }}>
        {FEATURES.map(f => (
          <button key={f.slug} onClick={() => setActive(f.slug)}
            style={{ padding: '6px 10px', borderRadius: 4, border: '1px solid #cbd5e1',
                     background: active === f.slug ? '#1e40af' : '#f8fafc',
                     color: active === f.slug ? 'white' : '#0f172a', cursor: 'pointer', fontSize: 12 }}>
            <span style={{ opacity: 0.7, marginRight: 4 }}>[{f.kind}]</span>{f.label}
          </button>
        ))}
      </div>
      {current && (
        <div style={{ marginTop: 16, padding: 16, background: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0' }}>
          <div style={{ marginBottom: 8 }}>
            <strong>{current.label}</strong>
            <div style={{ color: '#475569', fontSize: 13 }}>{current.desc}</div>
            <div style={{ color: '#64748b', fontSize: 11, marginTop: 4 }}>POST <code>{current.endpoint}</code></div>
          </div>
          <textarea value={input} onChange={e => setInput(e.target.value)}
            placeholder='Optional JSON input (e.g. {"query":"..."})'
            style={{ width: '100%', minHeight: 80, padding: 8, fontFamily: 'monospace', fontSize: 12, border: '1px solid #cbd5e1', borderRadius: 4 }} />
          <div style={{ marginTop: 8 }}>
            <button onClick={run} disabled={loading}
              style={{ padding: '8px 16px', background: '#1e40af', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', opacity: loading ? 0.6 : 1 }}>
              {loading ? 'Running…' : 'Run'}
            </button>
          </div>
          {error && (<div style={{ marginTop: 12, padding: 10, background: '#fee2e2', color: '#991b1b', borderRadius: 4, fontSize: 13 }}>{error}</div>)}
          {results[current.slug] && (
            <pre style={{ marginTop: 12, padding: 10, background: '#0b1020', color: '#cbd5e1', borderRadius: 4, overflow: 'auto', maxHeight: 360, fontSize: 12 }}>
              {typeof results[current.slug] === 'string' ? results[current.slug] : JSON.stringify(results[current.slug], null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
