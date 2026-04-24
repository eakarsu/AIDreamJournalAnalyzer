import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API, apiHeaders } from '../App';

export default function Categories() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', color: '#6366f1' });

  const load = () => fetch(`${API}/categories`, { headers: apiHeaders() }).then(r => r.json()).then(setItems).catch(() => {});
  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const url = editing ? `${API}/categories/${editing.id}` : `${API}/categories`;
    await fetch(url, { method: editing ? 'PUT' : 'POST', headers: apiHeaders(), body: JSON.stringify(form) });
    setShowForm(false); setEditing(null); setForm({ name: '', description: '', color: '#6366f1' }); load();
  };

  const handleDelete = async (id) => {
    await fetch(`${API}/categories/${id}`, { method: 'DELETE', headers: apiHeaders() });
    setSelected(null); load();
  };

  return (
    <div>
      <div className="page-header">
        <h1>Dream Categories</h1>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-primary" style={{ width: 'auto' }} onClick={() => { setEditing(null); setForm({ name: '', description: '', color: '#6366f1' }); setShowForm(true); }}>+ New Category</button>
          <span className="back-btn" onClick={() => navigate('/')}>Back</span>
        </div>
      </div>

      <div className="dashboard-grid">
        {items.map(item => (
          <div key={item.id} className="dashboard-card" style={{ '--card-accent': item.color }} onClick={() => setSelected(item)}>
            <div style={{ width: '24px', height: '24px', borderRadius: '8px', background: item.color, marginBottom: '12px' }} />
            <h3>{item.name}</h3>
            <p>{item.description}</p>
          </div>
        ))}
      </div>

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>{selected.name}</h2>
            <div className="detail-row"><span className="detail-label">Description</span><span className="detail-value">{selected.description}</span></div>
            <div className="detail-row"><span className="detail-label">Color</span><span className="detail-value"><span style={{ display: 'inline-block', width: '20px', height: '20px', borderRadius: '4px', background: selected.color, marginRight: '8px', verticalAlign: 'middle' }} />{selected.color}</span></div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => { setEditing(selected); setForm({ name: selected.name, description: selected.description || '', color: selected.color || '#6366f1' }); setSelected(null); setShowForm(true); }}>Edit</button>
              <button className="btn btn-danger" onClick={() => handleDelete(selected.id)}>Delete</button>
              <button className="btn btn-secondary" onClick={() => setSelected(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content form-modal" onClick={e => e.stopPropagation()}>
            <h2>{editing ? 'Edit Category' : 'New Category'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group"><label>Name</label><input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required /></div>
              <div className="form-group"><label>Description</label><textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></div>
              <div className="form-group"><label>Color</label><input type="color" value={form.color} onChange={e => setForm({...form, color: e.target.value})} style={{ height: '44px', cursor: 'pointer' }} /></div>
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
