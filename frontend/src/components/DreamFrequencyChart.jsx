import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend, ResponsiveContainer } from 'recharts';
import { API, apiHeaders } from '../App';

export default function DreamFrequencyChart() {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [err, setErr] = useState('');

  useEffect(() => {
    fetch(`${API}/custom-views/dream-frequency`, { headers: apiHeaders() })
      .then(r => r.json())
      .then(d => { setData(d.months || []); setTotal(d.total || 0); })
      .catch(e => setErr(String(e)));
  }, []);

  return (
    <div style={{ background: 'rgba(30,27,75,0.6)', padding: 20, borderRadius: 16, border: '1px solid rgba(99,102,241,0.3)' }}>
      <h3 style={{ marginBottom: 8, color: '#c4b5fd' }}>Dream Frequency by Month</h3>
      <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 12 }}>Total dreams: {total}</p>
      {err && <p style={{ color: '#f87171' }}>{err}</p>}
      <div style={{ width: '100%', height: 300 }}>
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
            <CartesianGrid stroke="rgba(148,163,184,0.2)" strokeDasharray="3 3" />
            <XAxis dataKey="month" stroke="#a5b4fc" tick={{ fontSize: 12 }} />
            <YAxis stroke="#a5b4fc" allowDecimals={false} tick={{ fontSize: 12 }} />
            <Tooltip contentStyle={{ background: '#1e1b4b', border: '1px solid #6366f1' }} />
            <Legend />
            <Line type="monotone" dataKey="count" stroke="#818cf8" strokeWidth={2} name="Dreams" />
            <Line type="monotone" dataKey="lucidCount" stroke="#f59e0b" strokeWidth={2} name="Lucid" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
