import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API, apiHeaders } from '../App';

export default function RecurringDreams() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: '', description: '', frequency: '', first_occurrence: '', last_occurrence: '', occurrence_count: 1, common_elements: '', emotional_tone: '' });

  const load = () => fetch(`${API}/recurring-dreams`, { headers: apiHeaders() }).then(r => r.json()).then(setEntries).catch(() => {});
  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const url = editing ? `${API}/recurring-dreams/${editing.id}` : `${API}/recurring-dreams`;
    await fetch(url, { method: editing ? 'PUT' : 'POST', headers: apiHeaders(), body: JSON.stringify({ ...form, occurrence_count: parseInt(form.occurrence_count) }) });
    setShowForm(false); setEditing(null); setForm({ title: '', description: '', frequency: '', first_occurrence: '', last_occurrence: '', occurrence_count: 1, common_elements: '', emotional_tone: '' }); load();
  };

  const handleDelete = async (id) => {
    await fetch(`${API}/recurring-dreams/${id}`, { method: 'DELETE', headers: apiHeaders() });
    setSelected(null); load();
  };

  return (
    <div>
      <div className="page-header">
        <h1>Recurring Dreams</h1>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-primary" style={{ width: 'auto' }} onClick={() => { setEditing(null); setForm({ title: '', description: '', frequency: '', first_occurrence: '', last_occurrence: new Date().toISOString().split('T')[0], occurrence_count: 1, common_elements: '', emotional_tone: '' }); setShowForm(true); }}>+ New Entry</button>
          <span className="back-btn" onClick={() => navigate('/')}>Back</span>
        </div>
      </div>

      <div className="data-table-wrapper">
        <table className="data-table">
          <thead><tr><th>Title</th><th>Frequency</th><th>Count</th><th>Last</th><th>Tone</th></tr></thead>
          <tbody>
            {entries.map(e => (
              <tr key={e.id} onClick={() => setSelected(e)}>
                <td style={{ fontWeight: 600 }}>{e.title}</td>
                <td><span className="tag" style={{ background: 'rgba(20,184,166,0.2)', color: '#5eead4' }}>{e.frequency}</span></td>
                <td>{e.occurrence_count}x</td>
                <td>{e.last_occurrence?.split('T')[0]}</td>
                <td>{e.emotional_tone}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>{selected.title}</h2>
            {[{ label: 'Description', value: selected.description }, { label: 'Frequency', value: selected.frequency }, { label: 'First', value: selected.first_occurrence?.split('T')[0] }, { label: 'Last', value: selected.last_occurrence?.split('T')[0] }, { label: 'Count', value: `${selected.occurrence_count} times` }, { label: 'Elements', value: selected.common_elements }, { label: 'Tone', value: selected.emotional_tone }].map((f, i) => (
              <div key={i} className="detail-row"><span className="detail-label">{f.label}</span><span className="detail-value">{f.value}</span></div>
            ))}
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => { setEditing(selected); setForm({ title: selected.title, description: selected.description, frequency: selected.frequency, first_occurrence: selected.first_occurrence?.split('T')[0] || '', last_occurrence: selected.last_occurrence?.split('T')[0] || '', occurrence_count: selected.occurrence_count, common_elements: selected.common_elements || '', emotional_tone: selected.emotional_tone || '' }); setSelected(null); setShowForm(true); }}>Edit</button>
              <button className="btn btn-danger" onClick={() => handleDelete(selected.id)}>Delete</button>
              <button className="btn btn-secondary" onClick={() => setSelected(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content form-modal" onClick={e => e.stopPropagation()}>
            <h2>{editing ? 'Edit Recurring Dream' : 'New Recurring Dream'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group"><label>Title</label><input value={form.title} onChange={e => setForm({...form, title: e.target.value})} required /></div>
              <div className="form-group"><label>Description</label><textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} required /></div>
              <div className="form-row">
                <div className="form-group"><label>Frequency</label>
                  <select value={form.frequency} onChange={e => setForm({...form, frequency: e.target.value})}>
                    <option value="">Select</option>
                    {['Daily','Weekly','Bi-weekly','Monthly','Quarterly','Yearly'].map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div className="form-group"><label>Count</label><input type="number" min="1" value={form.occurrence_count} onChange={e => setForm({...form, occurrence_count: e.target.value})} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>First Occurrence</label><input type="date" value={form.first_occurrence} onChange={e => setForm({...form, first_occurrence: e.target.value})} /></div>
                <div className="form-group"><label>Last Occurrence</label><input type="date" value={form.last_occurrence} onChange={e => setForm({...form, last_occurrence: e.target.value})} /></div>
              </div>
              <div className="form-group"><label>Common Elements</label><input value={form.common_elements} onChange={e => setForm({...form, common_elements: e.target.value})} /></div>
              <div className="form-group"><label>Emotional Tone</label>
                <select value={form.emotional_tone} onChange={e => setForm({...form, emotional_tone: e.target.value})}>
                  <option value="">Select</option>
                  {['Anxious','Frustrated','Determined','Nostalgic','Frightened','Peaceful','Lonely','Awestruck','Confused','Panicked','Confident','Claustrophobic'].map(t => <option key={t} value={t}>{t}</option>)}
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
