import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API, apiHeaders } from '../App';

export default function Insights() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: '', content: '', insight_type: '', significance: 'medium' });

  const load = () => fetch(`${API}/insights`, { headers: apiHeaders() }).then(r => r.json()).then(setItems).catch(() => {});
  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const url = editing ? `${API}/insights/${editing.id}` : `${API}/insights`;
    await fetch(url, { method: editing ? 'PUT' : 'POST', headers: apiHeaders(), body: JSON.stringify(form) });
    setShowForm(false); setEditing(null); setForm({ title: '', content: '', insight_type: '', significance: 'medium' }); load();
  };

  const handleDelete = async (id) => {
    await fetch(`${API}/insights/${id}`, { method: 'DELETE', headers: apiHeaders() });
    setSelected(null); load();
  };

  const sigColors = { high: '#22c55e', medium: '#eab308', low: '#94a3b8' };

  return (
    <div>
      <div className="page-header">
        <h1>Dream Insights</h1>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-primary" style={{ width: 'auto' }} onClick={() => { setEditing(null); setForm({ title: '', content: '', insight_type: '', significance: 'medium' }); setShowForm(true); }}>+ New Insight</button>
          <span className="back-btn" onClick={() => navigate('/')}>Back</span>
        </div>
      </div>

      <div className="data-table-wrapper">
        <table className="data-table">
          <thead><tr><th>Title</th><th>Type</th><th>Significance</th><th>Content</th></tr></thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id} onClick={() => setSelected(item)}>
                <td style={{ fontWeight: 600 }}>{item.title}</td>
                <td><span className="tag" style={{ background: 'rgba(99,102,241,0.2)', color: '#a5b4fc' }}>{item.insight_type}</span></td>
                <td><span style={{ color: sigColors[item.significance] || '#a5b4fc', fontWeight: 600 }}>{item.significance}</span></td>
                <td style={{ maxWidth: '350px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.content}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>{selected.title}</h2>
            {[{ label: 'Type', value: selected.insight_type }, { label: 'Significance', value: selected.significance }, { label: 'Content', value: selected.content }].map((f, i) => (
              <div key={i} className="detail-row"><span className="detail-label">{f.label}</span><span className="detail-value">{f.value}</span></div>
            ))}
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => { setEditing(selected); setForm({ title: selected.title, content: selected.content, insight_type: selected.insight_type || '', significance: selected.significance || 'medium' }); setSelected(null); setShowForm(true); }}>Edit</button>
              <button className="btn btn-danger" onClick={() => handleDelete(selected.id)}>Delete</button>
              <button className="btn btn-secondary" onClick={() => setSelected(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content form-modal" onClick={e => e.stopPropagation()}>
            <h2>{editing ? 'Edit Insight' : 'New Insight'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group"><label>Title</label><input value={form.title} onChange={e => setForm({...form, title: e.target.value})} required /></div>
              <div className="form-row">
                <div className="form-group"><label>Type</label>
                  <select value={form.insight_type} onChange={e => setForm({...form, insight_type: e.target.value})}>
                    <option value="">Select</option>
                    {['emotional','behavioral','progress','symbolic','trigger','correlation','creative','psychological','wellness','social'].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-group"><label>Significance</label>
                  <select value={form.significance} onChange={e => setForm({...form, significance: e.target.value})}>
                    {['high','medium','low'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group"><label>Content</label><textarea value={form.content} onChange={e => setForm({...form, content: e.target.value})} required /></div>
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
