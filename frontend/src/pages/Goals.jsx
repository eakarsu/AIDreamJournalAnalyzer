import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API, apiHeaders } from '../App';

export default function Goals() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: '', description: '', target_date: '', goal_type: '', target_value: '', current_value: 0, status: 'active' });

  const load = () => fetch(`${API}/goals`, { headers: apiHeaders() }).then(r => r.json()).then(setItems).catch(() => {});
  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const url = editing ? `${API}/goals/${editing.id}` : `${API}/goals`;
    await fetch(url, { method: editing ? 'PUT' : 'POST', headers: apiHeaders(), body: JSON.stringify({ ...form, target_value: parseFloat(form.target_value), current_value: parseFloat(form.current_value) }) });
    setShowForm(false); setEditing(null); setForm({ title: '', description: '', target_date: '', goal_type: '', target_value: '', current_value: 0, status: 'active' }); load();
  };

  const handleDelete = async (id) => {
    await fetch(`${API}/goals/${id}`, { method: 'DELETE', headers: apiHeaders() });
    setSelected(null); load();
  };

  const getProgress = (g) => {
    if (!g.target_value || g.target_value === 0) return 0;
    return Math.min(100, Math.round((g.current_value / g.target_value) * 100));
  };

  return (
    <div>
      <div className="page-header">
        <h1>Sleep Goals</h1>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-primary" style={{ width: 'auto' }} onClick={() => { setEditing(null); setForm({ title: '', description: '', target_date: '', goal_type: '', target_value: '', current_value: 0, status: 'active' }); setShowForm(true); }}>+ New Goal</button>
          <span className="back-btn" onClick={() => navigate('/')}>Back</span>
        </div>
      </div>

      <div className="dashboard-grid">
        {items.map(item => (
          <div key={item.id} className="dashboard-card" onClick={() => setSelected(item)}>
            <h3>{item.title}</h3>
            <p style={{ marginBottom: '12px' }}>{item.description}</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#a5b4fc', marginBottom: '4px' }}>
              <span>{item.current_value} / {item.target_value}</span>
              <span>{getProgress(item)}%</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${getProgress(item)}%` }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', fontSize: '12px' }}>
              <span className="tag" style={{ background: 'rgba(99,102,241,0.2)', color: '#a5b4fc' }}>{item.goal_type}</span>
              <span style={{ color: item.status === 'active' ? '#22c55e' : '#94a3b8' }}>{item.status}</span>
            </div>
          </div>
        ))}
      </div>

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>{selected.title}</h2>
            {[{ label: 'Description', value: selected.description }, { label: 'Type', value: selected.goal_type }, { label: 'Target Date', value: selected.target_date?.split('T')[0] }, { label: 'Target', value: selected.target_value }, { label: 'Current', value: selected.current_value }, { label: 'Progress', value: `${getProgress(selected)}%` }, { label: 'Status', value: selected.status }].map((f, i) => (
              <div key={i} className="detail-row"><span className="detail-label">{f.label}</span><span className="detail-value">{f.value}</span></div>
            ))}
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => { setEditing(selected); setForm({ title: selected.title, description: selected.description || '', target_date: selected.target_date?.split('T')[0] || '', goal_type: selected.goal_type || '', target_value: selected.target_value, current_value: selected.current_value, status: selected.status }); setSelected(null); setShowForm(true); }}>Edit</button>
              <button className="btn btn-danger" onClick={() => handleDelete(selected.id)}>Delete</button>
              <button className="btn btn-secondary" onClick={() => setSelected(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content form-modal" onClick={e => e.stopPropagation()}>
            <h2>{editing ? 'Edit Goal' : 'New Goal'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group"><label>Title</label><input value={form.title} onChange={e => setForm({...form, title: e.target.value})} required /></div>
              <div className="form-group"><label>Description</label><textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></div>
              <div className="form-row">
                <div className="form-group"><label>Goal Type</label>
                  <select value={form.goal_type} onChange={e => setForm({...form, goal_type: e.target.value})}>
                    <option value="">Select</option>
                    {['duration','quality','schedule','lucid','consistency','habit','recall','environment'].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-group"><label>Target Date</label><input type="date" value={form.target_date} onChange={e => setForm({...form, target_date: e.target.value})} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Target Value</label><input type="number" step="0.1" value={form.target_value} onChange={e => setForm({...form, target_value: e.target.value})} required /></div>
                <div className="form-group"><label>Current Value</label><input type="number" step="0.1" value={form.current_value} onChange={e => setForm({...form, current_value: e.target.value})} /></div>
              </div>
              <div className="form-group"><label>Status</label>
                <select value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                  {['active','completed','paused'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
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
