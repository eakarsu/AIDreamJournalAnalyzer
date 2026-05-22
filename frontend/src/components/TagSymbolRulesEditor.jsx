import React, { useEffect, useState } from 'react';
import { API, apiHeaders } from '../App';

const empty = { pattern: '', tag: '', symbol: '', priority: 5, note: '' };

export default function TagSymbolRulesEditor() {
  const [rules, setRules] = useState([]);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState(null);
  const [msg, setMsg] = useState('');

  const load = async () => {
    try {
      const res = await fetch(`${API}/custom-views/rules`, { headers: apiHeaders() });
      const data = await res.json();
      setRules(data.rules || []);
    } catch (e) {
      setMsg(`Error loading: ${e.message}`);
    }
  };

  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    setMsg('');
    try {
      const url = editingId ? `${API}/custom-views/rules/${editingId}` : `${API}/custom-views/rules`;
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: apiHeaders(), body: JSON.stringify(form) });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || `HTTP ${res.status}`);
      }
      setForm(empty);
      setEditingId(null);
      await load();
      setMsg(editingId ? 'Rule updated.' : 'Rule created.');
    } catch (e) {
      setMsg(`Error: ${e.message}`);
    }
  };

  const edit = (r) => {
    setEditingId(r.id);
    setForm({ pattern: r.pattern, tag: r.tag, symbol: r.symbol || '', priority: r.priority, note: r.note || '' });
  };

  const remove = async (id) => {
    if (!confirm('Delete this rule?')) return;
    try {
      const res = await fetch(`${API}/custom-views/rules/${id}`, { method: 'DELETE', headers: apiHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await load();
      setMsg('Rule deleted.');
    } catch (e) {
      setMsg(`Error: ${e.message}`);
    }
  };

  const inputStyle = {
    padding: '8px 12px',
    background: 'rgba(15,12,41,0.6)',
    border: '1px solid rgba(99,102,241,0.3)',
    borderRadius: 8,
    color: '#e2e8f0',
    fontSize: 13,
  };

  return (
    <div style={{ background: 'rgba(30,27,75,0.6)', padding: 20, borderRadius: 16, border: '1px solid rgba(99,102,241,0.3)' }}>
      <h3 style={{ marginBottom: 8, color: '#c4b5fd' }}>Tag / Symbol Rules Editor</h3>
      <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 12 }}>
        Define regex patterns that auto-assign tags &amp; symbols when generating the interpretation report.
      </p>

      <form onSubmit={submit} style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr) auto', gap: 8, marginBottom: 16 }}>
        <input style={inputStyle} placeholder="pattern (regex)" value={form.pattern} onChange={e => setForm({ ...form, pattern: e.target.value })} required />
        <input style={inputStyle} placeholder="tag" value={form.tag} onChange={e => setForm({ ...form, tag: e.target.value })} required />
        <input style={inputStyle} placeholder="symbol" value={form.symbol} onChange={e => setForm({ ...form, symbol: e.target.value })} />
        <input style={inputStyle} type="number" placeholder="priority" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} />
        <input style={inputStyle} placeholder="note" value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} />
        <button
          type="submit"
          style={{
            background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '8px 14px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {editingId ? 'Update' : 'Add'}
        </button>
      </form>
      {editingId && (
        <button
          onClick={() => { setEditingId(null); setForm(empty); }}
          style={{ marginBottom: 12, background: 'transparent', color: '#a5b4fc', border: '1px solid #6366f1', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}
        >
          Cancel edit
        </button>
      )}
      {msg && <p style={{ color: msg.startsWith('Error') ? '#f87171' : '#86efac', marginBottom: 12 }}>{msg}</p>}

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ color: '#a5b4fc', textAlign: 'left' }}>
            <th style={{ padding: 8 }}>Pattern</th>
            <th style={{ padding: 8 }}>Tag</th>
            <th style={{ padding: 8 }}>Symbol</th>
            <th style={{ padding: 8 }}>Priority</th>
            <th style={{ padding: 8 }}>Note</th>
            <th style={{ padding: 8 }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rules.map(r => (
            <tr key={r.id} style={{ borderTop: '1px solid rgba(99,102,241,0.15)' }}>
              <td style={{ padding: 8, fontFamily: 'monospace' }}>{r.pattern}</td>
              <td style={{ padding: 8 }}>{r.tag}</td>
              <td style={{ padding: 8 }}>{r.symbol}</td>
              <td style={{ padding: 8 }}>{r.priority}</td>
              <td style={{ padding: 8, color: '#94a3b8' }}>{r.note}</td>
              <td style={{ padding: 8 }}>
                <button onClick={() => edit(r)} style={{ marginRight: 8, background: '#6366f1', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>Edit</button>
                <button onClick={() => remove(r.id)} style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>Delete</button>
              </td>
            </tr>
          ))}
          {rules.length === 0 && (
            <tr><td colSpan={6} style={{ padding: 16, color: '#94a3b8', textAlign: 'center' }}>No rules defined yet.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
