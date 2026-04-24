import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API, apiHeaders } from '../App';
import AIOutput from '../components/AIOutput';

export default function SleepQuality() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [aiResult, setAiResult] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [form, setForm] = useState({ sleep_date: '', hours_slept: '', quality_rating: 5, bedtime: '', wake_time: '', notes: '' });

  const load = () => fetch(`${API}/sleep-quality`, { headers: apiHeaders() }).then(r => r.json()).then(setEntries).catch(() => {});
  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const url = editing ? `${API}/sleep-quality/${editing.id}` : `${API}/sleep-quality`;
    await fetch(url, { method: editing ? 'PUT' : 'POST', headers: apiHeaders(), body: JSON.stringify({ ...form, hours_slept: parseFloat(form.hours_slept), quality_rating: parseInt(form.quality_rating) }) });
    setShowForm(false); setEditing(null); setForm({ sleep_date: '', hours_slept: '', quality_rating: 5, bedtime: '', wake_time: '', notes: '' }); load();
  };

  const handleDelete = async (id) => {
    await fetch(`${API}/sleep-quality/${id}`, { method: 'DELETE', headers: apiHeaders() });
    setSelected(null); load();
  };

  const getRecommendations = async () => {
    setAiLoading(true); setAiResult('');
    try {
      const res = await fetch(`${API}/ai/sleep-recommendations`, { method: 'POST', headers: apiHeaders(), body: JSON.stringify({}) });
      const data = await res.json();
      setAiResult(data.analysis);
    } catch { setAiResult('Error getting recommendations.'); }
    setAiLoading(false);
  };

  const qualityColor = (q) => q >= 8 ? '#22c55e' : q >= 6 ? '#eab308' : q >= 4 ? '#f97316' : '#ef4444';

  return (
    <div>
      <div className="page-header">
        <h1>Sleep Quality Tracker</h1>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-ai" onClick={getRecommendations}>AI Recommendations</button>
          <button className="btn btn-primary" style={{ width: 'auto' }} onClick={() => { setEditing(null); setForm({ sleep_date: new Date().toISOString().split('T')[0], hours_slept: '', quality_rating: 5, bedtime: '', wake_time: '', notes: '' }); setShowForm(true); }}>+ New Entry</button>
          <span className="back-btn" onClick={() => navigate('/')}>Back</span>
        </div>
      </div>

      <AIOutput text={aiResult} loading={aiLoading} />

      <div className="data-table-wrapper" style={{ marginTop: '20px' }}>
        <table className="data-table">
          <thead><tr><th>Date</th><th>Hours</th><th>Quality</th><th>Bedtime</th><th>Wake</th><th>Notes</th></tr></thead>
          <tbody>
            {entries.map(e => (
              <tr key={e.id} onClick={() => setSelected(e)}>
                <td>{e.sleep_date?.split('T')[0]}</td>
                <td>{e.hours_slept}h</td>
                <td><span style={{ color: qualityColor(e.quality_rating), fontWeight: 700 }}>{e.quality_rating}/10</span></td>
                <td>{e.bedtime}</td>
                <td>{e.wake_time}</td>
                <td style={{ maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>Sleep Entry</h2>
            {[{ label: 'Date', value: selected.sleep_date?.split('T')[0] }, { label: 'Hours Slept', value: `${selected.hours_slept} hours` }, { label: 'Quality', value: `${selected.quality_rating}/10` }, { label: 'Bedtime', value: selected.bedtime }, { label: 'Wake Time', value: selected.wake_time }, { label: 'Notes', value: selected.notes }].map((f, i) => (
              <div key={i} className="detail-row"><span className="detail-label">{f.label}</span><span className="detail-value">{f.value}</span></div>
            ))}
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => { setEditing(selected); setForm({ sleep_date: selected.sleep_date?.split('T')[0], hours_slept: selected.hours_slept, quality_rating: selected.quality_rating, bedtime: selected.bedtime || '', wake_time: selected.wake_time || '', notes: selected.notes || '' }); setSelected(null); setShowForm(true); }}>Edit</button>
              <button className="btn btn-danger" onClick={() => handleDelete(selected.id)}>Delete</button>
              <button className="btn btn-secondary" onClick={() => setSelected(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content form-modal" onClick={e => e.stopPropagation()}>
            <h2>{editing ? 'Edit Entry' : 'New Sleep Entry'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group"><label>Date</label><input type="date" value={form.sleep_date} onChange={e => setForm({...form, sleep_date: e.target.value})} required /></div>
                <div className="form-group"><label>Hours Slept</label><input type="number" step="0.5" min="0" max="24" value={form.hours_slept} onChange={e => setForm({...form, hours_slept: e.target.value})} required /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Quality (1-10)</label><input type="number" min="1" max="10" value={form.quality_rating} onChange={e => setForm({...form, quality_rating: e.target.value})} /></div>
                <div className="form-group"><label>Bedtime</label><input type="time" value={form.bedtime} onChange={e => setForm({...form, bedtime: e.target.value})} /></div>
              </div>
              <div className="form-group"><label>Wake Time</label><input type="time" value={form.wake_time} onChange={e => setForm({...form, wake_time: e.target.value})} /></div>
              <div className="form-group"><label>Notes</label><textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} /></div>
              <div className="modal-actions">
                <button type="submit" className="btn btn-primary" style={{ width: 'auto' }}>{editing ? 'Update' : 'Save'}</button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
