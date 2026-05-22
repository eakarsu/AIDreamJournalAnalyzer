import React, { useState } from 'react';

const API = '/api';

function apiHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

export default function NightmareTriggerPlan() {
  const [form, setForm] = useState({
    recurringCount: 3,
    intensity: 8,
    sleepDebtHours: 4,
    tags: 'stress,chase,falling',
    wakeAfterDream: true,
  });
  const [result, setResult] = useState(null);

  const run = async () => {
    const response = await fetch(`${API}/nightmare-trigger-plan/plan`, {
      method: 'POST',
      headers: apiHeaders(),
      body: JSON.stringify({ ...form, tags: form.tags.split(',').map((tag) => tag.trim()).filter(Boolean) }),
    });
    setResult(await response.json());
  };

  return (
    <div className="page">
      <h1>Nightmare Trigger Plan</h1>
      <div className="card">
        <label>Recurring count<input type="number" value={form.recurringCount} onChange={(e) => setForm({ ...form, recurringCount: Number(e.target.value) })} /></label>
        <label>Intensity<input type="number" value={form.intensity} onChange={(e) => setForm({ ...form, intensity: Number(e.target.value) })} /></label>
        <label>Sleep debt hours<input type="number" value={form.sleepDebtHours} onChange={(e) => setForm({ ...form, sleepDebtHours: Number(e.target.value) })} /></label>
        <label>Tags<input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} /></label>
        <label><input type="checkbox" checked={form.wakeAfterDream} onChange={(e) => setForm({ ...form, wakeAfterDream: e.target.checked })} /> Woke after dream</label>
        <button onClick={run}>Build plan</button>
      </div>
      {result && (
        <div className="card">
          <h2>{result.level.toUpperCase()} · {result.score}/100</h2>
          <ul>{result.steps.map((step) => <li key={step}>{step}</li>)}</ul>
        </div>
      )}
    </div>
  );
}
