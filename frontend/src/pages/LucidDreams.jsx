import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API, apiHeaders } from '../App';
import AIOutput from '../components/AIOutput';

export default function LucidDreams() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [aiResult, setAiResult] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', dream_date: '', technique_used: '', lucidity_level: 5, duration_minutes: 15, control_level: 5 });

  const load = () => fetch(`${API}/lucid-dreams`, { headers: apiHeaders() }).then(r => r.json()).then(setEntries).catch(() => {});
  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const url = editing ? `${API}/lucid-dreams/${editing.id}` : `${API}/lucid-dreams`;
    await fetch(url, { method: editing ? 'PUT' : 'POST', headers: apiHeaders(), body: JSON.stringify({ ...form, lucidity_level: parseInt(form.lucidity_level), duration_minutes: parseInt(form.duration_minutes), control_level: parseInt(form.control_level) }) });
    setShowForm(false); setEditing(null); setForm({ title: '', content: '', dream_date: '', technique_used: '', lucidity_level: 5, duration_minutes: 15, control_level: 5 }); load();
  };

  const handleDelete = async (id) => {
    await fetch(`${API}/lucid-dreams/${id}`, { method: 'DELETE', headers: apiHeaders() });
    setSelected(null); load();
  };

  const getCoaching = async () => {
    setAiLoading(true); setAiResult('');
    try {
      const res = await fetch(`${API}/ai/lucid-coaching`, { method: 'POST', headers: apiHeaders(), body: JSON.stringify({ experience_level: 'intermediate', goals: 'Improve frequency and control' }) });
      const data = await res.json();
      setAiResult(data.analysis);
    } catch { setAiResult('Error getting coaching.'); }
    setAiLoading(false);
  };

  return (
    <div>
      <div className="page-header">
        <h1>Lucid Dreams</h1>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-ai" onClick={getCoaching}>AI Lucid Coaching</button>
          <button className="btn btn-primary" style={{ width: 'auto' }} onClick={() => { setEditing(null); setForm({ title: '', content: '', dream_date: new Date().toISOString().split('T')[0], technique_used: '', lucidity_level: 5, duration_minutes: 15, control_level: 5 }); setShowForm(true); }}>+ New Entry</button>
          <span className="back-btn" onClick={() => navigate('/')}>Back</span>
        </div>
      </div>

      <AIOutput text={aiResult} loading={aiLoading} />

      <div className="data-table-wrapper" style={{ marginTop: '20px' }}>
        <table className="data-table">
          <thead><tr><th>Date</th><th>Title</th><th>Technique</th><th>Lucidity</th><th>Duration</th><th>Control</th></tr></thead>
          <tbody>
            {entries.map(e => (
              <tr key={e.id} onClick={() => setSelected(e)}>
                <td>{e.dream_date?.split('T')[0]}</td>
                <td style={{ fontWeight: 600 }}>{e.title}</td>
                <td><span className="tag" style={{ background: 'rgba(245,158,11,0.2)', color: '#fbbf24' }}>{e.technique_used}</span></td>
                <td>{e.lucidity_level}/10</td>
                <td>{e.duration_minutes} min</td>
                <td>{e.control_level}/10</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>{selected.title}</h2>
            {[{ label: 'Date', value: selected.dream_date?.split('T')[0] }, { label: 'Content', value: selected.content }, { label: 'Technique', value: selected.technique_used }, { label: 'Lucidity', value: `${selected.lucidity_level}/10` }, { label: 'Duration', value: `${selected.duration_minutes} minutes` }, { label: 'Control', value: `${selected.control_level}/10` }].map((f, i) => (
              <div key={i} className="detail-row"><span className="detail-label">{f.label}</span><span className="detail-value">{f.value}</span></div>
            ))}
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => { setEditing(selected); setForm({ title: selected.title, content: selected.content, dream_date: selected.dream_date?.split('T')[0], technique_used: selected.technique_used || '', lucidity_level: selected.lucidity_level, duration_minutes: selected.duration_minutes, control_level: selected.control_level }); setSelected(null); setShowForm(true); }}>Edit</button>
              <button className="btn btn-danger" onClick={() => handleDelete(selected.id)}>Delete</button>
              <button className="btn btn-secondary" onClick={() => setSelected(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content form-modal" onClick={e => e.stopPropagation()}>
            <h2>{editing ? 'Edit Lucid Dream' : 'New Lucid Dream'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group"><label>Title</label><input value={form.title} onChange={e => setForm({...form, title: e.target.value})} required /></div>
              <div className="form-group"><label>Content</label><textarea value={form.content} onChange={e => setForm({...form, content: e.target.value})} required /></div>
              <div className="form-row">
                <div className="form-group"><label>Date</label><input type="date" value={form.dream_date} onChange={e => setForm({...form, dream_date: e.target.value})} required /></div>
                <div className="form-group"><label>Technique</label>
                  <select value={form.technique_used} onChange={e => setForm({...form, technique_used: e.target.value})}>
                    <option value="">Select</option>
                    {['Reality Check','WILD','MILD','DILD','WBTB','SSILD','FILD'].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Lucidity (1-10)</label><input type="number" min="1" max="10" value={form.lucidity_level} onChange={e => setForm({...form, lucidity_level: e.target.value})} /></div>
                <div className="form-group"><label>Duration (min)</label><input type="number" min="1" value={form.duration_minutes} onChange={e => setForm({...form, duration_minutes: e.target.value})} /></div>
              </div>
              <div className="form-group"><label>Control Level (1-10)</label><input type="number" min="1" max="10" value={form.control_level} onChange={e => setForm({...form, control_level: e.target.value})} /></div>
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
