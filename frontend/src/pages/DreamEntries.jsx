import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API, apiHeaders } from '../App';
import AIOutput from '../components/AIOutput';

export default function DreamEntries() {
  const navigate = useNavigate();
  const [dreams, setDreams] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [aiResult, setAiResult] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', dream_date: '', mood: '', sleep_quality: 5, is_lucid: false, category: '', tags: '' });

  const loadDreams = () => {
    fetch(`${API}/dreams`, { headers: apiHeaders() })
      .then(r => r.json()).then(setDreams).catch(() => {});
  };

  useEffect(() => { loadDreams(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const body = { ...form, tags: form.tags ? form.tags.split(',').map(t => t.trim()) : [], sleep_quality: parseInt(form.sleep_quality) };
    const url = editing ? `${API}/dreams/${editing.id}` : `${API}/dreams`;
    const method = editing ? 'PUT' : 'POST';
    await fetch(url, { method, headers: apiHeaders(), body: JSON.stringify(body) });
    setShowForm(false);
    setEditing(null);
    setForm({ title: '', content: '', dream_date: '', mood: '', sleep_quality: 5, is_lucid: false, category: '', tags: '' });
    loadDreams();
  };

  const handleDelete = async (id) => {
    await fetch(`${API}/dreams/${id}`, { method: 'DELETE', headers: apiHeaders() });
    setSelected(null);
    loadDreams();
  };

  const handleEdit = (dream) => {
    setEditing(dream);
    setForm({
      title: dream.title, content: dream.content, dream_date: dream.dream_date?.split('T')[0] || '',
      mood: dream.mood || '', sleep_quality: dream.sleep_quality || 5, is_lucid: dream.is_lucid || false,
      category: dream.category || '', tags: (dream.tags || []).join(', ')
    });
    setSelected(null);
    setShowForm(true);
  };

  const analyzeDream = async (dream) => {
    setAiLoading(true);
    setAiResult('');
    try {
      const res = await fetch(`${API}/ai/analyze-dream`, {
        method: 'POST', headers: apiHeaders(),
        body: JSON.stringify({ dreamContent: dream.content, title: dream.title })
      });
      const data = await res.json();
      setAiResult(data.analysis);
    } catch { setAiResult('Error analyzing dream.'); }
    setAiLoading(false);
  };

  return (
    <div>
      <div className="page-header">
        <h1>Dream Entries</h1>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-primary" style={{ width: 'auto' }} onClick={() => { setEditing(null); setForm({ title: '', content: '', dream_date: new Date().toISOString().split('T')[0], mood: '', sleep_quality: 5, is_lucid: false, category: '', tags: '' }); setShowForm(true); }}>
            + New Dream
          </button>
          <span className="back-btn" onClick={() => navigate('/')}>Back</span>
        </div>
      </div>

      <div className="data-table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Title</th>
              <th>Mood</th>
              <th>Quality</th>
              <th>Category</th>
              <th>Lucid</th>
            </tr>
          </thead>
          <tbody>
            {dreams.map(d => (
              <tr key={d.id} onClick={() => setSelected(d)}>
                <td>{d.dream_date?.split('T')[0]}</td>
                <td style={{ fontWeight: 600 }}>{d.title}</td>
                <td><span className="mood-badge" style={{ background: 'rgba(139,92,246,0.2)', color: '#c4b5fd' }}>{d.mood}</span></td>
                <td>{d.sleep_quality}/10</td>
                <td>{d.category}</td>
                <td>{d.is_lucid ? '✨ Yes' : 'No'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="modal-overlay" onClick={() => { setSelected(null); setAiResult(''); }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px' }}>
            <h2>{selected.title}</h2>
            {[
              { label: 'Date', value: selected.dream_date?.split('T')[0] },
              { label: 'Content', value: selected.content },
              { label: 'Mood', value: selected.mood },
              { label: 'Sleep Quality', value: `${selected.sleep_quality}/10` },
              { label: 'Category', value: selected.category },
              { label: 'Lucid Dream', value: selected.is_lucid ? 'Yes' : 'No' },
              { label: 'Tags', value: (selected.tags || []).join(', ') },
            ].map((f, i) => (
              <div key={i} className="detail-row">
                <span className="detail-label">{f.label}</span>
                <span className="detail-value">{f.value}</span>
              </div>
            ))}
            <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
              <button className="btn btn-ai" onClick={() => analyzeDream(selected)}>Analyze with AI</button>
              <button className="btn btn-secondary" onClick={() => handleEdit(selected)}>Edit</button>
              <button className="btn btn-danger" onClick={() => handleDelete(selected.id)}>Delete</button>
              <button className="btn btn-secondary" onClick={() => { setSelected(null); setAiResult(''); }}>Close</button>
            </div>
            <AIOutput text={aiResult} loading={aiLoading} />
          </div>
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content form-modal" onClick={e => e.stopPropagation()}>
            <h2>{editing ? 'Edit Dream' : 'New Dream Entry'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Title</label>
                <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Dream Content</label>
                <textarea value={form.content} onChange={e => setForm({...form, content: e.target.value})} required />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Date</label>
                  <input type="date" value={form.dream_date} onChange={e => setForm({...form, dream_date: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label>Mood</label>
                  <select value={form.mood} onChange={e => setForm({...form, mood: e.target.value})}>
                    <option value="">Select mood</option>
                    {['Joyful','Happy','Peaceful','Curious','Nostalgic','Anxious','Fearful','Stressed','Serene','Amused','Determined','Empowered','Reflective','Calm','Excited'].map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Sleep Quality (1-10)</label>
                  <input type="number" min="1" max="10" value={form.sleep_quality} onChange={e => setForm({...form, sleep_quality: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Category</label>
                  <select value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                    <option value="">Select category</option>
                    {['Adventure','Nightmare','Fantasy','Anxiety','Nature','Memory','Psychological','Cosmic','Challenge','Romantic','Prophetic','Healing','Creative','Spiritual','Recurring'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Tags (comma separated)</label>
                  <input value={form.tags} onChange={e => setForm({...form, tags: e.target.value})} placeholder="flying, water, nature" />
                </div>
                <div className="form-group" style={{ display: 'flex', alignItems: 'center', paddingTop: '20px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={form.is_lucid} onChange={e => setForm({...form, is_lucid: e.target.checked})} />
                    Lucid Dream
                  </label>
                </div>
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
