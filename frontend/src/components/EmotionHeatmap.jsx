import React, { useEffect, useState } from 'react';
import { API, apiHeaders } from '../App';

function colorFor(value, max) {
  if (!max || value <= 0) return 'rgba(99,102,241,0.05)';
  const t = Math.min(1, value / max);
  // purple -> magenta gradient
  const r = Math.round(99 + (236 - 99) * t);
  const g = Math.round(102 + (72 - 102) * t);
  const b = Math.round(241 + (153 - 241) * t);
  return `rgba(${r},${g},${b},${0.25 + 0.65 * t})`;
}

export default function EmotionHeatmap() {
  const [emotions, setEmotions] = useState([]);
  const [slots, setSlots] = useState([]);
  const [matrix, setMatrix] = useState([]);
  const [err, setErr] = useState('');

  useEffect(() => {
    fetch(`${API}/custom-views/emotion-heatmap`, { headers: apiHeaders() })
      .then(r => r.json())
      .then(d => {
        setEmotions(d.emotions || []);
        setSlots(d.slots || []);
        setMatrix(d.matrix || []);
      })
      .catch(e => setErr(String(e)));
  }, []);

  const max = matrix.reduce((m, row) => row.reduce((mm, v) => Math.max(mm, v), m), 0);

  return (
    <div style={{ background: 'rgba(30,27,75,0.6)', padding: 20, borderRadius: 16, border: '1px solid rgba(99,102,241,0.3)' }}>
      <h3 style={{ marginBottom: 8, color: '#c4b5fd' }}>Emotion x Time-of-Night Heatmap</h3>
      <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 12 }}>Hotter cells = more dreams with that emotion in that time slot.</p>
      {err && <p style={{ color: '#f87171' }}>{err}</p>}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'separate', borderSpacing: 4, width: '100%' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', color: '#a5b4fc', fontSize: 12, padding: '4px 8px' }}>Emotion</th>
              {slots.map(s => (
                <th key={s} style={{ color: '#a5b4fc', fontSize: 12, padding: '4px 8px' }}>{s}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {emotions.map((e, i) => (
              <tr key={e}>
                <td style={{ color: '#e2e8f0', fontSize: 13, padding: '4px 8px', whiteSpace: 'nowrap' }}>{e}</td>
                {slots.map((_, j) => (
                  <td
                    key={j}
                    title={`${e} - ${slots[j]}: ${matrix[i]?.[j] ?? 0}`}
                    style={{
                      background: colorFor(matrix[i]?.[j] ?? 0, max),
                      color: '#fff',
                      textAlign: 'center',
                      borderRadius: 6,
                      minWidth: 60,
                      padding: '10px 6px',
                      fontWeight: 600,
                    }}
                  >
                    {matrix[i]?.[j] ?? 0}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
