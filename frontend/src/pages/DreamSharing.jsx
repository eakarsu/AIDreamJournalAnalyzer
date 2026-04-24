import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API, apiHeaders } from '../App';
import AIOutput from '../components/AIOutput';

export default function DreamSharing() {
  const navigate = useNavigate();
  const [dreams, setDreams] = useState([]);
  const [selectedDreams, setSelectedDreams] = useState([]);
  const [exportFormat, setExportFormat] = useState('text');
  const [exported, setExported] = useState('');
  const [aiResult, setAiResult] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    fetch(`${API}/dreams`, { headers: apiHeaders() }).then(r => r.json()).then(setDreams).catch(() => {});
  }, []);

  const toggleDream = (id) => {
    setSelectedDreams(prev => prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]);
  };

  const exportDreams = () => {
    const selected = dreams.filter(d => selectedDreams.includes(d.id));
    if (selected.length === 0) return;

    if (exportFormat === 'text') {
      const text = selected.map(d =>
        `${'='.repeat(50)}\n${d.title}\nDate: ${d.dream_date?.split('T')[0]} | Mood: ${d.mood} | Quality: ${d.sleep_quality}/10\nCategory: ${d.category} | Lucid: ${d.is_lucid ? 'Yes' : 'No'}\nTags: ${(d.tags || []).join(', ')}\n${'─'.repeat(50)}\n${d.content}\n`
      ).join('\n');
      setExported(text);
    } else {
      const jsonData = selected.map(d => ({
        title: d.title, date: d.dream_date?.split('T')[0], mood: d.mood,
        sleep_quality: d.sleep_quality, category: d.category, is_lucid: d.is_lucid,
        tags: d.tags, content: d.content
      }));
      setExported(JSON.stringify(jsonData, null, 2));
    }
  };

  const downloadExport = () => {
    const blob = new Blob([exported], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dream-journal-export.${exportFormat === 'text' ? 'txt' : 'json'}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getSummary = async () => {
    setAiLoading(true); setAiResult('');
    try {
      const res = await fetch(`${API}/ai/journal-summary`, { method: 'POST', headers: apiHeaders(), body: JSON.stringify({ period: 'month' }) });
      const data = await res.json();
      setAiResult(data.analysis);
    } catch { setAiResult('Error generating summary.'); }
    setAiLoading(false);
  };

  return (
    <div>
      <div className="page-header">
        <h1>Dream Sharing & Export</h1>
        <span className="back-btn" onClick={() => navigate('/')}>Back</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        <div className="chart-container">
          <h3>Select Dreams to Export</h3>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setSelectedDreams(dreams.map(d => d.id))}>Select All</button>
            <button className="btn btn-secondary btn-sm" onClick={() => setSelectedDreams([])}>Clear</button>
          </div>
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {dreams.map(d => (
              <div key={d.id} onClick={() => toggleDream(d.id)} style={{
                padding: '12px 16px', marginBottom: '8px', borderRadius: '8px', cursor: 'pointer',
                background: selectedDreams.includes(d.id) ? 'rgba(99,102,241,0.15)' : 'rgba(15,12,41,0.4)',
                border: `1px solid ${selectedDreams.includes(d.id) ? 'rgba(99,102,241,0.4)' : 'rgba(99,102,241,0.1)'}`,
                transition: 'all 0.2s'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600 }}>{d.title}</span>
                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>{d.dream_date?.split('T')[0]}</span>
                </div>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>{d.mood} | {d.category}</div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="chart-container">
            <h3>Export Options</h3>
            <div className="form-group">
              <label>Format</label>
              <select value={exportFormat} onChange={e => setExportFormat(e.target.value)}>
                <option value="text">Plain Text</option>
                <option value="json">JSON</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn btn-primary" style={{ width: 'auto' }} onClick={exportDreams} disabled={selectedDreams.length === 0}>
                Export ({selectedDreams.length} dreams)
              </button>
              <button className="btn btn-ai" onClick={getSummary}>AI Summary</button>
            </div>
          </div>

          {exported && (
            <div className="chart-container" style={{ marginTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3>Export Preview</h3>
                <button className="btn btn-success btn-sm" onClick={downloadExport}>Download</button>
              </div>
              <pre style={{ background: 'rgba(15,12,41,0.6)', padding: '16px', borderRadius: '8px', fontSize: '12px', maxHeight: '300px', overflowY: 'auto', whiteSpace: 'pre-wrap', color: '#cbd5e1' }}>
                {exported}
              </pre>
            </div>
          )}
        </div>
      </div>

      <AIOutput text={aiResult} loading={aiLoading} />
    </div>
  );
}
