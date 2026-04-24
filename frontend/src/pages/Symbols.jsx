import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API, apiHeaders } from '../App';
import AIOutput from '../components/AIOutput';

export default function Symbols() {
  const navigate = useNavigate();
  const [symbols, setSymbols] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [aiResult, setAiResult] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [form, setForm] = useState({ name: '', meaning: '', category: '' });

  const load = () => fetch(`${API}/symbols`, { headers: apiHeaders() }).then(r => r.json()).then(setSymbols).catch(() => {});
  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const url = editing ? `${API}/symbols/${editing.id}` : `${API}/symbols`;
    await fetch(url, { method: editing ? 'PUT' : 'POST', headers: apiHeaders(), body: JSON.stringify(form) });
    setShowForm(false); setEditing(null); setForm({ name: '', meaning: '', category: '' }); load();
  };

  const handleDelete = async (id) => {
    await fetch(`${API}/symbols/${id}`, { method: 'DELETE', headers: apiHeaders() });
    setSelected(null); load();
  };

  const interpretSymbol = async (symbol) => {
    setAiLoading(true); setAiResult('');
    try {
      const res = await fetch(`${API}/ai/interpret-symbol`, { method: 'POST', headers: apiHeaders(), body: JSON.stringify({ symbol: symbol.name, context: symbol.meaning }) });
      const data = await res.json();
      setAiResult(data.analysis);
    } catch { setAiResult('Error interpreting symbol.'); }
    setAiLoading(false);
  };

  return (
    <div>
      <div className="page-header">
        <h1>Dream Symbols Dictionary</h1>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-primary" style={{ width: 'auto' }} onClick={() => { setEditing(null); setForm({ name: '', meaning: '', category: '' }); setShowForm(true); }}>+ New Symbol</button>
          <span className="back-btn" onClick={() => navigate('/')}>Back</span>
        </div>
      </div>

      <div className="data-table-wrapper">
        <table className="data-table">
          <thead><tr><th>Symbol</th><th>Category</th><th>Meaning</th></tr></thead>
          <tbody>
            {symbols.map(s => (
              <tr key={s.id} onClick={() => { setSelected(s); setAiResult(''); }}>
                <td style={{ fontWeight: 600 }}>{s.name}</td>
                <td><span className="tag" style={{ background: 'rgba(139,92,246,0.2)', color: '#c4b5fd' }}>{s.category}</span></td>
                <td style={{ maxWidth: '400px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.meaning}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="modal-overlay" onClick={() => { setSelected(null); setAiResult(''); }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px' }}>
            <h2>{selected.name}</h2>
            <div className="detail-row"><span className="detail-label">Category</span><span className="detail-value">{selected.category}</span></div>
            <div className="detail-row"><span className="detail-label">Meaning</span><span className="detail-value">{selected.meaning}</span></div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
              <button className="btn btn-ai" onClick={() => interpretSymbol(selected)}>AI Interpretation</button>
              <button className="btn btn-secondary" onClick={() => { setEditing(selected); setForm({ name: selected.name, meaning: selected.meaning, category: selected.category }); setSelected(null); setShowForm(true); }}>Edit</button>
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
            <h2>{editing ? 'Edit Symbol' : 'New Symbol'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group"><label>Name</label><input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required /></div>
              <div className="form-group"><label>Category</label>
                <select value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                  <option value="">Select</option>
                  {['Elements','Actions','Body','Animals','Structures','Objects','Nature','Celestial'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group"><label>Meaning</label><textarea value={form.meaning} onChange={e => setForm({...form, meaning: e.target.value})} required /></div>
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
