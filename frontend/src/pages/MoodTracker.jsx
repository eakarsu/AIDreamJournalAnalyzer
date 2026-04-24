import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API, apiHeaders } from '../App';

export default function MoodTracker() {
  const navigate = useNavigate();
  const [moods, setMoods] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ mood: '', intensity: 5, entry_date: '', notes: '', triggers: '' });

  const load = () => fetch(`${API}/moods`, { headers: apiHeaders() }).then(r => r.json()).then(setMoods).catch(() => {});
  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const url = editing ? `${API}/moods/${editing.id}` : `${API}/moods`;
    await fetch(url, { method: editing ? 'PUT' : 'POST', headers: apiHeaders(), body: JSON.stringify({ ...form, intensity: parseInt(form.intensity) }) });
    setShowForm(false); setEditing(null); setForm({ mood: '', intensity: 5, entry_date: '', notes: '', triggers: '' }); load();
  };

  const handleDelete = async (id) => {
    await fetch(`${API}/moods/${id}`, { method: 'DELETE', headers: apiHeaders() });
    setSelected(null); load();
  };

  const moodColors = { Happy: '#22c55e', Joyful: '#22c55e', Peaceful: '#06b6d4', Serene: '#06b6d4', Calm: '#06b6d4', Anxious: '#f97316', Stressed: '#ef4444', Frightened: '#ef4444', Melancholic: '#8b5cf6', Curious: '#3b82f6', Energized: '#eab308', Amused: '#f59e0b', Contemplative: '#7c3aed', Inspired: '#ec4899', Determined: '#f97316', Reflective: '#a855f7', Excited: '#f43f5e' };

  return (
    <div>
      <div className="page-header">
        <h1>Mood Tracker</h1>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-primary" style={{ width: 'auto' }} onClick={() => { setEditing(null); setForm({ mood: '', intensity: 5, entry_date: new Date().toISOString().split('T')[0], notes: '', triggers: '' }); setShowForm(true); }}>+ New Mood</button>
          <span className="back-btn" onClick={() => navigate('/')}>Back</span>
        </div>
      </div>

      <div className="data-table-wrapper">
        <table className="data-table">
          <thead><tr><th>Date</th><th>Mood</th><th>Intensity</th><th>Triggers</th><th>Notes</th></tr></thead>
          <tbody>
            {moods.map(m => (
              <tr key={m.id} onClick={() => setSelected(m)}>
                <td>{m.entry_date?.split('T')[0]}</td>
                <td><span className="mood-badge" style={{ background: `${moodColors[m.mood] || '#6366f1'}22`, color: moodColors[m.mood] || '#a5b4fc', border: `1px solid ${moodColors[m.mood] || '#6366f1'}44` }}>{m.mood}</span></td>
                <td>{m.intensity}/10</td>
                <td>{m.triggers}</td>
                <td style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>Mood Entry</h2>
            {[{ label: 'Date', value: selected.entry_date?.split('T')[0] }, { label: 'Mood', value: selected.mood }, { label: 'Intensity', value: `${selected.intensity}/10` }, { label: 'Triggers', value: selected.triggers }, { label: 'Notes', value: selected.notes }].map((f, i) => (
              <div key={i} className="detail-row"><span className="detail-label">{f.label}</span><span className="detail-value">{f.value}</span></div>
            ))}
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => { setEditing(selected); setForm({ mood: selected.mood, intensity: selected.intensity, entry_date: selected.entry_date?.split('T')[0], notes: selected.notes || '', triggers: selected.triggers || '' }); setSelected(null); setShowForm(true); }}>Edit</button>
              <button className="btn btn-danger" onClick={() => handleDelete(selected.id)}>Delete</button>
              <button className="btn btn-secondary" onClick={() => setSelected(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content form-modal" onClick={e => e.stopPropagation()}>
            <h2>{editing ? 'Edit Mood' : 'New Mood Entry'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group"><label>Mood</label>
                  <select value={form.mood} onChange={e => setForm({...form, mood: e.target.value})} required>
                    <option value="">Select</option>
                    {['Happy','Joyful','Peaceful','Serene','Calm','Anxious','Stressed','Frightened','Melancholic','Curious','Energized','Amused','Contemplative','Inspired','Determined','Reflective','Excited'].map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div className="form-group"><label>Intensity (1-10)</label><input type="number" min="1" max="10" value={form.intensity} onChange={e => setForm({...form, intensity: e.target.value})} /></div>
              </div>
              <div className="form-group"><label>Date</label><input type="date" value={form.entry_date} onChange={e => setForm({...form, entry_date: e.target.value})} required /></div>
              <div className="form-group"><label>Triggers</label><input value={form.triggers} onChange={e => setForm({...form, triggers: e.target.value})} placeholder="What triggered this mood?" /></div>
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
